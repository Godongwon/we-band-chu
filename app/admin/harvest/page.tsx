'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  TargetArtist,
  SongItem,
  ReportedSong,
  SuggestionSong,
  HarvestStats,
} from './types';
import AdminAuthGate from './components/AdminAuthGate';
import AdminActionToolbar from './components/AdminActionToolbar';
import AdminStatsGrid, { AnalyzingSongInfo } from './components/AdminStatsGrid';
import TargetArtistPanel from './components/TargetArtistPanel';
import HarvestedSongPanel from './components/HarvestedSongPanel';
import SuggestionsModal from './components/SuggestionsModal';
import ReportsModal from './components/ReportsModal';
import AddArtistModal from './components/AddArtistModal';
import ArtistDetailModal from './components/ArtistDetailModal';

const REFRESH_INTERVAL_SECONDS = 120; // 2분 주기 갱신 및 자동 수집
const BACKFILL_INTERVAL_SECONDS = 60; // 1분 주기 BPM/Key 오디오 실측

export default function HarvestAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [artists, setArtists] = useState<TargetArtist[]>([]);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [reports, setReports] = useState<ReportedSong[]>([]);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);

  const [suggestions, setSuggestions] = useState<SuggestionSong[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState<boolean>(false);
  const [harvestingSuggestionId, setHarvestingSuggestionId] = useState<string | null>(null);
  const [previewHarvestData, setPreviewHarvestData] = useState<{ [id: string]: any }>({});

  const [isArtistPanelOpen, setIsArtistPanelOpen] = useState<boolean>(false);
  const [isSongPanelOpen, setIsSongPanelOpen] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string>('');

  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);

  const [selectedArtist, setSelectedArtist] = useState<string>('ALL');
  const [searchSongQuery, setSearchSongQuery] = useState<string>('');
  const [isBackfilling, setIsBackfilling] = useState<boolean>(false);
  const [currentAnalyzingSong, setCurrentAnalyzingSong] = useState<AnalyzingSongInfo | null>(null);

  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  const [isAddArtistOpen, setIsAddArtistOpen] = useState<boolean>(false);
  const [newArtistName, setNewArtistName] = useState<string>('');
  const [newArtistPriority, setNewArtistPriority] = useState<number>(1);
  const [addingArtist, setAddingArtist] = useState<boolean>(false);
  const [detailArtist, setDetailArtist] = useState<TargetArtist | null>(null);

  const [countdown, setCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(false);

  const stats: HarvestStats = useMemo(() => {
    const totalSongs = songs.length;
    const totalArtists = artists.length;
    const activeArtists = artists.filter((a) => a.is_active !== false).length;

    const analyzedBpmCount = songs.filter(
      (s) => s.bpm !== null && s.bpm !== undefined && s.bpm > 0
    ).length;
    const analyzedKeyCount = songs.filter(
      (s) => s.original_key !== null && s.original_key !== undefined && s.original_key.trim() !== ''
    ).length;

    const bpmRate = totalSongs > 0 ? Math.round((analyzedBpmCount / totalSongs) * 100) : 0;
    const keyRate = totalSongs > 0 ? Math.round((analyzedKeyCount / totalSongs) * 100) : 0;

    const harvested = artists
      .filter((a) => a.last_harvested_at)
      .sort(
        (a, b) => new Date(b.last_harvested_at!).getTime() - new Date(a.last_harvested_at!).getTime()
      );

    let lastExecution = null;
    if (harvested.length > 0) {
      const latest = harvested[0];
      lastExecution = {
        artist: latest.name,
        count: songs.filter((s) => s.artist === latest.name).length,
        time: latest.last_harvested_at!,
      };
    } else if (songs.length > 0 && songs[0].created_at) {
      lastExecution = {
        artist: songs[0].artist,
        count: songs.filter((s) => s.artist === songs[0].artist).length,
        time: songs[0].created_at,
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

  const isBackfillingRef = useRef<boolean>(false);

  const refreshAllData = async (silent = false) => {
    if (!silent) setIsAutoRefreshing(true);
    try {
      await Promise.all([
        fetchArtists(),
        fetchSongs(silent),
        fetchReports(),
        fetchSuggestions(),
      ]);
    } catch (e) {
      console.error('[자동 갱신 오류]:', e);
    } finally {
      if (!silent) setIsAutoRefreshing(false);
    }
  };

  // songs 로드 시 아직 분석 곡 정보가 없으면 대기 중인 첫 곡 또는 최근 완료 곡으로 초기화
  useEffect(() => {
    if (songs.length === 0 || isBackfilling) return;
    setCurrentAnalyzingSong((prev) => {
      if (prev && prev.status === 'COMPLETED') return prev;
      const nextPending = songs.find((s) => !s.bpm || !s.original_key);
      if (nextPending) {
        return {
          title: nextPending.title,
          artist: nextPending.artist,
          bpm: nextPending.bpm,
          original_key: nextPending.original_key,
          status: 'PENDING',
        };
      }
      const latestCompleted = songs.find((s) => s.bpm && s.original_key);
      if (latestCompleted) {
        return {
          title: latestCompleted.title,
          artist: latestCompleted.artist,
          bpm: latestCompleted.bpm,
          original_key: latestCompleted.original_key,
          status: 'COMPLETED',
        };
      }
      return null;
    });
  }, [songs, isBackfilling]);

  // 1분 주기 자동 오디오(BPM & Key) 실측 백필
  const runSilentBackfill = async () => {
    if (isBackfillingRef.current) return;
    isBackfillingRef.current = true;

    const nextPending = songs.find((s) => !s.bpm || !s.original_key);
    if (nextPending) {
      setCurrentAnalyzingSong({
        title: nextPending.title,
        artist: nextPending.artist,
        bpm: nextPending.bpm,
        original_key: nextPending.original_key,
        status: 'ANALYZING',
      });
    }
    setIsBackfilling(true);

    try {
      const res = await fetch('/api/songs/backfill-audio', {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.success && data.updatedCount > 0) {
        const list: any[] = data.analyzedSongs || [];
        if (list.length > 0) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            setCurrentAnalyzingSong({
              title: item.title,
              artist: item.artist,
              bpm: item.bpm,
              original_key: item.original_key,
              status: i < list.length - 1 ? 'ANALYZING' : 'COMPLETED',
            });
            // 각 곡이 분석될 때마다 화면의 songs 상태를 즉시 실시간 반영
            setSongs((prev) =>
              prev.map((s) =>
                s.id === item.id
                  ? { ...s, bpm: item.bpm, original_key: item.original_key }
                  : s
              )
            );
            if (i < list.length - 1) {
              await new Promise((r) => setTimeout(r, 250));
            }
          }
        }
        setLastMessage(
          `[1분 주기 자동 실측] ${data.updatedCount}곡 BPM/Key 산출 완료 (남은 대상: ${data.remainingCount || 0}곡)`
        );
        await fetchSongs(true);
      }
    } catch (e) {
      console.error('[자동 오디오 백필 오류]:', e);
    } finally {
      isBackfillingRef.current = false;
      setIsBackfilling(false);
    }
  };

  // 2분 주기 자동 밴드 음원 수집(iTunes) + 데이터 갱신
  const runAutoHarvestCycle = async () => {
    setIsAutoRefreshing(true);
    try {
      const syncRes = await fetch('/api/songs/sync', { cache: 'no-store' });
      const syncData = await syncRes.json();
      if (syncRes.ok && syncData.success && syncData.lastExecution) {
        const { artist, count } = syncData.lastExecution;
        if (count > 0) {
          setLastMessage(`[2분 주기 자동 수집] ${artist} ${count}곡 수집 및 BPM/Key 실측 완료`);
        }
      }
      await runSilentBackfill();
      await Promise.all([
        fetchArtists(),
        fetchSongs(true),
        fetchReports(),
        fetchSuggestions(),
      ]);
    } catch (e) {
      console.error('[2분 주기 자동 수집/갱신 오류]:', e);
    } finally {
      setIsAutoRefreshing(false);
    }
  };

  // 초기 로드 + Supabase Realtime 실시간 구독 + 15초 백그라운드 동기화 + 탭 포커스 갱신
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshAllData(false);

    const initBackfillTimer = setTimeout(() => {
      runSilentBackfill();
    }, 2000);

    // 1. Supabase Realtime 구독 (DB 변경 발생 시 새로고침 없이 즉시 반영)
    const realtimeChannel = supabase
      .channel('admin-harvest-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'songs' },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.id && (newRow.bpm || newRow.original_key)) {
            setCurrentAnalyzingSong({
              title: newRow.title,
              artist: newRow.artist,
              bpm: newRow.bpm,
              original_key: newRow.original_key,
              status: 'COMPLETED',
            });
          }
          fetchSongs(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'target_artists' },
        () => {
          fetchArtists();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_reports' },
        () => {
          fetchReports();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_suggestions' },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    // 2. 15초 주기 무음 백그라운드 폴링 (Realtime 누락 대비 실시간 동기화 보장)
    const fastSyncInterval = setInterval(() => {
      refreshAllData(true);
    }, 15000);

    // 3. 브라우저 탭 복귀 시 즉시 최신화
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData(true);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearTimeout(initBackfillTimer);
      clearInterval(fastSyncInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      supabase.removeChannel(realtimeChannel);
    };
  }, [isAuthenticated]);

  // 1초 단위 카운트다운 타이머 (순수 카운터만 감소)
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 0 ? REFRESH_INTERVAL_SECONDS : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // 카운트다운 값에 따른 주기 작업 트리거 (최신 state 참조 보장)
  useEffect(() => {
    if (!isAuthenticated) return;

    if (countdown === 0) {
      runAutoHarvestCycle();
      setCountdown(REFRESH_INTERVAL_SECONDS);
    } else if (
      countdown < REFRESH_INTERVAL_SECONDS &&
      countdown % BACKFILL_INTERVAL_SECONDS === 0
    ) {
      runSilentBackfill();
    }
  }, [countdown, isAuthenticated]);

  function handleManualRefreshNow() {
    setCountdown(REFRESH_INTERVAL_SECONDS);
    refreshAllData(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
      } else {
        setAuthError(data.message || data.error || '인증에 실패했습니다.');
      }
    } catch (err: any) {
      setAuthError(`통신 에러: ${err.message}`);
    }
  }

  async function fetchArtists() {
    try {
      const res = await fetch('/api/artists', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.artists) {
        setArtists(data.artists);
        setDetailArtist((prev) => {
          if (!prev) return null;
          const updated = data.artists.find((a: TargetArtist) => a.id === prev.id);
          return updated || null;
        });
      }
    } catch (err: any) {
      console.error('[관리자] 아티스트 목록 로드 에러:', err.message);
    }
  }

  async function fetchSongs(silent = false) {
    if (!silent && songs.length === 0) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/songs?limit=5000', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.songs) {
        setSongs(data.songs);
      }
    } catch (err: any) {
      console.error('[관리자] 곡 목록 로드 실패:', err.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function fetchReports() {
    try {
      const res = await fetch('/api/admin/reports', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.reports) {
        setReports(data.reports);
      }
    } catch (err: any) {
      console.error('[관리자] 신고 목록 로드 실패:', err.message);
    }
  }

  async function fetchSuggestions() {
    try {
      const res = await fetch('/api/songs/suggest', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err: any) {
      console.error('[관리자] 제보 목록 로드 실패:', err.message);
    }
  }

  async function handleRefreshWithLLM(e: React.MouseEvent, artist: TargetArtist) {
    e.stopPropagation();
    if (!confirm(`'${artist.name}' 밴드의 검색 키워드(search_alias)와 보컬 성별을 LLM으로 분석할까요?`)) {
      return;
    }

    setRefreshingId(artist.id);
    try {
      const res = await fetch('/api/artists/refresh-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: artist.id, name: artist.name }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastMessage(data.message);
        await fetchArtists();
      } else {
        alert(`분석 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setRefreshingId(null);
    }
  }

  async function handleUpdatePriority(artistId: string, newPriority: number) {
    setUpdatingPriorityId(artistId);
    try {
      const res = await fetch('/api/artists/priority', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: artistId, priority: newPriority }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setArtists((prev) =>
          prev.map((a) => (a.id === artistId ? { ...a, priority: newPriority } : a))
        );
        setDetailArtist((prev) =>
          prev && prev.id === artistId ? { ...prev, priority: newPriority } : prev
        );
      } else {
        alert(`순위 변경 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setUpdatingPriorityId(null);
    }
  }

  async function handleUpdateArtistInfo(
    artistId: string,
    payload: {
      search_alias?: string | null;
      vocal_gender?: string | null;
      priority?: number;
    }
  ) {
    try {
      const res = await fetch('/api/artists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: artistId, ...payload }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastMessage(data.message || '밴드 정보가 수정되었습니다.');
        await fetchArtists();
      } else {
        alert(`밴드 정보 수정 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    }
  }

  async function handleHarvestSingleSuggestion(suggestion: SuggestionSong) {
    setHarvestingSuggestionId(suggestion.id);
    try {
      const res = await fetch('/api/songs/suggest/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FETCH',
          title: suggestion.title,
          artist: suggestion.artist,
          user_youtube_url: suggestion.youtube_url,
        }),
      });

      const data = await res.json();
      if (res.ok && data.previewSong) {
        setPreviewHarvestData((prev) => ({ ...prev, [suggestion.id]: data.previewSong }));
      } else {
        alert(`수집 오류: ${data.message || '데이터를 가져오지 못했습니다.'}`);
      }
    } catch (err: any) {
      alert(`수집 통신 실패: ${err.message}`);
    } finally {
      setHarvestingSuggestionId(null);
    }
  }

  async function handleConfirmAddSuggestion(suggestion: SuggestionSong) {
    const songData = previewHarvestData[suggestion.id];
    if (!songData) return;

    try {
      const res = await fetch('/api/songs/suggest/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONFIRM',
          suggestion_id: suggestion.id,
          song_data: songData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastMessage(data.message);
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
        await fetchArtists();
        await fetchSongs();
      } else {
        alert(`추가 실패: ${data.message}`);
      }
    } catch (err: any) {
      alert(`처리 오류: ${err.message}`);
    }
  }

  async function handleDismissSuggestion(suggestionId: string) {
    if (!confirm('이 제보를 반려 처리하시겠습니까?')) return;
    try {
      const res = await fetch('/api/songs/suggest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: suggestionId, status: 'REJECTED' }),
      });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      }
    } catch (err: any) {
      alert(`반려 오류: ${err.message}`);
    }
  }

  async function handleDeleteReportedSong(report: ReportedSong) {
    if (!confirm(`'${report.title} (${report.artist})' 곡을 DB에서 영구 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/admin/reports?song_id=${report.song_id}`, { method: 'DELETE' });
      const data = await res.json();

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

  async function handleDismissReport(report: ReportedSong) {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.report_id }),
      });
      const data = await res.json();

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
    if (!confirm('부적합 음원을 일괄 검사하여 정리하시겠습니까?')) return;

    setIsCleaning(true);
    setLastMessage('비밴드 장르 음원 검증 및 정리 중...');

    try {
      const res = await fetch('/api/songs/cleanup', { method: 'POST' });
      const data = await res.json();

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
      const data = await res.json();

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

      const data = await res.json();

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
      alert('밴드 이름을 입력해 주세요.');
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

      const data = await res.json();

      if (res.ok && data.success) {
        setLastMessage(`'${newArtistName}' 수집 큐 등록 완료`);
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
      const data = await res.json();

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
    setLastMessage('다음 아티스트 곡 수집 파이프라인 가동 중...');

    try {
      const res = await fetch('/api/songs/sync', { cache: 'no-store' });
      const data = await res.json();

      if (res.ok && data.success) {
        const artist = data.lastExecution?.artist || '아티스트';
        const count = data.lastExecution?.count || 0;
        setLastMessage(`${artist} ${count}곡 수집/분석 갱신 완료`);
        setCountdown(REFRESH_INTERVAL_SECONDS);
        await fetchArtists();
        await fetchSongs(true);
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
    if (!confirm('기존 곡들의 오디오(BPM & Key) 실측 백필을 진행하시겠습니까? (최대 10곡씩 순차 처리)'))
      return;
    const nextPending = songs.find((s) => !s.bpm || !s.original_key);
    if (nextPending) {
      setCurrentAnalyzingSong({
        title: nextPending.title,
        artist: nextPending.artist,
        bpm: nextPending.bpm,
        original_key: nextPending.original_key,
        status: 'ANALYZING',
      });
    }
    setIsBackfilling(true);
    setLastMessage('기존 수집곡 오디오 분석 백필 가동 중...');

    try {
      const res = await fetch('/api/songs/backfill-audio', {
        method: 'POST',
        cache: 'no-store',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const list: any[] = data.analyzedSongs || [];
        if (list.length > 0) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            setCurrentAnalyzingSong({
              title: item.title,
              artist: item.artist,
              bpm: item.bpm,
              original_key: item.original_key,
              status: i < list.length - 1 ? 'ANALYZING' : 'COMPLETED',
            });
            setSongs((prev) =>
              prev.map((s) =>
                s.id === item.id
                  ? { ...s, bpm: item.bpm, original_key: item.original_key }
                  : s
              )
            );
            if (i < list.length - 1) {
              await new Promise((r) => setTimeout(r, 250));
            }
          }
        }
        setLastMessage(
          `${data.updatedCount || 0}곡 분석 갱신됨 (남은 대상: ${data.remainingCount || 0}곡)`
        );
        await fetchSongs(true);
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
      <AdminAuthGate
        password={password}
        authError={authError}
        onChangePassword={setPassword}
        onSubmit={handleVerify}
      />
    );
  }

  const filteredSongs = songs.filter((s) => {
    const matchesArtist = selectedArtist === 'ALL' || s.artist === selectedArtist;
    const query = searchSongQuery.toLowerCase().trim();
    const matchesSearch =
      !query || s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query);
    return matchesArtist && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* 상단 간소화된 헤더 */}
        <header className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              We.Band.Chu
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              우밴추(Admin)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">음원 파이프라인 관리 모니터링</span>
        </header>

        {lastMessage && (
          <div className="p-3 bg-slate-900/90 border border-indigo-900/60 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
            <span>{lastMessage}</span>
            <button
              onClick={() => setLastMessage('')}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              닫기
            </button>
          </div>
        )}

        <AdminActionToolbar
          suggestionsCount={suggestions.length}
          reportsCount={reports.length}
          isCleaning={isCleaning}
          isBackfilling={isBackfilling}
          triggering={triggering}
          onOpenSuggestions={() => setIsSuggestionsOpen(true)}
          onOpenReports={() => setIsReportsOpen(true)}
          onCleanupNonBand={handleCleanupNonBand}
          onBackfillAudio={handleBackfillAudio}
          onTriggerNow={handleTriggerNow}
        />

        <AdminStatsGrid
          stats={stats}
          countdown={countdown}
          refreshIntervalSeconds={REFRESH_INTERVAL_SECONDS}
          isAutoRefreshing={isAutoRefreshing}
          isAnalyzingAudio={isBackfilling}
          currentAnalyzingSong={currentAnalyzingSong}
          onManualRefreshNow={handleManualRefreshNow}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <TargetArtistPanel
            artists={artists}
            isArtistPanelOpen={isArtistPanelOpen}
            selectedArtist={selectedArtist}
            refreshingId={refreshingId}
            updatingPriorityId={updatingPriorityId}
            onTogglePanel={setIsArtistPanelOpen}
            onOpenAddArtist={() => setIsAddArtistOpen(true)}
            onSelectArtist={setSelectedArtist}
            onOpenArtistDetail={(artist) => setDetailArtist(artist)}
            onRefreshWithLLM={handleRefreshWithLLM}
            onUpdatePriority={handleUpdatePriority}
            onDeleteArtist={handleDeleteArtist}
          />

          <HarvestedSongPanel
            isArtistPanelOpen={isArtistPanelOpen}
            isSongPanelOpen={isSongPanelOpen}
            filteredSongs={filteredSongs}
            selectedArtist={selectedArtist}
            selectedSongIds={selectedSongIds}
            isDeletingSelected={isDeletingSelected}
            loading={loading}
            searchSongQuery={searchSongQuery}
            onToggleSongPanel={() => setIsSongPanelOpen((prev) => !prev)}
            onClearArtistFilter={() => setSelectedArtist('ALL')}
            onDeleteSelectedSongs={handleDeleteSelectedSongs}
            onToggleSelectAll={() => toggleSelectAll(filteredSongs)}
            onChangeSearchQuery={setSearchSongQuery}
            onToggleSongSelection={toggleSongSelection}
            onDeleteSong={handleDeleteSong}
          />
        </div>
      </div>

      <SuggestionsModal
        isOpen={isSuggestionsOpen}
        suggestions={suggestions}
        previewHarvestData={previewHarvestData}
        harvestingSuggestionId={harvestingSuggestionId}
        onClose={() => setIsSuggestionsOpen(false)}
        onDismissSuggestion={handleDismissSuggestion}
        onHarvestSingleSuggestion={handleHarvestSingleSuggestion}
        onConfirmAddSuggestion={handleConfirmAddSuggestion}
      />

      <ReportsModal
        isOpen={isReportsOpen}
        reports={reports}
        onClose={() => setIsReportsOpen(false)}
        onDismissReport={handleDismissReport}
        onDeleteReportedSong={handleDeleteReportedSong}
      />

      <AddArtistModal
        isOpen={isAddArtistOpen}
        newArtistName={newArtistName}
        newArtistPriority={newArtistPriority}
        addingArtist={addingArtist}
        onChangeName={setNewArtistName}
        onChangePriority={setNewArtistPriority}
        onClose={() => setIsAddArtistOpen(false)}
        onSubmit={handleAddTargetArtist}
      />

      <ArtistDetailModal
        artist={detailArtist}
        songs={songs}
        isRefreshingLLM={refreshingId === detailArtist?.id}
        onClose={() => setDetailArtist(null)}
        onRefreshWithLLM={handleRefreshWithLLM}
        onUpdateArtistInfo={handleUpdateArtistInfo}
        onDeleteArtist={handleDeleteArtist}
        onFilterByArtist={(artistName) => setSelectedArtist(artistName)}
      />
    </main>
  );
}
