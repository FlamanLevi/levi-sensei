import { MissingBlueprintTarget, LandmarkLabel, NavigatorMission } from './types';

/**
 * Anchor Landmarks always visible on both Partner A and Partner B maps,
 * with toggleable floating labels so elementary students can easily orient themselves.
 */
export const ANCHOR_LANDMARK_LABELS: LandmarkLabel[] = [
  { row: 2, col: 2, en: 'Windmill', ja: '風車', icon: '🎡' },
  { row: 5, col: 5, en: 'Library', ja: '図書館', icon: '📚' },
  { row: 6, col: 6, en: 'Fountain', ja: '噴水広場', icon: '⛲' },
  { row: 8, col: 3, en: 'Big Tree Park', ja: '木の公園', icon: '🌳' },
  { row: 3, col: 10, en: 'Sakura Park', ja: '桜の公園', icon: '🌸' },
  { row: 7, col: 11, en: 'Stone Bridge', ja: '石の橋', icon: '🌉' },
  { row: 9, col: 9, en: 'Hot Spring', ja: '温泉', icon: '♨️' },
  { row: 12, col: 12, en: 'Lighthouse', ja: '灯台', icon: '🗼' },
  { row: 14, col: 14, en: 'Dolphins', ja: 'イルカ', icon: '🐬' }
];

/**
 * Round 1 Blueprint Targets (Set A: Bakery, Town Hall, Flower Shop, Shrine)
 */
export const BLUEPRINT_PUZZLE_TARGETS: MissingBlueprintTarget[] = [
  {
    id: 'target_bakery',
    tileId: 'b06_bakery',
    nameEn: 'Bakery',
    nameJa: 'パン屋',
    nameFurigana: 'パンや',
    icon: '🍞',
    row: 5,
    col: 7,
    clueEn: 'It is NEXT TO the Library, ACROSS FROM the Fountain Square!',
    clueJa: '図書館のすぐ近く、噴水広場の向かいにあるよ！',
    clueFurigana: 'としょかんのすぐちかく、ふんすいひろばのむかいにあるよ！',
    preposition: 'next to / across from',
    placed: false
  },
  {
    id: 'target_town_hall',
    tileId: 'b14_town_hall',
    nameEn: 'Town Hall',
    nameJa: '市役所',
    nameFurigana: 'しやくしょ',
    icon: '🏛️',
    row: 8,
    col: 5,
    clueEn: 'It is BETWEEN the Big Tree Park and the Crossroads!',
    clueJa: '大きな木の公園と十字路の間にあるよ！',
    clueFurigana: 'おおきなきのこうえんとじゅうじろのあいだにあるよ！',
    preposition: 'between',
    placed: false
  },
  {
    id: 'target_flower_shop',
    tileId: 'b18_greenhouse_orangery',
    nameEn: 'Flower Shop',
    nameJa: '花屋',
    nameFurigana: 'はなや',
    icon: '🌺',
    row: 4,
    col: 10,
    clueEn: 'It is IN FRONT OF the Sakura Park, BY the Canal!',
    clueJa: '桜の公園の前、運河のすぐそばにあるよ！',
    clueFurigana: 'さくらのこうえんのまえ、うんがのすぐそばにあるよ！',
    preposition: 'in front of / by',
    placed: false
  },
  {
    id: 'target_shrine',
    tileId: 'l04_bamboo_torii_sanctuary',
    nameEn: 'Shrine',
    nameJa: '神社',
    nameFurigana: 'じんじゃ',
    icon: '⛩️',
    row: 10,
    col: 9,
    clueEn: 'It is BEHIND the Hot Spring, NEAR the Canal!',
    clueJa: '温泉のすぐ後ろ、運河の近くにあるよ！',
    clueFurigana: 'おんせんのすぐうしろ、うんがのちかくにあるよ！',
    preposition: 'behind / near',
    placed: false
  }
];

/**
 * Round 2 Blueprint Targets (Set B for Role Swap: Restaurant, Supermarket, Farm, Temple)
 */
export const BLUEPRINT_PUZZLE_TARGETS_ROUND_2: MissingBlueprintTarget[] = [
  {
    id: 'target_restaurant',
    tileId: 'b02_tudor_inn',
    nameEn: 'Restaurant',
    nameJa: 'レストラン',
    nameFurigana: 'レストラン',
    icon: '🍽️',
    row: 6,
    col: 8,
    clueEn: 'It is NEXT TO the Crossroads, ACROSS FROM the Fountain Square!',
    clueJa: '十字路のとなり、噴水広場の向かいにあるよ！',
    clueFurigana: 'じゅうじろのとなり、ふんすいひろばのむかいにあるよ！',
    preposition: 'next to / across from',
    placed: false
  },
  {
    id: 'target_supermarket',
    tileId: 'b12_general_store',
    nameEn: 'Supermarket',
    nameJa: 'スーパー・お店',
    nameFurigana: 'おみせ',
    icon: '🏪',
    row: 9,
    col: 6,
    clueEn: 'It is BETWEEN the Big Tree Park and the Hot Spring!',
    clueJa: '木の公園と温泉の間にあるよ！',
    clueFurigana: 'きのこうえんとおんせんのあいだにあるよ！',
    preposition: 'between',
    placed: false
  },
  {
    id: 'target_farm',
    tileId: 'b13_barn_silo',
    nameEn: 'Farm',
    nameJa: '農場・牧場',
    nameFurigana: 'のうじょう',
    icon: '🚜',
    row: 3,
    col: 4,
    clueEn: 'It is BETWEEN the Windmill and the Library!',
    clueJa: '風車と図書館の間にあるよ！',
    clueFurigana: 'ふうしゃととしょかんのあいだにあるよ！',
    preposition: 'between',
    placed: false
  },
  {
    id: 'target_temple',
    tileId: 'b21_japanese_pagoda_sw',
    nameEn: 'Temple',
    nameJa: 'お寺・五重塔',
    nameFurigana: 'おてら',
    icon: '🏯',
    row: 7,
    col: 13,
    clueEn: 'It is ACROSS the Stone Bridge, NEAR the Lighthouse!',
    clueJa: '石の橋を渡った先、灯台の近くにあるよ！',
    clueFurigana: 'いしのはしをわたったさき、とうだいのちかくにあるよ！',
    preposition: 'across / near',
    placed: false
  }
];

/**
 * Mode 2: Turn-by-Turn Navigator Missions
 */
export const NAVIGATOR_MISSIONS: NavigatorMission[] = [
  {
    id: 'mission_fountain',
    nameEn: 'Fountain Square',
    nameJa: '噴水広場',
    icon: '⛲',
    startRow: 7,
    startCol: 2,
    targetRow: 6,
    targetCol: 6,
    hintEn: 'Go straight 4 blocks East, then turn North to the Fountain!',
    hintJa: 'まっすぐ東へ4マス進んで、北へ曲がると噴水広場だよ！'
  },
  {
    id: 'mission_bakery',
    nameEn: 'Bakery',
    nameJa: 'パン屋',
    icon: '🍞',
    startRow: 12,
    startCol: 7,
    targetRow: 5,
    targetCol: 7,
    hintEn: 'Go straight North along the main street past the Crossroads to the Bakery!',
    hintJa: 'メインストリートを北へまっすぐ進み、十字路を越えるとパン屋だよ！'
  },
  {
    id: 'mission_sakura',
    nameEn: 'Sakura Park',
    nameJa: '桜の公園',
    icon: '🌸',
    startRow: 7,
    startCol: 3,
    targetRow: 3,
    targetCol: 10,
    hintEn: 'Go straight East to the Canal, then turn North to the Sakura Park!',
    hintJa: '東へ進んで、運河の手前で北へ曲がると桜の公園だよ！'
  },
  {
    id: 'mission_hotspring',
    nameEn: 'Hot Spring',
    nameJa: '温泉',
    icon: '♨️',
    startRow: 2,
    startCol: 7,
    targetRow: 9,
    targetCol: 9,
    hintEn: 'Go South to the Crossroads, turn East, then go South to the Hot Spring!',
    hintJa: '十字路まで南へ進み、東へ曲がってから南へ行くと温泉だよ！'
  },
  {
    id: 'mission_lighthouse',
    nameEn: 'Lighthouse',
    nameJa: '灯台',
    icon: '🗼',
    startRow: 7,
    startCol: 5,
    targetRow: 12,
    targetCol: 12,
    hintEn: 'Cross the Stone Bridge over the Canal, then head South to the Lighthouse!',
    hintJa: '運河の石の橋を渡って、南へ進むと海の灯台だよ！'
  }
];

/**
 * Creates an empty 16x16 meadow grid.
 */
export function createEmptyGrid(rows = 16, cols = 16, defaultTile = 'd12_meadow_wildflowers'): string[][] {
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(defaultTile);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Generates the Mode 1 Information Gap Town Map with 4 puzzle spots (supports Round 1 & Round 2).
 */
export function createBlueprintPuzzleMap(round: 1 | 2 = 1): {
  gridA: string[][];
  gridMaster: string[][];
  targets: MissingBlueprintTarget[];
} {
  const master = createEmptyGrid(16, 16, 'd12_meadow_wildflowers');

  // 1. Cobblestone main roads and crossroads
  for (let c = 2; c <= 13; c++) {
    master[7][c] = 'r02_road_straight_ew';
  }
  for (let r = 2; r <= 13; r++) {
    master[r][7] = 'r01_road_straight_ns';
  }
  master[7][7] = 'r03_road_cross';

  // 2. Canal running along col 11
  for (let r = 0; r <= 15; r++) {
    master[r][11] = 'd11_canal_straight';
  }
  master[7][11] = 'r12_road_bridge_stone'; // Bridge over canal

  // 3. Anchor Landmarks (Always visible on both maps!)
  master[5][5] = 'b15_library_scholar';            // Library
  master[6][6] = 'd01_plaza_fountain';             // Fountain Square
  master[8][3] = 'd04_oak_tree_park';              // Big Tree Park
  master[3][10] = 'd06_cherry_garden';             // Sakura Park
  master[9][9] = 'l12_geothermal_hotspring_onsen'; // Hot Spring
  master[2][2] = 'b04_windmill';                   // Windmill
  master[12][12] = 'b19_lighthouse_dock';          // Seaside Lighthouse
  master[14][14] = 'l07_wildlife_dolphins';        // Leaping Dolphins in sea

  // If Round 2, keep Round 1's buildings placed as completed town landmarks!
  if (round === 2) {
    BLUEPRINT_PUZZLE_TARGETS.forEach(t => {
      master[t.row][t.col] = t.tileId;
    });
  }

  const baseTargets = round === 1 ? BLUEPRINT_PUZZLE_TARGETS : BLUEPRINT_PUZZLE_TARGETS_ROUND_2;
  const targets: MissingBlueprintTarget[] = JSON.parse(JSON.stringify(baseTargets));

  // 4. Place Master Solution Targets
  targets.forEach(t => {
    master[t.row][t.col] = t.tileId;
  });

  // 5. Incomplete Grid A (Architect A sees meadows where active targets will go!)
  const gridA = master.map(row => [...row]);
  targets.forEach(t => {
    gridA[t.row][t.col] = 'd12_meadow_wildflowers';
  });

  return { gridA, gridMaster: master, targets };
}
