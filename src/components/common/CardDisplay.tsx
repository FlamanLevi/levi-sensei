import React, { useState } from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { FourLineNotebookGuide } from './FourLineNotebookGuide';
import { getNumberValue, getNumberTheme } from '../../utils/numberBadge';
import { resolveCardImage } from '../../utils/cardUtils';

interface CardDisplayProps {
  word: VocabularyItem;
  grade?: GradeLevel;
  variant?: 'illust' | 'full' | 'text';
  handwritingMode?: 'solid' | 'trace' | 'blank';
  className?: string;
  showFallbackBadge?: boolean;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
  word,
  grade,
  variant = 'illust',
  handwritingMode = 'solid',
  className = 'w-48 h-48 rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-700 object-contain bg-white',
  showFallbackBadge = true
}) => {
  const [imgError, setImgError] = useState(false);

  // Helper to resolve clean URL
  const formatUrl = (pathStr: string) => {
    if (!pathStr) return '';
    return pathStr.startsWith('http') || pathStr.startsWith('/')
      ? pathStr
      : pathStr.startsWith('cards/')
        ? `/${pathStr}`
        : `/media/images/${pathStr}`;
  };

  const numberStr = getNumberValue(word.english);

  const renderNumberBadge = () => {
    if (!numberStr) return null;
    const theme = getNumberTheme(numberStr);
    return (
      <div className="w-full h-full flex items-center justify-center p-2 select-none">
        <div className={`w-[90%] h-[88%] max-w-[420px] max-h-[300px] rounded-2xl sm:rounded-3xl border-2 sm:border-4 ${theme.border} ${theme.bg} flex items-center justify-center shadow-xs`}>
          <span className={`font-black tracking-tight font-mono ${theme.text} ${numberStr.length > 2 ? 'text-4xl sm:text-6xl md:text-7xl' : 'text-5xl sm:text-7xl md:text-8xl'}`}>
            {numberStr}
          </span>
        </div>
      </div>
    );
  };

  // 1. Resolve Illustration Path (for both illust and dynamic full modes)
  let sourceBadge = '';
  if (grade && word.media_by_grade && word.media_by_grade[grade]) {
    sourceBadge = word.media_by_grade[grade]!.source;
  }
  const illustUrl = resolveCardImage(word, variant === 'full' ? 'picture_word' : 'picture_only', grade) || (word.card_image ? formatUrl(word.card_image) : '');

  // 2. Dynamic 4-Line Notebook Guide Mode
  if (variant === 'full') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden bg-white dark:bg-slate-900 rounded-xl p-1 select-none">
        {/* Top 60%: High-Resolution Artwork, Number Badge, or Flag */}
        <div className="w-full flex-[3] min-h-0 flex items-center justify-center p-1 overflow-hidden">
          {numberStr ? (
            renderNumberBadge()
          ) : illustUrl && !imgError ? (
            <img
              src={illustUrl}
              alt={word.english}
              onError={() => setImgError(true)}
              className="max-w-full max-h-full object-contain drop-shadow-xs"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
              <span className="text-3xl mb-1">📖</span>
              <span className="text-xs font-bold">{word.english}</span>
            </div>
          )}
        </div>

        {/* Bottom 40%: Mathematical 4-Line Notebook Guide */}
        <div className="w-full flex-[2] min-h-0 flex items-center justify-center px-1 pb-1">
          <FourLineNotebookGuide word={word.english} mode={handwritingMode} />
        </div>
      </div>
    );
  }

  // 3. Text Only variant
  if (variant === 'text') {
    return (
      <div className="w-full h-full flex items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-xl">
        <FourLineNotebookGuide word={word.english} mode={handwritingMode} />
      </div>
    );
  }

  // 4. Dynamic Number Word Vector Badge (Zero image files required)
  if (numberStr) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {renderNumberBadge()}
      </div>
    );
  }

  // 5. Pure Illustration variant
  if (imgError || !illustUrl) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-amber-50/60 dark:bg-amber-950/30 p-4 text-center border-dashed border-amber-300 dark:border-amber-700`}>
        <span className="text-4xl mb-1">📖</span>
        <span className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-wide">{word.english}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{word.ja_kanji || word.ja_hiragana}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center group">
      <img
        src={illustUrl}
        alt={word.english}
        onError={() => setImgError(true)}
        className={className}
        loading="lazy"
        decoding="async"
      />
      {showFallbackBadge && sourceBadge && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {sourceBadge}
        </span>
      )}
    </div>
  );
};
