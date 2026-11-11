import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QuizQuestion, QuizPlayer, TeamId, TEAM_PRESETS, PodiumFinisher, SprintSettings } from '../types';
import { Suzuka3DStage, RacerState, RacerTelemetry, CameraViewMode, LANE_DRIVING, LANE_PASSING } from '@/games/suzuka_grand_prix/Suzuka3DStage';
import { SUZUKA_CIRCUIT_LENGTH_METERS } from '@/games/suzuka_grand_prix/engine/Suzuka3DEngine';
import { getKartTheme, KART_THEME_LIST, resolveRacerNumber } from '@/games/suzuka_grand_prix/kartPresets';
import { suzukaAudio } from '@/games/suzuka_grand_prix/services/suzukaAudio';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { detectClassroomGpuProfile } from '@/utils/classroom3d';
import {
  Flag,
  Clock,
  Users,
  Trophy,
  Tv,
  Music,
  Volume2,
  VolumeX,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const RACER_COLOR_PALETTE = [
  0xef4444, // Red
  0x3b82f6, // Blue
  0x10b981, // Emerald
  0xf59e0b, // Amber
  0xa855f7, // Purple
  0xec4899, // Pink
  0x06b6d4, // Cyan
  0xf97316, // Orange
  0x84cc16, // Lime
  0x6366f1, // Indigo
];

const TEAM_HEX_MAP: Record<TeamId, number> = {
  team_red: 0xef4444,
  team_white: 0xf8fafc,
  team_blue: 0x3b82f6,
  team_green: 0x10b981,
  team_yellow: 0xfacc15,
  team_orange: 0xf97316,
  team_purple: 0x9333ea,
  team_indigo: 0x6366f1,
  team_violet: 0x8b5cf6,
};

interface QuizHostGrandPrix3DProps {
  roomCode: string;
  questions: QuizQuestion[];
  players: Record<string, QuizPlayer>;
  raceStartTime: number;
  sprintSettings?: SprintSettings;
  raceFinishGraceStartTime?: number;
  isLobby?: boolean;
  eyesUp?: boolean;
  onToggleEyesUp?: () => void;
  onTriggerGrace: () => void;
  onFinishRace: (podium: PodiumFinisher[]) => void;
  onExit?: () => void;
  onAddBots?: (count: number) => void;
  bgmTrackTitle?: string | null;
  isBgmMuted?: boolean;
  onToggleBgmMute?: () => void;
}

export const QuizHostGrandPrix3D: React.FC<QuizHostGrandPrix3DProps> = ({
  roomCode,
  questions,
  players,
  raceStartTime,
  sprintSettings,
  raceFinishGraceStartTime,
  isLobby = false,
  eyesUp,
  onToggleEyesUp,
  onTriggerGrace,
  onFinishRace,
  onExit,
  onAddBots,
  bgmTrackTitle,
  isBgmMuted,
  onToggleBgmMute,
}) => {
  const { t, language } = useLanguage();
  const isTimeTrial = sprintSettings?.sprintMode === 'TIME_TRIAL';
  const targetLaps = sprintSettings?.targetLaps3D || 1;
  const timeLimitSeconds = sprintSettings?.timeLimitSeconds || 90;
  const graceSeconds = sprintSettings?.graceCountdownSeconds || 15;

  const [cameraMode, setCameraMode] = useState<CameraViewMode>('DIRECTOR');
  const [performanceProfile, setPerformanceProfile] = useState<'MOBILE' | 'DESKTOP_HD'>(() => {
    if (typeof navigator !== 'undefined') {
      const gpu = detectClassroomGpuProfile();
      if (gpu.isLowPower) return 'MOBILE';
    }
    return 'DESKTOP_HD';
  });
  const [liveTelemetry, setLiveTelemetry] = useState<RacerTelemetry[]>([]);

  // Race start lights sequence (5 red lights -> green flag at raceStartTime + 2400ms)
  // Brisk 400ms per light: 0.4s (1), 0.8s (2), 1.2s (3), 1.6s (4), 2.0s (5), 2.4s (Green Flag!)
  const greenFlagTime = raceStartTime + 2400;
  const [nowTime, setNowTime] = useState<number>(() => getServerTime());

  const graceTriggeredRef = useRef<boolean>(false);
  const finishTriggeredRef = useRef<boolean>(false);

  const elapsedSinceStart = Math.max(0, nowTime - raceStartTime);
  const lightsCount = isLobby ? 0 : (elapsedSinceStart >= 2400 ? 6 : Math.max(0, Math.floor(elapsedSinceStart / 400)));
  const raceActive = !isLobby && elapsedSinceStart >= 2400;

  useEffect(() => {
    // Dynamic refresh rate: 100ms during start lights countdown for crisp 400ms light changes,
    // switching to 500ms (2 Hz) once race is active to prevent React main-thread choking on host TV/iPad
    const intervalMs = raceActive ? 500 : 100;
    const clock = setInterval(() => {
      setNowTime(getServerTime());
    }, intervalMs);
    return () => clearInterval(clock);
  }, [raceActive]);

  useEffect(() => {
    return () => {
      suzukaAudio.stopAll();
    };
  }, []);

  // Countdown beeps on light changes
  const prevLightsRef = useRef<number>(lightsCount);
  useEffect(() => {
    if (!isLobby && lightsCount > prevLightsRef.current) {
      if (lightsCount <= 5 && lightsCount > 0) {
        soundEffects.playRaceCountdownBeep(false);
      } else if (lightsCount === 6) {
        soundEffects.playRaceCountdownBeep(true);
      }
    }
    prevLightsRef.current = lightsCount;
  }, [lightsCount, isLobby]);

  const elapsedMs = raceActive ? Math.max(0, nowTime - greenFlagTime) : 0;
  const timeTrialRemainingMs = isTimeTrial
    ? raceActive
      ? Math.max(0, timeLimitSeconds * 1000 - elapsedMs)
      : timeLimitSeconds * 1000
    : 0;
  const isTimeTrialExpired = isTimeTrial && raceActive && timeTrialRemainingMs <= 0;

  const graceElapsedMs = raceFinishGraceStartTime ? Math.max(0, nowTime - raceFinishGraceStartTime) : 0;
  const graceRemainingSeconds = raceFinishGraceStartTime
    ? Math.max(0, Math.ceil((graceSeconds * 1000 - graceElapsedMs) / 1000))
    : graceSeconds;
  const isGraceExpired = raceFinishGraceStartTime ? graceElapsedMs >= graceSeconds * 1000 : false;

  const playerList = useMemo(() => Object.values(players), [players]);

  // Convert Eigo Arena players into 3D RacerStates
  const racers3D: RacerState[] = useMemo(() => {
    return playerList.map((p, idx) => {
      const customTheme = getKartTheme(p.kartTheme || KART_THEME_LIST[idx % KART_THEME_LIST.length].id);
      const colorHex = p.teamId && TEAM_HEX_MAP[p.teamId]
        ? TEAM_HEX_MAP[p.teamId]
        : customTheme.colorHex;

      // Derive speed from live speedKmh if reported, or from currentStreak/correctCount
      const streak = p.currentStreak || 0;
      const fallbackSpeed = p.isFinished
        ? 80
        : (p.totalAnswered || 0) === 0
        ? 0
        : Math.min(175, 75 + streak * 25);
      const speedKmh = p.speedKmh !== undefined ? p.speedKmh : fallbackSpeed;

      const racerNum = resolveRacerNumber(p, idx);
      return {
        id: p.id,
        name: p.nickname,
        number: racerNum,
        teamId: p.teamId,
        colorHex,
        stripeHex: customTheme.stripeHex,
        rimHex: customTheme.rimHex,
        suitHex: customTheme.suitHex,
        helmetHex: customTheme.helmetHex,
        visorHex: customTheme.visorHex,
        speedKmh,
        targetSpeedKmh: speedKmh,
        streak,
        isFinished: !!p.isFinished,
        inPitStop: !!p.inPitStop,
        laneOffset: idx % 2 === 0 ? LANE_DRIVING : LANE_PASSING,
        isBoosting: speedKmh >= 145 || streak >= 3,
        authoritativeDistanceMeters: p.id.startsWith('bot_') ? undefined : p.distanceMeters,
      };
    });
  }, [playerList]);

  // Leaderboard sorted by 3D telemetry distance + finished status
  const sortedStandings = useMemo(() => {
    const telemetryMap = new Map<string, RacerTelemetry>();
    liveTelemetry.forEach((tItem) => telemetryMap.set(tItem.id, tItem));

    return [...playerList]
      .map((p, idx) => {
        const telem = telemetryMap.get(p.id);
        const dist = telem?.distanceMeters ?? p.distanceMeters ?? (p.correctCount || 0) * 95;
        const progress = telem?.progress ?? (dist > 0 ? dist / SUZUKA_CIRCUIT_LENGTH_METERS : 0);
        const speed = Math.round(telem?.speedKmh ?? p.speedKmh ?? 0);
        const customTheme = getKartTheme(p.kartTheme || KART_THEME_LIST[idx % KART_THEME_LIST.length].id);
        const colorHex = p.teamId && TEAM_HEX_MAP[p.teamId]
          ? TEAM_HEX_MAP[p.teamId]
          : customTheme.colorHex;

        return {
          player: p,
          number: resolveRacerNumber(p, idx),
          colorHex,
          distanceMeters: dist,
          progress,
          lap: Math.min(targetLaps, Math.max(1, Math.floor(progress) + 1)),
          speedKmh: speed,
        };
      })
      .sort((a, b) => {
        if (!isTimeTrial) {
          const aFinished = a.player.isFinished || a.progress >= targetLaps;
          const bFinished = b.player.isFinished || b.progress >= targetLaps;
          if (aFinished && !bFinished) return -1;
          if (!aFinished && bFinished) return 1;
          if (aFinished && bFinished) {
            return (a.player.finishTimeMs || 999999) - (b.player.finishTimeMs || 999999);
          }
        }
        if (Math.abs(b.distanceMeters - a.distanceMeters) > 1) {
          return b.distanceMeters - a.distanceMeters;
        }
        return (b.player.score || 0) - (a.player.score || 0);
      });
  }, [playerList, liveTelemetry, isTimeTrial, targetLaps]);

  const finishedRacers = useMemo(
    () => sortedStandings.filter((s) => s.player.isFinished || (!isTimeTrial && s.progress >= targetLaps)),
    [sortedStandings, isTimeTrial, targetLaps]
  );

  // Trigger grace countdown when enough racers finish in Lap Race
  const graceTriggerCount =
    playerList.length > 1 ? Math.min(12, Math.max(1, Math.ceil(playerList.length * 0.5))) : 1;

  useEffect(() => {
    if (
      !isTimeTrial &&
      raceActive &&
      playerList.length > 1 &&
      finishedRacers.length >= graceTriggerCount &&
      finishedRacers.length < playerList.length &&
      !raceFinishGraceStartTime &&
      !graceTriggeredRef.current
    ) {
      graceTriggeredRef.current = true;
      onTriggerGrace();
    }
  }, [isTimeTrial, raceActive, playerList.length, finishedRacers.length, graceTriggerCount, raceFinishGraceStartTime, onTriggerGrace]);

  const handleManualOrAutoFinish = () => {
    if (finishTriggeredRef.current) return;
    finishTriggeredRef.current = true;
    const podium: PodiumFinisher[] = sortedStandings.slice(0, 3).map((s, idx) => ({
      playerId: s.player.id,
      nickname: s.player.nickname,
      finishTimeMs: s.player.finishTimeMs || elapsedMs,
      rank: idx + 1,
      teamId: s.player.teamId,
      correctCount: s.player.correctCount || 0,
      totalAnswered: s.player.totalAnswered || 0,
    }));
    onFinishRace(podium);
  };

  // Auto-end race when grace timer expires, all racers finish, or time trial ends
  useEffect(() => {
    if (!raceActive || finishTriggeredRef.current) return;
    const allFinished = !isTimeTrial && playerList.length > 0 && finishedRacers.length >= playerList.length;
    if (isGraceExpired || allFinished || isTimeTrialExpired) {
      handleManualOrAutoFinish();
    }
  }, [raceActive, isTimeTrial, playerList.length, finishedRacers.length, isGraceExpired, isTimeTrialExpired]);

  const formatTimer = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <div
      className={`fixed inset-0 w-screen h-dvh flex flex-col bg-slate-950 text-white overflow-hidden select-none ${
        isLobby ? 'pointer-events-none z-0' : 'z-40'
      }`}
    >
      {/* Top Broadcast Control Bar */}
      {!isLobby && (
        <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-5 flex items-center justify-between shrink-0 z-30">
          {/* Left: Title, Room PIN & Race Mode */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl">🏎️</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-black text-white tracking-tight">
                {t('3D Suzuka Grand Prix', '3D 鈴鹿グランプリ')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-xs shadow-xs">
                PIN: {roomCode}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 font-black text-xs flex items-center gap-1">
                <Flag size={11} />
                <span>
                  {isTimeTrial
                    ? t(`Time Trial (${timeLimitSeconds}s)`, `タイムアタック (${timeLimitSeconds}秒)`)
                    : t(`${targetLaps}-Lap Race`, `${targetLaps}周レース`)}
                </span>
              </span>
            </div>
          </div>

          {/* Center: Live Race Stopwatch / Countdown */}
          <div className="flex items-center gap-2 shrink-0">
            {raceFinishGraceStartTime && !isTimeTrial ? (
              <div className="px-3.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs sm:text-sm flex items-center gap-2 animate-pulse shadow-lg">
                <Clock size={15} />
                <span>
                  {t(`FINAL COUNTDOWN: ${graceRemainingSeconds}s`, `終了カウントダウン: 残り${graceRemainingSeconds}秒`)}
                </span>
              </div>
            ) : (
              <div className="px-3.5 py-1 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-sm sm:text-base text-amber-400 flex items-center gap-2">
                <Clock size={15} className="text-amber-400" />
                <span>{isTimeTrial ? formatTimer(timeTrialRemainingMs) : formatTimer(elapsedMs)}</span>
              </div>
            )}
          </div>

          {/* Right: Host Action Controls (+5 Bots, Eyes Up, BGM, Finish Race, Exit) */}
          <div className="flex items-center gap-2 shrink-0">
            {onAddBots && (
              <button
                type="button"
                onClick={() => onAddBots(5)}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                title="Add 5 AI Bot Racers"
              >
                <Users size={13} />
                <span>+5 Bots</span>
              </button>
            )}

            {onToggleEyesUp && (
              <button
                type="button"
                onClick={onToggleEyesUp}
                className={`px-2.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${
                  eyesUp
                    ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                }`}
              >
                <span>👀</span>
                <span className="hidden md:inline">{eyesUp ? t('Eyes Up ON', '注目中') : t('Eyes Up', '全員注目')}</span>
              </button>
            )}

            {onToggleBgmMute && (
              <button
                type="button"
                onClick={onToggleBgmMute}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                title={bgmTrackTitle || 'BGM'}
              >
                <Music size={14} className="text-indigo-400" />
                {isBgmMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-emerald-400" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleManualOrAutoFinish}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
            >
              <Flag size={13} />
              <span>{t('Finish Race', 'レース終了・表彰台へ')}</span>
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-black text-xs cursor-pointer transition-all active:scale-95"
              >
                {t('Exit', '終了')}
              </button>
            )}
          </div>
        </header>
      )}

      {/* Main 3D Broadcast Stage */}
      <main className="flex-1 w-full h-full min-h-0 flex relative overflow-hidden">
        {/* Top-Left & Top-Right Floating Camera & Start Lights Bar */}
        {!isLobby && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center flex-wrap gap-1 p-1 rounded-xl bg-slate-950/88 backdrop-blur-md border border-slate-800 pointer-events-auto shadow-xl text-xs font-black">
              <span className="text-amber-400 px-2 flex items-center gap-1 shrink-0">
                <Tv size={12} />
                <span>TV CAM:</span>
              </span>
              {([
                { mode: 'DIRECTOR', label: '🎬 AI Director' },
                { mode: 'BATTLE', label: '⚔️ Battle Cam' },
                { mode: 'LEADER', label: '🏎️ Leader' },
                { mode: 'DRONE', label: '🚁 Pack Heli' },
                { mode: 'ISOMETRIC', label: '🗺️ Overhead' },
              ] as { mode: CameraViewMode; label: string }[]).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCameraMode(mode)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    cameraMode === mode
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-800 mx-0.5" />

              <select
                value={
                  ['MAIN_STRAIGHT', 'S_CURVES', 'DEGNER', 'HAIRPIN', 'SPOON', 'BRIDGE', '130R', 'CHICANE'].includes(
                    cameraMode
                  )
                    ? cameraMode
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) setCameraMode(e.target.value as CameraViewMode);
                }}
                aria-label="Fixed Landmark Camera"
                className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all outline-none border ${
                  ['MAIN_STRAIGHT', 'S_CURVES', 'DEGNER', 'HAIRPIN', 'SPOON', 'BRIDGE', '130R', 'CHICANE'].includes(
                    cameraMode
                  )
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  📹 Landmark Cams...
                </option>
                <option value="MAIN_STRAIGHT" className="bg-slate-900 text-white">
                  🏁 Main Straight & Grandstand
                </option>
                <option value="S_CURVES" className="bg-slate-900 text-white">
                  🐍 S-Curves (Esses)
                </option>
                <option value="DEGNER" className="bg-slate-900 text-white">
                  🌉 Degner Underpass
                </option>
                <option value="HAIRPIN" className="bg-slate-900 text-white">
                  🔄 180° Hairpin
                </option>
                <option value="SPOON" className="bg-slate-900 text-white">
                  🥄 Spoon Curve
                </option>
                <option value="BRIDGE" className="bg-slate-900 text-white">
                  🌉 Overpass Bridge
                </option>
                <option value="130R" className="bg-slate-900 text-white">
                  💨 130R High-Speed
                </option>
                <option value="CHICANE" className="bg-slate-900 text-white">
                  🎡 Casio Chicane & Ferris Wheel
                </option>
              </select>

              <div className="h-4 w-px bg-slate-800 mx-0.5" />

              <button
                type="button"
                onClick={() => setPerformanceProfile((p) => (p === 'MOBILE' ? 'DESKTOP_HD' : 'MOBILE'))}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  performanceProfile === 'MOBILE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={performanceProfile === 'MOBILE' ? 'Smooth 60 FPS iPad/TV Mode (Active)' : 'HD 3D Mode (Active)'}
              >
                <span>{performanceProfile === 'MOBILE' ? '⚡ 60 FPS' : '💎 HD'}</span>
              </button>
            </div>

            {/* Start Lights Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-xl flex items-center gap-2 pointer-events-auto">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full border transition-all ${
                      lightsCount === 6
                        ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_8px_#10b981]'
                        : lightsCount >= idx
                        ? 'bg-rose-600 border-rose-400 shadow-[0_0_6px_#ef4444]'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-black text-white">
                {lightsCount === 6 ? '🟢 GREEN FLAG' : 'START PROCEDURE'}
              </span>
            </div>
          </div>
        )}

        {/* 3D Suzuka Broadcast Viewport */}
        <Suzuka3DStage
          mode="BROADCAST"
          cameraMode={cameraMode}
          activeRacerId={sortedStandings[0]?.player.id}
          racers={racers3D}
          lightsCount={lightsCount}
          hideSectorBadge={isLobby}
          performanceProfile={performanceProfile}
          onTelemetryUpdate={setLiveTelemetry}
          className="flex-1 w-full h-full min-h-0"
        />

        {/* Live Broadcast Leaderboard Ticker (Bottom-Left) */}
        {!isLobby && (
          <div className="absolute bottom-3 left-3 z-20 w-72 bg-slate-950/88 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl pointer-events-none">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2 text-xs font-black">
              <span className="text-amber-400 flex items-center gap-1.5">
                <Trophy size={13} />
                <span>LIVE STANDINGS</span>
              </span>
              <span className="text-slate-400 text-[11px]">{playerList.length} Racers</span>
            </div>

            <div className="space-y-1 max-h-64 overflow-hidden">
              {sortedStandings.slice(0, 8).map((item, rank) => (
                <div
                  key={item.player.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs font-bold ${
                    rank === 0
                      ? 'bg-amber-500/20 border border-amber-400/80 text-amber-300 font-black'
                      : 'bg-slate-900/70 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 w-5 shrink-0">P{rank + 1}</span>
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: `#${item.colorHex.toString(16).padStart(6, '0')}` }}
                    />
                    <span className="truncate">#{item.number} {item.player.nickname}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    {item.player.isFinished ? (
                      <span className="text-emerald-400 font-black flex items-center gap-0.5">
                        <CheckCircle2 size={11} />
                        <span>FIN</span>
                      </span>
                    ) : (
                      <>
                        <span className="text-cyan-400">{item.speedKmh}km/h</span>
                        <span className="text-slate-400">
                          {isTimeTrial ? `${item.player.correctCount || 0}Q` : `L${item.lap}/${targetLaps}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

