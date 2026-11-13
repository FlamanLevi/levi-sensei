import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  SlidersHorizontal,
  HelpCircle,
  RotateCcw,
  Volume2,
  Clock,
  Trophy,
  Flame,
  SkipForward,
  Sparkles,
  ArrowLeft,
  Eye,
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useVocabulary } from '@/context/VocabularyContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { addRewardsToProfile, getSavedStudentProfile } from '@/services/studentProfile';
import { SketchCanvas } from './SketchCanvas';
import { SpiralBoard } from './SpiralBoard';
import { GuessingDeck } from './GuessingDeck';
import { AnticipationInstructionsModal } from './AnticipationInstructionsModal';
import { AnticipationSettingsModal } from './AnticipationSettingsModal';
import { buildAnticipationRounds, resolveDrawStyleForRound } from './roundBuilder';
import {
  AnticipationBoardToken,
  AnticipationDiceEvent,
  AnticipationHostRound,
  AnticipationSettings,
  DEFAULT_ANTICIPATION_SETTINGS,
  PIECE_ORDER,
  SPIRAL_GOAL_INDEX,
  advanceSpiralSpace,
  calculateRoundPoints,
  computeDiceSteps,
} from './types';

interface AnticipationSoloContainerProps {
  onExit: () => void;
}

interface SoloRoundResult {
  wordId: string;
  english: string;
  japanese: string;
  imageUrl: string;
  soundFile?: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

function createInitialSoloTokens(): Record<string, AnticipationBoardToken> {
  const tokens: Record<string, AnticipationBoardToken> = {};
  PIECE_ORDER.forEach((pId, idx) => {
    tokens[pId] = {
      id: pId,
      name: idx === 0 ? 'You' : `CPU ${idx}`,
      jaName: idx === 0 ? 'あなた' : `ロボ ${idx}`,
      pieceId: pId,
      spaceIndex: 0,
      collectedPieces: [],
      score: 0,
      isBot: idx !== 0,
    };
  });
  return tokens;
}

export const AnticipationSoloContainer: React.FC<AnticipationSoloContainerProps> = ({ onExit }) => {
  const { activeGrade } = useClassroom();
  const { filteredWords, scopedWords, gradeWords, allWords, ensureCluesLoaded } = useVocabulary();
  const { playWordAudio } = useAudio();
  const { t, language } = useLanguage();

  const [settings, setSettings] = useState<AnticipationSettings>(() => ({
    ...DEFAULT_ANTICIPATION_SETTINGS,
    gameMode: 'INDIVIDUAL',
    recordRoster: false,
    bgm: 'none',
  }));

  const [rounds, setRounds] = useState<AnticipationHostRound[]>([]);
  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [roundStartTime, setRoundStartTime] = useState<number>(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [phase, setPhase] = useState<'DRAWING' | 'ROUND_REVEAL' | 'GAME_OVER'>('DRAWING');
  const [forceDotsNext, setForceDotsNext] = useState<boolean>(false);

  const [solved, setSolved] = useState<boolean>(false);
  const [lastPoints, setLastPoints] = useState<number | undefined>(undefined);
  const [incorrectAttempts, setIncorrectAttempts] = useState<number>(0);

  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [fastestTimeMs, setFastestTimeMs] = useState<number>(999999);
  const [results, setResults] = useState<SoloRoundResult[]>([]);

  const [tokens, setTokens] = useState<Record<string, AnticipationBoardToken>>(createInitialSoloTokens);
  const tokensRef = useRef<Record<string, AnticipationBoardToken>>(tokens);
  tokensRef.current = tokens;
  const [lastDiceEvent, setLastDiceEvent] = useState<AnticipationDiceEvent | null>(null);
  const [earnedXpGold, setEarnedXpGold] = useState<{ xp: number; gold: number } | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);

  const rewardSavedRef = useRef<boolean>(false);
  const revealHandledRef = useRef<boolean>(false);
  const resultsRef = useRef<SoloRoundResult[]>([]);
  resultsRef.current = results;

  useEffect(() => {
    ensureCluesLoaded();
  }, [ensureCluesLoaded]);

  const primaryPool = useMemo(() => {
    if (filteredWords.length > 0) return filteredWords;
    if (scopedWords.length > 0) return scopedWords;
    return gradeWords;
  }, [filteredWords, scopedWords, gradeWords]);

  const fallbackPool = useMemo(() => {
    return gradeWords.length > 0 ? gradeWords : allWords;
  }, [gradeWords, allWords]);

  const startNewSession = useCallback(
    (overrideSettings?: AnticipationSettings) => {
      const cfg = overrideSettings || settings;
      const built = buildAnticipationRounds(primaryPool, fallbackPool, cfg, activeGrade);
      setRounds(built);
      setRoundIdx(0);
      setRoundStartTime(Date.now());
      setElapsedMs(0);
      setPhase('DRAWING');
      setForceDotsNext(false);
      setSolved(false);
      setLastPoints(undefined);
      setIncorrectAttempts(0);
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
      setCorrectCount(0);
      setFastestTimeMs(999999);
      setResults([]);
      const freshTokens = createInitialSoloTokens();
      tokensRef.current = freshTokens;
      setTokens(freshTokens);
      setLastDiceEvent(null);
      setEarnedXpGold(null);
      rewardSavedRef.current = false;
      revealHandledRef.current = false;
    },
    [settings, primaryPool, fallbackPool, activeGrade]
  );

  useEffect(() => {
    if (fallbackPool.length > 0) {
      startNewSession();
    }
  }, [activeGrade, primaryPool.length]);

  const activeHostRound = rounds[roundIdx] || null;
  const activePublicRound = useMemo(() => {
    if (!activeHostRound) return null;
    const styleDecision = resolveDrawStyleForRound(settings.drawStyle, roundIdx, forceDotsNext);
    return {
      ...activeHostRound.publicRound,
      drawStyle: styleDecision.drawStyle,
      canvasStyle: settings.canvasStyle,
      timerMode: settings.timerMode,
      isFeatureDots: styleDecision.isFeatureDots,
      roundStartTime,
      phase: phase === 'ROUND_REVEAL' ? ('ROUND_REVEAL' as const) : ('DRAWING' as const),
      revealedCard:
        phase === 'ROUND_REVEAL'
          ? {
              english: activeHostRound.targetWord.english,
              ja_kanji:
                activeHostRound.targetWord.ja_kanji ||
                activeHostRound.targetWord.ja_hiragana ||
                '',
              ja_hiragana: activeHostRound.targetWord.ja_hiragana,
              en_katakana: activeHostRound.targetWord.en_katakana,
              ruby: activeHostRound.targetWord.ruby,
              soundFile:
                activeHostRound.targetWord.sound_file ||
                activeHostRound.targetWord.primary_audio,
              imageUrl: activeHostRound.publicRound.imageUrl,
              correctOptionId: activeHostRound.correctOptionId,
            }
          : undefined,
    };
  }, [
    activeHostRound,
    settings.drawStyle,
    settings.canvasStyle,
    settings.timerMode,
    roundIdx,
    forceDotsNext,
    roundStartTime,
    phase,
  ]);

  const triggerReveal = useCallback(
    (solvedTimeMs?: number) => {
      if (revealHandledRef.current || !activeHostRound) return;
      revealHandledRef.current = true;
      setPhase('ROUND_REVEAL');
      soundEffects.playReveal();
      playWordAudio(
        activeHostRound.targetWord.sound_file || activeHostRound.targetWord.primary_audio,
        activeHostRound.targetWord.english
      );

      const didSolve = typeof solvedTimeMs === 'number';
      if (!didSolve) {
        setStreak(0);
      }

      const completionMs = activeHostRound.publicRound.drawCompletionMs || 11000;

      setResults((prev) => {
        if (prev.some((r) => r.wordId === activeHostRound.targetWord.id && prev.length > roundIdx)) {
          return prev;
        }
        return [
          ...prev,
          {
            wordId: activeHostRound.targetWord.id,
            english: activeHostRound.targetWord.english,
            japanese:
              activeHostRound.targetWord.ja_kanji ||
              activeHostRound.targetWord.ja_hiragana ||
              activeHostRound.targetWord.english,
            imageUrl: activeHostRound.publicRound.imageUrl,
            soundFile:
              activeHostRound.targetWord.sound_file || activeHostRound.targetWord.primary_audio,
            isCorrect: didSolve,
            timeTakenMs: solvedTimeMs || completionMs,
          },
        ];
      });

      if (settings.loopMode === 'SPIRAL_BOARD') {
        const next = { ...tokensRef.current };
        const moverId = didSolve
          ? 'shoes'
          : PIECE_ORDER[1 + (roundIdx % (PIECE_ORDER.length - 1))];
        const tk = next[moverId];
        if (tk) {
          const steps = didSolve
            ? computeDiceSteps(solvedTimeMs!, completionMs)
            : 1 + (roundIdx % 2);
          const adv = advanceSpiralSpace(tk.spaceIndex, steps);
          const collected = [...(tk.collectedPieces || [])];
          if (adv.puzzlePiece && !collected.includes(adv.puzzlePiece)) {
            collected.push(adv.puzzlePiece);
          }
          next[moverId] = {
            ...tk,
            spaceIndex: adv.nextSpace,
            collectedPieces: collected,
            score: tk.score + 1,
          };
          tokensRef.current = next;
          setTokens(next);
          setLastDiceEvent({
            roundIndex: roundIdx,
            rollerId: moverId,
            rollerName: language === 'ja' ? tk.jaName || tk.name : tk.name,
            pieceId: tk.pieceId,
            steps,
            fromSpace: tk.spaceIndex,
            toSpace: adv.nextSpace,
            hitWarp: adv.hitWarp,
            hitPuzzle: adv.hitPuzzle,
            hitFeatureDots: adv.hitFeatureDots,
            reachedGoal: adv.reachedGoal,
            timestamp: Date.now(),
          });
          setForceDotsNext(adv.hitFeatureDots);
        }
      }
    },
    [activeHostRound, settings.loopMode, roundIdx, language, playWordAudio]
  );

  // Round progress & optional timer cutoff loop (NO_CUTOFF keeps finished picture on screen until solved or skipped!)
  useEffect(() => {
    if (phase !== 'DRAWING' || !activeHostRound) return;
    const drawDur = activeHostRound.publicRound.drawDurationMs;
    const isTimedCutoff = settings.timerMode === 'GENEROUS_TIMER';
    const tick = () => {
      const el = Math.max(0, Date.now() - roundStartTime);
      setElapsedMs(el);
      if (isTimedCutoff && el >= drawDur) {
        triggerReveal(undefined);
      }
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [phase, activeHostRound, roundStartTime, settings.timerMode, triggerReveal]);

  const handleCorrectGuess = useCallback(() => {
    if (!activeHostRound || phase !== 'DRAWING' || solved) return;
    const completionMs = activeHostRound.publicRound.drawCompletionMs || 11000;
    const taken = Math.max(220, Math.min(180000, Date.now() - roundStartTime));
    const nextStreak = streak + 1;
    const pts = calculateRoundPoints(taken, completionMs, nextStreak, true);

    setSolved(true);
    setLastPoints(pts);
    setScore((s) => s + pts);
    setStreak(nextStreak);
    setMaxStreak((m) => Math.max(m, nextStreak));
    setCorrectCount((c) => c + 1);
    setFastestTimeMs((f) => Math.min(f, taken));

    triggerReveal(taken);
  }, [activeHostRound, phase, solved, roundStartTime, streak, triggerReveal]);

  const finishGameAndSaveRewards = useCallback(async () => {
    setPhase('GAME_OVER');
    soundEffects.playFanfare();
    confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });

    if (rewardSavedRef.current) return;
    rewardSavedRef.current = true;

    const finalResults = resultsRef.current;
    const xp = Math.max(40, Math.round(score / 8) + correctCount * 12);
    const gold = Math.max(8, Math.round(score / 80) + correctCount * 3);
    setEarnedXpGold({ xp, gold });

    const prof = getSavedStudentProfile();
    if (prof) {
      const sessionId = `anticipation_solo_${Date.now()}`;
      const totalAnsMs = finalResults.reduce((acc, r) => acc + r.timeTakenMs, 0);
      const correctAnsMs = finalResults
        .filter((r) => r.isCorrect)
        .reduce((acc, r) => acc + r.timeTakenMs, 0);

      await addRewardsToProfile(
        prof.schoolId,
        prof.classId,
        prof.attendanceNumber,
        xp,
        gold,
        correctCount,
        Math.max(1, finalResults.length),
        sessionId,
        {
          maxStreak,
          fastestTimeMs: fastestTimeMs < 999999 ? fastestTimeMs : undefined,
          totalAnswerTimeMs: totalAnsMs,
          totalCorrectTimeMs: correctAnsMs,
          troubleQuestions: finalResults.map((r) => ({
            wordId: r.wordId,
            english: r.english,
            japanese: r.japanese,
            isCorrect: r.isCorrect,
          })),
        }
      ).catch(() => {});
    }
  }, [score, correctCount, maxStreak, fastestTimeMs]);

  const handleNextRound = () => {
    const reachedGoal =
      settings.loopMode === 'SPIRAL_BOARD' &&
      Object.values(tokens).some((tk) => tk.spaceIndex >= SPIRAL_GOAL_INDEX);
    if (roundIdx + 1 >= rounds.length || reachedGoal) {
      void finishGameAndSaveRewards();
      return;
    }
    revealHandledRef.current = false;
    setRoundIdx((i) => i + 1);
    setPhase('DRAWING');
    setRoundStartTime(Date.now());
    setElapsedMs(0);
    setSolved(false);
    setLastPoints(undefined);
    setIncorrectAttempts(0);
  };

  // ============================================================================
  // COMPLETION SUMMARY VIEW
  // ============================================================================
  if (phase === 'GAME_OVER') {
    const accuracy =
      results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
    const sortedBoardTokens = Object.values(tokens).sort((a, b) => b.spaceIndex - a.spaceIndex);
    const boardLeader = sortedBoardTokens[0];

    return (
      <div className="w-full h-full max-w-6xl mx-auto p-2 sm:p-4 flex flex-col gap-3 text-slate-900 dark:text-white overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1 min-h-0">
          {/* Left Wing: Score, Rewards & Action Buttons */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border-3 border-amber-300 dark:border-amber-600/60 p-5 shadow-xl flex flex-col justify-between gap-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white text-3xl flex items-center justify-center mx-auto mb-2 shadow-lg">
                🏆
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                {settings.loopMode === 'SPIRAL_BOARD' && boardLeader
                  ? boardLeader.id === 'shoes'
                    ? t('Spiral Champion! Amazing!', 'スパイラル優勝！おめでとう！')
                    : t('Great Sketch Challenge!', 'スケッチ対決おつかれさま！')
                  : t('Sketch Challenge Complete!', 'スケッチ練習クリア！')}
              </h2>
              {earnedXpGold && (
                <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-black text-xs">
                  <Sparkles size={14} />
                  <span>
                    +{earnedXpGold.xp} XP · +{earnedXpGold.gold} Gold
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block">
                  {t('Total Score', 'スコア')}
                </span>
                <strong className="text-xl font-mono font-black text-amber-700 dark:text-amber-300">
                  {score.toLocaleString()}
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block">
                  {t('Accuracy', 'せいかい率')}
                </span>
                <strong className="text-xl font-mono font-black text-indigo-700 dark:text-indigo-300">
                  {accuracy}%
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block">
                  {t('Max Streak', 'れんぞく正解')}
                </span>
                <strong className="text-xl font-mono font-black text-orange-600 dark:text-orange-300">
                  {maxStreak}
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 block">
                  {t('Fastest Solve', '最速タイム')}
                </span>
                <strong className="text-xl font-mono font-black text-emerald-700 dark:text-emerald-300">
                  {fastestTimeMs < 999999 ? `${(fastestTimeMs / 1000).toFixed(1)}s` : '—'}
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => startNewSession()}
                className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <RotateCcw size={16} />
                <span>{t('Play Again', 'もういちど')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-sm cursor-pointer"
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                type="button"
                onClick={onExit}
                className="py-3 px-4 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-black text-sm flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>{t('Exit', 'もどる')}</span>
              </button>
            </div>
          </div>

          {/* Right Wing: Reviewed Word Cards with Native Audio */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border-3 border-slate-200 dark:border-slate-800 p-5 shadow-xl flex flex-col min-h-0">
            <h3 className="text-base font-black pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
              🔊 {t('Tap Any Word to Listen & Review', 'たんごをタップして発音チェック')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto py-3 flex-1 min-h-0">
              {results.map((item, idx) => (
                <button
                  key={`${item.wordId}-${idx}`}
                  type="button"
                  onClick={() => playWordAudio(item.soundFile, item.english)}
                  className={`p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-2 cursor-pointer transition-all hover:brightness-97 ${
                    item.isCorrect
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span>{item.isCorrect ? '✅' : '📝'}</span>
                      <span className="font-black text-sm truncate">{item.english}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate block">
                      {item.japanese}
                    </span>
                  </div>
                  <Volume2 size={16} className="text-indigo-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnticipationSettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onChange={(next) => {
            setSettings(next);
            startNewSession(next);
          }}
          onClose={() => setIsSettingsOpen(false)}
          showHostOptions={false}
        />
      </div>
    );
  }

  const drawDurationMs = activePublicRound?.drawDurationMs || 28000;
  const drawCompletionMs = activePublicRound?.drawCompletionMs || settings.drawCompletionSeconds * 1000 || 11000;
  const isTimedCutoff = settings.timerMode === 'GENEROUS_TIMER';
  const isSketchDone = elapsedMs >= drawCompletionMs;
  const remainingSec =
    phase === 'ROUND_REVEAL'
      ? 0
      : Math.max(0, Math.ceil((drawDurationMs - elapsedMs) / 1000));

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-2 p-1.5 sm:p-2 text-slate-900 dark:text-white select-none overflow-hidden">
      {/* Compact Top Control Strip */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-1.5 shadow-sm flex items-center justify-between gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 flex-nowrap">
          <button
            type="button"
            onClick={() => {
              const nextMode =
                settings.loopMode === 'SPIRAL_BOARD'
                  ? ('QUICK_ROUNDS' as const)
                  : ('SPIRAL_BOARD' as const);
              const nextSettings: AnticipationSettings = { ...settings, loopMode: nextMode };
              setSettings(nextSettings);
              startNewSession(nextSettings);
            }}
            className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-black text-xs cursor-pointer whitespace-nowrap"
          >
            {settings.loopMode === 'SPIRAL_BOARD'
              ? t('🌀 Spiral Board', '🌀 4層ボード')
              : t('⚡ Quick Rounds', '⚡ クイック戦')}
          </button>

          {settings.loopMode === 'SPIRAL_BOARD' && (
            <span className="lg:hidden px-2 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs whitespace-nowrap">
              👟 {tokens.shoes?.spaceIndex || 0}/{SPIRAL_GOAL_INDEX}
            </span>
          )}

          <span className="px-2 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs whitespace-nowrap">
            {roundIdx + 1} / {rounds.length || settings.roundCount}
          </span>

          <span
            className={`px-2 py-1 rounded-xl font-mono font-black text-xs flex items-center gap-1 whitespace-nowrap ${
              phase === 'ROUND_REVEAL'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : isTimedCutoff && remainingSec <= 5
                ? 'bg-rose-500 text-white animate-pulse'
                : !isTimedCutoff && isSketchDone
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <Clock size={12} />
            <span>
              {phase === 'ROUND_REVEAL'
                ? t('REVEAL', '発表')
                : isTimedCutoff
                ? `${remainingSec}s`
                : isSketchDone
                ? `∞ ${t('Complete!', 'かんせい！')}`
                : `∞ ${t('Drawing...', 'お絵かき中')}`}
            </span>
          </span>

          <span className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-black text-xs flex items-center gap-1 whitespace-nowrap">
            <Trophy size={12} className="text-amber-500" />
            <span>{score.toLocaleString()}</span>
          </span>

          {streak >= 2 && (
            <span className="px-2 py-1 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-black text-xs flex items-center gap-0.5 whitespace-nowrap">
              <Flame size={12} />
              <span>{streak}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {phase === 'DRAWING' && (
            <button
              type="button"
              onClick={() => triggerReveal(undefined)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Eye size={14} />
              <span>{t('Show Answer', '答えを見る')}</span>
            </button>
          )}
          {phase === 'ROUND_REVEAL' && (
            <button
              type="button"
              onClick={handleNextRound}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer shadow-md whitespace-nowrap"
            >
              <span>
                {roundIdx + 1 >= rounds.length ||
                (settings.loopMode === 'SPIRAL_BOARD' &&
                  Object.values(tokens).some((tk) => tk.spaceIndex >= SPIRAL_GOAL_INDEX))
                  ? t('See Results', 'けっかを見る')
                  : t('Next Sketch', 'つぎの絵へ')}
              </span>
              <SkipForward size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => startNewSession()}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title={t('New Deck', 'やり直す')}
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
            title={t('Settings', '設定')}
          >
            <SlidersHorizontal size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 cursor-pointer"
            title={t('How to Play', 'あそびかた')}
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      {/* Main Responsive Stage: Left Canvas + Right Guessing Deck + Optional Spiral Track Strip/Sidebar */}
      {activePublicRound && activeHostRound ? (
        <div
          className={`grid grid-cols-1 gap-2.5 flex-1 min-h-0 overflow-hidden ${
            settings.loopMode === 'SPIRAL_BOARD'
              ? 'lg:grid-cols-12'
              : 'md:grid-cols-12'
          }`}
        >
          <div
            className={
              settings.loopMode === 'SPIRAL_BOARD'
                ? 'lg:col-span-5 min-h-[190px] lg:min-h-0'
                : 'md:col-span-6 min-h-[210px] md:min-h-0'
            }
          >
            <SketchCanvas
              useLocalClock
              roundIndex={roundIdx}
              wordId={activePublicRound.wordId}
              wordHintEnglish={activeHostRound.targetWord.english}
              categoryKey={activePublicRound.categoryKey}
              categoryNameEn={activePublicRound.categoryNameEn}
              categoryNameJa={activePublicRound.categoryNameJa}
              imageUrl={activePublicRound.imageUrl}
              nesVector={activePublicRound.nesVector}
              drawStyle={activePublicRound.drawStyle}
              canvasStyle={settings.canvasStyle}
              timerMode={settings.timerMode}
              roundStartTime={roundStartTime}
              drawCompletionMs={drawCompletionMs}
              drawDurationMs={drawDurationMs}
              isRevealed={phase === 'ROUND_REVEAL'}
              revealedCard={activePublicRound.revealedCard}
              wordMask={activePublicRound.wordMask}
              englishLength={activePublicRound.englishLength}
              firstLetterHint={activePublicRound.firstLetterHint}
              secondLetterHint={activePublicRound.secondLetterHint}
              isFeatureDots={activePublicRound.isFeatureDots}
              remainingSecDisplay={isTimedCutoff ? remainingSec : null}
              onPlayAudio={playWordAudio}
            />
          </div>

          <div
            className={
              settings.loopMode === 'SPIRAL_BOARD'
                ? 'lg:col-span-4 min-h-0'
                : 'md:col-span-6 min-h-0'
            }
          >
            <GuessingDeck
              round={activePublicRound}
              englishReadingAid={settings.englishReadingAid}
              solved={solved}
              isRevealed={phase === 'ROUND_REVEAL'}
              incorrectAttempts={incorrectAttempts}
              pointsEarned={lastPoints}
              elapsedMs={elapsedMs}
              onSubmitCorrect={handleCorrectGuess}
              onWrongAttempt={(next) => setIncorrectAttempts(next)}
            />
          </div>

          {settings.loopMode === 'SPIRAL_BOARD' && (
            <div className="hidden lg:block lg:col-span-3 min-h-0">
              <SpiralBoard
                tokens={tokens}
                lastDiceEvent={lastDiceEvent}
                highlightTokenId="shoes"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
            <div className="text-4xl mb-2 animate-bounce">🎨</div>
            <p className="font-black">{t('Preparing vocabulary deck...', '単語カードを準備中...')}</p>
          </div>
        </div>
      )}

      <AnticipationSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onChange={(next) => {
          setSettings(next);
          startNewSession(next);
        }}
        onClose={() => setIsSettingsOpen(false)}
        showHostOptions={false}
      />

      <AnticipationInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />
    </div>
  );
};
