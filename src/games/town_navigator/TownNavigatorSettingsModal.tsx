import React from 'react';
import { X, Sliders, Compass, Eye, Monitor, Tablet } from 'lucide-react';
import type { TownGameSettings, TownDifficulty, TownCameraMode } from './multiplayer/types';

interface TownNavigatorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TownGameSettings;
  onChange: (partial: Partial<TownGameSettings>) => void;
  lang: 'en' | 'ja';
}

export const TownNavigatorSettingsModal: React.FC<TownNavigatorSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
              {lang === 'ja' ? (
                <>
                  レース<ruby>設定<rt>せってい</rt></ruby>
                </>
              ) : (
                'Town Race Settings'
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Landscape Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Pacing & Difficulty */}
          <div className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                {lang === 'ja' ? 'ラウンド数' : 'Number of Rounds'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 7, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => onChange({ totalRounds: n })}
                    className={`py-2.5 rounded-xl font-black text-sm border transition-all ${
                      settings.totalRounds === n
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                {lang === 'ja' ? '道案内を読む時間 (秒)' : 'Directions Briefing (sec)'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 8, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => onChange({ briefingSec: sec })}
                    className={`py-2.5 rounded-xl font-black text-sm border transition-all ${
                      settings.briefingSec === sec
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                {lang === 'ja' ? '制限時間 (秒)' : 'Race Time Limit (sec)'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => onChange({ roundDurationSec: sec })}
                    className={`py-2.5 rounded-xl font-black text-sm border transition-all ${
                      settings.roundDurationSec === sec
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                {lang === 'ja' ? 'ルート難易度' : 'Route Difficulty'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['EASY', 'MEDIUM', 'HARD'] as TownDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => onChange({ difficulty: diff })}
                    className={`py-2.5 rounded-xl font-black text-xs border transition-all ${
                      settings.difficulty === diff
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {diff === 'EASY'
                      ? lang === 'ja' ? 'かんたん' : 'Easy'
                      : diff === 'MEDIUM'
                      ? lang === 'ja' ? 'ふつう' : 'Medium'
                      : lang === 'ja' ? 'むずかしい' : 'Hard'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Visuals, Camera & Scaffolds */}
          <div className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                {lang === 'ja' ? 'テレビ表示モード' : 'Front TV Display'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['3D', '2D'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => onChange({ tvRenderMode: m })}
                    className={`py-2.5 rounded-xl font-black text-sm border transition-all ${
                      settings.tvRenderMode === m
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m === '3D' ? '3D Town' : '2D Blueprint'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2 flex items-center gap-1.5">
                <Tablet className="w-3.5 h-3.5" />
                {lang === 'ja' ? 'iPad初期モード' : 'Student iPad Default'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['3D', '2D'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => onChange({ defaultStudentMode: m })}
                    className={`py-2.5 rounded-xl font-black text-sm border transition-all ${
                      settings.defaultStudentMode === m
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m === '3D' ? '3D Drive' : '2D Map'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                {lang === 'ja' ? 'レース中のTVカメラ' : 'Live TV Camera'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'OVERVIEW', en: 'Overview', ja: '全体' },
                    { id: 'MYSTERY_SKY', en: 'Mystery Sky', ja: 'ミステリー' },
                    { id: 'FOLLOW_LEADER', en: 'Follow 1st', ja: '1位追跡' },
                  ] as Array<{ id: TownCameraMode; en: string; ja: string }>
                ).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => onChange({ tvCameraMode: cam.id })}
                    className={`py-2.5 rounded-xl font-black text-xs border transition-all ${
                      settings.tvCameraMode === cam.id
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {lang === 'ja' ? cam.ja : cam.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {lang === 'ja' ? '日本語ヒントを表示' : 'Show Japanese Direction Hints'}
                </span>
                <input
                  type="checkbox"
                  checked={settings.showJapaneseHints}
                  onChange={(e) => onChange({ showJapaneseHints: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {lang === 'ja' ? 'iPadにステップチェックリストを表示' : 'Show Step Checklist on Student iPads'}
                </span>
                <input
                  type="checkbox"
                  checked={settings.showStepChecklist}
                  onChange={(e) => onChange({ showStepChecklist: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-colors"
          >
            {lang === 'ja' ? '完了' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
