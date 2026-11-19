import * as THREE from 'three';
import { getConcretePanelTexture, getBrickTileTexture, getClearShowcaseGlassMaterial, addWrapAroundWindows } from './wallTextures';

let cachedStationSignTex: THREE.CanvasTexture | null = null;
let cachedDepartureBoardTex: THREE.CanvasTexture | null = null;
let cachedPlatformSignTex: THREE.CanvasTexture | null = null;
let cachedTicketMachineTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Station Nameboard
 */
function createStationSignTexture(): THREE.CanvasTexture {
  if (cachedStationSignTex) return cachedStationSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cx - 24, cy - 28, 48, 56, 8);
  ctx.fill();
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(cx - 20, cy - 20, 40, 18);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx - 12, cy + 14, 4, 0, Math.PI * 2);
  ctx.arc(cx + 12, cy + 14, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('TRAIN STATION', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('緑町駅 (MIDORI-MACHI STA.)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedStationSignTex = texture;
  return texture;
}

/**
 * Procedural texture for JR-Style Platform Hanging Station Name Sign (駅名標)
 */
function createPlatformSignTexture(): THREE.CanvasTexture {
  if (cachedPlatformSignTex) return cachedPlatformSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 82, 512, 26);

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = '900 38px "BIZ UDPGothic", sans-serif';
  ctx.fillText('みどりまち', 256, 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('◀ SAKURA      MIDORI-MACHI      AOBA ▶', 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedPlatformSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Ticket Vending Machine Wall (きっぷうりば)
 */
function createTicketMachineTexture(): THREE.CanvasTexture {
  if (cachedTicketMachineTex) return cachedTicketMachineTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(8, 8, 240, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TICKETS • きっぷ・IC', 128, 33);

  // 2 Touch-Screen Ticket Machines
  [24, 136].forEach((mx, idx) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(mx, 56, 96, 184);
    ctx.fillStyle = idx === 0 ? '#0284c7' : '#ec4899';
    ctx.fillRect(mx + 8, 66, 80, 18);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(mx + 12, 92, 72, 54);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(mx + 12, 158, 72, 28);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedTicketMachineTex = texture;
  return texture;
}

/**
 * Procedural texture for Station Departure Board
 */
function createDepartureBoardTexture(): THREE.CanvasTexture {
  if (cachedDepartureBoardTex) return cachedDepartureBoardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('DEPARTURES / 発車標', 12, 24);

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('10:15 LOCAL   TRACK 1', 12, 58);
  ctx.fillText('10:28 RAPID   TRACK 2', 12, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedDepartureBoardTex = texture;
  return texture;
}

export interface StationOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Train Station (hwg5_u19_03)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildStationMesh(options: StationOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Station_hwg5_u19_03';

  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.7,
  });
  const tileWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    map: getBrickTileTexture(),
    roughness: 0.6,
  });
  const railBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const tactileYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
  const gateGreenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.7 });
  const gateFlapRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const trainSilverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3 });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.68,
  });
  const clearGlassMat = getClearShowcaseGlassMaterial();
  const ballastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.95 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 });
  const lockerBlueMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.45, metalness: 0.25 });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.5);
  lawn.receiveShadow = true;
  group.add(lawn);

  // Extended Ekimae Plaza (Z in [+2.4, +4.5])
  const plazaGeo = new THREE.BoxGeometry(lotSize, 0.152, 2.1);
  const plaza = new THREE.Mesh(plazaGeo, foundationMat);
  plaza.position.set(0, 0.076, 3.45);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Sidewalk slab: COMPLETELY UNOBSTRUCTED (Z in [+4.5, +6.0])
  const sidewalkGeo = new THREE.BoxGeometry(lotSize, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, foundationMat);
  sidewalk.position.set(0, 0.075, 5.25);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(lotSize, 0.18, 0.12);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.09, 6.0);
  curb.receiveShadow = true;
  group.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(lotSize, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 6.9);
    road.receiveShadow = true;
    group.add(road);

    const roadLineGeo = new THREE.BoxGeometry(lotSize, 0.022, 0.12);
    const roadLine = new THREE.Mesh(roadLineGeo, whiteLineMat);
    roadLine.position.set(0, 0.012, 6.4);
    group.add(roadLine);
  }

  // 2. GROUND CONCOURSE & ELEVATED TRACK VIADUCT
  const stationGroup = new THREE.Group();
  stationGroup.position.set(0, 0.15, -0.6);

  const bW = 10.4;
  const bD = 6.6;
  const concourseH = 4.8;

  // Enclosed Concourse Back & Side Walls + Wrap-Around Glazed Windows
  const concourseGroup = new THREE.Group();
  concourseGroup.position.set(0, 0, -0.8);
  const concourseBack = new THREE.Mesh(new THREE.BoxGeometry(bW - 0.8, concourseH, 4.4), tileWallMat);
  concourseBack.position.set(0, concourseH / 2, 0);
  concourseBack.castShadow = true;
  concourseBack.receiveShadow = true;
  concourseGroup.add(concourseBack);

  addWrapAroundWindows({
    targetGroup: concourseGroup,
    bW: bW - 0.8,
    bD: 4.4,
    floorHeights: [1.65, 3.55],
    winW: 1.05,
    winH: 1.1,
    sideCols: 2,
    backCols: 4,
    glassMat,
    frameMat: darkMetalMat,
  });
  stationGroup.add(concourseGroup);

  // Heavy Concrete Pier Viaduct Pillars supporting Elevated Track
  [-4.4, 0, 4.4].forEach(px => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.3, concourseH, bD), concreteMat);
    pier.position.set(px, concourseH / 2, 0);
    pier.castShadow = true;
    stationGroup.add(pier);
  });

  // Elevated Track Concrete Deck Slab & Front Safety Parapet
  const deckGeo = new THREE.BoxGeometry(bW + 0.4, 0.8, bD + 0.2);
  const deck = new THREE.Mesh(deckGeo, concreteMat);
  deck.position.set(0, concourseH + 0.4, 0);
  deck.castShadow = true;
  stationGroup.add(deck);

  const platformSafetyLine = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.02, 0.22), tactileYellowMat);
  platformSafetyLine.position.set(0, concourseH + 0.81, 1.45);
  stationGroup.add(platformSafetyLine);

  // Concourse Ceiling Strip Lights under Viaduct Deck
  [-2.2, 2.2].forEach((lx) => {
    const stripLight = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.18), warmGlowMat);
    stripLight.position.set(lx, concourseH - 0.03, 2.35);
    stationGroup.add(stripLight);
  });

  // 3. GROUND-LEVEL TICKET CONCOURSE & IC GATES (detail2: Kaisatsuguchi at Z = 2.0m)
  // Flush Yellow Tactile Paving Strip leading from sidewalk to ticket gates
  const concourseTactile = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.01, 2.2), tactileYellowMat);
  concourseTactile.position.set(0, 0.01, bD / 2 + 0.4);
  stationGroup.add(concourseTactile);

  // Illuminated Ticket Vending Machine Kiosk Wall on Left
  const ticketMat = new THREE.MeshStandardMaterial({
    map: createTicketMachineTexture(),
    emissive: 0xffffff,
    emissiveMap: createTicketMachineTexture(),
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
  const ticketKiosk = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.1, 0.45), [
    darkMetalMat, darkMetalMat, darkMetalMat, darkMetalMat, ticketMat, darkMetalMat,
  ]);
  ticketKiosk.position.set(-2.5, 1.05, bD / 2 - 0.35);
  stationGroup.add(ticketKiosk);

  // Glass Station-Master Booth (駅員室) on Right of Gates
  const boothBase = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.9, 1.25), concreteMat);
  boothBase.position.set(2.55, 0.45, bD / 2 - 0.45);
  const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.25, 1.18), clearGlassMat);
  boothGlass.position.set(2.55, 1.52, bD / 2 - 0.45);
  const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 1.35), railBlueMat);
  boothRoof.position.set(2.55, 2.2, bD / 2 - 0.45);
  const boothDesk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.45), warmGlowMat);
  boothDesk.position.set(2.55, 1.02, bD / 2 - 0.45);
  stationGroup.add(boothBase, boothGlass, boothRoof, boothDesk);

  // 4 Electronic IC Card Automatic Ticket Gates (自動改札機)
  [-1.2, -0.4, 0.4, 1.2].forEach(gx => {
    const gateStanchion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.92, 1.45), chromeMat);
    gateStanchion.position.set(gx, 0.46, bD / 2 - 0.35);
    const topScanner = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 1.40), darkMetalMat);
    topScanner.position.set(gx, 0.93, bD / 2 - 0.35);
    const ledPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.24), gateGreenMat);
    ledPad.position.set(gx, 0.95, bD / 2 + 0.15);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.03), gateFlapRedMat);
    flap.position.set(gx + 0.22, 0.46, bD / 2 + 0.05);
    stationGroup.add(gateStanchion, topScanner, ledPad, flap);
  });

  // Digital Train Departure Screen above Concourse
  const depTexture = createDepartureBoardTexture();
  const depMat = new THREE.MeshStandardMaterial({
    map: depTexture,
    emissive: 0xffffff,
    emissiveMap: depTexture,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const depMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.78, 0.1), [
    darkMetalMat, darkMetalMat, darkMetalMat, darkMetalMat, depMat, darkMetalMat,
  ]);
  depMesh.position.set(0, 3.45, bD / 2 + 0.05);
  stationGroup.add(depMesh);

  // Prominent "TRAIN STATION" Signboard on Concourse Fascia
  const signTexture = createStationSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.4,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.88, 0.14), [
    railBlueMat, railBlueMat, railBlueMat, railBlueMat, signMat, railBlueMat
  ]);
  signMesh.position.set(0, 4.4, bD / 2 + 0.12);
  stationGroup.add(signMesh);

  // Station Entrance Round Clock on Left Fascia
  const stClockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 20), darkMetalMat);
  stClockRim.rotation.x = Math.PI / 2;
  stClockRim.position.set(-3.45, 4.4, bD / 2 + 0.10);
  const stClockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.11, 20), whiteLineMat);
  stClockFace.rotation.x = Math.PI / 2;
  stClockFace.position.set(-3.45, 4.4, bD / 2 + 0.11);
  const stHandH = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), darkMetalMat);
  stHandH.position.set(-3.45, 4.47, bD / 2 + 0.17);
  const stHandM = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.025, 0.03), darkMetalMat);
  stHandM.position.set(-3.38, 4.4, bD / 2 + 0.17);
  stationGroup.add(stClockRim, stClockFace, stHandH, stHandM);

  // 4. UPPER PLATFORM, TRACKS & COMMUTER TRAIN (detail1: Height 9.8m)
  // Ballast Bed, Concrete Sleepers & Steel Railway Tracks on Viaduct
  const ballast = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.2, 0.05, 1.85), ballastMat);
  ballast.position.set(0, concourseH + 0.82, -0.8);
  stationGroup.add(ballast);

  for (let s = 0; s < 15; s++) {
    const sx = -bW / 2 + 0.35 + s * 0.69;
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 1.55), sleeperMat);
    sleeper.position.set(sx, concourseH + 0.84, -0.8);
    stationGroup.add(sleeper);
  }

  [-1.3, -0.3].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.2, 0.08, 0.08), darkMetalMat);
    rail.position.set(0, concourseH + 0.88, rz);
    stationGroup.add(rail);
  });

  // Japanese Platform Safety Screen Doors (ホームドア) along South Edge
  for (let d = 0; d < 6; d++) {
    const dx = -4.0 + d * 1.6;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), chromeMat);
    post.position.set(dx, concourseH + 1.32, 1.25);
    const screenGlass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.92, 0.04), clearGlassMat);
    screenGlass.position.set(dx + 0.76, concourseH + 1.28, 1.25);
    const screenBand = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.12, 0.05), railBlueMat);
    screenBand.position.set(dx + 0.76, concourseH + 1.15, 1.25);
    stationGroup.add(post, screenGlass, screenBand);
  }

  // Platform Waiting Canopy Roof & Hanging JR Station Nameboard
  const canopyGeo = new THREE.BoxGeometry(bW, 0.18, 3.2);
  const canopy = new THREE.Mesh(canopyGeo, railBlueMat);
  canopy.position.set(0, concourseH + 4.2, 0.8);
  canopy.castShadow = true;
  stationGroup.add(canopy);

  const platSignMat = new THREE.MeshStandardMaterial({
    map: createPlatformSignTexture(),
    emissive: 0xffffff,
    emissiveMap: createPlatformSignTexture(),
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const platSign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.58, 0.08), [
    darkMetalMat, darkMetalMat, darkMetalMat, darkMetalMat, platSignMat, platSignMat,
  ]);
  platSign.position.set(0, concourseH + 3.45, 1.85);
  stationGroup.add(platSign);

  [-3.8, 0, 3.8].forEach(tx => {
    const truss = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 8), darkMetalMat);
    truss.position.set(tx, concourseH + 2.5, 0.8);
    stationGroup.add(truss);
  });

  // Steel H-Beam Catenary Gantries & Overhead Contact Wire (meeting Pantograph)
  [-4.2, 4.2].forEach((gx) => {
    const mastN = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.55, 0.14), darkMetalMat);
    mastN.position.set(gx, concourseH + 2.55, -2.05);
    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.65), darkMetalMat);
    crossArm.position.set(gx, concourseH + 4.2, -1.28);
    stationGroup.add(mastN, crossArm);
  });
  const catenaryWire = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, bW, 6), darkMetalMat);
  catenaryWire.rotation.z = Math.PI / 2;
  catenaryWire.position.set(0, concourseH + 4.02, -0.8);
  stationGroup.add(catenaryWire);

  // Stainless Steel Electric Commuter Train (Densha Cab on Track)
  const trainGroup = new THREE.Group();
  trainGroup.position.set(0, concourseH + 0.92, -0.8);

  const trainW = bW - 0.6;
  const trainBody = new THREE.Mesh(new THREE.BoxGeometry(trainW, 2.38, 2.25), trainSilverMat);
  trainBody.position.y = 1.38;
  trainBody.castShadow = true;
  trainGroup.add(trainBody);

  // Underfloor Wheel Bogies
  [-3.2, -2.2, 2.2, 3.2].forEach((bx) => {
    const bogieFrame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 1.4), darkMetalMat);
    bogieFrame.position.set(bx, 0.14, 0);
    trainGroup.add(bogieFrame);
    [-0.5, 0.5].forEach((wz) => {
      const tWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10), chromeMat);
      tWheel.rotation.x = Math.PI / 2;
      tWheel.position.set(bx, 0.12, wz);
      trainGroup.add(tWheel);
    });
  });

  // Sky-Blue Commuter Line Stripe
  const tStripe = new THREE.Mesh(new THREE.BoxGeometry(trainW + 0.03, 0.30, 2.27), railBlueMat);
  tStripe.position.y = 1.24;
  trainGroup.add(tStripe);

  // Train Passenger Windows & Double-Leaf Sliding Doors (Clear Glass)
  for (let tw = 0; tw < 7; tw++) {
    const twx = -trainW / 2 + 0.8 + tw * 1.35;
    const isDoor = tw % 2 === 1;
    const tWin = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, isDoor ? 1.82 : 0.78, 0.04),
      clearGlassMat
    );
    tWin.position.set(twx, isDoor ? 1.22 : 1.64, 1.13);
    trainGroup.add(tWin);
  }

  // Cab Front End Headlights & Windshield (East End of Train)
  const cabFrontWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 1.85), clearGlassMat);
  cabFrontWin.position.set(trainW / 2 + 0.01, 1.71, 0);
  const headLampL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), warmGlowMat);
  headLampL.rotation.z = Math.PI / 2;
  headLampL.position.set(trainW / 2 + 0.02, 0.91, 0.65);
  const headLampR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), warmGlowMat);
  headLampR.rotation.z = Math.PI / 2;
  headLampR.position.set(trainW / 2 + 0.02, 0.91, -0.65);
  trainGroup.add(cabFrontWin, headLampL, headLampR);

  // Rooftop AC Units & Diamond Pantograph (contacting catenary wire at y = 3.10)
  [-2.6, 2.6].forEach((acx) => {
    const acBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 1.2), chromeMat);
    acBox.position.set(acx, 2.69, 0);
    trainGroup.add(acBox);
  });

  const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), darkMetalMat);
  pantoBase.position.set(0, 2.61, 0);
  const pantoArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6), chromeMat);
  pantoArm1.rotation.z = Math.PI / 4;
  pantoArm1.position.set(0.2, 2.86, 0);
  const pantoArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6), chromeMat);
  pantoArm2.rotation.z = -Math.PI / 4;
  pantoArm2.position.set(-0.2, 2.86, 0);
  const pantoShoe = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.65), chromeMat);
  pantoShoe.position.set(0, 3.09, 0);
  trainGroup.add(pantoBase, pantoArm1, pantoArm2, pantoShoe);

  stationGroup.add(trainGroup);
  group.add(stationGroup);

  // 5. JAPANESE STATION FORECOURT (Crown Taxi Stand, Bench, Coin Lockers & Station Kiosk)
  const taxiGroup = new THREE.Group();
  taxiGroup.position.set(3.6, 0.15, 3.7);

  const taxiPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), tactileYellowMat);
  taxiPole.position.set(1.4, 0.9, 0);
  const taxiSign = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), tactileYellowMat);
  taxiSign.rotation.x = Math.PI / 2;
  taxiSign.position.set(1.4, 1.7, 0);
  const taxiSignInner = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), railBlueMat);
  taxiSignInner.rotation.x = Math.PI / 2;
  taxiSignInner.position.set(1.4, 1.7, 0);
  taxiGroup.add(taxiPole, taxiSign, taxiSignInner);

  // Black Japanese Crown Taxi Sedan with Clear Glass Windows & Glowing Roof Lantern
  const taxiBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.28, metalness: 0.2 });
  const taxiBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 0.92), taxiBlackMat);
  taxiBody.position.set(0, 0.38, 0);
  taxiBody.castShadow = true;

  const taxiCabin = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.44, 0.84), taxiBlackMat);
  taxiCabin.position.set(-0.05, 0.82, 0);
  const taxiGlass = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.34, 0.86), clearGlassMat);
  taxiGlass.position.set(-0.05, 0.82, 0);
  const taxiLantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.16), warmGlowMat);
  taxiLantern.position.set(-0.05, 1.11, 0);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  [
    [-0.52, 0.18, -0.46],
    [+0.52, 0.18, -0.46],
    [-0.52, 0.18, +0.46],
    [+0.52, 0.18, +0.46],
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 12), wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    taxiGroup.add(wheel);
  });

  taxiGroup.add(taxiBody, taxiCabin, taxiGlass, taxiLantern);
  group.add(taxiGroup);

  // Ekimae Plaza Bench & Blue Coin Lockers
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.42), woodMat);
  benchSeat.position.set(1.85, 0.56, 3.85);
  [-0.52, 0.52].forEach((bx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.38), darkMetalMat);
    leg.position.set(1.85 + bx, 0.36, 3.85);
    group.add(leg);
  });
  group.add(benchSeat);

  const coinLockers = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.45, 0.45), lockerBlueMat);
  coinLockers.position.set(-4.35, 0.875, 2.25);
  group.add(coinLockers);

  // Station Kiosk Stall (NewDays style: X = -3.9m, Z = 3.6m)
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(-3.9, 0.15, 3.6);

  const kioskBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.65, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 })
  );
  kioskBox.position.set(0, 0.825, 0);
  kioskBox.castShadow = true;

  const kioskAwning = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 1.15), tactileYellowMat);
  kioskAwning.position.set(0, 1.70, 0.08);
  const drinksWin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 0.05), warmGlowMat);
  drinksWin.position.set(0, 1.0, 0.46);
  const kioskCounter = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.25), chromeMat);
  kioskCounter.position.set(0, 0.62, 0.52);

  kioskGroup.add(kioskBox, kioskAwning, drinksWin, kioskCounter);
  group.add(kioskGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
