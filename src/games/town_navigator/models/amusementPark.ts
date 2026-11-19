import * as THREE from 'three';
import { getBrickTileTexture, getArchitecturalBumpMap, getClearShowcaseGlassMaterial } from './wallTextures';
import { batchStaticMeshes } from '../staticBatcher';

export interface AmusementParkOptions {
  includeRoad?: boolean;
  includeLandscaping?: boolean;
  scale?: number;
}

let cachedParkBannerTex: THREE.CanvasTexture | null = null;

/**
 * Creates a cached canvas texture for the festive amusement park arch banner
 */
function createAmusementParkBannerTexture(): THREE.CanvasTexture {
  if (cachedParkBannerTex) return cachedParkBannerTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#c026d3');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#f43f5e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AMUSEMENT PARK', 256, 60);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 24px "UD Digi Kyokasho NP-R", "BIZ UDPGothic", sans-serif';
    ctx.fillText('ゆうえんち (遊園地)', 256, 102);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData.isSharedResource = true;
  cachedParkBannerTex = texture;
  return texture;
}

/**
 * Tier 3: Amusement Park (遊園地) - `hwg5_u19_25`
 * Footprint: strictly within 18.0m x 18.0m (3U x 3U)
 * Maximum Height: 17.5m (Ferris Wheel Rim <= 18.0m)
 */
export function buildAmusementParkMesh(options: AmusementParkOptions = {}): THREE.Group {
  const {
    includeRoad = true,
    includeLandscaping = true,
    scale = 1.0,
  } = options;

  const park = new THREE.Group();
  park.name = 'Tier3_AmusementPark_hwg5_u19_25';

  const bumpTex = getArchitecturalBumpMap();

  // --- Materials ---
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
  const plazaMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    bumpMap: bumpTex,
    bumpScale: 0.015,
    roughness: 0.78,
  });
  const castlePinkMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    map: getBrickTileTexture(),
    bumpMap: bumpTex,
    bumpScale: 0.02,
    roughness: 0.45,
  });
  const castlePurpleMat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.35, metalness: 0.15 });
  const goldStarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22, metalness: 0.75 });
  const wheelPylonMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.4 });
  const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.2 });
  const neonPinkGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xec4899,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const neonGoldGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.25,
    roughness: 0.2,
  });
  const neonCyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });
  const clearGlassMat = getClearShowcaseGlassMaterial();
  const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 });
  const coasterRailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.28, metalness: 0.45 });
  const coasterPillarMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.38, metalness: 0.25 });
  const coasterCarMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.28, metalness: 0.2 });

  // 1. BASE FOOTPRINT & INFRASTRUCTURE (18m x 18m Lot)
  const foundationGeo = new THREE.BoxGeometry(18.0, 0.18, 16.5);
  const foundation = new THREE.Mesh(foundationGeo, plazaMat);
  foundation.position.set(0, 0.09, -0.75);
  foundation.receiveShadow = true;
  park.add(foundation);

  // Decorative Pastel Plaza Cobblestone Star Medallion in Center Walkway
  const centerCircle = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.7 })
  );
  centerCircle.position.set(0, 0.19, 2.8);
  centerCircle.receiveShadow = true;
  park.add(centerCircle);

  // Unobstructed Sidewalk: Z in [+7.5, +9.0]
  const sidewalkGeo = new THREE.BoxGeometry(18.0, 0.18, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
  sidewalk.position.set(0, 0.09, 8.25);
  sidewalk.receiveShadow = true;
  park.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(18.0, 0.20, 0.15);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.10, 9.0);
  curb.receiveShadow = true;
  park.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(18.0, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 9.9);
    road.receiveShadow = true;
    park.add(road);

    for (let i = -8.0; i <= 8.0; i += 2.4) {
      const stripeGeo = new THREE.BoxGeometry(1.2, 0.025, 0.12);
      const stripe = new THREE.Mesh(stripeGeo, wheelRimMat);
      stripe.position.set(i, 0.02, 9.4);
      park.add(stripe);
    }
  }

  // 2. GIANT FERRIS WHEEL (detail1: *Kanransha* at X = +4.0m, Z = -1.5m)
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(4.0, 0.18, -1.5);

  const axleY = 11.8;
  const wheelRadius = 5.4;

  // Wooden Boarding Platform, Steps & Queue Safety Railings at Base of Ferris Wheel
  const boardingDeck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.36, 4.0), woodDeckMat);
  boardingDeck.position.set(0, 0.18, 0);
  boardingDeck.receiveShadow = true;
  wheelGroup.add(boardingDeck);

  [-2.15, 2.15].forEach((qx) => {
    const qRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.8), wheelRimMat);
    qRail.position.set(qx, 0.92, 0);
    wheelGroup.add(qRail);
    [-1.7, 0, 1.7].forEach((qz) => {
      const qPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 6), wheelRimMat);
      qPost.position.set(qx, 0.64, qz);
      wheelGroup.add(qPost);
    });
  });

  for (let st = 0; st < 3; st++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.28), woodDeckMat);
    step.position.set(0, 0.06 + st * 0.11, 2.12 - st * 0.18);
    wheelGroup.add(step);
  }

  // Sturdy A-Frame Structural Pylon Legs (Aligned cleanly via setFromUnitVectors) + Axle Pillow-Blocks
  const upVec = new THREE.Vector3(0, 1, 0);
  [
    [-1.8, -1.55],
    [+1.8, -1.55],
    [-1.8, +1.55],
    [+1.8, +1.55],
  ].forEach(([lx, lz]) => {
    const start = new THREE.Vector3(lx, 0.2, lz);
    const end = new THREE.Vector3(0, axleY, lz);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const legGeo = new THREE.CylinderGeometry(0.18, 0.32, len, 10);
    const leg = new THREE.Mesh(legGeo, wheelPylonMat);
    leg.position.addVectors(start, end).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(upVec, dir.normalize());
    leg.castShadow = true;
    wheelGroup.add(leg);
  });

  [-1.55, 1.55].forEach((lz) => {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.42), wheelPylonMat);
    pillow.position.set(0, axleY, lz);
    const crossTie = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.3, 8), wheelPylonMat);
    crossTie.rotation.z = Math.PI / 2;
    crossTie.position.set(0, 5.2, lz);
    wheelGroup.add(pillow, crossTie);
  });

  // Central Rotating Rotor Group (Name preserved for 60 FPS animation!)
  // Kept detached at (0, 0, 0) while batching so local vertices are not offset before positioning.
  const wheelRotorGroup = new THREE.Group();
  wheelRotorGroup.name = 'AmusementPark_WheelRotor';

  // Central Hub Axle & Glowing Star Medallions
  const hubGeo = new THREE.CylinderGeometry(0.68, 0.68, 3.4, 16);
  hubGeo.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, goldStarMat);
  wheelRotorGroup.add(hub);

  const hubGlowRing = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 3.55, 16), neonGoldGlowMat);
  hubGlowRing.rotateX(Math.PI / 2);
  wheelRotorGroup.add(hubGlowRing);

  // Twin Circular Rims + Concentric Neon LED Light Rings
  [-1.2, +1.2].forEach((rz) => {
    const rimGeo = new THREE.TorusGeometry(wheelRadius, 0.13, 10, 36);
    const rim = new THREE.Mesh(rimGeo, wheelRimMat);
    rim.position.set(0, 0, rz);
    wheelRotorGroup.add(rim);

    // Neon Pink Illuminated Outer Ring
    const neonOuterGeo = new THREE.TorusGeometry(wheelRadius * 0.82, 0.065, 8, 32);
    const neonOuter = new THREE.Mesh(neonOuterGeo, neonPinkGlowMat);
    neonOuter.position.set(0, 0, rz);
    wheelRotorGroup.add(neonOuter);

    // Neon Cyan Mid Ring
    const neonMidGeo = new THREE.TorusGeometry(wheelRadius * 0.67, 0.055, 8, 28);
    const neonMid = new THREE.Mesh(neonMidGeo, neonCyanGlowMat);
    neonMid.position.set(0, 0, rz);
    wheelRotorGroup.add(neonMid);

    // Neon Gold Illuminated Inner Ring
    const innerRimGeo = new THREE.TorusGeometry(wheelRadius * 0.52, 0.08, 8, 24);
    const innerRim = new THREE.Mesh(innerRimGeo, neonGoldGlowMat);
    innerRim.position.set(0, 0, rz);
    wheelRotorGroup.add(innerRim);
  });

  // Radial Spokes, Diagonal Truss Struts & 8 Glazed Passenger Gondola Cabins (Names Gondola_0..7 preserved!)
  const gondolaColors = [
    0xef4444, // Red
    0xf59e0b, // Amber
    0xfacc15, // Yellow
    0x22c55e, // Green
    0x06b6d4, // Cyan
    0x3b82f6, // Blue
    0x8b5cf6, // Violet
    0xec4899, // Pink
  ];
  // Opaque glossy sky-tinted glazing harmonized with wheelRimMat so each Gondola_i batches into 1 mesh
  const gondolaGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.25,
    metalness: 0.2,
  });
  const gondolaNames: string[] = [];

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const gx = Math.cos(angle) * wheelRadius;
    const gy = Math.sin(angle) * wheelRadius;

    [-1.18, 1.18].forEach((sz) => {
      const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, wheelRadius, 6);
      const spoke = new THREE.Mesh(spokeGeo, wheelRimMat);
      spoke.position.set(gx / 2, gy / 2, sz);
      spoke.rotation.z = angle - Math.PI / 2;
      wheelRotorGroup.add(spoke);
    });

    const crossBarGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.4, 8);
    crossBarGeo.rotateX(Math.PI / 2);
    const crossBar = new THREE.Mesh(crossBarGeo, wheelRimMat);
    crossBar.position.set(gx, gy, 0);
    wheelRotorGroup.add(crossBar);

    // Enclosed Glazed Gondola Cabin (Counter-rotates by name Gondola_0..7!)
    const gondolaName = `Gondola_${i}`;
    gondolaNames.push(gondolaName);
    const gondolaGroup = new THREE.Group();
    gondolaGroup.name = gondolaName;

    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.55, 6), wheelRimMat);
    hanger.position.set(0, 0.45, 0);
    gondolaGroup.add(hanger);

    const cabinMat = new THREE.MeshStandardMaterial({ color: gondolaColors[i], roughness: 0.25, metalness: 0.2 });
    const cabinLower = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.54, 1.26), cabinMat);
    cabinLower.position.set(0, -0.22, 0);

    const cabinStripe = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 1.28), wheelRimMat);
    cabinStripe.position.set(0, -0.02, 0);

    // Panoramic Wrap-Around Glass Windows on Gondola
    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.48, 1.18), gondolaGlassMat);
    cabinGlass.position.set(0, 0.22, 0);

    const capGeo = new THREE.CylinderGeometry(0.52, 0.52, 1.28, 12, 1, false, 0, Math.PI);
    capGeo.rotateZ(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, wheelRimMat);
    cap.position.set(0, 0.44, 0);

    gondolaGroup.add(cabinLower, cabinStripe, cabinGlass, cap);
    // Batch gondola while detached at identity (0, 0, 0) BEFORE placing on the wheel rim
    batchStaticMeshes(gondolaGroup, [], { ignoreShadowFlags: true, bakeVertexColors: true });
    gondolaGroup.position.set(gx, gy - 0.55, 0);
    wheelRotorGroup.add(gondolaGroup);
  }

  // Batch rigid Ferris wheel frame while detached at identity (0, 0, 0), preserving Gondola_0..7
  batchStaticMeshes(wheelRotorGroup, gondolaNames, { ignoreShadowFlags: true, bakeVertexColors: true });
  wheelRotorGroup.position.set(0, axleY, 0);
  wheelGroup.add(wheelRotorGroup);
  park.add(wheelGroup);

  // 3. ROLLER COASTER TRACK, CROSS-TIES, SPINE TUBE & TRAIN (detail2 at X = -4.5m, Z = -1.8m)
  const coasterGroup = new THREE.Group();
  coasterGroup.position.set(-4.5, 0.18, -1.8);

  const pillarPoints = [
    [-3.0, -5.0, 4.2],
    [-2.8, -2.0, 7.8],
    [-1.0, +1.0, 10.4],
    [+1.8, +3.5, 6.5],
    [+2.4, -0.5, 3.8],
  ];

  pillarPoints.forEach(([px, pz, ph]) => {
    const pillarGeo = new THREE.CylinderGeometry(0.13, 0.18, ph, 10);
    const pillar = new THREE.Mesh(pillarGeo, coasterPillarMat);
    pillar.position.set(px, ph / 2, pz);
    pillar.castShadow = true;
    const footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.16, 10), curbMat);
    footPad.position.set(px, 0.08, pz);
    coasterGroup.add(pillar, footPad);
  });

  // Banked Sweeping Coaster Rails + Spine Box + 28 Steel Cross-Tie Ribs
  const trackCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.0, 4.2, -5.0),
    new THREE.Vector3(-2.8, 7.8, -2.0),
    new THREE.Vector3(-1.0, 10.4, +1.0),
    new THREE.Vector3(+1.8, 6.5, +3.5),
    new THREE.Vector3(+2.4, 3.8, -0.5),
  ]);

  const railGeo = new THREE.TubeGeometry(trackCurve, 36, 0.09, 8, false);
  const leftRail = new THREE.Mesh(railGeo, coasterRailMat);
  leftRail.position.set(-0.26, 0, 0);
  const rightRail = new THREE.Mesh(railGeo, coasterRailMat);
  rightRail.position.set(+0.26, 0, 0);

  const spineGeo = new THREE.TubeGeometry(trackCurve, 36, 0.12, 8, false);
  const centerSpine = new THREE.Mesh(spineGeo, coasterPillarMat);
  centerSpine.position.set(0, -0.14, 0);
  coasterGroup.add(leftRail, rightRail, centerSpine);

  const zAxis = new THREE.Vector3(0, 0, 1);
  const numTies = 28;
  for (let t = 0; t <= numTies; t++) {
    const u = t / numTies;
    const pt = trackCurve.getPoint(u);
    const tangent = trackCurve.getTangent(u).normalize();
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.10), coasterPillarMat);
    tie.position.copy(pt);
    tie.quaternion.setFromUnitVectors(zAxis, tangent);
    coasterGroup.add(tie);
  }

  // Covered Boarding Station & Lift-Hill End Platform anchoring Track Ends
  [
    { x: -3.0, z: -5.0, h: 4.2 },
    { x: +2.4, z: -0.5, h: 3.8 },
  ].forEach((st) => {
    const stDeck = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 1.8), woodDeckMat);
    stDeck.position.set(st.x, st.h - 0.12, st.z);
    const stRoof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 2.0), castlePinkMat);
    stRoof.position.set(st.x, st.h + 1.35, st.z);
    [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, st.h + 1.35, 6), wheelRimMat);
      col.position.set(st.x + cx, (st.h + 1.35) / 2, st.z + cz);
      coasterGroup.add(col);
    });
    coasterGroup.add(stDeck, stRoof);
  });

  // Detailed 3-Car Coaster Train at the Top Crest with Bogies, Headrests & Safety Harnesses
  const trainPoint = trackCurve.getPoint(0.5);
  const trainTangent = trackCurve.getTangent(0.5);

  const trainGroup = new THREE.Group();
  trainGroup.position.copy(trainPoint);
  trainGroup.position.y += 0.25;
  trainGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), trainTangent);

  for (let c = -1; c <= 1; c++) {
    const carGeo = new THREE.BoxGeometry(0.74, 0.46, 0.86);
    const car = new THREE.Mesh(carGeo, c === 1 ? goldStarMat : coasterCarMat);
    car.position.set(0, 0, c * 0.96);
    car.castShadow = true;

    const bogie = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.54), asphaltMat);
    bogie.position.set(0, -0.25, c * 0.96);

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.26, 0.12), castlePurpleMat);
    headrest.position.set(0, 0.32, c * 0.96 - 0.22);

    const lapBar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.14), coasterRailMat);
    lapBar.position.set(0, 0.28, c * 0.96 + 0.12);
    trainGroup.add(car, bogie, headrest, lapBar);
  }
  const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.60, 10), goldStarMat);
  noseCone.rotation.x = Math.PI / 2;
  noseCone.position.set(0, 0, 1.68);
  trainGroup.add(noseCone);

  coasterGroup.add(trainGroup);
  park.add(coasterGroup);

  // 3.5. OPEN-LATTICE FREEFALL DROP TOWER RIDE (Rear-Center Plaza: X = -0.6m, Z = -6.2m, Height = 14.2m)
  const dropTowerGroup = new THREE.Group();
  dropTowerGroup.position.set(-0.6, 0.18, -6.2);

  const dtPad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.22, 16), curbMat);
  dtPad.position.y = 0.11;
  dropTowerGroup.add(dtPad);

  [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]].forEach(([mx, mz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 13.2, 8), castlePurpleMat);
    col.position.set(mx, 6.6, mz);
    col.castShadow = true;
    dropTowerGroup.add(col);
  });
  for (let ry = 1.6; ry <= 12.6; ry += 2.2) {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), wheelRimMat);
    ring.position.y = ry;
    dropTowerGroup.add(ring);
  }
  const dtCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.9, 12), goldStarMat);
  dtCrown.position.y = 13.5;
  const dtSpire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 8), neonPinkGlowMat);
  dtSpire.position.y = 14.5;

  // Multi-Seat Circular Drop Gondola with Yellow Shoulder Harnesses
  const dtCarriage = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.45, 16), coasterRailMat);
  dtCarriage.position.set(0, 7.8, 0);
  dtCarriage.castShadow = true;
  for (let s = 0; s < 6; s++) {
    const sa = (s / 6) * Math.PI * 2;
    const seatHarness = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.24), goldStarMat);
    seatHarness.position.set(Math.sin(sa) * 0.95, 8.15, Math.cos(sa) * 0.95);
    dropTowerGroup.add(seatHarness);
  }
  dropTowerGroup.add(dtCrown, dtSpire, dtCarriage);
  park.add(dropTowerGroup);

  // 4. FAIRYTALE ENTRANCE CASTLE GATE, CARNIVAL BOOTH & POPCORN/BALLOON STANDS (Z in [+6.0, +7.5])
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0.18, 6.7);

  // Twin Pink Castle Turret Towers with Crenellations & Arched Windows
  [-3.8, +3.8].forEach((tx) => {
    const turretGeo = new THREE.CylinderGeometry(0.75, 0.82, 5.0, 14);
    const turret = new THREE.Mesh(turretGeo, castlePinkMat);
    turret.position.set(tx, 2.5, 0);
    turret.castShadow = true;

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.82, 0.28, 14), wheelRimMat);
    collar.position.set(tx, 4.95, 0);

    const turretWin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.14), neonGoldGlowMat);
    turretWin.position.set(tx, 3.4, 0.72);

    const coneGeo = new THREE.ConeGeometry(0.98, 1.9, 14);
    const cone = new THREE.Mesh(coneGeo, castlePurpleMat);
    cone.position.set(tx, 5.95, 0);
    cone.castShadow = true;

    const starGeo = new THREE.OctahedronGeometry(0.22, 0);
    const star = new THREE.Mesh(starGeo, neonGoldGlowMat);
    star.position.set(tx, 7.05, 0);

    gateGroup.add(turret, collar, turretWin, cone, star);
  });

  const portalArchGeo = new THREE.BoxGeometry(6.8, 1.45, 0.46);
  const portalArch = new THREE.Mesh(portalArchGeo, castlePinkMat);
  portalArch.position.set(0, 4.8, 0);
  portalArch.castShadow = true;

  // Castle Gate Crenellations along Top of Arch
  for (let cx = -2.8; cx <= 2.8; cx += 0.8) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.50), wheelRimMat);
    merlon.position.set(cx, 5.68, 0);
    gateGroup.add(merlon);
  }

  // Entrance Ticket Turnstiles under the Castle Arch
  [-1.4, 0, 1.4].forEach((gx) => {
    const turnstile = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.65), wheelPylonMat);
    turnstile.position.set(gx, 0.45, 0);
    gateGroup.add(turnstile);
  });

  const bannerSignGeo = new THREE.PlaneGeometry(6.4, 1.2);
  const bannerTex = createAmusementParkBannerTexture();
  const bannerSignMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    emissive: 0xffffff,
    emissiveMap: bannerTex,
    emissiveIntensity: 0.48,
    roughness: 0.3,
  });
  const bannerSign = new THREE.Mesh(bannerSignGeo, bannerSignMat);
  bannerSign.position.set(0, 4.8, 0.24);

  gateGroup.add(portalArch, bannerSign);

  if (includeLandscaping) {
    // East Forecourt: Candy-Striped Balloon Cart with Spoked Wheels, Canopy Poles & Balloon Strings
    const cartGroup = new THREE.Group();
    cartGroup.position.set(5.6, 0, 0);

    const cartBox = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.85, 0.82), castlePinkMat);
    cartBox.position.set(0, 0.52, 0);
    const cartCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.95), goldStarMat);
    cartCanopy.position.set(0, 1.62, 0);
    [[-0.6, -0.38], [0.6, -0.38], [-0.6, 0.38], [0.6, 0.38]].forEach(([px, pz]) => {
      const cPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6), wheelRimMat);
      cPole.position.set(px, 1.26, pz);
      cartGroup.add(cPole);
    });
    [[-0.45, 0.42], [0.45, 0.42], [-0.45, -0.42], [0.45, -0.42]].forEach(([wx, wz]) => {
      const cWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), woodDeckMat);
      cWheel.rotation.x = Math.PI / 2;
      cWheel.position.set(wx, 0.18, wz);
      cartGroup.add(cWheel);
    });
    cartGroup.add(cartBox, cartCanopy);

    const balloonMats = [
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.25, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.25, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.25, metalness: 0.1 }),
    ];
    [
      [-0.25, 2.05, -0.1, 0],
      [+0.25, 2.25, +0.1, 1],
      [0.0, 2.45, 0.0, 2],
      [-0.15, 2.35, 0.22, 3],
      [+0.18, 2.55, -0.15, 4],
    ].forEach(([bx, by, bz, mIdx]) => {
      const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), balloonMats[mIdx]);
      balloon.position.set(bx, by, bz);
      const bString = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, by - 1.65, 4), wheelRimMat);
      bString.position.set(bx, (by + 1.65) / 2, bz);
      cartGroup.add(balloon, bString);
    });
    gateGroup.add(cartGroup);

    // West Forecourt: Pastel Popcorn & Crepe Kiosk Wagon with Clear Glass & Golden Popcorn Mound
    const popcornGroup = new THREE.Group();
    popcornGroup.position.set(-5.6, 0, 0);
    const popCounter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.92, 0.88), coasterRailMat);
    popCounter.position.y = 0.46;
    const popGlass = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.68, 0.78), clearGlassMat);
    popGlass.position.y = 1.24;
    const popMound = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), neonGoldGlowMat);
    popMound.scale.set(1.2, 0.75, 0.9);
    popMound.position.y = 1.05;
    const popRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.6, 10), goldStarMat);
    popRoof.position.y = 1.86;
    popcornGroup.add(popCounter, popGlass, popMound, popRoof);
    gateGroup.add(popcornGroup);

    // East Midway Carnival Game Booth (X = +5.2, Z = +3.5, H <= 3.1m, clear of detail1)
    const boothGroup = new THREE.Group();
    boothGroup.position.set(5.2, 0.18, 3.5);
    const bBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.3), castlePinkMat);
    bBase.position.y = 0.5;
    const bRoof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.85, 4), coasterRailMat);
    bRoof.rotation.y = Math.PI / 4;
    bRoof.position.y = 2.65;
    [[-0.8, -0.55], [0.8, -0.55], [-0.8, 0.55], [0.8, 0.55]].forEach(([px, pz]) => {
      const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.35, 6), wheelRimMat);
      bPost.position.set(px, 1.65, pz);
      boothGroup.add(bPost);
    });
    boothGroup.add(bBase, bRoof);
    park.add(boothGroup);
  }

  // 5. ROTATING CAROUSEL (Merry-Go-Round: X = -3.4m, Z = 3.6m, detail2 foreground, finial <= 4.8m)
  const carouselGroup = new THREE.Group();
  carouselGroup.position.set(-3.4, 0.18, 3.6);

  // Carousel Rotating Rotor (Name preserved for 60 FPS animation!)
  // Kept detached at (0, 0, 0) while batching, then attached to carouselGroup.
  const carouselRotor = new THREE.Group();
  carouselRotor.name = 'AmusementPark_CarouselRotor';

  const carouselCanopyMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3, metalness: 0.15 });
  const carouselCenterMat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.3, metalness: 0.15 });
  const carouselSaddleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.15 });

  const cDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.95, 0.26, 24), goldStarMat);
  cDeck.position.y = 0.13;
  carouselRotor.add(cDeck);

  const cRoof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 1.3, 18), carouselCanopyMat);
  cRoof.position.y = 2.48;
  const cLightRim = new THREE.Mesh(new THREE.CylinderGeometry(1.96, 1.96, 0.16, 18), neonGoldGlowMat);
  cLightRim.position.y = 1.86;
  carouselRotor.add(cRoof, cLightRim);

  const cStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), neonGoldGlowMat);
  cStar.position.y = 3.22;
  carouselRotor.add(cStar);

  const cCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 14), carouselCenterMat);
  cCenter.position.y = 1.1;
  carouselRotor.add(cCenter);

  // 6 Sculpted Carousel Horses (Body, Legs, Neck, Head, Mane, Tail & Saddle) on Brass Poles
  const horseMats = [
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.15 }),
  ];
  for (let h = 0; h < 6; h++) {
    const hAngle = (h * Math.PI * 2) / 6;
    const hx = Math.sin(hAngle) * 1.22;
    const hz = Math.cos(hAngle) * 1.22;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.2, 8), goldStarMat);
    pole.position.set(hx, 1.1, hz);

    const horse = new THREE.Group();
    horse.position.set(hx, 0.72 + (h % 2) * 0.22, hz);
    horse.rotation.y = hAngle + Math.PI / 2;

    const hMat = horseMats[h % horseMats.length];
    const hBody = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.24, 0.52), hMat);
    const hNeck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.15), hMat);
    hNeck.position.set(0, 0.20, 0.22);
    hNeck.rotation.x = 0.35;
    const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.24), hMat);
    hHead.position.set(0, 0.32, 0.32);
    const hTail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.06), goldStarMat);
    hTail.position.set(0, 0.02, -0.28);
    hTail.rotation.x = 0.4;
    [[-0.07, 0.18], [0.07, 0.18], [-0.07, -0.18], [0.07, -0.18]].forEach(([lx, lz]) => {
      const hLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.24, 6), hMat);
      hLeg.position.set(lx, -0.18, lz);
      hLeg.rotation.x = lz > 0 ? -0.3 : 0.3;
      horse.add(hLeg);
    });
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.08, 0.24), carouselSaddleMat);
    saddle.position.set(0, 0.13, 0);

    horse.add(hBody, hNeck, hHead, hTail, saddle);
    carouselRotor.add(pole, horse);
  }

  batchStaticMeshes(carouselRotor, [], { ignoreShadowFlags: true, bakeVertexColors: true });
  carouselGroup.add(carouselRotor);
  park.add(carouselGroup);
  park.add(gateGroup);

  if (scale !== 1.0) {
    park.scale.setScalar(scale);
  }

  return park;
}
