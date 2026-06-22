/**
 * Fork.tsx — the brushed-aluminium UDARABALI tuning fork.
 * ---------------------------------------------------------------------------
 * Loads /public/models/udara_fork.glb (Draco + KTX2 ready) and re-skins every
 * mesh with a single, carefully-tuned MeshPhysicalMaterial so the metal reads
 * as real brushed aluminium:
 *
 *   • metalness 1.0, roughness 0.30 (or the GLB's roughnessMap if present)
 *   • KHR_materials_anisotropy → directional "brushed streak" specular
 *   • normalMap / aoMap / map reused from the GLB when available
 *   • envMapIntensity 1.2 so the studio HDRI sings in the reflections
 *
 * It exposes an imperative handle so the scroll controller can drive it without
 * re-rendering React on every frame:
 *
 *   ref.rotateTo(progress)  — set absolute Y rotation + slight X tilt (0..1)
 *   ref.strike()            — trigger the decaying vibration shimmer
 *   ref.getTipWorldPositions(out) — fill two Vector3 with the prong-tip world
 *                                    positions (consumed by Waves.tsx)
 *
 * The shimmer is a tiny, exponentially-decaying position/rotation jitter layered
 * ON TOP of the scroll-driven transform — a fork doesn't fly around when struck,
 * it *trembles*.
 */

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MATERIAL, ROTATION_TURNS, TILT_MAX, STRIKE } from './config';

const MODEL_URL = '/models/udara_fork.glb';

/** CDN-hosted decoders. For a fully offline build, copy these into /public and
 *  repoint the paths (see README → Performance notes). */
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
const KTX2_TRANSCODER_PATH = 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/libs/basis/';

/** Imperative surface the scroll controller talks to. */
export interface ForkHandle {
  rotateTo: (progress: number) => void;
  strike: () => void;
  getTipWorldPositions: (out: [THREE.Vector3, THREE.Vector3]) => void;
}

/**
 * Tell drei's useGLTF to wire up Draco + KTX2 before it parses the GLB.
 * useGLTF caches per-URL, so this loader-extension callback runs once.
 */
function extendLoader(loader: import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader) {
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER_PATH);
  loader.setDRACOLoader(draco);

  const ktx2 = new KTX2Loader();
  ktx2.setTranscoderPath(KTX2_TRANSCODER_PATH);
  loader.setKTX2Loader(ktx2);
}

/** Build the brushed-metal material, reusing whatever maps the GLB shipped. */
function makeBrushedMetal(source?: THREE.MeshStandardMaterial): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(MATERIAL.color),
    metalness: MATERIAL.metalness,
    roughness: MATERIAL.roughness,
    envMapIntensity: MATERIAL.envMapIntensity,
    // KHR_materials_anisotropy → the elongated specular of brushed metal.
    anisotropy: MATERIAL.anisotropy,
    anisotropyRotation: MATERIAL.anisotropyRotation,
  });

  // Reuse the authored textures when the artist provided them in the GLB.
  // IMPORTANT: three.js MULTIPLIES the scalar factor by the map, so whenever a
  // map is present the matching scalar must be neutralised to 1.0/white, else
  // we double-apply (e.g. roughness 0.30 × map 0.30 = 0.09 → wrongly mirror-like).
  if (source) {
    if (source.map) {
      mat.map = source.map;
      mat.color.setRGB(1, 1, 1); // tint comes from the baseColor texture
    }
    if (source.normalMap) {
      mat.normalMap = source.normalMap;
      mat.normalScale.copy(source.normalScale);
    }
    if (source.aoMap) {
      mat.aoMap = source.aoMap;
      mat.aoMapIntensity = source.aoMapIntensity || 1.0;
    }
    if (source.roughnessMap) {
      // Per-texel roughness drives the surface — neutralise the scalar.
      mat.roughnessMap = source.roughnessMap;
      mat.roughness = 1.0;
    }
    if (source.metalnessMap) {
      mat.metalnessMap = source.metalnessMap;
      mat.metalness = 1.0;
    }
    // Anisotropy direction map, if the exporter wrote one.
    const anisoMap = (source as unknown as { anisotropyMap?: THREE.Texture }).anisotropyMap;
    if (anisoMap) {
      (mat as unknown as { anisotropyMap?: THREE.Texture }).anisotropyMap = anisoMap;
    }
  }

  mat.needsUpdate = true;
  return mat;
}

export const Fork = forwardRef<ForkHandle>(function Fork(_props, ref) {
  // The pivot we rotate. Keeping a dedicated group means the scroll transform
  // and the shimmer compose predictably regardless of the GLB's own hierarchy.
  const pivot = useRef<THREE.Group>(null!);

  const { scene } = useGLTF(MODEL_URL, true, true, extendLoader) as unknown as {
    scene: THREE.Group;
  };

  // Clone once, re-skin every mesh with the brushed-metal material, and remember
  // the bounding box so we can locate the prong tips.
  const { model, tipLocalA, tipLocalB } = useMemo(() => {
    const root = scene.clone(true);
    let box = new THREE.Box3();

    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const src = mesh.material as THREE.MeshStandardMaterial | undefined;
        mesh.material = makeBrushedMetal(
          src && (src as THREE.MeshStandardMaterial).isMaterial ? src : undefined,
        );
        // aoMap needs a second UV set; most exporters provide it, but guard.
        if ((mesh.material as THREE.MeshPhysicalMaterial).aoMap && mesh.geometry) {
          const geo = mesh.geometry as THREE.BufferGeometry;
          if (geo.attributes.uv && !geo.attributes.uv2) {
            geo.setAttribute('uv2', geo.attributes.uv);
          }
        }
        box.expandByObject(mesh);
      }
    });

    // Prong tips: the two highest points on the left/right of the Y axis.
    // For a standard fork the two prongs straddle X≈0, so we take the top of the
    // bbox on each side of the median X. This is robust without model-specific
    // node names; tweak if your GLB uses named tip empties.
    const top = box.max.y;
    const midX = (box.min.x + box.max.x) * 0.5;
    const tipA = new THREE.Vector3((box.min.x + midX) * 0.5, top, 0);
    const tipB = new THREE.Vector3((box.max.x + midX) * 0.5, top, 0);

    return { model: root, tipLocalA: tipA, tipLocalB: tipB };
  }, [scene]);

  // ── Strike shimmer state (mutable, frame-local — never triggers React) ──
  const strikeStart = useRef<number>(-Infinity);
  const scrollProgress = useRef<number>(0);

  // Scratch objects reused every frame to avoid per-frame allocation.
  const tmpA = useMemo(() => tipLocalA.clone(), [tipLocalA]);
  const tmpB = useMemo(() => tipLocalB.clone(), [tipLocalB]);

  useImperativeHandle(
    ref,
    (): ForkHandle => ({
      rotateTo(progress: number) {
        // Store; the actual transform is applied in useFrame so shimmer can add
        // to it without fighting the scroll value.
        scrollProgress.current = THREE.MathUtils.clamp(progress, 0, 1);
      },
      strike() {
        strikeStart.current = performance.now() / 1000;
      },
      getTipWorldPositions(out) {
        if (!pivot.current) return;
        pivot.current.updateWorldMatrix(true, false);
        out[0].copy(tmpA).applyMatrix4(pivot.current.matrixWorld);
        out[1].copy(tmpB).applyMatrix4(pivot.current.matrixWorld);
      },
    }),
    [tmpA, tmpB],
  );

  useFrame((state) => {
    if (!pivot.current) return;
    const t = state.clock.elapsedTime;

    // 1) Base transform from scroll progress.
    const p = scrollProgress.current;
    const baseRotY = p * ROTATION_TURNS * Math.PI * 2;
    const baseTiltX = p * TILT_MAX;

    // 2) Decaying vibration shimmer layered on top of the base.
    const since = performance.now() / 1000 - strikeStart.current;
    let shimmer = 0;
    if (since >= 0 && since < STRIKE.shimmerDuration) {
      // Exponential envelope: loud at impact, gone by ~shimmerDuration.
      const env = Math.exp((-since / STRIKE.shimmerDuration) * 5);
      shimmer = env;
    }

    const jitter = Math.sin(t * STRIKE.shimmerFreq * Math.PI * 2);
    const jitter2 = Math.sin(t * STRIKE.shimmerFreq * Math.PI * 2 * 1.37 + 1.1);

    pivot.current.rotation.set(
      baseTiltX + shimmer * STRIKE.shimmerRotAmplitude * jitter2,
      baseRotY,
      shimmer * STRIKE.shimmerRotAmplitude * jitter,
    );
    pivot.current.position.set(
      shimmer * STRIKE.shimmerAmplitude * jitter,
      shimmer * STRIKE.shimmerAmplitude * jitter2,
      0,
    );
  });

  return (
    <group ref={pivot} dispose={null}>
      <primitive object={model} />
    </group>
  );
});

// Preload so the GLB starts downloading as soon as the bundle parses.
useGLTF.preload(MODEL_URL, true, true, extendLoader);
