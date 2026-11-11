import { VocabularyItem } from '@data/types';
import { SchoolId } from '@/types/roster';
import { VocabularyScope } from '@/context/VocabularyContext';
import { SessionAnalytics } from '@/types/analytics';
import { MathGrade, MathDomain } from './mathTypes';

export type QuizSubject = 'ENGLISH' | 'MATH';

export type QuizScope = VocabularyScope | 'CUSTOM_UNITS';

export type PromptType =
  | 'JA_MEANING'
  | 'AUDIO_ONLY'
  | 'IMAGE_ONLY'
  | 'EN_WORD'
  | 'EN_TO_JA'
  | 'PHONICS_MASK'
  | 'SHORT_CLOZE'
  | 'CATEGORY_HUNT'
  | 'THREE_HINTS';

export type ChoiceImageMode = 'AUTO_CLEVER' | 'TEXT_ONLY';
export type EnglishReadingAid = 'SPELLING_ONLY' | 'WITH_KATAKANA';

export type GameMode = 'INDIVIDUAL' | 'TEAM';

export type TeamAssignmentMode = 'AUTO_BALANCE' | 'STUDENT_CHOICE';

export type TeamId = 
  | 'team_red' 
  | 'team_white'
  | 'team_blue' 
  | 'team_green'
  | 'team_yellow' 
  | 'team_orange' 
  | 'team_purple'
  | 'team_indigo' 
  | 'team_violet';

export type IpadDisplayMode = 'EYES_UP' | 'MIRRORED';

export type DeliveryStream = 'STREAM_B_MULTIPLAYER' | 'STREAM_A_FRONT_SCREEN';

export type QuizStatus = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'GAME_OVER' | 'CLOSED' | 'SPRINT_RACE' | 'GRAND_PRIX_3D' | 'TUG_OF_WAR' | 'VOLLEYBALL';

export type GamePlayType = 'KAHOOT' | 'SPRINT_RACE' | 'GRAND_PRIX_3D' | 'TUG_OF_WAR' | 'VOLLEYBALL';

export type RecallDelaySeconds = 0 | 3 | 5;

export type DistractorEliminationMode = 'OFF' | 'HALFWAY' | 'GRADUAL';

export type SprintModeType = 'LAP_RACE' | 'TIME_TRIAL';

export interface SprintSettings {
  sprintMode: SprintModeType; // 'LAP_RACE' (First to finish N questions/laps) | 'TIME_TRIAL' (Most questions/distance in X seconds)
  lapCount: number; // 20, 30, 40, 60, -1 (endurance grand prix laps)
  timeLimitSeconds: number; // 30, 60, 90, 120, 180
  graceCountdownSeconds: number; // 15, 20, 25, 30
  targetLaps3D?: number; // 1, 2, 3, 5 (for GRAND_PRIX_3D circuit laps)
  wrongSpeedLossRatio?: number; // 0, 0.25, 0.33 (default 1/3), 0.5, 0.75, 1.0
  // ==========================================================================
  // [ANTIGRAVITY REFACTOR]: Enforced GEMINI.md §7 Mandatory >= 2.5s Lockout Floor
  // WHAT CHANGED: Updated wrongLockoutSeconds documentation and runtime clamping
  // in `resolveLockoutPenaltySeconds` / `QuizStudentGrandPrix3D` / `QuizStudentSprint`.
  // WHY: Previously documented as `0, 0.5, 1.0 (default 1s)`, which violated
  // GEMINI.md §7 ("In competitive speed games, incorrect choices MUST incur at
  // least a 2.5s Pit Stop lockout penalty so guessing is mathematically slower
  // than reading"). Runtime now clamps `Math.max(2.5, wrongLockoutSeconds ?? 2.5)`.
  // ==========================================================================
  wrongLockoutSeconds?: number; // Minimum 2.5s floor enforced at runtime (2.5, 3.5, 5.0)
}

export type TugOfWarMatchFormat = 'SINGLE' | 'BEST_OF_3' | 'BEST_OF_5' | 'BEST_OF_7';

export interface TugOfWarSettings {
  timeLimitSeconds: number; // 30, 60, 90, 120, 180
  pullSensitivity: number;  // 15, 20, 25 (multiplier on normalized lead)
  mudLockoutSeconds: number; // 2.5
  matchFormat?: TugOfWarMatchFormat;
}

export type VolleyballGameStyle = 'COOP_RALLY' | 'TEAM_VS';

export type VolleyballPhase = 'SERVE' | 'DIG' | 'SET' | 'SPIKE' | 'WAITING_OPPONENT' | 'BALL_DROPPED';

export interface VolleyballLiveState {
  phase: VolleyballPhase;
  activeTeam: 'team_red' | 'team_white' | 'all';
  servingTeam: 'team_red' | 'team_white';
  currentRally: number;
  highestRally: number;
  redScore: number;
  whiteScore: number;
  lastHitterName?: string;
  lastHitType?: string;
  phaseStartTime: number;
  phaseDurationMs: number;
  updatedAt: number;
}

export interface VolleyballSettings {
  timeLimitSeconds: number; // 60, 90, 120, 180
  gameStyle: VolleyballGameStyle; // 'COOP_RALLY' (All-class cooperation) | 'TEAM_VS' (Red vs White battle)
  targetRallies?: number; // 30, 50, or 100
  missLockoutSeconds?: number; // 2.0s
  hideScoreUntilEnd?: boolean; // Mystery count until whistle
}

export interface PodiumFinisher {
  playerId: string;
  nickname: string;
  finishTimeMs: number;
  rank: number;
  teamId?: TeamId;
  correctCount: number;
  totalAnswered: number;
  avatar?: string;
  frame?: string;
  title?: string;
  attendanceNumber?: number;
}

export interface QuizOption {
  id: string;
  english: string;
  ja_kanji?: string;
  ja_hiragana?: string;
  en_katakana?: string;
  ruby?: { base: string; ruby: string }[];
  phonicsChunks?: string[];
  image?: string;
  sound?: string;
  symbol: 'triangle' | 'diamond' | 'circle' | 'square';
  color: 'red' | 'blue' | 'yellow' | 'green';
}

export interface QuizQuestion {
  questionIndex: number;
  totalQuestions: number;
  targetWordId: string;
  targetWordEnglish: string;
  targetWordJa: string;
  targetWordHiragana?: string;
  targetWordKatakana?: string;
  targetWordRuby?: { base: string; ruby: string }[];
  phonicsChunks?: string[];
  phonicsPattern?: string;
  exampleSentenceEn?: string;
  exampleSentenceJa?: string;
  categoryNameEn?: string;
  categoryNameJa?: string;
  threeHints?: { en: string; ja: string }[];
  isDrsReview?: boolean;
  isMath?: boolean;
  mathGrade?: MathGrade;
  mathDomain?: MathDomain;
  mathTopicId?: string;
  promptType: PromptType;
  promptText: string;
  promptSubtext?: string;
  promptImage?: string;
  promptSound?: string;
  options: QuizOption[];
  correctOptionId?: string;
  distractorOptionIds?: string[];
  englishReadingAid?: EnglishReadingAid;
  startTime: number;
  timeLimitMs: number;
}

export interface PlayerAnswerRecord {
  questionIndex: number;
  optionId: string;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsEarned: number;
  incorrectAttempts?: number;
}

export interface SprintCumulativeStats {
  score: number;
  currentStreak: number;
  maxStreak: number;
  correctCount: number;
  totalAnswered: number;
  fastestTimeMs?: number;
  speedKmh?: number;
  distanceMeters?: number;
  inPitStop?: boolean;
}

export interface QuizPlayer {
  id: string;
  nickname: string;
  avatar?: string;
  teamId?: TeamId;
  attendanceNumber?: number;
  score: number;
  currentStreak: number;
  maxStreak: number;
  correctCount: number;
  totalAnswered: number;
  fastestTimeMs: number;
  joinedAt: number;
  answers: Record<number, PlayerAnswerRecord>;
  lastAnswer?: {
    optionId: string;
    isCorrect: boolean;
    pointsEarned: number;
    timeTakenMs: number;
  };
  // Sprint Race & 3D Grand Prix mode fields
  sprintProgress?: number;
  finishTimeMs?: number;
  finishRank?: number;
  isFinished?: boolean;
  isDnf?: boolean;
  speedKmh?: number;
  distanceMeters?: number;
  inPitStop?: boolean;
  kartTheme?: string;
  frame?: string;
  title?: string;
  greeting?: string;
  greetingTimestamp?: number;
  botDifficulty?: 'chill' | 'normal' | 'fast';
}

export interface QuizResponse {
  answerId: string;
  timeTakenMs: number;
  submittedAt: number;
}

export const PRE_GAME_GREETINGS = [
  { id: 'hello', text: 'Hello! 👋', jaText: 'ハロー！' },
  { id: 'morning', text: 'Good morning! ☀️', jaText: 'おはよう！' },
  { id: 'ready', text: "I'm ready! ⚡", jaText: '準備OK！' },
  { id: 'letsgo', text: "Let's go! 🚀", jaText: 'いくぞ！' },
  { id: 'happy', text: "I'm happy! 😊", jaText: 'うれしい！' },
  { id: 'english', text: 'I like English! 📖', jaText: '英語がすき！' },
  { id: 'luck', text: 'Good luck! 🍀', jaText: 'がんばろう！' },
  { id: 'herewego', text: 'Here we go! 🏁', jaText: 'さあスタート！' }
] as const;

export type PreGameGreetingId = typeof PRE_GAME_GREETINGS[number]['id'];

export interface TeamScoreData {
  name: string;
  jaName: string;
  score: number;
  correctCount: number;
  memberCount: number;
  averageScore: number;
  color: string;
  emoji: string;
  mvpPlayerId?: string;
  mvpNickname?: string;
  mvpScore?: number;
}

export interface AwardCategoryToggles {
  effortGrowth: boolean;   // Never Give Up, Rising Star, Flawless Finish, Last Spurt
  skillChallenge: boolean; // Iron Defense, Wise Owl, All-Rounder, Quick Draw
  funSurprise: boolean;    // Rainbow Master, Just-in-Time, Twin Sync, Median Hero
}

export interface ClassroomAward {
  id: string;
  title: string;
  jaTitle: string;
  description: string;
  enDescription?: string;
  jaDescription?: string;
  icon: string;
  color: string;
  recipients: string[]; // nicknames
  badge: string;
}

export interface QuizRoomState {
  code: string;
  hostId: string;
  status: QuizStatus;
  subject?: QuizSubject;
  mathGrade?: MathGrade;
  mathDomain?: MathDomain;
  mathTopicId?: string;
  createdAt?: number;
  updatedAt?: number;
  eyesUp?: boolean;
  grade: string;
  unit: string;
  schoolId?: SchoolId;
  classId?: string;
  recordRoster?: boolean;
  isStudentHost?: boolean;
  isTestGame?: boolean;
  mode: GameMode;
  teamAssignment?: TeamAssignmentMode;
  teamCount?: number;
  activeTeams?: TeamId[];
  deliveryStream: DeliveryStream;
  ipadDisplayMode: IpadDisplayMode;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentQuestion: QuizQuestion | null;
  players: Record<string, QuizPlayer>;
  responses?: Record<string, QuizResponse> | null;
  teamScores: Partial<Record<TeamId, TeamScoreData>>;
  awardToggles: AwardCategoryToggles;
  awardedBadges?: ClassroomAward[];
  troubleWords?: Record<string, { english: string; ja: string; image?: string; sound?: string; incorrectCount: number; totalCount: number }>;
  boundStudents?: Record<number, { playerId: string; nickname: string; score: number }>;

  // Game Variety & Sprint Mode State
  gamePlayType?: GamePlayType;
  recallDelaySeconds?: RecallDelaySeconds;
  eliminateDistractors?: boolean;
  distractorEliminationMode?: DistractorEliminationMode;
  sprintSettings?: SprintSettings;
  tugOfWarSettings?: TugOfWarSettings;
  tugOfWarStartTime?: number;
  tugOfWarFinished?: boolean;
  tugOfWarRound?: number;
  tugOfWarRoundWins?: { team_red?: number; team_white?: number };
  tugOfWarBaselinePulls?: Record<string, number>;
  volleyballSettings?: VolleyballSettings;
  volleyballStartTime?: number;
  volleyballFinished?: boolean;
  volleyballLiveState?: VolleyballLiveState;
  questions?: QuizQuestion[];
  raceStartTime?: number;
  raceDurationSeconds?: number;
  timeLimitSeconds?: number;
  raceFinishGraceStartTime?: number;
  podiumFinishers?: PodiumFinisher[];
  bgm?: string;
  vocabularyScope?: QuizScope;
  selectedUnits?: string[];
  choiceImageMode?: ChoiceImageMode;
  englishReadingAid?: EnglishReadingAid;
  analytics?: SessionAnalytics;
}

export interface QuizHostSettings {
  subject?: QuizSubject;
  mathGrade?: MathGrade;
  mathDomain?: MathDomain;
  mathTopicId?: string;
  questionCount: number;
  timeLimitSeconds: number;
  gameMode: GameMode;
  teamAssignment?: TeamAssignmentMode;
  teamCount?: number;
  activeTeams?: TeamId[];
  deliveryStream: DeliveryStream;
  ipadDisplayMode: IpadDisplayMode;
  promptTypes: PromptType[];
  awardToggles: AwardCategoryToggles;
  schoolId?: SchoolId;
  classId?: string;
  recordRoster?: boolean;
  isStudentHost?: boolean;
  isTestGame?: boolean;

  // New variety toggles
  gamePlayType?: GamePlayType;
  recallDelaySeconds?: RecallDelaySeconds;
  eliminateDistractors?: boolean;
  distractorEliminationMode?: DistractorEliminationMode;
  sprintSettings?: SprintSettings;
  tugOfWarSettings?: TugOfWarSettings;
  volleyballSettings?: VolleyballSettings;
  bgm?: string;
  customWordPool?: VocabularyItem[];
  vocabularyScope?: QuizScope;
  selectedUnits?: string[];
  choiceImageMode?: ChoiceImageMode;
  englishReadingAid?: EnglishReadingAid;
}

export const TEAM_PRESETS: Record<TeamId, { name: string; jaName: string; color: string; bg: string; border: string; text: string; emoji: string }> = {
  team_red: { name: 'Red Team', jaName: '赤組', color: 'red', bg: 'bg-rose-500 text-white', border: 'border-rose-600', text: 'text-rose-500', emoji: '🔴' },
  team_white: { name: 'White Team', jaName: '白組', color: 'white', bg: 'bg-white text-slate-900 border border-slate-300 dark:bg-slate-100 dark:text-slate-900', border: 'border-slate-300 dark:border-slate-400', text: 'text-slate-700 dark:text-slate-200', emoji: '⚪' },
  team_blue: { name: 'Blue Team', jaName: '青組', color: 'blue', bg: 'bg-blue-500 text-white', border: 'border-blue-600', text: 'text-blue-500', emoji: '🔵' },
  team_green: { name: 'Green Team', jaName: '緑組', color: 'green', bg: 'bg-emerald-500 text-white', border: 'border-emerald-600', text: 'text-emerald-500', emoji: '🟢' },
  team_yellow: { name: 'Yellow Team', jaName: '黄組', color: 'yellow', bg: 'bg-amber-400 text-slate-900', border: 'border-amber-500', text: 'text-amber-500', emoji: '🟡' },
  team_orange: { name: 'Orange Team', jaName: '橙組', color: 'orange', bg: 'bg-orange-500 text-white', border: 'border-orange-600', text: 'text-orange-500', emoji: '🟠' },
  team_purple: { name: 'Purple Team', jaName: '紫組', color: 'purple', bg: 'bg-purple-600 text-white', border: 'border-purple-700', text: 'text-purple-400', emoji: '🟣' },
  team_indigo: { name: 'Purple Team', jaName: '紫組', color: 'purple', bg: 'bg-purple-600 text-white', border: 'border-purple-700', text: 'text-purple-400', emoji: '🟣' },
  team_violet: { name: 'Purple Team', jaName: '紫組', color: 'purple', bg: 'bg-purple-600 text-white', border: 'border-purple-700', text: 'text-purple-400', emoji: '🟣' }
};

export const AVAILABLE_TEAMS: TeamId[] = [
  'team_red',
  'team_white',
  'team_blue',
  'team_yellow',
  'team_green',
  'team_purple'
];

export const RAINBOW_TEAM_ORDER: TeamId[] = [
  'team_red',
  'team_white',
  'team_blue',
  'team_yellow',
  'team_green',
  'team_purple'
];

export const OPTION_STYLES = [
  { symbol: 'triangle' as const, shapeName: '▲', color: 'red' as const, bg: 'bg-rose-500', hoverBg: 'hover:bg-rose-600', border: 'border-rose-700', activeRing: 'ring-rose-300' },
  { symbol: 'diamond' as const, shapeName: '◆', color: 'blue' as const, bg: 'bg-blue-500', hoverBg: 'hover:bg-blue-600', border: 'border-blue-700', activeRing: 'ring-blue-300' },
  { symbol: 'circle' as const, shapeName: '●', color: 'yellow' as const, bg: 'bg-amber-400', hoverBg: 'hover:bg-amber-500', border: 'border-amber-600', activeRing: 'ring-amber-200', textColor: 'text-slate-900' },
  { symbol: 'square' as const, shapeName: '■', color: 'green' as const, bg: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-600', border: 'border-emerald-700', activeRing: 'ring-emerald-300' }
];

export const FUN_NICKNAMES = [
  'Cool Panda 🐼', 'Fast Tiger 🐯', 'Super Koala 🐨', 'Happy Dolphin 🐬',
  'Star Lion 🦁', 'Brave Eagle 🦅', 'Smart Owl 🦉', 'Rainbow Rabbit 🐰',
  'Speedy Cheetah 🐆', 'Golden Fox 🦊', 'Cosmic Penguin 🐧', 'Lucky Bear 🐻'
];