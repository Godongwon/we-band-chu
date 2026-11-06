'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Plus, Check, RefreshCw, Compass } from 'lucide-react';

export interface DiscoveredArtistItem {
  name: string;
  search_alias: string;
  vocal_gender: 'FEMALE' | 'MALE' | 'COED';
  genre: string;
  reason: string;
}

interface DiscoverArtistsModalProps {
  isOpen: boolean;
  existingArtistsCount: number;
  isAutoExpandEnabled?: boolean;
  onToggleAutoExpand?: () => void;
  onClose: () => void;
  onArtistAdded: (message: string) => void;
}

const CATEGORIES = [
  '전체 추천',
  '국내 인디/록 밴드',
  '여성 보컬 밴드',
  '남성 보컬 밴드',
  'J-Rock / 일본 밴드',
  '글로벌 록/팝밴드',
];

function formatGenderBadge(gender: string) {
  if (gender === 'FEMALE') {
    return {
      label: '여성 보컬',
      cls: 'bg-pink-950/80 text-pink-300 border-pink-800',
    };
  }
  if (gender === 'MALE') {
    return {
      label: '남성 보컬',
      cls: 'bg-blue-950/80 text-blue-300 border-blue-800',
    };
  }
  return {
    label: '혼성 보컬',
    cls: 'bg-purple-950/80 text-purple-300 border-purple-800',
  };
}

export default function DiscoverArtistsModal({
  isOpen,
  existingArtistsCount,
  isAutoExpandEnabled = false,
  onToggleAutoExpand,
  onClose,
  onArtistAdded,
}: DiscoverArtistsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체 추천');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [candidates, setCandidates] = useState<DiscoveredArtistItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [addingNames, setAddingNames] = useState<Set<string>>(new Set());
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  const [priorityMap, setPriorityMap] = useState<{ [name: string]: number }>({});
  const [isAddingAll, setIsAddingAll] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen && candidates.length === 0 && !isSearching) {
      handleDiscover('전체 추천', '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleDiscover(categoryOverride?: string, promptOverride?: string) {
    const targetCategory = categoryOverride ?? selectedCategory;
    const targetPrompt = promptOverride ?? customPrompt;

    setIsSearching(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/artists/discover-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: targetCategory,
          customPrompt: targetPrompt,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const list: DiscoveredArtistItem[] = data.candidates || [];
        setCandidates(list);
        const initPriorities: { [name: string]: number } = {};
        list.forEach((c) => {
          initPriorities[c.name] = 1;
        });
        setPriorityMap(initPriorities);
      } else {
        setErrorMsg(data.message || '새로운 밴드를 탐색하지 못했습니다.');
      }
    } catch (err: any) {
      setErrorMsg(`통신 오류: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddSingle(candidate: DiscoveredArtistItem) {
    if (addedNames.has(candidate.name) || addingNames.has(candidate.name)) return;

    setAddingNames((prev) => new Set(prev).add(candidate.name));
    try {
      const priority = priorityMap[candidate.name] || 1;
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate.name,
          search_alias: candidate.search_alias,
          vocal_gender: candidate.vocal_gender,
          priority,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAddedNames((prev) => new Set(prev).add(candidate.name));
        onArtistAdded(
          `'${candidate.name} (${candidate.search_alias})' 밴드가 ${priority}순위로 추가되었습니다.`
        );
      } else {
        alert(`밴드 추가 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setAddingNames((prev) => {
        const next = new Set(prev);
        next.delete(candidate.name);
        return next;
      });
    }
  }

  async function handleAddAllRemaining() {
    const remaining = candidates.filter((c) => !addedNames.has(c.name));
    if (remaining.length === 0) return;

    setIsAddingAll(true);
    let successCount = 0;

    try {
      for (const candidate of remaining) {
        setAddingNames((prev) => new Set(prev).add(candidate.name));
        try {
          const priority = priorityMap[candidate.name] || 1;
          const res = await fetch('/api/artists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: candidate.name,
              search_alias: candidate.search_alias,
              vocal_gender: candidate.vocal_gender,
              priority,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            successCount++;
            setAddedNames((prev) => new Set(prev).add(candidate.name));
          }
        } finally {
          setAddingNames((prev) => {
            const next = new Set(prev);
            next.delete(candidate.name);
            return next;
          });
        }
      }

      if (successCount > 0) {
        onArtistAdded(`LLM 추천 밴드 ${successCount}팀이 수집 대상 큐에 일괄 추가되었습니다.`);
      }
    } finally {
      setIsAddingAll(false);
    }
  }

  const remainingCount = candidates.filter((c) => !addedNames.has(c.name)).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>LLM으로 다른 밴드 찾기</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  중복 자동 제외 ({existingArtistsCount}팀 제외)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                현재 수집 대상에 없는 새로운 밴드를 LLM으로 발굴하고 영문 검색 별칭(search_alias)과 함께 즉시 추가합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleAutoExpand && (
              <button
                type="button"
                onClick={onToggleAutoExpand}
                title={
                  isAutoExpandEnabled
                    ? '모든 곡 분석 완료 시 다른 밴드 자동 확장 [ON] (클릭하여 끄기)'
                    : '모든 곡 분석 완료 시 다른 밴드 자동 확장 [OFF] (클릭하여 켜기)'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition shadow-sm cursor-pointer ${
                  isAutoExpandEnabled
                    ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAutoExpandEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span>자동확장: {isAutoExpandEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 검색 조건 영역 */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/30 space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={isSearching}
                  onClick={() => {
                    setSelectedCategory(cat);
                    handleDiscover(cat, customPrompt);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleDiscover(selectedCategory, customPrompt);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="원하는 스타일이나 키워드 입력 (예: 대학 축제 합주용 신나는 밴드, 2000년대 모던록, 건반 있는 밴드...)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>LLM 탐색 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>다른 밴드 다시 찾기</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 추천 결과 리스트 */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {isSearching ? (
            <div className="py-16 text-center space-y-2">
              <Sparkles className="w-7 h-7 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-300">
                현재 등록된 {existingArtistsCount}개 밴드를 제외하고 새로운 추천 밴드를 분석 중입니다...
              </p>
              <p className="text-[11px] text-slate-500">
                iTunes 영문 검색 별칭(search_alias)과 보컬 성별을 함께 추출하고 있습니다.
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              상단 카테고리를 선택하거나 키워드를 입력해 새로운 밴드를 탐색해 보세요.
            </div>
          ) : (
            candidates.map((item) => {
              const isAdded = addedNames.has(item.name);
              const isAdding = addingNames.has(item.name);
              const genderBadge = formatGenderBadge(item.vocal_gender);

              return (
                <div
                  key={item.name}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isAdded
                      ? 'bg-emerald-950/20 border-emerald-800/60'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-100">{item.name}</span>
                      <span className="text-xs font-semibold text-indigo-400">
                        ({item.search_alias})
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${genderBadge.cls}`}
                      >
                        {genderBadge.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                        {item.genre}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isAdded && (
                      <select
                        value={priorityMap[item.name] || 1}
                        onChange={(e) =>
                          setPriorityMap((prev) => ({
                            ...prev,
                            [item.name]: Number(e.target.value),
                          }))
                        }
                        className="text-[11px] bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 font-semibold outline-none focus:border-indigo-500"
                      >
                        <option value={1}>1순위 (최우선)</option>
                        <option value={2}>2순위 (일반)</option>
                      </select>
                    )}

                    <button
                      type="button"
                      disabled={isAdded || isAdding}
                      onClick={() => handleAddSingle(item)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
                        isAdded
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>추가됨</span>
                        </>
                      ) : isAdding ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>추가 중...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>수집 추가</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            추천된 밴드: {candidates.length}팀 (추가 가능: {remainingCount}팀)
          </span>

          <div className="flex items-center gap-2">
            {remainingCount > 0 && (
              <button
                type="button"
                disabled={isAddingAll || isSearching}
                onClick={handleAddAllRemaining}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {isAddingAll ? '일괄 추가 중...' : `남은 ${remainingCount}팀 모두 추가`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

