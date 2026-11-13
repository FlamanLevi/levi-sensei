import { useState, useEffect, useRef, useCallback } from 'react';
import { ensureAnonymousAuth } from '@/services/firebase';
import {
  safeSet,
  safeUpdate,
  safeGet,
  safeRemove,
  safeSubscribe,
  safeConfigureOnDisconnectUpdate,
  getServerTime,
  initServerTimeSync,
} from '@/services/rtdbSafe';
import { clearClassRoomPointers, sweepStaleRooms } from '@/services/roomSweeper';
import { depositClassEnergy } from '@/services/classVault';
import { soundEffects } from '@/services/soundEffects';
import {
  ClassroomAward,
  QuizPlayer,
  QuizQuestion,
  QuizRoomState,
  RAINBOW_TEAM_ORDER,
  TEAM_PRESETS,
  TeamId,
  TeamScoreData,
  OPTION_STYLES,
} from '@/games/quiz/types';
import { calculateClassroomAwards } from '@/games/quiz/awardsEngine';
import { computeSessionAnalytics, persistSessionAnalytics } from '@/services/analyticsEngine';
import { BotDifficulty } from '@/games/quiz/hooks/useQuizBotSimulator';
import {
  AnticipationBoardToken,
  AnticipationDiceEvent,
  AnticipationHostRound,
  AnticipationResponsePayload,
  AnticipationRoomState,
  AnticipationSettings,
  PIECE_ORDER,
  PIECE_PRESETS,
  advanceSpiralSpace,
  calculateRoundPoints,
  computeDiceSteps,
  getPieceForTeamId,
} from './types';
import { resolveDrawStyleForRound } from './roundBuilder';

const ANTICIPATION_BOT_NAMES = [
  'Kenji ✏️',
  'Yuki 🎨',
  'Hana 🌸',
  'Daiki ⚡',
  'Sora 🚀',
  'Ren 🦁',
  'Aoi 🌊',
  'Yuto 🎯',
  'Mei 🍀',
  'Kaito 🧸',
];

function buildMirrorQuizQuestions(rounds: AnticipationHostRound[]): QuizQuestion[] {
  return rounds.map((r) => ({
    questionIndex: r.roundIndex,
    totalQuestions: rounds.length,
    targetWordId: r.targetWord.id,
    targetWordEnglish: r.targetWord.english,
    targetWordJa: r.targetWord.ja_kanji || r.targetWord.ja_hiragana || r.targetWord.english,
    targetWordHiragana: r.targetWord.ja_hiragana,
    targetWordKatakana: r.targetWord.en_katakana,
    targetWordRuby: r.targetWord.ruby,
    categoryNameEn: r.publicRound.categoryNameEn,
    categoryNameJa: r.publicRound.categoryNameJa,
    promptType: 'IMAGE_ONLY',
    promptText: r.targetWord.english,
    promptImage: r.publicRound.imageUrl,
    promptSound: r.targetWord.sound_file || r.targetWord.primary_audio,
    options: r.publicRound.options.map((o, idx) => ({
      id: o.id,
      english: o.english,
      ja_kanji: o.ja_kanji,
      ja_hiragana: o.ja_hiragana,
      en_katakana: o.en_katakana,
      ruby: o.ruby,
      symbol: OPTION_STYLES[idx % OPTION_STYLES.length].symbol,
      color: OPTION_STYLES[idx % OPTION_STYLES.length].color,
    })),
    correctOptionId: r.correctOptionId,
    startTime: r.publicRound.roundStartTime || 0,
    timeLimitMs: r.publicRound.drawDurationMs,
  }));
}

function buildInitialTokens(
  settings: AnticipationSettings,
  activeTeams: TeamId[]
): Record<string, AnticipationBoardToken> {
  const tokens: Record<string, AnticipationBoardToken> = {};
  if (settings.gameMode === 'TEAM') {
    activeTeams.slice(0, 4).forEach((tId, idx) => {
      const preset = TEAM_PRESETS[tId];
      const pieceId = getPieceForTeamId(tId, idx);
      tokens[tId] = {
        id: tId,
        name: preset?.name || `Team ${idx + 1}`,
        jaName: preset?.jaName || `チーム${idx + 1}`,
        pieceId,
        teamId: tId,
        spaceIndex: 0,
        collectedPieces: [],
        score: 0,
      };
    });
  } else {
    PIECE_ORDER.slice(0, 4).forEach((pId) => {
      const preset = PIECE_PRESETS[pId];
      tokens[pId] = {
        id: pId,
        name: preset.nameEn,
        jaName: preset.nameJa,
        pieceId: pId,
        spaceIndex: 0,
        collectedPieces: [],
        score: 0,
      };
    });
  }
  return tokens;
}

export function useAnticipationRoom(initialRoomCode?: string | null) {
  const [roomCode, setRoomCode] = useState<string | null>(initialRoomCode || null);
  const [room, setRoom] = useState<QuizRoomState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roundsRef = useRef<AnticipationHostRound[]>([]);
  const settingsRef = useRef<AnticipationSettings | null>(null);
  const roomRef = useRef<QuizRoomState | null>(null);
  roomRef.current = room;

  const isRevealingRef = useRef(false);
  const botTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (initialRoomCode && initialRoomCode !== roomCode) {
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode, roomCode]);

  // Screen Wake Lock + Server Time Re-Sync across classroom session
  useEffect(() => {
    if (!roomCode || room?.status === 'CLOSED') return;
    let wakeLock: any = null;
    let mounted = true;
    const reqLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          const s = await (navigator as any).wakeLock.request('screen');
          if (mounted) wakeLock = s;
          else s.release().catch(() => {});
        } catch {}
      }
    };
    void reqLock();
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        initServerTimeSync();
        void reqLock();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVis);
      wakeLock?.release?.().catch(() => {});
    };
  }, [roomCode, room?.status]);

  // Subscribe to rooms/{code} + throttled roomResponses/{code}
  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      return;
    }

    let responseThrottle: ReturnType<typeof setTimeout> | null = null;
    let latestResp: Record<string, AnticipationResponsePayload> = {};

    const unsubRoom = safeSubscribe<QuizRoomState>(
      `rooms/${roomCode}`,
      (data) => {
        setRoom(data || null);
      },
      (err) => {
        setError(err?.message || 'Sync error');
      }
    );

    const unsubResp = safeSubscribe<Record<string, AnticipationResponsePayload>>(
      `roomResponses/${roomCode}`,
      (respData) => {
        latestResp = respData ? { ...respData } : {};
        if (!respData || Object.keys(latestResp).length === 0) {
          if (responseThrottle) {
            clearTimeout(responseThrottle);
            responseThrottle = null;
          }
          setRoom((prev) => (prev ? { ...prev, responses: {} } : null));
          return;
        }
        if (!responseThrottle) {
          responseThrottle = setTimeout(() => {
            responseThrottle = null;
            setRoom((prev) => (prev ? { ...prev, responses: { ...latestResp } as any } : null));
          }, 120);
        }
      }
    );

    return () => {
      unsubRoom();
      unsubResp();
      if (responseThrottle) clearTimeout(responseThrottle);
      botTimersRef.current.forEach(clearTimeout);
      botTimersRef.current = [];
    };
  }, [roomCode]);

  const createRoom = useCallback(
    async (
      code: string,
      grade: string,
      unit: string,
      settings: AnticipationSettings,
      rounds: AnticipationHostRound[]
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        sweepStaleRooms().catch(() => {});
        roundsRef.current = rounds;
        settingsRef.current = settings;
        const hostId = await ensureAnonymousAuth();

        const teamCount = Math.min(4, Math.max(2, settings.teamCount || 4));
        const activeTeams: TeamId[] =
          teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, teamCount);

        const initialTeamScores: Partial<Record<TeamId, TeamScoreData>> = {};
        if (settings.gameMode === 'TEAM') {
          activeTeams.forEach((tId) => {
            const p = TEAM_PRESETS[tId];
            if (p) {
              initialTeamScores[tId] = {
                name: p.name,
                jaName: p.jaName,
                score: 0,
                correctCount: 0,
                memberCount: 0,
                averageScore: 0,
                color: p.color,
                emoji: p.emoji,
              };
            }
          });
        }

        const mirrorQuestions = buildMirrorQuizQuestions(rounds);
        const anticipationState: AnticipationRoomState = {
          phase: 'ACTIVE',
          loopMode: settings.loopMode,
          drawStyle: settings.drawStyle,
          canvasStyle: settings.canvasStyle || 'NES_RETRO',
          timerMode: settings.timerMode || 'NO_CUTOFF',
          drawCompletionSeconds: settings.drawCompletionSeconds || 11,
          inputMode: settings.inputMode,
          englishReadingAid: settings.englishReadingAid,
          roundIndex: 0,
          totalRounds: rounds.length,
          drawDurationSeconds: settings.drawDurationSeconds,
          currentRound: null,
          tokens: buildInitialTokens(settings, activeTeams),
          lastDiceEvent: null,
          triggerNextFeatureDots: false,
        };

        const isTest = Boolean(settings.isTestGame || settings.classId === 'TEST' || code.startsWith('9'));

        const initialRoom: QuizRoomState & { anticipationState?: AnticipationRoomState } = {
          code,
          hostId,
          createdAt: getServerTime(),
          updatedAt: getServerTime(),
          status: 'LOBBY',
          subject: 'ENGLISH',
          grade,
          unit,
          schoolId: settings.schoolId,
          classId: isTest ? 'TEST' : settings.classId,
          recordRoster: settings.recordRoster !== false && !settings.isStudentHost && !isTest,
          isStudentHost: !!settings.isStudentHost,
          isTestGame: isTest,
          mode: settings.gameMode,
          teamAssignment: 'AUTO_BALANCE',
          teamCount,
          activeTeams,
          deliveryStream: 'STREAM_B_MULTIPLAYER',
          ipadDisplayMode: 'MIRRORED',
          totalQuestions: rounds.length,
          currentQuestionIndex: 0,
          currentQuestion: null,
          players: {},
          responses: {},
          teamScores: initialTeamScores,
          awardToggles: { effortGrowth: true, skillChallenge: true, funSurprise: true },
          troubleWords: {},
          boundStudents: {},
          gamePlayType: 'ANTICIPATION',
          englishReadingAid: settings.englishReadingAid,
          timeLimitSeconds: settings.drawDurationSeconds,
          questions: mirrorQuestions,
          bgm: settings.bgm,
          anticipationState,
        };

        await safeRemove(`roomResponses/${code}`).catch(() => {});
        await safeRemove(`roomPlayers/${code}`).catch(() => {});
        await safeSet(`rooms/${code}`, initialRoom);
        await safeConfigureOnDisconnectUpdate(`rooms/${code}`, {
          hostDisconnectedAt: Date.now(),
        });

        if (settings.schoolId && settings.classId && !settings.isStudentHost && !isTest) {
          const pointer = {
            code,
            gamePlayType: 'ANTICIPATION',
            unit,
            isTeacher: true,
            updatedAt: getServerTime(),
          };
          await Promise.all([
            safeSet(`schools/${settings.schoolId}/classes/${settings.classId}/analyticsSummary/teacherRoom`, pointer),
            safeSet(`schools/${settings.schoolId}/classes/${settings.classId}/analyticsSummary/activeRoom`, pointer),
          ]).catch(() => {});
        }

        setRoomCode(code);
        setRoom(initialRoom as QuizRoomState);
        setLoading(false);
        return true;
      } catch (err: any) {
        setError(err?.message || 'Could not create Anticipation room');
        setLoading(false);
        return false;
      }
    },
    []
  );

  // Schedule bot answers when host adds bots in LOBBY/testing
  const scheduleBotResponsesForRound = useCallback(
    (code: string, round: AnticipationHostRound) => {
      botTimersRef.current.forEach(clearTimeout);
      botTimersRef.current = [];
      const players = roomRef.current?.players || {};
      const bots = Object.values(players).filter((p) => p.id.startsWith('bot_'));
      if (bots.length === 0) return;

      bots.forEach((bot, idx) => {
        const refMs = round.publicRound.drawCompletionMs || 11000;
        const speedBase = bot.botDifficulty === 'fast' ? 0.35 : bot.botDifficulty === 'chill' ? 1.15 : 0.72;
        const delayMs = Math.max(
          1800,
          Math.min(round.publicRound.drawDurationMs - 1200, refMs * (speedBase + (idx % 3) * 0.1))
        );
        const tId = setTimeout(() => {
          if (roomRef.current?.status !== 'ANTICIPATION') return;
          const willGetRight = bot.botDifficulty === 'fast' ? Math.random() < 0.92 : Math.random() < 0.78;
          const wrongOpt = round.publicRound.options.find((o) => o.id !== round.correctOptionId);
          const chosen = willGetRight
            ? round.publicRound.options.find((o) => o.id === round.correctOptionId)
            : wrongOpt || round.publicRound.options[0];
          const payload: AnticipationResponsePayload = {
            roundIndex: round.roundIndex,
            optionId: chosen?.id,
            guessText: chosen?.english || round.targetWord.english,
            isCorrect: willGetRight,
            incorrectAttempts: willGetRight ? 0 : 1,
            timeTakenMs: Math.round(delayMs),
            submittedAt: getServerTime(),
          };
          safeSet(`roomResponses/${code}/${bot.id}`, payload).catch(() => {});
        }, delayMs);
        botTimersRef.current.push(tId);
      });
    },
    []
  );

  const startRound = useCallback(
    async (roundIdx: number) => {
      if (!roomCode) return;
      const round = roundsRef.current[roundIdx];
      if (!round) return;

      await ensureAnonymousAuth();
      isRevealingRef.current = false;
      const curState = ((roomRef.current as any)?.anticipationState as AnticipationRoomState | undefined);
      const shouldForceDots = Boolean(curState?.triggerNextFeatureDots);
      const drawStyleDecision = resolveDrawStyleForRound(
        settingsRef.current?.drawStyle || 'MIXED',
        roundIdx,
        shouldForceDots
      );

      const startedRound = {
        ...round.publicRound,
        canvasStyle: settingsRef.current?.canvasStyle || round.publicRound.canvasStyle || 'NES_RETRO',
        timerMode: settingsRef.current?.timerMode || round.publicRound.timerMode || 'NO_CUTOFF',
        drawStyle: drawStyleDecision.drawStyle,
        isFeatureDots: drawStyleDecision.isFeatureDots,
        roundStartTime: getServerTime(),
        phase: 'DRAWING' as const,
        solvedCount: 0,
        revealedCard: undefined,
      };

      await safeRemove(`roomResponses/${roomCode}`).catch(() => {});
      await safeUpdate(`rooms/${roomCode}`, {
        status: 'ANTICIPATION',
        currentQuestionIndex: roundIdx,
        raceStartTime: roundIdx === 0 ? getServerTime() : roomRef.current?.raceStartTime || getServerTime(),
        responses: null,
        'anticipationState/phase': 'ACTIVE',
        'anticipationState/roundIndex': roundIdx,
        'anticipationState/currentRound': startedRound,
        'anticipationState/lastDiceEvent': null,
        'anticipationState/triggerNextFeatureDots': false,
      });

      scheduleBotResponsesForRound(roomCode, round);
    },
    [roomCode, scheduleBotResponsesForRound]
  );

  const startGame = useCallback(async () => {
    await startRound(0);
  }, [startRound]);

  const revealRound = useCallback(async () => {
    if (!roomCode || isRevealingRef.current) return;
    const currentRoom = roomRef.current as (QuizRoomState & { anticipationState?: AnticipationRoomState }) | null;
    const antState = currentRoom?.anticipationState;
    if (!currentRoom || !antState?.currentRound || antState.currentRound.phase === 'ROUND_REVEAL') return;

    isRevealingRef.current = true;
    botTimersRef.current.forEach(clearTimeout);
    botTimersRef.current = [];
    soundEffects.playReveal();

    try {
      await ensureAnonymousAuth();
      await new Promise((r) => setTimeout(r, 250));

      const roundIdx = antState.roundIndex;
      const hostRound = roundsRef.current[roundIdx];
      if (!hostRound) return;

      const [respRaw, playersRaw] = await Promise.all([
        safeGet<Record<string, AnticipationResponsePayload>>(`roomResponses/${roomCode}`),
        safeGet<Record<string, QuizPlayer>>(`rooms/${roomCode}/players`),
      ]);
      const responses = respRaw || {};
      const players = playersRaw || currentRoom.players || {};

      const updatedPlayers: Record<string, QuizPlayer> = {};
      const teamScores: Partial<Record<TeamId, TeamScoreData>> = { ...(currentRoom.teamScores || {}) };
      const drawDurationMs = antState.currentRound.drawDurationMs || 28000;
      const drawCompletionMs = antState.currentRound.drawCompletionMs || 11000;

      // Find fastest solver for first-solver bonus & spiral board dice roll
      let fastestCorrect: { player: QuizPlayer; timeMs: number } | null = null;
      let totalAttempts = 0;
      let incorrectCount = 0;

      Object.entries(players).forEach(([pId, p]) => {
        const resp = responses[pId];
        let score = p.score || 0;
        let streak = p.currentStreak || 0;
        let maxStreak = p.maxStreak || 0;
        let correctCount = p.correctCount || 0;
        let totalAnswered = p.totalAnswered || 0;
        let fastestTime = p.fastestTimeMs || 999999;
        let pointsEarned = 0;
        const answers = { ...(p.answers || {}) };
        const isCorrect = Boolean(resp && resp.isCorrect);

        if (resp) {
          totalAttempts++;
          totalAnswered++;
          const safeTime = Math.max(200, Math.min(drawDurationMs * 3, resp.timeTakenMs || drawCompletionMs));
          if (isCorrect) {
            if (!fastestCorrect || safeTime < fastestCorrect.timeMs) {
              fastestCorrect = { player: p, timeMs: safeTime };
            }
            correctCount++;
            streak++;
            maxStreak = Math.max(maxStreak, streak);
            fastestTime = Math.min(fastestTime, safeTime);
          } else {
            streak = 0;
            incorrectCount++;
          }
          answers[roundIdx] = {
            questionIndex: roundIdx,
            optionId: resp.optionId || resp.guessText || '',
            isCorrect,
            timeTakenMs: safeTime,
            pointsEarned: 0,
            incorrectAttempts: resp.incorrectAttempts || (isCorrect ? 0 : 1),
          };
        } else {
          streak = 0;
          totalAnswered++;
          incorrectCount++;
          answers[roundIdx] = {
            questionIndex: roundIdx,
            optionId: '',
            isCorrect: false,
            timeTakenMs: drawCompletionMs,
            pointsEarned: 0,
          };
        }

        updatedPlayers[pId] = {
          ...p,
          score,
          currentStreak: streak,
          maxStreak,
          correctCount,
          totalAnswered,
          fastestTimeMs: fastestTime,
          answers,
        };
      });

      // Award points cleanly after finding fastest solver
      Object.entries(updatedPlayers).forEach(([pId, p]) => {
        const ans = p.answers?.[roundIdx];
        if (ans?.isCorrect) {
          const isFirst = fastestCorrect?.player.id === pId;
          const pts = calculateRoundPoints(ans.timeTakenMs, drawCompletionMs, p.currentStreak, isFirst);
          ans.pointsEarned = pts;
          p.score += pts;
          p.lastAnswer = {
            optionId: ans.optionId,
            isCorrect: true,
            pointsEarned: pts,
            timeTakenMs: ans.timeTakenMs,
          };
          if (p.teamId && teamScores[p.teamId]) {
            teamScores[p.teamId]!.score += pts;
            teamScores[p.teamId]!.correctCount += 1;
          }
        }
      });

      if (currentRoom.mode === 'TEAM') {
        Object.keys(teamScores).forEach((tKey) => {
          const tId = tKey as TeamId;
          const members = Object.values(updatedPlayers).filter((m) => m.teamId === tId);
          if (teamScores[tId]) {
            teamScores[tId]!.memberCount = members.length;
            teamScores[tId]!.averageScore =
              members.length > 0
                ? Math.round(members.reduce((sum, m) => sum + m.score, 0) / members.length)
                : 0;
            const mvp = [...members].sort((a, b) => b.score - a.score)[0];
            if (mvp) {
              teamScores[tId]!.mvpPlayerId = mvp.id;
              teamScores[tId]!.mvpNickname = mvp.nickname;
              teamScores[tId]!.mvpScore = mvp.score;
            }
          }
        });
      }

      // Advance Spiral Board Token for fastest solver (or team token!)
      const nextTokens = { ...(antState.tokens || {}) };
      let diceEvent: AnticipationDiceEvent | null = null;
      let nextFeatureDots = false;

      if (antState.loopMode === 'SPIRAL_BOARD' && fastestCorrect) {
        const fc = fastestCorrect as { player: QuizPlayer; timeMs: number };
        const targetTokenKey =
          currentRoom.mode === 'TEAM' && fc.player.teamId && nextTokens[fc.player.teamId]
            ? fc.player.teamId
            : getPieceForTeamId(fc.player.teamId, fc.player.attendanceNumber || 0);
        const token = nextTokens[targetTokenKey] || Object.values(nextTokens)[0];
        if (token) {
          const steps = computeDiceSteps(fc.timeMs, drawCompletionMs);
          const adv = advanceSpiralSpace(token.spaceIndex, steps);
          const updatedCollected = [...(token.collectedPieces || [])];
          if (adv.puzzlePiece && !updatedCollected.includes(adv.puzzlePiece)) {
            updatedCollected.push(adv.puzzlePiece);
          }
          nextTokens[token.id] = {
            ...token,
            spaceIndex: adv.nextSpace,
            collectedPieces: updatedCollected,
            score: token.score + 1,
          };
          diceEvent = {
            roundIndex: roundIdx,
            rollerId: fc.player.id,
            rollerName: fc.player.nickname,
            pieceId: token.pieceId,
            steps,
            fromSpace: token.spaceIndex,
            toSpace: adv.nextSpace,
            hitWarp: adv.hitWarp,
            hitPuzzle: adv.hitPuzzle,
            hitFeatureDots: adv.hitFeatureDots,
            reachedGoal: adv.reachedGoal,
            timestamp: getServerTime(),
          };
          nextFeatureDots = adv.hitFeatureDots;
        }
      }

      // Trouble word tracking
      const troubleWords = { ...(currentRoom.troubleWords || {}) };
      if (totalAttempts > 0 && incorrectCount / totalAttempts >= 0.5) {
        troubleWords[hostRound.targetWord.id] = {
          english: hostRound.targetWord.english,
          ja: hostRound.targetWord.ja_kanji || hostRound.targetWord.ja_hiragana || hostRound.targetWord.english,
          image: hostRound.publicRound.imageUrl,
          sound: hostRound.targetWord.sound_file || hostRound.targetWord.primary_audio,
          incorrectCount,
          totalCount: totalAttempts,
        };
      }

      const revealedRound = {
        ...antState.currentRound,
        phase: 'ROUND_REVEAL' as const,
        solvedCount: Object.values(responses).filter((r) => r.isCorrect).length,
        firstSolverId: (fastestCorrect as { player: QuizPlayer; timeMs: number } | null)?.player.id,
        firstSolverName: (fastestCorrect as { player: QuizPlayer; timeMs: number } | null)?.player.nickname,
        revealedCard: {
          english: hostRound.targetWord.english,
          ja_kanji: hostRound.targetWord.ja_kanji || hostRound.targetWord.ja_hiragana || '',
          ja_hiragana: hostRound.targetWord.ja_hiragana,
          en_katakana: hostRound.targetWord.en_katakana,
          ruby: hostRound.targetWord.ruby,
          soundFile: hostRound.targetWord.sound_file || hostRound.targetWord.primary_audio,
          imageUrl: hostRound.publicRound.imageUrl,
          correctOptionId: hostRound.correctOptionId,
        },
      };

      await safeUpdate(`rooms/${roomCode}`, {
        players: updatedPlayers,
        teamScores,
        troubleWords,
        'anticipationState/phase': 'ROUND_REVEAL',
        'anticipationState/currentRound': revealedRound,
        'anticipationState/tokens': nextTokens,
        'anticipationState/lastDiceEvent': diceEvent,
        'anticipationState/triggerNextFeatureDots': nextFeatureDots,
      });
    } finally {
      isRevealingRef.current = false;
    }
  }, [roomCode]);

  const endGame = useCallback(async () => {
    if (!roomCode) return;
    soundEffects.playFanfare();
    botTimersRef.current.forEach(clearTimeout);
    botTimersRef.current = [];
    await ensureAnonymousAuth();

    const snap = await safeGet<QuizRoomState>(`rooms/${roomCode}`);
    const mirrorQ = buildMirrorQuizQuestions(roundsRef.current);
    const troubleWordIds = Object.keys(snap?.troubleWords || {});
    let awards: ClassroomAward[] = [];
    let sessionAnalytics: any = undefined;

    if (snap) {
      awards = calculateClassroomAwards(
        snap.players || {},
        mirrorQ,
        snap.awardToggles || { effortGrowth: true, skillChallenge: true, funSurprise: true },
        troubleWordIds
      );
      try {
        const durSec = snap.raceStartTime ? Math.round((getServerTime() - snap.raceStartTime) / 1000) : 180;
        sessionAnalytics = computeSessionAnalytics(snap, mirrorQ, durSec);
        await persistSessionAnalytics(sessionAnalytics);
      } catch {}

      if (snap.schoolId && snap.classId && !snap.isStudentHost && !snap.isTestGame) {
        const totalPoints = Object.values(snap.players || {}).reduce((sum, p) => sum + (p.score || 0), 0);
        depositClassEnergy(snap.schoolId, snap.classId, totalPoints, roomCode).catch(() => {});
        clearClassRoomPointers(snap.schoolId, snap.classId, roomCode).catch(() => {});
      }
    }

    await safeUpdate(`rooms/${roomCode}`, {
      status: 'GAME_OVER',
      awardedBadges: awards,
      ...(sessionAnalytics ? { analytics: sessionAnalytics } : {}),
      'anticipationState/phase': 'FINISHED',
    });
  }, [roomCode]);

  const resetRoomForNewRound = useCallback(
    async (newSettings: AnticipationSettings, newRounds: AnticipationHostRound[]): Promise<boolean> => {
      if (!roomCode) return false;
      try {
        await ensureAnonymousAuth();
        roundsRef.current = newRounds;
        settingsRef.current = newSettings;
        const cur = roomRef.current;
        const existingPlayers = cur?.players || {};
        const resetPlayers: Record<string, QuizPlayer> = {};
        Object.entries(existingPlayers).forEach(([id, p]) => {
          resetPlayers[id] = {
            ...p,
            score: 0,
            currentStreak: 0,
            maxStreak: 0,
            correctCount: 0,
            totalAnswered: 0,
            fastestTimeMs: 999999,
            answers: {},
            lastAnswer: undefined,
          };
        });

        const teamCount = Math.min(4, Math.max(2, newSettings.teamCount || 4));
        const activeTeams =
          teamCount === 2 ? (['team_red', 'team_white'] as TeamId[]) : RAINBOW_TEAM_ORDER.slice(0, teamCount);

        const nextState: AnticipationRoomState = {
          phase: 'ACTIVE',
          loopMode: newSettings.loopMode,
          drawStyle: newSettings.drawStyle,
          canvasStyle: newSettings.canvasStyle || 'NES_RETRO',
          timerMode: newSettings.timerMode || 'NO_CUTOFF',
          drawCompletionSeconds: newSettings.drawCompletionSeconds || 11,
          inputMode: newSettings.inputMode,
          englishReadingAid: newSettings.englishReadingAid,
          roundIndex: 0,
          totalRounds: newRounds.length,
          drawDurationSeconds: newSettings.drawDurationSeconds,
          currentRound: null,
          tokens: buildInitialTokens(newSettings, activeTeams),
          lastDiceEvent: null,
          triggerNextFeatureDots: false,
        };

        await safeRemove(`roomResponses/${roomCode}`).catch(() => {});
        await safeUpdate(`rooms/${roomCode}`, {
          status: 'LOBBY',
          currentQuestionIndex: 0,
          totalQuestions: newRounds.length,
          players: resetPlayers,
          responses: null,
          troubleWords: {},
          awardedBadges: null,
          questions: buildMirrorQuizQuestions(newRounds),
          anticipationState: nextState,
          updatedAt: getServerTime(),
        });
        return true;
      } catch {
        return false;
      }
    },
    [roomCode]
  );

  const closeRoom = useCallback(async () => {
    if (!roomCode) return;
    botTimersRef.current.forEach(clearTimeout);
    botTimersRef.current = [];
    try {
      await ensureAnonymousAuth();
      const cur = roomRef.current;
      safeRemove(`roomResponses/${roomCode}`).catch(() => {});
      safeRemove(`roomPlayers/${roomCode}`).catch(() => {});
      if (cur?.schoolId && cur?.classId && !cur?.isStudentHost) {
        await clearClassRoomPointers(cur.schoolId, cur.classId, roomCode).catch(() => {});
      }
      await safeUpdate(`rooms/${roomCode}`, { status: 'CLOSED', updatedAt: getServerTime() });
      const codeToRemove = roomCode;
      setTimeout(() => {
        safeRemove(`rooms/${codeToRemove}`).catch(() => {});
      }, 2200);
      setRoom(null);
      setRoomCode(null);
    } catch {}
  }, [roomCode]);

  const kickPlayer = useCallback(
    async (playerId: string) => {
      if (!roomCode) return;
      await ensureAnonymousAuth();
      await safeRemove(`rooms/${roomCode}/players/${playerId}`);
    },
    [roomCode]
  );

  const changePlayerTeam = useCallback(
    async (playerId: string, newTeamId: TeamId) => {
      if (!roomCode) return;
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${roomCode}/players/${playerId}`, { teamId: newTeamId });
    },
    [roomCode]
  );

  const toggleEyesUp = useCallback(
    async (forced?: boolean) => {
      if (!roomCode) return;
      await ensureAnonymousAuth();
      const next = forced !== undefined ? forced : !roomRef.current?.eyesUp;
      await safeUpdate(`rooms/${roomCode}`, { eyesUp: next });
    },
    [roomCode]
  );

  const addBots = useCallback(
    async (count: number, difficulty: BotDifficulty | 'mixed' = 'normal') => {
      if (!roomCode) return;
      await ensureAnonymousAuth();
      const curPlayers = roomRef.current?.players || {};
      const existingBotCount = Object.keys(curPlayers).filter((k) => k.startsWith('bot_')).length;
      const toAdd = Math.min(count, Math.max(0, 12 - existingBotCount));
      if (toAdd <= 0) return;

      const activeTeams = roomRef.current?.activeTeams || RAINBOW_TEAM_ORDER.slice(0, 4);
      const diffCycle: BotDifficulty[] = ['fast', 'normal', 'chill'];
      const updates: Record<string, QuizPlayer> = {};

      for (let i = 0; i < toAdd; i++) {
        const idx = existingBotCount + i;
        const botId = `bot_${Date.now()}_${idx + 1}`;
        updates[`players/${botId}`] = {
          id: botId,
          nickname: ANTICIPATION_BOT_NAMES[idx % ANTICIPATION_BOT_NAMES.length],
          avatar: PIECE_PRESETS[PIECE_ORDER[idx % PIECE_ORDER.length]].emoji,
          score: 0,
          currentStreak: 0,
          maxStreak: 0,
          correctCount: 0,
          totalAnswered: 0,
          fastestTimeMs: 999999,
          joinedAt: Date.now() + i * 25,
          answers: {},
          teamId: roomRef.current?.mode === 'TEAM' ? activeTeams[idx % activeTeams.length] : undefined,
          botDifficulty: difficulty === 'mixed' ? diffCycle[i % diffCycle.length] : difficulty,
        };
      }
      await safeUpdate(`rooms/${roomCode}`, updates);
    },
    [roomCode]
  );

  const clearBots = useCallback(async () => {
    if (!roomCode) return;
    await ensureAnonymousAuth();
    const curPlayers = roomRef.current?.players || {};
    const updates: Record<string, null> = {};
    Object.keys(curPlayers).forEach((k) => {
      if (k.startsWith('bot_')) updates[`players/${k}`] = null;
    });
    if (Object.keys(updates).length > 0) {
      await safeUpdate(`rooms/${roomCode}`, updates);
    }
  }, [roomCode]);

  const botCount = Object.keys(room?.players || {}).filter((id) => id.startsWith('bot_')).length;

  return {
    roomCode,
    room,
    loading,
    error,
    botCount,
    createRoom,
    startGame,
    startRound,
    revealRound,
    endGame,
    resetRoomForNewRound,
    closeRoom,
    kickPlayer,
    changePlayerTeam,
    toggleEyesUp,
    addBots,
    clearBots,
  };
}
