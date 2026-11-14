import { useEffect, useRef, useCallback } from 'react';
import { QuizRoomState, QuizQuestion, QuizPlayer, TeamId, RAINBOW_TEAM_ORDER } from '../types';
import { advanceTamaireThrowStep, TamaireThrowActionStep } from '../core/quizEngine';
import { KART_THEME_LIST } from '@/games/suzuka_grand_prix/kartPresets';
import { SUZUKA_CIRCUIT_LENGTH_METERS } from '@/games/suzuka_grand_prix/engine/Suzuka3DEngine';
import { ensureAnonymousAuth } from '@/services/firebase';
import { safeSet, safeUpdate, safeTransaction, getServerTime } from '@/services/rtdbSafe';

const BOT_NAMES = [
  'Kenji 🏎️', 'Yuki ⭐', 'Hana 🌸', 'Daiki ⚡', 'Sora 🚀',
  'Ren 🦁', 'Aoi 🌊', 'Yuto 🎯', 'Mei 🍀', 'Kaito 🏎️',
  'Riku 🐺', 'Sakura 🌸', 'Haruto 🔥', 'Yuna 💫', 'Takumi 🏎️',
  'Hinata ☀️', 'Akari ✨', 'Shota ⚡', 'Koharu 🌼', 'Ryusei 🌠',
  'Ema 🎀', 'Hayato 🌪️', 'Mio 🎵', 'Sosuke 🛡️', 'Asahi 🌅',
  'Minato ⚓', 'Nanami 🐬', 'Sota ⚽', 'Rin 🔔', 'Taiga 🐯',
  'Hina 🐥', 'Kota 🚀', 'Rio 🌺', 'Koki 🏀', 'Yui 🎀',
  'Itsuki 🌲', 'Ayaka 🌷', 'Yamato 🏹', 'Sara 🌈', 'Haruki 🎈',
  'Tsubasa 🕊️', 'Misaki 🍓', 'Kanata 🌠', 'Shion 🌌', 'Kanon 🎶'
];

export type BotDifficulty = 'chill' | 'normal' | 'fast';

interface UseQuizBotSimulatorOptions {
  roomCode: string | null;
  room: QuizRoomState | null;
  questions: QuizQuestion[];
  isHost: boolean;
}

interface BotSprintState {
  progress: number;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  totalAnswered: number;
  isFinished: boolean;
  speedKmh: number;
  distanceMeters: number;
  lastTickMs: number;
  tamaireStep: TamaireThrowActionStep;
}

export function useQuizBotSimulator({
  roomCode,
  room,
  questions,
  isHost
}: UseQuizBotSimulatorOptions) {
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const lastProcessedQIndexRef = useRef<number>(-1);
  const activeArcadeSessionKeyRef = useRef<string>('');
  const sprintIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const sprintStateMapRef = useRef<Map<string, BotSprintState>>(new Map());
  const roomRef = useRef<QuizRoomState | null>(room);
  roomRef.current = room;

  // Clean all timers
  const clearAllTimers = useCallback(() => {
    activeTimersRef.current.forEach(t => clearTimeout(t));
    activeTimersRef.current = [];
    sprintIntervalsRef.current.forEach(t => clearInterval(t));
    sprintIntervalsRef.current.clear();
    sprintStateMapRef.current.clear();
    activeArcadeSessionKeyRef.current = '';
  }, []);

  // 1. Add Bots to Room (Capped at 30 bots max)
  const addBots = useCallback(async (count: number, difficulty: BotDifficulty | 'mixed' = 'normal') => {
    if (!roomCode || !isHost) return;

    const currentPlayers = roomRef.current?.players || {};
    const existingBotCount = Object.keys(currentPlayers).filter(id => id.startsWith('bot_')).length;

    // Enforce 30 max bots in a room
    const maxAllowed = Math.max(0, 30 - existingBotCount);
    const countToAdd = Math.min(count, maxAllowed);
    if (countToAdd <= 0) return;

    const updates: Record<string, QuizPlayer> = {};
    const isTug = roomRef.current?.gamePlayType === 'TUG_OF_WAR';
    const isVolleyball = roomRef.current?.gamePlayType === 'VOLLEYBALL';
    const isVolleyballVs = isVolleyball && (!roomRef.current?.volleyballSettings || roomRef.current.volleyballSettings.gameStyle === 'TEAM_VS');
    const isTwoTeam = isTug || isVolleyballVs;
    const activeTeams: TeamId[] = isTwoTeam
      ? ['team_red', 'team_white']
      : (roomRef.current?.activeTeams || RAINBOW_TEAM_ORDER.slice(0, roomRef.current?.teamCount || 2));

    const mixedSequence: BotDifficulty[] = ['chill', 'chill', 'normal', 'normal', 'fast', 'fast'];
    const serverNow = getServerTime();

    for (let i = 0; i < countToAdd; i++) {
      const botIndex = existingBotCount + i;
      const botId = `bot_${serverNow}_${botIndex + 1}`;
      const botName = BOT_NAMES[botIndex % BOT_NAMES.length] || `Bot ${botIndex + 1}`;
      const assignedTeam = roomRef.current?.mode === 'TEAM' 
        ? activeTeams[botIndex % activeTeams.length] 
        : undefined;
      const assignedKartTheme = KART_THEME_LIST[botIndex % KART_THEME_LIST.length].id;
      const assignedDiff: BotDifficulty = difficulty === 'mixed'
        ? mixedSequence[i % mixedSequence.length]
        : difficulty;

      const botPlayer: QuizPlayer = {
        id: botId,
        nickname: botName,
        score: 0,
        currentStreak: 0,
        maxStreak: 0,
        correctCount: 0,
        totalAnswered: 0,
        fastestTimeMs: 999999,
        joinedAt: serverNow + i * 50,
        answers: {},
        sprintProgress: 0,
        speedKmh: 0,
        distanceMeters: 0,
        isFinished: false,
        teamId: assignedTeam,
        kartTheme: assignedKartTheme,
        botDifficulty: assignedDiff,
      };

      updates[botId] = botPlayer;
    }

    // Write all bots to Firebase in one batch
    await ensureAnonymousAuth();
    await safeUpdate(`rooms/${roomCode}/players`, updates);

    // If Team mode, update team score member counts
    if (roomRef.current?.mode === 'TEAM') {
      const updatedTotalPlayers = { ...currentPlayers, ...updates };
      const teamScores = { ...(roomRef.current?.teamScores || {}) };

      activeTeams.forEach(tId => {
        if (!teamScores[tId]) return;
        const members = Object.values(updatedTotalPlayers).filter(p => p.teamId === tId);
        teamScores[tId].memberCount = members.length;
      });

      await safeUpdate(`rooms/${roomCode}/teamScores`, teamScores);
    }
  }, [roomCode, isHost]);

  // 2. Clear All Bots
  const clearBots = useCallback(async () => {
    if (!roomCode || !isHost) return;
    clearAllTimers();

    const currentPlayers = roomRef.current?.players || {};
    const botIds = Object.keys(currentPlayers).filter(id => id.startsWith('bot_'));

    if (botIds.length === 0) return;

    const playerRemovals: Record<string, null> = {};
    const responseRemovals: Record<string, null> = {};

    botIds.forEach(bId => {
      playerRemovals[bId] = null;
      responseRemovals[bId] = null;
    });

    await ensureAnonymousAuth();
    await safeUpdate(`rooms/${roomCode}/players`, playerRemovals);
    await safeUpdate(`roomPlayers/${roomCode}`, playerRemovals).catch(() => {});
    await safeUpdate(`roomResponses/${roomCode}`, responseRemovals).catch(() => {});
    await safeUpdate(`rooms/${roomCode}/responses`, responseRemovals).catch(() => {});

    // Recalculate team member counts after bot removal
    if (roomRef.current?.mode === 'TEAM') {
      const remainingPlayers = { ...currentPlayers };
      botIds.forEach(bId => delete remainingPlayers[bId]);
      const teamScores = { ...(roomRef.current?.teamScores || {}) };
      const isTug = roomRef.current?.gamePlayType === 'TUG_OF_WAR';
      const isVolleyball = roomRef.current?.gamePlayType === 'VOLLEYBALL';
      const isTwoTeam = isTug || (isVolleyball && (!roomRef.current?.volleyballSettings || roomRef.current.volleyballSettings.gameStyle === 'TEAM_VS'));
      const activeTeams: TeamId[] = isTwoTeam
        ? ['team_red', 'team_white']
        : (roomRef.current?.activeTeams || RAINBOW_TEAM_ORDER.slice(0, roomRef.current?.teamCount || 2));

      activeTeams.forEach(tId => {
        if (!teamScores[tId]) return;
        const members = Object.values(remainingPlayers).filter(p => p.teamId === tId);
        teamScores[tId].memberCount = members.length;
      });

      await safeUpdate(`rooms/${roomCode}/teamScores`, teamScores);
    }
  }, [roomCode, isHost, clearAllTimers]);

  // 3. Classic Quiz Automation: Simulate Bot Answers during 'QUESTION' phase
  useEffect(() => {
    if (!isHost || !roomCode || !room || room.status !== 'QUESTION') {
      lastProcessedQIndexRef.current = -1;
      activeTimersRef.current.forEach(t => clearTimeout(t));
      activeTimersRef.current = [];
      return;
    }

    const currentQIndex = room.currentQuestionIndex;
    if (currentQIndex === undefined || currentQIndex === null) return;

    // Reset timers when advancing to a new question
    if (currentQIndex !== lastProcessedQIndexRef.current) {
      activeTimersRef.current.forEach(t => clearTimeout(t));
      activeTimersRef.current = [];
      lastProcessedQIndexRef.current = currentQIndex;
    }

    // Always prefer authoritative questions array so correctOptionId is preserved
    const currentQuestion = questions[currentQIndex] || room.currentQuestion;
    if (!currentQuestion) return;

    const players = room.players || {};
    const bots = Object.values(players).filter(p => p.id.startsWith('bot_'));
    if (bots.length === 0) return;

    const existingResponses = room.responses || {};
    const timeLimitMs = currentQuestion.timeLimitMs || 10000;
    const recallDelayMs = Math.max(0, (room.recallDelaySeconds || 0) * 1000);
    
    // Resolve correct option ID
    let correctOptId = currentQuestion.correctOptionId;
    if (!correctOptId && currentQuestion.targetWordEnglish) {
      const matchingOption = currentQuestion.options?.find(
        o => o.english?.trim().toLowerCase() === currentQuestion.targetWordEnglish?.trim().toLowerCase()
      );
      if (matchingOption) correctOptId = matchingOption.id;
    }

    const allOptions = currentQuestion.options?.map(o => o.id) || [];
    const distractorIds = allOptions.filter(id => id !== correctOptId);

    bots.forEach(bot => {
      // Skip if bot already answered
      if (existingResponses[bot.id]) return;

      const botDiff = bot.botDifficulty || 'normal';
      let accuracy = 0.82;
      let rawMin = 1600;
      let rawMax = 4800;

      if (botDiff === 'chill') {
        accuracy = 0.60;
        rawMin = 3000;
        rawMax = 6200;
      } else if (botDiff === 'fast') {
        accuracy = 0.94;
        rawMin = 1100;
        rawMax = 2400;
      }

      const maxWindow = Math.max(400, timeLimitMs - 300);
      const minDelay = Math.min(maxWindow - 200, recallDelayMs + rawMin);
      const maxDelay = Math.max(minDelay + 150, Math.min(maxWindow, recallDelayMs + rawMax));
      const delay = minDelay + Math.random() * (maxDelay - minDelay);

      const timer = setTimeout(async () => {
        const freshRoom = roomRef.current;
        if (!freshRoom || freshRoom.status !== 'QUESTION' || freshRoom.currentQuestionIndex !== currentQIndex) {
          return;
        }

        // Accuracy roll based on bot difficulty
        const isCorrect = Math.random() < accuracy;
        let chosenOptionId = correctOptId || allOptions[0] || '';
        if (!isCorrect && distractorIds.length > 0) {
          chosenOptionId = distractorIds[Math.floor(Math.random() * distractorIds.length)];
        }

        const timeTakenMs = Math.round(delay);
        const responsePayload = {
          answerId: chosenOptionId,
          timeTakenMs,
          submittedAt: getServerTime()
        };

        // Submit bot response strictly to isolated roomResponses spoke node
        await ensureAnonymousAuth();
        await safeSet(`roomResponses/${roomCode}/${bot.id}`, responsePayload).catch(() => {});
      }, delay);

      activeTimersRef.current.push(timer);
    });

    return () => {
      activeTimersRef.current.forEach(t => clearTimeout(t));
      activeTimersRef.current = [];
    };
  }, [isHost, roomCode, room?.status, room?.currentQuestionIndex, room?.recallDelaySeconds, questions]);

  // ============================================================================
  // [ANTIGRAVITY REFACTOR]: Single-Tick 5 Hz Batched Spoke Bot Simulator
  // ============================================================================
  // WHAT CHANGED:
  // 1. Replaced up to 30 independent `setInterval` timers (`sprintIntervalsRef`)
  //    with a SINGLE 200ms (5 Hz) Host tick (`singleHostLoop`).
  // 2. Replaced per-bot `nextAnswerAtMs` scheduling in memory (`botState.nextAnswerDueAtMs`)
  //    so each bot still answers at its own natural difficulty cadence ('chill', 'normal', 'fast').
  // 3. Removed the O(N^2) dual-write to `rooms/${roomCode}/players/${bot.id}`.
  //    All dirty bot states in a tick are flushed in ONE multi-path write to
  //    `roomPlayers/${roomCode}` (`safeUpdate(\`roomPlayers/\${roomCode}\`, batchedSpokeUpdates)`).
  // WHY:
  // Previously, 30 bots spawned 30 intervals, each firing 2 `safeUpdate` calls
  // (~40-50 writes/sec) and writing to `rooms/${roomCode}/players/${bot.id}`,
  // which broadcast full room snapshots to all 40 connected student iPads.
  // ============================================================================
  const currentBotCount = room?.players
    ? Object.keys(room.players).filter(id => id.startsWith('bot_')).length
    : 0;
  const hasBots = currentBotCount > 0;

  useEffect(() => {
    if (
      !isHost ||
      !roomCode ||
      !room ||
      !hasBots ||
      (room.status !== 'SPRINT_RACE' &&
        room.status !== 'GRAND_PRIX_3D' &&
        room.status !== 'TUG_OF_WAR' &&
        room.status !== 'VOLLEYBALL')
    ) {
      sprintIntervalsRef.current.forEach(t => clearInterval(t));
      sprintIntervalsRef.current.clear();
      if (!room || (room.status !== 'SPRINT_RACE' && room.status !== 'GRAND_PRIX_3D' && room.status !== 'TUG_OF_WAR' && room.status !== 'VOLLEYBALL')) {
        sprintStateMapRef.current.clear();
        activeArcadeSessionKeyRef.current = '';
      }
      return;
    }

    const isTug = room.status === 'TUG_OF_WAR';
    const isVolleyball = room.status === 'VOLLEYBALL';
    const is3DRace = room.status === 'GRAND_PRIX_3D' || room.gamePlayType === 'GRAND_PRIX_3D';
    const raceStartTime = (isTug ? room.tugOfWarStartTime : isVolleyball ? room.volleyballStartTime : room.raceStartTime) || getServerTime();
    const sessionKey = `${roomCode}:${room.status}:${raceStartTime}:${room.tugOfWarRound || 0}`;
    if (activeArcadeSessionKeyRef.current !== sessionKey) {
      sprintStateMapRef.current.clear();
      activeArcadeSessionKeyRef.current = sessionKey;
    }

    const greenFlagTime = raceStartTime + (isTug || isVolleyball ? 1500 : is3DRace ? 2400 : 3600);
    const sprintSettings = room.sprintSettings;
    const isTimeTrial = sprintSettings?.sprintMode === 'TIME_TRIAL' || isTug || isVolleyball;
    const targetLaps3D = sprintSettings?.targetLaps3D || 1;
    const targetDistance3DMeters = targetLaps3D * SUZUKA_CIRCUIT_LENGTH_METERS;
    const wrongSpeedLossRatio = sprintSettings?.wrongSpeedLossRatio ?? 0.33;
    const totalQuestions = isTimeTrial 
      ? questions.length 
      : (sprintSettings?.lapCount === -1 ? questions.length : (sprintSettings?.lapCount || questions.length));

    const now = getServerTime();
    const delayUntilGreen = Math.max(0, greenFlagTime - now);

    const sampleBotIntervalMs = (botDiff: BotDifficulty) => {
      if (botDiff === 'chill') {
        return isVolleyball ? (3400 + Math.random() * 1500) : (2800 + Math.random() * 1500);
      }
      if (botDiff === 'fast') {
        return isVolleyball ? (1500 + Math.random() * 800) : (1200 + Math.random() * 700);
      }
      return isVolleyball ? (2200 + Math.random() * 1200) : (1800 + Math.random() * 1200);
    };

    const ensureBotTracked = (bot: QuizPlayer, nowMs: number) => {
      if (!sprintStateMapRef.current.has(bot.id)) {
        const botDiff = bot.botDifficulty || 'normal';
        sprintStateMapRef.current.set(bot.id, {
          progress: bot.sprintProgress || 0,
          score: bot.score || 0,
          streak: bot.currentStreak || 0,
          maxStreak: bot.maxStreak || 0,
          correctCount: bot.correctCount || 0,
          totalAnswered: bot.totalAnswered || 0,
          isFinished: isTug ? false : !!bot.isFinished,
          speedKmh: bot.speedKmh || 0,
          distanceMeters: bot.distanceMeters || 0,
          lastTickMs: nowMs,
          tamaireStep: 0,
          // [ANTIGRAVITY REFACTOR]: Per-bot next answer timestamp inside the shared 5 Hz loop
          nextAnswerDueAtMs: Math.max(nowMs, greenFlagTime) + sampleBotIntervalMs(botDiff)
        } as BotSprintState & { nextAnswerDueAtMs: number });
      }
    };

    // Initialize in-memory sprint tracker + individual cadence schedule for current bots
    Object.values(room.players || {})
      .filter(p => p.id.startsWith('bot_'))
      .forEach(bot => ensureBotTracked(bot, now));

    const startBatchedBotRaceLoop = () => {
      if (sprintIntervalsRef.current.has('__HOST_BATCH_TICK__')) return;

      // Single 200ms (5 Hz) Host simulation tick for all 30 bots combined (GEMINI.md §5)
      const singleHostLoop = setInterval(async () => {
        const freshRoom = roomRef.current;
        if (
          !freshRoom ||
          (freshRoom.status !== 'SPRINT_RACE' &&
            freshRoom.status !== 'GRAND_PRIX_3D' &&
            freshRoom.status !== 'TUG_OF_WAR' &&
            freshRoom.status !== 'VOLLEYBALL')
        ) {
          clearInterval(singleHostLoop);
          return;
        }

        if (isTug || isVolleyball) {
          const timeLimitSec = (isTug ? freshRoom.tugOfWarSettings?.timeLimitSeconds : freshRoom.volleyballSettings?.timeLimitSeconds) || 60;
          const isTimeExpired = (getServerTime() - greenFlagTime) >= (timeLimitSec * 1000);
          if (freshRoom.tugOfWarFinished || freshRoom.volleyballFinished || isTimeExpired) {
            clearInterval(singleHostLoop);
            return;
          }
        }

        const freshBots = Object.values(freshRoom.players || {}).filter(p => p.id.startsWith('bot_'));
        if (freshBots.length === 0) return;

        const nowMs = getServerTime();
        const batchedSpokeUpdates: Record<string, Partial<QuizPlayer>> = {};
        let hasDirtyBots = false;
        let allBotsFinished = true;

        for (const bot of freshBots) {
          ensureBotTracked(bot, nowMs);
          const botState = sprintStateMapRef.current.get(bot.id) as (BotSprintState & { nextAnswerDueAtMs?: number }) | undefined;
          if (!botState || botState.isFinished) continue;

          allBotsFinished = false;
          const dueAt = botState.nextAnswerDueAtMs || 0;
          if (nowMs < dueAt) continue;

          const botDiff = bot.botDifficulty || 'normal';
          const botIntervalMs = sampleBotIntervalMs(botDiff);
          botState.nextAnswerDueAtMs = nowMs + botIntervalMs;

          const dtSec = Math.max(0.2, Math.min(4.0, (nowMs - botState.lastTickMs) / 1000));
          botState.lastTickMs = nowMs;

          if (is3DRace) {
            const avgSpeed = Math.max(0, botState.speedKmh - 4 * dtSec);
            botState.distanceMeters += (avgSpeed / 3.6) * dtSec;
            botState.speedKmh = Math.max(0, botState.speedKmh - 7 * dtSec);
          }

          const sprintAccuracy = botDiff === 'chill' ? 0.65 : botDiff === 'fast' ? 0.95 : 0.85;
          const isCorrect = Math.random() < sprintAccuracy;
          if (isVolleyball) {
            const stepResult = advanceTamaireThrowStep({
              currentStep: botState.tamaireStep ?? 0,
              isCorrect,
              previousStreak: botState.streak,
              timeTakenMs: Math.round(botIntervalMs),
            });
            botState.tamaireStep = stepResult.nextStep;
            botState.streak = stepResult.newStreak;
            if (botState.streak > botState.maxStreak) {
              botState.maxStreak = botState.streak;
            }
            botState.correctCount += stepResult.bagsThrown;
            botState.score += stepResult.pointsEarned;
            if (stepResult.bagsThrown > 0) {
              botState.progress += 1;
            }
          } else if (isCorrect) {
            botState.progress += 1;
            botState.streak += 1;
            if (botState.streak > botState.maxStreak) {
              botState.maxStreak = botState.streak;
            }
            botState.correctCount += 1;
            const pointsEarned = 1000 + Math.min(botState.streak * 100, 500);
            botState.score += pointsEarned;
            if (is3DRace) {
              const boost = botState.speedKmh < 50 ? 38 : botState.speedKmh < 110 ? 28 : 20;
              botState.speedKmh = Math.min(180, botState.speedKmh + boost + Math.min(12, botState.streak * 2));
            }
          } else {
            botState.streak = 0;
            if (is3DRace) {
              const retainRatio = Math.max(0, Math.min(1, 1 - wrongSpeedLossRatio));
              botState.speedKmh = Math.round(botState.speedKmh * retainRatio);
            }
          }
          botState.totalAnswered += 1;

          const isFinished = is3DRace
            ? (!isTimeTrial && botState.distanceMeters >= targetDistance3DMeters)
            : (!isTimeTrial && botState.progress >= totalQuestions);

          if (isFinished) {
            botState.isFinished = true;
          }
          const finishTimeMs = isFinished ? Math.max(1000, nowMs - greenFlagTime) : undefined;

          batchedSpokeUpdates[bot.id] = {
            score: botState.score,
            currentStreak: botState.streak,
            maxStreak: botState.maxStreak,
            correctCount: botState.correctCount,
            totalAnswered: botState.totalAnswered,
            sprintProgress: is3DRace
              ? Math.round((botState.distanceMeters / SUZUKA_CIRCUIT_LENGTH_METERS) * 100) / 100
              : botState.progress,
            speedKmh: is3DRace ? Math.round(botState.speedKmh) : undefined,
            distanceMeters: is3DRace ? Math.round(botState.distanceMeters * 10) / 10 : undefined,
            isFinished: botState.isFinished,
            finishTimeMs
          };
          hasDirtyBots = true;
        }

        if (hasDirtyBots) {
          // [ANTIGRAVITY REFACTOR]: Single batched spoke write at <= 5 Hz!
          // Removed `safeUpdate(\`rooms/\${roomCode}/players/\${bot.id}\`, ...)` to prevent
          // O(N^2) room-snapshot fan-out to all 40 student iPads during active races.
          await ensureAnonymousAuth();
          await safeUpdate(`roomPlayers/${roomCode}`, batchedSpokeUpdates).catch(() => {});
        }

        if (allBotsFinished) {
          clearInterval(singleHostLoop);
        }
      }, 200); // 5 Hz Host batch loop

      sprintIntervalsRef.current.set('__HOST_BATCH_TICK__', singleHostLoop);
    };

    const startTimer = setTimeout(startBatchedBotRaceLoop, delayUntilGreen);

    return () => {
      clearTimeout(startTimer);
      sprintIntervalsRef.current.forEach(t => clearInterval(t));
      sprintIntervalsRef.current.clear();
    };
  }, [isHost, roomCode, hasBots, room?.status, room?.raceStartTime, room?.tugOfWarStartTime, room?.volleyballStartTime, room?.tugOfWarRound, questions.length]);

  // Clean up when room closes or unmounts
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    addBots,
    clearBots,
    botCount: currentBotCount
  };
}
