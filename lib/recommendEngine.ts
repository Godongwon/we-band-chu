// lib/recommendEngine.ts
import { supabase } from '@/lib/supabaseClient';

export interface BandProfile {
  name: string;
  vocal_gender: 'MALE' | 'FEMALE' | 'MIXED' | 'ANY';
  guitar_count: number;
  has_keys: boolean;
}

export interface RepertoireItem {
  title: string;
  artist: string;
  status?: string;
  genre?: string;
  bpm?: number;
}

export interface RecommendedSong {
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  original_key: string;
  recommended_key: string;
  has_live_performance: boolean;
  has_instrument_cover: boolean;
  youtube_url?: string;
  reason?: string;
}

export interface RecommendContext {
  bandProfile?: BandProfile;
  repertoireSongs?: RepertoireItem[];
  category?: string;
  excludeTitles?: string[];
  apiKey: string;
}

const TARGET_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

// 레퍼토리 최빈 장르 계산
function getDominantGenre(repertoire: RepertoireItem[]): string {
  if (!repertoire || repertoire.length === 0) return '모던록';
  
  const frequencyMap: Record<string, number> = {};
  for (const item of repertoire) {
    const g = item.genre?.trim();
    if (g && g !== '밴드음악') {
      frequencyMap[g] = (frequencyMap[g] || 0) + 1;
    }
  }

  const entries = Object.entries(frequencyMap);
  if (entries.length === 0) return '모던록';

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// lib/recommendEngine.ts 내 getTabCriteria 함수
function getTabCriteria(category: string, dominantGenre: string) {
  switch (category) {
    case 'SIMILAR':
      return {
        desc: `현재 등록된 우리 밴드 레퍼토리의 최빈 장르는 "${dominantGenre}"입니다. 반드시 "${dominantGenre}" 장르 및 해당 무드와 정확히 일치하는 곡만 선별하세요.`,
        minBpm: 0,
        maxBpm: 999,
        requiredGenres: [dominantGenre]
      };
    case 'HIGH_TENSION':
      return {
        desc: `BPM이 170 이상인 매우 빠르고 폭발적인 곡이어야 합니다. 장르는 반드시 펑크 록(Punk Rock), 팝 펑크, 하드 록(Hard Rock) 계열이어야 합니다. 잔잔하거나 미디엄 템포 곡은 절대 금지합니다.`,
        minBpm: 170,
        maxBpm: 999,
        requiredGenres: ['펑크', '하드록', '펑크록', '팝펑크', 'Punk', 'Hard Rock']
      };
    case 'PLAYING_FEEL':
      return {
        desc: `BPM이 110 이하의 슬로우/미디엄 템포 곡이어야 합니다. 장르는 반드시 사이키델릭 록(Psychedelic Rock) 또는 얼터너티브 록(Alternative Rock)이어야 하며, 기타 솔로/리프나 베이스 그루브 등 악기 연주 손맛이 뛰어난 곡이어야 합니다.`,
        minBpm: 0,
        maxBpm: 110,
        requiredGenres: ['사이키델릭', '얼터너티브', 'Psychedelic', 'Alternative']
      };
    case 'EMOTIONAL':
      return {
        desc: `BPM이 120 이하인 서정적이고 멜로디가 돋보이는 곡이어야 합니다. 장르는 인디 록(Indie Rock), 모던 록(Modern Rock), 파워 팝(Power Pop) 계열이어야 합니다.`,
        minBpm: 0,
        maxBpm: 120,
        requiredGenres: ['인디록', '모던록', '파워팝', 'Indie', 'Modern Rock', 'Power Pop']
      };
    // 💡 case 'RARE' 삭제 완료
    default:
      return {
        desc: `합주하기 좋은 균형 잡힌 인기 밴드 명곡.`,
        minBpm: 0,
        maxBpm: 999,
        requiredGenres: []
      };
  }
}

// 유튜브 URL 단건 검색
async function searchYoutubeVideoUrl(query: string, apiKey: string): Promise<string | null> {
  try {
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(ytUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return `https://www.youtube.com/watch?v=${data.items[0].id.videoId}`;
    }
    return null;
  } catch {
    return null;
  }
}

// 탭 조건에 맞춘 Supabase DB 폴백 조회 (조건 없는 무작위 방지)
export async function getDbFallbackSongs(
  category: string,
  excludeTitles: string[] = [],
  limit: number = 10
): Promise<RecommendedSong[]> {
  try {
    let query = supabase.from('songs').select('*');

    if (category === 'HIGH_TENSION') {
      query = query.gte('bpm', 170);
    } else if (category === 'PLAYING_FEEL') {
      query = query.lte('bpm', 110);
    } else if (category === 'EMOTIONAL') {
      query = query.lte('bpm', 120);
    }

    const { data: dbSongs } = await query.limit(40);
    if (!dbSongs || dbSongs.length === 0) {
      // 해당 조건의 DB 곡이 전혀 없을 때만 전체에서 제한적 추출
      const { data: anySongs } = await supabase.from('songs').select('*').limit(limit);
      return (anySongs || []).map((s: any) => ({
        title: s.title,
        artist: s.artist,
        genre: s.genre || '밴드음악',
        bpm: s.bpm || 120,
        original_key: s.original_key || 'C Key',
        recommended_key: '원키 유지',
        has_live_performance: !!s.live_url,
        has_instrument_cover: !!s.cover_url,
        youtube_url: s.youtube_url || '',
        reason: 'DB 보충 추천'
      }));
    }

    return dbSongs
      .filter((s: any) => !excludeTitles.includes(s.title))
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((s: any) => ({
        title: s.title,
        artist: s.artist,
        genre: s.genre || '밴드음악',
        bpm: s.bpm || 120,
        original_key: s.original_key || 'C Key',
        recommended_key: '원키 유지',
        has_live_performance: !!s.live_url,
        has_instrument_cover: !!s.cover_url,
        youtube_url: s.youtube_url || '',
        reason: `${category} 테마 조건 일치 곡`
      }));
  } catch {
    return [];
  }
}

// LLM에게 상세 곡 정보(실제 BPM, 세부 장르, 키, 이유)를 JSON 규격으로 생성하도록 요청
async function generateDetailedSongsWithLLM(
  ctx: RecommendContext,
  category: string,
  count: number = 5
): Promise<RecommendedSong[]> {
  const { bandProfile, repertoireSongs = [], excludeTitles = [], apiKey } = ctx;
  const dominantGenre = getDominantGenre(repertoireSongs);
  const criteria = getTabCriteria(category, dominantGenre);

  const bandSpecs = `
- 밴드명: ${bandProfile?.name || '우리 밴드'}
- 보컬 구성: ${bandProfile?.vocal_gender === 'FEMALE' ? '여성 보컬' : bandProfile?.vocal_gender === 'MALE' ? '남성 보컬' : '혼성/자유'}
- 일렉기타: ${bandProfile?.guitar_count || 1}대
- 건반: ${bandProfile?.has_keys ? '있음' : '없음 (기타 편곡 가능해야 함)'}
  `.trim();

  const excludeText = excludeTitles.length > 0 ? `[제외할 곡 목록 (중복 방지)]: ${excludeTitles.join(', ')}` : '';

  const systemPrompt = `
당신은 대한민국 밴드 전문 음악 디렉터입니다.
아래 [밴드 스펙]과 [선곡 테마 규칙]을 **엄격하게 준수**하는 실제 발매된 실존 밴드 곡 ${count}곡을 선별하세요.

[밴드 스펙]
${bandSpecs}

[선곡 테마 규칙]
${criteria.desc}
${excludeText}

⚠️ 중요 지침:
1. 없는 곡이나 가상의 아티스트를 절대 지어내지 마세요.
2. 각 곡의 실제 BPM과 실제 장르를 정확하게 기재해야 합니다. (규칙 범위를 벗어난 곡은 탈락 처리됩니다.)
3. reason에는 해당 탭 테마(템포, 연주 손맛, 장르 특징 등)에 왜 부합하는지 1문장으로 간결하게 적으세요.

반드시 마크다운 코드블록(\`\`\`json) 없이 순수 JSON 배열로만 응답하세요.
[
  {
    "title": "곡 제목",
    "artist": "아티스트명",
    "genre": "세부 장르 (예: 팝 펑크, 사이키델릭 록, 모던 록)",
    "bpm": 178,
    "original_key": "E Key",
    "recommended_key": "원키 유지",
    "reason": "178 BPM의 빠른 템포와 시원한 질주감으로 텐션업에 최적인 펑크록 트랙"
  }
]
  `.trim();

  for (const model of TARGET_MODELS) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      const genData = await response.json();
      const rawOutput = genData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawOutput) {
        const cleanJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 탭 조건 필터링 검증
          const filtered = parsed.filter((song: any) => {
            if (!song.title || !song.artist) return false;
            const songBpm = Number(song.bpm) || 120;
            if (criteria.minBpm > 0 && songBpm < criteria.minBpm) return false;
            if (criteria.maxBpm < 999 && songBpm > criteria.maxBpm) return false;
            return true;
          });

          return filtered.map((s: any) => ({
            title: s.title.trim(),
            artist: s.artist.trim(),
            genre: s.genre || '밴드음악',
            bpm: Number(s.bpm) || 120,
            original_key: s.original_key || 'C Key',
            recommended_key: s.recommended_key || '원키 유지',
            has_live_performance: true,
            has_instrument_cover: true,
            reason: s.reason || ''
          }));
        }
      }
    } catch {
      continue;
    }
  }

  return [];
}

// 추천 곡 목록의 실제 유튜브 음원 링크 병렬 매핑
async function attachYoutubeLinks(songs: RecommendedSong[], apiKey: string): Promise<RecommendedSong[]> {
  const settled = await Promise.allSettled(
    songs.map(async (song) => {
      const url = await searchYoutubeVideoUrl(`${song.artist} ${song.title} official audio`, apiKey);
      return {
        ...song,
        youtube_url: url || `https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + ' ' + song.title)}`
      };
    })
  );

  return settled.map((res, idx) => {
    if (res.status === 'fulfilled') return res.value;
    return songs[idx];
  });
}

// ========================================================
// 🎯 메인 추천 엔진 진입점
// ========================================================
export async function runBandRecommendation(ctx: RecommendContext): Promise<RecommendedSong[]> {
  const { category = 'ALL', excludeTitles = [], apiKey } = ctx;

  if (!apiKey || apiKey.trim() === '') {
    return getDbFallbackSongs(category, excludeTitles, 10);
  }

  if (category === 'ALL') {
    const subCategories = ['SIMILAR', 'HIGH_TENSION', 'PLAYING_FEEL', 'EMOTIONAL'];

    const subCategoryPromises = subCategories.map((subCat) =>
      generateDetailedSongsWithLLM(ctx, subCat, 4)
    );
    const subResults = await Promise.all(subCategoryPromises);

    const aggregated: RecommendedSong[] = [];
    const usedTitles = new Set<string>(excludeTitles.map((t) => t.toLowerCase()));

    // 4개 탭을 순회하며 중복 없이 최대 10곡까지 채움 (각 탭에서 2~3곡씩 분배)
    for (let i = 0; i < subCategories.length; i++) {
      const songsInTab = subResults[i] || [];
      let addedFromThisTab = 0;
      // 레퍼토리 유사 및 텐션 탭은 3곡, 손맛 및 감성 탭은 2곡 추출 -> 총 10곡
      const targetPerTab = i < 2 ? 3 : 2;

      for (const song of songsInTab) {
        const lower = song.title.toLowerCase();
        if (!usedTitles.has(lower)) {
          usedTitles.add(lower);
          aggregated.push(song);
          addedFromThisTab++;
          if (addedFromThisTab >= targetPerTab) break;
        }
      }
    }

    // 10곡 부족 시 DB 조건 보충
    if (aggregated.length < 10) {
      const needed = 10 - aggregated.length;
      const dbFillers = await getDbFallbackSongs('ALL', Array.from(usedTitles), needed);
      aggregated.push(...dbFillers);
    }

    return attachYoutubeLinks(aggregated.slice(0, 10), apiKey);
  }

  // 2. 단일 탭(레퍼토리 유사, 텐션, 손맛, 감성, 희소) 처리
  const detailedSongs = await generateDetailedSongsWithLLM(ctx, category, 12);
  const finalResults: RecommendedSong[] = [];
  const titleSet = new Set<string>(excludeTitles.map((t) => t.toLowerCase()));

  for (const song of detailedSongs) {
    const lower = song.title.toLowerCase();
    if (!titleSet.has(lower)) {
      titleSet.add(lower);
      finalResults.push(song);
      if (finalResults.length >= 10) break;
    }
  }

  // 부족분은 해당 탭의 BPM/장르 조건에 맞는 DB 곡으로만 보충
  if (finalResults.length < 10) {
    const needed = 10 - finalResults.length;
    const dbFillers = await getDbFallbackSongs(category, Array.from(titleSet), needed);
    finalResults.push(...dbFillers);
  }

  return attachYoutubeLinks(finalResults.slice(0, 10), apiKey);
}