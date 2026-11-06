'use client';

import React from 'react';
import { LogOut, Users, Settings2, Sparkles, Search, X } from 'lucide-react';
import { BandProfile } from '../types';

interface WorkspaceToolbarProps {
  bandProfile: BandProfile;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onLogout: () => void;
  onOpenEditProfile: () => void;
  onOpenSuggest: () => void;
}

export default function WorkspaceToolbar({
  bandProfile,
  searchQuery,
  onSearchQueryChange,
  onLogout,
  onOpenEditProfile,
  onOpenSuggest,
}: WorkspaceToolbarProps) {
  return (
    <>
      {/* 상단 헤더 */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            We.Band.Chu
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
            우밴추
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

      {/* 곡 검색창 */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="곡명 또는 아티스트 입력 시 정식 음원이 실시간 검색됩니다 (예: 한로로, 윤하, QWER, DAY6, 실리카겔...)"
          className="w-full bg-[#0d1021] border border-slate-800/80 rounded-2xl pl-11 pr-10 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchQueryChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );
}

