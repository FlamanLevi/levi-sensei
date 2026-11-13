import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QuizQuestion, QuizPlayer, TeamId, TEAM_PRESETS, PodiumFinisher, SprintSettings } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { Flag, Clock, Users, Flame, Award, Trophy, Play, Square, AlertTriangle, Sparkles, CheckCircle2, Music, Volume2, VolumeX } from 'lucide-react';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { SuzukaCircuitMap } from './SuzukaCircuitMap';

interface QuizHostSprintProps {
  roomCode: string;
  questions: QuizQuestion[];
  players: Record<string, QuizPlayer>;
  raceStartTime: number;
  sprintSettings?: SprintSettings;
  raceFinishGraceStartTime?: number;
  onTriggerGrace: () => void;
  onFinishRace: (podium: PodiumFinisher[]) => void;
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

export const QuizHostSprint: React.FC<QuizHostSprintProps> = ({
  roomCode,
  questions,
  players,
  raceStartTime,
  sprintSettings,
  raceFinishGraceStartTime,
  onTriggerGrace,
  onFinishRace,
  onExit,
  onAddBots,
  onDuckBGM,
  onSpeedUpBGM,
  onSetBgmPlaybackRate,
  bgmPlaybackRate,
  bgmTrackTitle,
  isBgmMuted,
  onToggleBgmMute
}) => {
  const { t, language } = useLanguage();
  const isTimeTrial = sprintSettings?.sprintMode === 'TIME_TRIAL';
  const totalQuestions = isTimeTrial ? questions.length : (sprintSettings?.lapCount === -1 ? questions.length : (sprintSettings?.lapCount || questions.length));
  const totalCircuitLaps = isTimeTrial ? 1 : (totalQuestions >= 60 ? 3 : (totalQuestions >= 30 ? 2 : 1));
  const timeLimitSeconds = sprintSettings?.timeLimitSeconds || 60;
  const graceSeconds = sprintSettings?.graceCountdownSeconds || 15;
  const [trackView, setTrackView] = useState<'CIRCUIT' | 'LANES'>('CIRCUIT');

  // Race start lights sequence (5 red lights -> all green / lights out at raceStartTime + 3600ms)
  const greenFlagTime = raceStartTime + 3600;
  const [nowTime, setNowTime] = useState<number>(() => getServerTime());

  const graceTriggeredRef = useRef<boolean>(false);
  const finishTriggeredRef = useRef<boolean>(false);

  // Main high-frequency render clock for smooth stopwatch & progress
  useEffect(() => {
    const clock = setInterval(() => {
      setNowTime(getServerTime());
    }, 50);
    return () => clearInterval(clock);
  }, []);

  const elapsedSinceStart = Math.max(0, nowTime - raceStartTime);
  const lightsCount = elapsedSinceStart >= 3600 ? 6 : Math.max(0, Math.floor(elapsedSinceStart / 600));
  const raceActive = elapsedSinceStart >= 3600;
  // Modal automatically closes 800ms after green flag (at 4400ms)
  const showStartLights = elapsedSinceStart < 4400;

  // Sound effects on light changes
  const prevLightsRef = useRef<number>(lightsCount);
  useEffect(() => {
    if (lightsCount > prevLightsRef.current) {
      if (lightsCount <= 5 && lightsCount > 0) {
        soundEffects.playRaceCountdownBeep(false);
      } else if (lightsCount === 6) {
        soundEffects.playRaceCountdownBeep(true);
      }
      prevLightsRef.current = lightsCount;
    }
  }, [lightsCount]);

  // Elapsed race time strictly begins when lights turn green (greenFlagTime)
  const elapsedMs = raceActive ? Math.max(0, nowTime - greenFlagTime) : 0;

  // Time Trial Countdown: starts at full time limit when lights go green
  const timeTrialRemainingMs = isTimeTrial
    ? (raceActive ? Math.max(0, (timeLimitSeconds * 1000) - elapsedMs) : timeLimitSeconds * 1000)
    : 0;
  const isTimeTrialExpired = isTimeTrial && raceActive && timeTrialRemainingMs <= 0;

  // Grace Countdown calculation for Lap Race
  const graceElapsedMs = raceFinishGraceStartTime ? Math.max(0, nowTime - raceFinishGraceStartTime) : 0;
  const graceRemainingSeconds = raceFinishGraceStartTime 
    ? Math.max(0, Math.ceil((graceSeconds * 1000 - graceElapsedMs) / 1000))
    : graceSeconds;
  const isGraceExpired = raceFinishGraceStartTime ? (graceElapsedMs >= graceSeconds * 1000) : false;

  // Player classification and leaderboard sorting
  const playerList = useMemo(() => Object.values(players), [players]);
  const totalRacers = playerList.length;

  const sortedRacers = useMemo(() => {
    return [...playerList].sort((a, b) => {
      if (isTimeTrial) {
        // Time Trial: sort strictly by correct count desc, then score desc, then finishTimeMs asc
        if ((b.correctCount || 0) !== (a.correctCount || 0)) {
          return (b.correctCount || 0) - (a.correctCount || 0);
        }
        if ((b.score || 0) !== (a.score || 0)) {
          return (b.score || 0) - (a.score || 0);
        }
        return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
      } else {
        // Lap race: finished racers first by finish time asc, then unfinished by progress / score
        if (a.isFinished && !b.isFinished) return -1;
        if (!a.isFinished && b.isFinished) return 1;
        if (a.isFinished && b.isFinished) {
          return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
        }
        if ((b.sprintProgress || 0) !== (a.sprintProgress || 0)) {
          return (b.sprintProgress || 0) - (a.sprintProgress || 0);
        }
        return (b.score || 0) - (a.score || 0);
      }
    });
  }, [playerList, isTimeTrial]);

  const finishedRacers = useMemo(() => {
    return sortedRacers.filter(p => p.isFinished);
  }, [sortedRacers]);

  // Incremental BGM speed up: +0.02 for each finisher (1.02x -> 1.22x), rounding to 1.25x (+25% Final Sprint bump) at 12 finishers!
  useEffect(() => {
    if (!raceActive) {
      onSetBgmPlaybackRate?.(1.0);
      return;
    }
    const finishers = finishedRacers.length;
    let rate = 1.0;
    if (finishers >= 12) {
      rate = 1.25; // Nice, even 25% bump for the final sprint!
    } else if (finishers > 0) {
      rate = 1.0 + finishers * 0.02; // Exact 0.02 increase per finisher
    }
    onSetBgmPlaybackRate?.(Number(rate.toFixed(2)));
    return () => {
      onSetBgmPlaybackRate?.(1.0);
    };
  }, [finishedRacers.length, raceActive, onSetBgmPlaybackRate]);

  // Build podium finishers list
  const currentPodium = useMemo<PodiumFinisher[]>(() => {
    if (isTimeTrial) {
      return sortedRacers.slice(0, 3).map((p, idx) => ({
        playerId: p.id,
        nickname: p.nickname,
        finishTimeMs: p.finishTimeMs || timeLimitSeconds * 1000,
        rank: idx + 1,
        teamId: p.teamId,
        correctCount: p.correctCount || 0,
        totalAnswered: p.totalAnswered || 0
      }));
    } else {
      // In Lap race: finished racers first; if fewer than 3, pad with top unfinished racers
      const finished = sortedRacers.filter(p => p.isFinished);
      const unfinished = sortedRacers.filter(p => !p.isFinished);
      const combined = [...finished, ...unfinished].slice(0, 3);
      return combined.map((p, idx) => ({
        playerId: p.id,
        nickname: p.nickname,
        finishTimeMs: p.finishTimeMs || 0,
        rank: idx + 1,
        teamId: p.teamId,
        correctCount: p.correctCount || 0,
        totalAnswered: p.totalAnswered || 0
      }));
    }
  }, [sortedRacers, isTimeTrial, timeLimitSeconds]);

  // Adaptive Finishers Threshold (50% of field, capped at 12)
  const requiredFinishersThreshold = totalRacers > 0
    ? Math.min(12, Math.max(1, Math.ceil(totalRacers * 0.5)))
    : 12;

  // Automatic Trigger for Grace Timer when required finishers cross line in Lap Race (adaptive: 50% of field, capped at 12)
  useEffect(() => {
    if (!raceActive || isTimeTrial || graceTriggeredRef.current || totalRacers <= 0) return;
    if (finishedRacers.length >= requiredFinishersThreshold && !raceFinishGraceStartTime) {
      graceTriggeredRef.current = true;
      soundEffects.playUrgencyTick();
      onTriggerGrace();
    }
  }, [finishedRacers.length, totalRacers, raceActive, isTimeTrial, raceFinishGraceStartTime, requiredFinishersThreshold, onTriggerGrace]);

  const currentPodiumRef = useRef<PodiumFinisher[]>(currentPodium);
  currentPodiumRef.current = currentPodium;

  const onFinishRaceRef = useRef(onFinishRace);
  onFinishRaceRef.current = onFinishRace;

  // End race when Time Trial expires or Grace expires or all finished
  useEffect(() => {
    if (!raceActive || finishTriggeredRef.current) return;

    if (isTimeTrial && isTimeTrialExpired) {
      finishTriggeredRef.current = true;
      // 700ms grace period so student final cumulative scores land safely in RTDB
      setTimeout(() => {
        onFinishRaceRef.current(currentPodiumRef.current);
      }, 700);
    } else if (!isTimeTrial) {
      const allFinished = totalRacers > 0 && finishedRacers.length >= totalRacers;
      if (allFinished || (raceFinishGraceStartTime && isGraceExpired)) {
        finishTriggeredRef.current = true;
        setTimeout(() => {
          onFinishRaceRef.current(currentPodiumRef.current);
        }, 500);
      }
    }
  }, [raceActive, isTimeTrial, isTimeTrialExpired, totalRacers, finishedRacers.length, raceFinishGraceStartTime, isGraceExpired]);

  // Manual End Race handler
  const handleForceEnd = () => {
    if (finishTriggeredRef.current) return;
    finishTriggeredRef.current = true;
    onFinishRaceRef.current(currentPodiumRef.current);
  };

  const handleForceEndRef = useRef(handleForceEnd);
  handleForceEndRef.current = handleForceEnd;

  // Universal presentation clicker hook for advance/finish
  useClassroomClicker({
    onNext: handleForceEnd
  });

  // Formatting helper for stopwatch (00:00.0)
  const formatTimeMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white select-none relative overflow-hidden">
      {/* 1. Sleek Zero-Wrap F1 Broadcast Top Bar */}
      <div className="h-13 px-3 sm:px-4 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0 flex-nowrap whitespace-nowrap z-30">
        {/* Left: Brand + PIN */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center text-base font-black shadow-md shrink-0">
            🏎️
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5 whitespace-nowrap">
              <span>{t('EIGO GP', 'エイゴ GP')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-black whitespace-nowrap">
                {isTimeTrial ? t('TIME TRIAL', 'タイムアタック') : t('SPRINT', 'スプリント')}
              </span>
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/80 whitespace-nowrap">
              PIN: {roomCode}
            </span>
          </div>
        </div>

        {/* Center: Unified F1 Telemetry LCD Cluster */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
          {/* Race Flag Pill */}
          <div className={`px-2.5 sm:px-3 py-1 rounded-xl flex items-center gap-1.5 border font-black text-xs shadow-sm whitespace-nowrap ${
            raceFinishGraceStartTime
              ? 'bg-amber-950/90 border-amber-400 text-amber-200 animate-pulse'
              : raceActive
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}>
            <Flag size={13} className={raceFinishGraceStartTime ? 'text-amber-400 animate-bounce' : raceActive ? 'text-emerald-400' : ''} />
            <span>
              {raceFinishGraceStartTime 
                ? `⚠️ ${t('FINAL SPRINT: ', 'ラストスパート: ')}${graceRemainingSeconds}s`
                : raceActive 
                  ? (totalCircuitLaps > 1 ? `🟢 LAP 1/${totalCircuitLaps}` : t('🟢 RACING', '🟢 レース中'))
                  : t('🔴 GRID', '🔴 整列中')}
            </span>
          </div>

          {/* Master Race Clock LCD */}
          <div className="bg-black/90 text-emerald-400 font-mono px-3 sm:px-3.5 py-1 rounded-xl border border-slate-800 shadow-inner flex items-center gap-1.5 whitespace-nowrap">
            <Clock size={14} className="text-emerald-500" />
            <span className="text-base sm:text-lg font-black tracking-widest">
              {isTimeTrial ? formatTimeMs(timeTrialRemainingMs) : formatTimeMs(elapsedMs)}
            </span>
          </div>

          {/* Finishers Counter Pill */}
          <div className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-slate-300 whitespace-nowrap">
            <span className="text-emerald-400 font-black">{finishedRacers.length}</span>
            <span>/ {totalRacers} {t('FIN', '名完走')}</span>
          </div>
        </div>

        {/* Right: Sound, View Switcher & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          {/* BGM Controls Pill */}
          {bgmTrackTitle && (
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm whitespace-nowrap transition-all ${
              raceFinishGraceStartTime
                ? 'bg-amber-950/90 border-amber-500 text-amber-200 animate-pulse'
                : finishedRacers.length > 0
                  ? 'bg-indigo-950/90 border-indigo-500/80 text-indigo-100'
                  : 'bg-slate-900/90 border-slate-800 text-white'
            }`}>
              <Music size={13} className={raceFinishGraceStartTime ? 'text-amber-400 animate-spin' : isBgmMuted ? 'text-slate-500' : 'text-indigo-400 animate-bounce'} />
              <span className="max-w-[100px] lg:max-w-[130px] truncate font-bold text-[11px]">
                {bgmTrackTitle}
              </span>
              {finishedRacers.length > 0 && (
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-black ${
                  raceFinishGraceStartTime ? 'text-amber-300 bg-amber-900/80 animate-bounce' : 'text-emerald-400 bg-emerald-950/80'
                }`}>
                  {raceFinishGraceStartTime ? '1.25x' : `${(bgmPlaybackRate || 1.0).toFixed(2)}x`}
                </span>
              )}
              {onToggleBgmMute && (
                <button
                  type="button"
                  onClick={onToggleBgmMute}
                  className={`p-1 rounded-lg transition-all cursor-pointer ${
                    isBgmMuted ? 'text-rose-400 hover:bg-rose-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                  title={isBgmMuted ? 'Unmute BGM' : 'Mute BGM'}
                >
                  {isBgmMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
              )}
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setTrackView('CIRCUIT')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                trackView === 'CIRCUIT'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t('Show Suzuka Circuit Map', '鈴鹿サーキットマップを表示')}
            >
              <span>🗺️</span>
              <span className="hidden sm:inline">{t('Suzuka', '鈴鹿')}</span>
            </button>
            <button
              type="button"
              onClick={() => setTrackView('LANES')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                trackView === 'LANES'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t('Show Straightaway Sprint Lanes', '直線レーンを表示')}
            >
              <span>🏎️</span>
              <span className="hidden sm:inline">{t('Lanes', '直線')}</span>
            </button>
          </div>

          {/* Quick Bots Injector */}
          {onAddBots && totalRacers <= 2 && (
            <button
              onClick={() => onAddBots(40)}
              className="px-2.5 py-1.5 rounded-xl font-bold text-xs text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title={t('Spawn 40 test bots into race', 'テスト用ボットを40体投入')}
            >
              <span>🤖</span>
              <span>+40</span>
            </button>
          )}

          {/* Force End / Checkered Flag */}
          <button
            onClick={handleForceEnd}
            className="px-3 py-1.5 rounded-xl font-black text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Square size={11} fill="white" />
            <span>{t('FINISH', 'チェッカー終了')}</span>
          </button>

          {/* Exit */}
          {onExit && (
            <button
              onClick={() => {
                if (window.confirm(t('End race early and disband room?', 'レースを終了して解散しますか？'))) {
                  onExit();
                }
              }}
              className="px-2.5 py-1.5 rounded-xl font-bold text-xs text-rose-400 bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/80 shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title={t('End race and disband room', 'レースを終了して解散')}
            >
              <span>{t('✕ Exit', '✕ 終了')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Full-Screen Starting Lights Overlay Modal (Auto-closes when race begins) */}
      {showStartLights && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200 select-none pointer-events-none">
          <div className="w-[96vw] max-w-4xl bg-slate-900/95 border-4 border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Top Gantry Banner */}
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <span className="text-3xl sm:text-5xl">🏎️</span>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-black tracking-widest text-amber-400 uppercase">
                  {t('FORMULA EIGO GRAND PRIX', 'エイゴ グランプリ 公式スタート進行')}
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-0.5">
                  {t('START PROCEDURE', 'シグナル スタート')}
                </h3>
              </div>
              <span className="text-3xl sm:text-5xl">🏁</span>
            </div>

            {/* 5 Light Columns Gantry */}
            <div className="flex items-center gap-4 sm:gap-7 p-6 sm:p-9 rounded-2xl bg-black/85 border-2 border-slate-800 shadow-inner">
              {[1, 2, 3, 4, 5].map((idx) => {
                const isOn = lightsCount >= idx;
                const isGreen = lightsCount === 6;
                return (
                  <div key={idx} className="flex flex-col items-center gap-3">
                    <div
                      className={`w-14 h-14 sm:w-22 sm:h-22 rounded-full border-4 sm:border-6 transition-all duration-100 flex items-center justify-center ${
                        isGreen
                          ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_40px_#10b981]'
                          : isOn
                            ? 'bg-rose-600 border-rose-400 shadow-[0_0_35px_#ef4444]'
                            : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {/* Inner Lens Reflection */}
                      <div className={`w-4 h-4 sm:w-7 sm:h-7 rounded-full ${
                        isGreen ? 'bg-emerald-200' : isOn ? 'bg-rose-300' : 'bg-slate-900'
                      }`} />
                    </div>
                    {/* Mounting Pylon */}
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-slate-800 border border-slate-700" />
                  </div>
                );
              })}
            </div>

            {/* Status Announcement Banner */}
            <div className="mt-6 sm:mt-8 text-center min-h-[50px] flex items-center justify-center">
              <span className={`text-xl sm:text-3xl font-black tracking-wide ${
                lightsCount === 6
                  ? 'text-emerald-400 animate-bounce'
                  : lightsCount === 5
                    ? 'text-rose-400 animate-pulse'
                    : 'text-slate-300'
              }`}>
                {lightsCount < 5
                  ? t('DRIVERS ON GRID... WAITING FOR SIGNALS', '各車グリッドに整列中...')
                  : lightsCount === 5
                    ? t('GET READY...', '構えて...')
                    : t('🟢 LIGHTS OUT AND AWAY WE GO! 🟢', '🟢 スタート！ 🟢')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Race Stage: Full-Bleed Suzuka Circuit Map OR Straightaway Sprint Lanes */}
      {trackView === 'CIRCUIT' ? (
        <div className="flex-1 w-full min-h-0 overflow-hidden flex flex-col">
          <SuzukaCircuitMap
            sortedRacers={sortedRacers}
            totalQuestions={totalQuestions}
            isTimeTrial={isTimeTrial}
            totalRacers={totalRacers}
            finishedRacers={finishedRacers}
            raceFinishGraceStartTime={raceFinishGraceStartTime}
            graceRemainingSeconds={graceRemainingSeconds}
          />
        </div>
      ) : (
        <div className="flex-1 w-full flex flex-col bg-slate-900 p-4 overflow-hidden relative min-h-0">
          {/* Track Header Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                🏁 {t('LIVE CIRCUIT VIEW', 'サーキットコース')}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {finishedRacers.length} / {totalRacers} {t('Finished', '名完走')}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Sector 1</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                <span>Sector 2</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Finish 🏁</span>
              </span>
            </div>
          </div>

          {/* Multi-lane asphalt racetrack */}
          <div className="flex-1 flex flex-col justify-around relative py-2 overflow-y-auto space-y-2.5 pr-1">
            {/* Start Line Overlay */}
            <div className="absolute top-0 bottom-0 left-[3%] w-0.5 border-r-2 border-dashed border-white/20 pointer-events-none" />
            {/* 50% Mid Sector Line */}
            <div className="absolute top-0 bottom-0 left-[50%] w-0.5 border-r border-dashed border-white/10 pointer-events-none" />
            {/* Checkered Finish Line */}
            <div className="absolute top-0 bottom-0 right-[4%] w-3 bg-[repeating-linear-gradient(45deg,#fff,#fff_4px,#000_4px,#000_8px)] opacity-60 rounded-xs pointer-events-none" />

            {sortedRacers.slice(0, 12).map((racer, index) => {
              const currentProgress = racer.sprintProgress || 0;
              const progressPct = isTimeTrial
                ? Math.min(95, Math.max(2, (((racer.correctCount || 0) / Math.max(1, totalQuestions))) * 90))
                : Math.min(95, Math.max(2, (currentProgress / Math.max(1, totalQuestions)) * 90));

              const isFinished = racer.isFinished;
              const hasStreak = (racer.currentStreak || 0) >= 3;

              let kartColor = 'bg-indigo-500';
              if (racer.teamId && TEAM_PRESETS[racer.teamId]) {
                kartColor = TEAM_PRESETS[racer.teamId].bg;
              }

              return (
                <div key={racer.id} className="relative h-12 bg-[#141923] rounded-2xl border-2 border-slate-700 flex items-center px-3 overflow-hidden shadow-inner my-0.5">
                  {/* Red/White Kerb Rumble Strips (Top & Bottom Edge) */}
                  <div 
                    className="absolute top-0 inset-x-0 h-1 z-0 pointer-events-none"
                    style={{ background: 'repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 14px, #ffffff 14px, #ffffff 28px)' }}
                  />
                  <div 
                    className="absolute bottom-0 inset-x-0 h-1 z-0 pointer-events-none"
                    style={{ background: 'repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 14px, #ffffff 14px, #ffffff 28px)' }}
                  />
                  {/* Driver Telemetry on the left */}
                  <div className="absolute left-2.5 z-10 flex items-center gap-2 pointer-events-none">
                    <span className="font-mono text-xs font-black w-6 text-slate-400">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `P${index + 1}`}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white/95 truncate max-w-[150px] drop-shadow-sm">
                      {racer.nickname}
                    </span>
                    {hasStreak && (
                      <span className="text-[10px] font-black text-amber-400 flex items-center gap-0.5 bg-amber-950/70 px-1.5 py-0.5 rounded-full border border-amber-800/80">
                        <Flame size={11} className="text-amber-500 animate-pulse" />
                        <span>x{racer.currentStreak}</span>
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400 font-bold hidden sm:inline">
                      {racer.score.toLocaleString()} pts
                    </span>
                    {!racer.isFinished && !isTimeTrial && (
                      <span className="text-[10px] font-mono text-indigo-300 font-bold hidden md:inline bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/60">
                        L{racer.sprintProgress || 0}/{totalQuestions}
                      </span>
                    )}
                  </div>

                  {/* Racer Car / Kart moving along track */}
                  <div
                    className="absolute z-20 flex items-center gap-1 transition-all duration-300 ease-out"
                    style={{ left: `${(!isTimeTrial && isFinished) ? 92 : progressPct}%` }}
                  >
                    {/* Flame Trail for high streaks */}
                    {hasStreak && !isFinished && (
                      <span className="text-xs -mr-1 animate-pulse">🔥</span>
                    )}

                    {/* Styled Race Kart Icon */}
                    <div className={`w-8 h-8 rounded-xl ${kartColor} border-2 border-white/80 shadow-lg flex items-center justify-center text-sm font-black text-white transform hover:scale-110 transition-transform`}>
                      {(!isTimeTrial && isFinished) || (isTimeTrial && isTimeTrialExpired) ? (
                        index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏁'
                      ) : (
                        '🏎️'
                      )}
                    </div>

                    {/* Finish Badge */}
                    {isFinished && (
                      <div className="bg-emerald-500 text-white font-mono text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">
                        {racer.finishTimeMs ? `${(racer.finishTimeMs / 1000).toFixed(1)}s` : (isTimeTrial ? `${racer.correctCount || 0}${t(' Qs', '問')}` : 'FIN')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {totalRacers === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs font-bold">
                <span>{t('Waiting for drivers to join lobby...', 'ドライバーの参加を待っています...')}</span>
              </div>
            )}
          </div>

          {/* Bottom Track Banner */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 shrink-0">
            <span>
              🏁 {t(
                `Top 3 take the Podium 🥇🥈🥉 • Final sprint countdown begins after ${requiredFinishersThreshold} Finisher${requiredFinishersThreshold > 1 ? 's' : ''}`,
                `上位3名が表彰台確定 🥇🥈🥉 • ${requiredFinishersThreshold}名完走でラストスパート開始`
              )}
            </span>
            <span>{t('Teacher: Press', '先生用:')} <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[10px]">Space</kbd> {t('to finish', 'で終了')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
