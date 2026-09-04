import { ScoreRecord, CountryStanding, PlayerContribution, GameMode } from '../types';
import { COUNTRIES, getCountryFlag, getCountryName } from './countries';
import { Matchday, isRankedMode, isWithinMatchday } from './matchday';
import { isRestrictedCountry } from './restrictedCountries';

/**
 * A country must field this many athletes before it enters the World Standings.
 *
 * Without a floor, one lucky 120ms run puts a country of a single player on top
 * of the table permanently, which makes the whole premise meaningless. The floor
 * is also the strongest recruitment hook in the product: an unranked country
 * shows "needs 3 more athletes", which is a reason to go and get them.
 */
export const MIN_ATHLETES_TO_QUALIFY = 5;

/**
 * Scores outside this window are not human reaction times and never count
 * toward a national average. 80ms is below the physiological floor for
 * visual reaction (~100ms); anything above 2s is inattention, not reflex.
 */
export const MIN_VALID_MS = 80;
export const MAX_VALID_MS = 2000;

export function isPlausibleReaction(ms: number): boolean {
  return Number.isFinite(ms) && ms >= MIN_VALID_MS && ms <= MAX_VALID_MS;
}

/**
 * The upper bound for a mode, which is not the same for all of them.
 *
 * MAX_VALID_MS is calibrated for a single reaction, and applying it everywhere
 * rejected successful runs: Pattern Sequence times four consecutive find-and-tap
 * actions against a 1500ms target, so an ordinary good run lands near 1700ms and
 * a merely decent one exceeds 2000ms. Those runs were shown as "not recorded --
 * treated as inattention" after the player did everything right, and because
 * recordResult returns before submitting, the daily streak silently broke.
 *
 * CLASSIC is unchanged, so the standings -- which count CLASSIC alone -- keep
 * exactly the bounds they had.
 */
export function maxValidForMode(mode: GameMode): number {
  switch (mode) {
    case 'PATTERN_SEQUENCE':
      return 8000; // four sequential actions
    case 'REVERSE_COLOR':
      return 4000; // read the word, identify the ink, choose
    default:
      return MAX_VALID_MS;
  }
}

/** Mode-aware plausibility. Use wherever the discipline is known. */
export function isPlausibleForMode(ms: number, mode: GameMode): boolean {
  return Number.isFinite(ms) && ms >= MIN_VALID_MS && ms <= maxValidForMode(mode);
}

/** Stable per-player key. Prefers a real account id, falls back to name+country. */
function playerKey(score: ScoreRecord): string {
  return score.userId || `${score.username}@${score.country}`;
}

/**
 * Is this score allowed to affect a national average?
 *
 * Four gates, all of which have to hold: a plausible human time, the ranked
 * mode only, a country the app accepts entries from, and inside the matchday
 * window when one is supplied.
 */
export function countsTowardStandings(score: ScoreRecord, matchday?: Matchday): boolean {
  if (!isPlausibleReaction(score.scoreMs)) return false;
  if (!isRankedMode(score.mode)) return false;
  if (isRestrictedCountry(score.country)) return false;
  if (matchday && !isWithinMatchday(score.timestamp, matchday)) return false;
  return true;
}

/**
 * Reduce raw scores to one representative time per player: their personal best.
 *
 * One player, one vote. Averaging every run instead would penalise the players
 * who practise most, which is exactly backwards for retention.
 */
function bestScorePerPlayer(
  scores: ScoreRecord[],
  matchday?: Matchday
): Map<string, ScoreRecord> {
  const best = new Map<string, ScoreRecord>();

  for (const score of scores) {
    if (!countsTowardStandings(score, matchday)) continue;
    const key = playerKey(score);
    const current = best.get(key);
    if (!current || score.scoreMs < current.scoreMs) {
      best.set(key, score);
    }
  }

  return best;
}

/**
 * Build the World Standings table from raw score records.
 *
 * `previousRanks` carries the last snapshot's positions so the table can show
 * movement arrows. `matchday`, when given, restricts the table to that week —
 * which is what makes the standings a competition rather than a running total.
 */
export function computeStandings(
  scores: ScoreRecord[],
  previousRanks: Map<string, number> = new Map(),
  matchday?: Matchday
): CountryStanding[] {
  const best = bestScorePerPlayer(scores, matchday);

  const byCountry = new Map<string, ScoreRecord[]>();
  for (const score of best.values()) {
    const code = (score.country || '').toUpperCase();
    if (!code) continue;
    const bucket = byCountry.get(code);
    if (bucket) bucket.push(score);
    else byCountry.set(code, [score]);
  }

  const standings: CountryStanding[] = [];

  for (const [code, members] of byCountry) {
    const total = members.reduce((sum, s) => sum + s.scoreMs, 0);
    const avgMs = total / members.length;
    const fastest = members.reduce((a, b) => (a.scoreMs <= b.scoreMs ? a : b));
    const qualified = members.length >= MIN_ATHLETES_TO_QUALIFY;

    standings.push({
      code,
      name: getCountryName(code),
      flag: getCountryFlag(code),
      avgMs: Math.round(avgMs * 10) / 10,
      athleteCount: members.length,
      bestMs: fastest.scoreMs,
      bestAthlete: fastest.username,
      qualified,
      athletesNeeded: Math.max(0, MIN_ATHLETES_TO_QUALIFY - members.length),
      rank: null,
      rankDelta: 0,
    });
  }

  // Qualified countries rank by national average, fastest first.
  // Unqualified countries sort after them, by how close they are to qualifying.
  const qualified = standings
    .filter((s) => s.qualified)
    .sort((a, b) => a.avgMs - b.avgMs);

  const unqualified = standings
    .filter((s) => !s.qualified)
    .sort((a, b) => b.athleteCount - a.athleteCount || a.avgMs - b.avgMs);

  qualified.forEach((standing, index) => {
    standing.rank = index + 1;
    const previous = previousRanks.get(standing.code);
    // A positive delta means the country climbed (rank number went down).
    standing.rankDelta = previous ? previous - standing.rank : 0;
  });

  return [...qualified, ...unqualified];
}

/** Snapshot ranks so the next computation can report movement. */
export function snapshotRanks(standings: CountryStanding[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const standing of standings) {
    if (standing.rank !== null) map.set(standing.code, standing.rank);
  }
  return map;
}

export function findStanding(
  standings: CountryStanding[],
  code: string
): CountryStanding | undefined {
  const upper = (code || '').toUpperCase();
  return standings.find((s) => s.code === upper);
}

/**
 * What this player's run did to their country's average.
 *
 * This is the mechanic the whole product hangs on: a reaction test is a solo
 * act, but here every run visibly moves a nation. It gives a mediocre score a
 * reason to exist ("you still pulled us up 0.2ms") and gives a great score a
 * reason to be shared.
 */
export function computeContribution(
  standings: CountryStanding[],
  countryCode: string,
  playerPreviousBest: number | null,
  playerNewScore: number
): PlayerContribution | null {
  const standing = findStanding(standings, countryCode);
  if (!standing || !isPlausibleReaction(playerNewScore)) return null;

  const improvesPlayer =
    playerPreviousBest === null || playerNewScore < playerPreviousBest;

  // The national average only moves when the player's own best moves.
  if (!improvesPlayer) {
    return {
      countryCode: standing.code,
      countryName: standing.name,
      flag: standing.flag,
      msImprovement: 0,
      newCountryAvgMs: standing.avgMs,
      isFirstScore: false,
      isNationalBest: playerNewScore <= standing.bestMs,
      athletesNeeded: standing.athletesNeeded,
      qualified: standing.qualified,
    };
  }

  const isFirstScore = playerPreviousBest === null;
  const count = standing.athleteCount;

  // Reconstruct the average without this player, then with their new best.
  let avgBefore: number;
  let avgAfter: number;

  if (isFirstScore) {
    // The player is new: the current standing already excludes them.
    avgBefore = standing.avgMs;
    avgAfter = (standing.avgMs * count + playerNewScore) / (count + 1);
  } else {
    // The player is already counted at their previous best; swap it out.
    const totalWithOld = standing.avgMs * count;
    avgBefore = standing.avgMs;
    avgAfter = (totalWithOld - playerPreviousBest + playerNewScore) / count;
  }

  return {
    countryCode: standing.code,
    countryName: standing.name,
    flag: standing.flag,
    // Positive means the country got faster.
    msImprovement: Math.round((avgBefore - avgAfter) * 100) / 100,
    newCountryAvgMs: Math.round(avgAfter * 10) / 10,
    isFirstScore,
    isNationalBest: playerNewScore < standing.bestMs,
    athletesNeeded: standing.athletesNeeded,
    qualified: standing.qualified,
  };
}

/** Where a single time places against every ranked country's average. */
export function rankAgainstNations(
  standings: CountryStanding[],
  scoreMs: number
): { beats: number; total: number } {
  const ranked = standings.filter((s) => s.qualified);
  return {
    beats: ranked.filter((s) => scoreMs < s.avgMs).length,
    total: ranked.length,
  };
}

/** Countries with no scores at all — used to seed the "claim your country" prompt. */
export function unclaimedCountryCount(standings: CountryStanding[]): number {
  return Math.max(0, COUNTRIES.length - standings.length);
}
