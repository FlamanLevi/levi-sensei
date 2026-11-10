import React from 'react';
import { Search, X, ChevronDown, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type TeachingMomentFilter = 'ALL' | 'WARM_UP' | 'SPEAKING' | 'TEAM_BATTLE' | 'IPAD';
export type SkillCategoryFilter = 'ALL' | 'LISTENING' | 'SPEAKING' | 'READING_PHONICS' | 'MEMORY_SPEED' | 'TEAM_BATTLE' | 'TPR_MOVEMENT';
export type StatusFilter = 'ALL' | 'READY' | 'ROADMAP';
export type PlayerFilter = 'ALL' | 'WHOLE_CLASS' | 'TEAMS' | 'IPADS' | 'SOLO';
export type StreamFilter = 'ALL' | 'STREAM_A' | 'STREAM_B' | 'STREAM_C';
export type SortOption = 'PLAYABLE_FIRST' | 'NAME_EN' | 'NAME_JA';

interface GameFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTeachingMoment: TeachingMomentFilter;
  onTeachingMomentChange: (moment: TeachingMomentFilter) => void;
  teachingMomentCounts: Record<TeachingMomentFilter, number>;
  selectedSkill: SkillCategoryFilter;
  onSkillChange: (skill: SkillCategoryFilter) => void;
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  selectedStream: StreamFilter;
  onStreamChange: (stream: StreamFilter) => void;
  selectedPlayer: PlayerFilter;
  onPlayerChange: (player: PlayerFilter) => void;
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  filteredCount: number;
  readyCount: number;
  onResetFilters: () => void;
}

export const GameFilterBar: React.FC<GameFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTeachingMoment,
  onTeachingMomentChange,
  teachingMomentCounts,
  selectedSkill,
  onSkillChange,
  selectedStatus,
  onStatusChange,
  selectedStream,
  onStreamChange,
  selectedPlayer,
  onPlayerChange,
  selectedSort,
  onSortChange,
  totalCount,
  filteredCount,
  readyCount,
  onResetFilters
}) => {
  const { t, language } = useLanguage();

  const teachingMomentOptions: { id: TeachingMomentFilter; labelEn: string; labelJa: string; icon: string }[] = [
    { id: 'ALL', labelEn: 'All Activities', labelJa: '全アクティビティ', icon: '🌟' },
    { id: 'WARM_UP', labelEn: 'Quick Warm-Ups', labelJa: 'ウォーミングアップ', icon: '⚡' },
    { id: 'SPEAKING', labelEn: 'Speaking & Q&A', labelJa: 'スピーキング・Q&A', icon: '🗣️' },
    { id: 'TEAM_BATTLE', labelEn: 'Team Battles', labelJa: 'チーム対抗戦', icon: '🏆' },
    { id: 'IPAD', labelEn: 'Student iPads', labelJa: '児童iPad対戦', icon: '📱' },
  ];

  const skillOptions: { id: SkillCategoryFilter; labelEn: string; labelJa: string; icon: string }[] = [
    { id: 'ALL', labelEn: 'All Skills', labelJa: '全スキル', icon: '✨' },
    { id: 'LISTENING', labelEn: 'Listening', labelJa: 'リスニング', icon: '👂' },
    { id: 'SPEAKING', labelEn: 'Speaking & Chants', labelJa: 'スピーキング・発音', icon: '🗣️' },
    { id: 'READING_PHONICS', labelEn: 'Phonics & Reading', labelJa: 'フォニックス・読解', icon: '📖' },
    { id: 'MEMORY_SPEED', labelEn: 'Memory & Speed', labelJa: '記憶・スピード想起', icon: '⚡' },
    { id: 'TEAM_BATTLE', labelEn: 'Team Battles', labelJa: 'チーム対戦', icon: '🏆' },
    { id: 'TPR_MOVEMENT', labelEn: 'TPR & Movement', labelJa: '動作・TPR', icon: '🏃' },
  ];

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedTeachingMoment !== 'ALL' ||
    selectedSkill !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedStream !== 'ALL' ||
    selectedPlayer !== 'ALL' ||
    selectedSort !== 'PLAYABLE_FIRST';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 space-y-4">
      {/* Tier 1: Search Bar + Playable Status Pills */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t(
              "Search all 88 activities by name, keyword, or grammar...",
              "全88件のアクティビティをゲーム名・キーワードで検索..."
            )}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 h-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title={t("Clear search", "検索をクリア")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Segmented Pills (Fast 1-tap toggling) */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 h-10 items-center">
          <button
            type="button"
            onClick={() => onStatusChange('ALL')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer h-8 flex items-center leading-none ${
              selectedStatus === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {language === 'ja' ? 'すべて' : 'All'} ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('READY')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer h-8 leading-none ${
              selectedStatus === 'READY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {language === 'ja' ? (
                <><ruby>今<rt className="text-[7px]">いま</rt></ruby>すぐプレイ</>
              ) : (
                'Playable Now'
              )}
            </span>
            <span>({readyCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('ROADMAP')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer h-8 leading-none ${
              selectedStatus === 'ROADMAP'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <span>{language === 'ja' ? 'ロードマップ' : 'Roadmap'}</span>
            <span>({totalCount - readyCount})</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Clean Dropdown Grid with Explanatory Micro-Headers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
        {/* Dropdown 1: Teaching Moment */}
        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1 px-1">
            <span>⚡</span>
            <span>
              {language === 'ja' ? (
                <><ruby>授業<rt className="text-[7px]">じゅぎょう</rt></ruby>フェーズ</>
              ) : (
                'Teaching Moment'
              )}
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedTeachingMoment}
              onChange={(e) => onTeachingMomentChange(e.target.value as TeachingMomentFilter)}
              className={`w-full appearance-none font-bold text-xs py-2 pl-3 pr-8 rounded-xl border transition-all cursor-pointer h-9.5 truncate ${
                selectedTeachingMoment !== 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {teachingMomentOptions.map(opt => {
                const count = teachingMomentCounts[opt.id] ?? 0;
                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.icon} {language === 'ja' ? opt.labelJa : opt.labelEn} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Dropdown 2: Target Skill */}
        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1 px-1">
            <span>🎯</span>
            <span>
              {language === 'ja' ? (
                <><ruby>指導<rt className="text-[7px]">しどう</rt></ruby>スキル</>
              ) : (
                'Skill Focus'
              )}
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedSkill}
              onChange={(e) => onSkillChange(e.target.value as SkillCategoryFilter)}
              className={`w-full appearance-none font-bold text-xs py-2 pl-3 pr-8 rounded-xl border transition-all cursor-pointer h-9.5 truncate ${
                selectedSkill !== 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {skillOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.icon} {language === 'ja' ? opt.labelJa : opt.labelEn}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Dropdown 3: Delivery Stream */}
        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1 px-1">
            <span>📺</span>
            <span>
              {language === 'ja' ? (
                <><ruby>配信<rt className="text-[7px]">はいしん</rt></ruby>・<ruby>投影<rt className="text-[7px]">とうえい</rt></ruby></>
              ) : (
                'Delivery Stream'
              )}
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedStream}
              onChange={(e) => onStreamChange(e.target.value as StreamFilter)}
              className={`w-full appearance-none font-bold text-xs py-2 pl-3 pr-8 rounded-xl border transition-all cursor-pointer h-9.5 truncate ${
                selectedStream !== 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <option value="ALL">🌐 {language === 'ja' ? '全ストリーム' : 'All Streams'}</option>
              <option value="STREAM_A">🅰️ {language === 'ja' ? 'Stream 🅰️（TV・黒板画面）' : 'Stream A (TV / Projector)'}</option>
              <option value="STREAM_B">🅱️ {language === 'ja' ? 'Stream 🅱️（iPad同期対戦）' : 'Stream B (Multi-iPad Sync)'}</option>
              <option value="STREAM_C">🅲 {language === 'ja' ? 'Stream 🅲（個人・休み時間）' : 'Stream C (Solo / Recess)'}</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Dropdown 4: Player Format */}
        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1 px-1">
            <span>👥</span>
            <span>
              {language === 'ja' ? (
                <><ruby>参加<rt className="text-[7px]">さんか</rt></ruby><ruby>形式<rt className="text-[7px]">けいしき</rt></ruby></>
              ) : (
                'Player Format'
              )}
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedPlayer}
              onChange={(e) => onPlayerChange(e.target.value as PlayerFilter)}
              className={`w-full appearance-none font-bold text-xs py-2 pl-3 pr-8 rounded-xl border transition-all cursor-pointer h-9.5 truncate ${
                selectedPlayer !== 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <option value="ALL">👥 {language === 'ja' ? '全参加形式' : 'All Players'}</option>
              <option value="WHOLE_CLASS">📺 {language === 'ja' ? 'クラス全員' : 'Whole Class'}</option>
              <option value="TEAMS">⚔️ {language === 'ja' ? 'チーム対抗・ペア' : 'Teams / Groups'}</option>
              <option value="IPADS">📱 {language === 'ja' ? '児童iPad対戦' : 'Student iPads'}</option>
              <option value="SOLO">👤 {language === 'ja' ? '個人・休み時間' : 'Solo / Recess'}</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Dropdown 5: Sort Order */}
        <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1 px-1">
            <span>↕️</span>
            <span>
              {language === 'ja' ? (
                <><ruby>並<rt className="text-[7px]">なら</rt></ruby>び<ruby>替<rt className="text-[7px]">か</rt></ruby>え</>
              ) : (
                'Sort Order'
              )}
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className={`w-full appearance-none font-bold text-xs py-2 pl-3 pr-8 rounded-xl border transition-all cursor-pointer h-9.5 truncate ${
                selectedSort !== 'PLAYABLE_FIRST'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <option value="PLAYABLE_FIRST">⭐ {language === 'ja' ? '遊べる順（推奨）' : 'Playable First'}</option>
              <option value="NAME_EN">🔤 {language === 'ja' ? 'アルファベット順' : 'Name (A-Z)'}</option>
              <option value="NAME_JA">あ {language === 'ja' ? '五十音順' : 'Name (Japanese)'}</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      </div>

      {/* Tier 3: Summary + Reset Active Filters */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span>{language === 'ja' ? <ruby>表示中<rt className="text-[7px]">ひょうじちゅう</rt></ruby> : 'Showing'}:</span>
          <strong className="text-slate-900 dark:text-white font-black">{filteredCount}</strong>
          <span>/ {totalCount} {language === 'ja' ? <><ruby>件<rt className="text-[7px]">けん</rt></ruby>のアクティビティ</> : 'activities'}</span>
          {readyCount > 0 && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">
              ({readyCount} {language === 'ja' ? <><ruby>件<rt className="text-[7px]">けん</rt></ruby>が<ruby>即座<rt className="text-[7px]">そくざ</rt></ruby>に<ruby>起動可能<rt className="text-[7px]">きどうかのう</rt></ruby></> : 'ready to launch'})
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 text-xs cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          >
            <RotateCcw size={12} />
            <span>
              {language === 'ja' ? (
                <><ruby>条件<rt className="text-[7px]">じょうけん</rt></ruby>リセット</>
              ) : (
                'Reset Filters'
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
