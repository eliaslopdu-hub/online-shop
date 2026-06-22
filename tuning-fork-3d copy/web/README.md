# UDARABALI — Tuning Fork Hero

A scroll-pinned, brand-designed React-Three-Fiber hero for a premium brushed-aluminium therapeutic tuning fork. The fork pins on scroll, rotates 360° on its long axis with a slight tilt, then **strikes and rings** at ~60 % scroll — emitting concentric sound-wave ripples from both prong tips, a decaying vibration shimmer, and (optionally, on a user gesture) the fork's real 136.1 Hz tone via Web Audio. The headline reveals into reserved negative space.

---

## Install & run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit only
```

> Requires Node 18+. No network calls are made at runtime except the Google
> Fonts stylesheet and the Draco/KTX2 decoder CDNs (see Performance notes to go
> fully offline).

---

## What the human must supply

Drop these files in `public/` (placeholders are referenced but **not** included):

| File | Path | Notes |
|---|---|---|
| **GLB model** | `public/models/udara_fork.glb` | ~0.19 m tall, Y-up, real-world metres. Metal with `KHR_materials_anisotropy` + roughness/normal/AO maps. Draco + KTX2 supported. |
| **HDRI** (optional) | `public/hdr/your_studio.hdr` | Only if you set `ENV_HDRI_PATH` in `config.ts`. Otherwise the drei `studio` preset is used. |
| **Poster** | `public/img/hero-poster.jpg` | Static fallback for no-WebGL devices and the social `og:image`. A high-res hero render of the fork. |

Fonts (Cormorant + Playfair) load from Google Fonts via `index.html`. To self-host, download the `.woff2`, add `@font-face`, and remove the `<link>`.

---

## File tree

```
fork-web/
├── index.html              # entry, fonts, meta, og:image
├── package.json            # pinned, mutually-compatible versions
├── vite.config.ts          # React plugin, dep pre-bundling, manual chunks
├── tsconfig.json / .node.json
├── public/
│   ├── models/udara_fork.glb   ← YOU SUPPLY
│   ├── hdr/                     ← optional custom HDRI
│   └── img/hero-poster.jpg      ← YOU SUPPLY
└── src/
    ├── main.tsx            # React root
    ├── App.tsx             # capability detection, fallback, scroll wiring, Leva
    ├── Hero.tsx            # <Canvas>, scene assembly, cross-system per-frame glue
    ├── Fork.tsx            # GLB load (Draco+KTX2), brushed-metal material, shimmer
    ├── Waves.tsx           # instanced ring shader, prong-tip ripples (inline GLSL)
    ├── lighting.tsx        # 3-point + sun rig + <Environment>
    ├── post.tsx            # N8AO → Bloom → DoF → Vignette → Noise → SMAA
    ├── scroll.ts           # Lenis + GSAP ScrollTrigger choreography
    ├── audio.ts            # Web Audio struck-fork synth + analyser
    ├── Overlay.tsx         # headline, subhead, mute/strike controls, scroll hint
    ├── config.ts           # ★ EVERY TUNABLE LIVES HERE
    ├── styles.css          # layout + overlay styling (palette mirrors config)
    └── vite-env.d.ts
```

---

## Every tunable and where it lives

**Almost everything is in `src/config.ts`.** Highlights:

| Tunable | Constant in `config.ts` | Default |
|---|---|---|
| Fundamental pitch | `FUNDAMENTAL_HZ` | `136.1` |
| Tone harmonics / envelope | `HARMONICS`, `TONE_ATTACK/DECAY/PEAK_GAIN` | — |
| Brand palette | `PALETTE`, `PALETTE_RGB` | cream/brown/terracotta |
| Background mode | `BACKGROUND_MODE` | `'cream'` (or `'dark'`) |
| Ring glow colour | `RING_COLOR` / `RING_COLOR_RGB` | terracotta |
| Camera fov/position/target | `CAMERA` | fov 30 |
| Light intensities & angles | `LIGHTS` (key/fill/rim/ambient) | key 3.0 |
| Environment | `ENV_PRESET`, `ENV_HDRI_PATH` | `studio` / none |
| Brushed-metal material | `MATERIAL` (metalness, roughness, anisotropy…) | rough 0.30, aniso 0.7 |
| Tone-mapping exposure | `EXPOSURE` | `1.05` |
| Post params | `POST.ao / bloom / dof / vignette / noise` | per the brief |
| Rotation turns | `ROTATION_TURNS` | `1.0` |
| Max tilt | `TILT_MAX` | `0.18` rad |
| Strike trigger point | `STRIKE_PROGRESS` | `0.6` |
| Pin length | `PIN_SCROLL_VH` | `3.0` viewport heights |
| Shimmer + wave dynamics | `STRIKE.*` | — |

A few knobs live where they're structurally relevant (clearly commented):
- **Decoder CDN paths** — top of `src/Fork.tsx` (`DRACO_DECODER_PATH`, `KTX2_TRANSCODER_PATH`).
- **Strict reduced-motion = poster** — `STATIC_ON_REDUCED_MOTION` in `src/App.tsx`.
- **Wave GLSL** — inline in `src/Waves.tsx` (`vertexShader` / `fragmentShader`).
- **CSS palette mirror** — `:root` in `src/styles.css` (keep in sync with `PALETTE`).

The dev-only **Leva** panel is lazy-imported (`App.tsx`) and never ships to prod.

---

## How the systems connect

```
scroll (Lenis+GSAP)  →  Fork.rotateTo(progress)        per-frame transform
        │ at STRIKE_PROGRESS:
        ├─→ Fork.strike()      decaying vibration shimmer
        ├─→ Waves.emit()       ring train from both tips
        └─→ audio.strike()     136.1 Hz struck-fork tone (if unmuted)

Hero <SceneGlue> per frame:
   Fork.getTipWorldPositions() → Waves.setTips()
   audio.getLevel()            → Waves.setLevel()   (audio-reactive ring glow)
```

The Fork and Waves expose **imperative handles** (refs) so scroll/audio can drive them without React re-renders.

---

## Performance notes

- **Draco + KTX2**: the GLB loader is pre-configured (`Fork.tsx`). Compress your GLB with `gltf-transform` (`draco`, `meshopt`, and KTX2/Basis-encode textures) for the smallest payload. Decoders load from CDN by default — to go **offline**, copy `three/examples/jsm/libs/draco/` and `.../basis/` into `public/` and repoint `DRACO_DECODER_PATH` / `KTX2_TRANSCODER_PATH`.
- **DPR**: clamped to `[1,2]` desktop, `[1,1.5]` mobile (`App.tsx`); drei `AdaptiveDpr` + `PerformanceMonitor` drop resolution under load.
- **AA**: `gl.antialias:false`; SMAA runs in the composer (cheaper, consistent).
- **AO**: N8AO `halfRes` — plenty for a single hero object.
- **DoF**: disabled on mobile (`dofEnabled` prop).
- **Bundle**: three / r3f / post are split into separate chunks (`vite.config.ts`).
- **Wave rings**: one `InstancedMesh`, ring shape drawn analytically in the fragment shader → no torus tessellation, minimal overdraw. Dead instances collapse to a point.

---

## Accessibility & fallbacks

- **No WebGL** → static poster + headline, no canvas (`App.tsx` `hasWebGL()`).
- **`prefers-reduced-motion`** → canvas still renders the product, but `scroll.ts` skips the pin/spin/strike and shows the headline statically. Set `STATIC_ON_REDUCED_MOTION = true` for the strictest interpretation (serve the poster).
- **Audio** defaults to **muted** and only initialises on a user gesture (mute toggle or Strike button), respecting autoplay policies.

---

## Acceptance checklist

- [ ] `public/models/udara_fork.glb` present; fork renders as brushed aluminium (directional anisotropic specular, crisp reflections).
- [ ] `public/img/hero-poster.jpg` present; shows when WebGL is disabled.
- [ ] Scroll pins the hero; fork rotates 360° (`ROTATION_TURNS`) with a slight tilt.
- [ ] At ~60 % scroll the fork strikes: shimmer + concentric rings from **both** prong tips.
- [ ] Headline reveals in the right-hand negative space; reverses when scrubbing back.
- [ ] "Sound on" then "Strike" plays a decaying ~136 Hz tone; ring glow reacts to level.
- [ ] Mobile: lower DPR, DoF off, headline centred, no scroll hint.
- [ ] `prefers-reduced-motion`: no spin/strike; calm static presentation.
- [ ] `npm run typecheck` passes; `npm run build` succeeds.
- [ ] Leva panel appears in dev only.
