import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '2000', 10);
    const id = searchParams.get('id');

    let query = supabase
      .from('songs')
      .select(`
        *,
        target_artists:artist_id (
          name,
          vocal_gender,
          has_keys
        )
      `);

    if (id) {
      const { data, error } = await query.eq('id', id).maybeSingle();
      if (error) throw error;
      return NextResponse.json({ song: data });
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ songs: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    let ids: string[] = [];

    try {
      const body = await req.json();
      if (body.ids && Array.isArray(body.ids)) {
        ids = body.ids;
      } else if (body.id) {
        id = body.id;
      }
    } catch {
      // Body가 없는 쿼리스트링 요청 대응
    }

    if (id) {
      ids.push(id);
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '삭제할 곡의 ID가 전달되지 않았습니다.' },
        { status: 400 }
      );
    }

    const chunkSize = 50;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabase.from('songs').delete().in('id', chunk);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: `총 ${ids.length}곡이 성공적으로 삭제되었습니다.`,
      deletedCount: ids.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || '삭제 처리 중 오류 발생' },
      { status: 500 }
    );
  }
}