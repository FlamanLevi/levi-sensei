import * as THREE from 'three';

export interface ZooOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

let cachedZooBannerTex: THREE.CanvasTexture | null = null;

function createZooEntranceBannerTexture(): THREE.CanvasTexture {
  if (cachedZooBannerTex) return cachedZooBannerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 52px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAFARI ZOO', 256, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.fillText('どうぶつえん (動物園)', 256, 104);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  cachedZooBannerTex = texture;
  return texture;
}

function buildGiraffe(giraffeScale: number = 1.0): THREE.Group {
  const giraffe = new THREE.Group();
  giraffe.name = 'Giraffe';

  const yellowCoatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
  const brownSpotMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 });

  const legPositions = [
    [-0.25, 0.9, -0.45],
    [+0.25, 0.9, -0.45],
    [-0.22, 0.9, +0.45],
    [+0.22, 0.9, +0.45],
  ];
  legPositions.forEach(([lx, ly, lz]) => {
    const legGeo = new THREE.CylinderGeometry(0.065, 0.05, 1.8, 8);
    const leg = new THREE.Mesh(legGeo, yellowCoatMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    giraffe.add(leg);

    const hoofGeo = new THREE.CylinderGeometry(0.07, 0.075, 0.12, 8);
    const hoof = new THREE.Mesh(hoofGeo, hoofMat);
    hoof.position.set(lx, 0.06, lz);
    giraffe.add(hoof);
  });

  const bodyGeo = new THREE.BoxGeometry(0.7, 0.8, 1.3);
  const body = new THREE.Mesh(bodyGeo, yellowCoatMat);
  body.position.set(0, 2.2, 0);
  body.rotation.x = -0.15;
  body.castShadow = true;
  giraffe.add(body);

  [
    [0.36, 2.3, 0.2, 0.25, 0.2],
    [-0.36, 2.1, -0.2, 0.3, 0.25],
    [0.36, 2.0, -0.3, 0.2, 0.2],
    [-0.36, 2.35, 0.25, 0.22, 0.22],
  ].forEach(([sx, sy, sz, sw, sh]) => {
    const spotGeo = new THREE.BoxGeometry(0.02, sh, sw);
    const spot = new THREE.Mesh(spotGeo, brownSpotMat);
    spot.position.set(sx, sy, sz);
    giraffe.add(spot);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.85, 6), brownSpotMat);
  tail.position.set(0, 1.75, -0.68);
  tail.rotation.x = 0.15;
  giraffe.add(tail);

  const neckGeo = new THREE.CylinderGeometry(0.12, 0.2, 1.8, 8);
  const neck = new THREE.Mesh(neckGeo, yellowCoatMat);
  neck.position.set(0, 3.2, 0.65);
  neck.rotation.x = 0.22;
  neck.castShadow = true;
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.08), brownSpotMat);
  mane.position.set(0, 3.2, 0.52);
  mane.rotation.x = 0.22;
  giraffe.add(neck, mane);

  const headGeo = new THREE.BoxGeometry(0.25, 0.28, 0.45);
  const head = new THREE.Mesh(headGeo, yellowCoatMat);
  head.position.set(0, 4.05, 0.95);
  head.castShadow = true;
  giraffe.add(head);

  const muzzleGeo = new THREE.BoxGeometry(0.2, 0.18, 0.2);
  const muzzle = new THREE.Mesh(muzzleGeo, brownSpotMat);
  muzzle.position.set(0, 3.98, 1.22);
  giraffe.add(muzzle);

  [-0.08, 0.08].forEach((hx) => {
    const hornGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.18, 6);
    const horn = new THREE.Mesh(hornGeo, brownSpotMat);
    horn.position.set(hx, 4.25, 0.9);
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.04), yellowCoatMat);
    ear.position.set(hx * 2.2, 4.12, 0.88);
    giraffe.add(horn, ear);
  });

  if (giraffeScale !== 1.0) {
    giraffe.scale.setScalar(giraffeScale);
  }
  return giraffe;
}

function buildLion(): THREE.Group {
  const lion = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const maneMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.95), coatMat);
  body.position.set(0, 0.42, 0);
  body.castShadow = true;

  const mane = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.32, 10), maneMat);
  mane.rotation.x = Math.PI / 2;
  mane.position.set(0, 0.58, 0.42);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.30, 0.34), coatMat);
  head.position.set(0, 0.58, 0.52);

  [
    [-0.18, 0.2, 0.35],
    [0.18, 0.2, 0.35],
    [-0.18, 0.2, -0.35],
    [0.18, 0.2, -0.35],
  ].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.4, 8), coatMat);
    leg.position.set(lx, ly, lz);
    lion.add(leg);
  });

  lion.add(body, mane, head);
  return lion;
}

function buildFlamingo(): THREE.Group {
  const flamingo = new THREE.Group();
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.6 });

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), legMat);
  leg.position.set(0, 0.275, 0);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), pinkMat);
  body.scale.set(0.85, 0.95, 1.35);
  body.position.set(0, 0.55, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.38, 6), pinkMat);
  neck.position.set(0, 0.78, 0.14);
  neck.rotation.x = 0.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), pinkMat);
  head.position.set(0, 0.96, 0.18);

  flamingo.add(leg, body, neck, head);
  return flamingo;
}

function buildElephant(): THREE.Group {
  const elephant = new THREE.Group();
  elephant.name = 'Elephant';

  const greyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });

  const legPositions = [
    [-0.55, 0.65, -0.65],
    [+0.55, 0.65, -0.65],
    [-0.5, 0.65, +0.65],
    [+0.5, 0.65, +0.65],
  ];
  legPositions.forEach(([lx, ly, lz]) => {
    const legGeo = new THREE.CylinderGeometry(0.22, 0.25, 1.3, 10);
    const leg = new THREE.Mesh(legGeo, greyMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    elephant.add(leg);
  });

  const bodyGeo = new THREE.BoxGeometry(1.4, 1.4, 1.9);
  const body = new THREE.Mesh(bodyGeo, greyMat);
  body.position.set(0, 1.85, 0);
  body.castShadow = true;
  elephant.add(body);

  const headGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const head = new THREE.Mesh(headGeo, greyMat);
  head.position.set(0, 2.1, 1.15);
  head.castShadow = true;
  elephant.add(head);

  [-0.65, 0.65].forEach((ex) => {
    const earGeo = new THREE.BoxGeometry(0.08, 0.9, 0.65);
    const ear = new THREE.Mesh(earGeo, greyMat);
    ear.position.set(ex, 2.15, 1.05);
    ear.rotation.y = ex < 0 ? -0.3 : 0.3;
    ear.castShadow = true;
    elephant.add(ear);
  });

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.1, 8);
  const trunk = new THREE.Mesh(trunkGeo, greyMat);
  trunk.position.set(0, 1.4, 1.6);
  trunk.rotation.x = -0.35;
  elephant.add(trunk);

  [-0.25, 0.25].forEach((tx) => {
    const tuskGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.65, 8);
    const tusk = new THREE.Mesh(tuskGeo, tuskMat);
    tusk.position.set(tx, 1.55, 1.55);
    tusk.rotation.x = -0.7;
    elephant.add(tusk);
  });

  return elephant;
}

function buildGiantPanda(pandaScale: number = 1.0): THREE.Group {
  const panda = new THREE.Group();
  panda.name = 'GiantPanda';

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });

  const bodyGeo = new THREE.SphereGeometry(0.38, 12, 10);
  const body = new THREE.Mesh(bodyGeo, whiteMat);
  body.position.set(0, 0.45, 0);
  body.castShadow = true;
  panda.add(body);

  const shoulderGeo = new THREE.BoxGeometry(0.78, 0.28, 0.38);
  const shoulder = new THREE.Mesh(shoulderGeo, blackMat);
  shoulder.position.set(0, 0.58, 0.05);
  panda.add(shoulder);

  [-0.28, 0.28].forEach((lx) => {
    const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.38, 8);
    legGeo.rotateX(Math.PI / 3);
    const leg = new THREE.Mesh(legGeo, blackMat);
    leg.position.set(lx, 0.2, 0.22);
    panda.add(leg);
  });

  const headGeo = new THREE.SphereGeometry(0.26, 12, 10);
  const head = new THREE.Mesh(headGeo, whiteMat);
  head.position.set(0, 0.85, 0.08);
  head.castShadow = true;
  panda.add(head);

  [-0.18, 0.18].forEach((ex) => {
    const earGeo = new THREE.SphereGeometry(0.08, 8, 6);
    const ear = new THREE.Mesh(earGeo, blackMat);
    ear.position.set(ex, 1.08, 0.04);
    panda.add(ear);
  });

  [-0.1, 0.1].forEach((px) => {
    const eyePatch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.02), blackMat);
    eyePatch.position.set(px, 0.88, 0.32);
    eyePatch.rotation.z = px < 0 ? -0.2 : 0.2;
    panda.add(eyePatch);
  });

  const stalkGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6);
  stalkGeo.rotateZ(Math.PI / 4);
  const stalk = new THREE.Mesh(stalkGeo, bambooMat);
  stalk.position.set(0.1, 0.65, 0.3);
  panda.add(stalk);

  if (pandaScale !== 1.0) {
    panda.scale.setScalar(pandaScale);
  }
  return panda;
}

function buildPenguin(): THREE.Group {
  const penguin = new THREE.Group();
  penguin.name = 'Penguin';

  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });

  const bodyGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.55, 10);
  const body = new THREE.Mesh(bodyGeo, blackMat);
  body.position.set(0, 0.32, 0);
  penguin.add(body);

  const bellyGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.48, 8, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
  const belly = new THREE.Mesh(bellyGeo, whiteMat);
  belly.position.set(0, 0.31, 0.04);
  penguin.add(belly);

  [-0.16, 0.16].forEach((fx) => {
    const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.10), blackMat);
    flipper.position.set(fx, 0.32, 0);
    flipper.rotation.z = fx < 0 ? 0.18 : -0.18;
    penguin.add(flipper);
  });

  const headGeo = new THREE.SphereGeometry(0.13, 10, 8);
  const head = new THREE.Mesh(headGeo, blackMat);
  head.position.set(0, 0.62, 0);
  penguin.add(head);

  const beakGeo = new THREE.ConeGeometry(0.04, 0.12, 6);
  beakGeo.rotateX(Math.PI / 2);
  const beak = new THREE.Mesh(beakGeo, orangeMat);
  beak.position.set(0, 0.6, 0.16);
  penguin.add(beak);

  [-0.07, 0.07].forEach((fx) => {
    const footGeo = new THREE.BoxGeometry(0.08, 0.03, 0.14);
    const foot = new THREE.Mesh(footGeo, orangeMat);
    foot.position.set(fx, 0.02, 0.04);
    penguin.add(foot);
  });

  return penguin;
}

/**
 * Tier 3: Zoo (動物園) - `hwg5_u19_17`
 * Footprint: strictly within 18.0m x 18.0m (3U x 3U)
 */
export function buildZooMesh(options: ZooOptions = {}): THREE.Group {
  const {
    includeRoad = true,
    includeLandscaping = true,
    scale = 1.0,
  } = options;

  const zoo = new THREE.Group();
  zoo.name = 'Tier3_Zoo_hwg5_u19_17';

  // --- Materials ---
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 });
  const savannahSandMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
  const elephantClayMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.85 });
  const waterPoolMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const glassBarrierMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.1,
    transparent: true,
    opacity: 0.5,
  });
  const iceRockMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
  const woodFenceMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const safariRoofMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
  const terracottaRoofMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.6 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
  const torchGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf97316,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });

  // 1. BASE FOOTPRINT & INFRASTRUCTURE (18m x 18m Lot)
  const foundationGeo = new THREE.BoxGeometry(18.0, 0.18, 16.5);
  const foundation = new THREE.Mesh(foundationGeo, plazaMat);
  foundation.position.set(0, 0.09, -0.75);
  foundation.receiveShadow = true;
  zoo.add(foundation);

  const sidewalkGeo = new THREE.BoxGeometry(18.0, 0.18, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalk.position.set(0, 0.09, 8.25);
  sidewalk.receiveShadow = true;
  zoo.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(18.0, 0.20, 0.15);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.10, 9.0);
  curb.receiveShadow = true;
  zoo.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(18.0, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 9.9);
    road.receiveShadow = true;
    zoo.add(road);

    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    for (let i = -8.0; i <= 8.0; i += 2.4) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.025, 0.12);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(i, 0.02, 9.4);
      zoo.add(stripe);
    }
  }

  // 2. SAVANNAH ENCLOSURE (detail1: West Side X in [-8.2, -0.6], Z in [-8.2, 3.8])
  const savannahGroup = new THREE.Group();
  savannahGroup.position.set(-4.4, 0.18, -2.2);

  const sandGeo = new THREE.BoxGeometry(7.6, 0.04, 11.0);
  const sand = new THREE.Mesh(sandGeo, savannahSandMat);
  sand.receiveShadow = true;
  savannahGroup.add(sand);

  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
  const railGeo = new THREE.CylinderGeometry(0.05, 0.05, 7.4, 8);
  railGeo.rotateZ(Math.PI / 2);

  const frontRail = new THREE.Mesh(railGeo, woodFenceMat);
  frontRail.position.set(0, 0.8, 5.4);
  const midRail = new THREE.Mesh(railGeo, woodFenceMat);
  midRail.position.set(0, 0.45, 5.4);
  savannahGroup.add(frontRail, midRail);

  for (let px = -3.6; px <= 3.6; px += 1.8) {
    const post = new THREE.Mesh(postGeo, woodFenceMat);
    post.position.set(px, 0.6, 5.4);
    post.castShadow = true;
    savannahGroup.add(post);
  }

  if (includeLandscaping) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(-1.8, 0, -2.5);

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.45, 6.0, 8);
    const trunk = new THREE.Mesh(trunkGeo, woodFenceMat);
    trunk.position.set(0, 3.0, 0);
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    [
      [0.6, 5.8, 0.2, 3.8, 0.5],
      [0.9, 6.8, 0.0, 4.8, 0.6],
      [1.1, 7.8, -0.2, 3.2, 0.5],
    ].forEach(([cx, cy, cz, cr, ch]) => {
      const canopyGeo = new THREE.CylinderGeometry(cr, cr + 0.4, ch, 12);
      const canopy = new THREE.Mesh(canopyGeo, foliageMat);
      canopy.position.set(cx, cy, cz);
      canopy.castShadow = true;
      treeGroup.add(canopy);
    });

    savannahGroup.add(treeGroup);
  }

  const giraffe = buildGiraffe(1.0);
  giraffe.position.set(0.6, 0.02, 1.4);
  giraffe.rotation.y = -0.35;
  const calf = buildGiraffe(0.62);
  calf.position.set(1.9, 0.02, 2.0);
  calf.rotation.y = -0.55;
  savannahGroup.add(giraffe, calf);

  const prideRock = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 0.65, 8), curbMat);
  prideRock.position.set(-1.6, 0.32, 2.4);
  const lion = buildLion();
  lion.position.set(-1.6, 0.65, 2.4);
  lion.rotation.y = 0.35;
  savannahGroup.add(prideRock, lion);

  // Flamingo Lagoon in Front-East Corner of Savannah
  const lagoon = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.05, 16), waterPoolMat);
  lagoon.position.set(2.1, 0.04, 3.8);
  const f1 = buildFlamingo();
  f1.position.set(1.85, 0.05, 3.7);
  f1.rotation.y = 0.4;
  const f2 = buildFlamingo();
  f2.position.set(2.35, 0.05, 3.9);
  f2.rotation.y = -0.6;
  savannahGroup.add(lagoon, f1, f2);

  zoo.add(savannahGroup);

  // 3. ELEPHANT SANCTUARY & SHELTER HOUSE (East-Rear: X in [+0.8, +8.2], Z in [-8.2, -0.5])
  const elephantGroup = new THREE.Group();
  elephantGroup.position.set(4.5, 0.18, -4.3);

  const clayGeo = new THREE.BoxGeometry(7.4, 0.04, 7.5);
  const clay = new THREE.Mesh(clayGeo, elephantClayMat);
  clay.receiveShadow = true;
  elephantGroup.add(clay);

  const eleShelter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 2.4), woodFenceMat);
  eleShelter.position.set(-1.2, 1.6, -2.2);
  eleShelter.castShadow = true;
  const eleRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), terracottaRoofMat);
  eleRoof.rotation.y = Math.PI / 4;
  eleRoof.position.set(-1.2, 3.8, -2.2);
  elephantGroup.add(eleShelter, eleRoof);

  const mudPoolGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.06, 16);
  const mudPool = new THREE.Mesh(mudPoolGeo, waterPoolMat);
  mudPool.position.set(1.5, 0.04, -1.0);
  elephantGroup.add(mudPool);

  const elephant = buildElephant();
  elephant.position.set(-0.6, 0.02, 0.8);
  elephant.rotation.y = 0.45;
  elephantGroup.add(elephant);

  for (let rx = -3.2; rx <= 3.2; rx += 1.4) {
    const rockGeo = new THREE.DodecahedronGeometry(0.38, 0);
    const rock = new THREE.Mesh(rockGeo, curbMat);
    rock.position.set(rx, 0.25, 3.7);
    rock.scale.set(1.2, 0.8, 1.0);
    elephantGroup.add(rock);
  }

  zoo.add(elephantGroup);

  // 4. PENGUIN COVE, ICEBERG CLIFF & GLASS BARRIER (detail2 at X = 4.5, Z = 3.0)
  const penguinGroup = new THREE.Group();
  penguinGroup.position.set(4.5, 0.18, 3.0);

  const poolGeo = new THREE.BoxGeometry(7.2, 0.06, 4.8);
  const pool = new THREE.Mesh(poolGeo, waterPoolMat);
  pool.receiveShadow = true;
  penguinGroup.add(pool);

  const frontGlassWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.85, 0.06), glassBarrierMat);
  frontGlassWall.position.set(0, 0.425, 2.38);
  penguinGroup.add(frontGlassWall);

  const iceGeo = new THREE.CylinderGeometry(1.6, 2.1, 0.55, 12);
  const ice = new THREE.Mesh(iceGeo, iceRockMat);
  ice.position.set(0.2, 0.28, -0.2);
  ice.receiveShadow = true;

  const icePeak = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.45, 7), iceRockMat);
  icePeak.position.set(-0.4, 1.15, -0.8);
  icePeak.castShadow = true;
  penguinGroup.add(ice, icePeak);

  [
    [-0.5, 0.55, -0.2, 0.6],
    [+0.5, 0.55, 0.2, -0.8],
    [0.0, 0.55, 0.6, 0.1],
    [+0.9, 0.55, -0.4, -0.3],
    [-1.8, 0.05, 0.9, 0.8],
  ].forEach(([px, py, pz, ry]) => {
    const penguin = buildPenguin();
    penguin.position.set(px, py, pz);
    penguin.rotation.y = ry;
    penguinGroup.add(penguin);
  });

  zoo.add(penguinGroup);

  // 5. GIANT PANDA SANCTUARY & CUB (Center Courtyard: X = 0, Z = 0.5)
  const pandaGroup = new THREE.Group();
  pandaGroup.position.set(0, 0.18, 0.5);

  const pBench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 1.3), woodFenceMat);
  pBench.position.set(0, 0.125, 0);
  pBench.receiveShadow = true;
  pandaGroup.add(pBench);

  const giantPanda = buildGiantPanda(1.0);
  giantPanda.position.set(-0.35, 0.25, 0);
  const pandaCub = buildGiantPanda(0.62);
  pandaCub.position.set(0.55, 0.25, 0.15);
  pandaCub.rotation.y = -0.4;
  pandaGroup.add(giantPanda, pandaCub);

  [-0.8, -0.5, 0.5, 0.8].forEach((bx, idx) => {
    const bStalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 2.2 + (idx % 2) * 0.4, 6),
      foliageMat
    );
    bStalk.position.set(bx, 1.1, -0.8 + (idx % 2) * 0.3);
    pandaGroup.add(bStalk);
  });

  zoo.add(pandaGroup);

  // 6. GRAND SAFARI ENTRANCE GATE & TORCH LANTERNS (Z in [+6.0, +7.5])
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0.18, 6.7);

  const logGeo = new THREE.CylinderGeometry(0.3, 0.35, 5.5, 10);
  const leftLog = new THREE.Mesh(logGeo, woodFenceMat);
  leftLog.position.set(-3.6, 2.75, 0);
  leftLog.castShadow = true;

  const rightLog = new THREE.Mesh(logGeo, woodFenceMat);
  rightLog.position.set(3.6, 2.75, 0);
  rightLog.castShadow = true;

  [-3.6, 3.6].forEach((tx) => {
    const torch = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 8), torchGlowMat);
    torch.position.set(tx, 3.2, 0.38);
    gateGroup.add(torch);
  });

  const crossLogGeo = new THREE.CylinderGeometry(0.25, 0.25, 8.4, 10);
  crossLogGeo.rotateZ(Math.PI / 2);
  const crossLog = new THREE.Mesh(crossLogGeo, woodFenceMat);
  crossLog.position.set(0, 5.2, 0);
  crossLog.castShadow = true;

  const roofGeo = new THREE.BoxGeometry(8.8, 0.3, 1.4);
  const roof = new THREE.Mesh(roofGeo, safariRoofMat);
  roof.position.set(0, 5.6, 0);
  roof.castShadow = true;

  const bannerBoardGeo = new THREE.BoxGeometry(6.6, 1.2, 0.15);
  const bannerBoard = new THREE.Mesh(bannerBoardGeo, safariRoofMat);
  bannerBoard.position.set(0, 4.3, 0);

  const bannerSignGeo = new THREE.PlaneGeometry(6.4, 1.05);
  const bannerTex = createZooEntranceBannerTexture();
  const bannerSignMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    emissive: 0xffffff,
    emissiveMap: bannerTex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const bannerSign = new THREE.Mesh(bannerSignGeo, bannerSignMat);
  bannerSign.position.set(0, 4.3, 0.09);

  gateGroup.add(leftLog, rightLog, crossLog, roof, bannerBoard, bannerSign);

  const boothGeo = new THREE.BoxGeometry(1.6, 2.4, 1.4);
  const booth = new THREE.Mesh(boothGeo, woodFenceMat);
  booth.position.set(-5.2, 1.2, 0);
  booth.castShadow = true;

  const windowGeo = new THREE.BoxGeometry(1.0, 0.8, 0.05);
  const windowMesh = new THREE.Mesh(windowGeo, torchGlowMat);
  windowMesh.position.set(-5.2, 1.4, 0.71);
  gateGroup.add(booth, windowMesh);

  zoo.add(gateGroup);

  if (scale !== 1.0) {
    zoo.scale.setScalar(scale);
  }

  return zoo;
}
