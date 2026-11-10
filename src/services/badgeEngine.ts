import { StudentBadgeRecord } from '@/types/roster';

export type BadgeCategory = 'core' | 'effort' | 'skill' | 'fun' | 'champion';

export interface BadgeDefinition {
  id: string;
  emoji: string;
  title: string;
  jaTitle: string;
  category: BadgeCategory;
  description: string;
  jaDescription: string;
  color: string;
  accentBorder: string;
}

export interface BadgeLevelInfo {
  level: number;
  totalCount: number;
  currentLevelThreshold: number; // T(L)
  nextLevelThreshold: number;    // T(L + 1)
  countInLevel: number;          // Current progress towards next level
  neededForNextLevel: number;    // How many needed in this tier
  progressRatio: number;         // 0.0 - 1.0
  isMaxLevel: boolean;
  tierName: 'locked' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

export interface BadgeLevelUpEvent {
  badgeId: string;
  badge: BadgeDefinition;
  oldLevel: number;
  newLevel: number;
  bonusGold: number;
}

export const BADGE_CATALOG: Record<string, BadgeDefinition> = {
  // 1. CORE AWARDS
  speed_star: {
    id: 'speed_star',
    emoji: '⚡',
    title: 'Speed Star',
    jaTitle: 'スピードスター賞',
    category: 'core',
    description: 'Fastest average buzzer speed on correct answers.',
    jaDescription: '電光石火の早押し！クラス最速のスピード正解マスター',
    color: 'from-amber-400 to-orange-500',
    accentBorder: 'border-amber-400'
  },
  on_fire: {
    id: 'on_fire',
    emoji: '🔥',
    title: 'On Fire',
    jaTitle: '炎のストリーク賞',
    category: 'core',
    description: 'Achieved the longest unbroken streak of correct answers.',
    jaDescription: '怒涛の連続正解！誰も止められない絶好調ストリーク',
    color: 'from-red-500 to-rose-600',
    accentBorder: 'border-red-500'
  },
  sniper: {
    id: 'sniper',
    emoji: '🎯',
    title: 'Sniper',
    jaTitle: 'スナイパー賞',
    category: 'core',
    description: 'High precision and accuracy with minimal mistakes.',
    jaDescription: '驚異の命中率！ミスを恐れず的確に答え抜いた精密射撃手',
    color: 'from-blue-500 to-indigo-600',
    accentBorder: 'border-blue-500'
  },
  perfectionist: {
    id: 'perfectionist',
    emoji: '⭐',
    title: 'Perfectionist',
    jaTitle: 'パーフェクト賞',
    category: 'core',
    description: 'Achieved 100% accuracy throughout the entire quiz match.',
    jaDescription: 'ノーミス完全制覇！全問正解のパーフェクト達成者',
    color: 'from-yellow-400 to-amber-500',
    accentBorder: 'border-yellow-400'
  },

  // 2. EFFORT & GROWTH
  never_give_up: {
    id: 'never_give_up',
    emoji: '💫',
    title: 'Never Give Up',
    jaTitle: 'あきらめない心賞',
    category: 'effort',
    description: 'Answered every question with relentless grit and determination.',
    jaDescription: '最後まであきらめずに挑戦し続けた素晴らしい粘り強さ',
    color: 'from-pink-500 to-rose-500',
    accentBorder: 'border-pink-500'
  },
  rising_star: {
    id: 'rising_star',
    emoji: '🚀',
    title: 'Rising Star',
    jaTitle: 'ライジングスター賞',
    category: 'effort',
    description: 'Massive surge in points during the second half of the game.',
    jaDescription: '後半戦で大躍進！あきらめない逆転ドライブ',
    color: 'from-emerald-400 to-teal-600',
    accentBorder: 'border-emerald-400'
  },
  flawless_finish: {
    id: 'flawless_finish',
    emoji: '💎',
    title: 'Flawless Finish',
    jaTitle: '有終の美賞',
    category: 'effort',
    description: 'Answered the final 3 questions in a row with complete precision.',
    jaDescription: 'ラスト3問をすべて完璧に正解！見事なフィニッシュ',
    color: 'from-violet-500 to-purple-600',
    accentBorder: 'border-violet-500'
  },
  last_spurt: {
    id: 'last_spurt',
    emoji: '🏃',
    title: 'Last Spurt',
    jaTitle: 'ラストスパート賞',
    category: 'effort',
    description: 'Lightning-fast buzzer speed on the final question.',
    jaDescription: '最後の1問を電撃正解！驚異のラストスパート',
    color: 'from-cyan-400 to-blue-600',
    accentBorder: 'border-cyan-400'
  },

  // 3. SKILL & CHALLENGE
  iron_defense: {
    id: 'iron_defense',
    emoji: '🛡️',
    title: 'Iron Defense',
    jaTitle: '鉄壁賞',
    category: 'skill',
    description: 'Conquered the trickiest question that challenged the rest of the class.',
    jaDescription: 'クラスの半数が間違えた超難問を見事にクリア！',
    color: 'from-amber-600 to-yellow-600',
    accentBorder: 'border-amber-600'
  },
  wise_owl: {
    id: 'wise_owl',
    emoji: '🦉',
    title: 'Wise Owl',
    jaTitle: 'ものしりフクロウ賞',
    category: 'skill',
    description: 'Mastered long English vocabulary words with flying colors.',
    jaDescription: '文字数の多い英語の難関単語を正確に聞き分けた高い語彙力',
    color: 'from-emerald-600 to-teal-700',
    accentBorder: 'border-emerald-600'
  },
  all_rounder: {
    id: 'all_rounder',
    emoji: '🌟',
    title: 'All-Rounder',
    jaTitle: '万能マスター賞',
    category: 'skill',
    description: 'Answered correctly across audio, visual, and text question prompts.',
    jaDescription: '文字・イラスト・音声リスニングの全形式をマスター！',
    color: 'from-indigo-600 to-purple-600',
    accentBorder: 'border-indigo-600'
  },
  quick_draw: {
    id: 'quick_draw',
    emoji: '🎯',
    title: 'Quick Draw',
    jaTitle: 'ファーストタッチ賞',
    category: 'skill',
    description: 'Blazed through Question 1 right off the opening buzzer.',
    jaDescription: '開幕第1問目を電撃先取！抜群のスタートダッシュ',
    color: 'from-orange-500 to-red-600',
    accentBorder: 'border-orange-500'
  },

  // 4. FUN & PLAYFUL
  rainbow_master: {
    id: 'rainbow_master',
    emoji: '🌈',
    title: 'Rainbow Master',
    jaTitle: 'レインボー賞',
    category: 'fun',
    description: 'Answered correctly using all 4 button colors: Red, Blue, Yellow, Green.',
    jaDescription: '赤・青・黄・緑の全4色ボタンを使って正解！カラフルマスター',
    color: 'from-pink-400 via-amber-400 to-blue-400',
    accentBorder: 'border-pink-400'
  },
  just_in_time: {
    id: 'just_in_time',
    emoji: '⏱️',
    title: 'Just-in-Time',
    jaTitle: 'ギリギリセーフ賞',
    category: 'fun',
    description: 'Answered correctly with under 1.5 seconds remaining on the clock.',
    jaDescription: '残り1.5秒未満！ブザー寸前で見事に滑り込み正解',
    color: 'from-yellow-400 to-amber-500',
    accentBorder: 'border-yellow-400'
  },
  twin_sync: {
    id: 'twin_sync',
    emoji: '🤝',
    title: 'Twin Sync',
    jaTitle: 'シンクロ賞',
    category: 'fun',
    description: 'Finished with the exact same score as a classmate in perfect harmony.',
    jaDescription: '同点ピッタリ！奇跡のスコアシンクロを達成',
    color: 'from-blue-400 to-cyan-500',
    accentBorder: 'border-blue-400'
  },
  median_hero: {
    id: 'median_hero',
    emoji: '🍀',
    title: 'Median Hero',
    jaTitle: 'まんなかヒーロー賞',
    category: 'fun',
    description: 'Finished right in the middle rank of the class. Steady and reliable!',
    jaDescription: 'クラスのちょうど真ん中順位！抜群の安定感を持つアンカー',
    color: 'from-teal-400 to-emerald-500',
    accentBorder: 'border-teal-400'
  },

  // 5. CHAMPIONSHIPS
  champion: {
    id: 'champion',
    emoji: '🏆',
    title: 'Classroom Champion',
    jaTitle: 'クラス優勝',
    category: 'champion',
    description: 'Claimed 1st place in the classroom quiz match!',
    jaDescription: 'クラス第1位！激闘を制したチャンピオン',
    color: 'from-amber-400 via-yellow-300 to-amber-500',
    accentBorder: 'border-amber-400'
  },
  podium: {
    id: 'podium',
    emoji: '🥈',
    title: 'Podium Finisher',
    jaTitle: '表彰台入り',
    category: 'champion',
    description: 'Finished in the Top 3 podium of the classroom quiz match.',
    jaDescription: 'クラスベスト3！表彰台に登壇したトッププレイヤー',
    color: 'from-slate-300 via-slate-100 to-slate-400',
    accentBorder: 'border-slate-300'
  }
};

/**
 * Map aliases or legacy IDs to canonical badge IDs
 */
export function normalizeBadgeId(id: string): string {
  if (id === 'streak_master') return 'on_fire';
  if (id === 'sniper_award') return 'sniper';
  return id;
}

/**
 * Untappd-Style Triangular Milestone Formula:
 * Threshold for Level L: T(L) = L * (L + 1) / 2
 *
 * Level 1: 1 award
 * Level 2: 3 awards (+2)
 * Level 3: 6 awards (+3)
 * Level 4: 10 awards (+4)
 * Level 5: 15 awards (+5)
 * Level 6: 21 awards (+6)
 * Level 7: 28 awards (+7)
 * Level 8: 36 awards (+8)
 * Level 9: 45 awards (+9)
 * Level 10: 55 awards (+10)
 */
export function calculateBadgeLevel(totalCount: number, maxLevel: number = 10): BadgeLevelInfo {
  if (totalCount <= 0) {
    return {
      level: 0,
      totalCount: 0,
      currentLevelThreshold: 0,
      nextLevelThreshold: 1,
      countInLevel: 0,
      neededForNextLevel: 1,
      progressRatio: 0,
      isMaxLevel: false,
      tierName: 'locked'
    };
  }

  // Formula: L = floor((sqrt(8 * C + 1) - 1) / 2)
  let level = Math.floor((Math.sqrt(8 * totalCount + 1) - 1) / 2);
  if (level > maxLevel) level = maxLevel;

  const currentLevelThreshold = (level * (level + 1)) / 2;
  const nextLevelThreshold = ((level + 1) * (level + 2)) / 2;
  const isMaxLevel = level >= maxLevel;
  const neededForNextLevel = isMaxLevel ? 0 : (level + 1);
  const countInLevel = isMaxLevel ? 0 : (totalCount - currentLevelThreshold);
  const progressRatio = isMaxLevel ? 1 : Math.min(1, Math.max(0, countInLevel / neededForNextLevel));

  let tierName: BadgeLevelInfo['tierName'] = 'bronze';
  if (level >= 10) tierName = 'diamond';
  else if (level >= 7) tierName = 'platinum';
  else if (level >= 5) tierName = 'gold';
  else if (level >= 3) tierName = 'silver';
  else if (level >= 1) tierName = 'bronze';

  return {
    level,
    totalCount,
    currentLevelThreshold,
    nextLevelThreshold,
    countInLevel,
    neededForNextLevel,
    progressRatio,
    isMaxLevel,
    tierName
  };
}

/**
 * Returns metallic badge styling classes for a tier
 */
export function getBadgeTierStyle(tier: BadgeLevelInfo['tierName']) {
  switch (tier) {
    case 'diamond':
      return {
        badgeBg: 'bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-500 text-white shadow-cyan-500/40',
        border: 'border-cyan-300 ring-2 ring-cyan-400/50',
        text: 'text-cyan-600 dark:text-cyan-300',
        labelJa: 'ダイヤモンド',
        labelEn: 'Diamond'
      };
    case 'platinum':
      return {
        badgeBg: 'bg-gradient-to-br from-purple-300 via-violet-400 to-indigo-500 text-white shadow-purple-500/40',
        border: 'border-purple-300 ring-2 ring-purple-400/50',
        text: 'text-purple-600 dark:text-purple-300',
        labelJa: 'プラチナ',
        labelEn: 'Platinum'
      };
    case 'gold':
      return {
        badgeBg: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 text-amber-950 shadow-amber-500/40',
        border: 'border-amber-400 ring-2 ring-amber-400/50',
        text: 'text-amber-600 dark:text-amber-300',
        labelJa: 'ゴールド',
        labelEn: 'Gold'
      };
    case 'silver':
      return {
        badgeBg: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800 shadow-slate-400/40',
        border: 'border-slate-300 ring-1 ring-slate-300/50',
        text: 'text-slate-600 dark:text-slate-300',
        labelJa: 'シルバー',
        labelEn: 'Silver'
      };
    case 'bronze':
    default:
      return {
        badgeBg: 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 shadow-amber-700/30',
        border: 'border-amber-600 ring-1 ring-amber-600/40',
        text: 'text-amber-700 dark:text-amber-400',
        labelJa: 'ブロンズ',
        labelEn: 'Bronze'
      };
  }
}

/**
 * Increment student badges with freshly won awards and detect level-ups
 */
export function applyAwardsToBadges(
  existingBadges: Record<string, StudentBadgeRecord> = {},
  awardIds: string[]
): {
  updatedBadges: Record<string, StudentBadgeRecord>;
  levelUps: BadgeLevelUpEvent[];
  bonusGoldTotal: number;
} {
  const updatedBadges: Record<string, StudentBadgeRecord> = { ...existingBadges };
  const levelUps: BadgeLevelUpEvent[] = [];
  let bonusGoldTotal = 0;

  for (const rawId of awardIds) {
    const id = normalizeBadgeId(rawId);
    const badgeDef = BADGE_CATALOG[id];
    if (!badgeDef) continue;

    const existing = updatedBadges[id];
    const prevCount = existing ? existing.totalCount : 0;
    const newCount = prevCount + 1;

    const prevLevelInfo = calculateBadgeLevel(prevCount);
    const newLevelInfo = calculateBadgeLevel(newCount);

    updatedBadges[id] = {
      id,
      totalCount: newCount,
      level: newLevelInfo.level,
      lastAwardedAt: Date.now()
    };

    if (newLevelInfo.level > prevLevelInfo.level) {
      const bonusGold = newLevelInfo.level * 50; // Lv 1 = 50, Lv 2 = 100, etc.
      bonusGoldTotal += bonusGold;
      levelUps.push({
        badgeId: id,
        badge: badgeDef,
        oldLevel: prevLevelInfo.level,
        newLevel: newLevelInfo.level,
        bonusGold
      });
    }
  }

  return {
    updatedBadges,
    levelUps,
    bonusGoldTotal
  };
}
