import * as THREE from 'three';
import { getBrickTileTexture, getArchitecturalBumpMap } from './wallTextures';

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
  texture.anisotropy = 8;
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
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.65,
  });
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

  for (let st = 0; st < 3; st++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.28), woodDeckMat);
    step.position.set(0, 0.06 + st * 0.11, 2.12 - st * 0.18);
    wheelGroup.add(step);
  }

  // Sturdy A-Frame Structural Pylon Legs + Horizontal Tie-Beams
  const legPositions = [
    [-1.8, axleY / 2, -1.6],
    [+1.8, axleY / 2, -1.6],
    [-1.8, axleY / 2, +1.6],
    [+1.8, axleY / 2, +1.6],
  ];
  legPositions.forEach(([lx, ly, lz]) => {
    const legGeo = new THREE.CylinderGeometry(0.18, 0.34, axleY + 0.5, 10);
    const leg = new THREE.Mesh(legGeo, wheelPylonMat);
    leg.position.set(lx, ly, lz);
    leg.lookAt(0, axleY, 0);
    leg.castShadow = true;
    wheelGroup.add(leg);
  });

  // Cross-bracing horizontal struts on A-frame pylons
  [-1.6, 1.6].forEach((lz) => {
    const crossTie = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.2, 8), wheelPylonMat);
    crossTie.rotation.z = Math.PI / 2;
    crossTie.position.set(0, 5.2, lz);
    wheelGroup.add(crossTie);
  });

  // Central Rotating Rotor Group (Name preserved for 60 FPS animation!)
  const wheelRotorGroup = new THREE.Group();
  wheelRotorGroup.name = 'AmusementPark_WheelRotor';
  wheelRotorGroup.position.set(0, axleY, 0);

  // Central Hub Axle & Glowing Star Medallions
  const hubGeo = new THREE.CylinderGeometry(0.68, 0.68, 3.4, 16);
  hubGeo.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, goldStarMat);
  hub.castShadow = true;
  wheelRotorGroup.add(hub);

  const hubGlowRing = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 3.55, 16), neonGoldGlowMat);
  hubGlowRing.rotateX(Math.PI / 2);
  wheelRotorGroup.add(hubGlowRing);

  // Twin Circular Rims + Concentric Neon LED Light Rings
  [-1.2, +1.2].forEach((rz) => {
    const rimGeo = new THREE.TorusGeometry(wheelRadius, 0.13, 10, 36);
    const rim = new THREE.Mesh(rimGeo, wheelRimMat);
    rim.position.set(0, 0, rz);
    rim.castShadow = true;
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
    const gondolaGroup = new THREE.Group();
    gondolaGroup.name = `Gondola_${i}`;
    gondolaGroup.position.set(gx, gy - 0.55, 0);

    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.55, 6), wheelRimMat);
    hanger.position.set(0, 0.45, 0);
    gondolaGroup.add(hanger);

    const cabinMat = new THREE.MeshStandardMaterial({ color: gondolaColors[i], roughness: 0.3, metalness: 0.15 });
    const cabinLower = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.54, 1.26), cabinMat);
    cabinLower.position.set(0, -0.22, 0);
    cabinLower.castShadow = true;

    const cabinStripe = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.08, 1.28), wheelRimMat);
    cabinStripe.position.set(0, -0.02, 0);

    // Panoramic Wrap-Around Glass Windows on Gondola
    const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.48, 1.18), glassMat);
    cabinGlass.position.set(0, 0.22, 0);

    const capGeo = new THREE.CylinderGeometry(0.52, 0.52, 1.28, 12, 1, false, 0, Math.PI);
    capGeo.rotateZ(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, wheelRimMat);
    cap.position.set(0, 0.44, 0);

    gondolaGroup.add(cabinLower, cabinStripe, cabinGlass, cap);
    wheelRotorGroup.add(gondolaGroup);
  }

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

  const numTies = 28;
  for (let t = 0; t <= numTies; t++) {
    const u = t / numTies;
    const pt = trackCurve.getPoint(u);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.06, 0.09), coasterPillarMat);
    tie.position.copy(pt);
    coasterGroup.add(tie);
  }

  // Detailed 3-Car Coaster Train at the Top Crest with Headrests & Safety Harnesses
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

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.26, 0.12), castlePurpleMat);
    headrest.position.set(0, 0.32, c * 0.96 - 0.22);

    const lapBar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.14), coasterRailMat);
    lapBar.position.set(0, 0.28, c * 0.96 + 0.12);
    trainGroup.add(car, headrest, lapBar);
  }
  const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.60, 10), goldStarMat);
  noseCone.rotation.x = Math.PI / 2;
  noseCone.position.set(0, 0, 1.68);
  trainGroup.add(noseCone);

  coasterGroup.add(trainGroup);
  park.add(coasterGroup);

  // 3.5. FREEFALL DROP TOWER RIDE (Rear-Center Plaza: X = -0.6m, Z = -6.2m, Height = 14.2m)
  const dropTowerGroup = new THREE.Group();
  dropTowerGroup.position.set(-0.6, 0.18, -6.2);

  const dtMast = new THREE.Mesh(new THREE.BoxGeometry(1.1, 13.2, 1.1), castlePurpleMat);
  dtMast.position.y = 6.6;
  dtMast.castShadow = true;
  const dtCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.8, 0.9, 12), goldStarMat);
  dtCrown.position.y = 13.5;
  const dtSpire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 8), neonPinkGlowMat);
  dtSpire.position.y = 14.5;

  // Drop Gondola Ring halfway up the tower
  const dtCarriage = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 1.7), coasterRailMat);
  dtCarriage.position.set(0, 7.8, 0.15);
  dtCarriage.castShadow = true;
  dropTowerGroup.add(dtMast, dtCrown, dtSpire, dtCarriage);
  park.add(dropTowerGroup);

  // 4. FAIRYTALE ENTRANCE CASTLE GATE & POPCORN/BALLOON STANDS (Z in [+6.0, +7.5])
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
    // East Forecourt: Candy-Striped Balloon Cart with Spoked Wheels
    const cartGroup = new THREE.Group();
    cartGroup.position.set(5.6, 0, 0);

    const cartBox = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.85, 0.82), castlePinkMat);
    cartBox.position.set(0, 0.45, 0);
    const cartCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.95), goldStarMat);
    cartCanopy.position.set(0, 1.55, 0);
    cartGroup.add(cartBox, cartCanopy);

    [
      [-0.25, 1.85, -0.1, 0xef4444],
      [+0.25, 2.05, +0.1, 0xfacc15],
      [0.0, 2.25, 0.0, 0x3b82f6],
      [-0.15, 2.15, 0.22, 0x22c55e],
      [+0.18, 2.35, -0.15, 0xec4899],
    ].forEach(([bx, by, bz, bcolor]) => {
      const balloon = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 12, 10),
        new THREE.MeshStandardMaterial({ color: bcolor, roughness: 0.25, metalness: 0.1 })
      );
      balloon.position.set(bx, by, bz);
      cartGroup.add(balloon);
    });
    gateGroup.add(cartGroup);

    // West Forecourt: Pastel Popcorn & Crepe Kiosk Wagon
    const popcornGroup = new THREE.Group();
    popcornGroup.position.set(-5.6, 0, 0);
    const popCounter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.92, 0.88), coasterRailMat);
    popCounter.position.y = 0.46;
    const popGlass = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.68, 0.78), glassMat);
    popGlass.position.y = 1.24;
    const popRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.6, 10), goldStarMat);
    popRoof.position.y = 1.86;
    popcornGroup.add(popCounter, popGlass, popRoof);
    gateGroup.add(popcornGroup);
  }

  // 5. ROTATING CAROUSEL (Merry-Go-Round: X = -3.4m, Z = 3.6m)
  const carouselGroup = new THREE.Group();
  carouselGroup.position.set(-3.4, 0.18, 3.6);

  // Carousel Rotating Rotor (Name preserved for 60 FPS animation!)
  const carouselRotor = new THREE.Group();
  carouselRotor.name = 'AmusementPark_CarouselRotor';

  const cDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.95, 0.26, 24), goldStarMat);
  cDeck.position.y = 0.13;
  carouselRotor.add(cDeck);

  const cRoof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 1.3, 18), castlePinkMat);
  cRoof.position.y = 2.48;
  const cLightRim = new THREE.Mesh(new THREE.CylinderGeometry(1.96, 1.96, 0.16, 18), neonGoldGlowMat);
  cLightRim.position.y = 1.86;
  carouselRotor.add(cRoof, cLightRim);

  const cStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), neonGoldGlowMat);
  cStar.position.y = 3.22;
  carouselRotor.add(cStar);

  const cCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 14), castlePurpleMat);
  cCenter.position.y = 1.1;
  carouselRotor.add(cCenter);

  // 4 Sculpted Carousel Horses (Body, Neck, Head, Mane & Saddle) on Brass Poles
  const horseColors = [0xffffff, 0xf472b6, 0x38bdf8, 0xfacc15];
  for (let h = 0; h < 4; h++) {
    const hAngle = (h * Math.PI) / 2;
    const hx = Math.sin(hAngle) * 1.2;
    const hz = Math.cos(hAngle) * 1.2;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.2, 8), goldStarMat);
    pole.position.set(hx, 1.1, hz);

    const horse = new THREE.Group();
    horse.position.set(hx, 0.72 + (h % 2) * 0.22, hz);
    horse.rotation.y = hAngle + Math.PI / 2;

    const hMat = new THREE.MeshStandardMaterial({ color: horseColors[h], roughness: 0.3 });
    const hBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.54), hMat);
    const hNeck = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.16), hMat);
    hNeck.position.set(0, 0.20, 0.22);
    hNeck.rotation.x = 0.35;
    const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.24), hMat);
    hHead.position.set(0, 0.32, 0.32);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.09, 0.24), coasterRailMat);
    saddle.position.set(0, 0.14, 0);

    horse.add(hBody, hNeck, hHead, saddle);
    carouselRotor.add(pole, horse);
  }

  carouselGroup.add(carouselRotor);
  park.add(carouselGroup);
  park.add(gateGroup);

  if (scale !== 1.0) {
    park.scale.setScalar(scale);
  }

  return park;
}
