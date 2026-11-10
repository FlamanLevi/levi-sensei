import React from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { resolveCardImage } from '@/utils/cardUtils';
import { RubyText } from '@/components/common/RubyText';
import { Volume2, Flame } from 'lucide-react';

interface SprintStageProps {
  card: VocabularyItem;
  grade: GradeLevel;
  combo: number;
  isVoiceBoostActive: boolean;
  onPlayAudio: () => void;
}

export const SprintStage: React.FC<SprintStageProps> = ({
  card,
  grade,
  combo,
  isVoiceBoostActive,
  onPlayAudio
}) => {
  const imageUrl = resolveCardImage(card, 'picture_only', grade);

  return (
    <div className={`relative w-full flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-3xl border-4 shadow-2xl flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-hidden transition-all duration-150 ${
      isVoiceBoostActive
        ? 'border-amber-400 ring-6 ring-amber-400/40 shadow-[0_0_35px_rgba(251,191,36,0.35)]'
        : 'border-slate-200 dark:border-slate-800'
    }`}>
      {/* Top Bar: Combo & Audio */}
      <div className="w-full flex items-center justify-between z-10 shrink-0">
        {combo >= 2 ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs sm:text-sm shadow-md animate-bounce">
            <Flame size={16} className="fill-white" />
            <span>{combo} COMBO!</span>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Speed Card
          </span>
        )}

        <button
          type="button"
          onClick={onPlayAudio}
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-transform active:scale-90 shadow-sm cursor-pointer"
          title="Replay pronunciation [R]"
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Center Artwork Box */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 py-2 overflow-hidden">
        {imageUrl ? (
          <img
            key={card.id}
            src={imageUrl}
            alt={card.english}
            className="w-full h-full max-h-[min(50vh,460px)] object-contain drop-shadow-md rounded-2xl animate-in zoom-in-95 duration-100"
          />
        ) : (
          <span className="text-7xl">📖</span>
        )}
      </div>

      {/* Big Word Display with Ruby */}
      <div className="w-full text-center pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <h2 className="text-5xl sm:text-7xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-none drop-shadow-sm">
          {card.english}
        </h2>

        <div className="text-lg sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
          <RubyText ruby={card.ruby} kanji={card.ja_kanji} hiragana={card.ja_hiragana} />
        </div>
      </div>
    </div>
  );
};
