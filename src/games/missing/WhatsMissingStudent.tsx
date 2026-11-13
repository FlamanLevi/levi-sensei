import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { RubyText } from '@/components/common/RubyText';
import {
  MissingCandidateChoice,
  GamePhase,
} from './types';
import { useWhatsMissingRoom } from './useWhatsMissingRoom';
import {
  Wifi,
  WifiOff,
  Lock,
  CheckCircle2,
  XCircle,
  Volume2,
  Zap,
  Trophy,
  Sparkles,
  User,
} from 'lucide-react';

interface WhatsMissingStudentProps {
  initialRoomCode?: string;
  initialSeat?: number;
  initialNickname?: string;
  onExit?: () => void;
}

export const WhatsMissingStudent: React.FC<WhatsMissingStudentProps> = ({
  initialRoomCode = '',
  initialSeat = 7,
  initialNickname = 'Ken',
  onExit,
}) => {
  const { t } = useLanguage();
  const { playWordAudio, playPop } = useAudio();

  const [seat, setSeat] = useState<number>(initialSeat);
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [roomInput, setRoomInput] = useState<string>(initialRoomCode);
  const [xpEarned, setXpEarned] = useState<number>(0);

  const {
    roomCode,
    roomState,
    answersMap,
    isConnected,
    joinRoom,
    submitAnswer,
  } = useWhatsMissingRoom({
    roomCode: initialRoomCode,
    isHost: false,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [localReactionMs, setLocalReactionMs] = useState<number | null>(null);
  const guessingStartPerfRef = useRef<number | null>(null);

  const phase: GamePhase = roomState?.phase || 'STUDY';
  const missingCount = roomState?.missingCount || 1;
  const choices: MissingCandidateChoice[] = roomState?.candidateChoices || [];
  const missingWordIds = roomState?.missingWordIds || [];
  const isRevealed = Boolean(roomState?.isRevealed || phase === 'REVEALED');

  // Reset selections when round or phase returns to STUDY / CURTAIN_CLOSED
  useEffect(() => {
    if (
      phase === 'STUDY' ||
      phase === 'CURTAIN_CLOSING' ||
      phase === 'CURTAIN_CLOSED'
    ) {
      setSelectedIds([]);
      setIsSubmitted(false);
      setLocalReactionMs(null);
      guessingStartPerfRef.current = null;
    } else if (phase === 'GUESSING' && guessingStartPerfRef.current === null) {
      guessingStartPerfRef.current = performance.now();
      soundEffects.playChime();
    }
  }, [phase, roomState?.roundNumber]);

  // Trigger celebratory feedback on reveal
  const mySubmission = answersMap[String(seat)];
  const isMyAnswerCorrect = useMemo(() => {
    if (!selectedIds.length || !missingWordIds.length) return false;
    const missingSet = new Set(missingWordIds);
    return (
      selectedIds.length === missingWordIds.length &&
      selectedIds.every((id) => missingSet.has(id))
    );
  }, [selectedIds, missingWordIds]);

  useEffect(() => {
    if (isRevealed && isSubmitted) {
      if (isMyAnswerCorrect) {
        soundEffects.playFanfare();
        setXpEarned((prev) => prev + 10);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        soundEffects.playTick();
      }
    }
  }, [isRevealed, isSubmitted, isMyAnswerCorrect]);

  // Compute personal speed rank among class
  const myRank = useMemo(() => {
    if (!mySubmission || !mySubmission.isCorrect) return null;
    const correctEntries = Object.values(answersMap)
      .filter((a) => a.isCorrect)
      .sort((a, b) => a.responseTimeMs - b.responseTimeMs);
    const idx = correctEntries.findIndex((a) => a.seat === seat);
    return idx >= 0 ? idx + 1 : null;
  }, [answersMap, mySubmission, seat]);

  // Handle tactile choice tap
  const handleSelectChoice = async (choice: MissingCandidateChoice) => {
    if (phase !== 'GUESSING' || isSubmitted) return;

    soundEffects.playCardFlip();
    const tapPerf = performance.now();
    const startPerf = guessingStartPerfRef.current ?? tapPerf - 900;
    const elapsedMs = Math.max(120, Math.round(tapPerf - startPerf));

    if (missingCount === 1) {
      const nextSelected = [choice.id];
      setSelectedIds(nextSelected);
      setIsSubmitted(true);
      setLocalReactionMs(elapsedMs);
      await submitAnswer(seat, nickname, nextSelected, elapsedMs);
    } else {
      // Double Trouble (2 cards missing)
      let nextSelected: string[];
      if (selectedIds.includes(choice.id)) {
        nextSelected = selectedIds.filter((id) => id !== choice.id);
      } else {
        nextSelected = [...selectedIds, choice.id].slice(0, 2);
      }
      setSelectedIds(nextSelected);

      if (nextSelected.length === 2) {
        setIsSubmitted(true);
        setLocalReactionMs(elapsedMs);
        await submitAnswer(seat, nickname, nextSelected, elapsedMs);
      }
    }
  };

  const correctChoices = useMemo(() => {
    const missingSet = new Set(missingWordIds);
    return choices.filter((c) => missingSet.has(c.id));
  }, [choices, missingWordIds]);

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between bg-slate-950 text-white p-3 sm:p-4 select-none overflow-hidden font-['UD_Digi_Kyokasho_NP-R','UD_Digi_Kyokasho_NK-R','BIZ_UDPGothic','Zen_Maru_Gothic',sans-serif]">
      {/* ====================================================================
          1. TOP HEADER BAR: SEAT PROFILE, ROOM PIN & XP BADGE
         ==================================================================== */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl px-3.5 py-2 flex flex-nowrap items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
        {/* Left: Student Seat & Name */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
            <User size={14} className="text-teal-400" />
            <select
              value={seat}
              onChange={(e) => setSeat(Number(e.target.value))}
              className="bg-slate-950 text-white font-black text-xs px-2 py-0.5 rounded-lg border border-slate-700 cursor-pointer"
            >
              {Array.from({ length: 35 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Seat #{n}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-20 bg-slate-950 text-teal-300 font-black text-xs px-2 py-0.5 rounded-lg border border-slate-700"
              placeholder="Name"
            />
          </div>

          {/* Room Code Input */}
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              placeholder="WM-123"
              className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs font-mono font-black text-amber-300 uppercase"
            />
            <button
              onClick={() => {
                playPop();
                joinRoom(roomInput);
              }}
              className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer active:scale-95 transition shrink-0"
            >
              {isConnected ? (
                <>
                  <Wifi size={12} className="text-emerald-200" />
                  <span>{t('Synced', '接続中')}</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-amber-200" />
                  <span>{t('Join', '参加')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: XP Earned & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center gap-1">
            <Sparkles size={13} />
            <span>+{xpEarned} XP</span>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              {t('Back to TV', 'TV画面へ')}
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          2. MAIN INTERACTIVE STUDENT STAGE
         ==================================================================== */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center my-2 overflow-hidden">
        {/* PHASE 1: STUDY (Look at the TV!) */}
        {phase === 'STUDY' && (
          <div className="w-full h-full rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/80 border-4 border-teal-500/50 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-7xl sm:text-8xl animate-bounce">👀</div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {t(
                'Look at the Front TV!',
                <>
                  <ruby>
                    前<rt>まえ</rt>
                  </ruby>
                  のテレビを
                  <ruby>
                    見<rt>み</rt>
                  </ruby>
                  よう！
                </>
              )}
            </h2>
            <p className="text-lg sm:text-2xl font-bold text-teal-300">
              {t(
                'Memorize all the cards before the curtains close!',
                <>
                  カーテンが
                  <ruby>
                    閉<rt>し</rt>
                  </ruby>
                  まるまえにカードを
                  <ruby>
                    覚<rt>おぼ</rt>
                  </ruby>
                  えてね！
                </>
              )}
            </p>
          </div>
        )}

        {/* PHASE 2: CURTAINS CLOSED (Close your eyes!) */}
        {(phase === 'CURTAIN_CLOSING' ||
          phase === 'CURTAIN_CLOSED' ||
          phase === 'CURTAIN_OPENING') && (
          <div className="w-full h-full rounded-3xl bg-gradient-to-b from-rose-950 to-slate-950 border-4 border-amber-400 p-6 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
            <div className="text-7xl sm:text-8xl animate-bounce">🙈</div>
            <h2 className="text-3xl sm:text-5xl font-black text-amber-300">
              {t(
                'Close your eyes! No peeking!',
                <>
                  <ruby>
                    目<rt>め</rt>
                  </ruby>
                  をつむって！まだ
                  <ruby>
                    見<rt>み</rt>
                  </ruby>
                  ちゃダメ！
                </>
              )}
            </h2>
            <p className="text-base sm:text-xl font-bold text-amber-100">
              {t(
                'Get ready to tap the missing card...',
                <>
                  なにが
                  <ruby>
                    消<rt>き</rt>
                  </ruby>
                  えるかな？ じゅんびしてね…
                </>
              )}
            </p>
          </div>
        )}

        {/* PHASE 3: GUESSING (4-Choice Blitz or Locked Holding State) */}
        {phase === 'GUESSING' && !isRevealed && (
          <div className="w-full h-full flex flex-col justify-between min-h-0">
            {isSubmitted ? (
              /* Locked-In Holding Screen */
              <div className="w-full h-full rounded-3xl bg-gradient-to-b from-indigo-950 to-slate-900 border-4 border-indigo-400 p-6 flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/30 border-2 border-indigo-300 flex items-center justify-center text-indigo-200 animate-bounce">
                  <Lock size={44} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  {t(
                    'ANSWER LOCKED IN! 🔒',
                    <>
                      <ruby>
                        回答<rt>かいとう</rt>
                      </ruby>
                      ロック
                      <ruby>
                        完了<rt>かんりょう</rt>
                      </ruby>
                      ！ 🔒
                    </>
                  )}
                </h2>
                {localReactionMs && (
                  <div className="px-4 py-1.5 rounded-full bg-black/40 border border-amber-400/50 text-amber-300 font-mono font-black text-sm sm:text-base flex items-center gap-2">
                    <Zap size={16} />
                    <span>
                      {t(
                        `Your Speed: ${(localReactionMs / 1000).toFixed(2)}s`,
                        `スピード: ${(localReactionMs / 1000).toFixed(2)}秒`
                      )}
                    </span>
                  </div>
                )}
                <p className="text-sm sm:text-lg font-bold text-indigo-200">
                  {t(
                    'Waiting for the big reveal on the Front TV...',
                    <>
                      テレビのオープンを
                      <ruby>
                        待<rt>ま</rt>
                      </ruby>
                      ってね…
                    </>
                  )}
                </p>
              </div>
            ) : (
              /* 4-Choice Blitz Touch Grid */
              <>
                <div className="text-center mb-2 shrink-0">
                  <h2 className="text-xl sm:text-2xl font-black text-amber-300">
                    ❓{' '}
                    {missingCount === 2
                      ? t(
                          'TAP THE 2 MISSING CARDS!',
                          <>
                            <ruby>
                              消<rt>き</rt>
                            </ruby>
                            えたカードを2
                            <ruby>
                              枚<rt>まい</rt>
                            </ruby>
                            タップしよう！ ({selectedIds.length}/2)
                          </>
                        )
                      : t(
                          'WHICH CARD IS MISSING? TAP NOW!',
                          <>
                            どのカードが
                            <ruby>
                              消<rt>き</rt>
                            </ruby>
                            えた？ タップしよう！
                          </>
                        )}
                  </h2>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 sm:gap-4">
                  {choices.map((choice) => {
                    const isPicked = selectedIds.includes(choice.id);
                    return (
                      <div
                        key={choice.id}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleSelectChoice(choice);
                        }}
                        style={{ touchAction: 'none' }}
                        className={`rounded-3xl border-4 p-3 sm:p-4 flex flex-col items-center justify-between cursor-pointer transition-all active:scale-95 select-none overflow-hidden ${
                          isPicked
                            ? 'bg-amber-500 text-slate-950 border-white ring-4 ring-amber-300 shadow-2xl'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 hover:border-amber-400 shadow-lg'
                        }`}
                      >
                        <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1">
                          {choice.imageUrl ? (
                            <img
                              src={choice.imageUrl}
                              alt={choice.english}
                              className="max-h-full max-w-full object-contain drop-shadow-md"
                            />
                          ) : (
                            <span className="text-4xl">🎨</span>
                          )}
                        </div>
                        <div className="w-full text-center pt-1.5 border-t border-slate-200 dark:border-slate-700 shrink-0">
                          <span className="text-lg sm:text-2xl font-black block truncate">
                            {choice.english}
                          </span>
                          <span className="text-xs font-bold opacity-80 block truncate">
                            {choice.ja}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* PHASE 4: REVEALED (Celebratory Feedback & Audio Replay) */}
        {isRevealed && (
          <div
            className={`w-full h-full rounded-3xl border-4 p-5 flex flex-col items-center justify-between text-center animate-fadeIn ${
              isMyAnswerCorrect
                ? 'bg-gradient-to-b from-emerald-600 via-teal-700 to-slate-900 border-emerald-300'
                : 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-400'
            }`}
          >
            {/* Top Outcome Header */}
            <div className="space-y-1">
              {isMyAnswerCorrect ? (
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-emerald-400 text-slate-950 font-black text-lg sm:text-2xl shadow-lg animate-bounce">
                  <CheckCircle2 size={24} />
                  <span>
                    {t(
                      'CORRECT! +10 XP!',
                      <>
                        大<ruby>正解<rt>せいかい</rt></ruby>！ +10 XP!
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-base sm:text-xl shadow">
                  <XCircle size={22} />
                  <span>
                    {t(
                      'Nice try! Say the answer aloud!',
                      <>おしい！ いっしょに声に出して言ってみよう！</>
                    )}
                  </span>
                </div>
              )}

              {myRank && (
                <div className="text-xs sm:text-sm font-black text-yellow-300 flex items-center justify-center gap-1.5 pt-1">
                  <Trophy size={15} />
                  <span>
                    {t(
                      `Rank #${myRank} in Class! (${((localReactionMs || 1000) / 1000).toFixed(2)}s)`,
                      `クラス ${myRank}位！ (${((localReactionMs || 1000) / 1000).toFixed(2)}秒)`
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Revealed Correct Card(s) with Audio Replay */}
            <div className="flex-1 min-h-0 flex items-center justify-center gap-4 my-2 overflow-hidden">
              {correctChoices.map((card) => (
                <div
                  key={card.id}
                  onClick={() => playWordAudio(card.soundFile, card.english)}
                  className="h-full max-h-[240px] bg-white text-slate-900 rounded-3xl p-4 border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-between cursor-pointer active:scale-95 transition"
                >
                  {card.imageUrl && (
                    <img
                      src={card.imageUrl}
                      alt={card.english}
                      className="max-h-[120px] object-contain"
                    />
                  )}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl sm:text-3xl font-black">
                        {card.english}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center">
                        <Volume2 size={16} />
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-600 mt-0.5">
                      <RubyText
                        ruby={card.ruby}
                        kanji={card.jaKanji}
                        hiragana={card.jaHiragana || card.ja}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs sm:text-sm font-black text-amber-200">
              🗣️{' '}
              {t(
                'Tap the card to hear & repeat the word!',
                'カードをタップして発音を聞いてリピートしよう！'
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
