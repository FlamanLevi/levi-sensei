import * as THREE from 'three';
import { batchStaticMeshes } from '../staticBatcher';

export interface BicycleMesh {
  group: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  updateAnimation: (isMoving: boolean, delta: number, speed: number) => void;
}

function addTubeBetween(
  parent: THREE.Object3D,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  radius: number,
  mat: THREE.Material
): void {
  const dir = new THREE.Vector3().subVectors(p1, p0);
  const len = dir.length();
  if (len < 0.001) return;
  const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(p0).add(p1).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
}

/**
 * Builds a high-detail 3D Japanese City Bicycle (*Mamachari* / 自転車)
 * complete with open wire-mesh front basket, dynamo headlamp, brass bell, chainring & guard,
 * twin chainstays/seatstays, rear luggage carrier with struts, double kickstand, and grounded 0.32m wheels.
 */
export function buildBicycleMesh(colorHex: number = 0x0ea5e9): BicycleMesh {
  const group = new THREE.Group();
  group.name = 'Vehicle_Bicycle';

  const frameMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.30,
    metalness: 0.35,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.20,
    metalness: 0.85,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, metalness: 0.0 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.20, metalness: 0.85 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.75, metalness: 0.0 });
  const basketMat = new THREE.MeshStandardMaterial({
    color: 0xcfd8dc,
    roughness: 0.25,
    metalness: 0.75,
  });
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.20,
    metalness: 0.85,
  });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 1.2,
  });
  const reflectorRedMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.8,
  });

  function buildWheel(name: string): THREE.Group {
    const wheel = new THREE.Group();
    wheel.name = name;

    // Torus(0.28, 0.04) -> outer radius = 0.32m, kissing y = 0.00m exactly when axle is at y = 0.32m
    const tireGeom = new THREE.TorusGeometry(0.28, 0.04, 10, 24);
    tireGeom.rotateY(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeom, tireMat);
    wheel.add(tire);

    const rimGeom = new THREE.TorusGeometry(0.24, 0.018, 8, 24);
    rimGeom.rotateY(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, chromeMat);
    wheel.add(rim);

    const hubGeom = new THREE.CylinderGeometry(0.038, 0.038, 0.09, 10);
    hubGeom.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeom, chromeMat);
    wheel.add(hub);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 4;
      const spokeGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.48, 6);
      const spoke = new THREE.Mesh(spokeGeom, spokeMat);
      spoke.rotation.x = angle;
      wheel.add(spoke);
    }

    batchStaticMeshes(wheel, [], { ignoreShadowFlags: true, bakeVertexColors: true });
    return wheel;
  }

  const rearWheel = buildWheel('Bicycle_RearWheel');
  rearWheel.position.set(0, 0.32, -0.52);
  group.add(rearWheel);

  const frontWheel = buildWheel('Bicycle_FrontWheel');
  frontWheel.position.set(0, 0.32, 0.52);
  group.add(frontWheel);

  const frameGroup = new THREE.Group();
  frameGroup.name = 'Bicycle_Frame';

  // Bottom bracket, chainring, crank arms & pedals
  const bbPos = new THREE.Vector3(0, 0.28, -0.04);
  const bottomBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.14, 10), chromeMat);
  bottomBracket.rotation.z = Math.PI / 2;
  bottomBracket.position.copy(bbPos);
  frameGroup.add(bottomBracket);

  const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.014, 14), chromeMat);
  chainring.rotation.z = Math.PI / 2;
  chainring.position.set(0.042, 0.28, -0.04);
  frameGroup.add(chainring);

  [-0.08, 0.08].forEach((px, idx) => {
    const sign = idx === 0 ? 1 : -1;
    const pedalPos = new THREE.Vector3(px, 0.28 + sign * 0.09, -0.04 + sign * 0.06);
    addTubeBetween(frameGroup, new THREE.Vector3(px * 0.75, 0.28, -0.04), pedalPos, 0.012, chromeMat);
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.09), tireMat);
    pedal.position.copy(pedalPos);
    frameGroup.add(pedal);
  });

  // Enclosed Japanese Chain Guard Cover (*Chēn-kēsu*) on right side
  const chainCase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.10, 0.48), frameMat);
  chainCase.position.set(0.055, 0.30, -0.28);
  frameGroup.add(chainCase);

  // Accurate Point-to-Point Twin Chainstays & Seatstays straddling rear wheel
  const seatCluster = new THREE.Vector3(0, 0.62, -0.14);
  const headTop = new THREE.Vector3(0, 0.72, 0.36);
  const headBot = new THREE.Vector3(0, 0.56, 0.41);

  [-0.055, 0.055].forEach((sideX) => {
    const rearAxle = new THREE.Vector3(sideX, 0.32, -0.52);
    addTubeBetween(frameGroup, new THREE.Vector3(sideX * 0.6, 0.28, -0.04), rearAxle, 0.016, frameMat);
    addTubeBetween(frameGroup, new THREE.Vector3(sideX * 0.45, 0.58, -0.13), rearAxle, 0.014, frameMat);
  });

  // Seat Tube, Seatpost & Clamp
  addTubeBetween(frameGroup, bbPos, seatCluster, 0.022, frameMat);
  addTubeBetween(frameGroup, seatCluster, new THREE.Vector3(0, 0.71, -0.16), 0.016, chromeMat);

  // Authentic Japanese Step-Through Curved Twin Downtubes
  const midCurve = new THREE.Vector3(0, 0.36, 0.16);
  addTubeBetween(frameGroup, bbPos, midCurve, 0.022, frameMat);
  addTubeBetween(frameGroup, midCurve, headBot, 0.022, frameMat);
  addTubeBetween(frameGroup, new THREE.Vector3(0, 0.48, -0.09), new THREE.Vector3(0, 0.66, 0.38), 0.018, frameMat);

  // Head Tube & Twin Front Fork Blades
  addTubeBetween(frameGroup, headBot, headTop, 0.026, frameMat);
  [-0.048, 0.048].forEach((fx) => {
    addTubeBetween(
      frameGroup,
      new THREE.Vector3(fx * 0.6, 0.56, 0.41),
      new THREE.Vector3(fx, 0.32, 0.52),
      0.015,
      frameMat
    );
  });

  // Rear Mamachari Double Kickstand
  [-0.10, 0.10].forEach((kx) => {
    addTubeBetween(
      frameGroup,
      new THREE.Vector3(kx * 0.55, 0.32, -0.52),
      new THREE.Vector3(kx, 0.04, -0.60),
      0.011,
      chromeMat
    );
  });
  addTubeBetween(
    frameGroup,
    new THREE.Vector3(-0.10, 0.04, -0.60),
    new THREE.Vector3(0.10, 0.04, -0.60),
    0.011,
    chromeMat
  );

  // Front Fork Dynamo Headlamp (*Dainamo Raito*)
  const headlampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.08, 10), chromeMat);
  headlampBody.rotation.x = Math.PI / 2;
  headlampBody.position.set(0.065, 0.54, 0.47);
  const headlampLens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), lampGlowMat);
  headlampLens.position.set(0.065, 0.54, 0.512);
  frameGroup.add(headlampBody, headlampLens);

  // Swept-back Comfort Handlebars, Grips, Brake Levers & Brass Bell
  addTubeBetween(frameGroup, headTop, new THREE.Vector3(0, 0.90, 0.32), 0.018, chromeMat);
  addTubeBetween(frameGroup, new THREE.Vector3(0, 0.90, 0.32), new THREE.Vector3(-0.18, 0.91, 0.28), 0.015, chromeMat);
  addTubeBetween(frameGroup, new THREE.Vector3(0, 0.90, 0.32), new THREE.Vector3(0.18, 0.91, 0.28), 0.015, chromeMat);

  [-0.22, 0.22].forEach((gx) => {
    const sign = gx < 0 ? -1 : 1;
    addTubeBetween(
      frameGroup,
      new THREE.Vector3(sign * 0.18, 0.91, 0.28),
      new THREE.Vector3(gx, 0.91, 0.21),
      0.020,
      saddleMat
    );
  });

  const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
  bellDome.position.set(-0.15, 0.94, 0.29);
  frameGroup.add(bellDome);

  // Open Hollow Wire-Mesh Front Basket + Head-Tube Bracket
  const basketCenter = new THREE.Vector3(0, 0.74, 0.50);
  addTubeBetween(frameGroup, new THREE.Vector3(0, 0.66, 0.38), new THREE.Vector3(0, 0.68, 0.42), 0.014, chromeMat);
  // Top & Bottom rectangular wire rims
  const bW = 0.30;
  const bD = 0.22;
  const bH = 0.18;
  [basketCenter.y - bH / 2, basketCenter.y + bH / 2].forEach((ry, rIdx) => {
    const rad = rIdx === 1 ? 0.012 : 0.008;
    const hw = bW / 2;
    const hd = bD / 2;
    const cz = basketCenter.z;
    addTubeBetween(frameGroup, new THREE.Vector3(-hw, ry, cz - hd), new THREE.Vector3(hw, ry, cz - hd), rad, basketMat);
    addTubeBetween(frameGroup, new THREE.Vector3(-hw, ry, cz + hd), new THREE.Vector3(hw, ry, cz + hd), rad, basketMat);
    addTubeBetween(frameGroup, new THREE.Vector3(-hw, ry, cz - hd), new THREE.Vector3(-hw, ry, cz + hd), rad, basketMat);
    addTubeBetween(frameGroup, new THREE.Vector3(hw, ry, cz - hd), new THREE.Vector3(hw, ry, cz + hd), rad, basketMat);
  });
  // Vertical corner & side cage bars + bottom floor bars
  [-0.15, -0.05, 0.05, 0.15].forEach((bx) => {
    addTubeBetween(
      frameGroup,
      new THREE.Vector3(bx, basketCenter.y - bH / 2, basketCenter.z - bD / 2),
      new THREE.Vector3(bx, basketCenter.y - bH / 2, basketCenter.z + bD / 2),
      0.006,
      basketMat
    );
    addTubeBetween(
      frameGroup,
      new THREE.Vector3(bx, basketCenter.y - bH / 2, basketCenter.z + bD / 2),
      new THREE.Vector3(bx, basketCenter.y + bH / 2, basketCenter.z + bD / 2),
      0.006,
      basketMat
    );
    addTubeBetween(
      frameGroup,
      new THREE.Vector3(bx, basketCenter.y - bH / 2, basketCenter.z - bD / 2),
      new THREE.Vector3(bx, basketCenter.y + bH / 2, basketCenter.z - bD / 2),
      0.006,
      basketMat
    );
  });

  // Sculpted Rounded Sprung Leather Saddle
  const saddleBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.22), saddleMat);
  saddleBase.position.set(0, 0.72, -0.16);
  const saddleNose = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.10, 8), saddleMat);
  saddleNose.rotation.x = Math.PI / 2;
  saddleNose.position.set(0, 0.72, -0.05);
  frameGroup.add(saddleBase, saddleNose);

  // Rear Luggage Carrier Rack (*Rear Kyaria*) with Diagonal Struts & Fender Tail Reflector
  const carrierRack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.36), chromeMat);
  carrierRack.position.set(0, 0.69, -0.52);
  frameGroup.add(carrierRack);
  [-0.065, 0.065].forEach((cx) => {
    addTubeBetween(frameGroup, new THREE.Vector3(cx, 0.68, -0.66), new THREE.Vector3(cx * 0.85, 0.32, -0.52), 0.01, chromeMat);
  });

  // Front & Rear Mudguard Fenders cleanly outside tires (r = 0.345m) + Twin Fender Stays
  const fenderGeom = new THREE.CylinderGeometry(0.345, 0.345, 0.07, 16, 1, true, 0, Math.PI);
  const rearFender = new THREE.Mesh(fenderGeom, frameMat);
  rearFender.rotation.x = Math.PI / 2;
  rearFender.rotation.z = -Math.PI / 2;
  rearFender.position.set(0, 0.32, -0.52);
  const frontFender = new THREE.Mesh(fenderGeom, frameMat);
  frontFender.rotation.x = Math.PI / 2;
  frontFender.rotation.z = -Math.PI / 2;
  frontFender.position.set(0, 0.32, 0.52);
  frameGroup.add(rearFender, frontFender);

  // Tail Reflector mounted cleanly on Rear Fender
  const tailReflector = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.02), reflectorRedMat);
  tailReflector.position.set(0, 0.45, -0.84);
  frameGroup.add(tailReflector);

  // Batch rigid frame while detached at identity (0, 0, 0)
  batchStaticMeshes(frameGroup, [], { ignoreShadowFlags: true, bakeVertexColors: true });
  group.add(frameGroup);

  const updateAnimation = (isMoving: boolean, delta: number, speed: number) => {
    if (isMoving) {
      const rotDelta = (speed * delta) / 0.32;
      frontWheel.rotation.x += rotDelta;
      rearWheel.rotation.x += rotDelta;
    }
  };

  return {
    group,
    frontWheel,
    rearWheel,
    updateAnimation,
  };
}
