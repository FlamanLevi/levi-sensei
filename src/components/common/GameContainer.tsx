import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Volume2, VolumeX, Maximize, Minimize, BookOpen, ChevronDown, Check, Sun, Moon } from 'lucide-react';
import { useClassroom } from '../../context/ClassroomContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage, LanguageToggle } from '../../context/LanguageContext';
import { useVocabulary, VocabularyScope } from '../../context/VocabularyContext';

interface GameContainerProps {
  title: string;
  jaTitle?: React.ReactNode;
  children: React.ReactNode;
  onExit?: () => void;
  hideScopeDropdown?: boolean;
  isScrollable?: boolean;
}

export const GameContainer: React.FC<GameContainerProps> = ({ 
  title, 
  jaTitle, 
  children, 
  onExit, 
  hideScopeDropdown,
  isScrollable = false 
}) => {
  const { exitToHub, activeGrade, activeUnit, theme, toggleTheme, openPickerModal, openDiceModal } = useClassroom();
  const { isMuted, toggleMute, playPop } = useAudio();
  const { t, language } = useLanguage();
  const { vocabularyScope, setVocabularyScope, getWordsForScope, scopedWords } = useVocabulary();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const scopeMenuRef = useRef<HTMLDivElement>(null);

  const hasPriorReview = ['ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade);
  const hasGrandSlam = ['ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade);

  const getPriorReviewTitle = () => {
    if (activeGrade === 'ES_G6') return language === 'ja' ? '小3〜小5 復習' : 'G3–G5 Review';
    if (activeGrade === 'ES_G5') return language === 'ja' ? '小3〜小4 復習' : 'G3–G4 Review';
    if (activeGrade === 'ES_G4') return language === 'ja' ? '小3 復習' : 'G3 Review';
    return language === 'ja' ? '小学校 復習' : 'Elementary Review';
  };

  const getScopeName = (scope: VocabularyScope) => {
    if (scope === 'CURRENT') {
      return activeUnit !== 'ALL' ? activeUnit : t('Current Unit', '選択中単元');
    }
    if (scope === 'GRADE_ALL') return t(`All ${activeGrade}`, `${activeGrade} 全単元`);
    if (scope === 'PRIOR_REVIEW') return getPriorReviewTitle();
    if (scope === 'ALL_ELEMENTARY') return t('All Elementary', '小3〜小6 全単語');
    return t('Vocabulary', '単語');
  };

  // Close scope menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scopeMenuRef.current && !scopeMenuRef.current.contains(e.target as Node)) {
        setIsScopeMenuOpen(false);
      }
    };
    if (isScopeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isScopeMenuOpen]);

  const handleBack = () => {
    playPop();
    if (onExit) {
      onExit();
    } else {
      exitToHub();
    }
  };

  const toggleFullscreen = () => {
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
    const isCurrentlyFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);

    if (!isCurrentlyFs) {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  return (
    <div className={`w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col select-none overflow-x-clip print:bg-white print:overflow-visible print:h-auto print:max-h-none ${
      isScrollable 
        ? 'min-h-dvh overflow-y-auto' 
        : 'h-[100dvh] max-h-[100dvh] overflow-hidden'
    }`}>
      {/* Game Header Bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-40 gap-2 shadow-xs print:hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 flex-nowrap">
          <button
            onClick={handleBack}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-black text-xs flex items-center gap-1.5 transition-none active:scale-95 shrink-0 whitespace-nowrap"
          >
            <ArrowLeft size={16} />
            <span className="hidden xs:inline">{t('BACK TO HUB', 'ハブに戻る')}</span>
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-nowrap">
            <h2 className="text-base sm:text-lg font-black tracking-tight truncate min-w-0">{title}</h2>
            {jaTitle && <span className="text-xs font-bold text-amber-500 dark:text-amber-400 hidden md:inline shrink-0 whitespace-nowrap">{jaTitle}</span>}
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shrink-0 whitespace-nowrap">
              {activeGrade}
            </span>

            {/* Word Scope Dropdown Pill (Hidden for Eigo Arena where scope is chosen in setup) */}
            {!hideScopeDropdown && !title.toLowerCase().includes('arena') && (
              <div className="relative shrink-0" ref={scopeMenuRef}>
              <button
                onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
                className="px-2.5 py-1 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-indigo-400/30 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                title={t("Change vocabulary pool scope", "出題単語の範囲を変更")}
              >
                <BookOpen size={13} className="text-indigo-400 shrink-0" />
                <span className="hidden sm:inline">{getScopeName(vocabularyScope)}</span>
                <span className="text-[10px] text-indigo-300 font-bold">({scopedWords.length})</span>
                <ChevronDown size={12} className="text-indigo-400 shrink-0" />
              </button>

              {isScopeMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-64 sm:w-72 bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 py-1 mb-1 border-b border-slate-700/60 flex items-center justify-between">
                    <span>{t("Vocabulary Scope", "出題範囲・単語プール")}</span>
                    <span className="text-indigo-400">{scopedWords.length} {t("words", "語")}</span>
                  </div>

                  <div className="space-y-1">
                    {/* Option 1: Current Unit */}
                    <button
                      onClick={() => { playPop(); setVocabularyScope('CURRENT'); setIsScopeMenuOpen(false); }}
                      className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                        vocabularyScope === 'CURRENT'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'hover:bg-slate-700/80 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <p className="text-xs font-black truncate">
                          {activeUnit !== 'ALL' ? activeUnit : t('Current Filter', '選択中単元')}
                        </p>
                        <p className={`text-[10px] ${vocabularyScope === 'CURRENT' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {t('Today’s textbook unit', '本日の教科書レッスン')}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${vocabularyScope === 'CURRENT' ? 'bg-indigo-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {getWordsForScope('CURRENT').length}
                      </span>
                    </button>

                    {/* Option 2: All Grade */}
                    <button
                      onClick={() => { playPop(); setVocabularyScope('GRADE_ALL'); setIsScopeMenuOpen(false); }}
                      className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                        vocabularyScope === 'GRADE_ALL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'hover:bg-slate-700/80 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <p className="text-xs font-black truncate">
                          {t(`All ${activeGrade}`, `${activeGrade} 全単元`)}
                        </p>
                        <p className={`text-[10px] ${vocabularyScope === 'GRADE_ALL' ? 'text-blue-200' : 'text-slate-400'}`}>
                          {t('Complete grade vocabulary', '学年の全単語')}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${vocabularyScope === 'GRADE_ALL' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {getWordsForScope('GRADE_ALL').length}
                      </span>
                    </button>

                    {/* Option 3: Prior Review */}
                    {hasPriorReview && (
                      <button
                        onClick={() => { playPop(); setVocabularyScope('PRIOR_REVIEW'); setIsScopeMenuOpen(false); }}
                        className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                          vocabularyScope === 'PRIOR_REVIEW'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'hover:bg-slate-700/80 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <p className="text-xs font-black truncate">
                            {getPriorReviewTitle()}
                          </p>
                          <p className={`text-[10px] ${vocabularyScope === 'PRIOR_REVIEW' ? 'text-amber-200' : 'text-slate-400'}`}>
                            {t('Past elementary grades', '過去学年の総復習')}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${vocabularyScope === 'PRIOR_REVIEW' ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {getWordsForScope('PRIOR_REVIEW').length}
                        </span>
                      </button>
                    )}

                    {/* Option 4: All Elementary Grand Slam */}
                    {hasGrandSlam && (
                      <button
                        onClick={() => { playPop(); setVocabularyScope('ALL_ELEMENTARY'); setIsScopeMenuOpen(false); }}
                        className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                          vocabularyScope === 'ALL_ELEMENTARY'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'hover:bg-slate-700/80 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <p className="text-xs font-black truncate">
                            {t('All Elementary Grand Slam', '小3〜小6 全単語')}
                          </p>
                          <p className={`text-[10px] ${vocabularyScope === 'ALL_ELEMENTARY' ? 'text-purple-200' : 'text-slate-400'}`}>
                            {t('Full G3–G6 cumulative pool', '小学校全単語マスター')}
                          </p>
                        </div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${vocabularyScope === 'ALL_ELEMENTARY' ? 'bg-purple-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                          {getWordsForScope('ALL_ELEMENTARY').length}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          <LanguageToggle size="sm" />
          <button
            onClick={() => { playPop(); openDiceModal(); }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-400/30 flex items-center justify-center font-black text-xs transition-none active:scale-95 cursor-pointer shadow-xs"
            title={t("Classroom Dice Roller", "教室のサイコロ・ダイス")}
          >
            <span className="text-base">🎲</span>
          </button>
          <button
            onClick={() => { playPop(); openPickerModal(); }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center font-black text-xs transition-none active:scale-95 cursor-pointer shadow-xs"
            title={t("Student Attendance Number Picker", "出席番号ルーレット・指名くじ")}
          >
            <span className="text-base">🎯</span>
          </button>
          <button
            onClick={() => { playPop(); toggleTheme(); }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-none active:scale-95 cursor-pointer"
            title={theme === 'dark' ? t('Switch to Light Mode', 'ライトモードに切替') : t('Switch to Dark Mode', 'ダークモードに切替')}
          >
            {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-none active:scale-95 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
          <button
            onClick={toggleMute}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-none active:scale-95 cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      </div>

      {/* Main Game Stage */}
      <div className={`flex-1 flex flex-col items-center justify-start p-1.5 sm:p-2.5 md:p-3 min-h-0 w-full print:p-0 print:overflow-visible print:block ${
        isScrollable ? 'overflow-y-auto' : 'overflow-x-hidden overflow-y-auto'
      }`}>
        {children}
      </div>
    </div>
  );
};
