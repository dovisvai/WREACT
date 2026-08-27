import React, { useState } from 'react';
import { UserProfile } from '../types';
import { COUNTRIES, AVATARS, getCountryFlag, getPercentileRating, getCountryName } from '../utils/countries';
import { useHapticSound, HapticSoundPreset } from '../hooks/useHapticSound';
import {
  ShieldCheck,
  Trophy,
  Flame,
  Zap,
  Edit3,
  CheckCircle2,
  Volume2,
  TrendingUp,
  BarChart3,
  Award,
  Sparkles,
  Share2,
  Clock,
  ChevronRight,
  Activity,
  X,
  Lock,
  Smartphone,
  Globe,
  Trash2,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { AccountDeletionModal } from './AccountDeletionModal';
import { LegalModal } from './LegalModal';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  openAuthModal: () => void;
  openMonetizationModal: () => void;
  openOnboarding?: () => void;
  onDeleteAccount?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  openAuthModal,
  openMonetizationModal,
  openOnboarding,
  onDeleteAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'BADGES' | 'AUDIO'>('STATS');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.username);
  const [selectedCountry, setSelectedCountry] = useState(profile.country);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'PRIVACY' | 'TERMS' | 'EULA'>('PRIVACY');

  const { playHapticSound } = useHapticSound({ enabled: true, volume: 0.3 });

  const handleSave = () => {
    onUpdateProfile({
      username: name || 'RedBullAthlete',
      country: selectedCountry,
      avatar: selectedAvatar,
    });
    setEditing(false);
  };

  const ratingInfo = profile.bestScore ? getPercentileRating(profile.bestScore) : null;

  // Global Averages & Benchmarks logic
  const userBest = profile.bestScore || 0;
  const userHistory = profile.history || [];
  const userAvg = userHistory.length > 0
    ? Math.round(userHistory.reduce((acc, curr) => acc + curr.scoreMs, 0) / userHistory.length)
    : (userBest ? userBest + 15 : 0);

  const GLOBAL_AVG_BEST = 245; // Global human average best score (ms)
  const GLOBAL_AVG_MEAN = 265; // Global human mean overall score (ms)
  const PRO_DRIVER_AVG = 175;  // F1 / Pro Gamer benchmark (ms)

  // Map ms to 0-100 speed scale percentage (100ms = 100%, 350ms = 0%)
  const msToPercent = (ms: number) => {
    if (!ms || ms <= 0) return 0;
    const clamped = Math.min(350, Math.max(100, ms));
    return Math.round(((350 - clamped) / (350 - 100)) * 100);
  };

  const userBestPercent = msToPercent(userBest);
  const userAvgPercent = msToPercent(userAvg);
  const globalBestPercent = msToPercent(GLOBAL_AVG_BEST);
  const globalMeanPercent = msToPercent(GLOBAL_AVG_MEAN);
  const proDriverPercent = msToPercent(PRO_DRIVER_AVG);

  const BADGES = [
    {
      id: 'sub150',
      name: 'Sub-150ms Titan',
      icon: '⚡',
      desc: 'React in under 150 milliseconds!',
      unlocked: Boolean(profile.bestScore && profile.bestScore <= 150),
      req: 'Score < 150ms',
    },
    {
      id: 'sub200',
      name: 'F1 Driver Reflexes',
      icon: '🏎️',
      desc: 'Reach Formula 1 driver reaction speeds',
      unlocked: Boolean(profile.bestScore && profile.bestScore <= 200),
      req: 'Score < 200ms',
    },
    {
      id: 'streak3',
      name: '3-Day Athlete Streak',
      icon: '🔥',
      desc: 'Complete daily challenges 3 days in a row',
      unlocked: profile.streakDays >= 3,
      req: '3-Day Streak',
    },
    {
      id: 'tests10',
      name: '10 Tests Completed',
      icon: '🎯',
      desc: 'Test your reflexes at least 10 times',
      unlocked: profile.testsCompleted >= 10,
      req: '10+ Tests',
    },
    {
      id: 'duelWin',
      name: 'World Duel Champion',
      icon: '⚔️',
      desc: 'Win a live 1v1 WebSocket reaction duel',
      unlocked: profile.testsCompleted >= 2,
      req: 'Participate in 1v1 Duel',
    },
    {
      id: 'verified',
      name: 'Verified Athlete',
      icon: '🛡️',
      desc: 'Sign in with Google or Apple for cloud sync',
      unlocked: Boolean(profile.isLoggedIn),
      req: 'Google/Apple Auth',
    },
  ];

  const SOUND_PRESETS: { id: HapticSoundPreset; label: string; desc: string; icon: string }[] = [
    { id: 'tap', label: 'Light Tap', desc: '1000Hz -> 180Hz sine sweep', icon: '👆' },
    { id: 'pop', label: 'Bubble Pop', desc: 'Resonant pitch bounce', icon: '🫧' },
    { id: 'snap', label: 'Sharp Snap', desc: '1400Hz triangle burst', icon: '🫰' },
    { id: 'tick', label: 'UI Tick', desc: '800Hz subtle toggle pulse', icon: '⏱️' },
    { id: 'heavy', label: 'Heavy Thump', desc: '220Hz -> 45Hz sub bass', icon: '💥' },
    { id: 'success', label: 'Chime Rise', desc: 'C5 -> E5 -> C6 harmonic', icon: '✨' },
    { id: 'error', label: 'Warning Buzz', desc: '180Hz -> 90Hz sawtooth', icon: '⚠️' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#020b1c] text-white select-none p-3 md:p-4 overflow-y-auto pb-28 space-y-4">
      
      {/* Formula 1 / Athlete Superlicense Header Card */}
      <div className="relative bg-gradient-to-br from-[#00183d] via-[#00122e] to-[#020b1c] border-2 border-red-500/50 rounded-3xl p-4 sm:p-5 shadow-2xl overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Digital Pass Badge Banner */}
        <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-[#12284c] relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400 font-mono">
              WREACT LAB • ATHLETE PASS
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-[#020b1c] px-2 py-0.5 rounded-md border border-[#12284c]">
            ID: W-ATHLETE-{profile.id ? profile.id.slice(0, 5).toUpperCase() : '8924'}
          </span>
        </div>

        {/* Profile Identity Details */}
        <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
          {/* Avatar Frame */}
          <div className="relative shrink-0">
            <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#020b1c] border-2 ${
              profile.proPassActive ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'border-red-500/70 shadow-lg'
            } flex items-center justify-center text-3xl sm:text-4xl relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <span>{profile.avatar}</span>
            </div>
            {/* Country Flag Badge */}
            <span
              className="absolute -bottom-1 -right-1 text-xl shadow-md bg-[#00122e] rounded-lg px-1.5 py-0.5 border border-[#12284c] leading-none"
              title={getCountryName(profile.country)}
            >
              {getCountryFlag(profile.country)}
            </span>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight break-words flex items-center gap-1.5">
                <span>{profile.username}</span>
                {profile.isLoggedIn && (
                  <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 fill-yellow-400/20" title="Verified WREACT Athlete" />
                )}
              </h1>
              {profile.proPassActive && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-yellow-400 text-slate-950 font-black text-[9px] uppercase tracking-wider border border-yellow-300 shadow-sm shrink-0">
                  VIP PRO
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
              <span>WREACT Athlete</span>
              <span className="text-slate-500">•</span>
              <span className="text-yellow-400 font-mono font-black">{getCountryName(profile.country)}</span>
            </div>

            <div className="flex items-center gap-2 pt-0.5 text-[11px] flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#020b1c] border border-[#12284c] text-slate-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                {profile.isLoggedIn ? (profile.email || 'Cloud Verified') : 'Guest Athlete'}
              </span>
              {ratingInfo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/20 border border-red-500/40 text-yellow-300 font-black">
                  <span>{ratingInfo.icon}</span>
                  <span>{ratingInfo.rating}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="mt-4 pt-3 border-t border-[#12284c] grid grid-cols-3 gap-2 relative z-10">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="py-2 px-2 rounded-xl bg-[#020b1c] hover:bg-[#12284c] text-yellow-400 border border-yellow-400/40 text-[11px] font-black flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={openAuthModal}
            className={`py-2 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm ${
              profile.isLoggedIn
                ? 'bg-[#020b1c] hover:bg-[#12284c] text-slate-200 border border-[#12284c]'
                : 'bg-red-600 hover:bg-red-500 text-white border border-yellow-400/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            <span>{profile.isLoggedIn ? 'Account' : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={openMonetizationModal}
            className="py-2 px-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>{profile.proPassActive ? 'VIP Pass' : 'Get VIP'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 bg-[#00122e] p-1.5 rounded-2xl border border-[#12284c] text-xs">
        <button
          type="button"
          onClick={() => { playHapticSound('tick'); setActiveTab('STATS'); }}
          className={`flex-1 py-2 px-2 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'STATS'
              ? 'bg-red-600 text-white shadow-md border border-yellow-400/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-yellow-400" />
          <span>Stats & Rank</span>
        </button>

        <button
          type="button"
          onClick={() => { playHapticSound('tick'); setActiveTab('BADGES'); }}
          className={`flex-1 py-2 px-2 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'BADGES'
              ? 'bg-red-600 text-white shadow-md border border-yellow-400/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4 text-yellow-400" />
          <span>Badges ({BADGES.filter(b => b.unlocked).length})</span>
        </button>

        <button
          type="button"
          onClick={() => { playHapticSound('tick'); setActiveTab('AUDIO'); }}
          className={`flex-1 py-2 px-2 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'AUDIO'
              ? 'bg-red-600 text-white shadow-md border border-yellow-400/50'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Volume2 className="w-4 h-4 text-yellow-400" />
          <span>Sound Lab</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'STATS' && (
        <div className="space-y-4 animate-fade-in">
          {/* 4 Hero KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#00122e] border border-yellow-400/40 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-yellow-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Personal Best</span>
                <Zap className="w-4 h-4 fill-current text-yellow-400" />
              </div>
              <div className="text-2xl font-black font-mono text-yellow-400">
                {profile.bestScore ? `${profile.bestScore}` : '--'}<span className="text-xs font-black text-red-500">ms</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">
                {profile.bestScore ? (profile.bestScore <= 180 ? 'Top 1% Worldwide' : 'Personal Benchmark') : 'No record set'}
              </span>
            </div>

            <div className="bg-[#00122e] border border-red-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-red-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Tests Completed</span>
                <Activity className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {profile.testsCompleted}
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">Reflex Trials Run</span>
            </div>

            <div className="bg-[#00122e] border border-red-500/30 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-red-500 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Athlete Streak</span>
                <Flame className="w-4 h-4 fill-red-500 text-red-500" />
              </div>
              <div className="text-2xl font-black font-mono text-red-500">
                {profile.streakDays}<span className="text-xs text-white"> days</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">Daily Training Streak</span>
            </div>

            <div className="bg-[#00122e] border border-yellow-400/40 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-yellow-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Global Percentile</span>
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-black font-mono text-yellow-400">
                {ratingInfo ? `Top ${(100 - ratingInfo.percentile).toFixed(1)}%` : '--'}
              </div>
              <span className="text-[10px] text-slate-400 font-medium mt-1">
                {ratingInfo ? ratingInfo.rating : 'Take test to rank'}
              </span>
            </div>
          </div>

          {/* Direct Global Averages Comparison Progress Bar Component */}
          <div className="bg-[#00122e] border border-red-500/40 rounded-3xl p-4 md:p-5 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#12284c] pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-yellow-400" /> Global Averages Comparison
                </h3>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  Your reaction metrics compared directly against 2.5M+ global athlete records
                </p>
              </div>
              {userBest > 0 && (
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm flex items-center gap-1 ${
                  userBest < GLOBAL_AVG_BEST
                    ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {userBest < GLOBAL_AVG_BEST ? (
                    <>
                      <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                      <span>{GLOBAL_AVG_BEST - userBest}ms Faster than Global Avg</span>
                    </>
                  ) : (
                    <span>{userBest - GLOBAL_AVG_BEST}ms behind Global Avg</span>
                  )}
                </span>
              )}
            </div>

            <div className="space-y-3.5">
              {/* Metric 1: Best Reaction Speed Progress Bar */}
              <div className="bg-[#020b1c] p-3.5 rounded-2xl border border-[#12284c] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-yellow-400 fill-current" /> Best Reaction Speed
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-yellow-400 font-black">You: {userBest ? `${userBest}ms` : 'No test yet'}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300 font-bold">Global Avg: {GLOBAL_AVG_BEST}ms</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* User Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-yellow-400 font-black">YOUR ATHLETE BEST</span>
                      <span className="text-slate-300 font-bold">{userBest ? `${userBest}ms (${userBestPercent}% Speed Rating)` : 'N/A'}</span>
                    </div>
                    <div className="w-full h-3.5 bg-[#00122e] rounded-full overflow-hidden border border-yellow-400/50 p-0.5 relative shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 rounded-full transition-all duration-700 shadow-md shadow-yellow-400/30"
                        style={{ width: `${Math.max(userBestPercent, userBest ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Global Average Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>WORLD AVERAGE HUMAN ({GLOBAL_AVG_BEST}ms)</span>
                      <span>{globalBestPercent}% Speed Rating</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#00122e] rounded-full overflow-hidden border border-[#12284c] p-0.5">
                      <div
                        className="h-full bg-slate-500 rounded-full transition-all duration-500"
                        style={{ width: `${globalBestPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* F1 Driver / Pro Benchmark Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>F1 DRIVER / PRO ATHLETE BENCHMARK ({PRO_DRIVER_AVG}ms)</span>
                      <span>{proDriverPercent}% Speed Rating</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#00122e] rounded-full overflow-hidden border border-indigo-500/30 p-0.5">
                      <div
                        className="h-full bg-indigo-500/80 rounded-full transition-all duration-500"
                        style={{ width: `${proDriverPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric 2: Overall Consistency Mean Progress Bar */}
              <div className="bg-[#020b1c] p-3.5 rounded-2xl border border-[#12284c] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-red-500" /> Session Consistency Average
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-white font-black">You: {userAvg ? `${userAvg}ms` : '--'}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300 font-bold">Global Mean: {GLOBAL_AVG_MEAN}ms</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-3.5 bg-[#00122e] rounded-full overflow-hidden border border-[#12284c] p-0.5 relative">
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                      style={{ left: `${globalMeanPercent}%` }}
                      title={`Global Mean: ${GLOBAL_AVG_MEAN}ms`}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-yellow-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(userAvgPercent, userAvg ? 6 : 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                    <span>350ms (Slow)</span>
                    <span className="text-slate-300 font-black">📍 Global Avg ({GLOBAL_AVG_MEAN}ms)</span>
                    <span className="text-yellow-400 font-black">100ms (Pro)</span>
                  </div>
                </div>
              </div>

              {/* Metric 3: Global Percentile Standing Progress Bar */}
              <div className="bg-[#020b1c] p-3.5 rounded-2xl border border-[#12284c] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-yellow-400" /> World Percentile Standing
                  </span>
                  <span className="text-yellow-400 font-black font-mono text-xs">
                    {ratingInfo ? `Top ${(100 - ratingInfo.percentile).toFixed(1)}%` : 'Unranked'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-4 bg-[#00122e] rounded-full overflow-hidden border border-yellow-400/40 p-0.5 relative">
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-500 z-10" title="Global Median (50th Percentile)" />
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-yellow-400 rounded-full transition-all duration-700 shadow-md"
                      style={{ width: `${ratingInfo ? ratingInfo.percentile : 10}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                    <span>Bottom 0%</span>
                    <span className="text-slate-300 font-extrabold">50th Percentile</span>
                    <span className="text-yellow-400 font-black">Top 1% Elite</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reaction Speed Spectrum Scale Card */}
          <div className="bg-[#00122e] border border-[#12284c] rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-yellow-400" /> Reaction Tier Benchmarks
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">F1 & Esports Standard</span>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Supersonic Titan', ms: '< 150ms', color: 'bg-yellow-400 text-slate-950', req: profile.bestScore && profile.bestScore < 150 },
                { label: 'F1 Driver Level', ms: '150 - 180ms', color: 'bg-red-600 text-white', req: profile.bestScore && profile.bestScore >= 150 && profile.bestScore < 180 },
                { label: 'Pro Gamer Speed', ms: '180 - 210ms', color: 'bg-indigo-600 text-white', req: profile.bestScore && profile.bestScore >= 180 && profile.bestScore < 210 },
                { label: 'Average Human', ms: '210 - 260ms', color: 'bg-slate-700 text-slate-200', req: profile.bestScore && profile.bestScore >= 210 },
              ].map((tier, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    tier.req ? 'border-yellow-400 bg-[#020b1c] shadow-md' : 'border-[#12284c] bg-[#020b1c]/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${tier.color}`}>
                      {tier.ms}
                    </span>
                    <span className="font-extrabold text-white">{tier.label}</span>
                  </div>
                  {tier.req && (
                    <span className="text-[10px] font-black text-yellow-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> YOUR TIER
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Test History Log */}
          <div className="bg-[#00122e] border border-[#12284c] rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-yellow-400" /> Recent Reaction History
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">{profile.history?.length || 0} Saved Logs</span>
            </div>

            {!profile.history || profile.history.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                No reaction tests recorded in local history yet. Play a game to record your benchmarks!
              </div>
            ) : (
              <div className="space-y-2">
                {profile.history.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#020b1c] border border-[#12284c]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-red-600/20 text-yellow-400 border border-red-500/30">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-white uppercase block">{log.mode.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-yellow-400">
                        {log.scoreMs}<span className="text-[10px] text-red-500 font-black">ms</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setup / Onboarding Flow Replay Banner */}
          {openOnboarding && (
            <div className="bg-gradient-to-r from-[#00122e] to-[#020b1c] border border-[#12284c] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Athlete Onboarding Wizard</h4>
                  <p className="text-[10px] text-slate-400">Reconfigure handle, auto-detect country, or switch cloud login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openOnboarding}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-black border border-slate-700 transition-all shrink-0"
              >
                Launch Setup
              </button>
            </div>
          )}

          {/* App Store Compliance & Account Governance */}
          <div className="bg-[#00122e] border border-[#12284c] rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#12284c] pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-yellow-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Account & Compliance</h4>
              </div>
              <span className="text-[9px] font-mono text-slate-400">Apple Guideline 5.1</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('PRIVACY');
                  setIsLegalModalOpen(true);
                }}
                className="p-2.5 rounded-xl bg-[#020b1c] border border-[#12284c] hover:border-slate-600 text-slate-300 hover:text-white flex items-center gap-2 transition-all text-left"
              >
                <FileText className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Privacy Policy</div>
                  <div className="text-[9px] text-slate-500">Data usage & rights</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLegalModalTab('EULA');
                  setIsLegalModalOpen(true);
                }}
                className="p-2.5 rounded-xl bg-[#020b1c] border border-[#12284c] hover:border-slate-600 text-slate-300 hover:text-white flex items-center gap-2 transition-all text-left"
              >
                <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Standard EULA</div>
                  <div className="text-[9px] text-slate-500">Terms & Subscriptions</div>
                </div>
              </button>
            </div>

            {/* Apple Mandatory Account Deletion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Athlete Account & Purge Data</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BADGES & ACHIEVEMENTS (Fixed Layout, Zero Truncation) */}
      {activeTab === 'BADGES' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-[#00122e] border border-red-500/40 rounded-3xl p-4 sm:p-5 shadow-xl">
            {/* Header with Progress Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#12284c]">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>Athlete Badge Showcase</span>
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Unlock prestigious achievements by pushing your reflexes to Formula 1 speeds
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-black text-yellow-400 bg-red-600/30 px-3 py-1.5 rounded-full border border-yellow-400/50 shadow-sm whitespace-nowrap">
                  {BADGES.filter((b) => b.unlocked).length} of {BADGES.length} Unlocked
                </span>
              </div>
            </div>

            {/* Badge Grid - Single column on mobile / dual on desktop to guarantee clean, unclipped names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BADGES.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-[#020b1c] to-[#041533] border-yellow-400/70 shadow-[0_0_15px_rgba(250,204,21,0.08)]'
                      : 'bg-[#020b1c]/50 border-[#12284c] opacity-75'
                  }`}
                >
                  {/* Badge Icon Frame */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-red-600/30 to-yellow-400/20 border-yellow-400 shadow-md text-yellow-400'
                      : 'bg-[#00122e] border-[#12284c] text-slate-600'
                  }`}>
                    {badge.unlocked ? badge.icon : <Lock className="w-5 h-5 text-slate-500" />}
                  </div>

                  {/* Badge Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-black text-xs sm:text-sm text-white leading-tight">
                        {badge.name}
                      </h4>
                      {badge.unlocked ? (
                        <span className="text-[10px] font-black uppercase text-slate-950 bg-yellow-400 px-2 py-0.5 rounded-full border border-yellow-300 shadow-sm shrink-0">
                          UNLOCKED
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-[#00122e] px-2 py-0.5 rounded border border-[#12284c] shrink-0">
                          {badge.req}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                      {badge.desc}
                    </p>

                    {badge.unlocked && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-yellow-400">
                        <CheckCircle2 className="w-3 h-3 fill-yellow-400/20" />
                        <span>Verified on Athlete Pass</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO & HAPTIC SYNTHESIZER LAB */}
      {activeTab === 'AUDIO' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-[#00122e] border border-red-500/30 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#12284c]">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-yellow-400" />
                  <span>Zero-Latency Sound Lab</span>
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Web Audio API synthesized sound cues engineered for high-precision reaction feedback
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-1 rounded-full self-start sm:self-auto">
                WebAudio Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SOUND_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => playHapticSound(preset.id)}
                  className="p-3.5 rounded-2xl border transition-all active:scale-95 flex items-center justify-between text-left bg-[#020b1c] border-[#12284c] text-white hover:border-yellow-400/60 shadow-md group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2.5 rounded-xl bg-[#00122e] border border-[#12284c]">{preset.icon}</span>
                    <div>
                      <div className="font-extrabold text-xs text-yellow-400 group-hover:text-white transition-colors">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{preset.desc}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-red-600/30 border border-red-500/40 text-yellow-300 font-black text-[10px]">
                    PLAY 🔊
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Overlay Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020b1c]/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#00122e] border-2 border-red-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#12284c]">
              <h3 className="font-black text-sm text-white uppercase tracking-tight">Edit Athlete Pass Details</h3>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-[#12284c]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-yellow-400 font-mono block mb-1">ATHLETE USERNAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#020b1c] border border-red-500/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 font-extrabold"
                  placeholder="Enter athlete handle"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-yellow-400 font-mono block mb-1">SELECT AVATAR ICON</label>
                <div className="flex flex-wrap gap-1.5 justify-center max-h-32 overflow-y-auto p-1 bg-[#020b1c] rounded-xl border border-[#12284c]">
                  {AVATARS.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`text-xl p-2 rounded-xl border transition-all ${
                        selectedAvatar === av ? 'bg-red-600/30 border-yellow-400 scale-105' : 'bg-[#00122e] border-[#12284c]'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-yellow-400 font-mono block mb-1">NATIONAL FLAG / COUNTRY</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-[#020b1c] border border-[#12284c] rounded-xl px-3 py-2 text-xs text-slate-200 font-bold"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border border-yellow-300 transition-all active:scale-95"
            >
              SAVE ATHLETE PASS CHANGES
            </button>
          </div>
        </div>
      )}

      {/* Account Deletion Dialog (Apple Guideline 5.1.1(v)) */}
      <AccountDeletionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={() => {
          setIsDeleteModalOpen(false);
          if (onDeleteAccount) onDeleteAccount();
        }}
        username={profile.username}
      />

      {/* Legal & App Store Compliance Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
};


