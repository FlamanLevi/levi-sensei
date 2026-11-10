import { VocabularyItem } from '@data/types';

export type FlashMode = 'LIGHTNING' | 'ACCELERATING' | 'RHYTHMIC' | 'MANUAL';

export type DisplayTier = 'picture_only' | 'word_only' | 'picture_word';

export type SpeedPreset = 100 | 250 | 500 | 1000 | 1500;

export interface SpeedFlashSettings {
  mode: FlashMode;
  tier: DisplayTier;
  flashDurationMs: number; // for LIGHTNING mode
  rhythmIntervalMs: number; // for RHYTHMIC mode
  autoPlayAudio: boolean;
}
