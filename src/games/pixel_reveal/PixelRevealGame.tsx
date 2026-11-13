import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import {
  VisualMode,
  GridSize,
  TileLabelMode,
  TimerOption,
  TeamScores
} from './types';
import { resolveCardImage, shuffleArray, getIsCenterLocked } from './utils';
import { PixelStage } from './PixelStage';
import {
  Sparkles,
  Volume2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  Eye,
  Award,
  Layers,
  Play,
  Pause
} from 'lucide-react';

interface PixelRevealGameProps {
  onExit?: () => void;
}

export const PixelRevealGame: React.FC<PixelRevealGameProps> = ({ onExit }) => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade, activeUnit } = useClassroom();
  const { playWordAudio } = useAudio();

  // --- Game Settings ---
  const [visualMode, setVisualMode] = useState<VisualMode>('MOSAIC');
  const [gridSize, setGridSize] = useState<GridSize>('3x3');
  const [labelMode, setLabelMode] = useState<TileLabelMode>('kanji');
  const [isLockCenter, setIsLockCenter] = useState<boolean>(true);
  const [timerOption, setTimerOption] = useState<TimerOption>(0); // 0 = manual

  // --- Round State ---
  const [cardQueue, setCardQueue] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [mosaicStage, setMosaicStage] = useState<number>(0); // 0, 1, 2, 3
  const [zoomStage, setZoomStage] = useState<number>(0); // 0, 1, 2, 3
  const [silhouetteStage, setSilhouetteStage] = useState<number>(0); // 0, 1, 2
  const [peeledTiles, setPeeledTiles] = useState<number[]>([]);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [teamScores, setTeamScores] = useState<TeamScores>({ red: 0, blue: 0, yellow: 0, green: 0 });

  // Auto-sharpening timer
  const [timerRemaining, setTimerRemaining] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playCardAudio = useCallback((card: VocabularyItem) => {
    playWordAudio(card.sound_file || card.primary_audio, card.english);
  }, [playWordAudio]);

  // 1. Initialize Queue
  const setupQueue = useCallback(() => {
    const primaryPool = scopedWords.length > 0 ? scopedWords : (filteredWords.length > 0 ? filteredWords : (gradeWords.length > 0 ? gradeWords : allWords));
    const fallbackPool = gradeWords.length > 0 ? gradeWords : allWords;
    const pool = primaryPool.length > 0 ? primaryPool : fallbackPool;
    setCardQueue(shuffleArray(pool));
    setCurrentIndex(0);
    setRoundNumber(1);
  }, [scopedWords, filteredWords, gradeWords, allWords]);

  useEffect(() => {
    setupQueue();
  }, [setupQueue]);

  // 2. Reset Individual Round
  const resetRound = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setMosaicStage(0);
    setZoomStage(0);
    setSilhouetteStage(0);
    setPeeledTiles([]);
    setIsRevealed(false);

    if (timerOption > 0) {
      setTimerRemaining(timerOption);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  }, [timerOption]);

  useEffect(() => {
    resetRound();
  }, [currentIndex, resetRound]);

  const currentCard = cardQueue[currentIndex] || null;

  // 3. Trigger Reveal
  const triggerReveal = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsTimerRunning(false);
    setIsRevealed(true);
    setMosaicStage(3);
    setZoomStage(3);
    setSilhouetteStage(2);

    const totalTiles = gridSize === '4x4' ? 16 : gridSize === '3x3' ? 9 : 4;
    setPeeledTiles(Array.from({ length: totalTiles }, (_, i) => i + 1));

    soundEffects.playCorrect();
    soundEffects.playFanfare();
    confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });

    if (currentCard) {
      setTimeout(() => {
        playCardAudio(currentCard);
      }, 250);
    }
  }, [currentCard, gridSize, playCardAudio]);

  // 4. Peel Tile Action
  const peelTile = useCallback((tileNum: number) => {
    if (peeledTiles.includes(tileNum) || isRevealed) return;

    const locked = getIsCenterLocked(tileNum, gridSize, peeledTiles, isLockCenter);
    if (locked) {
      soundEffects.playIncorrect();
      return;
    }

    soundEffects.playCardFlip();
    const newPeeled = [...peeledTiles, tileNum];
    setPeeledTiles(newPeeled);

    const totalTiles = gridSize === '4x4' ? 16 : gridSize === '3x3' ? 9 : 4;
    if (newPeeled.length >= totalTiles) {
      triggerReveal();
    }
  }, [peeledTiles, isRevealed, gridSize, isLockCenter, triggerReveal]);

  // 5. Advance Stage / Next Round
  const advancePhase = useCallback(() => {
    if (isRevealed) {
      // Advance to next card
      soundEffects.playChime();
      setRoundNumber(r => r + 1);
      setCurrentIndex(prev => (prev + 1) % cardQueue.length);
      return;
    }

    // Step current mystery mode
    if (visualMode === 'MOSAIC') {
      if (mosaicStage < 2) {
        soundEffects.playReveal();
        setMosaicStage(s => s + 1);
      } else {
        triggerReveal();
      }
    } else if (visualMode === 'ZOOM') {
      if (zoomStage < 2) {
        soundEffects.playReveal();
        setZoomStage(s => s + 1);
      } else {
        triggerReveal();
      }
    } else if (visualMode === 'SILHOUETTE') {
      if (silhouetteStage < 1) {
        soundEffects.playReveal();
        setSilhouetteStage(s => s + 1);
      } else {
        triggerReveal();
      }
    } else if (visualMode === 'TILES') {
      // Pick a random unpeeled outer tile to peel
      const totalTiles = gridSize === '4x4' ? 16 : gridSize === '3x3' ? 9 : 4;
      const unpeeled = Array.from({ length: totalTiles }, (_, i) => i + 1).filter(
        t => !peeledTiles.includes(t) && !getIsCenterLocked(t, gridSize, peeledTiles, isLockCenter)
      );
      if (unpeeled.length > 0) {
        const randomTile = unpeeled[Math.floor(Math.random() * unpeeled.length)];
        peelTile(randomTile);
      } else {
        triggerReveal();
      }
    }
  }, [
    isRevealed,
    visualMode,
    mosaicStage,
    zoomStage,
    silhouetteStage,
    gridSize,
    peeledTiles,
    isLockCenter,
    cardQueue.length,
    peelTile,
    triggerReveal
  ]);

  // 6. Auto-Timer Effect
  useEffect(() => {
    if (timerOption === 0 || !isTimerRunning || isRevealed) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          triggerReveal();
          return 0;
        }

        if (prev <= 5) {
          soundEffects.playUrgencyTick();
        } else {
          soundEffects.playTick();
        }

        // Auto-sharpen blur at threshold points
        if (visualMode === 'MOSAIC') {
          if (timerOption === 15) {
            if (prev === 11) setMosaicStage(1);
            if (prev === 6) setMosaicStage(2);
          } else if (timerOption === 10) {
            if (prev === 7) setMosaicStage(1);
            if (prev === 4) setMosaicStage(2);
          }
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerOption, isTimerRunning, isRevealed, visualMode, triggerReveal]);

  // 7. Team Score Adjustment
  const adjustTeamScore = useCallback((team: keyof TeamScores, delta: number) => {
    setTeamScores(prev => ({
      ...prev,
      [team]: Math.max(0, prev[team] + delta)
    }));
    if (delta > 0) {
      soundEffects.playCorrect();
    }
  }, []);

  // 8. Keyboard & Presentation Clicker Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      // Spacebar / Enter / PageDown / ArrowRight / ArrowDown: Advance
      if (
        ['Space', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.code) ||
        [' ', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)
      ) {
        e.preventDefault();
        advancePhase();
        return;
      }

      // Replay Audio: 'KeyR', 'PageUp', 'ArrowLeft', 'ArrowUp'
      if (
        ['KeyR', 'PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.code) ||
        ['r', 'R', 'PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)
      ) {
        e.preventDefault();
        if (currentCard) {
          playCardAudio(currentCard);
        }
        return;
      }

      // Keys 1-4: Award points (+100) or Shift+1-4 (-100)
      if (visualMode !== 'TILES') {
        if (['Digit1', 'Numpad1'].includes(e.code) || e.key === '1' || e.key === '!') {
          e.preventDefault();
          adjustTeamScore('red', e.shiftKey || e.key === '!' ? -100 : 100);
        } else if (['Digit2', 'Numpad2'].includes(e.code) || e.key === '2' || e.key === '@') {
          e.preventDefault();
          adjustTeamScore('blue', e.shiftKey || e.key === '@' ? -100 : 100);
        } else if (['Digit3', 'Numpad3'].includes(e.code) || e.key === '3' || e.key === '#') {
          e.preventDefault();
          adjustTeamScore('yellow', e.shiftKey || e.key === '#' ? -100 : 100);
        } else if (['Digit4', 'Numpad4'].includes(e.code) || e.key === '4' || e.key === '$') {
          e.preventDefault();
          adjustTeamScore('green', e.shiftKey || e.key === '$' ? -100 : 100);
        }
      }

      // In TILES mode: Direct peel via Digit keys 1-9, 0
      if (visualMode === 'TILES' && !isRevealed) {
        let tileNum = -1;
        if (e.code.startsWith('Digit')) {
          const digit = parseInt(e.code.replace('Digit', ''), 10);
          tileNum = digit === 0 ? 10 : digit;
        } else if (e.code.startsWith('Numpad')) {
          const digit = parseInt(e.code.replace('Numpad', ''), 10);
          tileNum = digit === 0 ? 10 : digit;
        } else if (e.code === 'Minus') {
          tileNum = 11;
        } else if (e.code === 'Equal') {
          tileNum = 12;
        } else if (e.key >= '1' && e.key <= '9') {
          tileNum = parseInt(e.key, 10);
        } else if (e.key === '0') {
          tileNum = 10;
        }

        if (tileNum >= 1 && tileNum <= 16) {
          e.preventDefault();
          peelTile(tileNum);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advancePhase, currentCard, visualMode, isRevealed, peelTile, adjustTeamScore, playCardAudio]);

  if (!currentCard) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-white text-center">
        <p className="text-xl font-bold">カードデータを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] mx-auto flex-1 min-h-0 flex flex-col justify-between space-y-2 sm:space-y-3 p-1 sm:p-2 md:p-3 select-none">
      {/* ====================================================================
          1. TOP CONTROLS & SETTINGS TOOLBAR
         ==================================================================== */}
      <div className="flex flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap items-center justify-between bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-3xl shadow border-2 border-amber-200 dark:border-slate-700 gap-2 sm:gap-3 shrink-0">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-1 transition shrink-0 cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>もどる</span>
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-black text-amber-900 dark:text-amber-300 tracking-wide flex items-center gap-2 whitespace-nowrap">
              <span>✨ ピクセル・リビール</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0">
                Pixel Reveal
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 shrink-0">
                Round {roundNumber}
              </span>
            </h2>
          </div>
        </div>

        {/* Center: Mystery Modes & Settings */}
        <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Visual Mode Selector */}
          <div className="flex flex-nowrap shrink-0 bg-amber-50 dark:bg-slate-900 p-1 rounded-2xl border border-amber-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => { setVisualMode('MOSAIC'); resetRound(); }}
              className={`px-3 py-1 rounded-xl font-black transition shrink-0 ${
                visualMode === 'MOSAIC' ? 'bg-amber-500 text-white shadow' : 'text-amber-900 dark:text-amber-300'
              }`}
            >
              🌫️ モザイク
            </button>
            <button
              onClick={() => { setVisualMode('TILES'); resetRound(); }}
              className={`px-3 py-1 rounded-xl font-black transition shrink-0 ${
                visualMode === 'TILES' ? 'bg-amber-500 text-white shadow' : 'text-amber-900 dark:text-amber-300'
              }`}
            >
              🧩 パネルめくり
            </button>
            <button
              onClick={() => { setVisualMode('ZOOM'); resetRound(); }}
              className={`px-3 py-1 rounded-xl font-black transition shrink-0 ${
                visualMode === 'ZOOM' ? 'bg-amber-500 text-white shadow' : 'text-amber-900 dark:text-amber-300'
              }`}
            >
              🔍 ズーム
            </button>
            <button
              onClick={() => { setVisualMode('SILHOUETTE'); resetRound(); }}
              className={`px-3 py-1 rounded-xl font-black transition shrink-0 ${
                visualMode === 'SILHOUETTE' ? 'bg-amber-500 text-white shadow' : 'text-amber-900 dark:text-amber-300'
              }`}
            >
              👤 シルエット
            </button>
          </div>

          {/* Tiles Sub-Settings */}
          {visualMode === 'TILES' && (
            <>
              {/* Grid Size */}
              <div className="flex flex-nowrap shrink-0 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl text-xs border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => { setGridSize('2x2'); resetRound(); }}
                  className={`px-2 py-1 rounded-xl font-black transition shrink-0 ${
                    gridSize === '2x2' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  2×2 (4<ruby>枚<rt>まい</rt></ruby>)
                </button>
                <button
                  onClick={() => { setGridSize('3x3'); resetRound(); }}
                  className={`px-2 py-1 rounded-xl font-black transition shrink-0 ${
                    gridSize === '3x3' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  3×3 (9<ruby>枚<rt>まい</rt></ruby>)
                </button>
                <button
                  onClick={() => { setGridSize('4x4'); resetRound(); }}
                  className={`px-2 py-1 rounded-xl font-black transition shrink-0 ${
                    gridSize === '4x4' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  4×4 (16<ruby>枚<rt>まい</rt></ruby>)
                </button>
              </div>

              {/* Center Lock Toggle */}
              {gridSize !== '2x2' && (
                <button
                  onClick={() => setIsLockCenter(l => !l)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition shadow-xs shrink-0 ${
                    isLockCenter
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title="Lock center tiles until outer tiles are peeled"
                >
                  <span>{isLockCenter ? <>🔒 <ruby>真<rt>ま</rt></ruby>ん<ruby>中<rt>なか</rt></ruby>ロック: ON</> : <>🔓 <ruby>真<rt>ま</rt></ruby>ん<ruby>中<rt>なか</rt></ruby>ロック: OFF</>}</span>
                </button>
              )}
            </>
          )}

          {/* Auto-Sharpen Timer Selector (in Mosaic mode) */}
          {visualMode === 'MOSAIC' && (
            <div className="flex flex-nowrap shrink-0 items-center gap-1 bg-amber-50 dark:bg-slate-900 p-1 rounded-2xl border border-amber-200 dark:border-slate-700 text-xs">
              <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 px-1">
                ⏱️ タイマー:
              </span>
              {[0, 10, 15, 20].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setTimerOption(sec as TimerOption);
                    resetRound();
                  }}
                  className={`px-2 py-1 rounded-xl font-black transition shrink-0 ${
                    timerOption === sec ? 'bg-amber-500 text-white shadow' : 'text-amber-900 dark:text-amber-300'
                  }`}
                >
                  {sec === 0 ? '手動' : `${sec}s`}
                </button>
              ))}
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={resetRound}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition shrink-0"
            title="Reset round"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. MAIN PIXEL STAGE
         ==================================================================== */}
      <PixelStage
        card={currentCard}
        grade={activeGrade}
        visualMode={visualMode}
        mosaicStage={mosaicStage}
        zoomStage={zoomStage}
        silhouetteStage={silhouetteStage}
        gridSize={gridSize}
        labelMode={labelMode}
        peeledTiles={peeledTiles}
        isCenterLocked={(t) => getIsCenterLocked(t, gridSize, peeledTiles, isLockCenter)}
        isRevealed={isRevealed}
        onPeelTile={peelTile}
        onPlayAudio={() => playCardAudio(currentCard)}
      />

      {/* ====================================================================
          3. BOTTOM ACTIONS & TEAM SCOREBOARD
         ==================================================================== */}
      <div className="w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur p-2.5 sm:p-3 rounded-2xl border-2 border-amber-200 dark:border-slate-700 shadow flex flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap items-center justify-between gap-2 sm:gap-3 shrink-0">
        {/* Left: Mode Action Buttons */}
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {visualMode === 'MOSAIC' && !isRevealed && (
            <button
              onClick={advancePhase}
              className="px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow transition shrink-0"
            >
              🌫️ ピントを合わせる ({mosaicStage + 1}/3) [Space]
            </button>
          )}

          {visualMode === 'ZOOM' && !isRevealed && (
            <button
              onClick={advancePhase}
              className="px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow transition shrink-0"
            >
              🔍 ズームアウト ({zoomStage + 1}/3) [Space]
            </button>
          )}

          {visualMode === 'SILHOUETTE' && !isRevealed && (
            <button
              onClick={advancePhase}
              className="px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow transition shrink-0"
            >
              🎨 色のヒント ({silhouetteStage + 1}/2) [Space]
            </button>
          )}

          {visualMode === 'TILES' && !isRevealed && (
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-2 shrink-0">
              番号キー (1〜9) またはパネルをタップ！
            </span>
          )}

          {/* Reveal button */}
          {!isRevealed ? (
            <button
              onClick={triggerReveal}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg transition shrink-0"
            >
              👁️ 正解をオープン！
            </button>
          ) : (
            <button
              onClick={advancePhase}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-1.5 transition shrink-0"
            >
              <span>つぎの問題 → (Space)</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Right: Team Scores */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
          <button
            onClick={() => adjustTeamScore('red', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-600 hover:scale-105 active:scale-95 transition shrink-0"
          >
            <span>🔴 赤:</span>
            <span className="font-black text-red-700 dark:text-red-400 text-sm sm:text-base">{teamScores.red}</span>
          </button>
          <button
            onClick={() => adjustTeamScore('blue', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-600 hover:scale-105 active:scale-95 transition shrink-0"
          >
            <span>🔵 青:</span>
            <span className="font-black text-blue-700 dark:text-blue-400 text-sm sm:text-base">{teamScores.blue}</span>
          </button>
          <button
            onClick={() => adjustTeamScore('yellow', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600 hover:scale-105 active:scale-95 transition shrink-0"
          >
            <span>🟡 黄:</span>
            <span className="font-black text-amber-700 dark:text-amber-400 text-sm sm:text-base">{teamScores.yellow}</span>
          </button>
          <button
            onClick={() => adjustTeamScore('green', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600 hover:scale-105 active:scale-95 transition shrink-0"
          >
            <span>🟢 緑:</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">{teamScores.green}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
