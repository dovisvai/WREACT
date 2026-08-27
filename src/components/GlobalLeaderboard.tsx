import React, { useState } from 'react';
import { ScoreRecord, GameMode, CountryStat } from '../types';
import { getCountryFlag, getCountryName, INITIAL_COUNTRY_STATS } from '../utils/countries';
import { Trophy, Globe, Search, Zap, Award, Flame, Filter } from 'lucide-react';

interface GlobalLeaderboardProps {
  scores: ScoreRecord[];
  currentMode: GameMode | 'ALL';
  setCurrentMode: (mode: GameMode | 'ALL') => void;
  userCountry: string;
}

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({
  scores,
  currentMode,
  setCurrentMode,
  userCountry,
}) => {
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'COUNTRY'>('INDIVIDUAL');
  const [timeframe, setTimeframe] = useState<'ALL' | 'TODAY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter scores
  const filteredScores = scores
    .filter((s) => {
      if (currentMode !== 'ALL' && s.mode !== currentMode) return false;
      if (timeframe === 'TODAY' && !s.isDaily && Date.now() - s.timestamp > 86400000) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return s.username.toLowerCase().includes(query) || s.country.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => a.scoreMs - b.scoreMs);

  return (
    <div className="flex flex-col h-full bg-[#020b1c] text-white select-none">
      {/* Top Header Filter */}
      <div className="bg-[#00122e] border-b border-[#12284c] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#020b1c] p-1 rounded-xl border border-[#12284c]">
            <button
              onClick={() => setActiveTab('INDIVIDUAL')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition-all ${
                activeTab === 'INDIVIDUAL'
                  ? 'bg-red-600 text-white shadow-md border border-yellow-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Top Athletes
            </button>
            <button
              onClick={() => setActiveTab('COUNTRY')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition-all ${
                activeTab === 'COUNTRY'
                  ? 'bg-yellow-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> World Cup
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#020b1c] p-1 rounded-xl border border-[#12284c]">
            <button
              onClick={() => setTimeframe('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                timeframe === 'ALL' ? 'bg-red-600/30 text-yellow-400 border border-yellow-400/30' : 'text-slate-400'
              }`}
            >
              All-Time
            </button>
            <button
              onClick={() => setTimeframe('TODAY')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                timeframe === 'TODAY' ? 'bg-red-600/30 text-yellow-400 border border-yellow-400/30' : 'text-slate-400'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search athlete or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#020b1c] border border-[#12284c] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500/80"
          />
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'INDIVIDUAL' ? (
          filteredScores.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              No scores matched your filter. Be the first WREACT athlete to set a mark!
            </div>
          ) : (
            filteredScores.map((score, index) => {
              const rank = index + 1;
              const flag = getCountryFlag(score.country);

              return (
                <div
                  key={score.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    rank === 1
                      ? 'bg-gradient-to-r from-red-600/20 via-[#00122e] to-[#00122e] border-yellow-400/60 shadow-lg shadow-red-600/10'
                      : rank === 2
                      ? 'bg-[#00122e] border-red-500/30'
                      : rank === 3
                      ? 'bg-[#00122e] border-[#12284c]'
                      : 'bg-[#00122e]/60 border-[#12284c]/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        rank === 1
                          ? 'bg-yellow-400 text-slate-950 border border-yellow-300'
                          : rank === 2
                          ? 'bg-slate-200 text-slate-950'
                          : rank === 3
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-100">{score.username}</span>
                        <span className="text-sm">{flag}</span>
                        {score.badge && (
                          <span className="text-[10px] bg-red-600/30 text-yellow-300 px-1.5 py-0.2 rounded font-black border border-yellow-400/40">
                            {score.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono mt-0.5">
                        <span className="uppercase font-bold">{score.mode.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{score.device}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-yellow-400">
                      {score.scoreMs}<span className="text-xs text-red-500 font-black">ms</span>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Country Rankings */
          INITIAL_COUNTRY_STATS.map((countryStat, index) => (
            <div
              key={countryStat.country}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#00122e] border border-[#12284c] hover:border-red-500/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black text-yellow-400 w-5">#{index + 1}</span>
                <span className="text-2xl">{countryStat.flag}</span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-100">{countryStat.name}</h4>
                  <span className="text-[10px] text-slate-300">
                    {countryStat.totalPlayers.toLocaleString()} Reaction Athletes
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black font-mono text-yellow-400">
                  {countryStat.avgMs}ms <span className="text-[10px] text-slate-300 font-normal">avg</span>
                </div>
                <div className="text-[10px] text-slate-300 font-mono">
                  Best: <span className="text-red-500 font-black">{countryStat.bestMs}ms</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
