'use client';

import React from 'react';
import { Settings2, X, Check } from 'lucide-react';

interface EditBandProfileModalProps {
  isOpen: boolean;
  isSavingProfile: boolean;
  editName: string;
  editVocalGender: string;
  editGuitarCount: number;
  editHasKeys: boolean;
  onChangeName: (val: string) => void;
  onChangeVocalGender: (val: string) => void;
  onChangeGuitarCount: (val: number) => void;
  onChangeHasKeys: (val: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function EditBandProfileModal({
  isOpen,
  isSavingProfile,
  editName,
  editVocalGender,
  editGuitarCount,
  editHasKeys,
  onChangeName,
  onChangeVocalGender,
  onChangeGuitarCount,
  onChangeHasKeys,
  onClose,
  onSubmit,
}: EditBandProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => !isSavingProfile && onClose()}
    >
      <div
        className="bg-[#0e1227] border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              밴드 구성 수정
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              설정 저장 시 데이터베이스(DB)와 추천 알고리즘에 즉시 반영됩니다.
            </p>
          </div>
          <button
            type="button"
            disabled={isSavingProfile}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">밴드 이름</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="밴드명을 입력하세요"
              className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">메인 보컬 음역/성별</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeVocalGender('FEMALE')}
                className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  editVocalGender === 'FEMALE'
                    ? 'bg-pink-950/70 border-pink-700 text-pink-300 shadow'
                    : 'bg-[#080a17] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {editVocalGender === 'FEMALE' && <Check className="w-3.5 h-3.5" />}
                여성 보컬
              </button>
              <button
                type="button"
                onClick={() => onChangeVocalGender('MALE')}
                className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  editVocalGender === 'MALE'
                    ? 'bg-blue-950/70 border-blue-700 text-blue-300 shadow'
                    : 'bg-[#080a17] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {editVocalGender === 'MALE' && <Check className="w-3.5 h-3.5" />}
                남성 보컬
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">일렉기타 세션 수</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeGuitarCount(1)}
                className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  editGuitarCount === 1
                    ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300 shadow'
                    : 'bg-[#080a17] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {editGuitarCount === 1 && <Check className="w-3.5 h-3.5" />}
                1기타 (원기타)
              </button>
              <button
                type="button"
                onClick={() => onChangeGuitarCount(2)}
                className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  editGuitarCount === 2
                    ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300 shadow'
                    : 'bg-[#080a17] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {editGuitarCount === 2 && <Check className="w-3.5 h-3.5" />}
                2기타 (리드/리듬)
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">키보드 / 건반 세션</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeHasKeys(true)}
                className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  editHasKeys
                    ? 'bg-purple-950/80 border-purple-700 text-purple-300 shadow'
                    : 'bg-[#080a17] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {editHasKeys && <Check className="w-3.5 h-3.5" />}
                건반 있음 (신디/피아노)
              </button>
              <button
                type="button"
                onClick={() => onChangeHasKeys(false)}
                className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  !editHasKeys
                    ? 'bg-slate-900 border-slate-700 text-slate-200 shadow'
                    : 'bg-[#080a17] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {!editHasKeys && <Check className="w-3.5 h-3.5" />}
                건반 없음
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
            <button
              type="button"
              disabled={isSavingProfile}
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition shadow flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSavingProfile ? 'DB 저장 중...' : '설정 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

