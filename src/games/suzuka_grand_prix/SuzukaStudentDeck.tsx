import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, QuizOption, OPTION_STYLES } from '@/games/quiz/types';
import { isEnglishPromptType } from '@/games/quiz/core/quizEngine';
import { soundEffects } from '@/services/soundEffects';
import { suzukaAudio } from './services/suzukaAudio';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { RubyText } from '@/components/common/RubyText';
import {
  Flame,
  Flag,
  Volume2,
  Sparkles,
  AlertTriangle,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export interface SuzukaStudentDeckProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  currentStreak: number;
  speedKmh: number;
  cornerSpeedLimit?: number;
  isPassingLane?: boolean;
  wrongLockoutSeconds?: number;
  wrongSpeedLossRatio?: number;
  scaffoldingLevel?: 'FULL' | 'PHONICS' | 'CHALLENGE';
  onChangeScaffoldingLevel?: (level: 'FULL' | 'PHONICS' | 'CHALLENGE') => void;
  autoSpeak?: boolean;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
  hideTelemetryHeader?: boolean;
}

export type DeskStudentDeckProps = SuzukaStudentDeckProps;

export const SuzukaStudentDeck: React.FC<SuzukaStudentDeckProps> = ({
  question,
  questionNumber,
  totalQuestions,
  currentStreak,
  speedKmh,
  cornerSpeedLimit = 180,
  isPassingLane = false,
  wrongLockoutSeconds = 2.5,
  wrongSpeedLossRatio = 0.33,
  scaffoldingLevel: propScaffolding,
  onChangeScaffoldingLevel: _onChangeScaffoldingLevel,
  autoSpeak = true,
  onAnswer,
  disabled = false,
  hideTelemetryHeader = false,
}) => {
  const { t } = useLanguage();
  const { playWordAudio, speakText, isMuted } = useAudio();

  const defaultScaffolding: 'FULL' | 'PHONICS' =
    question.englishReadingAid === 'WITH_KATAKANA' ? 'FULL' : 'PHONICS';
  const [internalScaffolding, setInternalScaffolding] = useState<'FULL' | 'PHONICS' | 'CHALLENGE'>(
    defaultScaffolding
  );
  const scaffoldingLevel = propScaffolding ?? internalScaffolding;

  useEffect(() => {
    if (propScaffolding === undefined) {
      setInternalScaffolding(question.englishReadingAid === 'WITH_KATAKANA' ? 'FULL' : 'PHONICS');
    }
  }, [question.englishReadingAid, propScaffolding]);

  const [feedback, setFeedback] = useState<{ optionId: string; isCorrect: boolean } | null>(null);
  const [lastWrongOption, setLastWrongOption] = useState<QuizOption | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [penaltySecondsLeft, setPenaltySecondsLeft] = useState<number>(0);
  const penaltyEndTimeRef = useRef<number>(0);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<Set<string>>(new Set());
  const [activeTouchId, setActiveTouchId] = useState<string | null>(null);
  const correctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoPlayedQuestionKeyRef = useRef<string>('');

  // Enforce mandatory >= 2.5s Pit Stop floor even if caller passes 0 or < 2.5
  const effectiveLockoutSeconds = Math.max(2.5, wrongLockoutSeconds || 2.5);

  useEffect(() => {
    return () => {
      if (correctTimerRef.current) clearTimeout(correctTimerRef.current);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  // 1. Reset eliminated options, feedback, and pending timers ONLY when the question itself changes
  useEffect(() => {
    if (correctTimerRef.current) {
      clearTimeout(correctTimerRef.current);
      correctTimerRef.current = null;
    }
    if (wrongTimerRef.current) {
      clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }
    setFeedback(null);
    setIsAnswering(false);
    setEliminatedOptionIds(new Set());
    setLastWrongOption(null);
  }, [questionNumber, question.targetWordId]);

  // 2. Auto-play prompt audio on AUDIO_ONLY questions without resetting active guesses/timers
  useEffect(() => {
    const questionAudioKey = `${questionNumber}:${question.targetWordId}`;
    if (question.promptType === 'AUDIO_ONLY' && !isMuted && lastAutoPlayedQuestionKeyRef.current !== questionAudioKey) {
      lastAutoPlayedQuestionKeyRef.current = questionAudioKey;
      playWordAudio(question.promptSound, question.targetWordEnglish);
    }
  }, [questionNumber, question.targetWordId, question.promptType, question.promptSound, question.targetWordEnglish, playWordAudio, isMuted]);

  // Cap sound volume to subtle whisper while playing on student iPad deck
  useEffect(() => {
    soundEffects.setQuietClassroomMode(true);
    return () => {
      soundEffects.setQuietClassroomMode(false);
    };
  }, []);

  // Wall-clock lockout countdown interval (stable boolean dep avoids 100ms interval churn)
  const isPenaltyTimerActive = penaltySecondsLeft > 0;
  useEffect(() => {
    if (!isPenaltyTimerActive) return;
    const timer = setInterval(() => {
      const remainingMs = penaltyEndTimeRef.current - Date.now();
      const remainingSec = Math.max(0, remainingMs / 1000);
      setPenaltySecondsLeft(parseFloat(remainingSec.toFixed(1)));
      if (remainingMs <= 0) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [isPenaltyTimerActive]);

  const handleSelectOption = (optionId: string) => {
    if (disabled || isAnswering || penaltySecondsLeft > 0 || eliminatedOptionIds.has(optionId)) return;

    setIsAnswering(true);
    const chosenOpt = question.options.find((o) => o.id === optionId) || null;
    const isCorrect =
      optionId === question.correctOptionId ||
      (!question.correctOptionId &&
        chosenOpt?.english?.trim().toLowerCase() === question.targetWordEnglish?.trim().toLowerCase());

    setFeedback({ optionId, isCorrect });

    if (isCorrect) {
      soundEffects.playCorrect();
      suzukaAudio.playBoostSputter();
      // Speak target English word aloud to reinforce auditory acquisition on every correct answer
      if (!question.isMath && autoSpeak && !isMuted && question.targetWordEnglish) {
        speakText(question.targetWordEnglish);
      }
      if (correctTimerRef.current) clearTimeout(correctTimerRef.current);
      correctTimerRef.current = setTimeout(() => {
        correctTimerRef.current = null;
        onAnswer(true, optionId);
        setFeedback(null);
        setIsAnswering(false);
        setEliminatedOptionIds(new Set());
        setLastWrongOption(null);
      }, 340);
    } else {
      soundEffects.playIncorrect();
      suzukaAudio.playRailImpact(0.75);
      setLastWrongOption(chosenOpt);
      setEliminatedOptionIds((prev) => {
        const next = new Set(prev);
        next.add(optionId);
        return next;
      });
      onAnswer(false, optionId);

      if (effectiveLockoutSeconds > 0) {
        penaltyEndTimeRef.current = Date.now() + Math.round(effectiveLockoutSeconds * 1000);
        setPenaltySecondsLeft(effectiveLockoutSeconds);
      }
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = setTimeout(() => {
        wrongTimerRef.current = null;
        setFeedback(null);
        setIsAnswering(false);
      }, Math.min(350, Math.max(180, effectiveLockoutSeconds * 450)));
    }
  };

  // Stable keyboard handler ref (never re-binds on every render; ignores modifiers/inputs/repeat)
  const keyStateRef = useRef({
    disabled,
    isAnswering,
    penaltySecondsLeft,
    options: question.options,
    handleSelectOption,
  });
  keyStateRef.current = {
    disabled,
    isAnswering,
    penaltySecondsLeft,
    options: question.options,
    handleSelectOption,
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }
      const st = keyStateRef.current;
      if (st.disabled || st.isAnswering || st.penaltySecondsLeft > 0) return;
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx !== -1 && st.options[idx]) {
        e.preventDefault();
        st.handleSelectOption(st.options[idx].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Throttle fill percentage (0 to 180 km/h)
  const throttlePct = Math.min(100, Math.max(0, (speedKmh / 180) * 100));
  const cornerCapPct = Math.min(100, Math.max(0, (cornerSpeedLimit / 180) * 100));
  const isCornerLimited = cornerSpeedLimit < 170;

  let throttleGradient = 'from-amber-600 to-amber-400';
  if (speedKmh >= 150) {
    throttleGradient = 'from-pink-500 via-rose-500 to-amber-400 shadow-[0_0_12px_#f43f5e]';
  } else if (speedKmh >= 110) {
    throttleGradient = 'from-cyan-500 to-blue-500';
  } else if (speedKmh >= 55) {
    throttleGradient = 'from-emerald-500 to-teal-400';
  }

  const targetOnsetHint = (question.targetWordEnglish || '').slice(0, 2);
  const isEnPromptType = isEnglishPromptType(question.promptType);
  const hasChoiceImages =
    !isEnPromptType &&
    !question.promptImage &&
    question.promptType !== 'IMAGE_ONLY' &&
    question.options.some((o) => !!o.image);
  const hasPromptHero = Boolean(question.promptImage && !hasChoiceImages);

  return (
    <div
      className={`w-full select-none text-white relative flex flex-col ${
        hideTelemetryHeader
          ? 'h-full p-0 bg-transparent flex-1 min-h-0'
          : 'shrink-0 px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-2.5 bg-slate-950 border-t border-slate-800 shadow-2xl'
      }`}
    >
      <div className="w-full h-full flex flex-col justify-between flex-1 min-h-0">
        {/* Optional Top Telemetry & Streak Header */}
        {!hideTelemetryHeader && (
          <>
            <div className="flex items-center justify-between pb-1.5 mb-1 shrink-0 text-xs font-bold border-b border-slate-800">
              <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap">
                <span className="text-rose-400 font-black flex items-center gap-1 shrink-0">
                  <Flag size={11} />
                  <span>Q {questionNumber} / {totalQuestions}</span>
                </span>
                <span className="text-slate-600 shrink-0">·</span>
                <span className="text-cyan-400 font-mono-tabular font-black shrink-0">
                  ⚡ {Math.round(speedKmh)} KM/H
                </span>
                {isCornerLimited && (
                  <>
                    <span className="text-slate-600 shrink-0">·</span>
                    <span className="text-rose-300 font-mono-tabular font-black text-[11px] flex items-center gap-1 shrink-0">
                      <AlertTriangle size={11} className="text-rose-400" />
                      <span>{t(`RED ZONE MAX ${cornerSpeedLimit}`, `減速帯 ${cornerSpeedLimit}`)}</span>
                    </span>
                  </>
                )}
                {isPassingLane && (
                  <>
                    <span className="text-slate-600 shrink-0">·</span>
                    <span className="text-cyan-300 font-mono-tabular font-black text-[11px] flex items-center gap-1 shrink-0">
                      <Sparkles size={11} className="text-cyan-400" />
                      <span>{t('PASSING LANE', '追越レーン')}</span>
                    </span>
                  </>
                )}
                {currentStreak > 0 && (
                  <>
                    <span className="text-slate-600 shrink-0">·</span>
                    <span className="flex items-center gap-1 text-amber-400 font-black shrink-0">
                      <Flame size={12} />
                      <span>x{currentStreak} {t('NITRO!', 'かそく!')}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="w-full flex flex-col gap-0.5 mb-1.5 shrink-0">
              <div className="h-2.5 w-full rounded-full bg-slate-900 border border-slate-700 p-0.5 relative overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${throttleGradient} transition-all duration-100 ease-out`}
                  style={{ width: `${throttlePct}%` }}
                />
                {isCornerLimited && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 pointer-events-none"
                    style={{ left: `${cornerCapPct}%` }}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Hero Prompt Layout: Giant Square Card on Left + (Prompt Bar on top & 2x2 Grid on bottom) on Right */}
        {hasPromptHero ? (
          <div className="flex gap-2 sm:gap-3 w-full h-[184px] sm:h-[192px] shrink-0 select-none touch-manipulation">
            {/* Left: Giant Hero Image Card (Spans full console height!) */}
            <div className="w-[170px] sm:w-[185px] md:w-[195px] h-full rounded-2xl bg-slate-900/95 border-2 border-slate-700/80 p-2 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden relative">
              <div className="w-full h-full rounded-xl bg-white p-2 shadow-sm border border-black/10 flex items-center justify-center overflow-hidden">
                <img
                  src={question.promptImage}
                  alt={question.targetWordJa || 'Question Prompt'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              </div>
            </div>

            {/* Right: Question Prompt Bar on Top + 2x2 Answer Grid on Bottom */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0 h-full">
              {/* Question Prompt Bar */}
              <div className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-2 text-center shadow-md shrink-0">
                <div className="w-4 shrink-0" />
                <div className="flex-1 flex items-center justify-center min-w-0">
                  {question.isMath ? (
                    <h4 className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight leading-tight text-center truncate">
                      {question.promptText}
                    </h4>
                  ) : question.promptType === 'JA_MEANING' ? (
                    <div className="flex items-center justify-center gap-2 flex-nowrap min-w-0">
                      <RubyText
                        ruby={question.targetWordRuby}
                        kanji={question.targetWordJa}
                        hiragana={question.targetWordHiragana}
                        className="text-xl sm:text-2xl font-black text-white text-center leading-tight truncate"
                        rtClassName="text-cyan-300 font-semibold select-none"
                      />
                      <span className="text-sm sm:text-base font-bold text-slate-300 whitespace-nowrap shrink-0">
                        {t('in English?', 'は英語で？')}
                      </span>
                    </div>
                  ) : (
                    <h4 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight text-center truncate">
                      {question.promptText}
                    </h4>
                  )}
                  {feedback?.isCorrect && question.exampleSentenceEn && (
                    <span className="hidden sm:inline-block ml-2 text-xs font-black text-emerald-300 truncate">
                      ✓ {question.exampleSentenceEn}
                    </span>
                  )}
                </div>
                {question.promptType === 'AUDIO_ONLY' ? (
                  <button
                    type="button"
                    onClick={() => playWordAudio(question.promptSound, question.targetWordEnglish)}
                    aria-label={t('Listen to prompt audio', '英語の音声を聞く')}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 text-xs font-black active:scale-95 transition-transform cursor-pointer shrink-0"
                  >
                    <Volume2 size={13} />
                    <span className="hidden sm:inline">{t('Listen', '聞く')}</span>
                  </button>
                ) : (
                  <div className="w-4 shrink-0" />
                )}
              </div>

              {/* 2x2 Choice Buttons Grid */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full flex-1 min-h-0 relative">
                {/* Pit-Stop Mistake Coach Overlay */}
                {penaltySecondsLeft > 0 && (
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 z-40 mx-auto max-w-sm pointer-events-none flex flex-col items-center justify-center rounded-2xl bg-slate-950/96 border-2 border-amber-400 text-white py-1.5 px-3 shadow-xl">
                    <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm tracking-wide">
                      <span>🔧</span>
                      <span>
                        {wrongSpeedLossRatio > 0
                          ? t(
                              `PIT STOP COACH · SPEED -${Math.round(wrongSpeedLossRatio * 100)}%`,
                              `ピットストップ · 減速 -${Math.round(wrongSpeedLossRatio * 100)}%`
                            )
                          : t('PIT STOP COACH · TRY AGAIN', 'ピットストップ · もう一度')}
                      </span>
                      <span className="font-mono-tabular text-white bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 rounded-md">
                        +{penaltySecondsLeft.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                )}

                {question.options.map((option, idx) => {
                  const style = OPTION_STYLES[idx % OPTION_STYLES.length];
                  const isSelected = feedback?.optionId === option.id;
                  const isFeedbackCorrect = isSelected && feedback?.isCorrect;
                  const isFeedbackWrong = isSelected && !feedback?.isCorrect;
                  const isEliminated = eliminatedOptionIds.has(option.id);
                  const isEnToJa = isEnglishPromptType(question.promptType);
                  const isLockoutActive = penaltySecondsLeft > 0;
                  const isDarkText =
                    style.color === 'yellow' &&
                    !isFeedbackCorrect &&
                    !isFeedbackWrong &&
                    !isEliminated;
                  const textColor = isDarkText ? 'text-slate-950' : 'text-white';
                  const subTextColor = isDarkText ? 'text-slate-800' : 'text-white/90';

                  let btnBg = style.bg;
                  if (isFeedbackCorrect) btnBg = 'bg-emerald-500 border-b-4 border-emerald-700';
                  if (isFeedbackWrong) btnBg = 'bg-rose-700 animate-shake';
                  if (isEliminated && !isFeedbackWrong) btnBg = 'bg-slate-900 border border-slate-800';

                  const text = isEnToJa
                    ? option.ja_kanji || option.ja_hiragana || option.english
                    : option.english || (option as any).text || '';

                  const parenMatch = text.match(/^(.*?)\s*[(（](.*?)[)）]$/);
                  const mainText = parenMatch ? parenMatch[1] : text;
                  const subReading = parenMatch ? parenMatch[2] : null;

                  const textLen = mainText.length;
                  const fontSizeClass =
                    textLen > 12
                      ? 'text-xs sm:text-sm md:text-base font-bold'
                      : textLen > 6
                      ? 'text-sm sm:text-base md:text-lg font-black'
                      : 'text-base sm:text-lg md:text-xl font-black';

                  const showPhonicsChunks =
                    !isEnToJa &&
                    scaffoldingLevel !== 'CHALLENGE' &&
                    option.phonicsChunks &&
                    option.phonicsChunks.length > 1;

                  const showKatakana =
                    !isEnToJa &&
                    !question.isMath &&
                    scaffoldingLevel === 'FULL' &&
                    option.en_katakana;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={disabled || isAnswering || isLockoutActive || isEliminated}
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full h-full rounded-xl sm:rounded-2xl font-black ${textColor} flex items-center justify-center p-1.5 sm:p-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden border-2 touch-manipulation border-white/20 ${btnBg} ${
                        isEliminated
                          ? 'opacity-25 grayscale cursor-not-allowed scale-95 border border-dashed border-rose-500/40'
                          : isLockoutActive
                          ? 'cursor-not-allowed ring-1 ring-amber-400/40'
                          : disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:brightness-105'
                      }`}
                    >
                      <div className="w-full h-full flex items-center justify-center px-2 sm:px-4 text-center pointer-events-none z-10">
                        <div className="flex-1 min-w-0 flex flex-col items-center text-center justify-center">
                          {subReading ? (
                            <div className="flex flex-col items-center text-center w-full">
                              <span className={`w-full ${textColor} leading-tight ${fontSizeClass} truncate`}>
                                {mainText}
                              </span>
                              <span className={`text-[11px] sm:text-xs md:text-sm font-semibold ${subTextColor} mt-0.5 leading-none truncate`}>
                                {subReading}
                              </span>
                            </div>
                          ) : isEnToJa ? (
                            <RubyText
                              ruby={option.ruby}
                              kanji={option.ja_kanji}
                              hiragana={option.ja_hiragana}
                              className={`${fontSizeClass} font-black ${textColor} text-center leading-tight`}
                            />
                          ) : showPhonicsChunks ? (
                            <span className={`w-full ${textColor} leading-tight ${fontSizeClass} truncate`}>
                              {option.phonicsChunks!.map((chunk, cIdx) => (
                                <React.Fragment key={cIdx}>
                                  <span
                                    className={
                                      cIdx === 0
                                        ? isDarkText
                                          ? 'text-indigo-900 underline decoration-indigo-700/60 decoration-2 underline-offset-4'
                                          : 'text-yellow-200 underline decoration-yellow-300/60 decoration-2 underline-offset-4'
                                        : textColor
                                    }
                                  >
                                    {chunk}
                                  </span>
                                  {cIdx < option.phonicsChunks!.length - 1 && (
                                    <span className={`${isDarkText ? 'text-slate-700/70' : 'text-white/55'} mx-0.5 font-normal`}>·</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </span>
                          ) : (
                            <span className={`w-full ${textColor} leading-tight break-words ${fontSizeClass} truncate`}>
                              {text}
                            </span>
                          )}

                          {showKatakana && (
                            <span className={`text-[10px] sm:text-xs ${subTextColor} font-bold mt-0.5 leading-none truncate`}>
                              [{option.en_katakana}]
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Standard Full-Width Layout: Top Prompt Bar */}
            <div
              className="w-full shrink-0 h-10 sm:h-11 px-3 sm:px-4 mb-1 sm:mb-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-2 text-center shadow-md relative"
            >
              <div className="w-8 shrink-0" />
              <div className="flex-1 flex items-center justify-center min-w-0">
                {question.isMath ? (
                  <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-amber-300 tracking-tight leading-tight text-center drop-shadow-sm font-display truncate">
                    {question.promptText}
                  </h4>
                ) : question.promptType === 'JA_MEANING' ? (
                  <div className="flex items-center justify-center gap-2 flex-nowrap min-w-0">
                    <RubyText
                      ruby={question.targetWordRuby}
                      kanji={question.targetWordJa}
                      hiragana={question.targetWordHiragana}
                      className="text-xl sm:text-2xl md:text-3xl font-black text-white text-center leading-tight truncate"
                      rtClassName="text-cyan-300 font-semibold select-none"
                    />
                    <span className="text-sm sm:text-base md:text-lg font-bold text-slate-300 whitespace-nowrap shrink-0">
                      {t('in English?', 'は英語で？')}
                    </span>
                  </div>
                ) : (
                  <h4 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight text-center truncate">
                    {question.promptText}
                  </h4>
                )}

                {feedback?.isCorrect && question.exampleSentenceEn && (
                  <span className="hidden sm:inline-block ml-2 text-xs font-black text-emerald-300 truncate">
                    ✓ {question.exampleSentenceEn}
                  </span>
                )}
              </div>

              {question.promptType === 'AUDIO_ONLY' ? (
                <button
                  type="button"
                  onClick={() => playWordAudio(question.promptSound, question.targetWordEnglish)}
                  aria-label={t('Listen to prompt audio', '英語の音声を聞く')}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 text-xs font-black active:scale-95 transition-transform cursor-pointer shrink-0"
                >
                  <Volume2 size={13} />
                  <span className="hidden sm:inline">{t('Listen', '聞く')}</span>
                </button>
              ) : (
                <div className="w-8 shrink-0" />
              )}
            </div>

        {/* 4 Touch Choice Buttons: Interlocking L-Pods when options contain illustrations, or standard 2x2 grid for text */}
        {hasChoiceImages && question.options.length === 4 ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 relative w-full h-[146px] sm:h-[154px] shrink-0 select-none touch-manipulation">
            {/* Constructive Pit-Stop Mistake Coach Overlay */}
            {penaltySecondsLeft > 0 && (
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 z-40 mx-auto max-w-sm pointer-events-none flex flex-col items-center justify-center rounded-2xl bg-slate-950/96 border-2 border-amber-400 text-white py-1.5 px-3 shadow-xl">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm tracking-wide">
                  <span>🔧</span>
                  <span>
                    {wrongSpeedLossRatio > 0
                      ? t(
                          `PIT STOP COACH · SPEED -${Math.round(wrongSpeedLossRatio * 100)}%`,
                          `ピットストップ · 減速 -${Math.round(wrongSpeedLossRatio * 100)}%`
                        )
                      : t('PIT STOP COACH · TRY AGAIN', 'ピットストップ · もう一度')}
                  </span>
                  <span className="font-mono-tabular text-white bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 rounded-md">
                    +{penaltySecondsLeft.toFixed(1)}s
                  </span>
                </div>

                {!question.isMath && lastWrongOption && (
                  <p className="text-xs font-bold text-rose-300 mt-1 text-center">
                    {t(
                      `“${lastWrongOption.english}” means ${lastWrongOption.ja_kanji || lastWrongOption.en_katakana || 'another word'}.`,
                      `「${lastWrongOption.english}」は「${lastWrongOption.ja_kanji || lastWrongOption.en_katakana || '別の意味'}」だよ！`
                    )}
                  </p>
                )}

                {!question.isMath && targetOnsetHint && (
                  <p className="text-xs font-black text-cyan-300 text-center mt-0.5">
                    {t(
                      `Hint: Look for the word starting with “${targetOnsetHint}...”!`,
                      `ヒント: 「${targetOnsetHint}...」から始まる英単語を探そう！`
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Helper to format ESL text */}
            {(() => {
              const formatOpt = (opt: any) => {
                const isEnToJa = isEnglishPromptType(question.promptType);
                const raw = isEnToJa
                  ? opt.ja_kanji || opt.ja_hiragana || opt.english
                  : opt.english || opt.text || '';
                const m = raw.match(/^(.*?)\s*[(（](.*?)[)）]$/);
                const mainText = m ? m[1] : raw;
                const subReading = m ? m[2] : null;
                const textLen = mainText.length;
                const fontSizeClass =
                  textLen > 14
                    ? 'text-xs sm:text-sm font-bold'
                    : textLen > 8
                    ? 'text-sm sm:text-base font-black'
                    : 'text-base sm:text-lg md:text-xl font-black';
                const showPhonicsChunks =
                  !isEnToJa &&
                  scaffoldingLevel !== 'CHALLENGE' &&
                  opt.phonicsChunks &&
                  opt.phonicsChunks.length > 1;
                const showKatakana =
                  !isEnToJa &&
                  !question.isMath &&
                  scaffoldingLevel === 'FULL' &&
                  opt.en_katakana;
                return { raw, mainText, subReading, fontSizeClass, showPhonicsChunks, showKatakana, isEnToJa };
              };

              const renderTextContent = (opt: any, isDarkText: boolean) => {
                const info = formatOpt(opt);
                const textColor = isDarkText ? 'text-slate-950' : 'text-white';
                const subColor = isDarkText ? 'text-slate-800' : 'text-white/90';

                if (info.subReading) {
                  return (
                    <div className="flex flex-col items-center text-center justify-center min-w-0 w-full px-2">
                      <span className={`w-full leading-tight ${info.fontSizeClass} truncate text-center ${textColor}`}>
                        {info.mainText}
                      </span>
                      <span className={`text-[10px] sm:text-xs font-semibold leading-none mt-0.5 truncate text-center ${subColor}`}>
                        {info.subReading}
                      </span>
                    </div>
                  );
                }
                if (info.isEnToJa) {
                  return (
                    <div className="flex flex-col items-center text-center justify-center min-w-0 w-full px-2">
                      <RubyText
                        ruby={opt.ruby}
                        kanji={opt.ja_kanji}
                        hiragana={opt.ja_hiragana}
                        className={`${info.fontSizeClass} font-black ${textColor} leading-tight truncate text-center`}
                      />
                    </div>
                  );
                }
                if (info.showPhonicsChunks) {
                  return (
                    <div className="flex flex-col items-center text-center justify-center min-w-0 w-full px-2">
                      <span className={`w-full leading-tight ${info.fontSizeClass} truncate text-center ${textColor}`}>
                        {opt.phonicsChunks!.map((chunk: string, cIdx: number) => (
                          <React.Fragment key={cIdx}>
                            <span
                              className={
                                cIdx === 0
                                  ? isDarkText
                                    ? 'text-indigo-900 underline decoration-indigo-700/60 decoration-2 underline-offset-4'
                                    : 'text-yellow-200 underline decoration-yellow-300/60 decoration-2 underline-offset-4'
                                  : ''
                              }
                            >
                              {chunk}
                            </span>
                            {cIdx < opt.phonicsChunks!.length - 1 && (
                              <span className="opacity-60 mx-0.5 font-normal">·</span>
                            )}
                          </React.Fragment>
                        ))}
                      </span>
                      {info.showKatakana && (
                        <span className={`text-[10px] sm:text-xs font-bold mt-0.5 leading-none truncate text-center ${subColor}`}>
                          [{opt.en_katakana}]
                        </span>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center text-center justify-center min-w-0 w-full px-2">
                    <span className={`w-full leading-tight ${info.fontSizeClass} truncate text-center ${textColor}`}>
                      {info.raw}
                    </span>
                    {info.showKatakana && (
                      <span className={`text-[10px] sm:text-xs font-bold mt-0.5 leading-none truncate text-center ${subColor}`}>
                        [{opt.en_katakana}]
                      </span>
                    )}
                  </div>
                );
              };

              const renderCluster = (
                pOpt: any, // Option A (Red or Blue)
                sOpt: any, // Option B (Yellow or Green)
                pStyle: any,
                sStyle: any,
                isYellowTheme: boolean
              ) => {
                const isPSelected = feedback?.optionId === pOpt.id;
                const isPCorrect = isPSelected && feedback?.isCorrect;
                const isPWrong = isPSelected && !feedback?.isCorrect;
                const isPEliminated = eliminatedOptionIds.has(pOpt.id);
                let pBg = pStyle.bg;
                if (isPCorrect) pBg = 'bg-emerald-500';
                if (isPWrong) pBg = 'bg-rose-700 animate-shake';
                if (isPEliminated && !isPWrong) pBg = 'bg-slate-900 border-slate-800 opacity-25 grayscale';

                const isSSelected = feedback?.optionId === sOpt.id;
                const isSCorrect = isSSelected && feedback?.isCorrect;
                const isSWrong = isSSelected && !feedback?.isCorrect;
                const isSEliminated = eliminatedOptionIds.has(sOpt.id);
                const isSYellowTextDark =
                  isYellowTheme && !isSCorrect && !isSWrong && !isSEliminated;
                let sBg = sStyle.bg;
                if (isSCorrect) sBg = 'bg-emerald-500';
                if (isSWrong) sBg = 'bg-rose-700 animate-shake';
                if (isSEliminated && !isSWrong) sBg = 'bg-slate-900 border-slate-800 opacity-25 grayscale';

                const isLock = penaltySecondsLeft > 0;
                const isPPressed = activeTouchId === pOpt.id;
                const isSPressed = activeTouchId === sOpt.id;

                return (
                  <div className="relative w-full h-full grid grid-cols-[115px_1fr_115px] sm:grid-cols-[130px_1fr_130px] grid-rows-2 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl overflow-hidden p-0.5">
                    {/* Primary Tall Image Pod (Left column, rows 1 & 2) */}
                    <button
                      type="button"
                      disabled={disabled || isAnswering || isLock || isPEliminated}
                      onClick={() => handleSelectOption(pOpt.id)}
                      onTouchStart={() => setActiveTouchId(pOpt.id)}
                      onTouchEnd={() => setActiveTouchId(null)}
                      onMouseDown={() => setActiveTouchId(pOpt.id)}
                      onMouseUp={() => setActiveTouchId(null)}
                      className={`col-start-1 row-span-2 rounded-l-xl flex flex-col items-center justify-center p-1 relative border-y-2 border-l-2 border-r-0 border-white/20 active:scale-[0.98] transition-all cursor-pointer touch-manipulation overflow-hidden ${pBg} ${isPPressed ? 'scale-[0.98] brightness-110' : ''}`}
                    >
                      {pOpt.image ? (
                        <div className="w-[92%] h-[84%] rounded-xl bg-white p-1 shadow-sm border border-black/10 flex items-center justify-center overflow-hidden">
                          <img
                            src={pOpt.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain pointer-events-none select-none"
                          />
                        </div>
                      ) : (
                        <span className="text-3xl text-white font-black">▲</span>
                      )}
                    </button>

                    {/* Secondary Top Text Bar (Middle column, Row 1) */}
                    <button
                      type="button"
                      disabled={disabled || isAnswering || isLock || isSEliminated}
                      onClick={() => handleSelectOption(sOpt.id)}
                      onTouchStart={() => setActiveTouchId(sOpt.id)}
                      onTouchEnd={() => setActiveTouchId(null)}
                      onMouseDown={() => setActiveTouchId(sOpt.id)}
                      onMouseUp={() => setActiveTouchId(null)}
                      className={`col-start-2 row-start-1 rounded-none flex items-center justify-center px-2 py-1 relative border-t-2 border-l-2 border-b-2 border-r-0 border-t-white/20 border-l-slate-950 border-b-slate-950 active:scale-[0.98] transition-all cursor-pointer touch-manipulation overflow-hidden ${sBg} ${isSPressed ? 'scale-[0.98] brightness-110' : ''}`}
                    >
                      {renderTextContent(sOpt, isSYellowTextDark)}
                    </button>

                    {/* Primary Bottom Text Bar (Middle column, Row 2) */}
                    <button
                      type="button"
                      disabled={disabled || isAnswering || isLock || isPEliminated}
                      onClick={() => handleSelectOption(pOpt.id)}
                      onTouchStart={() => setActiveTouchId(pOpt.id)}
                      onTouchEnd={() => setActiveTouchId(null)}
                      onMouseDown={() => setActiveTouchId(pOpt.id)}
                      onMouseUp={() => setActiveTouchId(null)}
                      className={`col-start-2 row-start-2 rounded-none flex items-center justify-center px-2 py-1 relative border-b-2 border-r-2 border-t-0 border-l-0 border-b-white/20 border-r-slate-950 active:scale-[0.98] transition-all cursor-pointer touch-manipulation overflow-hidden ${pBg} ${isPPressed ? 'scale-[0.98] brightness-110' : ''}`}
                    >
                      {renderTextContent(pOpt, false)}
                    </button>

                    {/* Secondary Tall Image Pod (Right column, rows 1 & 2) */}
                    <button
                      type="button"
                      disabled={disabled || isAnswering || isLock || isSEliminated}
                      onClick={() => handleSelectOption(sOpt.id)}
                      onTouchStart={() => setActiveTouchId(sOpt.id)}
                      onTouchEnd={() => setActiveTouchId(null)}
                      onMouseDown={() => setActiveTouchId(sOpt.id)}
                      onMouseUp={() => setActiveTouchId(null)}
                      className={`col-start-3 row-span-2 rounded-r-xl flex flex-col items-center justify-center p-1 relative border-y-2 border-r-2 border-l-0 border-white/20 active:scale-[0.98] transition-all cursor-pointer touch-manipulation overflow-hidden ${sBg} ${isSPressed ? 'scale-[0.98] brightness-110' : ''}`}
                    >
                      {sOpt.image ? (
                        <div className="w-[92%] h-[84%] rounded-xl bg-white p-1 shadow-sm border border-black/10 flex items-center justify-center overflow-hidden">
                          <img
                            src={sOpt.image}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain pointer-events-none select-none"
                          />
                        </div>
                      ) : (
                        <span className={`text-3xl font-black ${isYellowTheme ? 'text-slate-950' : 'text-white'}`}>●</span>
                      )}
                    </button>
                  </div>
                );
              };

              return (
                <>
                  {/* Left Cluster: Option 1 (Red L) & Option 3 (Yellow Inverted L) */}
                  {renderCluster(
                    question.options[0],
                    question.options[2],
                    OPTION_STYLES[0],
                    OPTION_STYLES[2],
                    true
                  )}

                  {/* Right Cluster: Option 2 (Blue L) & Option 4 (Green Inverted L) */}
                  {renderCluster(
                    question.options[1],
                    question.options[3],
                    OPTION_STYLES[1],
                    OPTION_STYLES[3],
                    false
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 relative w-full flex-1 min-h-0">
            {/* Constructive Pit-Stop Mistake Coach Overlay */}
            {penaltySecondsLeft > 0 && (
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 z-30 mx-auto max-w-sm pointer-events-none flex flex-col items-center justify-center rounded-2xl bg-slate-950/96 border-2 border-amber-400 text-white py-1.5 px-3 shadow-xl">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm tracking-wide">
                  <span>🔧</span>
                  <span>
                    {wrongSpeedLossRatio > 0
                      ? t(
                          `PIT STOP COACH · SPEED -${Math.round(wrongSpeedLossRatio * 100)}%`,
                          `ピットストップ · 減速 -${Math.round(wrongSpeedLossRatio * 100)}%`
                        )
                      : t('PIT STOP COACH · TRY AGAIN', 'ピットストップ · もう一度')}
                  </span>
                  <span className="font-mono-tabular text-white bg-amber-500/20 border border-amber-400/50 px-2 py-0.5 rounded-md">
                    +{penaltySecondsLeft.toFixed(1)}s
                  </span>
                </div>

                {!question.isMath && lastWrongOption && (
                  <p className="text-xs font-bold text-rose-300 mt-1 text-center">
                    {t(
                      `“${lastWrongOption.english}” means ${lastWrongOption.ja_kanji || lastWrongOption.en_katakana || 'another word'}.`,
                      `「${lastWrongOption.english}」は「${lastWrongOption.ja_kanji || lastWrongOption.en_katakana || '別の意味'}」だよ！`
                    )}
                  </p>
                )}

                {!question.isMath && targetOnsetHint && (
                  <p className="text-xs font-black text-cyan-300 text-center mt-0.5">
                    {t(
                      `Hint: Look for the word starting with “${targetOnsetHint}...”!`,
                      `ヒント: 「${targetOnsetHint}...」から始まる英単語を探そう！`
                    )}
                  </p>
                )}
              </div>
            )}

            {question.options.map((option, idx) => {
              const style = OPTION_STYLES[idx % OPTION_STYLES.length];
              const isSelected = feedback?.optionId === option.id;
              const isFeedbackCorrect = isSelected && feedback?.isCorrect;
              const isFeedbackWrong = isSelected && !feedback?.isCorrect;
              const isEliminated = eliminatedOptionIds.has(option.id);
              const isEnToJa = isEnglishPromptType(question.promptType);
              const isLockoutActive = penaltySecondsLeft > 0;
              const isDarkText =
                style.color === 'yellow' &&
                !isFeedbackCorrect &&
                !isFeedbackWrong &&
                !isEliminated;
              const textColor = isDarkText ? 'text-slate-950' : 'text-white';
              const subTextColor = isDarkText ? 'text-slate-800' : 'text-white/90';

              let btnBg = style.bg;
              if (isFeedbackCorrect) btnBg = 'bg-emerald-500 border-b-4 border-emerald-700';
              if (isFeedbackWrong) btnBg = 'bg-rose-700 animate-shake';
              if (isEliminated && !isFeedbackWrong) btnBg = 'bg-slate-900 border border-slate-800';

              const text = isEnToJa
                ? option.ja_kanji || option.ja_hiragana || option.english
                : option.english || (option as any).text || '';

              // Check for furigana reading in parentheses, e.g. "直角三角形 (ちょっかくさんかくけい)"
              const parenMatch = text.match(/^(.*?)\s*[(（](.*?)[)）]$/);
              const mainText = parenMatch ? parenMatch[1] : text;
              const subReading = parenMatch ? parenMatch[2] : null;

              const textLen = mainText.length;
              const fontSizeClass =
                textLen > 12
                  ? 'text-xs sm:text-sm md:text-base font-bold'
                  : textLen > 6
                  ? 'text-sm sm:text-base md:text-lg font-black'
                  : 'text-base sm:text-lg md:text-xl font-black';

              const showPhonicsChunks =
                !isEnToJa &&
                scaffoldingLevel !== 'CHALLENGE' &&
                option.phonicsChunks &&
                option.phonicsChunks.length > 1;

              const showKatakana =
                !isEnToJa &&
                !question.isMath &&
                scaffoldingLevel === 'FULL' &&
                option.en_katakana;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled || isAnswering || isLockoutActive || isEliminated}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full min-h-[54px] h-full rounded-xl sm:rounded-2xl font-black ${textColor} flex items-center justify-center p-1.5 sm:p-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden border-2 touch-manipulation border-white/20 ${btnBg} ${
                    isEliminated
                      ? 'opacity-25 grayscale cursor-not-allowed scale-95 border border-dashed border-rose-500/40'
                      : isLockoutActive
                      ? 'cursor-not-allowed ring-1 ring-amber-400/40'
                      : disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:brightness-105'
                  }`}
                >
                  {/* Subtle corner shortcut pill (doesn't push or constrain center text) */}
                  <div className="absolute top-2 left-2.5 z-10 pointer-events-none opacity-65 flex items-center gap-1">
                    <span
                      className={`text-[10px] sm:text-xs font-mono font-black px-1.5 py-0.5 rounded-md border ${
                        isDarkText
                          ? 'text-slate-950 bg-black/15 border-black/15'
                          : 'text-white/80 bg-black/35 border-white/10'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </div>

                  {/* Choice Card Content */}
                  <div className="w-full h-full flex items-center justify-center px-2 sm:px-4 text-center pointer-events-none z-10">
                    <div className="flex-1 min-w-0 flex flex-col items-center text-center justify-center">
                      {subReading ? (
                        <div className="flex flex-col items-center text-center w-full">
                          <span className={`w-full ${textColor} leading-tight ${fontSizeClass} truncate`}>
                            {mainText}
                          </span>
                          <span className={`text-[11px] sm:text-xs md:text-sm font-semibold ${subTextColor} mt-0.5 leading-none truncate`}>
                            {subReading}
                          </span>
                        </div>
                      ) : isEnToJa ? (
                        <RubyText
                          ruby={option.ruby}
                          kanji={option.ja_kanji}
                          hiragana={option.ja_hiragana}
                          className={`${fontSizeClass} font-black ${textColor} text-center leading-tight`}
                        />
                      ) : showPhonicsChunks ? (
                        <span className={`w-full ${textColor} leading-tight ${fontSizeClass} truncate`}>
                          {option.phonicsChunks!.map((chunk, cIdx) => (
                            <React.Fragment key={cIdx}>
                              <span
                                className={
                                  cIdx === 0
                                    ? isDarkText
                                      ? 'text-indigo-900 underline decoration-indigo-700/60 decoration-2 underline-offset-4'
                                      : 'text-yellow-200 underline decoration-yellow-300/60 decoration-2 underline-offset-4'
                                    : textColor
                                }
                              >
                                {chunk}
                              </span>
                              {cIdx < option.phonicsChunks!.length - 1 && (
                                <span className={`${isDarkText ? 'text-slate-700/70' : 'text-white/55'} mx-0.5 font-normal`}>·</span>
                              )}
                            </React.Fragment>
                          ))}
                        </span>
                      ) : (
                        <span className={`w-full ${textColor} leading-tight break-words ${fontSizeClass} truncate`}>
                          {text}
                        </span>
                      )}

                      {showKatakana && (
                        <span className={`text-[10px] sm:text-xs ${subTextColor} font-bold mt-0.5 leading-none truncate`}>
                          [{option.en_katakana}]
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export const DeskStudentDeck = SuzukaStudentDeck;
