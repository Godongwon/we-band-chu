// app/api/songs/localize-titles/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import {
  resolveKoreanTrackTitlesByTrackIds,
  formatLocalizedTrackTitle,
} from '@/lib/audioAnalyzer';

export const maxDuration = 60;

function hasKorean(str: string): boolean {
  return /[가-힣]/.test(str);
}

function normalizeTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s*\((inst|mr|instrumental|karaoke).*?\)/gi, '')
    .replace(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龯]/g, '')
    .trim();
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const offset = typeof body?.offset === 'number' ? Math.max(0, body.offset) : 0;
    const batchSize = typeof body?.batchSize === 'number' ? Math.min(12, Math.max(1, body.batchSize)) : 8;

    // 1. 전체 곡 및 아티스트 별칭 로드
    const [{ data: songs, error: songsErr }, { data: artists }] = await Promise.all([
      supabase.from('songs').select('id, title, artist, youtube_url'),
      supabase.from('target_artists').select('name, search_alias'),
    ]);

    if (songsErr) throw songsErr;

    const aliasMap = new Map<string, string>();
    for (const a of artists || []) {
      if (a.name && a.search_alias) {
        aliasMap.set(a.name.trim(), a.search_alias.trim());
      }
    }

    // 2. 아직 한글이 포함되지 않은 곡들을 아티스트별로 그룹화
    const targetSongs = (songs || []).filter((s) => s.title && !hasKorean(s.title));
    if (targetSongs.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        hasMore: false,
        nextOffset: 0,
        totalArtists: 0,
        message: '변환할 영문 단독 제목 곡이 없습니다.',
      });
    }

    const byArtist = new Map<string, typeof targetSongs>();
    for (const s of targetSongs) {
      const list = byArtist.get(s.artist) || [];
      list.push(s);
      byArtist.set(s.artist, list);
    }

    const allArtistEntries = Array.from(byArtist.entries());
    const totalArtists = allArtistEntries.length;
    const batchEntries = allArtistEntries.slice(offset, offset + batchSize);

    if (batchEntries.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        hasMore: false,
        nextOffset: totalArtists,
        totalArtists,
        message: '모든 밴드의 곡명 한글화 스캔이 완료되었습니다.',
      });
    }

    let updatedCount = 0;
    const updatedExamples: string[] = [];

    // 3. 배치 내 아티스트들을 병렬(최대 4개 동시)로 빠르게 조회 (Vercel 10초 제한 안전 보장)
    const CONCURRENCY = 4;
    let processedInBatch = 0;

    for (let i = 0; i < batchEntries.length; i += CONCURRENCY) {
      // 실행 시간이 7.5초를 넘기면 타임아웃 방지를 위해 즉시 중단하고 다음 배치로 넘김
      if (Date.now() - startTime > 7500 && processedInBatch > 0) {
        break;
      }

      const chunk = batchEntries.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async ([artistName, artistSongs]) => {
          processedInBatch++;
          const alias = aliasMap.get(artistName) || artistName;
          const searchTerms = Array.from(new Set([alias, artistName])).filter(Boolean);

          const usTrackMap = new Map<string, { trackId: number; trackName: string }>();

          await Promise.all(
            searchTerms.map(async (term) => {
              try {
                const searchRes = await fetch(
                  `https://itunes.apple.com/search?term=${encodeURIComponent(
                    term
                  )}&media=music&entity=song&limit=120&lang=ko_kr`,
                  { signal: AbortSignal.timeout(3500), cache: 'no-store' }
                );
                if (!searchRes.ok) return;
                const searchData = await searchRes.json();
                for (const item of searchData.results || []) {
                  if (item.trackId && item.trackName) {
                    usTrackMap.set(normalizeTitle(item.trackName), {
                      trackId: Number(item.trackId),
                      trackName: String(item.trackName).trim(),
                    });
                  }
                }
              } catch {
                // ignore timeout
              }
            })
          );

          const matchedTrackIds: number[] = [];
          for (const song of artistSongs) {
            const m = usTrackMap.get(normalizeTitle(song.title));
            if (m?.trackId) matchedTrackIds.push(m.trackId);
          }

          if (matchedTrackIds.length === 0) return;

          const krTitleMap = await resolveKoreanTrackTitlesByTrackIds(matchedTrackIds);

          const updatePromises = artistSongs.map(async (song) => {
            const m = usTrackMap.get(normalizeTitle(song.title));
            if (!m?.trackId) return;

            const krTitle = krTitleMap.get(m.trackId);
            if (!krTitle || !hasKorean(krTitle)) return;

            const formattedTitle = formatLocalizedTrackTitle(krTitle, song.title);
            if (formattedTitle !== song.title) {
              const newYoutubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                `${song.artist} ${formattedTitle}`
              )}`;

              const { error: updErr } = await supabase
                .from('songs')
                .update({
                  title: formattedTitle,
                  youtube_url: newYoutubeUrl,
                })
                .eq('id', song.id);

              if (!updErr) {
                updatedCount++;
                if (updatedExamples.length < 5) {
                  updatedExamples.push(`${song.title} → ${formattedTitle}`);
                }
              }
            }
          });

          await Promise.all(updatePromises);
        })
      );
    }

    const nextOffset = offset + Math.max(1, processedInBatch);
    const hasMore = nextOffset < totalArtists;
    const exampleStr =
      updatedExamples.length > 0 ? ` (${updatedExamples.join(', ')})` : '';

    return NextResponse.json({
      success: true,
      updatedCount,
      hasMore,
      nextOffset,
      totalArtists,
      examples: updatedExamples,
      message:
        updatedCount > 0
          ? `총 ${updatedCount}곡의 제목이 '한글명 (영문명)' 형태로 변환되었습니다!${exampleStr}`
          : '추가로 변환할 한글 공식 곡명 대상이 없습니다 (원래 영어 제목인 곡은 유지됨).',
    });
  } catch (err: any) {
    console.error('[한글 곡명 일괄 변환 오류]:', err);
    return NextResponse.json(
      { success: false, message: err.message || '곡명 변환 중 오류 발생' },
      { status: 500 }
    );
  }
}
