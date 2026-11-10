import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, QuizPlayer, OPTION_STYLES, TeamId, TEAM_PRESETS, TugOfWarSettings, SprintCumulativeStats } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { Volume2, Flame, AlertTriangle, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { speechService } from '@/services/speechService';

interface QuizStudentTugOfWarProps {
  player: QuizPlayer;
  questions: QuizQuestion[];
  raceStartTime: number;
  tugOfWarSettings?: TugOfWarSettings;
  tugOfWarFinished?: boolean;
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

export const QuizStudentTugOfWar: React.FC<QuizStudentTugOfWarProps> = ({
  player,
  questions,
  raceStartTime,
  tugOfWarSettings,
  tugOfWarFinished,
  onAnswer,
  onLeave
}) => {
  const { t, language } = useLanguage();
  const { playWordAudio } = useAudio();
  const timeLimitSeconds = tugOfWarSettings?.timeLimitSeconds || 60;
  const matchStartTime = raceStartTime + 1500;

  // Local authoritative stats for zero latency
  const [localScore, setLocalScore] = useState<number>(() => player.score || 0);
  const [localStreak, setLocalStreak] = useState<number>(() => player.currentStreak || 0);
  const [localMaxStreak, setLocalMaxStreak] = useState<number>(() => player.maxStreak || 0);
  const [localCorrectCount, setLocalCorrectCount] = useState<number>(() => player.correctCount || 0);
  const [localTotalAnswered, setLocalTotalAnswered] = useState<number>(() => player.totalAnswered || 0);
  const [localFastestTimeMs, setLocalFastestTimeMs] = useState<number>(() => player.fastestTimeMs || 999999);
  const [roundPulls, setRoundPulls] = useState<number>(0);

  // Sync if reconnection has higher stats
  useEffect(() => {
    if (player.score && player.score > localScore) setLocalScore(player.score);
    if (player.currentStreak !== undefined && player.currentStreak > localStreak) setLocalStreak(player.currentStreak);
    if (player.maxStreak !== undefined && player.maxStreak > localMaxStreak) setLocalMaxStreak(player.maxStreak);
    if (player.correctCount !== undefined && player.correctCount > localCorrectCount) setLocalCorrectCount(player.correctCount);
    if (player.totalAnswered !== undefined && player.totalAnswered > localTotalAnswered) setLocalTotalAnswered(player.totalAnswered);
    if (player.fastestTimeMs !== undefined && player.fastestTimeMs < localFastestTimeMs) setLocalFastestTimeMs(player.fastestTimeMs);
  }, [player]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentQuestion = questions[currentIndex % Math.max(1, questions.length)];

  const [feedback, setFeedback] = useState<{ optionId: string; isCorrect: boolean } | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<Set<string>>(new Set());

  // Mud slip penalty state
  const [penaltySecondsLeft, setPenaltySecondsLeft] = useState<number>(0);
  const penaltyEndTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Clock
  const [nowTime, setNowTime] = useState<number>(() => getServerTime());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(getServerTime()), 200);
    return () => clearInterval(timer);
  }, []);

  const elapsedSinceStart = Math.max(0, nowTime - matchStartTime);
  const matchActive = nowTime >= matchStartTime;
  const timeRemainingSeconds = Math.max(0, Math.ceil((timeLimitSeconds * 1000 - elapsedSinceStart) / 1000));
  const isMatchFinished = matchActive && (timeRemainingSeconds <= 0 || !!tugOfWarFinished);

  // Penalty countdown interval
  useEffect(() => {
    if (penaltySecondsLeft <= 0) return;
    const interval = setInterval(() => {
      const remainingMs = penaltyEndTimeRef.current - Date.now();
      const remainingSec = Math.max(0, remainingMs / 1000);
      setPenaltySecondsLeft(parseFloat(remainingSec.toFixed(1)));
      if (remainingMs <= 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [penaltySecondsLeft]);

  // Reset when question changes
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setFeedback(null);
    setIsAnswering(false);
    setEliminatedOptionIds(new Set());
    setPenaltySecondsLeft(0);

    if (currentQuestion && currentQuestion.promptType === 'AUDIO_ONLY') {
      playWordAudio(currentQuestion.promptSound, currentQuestion.targetWordEnglish);
    }
  }, [currentIndex, currentQuestion, playWordAudio]);

  // Answer handler
  const handleSelect = (optionId: string) => {
    if (
      !matchActive ||
      isMatchFinished ||
      isAnswering ||
      penaltySecondsLeft > 0 ||
      eliminatedOptionIds.has(optionId) ||
      !currentQuestion
    ) return;

    setIsAnswering(true);
    const elapsed = Date.now() - questionStartTimeRef.current;
    const timeTakenMs = Math.max(150, isNaN(elapsed) ? 2000 : elapsed);

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
      soundEffects.playRopeTug();
      setFeedback({ optionId, isCorrect: true });

      const newStreak = localStreak + 1;
      const newMaxStreak = Math.max(localMaxStreak, newStreak);
      const pointsEarned = 1000 + Math.min(500, (newStreak - 1) * 100);
      const newScore = localScore + pointsEarned;
      const newCorrectCount = localCorrectCount + 1;
      const newTotalAnswered = localTotalAnswered + 1;
      const nextIndex = currentIndex + 1;

      const newFastestTimeMs = Math.min(localFastestTimeMs, timeTakenMs);
      setLocalFastestTimeMs(newFastestTimeMs);

      setLocalScore(newScore);
      setLocalStreak(newStreak);
      setLocalMaxStreak(newMaxStreak);
      setLocalCorrectCount(newCorrectCount);
      setRoundPulls(prev => prev + 1);
      setLocalTotalAnswered(newTotalAnswered);

      const cumulative: SprintCumulativeStats = {
        score: newScore,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        correctCount: newCorrectCount,
        totalAnswered: newTotalAnswered,
        fastestTimeMs: newFastestTimeMs
      };

      // Swift 260ms transition so students can rapidly pull
      setTimeout(() => {
        onAnswer(
          currentIndex,
          optionId,
          true,
          timeTakenMs,
          pointsEarned,
          nextIndex,
          false,
          undefined,
          cumulative
        );
        setCurrentIndex(nextIndex);
      }, 260);
    } else {
      // Slipped in the mud! Lockout penalty
      soundEffects.playIncorrect();
      soundEffects.playMudSlip();
      setFeedback({ optionId, isCorrect: false });
      setEliminatedOptionIds(prev => new Set(prev).add(optionId));

      const newTotalAnswered = localTotalAnswered + 1;
      setLocalStreak(0);
      setLocalTotalAnswered(newTotalAnswered);

      // Lockout duration (2.5s)
      const penaltySec = tugOfWarSettings?.mudLockoutSeconds || 2.5;
      const penaltyEnd = Date.now() + Math.round(penaltySec * 1000);
      penaltyEndTimeRef.current = penaltyEnd;
      setPenaltySecondsLeft(penaltySec);

      const cumulative: SprintCumulativeStats = {
        score: localScore,
        currentStreak: 0,
        maxStreak: localMaxStreak,
        correctCount: localCorrectCount,
        totalAnswered: newTotalAnswered,
        fastestTimeMs: localFastestTimeMs < 999999 ? localFastestTimeMs : undefined
      };

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

      // Reset feedback after 400ms so button remains eliminated while mud clears
      setTimeout(() => {
        setFeedback(null);
        setIsAnswering(false);
      }, 400);
    }
  };

  const isRed = player.teamId === 'team_red';
  const isWhite = player.teamId === 'team_white';

  if (!currentQuestion) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400">
        {t('Loading questions...', '問題を読み込み中...')}
      </div>
    );
  }

  const isEnPrompt = currentQuestion.promptType === 'EN_TO_JA' || currentQuestion.promptType === 'EN_WORD';

  return (
    <div className="relative w-full h-full max-w-4xl mx-auto flex flex-col p-2 sm:p-4 select-none">
      {/* 1. Top Sports Day Headband Bar */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Team Headband (ハチマキ) badge */}
          {isRed ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs sm:text-sm shadow-md border-2 border-white/80">
              <span>🔴</span>
              <span><ruby>赤組<rt className="text-[7px]">あかぐみ</rt></ruby> (RED)</span>
            </div>
          ) : isWhite ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-900 font-black text-xs sm:text-sm shadow-md border-2 border-slate-400">
              <span>⚪</span>
              <span><ruby>白組<rt className="text-[7px]">しろぐみ</rt></ruby> (WHITE)</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 font-black text-xs">
              {player.nickname}
            </div>
          )}

          {/* Pull counter badge */}
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30 font-black text-xs">
            <span>💪</span>
            <span>{localCorrectCount} {t('PULLS!', '回引いた！')}</span>
          </div>

          {/* Streak Flame */}
          {localStreak >= 2 && (
            <div className="flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-black text-xs animate-pulse">
              <Flame size={12} />
              <span>x{localStreak}</span>
            </div>
          )}
        </div>

        {/* Match Timer */}
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl ${
            timeRemainingSeconds <= 10 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300'
          }`}>
            ⏱️ {timeRemainingSeconds}s
          </span>
        </div>
      </div>

      {/* 2. Question Prompt Area */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-5 shadow-xl border-4 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden mb-2.5 sm:mb-3">
        {/* Audio pronunciation button - Hide for Math */}
        {!currentQuestion.isMath && (
          <button
            type="button"
            onClick={() => playWordAudio(currentQuestion.promptSound, currentQuestion.targetWordEnglish)}
            className="absolute top-3 right-3 p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition"
            title={t('Listen', '発音を聞く')}
          >
            <Volume2 size={22} />
          </button>
        )}

        {/* Target Image if available */}
        {currentQuestion.promptImage && (
          <div className="h-32 sm:h-44 md:h-52 max-h-[40vh] w-auto aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-2 mb-2 flex items-center justify-center">
            <img
              src={currentQuestion.promptImage}
              alt={currentQuestion.targetWordEnglish}
              className="max-h-full max-w-full object-contain pointer-events-none"
            />
          </div>
        )}

        {/* Word Text (Japanese, English, or Math formula) */}
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white text-center leading-tight">
          {currentQuestion.isMath ? (
            <span>{currentQuestion.promptText}</span>
          ) : isEnPrompt ? (
            <span>{currentQuestion.targetWordEnglish}</span>
          ) : (
            <span>{currentQuestion.targetWordJa}</span>
          )}
        </h2>

        {/* Subtext Reading Aid */}
        {currentQuestion.promptSubtext && (
          <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
            {currentQuestion.promptSubtext}
          </p>
        )}

        {/* PULL FLASH OVERLAY ON CORRECT */}
        {feedback?.isCorrect && (
          <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-150">
            <span className="text-4xl sm:text-6xl font-black drop-shadow-md animate-bounce">
              💥 PULL!!
            </span>
            <span className="text-xl sm:text-2xl font-black mt-1">
              <ruby>引いた！<rt className="text-xs">ひいた！</rt></ruby>
            </span>
          </div>
        )}

        {/* MUD SLIP OVERLAY ON INCORRECT */}
        {penaltySecondsLeft > 0 && (
          <div className="absolute inset-0 bg-amber-950/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center text-3xl sm:text-4xl mb-2 shadow-2xl animate-bounce">
              💦
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-amber-200 tracking-tight">
              <ruby>すべった！<rt className="text-xs">すべった！</rt></ruby>
            </h3>
            <p className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5">
              Slipped in the mud! Losing grip on the rope!
            </p>

            {/* Mud clearing progress bar */}
            <div className="w-full max-w-xs h-3 bg-amber-950 rounded-full overflow-hidden border border-amber-700 mt-4">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100 ease-linear"
                style={{ width: `${(penaltySecondsLeft / (tugOfWarSettings?.mudLockoutSeconds || 2.5)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-black text-amber-300 mt-1.5">
              {penaltySecondsLeft.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* ====================================================================
          [ANTIGRAVITY REFACTOR]: Unified Option Presentation, `<RubyText />`
          Furigana, Katakana Reading Aids, and `!isEnPrompt` Cheating Prevention
          WHAT CHANGED:
          1. Added `!isEnPrompt && !currentQuestion.promptImage && option.image`
             guard so option illustrations render on non-translation prompts
             (matching Sprint & Volleyball) while strictly omitting them when
             `isEnPrompt` (`EN_TO_JA` / `EN_WORD`) per GEMINI.md §7.
          2. Added `<RubyText />` furigana support (`option.ruby`) for MEXT
             Kanji accessibility (GEMINI.md §3).
          3. Added `englishReadingAid === 'WITH_KATAKANA'` support (`【Katakana】`).
          ==================================================================== */}
      {/* 3. The 4 Choice Buttons (▲◆●■) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3.5 h-36 sm:h-44 md:h-52 shrink-0">
        {currentQuestion.options.map((option, idx) => {
          const style = OPTION_STYLES[idx % OPTION_STYLES.length];
          const isEliminated = eliminatedOptionIds.has(option.id);
          const isFeedbackTarget = feedback?.optionId === option.id;
          const hasPromptImage = Boolean(currentQuestion.promptImage) || currentQuestion.promptType === 'IMAGE_ONLY';
          const showOptionImage = !isEnPrompt && !hasPromptImage && Boolean(option.image);
          const showKatakana =
            !isEnPrompt &&
            currentQuestion.englishReadingAid === 'WITH_KATAKANA' &&
            Boolean(option.en_katakana);

          return (
            <button
              key={option.id}
              type="button"
              disabled={isAnswering || penaltySecondsLeft > 0 || isEliminated}
              onClick={() => handleSelect(option.id)}
              className={`relative rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 text-left transition-all flex flex-col justify-between overflow-hidden shadow-md active:scale-95 ${
                isEliminated
                  ? 'opacity-25 grayscale border-2 border-slate-700 bg-slate-800 pointer-events-none'
                  : isFeedbackTarget
                    ? feedback.isCorrect
                      ? 'bg-emerald-500 text-white border-4 border-white shadow-emerald-500/50 scale-102'
                      : 'bg-rose-700 text-white border-4 border-rose-400'
                    : `${style.bg} ${style.hoverBg} text-white border-2 ${style.border}`
              }`}
            >
              {/* Shape Badge in corner */}
              <div className="flex items-center justify-between w-full">
                <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/25 flex items-center justify-center text-xs sm:text-base font-black">
                  {style.shapeName}
                </span>

                {isEliminated && (
                  <XCircle size={20} className="text-rose-400" />
                )}
              </div>

              {/* Choice Label + Anti-Cheating Image Guard + Furigana + Katakana */}
              <div className="my-auto text-center w-full px-1 flex flex-col items-center justify-center">
                {showOptionImage && option.image && (
                  <img
                    src={option.image}
                    alt={option.english}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain mb-1 drop-shadow"
                  />
                )}
                <span className="text-base sm:text-xl md:text-2xl font-black line-clamp-2 leading-snug">
                  {isEnPrompt ? (
                    option.ruby && option.ruby.length > 0 ? (
                      <span>
                        {option.ruby.map((seg, rIdx) =>
                          seg.ruby ? (
                            <ruby key={rIdx}>
                              {seg.base}
                              <rt className="text-[9px] font-bold">{seg.ruby}</rt>
                            </ruby>
                          ) : (
                            <span key={rIdx}>{seg.base}</span>
                          )
                        )}
                      </span>
                    ) : (
                      <span>{option.ja_kanji || option.ja_hiragana || option.english}</span>
                    )
                  ) : (
                    <span>{option.english}</span>
                  )}
                </span>
                {isEnPrompt && option.ja_hiragana && option.ja_kanji && option.ja_kanji !== option.ja_hiragana && !option.ruby && (
                  <span className="text-[10px] sm:text-xs text-white/80 block mt-0.5">
                    {option.ja_hiragana}
                  </span>
                )}
                {showKatakana && (
                  <span className="text-[10px] sm:text-xs text-white/90 font-bold block mt-0.5">
                    【{option.en_katakana}】
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* 4. Match Finished Overlay */}
      {isMatchFinished && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-amber-400/30 mb-3 animate-bounce">
            🏁
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            <ruby>試合終了<rt className="text-xs">しあいしゅうりょう</rt></ruby>！
          </h2>
          <p className="text-sm sm:text-base font-bold text-amber-300 mt-1">
            TIME'S UP! Great pulling!
          </p>
          <div className="my-4 px-6 py-3 rounded-2xl bg-slate-900 border-2 border-amber-500/50 shadow-inner">
            <span className="text-xs text-slate-400 block"><ruby>引<rt className="text-[7px]">ひ</rt></ruby>いた<ruby>回数<rt className="text-[7px]">かいすう</rt></ruby> (Your Pulls)</span>
            <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
              {roundPulls || localCorrectCount} <span className="text-lg text-white font-normal">回</span>
            </span>
            {localCorrectCount > roundPulls && roundPulls > 0 && (
              <span className="text-[11px] text-slate-400 block mt-1">
                {t(`Total Pulls: ${localCorrectCount}`, `通算合計: ${localCorrectCount}回`)}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-300 animate-pulse">
            👀 <ruby>前<rt className="text-[7px]">まえ</rt></ruby>の<ruby>大画面<rt className="text-[7px]">だいがめん</rt></ruby>に<ruby>注目<rt className="text-[7px]">ちゅうもく</rt></ruby>しよう！
          </p>
        </div>
      )}
    </div>
  );
};
