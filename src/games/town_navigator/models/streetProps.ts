import * as THREE from 'three';
import type { PlacedBuilding } from '../townGenerator';

let sharedReady = false;

let vendingRedBodyMat!: THREE.MeshStandardMaterial;
let vendingBlueBodyMat!: THREE.MeshStandardMaterial;
let vendingGreenBodyMat!: THREE.MeshStandardMaterial;
let vendingDisplayMat!: THREE.MeshStandardMaterial;
let vendingDarkTrimMat!: THREE.MeshStandardMaterial;
let vendingChromeMat!: THREE.MeshStandardMaterial;

let postboxRedMat!: THREE.MeshStandardMaterial;
let postboxLogoMat!: THREE.MeshStandardMaterial;

let mirrorPoleMat!: THREE.MeshStandardMaterial;
let mirrorHoodMat!: THREE.MeshStandardMaterial;
let mirrorGlassMat!: THREE.MeshStandardMaterial;

let guardrailWhiteMat!: THREE.MeshStandardMaterial;
let guardrailLeafMat!: THREE.MeshStandardMaterial;

function getVendingDisplayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Clean illuminated acrylic showcase background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  // Top header band
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, 0, 256, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DRINKS • つめたい・あたたかい', 128, 20);

  // 3 shelves of colorful Japanese canned/bottled drinks
  const drinkColors = [
    '#ef4444', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#3b82f6', '#8b5cf6',
    '#10b981', '#eab308', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e',
  ];

  for (let row = 0; row < 3; row++) {
    const shelfY = 44 + row * 68;
    // Shelf rail
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(10, shelfY + 46, 236, 5);
    // Warm/cold indicator strip
    ctx.fillStyle = row === 2 ? '#ef4444' : '#38bdf8';
    ctx.fillRect(10, shelfY + 51, 236, 7);

    for (let col = 0; col < 7; col++) {
      const dx = 18 + col * 32;
      const color = drinkColors[(row * 7 + col) % drinkColors.length];
      ctx.fillStyle = color;
      ctx.fillRect(dx, shelfY + 6, 22, 38);
      // White label band
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(dx + 2, shelfY + 16, 18, 12);
      // Cap/rim highlight
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(dx + 4, shelfY + 2, 14, 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  return tex;
}

function getPostboxLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 128, 128);

  // Classic white Japan Post 〒 emblem
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(28, 28, 72, 12);
  ctx.fillRect(28, 50, 72, 12);
  ctx.fillRect(58, 50, 12, 52);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  return tex;
}

function ensureStreetPropResources(): void {
  if (sharedReady) return;
  sharedReady = true;

  vendingRedBodyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.25 });
  vendingBlueBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.25 });
  vendingGreenBodyMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35, metalness: 0.25 });

  const displayTex = getVendingDisplayTexture();
  vendingDisplayMat = new THREE.MeshStandardMaterial({
    map: displayTex,
    emissive: 0xffffff,
    emissiveMap: displayTex,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  vendingDisplayMat.userData.isSignageEmissive = true;

  vendingDarkTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
  vendingChromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.75 });

  postboxRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2 });
  postboxLogoMat = new THREE.MeshStandardMaterial({
    map: getPostboxLogoTexture(),
    roughness: 0.35,
  });

  mirrorPoleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.65 });
  mirrorHoodMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4, metalness: 0.1 });
  mirrorGlassMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.9 });

  guardrailWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.3 });
  guardrailLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });

  [
    vendingRedBodyMat,
    vendingBlueBodyMat,
    vendingGreenBodyMat,
    vendingDisplayMat,
    vendingDarkTrimMat,
    vendingChromeMat,
    postboxRedMat,
    postboxLogoMat,
    mirrorPoleMat,
    mirrorHoodMat,
    mirrorGlassMat,
    guardrailWhiteMat,
    guardrailLeafMat,
  ].forEach((mat) => {
    mat.userData.isSharedResource = true;
  });
}

/**
 * Iconic Japanese beverage vending machine (*Jidōhanbaiki*), 0.78m x 1.68m x 0.48m.
 */
export function buildVendingMachine(variant: 'RED' | 'BLUE' | 'GREEN'): THREE.Group {
  ensureStreetPropResources();
  const group = new THREE.Group();
  group.name = `Prop_VendingMachine_${variant}`;

  const bodyMat =
    variant === 'BLUE'
      ? vendingBlueBodyMat
      : variant === 'GREEN'
      ? vendingGreenBodyMat
      : vendingRedBodyMat;

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.68, 0.48), bodyMat);
  cabinet.position.y = 0.84;
  group.add(cabinet);

  // Illuminated front drink showcase
  const showcase = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.78), vendingDisplayMat);
  showcase.position.set(0, 1.16, 0.242);
  group.add(showcase);

  // Coin / bill acceptor panel
  const coinPanel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.03), vendingChromeMat);
  coinPanel.position.set(0.24, 0.62, 0.245);
  group.add(coinPanel);

  // Lower pickup flap recess
  const pickup = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.04), vendingDarkTrimMat);
  pickup.position.set(-0.04, 0.26, 0.235);
  group.add(pickup);

  return group;
}

/**
 * Iconic red Japanese rectangular postbox (*Yūbin-posuto*), 0.42m x 1.32m.
 */
export function buildJapanesePostbox(): THREE.Group {
  ensureStreetPropResources();
  const group = new THREE.Group();
  group.name = 'Prop_JapanesePostbox';

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.56, 10), vendingDarkTrimMat);
  plinth.position.y = 0.28;

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.34), postboxRedMat);
  box.position.y = 0.93;

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.38), postboxRedMat);
  cap.position.y = 1.31;

  // Dual mail slots
  const slotL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.03), vendingDarkTrimMat);
  slotL.position.set(-0.1, 1.16, 0.165);
  const slotR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.03), vendingDarkTrimMat);
  slotR.position.set(0.1, 1.16, 0.165);

  // Front 〒 emblem
  const logoFace = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), postboxLogoMat);
  logoFace.position.set(0, 0.88, 0.172);

  group.add(plinth, box, cap, slotL, slotR, logoFace);
  return group;
}

/**
 * Orange-hooded convex road safety mirror (*Kābu Mirā*) on a 2.8m galvanized pole.
 */
export function buildTrafficMirror(rotY: number): THREE.Group {
  ensureStreetPropResources();
  const group = new THREE.Group();
  group.name = 'Prop_TrafficMirror';

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.8, 8), mirrorPoleMat);
  pole.position.y = 1.4;
  group.add(pole);

  const head = new THREE.Group();
  head.position.set(0, 2.55, 0);
  head.rotation.y = rotY;

  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 16), mirrorHoodMat);
  hood.rotation.x = Math.PI / 2;
  hood.position.z = 0.04;

  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), mirrorGlassMat);
  glass.rotation.x = Math.PI / 2;
  glass.scale.set(1, 0.35, 1);
  glass.position.z = 0.05;

  head.add(hood, glass);
  group.add(head);

  return group;
}

/**
 * White municipal tubular steel pedestrian guardrail (height 0.78m) with leaf medallion.
 */
export function buildSidewalkGuardrail(lengthMeters: number): THREE.Group {
  ensureStreetPropResources();
  const group = new THREE.Group();
  group.name = 'Prop_SidewalkGuardrail';

  const halfL = lengthMeters / 2;
  const postPositions = [-halfL + 0.12, 0, halfL - 0.12];

  postPositions.forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.78, 8), guardrailWhiteMat);
    post.position.set(px, 0.39, 0);
    group.add(post);
  });

  const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, lengthMeters, 8), guardrailWhiteMat);
  topRail.rotation.z = Math.PI / 2;
  topRail.position.y = 0.74;

  const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, lengthMeters, 8), guardrailWhiteMat);
  midRail.rotation.z = Math.PI / 2;
  midRail.position.y = 0.42;

  const medallion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.03), guardrailLeafMat);
  medallion.position.y = 0.58;

  group.add(topRail, midRail, medallion);
  return group;
}

/**
 * Populates sidewalks with Japanese streetscape props while preserving strict entrance,
 * totem sign, and crosswalk clearances.
 */
export function populateStreetscapeProps(
  roadsGroup: THREE.Group,
  buildingsList: PlacedBuilding[],
  rng: () => number
): void {
  ensureStreetPropResources();

  const propsGroup = new THREE.Group();
  propsGroup.name = 'Town_StreetscapeProps';

  const gridSize = 24;
  const cellSize = 6.0;
  const halfGrid = 11.5;
  const roadIndices = new Set([1, 6, 11, 12, 17, 22]);
  const roadArray = [1, 6, 11, 12, 17, 22];

  // Precompute totem positions for tier > 0 buildings
  const totemPositions: Array<{ x: number; z: number }> = [];
  buildingsList.forEach((b) => {
    if (b.tier > 0) {
      const signFwd = b.depthMeters / 2 - 0.52;
      const signSide = b.widthMeters / 2 - 0.65;
      const tangentX = Math.cos(b.rotationY);
      const tangentZ = -Math.sin(b.rotationY);
      totemPositions.push({
        x: b.worldPos[0] + Math.sin(b.rotationY) * signFwd + tangentX * signSide,
        z: b.worldPos[2] + Math.cos(b.rotationY) * signFwd + tangentZ * signSide,
      });
    }
  });

  // Precompute crosswalk centers (every intersection's 4 outer crosswalk edges)
  const crosswalkCenters: Array<{ x: number; z: number }> = [];
  roadArray.forEach((gx) => {
    roadArray.forEach((gz) => {
      const ix = (gx - halfGrid) * cellSize;
      const iz = (gz - halfGrid) * cellSize;
      crosswalkCenters.push(
        { x: ix, z: iz - 2.1 },
        { x: ix, z: iz + 2.1 },
        { x: ix - 2.1, z: iz },
        { x: ix + 2.1, z: iz }
      );
    });
  });

  const hasClearance = (wx: number, wz: number): boolean => {
    for (let i = 0; i < buildingsList.length; i++) {
      const ep = buildingsList[i].entrancePos;
      const dx = wx - ep[0];
      const dz = wz - ep[2];
      if (dx * dx + dz * dz < 2.6 * 2.6) return false;
    }
    for (let i = 0; i < totemPositions.length; i++) {
      const tp = totemPositions[i];
      const dx = wx - tp.x;
      const dz = wz - tp.z;
      if (dx * dx + dz * dz < 1.6 * 1.6) return false;
    }
    for (let i = 0; i < crosswalkCenters.length; i++) {
      const cw = crosswalkCenters[i];
      const dx = wx - cw.x;
      const dz = wz - cw.z;
      if (dx * dx + dz * dz < 2.2 * 2.2) return false;
    }
    return true;
  };

  // 1. Convex traffic mirrors at non-boulevard intersections (12 max)
  const nonBoulevardRoads = [1, 6, 17, 22];
  let mirrorCount = 0;
  nonBoulevardRoads.forEach((gx) => {
    nonBoulevardRoads.forEach((gz) => {
      if (mirrorCount >= 12) return;
      if ((gx + gz) % 2 !== 0 && rng() > 0.65) return;
      const ix = (gx - halfGrid) * cellSize;
      const iz = (gz - halfGrid) * cellSize;
      const cornerSign = (gx + gz) % 2 === 0 ? 1 : -1;
      const mx = ix + cornerSign * 2.75;
      const mz = iz - cornerSign * 2.75;
      if (hasClearance(mx, mz)) {
        const mirror = buildTrafficMirror(cornerSign > 0 ? -Math.PI * 0.75 : Math.PI * 0.25);
        mirror.position.set(mx, 0.15, mz);
        propsGroup.add(mirror);
        mirrorCount++;
      }
    });
  });

  // 2. Pedestrian guardrails flanking the 4 central Grand Boulevard intersection approaches
  const guardrailPlacements: Array<{ x: number; z: number; rotY: number }> = [
    { x: -5.7, z: -8.5, rotY: Math.PI / 2 },
    { x: +5.7, z: -8.5, rotY: Math.PI / 2 },
    { x: -5.7, z: +8.5, rotY: Math.PI / 2 },
    { x: +5.7, z: +8.5, rotY: Math.PI / 2 },
    { x: -8.5, z: -5.7, rotY: 0 },
    { x: +8.5, z: -5.7, rotY: 0 },
    { x: -8.5, z: +5.7, rotY: 0 },
    { x: +8.5, z: +5.7, rotY: 0 },
  ];
  guardrailPlacements.forEach(({ x, z, rotY }) => {
    if (hasClearance(x, z)) {
      const rail = buildSidewalkGuardrail(3.4);
      rail.position.set(x, 0.15, z);
      rail.rotation.y = rotY;
      propsGroup.add(rail);
    }
  });

  // 3. Vending machines (~10-14) & Red Postboxes (~6) along straight non-junction sidewalks
  const variants: Array<'RED' | 'BLUE' | 'GREEN'> = ['RED', 'BLUE', 'GREEN'];
  let vendingCount = 0;
  let postboxCount = 0;

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const isRoadX = roadIndices.has(gx);
      const isRoadZ = roadIndices.has(gz);
      if (isRoadX === isRoadZ) continue; // Only non-junction straight tiles

      const wx = (gx - halfGrid) * cellSize;
      const wz = (gz - halfGrid) * cellSize;

      // Avoid immediate junction tiles
      const nearJunction = isRoadX
        ? roadArray.some((rj) => Math.abs(gz - rj) <= 1)
        : roadArray.some((rj) => Math.abs(gx - rj) <= 1);
      if (nearJunction) continue;

      if (vendingCount < 14 && rng() < 0.18) {
        const side = rng() < 0.5 ? -1 : 1;
        // Skip inner boulevard median sides
        if (isRoadX && ((gx === 11 && side === 1) || (gx === 12 && side === -1))) continue;
        if (isRoadZ && ((gz === 11 && side === 1) || (gz === 12 && side === -1))) continue;

        const px = isRoadX ? wx + side * 2.75 : wx + (rng() - 0.5) * 2.2;
        const pz = isRoadZ ? wz + side * 2.75 : wz + (rng() - 0.5) * 2.2;
        if (hasClearance(px, pz)) {
          const vm = buildVendingMachine(variants[vendingCount % variants.length]);
          vm.position.set(px, 0.15, pz);
          if (isRoadX) {
            vm.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            vm.rotation.y = side < 0 ? 0 : Math.PI;
          }
          propsGroup.add(vm);
          vendingCount++;
          continue;
        }
      }

      if (postboxCount < 6 && rng() < 0.1) {
        const side = rng() < 0.5 ? -1 : 1;
        if (isRoadX && ((gx === 11 && side === 1) || (gx === 12 && side === -1))) continue;
        if (isRoadZ && ((gz === 11 && side === 1) || (gz === 12 && side === -1))) continue;

        const px = isRoadX ? wx + side * 2.72 : wx + 1.4;
        const pz = isRoadZ ? wz + side * 2.72 : wz + 1.4;
        if (hasClearance(px, pz)) {
          const pb = buildJapanesePostbox();
          pb.position.set(px, 0.15, pz);
          if (isRoadX) {
            pb.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            pb.rotation.y = side < 0 ? 0 : Math.PI;
          }
          propsGroup.add(pb);
          postboxCount++;
        }
      }
    }
  }

  roadsGroup.add(propsGroup);
}
