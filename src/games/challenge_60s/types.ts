import { VocabularyItem } from '@data/types';

export type SprintDuration = 30 | 45 | 60 | 90; // seconds

export type MicSensitivity = 'APARTMENT' | 'HIGH' | 'NORMAL' | 'CLASSROOM_LOUD';

export type GamePhase = 'READY' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export interface SprintResult {
  totalWordsCleared: number;
  totalAttempts: number;
  maxCombo: number;
  loudChantBonuses: number;
  finalScore: number;
  accuracyPct: number;
}
