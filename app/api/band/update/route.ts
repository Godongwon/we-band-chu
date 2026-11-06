// app/api/band/update/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { id, name, access_code, vocal_gender, guitar_count, has_keys } = await req.json();

    if (!name) {
      return NextResponse.json({ success: false, message: '밴드 이름이 필요합니다.' }, { status: 400 });
    }

    // 1. 기존 밴드가 있는지 확인 (id 우선, 없으면 name으로 조회)
    let existingBand: any = null;
    if (id) {
      const { data } = await supabase.from('bands').select('*').eq('id', id).maybeSingle();
      existingBand = data;
    }
    if (!existingBand) {
      const { data } = await supabase.from('bands').select('*').eq('name', name).maybeSingle();
      existingBand = data;
    }

    let savedBand = null;
    let error = null;

    if (existingBand) {
      const updatePayload: any = {
        name,
        vocal_gender: vocal_gender ?? existingBand.vocal_gender,
        guitar_count: guitar_count ?? existingBand.guitar_count,
        has_keys: has_keys ?? existingBand.has_keys,
        updated_at: new Date().toISOString(),
      };
      if (access_code) {
        updatePayload.access_code = access_code;
      }

      const res = await supabase
        .from('bands')
        .update(updatePayload)
        .eq('id', existingBand.id)
        .select()
        .single();
      savedBand = res.data;
      error = res.error;
    } else {
      const insertPayload: any = {
        name,
        vocal_gender: vocal_gender || 'FEMALE',
        guitar_count: guitar_count ?? 1,
        has_keys: has_keys ?? true,
        updated_at: new Date().toISOString(),
      };
      if (access_code) {
        insertPayload.access_code = access_code;
      }

      const res = await supabase
        .from('bands')
        .insert([insertPayload])
        .select()
        .single();
      savedBand = res.data;
      error = res.error;
    }

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '밴드 구성이 DB에 정상 저장되었습니다.',
      band: savedBand,
    });
  } catch (err: any) {
    console.error('[밴드 구성 DB 저장 오류]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}