import { useState, useEffect, useRef, useCallback } from 'react';
import { ensureAnonymousAuth } from '@/services/firebase';
import {
  safeSet,
  safeUpdate,
  safeGet,
  safeRemove,
  safeSubscribe,
  safeTransaction,
  safeConfigureOnDisconnectUpdate,
  getServerTime,
  initServerTimeSync
} from '@/services/rtdbSafe';
import { sweepStaleRooms, clearClassRoomPointers } from '@/services/roomSweeper';
import { 
  GameMode,
  QuizRoomState, 
  QuizQuestion, 
  QuizPlayer, 
  QuizResponse, 
  QuizHostSettings, 
  TeamId, 
  TEAM_PRESETS,
  RAINBOW_TEAM_ORDER,
  PodiumFinisher,
  SprintCumulativeStats
} from './types';
import { soundEffects } from '@/services/soundEffects';
import { SessionAnalytics } from '@/types/analytics';
import { computeSessionAnalytics, persistSessionAnalytics } from '@/services/analyticsEngine';
import { getSavedStudentProfile } from '@/services/studentProfile';
import { getSavedKartTheme } from '@/games/suzuka_grand_prix/kartPresets';
import { depositClassEnergy } from '@/services/classVault';
// ============================================================================
// [ANTIGRAVITY REFACTOR]: Import Pure Engine Throttler & Aggregators
// ============================================================================
import {
  createRtdbWriteThrottler,
  computeTroubleWordsMap,
  reconcileTeamScores,
  ThrottlerController
} from './core/quizEngine';

interface UseQuizRoomReturn {
  room: QuizRoomState | null;
  loading: boolean;
  error: string | null;
  // Host functions
  createRoom: (code: string, grade: string, unit: string, settings: QuizHostSettings, questions: QuizQuestion[]) => Promise<boolean>;
  startGame: () => Promise<void>;
  nextQuestion: (index: number) => Promise<void>;
  revealAnswer: () => Promise<void>;
  showLeaderboard: () => Promise<void>;
  endGame: (awards?: any[]) => Promise<void>;
  startSprintRace: () => Promise<void>;
  triggerSprintGraceCountdown: () => Promise<void>;
  endSprintRace: (podium: PodiumFinisher[], awards?: any[]) => Promise<void>;
  startTugOfWar: () => Promise<void>;
  nextTugOfWarRound: (newWins: { team_red: number; team_white: number }, nextRoundNumber: number, baselinePulls: Record<string, number>) => Promise<void>;
  freezeTugOfWar: () => Promise<void>;
  endTugOfWar: (awards?: any[]) => Promise<void>;
  startVolleyball: () => Promise<void>;
  freezeVolleyball: () => Promise<void>;
  endVolleyball: (awards?: any[]) => Promise<void>;
  closeRoom: () => Promise<void>;
  kickPlayer: (playerId: string) => Promise<void>;
  changePlayerTeam: (playerId: string, newTeamId: TeamId) => Promise<void>;
  toggleEyesUp: (forcedState?: boolean) => Promise<void>;
  resetRoomForNewRound: (newQuestions: QuizQuestion[], keepSettings?: boolean, updatedSettings?: Partial<QuizHostSettings>) => Promise<boolean>;
  // Student functions
  joinRoom: (code: string, nickname: string, teamId?: TeamId, attendanceNumber?: number) => Promise<{ success: boolean; playerId?: string; error?: string }>;
  updateKartTheme: (themeId: string) => Promise<void>;
  updatePlayerProfile: (updates: {
    nickname?: string;
    avatar?: string;
    frame?: string;
    title?: string;
    callsign?: string;
    greeting?: string;
  }) => Promise<void>;
  submitAnswer: (playerId: string, optionId: string, clientTimeTakenMs?: number) => Promise<void>;
  submitSprintAnswer: (
    playerId: string,
    questionIndex: number,
    optionId: string,
    isCorrect: boolean,
    timeTakenMs: number,
    pointsEarned: number,
    newSprintProgress: number,
    isFinished?: boolean,
    finishTimeMs?: number,
    cumulativeStats?: SprintCumulativeStats,
    incorrectAttempts?: number
  ) => Promise<void>;
  leaveRoom: (playerId: string) => Promise<void>;
  claimRoomAttendanceNumber: (code: string, attendanceNumber: number, playerId: string, nickname: string, score: number) => Promise<boolean>;
  releaseRoomAttendanceNumber: (code: string, attendanceNumber: number) => Promise<void>;
}

export interface PinGenerationOptions {
  isStudentHost?: boolean;
  isTestGame?: boolean;
  grade?: string;
  classId?: string;
}

export async function generateUniqueRoomPin(options?: PinGenerationOptions): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    let pin: string;

    if (options?.isTestGame || options?.classId === 'TEST' || options?.classId === 'test') {
      // Test games: First digit is strictly 9 (9000 - 9999)
      const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      pin = `9${suffix}`;
    } else if (options?.isStudentHost) {
      // Student created games: First digit is strictly 7 (7000 - 7999)
      const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      pin = `7${suffix}`;
    } else if (options?.classId && /^\d+-\d+$/.test(options.classId)) {
      // Teacher game with specific class: e.g. '5-1' -> prefix '51', '6-4' -> prefix '64'
      const parts = options.classId.split('-');
      const prefix = `${parts[0]}${parts[1]}`;
      const suffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      pin = `${prefix}${suffix}`;
    } else if (options?.grade && /^ES_G(\d+)$/.test(options.grade)) {
      // Teacher game with grade only: e.g. 'ES_G5' -> prefix '5'
      const gradeDigit = options.grade.replace('ES_G', '');
      const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      pin = `${gradeDigit}${suffix}`;
    } else {
      // General elementary teacher game: 1000 - 6999 (grades 1 to 6)
      pin = Math.floor(1000 + Math.random() * 6000).toString();
    }

    try {
      const existingStatus = await safeGet<string>(`rooms/${pin}/status`);
      if (!existingStatus || existingStatus === 'CLOSED') {
        return pin;
      }
    } catch {
      return pin;
    }
  }
  return options?.isTestGame
    ? `9${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    : options?.isStudentHost
    ? `7${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    : Math.floor(1000 + Math.random() * 6000).toString();
}

function mergeLivePlayers(
  basePlayers: Record<string, QuizPlayer> | undefined,
  livePlayers: Record<string, Partial<QuizPlayer>>,
  onlyMergeAnswersForPlayerId?: string
): Record<string, QuizPlayer> {
  const merged: Record<string, QuizPlayer> = { ...(basePlayers || {}) };
  Object.entries(livePlayers).forEach(([pId, liveData]) => {
    if (merged[pId] && liveData) {
      if (onlyMergeAnswersForPlayerId && pId !== onlyMergeAnswersForPlayerId) {
        const { answers: _omitAnswers, lastAnswer: _omitLast, ...telemetryOnly } = liveData;
        merged[pId] = {
          ...merged[pId],
          ...telemetryOnly
        };
      } else {
        merged[pId] = {
          ...merged[pId],
          ...liveData,
          answers: {
            ...(merged[pId].answers || {}),
            ...(liveData.answers || {})
          }
        };
      }
    }
  });
  return merged;
}

function sanitizeQuestionsForPublicRoom(
  questions: QuizQuestion[],
  gamePlayType?: QuizHostSettings['gamePlayType']
): QuizQuestion[] {
  // Only Kahoot hides answers from student devices; Sprint, 3D Grand Prix, Tug of War, and Volleyball grade locally for 0ms responsiveness.
  if ((gamePlayType || 'KAHOOT') !== 'KAHOOT') {
    return questions;
  }
  return questions.map(({ correctOptionId: _correct, distractorOptionIds: _distractors, ...rest }) => rest);
}

export function useQuizRoom(
  initialRoomCode?: string,
  options?: { isHost?: boolean; isStudent?: boolean; playerId?: string }
): UseQuizRoomReturn {
  const [roomCode, setRoomCode] = useState<string | null>(initialRoomCode || null);
  const [room, setRoom] = useState<QuizRoomState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const questionsRef = useRef<QuizQuestion[]>([]);
  const settingsRef = useRef<QuizHostSettings | null>(null);
  const isRevealingRef = useRef<boolean>(false);
  const roomRef = useRef<QuizRoomState | null>(null);
  roomRef.current = room;

  // Automatic Screen Wake Lock & Folio Wake Server-Time Re-Sync across 40 Student iPads
  useEffect(() => {
    if (!roomCode || room?.status === 'CLOSED') return;

    let wakeLockSentinel: any = null;
    let isMounted = true;

    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          if (isMounted) {
            wakeLockSentinel = sentinel;
          } else {
            sentinel.release().catch(() => {});
          }
        } catch {
          // Safely ignore if low-power mode or browser policy declines Wake Lock
        }
      }
    };

    void requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        initServerTimeSync();
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
      }
    };
  }, [roomCode, room?.status]);
  const livePlayersRef = useRef<Record<string, Partial<QuizPlayer>>>({});
  const latestResponsesRef = useRef<Record<string, QuizResponse>>({});
  // [ANTIGRAVITY REFACTOR]: Refs for managed cleanup timers & 8 Hz spoke write throttlers
  const closeRoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentSpokeThrottlersRef = useRef<Map<string, ThrottlerController<Record<string, any>>>>(new Map());

  // Sync roomCode state if initialRoomCode changes from parent
  useEffect(() => {
    if (initialRoomCode && initialRoomCode !== roomCode) {
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode, roomCode]);

  // ==========================================================================
  // [ANTIGRAVITY REFACTOR #1]: Decoupled Hub & Spoke RTDB Subscription Effects
  // ==========================================================================
  // WHAT CHANGED:
  // 1. Removed `room?.gamePlayType` from the dependency array of the primary
  //    `rooms/${roomCode}` + Host `roomResponses`/`roomPlayers` useEffect.
  // 2. Extracted the Student `roomPlayers` spoke subscription into a separate
  //    `useEffect` keyed on the boolean primitive `is3DGrandPrix`.
  // WHY:
  // Previously, `[roomCode, options?.isStudent, options?.playerId, room?.gamePlayType]`
  // caused all 3 Firebase listeners (`rooms/{code}`, `roomResponses/{code}`,
  // `roomPlayers/{code}`) to detach (`off()`) and re-subscribe mid-handshake
  // the moment `room` hydrated from `null` to `{ gamePlayType: 'SPRINT_RACE' }`.
  // ==========================================================================
  const is3DGrandPrix =
    room?.gamePlayType === 'GRAND_PRIX_3D' || room?.status === 'GRAND_PRIX_3D';

  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      livePlayersRef.current = {};
      latestResponsesRef.current = {};
      return;
    }

    let responsesThrottleTimer: ReturnType<typeof setTimeout> | null = null;
    let livePlayersThrottleTimer: ReturnType<typeof setTimeout> | null = null;

    const roomPath = `rooms/${roomCode}`;
    const unsubscribe = safeSubscribe<QuizRoomState>(
      roomPath,
      (data) => {
        if (data) {
          if (data.status === 'LOBBY' || data.status === 'GAME_OVER') {
            livePlayersRef.current = {};
          }
          const isLiveRaceStatus =
            data.status === 'SPRINT_RACE' ||
            data.status === 'GRAND_PRIX_3D' ||
            data.status === 'TUG_OF_WAR' ||
            data.status === 'VOLLEYBALL';

          setRoom(prev => ({
            ...data,
            players: isLiveRaceStatus
              ? mergeLivePlayers(data.players, livePlayersRef.current)
              : (data.players || {}),
            responses: (data.status === 'QUESTION' && data.currentQuestionIndex !== prev?.currentQuestionIndex)
              ? {}
              : (data.responses !== undefined && data.responses !== null)
              ? data.responses
              : (prev?.responses || {})
          }));
        } else {
          setRoom(null);
        }
      },
      (err) => {
        console.error("Firebase room subscription error:", err);
        setError("Failed to sync room state: " + err.message);
      }
    );

    // Host (Hub) listens to isolated responses & live player progress nodes (throttled to 10Hz / 100ms)
    let unsubscribeResponses: (() => void) | null = null;
    let unsubscribeHostLivePlayers: (() => void) | null = null;

    if (!options?.isStudent) {
      unsubscribeResponses = safeSubscribe<Record<string, QuizResponse>>(
        `roomResponses/${roomCode}`,
        (responsesData) => {
          const nextResponses = responsesData ? { ...responsesData } : {};
          latestResponsesRef.current = nextResponses;

          if (!responsesData || Object.keys(nextResponses).length === 0) {
            if (responsesThrottleTimer) {
              clearTimeout(responsesThrottleTimer);
              responsesThrottleTimer = null;
            }
            setRoom(prev => (prev ? { ...prev, responses: {} } : null));
            return;
          }

          if (!responsesThrottleTimer) {
            responsesThrottleTimer = setTimeout(() => {
              responsesThrottleTimer = null;
              setRoom(prev => (prev ? { ...prev, responses: { ...latestResponsesRef.current } } : null));
            }, 100);
          }
        }
      );

      unsubscribeHostLivePlayers = safeSubscribe<Record<string, Partial<QuizPlayer>>>(
        `roomPlayers/${roomCode}`,
        (livePlayersData) => {
          livePlayersRef.current = livePlayersData ? { ...livePlayersData } : {};
          if (!livePlayersThrottleTimer) {
            livePlayersThrottleTimer = setTimeout(() => {
              livePlayersThrottleTimer = null;
              setRoom(prev => {
                if (!prev) return null;
                if (prev.status === 'LOBBY' || prev.status === 'GAME_OVER') return prev;
                return {
                  ...prev,
                  players: mergeLivePlayers(prev.players, livePlayersRef.current)
                };
              });
            }, 100);
          }
        }
      );
    }

    return () => {
      unsubscribe();
      if (unsubscribeResponses) unsubscribeResponses();
      if (unsubscribeHostLivePlayers) unsubscribeHostLivePlayers();
      if (responsesThrottleTimer) clearTimeout(responsesThrottleTimer);
      if (livePlayersThrottleTimer) clearTimeout(livePlayersThrottleTimer);
    };
  }, [roomCode, options?.isStudent]);

  // Dedicated Student Spoke Subscription (`roomPlayers/{roomCode}/{playerId}`)
  useEffect(() => {
    if (!roomCode || !options?.isStudent || !options?.playerId) return;

    let livePlayersThrottleTimer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeStudentLivePlayers: (() => void) | null = null;

    if (is3DGrandPrix) {
      // In 3D Suzuka Grand Prix, student iPads render all classmates' karts on the 3D track (throttled to 5Hz / 200ms)
      const myId = options.playerId;
      unsubscribeStudentLivePlayers = safeSubscribe<Record<string, Partial<QuizPlayer>>>(
        `roomPlayers/${roomCode}`,
        (livePlayersData) => {
          livePlayersRef.current = livePlayersData ? { ...livePlayersData } : {};
          if (!livePlayersThrottleTimer) {
            livePlayersThrottleTimer = setTimeout(() => {
              livePlayersThrottleTimer = null;
              setRoom(prev => {
                if (!prev || prev.status === 'LOBBY' || prev.status === 'GAME_OVER') return prev;
                return {
                  ...prev,
                  players: mergeLivePlayers(prev.players, livePlayersRef.current, myId)
                };
              });
            }, 200);
          }
        }
      );
    } else {
      // Student (Spoke) listens ONLY to their own live player node for zero cross-student network traffic
      const myId = options.playerId;
      unsubscribeStudentLivePlayers = safeSubscribe<Partial<QuizPlayer>>(
        `roomPlayers/${roomCode}/${myId}`,
        (myLiveData) => {
          if (myLiveData) {
            livePlayersRef.current = { ...livePlayersRef.current, [myId]: myLiveData };
          } else {
            const next = { ...livePlayersRef.current };
            delete next[myId];
            livePlayersRef.current = next;
          }
          setRoom(prev => {
            if (!prev || prev.status === 'LOBBY' || prev.status === 'GAME_OVER') return prev;
            return {
              ...prev,
              players: mergeLivePlayers(prev.players, livePlayersRef.current, myId)
            };
          });
        }
      );
    }

    return () => {
      if (unsubscribeStudentLivePlayers) unsubscribeStudentLivePlayers();
      if (livePlayersThrottleTimer) clearTimeout(livePlayersThrottleTimer);
    };
  }, [roomCode, options?.isStudent, options?.playerId, is3DGrandPrix]);

  // Clean up pending throttlers when resetting to Lobby/GameOver/Closed or unmounting
  useEffect(() => {
    if (!roomCode || room?.status === 'LOBBY' || room?.status === 'GAME_OVER' || room?.status === 'CLOSED') {
      const throttlers = studentSpokeThrottlersRef.current;
      throttlers.forEach((t) => t.dispose());
      throttlers.clear();
    }
  }, [roomCode, room?.status]);

  useEffect(() => {
    const throttlers = studentSpokeThrottlersRef.current;
    return () => {
      throttlers.forEach((t) => t.dispose());
      throttlers.clear();
    };
  }, []);

  // Helper to ensure host retains full questions including correctOptionId even across browser reload
  const getAuthoritativeQuestions = useCallback(async (): Promise<QuizQuestion[]> => {
    if (questionsRef.current && questionsRef.current.length > 0) {
      return questionsRef.current;
    }
    if (roomCode) {
      try {
        const stored = sessionStorage.getItem(`quiz_host_questions_${roomCode}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            questionsRef.current = parsed;
            return parsed;
          }
        }
      } catch {}
      try {
        const hostQuestions = await safeGet<QuizQuestion[]>(`hostSessions/${roomCode}/questions`);
        if (hostQuestions && Array.isArray(hostQuestions) && hostQuestions.length > 0) {
          questionsRef.current = hostQuestions;
          return hostQuestions;
        }
      } catch {}
    }
    return (Array.isArray(room?.questions) ? room.questions : (room?.questions ? (Object.values(room.questions) as QuizQuestion[]) : []));
  }, [roomCode, room?.questions]);

  // Host: Create a new room
  const createRoom = useCallback(async (
    code: string, 
    grade: string, 
    unit: string, 
    settings: QuizHostSettings, 
    questions: QuizQuestion[]
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Opportunistically sweep stale or abandoned rooms in the background
      sweepStaleRooms().catch(() => {});
      questionsRef.current = questions;
      settingsRef.current = settings;
      try {
        sessionStorage.setItem(`quiz_host_questions_${code}`, JSON.stringify(questions));
      } catch {}

      const hostId = await ensureAnonymousAuth();
      const isTug = settings.gamePlayType === 'TUG_OF_WAR';
      const isVolleyball = settings.gamePlayType === 'VOLLEYBALL';
      const isVolleyballVs = isVolleyball && (!settings.volleyballSettings || settings.volleyballSettings.gameStyle === 'TEAM_VS');
      const activeTeams: TeamId[] = (isTug || isVolleyballVs)
        ? ['team_red', 'team_white']
        : (settings.activeTeams && settings.activeTeams.length >= 2
          ? settings.activeTeams
          : (settings.teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, settings.teamCount || 2)));

      const initialTeamScores: Partial<Record<TeamId, any>> = {};
      activeTeams.forEach(tId => {
        const preset = TEAM_PRESETS[tId];
        if (preset) {
          initialTeamScores[tId] = {
            name: preset.name,
            jaName: preset.jaName,
            score: 0,
            correctCount: 0,
            memberCount: 0,
            averageScore: 0,
            color: preset.color,
            emoji: preset.emoji
          };
        }
      });

      const initialRoom: QuizRoomState = {
        code,
        hostId,
        createdAt: getServerTime(),
        updatedAt: getServerTime(),
        status: 'LOBBY',
        subject: settings.subject || 'ENGLISH',
        mathGrade: settings.mathGrade,
        mathDomain: settings.mathDomain,
        mathTopicId: settings.mathTopicId,
        grade,
        unit,
        schoolId: settings.schoolId,
        classId: settings.classId,
        recordRoster: settings.recordRoster !== false && !settings.isStudentHost && !settings.isTestGame && settings.classId !== 'TEST' && !code.startsWith('9'),
        isStudentHost: !!settings.isStudentHost,
        isTestGame: !!settings.isTestGame || settings.classId === 'TEST' || code.startsWith('9'),
        mode: settings.gameMode,
        teamAssignment: settings.teamAssignment || 'AUTO_BALANCE',
        teamCount: settings.teamCount || activeTeams.length,
        activeTeams,
        deliveryStream: settings.deliveryStream,
        ipadDisplayMode: settings.ipadDisplayMode,
        awardToggles: settings.awardToggles,
        totalQuestions: questions.length,
        currentQuestionIndex: 0,
        currentQuestion: null,
        players: {},
        responses: {},
        teamScores: initialTeamScores,
        troubleWords: {},
        boundStudents: {},
        gamePlayType: settings.gamePlayType || 'KAHOOT',
        recallDelaySeconds: settings.recallDelaySeconds || 0,
        eliminateDistractors: settings.distractorEliminationMode ? settings.distractorEliminationMode !== 'OFF' : !!settings.eliminateDistractors,
        distractorEliminationMode: settings.distractorEliminationMode || (settings.eliminateDistractors ? 'HALFWAY' : 'OFF'),
        sprintSettings: settings.sprintSettings,
        tugOfWarSettings: settings.tugOfWarSettings,
        volleyballSettings: settings.volleyballSettings,
        choiceImageMode: settings.choiceImageMode,
        englishReadingAid: settings.englishReadingAid,
        timeLimitSeconds: settings.timeLimitSeconds,
        questions: sanitizeQuestionsForPublicRoom(questions, settings.gamePlayType),
        bgm: settings.bgm,
        vocabularyScope: settings.vocabularyScope,
        selectedUnits: settings.selectedUnits || undefined
      };

      await safeRemove(`roomPlayers/${code}`).catch(() => {});
      await safeRemove(`roomResponses/${code}`).catch(() => {});
      await safeSet(`rooms/${code}`, initialRoom);
      await safeSet(`hostSessions/${code}/questions`, questions);

      if (settings.schoolId && settings.classId && !settings.isStudentHost) {
        const teacherRoomSummary = {
          code,
          gamePlayType: settings.gamePlayType || 'KAHOOT',
          unit,
          isTeacher: true,
          updatedAt: getServerTime()
        };
        await Promise.all([
          safeSet(`schools/${settings.schoolId}/classes/${settings.classId}/analyticsSummary/teacherRoom`, teacherRoomSummary),
          safeSet(`schools/${settings.schoolId}/classes/${settings.classId}/analyticsSummary/activeRoom`, teacherRoomSummary)
        ]).catch(() => {});
      }

      setRoomCode(code);
      setRoom(initialRoom);
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error("Error creating quiz room:", err);
      setError(err?.message || "Failed to create room");
      setLoading(false);
      return false;
    }
  }, []);

  // Host: End Game
  const endGame = useCallback(async (awards?: any[]) => {
    if (!roomCode) return;
    soundEffects.playFanfare();
    await ensureAnonymousAuth();

    let sessionAnalytics: SessionAnalytics | undefined;
    try {
      const snap = await safeGet<QuizRoomState>(`rooms/${roomCode}`);
      if (snap) {
        const rawQ = await getAuthoritativeQuestions();
        const questionsList = [...rawQ].sort((a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0));
        const roomDurationSec = snap.raceStartTime ? Math.max(1, Math.round((getServerTime() - snap.raceStartTime) / 1000)) : 300;
        sessionAnalytics = computeSessionAnalytics(snap, questionsList, roomDurationSec);
        await persistSessionAnalytics(sessionAnalytics);
      }
    } catch (aErr) {
      console.warn('Error computing Kahoot session analytics:', aErr);
    }

    const updateData: any = { status: 'GAME_OVER' };
    if (sessionAnalytics) {
      updateData.analytics = sessionAnalytics;
    }
    if (awards && awards.length > 0) {
      updateData.awardedBadges = awards;
    }
    const currentRoom = roomRef.current || room;
    if (currentRoom?.schoolId && currentRoom?.classId && !currentRoom?.isStudentHost) {
      try {
        const snap = await safeGet<QuizRoomState>(`rooms/${roomCode}`);
        const totalPoints = Object.values(snap?.players || {}).reduce((sum, p) => sum + (p.score || 0), 0);
        depositClassEnergy(currentRoom.schoolId, currentRoom.classId, totalPoints, roomCode).catch(() => {});
      } catch {}
      clearClassRoomPointers(currentRoom.schoolId, currentRoom.classId, roomCode).catch(() => {});
    }
    await safeUpdate(`rooms/${roomCode}`, updateData);
  }, [roomCode, getAuthoritativeQuestions, room?.schoolId, room?.classId]);

  // Host: Send next question (cleans responses node and local responses state)
  const nextQuestion = useCallback(async (index: number) => {
    if (!roomCode) return;
    await ensureAnonymousAuth();
    const rawQuestions = await getAuthoritativeQuestions();
    const questions = [...rawQuestions].sort((a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0));
    if (questions.length === 0) return;
    if (index >= questions.length) {
      await endGame();
      return;
    }

    const targetQ = questions[index];
    if (!targetQ) return;
    const { correctOptionId: _stripped, ...sanitizedTargetQ } = targetQ;
    const serverNow = getServerTime();
    const q: QuizQuestion = { ...sanitizedTargetQ, startTime: serverNow };

    try {
      // Clear room responses in Firebase
      await safeRemove(`roomResponses/${roomCode}`);
      await safeRemove(`rooms/${roomCode}/responses`);
      
      // Update local state immediately so allAnswered doesn't evaluate true from old question
      setRoom(prev => prev ? {
        ...prev,
        responses: {},
        currentQuestionIndex: index,
        currentQuestion: q,
        status: 'QUESTION',
        ...(index === 0 ? { raceStartTime: serverNow } : {})
      } : null);

      const roomUpdatePayload: Record<string, any> = {
        status: 'QUESTION',
        currentQuestionIndex: index,
        currentQuestion: q,
        responses: null
      };
      if (index === 0) {
        roomUpdatePayload.raceStartTime = serverNow;
      }

      await safeUpdate(`rooms/${roomCode}`, roomUpdatePayload);
    } catch (err: any) {
      console.error("Error starting question:", err);
    }
  }, [roomCode, getAuthoritativeQuestions, endGame]);

  // Host: Start the game
  const startGame = useCallback(async () => {
    if (!roomCode) return;
    await nextQuestion(0);
  }, [roomCode, nextQuestion]);

  // Host: Reveal Answer and calculate scores
  const revealAnswer = useCallback(async () => {
    if (!roomCode || !room || !room.currentQuestion) return;
    if (isRevealingRef.current || room.status !== 'QUESTION') return;
    isRevealingRef.current = true;

    soundEffects.playReveal();

    try {
      await ensureAnonymousAuth();
      // 350ms Wi-Fi flush buffer so student answers tapped at 0.0s arrive before grading
      await new Promise(resolve => setTimeout(resolve, 350));

      const rawQuestions = await getAuthoritativeQuestions();
      const targetQuestion = rawQuestions.find(q => q.questionIndex === room.currentQuestionIndex) || rawQuestions[room.currentQuestionIndex];
      let targetId = targetQuestion?.correctOptionId || room.currentQuestion.correctOptionId || '';
      if (!targetId && room.currentQuestion.targetWordEnglish) {
        const matchingOption = room.currentQuestion.options.find(
          o => o.english?.trim().toLowerCase() === room.currentQuestion?.targetWordEnglish?.trim().toLowerCase()
        );
        if (matchingOption) {
          targetId = matchingOption.id;
        }
      }
      const [decoupledResponsesRaw, legacyResponsesRaw, playersRaw] = await Promise.all([
        safeGet<Record<string, QuizResponse>>(`roomResponses/${roomCode}`),
        safeGet<Record<string, QuizResponse>>(`rooms/${roomCode}/responses`),
        safeGet<Record<string, QuizPlayer>>(`rooms/${roomCode}/players`)
      ]);
      const decoupledResponses = decoupledResponsesRaw || {};
      const legacyResponses = legacyResponsesRaw || {};
      const responses = { ...legacyResponses, ...decoupledResponses };
      const players = playersRaw || {};

      const teamScores = { ...room.teamScores };
      const timeLimitMs = (room.currentQuestion.timeLimitMs && room.currentQuestion.timeLimitMs > 0)
        ? room.currentQuestion.timeLimitMs
        : 15000;

      let totalAnswers = 0;
      let incorrectAnswers = 0;

      const updatedPlayers: Record<string, QuizPlayer> = {};

      Object.entries(players).forEach(([pId, pData]) => {
        const resp = responses[pId];
        let score = pData.score || 0;
        let streak = pData.currentStreak || 0;
        let maxStreak = pData.maxStreak || 0;
        let correctCount = pData.correctCount || 0;
        let totalAnswered = pData.totalAnswered || 0;
        let fastestTime = pData.fastestTimeMs || 999999;
        let pointsEarned = 0;
        let isCorrect = false;

        const playerAnswers = { ...(pData.answers || {}) };

        if (resp && resp.answerId) {
          totalAnswers++;
          totalAnswered++;
          const safeTimeTaken = (typeof resp.timeTakenMs === 'number' && !isNaN(resp.timeTakenMs) && resp.timeTakenMs > 0)
            ? resp.timeTakenMs
            : timeLimitMs;

          if (resp.answerId === targetId) {
            isCorrect = true;
            correctCount++;
            streak++;
            if (streak > maxStreak) maxStreak = streak;
            if (safeTimeTaken < fastestTime) fastestTime = safeTimeTaken;

            const recallDelayMs = (room.recallDelaySeconds || 0) * 1000;
            const activeWindowMs = Math.max(1000, timeLimitMs - recallDelayMs);
            const effectiveTimeTakenMs = Math.max(0, safeTimeTaken - recallDelayMs);
            const speedRatio = Math.max(0, Math.min(1, 1 - (effectiveTimeTakenMs / activeWindowMs)));
            const speedPoints = Math.floor(speedRatio * 500);
            const streakBonus = Math.min(250, (streak - 1) * 50);
            pointsEarned = 500 + speedPoints + streakBonus;
            score += pointsEarned;

            if (pData.teamId) {
              const currentTeamScore = teamScores[pData.teamId];
              if (currentTeamScore) {
                currentTeamScore.score += pointsEarned;
                currentTeamScore.correctCount++;
              }
            }
          } else {
            streak = 0;
            incorrectAnswers++;
          }

          playerAnswers[room.currentQuestionIndex] = {
            questionIndex: room.currentQuestionIndex,
            optionId: resp.answerId,
            isCorrect,
            timeTakenMs: safeTimeTaken,
            pointsEarned
          };
        } else {
          streak = 0;
          totalAnswered++;
          incorrectAnswers++;
          playerAnswers[room.currentQuestionIndex] = {
            questionIndex: room.currentQuestionIndex,
            optionId: '',
            isCorrect: false,
            timeTakenMs: timeLimitMs,
            pointsEarned: 0
          };
        }

        updatedPlayers[pId] = {
          ...pData,
          score,
          currentStreak: streak,
          maxStreak,
          correctCount,
          totalAnswered,
          fastestTimeMs: fastestTime,
          answers: playerAnswers,
          lastAnswer: (resp && resp.answerId) ? {
            optionId: resp.answerId,
            isCorrect,
            pointsEarned,
            timeTakenMs: (typeof resp.timeTakenMs === 'number' && !isNaN(resp.timeTakenMs)) ? resp.timeTakenMs : timeLimitMs
          } : undefined
        };
      });

      if (room.mode === 'TEAM') {
        const isTug = room.gamePlayType === 'TUG_OF_WAR';
        const teamIds: TeamId[] = isTug
          ? ['team_red', 'team_white']
          : (room.activeTeams || (room.teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, room.teamCount || 2)));
        teamIds.forEach((tId) => {
          if (!teamScores[tId]) return;
          const teamMembers = Object.values(updatedPlayers).filter(p => p.teamId === tId);
          const mCount = teamMembers.length;
          teamScores[tId].memberCount = mCount;

          let cumulativeAvg = 0;
          for (let q = 0; q <= room.currentQuestionIndex; q++) {
            const roundParticipants = teamMembers.filter(p => p.answers && p.answers[q] !== undefined);
            if (roundParticipants.length > 0) {
              const roundSum = roundParticipants.reduce((sum, p) => sum + (p.answers[q]?.pointsEarned || 0), 0);
              cumulativeAvg += (roundSum / roundParticipants.length);
            }
          }
          teamScores[tId].averageScore = Math.round(cumulativeAvg);

          if (teamMembers.length > 0) {
            const sortedMembers = [...teamMembers].sort((a, b) => b.score - a.score);
            const topMember = sortedMembers[0];
            teamScores[tId].mvpPlayerId = topMember.id;
            teamScores[tId].mvpNickname = topMember.nickname;
            teamScores[tId].mvpScore = topMember.score;
          }
        });
      }

      const troubleWords = { ...(room.troubleWords || {}) };
      if (totalAnswers > 0 && (incorrectAnswers / totalAnswers) >= 0.5) {
        troubleWords[room.currentQuestion.targetWordId] = {
          english: room.currentQuestion.isMath ? room.currentQuestion.promptText : room.currentQuestion.targetWordEnglish,
          ja: room.currentQuestion.isMath ? (room.currentQuestion.targetWordJa || `正解: ${room.currentQuestion.targetWordEnglish}`) : room.currentQuestion.targetWordJa,
          image: room.currentQuestion.promptImage,
          sound: room.currentQuestion.isMath ? undefined : room.currentQuestion.promptSound,
          incorrectCount: incorrectAnswers,
          totalCount: totalAnswers
        };
      }

      await safeUpdate(`rooms/${roomCode}`, {
        status: 'REVEAL',
        'currentQuestion/correctOptionId': targetId,
        players: updatedPlayers,
        responses,
        teamScores,
        troubleWords
      });
    } catch (err: any) {
      console.error("Error revealing answer:", err);
    } finally {
      isRevealingRef.current = false;
    }
  }, [roomCode, room]);

  // Host: Show Leaderboard
  const showLeaderboard = useCallback(async () => {
    if (!roomCode) return;
    soundEffects.playFanfare();
    await ensureAnonymousAuth();
    await safeUpdate(`rooms/${roomCode}`, {
      status: 'LEADERBOARD'
    });
  }, [roomCode]);

  // Host: Start Sprint Race (2D Classic or 3D Suzuka Grand Prix)
  const startSprintRace = useCallback(async () => {
    if (!roomCode) return;
    const now = getServerTime();
    try {
      await ensureAnonymousAuth();
      livePlayersRef.current = {};
      const duration = settingsRef.current?.sprintSettings?.timeLimitSeconds || room?.sprintSettings?.timeLimitSeconds || 60;
      const modeType = settingsRef.current?.gamePlayType || room?.gamePlayType;
      const targetStatus: QuizRoomState['status'] =
        modeType === 'SPRINT_RACE' ? 'SPRINT_RACE' : 'GRAND_PRIX_3D';
      
      // Clean up roomPlayers non-blockingly so safeUpdate dispatches immediately
      safeRemove(`roomPlayers/${roomCode}`).catch(() => {});

      await safeUpdate(`rooms/${roomCode}`, {
        status: targetStatus,
        raceStartTime: now,
        raceDurationSeconds: duration,
        raceFinishGraceStartTime: null,
        podiumFinishers: []
      });
    } catch (err: any) {
      console.error("Error starting sprint race:", err);
    }
  }, [roomCode, room?.sprintSettings, room?.gamePlayType]);

  // Host: Trigger 20s/30s grace countdown
  const triggerSprintGraceCountdown = useCallback(async () => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${roomCode}`, {
        raceFinishGraceStartTime: getServerTime()
      });
    } catch (err: any) {
      console.error("Error triggering sprint grace countdown:", err);
    }
  }, [roomCode]);

  // Host: End Sprint Race
  const endSprintRace = useCallback(async (podium: PodiumFinisher[], awards?: any[]) => {
    if (!roomCode) return;
    soundEffects.playCheckeredFlag();
    try {
      await ensureAnonymousAuth();
      // Allow 250ms (2x 125ms spoke throttle window) for in-flight student iPad packets to land
      await new Promise((resolve) => setTimeout(resolve, 250));

      const [roomVal, basePlayers, livePlayers] = await Promise.all([
        safeGet<QuizRoomState>(`rooms/${roomCode}`),
        safeGet<Record<string, QuizPlayer>>(`rooms/${roomCode}/players`),
        safeGet<Record<string, Partial<QuizPlayer>>>(`roomPlayers/${roomCode}`)
      ]);
      const isTimeTrial = roomVal?.sprintSettings?.sprintMode === 'TIME_TRIAL';
      const is3DRace = roomVal?.gamePlayType === 'GRAND_PRIX_3D';

      const players = mergeLivePlayers(basePlayers || {}, livePlayers || {});
      const playerList = Object.values(players);
      const updatedPlayers: Record<string, QuizPlayer> = {};

      let sortedAll: QuizPlayer[] = [];

      if (isTimeTrial) {
        sortedAll = [...playerList].sort((a, b) => {
          if (is3DRace && (b.distanceMeters || 0) !== (a.distanceMeters || 0)) {
            return (b.distanceMeters || 0) - (a.distanceMeters || 0);
          }
          if ((b.correctCount || 0) !== (a.correctCount || 0)) {
            return (b.correctCount || 0) - (a.correctCount || 0);
          }
          return (b.score || 0) - (a.score || 0);
        });

        const timeLimitMs = (roomVal?.sprintSettings?.timeLimitSeconds || 60) * 1000;
        sortedAll.forEach((p, idx) => {
          updatedPlayers[p.id] = {
            ...p,
            isFinished: true,
            isDnf: false,
            finishRank: idx + 1,
            finishTimeMs: p.finishTimeMs || timeLimitMs
          };
        });
      } else {
        sortedAll = [...playerList].sort((a, b) => {
          if (a.isFinished && !b.isFinished) return -1;
          if (!a.isFinished && b.isFinished) return 1;
          if (a.isFinished && b.isFinished) {
            return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
          }
          if (is3DRace && (b.distanceMeters || 0) !== (a.distanceMeters || 0)) {
            return (b.distanceMeters || 0) - (a.distanceMeters || 0);
          }
          if ((b.sprintProgress || 0) !== (a.sprintProgress || 0)) {
            return (b.sprintProgress || 0) - (a.sprintProgress || 0);
          }
          return (b.score || 0) - (a.score || 0);
        });

        sortedAll.forEach((p, idx) => {
          updatedPlayers[p.id] = {
            ...p,
            isFinished: !!p.isFinished,
            isDnf: !p.isFinished,
            finishRank: idx + 1
          };
        });
      }

      let finalizedPodium: PodiumFinisher[] = [];
      if (isTimeTrial) {
        const timeLimitMs = (roomVal?.sprintSettings?.timeLimitSeconds || 60) * 1000;
        finalizedPodium = sortedAll.slice(0, 3).map((p, idx) => ({
          playerId: p.id,
          nickname: p.nickname,
          finishTimeMs: p.finishTimeMs || timeLimitMs,
          rank: idx + 1,
          teamId: p.teamId,
          correctCount: p.correctCount || 0,
          totalAnswered: p.totalAnswered || 0,
          avatar: p.avatar,
          frame: p.frame,
          title: p.title,
          attendanceNumber: p.attendanceNumber
        }));
      } else {
        finalizedPodium = sortedAll.slice(0, 3).map((p, idx) => ({
          playerId: p.id,
          nickname: p.nickname,
          finishTimeMs: p.finishTimeMs || 0,
          rank: idx + 1,
          teamId: p.teamId,
          correctCount: p.correctCount || 0,
          totalAnswered: p.totalAnswered || 0,
          avatar: p.avatar,
          frame: p.frame,
          title: p.title,
          attendanceNumber: p.attendanceNumber
        }));
      }

      // ======================================================================
      // [ANTIGRAVITY REFACTOR #2]: Shared End-of-Game TroubleWords & TeamScores
      // WHAT CHANGED:
      // Replaced ~60 lines of inline troubleWords & teamScores loops in
      // `endSprintRace`, `endTugOfWar`, and `endVolleyball` with calls to
      // `computeTroubleWordsMap` and `reconcileTeamScores` from `./core/quizEngine`.
      // ======================================================================
      const sprintQuestions: QuizQuestion[] = (questionsRef.current && questionsRef.current.length > 0)
        ? questionsRef.current
        : (Array.isArray(roomVal?.questions) ? roomVal.questions : (roomVal?.questions ? (Object.values(roomVal.questions) as QuizQuestion[]) : []));

      const troubleWords = computeTroubleWordsMap(updatedPlayers as any, sprintQuestions as any, roomVal?.troubleWords);

      let teamScores = { ...(roomVal?.teamScores || {}) };
      if (roomVal?.mode === 'TEAM') {
        const isTug = roomVal?.gamePlayType === 'TUG_OF_WAR';
        const teamIds: TeamId[] = isTug
          ? ['team_red', 'team_white']
          : (roomVal?.activeTeams || (roomVal?.teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, roomVal?.teamCount || 2)));
        teamScores = reconcileTeamScores(updatedPlayers as any, teamIds, teamScores as any) as any;
      }

      const roomDurationSec = roomVal?.raceStartTime ? Math.round((getServerTime() - roomVal.raceStartTime) / 1000) : 180;
      let sessionAnalytics: SessionAnalytics | undefined;
      try {
        const roomForAnalytics: QuizRoomState = {
          ...(roomVal || {}),
          code: roomCode,
          status: 'GAME_OVER',
          players: updatedPlayers,
          questions: sprintQuestions
        } as QuizRoomState;
        sessionAnalytics = computeSessionAnalytics(roomForAnalytics, sprintQuestions, roomDurationSec);
        await persistSessionAnalytics(sessionAnalytics);
      } catch (aErr) {
        console.warn('Error computing sprint session analytics:', aErr);
      }

      const updateData: any = {
        status: 'GAME_OVER',
        players: updatedPlayers,
        podiumFinishers: finalizedPodium,
        teamScores,
        troubleWords
      };
      if (sessionAnalytics) {
        updateData.analytics = sessionAnalytics;
      }
      if (awards && awards.length > 0) {
        updateData.awardedBadges = awards;
      }
      if (roomVal?.schoolId && roomVal?.classId && !roomVal?.isStudentHost) {
        try {
          const totalPoints = (playerList || []).reduce((sum, p) => sum + (p.score || 0), 0);
          depositClassEnergy(roomVal.schoolId, roomVal.classId, totalPoints, roomCode).catch(() => {});
        } catch {}
        clearClassRoomPointers(roomVal.schoolId, roomVal.classId, roomCode).catch(() => {});
      }
      await safeUpdate(`rooms/${roomCode}`, updateData);
    } catch (err: any) {
      console.error("Error ending sprint race:", err);
    }
  }, [roomCode]);

  // Host: Start Tug of War
  const startTugOfWar = useCallback(async () => {
    if (!roomCode) return;
    const now = getServerTime();
    try {
      await ensureAnonymousAuth();
      livePlayersRef.current = {};
      await safeRemove(`roomPlayers/${roomCode}`).catch(() => {});
      const duration = settingsRef.current?.tugOfWarSettings?.timeLimitSeconds || room?.tugOfWarSettings?.timeLimitSeconds || 60;
      soundEffects.playWhistle(0.8);
      await safeUpdate(`rooms/${roomCode}`, {
        status: 'TUG_OF_WAR',
        raceStartTime: now,
        tugOfWarStartTime: now,
        raceDurationSeconds: duration,
        tugOfWarFinished: false,
        tugOfWarRound: 1,
        tugOfWarRoundWins: { team_red: 0, team_white: 0 },
        tugOfWarBaselinePulls: {}
      });
    } catch (err: any) {
      console.error("Error starting tug of war:", err);
    }
  }, [roomCode, room?.tugOfWarSettings]);

  // Host: Start Next Tug of War Round (in multi-round series)
  const nextTugOfWarRound = useCallback(async (
    newWins: { team_red: number; team_white: number },
    nextRoundNumber: number,
    baselinePulls: Record<string, number>
  ) => {
    if (!roomCode) return;
    const now = getServerTime();
    try {
      await ensureAnonymousAuth();
      // Snapshot & merge cumulative player stats from Round N before resetting spoke node for Round N+1
      const [basePlayers, livePlayers] = await Promise.all([
        safeGet<Record<string, QuizPlayer>>(`rooms/${roomCode}/players`),
        safeGet<Record<string, Partial<QuizPlayer>>>(`roomPlayers/${roomCode}`)
      ]);
      const preservedPlayers = mergeLivePlayers(basePlayers || room?.players || {}, livePlayers || livePlayersRef.current || {});

      // Ensure baselinePulls reflects the authoritative merged correctCount for every player
      const authoritativeBaselines: Record<string, number> = { ...baselinePulls };
      Object.values(preservedPlayers).forEach((p) => {
        authoritativeBaselines[p.id] = Math.max(
          authoritativeBaselines[p.id] || 0,
          p.correctCount || 0
        );
      });

      livePlayersRef.current = {};
      await safeRemove(`roomPlayers/${roomCode}`).catch(() => {});
      const duration = settingsRef.current?.tugOfWarSettings?.timeLimitSeconds || room?.tugOfWarSettings?.timeLimitSeconds || 60;
      soundEffects.playWhistle(0.8);
      await safeUpdate(`rooms/${roomCode}`, {
        status: 'TUG_OF_WAR',
        players: preservedPlayers,
        raceStartTime: now,
        tugOfWarStartTime: now,
        raceDurationSeconds: duration,
        tugOfWarFinished: false,
        tugOfWarRound: nextRoundNumber,
        tugOfWarRoundWins: newWins,
        tugOfWarBaselinePulls: authoritativeBaselines
      });
    } catch (err: any) {
      console.error("Error starting next tug of war round:", err);
    }
  }, [roomCode, room?.tugOfWarSettings, room?.players]);

  // Host: Freeze Tug of War when time expires or early sweep happens
  const freezeTugOfWar = useCallback(async () => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${roomCode}`, {
        tugOfWarFinished: true
      });
    } catch (err: any) {
      console.error("Error freezing tug of war:", err);
    }
  }, [roomCode]);

  // Host: End Tug of War (Deduplicated via computeTroubleWordsMap & reconcileTeamScores)
  const endTugOfWar = useCallback(async (awards?: any[]) => {
    if (!roomCode) return;
    soundEffects.playWhistle(1.2);
    soundEffects.playFanfare();
    try {
      await ensureAnonymousAuth();
      // Allow 250ms (2x 125ms spoke throttle window) for in-flight student iPad packets to land
      await new Promise((resolve) => setTimeout(resolve, 250));

      const [roomVal, basePlayers, livePlayers] = await Promise.all([
        safeGet<QuizRoomState>(`rooms/${roomCode}`),
        safeGet<Record<string, QuizPlayer>>(`rooms/${roomCode}/players`),
        safeGet<Record<string, Partial<QuizPlayer>>>(`roomPlayers/${roomCode}`)
      ]);
      const players = mergeLivePlayers(basePlayers || {}, livePlayers || {});
      const playerList = Object.values(players);

      const modeQuestions: QuizQuestion[] = (questionsRef.current && questionsRef.current.length > 0)
        ? questionsRef.current
        : (Array.isArray(roomVal?.questions) ? roomVal.questions : (roomVal?.questions ? (Object.values(roomVal.questions) as QuizQuestion[]) : []));

      const troubleWords = computeTroubleWordsMap(players as any, modeQuestions as any, roomVal?.troubleWords);
      const sanitizedTeamScores = reconcileTeamScores(
        players as any,
        ['team_red', 'team_white'],
        roomVal?.teamScores as any
      );

      const roomDurationSec = roomVal?.raceStartTime ? Math.round((getServerTime() - roomVal.raceStartTime) / 1000) : (roomVal?.tugOfWarSettings?.timeLimitSeconds || 60);
      let sessionAnalytics: SessionAnalytics | undefined;
      try {
        const roomForAnalytics: QuizRoomState = {
          ...(roomVal || {}),
          code: roomCode,
          status: 'GAME_OVER',
          players,
          questions: modeQuestions
        } as QuizRoomState;
        sessionAnalytics = computeSessionAnalytics(roomForAnalytics, modeQuestions, roomDurationSec);
        await persistSessionAnalytics(sessionAnalytics);
      } catch (aErr) {
        console.warn('Error computing tug of war session analytics:', aErr);
      }

      const updateData: any = {
        status: 'GAME_OVER',
        players,
        activeTeams: ['team_red', 'team_white'],
        teamScores: sanitizedTeamScores,
        troubleWords
      };
      if (sessionAnalytics) {
        updateData.analytics = sessionAnalytics;
      }
      if (awards && awards.length > 0) {
        updateData.awardedBadges = awards;
      }
      if (roomVal?.schoolId && roomVal?.classId && !roomVal?.isStudentHost) {
        try {
          const totalPoints = (playerList || []).reduce((sum, p) => sum + (p.score || 0), 0);
          depositClassEnergy(roomVal.schoolId, roomVal.classId, totalPoints, roomCode).catch(() => {});
        } catch {}
        clearClassRoomPointers(roomVal.schoolId, roomVal.classId, roomCode).catch(() => {});
      }
      await safeUpdate(`rooms/${roomCode}`, updateData);
    } catch (err: any) {
      console.error("Error ending tug of war:", err);
    }
  }, [roomCode]);

  // Host: Start Volleyball
  const startVolleyball = useCallback(async () => {
    if (!roomCode) return;
    const now = getServerTime();
    try {
      await ensureAnonymousAuth();
      livePlayersRef.current = {};
      await safeRemove(`roomPlayers/${roomCode}`).catch(() => {});
      const duration = settingsRef.current?.volleyballSettings?.timeLimitSeconds || room?.volleyballSettings?.timeLimitSeconds || 60;
      soundEffects.playWhistle(0.8);
      await safeUpdate(`rooms/${roomCode}`, {
        status: 'VOLLEYBALL',
        raceStartTime: now,
        volleyballStartTime: now,
        raceDurationSeconds: duration,
        volleyballFinished: false
      });
    } catch (err: any) {
      console.error("Error starting volleyball:", err);
    }
  }, [roomCode, room?.volleyballSettings]);

  // Host: Freeze Volleyball
  const freezeVolleyball = useCallback(async () => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${roomCode}`, {
        volleyballFinished: true
      });
    } catch (err: any) {
      console.error("Error freezing volleyball:", err);
    }
  }, [roomCode]);

  // Host: End Volleyball (Deduplicated via computeTroubleWordsMap & reconcileTeamScores)
  const endVolleyball = useCallback(async (awards?: any[]) => {
    if (!roomCode) return;
    soundEffects.playWhistle(1.2);
    soundEffects.playFanfare();
    try {
      await ensureAnonymousAuth();
      // Allow 250ms (2x 125ms spoke throttle window) for in-flight student iPad packets to land
      await new Promise((resolve) => setTimeout(resolve, 250));

      const [roomVal, basePlayers, livePlayers] = await Promise.all([
        safeGet<QuizRoomState>(`rooms/${roomCode}`),
        safeGet<Record<string, QuizPlayer>>(`rooms/${roomCode}/players`),
        safeGet<Record<string, Partial<QuizPlayer>>>(`roomPlayers/${roomCode}`)
      ]);
      const players = mergeLivePlayers(basePlayers || {}, livePlayers || {});
      const playerList = Object.values(players);

      const modeQuestions: QuizQuestion[] = (questionsRef.current && questionsRef.current.length > 0)
        ? questionsRef.current
        : (Array.isArray(roomVal?.questions) ? roomVal.questions : (roomVal?.questions ? (Object.values(roomVal.questions) as QuizQuestion[]) : []));

      const troubleWords = computeTroubleWordsMap(players as any, modeQuestions as any, roomVal?.troubleWords);
      const isVs = roomVal?.volleyballSettings?.gameStyle === 'TEAM_VS';
      const teamIds: TeamId[] = isVs ? ['team_red', 'team_white'] : (roomVal?.activeTeams || ['team_red', 'team_white']);
      const sanitizedTeamScores = reconcileTeamScores(
        players as any,
        teamIds,
        roomVal?.teamScores as any
      );

      const roomDurationSec = roomVal?.raceStartTime ? Math.round((getServerTime() - roomVal.raceStartTime) / 1000) : (roomVal?.volleyballSettings?.timeLimitSeconds || 60);
      let sessionAnalytics: SessionAnalytics | undefined;
      try {
        const roomForAnalytics: QuizRoomState = {
          ...(roomVal || {}),
          code: roomCode,
          status: 'GAME_OVER',
          players,
          questions: modeQuestions
        } as QuizRoomState;
        sessionAnalytics = computeSessionAnalytics(roomForAnalytics, modeQuestions, roomDurationSec);
        await persistSessionAnalytics(sessionAnalytics);
      } catch (aErr) {
        console.warn('Error computing volleyball session analytics:', aErr);
      }

      const updateData: any = {
        status: 'GAME_OVER',
        players,
        teamScores: sanitizedTeamScores,
        troubleWords
      };
      if (sessionAnalytics) {
        updateData.analytics = sessionAnalytics;
      }
      if (awards && awards.length > 0) {
        updateData.awardedBadges = awards;
      }
      if (roomVal?.schoolId && roomVal?.classId && !roomVal?.isStudentHost) {
        try {
          const totalPoints = (playerList || []).reduce((sum, p) => sum + (p.score || 0), 0);
          depositClassEnergy(roomVal.schoolId, roomVal.classId, totalPoints, roomCode).catch(() => {});
        } catch {}
        clearClassRoomPointers(roomVal.schoolId, roomVal.classId, roomCode).catch(() => {});
      }
      await safeUpdate(`rooms/${roomCode}`, updateData);
    } catch (err: any) {
      console.error("Error ending volleyball:", err);
    }
  }, [roomCode]);

  // Host: Reset room for a new round while keeping room code and connected players
  const resetRoomForNewRound = useCallback(async (
    newQuestions: QuizQuestion[],
    keepSettings = true,
    updatedSettings?: Partial<QuizHostSettings>
  ): Promise<boolean> => {
    if (!roomCode) return false;
    setLoading(true);
    try {
      await ensureAnonymousAuth();
      const currentRoom = roomRef.current;
      const existingPlayers = (await safeGet<Record<string, QuizPlayer>>(`rooms/${roomCode}/players`)) || {};
      const resetPlayers: Record<string, QuizPlayer> = {};

      Object.entries(existingPlayers).forEach(([pId, p]) => {
        resetPlayers[pId] = {
          ...p,
          score: 0,
          currentStreak: 0,
          maxStreak: 0,
          correctCount: 0,
          totalAnswered: 0,
          fastestTimeMs: 999999,
          answers: {},
          lastAnswer: undefined,
          sprintProgress: 0,
          speedKmh: 0,
          distanceMeters: 0,
          inPitStop: false,
          finishTimeMs: undefined,
          finishRank: undefined,
          isFinished: false,
          isDnf: false
        };
      });

      const resolvedGamePlayType = updatedSettings?.gamePlayType || currentRoom?.gamePlayType || settingsRef.current?.gamePlayType || 'KAHOOT';
      const isTug = resolvedGamePlayType === 'TUG_OF_WAR';
      const isVolleyball = resolvedGamePlayType === 'VOLLEYBALL';
      const resolvedVolleyballSettings = updatedSettings?.volleyballSettings ?? currentRoom?.volleyballSettings;
      const isVolleyballVs = isVolleyball && (!resolvedVolleyballSettings || resolvedVolleyballSettings.gameStyle === 'TEAM_VS');
      const requestedMode = updatedSettings?.gameMode || currentRoom?.mode || settingsRef.current?.gameMode || 'INDIVIDUAL';
      const effectiveMode: GameMode = (isTug || isVolleyballVs)
        ? 'TEAM'
        : (isVolleyball && resolvedVolleyballSettings?.gameStyle === 'COOP_RALLY')
          ? 'INDIVIDUAL'
          : requestedMode;

      const resolvedTeamCount = updatedSettings?.teamCount ?? currentRoom?.teamCount ?? 2;
      const activeTeams: TeamId[] = (isTug || isVolleyballVs)
        ? ['team_red', 'team_white']
        : (updatedSettings?.activeTeams && updatedSettings.activeTeams.length >= 2
          ? updatedSettings.activeTeams
          : updatedSettings?.teamCount
            ? (updatedSettings.teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, updatedSettings.teamCount))
            : (currentRoom?.activeTeams && currentRoom.activeTeams.length >= 2
              ? currentRoom.activeTeams
              : (resolvedTeamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, resolvedTeamCount))));

      const initialTeamScores: Partial<Record<TeamId, any>> = {};
      if (effectiveMode === 'TEAM') {
        activeTeams.forEach(tId => {
          const preset = TEAM_PRESETS[tId];
          if (preset) {
            initialTeamScores[tId] = {
              name: preset.name,
              jaName: preset.jaName,
              score: 0,
              correctCount: 0,
              memberCount: 0,
              averageScore: 0,
              color: preset.color,
              emoji: preset.emoji
            };
          }
        });
      }

      // Assign/balance teams in TEAM mode, or clear teamId when switching back to INDIVIDUAL mode
      if (effectiveMode === 'TEAM') {
        const playerEntries = Object.entries(resetPlayers);
        playerEntries.forEach(([_, p], idx) => {
          if (activeTeams.length > 0) {
            p.teamId = activeTeams[idx % activeTeams.length];
            if (initialTeamScores[p.teamId]) {
              initialTeamScores[p.teamId].memberCount += 1;
            }
          }
        });
      } else {
        Object.values(resetPlayers).forEach((p) => {
          delete p.teamId;
        });
      }

      questionsRef.current = newQuestions;
      try {
        sessionStorage.setItem(`quiz_host_questions_${roomCode}`, JSON.stringify(newQuestions));
      } catch {}
      await safeSet(`hostSessions/${roomCode}/questions`, newQuestions);

      if (updatedSettings && settingsRef.current) {
        settingsRef.current = { ...settingsRef.current, ...updatedSettings };
      }

      livePlayersRef.current = {};
      await safeRemove(`roomPlayers/${roomCode}`).catch(() => {});
      await safeRemove(`roomResponses/${roomCode}`);
      await safeRemove(`rooms/${roomCode}/responses`);

      const serverNow = getServerTime();
      const updates: any = {
        status: 'LOBBY',
        updatedAt: serverNow,
        mode: effectiveMode,
        activeTeams: effectiveMode === 'TEAM' ? activeTeams : null,
        teamCount: effectiveMode === 'TEAM' ? activeTeams.length : null,
        teamAssignment: effectiveMode === 'TEAM'
          ? (updatedSettings?.teamAssignment || currentRoom?.teamAssignment || 'AUTO_BALANCE')
          : null,
        currentQuestionIndex: 0,
        currentQuestion: null,
        responses: null,
        players: resetPlayers,
        teamScores: effectiveMode === 'TEAM' ? initialTeamScores : {},
        troubleWords: {},
        questions: sanitizeQuestionsForPublicRoom(newQuestions, resolvedGamePlayType),
        totalQuestions: newQuestions.length,
        raceStartTime: null,
        raceDurationSeconds: null,
        raceFinishGraceStartTime: null,
        tugOfWarStartTime: null,
        tugOfWarFinished: null,
        tugOfWarRound: null,
        tugOfWarRoundWins: null,
        tugOfWarBaselinePulls: null,
        volleyballStartTime: null,
        volleyballFinished: null,
        volleyballLiveState: null,
        podiumFinishers: null,
        awardedBadges: null,
        analytics: null,
        eyesUp: false
      };

      if (updatedSettings) {
        if (updatedSettings.gamePlayType) {
          updates.gamePlayType = updatedSettings.gamePlayType;
          if (updatedSettings.gamePlayType !== 'GRAND_PRIX_3D' && updatedSettings.gamePlayType !== 'SPRINT_RACE') {
            updates.sprintSettings = null;
          }
          if (updatedSettings.gamePlayType !== 'TUG_OF_WAR') {
            updates.tugOfWarSettings = null;
          }
          if (updatedSettings.gamePlayType !== 'VOLLEYBALL') {
            updates.volleyballSettings = null;
          }
        }
        if (updatedSettings.sprintSettings !== undefined) updates.sprintSettings = updatedSettings.sprintSettings;
        if (updatedSettings.tugOfWarSettings !== undefined) updates.tugOfWarSettings = updatedSettings.tugOfWarSettings;
        if (updatedSettings.volleyballSettings !== undefined) updates.volleyballSettings = updatedSettings.volleyballSettings;
        if (updatedSettings.timeLimitSeconds !== undefined) updates.timeLimitSeconds = updatedSettings.timeLimitSeconds;
        if (updatedSettings.recallDelaySeconds !== undefined) updates.recallDelaySeconds = updatedSettings.recallDelaySeconds;
        if (updatedSettings.distractorEliminationMode !== undefined) {
          updates.distractorEliminationMode = updatedSettings.distractorEliminationMode;
          updates.eliminateDistractors = updatedSettings.distractorEliminationMode !== 'OFF';
        } else if (updatedSettings.eliminateDistractors !== undefined) {
          updates.eliminateDistractors = updatedSettings.eliminateDistractors;
          updates.distractorEliminationMode = updatedSettings.eliminateDistractors ? 'HALFWAY' : 'OFF';
        }
        if (updatedSettings.deliveryStream !== undefined) updates.deliveryStream = updatedSettings.deliveryStream;
        if (updatedSettings.ipadDisplayMode !== undefined) updates.ipadDisplayMode = updatedSettings.ipadDisplayMode;
        if (updatedSettings.awardToggles !== undefined) updates.awardToggles = updatedSettings.awardToggles;
        if (updatedSettings.choiceImageMode !== undefined) updates.choiceImageMode = updatedSettings.choiceImageMode;
        if (updatedSettings.englishReadingAid !== undefined) updates.englishReadingAid = updatedSettings.englishReadingAid;
        if (updatedSettings.schoolId !== undefined) updates.schoolId = updatedSettings.schoolId || null;
        if (updatedSettings.classId !== undefined) updates.classId = updatedSettings.classId || null;
        if (updatedSettings.isTestGame !== undefined) updates.isTestGame = updatedSettings.isTestGame;
        if (updatedSettings.recordRoster !== undefined) updates.recordRoster = updatedSettings.recordRoster;
        if (updatedSettings.bgm !== undefined) updates.bgm = updatedSettings.bgm;
        if (updatedSettings.vocabularyScope !== undefined) updates.vocabularyScope = updatedSettings.vocabularyScope;
        if (updatedSettings.selectedUnits !== undefined) updates.selectedUnits = updatedSettings.selectedUnits || null;
        if (updatedSettings.subject) {
          updates.subject = updatedSettings.subject;
          if (updatedSettings.subject === 'ENGLISH') {
            updates.mathGrade = null;
            updates.mathDomain = null;
            updates.mathTopicId = null;
          }
        }
        if (updatedSettings.mathGrade !== undefined) updates.mathGrade = updatedSettings.mathGrade;
        if (updatedSettings.mathDomain !== undefined) updates.mathDomain = updatedSettings.mathDomain;
        if ('mathTopicId' in updatedSettings) updates.mathTopicId = updatedSettings.mathTopicId ?? null;
      }

      await safeUpdate(`rooms/${roomCode}`, updates);

      if (currentRoom?.schoolId && currentRoom?.classId && !currentRoom?.isStudentHost) {
        const teacherRoomSummary = {
          code: roomCode,
          gamePlayType: resolvedGamePlayType,
          unit: currentRoom.unit,
          isTeacher: true,
          updatedAt: serverNow
        };
        await Promise.all([
          safeSet(`schools/${currentRoom.schoolId}/classes/${currentRoom.classId}/analyticsSummary/teacherRoom`, teacherRoomSummary),
          safeSet(`schools/${currentRoom.schoolId}/classes/${currentRoom.classId}/analyticsSummary/activeRoom`, teacherRoomSummary)
        ]).catch(() => {});
      }

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error("Error resetting room for new round:", err);
      setError(err?.message || "Failed to reset room");
      setLoading(false);
      return false;
    }
  }, [roomCode]);

  // Host: Close and delete room
  const closeRoom = useCallback(async () => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      const currentRoom = roomRef.current || room;
      try {
        sessionStorage.removeItem(`quiz_host_questions_${roomCode}`);
      } catch {}
      safeRemove(`hostSessions/${roomCode}`).catch(() => {});
      safeRemove(`roomResponses/${roomCode}`).catch(() => {});
      safeRemove(`roomPlayers/${roomCode}`).catch(() => {});
      if (currentRoom?.schoolId && currentRoom?.classId && !currentRoom?.isStudentHost) {
        await clearClassRoomPointers(currentRoom.schoolId, currentRoom.classId, roomCode).catch(() => {});
      }

      await safeUpdate(`rooms/${roomCode}`, { status: 'CLOSED', updatedAt: getServerTime() });
      const codeToRemove = roomCode;
      if (closeRoomTimerRef.current) {
        clearTimeout(closeRoomTimerRef.current);
      }
      // Fire delayed deletion non-blockingly so student tablets cleanly receive the CLOSED event
      closeRoomTimerRef.current = setTimeout(() => {
        closeRoomTimerRef.current = null;
        safeRemove(`rooms/${codeToRemove}`).catch(() => {});
      }, 2500);
      setRoom(null);
      setRoomCode(null);
    } catch (err) {
      console.error("Error closing room:", err);
    }
  }, [roomCode, room?.schoolId, room?.classId]);

  // Host: Kick player with atomic team score recalculation
  const kickPlayer = useCallback(async (playerId: string) => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      const playerToKick = room?.players?.[playerId];
      await safeRemove(`rooms/${roomCode}/players/${playerId}`);
      await safeRemove(`roomPlayers/${roomCode}/${playerId}`).catch(() => {});

      if (room?.boundStudents) {
        for (const [attNum, boundData] of Object.entries(room.boundStudents)) {
          if ((boundData as any)?.playerId === playerId) {
            await safeRemove(`rooms/${roomCode}/boundStudents/${attNum}`);
          }
        }
      }

      if (room?.mode === 'TEAM' && playerToKick?.teamId && room?.teamScores?.[playerToKick.teamId]) {
        const remainingTeamMembers = Object.values(room.players || {})
          .filter(p => p.id !== playerId && p.teamId === playerToKick.teamId);
        const mCount = remainingTeamMembers.length;
        const totalScore = remainingTeamMembers.reduce((sum, m) => sum + (m.score || 0), 0);
        const totalCorrect = remainingTeamMembers.reduce((sum, m) => sum + (m.correctCount || 0), 0);
        const avgScore = mCount > 0 ? Math.round(totalScore / mCount) : 0;
        const sorted = [...remainingTeamMembers].sort((a, b) => (b.score || 0) - (a.score || 0));

        await safeUpdate(`rooms/${roomCode}/teamScores/${playerToKick.teamId}`, {
          memberCount: mCount,
          score: totalScore,
          correctCount: totalCorrect,
          averageScore: avgScore,
          mvpPlayerId: sorted[0]?.id || null,
          mvpNickname: sorted[0]?.nickname || null,
          mvpScore: sorted[0]?.score || 0,
        });
      }
    } catch (err: any) {
      console.error("Error kicking player:", err);
    }
  }, [roomCode, room]);

  // Host: Change player team in lobby
  const changePlayerTeam = useCallback(async (playerId: string, newTeamId: TeamId) => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${roomCode}/players/${playerId}`, {
        teamId: newTeamId
      });
    } catch (err: any) {
      console.error("Error changing player team:", err);
    }
  }, [roomCode]);

  // Host: Toggle attention lock ("Eyes Up Front") on all student iPads
  const toggleEyesUp = useCallback(async (forcedState?: boolean) => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      const nextState = forcedState !== undefined ? forcedState : !room?.eyesUp;
      await safeUpdate(`rooms/${roomCode}`, { eyesUp: nextState });
    } catch (err: any) {
      console.error("Error toggling eyes up front:", err);
    }
  }, [roomCode, room?.eyesUp]);

  // Student: Join an existing room
  const joinRoom = useCallback(async (
    code: string, 
    nickname: string, 
    teamId?: TeamId,
    attendanceNumber?: number
  ): Promise<{ success: boolean; playerId?: string; error?: string }> => {
    try {
      const playerId = await ensureAnonymousAuth();
      const roomData = await safeGet<QuizRoomState>(`rooms/${code}`);
      if (!roomData) {
        return { success: false, error: 'ROOM_NOT_FOUND' };
      }

      if (roomData.status === 'CLOSED') {
        return { success: false, error: 'ROOM_CLOSED' };
      }

      const existingPlayer = roomData.players?.[playerId];
      const playerPath = `rooms/${code}/players/${playerId}`;

      // Purge any stale ghost player from the exact same seat/iPad reconnecting under a new anonymous UID
      const cleanNick = nickname.trim().toLowerCase();
      const hasAtt = attendanceNumber !== undefined && attendanceNumber !== null;
      if (roomData.players) {
        for (const [otherId, otherP] of Object.entries(roomData.players)) {
          if (otherId === playerId) continue;

          const otherHasAtt = otherP.attendanceNumber !== undefined && otherP.attendanceNumber !== null;
          // Match 1: Same attendance number (including Seat 00 Teacher/Tester)
          const isSameSeat = hasAtt && otherHasAtt && otherP.attendanceNumber === attendanceNumber;
          // Match 2: Same nickname BUT only if not a different enrolled student's seat
          const isSameNick = otherP.nickname?.trim().toLowerCase() === cleanNick;
          const isDifferentSeat = hasAtt && otherHasAtt && otherP.attendanceNumber !== attendanceNumber;

          if (isSameSeat || (isSameNick && !isDifferentSeat)) {
            await safeRemove(`rooms/${code}/players/${otherId}`).catch(() => {});
            await safeRemove(`roomPlayers/${code}/${otherId}`).catch(() => {});
          }
        }
      }

      const serverNow = getServerTime();

      if (existingPlayer) {
        const liveExisting = await safeGet<Partial<QuizPlayer>>(`roomPlayers/${code}/${playerId}`).catch(() => null);
        const studentProfile = getSavedStudentProfile();
        const reconnectedPlayer: QuizPlayer = {
          ...existingPlayer,
          ...(liveExisting || {}),
          nickname: nickname.trim() || existingPlayer.nickname,
          avatar: studentProfile?.avatar || existingPlayer.avatar,
          frame: studentProfile?.equipped?.frame || existingPlayer.frame,
          title: studentProfile?.equipped?.title || existingPlayer.title,
          attendanceNumber: attendanceNumber ?? existingPlayer.attendanceNumber,
          joinedAt: existingPlayer.joinedAt || serverNow,
          kartTheme: studentProfile?.equipped?.kartTheme || existingPlayer.kartTheme || getSavedKartTheme(),
        };
        await safeSet(playerPath, reconnectedPlayer);
        safeConfigureOnDisconnectUpdate(`roomPlayers/${code}/${playerId}`, {
          speedKmh: 0,
          inPitStop: false,
        }).catch(() => {});

        try {
          localStorage.setItem('activeQuizRoomCode', code);
          localStorage.setItem('activeQuizPlayerId', playerId);
          localStorage.setItem('activeQuizNickname', reconnectedPlayer.nickname);
          sessionStorage.setItem('activeQuizRoomCode', code);
          sessionStorage.setItem('activeQuizPlayerId', playerId);
          sessionStorage.setItem('activeQuizNickname', reconnectedPlayer.nickname);
        } catch {}

        setRoomCode(code);
        return { success: true, playerId };
      }

      let assignedTeam = teamId;
      if (roomData.mode === 'TEAM') {
        const isTug = roomData.gamePlayType === 'TUG_OF_WAR';
        const isVolleyballVs = roomData.gamePlayType === 'VOLLEYBALL' && (!roomData.volleyballSettings || roomData.volleyballSettings.gameStyle === 'TEAM_VS');
        const teams: TeamId[] = (isTug || isVolleyballVs)
          ? ['team_red', 'team_white']
          : (roomData.activeTeams || (roomData.teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, roomData.teamCount || 2)));
        const currentPlayers = Object.values(roomData.players || {});
        const counts = teams.map(t => currentPlayers.filter(p => p.teamId === t).length);
        const minCount = counts.length > 0 ? Math.min(...counts) : 0;

        if (assignedTeam && teams.includes(assignedTeam)) {
          const chosenCount = currentPlayers.filter(p => p.teamId === assignedTeam).length;
          const isFull = chosenCount >= 10 || (chosenCount >= minCount + 2 && currentPlayers.length >= 8);
          if (isFull) {
            const minIndex = counts.indexOf(minCount);
            assignedTeam = teams[minIndex];
          }
        } else {
          const minIndex = counts.indexOf(minCount);
          assignedTeam = teams[minIndex] || teams[0];
        }
      }

      const studentProfile = getSavedStudentProfile();
      const newPlayer: QuizPlayer = {
        id: playerId,
        nickname: nickname.trim(),
        avatar: studentProfile?.avatar,
        frame: studentProfile?.equipped?.frame,
        title: studentProfile?.equipped?.title,
        teamId: assignedTeam,
        attendanceNumber,
        score: 0,
        currentStreak: 0,
        maxStreak: 0,
        correctCount: 0,
        totalAnswered: 0,
        fastestTimeMs: 999999,
        joinedAt: serverNow,
        answers: {},
        kartTheme: studentProfile?.equipped?.kartTheme || getSavedKartTheme(),
      };

      await safeSet(playerPath, newPlayer);
      safeConfigureOnDisconnectUpdate(`roomPlayers/${code}/${playerId}`, {
        speedKmh: 0,
        inPitStop: false,
      }).catch(() => {});

      try {
        localStorage.setItem('activeQuizRoomCode', code);
        localStorage.setItem('activeQuizPlayerId', playerId);
        localStorage.setItem('activeQuizNickname', newPlayer.nickname);
        sessionStorage.setItem('activeQuizRoomCode', code);
        sessionStorage.setItem('activeQuizPlayerId', playerId);
        sessionStorage.setItem('activeQuizNickname', newPlayer.nickname);
      } catch {}

      setRoomCode(code);
      return { success: true, playerId };
    } catch (err: any) {
      console.error("Error joining room:", err);
      return { success: false, error: err.message || 'CONNECTION_ERROR' };
    }
  }, []);

  // Student: Update kart customization theme
  const updateKartTheme = useCallback(async (themeId: string) => {
    if (!roomCode || !options?.playerId) return;
    try {
      await ensureAnonymousAuth();
      await safeUpdate(`rooms/${roomCode}/players/${options.playerId}`, {
        kartTheme: themeId
      });
      await safeUpdate(`roomPlayers/${roomCode}/${options.playerId}`, {
        kartTheme: themeId
      }).catch(() => {});
    } catch (err: any) {
      console.error("Error updating kart theme:", err);
    }
  }, [roomCode, options?.playerId]);

  // Student: Update profile identity (nickname, avatar, frame, title, callsign) in active room
  const updatePlayerProfile = useCallback(async (updates: {
    nickname?: string;
    avatar?: string;
    frame?: string;
    title?: string;
    callsign?: string;
    greeting?: string;
  }) => {
    if (!roomCode || !options?.playerId) return;
    try {
      await ensureAnonymousAuth();
      const payload: Record<string, any> = {};
      if (updates.nickname !== undefined) payload.nickname = updates.nickname;
      if (updates.avatar !== undefined) payload.avatar = updates.avatar;
      if (updates.frame !== undefined) payload.frame = updates.frame;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.callsign !== undefined) payload.callsign = updates.callsign;
      if (updates.greeting !== undefined) {
        payload.greeting = updates.greeting;
        payload.greetingTimestamp = getServerTime();
      }

      await safeUpdate(`rooms/${roomCode}/players/${options.playerId}`, payload);
      await safeUpdate(`roomPlayers/${roomCode}/${options.playerId}`, payload).catch(() => {});
    } catch (err: any) {
      console.error("Error updating player profile in room:", err);
    }
  }, [roomCode, options?.playerId]);

  // Student: Submit answer
  const submitAnswer = useCallback(async (playerId: string, optionId: string, clientTimeTakenMs?: number) => {
    if (!roomCode || !room?.currentQuestion) return;

    const timeLimit = room.currentQuestion.timeLimitMs || 15000;
    const hostStartTime = room.currentQuestion.startTime || 0;
    const timeTakenMs = clientTimeTakenMs !== undefined && clientTimeTakenMs > 0
      ? Math.min(timeLimit, Math.max(100, clientTimeTakenMs))
      : (hostStartTime > 0 ? Math.min(timeLimit, Math.max(100, getServerTime() - hostStartTime)) : 1000);

    try {
      await ensureAnonymousAuth();
      await safeSet(`roomResponses/${roomCode}/${playerId}`, {
        answerId: optionId,
        timeTakenMs,
        submittedAt: getServerTime()
      });
    } catch (err: any) {
      console.error("Error submitting answer:", err);
    }
  }, [roomCode, room]);

  // Student: Submit Sprint / 3D Grand Prix Answer & Telemetry
  const submitSprintAnswer = useCallback(async (
    playerId: string,
    questionIndex: number,
    optionId: string,
    isCorrect: boolean,
    timeTakenMs: number,
    pointsEarned: number,
    newSprintProgress: number,
    isFinished: boolean = false,
    finishTimeMs?: number,
    cumulativeStats?: SprintCumulativeStats,
    incorrectAttempts?: number
  ) => {
    if (!roomCode) return;
    try {
      const updatePayload: Record<string, any> = {
        sprintProgress: newSprintProgress
      };

      if (cumulativeStats) {
        updatePayload.score = cumulativeStats.score;
        updatePayload.currentStreak = cumulativeStats.currentStreak;
        updatePayload.maxStreak = cumulativeStats.maxStreak;
        updatePayload.correctCount = cumulativeStats.correctCount;
        updatePayload.totalAnswered = cumulativeStats.totalAnswered;
        if (cumulativeStats.fastestTimeMs !== undefined && cumulativeStats.fastestTimeMs < 999999) {
          updatePayload.fastestTimeMs = cumulativeStats.fastestTimeMs;
        }
        if (cumulativeStats.speedKmh !== undefined) {
          updatePayload.speedKmh = cumulativeStats.speedKmh;
        }
        if (cumulativeStats.distanceMeters !== undefined) {
          updatePayload.distanceMeters = cumulativeStats.distanceMeters;
        }
        if (cumulativeStats.inPitStop !== undefined) {
          updatePayload.inPitStop = cumulativeStats.inPitStop;
        }
      }

      if (optionId) {
        const answerRecord: Record<string, any> = {
          questionIndex,
          optionId,
          isCorrect,
          timeTakenMs,
          pointsEarned
        };
        if (incorrectAttempts !== undefined && incorrectAttempts > 0) {
          answerRecord.incorrectAttempts = incorrectAttempts;
        }
        updatePayload[`answers/${questionIndex}`] = answerRecord;
        updatePayload.lastAnswer = {
          optionId,
          isCorrect,
          pointsEarned,
          timeTakenMs
        };
      }

      if (isFinished) {
        updatePayload.isFinished = true;
        if (finishTimeMs !== undefined) {
          updatePayload.finishTimeMs = finishTimeMs;
        }
      }

      // ======================================================================
      // [ANTIGRAVITY REFACTOR #4]: Eliminate O(N^2) Dual-Write & Throttle Spoke Writes to 8 Hz
      // ======================================================================
      // WHAT CHANGED:
      // 1. Removed `safeUpdate(\`rooms/\${roomCode}/players/\${playerId}\`, updatePayload)`
      //    during active gameplay (`submitSprintAnswer`).
      // 2. Routed all student progress/telemetry updates exclusively to the isolated
      //    spoke node `roomPlayers/${roomCode}/${playerId}` through an 8 Hz (125ms)
      //    coalescing throttler (`createRtdbWriteThrottler`), flushing immediately
      //    only when `isFinished === true`.
      // WHY:
      // All 40 student iPads subscribe to `rooms/${roomCode}`. Writing every answer
      // and 600ms 3D telemetry tick to `rooms/${roomCode}/players/${playerId}` forced
      // Firebase RTDB to broadcast the entire room object to all 40 iPads on every
      // single student action (40 x 40 = 1,600 downstream messages per question round).
      // The Host already merges `roomPlayers/${roomCode}` into `room.players` at 10 Hz
      // and persists the final merged `players` object to `rooms/${roomCode}/players`
      // once when transitioning to `GAME_OVER`.
      // ======================================================================
      const throttlerKey = `${roomCode}:${playerId}`;
      let throttler = studentSpokeThrottlersRef.current.get(throttlerKey);
      if (!throttler) {
        throttler = createRtdbWriteThrottler<Record<string, any>>(
          async (mergedPatch) => {
            await ensureAnonymousAuth();
            await safeUpdate(`roomPlayers/${roomCode}/${playerId}`, mergedPatch).catch(() => {});
          },
          125 // 8 Hz nominal rate (strictly within GEMINI.md §5 5-10 Hz ceiling)
        );
        studentSpokeThrottlersRef.current.set(throttlerKey, throttler);
      }

      throttler.push(updatePayload, isFinished);
    } catch (err: any) {
      console.error("Error submitting sprint answer:", err);
    }
  }, [roomCode]);

  // Student: Leave room
  const leaveRoom = useCallback(async (playerId: string) => {
    if (!roomCode) return;
    try {
      await ensureAnonymousAuth();
      await safeRemove(`rooms/${roomCode}/players/${playerId}`);
      await safeRemove(`roomPlayers/${roomCode}/${playerId}`).catch(() => {});
      try {
        localStorage.removeItem('activeQuizRoomCode');
        localStorage.removeItem('activeQuizPlayerId');
        localStorage.removeItem('activeQuizNickname');
        sessionStorage.removeItem('activeQuizRoomCode');
        sessionStorage.removeItem('activeQuizPlayerId');
        sessionStorage.removeItem('activeQuizNickname');
      } catch {}
      setRoom(null);
      setRoomCode(null);
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  }, [roomCode]);

  // Student/Room: Claim an attendance number
  const claimRoomAttendanceNumber = useCallback(async (
    code: string,
    attendanceNumber: number,
    playerId: string,
    nickname: string,
    score: number
  ): Promise<boolean> => {
    try {
      await ensureAnonymousAuth();
      const boundPath = `rooms/${code}/boundStudents/${attendanceNumber}`;
      const result = await safeTransaction<{ playerId: string; nickname: string; score: number; claimedAt: number }>(
        boundPath,
        (currentData) => {
          if (currentData !== null && currentData.playerId !== playerId) {
            return undefined;
          }
          return { playerId, nickname, score, claimedAt: getServerTime() };
        }
      );
      return result.committed;
    } catch (err) {
      console.error("Error claiming room attendance number:", err);
      return false;
    }
  }, []);

  // Host: Release an attendance number
  const releaseRoomAttendanceNumber = useCallback(async (
    code: string,
    attendanceNumber: number
  ): Promise<void> => {
    try {
      await ensureAnonymousAuth();
      await safeRemove(`rooms/${code}/boundStudents/${attendanceNumber}`);
    } catch (err) {
      console.error("Error releasing room attendance number:", err);
    }
  }, []);

  return {
    room,
    loading,
    error,
    createRoom,
    startGame,
    nextQuestion,
    revealAnswer,
    showLeaderboard,
    endGame,
    startSprintRace,
    triggerSprintGraceCountdown,
    endSprintRace,
    startTugOfWar,
    nextTugOfWarRound,
    freezeTugOfWar,
    endTugOfWar,
    startVolleyball,
    freezeVolleyball,
    endVolleyball,
    closeRoom,
    kickPlayer,
    changePlayerTeam,
    toggleEyesUp,
    resetRoomForNewRound,
    joinRoom,
    updateKartTheme,
    updatePlayerProfile,
    submitAnswer,
    submitSprintAnswer,
    leaveRoom,
    claimRoomAttendanceNumber,
    releaseRoomAttendanceNumber
  };
}