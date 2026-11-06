'use client';

import React from 'react';
import { X, Video, FileText } from 'lucide-react';

interface PracticeModalProps {
  song: any;
  currentBand: any;
  onClose: () => void;
}

export default function PracticeModal({ song, currentBand, onClose }: PracticeModalProps) {
  if (!song) return null;

  const cleanTitle = song.title.replace(/\(.*?\)|\[.*?\]/g, '').trim() || song.title;
  const baseQuery = `${song.artist} ${cleanTitle}`;

  const getAkbobadaUrl = (partKeyword: string) =>
    `https://www.google.com/search?q=site:akbobada.com+${encodeURIComponent(cleanTitle + ' ' + partKeyword)}`;

  const parts = [
    {
      partName: '보컬 (Vocal)',
      roleLabel: currentBand?.vocal_gender === 'FEMALE' ? '여성 보컬' : currentBand?.vocal_gender === 'MALE' ? '남성 보컬' : '보컬',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' MR 가사')}`,
      sheetSearchUrl: getAkbobadaUrl('보컬 멜로디 3단악보'),
      sheetSiteName: '악보바다 보컬 악보',
      tip: '원키 대비 보컬 음역대를 확인하고 합주 시 마이크 모니터링 볼륨을 체크하세요.'
    },
    {
      partName: '일렉기타 (Guitar 1 - 리드)',
      roleLabel: '메인 리프 / 솔로',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 기타 강좌 TAB cover')}`,
      sheetSearchUrl: getAkbobadaUrl('기타 TAB 타브 밴드스코어'),
      sheetSiteName: '악보바다 기타 TAB',
      tip: '솔로 구간 부스트 페달 타이밍과 인트로 메인 리프의 피킹 다이내믹을 맞추세요.'
    }
  ];

  if (currentBand?.guitar_count >= 2) {
    parts.push({
      partName: '일렉기타 (Guitar 2 - 세컨/리듬)',
      roleLabel: currentBand.has_keys ? '리듬 백킹' : '건반 라인 대체 / 코드 백킹',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 리듬기타 백킹 카피')}`,
      sheetSearchUrl: getAkbobadaUrl('기타 코드 밴드스코어 악보'),
      sheetSiteName: '악보바다 세컨기타 악보',
      tip: currentBand.has_keys 
        ? '리드기타와 톤 성향(드라이브 질감)이 겹치지 않게 EQ를 조절하세요.'
        : '원곡의 건반 리프/신스 보이싱을 카피해 공간계 이펙터로 백킹을 메워주세요.'
    });
  }

  parts.push({
    partName: '베이스 (Bass)',
    roleLabel: '루트 및 그루브 인터랙션',
    videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 베이스 커버 bass cover TAB')}`,
    sheetSearchUrl: getAkbobadaUrl('베이스 TAB 타브 악보'),
    sheetSiteName: '악보바다 베이스 TAB',
    tip: '드럼 킥의 타점과 베이스 어택 포인트를 일치시켜 단단한 로우엔드를 만드세요.'
  });

  parts.push({
    partName: '드럼 (Drum)',
    roleLabel: '템포 유지 및 필인 다이내믹',
    videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 드럼 커버 drum cover 악보')}`,
    sheetSearchUrl: getAkbobadaUrl('드럼 악보 밴드스코어'),
    sheetSiteName: '악보바다 드럼 악보',
    tip: '원곡 BPM 기준 메트로놈 연습 후 섹션 브레이크를 맞추세요.'
  });

  if (currentBand?.has_keys) {
    parts.push({
      partName: '건반 (Keyboard)',
      roleLabel: '신스 / 피아노 / 패드',
      videoSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery + ' 피아노 커버 건반 카피 keyboard tutorial')}`,
      sheetSearchUrl: getAkbobadaUrl('건반 피아노 악보 밴드스코어'),
      sheetSiteName: '악보바다 건반 악보',
      tip: '인트로 신스 톤과 벌스 패드 보이싱의 음색을 미리 패치해 두세요.'
    });
  }

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
              우리 밴드 세션 구성({currentBand.guitar_count}기타, {currentBand.has_keys ? '건반O' : '건반X'})에 맞춘 파트별 카피 영상 및 악보바다 악보 가이드
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