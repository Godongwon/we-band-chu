'use client';

import React from 'react';
import { Inbox, AlertTriangle, ShieldAlert, Sparkles, RefreshCw, Languages } from 'lucide-react';

interface AdminActionToolbarProps {
  suggestionsCount: number;
  reportsCount: number;
  isCleaning: boolean;
  isBackfilling: boolean;
  isLocalizingTitles?: boolean;
  triggering: boolean;
  onOpenSuggestions: () => void;
  onOpenReports: () => void;
  onCleanupNonBand: () => void;
  onBackfillAudio: () => void;
  onLocalizeTitles?: () => void;
  onTriggerNow: () => void;
}

export default function AdminActionToolbar({
  suggestionsCount,
  reportsCount,
  isCleaning,
  isBackfilling,
  isLocalizingTitles = false,
  triggering,
  onOpenSuggestions,
  onOpenReports,
  onCleanupNonBand,
  onBackfillAudio,
  onLocalizeTitles,
  onTriggerNow,
}: AdminActionToolbarProps) {
  return (
    <div className="flex items-center justify-start gap-2.5 flex-wrap bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-2xl">
      <button
        type="button"
        onClick={onOpenSuggestions}
        className="relative flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 px-3.5 py-2 rounded-xl text-xs text-indigo-200 font-bold shadow transition shrink-0"
      >
        <Inbox className="w-3.5 h-3.5 text-indigo-400" />
        제보받은 곡
        {suggestionsCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 bg-indigo-500 text-white rounded-full text-[10px] font-bold animate-pulse">
            {suggestionsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onOpenReports}
        className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-700/80 px-3.5 py-2 rounded-xl text-xs text-amber-300 font-semibold shadow transition shrink-0"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        신고된 곡 관리
        {reportsCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold">
            {reportsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        disabled={isCleaning}
        onClick={onCleanupNonBand}
        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-rose-800/80 px-3.5 py-2 rounded-xl text-xs text-rose-300 font-semibold shadow transition disabled:opacity-50 shrink-0"
      >
        <ShieldAlert className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
        비밴드 음원 정리
      </button>

      <button
        type="button"
        disabled={isBackfilling}
        onClick={onBackfillAudio}
        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-purple-800/80 px-3.5 py-2 rounded-xl text-xs text-purple-300 font-semibold shadow transition disabled:opacity-50 shrink-0"
      >
        <Sparkles className={`w-3.5 h-3.5 ${isBackfilling ? 'animate-spin' : ''}`} />
        기존곡 오디오 백필
      </button>

      {onLocalizeTitles && (
        <button
          type="button"
          disabled={isLocalizingTitles}
          onClick={onLocalizeTitles}
          title="Apple Music 한국 스토어 공식 곡명을 조회하여 '한글명 (영문명)' 형태로 일괄 변환"
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-emerald-800/80 px-3.5 py-2 rounded-xl text-xs text-emerald-300 font-semibold shadow transition disabled:opacity-50 shrink-0"
        >
          <Languages className={`w-3.5 h-3.5 ${isLocalizingTitles ? 'animate-spin' : ''}`} />
          {isLocalizingTitles ? '한글 곡명 변환 중...' : '영문 곡명 한글화'}
        </button>
      )}

      <button
        type="button"
        disabled={triggering}
        onClick={onTriggerNow}
        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
        다음 밴드 즉시 수집
      </button>
    </div>
  );
}

