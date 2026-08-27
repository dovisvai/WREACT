import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth & Firestore with specific database ID from config
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(
  app, 
  (firebaseConfig as any).firestoreDatabaseId || '(default)'
);

// Collections
export const ATHLETES_COLLECTION = 'athletes';
export const SCORES_COLLECTION = 'reaction_scores';
export const DUELS_COLLECTION = 'duel_rooms';

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfileToFirebase(profile: any) {
  if (!profile || !profile.id) return;
  try {
    const userRef = doc(db, ATHLETES_COLLECTION, profile.id);
    await setDoc(userRef, {
      userId: profile.id,
      username: profile.username || 'Anonymous Athlete',
      country: profile.country || 'US',
      avatar: profile.avatar || '⚡',
      streakDays: profile.streakDays || 0,
      bestScore: profile.bestScore || null,
      averageScore: profile.averageScore || null,
      testsCompleted: profile.testsCompleted || 0,
      unlockedBadges: profile.unlockedBadges || [],
      verifiedAthlete: profile.verifiedAthlete || false,
      proPassActive: profile.proPassActive || false,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[Firebase] Synchronized athlete profile to Firestore.');
  } catch (err) {
    console.warn('[Firebase] Profile sync error (offline fallback active):', err);
  }
}

/**
 * Submit real reaction score to live Firestore Global Leaderboard
 */
export async function submitReactionScoreToFirebase(scoreData: {
  userId: string;
  username: string;
  country: string;
  avatar: string;
  scoreMs: number;
  mode: string;
  tier: string;
}) {
  try {
    const scoresRef = collection(db, SCORES_COLLECTION);
    await addDoc(scoresRef, {
      ...scoreData,
      verified: true,
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
    });
    console.log('[Firebase] Submitted reaction score to Firestore global leaderboard.');
  } catch (err) {
    console.warn('[Firebase] Score submit error:', err);
  }
}

/**
 * Fetch top reaction scores for Global Leaderboard from Firestore
 */
export async function fetchGlobalLeaderboardFromFirebase(limitCount: number = 50) {
  try {
    const scoresRef = collection(db, SCORES_COLLECTION);
    const q = query(scoresRef, orderBy('scoreMs', 'asc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  } catch (err) {
    console.warn('[Firebase] Leaderboard fetch error, fallback active:', err);
  }
  return null;
}

/**
 * Real-time listener for Global Leaderboard
 */
export function listenToGlobalLeaderboard(onUpdate: (scores: any[]) => void) {
  try {
    const scoresRef = collection(db, SCORES_COLLECTION);
    const q = query(scoresRef, orderBy('scoreMs', 'asc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const liveScores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      if (liveScores.length > 0) {
        onUpdate(liveScores);
      }
    }, (err) => {
      console.warn('[Firebase] Leaderboard snapshot error:', err);
    });
  } catch (err) {
    console.warn('[Firebase] Failed to attach leaderboard listener:', err);
    return () => {};
  }
}

export {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User
};
