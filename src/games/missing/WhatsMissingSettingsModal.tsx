import React, { useEffect } from 'react';
import { CardCount, DisplayTier, MissingCount, TimerOption, ScoreboardMode } from './types';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import {
  X,
  Settings,
  Sparkles,
  Shuffle,
  Clock,
  Trophy,
  Layers,
  BookOpen,
  RotateCcw,
  Check,
  Eye
} from 'lucide-react';

interface WhatsMissingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardCount: CardCount;
  setCardCount: (count: CardCount) => void;
  displayTier: DisplayTier;
  setDisplayTier: (tier: DisplayTier) => void;
  shuffleOrder: boolean;
  setShuffleOrder: (shuffle: boolean) => void;
  missingCount: MissingCount;
  setMissingCount: (count: MissingCount) => void;
  timerOption: TimerOption;
  setTimerOption: (timer: TimerOption) => void;
  scoreboardMode: ScoreboardMode;
  setScoreboardMode: (mode: ScoreboardMode) => void;
  teacherGhostPeek: boolean;
  setTeacherGhostPeek: (peek: boolean) => void;
  activeUnit: string;
  setActiveUnit: (unit: string) => void;
  availableUnits: string[];
  activeGrade: string;
  sixCardLayout: '2_rows' | '1_row';
  setSixCardLayout: (layout: '2_rows' | '1_row') => void;
  onNewCards: () => void;
}

export const WhatsMissingSettingsModal: React.FC<WhatsMissingSettingsModalProps> = ({
  isOpen,
  onClose,
  cardCount,
  setCardCount,
  displayTier,
  setDisplayTier,
  shuffleOrder,
  setShuffleOrder,
  missingCount,
  setMissingCount,
  timerOption,
  setTimerOption,
  scoreboardMode,
  setScoreboardMode,
  teacherGhostPeek,
  setTeacherGhostPeek,
  activeUnit,
  setActiveUnit,
  availableUnits,
  activeGrade,
  sixCardLayout,
  setSixCardLayout,
  onNewCards
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
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{t("Game Settings", <>ゲーム<ruby>設定<rt className="text-[7px]">せってい</rt></ruby></>)}</span>
                <span className="text-xs font-normal text-slate-400">| What's Missing?</span>
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
          {/* 1. Card Count */}
          <div className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-200 flex items-center gap-2">
                <Layers size={15} className="text-teal-400" />
                <span>{t("Card Count", <><ruby>枚数<rt className="text-[7px]">まいすう</rt></ruby>（難易度）</>)}</span>
              </span>
              <span className="text-[11px] text-teal-300 font-bold">
                {cardCount === 4 && t("Level 1 (Easy / 1 Row)", "初級（4枚 × 1段）")}
                {cardCount === 6 && t("Level 2 (Standard / 2 Rows)", "標準（3枚 × 2段）")}
                {cardCount === 8 && t("Level 3 (Challenge / 2 Rows)", "挑戦（4枚 × 2段）")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8].map((count) => {
                const isSelected = cardCount === count;
                return (
                  <button
                    key={count}
                    onClick={() => {
                      playPop();
                      setCardCount(count as CardCount);
                    }}
                    className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all border flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500 text-white border-teal-400 shadow-md ring-2 ring-teal-400/30'
                        : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{count} {t("Cards", <><ruby>枚<rt className="text-[7px]">まい</rt></ruby></>)}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      {count === 4 ? t("4 × 1 Row", "1列 4枚") : count === 6 ? t("3 × 2 Rows", "2列 3枚") : t("4 × 2 Rows", "2列 4枚")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Display Mode */}
          <div className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-700/70 space-y-2">
            <span className="font-black text-slate-200 flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-400" />
              <span>{t("Card Display Mode", <><ruby>表示<rt className="text-[7px]">ひょうじ</rt></ruby>モード</>)}</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { playPop(); setDisplayTier('picture_only'); }}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  displayTier === 'picture_only'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm sm:text-base">🎨</span>
                <span className="font-black mt-0.5">{t("Picture Only", <>イラストのみ</>)}</span>
              </button>
              <button
                onClick={() => { playPop(); setDisplayTier('picture_word'); }}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  displayTier === 'picture_word'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm sm:text-base">🖼️</span>
                <span className="font-black mt-0.5">{t("Picture + Word", <><ruby>絵<rt className="text-[7px]">え</rt></ruby>＋<ruby>文字<rt className="text-[7px]">もじ</rt></ruby></>)}</span>
              </button>
              <button
                onClick={() => { playPop(); setDisplayTier('word_only'); }}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all border flex flex-col items-center justify-center cursor-pointer ${
                  displayTier === 'word_only'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-sm sm:text-base">🔤</span>
                <span className="font-black mt-0.5">{t("Word Only", <>えいごのみ</>)}</span>
              </button>
            </div>
          </div>

          {/* 3. Missing Cards & Shuffle Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Missing Cards Count */}
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/70 space-y-2">
              <span className="font-black text-slate-200 block">
                {t("Missing Cards", <><ruby>消<rt className="text-[7px]">き</rt></ruby>える枚数</>)}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { playPop(); setMissingCount(1); }}
                  className={`py-2 px-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    missingCount === 1
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                      : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t("1 Card", <>1<ruby>枚<rt className="text-[7px]">まい</rt></ruby></>)}
                </button>
                <button
                  onClick={() => { playPop(); setMissingCount(2); }}
                  className={`py-2 px-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    missingCount === 2
                      ? 'bg-rose-500 text-white border-rose-400 font-black shadow-md'
                      : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t("⚡ 2 Cards (Double)", <>⚡ 2<ruby>枚<rt className="text-[7px]">まい</rt></ruby>（難関）</>)}
                </button>
              </div>
            </div>

            {/* Position Shuffle */}
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-200 flex items-center gap-1.5">
                  <Shuffle size={14} className="text-amber-400" />
                  <span>{t("Position Shuffle", <>シャッフル</>)}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { playPop(); setShuffleOrder(false); }}
                  className={`py-2 px-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    !shuffleOrder
                      ? 'bg-slate-700 text-white border-slate-500 font-black shadow-md'
                      : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t("OFF (Fixed slots)", <>OFF（位置そのまま）</>)}
                </button>
                <button
                  onClick={() => { playPop(); setShuffleOrder(true); }}
                  className={`py-2 px-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    shuffleOrder
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                      : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t("ON (Rearrange)", <>ON（並び替え）</>)}
                </button>
              </div>
            </div>
          </div>

          {/* 4. Timer & Scoreboard Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Countdown Timer */}
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/70 space-y-2">
              <span className="font-black text-slate-200 flex items-center gap-1.5">
                <Clock size={14} className="text-sky-400" />
                <span>{t("Study Timer", <><ruby>記憶<rt className="text-[7px]">きおく</rt></ruby>タイマー</>)}</span>
              </span>
              <div className="grid grid-cols-4 gap-1">
                {([0, 5, 8, 12] as TimerOption[]).map((sec) => (
                  <button
                    key={sec}
                    onClick={() => { playPop(); setTimerOption(sec); }}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                      timerOption === sec
                        ? 'bg-sky-500 text-white border-sky-400 font-black shadow-md'
                        : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {sec === 0 ? t("OFF", "OFF") : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Scoreboard */}
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/70 space-y-2">
              <span className="font-black text-slate-200 flex items-center gap-1.5">
                <Trophy size={14} className="text-indigo-400" />
                <span>{t("Team Scoreboard", <><ruby>得点板<rt className="text-[7px]">とくてんばん</rt></ruby></>)}</span>
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(['off', '2_teams', '4_teams'] as ScoreboardMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { playPop(); setScoreboardMode(mode); }}
                    className={`py-1.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                      scoreboardMode === mode
                        ? 'bg-indigo-600 text-white border-indigo-400 font-black shadow-md'
                        : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {mode === 'off' ? t("OFF", "OFF") : mode === '2_teams' ? t("2 Teams", "2チーム") : t("4 Teams", "4チーム")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Teacher Ghost Peek (Discreet Watermark for iPad / Laptop) */}
          <div className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-200 flex items-center gap-1.5">
                <Eye size={15} className="text-amber-400" />
                <span>{t("Teacher Ghost Peek", <><ruby>先生用<rt className="text-[7px]">せんせいよう</rt></ruby>ゴーストヒント</>)}</span>
              </span>
              <span className="text-[11px] text-teal-300 font-bold">
                {teacherGhostPeek ? t("Visible on iPad / laptop", "手元の画面に薄く表示") : t("Hidden", "非表示")}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t(
                "Shows a faint watermark of the hidden English word in the top corner of mystery cards. Readable on your handheld iPad or laptop screen at 30cm, but completely invisible to students seated in front of the TV or projector.",
                <>「？」カードの隅に薄く正解単語を表示します。手元のiPadやパソコン画面では読めますが、教室のテレビやプロジェクターからは児童に見えません。</>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => { playPop(); setTeacherGhostPeek(true); }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                  teacherGhostPeek
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                    : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {t("ON (Ghost Watermark Active)", <>ON（手元ヒントあり）★おすすめ</>)}
              </button>
              <button
                onClick={() => { playPop(); setTeacherGhostPeek(false); }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                  !teacherGhostPeek
                    ? 'bg-slate-700 text-white border-slate-500 font-black shadow-md'
                    : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {t("OFF (Standard Mystery)", <>OFF（完全非表示）</>)}
              </button>
            </div>
          </div>

          {/* 6. 6-Card Layout preference (Only shown when cardCount === 6) */}
          {cardCount === 6 && (
            <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-200">
                  {t("6-Card Board Layout", <>6枚の<ruby>配置<rt className="text-[7px]">はいち</rt></ruby></>)}
                </span>
                <span className="text-[11px] text-slate-400">
                  {sixCardLayout === '2_rows' ? t("3 columns × 2 rows (Larger pictures)", "3枚 × 2段（大画像）") : t("6 columns × 1 row", "1列 6枚")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { playPop(); setSixCardLayout('2_rows'); }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    sixCardLayout === '2_rows'
                      ? 'bg-teal-500 text-white border-teal-400 font-black shadow-md'
                      : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t("2 Rows (3 × 2) ★ Big", <>2段（3枚 × 2段）★おすすめ</>)}
                </button>
                <button
                  onClick={() => { playPop(); setSixCardLayout('1_row'); }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                    sixCardLayout === '1_row'
                      ? 'bg-teal-500 text-white border-teal-400 font-black shadow-md'
                      : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t("1 Row (6 × 1)", <>1列（横並び 6枚）</>)}
                </button>
              </div>
            </div>
          )}

          {/* 7. Textbook Unit Switcher */}
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
              onNewCards();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title={t("Deal fresh new cards", "新しいカードを配り直す")}
          >
            <RotateCcw size={15} />
            <span>{t("Deal New Cards", <><ruby>新<rt className="text-[7px]">あたら</rt></ruby>しいカードを<ruby>配<rt className="text-[7px]">くば</rt></ruby>る</>)}</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Check size={16} />
            <span>{t("Done & Resume", <>完了してゲームへ</>)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
