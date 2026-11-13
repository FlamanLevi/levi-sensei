import { GradeLevel, VocabularyItem } from '@data/types';
import { SchoolId } from '@/types/roster';
import {
  EnglishReadingAid,
  GameMode,
  QuizPlayer,
  TeamId,
} from '@/games/quiz/types';

export type AnticipationLoopMode = 'QUICK_ROUNDS' | 'SPIRAL_BOARD';
export type AnticipationDrawStyle = 'INK_SKETCH' | 'CONNECT_DOTS' | 'MIXED';
export type AnticipationInputMode = 'AUTO_GRADE' | 'CHOICE_4' | 'SPELLING_TILES';
export type AnticipationEffectiveInputMode = 'CHOICE_4' | 'SPELLING_TILES';
export type AnticipationRoundPhase = 'DRAWING' | 'ROUND_REVEAL';

export type PiecePresetId = 'shoes' | 'trumpet' | 'teddy' | 'ice_cream';

export interface PiecePreset {
  id: PiecePresetId;
  emoji: string;
  nameEn: string;
  nameJa: string;
  ruby?: { base: string; ruby: string }[];
  colorHex: string;
  badgeBg: string;
  borderClass: string;
  textClass: string;
  mappedTeamId: TeamId;
}

export const PIECE_PRESETS: Record<PiecePresetId, PiecePreset> = {
  shoes: {
    id: 'shoes',
    emoji: '👟',
    nameEn: 'Sneakers',
    nameJa: 'スニーカー',
    colorHex: '#f43f5e',
    badgeBg: 'bg-rose-500 text-white',
    borderClass: 'border-rose-500',
    textClass: 'text-rose-600 dark:text-rose-400',
    mappedTeamId: 'team_red',
  },
  trumpet: {
    id: 'trumpet',
    emoji: '🎺',
    nameEn: 'Trumpet',
    nameJa: 'トランペット',
    colorHex: '#0ea5e9',
    badgeBg: 'bg-sky-500 text-white',
    borderClass: 'border-sky-500',
    textClass: 'text-sky-600 dark:text-sky-400',
    mappedTeamId: 'team_blue',
  },
  teddy: {
    id: 'teddy',
    emoji: '🧸',
    nameEn: 'Teddy Bear',
    nameJa: 'テディベア',
    colorHex: '#10b981',
    badgeBg: 'bg-emerald-500 text-white',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    mappedTeamId: 'team_green',
  },
  ice_cream: {
    id: 'ice_cream',
    emoji: '🍦',
    nameEn: 'Ice Cream',
    nameJa: 'アイスクリーム',
    colorHex: '#f59e0b',
    badgeBg: 'bg-amber-400 text-slate-950',
    borderClass: 'border-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    mappedTeamId: 'team_yellow',
  },
};

export const PIECE_ORDER: PiecePresetId[] = ['shoes', 'trumpet', 'teddy', 'ice_cream'];

export function getPieceForTeamId(teamId?: TeamId, fallbackIndex: number = 0): PiecePresetId {
  switch (teamId) {
    case 'team_red':
      return 'shoes';
    case 'team_white':
    case 'team_blue':
      return 'trumpet';
    case 'team_green':
      return 'teddy';
    case 'team_yellow':
    case 'team_orange':
      return 'ice_cream';
    default:
      return PIECE_ORDER[Math.abs(fallbackIndex) % PIECE_ORDER.length];
  }
}

export type SpiralSpaceKind = 'COLOR' | 'FEATURE_DOTS' | 'PUZZLE' | 'WARP' | 'GOAL';
export type SpiralColorTone = 'yellow' | 'blue' | 'green' | 'pink';

export interface SpiralSpaceNode {
  index: number;
  level: 1 | 2 | 3 | 4 | 5;
  kind: SpiralSpaceKind;
  tone: SpiralColorTone;
  x: number; // 0-400 SVG coordinate
  y: number; // 0-400 SVG coordinate
  puzzlePiece?: PiecePresetId;
  warpTo?: number;
  label?: string;
}

const BOARD_TONES: SpiralColorTone[] = ['yellow', 'blue', 'green', 'pink'];

function buildSpiralNodes(): SpiralSpaceNode[] {
  const cx = 200;
  const cy = 200;
  const nodes: SpiralSpaceNode[] = [];

  const ringDefs: {
    level: 1 | 2 | 3 | 4;
    count: number;
    radius: number;
    startAngleDeg: number;
    puzzleOffset: number;
    featureOffsets: number[];
    puzzlePiece: PiecePresetId;
  }[] = [
    {
      level: 1,
      count: 10,
      radius: 170,
      startAngleDeg: -135,
      puzzleOffset: 5,
      featureOffsets: [3, 7],
      puzzlePiece: 'shoes',
    },
    {
      level: 2,
      count: 8,
      radius: 128,
      startAngleDeg: -112,
      puzzleOffset: 4,
      featureOffsets: [2, 6],
      puzzlePiece: 'trumpet',
    },
    {
      level: 3,
      count: 6,
      radius: 86,
      startAngleDeg: -95,
      puzzleOffset: 3,
      featureOffsets: [1],
      puzzlePiece: 'teddy',
    },
    {
      level: 4,
      count: 4,
      radius: 46,
      startAngleDeg: -135,
      puzzleOffset: 2,
      featureOffsets: [1],
      puzzlePiece: 'ice_cream',
    },
  ];

  let idx = 0;
  for (let r = 0; r < ringDefs.length; r++) {
    const ring = ringDefs[r];
    const nextRingStartIndex = idx + ring.count;
    for (let i = 0; i < ring.count; i++) {
      const angleRad = ((ring.startAngleDeg + (360 / ring.count) * i) * Math.PI) / 180;
      const x = Math.round((cx + ring.radius * Math.cos(angleRad)) * 10) / 10;
      const y = Math.round((cy + ring.radius * Math.sin(angleRad)) * 10) / 10;
      const isWarp = i === ring.count - 1;
      const isPuzzle = i === ring.puzzleOffset;
      const isFeature = ring.featureOffsets.includes(i);

      const kind: SpiralSpaceKind = isWarp
        ? 'WARP'
        : isPuzzle
        ? 'PUZZLE'
        : isFeature
        ? 'FEATURE_DOTS'
        : 'COLOR';

      nodes.push({
        index: idx,
        level: ring.level,
        kind,
        tone: BOARD_TONES[(idx + r) % BOARD_TONES.length],
        x,
        y,
        ...(isPuzzle ? { puzzlePiece: ring.puzzlePiece } : {}),
        ...(isWarp
          ? {
              warpTo: Math.min(28, nextRingStartIndex + (ring.level < 4 ? 1 : 0)),
              label: ring.level < 4 ? `LVL ${ring.level + 1}` : 'GOAL',
            }
          : {}),
      });
      idx++;
    }
  }

  // Index 28: Center Trophy Goal
  nodes.push({
    index: 28,
    level: 5,
    kind: 'GOAL',
    tone: 'yellow',
    x: cx,
    y: cy,
    label: 'GOAL',
  });

  return nodes;
}

export const SPIRAL_NODES: SpiralSpaceNode[] = buildSpiralNodes();
export const SPIRAL_GOAL_INDEX = SPIRAL_NODES.length - 1; // 28

export function advanceSpiralSpace(
  currentSpace: number,
  steps: number
): {
  nextSpace: number;
  hitWarp: boolean;
  hitPuzzle: boolean;
  hitFeatureDots: boolean;
  reachedGoal: boolean;
  puzzlePiece?: PiecePresetId;
} {
  let target = Math.min(SPIRAL_GOAL_INDEX, Math.max(0, currentSpace + Math.max(1, steps)));
  const landedNode = SPIRAL_NODES[target];
  let hitWarp = false;
  let hitPuzzle = false;
  let hitFeatureDots = false;
  let puzzlePiece: PiecePresetId | undefined;

  if (landedNode) {
    if (landedNode.kind === 'WARP' && typeof landedNode.warpTo === 'number') {
      hitWarp = true;
      target = Math.min(SPIRAL_GOAL_INDEX, landedNode.warpTo);
    }
    const finalNode = SPIRAL_NODES[target];
    if (finalNode?.kind === 'PUZZLE') {
      hitPuzzle = true;
      puzzlePiece = finalNode.puzzlePiece;
    } else if (finalNode?.kind === 'FEATURE_DOTS') {
      hitFeatureDots = true;
    }
  }

  return {
    nextSpace: target,
    hitWarp,
    hitPuzzle,
    hitFeatureDots,
    reachedGoal: target >= SPIRAL_GOAL_INDEX,
    puzzlePiece,
  };
}

export interface AnticipationSettings {
  loopMode: AnticipationLoopMode;
  drawStyle: AnticipationDrawStyle;
  inputMode: AnticipationInputMode;
  drawDurationSeconds: number; // 12, 18, 25
  roundCount: number; // 6, 8, 12, 16
  englishReadingAid: EnglishReadingAid;
  gameMode: GameMode;
  teamCount: number;
  recordRoster: boolean;
  schoolId?: SchoolId;
  classId?: string;
  isTestGame?: boolean;
  isStudentHost?: boolean;
  bgm: string;
}

export const DEFAULT_ANTICIPATION_SETTINGS: AnticipationSettings = {
  loopMode: 'SPIRAL_BOARD',
  drawStyle: 'MIXED',
  inputMode: 'AUTO_GRADE',
  drawDurationSeconds: 18,
  roundCount: 10,
  englishReadingAid: 'WITH_KATAKANA',
  gameMode: 'TEAM',
  teamCount: 4,
  recordRoster: true,
  bgm: 'random_all',
};

export interface AnticipationChoiceOption {
  id: string;
  english: string;
  ja_kanji?: string;
  ja_hiragana?: string;
  en_katakana?: string;
  ruby?: { base: string; ruby: string }[];
  symbol: 'triangle' | 'diamond' | 'circle' | 'square';
  color: 'red' | 'blue' | 'yellow' | 'green';
}

export interface AnticipationRevealedCard {
  english: string;
  ja_kanji: string;
  ja_hiragana?: string;
  en_katakana?: string;
  ruby?: { base: string; ruby: string }[];
  soundFile?: string;
  imageUrl?: string;
  correctOptionId: string;
}

export interface AnticipationRoundPublic {
  roundIndex: number;
  totalRounds: number;
  wordId: string;
  imageUrl: string;
  gradeLevel: GradeLevel;
  categoryKey: string;
  categoryNameEn: string;
  categoryNameJa: string;
  drawStyle: 'INK_SKETCH' | 'CONNECT_DOTS';
  effectiveInputMode: AnticipationEffectiveInputMode;
  allowModeSwitch: boolean;
  roundStartTime: number;
  drawDurationMs: number;
  revealDurationMs: number;
  phase: AnticipationRoundPhase;
  isFeatureDots: boolean;
  englishLength: number;
  wordMask: string;
  firstLetterHint: string;
  letterBank: string[];
  options: AnticipationChoiceOption[];
  answerHash: string;
  solvedCount: number;
  firstSolverId?: string;
  firstSolverName?: string;
  revealedCard?: AnticipationRevealedCard;
}

export interface AnticipationHostRound {
  roundIndex: number;
  targetWord: VocabularyItem;
  publicRound: AnticipationRoundPublic;
  correctOptionId: string;
}

export interface AnticipationBoardToken {
  id: string;
  name: string;
  jaName?: string;
  pieceId: PiecePresetId;
  teamId?: TeamId;
  spaceIndex: number;
  collectedPieces: PiecePresetId[];
  score: number;
  avatar?: string;
  isBot?: boolean;
}

export interface AnticipationDiceEvent {
  roundIndex: number;
  rollerId: string;
  rollerName: string;
  pieceId: PiecePresetId;
  steps: number;
  fromSpace: number;
  toSpace: number;
  hitWarp: boolean;
  hitPuzzle: boolean;
  hitFeatureDots: boolean;
  reachedGoal: boolean;
  timestamp: number;
}

export interface AnticipationRoomState {
  phase: 'ACTIVE' | 'ROUND_REVEAL' | 'FINISHED';
  loopMode: AnticipationLoopMode;
  drawStyle: AnticipationDrawStyle;
  inputMode: AnticipationInputMode;
  englishReadingAid: EnglishReadingAid;
  roundIndex: number;
  totalRounds: number;
  drawDurationSeconds: number;
  currentRound: AnticipationRoundPublic | null;
  tokens: Record<string, AnticipationBoardToken>;
  lastDiceEvent?: AnticipationDiceEvent | null;
  triggerNextFeatureDots?: boolean;
}

export interface AnticipationResponsePayload {
  roundIndex: number;
  optionId?: string;
  guessText?: string;
  isCorrect: boolean;
  incorrectAttempts: number;
  timeTakenMs: number;
  submittedAt: number;
}

/**
 * Mandatory penalty floor matching GEMINI.md §2 (speed quizzes forbid spam clicking).
 */
export const ANTICIPATION_WRONG_LOCKOUT_MS = 2500;

/**
 * Deterministic 32-bit FNV-1a answer hash so client iPads can verify 4-choice & spelling guesses
 * immediately (and trigger instant 2.5s penalty lockouts) without exposing plaintext correct flags in RTDB.
 */
export function normalizeGuessAnswer(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function hashWordAnswer(roundIndex: number, answerText: string): string {
  const norm = normalizeGuessAnswer(answerText);
  const salted = `ant:${roundIndex}:${norm}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function calculateRoundPoints(timeTakenMs: number, drawDurationMs: number, streak: number, isFirstSolver: boolean): number {
  const ratio = Math.max(0, Math.min(1, 1 - timeTakenMs / Math.max(4000, drawDurationMs)));
  const base = 500;
  const speedBonus = Math.round(ratio * 450);
  const streakBonus = Math.min(250, Math.max(0, streak - 1) * 50);
  const firstBonus = isFirstSolver ? 150 : 0;
  return base + speedBonus + streakBonus + firstBonus;
}

export function computeDiceSteps(timeTakenMs: number, drawDurationMs: number): number {
  const ratio = timeTakenMs / Math.max(4000, drawDurationMs);
  if (ratio <= 0.36) return 3;
  if (ratio <= 0.72) return 2;
  return 1;
}

export function createSoloPlayerRecord(nickname: string, avatar: string): QuizPlayer {
  return {
    id: 'solo_student',
    nickname,
    avatar,
    score: 0,
    currentStreak: 0,
    maxStreak: 0,
    correctCount: 0,
    totalAnswered: 0,
    fastestTimeMs: 999999,
    joinedAt: Date.now(),
    answers: {},
  };
}
