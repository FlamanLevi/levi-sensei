import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, QuizPlayer, OPTION_STYLES, TugOfWarSettings, SprintCumulativeStats } from '../types';
import { evaluateOptionMatch, isEnglishPromptType, resolveLockoutPenaltySeconds } from '../core/quizEngine';
import { RubyText } from '@/components/common/RubyText';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { Volume2, Flame, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';

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
    cumulativeStats?: SprintCumulativeStats,
    incorrectAttempts?: number
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
}) => {
  const { t } = useLanguage();
  const { playWordAudio, isMuted } = useAudio();
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

  useEffect(() => {
    setRoundPulls(0);
  }, [raceStartTime]);

  // Sync if reconnection has higher stats
  useEffect(() => {
    if (player.score && player.score > localScore) setLocalScore(player.score);
    if (player.currentStreak !== undefined && player.currentStreak > localStreak) setLocalStreak(player.currentStreak);
    if (player.maxStreak !== undefined && player.maxStreak > localMaxStreak) setLocalMaxStreak(player.maxStreak);
    if (player.correctCount !== undefined && player.correctCount > localCorrectCount) setLocalCorrectCount(player.correctCount);
    if (player.totalAnswered !== undefined && player.totalAnswered > localTotalAnswered) setLocalTotalAnswered(player.totalAnswered);
    if (player.fastestTimeMs !== undefined && player.fastestTimeMs < localFastestTimeMs) setLocalFastestTimeMs(player.fastestTimeMs);
  }, [player]);

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const answeredKeys = Object.keys(player.answers || {}).length;
    return Math.max(player.sprintProgress || 0, answeredKeys);
  });

  // Sync if authoritative player state hydrates after mount on reconnect
  useEffect(() => {
    const answeredKeys = Object.keys(player.answers || {}).length;
    const authoritativeNext = Math.max(player.sprintProgress || 0, answeredKeys);
    if (authoritativeNext > currentIndex) {
      setCurrentIndex(authoritativeNext);
    }
  }, [player.sprintProgress, player.answers, currentIndex]);

  const currentQuestion = questions[currentIndex % Math.max(1, questions.length)];

  const [feedback, setFeedback] = useState<{ optionId: string; isCorrect: boolean } | null>(null);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<Set<string>>(new Set());

  // Mud slip penalty state
  const [penaltySecondsLeft, setPenaltySecondsLeft] = useState<number>(0);
  const penaltyEndTimeRef = useRef<number>(0);
  const penaltyTotalSecondsRef = useRef<number>(2.5);
  const questionStartTimeRef = useRef<number>(Date.now());
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoPlayedKeyRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

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

  // Penalty countdown interval (stable dependency prevents 100ms interval churn)
  const isLockoutActive = penaltySecondsLeft > 0;
  useEffect(() => {
    if (!isLockoutActive) return;
    const interval = setInterval(() => {
      const remainingMs = penaltyEndTimeRef.current - Date.now();
      const remainingSec = Math.max(0, remainingMs / 1000);
      setPenaltySecondsLeft(parseFloat(remainingSec.toFixed(1)));
      if (remainingMs <= 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isLockoutActive]);

  // Reset when question changes
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setFeedback(null);
    setIsAnswering(false);
    setEliminatedOptionIds(new Set());
    setPenaltySecondsLeft(0);

    const audioKey = `${currentIndex}:${currentQuestion?.targetWordId || ''}`;
    if (
      currentQuestion &&
      currentQuestion.promptType === 'AUDIO_ONLY' &&
      !isMuted &&
      lastAutoPlayedKeyRef.current !== audioKey
    ) {
      lastAutoPlayedKeyRef.current = audioKey;
      playWordAudio(currentQuestion.promptSound, currentQuestion.targetWordEnglish);
    }
  }, [currentIndex, currentQuestion?.promptType, currentQuestion?.promptSound, currentQuestion?.targetWordEnglish, currentQuestion?.targetWordId, isMuted, playWordAudio]);

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
    const isCorrect = evaluateOptionMatch(currentQuestion, optionId);

    if (isCorrect) {
      const mistakesOnThisQuestion = eliminatedOptionIds.size;
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

      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      // Swift 260ms transition so students can rapidly pull
      advanceTimerRef.current = setTimeout(() => {
        onAnswer(
          currentIndex,
          optionId,
          true,
          timeTakenMs,
          pointsEarned,
          nextIndex,
          false,
          undefined,
          cumulative,
          mistakesOnThisQuestion
        );
        setCurrentIndex(nextIndex);
      }, 260);
    } else {
      // Slipped in the mud! Mandatory >= 2.5s lockout penalty floor
      const newMistakes = eliminatedOptionIds.size + 1;
      soundEffects.playIncorrect();
      soundEffects.playMudSlip();
      setFeedback({ optionId, isCorrect: false });
      setEliminatedOptionIds(prev => new Set(prev).add(optionId));

      const newTotalAnswered = localTotalAnswered + 1;
      setLocalStreak(0);
      setLocalTotalAnswered(newTotalAnswered);

      const lockoutInfo = resolveLockoutPenaltySeconds({
        mode: 'TUG_OF_WAR',
        mistakeCountOnQuestion: newMistakes,
        configuredLockoutSeconds: tugOfWarSettings?.mudLockoutSeconds,
      });
      const penaltySec = lockoutInfo.penaltySeconds;
      penaltyTotalSecondsRef.current = penaltySec;
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
        cumulative,
        newMistakes
      );

      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      // Reset feedback after 400ms so button remains eliminated while mud clears
      feedbackTimerRef.current = setTimeout(() => {
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

  const isEnPrompt = isEnglishPromptType(currentQuestion.promptType);
  const hasPromptRuby = !currentQuestion.isMath && !isEnPrompt && Boolean(currentQuestion.targetWordRuby?.length);

  return (
    <div className="relative w-full h-full max-w-4xl mx-auto flex flex-col p-2 sm:p-4 select-none">
      {/* 1. Top Sports Day Headband Bar */}
      <div className="flex flex-nowrap items-center justify-between gap-2 pb-2 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {/* Team Headband (ハチマキ) badge */}
          {isRed ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs sm:text-sm shadow-md border-2 border-white/80 whitespace-nowrap shrink-0">
              <span>🔴</span>
              <span>{t('RED TEAM', <><ruby>赤組<rt>あかぐみ</rt></ruby> (RED)</>)}</span>
            </div>
          ) : isWhite ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-900 font-black text-xs sm:text-sm shadow-md border-2 border-slate-400 whitespace-nowrap shrink-0">
              <span>⚪</span>
              <span>{t('WHITE TEAM', <><ruby>白組<rt>しろぐみ</rt></ruby> (WHITE)</>)}</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 font-black text-xs whitespace-nowrap shrink-0">
              {player.nickname}
            </div>
          )}

          {/* Pull counter badge */}
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-black text-xs whitespace-nowrap shrink-0">
            <span>💪</span>
            <span>{localCorrectCount} {t('PULLS!', '回引いた！')}</span>
          </div>

          {/* Streak Flame */}
          {localStreak >= 2 && (
            <div className="flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-500 dark:text-rose-400 font-black text-xs animate-pulse whitespace-nowrap shrink-0">
              <Flame size={12} />
              <span>x{localStreak}</span>
            </div>
          )}
        </div>

        {/* Match Timer */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${
            timeRemainingSeconds <= 10 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-200'
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
            className="absolute top-3 right-3 p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition cursor-pointer"
            title={t('Listen', '発音を聞く')}
          >
            <Volume2 size={22} />
          </button>
        )}

        {/* Target Image if available */}
        {currentQuestion.promptImage && (
          <div className="h-32 sm:h-44 md:h-52 max-h-[40dvh] w-auto aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-2 mb-2 flex items-center justify-center">
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
            <RubyText
              ruby={currentQuestion.targetWordRuby}
              kanji={currentQuestion.targetWordJa || currentQuestion.promptText}
              hiragana={currentQuestion.targetWordHiragana}
              className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight"
            />
          )}
        </h2>

        {/* Subtext Reading Aid */}
        {currentQuestion.promptSubtext && !hasPromptRuby && (
          <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
            {currentQuestion.promptSubtext}
          </p>
        )}

        {/* PULL FLASH OVERLAY ON CORRECT */}
        {feedback?.isCorrect && (
          <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-150">
            <span className="text-4xl sm:text-6xl font-black drop-shadow-md animate-bounce">
              💥 {t('PULL!!', 'ナイス！')}
            </span>
            <span className="text-xl sm:text-2xl font-black mt-1">
              {t('Keep pulling!', <><ruby>力<rt>ちから</rt></ruby>いっぱい<ruby>引<rt>ひ</rt></ruby>いた！</>)}
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
              {t('SLIPPED IN THE MUD!', <><ruby>泥<rt>どろ</rt></ruby>ですべった！</>)}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-amber-300 mt-0.5">
              {t('Slipped in the mud! Recovering grip on the rope...', 'ぬかるみでスリップ！ロープを握り直しています...')}
            </p>

            {/* Mud clearing progress bar */}
            <div className="w-full max-w-xs h-3 bg-amber-950 rounded-full overflow-hidden border border-amber-700 mt-4">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100 ease-linear"
                style={{ width: `${Math.min(100, Math.max(0, (penaltySecondsLeft / penaltyTotalSecondsRef.current) * 100))}%` }}
              />
            </div>
            <span className="text-xs font-mono font-black text-amber-300 mt-1.5">
              {penaltySecondsLeft.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* 3. The 4 Choice Buttons (▲◆●■) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3.5 h-36 sm:h-44 md:h-52 shrink-0">
        {currentQuestion.options.map((option, idx) => {
          const style = OPTION_STYLES[idx % OPTION_STYLES.length];
          const isEliminated = eliminatedOptionIds.has(option.id);
          const isFeedbackTarget = feedback?.optionId === option.id;
          const isYellowCard = style.color === 'yellow' && !isFeedbackTarget && !isEliminated;
          const hasPromptImage = Boolean(currentQuestion.promptImage) || currentQuestion.promptType === 'IMAGE_ONLY';
          const showOptionImage = !isEnPrompt && !hasPromptImage && Boolean(option.image);
          const showKatakana =
            !isEnPrompt &&
            currentQuestion.englishReadingAid === 'WITH_KATAKANA' &&
            Boolean(option.en_katakana);
          const primaryInk = isYellowCard ? 'text-slate-950' : 'text-white';
          const secondaryInk = isYellowCard ? 'text-slate-800' : 'text-white/90';

          return (
            <button
              key={option.id}
              type="button"
              disabled={isAnswering || penaltySecondsLeft > 0 || isEliminated}
              onClick={() => handleSelect(option.id)}
              className={`relative rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 text-left transition-all flex flex-col justify-between overflow-hidden shadow-md active:scale-95 cursor-pointer ${
                isEliminated
                  ? 'opacity-25 grayscale border-2 border-slate-700 bg-slate-800 pointer-events-none'
                  : isFeedbackTarget
                    ? feedback.isCorrect
                      ? 'bg-emerald-500 text-white border-4 border-white shadow-emerald-500/50 scale-102'
                      : 'bg-rose-700 text-white border-4 border-rose-400'
                    : `${style.bg} ${style.hoverBg} ${primaryInk} border-2 ${style.border}`
              }`}
            >
              {/* Shape Badge in corner */}
              <div className="flex items-center justify-between w-full">
                <span className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-base font-black ${
                  isYellowCard ? 'bg-black/15 text-slate-950' : 'bg-black/25 text-white'
                }`}>
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
                <span className={`text-base sm:text-xl md:text-2xl font-black line-clamp-2 leading-snug ${primaryInk}`}>
                  {isEnPrompt ? (
                    <RubyText
                      ruby={option.ruby}
                      kanji={option.ja_kanji || option.ja_hiragana || option.english}
                      hiragana={option.ja_hiragana}
                      className={`text-base sm:text-xl md:text-2xl font-black leading-snug ${primaryInk}`}
                    />
                  ) : (
                    <span>{option.english}</span>
                  )}
                </span>
                {isEnPrompt && option.ja_hiragana && option.ja_kanji && option.ja_kanji !== option.ja_hiragana && !option.ruby?.length && (
                  <span className={`text-[10px] sm:text-xs block mt-0.5 ${secondaryInk}`}>
                    {option.ja_hiragana}
                  </span>
                )}
                {showKatakana && (
                  <span className={`text-[10px] sm:text-xs font-bold block mt-0.5 ${secondaryInk}`}>
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
            {t("TIME'S UP!", <><ruby>試合終了<rt>しあいしゅうりょう</rt></ruby>！</>)}
          </h2>
          <p className="text-sm sm:text-base font-bold text-amber-300 mt-1">
            {t('Great pulling! Wait for the result!', 'すごい力でした！結果発表を待とう！')}
          </p>
          <div className="my-4 px-6 py-3 rounded-2xl bg-slate-900 border-2 border-amber-500/50 shadow-inner">
            <span className="text-xs text-slate-400 block">
              {t('Your Pulls', <><ruby>引<rt>ひ</rt></ruby>いた<ruby>回数<rt>かいすう</rt></ruby></>)}
            </span>
            <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
              {roundPulls} <span className="text-lg text-white font-normal">{t('pulls', '回')}</span>
            </span>
            {localCorrectCount > roundPulls && (
              <span className="text-[11px] text-slate-400 block mt-1">
                {t(`Total Pulls: ${localCorrectCount}`, `通算合計: ${localCorrectCount}回`)}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-300 animate-pulse">
            👀 {t('Look at the main TV screen!', <><ruby>前<rt>まえ</rt></ruby>の<ruby>大画面<rt>だいがめん</rt></ruby>に<ruby>注目<rt>ちゅうもく</rt></ruby>しよう！</>)}
          </p>
        </div>
      )}
    </div>
  );
};
