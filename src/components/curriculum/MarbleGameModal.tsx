import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useClassroom } from '../../context/ClassroomContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAudio } from '../../context/AudioContext';
import { speechService } from '../../services/speechService';
import { X, Volume2, RotateCcw, Sparkles, Check, Play, BookOpen } from 'lucide-react';

interface MarbleGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLetters?: string[];
}

const DEFAULT_LETTERS = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];

export const MarbleGameModal: React.FC<MarbleGameModalProps> = ({
  isOpen,
  onClose,
  initialLetters = DEFAULT_LETTERS
}) => {
  
  const { t, language } = useLanguage();
  const { playPop, isMuted } = useAudio();

  const [pool, setPool] = useState<string[]>([]);
  const [calledLetters, setCalledLetters] = useState<string[]>([]);
  const [currentLetter, setCurrentLetter] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize and shuffle
  const resetGame = useCallback(() => {
    playPop();
    const shuffled = [...initialLetters].sort(() => Math.random() - 0.5);
    setPool(shuffled);
    setCalledLetters([]);
    setCurrentLetter(null);
  }, [initialLetters, playPop]);

  useEffect(() => {
    if (isOpen) {
      resetGame();
    }
  }, [isOpen, resetGame]);

  // Pronounce letter with Web Speech API
  const speakCurrentLetter = useCallback((char: string) => {
    if (isMuted) return;
    try {
      speechService.stop();
      // Enunciate: "Letter B. /b/."
      speechService.speak(`Letter ${char.toUpperCase()}. ${char}.`, {
        rate: 0.82,
        pitch: 1.05
      });
    } catch {
      // Defensive fallback
    }
  }, [isMuted]);

  // Draw next letter
  const drawNextLetter = useCallback(() => {
    if (pool.length === 0 || isDrawing) return;
    playPop();
    setIsDrawing(true);

    const nextChar = pool[0];
    const remaining = pool.slice(1);

    setPool(remaining);
    setCurrentLetter(nextChar);
    setCalledLetters(prev => [...prev, nextChar]);

    // Speak letter
    setTimeout(() => {
      speakCurrentLetter(nextChar);
      setIsDrawing(false);
    }, 180);
  }, [pool, isDrawing, playPop, speakCurrentLetter]);

  // Global Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        drawNextLetter();
      } else if (e.key === 'r' || e.key === 'R') {
        resetGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, drawNextLetter, resetGame]);

  if (!isOpen) return null;

  const page24Letters = initialLetters.slice(0, 13); // a-m
  const page25Letters = initialLetters.slice(13);     // n-z
  const progressPercent = Math.round((calledLetters.length / initialLetters.length) * 100);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-[98vw] max-w-[1500px] h-[95vh] max-h-[920px] rounded-3xl border-4 sm:border-6 border-amber-400 dark:border-amber-500 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="min-h-[56px] px-4 sm:px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0">
              🎲
            </span>
            <div className="min-w-0 truncate">
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                {t("Let's Play 2: Marble Game (おはじきゲーム)", "Let's Play 2: おはじきゲーム（文字コール）")}
              </h2>
              <p className="text-[11px] text-amber-100 font-bold truncate">
                {t("Textbook Pages 24 & 25 • Call letters randomly for students to collect markers", "教科書 24・25ページ対応：先生が文字をランダムに読み上げ、児童がおはじきを取るゲーム")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-xs font-black">
              <span>{calledLetters.length} / {initialLetters.length}</span>
              <span className="text-[10px] opacity-80">({progressPercent}%)</span>
            </div>

            <button
              type="button"
              onClick={resetGame}
              className="h-9 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
              title={t("Shuffle & Start Over (Press R)", "最初からやり直す (Rキー)")}
            >
              <RotateCcw size={14} />
              <span className="hidden md:inline">{t("Restart", "リセット")}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
              title={t("Close (Esc)", "閉じる (Esc)")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Stage Grid: Left Center Card Stage (65%), Right History Board (35%) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950">
          
          {/* Cinema Call Stage */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden select-none">
            {currentLetter ? (
              <div className="flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
                {/* Big Card Frame */}
                <div className="relative w-64 h-72 sm:w-80 sm:h-96 md:w-96 md:h-[420px] rounded-3xl bg-white dark:bg-slate-900 border-4 sm:border-6 border-amber-400 dark:border-amber-500 shadow-2xl flex flex-col items-center justify-center p-6 overflow-hidden">
                  
                  {/* Authentic textbook baseline guide */}
                  <div className="absolute inset-x-8 bottom-[28%] h-1 sm:h-1.5 bg-[#42BAE2] rounded-full pointer-events-none opacity-80" />
                  
                  {/* Giant Letter Glyph */}
                  <span className="font-mext text-8xl sm:text-9xl md:text-[160px] font-black text-slate-900 dark:text-white leading-none z-10 transform -translate-y-2">
                    {currentLetter}
                  </span>

                  {/* Uppercase companion hint */}
                  <span className="absolute top-4 right-5 text-xs sm:text-sm font-black font-mono px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {currentLetter.toUpperCase()}
                  </span>

                  {/* Audio Replay Button */}
                  <button
                    type="button"
                    onClick={() => speakCurrentLetter(currentLetter)}
                    className="absolute bottom-4 right-4 w-11 h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer z-10"
                    title={t("Replay pronunciation", "発音をもう一度聞く")}
                  >
                    <Volume2 size={20} />
                  </button>

                  {/* Call counter badge */}
                  <span className="absolute bottom-4 left-5 text-xs font-black text-slate-400 dark:text-slate-500">
                    #{calledLetters.length} / 26
                  </span>
                </div>

                <p className="mt-4 text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400">
                  {t("Letter", "文字")}: <span className="text-amber-600 dark:text-amber-400 font-mono text-base font-black uppercase">{currentLetter}</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 max-w-md">
                <div className="w-24 h-24 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-5xl mb-4 border-2 border-amber-300 dark:border-amber-700 shadow-inner animate-pulse">
                  🎲
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                  {t("Ready to Play Marble Game?", "おはじきゲームの準備完了！")}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                  {t("Have students place marbles/counters on the letters on pages 24-25 of their textbook, then tap DRAW NEXT LETTER to start!", "児童に教科書24・25ページの文字の上におはじきを置かせ、下の「次の文字を引く」を押してスタートしましょう！")}
                </p>
              </div>
            )}

            {/* Bottom Call Action Button */}
            <div className="mt-6 flex items-center gap-3">
              {pool.length > 0 ? (
                <button
                  type="button"
                  onClick={drawNextLetter}
                  disabled={isDrawing}
                  className="h-14 sm:h-16 px-8 sm:px-12 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-base sm:text-lg font-black shadow-xl hover:shadow-2xl transition-all transform active:scale-95 flex items-center gap-3 cursor-pointer border-2 border-amber-300"
                >
                  <Sparkles size={22} className="animate-spin-slow" />
                  <span>{currentLetter ? t("DRAW NEXT LETTER", "次の文字を引く") : t("START DRAWING", "ゲームスタート！")}</span>
                  <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-black/20 text-xs font-mono font-normal">Space</kbd>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="px-5 py-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-sm border border-emerald-300 dark:border-emerald-700">
                    🎉 {t("All 26 Letters Called! Who collected all markers?", "26文字すべて引きました！全員おはじきを取れたかな？")}
                  </span>
                  <button
                    type="button"
                    onClick={resetGame}
                    className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md cursor-pointer"
                  >
                    {t("Play Again", "もう一度あそぶ")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Bifurcated History Board (Pages 24 & 25) */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-amber-500" />
                  <span>{t("Called Letters Progress", "出た文字の一覧（教科書対応）")}</span>
                </h4>
                <span className="text-[11px] font-bold text-slate-400">
                  {calledLetters.length} / 26
                </span>
              </div>

              {/* Page 24 Box: a through m */}
              <div className="mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    {t("Page 24: First Half (a - m)", "教科書 24ページ（a 〜 m）")}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {page24Letters.filter(c => calledLetters.includes(c)).length} / 13
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {page24Letters.map(letter => {
                    const isCalled = calledLetters.includes(letter);
                    const isCurrent = currentLetter === letter;
                    return (
                      <div
                        key={letter}
                        className={`h-9 rounded-xl flex items-center justify-center font-mext font-black text-sm transition-all border ${
                          isCurrent
                            ? 'bg-amber-500 text-white border-amber-400 shadow-md scale-105'
                            : isCalled
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                              : 'bg-white dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Page 25 Box: n through z */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    {t("Page 25: Second Half (n - z)", "教科書 25ページ（n 〜 z）")}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {page25Letters.filter(c => calledLetters.includes(c)).length} / 13
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {page25Letters.map(letter => {
                    const isCalled = calledLetters.includes(letter);
                    const isCurrent = currentLetter === letter;
                    return (
                      <div
                        key={letter}
                        className={`h-9 rounded-xl flex items-center justify-center font-mext font-black text-sm transition-all border ${
                          isCurrent
                            ? 'bg-amber-500 text-white border-amber-400 shadow-md scale-105'
                            : isCalled
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                              : 'bg-white dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Instruction Tip */}
            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 font-medium">
              💡 {t("Tip: If students play in pairs, have them compete to see who can pick up 5 marbles first!", "ヒント：ペアで行う場合は「先に5個取れた方が勝ち」などのルールにするとテンポよく盛り上がります。")}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
