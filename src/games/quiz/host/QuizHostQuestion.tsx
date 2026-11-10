import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { QuizQuestion, QuizResponse, QuizPlayer, RecallDelaySeconds, DistractorEliminationMode } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { useClassroom } from '@/context/ClassroomContext';
import { speechService } from '@/services/speechService';
import { Volume2, Clock, Users, EyeOff, Zap, Sparkles, CheckCircle2, Pause } from 'lucide-react';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';

interface QuizHostQuestionProps {
  roomCode: string;
  question: QuizQuestion;
  totalQuestions: number;
  players: Record<string, QuizPlayer>;
  responses?: Record<string, QuizResponse> | null;
  recallDelaySeconds?: RecallDelaySeconds;
  eliminateDistractors?: boolean;
  distractorEliminationMode?: DistractorEliminationMode;
  onTimeExpired: () => void;
  onManualReveal: () => void;
  onExit?: () => void;
  isSolo?: boolean;
  soloPlayer?: QuizPlayer;
  selectedOptionId?: string | null;
  onSelectOption?: (optionId: string, timeTakenMs: number) => void;
  onDuckBGM?: (duck: boolean) => void;
}

export const QuizHostQuestion: React.FC<QuizHostQuestionProps> = ({
  roomCode,
  question,
  totalQuestions,
  players,
  responses,
  recallDelaySeconds = 0,
  eliminateDistractors = false,
  distractorEliminationMode,
  onTimeExpired,
  onManualReveal,
  onExit,
  isSolo = false,
  soloPlayer,
  selectedOptionId = null,
  onSelectOption,
  onDuckBGM
}) => {
  const { t, language } = useLanguage();
  const { playWordAudio } = useAudio();
  const { activeSchool } = useClassroom();
  const [timeLeftMs, setTimeLeftMs] = useState<number>(question.timeLimitMs);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedOptionId || null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const totalPlayers = Object.keys(players).length;
  const answeredCount = Object.keys(responses || {}).length;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isBlackoutRef = useRef(isBlackout);
  isBlackoutRef.current = isBlackout;

  const timerRef = useRef<number | null>(null);
  const autoRevealTimerRef = useRef<number | null>(null);
  const expireTimerRef = useRef<number | null>(null);
  const earlyEndTimerRef = useRef<number | null>(null);
  const lastTickSecondRef = useRef<number>(-1);
  const unblurPlayedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(question.startTime > 0 ? question.startTime : Date.now());

  const audioStagesTriggeredRef = useRef<Set<number>>(new Set());
  const lastAudioPlayTimeRef = useRef<number>(0);

  const onTimeExpiredRef = useRef(onTimeExpired);
  onTimeExpiredRef.current = onTimeExpired;

  const onManualRevealRef = useRef(onManualReveal);
  onManualRevealRef.current = onManualReveal;

  const clearAllPendingTimers = () => {
    if (autoRevealTimerRef.current) {
      clearTimeout(autoRevealTimerRef.current);
      autoRevealTimerRef.current = null;
    }
    if (expireTimerRef.current) {
      clearTimeout(expireTimerRef.current);
      expireTimerRef.current = null;
    }
    if (earlyEndTimerRef.current) {
      clearTimeout(earlyEndTimerRef.current);
      earlyEndTimerRef.current = null;
    }
  };

  const onDuckBGMRef = useRef(onDuckBGM);
  onDuckBGMRef.current = onDuckBGM;

  // Speak prompt audio cleanly
  const playPromptAudio = useCallback(() => {
    const textToSpeak = question.targetWordEnglish;
    if (!textToSpeak) return;

    lastAudioPlayTimeRef.current = Date.now();
    setIsPlayingAudio(true);
    onDuckBGMRef.current?.(true);

    const hasAudioFile = question.promptSound && /\.(mp3|wav|m4a|ogg)$/i.test(question.promptSound.trim());

    if (hasAudioFile) {
      playWordAudio(question.promptSound, textToSpeak)
        .finally(() => {
          setIsPlayingAudio(false);
          onDuckBGMRef.current?.(false);
        });
    } else {
      speechService.speak(textToSpeak, {
        lang: 'en-US',
        rate: 0.86,
        onStart: () => {
          setIsPlayingAudio(true);
          onDuckBGMRef.current?.(true);
        },
        onEnd: () => {
          setIsPlayingAudio(false);
          onDuckBGMRef.current?.(false);
        }
      });
    }
  }, [question.targetWordEnglish, question.promptSound, playWordAudio]);

  const playPromptAudioRef = useRef(playPromptAudio);
  playPromptAudioRef.current = playPromptAudio;

  useEffect(() => {
    setLocalSelectedId(selectedOptionId || null);
    clearAllPendingTimers();
  }, [question.questionIndex, selectedOptionId]);

  useEffect(() => {
    return () => {
      clearAllPendingTimers();
      speechService.cancel();
      onDuckBGMRef.current?.(false);
    };
  }, [question.questionIndex]);

  useEffect(() => {
    audioStagesTriggeredRef.current.clear();
    setIsPlayingAudio(false);

    if (question.promptType === 'AUDIO_ONLY') {
      audioStagesTriggeredRef.current.add(100);
      const initialAudioTimer = setTimeout(() => {
        playPromptAudioRef.current();
      }, 200);
      return () => clearTimeout(initialAudioTimer);
    }
  }, [question.questionIndex, question.promptType]);

  // Countdown timer loop with wall-clock sync and Web Audio ticks
  useEffect(() => {
    const start = question.startTime > 0 ? question.startTime : getServerTime();
    startTimeRef.current = start;
    lastTickSecondRef.current = -1;
    unblurPlayedRef.current = false;

    const initialElapsed = Math.max(0, getServerTime() - start);
    const initialRemaining = Math.max(0, question.timeLimitMs - initialElapsed);
    setTimeLeftMs(initialRemaining);

    if (initialRemaining === 0) {
      clearAllPendingTimers();
      onTimeExpiredRef.current();
      return;
    }

    const interval = 50;
    timerRef.current = window.setInterval(() => {
      if (isPausedRef.current || isBlackoutRef.current) {
        startTimeRef.current += interval;
        return;
      }

      const elapsed = Math.max(0, getServerTime() - startTimeRef.current);
      const remaining = Math.max(0, question.timeLimitMs - elapsed);
      const currentSecond = Math.ceil(remaining / 1000);

      if (currentSecond !== lastTickSecondRef.current && currentSecond > 0) {
        lastTickSecondRef.current = currentSecond;
        if (currentSecond <= 5) {
          soundEffects.playUrgencyTick();
        } else {
          soundEffects.playTick();
        }
      }

      if (question.promptType === 'AUDIO_ONLY' && question.timeLimitMs > 0) {
        const ratio = remaining / question.timeLimitMs;
        const now = Date.now();
        const canRepeat = now - lastAudioPlayTimeRef.current >= 3500;
        if (ratio <= 0.50 && !audioStagesTriggeredRef.current.has(50) && canRepeat) {
          audioStagesTriggeredRef.current.add(50);
          playPromptAudioRef.current();
        }
      }

      setTimeLeftMs(remaining);

      if (remaining === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
        expireTimerRef.current = window.setTimeout(() => {
          clearAllPendingTimers();
          onTimeExpiredRef.current();
        }, 400);
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question.questionIndex, question.timeLimitMs, question.startTime, question.promptType]);

  const timePct = Math.max(0, (timeLeftMs / question.timeLimitMs) * 100);
  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const isEnPrompt = question.promptType === 'EN_TO_JA' || question.promptType === 'EN_WORD';
  const hasPromptImage = !!question.promptImage || question.promptType === 'IMAGE_ONLY';

  const elapsedMs = question.timeLimitMs - timeLeftMs;
  const isRecallLocked = recallDelaySeconds > 0 && elapsedMs < (recallDelaySeconds * 1000);
  const recallSecondsLeft = Math.max(1, Math.ceil((recallDelaySeconds * 1000 - elapsedMs) / 1000));

  useEffect(() => {
    unblurPlayedRef.current = false;
  }, [question.questionIndex]);

  useEffect(() => {
    if (recallDelaySeconds > 0 && !isRecallLocked && !unblurPlayedRef.current && elapsedMs >= recallDelaySeconds * 1000) {
      unblurPlayedRef.current = true;
      soundEffects.playUnblurChime();
    }
  }, [recallDelaySeconds, isRecallLocked, elapsedMs]);

  const eliminationMode: DistractorEliminationMode = distractorEliminationMode || (eliminateDistractors ? 'HALFWAY' : 'OFF');

  const eliminatedCount = useMemo(() => {
    if (eliminationMode === 'OFF') return 0;
    const limit = question.timeLimitMs || 15000;
    if (eliminationMode === 'HALFWAY') {
      return timeLeftMs <= limit * 0.5 ? 2 : 0;
    }
    if (eliminationMode === 'GRADUAL') {
      if (timeLeftMs <= limit * 0.34) return 2;
      if (timeLeftMs <= limit * 0.67) return 1;
      return 0;
    }
    return 0;
  }, [eliminationMode, timeLeftMs, question.timeLimitMs]);

  const eliminatedOptionIds = useMemo(() => {
    if (eliminatedCount === 0) return new Set<string>();
    if (question.distractorOptionIds && question.distractorOptionIds.length > 0) {
      return new Set(question.distractorOptionIds.slice(0, eliminatedCount));
    }
    const wrongOptions = question.correctOptionId
      ? question.options.filter(o => o.id !== question.correctOptionId)
      : [];
    return new Set(wrongOptions.slice(0, eliminatedCount).map(o => o.id));
  }, [eliminatedCount, question]);

  const prevEliminatedCountRef = useRef<number>(0);
  useEffect(() => {
    if (eliminatedOptionIds.size > prevEliminatedCountRef.current && !localSelectedId) {
      soundEffects.play5050();
    }
    prevEliminatedCountRef.current = eliminatedOptionIds.size;
  }, [eliminatedOptionIds.size, localSelectedId]);

  useEffect(() => {
    prevEliminatedCountRef.current = 0;
  }, [question.questionIndex]);

  const handleOptionClick = (optId: string) => {
    if (isRecallLocked || eliminatedOptionIds.has(optId) || timeLeftMs <= 0) return;

    if (isSolo && onSelectOption) {
      const now = getServerTime();
      const timeTaken = startTimeRef.current > 0 ? Math.max(0, now - startTimeRef.current) : 0;
      setLocalSelectedId(optId);
      soundEffects.playTick();
      onSelectOption(optId, timeTaken);

      if (autoRevealTimerRef.current) clearTimeout(autoRevealTimerRef.current);
      autoRevealTimerRef.current = window.setTimeout(() => {
        clearAllPendingTimers();
        onManualRevealRef.current();
      }, 500);
    }
  };

  const allAnswered = !isSolo && totalPlayers > 0 && answeredCount >= totalPlayers;
  const hasTriggeredEarlyEndRef = useRef(false);

  useEffect(() => {
    hasTriggeredEarlyEndRef.current = false;
    if (earlyEndTimerRef.current) {
      clearTimeout(earlyEndTimerRef.current);
      earlyEndTimerRef.current = null;
    }
  }, [question.questionIndex]);

  useEffect(() => {
    if (allAnswered && !hasTriggeredEarlyEndRef.current) {
      hasTriggeredEarlyEndRef.current = true;
      earlyEndTimerRef.current = window.setTimeout(() => {
        clearAllPendingTimers();
        onManualRevealRef.current();
      }, 500);
    }
  }, [allAnswered]);

  const getFontSizeClass = (text: string) => {
    const len = text.trim().length;
    if (len >= 21) return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-tight';
    if (len >= 15) return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight';
    if (len >= 9) return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight';
    return 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-none';
  };

  const getKatakanaSizeClass = (kanaText: string, hasThumbnail: boolean) => {
    const len = kanaText.length;
    if (hasThumbnail) {
      if (len >= 14) return 'text-[10px] sm:text-xs font-black tracking-tighter';
      if (len >= 10) return 'text-xs sm:text-sm font-black tracking-tight';
      return 'text-xs sm:text-base font-black';
    }
    if (len >= 14) return 'text-xs sm:text-sm md:text-base font-black tracking-tight';
    return 'text-sm sm:text-base md:text-xl font-black';
  };

  // Helper to render Japanese prompt with ruby on top
  const renderJapanesePrompt = () => {
    if (question.isMath) {
      return question.promptText;
    }
    if (question.promptType === 'JA_MEANING') {
      const kanji = question.targetWordJa;
      const hiragana = question.targetWordHiragana;
      if (hiragana && kanji && hiragana !== kanji) {
        return (
          <ruby className="leading-normal">
            {kanji}
            <rt className="text-base sm:text-xl md:text-2xl font-bold text-amber-300 drop-shadow-sm select-none">
              {hiragana}
            </rt>
          </ruby>
        );
      }
    }
    return question.promptText;
  };

  useEffect(() => {
    onDuckBGMRef.current?.(isBlackout);
  }, [isBlackout]);

  useClassroomClicker({
    onNext: () => {
      clearAllPendingTimers();
      onManualRevealRef.current();
    },
    onReplayAudio: playPromptAudio,
    onTogglePause: () => setIsPaused(p => !p),
    onBlankScreen: () => setIsBlackout(b => !b)
  });

  const isFutako = activeSchool === 'futakotamagawa';

  const CUD_PATTERN_MAP: Record<string, string> = {
    triangle: 'pattern-triangle',
    diamond: 'pattern-diamond',
    circle: 'pattern-circle',
    square: 'pattern-square'
  };

  const optionStyleMap: Record<string, { bg: string; shadow: string; border: string; shape: string; text?: string; toyoClass: string }> = {
    triangle: { bg: 'bg-[#ef4444]', shadow: '#991b1b', border: 'border-[#f87171]', shape: '▲', toyoClass: 'card-toyo-red' },
    diamond:  { bg: 'bg-[#2563eb]', shadow: '#1e40af', border: 'border-[#60a5fa]', shape: '◆', toyoClass: 'card-toyo-blue' },
    circle:   { bg: 'bg-[#f59e0b]', shadow: '#854d0e', border: 'border-[#fde047]', shape: '●', text: 'text-slate-950', toyoClass: 'card-toyo-yellow' },
    square:   { bg: 'bg-[#10b981]', shadow: '#065f46', border: 'border-[#34d399]', shape: '■', toyoClass: 'card-toyo-green' }
  };

  return (
    <div className="w-full max-w-[92vw] max-h-[92vh] mx-auto h-full flex flex-col justify-between p-2 sm:p-3 select-none overflow-hidden relative animate-in fade-in duration-150">
      {/* 1. Top Header Bar */}
      <div className="flex items-center justify-between pb-1.5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
            Q {question.questionIndex + 1} / {totalQuestions}
          </span>
          <button
            type="button"
            onClick={() => setIsPaused(p => !p)}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
              isPaused
                ? 'bg-amber-400 text-slate-950 font-black animate-pulse shadow-md ring-2 ring-amber-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title={t('Pause / Resume timer [P]', 'タイマー一時停止 / 再開 [P]')}
          >
            {isPaused ? <Pause size={14} className="fill-current" /> : <Clock size={14} className={secondsLeft <= 5 ? 'text-rose-500 animate-spin' : ''} />}
            <span className={`font-mono font-black ${secondsLeft <= 5 && !isPaused ? 'text-rose-500' : ''}`}>
              {isPaused ? t('PAUSED [P]', <><ruby>一時<rt className="text-[7px] font-normal text-slate-900">いちじ</rt></ruby><ruby>停止<rt className="text-[7px] font-normal text-slate-900">ていし</rt></ruby> [P]</>) : `${secondsLeft}s`}
            </span>
          </button>
        </div>

        {/* Counter / Score & PIN */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isSolo ? (
            <div className="flex items-center gap-2">
              {soloPlayer && soloPlayer.currentStreak >= 2 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-sm animate-bounce">
                  <span>🔥</span>
                  <span>{soloPlayer.currentStreak}</span>
                </div>
              )}
              {soloPlayer && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-black shadow-sm">
                  <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{soloPlayer.score.toLocaleString()} pts</span>
                </div>
              )}
              <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                📺 TV / Smartboard
              </span>
            </div>
          ) : (
            <>
              {totalPlayers > 0 && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-sm transition-all ${
                  allAnswered
                    ? 'bg-emerald-500 text-white animate-bounce ring-2 ring-emerald-300'
                    : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                }`}>
                  <Users size={14} />
                  <span>
                    {allAnswered
                      ? t('All Answered! 🎉', <><ruby>全員<rt className="text-[7px] font-normal text-white">ぜんいん</rt></ruby><ruby>回答<rt className="text-[7px] font-normal text-white">かいとう</rt></ruby><ruby>完了<rt className="text-[7px] font-normal text-white">かんりょう</rt></ruby>！🎉</>)
                      : <>{answeredCount} / {totalPlayers} {t('Answered', <><ruby>名<rt className="text-[7px] font-normal text-blue-700 dark:text-blue-300">めい</rt></ruby> <ruby>回答<rt className="text-[7px] font-normal text-blue-700 dark:text-blue-300">かいとう</rt></ruby><ruby>済<rt className="text-[7px] font-normal text-blue-700 dark:text-blue-300">ず</rt></ruby>み</>)}</>}
                  </span>
                </div>
              )}
              <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                PIN: {roomCode}
              </span>
            </>
          )}
          {onExit && (
            <button
              onClick={() => {
                if (window.confirm(t('End quiz early and disband the room?\nConnected student devices will return to the game over screen.', 'クイズを強制終了してルームを解散しますか？\n参加中の生徒の端末は終了画面に移行します。'))) {
                  onExit();
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1 border border-rose-200 dark:border-rose-900 transition-colors active:scale-95 cursor-pointer"
              title={t('End quiz and disband room', 'クイズを終了して解散')}
            >
              <span>{t('✕ End', <>✕ <ruby>終了<rt className="text-[7px] font-normal text-rose-600 dark:text-rose-400">しゅうりょう</rt></ruby></>)}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Countdown Progress Bar */}
      <div className="w-full h-2 sm:h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2 shrink-0 shadow-inner">
        <div
          className={`h-full transition-all duration-75 ease-linear rounded-full ${
            secondsLeft <= 5 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-blue-500'
          }`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* 3. Main Stage: Hero Cinema Prompt & Choices Grid */}
      <div className="flex-1 w-full min-h-0 flex flex-col justify-between my-1 overflow-hidden">
        {/* Top: Hero Prompt Area */}
        <div className={`shrink-0 rounded-2xl sm:rounded-3xl p-3 sm:p-5 relative overflow-hidden flex items-center max-h-[50vh] min-h-[160px] sm:min-h-[200px] transition-all ${
          isFutako
            ? 'bg-[#0f172a] border-4 border-sky-400/80 shadow-[0_0_25px_rgba(56,189,248,0.25)] text-white'
            : 'card-toyo-sheet text-slate-900'
        }`}>
          {isFutako && (
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-80" />
          )}

          {hasPromptImage && question.promptImage ? (
            /* HERO ARTWORK FRAMING: Balanced 40% text column + tight card-mounted artwork */
            <div className="w-full h-full flex flex-row items-center justify-between gap-4 sm:gap-6 px-2 sm:px-4">
              {/* Left Column: 38-40% Prompt Stack */}
              <div className="w-[38%] sm:w-[40%] flex flex-col justify-center items-start text-left min-w-0 pr-2">
                {question.promptType === 'AUDIO_ONLY' ? (
                  <button
                    type="button"
                    onClick={playPromptAudio}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-xl mb-2 active:scale-95 transition-all cursor-pointer ${
                      isPlayingAudio ? 'ring-6 sm:ring-8 ring-sky-300 animate-pulse scale-105' : ''
                    }`}
                    title={t('Listen to audio again', 'もう一度聞く')}
                  >
                    <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
                  </button>
                ) : (
                  !question.isMath && question.targetWordEnglish && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        type="button"
                        onClick={playPromptAudio}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800 ${
                          isPlayingAudio ? 'ring-4 ring-sky-400 animate-pulse text-blue-500' : ''
                        }`}
                        title={t('Pronounce word', '発音を聞く')}
                      >
                        <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <span className={`text-xs font-bold ${isFutako ? 'text-sky-300' : 'text-slate-600 dark:text-slate-300'}`}>
                        {t('Tap for audio', <><ruby>音声<rt className="text-[7px] font-normal text-slate-400">おんせい</rt></ruby><ruby>再生<rt className="text-[7px] font-normal text-slate-400">さいせい</rt></ruby></>)}
                      </span>
                    </div>
                  )
                )}

                <h2 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight break-words ${
                  isFutako ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : 'text-slate-900 dark:text-white'
                }`}>
                  {renderJapanesePrompt()}
                </h2>

                {question.promptSubtext && (question.isMath || question.promptType !== 'JA_MEANING') && (
                  <p className={`text-sm sm:text-lg md:text-xl font-bold mt-2 sm:mt-3 leading-snug ${
                    isFutako ? 'text-amber-300 drop-shadow-sm' : 'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {question.promptSubtext}
                  </p>
                )}
              </div>

              {/* Right Column: Card-Mounted Shrink-Wrap Artwork (Eliminates wide white wings!) */}
              <div className="flex-1 flex items-center justify-center min-w-0">
                <div className="h-52 sm:h-64 md:h-76 aspect-[4/3] max-w-md sm:max-w-lg mx-auto flex items-center justify-center p-2.5 sm:p-3 rounded-3xl bg-[#faf8f5] dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 shadow-2xl">
                  <img
                    src={question.promptImage}
                    alt={question.promptText}
                    className="w-full h-full object-contain drop-shadow-md rounded-xl"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* CENTERED LAYOUT: Text-only prompts */
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-4 py-2">
              {question.promptType === 'AUDIO_ONLY' && (
                <button
                  type="button"
                  onClick={playPromptAudio}
                  className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-xl mb-2 sm:mb-3 active:scale-95 transition-all cursor-pointer ${
                    isPlayingAudio ? 'ring-6 sm:ring-8 ring-sky-300 animate-pulse scale-105' : ''
                  }`}
                  title={t('Listen to audio again', 'もう一度聞く')}
                >
                  <Volume2 className="w-7 h-7 sm:w-10 sm:h-10" />
                </button>
              )}

              <h2 className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-snug ${
                isFutako ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]' : 'text-slate-900 dark:text-white'
              }`}>
                {renderJapanesePrompt()}
              </h2>

              {question.promptSubtext && (question.isMath || question.promptType !== 'JA_MEANING') && (
                <p className={`text-base sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2 ${
                  isFutako ? 'text-amber-300 drop-shadow-sm' : 'text-indigo-600 dark:text-indigo-400'
                }`}>
                  {question.promptSubtext}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom: 2x2 Choice Cards Grid */}
        <div className="flex-1 min-h-0 relative mt-2 sm:mt-3">
          {/* Recall Thinking Overlay */}
          {isRecallLocked && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl bg-slate-950/90 border-2 border-indigo-400/50 text-white p-4 shadow-2xl animate-in fade-in duration-200 select-none pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl mb-1 shadow-xl animate-bounce">
                🤔
              </div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-center">
                {t('Think First!', <><ruby>思考<rt className="text-[8px] font-normal text-indigo-200">しこう</rt></ruby>タイム</>)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-indigo-200 mt-0.5 text-center">
                {t('Recall the English in your head before choices appear!', <><ruby>頭<rt className="text-[8px] font-normal text-indigo-200">あたま</rt></ruby>の<ruby>中<rt className="text-[8px] font-normal text-indigo-200">なか</rt></ruby>で<ruby>英語<rt className="text-[8px] font-normal text-indigo-200">えいご</rt></ruby>を<ruby>思<rt className="text-[8px] font-normal text-indigo-200">おも</rt></ruby>い<ruby>浮<rt className="text-[8px] font-normal text-indigo-200">う</rt></ruby>かべよう！</>)}
              </span>
              <div className="mt-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-mono font-black">
                {t(`Choices open in ${recallSecondsLeft}s`, <><ruby>残<rt className="text-[7px] font-normal text-white/60">のこ</rt></ruby>り {recallSecondsLeft} <ruby>秒<rt className="text-[7px] font-normal text-white/60">びょう</rt></ruby>でオープン</>)}
              </div>
            </div>
          )}

          {/* 2x2 Choices Grid */}
          <div className={`grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-4 h-full min-h-0 transition-all duration-300 ${
            isRecallLocked ? 'filter opacity-40 select-none pointer-events-none' : ''
          }`}>
            {question.options.map((opt) => {
              const optStyle = optionStyleMap[opt.symbol] || { bg: 'bg-[#ef4444]', shadow: '#991b1b', border: 'border-[#f87171]', shape: '▲', toyoClass: 'card-toyo-red' };
              const isYellow = opt.symbol === 'circle';

              const isEliminated = eliminatedOptionIds.has(opt.id);
              const displayText = isEnPrompt
                ? (opt.ja_kanji || opt.ja_hiragana || opt.english)
                : opt.english;
              const subText = isEnPrompt
                ? (opt.ja_hiragana && opt.ja_kanji !== opt.ja_hiragana ? opt.ja_hiragana : undefined)
                : (question.englishReadingAid === 'WITH_KATAKANA' && opt.en_katakana ? `【${opt.en_katakana}】` : undefined);

              const isSelected = isSolo && localSelectedId === opt.id;
              const isOtherSelected = isSolo && localSelectedId !== null && localSelectedId !== opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={isRecallLocked || isEliminated ? undefined : () => handleOptionClick(opt.id)}
                  style={{
                    boxShadow: isEliminated ? undefined : (isFutako ? `0 6px 0 0 ${optStyle.shadow}, 0 10px 20px -2px rgba(0,0,0,0.4)` : undefined)
                  }}
                  className={`relative p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-150 cursor-pointer active:translate-y-1.5 h-full min-h-0 select-none overflow-hidden ${
                    isFutako
                      ? `${optStyle.bg} ${optStyle.border} border-3 sm:border-4 ${optStyle.text || 'text-white'}`
                      : optStyle.toyoClass
                  } ${
                    isEliminated ? 'opacity-15 grayscale line-through pointer-events-none scale-95' : ''
                  } ${
                    isSelected ? 'ring-4 ring-white border-white scale-[1.02] shadow-2xl z-10' : ''
                  } ${
                    isOtherSelected ? 'opacity-40 scale-98' : ''
                  }`}
                >
                  {/* CUD Shape-Matched Background Texture Layer */}
                  <div className={`absolute inset-0 ${CUD_PATTERN_MAP[opt.symbol] || 'pattern-triangle'} pointer-events-none rounded-2xl sm:rounded-3xl`} />

                  {/* Pinned Macro Shape Glyph in Top-Left Corner */}
                  <div className="absolute top-2 left-2.5 sm:top-3 sm:left-3.5 w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-black/35 border border-white/30 flex items-center justify-center text-lg sm:text-2xl font-black shrink-0 shadow-inner select-none text-white z-10">
                    {optStyle.shape}
                  </div>

                  {/* 40/60 Split: Generous Thumbnail on Left + Bold Typography on Right */}
                  {!hasPromptImage && !isEnPrompt && opt.image ? (
                    <div className="w-full h-full flex items-center justify-between gap-3 pl-8 sm:pl-12 pr-2 sm:pr-4 z-10">
                      {/* Left 40%: Generous 2.5x Larger Card Box */}
                      <div className="w-[38%] h-[85%] rounded-2xl bg-[#faf8f5] p-1.5 shadow-md shrink-0 flex items-center justify-center border-2 border-slate-900/40">
                        <img src={opt.image} alt={displayText} className="w-full h-full object-contain rounded-xl" />
                      </div>

                      {/* Right 60%: Large Centered Typography & Dynamic Katakana */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center items-center text-center px-1">
                        <span className={`${getFontSizeClass(displayText)} font-black tracking-wide block break-words whitespace-normal drop-shadow-md`}>
                          {displayText}
                        </span>
                        {subText && (
                          <span className={`${getKatakanaSizeClass(subText, true)} ${
                            isYellow ? 'text-amber-950 font-black' : 'text-amber-200'
                          } drop-shadow-sm mt-1 block break-words`}>
                            {subText}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Centered Layout when No Thumbnail: Full-Width Typography */
                    <div className="w-full text-center px-4 sm:px-8 z-10">
                      <span className={`${getFontSizeClass(displayText)} font-black tracking-wide block break-words whitespace-normal drop-shadow-md`}>
                        {displayText}
                      </span>
                      {subText && (
                        <span className={`${getKatakanaSizeClass(subText, false)} ${
                          isYellow ? 'text-amber-950 font-black' : 'text-amber-200'
                        } drop-shadow-sm mt-1.5 block break-words`}>
                          {subText}
                        </span>
                      )}
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute top-2 right-2.5 sm:top-3 sm:right-3.5 px-2.5 py-0.5 rounded-full bg-white text-slate-900 font-black text-[11px] shadow-md flex items-center gap-1 shrink-0 animate-in zoom-in duration-150 z-20">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{t('SELECTED', <><ruby>選択<rt className="text-[7px] font-normal text-slate-600">せんたく</rt></ruby><ruby>中<rt className="text-[7px] font-normal text-slate-600">ちゅう</rt></ruby></>)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Bottom Footer: Clean & Distraction-Free */}
      <div className="h-6 flex items-center justify-between pt-1 shrink-0 text-slate-400">
        <span className="text-[11px] font-bold opacity-60">
          {isSolo ? t('Solo Warmup Mode', 'ウォームアップ') : t('Eigo Arena Live Session', 'ライブ一斉対戦')}
        </span>
      </div>

      {/* Emergency Blackout Shutter */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout(b => !b)} />
    </div>
  );
};