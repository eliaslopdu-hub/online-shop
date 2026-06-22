/**
 * Hero.tsx — the 3D scene container and the per-frame plumbing between systems.
 * ---------------------------------------------------------------------------
 * Responsibilities:
 *   • Configure the <Canvas> (ACES tone mapping, exposure, shadows, dpr clamp).
 *   • Mount lighting, environment, the Fork, soft contact shadows, the Waves,
 *     and the post stack.
 *   • Each frame, copy the Fork's prong-tip world positions and the current
 *     audio level into the Waves system (this is the only cross-system glue and
 *     it lives in one tiny <SceneGlue> component to keep responsibilities clear).
 *   • Expose the Fork + Waves imperative handles UP to App via callback refs so
 *     the scroll controller (plain DOM/GSAP, outside React) can drive them.
 *
 * Mobile: caller passes a lower DPR + dofEnabled=false (see App.tsx).
 */

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { ACESFilmicToneMapping } from 'three';

import { Fork, type ForkHandle } from './Fork';
import { Waves, type WavesHandle } from './Waves';
import { Lighting } from './lighting';
import { Post } from './post';
import { CAMERA, EXPOSURE, PALETTE } from './config';
import * as audio from './audio';

/** Handle App uses to wire the scroll controller to the live scene objects. */
export interface HeroHandle {
  fork: ForkHandle | null;
  waves: WavesHandle | null;
  /** Convenience: trigger a full strike from a UI button. */
  strike: () => void;
}

interface HeroProps {
  dpr: [number, number];
  dofEnabled: boolean;
}

/**
 * SceneGlue runs inside the Canvas so it can use useFrame. Every frame it pushes
 * the fork's tip positions + audio level into the waves system. Keeping this in
 * its own component means Fork and Waves stay decoupled.
 */
function SceneGlue({
  forkRef,
  wavesRef,
}: {
  forkRef: React.MutableRefObject<ForkHandle | null>;
  wavesRef: React.MutableRefObject<WavesHandle | null>;
}) {
  const tips = useMemo<[THREE.Vector3, THREE.Vector3]>(
    () => [new THREE.Vector3(), new THREE.Vector3()],
    [],
  );

  useFrame(() => {
    const fork = forkRef.current;
    const waves = wavesRef.current;
    if (!fork || !waves) return;
    fork.getTipWorldPositions(tips);
    waves.setTips(tips[0], tips[1]);
    waves.setLevel(audio.getLevel());
  });

  return null;
}

export const Hero = forwardRef<HeroHandle, HeroProps>(function Hero(
  { dpr, dofEnabled },
  ref,
) {
  const forkRef = useRef<ForkHandle | null>(null);
  const wavesRef = useRef<WavesHandle | null>(null);

  useImperativeHandle(
    ref,
    (): HeroHandle => ({
      get fork() {
        return forkRef.current;
      },
      get waves() {
        return wavesRef.current;
      },
      strike() {
        forkRef.current?.strike();
        wavesRef.current?.emit();
        audio.strike();
      },
    }),
    [],
  );

  return (
    <Canvas
      dpr={dpr}
      shadows
      // antialias off → SMAA in the composer does AA more cheaply/consistently.
      gl={{
        antialias: false,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: EXPOSURE,
        // Cream background still wins because <Environment background={false} />.
        powerPreference: 'high-performance',
      }}
      camera={{
        fov: CAMERA.fov,
        near: CAMERA.near,
        far: CAMERA.far,
        position: CAMERA.position,
      }}
      onCreated={({ camera }) => {
        camera.lookAt(new THREE.Vector3(...CAMERA.target));
      }}
    >
      {/* Keep frame budget healthy on weaker GPUs by dropping resolution. */}
      <AdaptiveDpr pixelated={false} />
      <PerformanceMonitor />

      <Lighting />

      {/* The hero subject. */}
      <Fork ref={forkRef} />

      {/* Soft grounded contact shadow under the fork (cheap, beautiful). */}
      <ContactShadows
        position={[0, -0.001, 0]}
        scale={0.45}
        far={0.25}
        blur={2.6}
        opacity={0.45}
        resolution={1024}
        color={PALETTE.brown}
      />

      {/* Sound-wave rings from the prong tips. */}
      <Waves ref={wavesRef} />

      {/* Cross-system per-frame glue. */}
      <SceneGlue forkRef={forkRef} wavesRef={wavesRef} />

      {/* Post-processing. DoF disabled on mobile via prop. */}
      <Post enableDoF={dofEnabled} />
    </Canvas>
  );
});
