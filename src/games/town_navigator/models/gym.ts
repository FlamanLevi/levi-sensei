import * as THREE from 'three';
import { getConcretePanelTexture, addWrapAroundWindows } from './wallTextures';

let cachedGymSignTex: THREE.CanvasTexture | null = null;
let cachedBasketballCourtTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Gymnasium Header Sign
 */
function createGymSignTexture(): THREE.CanvasTexture {
  if (cachedGymSignTex) return cachedGymSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('GYMNASIUM', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fed7aa';
  ctx.fillText('体育館 (GYM)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedGymSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Polished Maple Basketball Court Floor with Regulation Lines
 */
function createBasketballCourtTexture(): THREE.CanvasTexture {
  if (cachedBasketballCourtTex) return cachedBasketballCourtTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Maple hardwood planks
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, 512, 256);

  ctx.fillStyle = 'rgba(180, 83, 9, 0.35)';
  for (let r = 0; r < 32; r++) {
    ctx.fillRect(0, r * 8, 512, 3);
  }

  // Painted orange keys (Left & Right)
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(16, 82, 86, 92);
  ctx.fillRect(410, 82, 86, 92);

  // White court lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(16, 16, 480, 224);

  // Half-court line & Center circle
  ctx.beginPath();
  ctx.moveTo(256, 16);
  ctx.lineTo(256, 240);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(256, 128, 36, 0, Math.PI * 2);
  ctx.stroke();

  // 3-Point Arcs
  ctx.beginPath();
  ctx.arc(40, 128, 88, -Math.PI / 2.2, Math.PI / 2.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(472, 128, 88, Math.PI - Math.PI / 2.2, Math.PI + Math.PI / 2.2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedBasketballCourtTex = texture;
  return texture;
}

/**
 * Builds a regulation Basketball Hoop (Backboard, Orange Rim & Net)
 */
function buildBasketballHoop(): THREE.Group {
  const hoop = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const rimOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.3 });
  const netMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, wireframe: true });

  const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 2.85, 8), postMat);
  stanchion.position.set(0, 1.425, -0.45);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.55), postMat);
  boom.position.set(0, 2.75, -0.2);

  const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.92, 0.05), boardMat);
  backboard.position.set(0, 2.85, 0.08);
  const targetBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.06), rimOrangeMat);
  targetBox.position.set(0, 2.72, 0.08);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 16), rimOrangeMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 2.55, 0.32);

  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.34, 10, 2, true), netMat);
  net.position.set(0, 2.38, 0.32);

  hoop.add(stanchion, boom, backboard, targetBox, rim, net);
  return hoop;
}

export interface GymOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Community/School Gymnasium (hwg5_u19_16)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildGymMesh(options: GymOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Gym_hwg5_u19_16';

  // Materials
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.7,
  });
  const barrelRoofMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.25 });
  const courtFloorMat = new THREE.MeshStandardMaterial({
    map: createBasketballCourtTexture(),
    roughness: 0.28,
  });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.3,
    roughness: 0.7,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
  const sportsBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.52,
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

  // 2. MAIN GYMNASIUM ARENA WITH OPEN SEE-THROUGH FOYER & BASKETBALL COURT (detail1)
  const gymGroup = new THREE.Group();
  gymGroup.position.set(0, 0.15, -0.6);

  const bW = 10.4;
  const bD = 7.0;
  const bH = 6.2;

  // Rear & Side Structural Walls (Leaving a 6.4m wide × 3.8m tall open foyer window in front!)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, 0.35), concreteMat);
  backWall.position.set(0, bH / 2, -bD / 2 + 0.175);
  backWall.castShadow = true;
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, bH, bD), concreteMat);
  leftWall.position.set(-bW / 2 + 0.175, bH / 2, 0);
  leftWall.castShadow = true;
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, bH, bD), concreteMat);
  rightWall.position.set(bW / 2 - 0.175, bH / 2, 0);
  rightWall.castShadow = true;

  // Front Left & Right Corner Piers + Upper Clerestory Fascia Wall
  const pierL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.8, 0.35), concreteMat);
  pierL.position.set(-bW / 2 + 1.0, 1.9, bD / 2 - 0.175);
  const pierR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.8, 0.35), concreteMat);
  pierR.position.set(bW / 2 - 1.0, 1.9, bD / 2 - 0.175);
  const frontUpperWall = new THREE.Mesh(new THREE.BoxGeometry(bW, 2.4, 0.35), concreteMat);
  frontUpperWall.position.set(0, 5.0, bD / 2 - 0.175);
  gymGroup.add(backWall, leftWall, rightWall, pierL, pierR, frontUpperWall);

  // Interior Warm Back Backdrop
  const interiorBack = new THREE.Mesh(new THREE.PlaneGeometry(bW - 0.8, bH - 0.4), interiorWallMat);
  interiorBack.position.set(0, bH / 2, -bD / 2 + 0.38);
  gymGroup.add(interiorBack);

  // Polished Hardwood Basketball Court Floor & Twin Regulation Hoops (Visible through foyer!)
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(bW - 0.7, 0.08, bD - 0.7), courtFloorMat);
  floorMesh.position.set(0, 0.04, 0);
  floorMesh.receiveShadow = true;
  gymGroup.add(floorMesh);

  const hoopWest = buildBasketballHoop();
  hoopWest.position.set(-3.9, 0.08, -0.2);
  hoopWest.rotation.y = Math.PI / 2;
  const hoopEast = buildBasketballHoop();
  hoopEast.position.set(3.9, 0.08, -0.2);
  hoopEast.rotation.y = -Math.PI / 2;
  gymGroup.add(hoopWest, hoopEast);

  // Curved Barrel Vault Roof + Structural Standing-Seam Ribs
  const archRadius = bW / 2;
  const barrelGeo = new THREE.CylinderGeometry(archRadius, archRadius, bD + 0.3, 32, 1, false, 0, Math.PI);
  barrelGeo.rotateZ(Math.PI / 2);
  barrelGeo.rotateY(Math.PI / 2);
  const barrelRoof = new THREE.Mesh(barrelGeo, barrelRoofMat);
  barrelRoof.scale.set(1.0, 0.62, 1.0);
  barrelRoof.position.set(0, bH, 0);
  barrelRoof.castShadow = true;
  gymGroup.add(barrelRoof);

  // 360° Side & Rear Clerestory Windows
  addWrapAroundWindows({
    targetGroup: gymGroup,
    bW,
    bD,
    floorHeights: [4.8],
    winW: 1.25,
    winH: 0.95,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: darkMetalMat,
  });

  // High Sports Clerestory Windows Along Upper Front Facade
  for (let w = 0; w < 6; w++) {
    const wx = -4.0 + w * 1.6;
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.06), glassMat);
    win.position.set(wx, 4.8, bD / 2 + 0.02);
    gymGroup.add(win);
  }

  // Wide Transparent Glass Foyer Curtain Wall & Canopy
  const foyerGlass = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 0.05), glassMat);
  foyerGlass.position.set(0, 1.8, bD / 2 - 0.05);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 1.5), sportsBlueMat);
  canopy.position.set(0, 3.7, bD / 2 + 0.65);
  canopy.castShadow = true;
  gymGroup.add(foyerGlass, canopy);

  // Prominent Header Signboard: "GYMNASIUM / 体育館"
  const signTexture = createGymSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 0.12), [
    sportsBlueMat, sportsBlueMat, sportsBlueMat, sportsBlueMat, signMat, sportsBlueMat
  ]);
  signMesh.position.set(0, bH + 0.5, bD / 2 + 0.12);
  gymGroup.add(signMesh);

  group.add(gymGroup);

  // 3. FORECOURT PROPS: MULTI-SPOUT DRINKING FOUNTAIN (detail2 at X = -3.0m, Z = 3.2m)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(-3.0, 0.15, 3.2);

  const fBase = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.68, 0.52), concreteMat);
  fBase.position.y = 0.34;
  fBase.castShadow = true;
  const fBack = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.45, 0.10), sportsBlueMat);
  fBack.position.set(0, 0.88, -0.21);
  fountainGroup.add(fBase, fBack);

  [-0.42, 0.0, 0.42].forEach((fx) => {
    const fFaucet = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 8), chromeMat);
    fFaucet.position.set(fx, 0.82, -0.05);
    const spout = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), chromeMat);
    spout.position.set(fx, 0.94, 0.02);
    fountainGroup.add(fFaucet, spout);
  });

  group.add(fountainGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
