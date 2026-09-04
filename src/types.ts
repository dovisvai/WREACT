export type GameMode = 
  | 'CLASSIC'
  | 'FALSE_ALARM'
  | 'PATTERN_SEQUENCE'
  | 'PRECISION_TARGET'
  | 'REVERSE_COLOR'
  | 'DAILY_CHALLENGE';

export type DeviceOS = 'iOS' | 'Android' | 'Web';

export interface ScoreRecord {
  id: string;
  /** Stable account id. Falls back to username+country when absent (legacy rows). */
  userId?: string;
  username: string;
  country: string; // ISO 2-letter country code
  scoreMs: number;
  mode: GameMode;
  timestamp: number;
  isDaily?: boolean;
  device: DeviceOS;
  badge?: string;
}

/** One nation's position in the World Standings, derived from real scores. */
export interface CountryStanding {
  code: string;
  name: string;
  flag: string;
  /** Mean of every member athlete's personal best. One athlete, one vote. */
  avgMs: number;
  athleteCount: number;
  bestMs: number;
  bestAthlete: string;
  /** False until the country fields MIN_ATHLETES_TO_QUALIFY athletes. */
  qualified: boolean;
  athletesNeeded: number;
  /** null while unqualified. */
  rank: number | null;
  /** Positive = climbed since the last snapshot. */
  rankDelta: number;
}

/** What a single run did to the player's national average. */
export interface PlayerContribution {
  countryCode: string;
  countryName: string;
  flag: string;
  /** Positive = the player made their country faster. */
  msImprovement: number;
  newCountryAvgMs: number;
  isFirstScore: boolean;
  isNationalBest: boolean;
  athletesNeeded: number;
  qualified: boolean;
}

/** A shared "beat my time" link, decoded from the launch URL. */
export interface ChallengeInvite {
  username: string;
  country: string;
  avatar: string;
  scoreMs: number;
  mode: GameMode;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  country: string;
  avatar: string;
  bestScore: number;
  testsCompleted: number;
  streakDays: number;
  lastDailyDate: string;
  history: {
    id: string;
    scoreMs: number;
    mode: GameMode;
    timestamp: number;
  }[];
  unlockedBadges: string[];
  isLoggedIn?: boolean;
  authProvider?: 'google' | 'apple' | 'guest';
  photoUrl?: string;
  verifiedAthlete?: boolean;
  proPassActive?: boolean;
}

export interface DailyChallengeInfo {
  id: string;
  date: string;
  title: string;
  description: string;
  mode: GameMode;
  targetMs: number;
  specialRule: string;
  participantsCount: number;
  topScoreMs: number;
  topScorer: string;
  topCountry: string;
}

export interface DuelRoomState {
  roomId: string;
  players: {
    id: string;
    username: string;
    country: string;
    avatar: string;
    ready: boolean;
    scoreMs?: number | null;
    falseStart?: boolean;
  }[];
  status: 'waiting' | 'countdown' | 'signal' | 'finished';
  signalTime?: number;
}

export interface LiveTickerEvent {
  id: string;
  username: string;
  country: string;
  scoreMs: number;
  mode: GameMode;
  timestamp: number;
}
