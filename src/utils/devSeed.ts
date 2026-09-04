import { GameMode, ScoreRecord } from '../types';

/**
 * Deterministic development seed.
 *
 * This exists so the standings table is demonstrable on a fresh clone. It is
 * generated only when NODE_ENV !== 'production' — a production server starts
 * with an empty table and fills with real results, because a national average
 * built partly from invented athletes would be a lie about the one number this
 * product exists to report.
 */

/** Mulberry32 — small, fast, seeded. Same data on every boot. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller: reaction times cluster normally, they are not uniform. */
function normal(random: () => number, mean: number, sd: number): number {
  const u = Math.max(random(), Number.EPSILON);
  const v = random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Country code paired with the mean best-time of its athletes. */
const SEED_NATIONS: [string, number, number][] = [
  // code, mean personal best (ms), athlete count
  ['JP', 196, 34],
  ['KR', 199, 28],
  ['SG', 203, 12],
  ['DE', 207, 31],
  ['SE', 209, 14],
  ['NL', 210, 16],
  ['FI', 211, 9],
  ['CN', 212, 26],
  ['US', 214, 48],
  ['NO', 215, 8],
  ['DK', 216, 7],
  ['CA', 218, 19],
  ['GB', 219, 27],
  ['AU', 220, 15],
  ['TW', 221, 11],
  ['CH', 222, 6],
  ['AT', 223, 7],
  ['PL', 224, 18],
  ['FR', 225, 22],
  ['BE', 226, 8],
  ['CZ', 227, 9],
  ['LT', 228, 7],
  ['EE', 229, 5],
  ['LV', 230, 5],
  ['IE', 231, 6],
  ['ES', 232, 17],
  ['IT', 233, 19],
  ['NZ', 234, 6],
  ['PT', 235, 8],
  ['BR', 237, 24],
  ['MX', 239, 15],
  ['RU', 240, 16],
  ['TR', 242, 13],
  ['AR', 243, 11],
  ['IN', 245, 38],
  ['ZA', 247, 9],
  ['ID', 249, 14],
  ['PH', 251, 12],
  ['VN', 252, 10],
  ['NG', 255, 8],
  ['EG', 257, 7],
  ['KE', 259, 5],
  // Deliberately below the qualifying threshold, to exercise the
  // "needs more athletes" state in the UI.
  ['IS', 218, 3],
  ['MT', 233, 2],
  ['UY', 240, 4],
];

const NAME_PARTS_A = [
  'Swift', 'Rapid', 'Nova', 'Volt', 'Apex', 'Flux', 'Neon', 'Turbo',
  'Blitz', 'Vector', 'Pulse', 'Zenith', 'Quartz', 'Onyx', 'Falcon', 'Comet',
];
const NAME_PARTS_B = [
  'Reflex', 'Hand', 'Nerve', 'Snap', 'Trigger', 'Edge', 'Spark', 'Wire',
  'Sync', 'Dash', 'Bolt', 'Flick', 'Shift', 'Drive', 'Sight', 'Tap',
];

/** Modes that appear on the athlete board but never touch a national average. */
const SIDE_MODES: GameMode[] = ['FALSE_ALARM', 'PRECISION_TARGET', 'DAILY_CHALLENGE'];

/**
 * Build the seed pool for the matchday currently being contested.
 *
 * Every ranked run is stamped inside the given window and uses the ranked mode,
 * because the standings now filter on both — seed data outside the week, or in
 * a mode that does not count, would simply vanish from the table.
 */
export function generateDevScores(
  windowStart: number,
  windowEnd: number
): ScoreRecord[] {
  const random = makeRandom(20260827);
  const scores: ScoreRecord[] = [];

  // Keep seeded runs strictly inside the window, and never in the future.
  const now = Date.now();
  const latest = Math.min(now, windowEnd - 1);
  const span = Math.max(1, latest - windowStart);

  const stampWithin = () => windowStart + Math.floor(random() * span);

  for (const [country, meanMs, athleteCount] of SEED_NATIONS) {
    for (let i = 0; i < athleteCount; i += 1) {
      const userId = `seed-${country}-${i}`;
      const username = `${NAME_PARTS_A[Math.floor(random() * NAME_PARTS_A.length)]}${
        NAME_PARTS_B[Math.floor(random() * NAME_PARTS_B.length)]
      }${Math.floor(random() * 90) + 10}`;

      const ability = normal(random, meanMs, 26);
      const runs = 1 + Math.floor(random() * 3);

      for (let run = 0; run < runs; run += 1) {
        // A given athlete's runs vary around their own ability.
        const scoreMs = Math.round(
          Math.min(1200, Math.max(120, normal(random, ability + run * 4, 14)))
        );

        scores.push({
          id: `seed-${country}-${i}-${run}`,
          userId,
          username,
          country,
          scoreMs,
          mode: 'CLASSIC',
          timestamp: stampWithin(),
          device: random() > 0.5 ? 'iOS' : 'Android',
        });
      }

      // A minority also post in a side mode, so the athlete board shows variety
      // without any of it reaching the national table.
      if (random() > 0.75) {
        scores.push({
          id: `seed-${country}-${i}-side`,
          userId,
          username,
          country,
          scoreMs: Math.round(Math.max(150, normal(random, ability + 90, 40))),
          mode: SIDE_MODES[Math.floor(random() * SIDE_MODES.length)],
          timestamp: stampWithin(),
          device: random() > 0.5 ? 'iOS' : 'Android',
        });
      }
    }
  }

  return scores;
}
