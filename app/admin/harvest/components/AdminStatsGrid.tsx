'use client';

import React from 'react';
import { Clock, RefreshCw, Timer, Sparkles } from 'lucide-react';
import { HarvestStats } from '../types';

export interface AnalyzingSongInfo {
  title: string;
  artist: string;
  bpm?: number | null;
  original_key?: string | null;
  status?: 'ANALYZING' | 'COMPLETED' | 'PENDING';
}

interface AdminStatsGridProps {
  stats: HarvestStats;
  countdown: number;
  refreshIntervalSeconds: number;
  isAutoRefreshing: boolean;
  isAnalyzingAudio?: boolean;
  isAutoExpandingArtists?: boolean;
  currentAnalyzingSong?: AnalyzingSongInfo | null;
  onManualRefreshNow: () => void;
  onOpenDiscoverArtists?: () => void;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AdminStatsGrid({
  stats,
  countdown,
  refreshIntervalSeconds,
  isAutoRefreshing,
  isAnalyzingAudio = false,
  isAutoExpandingArtists = false,
  currentAnalyzingSong = null,
  onManualRefreshNow,
  onOpenDiscoverArtists,
}: AdminStatsGridProps) {
  const isAllAnalyzed = stats.totalSongs > 0 && stats.totalSongs === stats.analyzedBpmCount;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
        <div>
          <span className="text-xs text-slate-400 block mb-1">총 수집 곡수</span>
          <span className="text-2xl font-black text-slate-100">{stats.totalSongs}곡</span>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px]">
          <span className={isAllAnalyzed ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
            분석 완료: {stats.analyzedBpmCount}곡
          </span>
          {isAllAnalyzed && (
            <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-800 text-emerald-300 font-bold">
              100% 일치
            </span>
          )}
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">수집 대상 아티스트</span>
            {isAutoExpandingArtists && (
              <Sparkles className="w-3 h-3 animate-spin text-indigo-400" />
            )}
          </div>
          <span className="text-2xl font-black text-slate-100">
            {stats.activeArtists}/{stats.totalArtists}팀
          </span>
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
          <span className="text-[10px] text-slate-500 truncate">
            {isAutoExpandingArtists
              ? '신규 밴드 자동 확장 중...'
              : '분석완료 일치 시 자동 확장'}
          </span>
          {onOpenDiscoverArtists && (
            <button
              type="button"
              onClick={onOpenDiscoverArtists}
              title="현재 등록된 밴드 외에 새로운 밴드를 LLM으로 찾아 추가"
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 hover:text-white text-[10px] font-bold transition shadow-sm shrink-0"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>다른 밴드 찾기</span>
            </button>
          )}
        </div>
      </div>

      {/* BPM 실측 완료율 + 현재 분석 곡 표시 */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">BPM 실측 완료율</span>
            {isAnalyzingAudio && (
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
            )}
          </div>
          <span className="text-2xl font-black text-emerald-400">{stats.bpmRate}%</span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px]">
          {currentAnalyzingSong ? (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className={isAnalyzingAudio ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-slate-500'}>
                  {isAnalyzingAudio ? '실측 중' : currentAnalyzingSong.status === 'COMPLETED' ? '최근 실측' : '분석 대기'}
                </span>
                {currentAnalyzingSong.bpm && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-800 text-emerald-300 font-bold">
                    {currentAnalyzingSong.bpm} BPM
                  </span>
                )}
              </div>
              <span
                className="text-slate-300 font-medium block truncate"
                title={`${currentAnalyzingSong.artist} - ${currentAnalyzingSong.title}`}
              >
                {currentAnalyzingSong.artist} - {currentAnalyzingSong.title}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 block truncate">전곡 BPM 실측 완료</span>
          )}
        </div>
      </div>

      {/* 조성(Key) 산출 완료율 + 현재 분석 곡 표시 */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">조성(Key) 산출 완료율</span>
            {isAnalyzingAudio && (
              <Sparkles className="w-3 h-3 animate-spin text-purple-400" />
            )}
          </div>
          <span className="text-2xl font-black text-purple-400">{stats.keyRate}%</span>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px]">
          {currentAnalyzingSong ? (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className={isAnalyzingAudio ? 'text-purple-400 font-bold flex items-center gap-1' : 'text-slate-500'}>
                  {isAnalyzingAudio ? '산출 중' : currentAnalyzingSong.status === 'COMPLETED' ? '최근 산출' : '분석 대기'}
                </span>
                {currentAnalyzingSong.original_key && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-950/90 border border-purple-800 text-purple-300 font-bold">
                    {currentAnalyzingSong.original_key} Key
                  </span>
                )}
              </div>
              <span
                className="text-slate-300 font-medium block truncate"
                title={`${currentAnalyzingSong.artist} - ${currentAnalyzingSong.title}`}
              >
                {currentAnalyzingSong.artist} - {currentAnalyzingSong.title}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 block truncate">전곡 Key 산출 완료</span>
          )}
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl col-span-2 sm:col-span-1 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> 마지막 갱신
            </span>
            <button
              type="button"
              onClick={onManualRefreshNow}
              title="지금 즉시 갱신 및 타이머 리셋"
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isAutoRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {stats.lastExecution ? (
            <div>
              <span className="text-sm font-bold text-slate-100 block truncate">
                {new Date(stats.lastExecution.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className="text-[10px] text-indigo-400 block truncate mt-0.5">
                {stats.lastExecution.artist} ({stats.lastExecution.count}곡)
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-500">기록 없음</span>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Timer className="w-3 h-3 text-cyan-400" /> 다음 갱신
            </span>
            <span className="font-mono font-bold text-cyan-300">{formatCountdown(countdown)}</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / refreshIntervalSeconds) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
