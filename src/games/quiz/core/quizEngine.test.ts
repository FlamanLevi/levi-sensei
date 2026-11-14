import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRtdbWriteThrottler,
  evaluateOptionMatch,
  calculateClassicScore,
  calculateArcadeScore,
  resolveLockoutPenaltySeconds,
  resolveOptionPresentation,
  computeEliminatedOptionIds,
  computeTroubleWordsMap,
  reconcileTeamScores,
  calculateTamaireThrowResult,
  formatTamaireCountCallout,
  buildTamaireSuspenseSchedule,
  computeStudentShotTrajectoryPoint,
  resolveTeamMaxCapacity,
  isTeamSelectionFull,
  resolveQuestionScopedAnswer,
  computeTugOfWarSweepsRemaining,
  GAME_MODE_STRATEGIES,
  QuizQuestion,
  QuizPlayer,
} from './quizEngine';

const sampleQuestion: QuizQuestion = {
  questionIndex: 0,
  totalQuestions: 10,
  targetWordId: 'w_apple',
  targetWordEnglish: 'apple',
  targetWordJa: 'りんご',
  promptType: 'EN_TO_JA',
  promptText: 'apple',
  options: [
    {
      id: 'opt_1',
      english: 'apple',
      ja_kanji: '林檎',
      ja_hiragana: 'りんご',
      en_katakana: 'アップル',
      image: '/assets/apple_1_c.png',
      symbol: 'triangle',
      color: 'red',
    },
    {
      id: 'opt_2',
      english: 'banana',
      ja_kanji: 'バナナ',
      ja_hiragana: 'ばなな',
      image: '/assets/banana_1_c.png',
      symbol: 'diamond',
      color: 'blue',
    },
    {
      id: 'opt_3',
      english: 'orange',
      ja_kanji: 'みかん',
      image: '/assets/orange_1_c.png',
      symbol: 'circle',
      color: 'yellow',
    },
    {
      id: 'opt_4',
      english: 'grape',
      ja_kanji: 'ぶどう',
      image: '/assets/grape_1_c.png',
      symbol: 'square',
      color: 'green',
    },
  ],
  correctOptionId: 'opt_1',
  distractorOptionIds: ['opt_2', 'opt_3', 'opt_4'],
  englishReadingAid: 'WITH_KATAKANA',
  startTime: 1000,
  timeLimitMs: 15000,
};

test('GEMINI.md §5: RTDB write throttler coalesces 60Hz bursts into <= 10Hz writes', async () => {
  const writes: Record<string, any>[] = [];
  const throttler = createRtdbWriteThrottler<Record<string, any>>((payload) => {
    writes.push(payload);
  }, 125);

  // Simulate 20 rapid state updates within the same millisecond (e.g. physics/taps)
  for (let i = 1; i <= 20; i++) {
    throttler.push({ sprintProgress: i, score: i * 100 });
  }

  // First push executes immediately; remaining 19 are coalesced into pending buffer
  assert.equal(writes.length, 1);
  assert.equal(writes[0].sprintProgress, 1);

  // Flush coalesced patch
  await throttler.flush();
  assert.equal(writes.length, 2);
  assert.equal(writes[1].sprintProgress, 20);
  assert.equal(writes[1].score, 2000);

  throttler.dispose();
});

test('GEMINI.md §7: Anti-spam lockout enforces >= 2.5s Pit Stop floor in Sprint and 3D Grand Prix', () => {
  // Even if misconfigured to 0.5s or 1.0s in legacy SprintSettings, floor is 2.5s
  const firstMiss = resolveLockoutPenaltySeconds({
    mode: 'GRAND_PRIX_3D',
    mistakeCountOnQuestion: 1,
    configuredLockoutSeconds: 0.5,
  });
  assert.equal(firstMiss.penaltySeconds, 2.5);

  const secondMiss = resolveLockoutPenaltySeconds({
    mode: 'SPRINT_RACE',
    mistakeCountOnQuestion: 2,
  });
  assert.equal(secondMiss.penaltySeconds, 3.5);

  const thirdMiss = resolveLockoutPenaltySeconds({
    mode: 'SPRINT_RACE',
    mistakeCountOnQuestion: 3,
  });
  assert.equal(thirdMiss.penaltySeconds, 5.0);
});

test('GEMINI.md §7: !isEnPrompt cheating prevention hides option images in EN_TO_JA mode', () => {
  const enToJaPresentation = resolveOptionPresentation(sampleQuestion, sampleQuestion.options[0]);
  assert.equal(enToJaPresentation.isEnPrompt, true);
  assert.equal(enToJaPresentation.showOptionImage, false);
  assert.equal(enToJaPresentation.displayText, '林檎');
  assert.equal(enToJaPresentation.subText, 'りんご');

  const enWordQuestion: QuizQuestion = {
    ...sampleQuestion,
    promptType: 'EN_WORD',
  };
  const enWordPresentation = resolveOptionPresentation(enWordQuestion, {
    ...sampleQuestion.options[1],
    ja_kanji: '',
    ja_hiragana: 'ばなな',
  });
  assert.equal(enWordPresentation.isEnPrompt, true);
  assert.equal(enWordPresentation.showOptionImage, false);
  assert.equal(enWordPresentation.displayText, 'ばなな');
  assert.equal(enWordPresentation.subText, undefined);

  const jaMeaningQuestion: QuizQuestion = {
    ...sampleQuestion,
    promptType: 'JA_MEANING',
    promptImage: undefined,
  };
  const jaPresentation = resolveOptionPresentation(jaMeaningQuestion, sampleQuestion.options[0]);
  assert.equal(jaPresentation.isEnPrompt, false);
  assert.equal(jaPresentation.showOptionImage, true);
  assert.equal(jaPresentation.displayText, 'apple');
  assert.equal(jaPresentation.subText, '【アップル】');
});

test('GEMINI.md §7: Distractor elimination supports OFF, HALFWAY, and GRADUAL modes', () => {
  const offSet = computeEliminatedOptionIds({
    question: sampleQuestion,
    timeLeftMs: 3000,
    mode: 'OFF',
  });
  assert.equal(offSet.size, 0);

  const halfwayBefore = computeEliminatedOptionIds({
    question: sampleQuestion,
    timeLeftMs: 8000,
    mode: 'HALFWAY',
  });
  assert.equal(halfwayBefore.size, 0);

  const halfwayAfter = computeEliminatedOptionIds({
    question: sampleQuestion,
    timeLeftMs: 7500,
    mode: 'HALFWAY',
  });
  assert.equal(halfwayAfter.size, 2);
  assert.equal(halfwayAfter.has('opt_1'), false);

  const gradualOne = computeEliminatedOptionIds({
    question: sampleQuestion,
    timeLeftMs: 9000, // 60% remaining <= 67%
    mode: 'GRADUAL',
  });
  assert.equal(gradualOne.size, 1);

  const gradualTwo = computeEliminatedOptionIds({
    question: sampleQuestion,
    timeLeftMs: 4500, // 30% remaining <= 34%
    mode: 'GRADUAL',
  });
  assert.equal(gradualTwo.size, 2);
});

test('Shared scoring & trouble words aggregation produces deterministic results', () => {
  const classicPts = calculateClassicScore({
    isCorrect: true,
    timeTakenMs: 3000,
    timeLimitMs: 15000,
    recallDelaySeconds: 3,
    newStreak: 2,
  });
  // Recall delay 3000ms => effectiveTimeTakenMs = 0 => full 500 speedPoints + 500 base + 50 streak = 1050
  assert.equal(classicPts, 1050);

  const players: Record<string, QuizPlayer> = {
    p1: {
      id: 'p1',
      nickname: 'Kenji',
      teamId: 'team_red',
      score: 1200,
      currentStreak: 1,
      maxStreak: 2,
      correctCount: 1,
      totalAnswered: 2,
      fastestTimeMs: 1400,
      joinedAt: 1000,
      answers: {
        0: { questionIndex: 0, optionId: 'opt_2', isCorrect: false, timeTakenMs: 2000, pointsEarned: 0, incorrectAttempts: 2 },
      },
    },
    p2: {
      id: 'p2',
      nickname: 'Hana',
      teamId: 'team_white',
      score: 2000,
      currentStreak: 2,
      maxStreak: 2,
      correctCount: 2,
      totalAnswered: 2,
      fastestTimeMs: 1100,
      joinedAt: 1000,
      answers: {
        0: { questionIndex: 0, optionId: 'opt_1', isCorrect: true, timeTakenMs: 1100, pointsEarned: 1000 },
      },
    },
  };

  const trouble = computeTroubleWordsMap(players, [sampleQuestion]);
  assert.ok(trouble['w_apple']);
  assert.equal(trouble['w_apple'].incorrectCount, 1);

  const teamScores = reconcileTeamScores(players, ['team_red', 'team_white']);
  assert.equal(teamScores.team_red?.score, 1200);
  assert.equal(teamScores.team_red?.mvpNickname, 'Kenji');
  assert.equal(teamScores.team_white?.score, 2000);
  assert.equal(teamScores.team_white?.mvpNickname, 'Hana');
});

test('Strategy registry defines all 5 gamePlayType adapters within <=10Hz budget', () => {
  for (const strategy of Object.values(GAME_MODE_STRATEGIES)) {
    assert.ok(strategy.maxClientWriteHz <= 10);
  }
  assert.equal(GAME_MODE_STRATEGIES.VOLLEYBALL.labelJa, '3D 運動会 玉入れバトル');
  assert.equal(GAME_MODE_STRATEGIES.VOLLEYBALL.defaultLockoutSeconds, 2.5);
});

test('Undokai Bean Bag Toss (Tamaire / 玉入れ): 2.5s fumbled bag lockout, golden 3-streak double throw, and counting ceremony', () => {
  // 1. Even if legacy volleyballSettings passes 2.0s, Tamaire enforces >= 2.5s per GEMINI.md §7
  const fumbleLockout = resolveLockoutPenaltySeconds({
    mode: 'VOLLEYBALL',
    mistakeCountOnQuestion: 1,
    configuredLockoutSeconds: 2.0,
  });
  assert.equal(fumbleLockout.penaltySeconds, 2.5);
  assert.equal(fumbleLockout.badgeTextJa, 'お手玉を落とした！');

  // 2. Standard correct answer (streak 1 & 2) throws 1 bean bag
  const throw1 = calculateTamaireThrowResult({ isCorrect: true, previousStreak: 0, timeTakenMs: 1500 });
  assert.equal(throw1.bagsThrown, 1);
  assert.equal(throw1.isGoldenDouble, false);
  assert.equal(throw1.newStreak, 1);

  // 3. Every 3rd consecutive correct answer triggers a Golden 2-Bag Toss!
  const throw3 = calculateTamaireThrowResult({ isCorrect: true, previousStreak: 2, timeTakenMs: 1400 });
  assert.equal(throw3.bagsThrown, 2);
  assert.equal(throw3.isGoldenDouble, true);
  assert.equal(throw3.newStreak, 3);
  assert.equal(throw3.pointsEarned, 1500);

  // 4. Traditional Japanese counting ceremony ("ひとーつ！", "ふたーつ！", ..., "15こ！")
  assert.equal(formatTamaireCountCallout(1).reading, 'ひとーつ！');
  assert.equal(formatTamaireCountCallout(2).reading, 'ふたーつ！');
  assert.equal(formatTamaireCountCallout(10).reading, 'とお！');
  assert.equal(formatTamaireCountCallout(15).reading, '15こ！');
});

test('Multi-Stage Suspenseful Tama-kazoe Schedule: decelerates before tie, pauses for cliffhanger rattle, and erupts on climax', () => {
  const schedule = buildTamaireSuspenseSchedule(6, 4);

  // 1. First frame is always WHISTLE_EYES_UP directing students to look up from iPads
  assert.equal(schedule[0].stage, 'WHISTLE_EYES_UP');
  assert.equal(schedule[0].countedRed, 0);
  assert.equal(schedule[0].countedWhite, 0);
  assert.equal(schedule[0].remainingRedVisual, 6);
  assert.equal(schedule[0].remainingWhiteVisual, 4);

  // 2. Step 1 is brisk RHYTHMIC_CHANT, while steps 2..4 (last 3 before tie=4) enter TENSION_SLOWDOWN with increasing delayMs
  const step1 = schedule.find((f) => f.stepIndex === 1 && f.stage === 'RHYTHMIC_CHANT');
  const step2 = schedule.find((f) => f.stepIndex === 2 && f.stage === 'TENSION_SLOWDOWN');
  const step3 = schedule.find((f) => f.stepIndex === 3 && f.stage === 'TENSION_SLOWDOWN');
  const step4 = schedule.find((f) => f.stepIndex === 4 && f.stage === 'TENSION_SLOWDOWN');
  assert.ok(step1 && step2 && step3 && step4);
  assert.ok(step2.delayMs < step3.delayMs);
  assert.ok(step3.delayMs < step4.delayMs);
  assert.ok(step1.pitchSemitones < step4.pitchSemitones);

  // 3. Immediately after step 4 (the tie point), a CLIFFHANGER_RATTLE drumroll pause occurs
  const cliffhanger = schedule.find((f) => f.stage === 'CLIFFHANGER_RATTLE');
  assert.ok(cliffhanger);
  assert.equal(cliffhanger.countedRed, 4);
  assert.equal(cliffhanger.countedWhite, 4);
  assert.equal(cliffhanger.remainingRedVisual, 0);
  assert.equal(cliffhanger.remainingWhiteVisual, 0);
  assert.ok(cliffhanger.delayMs >= 1200);

  // 4. Steps 5 and 6 are CLIMAX_REVEAL frames where only Red basket ejects golden winning bags
  const climaxFrames = schedule.filter((f) => f.stage === 'CLIMAX_REVEAL');
  assert.equal(climaxFrames.length, 2);
  assert.equal(climaxFrames[0].ejectRed, true);
  assert.equal(climaxFrames[0].ejectWhite, false);
  assert.equal(climaxFrames[0].isGoldenClimax, true);

  // 5. Final frame is VICTORY_FANFARE with full scores
  const finalFrame = schedule[schedule.length - 1];
  assert.equal(finalFrame.stage, 'VICTORY_FANFARE');
  assert.equal(finalFrame.countedRed, 6);
  assert.equal(finalFrame.countedWhite, 4);
});

test('Student iPad Over-the-Shoulder Shot Trajectory: SWISH passes through net while RIM_DOINK clanks off rim and ricochets', () => {
  // 1. Clean Swish: arcs high above rim (ny < 0.21 at mid-flight) and enters net swish zone after t=0.72
  const swishApex = computeStudentShotTrajectoryPoint({ progress: 0.38, outcome: 'SWISH' });
  assert.ok(swishApex.ny < 0.21);
  assert.equal(swishApex.inNetSwishZone, false);

  const swishNet = computeStudentShotTrajectoryPoint({ progress: 0.9, outcome: 'SWISH' });
  assert.equal(swishNet.inNetSwishZone, true);
  assert.equal(swishNet.atRimDoinkImpact, false);
  assert.ok(swishNet.ny > 0.21 && swishNet.ny <= 0.37);

  // 2. Rim Doink: strikes metal rim around t=0.55 and bounces outward to the sand by t=1.0
  const doinkImpact = computeStudentShotTrajectoryPoint({
    progress: 0.55,
    outcome: 'RIM_DOINK',
    doinkDirection: 1,
  });
  assert.equal(doinkImpact.atRimDoinkImpact, true);
  assert.ok(Math.abs(doinkImpact.ny - 0.21) < 0.02);

  const doinkLand = computeStudentShotTrajectoryPoint({
    progress: 1.0,
    outcome: 'RIM_DOINK',
    doinkDirection: 1,
  });
  assert.equal(doinkLand.inNetSwishZone, false);
  assert.ok(doinkLand.nx > 0.75);
  assert.ok(doinkLand.ny > 0.85);
});

test('Dynamic team capacity & balance guard scales cleanly to 35-student classrooms', () => {
  // 2-team 35-student class should allow 18 per team (not capped at 10)
  assert.equal(resolveTeamMaxCapacity(35, 2), 18);
  // 4-team classroom keeps minimum floor of 10 per team
  assert.equal(resolveTeamMaxCapacity(35, 4), 10);

  // Team Red with 10 of 18 players while Team White has 9 should NOT be marked full
  assert.equal(
    isTeamSelectionFull({
      teamCountForTeam: 10,
      minCount: 9,
      totalPlayers: 19,
      teamCount: 2,
      classSize: 35,
    }),
    false
  );

  // Stacking rule still locks a team >= minCount + 2 once >= 8 students have joined
  assert.equal(
    isTeamSelectionFull({
      teamCountForTeam: 6,
      minCount: 4,
      totalPlayers: 10,
      teamCount: 2,
      classSize: 35,
    }),
    true
  );

  // At full 2-team capacity (18), team locks cleanly
  assert.equal(
    isTeamSelectionFull({
      teamCountForTeam: 18,
      minCount: 17,
      totalPlayers: 35,
      teamCount: 2,
      classSize: 35,
    }),
    true
  );
});

test('resolveQuestionScopedAnswer prevents previous-question lastAnswer leakage', () => {
  const staleLast = {
    questionIndex: 0,
    optionId: 'opt_1',
    isCorrect: true,
    pointsEarned: 1000,
    timeTakenMs: 900,
  };

  // Querying Q1 when only Q0 exists returns undefined (does not leak Q0 result)
  assert.equal(
    resolveQuestionScopedAnswer({
      answers: { 0: staleLast },
      lastAnswer: staleLast,
      questionIndex: 1,
    }),
    undefined
  );

  // Untrusted legacy lastAnswer without questionIndex cannot masquerade as Q1
  const untaggedLast = {
    optionId: 'opt_1',
    isCorrect: true,
    pointsEarned: 950,
    timeTakenMs: 1100,
  };
  assert.equal(
    resolveQuestionScopedAnswer({
      answers: {},
      lastAnswer: untaggedLast,
      questionIndex: 1,
    }),
    undefined
  );

  // Timeout answer record on Q1 is found and distinguishable by empty optionId
  const timeoutRecord = {
    questionIndex: 1,
    optionId: '',
    isCorrect: false,
    pointsEarned: 0,
    timeTakenMs: 15000,
  };
  const resolved = resolveQuestionScopedAnswer({
    answers: { 0: staleLast, 1: timeoutRecord },
    lastAnswer: staleLast,
    questionIndex: 1,
  });
  assert.equal(resolved?.optionId, '');
  assert.equal(resolved?.isCorrect, false);
});

test('computeTugOfWarSweepsRemaining computes pulls across center and never returns 0 before ±100', () => {
  // Trailing Red team when White is ahead (+50) needs 150 displacement units at step 20 => 8 pulls
  assert.equal(
    computeTugOfWarSweepsRemaining({
      displacement: 50,
      sensitivity: 20,
      activeTeamCount: 1,
      team: 'team_red',
    }),
    8
  );

  // Nearly swept at -99 still needs 1 pull (not 0 from rounding down)
  assert.equal(
    computeTugOfWarSweepsRemaining({
      displacement: -99,
      sensitivity: 20,
      activeTeamCount: 10,
      team: 'team_red',
    }),
    1
  );

  // Already swept returns 0
  assert.equal(
    computeTugOfWarSweepsRemaining({
      displacement: -100,
      sensitivity: 20,
      activeTeamCount: 10,
      team: 'team_red',
    }),
    0
  );
  assert.equal(
    computeTugOfWarSweepsRemaining({
      displacement: 100,
      sensitivity: 20,
      activeTeamCount: 10,
      team: 'team_white',
    }),
    0
  );
});

test('Release 1 TAMAIRE strategy and 5-tier configurable lockout [2.5, 3.0, 3.5, 4.0, 5.0]', () => {
  assert.equal(GAME_MODE_STRATEGIES.TAMAIRE.gamePlayType, 'TAMAIRE');
  assert.equal(GAME_MODE_STRATEGIES.TAMAIRE.activeStatus, 'TAMAIRE');
  assert.equal(GAME_MODE_STRATEGIES.TAMAIRE.requiresTwoTeams, true);
  assert.ok(GAME_MODE_STRATEGIES.TAMAIRE.maxClientWriteHz <= 10);
  const initialPatch = GAME_MODE_STRATEGIES.TAMAIRE.resolveInitialRoomPatch(5000, 90);
  assert.equal(initialPatch.status, 'TAMAIRE');
  assert.equal(initialPatch.tamaireStartTime, 5000);
  assert.equal(initialPatch.volleyballStartTime, 5000);
  assert.equal(initialPatch.tamaireFinished, false);
  assert.equal(initialPatch.volleyballFinished, false);

  const lockoutTiers = [2.5, 3.0, 3.5, 4.0, 5.0];
  for (const tierSec of lockoutTiers) {
    assert.equal(
      resolveLockoutPenaltySeconds({
        mode: 'GRAND_PRIX_3D',
        mistakeCountOnQuestion: 1,
        configuredLockoutSeconds: tierSec,
      }).penaltySeconds,
      tierSec
    );
    assert.equal(
      resolveLockoutPenaltySeconds({
        mode: 'TUG_OF_WAR',
        mistakeCountOnQuestion: 1,
        configuredLockoutSeconds: tierSec,
      }).penaltySeconds,
      tierSec
    );
    assert.equal(
      resolveLockoutPenaltySeconds({
        mode: 'TAMAIRE',
        mistakeCountOnQuestion: 1,
        configuredLockoutSeconds: tierSec,
      }).penaltySeconds,
      tierSec
    );
  }
});
