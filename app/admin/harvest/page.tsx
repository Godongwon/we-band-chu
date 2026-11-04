// app/admin/harvest/page.tsx 전체 코드
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Database, 
  RefreshCw, 
  Music2, 
  Radio, 
  Lock, 
  Sparkles, 
  Search, 
  ExternalLink, 
  Plus, 
  X, 
  Clock, 
  Trash2, 
  ShieldAlert,
  CheckSquare,
  Square,
  AlertTriangle,
  Check
} from 'lucide-react';

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

interface ReportedSong {
  report_id: string;
  song_id: string;
  title: string;
  artist: string;
  reason: string;
  created_at: string;
  youtube_url: string | null;
  genre: string;
  bpm: number | null;
  original_key: string | null;
}

export default function HarvestAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [artists, setArtists] = useState<TargetArtist[]>([]);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [reports, setReports] = useState<ReportedSong[]>([]);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>('');

  const [selectedArtist, setSelectedArtist] = useState<string>('ALL');
  const [searchSongQuery, setSearchSongQuery] = useState<string>('');
  const [isBackfilling, setIsBackfilling] = useState<boolean>(false);

  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  const [isAddArtistOpen, setIsAddArtistOpen] = useState<boolean>(false);
  const [newArtistName, setNewArtistName] = useState<string>('');
  const [newArtistPriority, setNewArtistPriority] = useState<number>(1);
  const [addingArtist, setAddingArtist] = useState<boolean>(false);

  const stats = useMemo(() => {
    const totalSongs = songs.length;
    const totalArtists = artists.length;
    const activeArtists = artists.filter((a) => a.is_active !== false).length;
    
    const analyzedBpmCount = songs.filter((s) => s.bpm !== null && s.bpm !== undefined && s.bpm > 0).length;
    const analyzedKeyCount = songs.filter((s) => s.original_key !== null && s.original_key !== undefined && s.original_key.trim() !== '').length;

    const bpmRate = totalSongs > 0 ? Math.round((analyzedBpmCount / totalSongs) * 100) : 0;
    const keyRate = totalSongs > 0 ? Math.round((analyzedKeyCount / totalSongs) * 100) : 0;

    const harvestedArtists = artists
      .filter((a) => a.last_harvested_at)
      .sort((a, b) => new Date(b.last_harvested_at!).getTime() - new Date(a.last_harvested_at!).getTime());

    let lastExecution = null;
    if (harvestedArtists.length > 0) {
      const latest = harvestedArtists[0];
      const count = songs.filter((s) => s.artist === latest.name).length;
      lastExecution = {
        artist: latest.name,
        count: count,
        time: latest.last_harvested_at!,
      };
    }

    return {
      totalSongs,
      totalArtists,
      activeArtists,
      analyzedBpmCount,
      analyzedKeyCount,
      bpmRate,
      keyRate,
      lastExecution,
    };
  }, [songs, artists]);

  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchArtists();
    fetchSongs();
    fetchReports();

    const interval = setInterval(() => {
      fetchArtists();
      fetchSongs();
      fetchReports();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
      } else {
        setAuthError(data.message || '인증에 실패했습니다.');
      }
    } catch (err: any) {
      setAuthError(`통신 에러: ${err.message}`);
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
    try {
      const res = await fetch('/api/songs?limit=2000');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok && data.songs) {
        setSongs(data.songs);
      }
    } catch (err: any) {
      console.error('[관리자] 곡 목록 로드 실패:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // 신고 내역 로드
  async function fetchReports() {
    try {
      const res = await fetch('/api/admin/reports');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (res.ok && data.reports) {
        setReports(data.reports);
      }
    } catch (err: any) {
      console.error('[관리자] 신고 목록 로드 실패:', err.message);
    }
  }

  // 신고 곡 완전 삭제 (DB에서 영구 삭제)
  async function handleDeleteReportedSong(report: ReportedSong) {
    if (!confirm(`'${report.title} (${report.artist})' 곡을 DB에서 영구 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/admin/reports?song_id=${report.song_id}`, { method: 'DELETE' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setLastMessage(`신고 곡 '${report.title}'이 DB에서 영구 삭제되었습니다.`);
        setReports((prev) => prev.filter((r) => r.report_id !== report.report_id));
        setSongs((prev) => prev.filter((s) => s.id !== report.song_id));
      } else {
        alert(`삭제 실패: ${data.message || data.error}`);
      }
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    }
  }

  // 신고 기각 (정상곡 유지)
  async function handleDismissReport(report: ReportedSong) {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.report_id }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setLastMessage(`'${report.title}' 신고를 반려 처리했습니다.`);
        setReports((prev) => prev.filter((r) => r.report_id !== report.report_id));
      } else {
        alert(`반려 실패: ${data.message || data.error}`);
      }
    } catch (err: any) {
      alert(`처리 오류: ${err.message}`);
    }
  }

  async function handleCleanupNonBand() {
    if (!confirm('Classical, Dance, Electronic, OST 등 밴드 합주에 부적합한 음원을 일괄 검사하여 삭제하시겠습니까?')) return;

    setIsCleaning(true);
    setLastMessage('비밴드 장르 음원 검증 및 정리 중...');

    try {
      const res = await fetch('/api/songs/cleanup', { method: 'POST' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        const msg = data.message || `${data.deletedCount || 0}곡 정리 완료`;
        setLastMessage(msg);
        setSelectedSongIds(new Set());
        await fetchSongs();
      } else {
        setLastMessage(`정리 실패: ${data.error || data.message || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      setLastMessage(`정리 오류: ${err.message}`);
    } finally {
      setIsCleaning(false);
    }
  }

  async function handleDeleteSong(e: React.MouseEvent, song: SongItem) {
    e.stopPropagation();
    if (!confirm(`'${song.title} (${song.artist})' 곡을 DB에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/songs?id=${song.id}`, { method: 'DELETE' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setLastMessage(`'${song.title}' 곡이 삭제되었습니다.`);
        setSongs((prev) => prev.filter((s) => s.id !== song.id));
        setSelectedSongIds((prev) => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
      } else {
        alert(`곡 삭제 실패: ${data.message || data.error || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      alert(`곡 삭제 오류: ${err.message}`);
    }
  }

  async function handleDeleteSelectedSongs() {
    if (selectedSongIds.size === 0) return;
    if (!confirm(`선택한 ${selectedSongIds.size}개의 곡을 영구 삭제하시겠습니까?`)) return;

    setIsDeletingSelected(true);
    setLastMessage(`선택한 ${selectedSongIds.size}곡 일괄 삭제 진행 중...`);

    try {
      const res = await fetch('/api/songs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedSongIds) }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setLastMessage(`선택한 ${selectedSongIds.size}곡이 모두 삭제되었습니다.`);
        setSongs((prev) => prev.filter((s) => !selectedSongIds.has(s.id)));
        setSelectedSongIds(new Set());
      } else {
        alert(`일괄 삭제 실패: ${data.message || data.error || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      alert(`일괄 삭제 오류: ${err.message}`);
    } finally {
      setIsDeletingSelected(false);
    }
  }

  function toggleSongSelection(songId: string) {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }

  function toggleSelectAll(currentFilteredSongs: SongItem[]) {
    if (selectedSongIds.size === currentFilteredSongs.length && currentFilteredSongs.length > 0) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(currentFilteredSongs.map((s) => s.id)));
    }
  }

  async function handleAddTargetArtist(e: React.FormEvent) {
    e.preventDefault();
    if (!newArtistName.trim()) {
      alert('밴드(아티스트) 이름을 입력해 주세요.');
      return;
    }

    setAddingArtist(true);

    try {
      const res = await fetch('/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newArtistName.trim(),
          priority: Number(newArtistPriority) || 1,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setLastMessage(`'${newArtistName}' 수집 큐 등록 완료 (LLM 자동 매칭)`);
        setNewArtistName('');
        setNewArtistPriority(1);
        setIsAddArtistOpen(false);
        await fetchArtists();
      } else {
        alert(`밴드 등록 실패: ${data.message || data.error || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setAddingArtist(false);
    }
  }

  async function handleDeleteArtist(e: React.MouseEvent, artist: TargetArtist) {
    e.stopPropagation();
    if (!confirm(`수집 대상 밴드 '${artist.name}'을(를) 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/artists?id=${artist.id}`, { method: 'DELETE' });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (res.ok && data.success) {
        setLastMessage(`'${artist.name}' 수집 대상에서 삭제 완료`);
        if (selectedArtist === artist.name) {
          setSelectedArtist('ALL');
        }
        await fetchArtists();
      } else {
        alert(`밴드 삭제 실패: ${data.message || data.error || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      alert(`삭제 오류: ${err.message}`);
    }
  }

  async function handleTriggerNow() {
    setTriggering(true);
    setLastMessage('다음 아티스트 곡 수집 및 실측 오디오 분석 중...');

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
        setLastMessage(`${artist} ${count}곡 수집/분석 갱신 완료`);
        await fetchArtists();
        await fetchSongs();
      } else {
        setLastMessage(`수집 실패: ${data.error || data.message || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      setLastMessage(`수집 오류: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  }

  async function handleBackfillAudio() {
    if (!confirm('기존 곡들의 오디오(BPM & Key) 실측 백필을 진행하시겠습니까? (최대 10곡씩 순차 처리)')) return;
    setIsBackfilling(true);
    setLastMessage('기존 수집곡 오디오 분석 백필 가동 중...');

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
        setLastMessage(`${data.updatedCount || 0}곡 분석 갱신됨 (남은 대상: ${data.remainingCount || 0}곡)`);
        await fetchSongs();
      } else {
        setLastMessage(`백필 실패: ${data.error || data.message || `HTTP ${res.status}`}`);
      }
    } catch (err: any) {
      setLastMessage(`백필 오류: ${err.message}`);
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

  const isAllSelected = filteredSongs.length > 0 && selectedSongIds.size === filteredSongs.length;

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

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 💡 신고된 음원 관리 버튼 */}
            <button
              type="button"
              onClick={() => setIsReportsOpen(true)}
              className="relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-700/80 px-3 py-2 rounded-xl text-xs text-amber-300 font-semibold shadow transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              신고된 곡 관리
              {reports.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold">
                  {reports.length}
                </span>
              )}
            </button>

            <button
              type="button"
              disabled={isCleaning}
              onClick={handleCleanupNonBand}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-rose-800/80 px-3 py-2 rounded-xl text-xs text-rose-300 font-semibold shadow transition disabled:opacity-50"
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
              비밴드 음원 정리
            </button>

            <button
              type="button"
              disabled={isBackfilling}
              onClick={handleBackfillAudio}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-purple-800/80 px-3.5 py-2 rounded-xl text-xs text-purple-300 font-semibold shadow transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isBackfilling ? 'animate-spin' : ''}`} />
              기존곡 오디오 백필
            </button>

            <button
              type="button"
              disabled={triggering}
              onClick={handleTriggerNow}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition"
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">총 수집 곡수</span>
            <span className="text-2xl font-black text-slate-100">{stats.totalSongs}곡</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">수집 대상 아티스트</span>
            <span className="text-2xl font-black text-slate-100">
              {stats.activeArtists}/{stats.totalArtists}팀
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">BPM 실측 완료율</span>
            <span className="text-2xl font-black text-emerald-400">{stats.bpmRate}%</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">조성(Key) 산출 완료율</span>
            <span className="text-2xl font-black text-purple-400">{stats.keyRate}%</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> 마지막 갱신
            </span>
            {stats.lastExecution ? (
              <div>
                <span className="text-sm font-bold text-slate-100 block truncate">
                  {new Date(stats.lastExecution.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-[10px] text-indigo-400 block truncate mt-0.5">
                  {stats.lastExecution.artist} ({stats.lastExecution.count}곡)
                </span>
              </div>
            ) : (
              <span className="text-sm font-bold text-slate-500">기록 없음</span>
            )}
          </div>
        </div>

        {/* 2열 메인 레이아웃 */}
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
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-indigo-950/70 border-indigo-700 text-indigo-200' 
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold block truncate">{artist.name}</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {artist.last_harvested_at 
                          ? `최근 수집: ${new Date(artist.last_harvested_at).toLocaleDateString()}`
                          : '아직 수집되지 않음'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                        {artist.priority}순위
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteArtist(e, artist)}
                        title={`'${artist.name}' 수집 대상에서 삭제`}
                        className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/80 transition shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 수집 음원 전수 조회 및 선택 삭제 패널 */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-200">
                  <Music2 className="w-4 h-4 text-purple-400" />
                  수집 음원 ({filteredSongs.length}곡)
                  {selectedArtist !== 'ALL' && <span className="text-indigo-400 text-xs">({selectedArtist})</span>}
                </h2>

                {selectedSongIds.size > 0 && (
                  <button
                    type="button"
                    disabled={isDeletingSelected}
                    onClick={handleDeleteSelectedSongs}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    {selectedSongIds.size}개 선택 삭제
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filteredSongs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(filteredSongs)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg transition"
                  >
                    {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5" />}
                    전체선택
                  </button>
                )}

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
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">음원 데이터 로드 중...</div>
            ) : filteredSongs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">조건에 맞는 음원이 없습니다.</div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredSongs.map((song) => {
                  const isChecked = selectedSongIds.has(song.id);

                  return (
                    <div
                      key={song.id}
                      onClick={() => toggleSongSelection(song.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition ${
                        isChecked 
                          ? 'bg-indigo-950/40 border-indigo-600/80' 
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          className="shrink-0 text-slate-400" 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSongSelection(song.id);
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                          )}
                        </div>

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
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          song.bpm 
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}>
                          {song.bpm ? `${song.bpm} BPM` : 'BPM 대기'}
                        </span>

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
                            title="YouTube 음원 열기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSong(e, song)}
                          title={`'${song.title}' 곡 삭제`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-900/60 transition"
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
        </div>

      </div>

      {/* 💡 신고된 음원 관리 모달 */}
      {isReportsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                접수된 곡 신고 내역 ({reports.length}건)
              </h3>
              <button
                type="button"
                onClick={() => setIsReportsOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {reports.length === 0 ? (
                <div className="p-12 text-center text-slate-500">대기 중인 신고 내역이 없습니다.</div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.report_id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{report.title}</span>
                          <span className="text-slate-400">({report.artist})</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                            {report.genre}
                          </span>
                        </div>
                        <div className="text-amber-400/90 text-xs mt-1.5 flex items-center gap-1.5">
                          <span className="font-semibold text-amber-500">신고 사유:</span>
                          <span>{report.reason}</span>
                        </div>
                      </div>

                      {/* 유튜브 링크 열기 */}
                      {report.youtube_url ? (
                        <a
                          href={report.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 transition shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          YouTube 확인
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">YouTube 링크 없음</span>
                      )}
                    </div>

                    {/* 액션 버튼 영역 */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={() => handleDismissReport(report)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                      >
                        <Check className="w-3.5 h-3.5 text-slate-400" />
                        신고 반려 (정상곡 유지)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReportedSong(report)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        곡 영구 삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
                <span className="text-[11px] text-slate-500 mt-1.5 block">
                  💡 영문 표기 및 음원 검색용 별칭은 LLM이 자동으로 분석하여 매칭합니다.
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