// app/api/songs/suggest/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 클라이언트 제보 전송 (POST)
export async function POST(req: Request) {
  try {
    const { title, artist, band_name, youtube_url } = await req.json();

    if (!title || !artist) {
      return NextResponse.json({ success: false, message: '곡명과 아티스트명을 입력해 주세요.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('song_suggestions')
      .insert([
        {
          title: title.trim(),
          artist: artist.trim(),
          band_name: band_name || '익명 밴드',
          youtube_url: youtube_url?.trim() || null,
          status: 'PENDING',
        },
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '제보가 성공적으로 접수되었습니다.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// 관리자 대기 제보 목록 조회 (GET)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('song_suggestions')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, suggestions: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// 제보 반려 처리 (PATCH)
export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    const { error } = await supabase
      .from('song_suggestions')
      .update({ status: status || 'REJECTED' })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}