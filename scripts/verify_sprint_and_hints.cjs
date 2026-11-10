// Verification script for Sprint Race and Question Mechanics
const assert = require('assert');

console.log('Testing Sprint Race & Question Mechanics logic...\n');

// 1. Time Trial Ranking Test
console.log('1. Testing Time Trial Classification:');
const timeTrialPlayers = {
  p1: { id: 'p1', nickname: 'FastPanda', correctCount: 15, score: 1400, totalAnswered: 18 },
  p2: { id: 'p2', nickname: 'SwiftTiger', correctCount: 18, score: 1300, totalAnswered: 20 },
  p3: { id: 'p3', nickname: 'BraveLion', correctCount: 15, score: 1600, totalAnswered: 16 },
  p4: { id: 'p4', nickname: 'CalmKoala', correctCount: 10, score: 900, totalAnswered: 12 },
};

// Host & Student sorting logic
const sortedTimeTrial = Object.values(timeTrialPlayers).sort((a, b) => {
  if ((b.correctCount || 0) !== (a.correctCount || 0)) {
    return (b.correctCount || 0) - (a.correctCount || 0);
  }
  return (b.score || 0) - (a.score || 0);
});

assert.strictEqual(sortedTimeTrial[0].id, 'p2', 'P1 should be SwiftTiger (18 correct)');
assert.strictEqual(sortedTimeTrial[1].id, 'p3', 'P2 should be BraveLion (15 correct, 1600 pts)');
assert.strictEqual(sortedTimeTrial[2].id, 'p1', 'P3 should be FastPanda (15 correct, 1400 pts)');
assert.strictEqual(sortedTimeTrial[3].id, 'p4', 'P4 should be CalmKoala (10 correct)');
console.log('✅ Time Trial ranking sorted by correct answers first, then score.\n');

// 2. Lap Race Classification with Partial Finishers & Podium Padding Test
console.log('2. Testing Lap Race Classification & Podium Padding:');
const lapRacePlayers = {
  p1: { id: 'p1', nickname: 'RocketRacer', isFinished: true, finishTimeMs: 24500, sprintProgress: 10, score: 1500, correctCount: 10, totalAnswered: 10 },
  p2: { id: 'p2', nickname: 'RunnerUp', isFinished: false, sprintProgress: 9, score: 1200, correctCount: 8, totalAnswered: 9 },
  p3: { id: 'p3', nickname: 'BronzeChaser', isFinished: false, sprintProgress: 7, score: 950, correctCount: 7, totalAnswered: 8 },
  p4: { id: 'p4', nickname: 'SlowStarter', isFinished: false, sprintProgress: 4, score: 400, correctCount: 3, totalAnswered: 5 },
};

const sortedLapRacers = Object.values(lapRacePlayers).sort((a, b) => {
  if (a.isFinished && !b.isFinished) return -1;
  if (!a.isFinished && b.isFinished) return 1;
  if (a.isFinished && b.isFinished) {
    return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
  }
  if ((b.sprintProgress || 0) !== (a.sprintProgress || 0)) {
    return (b.sprintProgress || 0) - (a.sprintProgress || 0);
  }
  return (b.score || 0) - (a.score || 0);
});

assert.strictEqual(sortedLapRacers[0].id, 'p1', '1st should be RocketRacer (finished)');
assert.strictEqual(sortedLapRacers[1].id, 'p2', '2nd should be RunnerUp (9 laps)');
assert.strictEqual(sortedLapRacers[2].id, 'p3', '3rd should be BronzeChaser (7 laps)');
assert.strictEqual(sortedLapRacers[3].id, 'p4', '4th should be SlowStarter (4 laps)');

// Test podium derivation padding
const finished = sortedLapRacers.filter(p => p.isFinished);
const unfinished = sortedLapRacers.filter(p => !p.isFinished);
const combinedPodium = [...finished, ...unfinished].slice(0, 3).map((p, idx) => ({
  playerId: p.id,
  nickname: p.nickname,
  finishTimeMs: p.finishTimeMs || 0,
  rank: idx + 1,
  correctCount: p.correctCount,
  totalAnswered: p.totalAnswered
}));

assert.strictEqual(combinedPodium.length, 3, 'Podium must have 3 drivers even if only 1 finished');
assert.strictEqual(combinedPodium[0].rank, 1);
assert.strictEqual(combinedPodium[1].rank, 2);
assert.strictEqual(combinedPodium[2].rank, 3);
assert.strictEqual(combinedPodium[1].finishTimeMs, 0, 'Unfinished runner-up has 0 finish time (rendered as Lap X/Y)');
console.log('✅ Lap race classification and podium padding verified.\n');

// 3. 50/50 Distractor Elimination Consistency
console.log('3. Testing 50/50 Distractor Elimination Consistency:');
const mockQuestion = {
  options: [
    { id: 'opt_cat', english: 'cat' },
    { id: 'opt_dog', english: 'dog' },
    { id: 'opt_bird', english: 'bird' },
    { id: 'opt_fish', english: 'fish' }
  ],
  correctOptionId: 'opt_dog',
  timeLimitMs: 20000
};

function getEliminatedIds(question, timeLeftMs, eliminateDistractors) {
  const isHalfway = eliminateDistractors && (timeLeftMs <= question.timeLimitMs / 2);
  if (!isHalfway) return new Set();
  const wrongOptions = question.options.filter(o => o.id !== question.correctOptionId);
  return new Set(wrongOptions.slice(0, 2).map(o => o.id));
}

// Before halfway (12s left of 20s)
const beforeHalfway = getEliminatedIds(mockQuestion, 12000, true);
assert.strictEqual(beforeHalfway.size, 0, 'Before halfway, 0 options eliminated');

// At halfway (10s left of 20s)
const atHalfway = getEliminatedIds(mockQuestion, 10000, true);
assert.strictEqual(atHalfway.size, 2, 'At halfway, exactly 2 options eliminated');
assert.ok(!atHalfway.has(mockQuestion.correctOptionId), 'Correct option MUST NOT be eliminated');
assert.ok(atHalfway.has('opt_cat') && atHalfway.has('opt_bird'), 'Eliminated opt_cat and opt_bird');

console.log('✅ 50/50 Elimination preserves correct answer and matches across clients.\n');

// 4. Recall First Thinking Delay Verification
console.log('4. Testing Recall First Thinking Delay:');
const recallDelaySec = 3;
function isLocked(delaySec, elapsedMs) {
  return delaySec > 0 && elapsedMs < (delaySec * 1000);
}

assert.strictEqual(isLocked(recallDelaySec, 0), true, 'Locked at 0ms');
assert.strictEqual(isLocked(recallDelaySec, 1500), true, 'Locked at 1500ms');
assert.strictEqual(isLocked(recallDelaySec, 2999), true, 'Locked at 2999ms');
assert.strictEqual(isLocked(recallDelaySec, 3000), false, 'Unlocked at 3000ms');
assert.strictEqual(isLocked(recallDelaySec, 5000), false, 'Unlocked at 5000ms');
assert.strictEqual(isLocked(0, 0), false, 'OFF delay is never locked');

console.log('✅ Recall delay locks and unlocks precisely at threshold.\n');

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
