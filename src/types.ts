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
  username: string;
  country: string; // ISO 2-letter country code
  scoreMs: number;
  mode: GameMode;
  timestamp: number;
  isDaily?: boolean;
  device: DeviceOS;
  badge?: string;
}

export interface CountryStat {
  country: string;
  name: string;
  flag: string;
  avgMs: number;
  totalPlayers: number;
  bestMs: number;
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

export interface FriendUser {
  id: string;
  username: string;
  country: string;
  avatar: string;
  bestScore: number;
  modeScores?: Partial<Record<GameMode, number>>;
  testsCompleted: number;
  streakDays: number;
  verifiedAthlete?: boolean;
  status: 'online' | 'in_game' | 'offline';
  lastActive: string;
  addedAt: number;
}

export interface LiveTickerEvent {
  id: string;
  username: string;
  country: string;
  scoreMs: number;
  mode: GameMode;
  timestamp: number;
}
