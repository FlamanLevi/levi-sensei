import React, { useState } from 'react';
import { GradeLevel } from '@data/types';
import { MemoryCard, CardLabelMode, KANJI_LABELS, ConcentrationTeam } from './types';
import { resolveCardImage } from './utils';
import { Volume2, Lock, Sparkles, Mic } from 'lucide-react';
import { RubyText } from '@/components/common/RubyText';
import { useLanguage } from '@/context/LanguageContext';

interface MemoryCard3DProps {
  card: MemoryCard;
  index: number;
  labelMode: CardLabelMode;
  grade: GradeLevel;
  isFlipped?: boolean;
  isAwaitingSpeech: boolean;
  isLocked: boolean;
  isMismatched: boolean;
  winningTeam?: ConcentrationTeam | null;
  onClick: () => void;
  onPlayAudio?: () => void;
}

export const MemoryCard3D: React.FC<MemoryCard3DProps> = ({
  card,
  index,
  labelMode,
  grade,
  isFlipped = false,
  isAwaitingSpeech,
  isLocked,
  isMismatched,
  winningTeam,
  onClick,
  onPlayAudio
}) => {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  // Reset img error on card change
  React.useEffect(() => {
    setImgError(false);
  }, [card.card.id, card.tier]);

  const imageUrl = resolveCardImage(card.card, card.tier, grade);
  const isUp = isFlipped || card.isFlipped || card.isMatched;

  // Resolve card calling back label
  const kanjiInfo = KANJI_LABELS[index] || { kanji: `${index + 1}`, kana: '' };
  const letterChar = String.fromCharCode(65 + index); // A, B, C...

  // Matched styling
  const matchedBorder = winningTeam
    ? `${winningTeam.border} ring-4 ${winningTeam.cardRing} shadow-xl scale-[1.02]`
    : 'border-emerald-400 ring-4 ring-emerald-300 dark:ring-emerald-500 shadow-xl';

  return (
    <div
      onClick={() => {
        if (!isLocked || isAwaitingSpeech) {
          onClick();
        }
      }}
      className={`perspective-1000 w-full h-full min-h-[85px] sm:min-h-[105px] md:min-h-[125px] lg:min-h-[140px] select-none cursor-pointer transition-transform duration-200 active:scale-95 ${
        isMismatched ? 'animate-card-shake' : ''
      }`}
    >
      <div
        className={`relative w-full h-full transform-style-3d transition-transform duration-500 rounded-3xl ${
          isUp ? 'rotate-y-180' : ''
        }`}
      >
        {/* ====================================================================
            1. FRONT FACE (Card Back / Face Down)
           ==================================================================== */}
        <div
          className={`absolute inset-0 backface-hidden w-full h-full rounded-3xl p-3 flex flex-col items-center justify-center border-4 border-indigo-300 dark:border-indigo-700 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-lg transition-all hover:scale-[1.02] hover:border-amber-300 group overflow-hidden ${
            isLocked ? 'opacity-85' : ''
          }`}
        >
          {/* Subtle background geometric card ornament */}
          <div className="absolute inset-2 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-400/10 rounded-full blur-xl pointer-events-none" />

          {/* Top corner index tag */}
          <span className="absolute top-2.5 left-3 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-black/30 text-white/90">
            #{index + 1}
          </span>

          {/* Locked badge if locked */}
          {isLocked && !isAwaitingSpeech && (
            <span className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-amber-300 flex items-center gap-1 shadow-sm">
              <Lock size={12} />
            </span>
          )}

          {/* Calling Label Typography */}
          {labelMode === 'kanji' ? (
            <div className="flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-6xl md:text-7xl font-black drop-shadow-md tracking-wider leading-none">
                {kanjiInfo.kanji}
              </span>
              {kanjiInfo.kana && (
                <span className="text-xs sm:text-sm font-bold text-indigo-200 mt-1 opacity-90 drop-shadow">
                  {kanjiInfo.kana}
                </span>
              )}
            </div>
          ) : labelMode === 'number' ? (
            <span className="text-4xl sm:text-6xl md:text-7xl font-black drop-shadow-md tracking-wider">
              {index + 1}
            </span>
          ) : labelMode === 'letter' ? (
            <span className="text-4xl sm:text-6xl md:text-7xl font-black drop-shadow-md tracking-wider">
              {letterChar}
            </span>
          ) : (
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl sm:text-5xl font-black shadow-inner">
              ?
            </div>
          )}

          {/* Bottom subtle prompt */}
          <span className="absolute bottom-2 text-[10px] sm:text-xs font-bold text-indigo-200/80 group-hover:text-amber-200 transition-colors">
            {labelMode === 'kanji'
              ? `${kanjiInfo.kanji}ばん`
              : labelMode === 'letter'
              ? `Card ${letterChar}`
              : t(`Card ${index + 1}`, `${index + 1}ばん`)}
          </span>
        </div>

        {/* ====================================================================
            2. BACK FACE (Card Face / Revealed)
           ==================================================================== */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 w-full h-full rounded-3xl bg-white dark:bg-slate-800 p-2.5 sm:p-3 flex flex-col justify-between border-4 shadow-xl select-none relative overflow-hidden ${
            card.isMatched
              ? matchedBorder
              : isAwaitingSpeech
              ? 'border-amber-400 ring-4 ring-amber-300 dark:ring-amber-500 shadow-2xl animate-pulse'
              : 'border-indigo-400 dark:border-indigo-600'
          }`}
        >
          {/* Top header bar */}
          <div className="flex items-center justify-between z-10 w-full">
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-indigo-100 dark:bg-slate-700 text-indigo-800 dark:text-indigo-200 shadow-xs">
              {labelMode === 'kanji' ? kanjiInfo.kanji : labelMode === 'letter' ? letterChar : `#${index + 1}`}
            </span>

            {/* Speaking check badge on Card 1 */}
            {isAwaitingSpeech && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-500 text-white flex items-center gap-1 shadow animate-bounce">
                <Mic size={12} />
                <span>{t('Say it!', '言ってね！')}</span>
              </span>
            )}

            {/* Matched team badge */}
            {card.isMatched && winningTeam && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow flex items-center gap-1">
                <span>{winningTeam.badge}</span>
                <span className={winningTeam.text}>{t(winningTeam.name, winningTeam.ja)}</span>
              </span>
            )}

            {/* Audio pronunciation icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayAudio?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 dark:bg-slate-700 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 flex items-center justify-center transition-transform active:scale-90 shadow-xs"
              title={t('Play pronunciation', '発音を聞く')}
            >
              <Volume2 size={14} />
            </button>
          </div>

          {/* Middle Body: Artwork, Word, or Audio Clue */}
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden py-1">
            {card.tier === 'audio_only' ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayAudio?.();
                }}
                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-slate-700 dark:to-indigo-950/50 rounded-2xl p-2 cursor-pointer group/audio hover:scale-105 transition-transform"
              >
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover/audio:scale-110 transition-transform">
                  <Volume2 size={32} className="animate-pulse" />
                </div>
                <span className="mt-2 text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {t('🔊 Listen!', '🔊 きいてみよう！')}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {t('Click to Listen', 'クリックして聴く')}
                </span>
              </div>
            ) : card.customDisplay ? (
              // Alphabet Upper ↔ Lower display
              <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50/50 dark:bg-slate-700/50 rounded-2xl p-2">
                <span className="text-5xl sm:text-7xl md:text-8xl font-black text-indigo-900 dark:text-white tracking-wider leading-none">
                  {card.customDisplay.primary}
                </span>
                {card.customDisplay.secondary && (
                  <span className="mt-2 text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-300">
                    {card.customDisplay.secondary}
                  </span>
                )}
              </div>
            ) : card.tier === 'word_only' ? (
              // Word Only tier
              <div className="w-full h-full flex flex-col items-center justify-center bg-sky-50/60 dark:bg-slate-700/60 rounded-2xl p-3 text-center">
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                  {card.card.english}
                </span>
                <div className="mt-1 text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-300">
                  <RubyText
                    ruby={card.card.ruby}
                    kanji={card.card.ja_kanji}
                    hiragana={card.card.ja_hiragana}
                  />
                </div>
              </div>
            ) : imageUrl && !imgError ? (
              // Picture Only or Picture + Word
              <img
                src={imageUrl}
                alt={card.card.english}
                onError={() => setImgError(true)}
                className="w-full h-full max-h-[70px] sm:max-h-[90px] md:max-h-[110px] object-contain drop-shadow-md"
              />
            ) : (
              // Fallback if image fails
              <div className="text-center p-2">
                <span className="text-4xl block mb-1">🖼️</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{card.card.english}</span>
              </div>
            )}
          </div>

          {/* Bottom Word Bar (Only shown for picture_word tier, hidden for picture_only to prevent leaks) */}
          {card.tier === 'picture_word' && !card.customDisplay && (
            <div className="w-full text-center bg-indigo-50/80 dark:bg-slate-700/80 rounded-xl py-1 px-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block truncate">
                {card.card.english}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
