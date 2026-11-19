import * as THREE from 'three';
import {
  getIshigakiStoneTexture,
  getKawaraTileTexture,
  getStuccoWallTexture,
  getArchitecturalBumpMap,
  buildJapaneseIrimoyaRoof,
  buildPerimeterRailing,
} from './wallTextures';

export interface CastleOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

let cachedCastleMonumentTex: THREE.CanvasTexture | null = null;

function createCastleMonumentTexture(): THREE.CanvasTexture {
  if (cachedCastleMonumentTex) return cachedCastleMonumentTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#292524';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 52px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", serif';
    ctx.textAlign = 'center';
    ctx.fillText('CASTLE', 256, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", serif';
    ctx.fillText('しろ (城) • 歴史公園', 256, 104);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.userData.isSharedResource = true;
  cachedCastleMonumentTex = texture;
  return texture;
}

/**
 * Helper to build a triangular Chidori-hafu dormer gable on a castle roof face
 */
function buildChidoriHafuDormer(
  width: number,
  height: number,
  depth: number,
  wallMat: THREE.Material,
  roofMat: THREE.Material,
  goldMat: THREE.Material
): THREE.Group {
  const dormer = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const wall = new THREE.Mesh(geo, wallMat);
  dormer.add(wall);

  const slopeLen = Math.hypot(width / 2 + 0.18, height);
  const angle = Math.atan2(height, width / 2);
  const vergeGeo = new THREE.BoxGeometry(slopeLen, 0.09, depth + 0.18);

  const leftVerge = new THREE.Mesh(vergeGeo, roofMat);
  leftVerge.position.set(-width / 4, height / 2 + 0.03, 0);
  leftVerge.rotation.z = angle;

  const rightVerge = new THREE.Mesh(vergeGeo, roofMat);
  rightVerge.position.set(width / 4, height / 2 + 0.03, 0);
  rightVerge.rotation.z = -angle;

  const apexFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), goldMat);
  apexFinial.position.set(0, height + 0.06, depth / 2 + 0.06);

  dormer.add(leftVerge, rightVerge, apexFinial);
  return dormer;
}

export function buildCastleMesh(options: CastleOptions = {}): THREE.Group {
  const {
    includeRoad = true,
    includeLandscaping = true,
    scale = 1.0,
  } = options;

  const castle = new THREE.Group();
  castle.name = 'Tier3_Castle_hwg5_u19_22';

  const bumpTex = getArchitecturalBumpMap();

  // --- Materials ---
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const rampartStoneMat = new THREE.MeshStandardMaterial({
    color: 0xa8a29e,
    map: getIshigakiStoneTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.04,
    roughness: 0.88,
  });
  const whitePlasterMat = new THREE.MeshStandardMaterial({
    color: 0xfafaf9,
    map: getStuccoWallTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.015,
    roughness: 0.45,
  });
  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: getKawaraTileTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.025,
    roughness: 0.48,
  });
  const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.68 });
  const redLacqueredMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42 });
  const goldFinialMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.82 });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  const moatWaterMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.16,
    metalness: 0.18,
    transparent: true,
    opacity: 0.86,
  });
  const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 });
  const pineFoliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
  const sakuraPinkMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xf472b6,
    emissiveIntensity: 0.18,
    roughness: 0.65,
  });

  // 1. BASE FOOTPRINT & INFRASTRUCTURE (18m x 18m Lot)
  const foundationGeo = new THREE.BoxGeometry(18.0, 0.18, 16.5);
  const foundation = new THREE.Mesh(foundationGeo, sidewalkMat);
  foundation.position.set(0, 0.09, -0.75);
  foundation.receiveShadow = true;
  castle.add(foundation);

  const sidewalkGeo = new THREE.BoxGeometry(18.0, 0.18, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalk.position.set(0, 0.09, 8.25);
  sidewalk.receiveShadow = true;
  castle.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(18.0, 0.20, 0.15);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.10, 9.0);
  curb.receiveShadow = true;
  castle.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(18.0, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 9.9);
    road.receiveShadow = true;
    castle.add(road);

    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    for (let i = -8.0; i <= 8.0; i += 2.4) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.025, 0.12);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(i, 0.02, 9.4);
      castle.add(stripe);
    }
  }

  // 2. WATER MOAT (*Hori*), GRANITE EMBANKMENTS & ARCHED VERMILION BRIDGE (*Aka-bashi*)
  const moatGeo = new THREE.BoxGeometry(17.6, 0.04, 2.8);
  const moat = new THREE.Mesh(moatGeo, moatWaterMat);
  moat.position.set(0, 0.19, 4.8);
  castle.add(moat);

  // Granite Embankment Coping Ledges along North & South Moat Banks
  [3.38, 6.22].forEach((mz) => {
    const coping = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.24, 0.28), rampartStoneMat);
    coping.position.set(0, 0.22, mz);
    castle.add(coping);
  });

  // Floating Lotus Pads in Moat
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
  [[-4.2, 4.5], [-3.6, 5.1], [3.8, 4.6], [4.5, 5.0]].forEach(([lx, lz]) => {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 10), lotusMat);
    pad.position.set(lx, 0.215, lz);
    castle.add(pad);
  });

  // Gently Arched Aka-bashi Bridge with Open Balustrade & Stepped Giboshi Finials
  for (let s = 0; s < 5; s++) {
    const t = (s / 4) * 2 - 1;
    const by = 0.28 + 0.16 * (1 - t * t);
    const bz = 4.8 + t * 1.28;
    const deckSeg = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 0.68), redLacqueredMat);
    deckSeg.position.set(0, by, bz);
    deckSeg.rotation.x = -t * 0.18;
    deckSeg.receiveShadow = true;
    castle.add(deckSeg);
  }

  [-1.4, 1.4].forEach((bx) => {
    const railGeo = new THREE.BoxGeometry(0.10, 0.09, 3.2);
    const rail = new THREE.Mesh(railGeo, redLacqueredMat);
    rail.position.set(bx, 0.82, 4.8);
    rail.castShadow = true;
    castle.add(rail);

    [-1.5, -0.75, 0, 0.75, 1.5].forEach((bz) => {
      const t = bz / 1.5;
      const baseY = 0.28 + 0.16 * (1 - t * t);
      const gPost = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.58, 8), redLacqueredMat);
      gPost.position.set(bx, baseY + 0.29, 4.8 + bz);
      const giboshi = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), goldFinialMat);
      giboshi.position.set(bx, baseY + 0.62, 4.8 + bz);
      castle.add(gPost, giboshi);
    });
  });

  // Stone Lanterns (*Tōrō*) flanking the south side of the castle bridge
  [-2.2, 2.2].forEach((lx) => {
    const lPed = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.85, 6), rampartStoneMat);
    lPed.position.set(lx, 0.60, 6.4);
    const lBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), lanternGlowMat);
    lBox.position.set(lx, 1.15, 6.4);
    const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.22, 6), rampartStoneMat);
    lCap.position.set(lx, 1.38, 6.4);
    castle.add(lPed, lBox, lCap);
  });

  // 3. 2-TIER CONCAVE ŌGI-NO-KŌBAI ISHIGAKI RAMPART & DOBEI PARAPET (Y = 0.18 to 4.18m)
  const keepGroup = new THREE.Group();
  keepGroup.position.set(0, 0.18, -1.8);

  const ishigakiLowGeo = new THREE.CylinderGeometry(9.85 * Math.SQRT1_2, 11.6 * Math.SQRT1_2, 2.0, 4);
  ishigakiLowGeo.rotateY(Math.PI / 4);
  const ishigakiLow = new THREE.Mesh(ishigakiLowGeo, rampartStoneMat);
  ishigakiLow.position.set(0, 1.0, 0);
  ishigakiLow.castShadow = true;
  ishigakiLow.receiveShadow = true;

  const ishigakiHighGeo = new THREE.CylinderGeometry(9.0 * Math.SQRT1_2, 9.85 * Math.SQRT1_2, 2.0, 4);
  ishigakiHighGeo.rotateY(Math.PI / 4);
  const ishigakiHigh = new THREE.Mesh(ishigakiHighGeo, rampartStoneMat);
  ishigakiHigh.position.set(0, 3.0, 0);
  ishigakiHigh.castShadow = true;
  ishigakiHigh.receiveShadow = true;
  keepGroup.add(ishigakiLow, ishigakiHigh);

  // Perimeter White-Plaster Dobei Parapet Wall with Tile Coping around Ishigaki Top
  [-2.9, 2.9].forEach((dx) => {
    const fWall = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 0.18), whitePlasterMat);
    fWall.position.set(dx, 4.25, 4.42);
    const fCoping = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.12, 0.28), roofTileMat);
    fCoping.position.set(dx, 4.56, 4.42);
    keepGroup.add(fWall, fCoping);
  });
  [-4.42, 4.42].forEach((sx) => {
    const sWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 8.8), whitePlasterMat);
    sWall.position.set(sx, 4.25, 0);
    const sCoping = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 8.9), roofTileMat);
    sCoping.position.set(sx, 4.56, 0);
    keepGroup.add(sWall, sCoping);
  });

  // Authentic Two-Story Ōtemon Yagura-mon Gatehouse (Clear X=0 center corridor for detail2!)
  [-1.35, 1.35].forEach((gx) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 2.4, 0.95), darkTimberMat);
    pillar.position.set(gx, 1.2, 5.1);
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.1, 0.14), darkTimberMat);
    doorLeaf.position.set(gx * 0.65, 1.05, 5.15);
    const bossStud = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), goldFinialMat);
    bossStud.position.set(gx * 0.65, 1.25, 5.24);
    keepGroup.add(pillar, doorLeaf, bossStud);
  });
  const yaguraGuard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.05, 1.05), whitePlasterMat);
  yaguraGuard.position.set(0, 2.88, 5.1);
  const yaguraWin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 1.08), darkTimberMat);
  yaguraWin.position.set(0, 2.88, 5.1);
  const gateRoof = buildJapaneseIrimoyaRoof({
    width: 4.1,
    depth: 1.7,
    height: 0.95,
    roofMat: roofTileMat,
    gableWallMat: whitePlasterMat,
    trimMat: darkTimberMat,
    goldMat: goldFinialMat,
  });
  gateRoof.position.set(0, 3.4, 5.1);
  keepGroup.add(yaguraGuard, yaguraWin, gateRoof);

  // 4. CASTLE KEEP - TIER 1 (8.2m x 8.2m, Y = 4.0 to 7.4m)
  const tier1BodyGeo = new THREE.BoxGeometry(8.2, 3.2, 8.2);
  const tier1Body = new THREE.Mesh(tier1BodyGeo, whitePlasterMat);
  tier1Body.position.set(0, 5.6, 0);
  tier1Body.castShadow = true;
  tier1Body.receiveShadow = true;
  keepGroup.add(tier1Body);

  // Lower black timber clapboard skirting (*Shitami-ita*) on Tier 1
  const tier1Skirt = new THREE.Mesh(new THREE.BoxGeometry(8.28, 1.15, 8.28), darkTimberMat);
  tier1Skirt.position.set(0, 4.58, 0);
  keepGroup.add(tier1Skirt);

  // Corner Stone-Drop Defensive Chutes (*Ishi-otoshi*) on all 4 corners of Tier 1
  [
    [-4.1, -4.1], [4.1, -4.1], [-4.1, 4.1], [4.1, 4.1],
  ].forEach(([cx, cz]) => {
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.65), darkTimberMat);
    chute.position.set(cx, 4.55, cz);
    keepGroup.add(chute);
  });

  // Barred Samurai Lattice Windows (*Mushiko-mado*) & Arrow Slits (*Sama*) on all 4 faces of Tier 1
  [-2.6, 0, 2.6].forEach((offset) => {
    const frontSlit = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.82, 0.10), darkTimberMat);
    frontSlit.position.set(offset, 6.1, 4.12);
    const backSlit = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.82, 0.10), darkTimberMat);
    backSlit.position.set(offset, 6.1, -4.12);
    const leftSlit = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.82, 0.46), darkTimberMat);
    leftSlit.position.set(-4.12, 6.1, offset);
    const rightSlit = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.82, 0.46), darkTimberMat);
    rightSlit.position.set(4.12, 6.1, offset);
    keepGroup.add(frontSlit, backSlit, leftSlit, rightSlit);
  });

  // Tier 1 Flared Hip Roof Eaves (10.2m x 10.2m overhang) + Eave Trim Fascia
  const tier1RoofGeo = new THREE.CylinderGeometry(6.6 * Math.SQRT1_2, 10.2 * Math.SQRT1_2, 1.25, 4);
  tier1RoofGeo.rotateY(Math.PI / 4);
  const tier1Roof = new THREE.Mesh(tier1RoofGeo, roofTileMat);
  tier1Roof.position.set(0, 7.6, 0);
  tier1Roof.castShadow = true;
  const tier1Fascia = new THREE.Mesh(new THREE.BoxGeometry(10.25, 0.10, 10.25), darkTimberMat);
  tier1Fascia.position.set(0, 7.0, 0);
  keepGroup.add(tier1Roof, tier1Fascia);

  // Twin Chidori-hafu Triangular Dormer Gables on Tier 1 Front & Back Roofs
  [-2.1, 2.1].forEach((dx) => {
    const dormerFront = buildChidoriHafuDormer(1.9, 0.95, 0.9, whitePlasterMat, roofTileMat, goldFinialMat);
    dormerFront.position.set(dx, 7.35, 3.85);
    const dormerBack = buildChidoriHafuDormer(1.9, 0.95, 0.9, whitePlasterMat, roofTileMat, goldFinialMat);
    dormerBack.position.set(dx, 7.35, -3.85);
    dormerBack.rotation.y = Math.PI;
    keepGroup.add(dormerFront, dormerBack);
  });

  // 5. CASTLE KEEP - TIER 2 (6.2m x 6.2m, Y = 8.1 to 11.4m)
  const tier2BodyGeo = new THREE.BoxGeometry(6.2, 3.0, 6.2);
  const tier2Body = new THREE.Mesh(tier2BodyGeo, whitePlasterMat);
  tier2Body.position.set(0, 9.6, 0);
  tier2Body.castShadow = true;
  tier2Body.receiveShadow = true;
  keepGroup.add(tier2Body);

  const tier2Skirt = new THREE.Mesh(new THREE.BoxGeometry(6.26, 0.75, 6.26), darkTimberMat);
  tier2Skirt.position.set(0, 8.5, 0);
  keepGroup.add(tier2Skirt);

  [-1.8, 0, 1.8].forEach((offset) => {
    const winF = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.78, 0.10), darkTimberMat);
    winF.position.set(offset, 9.8, 3.12);
    const winB = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.78, 0.10), darkTimberMat);
    winB.position.set(offset, 9.8, -3.12);
    const winL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.78, 0.48), darkTimberMat);
    winL.position.set(-3.12, 9.8, offset);
    const winR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.78, 0.48), darkTimberMat);
    winR.position.set(3.12, 9.8, offset);
    keepGroup.add(winF, winB, winL, winR);
  });

  // Tier 2 Flared Hip Roof Eaves (8.0m x 8.0m overhang)
  const tier2RoofGeo = new THREE.CylinderGeometry(4.6 * Math.SQRT1_2, 8.0 * Math.SQRT1_2, 1.15, 4);
  tier2RoofGeo.rotateY(Math.PI / 4);
  const tier2Roof = new THREE.Mesh(tier2RoofGeo, roofTileMat);
  tier2Roof.position.set(0, 11.55, 0);
  tier2Roof.castShadow = true;
  const tier2Fascia = new THREE.Mesh(new THREE.BoxGeometry(8.05, 0.09, 8.05), darkTimberMat);
  tier2Fascia.position.set(0, 11.0, 0);
  keepGroup.add(tier2Roof, tier2Fascia);

  // Central Grand Dormer Gables on Tier 2 Front, East & West Roofs
  const centerDormer = buildChidoriHafuDormer(2.4, 1.15, 1.0, whitePlasterMat, roofTileMat, goldFinialMat);
  centerDormer.position.set(0, 11.3, 2.9);
  const eastDormer = buildChidoriHafuDormer(2.1, 1.0, 0.9, whitePlasterMat, roofTileMat, goldFinialMat);
  eastDormer.position.set(2.9, 11.3, 0);
  eastDormer.rotation.y = Math.PI / 2;
  const westDormer = buildChidoriHafuDormer(2.1, 1.0, 0.9, whitePlasterMat, roofTileMat, goldFinialMat);
  westDormer.position.set(-2.9, 11.3, 0);
  westDormer.rotation.y = -Math.PI / 2;
  keepGroup.add(centerDormer, eastDormer, westDormer);

  // 6. CASTLE KEEP - TIER 3 / TOP KEEP & SCULPTED GOLDEN SHACHIHOKO (Y = 12.0 to 17.5m)
  const tier3BodyGeo = new THREE.BoxGeometry(4.4, 2.6, 4.4);
  const tier3Body = new THREE.Mesh(tier3BodyGeo, whitePlasterMat);
  tier3Body.position.set(0, 13.3, 0);
  tier3Body.castShadow = true;
  tier3Body.receiveShadow = true;
  keepGroup.add(tier3Body);

  // Warm Night-Glowing Shoji/Lattice Observation Windows on All 4 Faces of Tier 3
  [-1.1, 0, 1.1].forEach((wo) => {
    const t3F = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.05, 0.08), lanternGlowMat);
    t3F.position.set(wo, 13.45, 2.22);
    const t3B = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.05, 0.08), lanternGlowMat);
    t3B.position.set(wo, 13.45, -2.22);
    const t3L = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.65), lanternGlowMat);
    t3L.position.set(-2.22, 13.45, wo);
    const t3R = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.65), lanternGlowMat);
    t3R.position.set(2.22, 13.45, wo);
    keepGroup.add(t3F, t3B, t3L, t3R);
  });

  // Open Vermilion-Red Observation Deck Balustrade (*Kōran*) around Tier 3
  const koranRailing = buildPerimeterRailing(5.0, 5.0, 0.65, redLacqueredMat, 1.0);
  koranRailing.position.set(0, 12.1, 0);
  keepGroup.add(koranRailing);

  // Top Main *Irimoya* Roof (6.2m x 6.2m overhang, 2.2m tall)
  const topRoof = buildJapaneseIrimoyaRoof({
    width: 6.2,
    depth: 6.2,
    height: 2.2,
    roofMat: roofTileMat,
    gableWallMat: whitePlasterMat,
    trimMat: darkTimberMat,
    goldMat: goldFinialMat,
  });
  topRoof.position.set(0, 14.5, 0);
  keepGroup.add(topRoof);

  // Sculpted Twin Golden Shachihoko Finials (*Kinshachi* - Dragon Carps, <= 18.0m)
  [-1.9, 1.9].forEach((sx) => {
    const shachiGroup = new THREE.Group();
    shachiGroup.position.set(sx, 16.95, 0);
    shachiGroup.rotation.y = sx < 0 ? 0 : Math.PI;

    const shachiGeo = new THREE.TorusGeometry(0.32, 0.11, 8, 16, Math.PI * 1.25);
    const shachi = new THREE.Mesh(shachiGeo, goldFinialMat);
    shachi.castShadow = true;
    const dragonHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.22), goldFinialMat);
    dragonHead.position.set(0.30, -0.04, 0);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), goldFinialMat);
    horn.position.set(0.32, 0.12, 0);
    const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.04), goldFinialMat);
    dorsalFin.position.set(0, 0.34, 0);
    const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 5), goldFinialMat);
    tailFin.position.set(-0.28, 0.38, 0);
    shachiGroup.add(shachi, dragonHead, horn, dorsalFin, tailFin);

    keepGroup.add(shachiGroup);
  });

  castle.add(keepGroup);

  // 7. CIVIC FORECOURT PLAZA, GRANITE MONUMENT STELE & SAKURA/PINE TREES (Z in [+6.0, +7.5])
  const plazaGroup = new THREE.Group();
  plazaGroup.position.set(0, 0.18, 6.7);

  const monumentBaseGeo = new THREE.BoxGeometry(3.6, 0.5, 0.6);
  const monumentBase = new THREE.Mesh(monumentBaseGeo, rampartStoneMat);
  monumentBase.position.set(4.2, 0.25, 0);
  monumentBase.castShadow = true;

  const monumentSignTex = createCastleMonumentTexture();
  const monumentSignMat = new THREE.MeshStandardMaterial({
    map: monumentSignTex,
    emissive: 0xffffff,
    emissiveMap: monumentSignTex,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  const monumentStele = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.88, 0.22), [
    rampartStoneMat, rampartStoneMat, rampartStoneMat, rampartStoneMat, monumentSignMat, rampartStoneMat,
  ]);
  monumentStele.position.set(4.2, 0.88, 0.05);
  monumentStele.castShadow = true;

  plazaGroup.add(monumentBase, monumentStele);

  if (includeLandscaping) {
    // Sculpted Black Pines (*Kuromatsu*) at Front Corners
    [-5.8, 5.8].forEach((tx) => {
      const pineGroup = new THREE.Group();
      pineGroup.position.set(tx, 0, 0);

      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 3.2, 8);
      const trunk = new THREE.Mesh(trunkGeo, pineTrunkMat);
      trunk.position.set(0, 1.6, 0);
      trunk.rotation.z = tx < 0 ? -0.18 : 0.18;
      trunk.castShadow = true;
      pineGroup.add(trunk);

      [
        [0.4, 2.4, 0.0, 1.2],
        [-0.3, 3.0, 0.2, 1.5],
        [0.2, 3.8, -0.1, 1.3],
      ].forEach(([fx, fy, fz, fr]) => {
        const foliageGeo = new THREE.CylinderGeometry(fr, fr + 0.3, 0.35, 10);
        const foliage = new THREE.Mesh(foliageGeo, pineFoliageMat);
        foliage.position.set(fx, fy, fz);
        foliage.castShadow = true;
        pineGroup.add(foliage);
      });

      plazaGroup.add(pineGroup);
    });

    // Blooming Sakura Cherry Blossom Trees overhanging the Castle Moat (X = ±6.8m, Z = 2.8m)
    [-6.8, 6.8].forEach((sx) => {
      const sTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.4, 8), pineTrunkMat);
      sTrunk.position.set(sx, 1.38, 2.8);
      const sCanopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.45, 1), sakuraPinkMat);
      sCanopy1.position.set(sx, 3.1, 2.8);
      sCanopy1.castShadow = true;
      const sCanopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), sakuraPinkMat);
      sCanopy2.position.set(sx * 0.88, 2.75, 3.4);
      castle.add(sTrunk, sCanopy1, sCanopy2);
    });
  }

  castle.add(plazaGroup);

  if (scale !== 1.0) {
    castle.scale.setScalar(scale);
  }

  return castle;
}
