import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { ScoreRecord, DailyChallengeInfo, GameMode, LiveTickerEvent } from './src/types.js';
import {
  computeStandings,
  snapshotRanks,
  isPlausibleReaction,
  MIN_VALID_MS,
  MAX_VALID_MS,
} from './src/utils/standings.js';
import {
  matchdayAt,
  matchdayClock,
  medalForRank,
  type Matchday,
  type MatchdayResult,
} from './src/utils/matchday.js';
import { fetchMatchdayScores, mergeScorePools } from './src/services/scorePool.js';
import { isRestrictedCountry } from './src/utils/restrictedCountries.js';
import { verifyFirebaseTokenCached, bearerFrom } from './src/services/verifyToken.js';
import { generateDevScores } from './src/utils/devSeed.js';
import { buildDailyChallenge, dayKey } from './src/utils/dailyChallenge.js';

const app = express();

// Security Hardening Middlewares
app.disable('x-powered-by');

/**
 * Security response headers.
 *
 * The previous comment here advertised CSP, X-Frame-Options and HSTS and set
 * none of them. It did set X-XSS-Protection, which is deprecated and can
 * introduce vulnerabilities in the browsers that still honour it — the modern
 * guidance is to disable it explicitly and rely on CSP.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Only meaningful over TLS, and only set in production so local http works.
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // The app loads Google Fonts, talks to Firebase, and renders canvas share
  // cards from its own origin.
  //
  // Scripts are locked down in production only: Vite's dev server injects an
  // inline React-refresh preamble, and a strict script-src blocks it, leaving a
  // blank page. The relaxed dev policy keeps the header exercised in
  // development without breaking HMR.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      IS_PRODUCTION ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com wss: ws:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ')
  );

  next();
});

/**
 * CORS.
 *
 * The packaged app is not served by this process: Capacitor runs the bundle on
 * `capacitor://localhost` (iOS) and `http://localhost` (Android), so every
 * request from a real device is cross-origin and would be blocked without this.
 *
 * No credentials are used — auth is a Firebase token in the payload, never a
 * cookie — so there is nothing here for a hostile origin to ride on. Additional
 * web origins can be allowed with CORS_ORIGINS (comma-separated).
 */
const ALLOWED_ORIGINS = new Set(
  [
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost',
    ...(process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
  ]
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin && (ALLOWED_ORIGINS.has(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

// JSON Body Parser with strict payload limit
app.use(express.json({ limit: '64kb' }));

/**
 * Fixed-window rate limiting, keyed by whatever identity the caller has.
 *
 * Previously keyed on IP only and swept never, so the map grew without bound —
 * and it was only ever consulted on the REST route, which real clients do not
 * use. Both are fixed: sockets are limited too, and expired windows are dropped.
 */
const submissionRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = submissionRateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
  } else {
    entry.count += 1;
  }
  submissionRateLimitMap.set(key, entry);
  return entry.count <= limit;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of submissionRateLimitMap) {
    if (entry.resetTime < now) submissionRateLimitMap.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

const server = http.createServer(app);
// Hosting platforms inject the port they expect the process to bind. A
// hardcoded value binds the wrong one and the deploy fails its health check.
const PORT = Number(process.env.PORT) || 3000;

// WebSocket Server attached to same HTTP server
const wss = new WebSocketServer({
  server,
  path: '/ws',
  // A socket could previously send a frame of any size. 16KB is far more than
  // any legitimate message here and caps what one client can make us buffer.
  maxPayload: 16 * 1024,

  /**
   * Compression, tuned rather than simply switched on.
   *
   * The opening payload is ~24KB of JSON and standings updates are similar;
   * both compress by roughly 80%, which matters most to the players on cellular
   * that this app is built for. `ws` leaves this off by default because it
   * costs memory per connection, so the settings below keep it bounded: small
   * frames skip it entirely, and the zlib windows are capped.
   */
  perMessageDeflate: {
    threshold: 2048,
    zlibDeflateOptions: { level: 6, memLevel: 7 },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    concurrencyLimit: 10,
  },
});

/** Refuse new sockets past this, so one host cannot exhaust file descriptors. */
const MAX_CONNECTIONS = Number(process.env.MAX_WS_CONNECTIONS) || 5000;

/** Per-socket state the server owns; never anything the client asserted. */
interface SocketState {
  /** Verified Firebase uid. Null until the socket authenticates. */
  uid: string | null;
  messages: number;
  windowResetAt: number;
  /** Submissions attempted without a verified identity. */
  unauthAttempts: number;
}

const socketState = new WeakMap<WebSocket, SocketState>();

/** Cheap per-socket flood guard, independent of score rate limiting. */
function allowMessage(ws: WebSocket): boolean {
  const state = socketState.get(ws);
  if (!state) return false;

  const now = Date.now();
  if (now > state.windowResetAt) {
    state.messages = 0;
    state.windowResetAt = now + 10_000;
  }

  state.messages += 1;
  return state.messages <= 60;
}

// Score pool held in memory for instant standings and broadcast.
//
// Memory is the cache, not the record: Firestore is the durable store and the
// server rehydrates from it on boot and on a refresh interval, so a restart or
// a redeploy no longer wipes the world standings.
//
// Development additionally seeds a deterministic dataset so the table is
// demonstrable on a fresh clone; production starts from Firestore alone.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** The week currently being contested. */
let activeMatchday: Matchday = matchdayAt();

let localScores: ScoreRecord[] = IS_PRODUCTION
  ? []
  : generateDevScores(activeMatchday.startsAt, activeMatchday.endsAt);
// A distinct array: `recordScore` pushes to both, so sharing a reference here
// would append every submission twice.
let scores: ScoreRecord[] = [...localScores];

/**
 * Standings are computed here rather than on the client.
 *
 * A client only ever holds a slice of the score pool, so a client-side average
 * would silently disagree with every other client. The server owns the number;
 * clients render it. Restricted to the active matchday, so the table is this
 * week's competition rather than an all-time running total.
 */
let standingsCache = computeStandings(scores, new Map(), activeMatchday);

/**
 * Ranks as of the last movement window. Deltas shown in the UI mean "moved
 * since this snapshot", so the snapshot advances on a timer rather than on
 * every recompute — otherwise every delta would always read zero.
 */
const MOVEMENT_WINDOW_MS = 10 * 60 * 1000;
let previousRanks = snapshotRanks(standingsCache);

/** Final table of the last completed matchday, with medals. */
let lastMatchdayResults: MatchdayResult[] = [];

/**
 * The ranked slice sent to new clients.
 *
 * Sorting the whole pool per connection meant a connection storm turned into
 * repeated O(n log n) work over 40,000 records. Computed once alongside the
 * standings instead.
 */
let rankedSliceCache: ScoreRecord[] = [];

function recomputeStandings(): void {
  standingsCache = computeStandings(scores, previousRanks, activeMatchday);
  rankedSliceCache = [...scores].sort((a, b) => a.scoreMs - b.scoreMs).slice(0, 100);
  initStateStale = true;
}

setInterval(() => {
  previousRanks = snapshotRanks(standingsCache);
}, MOVEMENT_WINDOW_MS).unref?.();

/** Pull the durable pool and fold it together with anything held locally. */
async function refreshFromFirestore(): Promise<void> {
  const remote = await fetchMatchdayScores(activeMatchday);
  if (remote.length === 0 && scores.length > 0) return;

  scores = mergeScorePools(remote, localScores);
  recomputeStandings();
}

/**
 * Blow the whistle: freeze the closing table as the previous matchday's result,
 * award medals, and start the next week from an empty local pool.
 */
function rollOverMatchday(next: Matchday): void {
  lastMatchdayResults = standingsCache
    .filter((standing) => standing.qualified && standing.rank !== null)
    .map((standing) => ({
      matchdayId: activeMatchday.id,
      matchdayNumber: activeMatchday.number,
      countryCode: standing.code,
      rank: standing.rank as number,
      avgMs: standing.avgMs,
      athleteCount: standing.athleteCount,
      medal: medalForRank(standing.rank),
    }));

  activeMatchday = next;
  localScores = IS_PRODUCTION
    ? []
    : generateDevScores(activeMatchday.startsAt, activeMatchday.endsAt);
  scores = localScores;
  previousRanks = new Map();
  recomputeStandings();

  broadcast({
    type: 'MATCHDAY_ROLLOVER',
    matchday: activeMatchday,
    results: lastMatchdayResults.slice(0, 20),
  });

  refreshFromFirestore().catch(() => {});
}

const MATCHDAY_TICK_MS = 60 * 1000;

setInterval(() => {
  const current = matchdayAt();
  if (current.id !== activeMatchday.id) {
    rollOverMatchday(current);
    return;
  }

  // Keep clients' countdown honest without them each running their own clock.
  broadcast({ type: 'MATCHDAY_CLOCK', clock: matchdayClock() });
}, MATCHDAY_TICK_MS).unref?.();

const FIRESTORE_REFRESH_MS = 60 * 1000;
setInterval(() => {
  refreshFromFirestore().catch(() => {});
}, FIRESTORE_REFRESH_MS).unref?.();

/**
 * Add a score to both the live pool and the local buffer.
 *
 * `localScores` holds only what this process has seen directly, so a Firestore
 * refresh can rebuild the pool without dropping submissions that have not yet
 * round-tripped through the database.
 */
/**
 * Standings are marked stale and recomputed on a timer rather than on every
 * submission.
 *
 * Recomputing inline meant three O(n) passes over a 40,000-score pool for each
 * score that arrived, plus a full-table broadcast to every connected client.
 * At any real concurrency that is the whole CPU budget spent re-deriving a
 * table that changes imperceptibly between one score and the next.
 */
let standingsDirty = false;

function recordScore(score: ScoreRecord): void {
  // `push` rather than `unshift`/spread: the previous version copied the entire
  // array on every submission, which is quadratic under load.
  localScores.push(score);
  scores.push(score);

  standingsDirty = true;
  applyScoreToDailyLeaderboard(score);
}

/** Trim the pools back to their ceilings, oldest first. */
function trimScorePools(): void {
  if (localScores.length > 20000) localScores.splice(0, localScores.length - 20000);
  if (scores.length > 40000) scores.splice(0, scores.length - 40000);
}

const STANDINGS_REFRESH_MS = 1000;

setInterval(() => {
  if (!standingsDirty) return;
  standingsDirty = false;

  trimScorePools();
  recomputeStandings();

  // One table broadcast per second at most, however many scores arrived.
  broadcast({ type: 'STANDINGS_UPDATE', standings: standingsCache });
}, STANDINGS_REFRESH_MS).unref?.();

/**
 * Today's event, derived from the date rather than stored.
 *
 * The rotation is a pure function of the UTC day, so every client computes the
 * same challenge, a restart cannot lose it, and there is no state to migrate.
 * The leaderboard fields are filled from real submissions below — the previous
 * hardcoded "4,280 entrants" was an invented number sitting next to real ones.
 */
let currentDailyChallenge: DailyChallengeInfo = buildDailyChallenge();

/**
 * Live figures for today's event, maintained incrementally.
 *
 * A full rescan of the score pool per submission was O(n) for a number that
 * only ever moves by one entrant. The set is rebuilt from scratch only when the
 * event rolls over.
 */
let dailyAthletes = new Set<string>();

function applyScoreToDailyLeaderboard(score: ScoreRecord): void {
  if (!score.isDaily) return;
  if (score.mode !== currentDailyChallenge.mode) return;
  if (dayKey(score.timestamp) !== currentDailyChallenge.date) return;

  dailyAthletes.add(score.userId || score.username);

  const isFastest =
    currentDailyChallenge.topScoreMs === 0 ||
    score.scoreMs < currentDailyChallenge.topScoreMs;

  currentDailyChallenge = {
    ...currentDailyChallenge,
    participantsCount: dailyAthletes.size,
    topScoreMs: isFastest ? score.scoreMs : currentDailyChallenge.topScoreMs,
    topScorer: isFastest ? score.username : currentDailyChallenge.topScorer,
    topCountry: isFastest ? score.country : currentDailyChallenge.topCountry,
  };
}

/** Full rebuild — only on rollover or after a Firestore rehydrate. */
function refreshDailyLeaderboard(): void {
  const today = currentDailyChallenge.date;

  dailyAthletes = new Set();
  let fastest: ScoreRecord | null = null;

  for (const score of scores) {
    if (!score.isDaily) continue;
    if (score.mode !== currentDailyChallenge.mode) continue;
    if (dayKey(score.timestamp) !== today) continue;

    dailyAthletes.add(score.userId || score.username);
    if (!fastest || score.scoreMs < fastest.scoreMs) fastest = score;
  }

  currentDailyChallenge = {
    ...currentDailyChallenge,
    participantsCount: dailyAthletes.size,
    topScoreMs: fastest?.scoreMs ?? 0,
    topScorer: fastest?.username ?? '',
    topCountry: fastest?.country ?? '',
  };
}

/** Roll the event over at UTC midnight and tell every connected client. */
setInterval(() => {
  const fresh = buildDailyChallenge();
  if (fresh.id !== currentDailyChallenge.id) {
    currentDailyChallenge = fresh;
    refreshDailyLeaderboard();
    broadcast({ type: 'DAILY_ROLLOVER', dailyChallenge: currentDailyChallenge });
  }
}, 60 * 1000).unref?.();

// Recent Live Score Ticker
const liveTicker: LiveTickerEvent[] = [
  { id: 't1', username: 'Liam', country: 'GB', scoreMs: 182, mode: 'CLASSIC', timestamp: Date.now() - 15000 },
  { id: 't2', username: 'Kenji', country: 'JP', scoreMs: 164, mode: 'DAILY_CHALLENGE', timestamp: Date.now() - 28000 },
  { id: 't3', username: 'Mateo', country: 'ES', scoreMs: 195, mode: 'FALSE_ALARM', timestamp: Date.now() - 42000 },
  { id: 't4', username: 'Sofia', country: 'IT', scoreMs: 178, mode: 'CLASSIC', timestamp: Date.now() - 55000 }
];

// Duel Rooms Manager
interface DuelPlayer {
  ws: WebSocket;
  id: string;
  username: string;
  country: string;
  avatar: string;
  scoreMs?: number | null;
  falseStart?: boolean;
}

interface DuelRoom {
  id: string;
  players: DuelPlayer[];
  status: 'waiting' | 'countdown' | 'signal' | 'finished';
  signalTimeout?: NodeJS.Timeout;
  signalTime?: number;
}

const duelRooms = new Map<string, DuelRoom>();

// WebSocket Broadcasting
function broadcast(data: object) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * The opening payload, serialized once rather than per connection.
 *
 * A launch spike means hundreds of sockets arriving at the same moment, and
 * `JSON.stringify` over 192 standings rows plus 100 scores for each one is a
 * thundering herd that stalls the event loop — measured at 1.8s of added API
 * latency for 300 simultaneous connections. Rebuilt only when the data changes.
 */
let initStateCache = '';
let initStateStale = true;

function initStatePayload(): string {
  if (initStateStale || !initStateCache) {
    initStateCache = JSON.stringify({
      type: 'INIT_STATE',
      onlinePlayers: wss.clients.size + 120,
      // Only the ranked slice travels to clients; the full pool stays server-side.
      scores: rankedSliceCache,
      standings: standingsCache,
      clock: matchdayClock(),
      lastMatchdayResults: lastMatchdayResults.slice(0, 20),
      dailyChallenge: currentDailyChallenge,
      ticker: liveTicker,
    });
    initStateStale = false;
  }
  return initStateCache;
}

wss.on('connection', (ws, req) => {
  if (wss.clients.size > MAX_CONNECTIONS) {
    ws.close(1013, 'Server at capacity');
    return;
  }

  socketState.set(ws, {
    uid: null,
    messages: 0,
    windowResetAt: Date.now() + 10_000,
    unauthAttempts: 0,
  });

  ws.send(initStatePayload());

  broadcast({ type: 'ONLINE_COUNT', count: wss.clients.size + 120 });

  ws.on('message', async (message) => {
    if (!allowMessage(ws)) {
      ws.close(1008, 'Too many messages');
      return;
    }

    try {
      const data = JSON.parse(message.toString());

      /**
       * A socket proves who it is once, not on every frame.
       *
       * RS256 verification is ~1ms; doing it per message would turn a burst of
       * submissions into a crypto workload. The verified uid is held on the
       * socket and every later submission is attributed to it.
       */
      if (data.type === 'AUTH') {
        const user = await verifyFirebaseTokenCached(data.token);
        const state = socketState.get(ws);
        if (state) state.uid = user?.uid ?? null;
        ws.send(JSON.stringify({ type: 'AUTH_RESULT', ok: Boolean(user) }));
        return;
      }

      if (data.type === 'SUBMIT_SCORE') {
        const state = socketState.get(ws);

        // Identity comes from the verified token, never from the payload.
        // Without this the standings can be forged by anyone who can open a
        // socket, which is the whole product.
        if (!state?.uid) {
          // Answer the first few, then hang up. Replying to every frame of a
          // flood means serializing a response per message, which is exactly
          // the work an attacker wants us doing — a disconnect costs us one
          // operation and costs them the connection.
          state && (state.unauthAttempts += 1);
          if (!state || state.unauthAttempts > 3) {
            ws.close(1008, 'Unauthenticated');
            return;
          }
          ws.send(JSON.stringify({ type: 'SCORE_REJECTED', reason: 'unauthenticated' }));
          return;
        }

        if (!checkRateLimit(`ws:${state.uid}`, 30, 60_000)) {
          ws.send(JSON.stringify({ type: 'SCORE_REJECTED', reason: 'rate_limited' }));
          return;
        }

        const userId = state.uid;
        const { username, country, scoreMs, mode, device, isDaily } = data.payload || {};

        // Anti-cheat: only physiologically plausible reaction times are
        // recorded. Anything outside the window would corrupt a national mean.
        const submittedCountry = String(country || 'US').slice(0, 3).toUpperCase();

        if (isPlausibleReaction(scoreMs) && !isRestrictedCountry(submittedCountry)) {
          const sanitizedUsername = String(username || 'Anonymous').slice(0, 30).trim();
          const sanitizedCountry = submittedCountry;

          const newScore: ScoreRecord = {
            id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            userId: userId ? String(userId).slice(0, 128) : undefined,
            username: sanitizedUsername,
            country: sanitizedCountry,
            scoreMs: Math.round(scoreMs),
            mode: mode || 'CLASSIC',
            timestamp: Date.now(),
            device: device || 'iOS',
            isDaily: !!isDaily
          };

          recordScore(newScore);

          const tickerItem: LiveTickerEvent = {
            id: newScore.id,
            username: newScore.username,
            country: newScore.country,
            scoreMs: newScore.scoreMs,
            mode: newScore.mode,
            timestamp: newScore.timestamp
          };
          liveTicker.unshift(tickerItem);
          if (liveTicker.length > 20) liveTicker.pop();
          initStateStale = true;

          // The daily figures are maintained by recordScore. Adjusting them
          // again here double-counted every entrant, and incremented the count
          // even for scores that were not daily entries at all.

          // Deliberately small: one score is a ticker line, not a reason to
          // reserialise 192 standings rows to every connected client. The table
          // goes out on its own throttled tick.
          broadcast({
            type: 'NEW_SCORE_ADDED',
            score: newScore,
            ticker: tickerItem,
            dailyChallenge: currentDailyChallenge
          });
        }
      }

      // DUEL HANDLERS
      if (data.type === 'JOIN_DUEL') {
        const { username, country, avatar } = data.payload || {};
        let room = Array.from(duelRooms.values()).find((r) => r.status === 'waiting' && r.players.length === 1);

        const player: DuelPlayer = {
          ws,
          id: `p-${Math.random().toString(36).substr(2, 6)}`,
          username: String(username || 'Rival').slice(0, 30),
          country: String(country || 'US').slice(0, 3),
          avatar: String(avatar || '⚡').slice(0, 8)
        };

        if (!room) {
          const roomId = `room-${Math.random().toString(36).substr(2, 6)}`;
          room = {
            id: roomId,
            players: [player],
            status: 'waiting'
          };
          duelRooms.set(roomId, room);
        } else {
          room.players.push(player);
        }

        const roomState = {
          roomId: room.id,
          status: room.status,
          players: room.players.map((p) => ({
            id: p.id,
            username: p.username,
            country: p.country,
            avatar: p.avatar,
            scoreMs: p.scoreMs,
            falseStart: p.falseStart
          }))
        };

        room.players.forEach((p) => {
          if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify({ type: 'DUEL_STATE', room: roomState }));
          }
        });

        if (room.players.length === 2 && room.status === 'waiting') {
          room.status = 'countdown';
          const countdownTime = 3;

          room.players.forEach((p) => {
            if (p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(JSON.stringify({ type: 'DUEL_COUNTDOWN', seconds: countdownTime }));
            }
          });

          const signalDelay = 3000 + Math.random() * 2500;
          room.signalTimeout = setTimeout(() => {
            if (room && room.status === 'countdown') {
              room.status = 'signal';
              room.signalTime = Date.now();
              room.players.forEach((p) => {
                if (p.ws.readyState === WebSocket.OPEN) {
                  p.ws.send(JSON.stringify({ type: 'DUEL_SIGNAL', signalTime: room.signalTime }));
                }
              });
            }
          }, signalDelay);
        }
      }

      if (data.type === 'DUEL_TAP') {
        const { roomId, playerId, reactionMs } = data.payload || {};
        const room = duelRooms.get(roomId);
        if (room) {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            if (room.status === 'countdown') {
              player.falseStart = true;
              player.scoreMs = null;
            } else if (room.status === 'signal' && room.signalTime) {
              // Prefer the client's own measurement: timing here instead would
              // add the network round-trip to every result, making the duel a
              // contest of latency rather than reflex. The server clock is the
              // fallback, and also the upper bound — a client cannot claim to
              // have reacted faster than its tap could possibly have arrived.
              const serverMeasured = Date.now() - room.signalTime;
              player.scoreMs =
                isPlausibleReaction(reactionMs) && reactionMs <= serverMeasured
                  ? Math.round(reactionMs)
                  : serverMeasured;
            }

            const allFinished = room.players.every((p) => p.scoreMs !== undefined || p.falseStart);
            if (allFinished) {
              room.status = 'finished';
              const resultPayload = {
                type: 'DUEL_RESULT',
                players: room.players.map((p) => ({
                  id: p.id,
                  username: p.username,
                  country: p.country,
                  avatar: p.avatar,
                  scoreMs: p.scoreMs ?? null,
                  falseStart: !!p.falseStart
                }))
              };
              room.players.forEach((p) => {
                if (p.ws.readyState === WebSocket.OPEN) {
                  p.ws.send(JSON.stringify(resultPayload));
                }
              });
              duelRooms.delete(room.id);
            } else {
              room.players.forEach((p) => {
                if (p.ws.readyState === WebSocket.OPEN) {
                  p.ws.send(JSON.stringify({
                    type: 'DUEL_PROGRESS',
                    players: room.players.map((p2) => ({
                      id: p2.id,
                      scoreMs: p2.scoreMs ?? null,
                      falseStart: !!p2.falseStart
                    }))
                  }));
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    broadcast({ type: 'ONLINE_COUNT', count: wss.clients.size + 120 });
  });
});

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/leaderboard', (req, res) => {
  const mode = req.query.mode as GameMode | undefined;
  const timeframe = req.query.timeframe as string | undefined;

  let filtered = [...scores];
  if (mode && mode !== ('ALL' as unknown as GameMode)) {
    filtered = filtered.filter((s) => s.mode === mode);
  }

  if (timeframe === 'today') {
    const oneDayAgo = Date.now() - 86400000;
    filtered = filtered.filter((s) => s.timestamp >= oneDayAgo);
  }

  filtered.sort((a, b) => a.scoreMs - b.scoreMs);
  res.json({ scores: filtered.slice(0, 100) });
});

app.post('/api/score', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Too many submissions. Please slow down.' });
    return;
  }

  // Identity must be proven here too — this route is the fallback the client
  // uses when the socket is down, and it is trivially callable by anyone.
  const verified = await verifyFirebaseTokenCached(bearerFrom(req.headers.authorization));
  if (!verified) {
    res.status(401).json({ error: 'A valid Firebase ID token is required' });
    return;
  }

  if (!checkRateLimit(`rest:${verified.uid}`, 30, 60_000)) {
    res.status(429).json({ error: 'Too many submissions. Please slow down.' });
    return;
  }

  const userId = verified.uid;
  const { username, country, scoreMs, mode, device, isDaily } = req.body;

  if (!isPlausibleReaction(scoreMs)) {
    res.status(400).json({
      error: `Reaction times must be between ${MIN_VALID_MS}ms and ${MAX_VALID_MS}ms`
    });
    return;
  }

  // Sanctioned and store-unavailable markets cannot be represented. Rejected
  // here as well as in the client and the database rules, because a client-only
  // check is decoration — anyone can post straight to this endpoint.
  if (isRestrictedCountry(String(country || ''))) {
    res.status(403).json({ error: 'Entries are not accepted from this country' });
    return;
  }

  const newScore: ScoreRecord = {
    id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: userId ? String(userId).slice(0, 128) : undefined,
    username: String(username || 'Anonymous').slice(0, 30).trim(),
    country: String(country || 'US').slice(0, 3).toUpperCase(),
    scoreMs: Math.round(scoreMs),
    mode: mode || 'CLASSIC',
    timestamp: Date.now(),
    device: device || 'iOS',
    isDaily: !!isDaily
  };

  recordScore(newScore);

  broadcast({
    type: 'NEW_SCORE_ADDED',
    score: newScore,
    ticker: {
      id: newScore.id,
      username: newScore.username,
      country: newScore.country,
      scoreMs: newScore.scoreMs,
      mode: newScore.mode,
      timestamp: newScore.timestamp
    }
  });

  res.json({ success: true, score: newScore });
});

/** Live World Standings — the authoritative national table for this matchday. */
app.get('/api/standings', (req, res) => {
  res.json({
    standings: standingsCache,
    clock: matchdayClock(),
    lastMatchdayResults: lastMatchdayResults.slice(0, 20),
    computedAt: Date.now(),
  });
});

/** The season clock on its own, for clients that only need the countdown. */
app.get('/api/matchday', (req, res) => {
  res.json({ clock: matchdayClock(), lastMatchdayResults: lastMatchdayResults.slice(0, 20) });
});

app.get('/api/daily-challenge', (req, res) => {
  res.json(currentDailyChallenge);
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    // Imported dynamically so the production bundle never loads Vite. A static
    // import would pull the whole dev server into the runtime image and require
    // it at boot even though this branch never runs there.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Rehydrate the durable pool before accepting traffic, so the first client
  // to connect sees a real table rather than an empty one.
  await refreshFromFirestore().catch(() => {});

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ World Reaction Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
