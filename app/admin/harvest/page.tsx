// app/admin/harvest/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Play,
  Video,
  Disc3,
  Database,
  Music,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  LogOut,
  KeyRound,
  AlertCircle,
  X,
  Filter,
} from 'lucide-react';

interface HarvestedSong {
  id: string;
  title: string;
  artist: string;
  genre: string;
  youtube_url?: string;
  live_url?: string;
  cover_url?: string;
  created_at?: string;
}

interface QuotaInfo {
  estimatedUnits: number;
  limitUnits: number;
  isExceeded: boolean;
  usagePercent: number;
}

interface TargetArtist {
  id: string;
  name: string;
  search_alias?: string | null;
  is_active: boolean;
  last_harvested_at?: string;
}

export default function HarvestMonitorPage() {
  // 인증 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);

  // 모니터 대시보드 상태
  const [totalCount, setTotalCount] = useState<number>(0);
  const [songs, setSongs] = useState<HarvestedSong[]>([]);
  const [intervalText, setIntervalText] = useState<string>('동기화 확인 중...');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>('');

  // 💡 선택된 아티스트 필터 상태 (null이면 전체)
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // URL 연결 상태 필터: 'all' | 'missing' | 'completed'
  const [filterStatus, setFilterStatus] = useState<'all' | 'missing' | 'completed'>('all');

  // 아티스트 관리 상태
  const [artists, setArtists] = useState<TargetArtist[]>([]);
  const [newArtistName, setNewArtistName] = useState<string>('');
  const [newArtistAlias, setNewArtistAlias] = useState<string>('');
  const [addingArtist, setAddingArtist] = useState<boolean>(false);

  const [quota, setQuota] = useState<QuotaInfo>({
    estimatedUnits: 0,
    limitUnits: 10000,
    isExceeded: false,
    usagePercent: 0,
  });

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('admin_authenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
    setAuthChecking(false);
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputPassword.trim()) return;

    setVerifying(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`API 경로(/api/admin/verify)를 확인해 주세요. (HTTP ${res.status})`);
      }

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
        setInputPassword('');
      } else {
        setAuthError(data.error || '비밀번호가 올바르지 않습니다.');
      }
    } catch (err: any) {
      setAuthError(err.message || '인증 중 오류가 발생했습니다.');
    } finally {
      setVerifying(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
  }

  function formatInterval(ms: number) {
    if (!ms) return '주기 대기 중';
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds >= 60) {
      const minutes = Math.floor(totalSeconds / 60);
      const remainSec = totalSeconds % 60;
      return remainSec > 0
        ? `${minutes}분 ${remainSec}초 주기 자동 수집 중`
        : `${minutes}분 주기 자동 수집 중`;
    }
    return `${totalSeconds}초 주기 자동 수집 중`;
  }

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/songs/harvest-status?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (res.ok) {
        const data = await res.json();
        setTotalCount(data.totalCount || 0);
        setSongs(data.latestSongs || []);
        if (data.intervalMs) setIntervalText(formatInterval(data.intervalMs));
        if (data.quota) setQuota(data.quota);
        setLastUpdatedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('상태 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchArtists() {
    try {
      const res = await fetch('/api/artists');
      if (res.ok) {
        const data = await res.json();
        setArtists(data.artists || []);
      }
    } catch (err) {
      console.error('아티스트 목록 로드 실패:', err);
    }
  }

  async function handleAddArtist(e: React.FormEvent) {
    e.preventDefault();
    if (!newArtistName.trim()) return;

    setAddingArtist(true);
    try {
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newArtistName.trim(),
          search_alias: newArtistAlias.trim() || null,
        }),
      });

      if (res.ok) {
        setNewArtistName('');
        setNewArtistAlias('');
        await fetchArtists();
      } else {
        const data = await res.json();
        alert(data.error || '아티스트 추가 실패');
      }
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    } finally {
      setAddingArtist(false);
    }
  }

  async function handleToggleArtist(id: string, currentStatus: boolean) {
    try {
      const res = await fetch('/api/artists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      if (res.ok) {
        setArtists((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_active: !currentStatus } : a))
        );
      }
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  }

  async function handleDeleteArtist(id: string, name: string) {
    if (!confirm(`"${name}" 아티스트를 수집 목록에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/artists?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setArtists((prev) => prev.filter((a) => a.id !== id));
        if (selectedArtist === name) setSelectedArtist(null);
      }
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  }

  async function handleDeleteSong(id: string, title: string, artist: string) {
    if (!confirm(`"${artist} - ${title}" 곡을 DB에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/songs?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSongs((prev) => prev.filter((song) => song.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
      } else {
        const data = await res.json();
        alert(data.error || '곡 삭제에 실패했습니다.');
      }
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    }
  }

  async function handleTriggerNow() {
    setTriggering(true);
    setLastMessage('다음 아티스트 곡 수집 중...');
    try {
      const res = await fetch('/api/songs/sync');
      if (res.ok) {
        const data = await res.json();
        const artist = data.lastExecution?.artist || '아티스트';
        const count = data.lastExecution?.count || 0;
        setLastMessage(`[완료] ${artist} ${count}곡 수집/갱신`);
        await fetchStatus();
        await fetchArtists();
      } else {
        setLastMessage('수집 실패 (API 응답 에러)');
      }
    } catch (err: any) {
      setLastMessage('수집 오류: ' + err.message);
    } finally {
      setTriggering(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStatus();
    fetchArtists();
    const timer = setInterval(fetchStatus, 5000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // 💡 선택된 아티스트 필터 적용 후의 대상 곡들
  const artistFilteredSongs = selectedArtist
    ? songs.filter(
        (s) => s.artist.toLowerCase() === selectedArtist.toLowerCase()
      )
    : songs;

  // URL 미연결 곡 수 계산 (현재 선택된 아티스트 기준)
  const missingUrlCount = artistFilteredSongs.filter((s) => !s.youtube_url).length;

  // 최종 렌더링 곡 목록 (아티스트 필터 + URL 상태 필터 동시 적용)
  const displayedSongs = artistFilteredSongs.filter((song) => {
    if (filterStatus === 'missing') return !song.youtube_url;
    if (filterStatus === 'completed') return !!song.youtube_url;
    return true;
  });

  if (authChecking) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400 mb-3 shadow">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black text-slate-100">관리자 인증</h1>
            <p className="text-xs text-slate-400 mt-1">
              수집 모니터링 페이지에 접근하려면 DB 관리자 비밀번호를 입력하세요.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-sm px-3.5 py-2.5 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 pr-10"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
              </div>
              {authError && (
                <p className="text-xs text-rose-400 mt-2 font-medium">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying || !inputPassword.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition shadow flex items-center justify-center gap-1.5"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  관리자 대시보드 입장
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-5xl mx-auto font-sans">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Database className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-black">실시간 유튜브 곡 수집 모니터</h1>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
              {intervalText}
            </span>
            {lastUpdatedTime && (
              <span className="text-[11px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">
                화면 갱신: {lastUpdatedTime}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            아티스트를 클릭하면 수집된 해당 밴드의 곡들만 바로 모아볼 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={triggering}
            onClick={handleTriggerNow}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
          >
            <Play className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            {triggering ? '수집 실행 중...' : '다음 밴드 즉시 수집'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700"
            title="관리자 세션 종료"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </header>

      {/* 1. 상태 요약 카드 3종 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">
              {selectedArtist ? `"${selectedArtist}" 수집 곡 수` : 'DB 적재 완료된 총 곡 수'}
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-black text-indigo-400">
                {selectedArtist ? artistFilteredSongs.length : totalCount}곡
              </span>
              {missingUrlCount > 0 && (
                <span className="text-[11px] text-amber-300 font-bold bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  URL 미연결 {missingUrlCount}곡
                </span>
              )}
            </div>
          </div>
          <Music className="w-8 h-8 text-slate-700" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">YouTube 일일 쿼터 (추정)</span>
            {quota.isExceeded ? (
              <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-1.5 py-0.5 rounded font-bold">
                할당량 소진됨
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">
                {quota.estimatedUnits.toLocaleString()} / 10,000 ({quota.usagePercent}%)
              </span>
            )}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                quota.isExceeded || quota.usagePercent >= 90
                  ? 'bg-rose-500'
                  : quota.usagePercent >= 70
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${quota.isExceeded ? 100 : quota.usagePercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            {quota.isExceeded ? '⚠️ 쿼터 소진 상태: iTunes 메타데이터만 지속 적재' : '일일 기본 10,000 units 기준'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center">
          <span className="text-xs text-slate-400 block mb-1">최근 수집 작업 상태</span>
          <span className="text-sm font-semibold text-emerald-400 truncate">
            {lastMessage || '백그라운드 인터벌 정상 대기 중'}
          </span>
        </div>
      </div>

      {/* 2. 수집 대상 아티스트 DB 관리 패널 (테이블 목록형) */}
      <section className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              수집 대상 아티스트 목록 ({artists.length}팀)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              아티스트명을 클릭하면 하단에 해당 아티스트의 수집 곡들만 필터링됩니다.
            </p>
          </div>

          <form onSubmit={handleAddArtist} className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="밴드명 입력 (예: 체리필터)"
              value={newArtistName}
              onChange={(e) => setNewArtistName(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs px-3 py-2 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500 w-36 sm:w-44 placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={addingArtist || !newArtistName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shrink-0 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              {addingArtist ? 'AI 분석 중...' : '아티스트 추가'}
            </button>
          </form>
        </div>

        <div className="mt-4 border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60 max-h-80 overflow-y-auto">
          {artists.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              등록된 대상 아티스트가 없습니다. 상단에서 추가해 보세요.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold sticky top-0 z-10 backdrop-blur">
                  <th className="py-2.5 px-4 w-28 text-center">수집 상태</th>
                  <th className="py-2.5 px-4">아티스트명 (클릭 시 곡 필터)</th>
                  <th className="py-2.5 px-4">검색 별칭 (iTunes/영문)</th>
                  <th className="py-2.5 px-4 w-44">최근 수집 시각</th>
                  <th className="py-2.5 px-4 w-20 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {artists.map((artist) => {
                  const isSelected = selectedArtist === artist.name;
                  return (
                    <tr
                      key={artist.id}
                      className={`transition-colors group ${
                        isSelected
                          ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleArtist(artist.id, artist.is_active)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                            artist.is_active
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60'
                              : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-400'
                          }`}
                        >
                          {artist.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>수집 중</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-500" />
                              <span>일시정지</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* 💡 아티스트명 클릭 영역 */}
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedArtist(isSelected ? null : artist.name)
                          }
                          className="flex items-center gap-2 font-bold text-slate-100 hover:text-indigo-400 transition group-hover:underline text-left"
                        >
                          <span>{artist.name}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-normal">
                              선택됨
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-4 text-slate-400">
                        {artist.search_alias ? (
                          <span className="bg-slate-800/70 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                            {artist.search_alias}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                        {artist.last_harvested_at
                          ? new Date(artist.last_harvested_at).toLocaleString()
                          : '수집 이력 없음'}
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteArtist(artist.id, artist.name)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-950/30 transition"
                          title="아티스트 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 3. 최근 수집된 곡 목록 테이블 */}
      <section className="mt-8 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              수집된 곡 목록 ({displayedSongs.length}곡)
            </h2>

            {/* 💡 선택된 아티스트 필터 뱃지 및 해제 버튼 */}
            {selectedArtist && (
              <div className="inline-flex items-center gap-1.5 bg-indigo-950 border border-indigo-700 text-indigo-300 px-2.5 py-0.5 rounded-full text-xs font-bold animate-fadeIn">
                <Filter className="w-3 h-3 text-indigo-400" />
                <span>{selectedArtist}</span>
                <button
                  type="button"
                  onClick={() => setSelectedArtist(null)}
                  className="hover:text-white p-0.5 rounded-full hover:bg-indigo-900 transition ml-0.5"
                  title="필터 해제"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* 메타데이터 전용 / 연동 완료 빠른 필터 탭 */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-slate-800 text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              전체 ({artistFilteredSongs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('missing')}
              className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                filterStatus === 'missing'
                  ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>URL 미연결</span>
              {missingUrlCount > 0 && (
                <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {missingUrlCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                filterStatus === 'completed'
                  ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              연동 완료 ({artistFilteredSongs.length - missingUrlCount})
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {displayedSongs.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              {selectedArtist
                ? `"${selectedArtist}"의 조건에 일치하는 곡이 아직 수집되지 않았습니다.`
                : '해당 조건에 일치하는 곡이 없습니다.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {displayedSongs.map((song) => {
                const isMissingUrl = !song.youtube_url;

                return (
                  <div
                    key={song.id}
                    className={`p-3.5 flex items-center justify-between gap-4 transition ${
                      isMissingUrl
                        ? 'bg-amber-950/20 hover:bg-amber-950/30 border-l-4 border-l-amber-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-100 truncate">{song.title}</span>
                        <span className="text-xs text-indigo-300">({song.artist})</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                          {song.genre || '밴드음악'}
                        </span>

                        {isMissingUrl && (
                          <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            메타데이터만 적재됨 (URL 대기)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        수집 시간: {song.created_at ? new Date(song.created_at).toLocaleTimeString() : '-'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {song.youtube_url ? (
                        <a
                          href={song.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] bg-rose-950/80 text-rose-300 border border-rose-800 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-rose-900 transition"
                        >
                          <Disc3 className="w-3 h-3" /> 음원
                        </a>
                      ) : (
                        <span className="text-[11px] bg-slate-900 text-slate-500 border border-slate-800 px-2 py-1 rounded-lg">
                          음원 대기중
                        </span>
                      )}

                      {song.live_url ? (
                        <a
                          href={song.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-900 transition"
                        >
                          <Video className="w-3 h-3" /> 라이브
                        </a>
                      ) : null}

                      {song.cover_url ? (
                        <a
                          href={song.cover_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-amber-900 transition"
                        >
                          <Video className="w-3 h-3" /> 커버
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleDeleteSong(song.id, song.title, song.artist)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition ml-1"
                        title="곡 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}