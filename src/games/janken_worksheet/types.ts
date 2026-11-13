export type JankenLayoutMode = 'full' | 'slips_2' | 'slips_4';
export type WorksheetOrientation = 'landscape' | 'portrait';
export type JapaneseNotation = 'ruby' | 'hiragana';
export type PrintInkTheme = 'color' | 'bw';

export type DialoguePresetId =
  | 'how_many'
  | 'hello'
  | 'how_are_you'
  | 'do_you_like'
  | 'janken_only'
  | 'custom';

export interface RubySegment {
  text: string;
  ruby?: string;
}

export interface DialoguePreset {
  id: DialoguePresetId;
  unitTag: string;
  badgeEn: string;
  badgeJa: string;
  speakerA: string;
  speakerB: string;
  chantEn: string;
  endPromptEn?: string;
  endAnswerEn?: string;
  hintJaHiragana: string;
  hintJaRubySegments: RubySegment[];
}

export interface JankenCardData {
  id: string;
  cardIndex: number; // 1-based position across generated cards
  studentNumber: number; // 0 = blank fill-in line, >0 = pre-numbered
  className: string;
}

export interface JankenPageData {
  pageIndex: number; // 0-based page index
  cards: (JankenCardData | null)[];
}

export interface JankenGeneratorOptions {
  layoutMode: JankenLayoutMode;
  orientation: WorksheetOrientation;
  japaneseNotation: JapaneseNotation;
  inkTheme: PrintInkTheme;
  studentCount: number;
  startAttendanceNumber: number;
  autoNumberAttendance: boolean;
  masterCopyPage: boolean;
  className: string;
  roundsPerCard: 1 | 2 | 3 | 4;
  showTextbookBadge: boolean;
  showHandGuide: boolean;
  showTallyBox: boolean;
  showDialogueBox: boolean;
  showSelfCheck: boolean;
  dialoguePresetId: DialoguePresetId;
  customLineA: string;
  customLineB: string;
  customHintJa: string;
}
