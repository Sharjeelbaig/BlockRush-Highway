import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const LANES = [-2.55, 0, 2.55];
const PLAYER_Z = 3.2;
const ROAD_RESET_Z = 18;
const FAR_RESET_AMOUNT = 116;
const START_SPEED = 0.18;
const MAX_SPEED = 0.52;
const SPEED_KMH_MIN = 68;
const SPEED_KMH_MAX = 224;
// ── PERF: raised budget tolerance so quality doesn't drop aggressively ──
const TARGET_FRAME_MS = 22;
const CAMERA_BASE_Y = 3.85;
const CAMERA_BASE_Z = 12.95;
const CAMERA_MOBILE_Z_BONUS = 3.15;
const WEATHER_HOLD_SECONDS = 35;
const WEATHER_TRANSITION_SECONDS = 8;
const WEATHER_SEQUENCE = ["clear_noon", "sunny_golden_hour", "rain_dusk", "thunder_night", "snow_dawn"];
const WEATHER_PRESETS = {
  clear_noon: {
    skyTop: new THREE.Color(0x3b9fe0),
    skyHorizon: new THREE.Color(0x94c9df),
    skyHaze: new THREE.Color(0x8bb8ca),
    fogColor: new THREE.Color(0x8ab8c8),
    fogNear: 92,
    fogFar: 215,
    sunColor: new THREE.Color(0xffe0a7),
    sunIntensity: 2.35,
    sunPosition: new THREE.Vector3(-15, 22, 13),
    sunDirection: new THREE.Vector3(-0.5, 0.72, 0.22).normalize(),
    ambientIntensity: 0.24,
    hemiIntensity: 0.68,
    fillIntensity: 0.22,
    rimIntensity: 0.42,
    bloomStrength: 0.055,
    bloomThreshold: 1.16,
    exposure: 0.82,
    saturation: 1.08,
    contrast: 1.12,
    gradeTint: new THREE.Color(0xf2fbff),
    roadWetness: 0,
    snowCover: 0,
    rainAmount: 0,
    snowAmount: 0,
    thunderAmount: 0,
    particleType: "none",
    cloudOpacity: 0.34,
    lampIntensity: 0.12,
    lampGlowOpacity: 0.012,
    headlightBoost: 0.08,
  },
  sunny_golden_hour: {
    skyTop: new THREE.Color(0x3e95d2),
    skyHorizon: new THREE.Color(0xdf9f68),
    skyHaze: new THREE.Color(0xc9956f),
    fogColor: new THREE.Color(0xc89368),
    fogNear: 72,
    fogFar: 190,
    sunColor: new THREE.Color(0xffb55e),
    sunIntensity: 2.6,
    sunPosition: new THREE.Vector3(-24, 12, -24),
    sunDirection: new THREE.Vector3(-0.74, 0.36, -0.34).normalize(),
    ambientIntensity: 0.19,
    hemiIntensity: 0.56,
    fillIntensity: 0.16,
    rimIntensity: 0.58,
    bloomStrength: 0.075,
    bloomThreshold: 1.08,
    exposure: 0.86,
    saturation: 1.14,
    contrast: 1.15,
    gradeTint: new THREE.Color(0xffead0),
    roadWetness: 0,
    snowCover: 0,
    rainAmount: 0,
    snowAmount: 0,
    thunderAmount: 0,
    particleType: "none",
    cloudOpacity: 0.28,
    lampIntensity: 0.14,
    lampGlowOpacity: 0.018,
    headlightBoost: 0.1,
  },
  rain_dusk: {
    skyTop: new THREE.Color(0x30445f),
    skyHorizon: new THREE.Color(0xb07b66),
    skyHaze: new THREE.Color(0x7895a8),
    fogColor: new THREE.Color(0x758899),
    fogNear: 24,
    fogFar: 104,
    sunColor: new THREE.Color(0xff9868),
    sunIntensity: 1.35,
    sunPosition: new THREE.Vector3(-18, 7.5, -28),
    sunDirection: new THREE.Vector3(-0.62, 0.22, -0.42).normalize(),
    ambientIntensity: 0.18,
    hemiIntensity: 0.5,
    fillIntensity: 0.14,
    rimIntensity: 0.76,
    bloomStrength: 0.3,
    bloomThreshold: 0.82,
    exposure: 0.78,
    saturation: 0.96,
    contrast: 1.13,
    gradeTint: new THREE.Color(0xdce9ff),
    roadWetness: 0.82,
    snowCover: 0,
    rainAmount: 1,
    snowAmount: 0,
    thunderAmount: 0.08,
    particleType: "rain",
    cloudOpacity: 0.82,
    lampIntensity: 1.35,
    lampGlowOpacity: 0.1,
    headlightBoost: 0.56,
  },
  thunder_night: {
    skyTop: new THREE.Color(0x071022),
    skyHorizon: new THREE.Color(0x152940),
    skyHaze: new THREE.Color(0x3d5270),
    fogColor: new THREE.Color(0x425165),
    fogNear: 13,
    fogFar: 76,
    sunColor: new THREE.Color(0x83b3ff),
    sunIntensity: 0.3,
    sunPosition: new THREE.Vector3(10, 10, -36),
    sunDirection: new THREE.Vector3(0.16, 0.24, -0.76).normalize(),
    ambientIntensity: 0.075,
    hemiIntensity: 0.18,
    fillIntensity: 0.06,
    rimIntensity: 1.05,
    bloomStrength: 0.48,
    bloomThreshold: 0.72,
    exposure: 0.64,
    saturation: 0.82,
    contrast: 1.22,
    gradeTint: new THREE.Color(0xc7dcff),
    roadWetness: 1,
    snowCover: 0,
    rainAmount: 0.95,
    snowAmount: 0,
    thunderAmount: 1,
    particleType: "rain",
    cloudOpacity: 0.9,
    lampIntensity: 2.35,
    lampGlowOpacity: 0.2,
    headlightBoost: 0.98,
  },
  snow_dawn: {
    skyTop: new THREE.Color(0x9fc8e4),
    skyHorizon: new THREE.Color(0xffd6bd),
    skyHaze: new THREE.Color(0xb9cbd5),
    fogColor: new THREE.Color(0xaec0ca),
    fogNear: 42,
    fogFar: 145,
    sunColor: new THREE.Color(0xffc2a2),
    sunIntensity: 1.55,
    sunPosition: new THREE.Vector3(-10, 9, -18),
    sunDirection: new THREE.Vector3(-0.34, 0.32, -0.52).normalize(),
    ambientIntensity: 0.42,
    hemiIntensity: 0.78,
    fillIntensity: 0.28,
    rimIntensity: 0.66,
    bloomStrength: 0.14,
    bloomThreshold: 0.94,
    exposure: 0.82,
    saturation: 0.86,
    contrast: 1.06,
    gradeTint: new THREE.Color(0xebf6ff),
    roadWetness: 0.16,
    snowCover: 0.72,
    rainAmount: 0,
    snowAmount: 1,
    thunderAmount: 0,
    particleType: "snow",
    cloudOpacity: 0.58,
    lampIntensity: 0.46,
    lampGlowOpacity: 0.055,
    headlightBoost: 0.22,
  },
};

// ── FIX: uGrain set to 0 → grain overlay completely removed ──────────────
// ── PERF: chromatic aberration & vignette kept but grain is zeroed out ──
const CINEMATIC_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uSpeed: { value: 0 },
    uGrain: { value: 0 },          // ← was 0.028 — now 0 (no grain)
    uVignette: { value: 1.18 },
    uChromatic: { value: 0.0016 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uSaturation: { value: 1.12 },
    uContrast: { value: 1.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // ── PERF: hash21 + grain lines removed from fragment shader entirely ──
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uVignette;
    uniform float uChromatic;
    uniform vec3 uTint;
    uniform float uSaturation;
    uniform float uContrast;
    varying vec2 vUv;

    vec3 cinematicGrade(vec3 color) {
      color = max(color, vec3(0.0));
      color = pow(color, vec3(0.93));
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);
      color = (color - 0.5) * uContrast + 0.5;
      color *= uTint;
      color += vec3(0.012, 0.006, 0.008);
      return max(color, vec3(0.0));
    }

    void main() {
      vec2 fromCenter = vUv - 0.5;
      vec2 chromaOffset = fromCenter * uChromatic * (1.0 + uSpeed * 1.45);

      float red   = texture2D(tDiffuse, vUv + chromaOffset).r;
      float green = texture2D(tDiffuse, vUv).g;
      float blue  = texture2D(tDiffuse, vUv - chromaOffset).b;
      vec3 color = cinematicGrade(vec3(red, green, blue));

      float vignette = smoothstep(0.22, 0.78, length(fromCenter) * uVignette);
      color *= mix(1.06, 0.66, vignette);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function lerp(start, end, progress) {
  return start + (end - start) * progress;
}
function easeInOutCubic(value) {
  const t = clamp(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function speedToKmh(speed) {
  const speedProgress = (speed - START_SPEED) / (MAX_SPEED - START_SPEED);
  return Math.round(SPEED_KMH_MIN + clamp(speedProgress, 0, 1) * (SPEED_KMH_MAX - SPEED_KMH_MIN));
}

export default function ThreeCarGame() {
  const mountRef = useRef(null);
  const swipeStartXRef = useRef(null);
  const gameRef = useRef({
    started: false,
    gameOver: false,
    score: 0,
    speed: START_SPEED,
    lane: 1,
    targetX: 0,
    obstacles: [],
    animatedRoadItems: [],
    wheelGroups: [],
    weatherState: null,
    animationId: null,
    resetGame: null,
    moveLane: null,
    lastUiScore: -1,
    lastUiSpeed: -1,
  });

  const [score, setScore] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(speedToKmh(START_SPEED));
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [crashFlash, setCrashFlash] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const state = gameRef.current;
    state.animatedRoadItems = [];
    state.obstacles = [];
    state.wheelGroups = [];
    state.weatherState = {
      elapsed: 0,
      fromPreset: WEATHER_SEQUENCE[0],
      toPreset: WEATHER_SEQUENCE[1],
      transitionProgress: 0,
      lightningCooldown: 5.5,
      lightningFlash: 0,
      lightningX: 0,
    };

    let lastFrameTime = performance.now();
    let renderQuality = 1;
    let frameBudgetTotal = 0;
    let frameBudgetSamples = 0;
    let lastQualityChange = performance.now();

    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    const hardwareThreads = navigator.hardwareConcurrency || 8;
    const deviceMemory = navigator.deviceMemory || 8;
    // ── PERF: broader low-power detection threshold ──
    const isLowPowerDevice = isTouchDevice || hardwareThreads <= 6 || deviceMemory <= 4;
    const enablePostProcessing = true;
    const minRenderQuality = isLowPowerDevice ? 0.65 : 0.75;
    // ── PERF: lower pixel ratio ceiling reduces fill-rate pressure ──
    const maxPixelRatio = isLowPowerDevice ? 1.0 : 1.25;

    const scene = new THREE.Scene();
    scene.background = WEATHER_PRESETS.clear_noon.skyTop.clone();
    scene.fog = new THREE.Fog(
      WEATHER_PRESETS.clear_noon.fogColor.getHex(),
      WEATHER_PRESETS.clear_noon.fogNear,
      WEATHER_PRESETS.clear_noon.fogFar
    );

    const camera = new THREE.PerspectiveCamera(
      58,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, CAMERA_BASE_Y, CAMERA_BASE_Z + (mount.clientWidth < 700 ? CAMERA_MOBILE_Z_BONUS : 0));
    camera.lookAt(0, 0.72, 1.62);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isLowPowerDevice,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    // ── PERF: shadows disabled — saves a full shadow-map draw call per frame ──
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environmentTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environmentTexture;
    // ── PERF: smaller cube-map target on all devices ──
    const cubeReflectionTarget = new THREE.WebGLCubeRenderTarget(isLowPowerDevice ? 32 : 64, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const playerReflectionCamera = new THREE.CubeCamera(0.25, 90, cubeReflectionTarget);
    scene.add(playerReflectionCamera);

    let composer = null;
    const renderSize = new THREE.Vector2();
    function applyRenderSize() {
      if (!mount) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio * renderQuality);
      renderSize.set(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(renderSize.x, renderSize.y, false);
      if (composer) {
        composer.setPixelRatio(pixelRatio);
        composer.setSize(renderSize.x, renderSize.y);
      }
    }

    applyRenderSize();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xc9ecff, 0x344f30, 0.84);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xffedbf, 2.55);
    sun.position.set(-15, 22, 13);
    // ── PERF: shadows off — matches renderer.shadowMap.enabled = false ──
    sun.castShadow = false;
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x91d7ff, 0.28);
    fillLight.position.set(8, 6, 12);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xeef8ff, 0.58);
    rimLight.position.set(0, 4, -12);
    scene.add(rimLight);

    const lightningLight = new THREE.PointLight(0xcfe6ff, 0, 95, 1.8);
    lightningLight.position.set(0, 18, -42);
    scene.add(lightningLight);

    const world = new THREE.Group();
    scene.add(world);

    const shaderUniforms = {
      time: { value: 0 },
      speed: { value: 0 },
      roadWetness: { value: 0 },
      snowCover: { value: 0 },
      skySunDirection: { value: new THREE.Vector3(-0.5, 0.72, 0.22).normalize() },
    };

    const materials = {
      sky: new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: shaderUniforms.time,
          uSunDirection: shaderUniforms.skySunDirection,
          uZenith: { value: new THREE.Color(0x5fb4ff) },
          uHorizon: { value: new THREE.Color(0xc6ebff) },
          uHaze: { value: new THREE.Color(0xeef8ff) },
          uSunColor: { value: new THREE.Color(0xffc966) },
          uLightning: { value: 0 },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uSunDirection;
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform vec3 uHaze;
          uniform vec3 uSunColor;
          uniform float uLightning;
          varying vec3 vWorldPosition;

          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 345.45));
            p += dot(p, p + 34.345);
            return fract(p.x * p.y);
          }

          void main() {
            vec3 direction = normalize(vWorldPosition - cameraPosition);
            float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 color = mix(uHorizon, uZenith, pow(height, 0.74));

            float sunDisk = pow(max(dot(direction, normalize(uSunDirection)), 0.0), 420.0);
            float sunGlow = pow(max(dot(direction, normalize(uSunDirection)), 0.0), 12.0);
            float horizonHaze = pow(1.0 - height, 4.4);
            float cloudNoise = hash21(direction.xz * 55.0 + uTime * 0.01) * 0.006;

            color = mix(color, uHaze, horizonHaze * 0.16);
            color += uSunColor * (sunDisk * 1.55 + sunGlow * 0.12);
            color += vec3(0.32, 0.44, 0.64) * uLightning * (0.32 + horizonHaze * 0.55);
            color += cloudNoise;

            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
      ground: new THREE.MeshStandardMaterial({ color: 0x4ea85a, roughness: 1 }),
      grassDark: new THREE.MeshStandardMaterial({ color: 0x3f8f49, roughness: 1 }),
      grassLight: new THREE.MeshStandardMaterial({ color: 0x72b75d, roughness: 1 }),
      field: new THREE.MeshStandardMaterial({ color: 0x8fb85b, roughness: 1 }),
      crop: new THREE.MeshStandardMaterial({ color: 0xd0b85a, roughness: 0.96 }),
      road: new THREE.MeshStandardMaterial({ color: 0x232a32, roughness: 0.82, metalness: 0.04, envMapIntensity: 0.9 }),
      roadPatch: new THREE.MeshStandardMaterial({ color: 0x303841, roughness: 0.86, metalness: 0.03, envMapIntensity: 1.05 }),
      puddle: new THREE.MeshPhysicalMaterial({
        color: 0x7da2b8,
        roughness: 0.03,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        envMapIntensity: 2.2,
      }),
      tireMark: new THREE.MeshBasicMaterial({ color: 0x0e1116, transparent: true, opacity: 0.22, depthWrite: false }),
      shoulder: new THREE.MeshStandardMaterial({ color: 0x4e5459, roughness: 0.95 }),
      shoulderLight: new THREE.MeshStandardMaterial({ color: 0x687075, roughness: 0.96 }),
      laneLine: new THREE.MeshBasicMaterial({ color: 0xd7d8d1 }),
      edgeLine: new THREE.MeshBasicMaterial({ color: 0xd5ad4e }),
      rumbleRed: new THREE.MeshStandardMaterial({ color: 0xc83f3f, roughness: 0.9 }),
      rumbleWhite: new THREE.MeshStandardMaterial({ color: 0xbfc2bc, roughness: 0.85 }),
      barrier: new THREE.MeshStandardMaterial({ color: 0x9fa7aa, roughness: 0.86 }),
      barrierTop: new THREE.MeshStandardMaterial({ color: 0x69747b, roughness: 0.74, metalness: 0.08 }),
      reflector: new THREE.MeshStandardMaterial({ color: 0xd2a85a, emissive: 0xff8f1c, emissiveIntensity: 0.08, roughness: 0.42 }),
      sidewalk: new THREE.MeshStandardMaterial({ color: 0xa9a49b, roughness: 0.82 }),
      curb: new THREE.MeshStandardMaterial({ color: 0xc2beb5, roughness: 0.78 }),
      cityWall: new THREE.MeshStandardMaterial({ color: 0xa89583, roughness: 0.86 }),
      cityWallCool: new THREE.MeshStandardMaterial({ color: 0x7f8a95, roughness: 0.82 }),
      cityDarkWall: new THREE.MeshStandardMaterial({ color: 0x5e6770, roughness: 0.78 }),
      cityWindow: new THREE.MeshStandardMaterial({ color: 0x25394a, emissive: 0x142331, emissiveIntensity: 0.04, roughness: 0.2, metalness: 0.18 }),
      planter: new THREE.MeshStandardMaterial({ color: 0x8a7b66, roughness: 0.88 }),
      signPost: new THREE.MeshStandardMaterial({ color: 0x8a949b, roughness: 0.45, metalness: 0.45 }),
      signBoard: new THREE.MeshStandardMaterial({ color: 0x1d7a5d, roughness: 0.65 }),
      signBack: new THREE.MeshStandardMaterial({ color: 0x28343f, roughness: 0.7 }),
      lampPost: new THREE.MeshStandardMaterial({ color: 0x5d6872, roughness: 0.5, metalness: 0.35 }),
      lampHead: new THREE.MeshStandardMaterial({ color: 0xffe8a3, emissive: 0xffc857, emissiveIntensity: 0.9, roughness: 0.22 }),
      lampGlow: new THREE.MeshBasicMaterial({
        color: 0xe5a84f,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      mountain: new THREE.MeshStandardMaterial({ color: 0x74879a, roughness: 1 }),
      mountainSnow: new THREE.MeshStandardMaterial({ color: 0xbfcbd0, roughness: 0.88 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 1 }),
      leaves: new THREE.MeshStandardMaterial({ color: 0x237a3b, roughness: 1 }),
      leavesDark: new THREE.MeshStandardMaterial({ color: 0x155f32, roughness: 1 }),
      bush: new THREE.MeshStandardMaterial({ color: 0x2e8a47, roughness: 1 }),
      flower: new THREE.MeshStandardMaterial({ color: 0xf7d15d, roughness: 0.8 }),
      buildingWall: new THREE.MeshStandardMaterial({ color: 0xd7c5a1, roughness: 0.9 }),
      buildingRoof: new THREE.MeshStandardMaterial({ color: 0x9b3d31, roughness: 0.85 }),
      window: new THREE.MeshStandardMaterial({ color: 0x8ed7ff, emissive: 0x2d75a6, emissiveIntensity: 0.14, roughness: 0.2, metalness: 0.15 }),
      chimney: new THREE.MeshStandardMaterial({ color: 0x7d5140, roughness: 0.9 }),
      cloud: new THREE.MeshBasicMaterial({ color: 0xb6c2c8, transparent: true, opacity: 0.34, depthWrite: false }),
      sunBlock: new THREE.MeshBasicMaterial({ color: 0xffd166 }),
      rainStreak: new THREE.MeshBasicMaterial({
        color: 0xa8d8ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      snowFlake: new THREE.MeshBasicMaterial({
        color: 0xf7fbff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      playerBody: new THREE.MeshPhysicalMaterial({
        color: 0x152c98,
        roughness: 0.09,
        metalness: 0.34,
        clearcoat: 1,
        clearcoatRoughness: 0.018,
        reflectivity: 1,
        envMapIntensity: 1.55,
      }),
      playerAccent: new THREE.MeshPhysicalMaterial({
        color: 0x070b12,
        roughness: 0.12,
        metalness: 0.36,
        clearcoat: 1,
        clearcoatRoughness: 0.035,
        reflectivity: 1,
        envMapIntensity: 1.35,
      }),
      black: new THREE.MeshStandardMaterial({ color: 0x070b12, roughness: 0.38, metalness: 0.22 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0x121a23,
        roughness: 0.05,
        metalness: 0.22,
        transparent: true,
        opacity: 0.72,
        clearcoat: 1,
        clearcoatRoughness: 0.035,
        transmission: 0,
        thickness: 0.22,
        envMapIntensity: 1.7,
      }),
      chrome: new THREE.MeshPhysicalMaterial({ color: 0x84909a, roughness: 0.1, metalness: 0.9, clearcoat: 0.8, clearcoatRoughness: 0.05, envMapIntensity: 1.35 }),
      grille: new THREE.MeshStandardMaterial({ color: 0x0b0f15, roughness: 0.55, metalness: 0.55 }),
      plate: new THREE.MeshBasicMaterial({ color: 0xc8b886 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }),
      rim: new THREE.MeshPhysicalMaterial({ color: 0xb8c0c8, roughness: 0.12, metalness: 0.94, clearcoat: 0.75, clearcoatRoughness: 0.04, envMapIntensity: 1.9 }),
      headlight: new THREE.MeshStandardMaterial({ color: 0xd7c184, emissive: 0xffbd5d, emissiveIntensity: 0.16, roughness: 0.18, metalness: 0.18 }),
      headlightGlow: new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      headlightReflection: new THREE.MeshBasicMaterial({
        color: 0xffb45b,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      taillight: new THREE.MeshStandardMaterial({ color: 0xb11e2d, emissive: 0xa80d16, emissiveIntensity: 0.28, roughness: 0.24, metalness: 0.1 }),
      contactShadow: new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    };

    const snowTintColor = new THREE.Color(0xb9c5c7);
    const coldRockColor = new THREE.Color(0x98a8b2);
    const baseMaterialColors = new Map([
      materials.ground,
      materials.grassDark,
      materials.grassLight,
      materials.field,
      materials.crop,
      materials.leaves,
      materials.leavesDark,
      materials.bush,
      materials.mountain,
      materials.barrier,
      materials.barrierTop,
      materials.shoulder,
      materials.shoulderLight,
      materials.sidewalk,
      materials.curb,
      materials.cityWall,
      materials.cityWallCool,
      materials.cityDarkWall,
      materials.planter,
    ].map((material) => [material, material.color.clone()]));

    [
      materials.playerBody,
      materials.playerAccent,
      materials.glass,
      materials.chrome,
      materials.rim,
    ].forEach((material) => {
      material.envMap = cubeReflectionTarget.texture;
      material.needsUpdate = true;
    });

    const geometries = {
      sky: new THREE.SphereGeometry(145, 36, 18),
      ground: new THREE.BoxGeometry(150, 0.2, 220),
      grassTile: new THREE.BoxGeometry(5.2, 0.05, 5.2),
      fieldStrip: new THREE.BoxGeometry(5.8, 0.08, 2.1),
      cropRow: new THREE.BoxGeometry(0.12, 0.16, 2.3),
      road: new THREE.BoxGeometry(8, 0.12, 120),
      roadPatch: new THREE.BoxGeometry(1.35, 0.025, 2.2),
      puddle: new THREE.BoxGeometry(1.25, 0.018, 2.8),
      tireMark: new THREE.BoxGeometry(0.12, 0.025, 4.5),
      shoulder: new THREE.BoxGeometry(0.4, 0.06, 120),
      sidewalk: new THREE.BoxGeometry(3.2, 0.12, 120),
      curb: new THREE.BoxGeometry(0.22, 0.18, 120),
      edgeLine: new THREE.BoxGeometry(0.08, 0.035, 4.8),
      rumble: new THREE.BoxGeometry(0.34, 0.04, 0.7),
      laneLine: new THREE.BoxGeometry(0.16, 0.03, 2.6),
      barrier: new THREE.BoxGeometry(0.45, 0.45, 2.5),
      barrierTop: new THREE.BoxGeometry(0.52, 0.12, 2.45),
      reflector: new THREE.BoxGeometry(0.08, 0.08, 0.16),
      signPost: new THREE.BoxGeometry(0.12, 1.9, 0.12),
      signBoard: new THREE.BoxGeometry(1.8, 0.8, 0.12),
      fencePost: new THREE.BoxGeometry(0.14, 0.72, 0.14),
      fenceRail: new THREE.BoxGeometry(0.12, 0.12, 2.7),
      lampPole: new THREE.BoxGeometry(0.12, 3.1, 0.12),
      lampArm: new THREE.BoxGeometry(1.0, 0.1, 0.1),
      lampHead: new THREE.BoxGeometry(0.36, 0.18, 0.28),
      lampHalo: new THREE.SphereGeometry(0.42, 10, 8),
      mountain: new THREE.ConeGeometry(5, 8, 4),
      mountainSnow: new THREE.ConeGeometry(2.3, 2.6, 4),
      trunk: new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8),
      leaves: new THREE.ConeGeometry(0.7, 1.6, 10),
      bush: new THREE.BoxGeometry(0.7, 0.46, 0.7),
      flower: new THREE.BoxGeometry(0.12, 0.18, 0.12),
      houseBody: new THREE.BoxGeometry(2.6, 1.6, 2.4),
      houseRoof: new THREE.ConeGeometry(1.9, 1.0, 4),
      window: new THREE.BoxGeometry(0.42, 0.38, 0.04),
      chimney: new THREE.BoxGeometry(0.32, 0.7, 0.32),
      cityTower: new THREE.BoxGeometry(3.4, 5.4, 3.0),
      cityShop: new THREE.BoxGeometry(3.0, 2.2, 2.4),
      cityWindow: new THREE.BoxGeometry(0.48, 0.52, 0.05),
      awning: new THREE.BoxGeometry(2.2, 0.18, 0.48),
      planter: new THREE.BoxGeometry(1.0, 0.42, 1.0),
      cloudBlock: new THREE.BoxGeometry(1.4, 0.7, 0.7),
      sunBlock: new THREE.BoxGeometry(2.2, 2.2, 0.08),
      rainStreak: new THREE.BoxGeometry(0.026, 0.9, 0.026),
      snowFlake: new THREE.BoxGeometry(0.1, 0.1, 0.1),
      carBody: new THREE.BoxGeometry(1.35, 0.42, 2.3),
      carHood: new THREE.BoxGeometry(1.2, 0.18, 0.7),
      carRear: new THREE.BoxGeometry(1.15, 0.2, 0.55),
      playerCabin: new THREE.BoxGeometry(0.95, 0.45, 1.05),
      hoodStripe: new THREE.BoxGeometry(0.18, 0.035, 1.65),
      sideSkirt: new THREE.BoxGeometry(0.12, 0.16, 1.72),
      mirror: new THREE.BoxGeometry(0.18, 0.12, 0.22),
      roofScoop: new THREE.BoxGeometry(0.42, 0.14, 0.48),
      spoiler: new THREE.BoxGeometry(1.25, 0.1, 0.24),
      grille: new THREE.BoxGeometry(0.7, 0.18, 0.08),
      plate: new THREE.BoxGeometry(0.36, 0.16, 0.04),
      exhaust: new THREE.BoxGeometry(0.18, 0.12, 0.26),
      headlightBeam: new THREE.BoxGeometry(0.34, 0.02, 2.6),
      headlightReflection: new THREE.BoxGeometry(0.52, 0.015, 3.9),
      windshield: new THREE.BoxGeometry(0.86, 0.28, 0.35),
      rearGlass: new THREE.BoxGeometry(0.82, 0.22, 0.28),
      bumper: new THREE.BoxGeometry(1.18, 0.14, 0.18),
      headlight: new THREE.BoxGeometry(0.18, 0.1, 0.08),
      taillight: new THREE.BoxGeometry(0.2, 0.1, 0.08),
      tire: new THREE.CylinderGeometry(0.24, 0.24, 0.26, 14), // ── PERF: 16→14 segments
      rim: new THREE.CylinderGeometry(0.13, 0.13, 0.27, 10),  // ── PERF: 12→10 segments
      obstacleBody: new THREE.BoxGeometry(1.25, 0.42, 2.05),
      obstacleCabin: new THREE.BoxGeometry(0.85, 0.36, 0.85),
      obstacleGlass: new THREE.BoxGeometry(0.75, 0.22, 0.6),
      obstacleWheel: new THREE.CylinderGeometry(0.21, 0.21, 0.22, 12), // ── PERF: 14→12
      contactShadowPlayer: new THREE.PlaneGeometry(1.6, 2.8),
      contactShadowObstacle: new THREE.PlaneGeometry(1.5, 2.5),
    };

    function addMesh(geometry, material, position, parent = world, castShadow = false, receiveShadow = true) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      parent.add(mesh);
      return mesh;
    }

    function addContactShadow(parent, geometry, opacity = 0.22) {
      const shadowMaterial = materials.contactShadow.clone();
      shadowMaterial.opacity = opacity;
      const shadow = new THREE.Mesh(geometry, shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.025;
      parent.add(shadow);
      return shadow;
    }

    function addProceduralSurfaceShader(material, mode, roughnessLift = 0.06) {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uSurfaceTime = shaderUniforms.time;
        shader.uniforms.uSurfaceSpeed = shaderUniforms.speed;
        shader.uniforms.uWeatherWetness = shaderUniforms.roadWetness;
        shader.uniforms.uSnowCover = shaderUniforms.snowCover;

        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", `#include <common>\nvarying vec3 vSurfaceWorldPosition;`)
          .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\nvSurfaceWorldPosition = worldPosition.xyz;`);

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `
            #include <common>
            varying vec3 vSurfaceWorldPosition;
            uniform float uSurfaceTime;
            uniform float uSurfaceSpeed;
            uniform float uWeatherWetness;
            uniform float uSnowCover;

            float hash21Surface(vec2 p) {
              p = fract(p * vec2(123.34, 456.21));
              p += dot(p, p + 45.32);
              return fract(p.x * p.y);
            }

            float valueNoiseSurface(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              float a = hash21Surface(i);
              float b = hash21Surface(i + vec2(1.0, 0.0));
              float c = hash21Surface(i + vec2(0.0, 1.0));
              float d = hash21Surface(i + vec2(1.0, 1.0));
              return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            `
          )
          .replace(
            "#include <color_fragment>",
            `
            #include <color_fragment>
            float broadSurface = valueNoiseSurface(vSurfaceWorldPosition.xz * 1.65);
            float fineSurface = valueNoiseSurface(vSurfaceWorldPosition.xz * 16.0 + vec2(0.0, uSurfaceTime * 0.06));
            float shaderNoise = mix(broadSurface, fineSurface, 0.42);
            ${mode === "road"
              ? `
                float crackSurface = smoothstep(0.9, 0.985, valueNoiseSurface(vSurfaceWorldPosition.xz * 4.8 + 8.0));
                float tarFleck = smoothstep(0.965, 0.995, valueNoiseSurface(vSurfaceWorldPosition.xz * 18.0 - 3.0));
                float wetPuddle = smoothstep(0.58, 0.92, valueNoiseSurface(vSurfaceWorldPosition.xz * 2.4 + vec2(2.0, -1.7)));
                float snowDust = smoothstep(0.52, 1.0, valueNoiseSurface(vSurfaceWorldPosition.xz * 3.1 + 11.0));
                diffuseColor.rgb *= mix(0.9, 1.08, shaderNoise);
                diffuseColor.rgb -= crackSurface * vec3(0.018, 0.019, 0.02);
                diffuseColor.rgb -= tarFleck * vec3(0.028, 0.03, 0.032);
                diffuseColor.rgb += vec3(0.008, 0.008, 0.006) * smoothstep(0.82, 1.0, fineSurface) * (0.42 + uSurfaceSpeed * 0.35);
                diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.62, 0.72) + vec3(0.018, 0.032, 0.047), uWeatherWetness * (0.36 + wetPuddle * 0.34));
                diffuseColor.rgb += vec3(0.12, 0.16, 0.18) * wetPuddle * uWeatherWetness * 0.4;
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.7, 0.78, 0.82), uSnowCover * snowDust * 0.18);
              `
              : mode === "paint"
                ? `
                  float highlightStripe = pow(abs(sin(vSurfaceWorldPosition.x * 11.0 + vSurfaceWorldPosition.z * 0.75)), 14.0);
                  diffuseColor.rgb *= mix(0.88, 1.12, shaderNoise);
                  diffuseColor.rgb += vec3(0.085, 0.075, 0.065) * highlightStripe * (0.24 + uSurfaceSpeed * 0.22);
                `
                : `
                  float snowDust = smoothstep(0.46, 1.0, valueNoiseSurface(vSurfaceWorldPosition.xz * 2.2 + 4.0));
                  diffuseColor.rgb *= mix(vec3(0.76, 0.92, 0.72), vec3(1.16, 1.08, 0.84), shaderNoise);
                  diffuseColor.rgb += vec3(0.012, 0.018, 0.0) * smoothstep(0.72, 1.0, fineSurface);
                  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.87, 0.86), uSnowCover * (0.22 + snowDust * 0.46));
                `}
            `
          )
          .replace(
            "#include <roughnessmap_fragment>",
            `
            #include <roughnessmap_fragment>
            ${mode === "road"
              ? `
                float wetPuddleRoughness = smoothstep(0.58, 0.92, valueNoiseSurface(vSurfaceWorldPosition.xz * 2.4 + vec2(2.0, -1.7)));
                roughnessFactor = clamp(roughnessFactor + (1.0 - shaderNoise) * ${roughnessLift.toFixed(3)} - uWeatherWetness * (0.48 + wetPuddleRoughness * 0.34), 0.08, 1.0);
              `
              : `
                roughnessFactor = clamp(roughnessFactor + (1.0 - shaderNoise) * ${roughnessLift.toFixed(3)}, 0.0, 1.0);
              `}
            `
          );

        if (mode === "road") {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <metalnessmap_fragment>",
            `
            #include <metalnessmap_fragment>
            float wetPuddleMetal = smoothstep(0.58, 0.92, valueNoiseSurface(vSurfaceWorldPosition.xz * 2.4 + vec2(2.0, -1.7)));
            metalnessFactor = clamp(metalnessFactor + uWeatherWetness * wetPuddleMetal * 0.08, 0.0, 1.0);
            `
          );
        }
      };
      material.customProgramCacheKey = () => `blockrush-${mode}-${roughnessLift}`;
    }

    function trackRoadItem(object, resetAfter = ROAD_RESET_Z, resetBy = FAR_RESET_AMOUNT, speedMul = 1.9) {
      state.animatedRoadItems.push({ object, resetAfter, resetBy, speedMul });
      return object;
    }

    [materials.road, materials.roadPatch, materials.shoulder, materials.shoulderLight].forEach(
      (material) => addProceduralSurfaceShader(material, "road", 0.08)
    );
    [materials.ground, materials.grassDark, materials.grassLight, materials.field, materials.crop,
      materials.leaves, materials.leavesDark, materials.bush].forEach(
      (material) => addProceduralSurfaceShader(material, "grass", 0.04)
    );
    addProceduralSurfaceShader(materials.playerBody, "paint", 0.03);

    const skyDome = new THREE.Mesh(geometries.sky, materials.sky);
    skyDome.frustumCulled = false;
    skyDome.renderOrder = -100;
    scene.add(skyDome);

    addMesh(geometries.ground, materials.ground, [0, -0.18, -50]);
    addMesh(geometries.road, materials.road, [0, -0.05, -40]);
    addMesh(geometries.shoulder, materials.shoulder, [-4.2, 0, -40]);
    addMesh(geometries.shoulder, materials.shoulder, [4.2, 0, -40]);
    addMesh(geometries.sidewalk, materials.sidewalk, [-6.05, -0.02, -40]);
    addMesh(geometries.sidewalk, materials.sidewalk, [6.05, -0.02, -40]);
    addMesh(geometries.curb, materials.curb, [-4.72, 0.02, -40]);
    addMesh(geometries.curb, materials.curb, [4.72, 0.02, -40]);

    const sunBlock = addMesh(geometries.sunBlock, materials.sunBlock, [-19, 12.5, -48], world, false, false);

    function addTrackedMesh(geometry, material, position, resetAfter = ROAD_RESET_Z, resetBy = FAR_RESET_AMOUNT, speedMul = 1.9) {
      return trackRoadItem(addMesh(geometry, material, position, world, false, false), resetAfter, resetBy, speedMul);
    }

    for (let z = -95; z < 20; z += 6) {
      [-1.35, 1.35].forEach((x) => addTrackedMesh(geometries.laneLine, materials.laneLine, [x, 0.035, z]));
    }
    for (let z = -98; z < 22; z += 4.8) {
      [-3.82, 3.82].forEach((x) => addTrackedMesh(geometries.edgeLine, materials.edgeLine, [x, 0.04, z], 22, 124, 1.9));
    }
    for (let z = -106; z < 22; z += 5.6) {
      const lane = LANES[Math.floor(Math.random() * LANES.length)];
      addTrackedMesh(geometries.roadPatch, materials.roadPatch, [lane + (Math.random() - 0.5) * 0.55, 0.03, z], 22, 128, 1.9);
      if (Math.random() > 0.45) {
        const mark = addTrackedMesh(geometries.tireMark, materials.tireMark, [lane + 0.34, 0.045, z - 1.4], 22, 128, 1.9);
        mark.rotation.y = (Math.random() - 0.5) * 0.06;
      }
    }

    const wetSurfaceObjects = [];
    for (let z = -104; z < 14; z += 9.5) {
      const lane = LANES[Math.floor(Math.random() * LANES.length)];
      const puddle = addTrackedMesh(geometries.puddle, materials.puddle, [lane + (Math.random() - 0.5) * 0.42, 0.055, z], 22, 128, 1.9);
      puddle.scale.set(0.65 + Math.random() * 0.75, 1, 0.7 + Math.random() * 0.95);
      puddle.rotation.y = (Math.random() - 0.5) * 0.08;
      wetSurfaceObjects.push(puddle);
    }

    for (let z = -100; z < 25; z += 2.8) {
      [-4.45, 4.45].forEach((x, sideIndex) => {
        const material = (Math.floor(z) + sideIndex) % 2 === 0 ? materials.rumbleWhite : materials.rumbleRed;
        const strip = addTrackedMesh(geometries.rumble, material, [x, 0.035, z], 22, 124, 1.9);
        strip.rotation.y = Math.PI * 0.5;
      });
    }

    function createBarrierSegment(x, z, side) {
      const group = new THREE.Group();
      addMesh(geometries.barrier, materials.barrier, [0, 0.22, 0], group, false, true);
      addMesh(geometries.barrierTop, materials.barrierTop, [0, 0.52, 0], group, false, true);
      addMesh(geometries.reflector, materials.reflector, [-side * 0.24, 0.45, -0.64], group, false, false);
      addMesh(geometries.reflector, materials.reflector, [-side * 0.24, 0.45, 0.64], group, false, false);
      group.position.set(x, 0, z);
      world.add(group);
      trackRoadItem(group, 22, 124, 1.9);
    }
    for (let z = -100; z < 25; z += 5) {
      [-5.3, 5.3].forEach((x) => createBarrierSegment(x, z, Math.sign(x)));
    }

    function createCloud(x, y, z, scale = 1) {
      const group = new THREE.Group();
      [[-0.8, 0, 0], [0, 0.2, 0], [0.88, 0.02, 0], [0.28, -0.16, 0.15]].forEach(([px, py, pz], index) => {
        const block = addMesh(geometries.cloudBlock, materials.cloud, [px, py, pz], group, false, false);
        block.scale.setScalar(index === 1 ? 1.18 : 0.82 + index * 0.06);
      });
      group.position.set(x, y, z);
      group.scale.setScalar(scale);
      world.add(group);
      trackRoadItem(group, 42, 150, 0.28);
    }
    for (let i = 0; i < 7; i++) {
      createCloud(-28 + i * 9 + Math.random() * 4, 9 + Math.random() * 3, -35 - i * 16, 0.9 + Math.random() * 0.5);
    }

    function createMountain(x, z, scale) {
      const group = new THREE.Group();
      const body = addMesh(geometries.mountain, materials.mountain, [0, 3.8, 0], group, false, true);
      body.scale.setScalar(scale);
      body.rotation.y = Math.PI * 0.25;
      const snow = addMesh(geometries.mountainSnow, materials.mountainSnow, [0, 7.0 * scale, 0], group, false, false);
      snow.scale.setScalar(scale * 0.52);
      snow.rotation.y = Math.PI * 0.25;
      group.position.set(x, 0, z);
      world.add(group);
      trackRoadItem(group, 36, 158, 0.55);
    }
    for (let i = 0; i < 15; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      createMountain(side * (26 + Math.random() * 16), -88 - i * 7 - Math.random() * 24, 0.7 + Math.random() * 0.8);
    }

    function createFenceSegment(x, z) {
      const group = new THREE.Group();
      addMesh(geometries.fencePost, materials.barrier, [0, 0.36, -1.18], group, false, true);
      addMesh(geometries.fencePost, materials.barrier, [0, 0.36, 1.18], group, false, true);
      addMesh(geometries.fenceRail, materials.barrierTop, [0, 0.55, 0], group, false, true);
      group.position.set(x, 0, z);
      world.add(group);
      trackRoadItem(group, 24, 128, 1.65);
    }
    for (let z = -102; z < 24; z += 8) {
      [-7.1, 7.1].forEach((x) => createFenceSegment(x, z));
    }

    function createTree(x, z) {
      const group = new THREE.Group();
      addMesh(geometries.trunk, materials.trunk, [0, 0.6, 0], group, false, false);
      addMesh(geometries.leaves, materials.leavesDark, [0, 1.55, 0], group, false, false);
      addMesh(geometries.leaves, materials.leaves, [0, 2.1, 0], group, false, false).scale.setScalar(0.82);
      addMesh(geometries.bush, materials.bush, [0.45, 0.24, 0.15], group, false, true);
      group.position.set(x, 0, z);
      group.scale.setScalar(0.85 + Math.random() * 0.65);
      world.add(group);
      trackRoadItem(group, 24, 132, 1.7);
    }

    function createCropPatch(x, z) {
      const group = new THREE.Group();
      addMesh(geometries.fieldStrip, materials.field, [0, 0.02, 0], group, false, true);
      for (let i = -2; i <= 2; i++) {
        addMesh(geometries.cropRow, materials.crop, [i * 0.48, 0.16, 0], group, false, false);
      }
      group.position.set(x, -0.02, z);
      world.add(group);
      trackRoadItem(group, 24, 132, 1.48);
    }

    function createRoadSign(side, z) {
      const group = new THREE.Group();
      addMesh(geometries.signPost, materials.signPost, [0, 0.95, 0], group, false, true);
      addMesh(geometries.signBoard, materials.signBoard, [0, 1.85, 0], group, false, false);
      addMesh(geometries.signBoard, materials.signBack, [0, 1.82, -0.08], group, false, false).scale.set(0.88, 0.7, 0.55);
      addMesh(geometries.reflector, materials.reflector, [-0.52, 1.98, 0.08], group, false, false);
      addMesh(geometries.reflector, materials.reflector, [0.52, 1.98, 0.08], group, false, false);
      group.position.set(side * 6.8, 0, z);
      group.rotation.y = side < 0 ? 0.04 : -0.04;
      world.add(group);
      trackRoadItem(group, 26, 140, 1.8);
    }

    function createLamp(side, z) {
      const group = new THREE.Group();
      addMesh(geometries.lampPole, materials.lampPost, [0, 1.55, 0], group, false, true);
      addMesh(geometries.lampArm, materials.lampPost, [-side * 0.42, 3.04, 0], group, false, true);
      addMesh(geometries.lampHead, materials.lampHead, [-side * 0.94, 2.98, 0], group, false, false);
      addMesh(geometries.lampHalo, materials.lampGlow, [-side * 0.94, 2.98, 0], group, false, false);
      group.position.set(side * 5.85, 0, z);
      world.add(group);
      trackRoadItem(group, 26, 132, 1.75);
    }

    function createHouse(side, z, index) {
      const group = new THREE.Group();
      addMesh(geometries.houseBody, materials.buildingWall, [0, 0.8, 0], group, false, true);
      const roof = addMesh(geometries.houseRoof, materials.buildingRoof, [0, 1.92, 0], group, false, true);
      roof.rotation.y = Math.PI * 0.25;
      addMesh(geometries.window, materials.window, [-0.66, 0.92, 1.22], group, false, false);
      addMesh(geometries.window, materials.window, [0.66, 0.92, 1.22], group, false, false);
      addMesh(geometries.chimney, materials.chimney, [0.72, 2.25, -0.4], group, false, true);
      group.position.set(side * (15 + (index % 3) * 3.4), 0, z);
      group.rotation.y = side < 0 ? 0.18 : -0.18;
      world.add(group);
      trackRoadItem(group, 30, 150, 1.25);
    }

    function createCityBlock(side, z, index) {
      const group = new THREE.Group();
      const towerMaterial = index % 3 === 0 ? materials.cityDarkWall : index % 3 === 1 ? materials.cityWallCool : materials.cityWall;
      const towerHeight = 0.82 + (index % 4) * 0.12;
      const tower = addMesh(geometries.cityTower, towerMaterial, [0, 2.7 * towerHeight, 0], group, false, true);
      tower.scale.set(0.86 + (index % 2) * 0.18, towerHeight, 0.92 + (index % 3) * 0.08);
      const shop = addMesh(geometries.cityShop, materials.cityWall, [-side * 0.18, 1.05, 2.05], group, false, true);
      shop.scale.set(1.06, 0.94, 0.82);
      const facadeX = -side * (1.72 + (index % 2) * 0.22);
      for (let row = 0; row < 3; row++) {
        for (let col = -1; col <= 1; col++) {
          const windowMesh = addMesh(geometries.cityWindow, materials.cityWindow, [facadeX, 1.8 + row * 1.05, col * 0.72 - 0.2], group, false, false);
          windowMesh.rotation.y = Math.PI * 0.5;
        }
      }
      const awning = addMesh(geometries.awning, index % 2 === 0 ? materials.rumbleRed : materials.signBoard, [facadeX, 1.72, 1.65], group, false, false);
      awning.rotation.y = Math.PI * 0.5;
      awning.scale.set(0.9, 1, 1.1);
      group.position.set(side * (9.2 + (index % 3) * 1.3), 0, z);
      group.rotation.y = side < 0 ? 0.03 : -0.03;
      world.add(group);
      trackRoadItem(group, 34, 152, 1.18);
    }

    function createStreetTree(side, z, index) {
      const group = new THREE.Group();
      addMesh(geometries.planter, materials.planter, [0, 0.22, 0], group, false, true);
      addMesh(geometries.trunk, materials.trunk, [0, 0.92, 0], group, false, false).scale.set(0.72, 0.95, 0.72);
      const crown = addMesh(geometries.leaves, index % 2 === 0 ? materials.leavesDark : materials.leaves, [0, 1.9, 0], group, false, false);
      crown.scale.set(0.95, 0.86, 0.95);
      group.position.set(side * 6.75, 0, z);
      world.add(group);
      trackRoadItem(group, 26, 132, 1.65);
    }

    for (let z = -106; z < 24; z += 8) {
      [-1, 1].forEach((side) => {
        const sideOffset = 8 + Math.random() * 7;
        const tile = addTrackedMesh(
          geometries.grassTile,
          Math.random() > 0.5 ? materials.grassDark : materials.grassLight,
          [side * sideOffset, -0.055, z + (Math.random() - 0.5) * 2.4],
          24, 132, 1.55
        );
        tile.rotation.y = (Math.random() - 0.5) * 0.35;
      });
    }

    for (let z = -100; z < 20; z += 10) {
      createTree(-10 - Math.random() * 4, z + Math.random() * 2);
      createTree(10 + Math.random() * 4, z + Math.random() * 2);
    }
    for (let z = -112; z < 16; z += 18) {
      createCropPatch(-18 - Math.random() * 5, z);
      createCropPatch(18 + Math.random() * 5, z + 7);
    }
    for (let z = -110; z < 8; z += 28) {
      createRoadSign(Math.random() > 0.5 ? -1 : 1, z + 5);
      createHouse(-1, z - 2, Math.floor(Math.random() * 5));
      createHouse(1, z - 12, Math.floor(Math.random() * 5));
    }
    for (let z = -112; z < 14; z += 18) {
      const index = Math.floor((z + 112) / 18);
      createCityBlock(-1, z - 3, index);
      createCityBlock(1, z + 6, index + 3);
      createStreetTree(-1, z + 5, index);
      createStreetTree(1, z - 5, index + 1);
    }
    for (let z = -100; z < 20; z += 18) {
      createLamp(-1, z);
      createLamp(1, z + 9);
    }

    function createWheel(parent, x, y, z, tireGeometry = geometries.tire) {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(tireGeometry, materials.wheel);
      tire.rotation.z = Math.PI / 2;
      // ── PERF: castShadow false on wheels — shadow map off anyway ──
      tire.castShadow = false;
      wheelGroup.add(tire);
      const rim = new THREE.Mesh(geometries.rim, materials.rim);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);
      wheelGroup.position.set(x, y, z);
      parent.add(wheelGroup);
      state.wheelGroups.push(wheelGroup);
      return wheelGroup;
    }

    const headlightReflectionMeshes = [];

    function createPlayerCar() {
      const car = new THREE.Group();
      addContactShadow(car, geometries.contactShadowPlayer, 0.24);
      addMesh(geometries.carBody, materials.playerBody, [0, 0.45, 0], car, false, false);
      addMesh(geometries.carHood, materials.playerBody, [0, 0.62, -0.65], car, false, false);
      addMesh(geometries.carRear, materials.playerBody, [0, 0.62, 0.75], car, false, false);
      addMesh(geometries.hoodStripe, materials.playerAccent, [0, 0.74, -0.2], car, false, false);
      addMesh(geometries.sideSkirt, materials.playerAccent, [-0.72, 0.34, 0], car, false, false);
      addMesh(geometries.sideSkirt, materials.playerAccent, [0.72, 0.34, 0], car, false, false);
      addMesh(geometries.playerCabin, materials.black, [0, 0.88, -0.05], car, false, false);
      addMesh(geometries.roofScoop, materials.playerAccent, [0, 1.2, -0.18], car, false, false);

      const windshield = addMesh(geometries.windshield, materials.glass, [0, 0.96, -0.24], car, false, false);
      windshield.rotation.x = 0.35;
      const rearGlass = addMesh(geometries.rearGlass, materials.glass, [0, 0.98, 0.44], car, false, false);
      rearGlass.rotation.x = -0.25;

      addMesh(geometries.mirror, materials.black, [-0.76, 0.84, 0.28], car, false, false);
      addMesh(geometries.mirror, materials.black, [0.76, 0.84, 0.28], car, false, false);
      addMesh(geometries.bumper, materials.chrome, [0, 0.41, 1.18], car, false, false);
      addMesh(geometries.bumper, materials.chrome, [0, 0.41, -1.18], car, false, false);
      addMesh(geometries.grille, materials.grille, [0, 0.5, -1.25], car, false, false);
      addMesh(geometries.plate, materials.plate, [0, 0.34, 1.31], car, false, false);
      addMesh(geometries.plate, materials.plate, [0, 0.34, -1.31], car, false, false);
      addMesh(geometries.spoiler, materials.playerAccent, [0, 0.95, 1.02], car, false, false);
      addMesh(geometries.exhaust, materials.chrome, [-0.38, 0.23, 1.33], car, false, false);
      addMesh(geometries.exhaust, materials.chrome, [0.38, 0.23, 1.33], car, false, false);
      addMesh(geometries.headlight, materials.headlight, [-0.36, 0.5, -1.18], car, false, false);
      addMesh(geometries.headlight, materials.headlight, [0.36, 0.5, -1.18], car, false, false);
      addMesh(geometries.headlightBeam, materials.headlightGlow, [-0.36, 0.17, -2.28], car, false, false);
      addMesh(geometries.headlightBeam, materials.headlightGlow, [0.36, 0.17, -2.28], car, false, false);
      [-0.36, 0.36].forEach((x) => {
        const reflection = addMesh(geometries.headlightReflection, materials.headlightReflection, [x, 0.065, -2.65], car, false, false);
        reflection.renderOrder = 4;
        headlightReflectionMeshes.push(reflection);
      });

      // ── PERF: SpotLights on player removed — expensive per-frame shadow calc ──
      // (they were guarded by !isLowPowerDevice but contribute draw calls regardless)

      addMesh(geometries.taillight, materials.taillight, [-0.34, 0.5, 1.18], car, false, false);
      addMesh(geometries.taillight, materials.taillight, [0.34, 0.5, 1.18], car, false, false);

      [[-0.75, 0.24, 0.78], [0.75, 0.24, 0.78], [-0.75, 0.24, -0.78], [0.75, 0.24, -0.78]].forEach(([x, y, z]) => {
        createWheel(car, x, y, z);
      });

      car.position.set(0, 0, PLAYER_Z);
      car.userData.halfW = 0.72;
      car.userData.halfZ = 1.15;
      return car;
    }

    const player = createPlayerCar();
    scene.add(player);

    const obstacleMaterials = [0x2563eb, 0xf59e0b, 0x10b981, 0x8b5cf6, 0xf43f5e].map(
      (color) => new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.16,
        metalness: 0.38,
        clearcoat: 0.95,
        clearcoatRoughness: 0.04,
        reflectivity: 0.92,
        envMapIntensity: 1.55,
      })
    );
    obstacleMaterials.forEach((material) => addProceduralSurfaceShader(material, "paint", 0.035));

    function createObstacleCar(z = -40) {
      const car = new THREE.Group();
      addContactShadow(car, geometries.contactShadowObstacle, 0.2);
      const bodyMaterial = obstacleMaterials[Math.floor(Math.random() * obstacleMaterials.length)];
      addMesh(geometries.obstacleBody, bodyMaterial, [0, 0.43, 0], car, false, false);
      addMesh(geometries.hoodStripe, materials.black, [0, 0.66, 0.08], car, false, false).scale.set(0.72, 0.75, 0.8);
      addMesh(geometries.obstacleCabin, materials.black, [0, 0.83, 0], car, false, false);
      addMesh(geometries.obstacleGlass, materials.glass, [0, 0.9, 0.05], car, false, false);
      addMesh(geometries.bumper, materials.chrome, [0, 0.38, 1.05], car, false, false).scale.set(0.9, 0.85, 0.8);
      addMesh(geometries.bumper, materials.chrome, [0, 0.38, -1.05], car, false, false).scale.set(0.9, 0.85, 0.8);
      addMesh(geometries.grille, materials.grille, [0, 0.48, 1.09], car, false, false).scale.set(0.72, 0.7, 0.8);
      addMesh(geometries.headlight, materials.headlight, [-0.32, 0.48, 1.08], car, false, false).scale.set(0.82, 0.82, 0.82);
      addMesh(geometries.headlight, materials.headlight, [0.32, 0.48, 1.08], car, false, false).scale.set(0.82, 0.82, 0.82);
      addMesh(geometries.taillight, materials.taillight, [-0.32, 0.47, -1.08], car, false, false).scale.set(0.8, 0.8, 0.8);
      addMesh(geometries.taillight, materials.taillight, [0.32, 0.47, -1.08], car, false, false).scale.set(0.8, 0.8, 0.8);
      addMesh(geometries.mirror, materials.black, [-0.7, 0.78, 0.2], car, false, false).scale.set(0.75, 0.75, 0.75);
      addMesh(geometries.mirror, materials.black, [0.7, 0.78, 0.2], car, false, false).scale.set(0.75, 0.75, 0.75);
      [[-0.72, 0.22, 0.7], [0.72, 0.22, 0.7], [-0.72, 0.22, -0.7], [0.72, 0.22, -0.7]].forEach(([x, y, z]) => {
        createWheel(car, x, y, z, geometries.obstacleWheel);
      });
      car.position.set(LANES[Math.floor(Math.random() * LANES.length)], 0, z);
      car.userData.passed = false;
      car.userData.halfW = 0.68;
      car.userData.halfZ = 1.05;
      scene.add(car);
      return car;
    }

    state.obstacles = [createObstacleCar(-38), createObstacleCar(-62), createObstacleCar(-86)];

    const particleDummy = new THREE.Object3D();

    function createWeatherParticlePool(type, count) {
      const isRain = type === "rain";
      const mesh = new THREE.InstancedMesh(
        isRain ? geometries.rainStreak : geometries.snowFlake,
        isRain ? materials.rainStreak : materials.snowFlake,
        count
      );
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);
      const particles = Array.from({ length: count }, () => ({
        x: -12 + Math.random() * 24,
        y: 1.2 + Math.random() * 11,
        z: -88 + Math.random() * 100,
        speed: 0.65 + Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
        scale: 0.65 + Math.random() * 0.75,
      }));
      particles.forEach((particle, index) => {
        particleDummy.position.set(particle.x, particle.y, particle.z);
        particleDummy.rotation.set(isRain ? -0.18 : 0, 0, isRain ? -0.12 : 0);
        particleDummy.scale.setScalar(particle.scale);
        particleDummy.updateMatrix();
        mesh.setMatrixAt(index, particleDummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      return { mesh, particles, type };
    }

    // ── PERF: particle counts halved — biggest non-visible CPU cost ──
    const weatherParticles = {
      rain: createWeatherParticlePool("rain", isLowPowerDevice ? 100 : 220),
      snow: createWeatherParticlePool("snow", isLowPowerDevice ? 80 : 160),
    };

    function resetWeatherParticle(particle, type) {
      particle.x = -12 + Math.random() * 24;
      particle.y = 7 + Math.random() * 7;
      particle.z = type === "rain" ? -86 + Math.random() * 74 : -92 + Math.random() * 88;
      particle.speed = type === "rain" ? 0.65 + Math.random() * 0.75 : 0.35 + Math.random() * 0.55;
      particle.phase = Math.random() * Math.PI * 2;
      particle.scale = type === "rain" ? 0.72 + Math.random() * 0.7 : 0.65 + Math.random() * 0.9;
    }

    function updateWeatherParticles(pool, amount, frameScale, roadMove, nowSeconds) {
      pool.mesh.visible = amount > 0.035;
      pool.mesh.material.opacity = pool.type === "rain" ? amount * 0.34 : amount * 0.78;
      if (!pool.mesh.visible) return;
      const isRain = pool.type === "rain";
      const roadDrag = isRain ? roadMove * 0.72 : roadMove * 0.32;
      for (let i = 0; i < pool.particles.length; i++) {
        const particle = pool.particles[i];
        if (isRain) {
          particle.y -= (0.42 + particle.speed * 0.3) * frameScale;
          particle.x -= 0.018 * frameScale;
          particle.z += roadDrag;
        } else {
          particle.y -= (0.035 + particle.speed * 0.028) * frameScale;
          particle.x += Math.sin(nowSeconds * 1.2 + particle.phase) * 0.012 * frameScale;
          particle.z += roadDrag;
        }
        if (particle.y < 0.18 || particle.z > 12 || particle.x < -14 || particle.x > 14) {
          resetWeatherParticle(particle, pool.type);
        }
        particleDummy.position.set(particle.x, particle.y, particle.z);
        if (isRain) {
          particleDummy.rotation.set(-0.24, 0, -0.12);
          particleDummy.scale.set(0.72, particle.scale * (0.82 + amount * 0.52), 0.72);
        } else {
          particleDummy.rotation.set(nowSeconds * 0.35 + particle.phase, nowSeconds * 0.22 + particle.phase, nowSeconds * 0.18);
          particleDummy.scale.setScalar(particle.scale);
        }
        particleDummy.updateMatrix();
        pool.mesh.setMatrixAt(i, particleDummy.matrix);
      }
      pool.mesh.instanceMatrix.needsUpdate = true;
    }

    const currentWeather = {
      skyTop: new THREE.Color(), skyHorizon: new THREE.Color(), skyHaze: new THREE.Color(),
      fogColor: new THREE.Color(), sunColor: new THREE.Color(), gradeTint: new THREE.Color(),
      sunPosition: new THREE.Vector3(), sunDirection: new THREE.Vector3(),
      fogNear: WEATHER_PRESETS.clear_noon.fogNear, fogFar: WEATHER_PRESETS.clear_noon.fogFar,
      sunIntensity: WEATHER_PRESETS.clear_noon.sunIntensity,
      ambientIntensity: WEATHER_PRESETS.clear_noon.ambientIntensity,
      hemiIntensity: WEATHER_PRESETS.clear_noon.hemiIntensity,
      fillIntensity: WEATHER_PRESETS.clear_noon.fillIntensity,
      rimIntensity: WEATHER_PRESETS.clear_noon.rimIntensity,
      bloomStrength: WEATHER_PRESETS.clear_noon.bloomStrength,
      bloomThreshold: WEATHER_PRESETS.clear_noon.bloomThreshold,
      exposure: WEATHER_PRESETS.clear_noon.exposure,
      saturation: WEATHER_PRESETS.clear_noon.saturation,
      contrast: WEATHER_PRESETS.clear_noon.contrast,
      roadWetness: 0, snowCover: 0, rainAmount: 0, snowAmount: 0, thunderAmount: 0,
      cloudOpacity: WEATHER_PRESETS.clear_noon.cloudOpacity,
      lampIntensity: WEATHER_PRESETS.clear_noon.lampIntensity,
      lampGlowOpacity: WEATHER_PRESETS.clear_noon.lampGlowOpacity,
      headlightBoost: WEATHER_PRESETS.clear_noon.headlightBoost,
      lightningFlash: 0,
    };

    function sampleWeather(dt) {
      const weather = state.weatherState;
      weather.elapsed += dt;
      const cycleSeconds = WEATHER_HOLD_SECONDS + WEATHER_TRANSITION_SECONDS;
      const cyclePosition = weather.elapsed % (cycleSeconds * WEATHER_SEQUENCE.length);
      const presetIndex = Math.floor(cyclePosition / cycleSeconds);
      const localTime = cyclePosition - presetIndex * cycleSeconds;
      const fromName = WEATHER_SEQUENCE[presetIndex];
      const toName = WEATHER_SEQUENCE[(presetIndex + 1) % WEATHER_SEQUENCE.length];
      const transitionProgress = localTime <= WEATHER_HOLD_SECONDS
        ? 0
        : easeInOutCubic((localTime - WEATHER_HOLD_SECONDS) / WEATHER_TRANSITION_SECONDS);
      const from = WEATHER_PRESETS[fromName];
      const to = WEATHER_PRESETS[toName];
      weather.fromPreset = fromName;
      weather.toPreset = toName;
      weather.transitionProgress = transitionProgress;
      currentWeather.skyTop.copy(from.skyTop).lerp(to.skyTop, transitionProgress);
      currentWeather.skyHorizon.copy(from.skyHorizon).lerp(to.skyHorizon, transitionProgress);
      currentWeather.skyHaze.copy(from.skyHaze).lerp(to.skyHaze, transitionProgress);
      currentWeather.fogColor.copy(from.fogColor).lerp(to.fogColor, transitionProgress);
      currentWeather.sunColor.copy(from.sunColor).lerp(to.sunColor, transitionProgress);
      currentWeather.gradeTint.copy(from.gradeTint).lerp(to.gradeTint, transitionProgress);
      currentWeather.sunPosition.copy(from.sunPosition).lerp(to.sunPosition, transitionProgress);
      currentWeather.sunDirection.copy(from.sunDirection).lerp(to.sunDirection, transitionProgress).normalize();
      currentWeather.fogNear = lerp(from.fogNear, to.fogNear, transitionProgress);
      currentWeather.fogFar = lerp(from.fogFar, to.fogFar, transitionProgress);
      currentWeather.sunIntensity = lerp(from.sunIntensity, to.sunIntensity, transitionProgress);
      currentWeather.ambientIntensity = lerp(from.ambientIntensity, to.ambientIntensity, transitionProgress);
      currentWeather.hemiIntensity = lerp(from.hemiIntensity, to.hemiIntensity, transitionProgress);
      currentWeather.fillIntensity = lerp(from.fillIntensity, to.fillIntensity, transitionProgress);
      currentWeather.rimIntensity = lerp(from.rimIntensity, to.rimIntensity, transitionProgress);
      currentWeather.bloomStrength = lerp(from.bloomStrength, to.bloomStrength, transitionProgress);
      currentWeather.bloomThreshold = lerp(from.bloomThreshold, to.bloomThreshold, transitionProgress);
      currentWeather.exposure = lerp(from.exposure, to.exposure, transitionProgress);
      currentWeather.saturation = lerp(from.saturation, to.saturation, transitionProgress);
      currentWeather.contrast = lerp(from.contrast, to.contrast, transitionProgress);
      currentWeather.roadWetness = lerp(from.roadWetness, to.roadWetness, transitionProgress);
      currentWeather.snowCover = lerp(from.snowCover, to.snowCover, transitionProgress);
      currentWeather.rainAmount = lerp(from.rainAmount, to.rainAmount, transitionProgress);
      currentWeather.snowAmount = lerp(from.snowAmount, to.snowAmount, transitionProgress);
      currentWeather.thunderAmount = lerp(from.thunderAmount, to.thunderAmount, transitionProgress);
      currentWeather.cloudOpacity = lerp(from.cloudOpacity, to.cloudOpacity, transitionProgress);
      currentWeather.lampIntensity = lerp(from.lampIntensity, to.lampIntensity, transitionProgress);
      currentWeather.lampGlowOpacity = lerp(from.lampGlowOpacity, to.lampGlowOpacity, transitionProgress);
      currentWeather.headlightBoost = lerp(from.headlightBoost, to.headlightBoost, transitionProgress);
      if (currentWeather.thunderAmount > 0.18) {
        weather.lightningCooldown -= dt * (0.8 + currentWeather.thunderAmount * 0.6);
        if (weather.lightningCooldown <= 0) {
          weather.lightningFlash = 1;
          weather.lightningCooldown = 2.6 + Math.random() * 5.4;
          weather.lightningX = -22 + Math.random() * 44;
        }
      } else {
        weather.lightningCooldown = Math.max(weather.lightningCooldown, 3.8);
      }
      weather.lightningFlash = Math.max(0, weather.lightningFlash - dt * 3.6);
      currentWeather.lightningFlash = weather.lightningFlash * currentWeather.thunderAmount;
      return currentWeather;
    }

    function tintMaterialToward(material, targetColor, amount) {
      const baseColor = baseMaterialColors.get(material);
      if (!baseColor) return;
      material.color.copy(baseColor).lerp(targetColor, amount);
    }

    const sceneBackgroundColor = new THREE.Color();
    const hemiSkyColor = new THREE.Color();
    const hemiGroundColor = new THREE.Color();
    const lightningFogColor = new THREE.Color(0x9db8d2);
    const lightningSkyColor = new THREE.Color(0x8fb1d0);
    const lightningSunColor = new THREE.Color(0xa9c3df);
    const lightningRimColor = new THREE.Color(0xc8d5df);
    const snowyGroundColor = new THREE.Color(0x8fa1aa);

    function applyWeatherVisuals(weather, speedProgress) {
      const lightning = weather.lightningFlash;
      const lightBloomAmount = Math.max(weather.roadWetness, weather.rainAmount * 0.65, weather.thunderAmount * 0.85);
      const accentBloomAmount = Math.max(0.22, lightBloomAmount);
      sceneBackgroundColor.copy(weather.skyTop).lerp(weather.skyHorizon, 0.24 + lightning * 0.18);
      scene.background.copy(sceneBackgroundColor);
      scene.fog.color.copy(weather.fogColor).lerp(lightningFogColor, lightning * 0.22);
      scene.fog.near = Math.max(8, weather.fogNear - lightning * 3);
      scene.fog.far = weather.fogFar + lightning * 14;
      materials.sky.uniforms.uZenith.value.copy(weather.skyTop);
      materials.sky.uniforms.uHorizon.value.copy(weather.skyHorizon);
      materials.sky.uniforms.uHaze.value.copy(weather.skyHaze);
      materials.sky.uniforms.uSunColor.value.copy(weather.sunColor);
      materials.sky.uniforms.uLightning.value = lightning;
      shaderUniforms.skySunDirection.value.copy(weather.sunDirection);
      shaderUniforms.roadWetness.value = weather.roadWetness;
      shaderUniforms.snowCover.value = weather.snowCover;
      renderer.toneMappingExposure = weather.exposure + lightning * 0.045;
      ambientLight.intensity = weather.ambientIntensity + lightning * 0.045;
      hemiLight.intensity = weather.hemiIntensity + lightning * 0.08;
      hemiSkyColor.copy(weather.skyHorizon).lerp(lightningSkyColor, weather.snowCover * 0.22 + lightning * 0.2);
      hemiGroundColor.set(0x344f30).lerp(snowyGroundColor, weather.snowCover * 0.42);
      hemiLight.color.copy(hemiSkyColor);
      hemiLight.groundColor.copy(hemiGroundColor);
      sun.color.copy(weather.sunColor).lerp(lightningSunColor, lightning * 0.65);
      sun.intensity = weather.sunIntensity + lightning * 2.1;
      sun.position.copy(weather.sunPosition);
      fillLight.intensity = weather.fillIntensity + lightning * 0.2;
      rimLight.intensity = weather.rimIntensity + lightning * 0.8;
      rimLight.color.copy(weather.skyHaze).lerp(lightningRimColor, 0.14 + lightning * 0.4);
      lightningLight.position.set(state.weatherState.lightningX, 18, -42);
      lightningLight.intensity = lightning * 4.8;
      lightningLight.distance = 95;
      sunBlock.position.set(weather.sunPosition.x * 1.18, weather.sunPosition.y + 1.5, weather.sunPosition.z * 1.55);
      sunBlock.visible = weather.sunIntensity > 0.45 && weather.thunderAmount < 0.75;
      materials.sunBlock.color.copy(weather.sunColor);
      materials.cloud.opacity = weather.cloudOpacity;
      materials.lampHead.emissiveIntensity = weather.lampIntensity;
      materials.lampGlow.opacity = weather.lampGlowOpacity * accentBloomAmount;
      materials.headlight.emissiveIntensity = 0.12 + weather.headlightBoost * 0.92;
      materials.taillight.emissiveIntensity = 0.5 + weather.headlightBoost * 0.5;
      materials.reflector.emissiveIntensity = 0.05 + weather.headlightBoost * 0.42;
      materials.headlightGlow.opacity = lightBloomAmount * (0.012 + weather.headlightBoost * 0.052);
      materials.headlightReflection.opacity = weather.roadWetness * (0.006 + weather.headlightBoost * 0.04);
      materials.puddle.opacity = weather.roadWetness * (0.08 + weather.rainAmount * 0.055);
      wetSurfaceObjects.forEach((puddle) => {
        puddle.visible = materials.puddle.opacity > 0.025;
      });
      materials.road.roughness = lerp(0.82, 0.22, weather.roadWetness);
      materials.roadPatch.roughness = lerp(0.86, 0.2, weather.roadWetness);
      materials.shoulder.roughness = lerp(0.95, 0.48, weather.roadWetness);
      materials.shoulderLight.roughness = lerp(0.96, 0.52, weather.roadWetness);
      materials.road.envMapIntensity = 0.9 + weather.roadWetness * 0.85;
      materials.roadPatch.envMapIntensity = 1.05 + weather.roadWetness * 1.1;
      materials.playerBody.envMapIntensity = 1.2 + weather.roadWetness * 0.46 + weather.thunderAmount * 0.14;
      materials.playerAccent.envMapIntensity = 1.05 + weather.roadWetness * 0.32;
      materials.glass.envMapIntensity = 1.3 + weather.roadWetness * 0.44;
      materials.chrome.envMapIntensity = 1.18 + weather.roadWetness * 0.42;
      materials.rim.envMapIntensity = 1.35 + weather.roadWetness * 0.38;
      tintMaterialToward(materials.ground, snowTintColor, weather.snowCover * 0.34);
      tintMaterialToward(materials.grassDark, snowTintColor, weather.snowCover * 0.38);
      tintMaterialToward(materials.grassLight, snowTintColor, weather.snowCover * 0.34);
      tintMaterialToward(materials.field, snowTintColor, weather.snowCover * 0.32);
      tintMaterialToward(materials.crop, snowTintColor, weather.snowCover * 0.24);
      tintMaterialToward(materials.leaves, snowTintColor, weather.snowCover * 0.3);
      tintMaterialToward(materials.leavesDark, snowTintColor, weather.snowCover * 0.34);
      tintMaterialToward(materials.bush, snowTintColor, weather.snowCover * 0.28);
      tintMaterialToward(materials.mountain, coldRockColor, weather.snowCover * 0.28);
      tintMaterialToward(materials.barrier, snowTintColor, weather.snowCover * 0.08);
      tintMaterialToward(materials.barrierTop, snowTintColor, weather.snowCover * 0.08);
      tintMaterialToward(materials.shoulder, snowTintColor, weather.snowCover * 0.12);
      tintMaterialToward(materials.shoulderLight, snowTintColor, weather.snowCover * 0.1);
      tintMaterialToward(materials.sidewalk, snowTintColor, weather.snowCover * 0.12);
      tintMaterialToward(materials.curb, snowTintColor, weather.snowCover * 0.1);
      tintMaterialToward(materials.cityWall, snowTintColor, weather.snowCover * 0.08);
      tintMaterialToward(materials.cityWallCool, snowTintColor, weather.snowCover * 0.08);
      tintMaterialToward(materials.cityDarkWall, snowTintColor, weather.snowCover * 0.06);
      tintMaterialToward(materials.planter, snowTintColor, weather.snowCover * 0.08);
      if (bloomPass && cinematicPass) {
        bloomPass.strength = weather.bloomStrength + accentBloomAmount * 0.035 + lightBloomAmount * speedProgress * 0.024 + lightning * 0.24;
        bloomPass.radius = 0.42 + accentBloomAmount * 0.12;
        bloomPass.threshold = Math.max(0.68, weather.bloomThreshold - accentBloomAmount * 0.035);
        cinematicPass.uniforms.uTint.value.set(weather.gradeTint.r, weather.gradeTint.g, weather.gradeTint.b);
        cinematicPass.uniforms.uSaturation.value = weather.saturation;
        cinematicPass.uniforms.uContrast.value = weather.contrast;
      }
    }

    function resetGame() {
      state.started = true;
      state.gameOver = false;
      state.score = 0;
      state.speed = START_SPEED;
      state.lane = 1;
      state.targetX = 0;
      state.lastUiScore = -1;
      state.lastUiSpeed = -1;
      player.position.set(0, 0, PLAYER_Z);
      player.rotation.set(0, 0, 0);
      state.obstacles.forEach((obstacle, index) => {
        obstacle.position.z = -38 - index * 24;
        obstacle.position.x = LANES[Math.floor(Math.random() * LANES.length)];
        obstacle.userData.passed = false;
      });
      setScore(0);
      setSpeedKmh(speedToKmh(START_SPEED));
      setGameOver(false);
      setCrashFlash(false);
      setStarted(true);
    }
    state.resetGame = resetGame;

    function moveLane(direction) {
      if (!state.started || state.gameOver) return;
      state.lane = clamp(state.lane + direction, 0, LANES.length - 1);
      state.targetX = LANES[state.lane];
    }
    state.moveLane = moveLane;

    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (["arrowleft", "a"].includes(key)) moveLane(-1);
      if (["arrowright", "d"].includes(key)) moveLane(1);
      if ([" ", "enter"].includes(key) && (!state.started || state.gameOver)) resetGame();
    };
    window.addEventListener("keydown", onKeyDown, { passive: true });
    let crashFlashTimer = null;

    function intersectsFast(a, b) {
      return (
        Math.abs(a.position.x - b.position.x) < a.userData.halfW + b.userData.halfW &&
        Math.abs(a.position.z - b.position.z) < a.userData.halfZ + b.userData.halfZ
      );
    }

    let bloomPass = null;
    let cinematicPass = null;

    if (enablePostProcessing) {
      const renderPass = new RenderPass(scene, camera);
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(mount.clientWidth, mount.clientHeight),
        WEATHER_PRESETS.clear_noon.bloomStrength,
        0.5,
        WEATHER_PRESETS.clear_noon.bloomThreshold
      );
      cinematicPass = new ShaderPass(CINEMATIC_SHADER);
      // ── FIX: uGrain = 0 — removes the constant screen grain/texture overlay ──
      cinematicPass.uniforms.uGrain.value = 0;
      cinematicPass.uniforms.uVignette.value = 1.18;
      cinematicPass.uniforms.uChromatic.value = 0.0016;
      cinematicPass.uniforms.uSaturation.value = WEATHER_PRESETS.clear_noon.saturation;
      cinematicPass.uniforms.uContrast.value = WEATHER_PRESETS.clear_noon.contrast;
      composer = new EffectComposer(renderer);
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(cinematicPass);
      composer.addPass(new OutputPass());
    }

    applyRenderSize();

    // ── PERF: reflection update intervals — low-power every 12 frames, high every 6 ──
    let reflectionFrame = 0;
    const reflectionInterval = isLowPowerDevice ? 12 : 6;

    function animate() {
      state.animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.033);
      lastFrameTime = now;
      const frameScale = dt * 60;
      frameBudgetTotal += dt * 1000;
      frameBudgetSamples += 1;

      // ── PERF: quality check every 120 frames (was 90) ──
      if (frameBudgetSamples >= 120 && now - lastQualityChange > 1500) {
        const averageFrameMs = frameBudgetTotal / frameBudgetSamples;
        const nextQuality = averageFrameMs > TARGET_FRAME_MS
          ? Math.max(minRenderQuality, renderQuality - 0.08)
          : averageFrameMs < 14
            ? Math.min(1, renderQuality + 0.04)
            : renderQuality;
        if (Math.abs(nextQuality - renderQuality) > 0.001) {
          renderQuality = nextQuality;
          applyRenderSize();
          lastQualityChange = now;
        }
        frameBudgetTotal = 0;
        frameBudgetSamples = 0;
      }

      const moving = state.started && !state.gameOver;
      const roadMove = (moving ? state.speed : 0.012) * frameScale;
      const nowSeconds = now * 0.001;
      const weather = sampleWeather(dt);

      for (let i = 0; i < state.animatedRoadItems.length; i++) {
        const item = state.animatedRoadItems[i];
        item.object.position.z += roadMove * item.speedMul;
        if (item.object.position.z > item.resetAfter) {
          item.object.position.z -= item.resetBy;
        }
      }

      updateWeatherParticles(weatherParticles.rain, weather.rainAmount, frameScale, roadMove, nowSeconds);
      updateWeatherParticles(weatherParticles.snow, weather.snowAmount, frameScale, roadMove, nowSeconds);

      const wheelSpin = (moving ? state.speed * 2.8 : 0.025) * frameScale;
      for (let i = 0; i < state.wheelGroups.length; i++) {
        state.wheelGroups[i].rotation.x -= wheelSpin;
      }

      if (moving) {
        state.score += 0.2 * frameScale;
        state.speed = Math.min(MAX_SPEED, START_SPEED + state.score / 2400);
        const nextUiScore = Math.floor(state.score);
        if (nextUiScore !== state.lastUiScore) {
          state.lastUiScore = nextUiScore;
          setScore(nextUiScore);
        }
        const nextUiSpeed = speedToKmh(state.speed);
        if (nextUiSpeed !== state.lastUiSpeed) {
          state.lastUiSpeed = nextUiSpeed;
          setSpeedKmh(nextUiSpeed);
        }
        player.position.x += (state.targetX - player.position.x) * Math.min(1, 0.16 * frameScale);
        player.position.y = Math.sin(now * 0.013) * 0.015;
        const steer = state.targetX - player.position.x;
        player.rotation.z = steer * -0.06;
        player.rotation.y = steer * -0.04;
        for (let i = 0; i < state.obstacles.length; i++) {
          const obstacle = state.obstacles[i];
          obstacle.position.z += state.speed * frameScale;
          if (!obstacle.userData.passed && obstacle.position.z > player.position.z) {
            obstacle.userData.passed = true;
            state.score += 25;
          }
          if (obstacle.position.z > 14) {
            obstacle.position.z = -76 - Math.random() * 34;
            obstacle.position.x = LANES[Math.floor(Math.random() * LANES.length)];
            obstacle.userData.passed = false;
          }
          if (intersectsFast(player, obstacle)) {
            state.gameOver = true;
            setGameOver(true);
            setCrashFlash(true);
            if (crashFlashTimer) window.clearTimeout(crashFlashTimer);
            crashFlashTimer = window.setTimeout(() => setCrashFlash(false), 180);
            break;
          }
        }
      } else {
        player.rotation.z *= 0.92;
        player.rotation.y *= 0.92;
      }

      const targetFov = moving ? 58 + state.speed * 6 : 58;
      camera.fov += (targetFov - camera.fov) * 0.08 * frameScale;
      camera.updateProjectionMatrix();

      const speedProgress = (state.speed - START_SPEED) / (MAX_SPEED - START_SPEED);
      applyWeatherVisuals(weather, speedProgress);
      const narrowViewportBonus = camera.aspect < 0.8 ? CAMERA_MOBILE_Z_BONUS : 0;
      const cameraTargetX = player.position.x;
      camera.position.x += (cameraTargetX - camera.position.x) * 0.08 * frameScale;
      camera.position.y += (CAMERA_BASE_Y - speedProgress * 0.04 - camera.position.y) * 0.035 * frameScale;
      camera.position.z += (CAMERA_BASE_Z + narrowViewportBonus - speedProgress * 0.2 - camera.position.z) * 0.035 * frameScale;
      camera.lookAt(cameraTargetX, 0.72 + speedProgress * 0.04, 1.62 - speedProgress * 0.24);

      shaderUniforms.time.value = nowSeconds;
      shaderUniforms.speed.value = speedProgress;
      if (bloomPass && cinematicPass) {
        cinematicPass.uniforms.uTime.value = nowSeconds;
        cinematicPass.uniforms.uSpeed.value = speedProgress;
      }

      reflectionFrame += 1;
      if (reflectionFrame % reflectionInterval === 0) {
        playerReflectionCamera.position.copy(player.position);
        playerReflectionCamera.position.y += 0.72;
        player.visible = false;
        playerReflectionCamera.update(renderer, scene);
        player.visible = true;
      }

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    }

    animate();

    let resizeFrame = null;
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        if (!mount) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        if (bloomPass) bloomPass.resolution.set(mount.clientWidth, mount.clientHeight);
        applyRenderSize();
      });
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(state.animationId);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      if (crashFlashTimer) window.clearTimeout(crashFlashTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (composer) composer.dispose();
      environmentTexture.dispose();
      cubeReflectionTarget.dispose();
      pmremGenerator.dispose();
      scene.environment = null;
      scene.traverse((object) => {
        if (object.material && !Object.values(materials).includes(object.material) && !obstacleMaterials.includes(object.material)) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
      obstacleMaterials.forEach((material) => material.dispose());
      state.obstacles = [];
      state.animatedRoadItems = [];
      state.wheelGroups = [];
      state.moveLane = null;
      state.weatherState = null;
    };
  }, []);

  const startOrRestart = () => gameRef.current.resetGame?.();
  const moveLane = (direction) => gameRef.current.moveLane?.(direction);
  const handleLaneControl = (direction) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    moveLane(direction);
  };
  const handleStagePointerDown = (event) => {
    if (event.pointerType === "mouse") return;
    swipeStartXRef.current = event.clientX;
  };
  const handleStagePointerUp = (event) => {
    if (event.pointerType === "mouse" || swipeStartXRef.current === null) return;
    const deltaX = event.clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (Math.abs(deltaX) > 36) moveLane(deltaX > 0 ? 1 : -1);
  };

  const speedPercent = clamp((speedKmh - SPEED_KMH_MIN) / (SPEED_KMH_MAX - SPEED_KMH_MIN), 0, 1);
  const speedArc = Math.round(speedPercent * 260);
  const speedGaugeStyle = {
    background: `conic-gradient(from -130deg, #22d3ee 0deg, #facc15 ${speedArc}deg, rgba(255,255,255,0.16) ${speedArc}deg 260deg, transparent 260deg 360deg)`,
  };
  const actionLabel = gameOver ? "RETRY" : started ? "RESET" : "START";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-[#06101d] text-white"
      style={{ minHeight: "100vh", height: "100dvh" }}
    >
      <div
        className="relative h-[100svh] min-h-[540px] w-full overflow-hidden bg-slate-900 touch-none select-none"
        style={{ minHeight: 540, height: "100dvh", width: "100%" }}
        onPointerDown={handleStagePointerDown}
        onPointerUp={handleStagePointerUp}
      >
        <div ref={mountRef} className="h-full w-full" style={{ height: "100%", width: "100%" }} />

        <div className="pointer-events-none absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-3 sm:left-6 sm:right-6 sm:top-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="min-w-24 rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 shadow-xl backdrop-blur-md sm:min-w-28">
              <div className="text-[10px] font-semibold uppercase text-cyan-200">Score</div>
              <div className="text-2xl font-black leading-none tabular-nums sm:text-3xl">{score}</div>
            </div>
            <div className="relative h-20 w-20 rounded-full border border-white/15 bg-slate-950/70 shadow-xl backdrop-blur-md sm:h-24 sm:w-24">
              <div className="absolute inset-1 rounded-full" style={speedGaugeStyle} />
              <div className="absolute inset-3 rounded-full bg-slate-950/95 shadow-inner" />
              <div
                className="absolute left-1/2 top-1/2 h-[2px] w-[31%] origin-left rounded-full bg-amber-200 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
                style={{ transform: `rotate(${-130 + speedPercent * 260}deg)` }}
              />
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-xl font-black leading-none tabular-nums sm:text-2xl">{speedKmh}</div>
                  <div className="text-[9px] font-semibold uppercase text-slate-300">km/h</div>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={startOrRestart}
            className="pointer-events-auto rounded-lg border border-white/20 bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-xl transition hover:bg-cyan-100 active:scale-95 sm:px-5"
          >
            {actionLabel}
          </button>
        </div>

        {!started && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/30 p-5 backdrop-blur-[2px]">
            <div className="w-full max-w-xs rounded-lg border border-white/15 bg-slate-950/78 p-5 text-center shadow-2xl backdrop-blur-md">
              <div className="mb-4 h-1.5 rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-red-400" />
              <button
                onClick={(event) => { event.stopPropagation(); startOrRestart(); }}
                className="w-full rounded-lg bg-white px-6 py-4 text-lg font-black text-slate-950 shadow-xl transition hover:bg-cyan-100 active:scale-95"
              >
                START RUN
              </button>
              <div className="mt-4 flex justify-center gap-2 text-xs font-semibold text-slate-300">
                <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1">A</span>
                <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1">D</span>
                <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1">SWIPE</span>
              </div>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-red-950/28 p-5 backdrop-blur-[2px]">
            <div className="w-full max-w-xs rounded-lg border border-red-300/25 bg-slate-950/84 p-5 text-center shadow-2xl backdrop-blur-md">
              <div className="text-xs font-black uppercase text-red-200">Crash</div>
              <div className="mt-1 text-5xl font-black leading-none tabular-nums">{score}</div>
              <button
                onClick={(event) => { event.stopPropagation(); startOrRestart(); }}
                className="mt-5 w-full rounded-lg bg-white px-6 py-4 text-base font-black text-slate-950 shadow-xl transition hover:bg-red-100 active:scale-95"
              >
                RETRY
              </button>
            </div>
          </div>
        )}

        {crashFlash && <div className="pointer-events-none absolute inset-0 z-30 bg-white/30" />}

        <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden items-center gap-2 rounded-lg border border-white/10 bg-slate-950/64 px-3 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md sm:flex">
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white">A</span>
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white">D</span>
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white">←</span>
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white">→</span>
          <span className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-white">SPACE</span>
        </div>

        {started && !gameOver && (
          <div className="absolute inset-x-0 bottom-5 z-20 flex items-end justify-between px-5 sm:hidden">
            <div className="flex gap-3">
              <button
                aria-label="Move left"
                onPointerDown={handleLaneControl(-1)}
                className="h-16 w-16 rounded-lg border border-white/18 bg-slate-950/70 text-4xl font-black text-white shadow-xl backdrop-blur-md active:scale-95"
              >
                ‹
              </button>
              <button
                aria-label="Move right"
                onPointerDown={handleLaneControl(1)}
                className="h-16 w-16 rounded-lg border border-white/18 bg-slate-950/70 text-4xl font-black text-white shadow-xl backdrop-blur-md active:scale-95"
              >
                ›
              </button>
            </div>
            <button
              onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); startOrRestart(); }}
              className="h-14 rounded-lg border border-white/18 bg-white/90 px-5 text-xs font-black text-slate-950 shadow-xl backdrop-blur-md active:scale-95"
            >
              RESET
            </button>
          </div>
        )}
      </div>
    </div>
  );
}