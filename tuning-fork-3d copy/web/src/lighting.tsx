/**
 * lighting.tsx — three-point + sun rig and image-based lighting.
 * ---------------------------------------------------------------------------
 * Product metal lives or dies by its reflections, so this rig pairs a crisp
 * three-point setup (key / fill / rim) with a studio HDRI environment that the
 * MeshPhysicalMaterial samples for its brushed-metal specular streaks.
 *
 * All intensities/angles come from config.LIGHTS so a brand owner can re-light
 * the whole scene without touching scene code.
 */

import { useMemo } from 'react';
import { Environment } from '@react-three/drei';
import { LIGHTS, ENV_PRESET, ENV_HDRI_PATH } from './config';

/**
 * Convert azimuth/elevation (degrees) + distance into a Cartesian position.
 * Azimuth is measured around Y (0° = +Z, increasing toward +X); elevation is
 * the angle above the XZ plane. This keeps the config human-readable.
 */
function polarToCartesian(
  azimuthDeg: number,
  elevationDeg: number,
  distance: number,
): [number, number, number] {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const cosEl = Math.cos(el);
  return [
    distance * cosEl * Math.sin(az),
    distance * Math.sin(el),
    distance * cosEl * Math.cos(az),
  ];
}

export function Lighting() {
  const keyPos = useMemo(
    () =>
      polarToCartesian(
        LIGHTS.key.azimuthDeg,
        LIGHTS.key.elevationDeg,
        LIGHTS.key.distance,
      ),
    [],
  );
  const fillPos = useMemo(
    () =>
      polarToCartesian(
        LIGHTS.fill.azimuthDeg,
        LIGHTS.fill.elevationDeg,
        LIGHTS.fill.distance,
      ),
    [],
  );
  const rimPos = useMemo(
    () =>
      polarToCartesian(
        LIGHTS.rim.azimuthDeg,
        LIGHTS.rim.elevationDeg,
        LIGHTS.rim.distance,
      ),
    [],
  );

  return (
    <>
      {/* Soft floor of ambient so cream-bg shadows never crush to black. */}
      <ambientLight intensity={LIGHTS.ambientIntensity} />

      {/* KEY — the warm "sun". Only this light casts shadows (cheaper, cleaner). */}
      <directionalLight
        position={keyPos}
        color={LIGHTS.key.color}
        intensity={LIGHTS.key.intensity}
        castShadow
        shadow-mapSize-width={LIGHTS.key.shadowMapSize}
        shadow-mapSize-height={LIGHTS.key.shadowMapSize}
        shadow-bias={LIGHTS.key.shadowBias}
        shadow-normalBias={LIGHTS.key.shadowNormalBias}
        // Tight ortho frustum around the ~0.2 m object → high shadow resolution.
        shadow-camera-near={0.1}
        shadow-camera-far={4}
        shadow-camera-left={-0.3}
        shadow-camera-right={0.3}
        shadow-camera-top={0.3}
        shadow-camera-bottom={-0.3}
      />

      {/* FILL — cool, soft, opposite the key, no shadow. Opens up the dark side. */}
      <directionalLight
        position={fillPos}
        color={LIGHTS.fill.color}
        intensity={LIGHTS.fill.intensity}
      />

      {/* RIM / BACK — bright edge light to peel the fork off the background. */}
      <directionalLight
        position={rimPos}
        color={LIGHTS.rim.color}
        intensity={LIGHTS.rim.intensity}
      />

      {/*
        Image-based lighting drives the metal's reflections. By default we use a
        drei built-in "studio" preset. To ship a bespoke HDRI, drop a .hdr in
        /public/hdr, set ENV_HDRI_PATH in config.ts, and it loads instead.
        `background={false}` keeps our CSS/gradient backdrop visible.
      */}
      {ENV_HDRI_PATH ? (
        <Environment files={ENV_HDRI_PATH} background={false} />
      ) : (
        <Environment preset={ENV_PRESET} background={false} />
      )}
    </>
  );
}
