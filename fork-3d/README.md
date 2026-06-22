# 3D Tuning Fork — standalone

The 3D tuning fork extracted from the Udara site, as a **self-contained**
single-screen scene: a rotating, semi-metallic tuning fork with continuous
resonance waves and a generated 432 Hz strike tone. Vanilla HTML/CSS/JS,
drop-in embeddable. No build step, no dependency on the rest of the project.

## Run it

It's static, but ES modules + the Three.js CDN need **http** (not `file://`):

```bash
cd fork-3d
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

```
fork-3d/
├── index.html          # markup + CDN includes (Three.js importmap, GSAP)
├── css/style.css       # all rules scoped under .udara-resonance
├── js/config.js        # ← every editable value (window.UDARA_CONFIG)
├── js/main.js          # ES module: scene, fork, waves, sound
└── assets/models/
    └── tuning-fork.glb # the 3D model (falls back to a procedural fork if missing)
```

## What changed vs. the original site

This is the hero only. The boutique/content sections and the scroll-driven
3D→2D handoff were removed: the fork now fills the viewport and idle-spins,
floats, and breathes its resonance waves on a single screen. Everything
tweakable still lives in [`js/config.js`](js/config.js) (copy, colours, sound,
model, waves, motion, performance).

## Embed elsewhere

Paste the `<div class="udara-resonance">…</div>` from `index.html` into your
page, enqueue `css/style.css` + `js/config.js` + `js/main.js`, and include the
GSAP `<script>` and the Three.js `importmap`. All CSS is scoped under
`.udara-resonance` and the JS is a module, so nothing leaks into the host theme.
