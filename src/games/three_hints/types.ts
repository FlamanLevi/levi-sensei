import { VocabularyItem } from '@data/types';

export type HintStage = 1 | 2 | 3 | 'REVEALED';

export type GuessingMode = 'OPEN_GUESS' | 'FOUR_CHOICES';

export type VisualMode = 'SILHOUETTE' | 'MYSTERY_BOX';

export interface FormattedClue {
  stage: 1 | 2 | 3;
  title: string;
  jaTitle: string;
  enText: string;
  speakText?: string;
  jaText: string;
  icon: string;
  points: number;
  stars: number;
  poolIndex?: number;
  poolSize?: number;
}

export interface HintChoiceOption {
  key: 'A' | 'B' | 'C' | 'D';
  word: VocabularyItem;
  isCorrect: boolean;
}

export interface TeamScores {
  red: number;
  blue: number;
  yellow: number;
  green: number;
}
