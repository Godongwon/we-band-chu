'use client';

import React, { useMemo } from 'react';
import {
  Radio,
  ChevronUp,
  ChevronDown,
  Plus,
  Sparkles,
  Trash2,
  Info,
  X,
  Search,
  ShieldAlert,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import {
  TargetArtist,
  ArtistAuditResult,
  ArtistFilterMode,
} from '../types';
import { normalizeArtistSearch } from '@/lib/artistAudit';

interface TargetArtistPanelProps {
  artists: TargetArtist[];
  auditMap: Map<string, ArtistAuditResult>;
  isArtistPanelOpen: boolean;
  selectedArtist: string;
  searchArtistQuery: string;
  artistFilterMode: ArtistFilterMode;
  selectedArtistIds: Set<string>;
  isAuditingAI: boolean;
  isDeletingBulkArtists: boolean;
  refreshingId: string | null;
  isRefreshingAllLLM: boolean;
  refreshAllLLMProgress: { current: number; total: number } | null;
  updatingPriorityId: string | null;
  onTogglePanel: (open: boolean) => void;
  onChangeSearchArtistQuery: (val: string) => void;
  onChangeArtistFilterMode: (mode: ArtistFilterMode) => void;
  onToggleArtistSelection: (artistId: string) => void;
  onToggleSelectAllArtists: (currentList: TargetArtist[]) => void;
  onDeleteSelectedArtists: () => void;
  onRunAIAudit: () => void;
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
  auditMap,
  isArtistPanelOpen,
  selectedArtist,
  searchArtistQuery,
  artistFilterMode,
  selectedArtistIds,
  isAuditingAI,
  isDeletingBulkArtists,
  refreshingId,
  isRefreshingAllLLM,
  refreshAllLLMProgress,
  updatingPriorityId,
  onTogglePanel,
  onChangeSearchArtistQuery,
  onChangeArtistFilterMode,
  onToggleArtistSelection,
  onToggleSelectAllArtists,
  onDeleteSelectedArtists,
  onRunAIAudit,
  onOpenAddArtist,
  onSelectArtist,
  onOpenArtistDetail,
  onRefreshWithLLM,
  onRefreshAllWithLLM,
  onUpdatePriority,
  onDeleteArtist,
}: TargetArtistPanelProps) {
  // 카테고리별 카운트 집계
  const counts = useMemo(() => {
    let needsReview = 0;
    let nonBand = 0;
    let aliasError = 0;
    let duplicate = 0;
    let zeroSongs = 0;
    let p1 = 0;
    let p2 = 0;
    let p3 = 0;

    for (const a of artists) {
      if (a.priority === 1) p1++;
      else if (a.priority === 2) p2++;
      else if (a.priority === 3) p3++;

      const audit = auditMap.get(a.id);
      if (audit && audit.types.length > 0) {
        needsReview++;
        if (audit.types.includes('NON_BAND')) nonBand++;
        if (audit.types.includes('ALIAS_ERROR')) aliasError++;
        if (audit.types.includes('DUPLICATE')) duplicate++;
        if (audit.types.includes('ZERO_SONGS')) zeroSongs++;
      }
    }

    return { needsReview, nonBand, aliasError, duplicate, zeroSongs, p1, p2, p3 };
  }, [artists, auditMap]);

  // 공백·대소문자 무시 검색 + 필터 모드 적용
  const filteredArtists = useMemo(() => {
    const normQ = normalizeArtistSearch(searchArtistQuery);

    return artists
      .filter((a) => {
        // 1) 검색어 필터 (공백 및 대소문자 무시)
        if (normQ) {
          const normName = normalizeArtistSearch(a.name);
          const normAlias = normalizeArtistSearch(a.search_alias);
          const combined = `${normName}${normAlias}`;
          const audit = auditMap.get(a.id);
          const normReasons = normalizeArtistSearch(audit?.reasons.join(' '));
          if (
            !normName.includes(normQ) &&
            !normAlias.includes(normQ) &&
            !combined.includes(normQ) &&
            !normReasons.includes(normQ)
          ) {
            return false;
          }
        }

        // 2) 검사/우선순위 필터 모드
        const audit = auditMap.get(a.id);
        const types = audit?.types || [];

        switch (artistFilterMode) {
          case 'NEEDS_REVIEW':
            return types.length > 0;
          case 'NON_BAND':
            return types.includes('NON_BAND');
          case 'ALIAS_ERROR':
            return types.includes('ALIAS_ERROR');
          case 'DUPLICATE':
            return types.includes('DUPLICATE');
          case 'ZERO_SONGS':
            return types.includes('ZERO_SONGS');
          case 'PRIORITY_1':
            return a.priority === 1;
          case 'PRIORITY_2':
            return a.priority === 2;
          case 'PRIORITY_3':
            return a.priority === 3;
          case 'ALL':
          default:
            return true;
        }
      })
      .sort((a, b) => a.priority - b.priority);
  }, [artists, auditMap, searchArtistQuery, artistFilterMode]);

  const isAllFilteredSelected =
    filteredArtists.length > 0 &&
    filteredArtists.every((a) => selectedArtistIds.has(a.id));

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 transition-all">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/60 pb-3">
        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200 whitespace-nowrap">
              <Radio className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                수집 대상 밴드 ({filteredArtists.length}/{artists.length}팀)
              </span>
            </h2>

            {counts.needsReview > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!isArtistPanelOpen) onTogglePanel(true);
                  onChangeArtistFilterMode(
                    artistFilterMode === 'NEEDS_REVIEW' ? 'ALL' : 'NEEDS_REVIEW'
                  );
                }}
                title="비밴드 의심·별칭 불일치·중복 등 검사가 필요한 밴드 목록만 필터링"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold transition shadow-sm ${
                  artistFilterMode === 'NEEDS_REVIEW'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border-amber-700/80'
                }`}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>검사 필요 {counts.needsReview}팀</span>
              </button>
            )}

            {selectedArtist !== 'ALL' && (
              <button
                type="button"
                onClick={() => onSelectArtist('ALL')}
                title="선택된 밴드 필터 해제"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/80 text-[11px] font-bold transition shadow-sm"
              >
                <span>곡 필터: {selectedArtist}</span>
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
          {selectedArtistIds.size > 0 && (
            <button
              type="button"
              disabled={isDeletingBulkArtists}
              onClick={onDeleteSelectedArtists}
              className="text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isDeletingBulkArtists
                  ? '일괄 삭제 중...'
                  : `선택 밴드 삭제 (${selectedArtistIds.size}팀)`}
              </span>
            </button>
          )}

          <button
            type="button"
            disabled={isAuditingAI || artists.length === 0}
            onClick={() => {
              if (!isArtistPanelOpen) onTogglePanel(true);
              onRunAIAudit();
            }}
            title="AI(LLM)로 비밴드(힙합·아이돌·R&B) 및 이름/별칭 오매칭 아티스트를 정밀 검사합니다"
            className="text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-300 font-semibold transition shadow disabled:opacity-50"
          >
            <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${isAuditingAI ? 'animate-pulse' : ''}`} />
            <span>{isAuditingAI ? 'AI 정밀 검사 중...' : 'AI 비밴드/오류 검사'}</span>
          </button>

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
        </div>
      </div>

      {isArtistPanelOpen ? (
        <div className="space-y-3">
          {/* 검색창 + 전체선택 툴바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchArtistQuery}
                onChange={(e) => onChangeSearchArtistQuery(e.target.value)}
                placeholder="수집 대상 밴드명·영문 별칭·검사 사유 검색 (공백·대소문자 무시, 예: 타이거jk, cravity)..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition"
              />
              {searchArtistQuery && (
                <button
                  type="button"
                  onClick={() => onChangeSearchArtistQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onToggleSelectAllArtists(filteredArtists)}
                className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold transition"
              >
                {isAllFilteredSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>
                  {isAllFilteredSelected
                    ? `현재 목록 선택 해제 (${filteredArtists.length})`
                    : `현재 목록 전체 선택 (${filteredArtists.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* 검사 필요 항목 & 우선순위 필터 탭 */}
          <div className="flex flex-col gap-1.5">
            {/* 1행: 전체 + 검사 필요 상태 필터 칩 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('ALL')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition ${
                  artistFilterMode === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                전체 ({artists.length})
              </button>

              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('NEEDS_REVIEW')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition flex items-center gap-1 ${
                  artistFilterMode === 'NEEDS_REVIEW'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/70 hover:bg-amber-900/70'
                }`}
              >
                <span>🚨 검사 필요 전체 ({counts.needsReview})</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('NON_BAND')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition ${
                  artistFilterMode === 'NON_BAND'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-rose-950/50 text-rose-300 border-rose-800/70 hover:bg-rose-900/60'
                }`}
              >
                🎤 비밴드 의심 ({counts.nonBand})
              </button>

              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('ALIAS_ERROR')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition ${
                  artistFilterMode === 'ALIAS_ERROR'
                    ? 'bg-orange-500 text-slate-950 border-orange-400'
                    : 'bg-orange-950/50 text-orange-300 border-orange-800/70 hover:bg-orange-900/60'
                }`}
              >
                🔤 이름/별칭 오류 ({counts.aliasError})
              </button>

              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('DUPLICATE')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition ${
                  artistFilterMode === 'DUPLICATE'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-purple-950/50 text-purple-300 border-purple-800/70 hover:bg-purple-900/60'
                }`}
              >
                👯 중복 등록 ({counts.duplicate})
              </button>

              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('ZERO_SONGS')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition ${
                  artistFilterMode === 'ZERO_SONGS'
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'bg-cyan-950/50 text-cyan-300 border-cyan-800/70 hover:bg-cyan-900/60'
                }`}
              >
                📭 수집 후 0곡 ({counts.zeroSongs})
              </button>
            </div>

            {/* 2행: 수집 우선순위 필터 칩 (1순위 / 2순위 / 3순위가 줄바꿈 없이 나란히 정렬) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">우선순위:</span>
              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('PRIORITY_1')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  artistFilterMode === 'PRIORITY_1'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                1순위 ({counts.p1})
              </button>

              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('PRIORITY_2')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  artistFilterMode === 'PRIORITY_2'
                    ? 'bg-slate-900 text-slate-200 border-slate-700'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                2순위 ({counts.p2})
              </button>

              <button
                type="button"
                onClick={() => onChangeArtistFilterMode('PRIORITY_3')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  artistFilterMode === 'PRIORITY_3'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                3순위 ({counts.p3})
              </button>
            </div>
          </div>

          {/* 아티스트 리스트 */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredArtists.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                조건에 해당하는 수집 대상 밴드가 없습니다.
              </div>
            ) : (
              filteredArtists.map((artist) => {
                const isSelected = selectedArtist === artist.name;
                const isChecked = selectedArtistIds.has(artist.id);
                const isAnalyzing = refreshingId === artist.id;
                const isUpdatingPriority = updatingPriorityId === artist.id;
                const audit = auditMap.get(artist.id);
                const hasIssue = (audit?.types.length || 0) > 0;

                return (
                  <div
                    key={artist.id}
                    onClick={() => onSelectArtist(isSelected ? 'ALL' : artist.name)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group ${
                      isChecked
                        ? 'bg-rose-950/30 border-rose-600/80 text-slate-100'
                        : isSelected
                        ? 'bg-indigo-950/70 border-indigo-600 text-indigo-200 shadow-sm'
                        : hasIssue
                        ? 'bg-amber-950/20 border-amber-800/60 hover:border-amber-600 text-slate-200'
                        : artist.priority === 3
                        ? 'bg-slate-950/30 border-slate-900 text-slate-400'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    {/* 좌측: 체크박스 + 밴드명 + (영문 검색 별칭) + 검사 배지 */}
                    <div className="min-w-0 flex-1 flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleArtistSelection(artist.id);
                        }}
                        className="mt-0.5 text-slate-400 hover:text-indigo-400 shrink-0"
                        title="일괄 삭제/관리를 위해 선택"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-bold text-[13px] leading-snug break-keep ${
                              artist.priority === 3 && !hasIssue ? 'text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {artist.name}
                          </span>
                          {artist.search_alias && (
                            <span className="text-xs text-indigo-400/90 font-medium break-keep">
                              ({artist.search_alias})
                            </span>
                          )}

                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-semibold">
                            수집곡 {audit?.songCount || 0}곡
                          </span>

                          {audit?.types.includes('NON_BAND') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-950/90 border border-rose-700/80 text-rose-300 font-bold">
                              🎤 비밴드 의심
                            </span>
                          )}
                          {audit?.types.includes('ALIAS_ERROR') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-950/90 border border-orange-700/80 text-orange-300 font-bold">
                              🔤 별칭/이름 오류
                            </span>
                          )}
                          {audit?.types.includes('DUPLICATE') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-950/90 border border-purple-700/80 text-purple-300 font-bold">
                              👯 중복 등록
                            </span>
                          )}
                          {audit?.types.includes('ZERO_SONGS') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-700/80 text-cyan-300 font-bold">
                              📭 수집 후 0곡
                            </span>
                          )}
                        </div>

                        {hasIssue && audit?.reasons && audit.reasons.length > 0 && (
                          <div className="text-[11px] text-amber-300/95 font-medium flex flex-wrap gap-x-2 gap-y-0.5">
                            {audit.reasons.map((reason, idx) => (
                              <span key={idx}>• {reason}</span>
                            ))}
                          </div>
                        )}

                        <span className="text-[11px] text-slate-500 block">
                          {artist.last_harvested_at
                            ? `최근 수집: ${new Date(artist.last_harvested_at).toLocaleDateString()}`
                            : '수집 대기 중'}
                        </span>
                      </div>
                    </div>

                    {/* 우측: 액션 버튼 그룹 (정보 / LLM 분석 / 우선순위 / 삭제) */}
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
              })
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => onTogglePanel(true)}
          className="py-3 px-4 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 cursor-pointer transition flex items-center justify-center gap-1.5"
        >
          <span>
            밴드 목록이 접혀 있습니다. 클릭하여 펼치기 ({artists.length}팀 / 검사 필요{' '}
            <strong className="text-amber-300">{counts.needsReview}팀</strong>)
          </span>
          <ChevronDown className="w-4 h-4 text-indigo-400" />
        </div>
      )}
    </div>
  );
}
