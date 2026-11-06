'use client';

import React from 'react';
import { AlertTriangle, X, ExternalLink, Check, Trash2 } from 'lucide-react';
import { ReportedSong } from '../types';

interface ReportsModalProps {
  isOpen: boolean;
  reports: ReportedSong[];
  onClose: () => void;
  onDismissReport: (report: ReportedSong) => void;
  onDeleteReportedSong: (report: ReportedSong) => void;
}

export default function ReportsModal({
  isOpen,
  reports,
  onClose,
  onDismissReport,
  onDeleteReportedSong,
}: ReportsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            접수된 곡 신고 내역 ({reports.length}건)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {reports.length === 0 ? (
            <div className="p-12 text-center text-slate-500">대기 중인 신고 내역이 없습니다.</div>
          ) : (
            reports.map((report) => (
              <div
                key={report.report_id}
                className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{report.title}</span>
                      <span className="text-slate-400">({report.artist})</span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                        {report.genre}
                      </span>
                    </div>
                    <div className="text-amber-400/90 text-xs mt-1.5 flex items-center gap-1.5">
                      <span className="font-semibold text-amber-500">신고 사유:</span>
                      <span>{report.reason}</span>
                    </div>
                  </div>

                  {report.youtube_url ? (
                    <a
                      href={report.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 transition shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      YouTube 확인
                    </a>
                  ) : (
                    <span className="text-slate-500 text-[11px]">YouTube 링크 없음</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => onDismissReport(report)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    <Check className="w-3.5 h-3.5 text-slate-400" />
                    신고 반려 (정상곡 유지)
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteReportedSong(report)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    곡 영구 삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

