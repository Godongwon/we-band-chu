'use client';

import React from 'react';
import {
  LogOut,
  Users,
  Settings2,
  Sparkles,
  Search,
  X,
  RefreshCw,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { BandProfile, SongItem } from '../types';

interface WorkspaceToolbarProps {
  bandProfile: BandProfile;
  searchQuery: string;
  searchResults?: SongItem[];
  isSearching?: boolean;
  onSearchQueryChange: (val: string) => void;
  onSelectSong?: (song: SongItem) => void;
  onAddToRepertoire?: (song: SongItem) => void;
  onReportSong?: (song: SongItem) => void;
  onLogout: () => void;
  onOpenEditProfile: () => void;
  onOpenSuggest: () => void;
}

export default function WorkspaceToolbar({
  bandProfile,
  searchQuery,
  searchResults = [],
  isSearching = false,
  onSearchQueryChange,
  onSelectSong,
  onAddToRepertoire,
  onReportSong,
  onLogout,
  onOpenEditProfile,
  onOpenSuggest,
}: WorkspaceToolbarProps) {
  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <>
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-900">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              We.Band.Chu
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              우밴추
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400 tracking-tight pl-0.5">
            우리 밴드의 노래추천
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          title="밴드 로그아웃"
          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition flex items-center gap-1 text-xs"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px]">로그아웃</span>
        </button>
      </header>

      {/* 밴드 프로필 & 액션 툴바 */}
      <div className="bg-[#0b0e20]/80 border border-slate-800/80 rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-800/80 text-indigo-200 font-bold">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{bandProfile.name}</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            {bandProfile.vocal_gender === 'FEMALE' ? '여성 보컬' : '남성 보컬'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            {bandProfile.guitar_count}기타
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            {bandProfile.has_keys ? '건반 O' : '건반 X'}
          </span>

          <button
            type="button"
            onClick={onOpenEditProfile}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-indigo-500 hover:bg-slate-800 transition flex items-center gap-1"
          >
            <Settings2 className="w-3 h-3 text-indigo-400" />
            <span>구성 수정</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSuggest}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition shadow"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>곡 제보하기</span>
        </button>
      </div>

      {/* 곡 검색창 + 검색창 바로 아래 실시간 검색 결과 패널 */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="곡명 또는 아티스트 입력 시 정식 음원이 실시간 검색됩니다 (예: 고민중독, 한로로, 윤하, QWER, DAY6...)"
            className="w-full bg-[#0d1021] border border-slate-800/80 rounded-2xl pl-11 pr-10 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              title="검색어 지우기"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 검색어 입력 시 검색창 바로 밑에 펼쳐지는 검색 결과 영역 */}
        {isSearchActive && (
          <div className="bg-[#0b0e1e]/95 border border-indigo-800/70 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-200">
                <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  &lsquo;{searchQuery.trim()}&rsquo; 검색 결과 ({searchResults.length}곡)
                </span>
              </h3>
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:text-white font-semibold transition"
              >
                <span>검색 닫기</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {isSearching ? (
              <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>음원 DB 실시간 검색 중...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-3">
                <p>일치하는 곡이 없습니다. 찾으시는 곡을 직접 제보해 보세요!</p>
                <button
                  type="button"
                  onClick={onOpenSuggest}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>&lsquo;{searchQuery.trim()}&rsquo; 곡 제보하기</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {searchResults.map((song, idx) => (
                  <div
                    key={song.id || idx}
                    onClick={() => onSelectSong && onSelectSong(song)}
                    className="p-3 bg-[#0d1021]/90 hover:bg-[#131731] border border-slate-800/80 hover:border-indigo-700/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs transition shadow-sm cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-[13px] sm:text-sm break-keep group-hover:text-indigo-300 transition">
                          {song.title}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          {song.genre || '록/밴드'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-slate-300">{song.artist}</span>
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

                      <div className="flex items-center gap-3 pt-0.5 text-[11px]">
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                            `${song.artist} ${song.title} 커버`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 transition cursor-pointer hover:underline"
                        >
                          🎯 커버 영상
                        </a>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                            `${song.artist} ${song.title} 라이브`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-0.5 transition cursor-pointer hover:underline"
                        >
                          📺 라이브 무대
                        </a>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-end gap-1.5 shrink-0 pt-1.5 sm:pt-0 border-t border-slate-800/50 sm:border-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onAddToRepertoire && (
                        <button
                          type="button"
                          onClick={() => onAddToRepertoire(song)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
                        >
                          <Plus className="w-3.5 h-3.5" /> 담기
                        </button>
                      )}

                      {onReportSong && (
                        <button
                          type="button"
                          onClick={() => onReportSong(song)}
                          title="곡/음원 정보 신고"
                          className="p-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
