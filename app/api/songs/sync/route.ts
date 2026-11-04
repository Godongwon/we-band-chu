// app/api/songs/sync/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// ========================================================
// 1. 수집 설정 및 전역 쿼터 모니터링 (싱글톤)
// ========================================================
export const HARVEST_INTERVAL_MS = 5 * 60 * 1000;

declare global {
  var __youtubeQuotaUnits: number | undefined;
  var __youtubeQuotaExceeded: boolean | undefined;
  var __youtubeQuotaLastReset: string | undefined;
  var __artistHarvestInterval: NodeJS.Timeout | undefined;
}

if (globalThis.__youtubeQuotaUnits === undefined) {
  globalThis.__youtubeQuotaUnits = 0;
  globalThis.__youtubeQuotaExceeded = false;
  globalThis.__youtubeQuotaLastReset = new Date().toDateString();
}

function checkAndResetDailyQuota() {
  const today = new Date().toDateString();
  if (globalThis.__youtubeQuotaLastReset !== today) {
    globalThis.__youtubeQuotaUnits = 0;
    globalThis.__youtubeQuotaExceeded = false;
    globalThis.__youtubeQuotaLastReset = today;
  }
}

export function addQuotaUnits(units: number) {
  checkAndResetDailyQuota();
  globalThis.__youtubeQuotaUnits = (globalThis.__youtubeQuotaUnits || 0) + units;
}

export function setQuotaExceeded(exceeded: boolean) {
  globalThis.__youtubeQuotaExceeded = exceeded;
}

export function getQuotaStatus() {
  checkAndResetDailyQuota();
  const currentUnits = globalThis.__youtubeQuotaUnits || 0;
  const isExceeded = !!globalThis.__youtubeQuotaExceeded;

  return {
    estimatedUnits: currentUnits,
    limitUnits: 10000,
    isExceeded,
    usagePercent: Math.min(100, Math.round((currentUnits / 10000) * 100)),
  };
}

let isHarvestingRunning = false;

// ========================================================
// 2. Apple iTunes Search API (1단계: 정식 발매 전곡 탐색)
// ========================================================
interface ITunesTrack {
  trackName: string;
  artistName: string;
  primaryGenreName?: string;
}

async function fetchTracksFromITunes(
  artist: string,
  searchAlias?: string | null
): Promise<Array<{ title: string; defaultGenre: string }>> {
  const searchTerms = searchAlias ? [searchAlias.trim(), artist] : [artist];

  for (const term of searchTerms) {
    if (!term) continue;

    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=200`;

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;

      const data = await res.json();
      if (!data.results || data.results.length === 0) continue;

      const candidates: Array<{ title: string; defaultGenre: string }> = [];
      const usedTitles = new Set<string>();

      const targetArtistClean = artist.toLowerCase().replace(/\s+/g, '');
      const aliasClean = (searchAlias || '').toLowerCase().replace(/\s+/g, '');

      for (const item of data.results as ITunesTrack[]) {
        if (!item.trackName) continue;

        const itemArtistClean = (item.artistName || '').toLowerCase().replace(/\s+/g, '');

        const isMatched =
          itemArtistClean.includes(targetArtistClean) ||
          targetArtistClean.includes(itemArtistClean) ||
          (aliasClean && (itemArtistClean.includes(aliasClean) || aliasClean.includes(itemArtistClean)));

        if (!isMatched) continue;

        let cleanTitle = item.trackName
          .replace(/\(.*?(Inst|MR|Remaster|Live|Ver\.|Version|Track|Instrumental).*?\)/gi, '')
          .replace(/\[.*?(Inst|MR|Remaster|Live|Ver\.|Version|Track|Instrumental).*?\]/gi, '')
          .trim();

        const lower = cleanTitle.toLowerCase();
        if (!cleanTitle || usedTitles.has(lower)) continue;

        usedTitles.add(lower);
        candidates.push({
          title: cleanTitle,
          defaultGenre: item.primaryGenreName || '록/포크',
        });
      }

      if (candidates.length > 0) {
        console.log(
          `[iTunes Search Success] "${artist}" (검색어: "${term}") 정식 음원 ${candidates.length}곡 탐색 완료`
        );
        return candidates;
      }
    } catch (err: any) {
      console.warn(`[iTunes Search Try Fail] ${term}:`, err.message);
    }
  }

  console.log(`[iTunes Search] 음원을 찾지 못함: "${artist}"`);
  return [];
}

// ========================================================
// 3. MusicBrainz Open Database API (장르 태그 인리치먼트)
// ========================================================
async function fetchMetadataFromMusicBrainz(
  artist: string,
  title: string,
  fallbackGenre: string
): Promise<{ genre: string; bpm: number | null }> {
  try {
    const luceneQuery = `recording:"${title}" AND artist:"${artist}"`;
    const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(
      luceneQuery
    )}&fmt=json&limit=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BandSongCrawler/1.0.0 (contact: admin@bandhub.local)',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.recordings && data.recordings.length > 0) {
        const recording = data.recordings[0];

        const tags = recording.tags || recording.genres || [];
        if (tags.length > 0) {
          tags.sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
          const bestTag = tags[0].name;
          return {
            genre: bestTag,
            bpm: null, // 💡 임의 120 대체 없이 BPM 없음(null)으로 명시
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[MusicBrainz Skip] ${artist} - ${title}:`, err.message);
  }

  return {
    genre: fallbackGenre || '밴드음악',
    bpm: null, // 💡 BPM 없음(null)으로 반환
  };
}

// ========================================================
// 4. YouTube API 검색 및 공식 음원 검증
// ========================================================
const BLACKLIST_KEYWORDS = [
  '모음',
  '플레이리스트',
  'playlist',
  'full album',
  '풀앨범',
  '전곡',
  '티저',
  'teaser',
  '직캠',
  'fancam',
  'reaction',
  '리액션',
  'mr제거',
  'inst',
  'karaoke',
  '노래방',
];

async function verifyAndFetchOfficialAudio(
  artist: string,
  title: string,
  apiKey: string
): Promise<string | null> {
  if (globalThis.__youtubeQuotaExceeded) return null;

  try {
    const query = `${artist} ${title} Official Audio`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(
      query
    )}&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      if (
        data.error.code === 403 ||
        data.error.errors?.some((e: any) => e.reason === 'quotaExceeded')
      ) {
        console.error('[YouTube API Error] 일일 쿼터 소진 감지!');
        setQuotaExceeded(true);
      }
      return null;
    }

    addQuotaUnits(100);

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const videoTitle = item.snippet.title;
      const channelTitle = item.snippet.channelTitle;

      const hasBlacklist = BLACKLIST_KEYWORDS.some((kw) =>
        videoTitle.toLowerCase().includes(kw)
      );
      if (hasBlacklist) return null;

      const targetArtistClean = artist.toLowerCase().replace(/\s+/g, '');
      const videoTitleClean = videoTitle.toLowerCase().replace(/\s+/g, '');
      const channelTitleClean = channelTitle.toLowerCase().replace(/\s+/g, '');

      const isMatched =
        videoTitleClean.includes(targetArtistClean) ||
        channelTitleClean.includes(targetArtistClean) ||
        videoTitleClean.includes(title.toLowerCase().replace(/\s+/g, ''));

      if (!isMatched) return null;

      return `https://www.youtube.com/watch?v=${item.id.videoId}`;
    }
  } catch {
    return null;
  }

  return null;
}

// ========================================================
// 5. 단일 밴드 배치 수집 실행기
// ========================================================
export async function runArtistHarvestBatch(): Promise<{
  success: boolean;
  artist: string;
  count: number;
}> {
  if (isHarvestingRunning) {
    return { success: false, artist: '대기 중 (이미 작업 중)', count: 0 };
  }

  const { data: activeArtists, error: artistError } = await supabase
    .from('target_artists')
    .select('id, name, search_alias, last_harvested_at')
    .eq('is_active', true)
    .order('last_harvested_at', { ascending: true, nullsFirst: true })
    .limit(1);

  if (artistError || !activeArtists || activeArtists.length === 0) {
    console.log('[AutoHarvest] 활성화된 수집 대상 아티스트가 없습니다.');
    return { success: false, artist: '활성 아티스트 없음', count: 0 };
  }

  const currentTarget = activeArtists[0];
  const targetArtist = currentTarget.name;
  const searchAlias = currentTarget.search_alias;
  const ytApiKey = process.env.YOUTUBE_API_KEY || '';

  isHarvestingRunning = true;
  console.log(`[AutoHarvest] >>> [MusicBrainz 연동 수집 시작] "${targetArtist}" (별칭: ${searchAlias || '없음'})`);

  let savedCount = 0;

  try {
    const { data: existingSongs } = await supabase
      .from('songs')
      .select('title')
      .eq('artist_id', currentTarget.id);

    const existingTitleSet = new Set<string>(
      (existingSongs || []).map((s) => s.title.toLowerCase().trim())
    );

    const itunesTracks = await fetchTracksFromITunes(targetArtist, searchAlias);

    const newTracksToProcess = itunesTracks.filter(
      (t) => !existingTitleSet.has(t.title.toLowerCase().trim())
    );

    console.log(
      `[AutoHarvest] "${targetArtist}" 전곡 ${itunesTracks.length}곡 중 신규 미등록 ${newTracksToProcess.length}곡 발견`
    );

    if (newTracksToProcess.length === 0) {
      console.log(`[AutoHarvest] "${targetArtist}"의 모든 곡이 이미 DB에 등록되어 있습니다.`);
      await supabase
        .from('target_artists')
        .update({ last_harvested_at: new Date().toISOString() })
        .eq('id', currentTarget.id);

      return { success: true, artist: targetArtist, count: 0 };
    }

    for (const track of newTracksToProcess) {
      const cleanTitle = track.title.trim();

      const meta = await fetchMetadataFromMusicBrainz(
        targetArtist,
        cleanTitle,
        track.defaultGenre
      );

      let officialAudioUrl: string | null = null;
      if (!globalThis.__youtubeQuotaExceeded && ytApiKey) {
        officialAudioUrl = await verifyAndFetchOfficialAudio(
          targetArtist,
          cleanTitle,
          ytApiKey
        );
      }

      // 💡 bpm: meta.bpm (확인되지 않으면 null로 저장)
    const { error: songError } = await supabase.from('songs').upsert(
  {
    title: cleanTitle,
    artist: targetArtist,
    artist_id: currentTarget.id,
    genre: meta.genre,
    bpm: meta.bpm,
    original_key: '원키',
    youtube_url: officialAudioUrl,
    live_url: null,
    cover_url: null,
    created_at: new Date().toISOString(),
  },
  { onConflict: 'artist,title' } // 💡 'artist,title' 복합 키로 지정
);

      if (!songError) {
        savedCount++;
        existingTitleSet.add(cleanTitle.toLowerCase());
        const bpmDisplay = meta.bpm ? `${meta.bpm}` : '없음';
        console.log(
          `[AutoHarvest DB 적재] (${savedCount}/${newTracksToProcess.length}) ${targetArtist} - ${cleanTitle} [BPM: ${bpmDisplay}, 장르: ${meta.genre}] (음원URL: ${officialAudioUrl ? 'O' : 'X'})`
        );
      } else {
        console.error(`[AutoHarvest DB Error]:`, songError.message);
      }
    }

    await supabase
      .from('target_artists')
      .update({ last_harvested_at: new Date().toISOString() })
      .eq('id', currentTarget.id);

    return { success: true, artist: targetArtist, count: savedCount };
  } catch (err: any) {
    console.error(`[AutoHarvest Error]:`, err);
    return { success: false, artist: targetArtist, count: savedCount };
  } finally {
    isHarvestingRunning = false;
  }
}

// ========================================================
// 6. 백그라운드 스케줄러 초기화
// ========================================================
if (!globalThis.__artistHarvestInterval) {
  console.log(
    `[AutoHarvest] MusicBrainz 연동 수집 워커 가동됨. (주기: ${
      HARVEST_INTERVAL_MS / 1000
    }초)`
  );

  setTimeout(() => {
    runArtistHarvestBatch();
  }, 3000);

  globalThis.__artistHarvestInterval = setInterval(() => {
    runArtistHarvestBatch();
  }, HARVEST_INTERVAL_MS);
}

// ========================================================
// 7. API Route 핸들러
// ========================================================
export async function GET(req: Request) {
  const result = await runArtistHarvestBatch();
  return NextResponse.json({
    message: 'iTunes 전곡 + MusicBrainz 오픈 DB 파이프라인 가동 중',
    intervalMs: HARVEST_INTERVAL_MS,
    lastExecution: result,
    quota: getQuotaStatus(),
  });
}