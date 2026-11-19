import * as THREE from 'three';
import {
  getLawnGrassTexture,
  getArchitecturalBumpMap,
  getTimberPlankTexture,
  getSidewalkPaverTexture,
  getClearShowcaseGlassMaterial,
} from './wallTextures';

export interface ZooOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

let cachedZooBannerTex: THREE.CanvasTexture | null = null;
let cachedZooMapTex: THREE.CanvasTexture | null = null;

function createZooEntranceBannerTexture(): THREE.CanvasTexture {
  if (cachedZooBannerTex) return cachedZooBannerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 52px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAFARI ZOO', 256, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.fillText('どうぶつえん (動物園)', 256, 104);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.userData.isSharedResource = true;
  cachedZooBannerTex = texture;
  return texture;
}

function createZooTrailMapTexture(): THREE.CanvasTexture {
  if (cachedZooMapTex) return cachedZooMapTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 184);

    // Stylized zone blocks
    ctx.fillStyle = '#d97706';
    ctx.fillRect(20, 28, 95, 68);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(140, 28, 95, 56);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(140, 96, 95, 52);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(98, 72, 58, 42);

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 16px "UD Digi Kyokasho NP-R", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZOO MAP', 128, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('SAVANNAH', 67, 66);
    ctx.fillText('ELEPHANT', 187, 60);
    ctx.fillText('PENGUIN', 187, 126);
    ctx.fillText('PANDA', 127, 97);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.isSharedResource = true;
  cachedZooMapTex = texture;
  return texture;
}

function buildGiraffe(giraffeScale: number = 1.0): THREE.Group {
  const giraffe = new THREE.Group();
  giraffe.name = 'Giraffe';

  const yellowCoatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
  const brownSpotMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  // Jointed legs with fetlocks & hooves
  const legPositions: [number, number][] = [
    [-0.25, -0.45],
    [+0.25, -0.45],
    [-0.22, +0.45],
    [+0.22, +0.45],
  ];
  legPositions.forEach(([lx, lz]) => {
    const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.95, 8), yellowCoatMat);
    upperLeg.position.set(lx, 1.38, lz);
    upperLeg.castShadow = true;
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.068, 6, 6), yellowCoatMat);
    knee.position.set(lx, 0.92, lz);
    const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.85, 8), yellowCoatMat);
    lowerLeg.position.set(lx, 0.48, lz);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.12, 8), hoofMat);
    hoof.position.set(lx, 0.06, lz);
    giraffe.add(upperLeg, knee, lowerLeg, hoof);
  });

  // Tapered contoured torso + sloped shoulder hump
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), yellowCoatMat);
  torso.scale.set(0.82, 0.95, 1.55);
  torso.position.set(0, 2.18, 0);
  torso.rotation.x = -0.16;
  torso.castShadow = true;
  const shoulderHump = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), yellowCoatMat);
  shoulderHump.scale.set(0.85, 1.15, 0.95);
  shoulderHump.position.set(0, 2.38, 0.45);
  giraffe.add(torso, shoulderHump);

  // Varied coat patches
  [
    [0.34, 2.26, 0.18, 0.14],
    [-0.34, 2.12, -0.22, 0.16],
    [0.31, 2.02, -0.34, 0.13],
    [-0.33, 2.32, 0.28, 0.14],
    [0.14, 3.05, 0.62, 0.09],
    [-0.14, 3.35, 0.68, 0.08],
  ].forEach(([sx, sy, sz, sr]) => {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(sr, 6, 6), brownSpotMat);
    spot.scale.set(0.35, 1.0, 1.0);
    spot.position.set(sx, sy, sz);
    giraffe.add(spot);
  });

  // Tufted tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.85, 6), yellowCoatMat);
  tail.position.set(0, 1.72, -0.72);
  tail.rotation.x = 0.18;
  const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), brownSpotMat);
  tuft.position.set(0, 1.28, -0.80);
  tuft.rotation.x = Math.PI + 0.18;
  giraffe.add(tail, tuft);

  // Neck + mane
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.22, 1.85, 8), yellowCoatMat);
  neck.position.set(0, 3.18, 0.64);
  neck.rotation.x = 0.22;
  neck.castShadow = true;
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.65, 0.09), brownSpotMat);
  mane.position.set(0, 3.18, 0.50);
  mane.rotation.x = 0.22;
  giraffe.add(neck, mane);

  // Head + tapered snout + eyes + ears + ossicones
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), yellowCoatMat);
  head.scale.set(0.85, 0.9, 1.35);
  head.position.set(0, 4.05, 0.92);
  head.castShadow = true;
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.28, 8), brownSpotMat);
  snout.rotation.x = Math.PI / 2 + 0.15;
  snout.position.set(0, 3.98, 1.16);
  giraffe.add(head, snout);

  [-0.12, 0.12].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeMat);
    eye.position.set(ex, 4.09, 0.98);
    giraffe.add(eye);
  });

  [-0.075, 0.075].forEach((hx) => {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.20, 6), brownSpotMat);
    horn.position.set(hx, 4.24, 0.88);
    const hornKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), brownSpotMat);
    hornKnob.position.set(hx, 4.35, 0.88);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), yellowCoatMat);
    ear.rotation.z = hx < 0 ? 1.2 : -1.2;
    ear.position.set(hx * 2.4, 4.12, 0.86);
    giraffe.add(horn, hornKnob, ear);
  });

  if (giraffeScale !== 1.0) {
    giraffe.scale.setScalar(giraffeScale);
  }
  return giraffe;
}

function buildLion(): THREE.Group {
  const lion = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
  const maneMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const muzzleMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.65 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  // Contoured body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), coatMat);
  body.scale.set(0.85, 0.82, 1.55);
  body.position.set(0, 0.44, 0);
  body.castShadow = true;
  lion.add(body);

  // Layered multi-part mane
  const maneMain = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), maneMat);
  maneMain.scale.set(1.05, 1.08, 0.85);
  maneMain.position.set(0, 0.58, 0.40);
  const maneRuff = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.10, 6, 12), maneMat);
  maneRuff.position.set(0, 0.58, 0.50);
  lion.add(maneMain, maneRuff);

  // Sculpted head, muzzle, ears, eyes
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), coatMat);
  head.position.set(0, 0.58, 0.56);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), muzzleMat);
  muzzle.position.set(0, 0.53, 0.70);
  lion.add(head, muzzle);

  [-0.08, 0.08].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
    eye.position.set(ex, 0.63, 0.70);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), coatMat);
    ear.position.set(ex * 1.9, 0.75, 0.54);
    lion.add(eye, ear);
  });

  // Legs + paws
  [
    [-0.18, 0.32],
    [0.18, 0.32],
    [-0.18, -0.32],
    [0.18, -0.32],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.42, 8), coatMat);
    leg.position.set(lx, 0.21, lz);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), coatMat);
    paw.scale.set(1.0, 0.5, 1.3);
    paw.position.set(lx, 0.03, lz + 0.03);
    lion.add(leg, paw);
  });

  // Curved tufted tail
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.46, -0.46),
    new THREE.Vector3(0.08, 0.32, -0.68),
    new THREE.Vector3(0.14, 0.45, -0.78),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 6, 0.025, 6, false), coatMat);
  const tailTuft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), maneMat);
  tailTuft.position.set(0.14, 0.45, -0.78);
  lion.add(tail, tailTuft);

  return lion;
}

function buildFlamingo(): THREE.Group {
  const flamingo = new THREE.Group();
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.55 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.6 });
  const beakTipMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });

  // Standing leg + tucked second leg
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), legMat);
  leg.position.set(-0.02, 0.275, 0);
  const tuckedUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 6), legMat);
  tuckedUpper.position.set(0.04, 0.44, -0.04);
  tuckedUpper.rotation.x = 0.6;
  const tuckedLower = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), legMat);
  tuckedLower.position.set(0.04, 0.42, 0.05);
  tuckedLower.rotation.x = -0.8;

  // Body + folded wings
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), pinkMat);
  body.scale.set(0.85, 0.92, 1.38);
  body.position.set(0, 0.56, 0);
  const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), wingMat);
  wingL.scale.set(0.35, 0.75, 1.25);
  wingL.position.set(-0.10, 0.57, -0.02);
  const wingR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), wingMat);
  wingR.scale.set(0.35, 0.75, 1.25);
  wingR.position.set(0.10, 0.57, -0.02);

  // S-curved TubeGeometry neck
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.60, 0.14),
    new THREE.Vector3(0, 0.74, 0.22),
    new THREE.Vector3(0, 0.88, 0.10),
    new THREE.Vector3(0, 0.98, 0.18),
  ]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 10, 0.026, 6, false), pinkMat);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), pinkMat);
  head.position.set(0, 0.98, 0.19);
  const beakBase = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.07, 6), legMat);
  beakBase.rotation.x = Math.PI / 2 + 0.4;
  beakBase.position.set(0, 0.96, 0.25);
  const beakTip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), beakTipMat);
  beakTip.rotation.x = Math.PI - 0.3;
  beakTip.position.set(0, 0.92, 0.27);

  flamingo.add(leg, tuckedUpper, tuckedLower, body, wingL, wingR, neck, head, beakBase, beakTip);
  return flamingo;
}

function buildElephant(): THREE.Group {
  const elephant = new THREE.Group();
  elephant.name = 'Elephant';

  const greyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const earInnerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75 });
  const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
  const nailMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  const legPositions: [number, number][] = [
    [-0.52, -0.62],
    [+0.52, -0.62],
    [-0.48, +0.62],
    [+0.48, +0.62],
  ];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 1.3, 10), greyMat);
    leg.position.set(lx, 0.65, lz);
    leg.castShadow = true;
    elephant.add(leg);

    [-0.08, 0, 0.08].forEach((nx) => {
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), nailMat);
      nail.position.set(lx + nx, 0.05, lz + 0.24);
      elephant.add(nail);
    });
  });

  // Barrel-curved torso
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), greyMat);
  body.scale.set(0.85, 0.88, 1.18);
  body.position.set(0, 1.82, 0);
  body.castShadow = true;
  elephant.add(body);

  // Domed head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.56, 12, 10), greyMat);
  head.scale.set(0.95, 1.02, 1.0);
  head.position.set(0, 2.15, 1.08);
  head.castShadow = true;
  elephant.add(head);

  [-0.30, 0.30].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
    eye.position.set(ex, 2.25, 1.48);
    elephant.add(eye);
  });

  // Contoured rounded ears
  [-0.64, 0.64].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.36, 0.08, 12), greyMat);
    ear.rotation.z = Math.PI / 2;
    ear.rotation.y = ex < 0 ? -0.35 : 0.35;
    ear.scale.set(1.0, 1.0, 1.25);
    ear.position.set(ex, 2.18, 0.92);
    ear.castShadow = true;
    const earInner = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.09, 10), earInnerMat);
    earInner.rotation.z = Math.PI / 2;
    earInner.rotation.y = ex < 0 ? -0.35 : 0.35;
    earInner.position.set(ex * 0.98, 2.18, 0.94);
    elephant.add(ear, earInner);
  });

  // Curved segmented TubeGeometry trunk
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.98, 1.52),
    new THREE.Vector3(0, 1.55, 1.78),
    new THREE.Vector3(0, 1.08, 1.72),
    new THREE.Vector3(0, 0.95, 1.92),
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 12, 0.13, 8, false), greyMat);
  elephant.add(trunk);

  // Curved ivory tusks
  [-0.25, 0.25].forEach((tx) => {
    const tuskCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tx, 1.82, 1.44),
      new THREE.Vector3(tx * 1.12, 1.68, 1.78),
      new THREE.Vector3(tx * 1.05, 1.80, 2.02),
    ]);
    const tusk = new THREE.Mesh(new THREE.TubeGeometry(tuskCurve, 8, 0.045, 6, false), tuskMat);
    elephant.add(tusk);
  });

  // Tufted tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.72, 6), greyMat);
  tail.position.set(0, 1.52, -1.12);
  tail.rotation.x = 0.2;
  const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), eyeMat);
  tailTuft.position.set(0, 1.15, -1.20);
  tailTuft.rotation.x = Math.PI + 0.2;
  elephant.add(tail, tailTuft);

  return elephant;
}

function buildGiantPanda(pandaScale: number = 1.0): THREE.Group {
  const panda = new THREE.Group();
  panda.name = 'GiantPanda';

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });

  // Torso
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), whiteMat);
  body.scale.set(1.0, 1.05, 0.95);
  body.position.set(0, 0.44, 0);
  body.castShadow = true;
  panda.add(body);

  // Rounded black shoulder saddle
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), blackMat);
  shoulder.scale.set(1.12, 0.46, 0.95);
  shoulder.position.set(0, 0.58, 0.02);
  panda.add(shoulder);

  // Sitting hind legs
  [-0.26, 0.26].forEach((lx) => {
    const legGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.40, 8);
    legGeo.rotateX(Math.PI / 2.6);
    const leg = new THREE.Mesh(legGeo, blackMat);
    leg.position.set(lx, 0.18, 0.24);
    panda.add(leg);
  });

  // Articulated arms reaching forward to grip bamboo stalk
  [-0.32, 0.32].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 8), blackMat);
    arm.position.set(ax * 0.85, 0.48, 0.24);
    arm.rotation.x = Math.PI / 3;
    arm.rotation.z = ax < 0 ? -0.35 : 0.35;
    panda.add(arm);
  });

  // Head + muzzle + nose + oval eye patches + pupils + ears
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), whiteMat);
  head.position.set(0, 0.86, 0.08);
  head.castShadow = true;
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), whiteMat);
  muzzle.scale.set(1.15, 0.8, 0.95);
  muzzle.position.set(0, 0.81, 0.30);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), blackMat);
  nose.position.set(0, 0.83, 0.40);
  panda.add(head, muzzle, nose);

  [-0.18, 0.18].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), blackMat);
    ear.position.set(ex, 1.09, 0.04);
    panda.add(ear);
  });

  [-0.095, 0.095].forEach((px) => {
    const eyePatch = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 6), blackMat);
    eyePatch.scale.set(0.85, 1.15, 0.35);
    eyePatch.position.set(px, 0.89, 0.31);
    eyePatch.rotation.z = px < 0 ? -0.25 : 0.25;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), whiteMat);
    pupil.position.set(px, 0.90, 0.335);
    panda.add(eyePatch, pupil);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), blackMat);
  tail.position.set(0, 0.25, -0.36);
  panda.add(tail);

  // Leafy bamboo stalk gripped between paws
  const stalkGeo = new THREE.CylinderGeometry(0.028, 0.032, 0.86, 6);
  stalkGeo.rotateZ(Math.PI / 5);
  const stalk = new THREE.Mesh(stalkGeo, bambooMat);
  stalk.position.set(0.05, 0.56, 0.36);
  const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), leafMat);
  leaf1.position.set(-0.18, 0.88, 0.36);
  leaf1.rotation.z = 0.8;
  const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 4), leafMat);
  leaf2.position.set(-0.08, 0.94, 0.38);
  leaf2.rotation.z = 0.3;
  panda.add(stalk, leaf1, leaf2);

  if (pandaScale !== 1.0) {
    panda.scale.setScalar(pandaScale);
  }
  return panda;
}

function buildPenguin(): THREE.Group {
  const penguin = new THREE.Group();
  penguin.name = 'Penguin';

  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

  // Smooth ovoid tapered body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), blackMat);
  body.scale.set(0.95, 1.55, 0.92);
  body.position.set(0, 0.32, 0);
  penguin.add(body);

  // Teardrop white chest
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.155, 10, 8), whiteMat);
  belly.scale.set(0.82, 1.38, 0.72);
  belly.position.set(0, 0.30, 0.065);
  penguin.add(belly);

  // Contoured flippers
  [-0.17, 0.17].forEach((fx) => {
    const flipper = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 4), blackMat);
    flipper.scale.set(0.35, 1.0, 0.85);
    flipper.position.set(fx, 0.32, 0.01);
    flipper.rotation.z = fx < 0 ? Math.PI - 0.22 : Math.PI + 0.22;
    penguin.add(flipper);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8), blackMat);
  head.position.set(0, 0.61, 0.01);
  penguin.add(head);

  [-0.065, 0.065].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
    eye.position.set(ex, 0.64, 0.11);
    penguin.add(eye);
  });

  const beakGeo = new THREE.ConeGeometry(0.038, 0.13, 6);
  beakGeo.rotateX(Math.PI / 2 + 0.15);
  const beak = new THREE.Mesh(beakGeo, orangeMat);
  beak.position.set(0, 0.59, 0.16);
  penguin.add(beak);

  [-0.065, 0.065].forEach((fx) => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.14), orangeMat);
    foot.position.set(fx, 0.02, 0.04);
    penguin.add(foot);
  });

  return penguin;
}

/**
 * Tier 3: Zoo (動物園) - `hwg5_u19_17`
 * Footprint: strictly within 18.0m x 18.0m (3U x 3U)
 */
export function buildZooMesh(options: ZooOptions = {}): THREE.Group {
  const {
    includeRoad = true,
    includeLandscaping = true,
    scale = 1.0,
  } = options;

  const zoo = new THREE.Group();
  zoo.name = 'Tier3_Zoo_hwg5_u19_17';

  const bumpTex = getArchitecturalBumpMap();
  const clearGlassMat = getClearShowcaseGlassMaterial();

  // --- Materials ---
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, bumpMap: bumpTex, bumpScale: 0.015, roughness: 0.7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getSidewalkPaverTexture(),
    roughness: 0.75,
  });
  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1,
    bumpMap: bumpTex,
    bumpScale: 0.012,
    roughness: 0.8,
  });
  const savannahSandMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
  const savannahGrassMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16,
    map: getLawnGrassTexture(),
    roughness: 0.85,
  });
  const elephantClayMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.85 });
  const mudWaterMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.35,
    metalness: 0.08,
  });
  const waterPoolMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const iceRockMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
  const woodFenceMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    map: getTimberPlankTexture(),
    roughness: 0.75,
  });
  const darkRecessMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
  const safariRoofMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.9 });
  const terracottaRoofMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.6 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
  const hayMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.6 });
  const torchGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf97316,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  const rippleMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.3 });

  // 1. BASE FOOTPRINT & INFRASTRUCTURE (18m x 18m Lot)
  const foundationGeo = new THREE.BoxGeometry(18.0, 0.18, 16.5);
  const foundation = new THREE.Mesh(foundationGeo, plazaMat);
  foundation.position.set(0, 0.09, -0.75);
  foundation.receiveShadow = true;
  zoo.add(foundation);

  // Unobstructed Sidewalk: Z in [+7.5, +9.0]
  const sidewalkGeo = new THREE.BoxGeometry(18.0, 0.18, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalk.position.set(0, 0.09, 8.25);
  sidewalk.receiveShadow = true;
  zoo.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(18.0, 0.20, 0.15);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.10, 9.0);
  curb.receiveShadow = true;
  zoo.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(18.0, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 9.9);
    road.receiveShadow = true;
    zoo.add(road);

    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    for (let i = -8.0; i <= 8.0; i += 2.4) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.025, 0.12);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(i, 0.02, 9.4);
      zoo.add(stripe);
    }
  }

  // 2. SAVANNAH ENCLOSURE (detail1: West Side X in [-8.2, -0.6], Z in [-7.7, +3.3])
  const savannahGroup = new THREE.Group();
  savannahGroup.position.set(-4.4, 0.18, -2.2);

  const sand = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.04, 11.0), savannahSandMat);
  sand.receiveShadow = true;
  savannahGroup.add(sand);

  // Lush savannah grass patches
  [
    [-1.8, -2.5, 2.2],
    [1.6, 0.4, 1.8],
    [-2.0, 2.8, 1.5],
  ].forEach(([gx, gz, gr]) => {
    const patch = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr + 0.2, 0.03, 12), savannahGrassMat);
    patch.position.set(gx, 0.03, gz);
    savannahGroup.add(patch);
  });

  // 4-sided perimeter wood-post fencing (low <= 1.2m on front rail for detail1 sightline!)
  const postGeo = new THREE.CylinderGeometry(0.075, 0.08, 1.15, 8);
  const railHGeo = new THREE.CylinderGeometry(0.045, 0.045, 7.4, 8);
  railHGeo.rotateZ(Math.PI / 2);
  const railVGeo = new THREE.CylinderGeometry(0.045, 0.045, 10.8, 8);
  railVGeo.rotateX(Math.PI / 2);

  // Front & North rails
  [5.4, -5.4].forEach((fz) => {
    const topR = new THREE.Mesh(railHGeo, woodFenceMat);
    topR.position.set(0, 0.85, fz);
    const midR = new THREE.Mesh(railHGeo, woodFenceMat);
    midR.position.set(0, 0.48, fz);
    savannahGroup.add(topR, midR);
    for (let px = -3.6; px <= 3.6; px += 1.8) {
      const post = new THREE.Mesh(postGeo, woodFenceMat);
      post.position.set(px, 0.575, fz);
      post.castShadow = true;
      savannahGroup.add(post);
    }
  });

  // West & East rails
  [-3.7, 3.7].forEach((fx) => {
    const topR = new THREE.Mesh(railVGeo, woodFenceMat);
    topR.position.set(fx, 0.85, 0);
    const midR = new THREE.Mesh(railVGeo, woodFenceMat);
    midR.position.set(fx, 0.48, 0);
    savannahGroup.add(topR, midR);
    for (let pz = -3.6; pz <= 3.6; pz += 1.8) {
      const post = new THREE.Mesh(postGeo, woodFenceMat);
      post.position.set(fx, 0.575, pz);
      savannahGroup.add(post);
    }
  });

  if (includeLandscaping) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(-1.8, 0, -2.5);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, 5.4, 8), woodFenceMat);
    trunk.position.set(0, 2.7, 0);
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Branching limbs under the flat Acacia crown
    [
      [-0.8, 5.2, 0.2, 0.65],
      [0.9, 5.4, -0.2, -0.6],
      [0.1, 5.3, 0.7, -0.5],
    ].forEach(([bx, by, bz, rz]) => {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.8, 6), woodFenceMat);
      branch.position.set(bx * 0.5, by - 0.35, bz * 0.5);
      branch.rotation.z = rz;
      treeGroup.add(branch);
    });

    [
      [0.6, 5.8, 0.2, 3.6, 0.45],
      [0.9, 6.6, 0.0, 4.6, 0.55],
      [1.1, 7.4, -0.2, 3.0, 0.45],
    ].forEach(([cx, cy, cz, cr, ch]) => {
      const canopy = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr + 0.4, ch, 12), foliageMat);
      canopy.position.set(cx, cy, cz);
      canopy.castShadow = true;
      treeGroup.add(canopy);
    });

    // Savannah boulders & grass tufts
    [-2.8, 0.8, 2.5].forEach((bx, idx) => {
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + (idx % 2) * 0.12, 0), curbMat);
      boulder.scale.set(1.2, 0.7, 1.0);
      boulder.position.set(bx, 0.18, -3.8 + idx * 1.4);
      savannahGroup.add(boulder);
    });

    savannahGroup.add(treeGroup);
  }

  const giraffe = buildGiraffe(1.0);
  giraffe.position.set(0.6, 0.02, 1.4);
  giraffe.rotation.y = -0.35;
  const calf = buildGiraffe(0.62);
  calf.position.set(1.9, 0.02, 2.0);
  calf.rotation.y = -0.55;
  savannahGroup.add(giraffe, calf);

  const prideRock = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 0.65, 8), curbMat);
  prideRock.position.set(-1.6, 0.32, 2.4);
  const lion = buildLion();
  lion.position.set(-1.6, 0.65, 2.4);
  lion.rotation.y = 0.35;
  savannahGroup.add(prideRock, lion);

  // Flamingo Lagoon in Front-East Corner of Savannah
  const lagoon = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.05, 16), waterPoolMat);
  lagoon.position.set(2.1, 0.04, 3.8);
  const f1 = buildFlamingo();
  f1.position.set(1.85, 0.05, 3.7);
  f1.rotation.y = 0.4;
  const f2 = buildFlamingo();
  f2.position.set(2.35, 0.05, 3.9);
  f2.rotation.y = -0.6;
  savannahGroup.add(lagoon, f1, f2);

  zoo.add(savannahGroup);

  // 3. ELEPHANT SANCTUARY & OPEN-DOOR SHELTER HOUSE (East-Rear: X in [+0.8, +8.2], Z in [-8.0, -0.5])
  const elephantGroup = new THREE.Group();
  elephantGroup.position.set(4.5, 0.18, -4.3);

  const clay = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.04, 7.5), elephantClayMat);
  clay.receiveShadow = true;
  elephantGroup.add(clay);

  // Open-doorway Elephant Shelter (rear wall + side walls + front piers + dark interior + timber trusses)
  const shelterRear = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 0.28), woodFenceMat);
  shelterRear.position.set(-1.2, 1.6, -3.26);
  const shelterLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.2, 2.4), woodFenceMat);
  shelterLeft.position.set(-2.86, 1.6, -2.2);
  const shelterRight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.2, 2.4), woodFenceMat);
  shelterRight.position.set(0.46, 1.6, -2.2);
  const shelterHeader = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.32), woodFenceMat);
  shelterHeader.position.set(-1.2, 2.85, -1.08);
  const shelterInterior = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.5, 1.8), darkRecessMat);
  shelterInterior.position.set(-1.2, 1.25, -2.25);
  const eleRoof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 1.25, 4), terracottaRoofMat);
  eleRoof.rotation.y = Math.PI / 4;
  eleRoof.position.set(-1.2, 3.82, -2.2);
  elephantGroup.add(shelterRear, shelterLeft, shelterRight, shelterHeader, shelterInterior, eleRoof);

  // Hay bale beside shelter
  const hayBale = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.72, 10), hayMat);
  hayBale.rotation.z = Math.PI / 2;
  hayBale.position.set(1.4, 0.42, -2.8);
  elephantGroup.add(hayBale);

  // Earthy brown mud pool (replacing bright cyan)
  const mudPool = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.06, 16), mudWaterMat);
  mudPool.position.set(1.5, 0.04, -1.0);
  elephantGroup.add(mudPool);

  const elephant = buildElephant();
  elephant.position.set(-0.6, 0.02, 0.8);
  elephant.rotation.y = 0.45;
  elephantGroup.add(elephant);

  for (let rx = -3.2; rx <= 3.2; rx += 1.4) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), curbMat);
    rock.position.set(rx, 0.25, 3.7);
    rock.scale.set(1.2, 0.8, 1.0);
    elephantGroup.add(rock);
  }

  zoo.add(elephantGroup);

  // 4. PENGUIN COVE, ICEBERG CLIFF & LOW GLASS BARRIER (detail2 at X = 4.5, Z = 3.0)
  const penguinGroup = new THREE.Group();
  penguinGroup.position.set(4.5, 0.18, 3.0);

  // Stepped stone pool coping around the pool
  const poolCoping = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.22, 5.1), curbMat);
  poolCoping.position.set(0, 0.11, 0);
  const pool = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.24, 4.6), waterPoolMat);
  pool.position.set(0, 0.12, 0);
  pool.receiveShadow = true;
  penguinGroup.add(poolCoping, pool);

  // Framed low glass viewing rail (<= 1.05m front for detail2 sightline)
  const frontGlassWall = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.78, 0.06), clearGlassMat);
  frontGlassWall.position.set(0, 0.56, 2.48);
  const glassTopRail = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.07, 0.12), ironMat);
  glassTopRail.position.set(0, 0.96, 2.48);
  penguinGroup.add(frontGlassWall, glassTopRail);
  [-3.5, -1.75, 0, 1.75, 3.5].forEach((gx) => {
    const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.96, 6), ironMat);
    stanchion.position.set(gx, 0.48, 2.48);
    penguinGroup.add(stanchion);
  });

  // Multi-faceted stacked icebergs & rocky North rear backdrop (Z < +2.2)
  const iceBase = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, 0.55, 10), iceRockMat);
  iceBase.position.set(0.2, 0.32, -0.3);
  iceBase.receiveShadow = true;
  const icePeak1 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.5, 6), iceRockMat);
  icePeak1.position.set(-0.4, 1.18, -1.0);
  icePeak1.castShadow = true;
  const icePeak2 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.15, 5), iceRockMat);
  icePeak2.position.set(0.95, 0.95, -1.2);
  const rearRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), curbMat);
  rearRock.scale.set(1.8, 0.9, 0.7);
  rearRock.position.set(-1.6, 0.55, -1.6);
  penguinGroup.add(iceBase, icePeak1, icePeak2, rearRock);

  // 4 standing penguins on iceberg
  [
    [-0.5, 0.58, -0.25, 0.6],
    [+0.5, 0.58, 0.15, -0.8],
    [0.0, 0.58, 0.55, 0.1],
    [+0.9, 0.58, -0.45, -0.3],
  ].forEach(([px, py, pz, ry]) => {
    const penguin = buildPenguin();
    penguin.position.set(px, py, pz);
    penguin.rotation.y = ry;
    penguinGroup.add(penguin);
  });

  // Penguin #5: horizontal swimming penguin with water-ripple ring!
  const swimPenguin = buildPenguin();
  swimPenguin.position.set(-1.9, 0.20, 0.95);
  swimPenguin.rotation.set(Math.PI / 2 - 0.15, 0.85, 0);
  const swimRipple = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 6, 16), rippleMat);
  swimRipple.rotation.x = Math.PI / 2;
  swimRipple.position.set(-1.9, 0.25, 0.95);
  penguinGroup.add(swimPenguin, swimRipple);

  zoo.add(penguinGroup);

  // 5. GIANT PANDA SANCTUARY & RAISED BAMBOO GARDEN (Center Courtyard: X = 0, Z = 0.5)
  const pandaGroup = new THREE.Group();
  pandaGroup.position.set(0, 0.18, 0.5);

  const gardenBed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.26, 2.2), woodFenceMat);
  gardenBed.position.set(0, 0.13, -0.2);
  gardenBed.receiveShadow = true;
  const gardenGrass = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.05, 1.95), savannahGrassMat);
  gardenGrass.position.set(0, 0.27, -0.2);
  pandaGroup.add(gardenBed, gardenGrass);

  // Climbing log
  const climbLog = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 8), woodFenceMat);
  climbLog.rotation.z = Math.PI / 2 - 0.22;
  climbLog.position.set(0.1, 0.42, -0.65);
  pandaGroup.add(climbLog);

  const giantPanda = buildGiantPanda(1.0);
  giantPanda.position.set(-0.42, 0.28, 0.12);
  const pandaCub = buildGiantPanda(0.62);
  pandaCub.position.set(0.55, 0.28, 0.25);
  pandaCub.rotation.y = -0.4;
  pandaGroup.add(giantPanda, pandaCub);

  // Leafy bamboo grove
  [-1.0, -0.6, 0.6, 1.0].forEach((bx, idx) => {
    const bH = 2.1 + (idx % 2) * 0.45;
    const bStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, bH, 6), foliageMat);
    bStalk.position.set(bx, bH / 2 + 0.2, -0.95 + (idx % 2) * 0.25);
    const bCrown = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 5), foliageMat);
    bCrown.position.set(bx, bH + 0.15, -0.95 + (idx % 2) * 0.25);
    pandaGroup.add(bStalk, bCrown);
  });

  zoo.add(pandaGroup);

  // 6. GRAND SAFARI ENTRANCE GATE, TRAIL MAP KIOSK & TICKET BOOTH (Z in [+6.0, +7.35])
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0.18, 6.55);

  const logGeo = new THREE.CylinderGeometry(0.3, 0.35, 5.5, 10);
  const leftLog = new THREE.Mesh(logGeo, woodFenceMat);
  leftLog.position.set(-3.6, 2.75, 0);
  leftLog.castShadow = true;

  const rightLog = new THREE.Mesh(logGeo, woodFenceMat);
  rightLog.position.set(3.6, 2.75, 0);
  rightLog.castShadow = true;

  // Diagonal log cross-braces + wrought-iron torch sconces
  [-3.6, 3.6].forEach((tx) => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), ironMat);
    bracket.position.set(tx, 3.05, 0.24);
    const torchCup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.18, 8), ironMat);
    torchCup.position.set(tx, 3.12, 0.40);
    const torch = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), torchGlowMat);
    torch.position.set(tx, 3.30, 0.40);
    gateGroup.add(bracket, torchCup, torch);

    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.5, 6), woodFenceMat);
    brace.position.set(tx < 0 ? tx + 0.55 : tx - 0.55, 4.65, 0);
    brace.rotation.z = tx < 0 ? -0.78 : 0.78;
    gateGroup.add(brace);
  });

  const crossLogGeo = new THREE.CylinderGeometry(0.25, 0.25, 8.4, 10);
  crossLogGeo.rotateZ(Math.PI / 2);
  const crossLog = new THREE.Mesh(crossLogGeo, woodFenceMat);
  crossLog.position.set(0, 5.2, 0);
  crossLog.castShadow = true;

  // Pitched thatched gable roof
  const thatchL = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.24, 1.15), thatchMat);
  thatchL.position.set(0, 5.65, 0.45);
  thatchL.rotation.x = 0.38;
  const thatchR = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.24, 1.15), thatchMat);
  thatchR.position.set(0, 5.65, -0.45);
  thatchR.rotation.x = -0.38;
  const ridgeBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9.2, 8), woodFenceMat);
  ridgeBeam.rotation.z = Math.PI / 2;
  ridgeBeam.position.set(0, 5.92, 0);

  const bannerBoard = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.2, 0.15), safariRoofMat);
  bannerBoard.position.set(0, 4.3, 0);

  const bannerTex = createZooEntranceBannerTexture();
  const bannerSignMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    emissive: 0xffffff,
    emissiveMap: bannerTex,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  const bannerSign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.05), bannerSignMat);
  bannerSign.position.set(0, 4.3, 0.09);

  gateGroup.add(leftLog, rightLog, crossLog, thatchL, thatchR, ridgeBeam, bannerBoard, bannerSign);

  // Ticket booth with clearGlassMat window, pitched roof overhang & counter ledge
  const booth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, 1.4), woodFenceMat);
  booth.position.set(-5.3, 1.15, 0);
  booth.castShadow = true;
  const boothRoof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.65, 4), thatchMat);
  boothRoof.rotation.y = Math.PI / 4;
  boothRoof.position.set(-5.3, 2.62, 0);
  const boothWindow = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.85, 0.06), clearGlassMat);
  boothWindow.position.set(-5.3, 1.42, 0.71);
  const counterLedge = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.28), curbMat);
  counterLedge.position.set(-5.3, 0.98, 0.82);
  gateGroup.add(booth, boothRoof, boothWindow, counterLedge);

  // Zoo Trail Map Kiosk & Directional Safari Signpost on East side of gate
  const mapPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), woodFenceMat);
  mapPostL.position.set(5.1, 0.85, 0.1);
  const mapPostR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), woodFenceMat);
  mapPostR.position.set(6.3, 0.85, 0.1);
  const mapBoard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 0.10), woodFenceMat);
  mapBoard.position.set(5.7, 1.35, 0.1);
  const mapFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.82),
    new THREE.MeshStandardMaterial({ map: createZooTrailMapTexture(), roughness: 0.4 })
  );
  mapFace.position.set(5.7, 1.35, 0.16);
  const mapRoof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.45), thatchMat);
  mapRoof.position.set(5.7, 1.88, 0.1);
  gateGroup.add(mapPostL, mapPostR, mapBoard, mapFace, mapRoof);

  // Directional safari signpost
  const dirPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 6), woodFenceMat);
  dirPole.position.set(7.2, 1.0, 0.15);
  const dirArrow1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.05), safariRoofMat);
  dirArrow1.position.set(6.95, 1.72, 0.15);
  dirArrow1.rotation.y = 0.25;
  const dirArrow2 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.05), terracottaRoofMat);
  dirArrow2.position.set(7.42, 1.44, 0.15);
  dirArrow2.rotation.y = -0.3;
  gateGroup.add(dirPole, dirArrow1, dirArrow2);

  zoo.add(gateGroup);

  if (scale !== 1.0) {
    zoo.scale.setScalar(scale);
  }

  return zoo;
}

