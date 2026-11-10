import * as THREE from 'three';
import {
  getStuccoWallTexture,
  getBrickTileTexture,
  addWrapAroundWindows,
} from './wallTextures';

let cachedRestaurantSignTex: THREE.CanvasTexture | null = null;
let cachedMenuBoardTex: THREE.CanvasTexture | null = null;
let cachedBistroInteriorTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Restaurant storefront sign (レストラン / RESTAURANT)
 */
function createRestaurantSignTexture(): THREE.CanvasTexture {
  if (cachedRestaurantSignTex) return cachedRestaurantSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(cx - 24, cy - 24);
  ctx.lineTo(cx + 24, cy + 24);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + 24, cy - 24);
  ctx.lineTo(cx - 24, cy + 24);
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.ellipse(cx + 22, cy - 22, 10, 14, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fde047';
  ctx.fillRect(cx - 26, cy - 26, 8, 8);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText('RESTAURANT', 120, 48);

  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fed7aa';
  ctx.fillText('洋食レストラン・カフェ', 122, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedRestaurantSignTex = texture;
  return texture;
}

/**
 * Procedural texture for warm illuminated bistro dining room seen through window
 */
function createBistroInteriorTexture(): THREE.CanvasTexture {
  if (cachedBistroInteriorTex) return cachedBistroInteriorTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, 0, 256, 256);

  // Warm pendant lamps hanging from ceiling
  [64, 192].forEach((lx) => {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, 58);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(lx, 68, 22, Math.PI, 0);
    ctx.fill();

    // Table with white tablecloth below
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lx - 38, 175, 76, 18);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(lx - 6, 152, 12, 23);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedBistroInteriorTex = texture;
  return texture;
}

/**
 * Procedural texture for Blackboard Easel Menu Stand (A-frame sign)
 */
function createMenuBoardTexture(): THREE.CanvasTexture {
  if (cachedMenuBoardTex) return cachedMenuBoardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 192, 256);

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 184, 248);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText("TODAY'S LUNCH", 96, 36);

  ctx.font = 'bold 13px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('本日のおすすめ', 96, 58);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 76);
  ctx.lineTo(168, 76);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 14px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('・パスタランチ', 24, 105);
  ctx.fillText('・カレーライス', 24, 140);
  ctx.fillText('・ハンバーグ', 24, 175);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f97316';
  ctx.fillText('¥950', 168, 105);
  ctx.fillText('¥850', 168, 140);
  ctx.fillText('¥1,100', 168, 175);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('☕ Drink Set +¥200', 96, 218);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedMenuBoardTex = texture;
  return texture;
}

export interface RestaurantOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic, low-poly 3D Family Restaurant / Cafe matching hwg5_u19_10
 * Standard 6.0m × 6.0m Lot (1U) within strict 6.0m height envelope
 */
export function buildRestaurantMesh(options: RestaurantOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Restaurant_hwg5_u19_10';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    map: getStuccoWallTexture(),
    roughness: 0.75,
  });

  const brickMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    map: getBrickTileTexture(),
    roughness: 0.8,
  });

  const roofTerracottaMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.6,
  });

  const woodTrimMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.6,
  });

  const awningOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.65,
  });

  const awningCreamMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.65,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
  });

  const warmLampMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.15,
    roughness: 0.25,
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

  // 2. MAIN 2-STORY RESTAURANT BUILDING
  const bGroup = new THREE.Group();
  bGroup.position.set(0.1, 0.15, -0.6);

  const bW = 4.6;
  const bD = 3.2;
  const bEavesH = 3.6;
  const bPeakH = 1.2;

  const bBase = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.06, 0.18, bD + 0.06), foundationMat);
  bBase.position.y = 0.09;
  bBase.receiveShadow = true;
  bGroup.add(bBase);

  const bBody = new THREE.Mesh(new THREE.BoxGeometry(bW, bEavesH - 0.18, bD), wallMat);
  bBody.position.y = (bEavesH + 0.18) / 2;
  bBody.castShadow = true;
  bBody.receiveShadow = true;
  bGroup.add(bBody);

  // Brick Wainscoting Base Course along front & sides
  const brickBase = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.04, 0.55, bD + 0.04), brickMat);
  brickBase.position.y = 0.42;
  bGroup.add(brickBase);

  // 360° Side & Rear Framed Bistro Windows
  addWrapAroundWindows({
    targetGroup: bGroup,
    bW,
    bD,
    floorHeights: [1.35, 2.85],
    winW: 0.85,
    winH: 0.85,
    sideCols: 2,
    backCols: 3,
    glassMat,
    frameMat: woodTrimMat,
  });

  // Triangular Front Gable Roof Peak
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-bW / 2, 0);
  gableShape.lineTo(0, bPeakH);
  gableShape.lineTo(bW / 2, 0);
  gableShape.closePath();

  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: bD, bevelEnabled: false });
  gableGeo.translate(0, bEavesH, -bD / 2);
  const gableWall = new THREE.Mesh(gableGeo, wallMat);
  gableWall.castShadow = true;
  bGroup.add(gableWall);

  const roofOverhang = 0.25;
  const slopeHyp = Math.sqrt(Math.pow(bW / 2 + roofOverhang, 2) + Math.pow(bPeakH + 0.05, 2));
  const roofAngle = Math.atan2(bPeakH, bW / 2);
  const roofPlaneGeo = new THREE.BoxGeometry(slopeHyp, 0.1, bD + roofOverhang * 2);

  const leftSlope = new THREE.Mesh(roofPlaneGeo, roofTerracottaMat);
  leftSlope.position.set(-(bW / 4 + roofOverhang / 2), bEavesH + bPeakH / 2 + 0.02, 0);
  leftSlope.rotation.z = roofAngle;
  leftSlope.castShadow = true;
  bGroup.add(leftSlope);

  const rightSlope = new THREE.Mesh(roofPlaneGeo, roofTerracottaMat);
  rightSlope.position.set(bW / 4 + roofOverhang / 2, bEavesH + bPeakH / 2 + 0.02, 0);
  rightSlope.rotation.z = -roofAngle;
  rightSlope.castShadow = true;
  bGroup.add(rightSlope);

  const ridgeBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.1, bD + roofOverhang * 2 + 0.04),
    woodTrimMat
  );
  ridgeBeam.position.set(0, bEavesH + bPeakH + 0.06, 0);
  bGroup.add(ridgeBeam);

  // Brick Chimney Stack on Left Roof Slope (<= 5.45m)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.35, 0.48), brickMat);
  chimney.position.set(-1.35, bEavesH + 0.85, -0.65);
  chimney.castShadow = true;
  bGroup.add(chimney);

  // 3. WARM BISTRO FABRIC AWNING
  const awningW = 3.2;
  const awningD = 1.05;
  const awningGroup = new THREE.Group();
  awningGroup.position.set(-0.5, 2.35, bD / 2 + 0.05);

  const awningMesh = new THREE.Mesh(new THREE.BoxGeometry(awningW, 0.08, awningD), awningOrangeMat);
  awningMesh.rotation.x = 0.25;
  awningMesh.position.set(0, 0, awningD / 2);
  awningMesh.castShadow = true;
  awningGroup.add(awningMesh);

  const numStripes = 6;
  const stripeW = awningW / (numStripes * 2);
  for (let s = 0; s < numStripes; s++) {
    const sMesh = new THREE.Mesh(new THREE.BoxGeometry(stripeW, 0.085, awningD + 0.02), awningCreamMat);
    sMesh.rotation.x = 0.25;
    sMesh.position.set(-awningW / 2 + stripeW + s * (stripeW * 2), 0.005, awningD / 2);
    awningGroup.add(sMesh);
  }

  const valance = new THREE.Mesh(new THREE.BoxGeometry(awningW, 0.14, 0.04), awningOrangeMat);
  valance.position.set(0, -awningD * Math.sin(0.25) / 2 - 0.02, awningD * Math.cos(0.25) + 0.02);
  awningGroup.add(valance);

  bGroup.add(awningGroup);

  // Official Restaurant Signboard on facade
  const signTexture = createRestaurantSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.05), [
    woodTrimMat, woodTrimMat, woodTrimMat, woodTrimMat, signMat, woodTrimMat
  ]);
  signBoard.position.set(-0.5, 3.1, bD / 2 + 0.04);
  signBoard.castShadow = true;
  bGroup.add(signBoard);

  // 4. ILLUMINATED DINING WINDOW, ENTRANCE DOOR & COACH LANTERNS
  const interiorTex = createBistroInteriorTexture();
  const interiorMat = new THREE.MeshStandardMaterial({
    map: interiorTex,
    emissive: 0xffffff,
    emissiveMap: interiorTex,
    emissiveIntensity: 0.5,
    roughness: 0.6,
  });

  const winW = 2.0;
  const winH = 1.65;
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.12, winH + 0.12, 0.04), woodTrimMat);
  winFrame.position.set(-1.0, winH / 2 + 0.35, bD / 2 + 0.02);
  bGroup.add(winFrame);

  const interiorPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.55), interiorMat);
  interiorPlane.position.set(-1.0, winH / 2 + 0.35, bD / 2 + 0.043);
  bGroup.add(interiorPlane);

  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.015), glassMat);
  winGlass.userData.skipWindowEnhance = true;
  winGlass.position.set(-1.0, winH / 2 + 0.35, bD / 2 + 0.054);
  bGroup.add(winGlass);

  // Entrance Door (Right side) + Twin Glowing Coach Lanterns
  const doorW = 1.05;
  const doorH = 2.15;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, doorH + 0.06, 0.04), woodTrimMat);
  doorFrame.position.set(1.25, doorH / 2 + 0.03, bD / 2 + 0.02);
  bGroup.add(doorFrame);

  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.04), woodTrimMat);
  doorLeaf.position.set(1.25, doorH / 2 + 0.03, bD / 2 + 0.035);
  bGroup.add(doorLeaf);

  const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 20), glassMat);
  porthole.rotateX(Math.PI / 2);
  porthole.position.set(1.25, 1.45, bD / 2 + 0.055);
  bGroup.add(porthole);

  [0.62, 1.88].forEach((lx) => {
    const coachLamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), warmLampMat);
    coachLamp.position.set(lx, 1.75, bD / 2 + 0.08);
    bGroup.add(coachLamp);
  });

  // Upper Gable Window (Round attic arch window)
  const atticWin = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24), glassMat);
  atticWin.rotateX(Math.PI / 2);
  atticWin.position.set(0, 4.05, bD / 2 + 0.02);
  bGroup.add(atticWin);

  const atticFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 24), woodTrimMat);
  atticFrame.rotateX(Math.PI / 2);
  atticFrame.position.set(0, 4.05, bD / 2 + 0.015);
  bGroup.add(atticFrame);

  group.add(bGroup);

  // 5. STOREFRONT APRON DETAILS: FOOD SAMPLE VITRINE (detail1), MENU EASEL (detail2) & PATIO TABLE
  // 5a. Blackboard A-Frame Menu Stand (detail2 at X = 0.45m, Z = 1.25m)
  const menuGroup = new THREE.Group();
  menuGroup.position.set(0.45, 0.15, 1.25);

  const menuTexture = createMenuBoardTexture();
  const menuMat = new THREE.MeshStandardMaterial({
    map: menuTexture,
    roughness: 0.6,
  });

  const boardW = 0.44;
  const boardH = 0.62;
  const boardGeo = new THREE.BoxGeometry(boardW, boardH, 0.03);

  const frontBoard = new THREE.Mesh(boardGeo, [
    woodTrimMat, woodTrimMat, woodTrimMat, woodTrimMat, menuMat, woodTrimMat
  ]);
  frontBoard.position.set(0, boardH / 2 + 0.08, 0.06);
  frontBoard.rotation.x = -0.25;
  frontBoard.castShadow = true;
  menuGroup.add(frontBoard);

  const backLeg = new THREE.Mesh(new THREE.BoxGeometry(boardW - 0.04, boardH, 0.02), woodTrimMat);
  backLeg.position.set(0, boardH / 2 + 0.08, -0.06);
  backLeg.rotation.x = 0.25;
  menuGroup.add(backLeg);

  group.add(menuGroup);

  // 5b. Japanese Food Sample Showcase Cabinet (detail1 at X = -1.6m, Z = 1.25m)
  const sampleGroup = new THREE.Group();
  sampleGroup.position.set(-1.6, 0.15, 1.25);

  const sTableGeo = new THREE.BoxGeometry(0.76, 0.62, 0.48);
  const sTable = new THREE.Mesh(sTableGeo, woodTrimMat);
  sTable.position.y = 0.31;
  sTable.castShadow = true;
  sampleGroup.add(sTable);

  const caseGeo = new THREE.BoxGeometry(0.72, 0.48, 0.44);
  const caseGlass = new THREE.Mesh(caseGeo, glassMat);
  caseGlass.position.y = 0.62 + 0.24;
  sampleGroup.add(caseGlass);

  const caseCap = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.48), woodTrimMat);
  caseCap.position.y = 1.12;
  sampleGroup.add(caseCap);

  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const foodPastaMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.6 });
  const foodCurryMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 });
  const melonSodaMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2 });

  // Dish 1: Spaghetti Napolitan
  const plate1 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.02, 12), plateMat);
  plate1.position.set(-0.20, 0.64, 0);
  const food1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), foodPastaMat);
  food1.position.set(-0.20, 0.68, 0);
  sampleGroup.add(plate1, food1);

  // Dish 2: Japanese Curry Rice
  const plate2 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.02, 12), plateMat);
  plate2.position.set(0.04, 0.64, 0);
  const food2 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), foodCurryMat);
  food2.position.set(0.04, 0.68, 0);
  sampleGroup.add(plate2, food2);

  // Dish 3: Melon Cream Soda with Vanilla Scoop & Cherry
  const sodaGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.14, 10), melonSodaMat);
  sodaGlass.position.set(0.24, 0.70, 0);
  const iceCream = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), plateMat);
  iceCream.position.set(0.24, 0.78, 0);
  sampleGroup.add(sodaGlass, iceCream);

  group.add(sampleGroup);

  // 6. BACKYARD PERIMETER & LANDSCAPING
  if (includeLandscaping) {
    const wallH = 1.2;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(lotWidth, wallH, 0.08), woodTrimMat);
    backWall.position.set(0, 0.15 + wallH / 2, -2.85);
    backWall.receiveShadow = true;
    group.add(backWall);

    const treeGroup = new THREE.Group();
    treeGroup.position.set(2.0, 0.15, -2.0);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 8), woodTrimMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const r = 0.75 * (1 - i * 0.18);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 1.2, 8), foliageMat);
      cone.position.y = 1.2 + i * 0.75;
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
