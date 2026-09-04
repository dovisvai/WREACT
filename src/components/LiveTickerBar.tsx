import React from 'react';
import { LiveTickerEvent } from '../types';
import { getCountryFlag } from '../utils/countries';
import { Flag } from './ui/Primitives';

interface LiveTickerBarProps {
  tickerEvents: LiveTickerEvent[];
}

/**
 * Continuous results ticker, the way a sports broadcast carries scores along
 * the bottom of the frame. It exists to make the world feel populated: a solo
 * reaction test with a live ticker reads as a competition.
 */
export const LiveTickerBar: React.FC<LiveTickerBarProps> = ({ tickerEvents }) => {
  if (!tickerEvents.length) return null;

  // Duplicated once so the marquee's -50% translation loops seamlessly.
  const loop = [...tickerEvents, ...tickerEvents];

  return (
    <div className="shrink-0 overflow-hidden border-b border-pitch-700 bg-pitch-850">
      <div className="flex items-center">
        <div className="z-10 shrink-0 border-r border-pitch-700 bg-pitch-850 px-3 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-signal">
            Live
          </span>
        </div>

        <div className="animate-marquee">
          {loop.map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-1.5"
            >
              <Flag code={event.country} emoji={getCountryFlag(event.country)} className="text-sm" />
              <span className="text-[12px] font-semibold text-ink-muted">
                {event.username}
              </span>
              <span className="text-[12px] font-bold tabular-nums text-ink">
                {event.scoreMs}
                <span className="text-ink-faint">ms</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">
                {event.mode.replace(/_/g, ' ')}
              </span>
              <span className="ml-2 text-pitch-600">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
