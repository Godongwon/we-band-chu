'use client';

import React from 'react';
import { Inbox, X, ExternalLink, Sparkles, Check } from 'lucide-react';
import { SuggestionSong } from '../types';

interface SuggestionsModalProps {
  isOpen: boolean;
  suggestions: SuggestionSong[];
  previewHarvestData: { [id: string]: any };
  harvestingSuggestionId: string | null;
  onClose: () => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onHarvestSingleSuggestion: (suggestion: SuggestionSong) => void;
  onConfirmAddSuggestion: (suggestion: SuggestionSong) => void;
}

export default function SuggestionsModal({
  isOpen,
  suggestions,
  previewHarvestData,
  harvestingSuggestionId,
  onClose,
  onDismissSuggestion,
  onHarvestSingleSuggestion,
  onConfirmAddSuggestion,
}: SuggestionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-400" />
            클라이언트 제보 곡 관리 ({suggestions.length}건)
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {suggestions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">대기 중인 제보 곡이 없습니다.</div>
          ) : (
            suggestions.map((suggestion) => {
              const preview = previewHarvestData[suggestion.id];
              const isHarvesting = harvestingSuggestionId === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{suggestion.title}</span>
                        <span className="text-slate-400">({suggestion.artist})</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-[10px] text-indigo-300 font-semibold">
                          제보 밴드: {suggestion.band_name}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px] block mt-1">
                        제보일시: {new Date(suggestion.created_at).toLocaleString()}
                      </span>
                    </div>

                    {suggestion.youtube_url && (
                      <a
                        href={suggestion.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 transition text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        제보 영상 링크
                      </a>
                    )}
                  </div>

                  {preview && (
                    <div className="p-3 bg-indigo-950/30 border border-indigo-900/60 rounded-lg flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-indigo-300 font-bold block">수집 데이터 확인:</span>
                        <span className="text-slate-300">
                          {preview.title} • {preview.artist} ({preview.genre})
                        </span>
                      </div>
                      {preview.preview_url && (
                        <audio controls src={preview.preview_url} className="h-6 w-48" />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => onDismissSuggestion(suggestion.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                    >
                      반려
                    </button>

                    {!preview ? (
                      <button
                        type="button"
                        disabled={isHarvesting}
                        onClick={() => onHarvestSingleSuggestion(suggestion)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition shadow"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isHarvesting ? 'animate-spin' : ''}`} />
                        {isHarvesting ? '정보 수집 중...' : '해당 곡 우선 수집'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onConfirmAddSuggestion(suggestion)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        확인 후 DB 추가 (+밴드 등록)
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

