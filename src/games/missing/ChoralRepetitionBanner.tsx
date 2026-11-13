import React from 'react';
import { VocabularyItem } from '@data/types';
import { Volume2, Sparkles } from 'lucide-react';
import { RubyText } from '@/components/common/RubyText';
import { useLanguage } from '@/context/LanguageContext';

interface ChoralRepetitionBannerProps {
  revealedCards: VocabularyItem[];
  onPlayAudio: (card: VocabularyItem) => void;
}

export const ChoralRepetitionBanner: React.FC<ChoralRepetitionBannerProps> = ({
  revealedCards,
  onPlayAudio
}) => {
  const { t } = useLanguage();
  if (revealedCards.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-2 sm:p-3 text-white shadow-xl flex flex-col sm:flex-row sm:flex-nowrap items-center justify-between gap-2.5 animate-fadeIn border-2 border-amber-300">
      {/* Left Choral Callout */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/25 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0 animate-bounce">
          🗣️
        </div>
        <div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-white text-orange-600 uppercase tracking-wider shrink-0">
              {t('Choral Speaking', 'みんなでリピート')}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-amber-100 flex items-center gap-1 shrink-0">
              <Sparkles size={11} />
              <span>{t('Repeat!', '声に出してみよう！')}</span>
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black tracking-tight mt-0.5 whitespace-nowrap">
            {t('Repeat after me!', <>先生に<ruby>続<rt>つづ</rt></ruby>いて言ってみよう！</>)}
          </h3>
        </div>
      </div>

      {/* Center / Right: Words Spotlight */}
      <div className="flex flex-nowrap items-center justify-start sm:justify-end gap-2 sm:gap-3 overflow-x-auto no-scrollbar max-w-full">
        {revealedCards.map((card) => (
          <div
            key={card.id}
            onClick={() => onPlayAudio(card)}
            className="bg-white/95 text-slate-900 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2 cursor-pointer hover:bg-white hover:scale-105 active:scale-95 transition-all border border-amber-300 shrink-0"
            title={t('Click to hear pronunciation', 'クリックで発音を聴く')}
          >
            <div className="flex flex-col text-left">
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {card.english}
                </span>
                {card.en_katakana && (
                  <span className="text-[10px] font-bold text-slate-500">
                    [{card.en_katakana}]
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold text-slate-700">
                <RubyText
                  ruby={card.ruby}
                  kanji={card.ja_kanji}
                  hiragana={card.ja_hiragana}
                  className="text-[11px] font-bold text-slate-700"
                />
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayAudio(card);
              }}
              className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors shadow-xs"
              title={t('Audio', '音声')}
            >
              <Volume2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
