'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Music, 
  Sparkles, 
  Plus, 
  Check, 
  Trash2, 
  ChevronDown, 
  X, 
  LogOut, 
  Sliders, 
  LogIn,
  Search,
  Video,
  ExternalLink,
  Loader2,
  Disc3,
  FileText,
  BookOpen,
  RefreshCw,
  PlayCircle,
  AlertCircle
} from 'lucide-react';

// ==========================================
// 1. 공통 타입 및 상수 정의
// ==========================================
type StatusType = 'WISHLIST' | 'PRACTICING' | 'COMPLETED' | 'PERFORMED';
type RsvpStatus = 'ATTENDING' | 'LATE' | 'ABSENT' | 'PENDING';
type VocalGender = 'MALE' | 'FEMALE' | 'MIXED' | 'ANY';

type RecommendationCategory = 'ALL' | 'SIMILAR' | 'HIGH_TENSION' | 'PLAYING_FEEL' | 'EMOTIONAL' ;

interface StatusOption {
  value: StatusType;
  label: string;
  badgeStyle: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'WISHLIST', label: '후보', badgeStyle: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  { value: 'PRACTICING', label: '연습중', badgeStyle: 'bg-blue-950/80 text-blue-300 border-blue-800' },
  { value: 'COMPLETED', label: '합주완료', badgeStyle: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' },
  { value: 'PERFORMED', label: '공연완료', badgeStyle: 'bg-purple-950/80 text-purple-300 border-purple-800' },
];

const RECOMMEND_CATEGORIES: { id: RecommendationCategory; label: string }[] = [
  { id: 'ALL', label: '전체' },
  { id: 'SIMILAR', label: '🎸 레퍼토리 유사' },
  { id: 'HIGH_TENSION', label: '🔥 텐션' },
  { id: 'PLAYING_FEEL', label: '🎸 손맛' },
  { id: 'EMOTIONAL', label: '🌙 감성' },
 
];

const AUTO_LOGIN_KEY = 'we_band_chu_auto_login_band_id';

function getPartResources(songTitle: string, artist: string, currentBand: any) {
  const pureTitle = (songTitle || '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/['"‘“’”]/g, '')
    .replace(/official|mv|m\/v/gi, '')
    .trim();

  const akbobadaSearchUrl = `https://www.akbobada.com/searchAll.html?searchKeyword=${encodeURIComponent(pureTitle)}&searchFlag=10&searchSecod=&viewFlag=null&artistOrderBy=null&searchSelect=&searchSelectName=%EC%A0%84%EC%B2%B4`;
  const baseQuery = `${artist} ${pureTitle}`;

  const parts = [
    {
      partName: '보컬 (Vocal)',
      roleLabel: currentBand?.vocal_gender === 'FEMALE' ? '여성 보컬' : currentBand?.vocal_gender === 'MALE' ? '남성 보컬' : '보컬',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' MR 가사')}`,
      sheetSearchUrl: akbobadaSearchUrl,
      sheetSiteName: '악보바다 보컬 악보',
      tip: '원키 대비 보컬 음역대를 확인하고 합주 시 마이크 모니터링 볼륨을 체크하세요.'
    },
    {
      partName: '일렉기타 (Guitar 1 - 리드)',
      roleLabel: '메인 리프 / 솔로',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 기타 강좌 TAB cover')}`,
      sheetSearchUrl: akbobadaSearchUrl,
      sheetSiteName: '악보바다 기타 TAB',
      tip: '솔로 구간 부스트 페달 타이밍과 인트로 메인 리프의 피킹 다이내믹을 맞추세요.'
    }
  ];

  if (currentBand?.guitar_count >= 2) {
    parts.push({
      partName: '일렉기타 (Guitar 2 - 세컨/리듬)',
      roleLabel: currentBand.has_keys ? '리듬 백킹' : '건반 라인 대체 / 코드 백킹',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 리듬기타 백킹 카피')}`,
      sheetSearchUrl: akbobadaSearchUrl,
      sheetSiteName: '악보바다 세컨기타 악보',
      tip: currentBand.has_keys 
        ? '리드기타와 톤 성향이 겹치지 않게 EQ를 조절하세요.'
        : '원곡의 건반 리프/신스를 카피해 공간계 이펙터로 백킹을 메워주세요.'
    });
  }

  parts.push({
    partName: '베이스 (Bass)',
    roleLabel: '루트 및 그루브 인터랙션',
    videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 베이스 커버 bass cover TAB')}`,
    sheetSearchUrl: akbobadaSearchUrl,
    sheetSiteName: '악보바다 베이스 TAB',
    tip: '드럼 킥의 타점과 베이스 어택 포인트를 일치시켜 단단한 로우엔드를 만드세요.'
  });

  parts.push({
    partName: '드럼 (Drum)',
    roleLabel: '템포 유지 및 필인 다이내믹',
    videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 드럼 커버 drum cover 악보')}`,
    sheetSearchUrl: akbobadaSearchUrl,
    sheetSiteName: '악보바다 드럼 악보',
    tip: '원곡 BPM 기준 메트로놈 연습 후 섹션 브레이크를 맞추세요.'
  });

  if (currentBand?.has_keys) {
    parts.push({
      partName: '건반 (Keyboard)',
      roleLabel: '신스 / 피아노 / 패드',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 피아노 커버 건반 카피 keyboard tutorial')}`,
      sheetSearchUrl: akbobadaSearchUrl,
      sheetSiteName: '악보바다 건반 악보',
      tip: '인트로 신스 톤과 벌스 패드 보이싱의 음색을 미리 패치해 두세요.'
    });
  }

  return parts;
}

function PracticeModal({
  song,
  currentBand,
  onClose,
}: {
  song: any;
  currentBand: any;
  onClose: () => void;
}) {
  if (!song || !currentBand) return null;
  const parts = getPartResources(song.title, song.artist, currentBand);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                합주 연습 준비
              </span>
              <h3 className="font-bold text-lg text-slate-100">{song.title}</h3>
              <span className="text-xs text-slate-400">({song.artist})</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              우리 밴드 구성({currentBand.guitar_count}기타, {currentBand.has_keys ? '건반O' : '건반X'})에 맞춘 파트별 카피 영상 및 악보바다 악보 가이드
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto divide-y divide-slate-800/60">
          {parts.map((partItem, idx) => (
            <div key={idx} className="pt-4 first:pt-0 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-indigo-300">{partItem.partName}</span>
                  <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                    {partItem.roleLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={partItem.videoSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Video className="w-3.5 h-3.5" /> 튜토리얼 / 카피 영상
                  </a>

                  <a
                    href={partItem.sheetSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" /> {partItem.sheetSiteName}
                  </a>
                </div>
              </div>

              <p className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/70">
                💡 <strong>파트 팁:</strong> {partItem.tip}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            악보 버튼 클릭 시 악보바다에 등록된 해당 곡의 파트보/TAB 결과가 새 탭에서 열립니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition shadow"
          >
            확인 및 합주 준비 완료
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigModal({
  isOpen,
  onClose,
  currentBand,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentBand: any;
  onUpdated: (updatedBand: any) => void;
}) {
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

export default function Home() {
  const [currentBand, setCurrentBand] = useState<any>(null);
  const [initChecking, setInitChecking] = useState<boolean>(true);

  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [inputBandName, setInputBandName] = useState<string>('');
  const [inputPassword, setInputPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [newVocalGender, setNewVocalGender] = useState<VocalGender>('FEMALE');
  const [newGuitarCount, setNewGuitarCount] = useState<number>(1);
  const [newHasKeys, setNewHasKeys] = useState<boolean>(true);

  const [repertoire, setRepertoire] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [youtubeLoading, setYoutubeLoading] = useState<boolean>(false);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [hasMoreSearch, setHasMoreSearch] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [practiceModalSong, setPracticeModalSong] = useState<any>(null);

  // 레퍼토리 수정 모달 상태
  const [editingRepertoireItem, setEditingRepertoireItem] = useState<any>(null);
  const [editSongTitle, setEditSongTitle] = useState<string>('');
  const [editSongArtist, setEditSongArtist] = useState<string>('');
  const [editPlayedKey, setEditPlayedKey] = useState<string>('');
  const [editBandNotes, setEditBandNotes] = useState<string>('');

  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<RecommendationCategory>('ALL');

  const [reportedTitles, setReportedTitles] = useState<string[]>([]);

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const scrollCategory = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -120 : 120,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function checkAutoLogin() {
      const savedBandId = localStorage.getItem(AUTO_LOGIN_KEY);
      if (savedBandId) {
        const { data: bandData } = await supabase.from('bands').select('*').eq('id', savedBandId).maybeSingle();
        if (bandData) {
          setCurrentBand(bandData);
          await loadBandWorkspace(bandData);
        } else {
          localStorage.removeItem(AUTO_LOGIN_KEY);
        }
      }
      setInitChecking(false);
    }
    checkAutoLogin();
  }, []);

  async function loadBandWorkspace(band: any) {
    setLoading(true);

    const { data: repData } = await supabase
      .from('band_repertoire')
      .select(`id, song_id, status, played_key, band_notes, votes_count, songs (*)`)
      .eq('band_id', band.id)
      .order('created_at', { ascending: false });
    
    const validRep = repData || [];
    setRepertoire(validRep);

    setLoading(false);
    fetchRecommendations(band, 'ALL', [], validRep);
  }

  async function fetchRecommendations(
    band = currentBand,
    category: RecommendationCategory = selectedCategory,
    exclude: string[] = [],
    repList = repertoire
  ) {
    if (!band) return;
    setAiLoading(true);
    try {
      const repertoireSongs = repList.map((r) => ({
        title: r.songs?.title,
        artist: r.songs?.artist,
        status: r.status,
        genre: r.songs?.genre,
        bpm: r.songs?.bpm,
      }));

      const combinedExcludes = Array.from(new Set([...exclude, ...reportedTitles]));

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandProfile: band,
          repertoireSongs,
          category,
          excludeTitles: combinedExcludes,
        }),
      });

      const data = await res.json();
      if (data.recommendations) {
        setAiRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('추천 불러오기 실패:', err);
    } finally {
      setAiLoading(false);
    }
  }

  function handleSelectCategory(cat: RecommendationCategory) {
    setSelectedCategory(cat);
    fetchRecommendations(currentBand, cat, []);
  }

  function handleRefreshRecommendations() {
    const currentTitles = aiRecommendations.map((r) => r.title);
    fetchRecommendations(currentBand, selectedCategory, currentTitles);
  }

  function handleReportSong(badSong: any) {
    const songTitle = badSong.title;
    if (!confirm(`'${songTitle} (${badSong.artist})' 곡을 잘못된 데이터(오류)로 신고하고 목록에서 제외하시겠습니까?`)) {
      return;
    }
    const updatedReported = [...reportedTitles, songTitle];
    setReportedTitles(updatedReported);
    setAiRecommendations((prev) => prev.filter((s) => s.title !== songTitle));
  }

  function handleSearchInputChange(value: string) {
    setSearchQuery(value);
    setIsSearchOpen(true);
    setSearchPage(1);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const trimmed = value.trim();
    if (!trimmed) {
      setYoutubeResults([]);
      setYoutubeLoading(false);
      setHasMoreSearch(false);
      return;
    }

    setYoutubeLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`/api/youtube?q=${encodeURIComponent(trimmed)}&page=1`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.items) {
          setYoutubeResults(data.items);
          setHasMoreSearch(data.hasMore || false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('검색 오류:', err);
      } finally {
        setYoutubeLoading(false);
      }
    }, 250);
  }

  async function handleLoadMore() {
    if (!hasMoreSearch || loadingMore) return;
    setLoadingMore(true);

    const nextPage = searchPage + 1;
    try {
      const res = await fetch(
        `/api/youtube?q=${encodeURIComponent(searchQuery.trim())}&page=${nextPage}`
      );
      const data = await res.json();
      if (data.items) {
        setYoutubeResults((prev) => {
          const prevIds = new Set(prev.map((i) => i.youtubeId));
          const newUnique = data.items.filter((i: any) => !prevIds.has(i.youtubeId));
          return [...prev, ...newUnique];
        });
        setSearchPage(nextPage);
        setHasMoreSearch(data.hasMore || false);
      }
    } catch (err) {
      console.error('더보기 로드 실패:', err);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleAddYouTubeSong(ytSong: any) {
    if (!currentBand) return;
    setActionLoadingId(ytSong.youtubeId);

    try {
      let { data: existingSong } = await supabase
        .from('songs')
        .select('id')
        .ilike('title', ytSong.title)
        .maybeSingle();

      let targetSongId = existingSong?.id;

      if (!targetSongId) {
        const { data: newSong, error: insertErr } = await supabase
          .from('songs')
          .insert({
            title: ytSong.title,
            artist: ytSong.artist,
            original_key: 'C',
            bpm: 120,
            genre: '밴드음악',
            keys_coverable: !currentBand.has_keys,
            youtube_url: ytSong.youtubeUrl,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        targetSongId = newSong.id;
      } else {
        await supabase
          .from('songs')
          .update({
            title: ytSong.title,
            artist: ytSong.artist,
            youtube_url: ytSong.youtubeUrl,
          })
          .eq('id', targetSongId);
      }

      const { data: existingRep } = await supabase
        .from('band_repertoire')
        .select('id')
        .eq('band_id', currentBand.id)
        .eq('song_id', targetSongId)
        .maybeSingle();

      if (existingRep) {
        await supabase
          .from('band_repertoire')
          .update({
            band_notes: 'YouTube 정식 음원 정보로 최신 업데이트 완료',
          })
          .eq('id', existingRep.id);
      } else {
        const { error: repErr } = await supabase.from('band_repertoire').insert({
          band_id: currentBand.id,
          song_id: targetSongId,
          status: 'WISHLIST',
          played_key: 'C',
          band_notes: 'YouTube 정식 음원 등록',
          votes_count: 1,
        });
        if (repErr) throw repErr;
      }

      await loadBandWorkspace(currentBand);
      setIsSearchOpen(false);
      setSearchQuery('');
    } catch (err: any) {
      alert('등록 실패: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleAddAiRecommendedSong(recSong: any) {
    if (!currentBand) return;
    setActionLoadingId(recSong.title);

    try {
      let matchedTrack: any = null;
      try {
        const searchRes = await fetch(`/api/youtube?q=${encodeURIComponent(recSong.artist + ' ' + recSong.title)}&page=1`);
        const text = await searchRes.text();
        const searchData = text ? JSON.parse(text) : {};
        matchedTrack = searchData.items?.[0];
      } catch (ytErr) {
        console.warn('유튜브 매칭 스킵:', ytErr);
      }

      const finalTitle = matchedTrack?.title || recSong.title;
      const finalArtist = matchedTrack?.artist || recSong.artist;
      const finalYoutubeUrl = matchedTrack?.youtubeUrl || '';

      let { data: existingSong } = await supabase
        .from('songs')
        .select('id')
        .ilike('title', finalTitle)
        .maybeSingle();

      let targetSongId = existingSong?.id;

      if (!targetSongId) {
        const { data: newSong, error: insertErr } = await supabase
          .from('songs')
          .insert({
            title: finalTitle,
            artist: finalArtist,
            original_key: recSong.original_key || 'C',
            bpm: recSong.bpm || 120,
            genre: recSong.genre || '밴드음악',
            keys_coverable: !currentBand.has_keys,
            youtube_url: finalYoutubeUrl,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        targetSongId = newSong.id;
      }

      const { data: existingRep } = await supabase
        .from('band_repertoire')
        .select('id')
        .eq('band_id', currentBand.id)
        .eq('song_id', targetSongId)
        .maybeSingle();

      if (!existingRep) {
        const { error: repErr } = await supabase.from('band_repertoire').insert({
          band_id: currentBand.id,
          song_id: targetSongId,
          status: 'WISHLIST',
          played_key: recSong.recommended_key || recSong.original_key || 'C',
          band_notes: 'AI 추천 레퍼토리 추가' + (finalYoutubeUrl ? ' (정식 음원 매칭)' : ''),
          votes_count: 1,
        });
        if (repErr) throw repErr;
      }

      await loadBandWorkspace(currentBand);
    } catch (err: any) {
      alert('추천곡 등록 실패: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleStatusChange(item: any, newStatus: StatusType) {
    if (item.status === newStatus) return;

    if (item.status === 'WISHLIST' && newStatus === 'PRACTICING') {
      setPracticeModalSong(item.songs || item);
    }

    setRepertoire((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: newStatus } : r)));
    await supabase.from('band_repertoire').update({
      status: newStatus,
      completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
    }).eq('id', item.id);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const cleanName = inputBandName.trim();
    if (!cleanName || !inputPassword.trim()) {
      setAuthError('밴드 이름과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const { data: bandData, error } = await supabase
      .from('bands')
      .select('*')
      .eq('name', cleanName)
      .maybeSingle();

    if (error || !bandData) {
      setAuthError('등록되지 않은 밴드 이름입니다.');
      return;
    }

    if (bandData.access_code && bandData.access_code !== inputPassword.trim()) {
      setAuthError('비밀번호가 일치하지 않습니다.');
      return;
    }

    localStorage.setItem(AUTO_LOGIN_KEY, bandData.id);
    setCurrentBand(bandData);
    await loadBandWorkspace(bandData);
  }

  async function handleRegisterBand(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const cleanName = inputBandName.trim();
    if (!cleanName || !inputPassword.trim()) {
      setAuthError('밴드 이름과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    const { data, error } = await supabase
      .from('bands')
      .insert({
        name: cleanName,
        access_code: inputPassword.trim(),
        vocal_gender: newVocalGender,
        guitar_count: newGuitarCount,
        has_keys: newHasKeys,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') setAuthError('이미 존재하는 밴드 이름입니다.');
      else setAuthError('밴드 생성 오류: ' + error.message);
      return;
    }

    localStorage.setItem(AUTO_LOGIN_KEY, data.id);
    setCurrentBand(data);
    await loadBandWorkspace(data);
  }

  if (initChecking) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">
        밴드 접속 확인 중...
      </main>
    );
  }

  if (!currentBand) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              We.Band.Chu
            </h1>
            <p className="text-slate-400 text-xs">우리 밴드 합주곡 추천 & 워크스페이스</p>
          </div>

          <form onSubmit={isRegisterMode ? handleRegisterBand : handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">밴드 이름</label>
              <input
                type="text"
                required
                value={inputBandName}
                onChange={(e) => setInputBandName(e.target.value)}
                placeholder="예: 루시드 밴드"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">비밀번호</label>
              <input
                type="password"
                required
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {isRegisterMode && (
              <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">보컬 파트</label>
                  <select
                    value={newVocalGender}
                    onChange={(e) => setNewVocalGender(e.target.value as VocalGender)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="FEMALE">여성 보컬</option>
                    <option value="MALE">남성 보컬</option>
                    <option value="MIXED">혼성 보컬 (듀엣)</option>
                    <option value="ANY">상관없음</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">일렉 기타 대수</label>
                  <select
                    value={newGuitarCount}
                    onChange={(e) => setNewGuitarCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value={1}>1기타 (원기타)</option>
                    <option value={2}>2기타 (리드 + 세컨)</option>
                    <option value={3}>3기타 이상</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">건반 파트</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        checked={newHasKeys === true}
                        onChange={() => setNewHasKeys(true)}
                      />
                      건반 있음
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        checked={newHasKeys === false}
                        onChange={() => setNewHasKeys(false)}
                      />
                      건반 없음
                    </label>
                  </div>
                </div>
              </div>
            )}

            {authError && <p className="text-xs text-rose-400 font-semibold">{authError}</p>}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
            >
              {isRegisterMode ? <Plus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {isRegisterMode ? '우리 밴드 생성하고 입장' : '밴드 워크스페이스 입장'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError('');
              }}
              className="text-xs text-indigo-400 hover:underline"
            >
              {isRegisterMode ? '이미 등록된 밴드인가요? 로그인' : '신규 밴드 등록하기'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const repertoireMap = new Map<string, string>(repertoire.map((r) => [r.songs?.title?.toLowerCase(), r.status]));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-purple-900">
      
      {/* 헤더 */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              We.Band.Chu
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
              우밴추
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-slate-400 text-xs">
              <strong className="text-slate-100 font-bold">{currentBand.name}</strong> •{' '}
              {currentBand.vocal_gender === 'FEMALE' ? '여성 보컬' : currentBand.vocal_gender === 'MALE' ? '남성 보컬' : '혼성 보컬'} •{' '}
              {currentBand.guitar_count}기타 •{' '}
              {currentBand.has_keys ? '건반 O' : '건반 X'}
            </p>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-indigo-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md transition"
            >
              <Sliders className="w-3 h-3" /> 구성 수정
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* 💡 합주 일정 버튼 UI 임시 숨김 처리 */}
          {/* <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs text-amber-400 font-semibold shadow transition cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            {rehearsal?.title ? '합주 일정' : '일정 관리'}
          </button> */}

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(AUTO_LOGIN_KEY);
              setCurrentBand(null);
            }}
            title="로그아웃"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 중앙 검색창 */}
      <div className="max-w-7xl mx-auto mt-5 relative" ref={searchContainerRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => {
              if (searchQuery.trim()) setIsSearchOpen(true);
            }}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="곡명 또는 아티스트 입력 시 정식 음원이 실시간 검색됩니다 (예: 윤하, QWER, DAY6, 실리카겔...)"
            className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-11 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none shadow-lg transition"
          />
          {youtubeLoading && (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-40 max-h-[34rem] overflow-y-auto divide-y divide-slate-800/80">
            {youtubeResults.map((ytSong) => {
              const isAlreadyAdded = repertoireMap.has(ytSong.title.toLowerCase());

              return (
                <div
                  key={ytSong.youtubeId}
                  className="p-3.5 hover:bg-slate-800/60 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {ytSong.thumbnail && (
                      <img
                        src={ytSong.thumbnail}
                        alt={ytSong.title}
                        className="w-12 h-9 object-cover rounded-md border border-slate-700/80 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-200 truncate">{ytSong.title}</h4>
                        <span className="text-[9px] bg-rose-950/80 text-rose-300 border border-rose-800/80 px-1 py-0.2 rounded shrink-0 flex items-center gap-1">
                          <Disc3 className="w-2.5 h-2.5" /> 정식음원
                        </span>

                        {ytSong.coverLevel === 'HIGH' && (
                          <span className="text-[9px] bg-amber-950/90 text-amber-300 border border-amber-800/80 px-1.5 py-0.2 rounded shrink-0 font-medium">
                            🔥 커버 많음
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{ytSong.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ytSong.coverSearchUrl && (
                      <a
                        href={ytSong.coverSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="다른 밴드들의 합주/커버 영상 보러가기"
                        className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 bg-slate-950/60 border border-slate-800 px-2 py-1 rounded-md transition"
                      >
                        <Video className="w-3 h-3" /> 커버 영상
                      </a>
                    )}

                    <a
                      href={ytSong.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="유튜브 정식 음원 듣기"
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {isAlreadyAdded ? (
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 담김
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={actionLoadingId === ytSong.youtubeId}
                        onClick={() => handleAddYouTubeSong(ytSong)}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {actionLoadingId === ytSong.youtubeId ? '등록 중...' : '담기'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {hasMoreSearch && (
              <div className="p-3 bg-slate-950/80 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-indigo-400 hover:text-indigo-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 shadow"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> 다음 곡 불러오는 중...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" /> 더 많은 음원 보기
                    </>
                  )}
                </button>
              </div>
            )}

            {youtubeResults.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                {youtubeLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    정식 음원 검색 중...
                  </span>
                ) : (
                  `'${searchQuery}'에 대한 검색 결과가 없습니다.`
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2열 고정 레이아웃 */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-5 mt-6 items-start">
        
        {/* 왼쪽: 우리 밴드 레퍼토리 */}
        <section className="flex-1 min-w-0 w-full space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-100">
              <Music className="w-4 h-4 text-indigo-400" /> 
              우리 밴드 레퍼토리 ({repertoire.length}곡)
            </h2>
            <span className="text-[11px] text-slate-500 hidden sm:inline">후보 → 연습중 변경 시 합주팩 실행</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">레퍼토리 로드 중...</div>
          ) : repertoire.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-2xl text-center text-slate-500 text-xs sm:text-sm">
              등록된 곡이 없습니다. 검색창이나 오른쪽 추천 피드에서 곡을 담아보세요!
            </div>
          ) : (
            <div className="space-y-2.5">
              {repertoire.map((item) => {
                const currentBadge = STATUS_OPTIONS.find((opt) => opt.value === item.status) || STATUS_OPTIONS[0];

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 p-3.5 rounded-xl flex items-center justify-between transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-slate-100 truncate max-w-[200px] sm:max-w-xs">{item.songs?.title}</span>
                        <span className="text-xs text-slate-400">({item.songs?.artist})</span>
                        
                        <div className="relative inline-flex items-center">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item, e.target.value as StatusType)}
                            className={`appearance-none text-[10px] sm:text-[11px] font-bold pl-2 pr-5 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-colors ${currentBadge.badgeStyle}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 pointer-events-none opacity-70 text-slate-300" />
                        </div>

                        {item.status === 'PRACTICING' && (
                          <button
                            type="button"
                            onClick={() => setPracticeModalSong(item.songs)}
                            className="text-[10px] bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1 transition"
                          >
                            <BookOpen className="w-2.5 h-2.5" /> 파트별 합주팩
                          </button>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>
                          키: <strong className="text-indigo-300 font-medium">{item.played_key || item.songs?.original_key}</strong>
                        </span>
                        <span>BPM {item.songs?.bpm || '-'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">
                          {item.band_notes || '메모 없음'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRepertoireItem(item);
                          setEditSongTitle(item.songs?.title || '');
                          setEditSongArtist(item.songs?.artist || '');
                          setEditPlayedKey(item.played_key || item.songs?.original_key || 'C');
                          setEditBandNotes(item.band_notes || '');
                        }}
                        title="곡 정보 수정 (오류 교정)"
                        className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      {item.songs?.youtube_url && (
                        <a
                          href={item.songs.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="YouTube 음원 듣기"
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('레퍼토리에서 제거하시겠습니까?')) return;
                          setRepertoire((prev) => prev.filter((r) => r.id !== item.id));
                          await supabase.from('band_repertoire').delete().eq('id', item.id);
                        }}
                        title="레퍼토리에서 제거"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 오른쪽: 선택형 스마트 추천 큐레이션 */}
        <section className="w-full md:w-[360px] lg:w-[390px] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-1.5 text-slate-100">
              <Sparkles className="w-4 h-4 text-purple-400" />
              맞춤 합주 추천 10곡
            </h2>
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleRefreshRecommendations}
              className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-purple-200 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-800/80 px-2 py-1 rounded-lg transition shadow disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>

          {/* 원클릭 분위기 필터 칩 */}
          <div className="relative flex items-center group">
            <button
              type="button"
              onClick={() => scrollCategory('left')}
              className="p-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md shrink-0 mr-1.5 z-10 transition opacity-80 hover:opacity-100"
              title="이전 탭 보기"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-90" />
            </button>

            <div
              ref={categoryScrollRef}
              className="flex gap-1.5 overflow-x-auto scroll-smooth py-1 scrollbar-none flex-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {RECOMMEND_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border transition shrink-0 whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollCategory('right')}
              className="p-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 shadow-md shrink-0 ml-1.5 z-10 transition opacity-80 hover:opacity-100"
              title="다음 탭 보기"
            >
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>

          {/* 10곡 큐레이션 리스트 */}
          <div className="space-y-2 max-h-[46rem] overflow-y-auto pr-0.5">
            {aiLoading ? (
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                밴드 공연 및 커버 영상 검증 중...
              </div>
            ) : aiRecommendations.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 p-6 rounded-2xl text-center text-slate-500 text-xs">
                추천곡이 없습니다. 상단 새로고침을 눌러보세요.
              </div>
            ) : (
              aiRecommendations.map((song, idx) => {
                const isAlreadyInRep = repertoireMap.has(song.title.toLowerCase());
                const coverSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + ' ' + song.title + ' 밴드 커버 TAB cover')}`;
                const liveSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.artist + ' ' + song.title + ' 라이브 live 밴드')}`;

                return (
                  <div
                    key={idx}
                    className="bg-slate-900/90 border border-slate-800 hover:border-purple-800/60 px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-2 shadow-sm relative group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[130px]">{song.title}</h3>
                        <span className="text-[9px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800 shrink-0">
                          {song.genre}
                        </span>

                        {song.has_live_performance && (
                          <span className="text-[9px] bg-emerald-950/80 text-emerald-300 px-1 py-0.2 rounded border border-emerald-800/80 shrink-0 font-medium">
                            🔥 공연 검증
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="truncate max-w-[85px]">{song.artist}</span>
                        <span className="text-slate-600">•</span>
                        <span>{song.recommended_key || song.original_key}</span>
                        <span className="text-slate-600">•</span>
                        <span>{song.bpm}bpm</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <a
                          href={coverSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="다른 밴드들의 악기 커버 / TAB 연주 영상 보기"
                          className="text-[10px] flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-900/70 hover:border-amber-700 px-1.5 py-0.5 rounded transition"
                        >
                          <PlayCircle className="w-2.5 h-2.5 text-amber-400" /> 커버 영상
                        </a>

                        <a
                          href={liveSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="실제 밴드/가수 라이브 무대 영상 보기"
                          className="text-[10px] flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-rose-300 border border-rose-900/70 hover:border-rose-700 px-1.5 py-0.5 rounded transition"
                        >
                          <Video className="w-2.5 h-2.5 text-rose-400" /> 라이브 무대
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAlreadyInRep ? (
                        <span className="text-[11px] text-slate-500 flex items-center gap-0.5 font-medium px-1.5 py-1">
                          <Check className="w-3 h-3 text-emerald-400" /> 담김
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoadingId === song.title}
                          onClick={() => handleAddAiRecommendedSong(song)}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {actionLoadingId === song.title ? '...' : '담기'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleReportSong(song)}
                        title="잘못된 데이터(오류) 신고 및 제외하기"
                        className="p-1 bg-rose-950/80 hover:bg-rose-900 text-rose-400 hover:text-rose-200 border border-rose-800 rounded-lg transition shadow"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 레퍼토리 곡 정보 수정 모달 */}
      {editingRepertoireItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                레퍼토리 정보 수정 (오류 교정)
              </h3>
              <button type="button" onClick={() => setEditingRepertoireItem(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">정식 곡 제목</label>
                <input
                  type="text"
                  value={editSongTitle}
                  onChange={(e) => setEditSongTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="예: Love Is Dangerous"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">아티스트명</label>
                <input
                  type="text"
                  value={editSongArtist}
                  onChange={(e) => setEditSongArtist(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="예: 터치드 (TOUCHED)"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">연주 키 (Key)</label>
                <input
                  type="text"
                  value={editPlayedKey}
                  onChange={(e) => setEditPlayedKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="예: 원키 유지 또는 D Key"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">메모 / 특이사항</label>
                <input
                  type="text"
                  value={editBandNotes}
                  onChange={(e) => setEditBandNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="예: 인트로 리프 주의"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!editSongTitle.trim()) {
                    alert('곡 제목을 입력해 주세요.');
                    return;
                  }

                  await supabase
                    .from('songs')
                    .update({ title: editSongTitle.trim(), artist: editSongArtist.trim() })
                    .eq('id', editingRepertoireItem.song_id);

                  await supabase
                    .from('band_repertoire')
                    .update({ played_key: editPlayedKey.trim(), band_notes: editBandNotes.trim() })
                    .eq('id', editingRepertoireItem.id);

                  setEditingRepertoireItem(null);
                  await loadBandWorkspace(currentBand);
                }}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition shadow"
              >
                수정사항 저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      <PracticeModal
        song={practiceModalSong}
        currentBand={currentBand}
        onClose={() => setPracticeModalSong(null)}
      />

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentBand={currentBand}
        onUpdated={(updatedBand: any) => {
          setCurrentBand(updatedBand);
          loadBandWorkspace(updatedBand);
        }}
      />
    </main>
  );
}