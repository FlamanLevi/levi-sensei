import { GridSize } from './types';

export { resolveCardImage, shuffleArray } from '@/utils/cardUtils';

/**
 * Calculates whether a tile is center-locked until perimeter tiles are opened
 */
export function getIsCenterLocked(
  tileNum: number,
  gridSize: GridSize,
  peeledTiles: number[],
  isLockCenterActive: boolean
): boolean {
  if (!isLockCenterActive) return false;

  if (gridSize === '3x3') {
    if (tileNum !== 5) return false;
    const outerPeeled = peeledTiles.filter(t => t !== 5).length;
    return outerPeeled < 2; // Unlocks after 2 outer tiles are peeled
  }

  if (gridSize === '4x4') {
    const centerCluster = [6, 7, 10, 11];
    if (!centerCluster.includes(tileNum)) return false;
    const perimeterPeeled = peeledTiles.filter(t => !centerCluster.includes(t)).length;
    return perimeterPeeled < 3; // Unlocks after 3 perimeter tiles are peeled
  }

  return false;
}
