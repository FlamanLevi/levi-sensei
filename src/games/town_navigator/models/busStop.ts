import * as THREE from 'three';
import { getBrickTileTexture } from './wallTextures';

let cachedBusSignTex: THREE.CanvasTexture | null = null;
let cachedTimetableTex: THREE.CanvasTexture | null = null;
let cachedVendingTex: THREE.CanvasTexture | null = null;
let cachedRecycleTex: THREE.CanvasTexture | null = null;
let cachedRouteMapTex: THREE.CanvasTexture | null = null;
let cachedLedArrivalTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for the Japanese bus stop round head sign
 */
function createBusSignTexture(): THREE.CanvasTexture {
  if (cachedBusSignTex) return cachedBusSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  ctx.save();
  ctx.translate(128, 128);
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-128, -128);

  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 100, 256, 56);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(102, 112, 52, 34, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(107, 116, 42, 11);

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(111, 137, 3, 0, Math.PI * 2);
  ctx.arc(145, 137, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedBusSignTex = texture;
  return texture;
}

/**
 * Procedural texture for the bus timetable schedule board
 */
function createTimetableTexture(): THREE.CanvasTexture {
  if (cachedTimetableTex) return cachedTimetableTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 384);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 376);

  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(8, 8, 240, 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUS STOP', 128, 30);

  ctx.font = 'bold 12px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('バス停・時刻表', 128, 48);

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 68);
  ctx.lineTo(80, 360);
  ctx.moveTo(168, 68);
  ctx.lineTo(168, 360);

  for (let y = 68; y <= 360; y += 24) {
    ctx.moveTo(12, y);
    ctx.lineTo(244, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#1d4ed8';
  for (let y = 82; y <= 350; y += 24) {
    ctx.fillRect(25, y - 4, 38, 8);
    ctx.fillRect(95, y - 4, 55, 8);
    ctx.fillRect(182, y - 4, 48, 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedTimetableTex = texture;
  return texture;
}

/**
 * Procedural texture for Illuminated Transit Route Map inside the shelter
 */
function createRouteMapTexture(): THREE.CanvasTexture {
  if (cachedRouteMapTex) return cachedRouteMapTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 384);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(10, 10, 236, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TOWN BUS ROUTE', 128, 32);
  ctx.font = 'bold 12px "BIZ UDPGothic", sans-serif';
  ctx.fillText('市内循環バス路線図', 128, 49);

  // Colored transit loop lines & station nodes
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 8;
  ctx.strokeRect(42, 90, 172, 180);

  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 75);
  ctx.lineTo(128, 295);
  ctx.stroke();

  const stops = [
    [42, 90], [128, 90], [214, 90],
    [42, 180], [128, 180], [214, 180],
    [42, 270], [128, 270], [214, 270],
  ];
  stops.forEach(([sx, sy], idx) => {
    ctx.fillStyle = idx === 4 ? '#ef4444' : '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('● YOU ARE HERE (現在地)', 128, 335);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedRouteMapTex = texture;
  return texture;
}

/**
 * Procedural texture for overhead LED Bus Arrival Display ("NEXT BUS: 3 MIN")
 */
function createLedArrivalTexture(): THREE.CanvasTexture {
  if (cachedLedArrivalTex) return cachedLedArrivalTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT BUS: 3 MIN', 128, 26);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 15px "BIZ UDPGothic", sans-serif';
  ctx.fillText('まもなくバスがきます', 128, 50);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedLedArrivalTex = texture;
  return texture;
}

/**
 * Procedural texture for Japanese drink vending machine (Jidōhanbaiki)
 */
function createVendingMachineTexture(): THREE.CanvasTexture {
  if (cachedVendingTex) return cachedVendingTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 384);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(16, 16, 224, 48);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 220, 44);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.font = '900 18px sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.fillText('COLD', 68, 38);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('&', 128, 38);

  ctx.font = '900 18px sans-serif';
  ctx.fillStyle = '#dc2626';
  ctx.fillText('HOT', 188, 38);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(48, 50, 40, 4);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(168, 50, 40, 4);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(16, 76, 224, 180);

  const rowY = [92, 146, 200];
  const canColors = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#e2e8f0', '#06b6d4'];

  rowY.forEach((ry, rIdx) => {
    for (let c = 0; c < 6; c++) {
      const cx = 26 + c * 35;
      ctx.fillStyle = canColors[(c + rIdx) % canColors.length];
      ctx.fillRect(cx, ry, 22, 32);

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx, ry, 22, 5);

      ctx.fillStyle = rIdx === 2 ? '#ef4444' : '#0284c7';
      ctx.fillRect(cx + 2, ry + 36, 18, 6);
    }
  });

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(165, 272, 70, 32);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('¥140', 200, 288);

  ctx.fillStyle = '#334155';
  ctx.fillRect(24, 316, 208, 52);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 316, 208, 52);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PUSH', 128, 342);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedVendingTex = texture;
  return texture;
}

/**
 * Procedural texture for Japanese beverage recycling bin label (PET Bottles & Cans)
 */
function createRecycleLabelTexture(): THREE.CanvasTexture {
  if (cachedRecycleTex) return cachedRecycleTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 96);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(8, 8, 114, 80, 8);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ペットボトル', 65, 38);

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.fillText('PET BOTTLES', 65, 64);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(134, 8, 114, 80, 8);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillText('あきカン', 191, 38);

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.fillText('CANS', 191, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedRecycleTex = texture;
  return texture;
}

export interface BusStopOptions {
  includeRoad?: boolean;
  includeHedge?: boolean;
  scale?: number;
}

/**
 * Builds an authentic, low-poly 3D Bus Stop matching textbook card hwg5_u19_13
 */
export function buildBusStopMesh(options: BusStopOptions = {}): THREE.Group {
  const { includeRoad = true, includeHedge = true, scale = 1.0 } = options;
  const group = new THREE.Group();
  group.name = 'BusStop_hwg5_u19_13';

  // Shared Standard Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
    metalness: 0.05,
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

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xb56952, // Warm terracotta brick tile
    map: getBrickTileTexture(),
    roughness: 0.7,
  });

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xf5eedc,
    roughness: 0.5,
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x2e231e,
    roughness: 0.6,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
  });

  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.4,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.3,
    metalness: 0.7,
  });

  const tactileYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.6,
  });

  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });

  const hedgeMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.9,
  });

  const hedgeAccentMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.85,
  });

  const azaleaPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.75,
  });

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.95,
  });

  const treeTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.9,
  });

  const treeGreenDark = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.9,
  });

  const treeGreenBright = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.85,
  });

  const vendingTexture = createVendingMachineTexture();
  const vendingMat = new THREE.MeshStandardMaterial({
    map: vendingTexture,
    emissive: 0xffffff,
    emissiveMap: vendingTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });

  const recycleBinMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.5,
  });

  const recycleLabelTexture = createRecycleLabelTexture();
  const recycleLabelMat = new THREE.MeshStandardMaterial({
    map: recycleLabelTexture,
    roughness: 0.4,
    transparent: true,
  });

  const binDarkInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x050811,
    roughness: 0.9,
  });

  // 1. BASE FOOTPRINT (Standard 6.0m × 6.0m Lot = 1U × 1U)
  const lotWidth = 6.0;

  const lawnGeo = new THREE.BoxGeometry(lotWidth, 0.15, 3.4);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.3);
  lawn.receiveShadow = true;
  group.add(lawn);

  const padGeo = new THREE.BoxGeometry(lotWidth, 0.152, 1.1);
  const pad = new THREE.Mesh(padGeo, concreteMat);
  pad.position.set(0, 0.076, 0.95);
  pad.receiveShadow = true;
  group.add(pad);

  // Sidewalk slab in front: COMPLETELY CLEAR (Z in [+1.5, +3.0])
  const sidewalkGeo = new THREE.BoxGeometry(lotWidth, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, concreteMat);
  sidewalk.position.set(0, 0.075, 2.25);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  // Flush Yellow Tactile Paving Strip (*Tenji-Burokku*) along transit boarding edge
  const tactileStrip = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.008, 0.24), tactileYellowMat);
  tactileStrip.position.set(0.15, 0.154, 1.48);
  tactileStrip.receiveShadow = true;
  group.add(tactileStrip);

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

  // 2. BUS STOP SIGNPOST (Placed on transit platform: X = -0.85m, Z = 1.35m)
  const signGroup = new THREE.Group();
  signGroup.position.set(-0.85, 0.15, 1.35);

  const signBaseGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.04, 16);
  const signBase = new THREE.Mesh(signBaseGeo, darkFrameMat);
  signBase.position.y = 0.02;
  signGroup.add(signBase);

  const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.1, 12);
  const pole = new THREE.Mesh(poleGeo, metalMat);
  pole.position.y = 1.05;
  pole.castShadow = true;
  signGroup.add(pole);

  const boardGeo = new THREE.BoxGeometry(0.36, 0.54, 0.03);
  const timetableTexture = createTimetableTexture();
  const boardMat = new THREE.MeshStandardMaterial({
    map: timetableTexture,
    roughness: 0.6,
  });
  const scheduleBoard = new THREE.Mesh(boardGeo, [
    darkFrameMat, darkFrameMat, darkFrameMat, darkFrameMat, boardMat, boardMat
  ]);
  scheduleBoard.position.set(0, 1.15, 0.02);
  scheduleBoard.castShadow = true;
  signGroup.add(scheduleBoard);

  // Round bus stop head disc (top)
  const signDiscGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.03, 36);
  signDiscGeo.rotateX(Math.PI / 2);
  const signTexture = createBusSignTexture();
  const signFaceMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    roughness: 0.5,
  });
  const signDisc = new THREE.Mesh(signDiscGeo, [
    darkFrameMat, signFaceMat, signFaceMat
  ]);
  signDisc.position.set(0, 1.95, 0.02);
  signDisc.castShadow = true;
  signGroup.add(signDisc);

  group.add(signGroup);

  // 3. WAITING SHELTER (Center X = 0.85m, Z = 0.85m on transit platform)
  const shelter = new THREE.Group();
  shelter.position.set(0.85, 0.15, 0.85);

  const shelterW = 2.4;
  const shelterH = 2.0;
  const shelterD = 1.1;

  // Back Wall (Textured Terracotta Brick)
  const backWallLowerGeo = new THREE.BoxGeometry(shelterW, 0.85, 0.08);
  const backWallLower = new THREE.Mesh(backWallLowerGeo, wallMat);
  backWallLower.position.set(0, 0.425, -shelterD / 2);
  backWallLower.castShadow = true;
  backWallLower.receiveShadow = true;
  shelter.add(backWallLower);

  const backWallUpperGeo = new THREE.BoxGeometry(shelterW, 0.35, 0.08);
  const backWallUpper = new THREE.Mesh(backWallUpperGeo, wallMat);
  backWallUpper.position.set(0, 1.825, -shelterD / 2);
  backWallUpper.castShadow = true;
  shelter.add(backWallUpper);

  // Back Window Glass & Frames (4 Panes)
  const windowAreaW = shelterW - 0.2;
  const windowAreaH = 0.8;
  const windowAreaY = 1.25;

  const glassBackGeo = new THREE.BoxGeometry(windowAreaW, windowAreaH, 0.02);
  const glassBack = new THREE.Mesh(glassBackGeo, glassMat);
  glassBack.position.set(0, windowAreaY, -shelterD / 2);
  shelter.add(glassBack);

  const frameBorderGeo = new THREE.BoxGeometry(windowAreaW + 0.04, 0.04, 0.09);
  const frameTop = new THREE.Mesh(frameBorderGeo, pillarMat);
  frameTop.position.set(0, windowAreaY + windowAreaH / 2, -shelterD / 2);
  const frameBottom = new THREE.Mesh(frameBorderGeo, pillarMat);
  frameBottom.position.set(0, windowAreaY - windowAreaH / 2, -shelterD / 2);
  shelter.add(frameTop, frameBottom);

  const mullionGeo = new THREE.BoxGeometry(0.04, windowAreaH, 0.09);
  const paneW = windowAreaW / 4;
  for (let i = 0; i <= 4; i++) {
    const mullion = new THREE.Mesh(mullionGeo, pillarMat);
    mullion.position.set(-windowAreaW / 2 + i * paneW, windowAreaY, -shelterD / 2);
    shelter.add(mullion);
  }

  // Right Side Windbreak Wall + Illuminated Transit Route Map Lightbox
  const sideWallGeo = new THREE.BoxGeometry(0.08, shelterH, shelterD);
  const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
  rightWall.position.set(shelterW / 2 - 0.04, shelterH / 2, 0);
  rightWall.castShadow = true;
  shelter.add(rightWall);

  const routeMapTex = createRouteMapTexture();
  const routeMapMat = new THREE.MeshStandardMaterial({
    map: routeMapTex,
    emissive: 0xffffff,
    emissiveMap: routeMapTex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const routeLightbox = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.65), [
    darkFrameMat, routeMapMat, darkFrameMat, darkFrameMat, darkFrameMat, darkFrameMat,
  ]);
  routeLightbox.position.set(shelterW / 2 - 0.09, 1.15, 0.05);
  shelter.add(routeLightbox);

  // Left front corner support post
  const frontPillarGeo = new THREE.BoxGeometry(0.08, shelterH, 0.08);
  const frontPillar = new THREE.Mesh(frontPillarGeo, pillarMat);
  frontPillar.position.set(-shelterW / 2 + 0.04, shelterH / 2, shelterD / 2);
  frontPillar.castShadow = true;
  shelter.add(frontPillar);

  // Slanted Overhanging Roof
  const roofW = shelterW + 0.3;
  const roofD = shelterD + 0.45;
  const roofGeo = new THREE.BoxGeometry(roofW, 0.08, roofD);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.x = 0.08;
  roof.position.set(0, shelterH + 0.06, 0.05);
  roof.castShadow = true;
  shelter.add(roof);

  for (let i = -4; i <= 4; i++) {
    const ridgeGeo = new THREE.BoxGeometry(0.03, 0.03, roofD - 0.02);
    const ridge = new THREE.Mesh(ridgeGeo, darkFrameMat);
    ridge.rotation.x = 0.08;
    ridge.position.set(i * (roofW / 9.5), shelterH + 0.11, 0.05);
    shelter.add(ridge);
  }

  // Warm Interior Ceiling Light Strip + Overhead LED Next-Bus Display
  const ceilingLight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.12), warmGlowMat);
  ceilingLight.position.set(0, shelterH - 0.02, 0.05);
  shelter.add(ceilingLight);

  const ledTex = createLedArrivalTexture();
  const ledMat = new THREE.MeshStandardMaterial({
    map: ledTex,
    emissive: 0xffffff,
    emissiveMap: ledTex,
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });
  const ledSign = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.20, 0.05), [
    darkFrameMat, darkFrameMat, darkFrameMat, darkFrameMat, ledMat, darkFrameMat,
  ]);
  ledSign.position.set(-0.4, shelterH - 0.12, shelterD / 2 + 0.04);
  shelter.add(ledSign);

  // 4. WAITING CHAIRS (4 Blue molded scoop seats on chrome support beam)
  const chairSpacing = 0.45;
  const chairStartX = -((4 - 1) * chairSpacing) / 2;
  const chairY = 0.38;
  const chairZ = -shelterD / 2 + 0.32;

  const supportBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.65, 8), metalMat);
  supportBeam.rotation.z = Math.PI / 2;
  supportBeam.position.set(0, chairY - 0.04, chairZ);
  shelter.add(supportBeam);

  for (let i = 0; i < 4; i++) {
    const chairGroup = new THREE.Group();
    const cx = chairStartX + i * chairSpacing;
    chairGroup.position.set(cx, chairY, chairZ);

    const chairLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.38, 8);
    const chairLeg = new THREE.Mesh(chairLegGeo, metalMat);
    chairLeg.position.y = -0.19;
    chairLeg.castShadow = true;
    chairGroup.add(chairLeg);

    const seatGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.06, 16);
    const seat = new THREE.Mesh(seatGeo, chairMat);
    seat.scale.set(1.0, 1.0, 1.2);
    seat.castShadow = true;
    chairGroup.add(seat);

    const backrestGeo = new THREE.BoxGeometry(0.3, 0.26, 0.04);
    const backrest = new THREE.Mesh(backrestGeo, chairMat);
    backrest.position.set(0, 0.14, -0.14);
    backrest.rotation.x = -0.12;
    backrest.castShadow = true;
    chairGroup.add(backrest);

    shelter.add(chairGroup);
  }

  group.add(shelter);

  // 4b. JAPANESE DRINK VENDING MACHINE & RECYCLE BIN (X = -2.0m, Z = 0.95m)
  const vendingGroup = new THREE.Group();
  vendingGroup.position.set(-2.0, 0.15, 0.95);

  const vW = 0.82;
  const vH = 1.8;
  const vD = 0.65;
  const vBodyGeo = new THREE.BoxGeometry(vW, vH, vD);

  const vRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
  const vMesh = new THREE.Mesh(vBodyGeo, [
    vRedMat, vRedMat, vRedMat, vRedMat, vendingMat, vRedMat
  ]);
  vMesh.position.y = vH / 2;
  vMesh.castShadow = true;
  vMesh.receiveShadow = true;
  vendingGroup.add(vMesh);

  // Dual-Hole Beverage Recycling Bin
  const binGroup = new THREE.Group();
  binGroup.position.set(-0.65, 0, 0.05);

  const binW = 0.38;
  const binD = 0.38;
  const binBodyH = 0.54;

  const binBodyGeo = new THREE.BoxGeometry(binW, binBodyH, binD);
  const binBody = new THREE.Mesh(binBodyGeo, recycleBinMat);
  binBody.position.y = binBodyH / 2;
  binBody.castShadow = true;
  binBody.receiveShadow = true;
  binGroup.add(binBody);

  const collarGeo = new THREE.BoxGeometry(binW + 0.03, 0.035, binD + 0.03);
  const collar = new THREE.Mesh(collarGeo, recycleBinMat);
  collar.position.y = binBodyH + 0.0175;
  collar.castShadow = true;
  binGroup.add(collar);

  const hoodGroup = new THREE.Group();
  hoodGroup.position.y = binBodyH + 0.035;

  const hoodBaseGeo = new THREE.BoxGeometry(binW + 0.01, 0.08, binD + 0.01);
  const hoodBase = new THREE.Mesh(hoodBaseGeo, recycleBinMat);
  hoodBase.position.y = 0.04;
  hoodBase.castShadow = true;
  hoodGroup.add(hoodBase);

  const domeRadius = (binD + 0.01) / 2;
  const domeLength = binW + 0.01;
  const domeGeo = new THREE.CylinderGeometry(domeRadius, domeRadius, domeLength, 24, 1, false, 0, Math.PI);
  domeGeo.rotateZ(Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, recycleBinMat);
  dome.position.set(0, 0.08, 0);
  dome.castShadow = true;
  hoodGroup.add(dome);

  const visorW = 0.32;
  const visorH = 0.16;
  const visorAngle = Math.PI / 6;
  const visorGeo = new THREE.BoxGeometry(visorW, visorH, 0.02);
  const visor = new THREE.Mesh(visorGeo, recycleBinMat);
  visor.position.set(0, 0.10, binD / 2 - 0.02);
  visor.rotation.x = -visorAngle;
  hoodGroup.add(visor);

  const holeRadius = 0.036;
  const holeSpacing = 0.085;
  [-holeSpacing, holeSpacing].forEach((hx) => {
    const snoutRingGeo = new THREE.CylinderGeometry(holeRadius + 0.008, holeRadius + 0.012, 0.025, 16);
    snoutRingGeo.rotateX(Math.PI / 2 - visorAngle);
    const snoutRing = new THREE.Mesh(snoutRingGeo, recycleBinMat);
    snoutRing.position.set(hx, 0.125, binD / 2 + 0.005);
    snoutRing.castShadow = true;
    hoodGroup.add(snoutRing);

    const holeInnerGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, 0.028, 16);
    holeInnerGeo.rotateX(Math.PI / 2 - visorAngle);
    const holeInner = new THREE.Mesh(holeInnerGeo, binDarkInteriorMat);
    holeInner.position.set(hx, 0.125, binD / 2 + 0.007);
    hoodGroup.add(holeInner);
  });

  const labelGeo = new THREE.BoxGeometry(0.25, 0.065, 0.01);
  const labelMesh = new THREE.Mesh(labelGeo, recycleLabelMat);
  labelMesh.position.set(0, 0.055, binD / 2 + 0.008);
  labelMesh.rotation.x = -visorAngle;
  hoodGroup.add(labelMesh);

  binGroup.add(hoodGroup);
  vendingGroup.add(binGroup);
  group.add(vendingGroup);

  // 5. GREEN HEDGE, AZALEA SHRUBS & TREES
  if (includeHedge) {
    const hedgeGroup = new THREE.Group();
    hedgeGroup.position.set(0, 0.15, 0.20);

    const baseHedgeGeo = new THREE.BoxGeometry(lotWidth, 0.65, 0.22);
    const baseHedge = new THREE.Mesh(baseHedgeGeo, hedgeMat);
    baseHedge.position.set(0, 0.325, 0);
    baseHedge.castShadow = true;
    baseHedge.receiveShadow = true;
    hedgeGroup.add(baseHedge);

    const bushOffsets = [-2.6, -2.1, -1.6, -1.1, -0.6, 0.0, 0.6, 1.1, 1.6, 2.1, 2.6];
    bushOffsets.forEach((bx, idx) => {
      const radius = 0.18 + (idx % 3) * 0.03;
      const bushGeo = new THREE.DodecahedronGeometry(radius, 0);
      const bushMat = idx % 3 === 0 ? azaleaPinkMat : idx % 2 === 0 ? hedgeMat : hedgeAccentMat;
      const bush = new THREE.Mesh(bushGeo, bushMat);
      const zOffset = -0.03 - (idx % 2) * 0.04;
      bush.position.set(bx, 0.62 + (idx % 2) * 0.04, zOffset);
      bush.rotation.set(idx * 0.5, idx * 0.8, 0);
      bush.castShadow = true;
      hedgeGroup.add(bush);
    });

    group.add(hedgeGroup);

    const buildTree = (x: number, z: number, totalH: number, scaleW: number): THREE.Group => {
      const tree = new THREE.Group();
      tree.position.set(x, 0.15, z);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.5, 8), treeTrunkMat);
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      tree.add(trunk);

      const coneLayers = 3;
      const baseR = 1.0 * scaleW;
      const coneH = (totalH - 1.0) / 2.2;

      for (let i = 0; i < coneLayers; i++) {
        const radius = baseR * (1 - i * 0.22);
        const coneGeo = new THREE.ConeGeometry(radius, coneH, 8);
        const coneMat = i % 2 === 0 ? treeGreenDark : treeGreenBright;
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = 1.3 + i * (coneH * 0.65);
        cone.castShadow = true;
        tree.add(cone);
      }

      return tree;
    };

    const tree1 = buildTree(-2.1, -1.8, 4.6, 1.0);
    group.add(tree1);

    const tree2 = buildTree(2.1, -1.8, 4.8, 1.1);
    group.add(tree2);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
