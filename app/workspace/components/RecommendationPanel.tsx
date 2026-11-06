'use client';

import React from 'react';
import { Search, Sparkles, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { SongItem } from '../types';

interface RecommendationPanelProps {
  isSearchActive: boolean;
  displaySongs: SongItem[];
  activeTab: string;
  loading: boolean;
  isSearching: boolean;
  onChangeTab: (tab: string) => void;
  onRefresh: () => void;
  onSelectSong: (song: SongItem) => void;
  onAddToRepertoire: (song: SongItem) => void;
  onReportSong: (song: SongItem) => void;
}

export default function RecommendationPanel({
  isSearchActive,
  displaySongs,
  activeTab,
  loading,
  isSearching,
  onChangeTab,
  onRefresh,
  onSelectSong,
  onAddToRepertoire,
  onReportSong,
}: RecommendationPanelProps) {
  return (
    <div className="bg-[#0b0e1e]/60 border border-slate-800/60 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 text-slate-200">
          {isSearchActive ? (
            <>
              <Search className="w-4 h-4 text-indigo-400" />
              검색 결과 ({displaySongs.length}곡)
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-purple-400" />
              맞춤 합주 추천 10곡
            </>
          )}
        </h2>
        {!isSearchActive && (
          <button
            type="button"
            disabled={loading}
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800/80 text-[11px] font-bold text-indigo-300 transition shadow"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        )}
      </div>

      {/* 필터 탭 바 (검색 중이 아닐 때만 노출) */}
      {!isSearchActive && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => onChangeTab('ALL')}
            className={`px-3 py-1 rounded-full border transition shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => onChangeTab('REPERTOIRE')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
              activeTab === 'REPERTOIRE'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🎸 레퍼토리 유사
          </button>
          <button
            onClick={() => onChangeTab('HIGH_TENSION')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
              activeTab === 'HIGH_TENSION'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🔥 텐션
          </button>
          <button
            onClick={() => onChangeTab('PLAYING_FEEL')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
              activeTab === 'PLAYING_FEEL'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🎛️ 손맛
          </button>
          <button
            onClick={() => onChangeTab('EMOTIONAL')}
            className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
              activeTab === 'EMOTIONAL'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🌙 감성
          </button>
        </div>
      )}

      {/* 목록 영역 */}
      {loading || isSearching ? (
        <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          {isSearching ? '음원 DB 실시간 검색 중...' : '밴드 구성 맞춤 합주곡 탐색 중...'}
        </div>
      ) : displaySongs.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500">
          {isSearchActive ? '일치하는 곡이 없습니다. 상단에서 직접 곡을 제보해 보세요!' : '추천 가능한 곡이 없습니다. 새로고침을 눌러보세요.'}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
          {displaySongs.map((song, idx) => (
            <div
              key={song.id || idx}
              onClick={() => onSelectSong(song)}
              className="p-3.5 bg-[#0d1021]/80 hover:bg-[#111429] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3 text-xs transition shadow-sm cursor-pointer group"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-100 text-sm truncate group-hover:text-indigo-300 transition">
                    {song.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
                    {song.genre || '록/밴드'}
                  </span>
                  {song.reason && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                      {song.reason}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <span>{song.artist}</span>
                  <span>•</span>
                  <span>
                    {song.original_key &&
                    song.recommended_key &&
                    song.recommended_key !== song.original_key &&
                    song.recommended_key !== '원키 유지'
                      ? `원키 ${song.original_key} → 추천 ${song.recommended_key}`
                      : song.original_key
                      ? `${song.original_key} Key`
                      : song.recommended_key || '원키 유지'}
                  </span>
                  <span>•</span>
                  <span>{song.bpm}bpm</span>
                </div>

                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title} 커버`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 transition cursor-pointer hover:underline"
                  >
                    🎯 커버 영상
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title} 라이브`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-0.5 transition cursor-pointer hover:underline"
                  >
                    📺 라이브 무대
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onAddToRepertoire(song)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" /> 담기
                </button>

                <button
                  type="button"
                  onClick={() => onReportSong(song)}
                  title="곡/음원 정보 신고"
                  className="p-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

