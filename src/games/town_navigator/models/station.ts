import * as THREE from 'three';
import { getConcretePanelTexture, getBrickTileTexture } from './wallTextures';

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

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.5);
  lawn.receiveShadow = true;
  group.add(lawn);

  const plazaGeo = new THREE.BoxGeometry(lotSize, 0.152, 1.5);
  const plaza = new THREE.Mesh(plazaGeo, foundationMat);
  plaza.position.set(0, 0.076, 3.75);
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

  // Enclosed Concourse Back & Side Walls + Glazed Windows
  const concourseBack = new THREE.Mesh(new THREE.BoxGeometry(bW - 0.8, concourseH, 4.4), tileWallMat);
  concourseBack.position.set(0, concourseH / 2, -0.8);
  concourseBack.castShadow = true;
  concourseBack.receiveShadow = true;
  stationGroup.add(concourseBack);

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

  // 4. UPPER PLATFORM, TRACKS & COMMUTER TRAIN (detail1: Height 9.8m)
  // Steel Railway Tracks & Sleepers on Viaduct
  [-1.3, -0.3].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.2, 0.08, 0.08), darkMetalMat);
    rail.position.set(0, concourseH + 0.84, rz);
    stationGroup.add(rail);
  });

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

  // Stainless Steel Electric Commuter Train (Densha Cab on Track)
  const trainGroup = new THREE.Group();
  trainGroup.position.set(0, concourseH + 0.88, -0.8);

  const trainW = bW - 0.6;
  const trainBody = new THREE.Mesh(new THREE.BoxGeometry(trainW, 2.45, 2.25), trainSilverMat);
  trainBody.position.y = 1.225;
  trainBody.castShadow = true;
  trainGroup.add(trainBody);

  // Sky-Blue Commuter Line Stripe + Lime Accent Band
  const tStripe = new THREE.Mesh(new THREE.BoxGeometry(trainW + 0.03, 0.30, 2.27), railBlueMat);
  tStripe.position.y = 1.08;
  trainGroup.add(tStripe);

  // Train Passenger Windows & Double-Leaf Sliding Doors
  for (let tw = 0; tw < 7; tw++) {
    const twx = -trainW / 2 + 0.8 + tw * 1.35;
    const isDoor = tw % 2 === 1;
    const tWin = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, isDoor ? 1.85 : 0.78, 0.04),
      glassMat
    );
    tWin.position.set(twx, isDoor ? 1.05 : 1.48, 1.13);
    trainGroup.add(tWin);
  }

  // Cab Front End Headlights & Windshield (East End of Train)
  const cabFrontWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 1.85), glassMat);
  cabFrontWin.position.set(trainW / 2 + 0.01, 1.55, 0);
  const headLampL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), warmGlowMat);
  headLampL.rotation.z = Math.PI / 2;
  headLampL.position.set(trainW / 2 + 0.02, 0.75, 0.65);
  const headLampR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), warmGlowMat);
  headLampR.rotation.z = Math.PI / 2;
  headLampR.position.set(trainW / 2 + 0.02, 0.75, -0.65);
  trainGroup.add(cabFrontWin, headLampL, headLampR);

  // Rooftop AC Units & Diamond Pantograph
  [-2.6, 2.6].forEach((acx) => {
    const acBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 1.2), chromeMat);
    acBox.position.set(acx, 2.57, 0);
    trainGroup.add(acBox);
  });

  const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), darkMetalMat);
  pantoBase.position.set(0, 2.49, 0);
  const pantoArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), chromeMat);
  pantoArm1.rotation.z = Math.PI / 4;
  pantoArm1.position.set(0.2, 2.82, 0);
  const pantoArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), chromeMat);
  pantoArm2.rotation.z = -Math.PI / 4;
  pantoArm2.position.set(-0.2, 2.82, 0);
  trainGroup.add(pantoBase, pantoArm1, pantoArm2);

  stationGroup.add(trainGroup);
  group.add(stationGroup);

  // 5. JAPANESE STATION FORECOURT (Crown Taxi Stand & Station Kiosk)
  const taxiGroup = new THREE.Group();
  taxiGroup.position.set(3.6, 0.15, 3.7);

  const taxiPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), tactileYellowMat);
  taxiPole.position.set(1.4, 0.9, 0);
  const taxiSign = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), tactileYellowMat);
  taxiSign.rotation.x = Math.PI / 2;
  taxiSign.position.set(1.4, 1.7, 0);
  taxiGroup.add(taxiPole, taxiSign);

  // Black Japanese Crown Taxi Sedan with Glass Windows & Glowing Roof Lantern
  const taxiBlackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.28, metalness: 0.2 });
  const taxiBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 0.92), taxiBlackMat);
  taxiBody.position.set(0, 0.38, 0);
  taxiBody.castShadow = true;

  const taxiCabin = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.44, 0.84), taxiBlackMat);
  taxiCabin.position.set(-0.05, 0.82, 0);
  const taxiGlass = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.34, 0.86), glassMat);
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

  kioskGroup.add(kioskBox, kioskAwning, drinksWin);
  group.add(kioskGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
