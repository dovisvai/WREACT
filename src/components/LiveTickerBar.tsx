import React, { useMemo } from 'react';
import { LiveTickerEvent } from '../types';
import { getCountryFlag } from '../utils/countries';
import { Zap } from 'lucide-react';

interface LiveTickerBarProps {
  tickerEvents: LiveTickerEvent[];
}

export const LiveTickerBar: React.FC<LiveTickerBarProps> = ({ tickerEvents }) => {
  // Ensure we have sufficient items so the 50% translation loop is completely seamless and never reveals empty space
  const seamlessEvents = useMemo(() => {
    if (!tickerEvents || tickerEvents.length === 0) return [];
    let list = [...tickerEvents];
    while (list.length < 10) {
      list = [...list, ...tickerEvents];
    }
    // Duplicate the padded list for the -50% translateX loop
    return [...list, ...list];
  }, [tickerEvents]);

  if (!tickerEvents || tickerEvents.length === 0) return null;

  return (
    <div className="bg-[#001026] border-b border-[#12284c] px-3 py-1.5 overflow-hidden whitespace-nowrap text-xs text-slate-300 select-none flex items-center relative">
      {/* Ticker Brand Badge with solid background so scrolling items never collide with or hide the label */}
      <div className="relative z-20 bg-[#001026] flex items-center gap-1.5 text-yellow-400 font-extrabold pr-3.5 border-r border-[#12284c] shrink-0 text-[11px] uppercase tracking-wider">
        <Zap className="w-3.5 h-3.5 animate-bounce fill-yellow-400 text-yellow-400" />
        <span className="text-red-500 font-black">W</span>
        <span className="text-yellow-400 font-black">REACT</span>
        <span className="hidden sm:inline text-slate-400 font-bold ml-1 text-[10px]">TICKER</span>
      </div>

      {/* Marquee Track Container with isolated overflow and gradient fades */}
      <div className="flex-1 overflow-hidden relative min-w-0 ml-2">
        {/* Soft edge gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#001026] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#001026] to-transparent z-10 pointer-events-none" />

        {/* Scrolling items track */}
        <div className="flex items-center gap-4 animate-marquee py-0.5">
          {seamlessEvents.map((event, idx) => (
            <div
              key={`${event.id}-${idx}`}
              className="inline-flex items-center gap-2 bg-[#020b1c] border border-red-500/30 hover:border-yellow-400/60 rounded-full px-3 py-0.5 text-slate-200 text-[11px] shrink-0 whitespace-nowrap transition-colors"
            >
              <span className="text-xs leading-none">{getCountryFlag(event.country)}</span>
              <span className="font-bold text-white max-w-[120px] truncate">{event.username}</span>
              <span className="text-yellow-400 font-mono font-extrabold">{event.scoreMs}ms</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-red-600/90 text-white border border-red-400/40">
                {event.mode.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

