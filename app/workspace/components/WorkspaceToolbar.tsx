'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  Check,
  Bot,
} from 'lucide-react';
import { BandProfile, SongItem, getSongCompositeKey } from '../types';
import { REPERTOIRE_STATUS_OPTIONS } from './RepertoirePanel';

interface WorkspaceToolbarProps {
  bandProfile: BandProfile;
  repertoire?: SongItem[];
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
  repertoire = [],
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

  // AI 밴드평가 상태 (로컬 스토리지 캐싱 + 비동기 LLM 생성)
  const [bandEvaluation, setBandEvaluation] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const lastEvalKeyRef = useRef<string>('');

  const evalStorageKey = useMemo(() => {
    const repTitles = repertoire.map((r) => r.title).sort().join(',');
    return `eval_${bandProfile.name}_${bandProfile.vocal_gender}_${bandProfile.guitar_count}_${bandProfile.has_keys}_${repTitles}`;
  }, [bandProfile, repertoire]);

  const fetchBandEvaluation = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem(evalStorageKey);
      if (cached) {
        setBandEvaluation(cached);
        return;
      }
    }

    if (lastEvalKeyRef.current === evalStorageKey && !force) return;
    lastEvalKeyRef.current = evalStorageKey;

    setIsEvaluating(true);
    try {
      const res = await fetch('/api/band/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandProfile,
          repertoire,
        }),
      });
      const data = await res.json();
      if (res.ok && data.evaluation) {
        setBandEvaluation(data.evaluation);
        localStorage.setItem(evalStorageKey, data.evaluation);
      }
    } catch (e) {
      console.error('[AI 밴드평가 생성 오류]:', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    if (bandProfile?.name) {
      fetchBandEvaluation(false);
    }
  }, [evalStorageKey]);

  // 레퍼토리에 담긴 곡 빠른 조회 맵 (고유 id 및 '제목:::아티스트' 복합키 기준 - 동명이곡 오매칭 원천 차단)
  const repertoireLookup = useMemo(() => {
    const byId = new Map<string, SongItem>();
    const byTitleArtist = new Map<string, SongItem>();
    for (const item of repertoire) {
      if (item.id) byId.set(item.id, item);
      if (item.title) byTitleArtist.set(getSongCompositeKey(item), item);
    }
    return { byId, byTitleArtist };
  }, [repertoire]);

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
      <div className="bg-[#0b0e20]/80 border border-slate-800/80 rounded-2xl p-3 sm:px-4 sm:py-3 space-y-2.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-800/80 text-indigo-200 font-bold">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{bandProfile.name}</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              {bandProfile.vocal_gender === 'FEMALE'
                ? '여성 보컬'
                : bandProfile.vocal_gender === 'COED'
                ? '혼성 보컬'
                : '남성 보컬'}
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

        {/* AI의 밴드평가 (요청하신 사진 하단 위치) */}
        <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-xs">
          <div className="flex items-center gap-1 shrink-0 text-indigo-400 font-bold bg-indigo-950/70 border border-indigo-800/70 px-2 py-0.5 rounded-md mt-0.5">
            <Bot className="w-3 h-3 text-indigo-300" />
            <span className="text-[11px] whitespace-nowrap">AI의 밴드평가 :</span>
          </div>

          <div className="flex-1 text-slate-300 text-[11px] leading-relaxed break-keep">
            {isEvaluating ? (
              <span className="text-slate-500 animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                <span>우리 밴드의 악기 구성 및 레퍼토리 노래방향성을 분석하고 있습니다...</span>
              </span>
            ) : bandEvaluation ? (
              <div className="flex items-start justify-between gap-2">
                <span>{bandEvaluation}</span>
                <button
                  type="button"
                  onClick={() => fetchBandEvaluation(true)}
                  title="AI 밴드평가 새로고침"
                  className="text-slate-500 hover:text-indigo-300 p-0.5 shrink-0 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-slate-500">
                악기 구성과 레퍼토리를 기반으로 AI가 밴드의 노래 방향성과 추천 장르를 분석합니다.
              </span>
            )}
          </div>
        </div>
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
                {searchResults.map((song, idx) => {
                  const matchedRep = song.id
                    ? repertoireLookup.byId.get(song.id) ||
                      repertoireLookup.byTitleArtist.get(getSongCompositeKey(song))
                    : repertoireLookup.byTitleArtist.get(getSongCompositeKey(song));

                  const repStatusObj = matchedRep
                    ? REPERTOIRE_STATUS_OPTIONS.find(
                        (opt) => opt.value === (matchedRep.status || 'WISHLIST')
                      ) || REPERTOIRE_STATUS_OPTIONS[0]
                    : null;

                  return (
                    <div
                      key={song.id || idx}
                      onClick={() => onSelectSong && onSelectSong(matchedRep || song)}
                      className={`p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs transition shadow-sm cursor-pointer group border ${
                        matchedRep
                          ? 'bg-emerald-950/15 hover:bg-emerald-950/25 border-emerald-800/50 hover:border-emerald-700/80'
                          : 'bg-[#0d1021]/90 hover:bg-[#131731] border-slate-800/80 hover:border-indigo-700/70'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-100 text-[13px] sm:text-sm break-keep group-hover:text-indigo-300 transition">
                            {song.title}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
                            {song.genre || '록/밴드'}
                          </span>
                          {/* 레퍼토리에 담긴 곡이면 현재 상태 배지(후보/연습중/합주중/합주완료/공연완료/영상완료) 표시 */}
                          {repStatusObj && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${repStatusObj.badgeStyle}`}
                            >
                              {repStatusObj.label}
                            </span>
                          )}
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
                        {matchedRep ? (
                          <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-700/80 text-emerald-300 font-bold text-xs shadow-sm select-none">
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                            <span>담김</span>
                          </span>
                        ) : (
                          onAddToRepertoire && (
                            <button
                              type="button"
                              onClick={() => onAddToRepertoire(song)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
                            >
                              <Plus className="w-3.5 h-3.5" /> 담기
                            </button>
                          )
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
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
