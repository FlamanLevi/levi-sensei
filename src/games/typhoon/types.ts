import { VocabularyItem } from '@data/types';

export type TyphoonGridSize = '4x4' | '5x4' | '5x5'; // 16, 20, or 25 tiles

export type TyphoonCoordinateMode = 'NUMBERS' | 'ALPHABET';

export type TyphoonEventKind =
  | 'POINTS_100'
  | 'POINTS_200'
  | 'POINTS_300'
  | 'POINTS_500'
  | 'JACKPOT_1000'
  | 'TYPHOON'
  | 'BOMB'
  | 'SWAP'
  | 'STEAL_200';

export interface TyphoonTileData {
  id: string;
  coordinate: string; // e.g. "A-1", "B-3"
  index: number;      // 0 to N-1
  card: VocabularyItem;
  event: TyphoonEventKind;
  isOpened: boolean;
  openedByTeam?: number;
}

export type TyphoonTurnPhase =
  | 'SELECTING_TILE'
  | 'QUESTION_ACTIVE'
  | 'EVENT_REVEAL'
  | 'CHOOSING_TARGET_TEAM'
  | 'ROUND_RESOLVED'
  | 'GAME_OVER';

export interface TyphoonTeam {
  id: string;
  name: string;
  jaName: string;
  emoji: string;
  color: string;
  bgLight: string;
  border: string;
  ring: string;
  text: string;
  score: number;
}

export const TYPHOON_TEAMS_PRESET: TyphoonTeam[] = [
  {
    id: 'red',
    name: 'Red Team',
    jaName: '赤組',
    emoji: '🔴',
    color: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-400 dark:border-rose-600',
    ring: 'ring-rose-400',
    text: 'text-rose-700 dark:text-rose-300',
    score: 0
  },
  {
    id: 'blue',
    name: 'Blue Team',
    jaName: '青組',
    emoji: '🔵',
    color: 'from-sky-500 to-blue-600',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-400 dark:border-blue-600',
    ring: 'ring-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    score: 0
  },
  {
    id: 'yellow',
    name: 'Yellow Team',
    jaName: '黄組',
    emoji: '🟡',
    color: 'from-amber-400 to-yellow-500',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-400 dark:border-amber-600',
    ring: 'ring-amber-400',
    text: 'text-amber-800 dark:text-amber-300',
    score: 0
  },
  {
    id: 'green',
    name: 'Green Team',
    jaName: '緑組',
    emoji: '🟢',
    color: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-400 dark:border-emerald-600',
    ring: 'ring-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
    score: 0
  },
  {
    id: 'purple',
    name: 'Purple Team',
    jaName: '紫組',
    emoji: '🟣',
    color: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-400 dark:border-purple-600',
    ring: 'ring-purple-400',
    text: 'text-purple-700 dark:text-purple-300',
    score: 0
  },
  {
    id: 'orange',
    name: 'Orange Team',
    jaName: '橙組',
    emoji: '🟠',
    color: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-400 dark:border-orange-600',
    ring: 'ring-orange-400',
    text: 'text-orange-700 dark:text-orange-300',
    score: 0
  }
];
