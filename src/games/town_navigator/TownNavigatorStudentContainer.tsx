import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Map as MapIcon, MapPin, Lock, Trophy } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { useTownRoom } from './multiplayer/useTownRoom';
import { findNearestNamedBuilding } from './multiplayer/roundBuilder';
import { Town3DStage } from './Town3DStage';
import { Town2DMap } from './Town2DMap';
import type { PlacedBuilding } from './townGenerator';

interface TownNavigatorStudentContainerProps {
  roomCode: string;
  playerId: string;
  nickname: string;
  onExit: () => void;
}

const WRONG_CHECKIN_LOCKOUT_MS = 2500;

export const TownNavigatorStudentContainer: React.FC<TownNavigatorStudentContainerProps> = ({
  roomCode,
  playerId,
  nickname,
  onExit,
}) => {
  const { language: lang } = useLanguage();
  const { room, townState, layout, pushTelemetry, submitCheckIn } = useTownRoom({
    role: 'STUDENT',
    roomCode,
    playerId,
  });

  const [renderMode, setRenderMode] = useState<'3D' | '2D'>('3D');
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [nearbyBuilding, setNearbyBuilding] = useState<PlacedBuilding | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [nowMs, setNowMs] = useState(() => getServerTime());
  const [local2DPose, setLocal2DPose] = useState({ x: 0, z: 33, yaw: 0 });

  const joystickRef = useRef({ x: 0, y: 0 });
  const joyOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const localPoseRef = useRef({ x: 0, z: 33, yaw: 0 });

  // Enforce quiet classroom mode on student iPads
  useEffect(() => {
    soundEffects.setQuietClassroomMode(true);
    return () => soundEffects.setQuietClassroomMode(false);
  }, []);

  // Sync default student mode from host settings once loaded
  const syncedModeRef = useRef(false);
  useEffect(() => {
    if (townState?.settings?.defaultStudentMode && !syncedModeRef.current) {
      syncedModeRef.current = true;
      setRenderMode(townState.settings.defaultStudentMode);
    }
  }, [townState?.settings?.defaultStudentMode]);

  // Reset checklist & lockout when a new round starts
  useEffect(() => {
    setCheckedSteps(new Set());
    setLockoutUntil(0);
    if (townState?.currentRound) {
      const [sx, sz] = townState.currentRound.spawnPos;
      const sh = townState.currentRound.spawnHeading;
      localPoseRef.current = { x: sx, z: sz, yaw: sh };
      setLocal2DPose({ x: sx, z: sz, yaw: sh });
    }
  }, [townState?.currentRound?.roundIndex]);

  // 200ms UI clock
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(getServerTime()), 200);
    return () => window.clearInterval(id);
  }, []);

  const cr = townState?.currentRound;
  const isBriefing = townState?.phase === 'BRIEFING';
  const isActive = townState?.phase === 'ACTIVE';
  const isReveal = townState?.phase === 'ROUND_REVEAL';
  const isGameOver = townState?.phase === 'GAME_OVER' || room?.status === 'GAME_OVER';

  const myPodium = useMemo(
    () => cr?.podium?.find((p) => p.playerId === playerId) ?? null,
    [cr?.podium, playerId]
  );

  const isLockedOut = lockoutUntil > Date.now();
  const controlsLocked = !isActive || isLockedOut || Boolean(myPodium);

  // Handle pose updates from 3D stage
  const handleLocalPoseChange = useCallback(
    (x: number, z: number, yaw: number) => {
      localPoseRef.current = { x, z, yaw };
      if (isActive && !myPodium) {
        pushTelemetry(x, z, yaw);
      }
      if (layout) {
        const nearest = findNearestNamedBuilding(x, z, layout.buildingsList);
        setNearbyBuilding((prev) =>
          prev?.id === nearest?.building.id ? prev : nearest?.building ?? null
        );
      }
    },
    [isActive, myPodium, pushTelemetry, layout]
  );

  // 2D Mode driving loop (when student is in 2D Map mode)
  useEffect(() => {
    if (renderMode !== '2D' || !isActive || controlsLocked) return;
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      rafId = requestAnimationFrame(step);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const jx = joystickRef.current.x;
      const jy = joystickRef.current.y;
      if (Math.abs(jx) > 0.08 || Math.abs(jy) > 0.08) {
        const pose = localPoseRef.current;
        pose.yaw = Math.atan2(jx, -jy);
        pose.x = Math.max(-68, Math.min(68, pose.x + jx * 12 * dt));
        pose.z = Math.max(-68, Math.min(68, pose.z - jy * 12 * dt));
        setLocal2DPose({ ...pose });
        handleLocalPoseChange(pose.x, pose.z, pose.yaw);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [renderMode, isActive, controlsLocked, handleLocalPoseChange]);

  // Explicit "I'm here!" check-in handler with 2.5s wrong-building lockout
  const handleCheckIn = async () => {
    if (!nearbyBuilding || controlsLocked) return;
    const { x, z, yaw } = localPoseRef.current;
    await submitCheckIn(nearbyBuilding.id, x, z, yaw);

    // If host hasn't put us on the podium after 750ms, apply 2.5s wrong-building lockout
    window.setTimeout(() => {
      const latestPodium = townState?.currentRound?.podium ?? [];
      if (!latestPodium.some((p) => p.playerId === playerId)) {
        setLockoutUntil(Date.now() + WRONG_CHECKIN_LOCKOUT_MS);
      }
    }, 750);
  };

  // Virtual Joystick Pointer Handlers
  const onJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const onJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOriginRef.current) return;
    const dx = e.clientX - joyOriginRef.current.x;
    const dy = e.clientY - joyOriginRef.current.y;
    const maxR = 44;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = (Math.cos(angle) * clamped) / maxR;
    const ny = -(Math.sin(angle) * clamped) / maxR; // up = +1 forward
    joystickRef.current = { x: nx, y: ny };
    setJoyKnob({ x: nx * maxR, y: -ny * maxR });
  };

  const onJoyUp = () => {
    joyOriginRef.current = null;
    joystickRef.current = { x: 0, y: 0 };
    setJoyKnob({ x: 0, y: 0 });
  };

  if (!townState || !cr) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="text-center space-y-2">
          <p className="text-xl font-black">{nickname}</p>
          <p className="text-sm text-slate-400">
            {lang === 'ja' ? '先生からのスタートを待っています…' : 'Waiting for teacher to start the race…'}
          </p>
        </div>
      </div>
    );
  }

  // ROUND_REVEAL or GAME_OVER summary screen (landscape 2-column)
  if (isReveal || isGameOver) {
    const myScore = cr.roundScores?.find((s) => s.playerId === playerId);
    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex flex-col justify-center items-center text-center space-y-3">
            <Trophy className="w-12 h-12 text-amber-400" />
            <h2 className="text-2xl font-black">
              {isGameOver
                ? lang === 'ja' ? 'レース終了！' : 'Race Complete!'
                : lang === 'ja' ? 'テレビのリプレイを見よう！' : 'Watch the Replay on TV!'}
            </h2>
            {cr.revealedTarget && (
              <div className="px-4 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-700 text-emerald-300 font-black">
                {cr.revealedTarget.nameEn} ({cr.revealedTarget.nameJa})
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center space-y-3">
            {myScore ? (
              <>
                <div className="p-4 rounded-2xl bg-slate-800/80 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">
                    {lang === 'ja' ? 'ゴールまでの距離' : 'Distance'}
                  </span>
                  <span className="text-lg font-black">
                    {myScore.distanceMeters === 0 ? '🎯 0m (Arrived!)' : `${myScore.distanceMeters}m`}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/80 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">
                    {lang === 'ja' ? '今回のスコア' : 'Round Points'}
                  </span>
                  <span className="text-2xl font-black text-indigo-400">
                    +{myScore.roundPts}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-700 flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-300">
                    {lang === 'ja' ? '合計スコア' : 'Total Score'}
                  </span>
                  <span className="text-2xl font-black text-white">
                    {myScore.totalPts.toLocaleString()} pts
                  </span>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-center font-bold">
                {lang === 'ja' ? '次のラウンドを準備中…' : 'Preparing next round…'}
              </p>
            )}
            {isGameOver && (
              <button
                onClick={onExit}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-sm"
              >
                {lang === 'ja' ? 'ポータルに戻る' : 'Back to Portal'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const briefingRemainSec = Math.max(0, Math.ceil((cr.briefingEndsAt - nowMs) / 1000));
  const lockoutRemainSec = Math.max(0, ((lockoutUntil - Date.now()) / 1000)).toFixed(1);

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Compact Top Bar */}
      <header className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 font-black text-xs shrink-0">
            R{townState.roundIndex + 1}/{townState.totalRounds}
          </span>
          <span className="font-black text-sm truncate">
            {lang === 'ja' ? `スタート: ${cr.startNameJa}` : `Start: ${cr.startNameEn}`}
          </span>
        </div>

        <button
          onClick={() => setRenderMode((m) => (m === '3D' ? '2D' : '3D'))}
          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 font-black text-xs flex items-center gap-1.5 shrink-0"
        >
          <MapIcon className="w-3.5 h-3.5" />
          {renderMode}
        </button>
      </header>

      {/* Landscape Split: Viewport + Directions Checklist */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
        {/* Driving Viewport (8 cols) */}
        <div className="md:col-span-8 relative min-h-0 bg-slate-900">
          {renderMode === '3D' ? (
            <Town3DStage
              mode="STUDENT_DRIVE"
              townSeed={townState.townSeed}
              lowPower={true}
              spawnPos={cr.spawnPos}
              spawnHeading={cr.spawnHeading}
              controlsLocked={controlsLocked}
              joystickRef={joystickRef}
              onLocalPoseChange={handleLocalPoseChange}
              onRequest2DFallback={() => setRenderMode('2D')}
            />
          ) : (
            layout && (
              <Town2DMap
                buildings={layout.buildingsList}
                players={[
                  {
                    playerId,
                    nickname,
                    x: local2DPose.x,
                    z: local2DPose.z,
                    yaw: local2DPose.yaw,
                    color: '#38bdf8',
                    isSelf: true,
                  },
                ]}
                startBuildingId={cr.startBuildingId}
                highlightBuildingId={nearbyBuilding?.id}
                showJapanese={townState.settings.showJapaneseHints}
              />
            )
          )}

          {/* BRIEFING Lock Overlay */}
          {isBriefing && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="px-6 py-4 rounded-3xl bg-amber-500 text-slate-950 font-black text-center shadow-2xl">
                <div className="text-sm uppercase tracking-wider">
                  {lang === 'ja' ? '道案内をよく読んでね！' : 'READ THE DIRECTIONS!'}
                </div>
                <div className="text-4xl mt-1">GO IN {briefingRemainSec}…</div>
              </div>
            </div>
          )}

          {/* Podium Arrived Banner */}
          {myPodium && (
            <div className="absolute inset-x-4 top-4 p-4 rounded-3xl bg-amber-500 text-slate-950 font-black text-center shadow-2xl">
              {myPodium.place === 1 ? '🥇 1ST PLACE!' : myPodium.place === 2 ? '🥈 2ND PLACE!' : '🥉 3RD PLACE!'}{' '}
              ({(myPodium.finishMs / 1000).toFixed(1)}s)
            </div>
          )}

          {/* Bottom-Left Touch Virtual Joystick */}
          {isActive && !myPodium && (
            <div
              onPointerDown={onJoyDown}
              onPointerMove={onJoyMove}
              onPointerUp={onJoyUp}
              onPointerCancel={onJoyUp}
              className="absolute bottom-4 left-4 w-28 h-28 rounded-full bg-slate-900/60 border-2 border-white/30 backdrop-blur flex items-center justify-center touch-none"
            >
              <div
                className="w-12 h-12 rounded-full bg-white/90 shadow-lg transition-transform duration-75"
                style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
              />
            </div>
          )}

          {/* Bottom-Right Explicit "I'm here!" Check-In Button */}
          {isActive && !myPodium && (
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
              {isLockedOut ? (
                <div className="px-5 py-3.5 rounded-2xl bg-rose-600 text-white font-black text-sm shadow-xl flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {lang === 'ja'
                    ? `ちがう建物だよ！ ${lockoutRemainSec}s`
                    : `Wrong building! Wait ${lockoutRemainSec}s`}
                </div>
              ) : (
                <button
                  onClick={handleCheckIn}
                  disabled={!nearbyBuilding}
                  className={`px-5 py-3.5 rounded-2xl font-black text-base shadow-2xl flex items-center gap-2 transition-all ${
                    nearbyBuilding
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 scale-105'
                      : 'bg-slate-800/80 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  {nearbyBuilding
                    ? `I'm here! (${nearbyBuilding.nameEn})`
                    : lang === 'ja'
                    ? '建物の前で押そう'
                    : 'Walk to a building'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Wing: Directions & Optional Step Checklist (4 cols) */}
        <aside className="md:col-span-4 bg-slate-900 border-l border-slate-800 p-3 flex flex-col min-h-0 overflow-y-auto space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
            {lang === 'ja' ? '道案内ステップ' : 'DIRECTIONS'}
          </div>
          {cr.stepsEn.map((step, idx) => {
            const done = checkedSteps.has(idx);
            const canCheck = townState.settings.showStepChecklist;
            return (
              <button
                key={idx}
                type="button"
                disabled={!canCheck}
                onClick={() => {
                  if (!canCheck) return;
                  setCheckedSteps((prev) => {
                    const next = new Set(prev);
                    if (next.has(idx)) next.delete(idx);
                    else next.add(idx);
                    return next;
                  });
                }}
                className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-start gap-2 ${
                  done
                    ? 'bg-emerald-950/40 border-emerald-700/70 opacity-70'
                    : 'bg-slate-800/80 border-slate-700'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <div className={`font-bold text-sm leading-snug ${done ? 'line-through' : ''}`}>
                    {step}
                  </div>
                  {townState.settings.showJapaneseHints && cr.stepsJa[idx] && (
                    <div className="text-[11px] text-slate-400 mt-0.5">{cr.stepsJa[idx]}</div>
                  )}
                </div>
              </button>
            );
          })}
        </aside>
      </main>
    </div>
  );
};
