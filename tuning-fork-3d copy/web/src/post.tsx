/**
 * post.tsx — the post-processing stack.
 * ---------------------------------------------------------------------------
 * Order matters in a post pipeline. We run, top to bottom:
 *
 *   1. N8AO        — high-quality ambient occlusion (contact darkening) FIRST,
 *                    so subsequent effects operate on properly-grounded image.
 *   2. Bloom       — mipmap bloom on the brightest specular highlights.
 *   3. DepthOfField— gentle focus on the fork (disabled on mobile).
 *   4. Vignette    — frames the composition, draws the eye inward.
 *   5. Noise       — a whisper of film grain (premultiplied) to kill banding.
 *   6. SMAA        — anti-aliasing LAST (we ship gl.antialias:false and let SMAA
 *                    do edge AA more cheaply/consistently in the composer).
 *
 * Every parameter is sourced from config.POST so the look is tunable in one
 * place. N8AO comes from the `n8ao` package via its R3F wrapper export.
 */

import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  Noise,
  SMAA,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
// N8AO ships its own R3F wrapper in the `n8ao` package (it is NOT re-exported by
// @react-three/postprocessing). This component plugs straight into the composer.
import { N8AO } from 'n8ao';
import { EXPOSURE, POST } from './config';

interface PostProps {
  /** Disable the (expensive) depth-of-field pass on mobile/low-power devices. */
  enableDoF?: boolean;
}

export function Post({ enableDoF = true }: PostProps) {
  const dof = POST.dof.enabled && enableDoF;

  return (
    <EffectComposer
      // multisampling 0 because SMAA handles AA; disableNormalPass lets N8AO use
      // its own depth-based AO and keeps the G-buffer light.
      multisampling={0}
      enableNormalPass={false}
    >
      {/* 1 — Ambient occlusion. Half-res keeps it cheap for a single object. */}
      <N8AO
        aoRadius={POST.ao.aoRadius}
        intensity={POST.ao.intensity}
        distanceFalloff={POST.ao.distanceFalloff}
        halfRes={POST.ao.halfRes}
      />

      {/* 2 — Bloom on specular hotspots. */}
      <Bloom
        intensity={POST.bloom.intensity}
        luminanceThreshold={POST.bloom.luminanceThreshold}
        luminanceSmoothing={POST.bloom.luminanceSmoothing}
        mipmapBlur={POST.bloom.mipmapBlur}
      />

      {/* 3 — Depth of field (optional). focusDistance is in NORMALISED units in
              postprocessing's DoF, but the wrapper accepts metres via focus props;
              we pass world-ish values tuned in config and let it map. */}
      {dof ? (
        <DepthOfField
          focusDistance={POST.dof.focusDistance}
          focalLength={POST.dof.focalLength}
          bokehScale={POST.dof.bokehScale}
        />
      ) : null}

      {/* 4 — Vignette to frame the hero. */}
      <Vignette
        darkness={POST.vignette.darkness}
        offset={POST.vignette.offset}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* 5 — Subtle grain so smooth cream gradients don't band on 8-bit panels. */}
      <Noise
        opacity={POST.noise.opacity}
        premultiply={POST.noise.premultiply}
        blendFunction={BlendFunction.SCREEN}
      />

      {/* 6 — Edge anti-aliasing, last. */}
      <SMAA />
    </EffectComposer>
  );
}

/** Re-export so Hero can echo the exposure into a comment/debug if desired. */
export const POST_EXPOSURE = EXPOSURE;
