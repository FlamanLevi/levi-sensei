import { GradeLevel, VocabularyItem } from '@data/types';
import { OPTION_STYLES } from '@/games/quiz/types';
import { resolveCardImage, shuffleArray } from '@/utils/cardUtils';
import {
  hasCuratedNesMotif,
  hasCuratedNesPicture,
  hasDirectNesPicture,
  resolveCuratedNesStrokes,
} from './nesVectorBank';
import { encodeCompactStrokes } from './sketchVectorizer';
import {
  AnticipationChoiceOption,
  AnticipationDrawStyle,
  AnticipationEffectiveInputMode,
  AnticipationHostRound,
  AnticipationInputMode,
  AnticipationSettings,
  hashWordAnswer,
  normalizeGuessAnswer,
} from './types';

const ANTICIPATION_CATEGORY_LABELS: Record<string, { en: string; ja: string }> = {
  '01_action': { en: 'Action / Verb', ja: '動き・アクション' },
  '02_state': { en: 'Feeling / State', ja: '様子・気持ち' },
  '03_food': { en: 'Food & Drink', ja: '食べ物・飲み物' },
  '03_fooddrink': { en: 'Food & Drink', ja: '食べ物・飲み物' },
  '04_number': { en: 'Numbers', ja: '数・数字' },
  '05_school': { en: 'School & Stationery', ja: '学校・文房具' },
  '05_schoollife': { en: 'School Life', ja: '学校生活' },
  '06_facility': { en: 'Place & Building', ja: '場所・建物' },
  '07_dailylife': { en: 'Daily Life', ja: '暮らし・生活' },
  '08_sport': { en: 'Sports & Hobbies', ja: 'スポーツ・遊び' },
  '08_sports': { en: 'Sports & Hobbies', ja: 'スポーツ・遊び' },
  '09_colorshape': { en: 'Color & Shape', ja: '色・形' },
  '09_color_shape': { en: 'Color & Shape', ja: '色・形' },
  '10_calendar_time': { en: 'Calendar & Time', ja: '曜日・月・時間' },
  '11_animal': { en: 'Animals', ja: '動物・生き物' },
  '11_animals': { en: 'Animals', ja: '動物・生き物' },
  '12_nature': { en: 'Nature & Weather', ja: '自然・天気' },
  '13_position': { en: 'Directions', ja: '位置・方向' },
  '14_body': { en: 'Body & Family', ja: '体・家族' },
  '14_body_family': { en: 'Body & Family', ja: '体・家族' },
  '15_festalday': { en: 'Events & Holidays', ja: '行事・イベント' },
  '16_alphabet': { en: 'Alphabet', ja: 'アルファベット' },
};

function isCleanSpellingWord(english: string): boolean {
  const trimmed = (english || '').trim();
  if (!trimmed) return false;
  const alphaOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  if (alphaOnly.length < 2 || alphaOnly.length > 13) return false;
  // Allow simple 1-word or short 2-word lowercase/capital phrases without punctuation heavy syntax
  return /^[a-zA-Z\s\-]+$/.test(trimmed);
}

export function resolveEffectiveInputMode(
  setting: AnticipationInputMode,
  activeGrade: GradeLevel,
  wordEnglish: string
): { mode: AnticipationEffectiveInputMode; allowSwitch: boolean } {
  const cleanSpell = isCleanSpellingWord(wordEnglish);
  if (setting === 'CHOICE_4') {
    return { mode: 'CHOICE_4', allowSwitch: cleanSpell };
  }
  if (setting === 'SPELLING_TILES') {
    return { mode: cleanSpell ? 'SPELLING_TILES' : 'CHOICE_4', allowSwitch: true };
  }
  // AUTO_GRADE: Upper elementary (G5/G6/JHS) get interactive letter-tile spelling when clean; G1-G4 get ▲◆●■ 4-choice
  const isUpper =
    activeGrade === 'ES_G5' ||
    activeGrade === 'ES_G6' ||
    activeGrade.startsWith('JHS_');
  if (isUpper && cleanSpell) {
    return { mode: 'SPELLING_TILES', allowSwitch: true };
  }
  return { mode: 'CHOICE_4', allowSwitch: cleanSpell };
}

export function buildWordMask(english: string): {
  mask: string;
  firstLetterHint: string;
  secondLetterHint: string;
  cleanLetters: string;
} {
  const trimmed = (english || '').trim();
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const maskedChars = trimmed.split('').map((ch) => {
    if (/[a-zA-Z]/.test(ch)) return '-';
    if (ch === ' ') return ' ';
    return ch;
  });
  return {
    mask: maskedChars.join(''),
    firstLetterHint: lettersOnly.charAt(0) || trimmed.charAt(0).toUpperCase(),
    secondLetterHint: lettersOnly.charAt(1) || '',
    cleanLetters: lettersOnly,
  };
}

export function buildLetterBank(english: string, roundIndex: number): string[] {
  const clean = english.replace(/[^a-zA-Z]/g, '').toUpperCase().split('');
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const commonConsonants = ['R', 'S', 'T', 'L', 'N', 'C', 'M', 'P', 'B', 'D', 'G', 'H', 'K'];
  const targetBankSize = Math.min(14, Math.max(8, clean.length + 3));
  const pool = [...clean];

  let step = roundIndex + 3;
  while (pool.length < targetBankSize) {
    const src = pool.length % 2 === 0 ? commonConsonants : vowels;
    const ch = src[step % src.length];
    pool.push(ch);
    step += 5;
  }

  return shuffleArray(pool);
}

export function resolveDrawStyleForRound(
  setting: AnticipationDrawStyle,
  roundIndex: number,
  forceDots?: boolean,
  totalRounds: number = 10
): { drawStyle: 'INK_SKETCH' | 'CONNECT_DOTS'; isFeatureDots: boolean } {
  if (forceDots) {
    return { drawStyle: 'CONNECT_DOTS', isFeatureDots: true };
  }
  if (setting === 'INK_SKETCH') {
    return { drawStyle: 'INK_SKETCH', isFeatureDots: false };
  }
  if (setting === 'CONNECT_DOTS') {
    return { drawStyle: 'CONNECT_DOTS', isFeatureDots: false };
  }
  // MIXED (Step-Up): First half uses Pearl Dots (lower difficulty); second half drops dots (Challenge)
  const easyCutoff = Math.max(1, Math.ceil(totalRounds / 2));
  const useDots = roundIndex < easyCutoff;
  return {
    drawStyle: useDots ? 'CONNECT_DOTS' : 'INK_SKETCH',
    isFeatureDots: false,
  };
}

export function buildAnticipationRounds(
  primaryPool: VocabularyItem[],
  fallbackPool: VocabularyItem[],
  settings: AnticipationSettings,
  activeGrade: GradeLevel,
  roundCountOverride?: number
): AnticipationHostRound[] {
  const combinedSource = primaryPool.length >= 6 ? primaryPool : [...primaryPool, ...fallbackPool];

  // Deduplicate by lowercase normalized spelling so choices are crisp and unambiguous
  const uniqueMap = new Map<string, VocabularyItem>();
  for (const w of combinedSource) {
    if (!w || !w.english) continue;
    const norm = normalizeGuessAnswer(w.english);
    if (!norm) continue;
    if (!uniqueMap.has(norm)) {
      uniqueMap.set(norm, w);
    }
  }

  // Ensure distractor bank has at least 8 distinct entries even in tiny custom units
  const distractorUniverse = Array.from(uniqueMap.values());
  if (distractorUniverse.length < 8) {
    for (const w of fallbackPool) {
      if (!w || !w.english) continue;
      const norm = normalizeGuessAnswer(w.english);
      if (norm && !uniqueMap.has(norm)) {
        uniqueMap.set(norm, w);
        distractorUniverse.push(w);
      }
    }
  }

  const desiredRounds = roundCountOverride || settings.roundCount || 10;
  const rawPreferred = primaryPool.filter((w) => w && w.english && normalizeGuessAnswer(w.english).length > 0);
  const baseCandidates = rawPreferred.length > 0 ? rawPreferred : distractorUniverse;

  // Deduplicate candidates by normalized spelling so no round duplicates occur within a deck
  const dedupedCandidates: VocabularyItem[] = [];
  const seenCand = new Set<string>();
  for (const w of baseCandidates) {
    const norm = normalizeGuessAnswer(w.english);
    if (norm && !seenCand.has(norm)) {
      seenCand.add(norm);
      dedupedCandidates.push(w);
    }
  }

  // Prioritize iconic drawable concrete NES motifs first when sampling from large curriculum pools,
  // while keeping narrow unit selections intact (e.g. alphabet/number/holiday units).
  const directPool = shuffleArray(dedupedCandidates.filter((w) => hasDirectNesPicture(w.english)));
  const picturePool = shuffleArray(
    dedupedCandidates.filter((w) => !hasDirectNesPicture(w.english) && hasCuratedNesPicture(w.english))
  );
  const glyphPool = shuffleArray(
    dedupedCandidates.filter((w) => !hasCuratedNesPicture(w.english) && hasCuratedNesMotif(w.english))
  );
  const otherPool = shuffleArray(dedupedCandidates.filter((w) => !hasCuratedNesMotif(w.english)));
  const prioritizedTargets = [...directPool, ...picturePool, ...glyphPool, ...otherPool];

  const selectedTargets: VocabularyItem[] = [];
  for (let i = 0; i < desiredRounds; i++) {
    if (prioritizedTargets.length === 0) break;
    selectedTargets.push(prioritizedTargets[i % prioritizedTargets.length]);
  }

  const drawCompletionMs = Math.max(5000, (settings.drawCompletionSeconds || 11) * 1000);
  const timerMode = settings.timerMode || 'NO_CUTOFF';
  const canvasStyle = settings.canvasStyle || 'NES_RETRO';
  const drawDurationMs =
    timerMode === 'GENEROUS_TIMER'
      ? Math.max(drawCompletionMs + 14000, (settings.drawDurationSeconds || 30) * 1000)
      : drawCompletionMs + 18000;
  const revealDurationMs = 5500;

  return selectedTargets.map((targetWord, roundIndex) => {
    const targetNorm = normalizeGuessAnswer(targetWord.english);

    // Prefer same-category distractors with similar length first (shuffled within length proximity) so mask doesn't spoil choice
    const targetLen = targetNorm.length;
    const rankClose = (arr: VocabularyItem[]) =>
      shuffleArray(arr).sort((a, b) => {
        const diffA = Math.abs(normalizeGuessAnswer(a.english).length - targetLen);
        const diffB = Math.abs(normalizeGuessAnswer(b.english).length - targetLen);
        return Math.floor(diffA / 3) - Math.floor(diffB / 3);
      });

    const sameCatDistractors = rankClose(
      distractorUniverse.filter(
        (d) => normalizeGuessAnswer(d.english) !== targetNorm && d.category === targetWord.category
      )
    );
    const otherDistractors = rankClose(
      distractorUniverse.filter(
        (d) => normalizeGuessAnswer(d.english) !== targetNorm && d.category !== targetWord.category
      )
    );

    const distractors: VocabularyItem[] = [];
    const seenOptNorm = new Set<string>([targetNorm]);
    for (const cand of [...sameCatDistractors, ...otherDistractors]) {
      if (distractors.length >= 3) break;
      const norm = normalizeGuessAnswer(cand.english);
      if (!seenOptNorm.has(norm)) {
        seenOptNorm.add(norm);
        distractors.push(cand);
      }
    }

    const optionItems = shuffleArray([targetWord, ...distractors]);
    let correctOptionId = 'opt_0';

    const options: AnticipationChoiceOption[] = optionItems.map((item, idx) => {
      const style = OPTION_STYLES[idx % OPTION_STYLES.length];
      const optId = `r${roundIndex}_opt${idx}`;
      if (normalizeGuessAnswer(item.english) === targetNorm) {
        correctOptionId = optId;
      }
      return {
        id: optId,
        english: item.english,
        ja_kanji: item.ja_kanji,
        ja_hiragana: item.ja_hiragana,
        en_katakana: item.en_katakana,
        ruby: item.ruby,
        symbol: style.symbol,
        color: style.color,
      };
    });

    const imageUrl =
      resolveCardImage(targetWord, 'picture_only', activeGrade) ||
      targetWord.primary_image ||
      targetWord.card_image ||
      '';

    const curatedStrokes = resolveCuratedNesStrokes(targetWord.english);
    const nesVector = curatedStrokes ? encodeCompactStrokes(curatedStrokes) : undefined;

    const catMeta = ANTICIPATION_CATEGORY_LABELS[targetWord.category] || {
      en: targetWord.category_name || targetWord.category || 'Vocabulary',
      ja: 'たんご',
    };
    const { drawStyle, isFeatureDots } = resolveDrawStyleForRound(
      settings.drawStyle,
      roundIndex,
      false,
      selectedTargets.length
    );
    const { mode: effectiveInputMode, allowSwitch } = resolveEffectiveInputMode(
      settings.inputMode,
      activeGrade,
      targetWord.english
    );
    const { mask, firstLetterHint, secondLetterHint, cleanLetters } = buildWordMask(targetWord.english);

    return {
      roundIndex,
      targetWord,
      correctOptionId,
      publicRound: {
        roundIndex,
        totalRounds: selectedTargets.length,
        wordId: targetWord.id,
        imageUrl,
        ...(nesVector ? { nesVector } : {}),
        gradeLevel: activeGrade,
        categoryKey: targetWord.category,
        categoryNameEn: catMeta.en,
        categoryNameJa: catMeta.ja,
        drawStyle,
        canvasStyle,
        timerMode,
        effectiveInputMode,
        allowModeSwitch: allowSwitch,
        roundStartTime: 0,
        drawCompletionMs,
        drawDurationMs,
        revealDurationMs,
        phase: 'DRAWING',
        isFeatureDots,
        englishLength: cleanLetters.length || targetWord.english.trim().length,
        wordMask: mask,
        firstLetterHint,
        secondLetterHint,
        letterBank: buildLetterBank(targetWord.english, roundIndex),
        options,
        answerHash: hashWordAnswer(roundIndex, targetWord.english),
        solvedCount: 0,
      },
    };
  });
}
