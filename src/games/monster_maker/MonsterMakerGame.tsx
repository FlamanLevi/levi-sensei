import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Sparkles,
  Shuffle,
  Eye,
  LayoutGrid,
  FileText,
  Tv,
  Check,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Volume2,
  Dices,
  RefreshCw,
  Info
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { GeneratorOptions, ShapeId, BodyPartId, MonsterWorksheetData, WorksheetOrientation, JapaneseNotation, CountMode } from './types';
import { SHAPES_DATA, ALL_SHAPE_IDS } from './shapes';
import { BODY_PARTS_DATA, CORE_BODY_PART_IDS, ALL_BODY_PART_IDS } from './bodyParts';
import { generateWorksheetDeck, generateSingleDemoMonster } from './generator';
import { WorksheetPage } from './WorksheetPage';

interface MonsterMakerGameProps {
  onExit?: () => void;
}

export const MonsterMakerGame: React.FC<MonsterMakerGameProps> = () => {
  const { t, language } = useLanguage();
  const { activeClassId } = useClassroom();

  // Primary active mode: 'PRINT' or 'TV_DEMO'
  const [activeTab, setActiveTab] = useState<'PRINT' | 'TV_DEMO'>('PRINT');
  const [orientation, setOrientation] = useState<WorksheetOrientation>('landscape');
  const [japaneseNotation, setJapaneseNotation] = useState<JapaneseNotation>('ruby');
  const [countMode, setCountMode] = useState<CountMode>('studentChoice');

  // Generator Options State
  const [studentCount, setStudentCount] = useState<number>(30);
  const [classNameInput, setClassNameInput] = useState<string>(() => {
    if (activeClassId) {
      return `${activeClassId.replace('-', '年')}組`;
    }
    return '2年1組';
  });
  const [autoNumberAttendance, setAutoNumberAttendance] = useState<boolean>(true);
  const [evenArmsLegs, setEvenArmsLegs] = useState<boolean>(true);
  const [includeSpeechCard, setIncludeSpeechCard] = useState<boolean>(true);
  const [enabledShapes, setEnabledShapes] = useState<ShapeId[]>(ALL_SHAPE_IDS);
  const [enabledBodyParts, setEnabledBodyParts] = useState<BodyPartId[]>(CORE_BODY_PART_IDS);

  // Filter Drawer / Config Panel expansion
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Deck State
  const [sheets, setSheets] = useState<MonsterWorksheetData[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'SINGLE' | 'GRID'>('SINGLE');

  // Live TV Demo Mode State
  const [demoMonster, setDemoMonster] = useState<MonsterWorksheetData>(() =>
    generateSingleDemoMonster(enabledShapes, enabledBodyParts, evenArmsLegs)
  );
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // Initial generation
  useEffect(() => {
    regenerateDeck();
  }, [
    studentCount,
    classNameInput,
    autoNumberAttendance,
    evenArmsLegs,
    enabledShapes,
    enabledBodyParts
  ]);

  const regenerateDeck = () => {
    const options: GeneratorOptions = {
      studentCount,
      className: classNameInput,
      autoNumberAttendance,
      startAttendanceNumber: 1,
      evenArmsLegs,
      enabledShapes,
      enabledBodyParts,
      includeSpeechCard
    };
    const newDeck = generateWorksheetDeck(options);
    setSheets(newDeck);
    setCurrentPreviewIndex(0);
  };

  const handleShuffleClick = () => {
    soundEffects.playDiceRattle();
    setTimeout(() => {
      soundEffects.playDiceLand();
      regenerateDeck();
    }, 180);
  };

  const handlePrintClick = () => {
    soundEffects.playCardFlip();
    window.print();
  };

  // Toggle shapes in options
  const toggleShape = (id: ShapeId) => {
    soundEffects.playTick();
    setEnabledShapes((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  };

  // Toggle body parts in options
  const toggleBodyPart = (id: BodyPartId) => {
    soundEffects.playTick();
    setEnabledBodyParts((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // Keep at least two
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  };

  // Trigger TV Demo Roll
  const handleRollDemo = () => {
    if (isRolling) return;
    setIsRolling(true);
    soundEffects.playDiceRattle();

    let steps = 0;
    const interval = setInterval(() => {
      soundEffects.playTick();
      setDemoMonster(generateSingleDemoMonster(enabledShapes, enabledBodyParts, evenArmsLegs));
      steps++;
      if (steps > 8) {
        clearInterval(interval);
        setIsRolling(false);
        soundEffects.playDiceLand();
        setTimeout(() => soundEffects.playReveal(), 120);
      }
    }, 120);
  };

  // Web Speech Pronunciation helper
  const speakText = (text: string) => {
    soundEffects.playTick();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const activeSheet = sheets[currentPreviewIndex] || sheets[0];

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-start min-h-full">
      {/* =========================================================================
          SCREEN-ONLY INTERFACE (Hidden during printing)
          ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 print:hidden flex flex-col gap-3">
        {/* Top Control Bar: Mode Tabs & Primary Actions */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-md flex flex-wrap items-center justify-between gap-2.5">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                soundEffects.playTick();
                setActiveTab('PRINT');
              }}
              className={`px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'PRINT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Printer size={16} />
              <span>{t('Worksheet Studio', 'ワークシート印刷')}</span>
              <span className="bg-indigo-700 text-indigo-100 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                A4
              </span>
            </button>

            <button
              onClick={() => {
                soundEffects.playTick();
                setActiveTab('TV_DEMO');
              }}
              className={`px-3 py-1.5 rounded-lg font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'TV_DEMO'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tv size={16} />
              <span>{t('Classroom TV Roller', '教室TVデモ・サイコロ')}</span>
            </button>
          </div>

          {/* Orientation Toggle: Landscape vs Portrait */}
          {activeTab === 'PRINT' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => {
                  soundEffects.playTick();
                  setOrientation('landscape');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Landscape A4: Left artwork, Right full speech"
              >
                <span>📑</span>
                <span>{t('Landscape (A4横)', '横向き (おすすめ)')}</span>
              </button>

              <button
                onClick={() => {
                  soundEffects.playTick();
                  setOrientation('portrait');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Portrait A4"
              >
                <span>📄</span>
                <span>{t('Portrait (A4縦)', '縦向き')}</span>
              </button>
            </div>
          )}

          {/* Part Count Mode Toggle: Free Choice (Blank) vs Random Pre-filled */}
          {activeTab === 'PRINT' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => {
                  soundEffects.playTick();
                  setCountMode('studentChoice');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  countMode === 'studentChoice'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Students draw whatever number of parts they want and write their own numbers"
              >
                <span>✏️</span>
                <span>{t('Student Choice (Blank)', 'じぶんで決める (おすすめ)')}</span>
              </button>

              <button
                onClick={() => {
                  soundEffects.playTick();
                  setCountMode('random');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  countMode === 'random'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Random count pre-printed on each sheet"
              >
                <span>🎲</span>
                <span>{t('Random Pre-filled', 'おまかせ (数字入り)')}</span>
              </button>
            </div>
          )}

          {/* Action Button Cluster */}
          <div className="flex items-center gap-2">
            {activeTab === 'PRINT' && (
              <>
                <button
                  onClick={() => setIsConfigOpen((v) => !v)}
                  className={`px-3 py-2 rounded-xl border font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isConfigOpen
                      ? 'bg-slate-800 text-white border-slate-700'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <Sliders size={15} />
                  <span>{t('Options & Parts', '印刷設定・パーツ')}</span>
                </button>

                <button
                  onClick={handleShuffleClick}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Shuffle numbers and shapes for all students"
                >
                  <Shuffle size={15} />
                  <span>{t('Reroll All', '全シート再生成')}</span>
                </button>

                <button
                  onClick={handlePrintClick}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 animate-pulse"
                >
                  <Printer size={18} />
                  <span>{t('Print Worksheets', 'A4印刷する')}</span>
                  <span className="bg-emerald-700/60 px-2 py-0.5 rounded text-xs">
                    {sheets.length} {t('Sheets', '枚')}
                  </span>
                </button>
              </>
            )}

            {activeTab === 'TV_DEMO' && (
              <button
                onClick={handleRollDemo}
                disabled={isRolling}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
              >
                <Dices size={18} className={isRolling ? 'animate-spin' : ''} />
                <span>{isRolling ? t('Rolling...', '回転中...') : t('ROLL MONSTER!', 'サイコロをふる！')}</span>
              </button>
            )}
          </div>
        </div>

        {/* PRINT MODE CONFIGURATION DRAWER */}
        {activeTab === 'PRINT' && isConfigOpen && (
          <div className="bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Row 1: Student Count & Class Preset */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t('Number of Students / Sheets', '印刷枚数（生徒の人数）')}
                </label>
                <div className="flex items-center gap-1.5">
                  {[10, 20, 25, 30, 32, 35].map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        soundEffects.playTick();
                        setStudentCount(count);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        studentCount === count
                          ? 'bg-indigo-600 text-white'
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
                    onChange={(e) => setStudentCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 text-center font-black text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {t('Class Name on Worksheet', '学年・組の表記')}
                </label>
                <input
                  type="text"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  placeholder="2年1組"
                  className="w-full px-3 py-1.5 font-black text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col justify-end gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoNumberAttendance}
                    onChange={(e) => setAutoNumberAttendance(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t('Auto-assign Attendance #1 to #N', '出席番号を1番〜連番で印字')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={evenArmsLegs}
                    onChange={(e) => setEvenArmsLegs(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{t('Even numbers for arms & legs (2, 4, 6, 8)', 'うで・足を偶数にする（左右対称）')}</span>
                </label>
              </div>

              {/* Japanese Notation Switcher */}
              <div className="col-span-full border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
                <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {t('Japanese Ruby & Kanji Standards', '日本語のふりがな・表記設定')}
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => {
                      soundEffects.playTick();
                      setJapaneseNotation('ruby');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      japaneseNotation === 'ruby'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span>{t('MEXT Kanji + Furigana (漢字＋ふりがな)', '漢字＋ふりがな (推奨)')}</span>
                  </button>
                  <button
                    onClick={() => {
                      soundEffects.playTick();
                      setJapaneseNotation('hiragana');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      japaneseNotation === 'hiragana'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span>{t('All Hiragana (ひらがなのみ)', 'ひらがなのみ')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Shapes Pool Selection */}
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('Enabled Body Shapes (Randomly Distributed)', '使用するからだの形（生徒にランダム配分）')}
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_SHAPE_IDS.map((id) => {
                  const shape = SHAPES_DATA[id];
                  const isEnabled = enabledShapes.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleShape(id)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        isEnabled
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400 opacity-60'
                      }`}
                    >
                      <span>{shape.icon}</span>
                      <span>
                        {shape.nameEn} ({shape.nameJa})
                      </span>
                      {isEnabled && <Check size={13} className="text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Body Parts Selection */}
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                {t('Enabled Body Parts Checklist', 'モンスターのパーツ指定')}
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_BODY_PART_IDS.map((id) => {
                  const part = BODY_PARTS_DATA[id];
                  const isEnabled = enabledBodyParts.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleBodyPart(id)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        isEnabled
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400 opacity-60'
                      }`}
                    >
                      <span>{part.icon}</span>
                      <span>
                        {part.namePlural} ({part.jaName})
                      </span>
                      {isEnabled && <Check size={13} className="text-emerald-600 dark:text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Print Settings Tip */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Info size={16} className="text-indigo-500 shrink-0" />
              <span>
                {t(
                  'Printing Tip: In the browser print dialog, select "A4" paper and set margins to "None" or "Default" for exact 1-sheet-per-student layout.',
                  '印刷のコツ: 印刷プレビュー画面で「用紙サイズ: A4」「余白: なし または 最小」にすると、ぴったり1枚ずつ印刷されます。'
                )}
              </span>
            </div>
          </div>
        )}

        {/* PRINT MODE: VIEWER & PREVIEWS */}
        {activeTab === 'PRINT' && (
          <div className="flex flex-col gap-3">
            {/* View Mode Bar */}
            <div className="flex items-center justify-between text-xs font-black text-slate-600 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span>
                  {t('Previewing:', 'プレビュー表示:')} {sheets.length} {t('Worksheets Ready', '枚のシート')}
                </span>
                <span className="text-slate-400 dark:text-slate-600">|</span>
                <button
                  onClick={() => setViewMode('SINGLE')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                    viewMode === 'SINGLE'
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <FileText size={14} />
                  <span>{t('Single Sheet', '1枚ずつ確認')}</span>
                </button>
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                    viewMode === 'GRID'
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>{t('All Sheets Grid', '全シート一覧')}</span>
                </button>
              </div>

              {viewMode === 'SINGLE' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPreviewIndex((i) => Math.max(0, i - 1))}
                    disabled={currentPreviewIndex === 0}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-mono">
                    {currentPreviewIndex + 1} / {sheets.length}
                  </span>
                  <button
                    onClick={() => setCurrentPreviewIndex((i) => Math.min(sheets.length - 1, i + 1))}
                    disabled={currentPreviewIndex === sheets.length - 1}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Single Sheet View */}
            {viewMode === 'SINGLE' && activeSheet && (
              <div className="flex flex-col items-center justify-center p-2 sm:p-6 bg-slate-200 dark:bg-slate-950 rounded-3xl shadow-inner overflow-x-auto">
                <div className={`transform origin-top transition-transform ${
                  orientation === 'landscape'
                    ? 'scale-[0.65] sm:scale-[0.85] md:scale-95 lg:scale-100'
                    : 'scale-[0.85] sm:scale-100'
                }`}>
                  <WorksheetPage
                    sheet={activeSheet}
                    index={currentPreviewIndex}
                    totalSheets={sheets.length}
                    includeSpeechCard={includeSpeechCard}
                    orientation={orientation}
                    japaneseNotation={japaneseNotation}
                    countMode={countMode}
                  />
                </div>
              </div>
            )}

            {/* Grid View of All Sheets */}
            {viewMode === 'GRID' && (
              <div className={`grid gap-3 p-4 bg-slate-200 dark:bg-slate-950 rounded-3xl shadow-inner max-h-[750px] overflow-y-auto ${
                orientation === 'landscape'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
              }`}>
                {sheets.map((sheet, idx) => (
                  <div
                    key={sheet.id}
                    onClick={() => {
                      setCurrentPreviewIndex(idx);
                      setViewMode('SINGLE');
                    }}
                    className={`bg-white rounded-xl p-3 shadow-md hover:shadow-xl transition-all cursor-pointer border-2 flex flex-col justify-between group ${
                      orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'
                    } ${
                      currentPreviewIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-black border-b border-slate-200 pb-1">
                      <span className="text-slate-900">
                        {sheet.studentNumber > 0 ? `#${sheet.studentNumber}` : `Sheet ${idx + 1}`}
                      </span>
                      <span className="text-amber-600 font-bold">
                        {sheet.shape.icon} {sheet.shape.nameEn}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-2">
                      {sheet.shape.renderSvg({
                        className: 'w-20 h-20 group-hover:scale-110 transition-transform',
                        strokeWidth: 4,
                        strokeColor: '#1e293b'
                      })}
                    </div>

                    <div className="text-[9px] font-bold text-slate-600 line-clamp-2 border-t border-slate-100 pt-1">
                      {sheet.parts.map((p) => `${p.labelEn}`).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TV DEMONSTRATION & BLACKBOARD ROLLER MODE
            ========================================================================= */}
        {activeTab === 'TV_DEMO' && (
          <div className="w-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-amber-500/80 rounded-3xl p-4 sm:p-8 shadow-2xl text-white min-h-[640px]">
            {/* Header Stage Banner */}
            <div className="text-center mb-6">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-black px-4 py-1 rounded-full uppercase tracking-widest">
                Front TV Classroom Demonstration
              </span>
              <h2 className="text-3xl sm:text-5xl font-black mt-2 text-amber-400 drop-shadow-md">
                Monster Creator Lab
              </h2>
              <p className="text-slate-300 text-sm sm:text-base font-bold mt-1">
                黒板でお手本を描いてみよう！(Draw this demonstration monster on the blackboard!)
              </p>
            </div>

            {/* Giant Center Stage */}
            <div className="w-full max-w-4xl bg-slate-800/80 border-2 border-amber-400/50 rounded-3xl p-6 sm:p-8 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left Column: Huge Body Shape */}
              <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-6 shadow-xl aspect-square border-4 border-slate-900 relative">
                <div className="absolute top-3 left-4 bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md shadow-xs">
                  ★ BODY SHAPE: {demoMonster.shape.nameEn.toUpperCase()}
                </div>
                <div className="w-full h-full flex items-center justify-center p-4">
                  {demoMonster.shape.renderSvg({
                    className: 'w-full h-full max-h-[220px]',
                    strokeWidth: 5,
                    strokeColor: '#0f172a'
                  })}
                </div>
                <button
                  onClick={() =>
                    speakText(`It has ${demoMonster.shape.article} ${demoMonster.shape.nameEn} body.`)
                  }
                  className="mt-2 text-xs font-black text-slate-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Volume2 size={15} />
                  <span>&ldquo;It has {demoMonster.shape.article} {demoMonster.shape.nameEn.toLowerCase()} body.&rdquo;</span>
                </button>
              </div>

              {/* Right Column: Mission Requirements & Parts */}
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <span>📋 Target Body Parts / かおと体のパーツ</span>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {demoMonster.parts.map((p) => (
                    <div
                      key={p.partId}
                      onClick={() => speakText(p.labelEn)}
                      className="bg-slate-700/80 hover:bg-slate-700 border-2 border-slate-600 rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer active:scale-95 group shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{p.icon}</span>
                        <div>
                          <div className="font-black text-white text-sm sm:text-base leading-tight group-hover:text-amber-300">
                            {p.labelEn}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {p.labelJa}
                          </div>
                        </div>
                      </div>
                      <Volume2 size={16} className="text-slate-400 group-hover:text-amber-400" />
                    </div>
                  ))}
                </div>

                {/* Speech Presentation Banner */}
                <div className="mt-2 bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 text-xs sm:text-sm text-amber-200">
                  <div className="font-black text-amber-300 mb-1 flex items-center gap-1.5">
                    <span>🎙️ Speech Pattern:</span>
                  </div>
                  <p className="font-mono text-white text-xs leading-relaxed">
                    &ldquo;This is my monster. It has {demoMonster.shape.article} {demoMonster.shape.nameEn.toLowerCase()} body,{' '}
                    {demoMonster.parts.slice(0, 3).map((p) => p.labelEn).join(', ')}...&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Giant Roll Button */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleRollDemo}
                disabled={isRolling}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-xl flex items-center gap-3 shadow-2xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Dices size={28} className={isRolling ? 'animate-spin' : ''} />
                <span>{isRolling ? t('ROLLING...', 'シャッフル中...') : t('ROLL ANOTHER MONSTER!', '次のモンスターを呼ぶ！')}</span>
              </button>
            </div>
          </div>
        )}
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
        {sheets.map((sheet, index) => (
          <WorksheetPage
            key={sheet.id}
            sheet={sheet}
            index={index}
            totalSheets={sheets.length}
            includeSpeechCard={includeSpeechCard}
            orientation={orientation}
            japaneseNotation={japaneseNotation}
            countMode={countMode}
          />
        ))}
      </div>
    </div>
  );
};
