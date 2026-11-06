// app/workspace/types.ts
export type RepertoireStatus =
  | 'WISHLIST'
  | 'PRACTICING'
  | 'ENSEMBLE'
  | 'COMPLETED'
  | 'PERFORMED'
  | 'VIDEO_COMPLETED';

export const REPERTOIRE_STATUS_PRIORITY: Record<RepertoireStatus, number> = {
  PRACTICING: 1, // 1순위: 연습중
  ENSEMBLE: 2, // 2순위: 합주중
  COMPLETED: 3, // 3순위: 합주완료
  WISHLIST: 4, // 4순위: 후보
  PERFORMED: 5, // 5순위: 공연완료
  VIDEO_COMPLETED: 6, // 6순위: 영상완료
};

export function getRepertoireStatusOrder(status?: RepertoireStatus | string | null): number {
  if (status && status in REPERTOIRE_STATUS_PRIORITY) {
    return REPERTOIRE_STATUS_PRIORITY[status as RepertoireStatus];
  }
  return 4; // 기본값 후보(WISHLIST)
}

export function sortRepertoireSongs(list: SongItem[]): SongItem[] {
  return [...list].sort((a, b) => {
    const orderA = getRepertoireStatusOrder(a.status);
    const orderB = getRepertoireStatusOrder(b.status);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.title || '').localeCompare(b.title || '', 'ko-KR');
  });
}

export interface SongItem {
  id?: string;
  repertoire_id?: string;
  status?: RepertoireStatus;
  band_notes?: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  original_key: string;
  recommended_key: string;
  has_live_performance?: boolean;
  has_instrument_cover?: boolean;
  youtube_url?: string;
  preview_url?: string | null;
  vocal_gender?: string;
  reason?: string;
}

export interface BandProfile {
  id?: string;
  name: string;
  vocal_gender: string;
  guitar_count: number;
  has_keys: boolean;
}

export function normalizeSearchText(text?: string | null): string {
  return (text || '').toLowerCase().replace(/\s+/g, '');
}

export function matchesSongSearch(
  song: { title?: string | null; artist?: string | null },
  rawQuery: string
): boolean {
  const normQ = normalizeSearchText(rawQuery);
  if (!normQ) return false;

  const normTitle = normalizeSearchText(song.title);
  const normArtist = normalizeSearchText(song.artist);
  const combined1 = `${normTitle}${normArtist}`;
  const combined2 = `${normArtist}${normTitle}`;

  if (
    normTitle.includes(normQ) ||
    normArtist.includes(normQ) ||
    combined1.includes(normQ) ||
    combined2.includes(normQ)
  ) {
    return true;
  }

  const tokens = rawQuery
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/\s+/g, ''))
    .filter(Boolean);

  if (tokens.length > 1) {
    return tokens.every((tk) => normTitle.includes(tk) || normArtist.includes(tk));
  }

  return false;
}

export function getSongCompositeKey(
  song?: { title?: string; artist?: string } | null
): string {
  const t = normalizeSearchText(song?.title);
  const a = normalizeSearchText(song?.artist);
  return `${t}:::${a}`;
}

export function isSameSong(a?: SongItem | null, b?: SongItem | null): boolean {
  if (!a || !b) return false;
  if (a.repertoire_id && b.repertoire_id && a.repertoire_id === b.repertoire_id) {
    return true;
  }
  if (a.id && b.id) {
    return a.id === b.id;
  }
  return getSongCompositeKey(a) === getSongCompositeKey(b);
}

/**
 * 유튜브 검색을 위해 곡명에서 괄호 부제/영문명 (예: "(If Only)", "[Live]" 등)을 제거하고 공백을 정돈합니다.
 */
export function cleanTitleForSearch(title?: string | null): string {
  if (!title) return '';
  const cleaned = title
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || title.trim();
}

/**
 * 밴드 커버 영상 검색 URL 생성 (예: "러브홀릭 그대만 있다면 밴드커버")
 */
export function getYouTubeCoverUrl(artist: string, title: string): string {
  const cleanTitle = cleanTitleForSearch(title);
  const query = `${artist} ${cleanTitle} 밴드커버`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * 라이브 무대 검색 URL 생성 (예: "러브홀릭 그대만 있다면 live")
 */
export function getYouTubeLiveUrl(artist: string, title: string): string {
  const cleanTitle = cleanTitleForSearch(title);
  const query = `${artist} ${cleanTitle} live`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
