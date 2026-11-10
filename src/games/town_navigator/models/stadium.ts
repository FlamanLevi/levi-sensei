import * as THREE from 'three';
import { getConcretePanelTexture, getArchitecturalBumpMap } from './wallTextures';

export interface StadiumOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

let cachedScoreboardTex: THREE.CanvasTexture | null = null;
let cachedEntranceBannerTex: THREE.CanvasTexture | null = null;

function createScoreboardTexture(): THREE.CanvasTexture {
  if (cachedScoreboardTex) return cachedScoreboardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 244);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 36px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MIDORI ARENA STADIUM', 256, 48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.fillText('市立陸上競技場・サッカースタジアム', 256, 76);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, 96, 432, 100);

    ctx.fillStyle = '#f87171';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('RED TEAM', 56, 145);

    ctx.fillStyle = '#22c55e';
    ctx.font = '900 46px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2 - 1', 256, 152);

    ctx.fillStyle = '#60a5fa';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BLUE TEAM', 456, 145);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MATCH TIME: 84:20  [2nd HALF]', 256, 230);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  cachedScoreboardTex = texture;
  return texture;
}

function createEntranceBannerTexture(): THREE.CanvasTexture {
  if (cachedEntranceBannerTex) return cachedEntranceBannerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 48px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STADIUM', 256, 58);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.fillText('競技場 (スタジアム)', 256, 102);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  cachedEntranceBannerTex = texture;
  return texture;
}

/**
 * Tier 3: Stadium (競技場・スタジアム) - `hwg5_u19_15`
 * Footprint: strictly within 18.0m x 18.0m (3U x 3U)
 * Maximum Height: 17.2m (Floodlight Towers <= 18.0m)
 */
export function buildStadiumMesh(options: StadiumOptions = {}): THREE.Group {
  const {
    includeRoad = true,
    includeLandscaping = true,
    scale = 1.0,
  } = options;

  const stadium = new THREE.Group();
  stadium.name = 'Tier3_Stadium_hwg5_u19_15';

  const bumpTex = getArchitecturalBumpMap();

  // --- Materials ---
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const concourseMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.8 });
  const arenaWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    map: getConcretePanelTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.02,
    roughness: 0.5,
  });
  const arenaAccentMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45, metalness: 0.15 });
  const turfDarkMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
  const turfLightMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
  const pitchLineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const bleacherBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
  const bleacherSkyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 });
  const canopyWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.38, metalness: 0.65 });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xfef08a,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const ledRibbonMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    roughness: 0.3,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.68,
  });
  const goalPostMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.25 });
  const goalNetMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.45,
    wireframe: true,
  });

  // 1. BASE FOOTPRINT & INFRASTRUCTURE (18m x 18m Lot)
  const foundationGeo = new THREE.BoxGeometry(18.0, 0.18, 16.5);
  const foundation = new THREE.Mesh(foundationGeo, concourseMat);
  foundation.position.set(0, 0.09, -0.75);
  foundation.receiveShadow = true;
  stadium.add(foundation);

  // Unobstructed Pedestrian Sidewalk: Z in [+7.5, +9.0]
  const sidewalkGeo = new THREE.BoxGeometry(18.0, 0.18, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalk.position.set(0, 0.09, 8.25);
  sidewalk.receiveShadow = true;
  stadium.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(18.0, 0.20, 0.15);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.10, 9.0);
  curb.receiveShadow = true;
  stadium.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(18.0, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 9.9);
    road.receiveShadow = true;
    stadium.add(road);

    for (let i = -8.0; i <= 8.0; i += 2.4) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.025, 0.12);
      const stripe = new THREE.Mesh(stripeGeo, pitchLineMat);
      stripe.position.set(i, 0.02, 9.4);
      stadium.add(stripe);
    }
  }

  // 2. STADIUM ARENA BOWL (Outer Facade: 16.0m x 12.6m, Height: 7.2m)
  const arenaGroup = new THREE.Group();
  arenaGroup.position.set(0, 0.18, -1.2);

  const outerWallGeo = new THREE.CylinderGeometry(8.0, 7.6, 7.0, 32, 1, true);
  outerWallGeo.scale(1.0, 1.0, 0.78);
  const outerWall = new THREE.Mesh(outerWallGeo, arenaWallMat);
  outerWall.position.set(0, 3.5, 0);
  outerWall.castShadow = true;
  outerWall.receiveShadow = true;
  arenaGroup.add(outerWall);

  const rimGeo = new THREE.CylinderGeometry(8.18, 8.18, 0.65, 32, 1, true);
  rimGeo.scale(1.0, 1.0, 0.78);
  const rim = new THREE.Mesh(rimGeo, arenaAccentMat);
  rim.position.set(0, 6.8, 0);
  arenaGroup.add(rim);

  // Exterior Concourse Windows & Vertical Facade Ribs
  const ribGeo = new THREE.BoxGeometry(0.24, 7.0, 0.38);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    const rib = new THREE.Mesh(ribGeo, arenaAccentMat);
    const rx = Math.sin(a) * 8.05;
    const rz = Math.cos(a) * 8.05 * 0.78;
    rib.position.set(rx, 3.5, rz);
    rib.rotation.y = a;
    rib.castShadow = true;
    arenaGroup.add(rib);
  }

  // 3. GREEN SOCCER PITCH, TWO-TONE MOWED STRIPES, RUNNING TRACK & GOALS (detail1)
  const trackMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 });
  const trackGeo = new THREE.BoxGeometry(12.4, 0.04, 8.4);
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.position.set(0, 0.38, 0);
  track.receiveShadow = true;
  arenaGroup.add(track);

  for (let l = 1; l <= 2; l++) {
    const w = 9.8 + l * 1.1;
    const d = 6.2 + l * 1.0;
    const lineThickness = 0.05;

    const northSouthGeo = new THREE.BoxGeometry(w, 0.01, lineThickness);
    const northLine = new THREE.Mesh(northSouthGeo, pitchLineMat);
    northLine.position.set(0, 0.405, -d / 2);
    const southLine = new THREE.Mesh(northSouthGeo, pitchLineMat);
    southLine.position.set(0, 0.405, d / 2);

    const eastWestGeo = new THREE.BoxGeometry(lineThickness, 0.01, d);
    const westLine = new THREE.Mesh(eastWestGeo, pitchLineMat);
    westLine.position.set(-w / 2, 0.405, 0);
    const eastLine = new THREE.Mesh(eastWestGeo, pitchLineMat);
    eastLine.position.set(w / 2, 0.405, 0);

    arenaGroup.add(northLine, southLine, westLine, eastLine);
  }

  const numBands = 8;
  const bandW = 9.6 / numBands;
  for (let b = 0; b < numBands; b++) {
    const bx = -4.8 + (b + 0.5) * bandW;
    const bandMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bandW, 0.05, 6.0),
      b % 2 === 0 ? turfDarkMat : turfLightMat
    );
    bandMesh.position.set(bx, 0.41, 0);
    bandMesh.receiveShadow = true;
    arenaGroup.add(bandMesh);
  }

  const touchLineN = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.01, 0.08), pitchLineMat);
  touchLineN.position.set(0, 0.44, -2.96);
  const touchLineS = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.01, 0.08), pitchLineMat);
  touchLineS.position.set(0, 0.44, 2.96);
  const goalLineW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 6.0), pitchLineMat);
  goalLineW.position.set(-4.76, 0.44, 0);
  const goalLineE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 6.0), pitchLineMat);
  goalLineE.position.set(4.76, 0.44, 0);
  arenaGroup.add(touchLineN, touchLineS, goalLineW, goalLineE);

  const centerCircleGeo = new THREE.RingGeometry(1.0, 1.08, 32);
  const centerCircle = new THREE.Mesh(centerCircleGeo, pitchLineMat);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, 0.44, 0);
  const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 5.9), pitchLineMat);
  centerLine.position.set(0, 0.44, 0);
  const soccerBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), pitchLineMat);
  soccerBall.position.set(0, 0.53, 0);
  arenaGroup.add(centerCircle, centerLine, soccerBall);

  // Miniature 3D Soccer Players on Pitch (Red Team vs. Blue Team)
  const redKitMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  const blueKitMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.6 });
  [
    { x: -2.2, z: -0.9, mat: redKitMat },
    { x: -1.1, z: 0.8, mat: redKitMat },
    { x: -4.2, z: 0.0, mat: redKitMat },
    { x: 2.2, z: 0.9, mat: blueKitMat },
    { x: 1.1, z: -0.8, mat: blueKitMat },
    { x: 4.2, z: 0.0, mat: blueKitMat },
  ].forEach((p) => {
    const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.36, 8), p.mat);
    pBody.position.set(p.x, 0.62, p.z);
    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    pHead.position.set(p.x, 0.88, p.z);
    arenaGroup.add(pBody, pHead);
  });

  // Penalty Boxes, 6-Yard Goal Boxes & 4 Corner Flags
  [-4.4, 4.4].forEach((px) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 3.2), pitchLineMat);
    box.position.set(px > 0 ? px - 1.0 : px + 1.0, 0.44, 0);
    const boxTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.01, 0.08), pitchLineMat);
    boxTop.position.set(px > 0 ? px - 0.3 : px + 0.3, 0.44, 1.6);
    const boxBtm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.01, 0.08), pitchLineMat);
    boxBtm.position.set(px > 0 ? px - 0.3 : px + 0.3, 0.44, -1.6);
    arenaGroup.add(box, boxTop, boxBtm);
  });

  [
    [-4.7, -2.9], [4.7, -2.9], [-4.7, 2.9], [4.7, 2.9],
  ].forEach(([cx, cz]) => {
    const cPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), pitchLineMat);
    cPole.position.set(cx, 0.65, cz);
    const cFlag = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.11, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
    );
    cFlag.position.set(cx + 0.08, 0.82, cz);
    arenaGroup.add(cPole, cFlag);
  });

  // Glowing LED Perimeter Advertising Boards along North & South Touchlines
  [-3.45, 3.45].forEach((az) => {
    const adBoard = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.32, 0.06), ledRibbonMat);
    adBoard.position.set(0, 0.56, az);
    arenaGroup.add(adBoard);
  });

  // Team Dugout Benches
  [-2.2, 2.2].forEach((dx) => {
    const dugoutGroup = new THREE.Group();
    dugoutGroup.position.set(dx, 0.42, 3.2);
    const dCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.6), arenaAccentMat);
    dCanopy.position.set(0, 0.85, 0);
    const dBench = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    dBench.position.set(0, 0.15, -0.05);
    dugoutGroup.add(dCanopy, dBench);
    arenaGroup.add(dugoutGroup);
  });

  // Soccer Goals with Translucent Goal Nets (Left & Right)
  [-4.95, 4.95].forEach((gx) => {
    const goalGroup = new THREE.Group();
    goalGroup.position.set(gx, 0.43, 0);

    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8);
    const leftPost = new THREE.Mesh(postGeo, goalPostMat);
    leftPost.position.set(0, 0.475, -0.95);
    const rightPost = new THREE.Mesh(postGeo, goalPostMat);
    rightPost.position.set(0, 0.475, 0.95);

    const crossbarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.9, 8);
    const crossbar = new THREE.Mesh(crossbarGeo, goalPostMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(0, 0.95, 0);

    const netDepth = 0.48;
    const netOffset = gx < 0 ? -netDepth / 2 : netDepth / 2;
    const netCage = new THREE.Mesh(new THREE.BoxGeometry(netDepth, 0.92, 1.86), goalNetMat);
    netCage.position.set(netOffset, 0.46, 0);

    goalGroup.add(leftPost, rightPost, crossbar, netCage);
    arenaGroup.add(goalGroup);
  });

  // 4. STEPPED TIERED BLEACHERS, VIP PRESS BOX & CANTILEVERED ROOF CANOPY
  for (let tier = 1; tier <= 4; tier++) {
    const tierGeo = new THREE.CylinderGeometry(
      5.6 + tier * 0.55,
      5.4 + tier * 0.55,
      0.48,
      32,
      1,
      true
    );
    tierGeo.scale(1.0, 1.0, 0.78);
    const bleachers = new THREE.Mesh(
      tierGeo,
      tier % 2 === 0 ? bleacherBlueMat : bleacherSkyMat
    );
    bleachers.position.set(0, 0.5 + tier * 0.65, 0);
    arenaGroup.add(bleachers);
  }

  const vipBox = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.15, 0.95), glassMat);
  vipBox.position.set(0, 5.6, -5.4);
  const northRoofCanopy = new THREE.Mesh(
    new THREE.CylinderGeometry(8.2, 6.2, 0.16, 24, 1, true, Math.PI * 0.65, Math.PI * 0.7),
    canopyWhiteMat
  );
  northRoofCanopy.scale.set(1.0, 1.0, 0.78);
  northRoofCanopy.position.set(0, 7.15, 0);
  arenaGroup.add(vipBox, northRoofCanopy);

  // 5. GIANT ILLUMINATED LED JUMBOTRON SCOREBOARD (detail2: North Stand)
  const scoreboardGroup = new THREE.Group();
  scoreboardGroup.position.set(0, 8.3, -5.2);

  const boardFrameGeo = new THREE.BoxGeometry(4.8, 2.4, 0.32);
  const boardFrame = new THREE.Mesh(boardFrameGeo, pylonMat);
  boardFrame.castShadow = true;

  const boardScreenGeo = new THREE.PlaneGeometry(4.6, 2.2);
  const scoreTex = createScoreboardTexture();
  const boardMat = new THREE.MeshStandardMaterial({
    map: scoreTex,
    emissive: 0xffffff,
    emissiveMap: scoreTex,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const boardScreen = new THREE.Mesh(boardScreenGeo, boardMat);
  boardScreen.position.set(0, 0, 0.17);

  scoreboardGroup.add(boardFrame, boardScreen);
  arenaGroup.add(scoreboardGroup);

  // 6. FOUR CORNER FLOODLIGHT TOWERS WITH CATWALKS (detail2: Height 17.2m <= 18m limit)
  const towerPositions = [
    [-7.2, -4.8],
    [+7.2, -4.8],
    [-7.2, +3.2],
    [+7.2, +3.2],
  ];

  towerPositions.forEach(([tx, tz]) => {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(tx, 0.18, tz);

    const pylonGeo = new THREE.CylinderGeometry(0.2, 0.45, 16.0, 10);
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.set(0, 8.0, 0);
    pylon.castShadow = true;
    towerGroup.add(pylon);

    for (let h = 2.0; h < 15.5; h += 2.5) {
      const ringGeo = new THREE.TorusGeometry(0.38 - h * 0.015, 0.04, 6, 12);
      ringGeo.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, pylonMat);
      ring.position.set(0, h, 0);
      towerGroup.add(ring);
    }

    const catwalk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.10, 0.9), pylonMat);
    catwalk.position.set(0, 15.3, 0);
    const catwalkRail = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.35, 0.95), arenaAccentMat);
    catwalkRail.position.set(0, 15.5, 0);
    towerGroup.add(catwalk, catwalkRail);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 16.2, 0);
    headGroup.lookAt(0, 0.4, -1.2);

    const headFrameGeo = new THREE.BoxGeometry(1.75, 1.25, 0.35);
    const headFrame = new THREE.Mesh(headFrameGeo, pylonMat);
    headGroup.add(headFrame);

    for (let col = -0.55; col <= 0.55; col += 0.55) {
      for (let row = -0.35; row <= 0.35; row += 0.7) {
        const lampGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12);
        lampGeo.rotateX(Math.PI / 2);
        const lamp = new THREE.Mesh(lampGeo, lampGlowMat);
        lamp.position.set(col, row, 0.2);
        headGroup.add(lamp);
      }
    }

    towerGroup.add(headGroup);
    stadium.add(towerGroup);
  });

  stadium.add(arenaGroup);

  // 7. CIVIC FORECOURT ENTRANCE PLAZA (Z in [+6.0, +7.5])
  const plazaGroup = new THREE.Group();
  plazaGroup.position.set(0, 0.18, 6.5);

  const archGroup = new THREE.Group();
  const colGeo = new THREE.BoxGeometry(0.65, 4.2, 0.65);
  const leftCol = new THREE.Mesh(colGeo, arenaAccentMat);
  leftCol.position.set(-3.2, 2.1, 0);
  leftCol.castShadow = true;

  const rightCol = new THREE.Mesh(colGeo, arenaAccentMat);
  rightCol.position.set(3.2, 2.1, 0);
  rightCol.castShadow = true;

  const bannerGeo = new THREE.BoxGeometry(7.0, 1.1, 0.32);
  const banner = new THREE.Mesh(bannerGeo, arenaAccentMat);
  banner.position.set(0, 4.4, 0);
  banner.castShadow = true;

  const bannerSignGeo = new THREE.PlaneGeometry(6.6, 0.95);
  const bannerTex = createEntranceBannerTexture();
  const bannerSignMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    emissive: 0xffffff,
    emissiveMap: bannerTex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const bannerSign = new THREE.Mesh(bannerSignGeo, bannerSignMat);
  bannerSign.position.set(0, 4.4, 0.17);

  archGroup.add(leftCol, rightCol, banner, bannerSign);
  plazaGroup.add(archGroup);

  [-1.6, 0, 1.6].forEach((tx) => {
    const turnstileGeo = new THREE.BoxGeometry(0.35, 0.95, 0.8);
    const turnstile = new THREE.Mesh(turnstileGeo, pylonMat);
    turnstile.position.set(tx, 0.48, -0.4);
    turnstile.castShadow = true;
    plazaGroup.add(turnstile);
  });

  if (includeLandscaping) {
    [-5.5, +5.5].forEach((fx) => {
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 5.5, 8);
      const pole = new THREE.Mesh(poleGeo, pylonMat);
      pole.position.set(fx, 2.75, 0);
      pole.castShadow = true;

      const flagGeo = new THREE.PlaneGeometry(1.0, 0.6);
      const flagMat = new THREE.MeshStandardMaterial({
        color: fx < 0 ? 0x2563eb : 0xdc2626,
        roughness: 0.6,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(fx + 0.5, 5.0, 0);
      plazaGroup.add(pole, flag);
    });
  }

  stadium.add(plazaGroup);

  if (scale !== 1.0) {
    stadium.scale.setScalar(scale);
  }

  return stadium;
}
