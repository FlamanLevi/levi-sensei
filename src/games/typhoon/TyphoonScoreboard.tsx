import React from 'react';
import { TyphoonTeam } from './types';
import { Plus, Minus } from 'lucide-react';

interface TyphoonScoreboardProps {
  teams: TyphoonTeam[];
  activeTeamIndex: number;
  onAdjustScore: (teamIndex: number, delta: number) => void;
}

export const TyphoonScoreboard: React.FC<TyphoonScoreboardProps> = ({
  teams,
  activeTeamIndex,
  onAdjustScore
}) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-lg flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 w-full">
        {teams.map((tm, idx) => {
          const isTurn = idx === activeTeamIndex;
          return (
            <div
              key={tm.id}
              className={`p-2 rounded-2xl border-2 transition-all flex flex-col justify-between relative ${
                isTurn
                  ? `${tm.bgLight} ${tm.border} ring-3 ${tm.ring} shadow-md scale-102`
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-75'
              }`}
            >
              {/* Turn Indicator */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1 truncate">
                  <span>{tm.emoji}</span>
                  <span className={tm.text}>{tm.jaName}</span>
                </span>

                {isTurn && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] animate-pulse">
                    TURN
                  </span>
                )}
              </div>

              {/* Score Display */}
              <div className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white my-0.5 text-center">
                {tm.score} <span className="text-[10px] text-slate-400 font-normal">pts</span>
              </div>

              {/* Manual Teacher Adjustment Buttons */}
              <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => onAdjustScore(idx, 100)}
                  className="w-6 h-6 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs active:scale-90"
                  title="+100"
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustScore(idx, -100)}
                  className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90"
                  title="-100"
                >
                  <Minus size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
