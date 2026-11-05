// app/api/artists/refresh-llm/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { classifyArtistWithLLM } from '@/lib/artistClassifier';

export async function POST(req: Request) {
  try {
    const { id, name } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ success: false, message: '밴드 ID와 이름이 필요합니다.' }, { status: 400 });
    }

    // 1. LLM(Gemini) 호출하여 최적의 search_alias 및 vocal_gender 재추론
    const classified = await classifyArtistWithLLM(name);

    // 2. target_artists 테이블 업데이트
    const { data, error } = await supabase
      .from('target_artists')
      .update({
        search_alias: classified.search_alias,
        vocal_gender: classified.vocal_gender,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `'${name}' LLM 갱신 완료 (검색별칭: ${classified.search_alias}, 보컬: ${classified.vocal_gender})`,
      artist: data,
    });
  } catch (err: any) {
    console.error('[LLM 밴드 정보 갱신 에러]:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}