import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import {
  DisplayTier,
  GamePhase,
  CardCount,
  TimerOption,
  MissingCount,
  TraySlot,
  TeamScores,
  ScoreboardMode,
} from './types';
import { sampleCards, shuffleArray } from './utils';
import { CurtainAnimation } from './CurtainAnimation';
import { MissingCardSlot } from './MissingCardSlot';
import { ChoralRepetitionBanner } from './ChoralRepetitionBanner';
import { ScoreTracker } from './ScoreTracker';
import { WhatsMissingSettingsModal } from './WhatsMissingSettingsModal';
import { WhatsMissingStudent } from './WhatsMissingStudent';
import {
  useWhatsMissingRoom,
  buildCandidateChoices,
} from './useWhatsMissingRoom';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';
import { useLanguage } from '@/context/LanguageContext';
import {
  Clock,
  RotateCcw,
  Settings,
  Layers,
  Users,
  Zap,
  BarChart3,
  Smartphone,
  Wifi,
} from 'lucide-react';

interface WhatsMissingGameProps {
  onExit?: () => void;
}

export const WhatsMissingGame: React.FC<WhatsMissingGameProps> = ({ onExit }) => {
  const { scopedWords, filteredWords, gradeWords, allWords, availableUnits } =
    useVocabulary();
  const { activeGrade, activeUnit, setActiveUnit } = useClassroom();
  const { playPop, playWordAudio } = useAudio();
  const { t } = useLanguage();

  // Switch between Front TV Host and Student iPad Voting Pad
  const [viewMode, setViewMode] = useState<'HOST_TV' | 'STUDENT_PAD'>('HOST_TV');

  // --- Game Settings (Optimized Defaults for Elementary School) ---
  const [cardCount, setCardCount] = useState<CardCount>(4);
  const [displayTier, setDisplayTier] = useState<DisplayTier>('picture_only');
  const [shuffleOrder, setShuffleOrder] = useState<boolean>(false);
  const [missingCount, setMissingCount] = useState<MissingCount>(1);
  const [timerOption, setTimerOption] = useState<TimerOption>(0);
  const [scoreboardMode, setScoreboardMode] = useState<ScoreboardMode>('off');
  const [sixCardLayout, setSixCardLayout] = useState<'2_rows' | '1_row'>('2_rows');
  const [teacherGhostPeek, setTeacherGhostPeek] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // --- Game State ---
  const [phase, setPhase] = useState<GamePhase>('STUDY');
  const [tray, setTray] = useState<TraySlot[]>([]);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [streak, setStreak] = useState<number>(0);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // --- Scoreboard State ---
  const [scores, setScores] = useState<TeamScores>({
    red: 0,
    blue: 0,
    yellow: 0,
    green: 0,
  });

  // --- Stream B RTDB Synchronization Hook ---
  const {
    roomCode,
    roomState,
    aggregatedStats,
    targetClassSize,
    isConnected,
    createRoom,
    closeCurtains: syncCloseCurtains,
    openCurtains: syncOpenCurtains,
    revealCard: syncRevealCard,
    nextRound: syncNextRound,
  } = useWhatsMissingRoom({
    isHost: true,
    grade: activeGrade,
    unit: activeUnit,
    targetClassSize: 35,
  });

  // Initialize room on mount
  useEffect(() => {
    if (!roomCode) {
      createRoom(undefined, cardCount, missingCount, displayTier);
    }
  }, [roomCode, createRoom, cardCount, missingCount, displayTier]);

  // Refs for timers and latest state
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerOptionRef = useRef<TimerOption>(timerOption);

  useEffect(() => {
    timerOptionRef.current = timerOption;
  }, [timerOption]);

  // 1. Setup Round
  const setupRound = useCallback(
    (nextRoundNum = roundNumber) => {
      if (timerIntervalRef.current) clearTimeout(timerIntervalRef.current);
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);

      const primaryPool =
        scopedWords.length > 0
          ? scopedWords
          : filteredWords.length > 0
          ? filteredWords
          : gradeWords.length > 0
          ? gradeWords
          : allWords;
      const fallbackPool = gradeWords.length > 0 ? gradeWords : allWords;
      const sampled = sampleCards(primaryPool, cardCount, fallbackPool);

      const initialTray: TraySlot[] = sampled.map((card, idx) => ({
        slotId: `${card.id}-${idx}-${Date.now()}`,
        card,
        originalIndex: idx,
        isMissing: false,
        isRevealed: false,
      }));

      setTray(initialTray);
      setPhase('STUDY');
      syncNextRound(nextRoundNum, cardCount, missingCount, displayTier);

      const currentTimer = timerOptionRef.current;
      if (currentTimer > 0) {
        setTimerRemaining(currentTimer);
      } else {
        setTimerRemaining(null);
      }
    },
    [
      scopedWords,
      filteredWords,
      gradeWords,
      allWords,
      cardCount,
      roundNumber,
      missingCount,
      displayTier,
      syncNextRound,
    ]
  );

  // Initial load or when cardCount changes
  useEffect(() => {
    setupRound(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardCount]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearTimeout(timerIntervalRef.current);
      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
    };
  }, []);

  // 2. Theatrical Curtain Sequence: Close -> Hide & Shuffle -> Reopen
  const triggerCloseCurtain = useCallback(() => {
    if (phase !== 'STUDY' || tray.length === 0) return;

    if (timerIntervalRef.current) clearTimeout(timerIntervalRef.current);
    setTimerRemaining(null);

    soundEffects.playCurtainSwoosh();
    setPhase('CURTAIN_CLOSING');
    syncCloseCurtains();

    phaseTimeoutRef.current = setTimeout(() => {
      setPhase('CURTAIN_CLOSED');

      const indices = Array.from({ length: tray.length }, (_, i) => i);
      const shuffledIndices = shuffleArray(indices);
      const chosenIndices = new Set(
        shuffledIndices.slice(0, Math.min(missingCount, tray.length - 1))
      );

      let updatedTray: TraySlot[] = tray.map((slot, idx) => ({
        ...slot,
        isMissing: chosenIndices.has(idx),
        isRevealed: false,
      }));

      if (shuffleOrder && updatedTray.length > 1) {
        let attempts = 0;
        let shuffled = shuffleArray(updatedTray);
        while (
          attempts < 5 &&
          shuffled.every((slot, i) => slot.slotId === updatedTray[i].slotId)
        ) {
          shuffled = shuffleArray(updatedTray);
          attempts++;
        }
        updatedTray = shuffled;
      }

      setTray(updatedTray);

      const missingCards = updatedTray
        .filter((s) => s.isMissing)
        .map((s) => s.card);
      const allTrayCards = updatedTray.map((s) => s.card);
      const poolCards = gradeWords.length > 0 ? gradeWords : allWords;
      const candidateChoices = buildCandidateChoices(
        missingCards,
        allTrayCards,
        poolCards,
        activeGrade,
        4
      );

      phaseTimeoutRef.current = setTimeout(() => {
        setPhase('CURTAIN_OPENING');
        soundEffects.playChime();

        phaseTimeoutRef.current = setTimeout(() => {
          setPhase('GUESSING');
          syncOpenCurtains(
            missingCards,
            candidateChoices,
            cardCount,
            missingCount,
            displayTier
          );
        }, 500);
      }, 950);
    }, 500);
  }, [
    phase,
    tray,
    missingCount,
    shuffleOrder,
    gradeWords,
    allWords,
    activeGrade,
    cardCount,
    displayTier,
    syncCloseCurtains,
    syncOpenCurtains,
  ]);

  // 3. Countdown Timer in STUDY phase
  useEffect(() => {
    if (phase === 'STUDY' && timerRemaining !== null) {
      if (timerRemaining > 0) {
        timerIntervalRef.current = setTimeout(() => {
          if (timerRemaining <= 3) {
            soundEffects.playUrgencyTick();
          } else {
            soundEffects.playTick();
          }
          setTimerRemaining((prev) => (prev !== null ? prev - 1 : null));
        }, 1000);
      } else if (timerRemaining === 0) {
        triggerCloseCurtain();
      }
    }
    return () => {
      if (timerIntervalRef.current) clearTimeout(timerIntervalRef.current);
    };
  }, [phase, timerRemaining, triggerCloseCurtain]);

  // 4. Reveal Missing Card(s) with Dramatic Spotlight & Audio Choral Prompt
  const revealMissingSlot = useCallback(
    (targetSlotId?: string) => {
      if (phase !== 'GUESSING' && phase !== 'REVEALED') return;

      let targetIdx = -1;
      if (targetSlotId) {
        targetIdx = tray.findIndex(
          (s) => s.slotId === targetSlotId && s.isMissing && !s.isRevealed
        );
      }
      if (targetIdx === -1) {
        targetIdx = tray.findIndex((s) => s.isMissing && !s.isRevealed);
      }
      if (targetIdx === -1) return;

      const targetCard = tray[targetIdx].card;

      soundEffects.playCorrect();
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
      });

      const newTray = [...tray];
      newTray[targetIdx] = { ...newTray[targetIdx], isRevealed: true };
      setTray(newTray);

      setTimeout(() => {
        playWordAudio(
          targetCard.sound_file || targetCard.primary_audio,
          targetCard.english
        );
      }, 250);

      const remainingMissing = newTray.filter((s) => s.isMissing && !s.isRevealed);
      const revealedIds = newTray
        .filter((s) => s.isMissing && s.isRevealed)
        .map((s) => s.card.id);
      const allDone = remainingMissing.length === 0;

      syncRevealCard(revealedIds, allDone);

      if (allDone) {
        setPhase('REVEALED');
        setStreak((prev) => prev + 1);
        setTimeout(() => {
          soundEffects.playFanfare();
        }, 500);
      }
    },
    [phase, tray, playWordAudio, syncRevealCard]
  );

  // 5. Next Round Handler
  const handleNextRound = useCallback(() => {
    playPop();
    const nextNum = roundNumber + 1;
    setRoundNumber(nextNum);
    setupRound(nextNum);
  }, [playPop, roundNumber, setupRound]);

  // 6. Audio Replay Helper
  const playCardAudio = useCallback(
    (card: VocabularyItem) => {
      playWordAudio(card.sound_file || card.primary_audio, card.english);
    },
    [playWordAudio]
  );

  // 7. Team Scores
  const handleUpdateScore = useCallback(
    (team: keyof TeamScores, delta: number) => {
      setScores((prev) => ({
        ...prev,
        [team]: Math.max(0, prev[team] + delta),
      }));
    },
    []
  );

  const handleResetScores = useCallback(() => {
    playPop();
    setScores({ red: 0, blue: 0, yellow: 0, green: 0 });
    setStreak(0);
  }, [playPop]);

  // 8. Universal Presentation Clicker & Keyboard Support
  useClassroomClicker({
    onNext: () => {
      if (viewMode !== 'HOST_TV') return;
      if (phase === 'STUDY') {
        triggerCloseCurtain();
      } else if (phase === 'GUESSING') {
        revealMissingSlot();
      } else if (phase === 'REVEALED') {
        handleNextRound();
      }
    },
    onReplayAudio: () => {
      if (viewMode !== 'HOST_TV') return;
      if (phase === 'GUESSING' || phase === 'REVEALED') {
        const revealed = tray.filter((s) => s.isMissing && s.isRevealed);
        if (revealed.length > 0) {
          playCardAudio(revealed[revealed.length - 1].card);
          return;
        }
      }
      if (tray.length > 0) {
        playCardAudio(tray[0].card);
      }
    },
    onTogglePause: () => setIsPaused((p) => !p),
    onBlankScreen: () => setIsBlackout((b) => !b),
  });

  useEffect(() => {
    if (viewMode !== 'HOST_TV') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      if (e.key === 'n' || e.key === 'N' || e.code === 'KeyN') {
        e.preventDefault();
        handleNextRound();
      } else if (e.key === ',' || e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (e.key === '1' || e.key === '!' || e.code === 'Digit1') {
        e.preventDefault();
        handleUpdateScore('red', e.shiftKey || e.key === '!' ? -1 : 1);
      } else if (e.key === '2' || e.key === '@' || e.code === 'Digit2') {
        e.preventDefault();
        handleUpdateScore('blue', e.shiftKey || e.key === '@' ? -1 : 1);
      } else if (e.key === '3' || e.key === '#' || e.code === 'Digit3') {
        e.preventDefault();
        handleUpdateScore('yellow', e.shiftKey || e.key === '#' ? -1 : 1);
      } else if (e.key === '4' || e.key === '$' || e.code === 'Digit4') {
        e.preventDefault();
        handleUpdateScore('green', e.shiftKey || e.key === '$' ? -1 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleNextRound, handleUpdateScore]);

  if (viewMode === 'STUDENT_PAD') {
    return (
      <WhatsMissingStudent
        initialRoomCode={roomCode}
        onExit={() => setViewMode('HOST_TV')}
      />
    );
  }

  const revealedCards = tray
    .filter((s) => s.isMissing && s.isRevealed)
    .map((s) => s.card);
  const unrevealedMissingCount = tray.filter(
    (s) => s.isMissing && !s.isRevealed
  ).length;
  const candidateChoices = roomState?.candidateChoices || [];
  const missingWordIdsSet = new Set(
    tray.filter((s) => s.isMissing).map((s) => s.card.id)
  );

  const gridClasses =
    cardCount === 4
      ? 'grid-cols-2 md:grid-cols-4 grid-rows-2 md:grid-rows-1'
      : cardCount === 6
      ? sixCardLayout === '2_rows'
        ? 'grid-cols-2 sm:grid-cols-3 grid-rows-3 sm:grid-rows-2'
        : 'grid-cols-3 sm:grid-cols-6 grid-rows-2 sm:grid-rows-1'
      : 'grid-cols-2 sm:grid-cols-4 grid-rows-4 sm:grid-rows-2';

  return (
    <div className="w-full h-full max-w-[96vw] max-h-[94dvh] mx-auto flex-1 min-h-0 flex flex-col justify-between space-y-1.5 sm:space-y-2 select-none relative overflow-hidden font-['UD_Digi_Kyokasho_NP-R','UD_Digi_Kyokasho_NK-R','BIZ_UDPGothic','Zen_Maru_Gothic',sans-serif]">
      {/* --- SLIM HEADER BAR: Round, Single Clear Prompt, Live Student Ticker & Settings --- */}
      <div className="bg-slate-800/90 dark:bg-slate-900/90 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-700 shadow-md flex flex-nowrap items-center justify-between gap-2 shrink-0 z-20 overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Left: Round, Room PIN & Unit */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-0.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black text-xs sm:text-sm tracking-wide shadow-xs">
            {t(`Round ${roundNumber}`, <>ラウンド {roundNumber}</>)}
          </span>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 border border-teal-500/40 text-[11px] font-mono font-black text-teal-300">
            <Wifi size={11} className={isConnected ? 'text-emerald-400' : 'text-amber-400'} />
            <span>{roomCode || 'WM-LIVE'}</span>
          </div>

          {activeUnit !== 'ALL' && (
            <span className="hidden lg:inline-block text-[11px] font-bold text-amber-300 bg-slate-900/70 px-2 py-0.5 rounded-lg border border-slate-700 truncate max-w-[150px]">
              {activeUnit}
            </span>
          )}
        </div>

        {/* Center: Consolidated Single-Line High-Impact Stage Prompt + Live Student Participation Pill */}
        <div className="flex-1 min-w-0 text-center px-1 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar">
          {phase === 'STUDY' && (
            <div className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-base sm:text-xl animate-bounce shrink-0">👀</span>
              <h3 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight truncate">
                {t(
                  `Look closely and remember all ${cardCount} cards!`,
                  <>{cardCount}まいの カードを しっかり おぼえてね！</>
                )}
              </h3>
              {timerRemaining !== null && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 border border-sky-400 text-sky-300 font-mono font-black text-xs">
                  <Clock size={12} className="animate-spin-slow" />
                  <span>{timerRemaining}s</span>
                </span>
              )}
            </div>
          )}

          {(phase === 'CURTAIN_CLOSING' ||
            phase === 'CURTAIN_CLOSED' ||
            phase === 'CURTAIN_OPENING') && (
            <div className="flex flex-nowrap items-center justify-center gap-2 min-w-0">
              <span className="text-base sm:text-lg shrink-0">🙈</span>
              <h3 className="text-sm sm:text-base md:text-lg font-black text-amber-300 tracking-tight truncate">
                {t(
                  'Shh! Curtains closing...',
                  <>
                    カーテンが
                    <ruby>
                      閉<rt>し</rt>
                    </ruby>
                    まるよ！
                  </>
                )}
              </h3>
            </div>
          )}

          {phase === 'GUESSING' && (
            <div className="flex flex-nowrap items-center justify-center gap-2 animate-fadeIn min-w-0">
              <span className="text-base sm:text-xl animate-bounce shrink-0">❓</span>
              <h3 className="text-sm sm:text-base md:text-lg font-black text-amber-300 tracking-tight truncate">
                {missingCount === 2
                  ? t(
                      'Which 2 cards are missing?',
                      <>きえた 2まいの カードは なーんだ？</>
                    )
                  : t(
                      'Which card is missing?',
                      <>きえた カードは なーんだ？</>
                    )}
              </h3>
              {/* Live Student Answer Participation Pill */}
              <div className="px-2.5 py-0.5 rounded-full bg-indigo-600/90 border border-indigo-300 text-white text-xs font-black flex items-center gap-1.5 shadow-sm shrink-0">
                <Users size={12} />
                <span>
                  ⚡ {aggregatedStats.totalSubmissions} / {targetClassSize}{' '}
                  {t('answered', '回答済')}
                </span>
              </div>
            </div>
          )}

          {phase === 'REVEALED' && (
            <div className="flex flex-nowrap items-center justify-center gap-2 animate-fadeIn min-w-0">
              <span className="text-base sm:text-xl shrink-0">🎉</span>
              <h3 className="text-sm sm:text-base md:text-lg font-black text-emerald-400 tracking-tight truncate">
                {t(
                  'Correct! Repeat after Levi-sensei!',
                  <>
                    <ruby>
                      正解<rt>せいかい</rt>
                    </ruby>
                    ！ みんなでリピートしよう！
                  </>
                )}
              </h3>
              {aggregatedStats.fastestNickname &&
                aggregatedStats.fastestTimeMs !== null && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow shrink-0">
                    <Zap size={12} />
                    <span>
                      {t(
                        `Fastest: ${aggregatedStats.fastestNickname} (#${aggregatedStats.fastestSeat}) in ${(
                          aggregatedStats.fastestTimeMs / 1000
                        ).toFixed(2)}s!`,
                        `最速: ${aggregatedStats.fastestNickname} (${aggregatedStats.fastestSeat}番) ${(
                          aggregatedStats.fastestTimeMs / 1000
                        ).toFixed(2)}秒！`
                      )}
                    </span>
                  </span>
                )}
            </div>
          )}
        </div>

        {/* Right: Quick Status Badges, Student Pad Preview, New Cards, and Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          <button
            onClick={() => {
              playPop();
              setViewMode('STUDENT_PAD');
            }}
            className="px-2 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/40 font-black text-xs flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0"
            title={t('Open Student iPad Voting Pad', '児童用iPad投票画面を開く')}
          >
            <Smartphone size={13} />
            <span className="hidden md:inline">{t('Student Pad', '児童画面')}</span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/80 text-teal-300 border border-slate-700 text-[11px] font-black shrink-0">
            <Layers size={11} />
            <span>
              {cardCount}{' '}
              {t(
                'Cards',
                <>
                  <ruby>
                    枚<rt>まい</rt>
                  </ruby>
                </>
              )}
            </span>
          </span>

          <button
            onClick={() => {
              playPop();
              handleNextRound();
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 border border-slate-600 shrink-0"
            title={t('Deal new cards (N)', '新しいカードを配り直す (N)')}
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">
              {t(
                'New',
                <>
                  <ruby>
                    新<rt>あたら</rt>
                  </ruby>
                  しい
                </>
              )}
            </span>
          </button>

          <button
            onClick={() => {
              playPop();
              setIsSettingsOpen(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/50 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs shrink-0"
            title={t('Game Settings', 'ゲーム設定')}
          >
            <Settings size={14} className="text-teal-300" />
            <span className="hidden xs:inline">
              {t(
                'Settings',
                <>
                  <ruby>
                    設定<rt>せってい</rt>
                  </ruby>
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* --- MAIN THEATER STAGE --- */}
      <div className="relative bg-slate-800/95 dark:bg-slate-900 rounded-3xl p-2 sm:p-3 md:p-4 border-2 border-slate-700 shadow-2xl flex flex-col items-center justify-between flex-1 min-h-0 overflow-hidden w-full">
        {/* Curtains Animation Component */}
        <CurtainAnimation phase={phase} />

        {/* Card Grid Tray */}
        <div className="w-full flex-1 flex items-center justify-center min-h-0 relative z-10 p-0.5">
          <div
            className={`grid ${gridClasses} gap-2 sm:gap-3 md:gap-4 w-full h-full items-stretch`}
          >
            {tray.map((slot, index) => (
              <MissingCardSlot
                key={slot.slotId}
                slot={slot}
                tier={displayTier}
                grade={activeGrade}
                cardIndex={index}
                cardCount={cardCount}
                teacherGhostPeek={teacherGhostPeek}
                onRevealSlot={() => {
                  if (slot.isMissing && !slot.isRevealed) {
                    revealMissingSlot(slot.slotId);
                  } else {
                    playCardAudio(slot.card);
                  }
                }}
                onPlayAudio={() => playCardAudio(slot.card)}
              />
            ))}
          </div>
        </div>

        {/* REVEALED PHASE: Classroom Response Distribution Bar Chart + Choral Repetition Spotlight */}
        {revealedCards.length > 0 && (
          <div className="w-full max-w-5xl z-20 shrink-0 mt-1 sm:mt-2 flex flex-col md:flex-row items-stretch gap-2">
            {/* Choral Repetition Banner */}
            <div className="flex-1 min-w-0">
              <ChoralRepetitionBanner
                revealedCards={revealedCards}
                onPlayAudio={playCardAudio}
              />
            </div>

            {/* Classroom Answer Distribution Bar Chart (when student votes exist or candidateChoices exist) */}
            {candidateChoices.length > 0 && (
              <div className="w-full md:w-80 bg-slate-950/90 border-2 border-slate-700 rounded-2xl p-2.5 flex flex-col justify-between text-xs shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-teal-300 flex items-center gap-1">
                    <BarChart3 size={13} />
                    <span>
                      {t(
                        'Class Vote Breakdown',
                        <>
                          クラス<ruby>回答分布<rt>かいとうぶんぷ</rt></ruby>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    {aggregatedStats.totalSubmissions} {t('votes', '票')}
                  </span>
                </div>

                <div className="space-y-1">
                  {candidateChoices.map((choice) => {
                    const count = aggregatedStats.choiceCounts[choice.id] || 0;
                    const pct =
                      aggregatedStats.totalSubmissions > 0
                        ? Math.round(
                            (count / aggregatedStats.totalSubmissions) * 100
                          )
                        : 0;
                    const isAnswer = missingWordIdsSet.has(choice.id);

                    return (
                      <div key={choice.id} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px] font-black">
                          <span
                            className={`truncate ${
                              isAnswer ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {isAnswer ? '🟢 ' : ''}
                            {choice.english}
                          </span>
                          <span className="font-mono text-[10px] text-slate-300">
                            {pct}% ({count})
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isAnswer ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- FLOATING CORNER ACTION CONTROLS --- */}
        <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-20 flex items-center gap-2">
          {phase === 'STUDY' && (
            <button
              onClick={triggerCloseCurtain}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 border-2 border-teal-300/80 cursor-pointer backdrop-blur-xs"
              title={t('Close Curtains (Space)', 'カーテンを閉める (Space)')}
            >
              <span className="text-base sm:text-lg">🙈</span>
              <span>
                {t(
                  'Close Curtains!',
                  <>
                    カーテンを
                    <ruby>
                      閉<rt>し</rt>
                    </ruby>
                    める！
                  </>
                )}
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono text-teal-100">
                Space
              </kbd>
            </button>
          )}

          {phase === 'GUESSING' && (
            <button
              onClick={() => revealMissingSlot()}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 animate-pulse border-2 border-amber-300/80 cursor-pointer backdrop-blur-xs"
              title={t('Reveal Answer (Space)', '答えをオープン (Space)')}
            >
              <span className="text-base sm:text-lg">👁️</span>
              <span>
                {missingCount === 2 && unrevealedMissingCount === 2
                  ? t(
                      'Open Card 1',
                      <>
                        1まい
                        <ruby>
                          目<rt>め</rt>
                        </ruby>
                        オープン
                      </>
                    )
                  : missingCount === 2 && unrevealedMissingCount === 1
                  ? t(
                      'Open Card 2',
                      <>
                        2まい
                        <ruby>
                          目<rt>め</rt>
                        </ruby>
                        オープン
                      </>
                    )
                  : t('Reveal Answer', <>答えをみる！</>)}
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono text-amber-100">
                Space
              </kbd>
            </button>
          )}

          {phase === 'REVEALED' && (
            <button
              onClick={handleNextRound}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 border-2 border-blue-300/80 cursor-pointer backdrop-blur-xs"
              title={t('Next Round (Space)', '次のラウンド (Space)')}
            >
              <RotateCcw size={15} />
              <span>{t('Next Round →', <>つぎへ →</>)}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono text-blue-100">
                Space
              </kbd>
            </button>
          )}
        </div>

        {/* Bottom-Left Corner Discreet Keyboard Shortcut Hint */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-20 hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-xs border border-slate-700/70 text-[11px] text-slate-400 font-medium pointer-events-none">
          <span className="text-slate-300">
            ⌨️ Space: <strong className="text-amber-300 font-mono">Next</strong>
          </span>
          <span>•</span>
          <span className="text-slate-300">
            R: <strong className="text-sky-300 font-mono">Voice</strong>
          </span>
          <span>•</span>
          <span className="text-slate-300">
            N: <strong className="text-emerald-300 font-mono">New</strong>
          </span>
        </div>
      </div>

      {/* --- CLASSROOM SCORE TRACKER (Only when scoreboardMode !== 'off') --- */}
      {scoreboardMode !== 'off' && (
        <div className="shrink-0 animate-fadeIn">
          <ScoreTracker
            mode={scoreboardMode}
            scores={scores}
            streak={streak}
            onUpdateScore={handleUpdateScore}
            onResetScores={handleResetScores}
          />
        </div>
      )}

      {/* Emergency Blackout Shutter (KeyB / period) */}
      <ClassroomBlackoutShutter
        isOpen={isBlackout}
        onToggle={() => setIsBlackout((b) => !b)}
      />

      {/* Settings Modal Applet */}
      <WhatsMissingSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        cardCount={cardCount}
        setCardCount={setCardCount}
        displayTier={displayTier}
        setDisplayTier={setDisplayTier}
        shuffleOrder={shuffleOrder}
        setShuffleOrder={setShuffleOrder}
        missingCount={missingCount}
        setMissingCount={setMissingCount}
        timerOption={timerOption}
        setTimerOption={setTimerOption}
        scoreboardMode={scoreboardMode}
        setScoreboardMode={setScoreboardMode}
        teacherGhostPeek={teacherGhostPeek}
        setTeacherGhostPeek={setTeacherGhostPeek}
        activeUnit={activeUnit}
        setActiveUnit={setActiveUnit}
        availableUnits={availableUnits}
        activeGrade={activeGrade}
        sixCardLayout={sixCardLayout}
        setSixCardLayout={setSixCardLayout}
        onNewCards={() => setupRound(roundNumber)}
      />
    </div>
  );
};
