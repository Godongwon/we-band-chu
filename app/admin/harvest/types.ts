// app/admin/harvest/types.ts
export type ArtistAuditIssueType = 'NON_BAND' | 'ALIAS_ERROR' | 'DUPLICATE' | 'ZERO_SONGS';

export interface ArtistAuditResult {
  artistId: string;
  types: ArtistAuditIssueType[];
  reasons: string[];
  songCount: number;
}

export type ArtistFilterMode =
  | 'ALL'
  | 'NEEDS_REVIEW'
  | 'NON_BAND'
  | 'ALIAS_ERROR'
  | 'DUPLICATE'
  | 'ZERO_SONGS'
  | 'PRIORITY_1'
  | 'PRIORITY_2'
  | 'PRIORITY_3';

export interface TargetArtist {
  id: string;
  name: string;
  search_alias: string | null;
  vocal_gender?: 'FEMALE' | 'MALE' | 'COED' | string | null;
  has_keys?: boolean | null;
  priority: number;
  is_active: boolean;
  last_harvested_at: string | null;
  created_at?: string | null;
}

export interface SongItem {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  bpm: number | null;
  original_key: string | null;
  youtube_url: string | null;
  created_at: string;
}

export interface ReportedSong {
  report_id: string;
  song_id: string;
  title: string;
  artist: string;
  reason: string;
  created_at: string;
  youtube_url: string | null;
  genre: string;
  bpm: number | null;
  original_key: string | null;
}

export interface SuggestionSong {
  id: string;
  title: string;
  artist: string;
  band_name: string;
  youtube_url: string | null;
  created_at: string;
}

export interface HarvestStats {
  totalSongs: number;
  totalArtists: number;
  activeArtists: number;
  analyzedBpmCount: number;
  analyzedKeyCount: number;
  bpmRate: number;
  keyRate: number;
  lastExecution: {
    artist: string;
    count: number;
    time: string;
  } | null;
}
