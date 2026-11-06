// app/workspace/types.ts
export interface SongItem {
  id?: string;
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

