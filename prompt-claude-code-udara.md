# Claude Code Build Brief — Udara "Resonance" Wellness Shop Section

## ROLE & MINDSET
You are a senior creative front-end developer specialized in premium, award-style web experiences (think Awwwards "Site of the Day"). You write clean, well-structured, performant vanilla code. You do NOT rush. You build in the explicit phases defined below, and you do NOT move to the next phase until the current one is solid. Prioritize visual quality, smoothness, and atmosphere over feature quantity.

## PROJECT CONTEXT
- Client: **Udara Bali Yoga & Detox** (wellness hotel in Canggu/Berawa, Bali).
- Deliverable: a NEW section to be embedded into their **existing WordPress site**. This section sells wellness sound-therapy products (tuning forks, singing bowls, etc.).
- This is a paid €5,000 project. The bar is high.
- The section has two distinct parts:
  1. **A spectacular 3D hero** featuring a rotating tuning fork with resonance waves.
  2. **A premium 2D content + shop experience** below the hero: brand story, product explanations, then product grid leading to purchase.

## ABSOLUTE TECHNICAL CONSTRAINTS (do not deviate)
- **Stack: vanilla HTML + CSS + JavaScript only.** No React, no Vue, no build framework, no bundler. The output must be drop-in embeddable into WordPress.
- **Allowed libraries, via CDN only:** Three.js (for the 3D hero), GSAP + ScrollTrigger (for scroll animation and transitions), and the native Web Audio API (for sound). Nothing else unless strictly necessary — if you think you need another lib, stop and justify it in a comment first.
- Deliver as a self-contained structure: one main `index.html`, plus `css/`, `js/`, and `assets/` folders. All third-party libs loaded from CDN so it pastes cleanly into a WordPress page/template.
- All custom CSS scoped under a single root wrapper class (e.g. `.udara-resonance`) so it never collides with the host WordPress theme. Do the same discipline for JS (no global leaks; wrap in an IIFE or module).
- **Mobile-first and fully responsive. Mobile is the priority target** — most visitors will be on phones. The 3D hero MUST run acceptably on mobile (see Performance section for the degradation strategy).

## THE 3D MODEL
- File: a **`.glb`** tuning fork model. Placeholder path: `assets/models/tuning-fork.glb` — `[I WILL PROVIDE THIS FILE]`.
- Orientation in the file: **prongs pointing up, handle/stem pointing down, centered on the origin.** Build the camera and lighting around this.
- Material is **semi-metallic** (some reflection but also a bit matte/grey). Do NOT leave it flat. Apply a proper PBR setup: `MeshStandardMaterial` (or use the model's own material if good), and add an **HDRI environment map** for realistic soft reflections on the metal. Use a neutral studio/soft-light HDRI so reflections read as premium, not chrome-gaudy. Placeholder: `assets/hdri/studio.hdr` — generate or use a free CC0 HDRI; if you embed one, note the source in a comment.
- Lighting: soft, diffused, gallery-like. The metal should look expensive against the light background. Add subtle rim light so the silhouette stays readable on a light backdrop.

## THE HERO — INTERACTION & MOTION (this is the centerpiece)
Reference vibe: an Awwwards-tier 3D hero (a face-dissolving-into-particles site was the visual reference for the *level of finish* — we are NOT copying it, only matching the polish). Our subject is the tuning fork and its resonance.

Behavior, precisely:
1. **Scroll-driven rotation.** As the user scrolls through the hero section, the tuning fork rotates on itself (tie rotation to scroll progress via GSAP ScrollTrigger). The hero is a tall pinned section so there's scroll distance to drive the rotation.
2. **Subtle idle motion.** Even before/without scrolling, add a very gentle continuous auto-rotation or floating bob so it never looks frozen on arrival. Idle motion and scroll-driven rotation should blend, not fight.
3. **Resonance waves — permanent + reactive.**
   - **Permanent:** slow concentric waves continuously emanate from the prongs of the fork — the object should look like it's gently "breathing"/vibrating at all times. Concentric expanding rings/ripples in 3D space radiating from the prong tips.
   - **Reactive pulse:** scrolling triggers a stronger pulse of the waves, as if the scroll is "striking" the fork.
   - **Color:** NOT the orange from the reference. Use a soft, premium tone pulled from the brand palette `[BRAND_COLORS — from the Mara brand kit I will provide]`. Likely a soft gold/amber or luminous sage. Keep it tasteful and low-saturation; this is wellness, not a rave.
4. **Sound — Option A (generated, no audio file).** Using the **Web Audio API**, generate the **pure tone of a tuning fork** — a clean sine wave at **432 Hz** (make the frequency a easily-editable constant) with a soft attack and a long, gentle decay. It must only start **after a user interaction** (browsers block autoplay) — provide a small, elegant, unobtrusive sound toggle/"strike" control in the hero. On click/tap: the note rings out AND the resonance waves pulse in sync, so the user feels like they physically struck the fork. Include a clearly visible mute/unmute state. Default to muted.
5. **Background: light.** A clean, light background (off-white / warm beige — final value from brand kit). The metal and the waves must read beautifully against it.

## THE 3D → 2D TRANSITION (critical for the premium feel)
- The transition from the 3D hero into the 2D content below must be **very smooth and seamless**. As the user finishes scrolling the hero, the 3D scene gracefully resolves: e.g. the fork settles, the waves fade, the canvas elegantly fades/scales out, and the first 2D section emerges. No hard cut, no jarring jump. Use GSAP to choreograph the handoff.
- Once in the 2D content, the 3D hero is no longer visible — you may pause/destroy the render loop to save resources (important for mobile battery/perf). Re-init gracefully if the user scrolls back up.

## THE 2D EXPERIENCE — ART DIRECTION
Overall feeling the client wants, take this seriously: **abstract, sensual, enveloping, premium wellness.** Not boxy, not a rigid grid-card template. Think organic shapes, volume, depth, generous negative space, soft gradients, flowing layouts — the visitor should feel like they've drifted into an abstract yoga/meditation space and don't quite know where they are. The atmosphere itself should feel good and make them want to buy *before* they even read product details. Light, airy, tactile, calm, slightly hypnotic.

Concrete direction:
- Soft organic blob/wave shapes, subtle parallax, gentle scroll-reveal animations (GSAP), fluid section transitions. Avoid hard rectangular cards stacked in an obvious grid.
- Refined typography from the brand kit. Generous line-height and spacing. Real typographic hierarchy.
- Micro-interactions on hover/tap (soft, slow easing — nothing snappy or aggressive).
- Keep it accessible: legible contrast, reduced-motion fallback (`prefers-reduced-motion`).

### Hero copy
- Headline: **"Resonance you can feel"** (make text easily editable). Subhead/intro `[COPY — I will provide / or propose tasteful placeholder]`.
- Language: English primary (international hotel audience in Bali). Keep all copy in editable constants/markup so it's trivial to swap.

### 2D Section order
1. **Brand story / origins first.** A short, atmospheric narrative about sound therapy, tuning forks and singing bowls — the "why". This sets the mood. Content placeholder: `[BRAND_STORY_CONTENT]`.
2. **Product explanations.** For each product, an explanatory, almost editorial section: what it is, what it does, how it's used, the feeling/benefit. This is education + seduction, not a spec sheet. The flow of these explanations should naturally lead the visitor toward wanting to buy. Content placeholder: `[PRODUCTS_CONTENT — full product info in the brand folder I will provide]`.
3. **Shop / product grid (second priority, build after the rest is solid).** A premium product listing that leads to purchase.

### E-COMMERCE (V1 — keep simple)
- **No real cart, no checkout in this build.** Each product's "Buy" / CTA button links out to an **external payment link** (e.g. Stripe Payment Link). Use placeholder URLs: `[PAYMENT_LINK_PRODUCT_X]`, one per product. Make these trivially editable (e.g. a config object at top of a JS file or data-attributes).
- Prices are **not finalized** — use clearly-marked placeholder prices `[PRICE]` that are easy to find and replace.
- Product photos do **not exist yet** — use tasteful placeholder image slots (`assets/products/placeholder-*.jpg`) with correct aspect ratios and elegant loading states, so swapping in real photos later is painless.

## CONTENT & ASSETS I WILL PROVIDE (use placeholders now, do not invent final values)
Do NOT fabricate brand colors, fonts, copy, prices, or product data. Use clearly-labelled placeholders everywhere these belong, and centralize them so they're easy to fill in:
- `[BRAND_COLORS]` and `[BRAND_FONTS]` — from the Mara brand kit (folder incoming). Set them as CSS custom properties in `:root`-equivalent scoped variables so the whole site re-themes from one place.
- `[BRAND_STORY_CONTENT]`, `[PRODUCTS_CONTENT]`, product names, descriptions, benefits — from the brand folder.
- `[PRICE]` per product, `[PAYMENT_LINK_*]` per product.
- `tuning-fork.glb` (the model), product photos (later).
Create a single, well-commented **`CONFIG` / content file** that gathers every editable value (copy, colors, prices, links, frequency, wave color) in one place. This is mandatory.

## PERFORMANCE & MOBILE
- The 3D hero must run on phones. Strategy: detect device capability; on lower-end / mobile, reduce particle/wave counts, lower pixel ratio (cap `devicePixelRatio`), simplify the scene. If a device truly can't handle WebGL, **gracefully fall back to a static premium poster image or a short looping video** of the hero instead of breaking. Build the fallback hook even if I supply the media later (`assets/hero-fallback.jpg`).
- Lazy-load the heavy 3D assets; show an elegant on-brand loader while the model/HDRI load. Don't block the 2D content.
- Pause the render loop when the hero is off-screen.
- Respect `prefers-reduced-motion`: drastically reduce or disable motion and sound auto-cues.
- Target smooth 60fps on desktop, acceptable steady framerate on mid-range mobile.

## CODE QUALITY
- Clean, readable, commented where non-obvious (especially the shader/wave logic and the scroll-transition choreography).
- No console errors. No global namespace pollution. Scoped CSS.
- Cross-browser (latest Chrome, Safari, Firefox; Safari iOS especially since mobile is the priority).
- Provide a short `README.md` explaining: file structure, where to drop the `.glb`, where the CONFIG values live, how to embed into a WordPress page, and how to swap placeholders.

## BUILD IN PHASES — DO NOT SKIP AHEAD
Work in this order. After each phase, briefly summarize what you did and confirm it works before continuing.
1. **Scaffold:** folder structure, scoped wrapper, CONFIG/content file, CDN includes, responsive skeleton, on-brand loader.
2. **3D hero — model:** load the `.glb`, set up camera, soft studio lighting, HDRI env map, semi-metallic material, idle motion. Get the fork looking *expensive* and correctly framed on a light background, desktop + mobile.
3. **3D hero — waves + scroll + sound:** permanent concentric resonance waves, scroll-driven rotation via ScrollTrigger, scroll-triggered wave pulse, Web Audio 432 Hz strike on the sound control synced to a wave pulse.
4. **3D → 2D transition:** seamless choreographed handoff; pause render loop off-screen.
5. **2D experience:** brand-story section, editorial product-explanation sections, organic/abstract art direction, scroll-reveal animations, micro-interactions.
6. **Shop grid + CTAs:** premium product listing with external payment-link buttons, placeholder prices/photos.
7. **Responsive + performance pass:** mobile tuning, fallback poster/video hook, reduced-motion, lazy-loading, perf profiling.
8. **Polish + README:** final visual refinement, cross-browser checks, documentation.

## NON-NEGOTIABLES RECAP
- Vanilla HTML/CSS/JS only; Three.js + GSAP + Web Audio via CDN.
- Light background. Wave/accent color from brand kit, NOT reference-orange.
- Sound = generated 432 Hz sine (Option A), user-triggered, default muted.
- 3D hero = scroll-driven rotation + idle motion + permanent & reactive resonance waves + smooth handoff to 2D.
- 2D = abstract, sensual, enveloping, premium — story first, product explanations second, shop grid third.
- No invented brand values — use centralized, clearly-labelled placeholders.
- Embeddable into WordPress, scoped to avoid theme collisions.
- Mobile-first; graceful WebGL fallback.

Begin with Phase 1. Ask me for any asset or value you need before fabricating it.
