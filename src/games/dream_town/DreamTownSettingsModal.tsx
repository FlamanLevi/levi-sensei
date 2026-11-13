import React from 'react';
import { X, Volume2, VolumeX, Sparkles, Compass, Building, Check, Tag, RefreshCw } from 'lucide-react';
import { TownGameMode, ArchitectRole } from './engine/types';

interface DreamTownSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMode: TownGameMode;
  onSelectMode: (mode: TownGameMode) => void;
  activeRole: ArchitectRole;
  onSelectRole: (role: ArchitectRole) => void;
  blueprintRound: 1 | 2;
  onSelectBlueprintRound: (round: 1 | 2) => void;
  showLandmarkLabels: boolean;
  onToggleLandmarkLabels: () => void;
  voiceAssistEnabled: boolean;
  onToggleVoiceAssist: () => void;
  onSelectPreset: (presetKey: string) => void;
  isJa: boolean;
}

export const DreamTownSettingsModal: React.FC<DreamTownSettingsModalProps> = ({
  isOpen,
  onClose,
  activeMode,
  onSelectMode,
  activeRole,
  onSelectRole,
  blueprintRound,
  onSelectBlueprintRound,
  showLandmarkLabels,
  onToggleLandmarkLabels,
  voiceAssistEnabled,
  onToggleVoiceAssist,
  onSelectPreset,
  isJa
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md md:max-w-4xl max-h-[92dvh] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 min-h-[48px] shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
            <span className="text-xl shrink-0">⚙️</span>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base sm:text-lg truncate">
              {isJa ? '設定・モード切替' : 'Game Settings & Modes'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 items-start flex-1">
          {/* Left Column: Mode + Role & Round */}
          <div className="flex flex-col gap-4">
            {/* 1. Mode Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isJa ? 'ゲームモード選択' : 'Select Game Mode'}
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectMode('BLUEPRINT_INFO_GAP')}
                  className={`p-3 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                    activeMode === 'BLUEPRINT_INFO_GAP'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-rose-400/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 mt-0.5">
                    <Building size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm sm:text-base flex items-center justify-between gap-2">
                      <span>{isJa ? '1. 建物あて（情報ギャップ）' : '1. Missing Blueprint (Info-Gap)'}</span>
                      {activeMode === 'BLUEPRINT_INFO_GAP' && <Check size={16} className="text-rose-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isJa
                        ? '「Where is the ~?」「It is next to the library」でペアで協力！'
                        : 'Ask locations and prepositions (next to, between, by the canal).'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('TOWN_NAVIGATOR')}
                  className={`p-3 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                    activeMode === 'TOWN_NAVIGATOR'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-amber-400/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5">
                    <Compass size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm sm:text-base flex items-center justify-between gap-2">
                      <span>{isJa ? '2. 道案内（タウン・ナビゲーター）' : '2. Town Navigator'}</span>
                      {activeMode === 'TOWN_NAVIGATOR' && <Check size={16} className="text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isJa
                        ? '「Go straight」「Turn left at the fountain」で目的地へ導こう！'
                        : 'Guide the traveler with turn-by-turn directions to reach the goal.'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('FREE_COOP_BUILDER')}
                  className={`p-3 rounded-2xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                    activeMode === 'FREE_COOP_BUILDER'
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-cyan-400/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-cyan-500 text-slate-950 shrink-0 mt-0.5">
                    <Sparkles size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm sm:text-base flex items-center justify-between gap-2">
                      <span>{isJa ? '3. 自由制作・発表（ドリームタウン）' : '3. Co-Op Town Builder'}</span>
                      {activeMode === 'FREE_COOP_BUILDER' && <Check size={16} className="text-cyan-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isJa
                        ? '全256タイルを自由に使って街づくり！自動英語発表スクリプト付き。'
                        : 'Create any kingdom with all 256 tiles and present in English.'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Role & Round Selection (For Mode 1 Info Gap) */}
            {activeMode === 'BLUEPRINT_INFO_GAP' && (
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isJa ? 'あなたの役割・ラウンド（ペア）' : 'Your Role & Puzzle Set'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectRole('architect_a')}
                    className={`p-3 rounded-2xl border-2 text-center font-black text-xs sm:text-sm transition-all cursor-pointer ${
                      activeRole === 'architect_a'
                        ? 'border-rose-500 bg-rose-500 text-white shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>📱 {isJa ? 'アーキテクト A' : 'Architect A'}</div>
                    <div className="text-[11px] font-normal opacity-90 mt-0.5">
                      {isJa ? '質問して建てる人' : 'Ask & Place Buildings'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectRole('architect_b')}
                    className={`p-3 rounded-2xl border-2 text-center font-black text-xs sm:text-sm transition-all cursor-pointer ${
                      activeRole === 'architect_b'
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>🗺️ {isJa ? 'アーキテクト B' : 'Architect B'}</div>
                    <div className="text-[11px] font-normal opacity-90 mt-0.5">
                      {isJa ? '設計図を見て答える人' : 'Master Blueprint Guide'}
                    </div>
                  </button>
                </div>

                {/* Round 1 vs Round 2 Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectBlueprintRound(1)}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      blueprintRound === 1
                        ? 'border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <RefreshCw size={13} className="shrink-0" />
                    <span>{isJa ? '第1ラウンド (パン屋・市役所・花屋・神社)' : 'Set 1 (Bakery, Hall, Flower, Shrine)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectBlueprintRound(2)}
                    className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      blueprintRound === 2
                        ? 'border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <RefreshCw size={13} className="shrink-0" />
                    <span>{isJa ? '第2ラウンド・交代用 (レストラン・お店・農場・お寺)' : 'Set 2 / Role Swap (Inn, Store, Farm, Temple)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Starter Presets + Feature Toggles */}
          <div className="flex flex-col gap-4">
            {/* 3. Starter Presets */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isJa ? '街の初期プリセット' : 'Starter Town Maps'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { onSelectPreset('blueprint'); onClose(); }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50 dark:bg-slate-950/50 text-xs font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-all text-center cursor-pointer"
                >
                  🗺️ {isJa ? '学習タウン（標準）' : 'Curriculum Town'}
                </button>
                <button
                  type="button"
                  onClick={() => { onSelectPreset('village'); onClose(); }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50 dark:bg-slate-950/50 text-xs font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-all text-center cursor-pointer"
                >
                  🏡 {isJa ? 'のどかな村' : 'Village'}
                </button>
                <button
                  type="button"
                  onClick={() => { onSelectPreset('riverside'); onClose(); }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50 dark:bg-slate-950/50 text-xs font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-all text-center cursor-pointer"
                >
                  🌊 {isJa ? '川沿いの谷' : 'Riverside'}
                </button>
                <button
                  type="button"
                  onClick={() => { onSelectPreset('market'); onClose(); }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50 dark:bg-slate-950/50 text-xs font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-all text-center cursor-pointer"
                >
                  🏛️ {isJa ? '市場の都' : 'Market Capital'}
                </button>
                <button
                  type="button"
                  onClick={() => { onSelectPreset('spacious'); onClose(); }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50 dark:bg-slate-950/50 text-xs font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-all text-center cursor-pointer"
                >
                  🏰 {isJa ? '広大な王国' : 'Spacious Kingdom'}
                </button>
                <button
                  type="button"
                  onClick={() => { onSelectPreset('meadow'); onClose(); }}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 bg-slate-50 dark:bg-slate-950/50 text-xs font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-all text-center cursor-pointer"
                >
                  🌱 {isJa ? '草原リセット' : 'Clear Meadow'}
                </button>
              </div>
            </div>

            {/* 4. Toggles: Landmark Labels & Voice Assist */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {isJa ? 'マップ上の目印ラベル表示' : 'Show On-Map Landmark Labels'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isJa ? '図書館・噴水・公園などの名前バッジを画面上に表示' : 'Display floating name badges above key landmarks.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleLandmarkLabels}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer shrink-0 ${
                    showLandmarkLabels
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Tag size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <div className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {isJa ? 'ネイティブ英語音声アシスト' : 'Native Speech Audio Assist'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isJa ? '単語やフレーズをタップしたときに発音を再生' : 'Speak target words and directions on click.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleVoiceAssist}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer shrink-0 ${
                    voiceAssistEnabled
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {voiceAssistEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end shrink-0 flex-nowrap">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs sm:text-sm font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-md cursor-pointer whitespace-nowrap shrink-0"
          >
            {isJa ? '決定して閉じる' : 'Apply & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
