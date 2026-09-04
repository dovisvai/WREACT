import { GameMode } from '../types';

/**
 * The season clock.
 *
 * A national average with no end date is a number, not a competition. Matchday
 * gives the standings a whistle: every week the table is built from that week's
 * results alone, then it locks, medals are awarded, and it resets. That is what
 * creates a reason to come back on Thursday, a reason to recruit on Sunday
 * afternoon, and something worth pushing a notification about.
 */

/**
 * Only Classic times count toward a nation's average.
 *
 * The other modes measure different things — Precision Target folds in movement
 * time, Sequence is four taps, Stroop is a cognitive task. Averaging them
 * together produces a "national reaction time" that means nothing and that a
 * player can game by picking a favourable mode. One mode, one number.
 */
export const RANKED_MODE: GameMode = 'CLASSIC';

export function isRankedMode(mode: GameMode): boolean {
  return mode === RANKED_MODE;
}

/** Matchday 1 began 00:00 UTC on Monday 3 August 2026. */
const SEASON_EPOCH_MS = Date.UTC(2026, 7, 3);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface Matchday {
  /** Stable id, e.g. "MD-12". */
  id: string;
  /** Sequential number since the season epoch, starting at 1. */
  number: number;
  /** Inclusive start, 00:00 UTC Monday. */
  startsAt: number;
  /** Exclusive end, 00:00 UTC the following Monday. */
  endsAt: number;
}

/**
 * Weeks run Monday to Sunday in UTC, deliberately — a global table cannot use a
 * local week boundary without handing whichever timezone rolls over last a few
 * extra hours to post times.
 */
export function matchdayAt(now: number = Date.now()): Matchday {
  const elapsed = now - SEASON_EPOCH_MS;
  const index = Math.max(0, Math.floor(elapsed / WEEK_MS));
  const startsAt = SEASON_EPOCH_MS + index * WEEK_MS;

  return {
    id: `MD-${index + 1}`,
    number: index + 1,
    startsAt,
    endsAt: startsAt + WEEK_MS,
  };
}

export function previousMatchday(now: number = Date.now()): Matchday {
  const current = matchdayAt(now);
  if (current.number <= 1) return current;
  return matchdayAt(current.startsAt - 1);
}

export interface MatchdayClock {
  matchday: Matchday;
  msRemaining: number;
  /** Whole hours left, floored. */
  hoursRemaining: number;
  /** True inside the last six hours — the window worth notifying about. */
  isFinalHours: boolean;
  /** True in the last hour. */
  isFinalWhistle: boolean;
}

export function matchdayClock(now: number = Date.now()): MatchdayClock {
  const matchday = matchdayAt(now);
  const msRemaining = Math.max(0, matchday.endsAt - now);
  const hoursRemaining = Math.floor(msRemaining / 3_600_000);

  return {
    matchday,
    msRemaining,
    hoursRemaining,
    isFinalHours: msRemaining <= 6 * 3_600_000,
    isFinalWhistle: msRemaining <= 3_600_000,
  };
}

/** "2d 14h" / "5h 12m" / "48m" — deadline pressure needs the right unit. */
export function formatRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return 'Final whistle';

  const totalMinutes = Math.floor(msRemaining / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Whether a timestamp falls inside a given matchday. */
export function isWithinMatchday(timestamp: number, matchday: Matchday): boolean {
  return timestamp >= matchday.startsAt && timestamp < matchday.endsAt;
}

/** Medals awarded at the whistle. */
export type Medal = 'gold' | 'silver' | 'bronze' | null;

export function medalForRank(rank: number | null): Medal {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return null;
}

/** One nation's finishing position in a completed matchday. */
export interface MatchdayResult {
  matchdayId: string;
  matchdayNumber: number;
  countryCode: string;
  rank: number;
  avgMs: number;
  athleteCount: number;
  medal: Medal;
}
