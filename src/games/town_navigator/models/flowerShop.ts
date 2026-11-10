import * as THREE from 'three';
import { getHorizontalSidingTexture, addWrapAroundWindows } from './wallTextures';

let cachedFlowerShopSignTex: THREE.CanvasTexture | null = null;
let cachedFloralInteriorTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Flower Shop storefront sign (花屋 / FLOWER SHOP)
 */
function createFlowerShopSignTexture(): THREE.CanvasTexture {
  if (cachedFlowerShopSignTex) return cachedFlowerShopSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#166534';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  const numPetals = 6;
  const petalR = 15;
  const orbitR = 16;
  ctx.fillStyle = '#f472b6';
  for (let i = 0; i < numPetals; i++) {
    const angle = (i * Math.PI * 2) / numPetals;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * orbitR, cy + Math.sin(angle) * orbitR, petalR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('FLOWER SHOP', 120, 48);

  ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#bbf7d0';
  ctx.fillText('花屋・フラワーショップ', 122, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedFlowerShopSignTex = texture;
  return texture;
}

/**
 * Procedural texture for illuminated interior floral bouquet display behind glass
 */
function createFloralInteriorTexture(): THREE.CanvasTexture {
  if (cachedFloralInteriorTex) return cachedFloralInteriorTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fdf2f8';
  ctx.fillRect(0, 0, 256, 256);

  // Wooden display tables & pastel floral bouquets inside shop
  const colors = ['#ec4899', '#facc15', '#a855f7', '#ef4444', '#38bdf8'];
  [90, 175, 240].forEach((shelfY, rIdx) => {
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(12, shelfY, 232, 10);

    for (let c = 0; c < 5; c++) {
      const bx = 36 + c * 46;
      // Greenery
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(bx, shelfY - 22, 18, 0, Math.PI * 2);
      ctx.fill();
      // Blossoms
      ctx.fillStyle = colors[(c + rIdx) % colors.length];
      ctx.beginPath();
      ctx.arc(bx - 6, shelfY - 28, 9, 0, Math.PI * 2);
      ctx.arc(bx + 7, shelfY - 25, 9, 0, Math.PI * 2);
      ctx.fill();
      // Terracotta vase
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(bx - 8, shelfY - 12, 16, 12);
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedFloralInteriorTex = texture;
  return texture;
}

export interface FlowerShopOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic, low-poly 3D Flower Shop matching textbook card hwg5_u19_11
 * Standard 6.0m × 6.0m Lot (1U) within strict 6.0m height envelope
 */
export function buildFlowerShopMesh(options: FlowerShopOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'FlowerShop_hwg5_u19_11';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xfdf4ff,
    map: getHorizontalSidingTexture(),
    roughness: 0.75,
  });

  const woodTrimMat = new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.6,
  });

  const awningPinkMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    roughness: 0.65,
  });

  const awningWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
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

  const potTerracottaMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.7,
  });

  const zincBucketMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.6,
  });

  // Flower colors
  const petalRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  const petalYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const petalPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
  const petalPurpleMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.5 });
  const stemGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });

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

  // 2. MAIN STORE BUILDING
  const bGroup = new THREE.Group();
  bGroup.position.set(0.1, 0.15, -0.6);

  const bW = 4.5;
  const bD = 3.2;
  const bH = 4.2;

  const bBase = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.06, 0.18, bD + 0.06), foundationMat);
  bBase.position.y = 0.09;
  bBase.receiveShadow = true;
  bGroup.add(bBase);

  const bBody = new THREE.Mesh(new THREE.BoxGeometry(bW, bH - 0.18, bD), wallMat);
  bBody.position.y = (bH + 0.18) / 2;
  bBody.castShadow = true;
  bBody.receiveShadow = true;
  bGroup.add(bBody);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.14, 0.32, bD + 0.14), woodTrimMat);
  parapet.position.y = bH + 0.16;
  parapet.castShadow = true;
  bGroup.add(parapet);

  // Rooftop Glass Greenhouse Conservatory Skylight (<= 5.4m)
  const skylightGeo = new THREE.CylinderGeometry(1.1 * Math.SQRT1_2, 1.8 * Math.SQRT1_2, 0.75, 4);
  skylightGeo.rotateY(Math.PI / 4);
  const skylight = new THREE.Mesh(skylightGeo, glassMat);
  skylight.scale.set(1.3, 1.0, 0.85);
  skylight.position.set(-0.4, bH + 0.32 + 0.375, 0);
  bGroup.add(skylight);

  // 360° Side & Rear Framed Windows
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

  // 3. STOREFRONT STRIPED PINK & WHITE FABRIC AWNING
  const awningW = 3.5;
  const awningD = 1.1;
  const awningGroup = new THREE.Group();
  awningGroup.position.set(-0.35, 2.5, bD / 2 + 0.05);

  const awningMesh = new THREE.Mesh(new THREE.BoxGeometry(awningW, 0.08, awningD), awningPinkMat);
  awningMesh.rotation.x = 0.25;
  awningMesh.position.set(0, 0, awningD / 2);
  awningMesh.castShadow = true;
  awningGroup.add(awningMesh);

  const numStripes = 7;
  const stripeW = awningW / (numStripes * 2);
  for (let s = 0; s < numStripes; s++) {
    const sMesh = new THREE.Mesh(new THREE.BoxGeometry(stripeW, 0.085, awningD + 0.02), awningWhiteMat);
    sMesh.rotation.x = 0.25;
    sMesh.position.set(-awningW / 2 + stripeW + s * (stripeW * 2), 0.005, awningD / 2);
    awningGroup.add(sMesh);
  }

  const valance = new THREE.Mesh(new THREE.BoxGeometry(awningW, 0.14, 0.04), awningPinkMat);
  valance.position.set(0, -awningD * Math.sin(0.25) / 2 - 0.02, awningD * Math.cos(0.25) + 0.02);
  awningGroup.add(valance);

  bGroup.add(awningGroup);

  // Official Flower Shop Signboard mounted on facade
  const signTexture = createFlowerShopSignTexture();
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
  signBoard.position.set(-0.35, 3.25, bD / 2 + 0.04);
  signBoard.castShadow = true;
  bGroup.add(signBoard);

  // 4. LARGE SHOWCASE DISPLAY WINDOW, ILLUMINATED INTERIOR & FLORAL DOOR ARCH
  const floralInteriorTex = createFloralInteriorTexture();
  const floralInteriorMat = new THREE.MeshStandardMaterial({
    map: floralInteriorTex,
    emissive: 0xffffff,
    emissiveMap: floralInteriorTex,
    emissiveIntensity: 0.45,
    roughness: 0.6,
  });

  const winW = 2.2;
  const winH = 1.95;
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.12, winH + 0.12, 0.04), woodTrimMat);
  winFrame.position.set(-0.95, winH / 2 + 0.15, bD / 2 + 0.02);
  bGroup.add(winFrame);

  const interiorPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.08, 1.82), floralInteriorMat);
  interiorPlane.position.set(-0.95, winH / 2 + 0.15, bD / 2 + 0.043);
  bGroup.add(interiorPlane);

  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.015), glassMat);
  winGlass.userData.skipWindowEnhance = true;
  winGlass.position.set(-0.95, winH / 2 + 0.15, bD / 2 + 0.054);
  bGroup.add(winGlass);

  // Entrance Door + Rose-Draped Wooden Trellis Archway (Right side: X = 1.25m)
  const doorW = 1.05;
  const doorH = 2.15;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.08, doorH + 0.06, 0.04), woodTrimMat);
  doorFrame.position.set(1.25, doorH / 2 + 0.03, bD / 2 + 0.02);
  bGroup.add(doorFrame);

  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.12, 1.4, 0.02), glassMat);
  doorGlass.userData.skipWindowEnhance = true;
  doorGlass.position.set(1.25, 1.35, bD / 2 + 0.048);
  bGroup.add(doorGlass);

  // Floral Garland Arch around Entrance Door
  [-0.56, 0.56].forEach((ax) => {
    for (let ay = 0.6; ay <= 2.1; ay += 0.5) {
      const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), stemGreenMat);
      vine.position.set(1.25 + ax, ay, bD / 2 + 0.08);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), petalPinkMat);
      bloom.position.set(1.25 + ax, ay + 0.06, bD / 2 + 0.14);
      bGroup.add(vine, bloom);
    }
  });

  // Second Floor Windows + Window Flower Planter Boxes
  const potColors = [petalRedMat, petalYellowMat, petalPinkMat, petalPurpleMat];
  for (let i = -1; i <= 1; i++) {
    const uWinW = 0.95;
    const uWinH = 0.85;
    const uWinX = i * 1.35;
    const uGlass = new THREE.Mesh(new THREE.BoxGeometry(uWinW, uWinH, 0.02), glassMat);
    uGlass.position.set(uWinX, 3.4, bD / 2 + 0.01);
    const uFrame = new THREE.Mesh(new THREE.BoxGeometry(uWinW + 0.06, uWinH + 0.06, 0.04), woodTrimMat);
    uFrame.position.set(uWinX, 3.4, bD / 2 + 0.02);

    const wPlanter = new THREE.Mesh(new THREE.BoxGeometry(uWinW, 0.14, 0.14), potTerracottaMat);
    wPlanter.position.set(uWinX, 2.92, bD / 2 + 0.08);
    const wBloom = new THREE.Mesh(new THREE.BoxGeometry(uWinW - 0.1, 0.10, 0.10), potColors[(i + 1) % potColors.length]);
    wBloom.position.set(uWinX, 3.02, bD / 2 + 0.08);
    bGroup.add(uFrame, uGlass, wPlanter, wBloom);
  }

  group.add(bGroup);

  // 5. SIDEWALK FLOWER STAND (detail1: 3-Tier Stepped Stand at X = -1.6m, Z = 1.25m)
  const standGroup = new THREE.Group();
  standGroup.position.set(-1.6, 0.15, 1.25);

  const standW = 1.1;
  const standTiers = 3;
  const tierDepth = 0.22;
  const tierRise = 0.22;

  for (let t = 0; t < standTiers; t++) {
    const stepPlank = new THREE.Mesh(
      new THREE.BoxGeometry(standW, 0.04, tierDepth),
      woodTrimMat
    );
    stepPlank.position.set(0, (t + 1) * tierRise, t * tierDepth);
    stepPlank.castShadow = true;
    standGroup.add(stepPlank);

    [-standW / 2 + 0.03, standW / 2 - 0.03].forEach(sx => {
      const riser = new THREE.Mesh(new THREE.BoxGeometry(0.04, (t + 1) * tierRise, 0.04), woodTrimMat);
      riser.position.set(sx, ((t + 1) * tierRise) / 2, t * tierDepth);
      standGroup.add(riser);
    });

    for (let p = 0; p < 3; p++) {
      const potX = -0.35 + p * 0.35;
      const potY = (t + 1) * tierRise + 0.02;
      const potZ = t * tierDepth;

      const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.12, 12), potTerracottaMat);
      potMesh.position.set(potX, potY + 0.06, potZ);
      potMesh.castShadow = true;
      standGroup.add(potMesh);

      const foliageMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), stemGreenMat);
      foliageMesh.position.set(potX, potY + 0.14, potZ);
      standGroup.add(foliageMesh);

      const flowerColor = potColors[(t * 3 + p) % potColors.length];
      for (let f = 0; f < 3; f++) {
        const blossom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), flowerColor);
        const fAngle = (f * Math.PI * 2) / 3;
        blossom.position.set(potX + Math.cos(fAngle) * 0.04, potY + 0.19, potZ + Math.sin(fAngle) * 0.04);
        blossom.castShadow = true;
        standGroup.add(blossom);
      }
    }
  }

  // Gardener's Pink Watering Can (じょうろ) beside Plant Stand
  const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.18, 10), awningPinkMat);
  canBody.position.set(0.68, 0.09, 0.18);
  const canSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.18, 6), awningPinkMat);
  canSpout.position.set(0.76, 0.14, 0.24);
  canSpout.rotation.z = -0.6;
  standGroup.add(canBody, canSpout);

  group.add(standGroup);

  // 6. TRIO OF ZINC FLOWER BUCKETS (detail2: Sunflowers, Roses & Lavender at X = +0.45m, Z = 1.25m)
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(0.45, 0.15, 1.25);

  // Center Bucket: Tall Sunflowers
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.28, 16), zincBucketMat);
  bucket.position.y = 0.14;
  bucket.castShadow = true;
  bucketGroup.add(bucket);

  for (let s = 0; s < 4; s++) {
    const sAngle = (s * Math.PI) / 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 6), stemGreenMat);
    stem.position.set(Math.cos(sAngle) * 0.04, 0.35, Math.sin(sAngle) * 0.04);
    stem.rotation.z = Math.cos(sAngle) * 0.15;
    bucketGroup.add(stem);

    const flowerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), petalYellowMat);
    flowerHead.position.set(Math.cos(sAngle) * 0.06, 0.52, Math.sin(sAngle) * 0.06);
    flowerHead.rotation.x = Math.PI / 3;
    bucketGroup.add(flowerHead);

    const centerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12), woodTrimMat);
    centerHead.position.set(Math.cos(sAngle) * 0.06, 0.525, Math.sin(sAngle) * 0.06);
    centerHead.rotation.x = Math.PI / 3;
    bucketGroup.add(centerHead);
  }

  // Side Bucket 2 (Red Roses) & Side Bucket 3 (Purple Lavender)
  [
    { dx: -0.26, dz: -0.06, mat: petalRedMat },
    { dx: 0.26, dz: -0.06, mat: petalPurpleMat },
  ].forEach(({ dx, dz, mat }) => {
    const subBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.22, 12), zincBucketMat);
    subBucket.position.set(dx, 0.11, dz);
    const bouquet = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), mat);
    bouquet.position.set(dx, 0.28, dz);
    bucketGroup.add(subBucket, bouquet);
  });

  group.add(bucketGroup);

  // 7. BACKYARD PERIMETER & LANDSCAPING
  if (includeLandscaping) {
    const wallH = 1.2;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(lotWidth, wallH, 0.08), woodTrimMat);
    backWall.position.set(0, 0.15 + wallH / 2, -2.85);
    backWall.receiveShadow = true;
    group.add(backWall);

    const bushGroup = new THREE.Group();
    bushGroup.position.set(2.0, 0.15, -2.0);

    const bushFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 1), stemGreenMat);
    bushFoliage.position.y = 0.8;
    bushFoliage.castShadow = true;
    bushGroup.add(bushFoliage);

    for (let b = 0; b < 6; b++) {
      const blossom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), petalPinkMat);
      const bAngle = (b * Math.PI * 2) / 6;
      blossom.position.set(Math.cos(bAngle) * 0.65, 0.8 + (b % 2) * 0.25, Math.sin(bAngle) * 0.65);
      bushGroup.add(blossom);
    }
    group.add(bushGroup);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
