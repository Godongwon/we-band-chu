// app/api/songs/sync/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { searchITunesTracksForArtist, analyzePreviewAudio } from '@/lib/audioAnalyzer';
import { normalizeGenre } from '@/lib/genreUtils';

export const maxDuration = 60;

export async function GET() {
  try {
    // 1. 수집 대상 아티스트 중 활성화된 1개 밴드 추출 (1순위 우선, 마지막 수집일 오래된 순)
    const { data: artists, error: artistErr } = await supabase
      .from('target_artists')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('last_harvested_at', { ascending: true, nullsFirst: true })
      .limit(1);

    if (artistErr) throw artistErr;
    if (!artists || artists.length === 0) {
      return NextResponse.json({ success: true, message: '수집 대상 아티스트가 없습니다.' });
    }

    const currentArtist = artists[0];
    const vocalGender = currentArtist.vocal_gender || 'FEMALE';

    // 2. iTunes API 다중 검색어(별칭 + 원어 + 글로벌/JP 스토어) 호출
    const validTracks = await searchITunesTracksForArtist(
      currentArtist.name,
      currentArtist.search_alias
    );

    // 3. 기존 곡 중복 검사
    const { data: existingSongs } = await supabase
      .from('songs')
      .select('title')
      .eq('artist', currentArtist.name);

    const existingTitleSet = new Set(
      (existingSongs || []).map((s) => s.title.toLowerCase().trim())
    );
    const newTracks = validTracks.filter(
      (t) => !existingTitleSet.has((t.trackName || '').toLowerCase().trim())
    );

    let insertedCount = 0;
    const batchToInsert = newTracks.slice(0, 15);

    if (batchToInsert.length > 0) {
      const insertRows = [];

      for (const t of batchToInsert) {
        // 수집 즉시 미리듣기 오디오에서 BPM & Key 실측 수행
        const analyzed = await analyzePreviewAudio(
          t.previewUrl,
          `${currentArtist.name}-${t.trackName}`
        );

        insertRows.push({
          title: t.trackName,
          artist: currentArtist.name,
          artist_id: currentArtist.id,
          genre: normalizeGenre(t.primaryGenreName),
          preview_url: t.previewUrl,
          youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
            `${currentArtist.name} ${t.trackName}`
          )}`,
          vocal_gender: vocalGender,
          bpm: analyzed.bpm,
          original_key: analyzed.key,
        });
      }

      const { error: insErr } = await supabase
        .from('songs')
        .upsert(insertRows, { onConflict: 'artist,title' });

      if (insErr) {
        // 복합 제약조건이 없거나 컬럼 차이가 있는 경우 개별 안전 삽입
        for (const row of insertRows) {
          const { error: singleErr } = await supabase.from('songs').insert([row]);
          if (!singleErr) insertedCount++;
        }
      } else {
        insertedCount = insertRows.length;
      }
    }

    // 4. 밴드 수집 상태 갱신 (신규 곡을 모두 수집했거나 더 이상 남은 트랙이 없으면 3순위 이동)
    const remainingTracksCount = Math.max(0, newTracks.length - batchToInsert.length);
    const totalArtistSongs = (existingSongs?.length || 0) + insertedCount;
    const nextPriority =
      remainingTracksCount === 0 && totalArtistSongs > 0 ? 3 : currentArtist.priority === 1 && insertedCount === 0 ? 2 : currentArtist.priority;

    await supabase
      .from('target_artists')
      .update({
        last_harvested_at: new Date().toISOString(),
        priority: nextPriority,
      })
      .eq('id', currentArtist.id);

    return NextResponse.json({
      success: true,
      lastExecution: {
        artist: currentArtist.name,
        count: insertedCount,
        vocal_gender: vocalGender,
        time: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
