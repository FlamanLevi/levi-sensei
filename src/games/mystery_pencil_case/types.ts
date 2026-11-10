import { RubySegment } from '@data/types';

export type FlowchartStep = 'ALL' | 'QUESTION' | 'YES_BRANCH' | 'NO_BRANCH';

export interface GrammarToggles {
  hasQuantity: boolean; // OFF: singular ("a pen"), ON: quantities ("2 pens")
  hasColor: boolean;    // OFF: no color, ON: color adjectives ("blue")
  hasAnd: boolean;      // OFF: basic YES, ON: "And I have a/an..."
  hasBut: boolean;      // OFF: basic NO, ON: "But I have a/an..."
}

export type PresetLevel = 'LEVEL_1_BASIC' | 'LEVEL_2_AND_BUT' | 'LEVEL_3_QUANTITY' | 'LEVEL_4_MASTER' | 'CUSTOM';

export interface StationeryItem {
  id: string;
  english: string;
  displayLabel: string;
  article: 'a' | 'an';
  pluralEnglish: string;
  jaKanji: string;
  jaHiragana: string;
  counter: string; // '本', '個', '冊'
  ruby?: RubySegment[];
  singularImg: string;
  pluralImg: string;
  soundFile?: string;
  audioSuite?: Record<string, string>;
}

export interface ColorOption {
  id: string;
  en: string;
  ja: string;
  jaModifier: string; // '赤い', '青い', '緑の'
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
}

export interface FlowchartRoundState {
  toggles: GrammarToggles;
  targetItem: StationeryItem;
  targetQuantity: number;
  targetColor: ColorOption;
  andItem: StationeryItem;
  andQuantity: number;
  andColor: ColorOption;
  butItem: StationeryItem;
  butQuantity: number;
  butColor: ColorOption;
  isQuestionFlipped: boolean;
  isYesFlipped: boolean;
  isNoFlipped: boolean;
  isBranchFlipped: boolean; // YES/NO ⇄ ある/なし
  activeStep: FlowchartStep;
}
