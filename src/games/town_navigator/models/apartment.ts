import * as THREE from 'three';
import {
  getHorizontalSidingTexture,
  getConcretePanelTexture,
  getBrickTileTexture,
  buildPerimeterRailing,
} from './wallTextures';
import { HOUSE_PALETTES, HousePalette } from './house';

export type ApartmentVariant =
  | 'EXTERIOR_CORRIDOR_APATO'
  | 'MEZONETTO_TOWNHOUSE'
  | 'DESIGNER_GLASS_LOFT'
  | 'BRICK_TERRACE_MANSHON';

export const APARTMENT_VARIANTS: ApartmentVariant[] = [
  'EXTERIOR_CORRIDOR_APATO',
  'MEZONETTO_TOWNHOUSE',
  'DESIGNER_GLASS_LOFT',
  'BRICK_TERRACE_MANSHON',
];

export interface ApartmentDNA {
  palette: string;
  variant: ApartmentVariant;
  mirrorX: boolean;
  carColor: number;
}

/**
 * Maps each of the 12 house palettes to a default Apartment archetype so clicking
 * through the 12 palette swatches in TownModelInspector previews all 4 apartment shells!
 */
const PALETTE_TO_APARTMENT_VARIANT: Record<string, ApartmentVariant> = {
  modern_slate: 'EXTERIOR_CORRIDOR_APATO',
  coastal_blue: 'EXTERIOR_CORRIDOR_APATO',
  sakura_blush: 'EXTERIOR_CORRIDOR_APATO',

  terracotta_cream: 'MEZONETTO_TOWNHOUSE',
  matcha_sage: 'MEZONETTO_TOWNHOUSE',
  nordic_white: 'MEZONETTO_TOWNHOUSE',

  charcoal_cedar: 'DESIGNER_GLASS_LOFT',
  coastal_navy: 'DESIGNER_GLASS_LOFT',
  olive_timber: 'DESIGNER_GLASS_LOFT',

  autumn_chestnut: 'BRICK_TERRACE_MANSHON',
  kyoto_machiya: 'BRICK_TERRACE_MANSHON',
  sand_stucco: 'BRICK_TERRACE_MANSHON',
};

const CAR_COLORS = [0x38bdf8, 0xfef08a, 0xf472b6, 0xa7f3d0];

/**
 * Generates a shuffled, non-repeating deck of `ApartmentDNA` cards so every apartment block
 * in a town has a 100% unique architectural shell AND a unique color palette.
 */
export function generateTownApartmentDeck(rng: () => number): ApartmentDNA[] {
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const variants = shuffle(APARTMENT_VARIANTS);
  const palettes = shuffle(Object.keys(HOUSE_PALETTES));
  const cars = shuffle(CAR_COLORS);

  return variants.map((variant, idx) => ({
    variant,
    palette: palettes[idx % palettes.length],
    mirrorX: rng() > 0.5,
    carColor: cars[idx % cars.length],
  }));
}

export interface ApartmentOptions {
  palette?: string | HousePalette;
  variant?: ApartmentVariant;
  mirrorX?: boolean;
  dna?: ApartmentDNA;
  includeRoad?: boolean;
  scale?: number;
}

/**
 * Helper to build a covered resident bicycle shelter (*Chūrinjō*)
 */
function buildBikeShelter(metalMat: THREE.Material, frameMat: THREE.Material): THREE.Group {
  const bikeShelterGroup = new THREE.Group();

  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), metalMat);
  post1.position.set(-0.8, 0.9, -0.55);
  const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), metalMat);
  post2.position.set(0.8, 0.9, -0.55);
  const bRoof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 1.45), metalMat);
  bRoof.position.set(0, 1.82, 0);
  bRoof.rotation.x = -0.1;
  bikeShelterGroup.add(post1, post2, bRoof);

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const wheelGeo = new THREE.TorusGeometry(0.19, 0.02, 8, 14);
  wheelGeo.rotateY(Math.PI / 2);

  [-0.45, 0.0, 0.45].forEach((bx) => {
    const wf = new THREE.Mesh(wheelGeo, tireMat);
    wf.position.set(bx, 0.21, 0.32);
    const wr = new THREE.Mesh(wheelGeo, tireMat);
    wr.position.set(bx, 0.21, -0.32);
    const bikeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.68), frameMat);
    bikeFrame.position.set(bx, 0.38, 0);
    bikeShelterGroup.add(wf, wr, bikeFrame);
  });

  return bikeShelterGroup;
}

/**
 * Helper to build a compact parked Japanese Kei Car for resident parking bays
 */
function buildResidentKeiCar(bodyColor: number, glassMat: THREE.Material): THREE.Group {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.15 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const yellowPlateMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.36, 0.74), bodyMat);
  lower.position.y = 0.28;
  lower.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.38, 0.70), bodyMat);
  cabin.position.set(-0.08, 0.64, 0);
  cabin.castShadow = true;
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.05, 0.72), whiteMat);
  roofCap.position.set(-0.08, 0.84, 0);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.28, 0.72), glassMat);
  glass.position.set(-0.05, 0.64, 0);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.18), yellowPlateMat);
  plate.position.set(0.73, 0.21, 0);
  car.add(lower, cabin, roofCap, glass, plate);

  const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
  wheelGeo.rotateX(Math.PI / 2);
  [
    [-0.45, 0.14, -0.36],
    [0.45, 0.14, -0.36],
    [-0.45, 0.14, 0.36],
    [0.45, 0.14, 0.36],
  ].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, wy, wz);
    car.add(w);
  });

  return car;
}

/**
 * Builds an authentic 6.0m × 12.0m (1U × 2U) Japanese Low-Rise Residential Apartment Block
 * in 4 distinct architectural archetypes.
 */
export function buildApartmentMesh(options: ApartmentOptions = {}): THREE.Group {
  const dna = options.dna;
  const paletteOpt = dna?.palette ?? options.palette ?? 'modern_slate';
  const includeRoad = options.includeRoad ?? false;
  const scale = options.scale ?? 1.0;

  const pal: HousePalette = typeof paletteOpt === 'string'
    ? (HOUSE_PALETTES[paletteOpt] || HOUSE_PALETTES.modern_slate)
    : paletteOpt;

  const activeVariant: ApartmentVariant =
    dna?.variant ??
    options.variant ??
    PALETTE_TO_APARTMENT_VARIANT[pal.id] ??
    'EXTERIOR_CORRIDOR_APATO';

  const mirrorX: boolean = dna?.mirrorX ?? options.mirrorX ?? false;
  const carColor: number = dna?.carColor ?? 0x38bdf8;

  const group = new THREE.Group();
  group.name = `Apartment_Block_${pal.id}_${activeVariant}`;

  const lotW = 6.0;
  const lotD = 12.0;

  // Materials
  const sidingMat = new THREE.MeshStandardMaterial({
    color: pal.wallMain,
    map: getHorizontalSidingTexture(),
    roughness: 0.75,
  });

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: getConcretePanelTexture(),
    roughness: 0.78,
  });

  const brickTileMat = new THREE.MeshStandardMaterial({
    color: pal.wallMain,
    map: getBrickTileTexture(),
    roughness: 0.65,
  });

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde6,
    roughness: 0.85,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: pal.trim,
    roughness: 0.6,
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: pal.roofTile,
    roughness: 0.6,
  });

  const metalStairMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.6,
    roughness: 0.4,
  });

  const doorMat = new THREE.MeshStandardMaterial({
    color: pal.door,
    roughness: 0.45,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });

  const acUnitMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.6,
  });

  // 1. LOT GROUND BASE (6m × 12m)
  const groundGeo = new THREE.BoxGeometry(lotW, 0.15, lotD);
  const ground = new THREE.Mesh(groundGeo, foundationMat);
  ground.position.set(0, 0.075, 0);
  ground.receiveShadow = true;
  group.add(ground);

  if (includeRoad) {
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(lotW, 0.02, 1.8), asphaltMat);
    road.position.set(0, 0.01, lotD / 2 + 0.9);
    group.add(road);
  }

  // Mirrored container for left/right architectural variation
  const coreContainer = new THREE.Group();
  if (mirrorX) {
    coreContainer.scale.x = -1;
  }
  group.add(coreContainer);

  // =========================================================================
  // ARCHETYPE 2: MEZONETTO_TOWNHOUSE (3-Unit Gable Duplex Row + Kei Car)
  // =========================================================================
  if (activeVariant === 'MEZONETTO_TOWNHOUSE') {
    const unitDepth = 3.0;
    const unitWidth = 4.1;
    const eavesH = 4.35;
    const peakH = 1.25;
    const unitZCenters = [-3.4, -0.3, 2.8];

    const cedarLouverMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
    const lawnStripMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9 });

    // East Backyard Green Lawn Strip
    const backLawn = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 9.6), lawnStripMat);
    backLawn.position.set(2.15, 0.16, -0.3);
    backLawn.receiveShadow = true;
    coreContainer.add(backLawn);

    unitZCenters.forEach((uz, idx) => {
      const uGroup = new THREE.Group();
      uGroup.position.set(0.35, 0.15, uz);

      // 2-Story Townhouse Unit Body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(unitWidth, eavesH, unitDepth - 0.06),
        idx % 2 === 0 ? sidingMat : brickTileMat
      );
      body.position.y = eavesH / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      uGroup.add(body);

      // Individual Pitched Gable Roof running East-West
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-unitDepth / 2, 0);
      gableShape.lineTo(0, peakH);
      gableShape.lineTo(unitDepth / 2, 0);
      gableShape.closePath();

      const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: unitWidth, bevelEnabled: false });
      gableGeo.rotateY(Math.PI / 2);
      gableGeo.translate(-unitWidth / 2, eavesH, 0);
      const gableWall = new THREE.Mesh(gableGeo, idx % 2 === 0 ? sidingMat : brickTileMat);
      uGroup.add(gableWall);

      const slopeLen = Math.hypot(unitDepth / 2 + 0.2, peakH);
      const slopeAngle = Math.atan2(peakH, unitDepth / 2);
      const slopeGeo = new THREE.BoxGeometry(unitWidth + 0.35, 0.1, slopeLen);

      const nSlope = new THREE.Mesh(slopeGeo, roofMat);
      nSlope.position.set(0, eavesH + peakH / 2 + 0.03, -unitDepth / 4);
      nSlope.rotation.x = -slopeAngle;
      nSlope.castShadow = true;

      const sSlope = new THREE.Mesh(slopeGeo, roofMat);
      sSlope.position.set(0, eavesH + peakH / 2 + 0.03, unitDepth / 4);
      sSlope.rotation.x = slopeAngle;
      sSlope.castShadow = true;
      uGroup.add(nSlope, sSlope);

      // West Front Facade (-X): Genkan Stoop, Canopy, Cedar Louvers & 2F Juliet Balcony
      const stoop = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 1.1), concreteMat);
      stoop.position.set(-unitWidth / 2 - 0.32, 0.06, 0.65);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 1.25), roofMat);
      canopy.position.set(-unitWidth / 2 - 0.35, 2.25, 0.65);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.85), doorMat);
      door.position.set(-unitWidth / 2 - 0.02, 1.06, 0.65);
      uGroup.add(stoop, canopy, door);

      // Cedar Privacy Louver Screen beside porch
      for (let l = 0; l < 4; l++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.15, 0.04), cedarLouverMat);
        fin.position.set(-unitWidth / 2 - 0.62, 1.12, 0.12 + l * 0.14);
        uGroup.add(fin);
      }

      // Red-capped Gatepost (*Kinō-Monchū*)
      const monchu = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.22), concreteMat);
      monchu.position.set(-unitWidth / 2 - 0.72, 0.525, 1.2);
      const postCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.24),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
      );
      postCap.position.set(-unitWidth / 2 - 0.72, 0.92, 1.2);
      uGroup.add(monchu, postCap);

      // 1F Living Window & 2F Juliet Balcony Window
      const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 1.2), glassMat);
      win1.position.set(-unitWidth / 2 - 0.02, 1.3, -0.65);
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.35, 1.6), glassMat);
      win2.position.set(-unitWidth / 2 - 0.02, 3.35, 0);
      const juliet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 1.75), cedarLouverMat);
      juliet.position.set(-unitWidth / 2 - 0.18, 2.95, 0);
      uGroup.add(win1, win2, juliet);

      // East Backyard (+X): Wooden Partition Fence, Patio Glass & AC Compressor
      const fence = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.06), cedarLouverMat);
      fence.position.set(unitWidth / 2 + 0.55, 0.55, unitDepth / 2);
      const patio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.85, 1.5), glassMat);
      patio.position.set(unitWidth / 2 + 0.02, 1.0, 0);
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.62), acUnitMat);
      ac.position.set(unitWidth / 2 + 0.25, 0.24, -0.95);
      uGroup.add(fence, patio, ac);

      coreContainer.add(uGroup);
    });

    // South Parking Apron with Parked Resident Kei Car (Z = +4.95m)
    const car = buildResidentKeiCar(carColor, glassMat);
    car.position.set(0.2, 0.15, 4.95);
    coreContainer.add(car);
  }

  // =========================================================================
  // ARCHETYPE 3: DESIGNER_GLASS_LOFT (Exposed Concrete + Glowing Glass Stairwell)
  // =========================================================================
  else if (activeVariant === 'DESIGNER_GLASS_LOFT') {
    const bW = 4.3;
    const bD = 10.2;
    const bH = 5.25;
    const bx = 0.45;
    const cedarMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.55 });

    // Main Architectural Concrete Body
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), concreteMat);
    mainBody.position.set(bx, 0.15 + bH / 2, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    coreContainer.add(mainBody);

    // Matte-Black Parapet Crown & Rooftop Solar Panels
    const crown = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.24, 0.24, bD + 0.24), metalStairMat);
    crown.position.set(bx, 0.15 + bH + 0.12, 0);
    coreContainer.add(crown);

    const roofRail = buildPerimeterRailing(bW, bD, 0.48, metalStairMat, 1.8);
    roofRail.position.set(bx, 0.15 + bH + 0.24, 0);
    coreContainer.add(roofRail);

    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.75, roughness: 0.2 });
    [-3.2, 0.0, 3.2].forEach((sz) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 2.3), solarMat);
      panel.position.set(bx, 0.15 + bH + 0.35, sz);
      panel.rotation.z = -0.12;
      coreContainer.add(panel);
    });

    // Central Projecting 2-Story Glass Stairwell Atrium Tower (West Front: X = -2.0m, Z = 0)
    const atriumFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, bH + 0.35, 2.3), metalStairMat);
    atriumFrame.position.set(bx - bW / 2 - 0.45, 0.15 + (bH + 0.35) / 2, 0);
    atriumFrame.castShadow = true;
    const atriumGlass = new THREE.Mesh(new THREE.BoxGeometry(1.14, bH - 0.3, 2.0), glassMat);
    atriumGlass.position.set(bx - bW / 2 - 0.46, 0.15 + bH / 2 + 0.1, 0);
    const atriumCoreGlow = new THREE.Mesh(new THREE.BoxGeometry(0.6, bH - 0.6, 1.4), warmGlowMat);
    atriumCoreGlow.position.set(bx - bW / 2 - 0.35, 0.15 + bH / 2, 0);
    coreContainer.add(atriumFrame, atriumGlass, atriumCoreGlow);

    // Cedar Soffit Lobby Canopy & Automatic Glass Entrance
    const lobbyCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 2.6), cedarMat);
    lobbyCanopy.position.set(bx - bW / 2 - 0.65, 2.45, 0);
    coreContainer.add(lobbyCanopy);

    // Checkerboard Cantilevered Box Balconies on North & South Wings (West & East faces)
    [-3.3, 3.3].forEach((wz) => {
      [0.15, 2.75].forEach((wy, fIdx) => {
        // West Cantilevered Box Balcony
        const boxFrame = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 1.15, 2.6),
          fIdx === 1 ? sidingMat : concreteMat
        );
        boxFrame.position.set(bx - bW / 2 - 0.42, wy + 0.58, wz);
        boxFrame.castShadow = true;
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.95, 2.1), glassMat);
        win.position.set(bx - bW / 2 - 0.02, wy + 1.1, wz);
        coreContainer.add(boxFrame, win);

        // East Rear Balcony + Cedar Louvers + AC Unit
        const eastSlab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 2.6), concreteMat);
        eastSlab.position.set(bx + bW / 2 + 0.42, wy + 0.07, wz);
        const eastGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 2.5), glassMat);
        eastGlass.position.set(bx + bW / 2 + 0.80, wy + 0.55, wz);
        const eastPatio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.95, 1.9), glassMat);
        eastPatio.position.set(bx + bW / 2 + 0.02, wy + 1.1, wz);
        const ac = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.60), acUnitMat);
        ac.position.set(bx + bW / 2 + 0.35, wy + 0.36, wz - 0.85);
        coreContainer.add(eastSlab, eastGlass, eastPatio, ac);
      });
    });

    // Ornamental Bamboo Planter Troughs flanking the Lobby
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.45 });
    [-1.65, 1.65].forEach((pz) => {
      const trough = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.85), metalStairMat);
      trough.position.set(-2.15, 0.33, pz);
      coreContainer.add(trough);
      [-0.2, 0, 0.2].forEach((bz, i) => {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.8 + i * 0.2, 6), bambooMat);
        stalk.position.set(-2.15, 1.2, pz + bz);
        coreContainer.add(stalk);
      });
    });

    // Covered Cycle Port at North End
    const cyclePort = buildBikeShelter(metalStairMat, trimMat);
    cyclePort.position.set(-0.8, 0.15, -4.8);
    coreContainer.add(cyclePort);
  }

  // =========================================================================
  // ARCHETYPE 4: BRICK_TERRACE_MANSHON (Tiled Manshon + Hipped Roof + Lobby Portico)
  // =========================================================================
  else if (activeVariant === 'BRICK_TERRACE_MANSHON') {
    const bW = 4.3;
    const bD = 10.2;
    const bH = 4.65;
    const bx = 0.45;

    // Running-Bond Ceramic Tile Main Building
    const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), brickTileMat);
    body.position.set(bx, 0.15 + bH / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    coreContainer.add(body);

    // Crisp White Stone Belt-Course Moldings (Mid-floor & Cornice)
    [2.55, bH + 0.12].forEach((my) => {
      const belt = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.22, 0.20, bD + 0.22), trimMat);
      belt.position.set(bx, my, 0);
      coreContainer.add(belt);
    });

    // 4-Sloped Hipped Roof (*Yosemune-yane*)
    const hipGeo = new THREE.CylinderGeometry(1.8 * Math.SQRT1_2, (bW + 0.5) * Math.SQRT1_2, 1.15, 4);
    hipGeo.rotateY(Math.PI / 4);
    const hipRoof = new THREE.Mesh(hipGeo, roofMat);
    hipRoof.scale.set(1.0, 1.0, (bD + 0.5) / (bW + 0.5));
    hipRoof.position.set(bx, 0.15 + bH + 0.68, 0);
    hipRoof.castShadow = true;
    coreContainer.add(hipRoof);

    // Grand Central Columned Entrance Portico (West Front: Z = 0)
    const porticoCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 2.6), trimMat);
    porticoCanopy.position.set(bx - bW / 2 - 0.55, 2.55, 0);
    porticoCanopy.castShadow = true;
    coreContainer.add(porticoCanopy);

    [-1.05, 1.05].forEach((cz) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.35, 12), trimMat);
      col.position.set(bx - bW / 2 - 0.95, 1.32, cz);
      col.castShadow = true;
      coreContainer.add(col);
    });

    // Double Glass Automatic Lobby Doors + Parcel Lockers (*Takuhai-Bokkusu*)
    const lobbyDoor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 1.6), glassMat);
    lobbyDoor.position.set(bx - bW / 2 - 0.02, 1.22, 0);
    const lockerBank = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.55, 0.75), acUnitMat);
    lockerBank.position.set(bx - bW / 2 - 0.22, 0.92, 1.55);
    coreContainer.add(lobbyDoor, lockerBank);

    // 2nd Floor Continuous Balcony Loggia with Open Wrought-Iron Railing
    const loggiaSlab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, bD - 0.4), trimMat);
    loggiaSlab.position.set(bx - bW / 2 - 0.42, 2.62, 0);
    const loggiaRail = buildPerimeterRailing(0.82, bD - 0.45, 0.85, metalStairMat, 1.5);
    loggiaRail.position.set(bx - bW / 2 - 0.42, 2.69, 0);
    coreContainer.add(loggiaSlab, loggiaRail);

    // Symmetrical Windows & East Balconies
    [-3.4, 0.0, 3.4].forEach((wz) => {
      // 2F West Windows
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.65, 1.8), glassMat);
      w2.position.set(bx - bW / 2 - 0.02, 3.55, wz);
      coreContainer.add(w2);

      if (wz !== 0.0) {
        // 1F West Windows + Hydrangea Planter Box
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.35, 1.7), glassMat);
        w1.position.set(bx - bW / 2 - 0.02, 1.4, wz);
        const planter = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.32, 1.8), brickTileMat);
        planter.position.set(bx - bW / 2 - 0.35, 0.31, wz);
        const bush = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.28, 1.65),
          new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 })
        );
        bush.position.set(bx - bW / 2 - 0.35, 0.55, wz);
        coreContainer.add(w1, planter, bush);
      }

      // East Rear Balconies (1F & 2F)
      [0.15, 2.55].forEach((ey) => {
        const bSlab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 2.5), concreteMat);
        bSlab.position.set(bx + bW / 2 + 0.42, ey + 0.07, wz);
        const bRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.88, 2.5), trimMat);
        bRail.position.set(bx + bW / 2 + 0.80, ey + 0.51, wz);
        const patio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.85, 1.6), glassMat);
        patio.position.set(bx + bW / 2 + 0.02, ey + 1.05, wz);
        const ac = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.60), acUnitMat);
        ac.position.set(bx + bW / 2 + 0.32, ey + 0.36, wz - 0.8);
        coreContainer.add(bSlab, bRail, patio, ac);
      });
    });

    // Warm Glowing Garden Bollard Lamps Flanking Portico
    [-1.45, 1.45].forEach((lz) => {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.65, 8), metalStairMat);
      bollard.position.set(-2.35, 0.48, lz);
      const topGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.18, 8), warmGlowMat);
      topGlow.position.set(-2.35, 0.88, lz);
      coreContainer.add(bollard, topGlow);
    });
  }

  // =========================================================================
  // ARCHETYPE 1 (DEFAULT): EXTERIOR_CORRIDOR_APATO (Open Steel Staircase & 2F Walkway)
  // =========================================================================
  else {
    const bW = 4.2;
    const bD = 10.4;
    const bH = 5.2;
    const buildingX = 0.55;

    const baseBand = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 0.25, bD + 0.1), foundationMat);
    baseBand.position.set(buildingX, 0.125 + 0.15, 0);
    baseBand.receiveShadow = true;
    coreContainer.add(baseBand);

    const bodyGeo = new THREE.BoxGeometry(bW, bH - 0.25, bD);
    const body = new THREE.Mesh(bodyGeo, sidingMat);
    body.position.set(buildingX, (bH + 0.25) / 2 + 0.15, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    coreContainer.add(body);

    const roofCapGeo = new THREE.BoxGeometry(bW + 0.3, 0.2, bD + 0.3);
    const roofCap = new THREE.Mesh(roofCapGeo, roofMat);
    roofCap.position.set(buildingX, bH + 0.15 + 0.1, 0);
    roofCap.castShadow = true;
    coreContainer.add(roofCap);

    // Open Steel Perimeter Safety Railing + 3 Rooftop Solar Panels
    const roofRailing = buildPerimeterRailing(bW, bD, 0.52, metalStairMat, 1.8);
    roofRailing.position.set(buildingX, bH + 0.35, 0);
    coreContainer.add(roofRailing);

    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.2 });
    [-3.0, 0.0, 3.0].forEach((sz) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 2.2), solarMat);
      panel.position.set(buildingX, bH + 0.48, sz);
      panel.rotation.z = -0.1;
      coreContainer.add(panel);
    });

    const floorBandGeo = new THREE.BoxGeometry(bW + 0.12, 0.18, bD + 0.12);
    const floorBand = new THREE.Mesh(floorBandGeo, trimMat);
    floorBand.position.set(buildingX, 2.75, 0);
    coreContainer.add(floorBand);

    // Front Access Walkway & Exterior Staircase
    const walkwayX = -1.75;
    const walkwayW = 1.1;

    const deckGeo = new THREE.BoxGeometry(walkwayW, 0.15, bD);
    const deck = new THREE.Mesh(deckGeo, concreteMat);
    deck.position.set(walkwayX, 2.7, 0);
    deck.receiveShadow = true;
    coreContainer.add(deck);

    const railingGeo = new THREE.BoxGeometry(0.04, 0.9, bD);
    const railing = new THREE.Mesh(railingGeo, metalStairMat);
    railing.position.set(walkwayX - walkwayW / 2 + 0.02, 2.7 + 0.5, 0);
    coreContainer.add(railing);

    [-4.2, 0.0, 3.2].forEach((pz) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), metalStairMat);
      col.position.set(walkwayX - walkwayW / 2 + 0.08, 1.45, pz);
      col.castShadow = true;
      coreContainer.add(col);
    });

    const groundDeck = new THREE.Mesh(new THREE.BoxGeometry(walkwayW, 0.12, bD), concreteMat);
    groundDeck.position.set(walkwayX, 0.15 + 0.06, 0);
    groundDeck.receiveShadow = true;
    coreContainer.add(groundDeck);

    const stairGroup = new THREE.Group();
    stairGroup.position.set(walkwayX, 0.15, 4.4);

    const numSteps = 10;
    const stepH = 2.55 / numSteps;
    const stepD = 1.0 / numSteps;
    for (let s = 0; s < numSteps; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(walkwayW, 0.04, 0.28), metalStairMat);
      step.position.set(0, (s + 1) * stepH, -(s * stepD));
      step.castShadow = true;
      stairGroup.add(step);
    }

    const stringerL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 1.8), metalStairMat);
    stringerL.position.set(-walkwayW / 2 + 0.02, 1.3, -0.45);
    stringerL.rotation.x = -Math.atan2(2.55, 1.0);
    stairGroup.add(stringerL);

    const stringerR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 1.8), metalStairMat);
    stringerR.position.set(walkwayW / 2 - 0.02, 1.3, -0.45);
    stringerR.rotation.x = -Math.atan2(2.55, 1.0);
    stairGroup.add(stringerR);

    coreContainer.add(stairGroup);

    // 6 Unit Doors, Frosted Entry Lamps & Wall Gas Meters
    const doorZOffsets = [-3.2, 0.0, 3.2];

    [
      { floor: 1, yBase: 0.15 },
      { floor: 2, yBase: 2.7 },
    ].forEach(({ yBase }) => {
      doorZOffsets.forEach((dz) => {
        const doorDoorW = 0.85;
        const doorDoorH = 2.0;

        const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, doorDoorH, doorDoorW), doorMat);
        door.position.set(buildingX - bW / 2 + 0.03, yBase + doorDoorH / 2, dz);
        door.castShadow = true;
        coreContainer.add(door);

        const dFrame = new THREE.Mesh(new THREE.BoxGeometry(0.09, doorDoorH + 0.1, doorDoorW + 0.1), trimMat);
        dFrame.position.set(buildingX - bW / 2 + 0.04, yBase + (doorDoorH + 0.1) / 2, dz);
        coreContainer.add(dFrame);

        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.14), warmGlowMat);
        lamp.position.set(buildingX - bW / 2 - 0.04, yBase + doorDoorH + 0.16, dz);
        coreContainer.add(lamp);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.03), metalStairMat);
        handle.position.set(buildingX - bW / 2 - 0.02, yBase + 1.0, dz + 0.3);
        coreContainer.add(handle);

        const gasMeter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.22), acUnitMat);
        gasMeter.position.set(buildingX - bW / 2 - 0.06, yBase + 1.35, dz - 0.72);
        const gasPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 6), metalStairMat);
        gasPipe.position.set(buildingX - bW / 2 - 0.04, yBase + 0.65, dz - 0.72);
        coreContainer.add(gasMeter, gasPipe);
      });
    });

    // Private Rear Balconies with Sliding Patio Glass, AC Units & Laundry Poles
    const balconyX = buildingX + bW / 2 + 0.45;
    const balconyW = 0.9;
    const balconyD = 2.6;

    [
      { floor: 1, yBase: 0.15 },
      { floor: 2, yBase: 2.7 },
    ].forEach(({ yBase }) => {
      doorZOffsets.forEach((dz) => {
        const bSlab = new THREE.Mesh(new THREE.BoxGeometry(balconyW, 0.14, balconyD), concreteMat);
        bSlab.position.set(balconyX, yBase + 0.07, dz);
        bSlab.receiveShadow = true;
        coreContainer.add(bSlab);

        const bRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, balconyD), trimMat);
        bRail.position.set(balconyX + balconyW / 2 - 0.04, yBase + 0.53, dz);
        coreContainer.add(bRail);

        const patioGeo = new THREE.BoxGeometry(0.04, 1.9, 1.6);
        const patio = new THREE.Mesh(patioGeo, glassMat);
        patio.position.set(buildingX + bW / 2 - 0.02, yBase + 1.05, dz);
        coreContainer.add(patio);

        const acGeo = new THREE.BoxGeometry(0.35, 0.48, 0.65);
        const acUnit = new THREE.Mesh(acGeo, acUnitMat);
        acUnit.position.set(balconyX + 0.1, yBase + 0.38, dz - 0.85);
        acUnit.castShadow = true;
        coreContainer.add(acUnit);

        const laundryPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6), metalStairMat);
        laundryPole.rotation.x = Math.PI / 2;
        laundryPole.position.set(balconyX + 0.2, yBase + 1.55, dz);
        coreContainer.add(laundryPole);
      });
    });

    // Covered Bicycle Parking Shelter & Garbage Collection Net Station
    const bikeShelterGroup = buildBikeShelter(metalStairMat, trimMat);
    bikeShelterGroup.position.set(1.5, 0.15, -4.6);
    coreContainer.add(bikeShelterGroup);

    const trashBoxGeo = new THREE.BoxGeometry(0.85, 0.65, 0.75);
    const trashBoxMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const trashBox = new THREE.Mesh(trashBoxGeo, trashBoxMat);
    trashBox.position.set(-2.0, 0.15 + 0.325, -4.8);
    trashBox.castShadow = true;
    coreContainer.add(trashBox);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
