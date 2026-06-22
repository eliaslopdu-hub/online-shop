/**
 * scroll.ts — Lenis smooth-scroll + GSAP ScrollTrigger choreography.
 * ---------------------------------------------------------------------------
 * This is the conductor. It:
 *   • drives Lenis for buttery inertial scrolling and feeds its RAF into GSAP,
 *   • pins the hero section for PIN_SCROLL_VH viewport-heights,
 *   • scrubs scroll progress 0→1 into fork.rotateTo(progress),
 *   • fires the one-shot "strike" (fork shimmer + waves + audio) exactly once
 *     when crossing STRIKE_PROGRESS, and un-fires it when scrubbing back up,
 *   • reveals the headline as the user scrolls into the strike zone,
 *   • RESPECTS prefers-reduced-motion: no pin, no spin, no strike — a calm,
 *     static presentation.
 *
 * It exposes a single setup() that the React layer calls once refs are ready,
 * and returns a disposer for clean unmount.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import type { ForkHandle } from './Fork';
import type { WavesHandle } from './Waves';
import { STRIKE_PROGRESS, PIN_SCROLL_VH } from './config';
import * as audio from './audio';

gsap.registerPlugin(ScrollTrigger);

export interface ScrollTargets {
  /** The element that gets pinned (the hero wrapper). */
  pinEl: HTMLElement;
  /** The scroll-length spacer that defines how long the pin lasts. */
  triggerEl: HTMLElement;
  /** Headline element to reveal. */
  headlineEl: HTMLElement | null;
  fork: ForkHandle;
  waves: WavesHandle;
}

export interface ScrollController {
  destroy: () => void;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function setupScroll(targets: ScrollTargets): ScrollController {
  const { pinEl, triggerEl, headlineEl, fork, waves } = targets;

  // ── Reduced motion: present everything static, no scroll hijack. ──────────
  if (prefersReducedMotion()) {
    fork.rotateTo(0);
    if (headlineEl) gsap.set(headlineEl, { opacity: 1, y: 0 });
    return { destroy: () => {} };
  }

  // ── Lenis smooth scroll, wired into GSAP's ticker for frame-sync. ─────────
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  const tickerCb = (time: number) => {
    // GSAP ticker time is in seconds; Lenis wants milliseconds.
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCb);
  gsap.ticker.lagSmoothing(0);

  // ── One-shot strike, latched so it fires once per crossing direction. ─────
  let struck = false;
  const fire = () => {
    if (struck) return;
    struck = true;
    fork.strike();
    waves.emit();
    audio.strike(); // no-op if muted / not yet initialised
  };
  const unfire = () => {
    // Scrubbing back above the threshold re-arms the strike.
    struck = false;
  };

  // ── The master timeline, scrubbed by scroll position. ─────────────────────
  const st = ScrollTrigger.create({
    trigger: triggerEl,
    start: 'top top',
    end: `+=${window.innerHeight * PIN_SCROLL_VH}`,
    pin: pinEl,
    pinSpacing: true,
    scrub: 0.6, // smoothed scrub for a luxe, weighty feel
    onUpdate: (self) => {
      const p = self.progress; // 0..1 across the pinned range
      fork.rotateTo(p);

      // Headline reveal: ramps in from ~35%→55% progress.
      if (headlineEl) {
        const reveal = gsap.utils.clamp(0, 1, (p - 0.35) / 0.2);
        gsap.set(headlineEl, {
          opacity: reveal,
          y: (1 - reveal) * 24,
        });
      }

      // Latch the strike around STRIKE_PROGRESS.
      if (p >= STRIKE_PROGRESS) fire();
      else unfire();
    },
  });

  // First paint at the top.
  fork.rotateTo(0);

  return {
    destroy() {
      st.kill();
      gsap.ticker.remove(tickerCb);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((s) => s.kill());
    },
  };
}
