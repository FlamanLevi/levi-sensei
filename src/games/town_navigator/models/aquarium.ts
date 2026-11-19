import * as THREE from 'three';
import {
  getConcretePanelTexture,
  getArchitecturalBumpMap,
  getClearShowcaseGlassMaterial,
  getSidewalkPaverTexture,
} from './wallTextures';
import { batchStaticMeshes } from '../staticBatcher';

export interface AquariumOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

let cachedAquariumSignTex: THREE.CanvasTexture | null = null;

/**
 * Creates a cached canvas texture for the modern aquarium entrance sign
 */
function createAquariumSignTexture(): THREE.CanvasTexture {
  if (cachedAquariumSignTex) return cachedAquariumSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#0369a1');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 50px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AQUARIUM', 256, 62);

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 24px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.fillText('すいぞくかん (水族館)', 256, 104);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.userData.isSharedResource = true;
  cachedAquariumSignTex = texture;
  return texture;
}

/**
 * Builds a sculpted low-poly Manta Ray (Wingspan ~2.8m, name 'MantaRay' preserved & pre-batched at identity)
 */
function buildMantaRay(): THREE.Group {
  const manta = new THREE.Group();
  manta.name = 'MantaRay';

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.32 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const gillMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5 });

  // Swept curved wing silhouette via extruded Shape
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.72);
  wingShape.quadraticCurveTo(0.45, 0.62, 1.55, -0.05);
  wingShape.quadraticCurveTo(1.15, -0.42, 0.25, -0.68);
  wingShape.lineTo(0, -0.82);
  wingShape.lineTo(-0.25, -0.68);
  wingShape.quadraticCurveTo(-1.15, -0.42, -1.55, -0.05);
  wingShape.quadraticCurveTo(-0.45, 0.62, 0, 0.72);

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 8,
  });
  wingGeo.rotateX(Math.PI / 2);

  const wings = new THREE.Mesh(wingGeo, bodyMat);
  wings.position.y = 0.04;
  manta.add(wings);

  const bellyGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.03,
    bevelEnabled: false,
    curveSegments: 8,
  });
  bellyGeo.rotateX(Math.PI / 2);
  bellyGeo.scale(0.92, 1.0, 0.92);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.y = -0.035;
  manta.add(belly);

  // Dorsal ridge
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 1.15), bodyMat);
  ridge.position.set(0, 0.06, -0.05);
  manta.add(ridge);

  // Curved cephalic lobes (forward horn fins)
  [-0.28, 0.28].forEach((hx) => {
    const lobeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx, 0.0, 0.62),
      new THREE.Vector3(hx * 1.15, -0.02, 0.88),
      new THREE.Vector3(hx * 0.9, -0.04, 1.08),
    ]);
    const lobe = new THREE.Mesh(new THREE.TubeGeometry(lobeCurve, 6, 0.045, 6, false), bodyMat);
    manta.add(lobe);
  });

  // Subtle gill slits on belly
  [-0.18, 0.18].forEach((gx) => {
    for (let i = 0; i < 3; i++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.02), gillMat);
      slit.position.set(gx, -0.07, 0.25 - i * 0.12);
      manta.add(slit);
    }
  });

  // Tapered whip tail
  const tailGeo = new THREE.CylinderGeometry(0.012, 0.045, 1.85, 6);
  tailGeo.rotateX(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.set(0, 0, -1.65);
  manta.add(tail);

  // Pre-batch at identity (0, 0, 0) so MantaRay is 1 draw call while remaining dynamic
  batchStaticMeshes(manta, [], { ignoreShadowFlags: true, bakeVertexColors: true });

  return manta;
}

/**
 * Builds a sculpted Japanese Aquarium Whale Shark (ジンベエザメ / Jinbē-zame)
 */
function buildWhaleShark(): THREE.Group {
  const shark = new THREE.Group();
  shark.name = 'WhaleShark';

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.38 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.45 });
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.35 });
  const gillMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.5 });

  // Smooth tapered fusiform body via LatheGeometry
  const pts = [
    new THREE.Vector2(0.01, -1.55),
    new THREE.Vector2(0.14, -1.2),
    new THREE.Vector2(0.28, -0.5),
    new THREE.Vector2(0.42, 0.3),
    new THREE.Vector2(0.45, 0.95),
    new THREE.Vector2(0.38, 1.38),
    new THREE.Vector2(0.18, 1.56),
    new THREE.Vector2(0.01, 1.62),
  ];
  const torsoGeo = new THREE.LatheGeometry(pts, 14);
  torsoGeo.rotateX(Math.PI / 2);
  torsoGeo.scale(1.25, 0.78, 1.0);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  shark.add(torso);

  const bellyGeo = new THREE.LatheGeometry(pts, 12);
  bellyGeo.rotateX(Math.PI / 2);
  bellyGeo.scale(1.12, 0.52, 0.96);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.y = -0.14;
  shark.add(belly);

  // Broad mouth ridge
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.10, 0.14), gillMat);
  mouth.position.set(0, -0.06, 1.54);
  shark.add(mouth);

  // Gill slits
  [-0.50, 0.50].forEach((gx) => {
    for (let i = 0; i < 4; i++) {
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.03), gillMat);
      gill.position.set(gx, 0.0, 0.85 - i * 0.11);
      shark.add(gill);
    }
  });

  // Swept curved pectoral fins
  [-0.68, 0.68].forEach((fx) => {
    const pec = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.95, 4), bodyMat);
    pec.rotation.z = fx < 0 ? 1.38 : -1.38;
    pec.rotation.y = fx < 0 ? 0.35 : -0.35;
    pec.scale.set(0.35, 1.0, 0.75);
    pec.position.set(fx, -0.10, 0.52);
    shark.add(pec);
  });

  // Swept dorsal fin
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.58, 4), bodyMat);
  dorsal.position.set(0, 0.42, -0.18);
  dorsal.rotation.x = -0.28;
  dorsal.scale.set(0.35, 1.0, 1.0);
  shark.add(dorsal);

  // Crescent caudal tail fin (upper & lower lobes)
  const upperTail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 4), bodyMat);
  upperTail.position.set(0, 0.28, -1.62);
  upperTail.rotation.x = -0.45;
  upperTail.scale.set(0.3, 1.0, 0.8);
  const lowerTail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.58, 4), bodyMat);
  lowerTail.position.set(0, -0.18, -1.56);
  lowerTail.rotation.x = Math.PI + 0.42;
  lowerTail.scale.set(0.3, 1.0, 0.7);
  shark.add(upperTail, lowerTail);

  // Surface-hugged spot pattern
  [-0.28, -0.10, 0.10, 0.28].forEach((sx) => {
    [-0.65, -0.15, 0.35, 0.85, 1.2].forEach((sz) => {
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 6), spotMat);
      const archY = 0.33 - Math.abs(sx) * 0.22 - Math.max(0, -sz) * 0.06;
      spot.position.set(sx, archY, sz);
      shark.add(spot);
    });
  });

  return shark;
}

/**
 * Builds a stylized Green Sea Turtle (ウミガメ / Umigame) with domed scutes & curved flippers
 */
function buildSeaTurtle(): THREE.Group {
  const turtle = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 });
  const scuteMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.55 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  const carapace = new THREE.Mesh(new THREE.SphereGeometry(0.40, 12, 8), shellMat);
  carapace.scale.set(1.0, 0.40, 1.25);
  turtle.add(carapace);

  // Scute plates
  [-0.14, 0.14].forEach((sx) => {
    [-0.16, 0.12].forEach((sz) => {
      const scute = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.04, 6), scuteMat);
      scute.position.set(sx, 0.13, sz);
      turtle.add(scute);
    });
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skinMat);
  head.scale.set(0.9, 0.85, 1.2);
  head.position.set(0, 0.02, 0.54);
  turtle.add(head);

  [-0.07, 0.07].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeMat);
    eye.position.set(ex, 0.05, 0.62);
    turtle.add(eye);
  });

  // Front & rear curved flippers
  [-0.36, 0.36].forEach((fx) => {
    const frontFlipper = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.52, 4), skinMat);
    frontFlipper.rotation.z = fx < 0 ? 1.45 : -1.45;
    frontFlipper.rotation.y = fx < 0 ? 0.4 : -0.4;
    frontFlipper.scale.set(0.35, 1.0, 0.8);
    frontFlipper.position.set(fx, -0.02, 0.20);
    turtle.add(frontFlipper);

    const rearFlipper = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 4), skinMat);
    rearFlipper.rotation.z = fx < 0 ? 1.3 : -1.3;
    rearFlipper.rotation.y = fx < 0 ? -0.5 : 0.5;
    rearFlipper.scale.set(0.35, 1.0, 0.7);
    rearFlipper.position.set(fx * 0.65, -0.03, -0.44);
    turtle.add(rearFlipper);
  });

  return turtle;
}

/**
 * Builds a sculpted two-tone Dolphin (Length ~2.0m) with arched torso, melon/beak, flippers & fluke
 */
function buildDolphin(colorHex: number = 0x0284c7): THREE.Group {
  const dolphin = new THREE.Group();
  dolphin.name = 'Dolphin';

  const backMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.28, metalness: 0.15 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  // Tapered arched torso via LatheGeometry
  const pts = [
    new THREE.Vector2(0.02, -0.92),
    new THREE.Vector2(0.11, -0.62),
    new THREE.Vector2(0.24, -0.12),
    new THREE.Vector2(0.26, 0.32),
    new THREE.Vector2(0.19, 0.68),
    new THREE.Vector2(0.09, 0.88),
    new THREE.Vector2(0.02, 0.94),
  ];
  const bodyGeo = new THREE.LatheGeometry(pts, 12);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, backMat);
  dolphin.add(body);

  // Pale belly underside
  const bellyGeo = new THREE.LatheGeometry(pts, 10);
  bellyGeo.rotateX(Math.PI / 2);
  bellyGeo.scale(0.84, 0.68, 0.92);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0, -0.075, 0.02);
  dolphin.add(belly);

  // Tapered beak / rostrum
  const beakGeo = new THREE.ConeGeometry(0.065, 0.34, 8);
  beakGeo.rotateX(Math.PI / 2);
  const beak = new THREE.Mesh(beakGeo, backMat);
  beak.position.set(0, -0.03, 1.02);
  dolphin.add(beak);

  // Glossy eyes
  [-0.12, 0.12].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), eyeMat);
    eye.position.set(ex, 0.04, 0.72);
    dolphin.add(eye);
  });

  // Swept dorsal fin
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 4), backMat);
  dorsal.position.set(0, 0.32, -0.05);
  dorsal.rotation.x = -0.42;
  dorsal.scale.set(0.32, 1.0, 1.0);
  dolphin.add(dorsal);

  // Twin pectoral flippers
  [-0.26, 0.26].forEach((fx) => {
    const flipper = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 4), backMat);
    flipper.position.set(fx, -0.10, 0.28);
    flipper.rotation.z = fx < 0 ? 1.15 : -1.15;
    flipper.rotation.y = fx < 0 ? 0.35 : -0.35;
    flipper.scale.set(0.35, 1.0, 0.8);
    dolphin.add(flipper);
  });

  // Forked tail fluke
  [-0.18, 0.18].forEach((tx) => {
    const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 4), backMat);
    fluke.position.set(tx, 0, -0.98);
    fluke.rotation.z = tx < 0 ? 1.35 : -1.35;
    fluke.rotation.y = tx < 0 ? -0.35 : 0.35;
    fluke.scale.set(0.28, 1.0, 0.8);
    dolphin.add(fluke);
  });

  return dolphin;
}

/**
 * Tier 3: Aquarium (水族館) - `hwg5_u19_18`
 * Footprint: strictly within 18.0m x 18.0m (3U x 3U)
 */
export function buildAquariumMesh(options: AquariumOptions = {}): THREE.Group {
  const {
    includeRoad = true,
    includeLandscaping = true,
    scale = 1.0,
  } = options;

  const aquarium = new THREE.Group();
  aquarium.name = 'Tier3_Aquarium_hwg5_u19_18';

  const bumpTex = getArchitecturalBumpMap();
  const clearGlassMat = getClearShowcaseGlassMaterial();

  // --- Materials ---
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getSidewalkPaverTexture(),
    roughness: 0.75,
  });
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 });
  const waveWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getConcretePanelTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.015,
    roughness: 0.42,
  });
  const waveBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.15 });
  const oceanDeepMat = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.2,
    emissive: 0x0284c7,
    emissiveIntensity: 0.58,
  });
  const tankSandMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.32,
    roughness: 0.6,
  });
  const tankGlassMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.32,
  });
  const portholeGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const waterSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.14,
    metalness: 0.22,
    transparent: true,
    opacity: 0.82,
  });
  const sprayMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.2,
    transparent: true,
    opacity: 0.65,
  });
  const coralPurpleMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.65 });
  const coralOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.65 });
  const reefRockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const kelpGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 });
  const tropicalYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.45,
  });
  const fishStripeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.72 });
  const palmBarkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });

  // 1. BASE FOOTPRINT & INFRASTRUCTURE (18m x 18m Lot)
  const foundationGeo = new THREE.BoxGeometry(18.0, 0.18, 16.5);
  const foundation = new THREE.Mesh(foundationGeo, plazaMat);
  foundation.position.set(0, 0.09, -0.75);
  foundation.receiveShadow = true;
  aquarium.add(foundation);

  // Unobstructed Sidewalk: Z in [+7.5, +9.0]
  const sidewalkGeo = new THREE.BoxGeometry(18.0, 0.18, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalk.position.set(0, 0.09, 8.25);
  sidewalk.receiveShadow = true;
  aquarium.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(18.0, 0.20, 0.15);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.10, 9.0);
  curb.receiveShadow = true;
  aquarium.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(18.0, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 9.9);
    road.receiveShadow = true;
    aquarium.add(road);

    for (let i = -8.0; i <= 8.0; i += 2.4) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.025, 0.12);
      const stripe = new THREE.Mesh(stripeGeo, waveWhiteMat);
      stripe.position.set(i, 0.02, 9.4);
      aquarium.add(stripe);
    }
  }

  // 2. MAIN OCEANARIUM PAVILION (With Open Recessed Front Tank Cavity!)
  const buildingGroup = new THREE.Group();
  buildingGroup.position.set(0, 0.18, -1.8);

  const rearCore = new THREE.Mesh(new THREE.BoxGeometry(15.6, 8.5, 6.7), waveWhiteMat);
  rearCore.position.set(0, 4.25, -2.15);
  rearCore.castShadow = true;
  rearCore.receiveShadow = true;

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 8.5, 4.3), waveWhiteMat);
  leftWing.position.set(-6.75, 4.25, 3.35);
  leftWing.castShadow = true;
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 8.5, 4.3), waveWhiteMat);
  rightWing.position.set(6.75, 4.25, 3.35);
  rightWing.castShadow = true;

  const upperHeader = new THREE.Mesh(new THREE.BoxGeometry(11.4, 2.8, 4.3), waveWhiteMat);
  upperHeader.position.set(0, 7.1, 3.35);
  upperHeader.castShadow = true;

  buildingGroup.add(rearCore, leftWing, rightWing, upperHeader);

  // Wave-profiled horizontal architectural louvers on Left & Right Wings
  [-6.75, 6.75].forEach((wx) => {
    for (let ly = 5.0; ly <= 7.8; ly += 0.65) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.10, 0.22), waveBlueMat);
      louver.position.set(wx, ly, 5.56);
      buildingGroup.add(louver);
    }
  });

  // Illuminated Circular Porthole Windows with Navy Bezel Rings on Side Walls & Front Wings
  [-3.2, 0.0, 3.2].forEach((pz) => {
    [-7.82, 7.82].forEach((px) => {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.06, 20), waveBlueMat);
      bezel.rotation.z = Math.PI / 2;
      bezel.position.set(px, 4.2, pz);
      const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.09, 20), portholeGlowMat);
      porthole.rotation.z = Math.PI / 2;
      porthole.position.set(px, 4.2, pz);
      buildingGroup.add(bezel, porthole);
    });
  });

  [-6.75, 6.75].forEach((px) => {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.06, 20), waveBlueMat);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(px, 3.2, 5.51);
    const frontPorthole = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.09, 20), portholeGlowMat);
    frontPorthole.rotation.x = Math.PI / 2;
    frontPorthole.position.set(px, 3.2, 5.52);
    buildingGroup.add(bezel, frontPorthole);
  });

  // Sweeping Ocean Wave Roof Canopy + White Structural Wave Ribs + Rooftop Glass Crest
  const waveCanopyGeo = new THREE.CylinderGeometry(8.2, 8.8, 16.0, 32, 1, false, 0, Math.PI / 2);
  waveCanopyGeo.rotateZ(Math.PI / 2);
  const waveCanopy = new THREE.Mesh(waveCanopyGeo, waveBlueMat);
  waveCanopy.position.set(0, 8.5, 2.5);
  waveCanopy.scale.set(1.0, 0.7, 0.8);
  waveCanopy.castShadow = true;
  buildingGroup.add(waveCanopy);

  // White arched structural ribs over waveCanopy
  [-7.2, -3.6, 0, 3.6, 7.2].forEach((rx) => {
    const ribGeo = new THREE.TorusGeometry(8.5, 0.14, 6, 24, Math.PI / 2);
    const rib = new THREE.Mesh(ribGeo, waveWhiteMat);
    rib.rotation.y = Math.PI / 2;
    rib.position.set(rx, 8.5, 2.5);
    rib.scale.set(0.8, 0.7, 1.0);
    buildingGroup.add(rib);
  });

  // Rooftop translucent glass skylight crest
  const roofCrest = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.95, 0.16), clearGlassMat);
  roofCrest.position.set(0, 12.15, -0.5);
  buildingGroup.add(roofCrest);

  // 3. GIANT TWO-STORY KUROSHIO OCEAN TANK ATRIUM (detail1: Unobstructed in front cavity!)
  const tankGroup = new THREE.Group();
  tankGroup.position.set(0, 0.25, 4.8);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(11.3, 5.2), oceanDeepMat);
  backWall.position.set(0, 2.6, -3.4);
  const leftTankWall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2), oceanDeepMat);
  leftTankWall.rotation.y = Math.PI / 2;
  leftTankWall.position.set(-5.65, 2.6, -1.7);
  const rightTankWall = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2), oceanDeepMat);
  rightTankWall.rotation.y = -Math.PI / 2;
  rightTankWall.position.set(5.65, 2.6, -1.7);
  const seaFloor = new THREE.Mesh(new THREE.BoxGeometry(11.3, 0.16, 3.4), tankSandMat);
  seaFloor.position.set(0, 0.08, -1.7);
  tankGroup.add(backWall, leftTankWall, rightTankWall, seaFloor);

  // Inside the Tank: 1. Animated Giant Manta Ray ('MantaRay')
  const manta = buildMantaRay();
  manta.position.set(2.1, 3.8, -1.4);
  manta.rotation.set(0.2, -0.35, 0.12);
  tankGroup.add(manta);

  // Inside the Tank: 2. Spotted Whale Shark (ジンベエザメ)
  const whaleShark = buildWhaleShark();
  whaleShark.position.set(-1.6, 3.3, -2.1);
  whaleShark.rotation.set(0.05, 1.35, -0.08);
  tankGroup.add(whaleShark);

  // Inside the Tank: 3. Green Sea Turtle (ウミガメ)
  const seaTurtle = buildSeaTurtle();
  seaTurtle.position.set(3.8, 2.6, -1.6);
  seaTurtle.rotation.set(-0.12, -0.65, 0.15);
  tankGroup.add(seaTurtle);

  // Inside the Tank: 4. Pod of Dolphins
  const d1 = buildDolphin(0x38bdf8);
  d1.position.set(-3.2, 1.9, -1.2);
  d1.rotation.set(-0.15, 0.85, 0.1);
  tankGroup.add(d1);

  const d2 = buildDolphin(0x7dd3fc);
  d2.position.set(0.4, 2.1, -1.1);
  d2.rotation.set(0.1, -0.95, -0.12);
  d2.scale.setScalar(0.78);
  tankGroup.add(d2);

  // Inside the Tank: 5. Layered Reef Boulders, Branching Coral, S-Curved Kelp, Tropical Fish & Bubbles
  [-4.6, -3.4, -1.8, 0.2, 2.2, 4.4].forEach((cx, idx) => {
    // Reef boulder cluster
    const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 + (idx % 2) * 0.15, 0), reefRockMat);
    boulder.scale.set(1.3, 0.65, 1.0);
    boulder.position.set(cx, 0.22, -2.0 + (idx % 2) * 0.35);
    tankGroup.add(boulder);

    // Branching coral cluster (main trunk + 2 angled side branches)
    const coralMat = idx % 2 === 0 ? coralPurpleMat : coralOrangeMat;
    const cTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 0.68, 6), coralMat);
    cTrunk.position.set(cx, 0.56, -1.85 + (idx % 2) * 0.35);
    const cBranchL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.45, 6), coralMat);
    cBranchL.position.set(cx - 0.16, 0.72, -1.85 + (idx % 2) * 0.35);
    cBranchL.rotation.z = 0.55;
    const cBranchR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.42, 6), coralMat);
    cBranchR.position.set(cx + 0.15, 0.70, -1.85 + (idx % 2) * 0.35);
    cBranchR.rotation.z = -0.5;
    tankGroup.add(cTrunk, cBranchL, cBranchR);

    // S-curved ribbon kelp blades
    const kelpH = 2.4 + (idx % 3) * 0.65;
    const kelpCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx + 0.35, 0.15, -2.65),
      new THREE.Vector3(cx + 0.48, kelpH * 0.35, -2.55),
      new THREE.Vector3(cx + 0.22, kelpH * 0.70, -2.68),
      new THREE.Vector3(cx + 0.38, kelpH, -2.60),
    ]);
    const kelp = new THREE.Mesh(new THREE.TubeGeometry(kelpCurve, 8, 0.045, 5, false), kelpGreenMat);
    tankGroup.add(kelp);

    // Rising bubble string
    for (let b = 0; b < 4; b++) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.04 + b * 0.008, 6, 6), clearGlassMat);
      bubble.position.set(cx - 0.25 + (b % 2) * 0.08, 0.9 + b * 0.95, -1.5);
      tankGroup.add(bubble);
    }
  });

  // School of 14 striped tropical fish with triangular tail fins
  for (let f = 0; f < 14; f++) {
    const fx = -4.6 + (f % 7) * 1.48 + (f >= 7 ? 0.55 : 0);
    const fy = 1.15 + ((f * 3) % 5) * 0.42;
    const fz = -0.85 - (f % 3) * 0.45;
    const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), tropicalYellowMat);
    fBody.scale.set(1.5, 0.9, 0.45);
    fBody.position.set(fx, fy, fz);
    const fStripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.08), fishStripeMat);
    fStripe.position.set(fx, fy, fz);
    const fTail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.10, 3), tropicalYellowMat);
    fTail.rotation.z = -Math.PI / 2;
    fTail.position.set(fx - 0.14, fy, fz);
    tankGroup.add(fBody, fStripe, fTail);
  }

  // Front Crystal-Clear Acrylic Viewing Window Pane, Vertical Glass Fins & Frame Trim
  const glassGeo = new THREE.BoxGeometry(11.3, 5.1, 0.12);
  const glass = new THREE.Mesh(glassGeo, tankGlassMat);
  glass.position.set(0, 2.6, 0);
  tankGroup.add(glass);

  [-2.8, 0, 2.8].forEach((vx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 5.05, 0.28), clearGlassMat);
    fin.position.set(vx, 2.6, 0.08);
    tankGroup.add(fin);
  });

  const frameGeo = new THREE.BoxGeometry(11.5, 0.32, 0.42);
  const topFrame = new THREE.Mesh(frameGeo, waveBlueMat);
  topFrame.position.set(0, 5.2, 0);
  const btmFrame = new THREE.Mesh(frameGeo, waveBlueMat);
  btmFrame.position.set(0, 0.12, 0);
  tankGroup.add(topFrame, btmFrame);

  // Sleek recessed side entry vestibule on the right wing (leaves 11.3m Kuroshio window 100% unobstructed!)
  const vestibule = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.4, 0.55), waveBlueMat);
  vestibule.position.set(6.75, 1.2, 0.85);
  const vestibuleDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.12), clearGlassMat);
  vestibuleDoor.position.set(6.75, 1.0, 1.12);
  tankGroup.add(vestibule, vestibuleDoor);

  buildingGroup.add(tankGroup);

  // 4. MAIN ENTRANCE SIGNBOARD BANNER
  const signBoardGeo = new THREE.BoxGeometry(7.4, 1.45, 0.24);
  const signBoard = new THREE.Mesh(signBoardGeo, waveBlueMat);
  signBoard.position.set(0, 7.6, 5.6);

  const signDecalGeo = new THREE.PlaneGeometry(7.0, 1.25);
  const signTex = createAquariumSignTexture();
  const signDecalMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: 0xffffff,
    emissiveMap: signTex,
    emissiveIntensity: 0.48,
    roughness: 0.3,
  });
  const signDecal = new THREE.Mesh(signDecalGeo, signDecalMat);
  signDecal.position.set(0, 7.6, 5.73);

  buildingGroup.add(signBoard, signDecal);
  aquarium.add(buildingGroup);

  // 5. CIVIC FORECOURT PLAZA & TWIN DOLPHIN FOUNTAIN (detail2 at X = -4.2, Z = 5.90 — sidewalk Z in [+7.5, +9.0] is 100% clear!)
  const plazaGroup = new THREE.Group();
  plazaGroup.position.set(0, 0.18, 5.90);

  // Stepped granite fountain coping + compact 1.50m outer radius basin (5.90 + 1.50 = 7.40 <= 7.50)
  const copingStep = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.50, 0.22, 24), graniteMat);
  copingStep.position.set(-4.2, 0.11, 0);
  const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.42, 0.44, 24), waveWhiteMat);
  fountainBasin.position.set(-4.2, 0.22, 0);
  fountainBasin.castShadow = true;

  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.40, 24), waterSurfaceMat);
  water.position.set(-4.2, 0.24, 0);

  // Wave rock pedestal
  const rockPedestal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), graniteMat);
  rockPedestal.scale.set(1.2, 0.7, 1.2);
  rockPedestal.position.set(-4.2, 0.42, 0);

  const waterJet = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.22, 1.1, 12), portholeGlowMat);
  waterJet.position.set(-4.2, 0.85, 0);

  // Translucent arcing spray jets & white foam rings
  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((ang) => {
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const arcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.2 + dx * 0.15, 0.6, dz * 0.15),
      new THREE.Vector3(-4.2 + dx * 0.55, 1.05, dz * 0.55),
      new THREE.Vector3(-4.2 + dx * 0.92, 0.45, dz * 0.92),
    ]);
    const sprayArc = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 8, 0.032, 6, false), sprayMat);
    const foamRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), waveWhiteMat);
    foamRing.rotation.x = Math.PI / 2;
    foamRing.position.set(-4.2 + dx * 0.92, 0.45, dz * 0.92);
    plazaGroup.add(sprayArc, foamRing);
  });

  const leapDolphin1 = buildDolphin(0x0284c7);
  leapDolphin1.position.set(-4.45, 1.48, 0.12);
  leapDolphin1.rotation.set(0.55, 0.4, -0.25);
  leapDolphin1.scale.setScalar(0.76);

  const leapDolphin2 = buildDolphin(0x38bdf8);
  leapDolphin2.position.set(-3.88, 1.30, -0.18);
  leapDolphin2.rotation.set(0.45, 0.4, -0.2);
  leapDolphin2.scale.setScalar(0.58);

  plazaGroup.add(copingStep, fountainBasin, water, rockPedestal, waterJet, leapDolphin1, leapDolphin2);

  // Modern Ticket Entrance Gates & Glowing Jellyfish Bollard Lamps
  [-0.8, 0.8, 2.4, 3.8].forEach((gx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 1.0, 10), waveBlueMat);
    post.position.set(gx, 0.5, 0.45);
    post.castShadow = true;
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), portholeGlowMat);
    capDome.position.set(gx, 1.06, 0.45);
    plazaGroup.add(post, capDome);
  });

  // East-side wave-roofed ticket kiosk
  const kioskBase = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 1.3), waveWhiteMat);
  kioskBase.position.set(5.4, 1.05, 0.25);
  const kioskWindow = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.08), clearGlassMat);
  kioskWindow.position.set(5.4, 1.35, 0.91);
  const kioskRoof = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.22, 1.65), waveBlueMat);
  kioskRoof.position.set(5.4, 2.18, 0.28);
  kioskRoof.rotation.x = 0.08;
  plazaGroup.add(kioskBase, kioskWindow, kioskRoof);

  // Curved plaza benches
  [-1.2, 1.8].forEach((bx) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.10, 0.45), timberMat);
    seat.position.set(bx, 0.42, 0.85);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.42), graniteMat);
    legL.position.set(bx - 0.52, 0.21, 0.85);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.42), graniteMat);
    legR.position.set(bx + 0.52, 0.21, 0.85);
    plazaGroup.add(seat, legL, legR);
  });

  // Coastal palm planters honoring includeLandscaping (strictly Z <= 7.25m)
  if (includeLandscaping) {
    [-7.6, 7.6].forEach((px) => {
      const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.62, 0.42, 12), graniteMat);
      planter.position.set(px, 0.21, 0.55);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.15, 2.6, 8), palmBarkMat);
      trunk.position.set(px, 1.5, 0.55);
      trunk.rotation.z = px < 0 ? 0.08 : -0.08;
      plazaGroup.add(planter, trunk);

      for (let f = 0; f < 5; f++) {
        const ang = (f * Math.PI * 2) / 5;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.35, 4), palmLeafMat);
        frond.position.set(px + Math.cos(ang) * 0.45, 2.82, 0.55 + Math.sin(ang) * 0.45);
        frond.rotation.z = -Math.cos(ang) * 1.05;
        frond.rotation.x = Math.sin(ang) * 1.05;
        frond.scale.set(0.55, 1.0, 0.35);
        plazaGroup.add(frond);
      }
    });
  }

  aquarium.add(plazaGroup);

  if (scale !== 1.0) {
    aquarium.scale.setScalar(scale);
  }

  return aquarium;
}

