import React from 'react';
import { X, Settings, Volume2, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { GrammarToggles, PresetLevel } from './types';
import { STATIONERY_ITEMS } from './constants';

interface MysteryPencilCaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  toggles: GrammarToggles;
  setToggles: React.Dispatch<React.SetStateAction<GrammarToggles>>;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  autoSpeak: boolean;
  setAutoSpeak: (val: boolean) => void;
  maxQuantity: number;
  setMaxQuantity: (qty: number) => void;
  activeItemIds: string[];
  toggleItemId: (id: string) => void;
  selectAllItems: () => void;
}

export const MysteryPencilCaseSettingsModal: React.FC<MysteryPencilCaseSettingsModalProps> = ({
  isOpen,
  onClose,
  toggles,
  setToggles,
  speechRate,
  setSpeechRate,
  autoSpeak,
  setAutoSpeak,
  maxQuantity,
  setMaxQuantity,
  activeItemIds,
  toggleItemId,
  selectAllItems
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md md:max-w-4xl max-h-[92dvh] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Settings size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                {t('Flowchart Settings', <>フローチャート<ruby>設定<rt>せってい</rt></ruby></>)}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {t('Configure grammar toggles, speech speed & word pool', '文法トグル・発音速度・単語プールの設定')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-start overflow-y-auto custom-scrollbar flex-1 text-xs sm:text-sm">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            {/* Section 1: The 4 Grammar Toggles */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t('Grammar Feature Toggles', <>文法<ruby>要素<rt>ようそ</rt></ruby>トグル</>)}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Toggle: Quantity */}
                <button
                  onClick={() => setToggles(p => ({ ...p, hasQuantity: !p.hasQuantity }))}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                    toggles.hasQuantity
                      ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-black text-xs">🔢 {t('Quantities (#)', '個数・複数形')}</div>
                    <div className="text-[10px] opacity-75">2 pencils, 3 rulers</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${toggles.hasQuantity ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {toggles.hasQuantity && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>

                {/* Toggle: Color */}
                <button
                  onClick={() => setToggles(p => ({ ...p, hasColor: !p.hasColor }))}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                    toggles.hasColor
                      ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-black text-xs">🎨 {t('Colors', '色形容詞')}</div>
                    <div className="text-[10px] opacity-75">blue pen, red marker</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${toggles.hasColor ? 'bg-rose-500 text-white font-black' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {toggles.hasColor && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>

                {/* Toggle: And... */}
                <button
                  onClick={() => setToggles(p => ({ ...p, hasAnd: !p.hasAnd }))}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                    toggles.hasAnd
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-black text-xs">➕ {t('"And..." (YES+)', 'And 追加 (YES)')}</div>
                    <div className="text-[10px] opacity-75">And I have an eraser.</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${toggles.hasAnd ? 'bg-emerald-500 text-white font-black' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {toggles.hasAnd && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>

                {/* Toggle: But... */}
                <button
                  onClick={() => setToggles(p => ({ ...p, hasBut: !p.hasBut }))}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                    toggles.hasBut
                      ? 'bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-black text-xs">🔄 {t('"But..." (NO+)', 'But 代案 (NO)')}</div>
                    <div className="text-[10px] opacity-75">But I have a ruler!</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${toggles.hasBut ? 'bg-purple-500 text-white font-black' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {toggles.hasBut && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              </div>
            </div>

            {/* Section 2: Speech Speed & Auto Speak */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 size={16} className="text-blue-500 shrink-0" />
                  <span className="font-bold text-xs">{t('Auto-Pronounce on Focus', 'フォーカス時に自動再生')}</span>
                </div>
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    autoSpeak ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      autoSpeak ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t('Speech Speed', '発音スピード')}
                </span>
                <div className="flex items-center gap-1 shrink-0 flex-nowrap">
                  {[
                    { r: 0.75, label: t('Slow', 'ゆっくり') },
                    { r: 0.86, label: t('Normal', '標準') },
                    { r: 1.0, label: t('Natural', 'ナチュラル') }
                  ].map(item => (
                    <button
                      key={item.r}
                      onClick={() => setSpeechRate(item.r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        Math.abs(speechRate - item.r) < 0.05
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Quantity */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {t('Max Quantity', '最大個数')}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {[3, 4, 5].map(q => (
                    <button
                      key={q}
                      onClick={() => setMaxQuantity(q)}
                      className={`w-8 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                        maxQuantity === q
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Section 3 Word Pool */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('Active Vocabulary Pool', <>出題する<ruby>文房具<rt>ぶんぼうぐ</rt></ruby></>)} ({activeItemIds.length}/{STATIONERY_ITEMS.length})
              </label>
              <button
                onClick={selectAllItems}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('Select All', 'すべて選択')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
              {STATIONERY_ITEMS.map(item => {
                const isActive = activeItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItemId(item.id)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs truncate">{item.english}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {item.jaKanji || item.jaHiragana}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end shrink-0 flex-nowrap">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {t('Done', '決定')}
          </button>
        </div>
      </div>
    </div>
  );
};
