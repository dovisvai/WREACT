import React, { useState, useEffect, useRef } from 'react';
import { getCountryFlag } from '../utils/countries';
import { Swords, Zap, AlertTriangle, ShieldCheck, Trophy, RotateCcw, UserPlus } from 'lucide-react';
import { playSignalSound, playClickSound, playErrorSound, playFanfareSound, triggerHaptic } from '../utils/audio';

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

export const LiveDuelLobby: React.FC<LiveDuelLobbyProps> = ({
  username,
  country,
  avatar,
  audioEnabled,
}) => {
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'MATCHED' | 'COUNTDOWN' | 'SIGNAL' | 'FINISHED'>('IDLE');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<DuelPlayerState[]>([]);
  const [countdown, setCountdown] = useState<number>(3);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const signalTimeRef = useRef<number>(0);

  useEffect(() => {
    // Establish WS connection for real-time duel
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'DUEL_STATE') {
          setRoomCode(data.room.roomId);
          setPlayers(data.room.players);
          setStatus('MATCHED');
          const me = data.room.players.find((p: DuelPlayerState) => p.username === username);
          if (me) setMyPlayerId(me.id);
        }

        if (data.type === 'DUEL_COUNTDOWN') {
          setStatus('COUNTDOWN');
          setCountdown(data.seconds);
          if (audioEnabled) playClickSound();
        }

        if (data.type === 'DUEL_SIGNAL') {
          setStatus('SIGNAL');
          signalTimeRef.current = data.signalTime;
          if (audioEnabled) playSignalSound();
          triggerHaptic([50, 30, 50]);
        }

        if (data.type === 'DUEL_PROGRESS') {
          setPlayers((prev) =>
            prev.map((p) => {
              const updated = data.players.find((p2: { id: string }) => p2.id === p.id);
              return updated ? { ...p, scoreMs: updated.scoreMs, falseStart: updated.falseStart } : p;
            })
          );
        }

        if (data.type === 'DUEL_RESULT') {
          setPlayers(data.players);
          setStatus('FINISHED');
          if (audioEnabled) playFanfareSound();
        }
      } catch (err) {
        console.error('WS parse error in Duel', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [username]);

  const startMatchmaking = () => {
    setStatus('SEARCHING');
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'JOIN_DUEL',
          payload: { username, country, avatar },
        })
      );
    }
  };

  const handleDuelTap = () => {
    if (!roomCode || !myPlayerId) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'DUEL_TAP',
          payload: { roomId: roomCode, playerId: myPlayerId },
        })
      );
    }
  };

  const me = players.find((p) => p.id === myPlayerId || p.username === username);
  const rival = players.find((p) => p !== me);

  return (
    <div className="flex flex-col h-full bg-[#020b1c] text-white select-none p-4 items-center justify-center relative overflow-hidden">
      {status === 'IDLE' && (
        <div className="text-center max-w-sm w-full space-y-6">
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-[#00122e] border-2 border-red-500/40 shadow-2xl p-4">
            <Swords className="w-12 h-12 text-yellow-400 animate-pulse" />
          </div>

          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Live 1v1 Reaction Duel</h2>
            <p className="text-xs text-slate-300 font-medium mt-1.5 px-2">
              Match with a live opponent across the world in real-time WebSocket sync! Who has faster reflexes?
            </p>
          </div>

          <div className="bg-[#00122e] border border-red-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{avatar}</span>
              <div className="text-left">
                <span className="font-extrabold text-sm text-slate-100 block">{username}</span>
                <span className="text-xs text-slate-300 font-medium">{getCountryFlag(country)} Ready</span>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-yellow-400 font-black">1v1 Arena</div>
          </div>

          <button
            onClick={startMatchmaking}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 hover:from-red-500 hover:to-yellow-300 text-slate-950 font-black text-lg uppercase tracking-wider shadow-xl shadow-red-600/30 active:scale-95 transition-all border border-yellow-300"
          >
            FIND WORLD RIVAL ⚡
          </button>
        </div>
      )}

      {status === 'SEARCHING' && (
        <div className="text-center max-w-sm w-full space-y-6">
          <div className="w-20 h-20 rounded-full border-4 border-red-500/30 border-t-yellow-400 animate-spin mx-auto" />
          <div>
            <h3 className="text-xl font-black text-white">Searching WREACT Arena...</h3>
            <p className="text-xs text-slate-300 font-medium mt-1">Connecting to online opponent via WebSocket</p>
          </div>
        </div>
      )}

      {(status === 'MATCHED' || status === 'COUNTDOWN') && (
        <div className="text-center max-w-sm w-full space-y-6">
          <div className="flex items-center justify-around bg-[#00122e] border border-red-500/40 rounded-2xl p-5">
            <div className="text-center">
              <span className="text-4xl block mb-1">{avatar}</span>
              <span className="font-extrabold text-xs text-slate-200 block">{username}</span>
              <span className="text-[10px] text-slate-400">{getCountryFlag(country)}</span>
            </div>

            <div className="text-2xl font-black text-yellow-400 animate-pulse font-mono">VS</div>

            <div className="text-center">
              <span className="text-4xl block mb-1">{rival?.avatar || '⚡'}</span>
              <span className="font-extrabold text-xs text-slate-200 block">{rival?.username || 'Rival'}</span>
              <span className="text-[10px] text-slate-400">{rival ? getCountryFlag(rival.country) : 'Searching'}</span>
            </div>
          </div>

          <div className="bg-[#00122e] border border-yellow-400/30 rounded-2xl p-6">
            <span className="text-xs font-mono uppercase text-yellow-400 font-black block mb-2">COUNTDOWN</span>
            <span className="text-6xl font-black font-mono text-white animate-ping block">{countdown}</span>
          </div>
        </div>
      )}

      {status === 'SIGNAL' && (
        <div
          onClick={handleDuelTap}
          className="inset-0 absolute bg-emerald-500 flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none animate-pulse"
        >
          <Zap className="w-20 h-20 text-slate-950 fill-slate-950 mb-2" />
          <h2 className="text-4xl font-black text-slate-950 tracking-tight uppercase">TAP NOW! ⚡</h2>
          <p className="text-xs text-slate-950 font-black mt-2">BEAT YOUR RIVAL!</p>
        </div>
      )}

      {status === 'FINISHED' && (
        <div className="text-center max-w-sm w-full space-y-6 bg-[#00122e] border border-red-500/40 p-6 rounded-3xl shadow-2xl">
          <Trophy className="w-12 h-12 text-yellow-400 mx-auto" />
          <h2 className="text-2xl font-black text-white">DUEL RESULTS</h2>

          <div className="space-y-3">
            {players.map((p) => {
              const isMe = p.id === myPlayerId || p.username === username;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    isMe ? 'bg-red-600/20 border-yellow-400/50' : 'bg-[#020b1c] border-[#12284c]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.avatar}</span>
                    <div className="text-left">
                      <span className="font-extrabold text-xs text-slate-200 block">
                        {p.username} {isMe && '(You)'}
                      </span>
                      <span className="text-[10px] text-slate-400">{getCountryFlag(p.country)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    {p.falseStart ? (
                      <span className="text-xs font-black text-red-500">FALSE START</span>
                    ) : p.scoreMs ? (
                      <span className="text-lg font-black font-mono text-yellow-400">{p.scoreMs}ms</span>
                    ) : (
                      <span className="text-xs text-slate-400">No tap</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setStatus('IDLE')}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all"
          >
            Rematch Duel 🔄
          </button>
        </div>
      )}
    </div>
  );
};
