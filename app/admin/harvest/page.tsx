'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Sparkles, 
  RefreshCw, 
  Play, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Search, 
  X, 
  ExternalLink,
  ChevronRight,
  Music2
} from 'lucide-react';

interface TargetArtist {
  id: string;
  name: string;
  search_alias?: string;
  vocal_gender?: string;
  priority: number;
  is_active: boolean;
  last_harvested_at?: string;
}

interface SongSuggestion {
  id: string;
  title: string;
  artist: string;
  band_name?: string;
  youtube_url?: string;
  status: 'PENDING' | 'HARVESTED' | 'REJECTED';
  created_at: string;
}

interface SongReport {
  id: string;
  song_id?: string;
  title: string;
  artist: string;
  reason: string;
  created_at: string;
}

export default function AdminHarvestPage() {
  const [artists, setArtists] = useState<TargetArtist[]>([]);
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [reports, setReports] = useState<SongReport[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isBackfilling, setIsBackfilling] = useState<boolean>(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // 밴드 신규 등록 상태
  const [newArtistName, setNewArtistName] = useState<string>('');
  const [newArtistPriority, setNewArtistPriority] = useState<number>(1);
  const [isAddingArtist, setIsAddingArtist] = useState<boolean>(false);

  // 제보 관리 팝업 상태
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // 제보 단일 수집 액션 상태
  const [previewSong, setPreviewSong] = useState<any>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SongSuggestion | null>(null);
  const [isFetchingSingle, setIsFetchingSingle] = useState<boolean>(false);
  const [isConfirmingSingle, setIsConfirmingSingle] = useState<boolean>(false);

  // 초기 데이터 로드
  async function loadAllData() {
    setLoading(true);
    try {
      const [resArtists, resSuggestions, resReports] = await Promise.all([
        fetch('/api/artists'),
        fetch('/api/songs/suggest'),
        fetch('/api/songs/report'),
      ]);

      const [dataArtists, dataSuggestions, dataReports] = await Promise.all([
        resArtists.json(),
        resSuggestions.json(),
        resReports.json(),
      ]);

      if (dataArtists.success) setArtists(dataArtists.artists || []);
      if (dataSuggestions.success) setSuggestions(dataSuggestions.suggestions || []);
      if (dataReports.success) setReports(dataReports.reports || []);
    } catch (err: any) {
      console.error('[관리자 데이터 로드 실패]:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // 💡 [신규 기능] LLM을 통한 아티스트 search_alias 및 vocal_gender 재추론 및 갱신
  async function handleRefreshWithLLM(artist: TargetArtist) {
    if (!confirm(`'${artist.name}' 밴드의 검색 키워드(search_alias)와 보컬 성별을 LLM으로 다시 분석하여 갱신할까요?`)) {
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
        alert(data.message);
        // 클라이언트 목록 State 즉시 반영
        setArtists((prev) =>
          prev.map((a) => (a.id === artist.id ? { ...a, ...data.artist } : a))
        );
      } else {
        alert(`갱신 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setRefreshingId(null);
    }
  }

  // 신규 밴드 추가
  async function handleAddArtist(e: React.FormEvent) {
    e.preventDefault();
    if (!newArtistName.trim()) return;

    setIsAddingArtist(true);
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
        alert(data.message || '밴드가 성공적으로 등록되었습니다.');
        setNewArtistName('');
        setNewArtistPriority(1);
        loadAllData();
      } else {
        alert(`등록 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setIsAddingArtist(false);
    }
  }

  // 밴드 삭제
  async function handleDeleteArtist(id: string, name: string) {
    if (!confirm(`'${name}' 밴드를 수집 큐에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/artists?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setArtists((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(`삭제 실패: ${data.message}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    }
  }

  // 다음 밴드 즉시 수집 트리거
  async function handleTriggerSync() {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/songs/sync');
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.lastExecution) {
          alert(`[수집 완료] 아티스트: ${data.lastExecution.artist}\n신규 추가된 곡: ${data.lastExecution.count}곡 (${data.lastExecution.vocal_gender || '기본'})`);
        } else {
          alert(data.message || '수집 작업을 정상 완료했습니다.');
        }
        loadAllData();
      } else {
        alert(`수집 실패: ${data.error || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }

  // 오디오 백필(BPM/Key) 즉시 실행 트리거
  async function handleTriggerBackfill() {
    setIsBackfilling(true);
    try {
      const res = await fetch('/api/songs/backfill-audio');
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`[오디오 백필 완료] ${data.processedCount || 0}곡의 오디오 파형(BPM 및 Key)이 업데이트되었습니다.`);
      } else {
        alert(`백필 실패: ${data.error || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setIsBackfilling(false);
    }
  }

  // [제보 관리] 4단계: 단일 곡 우선 수집 (FETCH + 실측 오디오 분석 동시 진행)
  async function handleFetchSingleSuggestion(item: SongSuggestion) {
    setSelectedSuggestion(item);
    setPreviewSong(null);
    setIsFetchingSingle(true);

    try {
      const res = await fetch('/api/songs/suggest/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_id: item.id,
          title: item.title,
          artist: item.artist,
          user_youtube_url: item.youtube_url,
          action: 'FETCH',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewSong(data.previewSong);
      } else {
        alert(`단일 수집 조회 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setIsFetchingSingle(false);
    }
  }

  // [제보 관리] 5 & 6단계: DB 최종 추가 확정
  async function handleConfirmSingleSuggestion() {
    if (!selectedSuggestion || !previewSong) return;

    setIsConfirmingSingle(true);
    try {
      const res = await fetch('/api/songs/suggest/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_id: selectedSuggestion.id,
          action: 'CONFIRM',
          song_data: previewSong,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'DB에 최종 추가되었습니다.');
        setPreviewSong(null);
        setSelectedSuggestion(null);
        loadAllData();
      } else {
        alert(`DB 추가 실패: ${data.message || '오류 발생'}`);
      }
    } catch (err: any) {
      alert(`통신 오류: ${err.message}`);
    } finally {
      setIsConfirmingSingle(false);
    }
  }

  const pendingSuggestions = suggestions.filter((s) => s.status === 'PENDING');

  return (
    <main className="min-h-screen bg-[#070913] text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 상단 관리자 툴바 & 타이틀 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                We.Band.Chu 관리자 대시보드
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                수집 & 백필 콘솔
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              밴드 큐 기반 정기 수집(5분), 실측 오디오 백필(1분), 제보 곡 단일 우선 수집을 제어합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-xs font-bold transition shadow"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>신고 접수 ({reports.length}건)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSuggestModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 text-purple-200 text-xs font-bold transition shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>제보받은 곡 ({pendingSuggestions.length}건)</span>
            </button>

            <button
              type="button"
              disabled={isBackfilling}
              onClick={handleTriggerBackfill}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBackfilling ? 'animate-spin' : ''}`} />
              <span>{isBackfilling ? '백필 실행 중...' : '기존곡 오디오 백필'}</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={handleTriggerSync}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
              <span>{isSyncing ? '수집 진행 중...' : '다음 밴드 즉시 수집'}</span>
            </button>
          </div>
        </header>

        {/* 신규 수집 대상 밴드 등록 폼 */}
        <section className="bg-[#0b0e20]/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            신규 수집 대상 밴드 추가 (LLM 자동 별칭/성별 분석)
          </h2>
          
          <form onSubmit={handleAddArtist} className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              required
              value={newArtistName}
              onChange={(e) => setNewArtistName(e.target.value)}
              placeholder="추가할 밴드 또는 아티스트명 (예: 한로로, 유다빈밴드, 소란, 나상현씨밴드...)"
              className="flex-1 w-full bg-[#080a17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <select
              value={newArtistPriority}
              onChange={(e) => setNewArtistPriority(Number(e.target.value))}
              className="w-full sm:w-36 bg-[#080a17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value={1}>1순위 (최우선)</option>
              <option value={2}>2순위 (일반)</option>
              <option value={3}>3순위 (후순위)</option>
            </select>

            <button
              type="submit"
              disabled={isAddingArtist}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingArtist ? 'LLM 분석 및 등록 중...' : '밴드 큐 추가'}</span>
            </button>
          </form>
        </section>

        {/* 수집 대상 밴드 대기열 목록 */}
        <section className="bg-[#0b0e20]/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              수집 대상 밴드 큐 ({artists.length}팀)
            </h2>
            <button
              type="button"
              onClick={loadAllData}
              className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 새로고침
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
              밴드 목록 로드 중...
            </div>
          ) : artists.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              등록된 수집 대상 밴드가 없습니다. 상단에서 밴드를 추가해 보세요!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/90 text-slate-500 text-[11px]">
                    <th className="py-2.5 px-3">밴드명</th>
                    <th className="py-2.5 px-3">검색 키워드 (search_alias)</th>
                    <th className="py-2.5 px-3">보컬 성별</th>
                    <th className="py-2.5 px-3">우선순위</th>
                    <th className="py-2.5 px-3">마지막 수집 일시</th>
                    <th className="py-2.5 px-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {artists.map((artist) => (
                    <tr key={artist.id} className="hover:bg-[#111429] transition">
                      <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                        <Music2 className="w-3.5 h-3.5 text-indigo-400" />
                        {artist.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {artist.search_alias || artist.name}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          artist.vocal_gender === 'FEMALE'
                            ? 'bg-pink-950/70 border-pink-800/70 text-pink-300'
                            : artist.vocal_gender === 'MALE'
                            ? 'bg-blue-950/70 border-blue-800/70 text-blue-300'
                            : 'bg-purple-950/70 border-purple-800/70 text-purple-300'
                        }`}>
                          {artist.vocal_gender === 'FEMALE' ? '여성 보컬' : artist.vocal_gender === 'MALE' ? '남성 보컬' : '혼성/객원'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[11px] font-semibold ${
                          artist.priority === 1
                            ? 'text-amber-400 font-bold'
                            : artist.priority === 2
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }`}>
                          {artist.priority === 1 ? '1순위 (최우선)' : artist.priority === 2 ? '2순위 (일반)' : '3순위 (완료/후순위)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {artist.last_harvested_at ? new Date(artist.last_harvested_at).toLocaleString('ko-KR') : '미수집 (대기)'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 💡 [신규 버튼] LLM 정보 갱신 버튼 */}
                          <button
                            type="button"
                            disabled={refreshingId === artist.id}
                            onClick={() => handleRefreshWithLLM(artist)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-[11px] font-semibold transition disabled:opacity-50"
                            title="LLM으로 검색 별칭 및 보컬 성별 재추론"
                          >
                            <Sparkles className={`w-3 h-3 ${refreshingId === artist.id ? 'animate-spin' : ''}`} />
                            <span>{refreshingId === artist.id ? '분석 중...' : '정보 갱신'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteArtist(artist.id, artist.name)}
                            className="p-1.5 rounded-lg border border-rose-900/40 bg-rose-950/30 text-rose-400 hover:bg-rose-900/60 transition"
                            title="밴드 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* 제보받은 곡 관리 모달 (단일 우선 수집 플로우) */}
      {isSuggestModalOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsSuggestModalOpen(false)}
        >
          <div 
            className="bg-[#0e1227] border border-slate-800 rounded-3xl w-full max-w-3xl p-6 shadow-2xl space-y-5 text-xs text-slate-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  제보받은 곡 관리 ({pendingSuggestions.length}건 대기)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  유저들이 워크스페이스에서 제보한 곡입니다. '해당 곡 우선 수집'을 누르면 즉시 실측 오디오 분석과 함께 등록할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {pendingSuggestions.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  대기 중인 제보 곡이 없습니다.
                </div>
              ) : (
                pendingSuggestions.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3.5 bg-[#080a17] border border-slate-800 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{item.title}</span>
                          <span className="text-[11px] text-indigo-400 font-semibold">• {item.artist}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          제보 밴드: <span className="text-slate-300">{item.band_name || '미기재'}</span> | {new Date(item.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isFetchingSingle && selectedSuggestion?.id === item.id}
                        onClick={() => handleFetchSingleSuggestion(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow shrink-0 disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>{isFetchingSingle && selectedSuggestion?.id === item.id ? '파형 분석 중...' : '해당 곡 우선 수집'}</span>
                      </button>
                    </div>

                    {/* 우선 수집 미리보기 결과창 */}
                    {previewSong && selectedSuggestion?.id === item.id && (
                      <div className="p-3 bg-[#11142e] border border-purple-800/80 rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
                          <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            실측 음원 파형 분석 완료
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {previewSong.bpm ? `${previewSong.bpm} BPM` : 'BPM 대기'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                              {previewSong.original_key || '원키 유지'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-slate-200 font-bold block">{previewSong.title}</span>
                            <span className="text-[11px] text-slate-400">{previewSong.artist} • {previewSong.genre}</span>
                          </div>

                          {previewSong.preview_url && (
                            <audio controls src={previewSong.preview_url} className="h-8 max-w-[200px]" />
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={isConfirmingSingle}
                            onClick={handleConfirmSingleSuggestion}
                            className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isConfirmingSingle ? 'DB 저장 중...' : '확인 후 DB 최종 추가'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 곡 신고 내역 모달 */}
      {isReportModalOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsReportModalOpen(false)}
        >
          <div 
            className="bg-[#0e1227] border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-xs text-slate-200 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  유저 신고 접수 내역 ({reports.length}건)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  합주곡 부적합 또는 잘못된 음원 정보로 신고된 곡 목록입니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {reports.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  접수된 신고 내역이 없습니다.
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="p-3 bg-[#080a17] border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{report.title} ({report.artist})</span>
                      <span className="text-[10px] text-slate-500">{new Date(report.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/40 p-2 rounded-lg">
                      사유: {report.reason}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}