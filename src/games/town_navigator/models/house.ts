import * as THREE from 'three';
import {
  getHorizontalSidingTexture,
  getBrickTileTexture,
  getStuccoWallTexture,
  getKawaraTileTexture,
  buildJapaneseIrimoyaRoof,
} from './wallTextures';

export type HouseVariant =
  | 'CLASSIC_GABLE'
  | 'MODERN_CUBIC'
  | 'TRADITIONAL_MACHIYA'
  | 'NORDIC_CHALET'
  | 'SPLIT_SHED_ROOF'
  | 'BAY_WINDOW_VILLA';

export type YardPropVariant =
  | 'KEI_CAR'
  | 'MAMACHARI_BIKE'
  | 'BONSAI_BENCH'
  | 'ROSE_ARCH_PLANTER'
  | 'STONE_LANTERN_BAMBOO'
  | 'SOLAR_EV_CHARGER';

export type TreeVariant =
  | 'CONIFER_PINES'
  | 'SAKURA_BLOSSOM'
  | 'AUTUMN_MOMIJI'
  | 'GOLDEN_GINKGO';

export interface HouseDNA {
  palette: string;
  variant: HouseVariant;
  mirrorX: boolean;
  yardProp: YardPropVariant;
  treeType: TreeVariant;
  keiCarColor: number;
}

export interface HousePalette {
  id: string;
  nameEn: string;
  nameJa: string;
  badgeColor: string;
  defaultVariant: HouseVariant;
  defaultYardProp: YardPropVariant;
  defaultTreeType: TreeVariant;
  wallMain: number;
  wallWing?: number;
  roofGable: number;
  roofTile: number;
  roofTileAccent: number;
  trim: number;
  door: number;
  doorFrame: number;
  balconyRailing: number;
  fence: number;
}

export const HOUSE_PALETTES: Record<string, HousePalette> = {
  terracotta_cream: {
    id: 'terracotta_cream',
    nameEn: 'Textbook Classic',
    nameJa: '教科書カラー (クリーム & テラコッタ)',
    badgeColor: 'bg-amber-100 border-amber-400 text-amber-900',
    defaultVariant: 'CLASSIC_GABLE',
    defaultYardProp: 'MAMACHARI_BIKE',
    defaultTreeType: 'CONIFER_PINES',
    wallMain: 0xfef08a,
    roofGable: 0xeed59b,
    roofTile: 0xea580c,
    roofTileAccent: 0xc2410c,
    trim: 0xf5eedc,
    door: 0x78350f,
    doorFrame: 0xfef3c7,
    balconyRailing: 0xfef9c3,
    fence: 0x94a3b8,
  },
  modern_slate: {
    id: 'modern_slate',
    nameEn: 'Modern Slate',
    nameJa: 'モダン・スレート (白 & 濃紺)',
    badgeColor: 'bg-slate-200 border-slate-500 text-slate-900',
    defaultVariant: 'MODERN_CUBIC',
    defaultYardProp: 'KEI_CAR',
    defaultTreeType: 'CONIFER_PINES',
    wallMain: 0xf8fafc,
    wallWing: 0x334155,
    roofGable: 0x1e293b,
    roofTile: 0x334155,
    roofTileAccent: 0x0f172a,
    trim: 0x334155,
    door: 0x18181b,
    doorFrame: 0xe2e8f0,
    balconyRailing: 0x334155,
    fence: 0x475569,
  },
  matcha_sage: {
    id: 'matcha_sage',
    nameEn: 'Matcha Sage',
    nameJa: '抹茶セージ (若草 & フォレスト)',
    badgeColor: 'bg-emerald-100 border-emerald-500 text-emerald-950',
    defaultVariant: 'NORDIC_CHALET',
    defaultYardProp: 'ROSE_ARCH_PLANTER',
    defaultTreeType: 'SAKURA_BLOSSOM',
    wallMain: 0xdcfce7,
    roofGable: 0x14532d,
    roofTile: 0x15803d,
    roofTileAccent: 0x166534,
    trim: 0xf0fdf4,
    door: 0x854d0e,
    doorFrame: 0xbbf7d0,
    balconyRailing: 0xbbf7d0,
    fence: 0x713f12,
  },
  coastal_blue: {
    id: 'coastal_blue',
    nameEn: 'Coastal Blue',
    nameJa: 'コースタル・ブルー (水色 & コバルト)',
    badgeColor: 'bg-sky-100 border-sky-400 text-sky-950',
    defaultVariant: 'SPLIT_SHED_ROOF',
    defaultYardProp: 'KEI_CAR',
    defaultTreeType: 'GOLDEN_GINKGO',
    wallMain: 0xe0f2fe,
    wallWing: 0xffffff,
    roofGable: 0x1e3a8a,
    roofTile: 0x2563eb,
    roofTileAccent: 0x1d4ed8,
    trim: 0xffffff,
    door: 0x9a3412,
    doorFrame: 0xbae6fd,
    balconyRailing: 0xffffff,
    fence: 0xcbd5e1,
  },
  sakura_blush: {
    id: 'sakura_blush',
    nameEn: 'Sakura Blush',
    nameJa: 'さくらブラッシュ (桜色 & バーガンディ)',
    badgeColor: 'bg-pink-100 border-pink-400 text-pink-950',
    defaultVariant: 'BAY_WINDOW_VILLA',
    defaultYardProp: 'ROSE_ARCH_PLANTER',
    defaultTreeType: 'SAKURA_BLOSSOM',
    wallMain: 0xfdf2f8,
    roofGable: 0x831843,
    roofTile: 0x991b1b,
    roofTileAccent: 0x7f1d1d,
    trim: 0xfff1f2,
    door: 0x450a0a,
    doorFrame: 0xfbcfe8,
    balconyRailing: 0xfce7f3,
    fence: 0x9ca3af,
  },
  autumn_chestnut: {
    id: 'autumn_chestnut',
    nameEn: 'Autumn Chestnut',
    nameJa: 'オータム・チェスナット (山吹 & ブラウン)',
    badgeColor: 'bg-amber-200 border-amber-600 text-amber-950',
    defaultVariant: 'CLASSIC_GABLE',
    defaultYardProp: 'BONSAI_BENCH',
    defaultTreeType: 'AUTUMN_MOMIJI',
    wallMain: 0xfef3c7,
    roofGable: 0x451a03,
    roofTile: 0xb45309,
    roofTileAccent: 0x78350f,
    trim: 0xffedd5,
    door: 0x3b1d07,
    doorFrame: 0xfde68a,
    balconyRailing: 0xfde68a,
    fence: 0x78350f,
  },
  charcoal_cedar: {
    id: 'charcoal_cedar',
    nameEn: 'Charcoal Cedar',
    nameJa: '焼杉チャコール (黒木目 & 燻し瓦)',
    badgeColor: 'bg-zinc-800 border-zinc-600 text-zinc-100',
    defaultVariant: 'SPLIT_SHED_ROOF',
    defaultYardProp: 'SOLAR_EV_CHARGER',
    defaultTreeType: 'AUTUMN_MOMIJI',
    wallMain: 0x27272a,
    wallWing: 0x3f3f46,
    roofGable: 0x18181b,
    roofTile: 0x3f3f46,
    roofTileAccent: 0x18181b,
    trim: 0x52525b,
    door: 0xa16207,
    doorFrame: 0x3f3f46,
    balconyRailing: 0x18181b,
    fence: 0x27272a,
  },
  nordic_white: {
    id: 'nordic_white',
    nameEn: 'Nordic White',
    nameJa: '白漆喰モダン (純白 & スレートグレー)',
    badgeColor: 'bg-neutral-100 border-neutral-400 text-neutral-800',
    defaultVariant: 'NORDIC_CHALET',
    defaultYardProp: 'KEI_CAR',
    defaultTreeType: 'GOLDEN_GINKGO',
    wallMain: 0xf8fafc,
    roofGable: 0x475569,
    roofTile: 0x64748b,
    roofTileAccent: 0x334155,
    trim: 0xffffff,
    door: 0xb45309,
    doorFrame: 0xe2e8f0,
    balconyRailing: 0x94a3b8,
    fence: 0xcbd5e1,
  },
  kyoto_machiya: {
    id: 'kyoto_machiya',
    nameEn: 'Kyoto Machiya',
    nameJa: '京町家 (土壁 & 墨黒瓦)',
    badgeColor: 'bg-amber-300 border-amber-800 text-amber-950',
    defaultVariant: 'TRADITIONAL_MACHIYA',
    defaultYardProp: 'STONE_LANTERN_BAMBOO',
    defaultTreeType: 'AUTUMN_MOMIJI',
    wallMain: 0xd97706,
    wallWing: 0xb45309,
    roofGable: 0x292524,
    roofTile: 0x44403c,
    roofTileAccent: 0x1c1917,
    trim: 0x78350f,
    door: 0x451a03,
    doorFrame: 0x78350f,
    balconyRailing: 0x78350f,
    fence: 0x57534e,
  },
  coastal_navy: {
    id: 'coastal_navy',
    nameEn: 'Deep Navy',
    nameJa: 'ディープ・ネイビー (濃紺サイディング & 白)',
    badgeColor: 'bg-blue-950 border-blue-600 text-blue-100',
    defaultVariant: 'MODERN_CUBIC',
    defaultYardProp: 'SOLAR_EV_CHARGER',
    defaultTreeType: 'CONIFER_PINES',
    wallMain: 0x1e3a5f,
    wallWing: 0xf8fafc,
    roofGable: 0x0f172a,
    roofTile: 0x1e293b,
    roofTileAccent: 0x020617,
    trim: 0xffffff,
    door: 0xd97706,
    doorFrame: 0xf8fafc,
    balconyRailing: 0xffffff,
    fence: 0x475569,
  },
  olive_timber: {
    id: 'olive_timber',
    nameEn: 'Olive Timber',
    nameJa: 'オリーブ・ティンバー (鶯色 & 焦げ茶屋根)',
    badgeColor: 'bg-lime-100 border-lime-600 text-lime-950',
    defaultVariant: 'TRADITIONAL_MACHIYA',
    defaultYardProp: 'BONSAI_BENCH',
    defaultTreeType: 'GOLDEN_GINKGO',
    wallMain: 0xecfccb,
    roofGable: 0x365314,
    roofTile: 0x4d7c0f,
    roofTileAccent: 0x1a2e05,
    trim: 0xf7fee7,
    door: 0x78350f,
    doorFrame: 0xd9f99d,
    balconyRailing: 0x365314,
    fence: 0x713f12,
  },
  sand_stucco: {
    id: 'sand_stucco',
    nameEn: 'Sand Stucco',
    nameJa: '南欧風スタッコ (砂壁 & スパニッシュ瓦)',
    badgeColor: 'bg-stone-200 border-amber-600 text-stone-900',
    defaultVariant: 'BAY_WINDOW_VILLA',
    defaultYardProp: 'MAMACHARI_BIKE',
    defaultTreeType: 'SAKURA_BLOSSOM',
    wallMain: 0xfafaf9,
    roofGable: 0x991b1b,
    roofTile: 0xc2410c,
    roofTileAccent: 0x9a3412,
    trim: 0xe7e5e4,
    door: 0x451a03,
    doorFrame: 0xf5f5f4,
    balconyRailing: 0x1c1917,
    fence: 0xa8a29e,
  },
};

export const HOUSE_VARIANTS: HouseVariant[] = [
  'CLASSIC_GABLE',
  'MODERN_CUBIC',
  'TRADITIONAL_MACHIYA',
  'NORDIC_CHALET',
  'SPLIT_SHED_ROOF',
  'BAY_WINDOW_VILLA',
];

export const YARD_PROP_VARIANTS: YardPropVariant[] = [
  'KEI_CAR',
  'MAMACHARI_BIKE',
  'BONSAI_BENCH',
  'ROSE_ARCH_PLANTER',
  'STONE_LANTERN_BAMBOO',
  'SOLAR_EV_CHARGER',
];

export const TREE_VARIANTS: TreeVariant[] = [
  'CONIFER_PINES',
  'SAKURA_BLOSSOM',
  'AUTUMN_MOMIJI',
  'GOLDEN_GINKGO',
];

const KEI_CAR_COLORS = [0xfef08a, 0x38bdf8, 0xf472b6, 0xa7f3d0, 0xe2e8f0, 0xfb923c];

/**
 * Generates a guaranteed non-repeating deck of `HouseDNA` cards for a town seed
 * so no two houses in the town ever share the same shell + symmetry + palette + prop!
 */
export function generateTownHouseDeck(rng: () => number, count: number = 40): HouseDNA[] {
  const paletteIds = Object.keys(HOUSE_PALETTES);

  // Create all 12 distinct (Shell × Mirror) structural silhouettes
  const silhouettes: Array<{ variant: HouseVariant; mirrorX: boolean }> = [];
  for (const v of HOUSE_VARIANTS) {
    silhouettes.push({ variant: v, mirrorX: false });
    silhouettes.push({ variant: v, mirrorX: true });
  }

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Build a full permutation pool where every (silhouette, palette) pair is unique (12 × 12 = 144 unique shells)
  const pool: HouseDNA[] = [];
  const shuffledSilhouettes = shuffle(silhouettes);
  const shuffledPalettes = shuffle(paletteIds);

  for (let cycle = 0; cycle < 4; cycle++) {
    const props = shuffle(YARD_PROP_VARIANTS);
    const trees = shuffle(TREE_VARIANTS);
    for (let i = 0; i < 12; i++) {
      const sil = shuffledSilhouettes[i];
      const pal = shuffledPalettes[(i + cycle * 3) % shuffledPalettes.length];
      const yardProp = props[(i + cycle) % props.length];
      const treeType = trees[(i + cycle) % trees.length];
      const keiCarColor = KEI_CAR_COLORS[(i + cycle * 2) % KEI_CAR_COLORS.length];

      pool.push({
        palette: pal,
        variant: sil.variant,
        mirrorX: sil.mirrorX,
        yardProp,
        treeType,
        keiCarColor,
      });
    }
  }

  return pool.slice(0, count);
}

const tileTextureCache = new Map<string, THREE.CanvasTexture>();

function createRoofTileTexture(tileColorHex: number, accentColorHex: number): THREE.CanvasTexture {
  const cacheKey = `${tileColorHex.toString(16)}_${accentColorHex.toString(16)}`;
  const existing = tileTextureCache.get(cacheKey);
  if (existing) return existing;

  if (typeof document === 'undefined') {
    const dummy = new THREE.Texture();
    return dummy as unknown as THREE.CanvasTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseCol = '#' + tileColorHex.toString(16).padStart(6, '0');
  const accentCol = '#' + accentColorHex.toString(16).padStart(6, '0');

  ctx.fillStyle = baseCol;
  ctx.fillRect(0, 0, 256, 256);

  const numRows = 6;
  const rowH = 256 / numRows;

  ctx.strokeStyle = accentCol;
  ctx.lineWidth = 4;

  for (let r = 0; r < numRows; r++) {
    const yBase = (r + 1) * rowH;

    ctx.beginPath();
    ctx.moveTo(0, yBase);
    ctx.lineTo(256, yBase);
    ctx.stroke();

    ctx.beginPath();
    const waveCount = 8;
    const waveW = 256 / waveCount;
    for (let w = 0; w < waveCount; w++) {
      const xStart = w * waveW;
      const xMid = xStart + waveW / 2;
      const xEnd = xStart + waveW;
      ctx.moveTo(xStart, yBase - 6);
      ctx.quadraticCurveTo(xMid, yBase - 18, xEnd, yBase - 6);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  tileTextureCache.set(cacheKey, texture);
  return texture;
}

export interface HouseOptions {
  palette?: HousePalette | string;
  variant?: HouseVariant;
  mirrorX?: boolean;
  yardProp?: YardPropVariant;
  treeType?: TreeVariant;
  keiCarColor?: number;
  dna?: HouseDNA;
  includeRoad?: boolean;
  includeTrees?: boolean;
  scale?: number;
}

/**
 * Builds a cute, boxy Japanese Kei Car (Honda N-BOX / Suzuki Hustler style)
 * Dimensions: 1.45m long × 0.72m wide × 0.88m tall (fits on front-left driveway apron)
 */
function buildKeiCar(bodyColor: number, glassMat: THREE.Material): THREE.Group {
  const car = new THREE.Group();
  car.name = 'Japanese_KeiCar';

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.15 });
  const roofWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const yellowPlateMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 0.5,
  });

  // Lower Chassis Box
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.36, 0.72), bodyMat);
  lower.position.y = 0.28;
  lower.castShadow = true;
  car.add(lower);

  // Tall Boxy Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.38, 0.68), bodyMat);
  cabin.position.set(-0.1, 0.64, 0);
  cabin.castShadow = true;
  car.add(cabin);

  // Two-tone White Roof Cap
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.07, 0.05, 0.70), roofWhiteMat);
  roofCap.position.set(-0.1, 0.84, 0);
  car.add(roofCap);

  // Windshield & Side Windows
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.30, 0.62), glassMat);
  windshield.position.set(0.43, 0.64, 0);
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.28, 0.70), glassMat);
  sideWin.position.set(-0.1, 0.64, 0);
  car.add(windshield, sideWin);

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
  wheelGeo.rotateX(Math.PI / 2);
  [
    [-0.45, 0.14, -0.35],
    [0.45, 0.14, -0.35],
    [-0.45, 0.14, 0.35],
    [0.45, 0.14, 0.35],
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(wx, wy, wz);
    car.add(wheel);
  });

  // Round Headlights & Iconic Yellow Kei-Car License Plate (*Kiiro Nanbā*)
  [-0.22, 0.22].forEach((hz) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), headlightMat);
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(0.72, 0.34, hz);
    car.add(lamp);
  });

  const plateFront = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.18), yellowPlateMat);
  plateFront.position.set(0.72, 0.20, 0);
  const plateRear = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.18), yellowPlateMat);
  plateRear.position.set(-0.72, 0.22, 0);
  car.add(plateFront, plateRear);

  return car;
}

/**
 * Builds front-yard Japanese lifestyle props strictly inside Z in [0.75, 1.43]
 * so the front sidewalk Z in [1.50, 3.00] remains 100% clear!
 */
function addFrontYardLifestyleProps(
  group: THREE.Group,
  yardProp: YardPropVariant,
  keiCarColor: number,
  metalMat: THREE.Material,
  foundationMat: THREE.Material,
  woodMat: THREE.Material,
  glassMat: THREE.Material,
  mirrorX: boolean
) {
  const mx = (x: number) => (mirrorX ? -x : x);

  // Always include outdoor AC compressor (*Shitsugaiki*) tucked on side wall
  const acBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.50, 0.66),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 })
  );
  acBody.position.set(mx(2.48), 0.40, -0.8);
  acBody.castShadow = true;
  group.add(acBody);

  // Always include functional front gatepost (*Kinō-Monchū*) with red mail slot
  const monchuX = mx(1.82);
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.15, 0.12), foundationMat);
  pillar.position.set(monchuX, 0.725, 1.34);
  pillar.castShadow = true;
  const mailBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.22, 0.16),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
  );
  mailBox.position.set(monchuX, 1.05, 1.36);
  group.add(pillar, mailBox);

  if (yardProp === 'KEI_CAR') {
    // Concrete Driveway Pad & Parked Kei Car on Front-Left Apron
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.02, 0.82), foundationMat);
    pad.position.set(mx(-1.55), 0.16, 1.06);
    pad.receiveShadow = true;
    group.add(pad);

    const car = buildKeiCar(keiCarColor, glassMat);
    car.position.set(mx(-1.55), 0.16, 1.06);
    if (mirrorX) car.rotation.y = Math.PI;
    group.add(car);
  } else if (yardProp === 'MAMACHARI_BIKE') {
    // Parked Japanese Family Bicycle (*Mamachari*) with front wire basket & rear child seat
    const bikeGroup = new THREE.Group();
    bikeGroup.position.set(mx(-1.45), 0.15, 1.15);
    bikeGroup.rotation.y = mirrorX ? -0.25 : 0.25;

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const wheelGeo = new THREE.TorusGeometry(0.20, 0.025, 8, 16);

    const wFront = new THREE.Mesh(wheelGeo, tireMat);
    wFront.position.set(-0.32, 0.22, 0);
    const wRear = new THREE.Mesh(wheelGeo, tireMat);
    wRear.position.set(0.32, 0.22, 0);

    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), frameMat);
    frame.rotation.z = Math.PI / 2.4;
    frame.position.set(0, 0.32, 0);

    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.22), metalMat);
    basket.position.set(-0.34, 0.48, 0);

    const childSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.24, 0.20),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
    );
    childSeat.position.set(0.32, 0.50, 0);

    bikeGroup.add(wFront, wRear, frame, basket, childSeat);
    group.add(bikeGroup);
  } else if (yardProp === 'BONSAI_BENCH') {
    // 2-Tier Wooden Bonsai Stand with Terracotta Pots + Stone Garden Lantern
    const standGroup = new THREE.Group();
    standGroup.position.set(mx(-1.5), 0.15, 1.12);

    const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.24), woodMat);
    shelf1.position.set(0, 0.25, 0.08);
    const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.24), woodMat);
    shelf2.position.set(0, 0.48, -0.12);
    standGroup.add(shelf1, shelf2);

    const potMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    [-0.3, 0, 0.3].forEach((px, idx) => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.11, 8), potMat);
      pot.position.set(px, 0.55, -0.12);
      const bonsai = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), leafMat);
      bonsai.position.set(px, 0.66 + (idx % 2) * 0.03, -0.12);
      standGroup.add(pot, bonsai);
    });
    group.add(standGroup);
  } else if (yardProp === 'ROSE_ARCH_PLANTER') {
    // Arched Garden Trellis with Blooming Pink Roses over the Front Walkway
    const archGroup = new THREE.Group();
    archGroup.position.set(mx(0.8), 0.15, 1.18);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.05, 0.06), woodMat);
    postL.position.set(-0.55, 1.025, 0);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.05, 0.06), woodMat);
    postR.position.set(0.55, 1.025, 0);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.18), woodMat);
    topBar.position.set(0, 2.08, 0);
    archGroup.add(postL, postR, topBar);

    const vineMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const roseMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
    [-0.45, -0.15, 0.15, 0.45].forEach((rx, i) => {
      const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), vineMat);
      vine.position.set(rx, 2.12, 0);
      const rose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), roseMat);
      rose.position.set(rx, 2.18, 0.08);
      archGroup.add(vine, rose);
      if (i === 0 || i === 3) {
        const sideRose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), roseMat);
        sideRose.position.set(rx * 1.15, 1.45, 0.06);
        archGroup.add(sideRose);
      }
    });
    group.add(archGroup);
  } else if (yardProp === 'STONE_LANTERN_BAMBOO') {
    // Carved Stone *Ishi-dōrō* Lantern & Ornamental Bamboo Cluster
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 1.3,
    });
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.45 });

    const lx = mx(-1.35);
    const doroPed = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.75, 6), stoneMat);
    doroPed.position.set(lx, 0.52, 1.12);
    const doroBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), glowMat);
    doroBox.position.set(lx, 0.98, 1.12);
    const doroRoof = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.18, 6), stoneMat);
    doroRoof.position.set(lx, 1.18, 1.12);
    group.add(doroPed, doroBox, doroRoof);

    [-1.85, -1.68, -1.52].forEach((bx, idx) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.9 + idx * 0.25, 6), bambooMat);
      stalk.position.set(mx(bx), 1.1, 0.95);
      group.add(stalk);
    });
  } else if (yardProp === 'SOLAR_EV_CHARGER') {
    // Sleek Brushed-Steel Home EV Charger Stand + Twin Topiary Spheres
    const evStand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.15, 0.14), metalMat);
    evStand.position.set(mx(-1.25), 0.72, 1.15);
    const evLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.06, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.2 })
    );
    evLed.position.set(mx(-1.25), 1.12, 1.23);
    group.add(evStand, evLed);

    const topiaryMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 });
    [-1.75, -0.85].forEach((tx) => {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), topiaryMat);
      sphere.position.set(mx(tx), 0.36, 1.15);
      sphere.castShadow = true;
      group.add(sphere);
    });
  }
}

/**
 * Builds backyard trees in 4 distinct seasonal/botanical species
 */
function addBackyardTrees(
  group: THREE.Group,
  treeType: TreeVariant,
  trunkMat: THREE.Material,
  mirrorX: boolean
) {
  const mx = (x: number) => (mirrorX ? -x : x);

  if (treeType === 'SAKURA_BLOSSOM') {
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xf472b6,
      emissiveIntensity: 0.2,
      roughness: 0.65,
    });
    const positions = [
      { x: mx(-1.8), z: -2.2, h: 4.5, r: 1.15 },
      { x: mx(1.6), z: -2.3, h: 5.1, r: 1.25 },
    ];
    positions.forEach((p) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.0, 8), trunkMat);
      trunk.position.set(p.x, 1.15, p.z);
      const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(p.r, 1), blossomMat);
      c1.position.set(p.x, p.h - 1.1, p.z);
      c1.castShadow = true;
      const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(p.r * 0.78, 1), blossomMat);
      c2.position.set(p.x + 0.45, p.h - 1.4, p.z + 0.25);
      group.add(trunk, c1, c2);
    });
  } else if (treeType === 'AUTUMN_MOMIJI') {
    const crimsonMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.75 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.75 });
    [
      { x: mx(-1.85), z: -2.2, mat: crimsonMat, h: 4.6 },
      { x: mx(1.55), z: -2.25, mat: orangeMat, h: 5.2 },
    ].forEach((p) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 2.0, 8), trunkMat);
      trunk.position.set(p.x, 1.15, p.z);
      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), p.mat);
      canopy.position.set(p.x, p.h - 1.1, p.z);
      canopy.scale.set(1.15, 0.85, 1.0);
      canopy.castShadow = true;
      group.add(trunk, canopy);
    });
  } else if (treeType === 'GOLDEN_GINKGO') {
    const ginkgoMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.7 });
    [
      { x: mx(-1.8), z: -2.2, h: 4.8 },
      { x: mx(-0.4), z: -2.3, h: 5.6 },
    ].forEach((p) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.8, 8), trunkMat);
      trunk.position.set(p.x, 1.05, p.z);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.05, p.h - 1.4, 8), ginkgoMat);
      cone.position.set(p.x, (p.h + 1.0) / 2, p.z);
      cone.castShadow = true;
      group.add(trunk, cone);
    });
  } else {
    const treeGreenDark = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
    const treeGreenBright = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });

    const buildPine = (x: number, z: number, totalH: number, scaleW: number) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0.15, z);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.5, 8), trunkMat);
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      tree.add(trunk);

      const baseR = 1.0 * scaleW;
      const coneH = (totalH - 1.0) / 2.2;
      for (let i = 0; i < 3; i++) {
        const radius = baseR * (1 - i * 0.22);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(radius, coneH, 8),
          i % 2 === 0 ? treeGreenDark : treeGreenBright
        );
        cone.position.y = 1.3 + i * (coneH * 0.65);
        cone.castShadow = true;
        tree.add(cone);
      }
      group.add(tree);
    };

    buildPine(mx(-1.8), -2.2, 4.6, 1.0);
    buildPine(mx(-0.45), -2.3, 5.8, 1.15);
  }
}

/**
 * Builds an authentic, true-to-scale 2-story Japanese Suburban House (6.0m × 6.0m lot).
 * Supports 6 Architectural Shells × 2 Mirror Symmetries × 6 Front-Yard Lifestyle Props × 4 Tree Species × 12 Palettes!
 */
export function buildHouseMesh(options: HouseOptions = {}): THREE.Group {
  const dna = options.dna;
  const paletteOpt = dna?.palette ?? options.palette ?? 'terracotta_cream';
  const includeRoad = options.includeRoad ?? true;
  const includeTrees = options.includeTrees ?? true;
  const scale = options.scale ?? 1.0;

  const palette: HousePalette = typeof paletteOpt === 'string'
    ? (HOUSE_PALETTES[paletteOpt] || HOUSE_PALETTES.terracotta_cream)
    : paletteOpt;

  const activeVariant: HouseVariant =
    dna?.variant ?? options.variant ?? palette.defaultVariant ?? 'CLASSIC_GABLE';
  const mirrorX: boolean = dna?.mirrorX ?? options.mirrorX ?? false;
  const yardProp: YardPropVariant =
    dna?.yardProp ?? options.yardProp ?? palette.defaultYardProp ?? 'MAMACHARI_BIKE';
  const treeType: TreeVariant =
    dna?.treeType ?? options.treeType ?? palette.defaultTreeType ?? 'CONIFER_PINES';
  const keiCarColor: number = dna?.keiCarColor ?? options.keiCarColor ?? 0xfef08a;

  const group = new THREE.Group();
  group.name = `House_hwg5_u19_00_${palette.id}_${activeVariant}_${mirrorX ? 'M' : 'S'}`;

  // -------------------------------------------------------------
  // Materials
  // -------------------------------------------------------------
  const sidingTex =
    activeVariant === 'TRADITIONAL_MACHIYA' || activeVariant === 'BAY_WINDOW_VILLA'
      ? getStuccoWallTexture()
      : getHorizontalSidingTexture();

  const wallMat = new THREE.MeshStandardMaterial({
    color: palette.wallMain,
    map: sidingTex,
    roughness: 0.75,
  });

  const wingWallMat = palette.wallWing !== undefined
    ? new THREE.MeshStandardMaterial({
        color: palette.wallWing,
        map: sidingTex,
        roughness: 0.75,
      })
    : wallMat;

  const foundationMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.6 });
  const gableRoofMat = new THREE.MeshStandardMaterial({ color: palette.roofGable, roughness: 0.65 });

  const tileTexture = createRoofTileTexture(palette.roofTile, palette.roofTileAccent);
  const tileRoofMat = new THREE.MeshStandardMaterial({
    map: tileTexture,
    color: palette.roofTile,
    roughness: 0.6,
  });

  const doorMat = new THREE.MeshStandardMaterial({ color: palette.door, roughness: 0.4 });
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: palette.doorFrame, roughness: 0.5 });
  const balconyMat = new THREE.MeshStandardMaterial({ color: palette.balconyRailing, roughness: 0.7 });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  const metalTrimMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.3,
    metalness: 0.6,
  });

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.95 });
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.85 });
  const fenceMat = new THREE.MeshStandardMaterial({ color: palette.fence, roughness: 0.8 });
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });

  // -------------------------------------------------------------
  // 1. PROPERTY BASE (Standard 6.0m × 6.0m Lot = 1U × 1U)
  // -------------------------------------------------------------
  const lotWidth = 6.0;

  const lawnGeo = new THREE.BoxGeometry(lotWidth, 0.15, 4.5);
  const lawn = new THREE.Mesh(lawnGeo, grassMat);
  lawn.position.set(0, 0.075, -0.75);
  lawn.receiveShadow = true;
  group.add(lawn);

  // Sidewalk slab in front: 6.0m wide, 1.5m deep (Z in [+1.5, +3.0] — 100% UNOBSTRUCTED)
  const sidewalkGeo = new THREE.BoxGeometry(lotWidth, 0.15, 1.5);
  const sidewalk = new THREE.Mesh(sidewalkGeo, foundationMat);
  sidewalk.position.set(0, 0.075, 2.25);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  const curbGeo = new THREE.BoxGeometry(lotWidth, 0.18, 0.12);
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.set(0, 0.09, 3.0);
  curb.receiveShadow = true;
  group.add(curb);

  if (includeRoad) {
    const roadGeo = new THREE.BoxGeometry(lotWidth, 0.02, 1.8);
    const road = new THREE.Mesh(roadGeo, asphaltMat);
    road.position.set(0, 0.01, 3.9);
    road.receiveShadow = true;
    group.add(road);
  }

  // Flagstone Walkway leading to sidewalk edge
  const mx = (x: number) => (mirrorX ? -x : x);
  const pathStep1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.55), pathMat);
  pathStep1.position.set(mx(0.75), 0.16, 0.95);
  pathStep1.receiveShadow = true;
  group.add(pathStep1);

  const pathStep2 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.02, 0.55), pathMat);
  pathStep2.position.set(mx(0.85), 0.16, 1.35);
  pathStep2.rotation.y = mirrorX ? -0.08 : 0.08;
  pathStep2.receiveShadow = true;
  group.add(pathStep2);

  // Core Architectural Shell Container (Mirrored along X when mirrorX === true)
  const shellContainer = new THREE.Group();
  if (mirrorX) {
    shellContainer.scale.x = -1;
  }
  group.add(shellContainer);

  // =============================================================
  // SHELL VARIANT 2: MODERN CUBIC (Zero-Cube + Solar Roof + Louvers)
  // =============================================================
  if (activeVariant === 'MODERN_CUBIC') {
    const modernGroup = new THREE.Group();
    modernGroup.position.set(0, 0.15, -0.75);

    const f1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.5, 3.1), wallMat);
    f1.position.set(-0.1, 1.25, 0);
    f1.castShadow = true;
    f1.receiveShadow = true;
    modernGroup.add(f1);

    const f2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.5, 3.4), wingWallMat);
    f2.position.set(0.65, 3.75, 0.15);
    f2.castShadow = true;
    f2.receiveShadow = true;
    modernGroup.add(f2);

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.18, 3.55), metalTrimMat);
    parapet.position.set(0.65, 5.05, 0.15);
    modernGroup.add(parapet);

    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.2 });
    const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 2.2), solarMat);
    solarPanel.position.set(0.65, 5.2, 0.15);
    solarPanel.rotation.x = 0.12;
    modernGroup.add(solarPanel);

    const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.1), trimMat);
    balconyFloor.position.set(-1.65, 2.55, 1.0);
    const balconyGlass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.06), glassMat);
    balconyGlass.position.set(-1.65, 3.0, 1.50);
    modernGroup.add(balconyFloor, balconyGlass);

    const louverMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
    for (let l = 0; l < 6; l++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.4, 0.14), louverMat);
      fin.position.set(0.05 + l * 0.14, 1.2, 1.58);
      fin.castShadow = true;
      modernGroup.add(fin);
    }

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.1, 0.06), doorMat);
    door.position.set(1.25, 1.05, 1.56);
    const win1F = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 0.05), glassMat);
    win1F.position.set(-1.25, 1.25, 1.56);
    const win2F = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.05), glassMat);
    win2F.position.set(0.65, 3.85, 1.86);
    modernGroup.add(door, win1F, win2F);

    shellContainer.add(modernGroup);
  }
  // =============================================================
  // SHELL VARIANT 3: TRADITIONAL MACHIYA (Kawara Roof + Hisashi Eaves)
  // =============================================================
  else if (activeVariant === 'TRADITIONAL_MACHIYA') {
    const machiyaGroup = new THREE.Group();
    machiyaGroup.position.set(0, 0.15, -0.75);

    const mW = 4.8;
    const mD = 3.2;
    const mH = 4.0;

    const base = new THREE.Mesh(new THREE.BoxGeometry(mW + 0.1, 0.24, mD + 0.1), foundationMat);
    base.position.y = 0.12;
    const body = new THREE.Mesh(new THREE.BoxGeometry(mW, mH, mD), wallMat);
    body.position.y = mH / 2 + 0.12;
    body.castShadow = true;
    body.receiveShadow = true;
    machiyaGroup.add(base, body);

    const irimoya = buildJapaneseIrimoyaRoof({
      width: mW + 0.7,
      depth: mD + 0.7,
      height: 1.55,
      roofMat: tileRoofMat,
      gableWallMat: wallMat,
      trimMat: doorMat,
    });
    irimoya.position.set(0, mH + 0.12, 0);
    machiyaGroup.add(irimoya);

    const hisashi = new THREE.Mesh(new THREE.BoxGeometry(mW + 0.3, 0.1, 0.72), tileRoofMat);
    hisashi.position.set(0, 2.35, mD / 2 + 0.30);
    hisashi.rotation.x = 0.22;
    hisashi.castShadow = true;
    machiyaGroup.add(hisashi);

    const hikido = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.0, 0.06), doorMat);
    hikido.position.set(0.85, 1.12, mD / 2 + 0.02);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.07), glassMat);
    doorGlass.position.set(0.85, 1.18, mD / 2 + 0.02);
    machiyaGroup.add(hikido, doorGlass);

    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.26, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfde047,
        emissiveIntensity: 1.1,
        roughness: 0.3,
      })
    );
    lantern.position.set(1.68, 1.75, mD / 2 + 0.12);
    machiyaGroup.add(lantern);

    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.05), glassMat);
    win1.position.set(-1.1, 1.3, mD / 2 + 0.02);
    const frame1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.04), doorMat);
    frame1.position.set(-1.1, 1.3, mD / 2 + 0.01);
    machiyaGroup.add(frame1, win1);

    [-1.2, 1.2].forEach((wx) => {
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.05), glassMat);
      win2.position.set(wx, 3.35, mD / 2 + 0.02);
      const frame2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 0.04), doorMat);
      frame2.position.set(wx, 3.35, mD / 2 + 0.01);
      machiyaGroup.add(frame2, win2);
    });

    shellContainer.add(machiyaGroup);
  }
  // =============================================================
  // SHELL VARIANT 4: NORDIC CHALET (Steep Gable + Brick Chimney + Flower Box)
  // =============================================================
  else if (activeVariant === 'NORDIC_CHALET') {
    const chaletGroup = new THREE.Group();
    chaletGroup.position.set(0, 0.15, -0.75);

    const cW = 4.6;
    const cD = 3.2;
    const eavesH = 3.55;
    const peakH = 1.95;

    const body = new THREE.Mesh(new THREE.BoxGeometry(cW, eavesH, cD), wallMat);
    body.position.y = eavesH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    chaletGroup.add(body);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-cW / 2, 0);
    gableShape.lineTo(0, peakH);
    gableShape.lineTo(cW / 2, 0);
    gableShape.closePath();

    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: cD, bevelEnabled: false });
    gableGeo.translate(0, eavesH, -cD / 2);
    const gableWall = new THREE.Mesh(gableGeo, wallMat);
    gableWall.castShadow = true;
    chaletGroup.add(gableWall);

    const overhang = 0.30;
    const slopeLen = Math.hypot(cW / 2 + overhang, peakH);
    const angle = Math.atan2(peakH, cW / 2);
    const slopeGeo = new THREE.BoxGeometry(slopeLen, 0.12, cD + overhang * 2);

    const leftRoof = new THREE.Mesh(slopeGeo, tileRoofMat);
    leftRoof.position.set(-(cW / 4 + overhang / 2), eavesH + peakH / 2 + 0.04, 0);
    leftRoof.rotation.z = angle;
    leftRoof.castShadow = true;

    const rightRoof = new THREE.Mesh(slopeGeo, tileRoofMat);
    rightRoof.position.set(cW / 4 + overhang / 2, eavesH + peakH / 2 + 0.04, 0);
    rightRoof.rotation.z = -angle;
    rightRoof.castShadow = true;
    chaletGroup.add(leftRoof, rightRoof);

    const brickMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      map: getBrickTileTexture(),
      roughness: 0.8,
    });
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.8, 0.55), brickMat);
    chimney.position.set(-1.45, eavesH + 1.0, -0.6);
    chimney.castShadow = true;
    chaletGroup.add(chimney);

    const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.55), doorMat);
    porchDeck.position.set(0.85, 0.07, cD / 2 + 0.25);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.1, 0.06), doorMat);
    door.position.set(0.85, 1.12, cD / 2 + 0.03);
    chaletGroup.add(porchDeck, door);

    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.15, 0.05), glassMat);
    win1.position.set(-0.95, 1.35, cD / 2 + 0.02);
    const planter = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.22, 0.22), doorMat);
    planter.position.set(-0.95, 0.68, cD / 2 + 0.11);
    chaletGroup.add(win1, planter);

    const flowerColors = [0xef4444, 0xfacc15, 0xf472b6, 0xef4444];
    flowerColors.forEach((col, idx) => {
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })
      );
      bloom.position.set(-1.4 + idx * 0.3, 0.84, cD / 2 + 0.11);
      chaletGroup.add(bloom);
    });

    const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.05), glassMat);
    win2.position.set(0, 3.85, cD / 2 + 0.02);
    chaletGroup.add(win2);

    shellContainer.add(chaletGroup);
  }
  // =============================================================
  // SHELL VARIANT 5: SPLIT SHED ROOF (*Kata-nagare* Dual Opposing Shed Roofs)
  // =============================================================
  else if (activeVariant === 'SPLIT_SHED_ROOF') {
    const shedGroup = new THREE.Group();
    shedGroup.position.set(0, 0.15, -0.75);

    // Right Taller Volume (2.6m wide, 3.3m deep, 4.9m tall)
    const rightBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.7, 3.3), wallMat);
    rightBox.position.set(0.95, 2.35, 0);
    rightBox.castShadow = true;
    rightBox.receiveShadow = true;

    const rightRoof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 3.6), tileRoofMat);
    rightRoof.position.set(0.95, 4.82, 0);
    rightRoof.rotation.z = -0.18;
    rightRoof.castShadow = true;

    // Left Lower Volume (2.3m wide, 3.0m deep, 3.6m tall)
    const leftBox = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.5, 3.0), wingWallMat);
    leftBox.position.set(-1.35, 1.75, -0.1);
    leftBox.castShadow = true;
    leftBox.receiveShadow = true;

    const leftRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 3.3), gableRoofMat);
    leftRoof.position.set(-1.35, 3.58, -0.1);
    leftRoof.rotation.z = 0.22;
    leftRoof.castShadow = true;

    // Clerestory High Window Strip between the two opposing shed roofs
    const clerestory = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 2.6), glassMat);
    clerestory.position.set(-0.34, 4.15, 0);

    // 2F Inset Loggia Balcony on Right Volume
    const loggiaRail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 0.10), balconyMat);
    loggiaRail.position.set(0.95, 2.85, 1.70);
    const loggiaWin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, 0.05), glassMat);
    loggiaWin.position.set(0.95, 3.55, 1.66);

    // 1F Entrance Door & Left Picture Window
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.1, 0.06), doorMat);
    door.position.set(0.85, 1.05, 1.66);
    const leftWin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.25, 0.05), glassMat);
    leftWin.position.set(-1.35, 1.45, 1.42);
    const leftWin2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.05), glassMat);
    leftWin2.position.set(-1.35, 2.85, 1.42);

    shedGroup.add(
      rightBox, rightRoof, leftBox, leftRoof,
      clerestory, loggiaRail, loggiaWin, door, leftWin, leftWin2
    );
    shellContainer.add(shedGroup);
  }
  // =============================================================
  // SHELL VARIANT 6: BAY WINDOW VILLA (*Yosemune* Hipped Roof + Hexagonal Bay Window)
  // =============================================================
  else if (activeVariant === 'BAY_WINDOW_VILLA') {
    const villaGroup = new THREE.Group();
    villaGroup.position.set(0, 0.15, -0.75);

    const vW = 4.6;
    const vD = 3.2;
    const vH = 4.15;

    const body = new THREE.Mesh(new THREE.BoxGeometry(vW, vH, vD), wallMat);
    body.position.y = vH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    villaGroup.add(body);

    // Decorative Horizontal Belt Course Molding between 1F and 2F
    const belt = new THREE.Mesh(new THREE.BoxGeometry(vW + 0.14, 0.16, vD + 0.14), trimMat);
    belt.position.y = 2.25;
    villaGroup.add(belt);

    // 4-Sloped Hipped Pyramid Roof (*Yosemune-yane*)
    const hipGeo = new THREE.ConeGeometry((vW + 0.6) * Math.SQRT1_2, 1.45, 4);
    hipGeo.rotateY(Math.PI / 4);
    const hipRoof = new THREE.Mesh(hipGeo, tileRoofMat);
    hipRoof.scale.set(1.0, 1.0, (vD + 0.6) / (vW + 0.6));
    hipRoof.position.set(0, vH + 0.72, 0);
    hipRoof.castShadow = true;
    villaGroup.add(hipRoof);

    // Projecting 1F Hexagonal Bay Window (*Demado*) on Left Side
    const bayGroup = new THREE.Group();
    bayGroup.position.set(-1.1, 1.25, vD / 2 + 0.18);

    const bayBody = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.25, 6), trimMat);
    const bayGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.95, 6), glassMat);
    const bayRoof = new THREE.Mesh(new THREE.ConeGeometry(0.76, 0.38, 6), gableRoofMat);
    bayRoof.position.y = 0.81;
    const baySkirt = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.25, 6), trimMat);
    baySkirt.rotation.x = Math.PI;
    baySkirt.position.y = -0.75;
    bayGroup.add(bayBody, bayGlass, bayRoof, baySkirt);
    villaGroup.add(bayGroup);

    // Columned Front Entrance Portico on Right Side
    const porticoCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.16, 0.65), trimMat);
    porticoCanopy.position.set(1.05, 2.35, vD / 2 + 0.30);
    const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.25, 10), trimMat);
    colL.position.set(0.45, 1.12, vD / 2 + 0.52);
    const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.25, 10), trimMat);
    colR.position.set(1.65, 1.12, vD / 2 + 0.52);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.1, 0.06), doorMat);
    door.position.set(1.05, 1.05, vD / 2 + 0.03);
    villaGroup.add(porticoCanopy, colL, colR, door);

    // 2F Symmetrical Windows with Juliet Balconies
    [-1.1, 1.05].forEach((wx) => {
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.1, 0.05), glassMat);
      win2.position.set(wx, 3.25, vD / 2 + 0.02);
      const juliet = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.42, 0.12), balconyMat);
      juliet.position.set(wx, 2.88, vD / 2 + 0.06);
      villaGroup.add(win2, juliet);
    });

    shellContainer.add(villaGroup);
  }
  // =============================================================
  // SHELL VARIANT 1: CLASSIC GABLE (Textbook Iconic 2-Story + 1-Story Wing)
  // =============================================================
  else {
    const mainWingGroup = new THREE.Group();
    mainWingGroup.position.set(0.95, 0.15, -0.55);

    const mainW = 3.2;
    const mainD = 3.3;
    const mainWallH = 4.3;

    const baseBandGeo = new THREE.BoxGeometry(mainW + 0.06, 0.18, mainD + 0.06);
    const baseBand = new THREE.Mesh(baseBandGeo, foundationMat);
    baseBand.position.set(0, 0.09, 0);
    baseBand.receiveShadow = true;
    mainWingGroup.add(baseBand);

    const mainBodyGeo = new THREE.BoxGeometry(mainW, mainWallH - 0.18, mainD);
    const mainBody = new THREE.Mesh(mainBodyGeo, wallMat);
    mainBody.position.set(0, (mainWallH + 0.18) / 2, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    mainWingGroup.add(mainBody);

    const gablePeakH = 1.45;
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-mainW / 2, 0);
    gableShape.lineTo(0, gablePeakH);
    gableShape.lineTo(mainW / 2, 0);
    gableShape.closePath();

    const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: mainD, bevelEnabled: false });
    gableGeo.translate(0, mainWallH, -mainD / 2);
    const gableWall = new THREE.Mesh(gableGeo, wallMat);
    gableWall.castShadow = true;
    gableWall.receiveShadow = true;
    mainWingGroup.add(gableWall);

    const roofThickness = 0.1;
    const roofOverhang = 0.26;
    const slopeHyp = Math.sqrt(Math.pow(mainW / 2 + roofOverhang, 2) + Math.pow(gablePeakH + 0.05, 2));
    const roofSlopeAngle = Math.atan2(gablePeakH, mainW / 2);

    const roofPlaneGeo = new THREE.BoxGeometry(slopeHyp, roofThickness, mainD + roofOverhang * 2);

    const leftSlope = new THREE.Mesh(roofPlaneGeo, gableRoofMat);
    leftSlope.position.set(-(mainW / 4 + roofOverhang / 2), mainWallH + gablePeakH / 2 + 0.04, 0);
    leftSlope.rotation.z = roofSlopeAngle;
    leftSlope.castShadow = true;
    mainWingGroup.add(leftSlope);

    const rightSlope = new THREE.Mesh(roofPlaneGeo, gableRoofMat);
    rightSlope.position.set(mainW / 4 + roofOverhang / 2, mainWallH + gablePeakH / 2 + 0.04, 0);
    rightSlope.rotation.z = -roofSlopeAngle;
    rightSlope.castShadow = true;
    mainWingGroup.add(rightSlope);

    const ridgeBeamGeo = new THREE.BoxGeometry(0.16, 0.12, mainD + roofOverhang * 2 + 0.06);
    const ridgeBeam = new THREE.Mesh(ridgeBeamGeo, metalTrimMat);
    ridgeBeam.position.set(0, mainWallH + gablePeakH + 0.06, 0);
    mainWingGroup.add(ridgeBeam);

    const balconyY = 2.45;
    const balconyW = 2.4;
    const balconyD = 0.62;
    const balconyH = 0.8;

    const balcSlabGeo = new THREE.BoxGeometry(balconyW + 0.08, 0.12, balconyD);
    const balcSlab = new THREE.Mesh(balcSlabGeo, trimMat);
    balcSlab.position.set(0, balconyY, mainD / 2 + balconyD / 2);
    balcSlab.castShadow = true;
    mainWingGroup.add(balcSlab);

    const balcFrontGeo = new THREE.BoxGeometry(balconyW + 0.08, balconyH, 0.08);
    const balcFront = new THREE.Mesh(balcFrontGeo, balconyMat);
    balcFront.position.set(0, balconyY + balconyH / 2, mainD / 2 + balconyD - 0.04);
    balcFront.castShadow = true;
    mainWingGroup.add(balcFront);

    const balcSideGeo = new THREE.BoxGeometry(0.08, balconyH, balconyD);
    const balcLeft = new THREE.Mesh(balcSideGeo, balconyMat);
    balcLeft.position.set(-balconyW / 2, balconyY + balconyH / 2, mainD / 2 + balconyD / 2);
    const balcRight = new THREE.Mesh(balcSideGeo, balconyMat);
    balcRight.position.set(balconyW / 2, balconyY + balconyH / 2, mainD / 2 + balconyD / 2);
    mainWingGroup.add(balcLeft, balcRight);

    const ribbonW = 2.1;
    const ribbonH = 0.5;
    const ribbonY = 3.55;

    const ribbonGlass = new THREE.Mesh(new THREE.BoxGeometry(ribbonW, ribbonH, 0.02), glassMat);
    ribbonGlass.position.set(0, ribbonY, mainD / 2 + 0.01);
    mainWingGroup.add(ribbonGlass);

    const ribbonFrameGeo = new THREE.BoxGeometry(ribbonW + 0.06, 0.05, 0.07);
    const ribTop = new THREE.Mesh(ribbonFrameGeo, trimMat);
    ribTop.position.set(0, ribbonY + ribbonH / 2, mainD / 2 + 0.025);
    const ribBottom = new THREE.Mesh(ribbonFrameGeo, trimMat);
    ribBottom.position.set(0, ribbonY - ribbonH / 2, mainD / 2 + 0.025);
    mainWingGroup.add(ribTop, ribBottom);

    for (let i = 1; i <= 3; i++) {
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.04, ribbonH, 0.07), trimMat);
      mull.position.set(-ribbonW / 2 + i * (ribbonW / 4), ribbonY, mainD / 2 + 0.025);
      mainWingGroup.add(mull);
    }

    const stoopGeo = new THREE.BoxGeometry(1.3, 0.1, 0.55);
    const stoop = new THREE.Mesh(stoopGeo, foundationMat);
    stoop.position.set(0.15, 0.05, mainD / 2 + 0.27);
    stoop.receiveShadow = true;
    mainWingGroup.add(stoop);

    const doorW = 0.9;
    const doorH = 2.1;
    const doorFrameGeo = new THREE.BoxGeometry(doorW + 0.2, doorH + 0.12, 0.08);
    const doorSurround = new THREE.Mesh(doorFrameGeo, doorFrameMat);
    doorSurround.position.set(0.15, (doorH + 0.12) / 2, mainD / 2 + 0.03);
    mainWingGroup.add(doorSurround);

    const doorSlabGeo = new THREE.BoxGeometry(doorW, doorH, 0.05);
    const doorSlab = new THREE.Mesh(doorSlabGeo, doorMat);
    doorSlab.position.set(0.15, doorH / 2 + 0.03, mainD / 2 + 0.05);
    mainWingGroup.add(doorSlab);

    const doorGlassGeo = new THREE.BoxGeometry(0.12, 1.5, 0.055);
    const doorGlass = new THREE.Mesh(doorGlassGeo, glassMat);
    doorGlass.position.set(0.02, doorH / 2 + 0.06, mainD / 2 + 0.05);
    mainWingGroup.add(doorGlass);

    const handleGeo = new THREE.BoxGeometry(0.03, 0.22, 0.05);
    const handle = new THREE.Mesh(handleGeo, metalTrimMat);
    handle.position.set(0.46, 1.05, mainD / 2 + 0.08);
    mainWingGroup.add(handle);

    const leftSqW = 0.55;
    const leftSqH = 0.55;
    const leftSqY = 1.35;
    const leftSqX = -0.95;

    const leftSqGlass = new THREE.Mesh(new THREE.BoxGeometry(leftSqW, leftSqH, 0.02), glassMat);
    leftSqGlass.position.set(leftSqX, leftSqY, mainD / 2 + 0.01);
    const leftSqFrame = new THREE.Mesh(new THREE.BoxGeometry(leftSqW + 0.08, leftSqH + 0.08, 0.05), trimMat);
    leftSqFrame.position.set(leftSqX, leftSqY, mainD / 2 + 0.02);
    mainWingGroup.add(leftSqFrame, leftSqGlass);

    const rightSlitW = 0.32;
    const rightSlitH = 1.05;
    const rightSlitY = 1.35;
    const rightSlitX = 1.15;

    const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(rightSlitW, rightSlitH, 0.02), glassMat);
    rightGlass.position.set(rightSlitX, rightSlitY, mainD / 2 + 0.01);
    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(rightSlitW + 0.08, rightSlitH + 0.08, 0.05), trimMat);
    rightFrame.position.set(rightSlitX, rightSlitY, mainD / 2 + 0.02);
    mainWingGroup.add(rightFrame, rightGlass);

    shellContainer.add(mainWingGroup);

    // LEFT SECTION: SINGLE-STORY EXTENSION WING
    const leftWingGroup = new THREE.Group();
    leftWingGroup.position.set(-1.65, 0.15, -0.65);

    const leftW = 2.2;
    const leftD = 2.8;
    const w2 = leftW / 2;
    const d2 = leftD / 2;
    const hF = 2.25;
    const hR = 3.65;
    const slopeDeltaY = hR - hF;
    const slopeAngle = Math.atan2(slopeDeltaY, leftD);

    const leftBaseBand = new THREE.Mesh(new THREE.BoxGeometry(leftW + 0.06, 0.18, leftD + 0.06), foundationMat);
    leftBaseBand.position.set(0, 0.09, 0);
    leftWingGroup.add(leftBaseBand);

    const bodyPositions = new Float32Array([
      -w2, 0, d2,   w2, 0, d2,   w2, hF, d2,
      -w2, 0, d2,   w2, hF, d2,  -w2, hF, d2,
      w2, 0, -d2,  -w2, 0, -d2,  -w2, hR, -d2,
      w2, 0, -d2,  -w2, hR, -d2,  w2, hR, -d2,
      -w2, 0, -d2,  -w2, 0, d2,  -w2, hF, d2,
      -w2, 0, -d2,  -w2, hF, d2, -w2, hR, -d2,
      w2, 0, d2,   w2, 0, -d2,   w2, hR, -d2,
      w2, 0, d2,   w2, hR, -d2,  w2, hF, d2,
      -w2, hF, d2,  w2, hF, d2,   w2, hR, -d2,
      -w2, hF, d2,  w2, hR, -d2, -w2, hR, -d2,
      -w2, 0, -d2,  w2, 0, -d2,   w2, 0, d2,
      -w2, 0, -d2,  w2, 0, d2,   -w2, 0, d2,
    ]);

    const leftBodyGeo = new THREE.BufferGeometry();
    leftBodyGeo.setAttribute('position', new THREE.BufferAttribute(bodyPositions, 3));

    const bodyUVs = new Float32Array(36 * 2);
    for (let i = 0; i < 36; i++) {
      const vx = bodyPositions[i * 3];
      const vy = bodyPositions[i * 3 + 1];
      const vz = bodyPositions[i * 3 + 2];
      let u = 0;
      let v = 0;
      if (i < 12) {
        u = (vx + w2) / leftW;
        v = vy / hR;
      } else if (i < 24) {
        u = (vz + d2) / leftD;
        v = vy / hR;
      } else {
        u = (vx + w2) / leftW;
        v = (vz + d2) / leftD;
      }
      bodyUVs[i * 2] = u;
      bodyUVs[i * 2 + 1] = v;
    }
    leftBodyGeo.setAttribute('uv', new THREE.BufferAttribute(bodyUVs, 2));
    leftBodyGeo.computeVertexNormals();

    const leftBody = new THREE.Mesh(leftBodyGeo, wingWallMat);
    leftBody.castShadow = true;
    leftBody.receiveShadow = true;
    leftWingGroup.add(leftBody);

    const roofOverhangFront = 0.25;
    const roofOverhangBack = 0.18;
    const roofOverhangLeft = 0.26;
    const leftRoofThickness = 0.1;

    const leftSlopeHyp = Math.sqrt(leftD * leftD + slopeDeltaY * slopeDeltaY);
    const roofSlopeLength = leftSlopeHyp + roofOverhangFront + roofOverhangBack;
    const roofWidth = leftW + roofOverhangLeft;

    const tileRoofGeo = new THREE.BoxGeometry(roofWidth, leftRoofThickness, roofSlopeLength);
    const tileRoof = new THREE.Mesh(tileRoofGeo, tileRoofMat);

    const centerShiftAlongSlope = (roofOverhangFront - roofOverhangBack) / 2;
    const roofZ = centerShiftAlongSlope * Math.cos(slopeAngle);
    const roofY = (hF + hR) / 2 - centerShiftAlongSlope * Math.sin(slopeAngle) + (leftRoofThickness / 2) / Math.cos(slopeAngle);
    const roofX = -roofOverhangLeft / 2;

    tileRoof.position.set(roofX, roofY, roofZ);
    tileRoof.rotation.x = slopeAngle;
    tileRoof.castShadow = true;
    tileRoof.receiveShadow = true;
    leftWingGroup.add(tileRoof);

    const fasciaH = 0.12;
    const fasciaGeo = new THREE.BoxGeometry(roofWidth + 0.02, fasciaH, 0.05);
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: palette.roofTileAccent,
      roughness: 0.6,
    });
    const fascia = new THREE.Mesh(fasciaGeo, fasciaMat);
    const frontLipZ = d2 + roofOverhangFront * Math.cos(slopeAngle);
    const frontLipY = hF - roofOverhangFront * Math.sin(slopeAngle) + (leftRoofThickness / 2);
    fascia.position.set(roofX, frontLipY - fasciaH / 2 + 0.02, frontLipZ);
    leftWingGroup.add(fascia);

    const winW = 0.95;
    const winH = 0.8;
    const winY = 1.25;

    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.02), glassMat);
    winGlass.position.set(0, winY, d2 + 0.01);
    const winOuterFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.08, winH + 0.08, 0.05), trimMat);
    winOuterFrame.position.set(0, winY, d2 + 0.02);
    leftWingGroup.add(winOuterFrame, winGlass);

    const winHBar = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.04, 0.06), trimMat);
    winHBar.position.set(0, winY, d2 + 0.025);
    const winVBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, winH, 0.06), trimMat);
    winVBar.position.set(0, winY, d2 + 0.025);
    leftWingGroup.add(winHBar, winVBar);

    shellContainer.add(leftWingGroup);
  }

  // -------------------------------------------------------------
  // 2. FRONT-YARD LIFESTYLE PROPS (Kei Car, Mamachari Bike, Bonsai, Rose Arch, etc.)
  // -------------------------------------------------------------
  addFrontYardLifestyleProps(
    group,
    yardProp,
    keiCarColor,
    metalTrimMat,
    foundationMat,
    doorMat,
    glassMat,
    mirrorX
  );

  // -------------------------------------------------------------
  // 3. BACKYARD PERIMETER FENCE & SEASONAL TREES
  // -------------------------------------------------------------
  const fenceH = 1.2;
  const fenceGeo = new THREE.BoxGeometry(lotWidth, fenceH, 0.06);
  const fence = new THREE.Mesh(fenceGeo, fenceMat);
  fence.position.set(0, 0.15 + fenceH / 2, -2.85);
  fence.castShadow = true;
  fence.receiveShadow = true;
  group.add(fence);

  const hedgeBaseGeo = new THREE.BoxGeometry(lotWidth, 0.45, 0.22);
  const hedgeBase = new THREE.Mesh(
    hedgeBaseGeo,
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 })
  );
  hedgeBase.position.set(0, 0.15 + 0.225, -2.75);
  group.add(hedgeBase);

  if (includeTrees) {
    addBackyardTrees(group, treeType, treeTrunkMat, mirrorX);
  }

  if (scale !== 1.0) {
    group.scale.setScalar(scale);
  }

  return group;
}
