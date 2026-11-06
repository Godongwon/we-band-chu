'use client';

import React from 'react';
import { Music } from 'lucide-react';
import { SongItem } from '../types';

interface RepertoirePanelProps {
  repertoire: SongItem[];
  onSelectSong: (song: SongItem) => void;
}

export default function RepertoirePanel({ repertoire, onSelectSong }: RepertoirePanelProps) {
  return (
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
              onClick={() => onSelectSong(song)}
              className="p-3 bg-[#0d1021] hover:bg-[#12162e] border border-slate-800 rounded-xl flex items-center justify-between text-xs cursor-pointer transition"
            >
              <div>
                <span className="font-bold text-slate-200 block">{song.title}</span>
                <span className="text-[11px] text-slate-400">
                  {song.artist} • {song.bpm}bpm
                </span>
              </div>
              <span className="text-[10px] text-indigo-400 font-semibold">상세보기</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

