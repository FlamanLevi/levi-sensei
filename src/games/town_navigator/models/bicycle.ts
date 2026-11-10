import * as THREE from 'three';

export interface BicycleMesh {
  group: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  updateAnimation: (isMoving: boolean, delta: number, speed: number) => void;
}

/**
 * Builds a high-detail 3D Japanese City Bicycle (*Mamachari* / 自転車)
 * complete with front basket, dynamo headlamp, brass bell, chain-case cover,
 * pedals, rear luggage carrier rack, red tail reflector, and spinning spoke wheels.
 */
export function buildBicycleMesh(colorHex: number = 0x0ea5e9): BicycleMesh {
  const group = new THREE.Group();
  group.name = 'Vehicle_Bicycle';

  const frameMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.28,
    metalness: 0.35,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.18,
    metalness: 0.88,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const spokeMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
  const basketMat = new THREE.MeshStandardMaterial({
    color: 0xcfd8dc,
    roughness: 0.35,
    metalness: 0.65,
  });
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.9,
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

  function buildWheel(): THREE.Group {
    const wheel = new THREE.Group();

    const tireGeom = new THREE.TorusGeometry(0.32, 0.045, 10, 24);
    const tire = new THREE.Mesh(tireGeom, tireMat);
    tire.castShadow = true;
    wheel.add(tire);

    const rimGeom = new THREE.TorusGeometry(0.28, 0.02, 8, 24);
    const rim = new THREE.Mesh(rimGeom, chromeMat);
    wheel.add(rim);

    const hubGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
    const hub = new THREE.Mesh(hubGeom, chromeMat);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 4;
      const spokeGeom = new THREE.CylinderGeometry(0.006, 0.006, 0.58, 6);
      const spoke = new THREE.Mesh(spokeGeom, spokeMat);
      spoke.rotation.z = angle;
      wheel.add(spoke);
    }

    return wheel;
  }

  const rearWheel = buildWheel();
  rearWheel.position.set(0, 0.32, -0.52);
  group.add(rearWheel);

  const frontWheel = buildWheel();
  frontWheel.position.set(0, 0.32, 0.52);
  group.add(frontWheel);

  const frameGroup = new THREE.Group();

  // Bottom bracket / crankset & pedals
  const bottomBracketGeom = new THREE.CylinderGeometry(0.038, 0.038, 0.14, 12);
  const bottomBracket = new THREE.Mesh(bottomBracketGeom, chromeMat);
  bottomBracket.rotation.z = Math.PI / 2;
  bottomBracket.position.set(0, 0.28, -0.04);
  frameGroup.add(bottomBracket);

  [-0.08, 0.08].forEach((px, idx) => {
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.09), tireMat);
    pedal.position.set(px, 0.28 + (idx === 0 ? 0.09 : -0.09), -0.04 + (idx === 0 ? 0.06 : -0.06));
    frameGroup.add(pedal);
  });

  // Enclosed Japanese Chain Guard Cover (*Chēn-kēsu*) on right side
  const chainCase = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.11, 0.52), frameMat);
  chainCase.position.set(0.045, 0.29, -0.28);
  frameGroup.add(chainCase);

  const chainstayGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.50, 8);
  const chainstay = new THREE.Mesh(chainstayGeom, frameMat);
  chainstay.position.set(0, 0.30, -0.28);
  chainstay.rotation.x = -0.15;
  frameGroup.add(chainstay);

  const seatTubeGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8);
  const seatTube = new THREE.Mesh(seatTubeGeom, frameMat);
  seatTube.position.set(0, 0.48, -0.09);
  seatTube.rotation.x = -0.24;
  frameGroup.add(seatTube);

  const seatStayGeom = new THREE.CylinderGeometry(0.018, 0.018, 0.54, 8);
  const seatStay = new THREE.Mesh(seatStayGeom, frameMat);
  seatStay.position.set(0, 0.49, -0.32);
  seatStay.rotation.x = 0.65;
  frameGroup.add(seatStay);

  const downTubeGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8);
  const downTube = new THREE.Mesh(downTubeGeom, frameMat);
  downTube.position.set(0, 0.44, 0.20);
  downTube.rotation.x = -0.62;
  frameGroup.add(downTube);

  const headTubeGeom = new THREE.CylinderGeometry(0.028, 0.028, 0.32, 8);
  const headTube = new THREE.Mesh(headTubeGeom, frameMat);
  headTube.position.set(0, 0.66, 0.38);
  headTube.rotation.x = -0.30;
  frameGroup.add(headTube);

  [-0.045, 0.045].forEach((fx) => {
    const forkBladeGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.42, 8);
    const forkBlade = new THREE.Mesh(forkBladeGeom, chromeMat);
    forkBlade.position.set(fx, 0.46, 0.45);
    forkBlade.rotation.x = -0.30;
    frameGroup.add(forkBlade);
  });

  // Front Fork Dynamo Headlamp (*Dainamo Raito*)
  const headlampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.08, 10), chromeMat);
  headlampBody.rotation.x = Math.PI / 2;
  headlampBody.position.set(0.065, 0.56, 0.48);
  const headlampLens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), lampGlowMat);
  headlampLens.position.set(0.065, 0.56, 0.522);
  frameGroup.add(headlampBody, headlampLens);

  // Handlebars & Grips
  const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8);
  const stem = new THREE.Mesh(stemGeom, chromeMat);
  stem.position.set(0, 0.82, 0.34);
  stem.rotation.x = 0.12;
  frameGroup.add(stem);

  const barGeom = new THREE.CylinderGeometry(0.016, 0.016, 0.48, 8);
  const bar = new THREE.Mesh(barGeom, chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.92, 0.30);
  frameGroup.add(bar);

  [-0.23, 0.23].forEach((gx) => {
    const gripGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.08, 8);
    const grip = new THREE.Mesh(gripGeom, saddleMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(gx, 0.92, 0.28);
    frameGroup.add(grip);
  });

  const bellDomeGeom = new THREE.SphereGeometry(0.032, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const bellDome = new THREE.Mesh(bellDomeGeom, bellMat);
  bellDome.position.set(-0.16, 0.95, 0.31);
  frameGroup.add(bellDome);

  // Japanese Front Wire Shopping/School Basket with Upper Rim
  const basketGeom = new THREE.BoxGeometry(0.32, 0.20, 0.22);
  const basket = new THREE.Mesh(basketGeom, basketMat);
  basket.position.set(0, 0.76, 0.48);
  const basketRim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), chromeMat);
  basketRim.position.set(0, 0.86, 0.48);
  frameGroup.add(basket, basketRim);

  // Sprung Leather Saddle
  const saddleGeom = new THREE.BoxGeometry(0.18, 0.07, 0.26);
  const saddle = new THREE.Mesh(saddleGeom, saddleMat);
  saddle.position.set(0, 0.72, -0.14);
  saddle.castShadow = true;
  frameGroup.add(saddle);

  // Rear Luggage Carrier Rack (*Rear Kyaria*) & Red Tail Reflector
  const carrierRack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.36), chromeMat);
  carrierRack.position.set(0, 0.68, -0.52);
  const tailReflector = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), reflectorRedMat);
  tailReflector.position.set(0, 0.48, -0.86);
  frameGroup.add(carrierRack, tailReflector);

  // Front & Rear Mudguard Fenders
  const fenderGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.07, 16, 1, true, 0, Math.PI);
  const rearFender = new THREE.Mesh(fenderGeom, frameMat);
  rearFender.rotation.x = Math.PI / 2;
  rearFender.rotation.z = -Math.PI / 2;
  rearFender.position.set(0, 0.32, -0.52);
  const frontFender = new THREE.Mesh(fenderGeom, frameMat);
  frontFender.rotation.x = Math.PI / 2;
  frontFender.rotation.z = -Math.PI / 2;
  frontFender.position.set(0, 0.32, 0.52);
  frameGroup.add(rearFender, frontFender);

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
