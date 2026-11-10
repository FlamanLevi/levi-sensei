import { CuratedTile, TownTilesData } from './types';

/**
 * Curated Textbook Vocabulary Tiles (36 Core MEXT Elementary Tiles)
 * Direct alignment with MEXT Let's Try 1 & 2 and Here We Go 5 & 6.
 */
export const CURATED_TEXTBOOK_TILES: CuratedTile[] = [
  // --- Buildings (施設・建物) ---
  {
    id: 'b06_bakery',
    en: 'Bakery',
    ja: 'パン屋',
    furigana: 'パンや',
    icon: '🍞',
    category: 'building',
    defaultDoc: 'Village bakery with fresh bread aroma and stone chimney.'
  },
  {
    id: 'b15_library_scholar',
    en: 'Library',
    ja: '図書館',
    furigana: 'としょかん',
    icon: '📚',
    category: 'building',
    defaultDoc: 'Town library with copper dome and ancient scrolls.'
  },
  {
    id: 'b14_town_hall',
    en: 'Town Hall',
    ja: '市役所',
    furigana: 'しやくしょ',
    icon: '🏛️',
    category: 'building',
    defaultDoc: 'Civic town hall with grand astronomical clocktower.'
  },
  {
    id: 'b12_general_store',
    en: 'Supermarket',
    ja: 'お店・スーパー',
    furigana: 'おみせ',
    icon: '🏪',
    category: 'building',
    defaultDoc: 'Bustling merchant emporium with fresh fruit and supplies.'
  },
  {
    id: 'b02_tudor_inn',
    en: 'Restaurant',
    ja: 'レストラン',
    furigana: 'レストラン',
    icon: '🍽️',
    category: 'building',
    defaultDoc: 'Welcoming village inn serving hot stew and baked treats.'
  },
  {
    id: 'b18_greenhouse_orangery',
    en: 'Flower Shop',
    ja: '花屋',
    furigana: 'はなや',
    icon: '🌺',
    category: 'building',
    defaultDoc: 'Glass conservatory filled with colorful blooming flowers.'
  },
  {
    id: 'b07_apothecary',
    en: 'Hospital / Clinic',
    ja: '病院・薬局',
    furigana: 'びょういん',
    icon: '🏥',
    category: 'building',
    defaultDoc: 'Herbalist clinic and medicine conservatory.'
  },
  {
    id: 'b08_watchtower',
    en: 'Castle Tower',
    ja: 'お城の塔',
    furigana: 'おしろのとう',
    icon: '🏰',
    category: 'building',
    defaultDoc: 'Fortified stone watchtower with royal banner.'
  },
  {
    id: 'b09_chapel',
    en: 'Church',
    ja: '教会',
    furigana: 'きょうかい',
    icon: '⛪',
    category: 'building',
    defaultDoc: 'Stone chapel with stained-glass rose window and brass bell.'
  },
  {
    id: 'b13_barn_silo',
    en: 'Farm',
    ja: '農場・牧場',
    furigana: 'のうじょう',
    icon: '🚜',
    category: 'building',
    defaultDoc: 'Red homestead barn and grain silo for livestock and crops.'
  },
  {
    id: 'b19_lighthouse_dock',
    en: 'Lighthouse',
    ja: '灯台',
    furigana: 'とうだい',
    icon: '🗼',
    category: 'building',
    defaultDoc: 'Striped seaside beacon guiding sailing ships through the fog.'
  },
  {
    id: 'b04_windmill',
    en: 'Windmill',
    ja: '風車',
    furigana: 'ふうしゃ',
    icon: '🎡',
    category: 'building',
    defaultDoc: 'Spinning grain windmill grinding golden harvest flour.'
  },
  {
    id: 'b05_watermill',
    en: 'Watermill',
    ja: '水車',
    furigana: 'すいしゃ',
    icon: '🌊',
    category: 'building',
    defaultDoc: 'Riverside timber watermill with a spinning paddle wheel.'
  },
  {
    id: 'b01_cottage_red',
    en: 'House',
    ja: '赤い屋根の家',
    furigana: 'あかいやねのいえ',
    icon: '🏡',
    category: 'building',
    defaultDoc: 'Cozy red cottage with terracotta roof and stone chimney.'
  },

  // --- Parks & Nature (公園・自然) ---
  {
    id: 'd12_meadow_wildflowers',
    en: 'Green Meadow (Eraser)',
    ja: '草原（消しゴム）',
    furigana: 'そうげん',
    icon: '🌱',
    category: 'nature',
    defaultDoc: 'Lush green wildflower meadow.'
  },
  {
    id: 'd01_plaza_fountain',
    en: 'Fountain Square',
    ja: '噴水広場',
    furigana: 'ふんすいひろば',
    icon: '⛲',
    category: 'nature',
    defaultDoc: 'Central cobblestone town square with a splashing marble fountain.'
  },
  {
    id: 'd06_cherry_garden',
    en: 'Sakura Park',
    ja: '桜の公園',
    furigana: 'さくらのこうえん',
    icon: '🌸',
    category: 'nature',
    defaultDoc: 'Peaceful garden with blooming pink cherry blossom petals.'
  },
  {
    id: 'd04_oak_tree_park',
    en: 'Big Tree Park',
    ja: '大きな木の公園',
    furigana: 'おおきなきのこうえん',
    icon: '🌳',
    category: 'nature',
    defaultDoc: 'Ancient shade tree with timber benches and wildflower lawns.'
  },
  {
    id: 'd03_market_stalls',
    en: 'Market',
    ja: 'マーケット・市場',
    furigana: 'いちば',
    icon: '🎪',
    category: 'nature',
    defaultDoc: 'Vibrant outdoor bazaar stalls selling goods and produce.'
  },
  {
    id: 's38_farm_var4_apple_cider_press',
    en: 'Apple Orchard',
    ja: 'りんご園',
    furigana: 'りんごえん',
    icon: '🍎',
    category: 'nature',
    defaultDoc: 'Sweet apple orchard filled with ripe red apples.'
  },
  {
    id: 'm06_tropical_palm_island',
    en: 'Tropical Beach',
    ja: '南の島・ビーチ',
    furigana: 'みなみのしま',
    icon: '🏝️',
    category: 'nature',
    defaultDoc: 'Sunny tropical island with palm trees and turquoise lagoon.'
  },
  {
    id: 'c11_waterfall_gorge_n',
    en: 'Waterfall',
    ja: '大滝',
    furigana: 'おおだき',
    icon: '🏞️',
    category: 'nature',
    defaultDoc: 'Sparkling mountain waterfall cascading into a river.'
  },

  // --- Landmarks & Cultural Spots (名所・観光・動物) ---
  {
    id: 'l04_bamboo_torii_sanctuary',
    en: 'Shrine',
    ja: '神社',
    furigana: 'じんじゃ',
    icon: '⛩️',
    category: 'landmark',
    defaultDoc: 'Sacred vermilion torii gate entrance and bamboo sanctuary.'
  },
  {
    id: 'l12_geothermal_hotspring_onsen',
    en: 'Hot Spring',
    ja: '温泉',
    furigana: 'おんせん',
    icon: '♨️',
    category: 'landmark',
    defaultDoc: 'Steaming natural geothermal onsen pool framed by bamboo.'
  },
  {
    id: 'b21_japanese_pagoda_sw',
    en: 'Temple',
    ja: 'お寺・五重塔',
    furigana: 'おてら',
    icon: '🏯',
    category: 'landmark',
    defaultDoc: 'Three-tiered wooden pagoda with shingled eaves and spires.'
  },
  {
    id: 'l07_wildlife_dolphins',
    en: 'Dolphins',
    ja: 'イルカ',
    furigana: 'いるか',
    icon: '🐬',
    category: 'landmark',
    defaultDoc: 'Playful dolphins leaping in pairs from turquoise sea waves.'
  },
  {
    id: 'l08_wildlife_whale',
    en: 'Whale',
    ja: 'クジラ',
    furigana: 'くじら',
    icon: '🐋',
    category: 'landmark',
    defaultDoc: 'Giant humpback whale surfacing with a misty ocean blow-spout.'
  },
  {
    id: 'l09_wildlife_sea_turtles',
    en: 'Sea Turtles',
    ja: 'ウミガメ',
    furigana: 'うみがめ',
    icon: '🐢',
    category: 'landmark',
    defaultDoc: 'Gentle green sea turtles swimming through coral reefs.'
  },
  {
    id: 'l11_volcanic_caldera_island',
    en: 'Volcano',
    ja: '火山',
    furigana: 'かざん',
    icon: '🌋',
    category: 'landmark',
    defaultDoc: 'Active smoking volcanic island with glowing basalt crater.'
  },
  {
    id: 'l05_desert_pyramid_ruin',
    en: 'Pyramid',
    ja: 'ピラミッド',
    furigana: 'ピラミッド',
    icon: '🏜️',
    category: 'landmark',
    defaultDoc: 'Ancient golden desert stepped pyramid.'
  },

  // --- Roads & Bridges (道路・橋・運河) ---
  {
    id: 'r01_road_straight_ns',
    en: 'Road (N-S)',
    ja: '道路（たて）',
    furigana: 'どうろ',
    icon: '🛣️',
    category: 'road',
    defaultDoc: 'Straight cobblestone street running north to south.'
  },
  {
    id: 'r02_road_straight_ew',
    en: 'Road (E-W)',
    ja: '道路（よこ）',
    furigana: 'どうろ',
    icon: '🛣️',
    category: 'road',
    defaultDoc: 'Straight cobblestone street running east to west.'
  },
  {
    id: 'r03_road_cross',
    en: 'Crossroads',
    ja: '十字路',
    furigana: 'じゅうじろ',
    icon: '➕',
    category: 'road',
    defaultDoc: 'Cobblestone 4-way intersection connecting all directions.'
  },
  {
    id: 'r08_road_corner_ne',
    en: 'Corner Road (N-E)',
    ja: '曲がり角（北東）',
    furigana: 'まがりかど',
    icon: '↪️',
    category: 'road',
    defaultDoc: 'Cobblestone corner turn.'
  },
  {
    id: 'r10_road_corner_sw',
    en: 'Corner Road (S-W)',
    ja: '曲がり角（南西）',
    furigana: 'まがりかど',
    icon: '↩️',
    category: 'road',
    defaultDoc: 'Cobblestone corner turn.'
  },
  {
    id: 'r12_road_bridge_stone',
    en: 'Stone Bridge',
    ja: '石の橋',
    furigana: 'いしのはし',
    icon: '🌉',
    category: 'road',
    defaultDoc: 'Arched stone bridge crossing over a sparkling blue canal.'
  },
  {
    id: 'd11_canal_straight',
    en: 'Canal',
    ja: '運河・水路',
    furigana: 'うんが',
    icon: '🛶',
    category: 'road',
    defaultDoc: 'Clear stone-walled canal with rowboats and rippling water.'
  }
];

export const CURATED_TILE_MAP = new Map<string, CuratedTile>(
  CURATED_TEXTBOOK_TILES.map(t => [t.id, t])
);

export interface TownPresentationAnalysis {
  buildingsEn: string[];
  buildingsJa: string[];
  landmarksEn: string[];
  landmarksJa: string[];
  totalSpecialTiles: number;
  linesEn: string[];
  linesJa: string[];
  speechText: string;
}

/**
 * Dynamically scans the student's 16x16 grid and generates a personalized
 * MEXT Grade 5/6 English Show-and-Tell script matching their exact town!
 */
export function analyzeTownForPresentation(
  grid: string[][],
  tilesData: TownTilesData | null
): TownPresentationAnalysis {
  const counts = new Map<string, number>();
  for (const row of grid) {
    for (const tid of row) {
      if (tid === 'd12_meadow_wildflowers' || tid.startsWith('r0') || tid === 'd11_canal_straight') continue;
      counts.set(tid, (counts.get(tid) || 0) + 1);
    }
  }

  const buildingsEn: string[] = [];
  const buildingsJa: string[] = [];
  const landmarksEn: string[] = [];
  const landmarksJa: string[] = [];

  const sortedEntries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  for (const [tid] of sortedEntries) {
    const curated = CURATED_TILE_MAP.get(tid);
    if (curated) {
      if (curated.category === 'building') {
        buildingsEn.push(curated.en.toLowerCase());
        buildingsJa.push(`${curated.icon} ${curated.ja}`);
      } else if (curated.category === 'landmark' || curated.category === 'nature') {
        landmarksEn.push(curated.en.toLowerCase());
        landmarksJa.push(`${curated.icon} ${curated.ja}`);
      }
      continue;
    }

    const rawMeta = tilesData?.tiles.find(t => t.id === tid);
    if (rawMeta) {
      const cleanLabel = rawMeta.label.replace(/\s*\(.*?\)\s*/g, '').toLowerCase();
      if (rawMeta.category === 'building') {
        buildingsEn.push(cleanLabel);
        buildingsJa.push(`🏛️ ${rawMeta.label}`);
      } else if (rawMeta.category === 'landmark' || rawMeta.category === 'decoration' || rawMeta.category === 'biome') {
        landmarksEn.push(cleanLabel);
        landmarksJa.push(`✨ ${rawMeta.label}`);
      }
    }
  }

  const topBuildingsEn = buildingsEn.slice(0, 3);
  const topLandmarksEn = landmarksEn.slice(0, 2);

  const formatList = (items: string[], fallback: string) => {
    if (items.length === 0) return fallback;
    const withArticle = items.map(w => (w.endsWith('s') ? w : /^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`));
    if (withArticle.length === 1) return withArticle[0];
    if (withArticle.length === 2) return `${withArticle[0]} and ${withArticle[1]}`;
    return `${withArticle[0]}, ${withArticle[1]}, and ${withArticle[2]}`;
  };

  const bPhrase = formatList(topBuildingsEn, 'a bakery, a library, and a town hall');
  const lPhrase = formatList(topLandmarksEn, 'a fountain square and leaping dolphins');

  const linesEn = [
    `"Hello, everyone! Welcome to our dream town!"`,
    `"In our town, we have ${bPhrase}."`,
    `"You can also see ${lPhrase}!"`,
    `"It is a wonderful place. Please visit our town! Thank you!"`
  ];

  const bJaList = buildingsJa.slice(0, 3).join('・') || '🍞 パン屋・📚 図書館';
  const lJaList = landmarksJa.slice(0, 2).join('・') || '⛲ 噴水広場・🐬 イルカ';

  const linesJa = [
    `「みなさんこんにちは！私たちのドリームタウンへようこそ！」`,
    `「この街には、${bJaList} があります。」`,
    `「さらに、${lJaList} も見ることができます！」`,
    `「とても素敵な場所です。ぜひ私たちの街に遊びに来てください！ありがとう！」`
  ];

  const speechText = `Hello everyone! Welcome to our dream town! In our town, we have ${bPhrase}. You can also see ${lPhrase}! It is a wonderful place. Please visit our town! Thank you!`;

  return {
    buildingsEn,
    buildingsJa,
    landmarksEn,
    landmarksJa,
    totalSpecialTiles: Array.from(counts.values()).reduce((s, n) => s + n, 0),
    linesEn,
    linesJa,
    speechText
  };
}
