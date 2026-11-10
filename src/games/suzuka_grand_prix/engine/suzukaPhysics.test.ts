import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stepKartLongitudinalPhysics,
  computeCorrectAnswerBoost,
  shouldBroadcastTelemetryDelta,
  selectNextQuestionIndexWithSrs,
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
