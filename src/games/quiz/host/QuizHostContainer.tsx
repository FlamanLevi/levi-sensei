import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useClassroom } from '@/context/ClassroomContext';
import { useVocabulary } from '@/context/VocabularyContext';
import { 
  QuizHostSettings, 
  QuizQuestion, 
  QuizRoomState, 
  ClassroomAward, 
  DeliveryStream, 
  PodiumFinisher, 
  QuizPlayer, 
  QuizResponse,
  TeamId,
  RAINBOW_TEAM_ORDER,
  TEAM_PRESETS
} from '../types';
import { generateQuizQuestions } from '../questionGenerator';
import { generateMathQuestions } from '../mathGenerator';
import { MathGrade, MathDomain } from '../mathTypes';
import { loadThreeHintsBank } from '@/games/three_hints/utils';
import { calculateClassroomAwards } from '../awardsEngine';
import { useQuizRoom, generateUniqueRoomPin } from '../useQuizRoom';
import { getServerTime } from '@/services/rtdbSafe';
import { useBGM } from '@/hooks/useBGM';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { QuizHostSetup } from './QuizHostSetup';
import { QuizHostLobby } from './QuizHostLobby';
import { QuizHostQuestion } from './QuizHostQuestion';
import { QuizHostReveal } from './QuizHostReveal';
import { QuizHostLeaderboard } from './QuizHostLeaderboard';
import { QuizHostGameOver } from './QuizHostGameOver';
import { QuizHostGrandPrix3D } from './QuizHostGrandPrix3D';
import { QuizHostTugOfWar } from './QuizHostTugOfWar';
import { QuizHostVolleyball } from './QuizHostVolleyball';
import { useQuizBotSimulator } from '../hooks/useQuizBotSimulator';

interface QuizHostContainerProps {
  onExit: () => void;
  onRegisterExit?: (fn: (() => void) | null) => void;
  onStepChange?: (step: HostStep) => void;
  isStudentHost?: boolean;
}

import { computeTroubleWordsMap, GAME_MODE_STRATEGIES } from '../core/quizEngine';

export type HostStep = 'SETUP' | 'LOBBY' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'GAME_OVER' | 'SPRINT_RACE' | 'GRAND_PRIX_3D' | 'TUG_OF_WAR' | 'VOLLEYBALL';

// ============================================================================
// [ANTIGRAVITY REFACTOR]: Shared Trouble Word Calculation
// WHAT CHANGED:
// Replaced the local 28-line `computeTroubleWordIds` nested loop with a 1-line
// delegation to `computeTroubleWordsMap` in `../core/quizEngine`.
// WHY:
// Eliminates 4x copy-pasted trouble-word aggregation logic across
// `QuizHostContainer.tsx`, `endSprintRace`, `endTugOfWar`, and `endVolleyball`.
// ============================================================================
const computeTroubleWordIds = (
  players: Record<string, QuizPlayer>,
  questions: QuizQuestion[],
  existingTroubleWords?: Record<string, any>
): string[] => {
  return Object.keys(computeTroubleWordsMap(players as any, questions as any, existingTroubleWords));
};

export const QuizHostContainer: React.FC<QuizHostContainerProps> = ({ onExit, onRegisterExit, onStepChange, isStudentHost = false }) => {
  const { activeGrade, activeUnit } = useClassroom();
  const { filteredWords, gradeWords, ensureCluesLoaded } = useVocabulary();

  const [step, setStep] = useState<HostStep>('SETUP');
  const [isEditingLobby, setIsEditingLobby] = useState<boolean>(false);

  useEffect(() => {
    ensureCluesLoaded();
    loadThreeHintsBank();
  }, [ensureCluesLoaded]);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  const [settings, setSettings] = useState<QuizHostSettings | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [localQuestionIndex, setLocalQuestionIndex] = useState<number>(0);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [calculatedAwards, setCalculatedAwards] = useState<ClassroomAward[]>([]);

  // Stream A (Front-Screen TV Solo / Warmup Mode) state
  const isStreamA = settings?.deliveryStream === 'STREAM_A_FRONT_SCREEN' || !roomCode;

  const createInitialSoloPlayer = useCallback((): QuizPlayer => ({
    id: 'stream_a_player',
    nickname: 'Player',
    score: 0,
    currentStreak: 0,
    maxStreak: 0,
    correctCount: 0,
    totalAnswered: 0,
    fastestTimeMs: 999999,
    joinedAt: Date.now(),
    answers: {}
  }), []);

  const [soloPlayer, setSoloPlayer] = useState<QuizPlayer>(() => ({
    id: 'stream_a_player',
    nickname: 'Player',
    score: 0,
    currentStreak: 0,
    maxStreak: 0,
    correctCount: 0,
    totalAnswered: 0,
    fastestTimeMs: 999999,
    joinedAt: Date.now(),
    answers: {}
  }));
  const [soloSelectedOptionId, setSoloSelectedOptionId] = useState<string | null>(null);
  const [soloSelectedTimeTakenMs, setSoloSelectedTimeTakenMs] = useState<number | null>(null);
  const [soloResponses, setSoloResponses] = useState<Record<string, QuizResponse>>({});
  const [soloTroubleWords, setSoloTroubleWords] = useState<Record<string, { english: string; ja: string; image?: string; sound?: string; incorrectCount: number; totalCount: number }>>({});
  const isSoloRevealingRef = useRef<boolean>(false);
  const soloSelectionRef = useRef<{ optionId: string; timeTakenMs: number } | null>(null);

  const handleSoloSelectOption = useCallback((optionId: string, timeTakenMs: number) => {
    soloSelectionRef.current = { optionId, timeTakenMs };
    setSoloSelectedOptionId(optionId);
    setSoloSelectedTimeTakenMs(timeTakenMs);
    setSoloResponses({
      ['stream_a_player']: {
        answerId: optionId,
        timeTakenMs,
        submittedAt: getServerTime()
      }
    });
  }, []);

  const {
    room,
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
    releaseRoomAttendanceNumber
  } = useQuizRoom(roomCode || undefined, { isHost: true });

  // Automated bot simulator for classroom preview and solo playtesting
  const { addBots, clearBots, botCount } = useQuizBotSimulator({
    roomCode,
    room,
    questions,
    isHost: true
  });

  // BGM playback during active game phases
  const isBgmPlaying = (step === 'QUESTION' || step === 'SPRINT_RACE' || step === 'GRAND_PRIX_3D' || step === 'TUG_OF_WAR' || step === 'VOLLEYBALL' || step === 'REVEAL' || step === 'LEADERBOARD') && !!settings?.bgm && settings.bgm !== 'none';
  const { isMuted: isBgmMuted, toggleMute: toggleBgmMute, currentTrackTitle, hasTrack, duckBGM, speedUpBGM, setBgmPlaybackRate, playbackRate: bgmPlaybackRate, nextTrack } = useBGM(settings?.bgm, isBgmPlaying);

  const handleReleaseBoundNumber = useCallback(async (attendanceNumber: number) => {
    if (roomCode) {
      await releaseRoomAttendanceNumber(roomCode, attendanceNumber);
    }
  }, [roomCode, releaseRoomAttendanceNumber]);

  const wordPool = filteredWords.length > 0 ? filteredWords : gradeWords;

  // Sync step with Firebase room status if in Stream B (and not actively editing settings in lobby)
  useEffect(() => {
    if (settings?.deliveryStream === 'STREAM_B_MULTIPLAYER' && room && !isEditingLobby) {
      if (room.status === 'LOBBY') setStep('LOBBY');
      else if (room.status === 'QUESTION') setStep('QUESTION');
      else if (room.status === 'SPRINT_RACE' || room.status === 'GRAND_PRIX_3D') setStep('GRAND_PRIX_3D');
      else if (room.status === 'TUG_OF_WAR') setStep('TUG_OF_WAR');
      else if (room.status === 'VOLLEYBALL') setStep('VOLLEYBALL');
      else if (room.status === 'REVEAL') setStep('REVEAL');
      else if (room.status === 'LEADERBOARD') setStep('LEADERBOARD');
      else if (room.status === 'GAME_OVER') setStep('GAME_OVER');
    }
  }, [room?.status, settings?.deliveryStream, isEditingLobby]);

  // Start or Update game setup
  const handleStartSetup = useCallback(async (newSettings: QuizHostSettings) => {
    setSettings(newSettings);
    let generated: QuizQuestion[] = [];
    if (newSettings.subject === 'MATH') {
      const mathGrade = (newSettings.mathGrade as MathGrade) || 'G1';
      const mathDomain = (newSettings.mathDomain as MathDomain) || 'ALL';
      const count = (newSettings.gamePlayType === 'GRAND_PRIX_3D' || newSettings.gamePlayType === 'TUG_OF_WAR' || newSettings.gamePlayType === 'VOLLEYBALL')
        ? 60
        : (newSettings.questionCount === -1 ? 40 : newSettings.questionCount);
      generated = generateMathQuestions({
        grade: mathGrade,
        domain: mathDomain,
        topicId: newSettings.mathTopicId,
        questionCount: count,
        timeLimitMs: (newSettings.timeLimitSeconds || 15) * 1000
      });
    } else {
      const poolToUse = newSettings.customWordPool && newSettings.customWordPool.length > 0
        ? newSettings.customWordPool
        : (filteredWords.length > 0 ? filteredWords : gradeWords);
      generated = generateQuizQuestions(poolToUse, newSettings, activeGrade, gradeWords);
    }
    
    if (generated.length === 0) {
      alert('問題の作成に失敗しました。設定を確認してください。');
      return;
    }

    const timed = [...generated];
    if (timed[0]) {
      timed[0] = { ...timed[0], startTime: getServerTime() };
    }
    setQuestions(timed);
    setLocalQuestionIndex(0);

    // Scenario A: Updating existing room from Lobby without disbanding or kicking students
    if (isEditingLobby && roomCode) {
      setIsEditingLobby(false);
      const success = await resetRoomForNewRound(timed, true, newSettings);
      if (success) {
        setStep('LOBBY');
      } else {
        alert('設定の更新に失敗しました。');
      }
      return;
    }

    // Scenario B: Creating a fresh room
    if (newSettings.deliveryStream === 'STREAM_B_MULTIPLAYER') {
      const isTest = Boolean(newSettings.isTestGame || newSettings.classId === 'TEST' || !newSettings.recordRoster);
      const pin = await generateUniqueRoomPin({
        isStudentHost,
        isTestGame: isTest,
        grade: activeGrade,
        classId: isTest ? 'TEST' : newSettings.classId
      });
      setRoomCode(pin);
      const success = await createRoom(pin, activeGrade, activeUnit, {
        ...newSettings,
        isTestGame: isTest,
        classId: isTest ? 'TEST' : newSettings.classId,
        recordRoster: isTest ? false : newSettings.recordRoster
      }, timed);
      if (success) {
        setStep('LOBBY');
      } else {
        alert('ルームの作成に失敗しました。接続を確認してください。');
      }
    } else {
      isSoloRevealingRef.current = false;
      soloSelectionRef.current = null;
      setRoomCode(null);
      setSoloPlayer(createInitialSoloPlayer());
      setSoloSelectedOptionId(null);
      setSoloSelectedTimeTakenMs(null);
      setSoloResponses({});
      setSoloTroubleWords({});
      setStep('QUESTION');
    }
  }, [filteredWords, gradeWords, activeGrade, activeUnit, createRoom, createInitialSoloPlayer, isEditingLobby, roomCode, resetRoomForNewRound]);

  // Trigger in-lobby settings edit
  const handleEditSettingsFromLobby = useCallback(() => {
    setIsEditingLobby(true);
    setStep('SETUP');
  }, []);

  // Cancel in-lobby settings edit (returns safely to lobby)
  const handleCancelSetup = useCallback(() => {
    if (isEditingLobby && roomCode) {
      setIsEditingLobby(false);
      setStep('LOBBY');
    } else {
      onExit();
    }
  }, [isEditingLobby, roomCode, onExit]);

  // Advance from Lobby to first question or Sprint Race or 3D Grand Prix or Tug of War
  const handleStartFromLobby = useCallback(async () => {
    isSoloRevealingRef.current = false;
    soloSelectionRef.current = null;
    if (settings?.deliveryStream === 'STREAM_B_MULTIPLAYER') {
      if (settings?.gamePlayType === 'SPRINT_RACE' || settings?.gamePlayType === 'GRAND_PRIX_3D') {
        setStep(settings.gamePlayType);
        await startSprintRace();
      } else if (settings?.gamePlayType === 'TUG_OF_WAR') {
        setStep('TUG_OF_WAR');
        await startTugOfWar();
      } else if (settings?.gamePlayType === 'VOLLEYBALL') {
        setStep('VOLLEYBALL');
        await startVolleyball();
      } else {
        await startGame();
      }
    } else {
      setQuestions(prev => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0] = { ...updated[0], startTime: getServerTime() };
        }
        return updated;
      });
      setLocalQuestionIndex(0);
      setSoloPlayer(createInitialSoloPlayer());
      setSoloSelectedOptionId(null);
      setSoloSelectedTimeTakenMs(null);
      setSoloResponses({});
      setSoloTroubleWords({});
      setStep('QUESTION');
    }
  }, [settings?.deliveryStream, settings?.gamePlayType, startSprintRace, startTugOfWar, startVolleyball, startGame, createInitialSoloPlayer]);

  // Question expired or manually revealed
  const handleRevealAnswer = useCallback(async () => {
    if (settings?.deliveryStream === 'STREAM_B_MULTIPLAYER') {
      await revealAnswer();
    } else {
      if (isSoloRevealingRef.current || step !== 'QUESTION') return;
      isSoloRevealingRef.current = true;

      // Stream A: Evaluate answer and update soloPlayer stats
      const q = questions[localQuestionIndex];
      if (q) {
        const chosenOptionId = soloSelectedOptionId || soloSelectionRef.current?.optionId || null;
        const chosenTime = soloSelectedTimeTakenMs || soloSelectionRef.current?.timeTakenMs || null;
        const isAnswered = !!chosenOptionId;
        const isCorrect = isAnswered && chosenOptionId === q.correctOptionId;
        const timeLimitMs = q.timeLimitMs || 15000;
        const recallDelayMs = (settings?.recallDelaySeconds || 0) * 1000;
        const safeTimeTaken = chosenTime
          ? Math.min(timeLimitMs, Math.max(100, chosenTime))
          : timeLimitMs;

        let pointsEarned = 0;
        let newStreak = 0;
        let newMaxStreak = soloPlayer.maxStreak || 0;
        let newCorrectCount = soloPlayer.correctCount || 0;
        let newFastestTime = soloPlayer.fastestTimeMs || 999999;

        if (isCorrect) {
          newCorrectCount++;
          newStreak = (soloPlayer.currentStreak || 0) + 1;
          if (newStreak > newMaxStreak) newMaxStreak = newStreak;
          if (safeTimeTaken < newFastestTime) newFastestTime = safeTimeTaken;

          const activeWindowMs = Math.max(1000, timeLimitMs - recallDelayMs);
          const effectiveTimeTakenMs = Math.max(0, safeTimeTaken - recallDelayMs);
          const speedRatio = Math.max(0, Math.min(1, 1 - (effectiveTimeTakenMs / activeWindowMs)));
          const speedPoints = Math.floor(speedRatio * 500);
          const streakBonus = Math.min(250, (newStreak - 1) * 50);
          pointsEarned = 500 + speedPoints + streakBonus;
        } else {
          newStreak = 0;
          setSoloTroubleWords(prev => ({
            ...prev,
            [q.targetWordId]: {
              english: q.targetWordEnglish,
              ja: q.targetWordJa,
              image: q.promptImage,
              sound: q.promptSound,
              incorrectCount: (prev[q.targetWordId]?.incorrectCount || 0) + 1,
              totalCount: (prev[q.targetWordId]?.totalCount || 0) + 1
            }
          }));
        }

        const updatedAnswers = {
          ...soloPlayer.answers,
          [localQuestionIndex]: {
            questionIndex: localQuestionIndex,
            optionId: chosenOptionId || '',
            isCorrect,
            timeTakenMs: safeTimeTaken,
            pointsEarned
          }
        };

        const updatedPlayer: QuizPlayer = {
          ...soloPlayer,
          score: soloPlayer.score + pointsEarned,
          currentStreak: newStreak,
          maxStreak: newMaxStreak,
          correctCount: newCorrectCount,
          totalAnswered: (soloPlayer.totalAnswered || 0) + 1,
          fastestTimeMs: newFastestTime,
          answers: updatedAnswers,
          lastAnswer: {
            optionId: chosenOptionId || '',
            isCorrect,
            pointsEarned,
            timeTakenMs: safeTimeTaken
          }
        };
        setSoloPlayer(updatedPlayer);
      }
      setStep('REVEAL');
    }
  }, [step, settings?.deliveryStream, settings?.recallDelaySeconds, revealAnswer, questions, localQuestionIndex, soloSelectedOptionId, soloSelectedTimeTakenMs, soloPlayer]);

  // Next after Reveal
  const handleNextFromReveal = useCallback(async () => {
    isSoloRevealingRef.current = false;
    soloSelectionRef.current = null;
    if (settings?.deliveryStream === 'STREAM_B_MULTIPLAYER') {
      await showLeaderboard();
    } else {
      if (localQuestionIndex + 1 >= questions.length) {
        if (settings) {
          const awards = calculateClassroomAwards(
            { [soloPlayer.id]: soloPlayer },
            questions,
            settings.awardToggles,
            Object.keys(soloTroubleWords)
          );
          setCalculatedAwards(awards);
        }
        setStep('GAME_OVER');
      } else {
        const nextIdx = localQuestionIndex + 1;
        setQuestions(prev => {
          const updated = [...prev];
          if (updated[nextIdx]) {
            updated[nextIdx] = { ...updated[nextIdx], startTime: getServerTime() };
          }
          return updated;
        });
        setSoloSelectedOptionId(null);
        setSoloSelectedTimeTakenMs(null);
        setSoloResponses({});
        setLocalQuestionIndex(nextIdx);
        setStep('QUESTION');
      }
    }
  }, [settings, showLeaderboard, localQuestionIndex, questions, soloPlayer, soloTroubleWords]);

  // Next from Leaderboard
  const handleNextFromLeaderboard = useCallback(async () => {
    const nextIdx = (room ? room.currentQuestionIndex : localQuestionIndex) + 1;
    const totalQ = questions.length;

    if (nextIdx >= totalQ) {
      let finalAwards: ClassroomAward[] = [];
      if (settings) {
        const troubleIds = computeTroubleWordIds(room?.players || {}, questions, room?.troubleWords);
        finalAwards = calculateClassroomAwards(
          room?.players || {},
          questions,
          settings.awardToggles,
          troubleIds
        );
        setCalculatedAwards(finalAwards);
      }

      if (settings?.deliveryStream === 'STREAM_B_MULTIPLAYER') {
        await endGame(finalAwards);
      } else {
        setStep('GAME_OVER');
      }
    } else {
      if (settings?.deliveryStream === 'STREAM_B_MULTIPLAYER') {
        await nextQuestion(nextIdx);
      } else {
        setQuestions(prev => {
          const updated = [...prev];
          if (updated[nextIdx]) {
            updated[nextIdx] = { ...updated[nextIdx], startTime: getServerTime() };
          }
          return updated;
        });
        setLocalQuestionIndex(nextIdx);
        setStep('QUESTION');
      }
    }
  }, [room, localQuestionIndex, questions, settings, endGame, nextQuestion]);

  // Finish Sprint Race
  const handleFinishSprintRace = useCallback(async (podium: PodiumFinisher[]) => {
    let finalAwards: ClassroomAward[] = [];
    if (settings) {
      const troubleIds = computeTroubleWordIds(room?.players || {}, questions, room?.troubleWords);
      finalAwards = calculateClassroomAwards(
        room?.players || {},
        questions,
        settings.awardToggles,
        troubleIds
      );
      setCalculatedAwards(finalAwards);
    }
    await endSprintRace(podium, finalAwards);
    setStep('GAME_OVER');
  }, [settings, room, questions, endSprintRace]);

  // Play Again Same
  const handlePlayAgainSame = useCallback(async () => {
    if (!settings) return;
    let generated: QuizQuestion[] = [];
    if (settings.subject === 'MATH') {
      const mathGrade = (settings.mathGrade as MathGrade) || 'G1';
      const mathDomain = (settings.mathDomain as MathDomain) || 'ALL';
      const count = (settings.gamePlayType === 'GRAND_PRIX_3D' || settings.gamePlayType === 'TUG_OF_WAR' || settings.gamePlayType === 'VOLLEYBALL')
        ? 60
        : (settings.questionCount === -1 ? 40 : settings.questionCount);
      generated = generateMathQuestions({
        grade: mathGrade,
        domain: mathDomain,
        topicId: settings.mathTopicId,
        questionCount: count,
        timeLimitMs: (settings.timeLimitSeconds || 15) * 1000
      });
    } else {
      const poolToUse = settings.customWordPool && settings.customWordPool.length > 0
        ? settings.customWordPool
        : wordPool;
      generated = generateQuizQuestions(poolToUse, settings, activeGrade, gradeWords);
    }

    if (generated.length === 0) {
      alert('問題の作成に失敗しました。');
      return;
    }

    const timed = [...generated];
    if (timed[0]) {
      timed[0] = { ...timed[0], startTime: getServerTime() };
    }
    setQuestions(timed);
    setLocalQuestionIndex(0);

    nextTrack();

    if (settings.deliveryStream === 'STREAM_B_MULTIPLAYER' && roomCode) {
      const success = await resetRoomForNewRound(timed, true);
      if (success) {
        setStep('LOBBY');
      } else {
        alert('再戦の初期化に失敗しました。');
      }
    } else {
      isSoloRevealingRef.current = false;
      soloSelectionRef.current = null;
      setSoloPlayer(createInitialSoloPlayer());
      setSoloSelectedOptionId(null);
      setSoloSelectedTimeTakenMs(null);
      setSoloResponses({});
      setSoloTroubleWords({});
      setStep('QUESTION');
    }
  }, [settings, wordPool, activeGrade, gradeWords, roomCode, resetRoomForNewRound, createInitialSoloPlayer, nextTrack]);

  // Trouble Words Rematch
  const handleTroubleWordsRematch = useCallback(async () => {
    if (!settings) return;
    const troubleSource = (settings.deliveryStream === 'STREAM_B_MULTIPLAYER' && room?.troubleWords)
      ? room.troubleWords
      : soloTroubleWords;

    const troubleEntries = Object.entries(troubleSource);
    if (troubleEntries.length === 0) {
      alert(settings.subject === 'MATH' ? '苦手な問題はありませんでした！' : '苦手単語はありませんでした！');
      return;
    }

    const troubleIds = new Set(troubleEntries.map(([id]) => id));
    const isContinuousArcade =
      settings.gamePlayType === 'GRAND_PRIX_3D' ||
      settings.gamePlayType === 'SPRINT_RACE' ||
      settings.gamePlayType === 'TUG_OF_WAR' ||
      settings.gamePlayType === 'VOLLEYBALL';

    // Handle Math Mode Rematch: generate fresh procedural numbers for the missed topics!
    if (settings.subject === 'MATH') {
      const troubleMathQuestions = questions.filter(q => troubleIds.has(q.targetWordId));
      if (troubleMathQuestions.length > 0) {
        const targetCount = isContinuousArcade
          ? 40
          : Math.max(5, troubleMathQuestions.length);
        const rematchQuestions: QuizQuestion[] = [];
        for (let i = 0; i < targetCount; i++) {
          const sourceQ = troubleMathQuestions[i % troubleMathQuestions.length];
          const freshBatch = generateMathQuestions({
            grade: (sourceQ.mathGrade as MathGrade) || (settings.mathGrade as MathGrade) || 'G3',
            domain: (sourceQ.mathDomain as MathDomain) || 'ALL',
            topicId: sourceQ.mathTopicId,
            questionCount: 1,
            timeLimitMs: (settings.timeLimitSeconds || 15) * 1000,
          });
          if (freshBatch[0]) {
            rematchQuestions.push({
              ...freshBatch[0],
              questionIndex: i,
              totalQuestions: targetCount,
              startTime: i === 0 ? getServerTime() : 0,
            });
          }
        }
        if (rematchQuestions.length > 0) {
          const rematchSettings: QuizHostSettings = {
            ...settings,
            questionCount: rematchQuestions.length
          };
          setQuestions(rematchQuestions);
          setLocalQuestionIndex(0);
          nextTrack();
          if (settings.deliveryStream === 'STREAM_B_MULTIPLAYER' && roomCode) {
            const success = await resetRoomForNewRound(rematchQuestions, true, rematchSettings);
            if (success) {
              setStep('LOBBY');
            } else {
              alert('リマッチの初期化に失敗しました。');
            }
          } else {
            isSoloRevealingRef.current = false;
            soloSelectionRef.current = null;
            setSoloPlayer(createInitialSoloPlayer());
            setSoloSelectedOptionId(null);
            setSoloSelectedTimeTakenMs(null);
            setSoloResponses({});
            setSoloTroubleWords({});
            setStep('QUESTION');
          }
          return;
        }
      }
    }

    const troubleEnglishSet = new Set(troubleEntries.map(([_, tw]) => tw.english.toLowerCase()));

    let troublePool = wordPool.filter(w => troubleIds.has(w.id) || troubleEnglishSet.has(w.english.toLowerCase()));
    if (troublePool.length < troubleEntries.length) {
      const missing = gradeWords.filter(w => 
        (troubleIds.has(w.id) || troubleEnglishSet.has(w.english.toLowerCase())) &&
        !troublePool.some(p => p.id === w.id)
      );
      troublePool = [...troublePool, ...missing];
    }

    const rematchQuestionCount = isContinuousArcade
      ? Math.max(30, troublePool.length * 5)
      : Math.max(5, troublePool.length);

    const rematchSettings: QuizHostSettings = {
      ...settings,
      questionCount: rematchQuestionCount
    };

    const generated = generateQuizQuestions(
      troublePool,
      rematchSettings,
      activeGrade,
      wordPool.length >= 4 ? wordPool : gradeWords
    );

    if (generated.length === 0) {
      alert('苦手単語クイズの作成に失敗しました。');
      return;
    }

    const timed = [...generated];
    if (timed[0]) {
      timed[0] = { ...timed[0], startTime: getServerTime() };
    }
    setQuestions(timed);
    setLocalQuestionIndex(0);

    nextTrack();

    if (settings.deliveryStream === 'STREAM_B_MULTIPLAYER' && roomCode) {
      const success = await resetRoomForNewRound(timed, true, { questionCount: timed.length });
      if (success) {
        setStep('LOBBY');
      } else {
        alert('リマッチの初期化に失敗しました。');
      }
    } else {
      isSoloRevealingRef.current = false;
      soloSelectionRef.current = null;
      setSoloPlayer(createInitialSoloPlayer());
      setSoloSelectedOptionId(null);
      setSoloSelectedTimeTakenMs(null);
      setSoloResponses({});
      setSoloTroubleWords({});
      setStep('QUESTION');
    }
  }, [settings, room?.troubleWords, soloTroubleWords, wordPool, gradeWords, activeGrade, roomCode, resetRoomForNewRound, createInitialSoloPlayer, nextTrack]);

  // Change settings flow from Game Over
  const handlePlayAgainChange = useCallback(() => {
    if (roomCode) {
      closeRoom();
      setRoomCode(null);
    }
    setIsEditingLobby(false);
    setStep('SETUP');
  }, [roomCode, closeRoom]);

  // Exit Quiz
  const handleExit = useCallback(async () => {
    if (roomCode) {
      if (!window.confirm('アクティブなクイズルームがあります。終了して解散しますか？\n（参加中の生徒の端末は終了画面に移行します）')) {
        return;
      }
      clearBots();
      await closeRoom();
      setRoomCode(null);
    }
    onExit();
  }, [roomCode, clearBots, closeRoom, onExit]);

  const handleExitRef = useRef(handleExit);
  handleExitRef.current = handleExit;

  useEffect(() => {
    if (onRegisterExit) {
      onRegisterExit(() => handleExitRef.current());
      return () => {
        onRegisterExit(null);
      };
    }
  }, [onRegisterExit]);

  const currentQIndex = settings?.deliveryStream === 'STREAM_B_MULTIPLAYER' && room
    ? room.currentQuestionIndex
    : localQuestionIndex;

  const currentQuestion = (settings?.deliveryStream === 'STREAM_B_MULTIPLAYER' && room?.currentQuestion)
    ? room.currentQuestion
    : (questions[currentQIndex] || questions[0]);

  return (
    <div className={`w-full flex-1 flex flex-col items-center relative ${
      step === 'LOBBY' || step === 'QUESTION' || step === 'REVEAL' || step === 'LEADERBOARD' || step === 'SPRINT_RACE' || step === 'GRAND_PRIX_3D'
        ? 'h-[calc(100dvh-3.75rem)] max-h-[calc(100dvh-3.75rem)] justify-between p-0 overflow-hidden'
        : 'justify-start py-2 sm:py-4'
    }`}>
      {step === 'SETUP' && (
        <QuizHostSetup
          onStart={handleStartSetup}
          onCancel={handleCancelSetup}
          isStudentHost={isStudentHost}
        />
      )}

      {/* 3D Suzuka Grand Prix Persistent Stage (Hot Pre-Warm in Lobby -> 0ms Instant Race Start!) */}
      {(room?.gamePlayType === 'GRAND_PRIX_3D' || settings?.gamePlayType === 'GRAND_PRIX_3D' || room?.gamePlayType === 'SPRINT_RACE' || settings?.gamePlayType === 'SPRINT_RACE') &&
        (step === 'LOBBY' || step === 'GRAND_PRIX_3D' || step === 'SPRINT_RACE') && (
          <QuizHostGrandPrix3D
            key={`gp3d-host-session-${roomCode || 'GP3D'}`}
            roomCode={roomCode || 'GP3D'}
            questions={questions}
            players={room?.players || {}}
            raceStartTime={room?.raceStartTime || Date.now()}
            sprintSettings={room?.sprintSettings || settings?.sprintSettings}
            raceFinishGraceStartTime={room?.raceFinishGraceStartTime}
            isLobby={step === 'LOBBY'}
            eyesUp={room?.eyesUp}
            onToggleEyesUp={() => toggleEyesUp()}
            onTriggerGrace={triggerSprintGraceCountdown}
            onFinishRace={handleFinishSprintRace}
            onExit={handleExit}
            onAddBots={addBots}
            bgmTrackTitle={currentTrackTitle}
            isBgmMuted={isBgmMuted}
            onToggleBgmMute={toggleBgmMute}
          />
        )}

      {step === 'LOBBY' && roomCode && (
        <div className="relative z-20 w-full h-full min-h-0 flex-1 flex flex-col items-center overflow-hidden">
          <QuizHostLobby
            roomCode={roomCode}
            grade={activeGrade}
            unit={activeUnit}
            subject={room?.subject || settings?.subject}
            mathGrade={room?.mathGrade || settings?.mathGrade}
            mathDomain={room?.mathDomain || settings?.mathDomain}
            schoolId={room?.schoolId}
            classId={room?.classId}
            isStudentHost={isStudentHost || !!room?.isStudentHost}
            gameMode={room?.mode || settings?.gameMode}
            gamePlayType={room?.gamePlayType || settings?.gamePlayType}
            teamAssignment={room?.teamAssignment || settings?.teamAssignment}
            teamCount={room?.teamCount || settings?.teamCount}
            activeTeams={room?.activeTeams || settings?.activeTeams}
            vocabularyScope={room?.vocabularyScope || settings?.vocabularyScope}
            selectedUnits={room?.selectedUnits || settings?.selectedUnits}
            players={room?.players || {}}
            botCount={botCount}
            onAddBots={addBots}
            onClearBots={clearBots}
            onStart={handleStartFromLobby}
            onEditSettings={handleEditSettingsFromLobby}
            onKickPlayer={kickPlayer}
            onChangePlayerTeam={changePlayerTeam}
            eyesUp={room?.eyesUp}
            onToggleEyesUp={toggleEyesUp}
            onCancel={handleExit}
          />
        </div>
      )}





      {step === 'TUG_OF_WAR' && (
        <QuizHostTugOfWar
          key={`tug-host-${room?.tugOfWarRound || 1}-${room?.tugOfWarStartTime || 'active'}`}
          roomCode={roomCode || 'TUG'}
          questions={questions}
          players={room?.players || {}}
          raceStartTime={room?.tugOfWarStartTime || room?.raceStartTime || Date.now()}
          tugOfWarSettings={room?.tugOfWarSettings || settings?.tugOfWarSettings}
          currentRound={room?.tugOfWarRound || 1}
          roundWins={room?.tugOfWarRoundWins || { team_red: 0, team_white: 0 }}
          baselinePulls={room?.tugOfWarBaselinePulls || {}}
          eyesUp={room?.eyesUp}
          onToggleEyesUp={toggleEyesUp}
          onFreezeTugOfWar={freezeTugOfWar}
          onNextRound={nextTugOfWarRound}
          onFinishTugOfWar={async (winner) => {
            let finalAwards: ClassroomAward[] = [];
            if (settings) {
              const troubleIds = computeTroubleWordIds(room?.players || {}, questions, room?.troubleWords);
              finalAwards = calculateClassroomAwards(
                room?.players || {},
                questions,
                settings.awardToggles,
                troubleIds
              );
              setCalculatedAwards(finalAwards);
            }
            await endTugOfWar(finalAwards);
            setStep('GAME_OVER');
          }}
          onExit={handleExit}
          onAddBots={addBots}
          onDuckBGM={duckBGM}
          onSpeedUpBGM={speedUpBGM}
          onSetBgmPlaybackRate={setBgmPlaybackRate}
          bgmPlaybackRate={bgmPlaybackRate}
          bgmTrackTitle={currentTrackTitle}
          isBgmMuted={isBgmMuted}
          onToggleBgmMute={toggleBgmMute}
        />
      )}

      {step === 'VOLLEYBALL' && (
        <QuizHostVolleyball
          key={`volleyball-host-${room?.volleyballStartTime || 'active'}`}
          roomCode={roomCode || 'VOLLEY'}
          questions={questions}
          players={room?.players || {}}
          raceStartTime={room?.volleyballStartTime || room?.raceStartTime || Date.now()}
          volleyballSettings={room?.volleyballSettings || settings?.volleyballSettings}
          eyesUp={room?.eyesUp}
          onToggleEyesUp={toggleEyesUp}
          onFreezeVolleyball={freezeVolleyball}
          onFinishVolleyball={async (winner) => {
            let finalAwards: ClassroomAward[] = [];
            if (settings) {
              const troubleIds = computeTroubleWordIds(room?.players || {}, questions, room?.troubleWords);
              finalAwards = calculateClassroomAwards(
                room?.players || {},
                questions,
                settings.awardToggles,
                troubleIds
              );
              setCalculatedAwards(finalAwards);
            }
            await endVolleyball(finalAwards);
            setStep('GAME_OVER');
          }}
          onExit={handleExit}
          onAddBots={addBots}
          bgmTrackTitle={currentTrackTitle}
          isBgmMuted={isBgmMuted}
          onToggleBgmMute={toggleBgmMute}
        />
      )}

      {step === 'QUESTION' && currentQuestion && (
        <QuizHostQuestion
          roomCode={roomCode || 'WARMUP'}
          question={currentQuestion}
          totalQuestions={questions.length}
          players={isStreamA ? { [soloPlayer.id]: soloPlayer } : (room?.players || {})}
          responses={isStreamA ? soloResponses : (room?.responses || {})}
          recallDelaySeconds={room?.recallDelaySeconds || settings?.recallDelaySeconds}
          eliminateDistractors={room?.eliminateDistractors ?? settings?.eliminateDistractors}
          distractorEliminationMode={room?.distractorEliminationMode ?? settings?.distractorEliminationMode}
          onTimeExpired={handleRevealAnswer}
          onManualReveal={handleRevealAnswer}
          onExit={handleExit}
          isSolo={isStreamA}
          soloPlayer={isStreamA ? soloPlayer : undefined}
          selectedOptionId={isStreamA ? soloSelectedOptionId : null}
          onSelectOption={handleSoloSelectOption}
          onDuckBGM={duckBGM}
        />
      )}

      {step === 'REVEAL' && currentQuestion && (
        <QuizHostReveal
          question={currentQuestion}
          totalQuestions={questions.length}
          players={isStreamA ? { [soloPlayer.id]: soloPlayer } : (room?.players || {})}
          responses={isStreamA ? soloResponses : (room?.responses || {})}
          onNext={handleNextFromReveal}
          onExit={handleExit}
          isSolo={isStreamA}
          soloPlayer={isStreamA ? soloPlayer : undefined}
          onDuckBGM={duckBGM}
        />
      )}

      {step === 'LEADERBOARD' && (
        <QuizHostLeaderboard
          players={isStreamA ? { [soloPlayer.id]: soloPlayer } : (room?.players || {})}
          gameMode={room?.mode || settings?.gameMode}
          teamScores={room?.teamScores}
          questionIndex={currentQIndex}
          totalQuestions={questions.length}
          onNext={handleNextFromLeaderboard}
          onExit={handleExit}
        />
      )}

      {step === 'GAME_OVER' && (
        <QuizHostGameOver
          players={isStreamA ? { [soloPlayer.id]: soloPlayer } : (room?.players || {})}
          awards={room?.awardedBadges || calculatedAwards}
          troubleWords={isStreamA ? soloTroubleWords : (room?.troubleWords || {})}
          questions={questions}
          schoolId={room?.schoolId}
          classId={room?.classId}
          gameMode={room?.mode || settings?.gameMode}
          teamScores={room?.teamScores}
          boundStudents={room?.boundStudents}
          onReleaseBoundNumber={handleReleaseBoundNumber}
          onPlayAgainSame={handlePlayAgainSame}
          onPlayAgainChange={handlePlayAgainChange}
          onTroubleWordsRematch={handleTroubleWordsRematch}
          onExit={handleExit}
          gamePlayType={room?.gamePlayType || settings?.gamePlayType}
          sprintSettings={room?.sprintSettings || settings?.sprintSettings}
          podiumFinishers={room?.podiumFinishers}
          onDuckBGM={duckBGM}
          isSolo={isStreamA}
          soloPlayer={isStreamA ? soloPlayer : undefined}
          analytics={room?.analytics}
        />
      )}

      {/* Floating Attention Lock / "Eyes Up Front" Pill for Classroom Host (hidden in Lobby, Sprint, 3D Grand Prix, Tug of War & Volleyball where it is in the header) */}
      {roomCode && step !== 'SETUP' && step !== 'LOBBY' && step !== 'SPRINT_RACE' && step !== 'GRAND_PRIX_3D' && step !== 'TUG_OF_WAR' && step !== 'VOLLEYBALL' && (
        <button
          type="button"
          onClick={() => toggleEyesUp()}
          className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-2xl font-black text-xs sm:text-sm transition-all duration-200 border-2 active:scale-95 cursor-pointer print:hidden ${
            room?.eyesUp
              ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/50 animate-pulse'
              : 'bg-slate-900/90 dark:bg-slate-800/90 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
          }`}
          title={room?.eyesUp ? 'Dismiss Eyes Up (注目解除)' : 'Lock Attention: Eyes Up Front (全員注目！)'}
        >
          <span className="text-base sm:text-lg">👀</span>
          <span>{room?.eyesUp ? '注目ロック中 (Eyes Up ON)' : '全員注目 (Eyes Up)'}</span>
        </button>
      )}

      {/* Floating High-Energy BGM Control Pill for Classroom Host (hidden in Sprint, 3D Grand Prix, Tug of War & Volleyball modes since it is pinned in the top header) */}
      {hasTrack && step !== 'SETUP' && step !== 'SPRINT_RACE' && step !== 'GRAND_PRIX_3D' && step !== 'TUG_OF_WAR' && step !== 'VOLLEYBALL' && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-slate-900 dark:bg-slate-800 text-white px-3.5 py-2 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 print:hidden">
          <Music size={15} className={`text-indigo-400 ${!isBgmMuted && isBgmPlaying ? 'animate-bounce' : ''}`} />
          <span className="text-xs font-bold max-w-[130px] truncate">
            {currentTrackTitle || 'BGM'}
          </span>
          <button
            type="button"
            onClick={toggleBgmMute}
            className={`p-1.5 rounded-xl transition-all ${
              isBgmMuted
                ? 'bg-rose-500/30 text-rose-400 hover:bg-rose-500/50'
                : 'bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50'
            }`}
            title={isBgmMuted ? 'Unmute BGM (BGMを再生)' : 'Mute BGM (BGMを消音)'}
          >
            {isBgmMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      )}
    </div>
  );
};