/**
 * 3D Suzuka Grand Prix: Independent Biome, Time-of-Day (incl. 24h Le Mans Cycle),
 * Cloud Cover, and Precipitation Atmosphere System.
 *
 * Pure data + deterministic selection & interpolation helpers (zero DOM/React/Three
 * runtime imports so the module can be verified directly via `node:test`).
 *
 * Visual swaps and dynamic Le Mans transitions operate strictly on sky shader uniforms,
 * scene lighting/fog, material emissive intensities, and a single camera-anchored
 * GPU vertex-shader precipitation points pass — preserving the Classroom 3D WebGL budget.
 */

export type SuzukaBiomeId = 'TEMPERATE' | 'DESERT' | 'SNOW';

/** Canonical Track Theme ID (synonymous with Biome ID). */
export type SuzukaTrackThemeId = SuzukaBiomeId;

export type SuzukaTrackThemeSelection = SuzukaTrackThemeId | 'RANDOM';

export const DEFAULT_TRACK_THEME_ID: SuzukaTrackThemeId = 'TEMPERATE';

export type SuzukaTimeOfDayId =
  | 'SUNRISE'
  | 'NOON'
  | 'SUNSET'
  | 'NIGHT'
  | 'LE_MANS_CYCLE';

export type SuzukaTimeOfDaySelection = SuzukaTimeOfDayId | 'RANDOM';

export const DEFAULT_TIME_OF_DAY_ID: SuzukaTimeOfDayId = 'LE_MANS_CYCLE';

export type SuzukaCloudCoverId = 'CLEAR' | 'PARTLY_CLOUDY' | 'OVERCAST';

export type SuzukaCloudCoverSelection = SuzukaCloudCoverId | 'RANDOM';

export const DEFAULT_CLOUD_COVER_ID: SuzukaCloudCoverId = 'PARTLY_CLOUDY';

export type SuzukaPrecipitationId =
  | 'NONE'
  | 'LIGHT_RAIN'
  | 'HEAVY_RAIN'
  | 'LIGHT_SNOW'
  | 'HEAVY_SNOW';

export type SuzukaPrecipitationSelection = SuzukaPrecipitationId | 'RANDOM';

export const DEFAULT_PRECIPITATION_ID: SuzukaPrecipitationId = 'NONE';

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

  /** Sensible default weather pairings when this biome is chosen */
  defaultTimeOfDay: SuzukaTimeOfDayId;
  defaultCloudCover: SuzukaCloudCoverId;
  defaultPrecipitation: SuzukaPrecipitationId;

  // Base (Noon Clear/Partly-Cloudy) Sky dome shader + Scene background & fog
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

  // Base Lighting & tone mapping
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

  // Distant Mountains & Centerpiece Peak (Mt. Fuji / Red-Rock Mesa / Alpine Peak)
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

  // Instanced foliage HSL tint ranges (for TEMPERATE/SNOW trees or DESERT cacti/boulders/palms)
  treeFoliage: {
    sakura: FoliageHslRange;
    cedar: FoliageHslRange;
    pine: FoliageHslRange;
  };
}

export const TRACK_THEMES: Record<SuzukaTrackThemeId, SuzukaTrackThemeConfig> = {
  TEMPERATE: {
    id: 'TEMPERATE',
    emoji: '🌸',
    nameEn: 'Temperate Suzuka',
    nameJa: '温暖・鈴鹿さくらコース',
    shortEn: 'Temperate',
    shortJa: '温暖・緑',
    descEn: 'Emerald turf, cherry blossoms, evergreens & Mt. Fuji panorama',
    descJa: '芝生と桜並木・松林が広がる定番の鈴鹿サーキット',
    gantrySubText: 'START / FINISH · 鈴鹿グランプリ',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
    cardBorderSelected: 'border-emerald-500 ring-2 ring-emerald-400/40',
    cardBgSelected: 'bg-emerald-50/90 dark:bg-emerald-950/45 text-emerald-950 dark:text-emerald-100',

    defaultTimeOfDay: 'LE_MANS_CYCLE',
    defaultCloudCover: 'PARTLY_CLOUDY',
    defaultPrecipitation: 'NONE',

    sceneBackgroundHex: 0x9bd2fc,
    fogHex: 0x9bd2fc,
    fogDensity: 0.00062,
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
    roadEmissiveHex: 0x172554,
    roadEmissiveIntensity: 0.0,
    redRoadEmissiveHex: 0x7f1d1d,
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
    ferrisRimEmissiveHex: 0x38bdf8,
    ferrisEmissiveIntensity: 0.0,
    towerWindowBg: '#0f172a',
    towerWindowColorA: '#fbbf24',
    towerWindowColorB: '#38bdf8',
    towerWindowEmissiveIntensity: 0.0,
    crowdBrightness: 1.0,

    treeFoliage: {
      sakura: { hMin: 0.93, hRange: 0.03, sMin: 0.88, sRange: 0.0, lMin: 0.64, lRange: 0.08 },
      cedar: { hMin: 0.32, hRange: 0.04, sMin: 0.58, sRange: 0.0, lMin: 0.28, lRange: 0.08 },
      pine: { hMin: 0.34, hRange: 0.03, sMin: 0.54, sRange: 0.0, lMin: 0.23, lRange: 0.08 },
    },
  },

  DESERT: {
    id: 'DESERT',
    emoji: '🏜️',
    nameEn: 'Desert Canyon',
    nameJa: '砂漠キャニオン',
    shortEn: 'Desert',
    shortJa: '砂漠',
    descEn: 'Golden sand dunes, red-rock canyon mesas & saguaro cacti',
    descJa: '黄金の砂丘と赤岩の渓谷・サボテンが並ぶデザートコース',
    gantrySubText: 'DESERT CANYON GP · 砂漠グランプリ',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
    cardBorderSelected: 'border-amber-500 ring-2 ring-amber-400/40',
    cardBgSelected: 'bg-amber-50/90 dark:bg-amber-950/45 text-amber-950 dark:text-amber-100',

    defaultTimeOfDay: 'LE_MANS_CYCLE',
    defaultCloudCover: 'CLEAR',
    defaultPrecipitation: 'NONE',

    sceneBackgroundHex: 0xf6d49e,
    fogHex: 0xf2c98a,
    fogDensity: 0.00066,
    zenithHex: 0x1e6bb8,
    midSkyHex: 0x6ab3e8,
    horizonHex: 0xffe4b5,
    sunDir: [320, 470, 180],
    sunColorHex: 0xfff0c2,
    cloudShadowHex: 0xd9c2a3,
    cloudLitHex: 0xfffbf0,
    starIntensity: 0.0,

    hemiSkyHex: 0xffedd5,
    hemiGroundHex: 0x8c5828,
    hemiIntensity: 0.84,
    dirColorHex: 0xffe8b8,
    dirIntensity: 1.48,
    exposure: 1.10,

    turfBgHex: '#d49b54',
    turfStripeA: '#cb914a',
    turfStripeB: '#dda55e',
    turfSpeckles: [
      'rgba(180, 112, 42, 0.36)',
      'rgba(245, 208, 144, 0.38)',
      'rgba(146, 84, 32, 0.30)',
    ],

    vergeTurfHex: '#b45309',
    vergeLineHex: '#fef3c7',
    vergeGravelBaseHex: '#e2b887',
    vergeGravelSpeckleA: '#c28d52',
    vergeGravelSpeckleB: '#f5d7b0',

    asphaltBgHex: '#211f24',
    asphaltGrooveRgba: 'rgba(14, 12, 16, 0.45)',
    asphaltRedBgHex: '#9a231b',
    asphaltRedGrooveRgba: 'rgba(48, 10, 8, 0.32)',
    roadEmissiveHex: 0x291d12,
    roadEmissiveIntensity: 0.0,
    redRoadEmissiveHex: 0x7f1d1d,
    redRoadEmissiveIntensity: 0.0,

    kerbPrimaryHex: 0xd97706,
    kerbSecondaryHex: 0xfefce8,

    concreteHex: 0xb89f84,
    steelHex: 0x57534e,
    pitBuildingHex: 0xf5ebe0,
    glassHex: 0x0284c7,
    glassEmissiveIntensity: 0.0,

    fujiBaseHex: 0x9a3412,
    fujiCapHex: 0xfdba74,
    mountainValleyHex: 0xb45309,
    mountainMidHex: 0x9a3412,
    mountainCrestHex: 0xfde68a,
    mountainColors: [0xfed7aa, 0xfdba74, 0xfcd34d, 0xfecdd3, 0xffedd5],

    cloudMeshHex: 0xfff7ed,
    cloudEmissiveIntensity: 0.0,
    balloonEmissiveIntensity: 0.0,
    floodGlowHex: 0xfef08a,
    floodEmissiveIntensity: 1.4,
    signEmissiveIntensity: 0.0,
    ferrisRimHex: 0xfef3c7,
    ferrisRimEmissiveHex: 0xf59e0b,
    ferrisEmissiveIntensity: 0.0,
    towerWindowBg: '#1c1917',
    towerWindowColorA: '#fbbf24',
    towerWindowColorB: '#fb923c',
    towerWindowEmissiveIntensity: 0.0,
    crowdBrightness: 1.0,

    // In DESERT:
    // - pine -> Saguaro Cactus (desert sage/olive green)
    // - cedar -> Red-Rock Sandstone Boulders / Hoodoo Spires (terracotta/ochre)
    // - sakura -> Oasis Fan Palms & Agave Scrub (warm desert palm green)
    treeFoliage: {
      sakura: { hMin: 0.24, hRange: 0.05, sMin: 0.55, sRange: 0.12, lMin: 0.36, lRange: 0.10 },
      cedar: { hMin: 0.05, hRange: 0.04, sMin: 0.62, sRange: 0.12, lMin: 0.44, lRange: 0.12 },
      pine: { hMin: 0.28, hRange: 0.04, sMin: 0.52, sRange: 0.10, lMin: 0.32, lRange: 0.08 },
    },
  },

  SNOW: {
    id: 'SNOW',
    emoji: '❄️',
    nameEn: 'Alpine Snow',
    nameJa: '雪景色・アルペンコース',
    shortEn: 'Snow',
    shortJa: '雪景色',
    descEn: 'Crisp snowfields, frosted alpine evergreens & icy mountain peaks',
    descJa: '白銀の雪原と樹氷・冬山を駆け抜けるスノーステージ',
    gantrySubText: 'WINTER SNOW GP · 雪の鈴鹿',
    badgeClass: 'bg-sky-500/20 text-sky-100 border-sky-300/50',
    cardBorderSelected: 'border-sky-500 ring-2 ring-sky-400/40',
    cardBgSelected: 'bg-sky-50/90 dark:bg-sky-950/45 text-sky-950 dark:text-sky-100',

    defaultTimeOfDay: 'LE_MANS_CYCLE',
    defaultCloudCover: 'PARTLY_CLOUDY',
    defaultPrecipitation: 'LIGHT_SNOW',

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
    roadEmissiveHex: 0x172554,
    roadEmissiveIntensity: 0.0,
    redRoadEmissiveHex: 0x7f1d1d,
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
    ferrisRimEmissiveHex: 0x38bdf8,
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
  TRACK_THEMES.TEMPERATE,
  TRACK_THEMES.DESERT,
  TRACK_THEMES.SNOW,
];

// Legacy biome alias map so saved rooms or older links never break
const LEGACY_BIOME_ALIASES: Record<string, SuzukaTrackThemeId> = {
  SUZUKA_SPRING_DAY: 'TEMPERATE',
  TOKYO_NIGHT_LIGHTS: 'TEMPERATE',
  AUTUMN_MOMIJI_SUNSET: 'TEMPERATE',
  HOKKAIDO_WINTER_SNOW: 'SNOW',
};

export function isValidTrackThemeId(id?: string | null): id is SuzukaTrackThemeId {
  return Boolean(id && Object.prototype.hasOwnProperty.call(TRACK_THEMES, id));
}

export function normalizeTrackThemeId(id?: string | null): SuzukaTrackThemeId | null {
  if (!id) return null;
  if (isValidTrackThemeId(id)) return id;
  if (Object.prototype.hasOwnProperty.call(LEGACY_BIOME_ALIASES, id)) {
    return LEGACY_BIOME_ALIASES[id];
  }
  return null;
}

export function getTrackTheme(themeId?: string | null): SuzukaTrackThemeConfig {
  const norm = normalizeTrackThemeId(themeId);
  if (norm) {
    return TRACK_THEMES[norm];
  }
  return TRACK_THEMES[DEFAULT_TRACK_THEME_ID];
}

/**
 * Resolves a teacher's biome selection (`'RANDOM'` or explicit ID) into a concrete
 * `SuzukaTrackThemeId`. Excludes `excludeId` when rolling randomly so consecutive
 * races never repeat the same biome.
 */
export function resolveTrackThemeId(
  selection?: SuzukaTrackThemeSelection | string | null,
  excludeId?: string | null,
  rng: () => number = Math.random
): SuzukaTrackThemeId {
  if (selection && selection !== 'RANDOM') {
    const norm = normalizeTrackThemeId(selection);
    if (norm) return norm;
  }

  const normExclude = normalizeTrackThemeId(excludeId);
  const candidates =
    TRACK_THEME_LIST.length > 1 && normExclude
      ? TRACK_THEME_LIST.filter((t) => t.id !== normExclude)
      : TRACK_THEME_LIST;

  const r = Math.max(0, Math.min(0.999999, rng()));
  const idx = Math.floor(r * candidates.length);
  return candidates[idx]?.id || DEFAULT_TRACK_THEME_ID;
}

// ============================================================================
// Time of Day & 24 Hours of Le Mans Dynamic Progression
// ============================================================================

export interface SuzukaTimeOfDayPreset {
  id: SuzukaTimeOfDayId;
  emoji: string;
  shortEn: string;
  shortJa: string;
  nameEn: string;
  nameJa: string;
  descEn: string;
  descJa: string;
}

export const TIME_OF_DAY_LIST: SuzukaTimeOfDayPreset[] = [
  {
    id: 'LE_MANS_CYCLE',
    emoji: '⏱️',
    shortEn: 'Le Mans 24h',
    shortJa: 'ル・マン進行',
    nameEn: 'Le Mans Cycle (Sunrise → Midnight)',
    nameJa: 'ル・マン24時間風 (日の出→深夜)',
    descEn: 'Starts at sunrise and progresses through noon & sunset to midnight at the finish!',
    descJa: '日の出にスタートし、昼・夕焼けを経て深夜のゴールへ刻々と変化！',
  },
  {
    id: 'SUNRISE',
    emoji: '🌅',
    shortEn: 'Sunrise',
    shortJa: '日の出',
    nameEn: 'Golden Sunrise',
    nameJa: '朝焼け・日の出',
    descEn: 'Warm rose-gold eastern sun & crisp morning mist',
    descJa: '東の空が薔薇色に染まる爽やかな朝焼け',
  },
  {
    id: 'NOON',
    emoji: '☀️',
    shortEn: 'High Noon',
    shortJa: '真昼',
    nameEn: 'Bright High Noon',
    nameJa: '真昼・デイゲーム',
    descEn: 'Clear overhead sun & vivid daytime visibility',
    descJa: '太陽が高く昇る明るいデイゲーム',
  },
  {
    id: 'SUNSET',
    emoji: '🌇',
    shortEn: 'Sunset',
    shortJa: '夕焼け',
    nameEn: 'Crimson Sunset',
    nameJa: '夕焼け・サンセット',
    descEn: 'Golden-hour twilight sky with glowing trackside lights',
    descJa: '黄金色の夕焼けと点灯し始めるスタジアム照明',
  },
  {
    id: 'NIGHT',
    emoji: '🌃',
    shortEn: 'Midnight',
    shortJa: '深夜ナイター',
    nameEn: 'Starry Midnight GP',
    nameJa: '星空の深夜ナイター',
    descEn: 'Starfield sky, full stadium floodlights & neon Ferris wheel',
    descJa: '満天の星空とカクテル照明・観覧車が輝くナイター',
  },
];

export function isValidTimeOfDayId(id?: string | null): id is SuzukaTimeOfDayId {
  return Boolean(id && TIME_OF_DAY_LIST.some((item) => item.id === id));
}

export function getTimeOfDayPreset(id?: string | null): SuzukaTimeOfDayPreset {
  return TIME_OF_DAY_LIST.find((item) => item.id === id) || TIME_OF_DAY_LIST[0];
}

export function resolveTimeOfDayId(
  selection?: SuzukaTimeOfDaySelection | string | null,
  excludeId?: string | null,
  rng: () => number = Math.random
): SuzukaTimeOfDayId {
  if (isValidTimeOfDayId(selection)) {
    return selection;
  }
  const candidates =
    TIME_OF_DAY_LIST.length > 1 && isValidTimeOfDayId(excludeId)
      ? TIME_OF_DAY_LIST.filter((t) => t.id !== excludeId)
      : TIME_OF_DAY_LIST;
  const r = Math.max(0, Math.min(0.999999, rng()));
  return candidates[Math.floor(r * candidates.length)]?.id || DEFAULT_TIME_OF_DAY_ID;
}

export interface LeMansPhaseBadge {
  emoji: string;
  labelEn: string;
  labelJa: string;
}

/**
 * Returns a human-readable phase label for the current Le Mans progression (`0.0` = Sunrise -> `1.0` = Midnight).
 */
export function getLeMansPhaseBadge(progress01: number): LeMansPhaseBadge {
  const p = Math.max(0, Math.min(1, progress01));
  if (p < 0.14) return { emoji: '🌅', labelEn: 'Sunrise', labelJa: '日の出' };
  if (p < 0.34) return { emoji: '🌤️', labelEn: 'Morning', labelJa: '午前' };
  if (p < 0.56) return { emoji: '☀️', labelEn: 'High Noon', labelJa: '真昼' };
  if (p < 0.74) return { emoji: '🌤️', labelEn: 'Afternoon', labelJa: '午後' };
  if (p < 0.90) return { emoji: '🌇', labelEn: 'Sunset', labelJa: '夕焼け' };
  return { emoji: '🌃', labelEn: 'Midnight', labelJa: '深夜' };
}

// ============================================================================
// Weather: Cloud Cover & Precipitation
// ============================================================================

export interface SuzukaCloudCoverPreset {
  id: SuzukaCloudCoverId;
  emoji: string;
  shortEn: string;
  shortJa: string;
  cloudCoverage: number; // 0..1 shader coverage
}

export const CLOUD_COVER_LIST: SuzukaCloudCoverPreset[] = [
  { id: 'CLEAR', emoji: '☀️', shortEn: 'Clear Sky', shortJa: '快晴', cloudCoverage: 0.08 },
  { id: 'PARTLY_CLOUDY', emoji: '⛅', shortEn: 'Partly Cloudy', shortJa: '晴れ時々くもり', cloudCoverage: 0.52 },
  { id: 'OVERCAST', emoji: '☁️', shortEn: 'Overcast', shortJa: '曇天', cloudCoverage: 0.88 },
];

export function isValidCloudCoverId(id?: string | null): id is SuzukaCloudCoverId {
  return Boolean(id && CLOUD_COVER_LIST.some((c) => c.id === id));
}

export function getCloudCoverPreset(id?: string | null): SuzukaCloudCoverPreset {
  return CLOUD_COVER_LIST.find((c) => c.id === id) || CLOUD_COVER_LIST[1];
}

export function resolveCloudCoverId(
  selection?: SuzukaCloudCoverSelection | string | null,
  excludeId?: string | null,
  rng: () => number = Math.random
): SuzukaCloudCoverId {
  if (isValidCloudCoverId(selection)) {
    return selection;
  }
  const candidates =
    CLOUD_COVER_LIST.length > 1 && isValidCloudCoverId(excludeId)
      ? CLOUD_COVER_LIST.filter((c) => c.id !== excludeId)
      : CLOUD_COVER_LIST;
  const r = Math.max(0, Math.min(0.999999, rng()));
  return candidates[Math.floor(r * candidates.length)]?.id || DEFAULT_CLOUD_COVER_ID;
}

export interface SuzukaPrecipitationPreset {
  id: SuzukaPrecipitationId;
  emoji: string;
  shortEn: string;
  shortJa: string;
  kind: 'NONE' | 'RAIN' | 'SNOW';
  intensity: number; // 0, 0.5 (light), 1.0 (heavy)
}

export const PRECIPITATION_LIST: SuzukaPrecipitationPreset[] = [
  { id: 'NONE', emoji: '☀️', shortEn: 'Dry / None', shortJa: 'なし(ドライ)', kind: 'NONE', intensity: 0 },
  { id: 'LIGHT_RAIN', emoji: '🌦️', shortEn: 'Light Rain', shortJa: '小雨', kind: 'RAIN', intensity: 0.5 },
  { id: 'HEAVY_RAIN', emoji: '🌧️', shortEn: 'Heavy Rain', shortJa: '大雨', kind: 'RAIN', intensity: 1.0 },
  { id: 'LIGHT_SNOW', emoji: '🌨️', shortEn: 'Light Snow', shortJa: '小雪', kind: 'SNOW', intensity: 0.5 },
  { id: 'HEAVY_SNOW', emoji: '❄️', shortEn: 'Blizzard', shortJa: '大雪・吹雪', kind: 'SNOW', intensity: 1.0 },
];

export function isValidPrecipitationId(id?: string | null): id is SuzukaPrecipitationId {
  return Boolean(id && PRECIPITATION_LIST.some((p) => p.id === id));
}

export function getPrecipitationPreset(id?: string | null): SuzukaPrecipitationPreset {
  return PRECIPITATION_LIST.find((p) => p.id === id) || PRECIPITATION_LIST[0];
}

/**
 * Resolves precipitation selection. Explicit choices are always honored (allowing
 * fun combinations like snowfall in the desert). When rolling `'RANDOM'`, uses
 * sensible biome-aware pools so random rolls feel natural.
 */
export function resolvePrecipitationId(
  selection?: SuzukaPrecipitationSelection | string | null,
  biomeId?: SuzukaTrackThemeId | string | null,
  excludeId?: string | null,
  rng: () => number = Math.random
): SuzukaPrecipitationId {
  if (isValidPrecipitationId(selection)) {
    return selection;
  }

  const normBiome = normalizeTrackThemeId(biomeId) || 'TEMPERATE';
  let pool: SuzukaPrecipitationId[];
  if (normBiome === 'SNOW') {
    pool = ['NONE', 'LIGHT_SNOW', 'HEAVY_SNOW'];
  } else if (normBiome === 'DESERT') {
    pool = ['NONE', 'NONE', 'LIGHT_RAIN'];
  } else {
    pool = ['NONE', 'NONE', 'LIGHT_RAIN', 'HEAVY_RAIN'];
  }

  const filtered = pool.length > 1 && excludeId ? pool.filter((id) => id !== excludeId) : pool;
  const candidates = filtered.length > 0 ? filtered : pool;
  const r = Math.max(0, Math.min(0.999999, rng()));
  return candidates[Math.floor(r * candidates.length)] || 'NONE';
}

// ============================================================================
// Pure Dynamic Atmosphere & Le Mans Lighting Evaluator
// ============================================================================

export interface EvaluatedSuzukaAtmosphere {
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
  cloudCoverage: number;

  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  dirColorHex: number;
  dirIntensity: number;
  exposure: number;
  envIntensity: number;

  nightLightFactor: number;
  floodEmissiveIntensity: number;
  signEmissiveIntensity: number;
  ferrisEmissiveIntensity: number;
  towerWindowEmissiveIntensity: number;
  glassEmissiveIntensity: number;
  balloonEmissiveIntensity: number;
  roadEmissiveIntensity: number;
  redRoadEmissiveIntensity: number;
  roadRoughness: number;
  roadMetalness: number;
  cloudMeshHex: number;
  crowdBrightness: number;
}

interface TimeKeyframe {
  t: number;
  sunDir: [number, number, number];
  zenithHex: number;
  midSkyHex: number;
  horizonHex: number;
  fogHex: number;
  sunColorHex: number;
  cloudShadowHex: number;
  cloudLitHex: number;
  hemiSkyHex: number;
  hemiGroundMul: number;
  hemiIntensity: number;
  dirColorHex: number;
  dirIntensity: number;
  exposure: number;
  envIntensity: number;
  starIntensity: number;
  nightLightFactor: number;
  cloudMeshHex: number;
  crowdBrightness: number;
}

const LE_MANS_KEYFRAMES: TimeKeyframe[] = [
  // 0.00 — Sunrise (Golden-rose eastern horizon)
  {
    t: 0.0,
    sunDir: [480, 95, 180],
    zenithHex: 0x1e3a6e,
    midSkyHex: 0xd96b52,
    horizonHex: 0xffd285,
    fogHex: 0xf0a878,
    sunColorHex: 0xffb35c,
    cloudShadowHex: 0x8f6478,
    cloudLitHex: 0xffe4b5,
    hemiSkyHex: 0xfed7aa,
    hemiGroundMul: 0.72,
    hemiIntensity: 0.76,
    dirColorHex: 0xffc478,
    dirIntensity: 1.26,
    exposure: 1.05,
    envIntensity: 0.82,
    starIntensity: 0.14,
    nightLightFactor: 0.35,
    cloudMeshHex: 0xffedd5,
    crowdBrightness: 0.92,
  },
  // 0.22 — Morning (Fresh climbing sun)
  {
    t: 0.22,
    sunDir: [390, 290, 200],
    zenithHex: 0x1d5bbf,
    midSkyHex: 0x55aaf5,
    horizonHex: 0xd4edff,
    fogHex: 0xaad8fc,
    sunColorHex: 0xfff0d4,
    cloudShadowHex: 0xc2dbf5,
    cloudLitHex: 0xffffff,
    hemiSkyHex: 0xe0f2fe,
    hemiGroundMul: 0.95,
    hemiIntensity: 0.78,
    dirColorHex: 0xfff5e0,
    dirIntensity: 1.34,
    exposure: 1.10,
    envIntensity: 0.96,
    starIntensity: 0.0,
    nightLightFactor: 0.0,
    cloudMeshHex: 0xffffff,
    crowdBrightness: 1.0,
  },
  // 0.46 — High Noon (Uses biome's native noon palette)
  {
    t: 0.46,
    sunDir: [300, 450, 200],
    zenithHex: 0x1b5ec0,
    midSkyHex: 0x4ca6f5,
    horizonHex: 0xc2e6ff,
    fogHex: 0x9bd2fc,
    sunColorHex: 0xffedd6,
    cloudShadowHex: 0xbfd9f7,
    cloudLitHex: 0xffffff,
    hemiSkyHex: 0xe0f2fe,
    hemiGroundMul: 1.0,
    hemiIntensity: 0.80,
    dirColorHex: 0xfff5e0,
    dirIntensity: 1.40,
    exposure: 1.12,
    envIntensity: 1.0,
    starIntensity: 0.0,
    nightLightFactor: 0.0,
    cloudMeshHex: 0xffffff,
    crowdBrightness: 1.0,
  },
  // 0.66 — Late Afternoon (Warm golden-amber slant)
  {
    t: 0.66,
    sunDir: [-170, 290, -320],
    zenithHex: 0x26529c,
    midSkyHex: 0x6ea4d8,
    horizonHex: 0xffe0b2,
    fogHex: 0xebc596,
    sunColorHex: 0xffd28a,
    cloudShadowHex: 0xb8b2c4,
    cloudLitHex: 0xfff3d6,
    hemiSkyHex: 0xffedd5,
    hemiGroundMul: 0.90,
    hemiIntensity: 0.80,
    dirColorHex: 0xffe0a8,
    dirIntensity: 1.38,
    exposure: 1.09,
    envIntensity: 0.92,
    starIntensity: 0.0,
    nightLightFactor: 0.12,
    cloudMeshHex: 0xfff7ed,
    crowdBrightness: 0.98,
  },
  // 0.82 — Crimson Sunset (Golden hour -> twilight)
  {
    t: 0.82,
    sunDir: [-280, 130, -500],
    zenithHex: 0x3b2a5c,
    midSkyHex: 0xc85a48,
    horizonHex: 0xffcb77,
    fogHex: 0xe9966b,
    sunColorHex: 0xffae42,
    cloudShadowHex: 0x9c627a,
    cloudLitHex: 0xffe0a3,
    hemiSkyHex: 0xfed7aa,
    hemiGroundMul: 0.68,
    hemiIntensity: 0.82,
    dirColorHex: 0xffbb66,
    dirIntensity: 1.42,
    exposure: 1.06,
    envIntensity: 0.80,
    starIntensity: 0.18,
    nightLightFactor: 0.58,
    cloudMeshHex: 0xffedd5,
    crowdBrightness: 0.94,
  },
  // 1.00 — Starry Midnight (Full floodlights & stars at finish line)
  {
    t: 1.0,
    sunDir: [-160, 290, -480],
    zenithHex: 0x050c24,
    midSkyHex: 0x0f2252,
    horizonHex: 0x24447d,
    fogHex: 0x10224e,
    sunColorHex: 0xdbeafe,
    cloudShadowHex: 0x182b57,
    cloudLitHex: 0x4b6fb0,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundMul: 0.45,
    hemiIntensity: 1.05,
    dirColorHex: 0xe0f2fe,
    dirIntensity: 1.22,
    exposure: 1.18,
    envIntensity: 0.56,
    starIntensity: 0.95,
    nightLightFactor: 1.0,
    cloudMeshHex: 0x475569,
    crowdBrightness: 0.86,
  },
];

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHexColor(hexA: number, hexB: number, t: number): number {
  const f = Math.max(0, Math.min(1, t));
  const rA = (hexA >> 16) & 0xff;
  const gA = (hexA >> 8) & 0xff;
  const bA = hexA & 0xff;

  const rB = (hexB >> 16) & 0xff;
  const gB = (hexB >> 8) & 0xff;
  const bB = hexB & 0xff;

  const r = Math.round(rA + (rB - rA) * f);
  const g = Math.round(gA + (gB - gA) * f);
  const b = Math.round(bA + (bB - bA) * f);
  return (r << 16) | (g << 8) | b;
}

function scaleHexColor(hex: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((hex & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

/**
 * Evaluates the complete lighting, sky, fog, cloud, and surface atmosphere state
 * for any combination of Biome, Time of Day (fixed or Le Mans continuous `0..1`),
 * Cloud Cover, and Precipitation.
 */
export function evaluateSuzukaAtmosphere(params: {
  biome?: SuzukaTrackThemeId | string | null;
  timeOfDay?: SuzukaTimeOfDayId | string | null;
  cloudCover?: SuzukaCloudCoverId | string | null;
  precipitation?: SuzukaPrecipitationId | string | null;
  leMansProgress?: number;
}): EvaluatedSuzukaAtmosphere {
  const theme = getTrackTheme(params.biome);
  const tod = isValidTimeOfDayId(params.timeOfDay) ? params.timeOfDay : 'NOON';
  const cloudPreset = getCloudCoverPreset(params.cloudCover);
  const precipPreset = getPrecipitationPreset(params.precipitation);

  // Map fixed time of day or dynamic Le Mans progress onto the [0..1] keyframe timeline
  let cycleT = 0.46; // Noon default
  if (tod === 'SUNRISE') cycleT = 0.0;
  else if (tod === 'NOON') cycleT = 0.46;
  else if (tod === 'SUNSET') cycleT = 0.82;
  else if (tod === 'NIGHT') cycleT = 1.0;
  else if (tod === 'LE_MANS_CYCLE') {
    cycleT = Math.max(0, Math.min(1, params.leMansProgress ?? 0));
  }

  // Locate surrounding keyframes
  let kf0 = LE_MANS_KEYFRAMES[0];
  let kf1 = LE_MANS_KEYFRAMES[LE_MANS_KEYFRAMES.length - 1];
  for (let i = 0; i < LE_MANS_KEYFRAMES.length - 1; i++) {
    if (cycleT >= LE_MANS_KEYFRAMES[i].t && cycleT <= LE_MANS_KEYFRAMES[i + 1].t) {
      kf0 = LE_MANS_KEYFRAMES[i];
      kf1 = LE_MANS_KEYFRAMES[i + 1];
      break;
    }
  }

  // Substitute the biome's own tailored Noon palette into the Noon keyframe (t = 0.46)
  const resolveKf = (kf: TimeKeyframe): TimeKeyframe => {
    if (Math.abs(kf.t - 0.46) > 0.01) return kf;
    return {
      ...kf,
      sunDir: theme.sunDir,
      zenithHex: theme.zenithHex,
      midSkyHex: theme.midSkyHex,
      horizonHex: theme.horizonHex,
      fogHex: theme.fogHex,
      sunColorHex: theme.sunColorHex,
      cloudShadowHex: theme.cloudShadowHex,
      cloudLitHex: theme.cloudLitHex,
      hemiSkyHex: theme.hemiSkyHex,
      hemiIntensity: theme.hemiIntensity,
      dirColorHex: theme.dirColorHex,
      dirIntensity: theme.dirIntensity,
      exposure: theme.exposure,
      cloudMeshHex: theme.cloudMeshHex,
    };
  };

  const a = resolveKf(kf0);
  const b = resolveKf(kf1);
  const span = Math.max(0.0001, b.t - a.t);
  const rawLocalT = Math.max(0, Math.min(1, (cycleT - a.t) / span));
  // Smoothstep easing between adjacent time keyframes
  const localT = rawLocalT * rawLocalT * (3 - 2 * rawLocalT);

  const sx = lerpNumber(a.sunDir[0], b.sunDir[0], localT);
  const sy = lerpNumber(a.sunDir[1], b.sunDir[1], localT);
  const sz = lerpNumber(a.sunDir[2], b.sunDir[2], localT);

  let zenithHex = lerpHexColor(a.zenithHex, b.zenithHex, localT);
  let midSkyHex = lerpHexColor(a.midSkyHex, b.midSkyHex, localT);
  let horizonHex = lerpHexColor(a.horizonHex, b.horizonHex, localT);
  let fogHex = lerpHexColor(a.fogHex, b.fogHex, localT);
  const sunColorHex = lerpHexColor(a.sunColorHex, b.sunColorHex, localT);
  let cloudShadowHex = lerpHexColor(a.cloudShadowHex, b.cloudShadowHex, localT);
  const cloudLitHex = lerpHexColor(a.cloudLitHex, b.cloudLitHex, localT);

  const hemiSkyHex = lerpHexColor(a.hemiSkyHex, b.hemiSkyHex, localT);
  const hemiGroundMul = lerpNumber(a.hemiGroundMul, b.hemiGroundMul, localT);
  const hemiGroundHex = scaleHexColor(theme.hemiGroundHex, hemiGroundMul);
  let hemiIntensity = lerpNumber(a.hemiIntensity, b.hemiIntensity, localT);
  const dirColorHex = lerpHexColor(a.dirColorHex, b.dirColorHex, localT);
  let dirIntensity = lerpNumber(a.dirIntensity, b.dirIntensity, localT);
  const exposure = lerpNumber(a.exposure, b.exposure, localT);
  const envIntensity = lerpNumber(a.envIntensity, b.envIntensity, localT);
  let starIntensity = lerpNumber(a.starIntensity, b.starIntensity, localT);
  const nightLightFactor = lerpNumber(a.nightLightFactor, b.nightLightFactor, localT);
  const cloudMeshHex = lerpHexColor(a.cloudMeshHex, b.cloudMeshHex, localT);
  const crowdBrightness = lerpNumber(a.crowdBrightness, b.crowdBrightness, localT);

  // Weather & Cloud Cover Modifiers
  // If raining/snowing heavily, ensure minimum cloud presence even if 'CLEAR' was picked
  const minPrecipCloud =
    precipPreset.intensity >= 1.0 ? 0.65 : precipPreset.intensity > 0 ? 0.38 : 0.0;
  const cloudCoverage = Math.max(cloudPreset.cloudCoverage, minPrecipCloud);

  // Overcast & precipitation atmospheric softening
  const overcastFactor = Math.max(0, (cloudCoverage - 0.45) / 0.55);
  let fogDensity = theme.fogDensity * (1.0 + overcastFactor * 0.25 + precipPreset.intensity * 0.35);

  if (overcastFactor > 0.01) {
    const overcastSlate = lerpHexColor(horizonHex, cloudShadowHex, 0.65);
    zenithHex = lerpHexColor(zenithHex, overcastSlate, overcastFactor * 0.55);
    midSkyHex = lerpHexColor(midSkyHex, overcastSlate, overcastFactor * 0.60);
    fogHex = lerpHexColor(fogHex, overcastSlate, overcastFactor * 0.45);
    cloudShadowHex = scaleHexColor(cloudShadowHex, 1.0 - overcastFactor * 0.16);
    dirIntensity *= 1.0 - overcastFactor * 0.28;
    hemiIntensity *= 1.0 + overcastFactor * 0.12;
    starIntensity *= 1.0 - overcastFactor * 0.85;
  }

  // Wet / snowy road surface physics look
  let roadRoughness = 0.62;
  let roadMetalness = 0.12;
  if (precipPreset.kind === 'RAIN') {
    roadRoughness = precipPreset.intensity >= 1.0 ? 0.22 : 0.32;
    roadMetalness = precipPreset.intensity >= 1.0 ? 0.38 : 0.26;
  } else if (precipPreset.kind === 'SNOW') {
    roadRoughness = 0.72;
    roadMetalness = 0.06;
  }

  // Night & twilight emissive lighting ramp
  const floodEmissiveIntensity = lerpNumber(1.25, 3.25, nightLightFactor);
  const signEmissiveIntensity = lerpNumber(0.0, 0.65, nightLightFactor);
  const ferrisEmissiveIntensity = lerpNumber(0.0, 0.82, nightLightFactor);
  const towerWindowEmissiveIntensity = lerpNumber(0.05, 0.95, nightLightFactor);
  const glassEmissiveIntensity = lerpNumber(0.0, 0.48, nightLightFactor);
  const balloonEmissiveIntensity = lerpNumber(0.0, 0.55, nightLightFactor);
  const roadEmissiveIntensity = lerpNumber(0.0, 0.22, nightLightFactor);
  const redRoadEmissiveIntensity = lerpNumber(0.0, 0.38, nightLightFactor);

  return {
    sceneBackgroundHex: fogHex,
    fogHex,
    fogDensity,
    zenithHex,
    midSkyHex,
    horizonHex,
    sunDir: [sx, sy, sz],
    sunColorHex,
    cloudShadowHex,
    cloudLitHex,
    starIntensity,
    cloudCoverage,

    hemiSkyHex,
    hemiGroundHex,
    hemiIntensity,
    dirColorHex,
    dirIntensity,
    exposure,
    envIntensity,

    nightLightFactor,
    floodEmissiveIntensity,
    signEmissiveIntensity,
    ferrisEmissiveIntensity,
    towerWindowEmissiveIntensity,
    glassEmissiveIntensity,
    balloonEmissiveIntensity,
    roadEmissiveIntensity,
    redRoadEmissiveIntensity,
    roadRoughness,
    roadMetalness,
    cloudMeshHex,
    crowdBrightness,
  };
}

const TRACK_THEME_STORAGE_KEY = 'suzuka_gp_track_theme_v1';

export function getSavedTrackTheme(): SuzukaTrackThemeId {
  try {
    const saved = localStorage.getItem(TRACK_THEME_STORAGE_KEY);
    const norm = normalizeTrackThemeId(saved);
    if (norm) return norm;
  } catch {}
  return DEFAULT_TRACK_THEME_ID;
}

export function saveSavedTrackTheme(themeId: SuzukaTrackThemeId): void {
  try {
    localStorage.setItem(TRACK_THEME_STORAGE_KEY, themeId);
  } catch {}
}
