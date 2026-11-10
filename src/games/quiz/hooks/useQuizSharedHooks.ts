/**
 * ============================================================================
 * [ANTIGRAVITY REFACTOR MODULE: src/games/quiz/hooks/useQuizSharedHooks.ts]
 * ============================================================================
 * PURPOSE FOR GOOGLE ANTIGRAVITY:
 * Consolidates duplicated React state and lifecycle hooks across the 5 student
 * and 5 host game controllers:
 *
 * 1. `useServerClock`: Replaces 8 duplicated `setInterval(() => setNow(getServerTime()))`
 *    effects across `QuizStudentSprint`, `QuizStudentGrandPrix3D`, `QuizStudentTugOfWar`,
 *    `QuizStudentVolleyball`, `QuizHostSprint`, `QuizHostTugOfWar`, and `QuizHostVolleyball`.
 * 2. `useLockoutPenalty`: Replaces 4 duplicated `lockedUntil` / `penaltySecondsLeft`
 *    countdown timers and guarantees the Pit Stop UI tier (`resolveLockoutPenaltySeconds`)
 *    is always synchronized with the active penalty duration (>= 2.5s per GEMINI.md §7).
 * 3. `useAuthoritativeStudentStats`: Replaces 4 identical 30-line reconnection state
 *    blocks (`localScore`, `localStreak`, `localMaxStreak`, `localCorrectCount`,
 *    `localTotalAnswered`, `localFastestTimeMs`) across Sprint, GrandPrix3D,
 *    TugOfWar, and Volleyball.
 * 4. `useDistractorElimination`: Replaces duplicated `computeEliminatedOptionIds`
 *    memos across `QuizStudentQuestion`, `QuizStudentSprint`, `QuizStudentTugOfWar`,
 *    and `QuizStudentVolleyball`.
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GamePlayType,
  QuizPlayer,
  QuizQuestion,
  QuizStatus,
  DistractorEliminationMode,
  LockoutPenaltyResolution,
  resolveLockoutPenaltySeconds,
  computeEliminatedOptionIds,
  GAME_MODE_STRATEGIES,
} from '../core/quizEngine';

/**
 * [ANTIGRAVITY REFACTOR #1]: Shared Server-Synchronized Clock Hook
 */
export function useServerClock(
  getServerTime: () => number,
  intervalMs: number = 100,
  enabled: boolean = true
): number {
  const [now, setNow] = useState<number>(() => getServerTime());

  useEffect(() => {
    if (!enabled) return;
    setNow(getServerTime());
    const timer = setInterval(() => {
      setNow(getServerTime());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [getServerTime, intervalMs, enabled]);

  return now;
}

/**
 * [ANTIGRAVITY REFACTOR #2]: Shared Pit Stop / Mud / Miss Lockout Hook
 * Enforces the 2.5s minimum penalty from GEMINI.md §7 and returns synchronized
 * tier labels (`activePenaltyTier`) so the UI never displays a mismatched headline.
 */
export function useLockoutPenalty(params: {
  mode: GamePlayType;
  getServerTime: () => number;
  configuredLockoutSeconds?: number;
}) {
  const { mode, getServerTime, configuredLockoutSeconds } = params;
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [activePenaltyTier, setActivePenaltyTier] = useState<LockoutPenaltyResolution | null>(null);

  const now = useServerClock(getServerTime, 100, lockedUntil > 0);

  const penaltySecondsLeft = useMemo(() => {
    if (!lockedUntil || now >= lockedUntil) return 0;
    return Math.max(0, Math.ceil((lockedUntil - now) / 100) / 10);
  }, [lockedUntil, now]);

  useEffect(() => {
    if (lockedUntil > 0 && now >= lockedUntil) {
      setLockedUntil(0);
      setActivePenaltyTier(null);
    }
  }, [lockedUntil, now]);

  const triggerLockout = useCallback(
    (mistakeCountOnQuestion: number = 1): LockoutPenaltyResolution => {
      const resolution = resolveLockoutPenaltySeconds({
        mode,
        mistakeCountOnQuestion,
        configuredLockoutSeconds,
      });
      setActivePenaltyTier(resolution);
      setLockedUntil(getServerTime() + resolution.penaltySeconds * 1000);
      return resolution;
    },
    [mode, configuredLockoutSeconds, getServerTime]
  );

  const clearLockout = useCallback(() => {
    setLockedUntil(0);
    setActivePenaltyTier(null);
  }, []);

  return {
    penaltySecondsLeft,
    activePenaltyTotalSec: activePenaltyTier?.penaltySeconds || 2.5,
    activePenaltyTier,
    isLockedOut: penaltySecondsLeft > 0,
    triggerLockout,
    clearLockout,
  };
}

/**
 * [ANTIGRAVITY REFACTOR #3]: Shared Authoritative Student Stats & Mid-Game Reconnect Hook
 * Replaces duplicated `localScore`, `localStreak`, `localMaxStreak`, `localCorrectCount`,
 * `localTotalAnswered`, and `localFastestTimeMs` state in all 4 student arcade controllers.
 */
export function useAuthoritativeStudentStats(player: QuizPlayer | undefined) {
  const [localScore, setLocalScore] = useState<number>(player?.score || 0);
  const [localStreak, setLocalStreak] = useState<number>(player?.currentStreak || 0);
  const [localMaxStreak, setLocalMaxStreak] = useState<number>(player?.maxStreak || 0);
  const [localCorrectCount, setLocalCorrectCount] = useState<number>(player?.correctCount || 0);
  const [localTotalAnswered, setLocalTotalAnswered] = useState<number>(player?.totalAnswered || 0);
  const [localFastestTimeMs, setLocalFastestTimeMs] = useState<number>(
    player?.fastestTimeMs || 999999
  );

  // Sync authoritative stats if student iPad refreshes/reconnects mid-race
  useEffect(() => {
    if (player && (player.totalAnswered || 0) > localTotalAnswered) {
      setLocalScore(player.score || 0);
      setLocalStreak(player.currentStreak || 0);
      setLocalMaxStreak(player.maxStreak || 0);
      setLocalCorrectCount(player.correctCount || 0);
      setLocalTotalAnswered(player.totalAnswered || 0);
      if (player.fastestTimeMs && player.fastestTimeMs < 999999) {
        setLocalFastestTimeMs(player.fastestTimeMs);
      }
    }
  }, [player, localTotalAnswered]);

  return {
    localScore,
    setLocalScore,
    localStreak,
    setLocalStreak,
    localMaxStreak,
    setLocalMaxStreak,
    localCorrectCount,
    setLocalCorrectCount,
    localTotalAnswered,
    setLocalTotalAnswered,
    localFastestTimeMs,
    setLocalFastestTimeMs,
  };
}

/**
 * [ANTIGRAVITY REFACTOR #4]: Shared Distractor Elimination Hook
 */
export function useDistractorElimination(params: {
  question: QuizQuestion | null | undefined;
  timeLeftMs: number;
  eliminateDistractors?: boolean;
  distractorEliminationMode?: DistractorEliminationMode;
}): Set<string> {
  const { question, timeLeftMs, eliminateDistractors, distractorEliminationMode } = params;
  const effectiveMode: DistractorEliminationMode =
    distractorEliminationMode || (eliminateDistractors ? 'HALFWAY' : 'OFF');

  return useMemo(() => {
    if (!question) return new Set<string>();
    return computeEliminatedOptionIds({
      question,
      timeLeftMs,
      mode: effectiveMode,
    });
  }, [question, timeLeftMs, effectiveMode]);
}

/**
 * [ANTIGRAVITY REFACTOR #5]: Strategy Adapter Resolver for Host & Student Containers
 */
export function resolveActiveArcadeStrategy(params: {
  status: QuizStatus;
  gamePlayType?: GamePlayType;
}) {
  const { status, gamePlayType } = params;
  if (
    status === 'SPRINT_RACE' ||
    status === 'GRAND_PRIX_3D' ||
    status === 'TUG_OF_WAR' ||
    status === 'VOLLEYBALL'
  ) {
    const modeKey: GamePlayType =
      status === 'SPRINT_RACE' && gamePlayType === 'GRAND_PRIX_3D'
        ? 'GRAND_PRIX_3D'
        : (status as GamePlayType);
    return GAME_MODE_STRATEGIES[modeKey];
  }
  return GAME_MODE_STRATEGIES[gamePlayType || 'KAHOOT'];
}
