import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { QuizQuestion, QuizPlayer, TeamId, TEAM_PRESETS, TugOfWarSettings, TugOfWarMatchFormat } from '../types';
import { computeTugOfWarSweepsRemaining } from '../core/quizEngine';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { Clock, Users, Flame, Trophy, Play, Volume2, VolumeX, AlertTriangle, Sparkles, Award, Music } from 'lucide-react';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import confetti from 'canvas-confetti';
import { TugOfWar3DStage } from './TugOfWar3DStage';

interface QuizHostTugOfWarProps {
  roomCode: string;
  questions: QuizQuestion[];
  players: Record<string, QuizPlayer>;
  raceStartTime: number;
  tugOfWarSettings?: TugOfWarSettings;
  currentRound?: number;
  roundWins?: { team_red?: number; team_white?: number };
  baselinePulls?: Record<string, number>;
  eyesUp?: boolean;
  onToggleEyesUp?: () => void;
  onFreezeTugOfWar?: () => void;
  onNextRound?: (newWins: { team_red: number; team_white: number }, nextRoundNumber: number, baselinePulls: Record<string, number>) => Promise<void> | void;
  onFinishTugOfWar: (winner: TeamId | 'draw') => void;
  onExit?: () => void;
  onAddBots?: (count: number) => void;
  onDuckBGM?: (duck: boolean) => void;
  onSpeedUpBGM?: (speedUp: boolean) => void;
  onSetBgmPlaybackRate?: (rate: number) => void;
  bgmPlaybackRate?: number;
  bgmTrackTitle?: string | null;
  isBgmMuted?: boolean;
  onToggleBgmMute?: () => void;
}

export const QuizHostTugOfWar: React.FC<QuizHostTugOfWarProps> = ({
  roomCode,
  questions,
  players,
  raceStartTime,
  tugOfWarSettings,
  currentRound = 1,
  roundWins = { team_red: 0, team_white: 0 },
  baselinePulls = {},
  eyesUp = false,
  onToggleEyesUp,
  onFreezeTugOfWar,
  onNextRound,
  onFinishTugOfWar,
  onExit,
  onAddBots,
  onDuckBGM,
  onSpeedUpBGM,
  onSetBgmPlaybackRate,
  bgmPlaybackRate = 1.0,
  bgmTrackTitle,
  isBgmMuted = false,
  onToggleBgmMute
}) => {
  const { t, language } = useLanguage();
  const { activeSchool } = useClassroom();
  const schoolDisplayName = activeSchool === 'toyogaoka' ? '豊ヶ丘小' : '二子玉川小';
  const timeLimitSeconds = tugOfWarSettings?.timeLimitSeconds || 60;
  const sensitivity = tugOfWarSettings?.pullSensitivity || 20;

  // Start whistle sequence at raceStartTime + 1500ms
  const matchStartTime = raceStartTime + 1500;
  const [nowTime, setNowTime] = useState<number>(() => getServerTime());

  // Clock for high-precision countdown & smooth animation
  useEffect(() => {
    const clock = setInterval(() => {
      setNowTime(getServerTime());
    }, 200);
    return () => clearInterval(clock);
  }, []);

  const elapsedSinceStart = Math.max(0, nowTime - matchStartTime);
  const matchActive = nowTime >= matchStartTime;
  const elapsedSeconds = Math.max(0.1, elapsedSinceStart / 1000);
  const timeRemainingMs = Math.max(0, timeLimitSeconds * 1000 - elapsedSinceStart);
  const timeRemainingSeconds = Math.ceil(timeRemainingMs / 1000);

  // Initial whistle sound on match start
  const whistlePlayedRef = useRef<boolean>(false);
  useEffect(() => {
    if (matchActive && !whistlePlayedRef.current) {
      whistlePlayedRef.current = true;
      soundEffects.playWhistle(0.8);
    }
  }, [matchActive]);

  // Track players by team
  const playerList = useMemo(() => Object.values(players), [players]);
  const redPlayers = useMemo(() => playerList.filter(p => p.teamId === 'team_red'), [playerList]);
  const whitePlayers = useMemo(() => playerList.filter(p => p.teamId === 'team_white'), [playerList]);

  const matchFormat: TugOfWarMatchFormat = tugOfWarSettings?.matchFormat || 'SINGLE';
  const targetWins = matchFormat === 'BEST_OF_7' ? 4 : matchFormat === 'BEST_OF_5' ? 3 : matchFormat === 'BEST_OF_3' ? 2 : 1;
  const maxRounds = matchFormat === 'BEST_OF_7' ? 7 : matchFormat === 'BEST_OF_5' ? 5 : matchFormat === 'BEST_OF_3' ? 3 : 1;
  const currentRedWins = roundWins?.team_red || 0;
  const currentWhiteWins = roundWins?.team_white || 0;
  const isMatchPoint = (currentRedWins === targetWins - 1 && targetWins > 1) || (currentWhiteWins === targetWins - 1 && targetWins > 1);

  // Aggregate pull scores for THIS ROUND (offset by baselinePulls)
  const getRoundPulls = useCallback((p: QuizPlayer) => {
    const base = baselinePulls?.[p.id] || 0;
    return Math.max(0, (p.correctCount || 0) - base);
  }, [baselinePulls]);

  const redRoundCorrect = useMemo(() => redPlayers.reduce((sum, p) => sum + getRoundPulls(p), 0), [redPlayers, getRoundPulls]);
  const whiteRoundCorrect = useMemo(() => whitePlayers.reduce((sum, p) => sum + getRoundPulls(p), 0), [whitePlayers, getRoundPulls]);

  // Overall total correct across all rounds
  const redTotalCorrect = useMemo(() => redPlayers.reduce((sum, p) => sum + (p.correctCount || 0), 0), [redPlayers]);
  const whiteTotalCorrect = useMemo(() => whitePlayers.reduce((sum, p) => sum + (p.correctCount || 0), 0), [whitePlayers]);

  const redActiveCount = Math.max(1, redPlayers.length);
  const whiteActiveCount = Math.max(1, whitePlayers.length);

  const redAvg = redRoundCorrect / redActiveCount;
  const whiteAvg = whiteRoundCorrect / whiteActiveCount;

  // Live pull rate per minute
  const redPullRate = Math.round((redRoundCorrect / elapsedSeconds) * 60);
  const whitePullRate = Math.round((whiteRoundCorrect / elapsedSeconds) * 60);

  // Displacement: -100 (Full Red Win) to +100 (Full White Win)
  // 0 = Dead Center
  const rawDisplacement = (whiteAvg - redAvg) * sensitivity;
  const displacement = Math.max(-100, Math.min(100, rawDisplacement));

  // Lead amount in pulls
  const leadPulls = Math.abs(Math.round((whiteAvg - redAvg) * Math.max(redActiveCount, whiteActiveCount)));
  const remainingToRedWin = computeTugOfWarSweepsRemaining({
    displacement,
    sensitivity,
    activeTeamCount: redActiveCount,
    team: 'team_red',
  });
  const remainingToWhiteWin = computeTugOfWarSweepsRemaining({
    displacement,
    sensitivity,
    activeTeamCount: whiteActiveCount,
    team: 'team_white',
  });

  // Determine winner if limit reached or time expired
  const [matchEnded, setMatchEnded] = useState<boolean>(false);
  const [roundWinner, setRoundWinner] = useState<TeamId | 'draw' | null>(null);
  const [winReason, setWinReason] = useState<'IPPON' | 'TIME'>('TIME');
  const [frozenStats, setFrozenStats] = useState<{
    redRound: number;
    whiteRound: number;
    redTotal: number;
    whiteTotal: number;
    redAvg: number;
    whiteAvg: number;
  } | null>(null);
  const finishTriggeredRef = useRef<boolean>(false);
  const isAdvancingRoundRef = useRef<boolean>(false);

  useEffect(() => {
    finishTriggeredRef.current = false;
    isAdvancingRoundRef.current = false;
    whistlePlayedRef.current = false;
    prevLeadRef.current = 'EVEN';
    lastWarnedSecRef.current = -1;
    setMatchEnded(false);
    setRoundWinner(null);
    setFrozenStats(null);
  }, [currentRound, raceStartTime]);

  const nextRedWins = roundWinner === 'team_red' ? currentRedWins + 1 : currentRedWins;
  const nextWhiteWins = roundWinner === 'team_white' ? currentWhiteWins + 1 : currentWhiteWins;

  const isMatchDecided = matchFormat === 'SINGLE'
    ? true
    : (nextRedWins >= targetWins || nextWhiteWins >= targetWins);

  const matchWinner: TeamId | 'draw' = isMatchDecided
    ? (nextRedWins > nextWhiteWins ? 'team_red' : nextWhiteWins > nextRedWins ? 'team_white' : (roundWinner || 'draw'))
    : (roundWinner || 'draw');

  const handleFreezeAndEnd = (winTeam: TeamId | 'draw', reason: 'IPPON' | 'TIME') => {
    if (finishTriggeredRef.current) return;
    finishTriggeredRef.current = true;
    setFrozenStats({
      redRound: redRoundCorrect,
      whiteRound: whiteRoundCorrect,
      redTotal: redTotalCorrect,
      whiteTotal: whiteTotalCorrect,
      redAvg,
      whiteAvg
    });
    setRoundWinner(winTeam);
    setWinReason(reason);
    setMatchEnded(true);
    onFreezeTugOfWar?.();
  };

  const handleStartNextRound = async () => {
    if (isAdvancingRoundRef.current) return;
    isAdvancingRoundRef.current = true;
    try {
      const nextBaseline: Record<string, number> = {};
      playerList.forEach(p => {
        nextBaseline[p.id] = p.correctCount || 0;
      });
      await onNextRound?.(
        { team_red: nextRedWins, team_white: nextWhiteWins },
        currentRound + 1,
        nextBaseline
      );
    } finally {
      isAdvancingRoundRef.current = false;
    }
  };

  // Sound effects on lead change or heave-ho cadence
  const prevLeadRef = useRef<'RED' | 'WHITE' | 'EVEN'>('EVEN');
  useEffect(() => {
    if (!matchActive || matchEnded) return;

    const currentLead = displacement < -8 ? 'RED' : displacement > 8 ? 'WHITE' : 'EVEN';
    if (currentLead !== prevLeadRef.current) {
      if (currentLead !== 'EVEN') {
        soundEffects.playRopeTug();
      }
      prevLeadRef.current = currentLead;
    }
  }, [displacement, matchActive, matchEnded]);

  // Countdown warning beeps at final 5 seconds
  const lastWarnedSecRef = useRef<number>(-1);
  useEffect(() => {
    if (matchActive && !matchEnded && timeRemainingSeconds <= 5 && timeRemainingSeconds > 0) {
      if (lastWarnedSecRef.current !== timeRemainingSeconds) {
        lastWarnedSecRef.current = timeRemainingSeconds;
        soundEffects.playTick();
      }
    }
  }, [timeRemainingSeconds, matchActive, matchEnded]);

  // Check end conditions: Early sweep or Time out
  useEffect(() => {
    if (!matchActive || matchEnded || finishTriggeredRef.current) return;

    if (displacement <= -100) {
      // Red instant sweep
      handleFreezeAndEnd('team_red', 'IPPON');
      soundEffects.playWhistle(1.2);
      soundEffects.playFanfare();
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { x: 0.25, y: 0.5 },
        colors: ['#E11D48', '#FB7185', '#FDA4AF', '#FFFFFF']
      });
    } else if (displacement >= 100) {
      // White instant sweep
      handleFreezeAndEnd('team_white', 'IPPON');
      soundEffects.playWhistle(1.2);
      soundEffects.playFanfare();
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { x: 0.75, y: 0.5 },
        colors: ['#FFFFFF', '#E2E8F0', '#94A3B8', '#F59E0B']
      });
    } else if (timeRemainingMs <= 0) {
      // Time expired
      soundEffects.playWhistle(1.2);
      soundEffects.playFanfare();

      if (displacement < -4) {
        handleFreezeAndEnd('team_red', 'TIME');
        confetti({
          particleCount: 130,
          spread: 90,
          origin: { x: 0.3, y: 0.5 },
          colors: ['#E11D48', '#FB7185', '#FFFFFF']
        });
      } else if (displacement > 4) {
        handleFreezeAndEnd('team_white', 'TIME');
        confetti({
          particleCount: 130,
          spread: 90,
          origin: { x: 0.7, y: 0.5 },
          colors: ['#FFFFFF', '#E2E8F0', '#F59E0B']
        });
      } else {
        handleFreezeAndEnd('draw', 'TIME');
      }
    }
  }, [displacement, timeRemainingMs, matchActive, matchEnded]);

  const advanceAction = () => {
    if (isMatchDecided) {
      onFinishTugOfWar(matchWinner);
    } else {
      void handleStartNextRound();
    }
  };
  const advanceHandlerRef = useRef(advanceAction);
  advanceHandlerRef.current = advanceAction;

  // Clicker support
  useClassroomClicker({
    onNext: () => {
      if (matchEnded) {
        advanceHandlerRef.current();
      }
    },
    onPrevious: onExit
  });

  // Space & Enter keys to advance
  useEffect(() => {
    if (!matchEnded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        advanceHandlerRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matchEnded]);

  // Calculate visual positions: Center is 50%, displacement translates from 8% to 92%
  const ribbonPositionPercent = 50 + (displacement * 0.42);

  return (
    <div className="relative w-full h-dvh max-h-dvh overflow-hidden bg-slate-950 text-white flex flex-col select-none">
      {/* 1. Header Bar: Full Controls Cluster with Integrated Eyes Up & Audio */}
      <div className="h-16 sm:h-18 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-2 shrink-0 z-40 flex-nowrap">
        {/* Left: Timer, Bots & Attention Lock */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto no-scrollbar flex-nowrap">
          {/* Main Countdown Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-inner shrink-0 whitespace-nowrap">
            <Clock className={`w-5 h-5 ${timeRemainingSeconds <= 10 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`} />
            <span className={`text-xl sm:text-2xl font-black tabular-nums tracking-wider ${timeRemainingSeconds <= 10 ? 'text-rose-400' : 'text-slate-100'}`}>
              {Math.floor(timeRemainingSeconds / 60)}:{(timeRemainingSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Quick Bots Adder */}
          {onAddBots && !matchEnded && (
            <button
              onClick={() => onAddBots(4)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
              title={t('Add 4 Practice Bots', 'テスト用ボット4名追加')}
            >
              +4 {t('Bots', 'ボット')}
            </button>
          )}

          {/* Integrated Attention Lock (Eyes Up) Toggle - eliminates overlapping bottom pill */}
          {onToggleEyesUp && (
            <button
              type="button"
              onClick={onToggleEyesUp}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
                eyesUp
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
              title={(eyesUp ? t('Attention Lock ON (Click to Unlock)', '注目ロック中（クリックで解除）') : t('Lock Attention: Eyes Up Front', '全員注目（前を見てね！）')) as string}
            >
              <span className="text-sm">👀</span>
              <span className="hidden md:inline">{eyesUp ? t('Eyes Up ON', '注目ロック中') : t('Eyes Up', '全員注目')}</span>
            </button>
          )}
        </div>

        {/* Center: Sports Day Headband Banner with Multi-Round Win Dots */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
          {/* Red Team Badge & Series Wins */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-2xl bg-rose-950/50 border border-rose-800/80 shrink-0 whitespace-nowrap">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50" />
            <span className="text-base sm:text-lg font-black text-rose-400 tracking-wide">
              {t('Red Team', <ruby>赤組<rt>あかぐみ</rt></ruby>)}
            </span>
            {targetWins > 1 && (
              <div className="flex items-center gap-1 ml-1" title={`${currentRedWins} / ${targetWins} ${language === 'ja' ? '勝' : 'wins'}`}>
                {Array.from({ length: targetWins }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all ${
                      i < currentRedWins
                        ? 'bg-rose-500 shadow-md shadow-rose-500/70 scale-110'
                        : 'border-2 border-rose-500/40 bg-slate-950/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Center Round / VS Pill */}
          <div className="flex flex-col items-center shrink-0 whitespace-nowrap">
            {targetWins > 1 ? (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-amber-500/30 text-[11px] font-black text-amber-400">
                {isMatchPoint && <span className="animate-pulse">🔥</span>}
                <span>{t(`Round ${currentRound}/${maxRounds}`, `第${currentRound}回戦`)}</span>
              </div>
            ) : (
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-900 border border-amber-500/30">
                VS
              </span>
            )}
          </div>

          {/* White Team Badge & Series Wins */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-2xl bg-slate-900 border border-slate-700 shrink-0 whitespace-nowrap">
            {targetWins > 1 && (
              <div className="flex items-center gap-1 mr-1" title={`${currentWhiteWins} / ${targetWins} ${language === 'ja' ? '勝' : 'wins'}`}>
                {Array.from({ length: targetWins }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all ${
                      i < currentWhiteWins
                        ? 'bg-white shadow-md shadow-white/70 scale-110'
                        : 'border-2 border-slate-500 bg-slate-950/60'
                    }`}
                  />
                ))}
              </div>
            )}
            <span className="text-base sm:text-lg font-black text-slate-100 tracking-wide">
              {t('White Team', <ruby>白組<rt>しろぐみ</rt></ruby>)}
            </span>
            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-white/50" />
          </div>
        </div>

        {/* Right: BGM Mute, Referee Whistle & Exit */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
          {/* Integrated BGM Control */}
          {onToggleBgmMute && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl shrink-0">
              <Music size={14} className={`text-indigo-400 ${!isBgmMuted ? 'animate-bounce' : ''}`} />
              <button
                type="button"
                onClick={onToggleBgmMute}
                className="p-1 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                title={isBgmMuted ? t('Unmute BGM', 'BGMミュート解除') : t('Mute BGM', 'BGMミュート')}
              >
                {isBgmMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          )}

          {!matchEnded ? (
            <button
              onClick={() => {
                const win = displacement < -4 ? 'team_red' : displacement > 4 ? 'team_white' : 'draw';
                handleFreezeAndEnd(win, 'TIME');
                soundEffects.playWhistle(1.0);
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {t('Whistle (Finish)', '笛を吹く (終了)')}
            </button>
          ) : (
            <button
              onClick={() => {
                if (isMatchDecided) {
                  onFinishTugOfWar(matchWinner);
                } else {
                  void handleStartNextRound();
                }
              }}
              className="px-4 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-xl shadow-amber-500/30 transition animate-bounce cursor-pointer whitespace-nowrap"
            >
              {isMatchDecided ? t('Results & Awards →', '表彰・結果発表 →') : t(`Next Round (R${currentRound + 1}) →`, `第${currentRound + 1}回戦へ →`)}
            </button>
          )}

          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              title={t('Exit', '終了')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Undokai Festive Bunting Flags (万国旗 - Classic Japanese Elementary School Atmosphere) */}
      <div className="relative w-full h-8 overflow-hidden z-20 pointer-events-none opacity-80 shrink-0">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 40">
          {/* Swag line rope */}
          <path d="M 0,10 Q 300,28 600,10 Q 900,28 1200,10" stroke="#78350F" strokeWidth="2" fill="none" />
          {/* Triangular pennants */}
          {[
            { x: 30, color: '#E11D48' }, { x: 90, color: '#FFFFFF' }, { x: 150, color: '#2563EB' }, { x: 210, color: '#F59E0B' },
            { x: 270, color: '#10B981' }, { x: 330, color: '#E11D48' }, { x: 390, color: '#FFFFFF' }, { x: 450, color: '#2563EB' },
            { x: 510, color: '#F59E0B' }, { x: 570, color: '#10B981' }, { x: 630, color: '#E11D48' }, { x: 690, color: '#FFFFFF' },
            { x: 750, color: '#2563EB' }, { x: 810, color: '#F59E0B' }, { x: 870, color: '#10B981' }, { x: 930, color: '#E11D48' },
            { x: 990, color: '#FFFFFF' }, { x: 1050, color: '#2563EB' }, { x: 1110, color: '#F59E0B' }, { x: 1170, color: '#10B981' }
          ].map((f, idx) => (
            <polygon
              key={`flag-${idx}`}
              points={`${f.x},12 ${f.x + 36},14 ${f.x + 18},38`}
              fill={f.color}
              stroke="#1E293B"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* 3. The Grand Undokai 3D Arena Stage (Expands to 85%+ Screen Height) */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden flex flex-col justify-end">
        {/* Full 3D Stadium Canvas */}
        <TugOfWar3DStage
          displacement={displacement}
          matchEnded={matchEnded}
          winner={roundWinner}
          redPullRate={redPullRate}
          whitePullRate={whitePullRate}
          redPlayersCount={redActiveCount}
          whitePlayersCount={whiteActiveCount}
          schoolName={schoolDisplayName}
        />

        {/* Floating Broadcast Scoreboard & Match Domination HUD */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[96%] max-w-5xl z-30 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border-2 border-slate-700/80 shadow-2xl p-2 sm:p-3 pointer-events-auto">
            {/* Top Row: Scores & Domination Meter */}
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              {/* Red Squad Score Pod */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-rose-600/30 border-2 border-rose-500 flex items-center justify-center text-2xl sm:text-3xl font-black text-rose-400 font-mono shadow-lg shadow-rose-600/30">
                  {redRoundCorrect}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-black text-rose-400 flex items-center gap-1">
                    <span>🔴</span>
                    {t('RED PULLS', <><ruby>赤組<rt>あかぐみ</rt></ruby> 引き数</>)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold flex items-center gap-2">
                    <span>⚡ {redPullRate} p/m</span>
                    <span>•</span>
                    <span>{redPlayers.length}{t(' students', '人')}</span>
                    {matchFormat !== 'SINGLE' && (
                      <span className="text-rose-300 font-bold">
                        ({t('Total', '通算')}: {redTotalCorrect})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center Match Tension & Domination Gauge */}
              <div className="flex-1 max-w-md flex flex-col items-center">
                {/* Tension Status Pill */}
                <div className="text-[10px] sm:text-xs font-black text-amber-300 flex items-center gap-1.5 mb-1">
                  {displacement < -8 ? (
                    <span className="text-rose-400 animate-pulse">
                      {t(
                        `🔴 RED LEADS! (+${leadPulls} pulls · ${remainingToRedWin} to Sweep)`,
                        <>🔴 <ruby>赤組<rt>あかぐみ</rt></ruby> リード中！ (+{leadPulls}回) あと{remainingToRedWin}回で一本勝ち</>
                      )}
                    </span>
                  ) : displacement > 8 ? (
                    <span className="text-slate-100 animate-pulse">
                      {t(
                        `⚪ WHITE LEADS! (+${leadPulls} pulls · ${remainingToWhiteWin} to Sweep)`,
                        <>⚪ <ruby>白組<rt>しろぐみ</rt></ruby> リード中！ (+{leadPulls}回) あと{remainingToWhiteWin}回で一本勝ち</>
                      )}
                    </span>
                  ) : (
                    <span>{t('⚖️ EVEN MATCH! DEAD CENTER (50/50)', '⚖️ 互角！ DEAD CENTER (50/50)')}</span>
                  )}
                </div>

                {/* Domination Gauge Needle Bar */}
                <div className="relative w-full h-5 sm:h-6 rounded-full bg-slate-900 border-2 border-slate-700 overflow-hidden flex items-center shadow-inner">
                  {/* Left & Right Win Markers */}
                  <span className="absolute left-2 text-[8px] sm:text-[9px] font-black text-rose-400 select-none z-10">
                    ◀ 🔴 WIN
                  </span>
                  <span className="absolute right-2 text-[8px] sm:text-[9px] font-black text-slate-200 select-none z-10">
                    WIN ⚪ ▶
                  </span>

                  {/* 0m Center Reference Notch */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-500/80 -translate-x-1/2 z-10" />

                  {/* Red Domination Beam (Fills Left) */}
                  {displacement < 0 && (
                    <div
                      className="absolute right-1/2 top-0 bottom-0 bg-gradient-to-l from-rose-500 to-rose-600 transition-all duration-300 shadow-[0_0_12px_rgba(225,29,72,0.8)]"
                      style={{ width: `${Math.min(48, Math.abs(displacement) * 0.46)}%` }}
                    />
                  )}

                  {/* White Domination Beam (Fills Right) */}
                  {displacement > 0 && (
                    <div
                      className="absolute left-1/2 top-0 bottom-0 bg-gradient-to-r from-slate-200 to-white transition-all duration-300 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                      style={{ width: `${Math.min(48, displacement * 0.46)}%` }}
                    />
                  )}

                  {/* Moving Rope Needle / Ribbon Anchor */}
                  <div
                    className="absolute top-0 bottom-0 w-3 -ml-1.5 bg-amber-400 border border-slate-950 rounded-sm shadow-[0_0_10px_#f59e0b] transition-all duration-300 z-20"
                    style={{ left: `${ribbonPositionPercent}%` }}
                  />
                </div>
              </div>

              {/* White Squad Score Pod */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-right">
                <div>
                  <div className="text-xs sm:text-sm font-black text-slate-200 flex items-center justify-end gap-1">
                    {t('WHITE PULLS', <><ruby>白組<rt>しろぐみ</rt></ruby> 引き数</>)}
                    <span>⚪</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold flex items-center justify-end gap-2">
                    {matchFormat !== 'SINGLE' && (
                      <span className="text-slate-300 font-bold">
                        ({t('Total', '通算')}: {whiteTotalCorrect})
                      </span>
                    )}
                    <span>{whitePlayers.length}{t(' students', '人')}</span>
                    <span>•</span>
                    <span>⚡ {whitePullRate} p/m</span>
                  </div>
                </div>
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 border-2 border-slate-500 flex items-center justify-center text-2xl sm:text-3xl font-black text-white font-mono shadow-lg shadow-white/20">
                  {whiteRoundCorrect}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sports Day Prompt Strip (Zero overlap with floating pills) */}
        <div className="w-full bg-slate-950/95 border-t border-slate-800 px-6 py-2 z-30 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>{t('🚩 Undokai English Tug-of-War', '🚩 運動会 英語綱引きバトル')}</span>
            <span>•</span>
            <span>{(() => {
              const mudSec = Math.max(2.5, tugOfWarSettings?.mudLockoutSeconds ?? 2.5);
              const mudLabel = Number.isInteger(mudSec) ? `${mudSec}` : mudSec.toFixed(1);
              return t(`Correct answers pull the rope! Mistakes trigger a ${mudLabel}s mud slip lockout!`, `正解するとロープを引き寄せる！ まちがえると泥で${mudLabel}秒ストップ！`);
            })()}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-bold">
            <span>
              {t(
                `🔴 Red: ${redRoundCorrect} pulls${matchFormat !== 'SINGLE' ? ` (Total: ${redTotalCorrect})` : ''}`,
                `🔴 赤組: ${redRoundCorrect}回${matchFormat !== 'SINGLE' ? ` (通算: ${redTotalCorrect}回)` : ''}`
              )}
            </span>
            <span>
              {t(
                `⚪ White: ${whiteRoundCorrect} pulls${matchFormat !== 'SINGLE' ? ` (Total: ${whiteTotalCorrect})` : ''}`,
                `⚪ 白組: ${whiteRoundCorrect}回${matchFormat !== 'SINGLE' ? ` (通算: ${whiteTotalCorrect}回)` : ''}`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Victory / Round Result Modal Overlay (2-Column Landscape Wing Card) */}
      {matchEnded && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-3xl bg-slate-900 border-4 border-amber-400 rounded-3xl p-5 sm:p-7 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-center max-h-[90dvh] overflow-y-auto">
            {/* Left Column: Trophy Emblem, Round Badge & Winner Banner */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-amber-400/30 mb-3 animate-bounce">
                {isMatchDecided ? '🏆' : '🚩'}
              </div>

              <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest mb-2">
                {isMatchDecided
                  ? (winReason === 'IPPON' ? t('Clean Sweep Victory! (Ippon)', '一本勝ち！完全優勝！') : t('Match Decided!', '試合終了！優勝決定！'))
                  : (winReason === 'IPPON' ? t(`Round ${currentRound} Swept! (Ippon)`, `第${currentRound}回戦 一本勝ち！`) : t(`Round ${currentRound} Complete!`, `第${currentRound}回戦 終了！`))}
              </span>

              {/* Winner Announcement Banner */}
              {roundWinner === 'team_red' && (
                <div className="my-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-rose-500 tracking-tight">
                    {t(
                      isMatchDecided && matchFormat !== 'SINGLE' ? 'RED WINS THE MATCH!' : 'RED TEAM WINS!',
                      <><ruby>赤組<rt>あかぐみ</rt></ruby>の{isMatchDecided && matchFormat !== 'SINGLE' ? '完全優勝' : '勝利'}！</>
                    )}
                  </h2>
                  <p className="text-sm sm:text-base font-bold text-rose-300 mt-1">
                    {language === 'ja'
                      ? (isMatchDecided && matchFormat !== 'SINGLE' ? '🔴 RED TEAM WINS THE MATCH!' : `🔴 RED TEAM TAKES ROUND ${currentRound}!`)
                      : `🔴 Round ${currentRound} Victory!`}
                  </p>
                </div>
              )}

              {roundWinner === 'team_white' && (
                <div className="my-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-100 tracking-tight">
                    {t(
                      isMatchDecided && matchFormat !== 'SINGLE' ? 'WHITE WINS THE MATCH!' : 'WHITE TEAM WINS!',
                      <><ruby>白組<rt>しろぐみ</rt></ruby>の{isMatchDecided && matchFormat !== 'SINGLE' ? '完全優勝' : '勝利'}！</>
                    )}
                  </h2>
                  <p className="text-sm sm:text-base font-bold text-slate-300 mt-1">
                    {language === 'ja'
                      ? (isMatchDecided && matchFormat !== 'SINGLE' ? '⚪ WHITE TEAM WINS THE MATCH!' : `⚪ WHITE TEAM TAKES ROUND ${currentRound}!`)
                      : `⚪ Round ${currentRound} Victory!`}
                  </p>
                </div>
              )}

              {roundWinner === 'draw' && (
                <div className="my-2">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-400 tracking-tight">
                    {t('DRAW GAME!', <><ruby>引き分け<rt>ひきわけ</rt></ruby>！</>)}
                  </h2>
                  <p className="text-sm sm:text-base font-bold text-amber-200 mt-1">
                    ⚖️ {isMatchDecided ? t("IT'S A TIE!", '同点引き分け！') : t(`ROUND ${currentRound} IS A DRAW!`, `第${currentRound}回戦 引き分け！`)}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Standings, Match Pull Stats & Next Actions */}
            <div className="flex flex-col justify-center gap-3 w-full">
              {/* Series Score Standings for Best-of format */}
              {matchFormat !== 'SINGLE' && (
                <div className="w-full p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-around">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-rose-400">{t('🔴 Red Team', '🔴 赤組')}</span>
                    <span className="text-2xl font-black text-rose-400">{nextRedWins} {t('Wins', '勝')}</span>
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: targetWins }).map((_, i) => (
                        <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < nextRedWins ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'border border-rose-500/40 bg-slate-900'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-slate-500 font-black text-sm">
                    {t('vs', '対')}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-200">{t('⚪ White Team', '⚪ 白組')}</span>
                    <span className="text-2xl font-black text-slate-100">{nextWhiteWins} {t('Wins', '勝')}</span>
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: targetWins }).map((_, i) => (
                        <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < nextWhiteWins ? 'bg-white shadow-sm shadow-white' : 'border border-slate-500 bg-slate-900'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Match Stats summary */}
              <div className="w-full grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm">
                <div className="text-left border-r border-slate-800 pr-2">
                  <span className="font-black text-rose-400 block">{t('🔴 Red Team', <>🔴 <ruby>赤組<rt>あかぐみ</rt></ruby></>)}</span>
                  <span className="text-slate-300 block">{t('Round Pulls', 'この回の引き数')}: <strong>{frozenStats?.redRound ?? redRoundCorrect}</strong></span>
                  {matchFormat !== 'SINGLE' && (
                    <span className="text-slate-400 text-[11px] block">{t('Total pulls', '通算引き数')}: {frozenStats?.redTotal ?? redTotalCorrect}</span>
                  )}
                </div>
                <div className="text-right pl-2">
                  <span className="font-black text-slate-200 block">{t('⚪ White Team', <>⚪ <ruby>白組<rt>しろぐみ</rt></ruby></>)}</span>
                  <span className="text-slate-300 block">{t('Round Pulls', 'この回の引き数')}: <strong>{frozenStats?.whiteRound ?? whiteRoundCorrect}</strong></span>
                  {matchFormat !== 'SINGLE' && (
                    <span className="text-slate-400 text-[11px] block">{t('Total pulls', '通算引き数')}: {frozenStats?.whiteTotal ?? whiteTotalCorrect}</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {isMatchDecided ? (
                <button
                  onClick={() => onFinishTugOfWar(matchWinner)}
                  className="w-full py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-base sm:text-lg font-black shadow-xl shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                >
                  {t('Continue to Awards & Badges →', '表彰・MVPバッジ発表へ進む →')}
                </button>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={() => void handleStartNextRound()}
                    className="w-full py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-base sm:text-lg font-black shadow-xl shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                  >
                    {t(`Start Round ${currentRound + 1} →`, `第${currentRound + 1}回戦を始める →`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => onFinishTugOfWar(matchWinner)}
                    className="text-xs font-bold text-slate-400 hover:text-white transition underline cursor-pointer py-1"
                  >
                    {t('End Match Now & Proceed to Awards', 'ここで試合を終了して表彰へ進む')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
