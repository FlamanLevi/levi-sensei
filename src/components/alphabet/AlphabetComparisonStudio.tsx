import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { useVocabulary } from '../../context/VocabularyContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { speechService } from '../../services/speechService';
import { resolveCardImage } from '../../utils/cardUtils';
import { VocabularyItem } from '@data/types';
import {
  ArrowLeft,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Sun,
  Moon,
  Shuffle,
  Columns,
  Square,
  BookOpen,
  ArrowLeftRight
} from 'lucide-react';

export type DisplayMode = 'COMPARISON' | 'SINGLE';
export type CaseSelection = 'UPPER' | 'LOWER' | 'BOTH';
export type LetterSlice =
  | 'ALL'
  | 'A_M'
  | 'N_Z'
  | 'CHUNK_AE'
  | 'CHUNK_FJ'
  | 'CHUNK_KO'
  | 'CHUNK_PT'
  | 'CHUNK_UZ';

interface LetterPair {
  char: string;
  charLower: string;
  index: number;
  upperWord?: VocabularyItem;
  lowerWord?: VocabularyItem;
  upperImageSrc: string | null;
  lowerImageSrc: string | null;
}

const SLICE_CONFIG: {
  key: LetterSlice;
  labelEn: string;
  labelJa: string;
  badge: string;
  range: [number, number]; // 0-indexed inclusive
}[] = [
  { key: 'ALL', labelEn: 'All Letters (A - Z)', labelJa: '全文字 (A - Z)', badge: '26', range: [0, 25] },
  { key: 'A_M', labelEn: '📖 a - m (Page 24: First Half)', labelJa: '📖 a - m (24ページ：前半)', badge: '13', range: [0, 12] },
  { key: 'N_Z', labelEn: '📖 n - z (Page 25: Second Half)', labelJa: '📖 n - z (25ページ：後半)', badge: '13', range: [13, 25] },
  { key: 'CHUNK_AE', labelEn: 'a - e (5 letters)', labelJa: 'a - e (5文字)', badge: '5', range: [0, 4] },
  { key: 'CHUNK_FJ', labelEn: 'f - j (5 letters)', labelJa: 'f - j (5文字)', badge: '5', range: [5, 9] },
  { key: 'CHUNK_KO', labelEn: 'k - o (5 letters)', labelJa: 'k - o (5文字)', badge: '5', range: [10, 14] },
  { key: 'CHUNK_PT', labelEn: 'p - t (5 letters)', labelJa: 'p - t (5文字)', badge: '5', range: [15, 19] },
  { key: 'CHUNK_UZ', labelEn: 'u - z (6 letters)', labelJa: 'u - z (6文字)', badge: '6', range: [20, 25] },
];

export const AlphabetComparisonStudio: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const { exitToHub, theme, toggleTheme } = useClassroom();
  const { allWords } = useVocabulary();
  const { playPop, isMuted } = useAudio();
  const { t, language } = useLanguage();

  // Applet configuration states
  const [displayMode, setDisplayMode] = useState<DisplayMode>('COMPARISON');
  const [caseSelection, setCaseSelection] = useState<CaseSelection>('LOWER');
  const [activeSlice, setActiveSlice] = useState<LetterSlice>('ALL');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFilmstrip, setShowFilmstrip] = useState<boolean>(true);
  const [singleFlipCase, setSingleFlipCase] = useState<'UPPER' | 'LOWER'>('LOWER');

  // Build master 26 Letter Pairs
  const allLetterPairs = useMemo<LetterPair[]>(() => {
    const pairs: LetterPair[] = [];
    for (let i = 0; i < 26; i++) {
      const upperChar = String.fromCharCode(65 + i);
      const lowerChar = String.fromCharCode(97 + i);

      const upperWord = allWords.find(w => w.english === upperChar);
      const lowerWord = allWords.find(w => w.english === lowerChar);

      const upperImageSrc = upperWord
        ? resolveCardImage(upperWord, 'picture_only', 'ES_G3')
        : `/media/images/dic_3_card_${lowerChar}_${2068 + i}_1_c.svg`;

      const lowerImageSrc = lowerWord
        ? resolveCardImage(lowerWord, 'picture_only', 'ES_G4')
        : `/media/images/dic_4_card_${lowerChar}_${2551 + i}_1_c.svg`;

      pairs.push({
        char: upperChar,
        charLower: lowerChar,
        index: i + 1,
        upperWord,
        lowerWord,
        upperImageSrc,
        lowerImageSrc
      });
    }
    return pairs;
  }, [allWords]);

  // Filter letter pairs by active slice
  const activePairs = useMemo<LetterPair[]>(() => {
    const config = SLICE_CONFIG.find(c => c.key === activeSlice) || SLICE_CONFIG[0];
    return allLetterPairs.slice(config.range[0], config.range[1] + 1);
  }, [allLetterPairs, activeSlice]);

  // Current active letter pair
  const currentPair = activePairs[currentIndex] || activePairs[0] || allLetterPairs[0];

  // Reset index if slice changes and index is out of bounds
  useEffect(() => {
    if (currentIndex >= activePairs.length) {
      setCurrentIndex(0);
    }
  }, [activePairs, currentIndex]);

  // Handle Fullscreen tracking
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    playPop();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Pronounce letters
  const speakCurrent = useCallback((target?: 'UPPER' | 'LOWER' | 'BOTH') => {
    if (isMuted) return;
    try {
      speechService.stop();
      if (target === 'UPPER') {
        speechService.speak(`Uppercase ${currentPair.char}. /${currentPair.charLower}/.`, {
          rate: 0.82,
          pitch: 1.05
        });
      } else if (target === 'LOWER') {
        speechService.speak(`Lowercase ${currentPair.charLower}. /${currentPair.charLower}/.`, {
          rate: 0.82,
          pitch: 1.05
        });
      } else {
        // Both
        speechService.speak(`Big ${currentPair.char}, small ${currentPair.charLower}. /${currentPair.charLower}/.`, {
          rate: 0.82,
          pitch: 1.05
        });
      }
    } catch {}
  }, [isMuted, currentPair]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    playPop();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : activePairs.length - 1));
  }, [playPop, activePairs.length]);

  const handleNext = useCallback(() => {
    playPop();
    setCurrentIndex(prev => (prev < activePairs.length - 1 ? prev + 1 : 0));
  }, [playPop, activePairs.length]);

  const handleShuffle = useCallback(() => {
    playPop();
    const randomIndex = Math.floor(Math.random() * activePairs.length);
    setCurrentIndex(randomIndex);
  }, [playPop, activePairs.length]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (displayMode === 'COMPARISON') {
          speakCurrent('BOTH');
        } else {
          speakCurrent(caseSelection === 'UPPER' ? 'UPPER' : 'LOWER');
        }
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        playPop();
        setDisplayMode(prev => (prev === 'COMPARISON' ? 'SINGLE' : 'COMPARISON'));
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        playPop();
        setCaseSelection(prev => (prev === 'UPPER' ? 'LOWER' : prev === 'LOWER' ? 'BOTH' : 'UPPER'));
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        playPop();
        toggleTheme();
      } else if (e.key === 'Escape') {
        if (onExit) onExit();
        else exitToHub();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, speakCurrent, displayMode, caseSelection, playPop, onExit, exitToHub, toggleTheme]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none">
      
      {/* =========================================================================
          TOP CONTROL BAR (Sleek, Pinned, Light & Dark Theme Supported)
          ========================================================================= */}
      <header className="h-14 px-3 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 z-20 shadow-xs">
        
        {/* Left: Exit & Applet Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => { playPop(); if (onExit) onExit(); else exitToHub(); }}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            title={t("Exit to Main Menu (Esc)", "メインメニューに戻る (Esc)")}
          >
            <ArrowLeft size={16} />
            <span className="hidden md:inline">{t("Menu", "メニュー")}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
              🔤
            </span>
            <div className="hidden lg:block">
              <h1 className="text-sm font-black tracking-tight leading-none text-slate-900 dark:text-white">
                {t("Alphabet Comparison Studio", "アルファベット比較ラボ")}
              </h1>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-none">
                {t("MEXT Grade 3 & 4 Textbook Flashcards", "小3・小4 検定教科書 フラッシュカード")}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Core Dropdown Menus */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          
          {/* 1. Mode Dropdown / Segmented Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { playPop(); setDisplayMode('COMPARISON'); }}
              className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                displayMode === 'COMPARISON'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={t("Side-by-Side Comparison (Split Screen)", "大文字・小文字 左右並列（比較モード）")}
            >
              <Columns size={13} />
              <span className="hidden sm:inline">{t("Compare", "比較")}</span>
            </button>

            <button
              type="button"
              onClick={() => { playPop(); setDisplayMode('SINGLE'); }}
              className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                displayMode === 'SINGLE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={t("Single Centered Letter Card", "1文字を画面いっぱいに表示（単一モード）")}
            >
              <Square size={13} />
              <span className="hidden sm:inline">{t("Single", "1文字")}</span>
            </button>
          </div>

          {/* 2. Case Selector Dropdown (Active in Single Mode) */}
          {displayMode === 'SINGLE' && (
            <div className="relative">
              <select
                value={caseSelection}
                onChange={e => {
                  playPop();
                  setCaseSelection(e.target.value as CaseSelection);
                }}
                className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 font-black text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-amber-400 cursor-pointer shadow-xs"
                title={t("Letter Case Slicing", "大文字・小文字の表示選択")}
              >
                <option value="LOWER">{t("🔡 Lowercase Only (a-z)", "🔡 小文字のみ (a-z)")}</option>
                <option value="UPPER">{t("🔠 Uppercase Only (A-Z)", "🔠 大文字のみ (A-Z)")}</option>
                <option value="BOTH">{t("🔀 Flip / Both (A ⇄ a)", "🔀 両方 / 切替 (A ⇄ a)")}</option>
              </select>
            </div>
          )}

          {/* 3. Letter Slicing Dropdown */}
          <div className="relative">
            <select
              value={activeSlice}
              onChange={e => {
                playPop();
                setActiveSlice(e.target.value as LetterSlice);
                setCurrentIndex(0);
              }}
              className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-black text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer max-w-[150px] sm:max-w-none truncate shadow-xs"
              title={t("Textbook Slicing Options", "教科書の分割選択（ページ前半・後半・5文字ブロック）")}
            >
              {SLICE_CONFIG.map(cfg => (
                <option key={cfg.key} value={cfg.key}>
                  {language === 'ja' ? cfg.labelJa : cfg.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Stepper & Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Letter Stepper Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={handlePrev}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={t("Previous Letter (Left Arrow)", "前の文字 (←)")}
            >
              <ChevronLeft size={18} />
            </button>

            <span className="px-2 text-xs font-mono font-black text-slate-800 dark:text-white min-w-[50px] text-center">
              {currentIndex + 1} / {activePairs.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={t("Next Letter (Right Arrow / Enter)", "次の文字 (→ / Enter)")}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Quick Pronounce Button */}
          <button
            type="button"
            onClick={() => {
              if (displayMode === 'COMPARISON') speakCurrent('BOTH');
              else speakCurrent(caseSelection === 'UPPER' ? 'UPPER' : 'LOWER');
            }}
            className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title={t("Listen to Pronunciation (Spacebar)", "音声を聞く (Space)")}
          >
            <Volume2 size={18} />
          </button>

          {/* Random Shuffle */}
          <button
            type="button"
            onClick={handleShuffle}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            title={t("Jump to Random Letter", "ランダムに選ぶ")}
          >
            <Shuffle size={16} />
          </button>

          {/* Sun/Moon Theme Toggle (Instant Sync with ClassroomContext) */}
          <button
            type="button"
            onClick={() => { playPop(); toggleTheme(); }}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-none cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            title={theme === 'dark' ? t("Switch to Light Mode (T)", "ライトモードへ切替 (T)") : t("Switch to Dark Mode (T)", "ダークモードへ切替 (T)")}
          >
            {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            title={t("Toggle Fullscreen", "全画面表示")}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN CINEMA STAGE (Maximal Screen Real Estate for Cards, Dual-Theme)
          ========================================================================= */}
      <main className="flex-1 min-h-0 relative flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-slate-200/60 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
        
        {/* MODE 1: COMPARISON MODE (Screen Halved 50 / 50) */}
        {displayMode === 'COMPARISON' && (
          <div className="w-full h-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center justify-center">
            
            {/* Left Half: Uppercase Card */}
            <div
              onClick={() => speakCurrent('UPPER')}
              className="w-full h-full rounded-3xl bg-white dark:bg-slate-900/90 border-3 border-amber-400 dark:border-amber-400/80 hover:border-amber-500 transition-all shadow-xl dark:shadow-2xl flex flex-col items-center justify-between p-4 sm:p-6 cursor-pointer group relative overflow-hidden"
            >
              {/* Top Badge */}
              <div className="w-full flex items-center justify-between z-10">
                <span className="px-3 py-1 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-black border border-amber-500/30 dark:border-amber-500/40">
                  {t("🔠 Uppercase (大文字)", "🔠 大文字")}
                </span>
                <span className="font-mono text-sm font-black text-slate-400 dark:text-slate-500">
                  Grade 3
                </span>
              </div>

              {/* Center Giant Image */}
              <div className="flex-1 w-full flex items-center justify-center min-h-0 py-2">
                {currentPair.upperImageSrc ? (
                  <img
                    src={currentPair.upperImageSrc}
                    alt={currentPair.char}
                    className="max-w-full max-h-[75vh] object-contain filter drop-shadow-lg group-hover:scale-[1.02] transition-transform select-none"
                  />
                ) : (
                  <span className="font-mext text-9xl font-black text-slate-900 dark:text-white">{currentPair.char}</span>
                )}
              </div>

              {/* Bottom Cue */}
              <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 z-10 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-mono font-bold">Letter {currentPair.char}</span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <Volume2 size={14} />
                  <span>{t("Click to listen", "タップで発音")}</span>
                </span>
              </div>
            </div>

            {/* Right Half: Lowercase Card */}
            <div
              onClick={() => speakCurrent('LOWER')}
              className="w-full h-full rounded-3xl bg-white dark:bg-slate-900/90 border-3 border-sky-400 dark:border-sky-400/80 hover:border-sky-500 transition-all shadow-xl dark:shadow-2xl flex flex-col items-center justify-between p-4 sm:p-6 cursor-pointer group relative overflow-hidden"
            >
              {/* Top Badge */}
              <div className="w-full flex items-center justify-between z-10">
                <span className="px-3 py-1 rounded-xl bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs sm:text-sm font-black border border-sky-500/30 dark:border-sky-500/40">
                  {t("🔡 Lowercase (小文字)", "🔡 小文字")}
                </span>
                <span className="font-mono text-sm font-black text-slate-400 dark:text-slate-500">
                  Grade 4
                </span>
              </div>

              {/* Center Giant Image */}
              <div className="flex-1 w-full flex items-center justify-center min-h-0 py-2">
                {currentPair.lowerImageSrc ? (
                  <img
                    src={currentPair.lowerImageSrc}
                    alt={currentPair.charLower}
                    className="max-w-full max-h-[75vh] object-contain filter drop-shadow-lg group-hover:scale-[1.02] transition-transform select-none"
                  />
                ) : (
                  <span className="font-mext text-9xl font-black text-slate-900 dark:text-white">{currentPair.charLower}</span>
                )}
              </div>

              {/* Bottom Cue */}
              <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 z-10 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-mono font-bold">Letter {currentPair.charLower}</span>
                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <Volume2 size={14} />
                  <span>{t("Click to listen", "タップで発音")}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: SINGLE CENTERED CARD MODE */}
        {displayMode === 'SINGLE' && (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            
            {/* Active Card Frame */}
            <div
              onClick={() => {
                const isShowingUpper =
                  caseSelection === 'UPPER' ||
                  (caseSelection === 'BOTH' && singleFlipCase === 'UPPER');
                speakCurrent(isShowingUpper ? 'UPPER' : 'LOWER');
              }}
              className="w-full max-w-4xl h-full rounded-3xl bg-white dark:bg-slate-900/90 border-3 border-indigo-400 dark:border-indigo-500/80 hover:border-indigo-500 transition-all shadow-xl dark:shadow-2xl flex flex-col items-center justify-between p-4 sm:p-8 cursor-pointer group relative overflow-hidden"
            >
              {/* Top Card Header */}
              <div className="w-full flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-sm font-black border border-indigo-500/30 dark:border-indigo-500/40">
                    {caseSelection === 'UPPER' || (caseSelection === 'BOTH' && singleFlipCase === 'UPPER')
                      ? t("🔠 Uppercase (大文字)", "🔠 大文字")
                      : t("🔡 Lowercase (小文字)", "🔡 小文字")}
                  </span>
                  {caseSelection === 'BOTH' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPop();
                        setSingleFlipCase(prev => (prev === 'UPPER' ? 'LOWER' : 'UPPER'));
                      }}
                      className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black border border-amber-500/30 dark:border-amber-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title={t("Flip between Uppercase and Lowercase", "大文字と小文字を切り替える")}
                    >
                      <ArrowLeftRight size={13} />
                      <span>{t("Flip Case", "大 ⇄ 小")}</span>
                    </button>
                  )}
                </div>

                <span className="font-mono text-sm font-black text-slate-400 dark:text-slate-500">
                  {currentPair.char} / {currentPair.charLower}
                </span>
              </div>

              {/* Giant Centered Image */}
              <div className="flex-1 w-full flex items-center justify-center min-h-0 py-2">
                {caseSelection === 'UPPER' || (caseSelection === 'BOTH' && singleFlipCase === 'UPPER') ? (
                  currentPair.upperImageSrc ? (
                    <img
                      src={currentPair.upperImageSrc}
                      alt={currentPair.char}
                      className="max-w-full max-h-[78vh] object-contain filter drop-shadow-xl group-hover:scale-[1.01] transition-transform select-none"
                    />
                  ) : (
                    <span className="font-mext text-9xl font-black text-slate-900 dark:text-white">{currentPair.char}</span>
                  )
                ) : (
                  currentPair.lowerImageSrc ? (
                    <img
                      src={currentPair.lowerImageSrc}
                      alt={currentPair.charLower}
                      className="max-w-full max-h-[78vh] object-contain filter drop-shadow-xl group-hover:scale-[1.01] transition-transform select-none"
                    />
                  ) : (
                    <span className="font-mext text-9xl font-black text-slate-900 dark:text-white">{currentPair.charLower}</span>
                  )
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 z-10 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-mono font-bold">
                  Letter {caseSelection === 'UPPER' || (caseSelection === 'BOTH' && singleFlipCase === 'UPPER') ? currentPair.char : currentPair.charLower}
                </span>
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <Volume2 size={14} />
                  <span>{t("Click to listen", "タップで発音")}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          BOTTOM FILMSTRIP / SCRUBBER (Quick Jump Across Active Slice, Dual-Theme)
          ========================================================================= */}
      <footer className="h-12 px-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 z-20 transition-colors shadow-xs">
        
        {/* Toggle strip visibility */}
        <button
          type="button"
          onClick={() => setShowFilmstrip(prev => !prev)}
          className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>{showFilmstrip ? '▼' : '▲'}</span>
          <span className="hidden sm:inline">{t("Letter Strip", "文字一覧")}</span>
        </button>

        {/* Filmstrip Buttons */}
        {showFilmstrip && (
          <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-1">
            {activePairs.map((pair, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={pair.char}
                  type="button"
                  onClick={() => { playPop(); setCurrentIndex(idx); }}
                  className={`h-8 px-2.5 rounded-xl font-mext font-black text-xs transition-all flex items-center justify-center cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-amber-500 text-white border-amber-400 shadow-md scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{pair.char}</span>
                  <span className="text-[10px] opacity-75 ml-0.5">{pair.charLower}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Keyboard hint */}
        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">→</kbd> Move</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">Space</kbd> Voice</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">C</kbd> Mode</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">T</kbd> Theme</span>
        </div>
      </footer>
    </div>
  );
};
