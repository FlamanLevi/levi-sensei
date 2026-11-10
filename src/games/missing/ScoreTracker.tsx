import React, { useState } from 'react';
import { TeamScores, ScoreboardMode } from './types';
import { Trophy, Flame, RotateCcw, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';

interface ScoreTrackerProps {
  mode?: '2_teams' | '4_teams';
  scores: TeamScores;
  streak: number;
  onUpdateScore: (team: keyof TeamScores, delta: number) => void;
  onResetScores: () => void;
}

export const ScoreTracker: React.FC<ScoreTrackerProps> = ({
  mode = '4_teams',
  scores,
  streak,
  onUpdateScore,
  onResetScores
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { playPop } = useAudio();
  const { t } = useLanguage();

  const handleScore = (team: keyof TeamScores, delta: number) => {
    playPop();
    onUpdateScore(team, delta);
  };

  const ALL_TEAMS: Array<{
    key: keyof TeamScores;
    label: React.ReactNode;
    plainLabel: string;
    color: string;
    badge: string;
    border: string;
    keyHint: string;
  }> = [
    {
      key: 'red',
      label: t('Red 🔴', <><ruby>赤<rt className="text-[7px] font-normal">あか</rt></ruby> 🔴</>),
      plainLabel: t('Red', '赤'),
      color: 'bg-rose-500 hover:bg-rose-600 text-white',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-700',
      keyHint: '1'
    },
    {
      key: 'blue',
      label: t('Blue 🔵', <><ruby>青<rt className="text-[7px] font-normal">あお</rt></ruby> 🔵</>),
      plainLabel: t('Blue', '青'),
      color: 'bg-blue-500 hover:bg-blue-600 text-white',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
      keyHint: '2'
    },
    {
      key: 'yellow',
      label: t('Yellow 🟡', <><ruby>黄<rt className="text-[7px] font-normal">き</rt></ruby> 🟡</>),
      plainLabel: t('Yellow', '黄'),
      color: 'bg-amber-500 hover:bg-amber-600 text-white',
      badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-700',
      keyHint: '3'
    },
    {
      key: 'green',
      label: t('Green 🟢', <><ruby>緑<rt className="text-[7px] font-normal">みどり</rt></ruby> 🟢</>),
      plainLabel: t('Green', '緑'),
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-700',
      keyHint: '4'
    }
  ];

  const visibleTeams = mode === '2_teams' ? ALL_TEAMS.slice(0, 2) : ALL_TEAMS;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg px-3 py-2 transition-all">
      <div className="flex items-center justify-between gap-3">
        {/* Streak Counter Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400">
            <Flame size={16} className={streak > 0 ? 'animate-bounce text-orange-500' : ''} />
            <span className="text-xs font-black">
              {t(`Streak: ${streak}`, <>連続: {streak}回</>)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
            {t('Team Scores', <>チーム<ruby>得点<rt className="text-[7px] font-normal text-slate-400">とくてん</rt></ruby><ruby>表<rt className="text-[7px] font-normal text-slate-400">ひょう</rt></ruby></>)}
          </span>
        </div>

        {/* Toggle & Reset */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isExpanded ? t('Collapse scores', 'スコアを閉じる') : t('Expand scores', 'スコアを開く')}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={onResetScores}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={t('Reset Scores', '得点をリセット')}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Team Scores */}
      {isExpanded && (
        <div className={`grid grid-cols-2 ${mode === '4_teams' ? 'sm:grid-cols-4' : ''} gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700`}>
          {visibleTeams.map((team) => (
            <div
              key={team.key}
              className={`flex items-center justify-between p-1.5 rounded-xl border ${team.border} ${team.badge}`}
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-black leading-tight flex items-center gap-1">
                  {team.label}
                  <span className="opacity-50 text-[9px] font-mono">[{team.keyHint}]</span>
                </span>
                <span className="text-lg font-black leading-none mt-0.5">
                  {scores[team.key]}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleScore(team.key, 1)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] rounded-xl ${team.color} flex items-center justify-center shadow-sm font-black text-sm active:scale-90 transition-transform cursor-pointer`}
                  title={`+1 for ${team.plainLabel} (Press ${team.keyHint}, Shift+${team.keyHint} to -1)`}
                >
                  <Plus size={16} />
                </button>
                {scores[team.key] > 0 && (
                  <button
                    onClick={() => handleScore(team.key, -1)}
                    className="w-7 h-8 sm:w-8 sm:h-9 min-w-[28px] rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs active:scale-90 cursor-pointer"
                    title="-1 point"
                  >
                    <Minus size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
