import React from 'react';
import { FormattedClue, HintStage } from './types';
import { Volume2, Lock, RefreshCw } from 'lucide-react';

interface ThreeHintsCluesProps {
  clues: FormattedClue[];
  currentStage: HintStage;
  showSubtitles: boolean;
  onReadClue: (text: string) => void;
  onSwapClue?: (stage: 1 | 2 | 3) => void;
}

export const ThreeHintsClues: React.FC<ThreeHintsCluesProps> = ({
  clues,
  currentStage,
  showSubtitles,
  onReadClue,
  onSwapClue
}) => {
  const currentLevel = currentStage === 'REVEALED' ? 4 : currentStage;

  return (
    <div className="w-full flex flex-col justify-between space-y-3 sm:space-y-4">
      {clues.map((clue) => {
        const isRevealed = currentLevel >= clue.stage;
        const isCurrentActive = currentStage === clue.stage;
        const hasMultipleHints = (clue.poolSize || 1) > 1;

        if (!isRevealed) {
          // Locked Clue Card
          return (
            <div
              key={clue.stage}
              className="w-full bg-slate-100 dark:bg-slate-800/60 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex items-center justify-between opacity-60 select-none"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                  <Lock size={16} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400">
                    {clue.jaTitle}
                  </span>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5">
                    次へ進むと オープン！
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl text-[11px] sm:text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-500">
                {clue.points} pts
              </span>
            </div>
          );
        }

        // Revealed Clue Card
        return (
          <div
            key={clue.stage}
            className={`w-full rounded-2xl sm:rounded-3xl p-3 sm:p-4 border-3 transition-all duration-300 shadow-md select-none relative overflow-hidden ${
              isCurrentActive
                ? 'bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-slate-800 dark:via-indigo-950/40 dark:to-slate-800 border-indigo-400 dark:border-indigo-500 ring-4 ring-indigo-300/40 dark:ring-indigo-600/30 scale-[1.01]'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            {/* Top header row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1 sm:mb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-xl">{clue.icon}</span>
                <span className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                  {clue.title}
                </span>
                {isCurrentActive && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-400 text-amber-950 animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 🔄 Swap Hint Button (cycles through the pool for this stage!) */}
                {hasMultipleHints && onSwapClue && (
                  <button
                    type="button"
                    onClick={() => onSwapClue(clue.stage)}
                    className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                    title="別のヒントに切り替え (Shortcut: H key)"
                  >
                    <RefreshCw size={12} />
                    <span>別のヒント ({(clue.poolIndex ?? 0) + 1}/{clue.poolSize})</span>
                  </button>
                )}

                {/* Points badge */}
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-indigo-100 dark:bg-slate-700 text-indigo-800 dark:text-indigo-200">
                  ★ {clue.points} pts
                </span>

                {/* Read aloud button */}
                <button
                  type="button"
                  onClick={() => onReadClue(clue.speakText || clue.enText)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 dark:bg-slate-700 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-xs transition-transform active:scale-90 cursor-pointer"
                  title="Read clue aloud"
                >
                  <Volume2 size={15} />
                </button>
              </div>
            </div>

            {/* English Clue Text */}
            <p className="text-sm sm:text-lg md:text-xl font-black text-slate-900 dark:text-white leading-snug tracking-wide">
              {clue.enText}
            </p>

            {/* Japanese Subtitle if enabled */}
            {showSubtitles && (
              <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
                {clue.jaText}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
