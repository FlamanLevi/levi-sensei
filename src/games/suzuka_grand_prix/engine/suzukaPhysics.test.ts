import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stepKartLongitudinalPhysics,
  computeCorrectAnswerBoost,
  shouldBroadcastTelemetryDelta,
  selectNextQuestionIndexWithSrs,
  wrapTrackDeltaMeters,
  computeCornerApexOffset,
  selectBestPassingLane,
  computeLateralRepulsionVelocity,
  computeKartVisualSteering,
  findBestOvertakeBattleCandidate,
  SUZUKA_PIT_SHOULDER_M,
} from './suzukaPhysics';

test('stepKartLongitudinalPhysics brakes smoothly into Red Speed-Zone corner cap and re-accelerates on exit', () => {
  // Entering Hairpin with 160 km/h speed & momentum, corner cap = 115 km/h
  const braking = stepKartLongitudinalPhysics({
    currentSpeedKmh: 160,
    currentMomentumKmh: 160,
    cornerCapKmh: 115,
    dtSeconds: 0.1,
  });
  assert.ok(braking.nextSpeedKmh < 160, 'Kart should decelerate when above corner speed cap');
  assert.ok(braking.nextSpeedKmh >= 115, 'Kart should not brake below corner speed cap');
  assert.ok(braking.nextMomentumKmh > 150, 'Stored quiz momentum reserve should remain high through the corner');

  // Exiting Hairpin onto straightaway (cornerCapKmh = 180)
  const exiting = stepKartLongitudinalPhysics({
    currentSpeedKmh: 115,
    currentMomentumKmh: 155,
    cornerCapKmh: 180,
    dtSeconds: 0.1,
  });
  assert.ok(exiting.nextSpeedKmh > 115, 'Kart should automatically re-accelerate out of the corner using stored momentum');
});

test('computeCorrectAnswerBoost grants extra DRS boost and points on SRS review words', () => {
  const normal = computeCorrectAnswerBoost({
    currentSpeedKmh: 60,
    currentMomentumKmh: 60,
    nextStreak: 1,
    cornerCapKmh: 180,
    isDrsReviewWord: false,
  });
  const drsReview = computeCorrectAnswerBoost({
    currentSpeedKmh: 60,
    currentMomentumKmh: 60,
    nextStreak: 1,
    cornerCapKmh: 180,
    isDrsReviewWord: true,
  });

  assert.equal(normal.nextSpeedKmh, 108);
  assert.equal(drsReview.nextSpeedKmh, 122);
  assert.ok(drsReview.pointsEarned > normal.pointsEarned);
  assert.equal(drsReview.isBoosting, true);
});

test('shouldBroadcastTelemetryDelta suppresses redundant packets when coasting predictably on school Wi-Fi', () => {
  const lastSent = {
    speedKmh: 120,
    distanceMeters: 500,
    inPitStop: false,
    isFinished: false,
    timestampMs: 1000,
  };

  // 600ms later: kart coasted at ~118 km/h to 519.8m (linear prediction is 520m)
  const redundant = shouldBroadcastTelemetryDelta(lastSent, {
    speedKmh: 118,
    distanceMeters: 519.8,
    inPitStop: false,
    isFinished: false,
    timestampMs: 1600,
  });
  assert.equal(redundant, false, 'Redundant coasting packet should be suppressed to save classroom bandwidth');

  // Student answers a question and surges to 165 km/h
  const surged = shouldBroadcastTelemetryDelta(lastSent, {
    speedKmh: 165,
    distanceMeters: 525,
    inPitStop: false,
    isFinished: false,
    timestampMs: 1600,
  });
  assert.equal(surged, true, 'Significant speed boost must broadcast immediately');
});

test('selectNextQuestionIndexWithSrs prioritizes due review words for spaced repetition mastery', () => {
  const res = selectNextQuestionIndexWithSrs({
    currentQuestionIdx: 2,
    totalQuestions: 6,
    dueReviewIndices: [0, 4],
  });
  assert.equal(res.nextIndex, 0);
  assert.equal(res.isDrsReview, true);
  assert.deepEqual(res.remainingReviewIndices, [4]);
});

test('selectBestPassingLane threads 3-wide center gap between two slower midfield karts', () => {
  const racers = [
    { id: 'slowL', distanceMeters: 220, laneOffset: -2.85, targetLane: -2.85, speedKmh: 65 },
    { id: 'slowR', distanceMeters: 221, laneOffset: 2.85, targetLane: 2.85, speedKmh: 68 },
    { id: 'fast', distanceMeters: 205, laneOffset: -2.85, targetLane: -2.85, speedKmh: 160, isBoosting: true },
  ];

  const decision = selectBestPassingLane({
    selfIndex: 2,
    racers,
    circuitLengthMeters: 2566.6,
    signedCurvature: 0,
    laneLockRemainingSec: 0,
  });

  assert.ok(Math.abs(decision.targetLane) <= 0.75, `Expected center 3-wide pass lane near 0, got ${decision.targetLane}`);
  assert.equal(decision.isActivelyOvertaking, true);
});

test('selectBestPassingLane finds exact dynamic pocket (+0.70m) between -1.42m and +2.85m blockers', () => {
  const racers = [
    { id: 'midL', distanceMeters: 315, laneOffset: -1.42, targetLane: -1.42, speedKmh: 70 },
    { id: 'edgeR', distanceMeters: 316, laneOffset: 2.85, targetLane: 2.85, speedKmh: 72 },
    { id: 'chaser', distanceMeters: 298, laneOffset: -1.42, targetLane: -1.42, speedKmh: 150 },
  ];

  const decision = selectBestPassingLane({
    selfIndex: 2,
    racers,
    circuitLengthMeters: 2566.6,
    signedCurvature: 0,
    laneLockRemainingSec: 0,
  });

  assert.ok(
    decision.targetLane >= 0.55 && decision.targetLane <= 0.85,
    `Expected dynamic gap near +0.70m between -1.42m and +2.85m, got ${decision.targetLane}`
  );
});

test('selectBestPassingLane routes inPitStop kart to nearest outer shoulder away from cruising line', () => {
  const racers = [
    { id: 'pit', distanceMeters: 150, laneOffset: 1.6, targetLane: 1.6, speedKmh: 0, inPitStop: true },
  ];
  const decision = selectBestPassingLane({
    selfIndex: 0,
    racers,
    circuitLengthMeters: 2566.6,
    signedCurvature: 0,
    laneLockRemainingSec: 0,
  });
  assert.equal(decision.targetLane, SUZUKA_PIT_SHOULDER_M);
});

test('selectBestPassingLane respects side-by-side crossover guard and traces corner apex when clear', () => {
  const besideRacers = [
    { id: 'self', distanceMeters: 400, laneOffset: -1.42, targetLane: -1.42, speedKmh: 120 },
    { id: 'alongside', distanceMeters: 400.5, laneOffset: 1.42, targetLane: 1.42, speedKmh: 120 },
  ];
  const guardDecision = selectBestPassingLane({
    selfIndex: 0,
    racers: besideRacers,
    circuitLengthMeters: 2566.6,
    signedCurvature: 0.9, // Sharp right turn ahead, apex is +2.11m across alongside rival
    laneLockRemainingSec: 0,
  });
  assert.ok(
    guardDecision.targetLane < 0,
    `Must never chop across alongside rival (+1.42m) to chase right apex, got ${guardDecision.targetLane}`
  );

  // Unchallenged kart follows inside apex on left and right turns
  assert.ok(computeCornerApexOffset(-0.8) < -1.5, 'Left turn apex must hug negative (-right) edge');
  assert.ok(computeCornerApexOffset(0.8) > 1.5, 'Right turn apex must hug positive (+right) edge');
});

test('computeLateralRepulsionVelocity separates overlapping side-by-side karts cleanly', () => {
  const racers = [
    { id: 'a', distanceMeters: 100, laneOffset: 0.1, targetLane: 0.1, speedKmh: 100 },
    { id: 'b', distanceMeters: 100.3, laneOffset: 0.6, targetLane: 0.6, speedKmh: 102 },
  ];
  const pushA = computeLateralRepulsionVelocity({ selfIndex: 0, racers, circuitLengthMeters: 2566.6 });
  const pushB = computeLateralRepulsionVelocity({ selfIndex: 1, racers, circuitLengthMeters: 2566.6 });
  assert.ok(pushA < -2.0, `Left kart should smoothly push left, got ${pushA}`);
  assert.ok(pushB > 2.0, `Right kart should smoothly push right, got ${pushB}`);
});

test('computeKartVisualSteering matches Suzuka3DEngine +Z forward / +X left basis signs', () => {
  // Moving into right lane (+lateralVelMs > 0) turns nose right (-Y yaw) and steerInput positive
  const steerRight = computeKartVisualSteering({
    speedKmh: 120,
    lateralVelMs: 6.0,
    signedCurvature: 0.5,
  });
  assert.ok(steerRight.laneYawRad < 0, 'Moving toward +right requires negative Y yaw around up axis');
  assert.ok(steerRight.steerInput > 0, 'MicroKartBuilder expects positive steerInput for right turns');

  // Moving into left lane (-lateralVelMs < 0) turns nose left (+Y yaw) and steerInput negative
  const steerLeft = computeKartVisualSteering({
    speedKmh: 120,
    lateralVelMs: -6.0,
    signedCurvature: -0.5,
  });
  assert.ok(steerLeft.laneYawRad > 0, 'Moving toward left (-right) requires positive Y yaw around up axis');
  assert.ok(steerLeft.steerInput < 0, 'MicroKartBuilder expects negative steerInput for left turns');
});

test('findBestOvertakeBattleCandidate prioritizes wheel-to-wheel duels regardless of left vs right passing', () => {
  const telemetry = [
    { id: 'p1', speedKmh: 140, distanceMeters: 620, laneOffset: -1.4, isPassingLane: false },
    { id: 'p2', speedKmh: 142, distanceMeters: 595, laneOffset: -1.4, isPassingLane: false }, // 25m sleepy gap
    { id: 'p3', speedKmh: 110, distanceMeters: 522, laneOffset: 1.4, isPassingLane: false },
    { id: 'p4', speedKmh: 162, distanceMeters: 520, laneOffset: -1.4, isPassingLane: true },  // 2m hot left-side pass!
  ];
  const battle = findBestOvertakeBattleCandidate(telemetry);
  assert.ok(battle);
  assert.equal(battle.ahead.id, 'p3');
  assert.equal(battle.chaser.id, 'p4');
  assert.ok(Math.abs(wrapTrackDeltaMeters(-2500, 2566.6) - 66.6) < 1e-6);
});
