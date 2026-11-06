'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sliders,
  Guitar,
  ExternalLink,
  Music,
  Sparkles,
  Play,
  Square as StopSquare,
  Loader2,
  Volume2,
  AlertCircle,
  Plus,
  Check,
} from 'lucide-react';
import { SongItem, BandProfile, isSameSong, cleanTitleForSearch, getYouTubeLiveUrl } from '../types';
import { REPERTOIRE_STATUS_OPTIONS } from './RepertoirePanel';

interface SongDetailModalProps {
  selectedSong: SongItem | null;
  bandProfile: BandProfile;
  repertoire?: SongItem[];
  onClose: () => void;
  onReportSong: (song: SongItem) => void;
  onAddToRepertoire: (song: SongItem) => void;
}

export default function SongDetailModal({
  selectedSong,
  bandProfile,
  repertoire = [],
  onClose,
  onReportSong,
  onAddToRepertoire,
}: SongDetailModalProps) {
  // 30초 음악 미리듣기 재생 상태
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 컴포넌트 언마운트 시 오디오 정지
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 곡이 변경되면 기존 오디오 정지
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [selectedSong?.id, selectedSong?.title]);

  if (!selectedSong) return null;

  const matchedRep = repertoire.find((r) => isSameSong(r, selectedSong));

  const repStatusObj = matchedRep
    ? REPERTOIRE_STATUS_OPTIONS.find(
        (opt) => opt.value === (matchedRep.status || 'WISHLIST')
      ) || REPERTOIRE_STATUS_OPTIONS[0]
    : null;

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onClose();
  };

  const handleTogglePlay = async () => {
    if (!selectedSong) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    let streamUrl = selectedSong.preview_url;

    if (!streamUrl) {
      setIsLoadingAudio(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedSong.id) queryParams.set('id', selectedSong.id);
        if (selectedSong.title) queryParams.set('title', selectedSong.title);
        if (selectedSong.artist) queryParams.set('artist', selectedSong.artist);

        const res = await fetch(`/api/songs/preview?${queryParams.toString()}`);
        const data = await res.json();
        if (res.ok && data.preview_url) {
          streamUrl = data.preview_url;
        } else {
          alert(`'${selectedSong.title}' 30초 미리듣기 음원을 찾지 못했습니다.`);
          setIsLoadingAudio(false);
          return;
        }
      } catch {
        alert('음원 미리듣기 로드 중 통신 오류가 발생했습니다.');
        setIsLoadingAudio(false);
        return;
      } finally {
        setIsLoadingAudio(false);
      }
    }

    if (!streamUrl) return;

    try {
      const audio = new Audio(streamUrl);
      audioRef.current = audio;
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        alert('오디오 재생 중 오류가 발생했습니다.');
        setIsPlaying(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err: unknown) {
      console.error('[음원 미리듣기 재생 오류]:', err);
      setIsPlaying(false);
      audioRef.current = null;
    }
  };

  const cleanTitle = cleanTitleForSearch(selectedSong.title);

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-[#0e1227] border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 text-xs text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/70">
                {selectedSong.genre || '밴드/록'}
              </span>
              {repStatusObj && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${repStatusObj.badgeStyle}`}
                >
                  {repStatusObj.label}
                </span>
              )}
              <span className="text-slate-400 text-xs">{selectedSong.artist}</span>
            </div>
            <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
              {selectedSong.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#121633] border border-slate-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 block mb-0.5">템포 (BPM)</span>
            <span className="text-base font-black text-emerald-400">
              {selectedSong.bpm ? `${selectedSong.bpm} BPM` : '분석 대기'}
            </span>
          </div>
          <div className="bg-[#121633] border border-slate-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 block mb-0.5">원곡 Key / 추천 Key</span>
            <span className="text-xs font-bold text-purple-300 block mt-1">
              {selectedSong.original_key
                ? `${selectedSong.original_key} (${selectedSong.recommended_key || '원키 유지'})`
                : selectedSong.recommended_key || '원키 유지'}
            </span>
          </div>
          <div className="bg-[#121633] border border-slate-800/80 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 block mb-0.5">보컬 음역대</span>
            <span className="text-xs font-bold text-pink-300 block mt-1">
              {bandProfile.vocal_gender === 'FEMALE' ? '여성 보컬 최적화' : '남성 보컬 최적화'}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <h4 className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            파트별 악보 및 커버 영상 안내 (클릭 시 유튜브 악보 검색)
          </h4>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${cleanTitle} 기타 TAB 악보 cover`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-amber-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Guitar className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="font-bold text-slate-200 block group-hover:text-amber-300 transition">일렉기타</span>
                  <span className="text-[10px] text-slate-500">
                    {bandProfile.guitar_count === 1 ? '1기타 편곡' : '2기타 리드/리듬'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5">
                TAB 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </span>
            </a>

            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${cleanTitle} 베이스 악보 cover`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-cyan-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="font-bold text-slate-200 block group-hover:text-cyan-300 transition">베이스</span>
                  <span className="text-[10px] text-slate-500">4현 표준 대응</span>
                </div>
              </div>
              <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5">
                악보 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </span>
            </a>

            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${cleanTitle} 드럼 악보 cover`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-emerald-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-bold text-slate-200 block group-hover:text-emerald-300 transition">드럼</span>
                  <span className="text-[10px] text-slate-500">{selectedSong.bpm}bpm 리듬 비트</span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                악보 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </span>
            </a>

            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${cleanTitle} 피아노 건반 악보 cover`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-pink-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-pink-400" />
                <div>
                  <span className="font-bold text-slate-200 block group-hover:text-pink-300 transition">키보드/건반</span>
                  <span className="text-[10px] text-slate-500">
                    {bandProfile.has_keys ? '메인 신디/피아노' : '기타로 대체 가능'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-pink-400 font-semibold flex items-center gap-0.5">
                건반 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </span>
            </a>
          </div>
        </div>

        <div className="p-3.5 bg-[#090c1d] border border-slate-800/80 rounded-2xl flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">원곡 및 라이브 풀버전:</span>
            {isPlaying && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 animate-pulse">
                <Volume2 className="w-3.5 h-3.5" /> 30초 미리듣기 재생 중
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 30초 음악 미리듣기 버튼 */}
            <button
              type="button"
              disabled={isLoadingAudio}
              onClick={handleTogglePlay}
              title={
                isPlaying
                  ? '미리듣기 정지'
                  : `'${selectedSong.title}' 30초 음원 미리듣기 재생`
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition shadow-sm whitespace-nowrap ${
                isPlaying
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                  : 'bg-indigo-950/90 hover:bg-indigo-900 border-indigo-700/80 text-indigo-300 hover:text-white'
              } disabled:opacity-60`}
            >
              {isLoadingAudio ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" />
                  <span>로딩...</span>
                </>
              ) : isPlaying ? (
                <>
                  <StopSquare className="w-3.5 h-3.5 fill-slate-950" />
                  <span>정지</span>
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
                  <span>30초 미리듣기</span>
                </>
              )}
            </button>

            <a
              href={getYouTubeLiveUrl(selectedSong.artist, selectedSong.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
            >
              <Play className="w-3 h-3 text-slate-400" />
              라이브 무대
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={
                selectedSong.youtube_url ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${cleanTitle}`)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-[11px] font-semibold transition"
            >
              <Play className="w-3 h-3 fill-rose-300" />
              원곡 듣기
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => onReportSong(selectedSong)}
            className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" /> 곡 오류 신고
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              닫기
            </button>
            {matchedRep ? (
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-700/80 text-emerald-300 font-bold shadow select-none">
                <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                담김 ({repStatusObj?.label})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onAddToRepertoire(selectedSong)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                레퍼토리에 담기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

