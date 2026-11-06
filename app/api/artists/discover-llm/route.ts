// app/api/artists/discover-llm/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const GEMINI_MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

export interface DiscoveredArtistCandidate {
  name: string;
  search_alias: string;
  vocal_gender: 'FEMALE' | 'MALE' | 'COED';
  genre: string;
  reason: string;
}

// LLM 일시 과부하(503) 시에도 즉시 동작하는 검증된 밴드 풀
const CURATED_BAND_POOL: DiscoveredArtistCandidate[] = [
  {
    name: '유다빈밴드',
    search_alias: 'Yudabinband',
    vocal_gender: 'FEMALE',
    genre: '인디 록 / 청춘 록',
    reason: '항해, 좋지 아니한가 등 대학 밴드 및 합주실에서 가장 인기 있는 청량한 여성 보컬 밴드',
  },
  {
    name: '엔플라잉',
    search_alias: 'N.Flying',
    vocal_gender: 'MALE',
    genre: '팝 록 / 얼터너티브 록',
    reason: '옥탑방, 네가 내 마음에 자리잡았다 등 대중성과 밴드 사운드를 모두 갖춘 대표 보이밴드',
  },
  {
    name: '설 (SURL)',
    search_alias: 'SURL',
    vocal_gender: 'MALE',
    genre: '인디 록 / 브릿 록',
    reason: 'Dry Flower, 눈 등 탄탄한 기타 리프와 세련된 그루브로 합주 만족도가 높은 밴드',
  },
  {
    name: '브로콜리너마저',
    search_alias: 'Broccoli, you too?',
    vocal_gender: 'COED',
    genre: '모던 록 / 인디 팝',
    reason: '졸업, 앵콜요청금지 등 남녀 보컬이 함께 부르기 좋은 한국 인디 명곡 다수 보유',
  },
  {
    name: '드래곤포니',
    search_alias: 'Dragon Pony',
    vocal_gender: 'MALE',
    genre: '모던 록 / 팝 록',
    reason: '안테나 소속 신예 밴드로 강렬한 밴드 사운드와 최신 합주 트렌드에 부합',
  },
  {
    name: '카더가든',
    search_alias: 'Car, the garden',
    vocal_gender: 'MALE',
    genre: '인디 록 / 소울 록',
    reason: '명동콜링, 기다린 만큼 더 등 감성적인 중저음 남성 보컬 밴드 합주곡으로 인기',
  },
  {
    name: '크라잉넛',
    search_alias: 'Crying Nut',
    vocal_gender: 'MALE',
    genre: '펑크 록',
    reason: '밤이 깊었네, 말달리자 등 초보부터 중급 밴드까지 공연장 분위기를 띄우기 최고의 밴드',
  },
  {
    name: '노브레인',
    search_alias: 'No Brain',
    vocal_gender: 'MALE',
    genre: '펑크 록 / 록앤롤',
    reason: '넌 내게 반했어, 비와 당신 등 누구나 아는 국민 밴드 합주 레퍼토리 보유',
  },
  {
    name: '러브홀릭',
    search_alias: 'Loveholic',
    vocal_gender: 'FEMALE',
    genre: '모던 록 / 팝 록',
    reason: 'Loveholic, 인형의 꿈 등 여성 보컬 모던 록의 정석 레퍼토리 보유',
  },
  {
    name: '로맨틱펀치',
    search_alias: 'Romantic Punch',
    vocal_gender: 'MALE',
    genre: '하드 록 / 팝 록',
    reason: '토요일 밤이 좋아 등 신나는 리듬과 에너지 넘치는 라이브 지향 밴드',
  },
  {
    name: '몽니',
    search_alias: 'Monni',
    vocal_gender: 'MALE',
    genre: '모던 록 / 얼터너티브',
    reason: '소나기, 그대와 함께 등 폭발적인 고음과 강렬한 밴드 사운드로 인기',
  },
  {
    name: '안녕바다',
    search_alias: 'Bye Bye Sea',
    vocal_gender: 'MALE',
    genre: '모던 록 / 신스 록',
    reason: '별빛이 내린다, 청혼 등 키보드와 기타가 어우러진 감성 밴드곡 다수 보유',
  },
  {
    name: 'Mrs. GREEN APPLE',
    search_alias: 'Mrs. GREEN APPLE',
    vocal_gender: 'MALE',
    genre: 'J-Rock / 팝 록',
    reason: 'Inferno, Ao to Natsu 등 최근 한국 합주실에서도 가장 많이 연주되는 J-Rock 대표 밴드',
  },
  {
    name: 'Official髭男dism',
    search_alias: 'Official Hige Dandism',
    vocal_gender: 'MALE',
    genre: 'J-Pop / 피아노 록',
    reason: 'Pretender, Mixed Nuts 등 건반이 포함된 실력파 밴드 합주곡으로 매우 인기',
  },
  {
    name: 'KANA-BOON',
    search_alias: 'KANA-BOON',
    vocal_gender: 'MALE',
    genre: 'J-Rock',
    reason: 'Silhouette 등 직선적인 투기타 리프와 질주감 있는 드럼으로 합주 인기 높은 일본 밴드',
  },
  {
    name: '結束バンド (결속밴드)',
    search_alias: 'Kessoku Band',
    vocal_gender: 'FEMALE',
    genre: 'J-Rock / 애니송 록',
    reason: '봇치 더 록! 프로젝트 밴드로 기타 히어로, 청춘 콤플렉스 등 여성 보컬 합주 인기 최상위',
  },
  {
    name: 'Oasis',
    search_alias: 'Oasis',
    vocal_gender: 'MALE',
    genre: '브릿팝 / 록',
    reason: "Don't Look Back in Anger, Wonderwall 등 전 세계 밴드 합주의 필수 고전",
  },
  {
    name: 'Green Day',
    search_alias: 'Green Day',
    vocal_gender: 'MALE',
    genre: '펑크 록 / 팝 펑크',
    reason: 'Basket Case, American Idiot 등 기타·베이스·드럼 합주 기본기와 쾌감을 주는 대표 밴드',
  },
  {
    name: 'Avril Lavigne',
    search_alias: 'Avril Lavigne',
    vocal_gender: 'FEMALE',
    genre: '팝 펑크 / 틴 록',
    reason: 'Sk8er Boi, Complicated 등 여성 보컬 록 밴드에서 가장 사랑받는 팝 펑크 레퍼토리',
  },
  {
    name: '노을 (밴드/인디) - 나상현씨밴드',
    search_alias: 'Band Nah',
    vocal_gender: 'MALE',
    genre: '인디 록 / 시티 팝 록',
    reason: '찬란 등 산뜻한 기타 사운드와 편안한 멜로디로 대학 동아리 합주에서 급부상 중인 밴드',
  },
];

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/[^a-z0-9가-힣ぁ-んァ-ヶ一-龯]/g, '')
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'DISCOVER').trim().toUpperCase();
    const autoAddCount = Math.max(1, Math.min(5, Number(body.count) || 2));
    const category = String(body.category || '전체 추천').trim();
    const customPrompt = String(body.customPrompt || '').trim();

    // 1. 현재 DB에 등록된 모든 밴드 조회 (중복 추천 원천 차단)
    const { data: existingArtists, error } = await supabase
      .from('target_artists')
      .select('name, search_alias');

    if (error) throw error;

    const existingNames = (existingArtists || []).map((a) => a.name);
    const existingSet = new Set<string>();
    for (const a of existingArtists || []) {
      if (a.name) existingSet.add(normalizeKey(a.name));
      if (a.search_alias) existingSet.add(normalizeKey(a.search_alias));
    }

    const filterNewCandidates = (list: DiscoveredArtistCandidate[]) => {
      const seen = new Set<string>();
      const filtered: DiscoveredArtistCandidate[] = [];
      for (const item of list) {
        const k1 = normalizeKey(item.name || '');
        const k2 = normalizeKey(item.search_alias || '');
        if (!k1 || existingSet.has(k1) || (k2 && existingSet.has(k2))) continue;
        if (seen.has(k1) || (k2 && seen.has(k2))) continue;
        seen.add(k1);
        if (k2) seen.add(k2);
        filtered.push({
          name: String(item.name).trim(),
          search_alias: String(item.search_alias || item.name).trim(),
          vocal_gender: ['FEMALE', 'MALE', 'COED'].includes(
            String(item.vocal_gender).toUpperCase()
          )
            ? (String(item.vocal_gender).toUpperCase() as 'FEMALE' | 'MALE' | 'COED')
            : 'MALE',
          genre: String(item.genre || 'Rock / Band').trim(),
          reason: String(item.reason || '합주 및 라이브 커버에 적합한 인기 밴드').trim(),
        });
      }
      return filtered;
    };

    let discoveredList: DiscoveredArtistCandidate[] = [];
    let usedModel = 'curated-fallback';

    if (process.env.GEMINI_API_KEY) {
      const prompt = `당신은 대한민국 및 글로벌 밴드 합주곡 추천 서비스 '우밴추(We.Band.Chu)'의 수석 음악 큐레이터입니다.
현재 DB에 이미 등록된 수집 대상 밴드 목록(절대 중복 추천 금지):
${JSON.stringify(existingNames)}

요청 카테고리/테마: "${category}"
${customPrompt ? `추가 검색 요청사항: "${customPrompt}"` : ''}

위 목록에 **절대 포함되지 않은 새로운 밴드/아티스트 6팀**을 추천해 주세요.
실제 합주실(보컬, 일렉기타, 베이스, 드럼, 키보드)에서 연주하기 좋은 곡들이 많고 iTunes/Apple Music에 정식 음원이 등록된 유명 또는 인기 인디/록/팝밴드여야 합니다.

각 밴드마다 다음 필드를 포함한 JSON 배열을 반환하세요:
1. "name": 한국에서 통용되는 밴드 이름 (한국 밴드는 한글명 우선, 해외/일본 밴드는 공식 영문명 또는 통용명. 예: "유다빈밴드", "엔플라잉", "설 (SURL)", "브로콜리너마저", "Mrs. GREEN APPLE", "Oasis")
2. "search_alias": Apple Music / iTunes 영문 스토어에서 검색했을 때 가장 정확히 조회되는 **공식 영문(English/Romanized) 아티스트명** (절대 한글이나 일본어를 넣지 말고 영문 알파벳/숫자로만 작성. 예: "Yudabinband", "N.Flying", "SURL", "Broccoli, you too?", "Mrs. GREEN APPLE", "Oasis")
3. "vocal_gender": 메인 보컬 성별 ("FEMALE" | "MALE" | "COED")
4. "genre": 세부 장르 (예: "인디 록 / 모던 록", "J-Rock", "팝 펑크")
5. "reason": 밴드 합주곡으로 추천하는 이유와 대표곡 1~2곡 소개 (한국어 1문장)

반드시 아래 JSON 형식으로만 응답하세요:
{
  "candidates": [
    {
      "name": "string",
      "search_alias": "string",
      "vocal_gender": "FEMALE" | "MALE" | "COED",
      "genre": "string",
      "reason": "string"
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
          const rawList: DiscoveredArtistCandidate[] = Array.isArray(parsed)
            ? parsed
            : parsed.candidates || [];

          const validList = filterNewCandidates(rawList);
          if (validList.length > 0) {
            discoveredList = validList;
            usedModel = modelName;
            break;
          }
        } catch (err: any) {
          console.warn(`[LLM 밴드 탐색 모델(${modelName}) 재시도]:`, err?.status || err?.message);
        }
      }
    }

    if (discoveredList.length === 0) {
      let fallbackPool = filterNewCandidates(CURATED_BAND_POOL);
      if (category.includes('여성')) {
        fallbackPool = fallbackPool.filter((b) => b.vocal_gender === 'FEMALE');
      } else if (category.includes('남성')) {
        fallbackPool = fallbackPool.filter((b) => b.vocal_gender === 'MALE');
      } else if (category.includes('J-Rock') || category.includes('일본')) {
        fallbackPool = fallbackPool.filter((b) => b.genre.includes('J-'));
      }
      discoveredList = fallbackPool.slice(0, 6);
    }

    // AUTO_ADD 액션인 경우 발굴된 밴드 중 상위 autoAddCount개 팀을 즉시 target_artists에 1순위로 등록
    if (action === 'AUTO_ADD') {
      const toInsert = discoveredList.slice(0, autoAddCount);
      const addedArtists: any[] = [];

      for (const item of toInsert) {
        const { data: inserted, error: insErr } = await supabase
          .from('target_artists')
          .insert([
            {
              name: item.name,
              search_alias: item.search_alias,
              vocal_gender: item.vocal_gender,
              priority: 1,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (!insErr && inserted) {
          addedArtists.push(inserted);
        }
      }

      return NextResponse.json({
        success: true,
        model: usedModel,
        addedCount: addedArtists.length,
        addedArtists,
        message:
          addedArtists.length > 0
            ? `[자동 아티스트 확장] 모든 수집곡 분석 완료(100%) 감지 → 신규 밴드 ${addedArtists
                .map((a) => `${a.name}(${a.search_alias})`)
                .join(', ')} 자동 등록 완료!`
            : '추가할 신규 밴드가 없습니다.',
      });
    }

    return NextResponse.json({
      success: true,
      model: usedModel,
      candidates: discoveredList,
    });
  } catch (err: any) {
    console.error('[LLM 밴드 탐색 API 에러]:', err);
    return NextResponse.json(
      { success: false, message: err.message || '밴드 탐색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

