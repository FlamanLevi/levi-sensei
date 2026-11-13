import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCw,
  Sun,
  Moon,
  Calendar,
  Cloud,
  Smile,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  MapPin,
  Speech,
  Wind
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { speechService } from '@/services/speechService';

// --------------------------------------------------------------------------
// Types & Data Structures
// --------------------------------------------------------------------------

export type RoutineTab = 'FEELINGS' | 'CALENDAR' | 'WEATHER';
export type FeelingsLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
export type CalendarGrade = 'G3_4' | 'G5_6';
export type TextbookPreference = 'LETSTRY' | 'HEREWEGO';

export interface FeelingItem {
  id: string;
  en: string;
  jaKanji: string;
  jaRuby: React.ReactNode;
  emoji: string;
  polarity: 'positive' | 'negative';
  cardImageLT?: string | null;  // Let's Try 1 & 2 (Grades 3 & 4)
  cardImageHWG?: string | null; // Here We Go 5 & 6 (Grades 5 & 6)
  cardImage?: string;           // Fallback
}

// Intelligent Grade-Preference Fallback: resolves preferred textbook artwork with cross-grade fallback
export function getFeelingCardImage(item: FeelingItem, pref: TextbookPreference): string {
  if (pref === 'LETSTRY') {
    return item.cardImageLT || item.cardImageHWG || item.cardImage || '';
  }
  return item.cardImageHWG || item.cardImageLT || item.cardImage || '';
}

// Curated textbook feelings with dual Let's Try & Here We Go verified assets
export const FEELINGS_DATA: FeelingItem[] = [
  // Positive feelings
  {
    id: 'happy',
    en: 'happy',
    jaKanji: 'うれしい',
    jaRuby: <><ruby>嬉<rt>うれ</rt></ruby>しい</>,
    emoji: '😊',
    polarity: 'positive',
    cardImageLT: 'dic_6_card_happy_0773_1_c.png',
    cardImageHWG: 'cards/illustration/hwg5_u01_01_happy_illust.webp',
  },
  {
    id: 'good',
    en: 'good',
    jaKanji: '良い',
    jaRuby: <><ruby>良<rt>よ</rt></ruby>い・<ruby>元気<rt>げんき</rt></ruby></>,
    emoji: '👍',
    polarity: 'positive',
    cardImageLT: 'dic_6_card_good_0776_1_c.png',
    cardImageHWG: 'cards/illustration/hwg5_u01_02_good_illust.webp',
  },
  {
    id: 'great',
    en: 'great',
    jaKanji: 'すばらしい',
    jaRuby: <><ruby>最高<rt>さいこう</rt></ruby></>,
    emoji: '✨',
    polarity: 'positive',
    cardImageLT: 'dic_5_card_great_0329_1_c.png',
    cardImageHWG: 'cards/illustration/hwg5_u01_03_great_illust.webp',
  },
  {
    id: 'fine',
    en: 'fine',
    jaKanji: '元気な',
    jaRuby: <><ruby>元気<rt>げんき</rt></ruby></>,
    emoji: '🙂',
    polarity: 'positive',
    cardImageLT: 'dic_wb_02state_fine_1106_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u01_00_fine_illust.webp',
  },
  {
    id: 'excited',
    en: 'excited',
    jaKanji: 'わくわくした',
    jaRuby: <>わくわくした</>,
    emoji: '🤩',
    polarity: 'positive',
    cardImageLT: null,
    cardImageHWG: 'cards/illustration/hwg5_u01_10_excited_illust.webp',
  },
  {
    id: 'cheerful',
    en: 'cheerful',
    jaKanji: '明るい',
    jaRuby: <><ruby>明<rt>あか</rt></ruby>るい</>,
    emoji: '😄',
    polarity: 'positive',
    cardImageLT: null,
    cardImageHWG: 'cards/illustration/hwg5_u18_07_cheerful_illust.webp',
  },
  {
    id: 'fantastic',
    en: 'fantastic',
    jaKanji: 'すばらしい',
    jaRuby: <>すばらしい</>,
    emoji: '🌟',
    polarity: 'positive',
    cardImageLT: 'dic_5_card_fantastic_0326_1_c.png',
    cardImageHWG: 'dic_5_card_fantastic_0326_1_c.png',
  },
  {
    id: 'wonderful',
    en: 'wonderful',
    jaKanji: '最高の気分',
    jaRuby: <><ruby>最高<rt>さいこう</rt></ruby>の<ruby>気分<rt>きぶん</rt></ruby></>,
    emoji: '🎉',
    polarity: 'positive',
    cardImageLT: 'dic_6_card_wonderful_0777_1_c.png',
    cardImageHWG: 'cards/illustration/hwg5_u24_03_wonderful_illust.webp',
  },
  {
    id: 'active',
    en: 'active',
    jaKanji: '活発な',
    jaRuby: <><ruby>活発<rt>かっぱつ</rt></ruby>な</>,
    emoji: '⚡',
    polarity: 'positive',
    cardImageLT: 'dic_5_card_active_0324_1_c.png',
    cardImageHWG: 'cards/illustration/hwg5_u18_00_active_illust.webp',
  },
  {
    id: 'brave',
    en: 'brave',
    jaKanji: '勇敢な',
    jaRuby: <><ruby>勇気<rt>ゆうき</rt></ruby>がある</>,
    emoji: '🦁',
    polarity: 'positive',
    cardImageLT: 'dic_wb_02state_brave_1102_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u18_01_brave_illust.webp',
  },
  {
    id: 'fun',
    en: 'fun',
    jaKanji: '楽しい',
    jaRuby: <><ruby>楽<rt>たの</rt></ruby>しい</>,
    emoji: '🎈',
    polarity: 'positive',
    cardImageLT: 'dic_5_card_fun_0265_1_c.png',
    cardImageHWG: 'cards/illustration/hwg5_u24_04_fun_illust.webp',
  },

  // Negative feelings / Sensations / Needs
  {
    id: 'sleepy',
    en: 'sleepy',
    jaKanji: '眠い',
    jaRuby: <><ruby>眠<rt>ねむ</rt></ruby>い</>,
    emoji: '😴',
    polarity: 'negative',
    cardImageLT: 'dic_wb_02state_sleepy_1093_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u01_04_sleepy_illust.webp',
  },
  {
    id: 'tired',
    en: 'tired',
    jaKanji: '疲れた',
    jaRuby: <><ruby>疲<rt>つか</rt></ruby>れた</>,
    emoji: '🥱',
    polarity: 'negative',
    cardImageLT: 'dic_wb_02state_tired_1118_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u01_05_tired_illust.webp',
  },
  {
    id: 'hungry',
    en: 'hungry',
    jaKanji: 'お腹がすいた',
    jaRuby: <>お<ruby>腹<rt>なか</rt></ruby>がすいた</>,
    emoji: '🍙',
    polarity: 'negative',
    cardImageLT: 'dic_wb_02state_hungry_1112_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u01_06_hungry_illust.webp',
  },
  {
    id: 'thirsty',
    en: 'thirsty',
    jaKanji: 'のどが渇いた',
    jaRuby: <>のどが<ruby>渇<rt>かわ</rt></ruby>いた</>,
    emoji: '🥤',
    polarity: 'negative',
    cardImageLT: null,
    cardImageHWG: 'cards/illustration/hwg5_u01_07_thirsty_illust.webp',
  },
  {
    id: 'sad',
    en: 'sad',
    jaKanji: '悲しい',
    jaRuby: <><ruby>悲<rt>かな</rt></ruby>しい</>,
    emoji: '😢',
    polarity: 'negative',
    cardImageLT: 'dic_wb_02state_sad_1114_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u01_08_sad_illust.webp',
  },
  {
    id: 'angry',
    en: 'angry',
    jaKanji: '怒った',
    jaRuby: <><ruby>怒<rt>おこ</rt></ruby>った</>,
    emoji: '😡',
    polarity: 'negative',
    cardImageLT: null,
    cardImageHWG: 'cards/illustration/hwg5_u01_09_angry_illust.webp',
  },
  {
    id: 'nervous',
    en: 'nervous',
    jaKanji: '緊張した',
    jaRuby: <><ruby>緊張<rt>きんちょう</rt></ruby>した</>,
    emoji: '😰',
    polarity: 'negative',
    cardImageLT: null,
    cardImageHWG: 'cards/illustration/hwg5_u01_11_nervous_illust.webp',
  },
  {
    id: 'cold',
    en: 'cold',
    jaKanji: '寒い',
    jaRuby: <><ruby>寒<rt>さむ</rt></ruby>い</>,
    emoji: '🥶',
    polarity: 'negative',
    cardImageLT: 'dic_4_card_cold_2506_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u02_05_cold_illust.webp',
  },
  {
    id: 'hot',
    en: 'hot',
    jaKanji: '暑い',
    jaRuby: <><ruby>暑<rt>あつ</rt></ruby>い</>,
    emoji: '🥵',
    polarity: 'negative',
    cardImageLT: 'dic_4_card_hot_2505_1_c.webp',
    cardImageHWG: 'cards/illustration/hwg5_u02_04_hot_illust.webp',
  },
  {
    id: 'busy',
    en: 'busy',
    jaKanji: '忙しい',
    jaRuby: <><ruby>忙<rt>いそが</rt></ruby>しい</>,
    emoji: '📝',
    polarity: 'negative',
    cardImageLT: 'dic_wb_02state_busy_1103_1_c.webp',
    cardImageHWG: null,
  },
  {
    id: 'shy',
    en: 'shy',
    jaKanji: '恥ずかしい',
    jaRuby: <><ruby>恥<rt>は</rt></ruby>ずかしい</>,
    emoji: '🙈',
    polarity: 'negative',
    cardImageLT: null,
    cardImageHWG: 'cards/illustration/hwg5_u18_10_shy_illust.webp',
  }
];

// Helper to resolve Vite asset streaming URL
function formatAssetUrl(pathStr: string): string {
  if (!pathStr) return '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('/')) {
    return pathStr;
  }
  if (pathStr.startsWith('cards/')) {
    return `/${pathStr}`;
  }
  return `/media/images/${pathStr}`;
}

const WEEKDAYS = [
  { en: 'Sunday', ja: '日曜日', jaRuby: <><ruby>日曜日<rt>にちようび</rt></ruby></>, cardImage: 'dic_5_card_sunday_0189_1_c.png' },
  { en: 'Monday', ja: '月曜日', jaRuby: <><ruby>月曜日<rt>げつようび</rt></ruby></>, cardImage: 'dic_5_card_monday_0190_1_c.png' },
  { en: 'Tuesday', ja: '火曜日', jaRuby: <><ruby>火曜日<rt>かようび</rt></ruby></>, cardImage: 'dic_5_card_tuesday_0191_1_c.png' },
  { en: 'Wednesday', ja: '水曜日', jaRuby: <><ruby>水曜日<rt>すいようび</rt></ruby></>, cardImage: 'dic_5_card_wednesday_0192_1_c.png' },
  { en: 'Thursday', ja: '木曜日', jaRuby: <><ruby>木曜日<rt>もくようび</rt></ruby></>, cardImage: 'dic_5_card_thursday_0193_1_c.png' },
  { en: 'Friday', ja: '金曜日', jaRuby: <><ruby>金曜日<rt>きんようび</rt></ruby></>, cardImage: 'dic_5_card_friday_0194_1_c.png' },
  { en: 'Saturday', ja: '土曜日', jaRuby: <><ruby>土曜日<rt>どようび</rt></ruby></>, cardImage: 'dic_5_card_saturday_0195_1_c.png' },
];

const MONTHS = [
  { en: 'January', ja: '1月', cardImage: 'dic_5_card_january_0162_1_c.png' },
  { en: 'February', ja: '2月', cardImage: 'dic_5_card_february_0163_1_c.png' },
  { en: 'March', ja: '3月', cardImage: 'dic_5_card_march_0164_1_c.png' },
  { en: 'April', ja: '4月', cardImage: 'dic_5_card_april_0165_1_c.png' },
  { en: 'May', ja: '5月', cardImage: 'dic_5_card_may_0166_1_c.png' },
  { en: 'June', ja: '6月', cardImage: 'dic_5_card_june_0167_1_c.png' },
  { en: 'July', ja: '7月', cardImage: 'dic_5_card_july_0168_1_c.png' },
  { en: 'August', ja: '8月', cardImage: 'dic_5_card_august_0169_1_c.png' },
  { en: 'September', ja: '9月', cardImage: 'dic_5_card_september_0170_1_c.png' },
  { en: 'October', ja: '10月', cardImage: 'dic_5_card_october_0171_1_c.png' },
  { en: 'November', ja: '11月', cardImage: 'dic_5_card_november_0172_1_c.png' },
  { en: 'December', ja: '12月', cardImage: 'dic_5_card_december_0173_1_c.png' },
];

function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

// Weather Condition definitions
export type SkyCondition = 'sunny' | 'mostly_sunny' | 'partly_cloudy' | 'mostly_cloudy' | 'overcast';
export type PrecipitationCondition = 'none' | 'rainy' | 'snowy';
export type TemperatureFeel = 'hot' | 'warm' | 'cool' | 'cold';

export interface SkyOption {
  id: SkyCondition;
  en: string;
  ja: string;
  jaRuby: React.ReactNode;
  emoji: string;
  cloudPct: number;
  cardImage: string;
}

export interface PrecipitationOption {
  id: PrecipitationCondition;
  en: string;
  labelEn: string;
  ja: string;
  jaRuby: React.ReactNode;
  emoji: string;
  cardImage: string | null;
}

export const SKY_CONDITIONS: SkyOption[] = [
  {
    id: 'sunny',
    en: 'sunny',
    ja: '快晴',
    jaRuby: <><ruby>快晴<rt>かいせい</rt></ruby></>,
    emoji: '☀️',
    cloudPct: 5,
    cardImage: 'dic_wb_12nature_sunny_1523_1_c.png'
  },
  {
    id: 'mostly_sunny',
    en: 'mostly sunny',
    ja: '晴れ',
    jaRuby: <><ruby>晴<rt>は</rt></ruby>れ</>,
    emoji: '🌤️',
    cloudPct: 20,
    cardImage: 'dic_wb_12nature_sunny_1523_1_c.png'
  },
  {
    id: 'partly_cloudy',
    en: 'partly cloudy',
    ja: '晴れ・曇り',
    jaRuby: <><ruby>晴<rt>は</rt></ruby>れ・<ruby>曇<rt>くも</rt></ruby>り</>,
    emoji: '⛅',
    cloudPct: 45,
    cardImage: 'dic_wb_12nature_cloudy_1520_1_c.png'
  },
  {
    id: 'mostly_cloudy',
    en: 'mostly cloudy',
    ja: '曇りがち',
    jaRuby: <><ruby>曇<rt>くも</rt></ruby>りがち</>,
    emoji: '🌥️',
    cloudPct: 75,
    cardImage: 'dic_wb_12nature_cloudy_1520_1_c.png'
  },
  {
    id: 'overcast',
    en: 'overcast',
    ja: '曇り',
    jaRuby: <><ruby>曇<rt>くも</rt></ruby>り</>,
    emoji: '☁️',
    cloudPct: 95,
    cardImage: 'dic_wb_12nature_cloudy_1520_1_c.png'
  }
];

export const PRECIPITATION_CONDITIONS: PrecipitationOption[] = [
  {
    id: 'none',
    en: '',
    labelEn: 'Dry (None)',
    ja: 'なし',
    jaRuby: 'なし',
    emoji: '☀️',
    cardImage: null
  },
  {
    id: 'rainy',
    en: 'rainy',
    labelEn: 'Rainy',
    ja: '雨',
    jaRuby: <><ruby>雨<rt>あめ</rt></ruby></>,
    emoji: '🌧️',
    cardImage: 'dic_wb_12nature_rainy_1521_1_c.png'
  },
  {
    id: 'snowy',
    en: 'snowy',
    labelEn: 'Snowy',
    ja: '雪',
    jaRuby: <><ruby>雪<rt>ゆき</rt></ruby></>,
    emoji: '❄️',
    cardImage: 'dic_wb_12nature_snowy_1522_1_c.png'
  }
];

export const DailyRoutineModal: React.FC = () => {
  const { isRoutineModalOpen, closeRoutineModal, theme, toggleTheme, activeSchool, activeGrade } = useClassroom();
  const { language } = useLanguage();
  const { isMuted, playPop } = useAudio();

  // Navigation state
  const [activeTab, setActiveTab] = useState<RoutineTab>('FEELINGS');

  // Independent Language Toggles
  const [textLang, setTextLang] = useState<'en' | 'ja'>(language);
  const [voiceLang, setVoiceLang] = useState<'en' | 'ja' | 'off'>('en');

  // Textbook Preference: Let's Try (G3-4) vs Here We Go (G5-6)
  const [textbookPref, setTextbookPref] = useState<TextbookPreference>(() => {
    const g = String(activeGrade || '');
    return g.includes('5') || g.includes('6') ? 'HEREWEGO' : 'LETSTRY';
  });

  // Calendar Grade inherits directly from active textbook preference
  const calendarGrade: CalendarGrade = textbookPref === 'LETSTRY' ? 'G3_4' : 'G5_6';

  useEffect(() => {
    const g = String(activeGrade || '');
    if (g.includes('3') || g.includes('4')) {
      setTextbookPref('LETSTRY');
    } else if (g.includes('5') || g.includes('6')) {
      setTextbookPref('HEREWEGO');
    }
  }, [activeGrade]);

  useEffect(() => {
    setTextLang(language);
  }, [language]);

  const t = useCallback((en: React.ReactNode, ja: React.ReactNode) => {
    return textLang === 'ja' ? ja : en;
  }, [textLang]);

  const tStr = useCallback((en: string, ja: string) => {
    return textLang === 'ja' ? ja : en;
  }, [textLang]);

  // --------------------------------------------------------------------------
  // Tab 1: Feelings & Greetings State
  // --------------------------------------------------------------------------
  const [feelingsLevel, setFeelingsLevel] = useState<FeelingsLevel>('LEVEL_1');
  const [speakerAWords, setSpeakerAWords] = useState<FeelingItem[]>([]);
  const [speakerBWords, setSpeakerBWords] = useState<FeelingItem[]>([]);

  // Utility: Fisher-Yates shuffle
  const shuffleDeck = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Randomize words based on level (Guaranteed no-duplicate shuffled deck across Speaker A and B)
  const rollFeelings = useCallback(() => {
    soundEffects.playCardFlip();
    const positives = FEELINGS_DATA.filter(f => f.polarity === 'positive');
    const negatives = FEELINGS_DATA.filter(f => f.polarity === 'negative');

    if (feelingsLevel === 'LEVEL_1') {
      // 1 distinct word each (2 unique cards on screen)
      const shuffled = shuffleDeck(FEELINGS_DATA);
      setSpeakerAWords([shuffled[0]]);
      setSpeakerBWords([shuffled[1]]);
    } else if (feelingsLevel === 'LEVEL_2') {
      // 2 distinct words each (4 unique cards on screen)
      const shuffled = shuffleDeck(FEELINGS_DATA);
      setSpeakerAWords([shuffled[0], shuffled[1]]);
      setSpeakerBWords([shuffled[2], shuffled[3]]);
    } else {
      // LEVEL 3: Contrast with "but" (Pair 1 Negative with 1 Positive, 4 unique cards total)
      const shuffNeg = shuffleDeck(negatives);
      const shuffPos = shuffleDeck(positives);
      const orderA = Math.random() > 0.3 ? [shuffNeg[0], shuffPos[0]] : [shuffPos[0], shuffNeg[0]];
      const orderB = Math.random() > 0.3 ? [shuffNeg[1], shuffPos[1]] : [shuffPos[1], shuffNeg[1]];
      setSpeakerAWords(orderA);
      setSpeakerBWords(orderB);
    }
  }, [feelingsLevel]);

  // Initial roll on open or level change
  useEffect(() => {
    if (isRoutineModalOpen) {
      rollFeelings();
    }
  }, [isRoutineModalOpen, feelingsLevel, rollFeelings]);

  // Re-roll a single specific slot (excluding other currently active words on screen)
  const rerollSlot = (speaker: 'A' | 'B', index: number) => {
    playPop();
    soundEffects.playTick();
    const isLevel3 = feelingsLevel === 'LEVEL_3';
    const targetArray = speaker === 'A' ? [...speakerAWords] : [...speakerBWords];
    const currentWord = targetArray[index];
    if (!currentWord) return;

    // Collect IDs of other active words on screen to avoid duplicates
    const otherActiveIds = new Set<string>();
    speakerAWords.forEach((w, i) => {
      if (speaker !== 'A' || i !== index) otherActiveIds.add(w.id);
    });
    speakerBWords.forEach((w, i) => {
      if (speaker !== 'B' || i !== index) otherActiveIds.add(w.id);
    });

    let pool = FEELINGS_DATA.filter(f => !otherActiveIds.has(f.id));
    if (pool.length === 0) pool = FEELINGS_DATA; // fallback if pool depleted

    if (isLevel3) {
      const polarity = currentWord.polarity;
      const polarityPool = pool.filter(f => f.polarity === polarity);
      if (polarityPool.length > 0) pool = polarityPool;
    }

    let next = pool[Math.floor(Math.random() * pool.length)];
    while (next.id === currentWord.id && pool.length > 1) {
      next = pool[Math.floor(Math.random() * pool.length)];
    }
    targetArray[index] = next;
    if (speaker === 'A') setSpeakerAWords(targetArray);
    else setSpeakerBWords(targetArray);
  };

  // Check if Speaker A has matching feeling(s) as Speaker B ("Me too!" scenario)
  const isMatchingFeelings = useMemo(() => {
    if (speakerAWords.length === 0 || speakerBWords.length === 0) return false;
    if (speakerAWords.length !== speakerBWords.length) return false;
    return speakerAWords.every((w, i) => w.id === speakerBWords[i]?.id);
  }, [speakerAWords, speakerBWords]);

  // Generate dialogue components (3-Turn Classroom Routine: A asks ➔ B answers & returns ➔ A replies)
  const getSpeakerAQuestion = useCallback((lang: 'en' | 'ja' = 'en') => {
    return lang === 'en' ? 'Hello! How are you?' : 'こんにちは！元気ですか？';
  }, []);

  const getSpeakerBFeelingText = useCallback((lang: 'en' | 'ja' = 'en') => {
    if (speakerBWords.length === 0) return '';
    if (lang === 'en') {
      if (feelingsLevel === 'LEVEL_1') {
        return `I am ${speakerBWords[0].en}.`;
      }
      if (feelingsLevel === 'LEVEL_2') {
        return `I am ${speakerBWords[0].en} and ${speakerBWords[1].en}.`;
      }
      return `I am ${speakerBWords[0].en}, but ${speakerBWords[1].en}!`;
    }
    // Japanese
    if (feelingsLevel === 'LEVEL_1') {
      return `私は${speakerBWords[0].jaKanji}です。`;
    }
    if (feelingsLevel === 'LEVEL_2') {
      return `私は${speakerBWords[0].jaKanji}、そして${speakerBWords[1].jaKanji}です。`;
    }
    return `私は${speakerBWords[0].jaKanji}だけど、${speakerBWords[1].jaKanji}です！`;
  }, [speakerBWords, feelingsLevel]);

  const getSpeakerBFullSentence = useCallback((lang: 'en' | 'ja' = 'en') => {
    const feeling = getSpeakerBFeelingText(lang);
    if (!feeling) return '';
    return lang === 'en' ? `${feeling} Thank you. And you?` : `${feeling}ありがとう。あなたは？`;
  }, [getSpeakerBFeelingText]);

  const getSpeakerAReplyText = useCallback((lang: 'en' | 'ja' = 'en') => {
    if (speakerAWords.length === 0) return '';
    const isMatching = isMatchingFeelings;
    if (lang === 'en') {
      if (isMatching && feelingsLevel === 'LEVEL_1') {
        return `Me too! I am ${speakerAWords[0].en}, too!`;
      }
      if (feelingsLevel === 'LEVEL_1') {
        return `I am ${speakerAWords[0].en}!`;
      }
      if (feelingsLevel === 'LEVEL_2') {
        return `I am ${speakerAWords[0].en} and ${speakerAWords[1].en}!`;
      }
      return `I am ${speakerAWords[0].en}, but ${speakerAWords[1].en}!`;
    }
    // Japanese
    if (isMatching && feelingsLevel === 'LEVEL_1') {
      return `私も！私も${speakerAWords[0].jaKanji}です！`;
    }
    if (feelingsLevel === 'LEVEL_1') {
      return `私は${speakerAWords[0].jaKanji}です！`;
    }
    if (feelingsLevel === 'LEVEL_2') {
      return `私は${speakerAWords[0].jaKanji}、そして${speakerAWords[1].jaKanji}です！`;
    }
    return `私は${speakerAWords[0].jaKanji}だけど、${speakerAWords[1].jaKanji}です！`;
  }, [speakerAWords, isMatchingFeelings, feelingsLevel]);

  // Speak dialogue with distinct voices & calibrated pitch for Teacher vs Student
  const handleSpeakSpeaker = async (speaker: 'A' | 'B') => {
    if (voiceLang === 'off') return;
    if (speaker === 'A') {
      const q = getSpeakerAQuestion(voiceLang);
      const r = getSpeakerAReplyText(voiceLang);
      const spokenText = voiceLang === 'ja' ? `${q}、${r}` : `${q} ... ${r}`;
      await speechService.speak(spokenText, {
        lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
        voice: voiceLang === 'ja' ? undefined : speechService.getTeacherVoice(),
        pitch: voiceLang === 'ja' ? 0.95 : 0.94,
        rate: 0.86,
      });
    } else {
      const bText = getSpeakerBFullSentence(voiceLang);
      await speechService.speak(bText, {
        lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
        voice: voiceLang === 'ja' ? undefined : speechService.getStudentVoice(),
        pitch: voiceLang === 'ja' ? 1.15 : 1.18,
        rate: 0.92,
      });
    }
  };

  const handleSpeakFullDialogue = async () => {
    if (voiceLang === 'off') return;
    const qA = getSpeakerAQuestion(voiceLang);
    const bText = getSpeakerBFullSentence(voiceLang);
    const rA = getSpeakerAReplyText(voiceLang);

    const pause = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Turn 1: Teacher greets & asks
    await speechService.speak(qA, {
      lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
      voice: voiceLang === 'ja' ? undefined : speechService.getTeacherVoice(),
      pitch: voiceLang === 'ja' ? 0.95 : 0.94,
      rate: 0.86,
    });

    await pause(450);

    // Turn 2: Student replies with feeling and returns question
    await speechService.speak(bText, {
      lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
      voice: voiceLang === 'ja' ? undefined : speechService.getStudentVoice(),
      pitch: voiceLang === 'ja' ? 1.15 : 1.18,
      rate: 0.92,
    });

    await pause(450);

    // Turn 3: Teacher answers return question
    await speechService.speak(rA, {
      lang: voiceLang === 'ja' ? 'ja-JP' : 'en-US',
      voice: voiceLang === 'ja' ? undefined : speechService.getTeacherVoice(),
      pitch: voiceLang === 'ja' ? 0.95 : 0.94,
      rate: 0.86,
    });
  };

  // --------------------------------------------------------------------------
  // Tab 2: Chalkboard Calendar State
  // --------------------------------------------------------------------------
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Blank slots reveal tracking: { [slotKey]: boolean }
  const [revealedSlots, setRevealedSlots] = useState<Record<string, boolean>>({
    // Today
    todayDay: true,
    todayMonth: true,
    todayDateNumber: true,
    todayYear: true,
    // Yesterday
    yesterdayDay: true,
    yesterdayMonth: true,
    yesterdayDateNumber: true,
    yesterdayYear: true,
    // Tomorrow
    tomorrowDay: true,
    tomorrowMonth: true,
    tomorrowDateNumber: true,
    tomorrowYear: true,
  });

  const toggleSlotReveal = (slotKey: string) => {
    soundEffects.playChime();
    setRevealedSlots(prev => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  const revealAllSlots = () => {
    soundEffects.playFanfare();
    setRevealedSlots({
      todayDay: true,
      todayMonth: true,
      todayDateNumber: true,
      todayYear: true,
      yesterdayDay: true,
      yesterdayMonth: true,
      yesterdayDateNumber: true,
      yesterdayYear: true,
      tomorrowDay: true,
      tomorrowMonth: true,
      tomorrowDateNumber: true,
      tomorrowYear: true,
    });
  };

  const hideAllSlots = () => {
    playPop();
    setRevealedSlots({
      todayDay: false,
      todayMonth: false,
      todayDateNumber: false,
      todayYear: false,
      yesterdayDay: false,
      yesterdayMonth: false,
      yesterdayDateNumber: false,
      yesterdayYear: false,
      tomorrowDay: false,
      tomorrowMonth: false,
      tomorrowDateNumber: false,
      tomorrowYear: false,
    });
  };

  // Date derived values: Today
  const currentWeekday = WEEKDAYS[calendarDate.getDay()];
  const currentMonth = MONTHS[calendarDate.getMonth()];
  const currentDateNum = calendarDate.getDate();
  const currentYear = calendarDate.getFullYear();

  // Date derived values: Yesterday
  const yesterdayDate = new Date(calendarDate);
  yesterdayDate.setDate(calendarDate.getDate() - 1);
  const yesterdayWeekday = WEEKDAYS[yesterdayDate.getDay()];
  const yesterdayMonth = MONTHS[yesterdayDate.getMonth()];
  const yesterdayDateNum = yesterdayDate.getDate();
  const yesterdayYear = yesterdayDate.getFullYear();

  // Date derived values: Tomorrow
  const tomorrowDate = new Date(calendarDate);
  tomorrowDate.setDate(calendarDate.getDate() + 1);
  const tomorrowWeekday = WEEKDAYS[tomorrowDate.getDay()];
  const tomorrowMonth = MONTHS[tomorrowDate.getMonth()];
  const tomorrowDateNum = tomorrowDate.getDate();
  const tomorrowYear = tomorrowDate.getFullYear();

  const shiftCalendarDate = (days: number) => {
    playPop();
    const d = new Date(calendarDate);
    d.setDate(d.getDate() + days);
    setCalendarDate(d);
  };

  // Calendar readout
  const handleReadCalendar = () => {
    if (voiceLang === 'off') return;
    if (voiceLang === 'ja') {
      let jaText = '';
      if (calendarGrade === 'G3_4') {
        jaText = `今日は${currentWeekday.ja}です。`;
      } else {
        jaText = `昨日は${yesterdayYear}年${yesterdayMonth.ja}${yesterdayDateNum}日、${yesterdayWeekday.ja}でした。今日は${currentYear}年${currentMonth.ja}${currentDateNum}日、${currentWeekday.ja}です。明日は${tomorrowYear}年${tomorrowMonth.ja}${tomorrowDateNum}日、${tomorrowWeekday.ja}です。`;
      }
      speechService.speak(jaText, { lang: 'ja-JP' });
      return;
    }

    let textToSpeak = '';
    if (calendarGrade === 'G3_4') {
      textToSpeak = `Today is ${currentWeekday.en}.`;
    } else {
      textToSpeak = `Yesterday was ${yesterdayWeekday.en}, ${yesterdayMonth.en} ${getOrdinalSuffix(yesterdayDateNum)}, ${yesterdayYear}. Today is ${currentWeekday.en}, ${currentMonth.en} ${getOrdinalSuffix(currentDateNum)}, ${currentYear}. Tomorrow will be ${tomorrowWeekday.en}, ${tomorrowMonth.en} ${getOrdinalSuffix(tomorrowDateNum)}, ${tomorrowYear}.`;
    }
    speechService.speak(textToSpeak, { lang: 'en-US' });
  };

  // --------------------------------------------------------------------------
  // Tab 3: Weather & Sky State (Multi-Attribute Weather Matrix)
  // --------------------------------------------------------------------------
  const [skyCondition, setSkyCondition] = useState<SkyCondition>('partly_cloudy');
  const [precipitation, setPrecipitation] = useState<PrecipitationCondition>('none');
  const [isWindy, setIsWindy] = useState<boolean>(false);
  const [temperatureFeel, setTemperatureFeel] = useState<TemperatureFeel>('cool');
  const [cloudCoverPct, setCloudCoverPct] = useState<number>(45);
  const [liveTemp, setLiveTemp] = useState<number | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState<boolean>(false);
  const [weatherSource, setWeatherSource] = useState<'live' | 'manual'>('manual');

  // Active object lookups
  const activeSky = useMemo(() => SKY_CONDITIONS.find(s => s.id === skyCondition) || SKY_CONDITIONS[2], [skyCondition]);
  const activePrecip = useMemo(() => precipitation !== 'none' ? PRECIPITATION_CONDITIONS.find(p => p.id === precipitation) : null, [precipitation]);

  // Flashcard artwork selection
  const activeCardImage = useMemo(() => {
    if (precipitation === 'snowy') return 'dic_wb_12nature_snowy_1522_1_c.png';
    if (precipitation === 'rainy') return 'dic_wb_12nature_rainy_1521_1_c.png';
    if (skyCondition === 'sunny' || skyCondition === 'mostly_sunny') return 'dic_wb_12nature_sunny_1523_1_c.png';
    return 'dic_wb_12nature_cloudy_1520_1_c.png';
  }, [precipitation, skyCondition]);

  // Handler: Select Sky with smart mutual exclusion
  const handleSelectSky = (skyId: SkyCondition) => {
    playPop();
    setSkyCondition(skyId);
    setWeatherSource('manual');
    const sky = SKY_CONDITIONS.find(s => s.id === skyId);
    if (sky) setCloudCoverPct(sky.cloudPct);
    // If clear or mostly sunny, precipitation must be none (dry)
    if (skyId === 'sunny' || skyId === 'mostly_sunny') {
      if (precipitation !== 'none') setPrecipitation('none');
    }
  };

  // Handler: Select Precipitation with smart mutual exclusion
  const handleSelectPrecipitation = (precipId: PrecipitationCondition) => {
    playPop();
    setPrecipitation(precipId);
    setWeatherSource('manual');
    if (precipId === 'rainy') {
      // Rain requires clouds
      if (skyCondition === 'sunny' || skyCondition === 'mostly_sunny') {
        setSkyCondition('overcast');
        setCloudCoverPct(90);
      }
    } else if (precipId === 'snowy') {
      // Snow requires clouds and freezing/cold weather
      if (skyCondition === 'sunny' || skyCondition === 'mostly_sunny') {
        setSkyCondition('overcast');
        setCloudCoverPct(95);
      }
      if (temperatureFeel === 'hot' || temperatureFeel === 'warm') {
        setTemperatureFeel('cold');
      }
    }
  };

  // Handler: Toggle Wind
  const handleToggleWind = () => {
    playPop();
    setIsWindy(prev => !prev);
    setWeatherSource('manual');
  };

  // Handler: Select Temperature with smart mutual exclusion
  const handleSelectTemperature = (temp: TemperatureFeel) => {
    playPop();
    setTemperatureFeel(temp);
    setWeatherSource('manual');
    // If user sets Hot or Warm, cancel snow
    if ((temp === 'hot' || temp === 'warm') && precipitation === 'snowy') {
      setPrecipitation('none');
    }
  };

  // Fetch real-time weather from Open-Meteo
  const fetchLocalWeather = useCallback(async () => {
    setIsFetchingWeather(true);
    soundEffects.playTick();

    // Default coordinates based on active school
    let lat = 35.612; // Futakotamagawa (Setagaya, Tokyo)
    let lon = 139.627;
    if (activeSchool === 'toyogaoka') {
      lat = 35.615; // Toyogaoka (Tama, Tokyo)
      lon = 139.432;
    }

    try {
      // Use ECMWF IFS model (ecmwf_ifs025) which matches real-world ground observations & Apple/Windows Weather (prevents coarse JMA numerical model drift)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m&models=ecmwf_ifs025&timezone=Asia%2FTokyo`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.current) {
        const cCover = data.current.cloud_cover ?? 30;
        const temp = Math.round(data.current.temperature_2m ?? 18);
        const wCode = data.current.weather_code ?? 1;
        const windSpeed = data.current.wind_speed_10m ?? 5;

        setCloudCoverPct(cCover);
        setLiveTemp(temp);

        // 1. Auto determine temperature feeling
        if (temp >= 28) setTemperatureFeel('hot');
        else if (temp >= 20) setTemperatureFeel('warm');
        else if (temp >= 13) setTemperatureFeel('cool');
        else setTemperatureFeel('cold');

        // 2. Auto determine sky condition from cloud cover
        if (cCover <= 15) setSkyCondition('sunny');
        else if (cCover <= 30) setSkyCondition('mostly_sunny');
        else if (cCover <= 60) setSkyCondition('partly_cloudy');
        else if (cCover <= 85) setSkyCondition('mostly_cloudy');
        else setSkyCondition('overcast');

        // 3. Auto determine precipitation from WMO code
        if (wCode >= 71) {
          setPrecipitation('snowy');
          setSkyCondition('overcast');
        } else if (wCode >= 51) {
          setPrecipitation('rainy');
        } else {
          setPrecipitation('none');
        }

        // 4. Auto determine wind from wind speed (>= 20 km/h is breezy/windy)
        setIsWindy(windSpeed >= 20);

        setWeatherSource('live');
        soundEffects.playReveal();
      }
    } catch (err) {
      console.warn('Weather fetch fallback:', err);
    } finally {
      setIsFetchingWeather(false);
    }
  }, [activeSchool]);

  // Initial weather auto-fetch only once when landing on weather tab
  const hasAutoFetchedWeatherRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isRoutineModalOpen) {
      hasAutoFetchedWeatherRef.current = false;
    }
  }, [isRoutineModalOpen]);

  useEffect(() => {
    if (activeTab === 'WEATHER' && !hasAutoFetchedWeatherRef.current) {
      hasAutoFetchedWeatherRef.current = true;
      fetchLocalWeather();
    }
  }, [activeTab, fetchLocalWeather]);

  // Weather words list for sentence building
  const weatherDescriptorWords = useMemo(() => {
    const list: { en: string; jaRuby: React.ReactNode; jaStr: string; color: string }[] = [];
    list.push({ en: activeSky.en, jaRuby: activeSky.jaRuby, jaStr: activeSky.ja, color: 'text-amber-300' });
    if (activePrecip) {
      list.push({
        en: activePrecip.en,
        jaRuby: activePrecip.jaRuby,
        jaStr: activePrecip.ja,
        color: activePrecip.id === 'snowy' ? 'text-sky-200' : 'text-blue-300'
      });
    }
    if (isWindy) {
      list.push({
        en: 'windy',
        jaRuby: <><ruby>風<rt>かぜ</rt></ruby>が<ruby>強<rt>つよ</rt></ruby>い</>,
        jaStr: '風が強い',
        color: 'text-indigo-200'
      });
    }
    return list;
  }, [activeSky, activePrecip, isWindy]);

  // Natural Japanese weather sentence for elementary students & HRTs
  const japaneseWeatherSentence = useMemo(() => {
    const tempJa = {
      hot: '暑い',
      warm: '暖かい',
      cool: '涼しい',
      cold: '寒い',
    }[temperatureFeel];

    if (precipitation === 'rainy') {
      if (skyCondition === 'partly_cloudy') {
        return isWindy
          ? `晴れ間もありますが雨、風が強くて${tempJa}です。`
          : `晴れ間もありますが雨が降り、${tempJa}です。`;
      }
      if (skyCondition === 'sunny' || skyCondition === 'mostly_sunny') {
        return isWindy
          ? `晴れて雨、風が強くて${tempJa}です。`
          : `晴れて雨が降り、${tempJa}です。`;
      }
      // overcast or mostly_cloudy
      return isWindy
        ? `曇りで雨、風が強くて${tempJa}です。`
        : `曇りで雨が降り、${tempJa}です。`;
    }

    if (precipitation === 'snowy') {
      if (skyCondition === 'partly_cloudy') {
        return isWindy
          ? `晴れ間もありますが雪、風が強くて${tempJa}です。`
          : `晴れ間もありますが雪が降り、${tempJa}です。`;
      }
      if (skyCondition === 'sunny' || skyCondition === 'mostly_sunny') {
        return isWindy
          ? `晴れて雪、風が強くて${tempJa}です。`
          : `晴れて雪が降り、${tempJa}です。`;
      }
      // overcast or mostly_cloudy
      return isWindy
        ? `曇りで雪、風が強くて${tempJa}です。`
        : `曇りで雪が降り、${tempJa}です。`;
    }

    // No precipitation (Dry)
    const skyPrefix = {
      sunny: '快晴で',
      mostly_sunny: '晴れて',
      partly_cloudy: '晴れ時々曇りで',
      mostly_cloudy: '曇りがちで',
      overcast: '曇りで',
    }[skyCondition];

    if (isWindy) {
      return `${skyPrefix}風が強く、${tempJa}です。`;
    }
    return `${skyPrefix}${tempJa}です。`;
  }, [skyCondition, precipitation, isWindy, temperatureFeel]);

  // Weather audio sentence
  const handleReadWeather = () => {
    if (voiceLang === 'off') return;

    if (voiceLang === 'ja') {
      const jaText = `今日の天気はどうですか？ ${japaneseWeatherSentence}`;
      speechService.speak(jaText, { lang: 'ja-JP' });
      return;
    }

    const words = [...weatherDescriptorWords.map(w => w.en), temperatureFeel];
    let sentenceBody = '';
    if (words.length === 2) {
      sentenceBody = `${words[0]} and ${words[1]}`;
    } else {
      const last = words[words.length - 1];
      const rest = words.slice(0, -1).join(', ');
      sentenceBody = `${rest}, and ${last}`;
    }
    const text = `How is the weather today? It is ${sentenceBody}.`;
    speechService.speak(text, { lang: 'en-US' });
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isRoutineModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRoutineModal();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (activeTab === 'FEELINGS') rollFeelings();
        else if (activeTab === 'CALENDAR') handleReadCalendar();
        else if (activeTab === 'WEATHER') handleReadWeather();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveTab(prev => (prev === 'FEELINGS' ? 'CALENDAR' : prev === 'CALENDAR' ? 'WEATHER' : 'FEELINGS'));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveTab(prev => (prev === 'WEATHER' ? 'CALENDAR' : prev === 'CALENDAR' ? 'FEELINGS' : 'WEATHER'));
      } else if (e.key === '1') {
        setActiveTab('FEELINGS');
      } else if (e.key === '2') {
        setActiveTab('CALENDAR');
      } else if (e.key === '3') {
        setActiveTab('WEATHER');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRoutineModalOpen, activeTab, closeRoutineModal, rollFeelings, handleReadCalendar, handleReadWeather]);

  if (!isRoutineModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="w-[98vw] max-w-[1500px] h-[95dvh] max-h-[920px] bg-white dark:bg-slate-900 border-2 sm:border-4 border-amber-400 dark:border-amber-500/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* ================================================================= */}
        {/* 1. Header Toolbar Cluster (Two-Row Classroom Layout)              */}
        {/* ================================================================= */}
        <header className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0 select-none">
          {/* Row 1: Brand & Global Utility Controls */}
          <div className="min-h-[54px] px-3 sm:px-6 py-2 flex items-center justify-between gap-3 flex-nowrap">
            {/* Left: Brand Icon & Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                ☀️
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white truncate flex items-center gap-2 leading-tight">
                  {t('Daily Greetings & Routine', <><ruby>朝<rt>あさ</rt></ruby>の<ruby>会<rt>かい</rt></ruby>・ウォームアップ</>)}
                </h2>
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate leading-tight">
                  {t('Feelings • Calendar • Weather', <>きもち • <ruby>日付<rt>ひづけ</rt></ruby> • <ruby>天気<rt>てんき</rt></ruby></>)}
                </p>
              </div>
            </div>

            {/* Right: Controls Cluster (Textbook, Language, Voice, Theme, Close) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
              {/* Textbook Preference Toggle: [📘 Let's Try (3·4) | 📗 Here We Go (5·6)] */}
              <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700 shrink-0">
                <button
                  onClick={() => {
                    playPop();
                    setTextbookPref('LETSTRY');
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    textbookPref === 'LETSTRY'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={textLang === 'ja' ? 'レッツトライ（小3・小4）' : "Let's Try 1 & 2 (Grades 3 & 4)"}
                >
                  <span>📘</span>
                  <span className="hidden md:inline">{t("Let's Try (G3-4)", <>Let's Try (3・4年)</>)}</span>
                  <span className="md:hidden">LT</span>
                </button>
                <button
                  onClick={() => {
                    playPop();
                    setTextbookPref('HEREWEGO');
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    textbookPref === 'HEREWEGO'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={textLang === 'ja' ? 'Here We Go!（小5・小6）' : 'Here We Go! 5 & 6 (Grades 5 & 6)'}
                >
                  <span>📗</span>
                  <span className="hidden md:inline">{t("Here We Go (G5-6)", <>Here We Go (5・6年)</>)}</span>
                  <span className="md:hidden">HWG</span>
                </button>
              </div>

              {/* Text Language Toggle [文 EN | 日] */}
              <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700">
                <button
                  onClick={() => { playPop(); setTextLang('en'); }}
                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    textLang === 'en'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => { playPop(); setTextLang('ja'); }}
                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    textLang === 'ja'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  日
                </button>
              </div>

              {/* Voice Language Toggle [🗣️ EN | 日 | OFF] */}
              <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-300 dark:border-slate-700">
                <button
                  onClick={() => { playPop(); setVoiceLang('en'); }}
                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    voiceLang === 'en'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Voice: English"
                >
                  🗣️ EN
                </button>
                <button
                  onClick={() => { playPop(); setVoiceLang('ja'); }}
                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    voiceLang === 'ja'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Voice: Japanese"
                >
                  🗣️ 日
                </button>
                <button
                  onClick={() => { playPop(); setVoiceLang('off'); }}
                  className={`px-1.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    voiceLang === 'off'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Mute speech"
                >
                  OFF
                </button>
              </div>

              {/* In-Component Theme Parity Toggle */}
              <button
                onClick={() => { playPop(); toggleTheme(); }}
                className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Close Modal Button */}
              <button
                onClick={() => { playPop(); closeRoutineModal(); }}
                className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Close (Escape)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Row 2: 3-Step Routine Stepper Bar */}
          <div className="px-3 sm:px-6 py-1.5 bg-slate-100/70 dark:bg-slate-950/40 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center">
            <nav className="flex items-center gap-1 sm:gap-2 bg-white/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs w-full max-w-2xl">
              <button
                onClick={() => { playPop(); setActiveTab('FEELINGS'); }}
                className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'FEELINGS'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smile size={16} />
                <span>{t('1. Feelings', <>1. きもち</>)}</span>
              </button>

              <button
                onClick={() => { playPop(); setActiveTab('CALENDAR'); }}
                className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'CALENDAR'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar size={16} />
                <span>{t('2. Calendar', <>2. 日付・カレンダー</>)}</span>
              </button>

              <button
                onClick={() => { playPop(); setActiveTab('WEATHER'); }}
                className={`flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'WEATHER'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cloud size={16} />
                <span>{t('3. Weather', <>3. 天気・くも</>)}</span>
              </button>
            </nav>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. Main Content Stage                                             */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-2.5 sm:py-3 bg-slate-100/60 dark:bg-slate-950 flex flex-col justify-between">
          
          {/* TAB 1: FEELINGS & CHAT */}
          {activeTab === 'FEELINGS' && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 sm:gap-3">
              
              {/* Level Selector Toolbar */}
              <div className="flex items-center justify-between flex-nowrap gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 sm:py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                    {t('Challenge Level:', <>チャレンジレベル：</>)}
                  </span>
                  
                  <button
                    onClick={() => { playPop(); setFeelingsLevel('LEVEL_1'); }}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      feelingsLevel === 'LEVEL_1'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {t('Level 1: Single Feeling (I am ~)', <>レベル1： 1つのきもち</>)}
                  </button>

                  <button
                    onClick={() => { playPop(); setFeelingsLevel('LEVEL_2'); }}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      feelingsLevel === 'LEVEL_2'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {t('Level 2: Compound (~ and ~)', <>レベル2： 〜 and 〜</>)}
                  </button>

                  <button
                    onClick={() => { playPop(); setFeelingsLevel('LEVEL_3'); }}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      feelingsLevel === 'LEVEL_3'
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {t('Level 3: Contrast (~, but ~!)', <>レベル3： 〜, but 〜！</>)}
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0 whitespace-nowrap">
                  {feelingsLevel === 'LEVEL_3' && (
                    <span className="text-amber-600 dark:text-amber-400 font-black">
                      ⚡ {t('Pairs Negative + Positive!', <>ネガティブ＋ポジティブ！</>)}
                    </span>
                  )}
                </div>
              </div>

              {/* Dialogue Cards: Speaker A vs Speaker B */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 items-stretch">
                
                {/* Speaker A Box (Teacher or Student 1) */}
                <div className="bg-white dark:bg-slate-900 border-3 border-blue-400 dark:border-blue-500/80 rounded-3xl p-3 sm:p-4 shadow-lg flex flex-col gap-2.5 sm:gap-3">
                  {/* Speaker Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👨‍🏫</span>
                      <span className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        {t('Speaker A (Leader / Teacher)', <>スピーカー A（先生・質問者）</>)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSpeakSpeaker('A')}
                      className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-200 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
                      title="Listen to Speaker A"
                    >
                      <Volume2 size={13} />
                      <span>{t('Listen', <>きく</>)}</span>
                    </button>
                  </div>

                  {/* Speech Bubble: Authentic 3-Turn Dialogue (Turn 1 & Turn 3) */}
                  <div className="bg-blue-50 dark:bg-slate-800/90 border border-blue-200 dark:border-blue-700/60 rounded-2xl py-2 px-3 sm:px-4 text-center shadow-inner">
                    <div className="flex flex-col gap-1 font-sans">
                      {/* Turn 1: Greeting & Opening Question */}
                      <div className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-black flex items-center justify-center shrink-0">
                          1
                        </span>
                        <span>&ldquo;Hello! How are you?&rdquo;</span>
                      </div>

                      {/* Turn 3: Teacher's Response to "And you?" */}
                      <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white leading-snug flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-black inline-flex items-center justify-center mr-1.5 shrink-0">
                          3
                        </span>
                        {isMatchingFeelings && feelingsLevel === 'LEVEL_1' ? (
                          <span>
                            &ldquo;Me too! I am{' '}
                            <span className="text-blue-600 dark:text-blue-400 underline decoration-2 decoration-blue-400 underline-offset-4">
                              {speakerAWords[0]?.en}
                            </span>
                            , too!&rdquo;
                          </span>
                        ) : (
                          <span>
                            &ldquo;I am{' '}
                            {feelingsLevel === 'LEVEL_1' && speakerAWords[0] && (
                              <>
                                <span className="text-blue-600 dark:text-blue-400 underline decoration-2 decoration-blue-400 underline-offset-4">
                                  {speakerAWords[0].en}
                                </span>
                                !&rdquo;
                              </>
                            )}
                            {feelingsLevel === 'LEVEL_2' && speakerAWords.length >= 2 && (
                              <>
                                <span className="text-blue-600 dark:text-blue-400 underline decoration-2 decoration-blue-400 underline-offset-4">
                                  {speakerAWords[0].en}
                                </span>
                                {' '}
                                <span className="text-amber-500 font-bold">and</span>
                                {' '}
                                <span className="text-blue-600 dark:text-blue-400 underline decoration-2 decoration-blue-400 underline-offset-4">
                                  {speakerAWords[1].en}
                                </span>
                                !&rdquo;
                              </>
                            )}
                            {feelingsLevel === 'LEVEL_3' && speakerAWords.length >= 2 && (
                              <>
                                <span className="text-blue-600 dark:text-blue-400 underline decoration-2 decoration-blue-400 underline-offset-4">
                                  {speakerAWords[0].en}
                                </span>
                                <span className="text-amber-500 font-bold">, but</span>
                                {' '}
                                <span className="text-blue-600 dark:text-blue-400 underline decoration-2 decoration-blue-400 underline-offset-4">
                                  {speakerAWords[1].en}
                                </span>
                                !&rdquo;
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {textLang === 'ja' && speakerAWords.length > 0 && (
                      <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 border-t border-blue-200/60 dark:border-blue-800/60 pt-0.5">
                        {isMatchingFeelings && feelingsLevel === 'LEVEL_1' ? (
                          <span>① こんにちは！元気ですか？ ➔ ③ 私も！私も「{speakerAWords[0]?.jaRuby}」です！</span>
                        ) : (
                          <span>
                            ① こんにちは！元気ですか？ ➔ ③ 私は「
                            {speakerAWords.map((w, idx) => (
                              <React.Fragment key={w.id}>
                                {w.jaRuby}
                                {idx === 0 && speakerAWords.length > 1 && (feelingsLevel === 'LEVEL_3' ? 'だけど' : '、そして')}
                              </React.Fragment>
                            ))}
                            」です！
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Illustrated Word Cards: Adaptive Layout (Single Large Card vs Dual Side-by-Side Cards) */}
                  <div className={`flex-1 flex ${feelingsLevel === 'LEVEL_1' ? 'items-center justify-center' : 'grid grid-cols-2 gap-2 sm:gap-2.5 items-stretch'}`}>
                    {speakerAWords.map((word, idx) => (
                      <div
                        key={`A-${word.id}-${idx}`}
                        onClick={() => rerollSlot('A', idx)}
                        className={`group relative bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all hover:scale-[1.01] shadow-xs hover:shadow-md flex flex-col justify-between ${
                          feelingsLevel === 'LEVEL_1'
                            ? 'w-full max-w-[280px] sm:max-w-[320px] rounded-3xl p-3 sm:p-3.5'
                            : 'w-full rounded-2xl p-2 sm:p-2.5 min-w-0'
                        }`}
                        title="Click to spin a new word for this slot"
                      >
                        {/* Top Header: Word Badge & Spin Action */}
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0">
                              Word {idx + 1}
                            </span>
                            {idx === 1 && (
                              <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                                feelingsLevel === 'LEVEL_3'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                  : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                              }`}>
                                {feelingsLevel === 'LEVEL_3' ? ', but' : ' and'}
                              </span>
                            )}
                          </div>
                          <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:rotate-180 transition-all shrink-0">
                            <RotateCw size={13} />
                          </div>
                        </div>

                        {/* Picture on Top */}
                        <div className={`w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner my-1 ${
                          feelingsLevel === 'LEVEL_1'
                            ? 'h-36 sm:h-44 md:h-48 p-2.5'
                            : 'flex-1 min-h-[90px] max-h-[145px] sm:min-h-[110px] sm:max-h-[160px] p-1.5'
                        }`}>
                          {getFeelingCardImage(word, textbookPref) ? (
                            <img
                              src={formatAssetUrl(getFeelingCardImage(word, textbookPref))}
                              alt={word.en}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className={feelingsLevel === 'LEVEL_1' ? 'text-5xl' : 'text-3xl sm:text-4xl'}>
                              {word.emoji}
                            </span>
                          )}
                        </div>

                        {/* Text Underneath */}
                        <div className="w-full text-center mt-0.5 min-w-0">
                          <div className={`font-black text-slate-900 dark:text-white capitalize truncate leading-tight ${
                            feelingsLevel === 'LEVEL_1' ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base md:text-lg'
                          }`}>
                            {word.en}
                          </div>
                          <div className={`text-slate-500 dark:text-slate-300 font-bold truncate mt-0.5 leading-snug ${
                            feelingsLevel === 'LEVEL_1' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                          }`}>
                            {word.jaRuby}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Speaker B Box (Student 2 or Class) */}
                <div className="bg-white dark:bg-slate-900 border-3 border-emerald-400 dark:border-emerald-500/80 rounded-3xl p-3 sm:p-4 shadow-lg flex flex-col gap-2.5 sm:gap-3">
                  {/* Speaker Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎒</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        {t('Speaker B (Student / Class)', <>スピーカー B（児童・回答者）</>)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSpeakSpeaker('B')}
                      className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
                      title="Listen to Speaker B"
                    >
                      <Volume2 size={13} />
                      <span>{t('Listen', <>きく</>)}</span>
                    </button>
                  </div>

                  {/* Speech Bubble: Authentic 3-Turn Dialogue (Turn 2) */}
                  <div className="bg-emerald-50 dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-700/60 rounded-2xl py-2 px-3 sm:px-4 text-center shadow-inner">
                    <div className="flex flex-col gap-1 font-sans">
                      {/* Turn 2: Student's Feelings Answer */}
                      <div className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white leading-snug flex items-center justify-center">
                        <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-black inline-flex items-center justify-center mr-1.5 shrink-0">
                          2
                        </span>
                        <span>
                          &ldquo;I am{' '}
                          {feelingsLevel === 'LEVEL_1' && speakerBWords[0] && (
                            <>
                              <span className="text-emerald-600 dark:text-emerald-400 underline decoration-2 decoration-emerald-400 underline-offset-4">
                                {speakerBWords[0].en}
                              </span>
                              .&rdquo;
                            </>
                          )}
                          {feelingsLevel === 'LEVEL_2' && speakerBWords.length >= 2 && (
                            <>
                              <span className="text-emerald-600 dark:text-emerald-400 underline decoration-2 decoration-emerald-400 underline-offset-4">
                                {speakerBWords[0].en}
                              </span>
                              {' '}
                              <span className="text-amber-500 font-bold">and</span>
                              {' '}
                              <span className="text-emerald-600 dark:text-emerald-400 underline decoration-2 decoration-emerald-400 underline-offset-4">
                                {speakerBWords[1].en}
                              </span>
                              .&rdquo;
                            </>
                          )}
                          {feelingsLevel === 'LEVEL_3' && speakerBWords.length >= 2 && (
                            <>
                              <span className="text-emerald-600 dark:text-emerald-400 underline decoration-2 decoration-emerald-400 underline-offset-4">
                                {speakerBWords[0].en}
                              </span>
                              <span className="text-amber-500 font-bold">, but</span>
                              {' '}
                              <span className="text-emerald-600 dark:text-emerald-400 underline decoration-2 decoration-emerald-400 underline-offset-4">
                                {speakerBWords[1].en}
                              </span>
                              .&rdquo;
                            </>
                          )}
                        </span>
                      </div>

                      {/* Turn 2 (cont): Thank You & Return Question */}
                      <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                        &ldquo;Thank you. And you?&rdquo;
                      </div>
                    </div>

                    {textLang === 'ja' && speakerBWords.length > 0 && (
                      <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-0.5">
                        <span>② 私は「</span>
                        {speakerBWords.map((w, idx) => (
                          <React.Fragment key={w.id}>
                            {w.jaRuby}
                            {idx === 0 && speakerBWords.length > 1 && (feelingsLevel === 'LEVEL_3' ? 'だけど' : '、そして')}
                          </React.Fragment>
                        ))}
                        <span>」です。ありがとう。あなたは？</span>
                      </div>
                    )}
                  </div>

                  {/* Illustrated Word Cards: Adaptive Layout (Single Large Card vs Dual Side-by-Side Cards) */}
                  <div className={`flex-1 flex ${feelingsLevel === 'LEVEL_1' ? 'items-center justify-center' : 'grid grid-cols-2 gap-2 sm:gap-2.5 items-stretch'}`}>
                    {speakerBWords.map((word, idx) => (
                      <div
                        key={`B-${word.id}-${idx}`}
                        onClick={() => rerollSlot('B', idx)}
                        className={`group relative bg-slate-50 dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-all hover:scale-[1.01] shadow-xs hover:shadow-md flex flex-col justify-between ${
                          feelingsLevel === 'LEVEL_1'
                            ? 'w-full max-w-[280px] sm:max-w-[320px] rounded-3xl p-3 sm:p-3.5'
                            : 'w-full rounded-2xl p-2 sm:p-2.5 min-w-0'
                        }`}
                        title="Click to spin a new word for this slot"
                      >
                        {/* Top Header: Word Badge & Spin Action */}
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                              Word {idx + 1}
                            </span>
                            {idx === 1 && (
                              <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                                feelingsLevel === 'LEVEL_3'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                  : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                              }`}>
                                {feelingsLevel === 'LEVEL_3' ? ', but' : ' and'}
                              </span>
                            )}
                          </div>
                          <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:rotate-180 transition-all shrink-0">
                            <RotateCw size={13} />
                          </div>
                        </div>

                        {/* Picture on Top */}
                        <div className={`w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner my-1 ${
                          feelingsLevel === 'LEVEL_1'
                            ? 'h-36 sm:h-44 md:h-48 p-2.5'
                            : 'flex-1 min-h-[90px] max-h-[145px] sm:min-h-[110px] sm:max-h-[160px] p-1.5'
                        }`}>
                          {getFeelingCardImage(word, textbookPref) ? (
                            <img
                              src={formatAssetUrl(getFeelingCardImage(word, textbookPref))}
                              alt={word.en}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className={feelingsLevel === 'LEVEL_1' ? 'text-5xl' : 'text-3xl sm:text-4xl'}>
                              {word.emoji}
                            </span>
                          )}
                        </div>

                        {/* Text Underneath */}
                        <div className="w-full text-center mt-0.5 min-w-0">
                          <div className={`font-black text-slate-900 dark:text-white capitalize truncate leading-tight ${
                            feelingsLevel === 'LEVEL_1' ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base md:text-lg'
                          }`}>
                            {word.en}
                          </div>
                          <div className={`text-slate-500 dark:text-slate-300 font-bold truncate mt-0.5 leading-snug ${
                            feelingsLevel === 'LEVEL_1' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
                          }`}>
                            {word.jaRuby}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={rollFeelings}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>🎲</span>
                    <span>{t('Roll New Feelings (Space)', <>新しいきもちを回す (Space)</>)}</span>
                  </button>

                  <button
                    onClick={handleSpeakFullDialogue}
                    className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 font-black text-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Speech size={16} />
                    <span>{t('Play Full Dialogue', <>会話全体を再生</>)}</span>
                  </button>
                </div>

                <button
                  onClick={() => { playPop(); setActiveTab('CALENDAR'); }}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-sm sm:text-base shadow-md hover:bg-emerald-500 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{t('Next: Calendar ➔', <>次へ： 日付 ➔</>)}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: CHALKBOARD CALENDAR */}
          {activeTab === 'CALENDAR' && (
            <div className="flex-1 flex flex-col justify-between gap-2 sm:gap-2.5">
              
              {/* Calendar Controls Toolbar (Day Shifter & Reveal/Hide) */}
              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 sm:px-4 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex-nowrap min-h-[44px] shrink-0">
                
                {/* Left: Day Shifter Controls */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    onClick={() => shiftCalendarDate(-1)}
                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
                    title="Shift 1 day back"
                  >
                    <ChevronLeft size={13} />
                    <span>{t('Yesterday', <>きのう</>)}</span>
                  </button>

                  <button
                    onClick={() => { playPop(); setCalendarDate(new Date()); }}
                    className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer"
                    title="Reset to today"
                  >
                    {t('Today', <>きょう</>)}
                  </button>

                  <button
                    onClick={() => shiftCalendarDate(1)}
                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
                    title="Shift 1 day forward"
                  >
                    <span>{t('Tomorrow', <>あした</>)}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Right: Reveal / Hide Controls */}
                <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                  <button
                    onClick={revealAllSlots}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Eye size={13} />
                    <span>{t('Reveal All', <>すべて表示</>)}</span>
                  </button>

                  <button
                    onClick={hideAllSlots}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <EyeOff size={13} />
                    <span>{t('Hide', <>かくす</>)}</span>
                  </button>
                </div>

              </div>

              {/* Clean Classroom Calendar Stage (Sleek, Compact Container) */}
              <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col justify-center items-center shadow-xs overflow-hidden">
                
                <div className="w-full max-w-5xl flex flex-col justify-center items-center my-auto overflow-x-auto">
                  
                  {/* Upper Elementary G5-6 (Unified Table Layout) */}
                  {calendarGrade === 'G5_6' ? (
                    <div className="w-full overflow-x-auto flex justify-center">
                      <table className="w-full max-w-4xl border-separate border-spacing-y-2 sm:border-spacing-y-3">
                        <thead>
                          <tr>
                            {/* Empty column above sentence lead-ins */}
                            <th className="pb-1 sm:pb-2 text-right pr-3 sm:pr-5"></th>
                            
                            {/* Day Header */}
                            <th className="pb-1 sm:pb-2 text-center px-1 sm:px-2">
                              <div className="inline-flex items-center justify-center gap-1 text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                <span>Day</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 lowercase">
                                  (<ruby>曜日<rt>ようび</rt></ruby>)
                                </span>
                              </div>
                            </th>

                            {/* Month Header */}
                            <th className="pb-1 sm:pb-2 text-center px-1 sm:px-2">
                              <div className="inline-flex items-center justify-center gap-1 text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                                <span>Month</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 lowercase">
                                  (<ruby>月<rt>がつ</rt></ruby>)
                                </span>
                              </div>
                            </th>

                            {/* Date Header */}
                            <th className="pb-1 sm:pb-2 text-center px-1 sm:px-2">
                              <div className="inline-flex items-center justify-center gap-1 text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                <span>Date</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 lowercase">
                                  (<ruby>日<rt>にち</rt></ruby>)
                                </span>
                              </div>
                            </th>

                            {/* Year Header */}
                            <th className="pb-1 sm:pb-2 text-center px-1 sm:px-2">
                              <div className="inline-flex items-center justify-center gap-1 text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                <span>Year</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 lowercase">
                                  (<ruby>年<rt>ねん</rt></ruby>)
                                </span>
                              </div>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {/* Row 1: Yesterday Sentence */}
                          <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-1.5 sm:py-2 pl-3 sm:pl-4 pr-3 sm:pr-5 whitespace-nowrap rounded-l-xl">
                                <div className="flex items-baseline justify-between gap-3 sm:gap-6">
                                  <span className="text-xs sm:text-sm md:text-base font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                    （<ruby>昨日<rt>きのう</rt></ruby>）
                                  </span>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                                    Yesterday was
                                  </span>
                                </div>
                              </td>

                              {/* Yesterday Weekday */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('yesterdayDay')}
                                    className={`w-full min-w-[110px] sm:min-w-[135px] md:min-w-[155px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.yesterdayDay
                                        ? 'bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.yesterdayDay ? yesterdayWeekday.en : '________'}
                                  </button>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white shrink-0 ml-1">,</span>
                                </div>
                              </td>

                              {/* Yesterday Month */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('yesterdayMonth')}
                                    className={`w-full min-w-[110px] sm:min-w-[130px] md:min-w-[145px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.yesterdayMonth
                                        ? 'bg-sky-100 dark:bg-sky-950/80 border-2 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.yesterdayMonth ? yesterdayMonth.en : '________'}
                                  </button>
                                </div>
                              </td>

                              {/* Yesterday Date */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('yesterdayDateNumber')}
                                    className={`w-full min-w-[65px] sm:min-w-[80px] md:min-w-[95px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.yesterdayDateNumber
                                        ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.yesterdayDateNumber ? getOrdinalSuffix(yesterdayDateNum) : '____'}
                                  </button>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white shrink-0 ml-1">,</span>
                                </div>
                              </td>

                              {/* Yesterday Year */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center rounded-r-xl">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('yesterdayYear')}
                                    className={`w-full min-w-[75px] sm:min-w-[90px] md:min-w-[105px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.yesterdayYear
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.yesterdayYear ? yesterdayYear : '____'}
                                  </button>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white shrink-0 ml-1">.</span>
                                </div>
                              </td>
                            </tr>

                          {/* Row 2: Today Sentence (Hero Highlight) */}
                          <tr className="bg-blue-50/80 dark:bg-blue-950/50 shadow-xs">
                            <td className="py-2.5 sm:py-3 pl-3 sm:pl-4 pr-3 sm:pr-5 whitespace-nowrap rounded-l-2xl border-y border-l border-blue-200 dark:border-blue-800/60">
                              <div className="flex items-baseline justify-between gap-3 sm:gap-6">
                                <span className="text-sm sm:text-base md:text-lg font-bold text-blue-700 dark:text-blue-300 shrink-0">
                                  （<ruby>今日<rt>きょう</rt></ruby>）
                                </span>
                                <span className="text-lg sm:text-2xl md:text-3xl font-black text-blue-800 dark:text-blue-200 shrink-0">
                                  Today is
                                </span>
                              </div>
                            </td>

                            {/* Today Weekday */}
                            <td className="py-2.5 sm:py-3 px-1 sm:px-2 text-center border-y border-blue-200 dark:border-blue-800/60">
                              <div className="flex items-baseline justify-center">
                                <button
                                  onClick={() => toggleSlotReveal('todayDay')}
                                  className={`w-full min-w-[110px] sm:min-w-[135px] md:min-w-[155px] py-1.5 sm:py-2 px-2 rounded-xl text-base sm:text-lg md:text-xl font-black transition-all cursor-pointer ${
                                    revealedSlots.todayDay
                                      ? 'bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs hover:scale-105 active:scale-95'
                                      : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                  }`}
                                  title="Click to toggle reveal"
                                >
                                  {revealedSlots.todayDay ? currentWeekday.en : '________'}
                                </button>
                                <span className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-white shrink-0 ml-1">,</span>
                              </div>
                            </td>

                            {/* Today Month */}
                            <td className="py-2.5 sm:py-3 px-1 sm:px-2 text-center border-y border-blue-200 dark:border-blue-800/60">
                              <div className="flex items-baseline justify-center">
                                <button
                                  onClick={() => toggleSlotReveal('todayMonth')}
                                  className={`w-full min-w-[110px] sm:min-w-[130px] md:min-w-[145px] py-1.5 sm:py-2 px-2 rounded-xl text-base sm:text-lg md:text-xl font-black transition-all cursor-pointer ${
                                    revealedSlots.todayMonth
                                      ? 'bg-sky-100 dark:bg-sky-950/80 border-2 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-200 shadow-xs hover:scale-105 active:scale-95'
                                      : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                  }`}
                                  title="Click to toggle reveal"
                                >
                                  {revealedSlots.todayMonth ? currentMonth.en : '________'}
                                </button>
                              </div>
                            </td>

                            {/* Today Date */}
                            <td className="py-2.5 sm:py-3 px-1 sm:px-2 text-center border-y border-blue-200 dark:border-blue-800/60">
                              <div className="flex items-baseline justify-center">
                                <button
                                  onClick={() => toggleSlotReveal('todayDateNumber')}
                                  className={`w-full min-w-[65px] sm:min-w-[80px] md:min-w-[95px] py-1.5 sm:py-2 px-2 rounded-xl text-base sm:text-lg md:text-xl font-black transition-all cursor-pointer ${
                                    revealedSlots.todayDateNumber
                                      ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-200 shadow-xs hover:scale-105 active:scale-95'
                                      : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                  }`}
                                  title="Click to toggle reveal"
                                >
                                  {revealedSlots.todayDateNumber ? getOrdinalSuffix(currentDateNum) : '____'}
                                </button>
                                <span className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-white shrink-0 ml-1">,</span>
                              </div>
                            </td>

                            {/* Today Year */}
                            <td className="py-2.5 sm:py-3 px-1 sm:px-2 text-center rounded-r-2xl border-y border-r border-blue-200 dark:border-blue-800/60">
                              <div className="flex items-baseline justify-center">
                                <button
                                  onClick={() => toggleSlotReveal('todayYear')}
                                  className={`w-full min-w-[75px] sm:min-w-[90px] md:min-w-[105px] py-1.5 sm:py-2 px-2 rounded-xl text-base sm:text-lg md:text-xl font-black transition-all cursor-pointer ${
                                    revealedSlots.todayYear
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs hover:scale-105 active:scale-95'
                                      : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                  }`}
                                  title="Click to toggle reveal"
                                >
                                  {revealedSlots.todayYear ? currentYear : '____'}
                                </button>
                                <span className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-white shrink-0 ml-1">.</span>
                              </div>
                            </td>
                          </tr>

                          {/* Row 3: Tomorrow Sentence */}
                          <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-1.5 sm:py-2 pl-3 sm:pl-4 pr-3 sm:pr-5 whitespace-nowrap rounded-l-xl">
                                <div className="flex items-baseline justify-between gap-3 sm:gap-6">
                                  <span className="text-xs sm:text-sm md:text-base font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                    （<ruby>明日<rt>あした</rt></ruby>）
                                  </span>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-sky-700 dark:text-sky-400 shrink-0">
                                    Tomorrow will be
                                  </span>
                                </div>
                              </td>

                              {/* Tomorrow Weekday */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('tomorrowDay')}
                                    className={`w-full min-w-[110px] sm:min-w-[135px] md:min-w-[155px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.tomorrowDay
                                        ? 'bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.tomorrowDay ? tomorrowWeekday.en : '________'}
                                  </button>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white shrink-0 ml-1">,</span>
                                </div>
                              </td>

                              {/* Tomorrow Month */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('tomorrowMonth')}
                                    className={`w-full min-w-[110px] sm:min-w-[130px] md:min-w-[145px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.tomorrowMonth
                                        ? 'bg-sky-100 dark:bg-sky-950/80 border-2 border-sky-400 dark:border-sky-500 text-sky-900 dark:text-sky-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.tomorrowMonth ? tomorrowMonth.en : '________'}
                                  </button>
                                </div>
                              </td>

                              {/* Tomorrow Date */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('tomorrowDateNumber')}
                                    className={`w-full min-w-[65px] sm:min-w-[80px] md:min-w-[95px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.tomorrowDateNumber
                                        ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-500 text-rose-900 dark:text-rose-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.tomorrowDateNumber ? getOrdinalSuffix(tomorrowDateNum) : '____'}
                                  </button>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white shrink-0 ml-1">,</span>
                                </div>
                              </td>

                              {/* Tomorrow Year */}
                              <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center rounded-r-xl">
                                <div className="flex items-baseline justify-center">
                                  <button
                                    onClick={() => toggleSlotReveal('tomorrowYear')}
                                    className={`w-full min-w-[75px] sm:min-w-[90px] md:min-w-[105px] py-1 sm:py-1.5 px-2 rounded-xl text-sm sm:text-base md:text-lg font-black transition-all cursor-pointer ${
                                      revealedSlots.tomorrowYear
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs hover:scale-105 active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-blue-500'
                                    }`}
                                    title="Click to toggle reveal"
                                  >
                                    {revealedSlots.tomorrowYear ? tomorrowYear : '____'}
                                  </button>
                                  <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white shrink-0 ml-1">.</span>
                                </div>
                              </td>
                            </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Lower Elementary G3-4 (Weekday Big Screen Display - Frameless & Scaled Up) */
                    <div className="w-full flex items-baseline justify-center gap-3 sm:gap-5 md:gap-7 flex-wrap my-auto py-6 sm:py-10">
                      <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-600 dark:text-slate-300 shrink-0 select-none">
                        （<ruby>今日<rt>きょう</rt></ruby>）
                      </span>

                      <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-amber-800 dark:text-amber-300 shrink-0">
                        Today is
                      </span>
                      
                      <div className="inline-flex items-baseline shrink-0">
                        <button
                          onClick={() => toggleSlotReveal('todayDay')}
                          className={`px-6 sm:px-9 py-2 sm:py-3.5 rounded-2xl sm:rounded-3xl font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 ${
                            revealedSlots.todayDay
                              ? 'bg-amber-100 dark:bg-amber-950/80 border-3 sm:border-4 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-100'
                              : 'bg-slate-100 dark:bg-slate-800 border-3 sm:border-4 border-dashed border-slate-400 dark:border-slate-600 text-slate-400 hover:border-amber-400'
                          }`}
                          title="Click to toggle reveal"
                        >
                          {revealedSlots.todayDay ? currentWeekday.en : '________'}
                        </button>
                        <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-800 dark:text-white ml-2">.</span>
                      </div>
                    </div>
                  )}

                </div>

              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-1 sm:pt-2 shrink-0 gap-2 flex-nowrap">
                <button
                  onClick={() => { playPop(); setActiveTab('FEELINGS'); }}
                  className="px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-black text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{t('◀ Back to Feelings', <>◀ きもちに戻る</>)}</span>
                </button>

                <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                  <button
                    onClick={handleReadCalendar}
                    className="px-4 py-2 sm:py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm sm:text-base shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Volume2 size={18} />
                    <span>{t('Recite Calendar (Space)', <>日付を読み上げる (Space)</>)}</span>
                  </button>

                  <button
                    onClick={() => { playPop(); setActiveTab('WEATHER'); }}
                    className="px-5 py-2 sm:py-2.5 rounded-2xl bg-blue-600 text-white font-black text-sm sm:text-base shadow-md hover:bg-blue-500 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{t('Next: Weather & Sky ➔', <>次へ： 天気・くも ➔</>)}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: WEATHER & SKY */}
          {activeTab === 'WEATHER' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 sm:gap-2.5">
              
              {/* Weather Source & Location Toolbar */}
              <div className="flex items-center justify-between flex-nowrap overflow-x-auto no-scrollbar gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
                
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-xs font-black text-blue-700 dark:text-blue-300 whitespace-nowrap">
                    <MapPin size={13} className="text-blue-500 shrink-0" />
                    <span>
                      {activeSchool === 'toyogaoka' ? '豊ヶ丘小学校 (東京都多摩市)' : '二子玉川小学校 (東京都世田谷区)'}
                    </span>
                  </div>

                  <button
                    onClick={fetchLocalWeather}
                    disabled={isFetchingWeather}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RefreshCw size={12} className={isFetchingWeather ? 'animate-spin' : ''} />
                    <span>{t('Poll Real Weather', <>最新の天気を取得</>)}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                  {liveTemp !== null && (
                    <div className="text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl whitespace-nowrap">
                      🌡️ {liveTemp}°C • ☁️ {cloudCoverPct}% Cover
                    </div>
                  )}

                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {weatherSource === 'live' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={14} /> {t('Live API Connected', <>ライブ気象データ接続中</>)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        {t('🪟 Window Mode (Manual)', <>🪟 窓モード（手動選択）</>)}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* The Dual Sky Gauge: Western vs Japanese Cloud Cover Comparison */}
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col gap-1.5 sm:gap-2 shrink-0">
                
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">🌈</span>
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">
                        {t('Dual Cloud Cover Meter: Japanese vs Western Standards', <>日米・英の<ruby>雲量<rt>うんりょう</rt></ruby>めやす（空のくらべっこ）</>)}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {t(
                          'In Japan, even 80% cloud cover is called "晴れ"! Western English has more specific gradations.',
                          <><ruby>日本<rt>にほん</rt></ruby>では<ruby>雲<rt>くも</rt></ruby>が8割あっても「<ruby>晴<rt>は</rt></ruby>れ」！<ruby>英語<rt>えいご</rt></ruby>では Mostly Sunny や Partly Cloudy と細かく<ruby>分<rt>わ</rt></ruby>かれます。</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">{t('Sky Cover:', <>雲量：</>)}</span>
                    <span className="ml-1 text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">
                      {cloudCoverPct}%
                    </span>
                  </div>
                </div>

                {/* Visual Sky Comparison Dual Tracks (Vintage Radio Tuner Style) */}
                <div className="flex flex-col gap-1 pt-1 pb-0.5">
                  {/* Gauge Header Labels */}
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-500 dark:text-slate-400 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[9px] border border-amber-200 dark:border-amber-800">
                        {t('JMA • Japan', <>気象庁</>)}
                      </span>
                      <span>{t('10-Scale Cloud Cover', <>雲量（10段階）</>)}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-black">
                        {t('10%–80% = Fair / Sunny', <>10%〜80% = <ruby>晴<rt>は</rt></ruby>れ</>)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sky-600 dark:text-sky-400 font-black">
                        {t('Sunny ➔ Overcast', <>快晴 ➔ 曇り</>)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{t('Western Standard (WMO)', <>WMO基準（8分量）</>)}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 font-bold text-[9px] border border-sky-200 dark:border-sky-800">
                        {t('WMO • Int’l', <>国際</>)}
                      </span>
                    </div>
                  </div>

                  {/* Radio Tuner Cassette (Dedicated top runner rail for badge + 2px backlit laser needle) */}
                  <div className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-950/50 pt-7 pb-1.5 px-1 shadow-inner flex flex-col gap-1">
                    
                    {/* Radio Dial Tuning Needle: Continuous vertical line slicing both Japanese and Western tracks */}
                    <div
                      className="absolute top-1 bottom-1.5 z-20 transition-all duration-500 pointer-events-none flex flex-col items-center"
                      style={{ left: `${Math.min(Math.max(cloudCoverPct, 2), 98)}%`, transform: 'translateX(-50%)' }}
                    >
                      {/* Radio Dial Head / Cursor in dedicated top runner clearance */}
                      <div className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white font-mono text-[9px] font-black shadow-md border border-amber-300 dark:border-amber-200 whitespace-nowrap leading-none flex items-center gap-0.5">
                        <span>{cloudCoverPct}%</span>
                        <span className="text-[7px]">▼</span>
                      </div>
                      {/* Glowing Radio Needle (Crisp 2px hairline) */}
                      <div className="w-[2px] flex-1 bg-amber-400 dark:bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)] rounded-full mt-0.5" />
                      {/* Bottom Anchor Pill */}
                      <div className="w-2 h-1 bg-amber-500 rounded-full mt-0.5 shadow-xs" />
                    </div>

                    {/* Track 1: Japanese System (気象庁) - Continuous 0-10%, 10-80%, 80-100% */}
                    <div className="relative z-10 flex rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 text-[10px] sm:text-xs font-black shadow-xs">
                      <div className="w-[10%] bg-amber-100/95 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 py-1.5 px-0.5 text-center border-r border-slate-300/80 dark:border-slate-700 truncate">
                        <span className="relative z-10 select-none">{t('快晴 (0–10%)', <>快晴 (0-10%)</>)}</span>
                      </div>
                      <div className="w-[70%] bg-amber-200/95 dark:bg-amber-900/70 text-amber-950 dark:text-amber-100 py-1.5 px-1 text-center border-r border-slate-300/80 dark:border-slate-700 flex items-center justify-center gap-1">
                        <span className="relative z-10 select-none">☀️ {t('晴れ Hare (10% – 80% • Cloud 2–8/10)', <>晴れ (10%〜80%・雲量2〜8割)</>)}</span>
                      </div>
                      <div className="w-[20%] bg-slate-200/95 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 py-1.5 px-0.5 text-center">
                        <span className="relative z-10 select-none">☁️ {t('曇り (80–100%)', <>曇り (80-100%)</>)}</span>
                      </div>
                    </div>

                    {/* Track 2: Western System (WMO / US & Canada) - Continuous 0-10%, 10-30%, 30-60%, 60-85%, 85-100% */}
                    <div className="relative z-10 flex rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 text-[10px] sm:text-xs font-black shadow-xs">
                      <div className="w-[10%] bg-sky-100/95 dark:bg-sky-950/80 text-sky-800 dark:text-sky-200 py-1.5 px-0.5 text-center border-r border-slate-300/80 dark:border-slate-700 truncate">
                        <span className="relative z-10 select-none">Sunny</span>
                      </div>
                      <div className="w-[20%] bg-sky-200/95 dark:bg-sky-900/70 text-sky-900 dark:text-sky-100 py-1.5 px-0.5 text-center border-r border-slate-300/80 dark:border-slate-700 truncate">
                        <span className="relative z-10 select-none">Mostly Sunny</span>
                      </div>
                      <div className="w-[30%] bg-blue-100/95 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 py-1.5 px-0.5 text-center border-r border-slate-300/80 dark:border-slate-700 truncate">
                        <span className="relative z-10 select-none">Partly Cloudy</span>
                      </div>
                      <div className="w-[25%] bg-indigo-100/95 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 py-1.5 px-0.5 text-center border-r border-slate-300/80 dark:border-slate-700 truncate">
                        <span className="relative z-10 select-none">Mostly Cloudy</span>
                      </div>
                      <div className="w-[15%] bg-slate-300/95 dark:bg-slate-700/80 text-slate-900 dark:text-white py-1.5 px-0.5 text-center truncate">
                        <span className="relative z-10 select-none">Overcast</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Classroom Window Mode: Interactive Weather Selector & Sentence Inset (Expanded to fill vertical space) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 items-stretch">
                
                {/* Weather Matrix: Sky, Precipitation, Wind & Temperature */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between gap-1.5 sm:gap-2">
                  <div>
                    {/* Group 1: Sky & Cloud Cover (5 buttons aligned with slider) */}
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      <span>{t('1. Sky & Cloud Cover:', <>1. 空・雲量（5段階）：</>)}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 lowercase font-normal">{t('aligns with slider', <>スライダーと連動</>)}</span>
                    </div>

                    <div className="grid grid-cols-5 gap-1 sm:gap-1.5 mb-2">
                      {SKY_CONDITIONS.map((s) => {
                        const active = skyCondition === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => handleSelectSky(s.id)}
                            className={`h-[68px] py-1 px-1 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-0.5 transition-all cursor-pointer ${
                              active
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 shadow-sm scale-[1.02]'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-800/80'
                            }`}
                          >
                            <span className="text-xl sm:text-2xl leading-none">{s.emoji}</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white capitalize leading-tight">
                              {s.en}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-none">
                              {s.jaRuby}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Group 2: Precipitation & Wind Combined Row */}
                    <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mb-2 flex-nowrap overflow-x-auto no-scrollbar">
                      
                      {/* Left: Precipitation (None / Rainy / Snowy) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                          {t('2. Rain / Snow:', <>2. 降水：</>)}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {PRECIPITATION_CONDITIONS.map((p) => {
                            const active = precipitation === p.id;
                            const isSnow = p.id === 'snowy';
                            const disabledWarning = isSnow && (temperatureFeel === 'hot' || temperatureFeel === 'warm');
                            return (
                              <button
                                key={p.id}
                                onClick={() => handleSelectPrecipitation(p.id)}
                                title={disabledWarning ? (textLang === 'ja' ? '雪を選ぶと自動で「寒い」に切り替わります' : 'Selecting snow auto-sets cold temperature') : undefined}
                                className={`h-8 px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap leading-none shrink-0 ${
                                  active
                                    ? (p.id === 'snowy' ? 'bg-sky-500 text-white shadow-xs' : p.id === 'rainy' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-700 text-white shadow-xs')
                                    : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                              >
                                <span className="leading-none">{p.emoji}</span>
                                <span className="leading-none">
                                  {p.id === 'none'
                                    ? (textLang === 'ja' ? 'Dry (なし)' : 'Dry (None)')
                                    : (textLang === 'ja' ? `${p.labelEn} (${p.ja})` : p.labelEn)
                                  }
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-600 shrink-0" />

                      {/* Right: Wind Toggle */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                          {t('3. Wind:', <>3. 風：</>)}
                        </span>
                        <button
                          onClick={handleToggleWind}
                          className={`h-8 px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs leading-none whitespace-nowrap shrink-0 ${
                            isWindy
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-white scale-[1.02]'
                              : 'bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          <span className="leading-none">💨</span>
                          <span className="leading-none">
                            {textLang === 'ja' ? 'Windy (風)' : 'Windy'}
                          </span>
                          <span className={`text-[9px] px-1 py-0.5 rounded font-mono leading-none ${isWindy ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500'}`}>
                            {isWindy ? 'ON' : 'OFF'}
                          </span>
                        </button>
                      </div>

                    </div>

                    {/* Group 3: Temperature Feeling Pills */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 flex-nowrap overflow-x-auto no-scrollbar">
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                        {t('4. Temperature:', <>4. 気温の感じ：</>)}
                      </span>

                      <div className="flex-1 grid grid-cols-4 gap-1.5 min-w-[340px]">
                        {(['hot', 'warm', 'cool', 'cold'] as const).map((temp) => {
                          const labels = {
                            hot: { en: 'hot', ja: '暑い', icon: '🔥', color: 'bg-rose-500' },
                            warm: { en: 'warm', ja: '暖かい', icon: '🌿', color: 'bg-amber-500' },
                            cool: { en: 'cool', ja: '涼しい', icon: '🍃', color: 'bg-teal-500' },
                            cold: { en: 'cold', ja: '寒い', icon: '❄️', color: 'bg-blue-600' },
                          };
                          const active = temperatureFeel === temp;
                          const isHotOrWarmWithSnow = (temp === 'hot' || temp === 'warm') && precipitation === 'snowy';
                          return (
                            <button
                              key={temp}
                              onClick={() => handleSelectTemperature(temp)}
                              title={isHotOrWarmWithSnow ? (textLang === 'ja' ? '選ぶと雪が自動で解除されます' : 'Selecting this will clear snow') : undefined}
                              className={`h-8 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer leading-none whitespace-nowrap ${
                                active
                                  ? `${labels[temp].color} text-white shadow-sm`
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              <span className="leading-none">{labels[temp].icon}</span>
                              <span className="capitalize leading-none">{labels[temp].en}</span>
                              <span className="text-[10px] opacity-85 leading-none">({labels[temp].ja})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Weather Dialogue Box (Expanded & Frameless with Large Flashcard) */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-3 sm:p-3.5 text-white shadow-md flex flex-col justify-between items-center">
                  
                  {/* Top Dialogue Speech Bubble */}
                  <div className="w-full bg-black/20 rounded-2xl py-2 px-3 border border-white/20 text-center">
                    <p className="text-xs sm:text-sm font-bold text-blue-200 leading-tight">
                      &ldquo;How is the weather today?&rdquo;
                      {textLang === 'ja' && (
                        <span className="block text-[11px] font-normal text-blue-200/80 mt-0.5">
                          （今日の天気はどうですか？）
                        </span>
                      )}
                    </p>
                    
                    {/* Dynamic Multi-Part Sentence */}
                    <p className="text-lg sm:text-xl md:text-2xl font-black text-white font-sans leading-tight mt-1">
                      &ldquo;It&apos;s{' '}
                      {weatherDescriptorWords.map((desc, idx) => (
                        <React.Fragment key={desc.en}>
                          <span className={`${desc.color} underline underline-offset-4 font-black`}>
                            {desc.en}
                          </span>
                          {idx < weatherDescriptorWords.length - 1 ? ', ' : ''}
                        </React.Fragment>
                      ))}
                      {weatherDescriptorWords.length > 1 ? ', and ' : ' and '}
                      <span className="text-cyan-200 underline underline-offset-4 font-black">
                        {temperatureFeel}
                      </span>
                      .&rdquo;
                    </p>

                    {textLang === 'ja' && (
                      <div className="text-xs sm:text-sm font-bold text-amber-200 mt-2 border-t border-white/20 pt-1.5 leading-snug">
                        「{japaneseWeatherSentence}」
                      </div>
                    )}
                  </div>

                  {/* Centered Bigger Official Flashcard Artwork */}
                  <div className="flex-1 flex items-center justify-center py-1 sm:py-2 min-h-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white rounded-2xl overflow-hidden p-1.5 shadow-lg border-3 border-white/50 flex items-center justify-center transition-all hover:scale-105">
                      <img
                        src={formatAssetUrl(activeCardImage)}
                        alt={activeSky.en}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                </div>

              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-1 sm:pt-1.5 shrink-0 gap-2 flex-nowrap">
                <button
                  onClick={() => { playPop(); setActiveTab('CALENDAR'); }}
                  className="px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-black text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{t('◀ Back to Calendar', <>◀ 日付に戻る</>)}</span>
                </button>

                <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                  <button
                    onClick={handleReadWeather}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Volume2 size={18} />
                    <span>{t('Recite Weather (Space)', <>天気を読み上げる (Space)</>)}</span>
                  </button>

                  <button
                    onClick={() => { playPop(); closeRoutineModal(); }}
                    className="px-5 py-2 sm:py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{t('Start Lesson! 🎉', <>レッスン開始！ 🎉</>)}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
