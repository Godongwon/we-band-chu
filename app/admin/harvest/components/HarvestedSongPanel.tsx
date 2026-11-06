'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Music2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Play,
  Square as StopSquare,
  Loader2,
  Volume2,
  ExternalLink,
  X,
  Pencil,
  Filter,
} from 'lucide-react';
import { SongItem } from '../types';

interface HarvestedSongPanelProps {
  isArtistPanelOpen: boolean;
  isSongPanelOpen: boolean;
  filteredSongs: SongItem[];
  selectedArtist: string;
  selectedGenre: string;
  availableGenres: [string, number][];
  selectedSongIds: Set<string>;
  isDeletingSelected: boolean;
  loading: boolean;
  searchSongQuery: string;
  onToggleSongPanel: () => void;
  onClearArtistFilter: () => void;
  onSelectGenre: (genre: string) => void;
  onClearGenreFilter: () => void;
  onDeleteSelectedSongs: () => void;
  onToggleSelectAll: () => void;
  onChangeSearchQuery: (val: string) => void;
  onToggleSongSelection: (songId: string) => void;
  onEditSongTitle?: (e: React.MouseEvent, song: SongItem) => void;
  onDeleteSong: (e: React.MouseEvent, song: SongItem) => void;
}

export default function HarvestedSongPanel({
  isArtistPanelOpen,
  isSongPanelOpen,
  filteredSongs,
  selectedArtist,
  selectedGenre,
  availableGenres,
  selectedSongIds,
  isDeletingSelected,
  loading,
  searchSongQuery,
  onToggleSongPanel,
  onClearArtistFilter,
  onSelectGenre,
  onClearGenreFilter,
  onDeleteSelectedSongs,
  onToggleSelectAll,
  onChangeSearchQuery,
  onToggleSongSelection,
  onEditSongTitle,
  onDeleteSong,
}: HarvestedSongPanelProps) {
  const isAllSelected = filteredSongs.length > 0 && selectedSongIds.size === filteredSongs.length;
  const topGenres = availableGenres.slice(0, 24);
  const isOtherSelected =
    selectedGenre !== 'ALL' && !topGenres.some(([g]) => g === selectedGenre);

  // 장르 칩 가로 스크롤 Ref & 핸들러
  const genreScrollRef = useRef<HTMLDivElement | null>(null);
  const handleScrollGenres = (direction: 'left' | 'right') => {
    if (genreScrollRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      genreScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 30초 음원 미리듣기 상태
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [loadingAudioSongId, setLoadingAudioSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = async (e: React.MouseEvent, song: SongItem) => {
    e.stopPropagation();

    // 현재 재생 중인 곡을 다시 누르면 정지
    if (playingSongId === song.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingSongId(null);
      return;
    }

    // 다른 음원이 재생 중이었다면 먼저 정지
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingSongId(null);

    let streamUrl = song.preview_url;

    // 만약 song에 preview_url이 없으면 서버에서 즉시 검색 및 캐싱
    if (!streamUrl) {
      setLoadingAudioSongId(song.id);
      try {
        const res = await fetch(
          `/api/songs/preview?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(
            song.title
          )}&artist=${encodeURIComponent(song.artist)}`
        );
        const data = await res.json();
        if (res.ok && data.preview_url) {
          streamUrl = data.preview_url;
          song.preview_url = streamUrl;
        } else {
          alert(`'${song.title}' 30초 미리듣기 음원을 찾지 못했습니다.`);
          setLoadingAudioSongId(null);
          return;
        }
      } catch {
        alert('음원 미리듣기 로드 중 통신 오류가 발생했습니다.');
        setLoadingAudioSongId(null);
        return;
      } finally {
        setLoadingAudioSongId(null);
      }
    }

    if (!streamUrl) return;

    try {
      const audio = new Audio(streamUrl);
      audioRef.current = audio;
      setPlayingSongId(song.id);

      audio.onended = () => {
        setPlayingSongId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        alert('오디오 재생 중 오류가 발생했습니다.');
        setPlayingSongId(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err: any) {
      console.error('[오디오 재생 오류]:', err);
      setPlayingSongId(null);
      audioRef.current = null;
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/60 pb-3">
        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200 whitespace-nowrap">
              <Music2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                수집된 음원 ({filteredSongs.length}곡)
                {selectedArtist !== 'ALL' && ` - ${selectedArtist}`}
                {selectedGenre !== 'ALL' && ` [${selectedGenre}]`}
              </span>
            </h2>

            {selectedArtist !== 'ALL' && (
              <button
                type="button"
                onClick={onClearArtistFilter}
                title="밴드 필터 해제하고 전체 곡 보기"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/80 text-[11px] font-bold transition shadow-sm"
              >
                <span>밴드: {selectedArtist}</span>
                <X className="w-3 h-3 text-indigo-400 hover:text-rose-300" />
              </button>
            )}

            {selectedGenre !== 'ALL' && (
              <button
                type="button"
                onClick={onClearGenreFilter}
                title="장르 필터 해제하고 전체 곡 보기"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/90 hover:bg-purple-900 text-purple-300 hover:text-white border border-purple-700/80 text-[11px] font-bold transition shadow-sm"
              >
                <span>장르: {selectedGenre}</span>
                <X className="w-3 h-3 text-purple-400 hover:text-rose-300" />
              </button>
            )}

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
        </div>

        {isSongPanelOpen && (
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            {selectedSongIds.size > 0 && (
              <button
                type="button"
                disabled={isDeletingSelected}
                onClick={onDeleteSelectedSongs}
                className="text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isDeletingSelected ? '삭제 중...' : `선택 삭제 (${selectedSongIds.size}곡)`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleSelectAll}
              className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold transition"
            >
              {isAllSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>
                {isAllSelected
                  ? `전체 해제 (${filteredSongs.length})`
                  : `전체 선택 (${filteredSongs.length})`}
              </span>
            </button>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSongQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                placeholder="곡명 또는 아티스트 검색..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition"
              />
              {searchSongQuery && (
                <button
                  type="button"
                  onClick={() => onChangeSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 장르별 필터링 바 (스크롤바 제거 + 좌우 화살표 버튼 탐색 + 고정 드롭다운) */}
      {isSongPanelOpen && (
        <div className="flex items-center gap-1.5 border-b border-slate-800/50 pb-2 pt-0.5 text-xs">
          {/* 좌측 고정 라벨 */}
          <div className="flex items-center gap-1 pl-0.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">장르 필터:</span>
          </div>

          {/* 좌측 스크롤 화살표 버튼 */}
          <button
            type="button"
            onClick={() => handleScrollGenres('left')}
            title="이전 장르 보기"
            className="shrink-0 p-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-purple-300 transition shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* 중앙 장르 칩 컨테이너 (스크롤바 완전 숨김) */}
          <div
            ref={genreScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto scroll-smooth min-w-0 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5"
          >
            {/* 전체 버튼 */}
            <button
              type="button"
              onClick={() => onSelectGenre('ALL')}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition shrink-0 ${
                selectedGenre === 'ALL'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              전체 ({availableGenres.reduce((acc, cur) => acc + cur[1], 0)})
            </button>

            {/* 주요 장르 칩들 */}
            {topGenres.map(([genre, count]) => {
              const isSelected = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => onSelectGenre(genre)}
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{genre}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}

            {/* 선택된 장르가 상위 목록 외일 경우 활성 칩 표시 */}
            {isOtherSelected && (
              <button
                type="button"
                onClick={() => onSelectGenre(selectedGenre)}
                className="px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-purple-600 text-white border-purple-500 shadow-sm shrink-0 flex items-center gap-1"
              >
                <span>{selectedGenre}</span>
                <span className="text-[10px] text-purple-200">
                  ({availableGenres.find(([g]) => g === selectedGenre)?.[1] || 0})
                </span>
              </button>
            )}
          </div>

          {/* 우측 스크롤 화살표 버튼 */}
          <button
            type="button"
            onClick={() => handleScrollGenres('right')}
            title="다음 장르 보기"
            className="shrink-0 p-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-purple-300 transition shadow-sm"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* 우측 고정 전체 장르 드롭다운 선택기 */}
          {availableGenres.length > 0 && (
            <div className="relative inline-flex items-center shrink-0">
              <select
                value={selectedGenre}
                onChange={(e) => onSelectGenre(e.target.value)}
                className="appearance-none bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-medium rounded-xl pl-2.5 pr-7 py-1 outline-none cursor-pointer focus:border-purple-500 transition"
              >
                <option value="ALL">전체 목록 ({availableGenres.length}개) ▾</option>
                {availableGenres.map(([g, count]) => (
                  <option key={g} value={g}>
                    {g} ({count}곡)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none text-slate-500" />
            </div>
          )}
        </div>
      )}

      {isSongPanelOpen ? (
        loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">음원 데이터 로드 중...</div>
        ) : filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">조건에 맞는 음원이 없습니다.</div>
        ) : (
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredSongs.map((song) => {
              const isChecked = selectedSongIds.has(song.id);
              const isPlaying = playingSongId === song.id;
              const isLoadingAudio = loadingAudioSongId === song.id;

              const youtubeTargetUrl =
                song.youtube_url ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(
                  `${song.artist} ${song.title}`
                )}`;

              return (
                <div
                  key={song.id}
                  onClick={() => onToggleSongSelection(song.id)}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs cursor-pointer transition ${
                    isPlaying
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-sm'
                      : isChecked
                      ? 'bg-indigo-950/40 border-indigo-600/80'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* 상단(모바일) / 좌측(PC): 체크박스 + 곡 제목(풀네임) + 밴드명 + 장르/수집일 */}
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="shrink-0 text-slate-400 pt-0.5 sm:pt-0"
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
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-bold text-[13px] text-slate-100 break-keep leading-snug">
                          {song.title}
                        </span>
                        <span className="text-slate-400 text-[11px] font-medium">
                          ({song.artist})
                        </span>
                        {onEditSongTitle && (
                          <button
                            type="button"
                            onClick={(e) => onEditSongTitle(e, song)}
                            title="곡 제목 직접 수정"
                            className="p-0.5 rounded text-slate-500 hover:text-indigo-300 hover:bg-slate-800 transition inline-flex items-center"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGenre(song.genre || '미분류');
                          }}
                          title={`'${song.genre || '미분류'}' 장르로 필터링`}
                          className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-950/40 border border-purple-800/40 text-purple-300 hover:bg-purple-900/60 hover:text-white transition cursor-pointer"
                        >
                          {song.genre || '장르 미지정'}
                        </button>
                        <span>•</span>
                        <span>{new Date(song.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* 하단(모바일) / 우측(PC): 미리듣기 버튼(노란색 영역) + BPM/Key + YouTube / 삭제 */}
                  <div
                    className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-slate-800/50 sm:border-0 pl-6 sm:pl-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 30초 음악 미리듣기 버튼 (요청하신 노란색 표시 영역) */}
                    <button
                      type="button"
                      disabled={isLoadingAudio}
                      onClick={(e) => handleTogglePlay(e, song)}
                      title={
                        isPlaying
                          ? '미리듣기 정지'
                          : `'${song.title}' 30초 음원 미리듣기 재생`
                      }
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition shadow-sm whitespace-nowrap ${
                        isPlaying
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                          : 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/80 text-indigo-300 hover:text-white'
                      } disabled:opacity-60`}
                    >
                      {isLoadingAudio ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-300" />
                          <span>음원 로드 중...</span>
                        </>
                      ) : isPlaying ? (
                        <>
                          <StopSquare className="w-3 h-3 fill-slate-950" />
                          <span>재생 중 (정지)</span>
                          <Volume2 className="w-3 h-3 animate-bounce" />
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-indigo-400 text-indigo-400" />
                          <span>미리듣기</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                          song.bpm
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {song.bpm ? `${song.bpm} BPM` : 'BPM 대기'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                          song.original_key
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        {song.original_key ? `${song.original_key} Key` : 'Key 미산출'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={youtubeTargetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`YouTube에서 '${song.artist} ${song.title}' 듣기/확인`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-rose-100 text-[11px] font-semibold transition shadow-sm whitespace-nowrap"
                      >
                        <Play className="w-3 h-3 fill-rose-300 text-rose-300" />
                        <span>YouTube</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>

                      <button
                        type="button"
                        onClick={(e) => onDeleteSong(e, song)}
                        title={`'${song.title}' 곡 삭제`}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
          <ChevronDown className="w-4 h-4 text-emerald-400" />
        </div>
      )}
    </div>
  );
}
