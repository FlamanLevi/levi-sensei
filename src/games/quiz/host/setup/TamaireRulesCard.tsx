import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { STANDARD_LOCKOUT_TIERS_SECONDS } from '../../core/quizEngine';

interface TamaireRulesCardProps {
  tamaireMysteryCount: boolean;
  onSelectMysteryCount: (hideUntilEnd: boolean) => void;
  tamaireTimeLimit: number;
  onSelectTimeLimit: (sec: number) => void;
  missLockoutSeconds: number;
  onSelectMissLockoutSeconds: (sec: number) => void;
}

export const TamaireRulesCard: React.FC<TamaireRulesCardProps> = ({
  tamaireMysteryCount,
  onSelectMysteryCount,
  tamaireTimeLimit,
  onSelectTimeLimit,
  missLockoutSeconds,
  onSelectMissLockoutSeconds,
}) => {
  const { t } = useLanguage();
  const safeMissSec = Math.max(2.5, missLockoutSeconds);
  const missLabel = Number.isInteger(safeMissSec) ? `${safeMissSec}.0` : safeMissSec.toFixed(1);

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-300 dark:border-indigo-900/60 space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧺</span>
          <div>
            <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
              {t('Bean Bag Toss (Tamaire) Rules', '運動会 玉入れ合戦 設定')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                'Red Team vs White Team! Students rapidly answer on iPads to toss bean bags into their team basket!',
                '紅組 vs 白組！児童がiPadで次々と正解してチームのカゴにお手玉を投げ入れます！'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Basket Count Visibility (Mystery Count vs Live Count) */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
          {t('Basket Scoreboard Mode', 'スコア発表・カウント演出')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectMysteryCount(true)}
            className={`p-3 rounded-xl border-2 text-left font-black text-xs transition cursor-pointer ${
              tamaireMysteryCount
                ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white/60 dark:bg-slate-900/50'
            }`}
          >
            <span className="block">{t('🤫 Mystery Count (Recommended)', '🤫 ドキドキ玉かぞえ (推奨)')}</span>
            <span className={`text-[10px] block mt-0.5 font-normal ${tamaireMysteryCount ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>
              {t(
                'Scores hidden (???) until whistle & dramatic counting ceremony!',
                '笛が鳴るまで個数シークレット！最後はドラマチック玉かぞえ！'
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMysteryCount(false)}
            className={`p-3 rounded-xl border-2 text-left font-black text-xs transition cursor-pointer ${
              !tamaireMysteryCount
                ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white/60 dark:bg-slate-900/50'
            }`}
          >
            <span className="block">{t('👀 Live Real-Time Count', '👀 リアルタイム表示')}</span>
            <span className={`text-[10px] block mt-0.5 font-normal ${!tamaireMysteryCount ? 'text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>
              {t('Live bean bag tally shown on TV throughout the match.', '試合中もリアルタイムに玉の個数をテレビに表示します。')}
            </span>
          </button>
        </div>
      </div>

      {/* Match Duration & Fumbled Bag Lockout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-200/70 dark:border-indigo-900/50">
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
            {t('Match Duration (Countdown)', '試合時間 (カウントダウン)')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onSelectTimeLimit(sec)}
                className={`py-2 px-2 rounded-xl border-2 font-black text-xs transition cursor-pointer ${
                  tamaireTimeLimit === sec
                    ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white/60 dark:bg-slate-900/50'
                }`}
              >
                {sec} {t('sec', '秒')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              {t('Fumbled Bag Lockout', '誤答時のお手玉落としロック')}
            </span>
            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
              {safeMissSec <= 2.5
                ? t('2.5s (Standard Fumble)', '2.5秒 (標準ロック)')
                : `${missLabel}s`}
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
                  onClick={() => onSelectMissLockoutSeconds(tierSec)}
                  className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    Math.abs(safeMissSec - tierSec) < 0.05
                      ? 'border-indigo-500 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-400/40 font-black'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50 bg-white/40 dark:bg-slate-900/40 font-bold'
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

      {/* Dynamic Fumbled Bag Info Note */}
      <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
        <span className="text-base">🧺</span>
        <span>
          {t(
            `Mistake Penalty: ${missLabel}s fumbled bean bag delay (wrong option eliminated to guide learning).`,
            `誤答ペナルティ: ${missLabel}秒のお手玉落としロック（誤答カードが消去され正しい単語を学べます）。`
          )}
        </span>
      </div>
    </div>
  );
};
