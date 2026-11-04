import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 총 수집 곡 수 카운트
    const { count: totalSongs, error: songErr } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true });

    if (songErr) throw songErr;

    // 2. 전체 수집 대상 아티스트 수
    const { count: totalArtists, error: artistErr } = await supabase
      .from('target_artists')
      .select('*', { count: 'exact', head: true });

    if (artistErr) throw artistErr;

    // 3. 활성 수집 대상 아티스트 수
    const { count: activeArtists } = await supabase
      .from('target_artists')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 4. BPM 실측 완료 곡 수
    const { count: analyzedBpmCount } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .not('bpm', 'is', null);

    // 5. Key(조성) 산출 완료 곡 수
    const { count: analyzedKeyCount } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .not('original_key', 'is', null);

    // 6. 가장 최근에 수집된 아티스트 정보 조회 (마지막 갱신 카드용)
    const { data: latestArtist } = await supabase
      .from('target_artists')
      .select('name, last_harvested_at')
      .not('last_harvested_at', 'is', null)
      .order('last_harvested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let lastExecution = null;
    if (latestArtist && latestArtist.last_harvested_at) {
      // 해당 아티스트의 수집 곡 수 카운트
      const { count: artistSongCount } = await supabase
        .from('songs')
        .select('*', { count: 'exact', head: true })
        .eq('artist', latestArtist.name);

      lastExecution = {
        artist: latestArtist.name,
        count: artistSongCount || 0,
        time: latestArtist.last_harvested_at,
      };
    }

    return NextResponse.json({
      success: true,
      totalSongs: totalSongs || 0,
      totalArtists: totalArtists || 0,
      activeArtists: activeArtists ?? totalArtists ?? 0,
      analyzedBpmCount: analyzedBpmCount || 0,
      analyzedKeyCount: analyzedKeyCount || 0,
      lastExecution,
    });
  } catch (error: any) {
    console.error('[관리자] harvest-status 에러:', error.message);
    return NextResponse.json(
      {
        success: false,
        totalSongs: 0,
        totalArtists: 0,
        activeArtists: 0,
        analyzedBpmCount: 0,
        analyzedKeyCount: 0,
        lastExecution: null,
        error: error.message,
      },
      { status: 500 }
    );
  }
}