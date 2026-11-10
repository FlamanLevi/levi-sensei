import React from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { ConcentrationTeam } from './types';
import { resolveCardImage } from './utils';
import { Volume2, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { RubyText } from '@/components/common/RubyText';
import { useLanguage } from '@/context/LanguageContext';

interface ChoralMatchModalProps {
  card: VocabularyItem;
  grade: GradeLevel;
  winningTeam?: ConcentrationTeam | null;
  streak: number;
  onDismiss: () => void;
  onPlayAudio: () => void;
}

export const ChoralMatchModal: React.FC<ChoralMatchModalProps> = ({
  card,
  grade,
  winningTeam,
  streak,
  onDismiss,
  onPlayAudio
}) => {
  const imageUrl = resolveCardImage(card, 'picture_only', grade);
  const { t } = useLanguage();

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gradient-to-b from-white to-indigo-50/90 dark:from-slate-800 dark:to-slate-900 border-4 border-amber-400 ring-8 ring-amber-400/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl space-y-5 animate-scaleUp"
      >
        {/* Confetti celebration badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="px-4 py-1.5 rounded-full text-sm sm:text-base font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white shadow-lg flex items-center gap-2 animate-bounce">
            <Sparkles size={18} />
            <span>{t('🎉 MATCH FOUND!', <>🎉 ペア<ruby>成立<rt className="text-[7px]">せいりつ</rt></ruby>！</>)}</span>
          </span>
        </div>

        {/* Team point notification */}
        {winningTeam && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className={`px-4 py-1.5 rounded-2xl text-sm sm:text-base font-black flex items-center gap-2 shadow-sm ${winningTeam.bgLight} ${winningTeam.border} border-2 ${winningTeam.text}`}>
              <span>{winningTeam.badge}</span>
              <span>{t(`${winningTeam.name} +1 Pair!`, <>{winningTeam.ja} に ＋1 ペア！</>)}</span>
            </div>
            {streak > 1 && (
              <span className="px-3 py-1 bg-amber-400 text-amber-950 rounded-xl text-xs sm:text-sm font-black animate-pulse">
                {t(`🔥 ${streak} streak! Go again!`, `🔥 ${streak}連続正解！ もう1回！`)}
              </span>
            )}
          </div>
        )}

        {/* Artwork */}
        <div className="w-44 h-44 sm:w-56 sm:h-56 mx-auto rounded-3xl bg-white dark:bg-slate-700 p-4 border-4 border-amber-300 dark:border-amber-500 shadow-inner flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={card.english}
              className="w-full h-full object-contain drop-shadow-md"
            />
          ) : (
            <span className="text-6xl">📖</span>
          )}
        </div>

        {/* Choral English Word & Audio */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-3">
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">
              {card.english}
            </h3>
            <button
              onClick={onPlayAudio}
              className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
              title={t('Listen to audio', '発音を聞く')}
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Bilingual Japanese with Ruby Furigana */}
          <div className="text-base sm:text-xl font-bold text-slate-600 dark:text-slate-300">
            <RubyText
              ruby={card.ruby}
              kanji={card.ja_kanji}
              hiragana={card.ja_hiragana}
            />
          </div>

          {/* Katakana Pronunciation Guide */}
          {card.en_katakana && (
            <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
              【{card.en_katakana}】
            </div>
          )}
        </div>

        {/* Choral repetition banner */}
        <div className="bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-2xl py-2 px-4 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-black flex items-center justify-center gap-2">
          <span>🗣️</span>
          <span>{t('Repeat after me!', <>先生に続いて言ってみよう！</>)}</span>
        </div>

        {/* Next / Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span>{t('Next → (Space)', 'つぎへ進む (Space)')}</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};
