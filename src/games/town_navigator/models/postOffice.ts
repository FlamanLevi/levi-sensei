import * as THREE from 'three';
import {
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedPostSignTex: THREE.CanvasTexture | null = null;
let cachedMailboxTex: THREE.CanvasTexture | null = null;
let cachedAtmSignTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Japanese Post Office (〒) main fascia sign
 */
function createPostOfficeSignTexture(): THREE.CanvasTexture {
  if (cachedPostSignTex) return cachedPostSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('〒', 64, 64);

  ctx.beginPath();
  ctx.moveTo(118, 20);
  ctx.lineTo(118, 108);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '900 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('POST OFFICE', 140, 48);

  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fecaca';
  ctx.fillText('郵便局・ゆうびん', 142, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedPostSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Japan Post Bank (ゆうちょ銀行 ATM) vertical sign
 */
function createAtmSignTexture(): THREE.CanvasTexture {
  if (cachedAtmSignTex) return cachedAtmSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#15803d'; // Iconic Yūcho Bank green
  ctx.fillRect(0, 0, 128, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 116, 244);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 36px sans-serif';
  ctx.fillText('ATM', 64, 58);

  ctx.font = 'bold 20px "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#bbf7d0';
  ctx.fillText('ゆうちょ', 64, 125);
  ctx.fillText('銀行', 64, 155);

  ctx.fillStyle = '#facc15';
  ctx.font = '900 34px sans-serif';
  ctx.fillText('〒', 64, 215);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedAtmSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Japanese Street Mailbox (Post / ポスト)
 */
function createMailboxTexture(): THREE.CanvasTexture {
  if (cachedMailboxTex) return cachedMailboxTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 28, 104, 28);
  ctx.fillRect(136, 28, 104, 28);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(20, 34, 96, 16);
  ctx.fillRect(140, 34, 96, 16);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('手紙・はがき', 68, 72);
  ctx.fillText('その他郵便', 188, 72);

  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = '#fecaca';
  ctx.fillText('LETTERS', 68, 88);
  ctx.fillText('OTHER', 188, 88);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 72px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillText('〒', 128, 156);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 204, 176, 36);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 204, 176, 36);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('COLLECTION: 10:00 / 15:30', 128, 222);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedMailboxTex = texture;
  return texture;
}

export interface PostOfficeOptions {
  includeRoad?: boolean;
  includeTrees?: boolean;
  scale?: number;
}

/**
 * Builds an authentic, low-poly 3D Japanese Post Office matching textbook card hwg5_u19_05
 * Standard 6.0m × 6.0m Lot (1U) within strict 6.0m height envelope
 */
export function buildPostOfficeMesh(options: PostOfficeOptions = {}): THREE.Group {
  const { includeRoad = true, includeTrees = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'PostOffice_hwg5_u19_05';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    map: getBrickTileTexture(),
    roughness: 0.75,
  });

  const wallAccentMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.6,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
  });

  const postRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.45,
  });

  const yuchoGreenMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.45,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
  });

  const warmInteriorMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde047,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.95,
  });

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.9,
  });

  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
  });

  const roadLineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.3,
    metalness: 0.7,
  });

  const treeGreenDark = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.9,
  });

  const treeGreenBright = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.85,
  });

  const treeTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.9,
  });

  // 1. PROPERTY BASE (Standard 6.0m × 6.0m Lot = 1U × 1U)
  const lotWidth = 6.0;

  const lawnGeo = new THREE.BoxGeometry(lotWidth, 0.15, 3.7);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.15);
  lawn.receiveShadow = true;
  group.add(lawn);

  const apronGeo = new THREE.BoxGeometry(lotWidth, 0.152, 0.8);
  const apron = new THREE.Mesh(apronGeo, foundationMat);
  apron.position.set(0, 0.076, 1.1);
  apron.receiveShadow = true;
  group.add(apron);

  // Sidewalk slab in front: COMPLETELY CLEAR (Z in [+1.5, +3.0])
  const sidewalkGeo = new THREE.BoxGeometry(lotWidth, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, foundationMat);
  sidewalk.position.set(0, 0.075, 2.25);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(lotWidth, 0.18, 0.12);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.09, 3.0);
  curb.receiveShadow = true;
  group.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(lotWidth, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 3.9);
    road.receiveShadow = true;
    group.add(road);

    const roadLineGeo = new THREE.BoxGeometry(lotWidth, 0.022, 0.12);
    const roadLine = new THREE.Mesh(roadLineGeo, roadLineMat);
    roadLine.position.set(0, 0.012, 3.4);
    group.add(roadLine);
  }

  // 2. MAIN POST OFFICE BUILDING
  const buildingGroup = new THREE.Group();
  buildingGroup.position.set(0.1, 0.15, -0.6);

  const bW = 4.6;
  const bD = 3.2;
  const bH = 4.2;

  const bBaseGeo = new THREE.BoxGeometry(bW + 0.06, 0.18, bD + 0.06);
  const bBase = new THREE.Mesh(bBaseGeo, foundationMat);
  bBase.position.y = 0.09;
  bBase.receiveShadow = true;
  buildingGroup.add(bBase);

  const bBodyGeo = new THREE.BoxGeometry(bW, bH - 0.18, bD);
  const bBody = new THREE.Mesh(bBodyGeo, wallMat);
  bBody.position.y = (bH + 0.18) / 2;
  bBody.castShadow = true;
  bBody.receiveShadow = true;
  buildingGroup.add(bBody);

  const parapetH = 0.35;
  const parapetGeo = new THREE.BoxGeometry(bW + 0.14, parapetH, bD + 0.14);
  const parapet = new THREE.Mesh(parapetGeo, wallAccentMat);
  parapet.position.y = bH + parapetH / 2;
  parapet.castShadow = true;
  buildingGroup.add(parapet);

  // Open Rooftop Safety Railing + Solar Panel + Postal Radio Antenna Mast (<= 5.85m)
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.48, metalMat, 1.4);
  roofRail.position.set(0, bH + parapetH, 0);
  buildingGroup.add(roofRail);

  const antennaMast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.1, 8), metalMat);
  antennaMast.position.set(-1.6, bH + parapetH + 0.55, -0.8);
  const antennaCross = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), metalMat);
  antennaCross.rotation.z = Math.PI / 2;
  antennaCross.position.set(-1.6, bH + parapetH + 0.95, -0.8);
  buildingGroup.add(antennaMast, antennaCross);

  // Decorative Horizontal Red & Green Postal Stripes across facade
  const stripeGeo = new THREE.BoxGeometry(bW + 0.04, 0.14, bD + 0.04);
  const stripe = new THREE.Mesh(stripeGeo, postRedMat);
  stripe.position.y = 2.45;
  const greenStripe = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.04, 0.06, bD + 0.04), yuchoGreenMat);
  greenStripe.position.y = 2.34;
  buildingGroup.add(stripe, greenStripe);

  // 360° Side & Rear Framed Windows
  addWrapAroundWindows({
    targetGroup: buildingGroup,
    bW,
    bD,
    floorHeights: [1.45, 3.35],
    winW: 0.85,
    winH: 0.85,
    sideCols: 2,
    backCols: 3,
    glassMat,
    frameMat: darkTrimMat,
  });

  // 3. FRONT CANOPY, 〒 POST OFFICE SIGN & YŪCHO BANK ATM SIGN
  const canopyW = 2.5;
  const canopyH = 0.18;
  const canopyD = 1.05;
  const canopyGeo = new THREE.BoxGeometry(canopyW, canopyH, canopyD);
  const canopy = new THREE.Mesh(canopyGeo, postRedMat);
  canopy.position.set(-0.6, 2.5, bD / 2 + canopyD / 2);
  canopy.castShadow = true;
  buildingGroup.add(canopy);

  const canopyPillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 12);
  const canopyPillar = new THREE.Mesh(canopyPillarGeo, darkTrimMat);
  canopyPillar.position.set(-0.6 - canopyW / 2 + 0.1, 1.2, bD / 2 + canopyD - 0.1);
  canopyPillar.castShadow = true;
  buildingGroup.add(canopyPillar);

  const signTexture = createPostOfficeSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signBoardGeo = new THREE.BoxGeometry(1.8, 0.52, 0.04);
  const signBoard = new THREE.Mesh(signBoardGeo, [
    darkTrimMat, darkTrimMat, darkTrimMat, darkTrimMat, signMat, darkTrimMat
  ]);
  signBoard.position.set(-0.6, 2.9, bD / 2 + 0.2);
  signBoard.castShadow = true;
  buildingGroup.add(signBoard);

  // Projecting Green Yūcho Bank ATM Sign on Right Side of Facade
  const atmSignTex = createAtmSignTexture();
  const atmSignMat = new THREE.MeshStandardMaterial({
    map: atmSignTex,
    emissive: 0xffffff,
    emissiveMap: atmSignTex,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const atmSignBox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.08), [
    yuchoGreenMat, yuchoGreenMat, yuchoGreenMat, yuchoGreenMat, atmSignMat, atmSignMat,
  ]);
  atmSignBox.position.set(2.02, 2.05, bD / 2 + 0.08);
  buildingGroup.add(atmSignBox);

  // 4. ENTRANCE AUTOMATIC DOORS & SERVICE WINDOWS
  const doorStoopGeo = new THREE.BoxGeometry(2.2, 0.08, 0.6);
  const doorStoop = new THREE.Mesh(doorStoopGeo, foundationMat);
  doorStoop.position.set(-0.6, 0.04, bD / 2 + 0.3);
  doorStoop.receiveShadow = true;
  buildingGroup.add(doorStoop);

  const doorW = 1.8;
  const doorH = 2.15;
  const doorFrameGeo = new THREE.BoxGeometry(doorW + 0.12, doorH + 0.06, 0.04);
  const doorFrame = new THREE.Mesh(doorFrameGeo, darkTrimMat);
  doorFrame.position.set(-0.6, doorH / 2 + 0.03, bD / 2 + 0.02);
  buildingGroup.add(doorFrame);

  const doorGlassGeo = new THREE.BoxGeometry(doorW, doorH, 0.02);
  const doorGlass = new THREE.Mesh(doorGlassGeo, glassMat);
  doorGlass.position.set(-0.6, doorH / 2 + 0.03, bD / 2 + 0.045);
  buildingGroup.add(doorGlass);

  const doorBadgeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 24);
  doorBadgeGeo.rotateX(Math.PI / 2);
  const doorBadge = new THREE.Mesh(doorBadgeGeo, postRedMat);
  doorBadge.position.set(-0.6, 1.25, bD / 2 + 0.065);
  buildingGroup.add(doorBadge);

  // First Floor Service Counter & ATM Corner Window (Right side)
  const winW = 1.4;
  const winH = 1.2;
  const winY = 1.45;
  const winX = 1.2;

  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.08, winH + 0.08, 0.04), darkTrimMat);
  winFrame.position.set(winX, winY, bD / 2 + 0.02);
  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.02), glassMat);
  winGlass.position.set(winX, winY, bD / 2 + 0.042);
  buildingGroup.add(winFrame, winGlass);

  // Second Floor Administration Windows (3 large square windows)
  for (let i = -1; i <= 1; i++) {
    const uWinW = 0.95;
    const uWinH = 0.85;
    const uWinY = 3.35;
    const uWinX = i * 1.4;

    const uFrame = new THREE.Mesh(new THREE.BoxGeometry(uWinW + 0.08, uWinH + 0.08, 0.04), darkTrimMat);
    uFrame.position.set(uWinX, uWinY, bD / 2 + 0.02);
    const uGlass = new THREE.Mesh(new THREE.BoxGeometry(uWinW, uWinH, 0.02), glassMat);
    uGlass.position.set(uWinX, uWinY, bD / 2 + 0.042);
    buildingGroup.add(uFrame, uGlass);
  }

  group.add(buildingGroup);

  // 5. JAPANESE STREET MAILBOX (Posuto / ポスト at X = -1.8m, Z = 1.25m)
  const mailboxGroup = new THREE.Group();
  mailboxGroup.position.set(-1.8, 0.15, 1.25);

  const boxW = 0.52;
  const boxH = 0.62;
  const boxD = 0.44;

  const postLegGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.38, 12);
  const postLeg = new THREE.Mesh(postLegGeo, darkTrimMat);
  postLeg.position.y = 0.19;
  postLeg.castShadow = true;
  mailboxGroup.add(postLeg);

  const postFootGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.04, 16);
  const postFoot = new THREE.Mesh(postFootGeo, darkTrimMat);
  postFoot.position.y = 0.02;
  mailboxGroup.add(postFoot);

  const mbTexture = createMailboxTexture();
  const mbFrontMat = new THREE.MeshStandardMaterial({
    map: mbTexture,
    roughness: 0.45,
  });
  const boxBodyGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
  const boxBody = new THREE.Mesh(boxBodyGeo, [
    postRedMat, postRedMat, postRedMat, postRedMat, mbFrontMat, postRedMat
  ]);
  boxBody.position.y = 0.38 + boxH / 2;
  boxBody.castShadow = true;
  mailboxGroup.add(boxBody);

  // Protruding Rain-Hood Visors over the two mail slots
  [-0.12, 0.12].forEach((sx) => {
    const slotHood = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.06), postRedMat);
    slotHood.position.set(sx, 0.93, boxD / 2 + 0.025);
    slotHood.rotation.x = 0.2;
    mailboxGroup.add(slotHood);
  });

  const capGeo = new THREE.CylinderGeometry(boxD / 2, boxD / 2, boxW, 16, 1, false, 0, Math.PI);
  capGeo.rotateZ(Math.PI / 2);
  const boxCap = new THREE.Mesh(capGeo, postRedMat);
  boxCap.position.set(0, 0.38 + boxH, 0);
  boxCap.castShadow = true;
  mailboxGroup.add(boxCap);

  group.add(mailboxGroup);

  // 6. JAPAN POST DELIVERY SCOOTER (Honda Super Cub at X = +1.85m, Z = 1.25m)
  const scooterGroup = new THREE.Group();
  scooterGroup.position.set(1.85, 0.15, 1.25);
  scooterGroup.rotation.y = -0.15;

  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.07, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

  const frontWheel = new THREE.Mesh(wheelGeo, tireMat);
  frontWheel.position.set(0, 0.22, 0.55);
  frontWheel.castShadow = true;
  const frontHub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), metalMat);
  frontHub.rotateZ(Math.PI / 2);
  frontHub.position.set(0, 0.22, 0.55);
  scooterGroup.add(frontWheel, frontHub);

  const rearWheel = new THREE.Mesh(wheelGeo, tireMat);
  rearWheel.position.set(0, 0.22, -0.45);
  rearWheel.castShadow = true;
  const rearHub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), metalMat);
  rearHub.rotateZ(Math.PI / 2);
  rearHub.position.set(0, 0.22, -0.45);
  scooterGroup.add(rearWheel, rearHub);

  // Center Kickstand
  const kickstand = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.03), darkTrimMat);
  kickstand.position.set(0, 0.11, -0.05);
  kickstand.rotation.x = 0.25;
  scooterGroup.add(kickstand);

  // Scooter Chassis & White Leg-Shield Fairing
  const chassisGeo = new THREE.BoxGeometry(0.22, 0.25, 0.75);
  const scooterWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const chassis = new THREE.Mesh(chassisGeo, postRedMat);
  chassis.position.set(0, 0.32, 0.05);
  chassis.castShadow = true;
  scooterGroup.add(chassis);

  const shieldGeo = new THREE.BoxGeometry(0.36, 0.44, 0.06);
  const shield = new THREE.Mesh(shieldGeo, scooterWhiteMat);
  shield.position.set(0, 0.45, 0.42);
  shield.rotation.x = 0.2;
  shield.castShadow = true;
  scooterGroup.add(shield);

  // Handlebars, Clear Windscreen Visor & Rear-View Mirrors
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8);
  const stem = new THREE.Mesh(stemGeo, metalMat);
  stem.position.set(0, 0.62, 0.45);
  scooterGroup.add(stem);

  const barGeo = new THREE.BoxGeometry(0.44, 0.03, 0.03);
  const bar = new THREE.Mesh(barGeo, darkTrimMat);
  bar.position.set(0, 0.78, 0.44);
  scooterGroup.add(bar);

  const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.015), glassMat);
  windscreen.position.set(0, 0.92, 0.46);
  windscreen.rotation.x = -0.15;
  scooterGroup.add(windscreen);

  [-0.20, 0.20].forEach((mx) => {
    const mStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), metalMat);
    mStalk.position.set(mx, 0.85, 0.44);
    const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), darkTrimMat);
    mHead.position.set(mx * 1.1, 0.92, 0.44);
    scooterGroup.add(mStalk, mHead);
  });

  // Glowing Round Headlight
  const lightGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12);
  lightGeo.rotateX(Math.PI / 2);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(0, 0.68, 0.48);
  scooterGroup.add(light);

  // Driver Seat
  const seatGeo = new THREE.BoxGeometry(0.24, 0.08, 0.3);
  const scSeatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const scSeat = new THREE.Mesh(seatGeo, scSeatMat);
  scSeat.position.set(0, 0.48, -0.05);
  scSeat.castShadow = true;
  scooterGroup.add(scSeat);

  // Red Mail Delivery Rear Cargo Box
  const cargoBoxGeo = new THREE.BoxGeometry(0.38, 0.34, 0.38);
  const cargoBox = new THREE.Mesh(cargoBoxGeo, postRedMat);
  cargoBox.position.set(0, 0.56, -0.42);
  cargoBox.castShadow = true;
  scooterGroup.add(cargoBox);

  const boxMarkGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
  boxMarkGeo.rotateX(Math.PI / 2);
  const boxMark = new THREE.Mesh(boxMarkGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
  boxMark.position.set(0, 0.56, -0.62);
  scooterGroup.add(boxMark);

  group.add(scooterGroup);

  // 7. BACKYARD PERIMETER & LANDSCAPING
  if (includeTrees) {
    const wallH = 1.2;
    const backWallGeo = new THREE.BoxGeometry(lotWidth, wallH, 0.08);
    const backWall = new THREE.Mesh(backWallGeo, foundationMat);
    backWall.position.set(0, 0.15 + wallH / 2, -2.85);
    backWall.receiveShadow = true;
    group.add(backWall);

    const sideWallGeo = new THREE.BoxGeometry(0.08, wallH, 3.2);
    const sideWall = new THREE.Mesh(sideWallGeo, foundationMat);
    sideWall.position.set(-lotWidth / 2 + 0.04, 0.15 + wallH / 2, -1.2);
    group.add(sideWall);

    const treeGroup = new THREE.Group();
    treeGroup.position.set(-2.0, 0.15, -2.1);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 8), treeTrunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    for (let i = 0; i < 3; i++) {
      const radius = 1.0 * (1 - i * 0.22);
      const coneH = 1.4;
      const coneGeo = new THREE.ConeGeometry(radius, coneH, 8);
      const coneMat = i % 2 === 0 ? treeGreenDark : treeGreenBright;
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 1.3 + i * 0.85;
      cone.castShadow = true;
      treeGroup.add(cone);
    }
    group.add(treeGroup);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
