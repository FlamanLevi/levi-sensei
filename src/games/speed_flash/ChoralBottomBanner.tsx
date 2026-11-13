import React from 'react';
import { VocabularyItem } from '@data/types';
import { Volume2, Sparkles } from 'lucide-react';
import { RubyText } from '@/components/common/RubyText';
import { useLanguage } from '@/context/LanguageContext';

interface ChoralBottomBannerProps {
  card: VocabularyItem;
  onPlayAudio: () => void;
}

export const ChoralBottomBanner: React.FC<ChoralBottomBannerProps> = ({ card, onPlayAudio }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white p-2.5 sm:p-3 rounded-2xl shadow-xl flex flex-nowrap items-center justify-between gap-2.5 animate-fadeIn select-none border border-rose-300/40 overflow-x-auto no-scrollbar whitespace-nowrap">
      {/* Left side: Repetition callout */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl sm:text-2xl shadow-inner animate-bounce shrink-0">
          🗣️
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-rose-100 whitespace-nowrap">
            <span>{t("Repeat together!", <>みんなでリピート！</>)}</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white font-bold shrink-0">
              Repeat!
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-0.5 whitespace-nowrap">
            <span className="text-lg sm:text-2xl font-black text-white tracking-wide truncate">
              {card.english}
            </span>
            <span className="text-xs sm:text-sm font-bold text-rose-100 hidden sm:inline shrink-0">
              <RubyText ruby={card.ruby} kanji={card.ja_kanji} hiragana={card.ja_hiragana} />
            </span>
            {card.en_katakana && (
              <span className="text-xs font-black text-amber-200 shrink-0">
                【{card.en_katakana}】
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Audio replay */}
      <button
        onClick={onPlayAudio}
        className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white text-rose-600 hover:bg-rose-50 active:scale-95 font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer shrink-0"
        title={t("Replay pronunciation (R)", "もう一度発音を聞く (R)")}
      >
        <Volume2 size={16} />
        <span>{t("Hear Again (R)", <>もういちど聞く (R)</>)}</span>
      </button>
    </div>
  );
};
