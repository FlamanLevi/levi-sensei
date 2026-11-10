import * as THREE from 'three';
import { getBrickTileTexture, getConcretePanelTexture } from './wallTextures';

export interface SwimmingPoolOptions {
  includeRoad?: boolean;
  scale?: number;
}

let cachedPoolSignTex: THREE.CanvasTexture | null = null;
let cachedTempBoardTex: THREE.CanvasTexture | null = null;

/**
 * Procedural texture for Swimming Pool Entrance Header Sign
 */
function createPoolSignTexture(): THREE.CanvasTexture {
  if (cachedPoolSignTex) return cachedPoolSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('SWIMMING POOL', 256, 46);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 24px "BIZ UDPGothic", sans-serif';
  ctx.fillText('市民プール・水泳場', 256, 92);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedPoolSignTex = texture;
  return texture;
}

/**
 * Procedural texture for Digital Water & Air Temperature Board ("水温 28°C / 気温 31°C")
 */
function createTempBoardTexture(): THREE.CanvasTexture {
  if (cachedTempBoardTex) return cachedTempBoardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 120);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('WATER 水温: 28°C', 22, 48);

  ctx.fillStyle = '#facc15';
  ctx.fillText('AIR   気温: 31°C', 22, 92);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedTempBoardTex = texture;
  return texture;
}

/**
 * Builds an authentic 12.0m × 12.0m (2U × 2U) Japanese Public / School Swimming Pool (プール - Pūru).
 * Matching MEXT Here We Go 6 Unit 11 p.9 card hwg6_u09_22.
 */
export function buildSwimmingPoolMesh(options: SwimmingPoolOptions = {}): THREE.Group {
  const { scale = 1.0 } = options;
  const group = new THREE.Group();
  group.name = 'SwimmingPool_hwg6_u09_22';

  // Materials
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.8,
  });

  const poolTileMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    map: getBrickTileTexture(),
    roughness: 0.35,
  });

  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.82,
  });

  const laneLineMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
  });

  const floatRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  const floatYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
  const floatBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });

  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.6,
    roughness: 0.4,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.85,
    roughness: 0.2,
  });

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
  });

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.9,
  });

  const lotSize = 12.0;

  // 1. PROPERTY BASE (12m × 12m)
  const deckGeo = new THREE.BoxGeometry(lotSize, 0.4, 10.5);
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.set(0, 0.2, -0.75);
  deck.receiveShadow = true;
  group.add(deck);

  // Sidewalk slab in front: 12.0m wide, 1.5m deep (Z in [+4.5, +6.0])
  const sidewalkGeo = new THREE.BoxGeometry(lotSize, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, deckMat);
  sidewalk.position.set(0, 0.075, 5.25);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(lotSize, 0.18, 0.12);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.09, 6.0);
  curb.receiveShadow = true;
  group.add(curb);

  // 2. SUNKEN CERAMIC TILE POOL BASIN & WATER (detail1 at Z = -1.6m)
  const poolW = 8.6;
  const poolD = 7.0;
  const poolZ = -1.6;

  const floorGeo = new THREE.BoxGeometry(poolW, 0.05, poolD);
  const floor = new THREE.Mesh(floorGeo, poolTileMat);
  floor.position.set(0, 0.05, poolZ);
  floor.receiveShadow = true;
  group.add(floor);

  const wallH = 0.35;
  const wallThick = 0.18;

  const rimNorth = new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.36, wallH, wallThick), whiteMat);
  rimNorth.position.set(0, 0.22, poolZ - poolD / 2 - wallThick / 2);
  const rimSouth = new THREE.Mesh(new THREE.BoxGeometry(poolW + 0.36, wallH, wallThick), whiteMat);
  rimSouth.position.set(0, 0.22, poolZ + poolD / 2 + wallThick / 2);
  const rimWest = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, poolD), whiteMat);
  rimWest.position.set(-poolW / 2 - wallThick / 2, 0.22, poolZ);
  const rimEast = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, poolD), whiteMat);
  rimEast.position.set(poolW / 2 + wallThick / 2, 0.22, poolZ);
  group.add(rimNorth, rimSouth, rimWest, rimEast);

  // 4 Chrome Poolside Access Ladders
  [-poolW / 2 - 0.08, poolW / 2 + 0.08].forEach((lx) => {
    [-3.6, 0.8].forEach((lz) => {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 12, Math.PI), chromeMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(lx, 0.42, lz);
      group.add(arch);
    });
  });

  const waterGeo = new THREE.BoxGeometry(poolW, 0.02, poolD);
  const water = new THREE.Mesh(waterGeo, poolWaterMat);
  water.position.set(0, 0.32, poolZ);
  group.add(water);

  // 3. FIVE SWIMMING LANES, T-TURN MARKS & FLOATING BUOY DIVIDER ROPES
  const numLanes = 5;
  const laneW = poolW / numLanes;

  for (let l = 0; l < numLanes; l++) {
    const lx = -poolW / 2 + (l + 0.5) * laneW;
    const lLine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, poolD - 0.9), laneLineMat);
    lLine.position.set(lx, 0.08, poolZ);
    const tNorth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.14), laneLineMat);
    tNorth.position.set(lx, 0.08, poolZ - poolD / 2 + 0.45);
    const tSouth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.14), laneLineMat);
    tSouth.position.set(lx, 0.08, poolZ + poolD / 2 - 0.45);
    group.add(lLine, tNorth, tSouth);
  }

  for (let l = 1; l < numLanes; l++) {
    const lx = -poolW / 2 + l * laneW;
    const ropeGeo = new THREE.CylinderGeometry(0.01, 0.01, poolD, 6);
    ropeGeo.rotateX(Math.PI / 2);
    const rope = new THREE.Mesh(ropeGeo, whiteMat);
    rope.position.set(lx, 0.33, poolZ);
    group.add(rope);

    const numBeads = 12;
    const beadSpacing = poolD / numBeads;
    for (let b = 0; b < numBeads; b++) {
      const bz = poolZ - poolD / 2 + (b + 0.5) * beadSpacing;
      const bMat = b % 3 === 0 ? floatRedMat : b % 3 === 1 ? floatYellowMat : floatBlueMat;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), bMat);
      bead.position.set(lx, 0.34, bz);
      group.add(bead);
    }
  }

  // 4. FIVE NUMBERED STARTING BLOCKS AT DEEP END (detail1)
  for (let l = 0; l < numLanes; l++) {
    const lx = -poolW / 2 + (l + 0.5) * laneW;
    const blockGroup = new THREE.Group();
    blockGroup.position.set(lx, 0.4, poolZ - poolD / 2 - 0.35);

    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.52), whiteMat);
    ped.position.set(0, 0.21, 0);
    ped.castShadow = true;

    const topStep = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.56), floatBlueMat);
    topStep.position.set(0, 0.44, 0);
    topStep.rotation.x = -0.15;
    topStep.castShadow = true;

    blockGroup.add(ped, topStep);
    group.add(blockGroup);
  }

  // 5. ELEVATED LIFEGUARD CHAIR (detail2 at X = 3.8, Z = -1.6)
  const guardGroup = new THREE.Group();
  guardGroup.position.set(poolW / 2 + 0.95, 0.4, poolZ);

  [-0.35, 0.35].forEach((gx) => {
    [-0.35, 0.35].forEach((gz) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), whiteMat);
      leg.position.set(gx, 1.1, gz);
      guardGroup.add(leg);
    });
  });

  const chairPlat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), whiteMat);
  chairPlat.position.set(0, 2.2, 0);
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.5), floatRedMat);
  chairSeat.position.set(0, 2.5, 0);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.06), floatRedMat);
  chairBack.position.set(0, 2.75, -0.22);
  const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), whiteMat);
  umbrellaPole.position.set(0, 3.4, -0.2);
  const umbrellaCone = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.38, 12), floatYellowMat);
  umbrellaCone.position.set(0, 4.1, -0.2);

  guardGroup.add(chairPlat, chairSeat, chairBack, umbrellaPole, umbrellaCone);
  group.add(guardGroup);

  // 6. OVERHEAD PENNANT BUNTING FLAGS
  [-2.2, 2.2].forEach((flagZOffset) => {
    const fz = poolZ + flagZOffset;

    [-poolW / 2 - 0.4, poolW / 2 + 0.4].forEach((mx) => {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 8), darkMetalMat);
      mast.position.set(mx, 0.4 + 1.7, fz);
      group.add(mast);
    });

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, poolW + 0.8, 6), darkMetalMat);
    cable.rotation.z = Math.PI / 2;
    cable.position.set(0, 0.4 + 3.2, fz);
    group.add(cable);

    const numFlags = 9;
    const flagSpacing = poolW / numFlags;
    for (let f = 0; f < numFlags; f++) {
      const fx = -poolW / 2 + (f + 0.5) * flagSpacing;
      const fColorMat = f % 3 === 0 ? floatRedMat : f % 3 === 1 ? floatYellowMat : floatBlueMat;
      const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 3), fColorMat);
      pennant.rotation.z = Math.PI;
      pennant.position.set(fx, 0.4 + 3.0, fz);
      group.add(pennant);
    }
  });

  // 7. POOLSIDE SHOWER ARCH, SUN LOUNGERS & RESCUE RING (West Deck)
  const showerGroup = new THREE.Group();
  showerGroup.position.set(-poolW / 2 - 0.85, 0.4, 0.8);

  const showerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), chromeMat);
  showerPipe.position.set(0, 1.2, 0);
  const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.04, 0.08, 12), chromeMat);
  showerHead.position.set(0.25, 2.35, 0);

  const buoyGeo = new THREE.TorusGeometry(0.32, 0.09, 8, 16);
  const buoy = new THREE.Mesh(buoyGeo, floatRedMat);
  buoy.position.set(0, 1.1, 0.6);
  buoy.rotation.y = Math.PI / 2;

  showerGroup.add(showerPipe, showerHead, buoy);
  group.add(showerGroup);

  // 2 Poolside Blue Sun Loungers on West Deck
  [-3.8, -1.8].forEach((lz) => {
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 1.35), floatBlueMat);
    lounger.position.set(-poolW / 2 - 0.9, 0.49, lz);
    lounger.castShadow = true;
    group.add(lounger);
  });

  // 8. FRONT ENTRANCE RECEPTION ARCHWAY, SIGN & DIGITAL WATER TEMP BOARD (Z = +3.6m..+4.2m)
  const entryArch = new THREE.Group();
  entryArch.position.set(0, 0.4, 4.0);

  [-1.6, 1.6].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 0.35), floatBlueMat);
    pillar.position.set(px, 1.3, 0);
    pillar.castShadow = true;
    entryArch.add(pillar);
  });

  const signMat = new THREE.MeshStandardMaterial({
    map: createPoolSignTexture(),
    emissive: 0xffffff,
    emissiveMap: createPoolSignTexture(),
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const signBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.72, 0.22), [
    floatBlueMat, floatBlueMat, floatBlueMat, floatBlueMat, signMat, signMat,
  ]);
  signBeam.position.set(0, 2.75, 0);
  entryArch.add(signBeam);

  // Digital Water & Air Temp Display Board on Right Gatepost
  const tempMat = new THREE.MeshStandardMaterial({
    map: createTempBoardTexture(),
    emissive: 0xffffff,
    emissiveMap: createTempBoardTexture(),
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const tempBoard = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.08), [
    darkMetalMat, darkMetalMat, darkMetalMat, darkMetalMat, tempMat, darkMetalMat,
  ]);
  tempBoard.position.set(2.6, 1.45, 0.15);
  entryArch.add(tempBoard);

  group.add(entryArch);

  // Perimeter Safety Fence
  const fenceH = 1.6;
  const fenceZFront = 4.2;

  [-3.8, 3.8].forEach((fx) => {
    const fPanel = new THREE.Mesh(new THREE.BoxGeometry(4.2, fenceH, 0.04), fenceMat);
    fPanel.position.set(fx, 0.4 + fenceH / 2, fenceZFront);
    group.add(fPanel);
  });

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
