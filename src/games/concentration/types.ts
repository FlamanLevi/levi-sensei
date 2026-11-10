import { GradeLevel, VocabularyItem } from '@data/types';

export type MatchMode = 'same_pair' | 'pic_word' | 'audio_pic' | 'letter_case';

export type DisplayTier = 'picture_only' | 'picture_word' | 'word_only';

export type CardLabelMode = 'kanji' | 'number' | 'letter' | 'mystery';

export type GridSize = 3 | 4 | 6 | 8; // Pair count: 3 (6 cards), 4 (8 cards), 6 (12 cards), 8 (16 cards)

export type PlayMode = 'free' | 'teams' | 'speedrun';

// --- STREAM B PAIR BATTLE TYPES ---
export type PlayerTurn = 'P1' | 'P2';

export interface PairMatchRecord {
  pairId: string;
  wordId: string;
  english: string;
  ja: string;
  claimedBy: PlayerTurn;
  spokenConfirmed: boolean;
  matchedAt: number;
}

export interface PairGameState {
  deskNumber: number;
  seatP1: number;
  nameP1: string;
  scoreP1: number;
  seatP2: number;
  nameP2: string;
  scoreP2: number;
  currentTurn: PlayerTurn;
  streak: number;
  pairsCompleted: number;
  totalPairs: GridSize;
  isFinished: boolean;
  rematchCount: number;
  awaitingPartnerSpeechConfirm: boolean;
  pendingMatchWord: VocabularyItem | null;
}

export interface ConcentrationDeskPairState {
  deskId: string; // e.g. "desk_01"
  deskNumber: number; // 1 to 18
  seatA: number;
  nameA: string;
  scoreA: number;
  seatB: number;
  nameB: string;
  scoreB: number;
  pairsCompleted: number;
  totalPairs: number;
  isFinished: boolean;
  finishedAt?: number | null;
  rematchCount: number;
  currentTurn: 'A' | 'B';
  updatedAt: number;
}

export interface TournamentRoomMeta {
  roomCode: string;
  schoolId: string;
  classId: string;
  grade: GradeLevel | string;
  unit: string;
  matchMode: MatchMode;
  pairCount: GridSize;
  createdAt: number;
  hostActive: boolean;
}

export interface TournamentRoomStats {
  totalClassPairsMatched: number;
  targetClassPairs: number;
  completedDesksCount: number;
}

export interface TournamentRoomState {
  meta: TournamentRoomMeta;
  pairs: Record<string, ConcentrationDeskPairState>;
  stats: TournamentRoomStats;
}

export interface MemoryCard {
  instanceId: string;
  pairId: string;
  card: VocabularyItem;
  tier: 'picture_only' | 'picture_word' | 'word_only' | 'audio_only';
  customDisplay?: {
    primary: string;
    secondary?: string;
  };
  isFlipped: boolean;
  isMatched: boolean;
  matchedByTeam?: number | null;
}

export interface ConcentrationTeam {
  id: string;
  name: string;
  ja: string;
  badge: string;
  color: string;
  bgLight: string;
  border: string;
  ring: string;
  text: string;
  cardRing: string;
}

export const CONCENTRATION_TEAMS: ConcentrationTeam[] = [
  {
    id: 'red',
    name: 'Red Team',
    ja: '赤組',
    badge: '🔴',
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-400 dark:border-red-600',
    ring: 'ring-red-400',
    text: 'text-red-700 dark:text-red-400',
    cardRing: 'ring-red-500',
  },
  {
    id: 'blue',
    name: 'Blue Team',
    ja: '青組',
    badge: '🔵',
    color: 'from-sky-500 to-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-400 dark:border-blue-600',
    ring: 'ring-blue-400',
    text: 'text-blue-700 dark:text-blue-400',
    cardRing: 'ring-blue-500',
  },
  {
    id: 'yellow',
    name: 'Yellow Team',
    ja: '黄組',
    badge: '🟡',
    color: 'from-amber-400 to-yellow-500',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-400 dark:border-amber-600',
    ring: 'ring-amber-400',
    text: 'text-amber-700 dark:text-amber-400',
    cardRing: 'ring-amber-500',
  },
  {
    id: 'green',
    name: 'Green Team',
    ja: '緑組',
    badge: '🟢',
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-400 dark:border-emerald-600',
    ring: 'ring-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-400',
    cardRing: 'ring-emerald-500',
  },
  {
    id: 'purple',
    name: 'Purple Team',
    ja: '紫組',
    badge: '🟣',
    color: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-400 dark:border-purple-600',
    ring: 'ring-purple-400',
    text: 'text-purple-700 dark:text-purple-400',
    cardRing: 'ring-purple-500',
  },
  {
    id: 'orange',
    name: 'Orange Team',
    ja: '橙組',
    badge: '🟠',
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-400 dark:border-orange-600',
    ring: 'ring-orange-400',
    text: 'text-orange-700 dark:text-orange-400',
    cardRing: 'ring-orange-500',
  },
];

export const KANJI_LABELS = [
  { kanji: '一', kana: 'いち' },
  { kanji: '二', kana: 'に' },
  { kanji: '三', kana: 'さん' },
  { kanji: '四', kana: 'よん' },
  { kanji: '五', kana: 'ご' },
  { kanji: '六', kana: 'ろく' },
  { kanji: '七', kana: 'なな' },
  { kanji: '八', kana: 'はち' },
  { kanji: '九', kana: 'きゅう' },
  { kanji: '十', kana: 'じゅう' },
  { kanji: '十一', kana: 'じゅういち' },
  { kanji: '十二', kana: 'じゅうに' },
  { kanji: '十三', kana: 'じゅうさん' },
  { kanji: '十四', kana: 'じゅうよん' },
  { kanji: '十五', kana: 'じゅうご' },
  { kanji: '十六', kana: 'じゅうろく' },
];