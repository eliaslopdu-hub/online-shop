# UDARABALI Tuning Fork — 3D Asset & Premium Web Hero

A complete pipeline that turns reference photos of the **UDARABALI brushed-aluminium
therapeutic tuning fork** into (1) a clean, textured, web-ready 3D model and
(2) a production-quality animated **React-Three-Fiber web hero**.

Everything is self-contained in this folder. Nothing here touches the `udara-book` project.

---

## 1. What's in here

```
tuning-fork-3d/
├── build_fork.py            # ★ parametric GEOMETRY (bevels, forged foot, engraving)
├── textures.py              # ★ UV unwrap + AO bake + brushed-aluminium MATERIAL maps
├── render.py                # ★ offline reflection RENDERER (sun + brushed metal + AO + shadow)
├── make_viewer.py           # builds viewer.html (interactive preview + render gallery)
│
├── udara_tuning_fork.glb    # geometry-only model (used by the renderer)
├── udara_fork_textured.glb  # ★ WEB-READY model: UVs + brushed maps + baked AO (2.4 MB)
├── udara_tuning_fork.stl    # for 3D printing / CAD
│
├── render_hero.png          # ★ photoreal stills (3/4, front, engraving macro)
├── render_front.png
├── render_detail.png
├── hero-poster.jpg          # web fallback poster
├── viewer.html              # double-click: spin the textured model + see the renders
│
├── textures/                # tex_basecolor / tex_mr / tex_normal / tex_ao  (1024²)
├── reference/               # all 9 reference photos (incl. bottom-detail set)
└── web/                     # ★ the React-Three-Fiber premium hero (see §4)
```

`★` = primary deliverables.

---

## 2. Regenerate the asset (Python)

Uses the existing venv at `../udara-book/.venv` (trimesh, numpy, shapely, manifold3d,
xatlas, embree, scipy, matplotlib, Pillow).

```bash
PY=../udara-book/.venv/bin/python3
$PY build_fork.py     # → udara_tuning_fork.glb / .stl   (geometry)
$PY textures.py       # → udara_fork_textured.glb + textures/   (material)
$PY render.py         # → render_hero/front/detail.png   (photoreal stills)
$PY make_viewer.py    # → viewer.html
```

**Tune the geometry** at the top of `build_fork.py` (all dimensions in mm; the
silhouette/volume is locked to the real product). **Tune the look** (sun
direction, exposure, brushed strength) at the top of `render.py`.

### What changed vs. the first draft (the "premium" upgrades)
- **Geometry:** chamfered edges on every edge (machined highlight lines), softly
  rounded vertical corners, a **smoothly lofted foot** (round stem → flat blade,
  no glued collar), higher resolution. Same exact dimensions.
- **Material:** real **UV unwrap**, **baked ambient occlusion**, and
  **world-consistent brushed-aluminium maps** — roughness (vertical brush streaks +
  smudges concentrated where it's held + faint scratches), a brushed **normal map**,
  base color, and AO. (Before: a single flat grey PBR value — the main "cheap" tell.)
- **Lighting:** offline renderer with a directional **sun**, anisotropic brushed
  reflections, AO in the crevices, soft contact shadow, ACES tone-mapping.

---

## 3. View it now
Double-click **`viewer.html`** — spin the textured model (☀ Sun / Studio / Soft
lighting), with the three photoreal renders below.

---

## 4. The web hero (`web/`)

A custom **React + Vite + TypeScript + React-Three-Fiber** scroll-pinned hero.
This is the real €5k-grade deliverable (a plain model-viewer widget cannot reach it).

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle
```

**Behaviour:** the fork is pinned as the hero; on scroll it rotates 360° on its
long axis with a slight tilt, and at 60% progress it **"strikes"** — emitting
concentric **sound-wave ripples** from the prong tips with a decaying vibration
shimmer, optionally playing the fork's real tone (136.1 Hz "OM") via **Web Audio**
(muted by default; needs a click). Headline reveals in reserved negative space.

**What's implemented**
- Brushed-metal `MeshPhysicalMaterial` (metalness 1, **anisotropy 0.7**, reuses the
  GLB's roughness/normal/AO maps — see fix note below).
- Three-point + **sun** lighting; studio HDRI environment; soft contact shadows.
- Post-processing: **N8AO → Bloom → DoF → Vignette → film grain → SMAA**, ACES.
- Custom GLSL **ripple shader** (instanced SDF rings, additive, audio-reactive).
- **Web Audio** struck-fork synth (fundamental + 2 harmonics, exponential decay).
- **GSAP ScrollTrigger + Lenis** choreography; `prefers-reduced-motion` → static.
- Fallbacks: no-WebGL → poster image; mobile → lower DPR + DoF off.

**Everything tunable lives in `web/src/config.ts`** — frequency, palette, ring
colour, light intensities/angles, exposure, bloom/AO, rotation turns, strike point.

**Assets already dropped in:** `web/public/models/udara_fork.glb` (the textured
model) and `web/public/img/hero-poster.jpg`. Optional: add a custom HDRI in
`web/public/hdr/` and set `ENV_HDRI_PATH` in `config.ts`.

> **Fix applied during integration:** in `Fork.tsx`, when the GLB ships
> roughness/baseColor maps, the scalar `roughness`/`color` are now neutralised to
> `1.0`/white so three.js doesn't *double-multiply* them (which would have made the
> metal wrongly mirror-like).

> The IDE shows "Cannot find module 'react'/'three'…" until you run `npm install`;
> that's expected (no `node_modules` yet), not a code error.

---

## 5. Acceptance / QA checklist
- [x] Same silhouette & dimensions as the real fork (engraving, slot, pentagon shoulders, blade foot).
- [x] Every edge shows a highlight line (chamfers); no razor-CG edges.
- [x] Foot is a smooth forged flatten — no glued collar.
- [x] Brushed roughness + normal + smudges + scratches (not flat plastic).
- [x] Baked AO darkens slot / shoulders / engraving.
- [x] Web hero: anisotropic metal, sun + post-processing, ripple + audio, scroll choreography, fallbacks.
- [ ] **Run `npm install && npm run dev`** and confirm 60 fps + load < 2.5 s (needs your machine).
- [ ] For production: compress the GLB with **Draco/meshopt** + textures to **KTX2** (see web/README).

---

## 6. Open parameters to confirm (set in `web/src/config.ts`)
1. **Fork frequency** for the audio/wave cadence — default **136.1 Hz "OM"**. Confirm the real tone.
2. **Finish:** brushed satin (current) vs. shinier — `MATERIAL.roughness` / regenerate `textures.py`.
3. **Background:** cream gradient (default) vs. dark luxe studio — `BACKGROUND_MODE`.
4. **Ring glow colour:** terracotta (brand) vs. cool white — `RING_COLOR`.
5. **Headline copy** + which side reserves negative space — `Overlay.tsx`.
6. **Audio default** — currently muted until the user clicks "Strike/Listen".
