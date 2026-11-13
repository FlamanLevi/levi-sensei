import React, { useState, useEffect, useCallback } from 'react';
import { OPTION_STYLES, EnglishReadingAid } from '@/games/quiz/types';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { Delete, CheckCircle2, Lock, Sparkles, Keyboard, Grid2x2, RotateCcw } from 'lucide-react';
import {
  ANTICIPATION_WRONG_LOCKOUT_MS,
  AnticipationEffectiveInputMode,
  AnticipationRoundPublic,
  hashWordAnswer,
  normalizeGuessAnswer,
} from './types';

// CUD High-Contrast Textures matching QuizStudentQuestion
const CUD_TEXTURE_STYLES: Record<string, React.CSSProperties> = {
  triangle: {
    backgroundImage:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.24) 0px, rgba(255,255,255,0.24) 3px, transparent 3px, transparent 14px)',
  },
  diamond: {
    backgroundImage:
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 2.5px, transparent 2.5px, transparent 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 2.5px, transparent 2.5px, transparent 16px)',
  },
  circle: {
    backgroundImage: 'radial-gradient(circle, rgba(15, 23, 42, 0.25) 3.5px, transparent 3.5px)',
    backgroundSize: '18px 18px',
  },
  square: {
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,0.26) 2.5px, transparent 2.5px), linear-gradient(to bottom, rgba(255,255,255,0.26) 2.5px, transparent 2.5px)',
    backgroundSize: '16px 16px',
  },
};

interface GuessingDeckProps {
  round: AnticipationRoundPublic;
  englishReadingAid: EnglishReadingAid;
  solved: boolean;
  isRevealed: boolean;
  incorrectAttempts: number;
  pointsEarned?: number;
  elapsedMs: number;
  onSubmitCorrect: (payload: { optionId?: string; guessText?: string; incorrectAttempts: number }) => void;
  onWrongAttempt: (nextAttempts: number) => void;
}

export const GuessingDeck: React.FC<GuessingDeckProps> = ({
  round,
  englishReadingAid,
  solved,
  isRevealed,
  incorrectAttempts,
  pointsEarned,
  elapsedMs,
  onSubmitCorrect,
  onWrongAttempt,
}) => {
  const { t } = useLanguage();
  const [inputMode, setInputMode] = useState<AnticipationEffectiveInputMode>(round.effectiveInputMode);
  const [lockoutUntilMs, setLockoutUntilMs] = useState<number>(0);
  const [lockoutLeftSec, setLockoutLeftSec] = useState<number>(0);
  const [shakeWrong, setShakeWrong] = useState<boolean>(false);

  // Spelling state: indices picked from round.letterBank
  const [pickedIndices, setPickedIndices] = useState<number[]>([]);

  // Reset per round
  useEffect(() => {
    setInputMode(round.effectiveInputMode);
    setLockoutUntilMs(0);
    setLockoutLeftSec(0);
    setPickedIndices([]);
    setShakeWrong(false);
  }, [round.roundIndex, round.wordId, round.effectiveInputMode]);

  // Countdown tick during 2.5s mandatory wrong-answer lockout
  useEffect(() => {
    if (lockoutUntilMs <= Date.now()) {
      setLockoutLeftSec(0);
      return;
    }
    const update = () => {
      const rem = lockoutUntilMs - Date.now();
      if (rem <= 0) {
        setLockoutUntilMs(0);
        setLockoutLeftSec(0);
      } else {
        setLockoutLeftSec(Math.ceil(rem / 100) / 10);
      }
    };
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [lockoutUntilMs]);

  const isLockedOut = lockoutUntilMs > Date.now();
  const isDisabled = solved || isRevealed || isLockedOut;
  const completionRefMs = round.drawCompletionMs || Math.min(12000, round.drawDurationMs || 11000);
  const showFirstLetterHint = elapsedMs >= completionRefMs * 0.55;
  const showSecondLetterHint = elapsedMs >= completionRefMs && Boolean(round.secondLetterHint);

  const triggerLockout = useCallback(() => {
    const nextAttempts = incorrectAttempts + 1;
    soundEffects.playIncorrect();
    setShakeWrong(true);
    setTimeout(() => setShakeWrong(false), 380);
    setLockoutUntilMs(Date.now() + ANTICIPATION_WRONG_LOCKOUT_MS);
    onWrongAttempt(nextAttempts);
  }, [incorrectAttempts, onWrongAttempt]);

  const handleChoiceClick = (optionId: string, englishText: string) => {
    if (isDisabled) return;
    const isMatch = hashWordAnswer(round.roundIndex, englishText) === round.answerHash;
    if (isMatch) {
      soundEffects.playCorrect();
      onSubmitCorrect({ optionId, guessText: englishText, incorrectAttempts });
    } else {
      triggerLockout();
    }
  };

  const assembledText = pickedIndices.map((idx) => round.letterBank[idx] || '').join('');

  const handleTilePick = (bankIdx: number) => {
    if (isDisabled) return;
    if (pickedIndices.includes(bankIdx)) return;
    if (pickedIndices.length >= round.englishLength) return;
    soundEffects.playTick();
    const next = [...pickedIndices, bankIdx];
    setPickedIndices(next);

    // Auto-check as soon as student completes all letter slots!
    if (next.length === round.englishLength) {
      const fullGuess = next.map((i) => round.letterBank[i] || '').join('');
      const isMatch = hashWordAnswer(round.roundIndex, fullGuess) === round.answerHash;
      if (isMatch) {
        soundEffects.playCorrect();
        onSubmitCorrect({ guessText: fullGuess, incorrectAttempts });
      } else {
        triggerLockout();
        setTimeout(() => setPickedIndices([]), 450);
      }
    }
  };

  const handleSubmitSpelling = useCallback(() => {
    if (isDisabled || assembledText.length === 0) return;
    const isMatch = hashWordAnswer(round.roundIndex, assembledText) === round.answerHash;
    if (isMatch) {
      soundEffects.playCorrect();
      onSubmitCorrect({ guessText: assembledText, incorrectAttempts });
    } else {
      triggerLockout();
      setTimeout(() => setPickedIndices([]), 450);
    }
  }, [isDisabled, assembledText, round.roundIndex, round.answerHash, incorrectAttempts, onSubmitCorrect, triggerLockout]);

  // Physical keyboard support for laptop/chromebook/iPad folio users in Spelling Mode
  useEffect(() => {
    if (inputMode !== 'SPELLING_TILES' || isDisabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        setPickedIndices((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitSpelling();
        return;
      }
      if (/^[a-zA-Z]$/.test(e.key)) {
        const ch = e.key.toUpperCase();
        const availableIdx = round.letterBank.findIndex(
          (l, idx) => l === ch && !pickedIndices.includes(idx)
        );
        if (availableIdx !== -1) {
          handleTilePick(availableIdx);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputMode, isDisabled, pickedIndices, round.letterBank, handleSubmitSpelling]);

  if (solved) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl border-3 border-emerald-300 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-2 shadow-inner">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
          {t('Spot On! Great Sketch Eye!', 'おみごと！せいかい！')}
        </h3>
        {typeof pointsEarned === 'number' && pointsEarned > 0 && (
          <div className="mt-2 px-4 py-1.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-base shadow-md">
            +{pointsEarned.toLocaleString()} pts
          </div>
        )}
        <p className="text-xs font-bold text-emerald-100 mt-2">
          {t('Wait for round reveal & next sketch!', 'みんなの回答と正解発表を待ってね！')}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between gap-2.5 p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border-3 border-slate-200 dark:border-slate-800 shadow-lg ${
        shakeWrong ? 'animate-bounce' : ''
      }`}
    >
      {/* Top Bar: Hint Chips & Choice <-> Spell Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="px-2 py-0.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-[11px] sm:text-xs whitespace-nowrap">
            {round.englishLength} {t('letters', '文字')}
          </span>
          {showFirstLetterHint && (
            <span className="px-2 py-0.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-black text-[11px] sm:text-xs flex items-center gap-1 whitespace-nowrap">
              <Sparkles size={11} />
              <span>
                {t('Hint:', 'ヒント:')}{' '}
                {showSecondLetterHint
                  ? `${round.firstLetterHint}${round.secondLetterHint}…`
                  : `${round.firstLetterHint}…`}
              </span>
            </span>
          )}
        </div>

        {round.allowModeSwitch && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setInputMode('CHOICE_4')}
              className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                inputMode === 'CHOICE_4'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Grid2x2 size={12} />
              <span>{t('4-Choice', '4択')}</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('SPELLING_TILES')}
              className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                inputMode === 'SPELLING_TILES'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Keyboard size={12} />
              <span>{t('Spell', 'スペル')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Answering Area */}
      {inputMode === 'CHOICE_4' ? (
        <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
          {round.options.map((opt, idx) => {
            const style = OPTION_STYLES[idx % OPTION_STYLES.length];
            const isYellow = style.color === 'yellow';
            const showCorrectOnReveal =
              isRevealed &&
              (round.revealedCard?.correctOptionId === opt.id ||
                normalizeGuessAnswer(opt.english) === normalizeGuessAnswer(round.revealedCard?.english || ''));

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleChoiceClick(opt.id, opt.english)}
                style={CUD_TEXTURE_STYLES[style.symbol]}
                className={`relative rounded-2xl border-b-4 p-3 flex flex-col items-center justify-center text-center shadow-md transition-all select-none min-h-[76px] ${
                  style.bg
                } ${style.border} ${
                  isYellow ? 'text-slate-950' : 'text-white'
                } ${
                  showCorrectOnReveal
                    ? 'ring-4 ring-white scale-[1.02] brightness-110'
                    : isDisabled
                    ? 'opacity-70 cursor-not-allowed'
                    : 'hover:brightness-105 active:scale-97 cursor-pointer'
                }`}
              >
                {/* CUD Shape Badge anchored strictly in top-left corner */}
                <span
                  className={`absolute top-2 left-2.5 text-sm font-black leading-none ${
                    isYellow ? 'text-slate-900/80' : 'text-white/90'
                  }`}
                >
                  {style.shapeName}
                </span>

                <span className="text-base sm:text-xl font-black tracking-tight leading-tight px-2">
                  {opt.english}
                </span>
                {englishReadingAid === 'WITH_KATAKANA' && opt.en_katakana && (
                  <span
                    className={`text-[11px] font-bold mt-0.5 leading-tight ${
                      isYellow ? 'text-slate-800/80' : 'text-white/85'
                    }`}
                  >
                    {opt.en_katakana}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5">
          {/* Letter Slot Tray */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 py-2 px-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {Array.from({ length: round.englishLength }, (_, slotIdx) => {
              const char = assembledText[slotIdx];
              const isFirstHint = !char && slotIdx === 0 && showFirstLetterHint;
              const isSecondHint = !char && slotIdx === 1 && showSecondLetterHint;
              const hintChar = isFirstHint
                ? round.firstLetterHint
                : isSecondHint
                ? round.secondLetterHint
                : '';
              return (
                <div
                  key={slotIdx}
                  className={`w-8 h-10 sm:w-10 sm:h-12 rounded-xl border-2 flex items-center justify-center font-mono font-black text-lg sm:text-xl transition-all ${
                    char
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                      : hintChar
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-600 dark:text-amber-300'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400'
                  }`}
                >
                  {char || hintChar || '_'}
                </div>
              );
            })}
          </div>

          {/* Scrambled Letter Bank */}
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
            {round.letterBank.map((letter, idx) => {
              const used = pickedIndices.includes(idx);
              return (
                <button
                  key={`${idx}-${letter}`}
                  type="button"
                  disabled={used || isDisabled}
                  onClick={() => handleTilePick(idx)}
                  className={`h-11 sm:h-12 rounded-xl font-mono font-black text-base sm:text-lg border-b-3 transition-all ${
                    used
                      ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 opacity-35 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white active:scale-95 cursor-pointer shadow-xs'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Control Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={pickedIndices.length === 0 || isDisabled}
              onClick={() => {
                soundEffects.playTick();
                setPickedIndices((prev) => prev.slice(0, -1));
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <Delete size={14} />
              <span>{t('Back', 'けす')}</span>
            </button>
            <button
              type="button"
              disabled={pickedIndices.length === 0 || isDisabled}
              onClick={() => setPickedIndices([])}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>{t('Clear', 'リセット')}</span>
            </button>
            <button
              type="button"
              disabled={pickedIndices.length === 0 || isDisabled}
              onClick={handleSubmitSpelling}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-md disabled:opacity-40 cursor-pointer active:scale-98"
            >
              {t('Check Spelling!', 'こたえあわせ！')}
            </button>
          </div>
        </div>
      )}

      {/* Mandatory >= 2.5s Lockout Overlay on Wrong Guess (GEMINI.md §2) */}
      {isLockedOut && (
        <div className="absolute inset-0 z-20 rounded-3xl bg-rose-950/88 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white animate-in fade-in duration-150">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center mb-2 shadow-lg animate-pulse">
            <Lock size={24} />
          </div>
          <h4 className="text-lg font-black">{t('Not quite! Look closely...', 'おしい！よく絵を見てね！')}</h4>
          <p className="text-xs font-bold text-rose-200 mt-1">
            {t('Unlocking in', 'もうすぐ再開')}: <span className="font-mono text-base font-black text-amber-300">{lockoutLeftSec.toFixed(1)}s</span>
          </p>
        </div>
      )}
    </div>
  );
};
