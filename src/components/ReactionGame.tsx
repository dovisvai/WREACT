import React, { useState, useEffect, useRef } from 'react';
import { GameMode, DeviceOS } from '../types';
import { playSignalSound, playClickSound, playErrorSound, playFanfareSound, triggerHaptic } from '../utils/audio';
import { useHapticSound } from '../hooks/useHapticSound';
import { getPercentileRating } from '../utils/countries';
import { Zap, AlertTriangle, RefreshCw, Trophy, Share2, Target, Eye, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReactionGameProps {
  mode: GameMode;
  setMode: (m: GameMode) => void;
  username: string;
  country: string;
  avatar: string;
  deviceOS: DeviceOS;
  audioEnabled: boolean;
  onScoreSubmitted: (scoreMs: number, mode: GameMode) => void;
  openShareModal: (scoreMs: number, mode: GameMode) => void;
}

type TestState = 'IDLE' | 'WAITING' | 'TRAP_WARNING' | 'SIGNAL' | 'RESULT' | 'FALSE_START';

export const ReactionGame: React.FC<ReactionGameProps> = ({
  mode,
  setMode,
  username,
  country,
  avatar,
  deviceOS,
  audioEnabled,
  onScoreSubmitted,
  openShareModal,
}) => {
  const { playPop, playSnap, playHeavy, playError } = useHapticSound({ enabled: audioEnabled });

  const [testState, setTestState] = useState<TestState>('IDLE');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(() => {
    const saved = localStorage.getItem(`pb_${mode}`);
    return saved ? parseInt(saved, 10) : null;
  });

  // Pattern sequence mode states
  const [patternSequence, setPatternSequence] = useState<number[]>([]);
  const [currentPatternIndex, setCurrentPatternIndex] = useState<number>(0);
  const [patternStartTime, setPatternStartTime] = useState<number>(0);

  // Precision target mode states
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Reverse color mode states
  const [reverseColorPrompt, setReverseColorPrompt] = useState<{ text: string; inkColor: string; correctColor: string }>({
    text: 'RED',
    inkColor: 'text-blue-500',
    correctColor: 'BLUE',
  });

  // Timing refs
  const startTimeRef = useRef<number>(0);
  const timerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`pb_${mode}`);
    setPersonalBest(saved ? parseInt(saved, 10) : null);
    resetTest();
  }, [mode]);

  const resetTest = () => {
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
    setTestState('IDLE');
    setReactionTime(null);
  };

  const startTest = () => {
    if (audioEnabled) {
      playClickSound();
      playHeavy();
    }
    triggerHaptic(30);

    if (mode === 'PATTERN_SEQUENCE') {
      // Generate 4-step sequence
      const seq = [
        Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 4),
        Math.floor(Math.random() * 4),
      ];
      setPatternSequence(seq);
      setCurrentPatternIndex(0);
      setTestState('SIGNAL');
      setPatternStartTime(Date.now());
      return;
    }

    if (mode === 'REVERSE_COLOR') {
      const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
      const text = colors[Math.floor(Math.random() * colors.length)];
      let ink = colors[Math.floor(Math.random() * colors.length)];
      while (ink === text) {
        ink = colors[Math.floor(Math.random() * colors.length)];
      }

      const colorClassMap: Record<string, string> = {
        RED: 'text-rose-500',
        BLUE: 'text-cyan-400',
        GREEN: 'text-emerald-400',
        YELLOW: 'text-amber-400',
      };

      setReverseColorPrompt({
        text,
        inkColor: colorClassMap[ink],
        correctColor: ink, // Instruction: "Tap the INK COLOR, ignore the word text!"
      });

      setTestState('SIGNAL');
      startTimeRef.current = Date.now();
      return;
    }

    setTestState('WAITING');

    // Random delay between 2000ms and 4500ms
    const randomDelay = 2200 + Math.random() * 2500;

    // False alarm logic
    if (mode === 'FALSE_ALARM') {
      // Chance of triggering a false alarm warning before real signal
      if (Math.random() > 0.4) {
        const falseAlarmDelay = 1200 + Math.random() * 1000;
        timerTimeoutRef.current = setTimeout(() => {
          setTestState('TRAP_WARNING');
          if (audioEnabled) playErrorSound();

          // After false alarm passes, resume to signal
          timerTimeoutRef.current = setTimeout(() => {
            triggerRealSignal();
          }, 1400);
        }, falseAlarmDelay);
        return;
      }
    }

    timerTimeoutRef.current = setTimeout(() => {
      triggerRealSignal();
    }, randomDelay);
  };

  const triggerRealSignal = () => {
    if (mode === 'PRECISION_TARGET') {
      // Random coordinates between 20% and 80%
      const rx = 20 + Math.random() * 60;
      const ry = 20 + Math.random() * 60;
      setTargetPos({ x: rx, y: ry });
    }

    setTestState('SIGNAL');
    startTimeRef.current = Date.now();
    if (audioEnabled) playSignalSound();
    triggerHaptic([40, 30, 40]);
  };

  const handleTap = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();

    if (testState === 'WAITING' || testState === 'TRAP_WARNING') {
      // Early tap / jump start!
      if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
      setTestState('FALSE_START');
      if (audioEnabled) {
        playErrorSound();
        playError();
      }
      triggerHaptic([100, 50, 100]);
      return;
    }

    if (testState === 'SIGNAL') {
      const elapsed = Date.now() - startTimeRef.current;
      setReactionTime(elapsed);
      setTestState('RESULT');

      if (audioEnabled) {
        playSignalSound();
        playPop();
      }
      triggerHaptic(50);

      // Check personal best
      if (!personalBest || elapsed < personalBest) {
        setPersonalBest(elapsed);
        localStorage.setItem(`pb_${mode}`, elapsed.toString());
        if (audioEnabled) playFanfareSound();
        try {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }

      // Auto submit to server
      onScoreSubmitted(elapsed, mode);
    }
  };

  const handlePatternTap = (buttonIdx: number) => {
    if (testState !== 'SIGNAL') return;

    if (buttonIdx === patternSequence[currentPatternIndex]) {
      if (audioEnabled) playClickSound();
      triggerHaptic(20);

      if (currentPatternIndex + 1 === patternSequence.length) {
        // Pattern complete!
        const totalMs = Date.now() - patternStartTime;
        setReactionTime(totalMs);
        setTestState('RESULT');
        if (audioEnabled) playFanfareSound();
        onScoreSubmitted(totalMs, mode);
      } else {
        setCurrentPatternIndex((prev) => prev + 1);
      }
    } else {
      // Pattern error!
      setTestState('FALSE_START');
      if (audioEnabled) playErrorSound();
      triggerHaptic([100, 50, 100]);
    }
  };

  const handleReverseColorTap = (colorName: string) => {
    if (testState !== 'SIGNAL') return;

    if (colorName === reverseColorPrompt.correctColor) {
      const totalMs = Date.now() - startTimeRef.current;
      setReactionTime(totalMs);
      setTestState('RESULT');
      if (audioEnabled) playFanfareSound();
      onScoreSubmitted(totalMs, mode);
    } else {
      setTestState('FALSE_START');
      if (audioEnabled) playErrorSound();
    }
  };

  const rating = reactionTime ? getPercentileRating(reactionTime) : null;

  return (
    <div className="flex flex-col h-full bg-[#020b1c] text-white select-none">
      {/* Game Mode Selector Bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#00122e] border-b border-[#12284c] overflow-x-auto no-scrollbar text-xs">
        <button
          onClick={() => { playSnap(); setMode('CLASSIC'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 active:scale-95 ${
            mode === 'CLASSIC'
              ? 'bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20 border border-yellow-300'
              : 'bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-current" /> Classic
        </button>

        <button
          onClick={() => { playSnap(); setMode('FALSE_ALARM'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 active:scale-95 ${
            mode === 'FALSE_ALARM'
              ? 'bg-red-600 text-white font-black shadow-md shadow-red-600/20 border border-yellow-400/40'
              : 'bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Trap Signal
        </button>

        <button
          onClick={() => { playSnap(); setMode('PATTERN_SEQUENCE'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 active:scale-95 ${
            mode === 'PATTERN_SEQUENCE'
              ? 'bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20 border border-yellow-300'
              : 'bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Speed Pattern
        </button>

        <button
          onClick={() => { playSnap(); setMode('PRECISION_TARGET'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 active:scale-95 ${
            mode === 'PRECISION_TARGET'
              ? 'bg-red-600 text-white font-black shadow-md shadow-red-600/20 border border-yellow-400/40'
              : 'bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" /> Target Aim
        </button>

        <button
          onClick={() => { playSnap(); setMode('REVERSE_COLOR'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 active:scale-95 ${
            mode === 'REVERSE_COLOR'
              ? 'bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20 border border-yellow-300'
              : 'bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Stroop Reverse
        </button>

        <button
          onClick={() => { playSnap(); setMode('DAILY_CHALLENGE'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 active:scale-95 ${
            mode === 'DAILY_CHALLENGE'
              ? 'bg-red-600 text-white font-black shadow-md shadow-red-600/20 border border-yellow-400/40'
              : 'bg-[#020b1c] border border-[#12284c] text-slate-300 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" /> Daily Event
        </button>
      </div>

      {/* Main Interactive Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-4 overflow-hidden">
        {/* State 1: IDLE */}
        {testState === 'IDLE' && (
          <div className="text-center max-w-sm w-full space-y-6">
            <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-[#00122e] border-2 border-red-500/40 shadow-2xl p-4">
              <div className="absolute inset-0 bg-gradient-to-tr from-red-600/20 via-yellow-400/20 to-red-600/10 rounded-3xl blur-xl" />
              <Zap className="w-14 h-14 text-yellow-400 fill-yellow-400 animate-pulse" />
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>
                  {mode === 'CLASSIC' && 'Classic Reaction Test'}
                  {mode === 'FALSE_ALARM' && 'Trap Signal Test'}
                  {mode === 'PATTERN_SEQUENCE' && '4-Button Speed Sequence'}
                  {mode === 'PRECISION_TARGET' && 'Precision Target Aim'}
                  {mode === 'REVERSE_COLOR' && 'Reverse Stroop Challenge'}
                  {mode === 'DAILY_CHALLENGE' && 'Daily Lightning Event'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1.5 px-4 font-medium">
                {mode === 'CLASSIC' && 'Wait for the screen to turn bright green, then tap as fast as humanly possible!'}
                {mode === 'FALSE_ALARM' && 'Tap ONLY when screen flashes GREEN! Avoid red and yellow decoy traps.'}
                {mode === 'PATTERN_SEQUENCE' && 'Tap the highlighted sequence buttons as quickly as possible!'}
                {mode === 'PRECISION_TARGET' && 'A glowing target will spawn randomly. Tap the exact target center!'}
                {mode === 'REVERSE_COLOR' && 'Ignore the written word! Tap the button matching the INK COLOR!'}
                {mode === 'DAILY_CHALLENGE' && "Compete for today's daily world streak! Beat 180ms to rank top."}
              </p>
            </div>

            {personalBest && (
              <div className="inline-flex items-center gap-2 bg-[#00122e] border border-yellow-400/40 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-yellow-400 shadow-md">
                <Trophy className="w-3.5 h-3.5 text-red-500" /> Your Personal Best: <span className="font-mono text-white font-black">{personalBest}ms</span>
              </div>
            )}

            <button
              onClick={startTest}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-yellow-400 hover:from-red-500 hover:to-yellow-300 text-slate-950 font-black text-lg uppercase tracking-wider shadow-xl shadow-red-600/30 active:scale-95 transition-all transform border border-yellow-300"
            >
              LAUNCH RELEX TEST ⚡
            </button>
          </div>
        )}

        {/* State 2: WAITING */}
        {testState === 'WAITING' && (
          <div
            onClick={handleTap}
            className="inset-0 absolute bg-[#00122e] flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none"
          >
            <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-yellow-400 animate-spin mb-4" />
            <h2 className="text-2xl font-black text-yellow-400 tracking-tight">WAIT FOR GREEN...</h2>
            <p className="text-xs text-slate-400 mt-1">Do not tap yet! Tapping early counts as a false start.</p>
          </div>
        )}

        {/* State 3: TRAP_WARNING (False Alarm) */}
        {testState === 'TRAP_WARNING' && (
          <div
            onClick={handleTap}
            className="inset-0 absolute bg-red-950 flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none animate-pulse"
          >
            <AlertTriangle className="w-16 h-16 text-red-500 mb-2" />
            <h2 className="text-3xl font-black text-red-400 tracking-tight">DECOY TRAP! 🚨</h2>
            <p className="text-sm font-semibold text-red-200 mt-1">DON'T TAP RED!</p>
          </div>
        )}

        {/* State 4: SIGNAL (TAP NOW!) */}
        {testState === 'SIGNAL' && (
          <>
            {mode === 'PATTERN_SEQUENCE' ? (
              <div className="w-full max-w-xs text-center space-y-4">
                <div className="text-xs text-slate-300 uppercase font-mono tracking-wider font-extrabold">
                  TAP SEQUENCE: STEP {currentPatternIndex + 1} / 4
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((btnIdx) => {
                    const isTarget = patternSequence[currentPatternIndex] === btnIdx;
                    return (
                      <button
                        key={btnIdx}
                        onClick={() => handlePatternTap(btnIdx)}
                        className={`h-24 rounded-2xl font-black text-2xl transition-all transform active:scale-90 flex items-center justify-center shadow-lg ${
                          isTarget
                            ? 'bg-yellow-400 text-slate-950 ring-4 ring-yellow-300 scale-105 animate-pulse'
                            : 'bg-[#00122e] text-slate-400 border border-[#12284c]'
                        }`}
                      >
                        {btnIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : mode === 'PRECISION_TARGET' ? (
              <div onClick={handleTap} className="inset-0 absolute bg-[#020b1c] overflow-hidden cursor-crosshair">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTap();
                  }}
                  style={{ top: `${targetPos.y}%`, left: `${targetPos.x}%` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-red-600 border-4 border-yellow-400 shadow-2xl shadow-red-600/80 animate-ping"
                />
              </div>
            ) : mode === 'REVERSE_COLOR' ? (
              <div className="w-full max-w-xs text-center space-y-6">
                <div className="bg-[#00122e] border border-red-500/40 rounded-2xl p-6 shadow-xl">
                  <span className="text-xs text-slate-300 font-mono block mb-1">TAP THE INK COLOR:</span>
                  <span className={`text-4xl font-black uppercase tracking-widest ${reverseColorPrompt.inkColor}`}>
                    {reverseColorPrompt.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['RED', 'BLUE', 'GREEN', 'YELLOW'].map((color) => {
                    const bgClassMap: Record<string, string> = {
                      RED: 'bg-red-600 hover:bg-red-500 text-white font-extrabold',
                      BLUE: 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold',
                      GREEN: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold',
                      YELLOW: 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold',
                    };
                    return (
                      <button
                        key={color}
                        onClick={() => handleReverseColorTap(color)}
                        className={`py-4 rounded-xl font-black text-sm uppercase transition-all active:scale-95 shadow-md ${bgClassMap[color]}`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                onClick={handleTap}
                className="inset-0 absolute bg-emerald-500 flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none animate-pulse"
              >
                <Zap className="w-20 h-20 text-slate-950 fill-slate-950 mb-2" />
                <h2 className="text-4xl font-black text-slate-950 tracking-tight uppercase">TAP NOW! ⚡</h2>
              </div>
            )}
          </>
        )}

        {/* State 5: FALSE_START */}
        {testState === 'FALSE_START' && (
          <div className="text-center max-w-sm w-full space-y-5 bg-red-950/60 border border-red-500/80 p-6 rounded-3xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600/30 text-red-400 border border-red-500/50">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-red-300">Too Early! Jump Start</h3>
              <p className="text-xs text-slate-300 mt-1">You tapped before the green signal flashed. Stay focused!</p>
            </div>
            <button
              onClick={startTest}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm transition-all"
            >
              Try Again 🔄
            </button>
          </div>
        )}

        {/* State 6: RESULT */}
        {testState === 'RESULT' && reactionTime && (
          <div className="text-center max-w-sm w-full space-y-4 bg-[#00122e] border border-red-500/40 p-6 rounded-3xl shadow-2xl">
            <div className="text-xs font-mono uppercase text-yellow-400 tracking-wider font-extrabold">ATHLETE REACTION TIME</div>
            <div className="text-6xl font-black font-mono tracking-tight text-yellow-400">
              {reactionTime}<span className="text-2xl text-red-500 font-black">ms</span>
            </div>

            {rating && (
              <div className="bg-[#020b1c] border border-[#12284c] rounded-2xl p-3">
                <div className={`text-sm font-bold flex items-center justify-center gap-1.5 ${rating.color}`}>
                  <span>{rating.icon}</span>
                  <span>{rating.rating}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Faster than <span className="text-yellow-400 font-extrabold">{rating.percentile}%</span> of global humans!
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={startTest}
                className="py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
              >
                <RotateCcw className="w-4 h-4" /> Retest
              </button>

              <button
                onClick={() => openShareModal(reactionTime, mode)}
                className="py-3 rounded-xl bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-md"
              >
                <Share2 className="w-4 h-4 text-slate-950" /> Share Score
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
