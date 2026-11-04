'use client';

import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  AlertCircle, 
  Flame, 
  SlidersHorizontal, 
  Heart, 
  Search, 
  Radio, 
  LogOut 
} from 'lucide-react';

interface SongItem {
  id?: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  original_key: string;
  recommended_key: string;
  has_live_performance: boolean;
  has_instrument_cover?: boolean;
  youtube_url?: string;
  reason?: string;
}

export default function WorkspacePage({ currentBand }: { currentBand?: any }) {
  // 기존 currentBand 상태/props를 우선 참조하고, 없을 때만 기본값 폴백
  const [bandProfile, setBandProfile] = useState({
    name: currentBand?.name || '우리 밴드',
    vocal_gender: currentBand?.vocal_gender || 'FEMALE',
    guitar_count: currentBand?.guitar_count ?? 1,
    has_keys: currentBand?.has_keys ?? true,
  });

  // 상위나 컨텍스트에서 currentBand가 변경될 경우 동기화
  useEffect(() => {
    if (currentBand) {
      setBandProfile({
        name: currentBand.name || '우리 밴드',
        vocal_gender: currentBand.vocal_gender || 'FEMALE',
        guitar_count: currentBand.guitar_count ?? 1,
        has_keys: currentBand.has_keys ?? true,
      });
    }
  }, [currentBand]);

  const [activeTab, setActiveTab] = useState<string>('HIGH_TENSION');
  const [recommendedSongs, setRecommendedSongs] = useState<SongItem[]>([]);
  const [repertoire, setRepertoire] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 추천곡 불러오기 함수
  async function fetchRecommendations(tabKey: string = activeTab) {
    setLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: tabKey,
          bandProfile: bandProfile,
          excludeTitles: repertoire.map((r) => r.title),
        }),
      });

      const data = await res.json();
      if (res.ok && data.recommendations) {
        setRecommendedSongs(data.recommendations);
      }
    } catch (err: any) {
      console.error('[클라] 추천 로드 실패:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecommendations(activeTab);
  }, [activeTab]);

  // 💡 [핵심] 느낌표(!) 클릭 시 Supabase song_reports로 직접 전송하는 신고 함수
  async function handleReportSong(song: SongItem) {
    console.log(`[클라] 곡 신고 및 제외 처리: ${song.title}`);

    const reason = prompt(
      `'${song.title} (${song.artist})' 곡을 신고하시겠습니까?\n사유를 입력해 주세요 (예: 비밴드 곡, 보컬 성별 오류, 영상 오류):`,
      '비밴드 곡 또는 잘못된 음원 정보'
    );

    if (reason === null) return; // 취소 누른 경우

    try {
      // 1. 백엔드 API 호출하여 DB에 즉시 영구 저장
      const res = await fetch('/api/songs/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: song.id || null,
          title: song.title,
          artist: song.artist,
          reason: reason.trim() || '비밴드 곡 또는 잘못된 음원 정보',
        }),
      });

      const data = await res.json();
      console.log('[클라] 신고 전송 결과:', data);

      if (res.ok && data.success) {
        alert('신고가 접수되었습니다. 관리자 대시보드에서 검토 후 처리됩니다.');
      } else {
        alert(`신고 저장 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      console.error('[클라] 신고 통신 에러:', err.message);
      alert(`신고 통신 에러: ${err.message}`);
    }

    // 2. 현재 화면의 추천 목록에서 해당 곡 즉시 숨기기
    setRecommendedSongs((prev) => prev.filter((s) => s.title !== song.title));
  }

  // 레퍼토리에 담기
  function handleAddToRepertoire(song: SongItem) {
    if (repertoire.some((r) => r.title === song.title)) {
      alert('이미 레퍼토리에 담긴 곡입니다.');
      return;
    }
    setRepertoire((prev) => [...prev, song]);
    setRecommendedSongs((prev) => prev.filter((s) => s.title !== song.title));
  }

  return (
    <main className="min-h-screen bg-[#070913] text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 상단 네비게이션 헤더 */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                We.Band.Chu
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                우밴추
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-4 border-l border-slate-800">
              <span className="font-bold text-slate-200">{bandProfile.name}</span>
              <span>•</span>
              <span>{bandProfile.vocal_gender === 'FEMALE' ? '여성 보컬' : '남성 보컬'}</span>
              <span>•</span>
              <span>{bandProfile.guitar_count}기타</span>
              <span>•</span>
              <span>{bandProfile.has_keys ? '건반 O' : '건반 X'}</span>
              <button className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
                구성 수정
              </button>
            </div>
          </div>

          <button className="text-slate-500 hover:text-slate-300 p-1.5">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* 상단 곡 검색 인풋 */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="곡명 또는 아티스트 입력 시 정식 음원이 실시간 검색됩니다 (예: 윤하, QWER, DAY6, 실리카겔...)"
            className="w-full bg-[#0d1021] border border-slate-800/80 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition shadow-inner"
          />
        </div>

        {/* 메인 2열 그리드 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* 좌측 패널: 우리 밴드 레퍼토리 */}
          <div className="bg-[#0b0e1e]/60 border border-slate-800/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 text-slate-200">
                <Music className="w-4 h-4 text-indigo-400" />
                우리 밴드 레퍼토리 ({repertoire.length}곡)
              </h2>
              <span className="text-[11px] text-slate-500">후보 → 연습중 변경 시 합주팩 실행</span>
            </div>

            {repertoire.length === 0 ? (
              <div className="border border-dashed border-slate-800/80 rounded-2xl p-16 text-center text-xs text-slate-500">
                등록된 곡이 없습니다. 검색창이나 오른쪽 추천 피드에서 곡을 담아보세요!
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {repertoire.map((song, idx) => (
                  <div key={idx} className="p-3 bg-[#0d1021] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{song.title}</span>
                      <span className="text-[11px] text-slate-400">{song.artist} • {song.bpm}bpm</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 우측 패널: 맞춤 합주 추천 10곡 */}
          <div className="bg-[#0b0e1e]/60 border border-slate-800/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 text-slate-200">
                <Sparkles className="w-4 h-4 text-purple-400" />
                맞춤 합주 추천 10곡
              </h2>
              <button
                type="button"
                disabled={loading}
                onClick={() => fetchRecommendations()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800/80 text-[11px] font-bold text-indigo-300 transition shadow"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>

            {/* 필터 탭 바 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-full border transition shrink-0 ${
                  activeTab === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setActiveTab('REPERTOIRE')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
                  activeTab === 'REPERTOIRE'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🎸 레퍼토리 유사
              </button>
              <button
                onClick={() => setActiveTab('HIGH_TENSION')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
                  activeTab === 'HIGH_TENSION'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🔥 텐션
              </button>
              <button
                onClick={() => setActiveTab('PLAYING_FEEL')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
                  activeTab === 'PLAYING_FEEL'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🎛️ 손맛
              </button>
              <button
                onClick={() => setActiveTab('EMOTIONAL')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border transition shrink-0 ${
                  activeTab === 'EMOTIONAL'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🌙 감성
              </button>
            </div>

            {/* 추천 곡 리스트 */}
            {loading ? (
              <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                밴드 구성 맞춤 합주곡 탐색 중...
              </div>
            ) : recommendedSongs.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-500">
                추천 가능한 곡이 없습니다. 새로고침을 눌러보세요.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {recommendedSongs.map((song, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#0d1021]/80 hover:bg-[#111429] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3 text-xs transition shadow-sm"
                  >
                    {/* 곡 메타데이터 정보 */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm truncate">{song.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          {song.genre || '록/밴드'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span>{song.artist}</span>
                        <span>•</span>
                        <span>{song.recommended_key || song.original_key || '원키 유지'}</span>
                        <span>•</span>
                        <span>{song.bpm}bpm</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[10px]">
                        <span className="text-amber-400/90 flex items-center gap-0.5">
                          🎯 커버 영상
                        </span>
                        <span className="text-slate-400 flex items-center gap-0.5">
                          📺 라이브 무대
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼 그룹 (+ 담기 / ! 신고) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddToRepertoire(song)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" /> 담기
                      </button>

                      {/* 💡 [신고 버튼] 느낌표(!) 클릭 시 handleReportSong 실행 */}
                      <button
                        type="button"
                        onClick={() => handleReportSong(song)}
                        title="곡/음원 정보 신고"
                        className="p-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}