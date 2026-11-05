// lib/artistClassifier.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ArtistClassification {
  search_alias: string;
  vocal_gender: 'FEMALE' | 'MALE' | 'COED';
}

export async function classifyArtistWithLLM(artistName: string): Promise<ArtistClassification> {
  const fallback: ArtistClassification = {
    search_alias: artistName,
    vocal_gender: 'FEMALE',
  };

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `당신은 대한민국 및 글로벌 인디/록/밴드 음악 데이터베이스 전문가입니다.
밴드/아티스트 이름: "${artistName}"

이 아티스트에 대해 다음 2가지 정보를 JSON 객체로 분석하여 반환하세요:
1. "search_alias": Apple Music 및 iTunes 음원 검색창에 입력했을 때 해당 아티스트의 음원이 가장 정확하게 조회되는 공식 영문 표기 또는 표준 활동명 1개 (예: 잔나비 -> "JANNABI", 실리카겔 -> "Silica Gel", QWER -> "QWER", 데이식스 -> "DAY6", 페퍼톤스 -> "Peppertones").
2. "vocal_gender": 메인 보컬의 성별. ("FEMALE" [여성 보컬/프론트], "MALE" [남성 보컬], "COED" [혼성 또는 객원 보컬 적극 활용]).

반드시 아래 JSON 형식만 반환하세요:
{
  "search_alias": "string",
  "vocal_gender": "FEMALE" | "MALE" | "COED"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    return {
      search_alias: parsed.search_alias || artistName,
      vocal_gender: ['FEMALE', 'MALE', 'COED'].includes(parsed.vocal_gender) ? parsed.vocal_gender : 'FEMALE',
    };
  } catch (err) {
    console.error('[LLM 밴드 분류 오류 fallback 적용]:', err);
    return fallback;
  }
}