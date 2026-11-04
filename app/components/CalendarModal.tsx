'use client';

import React from 'react';
import { Calendar, Clock, MapPin, DollarSign, Users, ChevronDown, X } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  rehearsal: any;
  attendance: any[];
  onRsvpChange: (attendanceId: string, newRsvp: any) => void;
  rsvpOptions: { value: string; label: string; badgeStyle: string }[];
}

export default function CalendarModal({
  isOpen,
  onClose,
  rehearsal,
  attendance,
  onRsvpChange,
  rsvpOptions,
}: CalendarModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-slate-100">{rehearsal?.title || '합주 일정 정보'}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {rehearsal ? (
            <>
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  일시: 11월 15일 (일) 18:00 ~ 20:00 (2시간)
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  장소: {rehearsal.location_name || '장소 미정'}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  합주실 비용: {rehearsal.room_cost ? `${rehearsal.room_cost.toLocaleString()}원` : '무료'}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2 text-slate-200">
                  <Users className="w-4 h-4 text-indigo-400" /> 파트별 참석 여부 (RSVP)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attendance.map((mem) => {
                    const currentRsvp = rsvpOptions.find((r) => r.value === mem.status) || rsvpOptions[3];

                    return (
                      <div
                        key={mem.id}
                        className="bg-slate-950/40 border border-slate-800/80 px-3.5 py-2.5 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{mem.member_name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {mem.part}
                          </span>
                        </div>

                        <div className="relative inline-flex items-center">
                          <select
                            value={mem.status}
                            onChange={(e) => onRsvpChange(mem.id, e.target.value)}
                            className={`appearance-none text-[11px] font-bold pl-2.5 pr-5 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-colors ${currentRsvp.badgeStyle}`}
                          >
                            {rsvpOptions.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60 text-slate-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">등록된 합주 일정이 없습니다.</div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}