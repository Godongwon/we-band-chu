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

export async function POST() {
  try {
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
        message: '변환할 영문 단독 제목 곡이 없습니다.',
      });
    }

    const byArtist = new Map<string, typeof targetSongs>();
    for (const s of targetSongs) {
      const list = byArtist.get(s.artist) || [];
      list.push(s);
      byArtist.set(s.artist, list);
    }

    let updatedCount = 0;
    const updatedExamples: string[] = [];

    // 3. 아티스트 단위로 iTunes 글로벌 검색 -> trackId 추출 -> 한국(KR) lookup 일괄 매칭
    for (const [artistName, artistSongs] of byArtist.entries()) {
      const alias = aliasMap.get(artistName) || artistName;
      const searchTerms = Array.from(new Set([alias, artistName])).filter(Boolean);

      const usTrackMap = new Map<string, { trackId: number; trackName: string }>();

      for (const term of searchTerms) {
        try {
          const searchRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(
              term
            )}&media=music&entity=song&limit=100&lang=ko_kr`,
            { signal: AbortSignal.timeout(6000), cache: 'no-store' }
          );
          if (!searchRes.ok) continue;
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
          // ignore
        }
      }

      // 매칭되지 않은 개별 곡은 'artist + title'로 단건 검색 보완
      for (const song of artistSongs) {
        const key = normalizeTitle(song.title);
        if (!usTrackMap.has(key)) {
          try {
            const singleRes = await fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(
                `${alias} ${song.title}`
              )}&media=music&entity=song&limit=5&lang=ko_kr`,
              { signal: AbortSignal.timeout(4000), cache: 'no-store' }
            );
            if (singleRes.ok) {
              const singleData = await singleRes.json();
              const matched = (singleData.results || []).find(
                (r: any) => normalizeTitle(r.trackName || '') === key
              );
              if (matched?.trackId) {
                usTrackMap.set(key, {
                  trackId: Number(matched.trackId),
                  trackName: String(matched.trackName).trim(),
                });
              }
            }
          } catch {
            // ignore
          }
        }
      }

      const matchedTrackIds: number[] = [];
      for (const song of artistSongs) {
        const m = usTrackMap.get(normalizeTitle(song.title));
        if (m?.trackId) matchedTrackIds.push(m.trackId);
      }

      if (matchedTrackIds.length === 0) continue;

      const krTitleMap = await resolveKoreanTrackTitlesByTrackIds(matchedTrackIds);

      for (const song of artistSongs) {
        const m = usTrackMap.get(normalizeTitle(song.title));
        if (!m?.trackId) continue;

        const krTitle = krTitleMap.get(m.trackId);
        if (!krTitle || !hasKorean(krTitle)) continue;

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
      }
    }

    const exampleStr =
      updatedExamples.length > 0 ? ` (${updatedExamples.join(', ')})` : '';

    return NextResponse.json({
      success: true,
      updatedCount,
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

