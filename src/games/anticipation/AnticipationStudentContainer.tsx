import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, LogOut, Clock, Trophy, Flame } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime, initServerTimeSync, safeGet, safeSet } from '@/services/rtdbSafe';
import { QuizPlayer, QuizRoomState, TEAM_PRESETS } from '@/games/quiz/types';
import { SketchCanvas } from './SketchCanvas';
import { GuessingDeck } from './GuessingDeck';
import { AnticipationInstructionsModal } from './AnticipationInstructionsModal';
import {
  AnticipationResponsePayload,
  AnticipationRoomState,
  PIECE_PRESETS,
  SPIRAL_GOAL_INDEX,
  calculateRoundPoints,
  getPieceForTeamId,
} from './types';

interface AnticipationStudentContainerProps {
  room: QuizRoomState & { anticipationState?: AnticipationRoomState };
  player: QuizPlayer;
  playerId: string;
  onLeave: () => void;
}

export const AnticipationStudentContainer: React.FC<AnticipationStudentContainerProps> = ({
  room,
  player,
  playerId,
  onLeave,
}) => {
  const { t, language } = useLanguage();
  const { playWordAudio } = useAudio();

  const antState = room.anticipationState;
  const currentRound = antState?.currentRound || null;
  const isRevealed = currentRound?.phase === 'ROUND_REVEAL';

  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [solved, setSolved] = useState<boolean>(false);
  const [earnedPoints, setEarnedPoints] = useState<number | undefined>(undefined);
  const [incorrectAttempts, setIncorrectAttempts] = useState<number>(0);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);

  const submittingRef = useRef<boolean>(false);
  const lastRoundKeyRef = useRef<string>('');

  // Keep student iPad audio gentle inside classrooms (GEMINI.md §5 / StudentLobby parity)
  useEffect(() => {
    soundEffects.setQuietClassroomMode(true);
    initServerTimeSync();
    return () => {
      soundEffects.setQuietClassroomMode(false);
    };
  }, []);

  // Reset or restore answer state per round
  useEffect(() => {
    if (!currentRound) return;
    const roundKey = `${room.code}:${currentRound.roundIndex}:${currentRound.wordId}`;
    if (lastRoundKeyRef.current === roundKey) return;
    lastRoundKeyRef.current = roundKey;

    submittingRef.current = false;
    setIncorrectAttempts(0);

    const recorded = player.answers?.[currentRound.roundIndex];
    if (recorded?.isCorrect) {
      setSolved(true);
      setEarnedPoints(recorded.pointsEarned);
      return;
    }

    setSolved(false);
    setEarnedPoints(undefined);

    safeGet<AnticipationResponsePayload>(`roomResponses/${room.code}/${playerId}`)
      .then((resp) => {
        if (resp && resp.roundIndex === currentRound.roundIndex && resp.isCorrect) {
          setSolved(true);
          const refMs = currentRound.drawCompletionMs || currentRound.drawDurationMs || 11000;
          const est = calculateRoundPoints(
            resp.timeTakenMs || 5000,
            refMs,
            Math.max(1, (player.currentStreak || 0) + 1),
            false
          );
          setEarnedPoints(est);
        }
      })
      .catch(() => {});
  }, [room.code, playerId, currentRound, player.answers, player.currentStreak]);

  // Synchronized countdown timer against host roundStartTime
  useEffect(() => {
    if (!currentRound || isRevealed) return;
    const tick = () => {
      const start = currentRound.roundStartTime || getServerTime();
      setElapsedMs(Math.max(0, getServerTime() - start));
    };
    tick();
    const timer = setInterval(tick, 110);
    return () => clearInterval(timer);
  }, [currentRound, isRevealed]);

  const handleSubmitCorrect = useCallback(
    async ({
      optionId,
      guessText,
      incorrectAttempts: attempts,
    }: {
      optionId?: string;
      guessText?: string;
      incorrectAttempts: number;
    }) => {
      if (!currentRound || submittingRef.current || solved) return;
      submittingRef.current = true;

      const completionRefMs =
        currentRound.drawCompletionMs || currentRound.drawDurationMs || 11000;
      const start = currentRound.roundStartTime || getServerTime();
      const timeTakenMs = Math.max(220, Math.min(180000, getServerTime() - start));
      const estPoints = calculateRoundPoints(
        timeTakenMs,
        completionRefMs,
        (player.currentStreak || 0) + 1,
        false
      );

      setSolved(true);
      setEarnedPoints(estPoints);

      const payload: AnticipationResponsePayload = {
        roundIndex: currentRound.roundIndex,
        optionId,
        guessText,
        isCorrect: true,
        incorrectAttempts: attempts,
        timeTakenMs,
        submittedAt: getServerTime(),
      };

      try {
        await safeSet(`roomResponses/${room.code}/${playerId}`, payload);
      } catch {
        // Optimistic UI stays responsive even on temporary flicker
      }
    },
    [currentRound, solved, player.currentStreak, room.code, playerId]
  );

  const pieceId = getPieceForTeamId(player.teamId, player.attendanceNumber || 0);
  const piecePreset = PIECE_PRESETS[pieceId];
  const teamPreset = player.teamId ? TEAM_PRESETS[player.teamId] : undefined;
  const myBoardToken =
    antState?.loopMode === 'SPIRAL_BOARD'
      ? (player.teamId && antState.tokens?.[player.teamId]) || antState.tokens?.[pieceId]
      : undefined;

  if (!currentRound) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center border-3 border-amber-300 dark:border-amber-700 shadow-2xl">
          <div className="text-5xl mb-3 animate-bounce">✏️</div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {t('Get Ready for Sketching!', 'お絵かきタイムの準備中！')}
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {t('Watch the front TV and wait for the next word...', '前のテレビを見て、次のスケッチを待ってね！')}
          </p>
        </div>
      </div>
    );
  }

  const drawDurationMs = currentRound.drawDurationMs || 28000;
  const drawCompletionMs = currentRound.drawCompletionMs || 11000;
  const effectiveTimerMode = currentRound.timerMode || antState?.timerMode || 'NO_CUTOFF';
  const effectiveCanvasStyle = currentRound.canvasStyle || antState?.canvasStyle || 'NES_RETRO';
  const isTimedCutoff = effectiveTimerMode === 'GENEROUS_TIMER';
  const isSketchDone = elapsedMs >= drawCompletionMs;
  const remainingSec = isRevealed
    ? 0
    : Math.max(0, Math.ceil((drawDurationMs - elapsedMs) / 1000));

  return (
    <div className="w-full h-full max-w-6xl mx-auto flex flex-col gap-2 p-1.5 sm:p-2 text-slate-900 dark:text-white select-none overflow-hidden">
      {/* Compact Student HUD Bar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-1.5 shadow-sm flex items-center justify-between gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-0 flex-nowrap">
          <span
            className={`px-2 py-0.5 rounded-xl font-black text-xs flex items-center gap-1 shrink-0 ${piecePreset.badgeBg}`}
          >
            <span>{piecePreset.emoji}</span>
            <span className="hidden sm:inline">
              {teamPreset
                ? language === 'ja'
                  ? teamPreset.jaName
                  : teamPreset.name
                : piecePreset.nameEn}
            </span>
          </span>
          <span className="font-black text-xs sm:text-sm truncate max-w-[140px]">
            {player.nickname}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-mono font-black text-xs flex items-center gap-1 shrink-0">
            <Trophy size={12} />
            <span>{(player.score || 0).toLocaleString()}</span>
          </span>
          {(player.currentStreak || 0) > 1 && (
            <span className="px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-black text-xs flex items-center gap-0.5 shrink-0">
              <Flame size={12} />
              <span>{player.currentStreak}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs">
            {currentRound.roundIndex + 1}/{currentRound.totalRounds}
          </span>
          <span
            className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs flex items-center gap-1 whitespace-nowrap ${
              isRevealed
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : isTimedCutoff && remainingSec <= 5
                ? 'bg-rose-500 text-white animate-pulse'
                : !isTimedCutoff && isSketchDone
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Clock size={12} />
            <span>
              {isRevealed
                ? t('Reveal', '発表')
                : isTimedCutoff
                ? `${remainingSec}s`
                : isSketchDone
                ? `∞ ${t('Complete', 'かんせい')}`
                : `∞ ${t('Drawing', '描画中')}`}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setIsInstructionsOpen(true)}
            className="p-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 cursor-pointer"
            title={t('How to Play', 'あそびかた')}
          >
            <HelpCircle size={15} />
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-black text-xs flex items-center gap-1 cursor-pointer"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">{t('Leave', '退出')}</span>
          </button>
        </div>
      </div>

      {/* Landscape-First 2-Column Playing Deck */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-hidden">
        {/* Left: Compact Sketch Preview (NEVER leaks target answer props before reveal!) */}
        <div className="md:col-span-5 flex flex-col gap-2 min-h-[190px] md:min-h-0">
          <div className="flex-1 min-h-0">
            <SketchCanvas
              compact
              roundIndex={currentRound.roundIndex}
              wordId={currentRound.wordId}
              wordHintEnglish={currentRound.revealedCard?.english || currentRound.categoryKey}
              categoryKey={currentRound.categoryKey}
              categoryNameEn={currentRound.categoryNameEn}
              categoryNameJa={currentRound.categoryNameJa}
              imageUrl={currentRound.imageUrl}
              nesVector={currentRound.nesVector}
              drawStyle={currentRound.drawStyle}
              canvasStyle={effectiveCanvasStyle}
              timerMode={effectiveTimerMode}
              roundStartTime={currentRound.roundStartTime}
              drawCompletionMs={drawCompletionMs}
              drawDurationMs={drawDurationMs}
              isRevealed={isRevealed}
              revealedCard={currentRound.revealedCard}
              wordMask={currentRound.wordMask}
              englishLength={currentRound.englishLength}
              firstLetterHint={currentRound.firstLetterHint}
              secondLetterHint={currentRound.secondLetterHint}
              isFeatureDots={currentRound.isFeatureDots}
              remainingSecDisplay={isTimedCutoff ? remainingSec : null}
              onPlayAudio={isRevealed ? playWordAudio : undefined}
            />
          </div>

          {myBoardToken && (
            <div className="px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-black shrink-0">
              <span className="flex items-center gap-1.5">
                <span>{piecePreset.emoji}</span>
                <span>{t('Board Space:', 'ボード位置:')}</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {myBoardToken.spaceIndex} / {SPIRAL_GOAL_INDEX}
                </span>
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                🧩 {myBoardToken.collectedPieces?.length || 0}/4
              </span>
            </div>
          )}
        </div>

        {/* Right: Zero-Picture Guessing Deck (CUD 4-Choice or Spelling Tiles + 2.5s Lockout) */}
        <div className="md:col-span-7 min-h-0">
          <GuessingDeck
            round={currentRound}
            englishReadingAid={antState?.englishReadingAid || room.englishReadingAid || 'WITH_KATAKANA'}
            solved={solved}
            isRevealed={isRevealed}
            incorrectAttempts={incorrectAttempts}
            pointsEarned={earnedPoints}
            elapsedMs={elapsedMs}
            onSubmitCorrect={handleSubmitCorrect}
            onWrongAttempt={(next) => setIncorrectAttempts(next)}
          />
        </div>
      </div>

      <AnticipationInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />
    </div>
  );
};
