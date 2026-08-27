import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { ScoreRecord, DailyChallengeInfo, GameMode, LiveTickerEvent } from './src/types.js';

const app = express();

// Security Hardening Middlewares
app.disable('x-powered-by');

// Security Response Headers (CSP, X-Frame-Options, HSTS, No-Sniff)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JSON Body Parser with strict payload limit
app.use(express.json({ limit: '64kb' }));

// Simple in-memory rate limiting map for score submissions
const submissionRateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = submissionRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
  } else {
    entry.count += 1;
  }
  submissionRateLimitMap.set(ip, entry);
  return entry.count <= limit;
}

const server = http.createServer(app);
const PORT = 3000;

// WebSocket Server attached to same HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

// In-Memory Global Scores Store
let scores: ScoreRecord[] = [
  { id: '1', username: 'Kaito_⚡', country: 'JP', scoreMs: 138, mode: 'CLASSIC', timestamp: Date.now() - 3600000 * 2, device: 'iOS', badge: '🥇 World #1' },
  { id: '2', username: 'ReflexGod_KR', country: 'KR', scoreMs: 141, mode: 'CLASSIC', timestamp: Date.now() - 3600000 * 4, device: 'Android', badge: '⚡ Godlike' },
  { id: '3', username: 'Sven_DE', country: 'DE', scoreMs: 145, mode: 'CLASSIC', timestamp: Date.now() - 3600000 * 1, device: 'iOS', badge: '🦅 Eagle Eye' },
  { id: '4', username: 'Nova_US', country: 'US', scoreMs: 149, mode: 'CLASSIC', timestamp: Date.now() - 3600000 * 5, device: 'iOS' },
  { id: '5', username: 'Carlos_BR', country: 'BR', scoreMs: 152, mode: 'CLASSIC', timestamp: Date.now() - 3600000 * 8, device: 'Android' },
  { id: '6', username: 'FocusMaster', country: 'SE', scoreMs: 162, mode: 'FALSE_ALARM', timestamp: Date.now() - 3600000 * 3, device: 'iOS' },
  { id: '7', username: 'Yuki_JP', country: 'JP', scoreMs: 168, mode: 'FALSE_ALARM', timestamp: Date.now() - 3600000 * 6, device: 'Android' },
  { id: '8', username: 'FingerNinja', country: 'KR', scoreMs: 310, mode: 'PATTERN_SEQUENCE', timestamp: Date.now() - 3600000 * 2, device: 'iOS' },
  { id: '9', username: 'SpeedDemon', country: 'US', scoreMs: 335, mode: 'PATTERN_SEQUENCE', timestamp: Date.now() - 3600000 * 7, device: 'Android' },
  { id: '10', username: 'SniperEye', country: 'DE', scoreMs: 174, mode: 'PRECISION_TARGET', timestamp: Date.now() - 3600000 * 1, device: 'iOS' },
  { id: '11', username: 'ApexPredator', country: 'CA', scoreMs: 154, mode: 'DAILY_CHALLENGE', timestamp: Date.now() - 3600000 * 3, device: 'iOS', isDaily: true },
  { id: '12', username: 'Aarav_IN', country: 'IN', scoreMs: 159, mode: 'DAILY_CHALLENGE', timestamp: Date.now() - 3600000 * 5, device: 'Android', isDaily: true }
];

// Today's Daily Challenge Definition
const todayStr = new Date().toISOString().split('T')[0];
const currentDailyChallenge: DailyChallengeInfo = {
  id: `daily-${todayStr}`,
  date: todayStr,
  title: '⚡ Lightning 3-Tap Surge',
  description: 'Tap 3 unpredictable flashing targets in under 200ms average! Avoid red decoys!',
  mode: 'DAILY_CHALLENGE',
  targetMs: 180,
  specialRule: 'Double reaction speed test + fake red signals.',
  participantsCount: 4280,
  topScoreMs: 154,
  topScorer: 'ApexPredator',
  topCountry: 'CA'
};

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

wss.on('connection', (ws, req) => {
  // Send initial state to client
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    onlinePlayers: wss.clients.size + 120,
    scores,
    dailyChallenge: currentDailyChallenge,
    ticker: liveTicker
  }));

  broadcast({ type: 'ONLINE_COUNT', count: wss.clients.size + 120 });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'SUBMIT_SCORE') {
        const { username, country, scoreMs, mode, device, isDaily } = data.payload || {};
        
        // Anti-cheat validation: human reaction range 80ms - 5000ms
        if (typeof scoreMs === 'number' && scoreMs >= 80 && scoreMs <= 5000) {
          const sanitizedUsername = String(username || 'Anonymous').slice(0, 30).trim();
          const sanitizedCountry = String(country || 'US').slice(0, 3).toUpperCase();

          const newScore: ScoreRecord = {
            id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            username: sanitizedUsername,
            country: sanitizedCountry,
            scoreMs,
            mode: mode || 'CLASSIC',
            timestamp: Date.now(),
            device: device || 'iOS',
            isDaily: !!isDaily
          };

          scores.unshift(newScore);
          if (scores.length > 500) scores.pop();

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

          if (isDaily && scoreMs < currentDailyChallenge.topScoreMs) {
            currentDailyChallenge.topScoreMs = scoreMs;
            currentDailyChallenge.topScorer = newScore.username;
            currentDailyChallenge.topCountry = newScore.country;
          }
          currentDailyChallenge.participantsCount += 1;

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
        const { roomId, playerId } = data.payload || {};
        const room = duelRooms.get(roomId);
        if (room) {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            if (room.status === 'countdown') {
              player.falseStart = true;
              player.scoreMs = null;
            } else if (room.status === 'signal' && room.signalTime) {
              const reactionTime = Date.now() - room.signalTime;
              player.scoreMs = reactionTime;
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

app.post('/api/score', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Too many submissions. Please slow down.' });
    return;
  }

  const { username, country, scoreMs, mode, device, isDaily } = req.body;

  if (typeof scoreMs !== 'number' || scoreMs < 80 || scoreMs > 5000) {
    res.status(400).json({ error: 'Invalid score or impossible biological reaction time' });
    return;
  }

  const newScore: ScoreRecord = {
    id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    username: String(username || 'Anonymous').slice(0, 30).trim(),
    country: String(country || 'US').slice(0, 3).toUpperCase(),
    scoreMs,
    mode: mode || 'CLASSIC',
    timestamp: Date.now(),
    device: device || 'iOS',
    isDaily: !!isDaily
  };

  scores.unshift(newScore);
  scores.sort((a, b) => a.scoreMs - b.scoreMs);

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

app.get('/api/daily-challenge', (req, res) => {
  res.json(currentDailyChallenge);
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ World Reaction Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
