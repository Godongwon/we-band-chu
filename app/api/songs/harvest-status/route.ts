// app/api/songs/harvest-status/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. songs 테이블 전체 데이터 집계 (안전 쿼리)
    const { data: songsData, error: songErr } = await supabase
      .from('songs')
      .select('id, bpm, original_key, artist');

    if (songErr) {
      console.error('[관리자] songs 집계 실패:', songErr.message);
      throw songErr;
    }

    const songs = songsData || [];
    const totalSongs = songs.length;
    const analyzedBpmCount = songs.filter((s) => s.bpm !== null && s.bpm !== undefined).length;
    const analyzedKeyCount = songs.filter((s) => s.original_key !== null && s.original_key !== undefined).length;

    // 2. target_artists 테이블 집계
    const { data: artistsData, error: artistErr } = await supabase
      .from('target_artists')
      .select('name, is_active, last_harvested_at');

    if (artistErr) {
      console.error('[관리자] target_artists 집계 실패:', artistErr.message);
      throw artistErr;
    }

    const artists = artistsData || [];
    const totalArtists = artists.length;
    const activeArtists = artists.filter((a) => a.is_active !== false).length;

    // 3. 가장 최근 수집된 밴드 추출 (마지막 갱신용)
    const harvestedArtists = artists
      .filter((a) => a.last_harvested_at)
      .sort((a, b) => new Date(b.last_harvested_at!).getTime() - new Date(a.last_harvested_at!).getTime());

    let lastExecution = null;
    if (harvestedArtists.length > 0) {
      const latest = harvestedArtists[0];
      const count = songs.filter((s) => s.artist === latest.name).length;
      lastExecution = {
        artist: latest.name,
        count: count,
        time: latest.last_harvested_at,
      };
    }

    return NextResponse.json({
      success: true,
      totalSongs,
      totalArtists,
      activeArtists,
      analyzedBpmCount,
      analyzedKeyCount,
      lastExecution,
    });
  } catch (error: any) {
    console.error('[관리자] harvest-status 에러 발생:', error.message);
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