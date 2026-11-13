import React from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { resolveCardImage } from '@/utils/cardUtils';
import { RubyText } from '@/components/common/RubyText';
import { Volume2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CrissCrossPromptModalProps {
  card: VocabularyItem;
  targetDescription: string;
  grade: GradeLevel;
  clearRule: 'LINE_CLEARS' | 'SINGLE_CLEARS';
  onApprove: () => void;
  onPass: () => void;
  onPlayAudio: () => void;
}

export const CrissCrossPromptModal: React.FC<CrissCrossPromptModalProps> = ({
  card,
  targetDescription,
  grade,
  clearRule,
  onApprove,
  onPass,
  onPlayAudio
}) => {
  const { t } = useLanguage();
  const imageUrl = resolveCardImage(card, 'picture_only', grade);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-3xl max-h-[90dvh] bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 relative select-none animate-in zoom-in-95 duration-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Active Line Callout Banner */}
        <div className="w-full flex flex-nowrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl animate-bounce shrink-0">🎯</span>
            <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 truncate">
              {targetDescription}
            </span>
          </div>

          <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
            {clearRule === 'LINE_CLEARS' ? t('Whole Line Sits!', <><ruby>列<rt>れつ</rt></ruby><ruby>全員<rt>ぜんいん</rt></ruby><ruby>着席<rt>ちゃくせき</rt></ruby>！</>) : t('Student Sits!', <><ruby>答<rt>こた</rt></ruby>えた<ruby>人<rt>ひと</rt></ruby><ruby>着席<rt>ちゃくせき</rt></ruby>！</>)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          {/* Left Column: Card Artwork */}
          <div className="w-full h-52 sm:h-60 rounded-2xl bg-white border-2 border-slate-200 dark:border-slate-700 p-3 shadow-inner flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={card.english}
                className="max-h-full max-w-full object-contain drop-shadow-md"
              />
            ) : (
              <span className="text-6xl">📖</span>
            )}
          </div>

          {/* Right Column: Prompt Instruction, Word Details & Action Buttons */}
          <div className="flex flex-col justify-between gap-4 text-center md:text-left">
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight text-center">
              {t('What is this? Say it in English!', <><ruby>英語<rt>えいご</rt></ruby>で<ruby>答<rt>こた</rt></ruby>えよう！ (What is it?)</>)}
            </h3>

            {/* Word Details */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">
                  {card.english}
                </span>
                <div className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  <RubyText ruby={card.ruby} kanji={card.ja_kanji} hiragana={card.ja_hiragana} />
                </div>
              </div>

              <button
                type="button"
                onClick={onPlayAudio}
                className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                title="Hear pronunciation"
              >
                <Volume2 size={20} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onPass}
                className="py-3 px-2 rounded-2xl font-black text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw size={16} className="shrink-0" />
                <span>{t('Pass / Next Line', <>パスして<ruby>別<rt>べつ</rt></ruby>の<ruby>列<rt>れつ</rt></ruby>へ</>)}</span>
              </button>

              <button
                type="button"
                onClick={onApprove}
                className="py-3 px-2 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{t('Correct! Sit Down! (Space)', <><ruby>正解<rt>せいかい</rt></ruby>！<ruby>着席<rt>ちゃくせき</rt></ruby>！ [Space]</>)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
