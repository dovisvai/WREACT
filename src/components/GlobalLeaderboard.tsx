import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { GameMode, ScoreRecord } from '../types';
import { getCountryFlag } from '../utils/countries';
import { isPlausibleReaction } from '../utils/standings';
import {
  EmptyState,
  Flag,
  Skeleton,
  Label,
  RankBadge,
  Screen,
  Segmented,
  cx,
} from './ui/Primitives';

interface GlobalLeaderboardProps {
  scores: ScoreRecord[];
  currentMode: GameMode | 'ALL';
  setCurrentMode: (mode: GameMode | 'ALL') => void;
  userCountry: string;
  username: string;
  isLoading: boolean;
}

const MODE_OPTIONS: { value: GameMode | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'CLASSIC', label: 'Classic' },
  { value: 'FALSE_ALARM', label: 'Trap' },
  { value: 'PATTERN_SEQUENCE', label: 'Seq' },
  { value: 'PRECISION_TARGET', label: 'Target' },
  { value: 'REVERSE_COLOR', label: 'Stroop' },
  { value: 'DAILY_CHALLENGE', label: 'Daily' },
];

/**
 * Individual athlete rankings.
 *
 * Deliberately shows one row per athlete rather than one row per run — a
 * leaderboard where the same person occupies the top six places is not a
 * leaderboard.
 */
export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({
  scores,
  currentMode,
  setCurrentMode,
  userCountry,
  username,
  isLoading,
}) => {
  const [timeframe, setTimeframe] = useState<'ALL' | 'TODAY'>('ALL');
  const [search, setSearch] = useState('');

  const ranked = useMemo(() => {
    const dayAgo = Date.now() - 86_400_000;
    const bestByAthlete = new Map<string, ScoreRecord>();

    for (const score of scores) {
      if (!isPlausibleReaction(score.scoreMs)) continue;
      if (currentMode !== 'ALL' && score.mode !== currentMode) continue;
      if (timeframe === 'TODAY' && score.timestamp < dayAgo) continue;

      const key = score.userId || `${score.username}@${score.country}`;
      const existing = bestByAthlete.get(key);
      if (!existing || score.scoreMs < existing.scoreMs) bestByAthlete.set(key, score);
    }

    const query = search.trim().toLowerCase();
    return Array.from(bestByAthlete.values())
      .filter(
        (score) =>
          !query ||
          score.username.toLowerCase().includes(query) ||
          score.country.toLowerCase().includes(query)
      )
      .sort((a, b) => a.scoreMs - b.scoreMs)
      .slice(0, 100);
  }, [scores, currentMode, timeframe, search]);

  return (
    <Screen className="bg-pitch-900">
      <div className="sticky top-0 z-10 space-y-3 border-b border-pitch-700 bg-pitch-900/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 overflow-x-auto no-scrollbar scroll-hint-x">
            <Segmented<GameMode | 'ALL'> options={MODE_OPTIONS} value={currentMode} onChange={setCurrentMode} />
          </div>
          <Segmented<'ALL' | 'TODAY'>
            className="shrink-0"
            options={[
              { value: 'ALL', label: 'All time' },
              { value: 'TODAY', label: '24h' },
            ]}
            value={timeframe}
            onChange={setTimeframe}
          />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find an athlete"
            className="h-9 w-full rounded-md border border-pitch-700 bg-pitch-850 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pitch-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading && ranked.length === 0 ? (
          <Skeleton rows={8} />
        ) : ranked.length === 0 ? (
          <EmptyState
            title="No times yet"
            body="Nobody has posted a result matching this filter. Set the mark."
          />
        ) : (
          <div className="space-y-1.5">
            {ranked.map((score, index) => {
              const rank = index + 1;
              const isYou =
                score.username === username && score.country === userCountry.toUpperCase();

              return (
                <div
                  key={score.id}
                  className={cx(
                    'flex items-center gap-3 rounded-md border px-3 py-2.5',
                    isYou
                      ? 'border-signal/40 bg-signal/5'
                      : rank === 1
                      ? 'border-gold/35 bg-pitch-850'
                      : 'border-pitch-700 bg-pitch-850'
                  )}
                >
                  <RankBadge rank={rank} className="w-7 shrink-0" />
                  <Flag
                    code={score.country}
                    emoji={getCountryFlag(score.country)}
                    className="shrink-0 text-xl"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">
                        {score.username}
                      </span>
                      {isYou && <Label className="shrink-0 text-signal">You</Label>}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-ink-faint">
                      {score.mode.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div
                    className={cx(
                      'shrink-0 font-display text-xl font-bold leading-none',
                      rank === 1 ? 'text-gold' : 'text-ink'
                    )}
                  >
                    {score.scoreMs}
                    <span className="ml-0.5 text-[11px] font-semibold text-ink-faint">ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
};
