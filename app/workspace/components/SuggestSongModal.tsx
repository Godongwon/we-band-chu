'use client';

import React from 'react';
import { Sparkles, X, Send } from 'lucide-react';

interface SuggestSongModalProps {
  isOpen: boolean;
  bandName: string;
  suggestTitle: string;
  suggestArtist: string;
  suggestYoutubeUrl: string;
  isSubmittingSuggest: boolean;
  onChangeTitle: (val: string) => void;
  onChangeArtist: (val: string) => void;
  onChangeYoutubeUrl: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function SuggestSongModal({
  isOpen,
  bandName,
  suggestTitle,
  suggestArtist,
  suggestYoutubeUrl,
  isSubmittingSuggest,
  onChangeTitle,
  onChangeArtist,
  onChangeYoutubeUrl,
  onClose,
  onSubmit,
}: SuggestSongModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0e1227] border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              합주곡 제보하기
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              제보 밴드: <span className="text-indigo-300 font-bold">{bandName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              곡명 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={suggestTitle}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="예: 사건의 지평선, 고민중독, 한 페이지가 될 수 있게"
              className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              아티스트 / 밴드명 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={suggestArtist}
              onChange={(e) => onChangeArtist(e.target.value)}
              placeholder="예: 한로로, 윤하, QWER, DAY6, 실리카겔"
              className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">유튜브 링크 (선택)</label>
            <input
              type="url"
              value={suggestYoutubeUrl}
              onChange={(e) => onChangeYoutubeUrl(e.target.value)}
              placeholder="예: https://youtu.be/... (비워두면 자동 매칭)"
              className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmittingSuggest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition shadow"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmittingSuggest ? '제보 접수 중...' : '제보하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

