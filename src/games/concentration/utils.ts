import { VocabularyItem } from '@data/types';
import { DisplayTier, MatchMode, GridSize, MemoryCard } from './types';
import { sampleCards, shuffleArray } from '@/utils/cardUtils';

export { resolveCardImage, shuffleArray, sampleCards } from '@/utils/cardUtils';

const ALPHABET_POOL: VocabularyItem[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => ({
  id: `letter_${char.toLowerCase()}`,
  english: char,
  japanese: char,
  ja_hiragana: char.toLowerCase(),
  category: '16_alphabet',
  grade: 'ES_G3',
  phonics: char.toLowerCase()
} as any));

/**
 * Creates and shuffles a concentration deck of pairs
 */
export function createConcentrationDeck(
  primaryPool: VocabularyItem[],
  fallbackPool: VocabularyItem[],
  pairCount: GridSize,
  matchMode: MatchMode,
  defaultTier: DisplayTier
): MemoryCard[] {
  let poolToSample = primaryPool;
  let fallbackToSample = fallbackPool;
  if (matchMode === 'letter_case') {
    const isLetter = (w: VocabularyItem) => w.category === '16_alphabet' || w.english.trim().length === 1;
    const letterPrimary = primaryPool.filter(isLetter);
    const letterFallback = fallbackPool.filter(isLetter);
    const availableLetters = [...letterPrimary, ...letterFallback];
    poolToSample = availableLetters.length >= pairCount ? availableLetters : ALPHABET_POOL;
    fallbackToSample = ALPHABET_POOL;
  }
  const sampledWords = sampleCards(poolToSample, pairCount, fallbackToSample);
  const timestamp = Date.now();
  const deck: MemoryCard[] = [];

  sampledWords.forEach((word, idx) => {
    const pairKey = `pair-${word.id}-${idx}`;

    if (matchMode === 'letter_case') {
      // Uppercase ↔ Lowercase
      deck.push({
        instanceId: `${word.id}-upper-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: 'word_only',
        customDisplay: {
          primary: word.english.toUpperCase(),
          secondary: '大文字'
        },
        isFlipped: false,
        isMatched: false
      });
      deck.push({
        instanceId: `${word.id}-lower-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: 'word_only',
        customDisplay: {
          primary: word.english.toLowerCase(),
          secondary: '小文字'
        },
        isFlipped: false,
        isMatched: false
      });
    } else if (matchMode === 'pic_word') {
      // Picture Card ↔ English Word Card
      deck.push({
        instanceId: `${word.id}-pic-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: 'picture_only',
        isFlipped: false,
        isMatched: false
      });
      deck.push({
        instanceId: `${word.id}-word-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: 'word_only',
        isFlipped: false,
        isMatched: false
      });
    } else if (matchMode === 'audio_pic') {
      // Audio Clue Card ↔ Picture Card
      deck.push({
        instanceId: `${word.id}-audio-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: 'audio_only',
        isFlipped: false,
        isMatched: false
      });
      deck.push({
        instanceId: `${word.id}-pic-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: 'picture_only',
        isFlipped: false,
        isMatched: false
      });
    } else {
      // same_pair (Identical cards with specified tier)
      deck.push({
        instanceId: `${word.id}-a-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: defaultTier,
        isFlipped: false,
        isMatched: false
      });
      deck.push({
        instanceId: `${word.id}-b-${timestamp}`,
        pairId: pairKey,
        card: word,
        tier: defaultTier,
        isFlipped: false,
        isMatched: false
      });
    }
  });

  return shuffleArray(deck);
}
