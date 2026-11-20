import type { QuizOption, QuizQuestion } from './types';

export interface ResolvedOptionStyle {
  bg: string;
  hoverBg: string;
  border: string;
  textClass: string;
  subTextClass: string;
  badgeClass: string;
  isOverridden: boolean;
}

interface ColorPaletteEntry {
  bg: string;
  hoverBg: string;
  border: string;
  isLight: boolean;
}

const COLOR_PALETTE: Record<string, ColorPaletteEntry> = {
  red: { bg: 'bg-red-600', hoverBg: 'hover:bg-red-700', border: 'border-red-800', isLight: false },
  blue: { bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-700', border: 'border-blue-800', isLight: false },
  yellow: { bg: 'bg-yellow-400', hoverBg: 'hover:bg-yellow-500', border: 'border-yellow-600', isLight: true },
  green: { bg: 'bg-green-600', hoverBg: 'hover:bg-green-700', border: 'border-green-800', isLight: false },
  orange: { bg: 'bg-orange-500', hoverBg: 'hover:bg-orange-600', border: 'border-orange-700', isLight: false },
  pink: { bg: 'bg-pink-400', hoverBg: 'hover:bg-pink-500', border: 'border-pink-600', isLight: true },
  purple: { bg: 'bg-purple-600', hoverBg: 'hover:bg-purple-700', border: 'border-purple-800', isLight: false },
  brown: { bg: 'bg-amber-800', hoverBg: 'hover:bg-amber-900', border: 'border-amber-950', isLight: false },
  black: { bg: 'bg-neutral-900', hoverBg: 'hover:bg-neutral-950', border: 'border-neutral-700', isLight: false },
  white: { bg: 'bg-white', hoverBg: 'hover:bg-slate-100', border: 'border-slate-300', isLight: true },
  gray: { bg: 'bg-slate-500', hoverBg: 'hover:bg-slate-600', border: 'border-slate-700', isLight: false },
  grey: { bg: 'bg-slate-500', hoverBg: 'hover:bg-slate-600', border: 'border-slate-700', isLight: false },
  'light blue': { bg: 'bg-sky-400', hoverBg: 'hover:bg-sky-500', border: 'border-sky-600', isLight: true },
  'dark blue': { bg: 'bg-blue-900', hoverBg: 'hover:bg-blue-950', border: 'border-blue-950', isLight: false },
  'light green': { bg: 'bg-lime-400', hoverBg: 'hover:bg-lime-500', border: 'border-lime-600', isLight: true },
  gold: { bg: 'bg-amber-400', hoverBg: 'hover:bg-amber-500', border: 'border-amber-600', isLight: true },
  silver: { bg: 'bg-slate-300', hoverBg: 'hover:bg-slate-400', border: 'border-slate-500', isLight: true },
  beige: { bg: 'bg-amber-100', hoverBg: 'hover:bg-amber-200', border: 'border-amber-300', isLight: true },
};

const NEUTRAL_STYLE: ResolvedOptionStyle = {
  bg: 'bg-slate-100 dark:bg-slate-800',
  hoverBg: 'hover:bg-slate-200 dark:hover:bg-slate-700',
  border: 'border-slate-300 dark:border-slate-600',
  textClass: 'text-slate-950 dark:text-white',
  subTextClass: 'text-slate-700 dark:text-slate-300',
  badgeClass: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white',
  isOverridden: true,
};

function normalizeColorKey(raw?: string): string {
  return (raw || '').trim().toLowerCase().replace(/[.!?]/g, '');
}

/**
 * Returns true when at least 2 options are color words, avoiding false positives
 * on single-word overlaps like "orange" in a fruits unit.
 */
export function isColorQuestion(question: Pick<QuizQuestion, 'options'>): boolean {
  if (!question?.options || question.options.length < 2) return false;
  let colorMatches = 0;
  for (const opt of question.options) {
    if (COLOR_PALETTE[normalizeColorKey(opt.english)]) {
      colorMatches++;
      if (colorMatches >= 2) return true;
    }
  }
  return false;
}

/**
 * Hybrid anti-Stroop styling for color questions:
 * - AUDIO_ONLY: color-matched button backgrounds so pre-readers can match by ear.
 * - Visual/text prompts: neutral slate/white cards so button colors never clash with the prompt.
 * - Non-color questions: returns null (caller uses standard OPTION_STYLES).
 */
export function resolveColorQuestionStyle(
  question: Pick<QuizQuestion, 'promptType' | 'options'>,
  option: Pick<QuizOption, 'english'>
): ResolvedOptionStyle | null {
  if (!isColorQuestion(question)) return null;

  if (question.promptType === 'AUDIO_ONLY') {
    const matched = COLOR_PALETTE[normalizeColorKey(option.english)];
    if (matched) {
      return {
        bg: matched.bg,
        hoverBg: matched.hoverBg,
        border: matched.border,
        textClass: matched.isLight ? 'text-slate-950' : 'text-white',
        subTextClass: matched.isLight ? 'text-slate-800' : 'text-white/90',
        badgeClass: matched.isLight ? 'bg-black/15 text-slate-950' : 'bg-black/25 text-white',
        isOverridden: true,
      };
    }
  }

  return NEUTRAL_STYLE;
}
