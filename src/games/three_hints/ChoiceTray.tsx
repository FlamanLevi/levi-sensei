import React, { useState } from 'react';
import { GradeLevel } from '@data/types';
import { HintChoiceOption } from './types';
import { resolveCardImage } from './utils';
import { Check, X } from 'lucide-react';

interface ChoiceTrayProps {
  choices: HintChoiceOption[];
  grade: GradeLevel;
  isRevealed: boolean;
  wrongKeys: string[];
  onSelectChoice: (choice: HintChoiceOption) => void;
}

export const ChoiceTray: React.FC<ChoiceTrayProps> = ({
  choices,
  grade,
  isRevealed,
  wrongKeys,
  onSelectChoice
}) => {
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 select-none">
      {choices.map((choice) => {
        const imageUrl = resolveCardImage(choice.word, grade);
        const isWrong = wrongKeys.includes(choice.key);
        const isCorrectChoice = choice.isCorrect;

        return (
          <div
            key={choice.key}
            onClick={() => {
              if (!isRevealed && !isWrong) {
                onSelectChoice(choice);
              }
            }}
            className={`relative rounded-3xl p-3 sm:p-4 border-3 cursor-pointer transition-all duration-200 shadow-md flex flex-col items-center justify-between min-h-[140px] sm:min-h-[160px] ${
              isRevealed && isCorrectChoice
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-4 ring-emerald-300 dark:ring-emerald-500 scale-[1.02]'
                : isWrong
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 opacity-50 cursor-not-allowed animate-card-shake'
                : 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-slate-700 hover:border-indigo-400 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {/* Top key badge */}
            <div className="w-full flex items-center justify-between mb-1">
              <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {choice.key}
              </span>

              {isRevealed && isCorrectChoice && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white flex items-center gap-1 shadow-xs animate-bounce">
                  <Check size={12} />
                  <span>正解！</span>
                </span>
              )}

              {isWrong && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center gap-1 shadow-xs">
                  <X size={12} />
                  <span>ちがうよ</span>
                </span>
              )}
            </div>

            {/* Artwork */}
            <div className="flex-1 flex items-center justify-center py-1">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={choice.word.english}
                  className="max-h-[65px] sm:max-h-[85px] w-auto object-contain drop-shadow-sm"
                />
              ) : (
                <span className="text-3xl">📖</span>
              )}
            </div>

            {/* English label */}
            <div className="w-full text-center mt-1">
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white block truncate">
                {choice.word.english}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block truncate">
                {choice.word.ja_kanji || choice.word.ja_hiragana}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
