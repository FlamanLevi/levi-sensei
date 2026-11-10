import * as THREE from 'three';
import {
  getKawaraTileTexture,
  getIshigakiStoneTexture,
  getStuccoWallTexture,
  getArchitecturalBumpMap,
  buildJapaneseIrimoyaRoof,
  buildPerimeterRailing,
} from './wallTextures';

let cachedTempleSignTex: THREE.CanvasTexture | null = null;

function createTempleSignTexture(): THREE.CanvasTexture {
  if (cachedTempleSignTex) return cachedTempleSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#facc15';
  ctx.font = '900 44px serif';
  ctx.fillText('TEMPLE', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('寺院 / お寺 (BUDDHIST TEMPLE)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  cachedTempleSignTex = texture;
  return texture;
}

export interface TempleOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

export function buildTempleMesh(options: TempleOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Temple_hwg5_u19_20';

  const bumpTex = getArchitecturalBumpMap();

  // Materials
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x582f14, roughness: 0.68 });
  const plasterWallMat = new THREE.MeshStandardMaterial({
    color: 0xfafaf9,
    map: getStuccoWallTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.015,
    roughness: 0.58,
  });
  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: getKawaraTileTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.025,
    roughness: 0.45,
  });
  const stonePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    map: getIshigakiStoneTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.03,
    roughness: 0.85,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.82, roughness: 0.25 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.72, roughness: 0.35 });
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.45 });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.95 });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -1.5);
  lawn.receiveShadow = true;
  group.add(lawn);

  const plazaGeo = new THREE.BoxGeometry(lotSize, 0.152, 1.5);
  const plaza = new THREE.Mesh(plazaGeo, sandMat);
  plaza.position.set(0, 0.076, 3.75);
  plaza.receiveShadow = true;
  group.add(plaza);

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

  // 2. MAIN TEMPLE SANCTUARY (Hondō / 本堂)
  const hondoGroup = new THREE.Group();
  hondoGroup.position.set(0, 0.15, -1.1);

  const bW = 8.4;
  const bD = 5.8;
  const bH = 4.0;

  const stonePlat = new THREE.Mesh(new THREE.BoxGeometry(bW + 1.0, 0.55, bD + 1.2), stonePlinthMat);
  stonePlat.position.y = 0.275;
  stonePlat.receiveShadow = true;
  hondoGroup.add(stonePlat);

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 0.35), foundationMat);
    step.position.set(0, 0.08 + s * 0.16, (bD + 1.2) / 2 + (2 - s) * 0.25);
    hondoGroup.add(step);
  }

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), plasterWallMat);
  bodyMesh.position.y = bH / 2 + 0.55;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  hondoGroup.add(bodyMesh);

  // Buddhist Arched Bell-Shaped Windows (*Katōmado* / 花頭窓) flanking the Sanctuary Doors
  [-2.5, 2.5].forEach((wx) => {
    const kFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, 0.10), timberMat);
    kFrame.position.set(wx, 2.45, bD / 2 + 0.02);
    const kArch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.12, 12), lanternGlowMat);
    kArch.rotation.x = Math.PI / 2;
    kArch.position.set(wx, 2.55, bD / 2 + 0.03);
    hondoGroup.add(kFrame, kArch);
  });

  const lowerTimber = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.06, 1.1, bD + 0.06), timberMat);
  lowerTimber.position.y = 0.55 + 0.55;
  const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 0.22, bD + 0.1), timberMat);
  upperBeam.position.y = 0.55 + bH - 0.15;
  hondoGroup.add(lowerTimber, upperBeam);

  const engawa = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.8, 0.14, bD + 1.0), timberMat);
  engawa.position.set(0, 0.55 + 0.07, 0.1);
  hondoGroup.add(engawa);

  const verandaRail = buildPerimeterRailing(bW + 0.7, bD + 0.9, 0.55, timberMat, 1.4);
  verandaRail.position.set(0, 0.62, 0.1);
  hondoGroup.add(verandaRail);

  const hondoRoof = buildJapaneseIrimoyaRoof({
    width: bW + 2.0,
    depth: bD + 2.0,
    height: 3.1,
    roofMat: roofTileMat,
    gableWallMat: plasterWallMat,
    trimMat: timberMat,
    goldMat,
  });
  hondoRoof.position.set(0, 0.55 + bH, 0);
  hondoGroup.add(hondoRoof);

  [-3.6, -1.4, 1.4, 3.6].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, bH, 12), timberMat);
    post.position.set(px, bH / 2 + 0.55, bD / 2 + 0.42);
    post.castShadow = true;
    hondoGroup.add(post);
  });

  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.7, 0.1), goldMat);
  doors.position.set(0, 1.35 + 0.55, bD / 2 + 0.04);
  hondoGroup.add(doors);

  const hangingLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.38, 6), lanternGlowMat);
  hangingLantern.position.set(0, 3.65, bD / 2 + 0.42);
  hondoGroup.add(hangingLantern);

  const signTexture = createTempleSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.85, 0.12), signMat);
  signMesh.position.set(0, 4.15, bD / 2 + 0.65);
  hondoGroup.add(signMesh);

  group.add(hondoGroup);

  // 3. BELL TOWER (Shōrō / 鐘楼) on Left Plaza: X = -3.8m, Z = 3.5m
  const bellTower = new THREE.Group();
  bellTower.position.set(-3.8, 0.15, 3.5);

  const bellBase = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 1.7), stonePlinthMat);
  bellBase.position.y = 0.2;
  bellTower.add(bellBase);

  [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]].forEach(([px, pz]) => {
    const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.8, 8), timberMat);
    bPost.position.set(px, 1.8, pz);
    bellTower.add(bPost);
  });

  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.75, 16), bronzeMat);
  bell.position.set(0, 1.95, 0);
  bellTower.add(bell);

  const shumoku = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), timberMat);
  shumoku.rotation.z = Math.PI / 2;
  shumoku.position.set(0.45, 1.85, 0);
  bellTower.add(shumoku);

  const bRoof = buildJapaneseIrimoyaRoof({
    width: 2.3,
    depth: 2.3,
    height: 1.1,
    roofMat: roofTileMat,
    gableWallMat: plasterWallMat,
    trimMat: timberMat,
    goldMat,
  });
  bRoof.position.set(0, 3.1, 0);
  bellTower.add(bRoof);
  group.add(bellTower);

  // 4. STONE INCENSE BURNER (Jōkōro) with Rising Incense Smoke Wisps on Center-Right Plaza
  const incenseGroup = new THREE.Group();
  incenseGroup.position.set(1.4, 0.15, 3.8);

  const burnerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.65, 12), bronzeMat);
  burnerBase.position.y = 0.325;
  incenseGroup.add(burnerBase);

  const burnerCap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.35, 8), bronzeMat);
  burnerCap.position.y = 0.9;
  incenseGroup.add(burnerCap);

  // Rising aromatic incense smoke puffs
  [
    [0.0, 1.22, 0.0, 0.11],
    [0.05, 1.45, -0.04, 0.14],
    [-0.04, 1.70, 0.03, 0.17],
  ].forEach(([sx, sy, sz, sr]) => {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(sr, 0), smokeMat);
    puff.position.set(sx, sy, sz);
    incenseGroup.add(puff);
  });
  group.add(incenseGroup);

  // 5. STONE JIZŌ STATUES (O-jizō-sama with Red Bibs & Wooden Sotoba Stupa Tablets)
  const jizoGroup = new THREE.Group();
  jizoGroup.position.set(3.8, 0.15, 3.8);

  const jizoStoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const redBibMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });

  [-0.45, 0, 0.45].forEach((jx) => {
    const singleJizo = new THREE.Group();
    singleJizo.position.set(jx, 0, 0);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.3), jizoStoneMat);
    base.position.y = 0.075;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.42, 8), jizoStoneMat);
    body.position.y = 0.36;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), jizoStoneMat);
    head.position.set(0, 0.65, 0);

    const bib = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 8, 1, false, 0, Math.PI), redBibMat);
    bib.rotation.x = Math.PI;
    bib.position.set(0, 0.52, 0.06);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), redBibMat);
    cap.position.set(0, 0.68, 0);

    singleJizo.add(base, body, head, bib, cap);
    jizoGroup.add(singleJizo);
  });
  group.add(jizoGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
