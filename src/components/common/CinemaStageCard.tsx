import React from 'react';
import { Volume2 } from 'lucide-react';
import { RubySegment } from '@data/types';
import { RubyText } from './RubyText';

export interface CinemaStageCardProps {
  imageUrl?: string | null;
  imageAlt?: string;
  english?: string;
  ruby?: RubySegment[];
  kanji?: string;
  hiragana?: string;
  onAudioClick?: () => void;
  badge?: React.ReactNode;
  maxImageHeightClass?: string;
  emptyPlaceholder?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const CinemaStageCard: React.FC<CinemaStageCardProps> = ({
  imageUrl,
  imageAlt = 'Card',
  english,
  ruby,
  kanji,
  hiragana,
  onAudioClick,
  badge,
  maxImageHeightClass = 'max-h-[min(56vh,540px)]',
  emptyPlaceholder,
  className = '',
  children
}) => {
  return (
    <div
      className={`w-full flex-1 flex flex-col items-center justify-between bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 md:p-6 min-h-0 relative ${className}`}
    >
      {badge && (
        <div className="absolute top-3 left-4 z-20">
          {badge}
        </div>
      )}

      {/* UPPER 70%: Artwork Stage */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            className={`w-full h-full ${maxImageHeightClass} object-contain filter drop-shadow-md transition-all select-none`}
            loading="eager"
          />
        ) : emptyPlaceholder ? (
          emptyPlaceholder
        ) : (
          <div className="text-slate-400 font-bold text-lg">
            No Image Available
          </div>
        )}

        {children}
      </div>

      {/* LOWER 30%: English Word & Japanese Ruby translation */}
      {(english || kanji || hiragana || ruby) && (
        <div className="w-full flex flex-col items-center justify-center pt-2 md:pt-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            {english && (
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-wide truncate max-w-[85vw] md:max-w-3xl">
                {english}
              </h2>
            )}
            {onAudioClick && (
              <button
                type="button"
                onClick={onAudioClick}
                className="p-2 md:p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-500 dark:text-amber-400 transition-all border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer shrink-0"
                title="Hear Pronunciation"
              >
                <Volume2 size={24} />
              </button>
            )}
          </div>

          {(ruby || kanji || hiragana) && (
            <div className="mt-0.5">
              <RubyText
                ruby={ruby}
                kanji={kanji}
                hiragana={hiragana}
                className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400"
                rtClassName="text-[9px] md:text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
