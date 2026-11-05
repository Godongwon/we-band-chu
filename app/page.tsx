'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music2, Radio, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [bandName, setBandName] = useState<string>('');
  const [accessCode, setAccessCode] = useState<string>('');
  const [vocalGender, setVocalGender] = useState<string>('FEMALE');
  const [guitarCount, setGuitarCount] = useState<number>(1);
  const [hasKeys, setHasKeys] = useState<boolean>(true);

  const [isNewBand, setIsNewBand] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 이미 로그인 세션이 남아있다면 워크스페이스로 자동 진입
  useEffect(() => {
    try {
      const stored = localStorage.getItem('current_band');
      if (stored) {
        router.replace('/workspace');
      }
    } catch (e) {
      console.error(e);
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!bandName.trim()) {
      setErrorMsg('밴드 이름을 입력해 주세요.');
      return;
    }
    if (!accessCode.trim()) {
      setErrorMsg('비밀번호(입장 코드)를 입력해 주세요.');
      return;
    }

    // 밴드 프로필 구성 객체 생성
    const bandData = {
      name: bandName.trim(),
      access_code: accessCode.trim(),
      vocal_gender: vocalGender,
      guitar_count: guitarCount,
      has_keys: hasKeys,
      logged_in_at: new Date().toISOString(),
    };

    // 로컬 스토리지에 세션 저장 후 워크스페이스로 이동
    localStorage.setItem('current_band', JSON.stringify(bandData));
    window.location.href = '/workspace';
  }

  return (
    <main className="min-h-screen bg-[#070913] text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#0e1227] border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
        
        {/* 서비스 타이틀 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              We.Band.Chu
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              우밴추
            </span>
          </div>
          <p className="text-xs text-slate-400">
            여성 보컬 중심 밴드 합주곡 큐레이션 & 워크스페이스
          </p>
        </div>

        {/* 탭: 기존 밴드 입장 / 신규 밴드 등록 */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#080a17] rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setIsNewBand(false)}
            className={`py-2 rounded-lg font-bold transition ${
              !isNewBand ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            기존 밴드 입장
          </button>
          <button
            type="button"
            onClick={() => setIsNewBand(true)}
            className={`py-2 rounded-lg font-bold transition ${
              isNewBand ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            새 밴드 시작하기
          </button>
        </div>

        {/* 입장 / 등록 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">밴드 이름</label>
            <input
              type="text"
              required
              value={bandName}
              onChange={(e) => setBandName(e.target.value)}
              placeholder="예: 루시드 밴드"
              className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              입장 비밀번호 <span className="text-slate-500 text-[10px]">(간편 4자리 이상)</span>
            </label>
            <input
              type="password"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 신규 등록일 때만 표시되는 악기 구성 옵션 */}
          {isNewBand && (
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-slate-400 block mb-1">보컬 음역</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVocalGender('FEMALE')}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      vocalGender === 'FEMALE'
                        ? 'bg-pink-950/70 border-pink-700 text-pink-300'
                        : 'bg-[#080a17] border-slate-800 text-slate-400'
                    }`}
                  >
                    여성 보컬
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocalGender('MALE')}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      vocalGender === 'MALE'
                        ? 'bg-blue-950/70 border-blue-700 text-blue-300'
                        : 'bg-[#080a17] border-slate-800 text-slate-400'
                    }`}
                  >
                    남성 보컬
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">기타 대수</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGuitarCount(1)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      guitarCount === 1
                        ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300'
                        : 'bg-[#080a17] border-slate-800 text-slate-400'
                    }`}
                  >
                    1기타
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuitarCount(2)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      guitarCount === 2
                        ? 'bg-indigo-950/70 border-indigo-700 text-indigo-300'
                        : 'bg-[#080a17] border-slate-800 text-slate-400'
                    }`}
                  >
                    2기타
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">건반(신디사이저)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHasKeys(true)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      hasKeys
                        ? 'bg-purple-950/70 border-purple-700 text-purple-300'
                        : 'bg-[#080a17] border-slate-800 text-slate-400'
                    }`}
                  >
                    건반 있음
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasKeys(false)}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      !hasKeys
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-[#080a17] border-slate-800 text-slate-400'
                    }`}
                  >
                    건반 없음
                  </button>
                </div>
              </div>
            </div>
          )}

          {errorMsg && <p className="text-rose-400 text-xs font-medium">{errorMsg}</p>}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-2 mt-4"
          >
            <span>{isNewBand ? '밴드 생성 및 워크스페이스 입장' : '워크스페이스 입장하기'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </main>
  );
}