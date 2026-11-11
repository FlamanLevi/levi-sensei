import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { QuizQuestion, QuizPlayer, VolleyballSettings } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { safeUpdate, getServerTime } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { Clock, Users, Flame, Volume2, VolumeX, Eye, EyeOff, Music } from 'lucide-react';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import confetti from 'canvas-confetti';
import { Volleyball3DStage, VolleyballPhaseChangeEvent, VolleyballAnswerEvent } from './Volleyball3DStage';

// ============================================================================
// [ANTIGRAVITY REFACTOR: QuizHostVolleyball.tsx -> Undokai Bean Bag Toss (玉入れ)]
// ============================================================================
// WHAT CHANGED:
// 1. Replaced the Volleyball Rally host broadcast HUD with the authentic
//    Japanese Elementary School Sports Day (Undōkai) **Bean Bag Toss
//    (Tamaire / 玉入れ合戦)** broadcast controller.
// 2. Added a teacher toggle for **Mystery Basket Count (`??? 個` during play)**
//    so students cannot tell which team is winning until the post-whistle
//    Dramatic Counting Ceremony ("ひとーつ、ふたーつ、みっつ...").
// 3. Tracks `correctCount` deltas across all 40 student iPads in `players`
//    (supporting both +1 standard bean bag throws and +2 Golden 3-Streak
//    double-bag throws) and dispatches parabolic throw events to `Volleyball3DStage`.
// 4. Retains the 8 Hz (125ms) coalescing RTDB throttle on `volleyballLiveState`
//    per GEMINI.md §5.
// ============================================================================

interface QuizHostVolleyballProps {
  roomCode: string;
  questions: QuizQuestion[];
  players: Record<string, QuizPlayer>;
  raceStartTime: number;
  volleyballSettings?: VolleyballSettings;
  eyesUp?: boolean;
  onToggleEyesUp?: () => void;
  onFreezeVolleyball?: () => void;
  onFinishVolleyball: (winner: 'team_red' | 'team_white' | 'draw') => void;
  onExit?: () => void;
  onAddBots?: (count: number) => void;
  bgmTrackTitle?: string | null;
  isBgmMuted?: boolean;
  onToggleBgmMute?: () => void;
}

export const QuizHostVolleyball: React.FC<QuizHostVolleyballProps> = ({
  roomCode,
  questions,
  players,
  raceStartTime,
  volleyballSettings,
  eyesUp = false,
  onToggleEyesUp,
  onFreezeVolleyball,
  onFinishVolleyball,
  onExit,
  onAddBots,
  bgmTrackTitle,
  isBgmMuted = false,
  onToggleBgmMute,
}) => {
  const { t } = useLanguage();
  const { activeSchool } = useClassroom();
  const schoolDisplayName = activeSchool === 'toyogaoka' ? '豊ヶ丘小' : '二子玉川小';
  const timeLimitSeconds = volleyballSettings?.timeLimitSeconds || 60;
  const gameStyle = volleyballSettings?.gameStyle || 'TEAM_VS';

  // Mystery Count Mode: hides exact score ("??? 個") until whistle & counting ceremony!
  const [hideScoreUntilEnd, setHideScoreUntilEnd] = useState<boolean>(
    () => volleyballSettings?.hideScoreUntilEnd ?? true
  );

  const matchStartTime = raceStartTime + 1500;
  const [nowTime, setNowTime] = useState<number>(() => getServerTime());

  useEffect(() => {
    const clock = setInterval(() => {
      setNowTime(getServerTime());
    }, 200);
    return () => clearInterval(clock);
  }, []);

  const elapsedSinceStart = Math.max(0, nowTime - matchStartTime);
  const matchActive = nowTime >= matchStartTime;
  const timeRemainingMs = Math.max(0, timeLimitSeconds * 1000 - elapsedSinceStart);
  const timeRemainingSeconds = Math.ceil(timeRemainingMs / 1000);

  const whistlePlayedRef = useRef<boolean>(false);
  useEffect(() => {
    if (matchActive && !whistlePlayedRef.current) {
      whistlePlayedRef.current = true;
      soundEffects.playWhistle(0.8);
    }
  }, [matchActive]);

  const playerList = useMemo(() => Object.values(players), [players]);
  const redPlayers = useMemo(() => playerList.filter((p) => p.teamId === 'team_red'), [playerList]);
  const whitePlayers = useMemo(() => playerList.filter((p) => p.teamId === 'team_white'), [playerList]);

  const rosterSignature = useMemo(
    () =>
      playerList
        .map((p) => `${p.id}:${p.nickname || 'Student'}:${p.teamId === 'team_white' ? 'white' : 'red'}`)
        .sort()
        .join('|'),
    [playerList]
  );

  const memoizedStudentRoster = useMemo(
    () =>
      playerList.map((p) => ({
        id: p.id,
        nickname: p.nickname || 'Student',
        team: (p.teamId === 'team_white' ? 'white' : 'red') as 'red' | 'white',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rosterSignature]
  );

  // Bean Bag Toss Event Dispatcher (detects +1 normal throws and +2 golden streak throws)
  const [answerEvents, setAnswerEvents] = useState<VolleyballAnswerEvent[]>([]);
  const prevPlayerStatsRef = useRef<Record<string, number>>({});
  const eventCounterRef = useRef<number>(1);
  const initialMountRef = useRef<boolean>(true);

  const [liveRally, setLiveRally] = useState<number>(0);
  const [highestRally, setHighestRally] = useState<number>(0);
  const [manualBonusRed, setManualBonusRed] = useState<number>(0);
  const [manualBonusWhite, setManualBonusWhite] = useState<number>(0);
  const [matchEnded, setMatchEnded] = useState<boolean>(false);
  const [winner, setWinner] = useState<'team_red' | 'team_white' | 'draw' | null>(null);

  // Authoritative team bean-bag counts derived from all connected students' correctCount + manual teacher bonuses
  const redScore = useMemo(
    () => redPlayers.reduce((sum, p) => sum + (p.correctCount || 0), 0) + manualBonusRed,
    [redPlayers, manualBonusRed]
  );
  const whiteScore = useMemo(
    () => whitePlayers.reduce((sum, p) => sum + (p.correctCount || 0), 0) + manualBonusWhite,
    [whitePlayers, manualBonusWhite]
  );

  // Broadcast live team bag totals at <= 5 Hz so student iPads have synchronized scores for Tama-kazoe
  useEffect(() => {
    if (!roomCode) return;
    const timer = setTimeout(() => {
      safeUpdate(`rooms/${roomCode}/volleyballLiveState`, {
        phase: matchEnded ? 'BALL_DROPPED' : 'SERVE',
        activeTeam: 'all',
        servingTeam: 'team_red',
        currentRally: redScore + whiteScore,
        highestRally: redScore + whiteScore,
        redScore,
        whiteScore,
        phaseStartTime: matchStartTime,
        phaseDurationMs: timeLimitSeconds * 1000,
        updatedAt: getServerTime(),
      }).catch(() => {});
    }, matchEnded ? 0 : 200);
    return () => clearTimeout(timer);
  }, [roomCode, redScore, whiteScore, matchEnded, matchStartTime, timeLimitSeconds]);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      Object.values(players).forEach((p) => {
        prevPlayerStatsRef.current[p.id] = p.correctCount || 0;
      });
      return;
    }

    const newEvents: VolleyballAnswerEvent[] = [];
    Object.values(players).forEach((p) => {
      const prev = prevPlayerStatsRef.current[p.id];
      const current = p.correctCount || 0;
      if (prev === undefined) {
        prevPlayerStatsRef.current[p.id] = current;
        return;
      }
      if (current > prev) {
        const delta = current - prev;
        const team: 'red' | 'white' = p.teamId === 'team_white' ? 'white' : 'red';
        const isGoldenDouble = delta >= 2 || (p.currentStreak !== undefined && p.currentStreak > 0 && p.currentStreak % 3 === 0);
        newEvents.push({
          id: eventCounterRef.current++,
          playerId: p.id,
          playerName: p.nickname || 'Student',
          team,
          timestamp: Date.now(),
          isGoldenDouble,
        });
      }
      prevPlayerStatsRef.current[p.id] = current;
    });

    if (newEvents.length > 0) {
      setAnswerEvents(newEvents);
    }
  }, [players]);

  const triggerManualToss = (team: 'red' | 'white' = 'red', isGoldenDouble = false) => {
    const delta = isGoldenDouble ? 2 : 1;
    if (team === 'red') setManualBonusRed((s) => s + delta);
    else setManualBonusWhite((s) => s + delta);
    setAnswerEvents([
      {
        id: eventCounterRef.current++,
        playerId: 'teacher_host',
        playerName: 'Sensei 👨‍🏫',
        team,
        timestamp: Date.now(),
        isGoldenDouble,
      },
    ]);
  };

  const handleBallHit = (_type: string, currentRally: number) => {
    setLiveRally(currentRally);
    if (currentRally > highestRally) {
      setHighestRally(currentRally);
    }
  };

  const handlePointScored = (scoringTeam: 'red' | 'white') => {
    if (scoringTeam === 'red') {
      setManualBonusRed((s) => s + 1);
    } else {
      setManualBonusWhite((s) => s + 1);
    }
  };

  // ==========================================================================
  // [ANTIGRAVITY REFACTOR]: 8 Hz Coalesced Tamaire State Broadcast
  // ==========================================================================
  const phaseBroadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPhaseBroadcastAtRef = useRef<number>(0);
  const pendingPhasePayloadRef = useRef<Record<string, any> | null>(null);

  useEffect(() => {
    return () => {
      if (phaseBroadcastTimerRef.current) {
        clearTimeout(phaseBroadcastTimerRef.current);
        phaseBroadcastTimerRef.current = null;
      }
    };
  }, []);

  const handlePhaseChange = useCallback(
    (evt: VolleyballPhaseChangeEvent) => {
      if (!roomCode) return;
      const nowServer = getServerTime();
      pendingPhasePayloadRef.current = {
        phase: evt.phase,
        activeTeam: evt.activeTeam,
        servingTeam: evt.servingTeam,
        currentRally: evt.currentRally,
        highestRally: Math.max(highestRally, evt.currentRally),
        redScore: evt.redScore,
        whiteScore: evt.whiteScore,
        lastHitterName: evt.lastHitterName || null,
        lastHitType: evt.lastHitType || null,
        phaseStartTime: nowServer,
        phaseDurationMs: evt.phaseDurationMs,
        updatedAt: nowServer,
      };

      const flushPhaseWrite = () => {
        if (phaseBroadcastTimerRef.current) {
          clearTimeout(phaseBroadcastTimerRef.current);
          phaseBroadcastTimerRef.current = null;
        }
        const payload = pendingPhasePayloadRef.current;
        if (!payload) return;
        pendingPhasePayloadRef.current = null;
        lastPhaseBroadcastAtRef.current = Date.now();
        safeUpdate(`rooms/${roomCode}/volleyballLiveState`, payload).catch(() => {});
      };

      const elapsed = Date.now() - lastPhaseBroadcastAtRef.current;
      if (evt.phase === 'BALL_DROPPED' || elapsed >= 125) {
        flushPhaseWrite();
      } else if (!phaseBroadcastTimerRef.current) {
        phaseBroadcastTimerRef.current = setTimeout(flushPhaseWrite, Math.max(15, 125 - elapsed));
      }
    },
    [roomCode, highestRally]
  );

  const handleFreezeAndEnd = (win: 'team_red' | 'team_white' | 'draw') => {
    if (matchEnded) return;
    setMatchEnded(true);
    setWinner(win);
    onFreezeVolleyball?.();

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  useEffect(() => {
    if (matchActive && timeRemainingMs <= 0 && !matchEnded) {
      soundEffects.playWhistle(1.2);
      const calculatedWinner: 'team_red' | 'team_white' | 'draw' =
        redScore > whiteScore ? 'team_red' : whiteScore > redScore ? 'team_white' : 'draw';
      handleFreezeAndEnd(calculatedWinner);
    }
  }, [matchActive, timeRemainingMs, matchEnded, redScore, whiteScore]);

  useClassroomClicker({
    onNext: () => {
      if (matchEnded) {
        onFinishVolleyball(winner || 'draw');
      } else {
        triggerManualToss('red');
      }
    },
    onPrevious: onExit,
  });

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-white select-none overflow-hidden font-sans">
      {/* 1. Sleek Broadcast Header */}
      <div className="relative z-30 w-full px-4 sm:px-6 py-2.5 flex items-center justify-between bg-slate-950 border-b border-slate-800 shadow-2xl">
        {/* Left: Match Timer, Student Count, Bots & Manual Toss */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border font-black ${
              timeRemainingSeconds <= 10
                ? 'bg-rose-950 border-rose-500 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-amber-400'
            }`}
          >
            <Clock size={16} className={timeRemainingSeconds <= 10 ? 'text-rose-400' : 'text-amber-400'} />
            <span className="text-sm sm:text-base font-mono tracking-wider">
              {Math.floor(timeRemainingSeconds / 60)}:
              {(timeRemainingSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            <Users size={14} className="text-slate-400" />
            <span>
              🔴 {redPlayers.length} / ⚪ {whitePlayers.length} ({playerList.length}{' '}
              {t('Students', '名')})
            </span>
          </div>

          {onAddBots && playerList.length < 8 && !matchEnded && (
            <button
              type="button"
              onClick={() => onAddBots(4)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              +4 {t('Bots', 'ボット')}
            </button>
          )}

          {!matchEnded && (
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => triggerManualToss('red')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95 cursor-pointer"
              >
                <span>🔴</span>
                <span>{t('+1 Red Bag', '赤玉+1')}</span>
              </button>
              <button
                type="button"
                onClick={() => triggerManualToss('white')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-slate-200 text-slate-900 transition active:scale-95 cursor-pointer"
              >
                <span>⚪</span>
                <span>{t('+1 White Bag', '白玉+1')}</span>
              </button>
            </div>
          )}

          {onToggleEyesUp && (
            <button
              type="button"
              onClick={onToggleEyesUp}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                eyesUp
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
            >
              <span className="text-sm">👀</span>
              <span className="hidden md:inline">
                {eyesUp ? t('Eyes Up ON', '注目ロック中') : t('Eyes Up', '全員注目')}
              </span>
            </button>
          )}
        </div>

        {/* Center: Undokai Tamaire (玉入れ) Scoreboard + Mystery Count Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-rose-400">
                <ruby>
                  赤組<rt className="text-[8px]">あかぐみ</rt>
                </ruby>
              </span>
              <span className="text-2xl font-black font-mono text-white px-2.5 py-0.5 rounded-xl bg-rose-600 shadow-md">
                {hideScoreUntilEnd && !matchEnded ? '???' : redScore}
              </span>
            </div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest px-1">
              玉入れ VS
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 px-2.5 py-0.5 rounded-xl bg-white shadow-md">
                {hideScoreUntilEnd && !matchEnded ? '???' : whiteScore}
              </span>
              <span className="text-sm font-black text-slate-200">
                <ruby>
                  白組<rt className="text-[8px]">しろぐみ</rt>
                </ruby>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHideScoreUntilEnd((prev) => !prev)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 cursor-pointer"
            title={t('Toggle Mystery Count until Whistle', '結果発表まで個数を隠す (ドキドキ玉かぞえ)')}
          >
            {hideScoreUntilEnd ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{hideScoreUntilEnd ? t('Mystery (???)', '個数シークレット') : t('Live Count', 'リアルタイム表示')}</span>
          </button>
        </div>

        {/* Right: BGM Mute, Whistle (Start Counting Ceremony) & Exit */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleBgmMute && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl">
              <Music size={14} className="text-indigo-400" />
              <button
                type="button"
                onClick={onToggleBgmMute}
                className="p-1 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              >
                {isBgmMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          )}

          {!matchEnded ? (
            <button
              onClick={() => {
                const win =
                  redScore > whiteScore ? 'team_red' : whiteScore > redScore ? 'team_white' : 'draw';
                handleFreezeAndEnd(win);
                soundEffects.playWhistle(1.0);
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition active:scale-95 cursor-pointer"
            >
              {t('Whistle & Count Bags!', '笛を吹く (玉かぞえ開始！)')}
            </button>
          ) : (
            <button
              onClick={() => onFinishVolleyball(winner || 'draw')}
              className="px-4 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xl transition cursor-pointer"
            >
              {t('Results & Awards →', '表彰・結果発表 →')}
            </button>
          )}

          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title={t('Exit', '終了')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Main 3D Undokai Bean Bag Toss (Tamaire / 玉入れ) Arena Stage */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
        <Volleyball3DStage
          rallyCount={liveRally}
          highestRally={highestRally}
          redScore={redScore}
          whiteScore={whiteScore}
          redPlayersCount={Math.max(1, redPlayers.length)}
          whitePlayersCount={Math.max(1, whitePlayers.length)}
          studentRoster={memoizedStudentRoster}
          matchEnded={matchEnded}
          gameStyle={gameStyle}
          winner={winner}
          schoolName={schoolDisplayName}
          hideScoreUntilEnd={hideScoreUntilEnd}
          answerEvents={answerEvents}
          onBallHit={handleBallHit}
          onPointScored={handlePointScored}
          onPhaseChange={handlePhaseChange}
        />
      </div>
    </div>
  );
};
