import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  LOCKOUT_ADAPTIVE_SENTINEL,
  STANDARD_LOCKOUT_TIERS_SECONDS,
  isAdaptiveLockoutSetting,
  sanitizeConfiguredLockoutSeconds,
  formatLockoutDurationNumber,
} from '../../core/quizEngine';
import { TugOfWarMatchFormat } from '../../types';

interface TugOfWarRulesCardProps {
  tugOfWarTimeLimit: number;
  onSelectTimeLimit: (sec: number) => void;
  tugOfWarMatchFormat: TugOfWarMatchFormat;
  onSelectMatchFormat: (fmt: TugOfWarMatchFormat) => void;
  tugOfWarSensitivity: number;
  onSelectSensitivity: (val: number) => void;
  mudLockoutSeconds: number;
  onSelectMudLockoutSeconds: (sec: number) => void;
}

const PULL_SENSITIVITY_TIERS = [
  { val: 15, labelEn: 'Slow', labelJa: 'じわじわ', sub: '15' },
  { val: 20, labelEn: 'Standard ⭐', labelJa: '標準 ⭐', sub: '20' },
  { val: 25, labelEn: 'Intense', labelJa: '白熱', sub: '25' },
] as const;

export const TugOfWarRulesCard: React.FC<TugOfWarRulesCardProps> = ({
  tugOfWarTimeLimit,
  onSelectTimeLimit,
  tugOfWarMatchFormat,
  onSelectMatchFormat,
  tugOfWarSensitivity,
  onSelectSensitivity,
  mudLockoutSeconds,
  onSelectMudLockoutSeconds,
}) => {
  const { t } = useLanguage();
  const safeMudSec = sanitizeConfiguredLockoutSeconds(mudLockoutSeconds);
  const isAdaptiveMud = isAdaptiveLockoutSetting(safeMudSec);
  const mudLabel = formatLockoutDurationNumber(safeMudSec);

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50/90 to-rose-50/90 dark:from-amber-950/30 dark:to-rose-950/30 border-2 border-amber-300 dark:border-amber-900/60 space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚩</span>
          <div>
            <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider">
              {t('Undokai Tug of War Rules', '運動会 綱引きバトル設定')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                'Red Team vs White Team! Students answer on iPads to pull the rope on the TV.',
                '紅組 vs 白組！児童がiPadで連続解答してTVのロープを引き合います。'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Round Duration & Match Format */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
            {t('Round Duration (Countdown)', '1ラウンドの試合時間 (カウントダウン)')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onSelectTimeLimit(sec)}
                className={`py-2 px-2 rounded-xl border-2 font-black text-xs transition cursor-pointer ${
                  tugOfWarTimeLimit === sec
                    ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white/60 dark:bg-slate-900/50'
                }`}
              >
                {sec} {t('sec', '秒')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
            {t('Match Format (Rounds)', '試合形式 (セット数)')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'SINGLE', labelEn: 'Single', labelJa: '1本勝負', subEn: '1 Win', subJa: '1本先取' },
                { id: 'BEST_OF_3', labelEn: 'Best of 3', labelJa: '3本勝負', subEn: 'First to 2', subJa: '2本先取' },
                { id: 'BEST_OF_5', labelEn: 'Best of 5', labelJa: '5本勝負', subEn: 'First to 3', subJa: '3本先取' },
                { id: 'BEST_OF_7', labelEn: 'Best of 7', labelJa: '7本勝負', subEn: 'First to 4', subJa: '4本先取' },
              ] as const
            ).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onSelectMatchFormat(fmt.id)}
                className={`py-1.5 px-2 rounded-xl border-2 font-black text-xs transition flex flex-col items-center justify-center text-center cursor-pointer ${
                  tugOfWarMatchFormat === fmt.id
                    ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white/60 dark:bg-slate-900/50'
                }`}
              >
                <span>{t(fmt.labelEn, fmt.labelJa)}</span>
                <span className={`text-[10px] font-normal ${tugOfWarMatchFormat === fmt.id ? 'text-slate-900 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                  {t(fmt.subEn, fmt.subJa)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pull Sensitivity & Mud Slip Lockout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/70 dark:border-amber-900/50">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              {t('Rope Pull Sensitivity', 'ロープの引きの強さ')}
            </span>
            <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
              {tugOfWarSensitivity === 15
                ? t('Slow (Steady Tug)', 'じわじわ (接戦向け)')
                : tugOfWarSensitivity === 25
                  ? t('Intense (Fast Swings)', '白熱 (ダイナミック)')
                  : t('Standard (Default)', '標準 (バランス)')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PULL_SENSITIVITY_TIERS.map((tier) => {
              const isSelected = tugOfWarSensitivity === tier.val;
              return (
                <button
                  key={tier.val}
                  type="button"
                  onClick={() => onSelectSensitivity(tier.val)}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-amber-500 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-xs ring-1 ring-amber-400/40 font-black'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50 bg-white/40 dark:bg-slate-900/40 font-bold'
                  }`}
                >
                  <span className="text-xs leading-tight">{t(tier.labelEn, tier.labelJa)}</span>
                  <span className="text-[10px] opacity-80 leading-tight">{tier.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              {t('Mud Slip Lockout', '誤答時の泥すべりロック')}
            </span>
            <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
              {isAdaptiveMud
                ? t('Adaptive: 1→2→4s ⭐', '段階式: 1→2→4秒 ⭐')
                : safeMudSec === 0
                  ? t('No Lockout (0s)', 'ロックなし (0秒)')
                  : `${mudLabel}s`}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {STANDARD_LOCKOUT_TIERS_SECONDS.map((tierSec) => {
              const isSelected = isAdaptiveMud
                ? tierSec === LOCKOUT_ADAPTIVE_SENTINEL
                : tierSec !== LOCKOUT_ADAPTIVE_SENTINEL && Math.abs(safeMudSec - tierSec) < 0.05;
              const label =
                tierSec === LOCKOUT_ADAPTIVE_SENTINEL
                  ? t('Adaptive', '段階式')
                  : tierSec === 0
                    ? t('None', 'なし')
                    : `${tierSec.toFixed(1)}s`;
              const sub =
                tierSec === LOCKOUT_ADAPTIVE_SENTINEL
                  ? t('1→2→4s ⭐', '1→2→4秒 ⭐')
                  : tierSec === 0
                    ? t('0s', '0秒')
                    : tierSec === 1.0
                      ? t('Quick', '短め')
                      : tierSec === 2.0
                        ? t('Firm', '標準')
                        : t('Strict', '長め');
              return (
                <button
                  key={tierSec}
                  type="button"
                  onClick={() => onSelectMudLockoutSeconds(tierSec)}
                  className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-amber-500 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 shadow-xs ring-1 ring-amber-400/40 font-black'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50 bg-white/40 dark:bg-slate-900/40 font-bold'
                  }`}
                >
                  <span className="text-xs leading-tight whitespace-nowrap">{label}</span>
                  <span className="text-[10px] opacity-80 leading-tight whitespace-nowrap">{sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic Mud Lockout Helper Note */}
      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-2">
        <span className="text-base">🥾</span>
        <span>
          {isAdaptiveMud
            ? t(
                'Mistake Penalty: Adaptive 1.0s → 2.0s → 4.0s mud slip lockout (wrong choice is eliminated to guide learning).',
                '誤答ペナルティ: 段階式 (1.0秒→2.0秒→4.0秒) の泥すべりロック（誤答カードが消えるため正しい単語を学べます）。'
              )
            : safeMudSec === 0
              ? t(
                  'Mistake Penalty: No answer lockout — wrong choice is eliminated right away so students keep pulling.',
                  '誤答ペナルティ: 回答ロックなし（誤答カードのみ消去され、すぐ次の選択ができます）。'
                )
              : t(
                  `Mistake Penalty: ${mudLabel}s mud slip lockout (eliminates the wrong choice so the student learns).`,
                  `誤答ペナルティ: ${mudLabel}秒の泥すべりロック（誤答カードが消えるため正しい単語を学べます）。`
                )}
        </span>
      </div>
    </div>
  );
};
