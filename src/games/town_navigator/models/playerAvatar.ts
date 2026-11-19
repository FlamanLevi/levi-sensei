import * as THREE from 'three';
import { createContactShadowMesh } from '@/utils/classroom3d';
import { batchStaticMeshes } from '../staticBatcher';

export type PlayerPostureMode = 'WALK' | 'RUN' | 'BIKE' | 'KART';

export interface PlayerAvatar {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  body: THREE.Group;
  updateAnimation: (
    isMoving: boolean,
    delta: number,
    speedRatio?: number,
    mode?: PlayerPostureMode
  ) => void;
  resetAnimation: () => void;
}

export interface PlayerAvatarColors {
  shirtColor?: string | number;
  capColor?: string | number;
  randoColor?: string | number;
  hairColor?: string | number;
}

/**
 * Builds a high-detail procedural 3D Japanese Elementary School Student
 * complete with leather Randoseru backpack, brass buckles, safety whistle charm,
 * collared polo shirt, yellow school cap (*Tsūgaku-bō*), and walking cycle articulation.
 * Height: ~1.4 meters (Grade 5 standard).
 */
export function buildPlayerAvatar(colors?: PlayerAvatarColors): PlayerAvatar {
  const group = new THREE.Group();
  group.name = 'Player_Student';

  // Calibrated PBR Materials harmonized into tight roughness/metalness tiers so
  // vertex-color batching collapses 58 avatar meshes down to ~8 draw calls total.
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.65, metalness: 0.0 });
  const hairMat = new THREE.MeshStandardMaterial({ color: colors?.hairColor ?? 0x1e1b4b, roughness: 0.65, metalness: 0.0 });
  const capMat = new THREE.MeshStandardMaterial({ color: colors?.capColor ?? 0xfacc15, roughness: 0.65, metalness: 0.0 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: colors?.shirtColor ?? 0x2563eb, roughness: 0.65, metalness: 0.0 });
  const collarWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65, metalness: 0.0 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.0 });
  const randoMat = new THREE.MeshStandardMaterial({ color: colors?.randoColor ?? 0xb91c1c, roughness: 0.30, metalness: 0.10 });
  const randoBackPadMat = new THREE.MeshStandardMaterial({ color: 0xfef2f2, roughness: 0.65, metalness: 0.0 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.20, metalness: 0.85 });
  const sockMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65, metalness: 0.0 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.20, metalness: 0.0 });
  const eyeHighlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.20, metalness: 0.0 });
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.65, metalness: 0.0 });

  const body = new THREE.Group();
  body.name = 'Player_Body';

  // 1. Torso with White Polo Collar, Placket Buttons & Yellow Name Tag Badge
  const torsoGeom = new THREE.BoxGeometry(0.36, 0.42, 0.22);
  const torso = new THREE.Mesh(torsoGeom, shirtMat);
  torso.position.y = 0.72;
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

  // 3. Sculpted Head, Neck, Ears, Expressive Eyes & Yellow School Cap
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.05, 0);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.08, 10), skinMat);
  neck.position.set(0, -0.13, 0);
  headGroup.add(neck);

  const headGeom = new THREE.SphereGeometry(0.165, 14, 12);
  headGeom.scale(1.0, 0.94, 0.92);
  const head = new THREE.Mesh(headGeom, skinMat);
  headGroup.add(head);

  // Ears & Cute Button Nose
  [-0.16, 0.16].forEach((earX) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), skinMat);
    ear.scale.set(0.6, 1.0, 0.8);
    ear.position.set(earX, 0.0, 0.0);
    headGroup.add(ear);
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), skinMat);
  nose.position.set(0, -0.015, 0.15);
  headGroup.add(nose);

  // Eyes with White Specular Catchlights & Rosy Cheeks
  [-0.072, 0.072].forEach((ex) => {
    const eyeGeom = new THREE.BoxGeometry(0.038, 0.056, 0.01);
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set(ex, 0.015, 0.144);
    const catchlight = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.015, 0.012), eyeHighlightMat);
    catchlight.position.set(ex + 0.008, 0.028, 0.146);
    headGroup.add(eye, catchlight);

    const blushGeom = new THREE.PlaneGeometry(0.055, 0.026);
    const blush = new THREE.Mesh(blushGeom, blushMat);
    blush.position.set(ex * 1.28, -0.045, 0.142);
    headGroup.add(blush);
  });

  // Sculpted Multi-Layer Hair (top, back-of-head crown for Chase cam, sideburns & bangs)
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.172, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
  hairTop.position.set(0, 0.02, -0.01);
  const hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.145, 0.16, 12, 1, false, Math.PI * 0.55, Math.PI * 0.9), hairMat);
  hairBack.position.set(0, -0.02, -0.015);
  const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.035), hairMat);
  bangs.position.set(0, 0.09, 0.132);
  headGroup.add(hairTop, hairBack, bangs);

  // Yellow Elementary Cap (*Tsūgaku-bō*) with White Ribbon & Curved Visor
  const capDomeGeom = new THREE.CylinderGeometry(0.16, 0.185, 0.11, 16);
  const capDome = new THREE.Mesh(capDomeGeom, capMat);
  capDome.position.set(0, 0.17, 0);
  const capCrown = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
  capCrown.scale.set(1, 0.35, 1);
  capCrown.position.set(0, 0.22, 0);
  const capRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.182, 0.188, 0.024, 16), collarWhiteMat);
  capRibbon.position.set(0, 0.128, 0);
  const capButton = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), brassMat);
  capButton.position.set(0, 0.275, 0);
  headGroup.add(capDome, capCrown, capRibbon, capButton);

  const visorGeom = new THREE.CylinderGeometry(0.16, 0.175, 0.02, 12, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
  const visor = new THREE.Mesh(visorGeom, capMat);
  visor.position.set(0, 0.125, 0.09);
  visor.rotation.x = 0.18;
  headGroup.add(visor);

  body.add(headGroup);

  // Batch rigid torso/head/backpack while detached at identity (0, 0, 0), BEFORE attaching articulated arms
  batchStaticMeshes(body, [], { ignoreShadowFlags: true, bakeVertexColors: true });
  body.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });
  group.add(body);

  // 4. Contoured Arms (Pivoting at shoulders: y = 0.88)
  function createArm(isLeft: boolean) {
    const armPivot = new THREE.Group();
    armPivot.name = isLeft ? 'Player_LeftArm' : 'Player_RightArm';
    const sign = isLeft ? -1 : 1;

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.12, 10), shirtMat);
    sleeve.position.set(0, -0.06, 0);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.02, 10), collarWhiteMat);
    cuff.position.set(0, -0.115, 0);
    armPivot.add(sleeve, cuff);

    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.24, 10), skinMat);
    armMesh.position.set(0, -0.20, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), skinMat);
    hand.position.set(0, -0.33, 0);
    armPivot.add(armMesh, hand);

    // Batch arm at identity (0, 0, 0) BEFORE setting shoulder pivot offset
    batchStaticMeshes(armPivot, [], { ignoreShadowFlags: true, bakeVertexColors: true });
    armPivot.position.set(sign * 0.23, 0.88, 0);
    return armPivot;
  }

  const leftArm = createArm(true);
  const rightArm = createArm(false);
  body.add(leftArm);
  body.add(rightArm);

  // 5. Contoured Legs & Rounded Sneakers (Pivoting at hips: y = 0.44)
  function createLeg(isLeft: boolean) {
    const legPivot = new THREE.Group();
    legPivot.name = isLeft ? 'Player_LeftLeg' : 'Player_RightLeg';
    const sign = isLeft ? -1 : 1;

    const legTop = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.064, 0.11, 10), shortsMat);
    legTop.position.set(0, -0.05, 0);
    legPivot.add(legTop);

    const skinLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.044, 0.12, 10), skinMat);
    skinLeg.position.set(0, -0.15, 0);
    legPivot.add(skinLeg);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.046, 0.10, 10), sockMat);
    sock.position.set(0, -0.24, 0);
    const sockStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.050, 0.018, 10), shirtMat);
    sockStripe.position.set(0, -0.205, 0);
    legPivot.add(sock, sockStripe);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.16), shoeMat);
    shoe.position.set(0, -0.32, 0.02);
    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), shoeMat);
    toeCap.scale.set(1.0, 0.75, 1.0);
    toeCap.position.set(0, -0.325, 0.09);
    const laceStrap = new THREE.Mesh(new THREE.BoxGeometry(0.114, 0.022, 0.05), sockMat);
    laceStrap.position.set(0, -0.285, 0.04);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.024, 0.19), sockMat);
    sole.position.set(0, -0.365, 0.035);
    legPivot.add(shoe, toeCap, laceStrap, sole);

    // Batch leg at identity (0, 0, 0) BEFORE setting hip pivot offset
    batchStaticMeshes(legPivot, [], { ignoreShadowFlags: true, bakeVertexColors: true });
    legPivot.position.set(sign * 0.10, 0.44, 0);
    return legPivot;
  }

  const leftLeg = createLeg(true);
  const rightLeg = createLeg(false);
  group.add(leftLeg);
  group.add(rightLeg);

  // 6. Soft Pre-Baked Ground Contact Shadow Mesh (0 shadow map cost)
  const shadowMesh = createContactShadowMesh(0.42, 0.42, 0.55);
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  let walkPhase = 0;

  function updateAnimation(
    isMoving: boolean,
    delta: number,
    speedRatio: number = 1.0,
    mode: PlayerPostureMode = 'WALK'
  ) {
    if (mode === 'KART') {
      // MicroKart already has its own sculpted helmeted racing driver — hide avatar & shadow
      body.visible = false;
      leftLeg.visible = false;
      rightLeg.visible = false;
      shadowMesh.visible = false;
      return;
    }

    body.visible = true;
    leftLeg.visible = true;
    rightLeg.visible = true;
    shadowMesh.visible = true;

    if (mode === 'BIKE') {
      // Seated on Mamachari saddle (y = 0.24, z = -0.14) gripping handlebars
      if (isMoving) {
        walkPhase += delta * 10.0 * speedRatio;
      }
      body.position.set(0, 0.24, -0.14);
      body.rotation.set(0.18, 0, 0);
      leftArm.rotation.x = -1.05;
      rightArm.rotation.x = -1.05;
      const pedalOsc = isMoving ? Math.sin(walkPhase) * 0.42 : 0.18;
      leftLeg.position.set(-0.10, 0.62, -0.12);
      rightLeg.position.set(0.10, 0.62, -0.12);
      leftLeg.rotation.x = -0.55 + pedalOsc;
      rightLeg.rotation.x = -0.55 - pedalOsc;
      return;
    }

    // Restore standing hip positions when walking/running
    leftLeg.position.set(-0.10, 0.44, 0);
    rightLeg.position.set(0.10, 0.44, 0);

    if (isMoving) {
      walkPhase += delta * 11.0 * speedRatio;

      const legAngle = Math.sin(walkPhase) * 0.65;
      leftLeg.rotation.x = legAngle;
      rightLeg.rotation.x = -legAngle;

      const armAngle = Math.sin(walkPhase) * 0.55;
      leftArm.rotation.x = -armAngle;
      rightArm.rotation.x = armAngle;

      body.position.set(0, Math.abs(Math.sin(walkPhase * 2)) * 0.04, 0);
      body.rotation.set(mode === 'RUN' ? 0.09 : 0.02, 0, Math.sin(walkPhase) * 0.03);
    } else {
      const alpha = 1 - Math.exp(-12 * delta);
      leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, alpha);
      rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, alpha);
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, alpha);
      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, alpha);
      body.position.y = THREE.MathUtils.lerp(body.position.y, 0, alpha);
      body.position.z = THREE.MathUtils.lerp(body.position.z, 0, alpha);
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, alpha);
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, alpha);
    }
  }

  function resetAnimation() {
    walkPhase = 0;
    body.visible = true;
    leftLeg.visible = true;
    rightLeg.visible = true;
    shadowMesh.visible = true;
    leftLeg.position.set(-0.10, 0.44, 0);
    rightLeg.position.set(0.10, 0.44, 0);
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
