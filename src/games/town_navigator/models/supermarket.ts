import * as THREE from 'three';
import {
  getHorizontalSidingTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedSupermarketSignTex: THREE.CanvasTexture | null = null;
let cachedProduceTex: THREE.CanvasTexture | null = null;
let cachedGroceryInteriorTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Supermarket Main Header Sign
 */
function createSupermarketSignTexture(): THREE.CanvasTexture {
  if (cachedSupermarketSignTex) return cachedSupermarketSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ea580c';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy - 14, 4, 8, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px sans-serif';
  ctx.fillText('SUPERMARKET', 120, 48);

  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fed7aa';
  ctx.fillText('スーパーマーケット (FRESH MARKET)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedSupermarketSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Illuminated Supermarket Interior Aisles & SALE Banners
 */
function createGroceryInteriorTexture(): THREE.CanvasTexture {
  if (cachedGroceryInteriorTex) return cachedGroceryInteriorTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fefce8';
  ctx.fillRect(0, 0, 512, 256);

  // Hanging red & yellow "SALE / 大特売" ceiling banners
  [80, 200, 320, 430].forEach((bx, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#ef4444' : '#facc15';
    ctx.fillRect(bx - 32, 12, 64, 42);
    ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#dc2626';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(idx % 2 === 0 ? 'SALE' : '大特売', bx, 38);
  });

  // Colorful Grocery Display Gondolas
  const colors = ['#22c55e', '#f97316', '#ef4444', '#eab308', '#3b82f6'];
  [125, 185, 240].forEach((sy, rIdx) => {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(16, sy, 480, 8);
    for (let c = 0; c < 12; c++) {
      ctx.fillStyle = colors[(c + rIdx) % colors.length];
      ctx.fillRect(24 + c * 39, sy - 28, 30, 28);
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedGroceryInteriorTex = texture;
  return texture;
}

/**
 * Procedural texture for Fresh Market Produce Crates
 */
function createProduceTexture(): THREE.CanvasTexture {
  if (cachedProduceTex) return cachedProduceTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FRESH MARKET', 128, 45);

  ctx.font = 'bold 16px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#86efac';
  ctx.fillText('新鮮野菜・くだもの ¥100', 128, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedProduceTex = texture;
  return texture;
}

export interface SupermarketOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Supermarket (hwg5_u19_12)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildSupermarketMesh(options: SupermarketOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Supermarket_hwg5_u19_12';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    map: getHorizontalSidingTexture(),
    roughness: 0.55,
  });
  const orangeTrimMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45 });
  const greenBandMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.45 });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
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

  // 2. MAIN STORE BUILDING (Footprint: 10.4m wide, 6.6m deep, 6.2m roof)
  const marketGroup = new THREE.Group();
  marketGroup.position.set(0, 0.15, -0.6);

  const bW = 10.4;
  const bD = 6.6;
  const bH = 6.2;

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), wallMat);
  bodyMesh.position.y = bH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  marketGroup.add(bodyMesh);

  // Orange & Green Parapet Fascia Header Band
  const fasciaOrange = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.16, 0.48, bD + 0.16), orangeTrimMat);
  fasciaOrange.position.y = bH - 0.24;
  const fasciaGreen = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.16, 0.26, bD + 0.16), greenBandMat);
  fasciaGreen.position.y = bH + 0.13;
  marketGroup.add(fasciaOrange, fasciaGreen);

  // Open Rooftop Safety Railing
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.55, chromeMat, 1.8);
  roofRail.position.set(0, bH + 0.26, 0);
  marketGroup.add(roofRail);

  // 360° Side & Rear Clerestory Windows
  addWrapAroundWindows({
    targetGroup: marketGroup,
    bW,
    bD,
    floorHeights: [4.2],
    winW: 1.35,
    winH: 0.85,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: orangeTrimMat,
  });

  // Illuminated Interior Grocery Aisles & Sale Banners behind Glass
  const interiorTex = createGroceryInteriorTexture();
  const interiorMat = new THREE.MeshStandardMaterial({
    map: interiorTex,
    emissive: 0xffffff,
    emissiveMap: interiorTex,
    emissiveIntensity: 0.55,
    roughness: 0.5,
  });
  const interiorBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(bW - 0.8, 3.0), interiorMat);
  interiorBackdrop.position.set(0, 1.6, bD / 2 - 0.12);
  marketGroup.add(interiorBackdrop);

  // Full-Width Glass Storefront & Green Entrance Canopy Overhang
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(bW - 0.4, 3.2, 0.06), glassMat);
  frontGlass.position.set(0, 1.6, bD / 2 + 0.03);
  const frontCanopy = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.18, 1.25), greenBandMat);
  frontCanopy.position.set(0, 3.35, bD / 2 + 0.6);
  frontCanopy.castShadow = true;
  marketGroup.add(frontGlass, frontCanopy);

  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.5, 0.1), darkMetalMat);
  doors.position.set(0, 1.25, bD / 2 + 0.06);
  marketGroup.add(doors);

  // Prominent "SUPERMARKET" Header Signboard
  const signTexture = createSupermarketSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.4,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.95, 0.15), [
    orangeTrimMat, orangeTrimMat, orangeTrimMat, orangeTrimMat, signMat, orangeTrimMat
  ]);
  signMesh.position.set(0, 5.1, bD / 2 + 0.15);
  marketGroup.add(signMesh);

  // 3. ROOFTOP BILLBOARD PYLON TOWER (detail1 at X = 3.2m, Y = 8.5m, Z = 0.5m)
  const towerGroup = new THREE.Group();
  towerGroup.position.set(3.2, bH + 0.26, 0.5);

  const pylonLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.8, 8), darkMetalMat);
  pylonLeg1.position.set(-1.2, 1.9, 0);
  const pylonLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.8, 8), darkMetalMat);
  pylonLeg2.position.set(1.2, 1.9, 0);
  towerGroup.add(pylonLeg1, pylonLeg2);

  const bBoard = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 0.22), [
    orangeTrimMat, orangeTrimMat, orangeTrimMat, orangeTrimMat, signMat, signMat
  ]);
  bBoard.position.set(0, 2.8, 0);
  bBoard.castShadow = true;
  towerGroup.add(bBoard);
  marketGroup.add(towerGroup);

  group.add(marketGroup);

  // 4. FORECOURT PROPS (detail2: Cart Bay & Fresh Produce Crates grouped at X = -3.8m..-2.0m, Z = 3.2m)
  // 4a. Shopping Cart Corral Bay (X = -3.9m, Z = 3.2m)
  const cartBay = new THREE.Group();
  cartBay.position.set(-3.9, 0.15, 3.2);

  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 1.8), chromeMat);
  railL.position.set(-0.65, 0.42, 0);
  const railR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 1.8), chromeMat);
  railR.position.set(0.65, 0.42, 0);
  const cartCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 1.9), greenBandMat);
  cartCanopy.position.set(0, 1.65, 0);
  cartBay.add(railL, railR, cartCanopy);

  for (let c = 0; c < 4; c++) {
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.42), chromeMat);
    cart.position.set(0, 0.45, -0.5 + c * 0.35);
    cartBay.add(cart);
  }
  group.add(cartBay);

  // 4b. Fresh Produce Display Crates with 3D Apples, Oranges & Cabbages (X = -2.2m, Z = 3.1m)
  const produceGroup = new THREE.Group();
  produceGroup.position.set(-2.2, 0.15, 3.1);

  const prodTexture = createProduceTexture();
  const prodMat = new THREE.MeshStandardMaterial({ map: prodTexture, roughness: 0.6 });
  const standMesh = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.72, 0.72), prodMat);
  standMesh.position.y = 0.36;
  standMesh.castShadow = true;
  produceGroup.add(standMesh);

  // 3 Wooden Produce Crates on top overflowing with 3D fruit & veggies
  const fruitColors = [0xef4444, 0xf97316, 0x22c55e]; // Red apples, oranges, green cabbages
  [-0.48, 0.0, 0.48].forEach((cx, idx) => {
    const fMat = new THREE.MeshStandardMaterial({ color: fruitColors[idx], roughness: 0.4 });
    for (let fx = -0.12; fx <= 0.12; fx += 0.12) {
      for (let fz = -0.12; fz <= 0.12; fz += 0.12) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), fMat);
        fruit.position.set(cx + fx, 0.78, fz);
        produceGroup.add(fruit);
      }
    }
  });
  group.add(produceGroup);

  // 5. RIGHT FORECOURT: GASHAPON MACHINES & SOFT-SERVE ICE CREAM STAND
  const gashaGroup = new THREE.Group();
  gashaGroup.position.set(2.4, 0.15, 3.4);

  const gashaColors = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981];
  gashaColors.forEach((color, idx) => {
    const unitGroup = new THREE.Group();
    unitGroup.position.set((idx - 1.5) * 0.36, 0, 0);

    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    baseMesh.position.y = 0.225;
    const globeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), glassMat);
    globeMesh.position.y = 0.625;
    const cap1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0xec4899 }));
    cap1.position.set(-0.06, 0.55, 0.04);
    const cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: 0x38bdf8 }));
    cap2.position.set(0.06, 0.58, -0.04);
    const dialMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8), darkMetalMat);
    dialMesh.rotation.x = Math.PI / 2;
    dialMesh.position.set(0, 0.32, 0.17);

    unitGroup.add(baseMesh, globeMesh, cap1, cap2, dialMesh);
    gashaGroup.add(unitGroup);
  });
  group.add(gashaGroup);

  // Swirled Soft-Serve Ice Cream Stand (X = 3.9m, Z = 3.6m)
  const iceCreamGroup = new THREE.Group();
  iceCreamGroup.position.set(3.9, 0.15, 3.6);

  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 12), darkMetalMat);
  standBase.position.y = 0.175;
  const coneGeo = new THREE.ConeGeometry(0.14, 0.32, 12);
  coneGeo.rotateX(Math.PI);
  const coneMesh = new THREE.Mesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }));
  coneMesh.position.y = 0.5;
  const creamGeo = new THREE.SphereGeometry(0.16, 12, 10);
  creamGeo.scale(1.0, 1.4, 1.0);
  const creamMesh = new THREE.Mesh(creamGeo, new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.3 }));
  creamMesh.position.y = 0.78;

  iceCreamGroup.add(standBase, coneMesh, creamMesh);
  group.add(iceCreamGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
