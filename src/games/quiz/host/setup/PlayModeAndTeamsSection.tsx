import React from 'react';
import { Award, Flag, Palette, Shuffle, Sparkles, Tv, User, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  AVAILABLE_TEAMS,
  GameMode,
  GamePlayType,
  TEAM_PRESETS,
  TeamAssignmentMode,
  TeamId,
} from '../../types';

interface PlayModeAndTeamsSectionProps {
  gameStyleStep: number;
  battleFormatStep: number;
  gamePlayType: GamePlayType;
  onSelectGamePlayType: (nextType: GamePlayType) => void;
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  selectedTeams: TeamId[];
  onToggleTeam: (teamId: TeamId) => void;
  teamAssignment: TeamAssignmentMode;
  onSelectTeamAssignment: (mode: TeamAssignmentMode) => void;
}

export const PlayModeAndTeamsSection: React.FC<PlayModeAndTeamsSectionProps> = ({
  gameStyleStep,
  battleFormatStep,
  gamePlayType,
  onSelectGamePlayType,
  gameMode,
  onSelectGameMode,
  selectedTeams,
  onToggleTeam,
  teamAssignment,
  onSelectTeamAssignment,
}) => {
  const { t, language } = useLanguage();
  const isTamaireSelected = gamePlayType === 'TAMAIRE' || gamePlayType === 'VOLLEYBALL';
  const showBattleFormat = gamePlayType !== 'TUG_OF_WAR' && !isTamaireSelected;

  return (
    <>
      {/* Game Style / Format */}
      <div>
        <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
          {t(`${gameStyleStep}. Game Style`, `${gameStyleStep}. ゲーム形式`)}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-start">
          {/* Column 1: Turn-Based / Synchronized */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-xs">⏱️</span>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {t('Turn-Based / Synchronized', 'ターン制・一斉シンクロ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectGamePlayType('KAHOOT')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                gamePlayType === 'KAHOOT'
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  gamePlayType === 'KAHOOT' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <Tv size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black block">{t('Live Arena (Kahoot Style)', '一斉対戦 (Kahootスタイル)')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {t('Standard', '定番')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                  {t(
                    'Everyone answers each question together. TV reveals questions; iPads submit.',
                    '全員同時に1問ずつ回答。TVで問題発表、iPadで解答するシンクロ型。'
                  )}
                </span>
              </div>
            </button>
          </div>

          {/* Column 2: Grand Prix Racing (3D Suzuka Grand Prix) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-xs">🏎️</span>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t('Grand Prix Racing', 'F1 グランプリレース')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectGamePlayType('GRAND_PRIX_3D')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                gamePlayType === 'GRAND_PRIX_3D'
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-400/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  gamePlayType === 'GRAND_PRIX_3D'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <Flag size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black block">{t('3D Suzuka Grand Prix', '3D 鈴鹿グランプリ')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    {t('🏎️ 3D Circuit', '🏎️ 3Dコース')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                  {t(
                    'Full 3D figure-8 circuit! Build throttle speed with streaks & race on TV + iPads.',
                    '本格3D立体交差サーキット！連続正解で加速し、TVとiPadでリアルタイム3Dレース。'
                  )}
                </span>
              </div>
            </button>
          </div>

          {/* Column 3: Sports Day / Undokai (Tug of War on top, Tamaire below) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-xs">🚩</span>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t('Sports Day / Undokai', '運動会・スポーツバトル')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectGamePlayType('TUG_OF_WAR')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                gamePlayType === 'TUG_OF_WAR'
                  ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-sm ring-1 ring-amber-400/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  gamePlayType === 'TUG_OF_WAR'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <Award size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black block">{t('Tug of War (綱引き)', '運動会 綱引きバトル')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                    {t('Undokai 🚩', '運動会 🚩')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                  {t(
                    'Red vs White Undokai clash! Correct pulls rope; wrong answers slip in mud!',
                    '紅組 vs 白組！正解でロープを引き寄せ、誤答は泥ですべる！'
                  )}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectGamePlayType('TAMAIRE')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                isTamaireSelected
                  ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-400/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  isTamaireSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black block">{t('Bean Bag Toss (玉入れ)', '運動会 玉入れバトル')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {t('Undokai 🔴⚪', '運動会 🔴⚪')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                  {t(
                    'Red vs White Undokai Bean Bag Toss! Rapid-fire throws + dramatic counting ceremony!',
                    '紅組 vs 白組の運動会玉入れ！連続正解でカゴへ投げ入れ、最後はドキドキ玉かぞえ！'
                  )}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Battle Format (Individual vs Team Battle) */}
      {showBattleFormat && (
        <div>
          <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
            {t(`${battleFormatStep}. Battle Format`, `${battleFormatStep}. 対戦形式`)}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <button
              type="button"
              onClick={() => onSelectGameMode('INDIVIDUAL')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                gameMode === 'INDIVIDUAL'
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl ${
                  gameMode === 'INDIVIDUAL' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <User size={20} />
              </div>
              <div>
                <span className="text-xs font-black block">{t('Individual Battle', '個人戦')}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Everyone competes for the highest score on the podium.', '全員でスコアを競う定番の個人バトル')}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectGameMode('TEAM')}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                gameMode === 'TEAM'
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl ${
                  gameMode === 'TEAM' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <Users size={20} />
              </div>
              <div>
                <span className="text-xs font-black block">{t('Team Battle (2–6 Rainbow Teams)', 'チーム対抗戦 (2〜6色)')}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('🔴 Red ⚪ White (Default) with up to 6 rainbow teams', '🔴赤組 ⚪白組 を基本に、最大6色のチーム対戦')}
                </span>
              </div>
            </button>
          </div>

          {/* Sub-selector for Team Battle: Team Selection & Assignment */}
          {gameMode === 'TEAM' && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-900/60 animate-in fade-in duration-150 space-y-4">
              {/* 1. Team Colors Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                    {t('Participating Teams (Choose 2–6 Colors)', '参加チーム（2〜6色を選択）')}
                  </span>
                  <span className="text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                    {selectedTeams.length} {t('Teams Active', 'チーム選択中')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2.5">
                  {AVAILABLE_TEAMS.map((tId) => {
                    const preset = TEAM_PRESETS[tId];
                    const isSelected = selectedTeams.includes(tId);
                    return (
                      <button
                        key={tId}
                        type="button"
                        onClick={() => onToggleTeam(tId)}
                        className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-blue-400 scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/50 opacity-40 hover:opacity-80'
                        }`}
                      >
                        <span className="text-2xl">{preset.emoji}</span>
                        <span className={`text-xs font-black ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {language === 'ja' ? preset.jaName : preset.name.replace(' Team', '')}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isSelected ? t('ON', '参加') : t('OFF', '不参加')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Rainbow Color Chips Preview */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 mr-1 uppercase">
                    {t('Active:', '参加チーム:')}
                  </span>
                  {selectedTeams.map((tId) => {
                    const preset = TEAM_PRESETS[tId];
                    const isWhiteTeam = tId === 'team_white';
                    return (
                      <span
                        key={tId}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${
                          isWhiteTeam ? 'bg-white text-slate-900 border border-slate-300' : `text-white ${preset.bg}`
                        } shadow-xs animate-in zoom-in-95 duration-100`}
                      >
                        <span>{preset.emoji}</span>
                        <span>{language === 'ja' ? preset.jaName : preset.name.replace(' Team', '')}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 2. Team Assignment Method */}
              <div>
                <span className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider block mb-2">
                  {t('Team Assignment Method', 'チーム分けの方法')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectTeamAssignment('AUTO_BALANCE')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      teamAssignment === 'AUTO_BALANCE'
                        ? 'border-blue-500 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                        : 'border-blue-200/60 dark:border-blue-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Shuffle size={16} className={teamAssignment === 'AUTO_BALANCE' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                    <div>
                      <span className="text-xs font-black block">{t('⚡ Auto-Balance', '⚡ 自動ふりわけ')}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t('Automatically balances teams evenly (smoothest & recommended)', '全員を均等に自動配置（一番スムーズ・おすすめ）')}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTeamAssignment('STUDENT_CHOICE')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      teamAssignment === 'STUDENT_CHOICE'
                        ? 'border-blue-500 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                        : 'border-blue-200/60 dark:border-blue-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Palette size={16} className={teamAssignment === 'STUDENT_CHOICE' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                    <div>
                      <span className="text-xs font-black block">{t('🎨 Student Choice', '🎨 じぶんえらび')}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t('Students choose their team on iPad (capacity lock enabled)', '児童がiPadで選択（定員「満員」ロック付き）')}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
