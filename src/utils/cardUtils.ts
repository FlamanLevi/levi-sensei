import { VocabularyItem, GradeLevel } from '@data/types';
import { getNumberValue, getNumberSvgDataUri, getNumberTheme, NUMBER_WORD_MAP } from './numberBadge';

export { getNumberValue, getNumberSvgDataUri, getNumberTheme, NUMBER_WORD_MAP };

export type CardDisplayTier = 'picture_only' | 'picture_word' | 'word_only' | 'audio_only';

/**
 * Checks if a grade string represents lower elementary (Grades 1-4, Kindergarten)
 * where Let's Try textbook conventions apply.
 */
export function isLowerElementaryGrade(grade?: string): boolean {
  if (!grade) return false;
  const normalized = grade.toUpperCase();
  return (
    normalized === 'ES_G1' ||
    normalized === 'ES_G2' ||
    normalized === 'ES_G3' ||
    normalized === 'ES_G4' ||
    normalized === '1' ||
    normalized === '2' ||
    normalized === '3' ||
    normalized === '4' ||
    normalized.startsWith('KD_') ||
    normalized.startsWith('ES_LOWER')
  );
}

/**
 * Checks if a grade string represents upper elementary (Grades 5-6, Junior High)
 * where Mitsumura Tosho (Here We Go) textbook conventions apply.
 */
export function isUpperElementaryGrade(grade?: string): boolean {
  if (!grade) return false;
  const normalized = grade.toUpperCase();
  return (
    normalized === 'ES_G5' ||
    normalized === 'ES_G6' ||
    normalized === '5' ||
    normalized === '6' ||
    normalized.startsWith('JHS_') ||
    normalized.startsWith('ES_UPPER')
  );
}

export function isHereWeGoAsset(path?: string | null): boolean {
  if (!path) return false;
  return (
    path.includes('cards/') ||
    path.includes('hwg') ||
    path.includes('_illust.') ||
    path.includes('_full.') ||
    path.includes('_text.')
  );
}

export function isLetsTryAsset(path?: string | null): boolean {
  if (!path) return false;
  return (
    path.includes('dic_3_') ||
    path.includes('dic_4_') ||
    path.includes('dic_wb_') ||
    path.includes('_1_c.') ||
    path.includes('_1_ce.') ||
    path.includes('letstry1') ||
    path.includes('letstry2')
  );
}

/**
 * Resolves the appropriate image URL for a card based on display tier and grade level.
 * Grade Preference & Intelligent Cross-Grade Fallback:
 * - Priority 1: Exact active grade match (e.g. Grade 4 student gets Let's Try 2 pencil; Grade 5 gets Here We Go pencil).
 * - Priority 2: Same-bracket grade match (Lower G1-G4; Upper G5-G6).
 * - Priority 3: Cross-grade fallback (If an upper-grade word was never introduced in lower elementary,
 *   e.g. "actor", a lower student playing an upper unit or Grand Slam sees the HWG illustration.
 *   If a lower-grade review word was never redrawn in HWG, e.g. "arts and crafts room", an upper student sees the Let's Try illustration).
 * - Never returns null if a valid textbook illustration exists.
 */
export function resolveCardImage(
  word: VocabularyItem,
  tierOrGrade?: CardDisplayTier | GradeLevel,
  gradeParam?: GradeLevel
): string | null {
  let tier: CardDisplayTier = 'picture_only';
  let grade: GradeLevel | undefined = undefined;

  if (
    tierOrGrade === 'picture_only' ||
    tierOrGrade === 'picture_word' ||
    tierOrGrade === 'word_only' ||
    tierOrGrade === 'audio_only'
  ) {
    tier = tierOrGrade;
    grade = gradeParam;
  } else if (typeof tierOrGrade === 'string') {
    grade = tierOrGrade as GradeLevel;
    tier = 'picture_only';
  }

  if (tier === 'word_only' || tier === 'audio_only') {
    return null;
  }

  // Universal dynamic vector number cards (Zero disk files, perfect crisp vector badges across all grades & games)
  const numVal = getNumberValue(word.english);
  if (numVal) {
    return getNumberSvgDataUri(numVal);
  }

  const gradeKey = grade
    ? (String(grade).startsWith('ES_G') || String(grade).startsWith('KD_') || String(grade).startsWith('JHS_')
        ? String(grade)
        : `ES_G${grade}`)
    : undefined;

  const isLower = isLowerElementaryGrade(gradeKey || (grade as string | undefined));
  const isUpper = isUpperElementaryGrade(gradeKey || (grade as string | undefined));

  let rawPath = '';

  // 1. Direct Grade-Specific Match (Preferred textbook illustration)
  // For words that carry over between grades (e.g. "pencil", "Sunday"), this guarantees the student
  // sees the exact illustration from their active grade's textbook.
  if (gradeKey && word.media_by_grade && word.media_by_grade[gradeKey as GradeLevel]) {
    const gm = word.media_by_grade[gradeKey as GradeLevel]!;
    const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
    if (candidate) {
      rawPath = candidate;
    }
  }

  // 2. Same-Bracket Grade Match
  // If the word has an illustration in another grade within the same grade bracket:
  if (!rawPath && word.media_by_grade) {
    if (isLower) {
      const lowerOrder: GradeLevel[] = ['ES_G4', 'ES_G3', 'ES_G2', 'ES_G1'];
      for (const g of lowerOrder) {
        const gm = word.media_by_grade[g];
        if (gm) {
          const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
          if (candidate) {
            rawPath = candidate;
            break;
          }
        }
      }
    } else if (isUpper) {
      const upperOrder: GradeLevel[] = ['ES_G6', 'ES_G5', 'JHS_G1'];
      for (const g of upperOrder) {
        const gm = word.media_by_grade[g];
        if (gm) {
          const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
          if (candidate) {
            rawPath = candidate;
            break;
          }
        }
      }
    }
  }

  // 3. Same-Bracket Direct Fields Match (card_image / hwg_card_illust)
  if (!rawPath) {
    if (isLower) {
      if (tier === 'picture_word') {
        if (word.card_image_bilingual && !isHereWeGoAsset(word.card_image_bilingual)) {
          rawPath = word.card_image_bilingual;
        } else if (word.card_image && isLetsTryAsset(word.card_image)) {
          rawPath = word.card_image.replace(/_1_c\.(png|webp|svg)/, '_1_ce.$1');
        } else if (word.primary_image && isLetsTryAsset(word.primary_image)) {
          rawPath = word.primary_image.replace(/_1_c\.(png|webp|svg)/, '_1_ce.$1');
        }
      } else {
        if (word.card_image && isLetsTryAsset(word.card_image)) {
          rawPath = word.card_image;
        } else if (word.primary_image && isLetsTryAsset(word.primary_image)) {
          rawPath = word.primary_image;
        }
      }
    } else if (isUpper) {
      if (tier === 'picture_word') {
        if (word.hwg_card_full && !isLetsTryAsset(word.hwg_card_full)) {
          rawPath = word.hwg_card_full;
        } else if (word.primary_image && isHereWeGoAsset(word.primary_image)) {
          rawPath = word.primary_image;
        }
      } else {
        if (word.hwg_card_illust && !isLetsTryAsset(word.hwg_card_illust)) {
          rawPath = word.hwg_card_illust;
        } else if (word.hwg_card_full && !isLetsTryAsset(word.hwg_card_full)) {
          rawPath = word.hwg_card_full;
        } else if (word.primary_image && isHereWeGoAsset(word.primary_image)) {
          rawPath = word.primary_image;
        } else if (word.card_image && isHereWeGoAsset(word.card_image)) {
          rawPath = word.card_image;
        }
      }
    }
  }

  // 4. Intelligent Cross-Grade Fallback
  // If a student encounters a word that was never introduced in their grade bracket
  // (e.g. a Grade 3 student playing upper-grade words like "actor", or a Grade 6 student
  // reviewing lower-grade words like "arts and crafts room" that were not redrawn in HWG),
  // seamlessly fall back to the available textbook illustration rather than showing a blank card!
  if (!rawPath) {
    if (isLower) {
      // Lower student playing an upper-grade word: use HWG illustration
      if (word.media_by_grade) {
        const upperOrder: GradeLevel[] = ['ES_G5', 'ES_G6', 'JHS_G1'];
        for (const g of upperOrder) {
          const gm = word.media_by_grade[g];
          if (gm) {
            const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
            if (candidate) {
              rawPath = candidate;
              break;
            }
          }
        }
      }
      if (!rawPath) {
        rawPath = word.hwg_card_illust || word.hwg_card_full || word.card_image || word.primary_image || '';
      }
    } else if (isUpper) {
      // Upper student reviewing a lower-grade word: use Let's Try illustration
      if (word.media_by_grade) {
        const lowerOrder: GradeLevel[] = ['ES_G4', 'ES_G3', 'ES_G2', 'ES_G1'];
        for (const g of lowerOrder) {
          const gm = word.media_by_grade[g];
          if (gm) {
            const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
            if (candidate) {
              rawPath = candidate;
              break;
            }
          }
        }
      }
      if (!rawPath) {
        rawPath = word.card_image_bilingual || word.card_image || word.primary_image || '';
      }
    } else {
      // Unspecified grade
      rawPath = (tier === 'picture_word' ? (word.card_image_bilingual || word.hwg_card_full) : null)
        || word.card_image
        || word.hwg_card_illust
        || word.primary_image
        || '';
    }
  }

  // 5. Final fallback to any card image
  if (!rawPath) {
    rawPath = word.card_image || word.primary_image || word.hwg_card_illust || word.hwg_card_full || '';
  }

  if (!rawPath) return null;

  // Convert for pure illustration tier
  if (tier === 'picture_only') {
    if (rawPath.includes('_1_ce.')) {
      rawPath = rawPath.replace(/_1_ce\.(png|webp|svg)/, '_1_c.$1');
    }
    if (rawPath.includes('/cards/full/')) {
      rawPath = rawPath.replace('/cards/full/', '/cards/illustration/');
    } else if (rawPath.includes('cards/full/')) {
      rawPath = rawPath.replace('cards/full/', 'cards/illustration/');
    }
    if (rawPath.includes('_full.')) {
      rawPath = rawPath.replace(/_full\.(png|webp)/, '_illust.$1');
    }
  }

  // Format URL for Vite dev/preview server
  let resolved = rawPath;
  if (rawPath.startsWith('cards/')) {
    resolved = `/${rawPath}`;
  } else if (!rawPath.startsWith('http://') && !rawPath.startsWith('https://') && !rawPath.startsWith('/')) {
    resolved = `/media/images/${rawPath}`;
  }

  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return resolved;
  }
  return resolved.includes('?') ? resolved : `${resolved}?v=esrgan`;
}

/**
 * Standard Fisher-Yates shuffle
 */
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Robust card sampler that prioritizes words with artwork, ensures zero duplicates,
 * and supplements from fallbackPool if current filtered pool has fewer items than requested.
 */
export function sampleCards(
  pool: VocabularyItem[],
  count: number,
  fallbackPool?: VocabularyItem[],
  grade?: GradeLevel
): VocabularyItem[] {
  const hasImage = (w: VocabularyItem) =>
    grade
      ? !!resolveCardImage(w, 'picture_only', grade)
      : !!(
          w.primary_image ||
          w.card_image ||
          w.hwg_card_illust ||
          (w.media_by_grade && Object.keys(w.media_by_grade).length > 0)
        );

  // Prefer words with an illustration
  const withImages = pool.filter(hasImage);
  const withoutImages = pool.filter(w => !hasImage(w));

  const shuffledWithImages = shuffleArray(withImages);
  const shuffledWithoutImages = shuffleArray(withoutImages);

  const combined = [...shuffledWithImages, ...shuffledWithoutImages];
  const selected: VocabularyItem[] = [];
  const seenIds = new Set<string>();

  for (const item of combined) {
    if (selected.length >= count) break;
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      selected.push(item);
    }
  }

  // If still not enough, supplement from fallbackPool
  if (selected.length < count && fallbackPool && fallbackPool.length > 0) {
    const shuffledFallback = shuffleArray(fallbackPool);
    for (const item of shuffledFallback) {
      if (selected.length >= count) break;
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        selected.push(item);
      }
    }
  }

  return shuffleArray(selected);
}
