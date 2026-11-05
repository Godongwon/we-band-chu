// app/api/band/update/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { name, vocal_gender, guitar_count, has_keys } = await req.json();

    if (!name) {
      return NextResponse.json({ success: false, message: '밴드 이름이 필요합니다.' }, { status: 400 });
    }

    // 1. 기존 밴드가 있는지 확인
    const { data: existingBand } = await supabase
      .from('bands')
      .select('id')
      .eq('name', name)
      .maybeSingle();

    let error = null;

    if (existingBand) {
      // 기존 밴드 정보 업데이트
      const res = await supabase
        .from('bands')
        .update({
          vocal_gender,
          guitar_count,
          has_keys,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBand.id);
      error = res.error;
    } else {
      // 밴드 정보가 없으면 신규 생성
      const res = await supabase
        .from('bands')
        .insert([
          {
            name,
            vocal_gender,
            guitar_count,
            has_keys,
            updated_at: new Date().toISOString(),
          },
        ]);
      error = res.error;
    }

    if (error) throw error;

    return NextResponse.json({ success: true, message: '밴드 구성이 DB에 정상 저장되었습니다.' });
  } catch (err: any) {
    console.error('[밴드 구성 DB 저장 오류]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}