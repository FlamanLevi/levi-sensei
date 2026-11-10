import * as THREE from 'three';
import {
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedSchoolClockTex: THREE.CanvasTexture | null = null;
let cachedSchoolPlaqueTex: THREE.CanvasTexture | null = null;
let cachedSchoolHeaderTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Elementary School clock face
 */
function createClockTexture(): THREE.CanvasTexture {
  if (cachedSchoolClockTex) return cachedSchoolClockTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const isMajor = i % 3 === 0;
    const r1 = 110;
    const r2 = isMajor ? 88 : 98;
    ctx.beginPath();
    ctx.lineWidth = isMajor ? 6 : 3;
    ctx.moveTo(128 + Math.cos(angle) * r1, 128 + Math.sin(angle) * r1);
    ctx.lineTo(128 + Math.cos(angle) * r2, 128 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(-Math.PI * 0.65) * 55, 128 + Math.sin(-Math.PI * 0.65) * 55);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(-Math.PI * 0.15) * 80, 128 + Math.sin(-Math.PI * 0.15) * 80);
  ctx.stroke();

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(128, 128, 8, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedSchoolClockTex = texture;
  return texture;
}

/**
 * Procedural texture for School Gate Name Plaque
 */
function createSchoolPlaqueTexture(): THREE.CanvasTexture {
  if (cachedSchoolPlaqueTex) return cachedSchoolPlaqueTex;
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 384, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 372, 116);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 30px sans-serif';
  ctx.fillText('ELEMENTARY SCHOOL', 192, 45);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('市立緑小学校', 192, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedSchoolPlaqueTex = texture;
  return texture;
}

/**
 * Procedural texture for Main Facade Header Sign ("SCHOOL / 小学校")
 */
function createSchoolHeaderTexture(): THREE.CanvasTexture {
  if (cachedSchoolHeaderTex) return cachedSchoolHeaderTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e40af';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(64, 64, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '900 28px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('小', 64, 64);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('SCHOOL', 118, 46);
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 22px "BIZ UDPGothic", sans-serif';
  ctx.fillText('緑小学校 (ELEMENTARY)', 120, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedSchoolHeaderTex = texture;
  return texture;
}

export interface SchoolOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese Elementary School (hwg5_u19_01)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildSchoolMesh(options: SchoolOptions = {}): THREE.Group {
  const { includeRoad = true, includeLandscaping = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'School_hwg5_u19_01';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    map: getBrickTileTexture(),
    roughness: 0.7,
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const metalFenceMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });

  // 1. PROPERTY BASE (12.0m × 12.0m Lot)
  const lotSize = 12.0;

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

  // 2. MAIN 3-STORY SCHOOL BUILDING
  const schoolBuilding = new THREE.Group();
  schoolBuilding.position.set(0, 0.15, -0.6);

  const bW = 10.0;
  const bD = 6.4;
  const bH = 8.4;

  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 0.25, bD + 0.1), foundationMat);
  baseMesh.position.y = 0.125;
  baseMesh.receiveShadow = true;
  schoolBuilding.add(baseMesh);

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), wallMat);
  bodyMesh.position.y = bH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  schoolBuilding.add(bodyMesh);

  [2.8, 5.6, 8.4].forEach(sy => {
    const band = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.08, 0.16, bD + 0.08), accentMat);
    band.position.y = sy;
    schoolBuilding.add(band);
  });

  // Open Rooftop Safety Perimeter Railing (Replaces old solid bunker block!)
  const roofRailing = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.80, metalFenceMat, 1.6);
  roofRailing.position.set(0, bH + 0.08, 0);
  schoolBuilding.add(roofRailing);

  // 360° Side & Rear Classroom Windows
  addWrapAroundWindows({
    targetGroup: schoolBuilding,
    bW,
    bD,
    floorHeights: [1.4, 4.2, 7.0],
    winW: 1.1,
    winH: 1.35,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: darkMetalMat,
  });

  // Ribbon Windows Across all 3 Stories (Front Classrooms)
  const numCols = 6;
  const colSpacing = (bW - 2.4) / numCols;
  for (let story = 0; story < 3; story++) {
    const wy = 1.4 + story * 2.8;
    for (let c = 0; c < numCols; c++) {
      const wx = -(bW - 2.4) / 2 + (c + 0.5) * colSpacing;
      if (story === 0 && Math.abs(wx) < 1.2) continue;

      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(colSpacing * 0.82, 1.4, 0.06), darkMetalMat);
      winFrame.position.set(wx, wy, bD / 2 + 0.015);
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(colSpacing * 0.78, 1.32, 0.06), glassMat);
      winGlass.position.set(wx, wy, bD / 2 + 0.03);
      schoolBuilding.add(winFrame, winGlass);
    }
  }

  // 3. CENTRAL ENTRANCE & CLOCK TOWER (detail1: Height 10.6m <= 12.0m)
  const towerW = 2.4;
  const towerD = 1.0;
  const towerH = 10.6;

  const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
  const tower = new THREE.Mesh(towerGeo, wallMat);
  tower.position.set(0, towerH / 2, bD / 2 + towerD / 2 - 0.2);
  tower.castShadow = true;
  schoolBuilding.add(tower);

  const towerCap = new THREE.Mesh(new THREE.BoxGeometry(towerW + 0.14, 0.22, towerD + 0.14), accentMat);
  towerCap.position.set(0, towerH + 0.11, bD / 2 + towerD / 2 - 0.2);
  schoolBuilding.add(towerCap);

  const clockTexture = createClockTexture();
  const clockMat = new THREE.MeshStandardMaterial({
    map: clockTexture,
    emissive: 0xffffff,
    emissiveMap: clockTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const clockMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), [
    darkMetalMat, clockMat, darkMetalMat
  ]);
  clockMesh.rotateX(Math.PI / 2);
  clockMesh.position.set(0, 9.4, bD / 2 + towerD - 0.15);
  schoolBuilding.add(clockMesh);

  // Prominent Header Signboard on Central Tower
  const headerMat = new THREE.MeshStandardMaterial({
    map: createSchoolHeaderTexture(),
    emissive: 0xffffff,
    emissiveMap: createSchoolHeaderTexture(),
    emissiveIntensity: 0.3,
    roughness: 0.4,
  });
  const headerSign = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.68, 0.08), [
    accentMat, accentMat, accentMat, accentMat, headerMat, accentMat,
  ]);
  headerSign.position.set(0, 3.25, bD / 2 + towerD - 0.14);
  schoolBuilding.add(headerSign);

  // Ground Floor Entrance Canopy & Shoe-Locker Hallway (Shōkōguchi)
  const canopyW = 3.2;
  const canopyD = 1.4;
  const canopyH = 0.18;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyW, canopyH, canopyD), accentMat);
  canopy.position.set(0, 2.7, bD / 2 + canopyD / 2);
  canopy.castShadow = true;
  schoolBuilding.add(canopy);

  [-canopyW / 2 + 0.15, canopyW / 2 - 0.15].forEach(px => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 12), darkMetalMat);
    pillar.position.set(px, 1.35, bD / 2 + canopyD - 0.15);
    pillar.castShadow = true;
    schoolBuilding.add(pillar);
  });

  const doorGeo = new THREE.BoxGeometry(1.8, 2.2, 0.06);
  const door = new THREE.Mesh(doorGeo, glassMat);
  door.position.set(0, 1.1, bD / 2 + towerD - 0.16);
  const doorBorder = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.26, 0.04), darkMetalMat);
  doorBorder.position.set(0, 1.1, bD / 2 + towerD - 0.18);
  schoolBuilding.add(doorBorder, door);

  group.add(schoolBuilding);

  // 4. FORECOURT / COURTYARD PROPS (detail2: Centered Gateposts & Plaque at Z = 4.1m)
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0.15, 4.1);

  const postGeo = new THREE.BoxGeometry(0.46, 1.85, 0.46);
  const postL = new THREE.Mesh(postGeo, foundationMat);
  postL.position.set(-1.85, 0.925, 0);
  postL.castShadow = true;
  const postR = new THREE.Mesh(postGeo, foundationMat);
  postR.position.set(1.85, 0.925, 0);
  postR.castShadow = true;
  gateGroup.add(postL, postR);

  const plaqueTexture = createSchoolPlaqueTexture();
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTexture, roughness: 0.4 });
  const plaqueMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.68, 0.04), [
    foundationMat, foundationMat, foundationMat, foundationMat, plaqueMat, foundationMat
  ]);
  plaqueMesh.position.set(-1.85, 1.15, 0.24);
  gateGroup.add(plaqueMesh);
  group.add(gateGroup);

  // Flagpole with waving school banner (Right plaza: X = 3.6m, Z = 3.8m)
  const flagGroup = new THREE.Group();
  flagGroup.position.set(3.6, 0.15, 3.8);

  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 6.5, 12), metalFenceMat);
  flagPole.position.y = 3.25;
  flagPole.castShadow = true;
  flagGroup.add(flagPole);

  const flagGeo = new THREE.BoxGeometry(0.9, 0.6, 0.02);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(0.45, 6.0, 0);
  flagGroup.add(flag);
  group.add(flagGroup);

  // 5. BACKYARD PERIMETER & SCHOOL POOL / PLAYGROUND
  if (includeLandscaping) {
    const wallH = 1.4;
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(lotSize, wallH, 0.1), foundationMat);
    backWall.position.set(0, 0.15 + wallH / 2, -5.9);
    group.add(backWall);

    // School Swimming Pool (X = -3.1, Z = -3.9)
    const poolGroup = new THREE.Group();
    poolGroup.position.set(-3.1, 0.15, -3.9);

    const poolDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 3.2), foundationMat);
    poolDeck.position.set(0, 0.025, 0);
    poolDeck.receiveShadow = true;
    poolGroup.add(poolDeck);

    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 2.6), poolWaterMat);
    poolWater.position.set(0, 0.03, 0);
    poolGroup.add(poolWater);

    const laneRopeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    [-0.45, 0.45].forEach((lz) => {
      const lane = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.4, 6), laneRopeMat);
      lane.rotation.z = Math.PI / 2;
      lane.position.set(0, 0.065, lz);
      poolGroup.add(lane);
    });

    const blockMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
    [-0.9, 0, 0.9].forEach((bz) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.35), blockMat);
      block.position.set(-1.6, 0.11, bz);
      poolGroup.add(block);
    });

    group.add(poolGroup);

    // 3-Tier Horizontal Pull-Up Bars (Tetsubō)
    const teppouGroup = new THREE.Group();
    teppouGroup.position.set(2.8, 0.15, -4.0);

    const barColors = [0xef4444, 0xfacc15, 0x3b82f6];
    const barHeights = [0.85, 1.1, 1.35];

    [-1.2, 0, 1.2].forEach((bx, idx) => {
      const h = barHeights[idx];
      const barColorMat = new THREE.MeshStandardMaterial({ color: barColors[idx], roughness: 0.4 });

      const vPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 8), darkMetalMat);
      vPost.position.set(bx - 0.45, h / 2, 0);
      const vPost2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 8), darkMetalMat);
      vPost2.position.set(bx + 0.45, h / 2, 0);

      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), barColorMat);
      hBar.rotation.z = Math.PI / 2;
      hBar.position.set(bx, h, 0);

      teppouGroup.add(vPost, vPost2, hBar);
    });
    group.add(teppouGroup);

    // Tobidashi Safety Cutout outside gate
    const tobidashiGroup = new THREE.Group();
    tobidashiGroup.position.set(-3.8, 0.15, 4.1);

    const tobiPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), darkMetalMat);
    tobiPost.position.y = 0.55;
    const tobiHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }));
    tobiHead.position.set(0, 1.05, 0);
    const tobiBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.02), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }));
    tobiBody.position.set(0, 0.85, 0);
    const tobiPants = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 }));
    tobiPants.position.set(0, 0.62, 0);

    tobidashiGroup.add(tobiPost, tobiHead, tobiBody, tobiPants);
    group.add(tobidashiGroup);

    // Rooftop PA Broadcast Horn Speakers on Clock Tower (capped at Y = 11.7m <= 12.0m)
    const hornGroup = new THREE.Group();
    hornGroup.position.set(0, towerH + 0.2, 0.5);

    const hornPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), darkMetalMat);
    hornPole.position.y = 0.45;
    hornGroup.add(hornPole);

    [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(angle => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), darkMetalMat);
      horn.rotation.x = Math.PI / 2;
      horn.rotation.z = angle;
      horn.position.set(Math.sin(angle) * 0.2, 0.85, Math.cos(angle) * 0.2);
      hornGroup.add(horn);
    });
    group.add(hornGroup);

    // Backyard cherry blossom tree
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.0, 8), darkMetalMat);
    trunk.position.set(4.2, 1.0 + 0.15, -2.4);
    trunk.castShadow = true;
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 }));
    foliage.position.set(4.2, 2.6 + 0.15, -2.4);
    foliage.castShadow = true;
    group.add(trunk, foliage);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
