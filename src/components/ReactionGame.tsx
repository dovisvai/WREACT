import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChallengeInvite,
  CountryStanding,
  DeviceOS,
  GameMode,
  PlayerContribution,
} from '../types';
import { playSignalSound, playClickSound, playErrorSound, playFanfareSound } from '../utils/audio';
import { MAX_VALID_MS, MIN_VALID_MS, isPlausibleReaction } from '../utils/standings';

/** How long after a round starts a tap is treated as the tail of a double-tap. */
const DOUBLE_TAP_GRACE_MS = 250;
import { MODE_LABELS } from '../utils/dailyChallenge';
import { MODES } from './game/modes';
import { haptic } from '../services/native';
import { AlertTriangle, Eye, RefreshCw, RotateCcw, Target, Trophy, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button, Label, cx } from './ui/Primitives';
import { IdleScreen, ResultScreen } from './game/ReactionScreens';

interface ReactionGameProps {
  mode: GameMode;
  setMode: (m: GameMode) => void;
  username: string;
  country: string;
  avatar: string;
  deviceOS: DeviceOS;
  audioEnabled: boolean;
  onScoreSubmitted: (scoreMs: number, mode: GameMode, isDaily: boolean) => void;
  /** The real mode today's daily event nominates. */
  dailyMode: GameMode | null;
  dailyTargetMs: number | null;
  openShareModal: (scoreMs: number, mode: GameMode) => void;
  contribution: PlayerContribution | null;
  standings: CountryStanding[];
  challenge: ChallengeInvite | null;
  onChallengeSettled: () => void;
}

type TestState = 'IDLE' | 'WAITING' | 'TRAP_WARNING' | 'SIGNAL' | 'RESULT' | 'FALSE_START' | 'TOO_SLOW';

const STROOP_COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const;
const STROOP_INK: Record<string, string> = {
  RED: 'text-alert',
  BLUE: 'text-sky-400',
  GREEN: 'text-signal',
  YELLOW: 'text-gold',
};
const STROOP_BUTTON: Record<string, string> = {
  RED: 'bg-alert text-white',
  BLUE: 'bg-sky-500 text-pitch-950',
  GREEN: 'bg-signal text-pitch-950',
  YELLOW: 'bg-gold text-pitch-950',
};

export const ReactionGame: React.FC<ReactionGameProps> = ({
  mode,
  setMode,
  username,
  country,
  audioEnabled,
  onScoreSubmitted,
  dailyMode,
  dailyTargetMs,
  contribution,
  openShareModal,
  standings,
  challenge,
  onChallengeSettled,
}) => {
  const [testState, setTestState] = useState<TestState>('IDLE');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  const [patternSequence, setPatternSequence] = useState<number[]>([]);
  const [patternIndex, setPatternIndex] = useState(0);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [stroop, setStroop] = useState({ text: 'RED', ink: 'BLUE' });

  /**
   * Monotonic clock. `Date.now()` is wall-clock: it has millisecond
   * granularity and can step sideways if the system clock adjusts mid-test,
   * which in a reaction-time product is the difference between a real result
   * and a wrong one.
   */
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * The daily event is a wrapper, not a game. It nominates one of the real
   * modes for the day; everything below plays that mode and records under it,
   * flagged as a daily entry.
   */
  const isDailyEntry = mode === 'DAILY_CHALLENGE';
  /**
   * Which discipline this round actually is.
   *
   * The daily used to fall back to CLASSIC while the event was still loading,
   * so a cold launch on a slow network played -- and recorded, as the one
   * ranked mode -- Classic on a day whose real event was something else. Null
   * means "not known yet", and the screen waits rather than guessing.
   */
  const playMode: GameMode | null = isDailyEntry ? dailyMode ?? null : mode;
  const dailyPending = isDailyEntry && !dailyMode;

  const activeMode = MODES.find((m) => m.id === playMode) ?? MODES[0];

  useEffect(() => {
    // Personal bests written before score validation existed can be nonsense
    // (a forgotten tab produces a 45-second "reaction"). Discard on read rather
    // than trusting whatever is in storage.
    if (!playMode) return;
    const saved = Number.parseInt(localStorage.getItem(`pb_${playMode}`) ?? '', 10);
    if (isPlausibleReaction(saved)) {
      setPersonalBest(saved);
    } else {
      if (Number.isFinite(saved)) localStorage.removeItem(`pb_${playMode}`);
      setPersonalBest(null);
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setTestState('IDLE');
    setReactionTime(null);
  }, [playMode]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  /** When the current wait began, for the double-tap guard above. */
  const waitStartedAtRef = useRef(0);

  const triggerSignal = useCallback(() => {
    if (playMode === 'PRECISION_TARGET') {
      setTargetPos({ x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 });
    }

    setTestState('SIGNAL');
    startTimeRef.current = performance.now();
    if (audioEnabled) playSignalSound();
    haptic.signal();
  }, [playMode, audioEnabled]);

  const startTest = useCallback(() => {
    waitStartedAtRef.current = Date.now();

    // Today's event has not arrived yet. Starting here would silently play the
    // wrong discipline and record it as a ranked Classic run.
    if (!playMode) return;

    if (audioEnabled) playClickSound();
    haptic.medium();
    setReactionTime(null);

    if (playMode === 'PATTERN_SEQUENCE') {
      setPatternSequence(Array.from({ length: 4 }, () => Math.floor(Math.random() * 4)));
      setPatternIndex(0);
      setTestState('SIGNAL');
      startTimeRef.current = performance.now();
      return;
    }

    if (playMode === 'REVERSE_COLOR') {
      const text = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
      let ink = text;
      while (ink === text) {
        ink = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
      }
      setStroop({ text, ink });
      setTestState('SIGNAL');
      startTimeRef.current = performance.now();
      return;
    }

    setTestState('WAITING');

    // A trap run may flash a decoy before the real signal.
    if (playMode === 'FALSE_ALARM' && Math.random() > 0.4) {
      timerRef.current = setTimeout(() => {
        setTestState('TRAP_WARNING');
        if (audioEnabled) playErrorSound();
        timerRef.current = setTimeout(triggerSignal, 1400);
      }, 1200 + Math.random() * 1000);
      return;
    }

    timerRef.current = setTimeout(triggerSignal, 2200 + Math.random() * 2500);
  }, [playMode, audioEnabled, triggerSignal]);

  const recordResult = useCallback(
    (elapsed: number) => {
      const ms = Math.round(elapsed);
      setReactionTime(ms);

      // Below the floor is not a reaction either -- it is an anticipated tap or
      // a synthetic event. Treated as a false start rather than a record,
      // because taking the RESULT path let it overwrite the stored personal
      // best with a number the submission guard would then refuse, and the
      // next mount deleted the bogus value along with the real best.
      if (ms < MIN_VALID_MS) {
        setTestState('FALSE_START');
        if (audioEnabled) playErrorSound();
        haptic.error();
        return;
      }

      // A time this long is inattention, not a reaction. Show it, explain it,
      // and keep it out of the player's record and their national average.
      if (ms > MAX_VALID_MS) {
        setTestState('TOO_SLOW');
        if (audioEnabled) playErrorSound();
        haptic.error();
        return;
      }

      setTestState('RESULT');
      if (audioEnabled) playSignalSound();
      haptic.success();

      if (!personalBest || ms < personalBest) {
        setPersonalBest(ms);
        localStorage.setItem(`pb_${playMode}`, String(ms));
        if (audioEnabled) playFanfareSound();
        try {
          confetti({
            particleCount: 50,
            spread: 62,
            origin: { y: 0.6 },
            colors: ['#00e87a', '#ffc53d', '#f3f6f8'],
          });
        } catch {
          /* confetti is decorative */
        }
      }

      onScoreSubmitted(ms, playMode, isDailyEntry);
      if (challenge) onChallengeSettled();
    },
    [
      playMode,
      isDailyEntry,
      personalBest,
      audioEnabled,
      onScoreSubmitted,
      challenge,
      onChallengeSettled,
    ]
  );

  /**
   * Bound to `pointerdown`, never `click`.
   *
   * A click event fires on pointer *release*, so measuring it adds the full
   * press-and-lift duration — commonly 60-120ms — to every recorded time. For a
   * product whose entire premise is millisecond accuracy, that is the single
   * most important detail in this file.
   */
  const handleTap = useCallback(
    (e?: React.PointerEvent) => {
      e?.stopPropagation();

      if (testState === 'WAITING' || testState === 'TRAP_WARNING') {
        // Start is a Button, so it fires on release; the WAITING overlay is
        // full-bleed and already mounted by then. Without this window, the
        // second tap of an ordinary double-tap on Start / Go again lands on the
        // overlay and is scored as going early -- and the retry button has the
        // same problem, so it loops.
        if (Date.now() - waitStartedAtRef.current < DOUBLE_TAP_GRACE_MS) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        setTestState('FALSE_START');
        if (audioEnabled) playErrorSound();
        haptic.error();
        return;
      }

      if (testState === 'SIGNAL') {
        recordResult(performance.now() - startTimeRef.current);
      }
    },
    [testState, audioEnabled, recordResult]
  );

  /**
   * A tap on empty space during PRECISION_TARGET.
   *
   * Deliberately does not end the round: the clock keeps running until the
   * target is actually hit, so a miss costs the time it takes to correct. That
   * is what makes distance matter in this mode, and it is a fairer penalty than
   * voiding the attempt outright.
   */
  const handleMiss = useCallback(
    (e?: React.PointerEvent) => {
      e?.stopPropagation();
      if (testState !== 'SIGNAL') return;
      haptic.light();
    },
    [testState]
  );

  const handlePatternTap = (index: number) => {
    if (testState !== 'SIGNAL') return;

    if (index !== patternSequence[patternIndex]) {
      setTestState('FALSE_START');
      if (audioEnabled) playErrorSound();
      haptic.error();
      return;
    }

    if (audioEnabled) playClickSound();
    haptic.light();

    if (patternIndex + 1 === patternSequence.length) {
      recordResult(performance.now() - startTimeRef.current);
    } else {
      setPatternIndex((prev) => prev + 1);
    }
  };

  const handleStroopTap = (color: string) => {
    if (testState !== 'SIGNAL') return;

    if (color === stroop.ink) {
      recordResult(performance.now() - startTimeRef.current);
    } else {
      setTestState('FALSE_START');
      if (audioEnabled) playErrorSound();
      haptic.error();
    }
  };

  return (
    <div className="no-touch-callout flex h-full flex-col bg-pitch-900">
      {/* Mode rail ------------------------------------------------------- */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto no-scrollbar scroll-hint-x border-b border-pitch-700 px-4 py-2.5">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              haptic.light();
              setMode(id);
            }}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
              mode === id
                ? 'bg-ink text-pitch-950'
                : 'border border-pitch-700 text-ink-faint hover:text-ink-muted'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-5">
        {testState === 'IDLE' && (
          <IdleScreen
            title={isDailyEntry ? "Today's event" : activeMode.title}
            brief={
              dailyPending
                ? 'Loading today’s discipline…'
                : isDailyEntry && playMode
                ? `${MODE_LABELS[playMode]} — ${activeMode.brief}`
                : activeMode.brief
            }
            disabled={dailyPending}
            dailyTargetMs={isDailyEntry ? dailyTargetMs : null}
            personalBest={personalBest}
            challenge={challenge}
            onStart={startTest}
          />
        )}

        {testState === 'WAITING' && (
          <button
            type="button"
            onPointerDown={handleTap}
            className="absolute inset-0 flex flex-col items-center justify-center bg-pitch-850 text-center"
          >
            <Label>Hold</Label>
            <div className="mt-3 font-display text-5xl font-extrabold uppercase tracking-tight text-ink">
              Wait for green
            </div>
            <p className="mt-2 text-xs text-ink-faint">Tapping now is a false start</p>
          </button>
        )}

        {testState === 'TRAP_WARNING' && (
          <button
            type="button"
            onPointerDown={handleTap}
            className="absolute inset-0 flex flex-col items-center justify-center bg-alert-deep text-center"
          >
            <AlertTriangle className="h-12 w-12 text-white" />
            <div className="mt-3 font-display text-5xl font-extrabold uppercase tracking-tight text-white">
              Decoy
            </div>
            <p className="mt-2 text-xs font-semibold text-white/80">Do not tap</p>
          </button>
        )}

        {testState === 'SIGNAL' && playMode === 'PATTERN_SEQUENCE' && (
          <div className="w-full max-w-xs">
            <Label className="mb-3 block text-center">
              Step {patternIndex + 1} of {patternSequence.length}
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  type="button"
                  onPointerDown={() => handlePatternTap(index)}
                  className={cx(
                    'flex h-24 items-center justify-center rounded-md font-display text-3xl font-bold transition-transform active:scale-95',
                    patternSequence[patternIndex] === index
                      ? 'bg-signal text-pitch-950'
                      : 'border border-pitch-700 bg-pitch-850 text-ink-faint'
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {testState === 'SIGNAL' && playMode === 'PRECISION_TARGET' && (
          // Missing the target is a miss, not a score. The wrapper used to call
          // the same handleTap as the target itself, so tapping any blank pixel
          // recorded a time -- the mode was Classic with a decorative circle,
          // and its daily ("movement time counts, so distance matters") was
          // won by tapping wherever your thumb already rested.
          <div className="absolute inset-0 cursor-crosshair" onPointerDown={handleMiss}>
            <button
              type="button"
              onPointerDown={handleTap}
              style={{ top: `${targetPos.y}%`, left: `${targetPos.x}%` }}
              aria-label="Target"
              className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-signal bg-signal/25"
            />
          </div>
        )}

        {testState === 'SIGNAL' && playMode === 'REVERSE_COLOR' && (
          <div className="w-full max-w-xs">
            <div className="rounded-md border border-pitch-700 bg-pitch-850 p-6 text-center">
              <Label>Tap the ink colour</Label>
              <div
                className={cx(
                  'mt-2 font-display text-5xl font-extrabold uppercase tracking-widest',
                  STROOP_INK[stroop.ink]
                )}
              >
                {stroop.text}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {STROOP_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onPointerDown={() => handleStroopTap(color)}
                  className={cx(
                    'rounded-md py-4 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95',
                    STROOP_BUTTON[color]
                  )}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

        {testState === 'SIGNAL' &&
          !['PATTERN_SEQUENCE', 'PRECISION_TARGET', 'REVERSE_COLOR'].includes(playMode) && (
            <button
              type="button"
              onPointerDown={handleTap}
              className="animate-signal-in absolute inset-0 flex flex-col items-center justify-center bg-signal text-center"
            >
              <div className="font-display text-7xl font-extrabold uppercase leading-none tracking-tight text-pitch-950">
                Tap
              </div>
            </button>
          )}

        {testState === 'FALSE_START' && (
          <div className="w-full max-w-sm rounded-md border border-alert/40 bg-pitch-850 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-alert" />
            <h3 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-ink">
              False start
            </h3>
            <p className="mt-1.5 text-xs text-ink-faint">
              {playMode === 'PATTERN_SEQUENCE'
                ? 'Wrong button. The sequence resets.'
                : playMode === 'REVERSE_COLOR'
                ? 'That was the word, not the ink colour.'
                : 'You went before the signal. Nothing recorded.'}
            </p>
            <Button variant="quiet" full className="mt-5" onClick={startTest}>
              <RotateCcw className="h-4 w-4" /> Go again
            </Button>
          </div>
        )}

        {testState === 'TOO_SLOW' && reactionTime && (
          <div className="w-full max-w-sm rounded-md border border-pitch-700 bg-pitch-850 p-6 text-center">
            <Label>Not recorded</Label>
            <div className="mt-2 font-display text-5xl font-bold text-ink-muted">
              {(reactionTime / 1000).toFixed(1)}
              <span className="ml-1 text-xl text-ink-faint">s</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Times over {MAX_VALID_MS / 1000}s are treated as inattention rather than
              reaction, so this one stays out of your record and your national average.
            </p>
            <Button variant="signal" full className="mt-5" onClick={startTest}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          </div>
        )}

        {testState === 'RESULT' && reactionTime && (
          <ResultScreen
            reactionTime={reactionTime}
            mode={playMode}
            country={country}
            username={username}
            personalBest={personalBest}
            contribution={contribution}
            standings={standings}
            challenge={challenge}
            onRetry={startTest}
            onShare={() => openShareModal(reactionTime, mode)}
          />
        )}
      </div>
    </div>
  );
};
