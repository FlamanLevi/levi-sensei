/**
 * 🏎️ 3D Suzuka Grand Prix & Sprint Race: Curated Kart & Driver Customization Presets
 * Designed specifically for Japanese Elementary School (Grades 3-6) ESL students:
 * - 1-tap instant selection in waiting lobby (zero lesson overhead)
 * - Persisted in localStorage so students never lose their favorite theme
 * - Lightweight Three.js material color overrides (zero performance penalty)
 */

export type KartThemeId =
  | 'RED_COMET'
  | 'FIRE_DRAGON'
  | 'THUNDER_BEE'
  | 'FOREST_MACH'
  | 'CYBER_NEON'
  | 'BLUE_LIGHTNING'
  | 'MIDNIGHT_PHANTOM'
  | 'SAKURA_BREEZE'
  | 'SILVER_ARROW'
  | 'GOLD_CHAMPION'
  | 'LIME_VIPER'
  | 'STEALTH_CARBON'
  | 'SUNSET_CORAL'
  | 'ARCTIC_GLACIER'
  | 'COSMIC_GALAXY';

export interface KartThemeConfig {
  id: KartThemeId;
  nameEn: string;
  nameJa: string;
  emoji: string;
  colorHex: number;       // Primary chassis & fairing body
  stripeHex: number;      // Secondary aerodynamic stripe & wing livery
  rimHex: number;         // Wheel rims & hubcaps
  suitHex: number;        // Driver torso jumpsuit
  helmetHex: number;      // Driver helmet shell
  visorHex: number;       // Iridescent reflective visor
  accentBg: string;       // Tailwind card gradient
  badgeBorder: string;    // Selected border highlight
  taglineEn: string;
  taglineJa: string;
}

export const KART_THEMES: Record<KartThemeId, KartThemeConfig> = {
  RED_COMET: {
    id: 'RED_COMET',
    nameEn: 'Red Comet',
    nameJa: 'レッドコメット',
    emoji: '🔴',
    colorHex: 0xef4444,     // Crimson Red
    stripeHex: 0xffffff,    // Pure White
    rimHex: 0xffbb44,       // Championship Gold
    suitHex: 0xdc2626,      // Red Suit
    helmetHex: 0xffffff,    // White Helmet
    visorHex: 0x38bdf8,     // Ice Blue Visor
    accentBg: 'from-red-600 via-rose-600 to-amber-500',
    badgeBorder: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
    taglineEn: 'Fast & Furious Classic',
    taglineJa: '情熱の赤い稲妻',
  },
  CYBER_NEON: {
    id: 'CYBER_NEON',
    nameEn: 'Cyber Neon',
    nameJa: 'サイバーネオン',
    emoji: '⚡',
    colorHex: 0x06b6d4,     // Electric Cyan
    stripeHex: 0xa3e635,    // Neon Lime
    rimHex: 0xe2e8f0,       // Chrome Silver
    suitHex: 0x0f172a,      // Midnight Navy
    helmetHex: 0x1e293b,    // Obsidian Shell
    visorHex: 0x22d3ee,     // Laser Cyan Visor
    accentBg: 'from-cyan-500 via-blue-600 to-indigo-700',
    badgeBorder: 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]',
    taglineEn: 'Future Tech Racer',
    taglineJa: '近未来のスピードスター',
  },
  SAKURA_BREEZE: {
    id: 'SAKURA_BREEZE',
    nameEn: 'Sakura Breeze',
    nameJa: 'サクラブリーズ',
    emoji: '🌸',
    colorHex: 0xf472b6,     // Sakura Blossom Pink
    stripeHex: 0xffffff,    // Snow White
    rimHex: 0xfbcfe8,       // Rose Gold
    suitHex: 0xf472b6,      // Pink Suit
    helmetHex: 0xfff1f2,    // Pearl White
    visorHex: 0xf43f5e,     // Ruby Rose Visor
    accentBg: 'from-pink-400 via-rose-400 to-amber-300',
    badgeBorder: 'border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.5)]',
    taglineEn: 'Graceful Sakura Petals',
    taglineJa: '春風をまとう桜マシン',
  },
  THUNDER_BEE: {
    id: 'THUNDER_BEE',
    nameEn: 'Thunder Bee',
    nameJa: 'サンダービー',
    emoji: '🟡',
    colorHex: 0xeab308,     // Racing Yellow
    stripeHex: 0x18181b,    // Carbon Black
    rimHex: 0xffbb44,       // Gold Rims
    suitHex: 0x18181b,      // Black Suit
    helmetHex: 0xfacc15,    // Yellow Helmet
    visorHex: 0x38bdf8,     // Electric Blue Visor
    accentBg: 'from-amber-400 via-yellow-500 to-orange-500',
    badgeBorder: 'border-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]',
    taglineEn: 'Stinging Acceleration',
    taglineJa: '電光石火のイエローハチ',
  },
  MIDNIGHT_PHANTOM: {
    id: 'MIDNIGHT_PHANTOM',
    nameEn: 'Midnight Phantom',
    nameJa: 'ミッドナイト',
    emoji: '🟣',
    colorHex: 0x7c3aed,     // Deep Royal Violet
    stripeHex: 0x22d3ee,    // Electric Cyan
    rimHex: 0x94a3b8,       // Titanium Silver
    suitHex: 0x0f172a,      // Shadow Black
    helmetHex: 0x4c1d95,    // Midnight Violet Shell
    visorHex: 0xc084fc,     // Purple Mist Visor
    accentBg: 'from-purple-600 via-violet-700 to-indigo-900',
    badgeBorder: 'border-purple-400 shadow-[0_0_15px_rgba(124,58,237,0.5)]',
    taglineEn: 'Mysterious Night Hunter',
    taglineJa: '夜闇をかける幻影',
  },
  FOREST_MACH: {
    id: 'FOREST_MACH',
    nameEn: 'Forest Mach',
    nameJa: 'フォレストマッハ',
    emoji: '🟢',
    colorHex: 0x15803d,     // British Racing Green
    stripeHex: 0xfacc15,    // Gold Stripe
    rimHex: 0xd97706,       // Bronze Rims
    suitHex: 0xf8fafc,      // Snow White
    helmetHex: 0x166534,    // Emerald Helmet
    visorHex: 0xf59e0b,     // Gold Amber Visor
    accentBg: 'from-emerald-600 via-green-600 to-teal-700',
    badgeBorder: 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    taglineEn: 'Endurance Legend',
    taglineJa: '森を突き抜ける緑の風',
  },
  FIRE_DRAGON: {
    id: 'FIRE_DRAGON',
    nameEn: 'Fire Dragon',
    nameJa: 'ファイアドラゴン',
    emoji: '🔥',
    colorHex: 0x1c1917,     // Matte Stealth Black
    stripeHex: 0xf97316,    // Blaze Orange
    rimHex: 0xffbb44,       // Gold Rims
    suitHex: 0xea580c,      // Flame Orange
    helmetHex: 0x1c1917,    // Stealth Black Helmet
    visorHex: 0xef4444,     // Flame Red Visor
    accentBg: 'from-stone-900 via-orange-600 to-red-600',
    badgeBorder: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]',
    taglineEn: 'Roaring Flame Beast',
    taglineJa: '爆走する炎のドラゴン',
  },
  SILVER_ARROW: {
    id: 'SILVER_ARROW',
    nameEn: 'Silver Arrow',
    nameJa: 'シルバーアロー',
    emoji: '⚪',
    colorHex: 0xe2e8f0,     // Platinum Silver
    stripeHex: 0x0284c7,    // Sky Blue
    rimHex: 0xffffff,       // Pure Chrome
    suitHex: 0x334155,      // Slate Grey Suit
    helmetHex: 0xf8fafc,    // Silver Helmet
    visorHex: 0x0ea5e9,     // Deep Sky Blue Visor
    accentBg: 'from-slate-400 via-slate-600 to-zinc-800',
    badgeBorder: 'border-slate-300 shadow-[0_0_15px_rgba(226,232,240,0.5)]',
    taglineEn: 'Precision Champion',
    taglineJa: '銀色に輝く精密の矢',
  },
  BLUE_LIGHTNING: {
    id: 'BLUE_LIGHTNING',
    nameEn: 'Blue Lightning',
    nameJa: 'ブルーサンダー',
    emoji: '🔵',
    colorHex: 0x2563eb,     // Royal Blue
    stripeHex: 0x38bdf8,    // Sky Cyan
    rimHex: 0xffffff,       // Pure Chrome
    suitHex: 0x1e3a8a,      // Deep Blue Suit
    helmetHex: 0x1d4ed8,    // Cobalt Helmet
    visorHex: 0x93c5fd,     // Ice Blue Visor
    accentBg: 'from-blue-600 via-indigo-600 to-cyan-500',
    badgeBorder: 'border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]',
    taglineEn: 'Sonic Blue Thunder',
    taglineJa: '青き稲妻のソニックウェーブ',
  },
  GOLD_CHAMPION: {
    id: 'GOLD_CHAMPION',
    nameEn: 'Gold Champion',
    nameJa: 'ゴールド王者',
    emoji: '👑',
    colorHex: 0xf59e0b,     // Deep Trophy Gold
    stripeHex: 0xffffff,    // Pure White
    rimHex: 0xfde047,       // Brilliant Gold Rims
    suitHex: 0x78350f,      // Bronze Torso
    helmetHex: 0xfef08a,    // Light Gold Helmet
    visorHex: 0x38bdf8,     // Ice Cyan Visor
    accentBg: 'from-amber-500 via-yellow-500 to-amber-700',
    badgeBorder: 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]',
    taglineEn: 'Golden Trophy Glory',
    taglineJa: '黄金に輝くチャンピオン',
  },
  LIME_VIPER: {
    id: 'LIME_VIPER',
    nameEn: 'Lime Viper',
    nameJa: 'ライムバイパー',
    emoji: '🐍',
    colorHex: 0x84cc16,     // Neon Lime
    stripeHex: 0x18181b,    // Carbon Black
    rimHex: 0xa3e635,       // Bright Lime Rims
    suitHex: 0x14532d,      // Dark Green Suit
    helmetHex: 0x3f6212,    // Viper Green Helmet
    visorHex: 0x22c55e,     // Emerald Visor
    accentBg: 'from-lime-500 via-green-600 to-emerald-700',
    badgeBorder: 'border-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.5)]',
    taglineEn: 'Poison Dart Speed',
    taglineJa: '俊敏なネオンライム',
  },
  STEALTH_CARBON: {
    id: 'STEALTH_CARBON',
    nameEn: 'Stealth Carbon',
    nameJa: 'ステルスカーボン',
    emoji: '🖤',
    colorHex: 0x18181b,     // Matte Jet Black
    stripeHex: 0xef4444,    // Crimson Pinstripe
    rimHex: 0x52525b,       // Gunmetal Grey
    suitHex: 0x09090b,      // Charcoal Black Suit
    helmetHex: 0x27272a,    // Matte Carbon Helmet
    visorHex: 0xf43f5e,     // Ruby Red Visor
    accentBg: 'from-zinc-900 via-stone-900 to-black',
    badgeBorder: 'border-zinc-500 shadow-[0_0_15px_rgba(39,39,42,0.5)]',
    taglineEn: 'Shadow of the Night',
    taglineJa: '闇夜を切り裂く漆黒',
  },
  SUNSET_CORAL: {
    id: 'SUNSET_CORAL',
    nameEn: 'Sunset Coral',
    nameJa: 'サンセットコーラル',
    emoji: '🌅',
    colorHex: 0xf43f5e,     // Vibrant Coral Rose
    stripeHex: 0xfbbf24,    // Golden Sunrise
    rimHex: 0xfb7185,       // Coral Rims
    suitHex: 0x881337,      // Deep Rose Suit
    helmetHex: 0xfb7185,    // Rose Helmet
    visorHex: 0xfde047,     // Sun Gold Visor
    accentBg: 'from-rose-500 via-orange-500 to-amber-500',
    badgeBorder: 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]',
    taglineEn: 'Twilight Glow Cruiser',
    taglineJa: '茜色に染まる夕焼けの光',
  },
  ARCTIC_GLACIER: {
    id: 'ARCTIC_GLACIER',
    nameEn: 'Arctic Glacier',
    nameJa: 'アークティック',
    emoji: '❄️',
    colorHex: 0x38bdf8,     // Ice Sky Blue
    stripeHex: 0xffffff,    // Glacial White
    rimHex: 0xe0f2fe,       // Frost Rims
    suitHex: 0x0284c7,      // Deep Cyan Suit
    helmetHex: 0xf0f9ff,    // Snow White Helmet
    visorHex: 0x0369a1,     // Deep Blue Visor
    accentBg: 'from-sky-400 via-cyan-400 to-blue-500',
    badgeBorder: 'border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.5)]',
    taglineEn: 'Sub-Zero Drift Master',
    taglineJa: '絶対零度の氷結ドリフト',
  },
  COSMIC_GALAXY: {
    id: 'COSMIC_GALAXY',
    nameEn: 'Cosmic Galaxy',
    nameJa: 'コズミックギャラクシー',
    emoji: '🌌',
    colorHex: 0x4338ca,     // Deep Space Indigo
    stripeHex: 0xe879f9,    // Cosmic Fuchsia
    rimHex: 0xc084fc,       // Lavender Rims
    suitHex: 0x312e81,      // Galaxy Navy Suit
    helmetHex: 0x581c87,    // Deep Nebula Helmet
    visorHex: 0xf472b6,     // Pink Aurora Visor
    accentBg: 'from-indigo-700 via-purple-700 to-fuchsia-800',
    badgeBorder: 'border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]',
    taglineEn: 'Interstellar Speedster',
    taglineJa: '星屑を散らす銀河特急',
  },
};

export const KART_THEME_LIST: KartThemeConfig[] = [
  // Row 1: Warm Primaries
  KART_THEMES.RED_COMET,
  KART_THEMES.FIRE_DRAGON,
  KART_THEMES.THUNDER_BEE,
  // Row 2: Nature & Electric
  KART_THEMES.LIME_VIPER,
  KART_THEMES.FOREST_MACH,
  KART_THEMES.CYBER_NEON,
  // Row 3: Cool Blues & Blossoms
  KART_THEMES.BLUE_LIGHTNING,
  KART_THEMES.MIDNIGHT_PHANTOM,
  KART_THEMES.SAKURA_BREEZE,
  // Row 4: Atmospheric Elements
  KART_THEMES.SUNSET_CORAL,
  KART_THEMES.ARCTIC_GLACIER,
  KART_THEMES.COSMIC_GALAXY,
  // Row 5: Precious Materials & Stealth
  KART_THEMES.GOLD_CHAMPION,
  KART_THEMES.SILVER_ARROW,
  KART_THEMES.STEALTH_CARBON,
];
export const DEFAULT_KART_THEME: KartThemeId = 'RED_COMET';

const LOCAL_STORAGE_KEY = 'levi_f1_kart_theme';

export function getKartTheme(themeId?: string): KartThemeConfig {
  if (themeId && themeId in KART_THEMES) {
    return KART_THEMES[themeId as KartThemeId];
  }
  return KART_THEMES[DEFAULT_KART_THEME];
}

export function getSavedKartTheme(): KartThemeId {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved && saved in KART_THEMES) {
      return saved as KartThemeId;
    }
  } catch {}
  return DEFAULT_KART_THEME;
}

export function saveSavedKartTheme(themeId: KartThemeId): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, themeId);
  } catch {}
}

/**
 * Resolves the student's authentic attendance number (出席番号) or racing number:
 * 1. Explicit attendanceNumber from student profile / roster (e.g. 14)
 * 2. Extracted number from nickname (e.g. "14番", "#14", "No.14", "Student 14", "Bot 2")
 * 3. Fallback to 1-based index (1, 2, 3...)
 */
export function resolveRacerNumber(
  player: { nickname?: string; attendanceNumber?: number; id?: string },
  fallbackIndex: number = 0
): number {
  if (typeof player.attendanceNumber === 'number' && player.attendanceNumber > 0) {
    return player.attendanceNumber;
  }
  if (player.nickname) {
    const trimmed = player.nickname.trim();
    // 14番
    const jaMatch = trimmed.match(/^(\d+)番/);
    if (jaMatch && jaMatch[1]) {
      const n = parseInt(jaMatch[1], 10);
      if (n > 0 && n <= 99) return n;
    }
    // #14 or No.14
    const hashMatch = trimmed.match(/(?:#|no\.?\s*)(\d+)/i);
    if (hashMatch && hashMatch[1]) {
      const n = parseInt(hashMatch[1], 10);
      if (n > 0 && n <= 99) return n;
    }
    // Pure number string like "14"
    if (/^\d+$/.test(trimmed)) {
      const n = parseInt(trimmed, 10);
      if (n > 0 && n <= 99) return n;
    }
    // Word boundary number like "Leo 14" or "Bot 3"
    const trailMatch = trimmed.match(/\b(\d+)\b/);
    if (trailMatch && trailMatch[1]) {
      const n = parseInt(trailMatch[1], 10);
      if (n > 0 && n <= 99) return n;
    }
  }
  return fallbackIndex + 1;
}

