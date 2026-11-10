import React, { useState, useEffect } from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { VisualMode, HintStage } from './types';
import { resolveCardImage } from './utils';
import { Volume2, Sparkles, HelpCircle } from 'lucide-react';
import { RubyText } from '@/components/common/RubyText';

interface MysteryCardVisualProps {
  word: VocabularyItem;
  grade: GradeLevel;
  isRevealed: boolean;
  visualMode: VisualMode;
  currentStage: HintStage;
  onPlayAudio?: () => void;
}

export const MysteryCardVisual: React.FC<MysteryCardVisualProps> = ({
  word,
  grade,
  isRevealed,
  visualMode,
  currentStage,
  onPlayAudio
}) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = resolveCardImage(word, grade);

  useEffect(() => {
    setImgError(false);
  }, [word.id]);

  // =========================================================================
  // 1. REVEALED STATE (Spotlight Celebration & High-Res Artwork)
  // =========================================================================
  if (isRevealed) {
    return (
      <div
        onClick={onPlayAudio}
        className="w-full h-full min-h-[220px] sm:min-h-[260px] md:min-h-[300px] rounded-3xl bg-white dark:bg-slate-800 border-4 border-amber-400 ring-4 ring-amber-400/50 shadow-2xl flex flex-col justify-between p-3 sm:p-5 select-none cursor-pointer transform scale-[1.01] transition-all relative overflow-hidden group animate-fadeIn"
      >
        {/* Confetti sparkle badge */}
        <div className="flex items-center justify-between z-10">
          <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white flex items-center gap-1.5 shadow-md animate-bounce">
            <Sparkles size={16} />
            <span>正解！ REVEALED</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio?.();
            }}
            className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-md transition-transform active:scale-90"
            title="Play pronunciation"
          >
            <Volume2 size={20} />
          </button>
        </div>

        {/* Card Artwork */}
        <div className="flex-1 flex items-center justify-center overflow-hidden py-2 sm:py-3">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={word.english}
              onError={() => setImgError(true)}
              className="max-h-[140px] sm:max-h-[190px] md:max-h-[230px] w-auto object-contain drop-shadow-xl animate-scaleUp"
            />
          ) : (
            <div className="text-center p-4">
              <span className="text-7xl block mb-2">📖</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{word.english}</span>
            </div>
          )}
        </div>

        {/* Bilingual Word & Pronunciation Guide */}
        <div className="text-center space-y-1 z-10 bg-indigo-50/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-indigo-100 dark:border-slate-700">
          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">
            {word.english}
          </h3>
          <div className="text-sm sm:text-lg font-bold text-indigo-700 dark:text-indigo-300">
            <RubyText ruby={word.ruby} kanji={word.ja_kanji} hiragana={word.ja_hiragana} />
          </div>
          {word.en_katakana && (
            <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
              【{word.en_katakana}】
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. UNREVEALED / MYSTERY STATE
  // =========================================================================
  return (
    <div className="w-full h-full min-h-[220px] sm:min-h-[260px] md:min-h-[300px] rounded-3xl border-4 border-indigo-300 dark:border-indigo-700 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 p-3 sm:p-5 flex flex-col justify-between select-none shadow-2xl relative overflow-hidden group">
      {/* Background radial aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/15 via-transparent to-transparent pointer-events-none" />

      {/* Top mystery stage tag */}
      <div className="flex items-center justify-between z-10">
        <span className="px-3 py-1 rounded-full text-xs font-black bg-white/10 text-indigo-200 border border-white/20 backdrop-blur">
          {visualMode === 'SILHOUETTE' ? '👤 影絵シルエット' : '❓ ミステリーボックス'}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400/90 text-amber-950 shadow-sm">
          {currentStage === 1 ? '🌟🌟🌟 300点チャンス' : currentStage === 2 ? '🌟🌟 200点チャンス' : '🌟 100点チャンス'}
        </span>
      </div>

      {/* Center Clue Area: Silhouette or Mystery Box */}
      <div className="flex-1 flex items-center justify-center py-2 sm:py-3 relative">
        {visualMode === 'SILHOUETTE' && imageUrl && !imgError ? (
          <div className="relative flex items-center justify-center">
            {/* The Silhouette Image */}
            <img
              src={imageUrl}
              alt="Mystery Clue Silhouette"
              onError={() => setImgError(true)}
              className="max-h-[140px] sm:max-h-[180px] md:max-h-[220px] w-auto object-contain filter brightness-0 contrast-200 opacity-90 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-all duration-500 group-hover:scale-105"
            />
            {/* Ambient glow behind silhouette */}
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl -z-10 rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-amber-950 flex items-center justify-center text-5xl sm:text-7xl font-black shadow-2xl animate-bounce">
              ?
            </div>
            <span className="text-xs sm:text-sm font-black text-indigo-300 tracking-wider">
              だれかな？ なにかな？
            </span>
          </div>
        )}
      </div>

      {/* Bottom Mystery Prompt */}
      <div className="text-center z-10 bg-black/40 backdrop-blur rounded-2xl py-2.5 px-4 border border-white/10">
        <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wide">
          ヒントを聞いて 英語で答えよう！ (What is it?)
        </span>
      </div>
    </div>
  );
};
