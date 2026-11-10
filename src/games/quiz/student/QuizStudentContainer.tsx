import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuizRoom } from '../useQuizRoom';
import { getServerTime, safeGet } from '@/services/rtdbSafe';
import { TeamId, QuizQuestion, QuizResponse } from '../types';
import { QuizStudentJoin } from './QuizStudentJoin';
import { QuizStudentLobby } from './QuizStudentLobby';
import { QuizStudentQuestion } from './QuizStudentQuestion';
import { QuizStudentFeedback } from './QuizStudentFeedback';
import { QuizStudentGameOver } from './QuizStudentGameOver';
import { QuizStudentGrandPrix3D } from './QuizStudentGrandPrix3D';
import { QuizStudentTugOfWar } from './QuizStudentTugOfWar';
import { QuizStudentVolleyball } from './QuizStudentVolleyball';
import { Trophy, ArrowLeft, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';

interface QuizStudentContainerProps {
  initialPin?: string;
  onExit: () => void;
}

export const QuizStudentContainer: React.FC<QuizStudentContainerProps> = ({
  initialPin = '',
  onExit
}) => {
  const { t } = useLanguage();
  const [pin, setPin] = useState<string | null>(() => {
    if (initialPin) return initialPin;
    try {
      return localStorage.getItem('activeQuizRoomCode') || sessionStorage.getItem('activeQuizRoomCode') || null;
    } catch {
      return null;
    }
  });
  const [playerId, setPlayerId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('activeQuizPlayerId') || sessionStorage.getItem('activeQuizPlayerId') || null;
    } catch {
      return null;
    }
  });
  const [nickname, setNickname] = useState<string | null>(() => {
    try {
      return localStorage.getItem('activeQuizNickname') || sessionStorage.getItem('activeQuizNickname') || null;
    } catch {
      return null;
    }
  });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answeredQuestionIndex, setAnsweredQuestionIndex] = useState<number | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const questionReceivedAtRef = React.useRef<number>(Date.now());
  const lastSeenQuestionIndexRef = React.useRef<number | null>(null);

  const {
    room,
    loading,
    error: roomError,
    joinRoom,
    updateKartTheme,
    updatePlayerProfile,
    submitAnswer,
    submitSprintAnswer,
    leaveRoom,
    claimRoomAttendanceNumber
  } = useQuizRoom(pin || undefined, { isStudent: true, playerId: playerId || undefined });

  // Automatically engage Quiet Classroom Mode while in multiplayer student mode
  // (caps iPad tap sounds to 0.04 whisper and keeps teacher/TV audio dominant)
  useEffect(() => {
    soundEffects.setQuietClassroomMode(true);
    return () => {
      soundEffects.setQuietClassroomMode(false);
    };
  }, []);

  // Check if player was kicked by host
  useEffect(() => {
    if (playerId && room && room.players && !room.players[playerId]) {
      setJoinError(t('You were removed by the teacher. Please join again.', '先生によって退室させられました。もう一度参加してください。'));
      try {
        localStorage.removeItem('activeQuizRoomCode');
        localStorage.removeItem('activeQuizPlayerId');
        localStorage.removeItem('activeQuizNickname');
        sessionStorage.removeItem('activeQuizRoomCode');
        sessionStorage.removeItem('activeQuizPlayerId');
        sessionStorage.removeItem('activeQuizNickname');
      } catch {}
      setPlayerId(null);
      setPin(null);
      setSelectedOptionId(null);
    }
  }, [playerId, room, t]);

  // Clean up session if room is CLOSED
  useEffect(() => {
    if (room && room.status === 'CLOSED') {
      try {
        localStorage.removeItem('activeQuizRoomCode');
        localStorage.removeItem('activeQuizPlayerId');
        localStorage.removeItem('activeQuizNickname');
        sessionStorage.removeItem('activeQuizRoomCode');
        sessionStorage.removeItem('activeQuizPlayerId');
        sessionStorage.removeItem('activeQuizNickname');
      } catch {}
    }
  }, [room?.status]);

  // Handle joining a room
  const handleJoin = useCallback(async (code: string, nick: string, teamId?: TeamId, attendanceNumber?: number) => {
    setJoinError(null);
    const result = await joinRoom(code, nick, teamId, attendanceNumber);
    if (result.success && result.playerId) {
      setPin(code);
      setPlayerId(result.playerId);
      setNickname(nick);
      try {
        localStorage.setItem('activeQuizRoomCode', code);
        localStorage.setItem('activeQuizPlayerId', result.playerId);
        localStorage.setItem('activeQuizNickname', nick);
        sessionStorage.setItem('activeQuizRoomCode', code);
        sessionStorage.setItem('activeQuizPlayerId', result.playerId);
        sessionStorage.setItem('activeQuizNickname', nick);
      } catch {}
    } else {
      setJoinError(result.error || t('Could not enter the room. Please check the PIN.', '部屋に入れませんでした。PINコードを確認してください。'));
    }
  }, [joinRoom, t]);

  // Handle answering current question with client-side measured elapsed time
  const handleAnswer = useCallback(async (optionId: string) => {
    if (!playerId || !room || !room.currentQuestion) return;
    const hostStartTime = room.currentQuestion.startTime || 0;
    const timeLimit = room.currentQuestion.timeLimitMs || 15000;
    // Calculate server-synchronized elapsed time strictly against hostStartTime to prevent iPad sleep drift
    const clientTimeTakenMs = hostStartTime > 0
      ? Math.min(timeLimit, Math.max(100, getServerTime() - hostStartTime))
      : 1000;

    setSelectedOptionId(optionId);
    setAnsweredQuestionIndex(room.currentQuestionIndex);
    await submitAnswer(playerId, optionId, clientTimeTakenMs);
  }, [playerId, room, submitAnswer]);

  // Handle leaving
  const handleLeave = useCallback(async () => {
    if (playerId) {
      await leaveRoom(playerId);
    }
    try {
      localStorage.removeItem('activeQuizRoomCode');
      localStorage.removeItem('activeQuizPlayerId');
      localStorage.removeItem('activeQuizNickname');
      sessionStorage.removeItem('activeQuizRoomCode');
      sessionStorage.removeItem('activeQuizPlayerId');
      sessionStorage.removeItem('activeQuizNickname');
    } catch {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('pin');
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch {
      // Ignore
    }
    onExit();
  }, [playerId, leaveRoom, onExit]);

  // Reset or restore answer state when question changes.
  // Crucial: decoupled from classmate responses to avoid O(N^2) render storm!
  useEffect(() => {
    if (room && room.status === 'QUESTION') {
      if (lastSeenQuestionIndexRef.current !== room.currentQuestionIndex) {
        lastSeenQuestionIndexRef.current = room.currentQuestionIndex;
        questionReceivedAtRef.current = Date.now();

        const existingResp = playerId ? room.responses?.[playerId] : undefined;
        if (existingResp) {
          setSelectedOptionId(existingResp.answerId);
          setAnsweredQuestionIndex(room.currentQuestionIndex);
        } else if (playerId && pin) {
          safeGet<QuizResponse>(`roomResponses/${pin}/${playerId}`).then((r) => {
            if (r) {
              setSelectedOptionId(r.answerId);
              setAnsweredQuestionIndex(room.currentQuestionIndex);
            } else {
              setSelectedOptionId(null);
              setAnsweredQuestionIndex(null);
            }
          });
        } else {
          setSelectedOptionId(null);
          setAnsweredQuestionIndex(null);
        }
      }
    } else if (room && room.status !== 'QUESTION') {
      lastSeenQuestionIndexRef.current = null;
    }
  }, [room?.status, room?.currentQuestionIndex, playerId, pin]);

  // Resynchronize clock when iPad cover opens / tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        questionReceivedAtRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Normalize questions array unconditionally before any early returns (Rules of Hooks)
  const cachedQuestionsRef = React.useRef<{ key: string; list: QuizQuestion[] }>({ key: '', list: [] });
  const studentQuestions: QuizQuestion[] = useMemo(() => {
    if (!room?.questions) return [];
    const raw = room.questions;
    const entries = Array.isArray(raw) ? raw : (Object.values(raw) as QuizQuestion[]);
    const key = `${entries.length}_${entries[0]?.targetWordId || ''}_${entries[entries.length - 1]?.targetWordId || ''}`;
    if (key === cachedQuestionsRef.current.key && cachedQuestionsRef.current.list.length > 0) {
      return cachedQuestionsRef.current.list;
    }
    const list = [...entries].sort((a, b) => (a.questionIndex ?? 0) - (b.questionIndex ?? 0));
    cachedQuestionsRef.current = { key, list };
    return list;
  }, [room?.questions]);

  // If not joined yet or no player ID
  if (!playerId || !room) {
    if (loading && pin && playerId) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="text-4xl mb-3">🔄</div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              {t('Reconnecting...', '再接続中...')}
            </h2>
            <p className="text-xs font-bold text-slate-400">
              {t('Rejoining quiz room...', 'クイズルームに復帰しています...')}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <QuizStudentJoin
          initialPin={initialPin || pin || ''}
          onJoin={handleJoin}
          onCancel={onExit}
          loading={loading}
          error={joinError || roomError}
        />
      </div>
    );
  }

  // Active player in room
  const currentPlayer = room.players?.[playerId] || {
    id: playerId,
    nickname: nickname || 'Player',
    score: 0,
    currentStreak: 0,
    maxStreak: 0,
    correctCount: 0,
    totalAnswered: 0,
    fastestTimeMs: 999999,
    joinedAt: Date.now(),
    answers: {}
  };

  // If room was closed by teacher
  if (room.status === 'CLOSED') {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            {t('Room has ended', 'ルームが終了しました')}
          </h2>
          <p className="text-xs font-bold text-slate-400 mb-6">
            {t('The teacher has closed the quiz room. Great effort today!', '先生がクイズルームを終了しました。おつかれさまでした！')}
          </p>
          <button
            onClick={handleLeave}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-purple-600 hover:bg-purple-500 active:scale-98 transition-all"
          >
            {t('Return to Portal', 'ポータルにもどる')}
          </button>
        </div>
      </div>
    );
  }

  const isGameplayScreen = room.status === 'QUESTION' || room.status === 'REVEAL' || room.status === 'SPRINT_RACE' || room.status === 'GRAND_PRIX_3D' || room.status === 'TUG_OF_WAR' || room.status === 'VOLLEYBALL';

  // ==========================================================================
  // [ANTIGRAVITY REFACTOR]: Unified Arcade Answer & Telemetry Adapter Callback
  // WHAT CHANGED:
  // Consolidated 5 identical inline `onAnswer={async (...) => submitSprintAnswer(...)}`
  // closures (GrandPrix3D, GrandPrix3D 2D fallback, Sprint, TugOfWar, Volleyball)
  // into a single `handleArcadeAnswer` adapter handler.
  // WHY:
  // Eliminates ~115 lines of duplicated callback boilerplate in `QuizStudentContainer`
  // and ensures all arcade modes route through the 8 Hz spoke-throttled
  // `submitSprintAnswer` pipeline.
  // ==========================================================================
  const handleArcadeAnswer = async (
    questionIndex: number,
    optionId: string,
    isCorrect: boolean,
    timeTakenMs: number,
    pointsEarned: number,
    newSprintProgress: number,
    isFinished?: boolean,
    finishTimeMs?: number,
    cumulativeStats?: any,
    incorrectAttempts?: number
  ) => {
    if (!playerId) return;
    await submitSprintAnswer(
      playerId,
      questionIndex,
      optionId,
      isCorrect,
      timeTakenMs,
      pointsEarned,
      newSprintProgress,
      isFinished,
      finishTimeMs,
      cumulativeStats,
      incorrectAttempts
    );
  };

  return (
    <div className={`w-full bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center ${
      room.status === 'GRAND_PRIX_3D' || room.status === 'SPRINT_RACE'
        ? 'fixed inset-0 z-50 w-screen h-dvh max-h-dvh overflow-hidden p-0'
        : isGameplayScreen
        ? 'fixed inset-0 z-50 w-screen h-dvh max-h-dvh overflow-hidden p-1 sm:p-2'
        : 'min-h-screen p-2 sm:p-4'
    }}`}>
      {/* 3D Suzuka Grand Prix Mode (Direct 3D Stage on Race Start - Unified Grand Prix Experience) */}
      {(room.gamePlayType === 'GRAND_PRIX_3D' || room.gamePlayType === 'SPRINT_RACE') &&
        (room.status === 'GRAND_PRIX_3D' || room.status === 'SPRINT_RACE') &&
        studentQuestions.length > 0 && (
        <QuizStudentGrandPrix3D
          key={`gp3d-student-session-${room.code || 'GP3D'}-${room.raceStartTime || 'active'}`}
          player={currentPlayer}
          allPlayers={room.players || {}}
          questions={studentQuestions}
          sprintSettings={room.sprintSettings}
          raceStartTime={room.raceStartTime || Date.now()}
          raceFinishGraceStartTime={room.raceFinishGraceStartTime}
          isLobby={false}
          onAnswer={handleArcadeAnswer}
          onLeave={handleLeave}
        />
      )}

      {/* 1. Lobby Waiting */}
      {room.status === 'LOBBY' && (
        <div className="relative z-20 w-full flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
          <QuizStudentLobby
            roomCode={room.code}
            player={currentPlayer}
            gamePlayType={room.gamePlayType}
            sprintSettings={room.sprintSettings}
            totalQuestions={room.totalQuestions}
            totalStudents={Object.keys(room.players || {}).length}
            onLeave={handleLeave}
            onUpdateKartTheme={updateKartTheme}
            onUpdatePlayerProfile={updatePlayerProfile}
          />
        </div>
      )}

      {/* 2a. Tug of War Mode (Strategy Adapter) */}
      {room.status === 'TUG_OF_WAR' && studentQuestions.length > 0 && (
        <QuizStudentTugOfWar
          key={`tug-${room.tugOfWarRound || 1}-${room.tugOfWarStartTime || 'active'}`}
          player={currentPlayer}
          questions={studentQuestions}
          raceStartTime={room.tugOfWarStartTime || room.raceStartTime || Date.now()}
          tugOfWarSettings={room.tugOfWarSettings}
          tugOfWarFinished={room.tugOfWarFinished}
          onAnswer={handleArcadeAnswer}
          onLeave={handleLeave}
        />
      )}

      {/* 2c. Volleyball Mode (Strategy Adapter) */}
      {room.status === 'VOLLEYBALL' && studentQuestions.length > 0 && (
        <QuizStudentVolleyball
          key={`volleyball-${room.volleyballStartTime || 'active'}`}
          player={currentPlayer}
          questions={studentQuestions}
          raceStartTime={room.volleyballStartTime || room.raceStartTime || Date.now()}
          volleyballSettings={room.volleyballSettings}
          volleyballFinished={room.volleyballFinished}
          volleyballLiveState={room.volleyballLiveState}
          onAnswer={handleArcadeAnswer}
          onLeave={handleLeave}
        />
      )}

      {/* 2d. Sprint/3D/Tug/Volleyball Loading Fallback */}
      {(room.status === 'SPRINT_RACE' || room.status === 'GRAND_PRIX_3D' || room.status === 'TUG_OF_WAR' || room.status === 'VOLLEYBALL') && studentQuestions.length === 0 && (
        <div className="w-full max-w-md mx-auto p-6 text-center select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-indigo-200 dark:border-indigo-900 flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl text-3xl font-black animate-bounce">
              🚩
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              {t('Preparing match...', 'じゅんび中...')}
            </h2>
            <p className="text-xs font-bold text-slate-400 animate-pulse">
              {t('Loading questions. Please wait a moment...', 'もんだいを読み込んでいます。少々おまちください...')}
            </p>
          </div>
        </div>
      )}

      {/* 3. Classic Question View */}
      {room.status === 'QUESTION' && room.currentQuestion && (
        <QuizStudentQuestion
          question={room.currentQuestion}
          ipadDisplayMode={room.ipadDisplayMode || 'EYES_UP'}
          teamId={currentPlayer.teamId}
          recallDelaySeconds={room.recallDelaySeconds}
          eliminateDistractors={room.eliminateDistractors}
          distractorEliminationMode={room.distractorEliminationMode}
          onAnswer={handleAnswer}
          alreadyAnsweredId={
            answeredQuestionIndex === room.currentQuestionIndex ? selectedOptionId || undefined : undefined
          }
          answeredCount={Object.keys(room.responses || {}).length}
          totalStudents={Object.keys(room.players || {}).length}
          playerAvatar={currentPlayer.avatar || '🐼'}
        />
      )}

      {/* 3b. Classic Question Loading Fallback */}
      {room.status === 'QUESTION' && !room.currentQuestion && (
        <div className="w-full max-w-md mx-auto p-6 text-center select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-purple-200 dark:border-purple-900 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto mb-4 text-2xl font-black animate-spin">
              ❓
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              {t('Preparing question...', 'もんだいをじゅんび中...')}
            </h2>
            <p className="text-xs font-bold text-slate-400">
              {t('Waiting for teacher’s signal', '先生の合図をまっています')}
            </p>
          </div>
        </div>
      )}

      {/* 3. Reveal Feedback View */}
      {room.status === 'REVEAL' && (
        <QuizStudentFeedback
          player={currentPlayer}
          allPlayers={room.players || {}}
          question={room.currentQuestion}
        />
      )}

      {/* 4. Leaderboard View on iPad */}
      {room.status === 'LEADERBOARD' && (
        <div className="w-full max-w-md mx-auto p-6 text-center select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-slate-100 dark:border-slate-800">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl text-3xl font-black animate-pulse">
              🏆
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">
              {t('LEADERBOARD', 'ランキング')}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
              {t('Look at the front TV!', '前のテレビに注目！')}
            </h2>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 mb-6">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">{t('Current Score', '現在のスコア')}</span>
              <strong className="text-3xl font-black text-amber-600 dark:text-amber-300">
                {currentPlayer.score.toLocaleString()} pts
              </strong>
            </div>
            <p className="text-xs font-bold text-slate-400 animate-pulse">
              {t('Waiting for teacher to advance to next question...', '先生が次の問題へ進むのを待っています...')}
            </p>
          </div>
        </div>
      )}

      {/* 5. Game Over View */}
      {room.status === 'GAME_OVER' && (
        <QuizStudentGameOver
          player={currentPlayer}
          allPlayers={room.players || {}}
          awards={room.awardedBadges}
          questions={room.questions}
          totalQuestions={room.totalQuestions}
          roomCode={pin || room.code}
          schoolId={room.schoolId}
          classId={room.classId}
          recordRoster={room.recordRoster !== false}
          boundStudents={room.boundStudents}
          onClaimRoomNumber={claimRoomAttendanceNumber}
          onExit={handleLeave}
          sprintSettings={room.sprintSettings}
          podiumFinishers={room.podiumFinishers}
          gamePlayType={room.gamePlayType}
        />
      )}

      {/* Fallback for unrecognized status to prevent blank screen */}
      {!['LOBBY', 'SPRINT_RACE', 'GRAND_PRIX_3D', 'TUG_OF_WAR', 'VOLLEYBALL', 'QUESTION', 'REVEAL', 'LEADERBOARD', 'GAME_OVER', 'CLOSED'].includes(room.status) && (
        <QuizStudentLobby
          roomCode={room.code}
          player={currentPlayer}
          gamePlayType={room.gamePlayType}
          sprintSettings={room.sprintSettings}
          totalQuestions={room.totalQuestions}
          onLeave={handleLeave}
        />
      )}

      {/* Eyes on Teacher (Attention Lock) Dimmer Overlay */}
      {room.eyesUp && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
          <div className="w-24 h-24 rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center text-5xl shadow-2xl mb-5 animate-bounce">
            👀
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            <ruby>前<rt className="text-[10px] font-normal text-amber-300">まえ</rt></ruby>を<ruby>見<rt className="text-[10px] font-normal text-amber-300">み</rt></ruby>てね！
          </h2>
          <p className="text-xl sm:text-2xl font-black text-amber-400 mb-3">
            Eyes Up Front!
          </p>
          <p className="text-base sm:text-lg font-bold text-slate-200 max-w-sm mt-1">
            <ruby>先生<rt className="text-[9px] font-normal text-slate-400">せんせい</rt></ruby>の<ruby>話<rt className="text-[9px] font-normal text-slate-400">はなし</rt></ruby>を<ruby>聞<rt className="text-[9px] font-normal text-slate-400">き</rt></ruby>こう 👨‍🏫
          </p>
          <span className="text-xs text-slate-500 font-medium mt-1">
            (Listen to Levi Sensei)
          </span>
        </div>
      )}
    </div>
  );
};
