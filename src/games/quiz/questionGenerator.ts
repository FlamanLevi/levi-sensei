import { VocabularyItem, GradeLevel } from '@data/types';
import { PromptType, QuizOption, QuizQuestion, QuizHostSettings, OPTION_STYLES } from './types';

// Helper to shuffle arrays
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const GRADE_FALLBACK_ORDER: GradeLevel[] = ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'ES_G1', 'ES_G2', 'JHS_G1', 'JHS_G2', 'JHS_G3'];

export function resolveWordImage(word: VocabularyItem, grade?: GradeLevel): string {
  let imagePath = '';

  // 1. Prefer active student grade's pure illustration (without text label)
  if (grade && word.media_by_grade?.[grade]) {
    const gm = word.media_by_grade[grade]!;
    imagePath = gm.card_image || '';
  }

  // 2. Cross-grade fallback if active grade has no entry (GEMINI.md §1)
  if (!imagePath && word.media_by_grade) {
    for (const fallbackGrade of GRADE_FALLBACK_ORDER) {
      const gm = word.media_by_grade[fallbackGrade];
      if (gm?.card_image) {
        imagePath = gm.card_image;
        break;
      }
    }
  }

  // 3. Root fallback
  if (!imagePath) {
    imagePath = word.hwg_card_illust || word.primary_image || word.card_image || '';
  }

  if (!imagePath) return '';

  // 4. Normalize labeled flashcards (`*_1_ce.png` / `*_full.png`) to pure illustrations (`*_1_c.png` / `*_illust.png`)
  // so quiz prompts never leak the English target word on the card!
  imagePath = imagePath
    .replace(/_1_ce\.png$/i, '_1_c.png')
    .replace(/cards\/full\/([^/]+)_full\.png$/i, 'cards/illustration/$1_illust.png');

  if (imagePath.startsWith('http') || imagePath.startsWith('/')) return imagePath;
  if (imagePath.startsWith('cards/')) return `/${imagePath}`;
  return `/media/images/${imagePath}`;
}

export function generateQuizQuestions(
  pool: VocabularyItem[],
  settings: QuizHostSettings,
  grade?: GradeLevel,
  fallbackPool: VocabularyItem[] = []
): QuizQuestion[] {
  if (!pool || pool.length === 0) {
    return [];
  }

  // Build target questions list (loops and re-shuffles if requested laps exceed pool size)
  let selectedTargets: VocabularyItem[] = [];
  if (settings.questionCount === -1) {
    selectedTargets = shuffle(pool);
  } else if (pool.length >= settings.questionCount) {
    selectedTargets = shuffle(pool).slice(0, settings.questionCount);
  } else {
    // Endurance Grand Prix mode: repeat words with fresh shuffles up to requested lap count
    while (selectedTargets.length < settings.questionCount) {
      const remaining = settings.questionCount - selectedTargets.length;
      selectedTargets.push(...shuffle(pool).slice(0, remaining));
    }
  }
  const questions: QuizQuestion[] = [];

  for (let i = 0; i < selectedTargets.length; i++) {
    const target = selectedTargets[i];

    // Pick prompt type from allowed types
    let availablePromptTypes = [...settings.promptTypes];
    const targetImage = resolveWordImage(target, grade);

    // If target has no image, don't use IMAGE_ONLY prompt
    if (!targetImage) {
      availablePromptTypes = availablePromptTypes.filter(p => p !== 'IMAGE_ONLY');
      if (availablePromptTypes.length === 0) availablePromptTypes = ['JA_MEANING'];
    }

    const chosenPromptType: PromptType = availablePromptTypes.length > 0 
      ? availablePromptTypes[Math.floor(Math.random() * availablePromptTypes.length)]
      : 'JA_MEANING';

    // Build 3 smart distractors from the pool (or fallbackPool if pool is small)
    // Filter distractors by English lemma, not just ID, to prevent duplicate answer options (e.g. Sunday vs Sunday)
    const targetLower = target.english.trim().toLowerCase();
    const otherWords = pool.filter(w =>
      w.id !== target.id &&
      w.english.trim().toLowerCase() !== targetLower
    );

    // 1. Same category distractors
    let categoryMatches = otherWords.filter(w => w.category === target.category);
    // 2. Same part of speech
    let posMatches = otherWords.filter(w => w.part_of_speech === target.part_of_speech && !categoryMatches.includes(w));
    // 3. Fallback to any remaining in pool
    let otherFallbacks = otherWords.filter(w => !categoryMatches.includes(w) && !posMatches.includes(w));

    // 4. If pool still has fewer than 3 distractors, draw from fallbackPool
    let externalFallbacks: VocabularyItem[] = [];
    if (categoryMatches.length + posMatches.length + otherFallbacks.length < 3 && fallbackPool.length > 0) {
      externalFallbacks = fallbackPool.filter(w =>
        w.id !== target.id &&
        w.english.trim().toLowerCase() !== targetLower &&
        !pool.some(p => p.id === w.id || p.english.trim().toLowerCase() === w.english.trim().toLowerCase())
      );
    }

    let distractorCandidates = [
      ...shuffle(categoryMatches),
      ...shuffle(posMatches),
      ...shuffle(otherFallbacks),
      ...shuffle(externalFallbacks)
    ];

    const getNormalizedJa = (w: VocabularyItem): string =>
      (w.ja_kanji || w.ja_hiragana || (w as any).japanese || '').trim().toLowerCase();

    // Deduplicate distractor candidates by BOTH English lemma and Japanese meaning to ensure 3 completely unique choices
    const seenDistractorLemmas = new Set<string>([targetLower]);
    const targetJaNorm = getNormalizedJa(target);
    const seenDistractorJa = new Set<string>(targetJaNorm ? [targetJaNorm] : []);

    const distractors: VocabularyItem[] = [];
    for (const cand of distractorCandidates) {
      const candLemma = cand.english.trim().toLowerCase();
      const candJa = getNormalizedJa(cand);
      if (
        !seenDistractorLemmas.has(candLemma) &&
        (!candJa || !seenDistractorJa.has(candJa))
      ) {
        seenDistractorLemmas.add(candLemma);
        if (candJa) seenDistractorJa.add(candJa);
        distractors.push(cand);
        if (distractors.length === 3) break;
      }
    }

    if (distractors.length < 3) {
      // Not enough distractors anywhere
      continue;
    }
    const distractorOptionIds = distractors.slice(0, 2).map(d => d.id);

    // 4 choices = target + 3 distractors
    const choiceWords = shuffle([target, ...distractors]);

    // HARDCODED PEDAGOGICAL INVARIANT (Visual Cheat Prevention):
    // 1. Strictly NO for 'EN_TO_JA' and 'IMAGE_ONLY' (if prompt has image or is translation, choices must never have pictures).
    // 2. If settings.choiceImageMode === 'TEXT_ONLY', strictly no images on choices.
    // 3. Only allowed for 'JA_MEANING' and 'AUDIO_ONLY' when choiceImageMode !== 'TEXT_ONLY'.
    const allowChoiceImages = settings.choiceImageMode !== 'TEXT_ONLY'
      && chosenPromptType !== 'EN_TO_JA'
      && chosenPromptType !== 'IMAGE_ONLY';

    const options: QuizOption[] = choiceWords.map((w, optIdx) => {
      const style = OPTION_STYLES[optIdx % OPTION_STYLES.length];
      const jaKanji = w.ja_kanji || (w as any).japanese || (w as any).meaning || '';
      const jaHiragana = w.ja_hiragana || (w as any).kanaMeaning || (w as any).hiragana || '';
      return {
        id: w.id,
        english: w.english,
        ja_kanji: jaKanji,
        ja_hiragana: jaHiragana,
        en_katakana: w.en_katakana,
        ruby: (w as any).ruby,
        image: allowChoiceImages ? resolveWordImage(w, grade) : undefined,
        sound: w.sound_file || w.primary_audio,
        symbol: style.symbol,
        color: style.color
      };
    });

    // Determine prompt texts based on chosen prompt type
    let promptText = '';
    let promptSubtext = '';
    let promptImage: string | undefined = undefined;
    // Always assign native textbook or Azure synthesized MP3 sound file for reveal and audio playback
    let promptSound: string | undefined = target.sound_file || target.primary_audio || target.english;

    switch (chosenPromptType) {
      case 'JA_MEANING':
        promptText = target.ja_kanji || target.ja_hiragana || target.english;
        promptSubtext = target.ja_hiragana && target.ja_kanji !== target.ja_hiragana ? target.ja_hiragana : 'What is the English word?';
        break;
      case 'EN_TO_JA':
      case 'EN_WORD':
        promptText = target.english;
        promptSubtext = target.en_katakana ? `[ ${target.en_katakana} ] 正しい日本語の意味は？` : '正しい日本語の意味をえらぼう！';
        promptImage = targetImage;
        break;
      case 'IMAGE_ONLY':
        promptText = 'What is this?';
        promptSubtext = 'イラストに合う英語を選ぼう！';
        promptImage = targetImage;
        break;
      case 'AUDIO_ONLY':
        promptText = 'Listen carefully! (よく聞いてね)';
        promptSubtext = '聞こえた単語をえらぼう！';
        break;
    }

    const qIndex = questions.length;
    questions.push({
      questionIndex: qIndex,
      totalQuestions: selectedTargets.length,
      targetWordId: target.id,
      targetWordEnglish: target.english,
      targetWordJa: target.ja_kanji || target.ja_hiragana || '',
      targetWordHiragana: target.ja_hiragana,
      targetWordKatakana: target.en_katakana,
      targetWordRuby: (target as any).ruby,
      promptType: chosenPromptType,
      promptText,
      promptSubtext,
      promptImage,
      promptSound,
      options,
      correctOptionId: target.id,
      distractorOptionIds,
      englishReadingAid: settings.englishReadingAid || 'SPELLING_ONLY',
      startTime: 0,
      timeLimitMs: settings.timeLimitSeconds * 1000
    });
  }

  const finalTotal = questions.length;
  questions.forEach(q => q.totalQuestions = finalTotal);

  return questions;
}
