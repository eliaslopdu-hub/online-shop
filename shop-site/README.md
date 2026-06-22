# Udara — 3D Tuning Fork Hero

The spectacular 3D hero extracted from the Udara "Resonance" brief: a rotating,
semi-metallic tuning fork with continuous resonance waves, a scroll-driven spin,
and a generated 432 Hz strike tone. Vanilla HTML/CSS/JS, drop-in embeddable.

## Run it

It's static — open `index.html` over **http** (ES modules + CDN need a server):

```bash
cd shop-site
python3 -m http.server 8000
# then open http://localhost:8000
```

## File structure

```
shop-site/
├── index.html          # markup + CDN includes (Three.js importmap, GSAP)
├── css/style.css       # all rules scoped under .udara-resonance
├── js/config.js        # ← every editable value lives here (window.UDARA_CONFIG)
├── js/main.js          # ES module: scene, fork, waves, sound, scroll
└── assets/
    ├── models/         # drop tuning-fork.glb here (optional)
    └── hdri/           # not required — uses Three.js RoomEnvironment
```

## What to edit

Everything tweakable is centralized in **`js/config.js`**:

- `copy` — headline / subhead text
- `colors` — background, metal tint, wave gold (`#c9a24b` placeholder, **not**
  the reference orange). Mirror the same values in `css/style.css` `:root` vars.
- `sound.frequency` — the tone (default **432**), plus attack/decay/volume
- `model.glbPath` — path to a real `.glb`. If the file is missing or fails to
  load, a **procedural** tuning fork is generated so the scene always works.
- `waves` — ring counts (auto-degraded on mobile), speed, max radius, pulse
- `motion` — idle spin, float bob, scroll rotations
- `perf` — pixel-ratio caps (desktop vs mobile)

## Behaviour

- **Idle:** gentle auto-rotation + float so it's never frozen.
- **Scroll:** the hero is pinned (tall section); scroll drives the rotation and
  injects stronger wave pulses, then the canvas fades for a smooth 3D→2D handoff.
- **Sound:** default **muted**. The "Strike" button unlocks audio (browser
  autoplay rules), rings the 432 Hz tone, and pulses the waves in sync.
- **Performance:** caps pixel ratio, reduces wave count on phones, pauses the
  render loop when the hero is off-screen, and falls back to
  `assets/hero-fallback.jpg` if WebGL is unavailable.
- **Accessibility:** honours `prefers-reduced-motion` (motion + sound suppressed).

## Embed into WordPress

Paste `index.html`'s `<div class="udara-resonance">…</div>` into a Custom
HTML block, then enqueue the CSS/JS and the CDN `<script>`/`importmap` tags
(or inline them). All CSS is scoped under `.udara-resonance` and the JS is a
module/IIFE, so nothing leaks into the host theme.

## Placeholders to fill from the brand kit

`[BRAND_COLORS]`, `[BRAND_FONTS]`, final copy, and the real `tuning-fork.glb`.
Until then the procedural fork + placeholder gold render fully.
