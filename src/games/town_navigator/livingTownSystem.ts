import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTrafficSignalSnapshot } from './models/roadTiles';

export interface LivingTownController {
  group: THREE.Group;
  update: (
    delta: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    streetlightLevel: number
  ) => void;
  triggerConfettiBurst: (x: number, y: number, z: number) => void;
  setTargetBeacon: (pos: [number, number, number] | null, visible: boolean) => void;
  dispose: () => void;
}

const ROAD_COORDS = [-63, -33, 0, 33, 63];

// Module-scoped zero-allocation scratch objects for animate()
const _dummy = new THREE.Object3D();
const _dummyAlt = new THREE.Object3D();
const _tmpColor = new THREE.Color();

function createSeededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 214748646;
  return () => {
    s = (s * 16807) % 214748647;
    return (s - 1) / 214748646;
  };
}

function normalizeForMerge(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  if (nonIndexed.attributes.uv) {
    nonIndexed.deleteAttribute('uv');
  }
  return nonIndexed;
}

function addVertexColor(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const g = normalizeForMerge(geo);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  _tmpColor.setHex(hex);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = _tmpColor.r;
    colors[i * 3 + 1] = _tmpColor.g;
    colors[i * 3 + 2] = _tmpColor.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function getLeftHandLaneCoord(roadCoord: number, axis: 'X' | 'Z', dir: 1 | -1): number {
  const offset = roadCoord === 0 ? 2.6 : 1.25;
  if (axis === 'Z') {
    return roadCoord + dir * offset;
  }
  return roadCoord - dir * offset;
}

function getHeadingYaw(axis: 'X' | 'Z', dir: 1 | -1): number {
  if (axis === 'Z') return dir === 1 ? 0 : Math.PI;
  return dir === 1 ? Math.PI / 2 : -Math.PI / 2;
}

function findNextIntersection(pos: number, dir: 1 | -1): number | null {
  if (dir === 1) {
    for (let i = 0; i < ROAD_COORDS.length; i++) {
      if (ROAD_COORDS[i] > pos + 0.5) return ROAD_COORDS[i];
    }
    return null;
  }
  for (let i = ROAD_COORDS.length - 1; i >= 0; i--) {
    if (ROAD_COORDS[i] < pos - 0.5) return ROAD_COORDS[i];
  }
  return null;
}

type VehicleArchetype = 'KEI' | 'TAXI' | 'BUS';

interface VehicleState {
  archetype: VehicleArchetype;
  archetypeIndex: number;
  axis: 'X' | 'Z';
  dir: 1 | -1;
  roadCoord: number;
  x: number;
  z: number;
  yaw: number;
  targetYaw: number;
  speed: number;
  maxSpeed: number;
  turnCooldown: number;
  pitch: number;
  roll: number;
  isBraking: boolean;
}

interface PedestrianState {
  axis: 'X' | 'Z';
  dir: 1 | -1;
  roadCoord: number;
  sideSign: 1 | -1;
  x: number;
  z: number;
  speed: number;
  phase: number;
  swing: number;
}

function buildFourWheelsGeometry(trackX: number, wheelbaseZ: number, radius: number): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const coords: Array<[number, number]> = [
    [-trackX, wheelbaseZ],
    [trackX, wheelbaseZ],
    [-trackX, -wheelbaseZ],
    [trackX, -wheelbaseZ],
  ];
  coords.forEach(([wx, wz]) => {
    const tire = addVertexColor(new THREE.CylinderGeometry(radius, radius, 0.22, 10), 0x1e293b);
    tire.rotateZ(Math.PI / 2);
    tire.translate(wx, radius, wz);
    const rim = addVertexColor(new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.24, 8), 0xcbd5e1);
    rim.rotateZ(Math.PI / 2);
    rim.translate(wx, radius, wz);
    parts.push(tire, rim);
  });
  return parts;
}

function buildKeiCarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Main lower body (tinted by instanceColor -> use 0xffffff base)
  const lower = addVertexColor(new THREE.BoxGeometry(1.42, 0.56, 2.84), 0xffffff);
  lower.translate(0, 0.54, 0);
  // Sloped hood
  const hood = addVertexColor(new THREE.BoxGeometry(1.36, 0.16, 0.65), 0xffffff);
  hood.rotateX(0.18);
  hood.translate(0, 0.80, 1.02);
  // Tall boxy Kei cabin
  const cabin = addVertexColor(new THREE.BoxGeometry(1.28, 0.58, 1.72), 0xffffff);
  cabin.translate(0, 1.12, -0.18);
  // Tinted glass greenhouse band
  const glass = addVertexColor(new THREE.BoxGeometry(1.30, 0.44, 1.56), 0x1e293b);
  glass.translate(0, 1.11, -0.18);
  // Front & rear bumpers
  const bumperF = addVertexColor(new THREE.BoxGeometry(1.44, 0.16, 0.12), 0x334155);
  bumperF.translate(0, 0.34, 1.44);
  const bumperR = addVertexColor(new THREE.BoxGeometry(1.44, 0.16, 0.12), 0x334155);
  bumperR.translate(0, 0.34, -1.44);
  // Side mirrors
  [-0.78, 0.78].forEach((mx) => {
    const mir = addVertexColor(new THREE.BoxGeometry(0.14, 0.10, 0.12), 0x1e293b);
    mir.translate(mx, 0.92, 0.62);
    parts.push(mir);
  });
  // Authentic Yellow Kei License Plates (Front & Rear)
  const plateF = addVertexColor(new THREE.BoxGeometry(0.34, 0.14, 0.04), 0xfacc15);
  plateF.translate(0, 0.34, 1.50);
  const plateR = addVertexColor(new THREE.BoxGeometry(0.34, 0.14, 0.04), 0xfacc15);
  plateR.translate(0, 0.34, -1.50);

  parts.push(lower, hood, cabin, glass, bumperF, bumperR, plateF, plateR);
  parts.push(...buildFourWheelsGeometry(0.68, 0.88, 0.27));
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

function buildTaxiSedanGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // 3-box sedan body
  const lower = addVertexColor(new THREE.BoxGeometry(1.52, 0.52, 3.35), 0xffffff);
  lower.translate(0, 0.52, 0);
  // Greenhouse cabin
  const cabin = addVertexColor(new THREE.BoxGeometry(1.32, 0.48, 1.58), 0xffffff);
  cabin.translate(0, 1.02, -0.08);
  const glass = addVertexColor(new THREE.BoxGeometry(1.34, 0.38, 1.42), 0x0f172a);
  glass.translate(0, 1.00, -0.08);
  // Chrome grille & bumpers
  const grille = addVertexColor(new THREE.BoxGeometry(0.74, 0.24, 0.06), 0xcbd5e1);
  grille.translate(0, 0.56, 1.68);
  const bumperF = addVertexColor(new THREE.BoxGeometry(1.54, 0.15, 0.14), 0xcbd5e1);
  bumperF.translate(0, 0.32, 1.68);
  const bumperR = addVertexColor(new THREE.BoxGeometry(1.54, 0.15, 0.14), 0xcbd5e1);
  bumperR.translate(0, 0.32, -1.68);
  // Side mirrors
  [-0.82, 0.82].forEach((mx) => {
    const mir = addVertexColor(new THREE.BoxGeometry(0.14, 0.10, 0.12), 0x1e293b);
    mir.translate(mx, 0.84, 0.65);
    parts.push(mir);
  });
  // Rooftop Taxi *Andon* Lantern
  const andon = addVertexColor(new THREE.BoxGeometry(0.36, 0.14, 0.22), 0xfef08a);
  andon.translate(0, 1.33, 0.12);
  // White commercial license plates
  const plateF = addVertexColor(new THREE.BoxGeometry(0.34, 0.14, 0.04), 0xf8fafc);
  plateF.translate(0, 0.32, 1.75);
  const plateR = addVertexColor(new THREE.BoxGeometry(0.34, 0.14, 0.04), 0xf8fafc);
  plateR.translate(0, 0.32, -1.75);

  parts.push(lower, cabin, glass, grille, bumperF, bumperR, andon, plateF, plateR);
  parts.push(...buildFourWheelsGeometry(0.72, 1.04, 0.29));
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

function buildRouteBusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Tall Municipal Bus Body (1.82m x 2.05m x 4.95m)
  const body = addVertexColor(new THREE.BoxGeometry(1.82, 1.85, 4.95), 0xffffff);
  body.translate(0, 1.32, 0);
  // Panoramic window band
  const windows = addVertexColor(new THREE.BoxGeometry(1.85, 0.72, 4.65), 0x1e293b);
  windows.translate(0, 1.62, 0.04);
  // Glowing amber LED front destination strip
  const destLed = addVertexColor(new THREE.BoxGeometry(1.15, 0.22, 0.06), 0xfbbf24);
  destLed.translate(0, 2.06, 2.48);
  // Dual rooftop AC pods
  [-0.9, 0.9].forEach((az) => {
    const ac = addVertexColor(new THREE.BoxGeometry(1.1, 0.22, 1.15), 0xe2e8f0);
    ac.translate(0, 2.34, az);
    parts.push(ac);
  });
  // Bumpers
  const bumperF = addVertexColor(new THREE.BoxGeometry(1.84, 0.24, 0.14), 0x334155);
  bumperF.translate(0, 0.42, 2.48);
  const bumperR = addVertexColor(new THREE.BoxGeometry(1.84, 0.24, 0.14), 0x334155);
  bumperR.translate(0, 0.42, -2.48);

  parts.push(body, windows, destLed, bumperF, bumperR);
  parts.push(...buildFourWheelsGeometry(0.86, 1.55, 0.36));
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Creates a self-contained, zero-allocation Living Town controller:
 * - Sculpted 3-archetype instanced Japanese vehicle fleet (4 draw calls: Kei, Taxi, Bus, Lights)
 * - Articulated 4-part instanced Japanese pedestrians (4 draw calls: Torso, Head/Cap, SwingA, SwingB)
 * - Pulsing 3D destination beacon (1 draw call)
 * - Pooled 3D arrival confetti burst (1 draw call)
 */
export function createLivingTownController(
  seed: number,
  options?: { lowPower?: boolean }
): LivingTownController {
  const lowPower = options?.lowPower ?? false;
  const rng = createSeededRng(seed + 7919);

  const group = new THREE.Group();
  group.name = 'Town_LivingSimulation';

  const vehicleCount = lowPower ? 12 : 18;
  const pedCount = lowPower ? 16 : 28;

  // =========================================================================
  // 1. SCULPTED 3-ARCHETYPE VEHICLE FLEET (4 draw calls total)
  // =========================================================================
  const busCount = 2;
  const taxiCount = Math.max(2, Math.round((vehicleCount - busCount) * 0.3));
  const keiCount = vehicleCount - busCount - taxiCount;

  const vehicleMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.25,
  });

  const keiGeo = buildKeiCarGeometry();
  const taxiGeo = buildTaxiSedanGeometry();
  const busGeo = buildRouteBusGeometry();

  const keiMesh = new THREE.InstancedMesh(keiGeo, vehicleMat, keiCount);
  const taxiMesh = new THREE.InstancedMesh(taxiGeo, vehicleMat, taxiCount);
  const busMesh = new THREE.InstancedMesh(busGeo, vehicleMat, busCount);
  keiMesh.frustumCulled = false;
  taxiMesh.frustumCulled = false;
  busMesh.frustumCulled = false;

  // Shared Headlights & Active Taillights/Brake Strip (1 draw call across all vehicles)
  const headL = addVertexColor(new THREE.BoxGeometry(0.28, 0.14, 0.06), 0xfef9c3);
  headL.translate(-0.46, 0.58, 1.44);
  const headR = addVertexColor(new THREE.BoxGeometry(0.28, 0.14, 0.06), 0xfef9c3);
  headR.translate(0.46, 0.58, 1.44);
  const tailL = addVertexColor(new THREE.BoxGeometry(0.30, 0.14, 0.06), 0xef4444);
  tailL.translate(-0.46, 0.62, -1.44);
  const tailR = addVertexColor(new THREE.BoxGeometry(0.30, 0.14, 0.06), 0xef4444);
  tailR.translate(0.46, 0.62, -1.44);
  const lightsGeo = mergeGeometries([headL, headR, tailL, tailR], false)!;
  headL.dispose();
  headR.dispose();
  tailL.dispose();
  tailR.dispose();

  const lightsMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    emissive: 0xffffff,
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  const lightsMesh = new THREE.InstancedMesh(lightsGeo, lightsMat, vehicleCount);
  lightsMesh.frustumCulled = false;

  const keiPalette = [
    0xf8fafc, // Pearl White
    0xa7f3d0, // Mint Kei
    0xfef08a, // Cream Yellow
    0x7dd3fc, // Sky Blue
    0xf97316, // Kei Orange
    0xfbcfe8, // Sakura Pink
  ];
  const taxiPalette = [0x0f172a, 0x065f46, 0xfacc15];
  const busColor = 0x0284c7;

  const vehicles: VehicleState[] = [];
  let kIdx = 0;
  let tIdx = 0;
  let bIdx = 0;

  for (let i = 0; i < vehicleCount; i++) {
    let archetype: VehicleArchetype = 'KEI';
    let archetypeIndex = 0;
    if (i < busCount) {
      archetype = 'BUS';
      archetypeIndex = bIdx++;
    } else if (i < busCount + taxiCount) {
      archetype = 'TAXI';
      archetypeIndex = tIdx++;
    } else {
      archetype = 'KEI';
      archetypeIndex = kIdx++;
    }

    const axis: 'X' | 'Z' = i % 2 === 0 ? 'Z' : 'X';
    const dir: 1 | -1 = (Math.floor(i / 2) % 2 === 0 ? 1 : -1) as 1 | -1;
    // Buses cruise Grand Boulevard (0) or major arterials (-33, 33)
    const roadCoord =
      archetype === 'BUS'
        ? 0
        : ROAD_COORDS[Math.floor(rng() * ROAD_COORDS.length)];
    const along = -58 + rng() * 116;
    const lane = getLeftHandLaneCoord(roadCoord, axis, dir);
    const x = axis === 'Z' ? lane : along;
    const z = axis === 'Z' ? along : lane;
    const yaw = getHeadingYaw(axis, dir);

    vehicles.push({
      archetype,
      archetypeIndex,
      axis,
      dir,
      roadCoord,
      x,
      z,
      yaw,
      targetYaw: yaw,
      speed: 5.0,
      maxSpeed: archetype === 'BUS' ? 6.8 : 7.5 + rng() * 2.5,
      turnCooldown: 0,
      pitch: 0,
      roll: 0,
      isBraking: false,
    });

    if (archetype === 'BUS') {
      _tmpColor.setHex(busColor);
      busMesh.setColorAt(archetypeIndex, _tmpColor);
    } else if (archetype === 'TAXI') {
      _tmpColor.setHex(taxiPalette[archetypeIndex % taxiPalette.length]);
      taxiMesh.setColorAt(archetypeIndex, _tmpColor);
    } else {
      _tmpColor.setHex(keiPalette[archetypeIndex % keiPalette.length]);
      keiMesh.setColorAt(archetypeIndex, _tmpColor);
    }
  }
  if (keiMesh.instanceColor) keiMesh.instanceColor.needsUpdate = true;
  if (taxiMesh.instanceColor) taxiMesh.instanceColor.needsUpdate = true;
  if (busMesh.instanceColor) busMesh.instanceColor.needsUpdate = true;

  group.add(keiMesh, taxiMesh, busMesh, lightsMesh);

  // =========================================================================
  // 2. ARTICULATED JAPANESE PEDESTRIANS (4 draw calls total)
  // =========================================================================
  // Torso + collar + daypack/randoseru
  const torsoBase = addVertexColor(new THREE.BoxGeometry(0.36, 0.44, 0.22), 0xffffff);
  torsoBase.translate(0, 0.72, 0);
  const collarPart = addVertexColor(new THREE.BoxGeometry(0.24, 0.05, 0.23), 0xf8fafc);
  collarPart.translate(0, 0.94, 0.01);
  const packPart = addVertexColor(new THREE.BoxGeometry(0.24, 0.30, 0.13), 0x991b1b);
  packPart.translate(0, 0.72, -0.15);
  const pedTorsoGeo = mergeGeometries([torsoBase, collarPart, packPart], false)!;
  torsoBase.dispose();
  collarPart.dispose();
  packPart.dispose();

  const pedTorsoMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.72,
  });
  const pedTorsoMesh = new THREE.InstancedMesh(pedTorsoGeo, pedTorsoMat, pedCount);
  pedTorsoMesh.frustumCulled = false;

  // Head + sculpted hair/school cap + visor
  const headSphere = addVertexColor(new THREE.SphereGeometry(0.15, 10, 8), 0xffdbac);
  headSphere.translate(0, 1.12, 0);
  const capDome = addVertexColor(new THREE.CylinderGeometry(0.15, 0.17, 0.10, 10), 0xffffff);
  capDome.translate(0, 1.23, 0);
  const capVisor = addVertexColor(new THREE.BoxGeometry(0.20, 0.02, 0.10), 0xffffff);
  capVisor.translate(0, 1.19, 0.13);
  const pedHeadGeo = mergeGeometries([headSphere, capDome, capVisor], false)!;
  headSphere.dispose();
  capDome.dispose();
  capVisor.dispose();

  const pedHeadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.65,
  });
  const pedHeadMesh = new THREE.InstancedMesh(pedHeadGeo, pedHeadMat, pedCount);
  pedHeadMesh.frustumCulled = false;

  // Limb Swing Pair A (Left Arm + Right Leg) & B (Right Arm + Left Leg), pivoted at y = 0.0 (offset in world at hip/shoulder)
  const buildSwingPair = (armX: number, legX: number): THREE.BufferGeometry => {
    const arm = addVertexColor(new THREE.BoxGeometry(0.08, 0.32, 0.08), 0xffdbac);
    arm.translate(armX, -0.16, 0);
    const leg = addVertexColor(new THREE.BoxGeometry(0.11, 0.42, 0.12), 0x1e293b);
    leg.translate(legX, -0.58, 0);
    const shoe = addVertexColor(new THREE.BoxGeometry(0.11, 0.08, 0.18), 0xf8fafc);
    shoe.translate(legX, -0.82, 0.02);
    const merged = mergeGeometries([arm, leg, shoe], false)!;
    arm.dispose();
    leg.dispose();
    shoe.dispose();
    return merged;
  };

  const pedSwingAGeo = buildSwingPair(-0.22, 0.09);
  const pedSwingBGeo = buildSwingPair(0.22, -0.09);
  const pedLimbMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.72,
  });
  const pedSwingAMesh = new THREE.InstancedMesh(pedSwingAGeo, pedLimbMat, pedCount);
  const pedSwingBMesh = new THREE.InstancedMesh(pedSwingBGeo, pedLimbMat, pedCount);
  pedSwingAMesh.frustumCulled = false;
  pedSwingBMesh.frustumCulled = false;

  const outfitPalette = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x334155];
  const headPalette = [0xfacc15, 0xfacc15, 0x1e293b, 0xf9a8d4, 0x38bdf8];

  const pedestrians: PedestrianState[] = [];
  for (let i = 0; i < pedCount; i++) {
    const axis: 'X' | 'Z' = i % 2 === 0 ? 'Z' : 'X';
    const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const roadCoord = ROAD_COORDS[Math.floor(rng() * ROAD_COORDS.length)];
    const sideSign: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const swOffset = roadCoord === 0 ? 5.625 : 2.625;
    const along = -60 + rng() * 120;
    const x = axis === 'Z' ? roadCoord + sideSign * swOffset : along;
    const z = axis === 'Z' ? along : roadCoord + sideSign * swOffset;

    pedestrians.push({
      axis,
      dir,
      roadCoord,
      sideSign,
      x,
      z,
      speed: 1.25 + rng() * 0.45,
      phase: rng() * Math.PI * 2,
      swing: 0,
    });

    _tmpColor.setHex(outfitPalette[i % outfitPalette.length]);
    pedTorsoMesh.setColorAt(i, _tmpColor);
    _tmpColor.setHex(headPalette[i % headPalette.length]);
    pedHeadMesh.setColorAt(i, _tmpColor);
  }
  if (pedTorsoMesh.instanceColor) pedTorsoMesh.instanceColor.needsUpdate = true;
  if (pedHeadMesh.instanceColor) pedHeadMesh.instanceColor.needsUpdate = true;

  group.add(pedTorsoMesh, pedHeadMesh, pedSwingAMesh, pedSwingBMesh);

  // =========================================================================
  // 3. PULSING 3D DESTINATION BEACON (1 draw call, merged ring + ribbon)
  // =========================================================================
  const ringPart = normalizeForMerge(new THREE.RingGeometry(1.1, 1.45, 24));
  ringPart.rotateX(-Math.PI / 2);
  ringPart.translate(0, 0.22, 0);

  const ribbonPart = normalizeForMerge(new THREE.CylinderGeometry(0.9, 1.15, 7.5, 16, 1, true));
  ribbonPart.translate(0, 3.9, 0);

  const beaconGeo = mergeGeometries([ringPart, ribbonPart], false)!;
  ringPart.dispose();
  ribbonPart.dispose();

  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.visible = false;
  group.add(beaconMesh);

  // =========================================================================
  // 4. POOLED 3D ARRIVAL CONFETTI BURST (1 draw call, 60 instances)
  // =========================================================================
  const CONFETTI_COUNT = 60;
  const confettiGeo = new THREE.PlaneGeometry(0.22, 0.14);
  const confettiMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });
  const confettiMesh = new THREE.InstancedMesh(confettiGeo, confettiMat, CONFETTI_COUNT);
  confettiMesh.visible = false;
  confettiMesh.frustumCulled = false;

  const confettiPalette = [0xef4444, 0xfacc15, 0x22c55e, 0x3b82f6, 0xec4899, 0xa855f7];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    _tmpColor.setHex(confettiPalette[i % confettiPalette.length]);
    confettiMesh.setColorAt(i, _tmpColor);
  }
  if (confettiMesh.instanceColor) confettiMesh.instanceColor.needsUpdate = true;
  group.add(confettiMesh);

  const cPx = new Float32Array(CONFETTI_COUNT);
  const cPy = new Float32Array(CONFETTI_COUNT);
  const cPz = new Float32Array(CONFETTI_COUNT);
  const cVx = new Float32Array(CONFETTI_COUNT);
  const cVy = new Float32Array(CONFETTI_COUNT);
  const cVz = new Float32Array(CONFETTI_COUNT);
  const cRx = new Float32Array(CONFETTI_COUNT);
  const cRy = new Float32Array(CONFETTI_COUNT);
  const cVrx = new Float32Array(CONFETTI_COUNT);
  const cVry = new Float32Array(CONFETTI_COUNT);
  let confettiTimer = 0;

  const triggerConfettiBurst = (x: number, y: number, z: number) => {
    confettiTimer = 2.4;
    confettiMesh.visible = true;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const ang = (i / CONFETTI_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = 2.5 + Math.random() * 4.5;
      cPx[i] = x + (Math.random() - 0.5) * 0.8;
      cPy[i] = y + 0.6 + Math.random() * 0.6;
      cPz[i] = z + (Math.random() - 0.5) * 0.8;
      cVx[i] = Math.cos(ang) * spd;
      cVy[i] = 5.5 + Math.random() * 5.0;
      cVz[i] = Math.sin(ang) * spd;
      cRx[i] = Math.random() * Math.PI;
      cRy[i] = Math.random() * Math.PI;
      cVrx[i] = (Math.random() - 0.5) * 10;
      cVry[i] = (Math.random() - 0.5) * 10;
    }
  };

  const setTargetBeacon = (pos: [number, number, number] | null, visible: boolean) => {
    if (!pos || !visible) {
      beaconMesh.visible = false;
      return;
    }
    beaconMesh.position.set(pos[0], 0, pos[2]);
    beaconMesh.visible = true;
  };

  // =========================================================================
  // 5. ZERO-ALLOCATION PER-FRAME UPDATE
  // =========================================================================
  const update = (
    delta: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    streetlightLevel: number
  ) => {
    const signals = getTrafficSignalSnapshot(elapsed);
    lightsMat.emissiveIntensity = 0.35 + streetlightLevel * 1.4;

    // A. Update Vehicles
    for (let i = 0; i < vehicleCount; i++) {
      const v = vehicles[i];
      if (v.turnCooldown > 0) v.turnCooldown -= delta;

      const along = v.axis === 'Z' ? v.z : v.x;
      const nextInt = findNextIntersection(along, v.dir);
      let shouldStop = false;

      if (nextInt !== null) {
        const distToInt = (nextInt - along) * v.dir;
        const stopOffset = nextInt === 0 ? 7.2 : 4.2;
        const sig = v.axis === 'Z' ? signals.nsVehicle : signals.ewVehicle;
        if (sig !== 'GREEN' && distToInt > stopOffset - 1.2 && distToInt < stopOffset + 3.2) {
          shouldStop = true;
        } else if (distToInt <= 1.2 && v.turnCooldown <= 0) {
          const atEdge = Math.abs(nextInt) >= 62.5;
          const roll = Math.random();
          // Buses stay on Grand Boulevard (x=0 or z=0)
          const canTurn = v.archetype !== 'BUS' || nextInt === 0;
          if (canTurn && (atEdge || roll > 0.65)) {
            const turnRight = roll > 0.825;
            const prevAxis = v.axis;
            const prevDir = v.dir;
            let newAxis: 'X' | 'Z';
            let newDir: 1 | -1;
            if (prevAxis === 'Z') {
              newAxis = 'X';
              newDir = turnRight ? (-prevDir as 1 | -1) : prevDir;
            } else {
              newAxis = 'Z';
              newDir = turnRight ? prevDir : (-prevDir as 1 | -1);
            }
            if (nextInt === 63 && newDir === 1 && ((newAxis === 'X' && v.x > 58) || (newAxis === 'Z' && v.z > 58))) {
              newDir = -1;
            } else if (nextInt === -63 && newDir === -1 && ((newAxis === 'X' && v.x < -58) || (newAxis === 'Z' && v.z < -58))) {
              newDir = 1;
            }
            v.axis = newAxis;
            v.dir = newDir;
            v.roadCoord = nextInt;
            v.targetYaw = getHeadingYaw(newAxis, newDir);
            v.turnCooldown = 2.0;
          } else {
            v.turnCooldown = 1.0;
          }
        }
      } else if (along * v.dir > 64) {
        if (v.axis === 'Z') v.z = -v.dir * 63;
        else v.x = -v.dir * 63;
      }

      // Player safety yielding (4.5m forward cone)
      const fwdX = Math.sin(v.yaw);
      const fwdZ = Math.cos(v.yaw);
      const pdx = playerPos.x - v.x;
      const pdz = playerPos.z - v.z;
      const pDistSq = pdx * pdx + pdz * pdz;
      if (pDistSq < 4.5 * 4.5 && pDistSq > 0.01) {
        const pDist = Math.sqrt(pDistSq);
        const dot = (pdx * fwdX + pdz * fwdZ) / pDist;
        if (dot > 0.7) shouldStop = true;
      }

      // Same-lane vehicle gap yielding (5.8m ahead)
      if (!shouldStop) {
        for (let j = 0; j < vehicleCount; j++) {
          if (i === j) continue;
          const o = vehicles[j];
          if (o.axis !== v.axis || o.dir !== v.dir || o.roadCoord !== v.roadCoord) continue;
          const gap = ((v.axis === 'Z' ? o.z - v.z : o.x - v.x)) * v.dir;
          if (gap > 0 && gap < 5.8) {
            shouldStop = true;
            break;
          }
        }
      }

      const targetSpeed = shouldStop ? 0 : v.maxSpeed;
      v.isBraking = shouldStop || v.speed < targetSpeed - 0.5;
      v.speed += (targetSpeed - v.speed) * Math.min(1, delta * (shouldStop ? 7.5 : 3.5));

      const yawDiff = shortestAngleDiff(v.yaw, v.targetYaw);
      v.yaw += yawDiff * Math.min(1, delta * 6.5);

      // Subtle suspension nose-dive on braking & body roll on turns
      const targetPitch = v.isBraking && v.speed > 0.4 ? 0.032 : 0;
      const targetRoll = THREE.MathUtils.clamp(-yawDiff * 0.06, -0.045, 0.045);
      v.pitch += (targetPitch - v.pitch) * Math.min(1, delta * 8);
      v.roll += (targetRoll - v.roll) * Math.min(1, delta * 8);

      const desiredLane = getLeftHandLaneCoord(v.roadCoord, v.axis, v.dir);
      if (v.axis === 'Z') {
        v.x += (desiredLane - v.x) * Math.min(1, delta * 5.0);
        v.z += v.dir * v.speed * delta;
      } else {
        v.z += (desiredLane - v.z) * Math.min(1, delta * 5.0);
        v.x += v.dir * v.speed * delta;
      }

      _dummy.position.set(v.x, 0.05, v.z);
      _dummy.rotation.set(v.pitch, v.yaw, v.roll);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();

      if (v.archetype === 'BUS') {
        busMesh.setMatrixAt(v.archetypeIndex, _dummy.matrix);
      } else if (v.archetype === 'TAXI') {
        taxiMesh.setMatrixAt(v.archetypeIndex, _dummy.matrix);
      } else {
        keiMesh.setMatrixAt(v.archetypeIndex, _dummy.matrix);
      }

      // Scale lights to match archetype length/width + subtle brake flare
      if (v.archetype === 'BUS') {
        _dummy.scale.set(1.22, 1.35, 1.72);
      } else if (v.archetype === 'TAXI') {
        _dummy.scale.set(1.04, 1.0, 1.16);
      } else {
        _dummy.scale.set(1, v.isBraking ? 1.12 : 1.0, 1);
      }
      _dummy.updateMatrix();
      lightsMesh.setMatrixAt(i, _dummy.matrix);
    }
    keiMesh.instanceMatrix.needsUpdate = true;
    taxiMesh.instanceMatrix.needsUpdate = true;
    busMesh.instanceMatrix.needsUpdate = true;
    lightsMesh.instanceMatrix.needsUpdate = true;

    // B. Update Articulated Pedestrians
    for (let i = 0; i < pedCount; i++) {
      const p = pedestrians[i];
      const along = p.axis === 'Z' ? p.z : p.x;
      const nextInt = findNextIntersection(along, p.dir);
      let walking = true;

      if (nextInt !== null) {
        const distToInt = (nextInt - along) * p.dir;
        const crosswalkOffset = nextInt === 0 ? 6.2 : 3.2;
        const canWalk = p.axis === 'Z' ? signals.nsPedWalk : signals.ewPedWalk;
        if (!canWalk && distToInt > crosswalkOffset - 0.6 && distToInt < crosswalkOffset + 1.4) {
          walking = false;
        }
      }

      if (walking) {
        p.phase += delta * p.speed * 5.5;
        if (p.axis === 'Z') {
          p.z += p.dir * p.speed * delta;
          if (p.z > 65 || p.z < -65) p.dir = (-p.dir) as 1 | -1;
        } else {
          p.x += p.dir * p.speed * delta;
          if (p.x > 65 || p.x < -65) p.dir = (-p.dir) as 1 | -1;
        }
        p.swing = Math.sin(p.phase) * 0.52;
      } else {
        p.swing += (0 - p.swing) * Math.min(1, delta * 8.0);
      }

      const yaw = getHeadingYaw(p.axis, p.dir);
      const bounce = walking ? Math.abs(Math.sin(p.phase)) * 0.045 : 0;

      // Torso & Head
      _dummy.position.set(p.x, 0.15 + bounce, p.z);
      _dummy.rotation.set(0, yaw, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      pedTorsoMesh.setMatrixAt(i, _dummy.matrix);
      pedHeadMesh.setMatrixAt(i, _dummy.matrix);

      // Swing Pair A (Left Arm + Right Leg)
      _dummyAlt.position.set(p.x, 0.15 + 0.86 + bounce, p.z);
      _dummyAlt.rotation.set(p.swing, yaw, 0, 'YXZ');
      _dummyAlt.scale.set(1, 1, 1);
      _dummyAlt.updateMatrix();
      pedSwingAMesh.setMatrixAt(i, _dummyAlt.matrix);

      // Swing Pair B (Right Arm + Left Leg)
      _dummyAlt.rotation.set(-p.swing, yaw, 0, 'YXZ');
      _dummyAlt.updateMatrix();
      pedSwingBMesh.setMatrixAt(i, _dummyAlt.matrix);
    }
    pedTorsoMesh.instanceMatrix.needsUpdate = true;
    pedHeadMesh.instanceMatrix.needsUpdate = true;
    pedSwingAMesh.instanceMatrix.needsUpdate = true;
    pedSwingBMesh.instanceMatrix.needsUpdate = true;

    // C. Pulse 3D Target Beacon
    if (beaconMesh.visible) {
      const pulse = 0.85 + 0.15 * Math.sin(elapsed * 3.2);
      beaconMesh.scale.set(pulse, 1, pulse);
    }

    // D. Update Pooled Confetti Burst
    if (confettiTimer > 0) {
      confettiTimer -= delta;
      if (confettiTimer <= 0) {
        confettiMesh.visible = false;
      } else {
        for (let i = 0; i < CONFETTI_COUNT; i++) {
          cVy[i] -= 9.8 * delta;
          cPx[i] += cVx[i] * delta;
          cPy[i] = Math.max(0.18, cPy[i] + cVy[i] * delta);
          cPz[i] += cVz[i] * delta;
          cRx[i] += cVrx[i] * delta;
          cRy[i] += cVry[i] * delta;
          _dummy.position.set(cPx[i], cPy[i], cPz[i]);
          _dummy.rotation.set(cRx[i], cRy[i], 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          confettiMesh.setMatrixAt(i, _dummy.matrix);
        }
        confettiMesh.instanceMatrix.needsUpdate = true;
      }
    }
  };

  const dispose = () => {
    keiGeo.dispose();
    taxiGeo.dispose();
    busGeo.dispose();
    vehicleMat.dispose();
    lightsGeo.dispose();
    lightsMat.dispose();
    pedTorsoGeo.dispose();
    pedTorsoMat.dispose();
    pedHeadGeo.dispose();
    pedHeadMat.dispose();
    pedSwingAGeo.dispose();
    pedSwingBGeo.dispose();
    pedLimbMat.dispose();
    beaconGeo.dispose();
    beaconMat.dispose();
    confettiGeo.dispose();
    confettiMat.dispose();
  };

  return {
    group,
    update,
    triggerConfettiBurst,
    setTargetBeacon,
    dispose,
  };
}
