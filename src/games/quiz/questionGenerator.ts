import { VocabularyItem, GradeLevel } from '@data/types';
import { PromptType, QuizOption, QuizQuestion, QuizHostSettings, OPTION_STYLES } from './types';
import { getCluePoolsForWord } from '@/games/three_hints/utils';
import { arrangeOptions } from './optionOrder';

import { resolveCardImage } from '@/utils/cardUtils';
import { getWordSemanticMeta } from '@/data/vocabMetadata';

// Helper to shuffle arrays
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getEffectiveCategoryKey(word: VocabularyItem): string {
  if (word.sub_category === 'job' || word.tags?.includes('job')) return 'job_special';
  if (word.sub_category === 'country' || word.tags?.includes('country')) return 'country_special';
  return word.category || '';
}

function getCategoryHuntMeta(word: VocabularyItem): { icon: string; ja: string; en: string } | null {
  const meta = getWordSemanticMeta(word);
  return meta ? { icon: meta.icon, ja: meta.ja, en: meta.en } : null;
}

const PHONICS_CHUNK_FAMILIES: { chunks: string[]; distractors: Record<string, string[]> }[] = [
  // 1. R-controlled vowels
  {
    chunks: ['ar', 'er', 'ir', 'or', 'ur'],
    distractors: {
      ar: ['er', 'or', 'ur', 'ir'],
      er: ['ar', 'or', 'ur', 'ir'],
      ir: ['er', 'ur', 'ar', 'or'],
      or: ['ar', 'er', 'ur', 'ir'],
      ur: ['er', 'ir', 'or', 'ar'],
    }
  },
  // 2. Vowel teams & diphthongs
  {
    chunks: ['ea', 'ee', 'oo', 'ai', 'ay', 'oa', 'ou', 'ow', 'oi', 'oy', 'au', 'aw', 'ie'],
    distractors: {
      ea: ['ee', 'ai', 'oa', 'ie'],
      ee: ['ea', 'oo', 'ai', 'ie'],
      oo: ['ee', 'ou', 'oa', 'ea'],
      ai: ['ay', 'ea', 'ei', 'oa'],
      ay: ['ai', 'ey', 'ea', 'oy'],
      oa: ['ou', 'ow', 'oo', 'ea'],
      ou: ['ow', 'oo', 'oa', 'au'],
      ow: ['ou', 'oa', 'aw', 'oo'],
      oi: ['oy', 'ai', 'ou', 'oa'],
      oy: ['oi', 'ay', 'ow', 'ey'],
      au: ['aw', 'ou', 'oa', 'oo'],
      aw: ['au', 'ow', 'or', 'oa'],
      ie: ['ea', 'ee', 'ei', 'ai'],
    }
  },
  // 3. Consonant digraphs
  {
    chunks: ['sh', 'ch', 'th', 'ph', 'wh', 'ck', 'ng', 'nk', 'qu'],
    distractors: {
      sh: ['ch', 'th', 'ph', 'wh'],
      ch: ['sh', 'th', 'ck', 'ph'],
      th: ['sh', 'ch', 'wh', 'ph'],
      ph: ['sh', 'th', 'ch', 'gh'],
      wh: ['th', 'sh', 'ch', 'ph'],
      ck: ['ch', 'sh', 'nk', 'ng'],
      ng: ['nk', 'nd', 'nt', 'ck'],
      nk: ['ng', 'ck', 'nd', 'nt'],
      qu: ['kw', 'ch', 'sh', 'wh'],
    }
  }
];

const VOWELS = ['a', 'e', 'i', 'o', 'u'];

function applyCasePattern(sourceChunk: string, candidate: string): string {
  if (!sourceChunk || !candidate) return candidate;
  if (sourceChunk[0] === sourceChunk[0].toUpperCase() && sourceChunk[0] !== sourceChunk[0].toLowerCase()) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
  }
  return candidate.toLowerCase();
}

/**
 * Builds a true Phonics Missing-Chunk / Missing-Letter puzzle:
 * - Masks a single key phonics chunk (e.g. "ea" in "New Z[ ? ]land", "er" in "G[ ? ]many")
 *   or interior vowel (e.g. "u" in "R[ ? ]ssia", "o" in "K[ ? ]rea", "i" in "Ind[ ? ]a")
 * - Returns the masked word with `[ ? ]` plus the correct chunk and 3 phonetically plausible distractor chunks.
 */
export function buildPhonicsChunkQuestion(english: string): {
  maskedWord: string;
  correctChunk: string;
  distractorChunks: [string, string, string];
} {
  const clean = english.trim();
  const lower = clean.toLowerCase();

  // 1. Search for 2-letter phonics digraphs / vowel teams / r-controlled vowels (prefer interior index > 0 first)
  const matches: { index: number; len: number; rawChunk: string; distractors: string[] }[] = [];
  for (const family of PHONICS_CHUNK_FAMILIES) {
    for (const chunk of family.chunks) {
      let pos = lower.indexOf(chunk);
      while (pos !== -1) {
        const rawChunk = clean.slice(pos, pos + chunk.length);
        const distList = family.distractors[chunk] || ['ea', 'ee', 'oo', 'ai'];
        matches.push({ index: pos, len: chunk.length, rawChunk, distractors: distList });
        pos = lower.indexOf(chunk, pos + 1);
      }
    }
  }

  // Sort interior matches (index > 0) ahead of initial matches so capital letters stay intact when possible
  matches.sort((a, b) => {
    const aInterior = a.index > 0 ? 0 : 1;
    const bInterior = b.index > 0 ? 0 : 1;
    if (aInterior !== bInterior) return aInterior - bInterior;
    return a.index - b.index;
  });

  if (matches.length > 0) {
    const chosen = matches[0];
    const maskedWord = clean.slice(0, chosen.index) + '[ ? ]' + clean.slice(chosen.index + chosen.len);
    const correctChunk = chosen.rawChunk;
    const casedDistractors = chosen.distractors
      .map(d => applyCasePattern(correctChunk, d))
      .filter(d => d.toLowerCase() !== correctChunk.toLowerCase())
      .slice(0, 3) as [string, string, string];
    return {
      maskedWord,
      correctChunk,
      distractorChunks: casedDistractors
    };
  }

  // 2. Single Vowel Mask (prefer interior vowels a, e, i, o, u at index > 0)
  const interiorVowelIndices: number[] = [];
  const allVowelIndices: number[] = [];
  for (let idx = 0; idx < clean.length; idx++) {
    const ch = lower[idx];
    if (VOWELS.includes(ch)) {
      allVowelIndices.push(idx);
      if (idx > 0 && clean[idx - 1] !== ' ') {
        interiorVowelIndices.push(idx);
      }
    }
  }

  const targetVowelIdx = interiorVowelIndices.length > 0
    ? interiorVowelIndices[0]
    : (allVowelIndices.length > 0 ? allVowelIndices[0] : -1);

  if (targetVowelIdx !== -1) {
    const rawVowel = clean[targetVowelIdx];
    const maskedWord = clean.slice(0, targetVowelIdx) + '[ ? ]' + clean.slice(targetVowelIdx + 1);
    const otherVowels = shuffle(VOWELS.filter(v => v !== rawVowel.toLowerCase()))
      .slice(0, 3)
      .map(v => applyCasePattern(rawVowel, v)) as [string, string, string];
    return {
      maskedWord,
      correctChunk: rawVowel,
      distractorChunks: otherVowels
    };
  }

  // 3. Fallback for y-vowel words (sky, gym, fly, dry, cry) or consonant-only tokens
  const yIndex = lower.indexOf('y');
  if (yIndex !== -1) {
    const rawY = clean[yIndex];
    const maskedWord = clean.slice(0, yIndex) + '[ ? ]' + clean.slice(yIndex + 1);
    const dists = ['i', 'e', 'a'].map(v => applyCasePattern(rawY, v)) as [string, string, string];
    return {
      maskedWord,
      correctChunk: rawY,
      distractorChunks: dists
    };
  }

  // Ultimate fallback: mask first letter
  const firstChar = clean[0] || 'a';
  const maskedWord = '[ ? ]' + clean.slice(1);
  const fallbackDists = ['b', 'c', 's', 't']
    .filter(c => c !== firstChar.toLowerCase())
    .slice(0, 3)
    .map(c => applyCasePattern(firstChar, c)) as [string, string, string];
  return {
    maskedWord,
    correctChunk: firstChar,
    distractorChunks: fallbackDists
  };
}

function maskTargetInSentence(sentence: string, targetEnglish: string): string {
  const cleanTarget = targetEnglish.trim();
  if (!sentence || !cleanTarget) return sentence;
  const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match target word (and optional plural s/es) case-insensitively
  const regex = new RegExp(`\\b${escaped}(?:e?s)?\\b`, 'gi');
  if (regex.test(sentence)) {
    return sentence.replace(regex, '[ ? ]');
  }
  // Fallback substring replacement if word has punctuation or multi-word phrase
  const fallbackRegex = new RegExp(escaped, 'gi');
  if (fallbackRegex.test(sentence)) {
    return sentence.replace(fallbackRegex, '[ ? ]');
  }
  return '';
}

export function buildShortClozePrompt(word: VocabularyItem): { promptText: string; promptSubtext: string } {
  const jaMeaning = word.ja_kanji || word.ja_hiragana || '';
  const d0 = word.target_dialogues?.[0];
  let maskedSentence = '';

  if (d0?.answer && !d0.answer.includes('can ate') && !d0.answer.includes('celebrate balloon')) {
    const maskedAns = maskTargetInSentence(d0.answer, word.english);
    if (maskedAns && maskedAns.includes('[ ? ]')) {
      if (d0.question && (d0.question.length + maskedAns.length) <= 46 && !d0.question.toLowerCase().includes(word.english.toLowerCase())) {
        maskedSentence = `A: "${d0.question}"  B: "${maskedAns}"`;
      } else {
        maskedSentence = `"${maskedAns}"`;
      }
    }
  }

  if (!maskedSentence && word.target_sentences?.length) {
    for (const s of word.target_sentences) {
      const m = maskTargetInSentence(s, word.english);
      if (m && m.includes('[ ? ]')) {
        maskedSentence = `"${m}"`;
        break;
      }
    }
  }

  if (!maskedSentence) {
    // Clean pedagogical fallback template based on part of speech and article
    if (word.part_of_speech === 'verb') {
      maskedSentence = `"Let's [ ? ] together!"`;
    } else if (word.part_of_speech === 'adjective') {
      maskedSentence = `"It looks very [ ? ]!"`;
    } else {
      const articlePrefix = word.article ? `${word.article} ` : '';
      maskedSentence = `"I can see ${articlePrefix}[ ? ]."`;
    }
  }

  return {
    promptText: jaMeaning ? `${maskedSentence} （${jaMeaning}）` : maskedSentence,
    promptSubtext: '[ ? ] に入る正しい英語をえらぼう！'
  };
}

function pickRotatingVoiceSound(word: VocabularyItem, index: number): string | undefined {
  const suite = word.audio_suite;
  if (suite) {
    const isSingleLetter = /^[A-Za-z]$/.test(word.english.trim());
    const voices = [
      suite.jenny,
      isSingleLetter ? undefined : suite.andrew,
      suite.ana,
    ].filter((v): v is string => Boolean(v));
    if (voices.length > 0) {
      return voices[index % voices.length];
    }
  }
  return word.sound_file || word.primary_audio || word.english;
}

export function resolveWordImage(word: VocabularyItem, grade?: GradeLevel): string {
  return resolveCardImage(word, 'picture_only', grade) || '';
}

export function generateQuizQuestions(
  pool: VocabularyItem[],
  settings: QuizHostSettings,
  grade?: GradeLevel,
  fallbackPool: VocabularyItem[] = []
): QuizQuestion[] {
  const hostLayoutSeed = `host-${Math.random().toString(36).slice(2)}`;
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
    const alphaLen = target.english.replace(/[^a-zA-Z]/g, '').length;
    const categoryMeta = getCategoryHuntMeta(target);

    // Filter out incompatible prompt types for this specific word
    if (!targetImage) {
      availablePromptTypes = availablePromptTypes.filter(p => p !== 'IMAGE_ONLY');
    }
    const trimmedEn = target.english.trim();
    if (alphaLen <= 2 || alphaLen > 12 || /[\s'-]/.test(trimmedEn)) {
      availablePromptTypes = availablePromptTypes.filter(p => p !== 'PHONICS_MASK');
    }
    if (!categoryMeta) {
      availablePromptTypes = availablePromptTypes.filter(p => p !== 'CATEGORY_HUNT');
    }
    if (availablePromptTypes.length === 0) {
      availablePromptTypes = ['JA_MEANING'];
    }

    let chosenPromptType: PromptType = availablePromptTypes[Math.floor(Math.random() * availablePromptTypes.length)];

    // Build 3 smart distractors from the pool (or fallbackPool if pool is small)
    // Filter distractors by normalized lemma, not just ID/exact English, to prevent pen vs pens or knee vs knees collisions
    const targetLower = trimmedEn.toLowerCase();
    const targetLemma = (target.lemma || trimmedEn).trim().toLowerCase();
    const otherWords = pool.filter(w => {
      const wLemma = (w.lemma || w.english).trim().toLowerCase();
      return (
        w.id !== target.id &&
        w.english.trim().toLowerCase() !== targetLower &&
        wLemma !== targetLemma
      );
    });

    let distractorCandidates: VocabularyItem[] = [];

    if (chosenPromptType === 'CATEGORY_HUNT') {
      // CRITICAL FOR CATEGORY_HUNT: Distractors MUST come from DIFFERENT categories so only 1 answer is valid!
      const targetCatKey = getEffectiveCategoryKey(target);
      const diffCatInPool = otherWords.filter(w => getEffectiveCategoryKey(w) !== targetCatKey);
      const diffCatExternal = fallbackPool.filter(w =>
        w.id !== target.id &&
        w.english.trim().toLowerCase() !== targetLower &&
        (w.lemma || w.english).trim().toLowerCase() !== targetLemma &&
        getEffectiveCategoryKey(w) !== targetCatKey
      );
      distractorCandidates = [...shuffle(diffCatInPool), ...shuffle(diffCatExternal)];
      if (distractorCandidates.length < 3) {
        // Fallback to JA_MEANING if the entire loaded vocabulary lacks 3 outside-category words
        chosenPromptType = 'JA_MEANING';
      }
    }

    if (chosenPromptType !== 'CATEGORY_HUNT') {
      const confusableSet = new Set(target.confusables || []);
      // 1. Curated Japanese-learner confusable pairs present in pool
      const confusableMatches = confusableSet.size > 0
        ? otherWords.filter(w => confusableSet.has(w.id))
        : [];
      // 2. Same granular sub_category distractors
      const subCatMatches = target.sub_category
        ? otherWords.filter(w => w.sub_category === target.sub_category && !confusableMatches.includes(w))
        : [];
      // 3. Same broad category distractors
      const categoryMatches = otherWords.filter(
        w => w.category === target.category && !confusableMatches.includes(w) && !subCatMatches.includes(w)
      );
      // 4. Same part of speech
      const posMatches = otherWords.filter(
        w => w.part_of_speech === target.part_of_speech && !confusableMatches.includes(w) && !subCatMatches.includes(w) && !categoryMatches.includes(w)
      );
      // 5. Fallback to any remaining in pool
      const otherFallbacks = otherWords.filter(
        w => !confusableMatches.includes(w) && !subCatMatches.includes(w) && !categoryMatches.includes(w) && !posMatches.includes(w)
      );

      // 6. If pool still has fewer than 3 distractors, draw from fallbackPool
      let externalFallbacks: VocabularyItem[] = [];
      if (confusableMatches.length + subCatMatches.length + categoryMatches.length + posMatches.length + otherFallbacks.length < 3 && fallbackPool.length > 0) {
        externalFallbacks = fallbackPool.filter(w =>
          w.id !== target.id &&
          w.english.trim().toLowerCase() !== targetLower &&
          (w.lemma || w.english).trim().toLowerCase() !== targetLemma &&
          !pool.some(p => p.id === w.id || p.english.trim().toLowerCase() === w.english.trim().toLowerCase())
        );
      }

      distractorCandidates = [
        ...shuffle(confusableMatches),
        ...shuffle(subCatMatches),
        ...shuffle(categoryMatches),
        ...shuffle(posMatches),
        ...shuffle(otherFallbacks),
        ...shuffle(externalFallbacks)
      ];
    }

    const getNormalizedJa = (w: VocabularyItem): string =>
      (w.ja_kanji || w.ja_hiragana || (w as any).japanese || '').trim().toLowerCase();

    // HARDCODED PEDAGOGICAL INVARIANT (Visual Cheat Prevention):
    // 1. Strictly NO for 'EN_TO_JA' and 'IMAGE_ONLY' (if prompt has image or is translation, choices must never have pictures).
    // 2. If settings.choiceImageMode === 'TEXT_ONLY', strictly no images on choices.
    // 3. Only allowed for 'JA_MEANING', 'AUDIO_ONLY', and 'THREE_HINTS' when choiceImageMode !== 'TEXT_ONLY'.
    const allowChoiceImages = settings.choiceImageMode !== 'TEXT_ONLY'
      && chosenPromptType !== 'EN_TO_JA'
      && chosenPromptType !== 'EN_WORD'
      && chosenPromptType !== 'IMAGE_ONLY'
      && chosenPromptType !== 'PHONICS_MASK'
      && chosenPromptType !== 'SHORT_CLOZE'
      && chosenPromptType !== 'CATEGORY_HUNT';

    // Deduplicate distractor candidates by English lemma, Japanese meaning, AND resolved artwork URL
    // so two choices never show identical pictures when image choices are active.
    const seenDistractorLemmas = new Set<string>([targetLower, targetLemma]);
    const targetJaNorm = getNormalizedJa(target);
    const seenDistractorJa = new Set<string>(targetJaNorm ? [targetJaNorm] : []);
    const seenDistractorImages = new Set<string>(allowChoiceImages && targetImage ? [targetImage] : []);

    const distractors: VocabularyItem[] = [];
    for (const cand of distractorCandidates) {
      const candEn = cand.english.trim().toLowerCase();
      const candLemma = (cand.lemma || cand.english).trim().toLowerCase();
      const candJa = getNormalizedJa(cand);
      const candImg = allowChoiceImages ? resolveWordImage(cand, grade) : '';
      if (
        !seenDistractorLemmas.has(candEn) &&
        !seenDistractorLemmas.has(candLemma) &&
        (!candJa || !seenDistractorJa.has(candJa)) &&
        (!allowChoiceImages || !candImg || !seenDistractorImages.has(candImg))
      ) {
        seenDistractorLemmas.add(candEn);
        seenDistractorLemmas.add(candLemma);
        if (candJa) seenDistractorJa.add(candJa);
        if (candImg) seenDistractorImages.add(candImg);
        distractors.push(cand);
        if (distractors.length === 3) break;
      }
    }

    // Fallback pass for ultra-small custom pools where words might share fallback artwork:
    // keep distinct English lemmas & Japanese meanings while filling up to 3 distractors.
    if (allowChoiceImages && distractors.length < 3) {
      for (const cand of distractorCandidates) {
        if (distractors.includes(cand)) continue;
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
    }

    if (chosenPromptType !== 'PHONICS_MASK' && distractors.length < 3) {
      // Not enough distractors anywhere
      continue;
    }

    let options: QuizOption[] = [];
    let distractorOptionIds: string[] = [];
    const phonicsPuzzle = chosenPromptType === 'PHONICS_MASK' ? buildPhonicsChunkQuestion(target.english) : null;

    if (chosenPromptType === 'PHONICS_MASK' && phonicsPuzzle) {
      const chunkEntries = shuffle([
        { id: target.id, chunk: phonicsPuzzle.correctChunk, isTarget: true },
        { id: `${target.id}__ph_0`, chunk: phonicsPuzzle.distractorChunks[0], isTarget: false },
        { id: `${target.id}__ph_1`, chunk: phonicsPuzzle.distractorChunks[1], isTarget: false },
        { id: `${target.id}__ph_2`, chunk: phonicsPuzzle.distractorChunks[2], isTarget: false },
      ]);
      distractorOptionIds = [`${target.id}__ph_0`, `${target.id}__ph_1`];
      options = chunkEntries.map((entry, optIdx) => {
        const style = OPTION_STYLES[optIdx % OPTION_STYLES.length];
        return {
          id: entry.id,
          english: entry.chunk,
          ja_kanji: '',
          ja_hiragana: '',
          en_katakana: undefined,
          image: undefined,
          sound: entry.isTarget ? (target.sound_file || target.primary_audio) : undefined,
          symbol: style.symbol,
          color: style.color
        };
      });
    } else {
      distractorOptionIds = distractors.slice(0, 2).map(d => d.id);
      const choiceWords = shuffle([target, ...distractors]);
      options = choiceWords.map((w, optIdx) => {
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
    }

    // Determine prompt texts based on chosen prompt type
    let promptText = '';
    let promptSubtext = '';
    let promptImage: string | undefined = undefined;
    let threeHints: { en: string; ja: string }[] | undefined = undefined;
    // Rotate across Jenny, Andrew, and Ana voices in audio_suite when available
    const promptSound: string | undefined = pickRotatingVoiceSound(target, i);
    const jaMeaning = target.ja_kanji || target.ja_hiragana || '';

    switch (chosenPromptType) {
      case 'JA_MEANING':
        promptText = target.ja_kanji || target.ja_hiragana || target.english;
        promptSubtext = target.ja_kanji && target.ja_hiragana && target.ja_kanji !== target.ja_hiragana
          ? target.ja_hiragana
          : 'What is the English word?';
        break;
      case 'EN_TO_JA':
      case 'EN_WORD':
        promptText = target.disambiguation ? `${target.english} (${target.disambiguation})` : target.english;
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
      case 'PHONICS_MASK': {
        const masked = phonicsPuzzle ? phonicsPuzzle.maskedWord : target.english;
        promptText = jaMeaning ? `${masked} （${jaMeaning}）` : masked;
        promptSubtext = '[ ? ] に入る文字（つづり）をえらぼう！';
        promptImage = targetImage || undefined;
        break;
      }
      case 'SHORT_CLOZE': {
        const cloze = buildShortClozePrompt(target);
        promptText = cloze.promptText;
        promptSubtext = cloze.promptSubtext;
        promptImage = targetImage || undefined;
        break;
      }
      case 'CATEGORY_HUNT': {
        const meta = categoryMeta || { icon: '🎯', ja: '同じカテゴリー', en: 'Target Category' };
        promptText = `${meta.icon} 「${meta.ja}」はどれ？`;
        promptSubtext = `Which one belongs to "${meta.en}"?`;
        break;
      }
      case 'THREE_HINTS': {
        const { pool1, pool2 } = getCluePoolsForWord(target);
        const h1 = pool1[0] || { en: 'What am I?', ja: 'わたしは だれでしょう？' };
        const nonSpoiler2 = pool2.find(h => !h.en.startsWith('Big Hint:')) || pool2[0] || h1;
        const rescueHint = pool2.find(h => h.en.startsWith('Big Hint:')) || {
          en: `Big Hint: In Japanese, this is "${jaMeaning}"!`,
          ja: `【大ヒント！】 日本語で 「${jaMeaning}」 という意味です！`
        };
        threeHints = [
          { en: h1.en, ja: h1.ja },
          { en: nonSpoiler2.en, ja: nonSpoiler2.ja },
          { en: rescueHint.en, ja: rescueHint.ja }
        ];
        // Compact single-line fallback for rapid-fire HUDs (Suzuka Circuit, Tamaire, Tug-of-War)
        promptText = `🔍 ${nonSpoiler2.en}`;
        promptSubtext = `ヒント: ${h1.ja}`;
        break;
      }
    }

    const qIndex = questions.length;
    // Shared (TV/host) layout: keep the correct answer from landing in the same slot 3+ times in a row.
    options = arrangeOptions(options, target.id, hostLayoutSeed, qIndex, false);
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
      threeHints,
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

