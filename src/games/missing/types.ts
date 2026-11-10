import { GradeLevel, VocabularyItem, RubySegment } from '@data/types';

export type DisplayTier = 'picture_only' | 'picture_word' | 'word_only';

export type GamePhase =
  | 'STUDY'             // Curtains open, children memorize the cards
  | 'CURTAIN_CLOSING'   // Curtains sliding shut with swoosh
  | 'CURTAIN_CLOSED'    // Curtains fully shut with "Close your eyes" overlay; cards removed/shuffled
  | 'CURTAIN_OPENING'   // Curtains sliding open with chime
  | 'GUESSING'          // Curtains open, showing remaining cards and ? mystery slot(s)
  | 'REVEALED';         // Missing card(s) revealed with golden spotlight & choral prompt

export type CardCount = 4 | 6 | 8;

export type TimerOption = 0 | 5 | 8 | 12; // 0 = manual advance

export type MissingCount = 1 | 2; // 1 card or Double Trouble (2 cards)

export type ScoreboardMode = 'off' | '2_teams' | '4_teams';

export interface TraySlot {
  slotId: string;
  card: VocabularyItem;
  originalIndex: number;
  isMissing: boolean;
  isRevealed: boolean;
}

export interface TeamScores {
  red: number;
  blue: number;
  yellow: number;
  green: number;
}

// ============================================================================
// STREAM B MULTIPLAYER RTDB CONTRACTS (STUDENT AUDIENCE VOTING & ANALYTICS)
// ============================================================================

export interface MissingCandidateChoice {
  id: string;
  english: string;
  ja: string;
  jaKanji?: string;
  jaHiragana?: string;
  ruby?: RubySegment[];
  imageUrl?: string | null;
  soundFile?: string;
}

export interface MissingRoomMeta {
  roomCode: string;
  schoolId: string;
  classId: string;
  grade: GradeLevel | string;
  unit: string;
  createdAt: number;
  hostActive: boolean;
}

export interface MissingRoomState {
  phase: GamePhase;
  roundNumber: number;
  cardCount: CardCount;
  missingCount: MissingCount;
  displayTier: DisplayTier;
  missingWordIds: string[];
  revealedMissingIds: string[];
  candidateChoices: MissingCandidateChoice[];
  guessingStartTimestamp: number | null;
  isRevealed: boolean;
  updatedAt: number;
}

export interface MissingStudentAnswer {
  seat: number;
  nickname: string;
  selectedWordIds: string[];
  selectedWordId: string; // Primary choice for 1-card mode compatibility
  isCorrect: boolean;
  responseTimeMs: number;
  submittedAt: number;
}

export interface MissingRoomStats {
  totalSubmissions: number;
  correctCount: number;
  choiceCounts: Record<string, number>;
  fastestSeat: number | null;
  fastestNickname: string | null;
  fastestTimeMs: number | null;
}

export interface MissingRoomData {
  meta: MissingRoomMeta;
  state: MissingRoomState;
  answers?: Record<string, MissingStudentAnswer>;
  stats?: MissingRoomStats;
}
