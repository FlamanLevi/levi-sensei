import React, { useState, useEffect } from 'react';
import { VocabularyItem, GradeLevel } from '@data/types';
import { VisualMode, GridSize, TileLabelMode, KANJI_TILES } from './types';
import { resolveCardImage } from './utils';
import { Volume2, Sparkles, Lock } from 'lucide-react';
import { RubyText } from '@/components/common/RubyText';

interface PixelStageProps {
  card: VocabularyItem;
  grade: GradeLevel;
  visualMode: VisualMode;
  mosaicStage: number; // 0, 1, 2, 3
  zoomStage: number; // 0, 1, 2, 3
  silhouetteStage: number; // 0, 1, 2
  gridSize: GridSize;
  labelMode: TileLabelMode;
  peeledTiles: number[];
  isCenterLocked: (tileNum: number) => boolean;
  isRevealed: boolean;
  onPeelTile: (tileNum: number) => void;
  onPlayAudio: () => void;
}

export const PixelStage: React.FC<PixelStageProps> = ({
  card,
  grade,
  visualMode,
  mosaicStage,
  zoomStage,
  silhouetteStage,
  gridSize,
  labelMode,
  peeledTiles,
  isCenterLocked,
  isRevealed,
  onPeelTile,
  onPlayAudio
}) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = resolveCardImage(card, grade);

  useEffect(() => {
    setImgError(false);
  }, [card.id]);

  // Tile count: 2x2 = 4, 3x3 = 9, 4x4 = 16
  const totalTiles = gridSize === '4x4' ? 16 : gridSize === '3x3' ? 9 : 4;
  const tileList = Array.from({ length: totalTiles }, (_, i) => i + 1);

  // Compute CSS filter and transform based on mode and current stage
  let stageFilter = 'none';
  let stageTransform = 'scale(1)';

  if (!isRevealed) {
    if (visualMode === 'MOSAIC') {
      stageFilter = mosaicStage === 0 ? 'blur(16px)' : mosaicStage === 1 ? 'blur(10px)' : mosaicStage === 2 ? 'blur(4px)' : 'none';
      stageTransform = 'scale(1.15)';
    } else if (visualMode === 'ZOOM') {
      stageTransform = zoomStage === 0 ? 'scale(3.4)' : zoomStage === 1 ? 'scale(2.2)' : zoomStage === 2 ? 'scale(1.4)' : 'scale(1)';
    } else if (visualMode === 'SILHOUETTE') {
      stageFilter = silhouetteStage === 0
        ? 'brightness(0) drop-shadow(0 0 16px rgba(245, 158, 11, 0.4))'
        : silhouetteStage === 1
        ? 'brightness(0.35) saturate(220%)'
        : 'none';
    }
  }

  return (
    <div className="relative w-full flex-1 min-h-[250px] sm:min-h-[290px] md:min-h-[340px] lg:min-h-[380px] bg-amber-50/50 dark:bg-slate-900/60 rounded-3xl border-4 border-amber-300 dark:border-slate-700 shadow-2xl flex flex-col items-center justify-between p-3 sm:p-5 overflow-hidden select-none">
      {/* Top stage badge & audio replay */}
      <div className="w-full flex items-center justify-between z-20">
        <span className="px-3.5 py-1 rounded-full text-xs font-black bg-white/80 dark:bg-slate-800/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-slate-700 shadow-xs backdrop-blur">
          {visualMode === 'TILES'
            ? `🧩 パネル (${gridSize}: ${totalTiles - peeledTiles.length}枚残り)`
            : visualMode === 'MOSAIC'
            ? `🌫️ モザイク (Level ${isRevealed ? 3 : mosaicStage + 1}/3)`
            : visualMode === 'ZOOM'
            ? `🔍 ズーム (Level ${isRevealed ? 3 : zoomStage + 1}/3)`
            : `👤 シルエット (Level ${isRevealed ? 2 : silhouetteStage + 1}/2)`}
        </span>

        {isRevealed && (
          <button
            onClick={onPlayAudio}
            className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md transition-transform active:scale-90"
            title="Play pronunciation"
          >
            <Volume2 size={20} />
          </button>
        )}
      </div>

      {/* Center Mystery Stage Viewport */}
      <div className="relative w-full max-w-md md:max-w-2xl lg:max-w-3xl h-[min(46dvh,280px)] sm:h-[min(50dvh,320px)] md:h-[min(52dvh,360px)] lg:h-[min(54dvh,400px)] rounded-3xl overflow-hidden border-4 border-amber-400 dark:border-amber-600 shadow-inner bg-white dark:bg-slate-800 flex items-center justify-center">
        {/* The Card Artwork with filter / scale applied */}
        <div
          className="w-full h-full p-4 flex flex-col items-center justify-center transition-all duration-500 ease-out overflow-hidden"
          style={{
            filter: stageFilter,
            transform: stageTransform,
            transformOrigin: 'center center'
          }}
        >
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={card.english}
              onError={() => setImgError(true)}
              className="max-h-[min(36dvh,220px)] md:max-h-[min(42dvh,300px)] w-auto object-contain drop-shadow-xl"
            />
          ) : (
            <div className="text-center p-4">
              <span className="text-7xl block mb-2">📖</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{card.english}</span>
            </div>
          )}
        </div>

        {/* Tiles Grid Overlay (Only in 'TILES' mode and when NOT revealed) */}
        {visualMode === 'TILES' && !isRevealed && (
          <div
            className={`absolute inset-0 grid gap-1 p-1 ${
              gridSize === '4x4'
                ? 'grid-cols-4 grid-rows-4'
                : gridSize === '3x3'
                ? 'grid-cols-3 grid-rows-3'
                : 'grid-cols-2 grid-rows-2'
            }`}
          >
            {tileList.map((tile) => {
              const isPeeled = peeledTiles.includes(tile);
              const locked = isCenterLocked(tile);
              const tileInfo = KANJI_TILES[tile - 1];
              const letterChar = String.fromCharCode(64 + tile);

              return (
                <div
                  key={tile}
                  onClick={() => onPeelTile(tile)}
                  className={`rounded-2xl border-2 border-white/80 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 select-none shadow-md ${
                    isPeeled
                      ? 'opacity-0 pointer-events-none scale-90'
                      : locked
                      ? 'bg-gradient-to-br from-amber-700 to-orange-800 text-white hover:brightness-105'
                      : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white hover:brightness-110 hover:scale-[1.02]'
                  }`}
                >
                  {!isPeeled && (
                    locked ? (
                      <div className="flex flex-col items-center justify-center text-center">
                        <Lock size={gridSize === '4x4' ? 18 : 24} className="text-amber-200 animate-pulse" />
                        <span className="text-[9px] sm:text-[10px] font-black text-amber-200 mt-0.5">
                          外側から！
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center">
                        <span
                          className={`font-black drop-shadow-md leading-none ${
                            gridSize === '4x4'
                              ? 'text-lg sm:text-2xl md:text-3xl'
                              : gridSize === '3x3'
                              ? 'text-2xl sm:text-4xl md:text-5xl'
                              : 'text-4xl sm:text-6xl md:text-7xl'
                          }`}
                        >
                          {labelMode === 'kanji'
                            ? tileInfo?.kanji
                            : labelMode === 'letter'
                            ? letterChar
                            : tile}
                        </span>
                        {labelMode === 'kanji' && tileInfo?.kana && (
                          <span
                            className={`font-bold text-amber-100 opacity-95 mt-0.5 ${
                              gridSize === '4x4' ? 'text-[8px]' : 'text-[10px] sm:text-xs'
                            }`}
                          >
                            {tileInfo.kana}
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Revealed Spotlight Banner */}
        {isRevealed && (
          <div className="absolute bottom-3 inset-x-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-2xl border-2 border-amber-400 dark:border-amber-500 text-center z-20 animate-bounce">
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5 flex items-center justify-center gap-1">
              <Sparkles size={14} />
              <span>正解！ REVEALED</span>
            </div>
            <div className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-2 flex-wrap">
              <span>{card.english}</span>
              <span className="text-base sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                <RubyText ruby={card.ruby} kanji={card.ja_kanji} hiragana={card.ja_hiragana} />
              </span>
            </div>
            {card.en_katakana && (
              <div className="text-xs sm:text-sm font-black text-amber-500 mt-0.5">
                【{card.en_katakana}】
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom prompt */}
      <div className="w-full text-center z-10">
        <span className="text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300">
          {isRevealed
            ? '🗣️ リピート！ Repeat after me! [Space] で次の問題へ'
            : '「What is it? これ なーんだ？ わかったら手をあげよう！」'}
        </span>
      </div>
    </div>
  );
};
