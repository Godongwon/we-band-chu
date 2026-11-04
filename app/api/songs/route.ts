// app/api/songs/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get('artist');
  const missingOnly = searchParams.get('missingOnly') === 'true';

  let query = supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 4999); // 💡 최대 5,000곡까지 잘림 없이 한 번에 조회

  if (artist && artist !== 'ALL') {
    query = query.eq('artist', artist);
  }

  if (missingOnly) {
    query = query.is('youtube_url', null);
  }

  const { data: songs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ songs: songs || [] });
}