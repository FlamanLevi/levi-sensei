import React from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { useVocabulary } from '../../context/VocabularyContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { CategoryKey } from '@data/types';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { WordFilterModal } from './WordFilterModal';

const CATEGORIES: { key: CategoryKey; labelEn: string; labelJa: string }[] = [
  { key: '01_action', labelEn: 'Actions', labelJa: '動作・アクション' },
  { key: '02_state', labelEn: 'Feelings', labelJa: 'きもち・状態' },
  { key: '03_fooddrink', labelEn: 'Food & Drink', labelJa: '食べ物・飲み物' },
  { key: '04_number', labelEn: 'Numbers', labelJa: '数字・数' },
  { key: '05_schoollife', labelEn: 'School', labelJa: '学校・文房具' },
  { key: '06_facility', labelEn: 'Town & Jobs', labelJa: '町・仕事・施設' },
  { key: '07_dailylife', labelEn: 'Daily Life', labelJa: '日常生活' },
  { key: '08_sports', labelEn: 'Sports', labelJa: 'スポーツ' },
  { key: '09_color_shape', labelEn: 'Colors & Shapes', labelJa: '色・形' },
  { key: '10_calendar_time', labelEn: 'Days & Months', labelJa: '月・曜日・時間' },
  { key: '11_animals', labelEn: 'Animals', labelJa: '動物' },
  { key: '12_nature', labelEn: 'Nature', labelJa: '自然・天気' },
  { key: '13_position', labelEn: 'Directions', labelJa: '位置・方向' },
  { key: '14_body_family', labelEn: 'Body & Family', labelJa: '体・家族' },
  { key: '15_festalday', labelEn: 'Holidays', labelJa: '季節・行事' },
  { key: '16_alphabet', labelEn: 'Alphabet', labelJa: 'アルファベット' },
];

function cleanUnitTitle(u: string): string {
  const match = u.match(/^Unit\s+(\d+):\s*(.+)/i);
  if (!match) return u;
  const num = `U${match[1]}`;
  let title = match[2].trim();
  const paren = title.match(/^([^(]+)\s*\((.+)\)$/);
  if (paren) {
    title = paren[1].trim();
  }
  return `${num}: ${title}`;
}

export const UnitCategoryBar: React.FC = () => {
  const { 
    activeGrade, 
    activeCategory, 
    setActiveCategory, 
    activeUnit, 
    setActiveUnit,
    selectedUnits,
    clearSelectedUnits,
    userRole,
    isTeacherUnlocked,
  } = useClassroom();
  
  const { 
    availableUnits, 
    filteredWords, 
    rawFilteredWords, 
    excludedWordIds, 
    openWordFilterModal 
  } = useVocabulary();
  
  const { playPop } = useAudio();
  const { t, language } = useLanguage();

  // Step to Previous Unit
  const handlePrevUnit = () => {
    playPop();
    clearSelectedUnits();
    setActiveCategory('ALL');
    if (activeUnit === 'ALL') {
      if (availableUnits.length > 0) setActiveUnit(availableUnits[availableUnits.length - 1]);
    } else {
      const idx = availableUnits.indexOf(activeUnit);
      if (idx > 0) {
        setActiveUnit(availableUnits[idx - 1]);
      } else {
        setActiveUnit('ALL');
      }
    }
  };

  // Step to Next Unit
  const handleNextUnit = () => {
    playPop();
    clearSelectedUnits();
    setActiveCategory('ALL');
    if (activeUnit === 'ALL') {
      if (availableUnits.length > 0) setActiveUnit(availableUnits[0]);
    } else {
      const idx = availableUnits.indexOf(activeUnit);
      if (idx >= 0 && idx < availableUnits.length - 1) {
        setActiveUnit(availableUnits[idx + 1]);
      } else {
        setActiveUnit('ALL');
      }
    }
  };

  const handleResetToAll = () => {
    playPop();
    clearSelectedUnits();
    setActiveUnit('ALL');
    setActiveCategory('ALL');
  };

  // Compute deck summary title
  const deckTitle = selectedUnits.length > 1
    ? (language === 'ja' ? `📦 ${selectedUnits.length}単元バンドル` : `📦 ${selectedUnits.length} Units Bundled`)
    : activeUnit !== 'ALL'
    ? cleanUnitTitle(activeUnit)
    : activeCategory !== 'ALL'
    ? (language === 'ja'
        ? `🎨 ${CATEGORIES.find(c => c.key === activeCategory)?.labelJa || activeCategory}`
        : `🎨 ${CATEGORIES.find(c => c.key === activeCategory)?.labelEn || activeCategory}`)
    : (language === 'ja' ? '📖 すべての単元（全学年単語）' : '📖 All Curriculum Units');

  const isTeacherTwoRow = userRole === 'TEACHER' && isTeacherUnlocked;

  return (
    <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-y border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 sticky ${isTeacherTwoRow ? 'top-[88px] sm:top-[90px]' : 'top-[50px] sm:top-[52px]'} z-30 shadow-xs transition-colors`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Master Lesson Deck Pill Button */}
        <button
          type="button"
          onClick={() => { playPop(); openWordFilterModal(); }}
          className="group flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border-2 border-blue-200 dark:border-blue-800/80 transition-all cursor-pointer shadow-xs text-left"
          title={t("Open Lesson Deck Studio to customize units and cards", "教材デッキスタジオを開いて単元やカードを調整")}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform shrink-0">
            🧺
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {language === 'ja' ? <ruby>授業デッキ<rt className="text-[7px]">じゅぎょうでっき</rt></ruby> : 'Lesson Deck'}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {activeGrade}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-[300px] md:max-w-[380px]">
                {deckTitle}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono font-black text-[11px] shrink-0 shadow-xs">
                {filteredWords.length} {language === 'ja' ? '語' : 'words'}
              </span>
              {excludedWordIds.length > 0 && (
                <span className="hidden sm:inline px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px] shrink-0">
                  (-{excludedWordIds.length} {language === 'ja' ? '除外' : 'pruned'})
                </span>
              )}
            </div>
          </div>
          <SlidersHorizontal size={14} className="text-blue-600 dark:text-blue-400 group-hover:rotate-45 transition-transform shrink-0 ml-1" />
        </button>

        {/* Center: Fast 1-Click Stepper (< Unit >) for zero-modal quick switching */}
        {availableUnits.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <button
              type="button"
              onClick={handlePrevUnit}
              className="w-7 h-7 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              title={t("Previous Unit", "前の単元")}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 px-2 truncate max-w-[160px]">
              {selectedUnits.length > 1
                ? `${selectedUnits.length} Units`
                : activeUnit === 'ALL'
                ? (language === 'ja' ? '全単元' : 'All Units')
                : cleanUnitTitle(activeUnit)}
            </span>
            <button
              type="button"
              onClick={handleNextUnit}
              className="w-7 h-7 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              title={t("Next Unit", "次の単元")}
            >
              <ChevronRight size={16} />
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={handleResetToAll}
              className={`px-2 py-1 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                activeUnit === 'ALL' && selectedUnits.length === 0
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'ja' ? '全表示' : 'All Units'}
            </button>
          </div>
        )}
      </div>
      <WordFilterModal />
    </div>
  );
};
