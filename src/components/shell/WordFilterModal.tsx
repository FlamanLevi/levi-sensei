import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useClassroom } from '../../context/ClassroomContext';
import { useVocabulary } from '../../context/VocabularyContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { resolveCardImage, getNumberValue, getNumberTheme } from '../../utils/cardUtils';
import { CategoryKey } from '@data/types';
import { MarbleGameModal } from '../curriculum/MarbleGameModal';
import { UnitAimsModal } from '../curriculum/UnitAimsModal';
import { 
  Check, 
  X, 
  Dice5,
  Target,
  Sparkles, 
  RotateCcw, 
  Volume2, 
  Sun, 
  Moon, 
  CheckCheck, 
  Layers, 
  FilterX, 
  AlertCircle,
  BookOpen,
  LayoutGrid,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';

const CATEGORIES: { key: CategoryKey; labelEn: string; labelJa: string; emoji: string }[] = [
  { key: '01_action', labelEn: 'Actions', labelJa: '動作・アクション', emoji: '🏃' },
  { key: '02_state', labelEn: 'Feelings', labelJa: 'きもち・状態', emoji: '😊' },
  { key: '03_fooddrink', labelEn: 'Food & Drink', labelJa: '食べ物・飲み物', emoji: '🍎' },
  { key: '04_number', labelEn: 'Numbers', labelJa: '数字・数', emoji: '🔢' },
  { key: '05_schoollife', labelEn: 'School', labelJa: '学校・文房具', emoji: '🎒' },
  { key: '06_facility', labelEn: 'Town & Jobs', labelJa: '町・仕事・施設', emoji: '🏥' },
  { key: '07_dailylife', labelEn: 'Daily Life', labelJa: '日常生活', emoji: '⏰' },
  { key: '08_sports', labelEn: 'Sports', labelJa: 'スポーツ', emoji: '⚽' },
  { key: '09_color_shape', labelEn: 'Colors & Shapes', labelJa: '色・形', emoji: '🎨' },
  { key: '10_calendar_time', labelEn: 'Days & Months', labelJa: '月・曜日・時間', emoji: '📅' },
  { key: '11_animals', labelEn: 'Animals', labelJa: '動物', emoji: '🦁' },
  { key: '12_nature', labelEn: 'Nature', labelJa: '自然・天気', emoji: '🌈' },
  { key: '13_position', labelEn: 'Directions', labelJa: '位置・方向', emoji: '🧭' },
  { key: '14_body_family', labelEn: 'Body & Family', labelJa: '体・家族', emoji: '👀' },
  { key: '15_festalday', labelEn: 'Holidays', labelJa: '季節・行事', emoji: '🎃' },
  { key: '16_alphabet', labelEn: 'Alphabet', labelJa: 'アルファベット', emoji: '🔤' },
];

function parseUnitChip(unitStr: string): { unitNum: string; title: string; full: string } {
  const match = unitStr.match(/^Unit\s+(\d+):\s*(.+)/i);
  if (!match) {
    return { unitNum: '', title: unitStr, full: unitStr };
  }
  const unitNum = `U${match[1]}`;
  let title = match[2].trim();
  const parenMatch = title.match(/^([^(]+)\s*\((.+)\)$/);
  if (parenMatch) {
    title = parenMatch[1].trim();
  }
  return { unitNum, title, full: unitStr };
}

export const WordFilterModal: React.FC = () => {
  const { 
    activeGrade, 
    activeUnit, 
    setActiveUnit,
    activeCategory, 
    setActiveCategory,
    selectedUnits, 
    setSelectedUnits,
    clearSelectedUnits,
    theme, 
    toggleTheme 
  } = useClassroom();
  
  const { 
    availableUnits,
    gradeWords,
    rawFilteredWords, 
    filteredWords, 
    excludedWordIds, 
    toggleWordExcluded, 
    includeAllWords, 
    excludeAllWords, 
    selectRandomWords, 
    selectSingularWordsOnly,
    selectPluralWordsOnly,
    selectUppercaseOnly,
    selectLowercaseOnly,
    selectLetterRange,
    isWordExcluded, 
    isWordFilterModalOpen, 
    closeWordFilterModal 
  } = useVocabulary();

  const { playPop, playWordAudio } = useAudio();
  const { t, language, setLanguage } = useLanguage();

  const [studioMode, setStudioMode] = useState<'UNIT' | 'THEME'>('UNIT');
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [isMarbleModalOpen, setIsMarbleModalOpen] = useState(false);
  const [isUnitAimsModalOpen, setIsUnitAimsModalOpen] = useState(false);

  const isUnit6 = useMemo(() => {
    return activeUnit === 'Unit 6: Alphabet' || activeUnit.startsWith('Unit 6:');
  }, [activeUnit]);

  // Auto-switch to THEME mode if active grade has no curriculum units (G1, G2)
  React.useEffect(() => {
    if (availableUnits.length === 0 && studioMode === 'UNIT') {
      setStudioMode('THEME');
    }
  }, [availableUnits, studioMode]);

  // Filter raw words by search query
  const displayedWords = useMemo(() => {
    if (!cardSearchQuery.trim()) return rawFilteredWords;
    const q = cardSearchQuery.toLowerCase().trim();
    return rawFilteredWords.filter(w => 
      w.english.toLowerCase().includes(q) ||
      (w.ja_kanji && w.ja_kanji.includes(q)) ||
      (w.ja_hiragana && w.ja_hiragana.includes(q)) ||
      (w.en_katakana && w.en_katakana.includes(q))
    );
  }, [rawFilteredWords, cardSearchQuery]);

  // Check for presence of singular and plural words
  const hasPluralWords = useMemo(() => rawFilteredWords.some(w => w.is_plural), [rawFilteredWords]);
  const hasSingularWords = useMemo(() => rawFilteredWords.some(w => !w.is_plural), [rawFilteredWords]);

  // Check for alphabet letters
  const hasAlphabet = useMemo(() => rawFilteredWords.some(w => w.category === '16_alphabet' || (w.english.length === 1 && /^[a-zA-Z]$/.test(w.english))), [rawFilteredWords]);
  const hasUppercase = useMemo(() => rawFilteredWords.some(w => (w.category === '16_alphabet' || (w.english.length === 1 && /^[a-zA-Z]$/.test(w.english))) && w.english === w.english.toUpperCase()), [rawFilteredWords]);
  const hasLowercase = useMemo(() => rawFilteredWords.some(w => (w.category === '16_alphabet' || (w.english.length === 1 && /^[a-zA-Z]$/.test(w.english))) && w.english === w.english.toLowerCase()), [rawFilteredWords]);

  if (!isWordFilterModalOpen) return null;

  const totalCandidates = rawFilteredWords.length;
  const activeCount = filteredWords.length;

  // Unit checklist handlers
  const isUnitChecked = (unit: string) => {
    if (selectedUnits && selectedUnits.length > 0) {
      return selectedUnits.includes(unit);
    }
    return activeUnit === unit;
  };

  const handleToggleUnit = (unit: string) => {
    playPop();
    setActiveCategory('ALL');

    if (selectedUnits.length > 0) {
      // Already bundling: toggle this unit
      if (selectedUnits.includes(unit)) {
        const next = selectedUnits.filter(u => u !== unit);
        if (next.length === 0) {
          clearSelectedUnits();
          setActiveUnit('ALL');
        } else if (next.length === 1) {
          clearSelectedUnits();
          setActiveUnit(next[0]);
        } else {
          setSelectedUnits(next);
        }
      } else {
        setSelectedUnits([...selectedUnits, unit]);
      }
    } else {
      // Currently single unit mode
      if (activeUnit === 'ALL') {
        // From ALL to single unit
        setActiveUnit(unit);
      } else if (activeUnit === unit) {
        // Deselecting current unit -> goes to ALL
        setActiveUnit('ALL');
      } else {
        // Was on Unit A, tapped Unit B -> bundle both!
        setSelectedUnits([activeUnit, unit]);
      }
    }
  };

  const handleSelectOnlyUnit = (unit: string) => {
    playPop();
    clearSelectedUnits();
    setActiveUnit(unit);
    setActiveCategory('ALL');
  };

  const handleSelectAllUnits = () => {
    playPop();
    clearSelectedUnits();
    setActiveUnit('ALL');
    setActiveCategory('ALL');
  };

  const handleThemeClick = (catKey: CategoryKey | 'ALL') => {
    playPop();
    clearSelectedUnits();
    setActiveUnit('ALL');
    setActiveCategory(catKey);
  };

  // Scope summary title
  const scopeSummary = selectedUnits.length > 1
    ? (language === 'ja' ? `${selectedUnits.length}単元バンドル` : `${selectedUnits.length} Units Bundled`)
    : activeUnit !== 'ALL'
    ? activeUnit
    : activeCategory !== 'ALL'
    ? (language === 'ja' 
        ? CATEGORIES.find(c => c.key === activeCategory)?.labelJa || activeCategory
        : CATEGORIES.find(c => c.key === activeCategory)?.labelEn || activeCategory)
    : (language === 'ja' ? `${activeGrade} 全単語` : `All ${activeGrade} Words`);

  return (
  <>
  {createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={closeWordFilterModal}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-6xl w-full shadow-2xl border-2 border-slate-200 dark:border-slate-800 flex flex-col max-h-[94dvh] text-slate-900 dark:text-slate-100 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-3 gap-2 min-h-[44px] shrink-0">
          <div className="min-w-0 flex-1 truncate">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧺</span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                <span>
                  {t(
                    'Lesson Deck Studio',
                    <><ruby>授業<rt>じゅぎょう</rt></ruby>デッキ・<ruby>教材<rt>きょうざい</rt></ruby>スタジオ</>
                  )}
                </span>
              </h3>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                {activeGrade}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              <strong className="text-slate-700 dark:text-slate-300 mr-1.5">{scopeSummary}</strong>
              • {t('Pick your textbook units on the left, then toggle cards on the right.', '左で単元を選び、右で授業に使う単語カードを調整します。')}
            </p>
          </div>

          {/* Right Header Control Cluster (Zero-Shift Invariant §10) */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => {
                playPop();
                setLanguage(language === 'en' ? 'ja' : 'en');
              }}
              title={t('Toggle Language (EN / 日)', '言語切り替え（EN / 日）')}
              className="h-8 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-all flex items-center justify-center cursor-pointer border border-slate-200/50 dark:border-slate-700 whitespace-nowrap"
            >
              {language === 'en' ? '文 EN' : '文 日'}
            </button>

            {/* Sun / Moon Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                playPop();
                toggleTheme();
              }}
              title={t('Toggle Light / Dark Mode', 'ライト / ダークモード切替')}
              className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700"
            >
              {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={() => {
                playPop();
                closeWordFilterModal();
              }}
              title={t('Close', '閉じる')}
              className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Studio Body: Split View (Left: Units/Themes, Right: Word Cards Deck) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
          
          {/* LEFT COLUMN: Curriculum & Units Checklist */}
          <div className="md:w-72 lg:w-80 xl:w-96 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
            
            {/* Mode Switch Tabs: Units vs Themes */}
            <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 mb-2.5 shrink-0 text-xs font-black">
              <button
                type="button"
                onClick={() => { playPop(); setStudioMode('UNIT'); }}
                className={`h-8 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap px-2 ${
                  studioMode === 'UNIT'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen size={14} className="shrink-0" />
                <span className="truncate">{language === 'ja' ? <ruby>教科書単元<rt>きょうかしょたんげん</rt></ruby> : 'Textbook Units'}</span>
              </button>
              <button
                type="button"
                onClick={() => { playPop(); setStudioMode('THEME'); }}
                className={`h-8 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap px-2 ${
                  studioMode === 'THEME'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid size={14} className="shrink-0" />
                <span className="truncate">{language === 'ja' ? <ruby>テーマ・分野<rt>てーま・ぶんや</rt></ruby> : 'Thematic Topics'}</span>
              </button>
            </div>

            {/* Scrollable Unit / Theme List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 max-h-48 md:max-h-none">
              {studioMode === 'UNIT' ? (
                <>
                  {/* Option: All Units */}
                  <div
                    onClick={handleSelectAllUnits}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      activeUnit === 'ALL' && selectedUnits.length === 0
                        ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        activeUnit === 'ALL' && selectedUnits.length === 0
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                      }`}>
                        {activeUnit === 'ALL' && selectedUnits.length === 0 && <Check size={13} />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-xs block truncate">
                          {language === 'ja' ? 'すべての単元（全学年単語）' : 'All Textbook Units'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {gradeWords.length} {language === 'ja' ? '語' : 'words'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Checklist of Individual Units */}
                  {availableUnits.map(unit => {
                    const checked = isUnitChecked(unit);
                    const { unitNum, title } = parseUnitChip(unit);
                    const count = gradeWords.filter(w => w.media_by_grade?.[activeGrade]?.unit === unit).length;

                    return (
                      <div
                        key={unit}
                        onClick={() => handleToggleUnit(unit)}
                        className={`group p-2 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          checked
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            checked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                          }`}>
                            {checked && <Check size={13} />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {unitNum && (
                                <span className={`font-mono text-xs font-black shrink-0 ${
                                  checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                  {unitNum}
                                </span>
                              )}
                              <span className="text-xs font-black truncate max-w-[140px] sm:max-w-[180px]">
                                {title}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold block">
                              {count} {language === 'ja' ? '語' : 'words'}
                            </span>
                          </div>
                        </div>

                        {/* Quick 1-Tap "Only This Unit" button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOnlyUnit(unit);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-1 rounded-lg text-[10px] font-black text-blue-700 dark:text-blue-300 transition-opacity border border-blue-200 dark:border-blue-800 cursor-pointer shrink-0"
                          title={t("Select only this unit", "この単元のみを選択")}
                        >
                          {language === 'ja' ? '単独' : 'Only'}
                        </button>
                      </div>
                    );
                  })}
                </>
              ) : (
                /* Thematic Categories */
                <>
                  <div
                    onClick={() => handleThemeClick('ALL')}
                    className={`p-2.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      activeCategory === 'ALL'
                        ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        activeCategory === 'ALL'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                      }`}>
                        {activeCategory === 'ALL' && <Check size={13} />}
                      </div>
                      <span className="font-black text-xs">
                        {language === 'ja' ? 'すべての分野・カテゴリー' : 'All Thematic Topics'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{gradeWords.length}</span>
                  </div>

                  {CATEGORIES.map(cat => {
                    const count = gradeWords.filter(w => w.category === cat.key).length;
                    const isSelected = activeCategory === cat.key;
                    const catLabel = language === 'ja' ? cat.labelJa : cat.labelEn;

                    return (
                      <div
                        key={cat.key}
                        onClick={() => count > 0 && handleThemeClick(cat.key)}
                        className={`p-2 rounded-2xl border-2 transition-all flex items-center justify-between ${
                          count === 0
                            ? 'opacity-40 border-slate-200/50 dark:border-slate-800 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 shadow-xs cursor-pointer'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{cat.emoji}</span>
                          <span className="text-xs font-black truncate">{catLabel}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Word Cards Deck */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            
            {/* Search & Bulk Curation Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-3 shrink-0 bg-slate-50 dark:bg-slate-800/70 p-2 rounded-2xl border border-slate-200/70 dark:border-slate-800">
              
              {/* Search input */}
              <div className="relative w-full sm:w-44 lg:w-52 shrink-0">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={cardSearchQuery}
                  onChange={e => setCardSearchQuery(e.target.value)}
                  placeholder={language === 'ja' ? '単語を検索 (英語・日本語)...' : 'Search words in deck...'}
                  className="w-full h-8 pl-8 pr-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-nowrap overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => { playPop(); includeAllWords(); }}
                  className="h-8 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <CheckCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>{t('Select All', <><ruby>全選択<rt>ぜんせんたく</rt></ruby></>)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { playPop(); excludeAllWords(); }}
                  className="h-8 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <FilterX size={14} className="text-slate-400 shrink-0" />
                  <span>{t('Clear All', <><ruby>全解除<rt>ぜんかいじょ</rt></ruby></>)}</span>
                </button>

                {totalCandidates >= 5 && (
                  <button
                    type="button"
                    onClick={() => { playPop(); selectRandomWords(5); }}
                    className="h-8 px-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-black transition-all border border-teal-200 dark:border-teal-800 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                    title={t("Random 5 cards (ideal for quick sprint quiz)", "5問クイズ用のランダム5語")}
                  >
                    <Sparkles size={12} className="shrink-0" />
                    <span>{t("Random 5", "5問")}</span>
                  </button>
                )}

                {totalCandidates >= 10 && (
                  <button
                    type="button"
                    onClick={() => { playPop(); selectRandomWords(10); }}
                    className="h-8 px-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-black transition-all border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                    title={t("Random 10 cards (ideal for quick Kahoot or Sprint quiz)", "10問クイズ用のランダム10語")}
                  >
                    <Sparkles size={12} className="shrink-0" />
                    <span>{t("Random 10", "10問")}</span>
                  </button>
                )}

                {totalCandidates >= 15 && (
                  <button
                    type="button"
                    onClick={() => { playPop(); selectRandomWords(15); }}
                    className="h-8 px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-black transition-all border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                    title={t("Random 15 cards", "15問プリセット")}
                  >
                    <Sparkles size={12} className="shrink-0" />
                    <span>{t("Random 15", "15問")}</span>
                  </button>
                )}

                {hasUppercase && hasLowercase && (
                  <>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
                    <button
                      type="button"
                      onClick={() => { playPop(); selectUppercaseOnly(); }}
                      className="h-8 px-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-black transition-all border border-orange-200 dark:border-orange-800 flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      title={t("Select only uppercase letters A-Z", "大文字 (A-Z) のみを選択")}
                    >
                      <span className="font-mono font-black text-xs">A-Z</span>
                      <span>{t("Uppercase", <><ruby>大文字<rt>おおもじ</rt></ruby></>)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playPop(); selectLowercaseOnly(); }}
                      className="h-8 px-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-black transition-all border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      title={t("Select only lowercase letters a-z", "小文字 (a-z) のみを選択")}
                    >
                      <span className="font-mono font-black text-xs">a-z</span>
                      <span>{t("Lowercase", <><ruby>小文字<rt>こもじ</rt></ruby></>)}</span>
                    </button>
                  </>
                )}

                {hasAlphabet && (
                  <>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

                    {/* Textbook Halves: Page 24 (a-m) & Page 25 (n-z) */}
                    <button
                      type="button"
                      onClick={() => { playPop(); selectLetterRange('a', 'm'); }}
                      className="h-8 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-black transition-all border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      title={t("Textbook Page 24: First Half (13 letters)", "教科書24ページ：前半 (13文字)")}
                    >
                      <BookOpen size={12} />
                      <span className="font-mono font-black text-xs">{hasLowercase && !hasUppercase ? 'a-m' : 'A-M'}</span>
                      <span className="text-[10px] opacity-75">(13)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playPop(); selectLetterRange('n', 'z'); }}
                      className="h-8 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-black transition-all border border-amber-200 dark:border-amber-800 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      title={t("Textbook Page 25: Second Half (13 letters)", "教科書25ページ：後半 (13文字)")}
                    >
                      <BookOpen size={12} />
                      <span className="font-mono font-black text-xs">{hasLowercase && !hasUppercase ? 'n-z' : 'N-Z'}</span>
                      <span className="text-[10px] opacity-75">(13)</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

                    {/* 5-Letter Chunks */}
                    {(['A-E', 'F-J', 'K-O', 'P-T', 'U-Z'] as const).map(chunk => {
                      const [start, end] = chunk.split('-');
                      const label = hasLowercase && !hasUppercase ? chunk.toLowerCase() : chunk;
                      return (
                        <button
                          key={chunk}
                          type="button"
                          onClick={() => { playPop(); selectLetterRange(start, end); }}
                          className="h-8 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-black transition-all border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                          title={t(`Select letters ${chunk}`, `${chunk} の文字を選択`)}
                        >
                          <span className="font-mono font-black text-[11px]">{label}</span>
                        </button>
                      );
                    })}
                  </>
                )}

                {hasPluralWords && hasSingularWords && (
                  <>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
                    <button
                      type="button"
                      onClick={() => { playPop(); selectSingularWordsOnly(); }}
                      className="h-8 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-black transition-all border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      title={t("Select only singular items", "単数形のカードのみを選択")}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] flex items-center justify-center font-bold">1</span>
                      <span>{t("Singular", <><ruby>単数<rt>たんすう</rt></ruby></>)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playPop(); selectPluralWordsOnly(); }}
                      className="h-8 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-black transition-all border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      title={t("Select only plural items", "複数形のカードのみを選択")}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-200 dark:bg-purple-800 text-[10px] flex items-center justify-center font-bold">2+</span>
                      <span>{t("Plural", <><ruby>複数<rt>ふくすう</rt></ruby></>)}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Scrollable Live Cards Deck */}
            <div className="overflow-y-auto pr-1 flex-1 min-h-0">
              {isUnit6 && (
                <div className="mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/15 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-300 dark:border-amber-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                        {t("Unit 6 Target Dialogue", "Unit 6 主要表現")}
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {t("Alphabet Quizzing & Classroom Activities", "身の回りの文字クイズ・おはじきゲーム")}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      💬 <span className="text-amber-700 dark:text-amber-400 font-black">"How many letters? / I have (six)."</span> • <span className="text-orange-700 dark:text-orange-400 font-black">"Do you have (a 'b')? Yes, I do. / No, I don't."</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { playPop(); setIsMarbleModalOpen(true); }}
                      className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-transform active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
                      title={t("Launch Marble Game letter caller on classroom TV", "テレビ投影用のおはじきゲーム（文字コール機能）を起動")}
                    >
                      <Dice5 size={14} />
                      <span>{t("Marble Game (おはじき)", "おはじきゲーム")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playPop(); setIsUnitAimsModalOpen(true); }}
                      className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-transform active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
                      title={t("Open Unit 6 MEXT aims, activity scripts and teacher expressions", "単元目標・会話台本・指導英語を開く")}
                    >
                      <Target size={14} />
                      <span>{t("Unit 6 Guide", "単元目標ガイド")}</span>
                    </button>
                  </div>
                </div>
              )}
              {displayedWords.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-sm font-bold">
                    {t('No words match your selection or search.', '選択または検索条件に一致する単語がありません。')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 pb-2">
                  {displayedWords.map(word => {
                    const excluded = isWordExcluded(word.id);
                    const imageSrc = resolveCardImage(word, 'picture_only', activeGrade);
                    const numVal = getNumberValue(word.english);
                    const numTheme = numVal ? getNumberTheme(numVal) : null;

                    return (
                      <div
                        key={word.id}
                        onClick={() => {
                          playPop();
                          toggleWordExcluded(word.id);
                        }}
                        className={`group relative p-2 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer select-none ${
                          excluded
                            ? 'opacity-40 border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 grayscale'
                            : 'border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-800/90 hover:border-blue-400 dark:hover:border-blue-700 shadow-xs'
                        }`}
                      >
                        {/* Audio speaker trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const sound = word.media_by_grade?.[activeGrade]?.sound_file || word.sound_file || word.primary_audio;
                            playWordAudio(sound, word.english);
                          }}
                          className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
                          title={t("Listen to pronunciation", "発音を聞く")}
                        >
                          <Volume2 size={12} />
                        </button>

                        {/* Top-Right Checkbox badge */}
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-all z-10 ${
                          excluded
                            ? 'bg-rose-500 text-white'
                            : 'bg-emerald-500 text-white shadow-xs'
                        }`}>
                          {excluded ? <X size={13} /> : <Check size={13} />}
                        </div>

                        {/* Thumbnail Artwork */}
                        <div className="w-full h-20 sm:h-24 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden mb-1.5 p-1 border border-slate-100 dark:border-slate-800">
                          {numVal && numTheme ? (
                            <div className={`w-[86%] h-[82%] rounded-xl border-2 ${numTheme.border} ${numTheme.bg} flex items-center justify-center shadow-xs select-none pointer-events-none group-hover:scale-105 transition-transform`}>
                              <span className={`font-black font-mono tracking-tight ${numTheme.text} ${numVal.length > 2 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
                                {numVal}
                              </span>
                            </div>
                          ) : imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={word.english}
                              className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-2xl opacity-40">🖼️</span>
                          )}
                        </div>

                        {/* Card Labels */}
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className={`text-xs font-black truncate leading-tight ${
                              excluded ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                            }`}>
                              {word.english}
                            </h4>
                            {word.is_plural && (
                              <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 leading-none">
                                {language === 'ja' ? '複数' : 'PL'}
                              </span>
                            )}
                          </div>
                          {word.en_katakana && (
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block truncate">
                              {word.en_katakana}
                            </span>
                          )}
                          {(word.ja_kanji || word.ja_hiragana) && (
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block truncate mt-0.5">
                              {word.ja_kanji || word.ja_hiragana}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Active Status & Close Button */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
              activeCount >= 4
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>
                {language === 'ja'
                  ? `${activeCount} / 全${totalCandidates}語 有効`
                  : `${activeCount} of ${totalCandidates} Words Active`}
              </span>
            </span>

            {excludedWordIds.length > 0 && (
              <button
                type="button"
                onClick={() => { playPop(); includeAllWords(); }}
                className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw size={11} />
                <span>{language === 'ja' ? '除外をリセット' : 'Reset exclusions'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              playPop();
              closeWordFilterModal();
            }}
            className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>{language === 'ja' ? 'このデッキでプレイ' : 'Apply & Play Games'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}

  <MarbleGameModal
    isOpen={isMarbleModalOpen}
    onClose={() => setIsMarbleModalOpen(false)}
  />

  <UnitAimsModal
    isOpen={isUnitAimsModalOpen}
    onClose={() => setIsUnitAimsModalOpen(false)}
    grade={activeGrade}
    unitString={activeUnit}
    onLaunchMarbleGame={() => {
      setIsUnitAimsModalOpen(false);
      setIsMarbleModalOpen(true);
    }}
  />
  </>
  );
};
