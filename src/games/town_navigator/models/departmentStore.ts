import * as THREE from 'three';
import {
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

export interface DepartmentStoreOptions {
  includeRoad?: boolean;
  scale?: number;
}

let cachedDepatoBillboardTex: THREE.CanvasTexture | null = null;
let cachedDepatoMarqueeTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Department Store Rooftop Billboard: "DEPARTMENT STORE / デパート"
 */
function createBillboardTexture(): THREE.CanvasTexture {
  if (cachedDepatoBillboardTex) return cachedDepatoBillboardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 240);

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(256, 32);
  ctx.lineTo(290, 75);
  ctx.lineTo(256, 118);
  ctx.lineTo(222, 75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DEPARTMENT STORE', 256, 155);

  ctx.font = 'bold 36px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('デパート (百貨店)', 256, 208);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedDepatoBillboardTex = texture;
  return texture;
}

/**
 * Procedural texture for the Grand Entrance Canopy Marquee
 */
function createCanopyMarqueeTexture(): THREE.CanvasTexture {
  if (cachedDepatoMarqueeTex) return cachedDepatoMarqueeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, 512, 64);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 56);

  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 28px serif';
  ctx.fillText('✦ DEPARTMENT STORE • 百貨店 ✦', 256, 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedDepatoMarqueeTex = texture;
  return texture;
}

/**
 * Builds an authentic 12.0m × 12.0m (2U × 2U) Japanese Department Store (デパート - Depāto).
 * Matching MEXT Here We Go 6 Unit 11 p.9 card hwg6_u09_21.
 */
export function buildDepartmentStoreMesh(options: DepartmentStoreOptions = {}): THREE.Group {
  const { scale = 1.0 } = options;
  const group = new THREE.Group();
  group.name = 'DepartmentStore_hwg6_u09_21';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    map: getBrickTileTexture(),
    roughness: 0.58,
  });

  const accentGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.72,
    roughness: 0.25,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
  });

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.4,
  });

  const warmDisplayMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde047,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  const balloonMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
  });

  const balloonWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
  });

  const lotSize = 12.0;

  // 1. PROPERTY BASE (12m × 12m)
  const plazaGeo = new THREE.BoxGeometry(lotSize, 0.15, 10.5);
  const plaza = new THREE.Mesh(plazaGeo, foundationMat);
  plaza.position.set(0, 0.075, -0.75);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Sidewalk slab in front: 12.0m wide, 1.5m deep (Z in [+4.5, +6.0])
  const sidewalkGeo = new THREE.BoxGeometry(lotSize, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, foundationMat);
  sidewalk.position.set(0, 0.075, 5.25);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(lotSize, 0.18, 0.12);
  const curb = new THREE.Mesh(curbGeo, darkMetalMat);
  curb.position.set(0, 0.09, 6.0);
  curb.receiveShadow = true;
  group.add(curb);

  // 2. MAIN 4-STORY DEPARTMENT STORE TOWER
  const bW = 11.0;
  const bD = 8.2;
  const bH = 10.4;
  const buildingZ = -1.6;

  const storeTower = new THREE.Group();
  storeTower.position.set(0, 0.15, buildingZ);

  const baseBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.14, 0.32, bD + 0.14), darkMetalMat);
  baseBand.position.set(0, 0.16, 0);
  baseBand.receiveShadow = true;
  storeTower.add(baseBand);

  const bodyGeo = new THREE.BoxGeometry(bW, bH - 0.3, bD);
  const body = new THREE.Mesh(bodyGeo, wallMat);
  body.position.set(0, (bH + 0.3) / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  storeTower.add(body);

  // Golden Cornices / Parapet Capping Band & Open Rooftop Balustrade
  const corniceGeo = new THREE.BoxGeometry(bW + 0.28, 0.42, bD + 0.28);
  const cornice = new THREE.Mesh(corniceGeo, accentGoldMat);
  cornice.position.set(0, bH + 0.21, 0);
  cornice.castShadow = true;
  storeTower.add(cornice);

  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.65, accentGoldMat, 1.8);
  roofRail.position.set(0, bH + 0.42, 0);
  storeTower.add(roofRail);

  // Vertical Stone Pilasters along Front Facade
  [-5.2, -2.85, 2.85, 5.2].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.26, bH, 0.14), accentGoldMat);
    pilaster.position.set(px, bH / 2, bD / 2 + 0.04);
    storeTower.add(pilaster);
  });

  // 360° Side & Rear Gold-Trimmed Windows
  addWrapAroundWindows({
    targetGroup: storeTower,
    bW,
    bD,
    floorHeights: [4.05, 6.65, 9.05],
    winW: 1.3,
    winH: 1.5,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: accentGoldMat,
  });

  // Upper Floor Architectural Ribbon Windows (Floors 2, 3, 4)
  [4.05, 6.65, 9.05].forEach((yWin) => {
    [-3.8, -1.9, 0, 1.9, 3.8].forEach((wx) => {
      const winGeo = new THREE.BoxGeometry(1.4, 1.6, 0.08);
      const win = new THREE.Mesh(winGeo, glassMat);
      win.position.set(wx, yWin, bD / 2 + 0.03);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.05), accentGoldMat);
      frame.position.set(wx, yWin, bD / 2 + 0.01);
      storeTower.add(frame, win);
    });
  });

  // 3. GROUND FLOOR ILLUMINATED SHOW WINDOWS & MANNEQUIN DISPLAYS
  [-3.9, 3.9].forEach((wx) => {
    // Warm illuminated display backdrop
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.1), warmDisplayMat);
    backdrop.position.set(wx, 1.25, bD / 2 - 0.18);
    storeTower.add(backdrop);

    const swGeo = new THREE.BoxGeometry(2.4, 2.2, 0.12);
    const sw = new THREE.Mesh(swGeo, glassMat);
    sw.position.set(wx, 1.25, bD / 2 + 0.05);
    const swFrame = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.35, 0.08), accentGoldMat);
    swFrame.position.set(wx, 1.25, bD / 2 + 0.02);
    storeTower.add(swFrame, sw);

    // 2 Fashion Mannequins on Circular Display Pedestals inside each window
    [-0.45, 0.45].forEach((mx, mIdx) => {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.14, 12), accentGoldMat);
      ped.position.set(wx + mx, 0.22, bD / 2 - 0.06);
      const mannequin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, 1.25, 10),
        new THREE.MeshStandardMaterial({ color: mIdx === 0 ? 0xec4899 : 0x2563eb, roughness: 0.45 })
      );
      mannequin.position.set(wx + mx, 0.90, bD / 2 - 0.06);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), balloonWhiteMat);
      head.position.set(wx + mx, 1.62, bD / 2 - 0.06);
      storeTower.add(ped, mannequin, head);
    });

    const awningGeo = new THREE.BoxGeometry(2.6, 0.1, 0.8);
    const awning = new THREE.Mesh(awningGeo, redMat);
    awning.position.set(wx, 2.45, bD / 2 + 0.4);
    awning.rotation.x = 0.25;
    awning.castShadow = true;
    storeTower.add(awning);
  });

  // 4. GRAND CENTRAL ENTRANCE CANOPY, MARQUEE & REVOLVING DOORS (detail1)
  const entranceW = 4.2;
  const canopyD = 1.85;

  const canopyGeo = new THREE.BoxGeometry(entranceW, 0.24, canopyD);
  const canopy = new THREE.Mesh(canopyGeo, accentGoldMat);
  canopy.position.set(0, 3.25, bD / 2 + canopyD / 2);
  canopy.castShadow = true;
  storeTower.add(canopy);

  // Illuminated Marquee Sign on Front Lip of Canopy
  const marqueeMat = new THREE.MeshStandardMaterial({
    map: createCanopyMarqueeTexture(),
    emissive: 0xffffff,
    emissiveMap: createCanopyMarqueeTexture(),
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const marqueeBoard = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.42, 0.08), [
    accentGoldMat, accentGoldMat, accentGoldMat, accentGoldMat, marqueeMat, accentGoldMat,
  ]);
  marqueeBoard.position.set(0, 3.45, bD / 2 + canopyD - 0.04);
  storeTower.add(marqueeBoard);

  [-entranceW / 2 + 0.2, entranceW / 2 - 0.2].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 3.1, 12), accentGoldMat);
    post.position.set(px, 1.55, bD / 2 + canopyD - 0.2);
    post.castShadow = true;
    storeTower.add(post);
  });

  // Grand Glass Entrance + Central Revolving Door Drum
  const doorGeo = new THREE.BoxGeometry(entranceW - 0.6, 2.6, 0.06);
  const doors = new THREE.Mesh(doorGeo, glassMat);
  doors.position.set(0, 1.3, bD / 2 + 0.04);
  const revolvingDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.35, 16), glassMat);
  revolvingDrum.position.set(0, 1.2, bD / 2 + 0.35);
  const drumCap = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 16), accentGoldMat);
  drumCap.position.set(0, 2.42, bD / 2 + 0.35);
  storeTower.add(doors, revolvingDrum, drumCap);

  // Red Welcome Carpet Runner & Brass Rope Stanchions
  const carpetGeo = new THREE.BoxGeometry(2.4, 0.02, 2.1);
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
  const carpet = new THREE.Mesh(carpetGeo, carpetMat);
  carpet.position.set(0, 0.01, bD / 2 + 1.15);
  carpet.receiveShadow = true;
  storeTower.add(carpet);

  [-1.35, 1.35].forEach((sx) => {
    const topiaryPot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.42, 12), accentGoldMat);
    topiaryPot.position.set(sx, 0.21, bD / 2 + 1.85);
    const topiaryBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 })
    );
    topiaryBall.position.set(sx, 0.62, bD / 2 + 1.85);
    storeTower.add(topiaryPot, topiaryBall);
  });

  // 5. ROOFTOP BILLBOARD STRUCTURE (detail2)
  const billW = 5.2;
  const billH = 2.4;
  const billZ = bD / 2 - 1.2;

  [-billW / 2 + 0.4, billW / 2 - 0.4].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), darkMetalMat);
    leg.position.set(lx, bH + 0.7, billZ);
    storeTower.add(leg);
  });

  const boardGeo = new THREE.BoxGeometry(billW, billH, 0.18);
  const boardMat = new THREE.MeshStandardMaterial({
    map: createBillboardTexture(),
    emissive: 0xffffff,
    emissiveMap: createBillboardTexture(),
    emissiveIntensity: 0.4,
    roughness: 0.35,
  });
  const board = new THREE.Mesh(boardGeo, [
    redMat, redMat, redMat, redMat, boardMat, boardMat,
  ]);
  board.position.set(0, bH + 1.4 + billH / 2, billZ);
  board.castShadow = true;
  storeTower.add(board);

  group.add(storeTower);

  // 6. FESTIVE FLOATING ADVERTISING BALLOON (detail2: アドバルーン)
  const balloonGroup = new THREE.Group();
  balloonGroup.position.set(2.2, bH + 0.15 + 5.2, buildingZ);

  const sphereGeo = new THREE.SphereGeometry(1.1, 16, 16);
  const balloonSphere = new THREE.Mesh(sphereGeo, balloonMat);
  balloonSphere.castShadow = true;
  balloonGroup.add(balloonSphere);

  const whiteStripeGeo = new THREE.CylinderGeometry(1.12, 1.12, 0.45, 16);
  const whiteStripe = new THREE.Mesh(whiteStripeGeo, balloonWhiteMat);
  balloonGroup.add(whiteStripe);

  // Vertical Hanging "大創業祭 / SALE" Pennant Banner below Balloon
  const hangingBanner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.9, 0.03), redMat);
  hangingBanner.position.set(0, -1.95, 0);
  const bannerTrim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.04), accentGoldMat);
  bannerTrim.position.set(0, -1.0, 0);
  balloonGroup.add(hangingBanner, bannerTrim);

  const tetherGeo = new THREE.CylinderGeometry(0.008, 0.008, 4.5, 6);
  const tether = new THREE.Mesh(tetherGeo, darkMetalMat);
  tether.position.set(0, -2.5, 0);
  balloonGroup.add(tether);

  group.add(balloonGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
