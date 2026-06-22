/* =============================================================================
   CONFIG — every editable value lives here.
   Fill these in from the Mara brand kit when provided. Placeholders are marked.
   Exposed as a global so the non-module loader and the module can both read it.
   ========================================================================== */
window.UDARA_CONFIG = {

  /* ---- Copy (editable) ---------------------------------------------------- */
  copy: {
    title:   'Resonance you can feel',
    subhead: 'Sound therapy, tuned to the body. Scroll to feel the fork turn.',
  },

  /* ---- Brand colours  [PLACEHOLDER — from Mara brand kit] ----------------- */
  colors: {
    background: '#f7f3ec',   // light, warm off-white
    metal:      '#cfcfcf',   // base tint of the semi-metallic fork
    wave:       '#c9a24b',   // soft gold/amber resonance — NOT reference-orange
    waveGlow:   '#e7cf95',   // lighter tip of the wave gradient
  },

  /* ---- Sound (Web Audio, Option A: generated, no file) -------------------- */
  sound: {
    frequency:   432,        // Hz — the tuning-fork tone (easily editable)
    attack:      0.012,      // seconds — soft attack
    decay:       3.4,        // seconds — long gentle decay
    peakGain:    0.22,       // master volume of a strike (0..1)
    startMuted:  true,       // browsers block autoplay; default muted
  },

  /* ---- 3D model ----------------------------------------------------------- */
  model: {
    // If you have the real .glb, set this path. If null / missing, a tasteful
    // procedural tuning fork is generated so the scene works with no asset.
    glbPath: 'assets/models/tuning-fork.glb',   // [I WILL PROVIDE — falls back to procedural]
    useProceduralFallback: true,
    metalness: 0.92,
    roughness: 0.34,
    roughnessScale:   0.7,   // <1 sharpens the baked roughnessMap → brighter metal
    envMapIntensity:  2.4,    // reflection strength — the main "premium metal" dial
  },

  /* ---- Resonance waves ---------------------------------------------------- */
  waves: {
    desktopCount: 4,         // concurrent wave-ribbons per prong tip
    mobileCount:  3,         // degraded for phones
    period:       8.5,       // seconds for one wave to travel out & fade (slow = premium)
    startRadius:  0.06,      // world units, at the prong tip
    maxRadius:    3.0,       // BIGGER — the warm waves reach well out around the fork
    baseOpacity:  0.6,       // soft but present — warm, not a graphic outline
    pulseBoost:   0.6,       // extra glow injected by a strike / scroll pulse
    // --- warm "vague" shaping. Each ribbon VARIES around these bases (see main.js)
    // so the waves are organic & non-monotonous, with broad rounded swells (not
    // tight/sharp = "moins aiguë"). -------------------------------------------
    lobes:        3,         // FEWER, broader swells → rolling, not spiky
    wobble:       0.14,      // deeper but wide undulation → soft sea-like rolls
    depth:        0.26,      // out-of-plane displacement → generous 3D volume
    tubeRadius:   0.075,     // thicker ribbon → more volume, catches more light
    flowSpeed:    0.11,      // base flow; alternated/ varied per ribbon
  },

  /* ---- Atmosphere: enveloping background field (Bali / wellness) ----------- */
  // Large, slow, translucent versions of the same warm waves drifting at several
  // depths so the visitor feels SUBMERGED in resonance, + floating light motes
  // (incense / spa-light). Submersion intensifies as you scroll.
  ambient: {
    desktopCount: 8,         // big background ribbons
    mobileCount:  4,
    minScale:     2.6,
    maxScale:     6.5,
    opacity:      0.10,      // very faint — atmosphere, not foreground
    driftSpeed:   0.025,     // slow rotation/drift
    submergeGain: 2.6,       // how much they swell/brighten toward the end (submersion)
  },
  motes: {
    desktopCount: 260,       // floating light particles
    mobileCount:  90,
    area:         16,        // size of the volume they fill (world units)
    size:         0.07,      // particle size
    opacity:      0.55,
    riseSpeed:    0.14,      // gentle upward drift
  },

  /* ---- Motion ------------------------------------------------------------- */
  motion: {
    idleSpinSpeed: 0.22,     // rad/sec — always-on rotation so it never looks stopped
    bobAmplitude:  0.05,     // vertical float amplitude (world units)
    bobSpeed:      0.9,      // float frequency
    scrollTurns:   0.6,      // gentle rotation across the (long) scroll → slow motion
    scrollRise:    2.2,      // world units the fork travels UP across the scroll (gentle)
    scrollZoom:    2.8,      // camera dolly-in toward the end → the "zoom" into submersion
    exitRise:      4.5,      // extra climb AFTER the pin → fork keeps rising off-screen as it fades
    leanDeg:       8,        // the fork itself is tilted this many degrees (diagonal pose)
  },

  /* ---- Performance -------------------------------------------------------- */
  perf: {
    maxPixelRatio:       2,    // desktop cap
    mobileMaxPixelRatio: 1.5,  // phone cap
  },

  /* ---- Boutique contact --------------------------------------------------- */
  // WhatsApp reception number — international format, DIGITS ONLY (no +, spaces
  // or dashes). Empty string keeps the Enquire buttons inert (no broken links).
  whatsapp:     '6287765377313',
  enquireLabel: 'Enquire on WhatsApp',
};
