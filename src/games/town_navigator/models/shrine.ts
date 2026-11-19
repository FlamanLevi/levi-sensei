import * as THREE from 'three';
import {
  getKawaraTileTexture,
  getIshigakiStoneTexture,
  getArchitecturalBumpMap,
  buildJapaneseIrimoyaRoof,
} from './wallTextures';

let cachedShrineSignTex: THREE.CanvasTexture | null = null;
let cachedOmikujiSignTex: THREE.CanvasTexture | null = null;

function createShrineSignTexture(): THREE.CanvasTexture {
  if (cachedShrineSignTex) return cachedShrineSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 28, cy - 20, 56, 8);
  ctx.fillRect(cx - 22, cy - 6, 44, 6);
  ctx.fillRect(cx - 16, cy - 6, 6, 36);
  ctx.fillRect(cx + 10, cy - 6, 6, 36);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px serif';
  ctx.fillText('SHRINE', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('みどり神社 (SHINTO SHRINE)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.userData.isSharedResource = true;
  cachedShrineSignTex = texture;
  return texture;
}

function createOmikujiSignTexture(): THREE.CanvasTexture {
  if (cachedOmikujiSignTex) return cachedOmikujiSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 60);
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 22px "BIZ UDPGothic", serif';
  ctx.textAlign = 'center';
  ctx.fillText('おみくじ', 64, 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.isSharedResource = true;
  cachedOmikujiSignTex = tex;
  return tex;
}

export interface ShrineOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

export function buildShrineMesh(options: ShrineOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'Shrine_hwg5_u19_21';

  const bumpTex = getArchitecturalBumpMap();

  // Materials
  const toriiRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.1 });
  const blackLacquerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38 });
  const woodHinokiMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.58 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.72 });
  const copperRoofMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    map: getKawaraTileTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.02,
    roughness: 0.42,
    metalness: 0.25,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    map: getIshigakiStoneTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.025,
    roughness: 0.85,
  });
  const whitePaperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.22 });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.75,
  });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.5 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.95 });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const yardGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const yard = new THREE.Mesh(yardGeo, grassMat);
  yard.position.set(0, 0.075, -1.5);
  yard.receiveShadow = true;
  group.add(yard);

  const gravelGeo = new THREE.BoxGeometry(lotSize, 0.152, 1.5);
  const gravel = new THREE.Mesh(gravelGeo, gravelMat);
  gravel.position.set(0, 0.076, 3.75);
  gravel.receiveShadow = true;
  group.add(gravel);

  const sidewalkGeo = new THREE.BoxGeometry(lotSize, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, gravelMat);
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

  // Flagstone Sacred Approach Path (*Sandō*) from Torii to Sanctuary + Stone Lanterns (*Tōrō*)
  const sandoPath = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 5.4), stoneMat);
  sandoPath.position.set(0, 0.16, 1.4);
  sandoPath.receiveShadow = true;
  group.add(sandoPath);

  [-1.6, 1.6].forEach((lx) => {
    const doroBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.9, 6), stoneMat);
    doroBase.position.set(lx, 0.60, 1.8);
    const doroLight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), lanternGlowMat);
    doroLight.position.set(lx, 1.18, 1.8);
    const doroCap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.22, 6), stoneMat);
    doroCap.position.set(lx, 1.42, 1.8);
    group.add(doroBase, doroLight, doroCap);
  });

  // 2. MAIN SHRINE SANCTUARY (Haiden / 拝殿)
  const haidenGroup = new THREE.Group();
  haidenGroup.position.set(0, 0.15, -1.6);

  const bW = 7.8;
  const bD = 5.4;
  const bH = 3.8;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.8, 0.45, bD + 0.8), stoneMat);
  plinth.position.y = 0.225;
  haidenGroup.add(plinth);

  // Wooden Entry Steps up the Plinth
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.32), woodHinokiMat);
    step.position.set(0, 0.075 + s * 0.15, (bD + 0.8) / 2 + (2 - s) * 0.24);
    haidenGroup.add(step);
  }

  // Veranda Rail with Centered Entry Gap
  [-2.55, 2.55].forEach((rx) => {
    const fRail = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 0.08), toriiRedMat);
    fRail.position.set(rx, 0.88, bD / 2 + 0.36);
    haidenGroup.add(fRail);
    [-1.25, 0, 1.25].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), toriiRedMat);
      post.position.set(rx + px, 0.67, bD / 2 + 0.36);
      haidenGroup.add(post);
    });
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), woodHinokiMat);
  body.position.y = bH / 2 + 0.45;
  body.castShadow = true;
  haidenGroup.add(body);

  // Warm Golden Sanctuary Interior Altar Glow + Kōshi Lattice Doors
  const altarGlow = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.3, 0.08), lanternGlowMat);
  altarGlow.position.set(0, 1.65, bD / 2 + 0.01);
  haidenGroup.add(altarGlow);
  for (let bar = -4; bar <= 4; bar++) {
    const koshiBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.3, 0.06), darkWoodMat);
    koshiBar.position.set(bar * 0.22, 1.65, bD / 2 + 0.05);
    haidenGroup.add(koshiBar);
  }

  // Front Vermilion Pillars
  [-3.8, -1.4, 1.4, 3.8].forEach((cx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.22, bH, 0.22), toriiRedMat);
    col.position.set(cx, bH / 2 + 0.45, bD / 2 + 0.02);
    haidenGroup.add(col);
  });

  // Side & Rear Timber Pilasters & Lattice Shōji Screens
  [-bD / 2 + 0.2, 0, bD / 2 - 0.2].forEach((sz) => {
    [-1, 1].forEach((side) => {
      const sCol = new THREE.Mesh(new THREE.BoxGeometry(0.16, bH, 0.16), toriiRedMat);
      sCol.position.set(side * (bW / 2 + 0.01), bH / 2 + 0.45, sz);
      haidenGroup.add(sCol);
    });
  });
  [-1, 1].forEach((side) => {
    [-1.3, 1.3].forEach((wz) => {
      const sWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.35, 1.15), lanternGlowMat);
      sWin.position.set(side * (bW / 2 + 0.02), 2.35, wz);
      const sFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 1.25), darkWoodMat);
      sFrame.position.set(side * (bW / 2 + 0.01), 2.35, wz);
      haidenGroup.add(sFrame, sWin);
    });
  });
  [-2.2, 0, 2.2].forEach((bx) => {
    const bWin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.35, 0.06), lanternGlowMat);
    bWin.position.set(bx, 2.35, -bD / 2 - 0.02);
    const bFrame = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.45, 0.08), darkWoodMat);
    bFrame.position.set(bx, 2.35, -bD / 2 - 0.01);
    haidenGroup.add(bFrame, bWin);
  });

  const copperRoof = buildJapaneseIrimoyaRoof({
    width: bW + 1.8,
    depth: bD + 1.8,
    height: 2.7,
    roofMat: copperRoofMat,
    gableWallMat: whitePaperMat,
    trimMat: woodHinokiMat,
    goldMat,
  });
  copperRoof.position.set(0, 0.45 + bH, 0);
  haidenGroup.add(copperRoof);

  // Sacred Crossed Ridge Finials (*Chigi*) and Horizontal Log Weights (*Katsuogi*) on Top Ridge
  [-2.6, 2.6].forEach((cx) => {
    const chigi1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.25, 0.1), goldMat);
    chigi1.rotation.x = Math.PI / 5;
    chigi1.position.set(cx, bH + 0.45 + 2.85, 0);
    const chigi2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.25, 0.1), goldMat);
    chigi2.rotation.x = -Math.PI / 5;
    chigi2.position.set(cx, bH + 0.45 + 2.85, 0);
    haidenGroup.add(chigi1, chigi2);
  });

  for (let k = -1.6; k <= 1.6; k += 0.8) {
    const katsuogi = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.65, 8), goldMat);
    katsuogi.rotation.x = Math.PI / 2;
    katsuogi.position.set(k, bH + 0.45 + 2.82, 0);
    haidenGroup.add(katsuogi);
  }

  // Offering Box (*Saisenbako*), Golden *Suzu* Bell & Red-White Braided Bell Rope (*Suzu-o*)
  const saisen = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.68, 0.8), woodHinokiMat);
  saisen.position.set(0, 0.45 + 0.34, bD / 2 + 0.45);
  const suzuBell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), goldMat);
  suzuBell.position.set(0, 3.25, bD / 2 + 0.32);
  const suzuRope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 1.85, 8), toriiRedMat);
  suzuRope.position.set(0, 2.25, bD / 2 + 0.32);
  haidenGroup.add(saisen, suzuBell, suzuRope);

  // Symmetrical Center-Bulged Shimenawa Sacred Rope
  const ropeCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 12), woodHinokiMat);
  ropeCenter.rotateZ(Math.PI / 2);
  ropeCenter.position.set(0, 3.45, bD / 2 + 0.15);
  const ropeLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 2.1, 12), woodHinokiMat);
  ropeLeft.rotateZ(Math.PI / 2);
  ropeLeft.position.set(-2.25, 3.45, bD / 2 + 0.15);
  const ropeRight = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.08, 2.1, 12), woodHinokiMat);
  ropeRight.rotateZ(Math.PI / 2);
  ropeRight.position.set(2.25, 3.45, bD / 2 + 0.15);
  haidenGroup.add(ropeCenter, ropeLeft, ropeRight);

  [-1.8, -0.6, 0.6, 1.8].forEach((sx) => {
    const shide = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.03), whitePaperMat);
    shide.position.set(sx, 3.18, bD / 2 + 0.18);
    shide.rotation.z = 0.15;
    haidenGroup.add(shide);
  });

  const signTexture = createShrineSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.85, 0.12), [
    toriiRedMat, toriiRedMat, toriiRedMat, toriiRedMat, signMat, toriiRedMat,
  ]);
  signMesh.position.set(0, 4.05, bD / 2 + 0.45);
  haidenGroup.add(signMesh);

  group.add(haidenGroup);

  // 3. GRAND VERMILION MYŌJIN TORII GATE (X = 0, Z = 3.6m)
  const toriiGroup = new THREE.Group();
  toriiGroup.position.set(0, 0.15, 3.6);

  const tPostH = 4.4;
  const tPostR = 0.18;
  const tSpacing = 2.7;

  [-tSpacing / 2, tSpacing / 2].forEach((px) => {
    const nemaki = new THREE.Mesh(new THREE.CylinderGeometry(tPostR * 1.15, tPostR * 1.2, 0.75, 16), blackLacquerMat);
    nemaki.position.set(px, 0.375, 0);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(tPostR * 0.9, tPostR, tPostH, 16), toriiRedMat);
    post.position.set(px, tPostH / 2, 0);
    post.castShadow = true;
    toriiGroup.add(nemaki, post);
  });

  const nuki = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 0.24), toriiRedMat);
  nuki.position.set(0, tPostH - 0.8, 0);
  const gakuzuka = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.20), toriiRedMat);
  gakuzuka.position.set(0, tPostH - 0.4, 0);
  const shingaku = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.24), blackLacquerMat);
  shingaku.position.set(0, tPostH - 0.38, 0.03);
  const shingakuGold = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.03), goldMat);
  shingakuGold.position.set(0, tPostH - 0.38, 0.16);
  toriiGroup.add(nuki, gakuzuka, shingaku, shingakuGold);

  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.20, 0.32), toriiRedMat);
  shimaki.position.set(0, tPostH + 0.02, 0);
  const kasagiCenter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 0.38), blackLacquerMat);
  kasagiCenter.position.set(0, tPostH + 0.18, 0);
  toriiGroup.add(shimaki, kasagiCenter);

  [-2.0, 2.0].forEach((wx) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.38), blackLacquerMat);
    wing.position.set(wx, tPostH + 0.25, 0);
    wing.rotation.z = wx < 0 ? -0.16 : 0.16;
    toriiGroup.add(wing);
  });

  group.add(toriiGroup);

  // Red & White Shrine Nobori Banners flanking Approach
  [-2.85, 2.85].forEach((nx) => {
    const nPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.8, 6), bambooMat);
    nPole.position.set(nx, 1.55, 2.5);
    const nFlag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.55, 0.03), toriiRedMat);
    nFlag.position.set(nx + (nx < 0 ? 0.28 : -0.28), 2.1, 2.5);
    const nStripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.55, 0.04), whitePaperMat);
    nStripe.position.set(nx + (nx < 0 ? 0.28 : -0.28), 2.1, 2.5);
    group.add(nPole, nFlag, nStripe);
  });

  // 4. TWIN STONE GUARDIAN LION-DOGS (Komainu - Sculpted Torso, Head, Mane & Tail)
  [-2.1, 2.1].forEach((kx) => {
    const komainu = new THREE.Group();
    komainu.position.set(kx, 0.15, 3.6);

    const kBase = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.68), stoneMat);
    kBase.position.y = 0.29;
    const kBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.48, 10), stoneMat);
    kBody.position.set(0, 0.78, 0.04);
    const kHead = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 8), stoneMat);
    kHead.position.set(0, 1.06, 0.10);
    const kTail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 8), stoneMat);
    kTail.position.set(0, 0.88, -0.18);
    kTail.rotation.x = -0.35;
    komainu.add(kBase, kBody, kHead, kTail);
    group.add(komainu);
  });

  // 5. WATER PURIFICATION PAVILION (Temizuya) with Translucent Water, Bamboo Spout & Ladles
  const temizuGroup = new THREE.Group();
  temizuGroup.position.set(-3.8, 0.15, 3.6);

  const basin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 0.75), stoneMat);
  basin.position.y = 0.325;
  const basinWater = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.55), waterMat);
  basinWater.position.set(0, 0.65, 0);
  const kakehi = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 8), bambooMat);
  kakehi.rotation.z = Math.PI / 2;
  kakehi.position.set(-0.35, 0.78, 0);
  temizuGroup.add(basin, basinWater, kakehi);

  [-0.25, 0, 0.25].forEach((lx) => {
    const ladle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 6), woodHinokiMat);
    ladle.rotation.x = Math.PI / 2;
    ladle.position.set(lx, 0.68, 0.12);
    temizuGroup.add(ladle);
  });

  [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].forEach(([px, pz]) => {
    const tPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8), woodHinokiMat);
    tPost.position.set(px, 1.15, pz);
    temizuGroup.add(tPost);
  });

  const tRoof = buildJapaneseIrimoyaRoof({
    width: 1.8,
    depth: 1.4,
    height: 0.75,
    roofMat: copperRoofMat,
    gableWallMat: whitePaperMat,
    trimMat: woodHinokiMat,
    goldMat,
  });
  tRoof.position.set(0, 2.25, 0);
  temizuGroup.add(tRoof);

  group.add(temizuGroup);

  // 6. WOODEN EMA PRAYER PLAQUE RACK (Ema-kake) & OMIKUJI FORTUNE SLIP TIERS
  const emaGroup = new THREE.Group();
  emaGroup.position.set(3.8, 0.15, 3.6);

  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), woodHinokiMat);
  post1.position.set(-0.8, 1.1, 0);
  const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), woodHinokiMat);
  post2.position.set(0.8, 1.1, 0);

  const rung1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), woodHinokiMat);
  rung1.rotation.z = Math.PI / 2;
  rung1.position.set(0, 1.5, 0);

  const rung2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), woodHinokiMat);
  rung2.rotation.z = Math.PI / 2;
  rung2.position.set(0, 0.9, 0);

  const omikujiMat = new THREE.MeshStandardMaterial({ map: createOmikujiSignTexture(), roughness: 0.5 });
  const omikujiHeader = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.28, 0.04),
    [woodHinokiMat, woodHinokiMat, woodHinokiMat, woodHinokiMat, omikujiMat, woodHinokiMat]
  );
  omikujiHeader.position.set(0, 1.95, 0);

  emaGroup.add(post1, post2, rung1, rung2, omikujiHeader);

  const emaMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
  const redStringMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });

  [-0.5, -0.2, 0.1, 0.4].forEach((ex, i) => {
    const emaMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.02), emaMat);
    emaMesh.position.set(ex, 1.4, 0.02);
    emaMesh.rotation.z = i % 2 === 0 ? 0.08 : -0.08;

    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), redStringMat);
    string.position.set(ex, 1.5, 0.02);

    const omikujiPaper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.02), whitePaperMat);
    omikujiPaper.position.set(ex, 0.88, 0.02);

    emaGroup.add(emaMesh, string, omikujiPaper);
  });

  group.add(emaGroup);

  // 7. WOODEN TAMAGAKI PERIMETER FENCE & SACRED CEDAR (Goshinboku)
  [-5.85, 5.85].forEach((fx) => {
    const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 8.6), woodHinokiMat);
    sideRail.position.set(fx, 0.51, -1.5);
    group.add(sideRail);
  });
  const backTamagaki = new THREE.Mesh(new THREE.BoxGeometry(11.7, 0.72, 0.08), woodHinokiMat);
  backTamagaki.position.set(0, 0.51, -5.85);
  group.add(backTamagaki);

  if (includeLandscaping) {
    const cedar = new THREE.Group();
    cedar.position.set(4.75, 0.15, -4.35);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 2.8, 10), darkWoodMat);
    trunk.position.y = 1.4;
    const sacredBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12), woodHinokiMat);
    sacredBelt.position.y = 1.15;
    const crown1 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.0, 10), foliageMat);
    crown1.position.y = 3.1;
    const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 10), foliageMat);
    crown2.position.y = 4.1;
    cedar.add(trunk, sacredBelt, crown1, crown2);
    group.add(cedar);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
