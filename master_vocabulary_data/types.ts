// Levi-Sensei English Games & Activities Platform
// TypeScript Definitions for Master Vocabulary Database (Modular & Boosted Edition)

export type GradeLevel =
  | 'ES_G1'
  | 'ES_G2'
  | 'ES_G3'
  | 'ES_G4'
  | 'ES_G5'
  | 'ES_G6'
  | 'KD_3yo'
  | 'KD_4yo'
  | 'KD_5yo'
  | 'JHS_G1'
  | 'JHS_G2'
  | 'JHS_G3';

export type CategoryKey =
  | '01_action'
  | '02_state'
  | '03_fooddrink'
  | '04_number'
  | '05_schoollife'
  | '06_facility'
  | '07_dailylife'
  | '08_sports'
  | '09_color_shape'
  | '10_calendar_time'
  | '11_animals'
  | '12_nature'
  | '13_position'
  | '14_body_family'
  | '15_festalday'
  | '16_alphabet';

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'interjection'
  | 'phrase'
  | 'pronoun'
  | 'alphabet';

export interface RubySegment {
  base: string;
  ruby: string;
}

export interface TargetDialogue {
  question: string;
  answer: string;
  context?: string;
}

export interface ThreeHints {
  category_hint: string;
  feature_hint: string;
  letter_hint: string;
}

export interface GradeMediaItem {
  card_image: string;
  card_full?: string;
  card_text?: string;
  sound_file?: string;
  unit?: string;
  source: string;
}

export interface VocabularyItem {
  id: string;
  english: string;
  canonical_key: string;
  disambiguation?: string;
  display_label?: string;
  normalized_english: string;
  part_of_speech: PartOfSpeech;
  category: CategoryKey;
  category_name: string;
  ja_kanji: string;
  ja_hiragana: string;
  en_katakana: string;
  ruby: RubySegment[];
  ruby_html: string;
  ruby_text: string;
  sound_file: string;
  card_image: string;
  card_image_kana: string;
  card_image_en: string;
  card_image_bilingual: string;
  card_variants: string[];
  token: string;
  grades: GradeLevel[];
  themes: string[];
  tags: string[];

  // Textbook flashcard artwork (Here We Go)
  hwg_card_full?: string;
  hwg_card_illust?: string;
  hwg_card_text?: string;

  // Lemmatization & Plural forms
  lemma: string;
  is_plural: boolean;

  // Unified Media Accessors & Fallbacks
  primary_image: string;
  primary_audio: string;

  // Game Engine & Puzzle Attributes
  letter_count: number;
  syllable_count: number;
  first_letter: string;
  is_compound: boolean;
  phonics_initial: string;
  difficulty_tier: 1 | 2 | 3;

  // Pedagogical Dialogues & 3-Hint Clues
  target_sentences: string[];
  target_dialogues: TargetDialogue[];
  three_hints: ThreeHints;

  // Grade-Context-Aware Media Mapping
  media_by_grade?: Partial<Record<GradeLevel, GradeMediaItem>>;

  // Audio Suite (Multi-voice & Japanese pronunciation)
  audio_suite?: Record<string, string>;
}

export interface VocabularyIndex {
  byId: Record<string, VocabularyItem>;
  byNormalizedEnglish: Record<string, string[]>;
  byGrade: Record<GradeLevel, string[]>;
  byCategory: Record<CategoryKey, string[]>;
  byPartOfSpeech: Record<PartOfSpeech, string[]>;
  byTag: Record<string, string[]>;
  byTheme: Record<string, string[]>;
  byDifficultyTier: Record<number, string[]>;
  byFirstLetter: Record<string, string[]>;
}
