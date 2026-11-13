import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Printer,
  Sliders,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Info,
  Scissors,
  Copy,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import {
  DialoguePresetId,
  JapaneseNotation,
  JankenGeneratorOptions,
  JankenLayoutMode,
  PrintInkTheme,
  WorksheetOrientation
} from './types';
import { DIALOGUE_PRESETS, DIALOGUE_PRESET_ORDER } from './presets';
import { generateJankenPages, getEffectiveRoundsPerCard } from './generator';
import { JankenWorksheetPage } from './JankenWorksheetPage';
import { PaperHandSvg, RockHandSvg, ScissorsHandSvg, StarburstRoundBadge } from './handIcons';

const MM_TO_PX = 96 / 25.4;

interface JankenWorksheetStudioProps {
  onExit?: () => void;
}

export const JankenWorksheetStudio: React.FC<JankenWorksheetStudioProps> = () => {
  const { t, language } = useLanguage();
  const { activeClassId } = useClassroom();

  const [layoutMode, setLayoutMode] = useState<JankenLayoutMode>('full');
  const [orientation, setOrientation] = useState<WorksheetOrientation>('landscape');
  const [japaneseNotation, setJapaneseNotation] = useState<JapaneseNotation>('ruby');
  const [inkTheme, setInkTheme] = useState<PrintInkTheme>('color');

  const [studentCount, setStudentCount] = useState<number>(30);
  const [masterCopyPage, setMasterCopyPage] = useState<boolean>(false);
  const [autoNumberAttendance, setAutoNumberAttendance] = useState<boolean>(true);
  const [classNameInput, setClassNameInput] = useState<string>(() => {
    if (activeClassId) {
      return `${activeClassId.replace('-', '年')}組`;
    }
    return '3年1組';
  });

  const [roundsPerCard, setRoundsPerCard] = useState<1 | 2 | 3 | 4>(2);
  const [showTextbookBadge, setShowTextbookBadge] = useState<boolean>(true);
  const [showHandGuide, setShowHandGuide] = useState<boolean>(true);
  const [showTallyBox, setShowTallyBox] = useState<boolean>(true);
  const [showDialogueBox, setShowDialogueBox] = useState<boolean>(true);
  const [showSelfCheck, setShowSelfCheck] = useState<boolean>(true);

  const [dialoguePresetId, setDialoguePresetId] = useState<DialoguePresetId>('how_many');
  const [customLineA, setCustomLineA] = useState<string>('"What sport do you like?"');
  const [customLineB, setCustomLineB] = useState<string>('"I like soccer! / Me, too!"');
  const [customHintJa, setCustomHintJa] = useState<string>('英語で質問してからじゃんけんしよう！');

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'SINGLE' | 'GRID'>('SINGLE');
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(0);

  const previewStageRef = useRef<HTMLDivElement>(null);
  const [previewContainerWidth, setPreviewContainerWidth] = useState<number>(920);

  useEffect(() => {
    const el = previewStageRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setPreviewContainerWidth(el.clientWidth);
      }
    };
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode]);

  const options: JankenGeneratorOptions = useMemo(
    () => ({
      layoutMode,
      orientation,
      japaneseNotation,
      inkTheme,
      studentCount,
      startAttendanceNumber: 1,
      autoNumberAttendance,
      masterCopyPage,
      className: classNameInput,
      roundsPerCard,
      showTextbookBadge,
      showHandGuide,
      showTallyBox,
      showDialogueBox,
      showSelfCheck,
      dialoguePresetId,
      customLineA,
      customLineB,
      customHintJa
    }),
    [
      layoutMode,
      orientation,
      japaneseNotation,
      inkTheme,
      studentCount,
      autoNumberAttendance,
      masterCopyPage,
      classNameInput,
      roundsPerCard,
      showTextbookBadge,
      showHandGuide,
      showTallyBox,
      showDialogueBox,
      showSelfCheck,
      dialoguePresetId,
      customLineA,
      customLineB,
      customHintJa
    ]
  );

  const { cards, pages, cardsPerPage } = useMemo(() => generateJankenPages(options), [options]);
  const safePageIndex = Math.min(currentPreviewPage, Math.max(0, pages.length - 1));
  const activePage = pages[safePageIndex] || pages[0];
  const effectiveRounds = getEffectiveRoundsPerCard(layoutMode, roundsPerCard);

  const sheetWidthPx = (orientation === 'landscape' ? 297 : 210) * MM_TO_PX;
  const sheetHeightPx = (orientation === 'landscape' ? 210 : 297) * MM_TO_PX;
  const horizontalPadPx = previewContainerWidth < 640 ? 20 : 48;
  const previewScale = Math.min(
    1,
    Math.max(0.28, (previewContainerWidth - horizontalPadPx) / sheetWidthPx)
  );

  const handleLayoutChange = (mode: JankenLayoutMode) => {
    soundEffects.playTick();
    setLayoutMode(mode);
    setCurrentPreviewPage(0);
    // For 4-up compact slips, portrait A4 gives generous grid height; 2-up works nicely in portrait too
    if (mode === 'slips_2' || mode === 'slips_4') {
      setOrientation('portrait');
    }
  };

  const handlePrintClick = () => {
    soundEffects.playCardFlip();
    window.print();
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start min-h-full">
      {/* =========================================================================
          SCREEN-ONLY WORKSHEET STUDIO INTERFACE (Hidden during printing)
          ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 print:hidden flex flex-col gap-3">
        {/* Top Control Bar */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-md flex flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap items-center justify-between gap-2.5">
          {/* Left: Layout Density Switcher (Full A4 vs 2 Slips vs 4 Slips) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => handleLayoutChange('full')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'full'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t('1 full A4 worksheet per student (1-4 rounds)', '児童1人にA4まるごと1枚（1〜4回戦）')}
            >
              <FileText size={15} />
              <span>{t('Full A4 Sheet', 'A4 1枚（複数回戦）')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleLayoutChange('slips_2')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'slips_2'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t('2 half-sheet slips per A4 page with cut guide', 'A4用紙1枚に2人分（きりとり線付き）')}
            >
              <Scissors size={15} />
              <span>{t('2 Slips / A4', '2分割（半切り）')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleLayoutChange('slips_4')}
              className={`px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                layoutMode === 'slips_4'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={t('4 compact quarter-cards per A4 page with cut guides', 'A4用紙1枚に4人分（省エネ4分割）')}
            >
              <LayoutGrid size={15} />
              <span>{t('4 Slips / A4', '4分割（省ペーパー）')}</span>
            </button>
          </div>

          {/* Orientation Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTick();
                setOrientation('landscape');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="inline-block w-3.5 h-2.5 border-2 border-current rounded-[2px] shrink-0" />
              <span>{t('Landscape (A4横)', 'A4 横向き')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTick();
                setOrientation('portrait');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="inline-block w-2.5 h-3.5 border-2 border-current rounded-[2px] shrink-0" />
              <span>{t('Portrait (A4縦)', 'A4 縦向き')}</span>
            </button>
          </div>

          {/* Action Cluster */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTick();
                setIsConfigOpen((v) => !v);
              }}
              className={`px-3 py-2 rounded-xl border font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isConfigOpen
                  ? 'bg-slate-800 text-white border-slate-700 dark:bg-slate-700'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              <Sliders size={15} />
              <span>{t('Options & Dialogue', '印刷設定・セリフ')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Printer size={18} />
              <span>{t('Print Worksheets', 'A4印刷する')}</span>
              <span className="bg-emerald-700/70 px-2 py-0.5 rounded text-xs">
                {pages.length} {t(pages.length === 1 ? 'Page' : 'Pages', '枚(A4)')}
              </span>
            </button>
          </div>
        </div>

        {/* CONFIGURATION DRAWER */}
        {isConfigOpen && (
          <div className="bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-900/50 rounded-2xl p-4 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Row 1: Count, Class/Rounds, Notation/Ink/Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              {/* Col 1: Student Cards / Copier Master */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {t('Students / Cards & Copier Master', '配布枚数・コピー原紙')}
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setMasterCopyPage(true);
                      setCurrentPreviewPage(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer border ${
                      masterCopyPage
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                    title={t('Print 1 A4 sheet filled with blank-number cards for photocopying', '番号なしの原紙を1枚だけ印刷（印刷機・コピー用）')}
                  >
                    <Copy size={12} />
                    <span>{t('1 Master A4', '原紙1枚')}</span>
                  </button>

                  {[10, 20, 30, 35, 40].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setMasterCopyPage(false);
                        setStudentCount(count);
                        setCurrentPreviewPage(0);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        !masterCopyPage && studentCount === count
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {count}
                    </button>
                  ))}

                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={studentCount}
                    onChange={(e) => {
                      setMasterCopyPage(false);
                      setStudentCount(Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 1)));
                      setCurrentPreviewPage(0);
                    }}
                    className="w-14 px-2 py-1 text-center font-black text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {masterCopyPage
                    ? t(
                        `Master Mode: 1 A4 page with ${cardsPerPage} blank card(s) ready for school copier.`,
                        `原紙モード：番号空欄のカードが${cardsPerPage}枚並んだA4用紙を1ページ印刷します。`
                      )
                    : t(
                        `${cards.length} student cards across ${pages.length} A4 page(s) (${cardsPerPage}/page).`,
                        `児童${cards.length}人分 → A4用紙 ${pages.length}枚（1ページあたり${cardsPerPage}枚）`
                      )}
                </p>
              </div>

              {/* Col 2: Class Name, Attendance Numbers & Rounds per Card */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {t('Class Name & Rounds', '学年・組 ＆ 回数')}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    placeholder="3年1組"
                    className="w-28 px-2.5 py-1.5 font-black text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />

                  {/* Rounds per Card */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-1">
                    {([1, 2, 3, 4] as const).map((r) => {
                      const disabled =
                        (layoutMode === 'slips_4' && r > 1) ||
                        (layoutMode === 'slips_2' && r > 2);
                      const isActive = effectiveRounds === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            soundEffects.playTick();
                            setRoundsPerCard(r);
                          }}
                          className={`flex-1 py-1 rounded-md text-[11px] font-black transition-all ${
                            disabled
                              ? 'opacity-35 cursor-not-allowed text-slate-400'
                              : isActive
                                ? 'bg-rose-500 text-white shadow-xs cursor-pointer'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer'
                          }`}
                        >
                          {r}{t('R', '回')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  <input
                    type="checkbox"
                    checked={autoNumberAttendance && !masterCopyPage}
                    disabled={masterCopyPage}
                    onChange={(e) => setAutoNumberAttendance(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
                  />
                  <span>
                    {t('Auto-assign Attendance #1 to #N', '出席番号を1番〜連番で自動印字')}
                  </span>
                </label>
              </div>

              {/* Col 3: Notation, Ink Theme & Elements */}
              <div className="flex flex-col gap-2">
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  {t('Notation, Print Ink & Guides', '表記・印刷インク・補助パーツ')}
                </label>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* Ruby vs Hiragana */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setJapaneseNotation('ruby');
                      }}
                      className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-black transition cursor-pointer ${
                        japaneseNotation === 'ruby'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t('Ruby', '漢字+ふり')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setJapaneseNotation('hiragana');
                      }}
                      className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-black transition cursor-pointer ${
                        japaneseNotation === 'hiragana'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t('Hiragana', 'ひらがな')}
                    </button>
                  </div>

                  {/* Color vs Copier B&W */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setInkTheme('color');
                      }}
                      className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-black transition cursor-pointer ${
                        inkTheme === 'color'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t('Color', 'カラー')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTick();
                        setInkTheme('bw');
                      }}
                      className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-black transition cursor-pointer ${
                        inkTheme === 'bw'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t('Copier B&W', '白黒コピー')}
                    </button>
                  </div>
                </div>

                {/* Element Checkboxes */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTallyBox}
                      onChange={(e) => setShowTallyBox(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-orange-500"
                    />
                    <span className="truncate">{t('◯/△/× Tally Box', '◯/△/× 数える欄')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHandGuide}
                      onChange={(e) => setShowHandGuide(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-orange-500"
                    />
                    <span className="truncate">{t('RPS Hand Guide', 'グー・チョキ・パー絵')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTextbookBadge}
                      onChange={(e) => setShowTextbookBadge(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-orange-500"
                    />
                    <span className="truncate">{t("Let's Play ② Badge", "Let's Play ②バッジ")}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSelfCheck}
                      disabled={layoutMode !== 'full'}
                      onChange={(e) => setShowSelfCheck(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-orange-500 disabled:opacity-40"
                    />
                    <span className="truncate">{t('Self-Check Bar', 'ふりかえり欄')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 2: Dialogue Prompts & Target Language */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} className="text-sky-600 dark:text-sky-400" />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {t('Target English Dialogue Prompt (Pair Talk before Janken)', 'ペア対話フレーズ・単元プリセット')}
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showDialogueBox}
                    onChange={(e) => setShowDialogueBox(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                  <span>{t('Show Dialogue Box on Worksheet', 'ワークシートにセリフ欄を表示')}</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {DIALOGUE_PRESET_ORDER.map((id) => {
                  const p = DIALOGUE_PRESETS[id];
                  const isSelected = dialoguePresetId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!showDialogueBox}
                      onClick={() => {
                        soundEffects.playTick();
                        setDialoguePresetId(id);
                      }}
                      className={`p-2 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-1 min-w-0 ${
                        !showDialogueBox
                          ? 'opacity-45 cursor-not-allowed border-slate-200 dark:border-slate-800'
                          : isSelected
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 shadow-xs cursor-pointer'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-sky-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black text-sky-700 dark:text-sky-400 truncate">
                          {p.unitTag}
                        </span>
                        {isSelected && showDialogueBox && (
                          <Check size={12} className="text-sky-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs font-black truncate">
                        {language === 'ja' ? p.badgeJa : p.badgeEn}
                      </div>
                    </button>
                  );
                })}
              </div>

              {showDialogueBox && dialoguePresetId === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 mb-1">
                      {t('Speaker A Line', '話し手 A の英語')}
                    </label>
                    <input
                      type="text"
                      value={customLineA}
                      onChange={(e) => setCustomLineA(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 mb-1">
                      {t('Speaker B Line', '話し手 B の英語')}
                    </label>
                    <input
                      type="text"
                      value={customLineB}
                      onChange={(e) => setCustomLineB(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 mb-1">
                      {t('Japanese Direction Hint', '日本語ヒント')}
                    </label>
                    <input
                      type="text"
                      value={customHintJa}
                      onChange={(e) => setCustomHintJa(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Quick Preview of SVG assets & Print Tip */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                <div className="flex items-center gap-2">
                  <Info size={15} className="text-orange-500 shrink-0" />
                  <span>
                    {t(
                      'Print Tip: Set Paper Size to "A4" and Margins to "Default" or "Minimum". Turn on "Background graphics" in print dialog for textbook colors.',
                      '印刷のコツ：用紙サイズ「A4」、余白「デフォルト」または「最小」、カラー印刷時は「背景のグラフィック」をONにすると教科書風のデザインそのままに印刷されます。'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-80">
                  <RockHandSvg inkTheme={inkTheme} className="w-5 h-5" />
                  <ScissorsHandSvg inkTheme={inkTheme} className="w-5 h-5" />
                  <PaperHandSvg inkTheme={inkTheme} className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TOOLBAR & STAGE */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-600 dark:text-slate-300 px-1 flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap">
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles size={14} className="text-orange-500" />
                {t('Preview:', 'プレビュー:')} {pages.length} {t('A4 Pages', '枚(A4)')} ({cards.length} {t('Student Cards', '人分')})
              </span>
              <span className="text-slate-400 dark:text-slate-600">|</span>
              <button
                type="button"
                onClick={() => setViewMode('SINGLE')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                  viewMode === 'SINGLE'
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText size={14} />
                <span>{t('Single A4 Page', '1ページずつ確認')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                  viewMode === 'GRID'
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <LayoutGrid size={14} />
                <span>{t('All Pages Grid', '全ページ一覧')}</span>
              </button>
            </div>

            {viewMode === 'SINGLE' && (
              <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                <button
                  type="button"
                  onClick={() => setCurrentPreviewPage((i) => Math.max(0, i - 1))}
                  disabled={safePageIndex === 0}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-mono whitespace-nowrap">
                  {safePageIndex + 1} / {pages.length}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPreviewPage((i) => Math.min(pages.length - 1, i + 1))}
                  disabled={safePageIndex >= pages.length - 1}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Single Page Preview */}
          {viewMode === 'SINGLE' && activePage && (
            <div
              ref={previewStageRef}
              className="w-full flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-200 dark:bg-slate-950 rounded-3xl shadow-inner overflow-hidden"
            >
              <div
                className="relative shrink-0"
                style={{
                  width: `${Math.round(sheetWidthPx * previewScale)}px`,
                  height: `${Math.round(sheetHeightPx * previewScale)}px`
                }}
              >
                <div
                  className="origin-top-left"
                  style={{
                    width: `${sheetWidthPx}px`,
                    height: `${sheetHeightPx}px`,
                    transform: `scale(${previewScale})`
                  }}
                >
                  <JankenWorksheetPage
                    page={activePage}
                    totalPages={pages.length}
                    totalCards={cards.length}
                    options={options}
                    isLastPage={safePageIndex === pages.length - 1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Grid Preview of All A4 Pages */}
          {viewMode === 'GRID' && (
            <div
              className={`grid gap-3 p-4 bg-slate-200 dark:bg-slate-950 rounded-3xl shadow-inner max-h-[680px] overflow-y-auto ${
                orientation === 'landscape'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              }`}
            >
              {pages.map((p) => {
                const validCards = p.cards.filter((c): c is NonNullable<typeof c> => c !== null);
                const firstNum = validCards[0]?.studentNumber || 0;
                const lastNum = validCards[validCards.length - 1]?.studentNumber || 0;
                const numSummary =
                  firstNum > 0
                    ? validCards.length > 1
                      ? `#${firstNum} 〜 #${lastNum}`
                      : `#${firstNum}`
                    : masterCopyPage
                      ? t('Master Page', 'コピー原紙')
                      : t('Unnumbered', '番号空欄');

                return (
                  <button
                    key={p.pageIndex}
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setCurrentPreviewPage(p.pageIndex);
                      setViewMode('SINGLE');
                    }}
                    className={`bg-white rounded-xl p-3 shadow-md hover:shadow-xl transition-all cursor-pointer border-2 flex flex-col justify-between text-left group ${
                      orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'
                    } ${
                      safePageIndex === p.pageIndex
                        ? 'border-orange-500 ring-2 ring-orange-300'
                        : 'border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-black border-b border-slate-200 pb-1">
                      <span className="text-slate-900">
                        A4 #{p.pageIndex + 1}
                      </span>
                      <span className="text-orange-600 font-bold">{numSummary}</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2">
                      <div className="flex items-center gap-1.5">
                        <StarburstRoundBadge
                          roundNumber={1}
                          hiraganaOnly={japaneseNotation === 'hiragana'}
                          inkTheme={inkTheme}
                          className="w-10 h-10 group-hover:scale-110 transition-transform"
                        />
                        <div className="grid grid-cols-5 gap-0.5 w-16 h-8 border border-sky-500 p-0.5 bg-sky-50/40">
                          {Array.from({ length: 10 }, (_, idx) => (
                            <div key={idx} className="border border-sky-300 bg-white text-[5px] font-bold text-slate-500 pl-0.5 leading-none">
                              {idx + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-600">
                        {cardsPerPage} {t(cardsPerPage === 1 ? 'Sheet' : 'Slips', '枚')} · {effectiveRounds} {t('Round(s)', '回戦')}
                      </span>
                    </div>

                    <div className="text-[9px] font-bold text-slate-500 truncate border-t border-slate-100 pt-1">
                      {classNameInput || 'Class'} · {DIALOGUE_PRESETS[dialoguePresetId].badgeEn}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic @page orientation rule for browser print */}
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation};
            margin: 6mm 8mm;
          }
        }
      `}</style>

      {/* =========================================================================
          PRINT-ONLY WORKSPACE (Rendered strictly when window.print() is executed)
          ========================================================================= */}
      <div className="hidden print:block w-full">
        {pages.map((p, idx) => (
          <JankenWorksheetPage
            key={`print-page-${p.pageIndex}`}
            page={p}
            totalPages={pages.length}
            totalCards={cards.length}
            options={options}
            isLastPage={idx === pages.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
