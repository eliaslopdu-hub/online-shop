/**
 * Waves.tsx — concentric sound-wave ripples from the two prong tips.
 * ---------------------------------------------------------------------------
 * When the fork strikes, each prong tip emits a train of expanding rings. Each
 * ring is a camera-facing billboard quad; its *ring shape* is drawn entirely in
 * the fragment shader as a soft analytic annulus (an SDF-style ring), so the
 * geometry is just a flat plane — no tessellated torus, no overdraw drama.
 *
 * We render the whole ring train with a single InstancedMesh (instance budget =
 * STRIKE.maxRings × 2 tips). Per-instance attributes carry each ring's birth
 * time and which tip spawned it; the shader computes age → radius, width and
 * opacity falloff. Additive blending makes overlapping rings glow.
 *
 * Imperative API:
 *   ref.emit()                  — begin a strike (resets + arms the emitter)
 *   ref.setTips(a, b)           — update tip world positions each frame
 *   ref.setLevel(level)         — audio-reactive glow multiplier (0..1)
 *
 * GLSL is inlined below for portability.
 */

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RING_COLOR_RGB, STRIKE } from './config';

export interface WavesHandle {
  emit: () => void;
  setTips: (a: THREE.Vector3, b: THREE.Vector3) => void;
  setLevel: (level: number) => void;
}

const RING_BUDGET = STRIKE.maxRings * 2; // both prong tips

// ── GLSL ───────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  // Per-instance data (set from JS as instanced buffer attributes).
  attribute float aBirth;     // emission time (seconds, scene clock)
  attribute float aTip;       // 0 or 1 — which prong tip (for slight variety)
  attribute vec3  aCenter;    // ring centre in world space (the tip position)

  uniform float uTime;        // current scene time
  uniform float uLifetime;    // ring lifetime (seconds)
  uniform float uMaxRadius;   // outer radius at end of life (metres)

  varying float vAge;         // 0..1 normalised age, <0 = not yet born / dead
  varying vec2  vUv;

  void main() {
    vUv = uv;

    float age = (uTime - aBirth) / uLifetime;
    vAge = age;

    // The quad must be large enough to contain the ring at its max radius.
    // `position` is a unit quad in [-0.5,0.5]; scale it to 2*maxRadius.
    float quadScale = uMaxRadius * 2.2;

    // Billboard: build the quad facing the camera at aCenter.
    vec3 camRight = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
    vec3 camUp    = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);

    vec3 worldPos = aCenter
      + camRight * position.x * quadScale
      + camUp    * position.y * quadScale;

    // Collapse dead/unborn instances to a point so they cost ~nothing.
    if (age < 0.0 || age > 1.0) {
      worldPos = aCenter;
    }

    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3  uColor;       // RING_COLOR
  uniform float uLevel;       // audio-reactive intensity (0..1, +1 baseline)

  varying float vAge;
  varying vec2  vUv;

  void main() {
    // Discard anything outside its lifetime.
    if (vAge < 0.0 || vAge > 1.0) discard;

    // Distance from quad centre, normalised so radius 1.0 == quad edge region.
    float d = length(vUv - 0.5) * 2.0;

    // The ring's current radius grows with age (ease-out for a "shock" feel).
    float radius = 1.0 - pow(1.0 - vAge, 2.0); // 0 → 1 ease-out
    radius *= 0.9; // keep a margin inside the quad

    // The ring's stroke thins as it expands (energy spreads thin).
    float width = mix(0.10, 0.015, vAge);

    // Soft analytic annulus: bright at |d-radius| < width, smooth falloff.
    float ring = smoothstep(width, 0.0, abs(d - radius));

    // Opacity decays over the ring's life (and a touch faster at the very end).
    float fade = (1.0 - vAge) * (1.0 - vAge);

    // Audio/strike level lifts the glow; baseline keeps rings visible when muted.
    float intensity = (0.65 + 0.85 * uLevel);

    float alpha = ring * fade * intensity;
    if (alpha < 0.002) discard;

    // Slight inner warm core so the ring reads as light, not a hairline.
    vec3 col = uColor * (1.0 + ring * 0.6);

    gl_FragColor = vec4(col, alpha);
  }
`;

export const Waves = forwardRef<WavesHandle>(function Waves(_props, ref) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  // Tip positions, updated every frame from the Fork's imperative handle.
  const tipA = useRef(new THREE.Vector3());
  const tipB = useRef(new THREE.Vector3());

  // Emission bookkeeping.
  const emitStart = useRef<number>(-Infinity);
  const lastEmit = useRef<number>(0);
  const cursor = useRef<number>(0); // round-robin index into the instance ring buffer
  const level = useRef<number>(0);

  // Per-instance attribute buffers (mutated in place, flagged needsUpdate).
  const { geometry, material, birthAttr, tipAttr, centerAttr } = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    // Copy the plane's index + attributes into the instanced geometry.
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;

    const birth = new Float32Array(RING_BUDGET).fill(-1000);
    const tip = new Float32Array(RING_BUDGET);
    const center = new Float32Array(RING_BUDGET * 3);

    const birthBuf = new THREE.InstancedBufferAttribute(birth, 1);
    const tipBuf = new THREE.InstancedBufferAttribute(tip, 1);
    const centerBuf = new THREE.InstancedBufferAttribute(center, 3);
    birthBuf.setUsage(THREE.DynamicDrawUsage);
    centerBuf.setUsage(THREE.DynamicDrawUsage);

    geo.setAttribute('aBirth', birthBuf);
    geo.setAttribute('aTip', tipBuf);
    geo.setAttribute('aCenter', centerBuf);
    geo.instanceCount = RING_BUDGET;

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false, // additive glow shouldn't occlude
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uLifetime: { value: STRIKE.ringLifetime },
        uMaxRadius: { value: STRIKE.ringMaxRadius },
        uColor: {
          value: new THREE.Color(
            RING_COLOR_RGB[0],
            RING_COLOR_RGB[1],
            RING_COLOR_RGB[2],
          ),
        },
        uLevel: { value: 0 },
      },
    });

    return {
      geometry: geo,
      material: mat,
      birthAttr: birthBuf,
      tipAttr: tipBuf,
      centerAttr: centerBuf,
    };
  }, []);

  useImperativeHandle(
    ref,
    (): WavesHandle => ({
      emit() {
        emitStart.current = performance.now() / 1000;
        lastEmit.current = 0;
      },
      setTips(a, b) {
        tipA.current.copy(a);
        tipB.current.copy(b);
      },
      setLevel(l) {
        level.current = THREE.MathUtils.clamp(l, 0, 1);
      },
    }),
    [],
  );

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    material.uniforms.uTime.value = now;
    // Blend audio level with a synthetic decay so visuals work even when muted.
    const sinceStrike = performance.now() / 1000 - emitStart.current;
    const synthetic =
      sinceStrike >= 0 && sinceStrike < STRIKE.waveDuration
        ? Math.exp((-sinceStrike / STRIKE.waveDuration) * 4)
        : 0;
    material.uniforms.uLevel.value = Math.max(level.current, synthetic);

    // Emit new rings at the stylised cadence during the active window.
    if (sinceStrike >= 0 && sinceStrike < STRIKE.waveDuration) {
      const wall = performance.now() / 1000;
      if (wall - lastEmit.current >= STRIKE.ringInterval) {
        lastEmit.current = wall;
        // Emit one ring from EACH tip this pulse.
        for (let t = 0; t < 2; t++) {
          const i = cursor.current % RING_BUDGET;
          cursor.current++;
          birthAttr.array[i] = now;
          tipAttr.array[i] = t;
          const c = t === 0 ? tipA.current : tipB.current;
          centerAttr.array[i * 3 + 0] = c.x;
          centerAttr.array[i * 3 + 1] = c.y;
          centerAttr.array[i * 3 + 2] = c.z;
        }
        birthAttr.needsUpdate = true;
        tipAttr.needsUpdate = true;
        centerAttr.needsUpdate = true;
      }
    }
  });

  // The instanced ring buffer is positioned per-instance in the shader, so the
  // mesh itself sits at the origin with an identity matrix.
  return <instancedMesh ref={meshRef} args={[geometry, material, RING_BUDGET]} frustumCulled={false} />;
});
