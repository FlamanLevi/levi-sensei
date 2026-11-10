import { VocabularyItem } from '@data/types';
import { shuffleArray } from '@/utils/cardUtils';

export { resolveCardImage, shuffleArray } from '@/utils/cardUtils';

export function prepareCardQueue(
  primaryPool: VocabularyItem[],
  fallbackPool: VocabularyItem[]
): VocabularyItem[] {
  const pool = primaryPool.length > 0 ? primaryPool : fallbackPool;
  return shuffleArray(pool);
}
