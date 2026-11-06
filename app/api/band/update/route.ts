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

    // 2. 다른 밴드가 이미 해당 이름을 사용 중인지 중복 검사 (이름 변경 시도시)
    if (existingBand && existingBand.name !== name) {
      const { data: duplicateBand } = await supabase
        .from('bands')
        .select('id, name')
        .eq('name', name)
        .neq('id', existingBand.id)
        .maybeSingle();

      if (duplicateBand) {
        return NextResponse.json(
          {
            success: false,
            message: `'${name}'(은)는 이미 등록된 밴드명입니다. 기존 밴드로 접속하시려면 로그아웃 후 '${name}'(으)로 입장해 주세요.`,
          },
          { status: 409 }
        );
      }
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
    let errorMessage = err.message || '밴드 저장 중 오류가 발생했습니다.';
    if (err.code === '23505' || err.message?.includes('bands_name_unique')) {
      errorMessage = '이미 동일한 이름의 밴드가 존재합니다. 다른 밴드명을 사용하시거나 기존 밴드로 로그인해 주세요.';
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}