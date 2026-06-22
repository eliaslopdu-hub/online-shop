/**
 * audio.ts — Web Audio engine for the tuning fork's tone.
 * ---------------------------------------------------------------------------
 * Synthesises a struck-fork sound: a sine fundamental at FUNDAMENTAL_HZ plus a
 * couple of very quiet overtones, all shaped by a single exponential-decay gain
 * envelope (the unmistakable "ring-down" of a real fork). An AnalyserNode taps
 * the master bus so the visual ring intensity can react to the real amplitude.
 *
 * AUTOPLAY POLICY: browsers forbid starting an AudioContext without a user
 * gesture. We therefore:
 *   • default to MUTED,
 *   • lazily create the context inside init() (call it from a click/tap),
 *   • resume() the context on every strike() in case it was suspended.
 *
 * The whole module is a tiny singleton with a clean imperative surface:
 *   init()        — create the audio graph (call on first user gesture)
 *   strike()      — play one decaying tone (no-op if muted/uninitialised)
 *   setMuted(b)   — mute/unmute (also gates the master gain)
 *   getLevel()    — 0..1 current RMS-ish level for visual reactivity
 */

import {
  FUNDAMENTAL_HZ,
  HARMONICS,
  TONE_ATTACK,
  TONE_DECAY,
  TONE_PEAK_GAIN,
} from './config';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let timeData: Uint8Array | null = null;
let muted = true;

/** Resolve the prefixed constructor without leaking `any` everywhere. */
function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

/**
 * Build the persistent part of the audio graph:
 *   [per-strike oscillators] → masterGain → analyser → destination
 * Safe to call multiple times; only the first call does work.
 */
export function init(): void {
  if (ctx) return;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return;

  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = muted ? 0 : 1;

  analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.6;
  timeData = new Uint8Array(analyser.frequencyBinCount);

  masterGain.connect(analyser);
  analyser.connect(ctx.destination);
}

/**
 * Trigger one struck-fork tone. Oscillators are created fresh per strike and
 * are stopped automatically once the envelope has decayed — Web Audio nodes are
 * cheap and one-shot, so this is the idiomatic pattern.
 */
export function strike(): void {
  if (!ctx || !masterGain) return;
  // The strike itself is a user-driven event, so this resume() is permitted.
  if (ctx.state === 'suspended') void ctx.resume();
  if (muted) return;

  const now = ctx.currentTime;

  // A shared per-strike envelope keeps every partial perfectly in sync.
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(TONE_PEAK_GAIN, now + TONE_ATTACK);
  // Exponential ramp to (near) zero = natural metallic ring-down.
  env.gain.exponentialRampToValueAtTime(0.0001, now + TONE_ATTACK + TONE_DECAY);
  env.connect(masterGain);

  const partials: Array<{ ratio: number; gain: number }> = [
    { ratio: 1, gain: 1 },
    ...HARMONICS,
  ];

  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = FUNDAMENTAL_HZ * p.ratio;

    // Per-partial trim so harmonics stay subordinate to the fundamental.
    const trim = ctx.createGain();
    trim.gain.value = p.gain;

    osc.connect(trim);
    trim.connect(env);

    osc.start(now);
    osc.stop(now + TONE_ATTACK + TONE_DECAY + 0.1);
  }
}

/** Mute/unmute. Also hard-gates the master bus so an in-flight tone cuts. */
export function setMuted(value: boolean): void {
  muted = value;
  if (masterGain && ctx) {
    // Short ramp avoids a click when toggling.
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }
}

export function isMuted(): boolean {
  return muted;
}

/**
 * Current normalised level (0..1) from the analyser. Used to modulate ring
 * glow so the visuals breathe with the actual decaying tone. Returns 0 when
 * muted/uninitialised so the visuals fall back to their own envelope.
 */
export function getLevel(): number {
  if (!analyser || !timeData || muted) return 0;
  analyser.getByteTimeDomainData(timeData);
  // Peak deviation from the 128 midpoint → rough amplitude.
  let peak = 0;
  for (let i = 0; i < timeData.length; i++) {
    const v = Math.abs(timeData[i] - 128) / 128;
    if (v > peak) peak = v;
  }
  return Math.min(1, peak);
}

/** Tear down on unmount (e.g. route change). Optional but tidy. */
export function dispose(): void {
  if (ctx) {
    void ctx.close();
    ctx = null;
    masterGain = null;
    analyser = null;
    timeData = null;
  }
}
