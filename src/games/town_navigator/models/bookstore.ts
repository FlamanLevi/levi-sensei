import * as THREE from 'three';
import {
  getHorizontalSidingTexture,
  addWrapAroundWindows,
  getClearShowcaseGlassMaterial,
  buildPerimeterRailing,
} from './wallTextures';

let cachedBookstoreSignTex: THREE.CanvasTexture | null = null;
let cachedBookshelfTex: THREE.CanvasTexture | null = null;
let cachedBladeSignTex: THREE.CanvasTexture | null = null;
let cachedSalePlacardTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Bookstore storefront sign (本 / BOOKSTORE)
 */
function createBookstoreSignTexture(): THREE.CanvasTexture {
  if (cachedBookstoreSignTex) return cachedBookstoreSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const bx = 64;
  const by = 64;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(bx - 32, by - 24);
  ctx.quadraticCurveTo(bx - 16, by - 28, bx - 2, by - 22);
  ctx.lineTo(bx - 2, by + 24);
  ctx.quadraticCurveTo(bx - 16, by + 18, bx - 32, by + 22);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(bx + 32, by - 24);
  ctx.quadraticCurveTo(bx + 16, by - 28, bx + 2, by - 22);
  ctx.lineTo(bx + 2, by + 24);
  ctx.quadraticCurveTo(bx + 16, by + 18, bx + 32, by + 22);
  ctx.fill();

  ctx.fillStyle = '#eab308';
  ctx.fillRect(bx - 3, by - 22, 6, 46);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('BOOKSTORE', 120, 48);

  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('本・書店 (BOOKS & MANGA)', 122, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedBookstoreSignTex = texture;
  return texture;
}

/**
 * Procedural texture for projecting vertical blade sign (袖看板)
 */
function createBladeSignTexture(): THREE.CanvasTexture {
  if (cachedBladeSignTex) return cachedBladeSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 116, 244);

  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'center';
  ctx.font = '900 54px "BIZ UDPGothic", serif';
  ctx.fillText('本', 64, 78);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "BIZ UDPGothic", sans-serif';
  ctx.fillText('書 店', 64, 138);

  ctx.fillStyle = '#fde047';
  ctx.font = '900 24px sans-serif';
  ctx.fillText('BOOKS', 64, 205);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedBladeSignTex = texture;
  return texture;
}

/**
 * Procedural texture for book display windows (shelves of manga & novel spines)
 */
function createBookshelfTexture(): THREE.CanvasTexture {
  if (cachedBookshelfTex) return cachedBookshelfTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, 0, 256, 256);

  const rowY = [32, 92, 152, 212];
  const bookColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff', '#06b6d4'];

  rowY.forEach((ry, rIdx) => {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(8, ry + 26, 240, 8);

    let curX = 14;
    while (curX < 240) {
      const bWidth = 8 + (curX * 7) % 10;
      const bHeight = 22 + (curX * 3) % 6;
      ctx.fillStyle = bookColors[(curX + rIdx) % bookColors.length];
      ctx.fillRect(curX, ry + (26 - bHeight), bWidth, bHeight);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(curX + 2, ry + (26 - bHeight) + 4, bWidth - 4, 3);

      curX += bWidth + 2;
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedBookshelfTex = texture;
  return texture;
}

/**
 * Procedural texture for the Wagon Sale Cart placard ("SALE ¥100")
 */
function createSalePlacardTexture(): THREE.CanvasTexture {
  if (cachedSalePlacardTex) return cachedSalePlacardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 60);

  ctx.fillStyle = '#dc2626';
  ctx.textAlign = 'center';
  ctx.font = '900 22px sans-serif';
  ctx.fillText('SALE ¥100', 64, 28);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px "BIZ UDPGothic", sans-serif';
  ctx.fillText('特価・古本市', 64, 50);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedSalePlacardTex = texture;
  return texture;
}

export interface BookstoreOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic, low-poly 3D Bookstore matching textbook card hwg5_u19_02
 * Standard 6.0m × 6.0m Lot (1U) within strict 6.0m height envelope
 */
export function buildBookstoreMesh(options: BookstoreOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Bookstore_hwg5_u19_02';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    map: getHorizontalSidingTexture(),
    roughness: 0.8,
  });

  const woodTrimMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.6,
  });

  const awningMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.65,
  });

  const awningStripeMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.65,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.75,
    roughness: 0.25,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
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

  const whiteLineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
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

  // 2. MAIN 2-STORY BOOKSTORE BUILDING
  const bGroup = new THREE.Group();
  bGroup.position.set(0.1, 0.15, -0.6);

  const bW = 4.6;
  const bD = 3.2;
  const bH = 4.2;

  const bBaseGeo = new THREE.BoxGeometry(bW + 0.06, 0.18, bD + 0.06);
  const bBase = new THREE.Mesh(bBaseGeo, foundationMat);
  bBase.position.y = 0.09;
  bBase.receiveShadow = true;
  bGroup.add(bBase);

  const bBodyGeo = new THREE.BoxGeometry(bW, bH - 0.18, bD);
  const bBody = new THREE.Mesh(bBodyGeo, wallMat);
  bBody.position.y = (bH + 0.18) / 2;
  bBody.castShadow = true;
  bBody.receiveShadow = true;
  bGroup.add(bBody);

  // Sloped Copper-Green Mansard Roof + Cornice Trim + Rooftop Perimeter Railing
  const clearGlassMat = getClearShowcaseGlassMaterial();
  const roofRimGeo = new THREE.BoxGeometry(bW + 0.22, 0.14, bD + 0.22);
  const roofRim = new THREE.Mesh(roofRimGeo, woodTrimMat);
  roofRim.position.y = bH + 0.07;
  roofRim.castShadow = true;
  bGroup.add(roofRim);

  const mansardGeo = new THREE.CylinderGeometry(0.76, 1.0, 0.58, 4, 1);
  mansardGeo.rotateY(Math.PI / 4);
  const mansard = new THREE.Mesh(mansardGeo, awningMat);
  mansard.scale.set((bW + 0.12) / Math.SQRT2, 1.0, (bD + 0.12) / Math.SQRT2);
  mansard.position.y = bH + 0.14 + 0.29;
  mansard.castShadow = true;
  bGroup.add(mansard);

  const copperCap = new THREE.Mesh(new THREE.BoxGeometry((bW + 0.12) * 0.77, 0.06, (bD + 0.12) * 0.77), woodTrimMat);
  copperCap.position.y = bH + 0.74;
  bGroup.add(copperCap);

  const roofRail = buildPerimeterRailing((bW + 0.12) * 0.72, (bD + 0.12) * 0.72, 0.36, darkMetalMat, 1.2);
  roofRail.position.set(0, bH + 0.77, 0);
  bGroup.add(roofRail);

  // 360° Side & Rear Windows
  addWrapAroundWindows({
    targetGroup: bGroup,
    bW,
    bD,
    floorHeights: [1.35, 3.4],
    winW: 0.85,
    winH: 0.85,
    sideCols: 2,
    backCols: 3,
    glassMat,
    frameMat: woodTrimMat,
  });

  // Projecting Illuminated Vertical Blade Sign (袖看板) on Right Front Corner with Struts
  const bladeTex = createBladeSignTexture();
  const bladeMat = new THREE.MeshStandardMaterial({
    map: bladeTex,
    emissive: 0xffffff,
    emissiveMap: bladeTex,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const bladeBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.52), [
    bladeMat, bladeMat, woodTrimMat, woodTrimMat, woodTrimMat, woodTrimMat,
  ]);
  bladeBox.position.set(bW / 2 + 0.22, 2.95, bD / 2 - 0.2);
  bladeBox.castShadow = true;
  bGroup.add(bladeBox);

  [2.55, 3.35].forEach((sy) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.04), darkMetalMat);
    strut.position.set(bW / 2 + 0.09, sy, bD / 2 - 0.2);
    bGroup.add(strut);
  });

  // 3. STOREFRONT STRIPED FABRIC AWNING (Forest Green & Cream) + Wrought-Iron Brackets
  const awningW = 3.4;
  const awningD = 1.1;
  const awningGroup = new THREE.Group();
  awningGroup.position.set(-0.35, 2.5, bD / 2 + 0.05);

  const awningGeo = new THREE.BoxGeometry(awningW, 0.08, awningD);
  const awningMesh = new THREE.Mesh(awningGeo, awningMat);
  awningMesh.rotation.x = 0.25;
  awningMesh.position.set(0, 0, awningD / 2);
  awningMesh.castShadow = true;
  awningGroup.add(awningMesh);

  const numStripes = 7;
  const stripeW = awningW / (numStripes * 2);
  for (let s = 0; s < numStripes; s++) {
    const sGeo = new THREE.BoxGeometry(stripeW, 0.085, awningD + 0.02);
    const sMesh = new THREE.Mesh(sGeo, awningStripeMat);
    sMesh.rotation.x = 0.25;
    sMesh.position.set(-awningW / 2 + stripeW + s * (stripeW * 2), 0.005, awningD / 2);
    awningGroup.add(sMesh);
  }

  const valanceGeo = new THREE.BoxGeometry(awningW, 0.14, 0.04);
  const valance = new THREE.Mesh(valanceGeo, awningMat);
  valance.position.set(0, -awningD * Math.sin(0.25) / 2 - 0.02, awningD * Math.cos(0.25) + 0.02);
  awningGroup.add(valance);

  [-awningW / 2 + 0.15, awningW / 2 - 0.15].forEach((bx) => {
    const bracketArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.72), darkMetalMat);
    bracketArm.position.set(bx, -0.22, 0.34);
    bracketArm.rotation.x = -0.35;
    awningGroup.add(bracketArm);
  });

  bGroup.add(awningGroup);

  // Official Bookstore Signboard mounted cleanly on 1F–2F cornice band above awning (clear of 2F windows)
  const signTexture = createBookstoreSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signBoardGeo = new THREE.BoxGeometry(2.1, 0.42, 0.05);
  const signBoard = new THREE.Mesh(signBoardGeo, [
    woodTrimMat, woodTrimMat, woodTrimMat, woodTrimMat, signMat, woodTrimMat
  ]);
  signBoard.position.set(-0.35, 2.74, bD / 2 + 0.04);
  signBoard.castShadow = true;
  bGroup.add(signBoard);

  // Brass Gooseneck Storefront Lamps with curved arms above Signboard
  [-0.9, 0.2].forEach((lx) => {
    const armOut = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6), brassMat);
    armOut.rotation.x = Math.PI / 2;
    armOut.position.set(lx, 3.06, bD / 2 + 0.11);
    const armDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 6), brassMat);
    armDrop.position.set(lx, 3.02, bD / 2 + 0.21);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.10, 10), brassMat);
    lampShade.position.set(lx, 2.96, bD / 2 + 0.21);
    bGroup.add(armOut, armDrop, lampShade);
  });

  // 4. DISPLAY WINDOW WITH ILLUMINATED BOOKSHELVES, WAINSCOT KICKPLATE & ENTRANCE DOOR
  const shelfTexture = createBookshelfTexture();
  const shelfMat = new THREE.MeshStandardMaterial({
    map: shelfTexture,
    emissive: 0xffffff,
    emissiveMap: shelfTexture,
    emissiveIntensity: 0.45,
    roughness: 0.7,
  });

  const wainscot = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.32, 0.06), woodTrimMat);
  wainscot.position.set(-0.95, 0.16, bD / 2 + 0.02);
  bGroup.add(wainscot);

  const winW = 2.2;
  const winH = 1.78;
  const winCenterY = 0.32 + winH / 2;
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.12, winH + 0.10, 0.04), woodTrimMat);
  winFrame.position.set(-0.95, winCenterY, bD / 2 + 0.02);
  bGroup.add(winFrame);

  const shelfPlaneGeo = new THREE.PlaneGeometry(2.08, 1.66);
  const shelfPlane = new THREE.Mesh(shelfPlaneGeo, shelfMat);
  shelfPlane.position.set(-0.95, winCenterY, bD / 2 + 0.043);
  bGroup.add(shelfPlane);

  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.015), clearGlassMat);
  winGlass.userData.skipWindowEnhance = true;
  winGlass.position.set(-0.95, winCenterY, bD / 2 + 0.054);
  bGroup.add(winGlass);

  // Stone Entrance Stoop + Entrance Door (Wood & Clear Glass) + Brass Handle
  const doorStoop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.46), foundationMat);
  doorStoop.position.set(1.25, 0.035, bD / 2 + 0.23);
  bGroup.add(doorStoop);

  const doorW = 1.05;
  const doorH = 2.15;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, doorH + 0.06, 0.05), woodTrimMat);
  doorFrame.position.set(1.25, doorH / 2 + 0.03, bD / 2 + 0.025);
  bGroup.add(doorFrame);

  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.14, 1.3, 0.02), clearGlassMat);
  doorGlass.userData.skipWindowEnhance = true;
  doorGlass.position.set(1.25, 1.3, bD / 2 + 0.052);
  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.06), brassMat);
  doorHandle.position.set(0.85, 1.05, bD / 2 + 0.07);
  bGroup.add(doorGlass, doorHandle);

  // Second Floor Windows
  for (let i = -1; i <= 1; i++) {
    const uWinW = 0.95;
    const uWinH = 0.85;
    const uWinX = i * 1.35;
    const uFrame = new THREE.Mesh(new THREE.BoxGeometry(uWinW + 0.08, uWinH + 0.08, 0.03), woodTrimMat);
    uFrame.position.set(uWinX, 3.4, bD / 2 + 0.015);
    const uGlass = new THREE.Mesh(new THREE.BoxGeometry(uWinW, uWinH, 0.02), glassMat);
    uGlass.position.set(uWinX, 3.4, bD / 2 + 0.035);
    bGroup.add(uFrame, uGlass);
  }

  group.add(bGroup);

  // 5. SIDEWALK APRON DETAILS: WHEELED WAGON BOOK CART (detail1) & REVOLVING SPINNER RACK
  // 5a. Bargain Book Wagon Cart (X = -1.6m, Z = 1.25m)
  const cartGroup = new THREE.Group();
  cartGroup.position.set(-1.6, 0.15, 1.25);

  const cartW = 0.88;
  const cartH = 0.65;
  const cartD = 0.54;

  const tableTopGeo = new THREE.BoxGeometry(cartW, 0.12, cartD);
  const tableTop = new THREE.Mesh(tableTopGeo, woodTrimMat);
  tableTop.position.y = cartH;
  tableTop.castShadow = true;
  cartGroup.add(tableTop);

  // Push Handle on left side of wagon cart
  [-cartD / 2 + 0.08, cartD / 2 - 0.08].forEach((hz) => {
    const hArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), darkMetalMat);
    hArm.rotation.z = Math.PI / 2;
    hArm.position.set(-cartW / 2 - 0.07, cartH + 0.08, hz);
    cartGroup.add(hArm);
  });
  const hGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, cartD - 0.12, 8), woodTrimMat);
  hGrip.rotation.x = Math.PI / 2;
  hGrip.position.set(-cartW / 2 - 0.15, cartH + 0.08, 0);
  cartGroup.add(hGrip);

  // 4 Legs + Spoked Wagon Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12);
  wheelGeo.rotateX(Math.PI / 2);
  [-cartW / 2 + 0.06, cartW / 2 - 0.06].forEach(lx => {
    [-cartD / 2 + 0.05, cartD / 2 - 0.05].forEach(lz => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, cartH, 8), woodTrimMat);
      leg.position.set(lx, cartH / 2, lz);
      leg.castShadow = true;
      const wheel = new THREE.Mesh(wheelGeo, darkMetalMat);
      wheel.position.set(lx, 0.11, lz + (lz > 0 ? 0.03 : -0.03));
      cartGroup.add(leg, wheel);
    });
  });

  // Stacks of discount books with cream page edges (hoisted materials)
  const bookMats = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })
  );
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bStackH = 0.09 + ((col * 3) % 4) * 0.02;
      const bx = -0.25 + col * 0.25;
      const bz = -0.1 + row * 0.2;
      const pages = new THREE.Mesh(new THREE.BoxGeometry(0.20, bStackH - 0.02, 0.16), pageMat);
      pages.position.set(bx, cartH + 0.06 + bStackH / 2, bz);
      const coverTop = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.018, 0.18), bookMats[(row * 3 + col) % bookMats.length]);
      coverTop.position.set(bx, cartH + 0.06 + bStackH, bz);
      coverTop.castShadow = true;
      cartGroup.add(pages, coverTop);
    }
  }

  // "SALE ¥100" Sign Post on Wagon Cart
  const salePole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), darkMetalMat);
  salePole.position.set(0, cartH + 0.22, -0.18);
  const saleSignMat = new THREE.MeshStandardMaterial({ map: createSalePlacardTexture(), roughness: 0.4 });
  const saleSign = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.02), [
    woodTrimMat, woodTrimMat, woodTrimMat, woodTrimMat, saleSignMat, saleSignMat,
  ]);
  saleSign.position.set(0, cartH + 0.42, -0.18);
  cartGroup.add(salePole, saleSign);

  group.add(cartGroup);

  // 5b. Revolving Paperback & Manga Wire Spinner Rack (X = +0.42m, Z = 1.22m)
  const spinnerGroup = new THREE.Group();
  spinnerGroup.position.set(0.42, 0.15, 1.22);

  const spinBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.04, 12), darkMetalMat);
  spinBase.position.y = 0.02;
  const spinPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.25, 8), darkMetalMat);
  spinPole.position.y = 0.625;
  spinnerGroup.add(spinBase, spinPole);

  const wirePocketGeo = new THREE.BoxGeometry(0.30, 0.03, 0.30);
  const coverBookGeo = new THREE.BoxGeometry(0.14, 0.20, 0.025);
  [0.35, 0.68, 1.0].forEach((ty, tIdx) => {
    const tierGrp = new THREE.Group();
    tierGrp.position.y = ty;
    tierGrp.rotation.y = tIdx * 0.45;
    const tray = new THREE.Mesh(wirePocketGeo, darkMetalMat);
    tray.position.y = -0.11;
    tierGrp.add(tray);
    for (let f = 0; f < 4; f++) {
      const ang = (f * Math.PI) / 2;
      const book = new THREE.Mesh(coverBookGeo, bookMats[(tIdx * 2 + f) % bookMats.length]);
      book.position.set(Math.sin(ang) * 0.12, 0, Math.cos(ang) * 0.12);
      book.rotation.y = ang;
      book.castShadow = true;
      tierGrp.add(book);
    }
    spinnerGroup.add(tierGrp);
  });
  group.add(spinnerGroup);

  // 6. BACKYARD PERIMETER & LANDSCAPING
  if (includeLandscaping) {
    const wallH = 1.2;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(lotWidth, wallH, 0.08), woodTrimMat);
    backWall.position.set(0, 0.15 + wallH / 2, -2.85);
    backWall.receiveShadow = true;
    group.add(backWall);

    const treeGroup = new THREE.Group();
    treeGroup.position.set(2.0, 0.15, -2.0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 8), trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    for (let i = 0; i < 3; i++) {
      const r = 0.95 * (1 - i * 0.2);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.3, 8), foliageMat);
      cone.position.y = 1.3 + i * 0.8;
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
