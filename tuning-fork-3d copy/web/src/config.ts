/**
 * config.ts — THE SINGLE SOURCE OF TRUTH FOR EVERY TUNABLE.
 * ---------------------------------------------------------------------------
 * A non-developer brand owner should be able to change the *feel* of the whole
 * hero from this one file: palette, ring colour, light intensities, camera,
 * scroll behaviour, post-processing strength, and the acoustic fundamental.
 *
 * Nothing here imports three.js or React — it is plain data so it can be read
 * from anywhere (shaders, audio engine, scroll controller) without cycles.
 *
 * Colours are given as hex strings for CSS/markup AND as [r,g,b] 0..1 tuples
 * where a shader/material needs them numerically (saves repeated conversions).
 */

// ───────────────────────────────────────────────────────────────────────────
// ACOUSTICS
// ───────────────────────────────────────────────────────────────────────────

/**
 * The fork's fundamental pitch in Hertz.
 * 136.1 Hz is the classic "OM / Earth year" therapeutic tuning (C#-ish).
 * Drives: (a) the Web-Audio oscillator, (b) the *stylised* cadence at which
 * wave rings are emitted from the prong tips.
 */
export const FUNDAMENTAL_HZ = 136.1;

/**
 * Quiet overtones layered above the fundamental to make the synthesised tone
 * read as "metal" rather than "sine beep". Ratios are relative to FUNDAMENTAL.
 * A real struck fork is dominated by the fundamental, so these are very low.
 */
export const HARMONICS: ReadonlyArray<{ ratio: number; gain: number }> = [
  { ratio: 2.0, gain: 0.10 }, // octave
  { ratio: 6.27, gain: 0.05 }, // inharmonic "clang" partial (stylised)
];

/** Struck-fork amplitude envelope (seconds). Exponential decay, not linear. */
export const TONE_ATTACK = 0.004; // near-instant onset of a strike
export const TONE_DECAY = 3.0; // ~3 s ring-down to silence
export const TONE_PEAK_GAIN = 0.22; // master peak (kept gentle; this is ambience)

// ───────────────────────────────────────────────────────────────────────────
// BRAND PALETTE (Udara)
// ───────────────────────────────────────────────────────────────────────────

export const PALETTE = {
  cream: '#F4ECE3',
  brown: '#3A2E26',
  terracotta: '#C17B5A',
  /** Slightly lighter cream for the top of the background gradient. */
  creamLight: '#FBF6EF',
  /** Optional "dark luxe studio" background — flip BACKGROUND_MODE to use it. */
  studioDark: '#171311',
} as const;

/** Numeric [r,g,b] 0..1 versions for shaders/materials. */
export const PALETTE_RGB = {
  cream: [0.957, 0.925, 0.890] as [number, number, number],
  brown: [0.227, 0.180, 0.149] as [number, number, number],
  terracotta: [0.757, 0.482, 0.353] as [number, number, number],
} as const;

/** 'cream' = soft warm gradient hero (default). 'dark' = luxe studio. */
export const BACKGROUND_MODE: 'cream' | 'dark' = 'cream';

/** Colour of the concentric sound-wave rings + audio-reactive glow. */
export const RING_COLOR = PALETTE.terracotta;
export const RING_COLOR_RGB = PALETTE_RGB.terracotta;

// ───────────────────────────────────────────────────────────────────────────
// CAMERA
// ───────────────────────────────────────────────────────────────────────────

export const CAMERA = {
  /** Vertical FOV in degrees. A long lens (~28–32°) flatters product metal. */
  fov: 30,
  /** Camera position in metres. Fork is ~0.19 m tall, sitting around origin. */
  position: [0, 0.06, 0.62] as [number, number, number],
  /** Look-at target (roughly the fork's mid-height). */
  target: [0, 0.04, 0] as [number, number, number],
  near: 0.01,
  far: 10,
} as const;

// ───────────────────────────────────────────────────────────────────────────
// LIGHTING (see lighting.tsx for the rig that consumes these)
// ───────────────────────────────────────────────────────────────────────────

export const LIGHTS = {
  /** Key light — warm sun. azimuth/elevation in degrees. */
  key: {
    color: '#FFF6EC',
    intensity: 3.0,
    azimuthDeg: -35,
    elevationDeg: 35,
    distance: 2.2,
    shadowMapSize: 2048,
    shadowBias: -0.0004,
    shadowNormalBias: 0.02,
  },
  /** Cool fill — opposite the key, no shadow, soft. */
  fill: {
    color: '#CFE0F0',
    intensity: 0.6,
    azimuthDeg: 145,
    elevationDeg: 20,
    distance: 2.0,
  },
  /** Rim / back light — separates the fork from the background. */
  rim: {
    color: '#FFFFFF',
    intensity: 2.0,
    azimuthDeg: 180,
    elevationDeg: 55,
    distance: 2.0,
  },
  /** Ambient floor so deep shadows never go fully black on cream bg. */
  ambientIntensity: 0.15,
} as const;

/** drei <Environment> preset. Swap for a custom HDRI via ENV_HDRI_PATH. */
export const ENV_PRESET = 'studio' as const;
/** If set, lighting.tsx loads this .hdr from /public/hdr instead of the preset. */
export const ENV_HDRI_PATH: string | null = null; // e.g. '/hdr/studio_warm_2k.hdr'

// ───────────────────────────────────────────────────────────────────────────
// MATERIAL (brushed aluminium) — see Fork.tsx
// ───────────────────────────────────────────────────────────────────────────

export const MATERIAL = {
  metalness: 1.0,
  /** Slightly polished brushed metal. Overridden per-texel if roughnessMap. */
  roughness: 0.3,
  /** KHR_materials_anisotropy strength → brushed streak highlight. */
  anisotropy: 0.7,
  /** Rotation of the anisotropy direction, radians. 0 = aligned to tangent U. */
  anisotropyRotation: 0,
  /** How strongly the environment reflects in the metal. */
  envMapIntensity: 1.2,
  /** Base tint multiplier for raw aluminium (very subtly warm). */
  color: '#EDEDED',
} as const;

// ───────────────────────────────────────────────────────────────────────────
// TONE MAPPING / POST-PROCESSING — see post.tsx
// ───────────────────────────────────────────────────────────────────────────

/** ACES tone-mapping exposure. Lower = more highlight roll-off on the metal. */
export const EXPOSURE = 1.05;

export const POST = {
  ao: {
    /** N8AO world-space radius in metres. Small object → small radius. */
    aoRadius: 0.4,
    intensity: 1.2,
    distanceFalloff: 0.6,
    /** Half-res AO is plenty for a single hero object and much cheaper. */
    halfRes: true,
  },
  bloom: {
    intensity: 0.7,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.3,
    mipmapBlur: true,
  },
  dof: {
    /** Toggled off on mobile (see Hero.tsx). Focus distance in metres. */
    enabled: true,
    focusDistance: 0.62, // ≈ camera→fork distance
    focalLength: 0.04,
    bokehScale: 2.0,
  },
  vignette: {
    darkness: 0.35,
    offset: 0.3,
  },
  noise: {
    opacity: 0.02,
    premultiply: true,
  },
} as const;

// ───────────────────────────────────────────────────────────────────────────
// SCROLL CHOREOGRAPHY — see scroll.ts
// ───────────────────────────────────────────────────────────────────────────

/** Number of full 360° turns about the Y axis across the pinned scroll. */
export const ROTATION_TURNS = 1.0;

/** Max X-axis tilt (radians) reached at the end of the scroll — a gentle nod. */
export const TILT_MAX = 0.18;

/** Normalised scroll progress (0..1) at which the fork "strikes / rings". */
export const STRIKE_PROGRESS = 0.6;

/** How tall the pinned section is, in viewport heights. More = slower scrub. */
export const PIN_SCROLL_VH = 3.0;

// ───────────────────────────────────────────────────────────────────────────
// STRIKE DYNAMICS — shared by Fork (shimmer), Waves (rings), audio (tone)
// ───────────────────────────────────────────────────────────────────────────

export const STRIKE = {
  /** Vibration shimmer envelope length, seconds (matches the audio decay). */
  shimmerDuration: 3.0,
  /** Peak positional jitter amplitude in metres (tiny — it's a *shimmer*). */
  shimmerAmplitude: 0.0009,
  /** Peak rotational jitter amplitude, radians. */
  shimmerRotAmplitude: 0.004,
  /** Jitter oscillation frequency band (Hz) — stylised, not the real pitch. */
  shimmerFreq: 42,

  /** Ring system lifetime, seconds. */
  waveDuration: 3.0,
  /** Lifetime of a single ring once emitted, seconds. */
  ringLifetime: 1.6,
  /** Max number of concurrent rings per prong tip (instance budget). */
  maxRings: 24,
  /** Outer radius a ring reaches at end-of-life, metres. */
  ringMaxRadius: 0.16,
  /** Stylised emission interval. Real 136 Hz is too fast to read, so we slow
   *  it to a pleasing visual cadence derived from the fundamental. */
  get ringInterval(): number {
    // ~7 visible pulses/second feels "ringing" without strobing.
    return 1 / (FUNDAMENTAL_HZ / 20);
  },
} as const;
