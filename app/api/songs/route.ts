// app/api/songs/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

// ========================================================
// 1. 음원 목록 및 단건 조회 (외래키 조인 에러 없는 안전 쿼리)
// ========================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '2000', 10);
    const id = searchParams.get('id');
    const q = searchParams.get('q')?.trim();

    if (id) {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ song: data });
    }

    let queryBuilder = supabase
      .from('songs')
      .select('id, title, artist, genre, bpm, original_key, vocal_gender, youtube_url, created_at')
      .order('created_at', { ascending: false });

    if (q) {
      const safeQ = q.replace(/[,()]/g, ' ').trim();
      if (safeQ) {
        queryBuilder = queryBuilder.or(`title.ilike.%${safeQ}%,artist.ilike.%${safeQ}%`);
      }
    }

    const { data: songs, error } = await queryBuilder.limit(limit);

    if (error) {
      console.error('[API /api/songs GET Error]:', error.message);
      throw error;
    }

    return NextResponse.json({ songs: songs || [] });
  } catch (error: any) {
    console.error('[API /api/songs Server Error]:', error.message);
    return NextResponse.json({ error: error.message, songs: [] }, { status: 500 });
  }
}

// ========================================================
// 2. 음원 단건 및 다중 선택 삭제
// ========================================================
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