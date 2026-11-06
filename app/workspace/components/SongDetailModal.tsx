'use client';

import React from 'react';
import { X, Sliders, Guitar, ExternalLink, Music, Sparkles, Play, AlertCircle, Plus, Check } from 'lucide-react';
import { SongItem, BandProfile, isSameSong } from '../types';
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
  if (!selectedSong) return null;

  const matchedRep = repertoire.find((r) => isSameSong(r, selectedSong));

  const repStatusObj = matchedRep
    ? REPERTOIRE_STATUS_OPTIONS.find(
        (opt) => opt.value === (matchedRep.status || 'WISHLIST')
      ) || REPERTOIRE_STATUS_OPTIONS[0]
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
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
            onClick={onClose}
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
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 기타 TAB 악보 cover`)}`}
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
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 베이스 악보 cover`)}`}
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
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 드럼 악보 cover`)}`}
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
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 피아노 건반 악보 cover`)}`}
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

        <div className="p-3.5 bg-[#090c1d] border border-slate-800/80 rounded-2xl flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">원곡 및 라이브 풀버전:</span>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 라이브`)}`}
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
                `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title}`)}`
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
              onClick={onClose}
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

