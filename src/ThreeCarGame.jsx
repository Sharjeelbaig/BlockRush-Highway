import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const LANES = [-2.55, 0, 2.55];
const PLAYER_Z = 3.2;
const ROAD_RESET_Z = 18;
const FAR_RESET_AMOUNT = 116;
const START_SPEED = 0.18;
const MAX_SPEED = 0.52;
const SPEED_KMH_MIN = 68;
const SPEED_KMH_MAX = 224;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

    let lastFrameTime = performance.now();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fd0ff);
    scene.fog = new THREE.Fog(0x8fd0ff, 24, 96);

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 6.2, 10);
    camera.lookAt(0, 1, -10);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.34);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xc9ecff, 0x4c683a, 1.0);
    scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff0c7, 2.25);
    sun.position.set(-12, 20, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.00012;
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0xcfe8ff, 0.38);
    fillLight.position.set(8, 6, 12);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.48);
    rimLight.position.set(0, 4, -12);
    scene.add(rimLight);

    const world = new THREE.Group();
    scene.add(world);

    const materials = {
      ground: new THREE.MeshStandardMaterial({ color: 0x4ea85a, roughness: 1 }),
      grassDark: new THREE.MeshStandardMaterial({ color: 0x3f8f49, roughness: 1 }),
      grassLight: new THREE.MeshStandardMaterial({ color: 0x72b75d, roughness: 1 }),
      field: new THREE.MeshStandardMaterial({ color: 0x8fb85b, roughness: 1 }),
      crop: new THREE.MeshStandardMaterial({ color: 0xd0b85a, roughness: 0.96 }),
      road: new THREE.MeshStandardMaterial({ color: 0x262d35, roughness: 0.92, metalness: 0.02 }),
      roadPatch: new THREE.MeshStandardMaterial({ color: 0x343b44, roughness: 0.95, metalness: 0.01 }),
      tireMark: new THREE.MeshBasicMaterial({ color: 0x0e1116, transparent: true, opacity: 0.22, depthWrite: false }),
      shoulder: new THREE.MeshStandardMaterial({ color: 0x4e5459, roughness: 0.95 }),
      shoulderLight: new THREE.MeshStandardMaterial({ color: 0x687075, roughness: 0.96 }),
      laneLine: new THREE.MeshBasicMaterial({ color: 0xf8f8f0 }),
      edgeLine: new THREE.MeshBasicMaterial({ color: 0xffdf77 }),
      rumbleRed: new THREE.MeshStandardMaterial({ color: 0xc83f3f, roughness: 0.9 }),
      rumbleWhite: new THREE.MeshStandardMaterial({ color: 0xf4f4ee, roughness: 0.85 }),
      barrier: new THREE.MeshStandardMaterial({ color: 0xd4d8dc, roughness: 0.8 }),
      barrierTop: new THREE.MeshStandardMaterial({ color: 0x9ca6ad, roughness: 0.75, metalness: 0.08 }),
      reflector: new THREE.MeshStandardMaterial({ color: 0xffdc6a, emissive: 0xff9f1c, emissiveIntensity: 0.55, roughness: 0.25 }),
      signPost: new THREE.MeshStandardMaterial({ color: 0x8a949b, roughness: 0.45, metalness: 0.45 }),
      signBoard: new THREE.MeshStandardMaterial({ color: 0x1d7a5d, roughness: 0.65 }),
      signBack: new THREE.MeshStandardMaterial({ color: 0x28343f, roughness: 0.7 }),
      lampPost: new THREE.MeshStandardMaterial({ color: 0x5d6872, roughness: 0.5, metalness: 0.35 }),
      lampHead: new THREE.MeshStandardMaterial({ color: 0xffe8a3, emissive: 0xffc857, emissiveIntensity: 0.8, roughness: 0.35 }),
      mountain: new THREE.MeshStandardMaterial({ color: 0x74879a, roughness: 1 }),
      mountainSnow: new THREE.MeshStandardMaterial({ color: 0xe6f5ff, roughness: 0.85 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 1 }),
      leaves: new THREE.MeshStandardMaterial({ color: 0x237a3b, roughness: 1 }),
      leavesDark: new THREE.MeshStandardMaterial({ color: 0x155f32, roughness: 1 }),
      bush: new THREE.MeshStandardMaterial({ color: 0x2e8a47, roughness: 1 }),
      flower: new THREE.MeshStandardMaterial({ color: 0xf7d15d, roughness: 0.8 }),
      buildingWall: new THREE.MeshStandardMaterial({ color: 0xd7c5a1, roughness: 0.9 }),
      buildingRoof: new THREE.MeshStandardMaterial({ color: 0x9b3d31, roughness: 0.85 }),
      window: new THREE.MeshStandardMaterial({ color: 0x8ed7ff, emissive: 0x2d75a6, emissiveIntensity: 0.14, roughness: 0.2, metalness: 0.15 }),
      chimney: new THREE.MeshStandardMaterial({ color: 0x7d5140, roughness: 0.9 }),
      cloud: new THREE.MeshBasicMaterial({ color: 0xf5fbff, transparent: true, opacity: 0.78, depthWrite: false }),
      sunBlock: new THREE.MeshBasicMaterial({ color: 0xffd166 }),
      playerBody: new THREE.MeshStandardMaterial({ color: 0xf12a45, roughness: 0.28, metalness: 0.36 }),
      playerAccent: new THREE.MeshStandardMaterial({ color: 0x121823, roughness: 0.42, metalness: 0.18 }),
      black: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.18 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x9fdcff, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.82 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.18, metalness: 0.9 }),
      grille: new THREE.MeshStandardMaterial({ color: 0x0b0f15, roughness: 0.55, metalness: 0.55 }),
      plate: new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
      wheel: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }),
      rim: new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.28, metalness: 0.9 }),
      headlight: new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffdd88, emissiveIntensity: 1.35, roughness: 0.25, metalness: 0.15 }),
      headlightGlow: new THREE.MeshBasicMaterial({ color: 0xffe8a3, transparent: true, opacity: 0.18, depthWrite: false }),
      taillight: new THREE.MeshStandardMaterial({ color: 0xff5050, emissive: 0xff2222, emissiveIntensity: 1.25, roughness: 0.25, metalness: 0.1 }),
      contactShadow: new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    };

    const geometries = {
      ground: new THREE.BoxGeometry(150, 0.2, 220),
      grassTile: new THREE.BoxGeometry(5.2, 0.05, 5.2),
      fieldStrip: new THREE.BoxGeometry(5.8, 0.08, 2.1),
      cropRow: new THREE.BoxGeometry(0.12, 0.16, 2.3),
      road: new THREE.BoxGeometry(8, 0.12, 120),
      roadPatch: new THREE.BoxGeometry(1.35, 0.025, 2.2),
      tireMark: new THREE.BoxGeometry(0.12, 0.025, 4.5),
      shoulder: new THREE.BoxGeometry(0.4, 0.06, 120),
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
      cloudBlock: new THREE.BoxGeometry(1.4, 0.7, 0.7),
      sunBlock: new THREE.BoxGeometry(2.2, 2.2, 0.08),
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
      windshield: new THREE.BoxGeometry(0.86, 0.28, 0.35),
      rearGlass: new THREE.BoxGeometry(0.82, 0.22, 0.28),
      bumper: new THREE.BoxGeometry(1.18, 0.14, 0.18),
      headlight: new THREE.BoxGeometry(0.18, 0.1, 0.08),
      taillight: new THREE.BoxGeometry(0.2, 0.1, 0.08),
      tire: new THREE.CylinderGeometry(0.24, 0.24, 0.26, 16),
      rim: new THREE.CylinderGeometry(0.13, 0.13, 0.27, 12),
      obstacleBody: new THREE.BoxGeometry(1.25, 0.42, 2.05),
      obstacleCabin: new THREE.BoxGeometry(0.85, 0.36, 0.85),
      obstacleGlass: new THREE.BoxGeometry(0.75, 0.22, 0.6),
      obstacleWheel: new THREE.CylinderGeometry(0.21, 0.21, 0.22, 14),
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

    function trackRoadItem(object, resetAfter = ROAD_RESET_Z, resetBy = FAR_RESET_AMOUNT, speedMul = 1.9) {
      state.animatedRoadItems.push({ object, resetAfter, resetBy, speedMul });
      return object;
    }

    addMesh(geometries.ground, materials.ground, [0, -0.18, -50]);
    addMesh(geometries.road, materials.road, [0, -0.05, -40]);
    addMesh(geometries.shoulder, materials.shoulder, [-4.2, 0, -40]);
    addMesh(geometries.shoulder, materials.shoulder, [4.2, 0, -40]);

    addMesh(geometries.sunBlock, materials.sunBlock, [-19, 12.5, -48], world, false, false);

    function addTrackedMesh(geometry, material, position, resetAfter = ROAD_RESET_Z, resetBy = FAR_RESET_AMOUNT, speedMul = 1.9) {
      return trackRoadItem(addMesh(geometry, material, position, world, false, false), resetAfter, resetBy, speedMul);
    }

    for (let z = -95; z < 20; z += 6) {
      [-1.35, 1.35].forEach((x) => {
        addTrackedMesh(geometries.laneLine, materials.laneLine, [x, 0.035, z]);
      });
    }

    for (let z = -98; z < 22; z += 4.8) {
      [-3.82, 3.82].forEach((x) => {
        addTrackedMesh(geometries.edgeLine, materials.edgeLine, [x, 0.04, z], 22, 124, 1.9);
      });
    }

    for (let z = -106; z < 22; z += 5.6) {
      const lane = LANES[Math.floor(Math.random() * LANES.length)];
      addTrackedMesh(geometries.roadPatch, materials.roadPatch, [lane + (Math.random() - 0.5) * 0.55, 0.03, z], 22, 128, 1.9);

      if (Math.random() > 0.45) {
        const mark = addTrackedMesh(geometries.tireMark, materials.tireMark, [lane + 0.34, 0.045, z - 1.4], 22, 128, 1.9);
        mark.rotation.y = (Math.random() - 0.5) * 0.06;
      }
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
      addMesh(geometries.barrier, materials.barrier, [0, 0.22, 0], group, true, true);
      addMesh(geometries.barrierTop, materials.barrierTop, [0, 0.52, 0], group, true, true);
      addMesh(geometries.reflector, materials.reflector, [-side * 0.24, 0.45, -0.64], group, false, false);
      addMesh(geometries.reflector, materials.reflector, [-side * 0.24, 0.45, 0.64], group, false, false);
      group.position.set(x, 0, z);
      world.add(group);
      trackRoadItem(group, 22, 124, 1.9);
    }

    for (let z = -100; z < 25; z += 5) {
      [-5.3, 5.3].forEach((x) => {
        createBarrierSegment(x, z, Math.sign(x));
      });
    }

    function createCloud(x, y, z, scale = 1) {
      const group = new THREE.Group();
      [
        [-0.8, 0, 0],
        [0, 0.2, 0],
        [0.88, 0.02, 0],
        [0.28, -0.16, 0.15],
      ].forEach(([px, py, pz], index) => {
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
      addMesh(geometries.fencePost, materials.barrier, [0, 0.36, -1.18], group, true, true);
      addMesh(geometries.fencePost, materials.barrier, [0, 0.36, 1.18], group, true, true);
      addMesh(geometries.fenceRail, materials.barrierTop, [0, 0.55, 0], group, true, true);
      group.position.set(x, 0, z);
      world.add(group);
      trackRoadItem(group, 24, 128, 1.65);
    }

    for (let z = -102; z < 24; z += 8) {
      [-7.1, 7.1].forEach((x) => createFenceSegment(x, z));
    }

    function createTree(x, z) {
      const group = new THREE.Group();
      addMesh(geometries.trunk, materials.trunk, [0, 0.6, 0], group, true, false);
      addMesh(geometries.leaves, materials.leavesDark, [0, 1.55, 0], group, true, false);
      addMesh(geometries.leaves, materials.leaves, [0, 2.1, 0], group, true, false).scale.setScalar(0.82);
      addMesh(geometries.bush, materials.bush, [0.45, 0.24, 0.15], group, true, true);
      group.position.set(x, 0, z);
      group.scale.setScalar(0.85 + Math.random() * 0.65);
      world.add(group);
      trackRoadItem(group, 24, 132, 1.7);
    }

    function createCropPatch(x, z) {
      const group = new THREE.Group();
      addMesh(geometries.fieldStrip, materials.field, [0, 0.02, 0], group, false, true);
      for (let i = -2; i <= 2; i++) {
        addMesh(geometries.cropRow, materials.crop, [i * 0.48, 0.16, 0], group, true, false);
      }
      group.position.set(x, -0.02, z);
      world.add(group);
      trackRoadItem(group, 24, 132, 1.48);
    }

    function createRoadSign(side, z) {
      const group = new THREE.Group();
      addMesh(geometries.signPost, materials.signPost, [0, 0.95, 0], group, true, true);
      addMesh(geometries.signBoard, materials.signBoard, [0, 1.85, 0], group, true, false);
      addMesh(geometries.signBoard, materials.signBack, [0, 1.82, -0.08], group, true, false).scale.set(0.88, 0.7, 0.55);
      addMesh(geometries.reflector, materials.reflector, [-0.52, 1.98, 0.08], group, false, false);
      addMesh(geometries.reflector, materials.reflector, [0.52, 1.98, 0.08], group, false, false);
      group.position.set(side * 6.8, 0, z);
      group.rotation.y = side < 0 ? 0.04 : -0.04;
      world.add(group);
      trackRoadItem(group, 26, 140, 1.8);
    }

    function createLamp(side, z) {
      const group = new THREE.Group();
      addMesh(geometries.lampPole, materials.lampPost, [0, 1.55, 0], group, true, true);
      addMesh(geometries.lampArm, materials.lampPost, [-side * 0.42, 3.04, 0], group, true, true);
      addMesh(geometries.lampHead, materials.lampHead, [-side * 0.94, 2.98, 0], group, false, false);
      group.position.set(side * 5.85, 0, z);
      world.add(group);
      trackRoadItem(group, 26, 132, 1.75);
    }

    function createHouse(side, z, index) {
      const group = new THREE.Group();
      addMesh(geometries.houseBody, materials.buildingWall, [0, 0.8, 0], group, true, true);

      const roof = addMesh(geometries.houseRoof, materials.buildingRoof, [0, 1.92, 0], group, true, true);
      roof.rotation.y = Math.PI * 0.25;

      addMesh(geometries.window, materials.window, [-0.66, 0.92, 1.22], group, false, false);
      addMesh(geometries.window, materials.window, [0.66, 0.92, 1.22], group, false, false);
      addMesh(geometries.chimney, materials.chimney, [0.72, 2.25, -0.4], group, true, true);
      group.position.set(side * (15 + (index % 3) * 3.4), 0, z);
      group.rotation.y = side < 0 ? 0.18 : -0.18;
      world.add(group);
      trackRoadItem(group, 30, 150, 1.25);
    }

    for (let z = -106; z < 24; z += 8) {
      [-1, 1].forEach((side) => {
        const sideOffset = 8 + Math.random() * 7;
        const tile = addTrackedMesh(
          geometries.grassTile,
          Math.random() > 0.5 ? materials.grassDark : materials.grassLight,
          [side * sideOffset, -0.055, z + (Math.random() - 0.5) * 2.4],
          24,
          132,
          1.55
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

    for (let z = -100; z < 20; z += 18) {
      createLamp(-1, z);
      createLamp(1, z + 9);
    }

    function createWheel(parent, x, y, z, tireGeometry = geometries.tire) {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(tireGeometry, materials.wheel);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(geometries.rim, materials.rim);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      wheelGroup.position.set(x, y, z);
      parent.add(wheelGroup);
      state.wheelGroups.push(wheelGroup);
      return wheelGroup;
    }

    function createPlayerCar() {
      const car = new THREE.Group();
      addContactShadow(car, geometries.contactShadowPlayer, 0.24);
      addMesh(geometries.carBody, materials.playerBody, [0, 0.45, 0], car, true, false);
      addMesh(geometries.carHood, materials.playerBody, [0, 0.62, 0.65], car, true, false);
      addMesh(geometries.carRear, materials.playerBody, [0, 0.62, -0.75], car, true, false);
      addMesh(geometries.hoodStripe, materials.playerAccent, [0, 0.74, 0.2], car, true, false);
      addMesh(geometries.sideSkirt, materials.playerAccent, [-0.72, 0.34, 0], car, true, false);
      addMesh(geometries.sideSkirt, materials.playerAccent, [0.72, 0.34, 0], car, true, false);
      addMesh(geometries.playerCabin, materials.black, [0, 0.88, -0.05], car, true, false);
      addMesh(geometries.roofScoop, materials.playerAccent, [0, 1.2, 0.04], car, true, false);

      const windshield = addMesh(geometries.windshield, materials.glass, [0, 0.96, 0.22], car, false, false);
      windshield.rotation.x = -0.35;

      const rearGlass = addMesh(geometries.rearGlass, materials.glass, [0, 0.98, -0.42], car, false, false);
      rearGlass.rotation.x = 0.25;

      addMesh(geometries.mirror, materials.black, [-0.76, 0.84, 0.28], car, true, false);
      addMesh(geometries.mirror, materials.black, [0.76, 0.84, 0.28], car, true, false);
      addMesh(geometries.bumper, materials.chrome, [0, 0.41, 1.18], car, false, false);
      addMesh(geometries.bumper, materials.chrome, [0, 0.41, -1.18], car, false, false);
      addMesh(geometries.grille, materials.grille, [0, 0.5, 1.25], car, false, false);
      addMesh(geometries.plate, materials.plate, [0, 0.34, 1.31], car, false, false);
      addMesh(geometries.plate, materials.plate, [0, 0.34, -1.31], car, false, false);
      addMesh(geometries.spoiler, materials.playerAccent, [0, 0.95, -1.02], car, true, false);
      addMesh(geometries.exhaust, materials.chrome, [-0.38, 0.23, -1.33], car, false, false);
      addMesh(geometries.exhaust, materials.chrome, [0.38, 0.23, -1.33], car, false, false);
      addMesh(geometries.headlight, materials.headlight, [-0.36, 0.5, 1.18], car, false, false);
      addMesh(geometries.headlight, materials.headlight, [0.36, 0.5, 1.18], car, false, false);
      addMesh(geometries.headlightBeam, materials.headlightGlow, [-0.36, 0.17, 2.28], car, false, false);
      addMesh(geometries.headlightBeam, materials.headlightGlow, [0.36, 0.17, 2.28], car, false, false);
      addMesh(geometries.taillight, materials.taillight, [-0.34, 0.5, -1.18], car, false, false);
      addMesh(geometries.taillight, materials.taillight, [0.34, 0.5, -1.18], car, false, false);

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
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 })
    );

    function createObstacleCar(z = -40) {
      const car = new THREE.Group();
      addContactShadow(car, geometries.contactShadowObstacle, 0.2);
      const bodyMaterial = obstacleMaterials[Math.floor(Math.random() * obstacleMaterials.length)];

      addMesh(geometries.obstacleBody, bodyMaterial, [0, 0.43, 0], car, true, false);
      addMesh(geometries.hoodStripe, materials.black, [0, 0.66, 0.08], car, true, false).scale.set(0.72, 0.75, 0.8);
      addMesh(geometries.obstacleCabin, materials.black, [0, 0.83, 0], car, true, false);
      addMesh(geometries.obstacleGlass, materials.glass, [0, 0.9, 0.05], car, false, false);
      addMesh(geometries.bumper, materials.chrome, [0, 0.38, 1.05], car, false, false).scale.set(0.9, 0.85, 0.8);
      addMesh(geometries.bumper, materials.chrome, [0, 0.38, -1.05], car, false, false).scale.set(0.9, 0.85, 0.8);
      addMesh(geometries.grille, materials.grille, [0, 0.48, 1.09], car, false, false).scale.set(0.72, 0.7, 0.8);
      addMesh(geometries.headlight, materials.headlight, [-0.32, 0.48, 1.08], car, false, false).scale.set(0.82, 0.82, 0.82);
      addMesh(geometries.headlight, materials.headlight, [0.32, 0.48, 1.08], car, false, false).scale.set(0.82, 0.82, 0.82);
      addMesh(geometries.taillight, materials.taillight, [-0.32, 0.47, -1.08], car, false, false).scale.set(0.8, 0.8, 0.8);
      addMesh(geometries.taillight, materials.taillight, [0.32, 0.47, -1.08], car, false, false).scale.set(0.8, 0.8, 0.8);
      addMesh(geometries.mirror, materials.black, [-0.7, 0.78, 0.2], car, true, false).scale.set(0.75, 0.75, 0.75);
      addMesh(geometries.mirror, materials.black, [0.7, 0.78, 0.2], car, true, false).scale.set(0.75, 0.75, 0.75);

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

    state.obstacles = [createObstacleCar(-20), createObstacleCar(-38), createObstacleCar(-56)];

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
        obstacle.position.z = -22 - index * 18;
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

      if (["arrowleft", "a"].includes(key)) {
        moveLane(-1);
      }

      if (["arrowright", "d"].includes(key)) {
        moveLane(1);
      }

      if ([" ", "enter"].includes(key)) {
        if (!state.started || state.gameOver) resetGame();
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: true });
    let crashFlashTimer = null;

    function intersectsFast(a, b) {
      return (
        Math.abs(a.position.x - b.position.x) < a.userData.halfW + b.userData.halfW &&
        Math.abs(a.position.z - b.position.z) < a.userData.halfZ + b.userData.halfZ
      );
    }

    function animate() {
      state.animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.033);
      lastFrameTime = now;
      const frameScale = dt * 60;

      const moving = state.started && !state.gameOver;
      const roadMove = (moving ? state.speed : 0.012) * frameScale;

      for (let i = 0; i < state.animatedRoadItems.length; i++) {
        const item = state.animatedRoadItems[i];
        item.object.position.z += roadMove * item.speedMul;
        if (item.object.position.z > item.resetAfter) {
          item.object.position.z -= item.resetBy;
        }
      }

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

          if (obstacle.position.z > 12) {
            obstacle.position.z = -52 - Math.random() * 24;
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

      const targetFov = moving ? 60 + state.speed * 12 : 60;
      camera.fov += (targetFov - camera.fov) * 0.08 * frameScale;
      camera.updateProjectionMatrix();

      const speedProgress = (state.speed - START_SPEED) / (MAX_SPEED - START_SPEED);
      camera.position.x += (player.position.x * 0.25 - camera.position.x) * 0.05 * frameScale;
      camera.position.y += (6.15 - speedProgress * 0.35 - camera.position.y) * 0.035 * frameScale;
      camera.position.z += (10 - speedProgress * 0.85 - camera.position.z) * 0.035 * frameScale;
      camera.lookAt(player.position.x * 0.2, 0.8 + speedProgress * 0.16, -8 - speedProgress * 1.2);

      renderer.render(scene, camera);
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
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      });
    };

    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(state.animationId);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      if (crashFlashTimer) window.clearTimeout(crashFlashTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }

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
    };
  }, []);

  const startOrRestart = () => {
    gameRef.current.resetGame?.();
  };

  const moveLane = (direction) => {
    gameRef.current.moveLane?.(direction);
  };

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

    if (Math.abs(deltaX) > 36) {
      moveLane(deltaX > 0 ? 1 : -1);
    }
  };

  const speedPercent = clamp((speedKmh - SPEED_KMH_MIN) / (SPEED_KMH_MAX - SPEED_KMH_MIN), 0, 1);
  const speedArc = Math.round(speedPercent * 260);
  const speedGaugeStyle = {
    background: `conic-gradient(from -130deg, #22d3ee 0deg, #facc15 ${speedArc}deg, rgba(255,255,255,0.16) ${speedArc}deg 260deg, transparent 260deg 360deg)`,
  };
  const actionLabel = gameOver ? "RETRY" : started ? "RESET" : "START";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#06101d] text-white">
      <div
        className="relative h-[100svh] min-h-[540px] w-full overflow-hidden bg-slate-900 touch-none select-none"
        onPointerDown={handleStagePointerDown}
        onPointerUp={handleStagePointerUp}
      >
        <div ref={mountRef} className="h-full w-full" />

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
                onClick={(event) => {
                  event.stopPropagation();
                  startOrRestart();
                }}
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
                onClick={(event) => {
                  event.stopPropagation();
                  startOrRestart();
                }}
                className="mt-5 w-full rounded-lg bg-white px-6 py-4 text-base font-black text-slate-950 shadow-xl transition hover:bg-red-100 active:scale-95"
              >
                RETRY
              </button>
            </div>
          </div>
        )}

        {crashFlash && (
          <div className="pointer-events-none absolute inset-0 z-30 bg-white/30" />
        )}

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
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                startOrRestart();
              }}
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
