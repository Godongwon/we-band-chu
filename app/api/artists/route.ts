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
    const { name, priority = 1, search_alias, vocal_gender } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '밴드 이름이 필요합니다.' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // 전달된 search_alias / vocal_gender가 있으면 즉시 사용하고, 없으면 LLM으로 자동 분석
    const classified =
      search_alias && vocal_gender
        ? { search_alias: String(search_alias).trim(), vocal_gender }
        : await classifyArtistWithLLM(trimmedName);

    // 1. 이미 동일한 이름(name) 또는 영문 별칭(search_alias)으로 등록된 밴드가 있는지 사전 확인
    const { data: existingList } = await supabase
      .from('target_artists')
      .select('*')
      .or(`name.ilike.${trimmedName},search_alias.ilike.${classified.search_alias}`);

    const existingArtist = (existingList || []).find(
      (a) =>
        a.name?.trim().toLowerCase() === trimmedName.toLowerCase() ||
        (classified.search_alias &&
          a.search_alias?.trim().toLowerCase() === classified.search_alias.toLowerCase())
    );

    if (existingArtist) {
      const { data: updated, error: updErr } = await supabase
        .from('target_artists')
        .update({
          search_alias: classified.search_alias || existingArtist.search_alias,
          vocal_gender: classified.vocal_gender || existingArtist.vocal_gender,
          priority: Number(priority) || existingArtist.priority || 1,
          is_active: true,
        })
        .eq('id', existingArtist.id)
        .select()
        .single();

      if (updErr) throw updErr;

      return NextResponse.json({
        success: true,
        alreadyExisted: true,
        message: `'${existingArtist.name}' 밴드는 이미 등록되어 있어 우선순위 및 정보를 최신화했습니다.`,
        artist: updated,
      });
    }

    // 2. 신규 등록 (동시성 경합으로 인한 unique constraint 충돌 시에도 안전하게 upsert 처리)
    const { data, error } = await supabase
      .from('target_artists')
      .upsert(
        [
          {
            name: trimmedName,
            search_alias: classified.search_alias,
            vocal_gender: classified.vocal_gender,
            priority: Number(priority) || 1,
            is_active: true,
          },
        ],
        { onConflict: 'name' }
      )
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
    const singleId = searchParams.get('id');
    const deleteSongsParam = searchParams.get('deleteSongs');

    let ids: string[] = [];
    let deleteSongs = deleteSongsParam === 'true';

    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) {
        ids = body.ids.filter(Boolean);
      } else if (body?.id) {
        ids = [String(body.id)];
      }
      if (body?.deleteSongs !== undefined) {
        deleteSongs = Boolean(body.deleteSongs);
      }
    } catch {
      // 쿼리스트링 요청인 경우 무시
    }

    if (singleId && !ids.includes(singleId)) {
      ids.push(singleId);
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: '삭제할 밴드 ID가 필요합니다.' }, { status: 400 });
    }

    // 삭제 대상 밴드 이름 조회 (연관 수집곡 삭제용)
    const { data: targetRows } = await supabase
      .from('target_artists')
      .select('id, name, search_alias')
      .in('id', ids);

    const artistNames = Array.from(
      new Set(
        (targetRows || [])
          .flatMap((r) => [r.name?.trim(), r.search_alias?.trim()])
          .filter(Boolean) as string[]
      )
    );

    const chunkSize = 50;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabase.from('target_artists').delete().in('id', chunk);
      if (error) throw error;
    }

    let deletedSongsCount = 0;
    if (deleteSongs && artistNames.length > 0) {
      const { data: matchedSongs } = await supabase
        .from('songs')
        .select('id')
        .in('artist', artistNames);

      const songIds = (matchedSongs || []).map((s) => s.id);
      for (let i = 0; i < songIds.length; i += chunkSize) {
        const chunk = songIds.slice(i, i + chunkSize);
        await supabase.from('songs').delete().in('id', chunk);
      }
      deletedSongsCount = songIds.length;
    }

    return NextResponse.json({
      success: true,
      deletedArtistsCount: ids.length,
      deletedSongsCount,
      message:
        deleteSongs && deletedSongsCount > 0
          ? `수집 대상 밴드 ${ids.length}팀 및 연관 수집곡 ${deletedSongsCount}곡이 함께 삭제되었습니다.`
          : `수집 대상 밴드 ${ids.length}팀이 삭제되었습니다.`,
    });
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
