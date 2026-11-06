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

export function getSongCompositeKey(
  song?: { title?: string; artist?: string } | null
): string {
  const t = (song?.title || '').toLowerCase().trim();
  const a = (song?.artist || '').toLowerCase().trim();
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
