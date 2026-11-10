/**
 * Decoupled Pure Physics, Classroom Bandwidth Delta Filter & Spaced Repetition (SRS) Engine
 * Tested deterministically via `node:test` (`suzukaPhysics.test.ts`).
 */

export interface PhysicsStepInput {
  currentSpeedKmh: number;
  currentMomentumKmh: number;
  cornerCapKmh: number;
  dtSeconds: number;
  isFinished?: boolean;
}

export interface PhysicsStepOutput {
  nextSpeedKmh: number;
  nextMomentumKmh: number;
}

/**
 * Steps kart longitudinal velocity & stored streak momentum for `dtSeconds`,
 * enforcing Japanese Red Speed-Zone braking and instant corner-exit recovery.
 */
export function stepKartLongitudinalPhysics(input: PhysicsStepInput): PhysicsStepOutput {
  const { currentSpeedKmh, currentMomentumKmh, cornerCapKmh, isFinished } = input;
  const dt = Math.min(0.1, Math.max(0.001, input.dtSeconds));

  if (isFinished) {
    const decay = Math.max(30 * dt, currentSpeedKmh * 0.9 * dt);
    const nextSpeed = Math.max(0, currentSpeedKmh - decay);
    return {
      nextSpeedKmh: Math.round(nextSpeed * 10) / 10,
      nextMomentumKmh: 0,
    };
  }

  if (currentSpeedKmh <= 0 && currentMomentumKmh <= 0) {
    return { nextSpeedKmh: 0, nextMomentumKmh: 0 };
  }

  // Gentle baseline aero decay on stored momentum reserve
  const momDecay = (4.2 + 0.018 * currentMomentumKmh) * dt;
  let nextMomentum = Math.max(0, currentMomentumKmh - momDecay);

  let nextSpeed = currentSpeedKmh;
  if (currentSpeedKmh > cornerCapKmh) {
    // Red Speed-Zone Braking down to corner limit
    const brakeDecel = Math.max(22 * dt, (currentSpeedKmh - cornerCapKmh) * 6.0 * dt);
    nextSpeed = Math.max(cornerCapKmh, currentSpeedKmh - brakeDecel);
  } else if (nextMomentum > currentSpeedKmh + 0.5 && currentSpeedKmh < cornerCapKmh) {
    // Corner-exit re-acceleration back up to stored streak momentum
    const targetExitSpeed = Math.min(cornerCapKmh, nextMomentum);
    nextSpeed = Math.min(targetExitSpeed, currentSpeedKmh + 90 * dt);
  } else {
    // Standard straightaway aerodynamic drag
    const decay = (4.2 + 0.018 * currentSpeedKmh) * dt;
    nextSpeed = Math.max(0, currentSpeedKmh - decay);
    nextMomentum = nextSpeed;
  }

  return {
    nextSpeedKmh: Math.round(nextSpeed * 10) / 10,
    nextMomentumKmh: Math.round(nextMomentum * 10) / 10,
  };
}

/**
 * Calculates speed & momentum boost when a student answers an English question correctly,
 * including an extra +14 km/h DRS Mastery Surge when conquering a previously missed SRS review word!
 */
export function computeCorrectAnswerBoost(params: {
  currentSpeedKmh: number;
  currentMomentumKmh: number;
  nextStreak: number;
  cornerCapKmh: number;
  isDrsReviewWord?: boolean;
}): {
  nextSpeedKmh: number;
  nextMomentumKmh: number;
  isBoosting: boolean;
  pointsEarned: number;
} {
  const { currentSpeedKmh, currentMomentumKmh, nextStreak, cornerCapKmh, isDrsReviewWord } = params;
  const baseBoost = nextStreak === 1 ? 48 : nextStreak === 2 ? 54 : 60;
  const drsBonusBoost = isDrsReviewWord ? 14 : 0;
  const throttleBoost = baseBoost + drsBonusBoost;

  const nextMomentum = Math.min(180, Math.max(currentSpeedKmh, currentMomentumKmh) + throttleBoost);
  const nextSpeed = Math.round(Math.min(cornerCapKmh, nextMomentum) * 10) / 10;
  const isBoosting = nextMomentum >= 145 || nextStreak >= 3 || !!isDrsReviewWord;
  const pointsEarned = 100 + Math.min(200, nextStreak * 25) + (isDrsReviewWord ? 75 : 0);

  return {
    nextSpeedKmh: nextSpeed,
    nextMomentumKmh: Math.round(nextMomentum * 10) / 10,
    isBoosting,
    pointsEarned,
  };
}

/**
 * Determines whether a periodic telemetry sync packet should be sent over the school network
 * or suppressed because dead-reckoning on remote clients already predicts the kart's state accurately.
 */
export interface TelemetrySyncSnapshot {
  speedKmh: number;
  distanceMeters: number;
  inPitStop: boolean;
  isFinished: boolean;
  timestampMs: number;
}

export function shouldBroadcastTelemetryDelta(
  lastSent: TelemetrySyncSnapshot | null,
  current: TelemetrySyncSnapshot,
  maxSilenceMs: number = 3200
): boolean {
  if (!lastSent) return current.speedKmh > 0 || current.isFinished;
  if (lastSent.isFinished !== current.isFinished) return true;
  if (lastSent.inPitStop !== current.inPitStop) return true;

  const elapsedSec = Math.max(0, (current.timestampMs - lastSent.timestampMs) / 1000);
  if (elapsedSec * 1000 >= maxSilenceMs && current.speedKmh > 0) {
    return true;
  }

  // Dead-reckoning prediction from lastSent
  const predictedDist = lastSent.distanceMeters + (lastSent.speedKmh / 3.6) * elapsedSec;
  const distDrift = Math.abs(current.distanceMeters - predictedDist);
  const speedDelta = Math.abs(current.speedKmh - lastSent.speedKmh);

  // Only broadcast if speed changed by >= 6.5 km/h or position drifted >= 4.0m from linear prediction
  return speedDelta >= 6.5 || distDrift >= 4.0;
}

/**
 * Spaced Repetition (SRS) Question Scheduler for Elementary ESL Acquisition:
 * When a student misses a vocabulary item, it is queued to re-appear after `spacingGap` questions
 * as a "DRS Revenge Word" so the student actively retrieves and masters the word before the race ends.
 */
export interface SrsWordState {
  wordId: string;
  correctStreak: number;
  missCount: number;
  mastered: boolean;
}

export function selectNextQuestionIndexWithSrs(params: {
  currentQuestionIdx: number;
  totalQuestions: number;
  dueReviewIndices: number[];
}): { nextIndex: number; isDrsReview: boolean; remainingReviewIndices: number[] } {
  const { currentQuestionIdx, totalQuestions, dueReviewIndices } = params;
  if (totalQuestions <= 0) {
    return { nextIndex: 0, isDrsReview: false, remainingReviewIndices: [] };
  }
  if (dueReviewIndices.length > 0 && dueReviewIndices[0] !== currentQuestionIdx) {
    const [reviewIdx, ...rest] = dueReviewIndices;
    return {
      nextIndex: reviewIdx % totalQuestions,
      isDrsReview: true,
      remainingReviewIndices: rest,
    };
  }
  return {
    nextIndex: (currentQuestionIdx + 1) % totalQuestions,
    isDrsReview: false,
    remainingReviewIndices: dueReviewIndices,
  };
}
