// app/api/artists/priority/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PATCH(req: Request) {
  try {
    const { id, priority } = await req.json();

    if (!id || priority === undefined) {
      return NextResponse.json({ success: false, message: 'ID와 priority 값이 필요합니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('target_artists')
      .update({ priority: Number(priority) })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '우선순위가 성공적으로 변경되었습니다.',
      artist: data,
    });
  } catch (err: any) {
    console.error('[우선순위 변경 에러]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}