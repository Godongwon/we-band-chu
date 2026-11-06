'use client';

import React from 'react';
import { Lock, Radio } from 'lucide-react';

interface AdminAuthGateProps {
  password: string;
  authError: string;
  onChangePassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AdminAuthGate({
  password,
  authError,
  onChangePassword,
  onSubmit,
}: AdminAuthGateProps) {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-950 border border-indigo-800 rounded-xl flex items-center justify-center mx-auto text-indigo-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">관리자 인증</h1>
          <p className="text-xs text-slate-400">수집 모니터링 대시보드에 접근하려면 비밀번호를 입력하세요.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {authError && <p className="text-xs text-rose-400 font-medium">{authError}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4" /> 대시보드 입장
          </button>
        </form>
      </div>
    </main>
  );
}

