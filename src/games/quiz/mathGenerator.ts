/**
 * Levi-Sensei English & STEM Platform
 * Top-to-Bottom Elementary Mathematics (算数) Procedural Question Generator
 * 
 * Fully covers Grades 1 to 6 (小1〜小6) across all 4 MEXT curriculum domains:
 *   Domain A: Numbers & Calculations (数と計算)
 *   Domain B: Quantities & Measurements (量と測定)
 *   Domain C: Geometrical Figures (図形)
 *   Domain D: Mathematical Relations (数量関係)
 * 
 * Conforms strictly to MEXT Course of Study (CRICED bilingual guidelines)
 * Features pedagogically realistic distractors (reproducing common calculation traps)
 * and outputs standard QuizQuestion interfaces compatible with Eigo Arena, Sprint Race,
 * 3D Grand Prix, Tug-of-War, and Volleyball.
 */

import { QuizQuestion, QuizOption, OPTION_STYLES } from './types';
import { MathGrade, MathDomain, MathGeneratorOptions } from './mathTypes';

// ============================================================================
// Mathematical & Random Helpers
// ============================================================================

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a * b) / gcd(a, b));
}

export function simplifyFraction(numerator: number, denominator: number): [number, number] {
  const d = gcd(numerator, denominator);
  return [numerator / d, denominator / d];
}

export function formatFraction(numerator: number, denominator: number): string {
  const [num, den] = simplifyFraction(numerator, denominator);
  if (den === 1) return `${num}`;
  if (num > den) {
    const whole = Math.floor(num / den);
    const rem = num % den;
    if (rem === 0) return `${whole}`;
    return `${whole}と${rem}/${den}`;
  }
  return `${num}/${den}`;
}

export function formatImproperFraction(numerator: number, denominator: number): string {
  const [num, den] = simplifyFraction(numerator, denominator);
  if (den === 1) return `${num}`;
  return `${num}/${den}`;
}

/**
 * Rounds to at most 2 decimal places and strips trailing zeros cleanly (e.g. 1.80 -> "1.8", 31.40 -> "31.4").
 */
export function formatDecimal(val: number): string {
  return Number(Math.round(val * 100) / 100).toString();
}

/**
 * Perturbs a math answer string to create realistic, valid elementary distractors
 * without ever generating negative numbers, NaN artifacts, or '(1)' tags.
 */
function generateFallbackDistractor(correctAnswer: string, seed: number, grade: MathGrade): string {
  const isLowerGrade = grade === 'G1' || grade === 'G2';
  const minFloor = isLowerGrade ? 0 : 0;

  // 1. Mixed fraction: "3と2/3"
  const mixedMatch = correctAnswer.match(/^(\d+)と(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    const wholeOffsets = [1, -1, 2, -2];
    const targetWhole = Math.max(1, whole + wholeOffsets[(seed - 1) % wholeOffsets.length]);
    if (seed % 2 === 1) {
      return `${targetWhole}と${num}/${den}`;
    }
    const altNum = num === 1 ? Math.min(den - 1, 2) : num - 1;
    return `${whole}と${altNum}/${den}`;
  }

  // 2. Simple fraction: "5/6"
  const fracMatch = correctAnswer.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    const offsets = [1, -1, 2, -2, 3];
    const newNum = Math.max(1, num + offsets[(seed - 1) % offsets.length]);
    if (newNum !== num) return `${newNum}/${den}`;
    return `${num}/${den + 1}`;
  }

  // 3. Quotient and remainder: "4 あまり 2"
  const remMatch = correctAnswer.match(/^(\d+)\s*あまり\s*(\d+)$/);
  if (remMatch) {
    const q = parseInt(remMatch[1], 10);
    const r = parseInt(remMatch[2], 10);
    if (seed % 2 === 1) {
      const qOffset = seed === 1 ? 1 : -1;
      return `${Math.max(1, q + qOffset)} あまり ${r}`;
    }
    return `${q} あまり ${r + 1}`;
  }

  // 4. Ratio: "3 : 4"
  const ratioMatch = correctAnswer.match(/^(\d+)\s*:\s*(\d+)$/);
  if (ratioMatch) {
    const a = parseInt(ratioMatch[1], 10);
    const b = parseInt(ratioMatch[2], 10);
    if (seed % 2 === 1) return `${b} : ${a}`;
    return `${a + 1} : ${b}`;
  }

  // 5. Number with units (e.g. "16cm²", "1400円", "30分間", "75%", "180°", "100m²", "35人")
  const unitMatch = correctAnswer.match(/^(-?\d+(?:\.\d+)?)\s*([a-zA-Z\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF%²³°円個本点分間時]+)$/);
  if (unitMatch) {
    const val = parseFloat(unitMatch[1]);
    const unit = unitMatch[2];
    const isInteger = Number.isInteger(val);
    const sign = seed % 2 === 1 ? 1 : -1;
    const step = isInteger ? (val >= 100 ? (seed % 4 === 1 ? 100 : 50) : (val >= 20 ? 5 : 1)) : 0.1;
    const offset = Math.ceil(seed / 2) * step * sign;
    const newVal = Math.max(minFloor, val + offset);
    const formattedVal = isInteger ? Math.round(newVal).toString() : formatDecimal(newVal);
    if (formattedVal !== unitMatch[1]) {
      return `${formattedVal}${unit}`;
    }
  }

  // 6. Decimals without units: "1.8", "3.14"
  const decMatch = correctAnswer.match(/^(-?\d+)\.(\d+)$/);
  if (decMatch) {
    const val = parseFloat(correctAnswer);
    const decimals = decMatch[2].length;
    const step = decimals === 1 ? 0.1 : 0.01;
    const sign = seed % 2 === 1 ? 1 : -1;
    const offset = Math.ceil(seed / 2) * step * sign;
    const newVal = Math.max(0.1, val + offset);
    return formatDecimal(newVal);
  }

  // 7. Pure integer without units: "8", "42"
  const numCorrect = Number(correctAnswer);
  if (!isNaN(numCorrect) && Number.isInteger(numCorrect)) {
    const sign = seed % 2 === 1 ? 1 : -1;
    const step = numCorrect >= 50 ? 10 : 1;
    const offset = Math.ceil(seed / 2) * step * sign;
    const newVal = Math.max(minFloor, numCorrect + offset);
    if (newVal !== numCorrect) return String(newVal);
    return String(numCorrect + seed);
  }

  // 8. Geometry/Vocab fallback pool (shapes, directions, names)
  const vocabPool = [
    '三角形', '四角形', '長方形', '正方形', '平行四辺形', '台形', 'ひし形', '円',
    'さんかく', 'しかく', 'まる',
    '3つ', '4つ', '0こ', '5つ', '2つ',
    '垂直', '平行', '同じ長さ', '直角'
  ];
  for (const item of vocabPool) {
    if (item !== correctAnswer) return item;
  }

  return `${correctAnswer}？`;
}

/**
 * Builds a valid QuizQuestion object given a prompt, correct answer, and candidate distractors.
 * Guarantees exactly 4 unique options mapped to standard shape badges (▲, ◆, ●, ■).
 */
export function buildMathQuestion(params: {
  id: string;
  grade: MathGrade;
  domain: MathDomain;
  promptText: string;
  promptSubtext?: string;
  correctAnswer: string;
  distractors: string[];
  explanationJa?: string;
  timeLimitMs?: number;
}): QuizQuestion {
  const { id, grade, domain, promptText, promptSubtext, correctAnswer, distractors, explanationJa, timeLimitMs = 15000 } = params;

  // Filter out any distractor that matches the correct answer
  const uniqueDistractors = Array.from(new Set(distractors.filter(d => d.trim() !== correctAnswer.trim())));

  // If fewer than 3 distractors, generate fallback offsets or numeric variants
  let fallbackSeed = 1;
  while (uniqueDistractors.length < 3) {
    const candidate = generateFallbackDistractor(correctAnswer, fallbackSeed, grade);
    fallbackSeed++;
    if (candidate !== correctAnswer && !uniqueDistractors.includes(candidate)) {
      uniqueDistractors.push(candidate);
    }
    if (fallbackSeed > 30) break; // safeguard
  }

  const selectedDistractors = shuffle(uniqueDistractors).slice(0, 3);
  const rawOptions = shuffle([correctAnswer, ...selectedDistractors]);

  const options: QuizOption[] = rawOptions.map((text, idx) => {
    const style = OPTION_STYLES[idx];
    return {
      id: `opt_${idx}_${text}`,
      english: text,
      ja_kanji: text,
      ja_hiragana: text,
      symbol: style.symbol,
      color: style.color
    };
  });

  const correctOption = options.find(o => o.english === correctAnswer)!;

  return {
    questionIndex: 0,
    totalQuestions: 1,
    targetWordId: id,
    targetWordEnglish: correctAnswer,
    targetWordJa: explanationJa || `正解: ${correctAnswer}`,
    targetWordHiragana: correctAnswer,
    targetWordKatakana: '',
    categoryNameEn: `Grade ${grade.replace('G', '')} Math`,
    categoryNameJa: `${grade === 'G1' ? '小1' : grade === 'G2' ? '小2' : grade === 'G3' ? '小3' : grade === 'G4' ? '小4' : grade === 'G5' ? '小5' : '小6'} 算数 (${domain})`,
    isMath: true,
    mathGrade: grade,
    mathDomain: domain,
    promptType: 'JA_MEANING',
    promptText,
    promptSubtext,
    options,
    correctOptionId: correctOption.id,
    distractorOptionIds: options.filter(o => o.id !== correctOption.id).map(o => o.id),
    startTime: 0,
    timeLimitMs
  };
}

// ============================================================================
// Grade 1 (第1学年) Generators
// ============================================================================

export const Grade1Generators = {
  // A. Numbers & Calculations: 1-digit addition without carry (sum <= 10)
  addNoCarry(seed = 0): QuizQuestion {
    const a = randInt(1, 8);
    const b = randInt(1, 10 - a);
    const ans = a + b;
    return buildMathQuestion({
      id: `g1_add_nocarry_${seed}`,
      grade: 'G1',
      domain: 'NUMBERS_CALC',
      promptText: `${a} + ${b} = ?`,
      promptSubtext: 'たしざんの こたえを えらぼう',
      correctAnswer: String(ans),
      distractors: [String(ans + 1), String(Math.max(1, ans - 1)), String(ans + 2), String(Math.max(0, ans - 2))],
      explanationJa: `${a} + ${b} = ${ans}`
    });
  },

  // A. Numbers & Calculations: 1-digit addition with carry (sum 11-18)
  addWithCarry(seed = 0): QuizQuestion {
    const a = randInt(2, 9);
    const b = randInt(11 - a, 9);
    const ans = a + b;
    // Common traps: forget carry (e.g. 8+7 -> 5 or 14 or 16)
    return buildMathQuestion({
      id: `g1_add_carry_${seed}`,
      grade: 'G1',
      domain: 'NUMBERS_CALC',
      promptText: `${a} + ${b} = ?`,
      promptSubtext: 'あわせると いくつ？',
      correctAnswer: String(ans),
      distractors: [String(ans - 1), String(ans + 1), String(ans - 10), String(ans + 2), String(ans - 2)],
      explanationJa: `${a} + ${b} = ${ans}`
    });
  },

  // A. Numbers & Calculations: 1-digit subtraction without borrow (guarantees a > b and ans >= 1)
  subNoBorrow(seed = 0): QuizQuestion {
    const b = randInt(1, 7);
    const a = randInt(b + 1, 9);
    const ans = a - b;
    return buildMathQuestion({
      id: `g1_sub_noborrow_${seed}`,
      grade: 'G1',
      domain: 'NUMBERS_CALC',
      promptText: `${a} - ${b} = ?`,
      promptSubtext: 'ひきざんの こたえを えらぼう',
      correctAnswer: String(ans),
      distractors: [String(ans + 1), String(Math.max(0, ans - 1)), String(ans + 2), String(a + b), String(ans + 3)],
      explanationJa: `${a} - ${b} = ${ans}`
    });
  },

  // A. Numbers & Calculations: Subtraction with borrow from teens (11-18 - 1-digit)
  subWithBorrow(seed = 0): QuizQuestion {
    const ans = randInt(2, 9);
    const b = randInt(11 - ans, 9);
    const a = ans + b;
    // Common traps: subtract ones directly (e.g. 15-8 -> 15-8=3), off by one
    return buildMathQuestion({
      id: `g1_sub_borrow_${seed}`,
      grade: 'G1',
      domain: 'NUMBERS_CALC',
      promptText: `${a} - ${b} = ?`,
      promptSubtext: 'のこりは いくつ？',
      correctAnswer: String(ans),
      distractors: [String(ans - 1), String(ans + 1), String(Math.abs((a % 10) - b)), String(ans + 2), String(Math.max(1, ans - 2))],
      explanationJa: `${a} - ${b} = ${ans}`
    });
  },

  // A. Numbers & Calculations: 10's decomposition (10の合成・分解)
  numberBonds10(seed = 0): QuizQuestion {
    const a = randInt(1, 9);
    const ans = 10 - a;
    const prompt = Math.random() < 0.5 ? `${a} と あと いくつで 10？` : `10 は ${a} と □`;
    return buildMathQuestion({
      id: `g1_bonds10_${seed}`,
      grade: 'G1',
      domain: 'NUMBERS_CALC',
      promptText: prompt,
      promptSubtext: '10に なる かずを えらぼう',
      correctAnswer: String(ans),
      distractors: [
        String(ans + 1),
        String(ans + 2),
        String(Math.max(0, ans - 1)),
        String(Math.max(0, ans - 2)),
        String(10 - ans + 2),
        String(a)
      ],
      explanationJa: `${a} と ${ans} で 10`
    });
  },

  // A. Numbers & Calculations: Bundles of 10 (何十の計算)
  tensAddition(seed = 0): QuizQuestion {
    const a = randInt(1, 5) * 10;
    const b = randInt(1, 4) * 10;
    const ans = a + b;
    return buildMathQuestion({
      id: `g1_tens_${seed}`,
      grade: 'G1',
      domain: 'NUMBERS_CALC',
      promptText: `${a} + ${b} = ?`,
      promptSubtext: '10の まとまりの けいさん',
      correctAnswer: String(ans),
      distractors: [String(ans - 10), String(ans + 10), String(ans - 20), String(ans + 20)],
      explanationJa: `${a} + ${b} = ${ans}`
    });
  },

  // B. Quantities & Measurements: Clock reading (整時 & 半 - MEXT G1 Hiragana: 「〜じ」「〜じはん」)
  clockReading(seed = 0): QuizQuestion {
    const hour = randInt(1, 12);
    const isHalf = Math.random() < 0.5;
    const nextHour = hour === 12 ? 1 : hour + 1;
    const prevHour = hour === 1 ? 12 : hour - 1;
    const prompt = isHalf
      ? `ながい はりが 6、みじかい はりが ${hour}と${nextHour}の あいだ`
      : `ながい はりが 12、みじかい はりが ${hour}`;
    const ans = isHalf ? `${hour}じはん` : `${hour}じ`;
    const distractors = isHalf
      ? [`${hour}じ`, `${nextHour}じはん`, `${nextHour}じ`, `${prevHour}じはん`]
      : [`${hour}じはん`, `${nextHour}じ`, `${prevHour}じ`, `${nextHour}じはん`];
    return buildMathQuestion({
      id: `g1_clock_${seed}`,
      grade: 'G1',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: prompt,
      promptSubtext: 'なんじ？ とけいを よもう',
      correctAnswer: ans,
      distractors,
      explanationJa: `正解は ${ans} です。`
    });
  },

  // C. Geometrical Figures: Shape Sorting (MEXT G1 かたちあそび)
  shapesG1(seed = 0): QuizQuestion {
    const items = [
      { prompt: 'はこの かたちは どれ？', ans: 'しかく', dist: ['まる', 'さんかく', 'ながしかく'] },
      { prompt: 'ボールの ように ころがる かたちは？', ans: 'まる', dist: ['しかく', 'さんかく', 'ながしかく'] },
      { prompt: 'おにぎりの ような かたちは どれ？', ans: 'さんかく', dist: ['まる', 'しかく', 'ながしかく'] },
      { prompt: 'つみきや サイコロの かたちは どれ？', ans: 'しかく', dist: ['まる', 'さんかく', 'ほし'] },
      { prompt: 'コインや かんづめの ふたの かたちは？', ans: 'まる', dist: ['しかく', 'さんかく', 'ながしかく'] }
    ];
    const s = pickRandom(items);
    return buildMathQuestion({
      id: `g1_shape_${seed}`,
      grade: 'G1',
      domain: 'GEOMETRIC_FIGURES',
      promptText: s.prompt,
      promptSubtext: 'かたちあそび',
      correctAnswer: s.ans,
      distractors: s.dist,
      explanationJa: `正解は ${s.ans} です。`
    });
  }
};

// ============================================================================
// Grade 2 (第2学年) Generators
// ============================================================================

export const Grade2Generators = {
  // A. Calculations: 2-digit addition with carry (筆算)
  add2DigitCarry(seed = 0): QuizQuestion {
    const aTens = randInt(2, 6);
    const aOnes = randInt(5, 9);
    const bTens = randInt(1, 3);
    const bOnes = randInt(11 - aOnes, 9);
    const a = aTens * 10 + aOnes;
    const b = bTens * 10 + bOnes;
    const ans = a + b;
    // Common traps: forgetting carry to tens place
    const noCarryTrap = (aTens + bTens) * 10 + ((aOnes + bOnes) % 10);
    return buildMathQuestion({
      id: `g2_add2d_${seed}`,
      grade: 'G2',
      domain: 'NUMBERS_CALC',
      promptText: `${a} + ${b} = ?`,
      promptSubtext: 'たし算の筆算',
      correctAnswer: String(ans),
      distractors: [String(noCarryTrap), String(ans - 1), String(ans + 10), String(ans + 1), String(ans - 10)],
      explanationJa: `${a} + ${b} = ${ans}`
    });
  },

  // A. Calculations: 2-digit subtraction with borrow
  sub2DigitBorrow(seed = 0): QuizQuestion {
    const aTens = randInt(4, 9);
    const aOnes = randInt(1, 4);
    const bTens = randInt(1, aTens - 2);
    const bOnes = randInt(aOnes + 2, 9);
    const a = aTens * 10 + aOnes;
    const b = bTens * 10 + bOnes;
    const ans = a - b;
    // Common trap: subtracting smaller from larger in ones place (e.g. 72-35 -> 7-3=4, 5-2=3 -> 43)
    const invertedSubtractTrap = (aTens - bTens) * 10 + (bOnes - aOnes);
    const forgotBorrowTrap = (aTens - bTens) * 10 + (10 + aOnes - bOnes);
    return buildMathQuestion({
      id: `g2_sub2d_${seed}`,
      grade: 'G2',
      domain: 'NUMBERS_CALC',
      promptText: `${a} - ${b} = ?`,
      promptSubtext: 'ひき算の筆算',
      correctAnswer: String(ans),
      distractors: [
        String(invertedSubtractTrap),
        String(forgotBorrowTrap),
        String(ans - 1),
        String(ans + 1),
        String(ans - 10),
        String(ans + 2)
      ],
      explanationJa: `${a} - ${b} = ${ans}`
    });
  },

  // A. Multiplication: The 9x9 Ku-ku Table (かけ算九九)
  kukuTable(seed = 0): QuizQuestion {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const ans = a * b;
    // Traps: neighboring facts, addition instead of mult
    const addTrap = a + b;
    const neighbor1 = a * (b - 1);
    const neighbor2 = a * (b + 1);
    return buildMathQuestion({
      id: `g2_kuku_${seed}`,
      grade: 'G2',
      domain: 'NUMBERS_CALC',
      promptText: `${a} × ${b} = ?`,
      promptSubtext: `九九: ${a}の段`,
      correctAnswer: String(ans),
      distractors: [
        String(addTrap),
        String(neighbor1),
        String(neighbor2),
        String((a - 1) * b),
        String(ans + 2),
        String(ans - 2),
        String(ans + 10)
      ],
      explanationJa: `${a} × ${b} = ${ans}`
    });
  },

  // A. Multiplication: Missing factor in Ku-ku (虫食い九九: □ × b = C or a × □ = C)
  kukuMissingFactor(seed = 0): QuizQuestion {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const prod = a * b;
    const missingFirst = Math.random() < 0.5;
    const prompt = missingFirst ? `□ × ${b} = ${prod}` : `${a} × □ = ${prod}`;
    const ans = missingFirst ? a : b;
    return buildMathQuestion({
      id: `g2_kuku_rev_${seed}`,
      grade: 'G2',
      domain: 'NUMBERS_CALC',
      promptText: prompt,
      promptSubtext: '□にあてはまる 九九の数は？',
      correctAnswer: String(ans),
      distractors: [String(ans + 1), String(Math.max(1, ans - 1)), String(ans + 2), String(Math.max(1, ans - 2))],
      explanationJa: `${a} × ${b} = ${prod}`
    });
  },

  // B. Quantities & Measurements: Length units (m, cm, mm)
  unitsLength(seed = 0): QuizQuestion {
    const modes = [
      { prompt: '1m は 何cm？', ans: '100cm', dist: ['10cm', '1000cm', '10000cm', '50cm'] },
      { prompt: '1cm は 何mm？', ans: '10mm', dist: ['100mm', '1mm', '1000mm', '5mm'] },
      { prompt: '3m 50cm は 何cm？', ans: '350cm', dist: ['305cm', '35cm', '3500cm', '300cm'] },
      { prompt: '240cm は 何m 何cm？', ans: '2m 40cm', dist: ['24m 0cm', '2m 4cm', '20m 40cm', '24m 40cm'] }
    ];
    const q = pickRandom(modes);
    return buildMathQuestion({
      id: `g2_unit_len_${seed}`,
      grade: 'G2',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: q.prompt,
      promptSubtext: '長さの単位',
      correctAnswer: q.ans,
      distractors: q.dist,
      explanationJa: `正解は ${q.ans}`
    });
  },

  // B. Quantities & Measurements: Liquid volume (L, dL, mL)
  unitsVolume(seed = 0): QuizQuestion {
    const modes = [
      { prompt: '1L（リットル）は 何dL（デシリットル）？', ans: '10dL', dist: ['100dL', '1000dL', '1dL', '5dL'] },
      { prompt: '1dL は 何mL（ミリリットル）？', ans: '100mL', dist: ['10mL', '1000mL', '1mL', '50mL'] },
      { prompt: '1L は 何mL？', ans: '1000mL', dist: ['100mL', '10mL', '10000mL', '500mL'] },
      { prompt: '2L 3dL は 何dL？', ans: '23dL', dist: ['203dL', '5dL', '230dL', '20dL'] }
    ];
    const q = pickRandom(modes);
    return buildMathQuestion({
      id: `g2_unit_vol_${seed}`,
      grade: 'G2',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: q.prompt,
      promptSubtext: '水のかさの単位',
      correctAnswer: q.ans,
      distractors: q.dist,
      explanationJa: `正解は ${q.ans}`
    });
  },

  // B. Quantities & Measurements: Time units
  unitsTime(seed = 0): QuizQuestion {
    const modes = [
      { prompt: '1日（にち）は 何時間？', ans: '24時間', dist: ['12時間', '60時間', '10時間', '48時間'] },
      { prompt: '1時間は 何分？', ans: '60分', dist: ['100分', '24分', '30分', '12分'] },
      { prompt: '1分は 何秒？', ans: '60秒', dist: ['100秒', '24秒', '10秒', '30秒'] }
    ];
    const q = pickRandom(modes);
    return buildMathQuestion({
      id: `g2_time_${seed}`,
      grade: 'G2',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: q.prompt,
      promptSubtext: '時間の単位',
      correctAnswer: q.ans,
      distractors: q.dist,
      explanationJa: `正解は ${q.ans}`
    });
  },

  // C. Geometrical Figures: Right angles, rectangles, squares (Strict Grade 2 shapes only!)
  geometryG2(seed = 0): QuizQuestion {
    const items = [
      { prompt: '4つの角がすべて直角で、4つの辺の長さが等しい四角形は？', ans: '正方形 (せいほうけい)', dist: ['長方形', '直角三角形', '三角形', '円'] },
      { prompt: '4つの角がすべて直角の四角形は？', ans: '長方形 (ちょうほうけい)', dist: ['正方形', '直角三角形', '三角形', '四角形'] },
      { prompt: '1つの角が直角になっている三角形は？', ans: '直角三角形 (ちょっかくさんかくけい)', dist: ['三角形', '長方形', '正方形', '四角形'] },
      { prompt: '長方形の 向かい合う辺の長さは？', ans: '同じ長さ', dist: ['ちがう長さ', 'どちらかが長い', '決まっていない'] }
    ];
    const item = pickRandom(items);
    return buildMathQuestion({
      id: `g2_geom_${seed}`,
      grade: 'G2',
      domain: 'GEOMETRIC_FIGURES',
      promptText: item.prompt,
      promptSubtext: '形のとくちょう',
      correctAnswer: item.ans,
      distractors: item.dist,
      explanationJa: `正解は ${item.ans}`
    });
  }
};

// ============================================================================
// Grade 3 (第3学年) Generators
// ============================================================================

export const Grade3Generators = {
  // A. Calculations: Exact division from multiplication table
  divisionExact(seed = 0): QuizQuestion {
    const divisor = randInt(2, 9);
    const quotient = randInt(2, 9);
    const dividend = divisor * quotient;
    return buildMathQuestion({
      id: `g3_div_exact_${seed}`,
      grade: 'G3',
      domain: 'NUMBERS_CALC',
      promptText: `${dividend} ÷ ${divisor} = ?`,
      promptSubtext: '九九を使った わり算',
      correctAnswer: String(quotient),
      distractors: [String(quotient + 1), String(Math.max(1, quotient - 1)), String(quotient + 2), String(quotient + 3)],
      explanationJa: `${dividend} ÷ ${divisor} = ${quotient}`
    });
  },

  // A. Calculations: Division with remainder (あまりのあるわり算 - G3 standard: 「答えと 余り」)
  divisionWithRemainder(seed = 0): QuizQuestion {
    const divisor = randInt(3, 9);
    const quotient = randInt(2, 8);
    const rem = randInt(1, divisor - 1);
    const dividend = divisor * quotient + rem;
    const ans = `${quotient} あまり ${rem}`;
    // Common traps: wrong remainder or quotient
    const trap1 = `${quotient - 1} あまり ${rem + divisor}`;
    const trap2 = `${quotient} あまり ${rem + 1}`;
    const trap3 = `${quotient + 1} あまり ${divisor - rem}`;
    return buildMathQuestion({
      id: `g3_div_rem_${seed}`,
      grade: 'G3',
      domain: 'NUMBERS_CALC',
      promptText: `${dividend} ÷ ${divisor} = ?`,
      promptSubtext: '答えと 余りを もとめよう',
      correctAnswer: ans,
      distractors: [trap1, trap2, trap3, `${quotient} あまり ${Math.max(0, rem - 1)}`],
      explanationJa: `${dividend} ÷ ${divisor} = ${quotient} あまり ${rem}`
    });
  },

  // A. Calculations: 2-digit × 1-digit multiplication (guarantees carry from ones place)
  mult2DigitBy1Digit(seed = 0): QuizQuestion {
    const aOnes = randInt(2, 9);
    const b = randInt(Math.max(2, Math.ceil(10 / aOnes)), 9);
    const aTens = randInt(1, 8);
    const a = aTens * 10 + aOnes;
    const ans = a * b;
    // Traps: forgot carry from ones place into tens
    const forgotCarry = (aTens * b) * 10 + ((aOnes * b) % 10);
    return buildMathQuestion({
      id: `g3_mult2d_${seed}`,
      grade: 'G3',
      domain: 'NUMBERS_CALC',
      promptText: `${a} × ${b} = ?`,
      promptSubtext: 'かけ算の筆算',
      correctAnswer: String(ans),
      distractors: [String(forgotCarry), String(ans - 10), String(ans + 10), String(ans - b), String(ans + b)],
      explanationJa: `${a} × ${b} = ${ans}`
    });
  },

  // A. Calculations: Decimal addition/subtraction in tenths
  decimalTenths(seed = 0): QuizQuestion {
    const isAdd = Math.random() < 0.5;
    if (isAdd) {
      const a = randInt(2, 25) / 10;
      const b = randInt(3, 19) / 10;
      const ans = Math.round((a + b) * 10) / 10;
      return buildMathQuestion({
        id: `g3_dec_add_${seed}`,
        grade: 'G3',
        domain: 'NUMBERS_CALC',
        promptText: `${formatDecimal(a)} + ${formatDecimal(b)} = ?`,
        promptSubtext: '小数のたし算',
        correctAnswer: formatDecimal(ans),
        distractors: [formatDecimal(ans - 0.1), formatDecimal(ans + 0.1), formatDecimal(ans + 1.0), formatDecimal(ans - 1.0)],
        explanationJa: `${formatDecimal(a)} + ${formatDecimal(b)} = ${formatDecimal(ans)}`
      });
    } else {
      const ansNum = randInt(2, 20);
      const bNum = randInt(3, 15);
      const aNum = ansNum + bNum;
      const a = aNum / 10;
      const b = bNum / 10;
      const ans = ansNum / 10;
      return buildMathQuestion({
        id: `g3_dec_sub_${seed}`,
        grade: 'G3',
        domain: 'NUMBERS_CALC',
        promptText: `${formatDecimal(a)} - ${formatDecimal(b)} = ?`,
        promptSubtext: '小数のひき算',
        correctAnswer: formatDecimal(ans),
        distractors: [formatDecimal(ans - 0.1), formatDecimal(ans + 0.1), formatDecimal(ans + 1.0), formatDecimal(ans - 1.0)],
        explanationJa: `${formatDecimal(a)} - ${formatDecimal(b)} = ${formatDecimal(ans)}`
      });
    }
  },

  // A. Calculations: Fractions with common denominator (sum < 1 proper fractions)
  fractionCommonDenom(seed = 0): QuizQuestion {
    const den = pickRandom([5, 6, 7, 8, 9, 10]);
    const num1 = randInt(1, den - 2);
    const num2 = randInt(1, den - num1 - 1);
    const sumNum = num1 + num2;
    const ans = `${sumNum}/${den}`;
    // Universal misconception trap: adding the denominators!
    const addDenomTrap = `${sumNum}/${den + den}`;
    return buildMathQuestion({
      id: `g3_frac_add_${seed}`,
      grade: 'G3',
      domain: 'NUMBERS_CALC',
      promptText: `${num1}/${den} + ${num2}/${den} = ?`,
      promptSubtext: '分母が 同じ 分数の たし算',
      correctAnswer: ans,
      distractors: [addDenomTrap, `${Math.max(1, sumNum - 1)}/${den}`, `${sumNum + 1}/${den}`, `${sumNum}/${den + 1}`],
      explanationJa: `分母はそのまま、分子だけをたす: ${num1}/${den} + ${num2}/${den} = ${ans}`
    });
  },

  // B. Quantities: Weight conversions (g, kg, t) & Distance (km, m)
  unitsWeightAndDistance(seed = 0): QuizQuestion {
    const items = [
      { prompt: '1kg（キログラム）は 何g？', ans: '1000g', dist: ['100g', '10g', '10000g', '500g'] },
      { prompt: '1t（トン）は 何kg？', ans: '1000kg', dist: ['100kg', '10000kg', '10kg', '500kg'] },
      { prompt: '1km（キロメートル）は 何m？', ans: '1000m', dist: ['100m', '10m', '10000m', '500m'] },
      { prompt: '2km 40m は 何m？', ans: '2040m', dist: ['2400m', '240m', '20040m', '204m'] },
      { prompt: '3kg 50g は 何g？', ans: '3050g', dist: ['3500g', '350g', '3005g', '305g'] }
    ];
    const item = pickRandom(items);
    return buildMathQuestion({
      id: `g3_unit_w_${seed}`,
      grade: 'G3',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: item.prompt,
      promptSubtext: '重さと長さの単位',
      correctAnswer: item.ans,
      distractors: item.dist,
      explanationJa: `正解は ${item.ans}`
    });
  },

  // B. Quantities: Elapsed time calculations (intra-morning for clear rapid-fire solving)
  elapsedTime(seed = 0): QuizQuestion {
    const startHour = randInt(8, 10);
    const startMin = pickRandom([10, 15, 20, 25, 30, 40]);
    const durationMin = pickRandom([20, 25, 30, 35, 40, 45]);
    const totalStartMinutes = startHour * 60 + startMin;
    const totalEndMinutes = totalStartMinutes + durationMin;
    const endHour = Math.floor(totalEndMinutes / 60);
    const endMin = totalEndMinutes % 60;
    const mStr = (m: number) => (m < 10 ? `0${m}` : `${m}`);

    return buildMathQuestion({
      id: `g3_elapsed_${seed}`,
      grade: 'G3',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: `午前${startHour}時${mStr(startMin)}分 から 午前${endHour}時${mStr(endMin)}分 までは 何分間？`,
      promptSubtext: '何分間 たったかな？',
      correctAnswer: `${durationMin}分間`,
      distractors: [`${durationMin - 10}分間`, `${durationMin + 10}分間`, `${durationMin + 15}分間`, `${durationMin - 5}分間`],
      explanationJa: `${totalEndMinutes}分 - ${totalStartMinutes}分 = ${durationMin}分間`
    });
  },

  // C. Geometrical Figures: Circles (Radius & Diameter) & Triangles
  circlesAndTriangles(seed = 0): QuizQuestion {
    const isRadiusToDiameter = Math.random() < 0.5;
    if (isRadiusToDiameter) {
      const r = randInt(3, 15);
      const d = r * 2;
      return buildMathQuestion({
        id: `g3_circle_d_${seed}`,
        grade: 'G3',
        domain: 'GEOMETRIC_FIGURES',
        promptText: `半径が ${r}cm の円の 直径は 何cm？`,
        promptSubtext: '円の 直径と 半径',
        correctAnswer: `${d}cm`,
        distractors: [`${r}cm`, `${r + 2}cm`, `${d + 2}cm`, `${d - 2}cm`],
        explanationJa: `直径 = 半径 × 2 = ${r} × 2 = ${d}cm`
      });
    } else {
      const r = randInt(3, 12);
      const d = r * 2;
      return buildMathQuestion({
        id: `g3_circle_r_${seed}`,
        grade: 'G3',
        domain: 'GEOMETRIC_FIGURES',
        promptText: `直径が ${d}cm の円の 半径は 何cm？`,
        promptSubtext: '円の 直径と 半径',
        correctAnswer: `${r}cm`,
        distractors: [`${d}cm`, `${r + 1}cm`, `${Math.max(1, r - 1)}cm`, `${d + 2}cm`],
        explanationJa: `半径 = 直径 ÷ 2 = ${d} ÷ 2 = ${r}cm`
      });
    }
  }
};

// ============================================================================
// Grade 4 (第4学年) Generators
// ============================================================================

export const Grade4Generators = {
  // A. Calculations: Division by 2-digit divisor (calibrated for rapid-fire mental math)
  division2DigitDivisor(seed = 0): QuizQuestion {
    const divisor = pickRandom([12, 15, 20, 21, 25, 30, 40]);
    const quotient = randInt(2, 6);
    const dividend = divisor * quotient;
    return buildMathQuestion({
      id: `g4_div2d_${seed}`,
      grade: 'G4',
      domain: 'NUMBERS_CALC',
      promptText: `${dividend} ÷ ${divisor} = ?`,
      promptSubtext: '2けたの わり算',
      correctAnswer: String(quotient),
      distractors: [String(quotient + 1), String(Math.max(1, quotient - 1)), String(quotient + 2), String(quotient + 3)],
      explanationJa: `${dividend} ÷ ${divisor} = ${quotient}`
    });
  },

  // A. Calculations: Order of operations with parentheses & mixed operations (MEXT G4)
  orderOfOperations(seed = 0): QuizQuestion {
    const mode = pickRandom(['ADD_MULT', 'PARENTHESES', 'SUB_DIV']);

    if (mode === 'PARENTHESES') {
      const a = randInt(3, 12);
      const b = randInt(2, 8);
      const c = randInt(3, 7);
      const ans = (a + b) * c;
      const noParenTrap = a + b * c;
      return buildMathQuestion({
        id: `g4_order_paren_${seed}`,
        grade: 'G4',
        domain: 'MATHEMATICAL_RELATIONS',
        promptText: `(${a} + ${b}) × ${c} = ?`,
        promptSubtext: '計算の順序に気をつけよう',
        correctAnswer: String(ans),
        distractors: [String(noParenTrap), String(ans - c), String(ans + c), String((a + b) + c)],
        explanationJa: `（ ）を先に計算: (${a} + ${b}) = ${a + b}。次に ${a + b} × ${c} = ${ans}`
      });
    } else if (mode === 'SUB_DIV') {
      const b = randInt(2, 6);
      const c = randInt(2, 7);
      const a = randInt(b + 5, 30);
      const dividend = b * c;
      const ans = a - b;
      const leftToRightTrap = Math.floor((a - dividend) / c);
      return buildMathQuestion({
        id: `g4_order_div_${seed}`,
        grade: 'G4',
        domain: 'MATHEMATICAL_RELATIONS',
        promptText: `${a} - ${dividend} ÷ ${c} = ?`,
        promptSubtext: '計算の順序に気をつけよう',
        correctAnswer: String(ans),
        distractors: [String(leftToRightTrap), String(ans - 2), String(ans + 2), String(a + b)],
        explanationJa: `わり算を先に計算: ${dividend} ÷ ${c} = ${b}。次に ${a} - ${b} = ${ans}`
      });
    } else {
      const a = randInt(10, 40);
      const b = randInt(2, 6);
      const c = randInt(3, 7);
      const ans = a + b * c;
      const leftToRightTrap = (a + b) * c;
      return buildMathQuestion({
        id: `g4_order_mult_${seed}`,
        grade: 'G4',
        domain: 'MATHEMATICAL_RELATIONS',
        promptText: `${a} + ${b} × ${c} = ?`,
        promptSubtext: '計算の順序に気をつけよう',
        correctAnswer: String(ans),
        distractors: [String(leftToRightTrap), String(ans - 2), String(ans + 2), String(ans + 10)],
        explanationJa: `かけ算を先に計算: ${b} × ${c} = ${b * c}。次に ${a} + ${b * c} = ${ans}`
      });
    }
  },

  // A. Numbers & Calculations: Rounding (四捨五入)
  roundingShishagonyu(seed = 0): QuizQuestion {
    const thousands = randInt(12, 78);
    const hundreds = randInt(1, 9);
    const tens = randInt(10, 99);
    const fullNum = thousands * 1000 + hundreds * 100 + tens;
    const isRoundUp = hundreds >= 5;
    const rounded = isRoundUp ? (thousands + 1) * 1000 : thousands * 1000;
    const wrongRound = isRoundUp ? thousands * 1000 : (thousands + 1) * 1000;

    return buildMathQuestion({
      id: `g4_round_${seed}`,
      grade: 'G4',
      domain: 'NUMBERS_CALC',
      promptText: `${fullNum.toLocaleString()} を 四捨五入して 千の位までに すると？`,
      promptSubtext: '四捨五入して がい数にしよう',
      correctAnswer: rounded.toLocaleString(),
      distractors: [
        wrongRound.toLocaleString(),
        (fullNum - (fullNum % 100)).toLocaleString(),
        ((thousands + 2) * 1000).toLocaleString(),
        (thousands * 1000 + 500).toLocaleString()
      ],
      explanationJa: `百の位の数字が ${hundreds} なので ${isRoundUp ? '切り上げ' : '切り捨て'} となり ${rounded.toLocaleString()} です。`
    });
  },

  // A. Calculations: Decimals to hundredths (+/-)
  decimalsHundredths(seed = 0): QuizQuestion {
    const a = randInt(150, 480) / 100;
    const b = randInt(120, 390) / 100;
    const ans = Math.round((a + b) * 100) / 100;
    return buildMathQuestion({
      id: `g4_dec_hundredths_${seed}`,
      grade: 'G4',
      domain: 'NUMBERS_CALC',
      promptText: `${formatDecimal(a)} + ${formatDecimal(b)} = ?`,
      promptSubtext: '小数のたし算',
      correctAnswer: formatDecimal(ans),
      distractors: [formatDecimal(ans - 0.1), formatDecimal(ans + 0.01), formatDecimal(ans - 0.01), formatDecimal(ans + 0.1)],
      explanationJa: `${formatDecimal(a)} + ${formatDecimal(b)} = ${formatDecimal(ans)}`
    });
  },

  // A. Fractions: Convert improper fraction to mixed fraction
  improperToMixed(seed = 0): QuizQuestion {
    const den = pickRandom([3, 4, 5, 6, 7]);
    const whole = randInt(2, 5);
    const rem = randInt(1, den - 1);
    const num = whole * den + rem;
    const ans = `${whole}と${rem}/${den}`;
    const altRem = rem === den - 1 ? rem - 1 : rem + 1;
    return buildMathQuestion({
      id: `g4_frac_mixed_${seed}`,
      grade: 'G4',
      domain: 'NUMBERS_CALC',
      promptText: `${num}/${den} を 帯分数に直すと？`,
      promptSubtext: '仮分数を 帯分数に変換',
      correctAnswer: ans,
      distractors: [
        `${whole - 1}と${rem}/${den}`,
        `${whole + 1}と${rem}/${den}`,
        `${whole}と${altRem}/${den}`,
        `${whole + 2}と${rem}/${den}`,
        `${num}/${den + 1}`
      ],
      explanationJa: `${num} ÷ ${den} = ${whole} あまり ${rem} なので ${ans}`
    });
  },

  // B. Quantities & Measurements: Area of rectangles & squares (guarantees Area !== Perimeter)
  areaRectangle(seed = 0): QuizQuestion {
    let length = randInt(5, 15);
    let width = randInt(3, length - 1);
    // (L - 2) * (W - 2) === 4 causes Area === Perimeter (e.g. 6x3 or 4x4)
    if ((length - 2) * (width - 2) === 4) {
      length += 1;
    }
    const ans = length * width;
    const perimeterTrap = (length + width) * 2;
    return buildMathQuestion({
      id: `g4_area_rect_${seed}`,
      grade: 'G4',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: `たて ${length}cm, 横 ${width}cm の 長方形の 面積は？`,
      promptSubtext: '長方形の面積',
      correctAnswer: `${ans}cm²`,
      distractors: [`${perimeterTrap}cm²`, `${ans - 4}cm²`, `${ans + length}cm²`, `${perimeterTrap + 2}cm²`],
      explanationJa: `${length} × ${width} = ${ans}cm²`
    });
  },

  // B. Quantities & Measurements: Area units (a, ha, km²)
  areaUnits(seed = 0): QuizQuestion {
    const items = [
      { prompt: '1a（アール）は 何m²？', ans: '100m²', dist: ['10m²', '1000m²', '10000m²', '50m²'] },
      { prompt: '1ha（ヘクタール）は 何a？', ans: '100a', dist: ['10a', '1000a', '10000a', '50a'] },
      { prompt: '1ha は 何m²？', ans: '10000m²', dist: ['1000m²', '100m²', '100000m²', '5000m²'] },
      { prompt: '1km² は 何ha？', ans: '100ha', dist: ['10ha', '1000ha', '10000ha', '50ha'] }
    ];
    const item = pickRandom(items);
    return buildMathQuestion({
      id: `g4_area_unit_${seed}`,
      grade: 'G4',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: item.prompt,
      promptSubtext: '大きな面積の単位',
      correctAnswer: item.ans,
      distractors: item.dist,
      explanationJa: `正解は ${item.ans}`
    });
  },

  // C. Geometrical Figures: Angles, Perpendicular/Parallel & Diagonals (MEXT G4)
  geometryG4(seed = 0): QuizQuestion {
    const items = [
      { prompt: '向かい合う 2組の辺が どちらも平行な四角形は？', ans: '平行四辺形 (へいこうしへんけい)', dist: ['台形', 'ひし形', '直角三角形', '長方形'] },
      { prompt: '向かい合う 1組の辺だけが 平行な四角形は？', ans: '台形 (だいけい)', dist: ['平行四辺形', '長方形', 'ひし形', '正方形'] },
      { prompt: '4つの辺の長さが すべて等しい四角形は？', ans: 'ひし形', dist: ['台形', '長方形', '平行四辺形', '直角三角形'] },
      { prompt: '2本の対角線が 垂直（90°）に交わる四角形は どれ？', ans: 'ひし形', dist: ['長方形', '台形', '平行四辺形', '直角三角形'] },
      { prompt: '2本の対角線の長さが等しい 四角形は どれ？', ans: '長方形', dist: ['平行四辺形', 'ひし形', '台形', '直角三角形'] },
      { prompt: '2本の直線が 直角（90°）に交わっている関係を 何という？', ans: '垂直 (すいちょく)', dist: ['平行 (へいこう)', '合同 (ごうどう)', '対称 (たいしょう)', 'ねじれの位置'] },
      { prompt: '1本の直線に どちらも垂直な 2本の直線の関係は？', ans: '平行 (へいこう)', dist: ['垂直 (すいちょく)', '交差 (こうさ)', 'ねじれの位置', '合同 (ごうどう)'] }
    ];
    const item = pickRandom(items);
    return buildMathQuestion({
      id: `g4_geom_${seed}`,
      grade: 'G4',
      domain: 'GEOMETRIC_FIGURES',
      promptText: item.prompt,
      promptSubtext: '四角形の性質',
      correctAnswer: item.ans,
      distractors: item.dist,
      explanationJa: `正解は ${item.ans}`
    });
  }
};

// ============================================================================
// Grade 5 (第5学年) Generators
// ============================================================================

export const Grade5Generators = {
  // A. Numbers: Greatest Common Divisor (100% Procedural)
  greatestCommonDivisor(seed = 0): QuizQuestion {
    const g = pickRandom([2, 3, 4, 5, 6, 8, 9, 10, 12]);
    const coprimePairs: [number, number][] = [
      [2, 3], [3, 4], [3, 5], [4, 5], [2, 5], [3, 7], [4, 7], [5, 6]
    ];
    const [m1, m2] = pickRandom(coprimePairs);
    const a = g * m1;
    const b = g * m2;
    const ans = String(g);
    const distractors = [
      String(g * 2),
      String(Math.max(1, g - 1)),
      String(g + 1),
      String(m1),
      String(m2),
      String(Math.max(1, Math.floor(g / 2)))
    ];
    return buildMathQuestion({
      id: `g5_gcd_${seed}`,
      grade: 'G5',
      domain: 'NUMBERS_CALC',
      promptText: `${a} と ${b} の 最大公約数は？`,
      promptSubtext: '最大公約数を求めよう',
      correctAnswer: ans,
      distractors,
      explanationJa: `${a} と ${b} の最大公約数は ${g}`
    });
  },

  // A. Numbers: Least Common Multiple (100% Procedural)
  leastCommonMultiple(seed = 0): QuizQuestion {
    const pairs: [number, number][] = [
      [4, 6], [6, 8], [6, 9], [8, 12], [4, 10], [6, 10], [8, 10], [9, 12], [6, 15], [10, 15]
    ];
    const [a, b] = pickRandom(pairs);
    const trueLcm = lcm(a, b);
    const multTrap = a * b; // classic trap!
    const halfTrap = Math.floor(trueLcm / 2);
    const distractors = [
      String(multTrap),
      String(halfTrap),
      String(trueLcm * 2),
      String(trueLcm + Math.min(a, b)),
      String(Math.max(a, b))
    ];
    return buildMathQuestion({
      id: `g5_lcm_${seed}`,
      grade: 'G5',
      domain: 'NUMBERS_CALC',
      promptText: `${a} と ${b} の 最小公倍数は？`,
      promptSubtext: '最小公倍数を求めよう',
      correctAnswer: String(trueLcm),
      distractors,
      explanationJa: `${a} と ${b} の最小公倍数は ${trueLcm}`
    });
  },

  // A. Numbers: Prime numbers (素数判定)
  primeNumbers(seed = 0): QuizQuestion {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
    const composites = [4, 6, 8, 9, 12, 14, 15, 16, 18, 21, 25, 27, 33, 35, 49];
    const targetPrime = pickRandom(primes);
    const chosenComposites = shuffle(composites).slice(0, 4);
    return buildMathQuestion({
      id: `g5_prime_${seed}`,
      grade: 'G5',
      domain: 'NUMBERS_CALC',
      promptText: '次のうち、素数（そすう）は どれ？',
      promptSubtext: '1とその数以外に約数がない数',
      correctAnswer: String(targetPrime),
      distractors: chosenComposites.map(String),
      explanationJa: `${targetPrime} は 1 と ${targetPrime} のみにしか割り切れない素数です。`
    });
  },

  // A. Calculations: Unlike-denominator fractions (+/-) (Mental math friendly denominators)
  fractionsUnlikeDenom(seed = 0): QuizQuestion {
    const denPairs: [number, number][] = [
      [2, 4], [3, 6], [2, 6], [4, 8], [2, 3], [3, 4], [2, 5], [2, 8]
    ];
    const [d1, d2] = pickRandom(denPairs);
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    const commonDen = lcm(d1, d2);
    const sumNum = n1 * (commonDen / d1) + n2 * (commonDen / d2);
    const ans = formatImproperFraction(sumNum, commonDen);
    // Misconceptions:
    const addBothTrap = formatImproperFraction(n1 + n2, d1 + d2);
    const multDenomTrap = `${n1 + n2}/${d1 * d2}`;
    const subNum = Math.abs(n1 * (commonDen / d1) - n2 * (commonDen / d2));
    const subTrap = subNum === 0 ? `1/${commonDen}` : formatImproperFraction(subNum, commonDen);
    const distractors = [
      addBothTrap,
      multDenomTrap,
      subTrap,
      formatImproperFraction(sumNum + 1, commonDen),
      formatImproperFraction(Math.max(1, sumNum - 1), commonDen)
    ];
    return buildMathQuestion({
      id: `g5_frac_unlike_${seed}`,
      grade: 'G5',
      domain: 'NUMBERS_CALC',
      promptText: `${n1}/${d1} + ${n2}/${d2} = ?`,
      promptSubtext: '通分して計算しよう',
      correctAnswer: ans,
      distractors,
      explanationJa: `通分して計算: ${n1 * (commonDen / d1)}/${commonDen} + ${n2 * (commonDen / d2)}/${commonDen} = ${ans}`
    });
  },

  // A. Calculations: Decimal multiplication & division (Clean formatDecimal without trailing zeros)
  decimalsMultDiv(seed = 0): QuizQuestion {
    const isMult = Math.random() < 0.5;
    if (isMult) {
      const a = randInt(12, 45) / 10;
      const b = randInt(12, 25) / 10;
      const ans = Math.round(a * b * 100) / 100;
      return buildMathQuestion({
        id: `g5_dec_mult_${seed}`,
        grade: 'G5',
        domain: 'NUMBERS_CALC',
        promptText: `${formatDecimal(a)} × ${formatDecimal(b)} = ?`,
        promptSubtext: '小数の積（小数点の位置に注意）',
        correctAnswer: formatDecimal(ans),
        distractors: [
          formatDecimal(ans * 10),
          formatDecimal(ans / 10),
          formatDecimal(ans + 0.1),
          formatDecimal(ans - 0.1)
        ],
        explanationJa: `${formatDecimal(a)} × ${formatDecimal(b)} = ${formatDecimal(ans)}`
      });
    } else {
      const b = randInt(12, 35) / 10;
      const q = randInt(2, 6);
      const a = Math.round(b * q * 100) / 100;
      return buildMathQuestion({
        id: `g5_dec_div_${seed}`,
        grade: 'G5',
        domain: 'NUMBERS_CALC',
        promptText: `${formatDecimal(a)} ÷ ${formatDecimal(b)} = ?`,
        promptSubtext: '小数でわる わり算',
        correctAnswer: String(q),
        distractors: [String(q + 1), String(Math.max(1, q - 1)), String(q * 10), String(q + 2)],
        explanationJa: `${formatDecimal(a)} ÷ ${formatDecimal(b)} = ${q}`
      });
    }
  },

  // B. Quantities & Measurements: Area of Triangles & Parallelograms
  areaTrianglesAndParallelograms(seed = 0): QuizQuestion {
    const isTriangle = Math.random() < 0.5;
    const base = randInt(2, 7) * 2; // ensure even for clean integer area
    const height = randInt(3, 10);

    if (isTriangle) {
      const ans = (base * height) / 2;
      const forgotHalfTrap = base * height;
      return buildMathQuestion({
        id: `g5_area_tri_${seed}`,
        grade: 'G5',
        domain: 'QUANTITIES_MEASUREMENT',
        promptText: `底辺 ${base}cm, 高さ ${height}cm の 三角形の面積は？`,
        promptSubtext: '三角形の面積',
        correctAnswer: `${ans}cm²`,
        distractors: [`${forgotHalfTrap}cm²`, `${ans + base}cm²`, `${ans + height}cm²`, `${(base + height) * 2 + 2}cm²`],
        explanationJa: `(${base} × ${height}) ÷ 2 = ${ans}cm²`
      });
    } else {
      const ans = base * height;
      const halfTrap = ans / 2;
      return buildMathQuestion({
        id: `g5_area_para_${seed}`,
        grade: 'G5',
        domain: 'QUANTITIES_MEASUREMENT',
        promptText: `底辺 ${base}cm, 高さ ${height}cm の 平行四辺形の面積は？`,
        promptSubtext: '平行四辺形の面積',
        correctAnswer: `${ans}cm²`,
        distractors: [`${halfTrap}cm²`, `${ans - 4}cm²`, `${(base + height) * 2}cm²`, `${ans + 10}cm²`],
        explanationJa: `${base} × ${height} = ${ans}cm²`
      });
    }
  },

  // B. Quantities & Measurements: Area of Trapezoids & Rhombi (prevents rhombus diagonal collisions)
  areaTrapezoidsAndRhombi(seed = 0): QuizQuestion {
    const isTrapezoid = Math.random() < 0.5;
    if (isTrapezoid) {
      const top = randInt(3, 8);
      const bottom = randInt(top + 2, 14);
      const height = randInt(2, 6) * 2; // ensure even for clean division
      const ans = ((top + bottom) * height) / 2;
      const forgotHalf = (top + bottom) * height;
      return buildMathQuestion({
        id: `g5_area_trap_${seed}`,
        grade: 'G5',
        domain: 'QUANTITIES_MEASUREMENT',
        promptText: `上底 ${top}cm, 下底 ${bottom}cm, 高さ ${height}cm の 台形の面積は？`,
        promptSubtext: '台形の面積',
        correctAnswer: `${ans}cm²`,
        distractors: [`${forgotHalf}cm²`, `${ans + 10}cm²`, `${top * height}cm²`, `${ans - 6}cm²`],
        explanationJa: `(${top} + ${bottom}) × ${height} ÷ 2 = ${ans}cm²`
      });
    } else {
      const d1Options = [4, 6, 8, 10, 12];
      const d1 = pickRandom(d1Options);
      const d2 = pickRandom(d1Options.filter(d => d !== d1)); // guarantee d1 !== d2
      const ans = (d1 * d2) / 2;
      return buildMathQuestion({
        id: `g5_area_rhom_${seed}`,
        grade: 'G5',
        domain: 'QUANTITIES_MEASUREMENT',
        promptText: `2本の対角線の長さが ${d1}cm と ${d2}cm の ひし形の面積は？`,
        promptSubtext: 'ひし形の面積',
        correctAnswer: `${ans}cm²`,
        distractors: [`${d1 * d2}cm²`, `${ans + 8}cm²`, `${Math.max(4, ans - 6)}cm²`, `${(d1 + d2) * 2 + 2}cm²`],
        explanationJa: `(${d1} × ${d2}) ÷ 2 = ${ans}cm²`
      });
    }
  },

  // B. Quantities & Measurements: Circumference using pi = 3.14 (Clean formatDecimal, mental math friendly)
  circumferencePi(seed = 0): QuizQuestion {
    const d = pickRandom([5, 10, 20, 30]);
    const ansNum = Math.round(d * 3.14 * 100) / 100;
    const ans = `${formatDecimal(ansNum)}cm`;
    const distractors = [
      `${formatDecimal(d * 2 * 3.14)}cm`,
      `${formatDecimal(d * 3)}cm`,
      `${formatDecimal((d * 3.14) / 2)}cm`,
      `${formatDecimal(d * 3.14 + 3.14)}cm`
    ];
    return buildMathQuestion({
      id: `g5_circ_pi_${seed}`,
      grade: 'G5',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: `直径 ${d}cm の 円の 円周の長さは？ (円周率は 3.14)`,
      promptSubtext: '円周の長さ',
      correctAnswer: ans,
      distractors,
      explanationJa: `円周 = ${d} × 3.14 = ${ans}`
    });
  },

  // D. Mathematical Relations: Percentages (%) & Buai (割・分)
  percentagesAndBuai(seed = 0): QuizQuestion {
    const modes = [
      {
        prompt: '定価 2000円 の 品物を 30%引き で 買いました。代金は いくら？',
        ans: '1400円',
        dist: ['600円', '1700円', '1600円', '1300円'],
        exp: '2000 × (1 - 0.3) = 1400円'
      },
      {
        prompt: '定価 1500円 の 20% は いくら？',
        ans: '300円',
        dist: ['1200円', '30円', '1300円', '250円'],
        exp: '1500 × 0.2 = 300円'
      },
      {
        prompt: '歩合（ぶあい）の「3割5分」を 百分率（%）で表すと？',
        ans: '35%',
        dist: ['3.5%', '350%', '30.5%', '355%'],
        exp: '1割 = 10%, 1分 = 1% なので 35%'
      },
      {
        prompt: '全体の 0.75 を 百分率（%）で表すと？',
        ans: '75%',
        dist: ['7.5%', '0.75%', '750%', '70%'],
        exp: '0.75 × 100 = 75%'
      }
    ];
    const m = pickRandom(modes);
    return buildMathQuestion({
      id: `g5_percent_${seed}`,
      grade: 'G5',
      domain: 'MATHEMATICAL_RELATIONS',
      promptText: m.prompt,
      promptSubtext: '割合と百分率（%）',
      correctAnswer: m.ans,
      distractors: m.dist,
      explanationJa: m.exp
    });
  }
};

// ============================================================================
// Grade 6 (第6学年) Generators
// ============================================================================

export const Grade6Generators = {
  // A. Calculations: Fraction multiplication (100% Procedural)
  fractionMultiplication(seed = 0): QuizQuestion {
    const d1 = pickRandom([2, 3, 4, 5, 6, 7]);
    const n1 = randInt(1, d1 - 1);
    const d2 = pickRandom([2, 3, 4, 5, 6, 7]);
    const n2 = randInt(1, d2 - 1);
    const rawNum = n1 * n2;
    const rawDen = d1 * d2;
    const ans = formatImproperFraction(rawNum, rawDen);
    // Traps:
    const addTrap = formatImproperFraction(n1 + n2, d1 + d2);
    const crossTrap = formatImproperFraction(n1 * d2, d1 * n2);
    const unsimplifiedTrap = `${rawNum}/${rawDen}`;
    const distractors = [
      addTrap,
      crossTrap,
      unsimplifiedTrap,
      formatImproperFraction(rawNum + 1, rawDen),
      formatImproperFraction(Math.max(1, rawNum - 1), rawDen)
    ];
    return buildMathQuestion({
      id: `g6_frac_mult_${seed}`,
      grade: 'G6',
      domain: 'NUMBERS_CALC',
      promptText: `${n1}/${d1} × ${n2}/${d2} = ?`,
      promptSubtext: '分数のかけ算',
      correctAnswer: ans,
      distractors,
      explanationJa: `(${n1}×${n2}) / (${d1}×${d2}) = ${ans}`
    });
  },

  // A. Calculations: Fraction division (100% Procedural)
  fractionDivision(seed = 0): QuizQuestion {
    const d1 = pickRandom([2, 3, 4, 5, 6, 7]);
    const n1 = randInt(1, d1 - 1);
    const d2 = pickRandom([2, 3, 4, 5, 6, 7]);
    const n2 = randInt(1, d2 - 1);
    const ans = formatImproperFraction(n1 * d2, d1 * n2);
    // Traps:
    const multDirectTrap = formatImproperFraction(n1 * n2, d1 * d2); // forgot reciprocal!
    const invertedAnsTrap = formatImproperFraction(d1 * n2, n1 * d2);
    const distractors = [
      multDirectTrap,
      invertedAnsTrap,
      `${n1 * d2}/${d1 * n2}`,
      formatImproperFraction(n1 * d2 + 1, d1 * n2),
      formatImproperFraction(Math.max(1, n1 * d2 - 1), d1 * n2)
    ];
    return buildMathQuestion({
      id: `g6_frac_div_${seed}`,
      grade: 'G6',
      domain: 'NUMBERS_CALC',
      promptText: `${n1}/${d1} ÷ ${n2}/${d2} = ?`,
      promptSubtext: '分数のわり算',
      correctAnswer: ans,
      distractors,
      explanationJa: `${n1}/${d1} ÷ ${n2}/${d2} = ${n1}/${d1} × ${d2}/${n2} = ${ans}`
    });
  },

  // B. Quantities & Measurements: Area of a circle (excludes r=2 to prevent circumference collision)
  circleArea(seed = 0): QuizQuestion {
    const r = pickRandom([3, 4, 5, 6, 8, 10]); // r !== 2 ensures area !== circumference
    const ansNum = Math.round(r * r * 3.14 * 100) / 100;
    const ans = `${formatDecimal(ansNum)}cm²`;
    const circumferenceTrap = `${formatDecimal(2 * r * 3.14)}cm²`;
    const distractors = [
      circumferenceTrap,
      `${formatDecimal(r * r * 3)}cm²`,
      `${formatDecimal(r * 2 * 3.14 * 2)}cm²`,
      `${formatDecimal(ansNum * 2)}cm²`
    ];
    return buildMathQuestion({
      id: `g6_circle_area_${seed}`,
      grade: 'G6',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: `半径 ${r}cm の 円の 面積は？ (円周率は 3.14)`,
      promptSubtext: '円の面積',
      correctAnswer: ans,
      distractors,
      explanationJa: `${r} × ${r} × 3.14 = ${ans}`
    });
  },

  // B. Quantities & Measurements: Speed, Distance, and Time (direct single-step formula questions)
  speedCalculations(seed = 0): QuizQuestion {
    const modes = [
      {
        prompt: '180km の道のりを 3時間で走った自動車の 時速は？',
        ans: '時速 60km',
        dist: ['時速 540km', '時速 50km', '時速 180km', '時速 30km'],
        exp: '速さ = 道のり ÷ 時間 = 180 ÷ 3 = 時速 60km'
      },
      {
        prompt: '時速 50km で 4時間 走ると、進む道のりは 何km？',
        ans: '200km',
        dist: ['12.5km', '250km', '150km', '100km'],
        exp: '道のり = 速さ × 時間 = 50 × 4 = 200km'
      },
      {
        prompt: '分速 80m で 1600m の道のりを歩くと、かかる時間は 何分？',
        ans: '20分',
        dist: ['12分', '200分', '128分', '40分'],
        exp: '時間 = 道のり ÷ 速さ = 1600 ÷ 80 = 20分'
      },
      {
        prompt: '分速 300m の 自転車が 10分間 走ると、進む道のりは 何m？',
        ans: '3000m',
        dist: ['300m', '30m', '1500m', '6000m'],
        exp: '道のり = 速さ × 時間 = 300 × 10 = 3000m'
      }
    ];
    const m = pickRandom(modes);
    return buildMathQuestion({
      id: `g6_speed_${seed}`,
      grade: 'G6',
      domain: 'QUANTITIES_MEASUREMENT',
      promptText: m.prompt,
      promptSubtext: '速さ・道のり・時間の関係',
      correctAnswer: m.ans,
      distractors: m.dist,
      explanationJa: m.exp
    });
  },

  // D. Mathematical Relations: Ratios (比を簡単にする & 比配分)
  ratios(seed = 0): QuizQuestion {
    const modes = [
      {
        prompt: '比「12 : 18」を 最も簡単な整数の比に直すと？',
        ans: '2 : 3',
        dist: ['3 : 2', '6 : 9', '1 : 2', '4 : 6'],
        exp: '最大公約数の 6 で割って 2 : 3'
      },
      {
        prompt: '比「24 : 36」を 最も簡単な整数の比に直すと？',
        ans: '2 : 3',
        dist: ['4 : 6', '12 : 18', '3 : 2', '1 : 3'],
        exp: '最大公約数の 12 で割って 2 : 3'
      },
      {
        prompt: '「3 : 5 = 12 : □」にあてはまる数は？',
        ans: '20',
        dist: ['15', '25', '18', '30'],
        exp: '前項が 4倍なので 後項も 4倍: 5 × 4 = 20'
      },
      {
        prompt: '1500円を 2 : 3 に分けると、少ない方の金額は？',
        ans: '600円',
        dist: ['900円', '500円', '750円', '300円'],
        exp: '1500 × 2/(2+3) = 600円'
      }
    ];
    const m = pickRandom(modes);
    return buildMathQuestion({
      id: `g6_ratio_${seed}`,
      grade: 'G6',
      domain: 'MATHEMATICAL_RELATIONS',
      promptText: m.prompt,
      promptSubtext: '比の性質と簡単な比',
      correctAnswer: m.ans,
      distractors: m.dist,
      explanationJa: m.exp
    });
  },

  // C. Geometrical Figures: Symmetry (線対称・点対称)
  symmetryG6(seed = 0): QuizQuestion {
    const items = [
      {
        prompt: '正方形の 対称の軸（線対称）は 何本ある？',
        ans: '4本',
        dist: ['2本', '1本', '8本', '0本'],
        exp: '縦・横・対角線2本の 合計 4本'
      },
      {
        prompt: '正三角形の 対称の軸（線対称）は 何本ある？',
        ans: '3本',
        dist: ['1本', '2本', '6本', '0本'],
        exp: '各頂点から対辺の中点への 3本'
      },
      {
        prompt: '次のうち、「点対称」な図形は どれ？',
        ans: '平行四辺形',
        dist: ['正三角形', '台形', '二等辺三角形', '五角形'],
        exp: '平行四辺形は 180°回転させるとぴったり重なる点対称な図形です。'
      },
      {
        prompt: '円の 対称の軸（線対称）は 何本ある？',
        ans: '無数にある (何本でも)',
        dist: ['1本', '2本', '360本', '100本'],
        exp: '円の中心を通る直線はすべて対称の軸になります。'
      }
    ];
    const item = pickRandom(items);
    return buildMathQuestion({
      id: `g6_symm_${seed}`,
      grade: 'G6',
      domain: 'GEOMETRIC_FIGURES',
      promptText: item.prompt,
      promptSubtext: '線対称と点対称',
      correctAnswer: item.ans,
      distractors: item.dist,
      explanationJa: item.exp
    });
  },

  // D. Mathematical Relations: Permutations & Combinations (場合の数)
  possibleOutcomes(seed = 0): QuizQuestion {
    const modes = [
      {
        prompt: '赤・青・黄・白 の 4枚のカードを一列に並べる並べ方は 何通り？',
        ans: '24通り',
        dist: ['12通り', '16通り', '48通り', '6通り'],
        exp: '4 × 3 × 2 × 1 = 24通り'
      },
      {
        prompt: '4つの野球チームが 総当たり（リーグ戦）をするとき、全部で 何試合？',
        ans: '6試合',
        dist: ['12試合', '8試合', '4試合', '16試合'],
        exp: '(4 × 3) ÷ 2 = 6試合'
      },
      {
        prompt: '大・小 2つのサイコロを同時に振るとき、目の出方は 何通り？',
        ans: '36通り',
        dist: ['12通り', '24通り', '18通り', '64通り'],
        exp: '6 × 6 = 36通り'
      }
    ];
    const m = pickRandom(modes);
    return buildMathQuestion({
      id: `g6_outcomes_${seed}`,
      grade: 'G6',
      domain: 'MATHEMATICAL_RELATIONS',
      promptText: m.prompt,
      promptSubtext: '場合の数（並べ方と組み合わせ）',
      correctAnswer: m.ans,
      distractors: m.dist,
      explanationJa: m.exp
    });
  }
};

// ============================================================================
// Master Generator Registry & Dispatcher
// ============================================================================

export type TopicGeneratorFn = (seed: number) => QuizQuestion;

export interface RegisteredTopic {
  id: string;
  grade: MathGrade;
  domain: MathDomain;
  titleJa: string;
  titleEn: string;
  generator: TopicGeneratorFn;
}

export const TOPIC_REGISTRY: RegisteredTopic[] = [
  // Grade 1
  { id: 'g1_add_nocarry', grade: 'G1', domain: 'NUMBERS_CALC', titleJa: 'くり上がりのないたし算', titleEn: '1-Digit Addition (No carry)', generator: Grade1Generators.addNoCarry },
  { id: 'g1_add_carry', grade: 'G1', domain: 'NUMBERS_CALC', titleJa: 'くり上がりのあるたし算', titleEn: '1-Digit Addition (With carry)', generator: Grade1Generators.addWithCarry },
  { id: 'g1_sub_noborrow', grade: 'G1', domain: 'NUMBERS_CALC', titleJa: 'くり下がりのないひき算', titleEn: '1-Digit Subtraction (No borrow)', generator: Grade1Generators.subNoBorrow },
  { id: 'g1_sub_borrow', grade: 'G1', domain: 'NUMBERS_CALC', titleJa: 'くり下がりのあるひき算', titleEn: 'Subtraction with Borrowing', generator: Grade1Generators.subWithBorrow },
  { id: 'g1_bonds10', grade: 'G1', domain: 'NUMBERS_CALC', titleJa: '10の合成と分解', titleEn: 'Number Bonds of 10', generator: Grade1Generators.numberBonds10 },
  { id: 'g1_tens', grade: 'G1', domain: 'NUMBERS_CALC', titleJa: '何十のたし算', titleEn: 'Tens Addition (30 + 40)', generator: Grade1Generators.tensAddition },
  { id: 'g1_clock', grade: 'G1', domain: 'QUANTITIES_MEASUREMENT', titleJa: '時計の読み方（時・半）', titleEn: 'Clock Reading (Hour & Half-hour)', generator: Grade1Generators.clockReading },
  { id: 'g1_shapes', grade: 'G1', domain: 'GEOMETRIC_FIGURES', titleJa: 'かたち（三角・四角・丸）', titleEn: 'Basic Shapes (Triangles, Squares, Circles)', generator: Grade1Generators.shapesG1 },

  // Grade 2
  { id: 'g2_add2d', grade: 'G2', domain: 'NUMBERS_CALC', titleJa: '2けたのたし算の筆算', titleEn: '2-Digit Addition (Column carry)', generator: Grade2Generators.add2DigitCarry },
  { id: 'g2_sub2d', grade: 'G2', domain: 'NUMBERS_CALC', titleJa: '2けたのひき算の筆算', titleEn: '2-Digit Subtraction (Column borrow)', generator: Grade2Generators.sub2DigitBorrow },
  { id: 'g2_kuku', grade: 'G2', domain: 'NUMBERS_CALC', titleJa: 'かけ算九九 (9×9)', titleEn: 'Multiplication Tables (Ku-Ku)', generator: Grade2Generators.kukuTable },
  { id: 'g2_kuku_rev', grade: 'G2', domain: 'NUMBERS_CALC', titleJa: '虫食い九九 (□ × 7 = 42)', titleEn: 'Missing Factor Ku-Ku', generator: Grade2Generators.kukuMissingFactor },
  { id: 'g2_unit_len', grade: 'G2', domain: 'QUANTITIES_MEASUREMENT', titleJa: '長さの単位 (m, cm, mm)', titleEn: 'Length Units (m, cm, mm)', generator: Grade2Generators.unitsLength },
  { id: 'g2_unit_vol', grade: 'G2', domain: 'QUANTITIES_MEASUREMENT', titleJa: '水のかさ (L, dL, mL)', titleEn: 'Volume Units (L, dL, mL)', generator: Grade2Generators.unitsVolume },
  { id: 'g2_time', grade: 'G2', domain: 'QUANTITIES_MEASUREMENT', titleJa: '時間と日・分・秒', titleEn: 'Time Units (Days, Hours, Minutes, Seconds)', generator: Grade2Generators.unitsTime },
  { id: 'g2_geom', grade: 'G2', domain: 'GEOMETRIC_FIGURES', titleJa: '正方形・長方形・直角三角形', titleEn: '2D Geometry & Right Triangles', generator: Grade2Generators.geometryG2 },

  // Grade 3
  { id: 'g3_div_exact', grade: 'G3', domain: 'NUMBERS_CALC', titleJa: 'わり算の基本 (割り切れる)', titleEn: 'Exact Division', generator: Grade3Generators.divisionExact },
  { id: 'g3_div_rem', grade: 'G3', domain: 'NUMBERS_CALC', titleJa: 'あまりのあるわり算', titleEn: 'Division with Remainders', generator: Grade3Generators.divisionWithRemainder },
  { id: 'g3_mult2d', grade: 'G3', domain: 'NUMBERS_CALC', titleJa: '2けた×1けたのかけ算', titleEn: '2-Digit by 1-Digit Multiplication', generator: Grade3Generators.mult2DigitBy1Digit },
  { id: 'g3_dec_add', grade: 'G3', domain: 'NUMBERS_CALC', titleJa: '小数第1位のたし算・ひき算', titleEn: 'Decimals in Tenths (+/-)', generator: Grade3Generators.decimalTenths },
  { id: 'g3_frac_add', grade: 'G3', domain: 'NUMBERS_CALC', titleJa: '分母が同じ分数のたし算', titleEn: 'Like-Denominator Fractions', generator: Grade3Generators.fractionCommonDenom },
  { id: 'g3_unit_w', grade: 'G3', domain: 'QUANTITIES_MEASUREMENT', titleJa: '重さ(g, kg, t)と長さ(km, m)', titleEn: 'Weight & Distance Units', generator: Grade3Generators.unitsWeightAndDistance },
  { id: 'g3_elapsed', grade: 'G3', domain: 'QUANTITIES_MEASUREMENT', titleJa: '経過時間の計算', titleEn: 'Elapsed Time Calculations', generator: Grade3Generators.elapsedTime },
  { id: 'g3_circle', grade: 'G3', domain: 'GEOMETRIC_FIGURES', titleJa: '円の半径と直径・球', titleEn: 'Circles & Spheres (Radius / Diameter)', generator: Grade3Generators.circlesAndTriangles },

  // Grade 4
  { id: 'g4_div2d', grade: 'G4', domain: 'NUMBERS_CALC', titleJa: '2けたでわるわり算', titleEn: 'Division by 2-Digit Numbers', generator: Grade4Generators.division2DigitDivisor },
  { id: 'g4_order_ops', grade: 'G4', domain: 'MATHEMATICAL_RELATIONS', titleJa: '四則混合の計算の順序', titleEn: 'Order of Operations & Parentheses', generator: Grade4Generators.orderOfOperations },
  { id: 'g4_round', grade: 'G4', domain: 'NUMBERS_CALC', titleJa: '四捨五入・がい数', titleEn: 'Rounding (Shishagonyu)', generator: Grade4Generators.roundingShishagonyu },
  { id: 'g4_dec_hundredths', grade: 'G4', domain: 'NUMBERS_CALC', titleJa: '小数第2位の計算', titleEn: 'Decimals to Hundredths', generator: Grade4Generators.decimalsHundredths },
  { id: 'g4_frac_mixed', grade: 'G4', domain: 'NUMBERS_CALC', titleJa: '仮分数と帯分数の変換', titleEn: 'Improper & Mixed Fractions', generator: Grade4Generators.improperToMixed },
  { id: 'g4_area_rect', grade: 'G4', domain: 'QUANTITIES_MEASUREMENT', titleJa: '長方形と正方形の面積', titleEn: 'Rectangle & Square Area', generator: Grade4Generators.areaRectangle },
  { id: 'g4_area_unit', grade: 'G4', domain: 'QUANTITIES_MEASUREMENT', titleJa: '面積の単位 (a, ha, km²)', titleEn: 'Area Units (a, ha, km²)', generator: Grade4Generators.areaUnits },
  { id: 'g4_geom', grade: 'G4', domain: 'GEOMETRIC_FIGURES', titleJa: '平行四辺形・台形・ひし形と角度', titleEn: 'Quadrilateral Properties & Angles', generator: Grade4Generators.geometryG4 },

  // Grade 5
  { id: 'g5_gcd', grade: 'G5', domain: 'NUMBERS_CALC', titleJa: '最大公約数 (GCD)', titleEn: 'Greatest Common Divisor', generator: Grade5Generators.greatestCommonDivisor },
  { id: 'g5_lcm', grade: 'G5', domain: 'NUMBERS_CALC', titleJa: '最小公倍数 (LCM)', titleEn: 'Least Common Multiple', generator: Grade5Generators.leastCommonMultiple },
  { id: 'g5_prime', grade: 'G5', domain: 'NUMBERS_CALC', titleJa: '素数の見分け方', titleEn: 'Prime Number Identification', generator: Grade5Generators.primeNumbers },
  { id: 'g5_frac_unlike', grade: 'G5', domain: 'NUMBERS_CALC', titleJa: '分母がちがう分数のたし算 (通分)', titleEn: 'Fractions with Unlike Denominators', generator: Grade5Generators.fractionsUnlikeDenom },
  { id: 'g5_dec_mult', grade: 'G5', domain: 'NUMBERS_CALC', titleJa: '小数の乗法・除法', titleEn: 'Decimal Multiplication & Division', generator: Grade5Generators.decimalsMultDiv },
  { id: 'g5_area_tri', grade: 'G5', domain: 'QUANTITIES_MEASUREMENT', titleJa: '三角形・平行四辺形の面積', titleEn: 'Triangle & Parallelogram Area', generator: Grade5Generators.areaTrianglesAndParallelograms },
  { id: 'g5_area_trap', grade: 'G5', domain: 'QUANTITIES_MEASUREMENT', titleJa: '台形・ひし形の面積', titleEn: 'Trapezoid & Rhombus Area', generator: Grade5Generators.areaTrapezoidsAndRhombi },
  { id: 'g5_circ_pi', grade: 'G5', domain: 'QUANTITIES_MEASUREMENT', titleJa: '円周と円周率 (3.14)', titleEn: 'Circumference & Pi (3.14)', generator: Grade5Generators.circumferencePi },
  { id: 'g5_percent', grade: 'G5', domain: 'MATHEMATICAL_RELATIONS', titleJa: '割合(%)と歩合（割・分・厘）', titleEn: 'Percentages & Buai (Discount Calculations)', generator: Grade5Generators.percentagesAndBuai },

  // Grade 6
  { id: 'g6_frac_mult', grade: 'G6', domain: 'NUMBERS_CALC', titleJa: '分数のかけ算', titleEn: 'Fraction Multiplication', generator: Grade6Generators.fractionMultiplication },
  { id: 'g6_frac_div', grade: 'G6', domain: 'NUMBERS_CALC', titleJa: '分数のわり算と逆数', titleEn: 'Fraction Division & Reciprocals', generator: Grade6Generators.fractionDivision },
  { id: 'g6_circle_area', grade: 'G6', domain: 'QUANTITIES_MEASUREMENT', titleJa: '円の面積 (r × r × 3.14)', titleEn: 'Circle Area (r × r × 3.14)', generator: Grade6Generators.circleArea },
  { id: 'g6_speed', grade: 'G6', domain: 'QUANTITIES_MEASUREMENT', titleJa: '速さ・時間・道のりと単位換算', titleEn: 'Speed, Distance, Time & Conversions', generator: Grade6Generators.speedCalculations },
  { id: 'g6_ratio', grade: 'G6', domain: 'MATHEMATICAL_RELATIONS', titleJa: '比と比の値・比例配分', titleEn: 'Ratios & Proportional Distribution', generator: Grade6Generators.ratios },
  { id: 'g6_symm', grade: 'G6', domain: 'GEOMETRIC_FIGURES', titleJa: '線対称と点対称', titleEn: 'Line Symmetry & Point Symmetry', generator: Grade6Generators.symmetryG6 },
  { id: 'g6_outcomes', grade: 'G6', domain: 'MATHEMATICAL_RELATIONS', titleJa: '場合の数（並べ方・組み合わせ）', titleEn: 'Permutations & Combinations', generator: Grade6Generators.possibleOutcomes }
];

export function getTopicsForGrade(grade: MathGrade, domain?: MathDomain): RegisteredTopic[] {
  return TOPIC_REGISTRY.filter(t => t.grade === grade && (!domain || domain === 'ALL' || t.domain === domain));
}

/**
 * Main procedural entry point for Math Arena.
 * Generates an arbitrary number of grade-appropriate, MEXT-calibrated questions.
 */
export function generateMathQuestions(options: MathGeneratorOptions): QuizQuestion[] {
  const { grade, domain = 'ALL', topicId, questionCount, timeLimitMs = 15000 } = options;

  let eligibleTopics = TOPIC_REGISTRY.filter(t => t.grade === grade);

  if (topicId) {
    const specific = eligibleTopics.filter(t => t.id === topicId);
    if (specific.length > 0) eligibleTopics = specific;
  } else if (domain !== 'ALL') {
    const domainSpecific = eligibleTopics.filter(t => t.domain === domain);
    if (domainSpecific.length > 0) eligibleTopics = domainSpecific;
  }

  if (eligibleTopics.length === 0) {
    eligibleTopics = TOPIC_REGISTRY.filter(t => t.grade === grade);
  }

  const count = questionCount === -1 ? 40 : (questionCount ?? 20);
  const questions: QuizQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const topic = eligibleTopics[i % eligibleTopics.length];
    const q = topic.generator(i + 1);
    q.questionIndex = i;
    q.totalQuestions = count;
    q.timeLimitMs = timeLimitMs;
    q.isMath = true;
    q.mathGrade = grade;
    q.mathDomain = topic.domain;
    q.mathTopicId = topic.id;
    questions.push(q);
  }

  return shuffle(questions).map((q, idx) => ({
    ...q,
    questionIndex: idx,
    totalQuestions: count
  }));
}
