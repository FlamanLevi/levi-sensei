import React from 'react';
import { TyphoonTileData, TyphoonTeam, TyphoonCoordinateMode } from './types';
import { getEventDisplayInfo } from './utils';

interface TyphoonTileProps {
  tile: TyphoonTileData;
  openedTeam?: TyphoonTeam | null;
  isActiveTurn: boolean;
  coordinateMode?: TyphoonCoordinateMode;
  onSelect: () => void;
}

export const TyphoonTile: React.FC<TyphoonTileProps> = ({
  tile,
  openedTeam,
  coordinateMode = 'ALPHABET',
  onSelect
}) => {
  const eventInfo = getEventDisplayInfo(tile.event);

  if (tile.isOpened) {
    return (
      <div className="w-full h-full min-h-[90px] sm:min-h-[110px] md:min-h-[125px] rounded-2xl sm:rounded-3xl border-2 sm:border-3 border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 flex flex-col items-center justify-center p-2 text-center opacity-85 select-none relative overflow-hidden shadow-inner">
        <span className="text-2xl sm:text-3xl mb-0.5">{eventInfo.emoji}</span>
        <span className={`text-xs sm:text-sm font-black ${eventInfo.color} font-mono leading-tight`}>
          {eventInfo.label}
        </span>
        {openedTeam && (
          <span className="absolute bottom-1 right-1.5 text-[10px] font-bold opacity-75">
            {openedTeam.emoji}
          </span>
        )}
      </div>
    );
  }

  const isNumbers = coordinateMode === 'NUMBERS';
  const mainLabel = isNumbers ? `${tile.index + 1}` : tile.coordinate;
  const subLabel = isNumbers ? tile.coordinate : `#${tile.index + 1}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative w-full h-full min-h-[90px] sm:min-h-[110px] md:min-h-[125px] rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-slate-700 dark:border-slate-600 bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 hover:from-indigo-600 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-150 transform hover:-translate-y-1 active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center p-2 select-none overflow-hidden"
    >
      <div className="absolute top-1.5 left-2 sm:top-2 sm:left-2.5 text-[10px] sm:text-xs font-black font-mono text-slate-400 group-hover:text-white/80">
        {subLabel}
      </div>

      <span className="text-2xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight text-white group-hover:scale-110 transition-transform">
        {mainLabel}
      </span>

      <span className="text-[10px] sm:text-xs font-bold text-amber-400 opacity-90 mt-1">
        TAP 👆
      </span>
    </button>
  );
};
