import * as THREE from 'three';
import {
  getConcretePanelTexture,
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedPoliceStationSignTex: THREE.CanvasTexture | null = null;
let cachedPatrolCarDoorTex: THREE.CanvasTexture | null = null;
let cachedKobanSignTex: THREE.CanvasTexture | null = null;
let cachedBulletinBoardTex: THREE.CanvasTexture | null = null;

// ============================================================================
// PART 1: TIER 2 (12m × 12m) MUNICIPAL POLICE STATION (警察署 - hwg5_u19_07)
// ============================================================================

/**
 * Procedural texture for Tier 2 Police Station main header sign ("POLICE STATION / 警察署")
 */
function createPoliceStationSignTexture(): THREE.CanvasTexture {
  if (cachedPoliceStationSignTex) return cachedPoliceStationSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 112);

  // Golden Asahi-shō (旭日章) Police Sunburst Insignia on left
  const cx = 64;
  const cy = 64;
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 14, cy + Math.sin(angle) * 14);
    ctx.lineTo(cx + Math.cos(angle) * 38, cy + Math.sin(angle) * 38);
    ctx.stroke();
  }
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('POLICE STATION', 122, 46);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('警察署 (KEISATSUSHO)', 124, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedPoliceStationSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Japanese Patrol Car (パトカー) side door markings
 */
function createPatrolCarSideTexture(): THREE.CanvasTexture {
  if (cachedPatrolCarDoorTex) return cachedPatrolCarDoorTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Classic Japanese two-tone: Upper white, lower black
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 62);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 62, 256, 66);

  // Gold & Blue POLICE stripe
  ctx.fillStyle = '#eab308';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICE', 128, 92);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "BIZ UDPGothic", sans-serif';
  ctx.fillText('警 視 庁', 128, 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedPatrolCarDoorTex = texture;
  return texture;
}

/**
 * Builds an authentic Japanese Black-and-White Police Patrol Car (パトカー / Toyota Crown Patokā)
 */
function buildJapanesePatrolCar(): THREE.Group {
  const car = new THREE.Group();
  car.name = 'PolicePatrolCar_Patoka';

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.2 });
  const sideDoorMat = new THREE.MeshStandardMaterial({
    map: createPatrolCarSideTexture(),
    roughness: 0.35,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.25 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    transparent: true,
    opacity: 0.7,
  });
  const sirenRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0000,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 0.7,
  });

  const carW = 1.78;
  const carL = 4.1;

  // 4 Wheels + Chrome Hubs
  const wheelGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.20, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.21, 12);
  hubGeo.rotateZ(Math.PI / 2);
  [
    [-carW / 2 - 0.02, 0.30, 1.22],
    [carW / 2 + 0.02, 0.30, 1.22],
    [-carW / 2 - 0.02, 0.30, -1.22],
    [carW / 2 + 0.02, 0.30, -1.22],
  ].forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.position.set(wx, wy, wz);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.position.set(wx, wy, wz);
    car.add(tire, hub);
  });

  // Lower Chassis Body (Two-Tone Side Doors, Black Bumpers, White Hood/Trunk)
  const lowerBodyGeo = new THREE.BoxGeometry(carW, 0.62, carL);
  const lowerBody = new THREE.Mesh(lowerBodyGeo, [
    sideDoorMat, // +X
    sideDoorMat, // -X
    whiteMat,    // +Y (Hood/Trunk top)
    blackMat,    // -Y
    blackMat,    // +Z (Front bumper)
    blackMat,    // -Z (Rear bumper)
  ]);
  lowerBody.position.set(0, 0.56, 0);
  lowerBody.castShadow = true;
  car.add(lowerBody);

  // White Upper Greenhouse Cabin
  const cabinGeo = new THREE.BoxGeometry(carW - 0.18, 0.52, 2.15);
  const cabin = new THREE.Mesh(cabinGeo, whiteMat);
  cabin.position.set(0, 1.12, -0.15);
  cabin.castShadow = true;
  car.add(cabin);

  // Front & Rear Windshields + Side Windows
  const frontWin = new THREE.Mesh(new THREE.BoxGeometry(carW - 0.28, 0.44, 0.05), glassMat);
  frontWin.position.set(0, 1.10, 0.94);
  frontWin.rotation.x = -0.25;
  const rearWin = new THREE.Mesh(new THREE.BoxGeometry(carW - 0.28, 0.42, 0.05), glassMat);
  rearWin.position.set(0, 1.10, -1.24);
  rearWin.rotation.x = 0.25;
  const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(carW - 0.14, 0.38, 1.75), glassMat);
  sideWindows.position.set(0, 1.12, -0.15);
  car.add(frontWin, rearWin, sideWindows);

  // Front Chrome Grille, Golden Police Crest (旭日章) & Headlights
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.05), chromeMat);
  grille.position.set(0, 0.58, carL / 2 + 0.02);
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), goldMat);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0, 0.62, carL / 2 + 0.04);
  car.add(grille, badge);

  [-0.62, 0.62].forEach((hx) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.05), headlightMat);
    lamp.position.set(hx, 0.62, carL / 2 + 0.02);
    car.add(lamp);
  });

  // Iconic Elevated White Riser Box + Red Boomerang Roof Lightbar (昇降式パトライト)
  const riserBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.65), whiteMat);
  riserBox.position.set(0, 1.44, -0.1);
  const lightBarL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.20), sirenRedMat);
  lightBarL.position.set(-0.26, 1.56, -0.05);
  lightBarL.rotation.y = 0.22;
  const lightBarR = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.20), sirenRedMat);
  lightBarR.position.set(0.26, 1.56, -0.05);
  lightBarR.rotation.y = -0.22;
  car.add(riserBox, lightBarL, lightBarR);

  return car;
}

/**
 * Builds an authentic White Japanese Police Motorcycle (白バイ / Shirobai)
 */
function buildPoliceMotorcycle(): THREE.Group {
  const bike = new THREE.Group();
  bike.name = 'PoliceMotorcycle_Shirobai';

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.65 });
  const sirenRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0000,
    emissiveIntensity: 0.9,
  });

  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wFront = new THREE.Mesh(wheelGeo, darkMat);
  wFront.position.set(0, 0.28, 0.68);
  const wRear = new THREE.Mesh(wheelGeo, darkMat);
  wRear.position.set(0, 0.28, -0.68);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 1.15), whiteMat);
  body.position.set(0, 0.55, 0);
  body.castShadow = true;

  const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.55, 0.35), whiteMat);
  fairing.position.set(0, 0.75, 0.48);
  fairing.rotation.x = 0.25;

  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.03), glassMat);
  screen.position.set(0, 1.12, 0.42);
  screen.rotation.x = -0.35;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.45), darkMat);
  seat.position.set(0, 0.78, -0.15);

  // Side Pannier Boxes & Rear Strobe Pole
  [-0.26, 0.26].forEach((px) => {
    const pannier = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.48), whiteMat);
    pannier.position.set(px, 0.58, -0.55);
    const frontBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), sirenRedMat);
    frontBeacon.position.set(px, 0.88, 0.65);
    bike.add(pannier, frontBeacon);
  });

  const rearPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), chromeMat);
  rearPole.position.set(0.22, 1.05, -0.72);
  const rearStrobe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.10, 8), sirenRedMat);
  rearStrobe.position.set(0.22, 1.40, -0.72);

  bike.add(wFront, wRear, body, fairing, screen, seat, rearPole, rearStrobe);
  return bike;
}

export interface PoliceStationOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds the 12.0m × 12.0m (2U × 2U) Tier 2 Municipal Police Station (警察署 - hwg5_u19_07).
 */
export function buildPoliceStationMesh(options: PoliceStationOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'PoliceStation_hwg5_u19_07';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.65,
  });
  const navyTrimMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    map: getBrickTileTexture(),
    roughness: 0.5,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.25 });
  const redBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });

  const lotSize = 12.0;

  // 1. PROPERTY BASE (12.0m × 12.0m Lot)
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

  // 2. MAIN 3-STORY POLICE HEADQUARTERS BUILDING (9.8m wide × 6.6m deep × 8.5m tall)
  const hqGroup = new THREE.Group();
  hqGroup.position.set(0, 0.15, -0.8);

  const bW = 9.8;
  const bD = 6.6;
  const bH = 8.4;

  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.16, 0.35, bD + 0.16), navyTrimMat);
  basePlinth.position.y = 0.175;
  hqGroup.add(basePlinth);

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), wallMat);
  bodyMesh.position.y = bH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  hqGroup.add(bodyMesh);

  // Navy Horizontal Floor Bands & Crown Parapet
  [2.8, 5.6, bH + 0.18].forEach((by, idx) => {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(bW + 0.14, idx === 2 ? 0.36 : 0.18, bD + 0.14),
      navyTrimMat
    );
    band.position.y = by;
    hqGroup.add(band);
  });

  // Open Rooftop Safety Railing
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.75, steelMat, 1.6);
  roofRail.position.set(0, bH + 0.36, 0);
  hqGroup.add(roofRail);

  // 360° Side & Rear Windows
  addWrapAroundWindows({
    targetGroup: hqGroup,
    bW,
    bD,
    floorHeights: [1.5, 4.2, 7.0],
    winW: 1.05,
    winH: 1.25,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: darkMetalMat,
  });

  // Front Upper Windows (2F & 3F)
  [4.2, 7.0].forEach((wy) => {
    [-3.6, -1.8, 0.0, 1.8, 3.6].forEach((wx) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.35, 0.07), darkMetalMat);
      frame.position.set(wx, wy, bD / 2 + 0.02);
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.25, 0.05), glassMat);
      win.position.set(wx, wy, bD / 2 + 0.04);
      hqGroup.add(frame, win);
    });
  });

  // Giant Golden Asahi-shō (旭日章) Police Sunburst Crest on Upper Facade
  const crestDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 24), goldMat);
  crestDisc.rotateX(Math.PI / 2);
  crestDisc.position.set(0, 7.6, bD / 2 + 0.12);
  hqGroup.add(crestDisc);

  // Prominent "POLICE STATION / 警察署" Header Signboard
  const signTex = createPoliceStationSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xffffff,
    emissiveMap: signTex,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 0.14), [
    navyTrimMat, navyTrimMat, navyTrimMat, navyTrimMat, signMat, navyTrimMat,
  ]);
  signMesh.position.set(0, 5.9, bD / 2 + 0.14);
  hqGroup.add(signMesh);

  // Ground Floor Left: Covered Patrol Car Garage Bay
  const garageFrame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.1, 0.2), navyTrimMat);
  garageFrame.position.set(-2.6, 1.55, bD / 2 + 0.05);
  const garageCavity = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 0.12), darkMetalMat);
  garageCavity.position.set(-2.6, 1.4, bD / 2 + 0.02);
  hqGroup.add(garageFrame, garageCavity);

  // Ground Floor Right: Main Public Entrance Canopy, Twin Red Lanterns & Sliding Glass Doors
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 1.6), navyTrimMat);
  canopy.position.set(2.0, 2.8, bD / 2 + 0.8);
  canopy.castShadow = true;
  hqGroup.add(canopy);

  [0.4, 3.6].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.7, 12), steelMat);
    col.position.set(px, 1.35, bD / 2 + 1.45);
    const redGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), redBeaconMat);
    redGlobe.position.set(px, 3.05, bD / 2 + 1.45);
    hqGroup.add(col, redGlobe);
  });

  const entryDoors = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 0.06), glassMat);
  entryDoors.position.set(2.0, 1.15, bD / 2 + 0.04);
  hqGroup.add(entryDoors);

  // 3. ROOFTOP POLICE RADIO COMMUNICATIONS TOWER & MICROWAVE DISHES (Reaches 11.8m <= 12.0m)
  const radioTower = new THREE.Group();
  radioTower.position.set(2.6, bH + 0.36, -0.8);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.32, 3.0, 8), steelMat);
  mast.position.y = 1.5;
  mast.castShadow = true;
  radioTower.add(mast);

  [0.8, 1.6, 2.4].forEach((ry) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28 - ry * 0.05, 0.03, 6, 12), steelMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    radioTower.add(ring);
  });

  // Twin Microwave Relay Dishes
  [-0.28, 0.28].forEach((dx) => {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.08, 0.14, 14), whiteLineMat);
    dish.rotation.x = Math.PI / 2;
    dish.position.set(dx, 2.1, 0.22);
    radioTower.add(dish);
  });

  const topBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), redBeaconMat);
  topBeacon.position.set(0, 3.05, 0);
  radioTower.add(topBeacon);

  hqGroup.add(radioTower);
  group.add(hqGroup);

  // 4. EMERGENCY VEHICLES ON FRONT DEPLOYMENT APRON
  // 4a. Black-and-White Japanese Police Patrol Car (パトカー at X = -2.6m, Z = 2.2m)
  const patrolCar = buildJapanesePatrolCar();
  patrolCar.position.set(-2.6, 0.15, 2.2);
  group.add(patrolCar);

  // 4b. White Police Motorcycle (白バイ / Shirobai at X = +3.2m, Z = 3.5m)
  const shirobai = buildPoliceMotorcycle();
  shirobai.position.set(3.2, 0.15, 3.5);
  shirobai.rotation.y = -0.25;
  group.add(shirobai);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}

// ============================================================================
// PART 2: TIER 0 (6m × 6m) NEIGHBORHOOD POLICE BOX (交番 / Kōban)
// ============================================================================

function createKobanSignTexture(): THREE.CanvasTexture {
  if (cachedKobanSignTex) return cachedKobanSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 58;
  const cy = 64;
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 16, cy + Math.sin(angle) * 16);
    ctx.lineTo(cx + Math.cos(angle) * 36, cy + Math.sin(angle) * 36);
    ctx.stroke();
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('POLICE BOX', 110, 48);

  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.fillText('交番 (KOBAN)', 112, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedKobanSignTex = texture;
  return texture;
}

function createBulletinBoardTexture(): THREE.CanvasTexture {
  if (cachedBulletinBoardTex) return cachedBulletinBoardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 192);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(6, 6, 244, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('安全・防犯のおしらせ', 128, 22);

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(18, 50, 96, 126);
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 50, 96, 126);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('交通安全', 66, 75);
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('SAFETY FIRST', 66, 95);

  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(142, 50, 96, 126);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(142, 50, 96, 126);
  ctx.fillStyle = '#0369a1';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('地域パトロール', 190, 75);
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('PATROL', 190, 95);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedBulletinBoardTex = texture;
  return texture;
}

/**
 * Builds the 6.0m × 6.0m (1U × 1U) Tier 0 Neighborhood Police Box (交番 / Kōban)
 */
export function buildPoliceBoxMesh(options: PoliceStationOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'PoliceBox_Koban';

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.65,
  });

  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 });
  const blueTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
  const redBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
  });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3, metalness: 0.7 });
  const treeGreenDark = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
  const treeGreenBright = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });

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

  const kGroup = new THREE.Group();
  kGroup.position.set(0.2, 0.15, -0.6);

  const kW = 4.0;
  const kD = 3.2;
  const kH = 4.2;

  const kBase = new THREE.Mesh(new THREE.BoxGeometry(kW + 0.06, 0.18, kD + 0.06), foundationMat);
  kBase.position.y = 0.09;
  kBase.receiveShadow = true;
  kGroup.add(kBase);

  const kBody = new THREE.Mesh(new THREE.BoxGeometry(kW, kH - 0.18, kD), wallMat);
  kBody.position.y = (kH + 0.18) / 2;
  kBody.castShadow = true;
  kBody.receiveShadow = true;
  kGroup.add(kBody);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(kW + 0.14, 0.28, kD + 0.14), blueTrimMat);
  parapet.position.y = kH + 0.14;
  parapet.castShadow = true;
  kGroup.add(parapet);

  const midBand = new THREE.Mesh(new THREE.BoxGeometry(kW + 0.04, 0.12, kD + 0.04), blueTrimMat);
  midBand.position.y = 2.45;
  kGroup.add(midBand);

  addWrapAroundWindows({
    targetGroup: kGroup,
    bW: kW,
    bD: kD,
    floorHeights: [1.45, 3.35],
    winW: 0.85,
    winH: 0.8,
    sideCols: 2,
    backCols: 2,
    glassMat,
    frameMat: blueTrimMat,
  });

  const canopyW = 2.4;
  const canopyH = 0.16;
  const canopyD = 1.0;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyW, canopyH, canopyD), blueTrimMat);
  canopy.position.set(-0.5, 2.5, kD / 2 + canopyD / 2);
  canopy.castShadow = true;
  kGroup.add(canopy);

  const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), redBeaconMat);
  redLight.position.set(-0.5, 2.8, kD / 2 + canopyD - 0.15);
  kGroup.add(redLight);

  const lightStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), metalMat);
  lightStem.position.set(-0.5, 2.65, kD / 2 + canopyD - 0.15);
  kGroup.add(lightStem);

  const emblemGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24);
  emblemGeo.rotateX(Math.PI / 2);
  const emblem = new THREE.Mesh(emblemGeo, goldMat);
  emblem.position.set(-0.5, 3.0, kD / 2 + 0.03);
  kGroup.add(emblem);

  const signMat = new THREE.MeshStandardMaterial({
    map: createKobanSignTexture(),
    roughness: 0.4,
  });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.48, 0.04), [
    blueTrimMat, blueTrimMat, blueTrimMat, blueTrimMat, signMat, blueTrimMat
  ]);
  signBoard.position.set(-0.5, 3.65, kD / 2 + 0.03);
  kGroup.add(signBoard);

  const doorW = 1.6;
  const doorH = 2.15;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, doorH + 0.06, 0.06), blueTrimMat);
  doorFrame.position.set(-0.5, doorH / 2 + 0.03, kD / 2 + 0.02);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.02), glassMat);
  doorGlass.position.set(-0.5, doorH / 2 + 0.03, kD / 2 + 0.03);
  kGroup.add(doorFrame, doorGlass);

  const winW = 1.2;
  const winH = 1.1;
  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.02), glassMat);
  winGlass.position.set(1.2, 1.45, kD / 2 + 0.01);
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.08, winH + 0.08, 0.05), blueTrimMat);
  winFrame.position.set(1.2, 1.45, kD / 2 + 0.02);
  kGroup.add(winFrame, winGlass);

  for (let i = 0; i < 2; i++) {
    const uWinX = -0.7 + i * 1.5;
    const uGlass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.02), glassMat);
    uGlass.position.set(uWinX, 3.35, kD / 2 + 0.01);
    const uFrame = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.88, 0.05), blueTrimMat);
    uFrame.position.set(uWinX, 3.35, kD / 2 + 0.02);
    kGroup.add(uFrame, uGlass);
  }

  group.add(kGroup);

  // White Police Patrol Bicycle (Shiro-Chari)
  const bikeGroup = new THREE.Group();
  bikeGroup.position.set(1.8, 0.15, 1.25);
  bikeGroup.rotation.y = -0.2;

  const bWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 16);
  bWheelGeo.rotateZ(Math.PI / 2);
  const bTireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });

  const bWheelF = new THREE.Mesh(bWheelGeo, bTireMat);
  bWheelF.position.set(0, 0.24, 0.45);
  const bWheelR = new THREE.Mesh(bWheelGeo, bTireMat);
  bWheelR.position.set(0, 0.24, -0.45);
  bikeGroup.add(bWheelF, bWheelR);

  const bikeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const frameBar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8), bikeWhiteMat);
  frameBar1.position.set(0, 0.38, 0);
  frameBar1.rotation.x = 0.55;
  const frameBar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), bikeWhiteMat);
  frameBar2.position.set(0, 0.45, -0.15);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.22), blueTrimMat);
  saddle.position.set(0, 0.72, -0.18);
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.03), metalMat);
  hBar.position.set(0, 0.85, 0.38);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.22), metalMat);
  basket.position.set(0, 0.65, 0.46);
  bikeGroup.add(frameBar1, frameBar2, saddle, hBar, basket);
  group.add(bikeGroup);

  // Police Bulletin Board (Keijiban)
  const boardGroup = new THREE.Group();
  boardGroup.position.set(-1.8, 0.15, 1.25);

  const boardMat = new THREE.MeshStandardMaterial({
    map: createBulletinBoardTexture(),
    roughness: 0.6,
  });

  const bPlate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.04), [
    blueTrimMat, blueTrimMat, blueTrimMat, blueTrimMat, boardMat, blueTrimMat
  ]);
  bPlate.position.y = 1.05;
  bPlate.castShadow = true;
  boardGroup.add(bPlate);

  [-0.42, 0.42].forEach(px => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), metalMat);
    post.position.set(px, 0.55, 0);
    boardGroup.add(post);
  });

  group.add(boardGroup);

  if (includeLandscaping) {
    const wallH = 1.2;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(lotWidth, wallH, 0.08), foundationMat);
    backWall.position.set(0, 0.15 + wallH / 2, -2.85);
    backWall.receiveShadow = true;
    group.add(backWall);

    const treeGroup = new THREE.Group();
    treeGroup.position.set(-2.0, 0.15, -2.0);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 8), treeTrunkMat);
    trunk.position.y = 0.75;
    treeGroup.add(trunk);

    for (let i = 0; i < 3; i++) {
      const radius = 1.0 * (1 - i * 0.22);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, 1.35, 8), i % 2 === 0 ? treeGreenDark : treeGreenBright);
      cone.position.y = 1.3 + i * 0.85;
      treeGroup.add(cone);
    }
    group.add(treeGroup);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
