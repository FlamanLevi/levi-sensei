import React, { useMemo } from 'react';
import type { PlacedBuilding } from './townGenerator';
import { ROAD_COORDS } from './navigationLogic';

export interface Town2DPlayerMarker {
  playerId: string;
  nickname: string;
  x: number;
  z: number;
  yaw: number;
  color: string;
  attendanceNumber?: number;
  podiumPlace?: 1 | 2 | 3;
  isSelf?: boolean;
}

interface Town2DMapProps {
  buildings: PlacedBuilding[];
  players: Town2DPlayerMarker[];
  startBuildingId?: string;
  revealedTargetId?: string;
  optimalPath?: Array<{ x: number; z: number }>;
  highlightBuildingId?: string;
  /** When true, displays Japanese labels alongside English */
  showJapanese?: boolean;
  /** Optional click handler on a building (e.g., for inspection) */
  className?: string;
}

const WORLD_MIN = -72;
const WORLD_SPAN = 144;

const TIER_COLORS: Record<number, { fill: string; stroke: string }> = {
  3: { fill: '#f59e0b', stroke: '#b45309' },
  2: { fill: '#3b82f6', stroke: '#1d4ed8' },
  1: { fill: '#10b981', stroke: '#047857' },
  0: { fill: '#cbd5e1', stroke: '#94a3b8' },
};

export const Town2DMap: React.FC<Town2DMapProps> = ({
  buildings,
  players,
  startBuildingId,
  revealedTargetId,
  optimalPath,
  highlightBuildingId,
  showJapanese = false,
  className = '',
}) => {
  const namedBuildings = useMemo(() => buildings.filter((b) => b.tier > 0), [buildings]);
  const houseBuildings = useMemo(() => buildings.filter((b) => b.tier === 0), [buildings]);

  const pathPoints = useMemo(() => {
    if (!optimalPath || optimalPath.length < 2) return '';
    return optimalPath.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ');
  }, [optimalPath]);

  return (
    <div className={`relative w-full h-full bg-slate-100 dark:bg-slate-900 overflow-hidden select-none ${className}`}>
      <svg
        viewBox={`${WORLD_MIN} ${WORLD_MIN} ${WORLD_SPAN} ${WORLD_SPAN}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background Grass / Town Base */}
        <rect x={WORLD_MIN} y={WORLD_MIN} width={WORLD_SPAN} height={WORLD_SPAN} className="fill-emerald-50 dark:fill-slate-900" />

        {/* Road Network */}
        {ROAD_COORDS.map((coord) => {
          const isBoulevard = coord === 0;
          const width = isBoulevard ? 11.5 : 5.6;
          return (
            <g key={`road-${coord}`}>
              <rect
                x={coord - width / 2}
                y={WORLD_MIN}
                width={width}
                height={WORLD_SPAN}
                className="fill-slate-300 dark:fill-slate-700"
              />
              <rect
                x={WORLD_MIN}
                y={coord - width / 2}
                width={WORLD_SPAN}
                height={width}
                className="fill-slate-300 dark:fill-slate-700"
              />
              {/* Center dashed line */}
              <line
                x1={coord}
                y1={WORLD_MIN}
                x2={coord}
                y2={WORLD_MIN + WORLD_SPAN}
                stroke="#ffffff"
                strokeOpacity={0.65}
                strokeWidth={isBoulevard ? 0.6 : 0.3}
                strokeDasharray="2 2"
              />
              <line
                x1={WORLD_MIN}
                y1={coord}
                x2={WORLD_MIN + WORLD_SPAN}
                y2={coord}
                stroke="#ffffff"
                strokeOpacity={0.65}
                strokeWidth={isBoulevard ? 0.6 : 0.3}
                strokeDasharray="2 2"
              />
            </g>
          );
        })}

        {/* Tier 0 Houses / Parks (Subtle backdrop) */}
        {houseBuildings.map((b, idx) => {
          const w = b.widthMeters - 0.8;
          const d = b.depthMeters - 0.8;
          const isPark = b.id === 'EMPTY_LOT';
          return (
            <rect
              key={`h-${idx}`}
              x={b.worldPos[0] - w / 2}
              y={b.worldPos[2] - d / 2}
              width={w}
              height={d}
              rx={0.6}
              className={
                isPark
                  ? 'fill-emerald-200/70 dark:fill-emerald-950/60 stroke-emerald-300 dark:stroke-emerald-800'
                  : 'fill-slate-200/80 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700'
              }
              strokeWidth={0.25}
            />
          );
        })}

        {/* Named Facilities (Tier 1, 2, 3) */}
        {namedBuildings.map((b) => {
          const isStart = b.id === startBuildingId;
          const isTarget = b.id === revealedTargetId;
          const isHighlight = b.id === highlightBuildingId;
          const palette = TIER_COLORS[b.tier] ?? TIER_COLORS[1];
          const w = b.widthMeters - 0.7;
          const d = b.depthMeters - 0.7;

          return (
            <g key={b.id}>
              <rect
                x={b.worldPos[0] - w / 2}
                y={b.worldPos[2] - d / 2}
                width={w}
                height={d}
                rx={1.1}
                fill={isTarget ? '#ef4444' : isStart ? '#8b5cf6' : palette.fill}
                stroke={isTarget ? '#fef08a' : isHighlight ? '#ffffff' : palette.stroke}
                strokeWidth={isTarget || isStart || isHighlight ? 1.1 : 0.45}
                opacity={0.92}
              />
              {/* Building Label */}
              <text
                x={b.worldPos[0]}
                y={b.worldPos[2] + (showJapanese ? -0.5 : 0.8)}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={b.tier === 3 ? 2.6 : b.tier === 2 ? 2.1 : 1.7}
                fontWeight="800"
                style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: 0.45 }}
              >
                {b.nameEn.length > 13 ? `${b.nameEn.slice(0, 12)}…` : b.nameEn}
              </text>
              {showJapanese && (
                <text
                  x={b.worldPos[0]}
                  y={b.worldPos[2] + 2.0}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={1.45}
                  fontWeight="700"
                  style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: 0.35 }}
                >
                  {b.nameJa}
                </text>
              )}
              {isStart && (
                <text
                  x={b.worldPos[0]}
                  y={b.worldPos[2] - d / 2 - 1.0}
                  textAnchor="middle"
                  fill="#7c3aed"
                  fontSize={2.4}
                  fontWeight="900"
                >
                  START
                </text>
              )}
              {isTarget && (
                <circle
                  cx={b.entrancePos[0]}
                  cy={b.entrancePos[2]}
                  r={3.2}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth={0.9}
                  strokeDasharray="1.5 1.2"
                />
              )}
            </g>
          );
        })}

        {/* Revealed Optimal Route */}
        {pathPoints && (
          <polyline
            points={pathPoints}
            fill="none"
            stroke="#facc15"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2.8 1.8"
            opacity={0.95}
          />
        )}

        {/* Live / Replay Student Markers */}
        {players.map((p) => {
          const deg = (p.yaw * 180) / Math.PI;
          const r = p.isSelf ? 2.6 : p.podiumPlace ? 2.3 : 1.85;
          const medal = p.podiumPlace === 1 ? '🥇' : p.podiumPlace === 2 ? '🥈' : p.podiumPlace === 3 ? '🥉' : null;
          return (
            <g key={p.playerId} transform={`translate(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`}>
              {/* Direction cone */}
              <g transform={`rotate(${(-deg).toFixed(1)})`}>
                <polygon
                  points={`0,${r + 2.4} ${-r * 0.7},${r * 0.4} ${r * 0.7},${r * 0.4}`}
                  fill={p.isSelf ? '#38bdf8' : p.color}
                  opacity={0.85}
                />
              </g>
              <circle
                r={r}
                fill={p.color}
                stroke={p.podiumPlace === 1 ? '#facc15' : '#ffffff'}
                strokeWidth={p.isSelf || p.podiumPlace === 1 ? 0.75 : 0.45}
              />
              {p.attendanceNumber != null && (
                <text
                  y={0.65}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={1.75}
                  fontWeight="900"
                  style={{ pointerEvents: 'none' }}
                >
                  {p.attendanceNumber}
                </text>
              )}
              {medal && (
                <text y={-r - 0.8} textAnchor="middle" fontSize={3.2}>
                  {medal}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
