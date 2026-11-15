import test from 'node:test';
import assert from 'node:assert/strict';
import { SOUND_PACKS } from '../utils/soundPacks';
import {
  ALL_BGM_TRACKS,
  WANGAN_BGM_TRACKS,
  resolveBGMTrack,
  resolveQuizHostBgmPhase,
  computeGradualFadeInVolume,
  computeCrossfadeVolumes,
  KeyValueStorageLike,
  LOBBY_FADE_IN_DURATION_MS,
} from './bgmHelpers';

function createMemoryStorage(): KeyValueStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

test('resolveBGMTrack strictly filters by lobby, quiz, and rush roles across packs', () => {
  const packsWithAllRoles = ['all_stars', 'initial_d', 'persona_5', 'wangan', 'dragon', 'mario', 'random_all', 'random_wangan', 'random_mario'];

  for (const selection of packsWithAllRoles) {
    const storage = createMemoryStorage();
    const lobbyTrack = resolveBGMTrack(selection, 'lobby', storage);
    const quizTrack = resolveBGMTrack(selection, 'quiz', storage);
    const rushTrack = resolveBGMTrack(selection, 'rush', storage);

    assert.ok(lobbyTrack, `Expected lobby track for ${selection}`);
    assert.equal(lobbyTrack.role, 'lobby', `Expected lobby role for ${selection}, got ${lobbyTrack.role}`);

    assert.ok(quizTrack, `Expected quiz track for ${selection}`);
    assert.equal(quizTrack.role, 'quiz', `Expected quiz role for ${selection}, got ${quizTrack.role}`);

    assert.ok(rushTrack, `Expected rush track for ${selection}`);
    assert.equal(rushTrack.role, 'rush', `Expected rush role for ${selection}, got ${rushTrack.role}`);
  }
});

test('resolveBGMTrack safely falls back to pack pool when a role has zero dedicated tracks (mario podium/boss)', () => {
  const storage = createMemoryStorage();
  const marioPodium = resolveBGMTrack('mario', 'podium', storage);
  const marioBoss = resolveBGMTrack('mario', 'boss', storage);

  assert.ok(marioPodium, 'Mario pack should fall back instead of returning null for podium');
  assert.ok(marioBoss, 'Mario pack should fall back instead of returning null for boss');
  assert.ok(resolveBGMTrack('none', 'lobby', storage) === null, 'Silent pack must return null');
});

test('resolveBGMTrack deals the full lobby shuffle bag without back-to-back duplicates', () => {
  const storage = createMemoryStorage();
  const initialDLobbyUrls = SOUND_PACKS.initial_d.tracks.filter((t) => t.role === 'lobby').map((t) => t.id);
  assert.equal(initialDLobbyUrls.length, 2);

  const draws: string[] = [];
  for (let i = 0; i < 6; i++) {
    const picked = resolveBGMTrack('initial_d', 'lobby', storage);
    assert.ok(picked?.id);
    draws.push(picked.id);
  }

  for (let i = 1; i < draws.length; i++) {
    assert.notEqual(draws[i], draws[i - 1], 'Shuffle bag must never repeat the same lobby track back-to-back');
  }
});

test('ALL_BGM_TRACKS and WANGAN_BGM_TRACKS have zero duplicate IDs and valid pack paths', () => {
  const ids = ALL_BGM_TRACKS.map((t) => t.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, 'ALL_BGM_TRACKS should contain zero duplicate track entries');
  assert.equal(ids.length, SOUND_PACKS.all_stars.tracks.length);

  for (const track of WANGAN_BGM_TRACKS) {
    assert.ok(!track.file.includes('wanganmidnight'), `Stale broken path found: ${track.file}`);
    assert.ok(track.file.startsWith('wangan/'));
  }
});

test('resolveQuizHostBgmPhase enables gradual lobby fade-in and Lobby -> Race/Quiz crossfades', () => {
  const lobbyPhase = resolveQuizHostBgmPhase('LOBBY');
  assert.equal(lobbyPhase.isBgmStep, true);
  assert.equal(lobbyPhase.role, 'lobby');
  assert.ok(lobbyPhase.fadeInDurationMs >= LOBBY_FADE_IN_DURATION_MS && lobbyPhase.fadeInDurationMs >= 2500);

  const gpPhase = resolveQuizHostBgmPhase('GRAND_PRIX_3D');
  assert.equal(gpPhase.isBgmStep, true);
  assert.equal(gpPhase.role, 'rush');
  assert.ok(gpPhase.crossfadeDurationMs >= 1800 && gpPhase.crossfadeDurationMs <= 2400);

  const quizPhase = resolveQuizHostBgmPhase('QUESTION');
  assert.equal(quizPhase.isBgmStep, true);
  assert.equal(quizPhase.role, 'quiz');
  assert.ok(quizPhase.crossfadeDurationMs >= 1500);

  const gameOverPhase = resolveQuizHostBgmPhase('GAME_OVER');
  assert.equal(gameOverPhase.isBgmStep, false);
  assert.equal(gameOverPhase.role, 'podium');
});

test('computeGradualFadeInVolume swells smoothly from silence using sub-linear early curve', () => {
  const target = 0.35;
  assert.equal(computeGradualFadeInVolume(0, target), 0);
  assert.equal(computeGradualFadeInVolume(-0.5, target), 0);
  assert.equal(computeGradualFadeInVolume(Number.NaN, target), 0);

  const quarter = computeGradualFadeInVolume(0.25, target);
  const half = computeGradualFadeInVolume(0.5, target);
  const threeQuarter = computeGradualFadeInVolume(0.75, target);
  const end = computeGradualFadeInVolume(1, target);

  // Perceptual curve stays gentle at 25% elapsed (< half of linear 0.25*0.35 = 0.0875)
  assert.ok(quarter > 0 && quarter < 0.05, `Expected quiet early fade-in, got ${quarter}`);
  assert.ok(quarter < half && half < threeQuarter && threeQuarter < end);
  assert.ok(Math.abs(end - target) < 1e-6);
});

test('computeCrossfadeVolumes uses equal-power curves preserving constant energy at midpoint', () => {
  const vol = 0.35;
  const start = computeCrossfadeVolumes(0, vol, vol);
  assert.ok(Math.abs(start.outgoingVolume - vol) < 1e-6);
  assert.equal(start.incomingVolume, 0);

  const mid = computeCrossfadeVolumes(0.5, vol, vol);
  const midEnergy = mid.outgoingVolume ** 2 + mid.incomingVolume ** 2;
  assert.ok(Math.abs(midEnergy - vol ** 2) < 1e-6, 'Equal-power crossfade should avoid a midpoint volume dip');

  const end = computeCrossfadeVolumes(1, vol, vol);
  assert.ok(end.outgoingVolume < 1e-6);
  assert.ok(Math.abs(end.incomingVolume - vol) < 1e-6);
});
