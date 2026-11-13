/**
 * Curated 3D Suzuka Grand Prix Biome & Atmosphere Themes (Tier 1).
 *
 * Pure data + deterministic selection helpers (zero DOM/React/Three runtime imports
 * so the module can be verified directly via `node:test`).
 *
 * Visual swaps operate strictly on sky shader uniforms, scene lighting/fog,
 * cached 2D procedural canvas textures, and existing vertex/instanced colors —
 * adding zero extra draw calls to preserve Classroom 3D WebGL budgets.
 */

export type SuzukaTrackThemeId =
  | 'SUZUKA_SPRING_DAY'
  | 'TOKYO_NIGHT_LIGHTS'
  | 'AUTUMN_MOMIJI_SUNSET'
  | 'HOKKAIDO_WINTER_SNOW';

export type SuzukaTrackThemeSelection = SuzukaTrackThemeId | 'RANDOM';

export const DEFAULT_TRACK_THEME_ID: SuzukaTrackThemeId = 'SUZUKA_SPRING_DAY';

export interface FoliageHslRange {
  hMin: number;
  hRange: number;
  sMin: number;
  sRange: number;
  lMin: number;
  lRange: number;
}

export interface SuzukaTrackThemeConfig {
  id: SuzukaTrackThemeId;
  emoji: string;
  nameEn: string;
  nameJa: string;
  shortEn: string;
  shortJa: string;
  descEn: string;
  descJa: string;
  /** Pure ASCII + Kanji/Kana text for Canvas2D overhead Start/Finish banner */
  gantrySubText: string;
  badgeClass: string;
  cardBorderSelected: string;
  cardBgSelected: string;

  // Sky dome shader + Scene background & fog
  sceneBackgroundHex: number;
  fogHex: number;
  fogDensity: number;
  zenithHex: number;
  midSkyHex: number;
  horizonHex: number;
  sunDir: [number, number, number];
  sunColorHex: number;
  cloudShadowHex: number;
  cloudLitHex: number;
  starIntensity: number;

  // Lighting & tone mapping
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  dirColorHex: number;
  dirIntensity: number;
  exposure: number;

  // Turf / Ground canvas palette
  turfBgHex: string;
  turfStripeA: string;
  turfStripeB: string;
  turfSpeckles: [string, string, string];

  // Outer runoff verge & gravel
  vergeTurfHex: string;
  vergeLineHex: string;
  vergeGravelBaseHex: string;
  vergeGravelSpeckleA: string;
  vergeGravelSpeckleB: string;

  // Track asphalt & corner speed zone
  asphaltBgHex: string;
  asphaltGrooveRgba: string;
  asphaltRedBgHex: string;
  asphaltRedGrooveRgba: string;
  roadEmissiveHex: number;
  roadEmissiveIntensity: number;
  redRoadEmissiveHex: number;
  redRoadEmissiveIntensity: number;

  // FIA Serrated Kerbs
  kerbPrimaryHex: number;
  kerbSecondaryHex: number;

  // Architectural solids
  concreteHex: number;
  steelHex: number;
  pitBuildingHex: number;
  glassHex: number;
  glassEmissiveIntensity: number;

  // Distant Mountains & Mt. Fuji
  fujiBaseHex: number;
  fujiCapHex: number;
  mountainValleyHex: number;
  mountainMidHex: number;
  mountainCrestHex: number;
  mountainColors: [number, number, number, number, number];

  // Clouds, Balloons, Floodlights, Signage & Crowd
  cloudMeshHex: number;
  cloudEmissiveIntensity: number;
  balloonEmissiveIntensity: number;
  floodGlowHex: number;
  floodEmissiveIntensity: number;
  signEmissiveIntensity: number;
  ferrisRimHex: number;
  ferrisRimEmissiveHex: number;
  ferrisEmissiveIntensity: number;
  towerWindowBg: string;
  towerWindowColorA: string;
  towerWindowColorB: string;
  towerWindowEmissiveIntensity: number;
  crowdBrightness: number;

  // Instanced foliage HSL tint ranges
  treeFoliage: {
    sakura: FoliageHslRange;
    cedar: FoliageHslRange;
    pine: FoliageHslRange;
  };
}

export const TRACK_THEMES: Record<SuzukaTrackThemeId, SuzukaTrackThemeConfig> = {
  SUZUKA_SPRING_DAY: {
    id: 'SUZUKA_SPRING_DAY',
    emoji: '🌸',
    nameEn: 'Spring Sakura GP',
    nameJa: '春のさくらGP',
    shortEn: 'Spring Sakura',
    shortJa: 'さくら',
    descEn: 'Clear blue sky, emerald turf & pink cherry blossoms',
    descJa: '青空と桜並木がひろがる定番の鈴鹿コース',
    gantrySubText: 'START / FINISH · 鈴鹿さくらGP',
    badgeClass: 'bg-pink-500/20 text-pink-200 border-pink-400/50',
    cardBorderSelected: 'border-pink-500 ring-2 ring-pink-400/40',
    cardBgSelected: 'bg-pink-50/90 dark:bg-pink-950/45 text-pink-950 dark:text-pink-100',

    sceneBackgroundHex: 0x9bd2fc,
    fogHex: 0x9bd2fc,
    fogDensity: 0.00068,
    zenithHex: 0x1b5ec0,
    midSkyHex: 0x4ca6f5,
    horizonHex: 0xc2e6ff,
    sunDir: [300, 450, 200],
    sunColorHex: 0xffedd6,
    cloudShadowHex: 0xbfd9f7,
    cloudLitHex: 0xffffff,
    starIntensity: 0.0,

    hemiSkyHex: 0xe0f2fe,
    hemiGroundHex: 0x2d5a27,
    hemiIntensity: 0.78,
    dirColorHex: 0xfff5e0,
    dirIntensity: 1.38,
    exposure: 1.12,

    turfBgHex: '#2d6e32',
    turfStripeA: '#2b6a2f',
    turfStripeB: '#357e39',
    turfSpeckles: [
      'rgba(74, 168, 78, 0.36)',
      'rgba(28, 74, 32, 0.34)',
      'rgba(54, 136, 58, 0.30)',
    ],

    vergeTurfHex: '#15803d',
    vergeLineHex: '#f8fafc',
    vergeGravelBaseHex: '#d6c7b2',
    vergeGravelSpeckleA: '#b8a68e',
    vergeGravelSpeckleB: '#e7dac6',

    asphaltBgHex: '#1b2029',
    asphaltGrooveRgba: 'rgba(10, 12, 17, 0.45)',
    asphaltRedBgHex: '#881b20',
    asphaltRedGrooveRgba: 'rgba(45, 8, 12, 0.32)',
    roadEmissiveHex: 0x000000,
    roadEmissiveIntensity: 0.0,
    redRoadEmissiveHex: 0x000000,
    redRoadEmissiveIntensity: 0.0,

    kerbPrimaryHex: 0xe81c28,
    kerbSecondaryHex: 0xfcfcff,

    concreteHex: 0x94a3b8,
    steelHex: 0x475569,
    pitBuildingHex: 0xe2e8f0,
    glassHex: 0x0284c7,
    glassEmissiveIntensity: 0.0,

    fujiBaseHex: 0x3b5998,
    fujiCapHex: 0xf8fafc,
    mountainValleyHex: 0x5b8a72,
    mountainMidHex: 0x2d5a40,
    mountainCrestHex: 0xe2e8f0,
    mountainColors: [0xdbeafe, 0xe2e8f0, 0xcbd5e1, 0xd1fae5, 0xe0f2fe],

    cloudMeshHex: 0xffffff,
    cloudEmissiveIntensity: 0.0,
    balloonEmissiveIntensity: 0.0,
    floodGlowHex: 0xfef08a,
    floodEmissiveIntensity: 1.4,
    signEmissiveIntensity: 0.0,
    ferrisRimHex: 0xf8fafc,
    ferrisRimEmissiveHex: 0x000000,
    ferrisEmissiveIntensity: 0.0,
    towerWindowBg: '#0f172a',
    towerWindowColorA: '#38bdf8',
    towerWindowColorB: '#0284c7',
    towerWindowEmissiveIntensity: 0.0,
    crowdBrightness: 1.0,

    treeFoliage: {
      sakura: { hMin: 0.93, hRange: 0.03, sMin: 0.88, sRange: 0.0, lMin: 0.64, lRange: 0.08 },
      cedar: { hMin: 0.32, hRange: 0.04, sMin: 0.58, sRange: 0.0, lMin: 0.28, lRange: 0.08 },
      pine: { hMin: 0.34, hRange: 0.03, sMin: 0.54, sRange: 0.0, lMin: 0.23, lRange: 0.08 },
    },
  },

  TOKYO_NIGHT_LIGHTS: {
    id: 'TOKYO_NIGHT_LIGHTS',
    emoji: '🌃',
    nameEn: 'Night Lights GP',
    nameJa: 'ナイト照明GP',
    shortEn: 'Night GP',
    shortJa: 'ナイトGP',
    descEn: 'Starry twilight sky, glowing stadium towers & lit Ferris wheel',
    descJa: '星空とスタジアム照明・光る観覧車が輝くナイター',
    gantrySubText: 'NIGHT GRAND PRIX · 鈴鹿ナイター',
    badgeClass: 'bg-indigo-500/25 text-cyan-200 border-cyan-400/50',
    cardBorderSelected: 'border-indigo-500 ring-2 ring-indigo-400/40',
    cardBgSelected: 'bg-indigo-50/90 dark:bg-indigo-950/55 text-indigo-950 dark:text-indigo-100',

    sceneBackgroundHex: 0x0d1b3e,
    fogHex: 0x10224e,
    fogDensity: 0.00054,
    zenithHex: 0x050c24,
    midSkyHex: 0x0f2252,
    horizonHex: 0x24447d,
    sunDir: [-160, 290, -480],
    sunColorHex: 0xdbeafe,
    cloudShadowHex: 0x182b57,
    cloudLitHex: 0x4b6fb0,
    starIntensity: 0.95,

    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x1e293b,
    hemiIntensity: 1.05,
    dirColorHex: 0xe0f2fe,
    dirIntensity: 1.22,
    exposure: 1.2,

    turfBgHex: '#164428',
    turfStripeA: '#143d24',
    turfStripeB: '#1c5230',
    turfSpeckles: [
      'rgba(52, 211, 153, 0.22)',
      'rgba(10, 35, 20, 0.35)',
      'rgba(34, 197, 94, 0.20)',
    ],

    vergeTurfHex: '#0f5132',
    vergeLineHex: '#e2e8f0',
    vergeGravelBaseHex: '#64748b',
    vergeGravelSpeckleA: '#475569',
    vergeGravelSpeckleB: '#94a3b8',

    asphaltBgHex: '#1f2839',
    asphaltGrooveRgba: 'rgba(10, 14, 24, 0.48)',
    asphaltRedBgHex: '#9f1d22',
    asphaltRedGrooveRgba: 'rgba(55, 8, 12, 0.35)',
    roadEmissiveHex: 0x172554,
    roadEmissiveIntensity: 0.22,
    redRoadEmissiveHex: 0x7f1d1d,
    redRoadEmissiveIntensity: 0.38,

    kerbPrimaryHex: 0xf43f5e,
    kerbSecondaryHex: 0xf8fafc,

    concreteHex: 0x64748b,
    steelHex: 0x334155,
    pitBuildingHex: 0x94a3b8,
    glassHex: 0x38bdf8,
    glassEmissiveIntensity: 0.45,

    fujiBaseHex: 0x1e3a5f,
    fujiCapHex: 0xdbeafe,
    mountainValleyHex: 0x1e3a5f,
    mountainMidHex: 0x172554,
    mountainCrestHex: 0x64748b,
    mountainColors: [0x94a3b8, 0xcbd5e1, 0x93c5fd, 0xa5b4fc, 0xcbd5e1],

    cloudMeshHex: 0x475569,
    cloudEmissiveIntensity: 0.08,
    balloonEmissiveIntensity: 0.55,
    floodGlowHex: 0xfef9c3,
    floodEmissiveIntensity: 3.2,
    signEmissiveIntensity: 0.65,
    ferrisRimHex: 0xe2e8f0,
    ferrisRimEmissiveHex: 0x38bdf8,
    ferrisEmissiveIntensity: 0.78,
    towerWindowBg: '#090d16',
    towerWindowColorA: '#fbbf24',
    towerWindowColorB: '#38bdf8',
    towerWindowEmissiveIntensity: 0.95,
    crowdBrightness: 0.85,

    treeFoliage: {
      sakura: { hMin: 0.88, hRange: 0.04, sMin: 0.55, sRange: 0.1, lMin: 0.42, lRange: 0.08 },
      cedar: { hMin: 0.40, hRange: 0.05, sMin: 0.48, sRange: 0.06, lMin: 0.22, lRange: 0.06 },
      pine: { hMin: 0.44, hRange: 0.05, sMin: 0.45, sRange: 0.06, lMin: 0.18, lRange: 0.06 },
    },
  },

  AUTUMN_MOMIJI_SUNSET: {
    id: 'AUTUMN_MOMIJI_SUNSET',
    emoji: '🍁',
    nameEn: 'Autumn Momiji GP',
    nameJa: '紅葉サンセットGP',
    shortEn: 'Autumn Sunset',
    shortJa: '紅葉夕焼け',
    descEn: 'Golden-hour sunset over crimson maples & ginkgo trees',
    descJa: '夕焼けの富士と赤・黄色の紅葉が彩る秋の鈴鹿',
    gantrySubText: 'AUTUMN MOMIJI · 紅葉グランプリ',
    badgeClass: 'bg-orange-500/20 text-amber-200 border-orange-400/50',
    cardBorderSelected: 'border-orange-500 ring-2 ring-orange-400/40',
    cardBgSelected: 'bg-orange-50/90 dark:bg-orange-950/45 text-orange-950 dark:text-orange-100',

    sceneBackgroundHex: 0xf4a261,
    fogHex: 0xe9966b,
    fogDensity: 0.0007,
    zenithHex: 0x3b2a5c,
    midSkyHex: 0xc85a48,
    horizonHex: 0xffcb77,
    sunDir: [-260, 145, -520],
    sunColorHex: 0xffae42,
    cloudShadowHex: 0x9c627a,
    cloudLitHex: 0xffe0a3,
    starIntensity: 0.0,

    hemiSkyHex: 0xfed7aa,
    hemiGroundHex: 0x452b18,
    hemiIntensity: 0.82,
    dirColorHex: 0xffbb66,
    dirIntensity: 1.48,
    exposure: 1.08,

    turfBgHex: '#4d6826',
    turfStripeA: '#476023',
    turfStripeB: '#5c752b',
    turfSpeckles: [
      'rgba(217, 119, 6, 0.28)',
      'rgba(120, 90, 24, 0.30)',
      'rgba(132, 169, 60, 0.32)',
    ],

    vergeTurfHex: '#6b7f26',
    vergeLineHex: '#fef3c7',
    vergeGravelBaseHex: '#cbb396',
    vergeGravelSpeckleA: '#a68968',
    vergeGravelSpeckleB: '#e4cfb3',

    asphaltBgHex: '#1e2026',
    asphaltGrooveRgba: 'rgba(14, 12, 15, 0.45)',
    asphaltRedBgHex: '#9a1b22',
    asphaltRedGrooveRgba: 'rgba(45, 8, 12, 0.32)',
    roadEmissiveHex: 0x000000,
    roadEmissiveIntensity: 0.0,
    redRoadEmissiveHex: 0x000000,
    redRoadEmissiveIntensity: 0.0,

    kerbPrimaryHex: 0xdc2626,
    kerbSecondaryHex: 0xfefce8,

    concreteHex: 0x9ca3af,
    steelHex: 0x52525b,
    pitBuildingHex: 0xf1e8dc,
    glassHex: 0xea580c,
    glassEmissiveIntensity: 0.15,

    fujiBaseHex: 0x4c3563,
    fujiCapHex: 0xffe4d6,
    mountainValleyHex: 0x8c564b,
    mountainMidHex: 0x593a47,
    mountainCrestHex: 0xfbd3b4,
    mountainColors: [0xfde68a, 0xfed7aa, 0xfecdd3, 0xfdba74, 0xfef3c7],

    cloudMeshHex: 0xffedd5,
    cloudEmissiveIntensity: 0.0,
    balloonEmissiveIntensity: 0.15,
    floodGlowHex: 0xfdba74,
    floodEmissiveIntensity: 1.9,
    signEmissiveIntensity: 0.18,
    ferrisRimHex: 0xfef3c7,
    ferrisRimEmissiveHex: 0xf59e0b,
    ferrisEmissiveIntensity: 0.25,
    towerWindowBg: '#1e1b2e',
    towerWindowColorA: '#fb923c',
    towerWindowColorB: '#facc15',
    towerWindowEmissiveIntensity: 0.35,
    crowdBrightness: 0.95,

    treeFoliage: {
      sakura: { hMin: 0.99, hRange: 0.055, sMin: 0.85, sRange: 0.1, lMin: 0.40, lRange: 0.12 },
      cedar: { hMin: 0.10, hRange: 0.04, sMin: 0.85, sRange: 0.1, lMin: 0.48, lRange: 0.10 },
      pine: { hMin: 0.25, hRange: 0.06, sMin: 0.46, sRange: 0.08, lMin: 0.23, lRange: 0.07 },
    },
  },

  HOKKAIDO_WINTER_SNOW: {
    id: 'HOKKAIDO_WINTER_SNOW',
    emoji: '❄️',
    nameEn: 'Snowy Winter GP',
    nameJa: '雪景色ウィンターGP',
    shortEn: 'Snowy Winter',
    shortJa: '雪景色',
    descEn: 'Crisp snowfields, alpine evergreens & frosted mountain peaks',
    descJa: '白銀のコースと冬山を駆け抜ける爽快スノーステージ',
    gantrySubText: 'WINTER SNOW GP · 雪の鈴鹿',
    badgeClass: 'bg-sky-500/20 text-sky-100 border-sky-300/50',
    cardBorderSelected: 'border-sky-500 ring-2 ring-sky-400/40',
    cardBgSelected: 'bg-sky-50/90 dark:bg-sky-950/45 text-sky-950 dark:text-sky-100',

    sceneBackgroundHex: 0xbfe3ff,
    fogHex: 0xd6ecff,
    fogDensity: 0.00065,
    zenithHex: 0x225ea8,
    midSkyHex: 0x6cb8f6,
    horizonHex: 0xe6f3ff,
    sunDir: [280, 420, 220],
    sunColorHex: 0xf0f9ff,
    cloudShadowHex: 0xc2d8ee,
    cloudLitHex: 0xffffff,
    starIntensity: 0.0,

    hemiSkyHex: 0xf0f9ff,
    hemiGroundHex: 0x7aa2cc,
    hemiIntensity: 0.78,
    dirColorHex: 0xf8fafc,
    dirIntensity: 1.15,
    exposure: 0.98,

    turfBgHex: '#dcebf8',
    turfStripeA: '#d4e5f5',
    turfStripeB: '#e4effa',
    turfSpeckles: [
      'rgba(147, 197, 253, 0.35)',
      'rgba(255, 255, 255, 0.55)',
      'rgba(186, 215, 245, 0.35)',
    ],

    vergeTurfHex: '#0284c7',
    vergeLineHex: '#ffffff',
    vergeGravelBaseHex: '#cbd5e1',
    vergeGravelSpeckleA: '#94a3b8',
    vergeGravelSpeckleB: '#f1f5f9',

    asphaltBgHex: '#1a2230',
    asphaltGrooveRgba: 'rgba(10, 14, 22, 0.48)',
    asphaltRedBgHex: '#9f1239',
    asphaltRedGrooveRgba: 'rgba(50, 8, 20, 0.32)',
    roadEmissiveHex: 0x000000,
    roadEmissiveIntensity: 0.0,
    redRoadEmissiveHex: 0x000000,
    redRoadEmissiveIntensity: 0.0,

    kerbPrimaryHex: 0xe11d48,
    kerbSecondaryHex: 0xf1f5f9,

    concreteHex: 0xa5b4c7,
    steelHex: 0x475569,
    pitBuildingHex: 0xf1f5f9,
    glassHex: 0x0ea5e9,
    glassEmissiveIntensity: 0.0,

    fujiBaseHex: 0x476899,
    fujiCapHex: 0xffffff,
    mountainValleyHex: 0x8aa8c7,
    mountainMidHex: 0x527194,
    mountainCrestHex: 0xf8fafc,
    mountainColors: [0xe0f2fe, 0xf1f5f9, 0xdbeafe, 0xe2e8f0, 0xf8fafc],

    cloudMeshHex: 0xffffff,
    cloudEmissiveIntensity: 0.0,
    balloonEmissiveIntensity: 0.0,
    floodGlowHex: 0xe0f2fe,
    floodEmissiveIntensity: 1.2,
    signEmissiveIntensity: 0.0,
    ferrisRimHex: 0xf8fafc,
    ferrisRimEmissiveHex: 0x000000,
    ferrisEmissiveIntensity: 0.0,
    towerWindowBg: '#0f172a',
    towerWindowColorA: '#7dd3fc',
    towerWindowColorB: '#38bdf8',
    towerWindowEmissiveIntensity: 0.1,
    crowdBrightness: 1.0,

    treeFoliage: {
      sakura: { hMin: 0.55, hRange: 0.04, sMin: 0.25, sRange: 0.12, lMin: 0.80, lRange: 0.12 },
      cedar: { hMin: 0.50, hRange: 0.05, sMin: 0.35, sRange: 0.08, lMin: 0.42, lRange: 0.10 },
      pine: { hMin: 0.46, hRange: 0.04, sMin: 0.42, sRange: 0.06, lMin: 0.28, lRange: 0.08 },
    },
  },
};

export const TRACK_THEME_LIST: SuzukaTrackThemeConfig[] = [
  TRACK_THEMES.SUZUKA_SPRING_DAY,
  TRACK_THEMES.TOKYO_NIGHT_LIGHTS,
  TRACK_THEMES.AUTUMN_MOMIJI_SUNSET,
  TRACK_THEMES.HOKKAIDO_WINTER_SNOW,
];

export function isValidTrackThemeId(id?: string | null): id is SuzukaTrackThemeId {
  return Boolean(id && Object.prototype.hasOwnProperty.call(TRACK_THEMES, id));
}

export function getTrackTheme(themeId?: string | null): SuzukaTrackThemeConfig {
  if (isValidTrackThemeId(themeId)) {
    return TRACK_THEMES[themeId];
  }
  return TRACK_THEMES[DEFAULT_TRACK_THEME_ID];
}

/**
 * Resolves a teacher's theme selection (`'RANDOM'` or explicit ID) into a concrete
 * `SuzukaTrackThemeId`. When rolling randomly (e.g. initial room creation or Play Again),
 * excludes `excludeId` if provided so consecutive races never repeat the same biome.
 */
export function resolveTrackThemeId(
  selection?: SuzukaTrackThemeSelection | string | null,
  excludeId?: string | null,
  rng: () => number = Math.random
): SuzukaTrackThemeId {
  if (isValidTrackThemeId(selection)) {
    return selection;
  }

  const candidates =
    TRACK_THEME_LIST.length > 1 && isValidTrackThemeId(excludeId)
      ? TRACK_THEME_LIST.filter((t) => t.id !== excludeId)
      : TRACK_THEME_LIST;

  const r = Math.max(0, Math.min(0.999999, rng()));
  const idx = Math.floor(r * candidates.length);
  return candidates[idx]?.id || DEFAULT_TRACK_THEME_ID;
}

const TRACK_THEME_STORAGE_KEY = 'suzuka_gp_track_theme_v1';

export function getSavedTrackTheme(): SuzukaTrackThemeId {
  try {
    const saved = localStorage.getItem(TRACK_THEME_STORAGE_KEY);
    if (isValidTrackThemeId(saved)) return saved;
  } catch {}
  return DEFAULT_TRACK_THEME_ID;
}

export function saveSavedTrackTheme(themeId: SuzukaTrackThemeId): void {
  try {
    localStorage.setItem(TRACK_THEME_STORAGE_KEY, themeId);
  } catch {}
}
