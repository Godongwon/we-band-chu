// app/api/songs/report/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { song_id, title, artist, reason } = body;

    if (!title || !artist) {
      return NextResponse.json({ success: false, message: '곡 정보가 부족합니다.' }, { status: 400 });
    }

    // song_id가 없으면 제목과 아티스트로 검색
    let targetSongId = song_id;
    if (!targetSongId) {
      const { data: found } = await supabase
        .from('songs')
        .select('id')
        .eq('title', title)
        .eq('artist', artist)
        .maybeSingle();

      targetSongId = found?.id || null;
    }

    const { error } = await supabase.from('song_reports').insert({
      song_id: targetSongId,
      title,
      artist,
      reason: reason || '비밴드 곡 또는 잘못된 음원 정보',
      status: 'PENDING',
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: '신고가 성공적으로 접수되었습니다.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}