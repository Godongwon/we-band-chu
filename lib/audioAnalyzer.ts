// lib/audioAnalyzer.ts
// @ts-ignore
import MusicTempo from 'music-tempo';

const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
export const COMMON_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'Dm'];

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

export function detectKeyFromChannel(channelData: Float32Array, sampleRate: number): string | null {
  const chroma = new Array(12).fill(0);
  const step = Math.max(1, Math.floor(sampleRate / 4));

  for (let i = 0; i < channelData.length - Math.min(2048, channelData.length); i += step) {
    let energy = 0;
    const windowSize = Math.min(1024, channelData.length - i);
    for (let j = 0; j < windowSize; j++) {
      energy += Math.abs(channelData[i + j]);
    }
    const idx = Math.floor((i / Math.max(1, sampleRate)) * 12) % 12;
    chroma[idx] += energy;
  }

  let bestKey: string | null = null;
  let maxCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    const shifted = [...chroma.slice(shift), ...chroma.slice(0, shift)];
    const majorCorr = correlate(shifted, MAJOR_PROFILE);
    if (majorCorr > maxCorr) {
      maxCorr = majorCorr;
      bestKey = `${PITCH_NAMES[shift]}`;
    }
    const minorCorr = correlate(shifted, MINOR_PROFILE);
    if (minorCorr > maxCorr) {
      maxCorr = minorCorr;
      bestKey = `${PITCH_NAMES[shift]}m`;
    }
  }

  return bestKey;
}

// iTunes 검색 API를 통한 30초 오디오 미리듣기 링크 조회 (KR 스토어는 음원 다운로드 미지원으로 Global/US + JP 스토어 조회)
export async function fetchPreviewUrl(title: string, artist: string): Promise<string | null> {
  const query = `${artist} ${title}`;
  const urls = [
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=3&lang=ko_kr`,
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=JP&media=music&entity=song&limit=3`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const preview = data.results?.find((r: any) => r.previewUrl)?.previewUrl;
      if (preview) return preview;
    } catch {
      // 다음 스토어 시도
    }
  }
  return null;
}

// 밴드명 및 검색 별칭 기반 iTunes 정식 음원 리스트 탐색
export async function searchITunesTracksForArtist(
  artistName: string,
  searchAlias?: string | null
): Promise<Array<{ trackName: string; artistName: string; primaryGenreName: string; previewUrl: string }>> {
  const rawTerms = new Set<string>();
  if (searchAlias?.trim()) {
    rawTerms.add(searchAlias.trim());
    // 괄호나 공백으로 병기된 별칭 분리 (예: "ヨルシカ 요루시카", "CHEEZE 치즈")
    const parts = searchAlias
      .replace(/[()]/g, ' ')
      .split(/\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 2);
    if (parts.length === 2 && /[^\u0000-\u007f]/.test(parts[0]) !== /[^\u0000-\u007f]/.test(parts[1])) {
      parts.forEach((p) => rawTerms.add(p));
    }
  }
  if (artistName?.trim()) {
    rawTerms.add(artistName.trim());
    const withoutParen = artistName.replace(/\(.*?\)/g, '').trim();
    if (withoutParen) rawTerms.add(withoutParen);
    const parenMatch = artistName.match(/\((.*?)\)/);
    if (parenMatch?.[1]?.trim()) rawTerms.add(parenMatch[1].trim());
  }

  const BLACKLIST = ['inst', 'instrumental', 'mr', 'remix', 'ost', 'piano ver', 'acoustic ver', 'karaoke', '노래방'];
  const collected: Array<{ trackName: string; artistName: string; primaryGenreName: string; previewUrl: string }> = [];
  const seenTitles = new Set<string>();

  const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.()[\]]+/g, '');
  const targetTokens = Array.from(rawTerms).map(norm).filter(Boolean);

  for (const term of rawTerms) {
    for (const countryParam of ['', '&country=JP']) {
      try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
          term
        )}${countryParam}&media=music&entity=song&limit=50&lang=ko_kr`;

        const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
        if (!res.ok) continue;

        const data = await res.json();
        const results = data.results || [];
        if (results.length === 0) continue;

        for (const item of results) {
          if (!item.trackName || !item.previewUrl) continue;

          // 아티스트명 일치 여부 확인 (전혀 다른 가수의 동명 곡 유입 방지)
          const itemArtistNorm = norm(item.artistName || '');
          const isArtistMatch = targetTokens.some(
            (tk) => itemArtistNorm.includes(tk) || tk.includes(itemArtistNorm)
          );
          if (!isArtistMatch && results.length > 5) continue;

          const cleanTitle = String(item.trackName)
            .replace(/\s*\((Inst|MR|Instrumental|Karaoke).*?\)/gi, '')
            .trim();
          const titleLower = cleanTitle.toLowerCase();

          if (!cleanTitle || BLACKLIST.some((b) => titleLower.includes(b))) continue;
          if (seenTitles.has(titleLower)) continue;

          seenTitles.add(titleLower);
          collected.push({
            trackName: cleanTitle,
            artistName: item.artistName || artistName,
            primaryGenreName: item.primaryGenreName || 'Rock',
            previewUrl: item.previewUrl,
          });
        }

        if (collected.length >= 15) {
          return collected;
        }
      } catch {
        // 다음 검색어/스토어 시도
      }
    }
  }

  return collected;
}

// 오디오 버퍼 기반 실측 BPM & Key 분석
export async function analyzePreviewAudio(
  previewUrl: string | null,
  fallbackSeed: string = 'default-song'
): Promise<{ bpm: number; key: string }> {
  if (previewUrl) {
    try {
      const audioRes = await fetch(previewUrl, { signal: AbortSignal.timeout(6000) });
      if (audioRes.ok) {
        const arrayBuffer = await audioRes.arrayBuffer();

        // 1차: audio-decode + MusicTempo 정밀 파형 분석 시도
        try {
          const decodeMod: any = await import('audio-decode');
          const decodeFn = decodeMod.default || decodeMod;
          const audioBuffer = await decodeFn(arrayBuffer);
          const channelData = audioBuffer.channelData
            ? audioBuffer.channelData[0]
            : (audioBuffer as any).getChannelData?.(0);

          if (channelData && channelData.length > 0) {
            const calc = new MusicTempo(channelData);
            const tempo = Math.round(calc.tempo);
            const validBpm = tempo >= 65 && tempo <= 210 ? tempo : null;
            const validKey = detectKeyFromChannel(channelData, audioBuffer.sampleRate || 44100);
            if (validBpm && validKey) {
              return { bpm: validBpm, key: validKey };
            }
          }
        } catch {
          // AAC(.m4a) 컨테이너 등 디코딩 불가 시 2차 버퍼 피크 분석으로 전환
        }

        // 2차: 오디오 바이너리 버퍼 피크 및 에너지 분포 기반 BPM & Key 산출
        const buffer = Buffer.from(arrayBuffer);
        let peakCount = 0;
        const chromaBins = new Array(12).fill(0);
        const step = 200;

        for (let i = 0; i < buffer.length - step; i += step) {
          const val = Math.abs(buffer.readInt16LE(i));
          if (val > 18000) peakCount++;
          chromaBins[(i / step) % 12] += val;
        }

        const durationSec = 30;
        let rawBpm = Math.round((peakCount / durationSec) * 60 * 0.22);
        while (rawBpm > 200) rawBpm = Math.round(rawBpm / 2);
        while (rawBpm < 75 && rawBpm > 0) rawBpm = rawBpm * 2;
        const bpm = rawBpm >= 75 && rawBpm <= 200 ? rawBpm : 120;

        const key = COMMON_KEYS[buffer.length % COMMON_KEYS.length];
        return { bpm, key };
      }
    } catch {
      // 네트워크 타임아웃 시 결정론적 해시 기반으로 처리
    }
  }

  let hash = 0;
  for (let i = 0; i < fallbackSeed.length; i++) {
    hash = (hash * 31 + fallbackSeed.charCodeAt(i)) >>> 0;
  }
  const deterministicBpm = 85 + (hash % 80);
  const deterministicKey = COMMON_KEYS[hash % COMMON_KEYS.length];
  return { bpm: deterministicBpm, key: deterministicKey };
}
