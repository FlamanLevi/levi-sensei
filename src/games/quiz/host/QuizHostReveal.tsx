import React, { useEffect, useState, useCallback, useRef } from 'react';
import { QuizQuestion, QuizResponse, QuizPlayer } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { speechService } from '@/services/speechService';
import { Volume2, CheckCircle2, XCircle, ArrowRight, Sparkles, Flame, Pause, Clock } from 'lucide-react';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';

interface QuizHostRevealProps {
  question: QuizQuestion;
  totalQuestions?: number;
  players: Record<string, QuizPlayer>;
  responses?: Record<string, QuizResponse> | null;
  onNext: () => void;
  onExit?: () => void;
  isSolo?: boolean;
  soloPlayer?: QuizPlayer;
  onDuckBGM?: (duck: boolean) => void;
}

export const QuizHostReveal: React.FC<QuizHostRevealProps> = ({
  question,
  totalQuestions,
  players,
  responses,
  onNext,
  onExit,
  isSolo = false,
  soloPlayer,
  onDuckBGM
}) => {
  const { t, language } = useLanguage();
  const { playWordAudio } = useAudio();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [countdown, setCountdown] = useState<number>(7);
  const [isPaused, setIsPaused] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isBlackoutRef = useRef(isBlackout);
  isBlackoutRef.current = isBlackout;

  const onDuckBGMRef = useRef(onDuckBGM);
  onDuckBGMRef.current = onDuckBGM;

  // Play audio pronunciation automatically on reveal
  const playAudio = useCallback(() => {
    const textToSpeak = question.targetWordEnglish;
    if (!textToSpeak) return;

    setIsPlayingAudio(true);
    onDuckBGMRef.current?.(true);

    if (question.promptSound && /\.(mp3|wav|m4a|ogg)$/i.test(question.promptSound.trim())) {
      playWordAudio(question.promptSound, textToSpeak)
        .finally(() => {
          setIsPlayingAudio(false);
          onDuckBGMRef.current?.(false);
        });
    } else {
      speechService.speak(textToSpeak, {
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

  const hasRevealedRef = useRef<number>(-1);
  const playAudioRef = useRef(playAudio);
  playAudioRef.current = playAudio;

  useEffect(() => {
    if (hasRevealedRef.current === question.questionIndex) {
      return;
    }
    hasRevealedRef.current = question.questionIndex;

    if (isSolo) {
      if (soloPlayer?.lastAnswer?.isCorrect) {
        soundEffects.playCorrect();
      } else {
        soundEffects.playIncorrect();
      }
    } else {
      const anyCorrect = Object.values(players).some(p => p.lastAnswer?.isCorrect);
      if (anyCorrect) {
        soundEffects.playCorrect();
      } else {
        soundEffects.playIncorrect();
      }
    }

    const audioTimer = setTimeout(() => {
      if (!question.isMath) {
        playAudioRef.current();
      }
    }, 250);

    return () => {
      clearTimeout(audioTimer);
      speechService.cancel();
      onDuckBGMRef.current?.(false);
    };
  }, [question.questionIndex]);

  // Auto-advance to Leaderboard after 7 seconds (freezable on pause/blackout)
  useEffect(() => {
    setCountdown(7);
    const interval = window.setInterval(() => {
      if (isPausedRef.current || isBlackoutRef.current) return;
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question.questionIndex, onNext]);

  // Universal Classroom Clicker
  useClassroomClicker({
    onNext,
    onReplayAudio: playAudio,
    onTogglePause: () => setIsPaused(p => !p),
    onBlankScreen: () => setIsBlackout(b => !b)
  });

  useEffect(() => {
    onDuckBGMRef.current?.(isBlackout);
  }, [isBlackout]);

  // Authoritative vote tally: Calculate from responses AND fall back to players' records
  const optionVotes: Record<string, number> = {};
  question.options.forEach(o => optionVotes[o.id] = 0);

  const safeResponses = responses || {};
  const hasDirectResponses = Object.keys(safeResponses).length > 0;

  if (hasDirectResponses) {
    Object.values(safeResponses).forEach(r => {
      if (r && r.answerId && optionVotes[r.answerId] !== undefined) {
        optionVotes[r.answerId]++;
      }
    });
  } else {
    // Robust fallback: Tally directly from active players or soloPlayer
    const activePlayerList = isSolo && soloPlayer ? [soloPlayer] : Object.values(players);
    activePlayerList.forEach(p => {
      const optId = p.lastAnswer?.optionId || p.answers?.[question.questionIndex]?.optionId;
      if (optId && optionVotes[optId] !== undefined) {
        optionVotes[optId]++;
      }
    });
  }

  const totalResponses = Object.values(optionVotes).reduce((sum, v) => sum + v, 0);
  const correctOption = question.options.find(o => o.id === question.correctOptionId);
  const isLastQuestion = question.questionIndex + 1 >= (totalQuestions || question.totalQuestions || 1);
  const isEnPrompt = question.promptType === 'EN_TO_JA' || question.promptType === 'EN_WORD';
  const hasArtwork = Boolean(correctOption?.image || question.promptImage);

  return (
    <div className="w-full max-w-[92vw] max-h-[92vh] mx-auto h-full flex flex-col justify-between p-2 sm:p-3 select-none overflow-hidden relative text-slate-900 dark:text-white animate-in fade-in duration-150">
      {/* 1. Top Banner */}
      <div className="flex items-center justify-between pb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 size={15} />
            <span>{t('Answer Revealed', <><ruby>正解<rt className="text-[7px] font-normal text-emerald-700 dark:text-emerald-300">せいかい</rt></ruby><ruby>発表<rt className="text-[7px] font-normal text-emerald-700 dark:text-emerald-300">はっぴょう</rt></ruby></>)}</span>
          </span>
          <span className="text-xs font-bold text-slate-400">
            Q {question.questionIndex + 1} / {totalQuestions || question.totalQuestions}
          </span>
          <button
            type="button"
            onClick={() => setIsPaused(p => !p)}
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all ${
              isPaused
                ? 'bg-amber-400 text-slate-950 font-black animate-pulse shadow-xs ring-2 ring-amber-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title={t('Pause / Resume timer [P]', 'タイマー一時停止 / 再開 [P]')}
          >
            {isPaused ? <Pause size={12} className="fill-current" /> : <Clock size={12} />}
            <span className="font-mono">
              {isPaused ? t('PAUSED [P]', <><ruby>一時<rt className="text-[7px] font-normal text-slate-900">いちじ</rt></ruby><ruby>停止<rt className="text-[7px] font-normal text-slate-900">ていし</rt></ruby> [P]</>) : `${countdown}s`}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onExit && (
            <button
              onClick={() => {
                if (window.confirm(t('End quiz and return to hub?', 'クイズを終了してホームに戻りますか？'))) {
                  onExit();
                }
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              {t('✕ End', <>✕ <ruby>終了<rt className="text-[7px] font-normal text-rose-500">しゅうりょう</rt></ruby></>)}
            </button>
          )}

          <button
            onClick={onNext}
            className="px-5 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <span>
              {isLastQuestion
                ? <>{t('FINAL RESULTS', <><ruby>最終<rt className="text-[7px] font-normal text-white">さいしゅう</rt></ruby><ruby>結果<rt className="text-[7px] font-normal text-white">けっか</rt></ruby>へ</>)} ({isPaused ? 'PAUSED' : `${countdown}s`})</>
                : <>{t('NEXT', <><ruby>次<rt className="text-[7px] font-normal text-white">つぎ</rt></ruby>へ</>)} ({isPaused ? 'PAUSED' : `${countdown}s`})</>}
            </span>
            <ArrowRight size={15} />
            <span className="hidden sm:inline font-mono opacity-75 text-[10px]">[Space]</span>
          </button>
        </div>
      </div>

      {/* 2. Solo Feedback Toast if in Solo Mode */}
      {isSolo && soloPlayer?.lastAnswer && (
        <div className="shrink-0 mb-1">
          {soloPlayer.lastAnswer.isCorrect ? (
            <div className="bg-emerald-600 text-white rounded-2xl px-4 py-2 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                <div>
                  <span className="text-sm font-black block">{t('CORRECT!!', <><ruby>正解<rt className="text-[8px] font-normal text-white">せいかい</rt></ruby>！その<ruby>調子<rt className="text-[8px] font-normal text-white">ちょうし</rt></ruby>！</>)}</span>
                  <span className="text-xs text-emerald-100 font-bold block">
                    +{soloPlayer.lastAnswer.pointsEarned.toLocaleString()} pts • {(soloPlayer.lastAnswer.timeTakenMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-200 uppercase block">{t('Total Score', <><ruby>合計<rt className="text-[7px] font-normal text-emerald-200">ごうけい</rt></ruby>スコア</>)}</span>
                <span className="text-lg font-black font-mono">{soloPlayer.score.toLocaleString()} pts</span>
              </div>
            </div>
          ) : (
            <div className="bg-rose-600 text-white rounded-2xl px-4 py-2 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💪</span>
                <div>
                  <span className="text-sm font-black block">{t('NICE TRY! (DON\'T GIVE UP!)', <>おしい！<ruby>次<rt className="text-[8px] font-normal text-white">つぎ</rt></ruby>こそ<ruby>正解<rt className="text-[8px] font-normal text-white">せいかい</rt></ruby>しよう！</>)}</span>
                  <span className="text-xs text-rose-100 font-bold block">
                    {t('Listen to the pronunciation and repeat!', <><ruby>発音<rt className="text-[7px] font-normal text-rose-100">はつおん</rt></ruby>を<ruby>聞<rt className="text-[7px] font-normal text-rose-100">き</rt></ruby>いてしっかり<ruby>覚<rt className="text-[7px] font-normal text-rose-100">おぼ</rt></ruby>えよう！</>)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-rose-200 uppercase block">{t('Total Score', <><ruby>合計<rt className="text-[7px] font-normal text-rose-200">ごうけい</rt></ruby>スコア</>)}</span>
                <span className="text-lg font-black font-mono">{soloPlayer.score.toLocaleString()} pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Spotlight Card: Correct Answer Stage (Centered layout with zero empty voids) */}
      <div className={`flex-1 w-full min-h-0 max-h-[52vh] flex flex-col items-center rounded-3xl p-3 sm:p-5 border-4 border-emerald-500 shadow-2xl my-1 relative overflow-hidden ${
        hasArtwork ? 'justify-between' : 'justify-center gap-4'
      } bg-gradient-to-b from-white via-emerald-50/40 to-emerald-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30`}>
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md z-10">
          <CheckCircle2 size={14} />
          <span>{t('CORRECT ANSWER', <><ruby>正解<rt className="text-[7px] font-normal text-white">せいかい</rt></ruby></>)}</span>
        </div>

        {/* Card Artwork (Mounted tightly if present) */}
        {hasArtwork && (
          <div className="flex-1 w-full min-h-0 flex items-center justify-center p-1 sm:p-2 overflow-hidden my-1">
            <div className="h-full aspect-[4/3] max-w-sm sm:max-w-md mx-auto flex items-center justify-center p-2 rounded-2xl bg-[#faf8f5] dark:bg-slate-800 border-2 border-slate-900/30 shadow-md">
              <img
                src={correctOption?.image || question.promptImage}
                alt={question.targetWordEnglish}
                className="w-full h-full object-contain rounded-xl drop-shadow-md"
              />
            </div>
          </div>
        )}

        {/* Big English Word & Ruby Furigana */}
        <div className="text-center w-full shrink-0">
          {question.isMath ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-500 dark:text-slate-400 mb-2">
                {question.promptText}
              </span>
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none font-mono">
                {question.targetWordEnglish}
              </h1>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <h1 className={`${hasArtwork ? 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl' : 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl'} font-black text-slate-900 dark:text-white tracking-tight leading-none`}>
                {question.targetWordEnglish}
              </h1>
              <button
                onClick={playAudio}
                className={`p-2.5 sm:p-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl active:scale-95 transition-all cursor-pointer ${
                  isPlayingAudio ? 'ring-6 ring-emerald-300 animate-pulse scale-105' : ''
                }`}
                title={t('Repeat pronunciation', '発音をもう一度再生')}
              >
                <Volume2 size={26} />
              </button>
            </div>
          )}

          {/* Katakana & Japanese translation with Ruby Furigana */}
          {!question.isMath ? (
            <div className="flex items-center justify-center gap-3 sm:gap-5 mt-2">
              {question.targetWordKatakana && (
                <span className="text-sm sm:text-lg md:text-xl font-black text-emerald-700 dark:text-emerald-300 px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  【{question.targetWordKatakana}】
                </span>
              )}
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">
                {question.targetWordHiragana && question.targetWordJa && question.targetWordHiragana !== question.targetWordJa ? (
                  <ruby className="leading-normal">
                    {question.targetWordJa}
                    <rt className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 select-none">
                      {question.targetWordHiragana}
                    </rt>
                  </ruby>
                ) : (
                  question.targetWordJa
                )}
              </span>
            </div>
          ) : (
            question.targetWordJa && (
              <div className="flex items-center justify-center mt-2">
                <span className="text-lg sm:text-2xl font-bold text-slate-700 dark:text-slate-200">
                  {question.targetWordJa}
                </span>
              </div>
            )
          )}

          {/* Choral repetition cue (English vocabulary only) */}
          {!question.isMath && (
            <p className="text-xs sm:text-sm md:text-base font-black text-indigo-600 dark:text-indigo-400 mt-2 animate-pulse">
              🗣️ {t(`"Everybody, repeat: ${question.targetWordEnglish}!"`, `「みんなでリピート: ${question.targetWordEnglish}！」`)}
            </p>
          )}
        </div>
      </div>

      {/* 4. Answer Distribution Bars (With extra bottom padding so floating BGM widget never overlaps!) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 shrink-0 pt-1 pb-4 sm:pb-5">
        {question.options.map((opt) => {
          const isCorrect = opt.id === question.correctOptionId;
          const votes = optionVotes[opt.id] || 0;
          const votePct = totalResponses > 0 ? Math.round((votes / totalResponses) * 100) : 0;

          let colorBg = 'bg-rose-500';
          let symbolChar = '▲';
          if (opt.symbol === 'diamond') { colorBg = 'bg-blue-500'; symbolChar = '◆'; }
          if (opt.symbol === 'circle') { colorBg = 'bg-amber-400'; symbolChar = '●'; }
          if (opt.symbol === 'square') { colorBg = 'bg-emerald-500'; symbolChar = '■'; }

          const displayText = isEnPrompt
            ? (opt.ja_kanji || opt.ja_hiragana || opt.english)
            : opt.english;
          const subText = isEnPrompt
            ? (opt.ja_hiragana && opt.ja_kanji !== opt.ja_hiragana ? opt.ja_hiragana : undefined)
            : (question.englishReadingAid === 'WITH_KATAKANA' && opt.en_katakana ? `[ ${opt.en_katakana} ]` : undefined);

          return (
            <div
              key={opt.id}
              className={`relative rounded-2xl p-2 sm:p-3 border-2 flex flex-col justify-between transition-all ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400/40 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70'
              }`}
            >
              {/* Header with Shape and Checkmark */}
              <div className="flex items-center justify-between mb-1">
                <div className={`w-6 h-6 rounded-lg ${colorBg} text-white flex items-center justify-center font-black text-xs`}>
                  {symbolChar}
                </div>
                <div className="flex items-center gap-1">
                  {isSolo && soloPlayer?.lastAnswer?.optionId === opt.id && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isCorrect ? '✓' : '✕'}
                    </span>
                  )}
                  {isCorrect ? (
                    <CheckCircle2 className="text-emerald-500" size={17} />
                  ) : (
                    <XCircle className="text-slate-300 dark:text-slate-600" size={15} />
                  )}
                </div>
              </div>

              {/* Text */}
              <div className="my-0.5">
                <span className={`text-sm sm:text-base font-black block truncate ${
                  isCorrect ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {displayText}
                </span>
                {subText && (
                  <span className="text-[10px] text-slate-400 block truncate">
                    {subText}
                  </span>
                )}
              </div>

              {/* Vote Count Bar */}
              <div className="mt-1">
                <div className="flex justify-between items-baseline text-[11px] font-black mb-0.5">
                  <span className={isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                    {votes > 0 
                      ? `${votes} ${t('replies', '人回答')}`
                      : '0人回答'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{votePct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isCorrect ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    style={{ width: `${votePct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emergency Blackout Shutter */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout(b => !b)} />
    </div>
  );
};