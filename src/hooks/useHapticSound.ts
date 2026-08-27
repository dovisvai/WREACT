import { useCallback, useRef } from 'react';
import { isGlobalAudioMuted } from '../utils/audio';

/**
 * Web Audio API synthesizer presets for tactile, satisfying haptic-like sounds.
 */

export type HapticSoundPreset = 
  | 'tap'         // Light crisp click (e.g. standard button)
  | 'pop'         // Satisfying rounded bubble pop
  | 'heavy'       // Deep tactile mechanical thump
  | 'tick'        // Subtle UI selection toggle
  | 'success'     // Upbeat bright chime
  | 'error'       // Low warning buzz
  | 'snap';       // Crisp snapping click

interface HapticSoundOptions {
  volume?: number;      // 0.0 - 1.0 (default 0.25)
  enableVibration?: boolean; // Also trigger navigator.vibrate if available
  enabled?: boolean;    // Global sound mute flag (default true)
}

// Shared lazy-loaded Web Audio Context
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

/**
 * Custom React Hook providing short, satisfying, zero-latency Web Audio API sound effects
 * designed to emulate physical haptic feedback when tapping buttons.
 */
export function useHapticSound(options: HapticSoundOptions = {}) {
  const { volume = 0.25, enableVibration = true, enabled = true } = options;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const playHapticSound = useCallback(
    (preset: HapticSoundPreset = 'tap', overrideVolume?: number) => {
      // Check both hook option and global muted state
      if (!enabledRef.current || isGlobalAudioMuted()) return;

      try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const masterGain = ctx.createGain();
        const effectiveVol = overrideVolume ?? volume;
        masterGain.gain.setValueAtTime(effectiveVol, now);
        masterGain.connect(ctx.destination);


        // VIBRATION FEEDBACK
        if (enableVibration && 'vibrate' in navigator) {
          try {
            switch (preset) {
              case 'tap':
              case 'tick':
              case 'snap':
                navigator.vibrate(10);
                break;
              case 'pop':
                navigator.vibrate(15);
                break;
              case 'heavy':
                navigator.vibrate(30);
                break;
              case 'success':
                navigator.vibrate([15, 30, 20]);
                break;
              case 'error':
                navigator.vibrate([40, 30, 40]);
                break;
            }
          } catch {
            // Ignore iframe/permission restrictions
          }
        }

        // WEB AUDIO API SOUND SYNTHESIS
        switch (preset) {
          case 'tap': {
            // Crisp high-to-mid frequency pitch drop (tactile switch click)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.015);

            gain.gain.setValueAtTime(1.0, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.015);
            break;
          }

          case 'snap': {
            // High sharp snap with triangle tone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.012);

            gain.gain.setValueAtTime(1.0, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.012);
            break;
          }

          case 'pop': {
            // Satisfying rounded bubble pop (resonant sine pitch bend)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(850, now + 0.02);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(1.0, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.04);
            break;
          }

          case 'heavy': {
            // Deep sub-bass thump with brief noise punch
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.035);

            gain.gain.setValueAtTime(1.0, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.035);
            break;
          }

          case 'tick': {
            // Subtle ultra-short UI toggle tick
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.008);

            gain.gain.setValueAtTime(0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.008);
            break;
          }

          case 'success': {
            // Two-tone rising harmonic chime
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'triangle';
            osc2.type = 'sine';

            osc1.frequency.setValueAtTime(523.25, now); // C5
            osc1.frequency.setValueAtTime(659.25, now + 0.03); // E5

            osc2.frequency.setValueAtTime(1046.5, now + 0.03); // C6

            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(masterGain);

            osc1.start(now);
            osc2.start(now + 0.03);
            osc1.stop(now + 0.1);
            osc2.stop(now + 0.1);
            break;
          }

          case 'error': {
            // Low warning buzz pitch sweep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

            gain.gain.setValueAtTime(0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.08);
            break;
          }
        }
      } catch (err) {
        console.warn('Haptic audio error:', err);
      }
    },
    [volume, enableVibration]
  );

  /**
   * Helper wrapper to easily attach sound effects to click event handlers
   */
  const withHapticSound = useCallback(
    <T extends (...args: any[]) => any>(
      fn?: T,
      preset: HapticSoundPreset = 'tap'
    ) => {
      return (...args: Parameters<T>) => {
        playHapticSound(preset);
        if (fn) {
          return fn(...args);
        }
      };
    },
    [playHapticSound]
  );

  return {
    playHapticSound,
    withHapticSound,
    playTap: useCallback(() => playHapticSound('tap'), [playHapticSound]),
    playPop: useCallback(() => playHapticSound('pop'), [playHapticSound]),
    playHeavy: useCallback(() => playHapticSound('heavy'), [playHapticSound]),
    playTick: useCallback(() => playHapticSound('tick'), [playHapticSound]),
    playSnap: useCallback(() => playHapticSound('snap'), [playHapticSound]),
    playSuccess: useCallback(() => playHapticSound('success'), [playHapticSound]),
    playError: useCallback(() => playHapticSound('error'), [playHapticSound]),
  };
}
