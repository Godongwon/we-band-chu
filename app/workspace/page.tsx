'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Music, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  AlertCircle, 
  Search, 
  LogOut,
  X,
  Play,
  Guitar,
  Sliders,
  ExternalLink,
  Send,
  Users,
  Settings2,
  Check
} from 'lucide-react';

interface SongItem {
  id?: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  original_key: string;
  recommended_key: string;
  has_live_performance?: boolean;
  has_instrument_cover?: boolean;
  youtube_url?: string;
  reason?: string;
}

export default function WorkspacePage({ currentBand }: { currentBand?: any }) {
  const router = useRouter();

  // 밴드 프로필 상태
  const [bandProfile, setBandProfile] = useState({
    name: currentBand?.name || '루시드 밴드',
    vocal_gender: currentBand?.vocal_gender || 'FEMALE',
    guitar_count: currentBand?.guitar_count ?? 1,
    has_keys: currentBand?.has_keys ?? true,
  });

  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // 로그인 세션 검사 (없으면 루트 로그인으로 이동)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('current_band');
      if (stored) {
        const parsed = JSON.parse(stored);
        setBandProfile({
          name: parsed.name || '루시드 밴드',
          vocal_gender: parsed.vocal_gender || 'FEMALE',
          guitar_count: parsed.guitar_count ?? 1,
          has_keys: parsed.has_keys ?? true,
        });
      } else if (!currentBand) {
        window.location.href = '/';
        return;
      }
    } catch (e) {
      console.error('[세션 검사 오류]:', e);
    } finally {
      setIsAuthChecking(false);
    }
  }, [currentBand]);

  // 구성 수정 모달 State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(bandProfile.name);
  const [editVocalGender, setEditVocalGender] = useState<string>(bandProfile.vocal_gender);
  const [editGuitarCount, setEditGuitarCount] = useState<number>(bandProfile.guitar_count);
  const [editHasKeys, setEditHasKeys] = useState<boolean>(bandProfile.has_keys);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>('HIGH_TENSION');
  const [recommendedSongs, setRecommendedSongs] = useState<SongItem[]>([]);
  const [repertoire, setRepertoire] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);

  // 제보 모달 State
  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);
  const [suggestTitle, setSuggestTitle] = useState<string>('');
  const [suggestArtist, setSuggestArtist] = useState<string>('');
  const [suggestYoutubeUrl, setSuggestYoutubeUrl] = useState<string>('');
  const [isSubmittingSuggest, setIsSubmittingSuggest] = useState<boolean>(false);

  // 추천곡 API 호출
  async function fetchRecommendations(tabKey: string = activeTab, profile = bandProfile) {
    setLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: tabKey,
          bandProfile: profile,
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
    if (!isAuthChecking) {
      fetchRecommendations(activeTab);
    }
  }, [activeTab, isAuthChecking]);

  // 로그아웃 핸들러
  function handleLogout() {
    if (confirm(`'${bandProfile.name}' 워크스페이스에서 로그아웃하시겠습니까?`)) {
      localStorage.removeItem('current_band');
      sessionStorage.removeItem('current_band');
      window.location.href = '/';
    }
  }

  function handleOpenEditProfile() {
    setEditName(bandProfile.name);
    setEditVocalGender(bandProfile.vocal_gender);
    setEditGuitarCount(bandProfile.guitar_count);
    setEditHasKeys(bandProfile.has_keys);
    setIsEditProfileOpen(true);
  }

  // 💡 [DB 연동 적용] 실제 Supabase DB 반영 및 로컬 상태/추천곡 동기화
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      alert('밴드명을 입력해 주세요.');
      return;
    }

    const updatedProfile = {
      name: editName.trim(),
      vocal_gender: editVocalGender,
      guitar_count: Number(editGuitarCount),
      has_keys: Boolean(editHasKeys),
    };

    setIsSavingProfile(true);

    try {
      // 1. Supabase bands 테이블에 저장 API 호출
      const res = await fetch('/api/band/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'DB 업데이트 중 오류가 발생했습니다.');
      }

      // 2. React State 및 LocalStorage 갱신
      setBandProfile(updatedProfile);
      localStorage.setItem('current_band', JSON.stringify(updatedProfile));
      setIsEditProfileOpen(false);

      // 3. 변경된 밴드 구성(보컬 음역, 악기 세션)을 반영하여 추천곡 즉시 재호출
      fetchRecommendations(activeTab, updatedProfile);
      alert('밴드 구성이 DB에 정상적으로 반영되었습니다!');
    } catch (err: any) {
      alert(`구성 저장 실패: ${err.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleReportSong(song: SongItem) {
    const reason = prompt(
      `'${song.title} (${song.artist})' 곡을 신고하시겠습니까?\n사유를 입력해 주세요:`,
      '비밴드 곡 또는 잘못된 음원 정보'
    );

    if (reason === null) return;

    try {
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
      if (res.ok && data.success) {
        alert('신고가 접수되었습니다. 관리자 대시보드에서 검토 후 처리됩니다.');
      } else {
        alert(`신고 저장 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`신고 통신 에러: ${err.message}`);
    }

    if (selectedSong?.title === song.title) {
      setSelectedSong(null);
    }
    setRecommendedSongs((prev) => prev.filter((s) => s.title !== song.title));
  }

  function handleAddToRepertoire(song: SongItem) {
    if (repertoire.some((r) => r.title === song.title)) {
      alert('이미 레퍼토리에 담긴 곡입니다.');
      return;
    }
    setRepertoire((prev) => [...prev, song]);
    setRecommendedSongs((prev) => prev.filter((s) => s.title !== song.title));
    if (selectedSong?.title === song.title) {
      setSelectedSong(null);
    }
  }

  async function handleSubmitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestTitle.trim() || !suggestArtist.trim()) {
      alert('곡명과 아티스트명을 입력해 주세요.');
      return;
    }

    setIsSubmittingSuggest(true);
    try {
      const res = await fetch('/api/songs/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestTitle.trim(),
          artist: suggestArtist.trim(),
          band_name: bandProfile.name,
          youtube_url: suggestYoutubeUrl.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('소중한 합주곡 제보 감사합니다! 관리자 검토 및 수집 후 추천 리스트에 반영됩니다.');
        setSuggestTitle('');
        setSuggestArtist('');
        setSuggestYoutubeUrl('');
        setIsSuggestOpen(false);
      } else {
        alert(`제보 전송 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setIsSubmittingSuggest(false);
    }
  }

  if (isAuthChecking) {
    return (
      <main className="min-h-screen bg-[#070913] flex items-center justify-center text-xs text-slate-500">
        밴드 워크스페이스 세션 확인 중...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070913] text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* 상단 헤더 */}
        <header className="flex items-center justify-between pb-3 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              We.Band.Chu
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              우밴추
            </span>
          </div>

          <button 
            type="button"
            onClick={handleLogout}
            title="밴드 로그아웃"
            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition flex items-center gap-1 text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">로그아웃</span>
          </button>
        </header>

        {/* 밴드 프로필 & 액션 툴바 */}
        <div className="bg-[#0b0e20]/80 border border-slate-800/80 rounded-2xl p-3 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-800/80 text-indigo-200 font-bold">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{bandProfile.name}</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              {bandProfile.vocal_gender === 'FEMALE' ? '여성 보컬' : '남성 보컬'}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              {bandProfile.guitar_count}기타
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              {bandProfile.has_keys ? '건반 O' : '건반 X'}
            </span>

            <button 
              type="button"
              onClick={handleOpenEditProfile}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-indigo-500 hover:bg-slate-800 transition flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3 text-indigo-400" />
              <span>구성 수정</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSuggestOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>곡 제보하기</span>
          </button>
        </div>

        {/* 곡 검색창 */}
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

        {/* 2열 메인 컨텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-1">
          {/* 좌측: 우리 밴드 레퍼토리 */}
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
                  <div 
                    key={idx} 
                    onClick={() => setSelectedSong(song)}
                    className="p-3 bg-[#0d1021] hover:bg-[#12162e] border border-slate-800 rounded-xl flex items-center justify-between text-xs cursor-pointer transition"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block">{song.title}</span>
                      <span className="text-[11px] text-slate-400">{song.artist} • {song.bpm}bpm</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-semibold">상세보기</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 우측: 맞춤 합주 추천 10곡 */}
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
                    onClick={() => setSelectedSong(song)}
                    className="p-3.5 bg-[#0d1021]/80 hover:bg-[#111429] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3 text-xs transition shadow-sm cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm truncate group-hover:text-indigo-300 transition">
                          {song.title}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          {song.genre || '록/밴드'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span>{song.artist}</span>
                        <span>•</span>
                        <span>{song.original_key ? `${song.original_key} Key` : (song.recommended_key || '원키 유지')}</span>
                        <span>•</span>
                        <span>{song.bpm}bpm</span>
                      </div>

                      <div className="flex items-center gap-3 pt-1 text-[11px]">
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title} 커버`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 transition cursor-pointer hover:underline"
                        >
                          🎯 커버 영상
                        </a>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title} 라이브`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-0.5 transition cursor-pointer hover:underline"
                        >
                          📺 라이브 무대
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleAddToRepertoire(song)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" /> 담기
                      </button>

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

      {/* 밴드 구성 수정 모달 (DB 저장 연동) */}
      {isEditProfileOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isSavingProfile && setIsEditProfileOpen(false)}
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
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">밴드 이름</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="밴드명을 입력하세요"
                  className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">메인 보컬 음역/성별</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditVocalGender('FEMALE')}
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
                    onClick={() => setEditVocalGender('MALE')}
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
                    onClick={() => setEditGuitarCount(1)}
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
                    onClick={() => setEditGuitarCount(2)}
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
                    onClick={() => setEditHasKeys(true)}
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
                    onClick={() => setEditHasKeys(false)}
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
                  onClick={() => setIsEditProfileOpen(false)}
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
      )}

      {/* 곡 제보하기 팝업 모달 */}
      {isSuggestOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsSuggestOpen(false)}
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
                  제보 밴드: <span className="text-indigo-300 font-bold">{bandProfile.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSuggestion} className="space-y-3.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  곡명 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={suggestTitle}
                  onChange={(e) => setSuggestTitle(e.target.value)}
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
                  onChange={(e) => setSuggestArtist(e.target.value)}
                  placeholder="예: 윤하, QWER, DAY6, 실리카겔"
                  className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  유튜브 링크 (선택)
                </label>
                <input
                  type="url"
                  value={suggestYoutubeUrl}
                  onChange={(e) => setSuggestYoutubeUrl(e.target.value)}
                  placeholder="예: https://youtu.be/... (비워두면 자동 매칭)"
                  className="w-full bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsSuggestOpen(false)}
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
      )}

      {/* 곡 상세 정보 & 파트별 유튜브 악보 모달 */}
      {selectedSong && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSong(null)}
        >
          <div 
            className="bg-[#0e1227] border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 text-xs text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/70">
                    {selectedSong.genre || '밴드/록'}
                  </span>
                  <span className="text-slate-400 text-xs">{selectedSong.artist}</span>
                </div>
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  {selectedSong.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSong(null)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#121633] border border-slate-800/80 p-3 rounded-2xl text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">템포 (BPM)</span>
                <span className="text-base font-black text-emerald-400">
                  {selectedSong.bpm ? `${selectedSong.bpm} BPM` : '분석 대기'}
                </span>
              </div>
              <div className="bg-[#121633] border border-slate-800/80 p-3 rounded-2xl text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">원곡 Key / 추천 Key</span>
                <span className="text-xs font-bold text-purple-300 block mt-1">
                  {selectedSong.original_key 
                    ? `${selectedSong.original_key} (${selectedSong.recommended_key || '원키 유지'})` 
                    : (selectedSong.recommended_key || '원키 유지')}
                </span>
              </div>
              <div className="bg-[#121633] border border-slate-800/80 p-3 rounded-2xl text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">보컬 음역대</span>
                <span className="text-xs font-bold text-pink-300 block mt-1">
                  {bandProfile.vocal_gender === 'FEMALE' ? '여성 보컬 최적화' : '남성 보컬 최적화'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                파트별 악보 및 커버 영상 안내 (클릭 시 유튜브 악보 검색)
              </h4>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 기타 TAB 악보 cover`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-amber-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Guitar className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-slate-200 block group-hover:text-amber-300 transition">일렉기타</span>
                      <span className="text-[10px] text-slate-500">
                        {bandProfile.guitar_count === 1 ? '1기타 편곡' : '2기타 리드/리듬'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5">
                    TAB 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </span>
                </a>

                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 베이스 악보 cover`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-cyan-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-bold text-slate-200 block group-hover:text-cyan-300 transition">베이스</span>
                      <span className="text-[10px] text-slate-500">4현 표준 대응</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5">
                    악보 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </span>
                </a>

                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 드럼 악보 cover`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-emerald-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-slate-200 block group-hover:text-emerald-300 transition">드럼</span>
                      <span className="text-[10px] text-slate-500">{selectedSong.bpm}bpm 리듬 비트</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    악보 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </span>
                </a>

                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 피아노 건반 악보 cover`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-[#090c1d] hover:bg-[#13193a] border border-slate-800/80 hover:border-pink-500/50 rounded-xl flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-pink-400" />
                    <div>
                      <span className="font-bold text-slate-200 block group-hover:text-pink-300 transition">키보드/건반</span>
                      <span className="text-[10px] text-slate-500">
                        {bandProfile.has_keys ? '메인 신디/피아노' : '기타로 대체 가능'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-pink-400 font-semibold flex items-center gap-0.5">
                    건반 검색 <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </span>
                </a>
              </div>
            </div>

            <div className="p-3.5 bg-[#090c1d] border border-slate-800/80 rounded-2xl flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">원곡 및 라이브 풀버전:</span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title} 라이브`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                >
                  <Play className="w-3 h-3 text-slate-400" />
                  라이브 무대
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href={selectedSong.youtube_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${selectedSong.artist} ${selectedSong.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-[11px] font-semibold transition"
                >
                  <Play className="w-3 h-3 fill-rose-300" />
                  원곡 듣기
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => handleReportSong(selectedSong)}
                className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5" /> 곡 오류 신고
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSong(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => handleAddToRepertoire(selectedSong)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow"
                >
                  <Plus className="w-4 h-4" />
                  레퍼토리에 담기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}