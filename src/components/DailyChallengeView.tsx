import React from 'react';
import { DailyChallengeInfo, GameMode } from '../types';
import { Trophy, Flame, Zap, Calendar, Award, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { getCountryFlag } from '../utils/countries';

interface DailyChallengeViewProps {
  dailyInfo: DailyChallengeInfo;
  onStartDaily: () => void;
  streakDays: number;
  openNotifications: () => void;
}

export const DailyChallengeView: React.FC<DailyChallengeViewProps> = ({
  dailyInfo,
  onStartDaily,
  streakDays,
  openNotifications,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#020b1c] text-white select-none p-4 overflow-y-auto space-y-4">
      {/* Banner */}
      <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-yellow-400 rounded-3xl p-5 text-slate-950 shadow-xl border border-yellow-300 overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#020b1c] rounded-full text-xs font-black uppercase text-yellow-400 border border-yellow-400/40">
            <Trophy className="w-3.5 h-3.5 fill-current text-yellow-400" /> WREACT Event
          </div>
          <div className="flex items-center gap-1 bg-[#020b1c]/80 text-white px-2.5 py-1 rounded-full text-xs font-black">
            <Clock className="w-3.5 h-3.5 text-yellow-400" /> Resets in 13h 42m
          </div>
        </div>

        <h2 className="text-2xl font-black tracking-tight leading-tight text-white drop-shadow-md">{dailyInfo.title}</h2>
        <p className="text-xs font-bold text-slate-950/90 mt-1 max-w-xs">{dailyInfo.description}</p>

        <div className="mt-4 pt-3 border-t border-slate-950/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-950/80 block">Special Rule</span>
            <span className="text-xs font-black text-slate-950">{dailyInfo.specialRule}</span>
          </div>

          <button
            onClick={onStartDaily}
            className="px-4 py-2 bg-[#00122e] hover:bg-[#020b1c] text-yellow-400 border border-yellow-400/50 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
          >
            Play Daily <ArrowRight className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Streak Tracker & Leaderboard Preview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#00122e] border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/40">
            <Flame className="w-6 h-6 fill-red-500" />
          </div>
          <div>
            <span className="text-2xl font-black text-white block">{streakDays} Days</span>
            <span className="text-[10px] text-slate-300 font-bold">Daily Athlete Streak</span>
          </div>
        </div>

        <div className="bg-[#00122e] border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-yellow-400/20 text-yellow-400 border border-yellow-400/40">
            <Zap className="w-6 h-6 fill-yellow-400" />
          </div>
          <div>
            <span className="text-xl font-black text-yellow-400 font-mono block">{dailyInfo.topScoreMs}ms</span>
            <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
              {getCountryFlag(dailyInfo.topCountry)} {dailyInfo.topScorer}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications Banner */}
      <div className="bg-[#00122e] border border-[#12284c] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-xs text-slate-100">Daily Challenge Reminders</h4>
          <p className="text-[11px] text-slate-300 font-medium">Get reminders so you never break your WREACT streak!</p>
        </div>
        <button
          onClick={openNotifications}
          className="px-3 py-1.5 rounded-xl bg-red-600/30 border border-red-500/50 text-yellow-300 font-black text-xs hover:bg-red-600/40 transition-all"
        >
          Configure
        </button>
      </div>
    </div>
  );
};
