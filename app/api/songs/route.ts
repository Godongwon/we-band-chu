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
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    // 쿼리 파라미터(?id=...) 또는 JSON Body에서 id 추출
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // body가 비어있는 경우 무시
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: '삭제할 곡의 ID가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Supabase DB에서 해당 곡 삭제
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, message: `DB 삭제 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '곡이 성공적으로 삭제되었습니다.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || '서버 삭제 처리 중 오류 발생' },
      { status: 500 }
    );
  }
}