/* =============================================================================
   CONFIG — every editable value lives here.
   Standalone "3D tuning fork" — extracted from the Udara site. Edit freely.
   Exposed as a global so the non-module loader and the module can both read it.
   ========================================================================== */
window.UDARA_CONFIG = {

  /* ---- Copy (editable) ---------------------------------------------------- */
  copy: {
    title:   'Resonance you can feel',
    subhead: 'Sound therapy, tuned to the body. Strike to hear the 432 Hz tone.',
  },

  /* ---- Brand colours ------------------------------------------------------ */
  colors: {
    background: '#f7f3ec',   // light, warm off-white
    metal:      '#cfcfcf',   // base tint of the semi-metallic fork
    wave:       '#c9a24b',   // soft gold/amber resonance
    waveGlow:   '#e7cf95',   // lighter tip of the wave gradient
  },

  /* ---- Sound (Web Audio, generated, no file) ----------------------------- */
  sound: {
    frequency:   432,        // Hz — the tuning-fork tone (easily editable)
    attack:      0.012,      // seconds — soft attack
    decay:       3.4,        // seconds — long gentle decay
    peakGain:    0.22,       // master volume of a strike (0..1)
    startMuted:  true,       // browsers block autoplay; default muted
  },

  /* ---- 3D model ----------------------------------------------------------- */
  model: {
    // If the .glb is missing or fails to load, a tasteful procedural tuning
    // fork is generated so the scene always works with no asset.
    glbPath: 'assets/models/tuning-fork.glb',
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
    maxRadius:    3.0,       // the warm waves reach well out around the fork
    baseOpacity:  0.6,       // soft but present — warm, not a graphic outline
    pulseBoost:   0.6,       // extra glow injected by a strike pulse
    lobes:        3,         // FEWER, broader swells → rolling, not spiky
    wobble:       0.14,      // deeper but wide undulation → soft sea-like rolls
    depth:        0.26,      // out-of-plane displacement → generous 3D volume
    tubeRadius:   0.075,     // thicker ribbon → more volume, catches more light
    flowSpeed:    0.11,      // base flow; alternated/ varied per ribbon
  },

  /* ---- Atmosphere: enveloping background field ---------------------------- */
  ambient: {
    desktopCount: 8,         // big background ribbons
    mobileCount:  4,
    minScale:     2.6,
    maxScale:     6.5,
    opacity:      0.10,      // very faint — atmosphere, not foreground
    driftSpeed:   0.025,     // slow rotation/drift
    submergeGain: 2.6,       // how much they swell/brighten toward the end
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
    scrollTurns:   0.6,      // (inert in the standalone single-screen demo)
    scrollRise:    2.2,
    scrollZoom:    2.8,
    exitRise:      4.5,
    leanDeg:       8,        // the fork itself is tilted this many degrees (diagonal pose)
  },

  /* ---- Performance -------------------------------------------------------- */
  perf: {
    maxPixelRatio:       2,    // desktop cap
    mobileMaxPixelRatio: 1.5,  // phone cap
  },
};
