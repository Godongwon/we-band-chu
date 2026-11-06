// app/workspace/types.ts
export type RepertoireStatus =
  | 'WISHLIST'
  | 'PRACTICING'
  | 'ENSEMBLE'
  | 'COMPLETED'
  | 'PERFORMED'
  | 'VIDEO_COMPLETED';

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
