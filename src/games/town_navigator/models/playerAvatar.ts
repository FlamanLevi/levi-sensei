import * as THREE from 'three';

export interface PlayerAvatar {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  body: THREE.Group;
  updateAnimation: (isMoving: boolean, delta: number, speedRatio?: number) => void;
  resetAnimation: () => void;
}

/**
 * Builds a high-detail procedural 3D Japanese Elementary School Student
 * complete with leather Randoseru backpack, brass buckles, safety whistle charm,
 * collared polo shirt, yellow school cap (*Tsūgaku-bō*), and walking cycle articulation.
 * Height: ~1.4 meters (Grade 5 standard).
 */
export function buildPlayerAvatar(): PlayerAvatar {
  const group = new THREE.Group();
  group.name = 'Player_Student';

  // Calibrated PBR Materials (varied roughness & metalness)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.75 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.68 });
  const collarWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
  const randoMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.32, metalness: 0.12 });
  const randoBackPadMat = new THREE.MeshStandardMaterial({ color: 0xfef2f2, roughness: 0.6 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.22, metalness: 0.85 });
  const sockMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.6 });

  const body = new THREE.Group();
  group.add(body);

  // 1. Torso with White Polo Collar, Placket Buttons & Yellow Name Tag Badge
  const torsoGeom = new THREE.BoxGeometry(0.36, 0.42, 0.22);
  const torso = new THREE.Mesh(torsoGeom, shirtMat);
  torso.position.y = 0.72;
  torso.castShadow = true;
  body.add(torso);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.23), collarWhiteMat);
  collar.position.set(0, 0.92, 0.01);
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.015), collarWhiteMat);
  placket.position.set(0, 0.84, 0.112);
  const nameBadge = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.015), capMat);
  nameBadge.position.set(-0.10, 0.82, 0.112);
  body.add(collar, placket, nameBadge);

  // Shorts / Pelvis + Belt
  const shortsGeom = new THREE.BoxGeometry(0.34, 0.16, 0.21);
  const shorts = new THREE.Mesh(shortsGeom, shortsMat);
  shorts.position.y = 0.48;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.035, 0.22), hairMat);
  belt.position.y = 0.54;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), brassMat);
  buckle.position.set(0, 0.54, 0.11);
  body.add(shorts, belt, buckle);

  // 2. Detailed Leather Randoseru Backpack on Back (-Z direction)
  const randoGroup = new THREE.Group();
  randoGroup.position.set(0, 0.73, -0.16);

  // Cushioned Cream Back Pad
  const backPad = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.31, 0.025), randoBackPadMat);
  backPad.position.set(0, 0, 0.068);
  randoGroup.add(backPad);

  // Main leather body
  const randoGeom = new THREE.BoxGeometry(0.26, 0.34, 0.14);
  const randoMesh = new THREE.Mesh(randoGeom, randoMat);
  randoMesh.castShadow = true;
  randoGroup.add(randoMesh);

  // Rounded Top & Rear Kabiruse Flap with Brass Lock Clasp at Bottom
  const flapTop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.264, 12, 1, false, 0, Math.PI), randoMat);
  flapTop.rotation.z = Math.PI / 2;
  flapTop.position.set(0, 0.17, 0);
  const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.02), brassMat);
  lockPlate.position.set(0, -0.14, -0.072);
  randoGroup.add(flapTop, lockPlate);

  // Yellow safety reflector strip & dangling Bōhan-Buzā (Safety Alarm Charm) on side hook
  const reflectorGeom = new THREE.BoxGeometry(0.22, 0.04, 0.012);
  const reflector = new THREE.Mesh(reflectorGeom, capMat);
  reflector.position.set(0, -0.06, -0.072);
  const sideHook = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 10), brassMat);
  sideHook.position.set(0.135, 0.04, 0);
  const alarmCharm = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), capMat);
  alarmCharm.position.set(0.145, -0.01, 0);
  randoGroup.add(reflector, sideHook, alarmCharm);

  // Curved Shoulder Straps with Brass D-Rings
  [-0.09, 0.09].forEach((sx) => {
    const strapGeom = new THREE.BoxGeometry(0.042, 0.38, 0.032);
    const strap = new THREE.Mesh(strapGeom, randoMat);
    strap.position.set(sx, 0.01, 0.10);
    const dRing = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.038), brassMat);
    dRing.position.set(sx, 0.06, 0.105);
    randoGroup.add(strap, dRing);
  });

  body.add(randoGroup);

  // 3. Head, Ears, Expressive Eyes & Yellow School Cap
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.05, 0);

  const headGeom = new THREE.BoxGeometry(0.32, 0.30, 0.28);
  const head = new THREE.Mesh(headGeom, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Ears & Cute Button Nose
  [-0.165, 0.165].forEach((earX) => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.05), skinMat);
    ear.position.set(earX, 0.0, 0.0);
    headGroup.add(ear);
  });
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.025), skinMat);
  nose.position.set(0, -0.01, 0.145);
  headGroup.add(nose);

  // Eyes with White Specular Catchlights & Rosy Cheeks
  [-0.08, 0.08].forEach((ex) => {
    const eyeGeom = new THREE.BoxGeometry(0.042, 0.062, 0.01);
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set(ex, 0.02, 0.142);
    const catchlight = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.012), eyeHighlightMat);
    catchlight.position.set(ex + 0.008, 0.034, 0.144);
    headGroup.add(eye, catchlight);

    const blushGeom = new THREE.PlaneGeometry(0.06, 0.03);
    const blush = new THREE.Mesh(blushGeom, blushMat);
    blush.position.set(ex * 1.3, -0.05, 0.142);
    headGroup.add(blush);
  });

  // Hair (top, sides, back & front bangs)
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.30), hairMat);
  hairTop.position.set(0, 0.13, -0.01);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.20, 0.06), hairMat);
  hairBack.position.set(0, 0.02, -0.13);
  const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.03), hairMat);
  bangs.position.set(0, 0.10, 0.135);
  headGroup.add(hairTop, hairBack, bangs);

  // Yellow Elementary Cap (*Tsūgaku-bō*) with White Ribbon & Emblem
  const capDomeGeom = new THREE.CylinderGeometry(0.18, 0.20, 0.12, 16);
  const capDome = new THREE.Mesh(capDomeGeom, capMat);
  capDome.position.set(0, 0.19, 0);
  const capRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.196, 0.202, 0.025, 16), collarWhiteMat);
  capRibbon.position.set(0, 0.145, 0);
  const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), brassMat);
  capButton.position.set(0, 0.255, 0);
  headGroup.add(capDome, capRibbon, capButton);

  const visorGeom = new THREE.BoxGeometry(0.24, 0.02, 0.12);
  const visor = new THREE.Mesh(visorGeom, capMat);
  visor.position.set(0, 0.14, 0.16);
  visor.rotation.x = 0.15;
  headGroup.add(visor);

  body.add(headGroup);

  // 4. Arms (Pivoting at shoulders: y = 0.88)
  function createArm(isLeft: boolean) {
    const armPivot = new THREE.Group();
    const sign = isLeft ? -1 : 1;
    armPivot.position.set(sign * 0.23, 0.88, 0);

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.12), shirtMat);
    sleeve.position.set(0, -0.06, 0);
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.02, 0.124), collarWhiteMat);
    cuff.position.set(0, -0.115, 0);
    armPivot.add(sleeve, cuff);

    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), skinMat);
    armMesh.position.set(0, -0.20, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), skinMat);
    hand.position.set(0, -0.33, 0);
    armPivot.add(armMesh, hand);

    return armPivot;
  }

  const leftArm = createArm(true);
  const rightArm = createArm(false);
  body.add(leftArm);
  body.add(rightArm);

  // 5. Legs (Pivoting at hips: y = 0.44)
  function createLeg(isLeft: boolean) {
    const legPivot = new THREE.Group();
    const sign = isLeft ? -1 : 1;
    legPivot.position.set(sign * 0.10, 0.44, 0);

    const legTop = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.14), shortsMat);
    legTop.position.set(0, -0.05, 0);
    legPivot.add(legTop);

    const skinLeg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.10), skinMat);
    skinLeg.position.set(0, -0.15, 0);
    legPivot.add(skinLeg);

    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.10, 0.105), sockMat);
    sock.position.set(0, -0.24, 0);
    const sockStripe = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.018, 0.108), shirtMat);
    sockStripe.position.set(0, -0.205, 0);
    legPivot.add(sock, sockStripe);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.18), shoeMat);
    shoe.position.set(0, -0.32, 0.03);
    const laceStrap = new THREE.Mesh(new THREE.BoxGeometry(0.114, 0.022, 0.05), sockMat);
    laceStrap.position.set(0, -0.285, 0.04);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.025, 0.185), sockMat);
    sole.position.set(0, -0.365, 0.03);
    legPivot.add(shoe, laceStrap, sole);

    return legPivot;
  }

  const leftLeg = createLeg(true);
  const rightLeg = createLeg(false);
  group.add(leftLeg);
  group.add(rightLeg);

  // 6. Ground Contact Shadow Disc
  const shadowGeom = new THREE.CircleGeometry(0.35, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  let walkPhase = 0;

  function updateAnimation(isMoving: boolean, delta: number, speedRatio: number = 1.0) {
    if (isMoving) {
      walkPhase += delta * 11.0 * speedRatio;

      const legAngle = Math.sin(walkPhase) * 0.65;
      leftLeg.rotation.x = legAngle;
      rightLeg.rotation.x = -legAngle;

      const armAngle = Math.sin(walkPhase) * 0.55;
      leftArm.rotation.x = -armAngle;
      rightArm.rotation.x = armAngle;

      body.position.y = Math.abs(Math.sin(walkPhase * 2)) * 0.04;
      body.rotation.z = Math.sin(walkPhase) * 0.03;
    } else {
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.2);
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.2);
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.2);
      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.2);
      body.position.y = THREE.MathUtils.lerp(body.position.y, 0, 0.2);
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, 0.2);
    }
  }

  function resetAnimation() {
    walkPhase = 0;
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
    leftArm.rotation.x = 0;
    rightArm.rotation.x = 0;
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
  }

  return {
    group,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    body,
    updateAnimation,
    resetAnimation,
  };
}
