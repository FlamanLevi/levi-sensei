import type { QuizOption, QuizQuestion } from './types';

/** Small deterministic PRNG so a student's layout is stable across reloads. */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic slot (0..n-1) for the correct answer at `qIndex`.
 * Never allows the same slot three times in a row (two in a row is the max).
 */
export function getCorrectSlot(seed: string, qIndex: number, n: number): number {
  const rng = mulberry32(hashString(`${seed}:slots`));
  let prev1 = -1;
  let prev2 = -1;
  let pick = 0;
  for (let i = 0; i <= qIndex; i++) {
    const blocked = prev1 !== -1 && prev1 === prev2 ? prev1 : -1;
    const allowed: number[] = [];
    for (let s = 0; s < n; s++) if (s !== blocked) allowed.push(s);
    pick = allowed[Math.floor(rng() * allowed.length)];
    prev2 = prev1;
    prev1 = pick;
  }
  return pick;
}

/**
 * Re-arranges answer choices so the correct one lands on the deterministic slot for
 * this seed/question. Shape badges and colors stay tied to screen position.
 */
export function arrangeOptions(
  options: QuizOption[],
  correctId: string,
  seed: string,
  qIndex: number,
  shuffleDistractors: boolean
): QuizOption[] {
  const n = options.length;
  if (n < 2) return options;
  const correct = options.find((o) => o.id === correctId);
  if (!correct) return options;

  let distractors = options.filter((o) => o.id !== correctId);
  if (shuffleDistractors) {
    const rng = mulberry32(hashString(`${seed}:d:${qIndex}`));
    distractors = [...distractors];
    for (let i = distractors.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
    }
  }

  const slot = getCorrectSlot(seed, qIndex, n);
  const ordered: QuizOption[] = [];
  let di = 0;
  for (let s = 0; s < n; s++) {
    ordered.push(s === slot ? correct : distractors[di++]);
  }
  return ordered.map((opt, i) => ({ ...opt, symbol: options[i]!.symbol, color: options[i]!.color }));
}

/** Per-student version of a question: same content, private answer layout. */
export function personalizeQuestion(question: QuizQuestion, seed: string): QuizQuestion {
  if (!question?.options || question.options.length < 2) return question;
  return {
    ...question,
    options: arrangeOptions(question.options, question.correctOptionId ?? '', seed, question.questionIndex ?? 0, true),
  };
}
