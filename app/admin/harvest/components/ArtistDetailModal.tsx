'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  X,
  Sparkles,
  Music2,
  Clock,
  Check,
  Trash2,
  Play,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { TargetArtist, SongItem } from '../types';

interface ArtistDetailModalProps {
  artist: TargetArtist | null;
  songs: SongItem[];
  isRefreshingLLM: boolean;
  onClose: () => void;
  onRefreshWithLLM: (e: React.MouseEvent, artist: TargetArtist) => void;
  onUpdateArtistInfo: (
    artistId: string,
    payload: { search_alias: string | null; vocal_gender: string; priority: number }
  ) => Promise<void>;
  onDeleteArtist: (e: React.MouseEvent, artist: TargetArtist) => void;
  onFilterByArtist: (artistName: string) => void;
}

export default function ArtistDetailModal({
  artist,
  songs,
  isRefreshingLLM,
  onClose,
  onRefreshWithLLM,
  onUpdateArtistInfo,
  onDeleteArtist,
  onFilterByArtist,
}: ArtistDetailModalProps) {
  const [aliasInput, setAliasInput] = useState<string>('');
  const [vocalGender, setVocalGender] = useState<string>('FEMALE');
  const [priority, setPriority] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (artist) {
      setAliasInput(artist.search_alias || '');
      setVocalGender((artist.vocal_gender || 'FEMALE').toUpperCase());
      setPriority(artist.priority || 1);
    }
  }, [artist]);

  if (!artist) return null;

  const artistSongs = songs.filter((s) => s.artist === artist.name);
  const analyzedBpmCount = artistSongs.filter((s) => s.bpm !== null && s.bpm !== undefined && s.bpm > 0).length;
  const analyzedKeyCount = artistSongs.filter(
    (s) => s.original_key !== null && s.original_key !== undefined && s.original_key.trim() !== ''
  ).length;

  const genres = Array.from(new Set(artistSongs.map((s) => s.genre).filter(Boolean)));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!artist) return;
    setIsSaving(true);
    try {
      await onUpdateArtistInfo(artist.id, {
        search_alias: aliasInput.trim() || null,
        vocal_gender: vocalGender,
        priority,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col text-xs text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
                <Radio className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-black text-slate-100">{artist.name}</h3>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  vocalGender === 'FEMALE'
                    ? 'bg-pink-950/80 text-pink-300 border-pink-800'
                    : vocalGender === 'MALE'
                    ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                    : 'bg-purple-950/80 text-purple-300 border-purple-800'
                }`}
              >
                {vocalGender === 'FEMALE'
                  ? '여성 보컬'
                  : vocalGender === 'MALE'
                  ? '남성 보컬'
                  : '혼성/객원 보컬'}
              </span>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  priority === 1
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                    : priority === 2
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                }`}
              >
                {priority === 1 ? '1순위 (최우선)' : priority === 2 ? '2순위 (일반)' : '3순위 (수집완료)'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                최근 수집:{' '}
                {artist.last_harvested_at
                  ? new Date(artist.last_harvested_at).toLocaleString()
                  : '수집 대기 중'}
              </span>
              {genres.length > 0 && (
                <>
                  <span>•</span>
                  <span>주요 장르: {genres.slice(0, 3).join(', ')}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 본문 영역 */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* 3대 수집 지표 요약 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block mb-1">수집된 음원 수</span>
              <span className="text-xl font-black text-slate-100">{artistSongs.length}곡</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block mb-1">BPM 실측 완료</span>
              <span className="text-xl font-black text-emerald-400">
                {analyzedBpmCount}/{artistSongs.length}곡
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block mb-1">조성(Key) 산출 완료</span>
              <span className="text-xl font-black text-purple-400">
                {analyzedKeyCount}/{artistSongs.length}곡
              </span>
            </div>
          </div>

          {/* 밴드 메타데이터 수정 폼 */}
          <form
            onSubmit={handleSave}
            className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs">밴드 상세 정보 및 수집 설정</span>
              <button
                type="button"
                disabled={isRefreshingLLM}
                onClick={(e) => onRefreshWithLLM(e, artist)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-[11px] font-semibold transition disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 ${isRefreshingLLM ? 'animate-spin' : ''}`} />
                <span>{isRefreshingLLM ? 'LLM 분석 중...' : 'LLM으로 별칭/성별 자동 분석'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">
                  iTunes 검색 별칭 (search_alias)
                </label>
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="예: DAY6, JANNABI, Silica Gel..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">수집 우선순위</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1순위 (최우선 수집)</option>
                  <option value={2}>2순위 (일반)</option>
                  <option value={3}>3순위 (수집완료)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-[11px] block mb-1.5">보컬 성별 분류</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVocalGender('FEMALE')}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                    vocalGender === 'FEMALE'
                      ? 'bg-pink-950/80 border-pink-700 text-pink-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  여성 보컬 (FEMALE)
                </button>
                <button
                  type="button"
                  onClick={() => setVocalGender('MALE')}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                    vocalGender === 'MALE'
                      ? 'bg-blue-950/80 border-blue-700 text-blue-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  남성 보컬 (MALE)
                </button>
                <button
                  type="button"
                  onClick={() => setVocalGender('COED')}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition ${
                    vocalGender === 'COED'
                      ? 'bg-purple-950/80 border-purple-700 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  혼성/객원 (COED)
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition shadow"
              >
                <Check className="w-3.5 h-3.5" />
                {isSaving ? '저장 중...' : '밴드 설정 저장'}
              </button>
            </div>
          </form>

          {/* 해당 밴드 수집 음원 목록 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-purple-400" />
                수집된 음원 목록 ({artistSongs.length}곡)
              </h4>
              {artistSongs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onFilterByArtist(artist.name);
                    onClose();
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Filter className="w-3 h-3" />
                  우측 음원 패널에서 필터링 보기
                </button>
              )}
            </div>

            {artistSongs.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-slate-500">
                아직 수집된 곡이 없습니다. 상단 툴바의 &apos;다음 밴드 즉시 수집&apos; 또는 2분 주기 자동 수집을 통해 수집됩니다.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {artistSongs.map((song) => {
                  const ytUrl =
                    song.youtube_url ||
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(
                      `${song.artist} ${song.title}`
                    )}`;

                  return (
                    <div
                      key={song.id}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-200 block truncate">{song.title}</span>
                        <span className="text-[10px] text-slate-500">
                          {song.genre || 'Rock'} • {new Date(song.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            song.bpm
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                              : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}
                        >
                          {song.bpm ? `${song.bpm} BPM` : 'BPM 대기'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            song.original_key
                              ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                              : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}
                        >
                          {song.original_key ? `${song.original_key} Key` : 'Key 대기'}
                        </span>
                        <a
                          href={ytUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 transition"
                          title="YouTube에서 듣기"
                        >
                          <Play className="w-3 h-3 fill-rose-300" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 하단 푸터 액션 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={(e) => {
              onDeleteArtist(e, artist);
              onClose();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            수집 대상에서 삭제
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

