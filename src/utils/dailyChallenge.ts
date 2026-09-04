import { DailyChallengeInfo, GameMode } from '../types';

/**
 * The daily event.
 *
 * Two design decisions worth stating, because they are what make this a shared
 * event rather than a setting:
 *
 * 1. `DAILY_CHALLENGE` is not a game mode. It is a wrapper that nominates one
 *    of the real modes for the day and sets a target. Previously it was a
 *    seventh mode that played identically to Classic, which is why the Daily
 *    tab had nothing in it.
 *
 * 2. The rotation is derived from the date, not stored. Every player in the
 *    world gets the same challenge on the same day with no server state, no
 *    database round trip, and no way for two clients to disagree — and a
 *    restarted server picks up exactly where it left off.
 */

/** Modes the daily can nominate. Deliberately excludes the wrapper itself. */
export const DAILY_ROTATION: GameMode[] = [
  'CLASSIC',
  'FALSE_ALARM',
  'PRECISION_TARGET',
  'REVERSE_COLOR',
  'PATTERN_SEQUENCE',
  'CLASSIC',
  'FALSE_ALARM',
];

interface DailyPreset {
  title: string;
  description: string;
  /** Beat this to rank. Calibrated per mode — the tasks are not comparable. */
  targetMs: number;
  specialRule: string;
}

/**
 * Targets are per-mode because the modes measure different things. A 200ms
 * target is a good day in Classic and physically impossible in Sequence, which
 * requires four separate taps.
 */
const PRESETS: Record<GameMode, DailyPreset> = {
  CLASSIC: {
    title: 'Pure Signal',
    description: 'No tricks, no decoys. One green flash, one tap, your fastest honest time.',
    targetMs: 220,
    specialRule: 'Counts toward your national average.',
  },
  FALSE_ALARM: {
    title: 'Hold Your Nerve',
    description: 'Decoys before the real signal. Going early ends the run.',
    targetMs: 250,
    specialRule: 'Discipline over speed — a false start scores nothing.',
  },
  PRECISION_TARGET: {
    title: 'Find It Fast',
    description: 'A target appears somewhere on screen. Reaction plus aim, against the clock.',
    targetMs: 480,
    specialRule: 'Movement time counts, so distance matters.',
  },
  REVERSE_COLOR: {
    title: 'Read The Ink',
    description: 'The word lies. Tap the colour it is printed in, not the colour it names.',
    targetMs: 750,
    specialRule: 'A cognitive test — reading fast is what slows you down.',
  },
  PATTERN_SEQUENCE: {
    title: 'Four In A Row',
    description: 'Four highlighted buttons, in order, as quickly as you can hit them.',
    targetMs: 1500,
    specialRule: 'One wrong button resets the sequence.',
  },
  DAILY_CHALLENGE: {
    title: 'Daily Event',
    description: "Today's global event.",
    targetMs: 250,
    specialRule: '',
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC day key, so the event turns over at the same instant everywhere. */
export function dayKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function dayIndex(now: number): number {
  return Math.floor(now / DAY_MS);
}

/**
 * Which real mode is today's event, worldwide.
 *
 * The rotation has as many entries as the week has days, so indexing it by the
 * day number alone pinned every discipline to a weekday for ever -- Monday was
 * always Pattern Sequence. Precessing by the week number keeps the schedule
 * deterministic and identical worldwide while letting each mode fall on every
 * day of the week over time.
 */
export function dailyModeFor(now: number = Date.now()): GameMode {
  const day = dayIndex(now);
  const week = Math.floor(day / 7);
  return DAILY_ROTATION[(day + week) % DAILY_ROTATION.length];
}

/**
 * Build today's event.
 *
 * Participation figures are intentionally absent rather than invented — the
 * server fills them from real submissions, and a fabricated "4,280 entrants"
 * on an empty leaderboard is exactly the kind of thing that erodes trust in
 * every other number in the product.
 */
export function buildDailyChallenge(now: number = Date.now()): DailyChallengeInfo {
  const mode = dailyModeFor(now);
  const preset = PRESETS[mode];
  const date = dayKey(now);

  return {
    id: `daily-${date}`,
    date,
    title: preset.title,
    description: preset.description,
    mode,
    targetMs: preset.targetMs,
    specialRule: preset.specialRule,
    participantsCount: 0,
    topScoreMs: 0,
    topScorer: '',
    topCountry: '',
  };
}

/** Tomorrow's mode, for a "coming up" line that gives a reason to return. */
export function nextDailyMode(now: number = Date.now()): GameMode {
  return dailyModeFor(now + DAY_MS);
}

/** Milliseconds until the event rolls over. */
export function msUntilNextDaily(now: number = Date.now()): number {
  return (dayIndex(now) + 1) * DAY_MS - now;
}

/** Human label for a mode, used wherever the daily names its discipline. */
export const MODE_LABELS: Record<GameMode, string> = {
  CLASSIC: 'Classic',
  FALSE_ALARM: 'Trap Signal',
  PRECISION_TARGET: 'Precision Target',
  REVERSE_COLOR: 'Reverse Stroop',
  PATTERN_SEQUENCE: 'Speed Sequence',
  DAILY_CHALLENGE: 'Daily',
};
