'use client';

import React from 'react';
import { Radio, ChevronUp, ChevronDown, Plus, Sparkles, Trash2, Info, X } from 'lucide-react';
import { TargetArtist } from '../types';

interface TargetArtistPanelProps {
  artists: TargetArtist[];
  isArtistPanelOpen: boolean;
  selectedArtist: string;
  refreshingId: string | null;
  isRefreshingAllLLM: boolean;
  refreshAllLLMProgress: { current: number; total: number } | null;
  updatingPriorityId: string | null;
  onTogglePanel: (open: boolean) => void;
  onOpenAddArtist: () => void;
  onSelectArtist: (artistName: string) => void;
  onOpenArtistDetail: (artist: TargetArtist) => void;
  onRefreshWithLLM: (e: React.MouseEvent, artist: TargetArtist) => void;
  onRefreshAllWithLLM: () => void;
  onUpdatePriority: (artistId: string, newPriority: number) => void;
  onDeleteArtist: (e: React.MouseEvent, artist: TargetArtist) => void;
}

export default function TargetArtistPanel({
  artists,
  isArtistPanelOpen,
  selectedArtist,
  refreshingId,
  isRefreshingAllLLM,
  refreshAllLLMProgress,
  updatingPriorityId,
  onTogglePanel,
  onOpenAddArtist,
  onSelectArtist,
  onOpenArtistDetail,
  onRefreshWithLLM,
  onRefreshAllWithLLM,
  onUpdatePriority,
  onDeleteArtist,
}: TargetArtistPanelProps) {
  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 transition-all">
      {/* 상단 헤더: 좌측(제목 + 필터 해제 + 접기/펼치기), 우측(전체 LLM 분석 + 밴드 추가 + 전체 버튼) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/60 pb-3">
        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200 whitespace-nowrap">
              <Radio className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>수집 대상 밴드 ({artists.length}팀)</span>
            </h2>

            {selectedArtist !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectArtist('ALL')}
                title="선택된 밴드 필터 해제"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/80 text-[11px] font-bold transition shadow-sm"
              >
                <span>필터: {selectedArtist}</span>
                <X className="w-3 h-3 text-indigo-400 hover:text-rose-300" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onTogglePanel(!isArtistPanelOpen)}
              title={isArtistPanelOpen ? '밴드 목록 접기' : '밴드 목록 펼치기'}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              {isArtistPanelOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={isRefreshingAllLLM || artists.length === 0}
            onClick={onRefreshAllWithLLM}
            title="모든 수집 대상 밴드의 검색 키워드(search_alias) 및 보컬 성별을 LLM으로 일괄 분석"
            className="text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 font-semibold transition shadow disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isRefreshingAllLLM ? 'animate-spin' : ''}`} />
            <span>
              {isRefreshingAllLLM && refreshAllLLMProgress
                ? `전체 분석 중 (${refreshAllLLMProgress.current}/${refreshAllLLMProgress.total})`
                : '전체 LLM 분석'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAddArtist}
            className="text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>밴드 추가</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectArtist('ALL')}
            className={`text-xs px-2.5 py-1 rounded-xl border font-semibold transition ${
              selectedArtist === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            전체
          </button>
        </div>
      </div>

      {isArtistPanelOpen ? (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
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
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-600 text-indigo-200 shadow-sm'
                      : artist.priority === 3
                      ? 'bg-slate-950/30 border-slate-900 text-slate-400'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  {/* 좌측(PC) / 상단(모바일): 밴드명 + (영문 검색 별칭) 풀네임 + 최근 수집 상태 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className={`font-bold text-[13px] leading-snug break-keep ${
                          artist.priority === 3 ? 'text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {artist.name}
                      </span>
                      {artist.search_alias && (
                        <span className="text-xs text-indigo-400/90 font-medium break-keep">
                          ({artist.search_alias})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {artist.last_harvested_at
                        ? `최근 수집: ${new Date(artist.last_harvested_at).toLocaleDateString()}`
                        : '수집 대기 중'}
                    </span>
                  </div>

                  {/* 우측(PC) / 하단(모바일): 액션 버튼 그룹 (정보 / LLM 분석 / 우선순위 / 삭제) */}
                  <div
                    className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-slate-800/50 sm:border-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenArtistDetail(artist)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition shadow-sm whitespace-nowrap"
                        title={`'${artist.name}' 밴드 상세 정보 보기 및 수정`}
                      >
                        <Info className="w-3 h-3 text-indigo-400" />
                        <span>정보</span>
                      </button>

                      <button
                        type="button"
                        disabled={isAnalyzing}
                        onClick={(e) => onRefreshWithLLM(e, artist)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-300 text-[11px] font-semibold transition disabled:opacity-50 shadow-sm whitespace-nowrap"
                        title="LLM으로 검색 키워드(search_alias) 및 보컬 성별 분석"
                      >
                        <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        <span>{isAnalyzing ? '분석 중...' : 'LLM 분석'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={artist.priority}
                        disabled={isUpdatingPriority}
                        onChange={(e) => onUpdatePriority(artist.id, Number(e.target.value))}
                        className={`text-[11px] px-2 py-1 rounded-lg border font-semibold outline-none cursor-pointer transition ${
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
                </div>
              );
            })}
        </div>
      ) : (
        <div
          onClick={() => onTogglePanel(true)}
          className="py-3 px-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 cursor-pointer transition flex items-center justify-center gap-1.5"
        >
          <span>밴드 목록이 접혀 있습니다. 클릭하여 펼치기 ({artists.length}팀)</span>
          <ChevronDown className="w-4 h-4 text-indigo-400" />
        </div>
      )}
    </div>
  );
}
