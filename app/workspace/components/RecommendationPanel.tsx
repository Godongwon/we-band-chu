'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Sparkles,
  RefreshCw,
  Plus,
  AlertCircle,
  Play,
  Square as StopSquare,
  Loader2,
  Volume2,
} from 'lucide-react';
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
  // 30초 음악 미리듣기 재생 상태
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

    // 현재 재생 중인 곡을 누르면 정지
    if (playingSongId === (song.id || song.title)) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingSongId(null);
      return;
    }

    // 다른 음원이 재생 중이면 중지
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingSongId(null);

    const songKey = song.id || song.title;
    let streamUrl = song.preview_url;

    if (!streamUrl) {
      setLoadingAudioSongId(songKey);
      try {
        const queryParams = new URLSearchParams();
        if (song.id) queryParams.set('id', song.id);
        if (song.title) queryParams.set('title', song.title);
        if (song.artist) queryParams.set('artist', song.artist);

        const res = await fetch(`/api/songs/preview?${queryParams.toString()}`);
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
      setPlayingSongId(songKey);

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
      console.error('[추천곡 오디오 재생 오류]:', err);
      setPlayingSongId(null);
      audioRef.current = null;
    }
  };

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
          {displaySongs.map((song, idx) => {
            const songKey = song.id || song.title;
            const isPlaying = playingSongId === songKey;
            const isLoadingAudio = loadingAudioSongId === songKey;

            return (
              <div
                key={song.id || idx}
                onClick={() => onSelectSong(song)}
                className={`p-3.5 border rounded-2xl flex items-center justify-between gap-3 text-xs transition shadow-sm cursor-pointer group ${
                  isPlaying
                    ? 'bg-indigo-950/70 border-indigo-500'
                    : 'bg-[#0d1021]/80 hover:bg-[#111429] border-slate-800/80 hover:border-slate-700/80'
                }`}
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

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* 30초 음악 미리듣기 버튼 */}
                  <button
                    type="button"
                    disabled={isLoadingAudio}
                    onClick={(e) => handleTogglePlay(e, song)}
                    title={
                      isPlaying
                        ? '미리듣기 정지'
                        : `'${song.title}' 30초 음원 미리듣기 재생`
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition shadow-sm whitespace-nowrap ${
                      isPlaying
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                        : 'bg-indigo-950/90 hover:bg-indigo-900 border-indigo-700/80 text-indigo-300 hover:text-white'
                    } disabled:opacity-60`}
                  >
                    {isLoadingAudio ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-300" />
                        <span>로딩...</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <StopSquare className="w-3 h-3 fill-slate-950" />
                        <span>정지</span>
                        <Volume2 className="w-3 h-3 animate-bounce" />
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-indigo-400 text-indigo-400" />
                        <span>미리듣기</span>
                      </>
                    )}
                  </button>

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
            );
          })}
        </div>
      )}
    </div>
  );
}
