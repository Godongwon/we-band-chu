'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SongItem, BandProfile, RepertoireStatus } from './types';
import WorkspaceToolbar from './components/WorkspaceToolbar';
import RepertoirePanel from './components/RepertoirePanel';
import RecommendationPanel from './components/RecommendationPanel';
import EditBandProfileModal from './components/EditBandProfileModal';
import SuggestSongModal from './components/SuggestSongModal';
import SongDetailModal from './components/SongDetailModal';
import PracticeModal from '@/app/components/PracticeModal';

export default function WorkspacePage({ currentBand }: { currentBand?: any }) {
  const [bandProfile, setBandProfile] = useState<BandProfile>({
    id: currentBand?.id,
    name: currentBand?.name || '루시드 밴드',
    vocal_gender: currentBand?.vocal_gender || 'FEMALE',
    guitar_count: currentBand?.guitar_count ?? 1,
    has_keys: currentBand?.has_keys ?? true,
  });

  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

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
  const [searchResults, setSearchResults] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [practiceModalSong, setPracticeModalSong] = useState<SongItem | null>(null);

  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);
  const [suggestTitle, setSuggestTitle] = useState<string>('');
  const [suggestArtist, setSuggestArtist] = useState<string>('');
  const [suggestYoutubeUrl, setSuggestYoutubeUrl] = useState<string>('');
  const [isSubmittingSuggest, setIsSubmittingSuggest] = useState<boolean>(false);

  useEffect(() => {
    async function restoreSessionAndRepertoire() {
      try {
        const stored = localStorage.getItem('current_band');
        if (!stored && !currentBand) {
          window.location.href = '/';
          return;
        }

        const parsed = stored ? JSON.parse(stored) : currentBand;
        let currentProfile: BandProfile = {
          id: parsed.id,
          name: parsed.name || '루시드 밴드',
          vocal_gender: parsed.vocal_gender || 'FEMALE',
          guitar_count: parsed.guitar_count ?? 1,
          has_keys: parsed.has_keys ?? true,
        };

        const localRepRaw = localStorage.getItem(`repertoire_${currentProfile.name}`);
        let restoredRep: SongItem[] = [];
        if (localRepRaw) {
          try {
            restoredRep = JSON.parse(localRepRaw) || [];
            setRepertoire(restoredRep);
          } catch {
            // ignore parse error
          }
        }

        const { data: dbBand } = await supabase
          .from('bands')
          .select('*')
          .eq('name', currentProfile.name)
          .maybeSingle();

        if (dbBand) {
          currentProfile = {
            id: dbBand.id,
            name: dbBand.name,
            vocal_gender: dbBand.vocal_gender || currentProfile.vocal_gender,
            guitar_count: dbBand.guitar_count ?? currentProfile.guitar_count,
            has_keys: dbBand.has_keys ?? currentProfile.has_keys,
          };
          localStorage.setItem('current_band', JSON.stringify(currentProfile));

          const { data: dbRep } = await supabase
            .from('band_repertoire')
            .select('id, song_id, status, played_key, band_notes, songs (*)')
            .eq('band_id', dbBand.id)
            .order('created_at', { ascending: false });

          if (dbRep && dbRep.length > 0) {
            const dbSongs: SongItem[] = dbRep
              .filter((r: any) => r.songs)
              .map((r: any) => ({
                id: r.songs.id,
                repertoire_id: r.id,
                status: (r.status as RepertoireStatus) || 'WISHLIST',
                band_notes: r.band_notes || '',
                title: r.songs.title,
                artist: r.songs.artist,
                genre: r.songs.genre || 'Rock/Band',
                bpm: r.songs.bpm || 120,
                original_key: r.songs.original_key || '원키 유지',
                recommended_key: r.played_key || r.songs.original_key || '원키 유지',
                youtube_url: r.songs.youtube_url,
              }));

            const mergedMap = new Map<string, SongItem>();
            [...restoredRep, ...dbSongs].forEach((item) => {
              if (item && item.title) {
                const key = item.title.toLowerCase().trim();
                const prev = mergedMap.get(key);
                mergedMap.set(key, {
                  ...prev,
                  ...item,
                  status: item.status || prev?.status || 'WISHLIST',
                  repertoire_id: item.repertoire_id || prev?.repertoire_id,
                });
              }
            });
            const mergedList = Array.from(mergedMap.values());
            setRepertoire(mergedList);
            localStorage.setItem(`repertoire_${currentProfile.name}`, JSON.stringify(mergedList));
          }
        }

        setBandProfile(currentProfile);
      } catch (e) {
        console.error('[세션 검사 오류]:', e);
      } finally {
        setIsAuthChecking(false);
      }
    }

    restoreSessionAndRepertoire();
  }, [currentBand]);

  async function fetchRecommendations(
    tabKey: string = activeTab,
    profile = bandProfile,
    currentRep = repertoire,
    isManualRefresh = false
  ) {
    setLoading(true);
    try {
      const recentIds = isManualRefresh
        ? recommendedSongs.map((s) => s.id).filter(Boolean)
        : [];

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          category: tabKey,
          bandProfile: profile,
          repertoireSongs: currentRep,
          excludeTitles: currentRep.map((r) => r.title),
          recentRecommendedIds: recentIds,
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
      fetchRecommendations(activeTab, bandProfile, repertoire, false);
    }
  }, [activeTab, isAuthChecking]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/songs?q=${encodeURIComponent(trimmed)}&limit=200`);
        const data = await res.json();
        if (res.ok && data.songs) {
          const q = trimmed.toLowerCase();
          const matched = data.songs
            .filter((s: any) => s.title?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q))
            .map((s: any) => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              genre: s.genre || 'Rock/Band',
              bpm: s.bpm || 120,
              original_key: s.original_key || '원키 유지',
              recommended_key: s.original_key || '원키 유지',
              youtube_url: s.youtube_url,
            }));
          setSearchResults(matched);
        }
      } catch (err) {
        console.error('[검색 오류]:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(delayTimer);
  }, [searchQuery]);

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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) {
      alert('밴드명을 입력해 주세요.');
      return;
    }

    const oldName = bandProfile.name;
    const updatedProfile: BandProfile = {
      id: bandProfile.id,
      name: editName.trim(),
      vocal_gender: editVocalGender,
      guitar_count: Number(editGuitarCount),
      has_keys: Boolean(editHasKeys),
    };

    setIsSavingProfile(true);

    try {
      const res = await fetch('/api/band/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'DB 업데이트 중 오류가 발생했습니다.');
      }

      const finalProfile: BandProfile = {
        ...updatedProfile,
        id: data.band?.id || updatedProfile.id,
      };

      if (oldName !== finalProfile.name) {
        localStorage.setItem(`repertoire_${finalProfile.name}`, JSON.stringify(repertoire));
      }

      setBandProfile(finalProfile);
      localStorage.setItem('current_band', JSON.stringify(finalProfile));
      setIsEditProfileOpen(false);

      fetchRecommendations(activeTab, finalProfile);
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
    setSearchResults((prev) => prev.filter((s) => s.title !== song.title));
  }

  async function handleAddToRepertoire(song: SongItem) {
    if (repertoire.some((r) => r.title === song.title)) {
      alert('이미 레퍼토리에 담긴 곡입니다.');
      return;
    }
    const newItem: SongItem = {
      ...song,
      status: song.status || 'WISHLIST',
    };
    const nextRep = [...repertoire, newItem];
    setRepertoire(nextRep);
    localStorage.setItem(`repertoire_${bandProfile.name}`, JSON.stringify(nextRep));

    setRecommendedSongs((prev) => prev.filter((s) => s.title !== song.title));
    if (selectedSong?.title === song.title) {
      setSelectedSong(null);
    }

    try {
      let targetBandId = bandProfile.id;
      if (!targetBandId) {
        const { data: b } = await supabase.from('bands').select('id').eq('name', bandProfile.name).maybeSingle();
        targetBandId = b?.id;
      }
      if (targetBandId && song.id) {
        const { data: existingRep } = await supabase
          .from('band_repertoire')
          .select('id')
          .eq('band_id', targetBandId)
          .eq('song_id', song.id)
          .maybeSingle();

        if (!existingRep) {
          const { data: insertedRep } = await supabase
            .from('band_repertoire')
            .insert({
              band_id: targetBandId,
              song_id: song.id,
              status: 'WISHLIST',
              played_key: song.recommended_key || song.original_key || 'C',
              band_notes: '워크스페이스 레퍼토리 추가',
              votes_count: 1,
            })
            .select('id')
            .single();

          if (insertedRep?.id) {
            setRepertoire((prev) => {
              const updated = prev.map((r) =>
                r.title === song.title ? { ...r, repertoire_id: insertedRep.id } : r
              );
              localStorage.setItem(`repertoire_${bandProfile.name}`, JSON.stringify(updated));
              return updated;
            });
          }
        }
      }
    } catch (err) {
      console.error('[레퍼토리 DB 저장 오류]:', err);
    }
  }

  async function handleRepertoireStatusChange(song: SongItem, newStatus: RepertoireStatus) {
    const oldStatus = song.status || 'WISHLIST';
    if (oldStatus === newStatus) return;

    // 후보(WISHLIST) → 연습중(PRACTICING) 또는 합주중(ENSEMBLE) 변경 시 자동으로 파트별 합주팩 실행
    if (oldStatus === 'WISHLIST' && (newStatus === 'PRACTICING' || newStatus === 'ENSEMBLE')) {
      setPracticeModalSong(song);
    }

    const nextRep = repertoire.map((r) =>
      r.title === song.title ? { ...r, status: newStatus } : r
    );
    setRepertoire(nextRep);
    localStorage.setItem(`repertoire_${bandProfile.name}`, JSON.stringify(nextRep));

    try {
      if (song.repertoire_id) {
        await supabase
          .from('band_repertoire')
          .update({
            status: newStatus,
            completed_at:
              newStatus === 'COMPLETED' || newStatus === 'PERFORMED' || newStatus === 'VIDEO_COMPLETED'
                ? new Date().toISOString()
                : null,
          })
          .eq('id', song.repertoire_id);
      } else if (bandProfile.id && song.id) {
        await supabase
          .from('band_repertoire')
          .update({
            status: newStatus,
            completed_at:
              newStatus === 'COMPLETED' || newStatus === 'PERFORMED' || newStatus === 'VIDEO_COMPLETED'
                ? new Date().toISOString()
                : null,
          })
          .eq('band_id', bandProfile.id)
          .eq('song_id', song.id);
      }
    } catch (err) {
      console.error('[레퍼토리 상태 변경 DB 저장 오류]:', err);
    }
  }

  async function handleRemoveFromRepertoire(song: SongItem) {
    if (!confirm(`'${song.title}' 곡을 우리 밴드 레퍼토리에서 제거하시겠습니까?`)) return;

    const nextRep = repertoire.filter((r) => r.title !== song.title);
    setRepertoire(nextRep);
    localStorage.setItem(`repertoire_${bandProfile.name}`, JSON.stringify(nextRep));

    try {
      if (song.repertoire_id) {
        await supabase.from('band_repertoire').delete().eq('id', song.repertoire_id);
      } else if (bandProfile.id && song.id) {
        await supabase
          .from('band_repertoire')
          .delete()
          .eq('band_id', bandProfile.id)
          .eq('song_id', song.id);
      }
    } catch (err) {
      console.error('[레퍼토리 삭제 오류]:', err);
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
        <WorkspaceToolbar
          bandProfile={bandProfile}
          repertoire={repertoire}
          searchQuery={searchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          onSearchQueryChange={setSearchQuery}
          onSelectSong={setSelectedSong}
          onAddToRepertoire={handleAddToRepertoire}
          onReportSong={handleReportSong}
          onLogout={handleLogout}
          onOpenEditProfile={handleOpenEditProfile}
          onOpenSuggest={() => {
            if (searchQuery.trim() && !suggestTitle.trim()) {
              setSuggestTitle(searchQuery.trim());
            }
            setIsSuggestOpen(true);
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-1">
          <RepertoirePanel
            repertoire={repertoire}
            onSelectSong={setSelectedSong}
            onStatusChange={handleRepertoireStatusChange}
            onOpenPracticePack={(song) => setPracticeModalSong(song)}
            onRemoveFromRepertoire={handleRemoveFromRepertoire}
          />

          <RecommendationPanel
            isSearchActive={false}
            displaySongs={recommendedSongs}
            activeTab={activeTab}
            loading={loading}
            isSearching={false}
            onChangeTab={setActiveTab}
            onRefresh={() => fetchRecommendations(activeTab, bandProfile, repertoire, true)}
            onSelectSong={setSelectedSong}
            onAddToRepertoire={handleAddToRepertoire}
            onReportSong={handleReportSong}
          />
        </div>
      </div>

      <EditBandProfileModal
        isOpen={isEditProfileOpen}
        isSavingProfile={isSavingProfile}
        editName={editName}
        editVocalGender={editVocalGender}
        editGuitarCount={editGuitarCount}
        editHasKeys={editHasKeys}
        onChangeName={setEditName}
        onChangeVocalGender={setEditVocalGender}
        onChangeGuitarCount={setEditGuitarCount}
        onChangeHasKeys={setEditHasKeys}
        onClose={() => setIsEditProfileOpen(false)}
        onSubmit={handleSaveProfile}
      />

      <SuggestSongModal
        isOpen={isSuggestOpen}
        bandName={bandProfile.name}
        suggestTitle={suggestTitle}
        suggestArtist={suggestArtist}
        suggestYoutubeUrl={suggestYoutubeUrl}
        isSubmittingSuggest={isSubmittingSuggest}
        onChangeTitle={setSuggestTitle}
        onChangeArtist={setSuggestArtist}
        onChangeYoutubeUrl={setSuggestYoutubeUrl}
        onClose={() => setIsSuggestOpen(false)}
        onSubmit={handleSubmitSuggestion}
      />

      <SongDetailModal
        selectedSong={selectedSong}
        bandProfile={bandProfile}
        repertoire={repertoire}
        onClose={() => setSelectedSong(null)}
        onReportSong={handleReportSong}
        onAddToRepertoire={handleAddToRepertoire}
      />

      <PracticeModal
        song={practiceModalSong}
        currentBand={bandProfile}
        onClose={() => setPracticeModalSong(null)}
      />
    </main>
  );
}
