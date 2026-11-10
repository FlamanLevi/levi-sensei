import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useVocabulary } from '@/context/VocabularyContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';
import {
  TyphoonGridSize,
  TyphoonCoordinateMode,
  TyphoonTileData,
  TyphoonTurnPhase,
  TyphoonTeam,
  TYPHOON_TEAMS_PRESET
} from './types';
import { generateTyphoonTiles } from './utils';
import { TyphoonTile } from './TyphoonTile';
import { TyphoonQuestionModal } from './TyphoonQuestionModal';
import { TyphoonEventModal } from './TyphoonEventModal';
import { TyphoonScoreboard } from './TyphoonScoreboard';
import {
  RotateCcw
} from 'lucide-react';

interface TyphoonGameProps {
  onExit?: () => void;
}

export const TyphoonGame: React.FC<TyphoonGameProps> = () => {
  const { scopedWords, filteredWords, gradeWords, allWords } = useVocabulary();
  const { activeGrade } = useClassroom();
  const { playPop, playWordAudio } = useAudio();
  const { t } = useLanguage();

  // Settings
  const [gridSize, setGridSize] = useState<TyphoonGridSize>('4x4');
  const [teamCount, setTeamCount] = useState<number>(4);
  const [coordinateMode, setCoordinateMode] = useState<TyphoonCoordinateMode>(() =>
    ['1', '2', '3', '4'].includes(activeGrade) ? 'NUMBERS' : 'ALPHABET'
  );
  const [typhoonSeverity] = useState<'FRIENDLY_500' | 'CLASSIC_ZERO'>('FRIENDLY_500');

  // Game State
  const [teams, setTeams] = useState<TyphoonTeam[]>(() =>
    TYPHOON_TEAMS_PRESET.slice(0, 4).map(tm => ({ ...tm, score: 0 }))
  );
  const [tiles, setTiles] = useState<TyphoonTileData[]>([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);
  const [phase, setPhase] = useState<TyphoonTurnPhase>('SELECTING_TILE');
  const [activeTile, setActiveTile] = useState<TyphoonTileData | null>(null);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  // Active word pool
  const rawPool = scopedWords.length >= 4
    ? scopedWords
    : (filteredWords.length >= 4 ? filteredWords : (gradeWords.length >= 4 ? gradeWords : allWords));
  const fallbackPool = gradeWords.length >= 4 ? gradeWords : allWords;

  // Initialize Game Board
  const initGame = useCallback(() => {
    const newTiles = generateTyphoonTiles(rawPool, fallbackPool, gridSize);
    setTiles(newTiles);
    setTeams(TYPHOON_TEAMS_PRESET.slice(0, teamCount).map(tm => ({ ...tm, score: 0 })));
    setActiveTeamIndex(0);
    setPhase('SELECTING_TILE');
    setActiveTile(null);
    soundEffects.playChime();
  }, [rawPool, fallbackPool, gridSize, teamCount]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const activeTeam = teams[activeTeamIndex] || teams[0];

  // Tile Selection
  const handleSelectTile = (tile: TyphoonTileData) => {
    if (phase !== 'SELECTING_TILE' || tile.isOpened) return;
    playPop();
    setActiveTile(tile);
    setPhase('QUESTION_ACTIVE');
  };

  // Answer approved by teacher
  const handleApproveAnswer = () => {
    if (!activeTile) return;
    soundEffects.playCorrect();
    setPhase('EVENT_REVEAL');
  };

  // Replay Question Audio
  const handlePlayPromptAudio = () => {
    if (!activeTile) return;
    playWordAudio(activeTile.card.sound_file || activeTile.card.primary_audio, activeTile.card.english);
  };

  // Close tile & advance turn
  const finalizeTile = useCallback((tileId: string) => {
    setTiles(prev =>
      prev.map(t =>
        t.id === tileId ? { ...t, isOpened: true, openedByTeam: activeTeamIndex } : t
      )
    );
    setActiveTile(null);

    // Check game over
    const remainingUnopened = tiles.filter(t => t.id !== tileId && !t.isOpened).length;
    if (remainingUnopened === 0) {
      setPhase('GAME_OVER');
      soundEffects.playFanfare();
      confetti({ particleCount: 150, spread: 100 });
    } else {
      setPhase('SELECTING_TILE');
      setActiveTeamIndex(prev => (prev + 1) % teams.length);
    }
  }, [activeTeamIndex, tiles, teams.length]);

  // Confirm Points event
  const handleConfirmPoints = useCallback(() => {
    if (!activeTile) return;
    const pts =
      activeTile.event === 'POINTS_100' ? 100 :
      activeTile.event === 'POINTS_200' ? 200 :
      activeTile.event === 'POINTS_300' ? 300 :
      activeTile.event === 'POINTS_500' ? 500 :
      activeTile.event === 'JACKPOT_1000' ? 1000 :
      activeTile.event === 'BOMB' ? -200 : 0;

    setTeams(prev => {
      const next = [...prev];
      next[activeTeamIndex] = {
        ...next[activeTeamIndex],
        score: Math.max(0, next[activeTeamIndex].score + pts)
      };
      return next;
    });

    finalizeTile(activeTile.id);
  }, [activeTile, activeTeamIndex, finalizeTile]);

  // Execute interactive rival target action
  const handleExecuteTargetAction = (targetTeamId: string) => {
    if (!activeTile) return;
    const targetIdx = teams.findIndex(tm => tm.id === targetTeamId);
    if (targetIdx === -1) return;

    setTeams(prev => {
      const next = [...prev];
      if (activeTile.event === 'TYPHOON') {
        soundEffects.playCurtainSwoosh();
        confetti({ particleCount: 80, spread: 80 });
        const deduct = typhoonSeverity === 'CLASSIC_ZERO' ? next[targetIdx].score : 500;
        next[targetIdx] = {
          ...next[targetIdx],
          score: Math.max(0, next[targetIdx].score - deduct)
        };
      } else if (activeTile.event === 'SWAP') {
        soundEffects.playChime();
        const temp = next[activeTeamIndex].score;
        next[activeTeamIndex] = { ...next[activeTeamIndex], score: next[targetIdx].score };
        next[targetIdx] = { ...next[targetIdx], score: temp };
      } else if (activeTile.event === 'STEAL_200') {
        soundEffects.playCorrect();
        const stolen = Math.min(200, next[targetIdx].score);
        next[targetIdx] = { ...next[targetIdx], score: next[targetIdx].score - stolen };
        next[activeTeamIndex] = { ...next[activeTeamIndex], score: next[activeTeamIndex].score + stolen };
      }
      return next;
    });

    finalizeTile(activeTile.id);
  };

  // Manual Score Adjustments
  const handleAdjustScore = (teamIdx: number, delta: number) => {
    setTeams(prev => {
      const next = [...prev];
      next[teamIdx] = {
        ...next[teamIdx],
        score: Math.max(0, next[teamIdx].score + delta)
      };
      return next;
    });
  };

  // Clicker support
  useClassroomClicker({
    onNext: () => {
      if (phase === 'QUESTION_ACTIVE') handleApproveAnswer();
      else if (phase === 'EVENT_REVEAL' && activeTile && !['TYPHOON', 'SWAP', 'STEAL_200'].includes(activeTile.event)) {
        handleConfirmPoints();
      }
    },
    onReplayAudio: handlePlayPromptAudio,
    onBlankScreen: () => setIsBlackout(b => !b)
  });

  // Calculate winner
  const sortedTeams = useMemo(() => [...teams].sort((a, b) => b.score - a.score), [teams]);
  const winner = sortedTeams[0];

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-2 sm:p-4 select-none relative font-['UD_Digi_Kyokasho_NP-R','Zen_Maru_Gothic',sans-serif]">
      {/* 1. Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md">
            🌀
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t("Typhoon Team Battle", <>タイフーン・チームバトル</>)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                Stream 🅰️ TV
              </span>
            </h2>
          </div>
        </div>

        {/* Settings & Controls Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Team Count Dropdown */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 px-1.5">{t("Teams:", "チーム:")}</span>
            {[2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setTeamCount(num)}
                className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                  teamCount === num
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Grid Size */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setGridSize('4x4')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                gridSize === '4x4' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              4×4 (16)
            </button>
            <button
              type="button"
              onClick={() => setGridSize('5x4')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                gridSize === '5x4' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              5×4 (20)
            </button>
            <button
              type="button"
              onClick={() => setGridSize('5x5')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                gridSize === '5x5' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              5×5 (25)
            </button>
          </div>

          {/* Coordinate Mode Toggle (123 Numbers vs ABC Letters) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCoordinateMode('NUMBERS')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                coordinateMode === 'NUMBERS'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('123 Numbers', <>123 <ruby>数字<rt className="text-[7px]">すうじ</rt></ruby></>)}
            </button>
            <button
              type="button"
              onClick={() => setCoordinateMode('ALPHABET')}
              className={`px-2 py-0.5 rounded-lg font-black transition-all cursor-pointer ${
                coordinateMode === 'ALPHABET'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t('ABC Grid', <>ABC <ruby>英字<rt className="text-[7px]">えいじ</rt></ruby></>)}
            </button>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={initGame}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Reset Board"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* 2. Main Stage Grid */}
      <div className="flex-1 bg-slate-900/90 rounded-3xl p-3 sm:p-5 border-4 border-slate-800 shadow-2xl flex flex-col justify-center my-1 relative overflow-hidden">
        {phase === 'GAME_OVER' ? (
          /* Victory Presentation Screen */
          <div className="flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
            <span className="text-7xl sm:text-8xl mb-3 animate-bounce">🏆</span>
            <span className="text-sm font-black uppercase tracking-widest text-amber-400 mb-1">
              GAME OVER • FINAL RESULTS
            </span>
            <h3 className="text-3xl sm:text-5xl font-black text-white mb-4">
              {winner.emoji} {winner.jaName} ({winner.name}) {t("VICTORY!", <><ruby>優勝<rt className="text-[9px]">ゆうしょう</rt></ruby>！</>)}
            </h3>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300 mb-6">
              {winner.score.toLocaleString()} points
            </p>
            <button
              type="button"
              onClick={initGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              🔄 {t("Play Again", <>もう<ruby>一度<rt className="text-[7px]">いちど</rt></ruby>あそぶ！</>)}
            </button>
          </div>
        ) : (
          /* The Coordinate Grid */
          <div
            className={`grid gap-2 sm:gap-3 w-full max-w-5xl mx-auto items-center ${
              gridSize === '4x4'
                ? 'grid-cols-4 grid-rows-4'
                : gridSize === '5x4'
                ? 'grid-cols-5 grid-rows-4'
                : 'grid-cols-5 grid-rows-5'
            }`}
          >
            {tiles.map((tile) => (
              <TyphoonTile
                key={tile.id}
                tile={tile}
                openedTeam={tile.openedByTeam !== undefined ? teams[tile.openedByTeam] : null}
                isActiveTurn={phase === 'SELECTING_TILE'}
                coordinateMode={coordinateMode}
                onSelect={() => handleSelectTile(tile)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Team Scoreboard at Bottom */}
      <div className="mt-2.5">
        <TyphoonScoreboard
          teams={teams}
          activeTeamIndex={activeTeamIndex}
          onAdjustScore={handleAdjustScore}
        />
      </div>

      {/* 4. Question Prompt Modal */}
      {phase === 'QUESTION_ACTIVE' && activeTile && (
        <TyphoonQuestionModal
          tile={activeTile}
          team={activeTeam}
          grade={activeGrade}
          coordinateMode={coordinateMode}
          onApproveAnswer={handleApproveAnswer}
          onRetry={() => {
            setActiveTile(null);
            setPhase('SELECTING_TILE');
          }}
          onPlayAudio={handlePlayPromptAudio}
        />
      )}

      {/* 5. Event Resolution Modal */}
      {phase === 'EVENT_REVEAL' && activeTile && (
        <TyphoonEventModal
          tile={activeTile}
          activeTeam={activeTeam}
          allTeams={teams}
          onConfirmPoints={handleConfirmPoints}
          onExecuteTargetAction={handleExecuteTargetAction}
        />
      )}

      {/* Emergency Blackout Shutter (KeyB) */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout(b => !b)} />
    </div>
  );
};
