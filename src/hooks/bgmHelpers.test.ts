import test from 'node:test';
import assert from 'node:assert/strict';
import { SOUND_PACKS } from '../utils/soundPacks';
import {
  ALL_BGM_TRACKS,
  WANGAN_BGM_TRACKS,
  AUTO_ADVANCE_LEAD_SECONDS,
  BGM_MAX_DUCKED_VOLUME,
  DEFAULT_BGM_MASTER_VOLUME,
  resolveBGMTrack,
  peekNextBGMTrack,
  getRoleTrackCount,
  resolveQuizHostBgmPhase,
  computeGradualFadeInVolume,
  computeCrossfadeVolumes,
  computeEffectiveBgmVolume,
  computeGrandPrix3DBgmRate,
  shouldAutoAdvanceAtTime,
  sanitizeTrackGain,
  getStoredBgmVolume,
  setStoredBgmVolume,
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

    assert.ok(rushTrack, `Expected rush role track for ${selection}`);
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

test('all 75 sound pack tracks include EBU R128 lufs and safe clamping headroom at 100% volume', () => {
  const allPackEntries = Object.values(SOUND_PACKS).flatMap((p) => p.tracks);
  assert.equal(SOUND_PACKS.all_stars.tracks.length, 75);

  for (const track of allPackEntries) {
    assert.equal(typeof track.lufs, 'number', `Missing lufs on ${track.id}`);
    assert.ok(track.lufs! >= -25 && track.lufs! <= -3, `Out-of-range lufs on ${track.id}: ${track.lufs}`);
    assert.equal(typeof track.gain, 'number', `Missing gain on ${track.id}`);
    assert.ok(track.gain! >= 0.55 && track.gain! <= 1.42, `Out-of-range gain on ${track.id}: ${track.gain}`);

    const maxVol = computeEffectiveBgmVolume({ masterVolume: 1.0, trackGain: track.gain });
    assert.ok(maxVol > 0 && maxVol <= 1.0, `Normalized max output clipped on ${track.id}: ${maxVol}`);
  }

  assert.equal(sanitizeTrackGain(undefined), 1.0);
  assert.equal(sanitizeTrackGain(-2), 1.0);
  assert.equal(sanitizeTrackGain(99), 2.0);
});

test('getRoleTrackCount distinguishes single-track pools (mario) from multi-track pools', () => {
  assert.equal(getRoleTrackCount('none', 'lobby'), 0);
  assert.equal(getRoleTrackCount('mario', 'lobby'), 1);
  assert.equal(getRoleTrackCount('mario', 'rush'), 1);
  assert.equal(getRoleTrackCount('mario', 'quiz'), 3);
  assert.equal(getRoleTrackCount('wangan', 'rush'), 5);
  assert.ok(getRoleTrackCount('all_stars', 'lobby') >= 8);
});

test('peekNextBGMTrack accurately previews cold primed decks and subsequent post-draw tracks', () => {
  const storage = createMemoryStorage();

  // Cold start: primeIfEmpty prepares the upcoming phase shuffle bag so prewarm URL === real draw URL
  const prewarmed = peekNextBGMTrack('wangan', 'rush', storage, { primeIfEmpty: true });
  assert.ok(prewarmed?.id);
  const repeatPeek = peekNextBGMTrack('wangan', 'rush', storage);
  assert.equal(repeatPeek?.id, prewarmed.id, 'Repeat peek must be idempotent without advancing');

  const firstRealDraw = resolveBGMTrack('wangan', 'rush', storage);
  assert.equal(firstRealDraw?.id, prewarmed.id, 'First resolveBGMTrack draw must match prewarmed track');

  // Even across deck exhaustion/refill, peek always matches next real draw
  for (let i = 0; i < 8; i++) {
    const predicted = peekNextBGMTrack('wangan', 'rush', storage);
    const actual = resolveBGMTrack('wangan', 'rush', storage);
    assert.ok(predicted?.id && actual?.id);
    assert.equal(actual.id, predicted.id, `Step ${i}: resolved track must match peek prediction`);
  }
});

test('shouldAutoAdvanceAtTime triggers lead-out crossfade only for multi-track pools near end', () => {
  assert.equal(shouldAutoAdvanceAtTime(118.5, 120, true), false, '1-track pools should loop natively, not auto-advance');
  assert.equal(shouldAutoAdvanceAtTime(115.0, 120, false), false, 'Should not advance with > leadSeconds left');
  assert.equal(shouldAutoAdvanceAtTime(0, 120, false), false, 'Must not auto-advance at t=0');
  assert.equal(shouldAutoAdvanceAtTime(8, 9, false), false, 'Very short stingers <=10s stay ignored');

  const triggerTime = 120 - AUTO_ADVANCE_LEAD_SECONDS + 0.1;
  assert.equal(shouldAutoAdvanceAtTime(triggerTime, 120, false), true);
  assert.equal(shouldAutoAdvanceAtTime(120, 120, false), true);
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

test('Master BGM Volume store preserves 0.35 classroom baseline at 50% slider and caps ducking', () => {
  const storage = createMemoryStorage();
  assert.equal(getStoredBgmVolume(storage), DEFAULT_BGM_MASTER_VOLUME);

  const baselineVol = computeEffectiveBgmVolume({
    masterVolume: DEFAULT_BGM_MASTER_VOLUME,
    trackGain: 1.0,
  });
  assert.ok(Math.abs(baselineVol - 0.35) < 1e-6);

  assert.equal(setStoredBgmVolume(1.5, storage), 1);
  assert.equal(getStoredBgmVolume(storage), 1);
  assert.equal(setStoredBgmVolume(-0.2, storage), 0);
  assert.equal(getStoredBgmVolume(storage), 0);
  assert.equal(computeEffectiveBgmVolume({ masterVolume: 0, trackGain: 1.4 }), 0);
  assert.equal(computeEffectiveBgmVolume({ masterVolume: 0.8, trackGain: 1.0, isMuted: true }), 0);

  const duckedVol = computeEffectiveBgmVolume({ masterVolume: 1.0, trackGain: 1.4, isDucked: true });
  assert.ok(duckedVol > 0 && duckedVol <= BGM_MAX_DUCKED_VOLUME);
});

test('computeGrandPrix3DBgmRate ramps proportionally as racers finish without final-lap floor', () => {
  // Idle / Lobby / Pre-Green stays 1.0x
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: true,
      raceActive: false,
      isTimeTrial: false,
      timeTrialRemainingMs: 60000,
      hasGraceCountdown: false,
      finishedCount: 15,
      graceTriggerCount: 15,
    }),
    1.0
  );

  // Lap race: starts at 1.0x even with 0 finishers, ramps proportionally toward 1.24x, 1.25x at trigger/grace
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: false,
      timeTrialRemainingMs: 0,
      hasGraceCountdown: false,
      finishedCount: 0,
      graceTriggerCount: 15,
    }),
    1.0
  );
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: false,
      timeTrialRemainingMs: 0,
      hasGraceCountdown: false,
      finishedCount: 5,
      graceTriggerCount: 15,
    }),
    1.08
  );
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: false,
      timeTrialRemainingMs: 0,
      hasGraceCountdown: false,
      finishedCount: 10,
      graceTriggerCount: 15,
    }),
    1.16
  );
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: false,
      timeTrialRemainingMs: 0,
      hasGraceCountdown: true,
      finishedCount: 5,
      graceTriggerCount: 15,
    }),
    1.25
  );
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: false,
      timeTrialRemainingMs: 0,
      hasGraceCountdown: false,
      finishedCount: 12,
      graceTriggerCount: 12,
    }),
    1.25
  );

  // 1-lap final 80% bump


  // Time Trial 15s -> 1.15x, 5s -> 1.25x
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: true,
      timeTrialRemainingMs: 25000,
      hasGraceCountdown: false,
      finishedCount: 0,
    }),
    1.0
  );
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: true,
      timeTrialRemainingMs: 12000,
      hasGraceCountdown: false,
      finishedCount: 0,
    }),
    1.15
  );
  assert.equal(
    computeGrandPrix3DBgmRate({
      isLobby: false,
      raceActive: true,
      isTimeTrial: true,
      timeTrialRemainingMs: 4200,
      hasGraceCountdown: false,
      finishedCount: 0,
    }),
    1.25
  );
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
