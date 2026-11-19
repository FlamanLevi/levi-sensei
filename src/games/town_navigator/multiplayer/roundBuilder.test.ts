import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDistancePoints,
  computeRoundScore,
  isPhotoFinish,
  findNearestNamedBuilding,
  PODIUM_BONUSES,
} from './roundBuilder';
import type { PlacedBuilding } from '../townGenerator';

function mockBuilding(overrides: Partial<PlacedBuilding>): PlacedBuilding {
  return {
    id: 'LIBRARY',
    nameEn: 'Library',
    nameJa: '図書館',
    rubyName: '図書館',
    tier: 2,
    worldPos: [10, 0, 10],
    entrancePos: [10, 0.18, 15.35],
    rotationY: 0,
    widthMeters: 12,
    depthMeters: 12,
    audioPath: '',
    features: [],
    ...overrides,
  };
}

test('computeDistancePoints awards 1000 at 0m and decays linearly to 0', () => {
  assert.equal(computeDistancePoints(0), 1000);
  assert.equal(computeDistancePoints(-3), 1000);
  assert.equal(computeDistancePoints(95, 95), 0);
  assert.equal(computeDistancePoints(150, 95), 0);
  assert.equal(computeDistancePoints(47.5, 95), 500);
});

test('computeRoundScore adds Gold > Silver > Bronze speed bonus on top of 1000 distance pts', () => {
  const gold = computeRoundScore(4.2, 1);
  const silver = computeRoundScore(2.1, 2);
  const bronze = computeRoundScore(1.0, 3);
  const fourth = computeRoundScore(19, undefined);

  assert.equal(gold.distancePts, 1000);
  assert.equal(gold.bonusPts, PODIUM_BONUSES[1]);
  assert.equal(gold.roundPts, 1500);

  assert.equal(silver.roundPts, 1300);
  assert.equal(bronze.roundPts, 1150);
  assert.ok(gold.roundPts > silver.roundPts);
  assert.ok(silver.roundPts > bronze.roundPts);
  assert.ok(bronze.roundPts > fourth.roundPts);
  assert.equal(fourth.bonusPts, 0);
  assert.equal(fourth.distancePts, 800);
});

test('isPhotoFinish returns true only when Silver finishes within 1.5s of Gold', () => {
  assert.equal(
    isPhotoFinish([
      { place: 1, playerId: 'a', nickname: 'A', avatarColor: '#f00', finishMs: 10000, bonusPts: 500 },
      { place: 2, playerId: 'b', nickname: 'B', avatarColor: '#0f0', finishMs: 11200, bonusPts: 300 },
    ]),
    true
  );

  assert.equal(
    isPhotoFinish([
      { place: 1, playerId: 'a', nickname: 'A', avatarColor: '#f00', finishMs: 10000, bonusPts: 500 },
      { place: 2, playerId: 'b', nickname: 'B', avatarColor: '#0f0', finishMs: 14500, bonusPts: 300 },
    ]),
    false
  );

  assert.equal(
    isPhotoFinish([
      { place: 1, playerId: 'a', nickname: 'A', avatarColor: '#f00', finishMs: 10000, bonusPts: 500 },
    ]),
    false
  );
});

test('findNearestNamedBuilding ignores Tier 0 houses and finds closest named facility', () => {
  const house = mockBuilding({ id: 'HOUSE', tier: 0, worldPos: [0, 0, 0], entrancePos: [0, 0.18, 2] });
  const library = mockBuilding({ id: 'LIBRARY', tier: 2, worldPos: [20, 0, 0], entrancePos: [20, 0.18, 5] });
  const shop = mockBuilding({ id: 'CONVENIENCE_STORE', tier: 1, worldPos: [-20, 0, 0], entrancePos: [-20, 0.18, 2] });

  const nearHouse = findNearestNamedBuilding(0, 2, [house, library, shop]);
  assert.equal(nearHouse, null);

  const nearLib = findNearestNamedBuilding(21, 6, [house, library, shop]);
  assert.ok(nearLib);
  assert.equal(nearLib.building.id, 'LIBRARY');
});
