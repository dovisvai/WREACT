import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ScoreRecord, UserProfile } from '../types';
import { isPlausibleReaction } from '../utils/standings';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(
  app,
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)'
);

export const ATHLETES_COLLECTION = 'athletes';
export const SCORES_COLLECTION = 'reaction_scores';
export const DUELS_COLLECTION = 'duel_rooms';

/* ---------------------------------------------------------------------------
 * Authentication
 *
 * Every write in firestore.rules is gated on `request.auth`. Nothing in the app
 * previously signed in, so every profile write was silently rejected with
 * permission-denied and the "cloud sync" was decorative. Anonymous auth runs at
 * boot and gives each device a stable uid; a later Google sign-in upgrades the
 * same uid rather than creating a second identity.
 * ------------------------------------------------------------------------- */

let authReady: Promise<User | null> | null = null;

/**
 * Resolve once Firebase has an authenticated user, signing in anonymously if
 * needed. Safe to call repeatedly — the promise is cached.
 */
export function ensureSignedIn(): Promise<User | null> {
  if (authReady) return authReady;

  authReady = new Promise<User | null>((resolve) => {
    // onAuthStateChanged can fire again while the sign-in call is still in
    // flight. Without this guard each fire starts another attempt, so a single
    // failure turns into a burst of identical errors in the console.
    let settling = false;

    const settle = (user: User | null, unsubscribe: () => void) => {
      if (settling) return;
      settling = true;
      unsubscribe();
      resolve(user);
    };

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (settling) return;

        if (user) {
          settle(user, unsubscribe);
          return;
        }

        settling = true;
        try {
          const credential = await signInAnonymously(auth);
          unsubscribe();
          resolve(credential.user);
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code === 'auth/admin-restricted-operation') {
            // The single most common misconfiguration: Anonymous sign-in is
            // switched off for the project, so every write is rejected and
            // nothing durably persists. Name the fix rather than the error.
            console.warn(
              '[Firebase] Anonymous sign-in is disabled for this project, so scores ' +
                'cannot be saved. Enable it in Firebase Console → Authentication → ' +
                'Sign-in method → Anonymous. Running offline until then.'
            );
          } else {
            console.warn('[Firebase] Anonymous sign-in failed; running offline:', err);
          }
          unsubscribe();
          resolve(null);
        }
      },
      (err) => {
        console.warn('[Firebase] Auth state error; running offline:', err);
        settle(null, unsubscribe);
      }
    );
  });

  return authReady;
}

/**
 * A Firebase ID token for the current user.
 *
 * The SDK refreshes this transparently when it is close to expiry, so callers
 * can ask for one before every submission without managing the lifecycle.
 */
export async function getIdToken(): Promise<string | null> {
  const user = await ensureSignedIn();
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (err) {
    console.warn('[Firebase] Could not mint an ID token:', err);
    return null;
  }
}

/** The signed-in uid, or null when offline. This is the canonical athlete id. */
export async function currentUserId(): Promise<string | null> {
  const user = await ensureSignedIn();
  return user?.uid ?? null;
}

/* ---------------------------------------------------------------------------
 * Profile
 * ------------------------------------------------------------------------- */

export interface SyncableProfile {
  username?: string;
  country?: string;
  avatar?: string;
  streakDays?: number;
  bestScore?: number | null;
  testsCompleted?: number;
  unlockedBadges?: string[];
  verifiedAthlete?: boolean;
  proPassActive?: boolean;
}

/**
 * Write the athlete profile under the Firebase uid.
 *
 * The document id must equal `request.auth.uid` or firestore.rules rejects it,
 * so the local profile id is deliberately ignored here.
 */
export async function syncUserProfileToFirebase(profile: SyncableProfile): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;

  const username = String(profile.username || 'Anonymous').slice(0, 30).trim();
  const country = String(profile.country || 'US').slice(0, 3).toUpperCase();

  // Rules require a non-empty username and a 2–3 char country; bail rather than
  // firing a write that is certain to be rejected.
  if (!username || country.length < 2) return;

  try {
    await setDoc(
      doc(db, ATHLETES_COLLECTION, uid),
      {
        userId: uid,
        username,
        country,
        avatar: profile.avatar || '⚡',
        streakDays: profile.streakDays || 0,
        bestScore:
          typeof profile.bestScore === 'number' && profile.bestScore > 0
            ? profile.bestScore
            : null,
        testsCompleted: profile.testsCompleted || 0,
        unlockedBadges: profile.unlockedBadges || [],
        verifiedAthlete: Boolean(profile.verifiedAthlete),
        proPassActive: Boolean(profile.proPassActive),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firebase] Profile sync failed (local state retained):', err);
  }
}

/**
 * Read the athlete profile back from Firestore.
 *
 * The document was being written and never read, so cloud sync only went one
 * way: reinstall or switch device and the profile was gone despite sitting in
 * the database. Returns null when there is nothing stored for this uid.
 */
export async function fetchAthleteProfile(): Promise<Partial<UserProfile> | null> {
  const uid = await currentUserId();
  if (!uid) return null;

  try {
    const snapshot = await getDoc(doc(db, ATHLETES_COLLECTION, uid));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as Record<string, unknown>;

    return {
      username: typeof data.username === 'string' ? data.username : undefined,
      country: typeof data.country === 'string' ? data.country : undefined,
      avatar: typeof data.avatar === 'string' ? data.avatar : undefined,
      streakDays: typeof data.streakDays === 'number' ? data.streakDays : undefined,
      bestScore: typeof data.bestScore === 'number' ? data.bestScore : undefined,
      testsCompleted:
        typeof data.testsCompleted === 'number' ? data.testsCompleted : undefined,
      unlockedBadges: Array.isArray(data.unlockedBadges)
        ? (data.unlockedBadges as string[])
        : undefined,
      verifiedAthlete: Boolean(data.verifiedAthlete),
      proPassActive: Boolean(data.proPassActive),
    };
  } catch (err) {
    console.warn('[Firebase] Profile restore failed:', err);
    return null;
  }
}

/* ---------------------------------------------------------------------------
 * Scores
 * ------------------------------------------------------------------------- */

export async function submitReactionScoreToFirebase(scoreData: {
  username: string;
  country: string;
  avatar: string;
  scoreMs: number;
  mode: string;
  tier: string;
}): Promise<void> {
  // Never send a score the rules will reject, and never pollute a national
  // average with an implausible time.
  if (!isPlausibleReaction(scoreData.scoreMs)) return;

  const uid = await currentUserId();
  if (!uid) return;

  try {
    await addDoc(collection(db, SCORES_COLLECTION), {
      userId: uid,
      username: String(scoreData.username || 'Anonymous').slice(0, 30).trim(),
      country: String(scoreData.country || 'US').slice(0, 3).toUpperCase(),
      avatar: scoreData.avatar || '⚡',
      scoreMs: Math.round(scoreData.scoreMs),
      mode: scoreData.mode,
      tier: scoreData.tier,
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firebase] Score submit failed:', err);
  }
}

interface FirestoreScoreDoc {
  userId?: string;
  username?: string;
  country?: string;
  scoreMs?: number;
  mode?: string;
  createdAt?: string;
}

function toScoreRecord(id: string, data: FirestoreScoreDoc): ScoreRecord {
  return {
    id,
    userId: data.userId,
    username: data.username || 'Anonymous',
    country: (data.country || 'US').toUpperCase(),
    scoreMs: Number(data.scoreMs) || 0,
    mode: (data.mode || 'CLASSIC') as ScoreRecord['mode'],
    timestamp: data.createdAt ? Date.parse(data.createdAt) : Date.now(),
    device: 'iOS',
  };
}

/**
 * Pull enough scores to compute national averages.
 *
 * The standings need every athlete's best, not just the global top 50, so this
 * reads a wide window rather than the podium.
 */
export async function fetchScoresForStandings(limitCount = 1000): Promise<ScoreRecord[]> {
  await ensureSignedIn();

  try {
    const snapshot = await getDocs(
      query(collection(db, SCORES_COLLECTION), orderBy('scoreMs', 'asc'), limit(limitCount))
    );
    return snapshot.docs.map((d) => toScoreRecord(d.id, d.data() as FirestoreScoreDoc));
  } catch (err) {
    console.warn('[Firebase] Standings fetch failed:', err);
    return [];
  }
}

/** Live listener over the score pool that feeds both leaderboards. */
export function listenToGlobalLeaderboard(
  onUpdate: (scores: ScoreRecord[]) => void,
  limitCount = 500
): () => void {
  let stopped = false;
  let detach: (() => void) | null = null;

  ensureSignedIn().then(() => {
    if (stopped) return;

    try {
      detach = onSnapshot(
        query(
          collection(db, SCORES_COLLECTION),
          orderBy('scoreMs', 'asc'),
          limit(limitCount)
        ),
        (snapshot) => {
          onUpdate(
            snapshot.docs.map((d) => toScoreRecord(d.id, d.data() as FirestoreScoreDoc))
          );
        },
        (err) => console.warn('[Firebase] Leaderboard listener error:', err)
      );
    } catch (err) {
      console.warn('[Firebase] Could not attach leaderboard listener:', err);
    }
  });

  return () => {
    stopped = true;
    detach?.();
  };
}

export { signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, type User };
