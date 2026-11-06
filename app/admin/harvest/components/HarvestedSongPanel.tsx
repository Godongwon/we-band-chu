'use client';

import React from 'react';
import {
  Music2,
  ChevronUp,
  ChevronDown,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Play,
  ExternalLink,
} from 'lucide-react';
import { SongItem } from '../types';

interface HarvestedSongPanelProps {
  isArtistPanelOpen: boolean;
  isSongPanelOpen: boolean;
  filteredSongs: SongItem[];
  selectedArtist: string;
  selectedSongIds: Set<string>;
  isDeletingSelected: boolean;
  loading: boolean;
  searchSongQuery: string;
  onToggleSongPanel: () => void;
  onDeleteSelectedSongs: () => void;
  onToggleSelectAll: () => void;
  onChangeSearchQuery: (val: string) => void;
  onToggleSongSelection: (songId: string) => void;
  onDeleteSong: (e: React.MouseEvent, song: SongItem) => void;
}

export default function HarvestedSongPanel({
  isArtistPanelOpen,
  isSongPanelOpen,
  filteredSongs,
  selectedArtist,
  selectedSongIds,
  isDeletingSelected,
  loading,
  searchSongQuery,
  onToggleSongPanel,
  onDeleteSelectedSongs,
  onToggleSelectAll,
  onChangeSearchQuery,
  onToggleSongSelection,
  onDeleteSong,
}: HarvestedSongPanelProps) {
  const isAllSelected = filteredSongs.length > 0 && selectedSongIds.size === filteredSongs.length;

  return (
    <div
      className={`${
        isArtistPanelOpen ? 'lg:col-span-2' : 'lg:col-span-3'
      } bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 transition-all`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200">
              <Music2 className="w-4 h-4 text-purple-400" />
              수집 음원 ({filteredSongs.length}곡)
              {selectedArtist !== 'ALL' && (
                <span className="text-indigo-400 text-xs">({selectedArtist})</span>
              )}
            </h2>
            <button
              type="button"
              onClick={onToggleSongPanel}
              title={isSongPanelOpen ? '음원 목록 접기' : '음원 목록 펼치기'}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              {isSongPanelOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {isSongPanelOpen && selectedSongIds.size > 0 && (
            <button
              type="button"
              disabled={isDeletingSelected}
              onClick={onDeleteSelectedSongs}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {selectedSongIds.size}개 선택 삭제
            </button>
          )}
        </div>

        {isSongPanelOpen && (
          <div className="flex items-center gap-2">
            {filteredSongs.length > 0 && (
              <button
                type="button"
                onClick={onToggleSelectAll}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg transition"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                전체선택
              </button>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSongQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                placeholder="곡명 또는 밴드 검색..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
              />
            </div>
          </div>
        )}
      </div>

      {isSongPanelOpen ? (
        loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">음원 데이터 로드 중...</div>
        ) : filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">조건에 맞는 음원이 없습니다.</div>
        ) : (
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredSongs.map((song) => {
              const isChecked = selectedSongIds.has(song.id);
              const youtubeTargetUrl =
                song.youtube_url ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(
                  `${song.artist} ${song.title}`
                )}`;

              return (
                <div
                  key={song.id}
                  onClick={() => onToggleSongSelection(song.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition ${
                    isChecked
                      ? 'bg-indigo-950/40 border-indigo-600/80'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="shrink-0 text-slate-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSongSelection(song.id);
                      }}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200 truncate">{song.title}</span>
                        <span className="text-slate-400">({song.artist})</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>{song.genre || '장르 미지정'}</span>
                        <span>•</span>
                        <span>{new Date(song.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        song.bpm
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {song.bpm ? `${song.bpm} BPM` : 'BPM 대기'}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        song.original_key
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {song.original_key ? `${song.original_key} Key` : 'Key 미산출'}
                    </span>

                    <a
                      href={youtubeTargetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`YouTube에서 '${song.artist} ${song.title}' 듣기/확인`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-rose-100 text-[11px] font-semibold transition shadow-sm"
                    >
                      <Play className="w-3 h-3 fill-rose-300 text-rose-300" />
                      <span>YouTube</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                    </a>

                    <button
                      type="button"
                      onClick={(e) => onDeleteSong(e, song)}
                      title={`'${song.title}' 곡 삭제`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-900/60 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div
          onClick={onToggleSongPanel}
          className="py-3 px-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 cursor-pointer transition flex items-center justify-center gap-1.5"
        >
          <span>음원 목록이 접혀 있습니다. 클릭하여 펼치기 ({filteredSongs.length}곡)</span>
          <ChevronDown className="w-4 h-4 text-purple-400" />
        </div>
      )}
    </div>
  );
}

