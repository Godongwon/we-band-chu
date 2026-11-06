// app/api/band/evaluate/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 45;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const GEMINI_MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bandProfile, repertoire } = body;

    const bandName = bandProfile?.name || '우리 밴드';
    const vocalGender =
      bandProfile?.vocal_gender === 'FEMALE'
        ? '여성 보컬'
        : bandProfile?.vocal_gender === 'COED'
        ? '혼성 보컬'
        : '남성 보컬';
    const guitarCount = bandProfile?.guitar_count ?? 1;
    const hasKeys = bandProfile?.has_keys ? '건반(키보드) 있음' : '건반 없음 (기타 중심)';

    const repSongs = Array.isArray(repertoire) ? repertoire : [];
    const repSummary =
      repSongs.length > 0
        ? repSongs.map((s: any) => `${s.title} (${s.artist}) [${s.status || '후보'}]`).join(', ')
        : '현재 레퍼토리에 담긴 곡이 없음 (초기 세팅 상태)';

    let evaluation = '';

    if (process.env.GEMINI_API_KEY) {
      const prompt = `당신은 대한민국 대표 밴드 합주 컨설턴트이자 음악 디렉터입니다.
아래 밴드의 구성 및 현재 레퍼토리를 바탕으로 전문적이고 따뜻하며 실전적인 **'AI의 밴드평가'**를 작성해 주세요.

[밴드 기본 정보]
- 밴드명: "${bandName}"
- 구성: ${vocalGender}, ${guitarCount}기타, ${hasKeys}
- 현재 레퍼토리(${repSongs.length}곡): ${repSummary}

[작성 가이드라인]
1. 밴드의 악기/보컬 구성과 현재 레퍼토리를 분석하여 **이 밴드의 음악적 사운드 특성과 합주 시 강점**을 짚어주세요.
2. 현재 레퍼토리 성향을 바탕으로 **이 밴드가 추구하면 가장 빛날 노래 방향성과 추천 장르/아티스트(예: 모던록, 시티팝, J-Rock, 팝펑크 등)**를 구체적인 팁과 함께 제안해 주세요.
3. 건반 유무, 기타 대수, 보컬 음역대 특성을 살려 합주 완성도를 높일 수 있는 실전 꿀팁을 곁들여 주세요.
4. 문체는 정중하고 트렌디하며 열정적인 어조(한국어, 존댓말)로 3~5문장 내외로 명확하고 읽기 쉽게 작성해 주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "evaluation": "AI의 밴드평가 내용..."
}`;

      for (const modelName of GEMINI_MODEL_CANDIDATES) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' },
          });

          const result = await model.generateContent(prompt);
          const parsed = JSON.parse(result.response.text());
          if (parsed.evaluation) {
            evaluation = String(parsed.evaluation).trim();
            break;
          }
        } catch (err: any) {
          console.warn(`[밴드 평가 LLM 모델(${modelName}) 재시도]:`, err?.status || err?.message);
        }
      }
    }

    if (!evaluation) {
      // LLM 일시 불가 시 고품질 기본 평가
      evaluation = `${vocalGender}과 ${guitarCount}대의 기타, ${
        hasKeys
      } 구성을 갖춘 '${bandName}'은 감성적인 멜로디와 밴드 앙상블의 조화가 돋보이는 셋업입니다. ${
        repSongs.length > 0
          ? `현재 담긴 곡들을 볼 때 모던 록과 청량한 인디 록 장르에서 밴드 고유의 시너지를 극대화할 수 있습니다.`
          : `대중성과 밴드 사운드를 겸비한 모던 록 및 팝 록 레퍼토리부터 시작해보세요.`
      } 보컬의 매력적인 음역대와 기타 리프의 그루브를 살릴 수 있는 곡들을 적극 추천합니다.`;
    }

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (err: any) {
    console.error('[밴드 평가 API 오류]:', err);
    return NextResponse.json(
      { success: false, message: err.message || '평가 생성 실패' },
      { status: 500 }
    );
  }
}

