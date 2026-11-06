'use client';

import React from 'react';
import { Radio, X, Plus } from 'lucide-react';

interface AddArtistModalProps {
  isOpen: boolean;
  newArtistName: string;
  newArtistPriority: number;
  addingArtist: boolean;
  onChangeName: (val: string) => void;
  onChangePriority: (val: number) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddArtistModal({
  isOpen,
  newArtistName,
  newArtistPriority,
  addingArtist,
  onChangeName,
  onChangePriority,
  onClose,
  onSubmit,
}: AddArtistModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" />
            신규 수집 대상 밴드 등록
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              밴드 / 아티스트명 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newArtistName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="예: 검정치마, 소란, 루시, 데이식스..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">수집 우선순위</label>
            <select
              value={newArtistPriority}
              onChange={(e) => onChangePriority(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value={1}>1순위 (최우선 수집)</option>
              <option value={2}>2순위 (일반)</option>
              <option value={3}>3순위 (후순위)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={addingArtist}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition shadow flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {addingArtist ? '등록 중...' : '수집 대상에 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

