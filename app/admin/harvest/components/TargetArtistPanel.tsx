'use client';

import React from 'react';
import { Radio, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2, Info, X } from 'lucide-react';
import { TargetArtist } from '../types';

interface TargetArtistPanelProps {
  artists: TargetArtist[];
  isArtistPanelOpen: boolean;
  selectedArtist: string;
  refreshingId: string | null;
  updatingPriorityId: string | null;
  onTogglePanel: (open: boolean) => void;
  onOpenAddArtist: () => void;
  onSelectArtist: (artistName: string) => void;
  onOpenArtistDetail: (artist: TargetArtist) => void;
  onRefreshWithLLM: (e: React.MouseEvent, artist: TargetArtist) => void;
  onUpdatePriority: (artistId: string, newPriority: number) => void;
  onDeleteArtist: (e: React.MouseEvent, artist: TargetArtist) => void;
}

export default function TargetArtistPanel({
  artists,
  isArtistPanelOpen,
  selectedArtist,
  refreshingId,
  updatingPriorityId,
  onTogglePanel,
  onOpenAddArtist,
  onSelectArtist,
  onOpenArtistDetail,
  onRefreshWithLLM,
  onUpdatePriority,
  onDeleteArtist,
}: TargetArtistPanelProps) {
  if (!isArtistPanelOpen) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => onTogglePanel(true)}
          title="밴드 목록 펼치기"
          className="w-full flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 text-xs font-bold transition"
        >
          <ChevronRight className="w-4 h-4" />
          <span>밴드 목록 펼치기 ({artists.length})</span>
        </button>
        {selectedArtist !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectArtist('ALL')}
            title="밴드 필터 해제"
            className="text-[10px] flex items-center justify-center gap-1 px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-800 text-center transition"
          >
            <span>필터: {selectedArtist}</span>
            <X className="w-3 h-3 text-indigo-400" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200">
            <Radio className="w-4 h-4 text-indigo-400" /> 수집 대상 밴드 ({artists.length}팀)
          </h2>
          <button
            type="button"
            onClick={() => onTogglePanel(false)}
            title="밴드 목록 접기"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenAddArtist}
            className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow"
          >
            <Plus className="w-3 h-3" /> 밴드 추가
          </button>

          <button
            onClick={() => onSelectArtist('ALL')}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
              selectedArtist === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'text-slate-400 border-slate-800'
            }`}
          >
            전체
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
        {artists
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((artist) => {
            const isSelected = selectedArtist === artist.name;
            const isAnalyzing = refreshingId === artist.id;
            const isUpdatingPriority = updatingPriorityId === artist.id;

            return (
              <div
                key={artist.id}
                onClick={() => onSelectArtist(isSelected ? 'ALL' : artist.name)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between group ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-700 text-indigo-200'
                    : artist.priority === 3
                    ? 'bg-slate-950/30 border-slate-900 text-slate-400'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold block truncate ${artist.priority === 3 ? 'text-slate-400' : 'text-slate-200'}`}>
                      {artist.name}
                    </span>
                    {artist.search_alias && artist.search_alias !== artist.name && (
                      <span className="text-[10px] text-indigo-400/80 truncate">
                        ({artist.search_alias})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {artist.last_harvested_at
                      ? `최근 수집: ${new Date(artist.last_harvested_at).toLocaleDateString()}`
                      : '수집 대기 중'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onOpenArtistDetail(artist)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition shadow-sm"
                    title={`'${artist.name}' 밴드 상세 정보 보기 및 수정`}
                  >
                    <Info className="w-3 h-3 text-indigo-400" />
                    <span>정보</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={(e) => onRefreshWithLLM(e, artist)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-300 text-[10px] font-semibold transition disabled:opacity-50 shadow-sm"
                    title="LLM으로 검색 키워드(search_alias) 및 보컬 성별 분석"
                  >
                    <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzing ? '분석 중...' : 'LLM 분석'}</span>
                  </button>

                  <select
                    value={artist.priority}
                    disabled={isUpdatingPriority}
                    onChange={(e) => onUpdatePriority(artist.id, Number(e.target.value))}
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold outline-none cursor-pointer transition ${
                      artist.priority === 1
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-800 hover:bg-indigo-900'
                        : artist.priority === 2
                        ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                    } disabled:opacity-50`}
                  >
                    <option value={1} className="bg-slate-900 text-indigo-300">
                      1순위 (최우선)
                    </option>
                    <option value={2} className="bg-slate-900 text-slate-300">
                      2순위 (일반)
                    </option>
                    <option value={3} className="bg-slate-900 text-emerald-300">
                      3순위 (수집완료)
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={(e) => onDeleteArtist(e, artist)}
                    title={`'${artist.name}' 수집 대상에서 삭제`}
                    className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/80 transition shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

