// app/api/songs/sync/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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
    const searchTerm = currentArtist.search_alias || currentArtist.name;
    const vocalGender = currentArtist.vocal_gender || 'FEMALE';

    // 2. iTunes API 호출
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&country=KR&media=music&entity=song&limit=40`;
    const res = await fetch(itunesUrl);
    const itunesData = await res.json();
    const tracks = itunesData.results || [];

    // 3. 블랙리스트 키워드 필터링
    const BLACKLIST = ['inst', 'instrumental', 'mr', 'remix', 'ost', 'piano ver', 'acoustic ver'];
    const validTracks = tracks.filter((t: any) => {
      const titleLower = (t.trackName || '').toLowerCase();
      return !BLACKLIST.some((b) => titleLower.includes(b)) && !!t.previewUrl;
    });

    // 4. 기존 곡 중복 검사
    const { data: existingSongs } = await supabase
      .from('songs')
      .select('title')
      .eq('artist', currentArtist.name);

    const existingTitleSet = new Set((existingSongs || []).map((s) => s.title.toLowerCase().trim()));
    const newTracks = validTracks.filter((t: any) => !existingTitleSet.has((t.trackName || '').toLowerCase().trim()));

    let insertedCount = 0;
    if (newTracks.length > 0) {
      const insertRows = newTracks.slice(0, 20).map((t: any) => ({
        title: t.trackName,
        artist: currentArtist.name,
        genre: t.primaryGenreName || 'Rock',
        preview_url: t.previewUrl,
        youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${currentArtist.name} ${t.trackName}`)}`,
        vocal_gender: vocalGender, // 💡 아티스트의 보컬 성별 상속 저장
        bpm: null,
        original_key: null,
      }));

      const { error: insErr } = await supabase.from('songs').insert(insertRows);
      if (insErr) throw insErr;
      insertedCount = insertRows.length;
    }

    // 5. 밴드 수집 상태 갱신 (더 이상 새 곡이 없으면 3순위로 강등)
    const nextPriority = newTracks.length === 0 ? 3 : currentArtist.priority;
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