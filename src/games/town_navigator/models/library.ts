import * as THREE from 'three';
import {
  getConcretePanelTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedLibrarySignTex: THREE.CanvasTexture | null = null;
let cachedBookReturnTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Library Header Sign
 */
function createLibrarySignTexture(): THREE.CanvasTexture {
  if (cachedLibrarySignTex) return cachedLibrarySignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(cx - 24, cy + 8, 48, 12);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(cx - 22, cy - 6, 44, 12);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(cx - 20, cy - 20, 40, 12);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('LIBRARY', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('市立図書館 (PUBLIC LIBRARY)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedLibrarySignTex = texture;
  return texture;
}

/**
 * Procedural texture for 24h Book Return Box (Henkyaku-Posuto)
 */
function createBookReturnTexture(): THREE.CanvasTexture {
  if (cachedBookReturnTex) return cachedBookReturnTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 116);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('BOOK RETURN', 128, 42);

  ctx.font = 'bold 15px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('返却ポスト (24時間)', 128, 82);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedBookReturnTex = texture;
  return texture;
}

export interface LibraryOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Public Library (hwg5_u19_04)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildLibraryMesh(options: LibraryOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Library_hwg5_u19_04';

  // Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    map: getConcretePanelTexture(),
    roughness: 0.68,
  });
  const woodLouverMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.58 });
  const emeraldTrimMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.45 });
  const warmAtriumMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 0.45,
    roughness: 0.6,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 });
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

  // 2. MAIN 2-STORY LIBRARY BUILDING WITH SEE-THROUGH GLASS READING ATRIUM (detail1)
  const libGroup = new THREE.Group();
  libGroup.position.set(0, 0.15, -0.6);

  const bW = 9.8;
  const bD = 6.6;
  const bH = 7.6;

  // Rear & Right Wing Solid Structure (Leaving the Left/Center 5.8m × 5.6m Reading Atrium recessed!)
  const rearCore = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD - 1.4), stoneMat);
  rearCore.position.set(0, bH / 2, -0.7);
  rearCore.castShadow = true;
  rearCore.receiveShadow = true;

  const rightFrontWing = new THREE.Mesh(new THREE.BoxGeometry(3.6, bH, 1.4), stoneMat);
  rightFrontWing.position.set(bW / 2 - 1.8, bH / 2, bD / 2 - 0.7);
  rightFrontWing.castShadow = true;

  const leftFrontPier = new THREE.Mesh(new THREE.BoxGeometry(0.45, bH, 1.4), stoneMat);
  leftFrontPier.position.set(-bW / 2 + 0.225, bH / 2, bD / 2 - 0.7);

  const upperHeaderWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.8, 1.4), stoneMat);
  upperHeaderWall.position.set(-1.55, bH - 0.9, bD / 2 - 0.7);
  libGroup.add(rearCore, rightFrontWing, leftFrontPier, upperHeaderWall);

  // Warm Illuminated Reading Room Backdrop inside the Recessed Atrium
  const atriumBackWall = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), warmAtriumMat);
  atriumBackWall.position.set(-1.55, 2.9, bD / 2 - 1.38);
  const atriumFloor = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.12, 1.35), woodLouverMat);
  atriumFloor.position.set(-1.55, 0.06, bD / 2 - 0.7);
  libGroup.add(atriumBackWall, atriumFloor);

  // Interior 3-Tier Oak Bookshelves & Colorful Books (Clearly visible inside the glass atrium!)
  const bookColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = 1.0 + shelf * 1.65;
    const sMesh = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.08, 0.42), woodLouverMat);
    sMesh.position.set(-1.55, sy, bD / 2 - 0.85);
    libGroup.add(sMesh);

    for (let b = 0; b < 13; b++) {
      const bColor = bookColors[(shelf * 5 + b) % bookColors.length];
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.42, 0.30),
        new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.5 })
      );
      book.position.set(-3.8 + b * 0.37, sy + 0.25, bD / 2 - 0.85);
      libGroup.add(book);
    }
  }

  // Open Rooftop Safety Railing
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.65, steelMat, 1.6);
  roofRail.position.set(0, bH, 0);
  libGroup.add(roofRail);

  // 360° Side & Rear Reading Room Windows
  addWrapAroundWindows({
    targetGroup: libGroup,
    bW,
    bD,
    floorHeights: [1.8, 4.8],
    winW: 1.15,
    winH: 1.4,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: emeraldTrimMat,
  });

  // Natural Cedar Architectural Louver Fins on Upper Facade
  for (let l = 0; l < 18; l++) {
    const lx = -bW / 2 + 0.4 + l * 0.52;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.24), woodLouverMat);
    fin.position.set(lx, 6.2, bD / 2 + 0.12);
    libGroup.add(fin);
  }

  // Soaring 2-Story Floor-to-Ceiling Glass Reading Atrium Curtain Wall + Mullions
  const glassAtriumW = 5.6;
  const glassAtriumH = 5.6;
  const atriumGlass = new THREE.Mesh(new THREE.BoxGeometry(glassAtriumW, glassAtriumH, 0.06), glassMat);
  atriumGlass.position.set(-1.55, glassAtriumH / 2 + 0.1, bD / 2 - 0.02);
  libGroup.add(atriumGlass);

  for (let m = 0; m <= 4; m++) {
    const mx = -1.55 - glassAtriumW / 2 + m * (glassAtriumW / 4);
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, glassAtriumH, 0.10), darkMetalMat);
    mullion.position.set(mx, glassAtriumH / 2 + 0.1, bD / 2);
    libGroup.add(mullion);
  }

  // Entrance Lobby & Cedar Canopy (Right Wing: X = +2.9m)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.6), woodLouverMat);
  canopy.position.set(2.9, 3.1, bD / 2 + 0.75);
  canopy.castShadow = true;
  libGroup.add(canopy);

  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.06), glassMat);
  doors.position.set(2.9, 1.2, bD / 2 + 0.04);
  libGroup.add(doors);

  // Prominent Header Signboard: "LIBRARY / 図書館"
  const signTexture = createLibrarySignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 0.12), [
    emeraldTrimMat, emeraldTrimMat, emeraldTrimMat, emeraldTrimMat, signMat, emeraldTrimMat
  ]);
  signMesh.position.set(0, bH - 0.35, bD / 2 + 0.26);
  libGroup.add(signMesh);

  group.add(libGroup);

  // 3. FORECOURT PROPS (detail2: Book Return Box & Reading Bench grouped at X = -3.8m..-2.2m, Z = 3.2m)
  // 3a. Outdoor 24-Hour Book Return Drop Box (Henkyaku-Posuto at X = -3.85m, Z = 3.2m)
  const returnGroup = new THREE.Group();
  returnGroup.position.set(-3.85, 0.15, 3.2);

  const dropTexture = createBookReturnTexture();
  const dropMat = new THREE.MeshStandardMaterial({ map: dropTexture, roughness: 0.4 });
  const dropBox = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.15, 0.65), [
    emeraldTrimMat, emeraldTrimMat, emeraldTrimMat, emeraldTrimMat, dropMat, emeraldTrimMat
  ]);
  dropBox.position.y = 0.575;
  dropBox.castShadow = true;
  const slotHood = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.12), steelMat);
  slotHood.position.set(0, 0.98, 0.35);
  returnGroup.add(dropBox, slotHood);
  group.add(returnGroup);

  // 3b. Wooden Reading Bench right beside Book Return Box (X = -2.35m, Z = 3.2m)
  const benchGroup = new THREE.Group();
  benchGroup.position.set(-2.35, 0.15, 3.2);

  const bSeat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.45), woodLouverMat);
  bSeat.position.y = 0.45;
  const bBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.06), woodLouverMat);
  bBack.position.set(0, 0.68, -0.2);
  benchGroup.add(bSeat, bBack);

  [-0.65, 0.65].forEach(bx => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), darkMetalMat);
    leg.position.set(bx, 0.225, 0);
    benchGroup.add(leg);
  });
  group.add(benchGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
