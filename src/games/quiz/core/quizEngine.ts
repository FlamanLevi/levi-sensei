/**
 * ============================================================================
 * [ANTIGRAVITY REFACTOR MODULE: src/games/quiz/core/quizEngine.ts]
 * ============================================================================
 * PURPOSE FOR GOOGLE ANTIGRAVITY:
 * This new core module extracts and deduplicates all pure game-engine rules,
 * RTDB write-throttling logic, scoring formulas, lockout penalty floors,
 * `!isEnPrompt` anti-cheating presentation rules, trouble-word aggregation,
 * and mini-game strategy descriptors across Host and Student controllers.
 *
 * WHY THIS WAS CREATED (GEMINI.md INVARIANTS):
 * 1. GEMINI.md §5 (5-10 Hz RTDB Throttling & Spoke Isolation):
 *    `createRtdbWriteThrottler` coalesces rapid student telemetry & answer
 *    updates into at most 8 Hz (125ms) writes to `roomPlayers/{code}/{playerId}`,
 *    eliminating the O(N^2) dual-write storm in `useQuizRoom.ts:1863-1866`.
 * 2. GEMINI.md §7 (2.5s Minimum Pit Stop Lockout Penalty):
 *    `resolveLockoutPenaltySeconds` enforces `Math.max(2.5, ...)` on
 *    3D Grand Prix, Tug of War, and Tamaire mistakes so guessing is
 *    never faster than reading and UI labels match the active penalty tier.
 * 3. GEMINI.md §3 & §7 (`!isEnPrompt` Cheating Prevention & Furigana):
 *    `resolveOptionPresentation` centralizes option image visibility
 *    (`!isEnPrompt && !hasPromptImage && Boolean(option.image)`), Katakana reading
 *    aids, and `<RubyText />` furigana flags across all 4 game modes.
 * 4. DRY Consolidation:
 *    `computeTroubleWordsMap` and `reconcileTeamScores` replace 4 copy-pasted
 *    120-line loops in `QuizHostContainer.tsx`, `endSprintRace`, `endTugOfWar`,
 *    and `endVolleyball`.
 * ============================================================================
 */

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
export type EnglishReadingAid = 'SPELLING_ONLY' | 'WITH_KATAKANA';
export type DistractorEliminationMode = 'OFF' | 'HALFWAY' | 'GRADUAL';
export type GamePlayType = 'KAHOOT' | 'SPRINT_RACE' | 'GRAND_PRIX_3D' | 'TUG_OF_WAR' | 'VOLLEYBALL';
export type QuizStatus =
  | 'LOBBY'
  | 'QUESTION'
  | 'REVEAL'
  | 'LEADERBOARD'
  | 'GAME_OVER'
  | 'CLOSED'
  | 'SPRINT_RACE'
  | 'GRAND_PRIX_3D'
  | 'TUG_OF_WAR'
  | 'VOLLEYBALL';

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
  promptType: PromptType;
  promptText: string;
  promptSubtext?: string;
  promptImage?: string;
  promptSound?: string;
  threeHints?: { en: string; ja: string }[];
  isDrsReview?: boolean;
  options: QuizOption[];
  correctOptionId?: string;
  distractorOptionIds?: string[];
  englishReadingAid?: EnglishReadingAid;
  startTime: number;
  timeLimitMs: number;
  isMath?: boolean;
  mathGrade?: string;
  mathDomain?: string;
  mathTopicId?: string;
}

export interface PlayerAnswerRecord {
  questionIndex: number;
  optionId: string;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsEarned: number;
  incorrectAttempts?: number;
}

export interface QuizPlayer {
  id: string;
  nickname: string;
  avatar?: string;
  frame?: string;
  title?: string;
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
    questionIndex?: number;
    optionId: string;
    isCorrect: boolean;
    pointsEarned: number;
    timeTakenMs: number;
  };
  sprintProgress?: number;
  finishTimeMs?: number;
  finishRank?: number;
  isFinished?: boolean;
  isDnf?: boolean;
  speedKmh?: number;
  distanceMeters?: number;
  inPitStop?: boolean;
}

export interface TroubleWordEntry {
  english: string;
  ja: string;
  image?: string;
  sound?: string;
  incorrectCount: number;
  totalCount: number;
}

export interface TeamScoreSummary {
  name: string;
  jaName: string;
  color: string;
  emoji: string;
  score: number;
  correctCount: number;
  memberCount: number;
  averageScore: number;
  mvpPlayerId?: string;
  mvpNickname?: string;
  mvpScore?: number;
}

export const TEAM_PRESETS: Record<TeamId, { name: string; jaName: string; color: string; emoji: string }> = {
  team_red: { name: 'Red Team', jaName: '赤組', color: 'red', emoji: '🔴' },
  team_white: { name: 'White Team', jaName: '白組', color: 'white', emoji: '⚪' },
  team_blue: { name: 'Blue Team', jaName: '青組', color: 'blue', emoji: '🔵' },
  team_green: { name: 'Green Team', jaName: '緑組', color: 'green', emoji: '🟢' },
  team_yellow: { name: 'Yellow Team', jaName: '黄組', color: 'yellow', emoji: '🟡' },
  team_orange: { name: 'Orange Team', jaName: '橙組', color: 'orange', emoji: '🟠' },
  team_purple: { name: 'Purple Team', jaName: '紫組', color: 'purple', emoji: '🟣' },
  team_indigo: { name: 'Purple Team', jaName: '紫組', color: 'purple', emoji: '🟣' },
  team_violet: { name: 'Purple Team', jaName: '紫組', color: 'purple', emoji: '🟣' },
};

// ============================================================================
// [ANTIGRAVITY REFACTOR #1]: RTDB 5-10 Hz Write Throttler & Spoke Coalescer
// ============================================================================
// WHAT CHANGED:
// Added `createRtdbWriteThrottler` to coalesce high-frequency updates into at
// most 8 Hz (125ms default, hard-clamped to >= 100ms / <= 10 Hz).
// WHY:
// Per GEMINI.md §5 ("Throttle high-frequency client position/progress writes
// to 5-10 Hz"), student iPads in Sprint, 3D Grand Prix, Tug of War, and
// Volleyball must never spam Firebase RTDB on rapid taps or 60fps physics loops.
// Nested paths like `answers/0` and `answers/1` are shallow-merged into a single
// payload so zero student answer history is lost between 125ms ticks.
// ============================================================================

export interface ThrottlerController<TPayload extends Record<string, any>> {
  push: (patch: TPayload, immediate?: boolean) => void;
  flush: () => Promise<void>;
  dispose: () => void;
  getStats: () => { queuedCalls: number; dispatchedWrites: number };
}

const getMonotonicNowMs = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export function createRtdbWriteThrottler<TPayload extends Record<string, any>>(
  writer: (mergedPayload: TPayload) => Promise<void> | void,
  intervalMs: number = 125 // 8 Hz default (strictly <= 10 Hz / >= 100ms)
): ThrottlerController<TPayload> {
  const safeIntervalMs = Math.max(100, intervalMs); // Hard clamp to <= 10 Hz per GEMINI.md §5
  let pendingPatch: TPayload | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastWriteTime = -safeIntervalMs;
  let queuedCalls = 0;
  let dispatchedWrites = 0;
  let disposed = false;

  const executeWrite = async () => {
    if (disposed || !pendingPatch) return;
    const payloadToSend = pendingPatch;
    pendingPatch = null;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastWriteTime = getMonotonicNowMs();
    dispatchedWrites++;
    await writer(payloadToSend);
  };

  const push = (patch: TPayload, immediate = false) => {
    if (disposed) return;
    queuedCalls++;
    pendingPatch = pendingPatch ? { ...pendingPatch, ...patch } : { ...patch };

    // Immediate flush is used for terminal events (e.g. `isFinished: true` or `BALL_DROPPED`)
    if (immediate) {
      void executeWrite();
      return;
    }

    const now = getMonotonicNowMs();
    const elapsed = now - lastWriteTime;

    if (elapsed >= safeIntervalMs && !timerId) {
      void executeWrite();
    } else if (!timerId) {
      const remainingMs = Math.max(10, safeIntervalMs - elapsed);
      timerId = setTimeout(() => {
        timerId = null;
        void executeWrite();
      }, remainingMs);
    }
  };

  const flush = async () => {
    if (pendingPatch) {
      await executeWrite();
    }
  };

  const dispose = () => {
    disposed = true;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    pendingPatch = null;
  };

  return {
    push,
    flush,
    dispose,
    getStats: () => ({ queuedCalls, dispatchedWrites }),
  };
}

// ============================================================================
  // [ANTIGRAVITY REFACTOR #2]: Shared Scoring, 2.5s Lockout & !isEnPrompt Rules
// ============================================================================
// WHAT CHANGED:
// Extracted `evaluateOptionMatch`, `calculateClassicScore`, `calculateArcadeScore`,
// `resolveLockoutPenaltySeconds`, `resolveOptionPresentation`, and
// `computeEliminatedOptionIds` from 6 separate Host/Student components.
// WHY:
// 1. `resolveLockoutPenaltySeconds` enforces the >= 2.5s lockout floor and keeps
//    Pit Stop / slip UI labels synchronized with `QuizStudentGrandPrix3D.tsx`
//    and `QuizStudentTugOfWar.tsx` (GEMINI.md §7).
// 2. `resolveOptionPresentation` fixes `QuizStudentTugOfWar.tsx` which
//    previously omitted `<RubyText />` furigana, Katakana reading aids, and
//    `!isEnPrompt` option image guards (GEMINI.md §3 & §7).
// ============================================================================

export function evaluateOptionMatch(question: QuizQuestion, optionId: string): boolean {
  if (!optionId) return false;
  const targetId = question.correctOptionId || question.targetWordId;
  if (targetId && optionId === targetId) return true;

  const chosenOption = question.options.find((o) => o.id === optionId);
  if (
    chosenOption?.english &&
    question.targetWordEnglish &&
    chosenOption.english.trim().toLowerCase() === question.targetWordEnglish.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

export function calculateClassicScore(params: {
  isCorrect: boolean;
  timeTakenMs: number;
  timeLimitMs: number;
  recallDelaySeconds?: number;
  newStreak: number;
}): number {
  const { isCorrect, timeTakenMs, timeLimitMs, recallDelaySeconds = 0, newStreak } = params;
  if (!isCorrect) return 0;

  const safeLimitMs = timeLimitMs > 0 ? timeLimitMs : 15000;
  const safeTimeTaken =
    typeof timeTakenMs === 'number' && !isNaN(timeTakenMs) && timeTakenMs > 0
      ? Math.min(safeLimitMs, Math.max(100, timeTakenMs))
      : safeLimitMs;

  const recallDelayMs = recallDelaySeconds * 1000;
  const activeWindowMs = Math.max(1000, safeLimitMs - recallDelayMs);
  const effectiveTimeTakenMs = Math.max(0, safeTimeTaken - recallDelayMs);
  const speedRatio = Math.max(0, Math.min(1, 1 - effectiveTimeTakenMs / activeWindowMs));
  const speedPoints = Math.floor(speedRatio * 500);
  const streakBonus = Math.min(250, Math.max(0, newStreak - 1) * 50);

  return 500 + speedPoints + streakBonus;
}

export function calculateArcadeScore(params: {
  mode: 'SPRINT_RACE' | 'GRAND_PRIX_3D' | 'TUG_OF_WAR' | 'VOLLEYBALL';
  isCorrect: boolean;
  newStreak: number;
  timeTakenMs: number;
}): number {
  const { mode, isCorrect, newStreak, timeTakenMs } = params;
  if (!isCorrect) return 0;

  if (mode === 'GRAND_PRIX_3D') {
    return 100 + Math.min(200, newStreak * 25);
  }

  const base = 1000;
  const streakBonus = Math.min(500, Math.max(0, newStreak - 1) * 100);
  if (mode === 'SPRINT_RACE') {
    const speedBonus = timeTakenMs < 1800 ? 250 : timeTakenMs < 3000 ? 150 : 0;
    return base + streakBonus + speedBonus;
  }
  return base + streakBonus;
}

export interface LockoutPenaltyResolution {
  penaltySeconds: number;
  tierIndex: 1 | 2 | 3;
  badgeTextEn: string;
  badgeTextJa: string;
  tierLabelEn: string;
  tierLabelJa: string;
  subtextEn: string;
  subtextJa: string;
  icon: string;
}

export function resolveLockoutPenaltySeconds(params: {
  mode: GamePlayType;
  mistakeCountOnQuestion: number;
  configuredLockoutSeconds?: number;
}): LockoutPenaltyResolution {
  const { mode, mistakeCountOnQuestion, configuredLockoutSeconds } = params;

  if (mode === 'SPRINT_RACE' || mode === 'GRAND_PRIX_3D') {
    // [ANTIGRAVITY REFACTOR]: Enforces GEMINI.md §7 mandatory >= 2.5s floor
    // Escalating tiers: 1st miss = 2.5s (Tire Slip), 2nd miss = 3.5s (Pit Stop), 3rd+ miss = 5.0s (Engine Service)
    const baseFloor = Math.max(2.5, configuredLockoutSeconds ?? 2.5);
    if (mistakeCountOnQuestion <= 1) {
      return {
        penaltySeconds: baseFloor,
        tierIndex: 1,
        badgeTextEn: 'TIRE SLIP! / QUICK RECOVERY',
        badgeTextJa: 'スリップ！ / クイックリカバー',
        tierLabelEn: `Pit Stop! (+${baseFloor.toFixed(1)}s)`,
        tierLabelJa: `ピットストップ！ (+${baseFloor.toFixed(1)}秒)`,
        subtextEn: 'Quick correction! Back in the race shortly!',
        subtextJa: '体勢を立て直してすぐ再開！',
        icon: '🛞',
      };
    }
    if (mistakeCountOnQuestion === 2) {
      const sec = Math.max(3.5, baseFloor + 1.0);
      return {
        penaltySeconds: sec,
        tierIndex: 2,
        badgeTextEn: 'PIT STOP! / RAPID TIRE SERVICE',
        badgeTextJa: 'ピットイン！ / タイヤ交換',
        tierLabelEn: `Tire Service! (+${sec.toFixed(1)}s)`,
        tierLabelJa: `タイヤ交換！ (+${sec.toFixed(1)}秒)`,
        subtextEn: 'Rapid pit stop! Fresh tires fitted!',
        subtextJa: 'ピットクルーがタイヤ交換中！まもなく発進！',
        icon: '🔧',
      };
    }
    const sec = Math.max(5.0, baseFloor + 2.5);
    return {
      penaltySeconds: sec,
      tierIndex: 3,
      badgeTextEn: 'ENGINE CHECK / LAST CHANCE',
      badgeTextJa: 'マシン点検 / ラストチャンス',
      tierLabelEn: `Full Engine Check! (+${sec.toFixed(1)}s)`,
      tierLabelJa: `マシン点検！ (+${sec.toFixed(1)}秒)`,
      subtextEn: 'Check carefully! Only one choice remaining!',
      subtextJa: '落ち着いて！残りはあと1つ！',
      icon: '⚠️',
    };
  }

  if (mode === 'TUG_OF_WAR') {
    const sec = Math.max(2.5, configuredLockoutSeconds ?? 2.5);
    return {
      penaltySeconds: sec,
      tierIndex: 1,
      badgeTextEn: 'MUD SLIP! / REGAIN GRIP',
      badgeTextJa: 'ぬかるみでスリップ！',
      tierLabelEn: `Mud Slip! (+${sec.toFixed(1)}s)`,
      tierLabelJa: `すべった！ (+${sec.toFixed(1)}秒)`,
      subtextEn: 'Slipped in the mud! Regaining grip on the rope!',
      subtextJa: '足もとを固めてもう一度引こう！',
      icon: '💦',
    };
  }

  // [ANTIGRAVITY REFACTOR]: Replaced Volleyball 2.0s "Missed Dig" with Undokai
  // Bean Bag Toss (Tamaire / 玉入れ) 2.5s "Fumbled Bean Bag" lockout floor
  // per GEMINI.md §7 ("In competitive speed games, incorrect choices MUST incur
  // at least a 2.5s lockout penalty so guessing is mathematically slower than reading").
  const sec = Math.max(2.5, configuredLockoutSeconds ?? 2.5);
  return {
    penaltySeconds: sec,
    tierIndex: 1,
    badgeTextEn: 'FUMBLED BEAN BAG! / RECOVER',
    badgeTextJa: 'お手玉を落とした！',
    tierLabelEn: `Fumbled Bag! (+${sec.toFixed(1)}s)`,
    tierLabelJa: `お手玉を落とした！ (+${sec.toFixed(1)}秒)`,
    subtextEn: 'Pick up your bean bag and aim carefully at the basket!',
    subtextJa: 'あわてずに！カゴをよくねらって投げよう！',
    icon: '🔴',
  };
}

// ============================================================================
// [ANTIGRAVITY REFACTOR #2B]: Undokai Bean Bag Toss (Tamaire / 玉入れ) Helpers
// ============================================================================
// WHAT CHANGED:
// Replaced the turn-locked Volleyball rally mechanics with continuous rapid-fire
// Bean Bag Toss (Tamaire / 玉入れ) mechanics and the traditional Japanese
// post-whistle Counting Ceremony ("Hito-tsu, futa-tsu, mit-tsu...").
// WHY:
// Volleyball is not a traditional Undokai event and forced students to wait on
// a "WAITING FOR NEXT TOUCH..." screen while the ball was in flight. Tamaire
// allows all 40 iPads to throw bean bags continuously at their own pace (capped
// at 8 Hz RTDB spoke writes) while keeping scores dramatic until the final count.
// ============================================================================

const TRADITIONAL_JAPANESE_COUNTS: Record<number, { kanji: string; reading: string; romaji: string }> = {
  1: { kanji: '一つ', reading: 'ひとーつ！', romaji: 'Hito-tsu!' },
  2: { kanji: '二つ', reading: 'ふたーつ！', romaji: 'Futa-tsu!' },
  3: { kanji: '三つ', reading: 'みっつ！', romaji: 'Mit-tsu!' },
  4: { kanji: '四つ', reading: 'よっつ！', romaji: 'Yot-tsu!' },
  5: { kanji: '五つ', reading: 'いつつ！', romaji: 'Itsu-tsu!' },
  6: { kanji: '六つ', reading: 'むっつ！', romaji: 'Mut-tsu!' },
  7: { kanji: '七つ', reading: 'ななつ！', romaji: 'Nana-tsu!' },
  8: { kanji: '八つ', reading: 'やっつ！', romaji: 'Yat-tsu!' },
  9: { kanji: '九つ', reading: 'ここのつ！', romaji: 'Kokono-tsu!' },
  10: { kanji: '十', reading: 'とお！', romaji: 'Tō!' },
};

export function formatTamaireCountCallout(count: number): { kanji: string; reading: string; romaji: string } {
  const safeCount = Math.max(1, Math.floor(count));
  if (TRADITIONAL_JAPANESE_COUNTS[safeCount]) {
    return TRADITIONAL_JAPANESE_COUNTS[safeCount];
  }
  return {
    kanji: `${safeCount}個`,
    reading: `${safeCount}こ！`,
    romaji: `${safeCount}!`,
  };
}

export type TamaireSuspenseStage =
  | 'WHISTLE_EYES_UP'
  | 'RHYTHMIC_CHANT'
  | 'TENSION_SLOWDOWN'
  | 'CLIFFHANGER_RATTLE'
  | 'CLIMAX_REVEAL'
  | 'VICTORY_FANFARE';

export interface TamaireSuspenseFrame {
  stage: TamaireSuspenseStage;
  stepIndex: number;
  countedRed: number;
  countedWhite: number;
  remainingRedVisual: number;
  remainingWhiteVisual: number;
  ejectRed: boolean;
  ejectWhite: boolean;
  isGoldenClimax: boolean;
  delayMs: number;
  pitchSemitones: number;
  headlineJa: string;
  headlineEn: string;
  callout: { kanji: string; reading: string; romaji: string } | null;
}

/**
 * [ANTIGRAVITY REFACTOR #2C]: Multi-Stage Suspenseful Tama-kazoe (玉かぞえ) Schedule
 * Builds a non-linear dramatic counting timeline after the whistle blows:
 *  1. WHISTLE_EYES_UP (1.05s): Directs all 40 students to look up from iPads at the TV.
 *  2. RHYTHMIC_CHANT: Simultaneous bag ejections with rising musical pitch.
 *  3. TENSION_SLOWDOWN: Deliberate heartbeat deceleration on the last 3 bags approaching the tie point.
 *  4. CLIFFHANGER_RATTLE (1.35s): Drumroll freeze at min(redScore, whiteScore) while both 3D baskets shake!
 *  5. CLIMAX_REVEAL: Slow-motion golden fountain eruption of the decisive winning bag(s) that break the tie.
 *  6. VICTORY_FANFARE: Terminal celebration state with full scores revealed.
 */
export function buildTamaireSuspenseSchedule(
  redScore: number,
  whiteScore: number
): TamaireSuspenseFrame[] {
  const safeRed = Math.max(0, Math.floor(redScore));
  const safeWhite = Math.max(0, Math.floor(whiteScore));
  const minScore = Math.min(safeRed, safeWhite);
  const maxScore = Math.max(safeRed, safeWhite);

  const frames: TamaireSuspenseFrame[] = [];

  // 1. Whistle & "Look Up at the Big Screen!" Intro Frame
  frames.push({
    stage: 'WHISTLE_EYES_UP',
    stepIndex: 0,
    countedRed: 0,
    countedWhite: 0,
    remainingRedVisual: safeRed,
    remainingWhiteVisual: safeWhite,
    ejectRed: false,
    ejectWhite: false,
    isGoldenClimax: false,
    delayMs: 1050,
    pitchSemitones: 0,
    headlineJa: '📢 笛が鳴った！前のメインスクリーンに注目！',
    headlineEn: 'WHISTLE BLOWN! LOOK UP FROM YOUR IPADS AT THE BIG SCREEN!',
    callout: null,
  });

  if (maxScore === 0) {
    frames.push({
      stage: 'VICTORY_FANFARE',
      stepIndex: 0,
      countedRed: 0,
      countedWhite: 0,
      remainingRedVisual: 0,
      remainingWhiteVisual: 0,
      ejectRed: false,
      ejectWhite: false,
      isGoldenClimax: false,
      delayMs: 0,
      pitchSemitones: 12,
      headlineJa: '🤝 引き分け！ (0 対 0)',
      headlineEn: 'DRAW MATCH! (0 - 0)',
      callout: null,
    });
    return frames;
  }

  // Base cadence scales with total bags so even a 40-bag round stays snappy before the slowdown
  const baseFastMs = Math.max(150, Math.min(310, Math.floor(2600 / Math.max(1, minScore || maxScore))));

  // 2 & 3. Simultaneous Count Up to Tie Point (1 .. minScore) with Heartbeat Deceleration
  for (let k = 1; k <= minScore; k++) {
    const stepsBeforeTie = minScore - k;
    const isSlowdown = stepsBeforeTie <= 2;
    let delayMs = baseFastMs;
    if (stepsBeforeTie === 2) delayMs = Math.max(baseFastMs + 140, 460);
    else if (stepsBeforeTie === 1) delayMs = Math.max(baseFastMs + 280, 620);
    else if (stepsBeforeTie === 0) delayMs = Math.max(baseFastMs + 400, 760);

    const progressRatio = k / Math.max(1, maxScore);
    const pitchSemitones = Math.round(progressRatio * 10 * 10) / 10;

    frames.push({
      stage: isSlowdown ? 'TENSION_SLOWDOWN' : 'RHYTHMIC_CHANT',
      stepIndex: k,
      countedRed: k,
      countedWhite: k,
      remainingRedVisual: Math.max(0, safeRed - k),
      remainingWhiteVisual: Math.max(0, safeWhite - k),
      ejectRed: true,
      ejectWhite: true,
      isGoldenClimax: false,
      delayMs,
      pitchSemitones,
      headlineJa: isSlowdown
        ? `💓 ドクン…ドクン…！両チーム互角の ${k}個目！！`
        : '📢 声を合わせて数えよう！ • SYNCHRONIZED COUNT!',
      headlineEn: isSlowdown
        ? `NECK AND NECK AT ${k} BAGS EACH! WHO HAS MORE LEFT?!`
        : 'COUNT ALONG TOGETHER ON THE BIG SCREEN!',
      callout: formatTamaireCountCallout(k),
    });
  }

  // 4. The Cliffhanger Basket-Rattle Freeze right at the tie point (minScore)!
  frames.push({
    stage: 'CLIFFHANGER_RATTLE',
    stepIndex: minScore,
    countedRed: minScore,
    countedWhite: minScore,
    // Hide remaining bags deep in the bottom of the net during the shake so nobody can tell who won yet!
    remainingRedVisual: 0,
    remainingWhiteVisual: 0,
    ejectRed: false,
    ejectWhite: false,
    isGoldenClimax: false,
    delayMs: 1300,
    pitchSemitones: 11,
    headlineJa:
      minScore > 0
        ? `🥁 同点 ${minScore}個でストップ！カゴの底にまだ入っているか…！？`
        : '🥁 カゴの底をかくにん中…！入っているか…！？',
    headlineEn:
      minScore > 0
        ? `DRUMROLL! TIED AT ${minScore} — SHAKING BASKETS FOR ANY FINAL BAGS!!`
        : 'DRUMROLL! SHAKING BOTH BASKETS...',
    callout: null,
  });

  // 5. Decisive Winning Bag Eruptions (minScore + 1 .. maxScore)
  const extraBags = maxScore - minScore;
  const climaxStepMs = Math.max(220, Math.min(560, Math.floor(2000 / Math.max(1, extraBags))));
  for (let k = minScore + 1; k <= maxScore; k++) {
    const redHasBag = k <= safeRed;
    const whiteHasBag = k <= safeWhite;
    frames.push({
      stage: 'CLIMAX_REVEAL',
      stepIndex: k,
      countedRed: Math.min(safeRed, k),
      countedWhite: Math.min(safeWhite, k),
      remainingRedVisual: Math.max(0, safeRed - k),
      remainingWhiteVisual: Math.max(0, safeWhite - k),
      ejectRed: redHasBag,
      ejectWhite: whiteHasBag,
      isGoldenClimax: true,
      delayMs: k === minScore + 1 ? Math.max(580, climaxStepMs) : climaxStepMs,
      pitchSemitones: 12 + Math.min(8, (k - minScore) * 1.5),
      headlineJa: redHasBag
        ? '🔥 出たーっ！！赤組のカゴから勝ち越しのお手玉が飛び出した！！'
        : '🔥 出たーっ！！白組のカゴから勝ち越しのお手玉が飛び出した！！',
      headlineEn: redHasBag
        ? 'IT POPPED OUT!! RED BASKET STILL HAD BAGS INSIDE!!'
        : 'IT POPPED OUT!! WHITE BASKET STILL HAD BAGS INSIDE!!',
      callout: formatTamaireCountCallout(k),
    });
  }

  // 6. Terminal Victory Celebration Frame
  frames.push({
    stage: 'VICTORY_FANFARE',
    stepIndex: maxScore,
    countedRed: safeRed,
    countedWhite: safeWhite,
    remainingRedVisual: safeRed,
    remainingWhiteVisual: safeWhite,
    ejectRed: false,
    ejectWhite: false,
    isGoldenClimax: true,
    delayMs: 0,
    pitchSemitones: 16,
    headlineJa:
      safeRed > safeWhite
        ? `🏆 赤組の勝利！！ (${safeRed} 対 ${safeWhite})`
        : safeWhite > safeRed
          ? `🏆 白組の勝利！！ (${safeWhite} 対 ${safeRed})`
          : `🤝 劇的ドロー！引き分け！！ (${safeRed} 対 ${safeWhite})`,
    headlineEn:
      safeRed > safeWhite
        ? `RED TEAM WINS THE TAMAIRE SHOWDOWN! (${safeRed} - ${safeWhite})`
        : safeWhite > safeRed
          ? `WHITE TEAM WINS THE TAMAIRE SHOWDOWN! (${safeWhite} - ${safeRed})`
          : `INCREDIBLE TIE GAME! (${safeRed} - ${safeWhite})`,
    callout: formatTamaireCountCallout(maxScore),
  });

  return frames;
}

export function calculateTamaireThrowResult(params: {
  isCorrect: boolean;
  previousStreak: number;
  timeTakenMs: number;
}): {
  bagsThrown: 0 | 1 | 2;
  isGoldenDouble: boolean;
  newStreak: number;
  pointsEarned: number;
} {
  const { isCorrect, previousStreak, timeTakenMs } = params;
  if (!isCorrect) {
    return {
      bagsThrown: 0,
      isGoldenDouble: false,
      newStreak: 0,
      pointsEarned: 0,
    };
  }
  const newStreak = previousStreak + 1;
  const isGoldenDouble = newStreak > 0 && newStreak % 3 === 0;
  const bagsThrown: 1 | 2 = isGoldenDouble ? 2 : 1;
  const basePoints = calculateArcadeScore({
    mode: 'VOLLEYBALL',
    isCorrect: true,
    newStreak,
    timeTakenMs,
  });
  return {
    bagsThrown,
    isGoldenDouble,
    newStreak,
    pointsEarned: isGoldenDouble ? basePoints + 300 : basePoints,
  };
}

export type StudentShotOutcome = 'SWISH' | 'GOLDEN_SWISH' | 'RIM_DOINK';

/**
 * 3-Step Physical Bean Bag Toss Cycle (3ステップ玉入れアクション):
 * - Step 0 (`SCOOP`): Answer a question to crouch down and scoop a bean bag from the sand (`① 玉を拾う`).
 * - Step 1 (`AIM`):   Answer a question to look up and lock onto the high basket without dropping the bag (`② カゴを狙う`).
 * - Step 2 (`THROW`): Answer a question to hurl the bean bag into the basket (`③ カゴへ投げる`).
 */
export type TamaireThrowActionStep = 0 | 1 | 2;

export type TamaireStepOutcome =
  | 'SCOOPED_BAG'
  | 'LOCKED_AIM'
  | 'SWISH'
  | 'GOLDEN_SWISH'
  | 'FUMBLED_SAND'
  | 'DROPPED_BAG'
  | 'RIM_DOINK';

export function advanceTamaireThrowStep(params: {
  currentStep: TamaireThrowActionStep;
  isCorrect: boolean;
  previousStreak: number;
  timeTakenMs: number;
}): {
  nextStep: TamaireThrowActionStep;
  outcome: TamaireStepOutcome;
  bagsThrown: 0 | 1 | 2;
  isGoldenDouble: boolean;
  newStreak: number;
  pointsEarned: number;
} {
  const { currentStep, isCorrect, previousStreak, timeTakenMs } = params;

  if (!isCorrect) {
    const outcome: TamaireStepOutcome =
      currentStep === 0
        ? 'FUMBLED_SAND'
        : currentStep === 1
          ? 'DROPPED_BAG'
          : 'RIM_DOINK';
    return {
      nextStep: 0, // Any fumble/drop/doink returns the student to Step 0 (Scoop from sand)
      outcome,
      bagsThrown: 0,
      isGoldenDouble: false,
      newStreak: 0,
      pointsEarned: 0,
    };
  }

  const newStreak = previousStreak + 1;
  const basePoints = calculateArcadeScore({
    mode: 'VOLLEYBALL',
    isCorrect: true,
    newStreak,
    timeTakenMs,
  });

  if (currentStep === 0) {
    return {
      nextStep: 1,
      outcome: 'SCOOPED_BAG',
      bagsThrown: 0,
      isGoldenDouble: false,
      newStreak,
      pointsEarned: Math.round(basePoints * 0.5),
    };
  }

  if (currentStep === 1) {
    return {
      nextStep: 2,
      outcome: 'LOCKED_AIM',
      bagsThrown: 0,
      isGoldenDouble: false,
      newStreak,
      pointsEarned: Math.round(basePoints * 0.75),
    };
  }

  // Step 2 -> Throw into basket! Every 2nd consecutive flawless 3-step cycle (streak multiple of 6) awards a 2x Golden Bag!
  const isGoldenDouble = newStreak > 0 && newStreak % 6 === 0;
  const bagsThrown: 1 | 2 = isGoldenDouble ? 2 : 1;
  return {
    nextStep: 0,
    outcome: isGoldenDouble ? 'GOLDEN_SWISH' : 'SWISH',
    bagsThrown,
    isGoldenDouble,
    newStreak,
    pointsEarned: isGoldenDouble ? basePoints + 400 : basePoints + 150,
  };
}

export interface StudentShotTrajectorySample {
  /** Normalized horizontal coordinate (0 = left edge, 0.5 = basket pole center, 1 = right edge) */
  x: number;
  /** Normalized vertical coordinate (0 = top sky, 0.21 = basket rim, 0.36 = net bottom, 0.80 = student hand) */
  y: number;
  /** Alias for normalized horizontal coordinate */
  nx: number;
  /** Alias for normalized vertical coordinate */
  ny: number;
  /** Apparent perspective depth scale (1.0 at student hand -> ~0.52 at basket depth) */
  scale: number;
  /** True when the bag is passing down through the woven net cords (clean swish!) */
  inNetSwishZone: boolean;
  /** True right as a missed bag clanks off the metal rim (triggers rim spark & pole wobble!) */
  atRimDoinkImpact: boolean;
  /** Rotation angle in radians for tumbling bean bag */
  rotationRad: number;
}

/**
 * [ANTIGRAVITY REFACTOR #2D]: Student iPad Over-the-Shoulder Shot Trajectory Physics
 * Computes normalized 2.5D/3D perspective coordinates for a student's individual bean bag throw:
 * - 'SWISH' / 'GOLDEN_SWISH': Arcs high above the hoop (ny ~ 0.16), drops cleanly through the
 *   rim center (0.50, 0.21) at t=0.72, and glides down through the woven net (0.21 -> 0.36).
 * - 'RIM_DOINK': Flies slightly off-center toward the metal rim lip (nx ~ 0.415 or 0.585, ny = 0.21)
 *   at t=0.55, clanks hard off the steel hoop (`atRimDoinkImpact = true`), and ricochets outward
 *   and down onto the schoolyard sand (ny -> 0.88).
 */
export function computeStudentShotTrajectoryPoint(
  outcomeOrParams:
    | StudentShotOutcome
    | {
        progress: number;
        outcome: StudentShotOutcome;
        doinkDirection?: -1 | 1;
        lateralOffset?: number;
      },
  progressArg?: number,
  doinkDirectionArg?: -1 | 1
): StudentShotTrajectorySample {
  const params =
    typeof outcomeOrParams === 'string'
      ? {
          outcome: outcomeOrParams,
          progress: progressArg ?? 0,
          doinkDirection: doinkDirectionArg ?? (-1 as -1 | 1),
          lateralOffset: 0,
        }
      : outcomeOrParams;

  const t = Math.max(0, Math.min(1, params.progress));
  const { outcome, doinkDirection = -1, lateralOffset = 0 } = params;

  const startX = 0.54 + lateralOffset;
  const startY = 0.80;
  const rimCenterX = 0.5 + lateralOffset * 0.35;
  const rimY = 0.21;
  const netBottomY = 0.36;

  if (outcome === 'SWISH' || outcome === 'GOLDEN_SWISH') {
    const swishEntryT = 0.72;
    if (t <= swishEntryT) {
      // Parabolic flight from student's hand up over the basket rim and straight into the hoop mouth
      const u = t / swishEntryT;
      const invU = 1 - u;
      const ctrlX = (startX + rimCenterX) * 0.5;
      const ctrlY = -0.10; // High Undokai lob apex well above the basket rim
      const nx = invU * invU * startX + 2 * invU * u * ctrlX + u * u * rimCenterX;
      const ny = invU * invU * startY + 2 * invU * u * ctrlY + u * u * rimY;
      const scale = 1.0 - u * 0.45;
      return {
        x: nx,
        y: ny,
        nx,
        ny,
        scale,
        inNetSwishZone: false,
        atRimDoinkImpact: false,
        rotationRad: u * Math.PI * 3.2,
      };
    } else {
      // Gliding down inside the woven bamboo/mesh net ("SWISH!")
      const v = (t - swishEntryT) / (1 - swishEntryT);
      const nx = rimCenterX + Math.sin(v * Math.PI) * 0.01;
      const ny = rimY + (netBottomY - rimY) * (1 - Math.pow(1 - v, 2));
      const scale = 0.55 - v * 0.06;
      return {
        x: nx,
        y: ny,
        nx,
        ny,
        scale,
        inNetSwishZone: true,
        atRimDoinkImpact: false,
        rotationRad: Math.PI * 3.2 + v * 0.8,
      };
    }
  }

  // RIM_DOINK: Incorrect answer clanks off the metal rim at t = 0.55 and ricochets to the sand!
  const impactT = 0.55;
  const rimEdgeX = 0.5 + doinkDirection * 0.085;

  if (t <= impactT) {
    const u = t / impactT;
    const invU = 1 - u;
    const ctrlX = (startX + rimEdgeX) * 0.5;
    const ctrlY = -0.02;
    const nx = invU * invU * startX + 2 * invU * u * ctrlX + u * u * rimEdgeX;
    const ny = invU * invU * startY + 2 * invU * u * ctrlY + u * u * rimY;
    const scale = 1.0 - u * 0.44;
    return {
      x: nx,
      y: ny,
      nx,
      ny,
      scale,
      inNetSwishZone: false,
      atRimDoinkImpact: u >= 0.88,
      rotationRad: u * Math.PI * 2.5,
    };
  } else {
    // Ricochet bounce off the metal hoop outward and down to the sand floor
    const v = (t - impactT) / (1 - impactT);
    const landX = 0.5 + doinkDirection * 0.32;
    const landY = 0.88;
    const nx = rimEdgeX + (landX - rimEdgeX) * v;
    // Initial upward kick off the rim followed by gravity drop
    const ny = rimY - Math.sin(v * Math.PI) * 0.12 + (landY - rimY) * v * v;
    const scale = 0.56 + v * 0.30;
    return {
      x: nx,
      y: ny,
      nx,
      ny,
      scale,
      inNetSwishZone: false,
      atRimDoinkImpact: v <= 0.16,
      rotationRad: Math.PI * 2.5 + v * Math.PI * 5.5 * doinkDirection,
    };
  }
}

export function isEnglishPromptType(promptType?: PromptType | string): boolean {
  return promptType === 'EN_TO_JA' || promptType === 'EN_WORD';
}

export function resolveOptionPresentation(question: QuizQuestion, option: QuizOption) {
  // [ANTIGRAVITY REFACTOR]: Enforces GEMINI.md §7 Cheating Prevention (`!isEnPrompt`)
  // When promptType is EN_TO_JA or EN_WORD, illustrations on options MUST be omitted
  // so students cannot match the prompt picture to the option picture without reading.
  const isEnPrompt = isEnglishPromptType(question.promptType);
  const hasPromptImage = Boolean(question.promptImage) || question.promptType === 'IMAGE_ONLY';

  const displayText = isEnPrompt
    ? option.ja_kanji || option.ja_hiragana || option.english
    : option.english;

  const subText = isEnPrompt
    ? option.ja_hiragana && option.ja_kanji && option.ja_kanji !== option.ja_hiragana
      ? option.ja_hiragana
      : undefined
    : question.englishReadingAid === 'WITH_KATAKANA' && option.en_katakana
      ? `【${option.en_katakana}】`
      : undefined;

  const showOptionImage = !isEnPrompt && !hasPromptImage && Boolean(option.image);

  return {
    isEnPrompt,
    displayText,
    subText,
    showOptionImage,
    useRuby: isEnPrompt && Boolean(option.ruby || option.ja_kanji),
  };
}

export function computeEliminatedOptionIds(params: {
  question: QuizQuestion;
  timeLeftMs: number;
  mode: DistractorEliminationMode;
}): Set<string> {
  const { question, timeLeftMs, mode } = params;
  if (mode === 'OFF') return new Set();

  const limit = question.timeLimitMs > 0 ? question.timeLimitMs : 15000;
  let count = 0;
  if (mode === 'HALFWAY') {
    count = timeLeftMs <= limit * 0.5 ? 2 : 0;
  } else if (mode === 'GRADUAL') {
    if (timeLeftMs <= limit * 0.34) count = 2;
    else if (timeLeftMs <= limit * 0.67) count = 1;
  }

  if (count === 0) return new Set();

  if (question.distractorOptionIds && question.distractorOptionIds.length > 0) {
    return new Set(question.distractorOptionIds.slice(0, count));
  }

  const wrongIds = question.correctOptionId
    ? question.options.filter((o) => o.id !== question.correctOptionId).map((o) => o.id)
    : [];
  return new Set(wrongIds.slice(0, count));
}

// ============================================================================
// [ANTIGRAVITY REFACTOR #3]: Shared Trouble Words & Team Score Reconciliation
// ============================================================================
// WHAT CHANGED:
// Replaces 4 identical 60-line nested loops in:
//   1. `QuizHostContainer.tsx:44-72`
//   2. `useQuizRoom.ts:895-951` (`endSprintRace`)
//   3. `useQuizRoom.ts:1079-1145` (`endTugOfWar`)
//   4. `useQuizRoom.ts:1241-1306` (`endVolleyball`)
// ============================================================================

export function computeTroubleWordsMap(
  players: Record<string, QuizPlayer>,
  questions: QuizQuestion[],
  existingTroubleWords?: Record<string, TroubleWordEntry>
): Record<string, TroubleWordEntry> {
  const troubleWords: Record<string, TroubleWordEntry> = { ...(existingTroubleWords || {}) };
  if (!questions || questions.length === 0 || !players) return troubleWords;

  const playerList = Object.values(players);
  questions.forEach((q, qIdx) => {
    let totalQAttempts = 0;
    let incorrectQAttempts = 0;

    playerList.forEach((p) => {
      if (!p.answers) return;
      Object.values(p.answers).forEach((ans) => {
        if (ans.questionIndex % questions.length === qIdx || ans.questionIndex === q.questionIndex) {
          totalQAttempts++;
          if (!ans.isCorrect || (ans.incorrectAttempts !== undefined && ans.incorrectAttempts > 0)) {
            incorrectQAttempts++;
          }
        }
      });
    });

    if (totalQAttempts > 0 && (incorrectQAttempts / totalQAttempts >= 0.4 || incorrectQAttempts >= 2)) {
      troubleWords[q.targetWordId] = {
        english: q.isMath ? q.promptText : q.targetWordEnglish,
        ja: q.isMath ? (q.targetWordJa || `正解: ${q.targetWordEnglish}`) : q.targetWordJa,
        image: q.promptImage,
        sound: q.isMath ? undefined : q.promptSound,
        incorrectCount: incorrectQAttempts,
        totalCount: totalQAttempts,
      };
    }
  });

  return troubleWords;
}

export function reconcileTeamScores(
  players: Record<string, QuizPlayer>,
  activeTeams: TeamId[],
  existingTeamScores?: Partial<Record<TeamId, TeamScoreSummary>>
): Partial<Record<TeamId, TeamScoreSummary>> {
  const playerList = Object.values(players || {});
  const result: Partial<Record<TeamId, TeamScoreSummary>> = {};

  activeTeams.forEach((tId) => {
    const preset = TEAM_PRESETS[tId];
    const existing = existingTeamScores?.[tId];
    const members = playerList.filter((p) => p.teamId === tId);
    const mCount = members.length;
    const totalScore = members.reduce((sum, m) => sum + (m.score || 0), 0);
    const totalCorrect = members.reduce((sum, m) => sum + (m.correctCount || 0), 0);
    const sorted = [...members].sort(
      (a, b) => (b.score || 0) - (a.score || 0) || (b.correctCount || 0) - (a.correctCount || 0)
    );

    result[tId] = {
      name: existing?.name || preset.name,
      jaName: existing?.jaName || preset.jaName,
      color: existing?.color || preset.color,
      emoji: existing?.emoji || preset.emoji,
      score: totalScore,
      correctCount: totalCorrect,
      memberCount: mCount,
      averageScore: mCount > 0 ? Math.round(totalScore / mCount) : 0,
      mvpPlayerId: sorted[0]?.id,
      mvpNickname: sorted[0]?.nickname,
      mvpScore: sorted[0]?.score || 0,
    };
  });

  return result;
}

/**
 * Preserves existing valid team assignments (e.g. teacher manual lobby swaps or
 * student choices) during rematch / Edit Settings resets, and balances only
 * unassigned players or players whose previous team is no longer active.
 */
export function assignTeamsForNewRound<T extends { teamId?: TeamId }>(
  players: Record<string, T>,
  activeTeams: TeamId[],
  mode: 'INDIVIDUAL' | 'TEAM'
): Record<TeamId, number> {
  const memberCounts = {} as Record<TeamId, number>;
  activeTeams.forEach((tId) => {
    memberCounts[tId] = 0;
  });

  if (mode !== 'TEAM') {
    Object.values(players).forEach((p) => {
      delete p.teamId;
    });
    return memberCounts;
  }

  const playerList = Object.values(players);
  playerList.forEach((p) => {
    if (p.teamId && activeTeams.includes(p.teamId)) {
      memberCounts[p.teamId] = (memberCounts[p.teamId] || 0) + 1;
    }
  });

  playerList.forEach((p) => {
    if (activeTeams.length > 0 && (!p.teamId || !activeTeams.includes(p.teamId))) {
      let fewestTeam = activeTeams[0];
      let fewestCount = memberCounts[fewestTeam] ?? 0;
      for (const candidate of activeTeams) {
        const count = memberCounts[candidate] ?? 0;
        if (count < fewestCount) {
          fewestTeam = candidate;
          fewestCount = count;
        }
      }
      p.teamId = fewestTeam;
      memberCounts[fewestTeam] = (memberCounts[fewestTeam] || 0) + 1;
    }
  });

  return memberCounts;
}

// ============================================================================
// [ANTIGRAVITY REFACTOR #4]: Declarative Mini-Game Strategy Adapter Registry
// ============================================================================
// WHAT CHANGED:
// Replaces sprawling `if/else` chains in `QuizHostContainer.tsx` and
// `QuizStudentContainer.tsx` with a single source of truth for each game mode's
// status key, green-flag countdown offset, team constraints, lobby WebGL
// pre-warming, and RTDB spoke subscription topology.
// ============================================================================

export interface MiniGameStrategyDescriptor {
  gamePlayType: GamePlayType;
  activeStatus: QuizStatus;
  labelEn: string;
  labelJa: string;
  greenFlagOffsetMs: number;
  requiresTwoTeams: boolean;
  preWarmInLobby: boolean;
  studentSpokeSubscription: 'SELF_ONLY' | 'ALL_RACERS_THROTTLED_5HZ';
  maxClientWriteHz: number;
  defaultLockoutSeconds: number;
  resolveInitialRoomPatch: (nowServerMs: number, durationSeconds: number) => Record<string, any>;
}

export const GAME_MODE_STRATEGIES: Record<GamePlayType, MiniGameStrategyDescriptor> = {
  KAHOOT: {
    gamePlayType: 'KAHOOT',
    activeStatus: 'QUESTION',
    labelEn: 'Classic Arena Quiz',
    labelJa: 'クラシック4択クイズ',
    greenFlagOffsetMs: 0,
    requiresTwoTeams: false,
    preWarmInLobby: false,
    studentSpokeSubscription: 'SELF_ONLY',
    maxClientWriteHz: 1,
    defaultLockoutSeconds: 0,
    resolveInitialRoomPatch: (nowServerMs, durationSeconds) => ({
      status: 'QUESTION',
      currentQuestionIndex: 0,
      timeLimitSeconds: durationSeconds,
      raceStartTime: nowServerMs,
    }),
  },
  SPRINT_RACE: {
    gamePlayType: 'SPRINT_RACE',
    activeStatus: 'SPRINT_RACE',
    labelEn: '2D F1 Sprint Race',
    labelJa: '2D F1スプリントレース',
    greenFlagOffsetMs: 3600,
    requiresTwoTeams: false,
    preWarmInLobby: false,
    studentSpokeSubscription: 'SELF_ONLY',
    maxClientWriteHz: 8,
    defaultLockoutSeconds: 2.5,
    resolveInitialRoomPatch: (nowServerMs, durationSeconds) => ({
      status: 'SPRINT_RACE',
      raceStartTime: nowServerMs,
      raceDurationSeconds: durationSeconds,
      raceFinishGraceStartTime: null,
      podiumFinishers: [],
    }),
  },
  GRAND_PRIX_3D: {
    gamePlayType: 'GRAND_PRIX_3D',
    activeStatus: 'GRAND_PRIX_3D',
    labelEn: '3D Suzuka Grand Prix',
    labelJa: '3D 鈴鹿グランプリ',
    greenFlagOffsetMs: 2400,
    requiresTwoTeams: false,
    preWarmInLobby: true,
    studentSpokeSubscription: 'ALL_RACERS_THROTTLED_5HZ',
    maxClientWriteHz: 5,
    defaultLockoutSeconds: 2.5,
    resolveInitialRoomPatch: (nowServerMs, durationSeconds) => ({
      status: 'GRAND_PRIX_3D',
      raceStartTime: nowServerMs,
      raceDurationSeconds: durationSeconds,
      raceFinishGraceStartTime: null,
      podiumFinishers: [],
    }),
  },
  TUG_OF_WAR: {
    gamePlayType: 'TUG_OF_WAR',
    activeStatus: 'TUG_OF_WAR',
    labelEn: '3D Sports Day Tug of War',
    labelJa: '3D 運動会つなひき',
    greenFlagOffsetMs: 1500,
    requiresTwoTeams: true,
    preWarmInLobby: false,
    studentSpokeSubscription: 'SELF_ONLY',
    maxClientWriteHz: 8,
    defaultLockoutSeconds: 2.5,
    resolveInitialRoomPatch: (nowServerMs, durationSeconds) => ({
      status: 'TUG_OF_WAR',
      raceStartTime: nowServerMs,
      tugOfWarStartTime: nowServerMs,
      raceDurationSeconds: durationSeconds,
      tugOfWarFinished: false,
      tugOfWarRound: 1,
      tugOfWarRoundWins: { team_red: 0, team_white: 0 },
      tugOfWarBaselinePulls: {},
    }),
  },
  VOLLEYBALL: {
    gamePlayType: 'VOLLEYBALL',
    activeStatus: 'VOLLEYBALL',
    labelEn: '3D Undokai Bean Bag Toss (Tamaire)',
    labelJa: '3D 運動会 玉入れバトル',
    greenFlagOffsetMs: 1500,
    requiresTwoTeams: false,
    preWarmInLobby: false,
    studentSpokeSubscription: 'SELF_ONLY',
    maxClientWriteHz: 8,
    defaultLockoutSeconds: 2.5,
    resolveInitialRoomPatch: (nowServerMs, durationSeconds) => ({
      status: 'VOLLEYBALL',
      raceStartTime: nowServerMs,
      volleyballStartTime: nowServerMs,
      raceDurationSeconds: durationSeconds,
      volleyballFinished: false,
    }),
  },
};

// ============================================================================
// [AUDIT POLISH]: Dynamic Team Capacity, Question-Scoped Answer Lookup,
// and Exact Tug of War Sweep Countdown
// ============================================================================

export function resolveTeamMaxCapacity(classSize: number = 35, teamCount: number = 2): number {
  const safeTeams = Math.max(1, teamCount || 2);
  const safeRoster = Math.max(36, classSize || 35);
  return Math.max(10, Math.ceil(safeRoster / safeTeams));
}

export function isTeamSelectionFull(params: {
  teamCountForTeam: number;
  minCount: number;
  totalPlayers: number;
  teamCount?: number;
  classSize?: number;
}): boolean {
  const { teamCountForTeam, minCount, totalPlayers, teamCount = 2, classSize = 35 } = params;
  const maxPerTeam = resolveTeamMaxCapacity(classSize, teamCount);
  if (teamCountForTeam >= maxPerTeam) return true;
  return teamCountForTeam >= minCount + 2 && totalPlayers >= 8;
}

export function resolveQuestionScopedAnswer<T extends { questionIndex?: number; optionId?: string }>(params: {
  answers?: Record<number, T> | null;
  lastAnswer?: T | null;
  questionIndex?: number | null;
}): T | undefined {
  const { answers, lastAnswer, questionIndex } = params;
  if (questionIndex !== undefined && questionIndex !== null) {
    if (answers && answers[questionIndex] !== undefined) {
      return answers[questionIndex];
    }
    if (lastAnswer && lastAnswer.questionIndex === questionIndex) {
      return lastAnswer;
    }
    return undefined;
  }
  return lastAnswer ?? undefined;
}

export function computeTugOfWarSweepsRemaining(params: {
  displacement: number;
  sensitivity: number;
  activeTeamCount: number;
  team: 'team_red' | 'team_white';
}): number {
  const { displacement, sensitivity, activeTeamCount, team } = params;
  if (team === 'team_red' && displacement <= -100) return 0;
  if (team === 'team_white' && displacement >= 100) return 0;

  const remainingDisplacement = team === 'team_red' ? 100 + displacement : 100 - displacement;
  const perPullStep = Math.max(0.01, sensitivity / Math.max(1, activeTeamCount));
  return Math.max(1, Math.ceil(remainingDisplacement / perPullStep));
}

