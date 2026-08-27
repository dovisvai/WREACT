/**
 * Web Audio API Synthesizer for high-precision, low-latency audio feedback.
 */

let audioCtx: AudioContext | null = null;
let globalAudioMuted = false;

export function setGlobalAudioMuted(muted: boolean) {
  globalAudioMuted = muted;
}

export function isGlobalAudioMuted(): boolean {
  return globalAudioMuted;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playBeep(frequency = 880, duration = 0.08, type: OscillatorType = 'sine', volume = 0.2) {
  if (globalAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

export function playSignalSound() {
  if (globalAudioMuted) return;
  // Crisp double high-ping for reaction signal
  playBeep(1046.5, 0.1, 'sine', 0.3); // High C6
}

export function playClickSound() {
  if (globalAudioMuted) return;
  playBeep(600, 0.03, 'triangle', 0.15);
}

export function playErrorSound() {
  if (globalAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.warn('Error sound failed', err);
  }
}

export function playFanfareSound() {
  if (globalAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((note, i) => {
      setTimeout(() => {
        if (!globalAudioMuted) {
          playBeep(note, 0.15, 'triangle', 0.25);
        }
      }, i * 90);
    });
  } catch (err) {
    console.warn('Fanfare sound failed', err);
  }
}

export function triggerHaptic(pattern: number | number[] = 50) {
  if (globalAudioMuted) return;
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore if not supported in iframe/browser
    }
  }
}

