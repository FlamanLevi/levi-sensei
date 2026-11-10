import React, { useMemo } from 'react';
import { DeskState, AisleLayout } from './types';

interface ClassroomDeskGridProps {
  desks: DeskState[];
  rows: number;
  cols: number;
  targetedDeskIds: string[];
  isSweeping: boolean;
  aisleLayout?: AisleLayout;
  isEditMode?: boolean;
  onDeskClick: (desk: DeskState) => void;
}

export const ClassroomDeskGrid: React.FC<ClassroomDeskGridProps> = ({
  desks,
  rows,
  cols,
  targetedDeskIds,
  aisleLayout = 'PAIRED',
  isEditMode = false,
  onDeskClick
}) => {
  // Compute aisle column indices (if PAIRED)
  const { gridTemplateCols, aisleColumns } = useMemo(() => {
    if (aisleLayout === 'SINGLE') {
      return {
        gridTemplateCols: `repeat(${cols}, minmax(0, 1fr))`,
        aisleColumns: [] as number[]
      };
    }

    const parts: string[] = [];
    const aisles: number[] = [];
    let currentTrack = 1;

    for (let c = 0; c < cols; c++) {
      parts.push('minmax(0, 1fr)');
      currentTrack++;
      if (c % 2 === 1 && c < cols - 1) {
        parts.push('minmax(1rem, 2.25rem)');
        aisles.push(currentTrack);
        currentTrack++;
      }
    }

    return {
      gridTemplateCols: parts.join(' '),
      aisleColumns: aisles
    };
  }, [cols, aisleLayout]);

  const getDeskGridColumn = (col: number) => {
    if (aisleLayout === 'SINGLE') {
      return col + 1;
    }
    return col + Math.floor(col / 2) + 1;
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Blackboard Front Podium Indicator */}
      <div className="w-full max-w-2xl h-5 sm:h-6 mb-3 rounded-xl bg-slate-800 dark:bg-slate-700/80 border border-slate-600 flex items-center justify-center text-[10px] sm:text-xs font-black text-slate-300 tracking-wider shadow-inner">
        <span>👨‍🏫 <ruby>前<rt className="text-[7px]">まえ</rt></ruby>・<ruby>黒板側<rt className="text-[7px]">こくばんがわ</rt></ruby> (FRONT / TEACHER)</span>
      </div>

      {/* Grid of Desks */}
      <div
        className="grid gap-2 sm:gap-2.5 w-full max-w-4xl mx-auto"
        style={{
          gridTemplateColumns: gridTemplateCols,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
        }}
      >
        {/* Visual Walkway Aisle Guides */}
        {aisleColumns.map((aisleTrack) => (
          <div
            key={`aisle-${aisleTrack}`}
            style={{
              gridColumn: aisleTrack,
              gridRow: `1 / span ${rows}`
            }}
            className="flex flex-col items-center justify-between py-2 pointer-events-none select-none opacity-30 dark:opacity-25"
          >
            <span className="text-[9px]">🚶</span>
            <div className="w-px flex-1 my-1 border-r border-dashed border-slate-400 dark:border-slate-500" />
            <span className="text-[9px]">🚶</span>
          </div>
        ))}

        {/* Desks */}
        {desks.map((desk) => {
          const isTargeted = targetedDeskIds.includes(desk.id);
          const isStanding = desk.status === 'STANDING';
          const isEmpty = desk.status === 'EMPTY';

          return (
            <button
              key={desk.id}
              type="button"
              onClick={() => onDeskClick(desk)}
              style={{
                gridColumn: getDeskGridColumn(desk.col),
                gridRow: desk.row + 1
              }}
              className={`relative rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col items-center justify-center min-h-[58px] sm:min-h-[72px] transition-all duration-200 border-2 sm:border-3 cursor-pointer select-none ${
                isTargeted
                  ? 'bg-amber-400 border-amber-300 dark:border-amber-400 text-slate-950 scale-105 shadow-xl ring-4 ring-amber-300/60 z-10 animate-bounce'
                  : isEmpty
                  ? isEditMode
                    ? 'bg-rose-500/10 border-dashed border-rose-400 dark:border-rose-500 text-rose-400 hover:bg-rose-500/20 shadow-xs'
                    : 'bg-slate-850/30 border-dashed border-slate-400/40 dark:border-slate-700/60 text-slate-500 dark:text-slate-600 opacity-35 shadow-none'
                  : isStanding
                  ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-400 opacity-60 shadow-inner'
              }`}
            >
              {/* Desk Icon: Standing Kid vs Seated Chair vs Empty Desk */}
              <span className="text-xl sm:text-2xl leading-none">
                {isTargeted ? '🙋‍♂️' : isEmpty ? '🈳' : isStanding ? '🧍' : '🪑'}
              </span>

              {/* Seat Number Tag */}
              <span className={`text-[10px] sm:text-xs font-black font-mono mt-0.5 leading-none ${
                isTargeted ? 'text-slate-950' : isEmpty ? 'text-slate-400 line-through' : isStanding ? 'text-white' : 'text-slate-500'
              }`}>
                {isEmpty ? '空席' : `#${desk.label}`}
              </span>

              {/* Edit Mode badge */}
              {isEditMode && (
                <span className={`absolute -top-1.5 -right-1.5 text-[8px] font-black px-1 rounded-full text-white shadow-xs ${
                  isEmpty ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {isEmpty ? '＋' : '✕'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Back of Classroom Indicator */}
      <div className="text-[10px] font-bold text-slate-400 mt-2">
        <ruby>後<rt className="text-[7px]">うし</rt></ruby>ろ・ロッカー<ruby>側<rt className="text-[7px]">がわ</rt></ruby> (BACK OF CLASSROOM)
      </div>
    </div>
  );
};
