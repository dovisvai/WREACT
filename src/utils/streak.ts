import { UserProfile } from '../types';
import { dayKey } from './dailyChallenge';

/**
 * Daily streak.
 *
 * `streakDays` was initialised to zero and never written by anything, so the
 * badge never appeared, the streak achievement was unreachable, and the
 * OneSignal `streak_days` tag was permanently "0" — which meant the
 * streak-at-risk campaign could never fire at a single person.
 *
 * Days are UTC, matching the daily event and the matchday, so a player does not
 * gain or lose a day by travelling.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StreakUpdate {
  streakDays: number;
  lastDailyDate: string;
  /** True when this completion extended the streak rather than repeating a day. */
  advanced: boolean;
  /** True when a previous streak lapsed and this run started a new one. */
  broken: boolean;
}

/**
 * Apply a daily completion.
 *
 * Only the first completion of a given day counts. Playing the event five times
 * is practice, not five days of consistency, and treating it otherwise would
 * make the number meaningless.
 */
export function advanceStreak(
  profile: Pick<UserProfile, 'streakDays' | 'lastDailyDate'>,
  now: number = Date.now()
): StreakUpdate {
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY_MS);
  const last = profile.lastDailyDate;
  const current = profile.streakDays || 0;

  // Already counted today.
  if (last === today) {
    return { streakDays: current, lastDailyDate: today, advanced: false, broken: false };
  }

  // Consecutive day.
  if (last === yesterday) {
    return {
      streakDays: current + 1,
      lastDailyDate: today,
      advanced: true,
      broken: false,
    };
  }

  // First ever, or the chain lapsed.
  return {
    streakDays: 1,
    lastDailyDate: today,
    advanced: true,
    broken: Boolean(last) && current > 0,
  };
}

/** Has the player already completed today's event? */
export function hasPlayedToday(
  profile: Pick<UserProfile, 'lastDailyDate'>,
  now: number = Date.now()
): boolean {
  return profile.lastDailyDate === dayKey(now);
}

/**
 * A streak is at risk once the last completion was yesterday and today is
 * still unplayed — the only honest moment to warn someone about losing it.
 */
export function isStreakAtRisk(
  profile: Pick<UserProfile, 'streakDays' | 'lastDailyDate'>,
  now: number = Date.now()
): boolean {
  if (!profile.streakDays) return false;
  return profile.lastDailyDate === dayKey(now - DAY_MS);
}
