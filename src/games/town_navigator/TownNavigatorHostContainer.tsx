import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Compass,
  Eye,
  Map as MapIcon,
  RotateCcw,
  Settings,
  Trophy,
  Volume2,
  Flag,
  LogOut,
  Zap,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { getServerTime, safeRemove } from '@/services/rtdbSafe';
import { QuizHostLobby } from '../quiz/host/QuizHostLobby';
import { useTownRoom, getPlayerColor } from './multiplayer/useTownRoom';
import { DEFAULT_TOWN_SETTINGS, TownCameraMode, TownGameSettings } from './multiplayer/types';
import { Town3DStage, LiveAvatarPose } from './Town3DStage';
import { Town2DMap, Town2DPlayerMarker } from './Town2DMap';
import { TownNavigatorSettingsModal } from './TownNavigatorSettingsModal';

interface TownNavigatorHostContainerProps {
  onExit: () => void;
}

export const TownNavigatorHostContainer: React.FC<TownNavigatorHostContainerProps> = ({ onExit }) => {
  const { language: lang } = useLanguage();
  const { activeSchool, activeClassId } = useClassroom();
  const { isMuted } = useAudio();

  const {
    roomCode,
    room,
    townState,
    players,
    telemetry,
    layout,
    replayRecording,
    isCreating,
    createRoom,
    updateSettings,
    startRound,
    finishRound,
    nextRoundOrFinish,
    spawnBots,
    closeRoom,
  } = useTownRoom({
    role: 'HOST',
    schoolId: activeSchool || 'futakotamagawa',
    classId: activeClassId || undefined,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replayTrigger, setReplayTrigger] = useState(0);
  const [nowMs, setNowMs] = useState(() => getServerTime());

  // Auto-create room on mount
  const createdRef = useRef(false);
  useEffect(() => {
    if (!createdRef.current && !roomCode && !isCreating) {
      createdRef.current = true;
      createRoom(DEFAULT_TOWN_SETTINGS);
    }
  }, [roomCode, isCreating, createRoom]);

  // 250ms UI clock for smooth countdowns
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(getServerTime()), 250);
    return () => window.clearInterval(id);
  }, []);

  // TTS read-aloud of directions when a new BRIEFING starts
  const lastSpokenRoundRef = useRef<number>(-1);
  const speakDirections = (startNameEn: string, stepsEn: string[]) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = `Start at the ${startNameEn}. ${stepsEn.join(' ')}`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-US';
      utter.rate = 0.92;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors on restricted browsers
    }
  };

  useEffect(() => {
    if (
      townState?.phase === 'BRIEFING' &&
      townState.currentRound &&
      lastSpokenRoundRef.current !== townState.currentRound.roundIndex
    ) {
      lastSpokenRoundRef.current = townState.currentRound.roundIndex;
      speakDirections(townState.currentRound.startNameEn, townState.currentRound.stepsEn);
    }
  }, [townState?.phase, townState?.currentRound?.roundIndex]);

  // Live avatar poses ref for 3D Host Broadcast (zero React re-renders in WebGL loop)
  const livePlayersRef = useRef<LiveAvatarPose[]>([]);
  const map2DPlayers: Town2DPlayerMarker[] = useMemo(() => {
    const podiumMap = new Map<string, 1 | 2 | 3>();
    (townState?.currentRound?.podium ?? []).forEach((p) => podiumMap.set(p.playerId, p.place));
    const spawn = townState?.currentRound?.spawnPos ?? [0, 33];
    const heading = townState?.currentRound?.spawnHeading ?? 0;

    const list: Town2DPlayerMarker[] = Object.entries(players).map(([pid, p]) => {
      const tel = telemetry[pid];
      return {
        playerId: pid,
        nickname: p.nickname || 'Student',
        x: tel ? tel.x : spawn[0],
        z: tel ? tel.z : spawn[1],
        yaw: tel ? tel.yaw : heading,
        color: getPlayerColor(pid, p.attendanceNumber),
        attendanceNumber: p.attendanceNumber,
        podiumPlace: podiumMap.get(pid),
      };
    });

    livePlayersRef.current = list.map((p) => ({
      playerId: p.playerId,
      x: p.x,
      z: p.z,
      yaw: p.yaw,
      color: p.color,
      podiumPlace: p.podiumPlace,
    }));

    return list;
  }, [players, telemetry, townState?.currentRound]);

  const handleCancel = async () => {
    await closeRoom();
    onExit();
  };

  const handleKickPlayer = async (pid: string) => {
    if (!roomCode) return;
    await safeRemove(`rooms/${roomCode}/players/${pid}`);
  };

  const handleClearBots = async () => {
    if (!roomCode) return;
    const botIds = Object.keys(players).filter((id) => id.startsWith('bot_'));
    await Promise.all(botIds.map((id) => safeRemove(`rooms/${roomCode}/players/${id}`)));
  };

  if (!roomCode || !townState) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Compass className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-lg font-black">
            {lang === 'ja' ? 'ルームを作成中…' : 'Creating Town Race Room…'}
          </p>
        </div>
      </div>
    );
  }

  const settings: TownGameSettings = townState.settings;
  const botCount = Object.keys(players).filter((id) => id.startsWith('bot_')).length;

  // 1. LOBBY PHASE (reuses shared Stream B QuizHostLobby!)
  if (room?.status === 'LOBBY') {
    return (
      <>
        <QuizHostLobby
          roomCode={roomCode}
          grade="G5-G6"
          unit="Directions Race"
          schoolId={activeSchool || 'futakotamagawa'}
          classId={activeClassId || undefined}
          gamePlayType="TOWN_NAVIGATOR"
          totalQuestions={settings.totalRounds}
          players={players}
          botCount={botCount}
          onAddBots={(count) => spawnBots(count)}
          onClearBots={handleClearBots}
          onStart={() => startRound(0)}
          onEditSettings={() => setSettingsOpen(true)}
          onKickPlayer={handleKickPlayer}
          onCancel={handleCancel}
        />
        <TownNavigatorSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onChange={updateSettings}
          lang={lang}
        />
      </>
    );
  }

  // 2. GAME OVER PHASE
  if (townState.phase === 'GAME_OVER' || room?.status === 'GAME_OVER') {
    const sortedFinal = Object.entries(players)
      .map(([pid, p]) => ({
        playerId: pid,
        nickname: p.nickname || 'Student',
        attendanceNumber: p.attendanceNumber,
        score: p.score || 0,
        color: getPlayerColor(pid, p.attendanceNumber),
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col overflow-hidden">
        <header className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
            <h1 className="text-xl font-black truncate">
              {lang === 'ja' ? '最終結果 — タウンナビゲーター' : 'Final Results — 3D Town Race'}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <button
              onClick={() => startRound(0)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              {lang === 'ja' ? 'もう一回' : 'Play Again'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-black text-sm flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              {lang === 'ja' ? '終了' : 'Exit'}
            </button>
          </div>
        </header>

        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* Left: Grand Podium */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-black mb-8 text-amber-500">
              🏆 {lang === 'ja' ? 'チャンピオン表彰台' : 'Championship Podium'}
            </h2>
            <div className="flex items-end justify-center gap-4 w-full max-w-md">
              {[sortedFinal[1], sortedFinal[0], sortedFinal[2]].map((entry, idx) => {
                const place = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                const height = place === 1 ? 'h-48' : place === 2 ? 'h-36' : 'h-28';
                const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
                if (!entry) return <div key={place} className="flex-1" />;
                return (
                  <div key={entry.playerId} className="flex-1 flex flex-col items-center">
                    <div className="text-3xl mb-1">{medal}</div>
                    <div className="font-black text-base text-center truncate w-full">
                      {entry.nickname}
                    </div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                      {entry.score.toLocaleString()} pts
                    </div>
                    <div
                      className={`w-full ${height} rounded-t-2xl flex items-start justify-center pt-3 font-black text-2xl text-white shadow-lg`}
                      style={{ backgroundColor: entry.color }}
                    >
                      #{place}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Full Standings */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col overflow-hidden">
            <h3 className="text-lg font-black mb-3 shrink-0">
              {lang === 'ja' ? 'クラスランキング' : 'Class Standings'} ({sortedFinal.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sortedFinal.map((entry, i) => (
                <div
                  key={entry.playerId}
                  className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 text-center font-black text-slate-500">#{i + 1}</span>
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-bold truncate">{entry.nickname}</span>
                  </div>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                    {entry.score.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. LIVE RACE (BRIEFING / ACTIVE) & ROUND_REVEAL (ALL-PLAYER MAYHEM INSTANT REPLAY)
  const cr = townState.currentRound;
  const isBriefing = townState.phase === 'BRIEFING';
  const isActive = townState.phase === 'ACTIVE';
  const isReveal = townState.phase === 'ROUND_REVEAL';

  const briefingRemainSec = cr ? Math.max(0, Math.ceil((cr.briefingEndsAt - nowMs) / 1000)) : 0;
  const activeDeadline = cr
    ? cr.graceEndsAt
      ? Math.min(cr.raceEndsAt, cr.graceEndsAt)
      : cr.raceEndsAt
    : nowMs;
  const activeRemainSec = cr ? Math.max(0, Math.ceil((activeDeadline - nowMs) / 1000)) : 0;
  const isFinalWhistle = Boolean(isActive && cr?.graceEndsAt);

  return (
    <div className="h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col overflow-hidden">
      {/* Zero-Shift Bilingual Top Bar */}
      <header className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0">
            R{(townState.roundIndex ?? 0) + 1} / {townState.totalRounds}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-xs text-slate-600 dark:text-slate-300 shrink-0">
            PIN: {roomCode}
          </span>
          <h1 className="font-black text-base truncate">
            {isReveal && cr?.revealedTarget
              ? lang === 'ja'
                ? `ゴール: ${cr.revealedTarget.nameJa} (${cr.revealedTarget.nameEn})`
                : `Destination: ${cr.revealedTarget.nameEn}`
              : lang === 'ja'
              ? `スタート: ${cr?.startNameJa ?? ''}`
              : `Start: ${cr?.startNameEn ?? ''}`}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {/* 3D / 2D Toggle */}
          <button
            onClick={() =>
              updateSettings({ tvRenderMode: settings.tvRenderMode === '3D' ? '2D' : '3D' })
            }
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-xs flex items-center gap-1.5"
          >
            <MapIcon className="w-3.5 h-3.5" />
            {settings.tvRenderMode}
          </button>

          {/* Live Camera Mode Toggle (during BRIEFING/ACTIVE in 3D) */}
          {!isReveal && settings.tvRenderMode === '3D' && (
            <button
              onClick={() => {
                const order: TownCameraMode[] = ['OVERVIEW', 'MYSTERY_SKY', 'FOLLOW_LEADER'];
                const next = order[(order.indexOf(settings.tvCameraMode) + 1) % order.length];
                updateSettings({ tvCameraMode: next });
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              {settings.tvCameraMode === 'OVERVIEW'
                ? 'Overview'
                : settings.tvCameraMode === 'MYSTERY_SKY'
                ? 'Mystery Sky'
                : 'Follow 1st'}
            </button>
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleCancel}
            className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-200"
            aria-label="Exit"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Twin-Wing Stage */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden">
        {/* Left / Main Viewport (8 cols) */}
        <section className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-lg min-h-0">
          {settings.tvRenderMode === '3D' ? (
            <Town3DStage
              mode={isReveal ? 'HOST_REPLAY' : 'HOST_BROADCAST'}
              townSeed={townState.townSeed}
              schoolId={activeSchool || 'futakotamagawa'}
              spawnPos={cr?.spawnPos}
              spawnHeading={cr?.spawnHeading}
              livePlayersRef={livePlayersRef}
              cameraMode={settings.tvCameraMode}
              leaderPlayerId={cr?.podium?.[0]?.playerId}
              revealedTargetPos={cr?.revealedTarget?.worldPos}
              replayRecording={replayRecording}
              replayTrigger={replayTrigger}
            />
          ) : (
            layout && (
              <Town2DMap
                buildings={layout.buildingsList}
                players={map2DPlayers}
                startBuildingId={cr?.startBuildingId}
                revealedTargetId={isReveal ? cr?.revealedTarget?.id : undefined}
                optimalPath={isReveal ? cr?.revealedTarget?.optimalPath : undefined}
                showJapanese={settings.showJapaneseHints}
              />
            )
          )}

          {/* Top-Left HUD Overlay: Countdown / Final Whistle / Replay Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
            {isBriefing && (
              <div className="px-4 py-2 rounded-2xl bg-amber-500 text-white font-black text-lg shadow-xl animate-pulse">
                {lang === 'ja' ? `よーい… ${briefingRemainSec}` : `GET READY… ${briefingRemainSec}s`}
              </div>
            )}
            {isActive && (
              <div
                className={`px-4 py-2 rounded-2xl font-black text-lg shadow-xl ${
                  isFinalWhistle
                    ? 'bg-rose-600 text-white animate-bounce'
                    : 'bg-slate-900/85 text-white backdrop-blur'
                }`}
              >
                {isFinalWhistle
                  ? `🏁 FINAL WHISTLE: ${activeRemainSec}s`
                  : `⏱ ${activeRemainSec}s`}
              </div>
            )}
            {isReveal && (
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className="px-4 py-2 rounded-2xl bg-indigo-600/95 text-white font-black text-sm shadow-xl flex items-center gap-2">
                  🎬 {lang === 'ja' ? '全員リプレイ再生中' : 'ALL-PLAYER INSTANT REPLAY'}
                </div>
                {replayRecording?.isPhotoFinish && (
                  <div className="px-3 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-xl flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    PHOTO FINISH 0.5×
                  </div>
                )}
                <button
                  onClick={() => setReplayTrigger((n) => n + 1)}
                  className="px-3.5 py-2 rounded-2xl bg-white/95 hover:bg-white text-slate-900 font-black text-xs shadow-xl flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {lang === 'ja' ? 'リプレイ' : 'Replay'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Wing: Directions & Live Podium (BRIEFING/ACTIVE) OR Round Leaderboard (ROUND_REVEAL) */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col min-h-0 overflow-hidden shadow-lg">
          {!isReveal && cr ? (
            <>
              {/* Start Building + TTS Button */}
              <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {lang === 'ja' ? 'スタート地点' : 'STARTING POINT'}
                  </div>
                  <div className="text-lg font-black truncate">
                    {cr.startNameEn}
                    {settings.showJapaneseHints && (
                      <span className="ml-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                        ({cr.startNameJa})
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => speakDirections(cr.startNameEn, cr.stepsEn)}
                  className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 shrink-0"
                  title="Read Directions Aloud"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* MEXT English Directions List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {cr.stepsEn.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-base leading-snug text-slate-900 dark:text-white">
                          {step}
                        </p>
                        {settings.showJapaneseHints && cr.stepsJa[idx] && (
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                            {cr.stepsJa[idx]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Podium Slots */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  {lang === 'ja' ? 'ゴール速報' : 'LIVE PODIUM'}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {([1, 2, 3] as const).map((place) => {
                    const entry = cr.podium?.find((p) => p.place === place);
                    const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉';
                    return (
                      <div
                        key={place}
                        className={`p-2 rounded-2xl text-center border ${
                          entry
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="text-lg">{medal}</div>
                        <div className="text-xs font-black truncate">
                          {entry ? entry.nickname : '—'}
                        </div>
                        {entry && (
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {(entry.finishMs / 1000).toFixed(1)}s
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isActive && (
                  <button
                    onClick={finishRound}
                    className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    {lang === 'ja' ? 'ラウンドを終了する' : 'End Round Now'}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ROUND_REVEAL Right Wing: Podium + Round Leaderboard + Next Round */
            <>
              <div className="mb-3 shrink-0">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {lang === 'ja' ? '正解の目的地' : 'DESTINATION REVEALED'}
                </div>
                <div className="text-xl font-black">
                  {cr?.revealedTarget?.nameEn}{' '}
                  <span className="text-sm font-bold text-slate-500">
                    ({cr?.revealedTarget?.nameJa})
                  </span>
                </div>
              </div>

              {/* Round Leaderboard */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {(cr?.roundScores ?? []).map((entry, idx) => {
                  const medal =
                    entry.podiumPlace === 1
                      ? '🥇'
                      : entry.podiumPlace === 2
                      ? '🥈'
                      : entry.podiumPlace === 3
                      ? '🥉'
                      : `#${idx + 1}`;
                  return (
                    <div
                      key={entry.playerId}
                      className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/70"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 text-center font-black text-sm shrink-0">{medal}</span>
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: entry.avatarColor }}
                        />
                        <div className="min-w-0">
                          <div className="font-black text-sm truncate">{entry.nickname}</div>
                          <div className="text-[11px] font-bold text-slate-500">
                            {entry.distanceMeters === 0
                              ? `${((entry.finishMs ?? 0) / 1000).toFixed(1)}s`
                              : `${entry.distanceMeters}m away`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                          +{entry.roundPts}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                          Total: {entry.totalPts}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  onClick={nextRoundOrFinish}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-lg flex items-center justify-center gap-2"
                >
                  {townState.roundIndex + 1 >= townState.totalRounds
                    ? lang === 'ja'
                      ? '最終結果を見る'
                      : 'View Final Results'
                    : lang === 'ja'
                    ? '次のラウンドへ'
                    : 'Next Round'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </aside>
      </main>

      <TownNavigatorSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
        lang={lang}
      />
    </div>
  );
};
