/**
 * Overlay.tsx — the HTML layer over the canvas.
 * ---------------------------------------------------------------------------
 * Holds the headline (revealed by the scroll controller into the reserved
 * negative space beside the fork), the subhead, a tasteful audio mute/unmute
 * toggle, a manual "Strike" button, and a scroll hint.
 *
 * The headline element is handed up to the parent via a ref so scroll.ts can
 * animate it. All controls call into the audio engine / imperative scene refs.
 */

import { forwardRef, useState, useCallback } from 'react';
import * as audio from './audio';

interface OverlayProps {
  /** Manually trigger a strike (fork shimmer + waves + tone). */
  onStrike: () => void;
}

export const Overlay = forwardRef<HTMLHeadingElement, OverlayProps>(
  function Overlay({ onStrike }, headlineRef) {
    const [muted, setMuted] = useState(true);

    const toggleMute = useCallback(() => {
      // First unmute is the user gesture that unlocks Web Audio.
      audio.init();
      const next = !muted;
      audio.setMuted(next);
      setMuted(next);
    }, [muted]);

    const handleStrike = useCallback(() => {
      // A click is a valid gesture, so make sure audio is ready.
      audio.init();
      onStrike();
    }, [onStrike]);

    return (
      <div className="overlay">
        {/* Brand mark / kicker, top-left. */}
        <header className="overlay__brand">
          <span className="overlay__mark">UDARABALI</span>
          <span className="overlay__kicker">Therapeutic Tuning Fork</span>
        </header>

        {/* Headline lives in the right-hand negative space; revealed on scroll. */}
        <div className="overlay__headline-zone">
          <h1 ref={headlineRef} className="overlay__headline">
            Strike it,
            <br />
            and the room
            <br />
            remembers stillness.
          </h1>
          <p className="overlay__subhead">
            Tuned to 136.1&nbsp;Hz — the resonance of a slow, grounding breath.
          </p>
        </div>

        {/* Controls, bottom. */}
        <div className="overlay__controls">
          <button
            type="button"
            className="overlay__btn overlay__btn--primary"
            onClick={handleStrike}
          >
            Strike
          </button>
          <button
            type="button"
            className="overlay__btn"
            aria-pressed={!muted}
            onClick={toggleMute}
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>

        {/* Scroll hint, bottom-centre. */}
        <div className="overlay__hint" aria-hidden="true">
          <span>Scroll to ring</span>
          <span className="overlay__hint-line" />
        </div>
      </div>
    );
  },
);
