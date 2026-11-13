import React, { useState, useRef, useEffect } from 'react';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { SCHOOL_CONFIGS, SchoolId, getCurrentTokyoPeriod, getSuggestedClassForSchedule, TokyoPeriod } from '@/types/roster';
import { School, ChevronDown, Check, Sparkles } from 'lucide-react';

export const SchoolClassSwitcher: React.FC = () => {
  const { activeSchool, setActiveSchool, activeClassId, setActiveClassId } = useClassroom();
  const { playPop } = useAudio();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSchoolConfig = SCHOOL_CONFIGS[activeSchool] || SCHOOL_CONFIGS.futakotamagawa;

  const currentPeriod = getCurrentTokyoPeriod(activeSchool);
  const scheduleSuggestion = getSuggestedClassForSchedule(activeSchool);
  const suggestedClass = scheduleSuggestion?.classId || null;
  const isSuggestedDifferent = Boolean(suggestedClass && suggestedClass !== activeClassId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectClass = (cId: string) => {
    playPop();
    setActiveClassId(cId);
    setIsOpen(false);
  };

  const handleSelectSchool = (sId: SchoolId) => {
    playPop();
    setActiveSchool(sId);
  };

  // Render 90°-rotated class grid for Futakotamagawa:
  // 6 columns (Grades 1 to 6) x 4 rows (Classes 1 to 4)
  const renderFutakoRotatedGrid = () => {
    const grades = ['1', '2', '3', '4', '5', '6'];
    const maxRows = 4; // up to class 4

    return (
      <div className="grid grid-cols-6 gap-1.5">
        {grades.map(gradeDigit => {
          const isLower = gradeDigit === '1' || gradeDigit === '2';
          const isMid = gradeDigit === '3' || gradeDigit === '4';
          const badgeColor = isLower
            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
            : isMid
            ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60'
            : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60';

          return (
            <div key={gradeDigit} className="flex flex-col gap-1.5">
              {/* Column Header: Grade Badge */}
              <div
                className={`py-1 text-center rounded-xl text-[11px] font-black border ${badgeColor}`}
                title={language === 'ja' ? `${gradeDigit}年生` : `Grade ${gradeDigit}`}
              >
                <span>{gradeDigit}</span>
                <span className="text-[10px] font-bold">{language === 'ja' ? '年' : 'G'}</span>
              </div>

              {/* Rows: Class 1 to 4 */}
              {Array.from({ length: maxRows }, (_, i) => {
                const classNum = i + 1;
                const cId = `${gradeDigit}-${classNum}`;
                const exists = currentSchoolConfig.classes.includes(cId);

                if (!exists) {
                  return (
                    <div
                      key={`placeholder-${cId}`}
                      className="h-8 rounded-xl opacity-0 pointer-events-none select-none"
                      aria-hidden="true"
                    />
                  );
                }

                const isSelected = activeClassId === cId;
                const isSuggested = suggestedClass === cId;

                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => handleSelectClass(cId)}
                    className={`h-8 w-full rounded-xl font-black text-xs sm:text-[13px] flex items-center justify-center gap-0.5 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white border-transparent shadow-md ring-2 ring-indigo-300 dark:ring-indigo-600 scale-[1.03] z-10'
                        : isSuggested
                        ? 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-600 animate-pulse'
                        : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                    }`}
                    title={language === 'ja' ? `${gradeDigit}年${classNum}組` : `Grade ${gradeDigit} Class ${classNum}`}
                  >
                    <span>{cId}</span>
                    {isSelected && <Check size={11} className="text-white shrink-0 -mr-0.5" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Render 90°-rotated class grid for Toyogaoka:
  // 4 columns (Grades 3, 4, 5, 6)
  const renderToyogaokaRotatedGrid = () => {
    const grades = ['3', '4', '5', '6'];
    const maxRows = 2; // Grade 6 has 2 classes

    return (
      <div className="grid grid-cols-4 gap-2">
        {grades.map(gradeDigit => {
          const isMid = gradeDigit === '3' || gradeDigit === '4';
          const badgeColor = isMid
            ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60'
            : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60';

          return (
            <div key={gradeDigit} className="flex flex-col gap-1.5">
              {/* Column Header: Grade Badge */}
              <div
                className={`py-1 text-center rounded-xl text-[11px] font-black border ${badgeColor}`}
                title={language === 'ja' ? `${gradeDigit}年生` : `Grade ${gradeDigit}`}
              >
                <span>{gradeDigit}</span>
                <span className="text-[10px] font-bold">{language === 'ja' ? '年' : 'G'}</span>
              </div>

              {/* Rows */}
              {Array.from({ length: maxRows }, (_, i) => {
                const classNum = i + 1;
                const cId = `${gradeDigit}-${classNum}`;
                const exists = currentSchoolConfig.classes.includes(cId);

                if (!exists) {
                  return (
                    <div
                      key={`placeholder-${cId}`}
                      className="h-8.5 rounded-xl opacity-0 pointer-events-none select-none"
                      aria-hidden="true"
                    />
                  );
                }

                const isSelected = activeClassId === cId;
                const isSuggested = suggestedClass === cId;

                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => handleSelectClass(cId)}
                    className={`h-8.5 w-full rounded-xl font-black text-xs sm:text-[13px] flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white border-transparent shadow-md ring-2 ring-indigo-300 dark:ring-indigo-600 scale-[1.03] z-10'
                        : isSuggested
                        ? 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-600 animate-pulse'
                        : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                    }`}
                    title={language === 'ja' ? `${gradeDigit}年${classNum}組` : `Grade ${gradeDigit} Class ${classNum}`}
                  >
                    <span>{cId}</span>
                    {isSelected && <Check size={11} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button in Header */}
        <button
          type="button"
          onClick={() => { playPop(); setIsOpen(!isOpen); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 transition-all font-black text-xs shadow-xs focus:outline-none shrink-0 cursor-pointer"
          title={t("Switch School and Class", "学校とクラスを切り替え")}
        >
          <span className="text-sm">{activeSchool === 'toyogaoka' ? '🌳' : '🌸'}</span>
          <span className="font-bold whitespace-nowrap">
            {language === 'ja'
              ? currentSchoolConfig.shortKanji
              : (currentSchoolConfig.shortName || currentSchoolConfig.name.split(' ')[0])}
          </span>
          <span className="text-slate-400 dark:text-slate-600">|</span>
          <span className="px-1.5 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-[11px]">
            {activeClassId}
          </span>
          <ChevronDown size={14} className={`text-indigo-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          {isSuggestedDifferent && (
            <span className="relative flex h-2 w-2 -mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </button>

        {/* Rotated, Ultra-Compact Popover Menu */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-[92vw] sm:w-[460px] md:w-[480px] p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100">
                <School size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span>
                  {language === 'ja' ? (
                    <><ruby>学校<rt>がっこう</rt></ruby>・クラスの<ruby>選択<rt>せんたく</rt></ruby></>
                  ) : (
                    'Select School & Class'
                  )}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {language === 'ja' ? (
                  <><ruby>1タップ切替<rt>ワンタップきりかえ</rt></ruby></>
                ) : (
                  '1-Tap Switch'
                )}
              </span>
            </div>

            {/* School Selector: Clean, Compact 2-Way Segmented Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-3 border border-slate-200/50 dark:border-slate-700/50">
              {(Object.keys(SCHOOL_CONFIGS) as SchoolId[]).map(sId => {
                const cfg = SCHOOL_CONFIGS[sId];
                const isSelected = activeSchool === sId;
                return (
                  <button
                    key={sId}
                    type="button"
                    onClick={() => handleSelectSchool(sId)}
                    className={`py-1.5 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-600'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{sId === 'toyogaoka' ? '🌳' : '🌸'}</span>
                    <span className="font-bold whitespace-nowrap">
                      {language === 'ja' ? cfg.kanjiName : (sId === 'toyogaoka' ? 'Toyogaoka' : 'Futakotamagawa')}
                    </span>
                    <span className="text-[10px] font-normal opacity-70 whitespace-nowrap">
                      ({cfg.classes.length})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Class Rotated Grid: Grades Left-to-Right (Columns), Classes Top-to-Bottom (Rows) */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-0.5">
                <span>
                  {language === 'ja' ? (
                    <><ruby>全クラス一覧<rt>ぜんくらすいちらん</rt></ruby>（{activeSchool === 'toyogaoka' ? '全5クラス' : '全20クラス'}）</>
                  ) : (
                    `All Classes (${activeSchool === 'toyogaoka' ? '5 classes' : '20 classes'})`
                  )}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold lowercase">
                  {language === 'ja' ? '学年 → 組' : 'grade → class'}
                </span>
              </div>

              {activeSchool === 'toyogaoka'
                ? renderToyogaokaRotatedGrid()
                : renderFutakoRotatedGrid()}
            </div>

            {/* Active Class & Auto-Link Badge Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] min-h-[30px]">
              <span className="font-bold text-slate-500 dark:text-slate-400 truncate">
                {language === 'ja' ? (
                  <>
                    <ruby>現在<rt>げんざい</rt></ruby>: <strong className="text-indigo-600 dark:text-indigo-400">{currentSchoolConfig.kanjiName} {activeClassId}</strong>
                  </>
                ) : (
                  <>
                    Active: <strong className="text-indigo-600 dark:text-indigo-400">{currentSchoolConfig.name} {activeClassId}</strong>
                  </>
                )}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[10px] shrink-0">
                {language === 'ja' ? (
                  <>
                    <ruby>{activeClassId.split('-')[0]}年<rt>ねん</rt></ruby> <ruby>連動<rt>れんどう</rt></ruby>
                  </>
                ) : (
                  `Grade ${activeClassId.split('-')[0]} Linked`
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 1-Tap Fast-Track Switch Banner right in header */}
      {isSuggestedDifferent && suggestedClass && (
        <button
          type="button"
          onClick={() => handleSelectClass(suggestedClass)}
          className="h-8 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs shadow-md border border-amber-300 animate-pulse flex items-center gap-1 shrink-0 cursor-pointer"
          title={t(
            `Period ${currentPeriod?.period} Schedule: 1-Tap switch to ${suggestedClass}`,
            `現在${currentPeriod?.period}校時: ${suggestedClass} に1タップ切替`
          )}
        >
          <span className="text-xs">🔔</span>
          <span className="bg-black/25 px-1.5 py-0.5 rounded text-[11px] text-white font-black leading-none">
            {suggestedClass}
          </span>
        </button>
      )}
    </div>
  );
};
