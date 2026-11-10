import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import {
  HintStage,
  GuessingMode,
  VisualMode,
  FormattedClue,
  HintChoiceOption,
  TeamScores
} from './types';
import {
  formatThreeClues,
  swapClueForStage,
  loadThreeHintsBank,
  generateFourChoices,
  shuffleArray
} from './utils';
import { MysteryCardVisual } from './MysteryCardVisual';
import { ThreeHintsClues } from './ThreeHintsClues';
import { ChoiceTray } from './ChoiceTray';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Award
} from 'lucide-react';

interface ThreeHintsGameProps {
  onExit?: () => void;
}

export const ThreeHintsGame: React.FC<ThreeHintsGameProps> = ({ onExit }) => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade, activeUnit } = useClassroom();
  const { playWordAudio, speakText } = useAudio();

  // --- Game Settings ---
  const [guessingMode, setGuessingMode] = useState<GuessingMode>('OPEN_GUESS');
  const [visualMode, setVisualMode] = useState<VisualMode>('SILHOUETTE');
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [autoReadClue, setAutoReadClue] = useState<boolean>(true);

  // --- Game State ---
  const [bankReady, setBankReady] = useState<boolean>(false);
  const [wordPool, setWordPool] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [stage, setStage] = useState<HintStage>(1);
  const [clues, setClues] = useState<FormattedClue[]>([]);
  const [fourChoices, setFourChoices] = useState<HintChoiceOption[]>([]);
  const [wrongKeys, setWrongKeys] = useState<string[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScores>({ red: 0, blue: 0, yellow: 0, green: 0 });
  const [roundNumber, setRoundNumber] = useState<number>(1);

  const autoReadRef = useRef(autoReadClue);
  useEffect(() => {
    autoReadRef.current = autoReadClue;
  }, [autoReadClue]);

  // Lazy-load the external Three-Hints bank on mount
  useEffect(() => {
    let mounted = true;
    loadThreeHintsBank().finally(() => {
      if (mounted) setBankReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Read clue with speech synthesis via AudioContext (respects global volume & mute)
  const readClueAloud = useCallback((clueOrText: FormattedClue | string) => {
    const text = typeof clueOrText === 'string' ? clueOrText : (clueOrText.speakText || clueOrText.enText);
    speakText(text);
  }, [speakText]);

  // Initialize pool of words
  useEffect(() => {
    const primaryPool = scopedWords.length > 0 ? scopedWords : (filteredWords.length > 0 ? filteredWords : (gradeWords.length > 0 ? gradeWords : allWords));
    const fallbackPool = gradeWords.length > 0 ? gradeWords : allWords;
    const pool = primaryPool.length >= 4 ? primaryPool : [...primaryPool, ...fallbackPool];
    setWordPool(shuffleArray(pool));
    setCurrentIndex(0);
    setRoundNumber(1);
  }, [scopedWords, filteredWords, gradeWords, allWords, activeGrade, activeUnit]);

  // Load round for current word index
  const loadWordRound = useCallback((idx: number, pool: VocabularyItem[]) => {
    if (pool.length === 0) return;
    const word = pool[idx % pool.length];
    const generatedClues = formatThreeClues(word);
    const choices = generateFourChoices(word, pool);

    setClues(generatedClues);
    setFourChoices(choices);
    setWrongKeys([]);
    setStage(1);

    // Auto-read clue 1 if enabled
    if (autoReadRef.current && generatedClues[0]) {
      setTimeout(() => {
        readClueAloud(generatedClues[0]);
      }, 300);
    }
  }, [readClueAloud]);

  // Trigger round setup whenever pool, currentIndex, or bankReady changes
  useEffect(() => {
    if (wordPool.length > 0) {
      loadWordRound(currentIndex, wordPool);
    }
  }, [currentIndex, wordPool, bankReady, loadWordRound]);

  const currentWord = wordPool[currentIndex] || null;

  // Cycle to an alternate hint within stage 1, 2, or 3
  const handleSwapClue = useCallback((targetStage: 1 | 2 | 3) => {
    if (!currentWord) return;
    soundEffects.playTick();
    setClues(prev => {
      const updated = swapClueForStage(currentWord, prev, targetStage);
      const swappedClue = updated[targetStage - 1];
      if (autoReadRef.current && swappedClue) {
        readClueAloud(swappedClue);
      }
      return updated;
    });
  }, [currentWord, readClueAloud]);

  // Reveal the answer
  const triggerReveal = useCallback(() => {
    if (!currentWord) return;
    setStage('REVEALED');
    soundEffects.playCorrect();
    soundEffects.playFanfare();
    confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });

    setTimeout(() => {
      playWordAudio(currentWord.sound_file || (currentWord as any).primary_audio, currentWord.english);
    }, 250);
  }, [currentWord, playWordAudio]);

  // Advance Phase: Hint 1 -> Hint 2 -> Hint 3 -> Reveal -> Next Round
  const advancePhase = useCallback(() => {
    if (stage === 1) {
      setStage(2);
      soundEffects.playReveal();
      if (autoReadRef.current && clues[1]) {
        readClueAloud(clues[1]);
      }
    } else if (stage === 2) {
      setStage(3);
      soundEffects.playReveal();
      if (autoReadRef.current && clues[2]) {
        readClueAloud(clues[2]);
      }
    } else if (stage === 3) {
      triggerReveal();
    } else if (stage === 'REVEALED') {
      // Next Round
      soundEffects.playChime();
      setRoundNumber(r => r + 1);
      setCurrentIndex(prev => (prev + 1) % wordPool.length);
    }
  }, [stage, clues, wordPool.length, triggerReveal, readClueAloud]);

  // Choice selected in 4-Choice mode
  const handleSelectChoice = useCallback((choice: HintChoiceOption) => {
    if (stage === 'REVEALED') return;

    if (choice.isCorrect) {
      triggerReveal();
    } else {
      soundEffects.playIncorrect();
      setWrongKeys(prev => [...prev, choice.key]);
    }
  }, [stage, triggerReveal]);

  // Team score adjustments
  const adjustTeamScore = useCallback((team: keyof TeamScores, delta: number) => {
    setTeamScores(prev => ({
      ...prev,
      [team]: Math.max(0, prev[team] + delta)
    }));
    if (delta > 0) {
      soundEffects.playCorrect();
    }
  }, []);

  // Keyboard and Presentation Clicker shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      // Spacebar / Enter / PageDown / ArrowRight / ArrowDown: Advance phase
      if (
        ['Space', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.code) ||
        [' ', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)
      ) {
        e.preventDefault();
        advancePhase();
        return;
      }

      // 'H' key: Swap current active stage's hint for another hint from the pool!
      if (e.code === 'KeyH' || e.key === 'h' || e.key === 'H') {
        if (stage !== 'REVEALED') {
          e.preventDefault();
          handleSwapClue(stage);
        }
        return;
      }

      // Replay Audio: 'KeyR', 'PageUp', 'ArrowLeft', 'ArrowUp'
      if (
        ['KeyR', 'PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.code) ||
        ['r', 'R', 'PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)
      ) {
        e.preventDefault();
        if (stage === 'REVEALED' && currentWord) {
          playWordAudio(currentWord.sound_file || (currentWord as any).primary_audio, currentWord.english);
        } else if (stage !== 'REVEALED') {
          const currentClue = clues[stage - 1];
          if (currentClue) readClueAloud(currentClue);
        }
        return;
      }

      // Keys 1-4: Award points to team (+100) / Shift + 1-4: Deduct 100
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

      // Keys A-D: Select choice in 4-choice mode
      if (guessingMode === 'FOUR_CHOICES' && stage !== 'REVEALED') {
        const keyUpper = e.key.toUpperCase();
        if ((e.code === 'KeyA' || keyUpper === 'A') && fourChoices[0]) handleSelectChoice(fourChoices[0]);
        if ((e.code === 'KeyB' || keyUpper === 'B') && fourChoices[1]) handleSelectChoice(fourChoices[1]);
        if ((e.code === 'KeyC' || keyUpper === 'C') && fourChoices[2]) handleSelectChoice(fourChoices[2]);
        if ((e.code === 'KeyD' || keyUpper === 'D') && fourChoices[3]) handleSelectChoice(fourChoices[3]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advancePhase, handleSwapClue, stage, currentWord, clues, guessingMode, fourChoices, adjustTeamScore, handleSelectChoice, playWordAudio, readClueAloud]);

  if (!currentWord) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-white text-center">
        <p className="text-xl font-bold">単語データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] mx-auto flex-1 min-h-0 flex flex-col justify-between space-y-2 sm:space-y-3 p-1 sm:p-2 md:p-3 select-none">
      {/* ====================================================================
          1. TOP CONTROLS & SETTINGS TOOLBAR
         ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-800 p-2.5 sm:p-3.5 rounded-3xl shadow border-2 border-indigo-200 dark:border-slate-700 gap-2 sm:gap-3">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-1 transition"
            >
              <ChevronLeft size={16} />
              <span>もどる</span>
            </button>
          )}
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-indigo-900 dark:text-indigo-300 tracking-wide flex items-center gap-2">
              <span>🔍 3ヒントクイズ</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                Three-Hint Master
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                Round {roundNumber}
              </span>
            </h2>
          </div>
        </div>

        {/* Center: Guessing Mode & Visual Options */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Guessing Mode Toggle */}
          <div className="flex bg-indigo-50 dark:bg-slate-900 p-1 rounded-2xl border border-indigo-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setGuessingMode('OPEN_GUESS')}
              className={`px-3 py-1 rounded-xl font-black transition ${
                guessingMode === 'OPEN_GUESS' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-800 dark:text-indigo-300'
              }`}
            >
              🗣️ 挙手・早押し
            </button>
            <button
              onClick={() => setGuessingMode('FOUR_CHOICES')}
              className={`px-3 py-1 rounded-xl font-black transition ${
                guessingMode === 'FOUR_CHOICES' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-800 dark:text-indigo-300'
              }`}
            >
              🎴 4択カード
            </button>
          </div>

          {/* Visual Mode Toggle */}
          <div className="flex bg-indigo-50 dark:bg-slate-900 p-1 rounded-2xl border border-indigo-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setVisualMode('SILHOUETTE')}
              className={`px-2.5 py-1 rounded-xl font-black transition ${
                visualMode === 'SILHOUETTE' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-800 dark:text-indigo-300'
              }`}
            >
              👤 シルエット
            </button>
            <button
              onClick={() => setVisualMode('MYSTERY_BOX')}
              className={`px-2.5 py-1 rounded-xl font-black transition ${
                visualMode === 'MYSTERY_BOX' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-800 dark:text-indigo-300'
              }`}
            >
              ❓ はてなBOX
            </button>
          </div>

          {/* Auto Read Aloud Toggle */}
          <button
            onClick={() => setAutoReadClue(prev => !prev)}
            className={`px-3 py-1 rounded-2xl text-xs font-black transition flex items-center gap-1 shadow-xs ${
              autoReadClue
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Automatically read clues aloud using English voice"
          >
            <Volume2 size={14} />
            <span>音声よみあげ: {autoReadClue ? 'ON' : 'OFF'}</span>
          </button>

          {/* Subtitles Toggle */}
          <button
            onClick={() => setShowSubtitles(prev => !prev)}
            className={`px-3 py-1 rounded-2xl text-xs font-black transition shadow-xs ${
              showSubtitles
                ? 'bg-indigo-100 text-indigo-900 dark:bg-slate-700 dark:text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
            title="Toggle Japanese translations below clues"
          >
            🇯🇵 日本語ヒント: {showSubtitles ? 'ON' : 'OFF'}
          </button>

          {/* Reset / Next button */}
          <button
            onClick={() => advancePhase()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow flex items-center gap-1 transition"
          >
            <span>{stage === 'REVEALED' ? 'つぎの問題 →' : '進む (Space)'}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. MAIN GAME AREA (Mystery Card on Left + Clues on Right)
         ==================================================================== */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Left 5 Cols: Mystery Card Visual */}
        <div className="lg:col-span-5 flex flex-col">
          <MysteryCardVisual
            word={currentWord}
            grade={activeGrade}
            isRevealed={stage === 'REVEALED'}
            visualMode={visualMode}
            currentStage={stage}
            onPlayAudio={() => playWordAudio(currentWord.sound_file || (currentWord as any).primary_audio, currentWord.english)}
          />
        </div>

        {/* Right 7 Cols: 3 Clue Cards */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <ThreeHintsClues
            clues={clues}
            currentStage={stage}
            showSubtitles={showSubtitles}
            onReadClue={readClueAloud}
            onSwapClue={handleSwapClue}
          />
        </div>
      </div>

      {/* ====================================================================
          3. BOTTOM SECTION: 4-Choice Tray OR Team Scoreboard
         ==================================================================== */}
      {guessingMode === 'FOUR_CHOICES' ? (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400 px-2">
            <span>👇 4つのカードから えらぼう！ (Click or press A, B, C, D)</span>
            <span>現在: {stage === 1 ? '300点' : stage === 2 ? '200点' : stage === 3 ? '100点' : '正解済み'}</span>
          </div>
          <ChoiceTray
            choices={fourChoices}
            grade={activeGrade}
            isRevealed={stage === 'REVEALED'}
            wrongKeys={wrongKeys}
            onSelectChoice={handleSelectChoice}
          />
        </div>
      ) : null}

      {/* Team Scoreboard Bar */}
      <div className="w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur p-2.5 sm:p-3 rounded-2xl border-2 border-indigo-200 dark:border-slate-700 shadow flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            チーム得点 (キー 1〜4 で＋100 / Shift＋キーで−100 / Hキーで別のヒント):
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Red */}
          <button
            onClick={() => adjustTeamScore('red', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-600 hover:scale-105 active:scale-95 transition"
          >
            <span>🔴 赤:</span>
            <span className="font-black text-red-700 dark:text-red-400 text-sm sm:text-base">{teamScores.red}</span>
          </button>
          {/* Blue */}
          <button
            onClick={() => adjustTeamScore('blue', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-600 hover:scale-105 active:scale-95 transition"
          >
            <span>🔵 青:</span>
            <span className="font-black text-blue-700 dark:text-blue-400 text-sm sm:text-base">{teamScores.blue}</span>
          </button>
          {/* Yellow */}
          <button
            onClick={() => adjustTeamScore('yellow', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-600 hover:scale-105 active:scale-95 transition"
          >
            <span>🟡 黄:</span>
            <span className="font-black text-amber-700 dark:text-amber-400 text-sm sm:text-base">{teamScores.yellow}</span>
          </button>
          {/* Green */}
          <button
            onClick={() => adjustTeamScore('green', 100)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600 hover:scale-105 active:scale-95 transition"
          >
            <span>🟢 緑:</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm sm:text-base">{teamScores.green}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
