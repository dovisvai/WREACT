import React, { useEffect, useRef, useState } from 'react';
import { Swords } from 'lucide-react';
import { getCountryFlag } from '../utils/countries';
import { isPlausibleReaction } from '../utils/standings';
import { playSignalSound, playClickSound, playFanfareSound } from '../utils/audio';
import { haptic } from '../services/native';
import { wsUrl } from '../services/api';
import { getIdToken } from '../services/firebase';
import { Button, Flag, Label, Panel, cx } from './ui/Primitives';

interface LiveDuelLobbyProps {
  username: string;
  country: string;
  avatar: string;
  audioEnabled: boolean;
}

interface DuelPlayerState {
  id: string;
  username: string;
  country: string;
  avatar: string;
  scoreMs?: number | null;
  falseStart?: boolean;
}

type DuelStatus = 'IDLE' | 'SEARCHING' | 'MATCHED' | 'COUNTDOWN' | 'SIGNAL' | 'FINISHED';

export const LiveDuelLobby: React.FC<LiveDuelLobbyProps> = ({
  username,
  country,
  avatar,
  audioEnabled,
}) => {
  const [status, setStatus] = useState<DuelStatus>('IDLE');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<DuelPlayerState[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  /** Why matchmaking stopped, when it did. Empty in the normal case. */
  const [notice, setNotice] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  /**
   * When the signal arrived on *this* device, on the monotonic clock.
   *
   * The reaction is measured locally and the measurement is sent to the server.
   * Timing it server-side instead would fold the network round-trip into every
   * result, which turns the duel into a contest of who has the better ping.
   */
  const signalAtRef = useRef<number>(0);
  const tappedRef = useRef(false);

  // Read inside the socket handlers without making the socket depend on it.
  // With audioEnabled in the dependency array, toggling mute tore the duel
  // socket down mid-countdown: the server lost the room, no signal arrived,
  // and the screen sat on "Get ready" forever.
  const audioRef = useRef(audioEnabled);
  audioRef.current = audioEnabled;

  useEffect(() => {
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (disposed) return;
      const ws = new WebSocket(wsUrl());
      socketRef.current = ws;

      // Duels require a verified identity, exactly like score submission. This
      // socket is separate from the live-data one and has to prove itself too.
      ws.onopen = () => {
        attempt = 0;
        getIdToken().then((token) => {
          if (token && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'AUTH', token }));
          }
        });
      };

      ws.onclose = () => {
        if (disposed || socketRef.current !== ws) return;
        socketRef.current = null;
        const delay = Math.min(15_000, 1_000 * 2 ** attempt);
        attempt += 1;
        retry = setTimeout(connect, delay);
      };

      ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'DUEL_STATE') {
          setRoomCode(data.room.roomId);
          setPlayers(data.room.players);
          setStatus('MATCHED');
          setNotice(null);
          // The server names our slot; matching on username collided whenever
          // two players shared a name.
          if (data.youAre) setMyPlayerId(data.youAre);
        }

        if (data.type === 'DUEL_REJECTED') {
          setStatus('IDLE');
          setNotice(
            data.reason === 'rate_limited'
              ? 'Too many duels just now. Give it a minute.'
              : 'Could not join a duel. Check your connection and try again.'
          );
        }

        if (data.type === 'DUEL_ABANDONED') {
          setStatus('IDLE');
          setRoomCode(null);
          setPlayers([]);
          setMyPlayerId(null);
          setNotice(
            data.reason === 'opponent_left'
              ? 'Your opponent left. Find another.'
              : 'That duel timed out. Try again.'
          );
        }

        if (data.type === 'DUEL_COUNTDOWN') {
          setStatus('COUNTDOWN');
          setCountdown(data.seconds);
          tappedRef.current = false;
          if (audioRef.current) playClickSound();
        }

        if (data.type === 'DUEL_SIGNAL') {
          signalAtRef.current = performance.now();
          setStatus('SIGNAL');
          if (audioRef.current) playSignalSound();
          haptic.signal();
        }

        if (data.type === 'DUEL_PROGRESS') {
          setPlayers((prev) =>
            prev.map((p) => {
              const updated = data.players.find((o: { id: string }) => o.id === p.id);
              return updated
                ? { ...p, scoreMs: updated.scoreMs, falseStart: updated.falseStart }
                : p;
            })
          );
        }

        if (data.type === 'DUEL_RESULT') {
          setPlayers(data.players);
          setStatus('FINISHED');
          if (audioRef.current) playFanfareSound();
          haptic.success();
        }
      } catch (err) {
        console.error('WS parse error in duel', err);
      }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [username]);

  const startMatchmaking = () => {
    const ws = socketRef.current;
    // send() on a socket still CONNECTING throws, and on a closed one silently
    // discards -- either way the old code had already set SEARCHING, so the
    // spinner ran forever. Both are routine on a phone.
    if (ws?.readyState !== WebSocket.OPEN) {
      setStatus('IDLE');
      setNotice('Still connecting — try again in a moment.');
      return;
    }
    setNotice(null);
    setStatus('SEARCHING');
    haptic.medium();
    ws.send(JSON.stringify({ type: 'JOIN_DUEL', payload: { username, country, avatar } }));
  };

  const handleDuelTap = () => {
    if (!roomCode || !myPlayerId || tappedRef.current) return;
    tappedRef.current = true;

    const measured = Math.round(performance.now() - signalAtRef.current);

    const ws = socketRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        type: 'DUEL_TAP',
        payload: {
          roomId: roomCode,
          // playerId is deliberately not sent: the server identifies the
          // tapping player by the socket, because trusting this field let
          // either player forge the other's result.
          reactionMs: isPlausibleReaction(measured) ? measured : null,
        },
      })
    );
  };

  const me = players.find((p) => p.id === myPlayerId || p.username === username);
  const rival = players.find((p) => p !== me);

  const winner =
    status === 'FINISHED'
      ? players
          .filter((p) => !p.falseStart && typeof p.scoreMs === 'number')
          .sort((a, b) => (a.scoreMs ?? 0) - (b.scoreMs ?? 0))[0]
      : undefined;

  return (
    <div className="no-touch-callout relative flex h-full flex-col items-center justify-center overflow-hidden bg-pitch-900 p-5">
      {status === 'IDLE' && (
        <div className="w-full max-w-sm text-center">
          <Swords className="mx-auto h-10 w-10 text-ink-muted" />
          <h2 className="mt-4 font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-ink">
            Head to head
          </h2>
          <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-ink-muted">
            Matched against a live opponent anywhere in the world. Same signal, same
            moment — fastest thumb wins.
          </p>

          <Panel className="mt-6 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{avatar}</span>
              <div className="text-left">
                <div className="text-sm font-semibold text-ink">{username}</div>
                <div className="text-[11px] text-ink-faint">
                  <Flag code={country} emoji={getCountryFlag(country)} /> Ready
                </div>
              </div>
            </div>
            <Label>1v1</Label>
          </Panel>

          {notice && (
            <p
              role="status"
              className="mt-5 rounded-md border border-pitch-700 bg-pitch-850 px-3 py-2.5 text-center text-[12px] text-ink-muted"
            >
              {notice}
            </p>
          )}

          <Button variant="signal" size="lg" full className="mt-6" onClick={startMatchmaking}>
            Find an opponent
          </Button>
        </div>
      )}

      {status === 'SEARCHING' && (
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-pitch-700 border-t-signal" />
          <h3 className="mt-5 font-display text-2xl font-bold uppercase tracking-tight text-ink">
            Finding an opponent
          </h3>
          <p className="mt-1.5 text-xs text-ink-faint">Waiting for another athlete</p>
          <Button variant="ghost" size="sm" className="mt-5" onClick={() => setStatus('IDLE')}>
            Cancel
          </Button>
        </div>
      )}

      {(status === 'MATCHED' || status === 'COUNTDOWN') && (
        <div className="w-full max-w-sm">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <Competitor avatar={avatar} name={username} country={country} isYou />
              <span className="font-display text-xl font-bold text-ink-faint">V</span>
              <Competitor
                avatar={rival?.avatar || '⚡'}
                name={rival?.username || 'Waiting'}
                country={rival?.country || ''}
              />
            </div>
          </Panel>

          <div className="mt-4 text-center">
            <Label>Get ready</Label>
            <div className="animate-count-pop mt-2 font-display text-7xl font-extrabold leading-none text-ink">
              {countdown}
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Tap the moment the screen turns green
            </p>
          </div>
        </div>
      )}

      {status === 'SIGNAL' && (
        <button
          type="button"
          onPointerDown={handleDuelTap}
          className="animate-signal-in absolute inset-0 flex flex-col items-center justify-center bg-signal"
        >
          <div className="font-display text-7xl font-extrabold uppercase leading-none tracking-tight text-pitch-950">
            Tap
          </div>
        </button>
      )}

      {status === 'FINISHED' && (
        <div className="w-full max-w-sm">
          <div className="text-center">
            <Label>Result</Label>
            <h2 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-ink">
              {winner
                ? winner.id === myPlayerId || winner.username === username
                  ? 'You win'
                  : 'You lose'
                : 'No result'}
            </h2>
          </div>

          <div className="mt-5 space-y-2">
            {players.map((player) => {
              const isMe = player.id === myPlayerId || player.username === username;
              const isWinner = winner?.id === player.id;

              return (
                <div
                  key={player.id}
                  className={cx(
                    'flex items-center justify-between rounded-md border px-4 py-3',
                    isWinner
                      ? 'border-signal/40 bg-signal/10'
                      : 'border-pitch-700 bg-pitch-850'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl leading-none">{player.avatar}</span>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {player.username}
                        {isMe && <span className="ml-1.5 text-ink-faint">you</span>}
                      </div>
                      <div className="text-[11px] text-ink-faint">
                        <Flag code={player.country} emoji={getCountryFlag(player.country)} />
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {player.falseStart ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-alert">
                        False start
                      </span>
                    ) : typeof player.scoreMs === 'number' ? (
                      <span
                        className={cx(
                          'font-display text-xl font-bold',
                          isWinner ? 'text-signal' : 'text-ink'
                        )}
                      >
                        {player.scoreMs}
                        <span className="text-[11px] text-ink-faint">ms</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">No tap</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="signal"
            full
            className="mt-5"
            onClick={() => {
              setPlayers([]);
              setRoomCode(null);
              setMyPlayerId(null);
              setStatus('IDLE');
            }}
          >
            Rematch
          </Button>
        </div>
      )}
    </div>
  );
};

const Competitor: React.FC<{
  avatar: string;
  name: string;
  country: string;
  isYou?: boolean;
}> = ({ avatar, name, country, isYou }) => (
  <div className="flex-1 text-center">
    <div className="text-3xl leading-none">{avatar}</div>
    <div className="mt-2 truncate text-xs font-semibold text-ink">{name}</div>
    <div className="text-[10px] text-ink-faint">
      {country ? <Flag code={country} emoji={getCountryFlag(country)} /> : '—'}
      {isYou && ' you'}
    </div>
  </div>
);
