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
const _tmpColor = new THREE.Color();

function createSeededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
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
    // Heading South (+Z, dir=1) -> +X; Heading North (-Z, dir=-1) -> -X
    return roadCoord + dir * offset;
  }
  // Heading East (+X, dir=1) -> -Z; Heading West (-X, dir=-1) -> +Z
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

interface VehicleState {
  axis: 'X' | 'Z';
  dir: 1 | -1;
  roadCoord: number;
  x: number;
  z: number;
  yaw: number;
  targetYaw: number;
  speed: number;
  maxSpeed: number;
  isBus: boolean;
  turnCooldown: number;
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
}

/**
 * Creates a self-contained, zero-allocation Living Town controller:
 * - Instanced Japanese kei-car/bus fleet (3 draw calls)
 * - Instanced strolling sidewalk pedestrians (2 draw calls)
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
  const pedCount = lowPower ? 16 : 26;

  // =========================================================================
  // 1. INSTANCED VEHICLE FLEET (3 draw calls total)
  // =========================================================================
  const chassisGeo = new THREE.BoxGeometry(1.45, 0.72, 2.85);
  chassisGeo.translate(0, 0.66, 0);
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.25,
  });
  const chassisMesh = new THREE.InstancedMesh(chassisGeo, chassisMat, vehicleCount);
  chassisMesh.frustumCulled = false;

  // Merged cabin + 4 wheels (1 draw call)
  const cabinPart = normalizeForMerge(new THREE.BoxGeometry(1.26, 0.54, 1.52));
  cabinPart.translate(0, 1.28, -0.1);

  const wheelParts: THREE.BufferGeometry[] = [];
  const wheelCoords: Array<[number, number]> = [
    [-0.68, 0.88],
    [0.68, 0.88],
    [-0.68, -0.88],
    [0.68, -0.88],
  ];
  wheelCoords.forEach(([wx, wz]) => {
    const w = normalizeForMerge(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10));
    w.rotateZ(Math.PI / 2);
    w.translate(wx, 0.28, wz);
    wheelParts.push(w);
  });
  const cabinWheelsGeo = mergeGeometries([cabinPart, ...wheelParts], false)!;
  cabinPart.dispose();
  wheelParts.forEach((w) => w.dispose());

  const cabinWheelsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.3,
  });
  const cabinWheelsMesh = new THREE.InstancedMesh(cabinWheelsGeo, cabinWheelsMat, vehicleCount);
  cabinWheelsMesh.frustumCulled = false;

  // Merged headlights (front +Z) & taillights (rear -Z) with vertex colors (1 draw call)
  const headL = addVertexColor(new THREE.BoxGeometry(0.28, 0.14, 0.06), 0xfef9c3);
  headL.translate(-0.46, 0.64, 1.43);
  const headR = addVertexColor(new THREE.BoxGeometry(0.28, 0.14, 0.06), 0xfef9c3);
  headR.translate(0.46, 0.64, 1.43);
  const tailL = addVertexColor(new THREE.BoxGeometry(0.28, 0.14, 0.06), 0xef4444);
  tailL.translate(-0.46, 0.68, -1.43);
  const tailR = addVertexColor(new THREE.BoxGeometry(0.28, 0.14, 0.06), 0xef4444);
  tailR.translate(0.46, 0.68, -1.43);
  const lightsGeo = mergeGeometries([headL, headR, tailL, tailR], false)!;
  headL.dispose();
  headR.dispose();
  tailL.dispose();
  tailR.dispose();

  const lightsMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });
  const lightsMesh = new THREE.InstancedMesh(lightsGeo, lightsMat, vehicleCount);
  lightsMesh.frustumCulled = false;

  const carPalette = [
    0xf8fafc, // Pearl White
    0xa7f3d0, // Mint Kei
    0xfef08a, // Cream Yellow
    0x7dd3fc, // Sky Blue
    0x1e293b, // Tokyo Taxi Black
    0xf97316, // Kei Orange
  ];
  const busColor = 0x0284c7;

  const vehicles: VehicleState[] = [];
  for (let i = 0; i < vehicleCount; i++) {
    const isBus = i < 2;
    const axis: 'X' | 'Z' = i % 2 === 0 ? 'Z' : 'X';
    const dir: 1 | -1 = (Math.floor(i / 2) % 2 === 0 ? 1 : -1) as 1 | -1;
    const roadCoord = ROAD_COORDS[Math.floor(rng() * ROAD_COORDS.length)];
    const along = -58 + rng() * 116;
    const lane = getLeftHandLaneCoord(roadCoord, axis, dir);
    const x = axis === 'Z' ? lane : along;
    const z = axis === 'Z' ? along : lane;
    const yaw = getHeadingYaw(axis, dir);

    vehicles.push({
      axis,
      dir,
      roadCoord,
      x,
      z,
      yaw,
      targetYaw: yaw,
      speed: 5.0,
      maxSpeed: isBus ? 6.8 : 7.5 + rng() * 2.5,
      isBus,
      turnCooldown: 0,
    });

    _tmpColor.setHex(isBus ? busColor : carPalette[i % carPalette.length]);
    chassisMesh.setColorAt(i, _tmpColor);
  }
  if (chassisMesh.instanceColor) chassisMesh.instanceColor.needsUpdate = true;

  group.add(chassisMesh, cabinWheelsMesh, lightsMesh);

  // =========================================================================
  // 2. INSTANCED STROLLING PEDESTRIANS (2 draw calls total)
  // =========================================================================
  const pedBodyGeo = new THREE.BoxGeometry(0.38, 1.02, 0.24);
  pedBodyGeo.translate(0, 0.56, 0);
  const pedBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
  const pedBodyMesh = new THREE.InstancedMesh(pedBodyGeo, pedBodyMat, pedCount);
  pedBodyMesh.frustumCulled = false;

  const pedHeadGeo = new THREE.SphereGeometry(0.17, 10, 8);
  pedHeadGeo.translate(0, 1.24, 0);
  const pedHeadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });
  const pedHeadMesh = new THREE.InstancedMesh(pedHeadGeo, pedHeadMat, pedCount);
  pedHeadMesh.frustumCulled = false;

  const outfitPalette = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x334155];
  const headPalette = [0xfde68a, 0xfdba74, 0x1e293b, 0xfef08a, 0x93c5fd];

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
      speed: 1.2 + rng() * 0.5,
      phase: rng() * Math.PI * 2,
    });

    _tmpColor.setHex(outfitPalette[i % outfitPalette.length]);
    pedBodyMesh.setColorAt(i, _tmpColor);
    _tmpColor.setHex(headPalette[i % headPalette.length]);
    pedHeadMesh.setColorAt(i, _tmpColor);
  }
  if (pedBodyMesh.instanceColor) pedBodyMesh.instanceColor.needsUpdate = true;
  if (pedHeadMesh.instanceColor) pedHeadMesh.instanceColor.needsUpdate = true;

  group.add(pedBodyMesh, pedHeadMesh);

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

      // 1. Traffic signal stop check
      if (nextInt !== null) {
        const distToInt = (nextInt - along) * v.dir;
        const stopOffset = nextInt === 0 ? 7.2 : 4.2;
        const sig = v.axis === 'Z' ? signals.nsVehicle : signals.ewVehicle;
        if (sig !== 'GREEN' && distToInt > stopOffset - 1.2 && distToInt < stopOffset + 3.2) {
          shouldStop = true;
        } else if (distToInt <= 1.2 && v.turnCooldown <= 0) {
          // Arrived at open green intersection: choose straight, left, or right
          const atEdge = Math.abs(nextInt) >= 62.5;
          const roll = Math.random();
          if (atEdge || roll > 0.65) {
            // Turn 90 degrees onto perpendicular road
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
            // Prevent turning outside town bounds at edges
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
        // Wrap around gracefully if ever past town edge
        if (v.axis === 'Z') v.z = -v.dir * 63;
        else v.x = -v.dir * 63;
      }

      // 2. Player safety yielding (4.5m forward cone)
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

      // 3. Same-lane vehicle gap yielding (5.5m ahead)
      if (!shouldStop) {
        for (let j = 0; j < vehicleCount; j++) {
          if (i === j) continue;
          const o = vehicles[j];
          if (o.axis !== v.axis || o.dir !== v.dir || o.roadCoord !== v.roadCoord) continue;
          const gap = ((v.axis === 'Z' ? o.z - v.z : o.x - v.x)) * v.dir;
          if (gap > 0 && gap < 5.5) {
            shouldStop = true;
            break;
          }
        }
      }

      const targetSpeed = shouldStop ? 0 : v.maxSpeed;
      v.speed += (targetSpeed - v.speed) * Math.min(1, delta * (shouldStop ? 7.5 : 3.5));

      // Smoothly converge yaw & lateral lane coordinate
      v.yaw += shortestAngleDiff(v.yaw, v.targetYaw) * Math.min(1, delta * 6.5);
      const desiredLane = getLeftHandLaneCoord(v.roadCoord, v.axis, v.dir);
      if (v.axis === 'Z') {
        v.x += (desiredLane - v.x) * Math.min(1, delta * 5.0);
        v.z += v.dir * v.speed * delta;
      } else {
        v.z += (desiredLane - v.z) * Math.min(1, delta * 5.0);
        v.x += v.dir * v.speed * delta;
      }

      _dummy.position.set(v.x, 0.05, v.z);
      _dummy.rotation.set(0, v.yaw, 0);
      if (v.isBus) {
        _dummy.scale.set(1.05, 1.35, 1.45);
      } else {
        _dummy.scale.set(1, 1, 1);
      }
      _dummy.updateMatrix();
      chassisMesh.setMatrixAt(i, _dummy.matrix);
      cabinWheelsMesh.setMatrixAt(i, _dummy.matrix);
      lightsMesh.setMatrixAt(i, _dummy.matrix);
    }
    chassisMesh.instanceMatrix.needsUpdate = true;
    cabinWheelsMesh.instanceMatrix.needsUpdate = true;
    lightsMesh.instanceMatrix.needsUpdate = true;

    // B. Update Pedestrians
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
      }

      const bounce = walking ? Math.abs(Math.sin(p.phase)) * 0.08 : 0;
      const waddle = walking ? Math.sin(p.phase) * 0.06 : 0;
      _dummy.position.set(p.x, 0.15 + bounce, p.z);
      _dummy.rotation.set(0, getHeadingYaw(p.axis, p.dir), waddle);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      pedBodyMesh.setMatrixAt(i, _dummy.matrix);
      pedHeadMesh.setMatrixAt(i, _dummy.matrix);
    }
    pedBodyMesh.instanceMatrix.needsUpdate = true;
    pedHeadMesh.instanceMatrix.needsUpdate = true;

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
    chassisGeo.dispose();
    chassisMat.dispose();
    cabinWheelsGeo.dispose();
    cabinWheelsMat.dispose();
    lightsGeo.dispose();
    lightsMat.dispose();
    pedBodyGeo.dispose();
    pedBodyMat.dispose();
    pedHeadGeo.dispose();
    pedHeadMat.dispose();
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
