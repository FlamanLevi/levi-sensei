export type BreakerTempo = 88 | 104 | 118; // BPM: 88 (Practice), 104 (Standard Video BPM), 118 (High-Speed)

// The Four-Measure (16-Beat) Musical Grid
export type BeatStep =
  | 'M1_B0_JAPANESE'       // Bar 1, Beat 1 (0.00s): "バナナ" (Japanese word begins)
  | 'M1_B1_JAPANESE_HOLD'  // Bar 1, Beat 2 (0.58s): Sustain & listen
  | 'M1_B2_JANAKUTE'       // Bar 1, Beat 3 (1.15s): "じゃなくて？" (Nanami connector)
  | 'M1_B3_JANAKUTE_HOLD'  // Bar 1, Beat 4 (1.73s): Sustain & lead into English model
  | 'M2_B4_ENGLISH'        // Bar 2, Beat 1 (2.31s): "banana" (English model)
  | 'M2_B5_ENGLISH_HOLD'   // Bar 2, Beat 2 (2.88s): Listen & absorb
  | 'M2_B6_PREPARE'        // Bar 2, Beat 3 (3.46s): Get ready!
  | 'M2_B7_INHALE'         // Bar 2, Beat 4 (4.04s): INHALE! 息を吸って！
  | 'M3_B8_CHORAL'         // Bar 3, Beat 1 (4.62s): CHORAL ECHO! "BANANA!" (Classroom shouts + shockwave)
  | 'M3_B9_CHORAL_HOLD'    // Bar 3, Beat 2 (5.19s): Ring out shout
  | 'M3_B10_PRAISE'        // Bar 3, Beat 3 (5.77s): Great job!
  | 'M3_B11_RINGOUT'       // Bar 3, Beat 4 (6.35s): Praise ringout
  | 'M4_B12_GROOVE1'       // Bar 4, Beat 1 (6.92s): Groove bridge ♪
  | 'M4_B13_GROOVE2'       // Bar 4, Beat 2 (7.50s): Groove bridge 🍌
  | 'M4_B14_PICKUP1'       // Bar 4, Beat 3 (8.08s): Pickup ♪ 🍌
  | 'M4_B15_PICKUP2';      // Bar 4, Beat 4 (8.65s): Pickup -> Transitions into next word!

export interface BreakerCategory {
  id: string;
  name: string;
  jaName: string;
  icon: string;
}

export const BREAKER_CATEGORIES: BreakerCategory[] = [
  { id: 'ALL', name: 'All Loanwords', jaName: 'すべてのカタカナ語', icon: '🌈' },
  { id: 'SWEETS_FOOD', name: 'Sweets & Food', jaName: 'お菓子・食べ物', icon: '🍰' },
  { id: 'FRUITS_VEGGIES', name: 'Fruits & Vegetables', jaName: '果物・野菜', icon: '🍌' },
  { id: 'SCHOOL_DAILY', name: 'School & Daily', jaName: '文房具・身の回り', icon: '✏️' },
  { id: 'FALSE_FRIENDS', name: 'False Friends (和製英語)', jaName: '要注意！和製英語', icon: '⚠️' }
];
