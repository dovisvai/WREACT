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

/**
 * How many scores a client keeps in memory.
 *
 * Far more than any screen shows, and small enough that a long session on a
 * phone does not accumulate an unbounded array.
 */
const MAX_CLIENT_SCORES = 500;

export interface ScoreSubmission {
  userId: string;
  username: string;
  country: string;
  scoreMs: number;
  mode: GameMode;
  device: DeviceOS;
  isDaily: boolean;
}

/**
 * Submit over REST, proving identity per request.
 *
 * This is the path that still works when the socket's identity has lapsed:
 * the socket authenticates once and can fall out of date, while this mints a
 * token for the submission it is carrying. It is both the cold-start path and
 * the recovery path for a score the socket refused.
 */
async function postScore(submission: ScoreSubmission): Promise<void> {
  const token = await getIdToken();
  if (!token) return;
  try {
    await apiFetch('/api/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submission),
    });
  } catch {
    // The score is already on the player's screen and Firestore holds the
    // durable copy; a failed relay costs the live ticker, not the record.
  }
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

  /**
   * Scores sent over the socket and not yet answered.
   *
   * The server rejects in the order it received, so this drains FIFO: a
   * rejection consumes the submission that caused it. It exists so that a
   * score refused for a lapsed identity can be replayed instead of vanishing
   * with a console warning, which is what used to happen. Capped, because
   * nothing drains it when every submission is accepted.
   */
  const pendingScoresRef = useRef<ScoreSubmission[]>([]);

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

    // The socket carries scores, standings, the clock and the ticker. On a
    // phone it drops routinely -- screen sleep, a wifi-to-cellular handover,
    // the app going to the background -- and with no reconnect the first drop
    // stranded the app on the REST fallback for the rest of the session.
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let reauthTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disposed = false;

    /**
     * Prove identity on this socket.
     *
     * The server expires a socket's identity with the token behind it, so this
     * runs again before that happens. A socket can outlive its credential by
     * hours otherwise, and used to keep full privileges the whole time.
     */
    const authenticate = (ws: WebSocket, force = false) => {
      getIdToken(force).then((token) => {
        if (token && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'AUTH', token }));
        }
      });
    };

    // Guards the one-shot forced refresh below, so a token the server will
    // never accept cannot turn into a refresh loop.
    let forcedRefresh = false;

    const handleMessage = (event: MessageEvent) => {
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

        /**
         * Refresh ahead of expiry rather than discovering it mid-submission.
         *
         * Firebase ID tokens last an hour and the SDK mints a fresh one on
         * request, so re-authenticating a few minutes early costs nothing and
         * means a player's score is never rejected because their credential
         * aged out between rounds.
         */
        if (msg.type === 'AUTH_RESULT') {
          if (msg.ok && typeof msg.expiresAtMs === 'number') {
            forcedRefresh = false;
            if (reauthTimer) clearTimeout(reauthTimer);
            const lead = 5 * 60 * 1000;
            const delay = Math.max(30_000, msg.expiresAtMs - Date.now() - lead);
            reauthTimer = setTimeout(() => {
              const live = socketRef.current;
              if (live && live.readyState === WebSocket.OPEN) authenticate(live);
            }, delay);
          } else if (!forcedRefresh) {
            /**
             * The server refused the token we hold, and this branch used to be
             * absent entirely -- the message was dropped, no timer was set, and
             * the socket stayed open and permanently anonymous while every
             * score submitted on it was discarded.
             *
             * Re-sending would fail identically, because the SDK serves its
             * cached copy while the client's own clock says it is valid. So
             * mint a genuinely fresh one, once. If that is refused too the
             * credential is not the problem and retrying cannot fix it.
             */
            forcedRefresh = true;
            const live = socketRef.current;
            if (live && live.readyState === WebSocket.OPEN) authenticate(live, true);
          }
        }

        // The server dropped our identity because the token behind it expired.
        if (msg.type === 'REAUTH_REQUIRED') {
          const live = socketRef.current;
          if (live && live.readyState === WebSocket.OPEN) authenticate(live);
        }

        if (msg.type === 'ONLINE_COUNT') setOnlineCount(msg.count);

        if (msg.type === 'MATCHDAY_CLOCK') setClock(msg.clock);

        if (msg.type === 'STANDINGS_UPDATE') setStandings(msg.standings);

        if (msg.type === 'SCORE_REJECTED') {
          /**
           * A score refused for identity is not the player's fault, and this
           * used to be a console warning -- the run was gone, while the time
           * stayed on screen as though it had counted.
           *
           * REST proves identity per request, so it succeeds exactly where the
           * socket failed. Every other reason -- rate limited, implausible --
           * is a decision the server meant to make, and replaying it would
           * only ask twice.
           */
          const replay =
            msg.reason === 'unauthenticated' ? pendingScoresRef.current.shift() : undefined;
          if (replay) {
            void postScore(replay);
          } else {
            console.warn('[WREACT] Score rejected by server:', msg.reason);
          }
        }

        if (msg.type === 'MATCHDAY_ROLLOVER') {
          // The whistle: this week's table is final, the next one starts empty.
          if (msg.results) setLastMatchdayResults(msg.results);
          setStandings([]);
          setClock(matchdayClock());
        }

        if (msg.type === 'NEW_SCORE_ADDED') {
          // Capped: every score posted by anyone in the world arrives here, and
          // an uncapped array grew for the whole session on a memory-limited
          // phone -- and the athlete board rescans it on every keystroke.
          setScores((prev) => [msg.score, ...prev].slice(0, MAX_CLIENT_SCORES));
          if (msg.standings) setStandings(msg.standings);
          if (msg.ticker) setLiveTicker((prev) => [msg.ticker, ...prev.slice(0, 19)]);
          if (msg.dailyChallenge) setDailyChallenge(msg.dailyChallenge);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    const connect = () => {
      if (disposed) return;

      const ws = new WebSocket(wsUrl());
      socket = ws;
      socketRef.current = ws;

      // Prove identity once, as soon as the socket opens. The server attributes
      // every later submission to the uid inside this token rather than trusting
      // whatever the payload claims.
      ws.onopen = () => {
        attempt = 0; // a connection that actually opened clears the backoff
        authenticate(ws);
      };

      ws.onmessage = handleMessage;

      // onerror is always followed by onclose, so one path covers both.
      ws.onclose = () => {
        if (disposed || socketRef.current !== ws) return;
        socketRef.current = null;
        // Exponential backoff with jitter, capped, so an outage does not turn
        // every client into a retry loop against a server already struggling.
        const delay = Math.min(30_000, 1_000 * 2 ** attempt) + Math.random() * 500;
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    // Returning to the foreground is both the likeliest moment for the socket
    // to have died and the moment the player is about to post a score.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const live = socketRef.current;
      if (live?.readyState === WebSocket.OPEN) {
        // A surviving socket is not necessarily a credentialed one. A
        // backgrounded webview throttles or suspends long timers, so the
        // pre-expiry refresh may simply never have run -- and resume is the
        // moment before the player posts a score, the worst possible time to
        // find that out.
        authenticate(live);
        return;
      }
      if (retryTimer) clearTimeout(retryTimer);
      attempt = 0;
      connect();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Firestore feeds the individual athlete board and survives server restarts.
    const unsubscribe = listenToGlobalLeaderboard((liveScores) => {
      if (!liveScores?.length) return;
      setScores((prev) => {
        const merged = new Map<string, ScoreRecord>();
        // Fresh documents last, so a newer server copy replaces the local one
        // rather than the stale local copy winning.
        for (const score of [...prev, ...liveScores]) merged.set(score.id, score);
        return Array.from(merged.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_CLIENT_SCORES);
      });
    });

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(loadTimeout);
      if (retryTimer) clearTimeout(retryTimer);
      if (reauthTimer) clearTimeout(reauthTimer);
      socket?.close();
      socketRef.current = null;
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
      // Held until the server answers, so a rejection can replay it rather
      // than the run simply ceasing to exist. Bounded: nothing drains this
      // when submissions are accepted, which is the normal case.
      pendingScoresRef.current.push(submission);
      if (pendingScoresRef.current.length > 5) pendingScoresRef.current.shift();
      socketRef.current.send(JSON.stringify({ type: 'SUBMIT_SCORE', payload: submission }));
      return;
    }

    await postScore(submission);
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
