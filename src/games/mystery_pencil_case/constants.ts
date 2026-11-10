import { StationeryItem, ColorOption } from './types';

export const STATIONERY_ITEMS: StationeryItem[] = [
  {
    id: 'word_0598',
    english: 'pen',
    displayLabel: 'pen',
    article: 'a',
    pluralEnglish: 'pens',
    jaKanji: 'ペン',
    jaHiragana: 'ぺん',
    counter: '本',
    ruby: [{ base: 'ペン', ruby: '' }],
    singularImg: 'dic_4_card_pen_2544_1_c.webp',
    pluralImg: 'dic_4_card_pen_2544_plural_c.webp',
    soundFile: 'sound_suite/hwg/word_0598/hwg_word_0598_pen_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/hwg/word_0598/hwg_word_0598_pen_jenny.mp3',
      andrew: 'sound_suite/hwg/word_0598/hwg_word_0598_pen_andrew.mp3',
      ana: 'sound_suite/hwg/word_0598/hwg_word_0598_pen_ana.mp3',
      ja: 'sound_suite/hwg/word_0598/hwg_word_0598_pen_nanami.mp3',
    }
  },
  {
    id: 'word_0599',
    english: 'pencil',
    displayLabel: 'pencil',
    article: 'a',
    pluralEnglish: 'pencils',
    jaKanji: '鉛筆',
    jaHiragana: 'えんぴつ',
    counter: '本',
    ruby: [
      { base: '鉛筆', ruby: 'えんぴつ' }
    ],
    singularImg: 'dic_wb_05schoollife_pencil_1273_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_pencil_1273_plural_c.webp',
    soundFile: 'sound_suite/hwg/word_0599/hwg_word_0599_pencil_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/hwg/word_0599/hwg_word_0599_pencil_jenny.mp3',
      andrew: 'sound_suite/hwg/word_0599/hwg_word_0599_pencil_andrew.mp3',
      ana: 'sound_suite/hwg/word_0599/hwg_word_0599_pencil_ana.mp3',
      ja: 'sound_suite/hwg/word_0599/hwg_word_0599_pencil_nanami.mp3',
    }
  },
  {
    id: 'word_0582',
    english: 'eraser',
    displayLabel: 'eraser',
    article: 'an', // Unit 5 key teaching point!
    pluralEnglish: 'erasers',
    jaKanji: '消しゴム',
    jaHiragana: 'けしごむ',
    counter: '個',
    ruby: [
      { base: '消', ruby: 'け' },
      { base: 'しゴム', ruby: '' }
    ],
    singularImg: 'dic_wb_05schoollife_eraser_1266_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_eraser_1266_plural_c.webp',
    soundFile: 'sound_suite/hwg/word_0582/hwg_word_0582_eraser_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/hwg/word_0582/hwg_word_0582_eraser_jenny.mp3',
      andrew: 'sound_suite/hwg/word_0582/hwg_word_0582_eraser_andrew.mp3',
      ana: 'sound_suite/hwg/word_0582/hwg_word_0582_eraser_ana.mp3',
      ja: 'sound_suite/hwg/word_0582/hwg_word_0582_eraser_nanami.mp3',
    }
  },
  {
    id: 'word_0604',
    english: 'ruler',
    displayLabel: 'ruler',
    article: 'a',
    pluralEnglish: 'rulers',
    jaKanji: '定規',
    jaHiragana: 'じょうぎ',
    counter: '本',
    ruby: [
      { base: '定規', ruby: 'じょうぎ' }
    ],
    singularImg: 'dic_wb_05schoollife_ruler_1276_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_ruler_1276_plural_c.webp',
    soundFile: 'sound_suite/hwg/word_0604/hwg_word_0604_ruler_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/hwg/word_0604/hwg_word_0604_ruler_jenny.mp3',
      andrew: 'sound_suite/hwg/word_0604/hwg_word_0604_ruler_andrew.mp3',
      ana: 'sound_suite/hwg/word_0604/hwg_word_0604_ruler_ana.mp3',
      ja: 'sound_suite/hwg/word_0604/hwg_word_0604_ruler_nanami.mp3'
    }
  },
  {
    id: 'word_0591',
    english: 'marker',
    displayLabel: 'marker',
    article: 'a',
    pluralEnglish: 'markers',
    jaKanji: 'マーカー',
    jaHiragana: 'まーかー',
    counter: '本',
    ruby: [{ base: 'マーカー', ruby: '' }],
    singularImg: 'dic_wb_05schoollife_marker_1270_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_marker_1270_plural_c.webp',
    soundFile: 'sound_suite/letstry/word_0591/letstry_word_0591_marker_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/letstry/word_0591/letstry_word_0591_marker_jenny.mp3',
      andrew: 'sound_suite/letstry/word_0591/letstry_word_0591_marker_andrew.mp3',
      ana: 'sound_suite/letstry/word_0591/letstry_word_0591_marker_ana.mp3',
      ja: 'sound_suite/letstry/word_0591/letstry_word_0591_marker_nanami.mp3',
    }
  },
  {
    id: 'word_0584',
    english: 'glue stick',
    displayLabel: 'glue stick',
    article: 'a',
    pluralEnglish: 'glue sticks',
    jaKanji: 'スティックのり',
    jaHiragana: 'すてぃっくのり',
    counter: '本',
    ruby: [{ base: 'スティックのり', ruby: '' }],
    singularImg: 'dic_wb_05schoollife_gluestick_1267_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_gluestick_1267_plural_c.webp',
    soundFile: 'sound_suite/letstry/word_0584/letstry_word_0584_glue_stick_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/letstry/word_0584/letstry_word_0584_glue_stick_jenny.mp3',
      andrew: 'sound_suite/letstry/word_0584/letstry_word_0584_glue_stick_andrew.mp3',
      ana: 'sound_suite/letstry/word_0584/letstry_word_0584_glue_stick_ana.mp3',
      ja: 'sound_suite/letstry/word_0584/letstry_word_0584_glue_stick_nanami.mp3'
    }
  },
  {
    id: 'word_0596',
    english: 'notebook',
    displayLabel: 'notebook',
    article: 'a',
    pluralEnglish: 'notebooks',
    jaKanji: 'ノート',
    jaHiragana: 'のーと',
    counter: '冊',
    ruby: [{ base: 'ノート', ruby: '' }],
    singularImg: 'dic_wb_05schoollife_notebook_1271_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_notebook_1271_plural_c.webp',
    soundFile: 'sound_suite/hwg/word_0596/hwg_word_0596_notebook_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/hwg/word_0596/hwg_word_0596_notebook_jenny.mp3',
      andrew: 'sound_suite/hwg/word_0596/hwg_word_0596_notebook_andrew.mp3',
      ana: 'sound_suite/hwg/word_0596/hwg_word_0596_notebook_ana.mp3',
      ja: 'sound_suite/hwg/word_0596/hwg_word_0596_notebook_nanami.mp3',
    }
  },
  {
    id: 'word_0612',
    english: 'stapler',
    displayLabel: 'stapler',
    article: 'a',
    pluralEnglish: 'staplers',
    jaKanji: 'ホッチキス',
    jaHiragana: 'ほっちきす',
    counter: '個',
    ruby: [{ base: 'ホッチキス', ruby: '' }],
    singularImg: 'dic_4_card_stapler_2548_1_c.webp',
    pluralImg: 'dic_4_card_stapler_2548_plural_c.webp',
    soundFile: 'sound_suite/letstry/word_0612/letstry_word_0612_stapler_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/letstry/word_0612/letstry_word_0612_stapler_jenny.mp3',
      andrew: 'sound_suite/letstry/word_0612/letstry_word_0612_stapler_andrew.mp3',
      ana: 'sound_suite/letstry/word_0612/letstry_word_0612_stapler_ana.mp3',
      ja: 'sound_suite/letstry/word_0612/letstry_word_0612_stapler_nanami.mp3',
    }
  },
  {
    id: 'word_0601',
    english: 'pencil sharpener',
    displayLabel: 'pencil sharpener',
    article: 'a',
    pluralEnglish: 'pencil sharpeners',
    jaKanji: '鉛筆削り',
    jaHiragana: 'えんぴつけずり',
    counter: '個',
    ruby: [
      { base: '鉛筆削', ruby: 'えんぴつけず' },
      { base: 'り', ruby: '' }
    ],
    singularImg: 'dic_wb_05schoollife_pencilsharpener_1275_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_pencilsharpener_1275_plural_c.webp',
    soundFile: 'sound_suite/letstry/word_0601/letstry_word_0601_pencil_sharpener_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/letstry/word_0601/letstry_word_0601_pencil_sharpener_jenny.mp3',
      andrew: 'sound_suite/letstry/word_0601/letstry_word_0601_pencil_sharpener_andrew.mp3',
      ana: 'sound_suite/letstry/word_0601/letstry_word_0601_pencil_sharpener_ana.mp3',
      ja: 'sound_suite/letstry/word_0601/letstry_word_0601_pencil_sharpener_nanami.mp3'
    }
  },
  {
    id: 'word_0600',
    english: 'pencil case',
    displayLabel: 'pencil case',
    article: 'a',
    pluralEnglish: 'pencil cases',
    jaKanji: '筆箱',
    jaHiragana: 'ふでばこ',
    counter: '個',
    ruby: [
      { base: '筆箱', ruby: 'ふでばこ' }
    ],
    singularImg: 'dic_wb_05schoollife_pencilcase_1274_1_c.webp',
    pluralImg: 'dic_wb_05schoollife_pencilcase_1274_plural_c.webp',
    soundFile: 'sound_suite/hwg/word_0600/hwg_word_0600_pencil_case_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/hwg/word_0600/hwg_word_0600_pencil_case_jenny.mp3',
      andrew: 'sound_suite/hwg/word_0600/hwg_word_0600_pencil_case_andrew.mp3',
      ana: 'sound_suite/hwg/word_0600/hwg_word_0600_pencil_case_ana.mp3',
      ja: 'sound_suite/hwg/word_0600/hwg_word_0600_pencil_case_nanami.mp3'
    }
  },
  {
    id: 'word_0690',
    english: 'magnet',
    displayLabel: 'magnet',
    article: 'a',
    pluralEnglish: 'magnets',
    jaKanji: '磁石',
    jaHiragana: 'じしゃく',
    counter: '個',
    ruby: [
      { base: '磁石', ruby: 'じしゃく' }
    ],
    singularImg: 'dic_wb_07dailylife_magnet_1360_1_c.webp',
    pluralImg: 'dic_wb_07dailylife_magnet_1360_plural_c.webp',
    soundFile: 'sound_suite/letstry/word_0690/letstry_word_0690_magnet_jenny.mp3',
    audioSuite: {
      jenny: 'sound_suite/letstry/word_0690/letstry_word_0690_magnet_jenny.mp3',
      andrew: 'sound_suite/letstry/word_0690/letstry_word_0690_magnet_andrew.mp3',
      ana: 'sound_suite/letstry/word_0690/letstry_word_0690_magnet_ana.mp3',
      ja: 'sound_suite/letstry/word_0690/letstry_word_0690_magnet_nanami.mp3'
    }
  }
];

export const COLOR_OPTIONS: ColorOption[] = [
  {
    id: 'red',
    en: 'red',
    ja: '赤',
    jaModifier: '赤い',
    hex: '#ef4444',
    bgClass: 'bg-red-500',
    textClass: 'text-red-500 dark:text-red-400',
    borderClass: 'border-red-500',
    badgeBg: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
  },
  {
    id: 'blue',
    en: 'blue',
    ja: '青',
    jaModifier: '青い',
    hex: '#3b82f6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500 dark:text-blue-400',
    borderClass: 'border-blue-500',
    badgeBg: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
  },
  {
    id: 'yellow',
    en: 'yellow',
    ja: '黄色',
    jaModifier: '黄色い',
    hex: '#eab308',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-500 dark:text-amber-400',
    borderClass: 'border-amber-400',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  },
  {
    id: 'green',
    en: 'green',
    ja: '緑',
    jaModifier: '緑の',
    hex: '#22c55e',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-500 dark:text-emerald-400',
    borderClass: 'border-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
  },
  {
    id: 'pink',
    en: 'pink',
    ja: 'ピンク',
    jaModifier: 'ピンクの',
    hex: '#ec4899',
    bgClass: 'bg-pink-500',
    textClass: 'text-pink-500 dark:text-pink-400',
    borderClass: 'border-pink-500',
    badgeBg: 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800'
  },
  {
    id: 'orange',
    en: 'orange',
    ja: 'オレンジ',
    jaModifier: 'オレンジの',
    hex: '#f97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-500 dark:text-orange-400',
    borderClass: 'border-orange-500',
    badgeBg: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800'
  },
  {
    id: 'purple',
    en: 'purple',
    ja: '紫',
    jaModifier: '紫の',
    hex: '#a855f7',
    bgClass: 'bg-purple-500',
    textClass: 'text-purple-500 dark:text-purple-400',
    borderClass: 'border-purple-500',
    badgeBg: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
  },
  {
    id: 'black',
    en: 'black',
    ja: '黒',
    jaModifier: '黒い',
    hex: '#1e293b',
    bgClass: 'bg-slate-900',
    textClass: 'text-slate-900 dark:text-slate-200',
    borderClass: 'border-slate-800 dark:border-slate-600',
    badgeBg: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
  },
  {
    id: 'brown',
    en: 'brown',
    ja: '茶色',
    jaModifier: '茶色の',
    hex: '#92400e',
    bgClass: 'bg-amber-800',
    textClass: 'text-amber-800 dark:text-amber-500',
    borderClass: 'border-amber-800',
    badgeBg: 'bg-amber-200 text-amber-900 border-amber-400 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
  }
];

export function resolveItemImageSrc(imageName: string): string {
  if (!imageName) return '';
  if (imageName.startsWith('http://') || imageName.startsWith('https://') || imageName.startsWith('/')) {
    return imageName;
  }
  return `/media/images/${imageName}`;
}
