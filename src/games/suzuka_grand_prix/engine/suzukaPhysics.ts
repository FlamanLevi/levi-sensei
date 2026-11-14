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

// ============================================================================
// Multi-Lane Passing, Apex Racing Line, Collision Separation & Battle Cam
// ============================================================================

export const SUZUKA_TRACK_HALF_WIDTH_M = 4.2;
export const SUZUKA_KART_LENGTH_M = 2.35;
export const SUZUKA_KART_WIDTH_M = 1.85;
export const SUZUKA_MIN_LATERAL_SEPARATION_M = 2.05; // 1.85m kart width + 0.20m clearance
export const SUZUKA_SAFE_LANE_LIMIT_M = 3.18;       // Keeps outer tires comfortably inside ±4.2m asphalt edge
export const SUZUKA_PIT_SHOULDER_M = 3.12;
export const SUZUKA_RACING_LANES = [-2.85, -1.42, 0.0, 1.42, 2.85] as const;

export interface LanePlannerRacerSnapshot {
  id: string;
  distanceMeters: number;
  laneOffset: number;
  targetLane: number;
  speedKmh: number;
  isBoosting?: boolean;
  inPitStop?: boolean;
}

export interface LaneDecisionResult {
  targetLane: number;
  isActivelyOvertaking: boolean;
  isBoxedInAhead: boolean;
  blockingSpeedKmh: number;
}

/**
 * Signed modular track gap `deltaMeters` wrapped cleanly into `[-L/2, +L/2)`.
 */
export function wrapTrackDeltaMeters(deltaMeters: number, circuitLengthMeters: number): number {
  if (circuitLengthMeters <= 0) return deltaMeters;
  const half = circuitLengthMeters * 0.5;
  return (((deltaMeters + half) % circuitLengthMeters) + circuitLengthMeters) % circuitLengthMeters - half;
}

/**
 * Computes the natural racing line lateral apex offset (`[-2.35, +2.35]`) from
 * normalized signed track curvature (`-1` = sharp left turn, `+1` = sharp right turn).
 */
export function computeCornerApexOffset(signedCurvature: number): number {
  if (!Number.isFinite(signedCurvature) || Math.abs(signedCurvature) < 0.11) {
    return 0;
  }
  return Math.max(-2.35, Math.min(2.35, signedCurvature * 2.35));
}

// Reusable scratch buffer (zero GC allocations during 60Hz tick)
const _candLanes = new Float64Array(24);

function pushUniqueCandidate(count: number, val: number): number {
  const clamped = Math.max(-3.05, Math.min(3.05, val));
  for (let i = 0; i < count; i++) {
    if (Math.abs(_candLanes[i] - clamped) < 0.14) return count;
  }
  if (count < _candLanes.length) {
    _candLanes[count] = clamped;
    return count + 1;
  }
  return count;
}

/**
 * Multi-lane continuous gap finder & overtake planner for 8.4m-wide Suzuka asphalt:
 * - Routes `inPitStop` karts safely to the nearest unobstructed outer shoulder (±3.12m).
 * - Evaluates 5 strategic lanes + dynamic ±2.12m shoulder gaps around slower blockers ahead.
 * - Prevents crossing side-by-side rivals, avoids ping-pong oscillation via hysteresis lock,
 *   and guides unchallenged racers smoothly toward corner apexes.
 */
export function selectBestPassingLane(params: {
  selfIndex: number;
  racers: readonly LanePlannerRacerSnapshot[];
  racerCount?: number;
  circuitLengthMeters: number;
  signedCurvature: number;
  laneLockRemainingSec: number;
  outResult?: LaneDecisionResult;
}): LaneDecisionResult {
  const {
    selfIndex,
    racers,
    racerCount = racers.length,
    circuitLengthMeters,
    signedCurvature,
    laneLockRemainingSec,
    outResult,
  } = params;

  const result: LaneDecisionResult = outResult ?? {
    targetLane: 0,
    isActivelyOvertaking: false,
    isBoxedInAhead: false,
    blockingSpeedKmh: 180,
  };

  const self = racers[selfIndex];
  if (!self) {
    result.targetLane = 0;
    result.isActivelyOvertaking = false;
    result.isBoxedInAhead = false;
    result.blockingSpeedKmh = 180;
    return result;
  }

  // 1. Stalled / Pit-Stop Karts pull safely off the racing line onto the nearest clear shoulder
  if (self.inPitStop) {
    const primaryShoulder = self.laneOffset >= 0 ? SUZUKA_PIT_SHOULDER_M : -SUZUKA_PIT_SHOULDER_M;
    const altShoulder = -primaryShoulder;

    let primaryBusy = false;
    let altBusy = false;
    for (let j = 0; j < racerCount; j++) {
      if (j === selfIndex) continue;
      const o = racers[j];
      if (!o) continue;
      const d = wrapTrackDeltaMeters(o.distanceMeters - self.distanceMeters, circuitLengthMeters);
      if (d >= -3.5 && d <= 4.5) {
        if (Math.abs(o.laneOffset - primaryShoulder) < 1.95) primaryBusy = true;
        if (Math.abs(o.laneOffset - altShoulder) < 1.95) altBusy = true;
      }
    }

    result.targetLane = primaryBusy && !altBusy ? altShoulder : primaryShoulder;
    result.isActivelyOvertaking = false;
    result.isBoxedInAhead = false;
    result.blockingSpeedKmh = 180;
    return result;
  }

  // 2. Build zero-GC candidate lanes: 5 base track lanes + apex + current line + dynamic ±2.12m overtake pockets
  let candCount = 0;
  for (let i = 0; i < SUZUKA_RACING_LANES.length; i++) {
    candCount = pushUniqueCandidate(candCount, SUZUKA_RACING_LANES[i]);
  }
  const hasCurve = Math.abs(signedCurvature) >= 0.11;
  const apexOffset = computeCornerApexOffset(signedCurvature);
  if (hasCurve) {
    candCount = pushUniqueCandidate(candCount, apexOffset);
  }
  if (Math.abs(self.targetLane) <= 3.05) {
    candCount = pushUniqueCandidate(candCount, self.targetLane);
  }

  // Check if current line is actively obstructed and add exact edge passes around close traffic
  let currentLaneBlockedDist = 999;
  let immediateAheadSpeed = 180;
  for (let j = 0; j < racerCount; j++) {
    if (j === selfIndex) continue;
    const o = racers[j];
    if (!o) continue;
    const dist = wrapTrackDeltaMeters(o.distanceMeters - self.distanceMeters, circuitLengthMeters);
    if (dist > 0.25 && dist < 34.0) {
      const sameCorridor =
        Math.abs(o.laneOffset - self.laneOffset) < 2.02 ||
        Math.abs(o.targetLane - self.targetLane) < 1.75;
      const isBlocking =
        !!o.inPitStop ||
        self.speedKmh >= o.speedKmh - 2.5 ||
        !!self.isBoosting ||
        dist < 5.5;
      if (sameCorridor && isBlocking && dist < currentLaneBlockedDist) {
        currentLaneBlockedDist = dist;
        immediateAheadSpeed = o.speedKmh;
      }

      if (isBlocking && dist < 29.0) {
        const leftGap = o.laneOffset - 2.12;
        if (leftGap >= -3.05 && Math.abs(leftGap - o.laneOffset) >= 1.95) {
          candCount = pushUniqueCandidate(candCount, leftGap);
        }
        const rightGap = o.laneOffset + 2.12;
        if (rightGap <= 3.05 && Math.abs(rightGap - o.laneOffset) >= 1.95) {
          candCount = pushUniqueCandidate(candCount, rightGap);
        }
      }
    }
  }

  // 3. Score every candidate lane by forward openness, overtake safety, hysteresis & corner apex flow
  let bestLane = Math.max(-3.05, Math.min(3.05, self.targetLane));
  let bestScore = -1e9;
  let bestHorizon = 0;

  for (let ci = 0; ci < candCount; ci++) {
    const cand = _candLanes[ci];
    let sidePenalty = 0;
    let closeProximityPenalty = 0;
    let horizonMeters = 38.0;

    for (let j = 0; j < racerCount; j++) {
      if (j === selfIndex) continue;
      const o = racers[j];
      if (!o) continue;
      const dist = wrapTrackDeltaMeters(o.distanceMeters - self.distanceMeters, circuitLengthMeters);

      // A. Side-by-side occupancy & directional crossover guard
      if (dist >= -3.1 && dist <= 3.4) {
        const latAtCand = Math.abs(cand - o.laneOffset);
        const targetAtCand = Math.abs(cand - o.targetLane);

        if (latAtCand < 2.00 && Math.abs(cand - self.laneOffset) >= 0.45) {
          sidePenalty -= 1200;
        } else if (Math.abs(dist) < 2.6 && targetAtCand < 1.65 && Math.abs(cand - self.laneOffset) >= 0.65) {
          sidePenalty -= 550;
        }

        // Prevent sweeping across the nose/sidepod of a side-by-side rival
        const crossesThroughOther =
          (self.laneOffset < o.laneOffset && cand > o.laneOffset - 0.4) ||
          (self.laneOffset > o.laneOffset && cand < o.laneOffset + 0.4);
        if (
          dist >= -2.7 &&
          dist <= 3.1 &&
          crossesThroughOther &&
          Math.abs(cand - self.laneOffset) > 0.75
        ) {
          sidePenalty -= 1000;
        }
      }

      // B. Forward horizon lookahead (38m ahead)
      if (dist > 0.2 && dist < 38.0) {
        const latCurr = Math.abs(cand - o.laneOffset);
        const latTarget = Math.abs(cand - o.targetLane);
        const encroaches = latCurr < 2.04 || (dist > 4.0 && latTarget < 1.85);
        if (encroaches) {
          const relSpeed = self.speedKmh - o.speedKmh;
          if (o.inPitStop || dist < 5.5 || relSpeed >= -2.5 || !!self.isBoosting) {
            const penaltyDist =
              dist - (o.inPitStop ? 4.5 : 0) - Math.max(0, relSpeed) * 0.09;
            if (penaltyDist < horizonMeters) {
              horizonMeters = penaltyDist;
            }
            if (dist < 13.0 && relSpeed > 6.0) {
              closeProximityPenalty += (13.0 - dist) * 1.15;
            }
          }
        }
      }
    }

    // C. Lane commitment hysteresis (prevents flickering)
    let hysteresisBonus = 0;
    if (Math.abs(cand - self.targetLane) < 0.25) {
      hysteresisBonus += 3.2;
      if (laneLockRemainingSec > 0 && horizonMeters > 10.0) {
        hysteresisBonus += 14.0;
      }
    }

    // D. Natural F1 corner apex preference vs smooth straight holding
    let lineScore = 0;
    if (hasCurve) {
      lineScore -= Math.abs(cand - apexOffset) * Math.min(1.0, Math.abs(signedCurvature)) * 2.4;
    } else {
      // On straights, prefer smaller lateral moves and keep clear of outer pit shoulders unless overtaking
      lineScore -= Math.abs(cand - self.laneOffset) * 0.45;
      if (Math.abs(cand) > 2.90) {
        lineScore -= 1.25;
      }
    }

    const totalScore = horizonMeters + sidePenalty - closeProximityPenalty + hysteresisBonus + lineScore;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestLane = cand;
      bestHorizon = horizonMeters;
    }
  }

  // 4. Determine whether this kart is visibly executing/battling an overtake on ANY lane
  let isOvertaking = false;
  if (self.speedKmh > 25) {
    const laneShift = Math.abs(bestLane - self.laneOffset);
    for (let j = 0; j < racerCount; j++) {
      if (j === selfIndex) continue;
      const o = racers[j];
      if (!o) continue;
      const d = wrapTrackDeltaMeters(o.distanceMeters - self.distanceMeters, circuitLengthMeters);
      if (d >= -4.2 && d <= 18.0 && o.speedKmh < self.speedKmh + 8.0) {
        if (
          laneShift > 0.65 ||
          (Math.abs(d) < 8.0 &&
            Math.abs(self.laneOffset - o.laneOffset) >= 1.45 &&
            self.speedKmh >= o.speedKmh - 2.0)
        ) {
          isOvertaking = true;
          break;
        }
      }
    }
  }

  result.targetLane = bestLane;
  result.isActivelyOvertaking = isOvertaking;
  result.isBoxedInAhead = currentLaneBlockedDist < 3.4 && bestHorizon < 4.5;
  result.blockingSpeedKmh = immediateAheadSpeed;
  return result;
}

/**
 * 60 Hz continuous smooth lateral collision-avoidance velocity (`m/s` along `right`),
 * preventing side-to-side tire clipping using the actual 2.35m x 1.85m kart footprint.
 */
export function computeLateralRepulsionVelocity(params: {
  selfIndex: number;
  racers: readonly LanePlannerRacerSnapshot[];
  racerCount?: number;
  circuitLengthMeters: number;
}): number {
  const { selfIndex, racers, racerCount = racers.length, circuitLengthMeters } = params;
  const self = racers[selfIndex];
  if (!self) return 0;

  let pushVel = 0;
  const selfResistance = self.inPitStop ? 0.22 : 1.0;

  for (let j = 0; j < racerCount; j++) {
    if (j === selfIndex) continue;
    const o = racers[j];
    if (!o) continue;

    const dist = wrapTrackDeltaMeters(o.distanceMeters - self.distanceMeters, circuitLengthMeters);
    const longRange = SUZUKA_KART_LENGTH_M + 0.30; // 2.65m longitudinal interaction envelope
    if (Math.abs(dist) >= longRange) continue;

    const dLat = self.laneOffset - o.laneOffset;
    const absLat = Math.abs(dLat);
    if (absLat >= SUZUKA_MIN_LATERAL_SEPARATION_M) continue;

    const overlap = SUZUKA_MIN_LATERAL_SEPARATION_M - absLat;
    const longFade = Math.max(0.25, Math.min(1.0, 1.0 - (Math.abs(dist) - 1.75) / 0.9));

    let dir = 0;
    if (absLat > 0.04) {
      dir = dLat > 0 ? 1 : -1;
    } else if (Math.abs(self.laneOffset) > 2.2) {
      dir = self.laneOffset > 0 ? -1 : 1;
    } else {
      dir = selfIndex < j ? -1 : 1;
    }

    // Active racers smoothly yield wider around docked inPitStop shoulder karts
    const yieldWeight = o.inPitStop && !self.inPitStop ? 1.35 : selfResistance;
    pushVel += dir * overlap * 8.5 * longFade * yieldWeight;
  }

  return Math.max(-7.5, Math.min(7.5, pushVel));
}

export interface KartVisualSteeringResult {
  laneYawRad: number;
  steerInput: number;
  driftAngle: number;
}

/**
 * Computes physical chassis yaw into lane changes plus front-wheel steer & driver body roll
 * matching `Suzuka3DEngine` basis (`+Z` forward, `+X` left, `+Y` up) and `MicroKartBuilder`.
 */
export function computeKartVisualSteering(params: {
  speedKmh: number;
  lateralVelMs: number;
  signedCurvature: number;
}): KartVisualSteeringResult {
  const { speedKmh, lateralVelMs, signedCurvature } = params;
  const safeSpeedKmh = Math.max(0, speedKmh || 0);
  const forwardMs = Math.max(4.5, safeSpeedKmh / 3.6);
  const speedNorm = Math.min(1.0, safeSpeedKmh / 85.0);

  // Moving Right (+laneOffset -> -X) requires negative Y rotation (-atan2)
  const laneYawRad =
    safeSpeedKmh > 3.0
      ? Math.max(-0.34, Math.min(0.34, -Math.atan2(lateralVelMs, forwardMs)))
      : 0;

  // steerInput: negative = turn LEFT, positive = turn RIGHT
  const laneSteerDemand = Math.max(-1.0, Math.min(1.0, lateralVelMs / 8.5));
  const steerInput = Math.max(
    -1.0,
    Math.min(1.0, (signedCurvature * 0.85 + laneSteerDemand * 0.80) * speedNorm)
  );

  const driftAngle =
    safeSpeedKmh > 70.0 && Math.abs(signedCurvature) > 0.25
      ? Math.max(-0.14, Math.min(0.14, -signedCurvature * 0.12 * speedNorm))
      : 0;

  return { laneYawRad, steerInput, driftAngle };
}

export interface BattleScorerRacer {
  id: string;
  speedKmh: number;
  distanceMeters: number;
  laneOffset: number;
  isPassingLane: boolean;
}

export interface BattleCandidate<T extends BattleScorerRacer> {
  ahead: T;
  chaser: T;
  rankAhead: number;
  gapMeters: number;
  score: number;
}

/**
 * Selects the hottest on-track wheel-to-wheel overtake battle for Broadcast / Battle Cam,
 * scoring side-by-side proximity, active passing on ANY lane, closing speed, and podium stakes.
 */
export function findBestOvertakeBattleCandidate<T extends BattleScorerRacer>(
  sortedTelemetry: readonly T[]
): BattleCandidate<T> | null {
  if (sortedTelemetry.length < 2) return null;
  let best: BattleCandidate<T> | null = null;

  for (let i = 0; i < sortedTelemetry.length - 1; i++) {
    const ahead = sortedTelemetry[i];
    const chaser = sortedTelemetry[i + 1];
    if (ahead.speedKmh <= 8 && chaser.speedKmh <= 8) continue;

    const gap = ahead.distanceMeters - chaser.distanceMeters;
    if (gap < 0 || gap > 32.0) continue;

    let score = (32.0 - gap) * 2.4;

    // Bonus for razor-thin side-by-side duels
    if (gap <= 5.5 && ahead.speedKmh > 20 && chaser.speedKmh > 20) {
      score += (5.5 - gap) * 7.5;
    }
    // Works symmetrically whether passing left, center, or right
    if (chaser.isPassingLane || ahead.isPassingLane) {
      score += 28;
    }
    // Running wheel-to-wheel abreast in distinct lanes
    if (gap <= 10.0 && Math.abs(chaser.laneOffset - ahead.laneOffset) >= 1.45) {
      score += 18;
    }
    // Faster chaser hunting down ahead rival
    if (chaser.speedKmh > ahead.speedKmh) {
      score += Math.min(28, (chaser.speedKmh - ahead.speedKmh) * 0.65);
    }
    // Higher stakes near lead pack
    if (i === 0) score += 28;
    else if (i === 1) score += 18;
    else if (i === 2) score += 10;

    // De-prioritize cruising past an idle/stalled car if real moving battles exist
    if ((ahead.speedKmh <= 10 || chaser.speedKmh <= 10) && gap > 14.0) {
      score -= 25;
    }

    if (!best || score > best.score) {
      best = { ahead, chaser, rankAhead: i + 1, gapMeters: gap, score };
    }
  }
  return best;
}
