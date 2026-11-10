import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QuizQuestion, QuizPlayer, OPTION_STYLES, TeamId, TEAM_PRESETS, SprintSettings, SprintCumulativeStats } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { RubyText } from '@/components/common/RubyText';
import { Flag, Clock, Flame, Volume2, Trophy, CheckCircle2, XCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { speechService } from '@/services/speechService';

interface QuizStudentSprintProps {
  player: QuizPlayer;
  questions: QuizQuestion[];
  sprintSettings?: SprintSettings;
  raceStartTime: number;
  raceFinishGraceStartTime?: number;
  onAnswer: (
    questionIndex: number,
    optionId: string,
    isCorrect: boolean,
    timeTakenMs: number,
    pointsEarned: number,
    nextIndex: number,
    isFinished?: boolean,
    finishTimeMs?: number,
    cumulativeStats?: SprintCumulativeStats
  ) => void;
  onLeave: () => void;
}

export const QuizStudentSprint: React.FC<QuizStudentSprintProps> = ({
  player,
  questions,
  sprintSettings,
  raceStartTime,
  raceFinishGraceStartTime,
  onAnswer,
  onLeave
}) => {
  const { t, language } = useLanguage();
  const { playWordAudio } = useAudio();
  const isTimeTrial = sprintSettings?.sprintMode === 'TIME_TRIAL';
  const totalQuestions = isTimeTrial
    ? questions.length
    : (sprintSettings?.lapCount === -1 ? questions.length : (sprintSettings?.lapCount || questions.length));

  // Race start procedure synchronized to greenFlagTime = raceStartTime + 3600
  const greenFlagTime = raceStartTime + 3600;

  // Local authoritative stats to ensure 0ms iPad latency and ZERO dropped score updates
  const [localScore, setLocalScore] = useState<number>(() => player.score || 0);
  const [localStreak, setLocalStreak] = useState<number>(() => player.currentStreak || 0);
  const [localMaxStreak, setLocalMaxStreak] = useState<number>(() => player.maxStreak || 0);
  const [localCorrectCount, setLocalCorrectCount] = useState<number>(() => player.correctCount || 0);
  const [localTotalAnswered, setLocalTotalAnswered] = useState<number>(() => player.totalAnswered || 0);
  const [localFastestTimeMs, setLocalFastestTimeMs] = useState<number>(() => player.fastestTimeMs || 999999);
  const [localIsFinished, setLocalIsFinished] = useState<boolean>(() => !!player.isFinished);
  const [localFinishTimeMs, setLocalFinishTimeMs] = useState<number | undefined>(() => player.finishTimeMs);

  // Sync with player prop if it has higher progress (e.g. reconnection)
  useEffect(() => {
    if (player.score && player.score > localScore) setLocalScore(player.score);
    if (player.currentStreak !== undefined && player.currentStreak > localStreak) setLocalStreak(player.currentStreak);
    if (player.maxStreak !== undefined && player.maxStreak > localMaxStreak) setLocalMaxStreak(player.maxStreak);
    if (player.correctCount !== undefined && player.correctCount > localCorrectCount) setLocalCorrectCount(player.correctCount);
    if (player.totalAnswered !== undefined && player.totalAnswered > localTotalAnswered) setLocalTotalAnswered(player.totalAnswered);
    if (player.fastestTimeMs !== undefined && player.fastestTimeMs < localFastestTimeMs) setLocalFastestTimeMs(player.fastestTimeMs);
    if (player.isFinished) setLocalIsFinished(true);
    if (player.finishTimeMs) setLocalFinishTimeMs(player.finishTimeMs);
  }, [player]);

  // Current lap / question index for this student
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (isTimeTrial) return player.sprintProgress || 0;
    return Math.min(player.sprintProgress || 0, totalQuestions);
  });

  const [feedback, setFeedback] = useState<{ optionId: string; isCorrect: boolean } | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<Set<string>>(new Set());
  const [penaltySecondsLeft, setPenaltySecondsLeft] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem('sprint_penalty_until');
      if (stored) {
        const remaining = (parseInt(stored, 10) - Date.now()) / 1000;
        if (remaining > 0) return parseFloat(remaining.toFixed(1));
      }
    } catch {}
    return 0;
  });
  const penaltyEndTimeRef = useRef<number>((() => {
    try {
      const stored = sessionStorage.getItem('sprint_penalty_until');
      if (stored) {
        const until = parseInt(stored, 10);
        if (until > Date.now()) return until;
      }
    } catch {}
    return 0;
  })());
  // ==========================================================================
  // [ANTIGRAVITY REFACTOR #1]: Default Pit Stop Penalty Floor Set to 2.5s
  // WHAT CHANGED: Defaulted `activePenaltyTotalSec` to `2.5` instead of `1.0`.
  // WHY: Per GEMINI.md §7, the 1st mistake penalty in Sprint is 2.5s (not 1.0s).
  // ==========================================================================
  const [activePenaltyTotalSec, setActivePenaltyTotalSec] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem('sprint_penalty_total');
      if (stored) return Math.max(2.5, parseFloat(stored) || 2.5);
    } catch {}
    return 2.5;
  });
  const questionMistakesRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(Date.now());
  const hasSubmittedFinalRef = useRef<boolean>(false);
  const hasResetQuestionZeroRef = useRef<boolean>(false);

  // High frequency render clock synchronized with server time for smooth stopwatch & progress
  const [nowTime, setNowTime] = useState<number>(() => getServerTime());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(getServerTime()), 50);
    return () => clearInterval(timer);
  }, []);

  // F1 start lights derived directly from elapsed server time
  const elapsedSinceStart = Math.max(0, nowTime - raceStartTime);
  const lightsCount = elapsedSinceStart >= 3600 ? 6 : Math.max(0, Math.floor(elapsedSinceStart / 600));
  const raceActive = elapsedSinceStart >= 3600;
  const showStartLights = elapsedSinceStart < 4800;

  // Crucial: When starting lights extinguish and race goes active (greenFlagTime),
  // reset questionStartTimeRef for Question 0 so the 3.6s starting countdown doesn't consume the speed bonus!
  useEffect(() => {
    if (raceActive && currentIndex === 0 && !hasResetQuestionZeroRef.current) {
      hasResetQuestionZeroRef.current = true;
      questionStartTimeRef.current = Date.now();
    }
  }, [raceActive, currentIndex]);

  // Sound effects on light changes
  const prevLightsRef = useRef<number>(lightsCount);
  useEffect(() => {
    if (lightsCount > prevLightsRef.current) {
      if (lightsCount <= 5 && lightsCount > 0) {
        soundEffects.playRaceCountdownBeep(false);
      } else if (lightsCount === 6) {
        soundEffects.playRaceCountdownBeep(true);
      }
      prevLightsRef.current = lightsCount;
    }
  }, [lightsCount]);

  // Pit stop penalty timer countdown using wall-clock time
  useEffect(() => {
    if (penaltySecondsLeft <= 0) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, parseFloat(((penaltyEndTimeRef.current - Date.now()) / 1000).toFixed(1)));
      setPenaltySecondsLeft(remaining);
      if (remaining <= 0) {
        try {
          sessionStorage.removeItem('sprint_penalty_until');
          sessionStorage.removeItem('sprint_penalty_total');
        } catch {}
        setIsAnswering(false);
        setFeedback(null);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [penaltySecondsLeft > 0]);

  const graceSeconds = sprintSettings?.graceCountdownSeconds || 15;
  const graceElapsed = raceFinishGraceStartTime ? nowTime - raceFinishGraceStartTime : 0;
  const graceLeft = raceFinishGraceStartTime ? Math.max(0, Math.ceil((graceSeconds * 1000 - graceElapsed) / 1000)) : graceSeconds;
  const isGraceActive = raceFinishGraceStartTime && graceLeft > 0;

  // Time Trial countdown: strictly starts when lights turn green (greenFlagTime)
  const timeLimitSeconds = sprintSettings?.timeLimitSeconds || 60;
  const elapsedRaceMs = raceActive ? Math.max(0, nowTime - greenFlagTime) : 0;
  const timeTrialRemainingSec = isTimeTrial
    ? (raceActive ? Math.max(0, Math.ceil((timeLimitSeconds * 1000 - elapsedRaceMs) / 1000)) : timeLimitSeconds)
    : 0;
  const isTimeTrialExpired = isTimeTrial && raceActive && timeTrialRemainingSec <= 0;

  // Active question
  const currentQuestion = questions[currentIndex % questions.length] || questions[0];

  const prevActiveIndexRef = useRef<number>(-1);

  // Auto-play audio if AUDIO_ONLY & reset question timer strictly on genuine question advancement
  useEffect(() => {
    if (prevActiveIndexRef.current === currentIndex) return;
    prevActiveIndexRef.current = currentIndex;

    questionStartTimeRef.current = Date.now();
    questionMistakesRef.current = 0;
    setActivePenaltyTotalSec(2.5);
    setFeedback(null);
    setIsAnswering(false);
    setEliminatedOptionIds(new Set());
    setPenaltySecondsLeft(0);

    if (currentQuestion && currentQuestion.promptType === 'AUDIO_ONLY') {
      playWordAudio(currentQuestion.promptSound, currentQuestion.targetWordEnglish);
    }
  }, [currentIndex, currentQuestion, playWordAudio]);

  // Safeguard: If all options somehow become eliminated, restore choices so student is never stuck
  useEffect(() => {
    if (eliminatedOptionIds.size >= currentQuestion.options.length && currentQuestion.options.length > 0) {
      setEliminatedOptionIds(new Set());
    }
  }, [eliminatedOptionIds.size, currentQuestion.options.length]);

  // Handle answer tap
  const handleSelect = (optionId: string) => {
    if (
      !raceActive ||
      isAnswering ||
      penaltySecondsLeft > 0 ||
      eliminatedOptionIds.has(optionId) ||
      player.isFinished ||
      localIsFinished ||
      (player.isDnf && !isTimeTrial) ||
      isTimeTrialExpired
    ) return;

    setIsAnswering(true);
    const elapsed = Date.now() - questionStartTimeRef.current;
    const timeTakenMs = Math.max(150, isNaN(elapsed) ? 2000 : elapsed);

    // Three-tier resilient matching: 1) correctOptionId 2) targetWordId 3) English lemma text
    const targetId = currentQuestion.correctOptionId || currentQuestion.targetWordId;
    const chosenOption = currentQuestion.options.find(o => o.id === optionId);
    const isMatchingId = Boolean(targetId && optionId === targetId);
    const isMatchingWord = Boolean(
      chosenOption?.english &&
      currentQuestion.targetWordEnglish &&
      chosenOption.english.trim().toLowerCase() === currentQuestion.targetWordEnglish.trim().toLowerCase()
    );
    const isCorrect = isMatchingId || isMatchingWord;

    if (isCorrect) {
      soundEffects.playCorrect();
      setFeedback({ optionId, isCorrect: true });

      // Calculate score with local authoritative state
      const newStreak = localStreak + 1;
      const newMaxStreak = Math.max(localMaxStreak, newStreak);
      const base = 1000;
      const streakBonus = Math.min(500, (newStreak - 1) * 100);
      const speedBonus = timeTakenMs < 1800 ? 250 : (timeTakenMs < 3000 ? 150 : 0);
      const pointsEarned = base + streakBonus + speedBonus;
      const newScore = localScore + pointsEarned;
      const newCorrectCount = localCorrectCount + 1;
      const newTotalAnswered = localTotalAnswered + 1;

      const newFastestTimeMs = Math.min(localFastestTimeMs, timeTakenMs);
      setLocalFastestTimeMs(newFastestTimeMs);

      const nextIndex = currentIndex + 1;
      const isFinished = !isTimeTrial && nextIndex >= totalQuestions;
      const finishTimeMs = isFinished ? Math.max(100, nowTime - greenFlagTime) : undefined;

      // Update local state immediately for 0ms visual responsiveness
      setLocalScore(newScore);
      setLocalStreak(newStreak);
      setLocalMaxStreak(newMaxStreak);
      setLocalCorrectCount(newCorrectCount);
      setLocalTotalAnswered(newTotalAnswered);

      if (isFinished) {
        soundEffects.playCheckeredFlag();
      } else if (newStreak >= 3) {
        soundEffects.playOvertake();
      }

      const cumulative: SprintCumulativeStats = {
        score: newScore,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        correctCount: newCorrectCount,
        totalAnswered: newTotalAnswered,
        fastestTimeMs: newFastestTimeMs
      };

      // Smooth 280ms feedback before loading next question or completing race
      setTimeout(() => {
        if (isFinished) {
          setLocalIsFinished(true);
          setLocalFinishTimeMs(finishTimeMs);
        }

        onAnswer(
          currentIndex,
          optionId,
          true,
          timeTakenMs,
          pointsEarned,
          nextIndex,
          isFinished,
          finishTimeMs,
          cumulative
        );

        if (!isFinished) {
          setCurrentIndex(nextIndex);
        }
      }, 280);
    } else {
      // INCORRECT ANSWER: Pit Stop / Spin Out Penalty!
      // Forward progress is BLOCKED - player stays on current lap!
      soundEffects.playIncorrect();
      setFeedback({ optionId, isCorrect: false });
      setEliminatedOptionIds(prev => new Set(prev).add(optionId));

      const newTotalAnswered = localTotalAnswered + 1;
      setLocalStreak(0);
      setLocalTotalAnswered(newTotalAnswered);

      // Escalating Penalty (GEMINI.md §7 Anti-Spam): 1st miss = 2.5s (Pit Stop), 2nd miss = 3.5s, 3rd miss = 5.0s (Full Service)
      const newMistakes = questionMistakesRef.current + 1;
      questionMistakesRef.current = newMistakes;
      const penaltySec = newMistakes === 1 ? 2.5 : (newMistakes === 2 ? 3.5 : 5.0);
      setActivePenaltyTotalSec(penaltySec);

      const penaltyEnd = Date.now() + Math.round(penaltySec * 1000);
      penaltyEndTimeRef.current = penaltyEnd;
      try {
        sessionStorage.setItem('sprint_penalty_until', penaltyEnd.toString());
        sessionStorage.setItem('sprint_penalty_total', penaltySec.toString());
      } catch {}
      setPenaltySecondsLeft(penaltySec);

      const cumulative: SprintCumulativeStats = {
        score: localScore,
        currentStreak: 0,
        maxStreak: localMaxStreak,
        correctCount: localCorrectCount,
        totalAnswered: newTotalAnswered,
        fastestTimeMs: localFastestTimeMs < 999999 ? localFastestTimeMs : undefined
      };

      // Report incorrect attempt to RTDB (sprintProgress stays at currentIndex)
      onAnswer(
        currentIndex,
        optionId,
        false,
        timeTakenMs,
        0,
        currentIndex,
        false,
        undefined,
        cumulative
      );
    }
  };

  // Automatically submit final cumulative stats and mark finished when Time Trial expires
  useEffect(() => {
    if (isTimeTrial && isTimeTrialExpired && !hasSubmittedFinalRef.current) {
      hasSubmittedFinalRef.current = true;
      const finalStats: SprintCumulativeStats = {
        score: localScore,
        currentStreak: localStreak,
        maxStreak: localMaxStreak,
        correctCount: localCorrectCount,
        totalAnswered: localTotalAnswered
      };
      onAnswer(
        currentIndex,
        '',
        false,
        0,
        0,
        currentIndex,
        true,
        timeLimitSeconds * 1000,
        finalStats
      );
    }
  }, [isTimeTrial, isTimeTrialExpired, localScore, localStreak, localMaxStreak, localCorrectCount, localTotalAnswered, currentIndex, timeLimitSeconds, onAnswer]);

  // If Time Trial expired
  if (isTimeTrialExpired) {
    const finalScore = Math.max(player.score || 0, localScore);
    const finalCorrect = Math.max(player.correctCount || 0, localCorrectCount);
    const finalTotal = Math.max(player.totalAnswered || 0, localTotalAnswered);
    const finalMaxStreak = Math.max(player.maxStreak || 0, localMaxStreak);
    const accuracyPct = finalTotal > 0
      ? Math.round((finalCorrect / finalTotal) * 100)
      : 0;

    return (
      <div className="w-full max-w-lg mx-auto p-4 text-center select-none animate-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-indigo-400 dark:border-indigo-500">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl text-4xl">
            ⏱️
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
            {t('TIME TRIAL COMPLETED', 'タイムアップ！')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4">
            {t('Time Trial Finished! Great Run!', 'タイムアタック終了！ナイスラン！')}
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block">{t('Correct Answers', '正解数')}</span>
              <strong className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                {finalCorrect} {t('correct', '問正解')}
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">{t('Score', 'スコア')}</span>
              <strong className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {finalScore.toLocaleString()} pts
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 mb-6">
            <span>{t('Accuracy: ', '正解率: ')}{accuracyPct}% ({finalCorrect} / {finalTotal})</span>
            <span className="flex items-center gap-1 text-amber-500">
              <Flame size={14} />
              <span>{t('Max Streak: ', '最大連勝: ')}{finalMaxStreak}</span>
            </span>
          </div>

          <p className="text-xs font-bold text-slate-400 animate-pulse">
            {t('Waiting for teacher’s screen to reveal podium & awards...', '先生の画面で表彰式・結果発表を待っています...')}
          </p>
        </div>
      </div>
    );
  }

  // If player finished race
  if (player.isFinished || localIsFinished) {
    const finalScore = Math.max(player.score || 0, localScore);
    const finalCorrect = Math.max(player.correctCount || 0, localCorrectCount);
    const finalTotal = Math.max(player.totalAnswered || 0, localTotalAnswered);
    const finalMaxStreak = Math.max(player.maxStreak || 0, localMaxStreak);
    const finishTime = localFinishTimeMs || player.finishTimeMs;
    const finishSec = finishTime ? (finishTime / 1000).toFixed(2) : '--';
    const accuracyPct = finalTotal > 0
      ? Math.round((finalCorrect / finalTotal) * 100)
      : 100;

    return (
      <div className="w-full max-w-lg mx-auto p-4 text-center select-none animate-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-emerald-400 dark:border-emerald-500">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl text-4xl">
            🏁
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-1">
            {t('CHEQUERED FLAG', 'チェッカーフラッグ！')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4">
            {t('Race Finished! Congratulations!', 'レース完走！おめでとう！')}
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">{t('Official Time', '公式タイム')}</span>
              <strong className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                {finishSec}s
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block">{t('Score', 'スコア')}</span>
              <strong className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">
                {finalScore.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-600 dark:text-slate-300 mb-6">
            <span>{t('Accuracy: ', '正解率: ')}{accuracyPct}% ({finalCorrect} / {finalTotal})</span>
            <span className="flex items-center gap-1 text-amber-500">
              <Flame size={14} />
              <span>{t('Max Streak: ', '最大連勝: ')}{finalMaxStreak}</span>
            </span>
          </div>

          <p className="text-xs font-bold text-slate-400 animate-pulse">
            {t('Waiting for all racers to finish or award ceremony...', '全員のゴールまたは表彰式の発表を待っています...')}
          </p>
        </div>
      </div>
    );
  }

  // If player DNF (Did Not Finish - Lap Race only)
  if (player.isDnf && !isTimeTrial) {
    const finalScore = Math.max(player.score || 0, localScore);
    return (
      <div className="w-full max-w-lg mx-auto p-4 text-center select-none animate-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-rose-400 dark:border-rose-500">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl text-3xl font-black">
            ⏱️
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 block mb-1">
            {t('RACE TIME EXPIRED', 'タイムアップ')}
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            DNF (Did Not Finish)
          </h2>
          <p className="text-xs font-bold text-slate-400 mb-6">
            {t('Unfortunately did not make it before the time expired, but great fight!', '惜しくも制限時間に間に合いませんでしたが、ナイスファイト！')}
          </p>
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 mb-6 text-center">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">{t('Score Earned', '獲得スコア')}</span>
            <strong className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {finalScore.toLocaleString()} pts
            </strong>
          </div>
          <p className="text-xs font-bold text-slate-400 animate-pulse">
            {t('Waiting for results on the teacher’s screen...', '先生の画面で結果発表を待っています...')}
          </p>
        </div>
      </div>
    );
  }

  const isEnPrompt = currentQuestion.promptType === 'EN_TO_JA' || currentQuestion.promptType === 'EN_WORD';

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col p-3 sm:p-5 select-none animate-in fade-in duration-150">
      {/* Top Sprint Bar */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Lap Counter */}
          <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-600 text-white shadow-sm flex items-center gap-1">
            <Flag size={12} />
            <span>
              {isTimeTrial ? `${t('Question', '問題')} ${currentIndex + 1}` : `LAP ${currentIndex + 1} / ${totalQuestions}`}
            </span>
          </span>

          {/* Team Indicator */}
          {player.teamId && TEAM_PRESETS[player.teamId] && (
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <span>{TEAM_PRESETS[player.teamId].emoji}</span>
              <span>{language === 'ja' ? TEAM_PRESETS[player.teamId].jaName : TEAM_PRESETS[player.teamId].name}</span>
            </span>
          )}

          {/* Streak Indicator */}
          {localStreak > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-300 animate-pulse">
              <Flame size={13} className="text-amber-500" />
              <span>x{localStreak} Streak!</span>
            </span>
          )}
        </div>

        {/* Live Score */}
        <div className="flex items-center gap-2">
          {isTimeTrial && (
            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
              <Clock size={12} />
              <span>{timeTrialRemainingSec}s</span>
            </span>
          )}
          <span className="font-mono text-sm font-black px-3 py-1 rounded-xl bg-slate-900 text-emerald-400 shadow-inner">
            {localScore.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Grace Timer Alert Banner */}
      {isGraceActive && !isTimeTrial && (
        <div className="mb-2 py-1.5 px-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-between shadow-md animate-bounce">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={15} />
            <span>
              {language === 'ja' ? (
                <>
                  <ruby>表彰台<rt className="text-[7px] font-normal text-slate-900">ひょうしょうだい</rt></ruby>が<ruby>確定<rt className="text-[7px] font-normal text-slate-900">かくてい</rt></ruby>しました！ラストスパート！
                </>
              ) : (
                'Podium Locked! Final push!'
              )}
            </span>
          </div>
          <span className="font-mono text-sm px-2 py-0.5 rounded bg-black/20 text-white font-black">
            {t('Remaining: ', '残り ')}{graceLeft} {t('s', '秒')}
          </span>
        </div>
      )}

      {/* Start Procedure Lights Overlay on iPad (shown during initial 4.8s) */}
      {showStartLights && (
        <div className={`mb-3 p-4 rounded-3xl bg-slate-950 border-2 border-slate-800 shadow-2xl flex flex-col items-center justify-center animate-in fade-in duration-200 shrink-0 ${raceActive ? 'pointer-events-none' : ''}`}>
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">
            {t('START PROCEDURE', 'シグナルに注目！')}
          </span>
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-black/60 border border-slate-800">
            {[1, 2, 3, 4, 5].map((idx) => {
              const isOn = lightsCount >= idx;
              const isGreen = lightsCount === 6;
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-100 ${
                      isGreen
                        ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_18px_#10b981]'
                        : isOn
                          ? 'bg-rose-600 border-rose-400 shadow-[0_0_15px_#ef4444]'
                          : 'bg-slate-900 border-slate-800'
                    }`}
                  />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                </div>
              );
            })}
          </div>
          <span className="text-xs font-black text-white mt-2 animate-pulse">
            {lightsCount < 5 ? t('ARENA DRIVERS READY...', '準備中...') : lightsCount === 5 ? t('GET READY...', '構えて...') : t('LIGHTS OUT AND AWAY WE GO! 🟢', 'スタート！ 🟢')}
          </span>
        </div>
      )}

      {/* Question Card Header (On iPad) */}
      <div className="mb-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center gap-3 text-center shrink-0 min-h-[50px] sm:min-h-[58px]">
        {currentQuestion.promptImage && (
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center">
            <img
              src={currentQuestion.promptImage}
              alt="Prompt"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        )}

        {currentQuestion.promptType === 'AUDIO_ONLY' && (
          <button
            onClick={() => playWordAudio(currentQuestion.promptSound, currentQuestion.targetWordEnglish)}
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 shrink-0 transition-all cursor-pointer"
            title={t('Listen again', 'もう一度聞く')}
          >
            <Volume2 size={24} />
          </button>
        )}

        <div className="flex flex-col items-center">
          <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {currentQuestion.promptText}
          </h3>
          {currentQuestion.promptSubtext && (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {currentQuestion.promptSubtext}
            </span>
          )}
        </div>
      </div>

      {/* 4 Touch Choice Buttons - 2x2 Grid with Pit Stop Penalty Overlay */}
      <div className="relative flex-1 min-h-0 w-full my-1">
        {/* ====================================================================
            [ANTIGRAVITY REFACTOR #2]: Synchronized Pit Stop Overlay Thresholds
            WHAT CHANGED:
            Updated the JSX thresholds from `<= 1.0` / `<= 1.5` (and labels
            `+1.0s` / `+1.5s` / `+2.0s`) to match the actual `2.5s -> 3.5s -> 5.0s`
            escalating penalty set at line 319 (`GEMINI.md` §7).
            WHY:
            Previously, line 319 set `activePenaltyTotalSec = 2.5` on the 1st
            mistake, which failed both `<= 1.0` and `<= 1.5` in the JSX below,
            causing every 1st mistake to display the 3rd-tier message:
            "Engine Service! (+2.0s) / Only one choice remaining!" while counting
            down from 2.5s.
            ==================================================================== */}
        {penaltySecondsLeft > 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-3xl bg-slate-950/95 border-4 border-amber-400 text-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center text-3xl mb-3 shadow-xl animate-bounce">
              {activePenaltyTotalSec <= 2.5 ? '🛞' : activePenaltyTotalSec <= 3.5 ? '🔧' : '⚠️'}
            </div>
            <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">
              {activePenaltyTotalSec <= 2.5
                ? t('TIRE SLIP! / QUICK RECOVERY', 'スリップ！ / クイックリカバー')
                : activePenaltyTotalSec <= 3.5
                ? t('PIT STOP! / RAPID TIRE SERVICE', 'ピットイン！ / タイヤ交換')
                : t('ENGINE CHECK / LAST CHANCE', 'マシン点検 / ラストチャンス')}
            </span>
            <h4 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 mb-1">
              {activePenaltyTotalSec <= 2.5
                ? t(`Tire Slip! (+${activePenaltyTotalSec.toFixed(1)}s)`, <>スリップ！ (+{activePenaltyTotalSec.toFixed(1)}<ruby>秒<rt className="text-[7px]">びょう</rt></ruby>)</>)
                : activePenaltyTotalSec <= 3.5
                ? t(`Pit Stop! (+${activePenaltyTotalSec.toFixed(1)}s)`, <>ピットストップ！ (+{activePenaltyTotalSec.toFixed(1)}<ruby>秒<rt className="text-[7px]">びょう</rt></ruby>)</>)
                : t(`Engine Service! (+${activePenaltyTotalSec.toFixed(1)}s)`, <>マシン<ruby>点検<rt className="text-[7px]">てんけん</rt></ruby>！ (+{activePenaltyTotalSec.toFixed(1)}<ruby>秒<rt className="text-[7px]">びょう</rt></ruby>)</>)}
            </h4>
            <p className="text-xs font-bold text-slate-300 text-center mb-3">
              {activePenaltyTotalSec <= 2.5
                ? t('Quick correction! Back in the race shortly!', <><ruby>体勢<rt className="text-[7px]">たいせい</rt></ruby>を<ruby>立<rt className="text-[7px]">た</rt></ruby>て<ruby>直<rt className="text-[7px]">なお</rt></ruby>してすぐ<ruby>再開<rt className="text-[7px]">さいかい</rt></ruby>！</>)
                : activePenaltyTotalSec <= 3.5
                ? t('Rapid pit stop! Fresh tires fitted!', <>ピットクルーがタイヤ<ruby>交換<rt className="text-[7px]">こうかん</rt></ruby><ruby>中<rt className="text-[7px]">ちゅう</rt></ruby>！まもなく<ruby>発進<rt className="text-[7px]">はっしん</rt></ruby>！</>)
                : t('Check carefully! Only one choice remaining!', <><ruby>落<rt className="text-[7px]">お</rt></ruby>ち<ruby>着<rt className="text-[7px]">つ</rt></ruby>いて！<ruby>残<rt className="text-[7px]">のこ</rt></ruby>りはあと1つ！</>)}
            </p>

            {/* Countdown Bar */}
            <div className="w-48 sm:w-64 h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${Math.min(100, Math.max(0, (penaltySecondsLeft / activePenaltyTotalSec) * 100))}%` }}
              />
            </div>
            <span className="font-mono text-sm font-black text-amber-300 mt-2">
              {t('Remaining: ', <><ruby>残<rt className="text-[7px]">のこ</rt></ruby>り </>) }{penaltySecondsLeft.toFixed(1)} {t('s', <><ruby>秒<rt className="text-[7px]">びょう</rt></ruby></>)}
            </span>
          </div>
        )}

        <div className={`grid grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2.5 h-full ${penaltySecondsLeft > 0 ? 'filter blur-xs pointer-events-none' : ''}`}>
          {currentQuestion.options.map((option, idx) => {
            const style = OPTION_STYLES[idx] || OPTION_STYLES[0];
            const targetId = currentQuestion.correctOptionId || currentQuestion.targetWordId;
            const isOptionCorrect = Boolean(targetId && option.id === targetId) || Boolean(
              option.english &&
              currentQuestion.targetWordEnglish &&
              option.english.trim().toLowerCase() === currentQuestion.targetWordEnglish.trim().toLowerCase()
            );
            const isChosen = feedback?.optionId === option.id;
            const isCorrect = feedback && isOptionCorrect;
            const isWrong = isChosen && !feedback.isCorrect;
            const isEliminated = eliminatedOptionIds.has(option.id);

            const displayText = isEnPrompt
              ? (option.ja_kanji || option.ja_hiragana || option.english)
              : option.english;
            const subText = isEnPrompt
              ? (option.ja_hiragana && option.ja_kanji !== option.ja_hiragana ? option.ja_hiragana : undefined)
              : (currentQuestion.englishReadingAid === 'WITH_KATAKANA' && option.en_katakana ? `[ ${option.en_katakana} ]` : undefined);

            return (
              <button
                key={option.id}
                disabled={!raceActive || isAnswering || isTimeTrialExpired || penaltySecondsLeft > 0 || isEliminated}
                onClick={() => handleSelect(option.id)}
                className={`relative rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 h-11 sm:h-12 md:h-13 min-h-[42px] max-h-[56px] transition-all duration-150 flex items-center justify-center text-center shadow-md border-b-4 active:border-b-0 active:translate-y-1 select-none overflow-hidden touch-manipulation ${
                  isCorrect
                    ? 'bg-emerald-500 border-emerald-700 ring-8 ring-emerald-300 scale-98 brightness-110 z-10'
                    : isWrong
                      ? 'bg-rose-600 border-rose-800 ring-8 ring-rose-300 animate-shake'
                      : isEliminated
                        ? 'opacity-25 grayscale line-through pointer-events-none scale-95 border-slate-700 bg-slate-700'
                        : style.bg + ' ' + style.border
                } ${(!raceActive || isTimeTrialExpired || penaltySecondsLeft > 0 || isEliminated || (isAnswering && !isChosen)) ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:brightness-105 active:scale-95 cursor-pointer'}`}
              >
                {/* Shape Symbol Pinned to Top-Left Corner */}
                <span className="absolute top-2.5 left-3 sm:top-3.5 sm:left-4 text-xl sm:text-2xl font-black text-white/95 drop-shadow select-none">
                  {style.shapeName}
                </span>

                {/* Feedback overlay icons Pinned to Top-Right Corner */}
                {isCorrect && (
                  <div className="absolute top-2.5 right-3 sm:top-3 sm:right-3.5 w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md animate-in zoom-in-50 z-10">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                {isWrong && (
                  <div className="absolute top-2.5 right-3 sm:top-3 sm:right-3.5 w-8 h-8 rounded-full bg-white text-rose-600 flex items-center justify-center shadow-md animate-in zoom-in-50 z-10">
                    <XCircle size={20} />
                  </div>
                )}

              {/* Main Content: Responsive Hero / Side-by-Side Layout */}
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-1 sm:px-3">
                {!isEnPrompt && !currentQuestion.promptImage && currentQuestion.promptType !== 'IMAGE_ONLY' && option.image && (
                  <div className="bg-white rounded-2xl p-1.5 sm:p-2 shadow-md shrink-0 flex items-center justify-center">
                    <img
                      src={option.image}
                      alt={displayText}
                      className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain rounded-lg"
                    />
                  </div>
                )}

                <div className={`flex flex-col min-w-0 ${!isEnPrompt && option.image ? 'items-center sm:items-start text-center sm:text-left' : 'items-center text-center'}`}>
                  {isEnPrompt ? (
                    <RubyText
                      ruby={option.ruby}
                      kanji={option.ja_kanji}
                      hiragana={option.ja_hiragana}
                      className="text-base sm:text-xl md:text-2xl font-black text-white drop-shadow-md leading-tight text-center"
                      rtClassName="text-[10px] sm:text-xs font-normal text-white/90 select-none"
                    />
                  ) : (
                    <>
                      <span className="text-base sm:text-xl md:text-2xl font-black text-white drop-shadow-md leading-tight break-words">
                        {displayText}
                      </span>
                      {subText && (
                        <span className="text-xs sm:text-sm font-bold text-white/90 mt-0.5 break-words">
                          {subText}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="pt-2 text-center shrink-0">
        <p className="text-xs font-black text-slate-400">
          {t('⚡ Tap fast to rack up the laps!', '⚡ 素早くタップして次々とラップを刻もう！')}
        </p>
      </div>
    </div>
  );
};
