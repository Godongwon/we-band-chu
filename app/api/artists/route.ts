// app/api/artists/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const maxDuration = 30;

// LLM을 통해 밴드의 영문 별칭, 보컬 성별, 건반 세션 유무 분석
async function inspectBandProfileWithLLM(bandName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      search_alias: bandName,
      vocal_gender: 'MALE',
      has_keys: false,
    };
  }

  const prompt = `
당신은 대한민국 및 글로벌 밴드/인디 음악 전문가입니다.
밴드/아티스트 이름 "${bandName}"에 대해 아래 정보를 정확하게 분석하여 순수 JSON 포맷으로만 응답해 주세요.

1. search_alias: Apple iTunes 또는 음원 사이트에서 검색이 가장 잘 되는 공식 영문명 (예: 잔나비 -> JANNABI, 자우림 -> Jaurim, 실리카겔 -> Silica Gel, 없으면 한글명 그대로)
2. vocal_gender: 메인 보컬의 성별 (FEMALE, MALE, MIXED 중 택1)
   - 예: 윤하, QWER, 체리필터, 터치드, 자우림, 새소년 -> FEMALE
   - 예: 데이식스, 쏜애플, 실리카겔, YB, 검정치마 -> MALE
   - 예: 악뮤(AKMU) -> MIXED
3. has_keys: 해당 밴드의 공식 세션 라인업에 건반(키보드/피아노/신디사이저) 멤버가 고정으로 있는지 여부 (true 또는 false)
   - 예: 데이식스(김원필), 페퍼톤스(신재평 건반/신스 라인), 잔나비 등 건반 중심 밴드 -> true
   - 예: 쏜애플, 실리카겔, 너드커넥션 등 순수 기타 중심 밴드 -> false

[응답 JSON 규격 - 백틱이나 마크다운 없이 순수 JSON만 반환]
{
  "search_alias": "영문명",
  "vocal_gender": "FEMALE" | "MALE" | "MIXED",
  "has_keys": true | false
}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return JSON.parse(rawText);
      }
    }
  } catch (err: any) {
    console.warn('[LLM 밴드 프로필 분석 실패, 기본값 사용]:', err.message);
  }

  return {
    search_alias: bandName,
    vocal_gender: 'MALE',
    has_keys: false,
  };
}

export async function GET() {
  try {
    // 💡 조건을 단순화하여 모든 등록 밴드를 안전하게 로드
    const { data: artists, error } = await supabase
      .from('target_artists')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[관리자] target_artists 조회 에러:', error.message);
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      artists: artists || [] 
    });
  } catch (error: any) {
    console.error('[관리자] target_artists GET 실패:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, priority } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '밴드명이 필요합니다.' }, { status: 400 });
    }

    const cleanName = name.trim();
    console.log(`[관리자] '${cleanName}' LLM 프로필 자동 조사 시작...`);

    // 💡 LLM이 search_alias, vocal_gender, has_keys 자동 판별
    const analyzed = await inspectBandProfileWithLLM(cleanName);
    console.log(`[관리자] '${cleanName}' LLM 분석 결과:`, analyzed);

    const { data, error } = await supabase
      .from('target_artists')
      .insert({
        name: cleanName,
        search_alias: analyzed.search_alias || cleanName,
        vocal_gender: analyzed.vocal_gender || 'MALE',
        has_keys: analyzed.has_keys ?? false,
        priority: Number(priority) || 1,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `'${cleanName}' 등록 및 LLM 스펙 분석 완료 (별칭: ${analyzed.search_alias}, 성별: ${analyzed.vocal_gender}, 건반: ${analyzed.has_keys ? 'O' : 'X'})`,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID가 누락되었습니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('target_artists')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: '삭제 완료' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}