import React, { useState } from 'react';
import { GradeLevel } from '@data/types';
import { TraySlot, DisplayTier, CardCount } from './types';
import { resolveCardImage } from './utils';
import { Volume2, Sparkles } from 'lucide-react';
import { RubyText } from '@/components/common/RubyText';
import { StageSpotlight } from '@/components/common/StageSpotlight';
import { useLanguage } from '@/context/LanguageContext';

interface MissingCardSlotProps {
  slot: TraySlot;
  tier: DisplayTier;
  grade: GradeLevel;
  cardIndex: number;
  cardCount?: CardCount;
  teacherGhostPeek?: boolean;
  onRevealSlot?: () => void;
  onPlayAudio?: () => void;
}

export const MissingCardSlot: React.FC<MissingCardSlotProps> = ({
  slot,
  tier,
  grade,
  cardIndex,
  cardCount = 4,
  teacherGhostPeek = true,
  onRevealSlot,
  onPlayAudio
}) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = resolveCardImage(slot.card, tier, grade);
  const { t } = useLanguage();

  // Reset img error on card change
  React.useEffect(() => {
    setImgError(false);
  }, [slot.card.id, tier]);

  // Dynamic font sizing for word-only tier based on cardCount and word length
  const getAdaptiveWordClass = (text: string) => {
    const len = text.trim().length;
    if (cardCount === 4) {
      if (len >= 20) return 'text-xl sm:text-2xl md:text-3xl font-black leading-tight';
      if (len >= 14) return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight';
      if (len >= 9) return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-snug';
      return 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-none';
    }
    if (cardCount === 6) {
      if (len >= 16) return 'text-lg sm:text-xl md:text-2xl font-black leading-tight';
      if (len >= 10) return 'text-xl sm:text-2xl md:text-3xl font-black leading-snug';
      return 'text-2xl sm:text-3xl md:text-4xl font-black leading-none';
    }
    // 8 cards (2 rows of 4, generous space per card)
    if (len >= 16) return 'text-base sm:text-lg md:text-xl font-black leading-tight';
    if (len >= 10) return 'text-lg sm:text-xl md:text-2xl font-black leading-snug';
    return 'text-xl sm:text-2xl md:text-3xl font-black leading-none';
  };

  // 1. VANISHED / GUESSING MYSTERY CARD
  if (slot.isMissing && !slot.isRevealed) {
    return (
      <div
        onClick={onRevealSlot}
        className="w-full h-full min-h-0 rounded-2xl sm:rounded-3xl border-4 border-dashed border-amber-400/90 dark:border-amber-400 bg-gradient-to-b from-amber-400/15 to-amber-500/5 dark:from-amber-900/30 dark:to-slate-900/50 flex flex-col items-center justify-center p-2.5 sm:p-4 cursor-pointer select-none transition-all transform hover:scale-102 hover:border-amber-300 shadow-xl group relative overflow-hidden"
        title={t('Click to reveal this missing card!', 'クリックしてこのカードをオープン！')}
      >
        {/* Subtle pulsing glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Slot index badge for young students */}
        <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400/90 text-amber-950 shadow-sm">
          #{cardIndex + 1}
        </span>

        {/* Teacher Ghost Peek: Discreet watermark visible on handheld iPad or teacher laptop screen */}
        {teacherGhostPeek && (
          <span
            className="absolute top-2.5 right-2.5 text-[10px] sm:text-xs font-mono font-black tracking-wider uppercase text-amber-600/30 dark:text-amber-400/25 max-w-[130px] truncate select-none pointer-events-none"
            title={slot.card.english}
          >
            {slot.card.english}
          </span>
        )}

        {/* Bouncing ? Mystery Icon */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-xl animate-bounce shrink-0 text-3xl sm:text-4xl md:text-5xl">
          ?
        </div>

        <span className="mt-2 text-sm sm:text-lg md:text-xl font-black text-amber-300 tracking-wider drop-shadow group-hover:text-amber-200 transition-colors text-center">
          {t('What is missing?', <>なにが<ruby>消<rt>き</rt></ruby>えた？</>)}
        </span>
        <span className="text-[10px] sm:text-xs font-bold text-amber-200/80 tracking-wide mt-0.5 text-center">
          {t('Shout it out in English!', <>えいごで言ってみよう！</>)}
        </span>

        <span className="mt-2 text-[10px] sm:text-xs font-black px-2.5 py-0.5 sm:py-1 rounded-full bg-white/20 text-white group-hover:bg-amber-400 group-hover:text-amber-950 transition-colors shadow-sm">
          {t('👆 Tap to reveal', <>👆 タップでオープン</>)}
        </span>
      </div>
    );
  }

  // 2. REVEALED MISSING CARD (Dramatic Spotlight & Celebration)
  if (slot.isMissing && slot.isRevealed) {
    const revealedImgUrl = resolveCardImage(slot.card, 'picture_only', grade) || imageUrl;

    return (
      <div
        onClick={onPlayAudio}
        className="w-full h-full min-h-0 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 border-4 border-amber-400 ring-4 ring-amber-400/70 shadow-2xl flex flex-col justify-between p-2.5 sm:p-3 select-none cursor-pointer transform scale-102 transition-all duration-300 relative overflow-hidden group"
      >
        {/* Theatrical Overhead Stage Spotlight */}
        <StageSpotlight color="amber" />

        {/* Confetti sparkle badge */}
        <div className="flex items-center justify-between z-10 shrink-0 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white flex items-center gap-1 shadow-md">
            <Sparkles size={12} />
            <span>{t('🎉 REVEALED!', <>🎉 <ruby>正解<rt>せいかい</rt></ruby>！</>)}</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio?.();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-md transition-transform transform active:scale-95"
            title={t('Pronunciation', '発音を聞く')}
          >
            <Volume2 size={15} />
          </button>
        </div>

        {/* Card Artwork: Dynamically expands to fill available space */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1">
          {revealedImgUrl && !imgError ? (
            <img
              src={revealedImgUrl}
              alt={slot.card.english}
              onError={() => setImgError(true)}
              className="max-h-full max-w-full w-auto h-auto object-contain drop-shadow-md transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="text-center py-2">
              <span className="text-3xl sm:text-5xl block mb-1">🌟</span>
            </div>
          )}
        </div>

        {/* English & Japanese Label with Ruby */}
        <div className="text-center bg-amber-50 dark:bg-slate-900/80 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-amber-200 dark:border-slate-700 z-10 shrink-0">
          <h4 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {slot.card.english}
          </h4>
          <div className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200">
            <RubyText
              ruby={slot.card.ruby}
              kanji={slot.card.ja_kanji}
              hiragana={slot.card.ja_hiragana}
              className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
      </div>
    );
  }

  // 3. NORMAL TRAY CARD (STUDY & REMAINING GUESSING)
  return (
    <div
      onClick={onPlayAudio}
      className="w-full h-full min-h-0 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all flex flex-col justify-between p-2 sm:p-3 select-none cursor-pointer group hover:-translate-y-0.5 relative"
      title={t(`Listen to ${slot.card.english}`, `${slot.card.english}の発音を聞く`)}
    >
      {/* Top row: Slot index & subtle audio trigger */}
      <div className="flex items-center justify-between mb-0.5 sm:mb-1 shrink-0">
        <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
          #{cardIndex + 1}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayAudio?.();
          }}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-sky-500 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
          title={t('Pronunciation', '発音を聞く')}
        >
          <Volume2 size={13} />
        </button>
      </div>

      {/* Main Card Content by Tier */}
      {tier === 'word_only' ? (
        // Word Only Tier: Bold adaptive typography flashcard
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-2">
          <span className={`${getAdaptiveWordClass(slot.card.english)} text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
            {slot.card.english}
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mt-1 sm:mt-2">
            {slot.card.en_katakana || slot.card.ja_hiragana}
          </span>
        </div>
      ) : (
        // Picture Only or Picture + Word Tier: Image fills available slot height and width
        <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1 sm:p-2">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={slot.card.english}
              onError={() => setImgError(true)}
              className="max-h-full max-w-full w-auto h-auto object-contain transition-transform group-hover:scale-105 drop-shadow-sm"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <span className="text-3xl sm:text-4xl mb-1">🎨</span>
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                {slot.card.english}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
                {slot.card.ja_hiragana || slot.card.ja_kanji}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Label (Only shown in Picture + Word tier) */}
      {tier === 'picture_word' && (
        <div className="mt-0.5 sm:mt-1 pt-1 border-t border-slate-100 dark:border-slate-700 text-center shrink-0">
          <span className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight block truncate">
            {slot.card.english}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            {slot.card.ja_hiragana || slot.card.ja_kanji}
          </span>
        </div>
      )}
    </div>
  );
};
