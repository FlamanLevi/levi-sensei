import * as THREE from 'three';
import { getConcretePanelTexture, getArchitecturalBumpMap } from './wallTextures';

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
  cachedAquariumSignTex = texture;
  return texture;
}

/**
 * Builds a stylized low-poly Manta Ray (Wingspan ~2.8m, name 'MantaRay' preserved for animation!)
 */
function buildMantaRay(): THREE.Group {
  const manta = new THREE.Group();
  manta.name = 'MantaRay';

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.32 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });

  const wingGeo = new THREE.ConeGeometry(1.4, 1.8, 4);
  wingGeo.rotateX(Math.PI / 2);
  wingGeo.scale(1.8, 0.12, 1.0);
  const wings = new THREE.Mesh(wingGeo, bodyMat);
  const belly = new THREE.Mesh(wingGeo, bellyMat);
  belly.position.y = -0.03;
  manta.add(wings, belly);

  [-0.35, 0.35].forEach((hx) => {
    const hornGeo = new THREE.BoxGeometry(0.12, 0.08, 0.35);
    const horn = new THREE.Mesh(hornGeo, bodyMat);
    horn.position.set(hx, 0, 0.95);
    horn.rotation.y = hx < 0 ? 0.3 : -0.3;
    manta.add(horn);
  });

  const tailGeo = new THREE.CylinderGeometry(0.02, 0.04, 1.8, 6);
  tailGeo.rotateX(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.set(0, 0, -1.6);
  manta.add(tail);

  return manta;
}

/**
 * Builds an iconic Japanese Aquarium Whale Shark (ジンベエザメ / Jinbē-zame)
 */
function buildWhaleShark(): THREE.Group {
  const shark = new THREE.Group();
  shark.name = 'WhaleShark';

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.38 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.45 });
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.35 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.22, 2.9, 14), bodyMat);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(1.32, 0.85, 1.0);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.18, 2.7, 12), bellyMat);
  belly.rotation.x = Math.PI / 2;
  belly.scale.set(1.2, 0.65, 1.0);
  belly.position.y = -0.08;
  shark.add(torso, belly);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.36, 0.68), bodyMat);
  head.position.set(0, 0.02, 1.48);
  shark.add(head);

  [-0.78, 0.78].forEach((fx) => {
    const pecFin = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.05, 0.44), bodyMat);
    pecFin.position.set(fx, -0.08, 0.65);
    pecFin.rotation.y = fx < 0 ? 0.35 : -0.35;
    shark.add(pecFin);
  });

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 4), bodyMat);
  dorsal.position.set(0, 0.40, -0.2);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 0.40), bodyMat);
  tailFin.position.set(0, 0.12, -1.58);
  tailFin.rotation.x = 0.25;
  shark.add(dorsal, tailFin);

  [-0.26, 0, 0.26].forEach((sx) => {
    [-0.6, 0.0, 0.6, 1.1].forEach((sz) => {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.048, 6, 6), spotMat);
      spot.position.set(sx, 0.33, sz);
      shark.add(spot);
    });
  });

  return shark;
}

/**
 * Builds a stylized Green Sea Turtle (ウミガメ / Umigame)
 */
function buildSeaTurtle(): THREE.Group {
  const turtle = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.6 });

  const carapace = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), shellMat);
  carapace.scale.set(1.0, 0.38, 1.25);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skinMat);
  head.position.set(0, 0, 0.52);

  [-0.36, 0.36].forEach((fx) => {
    const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.16), skinMat);
    flipper.position.set(fx, -0.02, 0.18);
    flipper.rotation.y = fx < 0 ? 0.3 : -0.3;
    turtle.add(flipper);
  });

  turtle.add(carapace, head);
  return turtle;
}

/**
 * Builds a stylized low-poly Dolphin (Length ~2.0m)
 */
function buildDolphin(colorHex: number = 0x0284c7): THREE.Group {
  const dolphin = new THREE.Group();
  dolphin.name = 'Dolphin';

  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.28, metalness: 0.2 });

  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.15, 1.6, 12);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, mat);
  dolphin.add(body);

  const snoutGeo = new THREE.ConeGeometry(0.12, 0.4, 8);
  snoutGeo.rotateX(Math.PI / 2);
  const snout = new THREE.Mesh(snoutGeo, mat);
  snout.position.set(0, -0.04, 0.95);
  dolphin.add(snout);

  const dorsalGeo = new THREE.BoxGeometry(0.05, 0.35, 0.3);
  const dorsal = new THREE.Mesh(dorsalGeo, mat);
  dorsal.position.set(0, 0.28, -0.1);
  dorsal.rotation.x = -0.4;
  dolphin.add(dorsal);

  const flukeGeo = new THREE.BoxGeometry(0.65, 0.04, 0.25);
  const fluke = new THREE.Mesh(flukeGeo, mat);
  fluke.position.set(0, 0, -0.95);
  fluke.rotation.y = 0.2;
  dolphin.add(fluke);

  return dolphin;
}

/**
 * Tier 3: Aquarium (水族館) - `hwg5_u19_18`
 * Footprint: strictly within 18.0m x 18.0m (3U x 3U)
 */
export function buildAquariumMesh(options: AquariumOptions = {}): THREE.Group {
  const {
    includeRoad = true,
    scale = 1.0,
  } = options;

  const aquarium = new THREE.Group();
  aquarium.name = 'Tier3_Aquarium_hwg5_u19_18';

  const bumpTex = getArchitecturalBumpMap();

  // --- Materials ---
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
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
    opacity: 0.38,
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
  const coralPurpleMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.65 });
  const coralOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.65 });
  const kelpGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 });
  const tropicalYellowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.45,
  });

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

  // Sweeping Ocean Wave Roof Canopy + Structural Wave Ribs (Height up to 12.2m)
  const waveCanopyGeo = new THREE.CylinderGeometry(8.2, 8.8, 16.0, 32, 1, false, 0, Math.PI / 2);
  waveCanopyGeo.rotateZ(Math.PI / 2);
  const waveCanopy = new THREE.Mesh(waveCanopyGeo, waveBlueMat);
  waveCanopy.position.set(0, 8.5, 2.5);
  waveCanopy.scale.set(1.0, 0.7, 0.8);
  waveCanopy.castShadow = true;
  buildingGroup.add(waveCanopy);

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

  // Inside the Tank: 5. Swaying Kelp Forest Fronds, Coral Reef & Tropical Fish
  [-4.6, -3.4, -1.8, 0.2, 2.2, 4.4].forEach((cx, idx) => {
    const coralGeo = new THREE.ConeGeometry(0.36 + (idx % 3) * 0.14, 0.88 + (idx % 2) * 0.45, 7);
    const coral = new THREE.Mesh(coralGeo, idx % 2 === 0 ? coralPurpleMat : coralOrangeMat);
    coral.position.set(cx, 0.55, -1.8 + (idx % 2) * 0.4);
    tankGroup.add(coral);

    // Tall Kelp Seaweed Stalks
    const kelpH = 2.4 + (idx % 3) * 0.7;
    const kelp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, kelpH, 6), kelpGreenMat);
    kelp.position.set(cx + 0.35, kelpH / 2 + 0.1, -2.6);
    kelp.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.08;
    tankGroup.add(kelp);

    const fish = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), tropicalYellowMat);
    fish.scale.set(1.6, 1.0, 0.5);
    fish.position.set(cx * 0.85, 1.35 + (idx % 3) * 0.45, -1.0);
    tankGroup.add(fish);
  });

  // Front Crystal-Clear Acrylic Viewing Window Pane & Frame Trim
  const glassGeo = new THREE.BoxGeometry(11.3, 5.1, 0.12);
  const glass = new THREE.Mesh(glassGeo, tankGlassMat);
  glass.position.set(0, 2.6, 0);
  tankGroup.add(glass);

  const frameGeo = new THREE.BoxGeometry(11.5, 0.32, 0.42);
  const topFrame = new THREE.Mesh(frameGeo, waveBlueMat);
  topFrame.position.set(0, 5.2, 0);
  const btmFrame = new THREE.Mesh(frameGeo, waveBlueMat);
  btmFrame.position.set(0, 0.12, 0);
  tankGroup.add(topFrame, btmFrame);

  // Walk-Through Underwater Acrylic Arch Tunnel Entrance (Center-Right of Tank)
  const tunnelArch = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.18, 1.45, 16, 1, false, 0, Math.PI),
    waveBlueMat
  );
  tunnelArch.rotation.z = Math.PI / 2;
  tunnelArch.rotation.y = Math.PI / 2;
  tunnelArch.position.set(3.2, 1.18, 0.65);
  tankGroup.add(tunnelArch);

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

  // 5. CIVIC FORECOURT PLAZA & TWIN DOLPHIN FOUNTAIN (detail2 at X = -4.2, Z = 6.7)
  const plazaGroup = new THREE.Group();
  plazaGroup.position.set(0, 0.18, 6.7);

  const fountainBasinGeo = new THREE.CylinderGeometry(1.95, 2.15, 0.50, 24);
  const fountainBasin = new THREE.Mesh(fountainBasinGeo, waveWhiteMat);
  fountainBasin.position.set(-4.2, 0.25, 0);
  fountainBasin.castShadow = true;

  const waterGeo = new THREE.CylinderGeometry(1.78, 1.78, 0.46, 24);
  const water = new THREE.Mesh(waterGeo, waterSurfaceMat);
  water.position.set(-4.2, 0.26, 0);

  const waterJet = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.30, 1.4, 12), portholeGlowMat);
  waterJet.position.set(-4.2, 0.92, 0);

  const leapDolphin1 = buildDolphin(0x0284c7);
  leapDolphin1.position.set(-4.5, 1.58, 0.15);
  leapDolphin1.rotation.set(0.55, 0.4, -0.25);
  leapDolphin1.scale.setScalar(0.88);

  const leapDolphin2 = buildDolphin(0x38bdf8);
  leapDolphin2.position.set(-3.8, 1.38, -0.2);
  leapDolphin2.rotation.set(0.45, 0.4, -0.2);
  leapDolphin2.scale.setScalar(0.68);

  plazaGroup.add(fountainBasin, water, waterJet, leapDolphin1, leapDolphin2);

  // Modern Ticket Entrance Gates & Glowing Jellyfish Bollard Lamps (Right side of plaza)
  [-0.8, 0.8, 2.4, 4.0].forEach((gx) => {
    const postGeo = new THREE.CylinderGeometry(0.085, 0.095, 1.0, 10);
    const post = new THREE.Mesh(postGeo, waveBlueMat);
    post.position.set(gx, 0.5, 0);
    post.castShadow = true;
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), portholeGlowMat);
    capDome.position.set(gx, 1.06, 0);
    plazaGroup.add(post, capDome);
  });

  aquarium.add(plazaGroup);

  if (scale !== 1.0) {
    aquarium.scale.setScalar(scale);
  }

  return aquarium;
}
