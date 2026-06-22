/**
 * App.tsx — top-level layout, capability detection, and lifecycle wiring.
 * ---------------------------------------------------------------------------
 * Decides between the rich WebGL hero and a static poster fallback, sets up the
 * scroll controller once the scene's imperative handles exist, and lazily mounts
 * the dev-only Leva panel.
 *
 * Fallback rules:
 *   • No WebGL  → static poster + headline (no canvas at all).
 *   • prefers-reduced-motion → still renders the canvas (so the product is
 *     visible) but scroll.ts skips the pin/spin/strike (handled there). For the
 *     strictest interpretation, flip STATIC_ON_REDUCED_MOTION to true to serve
 *     the poster instead.
 *
 * Mobile tuning: lower DPR ceiling and DoF disabled.
 */

import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Hero, type HeroHandle } from './Hero';
import { Overlay } from './Overlay';
import { setupScroll, type ScrollController } from './scroll';
import { PIN_SCROLL_VH } from './config';

/** Leva is a *dev-only* dependency — lazy-import so it never ships to prod. */
const LevaPanel = lazy(async () => {
  if (!import.meta.env.DEV) {
    return { default: () => null };
  }
  const mod = await import('leva');
  return { default: () => <mod.Leva collapsed titleBar={{ title: 'UDARA · tune' }} /> };
});

/** If true, prefers-reduced-motion serves the static poster instead of canvas. */
const STATIC_ON_REDUCED_MOTION = false;

// ── Capability detection ─────────────────────────────────────────────────────

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// ── Static fallback ──────────────────────────────────────────────────────────

function PosterFallback() {
  return (
    <main className="fallback">
      <img
        className="fallback__img"
        src="/img/hero-poster.jpg"
        alt="UDARABALI brushed-aluminium therapeutic tuning fork"
      />
      <div className="fallback__text">
        <span className="overlay__mark">UDARABALI</span>
        <h1 className="overlay__headline overlay__headline--static">
          Strike it, and the room remembers stillness.
        </h1>
        <p className="overlay__subhead">
          Tuned to 136.1&nbsp;Hz — the resonance of a slow, grounding breath.
        </p>
      </div>
    </main>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const heroRef = useRef<HeroHandle>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const scrollCtl = useRef<ScrollController | null>(null);

  // Resolve capabilities once on mount (these don't change within a session).
  const [caps] = useState(() => ({
    webgl: hasWebGL(),
    mobile: isMobile(),
    reduced: prefersReducedMotion(),
  }));

  const useFallback =
    !caps.webgl || (STATIC_ON_REDUCED_MOTION && caps.reduced);

  // Wire the scroll controller AFTER layout, once the scene handles exist.
  // useLayoutEffect avoids a flash of un-pinned content.
  useLayoutEffect(() => {
    if (useFallback) return;
    let raf = 0;

    // The Fork loads async (Suspense); poll a couple of frames until its handle
    // is populated, then set up scroll. This keeps App decoupled from Suspense
    // resolution without a brittle context bridge.
    const tryInit = () => {
      const fork = heroRef.current?.fork ?? null;
      const waves = heroRef.current?.waves ?? null;
      if (fork && waves && pinRef.current && triggerRef.current) {
        scrollCtl.current = setupScroll({
          pinEl: pinRef.current,
          triggerEl: triggerRef.current,
          headlineEl: headlineRef.current,
          fork,
          waves,
        });
        return;
      }
      raf = requestAnimationFrame(tryInit);
    };
    raf = requestAnimationFrame(tryInit);

    return () => {
      cancelAnimationFrame(raf);
      scrollCtl.current?.destroy();
      scrollCtl.current = null;
    };
  }, [useFallback]);

  if (useFallback) {
    return <PosterFallback />;
  }

  const dpr: [number, number] = caps.mobile ? [1, 1.5] : [1, 2];
  const dofEnabled = !caps.mobile;

  return (
    <>
      <Suspense fallback={null}>
        <LevaPanel />
      </Suspense>

      {/* triggerRef defines the scroll length; pinRef is what stays fixed. */}
      <div
        ref={triggerRef}
        className="hero-trigger"
        style={{ height: `${PIN_SCROLL_VH * 100}vh` }}
      >
        <div ref={pinRef} className="hero-pin">
          <Suspense fallback={<div className="hero-loading" />}>
            <Hero ref={heroRef} dpr={dpr} dofEnabled={dofEnabled} />
          </Suspense>

          <Overlay
            ref={headlineRef}
            onStrike={() => heroRef.current?.strike()}
          />
        </div>
      </div>

      {/* Content that scrolls up after the hero un-pins. Replace with the rest
          of the brand site; included so the pin has somewhere to release into. */}
      <section className="after">
        <h2 className="after__title">A single tone. A whole nervous system, softening.</h2>
        <p className="after__body">
          The UDARABALI fork is milled from a single billet of aircraft-grade
          aluminium, hand-finished with a directional brush that catches the
          light the way still water catches the morning.
        </p>
      </section>
    </>
  );
}
