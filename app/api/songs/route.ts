// app/api/songs/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 1. 곡 목록 조회 (필요 시 활용)
export async function GET(req: Request) {
  try {
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ songs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. 곡 단건 삭제 API
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '삭제할 곡의 ID가 필요합니다.' }, { status: 400 });
    }

    // Supabase songs 테이블에서 해당 ID 삭제
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Delete Song Error]:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '곡이 삭제되었습니다.' });
  } catch (err: any) {
    console.error('[Delete Song Route Error]:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}