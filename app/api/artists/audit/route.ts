// app/api/artists/audit/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';
import { ArtistAuditIssueType } from '@/app/admin/harvest/types';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const GEMINI_MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

export async function POST() {
  try {
    const { data: artists, error } = await supabase
      .from('target_artists')
      .select('id, name, search_alias, vocal_gender, priority');

    if (error) throw error;
    if (!artists || artists.length === 0) {
      return NextResponse.json({ success: true, aiAuditMap: {}, flaggedCount: 0 });
    }

    const aiAuditMap: Record<string, { types: ArtistAuditIssueType[]; reasons: string[] }> = {};

    if (process.env.GEMINI_API_KEY) {
      const compactList = artists.map((a) => ({
        id: a.id,
        name: a.name,
        search_alias: a.search_alias || '',
      }));

      const prompt = `당신은 밴드 합주곡 추천 서비스 '우밴추(We.Band.Chu)'의 데이터 품질 감사관입니다.
아래는 현재 DB의 수집 대상 밴드(target_artists) 목록입니다:
${JSON.stringify(compactList)}

이 목록에서 **검토 또는 삭제가 필요한 문제 아티스트**만 골라내세요.
판단 기준:
1. "NON_BAND": 실제 록/인디/모던록/팝밴드(또는 밴드 사운드 기반 싱어송라이터: 윤하, 적재, 백예린, 한로로, 카더가든 등은 합주곡으로 매우 인기 있으므로 정상 유지!)가 아니라, **순수 힙합/래퍼(예: 타이거 JK, 허클베리 피, 크루셜스타), 순수 K-Pop 댄스 아이돌(예: 크래비티, RESCENE, 하이라이트, 아이들, 전소연), R&B 보컬그룹(예: 보이즈 투 맨, 위켄드, 아지아틱스), 테크노/일렉트로닉 댄스(예: 퍼퓸)** 등 밴드 합주와 무관한 아티스트인 경우.
2. "ALIAS_ERROR": 한글 이름("name")과 영문 검색 별칭("search_alias")이 **서로 전혀 다른 아티스트로 잘못 매칭**되었거나(예: 타이거 JK - Mondo Grosso, 모건 월든 - Måneskin, 수퍼내추럴 - Superorganism, 오디에스 - Audioslave, 로열 피그스 - Royal Pirates, 아리카 - AliA, 맥스 파인드 - Max Giesinger, 오가와 코이치 - Coil 등), 실제 존재하지 않는 환각(Hallucination) 밴드명인 경우.

정상적인 밴드(DAY6, QWER, 잔나비, 실리카겔, 너드커넥션, 유다빈밴드, 나상현씨밴드, 오아시스, 그린 데이, BUMP OF CHICKEN, 킹누, YOASOBI, Yorushika, ZUTOMAYO 등)는 절대 포함하지 마세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "issues": [
    {
      "id": "아티스트 UUID",
      "type": "NON_BAND" | "ALIAS_ERROR",
      "reason": "구체적인 한국어 사유 (1문장)"
    }
  ]
}`;

      for (const modelName of GEMINI_MODEL_CANDIDATES) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' },
          });

          const result = await model.generateContent(prompt);
          const parsed = JSON.parse(result.response.text());
          const rawIssues: any[] = Array.isArray(parsed?.issues) ? parsed.issues : [];

          for (const item of rawIssues) {
            const artistId = String(item?.id || '').trim();
            const issueType = String(item?.type || '').trim() as ArtistAuditIssueType;
            const reason = String(item?.reason || '').trim();

            if (!artistId || !['NON_BAND', 'ALIAS_ERROR'].includes(issueType) || !reason) {
              continue;
            }

            if (!aiAuditMap[artistId]) {
              aiAuditMap[artistId] = { types: [], reasons: [] };
            }
            if (!aiAuditMap[artistId].types.includes(issueType)) {
              aiAuditMap[artistId].types.push(issueType);
            }
            if (!aiAuditMap[artistId].reasons.includes(reason)) {
              aiAuditMap[artistId].reasons.push(reason);
            }
          }
          break;
        } catch (err: any) {
          console.warn(`[AI 밴드 감사 모델(${modelName}) 재시도]:`, err?.status || err?.message);
        }
      }
    }

    const flaggedCount = Object.keys(aiAuditMap).length;
    return NextResponse.json({
      success: true,
      aiAuditMap,
      flaggedCount,
      message: `AI 밴드 적격성 정밀 검사 완료 (추가 감지된 검토 대상: ${flaggedCount}팀)`,
    });
  } catch (err: any) {
    console.error('[AI 밴드 감사 API 에러]:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'AI 밴드 검사 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

