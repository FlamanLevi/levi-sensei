import { VocabularyItem, GradeLevel } from '@data/types';
import { PromptType, QuizOption, QuizQuestion, QuizHostSettings, OPTION_STYLES } from './types';
import { getCluePoolsForWord } from '@/games/three_hints/utils';

// Helper to shuffle arrays
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const LOWER_GRADE_FALLBACK_ORDER: GradeLevel[] = ['ES_G4', 'ES_G3', 'ES_G2', 'ES_G1', 'ES_G5', 'ES_G6', 'JHS_G1', 'JHS_G2', 'JHS_G3'];
const UPPER_GRADE_FALLBACK_ORDER: GradeLevel[] = ['ES_G6', 'ES_G5', 'JHS_G1', 'JHS_G2', 'JHS_G3', 'ES_G4', 'ES_G3', 'ES_G2', 'ES_G1'];

const CATEGORY_HUNT_LABELS: Record<string, { icon: string; ja: string; en: string }> = {
  '01_action': { icon: '🏃', ja: '動き・アクション', en: 'Action / Verb' },
  '02_state': { icon: '✨', ja: '様子・気持ち', en: 'Feeling / State' },
  '03_food': { icon: '🍎', ja: '食べ物・飲み物', en: 'Food & Drink' },
  '03_fooddrink': { icon: '🍎', ja: '食べ物・飲み物', en: 'Food & Drink' },
  '04_number': { icon: '🔢', ja: '数・数字', en: 'Number' },
  '05_school': { icon: '🏫', ja: '学校・文房具', en: 'School & Stationery' },
  '05_schoollife': { icon: '🏫', ja: '学校・文房具', en: 'School Life' },
  '06_facility': { icon: '🗺️', ja: '場所・建物', en: 'Place & Building' },
  '07_dailylife': { icon: '🏠', ja: '身の回りのもの・生活', en: 'Daily Life' },
  '08_sport': { icon: '⚽', ja: 'スポーツ・遊び', en: 'Sport & Game' },
  '08_sports': { icon: '⚽', ja: 'スポーツ・遊び', en: 'Sport & Game' },
  '09_colorshape': { icon: '🎨', ja: '色・形', en: 'Color & Shape' },
  '09_color_shape': { icon: '🎨', ja: '色・形', en: 'Color & Shape' },
  '10_calendar_time': { icon: '📅', ja: '曜日・月・季節・時間', en: 'Calendar & Time' },
  '11_animal': { icon: '🐾', ja: '動物・生き物', en: 'Animal & Living Thing' },
  '11_animals': { icon: '🐾', ja: '動物・生き物', en: 'Animal & Living Thing' },
  '12_nature': { icon: '🌿', ja: '自然・天気', en: 'Nature & Weather' },
  '13_position': { icon: '🧭', ja: '位置・方向', en: 'Position & Direction' },
  '14_body': { icon: '🖐️', ja: '体・家族・人', en: 'Body & Family' },
  '14_body_family': { icon: '🖐️', ja: '体・家族・人', en: 'Body & Family' },
  '15_festalday': { icon: '🎉', ja: '行事・イベント', en: 'Event & Festival' },
};

function getEffectiveCategoryKey(word: VocabularyItem): string {
  if (word.tags?.includes('job')) return 'job_special';
  return word.category || '';
}

function getCategoryHuntMeta(word: VocabularyItem): { icon: string; ja: string; en: string } | null {
  if (word.tags?.includes('job')) {
    return { icon: '👩‍⚕️', ja: '職業・将来の夢', en: 'Job / Occupation' };
  }
  return CATEGORY_HUNT_LABELS[word.category] || null;
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
    // Clean pedagogical fallback template based on part of speech
    if (word.part_of_speech === 'verb') {
      maskedSentence = `"Let's [ ? ] together!"`;
    } else if (word.part_of_speech === 'adjective') {
      maskedSentence = `"It looks very [ ? ]!"`;
    } else {
      maskedSentence = `"I can see a [ ? ]."`;
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
    const voices = [suite.jenny, suite.andrew, suite.ana].filter((v): v is string => Boolean(v));
    if (voices.length > 0) {
      return voices[index % voices.length];
    }
  }
  return word.sound_file || word.primary_audio || word.english;
}

export function resolveWordImage(word: VocabularyItem, grade?: GradeLevel): string {
  let imagePath = '';

  // 1. Prefer active student grade's pure illustration (without text label)
  if (grade && word.media_by_grade?.[grade]) {
    const gm = word.media_by_grade[grade]!;
    imagePath = gm.card_image || '';
  }

  // 2. Bracket-aware cross-grade fallback if active grade has no entry (GEMINI.md §1)
  if (!imagePath && word.media_by_grade) {
    const isUpper = grade === 'ES_G5' || grade === 'ES_G6' || grade?.startsWith('JHS_');
    const fallbackOrder = isUpper ? UPPER_GRADE_FALLBACK_ORDER : LOWER_GRADE_FALLBACK_ORDER;
    for (const fallbackGrade of fallbackOrder) {
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

  // 4. Normalize labeled flashcards (`*_1_ce.*` / `*_full.*`) to pure illustrations (`*_1_c.*` / `*_illust.*`)
  // so quiz prompts never leak the English target word on the card!
  imagePath = imagePath
    .replace(/_1_ce\.(png|webp|svg)$/i, '_1_c.$1')
    .replace(/cards\/full\/([^/]+)_full\.(png|webp)$/i, 'cards/illustration/$1_illust.$2');

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
    const alphaLen = target.english.replace(/[^a-zA-Z]/g, '').length;
    const categoryMeta = getCategoryHuntMeta(target);

    // Filter out incompatible prompt types for this specific word
    if (!targetImage) {
      availablePromptTypes = availablePromptTypes.filter(p => p !== 'IMAGE_ONLY');
    }
    if (alphaLen <= 2) {
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
    // Filter distractors by English lemma, not just ID, to prevent duplicate answer options (e.g. Sunday vs Sunday)
    const targetLower = target.english.trim().toLowerCase();
    const otherWords = pool.filter(w =>
      w.id !== target.id &&
      w.english.trim().toLowerCase() !== targetLower
    );

    let distractorCandidates: VocabularyItem[] = [];

    if (chosenPromptType === 'CATEGORY_HUNT') {
      // CRITICAL FOR CATEGORY_HUNT: Distractors MUST come from DIFFERENT categories so only 1 answer is valid!
      const targetCatKey = getEffectiveCategoryKey(target);
      const diffCatInPool = otherWords.filter(w => getEffectiveCategoryKey(w) !== targetCatKey);
      const diffCatExternal = fallbackPool.filter(w =>
        w.id !== target.id &&
        w.english.trim().toLowerCase() !== targetLower &&
        getEffectiveCategoryKey(w) !== targetCatKey
      );
      distractorCandidates = [...shuffle(diffCatInPool), ...shuffle(diffCatExternal)];
      if (distractorCandidates.length < 3) {
        // Fallback to JA_MEANING if the entire loaded vocabulary lacks 3 outside-category words
        chosenPromptType = 'JA_MEANING';
      }
    }

    if (chosenPromptType !== 'CATEGORY_HUNT') {
      // 1. Same category distractors
      const categoryMatches = otherWords.filter(w => w.category === target.category);
      // 2. Same part of speech
      const posMatches = otherWords.filter(w => w.part_of_speech === target.part_of_speech && !categoryMatches.includes(w));
      // 3. Fallback to any remaining in pool
      const otherFallbacks = otherWords.filter(w => !categoryMatches.includes(w) && !posMatches.includes(w));

      // 4. If pool still has fewer than 3 distractors, draw from fallbackPool
      let externalFallbacks: VocabularyItem[] = [];
      if (categoryMatches.length + posMatches.length + otherFallbacks.length < 3 && fallbackPool.length > 0) {
        externalFallbacks = fallbackPool.filter(w =>
          w.id !== target.id &&
          w.english.trim().toLowerCase() !== targetLower &&
          !pool.some(p => p.id === w.id || p.english.trim().toLowerCase() === w.english.trim().toLowerCase())
        );
      }

      distractorCandidates = [
        ...shuffle(categoryMatches),
        ...shuffle(posMatches),
        ...shuffle(otherFallbacks),
        ...shuffle(externalFallbacks)
      ];
    }

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

    if (chosenPromptType !== 'PHONICS_MASK' && distractors.length < 3) {
      // Not enough distractors anywhere
      continue;
    }

    // HARDCODED PEDAGOGICAL INVARIANT (Visual Cheat Prevention):
    // 1. Strictly NO for 'EN_TO_JA' and 'IMAGE_ONLY' (if prompt has image or is translation, choices must never have pictures).
    // 2. If settings.choiceImageMode === 'TEXT_ONLY', strictly no images on choices.
    // 3. Only allowed for 'JA_MEANING', 'AUDIO_ONLY', and 'THREE_HINTS' when choiceImageMode !== 'TEXT_ONLY'.
    const allowChoiceImages = settings.choiceImageMode !== 'TEXT_ONLY'
      && chosenPromptType !== 'EN_TO_JA'
      && chosenPromptType !== 'IMAGE_ONLY'
      && chosenPromptType !== 'PHONICS_MASK'
      && chosenPromptType !== 'SHORT_CLOZE'
      && chosenPromptType !== 'CATEGORY_HUNT';

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
        promptSubtext = jaMeaning ? `ヒント: ${h1.ja} （${jaMeaning}）` : h1.ja;
        break;
      }
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

