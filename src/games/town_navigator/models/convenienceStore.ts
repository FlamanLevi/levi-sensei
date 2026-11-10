import * as THREE from 'three';
import { getHorizontalSidingTexture, addWrapAroundWindows, buildPerimeterRailing } from './wallTextures';

let cachedFasciaTex: THREE.CanvasTexture | null = null;
let cachedShelvesTex: THREE.CanvasTexture | null = null;
let cachedBikeSignTex: THREE.CanvasTexture | null = null;
let cachedPylonSignTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Japanese Convenience Store (Konbini) fascia header sign
 */
function createKonbiniFasciaTexture(): THREE.CanvasTexture {
  if (cachedFasciaTex) return cachedFasciaTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 128);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 1024, 28);

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 100, 1024, 28);

  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(32, 34, 76, 60, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('24', 70, 64);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 38px sans-serif';
  ctx.fillText('CONVENIENCE STORE', 135, 58);

  ctx.font = 'bold 18px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.fillText('コンビニ • 24時間営業', 138, 86);

  const badgeLabels = ['ATM', '☕ CAFE', 'FREE Wi-Fi'];
  badgeLabels.forEach((label, idx) => {
    const bx = 710 + idx * 95;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(bx - 40, 42, 80, 44, 8);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx, 64);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedFasciaTex = texture;
  return texture;
}

/**
 * Procedural texture for Freestanding Roadside Illuminated Pylon Sign (ポール看板)
 */
function createPylonSignTexture(): THREE.CanvasTexture {
  if (cachedPylonSignTex) return cachedPylonSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 256);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 128, 85);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 44px sans-serif';
  ctx.fillText('24', 64, 52);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('OPEN', 64, 74);

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(8, 96, 112, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px sans-serif';
  ctx.fillText('ATM', 64, 120);
  ctx.font = 'bold 11px "BIZ UDPGothic", sans-serif';
  ctx.fillText('銀行・たばこ', 64, 136);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(8, 154, 112, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 26px sans-serif';
  ctx.fillText('〒', 38, 184);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('TAX FREE', 82, 182);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "BIZ UDPGothic", sans-serif';
  ctx.fillText('コンビニ', 64, 230);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedPylonSignTex = texture;
  return texture;
}

/**
 * Procedural texture for store interior shelving & products seen through glass
 */
function createInteriorShelvesTexture(): THREE.CanvasTexture {
  if (cachedShelvesTex) return cachedShelvesTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fefce8';
  ctx.fillRect(0, 0, 256, 256);

  const shelfY = [35, 95, 155, 215];
  const shelfCols = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  shelfY.forEach((sy, rIdx) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(8, sy + 28, 240, 6);

    const ry = sy + 4;
    for (let c = 0; c < 7; c++) {
      const cx = 18 + c * 32;
      ctx.fillStyle = shelfCols[(c + rIdx) % shelfCols.length];
      ctx.fillRect(cx, ry, 22, 24);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 4, ry + 4, 14, 6);
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedShelvesTex = texture;
  return texture;
}

function createBikeParkingSignTexture(): THREE.CanvasTexture {
  if (cachedBikeSignTex) return cachedBikeSignTex;
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 64;
  const sCtx = signCanvas.getContext('2d')!;
  sCtx.fillStyle = '#0284c7';
  sCtx.fillRect(0, 0, 256, 64);
  sCtx.strokeStyle = '#ffffff';
  sCtx.lineWidth = 3;
  sCtx.strokeRect(4, 4, 248, 56);
  sCtx.fillStyle = '#ffffff';
  sCtx.textAlign = 'center';
  sCtx.textBaseline = 'middle';
  sCtx.font = 'bold 15px sans-serif';
  sCtx.fillText('BICYCLE PARKING', 128, 22);
  sCtx.font = 'bold 12px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  sCtx.fillText('駐輪場', 128, 44);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  cachedBikeSignTex = signTexture;
  return signTexture;
}

/**
 * Builds a Japanese convenience store bicycle parking rack (駐輪場) with 2 parked bicycles
 */
function buildBikeRack(): THREE.Group {
  const rack = new THREE.Group();
  rack.name = 'BikeRack_Churinjo';

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.8,
    roughness: 0.3,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.5,
    roughness: 0.5,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
  });

  const baseRail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.12), darkMetalMat);
  baseRail.position.y = 0.02;
  rack.add(baseRail);

  const hoopGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
  [-0.45, 0, 0.45].forEach((hx) => {
    const postL = new THREE.Mesh(hoopGeo, metalMat);
    postL.position.set(hx - 0.05, 0.18, 0);
    const postR = new THREE.Mesh(hoopGeo, metalMat);
    postR.position.set(hx + 0.05, 0.18, 0);
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.10, 8), metalMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(hx, 0.35, 0);
    rack.add(postL, postR, topBar);
  });

  const wheelGeo = new THREE.TorusGeometry(0.22, 0.02, 8, 20);

  // Build 2 parked commuter bicycles (Blue in center stall, Red in right stall)
  [
    { x: 0, color: 0x0284c7 },
    { x: 0.45, color: 0xef4444 },
  ].forEach(({ x, color }) => {
    const bike = new THREE.Group();
    bike.position.set(x, 0, 0.05);
    const frameColorMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });

    const frontWheel = new THREE.Mesh(wheelGeo, tireMat);
    frontWheel.position.set(0, 0.22, 0.36);
    const rearWheel = new THREE.Mesh(wheelGeo, tireMat);
    rearWheel.position.set(0, 0.22, -0.36);
    bike.add(frontWheel, rearWheel);

    const frameGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.45, 8);
    const frameBar1 = new THREE.Mesh(frameGeo, frameColorMat);
    frameBar1.rotation.x = 0.6;
    frameBar1.position.set(0, 0.32, 0.16);
    const frameBar2 = new THREE.Mesh(frameGeo, frameColorMat);
    frameBar2.rotation.x = -0.55;
    frameBar2.position.set(0, 0.34, -0.16);
    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), frameColorMat);
    topTube.rotation.x = Math.PI / 2;
    topTube.position.set(0, 0.46, 0);
    bike.add(frameBar1, frameBar2, topTube);

    const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), metalMat);
    seatPost.position.set(0, 0.46, -0.16);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.18), darkMetalMat);
    saddle.position.set(0, 0.58, -0.16);
    bike.add(seatPost, saddle);

    const handleStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8), metalMat);
    handleStem.position.set(0, 0.54, 0.32);
    const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), metalMat);
    hBar.rotation.z = Math.PI / 2;
    hBar.position.set(0, 0.66, 0.32);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.18), metalMat);
    basket.position.set(0, 0.52, 0.44);
    bike.add(handleStem, hBar, basket);

    rack.add(bike);
  });

  const signGeo = new THREE.BoxGeometry(0.55, 0.14, 0.02);
  const signMat = new THREE.MeshStandardMaterial({
    map: createBikeParkingSignTexture(),
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(0, 0.52, 0);
  rack.add(signMesh);

  return rack;
}

export interface ConvenienceStoreOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic, low-poly 3D Japanese Convenience Store (Konbini) matching hwg5_u19_24
 */
export function buildConvenienceStoreMesh(options: ConvenienceStoreOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'ConvenienceStore_hwg5_u19_24';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    map: getHorizontalSidingTexture(),
    roughness: 0.6,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
  });

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.9,
  });

  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
  });

  const whiteLineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
  });

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.95,
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
    const roadLine = new THREE.Mesh(roadLineGeo, whiteLineMat);
    roadLine.position.set(0, 0.012, 3.4);
    group.add(roadLine);
  }

  // 2. MAIN STORE BUILDING
  const storeGroup = new THREE.Group();
  storeGroup.position.set(0, 0.15, -0.6);

  const sW = 5.0;
  const sD = 3.2;
  const sH = 3.5;

  const sBaseGeo = new THREE.BoxGeometry(sW + 0.06, 0.18, sD + 0.06);
  const sBase = new THREE.Mesh(sBaseGeo, foundationMat);
  sBase.position.y = 0.09;
  sBase.receiveShadow = true;
  storeGroup.add(sBase);

  const sBodyGeo = new THREE.BoxGeometry(sW, sH - 0.18, sD);
  const sBody = new THREE.Mesh(sBodyGeo, wallMat);
  sBody.position.y = (sH + 0.18) / 2;
  sBody.castShadow = true;
  sBody.receiveShadow = true;
  storeGroup.add(sBody);

  const parapetGeo = new THREE.BoxGeometry(sW + 0.16, 0.22, sD + 0.16);
  const parapet = new THREE.Mesh(parapetGeo, darkMetalMat);
  parapet.position.y = sH + 0.11;
  storeGroup.add(parapet);

  // 3. ILLUMINATED FASCIA HEADER SIGN (Self-illuminating at dusk/night!)
  const fasciaTexture = createKonbiniFasciaTexture();
  const fasciaMat = new THREE.MeshStandardMaterial({
    map: fasciaTexture,
    emissive: 0xffffff,
    emissiveMap: fasciaTexture,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });

  const fasciaH = 0.58;
  const fasciaD = 0.20;
  const fasciaGeo = new THREE.BoxGeometry(sW + 0.1, fasciaH, fasciaD);
  const fasciaBox = new THREE.Mesh(fasciaGeo, darkMetalMat);
  fasciaBox.position.set(0, sH - 0.05, sD / 2 + fasciaD / 2);
  fasciaBox.castShadow = true;
  storeGroup.add(fasciaBox);

  const signPlaneGeo = new THREE.PlaneGeometry(sW + 0.08, fasciaH - 0.04);
  const signPlane = new THREE.Mesh(signPlaneGeo, fasciaMat);
  signPlane.position.set(0, sH - 0.05, sD / 2 + fasciaD + 0.005);
  storeGroup.add(signPlane);

  // Side-wall wrap-around color bands so the konbini looks authentic from street corners
  const blueBandMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const greenBandMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
  [-sW / 2 - 0.02, sW / 2 + 0.02].forEach((sx) => {
    const topBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, sD), blueBandMat);
    topBand.position.set(sx, sH + 0.12, 0);
    const botBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, sD), greenBandMat);
    botBand.position.set(sx, sH - 0.22, 0);
    storeGroup.add(topBand, botBand);
  });

  // Rooftop safety railing & solar equipment
  const roofRail = buildPerimeterRailing(sW - 0.2, sD - 0.2, 0.42, darkMetalMat, 1.5);
  roofRail.position.set(0, sH + 0.22, 0);
  storeGroup.add(roofRail);

  // Side & Rear service windows, rainwater downspouts, utility meter & AC compressors
  addWrapAroundWindows({
    targetGroup: storeGroup,
    bW: sW,
    bD: sD,
    floorHeights: [1.55],
    winW: 0.9,
    winH: 0.85,
    sideCols: 2,
    backCols: 2,
    glassMat,
    frameMat: darkMetalMat,
  });

  // 4. FLOOR-TO-CEILING GLASS STOREFRONT & AUTOMATIC DOORS
  const shelfTexture = createInteriorShelvesTexture();
  const shelfMat = new THREE.MeshStandardMaterial({
    map: shelfTexture,
    emissive: 0xffffff,
    emissiveMap: shelfTexture,
    emissiveIntensity: 0.55,
    roughness: 0.5,
  });
  const interiorPlaneGeo = new THREE.PlaneGeometry(sW - 0.36, 2.28);
  const interiorPlane = new THREE.Mesh(interiorPlaneGeo, shelfMat);
  interiorPlane.position.set(0, 1.32, sD / 2 + 0.015);
  storeGroup.add(interiorPlane);

  const frontGlassW = sW - 0.2;
  const frontGlassH = 2.45;
  const frontGlassGeo = new THREE.BoxGeometry(frontGlassW, frontGlassH, 0.02);
  const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
  frontGlass.userData.skipWindowEnhance = true;
  frontGlass.position.set(0, frontGlassH / 2 + 0.09, sD / 2 + 0.035);
  storeGroup.add(frontGlass);

  const numPanes = 4;
  const paneWidth = frontGlassW / numPanes;
  for (let i = 0; i <= numPanes; i++) {
    const mullGeo = new THREE.BoxGeometry(0.06, frontGlassH, 0.06);
    const mull = new THREE.Mesh(mullGeo, darkMetalMat);
    mull.position.set(-frontGlassW / 2 + i * paneWidth, frontGlassH / 2 + 0.09, sD / 2 + 0.045);
    storeGroup.add(mull);
  }

  // Sliding automatic entrance door header & side stiles (open center glass so shelves & lobby are visible)
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(paneWidth + 0.06, 0.14, 0.08), darkMetalMat);
  doorHeader.position.set(paneWidth / 2, 2.18, sD / 2 + 0.05);
  const doorGlassPane = new THREE.Mesh(new THREE.BoxGeometry(paneWidth - 0.06, 2.05, 0.02), glassMat);
  doorGlassPane.userData.skipWindowEnhance = true;
  doorGlassPane.position.set(paneWidth / 2, 1.12, sD / 2 + 0.052);
  storeGroup.add(doorHeader, doorGlassPane);

  const sensorGeo = new THREE.BoxGeometry(0.5, 0.06, 0.06);
  const sensor = new THREE.Mesh(sensorGeo, darkMetalMat);
  sensor.position.set(paneWidth / 2, 2.30, sD / 2 + 0.09);
  storeGroup.add(sensor);

  group.add(storeGroup);

  // 5. STOREFRONT APRON DETAILS (Set back on lot at Z <= 1.4m)
  // 5a. Magazine Stand (X = -1.6m, Z = 1.25m)
  const magRackGroup = new THREE.Group();
  magRackGroup.position.set(-1.6, 0.15, 1.25);

  const rackBaseGeo = new THREE.BoxGeometry(0.75, 0.08, 0.35);
  const rackBase = new THREE.Mesh(rackBaseGeo, darkMetalMat);
  rackBase.position.y = 0.04;
  magRackGroup.add(rackBase);

  const magCols = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  for (let t = 0; t < 3; t++) {
    const tierGeo = new THREE.BoxGeometry(0.72, 0.28, 0.06);
    const tier = new THREE.Mesh(tierGeo, darkMetalMat);
    tier.position.set(0, 0.25 + t * 0.28, -0.08 + t * 0.04);
    magRackGroup.add(tier);

    for (let m = 0; m < 4; m++) {
      const magGeo = new THREE.BoxGeometry(0.14, 0.22, 0.02);
      const magMat = new THREE.MeshStandardMaterial({
        color: magCols[(t * 4 + m) % magCols.length],
        roughness: 0.5,
      });
      const mag = new THREE.Mesh(magGeo, magMat);
      mag.position.set(-0.25 + m * 0.17, 0.27 + t * 0.28, -0.05 + t * 0.04);
      magRackGroup.add(mag);
    }
  }
  group.add(magRackGroup);

  // 5b. Storefront Stainless-Steel Recycling Bins beside Magazine Stand (X = -2.25m, Z = 1.22m)
  const binSteelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.35 });
  [-2.35, -2.12].forEach((bx) => {
    const sBin = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.58, 0.26), binSteelMat);
    sBin.position.set(bx, 0.44, 1.22);
    sBin.castShadow = true;
    group.add(sBin);
  });

  // 5c. Bicycle Parking Rack (駐輪場) on right side of apron: X = +1.4m, Z = 1.25m
  const bikeRack = buildBikeRack();
  bikeRack.position.set(1.4, 0.15, 1.25);
  group.add(bikeRack);

  // 5d. Freestanding Illuminated Roadside Pylon Sign (ポール看板) at Left Side of Lot (X = -2.68m, Z = 0.85m, Height = 5.1m)
  const pylonGroup = new THREE.Group();
  pylonGroup.position.set(-2.68, 0.15, 0.85);

  const pylonPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.8, 10), darkMetalMat);
  pylonPole.position.y = 2.4;
  pylonPole.castShadow = true;
  pylonGroup.add(pylonPole);

  const pylonTex = createPylonSignTexture();
  const pylonSignMat = new THREE.MeshStandardMaterial({
    map: pylonTex,
    emissive: 0xffffff,
    emissiveMap: pylonTex,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const pylonBox = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.15, 0.14), [
    darkMetalMat, darkMetalMat, darkMetalMat, darkMetalMat, pylonSignMat, pylonSignMat,
  ]);
  pylonBox.position.set(0.18, 4.35, 0);
  pylonBox.castShadow = true;
  pylonGroup.add(pylonBox);
  group.add(pylonGroup);

  // 5e. Fluttering Promotional Nobori Flags (のぼり旗) on Apron Corners
  [
    { x: -2.65, z: 1.35, color: 0xf97316 },
    { x: 2.55, z: 1.35, color: 0xef4444 },
  ].forEach(({ x, z, color }) => {
    const fPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.75, 6), whiteLineMat);
    fPole.position.set(x, 1.02, z);
    const fBanner = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 1.15, 0.015),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
    );
    fBanner.position.set(x + (x < 0 ? 0.17 : -0.17), 1.28, z);
    group.add(fPole, fBanner);
  });

  // 6. BACKYARD PERIMETER & ROOFTOP AC CHILLERS
  if (includeLandscaping) {
    const wallH = 1.2;
    const backWallGeo = new THREE.BoxGeometry(lotWidth, wallH, 0.08);
    const backWall = new THREE.Mesh(backWallGeo, foundationMat);
    backWall.position.set(0, 0.15 + wallH / 2, -2.85);
    backWall.receiveShadow = true;
    group.add(backWall);

    const acGeo = new THREE.BoxGeometry(0.9, 0.65, 0.55);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const acUnit1 = new THREE.Mesh(acGeo, acMat);
    acUnit1.position.set(-1.2, 0.15 + sH + 0.35, -0.9);
    acUnit1.castShadow = true;
    group.add(acUnit1);

    const acUnit2 = new THREE.Mesh(acGeo, acMat);
    acUnit2.position.set(1.2, 0.15 + sH + 0.35, -0.9);
    acUnit2.castShadow = true;
    group.add(acUnit2);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
