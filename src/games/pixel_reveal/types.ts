import { VocabularyItem } from '@data/types';

export type VisualMode = 'MOSAIC' | 'TILES' | 'ZOOM' | 'SILHOUETTE';

export type GridSize = '2x2' | '3x3' | '4x4';

export type TileLabelMode = 'kanji' | 'number' | 'letter';

export type TimerOption = 0 | 10 | 15 | 20; // 0 = manual teacher clicker control

export interface TeamScores {
  red: number;
  blue: number;
  yellow: number;
  green: number;
}

export interface KanjiTileInfo {
  num: number;
  kanji: string;
  kana: string;
}

export const KANJI_TILES: KanjiTileInfo[] = [
  { num: 1, kanji: '一', kana: 'いち' },
  { num: 2, kanji: '二', kana: 'に' },
  { num: 3, kanji: '三', kana: 'さん' },
  { num: 4, kanji: '四', kana: 'よん' },
  { num: 5, kanji: '五', kana: 'ご' },
  { num: 6, kanji: '六', kana: 'ろく' },
  { num: 7, kanji: '七', kana: 'なな' },
  { num: 8, kanji: '八', kana: 'はち' },
  { num: 9, kanji: '九', kana: 'きゅう' },
  { num: 10, kanji: '十', kana: 'じゅう' },
  { num: 11, kanji: '十一', kana: 'じゅういち' },
  { num: 12, kanji: '十二', kana: 'じゅうに' },
  { num: 13, kanji: '十三', kana: 'じゅうさん' },
  { num: 14, kanji: '十四', kana: 'じゅうよん' },
  { num: 15, kanji: '十五', kana: 'じゅうご' },
  { num: 16, kanji: '十六', kana: 'じゅうろく' },
];
