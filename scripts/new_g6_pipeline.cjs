const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * =============================================================================
 * LEVI-SENSEI HERE WE GO GRADE 6 MULTI-STAGE ASSET PIPELINE v6.0
 * =============================================================================
 * Discrete, Verifiable Stages:
 *
 *   STAGE 1: Row-Partitioned Raw Cell Extraction
 *            Extracts each card according to its exact physical textbook geometry.
 *            Accounts for irregular column counts, side-by-side rows,
 *            diagram callouts (Unit 12), and floating number cards (Unit 19).
 *            Output: manabi_assets/Grade 6 Manabi (new)/_pipeline/step1_raw_cells/
 *
 *   STAGE 2: Smart Chroma Paw Watermark Eradication
 *            Detects orange/purple paw pixels in top-right corners
 *            (including the inner illustration corner on side-by-side cards!).
 *            Applies zero patches if no paw is present.
 *            Output: manabi_assets/Grade 6 Manabi (new)/_pipeline/step2_unwatermarked/
 *
 *   STAGE 3: Illustration Artwork Crop & Dynamic Guideline Floor Detection
 *            Isolates pure artwork above handwriting guidelines, auto-trims
 *            excess whitespace, and adds clean 10-12px frame padding.
 *            Output: manabi_assets/Grade 6 Manabi (new)/_pipeline/step3_trimmed_illust/
 *
 *   STAGE 4: 4x Ultra-DPI Super-Sampling & Production Asset Deployment
 *            Upscales clean illustrations and full cards at 4x Ultra-DPI
 *            (Lanczos3 + line-art unsharp mask) for 300 DPI print & 4K Front TV.
 *            Output: trimmed_assets/cards/illustration/
 *                    trimmed_assets/cards/full/
 * =============================================================================
 */

const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');
const PIPELINE_DIR = path.join(MASTER_DIR, '_pipeline');

const STAGE1_DIR = path.join(PIPELINE_DIR, 'step1_raw_cells');
const STAGE2_DIR = path.join(PIPELINE_DIR, 'step2_unwatermarked');
const STAGE3_DIR = path.join(PIPELINE_DIR, 'step3_trimmed_illust');
const STAGE4_DIR = path.join(PIPELINE_DIR, 'step4_supersampled_illust');

const OUT_ILLUST_DIR = path.join(__dirname, '../trimmed_assets/cards/illustration');
const OUT_FULL_DIR = path.join(__dirname, '../trimmed_assets/cards/full');

[STAGE1_DIR, STAGE2_DIR, STAGE3_DIR, STAGE4_DIR, OUT_ILLUST_DIR, OUT_FULL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 4x Ultra-DPI Super-Sampling (Target ~800-900px, 300 DPI Print / 4K Classroom TV)
const SCALE = 4;

// =============================================================================
// COMPREHENSIVE GRADE 6 ROW-PARTITIONED SHEET SPECIFICATION (373 CARDS)
// =============================================================================
const G6_SHEETS = [
  // Unit 1 Part 1: Countries (12 cards) - 3 rows x 4 cols
  {
    unit: 'u01',
    file: 'u11_p1_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'Australia' }, { slot: '01', en: 'Azerbaijan' }, { slot: '02', en: 'Brazil' }, { slot: '03', en: 'Canada' }] },
      { cols: 4, items: [{ slot: '04', en: 'Chile' }, { slot: '05', en: 'China' }, { slot: '06', en: 'Egypt' }, { slot: '07', en: 'Finland' }] },
      { cols: 4, items: [{ slot: '08', en: 'France' }, { slot: '09', en: 'Germany' }, { slot: '10', en: 'India' }, { slot: '11', en: 'Italy' }] }
    ]
  },

  // Unit 1 Part 2: Countries (14 cards) - 4 rows: 4, 4, 4, 2 cols
  {
    unit: 'u01',
    file: 'u11_p1_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'Japan' }, { slot: '13', en: 'Kenya' }, { slot: '14', en: 'Korea' }, { slot: '15', en: 'New_Zealand' }] },
      { cols: 4, items: [{ slot: '16', en: 'Norway' }, { slot: '17', en: 'Peru' }, { slot: '18', en: 'Russia' }, { slot: '19', en: 'Saudi_Arabia' }] },
      { cols: 4, items: [{ slot: '20', en: 'South_Africa' }, { slot: '21', en: 'Thailand' }, { slot: '22', en: 'the_Maldives' }, { slot: '23', en: 'the_Philippines' }] },
      { cols: 4, items: [{ slot: '24', en: 'the_U.K.' }, { slot: '25', en: 'the_U.S.' }] }
    ]
  },

  // Unit 2 Part 1: Activities & Hobbies (11 cards) - 3 rows: 4 cols, 4 cols, 3 cols!
  {
    unit: 'u02',
    file: 'u11_p2_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'singing' }, { slot: '01', en: 'cooking' }, { slot: '02', en: 'swimming' }, { slot: '03', en: 'running' }] },
      { cols: 4, items: [{ slot: '04', en: 'dancing' }, { slot: '05', en: 'fishing' }, { slot: '06', en: 'sports' }, { slot: '07', en: 'kendama' }] },
      { cols: 3, items: [{ slot: '08', en: 'sewing' }, { slot: '09', en: 'jumping_rope' }, { slot: '10', en: 'riding_a_unicycle' }] }
    ]
  },

  // Unit 2 Part 2: Activities & Hobbies (5 cards) - 2 rows: 3 cols, 2 cols!
  {
    unit: 'u02',
    file: 'u11_p2_2.png',
    rows: [
      { cols: 3, items: [{ slot: '11', en: 'drawing_pictures' }, { slot: '12', en: 'making_sweets' }, { slot: '13', en: 'playing_the_piano' }] },
      { cols: 2, items: [{ slot: '14', en: 'playing_the_recorder' }, { slot: '15', en: 'playing_video_games' }] }
    ]
  },

  // Unit 3: Seasons (4 cards) - 1 row x 4 cols
  {
    unit: 'u03',
    file: 'u11_p3.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'spring' }, { slot: '01', en: 'summer' }, { slot: '02', en: 'fall' }, { slot: '03', en: 'winter' }] }
    ]
  },

  // Unit 4: Months (12 cards) - 3 rows x 4 cols (Contains all 12 authentic months Jan-Dec!)
  {
    unit: 'u04',
    file: 'u11_p4_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'January' }, { slot: '01', en: 'February' }, { slot: '02', en: 'March' }, { slot: '03', en: 'April' }] },
      { cols: 4, items: [{ slot: '04', en: 'May' }, { slot: '05', en: 'June' }, { slot: '06', en: 'July' }, { slot: '07', en: 'August' }] },
      { cols: 4, items: [{ slot: '08', en: 'September' }, { slot: '09', en: 'October' }, { slot: '10', en: 'November' }, { slot: '11', en: 'December' }] }
    ]
  },

  // Unit 5: Festivals (12 cards) - 4 rows x 3 cols
  {
    unit: 'u05',
    file: 'u11_p5_1.png',
    rows: [
      { cols: 3, items: [{ slot: '00', en: 'hanami' }, { slot: '01', en: 'the_Doll_Festival' }, { slot: '02', en: 'Children_s_Day' }] },
      { cols: 3, items: [{ slot: '03', en: 'the_Star_Festival' }, { slot: '04', en: 'a_summer_festival' }, { slot: '05', en: 'a_fireworks_festival' }] },
      { cols: 3, items: [{ slot: '06', en: 'tsukimi' }, { slot: '07', en: 'momijigari' }, { slot: '08', en: 'shichi-go-san' }] },
      { cols: 3, items: [{ slot: '09', en: 'oshogatsu' }, { slot: '10', en: 'setsubun' }, { slot: '11', en: 'a_snow_festival' }] }
    ]
  },

  // Unit 6 Part 1: Verbs (12 cards) - 3 rows x 4 cols
  {
    unit: 'u06',
    file: 'u11_p6_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'see' }, { slot: '01', en: 'saw' }, { slot: '02', en: 'eat' }, { slot: '03', en: 'ate' }] },
      { cols: 4, items: [{ slot: '04', en: 'go' }, { slot: '05', en: 'went' }, { slot: '06', en: 'enjoy' }, { slot: '07', en: 'enjoyed' }] },
      { cols: 4, items: [{ slot: '08', en: 'visit' }, { slot: '09', en: 'visited' }, { slot: '10', en: 'make' }, { slot: '11', en: 'made' }] }
    ]
  },

  // Unit 6 Part 2: Verbs (12 cards) - 3 rows x 4 cols
  {
    unit: 'u06',
    file: 'u11_p6_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'talk' }, { slot: '13', en: 'talked' }, { slot: '14', en: 'sing' }, { slot: '15', en: 'sang' }] },
      { cols: 4, items: [{ slot: '16', en: 'cook' }, { slot: '17', en: 'cooked' }, { slot: '18', en: 'watch' }, { slot: '19', en: 'watched' }] },
      { cols: 4, items: [{ slot: '20', en: 'play' }, { slot: '21', en: 'played' }, { slot: '22', en: 'practice' }, { slot: '23', en: 'practiced' }] }
    ]
  },

  // Unit 6 Part 3: Verbs (12 cards) - 3 rows x 4 cols
  {
    unit: 'u06',
    file: 'u11_p6_3.png',
    rows: [
      { cols: 4, items: [{ slot: '24', en: 'like' }, { slot: '25', en: 'love' }, { slot: '26', en: 'have' }, { slot: '27', en: 'want' }] },
      { cols: 4, items: [{ slot: '28', en: 'buy' }, { slot: '29', en: 'clean' }, { slot: '30', en: 'climb' }, { slot: '31', en: 'dance' }] },
      { cols: 4, items: [{ slot: '32', en: 'draw' }, { slot: '33', en: 'drink' }, { slot: '34', en: 'fly' }, { slot: '35', en: 'help' }] }
    ]
  },

  // Unit 6 Part 4: Verbs (11 cards) - 3 rows x 4 cols
  {
    unit: 'u06',
    file: 'u11_p6_4.png',
    rows: [
      { cols: 4, items: [{ slot: '36', en: 'jump' }, { slot: '37', en: 'listen' }, { slot: '38', en: 'read' }, { slot: '39', en: 'run' }] },
      { cols: 4, items: [{ slot: '40', en: 'stand_up' }, { slot: '41', en: 'sit_down' }, { slot: '42', en: 'speak' }, { slot: '43', en: 'study' }] },
      { cols: 4, items: [{ slot: '44', en: 'swim' }, { slot: '45', en: 'walk' }, { slot: '46', en: 'write' }] }
    ]
  },

  // Unit 7 Part 1: Times of Day (4 cards) - 1 row x 4 cols
  {
    unit: 'u07',
    file: 'u11_p7_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'morning' }, { slot: '01', en: 'afternoon' }, { slot: '02', en: 'evening' }, { slot: '03', en: 'night' }] }
    ]
  },

  // Unit 7 Part 2: Days of the Week (7 cards) - 3 rows x 3 cols (Side-by-side layout)
  {
    unit: 'u07',
    file: 'u11_p7_2.png',
    isDaysOfWeek: true,
    rows: [
      { cols: 3, items: [{ slot: '04', en: 'Sunday' }, { slot: '05', en: 'Monday' }, { slot: '06', en: 'Tuesday' }] },
      { cols: 3, items: [{ slot: '07', en: 'Wednesday' }, { slot: '08', en: 'Thursday' }, { slot: '09', en: 'Friday' }] },
      { cols: 3, items: [{ slot: '10', en: 'Saturday' }] }
    ]
  },

  // Unit 7 Part 3: Frequency Adverbs (4 cards) - 4 horizontal banner rows
  {
    unit: 'u07',
    file: 'u11_p7_4.png',
    isFrequency: true,
    rows: [
      { cols: 1, items: [{ slot: '11', en: 'always' }] },
      { cols: 1, items: [{ slot: '12', en: 'usually' }] },
      { cols: 1, items: [{ slot: '13', en: 'sometimes' }] },
      { cols: 1, items: [{ slot: '14', en: 'never' }] }
    ]
  },

  // Unit 8 Part 1: Daily Routines (11 cards) - 6 rows x 2 cols (Side-by-side layout)
  {
    unit: 'u08',
    file: 'u11_p8_1.png',
    isSideBySide: true,
    borderInsetX: 18,
    rows: [
      { cols: 2, items: [{ slot: '00', en: 'get_up' }, { slot: '01', en: 'eat_breakfast' }] },
      { cols: 2, items: [{ slot: '02', en: 'brush_my_teeth' }, { slot: '03', en: 'take_out_the_garbage' }] },
      { cols: 2, items: [{ slot: '04', en: 'leave_my_house' }, { slot: '05', en: 'go_to_school' }] },
      { cols: 2, items: [{ slot: '06', en: 'eat_lunch' }, { slot: '07', en: 'go_home' }] },
      { cols: 2, items: [{ slot: '08', en: 'clean_my_room' }, { slot: '09', en: 'do_my_homework' }] },
      { cols: 2, items: [{ slot: '10', en: 'play_with_my_friends' }] }
    ]
  },

  // Unit 8 Part 2: Daily Routines (10 cards) - 5 rows x 2 cols (Side-by-side layout)
  {
    unit: 'u08',
    file: 'u11_p8_2.png',
    isSideBySide: true,
    borderInsetX: 18,
    rows: [
      { cols: 2, items: [{ slot: '11', en: 'watch_TV' }, { slot: '12', en: 'walk_the_dog' }] },
      { cols: 2, items: [{ slot: '13', en: 'cook_dinner' }, { slot: '14', en: 'set_the_table' }] },
      { cols: 2, items: [{ slot: '15', en: 'eat_dinner' }, { slot: '16', en: 'clear_the_table' }] },
      { cols: 2, items: [{ slot: '17', en: 'wash_the_dishes' }, { slot: '18', en: 'clean_the_bath' }] },
      { cols: 2, items: [{ slot: '19', en: 'take_a_bath' }, { slot: '20', en: 'go_to_bed' }] }
    ]
  },

  // Unit 9 Part 1: Facilities (12 cards) - 3 rows x 4 cols
  {
    unit: 'u09',
    file: 'u11_p9_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'house' }, { slot: '01', en: 'school' }, { slot: '02', en: 'bookstore' }, { slot: '03', en: 'station' }] },
      { cols: 4, items: [{ slot: '04', en: 'library' }, { slot: '05', en: 'hospital' }, { slot: '06', en: 'fire_station' }, { slot: '07', en: 'police_station' }] },
      { cols: 4, items: [{ slot: '08', en: 'supermarket' }, { slot: '09', en: 'flower_shop' }, { slot: '10', en: 'shrine' }, { slot: '11', en: 'temple' }] }
    ]
  },

  // Unit 9 Part 2: Facilities (12 cards) - Asymmetric: Row 0-1 (4 cols stacked), Row 2-3 (2 cols side-by-side)
  {
    unit: 'u09',
    file: 'u11_p9_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'restaurant' }, { slot: '13', en: 'park' }, { slot: '14', en: 'stadium' }, { slot: '15', en: 'gym' }] },
      { cols: 4, items: [{ slot: '16', en: 'zoo' }, { slot: '17', en: 'aquarium' }, { slot: '18', en: 'museum' }, { slot: '19', en: 'castle' }] },
      { cols: 2, isSideBySide: true, items: [{ slot: '20', en: 'junior_high_school' }, { slot: '21', en: 'department_store' }] },
      { cols: 2, isSideBySide: true, items: [{ slot: '22', en: 'swimming_pool' }, { slot: '23', en: 'amusement_park' }] }
    ]
  },

  // Unit 10 Part 1: Nature (12 cards) - 3 rows x 4 cols
  {
    unit: 'u10',
    file: 'u11_p10_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'sea' }, { slot: '01', en: 'beach' }, { slot: '02', en: 'mountain' }, { slot: '03', en: 'forest' }] },
      { cols: 4, items: [{ slot: '04', en: 'rain_forest' }, { slot: '05', en: 'desert' }, { slot: '06', en: 'savanna' }, { slot: '07', en: 'lake' }] },
      { cols: 4, items: [{ slot: '08', en: 'pond' }, { slot: '09', en: 'river' }, { slot: '10', en: 'waterfall' }, { slot: '11', en: 'hot_spring' }] }
    ]
  },

  // Unit 10 Part 2: Nature & Sky (12 cards) - 3 rows x 4 cols
  {
    unit: 'u10',
    file: 'u11_p10_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'sky' }, { slot: '13', en: 'sun' }, { slot: '14', en: 'stars' }, { slot: '15', en: 'tree' }] },
      { cols: 4, items: [{ slot: '16', en: 'nuts' }, { slot: '17', en: 'leaves' }, { slot: '18', en: 'grass' }, { slot: '19', en: 'flower' }] },
      { cols: 4, items: [{ slot: '20', en: 'fruits' }, { slot: '21', en: 'bugs' }, { slot: '22', en: 'seaweed' }, { slot: '23', en: 'water' }] }
    ]
  },

  // Unit 11 Part 1: Animals (16 cards) - 4 rows x 4 cols
  {
    unit: 'u11',
    file: 'u11_p11_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'bear' }, { slot: '01', en: 'cat' }, { slot: '02', en: 'chimpanzee' }, { slot: '03', en: 'cow' }] },
      { cols: 4, items: [{ slot: '04', en: 'dog' }, { slot: '05', en: 'elephant' }, { slot: '06', en: 'giraffe' }, { slot: '07', en: 'gorilla' }] },
      { cols: 4, items: [{ slot: '08', en: 'hamster' }, { slot: '09', en: 'hippo' }, { slot: '10', en: 'horse' }, { slot: '11', en: 'kangaroo' }] },
      { cols: 4, items: [{ slot: '12', en: 'koala' }, { slot: '13', en: 'lion' }, { slot: '14', en: 'monkey' }, { slot: '15', en: 'mouse' }] }
    ]
  },

  // Unit 11 Part 2: Animals (12 cards) - 3 rows x 4 cols
  {
    unit: 'u11',
    file: 'u11_p11_2.png',
    rows: [
      { cols: 4, items: [{ slot: '16', en: 'orangutan' }, { slot: '17', en: 'panda' }, { slot: '18', en: 'pig' }, { slot: '19', en: 'polar_bear' }] },
      { cols: 4, items: [{ slot: '20', en: 'rabbit' }, { slot: '21', en: 'red_panda' }, { slot: '22', en: 'tiger' }, { slot: '23', en: 'zebra' }] },
      { cols: 4, items: [{ slot: '24', en: 'bird' }, { slot: '25', en: 'eagle' }, { slot: '26', en: 'owl' }, { slot: '27', en: 'penguin' }] }
    ]
  },

  // Unit 11 Part 3: Animals (11 cards) - 3 rows x 4 cols
  {
    unit: 'u11',
    file: 'u11_p11_3.png',
    rows: [
      { cols: 4, items: [{ slot: '28', en: 'caterpillar' }, { slot: '29', en: 'grasshopper' }, { slot: '30', en: 'frog' }, { slot: '31', en: 'dolphin' }] },
      { cols: 4, items: [{ slot: '32', en: 'dugong' }, { slot: '33', en: 'fish' }, { slot: '34', en: 'jellyfish' }, { slot: '35', en: 'sea_turtle' }] },
      { cols: 4, items: [{ slot: '36', en: 'seal' }, { slot: '37', en: 'shark' }, { slot: '38', en: 'whale' }] }
    ]
  },

  // Unit 12: Body & Features (15 cards) - Targeted Diagram Callout Regions
  {
    unit: 'u12',
    file: 'u11_p12.png',
    isCustomRegions: true,
    items: [
      { slot: '00', en: 'head', box: { left: 130, top: 35, width: 330, height: 110 } },
      { slot: '01', en: 'neck', box: { left: 30, top: 110, width: 250, height: 85 } },
      { slot: '02', en: 'shoulder', box: { left: 210, top: 130, width: 280, height: 85 } },
      { slot: '03', en: 'hand', box: { left: 240, top: 230, width: 240, height: 110 } },
      { slot: '04', en: 'leg', box: { left: 30, top: 230, width: 230, height: 140 } },
      { slot: '05', en: 'ear', box: { left: 690, top: 30, width: 240, height: 110 } },
      { slot: '06', en: 'eye', box: { left: 540, top: 105, width: 220, height: 85 } },
      { slot: '07', en: 'nose', box: { left: 520, top: 180, width: 240, height: 75 } },
      { slot: '08', en: 'mouth', box: { left: 520, top: 255, width: 260, height: 80 } },
      { slot: '09', en: 'tail', box: { left: 780, top: 75, width: 260, height: 95 } },
      { slot: '10', en: 'fur', box: { left: 770, top: 170, width: 280, height: 95 } },
      { slot: '11', en: 'wing', box: { left: 50, top: 385, width: 310, height: 95 } },
      { slot: '12', en: 'feather', box: { left: 50, top: 465, width: 340, height: 85 } },
      { slot: '13', en: 'shell', box: { left: 400, top: 405, width: 330, height: 115 } },
      { slot: '14', en: 'horn', box: { left: 740, top: 385, width: 310, height: 145 } }
    ]
  },

  // Unit 13: Clubs & School Life (15 cards) - 4 rows x 4 cols
  {
    unit: 'u13',
    file: 'u11_p13.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'baseball_team' }, { slot: '01', en: 'basketball_team' }, { slot: '02', en: 'volleyball_team' }, { slot: '03', en: 'soccer_team' }] },
      { cols: 4, items: [{ slot: '04', en: 'tennis_team' }, { slot: '05', en: 'track_team' }, { slot: '06', en: 'art_club' }, { slot: '07', en: 'computer_club' }] },
      { cols: 4, items: [{ slot: '08', en: 'drama_club' }, { slot: '09', en: 'dance_club' }, { slot: '10', en: 'kendo_club' }, { slot: '11', en: 'newspaper_club' }] },
      { cols: 4, items: [{ slot: '12', en: 'science_club' }, { slot: '13', en: 'brass_band' }, { slot: '14', en: 'chorus' }] }
    ]
  },

  // Unit 14: School Subjects (11 cards) - 3 rows: 4 cols, 4 cols, 3 cols!
  {
    unit: 'u14',
    file: 'u11_p14.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'Japanese' }, { slot: '01', en: 'English' }, { slot: '02', en: 'math' }, { slot: '03', en: 'science' }] },
      { cols: 4, items: [{ slot: '04', en: 'social_studies' }, { slot: '05', en: 'music' }, { slot: '06', en: 'P.E.' }, { slot: '07', en: 'calligraphy' }] },
      { cols: 3, items: [{ slot: '08', en: 'arts_and_crafts' }, { slot: '09', en: 'home_economics' }, { slot: '10', en: 'moral_education' }] }
    ]
  },

  // Unit 15 Part 1: Jobs (12 cards) - 3 rows x 4 cols
  {
    unit: 'u15',
    file: 'u11_p15_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'actor' }, { slot: '01', en: 'voice_actor' }, { slot: '02', en: 'artist' }, { slot: '03', en: 'manga_artist' }] },
      { cols: 4, items: [{ slot: '04', en: 'baseball_player' }, { slot: '05', en: 'soccer_player' }, { slot: '06', en: 'teacher' }, { slot: '07', en: 'nursery_teacher' }] },
      { cols: 4, items: [{ slot: '08', en: 'journalist' }, { slot: '09', en: 'chef' }, { slot: '10', en: 'farmer' }, { slot: '11', en: 'florist' }] }
    ]
  },

  // Unit 15 Part 2: Jobs (11 cards) - 3 rows x 4 cols
  {
    unit: 'u15',
    file: 'u11_p15_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'hair_stylist' }, { slot: '13', en: 'designer' }, { slot: '14', en: 'robot_creator' }, { slot: '15', en: 'pharmacist' }] },
      { cols: 4, items: [{ slot: '16', en: 'vet' }, { slot: '17', en: 'dentist' }, { slot: '18', en: 'nurse' }, { slot: '19', en: 'doctor' }] },
      { cols: 4, items: [{ slot: '20', en: 'astronaut' }, { slot: '21', en: 'firefighter' }, { slot: '22', en: 'zookeeper' }] }
    ]
  },

  // Unit 16: Events & Ceremonies (11 cards) - 4 rows x 3 cols!
  {
    unit: 'u16',
    file: 'u11_p16.png',
    rows: [
      { cols: 3, items: [{ slot: '00', en: 'entrance_ceremony' }, { slot: '01', en: 'art_festival' }, { slot: '02', en: 'drama_festival' }] },
      { cols: 3, items: [{ slot: '03', en: 'music_festival' }, { slot: '04', en: 'sports_day' }, { slot: '05', en: 'volunteer_day' }] },
      { cols: 3, items: [{ slot: '06', en: 'camping_trip' }, { slot: '07', en: 'field_trip' }, { slot: '08', en: 'school_trip' }] },
      { cols: 3, items: [{ slot: '09', en: 'swimming_meet' }, { slot: '10', en: 'graduation_ceremony' }] }
    ]
  },

  // Unit 17: Adjectives (11 cards) - 3 rows x 4 cols
  {
    unit: 'u17',
    file: 'u11_p18.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'big' }, { slot: '01', en: 'small' }, { slot: '02', en: 'old' }, { slot: '03', en: 'new' }] },
      { cols: 4, items: [{ slot: '04', en: 'long' }, { slot: '05', en: 'short' }, { slot: '06', en: 'cool' }, { slot: '07', en: 'beautiful' }] },
      { cols: 4, items: [{ slot: '08', en: 'cute' }, { slot: '09', en: 'popular' }, { slot: '10', en: 'fresh' }] }
    ]
  },

  // Unit 18: Impressions (7 cards) - 2 rows x 4 cols
  {
    unit: 'u18',
    file: 'u11_p19.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'nice' }, { slot: '01', en: 'good' }, { slot: '02', en: 'great' }, { slot: '03', en: 'wonderful' }] },
      { cols: 4, items: [{ slot: '04', en: 'fun' }, { slot: '05', en: 'exciting' }, { slot: '06', en: 'interesting' }] }
    ]
  },

  // Unit 19 Part 1: Numbers 0 to 20 (20 cards) - Floating Cards on Teal Sheet
  {
    unit: 'u19',
    file: 'u11_p20_1.png',
    isCustomRegions: true,
    items: [
      { slot: '00', en: 'zero', box: { left: 875, top: 22, width: 215, height: 60 }, badge: { left: 881, top: 25, width: 34, height: 36 } },
      { slot: '01', en: 'one', box: { left: 12, top: 104, width: 212, height: 57 }, badge: { left: 16, top: 108, width: 34, height: 36 } },
      { slot: '02', en: 'two', box: { left: 228, top: 104, width: 212, height: 57 }, badge: { left: 232, top: 108, width: 34, height: 36 } },
      { slot: '03', en: 'three', box: { left: 444, top: 104, width: 212, height: 57 }, badge: { left: 448, top: 108, width: 34, height: 36 } },
      { slot: '04', en: 'four', box: { left: 660, top: 104, width: 212, height: 57 }, badge: { left: 664, top: 108, width: 34, height: 36 } },
      { slot: '05', en: 'five', box: { left: 876, top: 104, width: 212, height: 57 }, badge: { left: 881, top: 108, width: 34, height: 36 } },
      { slot: '06', en: 'six', box: { left: 12, top: 185, width: 212, height: 57 }, badge: { left: 16, top: 189, width: 34, height: 35 } },
      { slot: '07', en: 'seven', box: { left: 228, top: 185, width: 212, height: 57 }, badge: { left: 232, top: 189, width: 34, height: 35 } },
      { slot: '08', en: 'eight', box: { left: 444, top: 185, width: 212, height: 57 }, badge: { left: 448, top: 189, width: 34, height: 35 } },
      { slot: '09', en: 'nine', box: { left: 660, top: 185, width: 212, height: 57 }, badge: { left: 664, top: 189, width: 34, height: 35 } },
      { slot: '10', en: 'ten', box: { left: 876, top: 185, width: 212, height: 57 }, badge: { left: 881, top: 189, width: 34, height: 35 } },
      { slot: '11', en: 'eleven', box: { left: 12, top: 305, width: 260, height: 57 }, badge: { left: 16, top: 309, width: 34, height: 35 } },
      { slot: '12', en: 'twelve', box: { left: 283, top: 305, width: 260, height: 57 }, badge: { left: 287, top: 309, width: 34, height: 35 } },
      { slot: '13', en: 'thirteen', box: { left: 553, top: 305, width: 260, height: 57 }, badge: { left: 557, top: 309, width: 34, height: 35 } },
      { slot: '14', en: 'fourteen', box: { left: 824, top: 305, width: 260, height: 57 }, badge: { left: 828, top: 309, width: 34, height: 35 } },
      { slot: '15', en: 'fifteen', box: { left: 12, top: 389, width: 260, height: 57 }, badge: { left: 16, top: 393, width: 34, height: 35 } },
      { slot: '16', en: 'sixteen', box: { left: 283, top: 389, width: 260, height: 57 }, badge: { left: 287, top: 393, width: 34, height: 35 } },
      { slot: '17', en: 'seventeen', box: { left: 553, top: 389, width: 260, height: 57 }, badge: { left: 557, top: 393, width: 34, height: 35 } },
      { slot: '18', en: 'eighteen', box: { left: 824, top: 389, width: 260, height: 57 }, badge: { left: 828, top: 393, width: 34, height: 35 } },
      { slot: '19', en: 'nineteen', box: { left: 12, top: 473, width: 260, height: 57 }, badge: { left: 16, top: 477, width: 34, height: 35 } },
      { slot: '20', en: 'twenty', box: { left: 283, top: 473, width: 260, height: 57 }, badge: { left: 287, top: 477, width: 34, height: 35 } }
    ]
  },

  // Unit 19 Part 2: Numbers 21 to 200 (20 cards) - Floating Cards on Teal Sheet
  {
    unit: 'u19',
    file: 'u11_p20_2.png',
    isCustomRegions: true,
    items: [
      { slot: '21', en: 'twenty-one', box: { left: 12, top: 16, width: 260, height: 57 }, badge: { left: 16, top: 20, width: 34, height: 36 } },
      { slot: '22', en: 'twenty-two', box: { left: 282, top: 16, width: 260, height: 57 }, badge: { left: 286, top: 20, width: 35, height: 36 } },
      { slot: '23', en: 'twenty-three', box: { left: 553, top: 16, width: 260, height: 57 }, badge: { left: 557, top: 20, width: 34, height: 36 } },
      { slot: '24', en: 'twenty-four', box: { left: 823, top: 16, width: 260, height: 57 }, badge: { left: 827, top: 20, width: 34, height: 36 } },
      { slot: '25', en: 'twenty-five', box: { left: 12, top: 100, width: 260, height: 57 }, badge: { left: 16, top: 104, width: 34, height: 35 } },
      { slot: '26', en: 'twenty-six', box: { left: 282, top: 100, width: 260, height: 57 }, badge: { left: 286, top: 104, width: 35, height: 35 } },
      { slot: '27', en: 'twenty-seven', box: { left: 553, top: 100, width: 260, height: 57 }, badge: { left: 557, top: 104, width: 34, height: 35 } },
      { slot: '28', en: 'twenty-eight', box: { left: 823, top: 100, width: 260, height: 57 }, badge: { left: 827, top: 104, width: 34, height: 35 } },
      { slot: '29', en: 'twenty-nine', box: { left: 12, top: 184, width: 260, height: 57 }, badge: { left: 16, top: 188, width: 34, height: 35 } },
      { slot: '30', en: 'thirty', box: { left: 282, top: 184, width: 260, height: 57 }, badge: { left: 286, top: 188, width: 35, height: 35 } },
      { slot: '31', en: 'forty', box: { left: 12, top: 298, width: 260, height: 57 }, badge: { left: 16, top: 302, width: 34, height: 35 } },
      { slot: '32', en: 'fifty', box: { left: 282, top: 298, width: 260, height: 57 }, badge: { left: 286, top: 302, width: 35, height: 35 } },
      { slot: '33', en: 'sixty', box: { left: 553, top: 298, width: 260, height: 57 }, badge: { left: 557, top: 302, width: 34, height: 35 } },
      { slot: '34', en: 'seventy', box: { left: 823, top: 298, width: 260, height: 57 }, badge: { left: 827, top: 302, width: 34, height: 35 } },
      { slot: '35', en: 'eighty', box: { left: 12, top: 382, width: 260, height: 57 }, badge: { left: 16, top: 386, width: 34, height: 35 } },
      { slot: '36', en: 'ninety', box: { left: 282, top: 382, width: 260, height: 57 }, badge: { left: 286, top: 386, width: 35, height: 35 } },
      { slot: '37', en: 'one_hundred', box: { left: 553, top: 382, width: 260, height: 57 }, badge: { left: 557, top: 386, width: 34, height: 35 } },
      { slot: '38', en: 'one_hundred_and_one', box: { left: 12, top: 503, width: 430, height: 57 }, badge: { left: 16, top: 507, width: 34, height: 35 } },
      { slot: '39', en: 'two_hundred', box: { left: 12, top: 587, width: 280, height: 57 }, badge: { left: 16, top: 591, width: 34, height: 35 } }
    ]
  }
];

async function createWhitePatch(w, h) {
  return await sharp({
    create: {
      width: Math.max(1, Math.round(w)),
      height: Math.max(1, Math.round(h)),
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
}

/**
 * =============================================================================
 * STAGE 1: Extract Raw Card Cells (Row-Partitioned Architecture)
 * =============================================================================
 */
async function runStage1() {
  console.log('\n--- STAGE 1: Extracting Raw Card Cells (Row-Partitioned) ---');
  let count = 0;

  for (const sheet of G6_SHEETS) {
    const sheetPath = path.join(MASTER_DIR, sheet.file);
    if (!fs.existsSync(sheetPath)) {
      console.warn(`  ⚠️ Missing sheet: ${sheet.file}`);
      continue;
    }

    const meta = await sharp(sheetPath).metadata();

    if (sheet.isCustomRegions) {
      // Custom Regions (Unit 12 Diagram Callouts and Unit 19 Floating Number Cards)
      for (const item of sheet.items) {
        const outName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_cell.png`;
        const outPath = path.join(STAGE1_DIR, outName);

        await sharp(sheetPath)
          .extract(item.box)
          .png()
          .toFile(outPath);

        count++;
      }
      console.log(`  ✓ Stage 1 extracted [${sheet.unit}] ${sheet.file} (${sheet.items.length} custom regions)`);
      continue;
    }

    const numRows = sheet.rows.length;
    const rawRowH = meta.height / numRows;
    const borderInsetX = sheet.borderInsetX !== undefined ? sheet.borderInsetX : 14;

    for (let r = 0; r < numRows; r++) {
      const rowDef = sheet.rows[r];

      // Row-Adaptive Insets to protect hair and borders
      let insetTop = rowDef.insetTop !== undefined ? rowDef.insetTop : 10;
      let insetBottom = 10;

      if (rowDef.insetTop === undefined && numRows > 1) {
        if (r === 0) {
          insetTop = 12; // Clears top outer border
        } else if (r === numRows - 1) {
          insetTop = 6;  // Pulls crop UP to protect hair on bottom row!
          insetBottom = 14;
        } else {
          insetTop = 9;
        }
      }

      if (sheet.isFrequency) {
        insetTop = 3;
        insetBottom = 3;
      }

      const top = Math.min(meta.height - 30, Math.round(r * rawRowH) + insetTop);
      const cellH = Math.max(30, Math.round(rawRowH - insetTop - insetBottom));

      const weights = rowDef.colWeights || Array(rowDef.cols || 1).fill(1);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      let currentX = 0;
      for (let c = 0; c < rowDef.items.length; c++) {
        const item = rowDef.items[c];
        const colW = (weights[c] / totalWeight) * meta.width;

        const left = Math.min(meta.width - 30, Math.round(currentX) + borderInsetX);
        const cellW = Math.max(30, Math.round(colW - (borderInsetX * 2)));

        currentX += colW;

        if (!item || !item.en) continue;

        const outName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_cell.png`;
        const outPath = path.join(STAGE1_DIR, outName);

        await sharp(sheetPath)
          .extract({ left, top, width: cellW, height: cellH })
          .png()
          .toFile(outPath);

        count++;
      }
    }
    console.log(`  ✓ Stage 1 extracted [${sheet.unit}] ${sheet.file}`);
  }
  console.log(`✅ Stage 1 Complete: ${count} raw card cells extracted.\n`);
}

/**
 * =============================================================================
 * STAGE 2: Smart Chroma Detection & Targeted Paw Eradication
 * =============================================================================
 */
async function runStage2() {
  console.log('\n--- STAGE 2: Eliminating Paw Watermark Badges (Smart Chroma) ---');
  let wipedCount = 0;
  let totalCount = 0;

  for (const sheet of G6_SHEETS) {
    const items = sheet.isCustomRegions ? sheet.items : sheet.rows.flatMap(r => r.items);

    for (const item of items) {
      if (!item || !item.en) continue;

      const inName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_cell.png`;
      const inPath = path.join(STAGE1_DIR, inName);
      if (!fs.existsSync(inPath)) continue;

      const outName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_unwatermarked.png`;
      const outPath = path.join(STAGE2_DIR, outName);

      const { data, info } = await sharp(inPath).raw().toBuffer({ resolveWithObject: true });

      // Scan for paw pixels
      // On side-by-side cards (Unit 8, Unit 9 rows 2-3), paw sits at top-right of illustration (x: 130 to 170)
      // On standard cards, paw sits at top-right of cell (x: info.width - 50 to info.width)
      let pawPixels = 0;
      let patchLeft = 0;
      let patchTop = 0;
      let patchW = 36;
      let patchH = 46;

      const isSideBySide = sheet.isSideBySide || (sheet.rows && sheet.rows.some(r => r.isSideBySide));

      if (isSideBySide) {
        // Scan around illustration corner (x: 110 to 170)
        const scanXStart = Math.min(110, info.width - 40);
        const scanXEnd = Math.min(175, info.width);
        for (let y = 0; y < 45; y++) {
          for (let x = scanXStart; x < scanXEnd; x++) {
            if (x >= info.width || y >= info.height) continue;
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const isOrange = (r > 200 && g > 110 && g < 195 && b < 70);
            const isPurple = (b > 175 && b > r + 10 && b > g + 25 && r > 135);
            if (isOrange || isPurple) pawPixels++;
          }
        }
        if (pawPixels > 30) {
          patchLeft = 135;
          patchTop = 0;
          patchW = 36;
          patchH = 44;
        }
      }

      // Also check standard top-right corner if not detected yet
      if (pawPixels <= 30) {
        pawPixels = 0;
        const scanW = Math.min(50, info.width);
        for (let y = 0; y < 50; y++) {
          for (let x = info.width - scanW; x < info.width; x++) {
            if (x >= info.width || y >= info.height) continue;
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            const isOrange = (r > 200 && g > 110 && g < 195 && b < 70);
            const isPurple = (b > 175 && b > r + 10 && b > g + 25 && r > 135);
            if (isOrange || isPurple) pawPixels++;
          }
        }
        if (pawPixels > 30) {
          patchLeft = info.width - 36;
          patchTop = 0;
          patchW = 36;
          patchH = 46;
        }
      }

      let pipeline = sharp(inPath);
      if (pawPixels > 30) {
        const patchBuf = await createWhitePatch(patchW, patchH);
        pipeline = pipeline.composite([{ input: patchBuf, left: Math.max(0, patchLeft), top: Math.max(0, patchTop) }]);
        wipedCount++;
      }

      await pipeline.png().toFile(outPath);
      totalCount++;
    }
  }
  console.log(`✅ Stage 2 Complete: ${totalCount} cards checked, ${wipedCount} paw watermarks cleanly erased.\n`);
}

/**
 * =============================================================================
 * DYNAMIC COMPUTER VISION FLOOR DETECTOR
 * Scans downward for the thin neutral gray or blue guideline on white paper.
 * =============================================================================
 */
function detectIllustrationFloor(data, info) {
  const scanStartY = Math.round(info.height * 0.38);
  const scanEndY = Math.round(info.height * 0.88);
  const minLinePixels = Math.round((info.width - 40) * 0.40);

  for (let y = scanStartY; y < scanEndY; y++) {
    let linePixels = 0;
    for (let x = 20; x < info.width - 20; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      const isGray = (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r < 215 && r > 50);
      const isBlue = (b > 175 && b > r + 30);

      if (isGray || isBlue) {
        const aboveIdx = ((y - 3) * info.width + x) * info.channels;
        const ar = data[aboveIdx], ag = data[aboveIdx+1], ab = data[aboveIdx+2];
        if (ar > 235 && ag > 235 && ab > 235) {
          linePixels++;
        }
      }
    }
    if (linePixels >= minLinePixels) {
      return Math.max(30, y - 4);
    }
  }
  return Math.round(info.height * 0.68);
}

/**
 * =============================================================================
 * STAGE 3: Crop Illustration Artwork & Whitespace Trim (Dynamic Floor)
 * =============================================================================
 */
async function runStage3() {
  console.log('\n--- STAGE 3: Cropping Illustration & Whitespace Trim (Dynamic Floor) ---');
  let count = 0;

  for (const sheet of G6_SHEETS) {
    const items = sheet.isCustomRegions ? sheet.items : sheet.rows.flatMap(r => r.items);

    for (const item of items) {
      if (!item || !item.en) continue;

      const inName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_unwatermarked.png`;
      const inPath = path.join(STAGE2_DIR, inName);
      if (!fs.existsSync(inPath)) continue;

      const outName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_trimmed.png`;
      const outPath = path.join(STAGE3_DIR, outName);

      const meta = await sharp(inPath).metadata();

      let extractRegion;
      if (sheet.unit === 'u19' && item.badge) {
        // Unit 19 Numbers: Illustration is the number badge itself!
        // Relative to the card box:
        const relLeft = Math.max(0, item.badge.left - item.box.left);
        const relTop = Math.max(0, item.badge.top - item.box.top);
        extractRegion = {
          left: relLeft,
          top: relTop,
          width: Math.min(item.badge.width, meta.width - relLeft),
          height: Math.min(item.badge.height, meta.height - relTop)
        };
      } else if (sheet.unit === 'u12') {
        // Unit 12 Body Callouts: Keep the full callout diagram cell
        extractRegion = {
          left: 0,
          top: 0,
          width: meta.width,
          height: meta.height
        };
      } else if (sheet.isSideBySide || item.slot === '20' || item.slot === '21' || item.slot === '22' || item.slot === '23') {
        // Side-by-side (Unit 8, Unit 9 rows 2-3): Artwork is isolated on the left
        extractRegion = {
          left: 10,
          top: 4,
          width: 152,
          height: Math.max(30, meta.height - 8)
        };
      } else if (sheet.isDaysOfWeek) {
        // Unit 7 Days of the week: Calendar icon is on the left
        extractRegion = {
          left: 10,
          top: 4,
          width: 128,
          height: Math.max(30, meta.height - 8)
        };
      } else if (sheet.isFrequency) {
        // Unit 7 Frequency Adverbs: Calendar spans middle
        extractRegion = {
          left: 175,
          top: 2,
          width: Math.max(30, meta.width - 180),
          height: Math.max(30, meta.height - 4)
        };
      } else {
        // Standard Cards: Dynamic floor detection crops strictly above guidelines
        const { data, info } = await sharp(inPath).raw().toBuffer({ resolveWithObject: true });
        const floorY = detectIllustrationFloor(data, info);
        extractRegion = {
          left: 0,
          top: 0,
          width: meta.width,
          height: floorY
        };
      }

      const croppedBuf = await sharp(inPath)
        .extract(extractRegion)
        .png()
        .toBuffer();

      // Auto-trim excess whitespace and add uniform 10-12px framing
      await sharp(croppedBuf)
        .trim({ background: '#ffffff', threshold: 18 })
        .extend({
          top: 10,
          bottom: 10,
          left: 12,
          right: 12,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outPath);

      count++;
    }
  }
  console.log(`✅ Stage 3 Complete: ${count} illustrations trimmed with uniform padding.\n`);
}

/**
 * =============================================================================
 * STAGE 4: 4x Ultra-DPI Super-Sampling & Production Asset Deployment
 * =============================================================================
 */
async function runStage4() {
  console.log(`\n--- STAGE 4: ${SCALE}x Ultra-DPI Super-Sampling & Production Export ---`);
  let illustCount = 0;
  let fullCount = 0;

  for (const sheet of G6_SHEETS) {
    const items = sheet.isCustomRegions ? sheet.items : sheet.rows.flatMap(r => r.items);

    for (const item of items) {
      if (!item || !item.en) continue;

      // 1. Production Illustration Card (4x Lanczos3 + Line-Art Sharpen)
      const trimmedName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_trimmed.png`;
      const trimmedPath = path.join(STAGE3_DIR, trimmedName);

      if (fs.existsSync(trimmedPath)) {
        const prodIllustName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_illust.png`;
        const prodIllustPath = path.join(OUT_ILLUST_DIR, prodIllustName);

        const tm = await sharp(trimmedPath).metadata();
        const buf4x = await sharp(trimmedPath)
          .resize({ width: tm.width * SCALE, kernel: sharp.kernel.lanczos3 })
          .sharpen({ sigma: 1.4, m1: 0.7, m2: 2.4 })
          .png({ quality: 95 })
          .toBuffer();

        fs.writeFileSync(prodIllustPath, buf4x);
        fs.writeFileSync(path.join(STAGE4_DIR, prodIllustName), buf4x);

        illustCount++;
      }

      // 2. Production Full Card (from Stage 2 clean unwatermarked cell)
      const cleanCellName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_unwatermarked.png`;
      const cleanCellPath = path.join(STAGE2_DIR, cleanCellName);

      if (fs.existsSync(cleanCellPath)) {
        const prodFullName = `hwg6_${sheet.unit}_${item.slot}_${item.en}_full.png`;
        const prodFullPath = path.join(OUT_FULL_DIR, prodFullName);

        const cm = await sharp(cleanCellPath).metadata();
        await sharp(cleanCellPath)
          .resize({ width: cm.width * SCALE, kernel: sharp.kernel.lanczos3 })
          .sharpen({ sigma: 1.2, m1: 0.8, m2: 2.2 })
          .png({ quality: 95 })
          .toFile(prodFullPath);

        fullCount++;
      }
    }
  }

  console.log(`✅ Stage 4 Complete: ${illustCount} illustration assets & ${fullCount} full card assets generated.`);
  console.log(`📁 Production files active at trimmed_assets/cards/`);
}

async function run() {
  const arg = process.argv[2];
  console.log('===================================================================');
  console.log('🚀 LEVI-SENSEI HERE WE GO GRADE 6 MULTI-STAGE ASSET PIPELINE v6.0');
  console.log(`   Scale: ${SCALE}x Super-Sampling (Target ~800-900px, 300 DPI Print / 4K TV)`);
  console.log('===================================================================');

  if (arg === '--step1') {
    await runStage1();
  } else if (arg === '--step2') {
    await runStage2();
  } else if (arg === '--step3') {
    await runStage3();
  } else if (arg === '--step4') {
    await runStage4();
  } else {
    await runStage1();
    await runStage2();
    await runStage3();
    await runStage4();
  }

  console.log('\n===================================================================');
  console.log('🎉 PIPELINE EXECUTION FINISHED SUCCESSFULLY!');
  console.log('===================================================================\n');
}

run();