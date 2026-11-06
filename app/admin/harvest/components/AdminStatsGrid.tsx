'use client';

import React from 'react';
import { Clock, RefreshCw, Timer } from 'lucide-react';
import { HarvestStats } from '../types';

interface AdminStatsGridProps {
  stats: HarvestStats;
  countdown: number;
  refreshIntervalSeconds: number;
  isAutoRefreshing: boolean;
  onManualRefreshNow: () => void;
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
  onManualRefreshNow,
}: AdminStatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <span className="text-xs text-slate-400 block mb-1">총 수집 곡수</span>
        <span className="text-2xl font-black text-slate-100">{stats.totalSongs}곡</span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <span className="text-xs text-slate-400 block mb-1">수집 대상 아티스트</span>
        <span className="text-2xl font-black text-slate-100">
          {stats.activeArtists}/{stats.totalArtists}팀
        </span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <span className="text-xs text-slate-400 block mb-1">BPM 실측 완료율</span>
        <span className="text-2xl font-black text-emerald-400">{stats.bpmRate}%</span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <span className="text-xs text-slate-400 block mb-1">조성(Key) 산출 완료율</span>
        <span className="text-2xl font-black text-purple-400">{stats.keyRate}%</span>
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

