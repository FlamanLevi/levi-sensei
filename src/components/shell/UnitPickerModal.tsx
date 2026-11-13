import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useClassroom } from '../../context/ClassroomContext';
import { useVocabulary } from '../../context/VocabularyContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { BookOpen, Check, X } from 'lucide-react';
import { GradeLevel } from '@data/types';

interface ElementaryGradeTab {
  key: GradeLevel;
  ja: string;
  en: string;
  textbook: string;
  badgeJa: string;
  badgeEn: string;
}

const ELEMENTARY_GRADE_TABS: ElementaryGradeTab[] = [
  { key: 'ES_G3', ja: '小3', en: 'G3', textbook: "Let's Try 1", badgeJa: '小学3年', badgeEn: 'Grade 3' },
  { key: 'ES_G4', ja: '小4', en: 'G4', textbook: "Let's Try 2", badgeJa: '小学4年', badgeEn: 'Grade 4' },
  { key: 'ES_G5', ja: '小5', en: 'G5', textbook: 'Here We Go 5', badgeJa: '小学5年', badgeEn: 'Grade 5' },
  { key: 'ES_G6', ja: '小6', en: 'G6', textbook: 'Here We Go 6', badgeJa: '小学6年', badgeEn: 'Grade 6' },
];

export const UnitPickerModal: React.FC = () => {
  const {
    activeGrade,
    setActiveGrade,
    activeUnit,
    setActiveUnit,
    selectedUnits,
    setSelectedUnits,
    clearSelectedUnits,
    setActiveCategory,
    isUnitModalOpen,
    setIsUnitModalOpen
  } = useClassroom();
  const { availableUnits, gradeWords } = useVocabulary();
  const { playPop } = useAudio();
  const { t, language } = useLanguage();

  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [tempSelectedUnits, setTempSelectedUnits] = useState<string[]>([]);

  useEffect(() => {
    if (isUnitModalOpen) {
      const initialSelected = selectedUnits.length > 0 
        ? [...selectedUnits] 
        : (activeUnit !== 'ALL' ? [activeUnit] : []);
      setTempSelectedUnits(initialSelected);
      setIsMultiSelectMode(selectedUnits.length > 1);
    }
  }, [isUnitModalOpen, selectedUnits, activeUnit]);

  if (!isUnitModalOpen) return null;

  const handleGradeChange = (grade: GradeLevel) => {
    if (grade === activeGrade) return;
    playPop();
    setActiveGrade(grade);
    setActiveUnit('ALL');
    clearSelectedUnits();
    setTempSelectedUnits([]);
  };

  const handleUnitClick = (u: string | 'ALL') => {
    playPop();
    clearSelectedUnits();
    setActiveUnit(u);
    setActiveCategory('ALL');
    setIsUnitModalOpen(false);
  };

  const handleToggleTempUnit = (u: string) => {
    playPop();
    setTempSelectedUnits(prev => 
      prev.includes(u) ? prev.filter(item => item !== u) : [...prev, u]
    );
  };

  const handleApplyMultiBundle = () => {
    playPop();
    if (tempSelectedUnits.length === 0) {
      clearSelectedUnits();
    } else if (tempSelectedUnits.length === 1) {
      clearSelectedUnits();
      setActiveUnit(tempSelectedUnits[0]);
    } else {
      setSelectedUnits(tempSelectedUnits);
    }
    setActiveCategory('ALL');
    setIsUnitModalOpen(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={() => setIsUnitModalOpen(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl border-2 border-slate-200 dark:border-slate-800 flex flex-col max-h-[88dvh] text-slate-900 dark:text-slate-100 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 min-w-0">
              <span className="truncate">{t("Textbook Units & Chapters", "教科書の単元・チャプター")}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 shrink-0 whitespace-nowrap">
                {activeGrade === 'ES_G3'
                  ? `小3 • Let's Try 1`
                  : activeGrade === 'ES_G4'
                  ? `小4 • Let's Try 2`
                  : activeGrade === 'ES_G5'
                  ? `小5 • Here We Go 5`
                  : activeGrade === 'ES_G6'
                  ? `小6 • Here We Go 6`
                  : activeGrade}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {isMultiSelectMode
                ? t("Check multiple units below to bundle them for review and games.", "チェックを入れて複数の単元をバンドル（まとめて選択）できます。")
                : t("Select any textbook unit to instantly filter vocabulary cards and games.", "単元を選択して単語カードやゲームを絞り込みます。")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={() => {
                playPop();
                setIsMultiSelectMode(prev => !prev);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border whitespace-nowrap shrink-0 ${
                isMultiSelectMode
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              title={t("Toggle multi-unit bundling mode", "複数単元をバンドル選択するモードに切り替え")}
            >
              <span>{isMultiSelectMode ? '☑️' : '◻️'}</span>
              <span>{t("Bundle Mode", "複数選択モード")}</span>
            </button>
            <button
              onClick={() => setIsUnitModalOpen(false)}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Grade Selection Tabs (Cross-grade vocabulary access) */}
        <div className="grid grid-cols-4 gap-2 mb-3.5 shrink-0">
          {ELEMENTARY_GRADE_TABS.map(tab => {
            const isSelected = activeGrade === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleGradeChange(tab.key)}
                className={`py-2 px-1.5 sm:px-3 rounded-2xl transition-all flex flex-col items-center justify-center border-2 cursor-pointer text-center select-none ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-sm sm:text-base font-black whitespace-nowrap">
                    {language === 'ja' ? tab.ja : tab.en}
                  </span>
                  <span className={`text-[10px] hidden sm:inline-block font-bold whitespace-nowrap ${
                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {language === 'ja' ? tab.badgeJa : tab.badgeEn}
                  </span>
                </div>
                <span className={`text-[10px] sm:text-[11px] truncate max-w-full font-bold mt-1 ${
                  isSelected ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {tab.textbook}
                </span>
              </button>
            );
          })}
        </div>

        {/* Units Grid */}
        <div className="overflow-y-auto pr-1 space-y-2 flex-1">
          {/* All Units Option */}
          <div
            onClick={() => {
              if (isMultiSelectMode) {
                playPop();
                if (tempSelectedUnits.length === availableUnits.length) {
                  setTempSelectedUnits([]);
                } else {
                  setTempSelectedUnits([...availableUnits]);
                }
              } else {
                handleUnitClick('ALL');
              }
            }}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              (isMultiSelectMode ? tempSelectedUnits.length === availableUnits.length : (activeUnit === 'ALL' && selectedUnits.length === 0))
                ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200'
                : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                ALL
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black truncate">{t(`All Units (${gradeWords.length} Words)`, `すべての単元 (${gradeWords.length}語)`)}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {isMultiSelectMode
                    ? (tempSelectedUnits.length === availableUnits.length ? t("Click to clear all selections", "クリックで全選択を解除") : t("Click to select all units", "クリックで全単元を選択"))
                    : t(`Show complete curriculum word list for ${activeGrade}`, `${activeGrade}のすべての単語リストを表示`)}
                </p>
              </div>
            </div>
            {isMultiSelectMode ? (
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                tempSelectedUnits.length === availableUnits.length
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
              }`}>
                {tempSelectedUnits.length === availableUnits.length && <Check size={14} />}
              </div>
            ) : (
              activeUnit === 'ALL' && selectedUnits.length === 0 && <Check size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </div>

          {/* Individual Units in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {availableUnits.map(unit => {
              const isChecked = isMultiSelectMode
                ? tempSelectedUnits.includes(unit)
                : (selectedUnits.length === 0 && activeUnit === unit);

              const count = gradeWords.filter(w => {
                const gm = w.media_by_grade && w.media_by_grade[activeGrade];
                return gm && gm.unit === unit;
              }).length;

              return (
                <div
                  key={unit}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      handleToggleTempUnit(unit);
                    } else {
                      handleUnitClick(unit);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isChecked
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      isChecked ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0 pr-1">
                      <h4 className="text-xs font-black leading-snug break-words">{unit}</h4>
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{t(`${count} words`, `${count}語`)}</span>
                    </div>
                  </div>
                  {isMultiSelectMode ? (
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ml-2 shrink-0 ${
                      isChecked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}>
                      {isChecked && <Check size={14} />}
                    </div>
                  ) : (
                    isChecked && <Check size={16} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Multi-Select Action Bar */}
        {isMultiSelectMode && (
          <div className="pt-3.5 mt-3 border-t border-slate-200 dark:border-slate-800 flex flex-nowrap items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
                {tempSelectedUnits.length} {t("units selected", "単元選択中")} (
                {gradeWords.filter(w => {
                  const gm = w.media_by_grade && w.media_by_grade[activeGrade];
                  return Boolean(gm && gm.unit && tempSelectedUnits.includes(gm.unit));
                }).length} {t("words", "語")})
              </span>
              <button
                type="button"
                onClick={() => { playPop(); setTempSelectedUnits([...availableUnits]); }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                {t("Select All", "全選択")}
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={() => { playPop(); setTempSelectedUnits([]); }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                {t("Clear", "解除")}
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors whitespace-nowrap"
              >
                {t("Cancel", "キャンセル")}
              </button>
              <button
                type="button"
                disabled={tempSelectedUnits.length === 0}
                onClick={handleApplyMultiBundle}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>{t("Apply Bundle", "この組み合わせで決定")}</span>
                <span>
                  ({gradeWords.filter(w => {
                    const gm = w.media_by_grade && w.media_by_grade[activeGrade];
                    return Boolean(gm && gm.unit && tempSelectedUnits.includes(gm.unit));
                  }).length})
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
