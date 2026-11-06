// lib/artistClassifier.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ArtistClassification {
  search_alias: string;
  vocal_gender: 'FEMALE' | 'MALE' | 'COED';
}

const GEMINI_MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

function hasKoreanOrJapanese(str: string): boolean {
  return /[가-힣ㄱ-ㅎㅏ-ㅣぁ-んァ-ヶ一-龯]/.test(str);
}

/**
 * 주요 국내/해외 밴드의 공식 iTunes 영문 검색명 및 보컬 성별 사전 (LLM 503 과부하/오분류 방지용)
 */
const KNOWN_BAND_METADATA: Record<
  string,
  { search_alias: string; vocal_gender: 'FEMALE' | 'MALE' | 'COED' }
> = {
  한로로: { search_alias: 'HANRORO', vocal_gender: 'FEMALE' },
  넬: { search_alias: 'NELL', vocal_gender: 'MALE' },
  뷰렛: { search_alias: 'Biuret', vocal_gender: 'FEMALE' },
  아도이: { search_alias: 'ADOY', vocal_gender: 'MALE' },
  '워킹 애프터 유': { search_alias: 'Walking After U', vocal_gender: 'FEMALE' },
  녹황색사회: { search_alias: 'Ryokuoushoku Shakai', vocal_gender: 'FEMALE' },
  검정치마: { search_alias: 'The Black Skirts', vocal_gender: 'MALE' },
  페퍼톤스: { search_alias: 'PEPPERTONES', vocal_gender: 'MALE' },
  체리필터: { search_alias: 'cherryfilter', vocal_gender: 'FEMALE' },
  YB: { search_alias: 'YB', vocal_gender: 'MALE' },
  국카스텐: { search_alias: 'Guckkasten', vocal_gender: 'MALE' },
  QWER: { search_alias: 'QWER', vocal_gender: 'FEMALE' },
  SHISHAMO: { search_alias: 'SHISHAMO', vocal_gender: 'FEMALE' },
  실리카겔: { search_alias: 'Silica Gel', vocal_gender: 'MALE' },
  Chvrches: { search_alias: 'CHVRCHES', vocal_gender: 'FEMALE' },
  '달총 (CHEEZE)': { search_alias: 'CHEEZE', vocal_gender: 'FEMALE' },
  치즈: { search_alias: 'CHEEZE', vocal_gender: 'FEMALE' },
  터치드: { search_alias: 'TOUCHED', vocal_gender: 'FEMALE' },
  '터치드 (TOUCHED)': { search_alias: 'TOUCHED', vocal_gender: 'FEMALE' },
  'The Peggies': { search_alias: 'the peggies', vocal_gender: 'FEMALE' },
  디어클라우드: { search_alias: 'Dear Cloud', vocal_gender: 'FEMALE' },
  너드커넥션: { search_alias: 'Nerd Connection', vocal_gender: 'MALE' },
  잔나비: { search_alias: 'JANNABI', vocal_gender: 'MALE' },
  LUCY: { search_alias: 'LUCY', vocal_gender: 'MALE' },
  루시: { search_alias: 'LUCY', vocal_gender: 'MALE' },
  앨리스신드롬: { search_alias: 'Alice Syndrome', vocal_gender: 'FEMALE' },
  웨이브투어스: { search_alias: 'wave to earth', vocal_gender: 'MALE' },
  쏜애플: { search_alias: 'THORNAPPLE', vocal_gender: 'MALE' },
  '쏜애플 (THORNAPPLE)': { search_alias: 'THORNAPPLE', vocal_gender: 'MALE' },
  전소연: { search_alias: 'SOYEON', vocal_gender: 'FEMALE' },
  새소년: { search_alias: 'SE SO NEON', vocal_gender: 'FEMALE' },
  윤하: { search_alias: 'Younha', vocal_gender: 'FEMALE' },
  자우림: { search_alias: 'Jaurim', vocal_gender: 'FEMALE' },
  ZUTOMAYO: { search_alias: 'ZUTOMAYO', vocal_gender: 'FEMALE' },
  YOASOBI: { search_alias: 'YOASOBI', vocal_gender: 'FEMALE' },
  Yorushika: { search_alias: 'Yorushika', vocal_gender: 'FEMALE' },
  DAY6: { search_alias: 'DAY6', vocal_gender: 'MALE' },
  데이식스: { search_alias: 'DAY6', vocal_gender: 'MALE' },
  RESCENE: { search_alias: 'RESCENE', vocal_gender: 'FEMALE' },
  롤러코스터: { search_alias: 'Roller Coaster', vocal_gender: 'FEMALE' },
  피싱걸스: { search_alias: 'Fishingirls', vocal_gender: 'FEMALE' },
  Paramore: { search_alias: 'Paramore', vocal_gender: 'FEMALE' },
  'Against The Current': { search_alias: 'Against The Current', vocal_gender: 'FEMALE' },
};

/**
 * iTunes 영문 스토어(lang=en_us)에서 실제 등록된 영문 아티스트명을 우선 탐색합니다.
 */
async function resolveOfficialITunesEnglishAlias(artistName: string): Promise<string | null> {
  const cleanName = artistName.replace(/\s*\(.*?\)\s*/g, '').trim();

  // 이미 순수 영문 이름인 경우(YB, LUCY, DAY6 등) 동명이인 오매칭 방지를 위해 그대로 반환
  if (cleanName && !hasKoreanOrJapanese(cleanName)) {
    return cleanName;
  }

  // 괄호 안에 영문명이 병기된 경우 (예: "쏜애플 (THORNAPPLE)") 우선 추출
  const parenMatch = artistName.match(/\(([A-Za-z0-9\s.&'-]+)\)/);
  if (parenMatch && parenMatch[1] && !hasKoreanOrJapanese(parenMatch[1])) {
    return parenMatch[1].trim();
  }

  const terms = Array.from(new Set([cleanName, artistName])).filter(Boolean);

  for (const term of terms) {
    try {
      // 1) musicArtist 엔티티 영문명 조회
      const artistRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=5&lang=en_us`,
        { cache: 'no-store' }
      );
      if (artistRes.ok) {
        const artistData = await artistRes.json();
        const artistCandidates: string[] = (artistData.results || [])
          .map((r: any) => String(r.artistName || '').trim())
          .filter((n: string) => n && !n.includes(',') && !n.includes('&'));

        const englishArtist = artistCandidates.find((n) => !hasKoreanOrJapanese(n));
        if (englishArtist) return englishArtist;
      }

      // 2) song 엔티티 영문 아티스트명 조회 (체리필터 -> cherryfilter, 뷰렛 -> Biuret 등)
      const songRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10&lang=en_us`,
        { cache: 'no-store' }
      );
      if (songRes.ok) {
        const songData = await songRes.json();
        const songArtists: string[] = (songData.results || [])
          .map((r: any) => String(r.artistName || '').trim())
          .filter((n: string) => n && !n.includes(',') && !n.includes('&'));

        const englishSongArtist = songArtists.find((n) => !hasKoreanOrJapanese(n));
        if (englishSongArtist) return englishSongArtist;
      }
    } catch {
      // 네트워크 오류 시 무시하고 다음 단계 진행
    }
  }

  return null;
}

export async function classifyArtistWithLLM(artistName: string): Promise<ArtistClassification> {
  const trimmed = artistName.trim();
  const known = KNOWN_BAND_METADATA[trimmed];
  const itunesEnglishAlias =
    known?.search_alias || (await resolveOfficialITunesEnglishAlias(trimmed));

  const fallback: ArtistClassification = {
    search_alias: itunesEnglishAlias || trimmed,
    vocal_gender: known?.vocal_gender || 'FEMALE',
  };

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  const prompt = `당신은 대한민국 및 글로벌 인디/록/밴드 음악 데이터베이스 전문가입니다.
밴드/아티스트 이름: "${artistName}"
${itunesEnglishAlias ? `(참고: iTunes 영문 스토어 조회 후보명: "${itunesEnglishAlias}")` : ''}

이 아티스트에 대해 다음 2가지 정보를 JSON 객체로 분석하여 반환하세요:
1. "search_alias": Apple Music 및 iTunes 음원 검색창에 입력했을 때 해당 아티스트의 음원이 가장 정확하게 조회되는 공식 영문 표기(English/Romanized name) 1개만 반환하세요. 절대 한글이나 일본어로 반환하지 말고 반드시 영문(알파벳/숫자) 공식 활동명으로 반환하세요 (예: 잔나비 -> "JANNABI", 실리카겔 -> "Silica Gel", 한로로 -> "HANRORO", 넬 -> "NELL", 뷰렛 -> "Biuret", 아도이 -> "ADOY", 데이식스 -> "DAY6", 페퍼톤스 -> "PEPPERTONES", 요루시카 -> "Yorushika", 즛토마요 -> "ZUTOMAYO").
2. "vocal_gender": 메인 보컬의 성별 ("FEMALE" [여성 보컬/프론트], "MALE" [남성 보컬], "COED" [남녀 혼성 보컬]).

반드시 아래 JSON 형식만 반환하세요:
{
  "search_alias": "string",
  "vocal_gender": "FEMALE" | "MALE" | "COED"
}`;

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      const parsed = JSON.parse(rawText);

      const llmAlias = String(parsed.search_alias || '').trim();
      const normalizedGender = String(parsed.vocal_gender || '').toUpperCase();

      // LLM이 혹시 한글/일본어를 반환했더라도 iTunes 공식 영문명이 있으면 영문명을 우선 사용
      const finalAlias =
        llmAlias && !hasKoreanOrJapanese(llmAlias)
          ? llmAlias
          : itunesEnglishAlias || llmAlias || artistName;

      return {
        search_alias: finalAlias,
        vocal_gender: ['FEMALE', 'MALE', 'COED'].includes(normalizedGender)
          ? (normalizedGender as 'FEMALE' | 'MALE' | 'COED')
          : 'FEMALE',
      };
    } catch (err: any) {
      console.warn(`[LLM 밴드 분류 모델(${modelName}) 재시도]:`, err?.status || err?.message);
    }
  }

  return fallback;
}