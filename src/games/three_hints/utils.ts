import { VocabularyItem } from '@data/types';
import { FormattedClue, HintChoiceOption } from './types';
export { resolveCardImage, shuffleArray } from '@/utils/cardUtils';
import { shuffleArray } from '@/utils/cardUtils';

export interface BilingualHintItem {
  en: string;
  ja: string;
  speak?: string;
}

export interface WordThreeHintsBankEntry {
  id: string;
  english: string;
  hint1_pool: BilingualHintItem[];
  hint2_pool: BilingualHintItem[];
  hint3_pool: BilingualHintItem[];
}

// In-memory cache for lazy-loaded /data/banks/three_hints_bank.json
let cachedHintsBank: Record<string, WordThreeHintsBankEntry> | null = null;
let bankLoadPromise: Promise<Record<string, WordThreeHintsBankEntry>> | null = null;

/**
 * Lazy-load /data/banks/three_hints_bank.json when Three-Hint Master starts
 */
export async function loadThreeHintsBank(): Promise<Record<string, WordThreeHintsBankEntry>> {
  if (cachedHintsBank) return cachedHintsBank;
  if (!bankLoadPromise) {
    bankLoadPromise = fetch('/data/banks/three_hints_bank.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cachedHintsBank = data || {};
        return cachedHintsBank!;
      })
      .catch(() => {
        cachedHintsBank = {};
        return {};
      });
  }
  return bankLoadPromise;
}

import { getWordSemanticMeta } from '@/data/vocabMetadata';

function maskWordInText(text: string, targetEnglish: string): string {
  if (!text || !targetEnglish) return text;
  const escaped = targetEnglish.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), ' [ ? ] ');
}

/**
 * Builds rich multi-hint pools for all 3 stages by combining any external bank clues
 * with dynamic non-spoiler clues derived from the word's metadata.
 */
export function getCluePoolsForWord(word: VocabularyItem): {
  pool1: BilingualHintItem[];
  pool2: BilingualHintItem[];
  pool3: BilingualHintItem[];
} {
  const bankEntry = cachedHintsBank?.[word.id];
  const tags = word.tags || [];
  const enClean = word.english.trim();
  const alphaOnly = enClean.replace(/[^a-zA-Z]/g, '');
  const letterCount = alphaOnly.length || enClean.length;
  const syllables = word.syllable_count || 1;
  const firstLetter = (alphaOnly.charAt(0) || enClean.charAt(0)).toUpperCase();
  const lastLetter = alphaOnly.length > 1 ? alphaOnly.charAt(alphaOnly.length - 1).toUpperCase() : '';
  const jaMeaning = word.ja_kanji || word.ja_hiragana || '';

  const semanticMeta = getWordSemanticMeta(word);
  let catJa = semanticMeta?.hintJa || word.category_name || '教科書の単語';
  let catEn = word.three_hints?.category_hint || `It is in the category of ${semanticMeta?.en || word.category_name || 'words'}.`;

  if (word.sub_category === 'job' || tags.includes('job')) {
    catEn = 'It is an occupation or dream job.';
  } else if (word.sub_category === 'past_verb' || tags.includes('past_verb')) {
    catEn = 'It is an action you already did in the past!';
  } else if (word.category === '15_festalday' && (tags.includes('item') || tags.includes('toy'))) {
    catJa = 'パーティーグッズ・プレゼント（物）';
    catEn = 'It is a fun party item, gift, or decoration.';
  }

  // --- STAGE 1 POOL (Category & Context) ---
  const pool1: BilingualHintItem[] = [];
  if (bankEntry?.hint1_pool?.length) {
    pool1.push(...bankEntry.hint1_pool);
  } else {
    pool1.push({
      en: catEn,
      ja: `【カテゴリー】 ${catJa} の なかま です`,
      speak: catEn
    });
  }

  const firstDialogue = word.target_dialogues?.[0];
  if (
    firstDialogue?.question &&
    !firstDialogue.question.includes('Can you ate') &&
    !firstDialogue.question.includes('on balloon')
  ) {
    const maskedQ = maskWordInText(firstDialogue.question, enClean);
    const qHintEn = `You use this when someone asks: "${maskedQ}"`;
    if (!pool1.some(h => h.en === qHintEn)) {
      pool1.push({
        en: qHintEn,
        ja: `【しつもん】 「${maskedQ}」 と聞かれたときに使う言葉です`,
        speak: `You use this word when someone asks: ${maskedQ.replace('[ ? ]', 'blank')}`
      });
    }
  }

  // --- STAGE 2 POOL (Features, Sentences, Rhythm — Japanese meaning kept last as optional rescue!) ---
  const pool2: BilingualHintItem[] = [];
  if (bankEntry?.hint2_pool?.length) {
    pool2.push(...bankEntry.hint2_pool);
  }

  // Add non-spoiler blanked answer sentence if available
  if (
    firstDialogue?.answer &&
    !firstDialogue.answer.includes('can ate') &&
    !firstDialogue.answer.includes('celebrate balloon')
  ) {
    const maskedAns = maskWordInText(firstDialogue.answer, enClean);
    const ansHintEn = `In English, you can say: "${maskedAns}"`;
    if (!pool2.some(h => h.en.includes(maskedAns))) {
      pool2.push({
        en: ansHintEn,
        ja: `【れいぶん】 会話で 「${maskedAns}」 のように言えます`,
        speak: `In English, you can say: ${maskedAns.replace('[ ? ]', 'blank')}`
      });
    }
  }

  // Add syllable rhythm & letter count clue (100% spoiler-free!)
  const claps = '👏'.repeat(Math.max(1, Math.min(5, syllables)));
  const rhythmEn = `It has ${syllables} syllable${syllables > 1 ? 's' : ''} (${claps}) and ${letterCount} letter${letterCount > 1 ? 's' : ''}.`;
  if (!pool2.some(h => h.en.includes('syllable'))) {
    pool2.push({
      en: rhythmEn,
      ja: `【リズム・文字数】 手を ${syllables}回（${claps}）たたくリズムで、全部で ${letterCount}文字 です`,
      speak: `It has ${syllables} ${syllables > 1 ? 'syllables' : 'syllable'} and ${letterCount} ${letterCount > 1 ? 'letters' : 'letter'}.`
    });
  }

  // Put the Japanese meaning at the VERY END of Pool 2 so it never spoils Hint 2 automatically,
  // but is available if the teacher clicks "🔄 別のヒント" to rescue the class!
  if (jaMeaning) {
    pool2.push({
      en: `Big Hint: In Japanese, people call this "${jaMeaning}"!`,
      ja: `【大ヒント！】 にほんごで 「${jaMeaning}」 という意味です！`,
      speak: 'Here is a big hint! Check the Japanese meaning on the screen.'
    });
  }

  // --- STAGE 3 POOL (First Letter, First+Last Mask, Katakana Initial Sound) ---
  const isSingleAlphabet = word.category === '16_alphabet' || letterCount === 1;
  const blanks = enClean
    .split('')
    .map((ch, i) => (i === 0 ? ch.toUpperCase() : ch === ' ' ? '   ' : '_'))
    .join(' ');

  const pool3: BilingualHintItem[] = isSingleAlphabet
    ? [
        {
          en: `Sing the ABC song from "A" to find this ${enClean === enClean.toUpperCase() ? 'uppercase' : 'lowercase'} letter!`,
          ja: `【アルファベット】 ABCのうたを「A」からうたって さがしてみよう！（${enClean === enClean.toUpperCase() ? '大文字' : '小文字'}）`,
          speak: 'Sing the ABC song from A to find this letter!'
        }
      ]
    : [
        {
          en: `It starts with the letter "${firstLetter}". (${blanks})`,
          ja: `【さいしょの文字】 「${firstLetter}」 からはじまります （${letterCount}文字）`,
          speak: `It starts with the letter ${firstLetter}.`
        }
      ];

  if (!isSingleAlphabet && lastLetter && letterCount >= 3) {
    const firstLastMask = enClean
      .split('')
      .map((ch, i, arr) =>
        i === 0 || i === arr.length - 1 ? ch.toUpperCase() : ch === ' ' ? '   ' : '_'
      )
      .join(' ');
    pool3.push({
      en: `Starts with "${firstLetter}" and ends with "${lastLetter}"! (${firstLastMask})`,
      ja: `【最初と最後】 「${firstLetter}」ではじまり、「${lastLetter}」でおわります！`,
      speak: `It starts with ${firstLetter} and ends with ${lastLetter}.`
    });
  }

  if (!isSingleAlphabet && word.en_katakana && word.en_katakana.length >= 2) {
    const firstKana = word.en_katakana.charAt(0) + (word.en_katakana.charAt(1) === 'ー' ? 'ー' : '');
    pool3.push({
      en: `Starts with "${firstLetter}" — and the sound begins with "${firstKana}..."!`,
      ja: `【発音ヒント】 英語の音は 「${firstKana}…」 から聞こえるよ！`,
      speak: `It starts with the letter ${firstLetter}.`
    });
  }

  return { pool1, pool2, pool3 };
}

/**
 * Formats the 3 progressive clues for a word (picking random non-spoiler hints initially)
 */
export function formatThreeClues(
  word: VocabularyItem,
  customIndices?: [number, number, number]
): FormattedClue[] {
  const { pool1, pool2, pool3 } = getCluePoolsForWord(word);

  // For Pool 2, pick randomly among the NON-spoiler hints (all except the last Japanese meaning rescue item)
  const nonSpoilerPool2Count = Math.max(1, pool2.length > 1 ? pool2.length - 1 : 1);

  const idx1 = customIndices ? customIndices[0] % pool1.length : Math.floor(Math.random() * pool1.length);
  const idx2 = customIndices ? customIndices[1] % pool2.length : Math.floor(Math.random() * nonSpoilerPool2Count);
  const idx3 = customIndices ? customIndices[2] % pool3.length : 0;

  const h1 = pool1[idx1] || pool1[0];
  const h2 = pool2[idx2] || pool2[0];
  const h3 = pool3[idx3] || pool3[0];

  return [
    {
      stage: 1,
      title: 'Hint 1: Category & Context (カテゴリー)',
      jaTitle: 'ヒント 1: なにの なかま？',
      enText: h1.en,
      speakText: h1.speak || h1.en,
      jaText: h1.ja,
      icon: '🏷️',
      points: 300,
      stars: 3,
      poolIndex: idx1,
      poolSize: pool1.length
    },
    {
      stage: 2,
      title: 'Hint 2: Feature & Clues (とくちょう)',
      jaTitle: 'ヒント 2: どんな もの？',
      enText: h2.en,
      speakText: h2.speak || h2.en,
      jaText: h2.ja,
      icon: '🔍',
      points: 200,
      stars: 2,
      poolIndex: idx2,
      poolSize: pool2.length
    },
    {
      stage: 3,
      title: 'Hint 3: First Letter & Sound (頭文字・つづり)',
      jaTitle: 'ヒント 3: さいしょの もじ は？',
      enText: h3.en,
      speakText: h3.speak || h3.en,
      jaText: h3.ja,
      icon: '🔤',
      points: 100,
      stars: 1,
      poolIndex: idx3,
      poolSize: pool3.length
    }
  ];
}

/**
 * Cycles a specific stage (1, 2, or 3) to the next hint in its pool when teacher clicks "🔄 別のヒント"
 */
export function swapClueForStage(
  word: VocabularyItem,
  currentClues: FormattedClue[],
  targetStage: 1 | 2 | 3
): FormattedClue[] {
  const { pool1, pool2, pool3 } = getCluePoolsForWord(word);
  const idx1 = currentClues[0]?.poolIndex ?? 0;
  const idx2 = currentClues[1]?.poolIndex ?? 0;
  const idx3 = currentClues[2]?.poolIndex ?? 0;

  const nextIndices: [number, number, number] = [
    targetStage === 1 ? (idx1 + 1) % pool1.length : idx1,
    targetStage === 2 ? (idx2 + 1) % pool2.length : idx2,
    targetStage === 3 ? (idx3 + 1) % pool3.length : idx3
  ];

  return formatThreeClues(word, nextIndices);
}

const NON_SEMANTIC_TAGS = new Set(['plural', 'item', 'activity', 'play', 'sports']);

/**
 * Generates 4 choices (1 correct + 3 believable distractors matching sub_category, narrow tags, and category without lemma collisions)
 */
export function generateFourChoices(
  targetWord: VocabularyItem,
  pool: VocabularyItem[]
): HintChoiceOption[] {
  const targetLemma = (targetWord.lemma || targetWord.english).trim().toLowerCase();
  const targetTags = new Set((targetWord.tags || []).filter(t => !NON_SEMANTIC_TAGS.has(t)));

  const eligible = pool.filter(w => {
    const wLemma = (w.lemma || w.english).trim().toLowerCase();
    return w.id !== targetWord.id && wLemma !== targetLemma;
  });

  // 1. Best match: same granular sub_category
  const sameSubCat = targetWord.sub_category
    ? eligible.filter(w => w.sub_category === targetWord.sub_category)
    : [];
  // 2. Second best: shares a narrow semantic tag
  const sameTag = eligible.filter(
    w => !sameSubCat.includes(w) && (w.tags || []).some(t => targetTags.has(t))
  );
  // 3. Third best: shares the same MEXT category
  const sameCategory = eligible.filter(
    w => w.category === targetWord.category && !sameSubCat.includes(w) && !sameTag.includes(w)
  );
  // 4. Fallback: any other word
  const otherWords = eligible.filter(
    w => w.category !== targetWord.category && !sameSubCat.includes(w) && !sameTag.includes(w)
  );

  const combinedCandidates = [
    ...shuffleArray(sameSubCat),
    ...shuffleArray(sameTag),
    ...shuffleArray(sameCategory),
    ...shuffleArray(otherWords)
  ];

  const seenLemmas = new Set<string>([targetLemma]);
  const distractors: VocabularyItem[] = [];
  for (const cand of combinedCandidates) {
    const candLemma = (cand.lemma || cand.english).trim().toLowerCase();
    if (!seenLemmas.has(candLemma)) {
      seenLemmas.add(candLemma);
      distractors.push(cand);
      if (distractors.length === 3) break;
    }
  }

  const allFour = shuffleArray([targetWord, ...distractors]);
  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  return allFour.map((w, idx) => ({
    key: keys[idx],
    word: w,
    isCorrect: w.id === targetWord.id
  }));
}
