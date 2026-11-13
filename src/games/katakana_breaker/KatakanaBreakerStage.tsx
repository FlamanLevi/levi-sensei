import React from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { BeatStep } from './types';
import { resolveCardImage } from '@/utils/cardUtils';
import { Volume2, Sparkles, Wind } from 'lucide-react';

interface KatakanaBreakerStageProps {
  card: VocabularyItem;
  grade: GradeLevel;
  step: BeatStep;
  englishVoiceName: string;
  onPlayJapaneseAudio: () => void;
  onPlayEnglishAudio: () => void;
}

export const KatakanaBreakerStage: React.FC<KatakanaBreakerStageProps> = ({
  card,
  grade,
  step,
  englishVoiceName,
  onPlayJapaneseAudio,
  onPlayEnglishAudio
}) => {
  const imageUrl = resolveCardImage(card, 'picture_only', grade);
  const katakana = card.en_katakana || card.ja_hiragana || card.english;

  // Beat Flags across the 4 measures (16 beats)
  const isKatakanaWordActive = step === 'M1_B0_JAPANESE' || step === 'M1_B1_JAPANESE_HOLD';
  const isJanakuteActive = step === 'M1_B2_JANAKUTE' || step === 'M1_B3_JANAKUTE_HOLD';
  const isEnglishModelActive = step === 'M2_B4_ENGLISH' || step === 'M2_B5_ENGLISH_HOLD' || step === 'M2_B6_PREPARE';
  const isBreathPause = step === 'M2_B7_INHALE';
  const isChoralShout = step === 'M3_B8_CHORAL' || step === 'M3_B9_CHORAL_HOLD';
  const isRingout = step === 'M3_B10_PRAISE' || step === 'M3_B11_RINGOUT';
  const isPickupBreak =
    step === 'M4_B12_GROOVE1' ||
    step === 'M4_B13_GROOVE2' ||
    step === 'M4_B14_PICKUP1' ||
    step === 'M4_B15_PICKUP2';

  const showEnglishText = isEnglishModelActive || isBreathPause || isChoralShout || isRingout || isPickupBreak;

  return (
    <div className="relative w-full flex-1 min-h-0 bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500/80 rounded-3xl shadow-2xl p-4 sm:p-6 flex flex-col items-center justify-between select-none overflow-hidden transition-colors">
      {/* 1. Top Bar: The Callout ("バナナ じゃなくて？") */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-bounce">🍌</span>
          <div className="flex items-baseline gap-2">
            {/* Katakana Word on Beat 1 */}
            <span className={`text-2xl sm:text-4xl font-black tracking-wide transition-all duration-150 ${
              isKatakanaWordActive
                ? 'text-rose-600 dark:text-rose-400 scale-110 drop-shadow-md'
                : 'text-slate-800 dark:text-slate-200'
            }`}>
              {katakana}
            </span>

            {/* "じゃなくて？" on Beat 2 */}
            <span className={`text-lg sm:text-2xl font-black transition-all duration-150 ${
              isJanakuteActive
                ? 'text-amber-500 scale-115 animate-bounce drop-shadow-md'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              じゃなくて？
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 font-mono hidden sm:inline">
            Voice: {englishVoiceName}
          </span>
          <button
            type="button"
            onClick={onPlayJapaneseAudio}
            className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 hover:bg-amber-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
            title="Replay Japanese word"
          >
            <Volume2 size={16} />
          </button>
        </div>
      </div>

      {/* 2. Center Stage: Card Artwork with Dynamic Rhythmic Pulse */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center py-2 relative overflow-hidden">
        {/* Giant Ripple Shockwave on Beat 5 (Class Shout) */}
        {isChoralShout && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-400/30 border-4 border-amber-400 animate-ping duration-500" />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center justify-center h-full max-h-[min(52dvh,460px)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={card.english}
              className={`w-full h-full object-contain drop-shadow-xl rounded-2xl transition-all duration-150 ${
                isChoralShout
                  ? 'scale-110 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]'
                  : isEnglishModelActive
                  ? 'scale-105'
                  : 'scale-95 opacity-85'
              }`}
            />
          ) : (
            <div className="w-48 h-48 rounded-3xl bg-amber-50 dark:bg-slate-800 flex items-center justify-center text-7xl shadow-inner">
              🍌
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Display: English Model / Choral Banner / Breath Cue */}
      <div className="w-full shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col items-center justify-center text-center">
          {/* The English Word */}
          <div className={`transition-all duration-150 flex items-center gap-3 ${
            showEnglishText ? 'opacity-100' : 'opacity-20 scale-90'
          }`}>
            <h2 className={`font-black tracking-tight leading-none drop-shadow-sm transition-all duration-100 ${
              isChoralShout
                ? 'text-6xl sm:text-8xl md:text-9xl text-amber-500 scale-105 animate-pulse'
                : 'text-5xl sm:text-7xl md:text-8xl text-slate-900 dark:text-white'
            }`}>
              {card.english}
            </h2>

            <button
              type="button"
              onClick={onPlayEnglishAudio}
              className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              title="Replay English pronunciation"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Rhythmic Cue Footer Banner */}
          <div className="mt-2 h-8 flex items-center justify-center">
            {isKatakanaWordActive ? (
              <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 animate-pulse">
                [Bar 1] <ruby>聞<rt>き</rt></ruby>いてね... (Listen!)
              </span>
            ) : isJanakuteActive ? (
              <span className="text-xs sm:text-sm font-black text-amber-500">
                [Bar 1] じゃなくて？
              </span>
            ) : isEnglishModelActive ? (
              <span className="text-xs sm:text-sm font-black text-sky-600 dark:text-sky-400">
                [Bar 2] 👉 えいごのモデル！ (English Model)
              </span>
            ) : isBreathPause ? (
              /* Bar 2 Beat 4 Inhale Pause */
              <div className="px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs sm:text-sm flex items-center gap-1.5 animate-pulse">
                <Wind size={15} />
                <span>[Bar 2] <ruby>息<rt>いき</rt></ruby>をすって… (Inhale!)</span>
              </div>
            ) : isChoralShout ? (
              /* Bar 3 Downbeat Choral Shout */
              <div className="px-6 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm sm:text-base shadow-lg animate-bounce flex items-center gap-2">
                <Sparkles size={18} />
                <span>[Bar 3] みんなでリピート！ (SHOUT!)</span>
                <Sparkles size={18} />
              </div>
            ) : isRingout ? (
              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                [Bar 3] Good job! 👏
              </span>
            ) : (
              /* Bar 4 Transition Bridge */
              <div className="flex items-center gap-3 text-amber-500 font-black text-sm">
                <span>[Bar 4] ♪</span>
                <span className="animate-bounce">🍌</span>
                <span className="animate-bounce delay-75">🍌</span>
                <span>♪</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
