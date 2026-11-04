// app/api/artists/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// LLM을 통해 밴드의 공식 영문/글로벌 활동명을 자동 생성하는 헬퍼
async function generateArtistAliasWithLLM(artistName: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!geminiKey) return null;

  const prompt = `
당신은 한국 대중음악 전문가입니다.
한국 밴드/아티스트 "${artistName}"의 글로벌 음원 플랫폼(Apple Music, Spotify 등) 공식 영문 표기명을 1개만 알려주세요.

규칙:
1. 다른 부가 설명, 따옴표, 백틱 없이 순수 영문 이름만 딱 한 줄로 출력하세요.
2. 이미 영문 이름인 경우 그대로 출력하세요.
예시:
체리필터 -> Cherry Filter
국카스텐 -> Guckkasten
새소년 -> SE SO NEON
  `.trim();

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': geminiKey.trim(),
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (raw) {
      const cleaned = raw.replace(/[`"'\n\r]/g, '').trim();
      return cleaned || null;
    }
  } catch (err: any) {
    console.warn(`[Alias Generation Failed] ${artistName}:`, err.message);
  }

  return null;
}

// 1. 아티스트 목록 조회
export async function GET() {
  try {
    const { data: artists, error } = await supabase
      .from('target_artists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ artists });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. 아티스트 추가 (별칭 미입력 시 LLM 자동 생성)
export async function POST(req: Request) {
  try {
    const { name, search_alias } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '아티스트명이 필요합니다.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    let finalAlias = search_alias ? search_alias.trim() : null;

    // 별칭을 직접 입력하지 않은 경우 LLM으로 자동 추출
    if (!finalAlias) {
      finalAlias = await generateArtistAliasWithLLM(trimmedName);
      console.log(`[Auto Alias] "${trimmedName}" -> LLM 자동 생성 별칭: "${finalAlias}"`);
    }

    const { data, error } = await supabase
      .from('target_artists')
      .insert({
        name: trimmedName,
        search_alias: finalAlias,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, artist: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. 수집 상태 토글 (is_active)
export async function PATCH(req: Request) {
  try {
    const { id, is_active } = await req.json();

    const { error } = await supabase
      .from('target_artists')
      .update({ is_active })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. 아티스트 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '아티스트 ID가 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('target_artists')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}