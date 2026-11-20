export type SchoolId = 'toyogaoka' | 'futakotamagawa';

export interface SchoolConfig {
  id: SchoolId;
  name: string;
  shortName?: string;
  kanjiName: string;
  shortKanji: string;
  aliases: string[];
  workDays: string[];
  classes: string[];
  schedule: Record<string, string[]>;
  irregularClasses?: string[];
  classSizes: Record<string, number>;
}

export const SCHOOL_CONFIGS: Record<SchoolId, SchoolConfig> = {
  toyogaoka: {
    id: 'toyogaoka',
    name: 'Toyogaoka Elementary School',
    shortName: 'Toyo',
    kanjiName: '豊ヶ丘小学校',
    shortKanji: '豊ヶ丘',
    aliases: [
      'tyg',
      'toyo',
      'toyogaoka',
      'toyooka',
      'tyo',
      'とよ',
      'とよがおか',
      '豊',
      '豊ヶ丘',
      '豊ヶ丘小',
      't'
    ],
    workDays: ['Tuesday'],
    classes: ['1-1', '2-1', '3-1', '4-1', '5-1', '6-1', '6-2'],
    schedule: {
      Tuesday: ['4-1', '6-2', '5-1', '6-1', '3-1', '']
    },
    classSizes: {
      '1-1': 26,
      '2-1': 26,
      '3-1': 33,
      '4-1': 35,
      '5-1': 26,
      '6-1': 20,
      '6-2': 20
    }
  },
  futakotamagawa: {
    id: 'futakotamagawa',
    name: 'Futakotamagawa Elementary School',
    shortName: 'Futako',
    kanjiName: '二子玉川小学校',
    shortKanji: '二子玉',
    aliases: [
      'ftk',
      'futako',
      'niko',
      '25',
      'futakotamagawa',
      'futakotamakawa',
      'ふたこ',
      'にこ',
      '二子',
      '二子玉',
      '二子玉川',
      'f'
    ],
    workDays: ['Monday', 'Thursday', 'Friday'],
    classes: [
      '1-1', '1-2', '1-3',
      '2-1', '2-2', '2-3',
      '3-1', '3-2', '3-3',
      '4-1', '4-2', '4-3',
      '5-1', '5-2', '5-3', '5-4',
      '6-1', '6-2', '6-3', '6-4'
    ],
    schedule: {
      Monday: ['3-1', '3-2', '3-3', '4-2', '4-3', '4-1'],
      Thursday: ['5-4', '', '5-3', '5-1', '5-2', ''],
      Friday: ['6-4', '6-2', '6-3', '6-1', '', '']
    },
    irregularClasses: ['1-1', '1-2', '1-3', '2-1', '2-2', '2-3'],
    classSizes: {
      '1-1': 25,
      '1-2': 24,
      '1-3': 25,
      '2-1': 27,
      '2-2': 27,
      '2-3': 27,
      '3-1': 30,
      '3-2': 30,
      '3-3': 31,
      '4-1': 31,
      '4-2': 32,
      '4-3': 32,
      '5-1': 33,
      '5-2': 28,
      '5-3': 28,
      '5-4': 29,
      '6-1': 31,
      '6-2': 35,
      '6-3': 32,
      '6-4': 35
    }
  }
};

export function getClassSize(schoolId?: SchoolId | null, classId?: string | null): number {
  if (!schoolId || !classId) return 36;
  return SCHOOL_CONFIGS[schoolId]?.classSizes?.[classId] || 36;
}

/**
 * Resolve a school from a student secret keyword / passcode or alias.
 * Case-insensitive, trims whitespace, removes hyphens/underscores.
 */
export function resolveSchoolFromKeyword(keyword: string): SchoolId | null {
  if (!keyword) return null;
  const clean = keyword.trim().toLowerCase().replace(/[\s\-_]/g, '');
  if (!clean) return null;
  for (const [sId, config] of Object.entries(SCHOOL_CONFIGS)) {
    if (sId === clean) return sId as SchoolId;
    if (config.aliases.some((a) => a.toLowerCase().replace(/[\s\-_]/g, '') === clean)) {
      return sId as SchoolId;
    }
  }
  return null;
}

/**
 * Parse school and class from a URL path, slug, or composite string.
 * Examples: "/ftk", "/toyo", "/ftk-4-1", "/ftk/4-1", "/4-1", "/niko"
 */
export function parseSchoolAndClassFromPath(path: string): { schoolId?: SchoolId; classId?: string } {
  const clean = path.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!clean) return {};

  const parts = clean.split(/[\/\-_]/).filter(Boolean);
  if (parts.length === 0) return {};

  let detectedSchool: SchoolId | undefined;
  let remainingParts = parts;

  // Check if first part matches a school keyword/alias
  const matchedFirst = resolveSchoolFromKeyword(parts[0]);
  if (matchedFirst) {
    detectedSchool = matchedFirst;
    remainingParts = parts.slice(1);
  }

  // Look for class pattern in parts (e.g., "4-1", "6-4", "41", "4年1組")
  let detectedClass: string | undefined;
  for (const part of remainingParts) {
    let candidate = part.replace('年', '-').replace('組', '').replace(/[\s]/g, '');
    if (/^[1-6][1-4]$/.test(candidate)) {
      candidate = `${candidate[0]}-${candidate[1]}`;
    }
    if (/^[1-6]-[1-4]$/.test(candidate)) {
      detectedClass = candidate;
      break;
    }
  }

  // Also check composite strings like "ftk4-1", "toyo41", "niko4-2"
  if (!detectedSchool) {
    for (const [sId, config] of Object.entries(SCHOOL_CONFIGS)) {
      for (const alias of config.aliases) {
        const lowerAlias = alias.toLowerCase();
        if (clean.startsWith(lowerAlias)) {
          const rest = clean.slice(lowerAlias.length).replace(/^[\/\-_]/, '');
          if (!rest) {
            detectedSchool = sId as SchoolId;
            break;
          }
          let candidate = rest.replace('年', '-').replace('組', '').replace(/[\s]/g, '');
          if (/^[1-6][1-4]$/.test(candidate)) {
            candidate = `${candidate[0]}-${candidate[1]}`;
          }
          if (/^[1-6]-[1-4]$/.test(candidate)) {
            detectedSchool = sId as SchoolId;
            detectedClass = candidate;
            break;
          }
        }
      }
      if (detectedSchool) break;
    }
  }

  // If a class is provided without a school, check if class is unique to Futakotamagawa
  if (!detectedSchool && detectedClass) {
    const toyoClasses = SCHOOL_CONFIGS.toyogaoka.classes;
    if (!toyoClasses.includes(detectedClass)) {
      detectedSchool = 'futakotamagawa';
    }
  }

  return { schoolId: detectedSchool, classId: detectedClass };
}

export interface TokyoPeriod {
  period: number;
  name: string;
  jaName: string;
  startMinutes: number;
  endMinutes: number;
}

export const FUTAKO_PERIODS: TokyoPeriod[] = [
  { period: 1, name: 'Period 1', jaName: '1校時', startMinutes: 8 * 60 + 35, endMinutes: 9 * 60 + 20 },
  { period: 2, name: 'Period 2', jaName: '2校時', startMinutes: 9 * 60 + 25, endMinutes: 10 * 60 + 10 },
  { period: 3, name: 'Period 3', jaName: '3校時', startMinutes: 10 * 60 + 30, endMinutes: 11 * 60 + 15 },
  { period: 4, name: 'Period 4', jaName: '4校時', startMinutes: 11 * 60 + 20, endMinutes: 12 * 60 + 5 },
  { period: 5, name: 'Period 5', jaName: '5校時', startMinutes: 13 * 60 + 15, endMinutes: 14 * 60 + 0 },
  { period: 6, name: 'Period 6', jaName: '6校時', startMinutes: 14 * 60 + 5, endMinutes: 14 * 60 + 50 }
];

export const TOYOGAOKA_PERIODS: TokyoPeriod[] = [
  { period: 1, name: 'Period 1', jaName: '1校時', startMinutes: 8 * 60 + 45, endMinutes: 9 * 60 + 30 },
  { period: 2, name: 'Period 2', jaName: '2校時', startMinutes: 9 * 60 + 35, endMinutes: 10 * 60 + 20 },
  { period: 3, name: 'Period 3', jaName: '3校時', startMinutes: 10 * 60 + 40, endMinutes: 11 * 60 + 25 },
  { period: 4, name: 'Period 4', jaName: '4校時', startMinutes: 11 * 60 + 30, endMinutes: 12 * 60 + 15 },
  { period: 5, name: 'Period 5', jaName: '5校時', startMinutes: 13 * 60 + 35, endMinutes: 14 * 60 + 20 }
];

export function getCurrentTokyoPeriod(schoolId: SchoolId = 'futakotamagawa', now: Date = new Date()): TokyoPeriod | null {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const periods = schoolId === 'toyogaoka' ? TOYOGAOKA_PERIODS : FUTAKO_PERIODS;
  for (const p of periods) {
    if (currentMinutes >= p.startMinutes - 15 && currentMinutes <= p.endMinutes) {
      return p;
    }
  }
  return null;
}

export function getSuggestedClassForSchedule(schoolId: SchoolId, now: Date = new Date()): { period: TokyoPeriod; classId: string } | null {
  const day = now.getDay();
  let dayKey = 'Monday';
  if (schoolId === 'toyogaoka') {
    if (day === 2) dayKey = 'Tuesday';
    else return null; // Toyogaoka only operates on Tuesdays
  } else {
    if (day === 1) dayKey = 'Monday';
    else if (day === 4) dayKey = 'Thursday';
    else if (day === 5) dayKey = 'Friday';
    else return null;
  }

  const period = getCurrentTokyoPeriod(schoolId, now);
  if (!period) return null;

  const schedule = SCHOOL_CONFIGS[schoolId]?.schedule[dayKey];
  if (!schedule) return null;

  const classId = schedule[period.period - 1];
  if (!classId) return null;

  return { period, classId };
}

export interface StudentBadgeRecord {
  id: string;
  totalCount: number;
  level: number;
  lastAwardedAt: number;
}

export interface TroubleWordRecord {
  wordId: string;
  english: string;
  japanese: string;
  missCount: number;
  correctCount: number;
  lastAttemptedAt: number;
}

export interface StudentProfileStats {
  gamesPlayed: number;
  correctAnswers: number;
  totalAnswers: number;
  bestStreak?: number;
  allTimeFastestMs?: number;
  totalAnswerTimeMs?: number;
  totalCorrectTimeMs?: number;
  podiumFinishes?: number;
  championshipWins?: number;
  badges?: Record<string, StudentBadgeRecord>;
  troubleWords?: Record<string, TroubleWordRecord>;
}

export interface StudentEquippedItems {
  frame?: string;       // e.g. 'aura_gold'
  title?: string;       // e.g. 'title_speed_demon'
  kartTheme?: string;   // e.g. 'GOLD_CHAMPION'
}

export interface StudentInventory {
  frames?: string[];
  titles?: string[];
  kartThemes?: string[];
  unlockedAvatars?: string[];
}

export interface StudentProfile {
  schoolId: SchoolId;
  classId: string;
  attendanceNumber: number;
  isGuest?: boolean;
  nickname: string;
  callsign?: string; // Broadcast tag / 3-character racer callsign (e.g. "SAR", "KEN", "MIZ")
  avatar: string;
  secretCharm?: string; // Private pass-charm for verifying seat takeover (never shown on public buttons/TV)
  xp: number;
  level: number;
  gold: number;
  boundAt: number;
  lastPlayedAt?: number;
  rewardedSessions?: Record<string, number>;
  stats?: StudentProfileStats;
  equipped?: StudentEquippedItems;
  inventory?: StudentInventory;
}

export function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  const thresholds = [0, 250, 600, 1100, 1800, 2700, 3800, 5100, 6600, 8500, 10000];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  const currentTierBase = thresholds[Math.min(level - 1, thresholds.length - 1)];
  const nextTierBase = thresholds[Math.min(level, thresholds.length - 1)];
  const xpInLevel = Math.max(0, xp - currentTierBase);
  const neededInLevel = Math.max(1, nextTierBase - currentTierBase);
  const progress = Math.min(1, xpInLevel / neededInLevel);

  return { level, currentXp: xp, nextLevelXp: nextTierBase, progress };
}

export interface AvatarCategory {
  id: string;
  name: string;
  jaName: string;
  icon: string;
  emojis: string[];
}

export interface FlagCountry {
  emoji: string;
  code: string;
  name: string;
  jaName: string;
}

export interface FlagRegion {
  id: string;
  name: string;
  jaName: string;
  icon: string;
  countries: FlagCountry[];
}

export const FLAG_REGIONS: FlagRegion[] = [
  {
    id: 'asia',
    name: 'Asia',
    jaName: 'アジア',
    icon: '🌏',
    countries: [
      { emoji: '🇯🇵', code: 'jp', name: 'Japan', jaName: '日本' },
      { emoji: '🇰🇷', code: 'kr', name: 'South Korea', jaName: '韓国' },
      { emoji: '🇹🇼', code: 'tw', name: 'Taiwan', jaName: '台湾' },
      { emoji: '🇨🇳', code: 'cn', name: 'China', jaName: '中国' },
      { emoji: '🇵🇭', code: 'ph', name: 'Philippines', jaName: 'フィリピン' },
      { emoji: '🇹🇭', code: 'th', name: 'Thailand', jaName: 'タイ' },
      { emoji: '🇻🇳', code: 'vn', name: 'Vietnam', jaName: 'ベトナム' },
      { emoji: '🇸🇬', code: 'sg', name: 'Singapore', jaName: 'シンガポール' },
      { emoji: '🇮🇳', code: 'in', name: 'India', jaName: 'インド' },
      { emoji: '🇮🇩', code: 'id', name: 'Indonesia', jaName: 'インドネシア' },
      { emoji: '🇲🇾', code: 'my', name: 'Malaysia', jaName: 'マレーシア' },
      { emoji: '🇲🇳', code: 'mn', name: 'Mongolia', jaName: 'モンゴル' },
      { emoji: '🇳🇵', code: 'np', name: 'Nepal', jaName: 'ネパール' },
      { emoji: '🇰🇭', code: 'kh', name: 'Cambodia', jaName: 'カンボジア' },
      { emoji: '🇱🇦', code: 'la', name: 'Laos', jaName: 'ラオス' },
      { emoji: '🇲🇲', code: 'mm', name: 'Myanmar', jaName: 'ミャンマー' },
      { emoji: '🇱🇰', code: 'lk', name: 'Sri Lanka', jaName: 'スリランカ' },
      { emoji: '🇧🇩', code: 'bd', name: 'Bangladesh', jaName: 'バングラデシュ' },
      { emoji: '🇵🇰', code: 'pk', name: 'Pakistan', jaName: 'パキスタン' },
      { emoji: '🇰🇿', code: 'kz', name: 'Kazakhstan', jaName: 'カザフスタン' },
    ],
  },
  {
    id: 'americas',
    name: 'Americas',
    jaName: 'アメリカ',
    icon: '🌎',
    countries: [
      { emoji: '🇺🇸', code: 'us', name: 'USA', jaName: 'アメリカ' },
      { emoji: '🇨🇦', code: 'ca', name: 'Canada', jaName: 'カナダ' },
      { emoji: '🇲🇽', code: 'mx', name: 'Mexico', jaName: 'メキシコ' },
      { emoji: '🇧🇷', code: 'br', name: 'Brazil', jaName: 'ブラジル' },
      { emoji: '🇦🇷', code: 'ar', name: 'Argentina', jaName: 'アルゼンチン' },
      { emoji: '🇯🇲', code: 'jm', name: 'Jamaica', jaName: 'ジャマイカ' },
      { emoji: '🇨🇴', code: 'co', name: 'Colombia', jaName: 'コロンビア' },
      { emoji: '🇵🇪', code: 'pe', name: 'Peru', jaName: 'ペルー' },
      { emoji: '🇨🇱', code: 'cl', name: 'Chile', jaName: 'チリ' },
      { emoji: '🇨🇺', code: 'cu', name: 'Cuba', jaName: 'キューバ' },
      { emoji: '🇨🇷', code: 'cr', name: 'Costa Rica', jaName: 'コスタリカ' },
      { emoji: '🇵🇦', code: 'pa', name: 'Panama', jaName: 'パナマ' },
      { emoji: '🇪🇨', code: 'ec', name: 'Ecuador', jaName: 'エクアドル' },
      { emoji: '🇺🇾', code: 'uy', name: 'Uruguay', jaName: 'ウルグアイ' },
      { emoji: '🇩🇴', code: 'do', name: 'Dominican Rep.', jaName: 'ドミニカ' },
      { emoji: '🇧🇴', code: 'bo', name: 'Bolivia', jaName: 'ボリビア' },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    jaName: 'ヨーロッパ',
    icon: '🌍',
    countries: [
      { emoji: '🇬🇧', code: 'gb', name: 'UK', jaName: 'イギリス' },
      { emoji: '🇫🇷', code: 'fr', name: 'France', jaName: 'フランス' },
      { emoji: '🇮🇹', code: 'it', name: 'Italy', jaName: 'イタリア' },
      { emoji: '🇩🇪', code: 'de', name: 'Germany', jaName: 'ドイツ' },
      { emoji: '🇪🇸', code: 'es', name: 'Spain', jaName: 'スペイン' },
      { emoji: '🇷🇺', code: 'ru', name: 'Russia', jaName: 'ロシア' },
      { emoji: '🇺🇦', code: 'ua', name: 'Ukraine', jaName: 'ウクライナ' },
      { emoji: '🇨🇭', code: 'ch', name: 'Switzerland', jaName: 'スイス' },
      { emoji: '🇸🇪', code: 'se', name: 'Sweden', jaName: 'スウェーデン' },
      { emoji: '🇳🇱', code: 'nl', name: 'Netherlands', jaName: 'オランダ' },
      { emoji: '🇵🇹', code: 'pt', name: 'Portugal', jaName: 'ポルトガル' },
      { emoji: '🇵🇱', code: 'pl', name: 'Poland', jaName: 'ポーランド' },
      { emoji: '🇫🇮', code: 'fi', name: 'Finland', jaName: 'フィンランド' },
      { emoji: '🇳🇴', code: 'no', name: 'Norway', jaName: 'ノルウェー' },
      { emoji: '🇩🇰', code: 'dk', name: 'Denmark', jaName: 'デンマーク' },
      { emoji: '🇬🇷', code: 'gr', name: 'Greece', jaName: 'ギリシャ' },
      { emoji: '🇮🇪', code: 'ie', name: 'Ireland', jaName: 'アイルランド' },
      { emoji: '🇧🇪', code: 'be', name: 'Belgium', jaName: 'ベルギー' },
      { emoji: '🇦🇹', code: 'at', name: 'Austria', jaName: 'オーストリア' },
      { emoji: '🇨🇿', code: 'cz', name: 'Czechia', jaName: 'チェコ' },
    ],
  },
  {
    id: 'africa_me',
    name: 'Africa & ME',
    jaName: 'アフリカ・中東',
    icon: '🏜️',
    countries: [
      { emoji: '🇪🇬', code: 'eg', name: 'Egypt', jaName: 'エジプト' },
      { emoji: '🇿🇦', code: 'za', name: 'South Africa', jaName: '南アフリカ' },
      { emoji: '🇰🇪', code: 'ke', name: 'Kenya', jaName: 'ケニア' },
      { emoji: '🇳🇬', code: 'ng', name: 'Nigeria', jaName: 'ナイジェリア' },
      { emoji: '🇲🇦', code: 'ma', name: 'Morocco', jaName: 'モロッコ' },
      { emoji: '🇬🇭', code: 'gh', name: 'Ghana', jaName: 'ガーナ' },
      { emoji: '🇪🇹', code: 'et', name: 'Ethiopia', jaName: 'エチオピア' },
      { emoji: '🇹🇿', code: 'tz', name: 'Tanzania', jaName: 'タンザニア' },
      { emoji: '🇸🇳', code: 'sn', name: 'Senegal', jaName: 'セネガル' },
      { emoji: '🇦🇪', code: 'ae', name: 'UAE', jaName: 'アラブ首長国連邦' },
      { emoji: '🇸🇦', code: 'sa', name: 'Saudi Arabia', jaName: 'サウジアラビア' },
      { emoji: '🇹🇷', code: 'tr', name: 'Turkey', jaName: 'トルコ' },
      { emoji: '🇮🇱', code: 'il', name: 'Israel', jaName: 'イスラエル' },
      { emoji: '🇯🇴', code: 'jo', name: 'Jordan', jaName: 'ヨルダン' },
      { emoji: '🇶🇦', code: 'qa', name: 'Qatar', jaName: 'カタール' },
      { emoji: '🇹🇳', code: 'tn', name: 'Tunisia', jaName: 'チュニジア' },
    ],
  },
  {
    id: 'oceania',
    name: 'Oceania',
    jaName: 'オセアニア',
    icon: '🏝️',
    countries: [
      { emoji: '🇦🇺', code: 'au', name: 'Australia', jaName: 'オーストラリア' },
      { emoji: '🇳🇿', code: 'nz', name: 'New Zealand', jaName: 'ニュージーランド' },
      { emoji: '🇫🇯', code: 'fj', name: 'Fiji', jaName: 'フィジー' },
      { emoji: '🇵🇼', code: 'pw', name: 'Palau', jaName: 'パラオ' },
      { emoji: '🇵🇬', code: 'pg', name: 'Papua NG', jaName: 'パプアニューギニア' },
      { emoji: '🇼🇸', code: 'ws', name: 'Samoa', jaName: 'サモア' },
      { emoji: '🇹🇴', code: 'to', name: 'Tonga', jaName: 'トンガ' },
      { emoji: '🇻🇺', code: 'vu', name: 'Vanuatu', jaName: 'バヌアツ' },
    ],
  },
];

const FLAG_META_MAP: Record<string, FlagCountry> = Object.fromEntries(
  FLAG_REGIONS.flatMap(r => r.countries.map(c => [c.emoji, c]))
);

export function getFlagMetadata(flagEmoji: string): FlagCountry | null {
  return FLAG_META_MAP[flagEmoji] || null;
}

export function flagEmojiToIsoCode(flagEmoji: string): string | null {
  if (!flagEmoji) return null;
  const codePoints = Array.from(flagEmoji)
    .map(c => c.codePointAt(0))
    .filter((cp): cp is number => typeof cp === 'number');
  if (codePoints.length === 2 && codePoints.every(cp => cp >= 0x1f1e6 && cp <= 0x1f1ff)) {
    return String.fromCharCode(codePoints[0] - 0x1f1e6 + 97, codePoints[1] - 0x1f1e6 + 97);
  }
  return null;
}

/**
 * Resolves a flag emoji to our self-hosted /assets/flags/{code}.svg (zero Cloudflare/external CDN dependency).
 */
export function getFlagTwemojiUrl(flagEmoji: string): string | null {
  const code = flagEmojiToIsoCode(flagEmoji);
  if (!code) return null;
  return `/assets/flags/${code}.svg`;
}

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  {
    id: 'animals',
    name: 'Animals',
    jaName: 'どうぶつ',
    icon: '🐾',
    emojis: [
      '🐼', '🐯', '🐨', '🐬', '🦁', '🦊', '🐰', '🐧',
      '🐶', '🐱', '🐻', '🐵', '🐸', '🦉', '🦄', '🐙',
      '🐢', '🐘', '🦒', '🦓', '🦔', '🐝', '🦋', '🦕',
      '🦖', '🐳', '🦈', '🦅', '🦜', '🦩', '🐺', '🦝',
      '🦘', '🦥', '🦦', '🦭', '🐠', '🦀', '🐉', '🐣'
    ]
  },
  {
    id: 'sports',
    name: 'Sports',
    jaName: 'スポーツ',
    icon: '⚽',
    emojis: [
      '⚽', '⚾', '🏀', '🏈', '🎾', '🏐', '🏓', '🏸',
      '🥊', '🥋', '🏊', '🏃', '🚴', '🛹', '🎳', '🎯',
      '⛳', '🏄', '⛷️', '🧗', '🏇', '🎣', '🏆', '🥇',
      '🥈', '🥉', '🥎', '🏉', '🥏', '🏹', '⛸️', '🛼',
      '🤿', '🤸', '🤼', '🤾', '🏋️', '🎽', '🏅', '🎖️'
    ]
  },
  {
    id: 'jp_food',
    name: 'JP Food',
    jaName: '和食',
    icon: '🍱',
    emojis: [
      '🍣', '🍙', '🍜', '🍲', '🍛', '🍡', '🍱', '🥟',
      '🍤', '🍢', '🍘', '🍵', '🍠', '🍥', '🥢', '🍶',
      '🥩', '🥘', '🍳', '🧂', '🥠', '🌰', '🍚', '🌽',
      '🍧', '🍨', '🍵', '🧋', '🥮', '🍤', '🍄', '🫛',
      '🐟', '🦀', '🦑', '🦐', '🍊', '🍈', '🍑', '🍓'
    ]
  },
  {
    id: 'western_food',
    name: 'Western',
    jaName: '洋食',
    icon: '🍕',
    emojis: [
      '🍕', '🍔', '🍟', '🌭', '🥪', '🍝', '🌮', '🍦',
      '🍩', '🍰', '🍫', '🥞', '🥐', '🥨', '🧀', '🥯',
      '🧁', '🧇', '🍿', '🍪', '🍮', '🍭', '🍎', '🍇',
      '🍉', '🍌', '🍍', '🥭', '🍒', '🥑', '🌯', '🥙',
      '🥗', '🥧', '🍬', '🍡', '🥛', '🧃', '🥤', '☕'
    ]
  },
  {
    id: 'flags',
    name: 'Flags',
    jaName: '国旗',
    icon: '🚩',
    emojis: FLAG_REGIONS.flatMap(r => r.countries.map(c => c.emoji))
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    jaName: 'のりもの',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
      '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🚲',
      '🛴', '🚨', '✈️', '🚀', '🛸', '🚁', '⛵', '🚢',
      '🚅', '🚄', '🚆', '🚇', '🚋', '🚂', '🚤', '🛳️',
      '⛴️', '🛶', '🛩️', '🛰️', '🪂', '🏍️', '🦽', '⛽'
    ]
  },
  {
    id: 'misc',
    name: 'Misc',
    jaName: 'いろいろ',
    icon: '✨',
    emojis: [
      '⭐', '🌟', '✨', '⚡', '🌈', '☀️', '🌙', '🔥',
      '💧', '❄️', '🌸', '🌻', '🍀', '🍄', '🎈', '🎉',
      '🎮', '👾', '🤖', '👑', '💎', '🎨', '🎸', '🪄',
      '🧩', '🎲', '🧸', '🪁', '🎹', '🥁', '🎺', '🎻',
      '📚', '✏️', '🔭', '🔬', '🧭', '🛡️', '⚔️', '🔮'
    ]
  }
];

export const ALL_AVATAR_EMOJIS: string[] = AVATAR_CATEGORIES.flatMap(c => c.emojis);

// 35 Curated distinctive, popular emojis assigned deterministically to attendance numbers 1-35
// Ensures no two students in the same class get the same avatar by default!
export const DEFAULT_ATTENDANCE_AVATARS: string[] = [
  '🐯', '🐬', '🦁', '🦊', '🐼', '🐨', '🐰', '🐧', '🐶', '🐱',
  '🐻', '🐵', '🦄', '🦖', '⚽', '⚾', '🏀', '🏎️', '🚀', '🍣',
  '🍙', '🍜', '🍕', '🍔', '🍦', '🚗', '🛸', '⚡', '🌈', '🔥',
  '🌸', '🎮', '🤖', '👑', '💎'
];

/**
 * Get an avatar emoji:
 * If an attendance number (1-35) is provided, returns the unique avatar for that seat.
 * If no attendance number is given, returns a random emoji from all 168 available avatars.
 */
export function getRandomAvatarEmoji(attendanceNumber?: number | null): string {
  if (typeof attendanceNumber === 'number' && attendanceNumber > 0) {
    const idx = (attendanceNumber - 1) % DEFAULT_ATTENDANCE_AVATARS.length;
    return DEFAULT_ATTENDANCE_AVATARS[idx];
  }
  const randomIdx = Math.floor(Math.random() * ALL_AVATAR_EMOJIS.length);
  return ALL_AVATAR_EMOJIS[randomIdx] || '🐼';
}

/**
 * Pick a completely random avatar from the full 168-emoji roster, optionally excluding current emoji
 */
export function pickCompletelyRandomAvatar(exclude?: string): string {
  const pool = exclude ? ALL_AVATAR_EMOJIS.filter(e => e !== exclude) : ALL_AVATAR_EMOJIS;
  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx] || '🐼';
}

export interface SecretCharmDef {
  emoji: string;
  name: string;
  jaName: string;
}

// 12 Curated distinct, memorable Secret Pass-Charms (never displayed on public attendance buttons/TV)
export const SECRET_CHARMS: SecretCharmDef[] = [
  { emoji: '⚡', name: 'Lightning', jaName: 'いなずま' },
  { emoji: '🚀', name: 'Rocket', jaName: 'ロケット' },
  { emoji: '💎', name: 'Diamond', jaName: 'ダイヤ' },
  { emoji: '🍕', name: 'Pizza', jaName: 'ピザ' },
  { emoji: '🍦', name: 'Ice Cream', jaName: 'アイス' },
  { emoji: '👑', name: 'Crown', jaName: 'おうかん' },
  { emoji: '🎮', name: 'Game', jaName: 'ゲーム' },
  { emoji: '🎸', name: 'Guitar', jaName: 'ギター' },
  { emoji: '🛸', name: 'UFO', jaName: 'ユーフォー' },
  { emoji: '🌈', name: 'Rainbow', jaName: 'にじ' },
  { emoji: '🔑', name: 'Golden Key', jaName: 'きんのカギ' },
  { emoji: '🪄', name: 'Magic Wand', jaName: 'ステッキ' }
];

export const ALL_SECRET_CHARM_EMOJIS: string[] = SECRET_CHARMS.map(c => c.emoji);

export function getDefaultSecretCharm(attendanceNumber?: number | null): string {
  if (typeof attendanceNumber === 'number' && attendanceNumber > 0) {
    const idx = (attendanceNumber - 1) % ALL_SECRET_CHARM_EMOJIS.length;
    return ALL_SECRET_CHARM_EMOJIS[idx];
  }
  return ALL_SECRET_CHARM_EMOJIS[0];
}

/**
 * Generate a short display callsign / driver tag (up to 6 chars)
 * Defaults to Grade-Class-Seat (e.g. "3-1-1", "4-4-14") or clean Latin nickname (e.g. "SARA", "KEN")
 */
export function generateDefaultCallsign(
  nickname: string = '', 
  attendanceNumber?: number | null,
  classId?: string | null
): string {
  const trimmed = (nickname || '').trim();
  const isDefaultSeatNick = !trimmed || /^[0-9]+[番]?$/.test(trimmed) || /^#[0-9]+$/.test(trimmed);

  // If a student explicitly entered an English nickname (e.g. "Sara", "Ken", "Daiki")
  if (!isDefaultSeatNick) {
    const cleanLetters = trimmed.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase();
    if (cleanLetters.length >= 2 && !/^[0-9\-]+$/.test(cleanLetters)) {
      return cleanLetters.slice(0, 6);
    }
  }

  // Intuitive Default: Grade-Class-Seat (e.g. 3-1-1, 4-4-14, 6-2-5)
  if (classId && attendanceNumber && attendanceNumber > 0) {
    return `${classId}-${attendanceNumber}`.slice(0, 6);
  }

  if (attendanceNumber && attendanceNumber > 0) {
    return `#${attendanceNumber}`;
  }

  return 'LEVI';
}
