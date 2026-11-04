'use client';

import React, { useState } from 'react';
import { Sliders, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export type VocalGender = 'MALE' | 'FEMALE' | 'MIXED' | 'ANY';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBand: any;
  onUpdated: (updatedBand: any) => void;
}

export default function ConfigModal({
  isOpen,
  onClose,
  currentBand,
  onUpdated,
}: ConfigModalProps) {
  const [vocalGender, setVocalGender] = useState<VocalGender>(currentBand?.vocal_gender || 'FEMALE');
  const [guitarCount, setGuitarCount] = useState<number>(currentBand?.guitar_count || 1);
  const [hasKeys, setHasKeys] = useState<boolean>(currentBand?.has_keys ?? true);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase
      .from('bands')
      .update({
        vocal_gender: vocalGender,
        guitar_count: guitarCount,
        has_keys: hasKeys,
      })
      .eq('id', currentBand.id)
      .select()
      .single();

    if (data) {
      onUpdated(data);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            밴드 파트 구성 수정
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">보컬 파트</label>
            <select
              value={vocalGender}
              onChange={(e) => setVocalGender(e.target.value as VocalGender)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value="FEMALE">여성 보컬</option>
              <option value="MALE">남성 보컬</option>
              <option value="MIXED">혼성 보컬 (듀엣/코러스)</option>
              <option value="ANY">상관없음</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">일렉 기타 대수</label>
            <select
              value={guitarCount}
              onChange={(e) => setGuitarCount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
            >
              <option value={1}>1기타 (원기타)</option>
              <option value={2}>2기타 (리드 + 세컨)</option>
              <option value={3}>3기타 이상</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">건반(키보드) 파트</label>
            <div className="flex gap-4 mt-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="edit_has_keys"
                  checked={hasKeys === true}
                  onChange={() => setHasKeys(true)}
                />
                건반 있음
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="radio"
                  name="edit_has_keys"
                  checked={hasKeys === false}
                  onChange={() => setHasKeys(false)}
                />
                건반 없음 (기타 대체)
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow"
          >
            구성 저장하기
          </button>
        </form>
      </div>
    </div>
  );
}