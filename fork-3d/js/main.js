/* =============================================================================
   3D Tuning Fork — standalone single-screen scene (extracted from Udara).
   Vanilla JS module. Three.js + GSAP (CDN, entrance only) + Web Audio API.
   Scoped, no global leaks (this whole file is an ES module).
   ========================================================================== */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CFG = window.UDARA_CONFIG;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;

/* ---- DOM refs ------------------------------------------------------------- */
const canvas      = document.getElementById('udara-canvas');
const loaderEl    = document.getElementById('udara-loader');
const fallbackEl  = document.getElementById('udara-fallback');
const heroEl      = document.getElementById('udara-hero');
const strikeBtn   = document.getElementById('udara-strike');
const strikeLabel = document.getElementById('udara-strike-label');

/* Apply editable copy from CONFIG */
document.getElementById('udara-title').textContent   = CFG.copy.title;
document.getElementById('udara-subhead').textContent = CFG.copy.subhead;

/* ---- WebGL capability check → graceful fallback --------------------------- */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
              (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

if (!hasWebGL()) {
  fallbackEl.hidden = false;
  loaderEl.classList.add('is-hidden');
  document.querySelector('.udara-resonance').classList.add('is-ready');
} else {
  initScene();
}

/* ========================================================================== */
function initScene() {
  /* ---- Renderer ---------------------------------------------------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const maxPR = isMobile ? CFG.perf.mobileMaxPixelRatio : CFG.perf.maxPixelRatio;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPR));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Soft contact shadows ground the fork so it stops looking like it floats.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* ---- Scene + soft studio environment ----------------------------------- */
  const scene = new THREE.Scene();

  // Canvas stays TRANSPARENT (alpha renderer). The "depth" gradient now lives in
  // CSS on the hero and resolves to the exact same cream as the 2D content, so the
  // hero and the section below form ONE continuous surface — no visible boundary.
  scene.background = null;

  // RoomEnvironment gives gallery-soft reflections on the metal — no external HDR.
  // We brighten it (add a couple of large soft light panels) so the aluminium
  // reads bright & expensive instead of dark grey.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const panelGeo = new THREE.PlaneGeometry(8, 14);
  [[-6, 4, 3, 6], [7, 6, -2, 4], [0, 12, 0, 5]].forEach(([x, y, z, p]) => {
    // Faintly warm soft-boxes → a whisper of champagne in the aluminium reflections.
    const panel = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: 0xfff4e6 }));
    panel.material.color.multiplyScalar(p);   // bright soft-box highlights
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    envScene.add(panel);
  });
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;

  /* ---- Camera ------------------------------------------------------------ */
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.4, 9.5);
  camera.lookAt(0, 0.2, 0);
  const CAM_BASE_Z = camera.position.z; // for the scroll dolly-in

  /* ---- Lighting: soft, diffused, gallery-like ---------------------------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 8;   key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;       // softer penumbra
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff2dc, 0.45);
  fill.position.set(-5, 2, 4);
  scene.add(fill);
  // Rim light keeps the silhouette readable on the light background.
  const rim = new THREE.DirectionalLight(0xffffff, 0.95);
  rim.position.set(-2, 3, -6);
  scene.add(rim);

  // Ground plane that ONLY catches the shadow (invisible otherwise).
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.95;     // just under the fork's handle/foot
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---- Fork group + waves ------------------------------------------------ */
  // forkPivot = tilt + position (the fork "leans"); forkGroup = self-rotation.
  // Keeping them separate means the lean stays stable while it spins (no wobble).
  const forkPivot = new THREE.Group();
  forkPivot.rotation.z = THREE.MathUtils.degToRad(CFG.motion.leanDeg);
  scene.add(forkPivot);
  const forkGroup = new THREE.Group();
  forkPivot.add(forkGroup);
  const forkMaterials = []; // collected so the fork alone can fade at the hero's end
  const ground_ref = ground; // fade the contact shadow with the fork

  // Prong-tip positions (world-ish, before group transforms) — waves emanate here.
  const PRONG_TIPS = [];

  const metalMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(CFG.colors.metal),
    metalness: CFG.model.metalness,
    roughness: CFG.model.roughness,
    envMapIntensity: 1.1,
  });

  /* ---- Build the fork: real .glb if available, else procedural ----------- */
  function buildProceduralFork() {
    const halfGap = 0.85;   // horizontal half-distance between prongs
    const top     = 3.0;    // prong tip height
    const bowlY   = -1.0;   // centre of the U bend
    const tubeR   = 0.17;   // thickness of the bar

    // U-shaped path: left prong down → rounded bottom → right prong up.
    const pts = [];
    for (let y = top; y >= bowlY; y -= 0.15) pts.push(new THREE.Vector3(-halfGap, y, 0));
    const segs = 18;
    for (let i = 0; i <= segs; i++) {
      const a = Math.PI + (Math.PI * i) / segs; // 180° → 360°
      pts.push(new THREE.Vector3(Math.cos(a) * halfGap, bowlY + Math.sin(a) * halfGap, 0));
    }
    for (let y = bowlY; y <= top; y += 0.15) pts.push(new THREE.Vector3(halfGap, y, 0));

    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 220, tubeR, 20, false),
      metalMat
    );
    forkGroup.add(tube);

    // Rounded caps on the prong tips.
    [-halfGap, halfGap].forEach((x) => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(tubeR, 20, 16), metalMat);
      cap.position.set(x, top, 0);
      forkGroup.add(cap);
      PRONG_TIPS.push(new THREE.Vector3(x, top, 0));
    });

    // Stem dropping from the bottom of the U, plus a small foot.
    const lowest = bowlY - halfGap;
    const stemLen = 2.4;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeR, tubeR * 1.05, stemLen, 24),
      metalMat
    );
    stem.position.set(0, lowest - stemLen / 2 + tubeR * 0.5, 0);
    forkGroup.add(stem);

    const foot = new THREE.Mesh(new THREE.SphereGeometry(tubeR * 1.5, 24, 18), metalMat);
    foot.position.set(0, lowest - stemLen + tubeR, 0);
    forkGroup.add(foot);

    // Centre the whole fork vertically in view.
    forkGroup.position.y = -0.1;
    metalMat.transparent = true;       // so the procedural fork can fade out too
    forkMaterials.push(metalMat);
  }

  // Waves live in their OWN group in world space (NOT parented to the fork), so
  // they read as clean concentric ripples facing the viewer instead of tilted
  // discs that spin with the metal. Each frame we re-anchor them to the current
  // prong-tip world positions (which move as the fork rotates / descends).
  const waveGroup = new THREE.Group();
  scene.add(waveGroup);

  // ---- Atmosphere groups: enveloping background waves + floating motes -------
  const ambientGroup = new THREE.Group();
  scene.add(ambientGroup);
  let ambientRibbons = [];
  let motes = null; // { points, velocities, basePositions }

  // Build ONE wavy closed ribbon (unit radius 1) — a circle whose radius undulates
  // (lobes) plus an out-of-plane wobble, swept as a TUBE so it has real
  // thickness/volume. `v` carries per-ribbon variation so no two waves are alike
  // (less monotonous), and broad low-lobe swells keep them soft (less "aiguë").
  function makeWaveRibbonGeo(v) {
    const segments = 260;
    const pts = [];
    const phase2 = v.lobePhase;            // rotates the swell pattern per ribbon
    for (let s = 0; s < segments; s++) {
      const th = (s / segments) * Math.PI * 2;
      // two superimposed low frequencies → organic, rolling, non-repetitive crest
      const swell = Math.sin(v.lobes * th + phase2) * 0.7
                  + Math.sin((v.lobes + 1) * th * 0.5 - phase2) * 0.3;
      const r = 1 + v.wobble * swell;
      pts.push(new THREE.Vector3(
        Math.cos(th) * r * v.ecc,          // slight eccentricity → not a perfect circle
        Math.sin(th) * r,
        v.depth * Math.sin(v.lobes * th * 0.5 + phase2),
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);     // closed loop
    return new THREE.TubeGeometry(curve, segments, v.tubeRadius, 16, true);
  }

  function setupWaves() {
    const count = isMobile ? CFG.waves.mobileCount : CFG.waves.desktopCount;
    const rings = [];
    const cWarm = new THREE.Color(CFG.colors.waveGlow); // luminous amber (inner)
    const cGold = new THREE.Color(CFG.colors.wave);     // soft gold (outer)
    const W = CFG.waves;

    PRONG_TIPS.forEach((tipLocal, tipIndex) => {
      for (let i = 0; i < count; i++) {
        const k = count > 1 ? i / (count - 1) : 0;
        // ---- per-ribbon variation (deterministic, index-driven) -------------
        const seed = i + tipIndex * 0.5;
        const v = {
          lobes:     W.lobes + (i % 3),                       // 3,4,5… → varied shape
          wobble:    W.wobble * (0.75 + 0.5 * ((seed * 1.7) % 1)),
          depth:     W.depth  * (0.7 + 0.6 * ((seed * 2.3) % 1)),
          tubeRadius:W.tubeRadius * (0.8 + 0.5 * k),          // outer waves a touch thicker
          ecc:       1 + 0.12 * Math.sin(seed * 2.1),         // gentle oval
          lobePhase: seed * 1.3,
        };
        const reach = 0.6 + 0.5 * ((i * 0.61) % 1);           // each wave travels a different distance
        const col = cWarm.clone().lerp(cGold, k);

        // MeshStandardMaterial (not Basic) → the ribbon is SHADED by the studio
        // light + a warm self-glow, so it has dimension and warmth, not flat neon.
        const mat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col.clone().multiplyScalar(0.55),
          emissiveIntensity: 0.9,
          metalness: 0.15,
          roughness: 0.45,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          envMapIntensity: 0.6,
        });
        const ring = new THREE.Mesh(makeWaveRibbonGeo(v), mat);
        ring.userData = {
          phase: i / count,                                   // stagger emission
          spin: seed * Math.PI,                               // different start angle
          flow: W.flowSpeed * (0.7 + 0.6 * k) * (i % 2 ? -1 : 1), // varied speed + direction
          reach,                                              // varied max radius
          periodMul: 0.85 + 0.4 * ((seed * 1.9) % 1),         // varied timing → less monotone
          tipLocal,
          worldTip: new THREE.Vector3(),
        };
        waveGroup.add(ring);
        rings.push(ring);
      }
    });
    return rings;
  }

  // Large, slow, faint ribbons drifting at several depths AROUND the fork — the
  // visitor feels inside a field of resonance rather than looking at it. They use
  // the same warm material/geometry so the look stays on the line you liked.
  function setupAmbientWaves() {
    const A = CFG.ambient;
    const count = isMobile ? A.mobileCount : A.desktopCount;
    const cWarm = new THREE.Color(CFG.colors.waveGlow);
    const cGold = new THREE.Color(CFG.colors.wave);
    const ribbons = [];

    for (let i = 0; i < count; i++) {
      const seed = i * 0.73 + 0.11;
      const k = i / Math.max(1, count - 1);
      const v = {
        lobes:      CFG.waves.lobes + (i % 3),
        wobble:     CFG.waves.wobble * (1.0 + 0.6 * ((seed * 1.7) % 1)),
        depth:      CFG.waves.depth * (1.2 + 0.8 * ((seed * 2.3) % 1)),
        tubeRadius: CFG.waves.tubeRadius * (0.5 + 0.4 * k), // thin relative to their size
        ecc:        1 + 0.2 * Math.sin(seed * 3.1),
        lobePhase:  seed * 2.2,
      };
      const col = cWarm.clone().lerp(cGold, k);
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col.clone().multiplyScalar(0.5),
        emissiveIntensity: 0.8,
        metalness: 0.1,
        roughness: 0.6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        envMapIntensity: 0.5,
      });
      const ribbon = new THREE.Mesh(makeWaveRibbonGeo(v), mat);
      const scale = A.minScale + (A.maxScale - A.minScale) * ((seed * 1.3) % 1);
      // Spread through depth (mostly behind the fork) and around it.
      ribbon.position.set(
        (((seed * 5.1) % 1) - 0.5) * 7,
        (((seed * 3.7) % 1) - 0.5) * 5,
        -2 - ((seed * 6.3) % 1) * 9,        // -2 … -11 → depth
      );
      ribbon.rotation.set(seed * 1.1, seed * 2.0, seed * 0.7);
      ribbon.userData = {
        baseScale: scale,
        baseOpacity: A.opacity * (0.6 + 0.8 * ((seed * 2.9) % 1)),
        rotAxis: new THREE.Vector3(Math.sin(seed), Math.cos(seed * 1.7), 0.4).normalize(),
        rotSpeed: A.driftSpeed * (i % 2 ? -1 : 1) * (0.7 + 0.6 * k),
        bobAmp: 0.3 + 0.5 * ((seed * 4.2) % 1),
        bobPhase: seed * 6.28,
        baseY: ribbon.position.y,
      };
      ribbon.scale.setScalar(scale);
      ambientGroup.add(ribbon);
      ribbons.push(ribbon);
    }
    return ribbons;
  }

  // Floating light motes — soft drifting particles (incense / spa light) that add
  // depth and atmosphere. A round soft sprite keeps them tasteful, not "stars".
  function makeMoteSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,240,210,0.9)');
    grad.addColorStop(1, 'rgba(255,225,180,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function setupMotes() {
    const M = CFG.motes;
    const n = isMobile ? M.mobileCount : M.desktopCount;
    const positions = new Float32Array(n * 3);
    const velocities = new Float32Array(n); // per-mote rise speed
    const sway = new Float32Array(n);       // per-mote horizontal sway phase
    const half = M.area / 2;
    for (let i = 0; i < n; i++) {
      positions[i * 3]     = (Math.sin(i * 12.9898) * 43758.5 % 1) * M.area - half;
      positions[i * 3 + 1] = (Math.sin(i * 78.233) * 43758.5 % 1) * M.area - half;
      positions[i * 3 + 2] = (Math.sin(i * 37.719) * 43758.5 % 1) * (M.area * 0.7) - half * 0.7;
      velocities[i] = M.riseSpeed * (0.5 + (Math.sin(i * 4.17) * 0.5 + 0.5));
      sway[i] = i * 0.37;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: M.size,
      map: makeMoteSprite(),
      color: new THREE.Color(CFG.colors.waveGlow),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    const points = new THREE.Points(geo, mat);
    points.position.z = 1; // sit slightly in front, drifting through the scene
    scene.add(points);
    return { points, velocities, sway, half, area: M.area, targetOpacity: M.opacity };
  }

  let waveRings = [];

  function afterForkReady() {
    // Hide the loader FIRST so nothing downstream can freeze the hero on it.
    loaderEl.classList.add('is-hidden');
    document.querySelector('.udara-resonance').classList.add('is-ready');
    try {
      waveRings = setupWaves();
      ambientRibbons = setupAmbientWaves();
      motes = setupMotes();
    } catch (err) {
      console.error('[udara] wave/atmosphere setup failed:', err);
    }
    // The fork settles in from a soft scale. (Canvas opacity is owned by the
    // render loop's handoff logic, so we don't tween it here.)
    if (window.gsap && !reduceMotion) {
      gsap.fromTo(forkPivot.scale, { x: 0.86, y: 0.86, z: 0.86 },
        { x: 1, y: 1, z: 1, duration: 1.6, ease: 'power3.out' });
    }
  }

  // Try the real model; fall back to procedural on any failure.
  if (CFG.model.glbPath) {
    const gltfLoader = new GLTFLoader();
    let settled = false;
    const goProcedural = () => {
      if (settled) return;
      settled = true;
      // tip positions are unknown for an arbitrary glb, so approximate from bbox below
      buildProceduralForkOrAdoptGLB(null);
    };
    gltfLoader.load(
      CFG.model.glbPath,
      (gltf) => {
        if (settled) return;
        settled = true;
        buildProceduralForkOrAdoptGLB(gltf);
      },
      undefined,
      () => { if (CFG.model.useProceduralFallback) goProcedural(); }
    );
    // Safety timeout: if the network stalls, don't hang the loader forever.
    setTimeout(() => { if (CFG.model.useProceduralFallback) goProcedural(); }, 6000);
  } else {
    buildProceduralFork();
    afterForkReady();
  }

  function buildProceduralForkOrAdoptGLB(gltf) {
    if (gltf && gltf.scene) {
      const model = gltf.scene;
      model.traverse((o) => {
        if (o.isMesh) {
          const m = o.material;
          // A fully-metallic surface gets its brightness almost entirely from the
          // ENVIRONMENT (lights only add tiny specular dots). So we push the env
          // map hard here — this is what turns the dark grey into bright aluminium.
          m.envMapIntensity = CFG.model.envMapIntensity;
          // three.js MULTIPLIES the scalar by the map. With a roughnessMap present
          // the scalar still scales it, so we use it to SHARPEN reflections (a value
          // below 1 lowers roughness → crisper, brighter, more premium metal).
          if (m.roughness !== undefined) m.roughness = m.roughnessMap ? CFG.model.roughnessScale : CFG.model.roughness;
          if (m.metalness !== undefined) m.metalness = m.metalnessMap ? 1.0 : CFG.model.metalness;
          // aoMap needs a 2nd UV set; reuse uv if the exporter only wrote one.
          if (m.aoMap && o.geometry && o.geometry.attributes.uv && !o.geometry.attributes.uv2) {
            o.geometry.setAttribute('uv2', o.geometry.attributes.uv);
          }
          m.transparent = true;        // so the fork can fade out at the hero's end
          forkMaterials.push(m);
          m.needsUpdate = true;
        }
      });
      // Fit & centre the model to a known size.
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3(); box.getSize(size);
      const center = new THREE.Vector3(); box.getCenter(center);
      const scale = 4.7 / (size.y || 1);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      forkGroup.add(model);

      // Derive prong tips from the top corners of the fitted bbox.
      const fitted = new THREE.Box3().setFromObject(model);
      const top = fitted.max.y;
      PRONG_TIPS.push(new THREE.Vector3(fitted.min.x * 0.55, top, 0));
      PRONG_TIPS.push(new THREE.Vector3(fitted.max.x * 0.55, top, 0));
    } else {
      buildProceduralFork();
    }
    afterForkReady();
  }

  /* ---- Web Audio: generated 432 Hz tuning-fork strike -------------------- */
  let audioCtx = null;
  let muted = CFG.sound.startMuted;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playStrike() {
    if (muted || reduceMotion) return;
    ensureAudio();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(CFG.sound.frequency, now);
    // soft attack, long gentle decay
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(CFG.sound.peakGain, now + CFG.sound.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + CFG.sound.decay);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + CFG.sound.decay + 0.1);
  }

  let pulse = 0; // reactive wave-energy injected by strikes / scroll
  function triggerPulse(amount) {
    pulse = Math.min(pulse + amount, 1.4);
  }

  strikeBtn.addEventListener('click', () => {
    muted = !muted;
    strikeBtn.setAttribute('aria-pressed', String(!muted));
    strikeLabel.textContent = muted ? 'Strike · muted' : 'Strike · 432 Hz';
    ensureAudio();             // user gesture unlocks audio
    if (!muted) {
      playStrike();            // ring out immediately on unmute
      triggerPulse(CFG.waves.pulseBoost); // and physically "strike" the fork
    }
  });

  /* ---- Standalone single-screen demo ------------------------------------- */
  // No scroll handoff here: the fork fills the viewport and simply idle-spins,
  // floats, and breathes its resonance waves. `scrollProgress` stays 0 so the
  // render loop's scroll-driven rotation / rise / submersion / fade are inert.
  const scrollProgress = 0;

  /* ---- Render loop (pausable) -------------------------------------------- */
  const clock = new THREE.Clock();
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  let running = true;
  let raf = null;

  function animate() {
    if (!running) return;
    raf = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    // Scroll metrics — read raw scrollY so motion can continue smoothly PAST the
    // pin (scrollProgress clamps at 1, which is what made the spin look "stopped").
    const vh = window.innerHeight;
    const heroPx = heroEl.offsetHeight;
    const y = window.scrollY || window.pageYOffset || 0;
    const pinDist = Math.max(1, heroPx - vh);

    // Rotation = an always-on idle spin (time-based, never stops) + a continuous
    // scroll-driven spin tied to raw scrollY. Because it's not clamped, the fork
    // keeps turning right through the end of the pin and its exit — you never see
    // it stop, whether you keep scrolling or pause.
    const idleSpin = reduceMotion ? 0 : CFG.motion.idleSpinSpeed * t;
    const scrollSpin = (y / pinDist) * Math.PI * 2 * CFG.motion.scrollTurns;
    forkGroup.rotation.y = idleSpin + scrollSpin;

    // Vertical: smoothstep rise during the pin, then a continuous climb past it.
    const sp = scrollProgress;
    const riseEase = sp * sp * (3 - 2 * sp);                      // smoothstep — gentle, even
    const rise = riseEase * CFG.motion.scrollRise;
    const bob = reduceMotion ? 0 : Math.sin(t * CFG.motion.bobSpeed) * CFG.motion.bobAmplitude;
    const exitStart = heroPx - vh;             // ~ where the hero pin releases
    const exitEnd   = heroPx + vh * 0.5;       // fork fully gone ~0.5 screen into the text
    const exitRaw   = clamp01((y - exitStart) / (exitEnd - exitStart));
    const exitProg  = exitRaw * exitRaw * (3 - 2 * exitRaw); // smoothstep

    // The lean lives on forkPivot (set once); scroll raises it straight up, then
    // the exit keeps lifting it beyond the pin.
    forkPivot.position.y = -0.7 + bob + rise + exitProg * CFG.motion.exitRise;
    forkGroup.updateWorldMatrix(true, false);

    // Resonance waves: slow concentric ripples from each prong tip, always facing
    // the camera. Permanent gentle breathing + reactive pulse on strike / scroll.
    pulse *= 0.95;
    const base = reduceMotion ? 0.0 : 1.0;
    // Submersion now GROWS to its maximum at the very end of the hero (it no longer
    // retracts). The waves swell & brighten until they engulf the view — and that
    // peak is what carries you into the next section. Full by ~92% so it's at its
    // fullest while still visible, just before the canvas dissolves to the text.
    const subRaw = Math.min(scrollProgress / 0.92, 1);
    const submerge = subRaw * subRaw * (3 - 2 * subRaw); // smoothstep → reaches 1 at the end
    const swell = 1 + submerge * 1.4;                    // pushed: the waves really fill the frame
    // Camera dolly-in toward the end → the "zoom" into the submersion (pushed a touch).
    camera.position.z = CAM_BASE_Z - submerge * CFG.motion.scrollZoom;
    waveRings.forEach((ring) => {
      const u = ring.userData;
      // Re-anchor to the live world position of this prong tip.
      u.worldTip.copy(u.tipLocal).applyMatrix4(forkGroup.matrixWorld);
      ring.position.copy(u.worldTip);
      ring.quaternion.copy(camera.quaternion);     // face the viewer…
      ring.rotateZ(u.spin + t * u.flow);           // …then drift the swells → flow (varied)

      // p: 0 at the tip, 1 when fully expanded & faded — each wave on its own clock.
      const p = ((t / (CFG.waves.period * u.periodMul)) + u.phase) % 1;
      const eased = 1 - Math.pow(1 - p, 2);         // ease-out expansion (natural ripple)
      const radius = (CFG.waves.startRadius + eased * CFG.waves.maxRadius * u.reach) * swell;
      ring.scale.set(radius, radius, radius);

      // Smooth bell-shaped fade: in over the first 15%, out toward the edge.
      const fadeIn  = Math.min(p / 0.15, 1);
      const fadeOut = 1 - p;
      const env = fadeIn * fadeOut * fadeOut;       // soft, no hard edges
      ring.material.opacity = Math.min(0.98, env * (CFG.waves.baseOpacity * base + submerge * 0.5 + pulse * 0.6));
    });
    // Waves stay rendered past the hero; the whole canvas opacity (lingerFade
    // below) is what slowly thins them out over the start of the text.
    waveGroup.visible = true;

    // ---- Ambient enveloping ribbons: slow drift + scroll-driven submersion ----
    if (!reduceMotion) {
      const grow = 1 + submerge * (CFG.ambient.submergeGain - 1);
      ambientRibbons.forEach((r) => {
        const a = r.userData;
        r.rotateOnAxis(a.rotAxis, a.rotSpeed * dt * 60 * 0.016);
        r.position.y = a.baseY + Math.sin(t * 0.2 + a.bobPhase) * a.bobAmp;
        const s = a.baseScale * grow;
        r.scale.setScalar(s);
        r.material.opacity = a.baseOpacity * (0.5 + submerge * 1.6) * base;
      });
      ambientGroup.visible = true;
    }

    // ---- Floating motes: gentle rise + sway, recycle at the top ---------------
    if (motes) {
      const pos = motes.points.geometry.attributes.position;
      const arr = pos.array;
      const half = motes.half;
      for (let i = 0; i < motes.velocities.length; i++) {
        const iy = i * 3 + 1;
        arr[iy] += motes.velocities[i] * dt;                       // rise
        arr[i * 3] += Math.sin(t * 0.4 + motes.sway[i]) * 0.0015;  // sway
        if (arr[iy] > half) { arr[iy] = -half; }                   // recycle
      }
      pos.needsUpdate = true;
      // motes brighten slightly with submersion; the canvas opacity fade handles
      // their disappearance during the handoff.
      const targ = motes.targetOpacity * (0.7 + submerge * 0.6) * base;
      motes.points.material.opacity += (targ - motes.points.material.opacity) * 0.05;
    }

    // ---- Hero → text handoff (vh / heroPx / y / exitProg computed above) ------
    // 1) The fork fades AS IT RISES: it stays opaque for the first part of its
    //    exit (so it visibly overlaps the arriving text), then fades to nothing
    //    while continuing upward — gradual, never a teleport.
    const fadeP = clamp01((exitProg - 0.18) / 0.82);
    const forkOpacity = 1 - fadeP * fadeP * (3 - 2 * fadeP);
    for (let i = 0; i < forkMaterials.length; i++) forkMaterials[i].opacity = forkOpacity;
    ground_ref.material.opacity = 0.22 * forkOpacity;
    // 2) The wave field lingers a touch longer and thins out SLOWLY over ~0.8 of a
    //    screen, drifting over the first text before melting away.
    const lingerStart = heroPx * 0.88;
    const lingerEnd   = heroPx + vh * 0.8;
    const lingerFade  = clamp01((y - lingerStart) / (lingerEnd - lingerStart));
    canvas.style.opacity = String(1 - lingerFade);

    renderer.render(scene, camera);
  }

  function start() { if (!running) { running = true; clock.start(); animate(); } }
  function stop()  { running = false; if (raf) cancelAnimationFrame(raf); }

  // Pause the render loop for battery/perf whenever the hero is off-screen.
  const io = new IntersectionObserver((entries) => {
    entries[0].isIntersecting ? start() : stop();
  }, { threshold: 0.01 });
  io.observe(heroEl);

  /* ---- Resize ------------------------------------------------------------ */
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  animate();
}
