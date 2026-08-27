import React, { useState } from 'react';
import { X, Share2, Copy, Check, Download, Zap, Award, Globe, ShieldCheck } from 'lucide-react';
import { getCountryFlag, getPercentileRating } from '../utils/countries';
import { GameMode } from '../types';

interface ShareCardModalProps {
  scoreMs: number;
  mode: GameMode;
  username: string;
  country: string;
  avatar: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  scoreMs,
  mode,
  username,
  country,
  avatar,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const flag = getCountryFlag(country);
  const rating = getPercentileRating(scoreMs);
  const shareText = `⚡ I just reacted in ${scoreMs}ms on WREACT! (${rating.rating} ${rating.icon})\nBeat my reaction speed across the globe! 🌐🏆`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5 fill-amber-400" /> Reaction Speed Card
          </div>
          <h2 className="text-lg font-bold text-white">Share Your Global Score</h2>
        </div>

        {/* The Card Rendered Preview */}
        <div id="share-card-canvas" className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-2 border-indigo-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden mb-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{avatar}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white">{username}</span>
                  <span className="text-base">{flag}</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                  {mode.replace('_', ' ')} MODE
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-cyan-400 uppercase block">WORLD RANK</span>
              <span className="text-xs font-bold text-slate-200">Top {100 - rating.percentile < 1 ? '0.2%' : `${(100 - rating.percentile).toFixed(1)}%`}</span>
            </div>
          </div>

          <div className="text-center py-4 my-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="text-5xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300">
              {scoreMs}<span className="text-2xl text-amber-400 font-semibold">ms</span>
            </div>
            <div className={`mt-1 text-sm font-bold flex items-center justify-center gap-1.5 ${rating.color}`}>
              <span>{rating.icon}</span>
              <span>{rating.rating}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" /> WREACT
            </span>
            <span className="flex items-center gap-1 font-mono text-indigo-400">
              <ShieldCheck className="w-3 h-3" /> Verified Score
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" /> Copied Challenge Text!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Social Challenge Text
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
