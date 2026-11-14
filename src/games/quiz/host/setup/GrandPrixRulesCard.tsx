import React from 'react';
import { Clock, Flag, Timer } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  SuzukaTrackThemeSelection,
  SuzukaTimeOfDaySelection,
  SuzukaCloudCoverSelection,
  SuzukaPrecipitationSelection,
  TRACK_THEME_LIST,
  TIME_OF_DAY_LIST,
  CLOUD_COVER_LIST,
  PRECIPITATION_LIST,
} from '@/games/suzuka_grand_prix/trackThemes';
import { STANDARD_LOCKOUT_TIERS_SECONDS } from '../../core/quizEngine';
import { SprintModeType } from '../../types';

interface GrandPrixRulesCardProps {
  sprintMode: SprintModeType;
  onSelectSprintMode: (mode: SprintModeType) => void;
  targetLaps3D: number;
  onSelectTargetLaps3D: (laps: number) => void;
  sprintGraceSeconds: number;
  onSelectSprintGraceSeconds: (sec: number) => void;
  sprintTimeLimitSeconds: number;
  onSelectSprintTimeLimitSeconds: (sec: number) => void;
  wrongSpeedLossRatio: number;
  onSelectWrongSpeedLossRatio: (ratio: number) => void;
  wrongLockoutSeconds: number;
  onSelectWrongLockoutSeconds: (sec: number) => void;
  trackThemeSelection: SuzukaTrackThemeSelection;
  onSelectTrackThemeSelection: (selection: SuzukaTrackThemeSelection) => void;
  timeOfDaySelection: SuzukaTimeOfDaySelection;
  onSelectTimeOfDaySelection: (selection: SuzukaTimeOfDaySelection) => void;
  cloudCoverSelection: SuzukaCloudCoverSelection;
  onSelectCloudCoverSelection: (selection: SuzukaCloudCoverSelection) => void;
  precipitationSelection: SuzukaPrecipitationSelection;
  onSelectPrecipitationSelection: (selection: SuzukaPrecipitationSelection) => void;
}

export const GrandPrixRulesCard: React.FC<GrandPrixRulesCardProps> = ({
  sprintMode,
  onSelectSprintMode,
  targetLaps3D,
  onSelectTargetLaps3D,
  sprintGraceSeconds,
  onSelectSprintGraceSeconds,
  sprintTimeLimitSeconds,
  onSelectSprintTimeLimitSeconds,
  wrongSpeedLossRatio,
  onSelectWrongSpeedLossRatio,
  wrongLockoutSeconds,
  onSelectWrongLockoutSeconds,
  trackThemeSelection,
  onSelectTrackThemeSelection,
  timeOfDaySelection,
  onSelectTimeOfDaySelection,
  cloudCoverSelection,
  onSelectCloudCoverSelection,
  precipitationSelection,
  onSelectPrecipitationSelection,
}) => {
  const { t } = useLanguage();

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50/85 to-teal-50/85 dark:from-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-300 dark:border-emerald-900/60 space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏎️</span>
          <div>
            <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              {t('3D Suzuka Grand Prix Rules', '3D 鈴鹿グランプリ レース設定')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                'Cars start at 0 km/h and build throttle with correct answers! Configure race format & wrong-answer penalties below.',
                '0km/hからスタートし正解で加速！周回数・制限時間と誤答時の減速ペナルティを自由に調整できます。'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-mode: Lap Race vs Time Trial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onSelectSprintMode('LAP_RACE')}
          className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${
            sprintMode === 'LAP_RACE'
              ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-400/40'
              : 'border-emerald-200/60 dark:border-emerald-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/80'
          }`}
        >
          <div className={`p-1.5 rounded-lg shrink-0 ${sprintMode === 'LAP_RACE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            <Flag size={16} />
          </div>
          <div>
            <span className="text-xs font-black block">{t('🏁 Circuit Lap Race (First to Finish)', '🏁 サーキット周回レース')}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {t('Race a fixed number of 3D laps around Suzuka (2,567m per lap).', '鈴鹿サーキット（1周2,567m）を指定周回走破するレース。')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectSprintMode('TIME_TRIAL')}
          className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${
            sprintMode === 'TIME_TRIAL'
              ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-400/40'
              : 'border-emerald-200/60 dark:border-emerald-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/80'
          }`}
        >
          <div className={`p-1.5 rounded-lg shrink-0 ${sprintMode === 'TIME_TRIAL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            <Timer size={16} />
          </div>
          <div>
            <span className="text-xs font-black block">{t('⏱️ Time Trial (Distance Battle)', '⏱️ タイムアタック (走行距離バトル)')}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {t('Drive as far as possible before the countdown timer hits zero!', '制限時間内にどれだけ遠くまで走れるかを競うスプリント。')}
            </span>
          </div>
        </button>
      </div>

      {/* Laps / Time Limit */}
      {sprintMode === 'LAP_RACE' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('Circuit Laps (1 Lap ≈ 60–90s)', 'サーキット周回数 (1周 約60〜90秒)')}
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[1, 2, 3, 5, 10, 20].map((laps) => (
                <button
                  key={laps}
                  type="button"
                  onClick={() => onSelectTargetLaps3D(laps)}
                  className={`py-2 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                    targetLaps3D === laps
                      ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                  }`}
                >
                  {laps} {laps === 1 ? t('Lap', '周') : t('Laps', '周')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('Podium Grace Countdown', '上位ゴール後の猶予タイマー')}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 20, 25, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onSelectSprintGraceSeconds(sec)}
                  className={`py-2 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-1 ${
                    sprintGraceSeconds === sec
                      ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                  }`}
                >
                  <Clock size={11} />
                  <span>{sec}s</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 block mb-1.5">
            {t('Race Time Limit', 'レース制限時間')}
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[60, 90, 120, 180, 300, 600].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onSelectSprintTimeLimitSeconds(sec)}
                className={`py-2.5 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-1 ${
                  sprintTimeLimitSeconds === sec
                    ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                }`}
              >
                <Clock size={12} />
                <span>{sec >= 60 ? `${sec / 60}${t('m', '分')}` : `${sec}${t('s', '秒')}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Incorrect Answer Speed Reduction & Answer Lockout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              {t('Incorrect Answer Speed Reduction', '誤答時のスピード減速率')}
            </span>
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              {wrongSpeedLossRatio === 0
                ? t('No Slowdown', '減速なし')
                : wrongSpeedLossRatio === 0.33
                  ? t('-1/3 Speed (Default)', '-1/3 減速 (標準)')
                  : wrongSpeedLossRatio === 1
                    ? t('Full Stop (-100%)', '完全停止 (-100%)')
                    : `-${Math.round(wrongSpeedLossRatio * 100)}%`}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {[
              { val: 0, label: '0%', sub: t('None', 'なし') },
              { val: 0.25, label: '-25%', sub: '1/4' },
              { val: 0.33, label: '-33%', sub: '1/3 ⭐' },
              { val: 0.5, label: '-50%', sub: '1/2' },
              { val: 0.75, label: '-75%', sub: '3/4' },
              { val: 1.0, label: '-100%', sub: t('Stop', '停止') },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onSelectWrongSpeedLossRatio(opt.val)}
                className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  Math.abs(wrongSpeedLossRatio - opt.val) < 0.02
                    ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-400/40 font-black'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50 font-bold'
                }`}
              >
                <span className="text-xs leading-tight">{opt.label}</span>
                <span className="text-[10px] opacity-80 leading-tight">{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              {t('Incorrect Answer Lockout', '誤答時の回答ロック時間')}
            </span>
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              {wrongLockoutSeconds <= 2.5
                ? t('2.5s (Standard Pit Stop)', '2.5秒 (標準ピットストップ)')
                : `${wrongLockoutSeconds.toFixed(1)}s`}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {STANDARD_LOCKOUT_TIERS_SECONDS.map((tierSec) => {
              const sub =
                tierSec === 2.5
                  ? `⭐ ${t('Std', '標準')}`
                  : tierSec === 3.5
                    ? t('Firm', 'しっかり')
                    : tierSec === 5.0
                      ? t('Strict', '厳しめ')
                      : '';
              return (
                <button
                  key={tierSec}
                  type="button"
                  onClick={() => onSelectWrongLockoutSeconds(tierSec)}
                  className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    Math.abs(wrongLockoutSeconds - tierSec) < 0.05
                      ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-400/40 font-black'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50 font-bold'
                  }`}
                >
                  <span className="text-xs leading-tight">{tierSec.toFixed(1)}s</span>
                  {sub && <span className="text-[10px] opacity-80 leading-tight">{sub}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Independent 3-Axis Environment Controls: Biome × Time of Day (Le Mans 24h) × Weather */}
      <div className="pt-2.5 border-t border-emerald-200/70 dark:border-emerald-900/50 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* 1. Circuit Biome Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🗺️</span>
                <span>{t('Circuit Biome', 'サーキットのバイオーム (地形)')}</span>
              </span>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                {trackThemeSelection === 'RANDOM'
                  ? t('🎲 Auto-Rotate', '🎲 ランダム')
                  : t('Pinned Biome', 'バイオーム固定')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onSelectTrackThemeSelection('RANDOM')}
                className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                  trackThemeSelection === 'RANDOM'
                    ? 'border-emerald-500 ring-2 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-lg shrink-0 leading-none">🎲</span>
                <div className="min-w-0">
                  <span className="text-[11px] font-black block truncate">{t('Random', 'ランダム')}</span>
                  <span className="text-[10px] opacity-80 block truncate">{t('No repeats', '被りなし')}</span>
                </div>
              </button>
              {TRACK_THEME_LIST.map((theme) => {
                const isSelected = trackThemeSelection === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onSelectTrackThemeSelection(theme.id)}
                    className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? `${theme.cardBorderSelected} ${theme.cardBgSelected} shadow-xs`
                        : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-lg shrink-0 leading-none">{theme.emoji}</span>
                    <div className="min-w-0">
                      <span className="text-[11px] font-black block truncate">{t(theme.shortEn, theme.shortJa)}</span>
                      <span className="text-[10px] opacity-80 block truncate">{t(theme.nameEn, theme.nameJa)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Time of Day & 24 Hours of Le Mans Dynamic Cycle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🌅</span>
                <span>{t('Time of Day & 24h Le Mans Cycle', '時間帯・ル・マン24時間サイクル')}</span>
              </span>
              <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                {timeOfDaySelection === 'LE_MANS_CYCLE'
                  ? t('⏱️ Sunrise → Midnight Live', '⏱️ 日の出→真夜中 動的変化')
                  : timeOfDaySelection === 'RANDOM'
                  ? t('🎲 Random Time', '🎲 ランダム時間')
                  : t('Fixed Lighting', '時刻固定')}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => onSelectTimeOfDaySelection('RANDOM')}
                className={`py-1.5 px-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  timeOfDaySelection === 'RANDOM'
                    ? 'border-emerald-500 ring-1 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 font-black shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <span className="text-sm leading-none">🎲</span>
                <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full">{t('Random', 'ランダム')}</span>
              </button>
              {TIME_OF_DAY_LIST.map((tod) => {
                const isSelected = timeOfDaySelection === tod.id;
                const isLeMans = tod.id === 'LE_MANS_CYCLE';
                return (
                  <button
                    key={tod.id}
                    type="button"
                    onClick={() => onSelectTimeOfDaySelection(tod.id)}
                    className={`py-1.5 px-1.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? isLeMans
                          ? 'border-amber-500 ring-2 ring-amber-400/40 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-100 font-black shadow-xs'
                          : 'border-emerald-500 ring-1 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 font-black shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 font-bold'
                    }`}
                  >
                    <span className="text-sm leading-none">{tod.emoji}</span>
                    <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full">
                      {t(tod.shortEn, tod.shortJa)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Cloud Cover × Precipitation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          {/* 3. Cloud Cover Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>⛅</span>
                <span>{t('Cloud Cover', '雲の量 (空模様)')}</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onSelectCloudCoverSelection('RANDOM')}
                className={`py-1.5 px-2 rounded-xl border-2 text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  cloudCoverSelection === 'RANDOM'
                    ? 'border-emerald-500 ring-1 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 font-black shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <span className="text-sm leading-none">🎲</span>
                <span className="text-[11px] truncate">{t('Random', 'ランダム')}</span>
              </button>
              {CLOUD_COVER_LIST.map((cc) => {
                const isSelected = cloudCoverSelection === cc.id;
                return (
                  <button
                    key={cc.id}
                    type="button"
                    onClick={() => onSelectCloudCoverSelection(cc.id)}
                    className={`py-1.5 px-2 rounded-xl border-2 text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'border-emerald-500 ring-1 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 font-black shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 font-bold'
                    }`}
                  >
                    <span className="text-sm leading-none">{cc.emoji}</span>
                    <span className="text-[11px] truncate">{t(cc.shortEn, cc.shortJa)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Precipitation Selector (Rain / Snow works in any biome!) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>🌧️</span>
                <span>{t('Precipitation (Rain / Snow)', '降水エフェクト (雨・雪)')}</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {t('Works in any biome!', '砂漠の雪なども組み合わせ自由！')}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => onSelectPrecipitationSelection('RANDOM')}
                className={`py-1.5 px-1 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  precipitationSelection === 'RANDOM'
                    ? 'border-emerald-500 ring-1 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 font-black shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <span className="text-sm leading-none">🎲</span>
                <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full">{t('Random', 'ランダム')}</span>
              </button>
              {PRECIPITATION_LIST.map((pr) => {
                const isSelected = precipitationSelection === pr.id;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => onSelectPrecipitationSelection(pr.id)}
                    className={`py-1.5 px-1 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-emerald-500 ring-1 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 font-black shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 font-bold'
                    }`}
                  >
                    <span className="text-sm leading-none">{pr.emoji}</span>
                    <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full">
                      {t(pr.shortEn, pr.shortJa)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
