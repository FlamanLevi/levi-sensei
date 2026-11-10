import { SchoolId } from './roster';
import { GameMode, GamePlayType, PromptType } from '@/games/quiz/types';

export type ErrorTypology = 'PHONEMIC' | 'ORTHOGRAPHIC' | 'SEMANTIC' | 'RANDOM_GUESS';

export interface DistractorStats {
  optionId: string;
  text: string;
  count: number;
  percentage: number;
}

export interface ItemDiagnostic {
  wordId: string;
  english: string;
  ja: string;
  promptType: PromptType;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  accuracy: number; // 0 - 100%
  difficultyIndex: number; // p-value: 0.00 - 1.00 (proportion correct)
  discriminationIndex: number; // D-index: -1.00 to +1.00 (upper 27% vs lower 27%)
  averageLatencyMs: number;
  distractorBreakdown: DistractorStats[];
  errorTypology: ErrorTypology;
}

export interface LatencyQuadrants {
  fastCorrect: number; // < 2.5s (Automaticity / Fluency)
  slowCorrect: number; // >= 2.5s (Processing Effort / Deliberation)
  fastIncorrect: number; // < 1.5s (Impulsive Guessing / Button Mashing)
  slowIncorrect: number; // >= 1.5s (Cognitive Difficulty / Genuine Confusion)
}

export interface LapBucket {
  lapRange: string; // e.g. "Laps 1-10", "Laps 11-20"
  totalAttempts: number;
  correctCount: number;
  accuracy: number;
  averageLatencyMs: number;
}

export interface QuietAchiever {
  attendanceNumber: number;
  nickname: string;
  accuracy: number;
  totalTouches: number;
  averageLatencyMs: number;
  streak: number;
  avatar?: string;
}

export interface SupportNeedStudent {
  attendanceNumber: number;
  nickname: string;
  accuracy: number;
  pitStops: number;
  troubleWordCount: number;
  focusNeed: string;
  jaFocusNeed: string;
  avatar?: string;
}

export interface WarmUpRecommendation {
  focusTopic: string;
  jaFocusTopic: string;
  activityType: string;
  jaActivityType: string;
  instructionEn: string;
  instructionJa: string;
  targetWords: string[];
}

export interface SessionAnalytics {
  id: string; // Unique session ID
  roomCode: string;
  schoolId: SchoolId;
  classId: string;
  grade: string;
  unit: string;
  gamePlayType: GamePlayType;
  gameMode: GameMode;
  timestamp: number;
  durationSeconds: number;

  // The Engagement Multipliers (Administrator & MEXT Key Metrics)
  totalClassTouches: number; // Sum of all student answers across the entire class
  activeParticipants: number;
  rosterSize: number;
  participationRate: number; // percentage of active roster
  overallAccuracy: number; // percentage of total answers correct
  averageTouchesPerStudent: number;
  averageLatencyMs: number;

  // Item & Vocabulary Psychometrics
  items: Record<string, ItemDiagnostic>;
  topMissedWords: ItemDiagnostic[];
  topMasteredWords: ItemDiagnostic[];

  // Cognitive Automaticity & Speed Distribution
  latencyQuadrants: LatencyQuadrants;

  // Sprint Stamina & Fatigue Curve (if F1 mode)
  lapBuckets?: LapBucket[];
  totalPitStops?: number;
  averagePitStopSec?: number;

  // JTE Classroom Guidance & Differentiated Instruction
  quietAchievers: QuietAchiever[];
  supportStudents: SupportNeedStudent[];
  warmUpRecommendation: WarmUpRecommendation;
}

export interface ClassAnalyticsSummary {
  schoolId: SchoolId;
  classId: string;
  totalSessionsRecorded: number;
  cumulativeClassTouches: number;
  averageClassAccuracy: number;
  lastSessionTimestamp: number;
  historicalTroubleWords: Record<string, {
    english: string;
    ja: string;
    missCount: number;
    totalEncountered: number;
  }>;
}
