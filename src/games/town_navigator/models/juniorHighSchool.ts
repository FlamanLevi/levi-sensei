import * as THREE from 'three';
import {
  getConcretePanelTexture,
  getBrickTileTexture,
  buildPerimeterRailing,
  addWrapAroundWindows,
} from './wallTextures';

export interface JuniorHighSchoolOptions {
  includeRoad?: boolean;
  scale?: number;
}

let cachedJhsClockTex: THREE.CanvasTexture | null = null;
let cachedJhsPlaqueTex: THREE.CanvasTexture | null = null;
let cachedJhsBannerTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Junior High School Clock Face
 */
function createClockTexture(): THREE.CanvasTexture {
  if (cachedJhsClockTex) return cachedJhsClockTex;
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

  ctx.fillStyle = '#1e293b';
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const x = 128 + Math.sin(angle) * 98;
    const y = 128 - Math.cos(angle) * 98;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hands showing 8:30 (Morning Homeroom time)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(84, 150);
  ctx.stroke();

  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128, 225);
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(128, 128, 8, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedJhsClockTex = texture;
  return texture;
}

/**
 * Procedural texture for Gatepost Gold Plaque: "中学校 / JUNIOR HIGH SCHOOL"
 */
function createGatePlaqueTexture(): THREE.CanvasTexture {
  if (cachedJhsPlaqueTex) return cachedJhsPlaqueTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 44px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('緑町中学校', 256, 48);

  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('JUNIOR HIGH SCHOOL', 256, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedJhsPlaqueTex = texture;
  return texture;
}

/**
 * Procedural texture for Vertical School Club Congratulatory Banner (懸垂幕)
 */
function createClubBannerTexture(): THREE.CanvasTexture {
  if (cachedJhsBannerTex) return cachedJhsBannerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(0, 0, 128, 512);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 120, 504);

  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(64, 58, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px "BIZ UDPGothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('祝', 64, 58);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 36px "BIZ UDPGothic", sans-serif';
  const chars = ['全', '国', '大', '会', '出', '場'];
  chars.forEach((ch, idx) => {
    ctx.fillText(ch, 64, 135 + idx * 58);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedJhsBannerTex = texture;
  return texture;
}

/**
 * Builds an authentic 12.0m × 12.0m (2U × 2U) Japanese Junior High School (中学校 - Chūgakkō).
 * Matching MEXT Here We Go 6 Unit 11 p.9 card hwg6_u09_20.
 */
export function buildJuniorHighSchoolMesh(options: JuniorHighSchoolOptions = {}): THREE.Group {
  const { scale = 1.0 } = options;
  const group = new THREE.Group();
  group.name = 'JuniorHighSchool_hwg6_u09_20';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    map: getConcretePanelTexture(),
    roughness: 0.7,
  });

  const tileAccentMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    map: getBrickTileTexture(),
    roughness: 0.5,
  });

  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.85 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  const lotSize = 12.0;

  // 1. PROPERTY BASE (12m × 12m)
  const courtGeo = new THREE.BoxGeometry(lotSize, 0.15, 10.5);
  const court = new THREE.Mesh(courtGeo, foundationMat);
  court.position.set(0, 0.075, -0.75);
  court.receiveShadow = true;
  group.add(court);

  // Sidewalk slab in front: 12.0m wide, 1.5m deep (Z in [+4.5, +6.0])
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

  // 2. MAIN 3-STORY SCHOOL BUILDING
  const schoolGroup = new THREE.Group();
  const bW = 10.8;
  const bD = 6.4;
  const bH = 9.0;
  const buildingZ = -2.4;
  schoolGroup.position.set(0, 0.15, buildingZ);

  const baseBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.12, 0.3, bD + 0.12), foundationMat);
  baseBand.position.set(0, 0.15, 0);
  baseBand.receiveShadow = true;
  schoolGroup.add(baseBand);

  const bodyGeo = new THREE.BoxGeometry(bW, bH - 0.3, bD);
  const body = new THREE.Mesh(bodyGeo, wallMat);
  body.position.set(0, (bH + 0.3) / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  schoolGroup.add(body);

  const fasciaGeo = new THREE.BoxGeometry(bW + 0.25, 0.42, bD + 0.25);
  const fascia = new THREE.Mesh(fasciaGeo, tileAccentMat);
  fascia.position.set(0, bH + 0.21, 0);
  fascia.castShadow = true;
  schoolGroup.add(fascia);

  // Open Rooftop Safety Railing & Solar Panels
  const roofRail = buildPerimeterRailing(bW - 0.2, bD - 0.2, 0.72, steelMat, 1.8);
  roofRail.position.set(0, bH + 0.42, 0);
  schoolGroup.add(roofRail);

  const solarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.75, roughness: 0.2 });
  [-3.2, 3.2].forEach((sx) => {
    const solar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 2.2), solarMat);
    solar.position.set(sx, bH + 0.55, -0.5);
    solar.rotation.x = 0.14;
    schoolGroup.add(solar);
  });

  // 360° Side & Rear Classroom Windows
  addWrapAroundWindows({
    targetGroup: schoolGroup,
    bW,
    bD,
    floorHeights: [1.65, 4.75, 7.85],
    winW: 1.15,
    winH: 1.35,
    sideCols: 3,
    backCols: 5,
    glassMat,
    frameMat: darkMetalMat,
  });

  [3.2, 6.3].forEach((yFloor) => {
    const fBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.08, 0.18, bD + 0.08), tileAccentMat);
    fBand.position.set(0, yFloor, 0);
    schoolGroup.add(fBand);
  });

  // Ribbon Windows on 3 Floors (Front Face: +Z)
  [1.65, 4.75, 7.85].forEach((yWin) => {
    [-4.0, -2.4, -0.8, 0.8, 2.4, 4.0].forEach((wx) => {
      const winGeo = new THREE.BoxGeometry(1.3, 1.4, 0.08);
      const win = new THREE.Mesh(winGeo, glassMat);
      win.position.set(wx, yWin, bD / 2 + 0.02);
      const frameGeo = new THREE.BoxGeometry(1.38, 1.48, 0.06);
      const frame = new THREE.Mesh(frameGeo, darkMetalMat);
      frame.position.set(wx, yWin, bD / 2 + 0.01);
      schoolGroup.add(frame, win);
    });
  });

  // Vertical Congratulatory School Club Banner (懸垂幕: "祝 全国大会出場") on Facade
  const clubBannerMat = new THREE.MeshStandardMaterial({ map: createClubBannerTexture(), roughness: 0.4 });
  const clubBanner = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 3.8), clubBannerMat);
  clubBanner.position.set(4.8, 5.4, bD / 2 + 0.08);
  schoolGroup.add(clubBanner);

  // 3. CENTRAL ROOFTOP CLOCK TOWER (detail1: Reaches 11.6m <= 12.0m)
  const towerW = 2.4;
  const towerH = 2.1;
  const towerGeo = new THREE.BoxGeometry(towerW, towerH, 1.8);
  const tower = new THREE.Mesh(towerGeo, wallMat);
  tower.position.set(0, bH + 0.42 + towerH / 2, bD / 2 - 0.9);
  tower.castShadow = true;
  schoolGroup.add(tower);

  const clockTex = createClockTexture();
  const clockMat = new THREE.MeshStandardMaterial({
    map: clockTex,
    emissive: 0xffffff,
    emissiveMap: clockTex,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const clockMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), clockMat);
  clockMesh.position.set(0, bH + 0.42 + towerH / 2, bD / 2 + 0.02);
  schoolGroup.add(clockMesh);

  // 4. GROUND FLOOR ENTRANCE & CANOPY (昇降口 - Shōkōguchi)
  const canopyW = 3.6;
  const canopyD = 1.4;
  const canopyGeo = new THREE.BoxGeometry(canopyW, 0.18, canopyD);
  const canopy = new THREE.Mesh(canopyGeo, tileAccentMat);
  canopy.position.set(0, 3.05, bD / 2 + canopyD / 2);
  canopy.castShadow = true;
  schoolGroup.add(canopy);

  [-canopyW / 2 + 0.2, canopyW / 2 - 0.2].forEach((px) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.9, 12), darkMetalMat);
    post.position.set(px, 1.45, bD / 2 + canopyD - 0.2);
    post.castShadow = true;
    schoolGroup.add(post);
  });

  const doorGeo = new THREE.BoxGeometry(canopyW - 0.6, 2.3, 0.05);
  const doors = new THREE.Mesh(doorGeo, glassMat);
  doors.position.set(0, 1.15, bD / 2 + 0.03);
  schoolGroup.add(doors);

  group.add(schoolGroup);

  // 5. FRONT GATEPOSTS, RETRACTABLE GATE & PLAQUE (detail2 at X = -2.4m, Z = 4.2m)
  const gateX = 2.4;
  const gateZ = 4.2;

  [-gateX, gateX].forEach((gx, idx) => {
    const postGeo = new THREE.BoxGeometry(0.7, 2.2, 0.7);
    const post = new THREE.Mesh(postGeo, concreteMat);
    post.position.set(gx, 0.15 + 1.1, gateZ);
    post.castShadow = true;
    group.add(post);

    const capGeo = new THREE.ConeGeometry(0.55, 0.35, 4);
    capGeo.rotateY(Math.PI / 4);
    const cap = new THREE.Mesh(capGeo, concreteMat);
    cap.position.set(gx, 0.15 + 2.2 + 0.175, gateZ);
    group.add(cap);

    if (idx === 0) {
      const plaqueTex = createGatePlaqueTexture();
      const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.3 });
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.22), plaqueMat);
      plaque.position.set(gx, 0.15 + 1.45, gateZ + 0.36);
      group.add(plaque);
    }
  });

  // Partially Open Retractable Steel Accordion Gate (伸縮門扉)
  const accordionGate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.15, 0.08), steelMat);
  accordionGate.position.set(1.2, 0.72, gateZ);
  group.add(accordionGate);

  // 6. COURTYARD AMENITIES (Student Bicycle Shelters & Club Banner)
  const bikeShelter = new THREE.Group();
  bikeShelter.position.set(-4.2, 0.15, 2.2);

  const bRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.8), darkMetalMat);
  bRoof.position.set(0, 1.9, 0);
  bikeShelter.add(bRoof);

  [-1.0, 1.0].forEach((bx) => {
    const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.85, 8), darkMetalMat);
    bPost.position.set(bx, 0.925, -0.7);
    bikeShelter.add(bPost);
  });

  const wheelGeo = new THREE.TorusGeometry(0.20, 0.02, 8, 14);
  wheelGeo.rotateY(Math.PI / 2);
  [-0.65, 0.0, 0.65].forEach((bx) => {
    const wf = new THREE.Mesh(wheelGeo, darkMetalMat);
    wf.position.set(bx, 0.22, 0.35);
    const wr = new THREE.Mesh(wheelGeo, darkMetalMat);
    wr.position.set(bx, 0.22, -0.35);
    const bike = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.75), steelMat);
    bike.position.set(bx, 0.42, 0);
    bikeShelter.add(wf, wr, bike);
  });
  group.add(bikeShelter);

  // Vertical Club Activity Flagpole on East Courtyard
  const bannerGroup = new THREE.Group();
  bannerGroup.position.set(4.2, 0.15, 2.2);

  const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.2, 8), steelMat);
  bannerPole.position.set(0, 2.1, 0);
  bannerGroup.add(bannerPole);

  const bannerFabricMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
  const bannerFabric = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.6, 0.02), bannerFabricMat);
  bannerFabric.position.set(0.4, 2.5, 0);
  bannerGroup.add(bannerFabric);

  group.add(bannerGroup);

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
