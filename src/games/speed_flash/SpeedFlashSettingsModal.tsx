import React, { useEffect } from 'react';
import { FlashMode, DisplayTier } from './types';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import {
  X,
  Settings,
  Zap,
  Flame,
  Clock,
  Hand,
  Sparkles,
  BookOpen,
  RotateCcw,
  Check,
  Volume2
} from 'lucide-react';

interface SpeedFlashSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: FlashMode;
  setMode: (mode: FlashMode) => void;
  tier: DisplayTier;
  setTier: (tier: DisplayTier) => void;
  lightningSpeed: number;
  setLightningSpeed: (speed: number) => void;
  rhythmTempo: number;
  setRhythmTempo: (tempo: number) => void;
  autoPlayAudio: boolean;
  setAutoPlayAudio: (autoPlay: boolean) => void;
  activeUnit: string;
  setActiveUnit: (unit: string) => void;
  availableUnits: string[];
  activeGrade: string;
  onResetQueue: () => void;
}

export const SpeedFlashSettingsModal: React.FC<SpeedFlashSettingsModalProps> = ({
  isOpen,
  onClose,
  mode,
  setMode,
  tier,
  setTier,
  lightningSpeed,
  setLightningSpeed,
  rhythmTempo,
  setRhythmTempo,
  autoPlayAudio,
  setAutoPlayAudio,
  activeUnit,
  setActiveUnit,
  availableUnits,
  activeGrade,
  onResetQueue
}) => {
  const { t } = useLanguage();
  const { playPop } = useAudio();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border-2 border-slate-700 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{t("Game Settings", <>ゲーム<ruby>設定<rt className="text-[7px]">せってい</rt></ruby></>)}</span>
                <span className="text-xs font-normal text-slate-400">| Speed Flashcard Race</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title={t("Close", "閉じる")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* 1. Game Mode Selector */}
          <div className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-200 flex items-center gap-2">
                <Zap size={15} className="text-rose-400" />
                <span>{t("Game Mode", <><ruby>遊<rt className="text-[7px]">あそ</rt></ruby>び<ruby>方<rt className="text-[7px]">かた</rt></ruby>モード</>)}</span>
              </span>
              <span className="text-[11px] text-rose-300 font-bold">
                {mode === 'LIGHTNING' && t("Lightning (Single Flash & Guess)", "瞬きフラッシュ（1枚ずつ一瞬表示）")}
                {mode === 'ACCELERATING' && t("Accelerating (Speed Race)", "だんだん加速（徐々にスピードアップ）")}
                {mode === 'RHYTHMIC' && t("Rhythmic (Metronome Chants)", "リズム・チャンツ（一定のテンポで発音）")}
                {mode === 'MANUAL' && t("Manual (Teacher Clicker)", "先生操作（手動でめくる）")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => { playPop(); setMode('LIGHTNING'); }}
                className={`py-2 px-2 rounded-xl font-black text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  mode === 'LIGHTNING'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm">⚡</span>
                <span className="mt-0.5">{t("Lightning Flash", <><ruby>瞬<rt className="text-[7px]">まばた</rt></ruby>きフラッシュ</>)}</span>
              </button>

              <button
                onClick={() => { playPop(); setMode('ACCELERATING'); }}
                className={`py-2 px-2 rounded-xl font-black text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  mode === 'ACCELERATING'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm">🏎️</span>
                <span className="mt-0.5">{t("Accelerating", <>だんだん<ruby>加速<rt className="text-[7px]">かそく</rt></ruby></>)}</span>
              </button>

              <button
                onClick={() => { playPop(); setMode('RHYTHMIC'); }}
                className={`py-2 px-2 rounded-xl font-black text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  mode === 'RHYTHMIC'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm">🎵</span>
                <span className="mt-0.5">{t("Rhythmic Chants", <>リズム・チャンツ</>)}</span>
              </button>

              <button
                onClick={() => { playPop(); setMode('MANUAL'); }}
                className={`py-2 px-2 rounded-xl font-black text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  mode === 'MANUAL'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm">🖐️</span>
                <span className="mt-0.5">{t("Manual Advance", <><ruby>先生<rt className="text-[7px]">せんせい</rt></ruby><ruby>操作<rt className="text-[7px]">そうさ</rt></ruby></>)}</span>
              </button>
            </div>
          </div>

          {/* 2. Display Mode Selector */}
          <div className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-700/70 space-y-2">
            <span className="font-black text-slate-200 flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-400" />
              <span>{t("Card Display Mode", <><ruby>表示<rt className="text-[7px]">ひょうじ</rt></ruby>モード</>)}</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { playPop(); setTier('picture_only'); }}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  tier === 'picture_only'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm sm:text-base">🎨</span>
                <span className="font-black mt-0.5">{t("Picture Only", <>イラストのみ</>)}</span>
              </button>
              <button
                onClick={() => { playPop(); setTier('picture_word'); }}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  tier === 'picture_word'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm sm:text-base">🖼️</span>
                <span className="font-black mt-0.5">{t("Picture + Word", <><ruby>絵<rt className="text-[7px]">え</rt></ruby>＋<ruby>文字<rt className="text-[7px]">もじ</rt></ruby></>)}</span>
              </button>
              <button
                onClick={() => { playPop(); setTier('word_only'); }}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  tier === 'word_only'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm sm:text-base">🔤</span>
                <span className="font-black mt-0.5">{t("Word Only", <>えいごのみ</>)}</span>
              </button>
            </div>
          </div>

          {/* 3. Speed & Tempo Settings Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Lightning Flash Duration */}
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-200 flex items-center gap-1.5">
                  <Zap size={14} className="text-rose-400" />
                  <span>{t("Flash Duration", <><ruby>閃光<rt className="text-[7px]">せんこう</rt></ruby>スピード</>)}</span>
                </span>
                <span className="text-[11px] text-rose-300 font-bold">{lightningSpeed / 1000}s</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[100, 250, 500, 1000].map((ms) => (
                  <button
                    key={ms}
                    onClick={() => { playPop(); setLightningSpeed(ms); }}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                      lightningSpeed === ms
                        ? 'bg-rose-600 text-white border-rose-400 font-black shadow-md'
                        : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {ms === 100 ? '0.1s' : ms === 250 ? '0.25s' : ms === 500 ? '0.5s' : '1.0s'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rhythmic Chants Tempo */}
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-200 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-400" />
                  <span>{t("Chants Tempo", <>チャンツテンポ</>)}</span>
                </span>
                <span className="text-[11px] text-indigo-300 font-bold">{rhythmTempo / 1000}s</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[800, 1000, 1200, 1500].map((ms) => (
                  <button
                    key={ms}
                    onClick={() => { playPop(); setRhythmTempo(ms); }}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                      rhythmTempo === ms
                        ? 'bg-indigo-600 text-white border-indigo-400 font-black shadow-md'
                        : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {ms === 800 ? '0.8s' : ms === 1000 ? '1.0s' : ms === 1200 ? '1.2s' : '1.5s'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Audio Pronunciation on Reveal Toggle */}
          <div className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-200 flex items-center gap-1.5">
                <Volume2 size={15} className="text-sky-400" />
                <span>{t("Auto-Play Pronunciation", <><ruby>正解時<rt className="text-[7px]">せいかいじ</rt></ruby>の<ruby>音声<rt className="text-[7px]">おんせい</rt></ruby><ruby>再生<rt className="text-[7px]">さいせい</rt></ruby></>)}</span>
              </span>
              <span className="text-[11px] text-sky-300 font-bold">
                {autoPlayAudio ? t("ON", "ON") : t("OFF", "OFF")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { playPop(); setAutoPlayAudio(true); }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                  autoPlayAudio
                    ? 'bg-sky-500 text-white border-sky-400 font-black shadow-md'
                    : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {t("ON (Play automatically)", <>ON（自動で発音）★おすすめ</>)}
              </button>
              <button
                onClick={() => { playPop(); setAutoPlayAudio(false); }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                  !autoPlayAudio
                    ? 'bg-slate-700 text-white border-slate-500 font-black shadow-md'
                    : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {t("OFF (Manual only)", <>OFF（ボタンのみ）</>)}
              </button>
            </div>
          </div>

          {/* 5. Textbook Unit Switcher */}
          {availableUnits.length > 0 && (
            <div className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-700/70 flex items-center justify-between gap-3">
              <span className="font-black text-slate-200 flex items-center gap-1.5 shrink-0">
                <BookOpen size={14} className="text-amber-400" />
                <span>{t("Textbook Unit", <><ruby>単元<rt className="text-[7px]">たんげん</rt></ruby></>)}:</span>
              </span>
              <select
                value={activeUnit}
                onChange={(e) => setActiveUnit(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-amber-300 font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="ALL">
                  {t(`All Units (${activeGrade})`, <><ruby>全単元<rt className="text-[7px]">ぜんたんげん</rt></ruby> ({activeGrade})</>)}
                </option>
                {availableUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              playPop();
              onResetQueue();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title={t("Shuffle and restart queue", "カード順をシャッフルして最初から")}
          >
            <RotateCcw size={15} />
            <span>{t("Shuffle & Restart", <><ruby>順序<rt className="text-[7px]">じゅんじょ</rt></ruby>をシャッフル</>)}</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Check size={16} />
            <span>{t("Done & Resume", <>完了してゲームへ</>)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
