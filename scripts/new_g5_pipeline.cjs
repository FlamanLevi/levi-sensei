const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * =============================================================================
 * LEVI-SENSEI HERE WE GO GRADE 5 MULTI-STAGE ASSET PIPELINE v6.0
 * =============================================================================
 * Discrete, Verifiable Stages:
 *
 *   STAGE 1: Row-Partitioned Raw Cell Extraction
 *            Extracts each card according to its exact row/col geometry.
 *            Output: manabi_assets/Grade 5 Manabi (new)/_pipeline/step1_raw_cells/
 *
 *   STAGE 2: Smart Chroma Paw Watermark Eradication
 *            Detects orange/purple paw pixels in the top-right corner.
 *            Applies zero patches if no paw is present!
 *            Output: manabi_assets/Grade 5 Manabi (new)/_pipeline/step2_unwatermarked/
 *
 *   STAGE 3: 68% Illustration Crop & Whitespace Trim
 *            Isolates pure artwork (full tables, cones, spoons, feet intact),
 *            auto-trims excess whitespace, and adds clean 10-12px frame padding.
 *            Output: manabi_assets/Grade 5 Manabi (new)/_pipeline/step3_trimmed_illust/
 *
 *   STAGE 4: 4x Ultra-DPI Super-Sampling & Production Asset Deployment
 *            Upscales clean illustrations and full cards at 4x Ultra-DPI
 *            (Lanczos3 + line-art unsharp mask) for 300 DPI print & 4K Front TV.
 *            Output: trimmed_assets/cards/illustration/
 *                    trimmed_assets/cards/full/
 * =============================================================================
 */

const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 5 Manabi (new)');
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
// COMPREHENSIVE GRADE 5 ROW-PARTITIONED MANIFEST
// =============================================================================
const G5_SHEETS = [
  // Unit 1: Feelings (12 cards) - 3 rows x 4 cols
  {
    unit: 'u01',
    file: 'u11_p1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'fine' }, { slot: '01', en: 'happy' }, { slot: '02', en: 'good' }, { slot: '03', en: 'great' }] },
      { cols: 4, items: [{ slot: '04', en: 'sleepy' }, { slot: '05', en: 'tired' }, { slot: '06', en: 'hungry' }, { slot: '07', en: 'thirsty' }] },
      { cols: 4, insetTop: 5, items: [{ slot: '08', en: 'sad' }, { slot: '09', en: 'angry' }, { slot: '10', en: 'excited' }, { slot: '11', en: 'nervous' }] }
    ]
  },

  // Unit 2: Weather (8 cards) - 2 rows x 4 cols
  {
    unit: 'u02',
    file: 'u11_p2.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'sunny' }, { slot: '01', en: 'rainy' }, { slot: '02', en: 'cloudy' }, { slot: '03', en: 'snowy' }] },
      { cols: 4, insetTop: 8, items: [{ slot: '04', en: 'hot' }, { slot: '05', en: 'cold' }, { slot: '06', en: 'warm' }, { slot: '07', en: 'cool' }] }
    ]
  },

  // Unit 3 Part 1: Colors (11 cards) - 3 rows x 4 cols
  {
    unit: 'u03',
    file: 'u11_p3_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'red' }, { slot: '01', en: 'blue' }, { slot: '02', en: 'green' }, { slot: '03', en: 'yellow' }] },
      { cols: 4, items: [{ slot: '04', en: 'pink' }, { slot: '05', en: 'white' }, { slot: '06', en: 'orange' }, { slot: '07', en: 'purple' }] },
      { cols: 4, items: [{ slot: '08', en: 'black' }, { slot: '09', en: 'brown' }, { slot: '10', en: 'gray' }] }
    ]
  },

  // Unit 3 Part 2: Shapes (8 cards) - 2 rows x 4 cols
  {
    unit: 'u03',
    file: 'u11_p3_2.png',
    rows: [
      { cols: 4, items: [{ slot: '11', en: 'circle' }, { slot: '12', en: 'triangle' }, { slot: '13', en: 'cross' }, { slot: '14', en: 'heart' }] },
      { cols: 4, items: [{ slot: '15', en: 'square' }, { slot: '16', en: 'rectangle' }, { slot: '17', en: 'star' }, { slot: '18', en: 'diamond' }] }
    ]
  },

  // Unit 4: Sports (11 cards) - 4 rows x 3 cols
  {
    unit: 'u04',
    file: 'u11_p4.png',
    rows: [
      { cols: 3, items: [{ slot: '00', en: 'baseball' }, { slot: '01', en: 'basketball' }, { slot: '02', en: 'dodgeball' }] },
      { cols: 3, items: [{ slot: '03', en: 'volleyball' }, { slot: '04', en: 'soccer' }, { slot: '05', en: 'swimming' }] },
      { cols: 3, items: [{ slot: '06', en: 'table_tennis' }, { slot: '07', en: 'tennis' }, { slot: '08', en: 'badminton' }] },
      { cols: 3, items: [{ slot: '09', en: 'dancing' }, { slot: '10', en: 'skiing' }] }
    ]
  },

  // Unit 5: Animals (7 cards) - 2 rows x 4 cols
  {
    unit: 'u05',
    file: 'u11_p5.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'cat' }, { slot: '01', en: 'dog' }, { slot: '02', en: 'rabbit' }, { slot: '03', en: 'hamster' }] },
      { cols: 4, items: [{ slot: '04', en: 'tiger' }, { slot: '05', en: 'bear' }, { slot: '06', en: 'horse' }] }
    ]
  },

  // Unit 6 Part 1: Fruits (11 cards) - 3 rows x 4 cols
  {
    unit: 'u06',
    file: 'u11_p6_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'apple' }, { slot: '01', en: 'banana' }, { slot: '02', en: 'strawberry' }, { slot: '03', en: 'grapes' }] },
      { cols: 4, items: [{ slot: '04', en: 'peach' }, { slot: '05', en: 'melon' }, { slot: '06', en: 'pineapple' }, { slot: '07', en: 'persimmon' }] },
      { cols: 4, items: [{ slot: '08', en: 'watermelon' }, { slot: '09', en: 'orange' }, { slot: '10', en: 'japanese_pear' }] }
    ]
  },

  // Unit 6 Part 2: Vegetables (11 cards) - 3 rows x 4 cols
  {
    unit: 'u06',
    file: 'u11_p6_2.png',
    rows: [
      { cols: 4, items: [{ slot: '11', en: 'potato' }, { slot: '12', en: 'carrot' }, { slot: '13', en: 'onion' }, { slot: '14', en: 'cabbage' }] },
      { cols: 4, items: [{ slot: '15', en: 'tomato' }, { slot: '16', en: 'mushroom' }, { slot: '17', en: 'green_pepper' }, { slot: '18', en: 'cucumber' }] },
      { cols: 4, items: [{ slot: '19', en: 'corn' }, { slot: '20', en: 'spinach' }, { slot: '21', en: 'eggplant' }] }
    ]
  },

  // Unit 7: Meat & Seafood (12 cards) - 3 rows x 4 cols
  {
    unit: 'u07',
    file: 'u11_p7.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'beef' }, { slot: '01', en: 'pork' }, { slot: '02', en: 'chicken' }, { slot: '03', en: 'egg' }] },
      { cols: 4, items: [{ slot: '04', en: 'cheese' }, { slot: '05', en: 'bacon' }, { slot: '06', en: 'octopus' }, { slot: '07', en: 'crab' }] },
      { cols: 4, items: [{ slot: '08', en: 'squid' }, { slot: '09', en: 'seaweed' }, { slot: '10', en: 'shrimp' }, { slot: '11', en: 'salmon' }] }
    ]
  },

  // Unit 8 Part 1: Food & Dishes (12 cards) - 3 rows x 4 cols
  {
    unit: 'u08',
    file: 'u11_p8_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'pizza' }, { slot: '01', en: 'steak' }, { slot: '02', en: 'hamburger' }, { slot: '03', en: 'spaghetti' }] },
      { cols: 4, items: [{ slot: '04', en: 'sandwich' }, { slot: '05', en: 'french_fries' }, { slot: '06', en: 'omelet' }, { slot: '07', en: 'rice' }] },
      { cols: 4, items: [{ slot: '08', en: 'rice_ball' }, { slot: '09', en: 'curry_and_rice' }, { slot: '10', en: 'rice_cake' }, { slot: '11', en: 'fried_rice' }] }
    ]
  },

  // Unit 8 Part 2: Dishes 2 (10 cards) - 3 rows x 4 cols
  {
    unit: 'u08',
    file: 'u11_p8_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'fried_chicken' }, { slot: '13', en: 'grilled_fish' }, { slot: '14', en: 'miso_soup' }, { slot: '15', en: 'noodles' }] },
      { cols: 4, items: [{ slot: '16', en: 'soup' }, { slot: '17', en: 'salad' }, { slot: '18', en: 'bread' }, { slot: '19', en: 'sausage' }] },
      { cols: 4, items: [{ slot: '20', en: 'ramen' }, { slot: '21', en: 'hot_pot' }] }
    ]
  },

  // Unit 9: Drinks & Desserts (11 cards) - 3 rows x 4 cols
  {
    unit: 'u09',
    file: 'u11_p9.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'milk' }, { slot: '01', en: 'orange_juice' }, { slot: '02', en: 'soda' }, { slot: '03', en: 'tea' }] },
      { cols: 4, items: [{ slot: '04', en: 'green_tea' }, { slot: '05', en: 'coffee' }, { slot: '06', en: 'water' }, { slot: '07', en: 'cake' }] },
      { cols: 4, items: [{ slot: '08', en: 'ice_cream' }, { slot: '09', en: 'pudding' }, { slot: '10', en: 'yogurt' }] }
    ]
  },

  // Unit 10: Taste Adjectives (8 cards) - 2 rows x 4 cols
  {
    unit: 'u10',
    file: 'u11_p10.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'delicious' }, { slot: '01', en: 'sweet' }, { slot: '02', en: 'bitter' }, { slot: '03', en: 'sour' }] },
      { cols: 4, items: [{ slot: '04', en: 'salty' }, { slot: '05', en: 'spicy' }, { slot: '06', en: 'soft' }, { slot: '07', en: 'hard' }] }
    ]
  },

  // Unit 11: Months (12 cards) - 3 rows x 4 cols
  {
    unit: 'u11',
    file: 'u11_p11_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'january' }, { slot: '01', en: 'february' }, { slot: '02', en: 'march' }, { slot: '03', en: 'april' }] },
      { cols: 4, items: [{ slot: '04', en: 'may' }, { slot: '05', en: 'june' }, { slot: '06', en: 'july' }, { slot: '07', en: 'august' }] },
      { cols: 4, items: [{ slot: '08', en: 'september' }, { slot: '09', en: 'october' }, { slot: '10', en: 'november' }, { slot: '11', en: 'december' }] }
    ]
  },

  // Unit 11: Days of the Week (7 cards) - 2 rows x 4 cols
  {
    unit: 'u11',
    file: 'u11_p11_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'sunday' }, { slot: '13', en: 'monday' }, { slot: '14', en: 'tuesday' }, { slot: '15', en: 'wednesday' }] },
      { cols: 4, items: [{ slot: '16', en: 'thursday' }, { slot: '17', en: 'friday' }, { slot: '18', en: 'saturday' }] }
    ]
  },

  // Unit 12 Part 1: Stationery & Items (22 cards) - Asymmetric 5-to-6 columns!
  {
    unit: 'u12',
    file: 'u11_p12_1.png',
    rows: [
      { colWeights: [1, 1, 1, 1.5, 1.5], items: [{ slot: '00', en: 'pen' }, { slot: '01', en: 'pencil' }, { slot: '02', en: 'eraser' }, { slot: '03', en: 'pencil_case' }, { slot: '04', en: 'computer' }] },
      { colWeights: [1.5, 1, 1, 1, 1.5], items: [{ slot: '05', en: 'tablet' }, { slot: '06', en: 'glue' }, { slot: '07', en: 'ruler' }, { slot: '08', en: 'scissors' }, { slot: '09', en: 'notebook' }] },
      { cols: 6, items: [{ slot: '10', en: 'card' }, { slot: '11', en: 'cup' }, { slot: '12', en: 'clock' }, { slot: '13', en: 'watch' }, { slot: '14', en: 'ball' }, { slot: '15', en: 'racket' }] },
      { cols: 6, items: [{ slot: '16', en: 'bed' }, { slot: '17', en: 'desk' }, { slot: '18', en: 'chair' }, { slot: '19', en: 'cap' }, { slot: '20', en: 'hat' }, { slot: '21', en: 'shoes' }] }
    ]
  },

  // Unit 12 Part 2: Clothes & Personal Items (8 cards) - 2 rows x 5 cols
  {
    unit: 'u12',
    file: 'u11_p12_2.png',
    rows: [
      { cols: 5, items: [{ slot: '22', en: 'pants' }, { slot: '23', en: 'glasses' }, { slot: '24', en: 'bag' }, { slot: '25', en: 't_shirt' }, { slot: '26', en: 'sweater' }] },
      { cols: 5, items: [{ slot: '27', en: 'smartphone' }, { slot: '28', en: 'calendar' }, { slot: '29', en: 'balloon' }] }
    ]
  },

  // Unit 14: School Subjects (11 cards) - Asymmetric 4-3-1 cols
  {
    unit: 'u14',
    file: 'u11_p14.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'japanese' }, { slot: '01', en: 'english' }, { slot: '02', en: 'math' }, { slot: '03', en: 'science' }] },
      { cols: 4, items: [{ slot: '04', en: 'social_studies' }, { slot: '05', en: 'music' }, { slot: '06', en: 'pe' }, { slot: '07', en: 'calligraphy' }] },
      { cols: 3, items: [{ slot: '08', en: 'arts_and_crafts' }, { slot: '09', en: 'home_economics' }, { slot: '10', en: 'moral_education' }] },
      { colWeights: [1.8, 2.2], items: [{ slot: '11', en: 'the_period_for_integrated_study' }] }
    ]
  },

  // Unit 15 Part 1: Activities (11 cards) - Asymmetric 4-4-3 cols
  {
    unit: 'u15',
    file: 'u11_p15_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'sing_well' }, { slot: '01', en: 'cook' }, { slot: '02', en: 'swim' }, { slot: '03', en: 'run_fast' }] },
      { cols: 4, items: [{ slot: '04', en: 'dance' }, { slot: '05', en: 'jump_rope' }, { slot: '06', en: 'do_kendama' }, { slot: '07', en: 'play_soccer' }] },
      { cols: 3, items: [{ slot: '08', en: 'play_basketball' }, { slot: '09', en: 'play_baseball' }, { slot: '10', en: 'play_volleyball' }] }
    ]
  },

  // Unit 15 Part 2: Activities 2 (8 cards) - 3 rows x 3 cols
  {
    unit: 'u15',
    file: 'u11_p15_2.png',
    rows: [
      { cols: 3, items: [{ slot: '11', en: 'play_table_tennis' }, { slot: '12', en: 'play_dodgeball' }, { slot: '13', en: 'play_badminton' }] },
      { cols: 3, items: [{ slot: '14', en: 'play_the_piano' }, { slot: '15', en: 'play_the_recorder' }, { slot: '16', en: 'play_the_guitar' }] },
      { cols: 3, items: [{ slot: '17', en: 'draw_pictures' }, { slot: '18', en: 'ride_a_unicycle' }] }
    ]
  },

  // Unit 16: Family & People (9 cards) - 3 rows x 4 cols
  {
    unit: 'u16',
    file: 'u11_p16.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'grandmother' }, { slot: '01', en: 'grandfather' }, { slot: '02', en: 'mother' }, { slot: '03', en: 'father' }] },
      { cols: 4, items: [{ slot: '04', en: 'brother' }, { slot: '05', en: 'sister' }, { slot: '06', en: 'me' }, { slot: '07', en: 'friend' }] },
      { cols: 4, items: [{ slot: '08', en: 'neighbor' }] }
    ]
  },

  // Unit 17 Part 1: Occupations 1 (12 cards) - 3 rows x 4 cols
  {
    unit: 'u17',
    file: 'u11_p17_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'actor' }, { slot: '01', en: 'comedian' }, { slot: '02', en: 'singer' }, { slot: '03', en: 'artist' }] },
      { cols: 4, items: [{ slot: '04', en: 'athlete' }, { slot: '05', en: 'baseball_player' }, { slot: '06', en: 'tennis_player' }, { slot: '07', en: 'figure_skater' }] },
      { cols: 4, items: [{ slot: '08', en: 'chef' }, { slot: '09', en: 'baker' }, { slot: '10', en: 'farmer' }, { slot: '11', en: 'florist' }] }
    ]
  },

  // Unit 17 Part 2: Occupations 2 (11 cards) - 3 rows x 4 cols
  {
    unit: 'u17',
    file: 'u11_p17_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'teacher' }, { slot: '13', en: 'journalist' }, { slot: '14', en: 'designer' }, { slot: '15', en: 'robot_creator' }] },
      { cols: 4, items: [{ slot: '16', en: 'vet' }, { slot: '17', en: 'dentist' }, { slot: '18', en: 'nurse' }, { slot: '19', en: 'doctor' }] },
      { cols: 4, items: [{ slot: '20', en: 'astronaut' }, { slot: '21', en: 'firefighter' }, { slot: '22', en: 'zookeeper' }] }
    ]
  },

  // Unit 18: Personality Traits (11 cards) - 3 rows x 4 cols
  {
    unit: 'u18',
    file: 'u11_p18.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'active' }, { slot: '01', en: 'brave' }, { slot: '02', en: 'cool' }, { slot: '03', en: 'famous' }] },
      { cols: 4, items: [{ slot: '04', en: 'friendly' }, { slot: '05', en: 'kind' }, { slot: '06', en: 'strong' }, { slot: '07', en: 'cheerful' }] },
      { cols: 4, items: [{ slot: '08', en: 'funny' }, { slot: '09', en: 'smart' }, { slot: '10', en: 'shy' }] }
    ]
  },

  // Unit 19 Part 1: Town Facilities 1 (16 cards) - 4 rows x 4 cols
  {
    unit: 'u19',
    file: 'u11_p19_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'house' }, { slot: '01', en: 'school' }, { slot: '02', en: 'bookstore' }, { slot: '03', en: 'station' }] },
      { cols: 4, items: [{ slot: '04', en: 'library' }, { slot: '05', en: 'post_office' }, { slot: '06', en: 'fire_station' }, { slot: '07', en: 'police_station' }] },
      { cols: 4, items: [{ slot: '08', en: 'hospital' }, { slot: '09', en: 'city_hall' }, { slot: '10', en: 'restaurant' }, { slot: '11', en: 'flower_shop' }] },
      { cols: 4, items: [{ slot: '12', en: 'supermarket' }, { slot: '13', en: 'bus_stop' }, { slot: '14', en: 'park' }, { slot: '15', en: 'stadium' }] }
    ]
  },

  // Unit 19 Part 2: Town Facilities 2 (10 cards) - Asymmetric 4-4-2 wide cols!
  {
    unit: 'u19',
    file: 'u11_p19_2.png',
    rows: [
      { cols: 4, items: [{ slot: '16', en: 'gym' }, { slot: '17', en: 'zoo' }, { slot: '18', en: 'aquarium' }, { slot: '19', en: 'museum' }] },
      { cols: 4, items: [{ slot: '20', en: 'temple' }, { slot: '21', en: 'shrine' }, { slot: '22', en: 'castle' }, { slot: '23', en: 'garden' }] },
      { cols: 2, items: [{ slot: '24', en: 'convenience_store' }, { slot: '25', en: 'amusement_park' }] }
    ]
  },

  // Unit 20 Part 1: Nature (12 cards) - 3 rows x 4 cols
  {
    unit: 'u20',
    file: 'u11_p20_1.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'sea' }, { slot: '01', en: 'beach' }, { slot: '02', en: 'river' }, { slot: '03', en: 'mountain' }] },
      { cols: 4, items: [{ slot: '04', en: 'lake' }, { slot: '05', en: 'pond' }, { slot: '06', en: 'forest' }, { slot: '07', en: 'island' }] },
      { cols: 4, items: [{ slot: '08', en: 'waterfall' }, { slot: '09', en: 'tree' }, { slot: '10', en: 'flower' }, { slot: '11', en: 'cherry_blossoms' }] }
    ]
  },

  // Unit 20 Part 2: Sky & Seasons (7 cards) - 2 rows x 4 cols
  {
    unit: 'u20',
    file: 'u11_p20_2.png',
    rows: [
      { cols: 4, items: [{ slot: '12', en: 'sun' }, { slot: '13', en: 'sunrise' }, { slot: '14', en: 'sunset' }, { slot: '15', en: 'rainbow' }] },
      { cols: 4, items: [{ slot: '16', en: 'stars' }, { slot: '17', en: 'hot_spring' }, { slot: '18', en: 'autumn_leaves' }] }
    ]
  },

  // Unit 21: Directions (10 cards) - 3 rows x 4 cols
  {
    unit: 'u21',
    file: 'u11_p21.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'on' }, { slot: '01', en: 'in' }, { slot: '02', en: 'under' }, { slot: '03', en: 'by' }] },
      { cols: 4, items: [{ slot: '04', en: 'go_straight' }, { slot: '05', en: 'turn_right' }, { slot: '06', en: 'turn_left' }, { slot: '07', en: 'stop' }] },
      { cols: 4, items: [{ slot: '08', en: 'corner' }, { slot: '09', en: 'block' }] }
    ]
  },

  // Unit 22: Collocations (4 cards) - 4 horizontal banner rows
  {
    unit: 'u22',
    file: 'u11_p22.png',
    isBannerRow: true,
    rows: [
      { items: [{ slot: '00', en: 'enjoy' }] },
      { items: [{ slot: '01', en: 'see' }] },
      { items: [{ slot: '02', en: 'eat' }] },
      { items: [{ slot: '03', en: 'visit' }] }
    ]
  },

  // Unit 23: Adjectives (11 cards) - 3 rows x 4 cols
  {
    unit: 'u23',
    file: 'u11_p23.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'big' }, { slot: '01', en: 'small' }, { slot: '02', en: 'old' }, { slot: '03', en: 'new' }] },
      { cols: 4, items: [{ slot: '04', en: 'long' }, { slot: '05', en: 'short' }, { slot: '06', en: 'cool' }, { slot: '07', en: 'beautiful' }] },
      { cols: 4, items: [{ slot: '08', en: 'cute' }, { slot: '09', en: 'popular' }, { slot: '10', en: 'fresh' }] }
    ]
  },

  // Unit 24: Impressions (7 cards) - 2 rows x 4 cols
  {
    unit: 'u24',
    file: 'u11_p24.png',
    rows: [
      { cols: 4, items: [{ slot: '00', en: 'nice' }, { slot: '01', en: 'good' }, { slot: '02', en: 'great' }, { slot: '03', en: 'wonderful' }] },
      { cols: 4, items: [{ slot: '04', en: 'fun' }, { slot: '05', en: 'exciting' }, { slot: '06', en: 'interesting' }] }
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

  for (const sheet of G5_SHEETS) {
    const sheetPath = path.join(MASTER_DIR, sheet.file);
    if (!fs.existsSync(sheetPath)) {
      console.warn(`  ⚠️ Missing sheet: ${sheet.file}`);
      continue;
    }

    const meta = await sharp(sheetPath).metadata();
    const numRows = sheet.rows.length;
    const rawRowH = meta.height / numRows;
    const borderInsetX = sheet.borderInsetX || 14;

    for (let r = 0; r < numRows; r++) {
      const rowDef = sheet.rows[r];

      // Row-Adaptive Inset to prevent bottom-row scalp damage
      let insetTop = rowDef.insetTop !== undefined ? rowDef.insetTop : 10;
      let insetBottom = 10;

      if (rowDef.insetTop === undefined && numRows > 1) {
        if (r === 0) {
          insetTop = 12; // Clears top outer border
        } else if (r === numRows - 1) {
          insetTop = 5;  // Pulls crop UP to protect hair on bottom row!
          insetBottom = 14;
        } else {
          insetTop = 9;
        }
      }

      const top = Math.min(meta.height - 30, Math.round(r * rawRowH) + insetTop);
      const cellH = Math.max(30, Math.round(rawRowH - insetTop - insetBottom));

      // Calculate column widths based on colWeights or equal cols
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

        const outName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_cell.png`;
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

  for (const sheet of G5_SHEETS) {
    for (const rowDef of sheet.rows) {
      for (const item of rowDef.items) {
        if (!item || !item.en) continue;

        const inName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_cell.png`;
        const inPath = path.join(STAGE1_DIR, inName);
        if (!fs.existsSync(inPath)) continue;

        const outName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_unwatermarked.png`;
        const outPath = path.join(STAGE2_DIR, outName);

        const { data, info } = await sharp(inPath).raw().toBuffer({ resolveWithObject: true });

        // Standard Cards: Scan top-right corner for purple or orange paw pixels
        let pawPixels = 0;
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

        let pipeline = sharp(inPath);
        if (pawPixels > 35) {
          const patchW = 36;
          const patchH = 46;
          const patchBuf = await createWhitePatch(patchW, patchH);
          pipeline = pipeline.composite([{ input: patchBuf, left: info.width - patchW, top: 0 }]);
          wipedCount++;
        }

        await pipeline.png().toFile(outPath);
        totalCount++;
      }
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

  for (const sheet of G5_SHEETS) {
    for (const rowDef of sheet.rows) {
      for (const item of rowDef.items) {
        if (!item || !item.en) continue;

        const inName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_unwatermarked.png`;
        const inPath = path.join(STAGE2_DIR, inName);
        if (!fs.existsSync(inPath)) continue;

        const outName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_trimmed.png`;
        const outPath = path.join(STAGE3_DIR, outName);

        const meta = await sharp(inPath).metadata();

        let extractRegion;
        if (sheet.isBannerRow) {
          // Unit 22 Collocations: Illustration is isolated on the left
          extractRegion = {
            left: 10,
            top: 4,
            width: 148,
            height: Math.max(30, meta.height - 8)
          };
        } else {
          // Standard Cards: Dynamic floor detection crops strictly above top guideline
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

        // Auto-trim outer whitespace borders and add clean 10px / 12px frame padding
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

  for (const sheet of G5_SHEETS) {
    for (const rowDef of sheet.rows) {
      for (const item of rowDef.items) {
        if (!item || !item.en) continue;

        // 1. Process Production Illustration Card (4x Lanczos3 + Line-Art Sharpen)
        const trimmedName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_trimmed.png`;
        const trimmedPath = path.join(STAGE3_DIR, trimmedName);

        if (fs.existsSync(trimmedPath)) {
          const prodIllustName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_illust.png`;
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

        // 2. Process Production Full Card (from Stage 2 clean unwatermarked cell)
        const cleanCellName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_unwatermarked.png`;
        const cleanCellPath = path.join(STAGE2_DIR, cleanCellName);

        if (fs.existsSync(cleanCellPath)) {
          const prodFullName = `hwg5_${sheet.unit}_${item.slot}_${item.en}_full.png`;
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
  }

  console.log(`✅ Stage 4 Complete: ${illustCount} illustration assets & ${fullCount} full card assets generated.`);
  console.log(`📁 Production files active at trimmed_assets/cards/`);
}

async function run() {
  const arg = process.argv[2];
  console.log('===================================================================');
  console.log('🚀 LEVI-SENSEI HERE WE GO GRADE 5 MULTI-STAGE ASSET PIPELINE v6.0');
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