import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  AnticipationBoardToken,
  AnticipationDiceEvent,
  PIECE_ORDER,
  PIECE_PRESETS,
  SPIRAL_GOAL_INDEX,
  SPIRAL_NODES,
  SpiralColorTone,
} from './types';

interface SpiralBoardProps {
  tokens: Record<string, AnticipationBoardToken>;
  lastDiceEvent?: AnticipationDiceEvent | null;
  highlightTokenId?: string;
}

const TONE_FILL: Record<SpiralColorTone, string> = {
  yellow: '#facc15',
  blue: '#38bdf8',
  green: '#34d399',
  pink: '#fb7185',
};

export const SpiralBoard: React.FC<SpiralBoardProps> = ({
  tokens,
  lastDiceEvent,
  highlightTokenId,
}) => {
  const { t, language } = useLanguage();
  const tokenList = Object.values(tokens || {}).sort((a, b) => b.spaceIndex - a.spaceIndex);

  // Group tokens by space index so co-located tokens spread in a tiny fan instead of overlapping
  const tokensBySpace = new Map<number, AnticipationBoardToken[]>();
  for (const tk of tokenList) {
    const idx = Math.max(0, Math.min(SPIRAL_GOAL_INDEX, tk.spaceIndex || 0));
    const arr = tokensBySpace.get(idx) || [];
    arr.push(tk);
    tokensBySpace.set(idx, arr);
  }

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl border-3 border-slate-200 dark:border-slate-800 shadow-lg p-2.5 sm:p-3 overflow-hidden">
      {/* Board Header + Live Dice Callout */}
      <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">🌀</span>
          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white whitespace-nowrap truncate">
            {language === 'ja' ? (
              <>4<ruby>層<rt>そう</rt></ruby>ボード</>
            ) : (
              'Spiral Board'
            )}
          </span>
        </div>

        {lastDiceEvent ? (
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0 shadow-xs animate-in zoom-in-95 duration-150">
            <span>{PIECE_PRESETS[lastDiceEvent.pieceId]?.emoji || '🎲'}</span>
            <span>+{lastDiceEvent.steps}</span>
            {lastDiceEvent.hitWarp && <span>🚀 WARP!</span>}
            {lastDiceEvent.hitPuzzle && <span>🧩 +1</span>}
          </span>
        ) : (
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            {t('+1–3 / solve', '1〜3マス前進')}
          </span>
        )}
      </div>

      {/* Responsive SVG Spiral Board */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center py-0.5">
        <svg viewBox="0 0 400 400" className="w-full h-full max-h-[270px] sm:max-h-[305px] select-none">
          {/* Concentric Ring Guide Tracks */}
          {[170, 128, 86, 46].map((r, i) => (
            <circle
              key={r}
              cx={200}
              cy={200}
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth={i === 0 ? 3 : 2}
              strokeDasharray="6 6"
            />
          ))}

          {/* Path connectors between consecutive spiral nodes */}
          {SPIRAL_NODES.slice(0, -1).map((node, i) => {
            const next = SPIRAL_NODES[i + 1];
            const isLevelJump = next.level !== node.level;
            return (
              <line
                key={`edge-${node.index}`}
                x1={node.x}
                y1={node.y}
                x2={next.x}
                y2={next.y}
                stroke={isLevelJump ? '#f59e0b' : '#94a3b8'}
                strokeWidth={isLevelJump ? 3.5 : 2.5}
                strokeDasharray={isLevelJump ? '5 4' : undefined}
                opacity={isLevelJump ? 0.9 : 0.45}
              />
            );
          })}

          {/* Board Spaces */}
          {SPIRAL_NODES.map((node) => {
            const isGoal = node.kind === 'GOAL';
            const isWarp = node.kind === 'WARP';
            const isPuzzle = node.kind === 'PUZZLE';
            const isDots = node.kind === 'FEATURE_DOTS';
            const radius = isGoal ? 22 : isPuzzle || isWarp ? 16 : 13;

            return (
              <g key={node.index}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={isGoal ? '#fbbf24' : TONE_FILL[node.tone]}
                  stroke={isWarp ? '#7c3aed' : isPuzzle ? '#0f172a' : '#ffffff'}
                  strokeWidth={isGoal ? 3.5 : isWarp ? 3 : 2}
                />
                {isGoal && (
                  <text x={node.x} y={node.y + 6} textAnchor="middle" fontSize="18">
                    👑
                  </text>
                )}
                {isPuzzle && node.puzzlePiece && (
                  <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize="13">
                    {PIECE_PRESETS[node.puzzlePiece].emoji}
                  </text>
                )}
                {isDots && (
                  <text x={node.x} y={node.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a">
                    ★
                  </text>
                )}
                {isWarp && (
                  <text x={node.x} y={node.y + 4.5} textAnchor="middle" fontSize="12">
                    🚀
                  </text>
                )}
              </g>
            );
          })}

          {/* Animated Tokens Layer */}
          {Array.from(tokensBySpace.entries()).map(([spaceIdx, list]) => {
            const node = SPIRAL_NODES[spaceIdx] || SPIRAL_NODES[0];
            return list.map((tk, i) => {
              const preset = PIECE_PRESETS[tk.pieceId] || PIECE_PRESETS.shoes;
              const angle = (Math.PI * 2 * i) / Math.max(1, list.length);
              const offsetDist = list.length > 1 ? 10 : 0;
              const tx = node.x + Math.cos(angle) * offsetDist;
              const ty = node.y + Math.sin(angle) * offsetDist;
              const isHighlighted = tk.id === highlightTokenId;

              return (
                <g
                  key={tk.id}
                  style={{
                    transform: `translate(${tx}px, ${ty}px)`,
                    transition: 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {isHighlighted && (
                    <circle cx={0} cy={0} r={17} fill="none" stroke="#f59e0b" strokeWidth={2.5} opacity={0.9} />
                  )}
                  <circle
                    cx={0}
                    cy={0}
                    r={13}
                    fill={preset.colorHex}
                    stroke="#ffffff"
                    strokeWidth={2.5}
                  />
                  <text x={0} y={4.5} textAnchor="middle" fontSize="13">
                    {preset.emoji}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      {/* Token Standings + 4 Classic Puzzle Pieces Row */}
      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
        {tokenList.slice(0, 4).map((tk) => {
          const preset = PIECE_PRESETS[tk.pieceId] || PIECE_PRESETS.shoes;
          const level = SPIRAL_NODES[tk.spaceIndex]?.level || 1;
          return (
            <div
              key={tk.id}
              className={`px-2 py-1.5 rounded-xl border flex flex-col gap-0.5 text-[11px] min-w-0 ${
                tk.id === highlightTokenId
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="text-xs shrink-0">{preset.emoji}</span>
                  <span className="font-black text-slate-900 dark:text-white truncate">
                    {language === 'ja' && tk.jaName ? tk.jaName : tk.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-black px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                  L{Math.min(4, level)}·#{tk.spaceIndex}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="flex items-center gap-0.5" title="Collected puzzle corners">
                  {PIECE_ORDER.map((pid) => (
                    <span
                      key={pid}
                      className={tk.collectedPieces?.includes(pid) ? 'opacity-100' : 'opacity-25'}
                    >
                      {PIECE_PRESETS[pid].emoji}
                    </span>
                  ))}
                </span>
                <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                  {tk.collectedPieces?.length || 0}/4
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
