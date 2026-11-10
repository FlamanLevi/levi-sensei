import React, { useState, useEffect } from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { DisplayTier, FlashMode } from './types';
import { resolveCardImage } from './utils';
import { Zap } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface FlashcardStageProps {
  card: VocabularyItem;
  tier: DisplayTier;
  grade: GradeLevel;
  isFlashing: boolean;
  isRevealed: boolean;
  mode: FlashMode;
  onTriggerFlash: () => void;
}

export const FlashcardStage: React.FC<FlashcardStageProps> = ({
  card,
  tier,
  grade,
  isFlashing,
  isRevealed,
  mode,
  onTriggerFlash
}) => {
  const [imgError, setImgError] = useState(false);
  const { t } = useLanguage();

  // In Speed Flash, always resolve to pure illustration artwork ('picture_only')
  // so textbook cards NEVER have duplicate baked-in English words
  const imageUrl = tier === 'word_only' ? null : resolveCardImage(card, 'picture_only', grade);

  useEffect(() => {
    setImgError(false);
  }, [card.id, tier]);

  const getSightWordSizeClass = (text: string) => {
    const clean = text.trim();
    const len = clean.length;
    const tokens = clean.split(/\s+/);
    const maxTokenLen = Math.max(...tokens.map(t => t.length));

    if (maxTokenLen >= 12 || len >= 21) {
      return 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight';
    }
    if (maxTokenLen >= 9 || len >= 15) {
      return 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight';
    }
    if (maxTokenLen >= 7 || len >= 10) {
      return 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-tight';
    }
    if (len >= 6) {
      return 'text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] leading-none';
    }
    return 'text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] leading-none';
  };

  const showCardContent = isFlashing || isRevealed || mode !== 'LIGHTNING';

  return (
    <div className="relative w-full h-full flex-1 min-h-0 bg-white dark:bg-slate-950 rounded-3xl border-4 border-rose-300 dark:border-slate-800 shadow-2xl flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden select-none">
      {/* Visual camera flash strobe overlay */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white/40 pointer-events-none z-30 animate-ping duration-75" />
      )}

      {/* ====================================================================
          1. SHUTTER / CONCEALED STATE (Only for Lightning mode pre-flash)
         ==================================================================== */}
      {!showCardContent ? (
        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 text-center z-10 p-4">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-xl animate-pulse">
            <Zap size={56} className="text-white fill-white" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-wide">
              {t("Blink and you miss it!", <>瞬き禁止！フラッシュ！</>)}
            </h3>
            <p className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">
              {t("Look closely and shout it out in English!", <>よく見て英語で言ってみよう！</>)}
            </p>
          </div>

          <button
            onClick={onTriggerFlash}
            className="px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:brightness-110 active:scale-95 text-white font-black text-lg sm:text-2xl rounded-2xl shadow-xl flex items-center gap-2 transition cursor-pointer"
          >
            <Zap size={24} className="fill-white" />
            <span>{t("⚡ Flash! (Space)", <>⚡ フラッシュ！ (Space)</>)}</span>
          </button>
        </div>
      ) : (
        /* ====================================================================
            2. CARD CONTENT: Pure Full-Height Artwork or Sight Word
           ==================================================================== */
        <div className="w-full h-full relative z-10 animate-fadeIn min-h-0 flex items-center justify-center p-1 sm:p-2">
          {tier === 'word_only' ? (
            // SIGHT WORD READING DRILL (Dynamic Large Typography based on string length)
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
              <span className={`${getSightWordSizeClass(card.english)} font-black text-slate-900 dark:text-white tracking-wider break-words max-w-full drop-shadow-md`}>
                {card.english}
              </span>
            </div>
          ) : (
            // PURE FULL-HEIGHT ILLUSTRATION (Scales to 100% of stage height and width, upscaling small assets)
            <div className="w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4">
              {imageUrl && !imgError ? (
                <img
                  src={imageUrl}
                  alt={card.english}
                  onError={() => setImgError(true)}
                  className="w-full h-full max-h-full max-w-full object-contain drop-shadow-2xl transition-all"
                  loading="eager"
                />
              ) : (
                <div className="text-center p-4">
                  <span className="text-8xl block mb-2">📖</span>
                  <span className="text-4xl font-black text-slate-900 dark:text-white">{card.english}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
