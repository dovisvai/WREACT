import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ScoreRecord } from '../types';
import { Matchday } from '../utils/matchday';

/**
 * Server-side read path for the score pool.
 *
 * The server holds scores in memory so it can compute standings and broadcast
 * instantly, but memory dies with the process. Firestore is the durable record:
 * clients already write every score there, and `reaction_scores` is world-
 * readable under firestore.rules, so the server can rehydrate on boot with no
 * service-account key — nothing extra for anyone to provision.
 *
 * Deliberately imports only `firebase/app` and `firebase/firestore`, never
 * `firebase/auth`, which expects browser globals.
 */

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(
  app,
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)'
);

const SCORES_COLLECTION = 'reaction_scores';

interface FirestoreScoreDoc {
  userId?: string;
  username?: string;
  country?: string;
  scoreMs?: number;
  mode?: string;
  createdAt?: string;
  /** Server-set write time. Firestore Timestamp; authoritative for matchdays. */
  timestamp?: { toMillis?: () => number };
}

/**
 * When a score happened, according to the server rather than the submitter.
 *
 * `createdAt` is a string the client writes and can set to anything, and it
 * used to decide which matchday a score counted toward -- so a score could be
 * dated into next week and win a table before it opened. `timestamp` is pinned
 * to `request.time` by firestore.rules. The string is only a display fallback
 * for rows written before that rule existed.
 */
function writtenAt(data: FirestoreScoreDoc): number {
  const server = data.timestamp?.toMillis?.();
  if (typeof server === 'number' && Number.isFinite(server)) return server;
  const parsed = data.createdAt ? Date.parse(data.createdAt) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function toScoreRecord(id: string, data: FirestoreScoreDoc): ScoreRecord {
  return {
    id: `fs-${id}`,
    userId: data.userId,
    username: data.username || 'Anonymous',
    country: (data.country || 'US').toUpperCase(),
    scoreMs: Number(data.scoreMs) || 0,
    mode: (data.mode || 'CLASSIC') as ScoreRecord['mode'],
    timestamp: writtenAt(data),
    // device is deliberately omitted: Firestore does not store it, and
    // asserting a platform we do not know would be inventing data.
  };
}

/**
 * Load every score posted during a matchday.
 *
 * Filtered by `createdAt` so the query needs only a single-field index, which
 * Firestore provisions automatically — a composite index would be one more
 * thing to deploy before the table works.
 */
export async function fetchMatchdayScores(
  matchday: Matchday,
  max = 5000
): Promise<ScoreRecord[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, SCORES_COLLECTION),
        where('timestamp', '>=', new Date(matchday.startsAt)),
        where('timestamp', '<', new Date(matchday.endsAt)),
        orderBy('timestamp', 'desc'),
        limit(max)
      )
    );

    return snapshot.docs.map((doc) => toScoreRecord(doc.id, doc.data() as FirestoreScoreDoc));
  } catch (err) {
    console.warn(
      '[ScorePool] Firestore read failed; serving from memory only:',
      (err as Error)?.message ?? err
    );
    return [];
  }
}

/**
 * Merge a freshly-read pool with scores held in memory.
 *
 * A score can legitimately appear twice — once from the live WebSocket
 * submission and once from Firestore after the client's own write lands. That
 * is harmless for standings, which take the minimum per athlete, but the
 * athlete board reads better without visible duplicates, so identical
 * player/time/mode triples collapse to one.
 */
export function mergeScorePools(
  remote: ScoreRecord[],
  local: ScoreRecord[]
): ScoreRecord[] {
  const byIdentity = new Map<string, ScoreRecord>();

  for (const score of [...remote, ...local]) {
    const identity = `${score.userId || score.username}|${score.scoreMs}|${score.mode}`;
    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, score);
      continue;
    }

    // Keep the earlier record so timestamps stay closest to the actual run, but
    // carry over any field the winner lacks. Firestore does not store `device`,
    // so without this the durable copy would erase the platform the live
    // submission actually reported.
    const earlier = score.timestamp < existing.timestamp ? score : existing;
    const other = earlier === score ? existing : score;
    byIdentity.set(identity, { ...earlier, device: earlier.device ?? other.device });
  }

  return Array.from(byIdentity.values());
}
