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

  // 2. WATER MOAT (*Hori*), STONE EMBANKMENT & VERMILION LACQUER BRIDGE (*Aka-bashi*)
  const moatGeo = new THREE.BoxGeometry(17.6, 0.04, 2.8);
  const moat = new THREE.Mesh(moatGeo, moatWaterMat);
  moat.position.set(0, 0.19, 4.8);
  castle.add(moat);

  const bridgeGeo = new THREE.BoxGeometry(3.0, 0.24, 3.2);
  const bridge = new THREE.Mesh(bridgeGeo, redLacqueredMat);
  bridge.position.set(0, 0.26, 4.8);
  bridge.receiveShadow = true;
  castle.add(bridge);

  [-1.4, 1.4].forEach((bx) => {
    const railGeo = new THREE.BoxGeometry(0.12, 0.45, 3.2);
    const rail = new THREE.Mesh(railGeo, redLacqueredMat);
    rail.position.set(bx, 0.52, 4.8);
    rail.castShadow = true;
    castle.add(rail);

    [-1.5, 0, 1.5].forEach((bz) => {
      const gPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8), redLacqueredMat);
      gPost.position.set(bx, 0.62, 4.8 + bz);
      const giboshi = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), goldFinialMat);
      giboshi.position.set(bx, 0.98, 4.8 + bz);
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

  // 3. STONE RAMPART FOUNDATION (*Ishigaki* Base: Y = 0.18 to 4.18m)
  const keepGroup = new THREE.Group();
  keepGroup.position.set(0, 0.18, -1.8);

  const ishigakiGeo = new THREE.CylinderGeometry(9.0 * Math.SQRT1_2, 11.4 * Math.SQRT1_2, 4.0, 4);
  ishigakiGeo.rotateY(Math.PI / 4);
  const ishigaki = new THREE.Mesh(ishigakiGeo, rampartStoneMat);
  ishigaki.position.set(0, 2.0, 0);
  ishigaki.castShadow = true;
  ishigaki.receiveShadow = true;
  keepGroup.add(ishigaki);

  // Fortified Two-Story Timber Gate (*Ōtemon / Yagura-mon*) recessed into front ramparts
  const gateArchGeo = new THREE.BoxGeometry(3.0, 2.8, 0.9);
  const gateArch = new THREE.Mesh(gateArchGeo, darkTimberMat);
  gateArch.position.set(0, 1.4, 5.1);
  gateArch.castShadow = true;
  const gateRoof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.24, 1.3), roofTileMat);
  gateRoof.position.set(0, 2.9, 5.1);
  keepGroup.add(gateArch, gateRoof);

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

  // Tier 1 Flared Hip Roof Eaves (10.2m x 10.2m overhang)
  const tier1RoofGeo = new THREE.CylinderGeometry(6.6 * Math.SQRT1_2, 10.2 * Math.SQRT1_2, 1.25, 4);
  tier1RoofGeo.rotateY(Math.PI / 4);
  const tier1Roof = new THREE.Mesh(tier1RoofGeo, roofTileMat);
  tier1Roof.position.set(0, 7.6, 0);
  tier1Roof.castShadow = true;
  keepGroup.add(tier1Roof);

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
  keepGroup.add(tier2Roof);

  // Central Grand Dormer Gable on Tier 2 Front, East & West Roofs
  const centerDormer = buildChidoriHafuDormer(2.4, 1.15, 1.0, whitePlasterMat, roofTileMat, goldFinialMat);
  centerDormer.position.set(0, 11.3, 2.9);
  keepGroup.add(centerDormer);

  // 6. CASTLE KEEP - TIER 3 / TOP KEEP & GOLDEN SHACHIHOKO (Y = 12.0 to 17.5m)
  const tier3BodyGeo = new THREE.BoxGeometry(4.4, 2.6, 4.4);
  const tier3Body = new THREE.Mesh(tier3BodyGeo, whitePlasterMat);
  tier3Body.position.set(0, 13.3, 0);
  tier3Body.castShadow = true;
  tier3Body.receiveShadow = true;
  keepGroup.add(tier3Body);

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

  // Twin Golden Shachihoko Finials (*Kinshachi* - Dragon Carps) crowning the main ridge at Y = 16.95m
  [-1.9, 1.9].forEach((sx) => {
    const shachiGroup = new THREE.Group();
    shachiGroup.position.set(sx, 16.95, 0);
    shachiGroup.rotation.y = sx < 0 ? 0 : Math.PI;

    const shachiGeo = new THREE.TorusGeometry(0.32, 0.11, 8, 16, Math.PI * 1.25);
    const shachi = new THREE.Mesh(shachiGeo, goldFinialMat);
    shachi.castShadow = true;
    const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 5), goldFinialMat);
    tailFin.position.set(-0.28, 0.38, 0);
    shachiGroup.add(shachi, tailFin);

    keepGroup.add(shachiGroup);
  });

  castle.add(keepGroup);

  // 7. CIVIC FORECOURT PLAZA, MONUMENT & SAKURA/PINE TREES (Z in [+6.0, +7.5])
  const plazaGroup = new THREE.Group();
  plazaGroup.position.set(0, 0.18, 6.7);

  const monumentBaseGeo = new THREE.BoxGeometry(3.6, 0.5, 0.6);
  const monumentBase = new THREE.Mesh(monumentBaseGeo, rampartStoneMat);
  monumentBase.position.set(4.2, 0.25, 0);
  monumentBase.castShadow = true;

  const monumentSignGeo = new THREE.PlaneGeometry(3.4, 0.85);
  const monumentSignMat = new THREE.MeshBasicMaterial({ map: createCastleMonumentTexture() });
  const monumentSign = new THREE.Mesh(monumentSignGeo, monumentSignMat);
  monumentSign.position.set(4.2, 0.75, 0.25);
  monumentSign.rotation.x = -0.15;

  plazaGroup.add(monumentBase, monumentSign);

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
