import * as THREE from 'three';
import {
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedFireStationSignTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Fire Station main header sign
 */
function createFireStationSignTexture(): THREE.CanvasTexture {
  if (cachedFireStationSignTex) return cachedFireStationSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const bx = 64;
  const cy = 64;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(bx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('119', bx, cy);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px sans-serif';
  ctx.fillText('FIRE STATION', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('消防署 (SHOUBOUSHO)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedFireStationSignTex = texture;
  return texture;
}

/**
 * Builds an authentic procedural Japanese Fire Engine (Shōbōsha / 消防車)
 */
function buildFireEngine(): THREE.Group {
  const truck = new THREE.Group();
  truck.name = 'FireEngine_Shobosha';

  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const shutterSilverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.1, transparent: true, opacity: 0.7 });
  const emergencyLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0000,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 0.8,
  });

  const truckW = 2.0;

  // Chassis & Wheels (6 heavy wheels)
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  [
    [-truckW / 2 - 0.05, 0.38, 1.4],
    [truckW / 2 + 0.05, 0.38, 1.4],
    [-truckW / 2 - 0.05, 0.38, -0.6],
    [truckW / 2 + 0.05, 0.38, -0.6],
    [-truckW / 2 - 0.05, 0.38, -1.5],
    [truckW / 2 + 0.05, 0.38, -1.5],
  ].forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(wheelGeo, darkMetalMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.23, 12), chromeMat);
    rim.rotateZ(Math.PI / 2);
    rim.position.set(wx, wy, wz);
    truck.add(tire, rim);
  });

  // Front Crew Cab
  const cabGeo = new THREE.BoxGeometry(truckW, 1.45, 1.65);
  const cab = new THREE.Mesh(cabGeo, redMat);
  cab.position.set(0, 1.18, 1.2);
  cab.castShadow = true;
  truck.add(cab);

  // Front Windshield & Side Cab Windows
  const win = new THREE.Mesh(new THREE.BoxGeometry(truckW - 0.18, 0.65, 0.04), glassMat);
  win.position.set(0, 1.42, 2.03);
  const sideCabWin = new THREE.Mesh(new THREE.BoxGeometry(truckW + 0.02, 0.55, 1.15), glassMat);
  sideCabWin.position.set(0, 1.42, 1.25);
  truck.add(win, sideCabWin);

  // White Bumper, Chrome Grille, Golden Fire Crest & Headlights
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(truckW + 0.1, 0.30, 0.22), whiteMat);
  bumper.position.set(0, 0.52, 2.05);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.38, 0.04), chromeMat);
  grille.position.set(0, 0.88, 2.03);
  const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), goldMat);
  crest.rotation.x = Math.PI / 2;
  crest.position.set(0, 1.02, 2.04);
  truck.add(bumper, grille, crest);

  [-0.72, 0.72].forEach((hx) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.04), headlightMat);
    lamp.position.set(hx, 0.82, 2.03);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.12), chromeMat);
    mirror.position.set(hx * 1.48, 1.42, 1.92);
    truck.add(lamp, mirror);
  });

  // Rear Equipment Body with Silver Roll-Up Compartment Shutters
  const bodyGeo = new THREE.BoxGeometry(truckW, 1.5, 2.8);
  const body = new THREE.Mesh(bodyGeo, redMat);
  body.position.set(0, 1.25, -0.9);
  body.castShadow = true;
  truck.add(body);

  // Silver Roll-Up Equipment Shutters (2 bays per side)
  [-0.35, -1.45].forEach((sz) => {
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(truckW + 0.04, 0.92, 0.88), shutterSilverMat);
    shutter.position.set(0, 1.32, sz);
    truck.add(shutter);
  });

  // White Reflective Stripe along body
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(truckW + 0.05, 0.12, 4.3), whiteMat);
  stripe.position.set(0, 0.72, 0);
  truck.add(stripe);

  // Dual Hose Reels & Rooftop Water Cannon Monitor
  const hoseReel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16), chromeMat);
  hoseReel.rotateZ(Math.PI / 2);
  hoseReel.position.set(truckW / 2 + 0.06, 1.1, -0.9);
  const monitorTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.28, 12), chromeMat);
  monitorTurret.position.set(0, 2.14, 0.1);
  truck.add(hoseReel, monitorTurret);

  // Rooftop Aluminum Rescue Ladder
  const ladderW = 0.58;
  const ladderL = 3.6;
  const ladderRailL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, ladderL), chromeMat);
  ladderRailL.position.set(-ladderW / 2, 2.12, -0.7);
  const ladderRailR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, ladderL), chromeMat);
  ladderRailR.position.set(ladderW / 2, 2.12, -0.7);
  truck.add(ladderRailL, ladderRailR);

  for (let r = 0; r < 9; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, ladderW, 8), chromeMat);
    rung.rotateZ(Math.PI / 2);
    rung.position.set(0, 2.12, -2.3 + r * 0.4);
    truck.add(rung);
  }

  // Red Emergency Siren Light Bar on Cab Roof
  const lightBarGeo = new THREE.BoxGeometry(1.35, 0.15, 0.24);
  const lightBar = new THREE.Mesh(lightBarGeo, emergencyLightMat);
  lightBar.position.set(0, 1.98, 1.25);
  truck.add(lightBar);

  return truck;
}

export interface FireStationOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Fire Station (hwg5_u19_06)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildFireStationMesh(options: FireStationOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'FireStation_hwg5_u19_06';

  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    map: getBrickTileTexture(),
    roughness: 0.65,
  });
  const redTrimMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 });
  const hazardYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });
  const sirenLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0000,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.5);
  lawn.receiveShadow = true;
  group.add(lawn);

  const apronGeo = new THREE.BoxGeometry(lotSize, 0.152, 1.5);
  const apron = new THREE.Mesh(apronGeo, foundationMat);
  apron.position.set(0, 0.076, 3.75);
  apron.receiveShadow = true;
  group.add(apron);

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

  // 2. MAIN 2-STORY FIRE STATION & GARAGE BAYS
  const stationGroup = new THREE.Group();
  stationGroup.position.set(-1.0, 0.15, -0.6);

  const bW = 8.6;
  const bD = 6.8;
  const bH = 6.8;

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), concreteMat);
  bodyMesh.position.y = bH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  stationGroup.add(bodyMesh);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.14, 0.35, bD + 0.14), redTrimMat);
  parapet.position.y = bH + 0.175;
  stationGroup.add(parapet);

  // Open Rooftop Safety Railing
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.65, steelMat, 1.6);
  roofRail.position.set(0, bH + 0.35, 0);
  stationGroup.add(roofRail);

  // 360° Side & Rear Windows
  addWrapAroundWindows({
    targetGroup: stationGroup,
    bW,
    bD,
    floorHeights: [1.8, 5.1],
    winW: 1.05,
    winH: 1.2,
    sideCols: 3,
    backCols: 4,
    glassMat,
    frameMat: darkMetalMat,
  });

  // 2 Garage Bay Openings on Ground Floor
  [-2.2, 1.8].forEach(gx => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.6, 0.15), redTrimMat);
    frame.position.set(gx, 1.8, bD / 2 + 0.05);
    stationGroup.add(frame);

    const hazard = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.18, 0.18), hazardYellowMat);
    hazard.position.set(gx, 3.55, bD / 2 + 0.06);
    stationGroup.add(hazard);

    const cavity = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 0.1), darkMetalMat);
    cavity.position.set(gx, 1.7, bD / 2 + 0.02);
    stationGroup.add(cavity);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), sirenLightMat);
    beacon.position.set(gx, 3.9, bD / 2 + 0.12);
    stationGroup.add(beacon);
  });

  // Second Floor Administration Glass Windows (Now translucent glassMat so they glow at night!)
  for (let w = 0; w < 5; w++) {
    const wx = -3.2 + w * 1.6;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.28, 0.06), darkMetalMat);
    frame.position.set(wx, 5.1, bD / 2 + 0.02);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.18, 0.04), glassMat);
    win.position.set(wx, 5.1, bD / 2 + 0.04);
    stationGroup.add(frame, win);
  }

  // Prominent "FIRE STATION" Header Signboard
  const signTexture = createFireStationSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.85, 0.15), [
    redTrimMat, redTrimMat, redTrimMat, redTrimMat, signMat, redTrimMat
  ]);
  signMesh.position.set(-0.2, 6.2, bD / 2 + 0.15);
  signMesh.castShadow = true;
  stationGroup.add(signMesh);

  group.add(stationGroup);

  // 3. EMERGENCY VEHICLES & HYDRANT ON APRON
  // 3a. Fire Engine in Bay 1 (detail1 at X = -3.2m, Z = 2.2m)
  const fireEngine = buildFireEngine();
  fireEngine.position.set(-3.2, 0.15, 2.2);
  group.add(fireEngine);

  // 3b. Red Fire Chief Command SUV (Shiki-sha) in Bay 2
  const chiefCar = new THREE.Group();
  chiefCar.position.set(0.8, 0.15, 2.4);

  const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.65, 2.4), redTrimMat);
  carBody.position.y = 0.52;
  carBody.castShadow = true;

  const carCabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.52, 1.45),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  );
  carCabin.position.set(0, 1.05, -0.1);

  const carGlass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.42, 1.35), glassMat);
  carGlass.position.set(0, 1.05, -0.1);

  const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.22), sirenLightMat);
  lightBar.position.set(0, 1.38, 0.1);

  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  [
    [-0.82, 0.28, -0.72],
    [0.82, 0.28, -0.72],
    [-0.82, 0.28, 0.72],
    [0.82, 0.28, 0.72],
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, darkMetalMat);
    wheel.position.set(wx, wy, wz);
    chiefCar.add(wheel);
  });

  chiefCar.add(carBody, carCabin, carGlass, lightBar);
  group.add(chiefCar);

  // 3c. Japanese Red Fire Hydrant & Yellow Sign Pole on Apron (X = 2.6m, Z = 3.85m)
  const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.68, 10), redTrimMat);
  hydrant.position.set(2.6, 0.49, 3.85);
  const hydrantCap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), redTrimMat);
  hydrantCap.position.set(2.6, 0.84, 3.85);
  group.add(hydrant, hydrantCap);

  // 4. TRAINING & HOSE DRYING TOWER (detail2: Height 11.4m <= 12m limit at X = 4.2m)
  const towerGroup = new THREE.Group();
  towerGroup.position.set(4.2, 0.15, -0.6);

  const tW = 2.4;
  const tD = 2.4;
  const tH = 10.6;

  const tower = new THREE.Mesh(new THREE.BoxGeometry(tW, tH, tD), concreteMat);
  tower.position.y = tH / 2;
  tower.castShadow = true;
  towerGroup.add(tower);

  const crown = new THREE.Mesh(new THREE.BoxGeometry(tW + 0.24, 0.40, tD + 0.24), redTrimMat);
  crown.position.y = tH + 0.20;
  towerGroup.add(crown);

  const towerRail = buildPerimeterRailing(tW, tD, 0.55, steelMat, 1.2);
  towerRail.position.set(0, tH + 0.40, 0);
  towerGroup.add(towerRail);

  // Vertical Hose-Drying Recess & Hanging White Canvas Fire Hoses (ホース乾燥塔)
  const hoseRecess = new THREE.Mesh(new THREE.BoxGeometry(1.1, 7.6, 0.12), darkMetalMat);
  hoseRecess.position.set(0, 5.2, tD / 2 + 0.02);
  towerGroup.add(hoseRecess);

  [-0.32, 0.0, 0.32].forEach((hx) => {
    const hose = new THREE.Mesh(new THREE.BoxGeometry(0.14, 7.2, 0.04), whiteLineMat);
    hose.position.set(hx, 5.2, tD / 2 + 0.07);
    towerGroup.add(hose);
  });

  // External Steel Training Ladder on Left Side of Tower
  for (let ly = 1.2; ly <= 9.8; ly += 0.45) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.45), steelMat);
    rung.position.set(-tW / 2 - 0.08, ly, 0.5);
    towerGroup.add(rung);
  }

  // 4-Directional Emergency Siren Horn Array on Tower Peak
  const sirenPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), steelMat);
  sirenPost.position.set(0, tH + 0.8, 0);
  towerGroup.add(sirenPost);

  [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(angle => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.30, 12), steelMat);
    horn.rotation.z = Math.PI / 2;
    horn.rotation.y = angle;
    horn.position.set(Math.cos(angle) * 0.24, tH + 1.1, Math.sin(angle) * 0.24);
    towerGroup.add(horn);
  });

  group.add(towerGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
