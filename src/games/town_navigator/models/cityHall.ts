import * as THREE from 'three';
import {
  getConcretePanelTexture,
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

let cachedTowerClockTex: THREE.CanvasTexture | null = null;
let cachedCityHallSignTex: THREE.CanvasTexture | null = null;
let cachedCivicNoticeTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for City Hall Clock Tower
 */
function createTowerClockTexture(): THREE.CanvasTexture {
  if (cachedTowerClockTex) return cachedTowerClockTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 10;
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const isMajor = i % 3 === 0;
    const r1 = 110;
    const r2 = isMajor ? 85 : 98;
    ctx.lineWidth = isMajor ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(angle) * r1, 128 + Math.sin(angle) * r1);
    ctx.lineTo(128 + Math.cos(angle) * r2, 128 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // Hands (9:00 City Hall opening time)
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(-Math.PI) * 55, 128 + Math.sin(-Math.PI) * 55);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128, 128 - 85);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedTowerClockTex = texture;
  return texture;
}

/**
 * Procedural texture for City Hall Header Sign
 */
function createCityHallSignTexture(): THREE.CanvasTexture {
  if (cachedCityHallSignTex) return cachedCityHallSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 112);

  const cx = 64;
  const cy = 64;
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('市', cx, cy);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('CITY HALL', 120, 48);

  ctx.font = 'bold 22px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('市役所 (SHIYAKUSHO)', 122, 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedCityHallSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Municipal Forecourt Notice Board (市役所掲示板)
 */
function createCivicNoticeTexture(): THREE.CanvasTexture {
  if (cachedCivicNoticeTex) return cachedCivicNoticeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(6, 6, 244, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('市役所からのお知らせ • CITY NEWS', 128, 25);

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(16, 44, 104, 68);
  ctx.fillStyle = '#dbeafe';
  ctx.fillRect(136, 44, 104, 68);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px "BIZ UDPGothic", sans-serif';
  ctx.fillText('市民まつり開催', 68, 72);
  ctx.fillText('ゴミ分別案内', 188, 72);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedCivicNoticeTex = texture;
  return texture;
}

export interface CityHallOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

/**
 * Builds an authentic 3D Japanese City Hall (hwg5_u19_09)
 * Standard 12.0m × 12.0m Lot (2U × 2U) within strict 12.0m height envelope
 */
export function buildCityHallMesh(options: CityHallOptions = {}): THREE.Group {
  const { includeRoad = true, scale = 1.0 } = options;

  const group = new THREE.Group();
  group.name = 'CityHall_hwg5_u19_09';

  // Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.68,
  });
  const stoneDarkMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    map: getBrickTileTexture(),
    roughness: 0.6,
  });
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const whiteLineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.3 });
  const metalPoleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.7,
  });

  const lotSize = 12.0;

  // 1. PROPERTY BASE
  const lawnGeo = new THREE.BoxGeometry(lotSize, 0.15, 9.0);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
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

  // 2. MAIN 3-STORY CITY HALL BUILDING
  const hallGroup = new THREE.Group();
  hallGroup.position.set(0, 0.15, -0.6);

  const bW = 9.8;
  const bD = 6.6;
  const bH = 8.2;

  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.16, 0.35, bD + 0.16), stoneDarkMat);
  baseMesh.position.y = 0.175;
  baseMesh.receiveShadow = true;
  hallGroup.add(baseMesh);

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bW, bH - 0.35, bD), stoneMat);
  bodyMesh.position.y = (bH + 0.35) / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  hallGroup.add(bodyMesh);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.24, 0.45, bD + 0.24), stoneDarkMat);
  cornice.position.y = bH + 0.225;
  hallGroup.add(cornice);

  // Open Rooftop Safety Balustrade
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.65, stoneDarkMat, 1.6);
  roofRail.position.set(0, bH + 0.45, 0);
  hallGroup.add(roofRail);

  // Vertical Stone Pilasters along Front Facade
  [-4.6, -3.0, -1.6, 1.6, 3.0, 4.6].forEach((px) => {
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.24, bH, 0.12), stoneDarkMat);
    pilaster.position.set(px, bH / 2, bD / 2 + 0.04);
    hallGroup.add(pilaster);
  });

  // 360° Side & Rear Framed Windows
  addWrapAroundWindows({
    targetGroup: hallGroup,
    bW,
    bD,
    floorHeights: [1.4, 4.1, 6.8],
    winW: 1.0,
    winH: 1.35,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: stoneDarkMat,
  });

  // Windows Across 3 Stories (Front Facade)
  for (let story = 0; story < 3; story++) {
    const wy = 1.4 + story * 2.7;
    for (let c = 0; c < 6; c++) {
      const wx = -3.8 + c * 1.5;
      if (story === 0 && Math.abs(wx) < 1.4) continue;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.42, 0.05), stoneDarkMat);
      frame.position.set(wx, wy, bD / 2 + 0.015);
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.35, 0.06), glassMat);
      win.position.set(wx, wy, bD / 2 + 0.03);
      hallGroup.add(frame, win);
    }
  }

  // 3. SOARING CENTRAL CLOCK TOWER & 4-SIDED CLOCK (detail1: Height 11.7m <= 12m limit)
  const towerW = 2.6;
  const towerD = 2.4;
  const towerH = 10.6;

  const tower = new THREE.Mesh(new THREE.BoxGeometry(towerW, towerH - bH, towerD), stoneMat);
  tower.position.set(0, bH + (towerH - bH) / 2, 0);
  tower.castShadow = true;
  hallGroup.add(tower);

  const towerCornice = new THREE.Mesh(new THREE.BoxGeometry(towerW + 0.25, 0.22, towerD + 0.25), stoneDarkMat);
  towerCornice.position.set(0, towerH + 0.11, 0);
  hallGroup.add(towerCornice);

  // Verdigris Copper Dome Roof + 5 PM Municipal Broadcast Speaker Horns
  const domeMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.45 });
  const domeRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.95, 16), domeMat);
  domeRoof.position.set(0, towerH + 0.68, 0);
  domeRoof.castShadow = true;
  hallGroup.add(domeRoof);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 8), goldMat);
  spire.position.set(0, towerH + 1.25, 0);
  hallGroup.add(spire);

  [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((a) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), metalPoleMat);
    horn.rotation.z = Math.PI / 2;
    horn.rotation.y = a;
    horn.position.set(Math.cos(a) * 0.22, towerH + 1.22, Math.sin(a) * 0.22);
    hallGroup.add(horn);
  });

  // Illuminated Clock Faces on Front & Back of Tower
  const clockTexture = createTowerClockTexture();
  const clockMat = new THREE.MeshStandardMaterial({
    map: clockTexture,
    emissive: 0xffffff,
    emissiveMap: clockTexture,
    emissiveIntensity: 0.4,
    roughness: 0.4,
  });
  [-towerD / 2 - 0.02, towerD / 2 + 0.02].forEach((cz) => {
    const clockMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 24), [
      darkMetalMat, clockMat, clockMat
    ]);
    clockMesh.rotateX(Math.PI / 2);
    clockMesh.position.set(0, 9.5, cz);
    hallGroup.add(clockMesh);
  });

  // 4. GRAND 4-COLUMN CLASSICAL PORTICO & EXTRUDED PEDIMENT (detail2)
  const porticoW = 3.8;
  const porticoD = 1.6;
  const porticoH = 4.6;

  const architrave = new THREE.Mesh(new THREE.BoxGeometry(porticoW + 0.2, 0.32, porticoD + 0.2), stoneDarkMat);
  architrave.position.set(0, porticoH + 0.16, bD / 2 + porticoD / 2);
  hallGroup.add(architrave);

  // True Extruded Triangular Pediment with Golden Municipal Seal
  const pedShape = new THREE.Shape();
  pedShape.moveTo(-porticoW / 2 - 0.15, 0);
  pedShape.lineTo(0, 1.05);
  pedShape.lineTo(porticoW / 2 + 0.15, 0);
  pedShape.closePath();

  const pedGeo = new THREE.ExtrudeGeometry(pedShape, { depth: porticoD + 0.15, bevelEnabled: false });
  pedGeo.translate(0, porticoH + 0.32, bD / 2 - 0.05);
  const pediment = new THREE.Mesh(pedGeo, stoneDarkMat);
  pediment.castShadow = true;
  hallGroup.add(pediment);

  const citySeal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), goldMat);
  citySeal.rotateX(Math.PI / 2);
  citySeal.position.set(0, porticoH + 0.72, bD / 2 + porticoD + 0.12);
  hallGroup.add(citySeal);

  // 4 Fluted Stone Columns with Bases & Capitals
  [-1.6, -0.55, 0.55, 1.6].forEach(cx => {
    const colZ = bD / 2 + porticoD - 0.18;
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.42), stoneDarkMat);
    colBase.position.set(cx, 0.46, colZ);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, porticoH - 0.6, 16), stoneMat);
    col.position.set(cx, (porticoH - 0.6) / 2 + 0.46, colZ);
    col.castShadow = true;
    const colCap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.20, 0.44), stoneDarkMat);
    colCap.position.set(cx, porticoH - 0.1, colZ);
    hallGroup.add(colBase, col, colCap);
  });

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(porticoW + 0.4 - s * 0.2, 0.12, porticoD + 0.6 - s * 0.2), stoneDarkMat);
    step.position.set(0, (s + 0.5) * 0.12, bD / 2 + porticoD / 2 + (2 - s) * 0.1);
    step.receiveShadow = true;
    hallGroup.add(step);
  }

  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 0.06), glassMat);
  doors.position.set(0, 1.6, bD / 2 + 0.04);
  hallGroup.add(doors);

  // Prominent Header Signboard: "CITY HALL / 市役所"
  const signTexture = createCityHallSignTexture();
  const signMat = new THREE.MeshStandardMaterial({
    map: signTexture,
    emissive: 0xffffff,
    emissiveMap: signTexture,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 0.12), [
    darkMetalMat, darkMetalMat, darkMetalMat, darkMetalMat, signMat, darkMetalMat
  ]);
  signMesh.position.set(0, 6.2, bD / 2 + 0.12);
  hallGroup.add(signMesh);

  group.add(hallGroup);

  // 5. CIVIC PLAZA PROPS (Flagpoles & Municipal Notice Board at Z <= 4.2m)
  [-3.8, 3.8].forEach(fx => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 6.5, 12), metalPoleMat);
    pole.position.set(fx, 3.25 + 0.15, 3.8);
    pole.castShadow = true;
    group.add(pole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.6, 0.02),
      new THREE.MeshStandardMaterial({ color: fx < 0 ? 0xdc2626 : 0x2563eb, roughness: 0.6 })
    );
    flag.position.set(fx + (fx < 0 ? -0.45 : 0.45), 6.0 + 0.15, 3.8);
    group.add(flag);
  });

  // Municipal Notice Bulletin Board (市役所掲示板 at X = -2.6m, Z = 3.95m)
  const noticeMat = new THREE.MeshStandardMaterial({ map: createCivicNoticeTexture(), roughness: 0.5 });
  const noticeBoard = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 0.06), [
    stoneDarkMat, stoneDarkMat, stoneDarkMat, stoneDarkMat, noticeMat, stoneDarkMat,
  ]);
  noticeBoard.position.set(-2.6, 1.15, 3.95);
  noticeBoard.castShadow = true;
  [-3.05, -2.15].forEach((nx) => {
    const nLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8), metalPoleMat);
    nLeg.position.set(nx, 0.7, 3.95);
    group.add(nLeg);
  });
  group.add(noticeBoard);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
