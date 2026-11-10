import * as THREE from 'three';

let cachedParkSignTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Park Entrance Sign
 */
function createParkSignTexture(): THREE.CanvasTexture {
  if (cachedParkSignTex) return cachedParkSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx - 4, cy + 12, 8, 16);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px sans-serif';
  ctx.fillText('PARK', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#bbf7d0';
  ctx.fillText('みどり公園 (CENTRAL PARK)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedParkSignTex = texture;
  return texture;
}

export interface ParkOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Community Playground Park (hwg5_u19_14)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildParkMesh(options: ParkOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Park_hwg5_u19_14';

  // Materials
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9 });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });
  const metalBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
  const metalYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const metalRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.25 });
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xf472b6,
    emissiveIntensity: 0.22,
    roughness: 0.7,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const yardGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const yard = new THREE.Mesh(yardGeo, grassMat);
  yard.position.set(0, 0.075, -1.5);
  yard.receiveShadow = true;
  group.add(yard);

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

  // 2. WEST PLAYGROUND ZONE: SLIDE & SWING SET (detail1 at target [-2.5, 1.4, 1.5])
  // 2a. Playground Slide (Suberidai / 滑り台 at X = -3.8m, Z = 0.8m)
  const slideGroup = new THREE.Group();
  slideGroup.position.set(-3.8, 0.15, 0.8);

  const ladderGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8);
  const ladderL = new THREE.Mesh(ladderGeo, metalBlueMat);
  ladderL.position.set(-0.38, 1.25, -1.0);
  const ladderR = new THREE.Mesh(ladderGeo, metalBlueMat);
  ladderR.position.set(0.38, 1.25, -1.0);
  slideGroup.add(ladderL, ladderR);

  for (let r = 0.35; r <= 2.2; r += 0.38) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.76, 6), chromeMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, r, -1.0);
    slideGroup.add(rung);
  }

  const plat = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.08, 0.88), metalRedMat);
  plat.position.set(0, 2.45, -1.0);
  slideGroup.add(plat);

  // Slanted Yellow Slide Chute with Red Safety Side Rails
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 3.2), metalYellowMat);
  chute.rotation.x = 0.68;
  chute.position.set(0, 1.25, 0.35);
  slideGroup.add(chute);

  [-0.36, 0.36].forEach((sx) => {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 3.2), metalRedMat);
    sideRail.rotation.x = 0.68;
    sideRail.position.set(sx, 1.32, 0.35);
    slideGroup.add(sideRail);
  });
  group.add(slideGroup);

  // 2b. Dual A-Frame Swing Set (Buranko / ブランコ right beside slide at X = -1.4m, Z = 1.2m)
  const swingGroup = new THREE.Group();
  swingGroup.position.set(-1.4, 0.15, 1.2);

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.2, 12), metalRedMat);
  beam.rotateZ(Math.PI / 2);
  beam.position.y = 2.65;
  swingGroup.add(beam);

  [-1.5, 1.5].forEach(ax => {
    const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.85, 8), metalBlueMat);
    leg1.rotation.x = -0.22;
    leg1.position.set(ax, 1.35, 0.52);
    const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.85, 8), metalBlueMat);
    leg2.rotation.x = 0.22;
    leg2.position.set(ax, 1.35, -0.52);
    swingGroup.add(leg1, leg2);
  });

  [-0.65, 0.65].forEach(sx => {
    const chain1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.95, 6), chromeMat);
    chain1.position.set(sx - 0.20, 1.65, 0);
    const chain2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.95, 6), chromeMat);
    chain2.position.set(sx + 0.20, 1.65, 0);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.24), metalYellowMat);
    seat.position.set(sx, 0.65, 0);
    swingGroup.add(chain1, chain2, seat);
  });
  group.add(swingGroup);

  // 3. EAST PLAYGROUND ZONE: SANDBOX & BLOOMING SAKURA TREES (detail2 at target [2.5, 1.5, 1.5])
  // 3a. Circular Sandbox (Sunaba / 砂場 at X = +2.4m, Z = 1.4m) with Mini Sandcastle & Bucket
  const sandGroup = new THREE.Group();
  sandGroup.position.set(2.4, 0.15, 1.4);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.24, 24), metalRedMat);
  rim.position.y = 0.12;
  const sandFill = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.22, 24), sandMat);
  sandFill.position.y = 0.13;
  const sandCastle = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 8), sandMat);
  sandCastle.position.set(-0.25, 0.32, 0.1);
  const redBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.18, 10), metalRedMat);
  redBucket.position.set(0.35, 0.30, 0.25);
  sandGroup.add(rim, sandFill, sandCastle, redBucket);
  group.add(sandGroup);

  // 3b. Blooming Sakura Cherry Blossom Trees framing the Sandbox & Backyard
  if (includeLandscaping) {
    const sakuraPositions = [
      { x: 3.8, z: -0.6, h: 3.8, r: 1.55 },
      { x: 1.2, z: -2.2, h: 4.1, r: 1.65 },
      { x: -3.2, z: -3.6, h: 3.9, r: 1.50 },
    ];
    sakuraPositions.forEach((sp) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 8), woodMat);
      trunk.position.set(sp.x, 1.25, sp.z);
      trunk.castShadow = true;

      const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(sp.r, 1), blossomMat);
      c1.position.set(sp.x, sp.h - 0.6, sp.z);
      c1.castShadow = true;
      const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(sp.r * 0.75, 1), blossomMat);
      c2.position.set(sp.x - 0.65, sp.h - 0.9, sp.z + 0.45);
      c2.castShadow = true;
      group.add(trunk, c1, c2);
    });
  }

  // 4. PARK AMENITIES (Benches, Park Clock Post, Drinking Fountain & Entrance Sign at Z <= 4.2m)
  [-3.6, 3.6].forEach(bx => {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.45), woodMat);
    bench.position.set(bx, 0.45 + 0.15, 3.6);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.06), woodMat);
    back.position.set(bx, 0.7 + 0.15, 3.4);
    group.add(bench, back);
  });

  // Classic Japanese Park Clock Post & Glowing Lantern (X = 0, Z = -0.8m)
  const clockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 10), darkMetalMat);
  clockPole.position.set(0, 1.85, -0.8);
  const clockDial = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), warmGlowMat);
  clockDial.rotation.x = Math.PI / 2;
  clockDial.position.set(0, 3.55, -0.8);
  group.add(clockPole, clockDial);

  // Park Drinking Fountain (Suidōba: X = -1.6m, Z = 3.6m)
  const fountain = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 0.42), foundationMat);
  fountain.position.set(-1.6, 0.34 + 0.15, 3.6);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), chromeMat);
  spout.position.set(-1.6, 0.90, 3.6);
  group.add(fountain, spout);

  // Park Entrance Sign Post (X = 0, Z = 4.1m)
  const signTexture = createParkSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.85, 0.12), [
    woodMat, woodMat, woodMat, woodMat, signMat, signMat,
  ]);
  signMesh.position.set(0, 1.2 + 0.15, 4.1);
  group.add(signMesh);

  // 5. SPRING-RIDER ANIMAL ROCKERS (Duck & Panda)
  const duckGroup = new THREE.Group();
  duckGroup.position.set(-0.2, 0.15, 2.2);
  const spring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 10), chromeMat);
  spring1.position.y = 0.175;
  const duckBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.55), metalYellowMat);
  duckBody.position.y = 0.48;
  const duckHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), metalYellowMat);
  duckHead.position.set(0, 0.72, 0.22);
  const duckBeak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), metalRedMat);
  duckBeak.rotation.x = Math.PI / 2;
  duckBeak.position.set(0, 0.7, 0.38);
  duckGroup.add(spring1, duckBody, duckHead, duckBeak);
  group.add(duckGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
