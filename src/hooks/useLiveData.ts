import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CountryStanding,
  DailyChallengeInfo,
  DeviceOS,
  GameMode,
  LiveTickerEvent,
  ScoreRecord,
} from '../types';
import { getIdToken, listenToGlobalLeaderboard } from '../services/firebase';
import { apiFetch, wsUrl } from '../services/api';
import { matchdayClock, type MatchdayClock, type MatchdayResult } from '../utils/matchday';

export interface ScoreSubmission {
  userId: string;
  username: string;
  country: string;
  scoreMs: number;
  mode: GameMode;
  device: DeviceOS;
  isDaily: boolean;
}

export interface LiveData {
  scores: ScoreRecord[];
  /** Authoritative national table for the matchday, computed server-side. */
  standings: CountryStanding[];
  /** The season clock. Ticks locally between server updates. */
  clock: MatchdayClock;
  /** Final table of the last completed matchday, with medals. */
  lastMatchdayResults: MatchdayResult[];
  /**
   * True until the first response arrives. Distinguishes "not yet" from
   * "nothing here", which are different claims about the world.
   */
  isLoading: boolean;
  liveTicker: LiveTickerEvent[];
  onlineCount: number;
  dailyChallenge: DailyChallengeInfo | null;
  sendScore: (submission: ScoreSubmission) => void;
}

/**
 * All live state for the app: the score pool, the world standings, the ticker
 * and the daily event, over a WebSocket with REST as the cold-start path.
 *
 * Standings arrive from the server rather than being derived here. A client
 * only ever holds the ranked slice of scores, so computing national averages
 * locally would give every device a different answer.
 */
export function useLiveData(): LiveData {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [standings, setStandings] = useState<CountryStanding[]>([]);
  const [clock, setClock] = useState<MatchdayClock>(() => matchdayClock());
  const [lastMatchdayResults, setLastMatchdayResults] = useState<MatchdayResult[]>([]);
  const [liveTicker, setLiveTicker] = useState<LiveTickerEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    apiFetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data?.scores) setScores(data.scores);
      })
      .catch(() => {});

    apiFetch('/api/standings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.standings) setStandings(data.standings);
        if (data?.clock) setClock(data.clock);
        if (data?.lastMatchdayResults) setLastMatchdayResults(data.lastMatchdayResults);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    // A backend that never answers must still resolve the loading state, or the
    // skeleton spins forever instead of showing the empty case.
    const loadTimeout = setTimeout(() => setIsLoading(false), 8000);

    apiFetch('/api/daily-challenge')
      .then((res) => res.json())
      .then((data) => {
        if (data?.id) setDailyChallenge(data);
      })
      .catch(() => {});

    const ws = new WebSocket(wsUrl());
    socketRef.current = ws;

    // Prove identity once, as soon as the socket opens. The server attributes
    // every later submission to the uid inside this token rather than trusting
    // whatever the payload claims.
    ws.onopen = () => {
      getIdToken().then((token) => {
        if (token && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'AUTH', token }));
        }
      });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'INIT_STATE') {
          if (typeof msg.onlinePlayers === 'number') setOnlineCount(msg.onlinePlayers);
          if (msg.scores) setScores(msg.scores);
          if (msg.standings) setStandings(msg.standings);
          if (msg.clock) setClock(msg.clock);
          if (msg.lastMatchdayResults) setLastMatchdayResults(msg.lastMatchdayResults);
          if (msg.ticker) setLiveTicker(msg.ticker);
          if (msg.dailyChallenge) setDailyChallenge(msg.dailyChallenge);
          setIsLoading(false);
        }

        if (msg.type === 'ONLINE_COUNT') setOnlineCount(msg.count);

        if (msg.type === 'MATCHDAY_CLOCK') setClock(msg.clock);

        if (msg.type === 'STANDINGS_UPDATE') setStandings(msg.standings);

        if (msg.type === 'SCORE_REJECTED') {
          console.warn('[WREACT] Score rejected by server:', msg.reason);
        }

        if (msg.type === 'MATCHDAY_ROLLOVER') {
          // The whistle: this week's table is final, the next one starts empty.
          if (msg.results) setLastMatchdayResults(msg.results);
          setStandings([]);
          setClock(matchdayClock());
        }

        if (msg.type === 'NEW_SCORE_ADDED') {
          setScores((prev) => [msg.score, ...prev]);
          if (msg.standings) setStandings(msg.standings);
          if (msg.ticker) setLiveTicker((prev) => [msg.ticker, ...prev.slice(0, 19)]);
          if (msg.dailyChallenge) setDailyChallenge(msg.dailyChallenge);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    // Firestore feeds the individual athlete board and survives server restarts.
    const unsubscribe = listenToGlobalLeaderboard((liveScores) => {
      if (!liveScores?.length) return;
      setScores((prev) => {
        const merged = new Map<string, ScoreRecord>();
        for (const score of [...liveScores, ...prev]) merged.set(score.id, score);
        return Array.from(merged.values());
      });
    });

    return () => {
      clearTimeout(loadTimeout);
      ws.close();
      unsubscribe();
    };
  }, []);

  /**
   * Tick the countdown locally between server broadcasts.
   *
   * The server sends the authoritative clock once a minute; without a local
   * tick the deadline would visibly freeze, which is the opposite of the
   * urgency the whole mechanic exists to create.
   */
  useEffect(() => {
    const id = setInterval(() => setClock(matchdayClock()), 15_000);
    return () => clearInterval(id);
  }, []);

  const sendScore = useCallback(async (submission: ScoreSubmission) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'SUBMIT_SCORE', payload: submission }));
      return;
    }

    // The REST fallback proves identity per request, since it has no socket to
    // have authenticated earlier.
    const token = await getIdToken();
    if (!token) return;

    apiFetch('/api/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submission),
    }).catch(() => {});
  }, []);

  return {
    scores,
    standings,
    isLoading,
    clock,
    lastMatchdayResults,
    liveTicker,
    onlineCount,
    dailyChallenge,
    sendScore,
  };
}
