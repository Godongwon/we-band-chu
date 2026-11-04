import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
// @ts-ignore
import MusicTempo from 'music-tempo';
// @ts-ignore
import decode from 'audio-decode'; // 💡 사운드 드라이버 불필요한 순수 JS 디코더


// 💡 Vercel 타임아웃 방지 설정 (직접 추가해 주는 코드입니다)
export const maxDuration = 60; // Vercel 서버리스 실행 제한 시간을 60초로 연장

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
// 2. iTunes Search API (음원 탐색 + previewUrl 획득)
// ========================================================
interface ITunesTrack {
  trackName: string;
  artistName: string;
  primaryGenreName?: string;
  previewUrl?: string;
}

async function fetchTracksFromITunes(
  artist: string,
  searchAlias?: string | null
): Promise<Array<{ title: string; defaultGenre: string; previewUrl?: string }>> {
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

      const candidates: Array<{ title: string; defaultGenre: string; previewUrl?: string }> = [];
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
          previewUrl: item.previewUrl,
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
// 3. 오디오 파형 기반 실측 BPM 및 Key(조성) 동시 검출
// ========================================================
const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlate(data: number[], profile: number[]): number {
  const dMean = data.reduce((a, b) => a + b, 0) / data.length;
  const pMean = profile.reduce((a, b) => a + b, 0) / profile.length;
  let num = 0, den1 = 0, den2 = 0;
  for (let i = 0; i < data.length; i++) {
    const dDiff = data[i] - dMean;
    const pDiff = profile[i] - pMean;
    num += dDiff * pDiff;
    den1 += dDiff * dDiff;
    den2 += pDiff * pDiff;
  }
  return den1 && den2 ? num / Math.sqrt(den1 * den2) : 0;
}


function detectKeyFromChannel(channelData: Float32Array, sampleRate: number): string | null {
  const chroma = new Array(12).fill(0);
  const step = Math.floor(sampleRate / 4); // 0.25초 간격 샘플링

  for (let i = 0; i < channelData.length - 2048; i += step) {
    let energy = 0;
    for (let j = 0; j < 1024; j++) {
      energy += Math.abs(channelData[i + j]);
    }
    const idx = Math.floor((i / sampleRate) * 12) % 12;
    chroma[idx] += energy;
  }

  let bestKey: string | null = null;
  let maxCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    const shifted = [...chroma.slice(shift), ...chroma.slice(0, shift)];
    
    // 메이저 판별 (예: C, E, F#, B)
    const majorCorr = correlate(shifted, MAJOR_PROFILE);
    if (majorCorr > maxCorr) {
      maxCorr = majorCorr;
      bestKey = `${PITCH_NAMES[shift]}`; // Major는 깔끔하게 음계명만 (예: E, B)
    }

    // 마이너 판별 (예: C#m, Am, F#m)
    const minorCorr = correlate(shifted, MINOR_PROFILE);
    if (minorCorr > maxCorr) {
      maxCorr = minorCorr;
      bestKey = `${PITCH_NAMES[shift]}m`; // Minor는 소문자 m 추가 (예: C#m)
    }
  }

  return bestKey; // 미검출 시 null 반환
}

async function analyzeAudioFeatures(previewUrl?: string): Promise<{ bpm: number | null; original_key: string | null }> {
  if (!previewUrl) return { bpm: null, original_key: null };

  try {
    const res = await fetch(previewUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { bpm: null, original_key: null };

    const arrayBuffer = await res.arrayBuffer();

    // 순수 JS로 오디오 디코딩 (리눅스 서버리스 완벽 호환)
    const audioBuffer = await decode(arrayBuffer);
const channelData = audioBuffer.channelData ? audioBuffer.channelData[0] : (audioBuffer as any).getChannelData?.(0);

    const calc = new MusicTempo(channelData);
    const tempo = Math.round(calc.tempo);
    const validBpm = tempo > 40 && tempo < 240 ? tempo : null;
    const validKey = detectKeyFromChannel(channelData, audioBuffer.sampleRate);

    return { bpm: validBpm, original_key: validKey };
  } catch (err: any) {
    console.warn('[Audio Analysis Skipped]:', err.message);
    return { bpm: null, original_key: null };
  }
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
// 5. 단일 밴드 배치 수집 실행기 (BPM + Key 동시 분석)
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
  console.log(`[AutoHarvest] >>> [BPM + Key 동시 실측 수집 시작] "${targetArtist}" (별칭: ${searchAlias || '없음'})`);

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

      // 30초 오디오 파형에서 BPM과 Key를 단일 디코딩으로 동시 계산
      const { bpm, original_key } = await analyzeAudioFeatures(track.previewUrl);

      // 유튜브 음원 URL 연결
      let officialAudioUrl: string | null = null;
      if (!globalThis.__youtubeQuotaExceeded && ytApiKey) {
        officialAudioUrl = await verifyAndFetchOfficialAudio(
          targetArtist,
          cleanTitle,
          ytApiKey
        );
      }

      // Supabase 적재 (artist, title 복합 제약조건 충돌 방지)
      const { error: songError } = await supabase.from('songs').upsert(
        {
          title: cleanTitle,
          artist: targetArtist,
          artist_id: currentTarget.id,
          genre: track.defaultGenre || '밴드음악',
          bpm: bpm,
          original_key: original_key,
          youtube_url: officialAudioUrl,
          live_url: null,
          cover_url: null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'artist,title' }
      );

      if (!songError) {
        savedCount++;
        existingTitleSet.add(cleanTitle.toLowerCase());
        const bpmDisplay = bpm ? `${bpm}` : '측정 불가';
        console.log(
          `[AutoHarvest DB 적재] (${savedCount}/${newTracksToProcess.length}) ${targetArtist} - ${cleanTitle} [BPM: ${bpmDisplay}, Key: ${original_key}, 장르: ${track.defaultGenre}] (음원URL: ${officialAudioUrl ? 'O' : 'X'})`
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
    `[AutoHarvest] BPM 및 Key 동시 실측 수집 워커 가동됨. (주기: ${
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
    message: 'iTunes 전곡 + previewUrl 실측 BPM 및 Key 파이프라인 가동 중',
    intervalMs: HARVEST_INTERVAL_MS,
    lastExecution: result,
    quota: getQuotaStatus(),
  });
}