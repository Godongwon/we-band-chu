// app/api/songs/harvest-status/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { HARVEST_INTERVAL_MS, getQuotaStatus } from '@/app/api/songs/sync/route';

// 💡 dynamic / revalidate export 제거 (Request 객체 사용으로 자동 Dynamic 전환)
export async function GET(req: Request) {
  try {
    // 1. 전체 수집된 곡 개수 확인
    const { count, error: countError } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // 2. 가장 최근에 수집된 곡 15개 조회 (최신순)
    const { data: latestSongs, error: listError } = await supabase
      .from('songs')
      .select('id, title, artist, genre, youtube_url, live_url, cover_url, created_at')
      .order('created_at', { ascending: false })
      .limit(15);

    if (listError) throw listError;

    const quotaInfo = getQuotaStatus();

    return NextResponse.json(
      {
        totalCount: count || 0,
        latestSongs: latestSongs || [],
        intervalMs: HARVEST_INTERVAL_MS,
        quota: quotaInfo,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}