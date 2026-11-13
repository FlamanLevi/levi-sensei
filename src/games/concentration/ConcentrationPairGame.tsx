import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { VocabularyItem } from '@data/types';
import { RubyText } from '@/components/common/RubyText';
import {
  MatchMode,
  DisplayTier,
  CardLabelMode,
  GridSize,
  PlayerTurn,
  MemoryCard,
  CONCENTRATION_TEAMS,
} from './types';
import { createConcentrationDeck } from './utils';
import { MemoryCard3D } from './MemoryCard3D';
import { SneakPeekOverlay } from './SneakPeekOverlay';
import { useConcentrationTournament } from './useConcentrationTournament';
import {
  RotateCcw,
  Eye,
  Mic,
  Trophy,
  Flame,
  Volume2,
  ThumbsUp,
  Users,
  Wifi,
  WifiOff,
  Tv,
  Sparkles,
} from 'lucide-react';

interface ConcentrationPairGameProps {
  initialRoomCode?: string;
  initialDeskNumber?: number;
  onOpenSpectatorTV?: (roomCode: string) => void;
  onExit?: () => void;
}

export const ConcentrationPairGame: React.FC<ConcentrationPairGameProps> = ({
  initialRoomCode = '',
  initialDeskNumber = 1,
  onOpenSpectatorTV,
  onExit,
}) => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade, activeUnit } = useClassroom();
  const { playWordAudio, playPop } = useAudio();
  const { t } = useLanguage();

  const isYoungerGrade =
    activeGrade.startsWith('KD') ||
    activeGrade === 'ES_G1' ||
    activeGrade === 'ES_G2' ||
    activeGrade === 'ES_G3';

  // --- Pair & Desk Binding ---
  const [deskNumber, setDeskNumber] = useState<number>(initialDeskNumber);
  const [roomInput, setRoomInput] = useState<string>(initialRoomCode);
  const seatP1 = (deskNumber - 1) * 2 + 1;
  const seatP2 = Math.min(35, seatP1 + 1);

  // --- Game Settings ---
  const [matchMode, setMatchMode] = useState<MatchMode>(
    isYoungerGrade ? 'same_pair' : 'pic_word'
  );
  const [displayTier, setDisplayTier] = useState<DisplayTier>(
    isYoungerGrade ? 'picture_only' : 'picture_word'
  );
  const [pairCount, setPairCount] = useState<GridSize>(isYoungerGrade ? 4 : 6);
  const [labelMode, setLabelMode] = useState<CardLabelMode>('number');
  const [speakingCheck, setSpeakingCheck] = useState<boolean>(true);

  // --- Tabletop 2-Player State (Red Player 1 vs Blue Player 2) ---
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [mismatchedIndices, setMismatchedIndices] = useState<number[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn>('P1');
  const [scoreP1, setScoreP1] = useState<number>(0);
  const [scoreP2, setScoreP2] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [rematchCount, setRematchCount] = useState<number>(0);
  const [peekCountdown, setPeekCountdown] = useState<number | null>(null);

  // Peer Oral Speaking Check State (Opponent Referee Confirmation)
  const [pendingMatchIndices, setPendingMatchIndices] = useState<number[] | null>(
    null
  );
  const [pendingMatchCard, setPendingMatchCard] = useState<VocabularyItem | null>(
    null
  );

  // RTDB Tournament Sync (with full offline standalone fallback)
  const {
    roomCode,
    setRoomCode,
    isConnected,
    reportPairProgress,
  } = useConcentrationTournament({
    roomCode: initialRoomCode,
    grade: activeGrade,
    unit: activeUnit,
    matchMode,
    pairCount,
  });

  const flipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const peekTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playCardAudio = useCallback(
    (card: VocabularyItem) => {
      playWordAudio(card.sound_file || card.primary_audio, card.english);
    },
    [playWordAudio]
  );

  // Target speaking scaffold calibrated by grade (G1-G3 word vs G4-G6 target phrase)
  const getTargetSpeakingPrompt = (word: VocabularyItem) => {
    if (isYoungerGrade) {
      return `"${word.english}!"`;
    }
    return `"It's ${word.english}!" / "I like ${word.english}!"`;
  };

  // 1. Setup / Deal New Deck
  const setupPairDeck = useCallback(
    (isRematch = false) => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (peekTimerRef.current) clearInterval(peekTimerRef.current);

      setFlippedIndices([]);
      setMismatchedIndices([]);
      setPendingMatchIndices(null);
      setPendingMatchCard(null);
      setPeekCountdown(null);
      setCurrentTurn('P1');
      setScoreP1(0);
      setScoreP2(0);
      setStreak(0);

      const nextRematch = isRematch ? rematchCount + 1 : rematchCount;
      if (isRematch) {
        setRematchCount(nextRematch);
      }

      const primaryPool =
        scopedWords.length > 0
          ? scopedWords
          : filteredWords.length > 0
          ? filteredWords
          : gradeWords.length > 0
          ? gradeWords
          : allWords;
      const fallbackPool = gradeWords.length > 0 ? gradeWords : allWords;

      const newDeck = createConcentrationDeck(
        primaryPool,
        fallbackPool,
        pairCount,
        matchMode,
        displayTier
      );
      setDeck(newDeck);

      reportPairProgress(deskNumber, {
        scoreA: 0,
        scoreB: 0,
        pairsCompleted: 0,
        totalPairs: pairCount,
        isFinished: false,
        currentTurn: 'A',
        rematchCount: nextRematch,
      });
    },
    [
      rematchCount,
      scopedWords,
      filteredWords,
      gradeWords,
      allWords,
      pairCount,
      matchMode,
      displayTier,
      deskNumber,
      reportPairProgress,
    ]
  );

  useEffect(() => {
    setupPairDeck(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairCount, matchMode, displayTier]);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (peekTimerRef.current) clearInterval(peekTimerRef.current);
    };
  }, []);

  // 2. Sneak Peek
  const cancelSneakPeek = useCallback(() => {
    if (peekTimerRef.current) {
      clearInterval(peekTimerRef.current);
      peekTimerRef.current = null;
    }
    setPeekCountdown(null);
  }, []);

  const startSneakPeek = (seconds: number) => {
    if (peekCountdown !== null) return;
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);

    setFlippedIndices([]);
    setMismatchedIndices([]);
    setPendingMatchIndices(null);
    setPendingMatchCard(null);
    soundEffects.playChime();
    setPeekCountdown(seconds);

    let remaining = seconds;
    if (peekTimerRef.current) clearInterval(peekTimerRef.current);

    peekTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setPeekCountdown(remaining);
        soundEffects.playTick();
      } else {
        clearInterval(peekTimerRef.current!);
        peekTimerRef.current = null;
        setPeekCountdown(null);
        soundEffects.playChime();
      }
    }, 1000);
  };

  // 3. Finalize Matched Pair (Either immediately or after Partner Oral Speaking Confirmation)
  const finalizeMatchedPair = useCallback(
    (matchedPairIndices: number[], matchedWord: VocabularyItem) => {
      soundEffects.playCorrect();
      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.6 },
      });

      const teamIdx = currentTurn === 'P1' ? 0 : 1; // 0 = Red P1, 1 = Blue P2
      const nextScoreP1 = currentTurn === 'P1' ? scoreP1 + 1 : scoreP1;
      const nextScoreP2 = currentTurn === 'P2' ? scoreP2 + 1 : scoreP2;
      const nextPairsCompleted = nextScoreP1 + nextScoreP2;
      const isNowFinished = nextPairsCompleted >= pairCount;

      setDeck((prev) =>
        prev.map((c, i) =>
          matchedPairIndices.includes(i)
            ? { ...c, isMatched: true, matchedByTeam: teamIdx }
            : c
        )
      );

      setScoreP1(nextScoreP1);
      setScoreP2(nextScoreP2);
      setStreak((s) => s + 1);
      setFlippedIndices([]);
      setPendingMatchIndices(null);
      setPendingMatchCard(null);

      // Report to RTDB Tournament Board

      // Report to RTDB Tournament Board
      reportPairProgress(deskNumber, {
        scoreA: nextScoreP1,
        scoreB: nextScoreP2,
        pairsCompleted: nextPairsCompleted,
        totalPairs: pairCount,
        isFinished: isNowFinished,
        currentTurn: currentTurn === 'P1' ? 'A' : 'B',
        rematchCount,
      });

      if (isNowFinished) {
        soundEffects.playFanfare();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
      }
    },
    [
      currentTurn,
      scoreP1,
      scoreP2,
      pairCount,
      reportPairProgress,
      deskNumber,
      rematchCount,
    ]
  );

  // 4. Card Click Handler
  const handleCardClick = (clickedIndex: number) => {
    const card = deck[clickedIndex];
    if (
      !card ||
      card.isMatched ||
      card.isFlipped ||
      flippedIndices.includes(clickedIndex) ||
      flippedIndices.length >= 2 ||
      pendingMatchIndices !== null ||
      peekCountdown !== null
    ) {
      return;
    }

    soundEffects.playCardFlip();
    playCardAudio(card.card);

    const nextFlipped = [...flippedIndices, clickedIndex];
    setFlippedIndices(nextFlipped);

    // If 2 cards are now face up, check for match
    if (nextFlipped.length === 2) {
      const [firstIdx, secondIdx] = nextFlipped;
      const firstCard = deck[firstIdx];
      const secondCard = card;

      const isMatch = firstCard.pairId === secondCard.pairId;

      if (isMatch) {
        if (speakingCheck) {
          // Oral speaking check: pause and require partner confirmation
          setPendingMatchIndices([firstIdx, secondIdx]);
          setPendingMatchCard(firstCard.card);
          soundEffects.playChime();
        } else {
          // Instant match without partner confirmation
          finalizeMatchedPair([firstIdx, secondIdx], firstCard.card);
        }
      } else {
        // Mismatch: shake and flip back after 1.2s
        setMismatchedIndices([firstIdx, secondIdx]);
        soundEffects.playIncorrect();

        flipTimerRef.current = setTimeout(() => {
          setFlippedIndices([]);
          setMismatchedIndices([]);
          setStreak(0);
          setCurrentTurn((prev) => (prev === 'P1' ? 'P2' : 'P1'));
          soundEffects.playCardFlip();

          reportPairProgress(deskNumber, {
            scoreA: scoreP1,
            scoreB: scoreP2,
            pairsCompleted: scoreP1 + scoreP2,
            totalPairs: pairCount,
            isFinished: false,
            currentTurn: currentTurn === 'P1' ? 'B' : 'A',
            rematchCount,
          });
        }, 1200);
      }
    }
  };

  const isGameComplete = scoreP1 + scoreP2 >= pairCount;
  const isP1Turn = currentTurn === 'P1';

  // Grid styling based on pairCount
  const gridClass =
    pairCount === 3
      ? 'grid-cols-3 grid-rows-2'
      : pairCount === 4
      ? 'grid-cols-4 grid-rows-2'
      : pairCount === 6
      ? 'grid-cols-4 grid-rows-3'
      : 'grid-cols-4 grid-rows-4';

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between bg-slate-950 text-white select-none overflow-hidden p-2 sm:p-3 font-['UD_Digi_Kyokasho_NP-R','UD_Digi_Kyokasho_NK-R','BIZ_UDPGothic','Zen_Maru_Gothic',sans-serif]">
      {/* Sneak Peek Overlay */}
      {peekCountdown !== null && (
        <SneakPeekOverlay countdown={peekCountdown} onCancel={cancelSneakPeek} />
      )}

      {/* ====================================================================
          1. TOP STATUS BAR: BLUE PLAYER (P2), DESK SELECTOR & ROOM SYNC
         ==================================================================== */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl px-3 py-1.5 flex flex-nowrap items-center justify-between gap-2 shrink-0 z-20 overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Left: Desk Selector & Wi-Fi Sync */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded-xl border border-slate-700 shrink-0">
            <Users size={13} className="text-amber-400 shrink-0" />
            <select
              value={deskNumber}
              onChange={(e) => setDeskNumber(Number(e.target.value))}
              className="bg-slate-950 text-white font-black text-xs px-2 py-0.5 rounded-lg border border-slate-700 cursor-pointer shrink-0"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Desk #{d} (Seats {(d - 1) * 2 + 1} & {Math.min(35, (d - 1) * 2 + 2)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="MM-123"
              className="w-18 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-mono font-black text-amber-300 uppercase shrink-0"
            />
            <button
              onClick={() => {
                playPop();
                if (roomInput.trim()) setRoomCode(roomInput.trim());
              }}
              className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer shrink-0"
            >
              {isConnected ? (
                <Wifi size={11} className="text-emerald-300" />
              ) : (
                <WifiOff size={11} className="text-amber-300" />
              )}
            </button>
          </div>
        </div>

        {/* Center: Blue Player (P2) Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-xl border-2 transition-all shrink-0 ${
            !isP1Turn && !isGameComplete
              ? 'bg-sky-600 border-sky-300 ring-2 ring-sky-300 shadow-lg animate-pulse'
              : 'bg-slate-900 border-sky-600/40 opacity-70'
          }`}
        >
          <span className="text-base">🔵</span>
          <span className="text-xs font-black text-white">
            P2 (Seat #{seatP2})
          </span>
          <span className="text-sm font-mono font-black bg-black/30 px-2 py-0.5 rounded-md text-sky-200">
            {scoreP2} {t('Pairs', 'ペア')}
          </span>
        </div>

        {/* Right: Sneak Peek & TV Spectator Switch */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => startSneakPeek(3)}
            disabled={peekCountdown !== null || isGameComplete}
            className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1 cursor-pointer transition active:scale-95 disabled:opacity-40 shrink-0"
            title={t('Peek at cards for 3s', '3秒チラ見せ')}
          >
            <Eye size={13} />
            <span className="hidden sm:inline">{t('Peek', 'チラ見')}</span>
          </button>

          {onOpenSpectatorTV && (
            <button
              onClick={() => onOpenSpectatorTV(roomCode)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              title={t('Open Tournament Board on Front TV', 'TV観戦画面')}
            >
              <Tv size={13} />
              <span className="hidden md:inline">{t('TV Board', 'TV画面')}</span>
            </button>
          )}

          {onExit && (
            <button
              onClick={onExit}
              className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer shrink-0"
            >
              {t('Exit', '終了')}
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          2. MAIN TABLETOP 3D CARD GRID
         ==================================================================== */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 relative my-1">
        {/* Game Completed Celebration Overlay */}
        {isGameComplete && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-xs rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 animate-scaleUp">
            <Trophy size={64} className="text-yellow-400 animate-bounce" />
            <h2 className="text-3xl sm:text-5xl font-black text-white">
              {scoreP1 > scoreP2
                ? t('RED WINS!', <>🔴 赤組の<ruby>勝<rt>か</rt></ruby>ち！</>)
                : scoreP2 > scoreP1
                ? t('BLUE WINS!', <>🔵 青組の<ruby>勝<rt>か</rt></ruby>ち！</>)
                : t('IT\'S A TIE! GREAT JOB!', <>ひきわけ！ ナイスゲーム！</>)}
            </h2>
            <p className="text-base sm:text-lg font-bold text-amber-300">
              {t(`Final Score: 🔴 ${scoreP1} - 🔵 ${scoreP2}`, `最終スコア: 🔴 ${scoreP1} - 🔵 ${scoreP2}`)}
            </p>
            <button
              onClick={() => setupPairDeck(true)}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg sm:text-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={20} />
              <span>{t('Rematch (Deal Fresh Deck)', <><ruby>再戦<rt>さいせん</rt></ruby>（新しいカード）</>)}</span>
            </button>
          </div>
        )}

        {/* 3D Card Grid */}
        <div className={`grid ${gridClass} gap-2 sm:gap-3 w-full h-full max-w-4xl max-h-full items-stretch justify-items-stretch`}>
          {deck.map((card, idx) => {
            const isFlipped =
              flippedIndices.includes(idx) ||
              peekCountdown !== null ||
              (pendingMatchIndices !== null && pendingMatchIndices.includes(idx));
            const isMismatched = mismatchedIndices.includes(idx);
            const winningTeam =
              card.matchedByTeam === 0
                ? CONCENTRATION_TEAMS[0] // Red P1
                : card.matchedByTeam === 1
                ? CONCENTRATION_TEAMS[1] // Blue P2
                : null;

            return (
              <MemoryCard3D
                key={card.instanceId}
                card={card}
                index={idx}
                labelMode={labelMode}
                grade={activeGrade}
                isFlipped={isFlipped}
                isAwaitingSpeech={pendingMatchIndices !== null}
                isLocked={isGameComplete || flippedIndices.length >= 2}
                isMismatched={isMismatched}
                winningTeam={winningTeam}
                onClick={() => handleCardClick(idx)}
                onPlayAudio={() => playCardAudio(card.card)}
              />
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          3. BOTTOM PEER SPEAKING CHECK & RED PLAYER (P1) BAR
         ==================================================================== */}
      <div className="shrink-0 space-y-1.5 z-20">
        {/* Oral Speaking Check Confirmation Sheet */}
        {pendingMatchCard && pendingMatchIndices && (
          <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-2.5 sm:p-3 text-slate-950 flex flex-nowrap items-center justify-between gap-2 shadow-xl border-2 border-yellow-300 animate-fadeIn overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl animate-bounce shrink-0">🗣️</span>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider block text-slate-900 truncate">
                  {t(
                    `${isP1Turn ? 'RED' : 'BLUE'}: Speak to your partner!`,
                    `${isP1Turn ? '赤組' : '青組'}: ペアの友達に言ってみよう！`
                  )}
                </span>
                <span className="text-base sm:text-lg font-black text-white drop-shadow-sm truncate block">
                  {getTargetSpeakingPrompt(pendingMatchCard)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <button
                onClick={() => playCardAudio(pendingMatchCard)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition active:scale-95 cursor-pointer shrink-0"
                title={t('Listen to audio', '発音を聞く')}
              >
                <Volume2 size={16} />
              </button>
              <button
                onClick={() => finalizeMatchedPair(pendingMatchIndices, pendingMatchCard)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-yellow-300 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg border border-yellow-300 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <ThumbsUp size={15} />
                <span>{t('Partner Said It! 👍', '言えた！確認 👍')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Bar: Red Player (P1) Badge & Deck Rematch */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl px-3 py-1.5 flex flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          {/* Red Player (P1) Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-xl border-2 transition-all shrink-0 ${
              isP1Turn && !isGameComplete
                ? 'bg-rose-600 border-rose-300 ring-2 ring-rose-300 shadow-lg animate-pulse'
                : 'bg-slate-900 border-rose-600/40 opacity-70'
            }`}
          >
            <span className="text-base">🔴</span>
            <span className="text-xs font-black text-white">
              P1 (Seat #{seatP1})
            </span>
            <span className="text-sm font-mono font-black bg-black/30 px-2 py-0.5 rounded-md text-rose-200">
              {scoreP1} {t('Pairs', 'ペア')}
            </span>
          </div>

          {/* Turn Prompt Banner */}
          <div className="text-xs font-black text-slate-300 text-center min-w-0 truncate flex-1">
            {!isGameComplete ? (
              <span>
                {isP1Turn
                  ? t('🔴 Player 1\'s turn! Tap 2 cards.', '🔴 赤組の番！カードを2枚めくろう')
                  : t('🔵 Player 2\'s turn! Tap 2 cards.', '🔵 青組の番！カードを2枚めくろう')}
              </span>
            ) : (
              <span className="text-emerald-400">
                🎉 {t('All pairs matched! Great team work!', '全ペア成立！よくできました！')}
              </span>
            )}
          </div>

          {/* Quick Rematch / Reset */}
          <button
            onClick={() => setupPairDeck(true)}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-black flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <RotateCcw size={13} />
            <span>{t('New Deck', 'カード配り直し')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};