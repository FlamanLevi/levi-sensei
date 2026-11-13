import React, { useState } from 'react';
import { X, Music, SlidersHorizontal, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { BgmSelectorModal } from '@/components/common/BgmSelectorModal';
import { getSoundPack } from '@/utils/soundPacks';
import {
  AnticipationDrawStyle,
  AnticipationInputMode,
  AnticipationLoopMode,
  AnticipationSettings,
} from './types';

interface AnticipationSettingsModalProps {
  isOpen: boolean;
  settings: AnticipationSettings;
  onChange: (next: AnticipationSettings) => void;
  onClose: () => void;
  showHostOptions?: boolean;
}

export const AnticipationSettingsModal: React.FC<AnticipationSettingsModalProps> = ({
  isOpen,
  settings,
  onChange,
  onClose,
  showHostOptions = true,
}) => {
  const { t, language } = useLanguage();
  const [isBgmOpen, setIsBgmOpen] = useState(false);

  if (!isOpen) return null;

  const packInfo = getSoundPack(settings.bgm);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90dvh] bg-white dark:bg-slate-900 rounded-3xl border-3 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
              <SlidersHorizontal size={18} />
            </div>
            <h3 className="text-base sm:text-xl font-black truncate">
              {t('Anticipation Game Settings', 'お絵かき推測 ゲーム設定')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2-Column Landscape Settings Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {/* Left Column: Core Mode & Sketch Style */}
          <div className="space-y-4">
            {/* Game Loop Mode */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('Game Mode', 'ゲームモード')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'SPIRAL_BOARD', emoji: '🌀', en: '4-Level Spiral', ja: '4層スパイラル' },
                    { id: 'QUICK_ROUNDS', emoji: '⚡', en: 'Quick Rounds', ja: 'クイック勝負' },
                  ] as { id: AnticipationLoopMode; emoji: string; en: string; ja: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange({ ...settings, loopMode: item.id })}
                    className={`p-2.5 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      settings.loopMode === item.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span>{language === 'ja' ? item.ja : item.en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Draw Style */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('Drawing Style', '描き方スタイル')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'MIXED', en: '✨ Mixed', ja: '✨ ミックス' },
                    { id: 'INK_SKETCH', en: '✒️ Ink Sketch', ja: '✒️ スケッチ' },
                    { id: 'CONNECT_DOTS', en: '🔢 Dots 1–N', ja: '🔢 点つなぎ' },
                  ] as { id: AnticipationDrawStyle; en: string; ja: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange({ ...settings, drawStyle: item.id })}
                    className={`py-2 px-2 rounded-xl border-2 font-black text-xs cursor-pointer transition-all ${
                      settings.drawStyle === item.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {language === 'ja' ? item.ja : item.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Answering Mode */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('Guessing Mechanic', '解答方式')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'AUTO_GRADE', en: '🎓 Grade Auto', ja: '🎓 学年自動' },
                    { id: 'CHOICE_4', en: '▲ 4-Choice', ja: '▲ 4択カード' },
                    { id: 'SPELLING_TILES', en: '🔤 Spelling', ja: '🔤 スペル' },
                  ] as { id: AnticipationInputMode; en: string; ja: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange({ ...settings, inputMode: item.id })}
                    className={`py-2 px-2 rounded-xl border-2 font-black text-xs cursor-pointer transition-all ${
                      settings.inputMode === item.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {language === 'ja' ? item.ja : item.en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Speed, Length, Reading Aid, BGM */}
          <div className="space-y-4">
            {/* Draw Speed + Rounds */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  {t('Sketch Time', '描画時間')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[12, 18, 25].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onChange({ ...settings, drawDurationSeconds: sec })}
                      className={`py-2 rounded-xl border-2 font-mono font-black text-xs cursor-pointer ${
                        settings.drawDurationSeconds === sec
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  {t('Rounds', 'ラウンド数')}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[6, 8, 10, 14].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onChange({ ...settings, roundCount: cnt })}
                      className={`py-2 rounded-xl border-2 font-mono font-black text-xs cursor-pointer ${
                        settings.roundCount === cnt
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reading Aid + Host Mode */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {t('English Reading Aid', '英単語の読みガイド')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, englishReadingAid: 'WITH_KATAKANA' })}
                  className={`py-2 px-3 rounded-xl border-2 font-black text-xs cursor-pointer ${
                    settings.englishReadingAid === 'WITH_KATAKANA'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  {t('With Katakana Hint', 'カタカナ読みつき')}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, englishReadingAid: 'SPELLING_ONLY' })}
                  className={`py-2 px-3 rounded-xl border-2 font-black text-xs cursor-pointer ${
                    settings.englishReadingAid === 'SPELLING_ONLY'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  {t('English Spelling Only', '英語スペルのみ')}
                </button>
              </div>
            </div>

            {/* BGM Pack */}
            {showHostOptions && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {t('Background Music', 'BGMサウンド')}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate block">
                    {settings.bgm === 'none'
                      ? t('No Music (Mute)', 'BGMなし')
                      : packInfo
                      ? `${packInfo.icon} ${language === 'ja' ? packInfo.nameJa : packInfo.name}`
                      : settings.bgm}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBgmOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Music size={14} />
                  <span>{t('Change BGM', 'BGM変更')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Apply Button */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Check size={16} />
            <span>{t('Done', '完了')}</span>
          </button>
        </div>

        <BgmSelectorModal
          isOpen={isBgmOpen}
          onClose={() => setIsBgmOpen(false)}
          selectedPackId={settings.bgm}
          onSelectPack={(packId) => onChange({ ...settings, bgm: packId })}
        />
      </div>
    </div>
  );
};
