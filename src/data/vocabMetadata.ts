import { CategoryKey, VocabularyItem } from '@data/types';

export interface VocabCategoryMeta {
  key: CategoryKey;
  labelEn: string;
  labelJa: string;
  hintJa: string;
  emoji: string;
}

export const VOCAB_CATEGORIES: VocabCategoryMeta[] = [
  { key: '01_action', labelEn: 'Actions', labelJa: '動作・アクション', hintJa: 'どうさ・アクション（動作）', emoji: '🏃' },
  { key: '02_state', labelEn: 'Feelings', labelJa: 'きもち・状態', hintJa: 'ようす・きもち（様子・気持ち）', emoji: '😊' },
  { key: '03_fooddrink', labelEn: 'Food & Drink', labelJa: '食べ物・飲み物', hintJa: 'たべもの・のみもの（食べ物・飲み物）', emoji: '🍎' },
  { key: '04_number', labelEn: 'Numbers', labelJa: '数字・数', hintJa: 'かず・すうじ（数・数字）', emoji: '🔢' },
  { key: '05_schoollife', labelEn: 'School', labelJa: '学校・文房具', hintJa: 'がっこう・ぶんぼうぐ（学校・文房具）', emoji: '🎒' },
  { key: '06_facility', labelEn: 'Town & Jobs', labelJa: '町・仕事・施設', hintJa: 'ばしょ・たてもの（場所・施設）', emoji: '🏥' },
  { key: '07_dailylife', labelEn: 'Daily Life', labelJa: '日常生活', hintJa: 'まいにちのせいかつ（毎日の生活）', emoji: '⏰' },
  { key: '08_sports', labelEn: 'Sports', labelJa: 'スポーツ', hintJa: 'スポーツ・あそび（スポーツ）', emoji: '⚽' },
  { key: '09_color_shape', labelEn: 'Colors & Shapes', labelJa: '色・形', hintJa: 'いろ・かたち（色・形）', emoji: '🎨' },
  { key: '10_calendar_time', labelEn: 'Days & Months', labelJa: '月・曜日・時間', hintJa: 'ひづけ・きせつ・じかん（日付・季節・時間）', emoji: '📅' },
  { key: '11_animals', labelEn: 'Animals', labelJa: '動物', hintJa: 'どうぶつ・いきもの（動物・生き物）', emoji: '🦁' },
  { key: '12_nature', labelEn: 'Nature', labelJa: '自然・天気', hintJa: 'しぜん・てんき（自然・天気）', emoji: '🌈' },
  { key: '13_position', labelEn: 'Directions', labelJa: '位置・方向', hintJa: 'いち・ほうこう（位置・方向）', emoji: '🧭' },
  { key: '14_body_family', labelEn: 'Body & Family', labelJa: '体・家族', hintJa: 'からだ・かぞく（体・家族）', emoji: '👀' },
  { key: '15_festalday', labelEn: 'Holidays', labelJa: '季節・行事', hintJa: 'ぎょうじ・イベント（行事・イベント）', emoji: '🎃' },
  { key: '16_alphabet', labelEn: 'Alphabet', labelJa: 'アルファベット', hintJa: 'アルファベット（文字）', emoji: '🔤' },
];

const CATEGORY_MAP = new Map<string, VocabCategoryMeta>(
  VOCAB_CATEGORIES.map(c => [c.key, c])
);

// Legacy category aliases kept for backwards-compatible lookup
const LEGACY_CATEGORY_ALIASES: Record<string, CategoryKey> = {
  '03_food': '03_fooddrink',
  '05_school': '05_schoollife',
  '08_sport': '08_sports',
  '09_colorshape': '09_color_shape',
  '11_animal': '11_animals',
  '14_body': '14_body_family',
};

export function getCategoryMeta(categoryKey?: string): VocabCategoryMeta | null {
  if (!categoryKey) return null;
  const resolved = LEGACY_CATEGORY_ALIASES[categoryKey] || categoryKey;
  return CATEGORY_MAP.get(resolved) || null;
}

export function getWordSemanticMeta(word: VocabularyItem): {
  key: string;
  icon: string;
  en: string;
  ja: string;
  hintJa: string;
} | null {
  if (word.sub_category === 'job' || word.tags?.includes('job')) {
    return {
      key: 'job_special',
      icon: '👩‍⚕️',
      en: 'Job / Occupation',
      ja: '職業・将来の夢',
      hintJa: 'しょうらいのゆめ・しごと（職業）',
    };
  }
  if (word.sub_category === 'country' || word.tags?.includes('country')) {
    return {
      key: 'country_special',
      icon: '🌍',
      en: 'Country / World',
      ja: '世界の国',
      hintJa: 'せかいのくに（国名）',
    };
  }
  if (word.sub_category === 'past_verb' || word.tags?.includes('past_verb')) {
    return {
      key: 'past_verb_special',
      icon: '⏮️',
      en: 'Past Action',
      ja: '過去の動作',
      hintJa: 'かこのどうさ（過去にしたこと）',
    };
  }
  const cat = getCategoryMeta(word.category);
  if (!cat) return null;
  return {
    key: cat.key,
    icon: cat.emoji,
    en: cat.labelEn,
    ja: cat.labelJa,
    hintJa: cat.hintJa,
  };
}

export function parseUnitTitle(unitStr: string): { unitNum: string; title: string; full: string } {
  const match = unitStr.match(/^Unit\s+(\d+):\s*(.+)/i);
  if (!match) {
    return { unitNum: '', title: unitStr, full: unitStr };
  }
  const unitNum = `U${match[1]}`;
  let title = match[2].trim();
  const parenMatch = title.match(/^([^(]+)\s*\((.+)\)$/);
  if (parenMatch) {
    title = parenMatch[1].trim();
  }
  return { unitNum, title, full: unitStr };
}

export function formatCompactUnitTitle(unitStr: string): string {
  const parsed = parseUnitTitle(unitStr);
  return parsed.unitNum ? `${parsed.unitNum}: ${parsed.title}` : unitStr;
}
