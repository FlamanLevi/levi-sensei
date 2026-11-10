import { VocabularyItem } from '@data/types';
import { TyphoonGridSize, TyphoonEventKind, TyphoonTileData } from './types';
import { sampleCards, shuffleArray } from '@/utils/cardUtils';

const ROW_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function generateTyphoonTiles(
  primaryPool: VocabularyItem[],
  fallbackPool: VocabularyItem[],
  gridSize: TyphoonGridSize
): TyphoonTileData[] {
  let rows = 4;
  let cols = 4;
  if (gridSize === '5x4') { rows = 4; cols = 5; }
  else if (gridSize === '5x5') { rows = 5; cols = 5; }

  const totalTiles = rows * cols;
  const cards = sampleCards(primaryPool, totalTiles, fallbackPool);

  const eventPool: TyphoonEventKind[] = [];

  const addEvents = (kind: TyphoonEventKind, count: number) => {
    for (let i = 0; i < count; i++) eventPool.push(kind);
  };

  if (totalTiles === 16) {
    addEvents('POINTS_100', 4);
    addEvents('POINTS_200', 3);
    addEvents('POINTS_300', 2);
    addEvents('POINTS_500', 1);
    addEvents('JACKPOT_1000', 1);
    addEvents('TYPHOON', 2);
    addEvents('BOMB', 1);
    addEvents('SWAP', 1);
    addEvents('STEAL_200', 1);
  } else if (totalTiles === 20) {
    addEvents('POINTS_100', 5);
    addEvents('POINTS_200', 4);
    addEvents('POINTS_300', 3);
    addEvents('POINTS_500', 1);
    addEvents('JACKPOT_1000', 1);
    addEvents('TYPHOON', 2);
    addEvents('BOMB', 2);
    addEvents('SWAP', 1);
    addEvents('STEAL_200', 1);
  } else {
    addEvents('POINTS_100', 6);
    addEvents('POINTS_200', 5);
    addEvents('POINTS_300', 4);
    addEvents('POINTS_500', 2);
    addEvents('JACKPOT_1000', 1);
    addEvents('TYPHOON', 3);
    addEvents('BOMB', 2);
    addEvents('SWAP', 1);
    addEvents('STEAL_200', 1);
  }

  const shuffledEvents = shuffleArray(eventPool);
  const tiles: TyphoonTileData[] = [];

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const coord = `${ROW_LETTERS[r]}-${c + 1}`;
      tiles.push({
        id: `tile-${coord}-${Date.now()}-${idx}`,
        coordinate: coord,
        index: idx,
        card: cards[idx % cards.length],
        event: shuffledEvents[idx] || 'POINTS_100',
        isOpened: false
      });
      idx++;
    }
  }

  return tiles;
}

export function getEventDisplayInfo(event: TyphoonEventKind) {
  switch (event) {
    case 'POINTS_100':
      return { label: '+100', name: '100 Points', emoji: '⭐', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/60' };
    case 'POINTS_200':
      return { label: '+200', name: '200 Points', emoji: '🌟', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/60' };
    case 'POINTS_300':
      return { label: '+300', name: '300 Points', emoji: '✨', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-950/60' };
    case 'POINTS_500':
      return { label: '+500', name: '500 Points', emoji: '💎', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-950/60' };
    case 'JACKPOT_1000':
      return { label: '+1,000!', name: 'JACKPOT!', emoji: '👑', color: 'text-yellow-400', bg: 'bg-amber-500 text-slate-950' };
    case 'TYPHOON':
      return { label: 'TYPHOON', name: 'Typhoon!', emoji: '🌀', color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-950/60' };
    case 'BOMB':
      return { label: '-200', name: 'Bomb!', emoji: '💣', color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-950/60' };
    case 'SWAP':
      return { label: 'SWAP', name: 'Score Swap!', emoji: '🔄', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-950/60' };
    case 'STEAL_200':
      return { label: 'STEAL 200', name: 'Score Steal!', emoji: '🥷', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/60' };
  }
}
