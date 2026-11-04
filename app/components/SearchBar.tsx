'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Search, Loader2, Plus, Check, Disc3, Video, ExternalLink, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  dbSongs: any[];
  repertoireMap: Map<string, string>;
  statusOptions: { value: string; label: string; badgeStyle: string }[];
  actionLoadingId: string | null;
  onAddDbSong: (song: any) => void;
  onAddYouTubeSong: (song: any) => void;
}

export default function SearchBar({
  dbSongs,
  repertoireMap,
  statusOptions,
  actionLoadingId,
  onAddDbSong,
  onAddYouTubeSong,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(value: string) {
    setSearchQuery(value);
    setIsSearchOpen(true);
    setNextPageToken(null);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const trimmed = value.trim();
    if (!trimmed) {
      setYoutubeResults([]);
      setYoutubeLoading(false);
      return;
    }

    setYoutubeLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`/api/youtube?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.items) {
          setYoutubeResults(data.items);
          setNextPageToken(data.nextPageToken || null);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('검색 에러:', err);
      } finally {
        setYoutubeLoading(false);
      }
    }, 180);
  }

  async function handleLoadMore() {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/youtube?q=${encodeURIComponent(searchQuery.trim())}&pageToken=${nextPageToken}`
      );
      const data = await res.json();
      if (data.items) {
        setYoutubeResults((prev) => {
          const prevIds = new Set(prev.map((i) => i.youtubeId));
          const newUnique = data.items.filter((i: any) => !prevIds.has(i.youtubeId));
          return [...prev, ...newUnique];
        });
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error('더보기 실패:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  const dbResults = searchQuery.trim()
    ? dbSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="max-w-5xl mx-auto mt-6 relative" ref={containerRef}>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onFocus={() => {
            if (searchQuery.trim()) setIsSearchOpen(true);
          }}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="곡명 또는 아티스트 입력 시 정식 음원이 실시간 검색됩니다 (예: QWER, DAY6, 실리카겔...)"
          className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none shadow-lg transition"
        />
        {youtubeLoading && (
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {isSearchOpen && searchQuery.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-40 max-h-[34rem] overflow-y-auto divide-y divide-slate-800/80">
          {/* DB 결과 */}
          {dbResults.map((song) => {
            const currentStatus = repertoireMap.get(song.title.toLowerCase());
            const badgeInfo = currentStatus ? statusOptions.find((s) => s.value === currentStatus) : null;

            return (
              <div key={song.id} className="p-3.5 hover:bg-slate-800/60 flex items-center justify-between transition">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-100">{song.title}</span>
                    <span className="text-xs text-slate-400">({song.artist})</span>
                    <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-medium">
                      라이브러리
                    </span>
                    {badgeInfo && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeInfo.badgeStyle}`}>
                        {badgeInfo.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {song.genre} • 원키: {song.original_key} • BPM: {song.bpm}
                  </p>
                </div>

                {!currentStatus ? (
                  <button
                    type="button"
                    disabled={actionLoadingId === song.id}
                    onClick={() => {
                      onAddDbSong(song);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition shadow shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> 담기
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-medium shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> 담김
                  </span>
                )}
              </div>
            );
          })}

          {/* YouTube 결과 */}
          {youtubeResults.map((ytSong) => {
            const isAlreadyAdded = repertoireMap.has(ytSong.title.toLowerCase());

            return (
              <div key={ytSong.youtubeId} className="p-3.5 hover:bg-slate-800/60 flex items-center justify-between gap-3 transition">
                <div className="flex items-center gap-3 min-w-0">
                  {ytSong.thumbnail && (
                    <img src={ytSong.thumbnail} alt={ytSong.title} className="w-12 h-9 object-cover rounded-md border border-slate-700/80 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-200 truncate">{ytSong.title}</h4>
                      <span className="text-[9px] bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.2 rounded shrink-0 flex items-center gap-1">
                        <Disc3 className="w-2.5 h-2.5" /> 정식음원
                      </span>

                      {ytSong.coverLevel === 'HIGH' && (
                        <span className="text-[9px] bg-amber-950/90 text-amber-300 border border-amber-800/80 px-1.5 py-0.2 rounded shrink-0 font-medium">
                          🔥 밴드 커버 많음
                        </span>
                      )}
                      {ytSong.coverLevel === 'MEDIUM' && (
                        <span className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.2 rounded shrink-0 font-medium">
                          🎸 밴드 커버 보통
                        </span>
                      )}
                      {ytSong.coverLevel === 'LOW' && (
                        <span className="text-[9px] bg-purple-950/80 text-purple-300 border border-purple-800/80 px-1.5 py-0.2 rounded shrink-0 font-medium">
                          ✨ 희소 선곡
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{ytSong.artist}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ytSong.coverSearchUrl && (
                    <a
                      href={ytSong.coverSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="다른 밴드들의 합주/커버 영상 보러가기"
                      className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 bg-slate-950/60 border border-slate-800 px-2 py-1 rounded-md transition"
                    >
                      <Video className="w-3 h-3" /> 커버 영상
                    </a>
                  )}

                  <a href={ytSong.youtubeUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-rose-400 transition">
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {isAlreadyAdded ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> 담김
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoadingId === ytSong.youtubeId}
                      onClick={() => {
                        onAddYouTubeSong(ytSong);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {actionLoadingId === ytSong.youtubeId ? '등록 중...' : '담기'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* 더보기 버튼 */}
          {nextPageToken && (
            <div className="p-3 bg-slate-950/80 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-indigo-400 hover:text-indigo-300 font-semibold text-xs rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-2 shadow"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 다음 곡 불러오는 중...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> 더 많은 음원 보기
                  </>
                )}
              </button>
            </div>
          )}

          {dbResults.length === 0 && youtubeResults.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              {youtubeLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  정식 음원 라이브러리 검색 중...
                </span>
              ) : (
                `'${searchQuery}'에 대한 검색 결과가 없습니다.`
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}