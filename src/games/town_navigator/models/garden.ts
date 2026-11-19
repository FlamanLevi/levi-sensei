import * as THREE from 'three';
import {
  getKawaraTileTexture,
  getIshigakiStoneTexture,
  getRakedGravelTexture,
  buildJapaneseIrimoyaRoof,
} from './wallTextures';

let cachedGardenSignTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Japanese Garden Header Sign
 */
function createGardenSignTexture(): THREE.CanvasTexture {
  if (cachedGardenSignTex) return cachedGardenSignTex;
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
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx - 3, cy + 10, 6, 18);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px serif';
  ctx.fillText('JAPANESE GARDEN', 118, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText('日本庭園 / 庭 (GARDEN)', 120, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedGardenSignTex = texture;
  return texture;
}

export interface GardenOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Landscape Garden (hwg5_u19_23)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildGardenMesh(options: GardenOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Garden_hwg5_u19_23';

  // Materials
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.95 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.12,
    metalness: 0.28,
    transparent: true,
    opacity: 0.82,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    map: getIshigakiStoneTexture(),
    roughness: 0.85,
  });
  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: getKawaraTileTexture(),
    roughness: 0.5,
  });
  const woodBridgeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.25 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.45 });
  const lilyPadMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
  const lotusPinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, mossMat);
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

  // 2. KOI POND, LOTUS PADS & RED ARCHED DRUM BRIDGE (detail1 at X = 0, Z = 0.2m)
  const pondZ = 0.2;
  const darkBedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
  const pondBed = new THREE.Mesh(new THREE.CylinderGeometry(3.18, 2.98, 0.06, 24), darkBedMat);
  pondBed.scale.set(1.25, 1.0, 0.85);
  pondBed.position.set(0, 0.09, pondZ);
  group.add(pondBed);

  const pond = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.0, 0.12, 24), waterMat);
  pond.scale.set(1.25, 1.0, 0.85);
  pond.position.set(0, 0.14, pondZ);
  group.add(pond);

  // Pond River Rock Border
  for (let r = 0; r < 22; r++) {
    const angle = (r * Math.PI * 2) / 22;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat);
    const rx = Math.cos(angle) * (3.2 * 1.25);
    const rz = pondZ + Math.sin(angle) * (3.2 * 0.85);
    rock.position.set(rx, 0.22, rz);
    group.add(rock);
  }

  // Swimming Golden & Red-White Nishikigoi Fish with Tail Fins + Lotus Lily Pads
  const koiMats = [
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
  ];
  [
    { x: -1.6, z: pondZ + 0.5, mIdx: 0, rot: 0.5 },
    { x: -1.2, z: pondZ - 0.6, mIdx: 1, rot: -0.8 },
    { x: 1.5, z: pondZ + 0.4, mIdx: 2, rot: 2.1 },
    { x: 1.8, z: pondZ - 0.5, mIdx: 3, rot: -1.6 },
  ].forEach((koi) => {
    const kGroup = new THREE.Group();
    kGroup.position.set(koi.x, 0.20, koi.z);
    kGroup.rotation.y = koi.rot;
    const kBody = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.30, 6), koiMats[koi.mIdx]);
    kBody.rotation.x = Math.PI / 2;
    const kTail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.12), koiMats[koi.mIdx]);
    kTail.position.set(0, 0, -0.18);
    kGroup.add(kBody, kTail);
    group.add(kGroup);
  });

  [
    [-2.1, pondZ - 0.2],
    [2.1, pondZ + 0.2],
  ].forEach(([lx, lz]) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 12), lilyPadMat);
    pad.position.set(lx, 0.205, lz);
    const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lotusPinkMat);
    lotus.position.set(lx, 0.24, lz);
    group.add(pad, lotus);
  });

  // Red Lacquered Arched Drum Bridge (Taiko-Bashi) with Parabolic Curved Handrails & Seated Posts
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 0.15, pondZ);

  const numSteps = 9;
  for (let s = 0; s < numSteps; s++) {
    const t = (s / (numSteps - 1)) * 2 - 1;
    const by = 0.52 * (1 - t * t) + 0.12;
    const bz = t * 2.2;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.45), woodBridgeMat);
    plank.position.set(0, by, bz);
    plank.rotation.x = -t * 0.35;
    plank.castShadow = true;
    bridgeGroup.add(plank);
  }

  [-0.72, 0.72].forEach(rx => {
    const postZ = [-1.8, -0.9, 0, 0.9, 1.8];
    const postTopY = postZ.map((pz) => {
      const t = pz / 2.2;
      const deckY = 0.52 * (1 - t * t) + 0.12;
      const postH = 0.52;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, postH, 8), woodBridgeMat);
      post.position.set(rx, deckY + postH / 2, pz);
      const giboshi = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), goldMat);
      giboshi.position.set(rx, deckY + postH + 0.04, pz);
      bridgeGroup.add(post, giboshi);
      return deckY + postH;
    });
    for (let i = 0; i < postZ.length - 1; i++) {
      const dz = postZ[i + 1] - postZ[i];
      const dy = postTopY[i + 1] - postTopY[i];
      const segLen = Math.hypot(dz, dy);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, segLen), woodBridgeMat);
      seg.position.set(rx, (postTopY[i] + postTopY[i + 1]) / 2, (postZ[i] + postZ[i + 1]) / 2);
      seg.rotation.x = -Math.atan2(dy, dz);
      bridgeGroup.add(seg);
    }
  });
  group.add(bridgeGroup);

  // Tobi-ishi Stepping Stones linking Entrance, Bridge, Azumaya & Shishi-odoshi
  [
    [0, 3.15], [0, 2.65],
    [-1.4, -0.9], [-2.1, -1.3], [-2.7, -1.7],
    [1.6, 1.35], [2.0, 1.5],
  ].forEach(([sx, sz]) => {
    const stepStone = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.05, 8), stoneMat);
    stepStone.position.set(sx, 0.165, sz);
    group.add(stepStone);
  });

  // 2b. Paired Stone Tōrō Lanterns flanking the Bridge Approach (X = ±1.45m, Z = 2.7m)
  [-1.45, 1.45].forEach((tx) => {
    const toro = new THREE.Group();
    toro.position.set(tx, 0.15, 2.7);
    const tBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.42), stoneMat);
    tBase.position.y = 0.1;
    const tPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.65, 8), stoneMat);
    tPillar.position.y = 0.525;
    const tBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.28), lanternGlowMat);
    tBox.position.y = 0.97;
    const tRoof = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.22, 4), stoneMat);
    tRoof.rotateY(Math.PI / 4);
    tRoof.position.y = 1.2;
    toro.add(tBase, tPillar, tBox, tRoof);
    group.add(toro);
  });

  // 2c. Stepped Stone Waterfall Cascade on North Edge of Koi Pond (X = 0, Z = -2.2m)
  const waterfallGroup = new THREE.Group();
  waterfallGroup.position.set(0, 0.15, -2.2);
  [
    { w: 1.5, h: 1.1, d: 0.7, y: 0.55, z: -0.35 },
    { w: 1.1, h: 0.7, d: 0.6, y: 0.35, z: 0.15 },
  ].forEach((rock) => {
    const rMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(rock.w * 0.55, 0), stoneMat);
    rMesh.scale.set(1.2, rock.h / (rock.w * 0.55), rock.d / (rock.w * 0.55));
    rMesh.position.set(0, rock.y, rock.z);
    waterfallGroup.add(rMesh);
  });
  const cascade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.95, 0.12), waterMat);
  cascade.position.set(0, 0.48, 0.05);
  cascade.rotation.x = 0.22;
  waterfallGroup.add(cascade);
  group.add(waterfallGroup);

  // 3. EAST MOUND: 4-TIER STONE PAGODA LANTERN & BAMBOO SHISHI-ODOSHI (detail2 at target [3.2, 1.4, 1.5])
  // 3a. 4-Tier Carved Stone Pagoda Lantern (五重石塔・石灯籠 at X = +3.55m, Z = 1.25m)
  const pagoda = new THREE.Group();
  pagoda.position.set(3.55, 0.15, 1.25);

  const pPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.75), stoneMat);
  pPedestal.position.y = 0.175;
  const pLightBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.38), lanternGlowMat);
  pLightBox.position.y = 0.51;
  pagoda.add(pPedestal, pLightBox);

  for (let tier = 0; tier < 4; tier++) {
    const yBase = 0.75 + tier * 0.55;
    const tCore = new THREE.Mesh(new THREE.BoxGeometry(0.52 - tier * 0.08, 0.22, 0.52 - tier * 0.08), stoneMat);
    tCore.position.y = yBase;
    const tRoof = new THREE.Mesh(
      new THREE.ConeGeometry((0.82 - tier * 0.12) * Math.SQRT1_2, 0.28, 4),
      stoneMat
    );
    tRoof.rotateY(Math.PI / 4);
    tRoof.position.y = yBase + 0.24;
    tRoof.castShadow = true;
    pagoda.add(tCore, tRoof);
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.45, 8), stoneMat);
  spire.position.y = 3.05;
  pagoda.add(spire);
  group.add(pagoda);

  // 3b. Bamboo Shishi-Odoshi Water Fountain & Stone Tsukubai Basin (X = +2.45m, Z = 1.65m)
  const shishi = new THREE.Group();
  shishi.position.set(2.45, 0.15, 1.65);

  const tsukubai = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.36, 10), stoneMat);
  tsukubai.position.set(-0.22, 0.18, 0);
  const tsukubaiWater = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.38, 10), waterMat);
  tsukubaiWater.position.set(-0.22, 0.18, 0);

  const pivotPosts = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.24), bambooMat);
  pivotPosts.position.set(0.15, 0.275, 0);
  const rockerTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 8), bambooMat);
  rockerTube.rotation.z = Math.PI / 3;
  rockerTube.position.set(0.15, 0.52, 0);

  // Tall Bamboo Backdrop Stalks with Leafy Tips behind Shishi-odoshi
  [-0.25, 0.0, 0.25].forEach((bx, idx) => {
    const h = 2.2 + idx * 0.3;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, h, 8), bambooMat);
    stalk.position.set(bx, h / 2, -0.45);
    const leafTip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), lilyPadMat);
    leafTip.position.set(bx, h + 0.08, -0.45);
    shishi.add(stalk, leafTip);
  });

  shishi.add(tsukubai, tsukubaiWater, pivotPosts, rockerTube);
  group.add(shishi);

  // 4. WEST GARDEN: TRADITIONAL WOODEN TEA PAVILION (Azumaya / 東屋 at X = -3.8m, Z = -2.2m)
  const azumaya = new THREE.Group();
  azumaya.position.set(-3.8, 0.15, -2.2);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 2.6), timberMat);
  deck.position.y = 0.12;
  azumaya.add(deck);

  [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.3, 8), timberMat);
    post.position.set(px, 1.35, pz);
    post.castShadow = true;
    azumaya.add(post);
  });

  const teaRoof = buildJapaneseIrimoyaRoof({
    width: 3.2,
    depth: 3.2,
    height: 1.25,
    roofMat: roofTileMat,
    trimMat: timberMat,
    goldMat,
  });
  teaRoof.position.set(0, 2.5, 0);
  azumaya.add(teaRoof);

  // Hanging Chōchin Lantern + Red-Cloth Tea Bench + Nodategasa Tea Parasol
  const chochin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 10), lanternGlowMat);
  chochin.position.set(0, 2.22, 0.85);
  const teaBench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, 0.55), woodBridgeMat);
  teaBench.position.set(0, 0.42, 0);
  const parasolPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.75, 6), timberMat);
  parasolPole.position.set(1.55, 0.875, 1.15);
  const parasolTop = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.35, 12), woodBridgeMat);
  parasolTop.position.set(1.55, 1.82, 1.15);
  azumaya.add(chochin, teaBench, parasolPole, parasolTop);
  group.add(azumaya);

  // 4b. CORNER KARESANSUI RAKED GRAVEL ZEN GARDEN (X = +3.9m, Z = -4.0m)
  const zenCurb = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 2.4), stoneMat);
  zenCurb.position.set(3.9, 0.21, -4.0);
  const zenBedMat = new THREE.MeshStandardMaterial({ map: getRakedGravelTexture(), roughness: 0.9 });
  const zenBed = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 2.1), zenBedMat);
  zenBed.position.set(3.9, 0.22, -4.0);
  const zenRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), stoneMat);
  zenRock.position.set(3.6, 0.42, -4.1);
  group.add(zenCurb, zenBed, zenRock);

  // 4c. BAMBOO PERIMETER FENCE (Takegaki)
  [-5.85, 5.85].forEach((fx) => {
    const sideFence = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 8.8), bambooMat);
    sideFence.position.set(fx, 0.57, -1.5);
    group.add(sideFence);
  });
  const backFence = new THREE.Mesh(new THREE.BoxGeometry(11.7, 0.85, 0.08), bambooMat);
  backFence.position.set(0, 0.57, -5.85);
  group.add(backFence);

  // 5. GARDEN ENTRANCE SIGN ON TWIN CEDAR POSTS (Side-Mounted so Central Gate is Open!) & AUTUMN MAPLES
  const signTexture = createGardenSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  [-4.85, -2.15].forEach((px) => {
    const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.95, 8), timberMat);
    sPost.position.set(px, 1.12, 4.05);
    group.add(sPost);
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 0.12), [
    timberMat, timberMat, timberMat, timberMat, signMat, signMat,
  ]);
  signMesh.position.set(-3.5, 1.68, 4.05);
  group.add(signMesh);

  if (includeLandscaping) {
    const mapleMats = [
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }),
    ];
    [
      { x: -1.2, z: -4.2, mIdx: 0 },
      { x: 1.5, z: -4.1, mIdx: 1 },
    ].forEach((mt) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8), timberMat);
      trunk.position.set(mt.x, 1.1 + 0.15, mt.z);
      trunk.castShadow = true;
      const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 1), mapleMats[mt.mIdx]);
      f1.position.set(mt.x, 3.05, mt.z);
      f1.castShadow = true;
      const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), mapleMats[mt.mIdx]);
      f2.position.set(mt.x + 0.65, 2.65, mt.z + 0.35);
      f2.castShadow = true;
      group.add(trunk, f1, f2);
    });
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
