import React, { useRef, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import type { TravelMode } from './TownNavigator';

export interface VirtualJoystickPadProps {
  onMoveVector: (forward: number, turn: number) => void; // both in [-1, +1]
  onSnapTurn: (direction: 'LEFT' | 'RIGHT') => void;
  onRingBell: () => void;
  travelMode: TravelMode;
  completedQuestCount: number;
  onSelectTravelMode: (mode: TravelMode) => void;
  language: 'en' | 'ja';
}

const STICK_SIZE = 128;
const MAX_RADIUS = 44;
const DEADZONE = 0.14;

export const VirtualJoystickPad: React.FC<VirtualJoystickPadProps> = ({
  onMoveVector,
  onSnapTurn,
  onRingBell,
  travelMode,
  completedQuestCount,
  onSelectTravelMode,
  language,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [puckOffset, setPuckOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const updateStickFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_RADIUS) {
        const scale = MAX_RADIUS / dist;
        dx *= scale;
        dy *= scale;
      }

      setPuckOffset({ x: dx, y: dy });

      const normX = dx / MAX_RADIUS;
      const normY = dy / MAX_RADIUS;

      // Vertical: up (-normY) -> +1.0 forward, down -> -0.7 reverse
      const rawForward = -normY;
      const forward =
        Math.abs(rawForward) < DEADZONE
          ? 0
          : rawForward > 0
          ? (rawForward - DEADZONE) / (1 - DEADZONE)
          : ((rawForward + DEADZONE) / (1 - DEADZONE)) * 0.7;

      // Horizontal: left (-normX) -> +1.0 yaw (turn left), right (+normX) -> -1.0 yaw (turn right)
      const rawTurn = -normX;
      const turn =
        Math.abs(rawTurn) < DEADZONE
          ? 0
          : rawTurn > 0
          ? (rawTurn - DEADZONE) / (1 - DEADZONE)
          : (rawTurn + DEADZONE) / (1 - DEADZONE);

      onMoveVector(forward, turn);
    },
    [onMoveVector]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== null) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
      setIsActive(true);
      updateStickFromPointer(e.clientX, e.clientY);
    },
    [updateStickFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      e.stopPropagation();
      updateStickFromPointer(e.clientX, e.clientY);
    },
    [updateStickFromPointer]
  );

  const releasePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      e.stopPropagation();
      activePointerIdRef.current = null;
      setIsActive(false);
      setPuckOffset({ x: 0, y: 0 });
      onMoveVector(0, 0);
    },
    [onMoveVector]
  );

  return (
    <>
      {/* BOTTOM-LEFT: ANALOG THUMBSTICK + HORIZONTAL SPEED SELECTOR */}
      <div className="absolute bottom-2 left-2 sm:bottom-5 sm:left-5 z-20 flex items-end gap-2.5 select-none">
        <div
          ref={baseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={releasePointer}
          onPointerCancel={releasePointer}
          onLostPointerCapture={releasePointer}
          style={{ width: STICK_SIZE, height: STICK_SIZE, touchAction: 'none' }}
          className={`relative rounded-full bg-slate-950/85 border-2 shadow-2xl flex items-center justify-center transition-colors ${
            isActive ? 'border-amber-400/90' : 'border-slate-700/80'
          }`}
        >
          {/* Subtle cardinal tick marks */}
          <span className="absolute top-2 text-[10px] font-black text-slate-400/70 pointer-events-none">▲</span>
          <span className="absolute bottom-2 text-[10px] font-black text-slate-400/70 pointer-events-none">▼</span>
          <span className="absolute left-2.5 text-[10px] font-black text-slate-400/70 pointer-events-none">◀</span>
          <span className="absolute right-2.5 text-[10px] font-black text-slate-400/70 pointer-events-none">▶</span>

          {/* Inner guide ring */}
          <div className="w-16 h-16 rounded-full border border-slate-700/60 pointer-events-none" />

          {/* Tactile thumb puck */}
          <div
            style={{
              transform: `translate3d(${puckOffset.x}px, ${puckOffset.y}px, 0)`,
            }}
            className={`absolute w-12 h-12 rounded-full border-2 pointer-events-none transition-shadow ${
              isActive
                ? 'bg-amber-400 border-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.65)]'
                : 'bg-slate-800/95 border-slate-500 shadow-lg'
            }`}
          />
        </div>

        {/* SPEED SELECTOR PILL */}
        <div className="flex items-center gap-1 bg-slate-900/95 p-1 rounded-2xl border border-slate-700/80 shadow-md">
          <button
            type="button"
            onClick={() => onSelectTravelMode('WALK')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition cursor-pointer ${
              travelMode === 'WALK'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Walk (6 m/s - 1 cell/sec)"
          >
            <span>🚶</span>
            <span className="text-[10px]">6m</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTravelMode('RUN')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition cursor-pointer ${
              travelMode === 'RUN'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Run (12 m/s - 2 cells/sec)"
          >
            <span>🏃</span>
            <span className="text-[10px]">12m</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (completedQuestCount >= 2) onSelectTravelMode('BIKE');
            }}
            disabled={completedQuestCount < 2}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              completedQuestCount < 2
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : travelMode === 'BIKE'
                ? 'bg-sky-400 text-slate-950 shadow-sm cursor-pointer'
                : 'text-slate-300 hover:bg-slate-800 cursor-pointer'
            }`}
            title={
              completedQuestCount < 2
                ? 'Reach 2 destinations to unlock City Bicycle!'
                : 'City Bicycle (18 m/s - 3 cells/sec)'
            }
          >
            <span>{completedQuestCount < 2 ? '🔒' : '🚲'}</span>
            <span className="text-[10px]">18m</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (completedQuestCount >= 4) onSelectTravelMode('KART');
            }}
            disabled={completedQuestCount < 4}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition ${
              completedQuestCount < 4
                ? 'opacity-40 cursor-not-allowed text-slate-500'
                : travelMode === 'KART'
                ? 'bg-rose-500 text-white shadow-sm cursor-pointer'
                : 'text-slate-300 hover:bg-slate-800 cursor-pointer'
            }`}
            title={
              completedQuestCount < 4
                ? 'Reach 4 destinations to unlock Suzuka Micro-Kart!'
                : 'Suzuka Micro-Kart (24 m/s - 4 cells/sec)'
            }
          >
            <span>{completedQuestCount < 4 ? '🔒' : '🏎️'}</span>
            <span className="text-[10px]">24m</span>
          </button>
        </div>
      </div>

      {/* BOTTOM-RIGHT: BELL + 90-DEGREE MEXT SNAP-TURN BUTTONS */}
      <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 z-20 flex flex-col items-end gap-2 select-none">
        <button
          type="button"
          onClick={onRingBell}
          className="w-11 h-11 rounded-full bg-amber-500/90 hover:bg-amber-400 active:scale-95 text-slate-950 flex items-center justify-center shadow-lg border border-amber-300/60 transition cursor-pointer"
          title={language === 'ja' ? 'ベルを鳴らす (Space / B)' : 'Ring Bell (Space / B)'}
        >
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSnapTurn('LEFT')}
            className="min-w-[56px] h-[52px] px-3 rounded-2xl bg-slate-950/90 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-100 border-2 border-slate-700/80 shadow-xl flex flex-col items-center justify-center transition cursor-pointer"
            title="Turn Left 90° (Q)"
          >
            <span className="text-base font-black leading-none">↶ 90°</span>
            <span className="text-[10px] font-bold text-slate-300 mt-0.5">
              {language === 'ja' ? '左へ' : 'Left'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSnapTurn('RIGHT')}
            className="min-w-[56px] h-[52px] px-3 rounded-2xl bg-slate-950/90 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-100 border-2 border-slate-700/80 shadow-xl flex flex-col items-center justify-center transition cursor-pointer"
            title="Turn Right 90° (E)"
          >
            <span className="text-base font-black leading-none">↷ 90°</span>
            <span className="text-[10px] font-bold text-slate-300 mt-0.5">
              {language === 'ja' ? '右へ' : 'Right'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
