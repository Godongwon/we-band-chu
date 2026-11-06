// app/api/artists/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { classifyArtistWithLLM } from '@/lib/artistClassifier';

export async function GET() {
  try {
    const { data: artists, error } = await supabase
      .from('target_artists')
      .select('*')
      .order('priority', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, artists: artists || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, priority = 1 } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '밴드 이름이 필요합니다.' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // 💡 LLM을 통해 search_alias 및 vocal_gender 자동 분석
    const classified = await classifyArtistWithLLM(trimmedName);

    const { data, error } = await supabase
      .from('target_artists')
      .insert([
        {
          name: trimmedName,
          search_alias: classified.search_alias,
          vocal_gender: classified.vocal_gender,
          priority: Number(priority) || 1,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `'${trimmedName}' 등록 완료 (검색별칭: ${classified.search_alias}, 보컬: ${classified.vocal_gender})`,
      artist: data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('target_artists').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: '삭제 완료' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, search_alias, vocal_gender, priority, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: '밴드 ID가 필요합니다.' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (search_alias !== undefined) updatePayload.search_alias = search_alias;
    if (vocal_gender !== undefined) updatePayload.vocal_gender = vocal_gender;
    if (priority !== undefined) updatePayload.priority = Number(priority);
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    const { data, error } = await supabase
      .from('target_artists')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: '밴드 정보가 업데이트되었습니다.',
      artist: data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}