import test from 'node:test';
import assert from 'node:assert/strict';
import type { VocabularyItem } from '@data/types';
import type { QuizHostSettings } from './types';
import { generateQuizQuestions } from './questionGenerator';

const makeWord = (
  id: string,
  english: string,
  ja_kanji: string,
  ja_hiragana: string,
  en_katakana: string
): VocabularyItem => ({
  id,
  english,
  canonical_key: english.toLowerCase(),
  normalized_english: english.toLowerCase(),
  part_of_speech: 'noun',
  category: '03_fooddrink',
  category_name: 'Food & Drink',
  ja_kanji,
  ja_hiragana,
  en_katakana,
  ruby: [{ base: ja_kanji || ja_hiragana, ruby: ja_hiragana }],
  ruby_html: ja_hiragana,
  ruby_text: ja_hiragana,
  sound_file: `/media/audio/${english}.mp3`,
  card_image: `/cards/illustration/${english}_illust.png`,
  card_image_kana: '',
  card_image_en: '',
  card_image_bilingual: '',
  card_variants: [],
  token: english,
  lemma: english.toLowerCase(),
  is_plural: false,
  grades: ['ES_G5'],
  themes: [],
  tags: [],
  primary_image: `/cards/illustration/${english}_illust.png`,
  primary_audio: `/media/audio/${english}.mp3`,
  letter_count: english.length,
  syllable_count: 1,
  first_letter: english[0],
  is_compound: false,
  phonics_initial: english[0],
  difficulty_tier: 1,
  target_sentences: [`I like ${english}.`],
  target_dialogues: [{ question: 'What do you like?', answer: `I like ${english}.` }],
  three_hints: {
    category_hint: 'Food',
    feature_hint: 'Sweet snack',
    letter_hint: english[0].toUpperCase(),
  },
});

const SAMPLE_POOL: VocabularyItem[] = [
  makeWord('w_apple', 'apple', '林檎', 'りんご', 'アップル'),
  makeWord('w_banana', 'banana', '', 'ばなな', 'バナナ'),
  makeWord('w_grape', 'grape', '葡萄', 'ぶどう', 'グレープ'),
  makeWord('w_orange', 'orange', '', 'みかん', 'オレンジ'),
];

const BASE_SETTINGS: QuizHostSettings = {
  subject: 'ENGLISH',
  questionCount: 4,
  timeLimitSeconds: 15,
  gameMode: 'INDIVIDUAL',
  deliveryStream: 'STREAM_B_MULTIPLAYER',
  ipadDisplayMode: 'MIRRORED',
  promptTypes: ['JA_MEANING'],
  choiceImageMode: 'AUTO_CLEVER',
  englishReadingAid: 'SPELLING_ONLY',
  awardToggles: { effortGrowth: true, skillChallenge: true, funSurprise: true },
};

test('questionGenerator enforces anti-cheat image suppression for EN_WORD prompts', () => {
  const questions = generateQuizQuestions(
    SAMPLE_POOL,
    { ...BASE_SETTINGS, promptTypes: ['EN_WORD'], choiceImageMode: 'AUTO_CLEVER' },
    'ES_G5'
  );
  assert.equal(questions.length, 4);
  for (const q of questions) {
    assert.equal(q.promptType, 'EN_WORD');
    for (const opt of q.options) {
      assert.equal(opt.image, undefined, 'EN_WORD options must omit illustrations');
    }
  }
});

test('questionGenerator omits duplicated hiragana promptSubtext when ja_kanji is empty', () => {
  const bananaFirst = [SAMPLE_POOL[1], SAMPLE_POOL[0], SAMPLE_POOL[2], SAMPLE_POOL[3]];
  const questions = generateQuizQuestions(
    bananaFirst,
    { ...BASE_SETTINGS, questionCount: 4, promptTypes: ['JA_MEANING'] },
    'ES_G5'
  );
  const bananaQ = questions.find((q) => q.targetWordId === 'w_banana');
  assert.ok(bananaQ);
  assert.equal(bananaQ.promptText, 'ばなな');
  assert.equal(bananaQ.promptSubtext, 'What is the English word?');
});

test('questionGenerator does not leak target Japanese meaning inside THREE_HINTS promptSubtext', () => {
  const questions = generateQuizQuestions(
    SAMPLE_POOL,
    { ...BASE_SETTINGS, promptTypes: ['THREE_HINTS'] },
    'ES_G5'
  );
  assert.equal(questions.length, 4);
  for (const q of questions) {
    assert.equal(q.promptType, 'THREE_HINTS');
    const targetWord = SAMPLE_POOL.find((w) => w.id === q.targetWordId)!;
    const jaMeaning = targetWord.ja_kanji || targetWord.ja_hiragana;
    assert.equal(
      (q.promptSubtext || '').includes(jaMeaning),
      false,
      `THREE_HINTS promptSubtext must not spoil target Japanese meaning "${jaMeaning}"`
    );
  }
});
