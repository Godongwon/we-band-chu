'use client';

import React, { useEffect, useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  Activity, 
  Music2, 
  Calendar, 
  Radio, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Search,
  ExternalLink,
  Sliders,
  Filter,
  Plus,
  X
} from 'lucide-react';

interface HarvestStatus {
  lastExecution: {
    artist: string;
    count: number;
    time: string;
  } | null;
  totalSongs: number;
  totalArtists: number;
  activeArtists: number;
  analyzedBpmCount?: number;
  analyzedKeyCount?: number;
}

interface TargetArtist {
  id: string;
  name: string;
  search_alias: string | null;
  priority: number;
  is_active: boolean;
  last_harvested_at: string | null;
}

interface SongItem {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  bpm: number | null;
  original_key: string | null;
  youtube_url: string | null;
  created_at: string;
}

export default function HarvestAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [status, setStatus] = useState<HarvestStatus | null>(null);
  const [artists, setArtists] = useState<TargetArtist[]>([]);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>('');

  const [selectedArtist, setSelectedArtist] = useState<string>('ALL');
  const [searchSongQuery, setSearchSongQuery] = useState<string>('');
  const [isBackfilling, setIsBackfilling] = useState<boolean>(false);

  const [isAddArtistOpen, setIsAddArtistOpen] = useState<boolean>(false);
  const [newArtistName, setNewArtistName] = useState<string>('');
  const [newArtistAlias, setNewArtistAlias] = useState<string>('');
  const [newArtistPriority, setNewArtistPriority] = useState<number>(1);
  const [addingArtist, setAddingArtist] = useState<boolean>(false);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      console.log('[관리자] 기존 세션 인증 확인됨');
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchStatus();
    fetchArtists();
    fetchSongs();

    const interval = setInterval(() => {
      console.log('[관리자] 실시간 수집 현황 자동 폴링 (주기: 15초)');
      fetchStatus();
      fetchArtists();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    console.log('[관리자] 비밀번호 인증 요청');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        console.log('[관리자] 인증 승인 완료');
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
      } else {
        console.warn('[관리자] 인증 실패:', data.message || '인증 오류');
        setAuthError(data.message || '인증에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('[관리자] 인증 통신 에러:', err.message);
      setAuthError(`통신 에러: ${err.message}`);
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch('/api/songs/harvest-status');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok) {
        setStatus(data);
      }
    } catch (err: any) {
      console.error('[관리자] 수집 현황 로드 에러:', err.message);
    }
  }

  async function fetchArtists() {
    try {
      const res = await fetch('/api/artists');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok && data.artists) {
        setArtists(data.artists);
      }
    } catch (err: any) {
      console.error('[관리자] 아티스트 목록 로드 에러:', err.message);
    }
  }

  async function fetchSongs() {
    setLoading(true);
    console.log('[관리자] 수집 음원 전체 목록 로드 시작');
    try {
      const res = await fetch('/api/songs?limit=2000');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok && data.songs) {
        console.log(`[관리자] 총 ${data.songs.length}곡 로드 완료`);
        setSongs(data.songs);
      }
    } catch (err: any) {
      console.error('[관리자] 곡 목록 로드 실패:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTargetArtist(e: React.FormEvent) {
    e.preventDefault();
    if (!newArtistName.trim()) {
      alert('밴드(아티스트) 이름을 입력해 주세요.');
      return;
    }

    setAddingArtist(true);
    console.log(`[관리자] 수집 대상 밴드 추가: ${newArtistName}`);

    try {
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newArtistName.trim(),
          search_alias: newArtistAlias.trim() || null,
          priority: Number(newArtistPriority) || 1,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setLastMessage(`'${newArtistName}' 수집 큐 등록 완료`);
        console.log(`[관리자] '${newArtistName}' 수집 큐 등록 성공`);
        setNewArtistName('');
        setNewArtistAlias('');
        setNewArtistPriority(1);
        setIsAddArtistOpen(false);
        await fetchArtists();
        await fetchStatus();
      } else {
        console.error('[관리자] 밴드 등록 실패:', data.message || data.error);
        alert(`밴드 등록 실패: ${data.message || data.error || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      console.error('[관리자] 밴드 추가 통신 에러:', err.message);
      alert(`통신 오류: ${err.message}`);
    } finally {
      setAddingArtist(false);
    }
  }

  async function handleTriggerNow() {
    setTriggering(true);
    setLastMessage('다음 아티스트 곡 수집 및 실측 오디오 분석 중...');
    console.log('[관리자] 즉시 수집 트리거 가동');

    try {
      const res = await fetch('/api/songs/sync');
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`서버 응답 파싱 실패 (HTTP ${res.status})`);
      }

      if (res.ok && data.success) {
        const artist = data.lastExecution?.artist || '아티스트';
        const count = data.lastExecution?.count || 0;
        const msg = `${artist} ${count}곡 수집/분석 갱신 완료`;
        console.log(`[관리자] [완료] ${msg}`);
        setLastMessage(msg);
        await fetchStatus();
        await fetchArtists();
        await fetchSongs();
      } else {
        const errorMsg = `수집 실패: ${data.error || data.message || `HTTP ${res.status}`}`;
        console.error(`[관리자] ${errorMsg}`);
        setLastMessage(errorMsg);
      }
    } catch (err: any) {
      const errTxt = `수집 오류: ${err.message}`;
      console.error(`[관리자] ${errTxt}`);
      setLastMessage(errTxt);
    } finally {
      setTriggering(false);
    }
  }

  async function handleBackfillAudio() {
    if (!confirm('기존 곡들의 오디오(BPM & Key) 실측 백필을 진행하시겠습니까? (최대 10곡씩 순차 처리)')) return;
    setIsBackfilling(true);
    setLastMessage('기존 수집곡 오디오 분석 백필 가동 중...');
    console.log('[관리자] 오디오 분석 백필 요청');

    try {
      const res = await fetch('/api/songs/backfill-audio', { method: 'POST' });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`백필 응답 파싱 실패 (HTTP ${res.status})`);
      }

      if (res.ok && data.success) {
        const msg = `${data.updatedCount || 0}곡 분석 갱신됨 (남은 대상: ${data.remainingCount || 0}곡)`;
        console.log(`[관리자] [백필 완료] ${msg}`);
        setLastMessage(msg);
        await fetchStatus();
        await fetchSongs();
      } else {
        const errorMsg = `백필 실패: ${data.error || data.message || `HTTP ${res.status}`}`;
        console.error(`[관리자] ${errorMsg}`);
        setLastMessage(errorMsg);
      }
    } catch (err: any) {
      const errTxt = `백필 오류: ${err.message}`;
      console.error(`[관리자] ${errTxt}`);
      setLastMessage(errTxt);
    } finally {
      setIsBackfilling(false);
    }
  }

  if (!isAuthenticated) {
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

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

  const filteredSongs = songs.filter((s) => {
    const matchesArtist = selectedArtist === 'ALL' || s.artist === selectedArtist;
    const query = searchSongQuery.toLowerCase().trim();
    const matchesSearch = !query || s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query);
    return matchesArtist && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                실시간 음원 수집 및 오디오 분석 모니터
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                수집 파이프라인
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Apple iTunes 30초 오디오 실측 파형 기반 BPM 및 조성(Key) 자동 산출 현황
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isBackfilling}
              onClick={handleBackfillAudio}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-purple-800/80 px-3.5 py-2 rounded-xl text-xs text-purple-300 font-semibold shadow transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isBackfilling ? 'animate-spin' : ''}`} />
              기존곡 오디오 백필
            </button>

            <button
              type="button"
              disabled={triggering}
              onClick={handleTriggerNow}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
              다음 밴드 즉시 수집
            </button>
          </div>
        </header>

        {lastMessage && (
          <div className="p-3 bg-slate-900/90 border border-indigo-900/60 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
            <span>{lastMessage}</span>
            <button onClick={() => setLastMessage('')} className="text-slate-500 hover:text-slate-300 text-xs">닫기</button>
          </div>
        )}

        {/* 핵심 통계 지표 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">총 수집 곡수</span>
            <span className="text-2xl font-black text-slate-100">{status?.totalSongs ?? '-'}곡</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">수집 대상 아티스트</span>
            <span className="text-2xl font-black text-slate-100">
              {status?.activeArtists ?? '-'}/{status?.totalArtists ?? '-'}팀
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">BPM 실측 완료율</span>
            <span className="text-2xl font-black text-emerald-400">
              {status?.totalSongs ? Math.round(((status.analyzedBpmCount || 0) / status.totalSongs) * 100) : 0}%
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">조성(Key) 산출 완료율</span>
            <span className="text-2xl font-black text-purple-400">
              {status?.totalSongs ? Math.round(((status.analyzedKeyCount || 0) / status.totalSongs) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* 2열 메인 레이아웃: 아티스트 목록 및 전체 수집 곡 스크롤뷰 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* 좌측: 수집 대상 아티스트 큐 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200">
                <Radio className="w-4 h-4 text-indigo-400" /> 수집 대상 밴드 ({artists.length}팀)
              </h2>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddArtistOpen(true)}
                  className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow"
                >
                  <Plus className="w-3 h-3" /> 밴드 추가
                </button>

                <button 
                  onClick={() => setSelectedArtist('ALL')} 
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                    selectedArtist === 'ALL' ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-400 border-slate-800'
                  }`}
                >
                  전체
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {artists.map((artist) => {
                const isSelected = selectedArtist === artist.name;

                return (
                  <div
                    key={artist.id}
                    onClick={() => setSelectedArtist(isSelected ? 'ALL' : artist.name)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                      isSelected 
                        ? 'bg-indigo-950/70 border-indigo-700 text-indigo-200' 
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold block">{artist.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {artist.last_harvested_at 
                          ? `최근 수집: ${new Date(artist.last_harvested_at).toLocaleDateString()}` 
                          : '아직 수집되지 않음'}
                      </span>
                    </div>

                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      우선순위 {artist.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 수집 곡 전수 조회 및 실측 오디오 분석 스크롤뷰 */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200">
                <Music2 className="w-4 h-4 text-purple-400" />
                수집 음원 전수 조회 ({filteredSongs.length}곡)
                {selectedArtist !== 'ALL' && <span className="text-indigo-400 text-xs">({selectedArtist})</span>}
              </h2>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchSongQuery}
                  onChange={(e) => setSearchSongQuery(e.target.value)}
                  placeholder="곡명 또는 밴드 검색..."
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">음원 데이터 로드 중...</div>
            ) : filteredSongs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">조건에 맞는 음원이 없습니다.</div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200 truncate">{song.title}</span>
                        <span className="text-slate-400">({song.artist})</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>{song.genre || '장르 미지정'}</span>
                        <span>•</span>
                        <span>{new Date(song.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* BPM 뱃지 */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        song.bpm 
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {song.bpm ? `${song.bpm} BPM` : 'BPM 분석 대기'}
                      </span>

                      {/* Key 뱃지 */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        song.original_key 
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800' 
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {song.original_key ? `${song.original_key} Key` : 'Key 미산출'}
                      </span>

                      {song.youtube_url && (
                        <a
                          href={song.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg transition"
                          title="YouTube 음원"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 수집 대상 밴드 신규 등록 모달 */}
      {isAddArtistOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                신규 수집 대상 밴드 등록
              </h3>
              <button
                type="button"
                onClick={() => setIsAddArtistOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTargetArtist} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  밴드 / 아티스트명 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder="예: 잔나비, 터치드, QWER..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  iTunes 검색 별칭 (선택 사항)
                </label>
                <input
                  type="text"
                  value={newArtistAlias}
                  onChange={(e) => setNewArtistAlias(e.target.value)}
                  placeholder="예: JANNABI (영문명 또는 특정 검색어)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  입력하지 않으면 밴드명 그대로 iTunes 음원을 검색합니다.
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">수집 우선순위</label>
                <select
                  value={newArtistPriority}
                  onChange={(e) => setNewArtistPriority(Number(e.target.value))}
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
                  onClick={() => setIsAddArtistOpen(false)}
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
      )}
    </main>
  );
}