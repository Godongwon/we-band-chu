'use client';

import React, { useState } from 'react';
import { Music, ChevronDown, BookOpen, Trash2, Video } from 'lucide-react';
import {
  SongItem,
  RepertoireStatus,
  sortRepertoireSongs,
  getRepertoireStatusOrder,
} from '../types';

export interface StatusOption {
  value: RepertoireStatus;
  label: string;
  badgeStyle: string;
}

export const REPERTOIRE_STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'PRACTICING',
    label: '연습중',
    badgeStyle: 'bg-blue-950/80 text-blue-300 border-blue-800 hover:bg-blue-900/80',
  },
  {
    value: 'ENSEMBLE',
    label: '합주중',
    badgeStyle: 'bg-cyan-950/80 text-cyan-300 border-cyan-800 hover:bg-cyan-900/80',
  },
  {
    value: 'COMPLETED',
    label: '합주완료',
    badgeStyle: 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/80',
  },
  {
    value: 'WISHLIST',
    label: '후보',
    badgeStyle: 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900/80',
  },
  {
    value: 'PERFORMED',
    label: '공연완료',
    badgeStyle: 'bg-purple-950/80 text-purple-300 border-purple-800 hover:bg-purple-900/80',
  },
  {
    value: 'VIDEO_COMPLETED',
    label: '영상완료',
    badgeStyle: 'bg-pink-950/80 text-pink-300 border-pink-800 hover:bg-pink-900/80',
  },
];

interface RepertoirePanelProps {
  repertoire: SongItem[];
  onSelectSong: (song: SongItem) => void;
  onStatusChange?: (song: SongItem, newStatus: RepertoireStatus) => void;
  onOpenPracticePack?: (song: SongItem) => void;
  onRemoveFromRepertoire?: (song: SongItem) => void;
}

export default function RepertoirePanel({
  repertoire,
  onSelectSong,
  onStatusChange,
  onOpenPracticePack,
  onRemoveFromRepertoire,
}: RepertoirePanelProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | RepertoireStatus>('ALL');

  const filteredRepertoire =
    statusFilter === 'ALL'
      ? sortRepertoireSongs(repertoire)
      : sortRepertoireSongs(repertoire.filter((s) => (s.status || 'WISHLIST') === statusFilter));

  return (
    <div className="bg-[#0b0e1e]/60 border border-slate-800/60 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-bold flex items-center gap-2 text-slate-200">
          <Music className="w-4 h-4 text-indigo-400" />
          우리 밴드 레퍼토리 ({repertoire.length}곡)
        </h2>
        <span className="text-[11px] text-slate-500">후보 → 연습중 변경 시 합주팩 실행</span>
      </div>

      {/* 상태별 필터 칩 (레퍼토리에 곡이 있을 때 표시) */}
      {repertoire.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            전체 ({repertoire.length})
          </button>
          {REPERTOIRE_STATUS_OPTIONS.map((opt) => {
            const count = repertoire.filter((s) => (s.status || 'WISHLIST') === opt.value).length;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition shrink-0 ${
                  statusFilter === opt.value
                    ? opt.badgeStyle
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {repertoire.length === 0 ? (
        <div className="border border-dashed border-slate-800/80 rounded-2xl p-16 text-center text-xs text-slate-500">
          등록된 곡이 없습니다. 검색창이나 오른쪽 추천 피드에서 곡을 담아보세요!
        </div>
      ) : filteredRepertoire.length === 0 ? (
        <div className="border border-dashed border-slate-800/80 rounded-2xl p-12 text-center text-xs text-slate-500">
          해당 상태의 레퍼토리 곡이 없습니다.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
          {filteredRepertoire.map((song, idx) => {
            const currentStatus: RepertoireStatus = song.status || 'WISHLIST';
            const currentBadge =
              REPERTOIRE_STATUS_OPTIONS.find((opt) => opt.value === currentStatus) ||
              REPERTOIRE_STATUS_OPTIONS[0];

            return (
              <div
                key={song.repertoire_id || song.id || idx}
                onClick={() => onSelectSong(song)}
                className="p-3.5 bg-[#0d1021] hover:bg-[#12162e] border border-slate-800/90 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs cursor-pointer transition"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-[13px] sm:text-sm break-keep">
                      {song.title}
                    </span>
                    <span className="text-xs text-slate-400">({song.artist})</span>

                    {/* 상태 변경 드롭다운 (후보 / 연습중 / 합주중 / 합주완료 / 공연완료 / 영상완료) */}
                    <div
                      className="relative inline-flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={currentStatus}
                        onChange={(e) =>
                          onStatusChange &&
                          onStatusChange(song, e.target.value as RepertoireStatus)
                        }
                        className={`appearance-none text-[11px] font-bold pl-2.5 pr-6 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-colors ${currentBadge.badgeStyle}`}
                      >
                        {REPERTOIRE_STATUS_OPTIONS.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            className="bg-slate-900 text-slate-200 font-semibold"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-80 text-current" />
                    </div>

                    {(currentStatus === 'PRACTICING' || currentStatus === 'ENSEMBLE') &&
                      onOpenPracticePack && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPracticePack(song);
                          }}
                          className="text-[10px] bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold transition shadow-sm"
                        >
                          <BookOpen className="w-3 h-3" /> 파트별 합주팩
                        </button>
                      )}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>
                      키:{' '}
                      <strong className="text-indigo-300 font-medium">
                        {song.recommended_key || song.original_key || '원키 유지'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>{song.bpm}bpm</span>
                    {song.band_notes && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500 truncate max-w-[200px]">
                          {song.band_notes}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center justify-end gap-1.5 shrink-0 pt-1.5 sm:pt-0 border-t border-slate-800/50 sm:border-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onOpenPracticePack && (
                    <button
                      type="button"
                      onClick={() => onOpenPracticePack(song)}
                      title="파트별 합주팩 (악보바다 & 카피 영상 가이드)"
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-blue-300 hover:text-blue-200 font-semibold flex items-center gap-1 transition"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>합주팩</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectSong(song)}
                    className="px-2 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/70 text-[11px] text-indigo-300 font-semibold transition"
                  >
                    상세보기
                  </button>

                  {song.youtube_url && (
                    <a
                      href={song.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="YouTube 음원 듣기"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {onRemoveFromRepertoire && (
                    <button
                      type="button"
                      onClick={() => onRemoveFromRepertoire(song)}
                      title="레퍼토리에서 제거"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
