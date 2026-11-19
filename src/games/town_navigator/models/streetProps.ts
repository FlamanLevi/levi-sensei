import * as THREE from 'three';
import type { PlacedBuilding } from '../townGenerator';
import { getClearShowcaseGlassMaterial, getTimberPlankTexture } from './wallTextures';

let sharedReady = false;

let vendingRedBodyMat!: THREE.MeshStandardMaterial;
let vendingBlueBodyMat!: THREE.MeshStandardMaterial;
let vendingGreenBodyMat!: THREE.MeshStandardMaterial;
let vendingDisplayMat!: THREE.MeshStandardMaterial;
let vendingDarkTrimMat!: THREE.MeshStandardMaterial;
let vendingChromeMat!: THREE.MeshStandardMaterial;
let recycleBinMat!: THREE.MeshStandardMaterial;

let postboxRedMat!: THREE.MeshStandardMaterial;
let postboxLogoMat!: THREE.MeshStandardMaterial;

let mirrorPoleMat!: THREE.MeshStandardMaterial;
let mirrorHoodMat!: THREE.MeshStandardMaterial;
let mirrorGlassMat!: THREE.MeshStandardMaterial;

let guardrailWhiteMat!: THREE.MeshStandardMaterial;
let guardrailLeafMat!: THREE.MeshStandardMaterial;
let guardrailRedMat!: THREE.MeshStandardMaterial;

let concretePoleMat!: THREE.MeshStandardMaterial;
let insulatorWhiteMat!: THREE.MeshStandardMaterial;
let hazardYellowMat!: THREE.MeshStandardMaterial;
let timberWoodMat!: THREE.MeshStandardMaterial;
let foliageMat!: THREE.MeshStandardMaterial;
let payphoneGreenMat!: THREE.MeshStandardMaterial;
let coneOrangeMat!: THREE.MeshStandardMaterial;

let roadSignAtlasMat!: THREE.MeshStandardMaterial;
let bulletinPosterMat!: THREE.MeshStandardMaterial;
let catenaryWireMat!: THREE.LineBasicMaterial;

let cachedVendingTex: THREE.CanvasTexture | null = null;
let cachedPostboxTex: THREE.CanvasTexture | null = null;
let cachedRoadSignAtlasTex: THREE.CanvasTexture | null = null;
let cachedBulletinTex: THREE.CanvasTexture | null = null;

function getVendingDisplayTexture(): THREE.CanvasTexture {
  if (cachedVendingTex) return cachedVendingTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, 0, 256, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DRINKS • つめたい・あたたかい', 128, 20);

  const drinkColors = [
    '#ef4444', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#3b82f6', '#8b5cf6',
    '#10b981', '#eab308', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f43f5e',
  ];

  for (let row = 0; row < 3; row++) {
    const shelfY = 44 + row * 68;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(10, shelfY + 46, 236, 5);
    ctx.fillStyle = row === 2 ? '#ef4444' : '#38bdf8';
    ctx.fillRect(10, shelfY + 51, 236, 7);

    for (let col = 0; col < 7; col++) {
      const dx = 18 + col * 32;
      const color = drinkColors[(row * 7 + col) % drinkColors.length];
      ctx.fillStyle = color;
      ctx.fillRect(dx, shelfY + 6, 22, 38);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(dx + 2, shelfY + 16, 18, 12);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(dx + 4, shelfY + 2, 14, 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  cachedVendingTex = tex;
  return tex;
}

function getPostboxLogoTexture(): THREE.CanvasTexture {
  if (cachedPostboxTex) return cachedPostboxTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(28, 28, 72, 12);
  ctx.fillRect(28, 50, 72, 12);
  ctx.fillRect(58, 50, 12, 52);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  cachedPostboxTex = tex;
  return tex;
}

/**
 * 4x2 Regulatory Japanese Road Sign Atlas (512x256, 8 slots of 128x128):
 * Col 0..3 Row 0 (v=0.5..1.0): 0=TOMARE, 1=CROSSWALK, 2=SPEED30, 3=SPEED40
 * Col 0..3 Row 1 (v=0.0..0.5): 4=SCHOOL_ZONE, 5=BIKE_PED, 6=NO_PARKING, 7=HYDRANT
 */
function getRoadSignAtlasTexture(): THREE.CanvasTexture {
  if (cachedRoadSignAtlasTex) return cachedRoadSignAtlasTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 256);

  // 0: Red Inverted Triangle "止まれ" (STOP)
  ctx.save();
  ctx.translate(64, 64);
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-50, -42);
  ctx.lineTo(50, -42);
  ctx.lineTo(0, 48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('止まれ', 0, -14);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('STOP', 0, 8);
  ctx.restore();

  // 1: Blue Pentagon "横断歩道" (Pedestrian Crossing)
  ctx.save();
  ctx.translate(192, 64);
  ctx.fillStyle = '#0284c7';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(46, -12);
  ctx.lineTo(36, 46);
  ctx.lineTo(-36, 46);
  ctx.lineTo(-46, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-26, 26, 52, 6);
  ctx.beginPath();
  ctx.arc(0, -16, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-5, -6, 10, 22);
  ctx.restore();

  // 2 & 3: Speed Limit Circles (30 & 40)
  [
    { cx: 320, label: '30' },
    { cx: 448, label: '40' },
  ].forEach(({ cx, label }) => {
    ctx.save();
    ctx.translate(cx, 64);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 2);
    ctx.restore();
  });

  // 4: Green/Yellow School Zone Diamond
  ctx.save();
  ctx.translate(64, 192);
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(48, 0);
  ctx.lineTo(0, 48);
  ctx.lineTo(-48, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('スクール', 0, -8);
  ctx.fillText('ゾーン', 0, 12);
  ctx.restore();

  // 5: Blue Bike/Pedestrian Circle
  ctx.save();
  ctx.translate(192, 192);
  ctx.fillStyle = '#0284c7';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('自転車', 0, -10);
  ctx.fillText('専用', 0, 12);
  ctx.restore();

  // 6: Red-Slashed No Parking Circle
  ctx.save();
  ctx.translate(320, 192);
  ctx.fillStyle = '#1e3a8a';
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-28, -28);
  ctx.lineTo(28, 28);
  ctx.stroke();
  ctx.restore();

  // 7: Red Fire Hydrant Disc ("消火栓")
  ctx.save();
  ctx.translate(448, 192);
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('消火栓', 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  tex.userData.isArchitecturalTex = true;
  cachedRoadSignAtlasTex = tex;
  return tex;
}

function getBulletinPosterTexture(): THREE.CanvasTexture {
  if (cachedBulletinTex) return cachedBulletinTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Corkboard base
  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 256, 128);

  // Header strip
  ctx.fillStyle = '#14532d';
  ctx.fillRect(8, 6, 240, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('みどり町 町内会掲示板', 128, 20);

  // 3 colorful pinned community posters
  const posters = [
    { x: 14, bg: '#fef08a', title: '夏祭り', accent: '#dc2626' },
    { x: 94, bg: '#e0f2fe', title: '交通安全', accent: '#0284c7' },
    { x: 174, bg: '#dcfce7', title: 'ゴミ出し', accent: '#16a34a' },
  ];
  posters.forEach(({ x, bg, title, accent }) => {
    ctx.fillStyle = bg;
    ctx.fillRect(x, 32, 68, 84);
    ctx.fillStyle = accent;
    ctx.fillRect(x, 32, 68, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "BIZ UDPGothic", sans-serif';
    ctx.fillText(title, x + 34, 44);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 8, 56, 52, 6);
    ctx.fillRect(x + 8, 68, 44, 6);
    ctx.fillRect(x + 8, 80, 48, 6);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  tex.userData.isArchitecturalTex = true;
  cachedBulletinTex = tex;
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
  recycleBinMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45, metalness: 0.15 });

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
  guardrailRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });

  concretePoleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.85 });
  insulatorWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  hazardYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  timberWoodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getTimberPlankTexture(),
    roughness: 0.82,
  });
  foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.88 });
  payphoneGreenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35, metalness: 0.2 });
  coneOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });

  roadSignAtlasMat = new THREE.MeshStandardMaterial({
    map: getRoadSignAtlasTexture(),
    alphaTest: 0.5,
    transparent: false,
    roughness: 0.68,
  });
  roadSignAtlasMat.userData.batchGlobal = true;

  bulletinPosterMat = new THREE.MeshStandardMaterial({
    map: getBulletinPosterTexture(),
    roughness: 0.72,
  });
  bulletinPosterMat.userData.batchGlobal = true;

  catenaryWireMat = new THREE.LineBasicMaterial({ color: 0x1e293b });

  [
    vendingRedBodyMat,
    vendingBlueBodyMat,
    vendingGreenBodyMat,
    vendingDisplayMat,
    vendingDarkTrimMat,
    vendingChromeMat,
    recycleBinMat,
    postboxRedMat,
    postboxLogoMat,
    mirrorPoleMat,
    mirrorHoodMat,
    mirrorGlassMat,
    guardrailWhiteMat,
    guardrailLeafMat,
    guardrailRedMat,
    concretePoleMat,
    insulatorWhiteMat,
    hazardYellowMat,
    timberWoodMat,
    foliageMat,
    payphoneGreenMat,
    coneOrangeMat,
    roadSignAtlasMat,
    bulletinPosterMat,
    catenaryWireMat,
  ].forEach((mat) => {
    mat.userData.isSharedResource = true;
  });
}

function createRoadSignFace(slotIndex: number, size = 0.48): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size);
  const col = slotIndex % 4;
  const row = Math.floor(slotIndex / 4);
  const u0 = col * 0.25;
  const u1 = u0 + 0.25;
  const v1 = 1.0 - row * 0.5;
  const v0 = v1 - 0.5;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  uv.needsUpdate = true;
  return new THREE.Mesh(geo, roadSignAtlasMat);
}

function buildRegulatorySign(slotIndex: number, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 2.35, 6), mirrorPoleMat);
  pole.position.y = 1.175;
  const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.02), mirrorPoleMat);
  backPlate.position.set(0, 2.15, 0.02);
  const face = createRoadSignFace(slotIndex, 0.48);
  face.position.set(0, 2.15, 0.032);
  g.add(pole, backPlate, face);
  g.rotation.y = rotY;
  return g;
}

/**
 * Iconic Japanese beverage vending machine (*Jidōhanbaiki*) + adjacent Recycling Bottle Bin.
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

  // Anti-tip concrete foot pads
  [-0.30, 0.30].forEach((fx) => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.50), concretePoleMat);
    pad.position.set(fx, 0.02, 0);
    group.add(pad);
  });

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.68, 0.48), bodyMat);
  cabinet.position.y = 0.86;
  group.add(cabinet);

  // Illuminated front drink showcase
  const showcase = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.78), vendingDisplayMat);
  showcase.position.set(0, 1.18, 0.242);
  group.add(showcase);

  // Coin / bill acceptor panel & lower pickup flap
  const coinPanel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.03), vendingChromeMat);
  coinPanel.position.set(0.24, 0.64, 0.245);
  const pickup = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.04), vendingDarkTrimMat);
  pickup.position.set(-0.04, 0.28, 0.235);
  group.add(coinPanel, pickup);

  // Side-by-side Japanese Recycling Bottle Bin (*Risaikuru Bokkusu*)
  const bin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.88, 0.40), recycleBinMat);
  bin.position.set(0.58, 0.44, 0.02);
  const binLid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.42), vendingChromeMat);
  binLid.position.set(0.58, 0.90, 0.02);
  const binHole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), vendingDarkTrimMat);
  binHole.position.set(0.58, 0.94, 0.08);
  group.add(bin, binLid, binHole);

  return group;
}

/**
 * Iconic red Japanese rectangular postbox (*Yūbin-posuto*) with rain hoods & base collar.
 */
export function buildJapanesePostbox(): THREE.Group {
  ensureStreetPropResources();
  const group = new THREE.Group();
  group.name = 'Prop_JapanesePostbox';

  const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 10), concretePoleMat);
  baseCollar.position.y = 0.03;

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.56, 10), vendingDarkTrimMat);
  plinth.position.y = 0.28;

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.34), postboxRedMat);
  box.position.y = 0.93;

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.40), postboxRedMat);
  cap.position.y = 1.32;

  // Dual mail slots + Rain hoods
  [-0.1, 0.1].forEach((sx) => {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.03), vendingDarkTrimMat);
    slot.position.set(sx, 1.16, 0.165);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.05), postboxRedMat);
    hood.position.set(sx, 1.19, 0.185);
    hood.rotation.x = 0.35;
    group.add(slot, hood);
  });

  // Side pickup-schedule placard
  const schedule = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.16), guardrailWhiteMat);
  schedule.position.set(0.215, 0.94, 0);

  const logoFace = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), postboxLogoMat);
  logoFace.position.set(0, 0.88, 0.172);

  group.add(baseCollar, plinth, box, cap, schedule, logoFace);
  return group;
}

/**
 * Orange-hooded convex road safety mirror (*Kābu Mirā*) with yellow-black pole sleeve.
 */
export function buildTrafficMirror(rotY: number): THREE.Group {
  ensureStreetPropResources();
  const group = new THREE.Group();
  group.name = 'Prop_TrafficMirror';

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.8, 8), mirrorPoleMat);
  pole.position.y = 1.4;
  group.add(pole);

  // Yellow-black reflective pole sleeve
  [0.7, 0.9, 1.1].forEach((hy, i) => {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.058, 0.10, 8),
      i % 2 === 0 ? hazardYellowMat : vendingDarkTrimMat
    );
    band.position.y = hy;
    group.add(band);
  });

  const head = new THREE.Group();
  head.position.set(0, 2.55, 0);
  head.rotation.y = rotY;

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.14), mirrorPoleMat);
  bracket.position.set(0, 0, -0.02);

  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 14), mirrorHoodMat);
  hood.rotation.x = Math.PI / 2;
  hood.position.z = 0.04;

  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), mirrorGlassMat);
  glass.rotation.x = Math.PI / 2;
  glass.scale.set(1, 0.35, 1);
  glass.position.z = 0.05;

  head.add(bracket, hood, glass);
  group.add(head);

  return group;
}

/**
 * White municipal tubular steel pedestrian guardrail (height 0.78m) with base flanges & reflective collars.
 */
export function buildSidewalkGuardrail(lengthMeters: number): THREE.Group {
  ensureStreetPropResources();
  const group = new THREE.Group();
  group.name = 'Prop_SidewalkGuardrail';

  const halfL = lengthMeters / 2;
  const postPositions = [-halfL + 0.12, 0, halfL - 0.12];

  postPositions.forEach((px, idx) => {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 8), vendingDarkTrimMat);
    flange.position.set(px, 0.02, 0);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.78, 8), guardrailWhiteMat);
    post.position.set(px, 0.39, 0);
    group.add(flange, post);
    if (idx !== 1) {
      const refBand = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.08, 8), guardrailRedMat);
      refBand.position.set(px, 0.62, 0);
      group.add(refBand);
    }
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

function buildNeighborhoodBulletinBoard(): THREE.Group {
  const g = new THREE.Group();
  [-0.55, 0.55].forEach((px) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.08), timberWoodMat);
    post.position.set(px, 0.925, 0);
    g.add(post);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.68, 0.06), timberWoodMat);
  board.position.set(0, 1.38, 0);
  const posterFace = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.56), bulletinPosterMat);
  posterFace.position.set(0, 1.38, 0.032);
  const eaves = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 0.30), vendingDarkTrimMat);
  eaves.position.set(0, 1.80, 0.05);
  eaves.rotation.x = 0.2;
  g.add(board, posterFace, eaves);
  return g;
}

function buildPayphoneBooth(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.86), concretePoleMat);
  base.position.y = 0.04;
  g.add(base);

  const glassMat = getClearShowcaseGlassMaterial();
  const glassBox = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.95, 0.76), glassMat);
  glassBox.position.y = 1.05;
  g.add(glassBox);

  [
    [-0.38, -0.38],
    [0.38, -0.38],
    [-0.38, 0.38],
    [0.38, 0.38],
  ].forEach(([px, pz]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.05, 0.06), mirrorPoleMat);
    frame.position.set(px, 1.06, pz);
    g.add(frame);
  });

  const roofBand = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.84), payphoneGreenMat);
  roofBand.position.y = 2.15;
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.06, 0.88), vendingDarkTrimMat);
  roofCap.position.y = 2.28;
  const phoneUnit = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.22), payphoneGreenMat);
  phoneUnit.position.set(0, 1.15, -0.15);
  g.add(roofBand, roofCap, phoneUnit);
  return g;
}

function buildPlanterBench(): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.42), timberWoodMat);
  seat.position.set(-0.22, 0.44, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.32, 0.06), timberWoodMat);
  back.position.set(-0.22, 0.72, -0.18);
  [-0.75, 0.30].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.38), vendingDarkTrimMat);
    leg.position.set(lx, 0.22, 0);
    g.add(leg);
  });
  const planter = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.46), concretePoleMat);
  planter.position.set(0.65, 0.24, 0);
  const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), foliageMat);
  bush.position.set(0.65, 0.56, 0);
  g.add(seat, back, planter, bush);
  return g;
}

function buildFireHydrantPost(rotY = 0): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.3, 6), hazardYellowMat);
  pole.position.y = 1.15;
  const disc = createRoadSignFace(7, 0.44);
  disc.position.set(0, 2.15, 0.04);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 10), postboxRedMat);
  back.rotation.x = Math.PI / 2;
  back.position.set(0, 2.15, 0.025);
  g.add(pole, disc, back);
  g.rotation.y = rotY;
  return g;
}

function buildRoadsideSafetyVignette(): THREE.Group {
  const g = new THREE.Group();
  [-0.45, 0.45].forEach((cx) => {
    const coneBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.28), coneOrangeMat);
    coneBase.position.set(cx, 0.02, 0);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.44, 8), coneOrangeMat);
    cone.position.set(cx, 0.24, 0);
    g.add(coneBase, cone);
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), hazardYellowMat);
  bar.position.set(0, 0.48, 0);
  g.add(bar);
  return g;
}

function buildAokanbanGantry(
  wx: number,
  wz: number,
  rotY: number,
  straightLabel: string,
  leftLabel: string,
  rightLabel: string
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(wx, 0.15, wz);
  g.rotation.y = rotY;

  // Galvanized L-Cantilever mast on left sidewalk + rear support beam behind board
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 8), mirrorPoleMat);
  mast.position.set(-2.65, 2.7, -0.08);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.12), mirrorPoleMat);
  beam.position.set(-0.85, 5.25, -0.08);
  g.add(mast, beam);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 236);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px "BIZ UDPGothic", sans-serif';
  ctx.fillText(`↑ ${straightLabel}`, 256, 74, 460);
  // Subtle horizontal divider bar
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(32, 126, 448, 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px "BIZ UDPGothic", sans-serif';
  ctx.fillText(`← ${leftLabel}   |   ${rightLabel} →`, 256, 182, 470);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.35, 0.08), [
    mirrorPoleMat, mirrorPoleMat, mirrorPoleMat, mirrorPoleMat, boardMat, mirrorPoleMat,
  ]);
  board.position.set(-0.6, 5.25, 0);
  g.add(board);

  return g;
}

/**
 * Populates sidewalks with Japanese streetscape props while preserving strict entrance,
 * totem sign, and crosswalk clearances.
 */
export function populateStreetscapeProps(
  roadsGroup: THREE.Group,
  buildingsList: PlacedBuilding[],
  rng: () => number,
  options?: { lowPower?: boolean }
): void {
  ensureStreetPropResources();
  const lowPower = options?.lowPower ?? false;

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

  // Precompute crosswalk centers
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

  // 1. Convex traffic mirrors + Fire Hydrant posts at non-boulevard intersections
  const nonBoulevardRoads = [1, 6, 17, 22];
  let mirrorCount = 0;
  let hydrantCount = 0;
  nonBoulevardRoads.forEach((gx) => {
    nonBoulevardRoads.forEach((gz) => {
      const ix = (gx - halfGrid) * cellSize;
      const iz = (gz - halfGrid) * cellSize;
      const cornerSign = (gx + gz) % 2 === 0 ? 1 : -1;
      const mx = ix + cornerSign * 2.75;
      const mz = iz - cornerSign * 2.75;
      if (mirrorCount < 12 && ((gx + gz) % 2 === 0 || rng() <= 0.65) && hasClearance(mx, mz)) {
        const mirror = buildTrafficMirror(cornerSign > 0 ? -Math.PI * 0.75 : Math.PI * 0.25);
        mirror.position.set(mx, 0.15, mz);
        propsGroup.add(mirror);
        mirrorCount++;
      } else if (hydrantCount < 8 && hasClearance(mx, mz)) {
        const hydrant = buildFireHydrantPost(cornerSign > 0 ? -Math.PI * 0.75 : Math.PI * 0.25);
        hydrant.position.set(mx, 0.15, mz);
        propsGroup.add(hydrant);
        hydrantCount++;
      }
    });
  });

  // 2. Pedestrian guardrails flanking central Grand Boulevard + School/Station/Park frontages
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

  // School / Station / Park curb guardrails + School Zone regulatory signs
  const highTrafficIds = new Set(['SCHOOL', 'JUNIOR_HIGH_SCHOOL', 'STATION', 'PARK']);
  buildingsList.forEach((b) => {
    if (!highTrafficIds.has(b.id)) return;
    const tx = Math.cos(b.rotationY);
    const tz = -Math.sin(b.rotationY);
    const fwdX = Math.sin(b.rotationY);
    const fwdZ = Math.cos(b.rotationY);
    const gx = b.worldPos[0] + fwdX * (b.depthMeters / 2 + 0.35) - tx * (b.widthMeters * 0.28);
    const gz = b.worldPos[2] + fwdZ * (b.depthMeters / 2 + 0.35) - tz * (b.widthMeters * 0.28);
    if (hasClearance(gx, gz)) {
      const rail = buildSidewalkGuardrail(2.8);
      rail.position.set(gx, 0.15, gz);
      rail.rotation.y = b.rotationY;
      propsGroup.add(rail);
    }
    if (b.id === 'SCHOOL' || b.id === 'JUNIOR_HIGH_SCHOOL') {
      const sx = b.worldPos[0] + fwdX * (b.depthMeters / 2 + 0.35) + tx * (b.widthMeters * 0.35);
      const sz = b.worldPos[2] + fwdZ * (b.depthMeters / 2 + 0.35) + tz * (b.widthMeters * 0.35);
      if (hasClearance(sx, sz)) {
        const sign = buildRegulatorySign(4, b.rotationY);
        sign.position.set(sx, 0.15, sz);
        propsGroup.add(sign);
      }
    }
  });

  // 2B. Dynamic Seed-Accurate Overhead *Aokanban* Route Gantries on all 4 Left-Hand Boulevard Approaches
  const pickCardinalLandmark = (dir: 'N' | 'S' | 'E' | 'W', usedIds: Set<string>): string => {
    const candidates = buildingsList
      .filter((b) => b.tier >= 2 && !usedIds.has(b.id))
      .map((b) => {
        const [bx, , bz] = b.worldPos;
        const primary =
          dir === 'N' ? -bz : dir === 'S' ? bz : dir === 'E' ? bx : -bx;
        const lateral =
          dir === 'N' || dir === 'S' ? Math.abs(bx) : Math.abs(bz);
        return { b, primary, lateral };
      })
      .filter((c) => c.primary > 12);

    if (candidates.length === 0) return 'Station';

    // Prefer landmarks strictly within the 90° cardinal wedge (primary >= lateral),
    // then prefer higher-tier landmarks closest to the avenue centerline
    candidates.sort((a, b) => {
      const aInWedge = a.primary >= a.lateral ? 1 : 0;
      const bInWedge = b.primary >= b.lateral ? 1 : 0;
      if (aInWedge !== bInWedge) return bInWedge - aInWedge;
      if (a.b.tier !== b.b.tier) return b.b.tier - a.b.tier;
      return a.lateral - b.lateral;
    });

    const chosen = candidates[0].b;
    usedIds.add(chosen.id);
    const cleanJa = chosen.nameJa.replace(/<[^>]*>/g, '');
    return `${cleanJa} ${chosen.nameEn}`;
  };

  const makeGantry = (
    wx: number,
    wz: number,
    rotY: number,
    straightDir: 'N' | 'S' | 'E' | 'W',
    leftDir: 'N' | 'S' | 'E' | 'W',
    rightDir: 'N' | 'S' | 'E' | 'W'
  ) => {
    const used = new Set<string>();
    const straight = pickCardinalLandmark(straightDir, used);
    const left = pickCardinalLandmark(leftDir, used);
    const right = pickCardinalLandmark(rightDir, used);
    return buildAokanbanGantry(wx, wz, rotY, straight, left, right);
  };

  // Left-hand traffic boulevard approaches to Central (0,0):
  // Northbound (-Z) on West side (X=-3.0, Z=+15.0, mast on X=-5.65 sidewalk)
  // Southbound (+Z) on East side (X=+3.0, Z=-15.0, mast on X=+5.65 sidewalk)
  // Eastbound (+X) on North side (X=-15.0, Z=-3.0, mast on Z=-5.65 sidewalk)
  // Westbound (-X) on South side (X=+15.0, Z=+3.0, mast on Z=+5.65 sidewalk)
  propsGroup.add(
    makeGantry(-3.0, 15.0, 0, 'N', 'W', 'E'),
    makeGantry(3.0, -15.0, Math.PI, 'S', 'E', 'W'),
    makeGantry(-15.0, -3.0, -Math.PI / 2, 'E', 'N', 'S'),
    makeGantry(15.0, 3.0, Math.PI / 2, 'W', 'S', 'N')
  );

  // 2C. Japanese Concrete Utility Poles (*Denchū*) along outer/secondary streets + 1 Batched Wire Mesh
  const wirePoints: number[] = [];
  const poleCoordsByLine = new Map<string, Array<{ x: number; z: number }>>();
  nonBoulevardRoads.forEach((roadIdx) => {
    const roadCoord = (roadIdx - halfGrid) * cellSize;
    const isEast = roadIdx > 11;
    const poleX = roadCoord + (isEast ? 2.74 : -2.74);
    const listZ: Array<{ x: number; z: number }> = [];
    for (let gz = 2; gz <= 21; gz += 3) {
      if (roadIndices.has(gz)) continue;
      const pz = (gz - halfGrid) * cellSize;
      if (!hasClearance(poleX, pz)) continue;
      listZ.push({ x: poleX, z: pz });

      const poleGroup = new THREE.Group();
      poleGroup.position.set(poleX, 0.15, pz);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 6.8, 8), concretePoleMat);
      shaft.position.y = 3.4;
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 1.4, 8), hazardYellowMat);
      guard.position.y = 0.9;
      const armTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), mirrorPoleMat);
      armTop.position.y = 6.2;
      const armLow = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.07), mirrorPoleMat);
      armLow.position.y = 5.4;
      poleGroup.add(shaft, guard, armTop, armLow);

      [-0.42, 0, 0.42].forEach((ix) => {
        const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 6), insulatorWhiteMat);
        ins.position.set(ix, 6.28, 0);
        poleGroup.add(ins);
      });

      if (listZ.length % 3 === 1) {
        const trans = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.56, 8), concretePoleMat);
        trans.position.set(isEast ? -0.24 : 0.24, 4.6, 0);
        poleGroup.add(trans);
      }
      propsGroup.add(poleGroup);
    }
    poleCoordsByLine.set(`Z_${roadIdx}`, listZ);
  });

  if (!lowPower) {
    poleCoordsByLine.forEach((pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        if (Math.abs(p1.z - p0.z) > 20) continue;
        [-0.38, 0.38].forEach((ox) => {
          const midX = (p0.x + p1.x) * 0.5 + ox;
          const midZ = (p0.z + p1.z) * 0.5;
          const sagY = 6.40 - 0.35;
          wirePoints.push(p0.x + ox, 6.45, p0.z, midX, sagY, midZ);
          wirePoints.push(midX, sagY, midZ, p1.x + ox, 6.45, p1.z);
        });
      }
    });
    if (wirePoints.length > 0) {
      const wireGeo = new THREE.BufferGeometry();
      wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePoints, 3));
      const wires = new THREE.LineSegments(wireGeo, catenaryWireMat);
      wires.name = 'BatchedUtilityWires';
      propsGroup.add(wires);
    }
  }

  // 3. Vending machines, Postboxes, Bulletin Boards, Payphones, Planter Benches, Signs & Vignettes
  const variants: Array<'RED' | 'BLUE' | 'GREEN'> = ['RED', 'BLUE', 'GREEN'];
  let vendingCount = 0;
  let postboxCount = 0;
  let bulletinCount = 0;
  let payphoneCount = 0;
  let benchCount = 0;
  let regSignCount = 0;
  let vignetteCount = 0;

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const isRoadX = roadIndices.has(gx);
      const isRoadZ = roadIndices.has(gz);
      if (isRoadX === isRoadZ) continue;

      const wx = (gx - halfGrid) * cellSize;
      const wz = (gz - halfGrid) * cellSize;

      const nearJunction = isRoadX
        ? roadArray.some((rj) => Math.abs(gz - rj) <= 1)
        : roadArray.some((rj) => Math.abs(gx - rj) <= 1);
      if (nearJunction) continue;

      const isBoulevard = (isRoadX && (gx === 11 || gx === 12)) || (isRoadZ && (gz === 11 || gz === 12));
      const side = rng() < 0.5 ? -1 : 1;
      if (isRoadX && ((gx === 11 && side === 1) || (gx === 12 && side === -1))) continue;
      if (isRoadZ && ((gz === 11 && side === 1) || (gz === 12 && side === -1))) continue;

      const px = isRoadX ? wx + side * 2.75 : wx + (rng() - 0.5) * 2.0;
      const pz = isRoadZ ? wz + side * 2.75 : wz + (rng() - 0.5) * 2.0;
      const rotY = isRoadX ? (side < 0 ? Math.PI / 2 : -Math.PI / 2) : side < 0 ? 0 : Math.PI;

      if (!hasClearance(px, pz)) continue;

      if (isBoulevard && benchCount < 12 && rng() < 0.35) {
        const bench = buildPlanterBench();
        bench.position.set(px, 0.15, pz);
        bench.rotation.y = rotY;
        propsGroup.add(bench);
        benchCount++;
      } else if (isBoulevard && payphoneCount < 3 && rng() < 0.18) {
        const phone = buildPayphoneBooth();
        phone.position.set(px, 0.15, pz);
        phone.rotation.y = rotY;
        propsGroup.add(phone);
        payphoneCount++;
      } else if (vendingCount < 14 && rng() < 0.18) {
        const vm = buildVendingMachine(variants[vendingCount % variants.length]);
        vm.position.set(px, 0.15, pz);
        vm.rotation.y = rotY;
        propsGroup.add(vm);
        vendingCount++;
      } else if (postboxCount < 6 && rng() < 0.12) {
        const pb = buildJapanesePostbox();
        pb.position.set(px, 0.15, pz);
        pb.rotation.y = rotY;
        propsGroup.add(pb);
        postboxCount++;
      } else if (bulletinCount < 7 && rng() < 0.12) {
        const bb = buildNeighborhoodBulletinBoard();
        bb.position.set(px, 0.15, pz);
        bb.rotation.y = rotY;
        propsGroup.add(bb);
        bulletinCount++;
      } else if (regSignCount < 14 && rng() < 0.14) {
        const slot = isBoulevard ? (regSignCount % 2 === 0 ? 3 : 5) : (regSignCount % 3 === 0 ? 0 : regSignCount % 3 === 1 ? 1 : 2);
        const sign = buildRegulatorySign(slot, rotY);
        sign.position.set(px, 0.15, pz);
        propsGroup.add(sign);
        regSignCount++;
      } else if (!isBoulevard && vignetteCount < 2 && rng() < 0.06) {
        const vig = buildRoadsideSafetyVignette();
        vig.position.set(px, 0.15, pz);
        vig.rotation.y = rotY;
        propsGroup.add(vig);
        vignetteCount++;
      }
    }
  }

  roadsGroup.add(propsGroup);
}
