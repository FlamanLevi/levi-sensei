import React from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { VocabularyScope } from '@/context/VocabularyContext';
import { GamePlayType, QuizSubject } from '../../types';
import { MathDomain, MathGrade, MATH_DOMAINS, MATH_GRADES } from '../../mathTypes';
import { getTopicsForGrade } from '../../mathGenerator';

interface SubjectDeckSectionProps {
  subject: QuizSubject;
  onSelectSubject: (subject: QuizSubject) => void;
  mathGrade: MathGrade;
  onSelectMathGrade: (grade: MathGrade) => void;
  mathDomain: MathDomain;
  onSelectMathDomain: (domain: MathDomain) => void;
  selectedMathTopic: string;
  onSelectMathTopic: (topicId: string) => void;
  gamePlayType: GamePlayType;
  questionCount: number;
  activeGrade: string;
  activeUnit: string;
  activeCategory: string;
  globalSelectedUnits: string[];
  cleanUnitLabel: (u: string) => string;
  selectedScope: VocabularyScope;
  onSelectScope: (scope: VocabularyScope) => void;
  isExtendedScopesOpen: boolean;
  onToggleExtendedScopes: () => void;
  scopeCounts: {
    CURRENT: number;
    GRADE_ALL: number;
    PRIOR_REVIEW: number;
    ALL_ELEMENTARY: number;
  };
  wordsInPoolLength: number;
  hasPriorReview: boolean;
  hasGrandSlam: boolean;
  getPriorReviewTitle: () => string;
  openUnitModal: () => void;
}

export const SubjectDeckSection: React.FC<SubjectDeckSectionProps> = ({
  subject,
  onSelectSubject,
  mathGrade,
  onSelectMathGrade,
  mathDomain,
  onSelectMathDomain,
  selectedMathTopic,
  onSelectMathTopic,
  gamePlayType,
  questionCount,
  activeGrade,
  activeUnit,
  activeCategory,
  globalSelectedUnits,
  cleanUnitLabel,
  selectedScope,
  onSelectScope,
  isExtendedScopesOpen,
  onToggleExtendedScopes,
  scopeCounts,
  wordsInPoolLength,
  hasPriorReview,
  hasGrandSlam,
  getPriorReviewTitle,
  openUnitModal,
}) => {
  const { t, language } = useLanguage();
  const availableTopics = React.useMemo(
    () => getTopicsForGrade(mathGrade, mathDomain),
    [mathGrade, mathDomain]
  );

  return (
    <>
      {/* Subject Mode Switcher: English vs Mathematics */}
      <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center gap-2 border border-slate-200 dark:border-slate-700 select-none shadow-inner">
        <button
          type="button"
          onClick={() => onSelectSubject('ENGLISH')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            subject === 'ENGLISH'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-400/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xl">🔤</span>
          <div className="flex flex-col items-start sm:items-center text-left sm:text-center min-w-0">
            <span className="truncate">{t('English (Foreign Language)', '英語・外国語 (Eigo Arena)')}</span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
              {t('Textbook Units & Word Pool', '教科書単元・単語マスター')}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectSubject('MATH')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            subject === 'MATH'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/50'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="text-xl">📐</span>
          <div className="flex flex-col items-start sm:items-center text-left sm:text-center min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate">{t('Mathematics (Elementary Math)', '算数 (Keisan Arena)')}</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none ${
                  subject === 'MATH'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                }`}
              >
                NEW • G1–G6
              </span>
            </div>
            <span className={`text-[10px] font-bold ${subject === 'MATH' ? 'text-emerald-100' : 'text-slate-600 dark:text-slate-400'}`}>
              {t('Limitless Procedural Math (MEXT)', '学習指導要領準拠・無制限自動生成')}
            </span>
          </div>
        </button>
      </div>

      {/* MATHEMATICS MODE: MEXT Grade & Curriculum Configurator */}
      {subject === 'MATH' && (
        <div className="space-y-4 p-4 sm:p-6 rounded-3xl bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800/60 shadow-sm animate-in fade-in duration-200">
          {/* 1. Grade Selector (G1 - G6) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-sm">🏫</span>
                <span>{t('1. Elementary Grade Level', '1. 対象学年（小学校 1年〜6年）')}</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                {MATH_GRADES[mathGrade]?.labelJa} ({MATH_GRADES[mathGrade]?.labelEn})
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['G1', 'G2', 'G3', 'G4', 'G5', 'G6'] as MathGrade[]).map((g) => {
                const meta = MATH_GRADES[g];
                const isSelected = mathGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onSelectMathGrade(g)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-sm font-black flex items-center gap-1">
                      <span>{meta.badge}</span>
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        ({meta.labelEn})
                      </span>
                    </span>
                    <span className={`text-[10px] font-bold line-clamp-1 ${isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {language === 'ja' ? meta.labelJa : meta.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Grade Summary Banner */}
            <div className="mt-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2.5 shadow-2xs">
              <span className="text-base shrink-0 mt-0.5">💡</span>
              <div>
                <span className="font-black text-emerald-700 dark:text-emerald-400 mr-2">
                  {MATH_GRADES[mathGrade]?.badge} {language === 'ja' ? '学習到達目標:' : 'Curriculum Focus:'}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {language === 'ja' ? MATH_GRADES[mathGrade]?.summaryJa : MATH_GRADES[mathGrade]?.summaryEn}
                </span>
              </div>
            </div>
          </div>

          {/* 2. MEXT Domain Selector */}
          <div>
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              {t('2. Course of Study Domain', '2. 指導要領 領域')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['ALL', 'NUMBERS_CALC', 'QUANTITIES_MEASUREMENT', 'GEOMETRIC_FIGURES', 'MATHEMATICAL_RELATIONS'] as MathDomain[]).map((d) => {
                const meta = MATH_DOMAINS[d];
                const isSelected = mathDomain === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelectMathDomain(d)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black truncate">{language === 'ja' ? meta.nameJa : meta.nameEn}</span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-white text-emerald-800'
                            : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                        } shrink-0`}
                      >
                        {meta.mextLetter}
                      </span>
                    </div>
                    <span className={`text-[10px] line-clamp-1 leading-tight ${isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {language === 'ja' ? meta.descriptionJa : meta.descriptionEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Specific Topic Drill-Down */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯</span>
                <span>{t('3. Topic Focus (Optional)', '3. 単元・トピック集中特訓（任意）')}</span>
              </label>
              {selectedMathTopic && (
                <button
                  type="button"
                  onClick={() => onSelectMathTopic('')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  {t('Reset to All Topics', '全トピックからランダムに戻す')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onSelectMathTopic('')}
                className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  !selectedMathTopic
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/50'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>🎲</span>
                <span>{t('All Topics Mixed', '全トピックからバランス出題')}</span>
                <span className="text-[10px] opacity-80">({availableTopics.length})</span>
              </button>

              {availableTopics.map((tItem) => {
                const isChosen = selectedMathTopic === tItem.id;
                return (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => onSelectMathTopic(tItem.id)}
                    className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isChosen
                        ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400/50'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{language === 'ja' ? tItem.titleJa : tItem.titleEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MEXT Quality & Pedagogical Distractor Guarantee */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-100/80 to-teal-100/80 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300/80 dark:border-emerald-800 text-xs font-medium text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">✨</span>
              <div className="min-w-0">
                <span className="font-black text-emerald-900 dark:text-emerald-100 block mb-0.5">
                  {t('Limitless Procedural Math & Pedagogical Distractor Engine', '文部科学省 学習指導要領 算数科 準拠・無限自動生成')}
                </span>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">
                  {t(
                    'Pure algorithmic math questions with authentic error traps (careless carry/borrow, operator precedence, fraction denominators). Zero JSON file bloat.',
                    '計算の順序、通分の誤り、四捨五入、単位換算などのリアルな誤答パターン（ひっかけ）を自動合成。静的ファイル不要で何問でも生成可能。'
                  )}
                </span>
              </div>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-600 text-white shrink-0 shadow-xs">
              {gamePlayType !== 'KAHOOT'
                ? `60 ${t('Questions (Arcade)', '問 (連続生成)')}`
                : questionCount === -1
                  ? `40 ${t('Questions (Max)', '問 (最大)')}`
                  : `${questionCount} ${t('Questions', '問')}`}
            </span>
          </div>
        </div>
      )}

      {/* ENGLISH MODE: Vocabulary Scope Section */}
      {subject === 'ENGLISH' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} className="text-indigo-500" />
              <span>{t('Vocabulary Scope', '出題範囲・単語プール')}</span>
            </label>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 shadow-xs">
              {wordsInPoolLength} {t('Words Selected', '語 選択中')}
            </span>
          </div>

          {/* PRIMARY HERO: Today's Lesson Units */}
          <div
            onClick={() => onSelectScope('CURRENT')}
            className={`p-4 sm:p-5 rounded-3xl border-3 transition-all cursor-pointer select-none relative mb-3 ${
              selectedScope === 'CURRENT'
                ? 'border-indigo-500 bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-indigo-50/90 dark:from-indigo-950/60 dark:via-blue-950/40 dark:to-indigo-950/60 shadow-md ring-2 ring-indigo-400/40'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[11px] tracking-wide">
                    {t("★ Primary / Today's Lesson", '★ 本日の学習単元')}
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                    {globalSelectedUnits.length > 1
                      ? `📦 ${globalSelectedUnits.length} ${t('Units Bundled', '単元バンドル')}`
                      : activeUnit !== 'ALL'
                        ? cleanUnitLabel(activeUnit)
                        : activeCategory !== 'ALL'
                          ? activeCategory
                          : t('Today’s Lesson Units', '本日の単元')}
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {scopeCounts.CURRENT} {t('words', '語')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {globalSelectedUnits.length > 1
                    ? t('Active multi-unit bundle from Hub for targeted classroom practice.', 'ホーム画面で選択中の複数単元バンドルから出題されます。')
                    : t('Active textbook unit for today’s class. Tap "Change Units" to switch or bundle.', '本日の授業で学習中の教科書単元です。別の単元とまとめたい場合は右のボタンから選択。')}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openUnitModal();
                }}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>✏️</span>
                <span>{t('Change / Bundle Units', '単元を変更・追加')}</span>
              </button>
            </div>
          </div>

          {/* SECONDARY REVIEW & EXTENDED SCOPES: Collapsible Disclosure */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
            <button
              type="button"
              onClick={onToggleExtendedScopes}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>📚</span>
                <span>{t('Other Scopes & Full Grade Review (All Units, Prior Review, Grand Slam)', 'その他の出題範囲・全単元総復習（学年全単元・過去学年・全単語）')}</span>
                {selectedScope !== 'CURRENT' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-black">
                    {selectedScope === 'GRADE_ALL'
                      ? t('Grade All', '全単元')
                      : selectedScope === 'PRIOR_REVIEW'
                        ? t('Prior Review', '過去学年')
                        : t('Grand Slam', '全単語')}
                  </span>
                )}
              </div>
              {isExtendedScopesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isExtendedScopesOpen && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-150">
                {/* Scope 2: Entire Grade */}
                <div
                  onClick={() => onSelectScope('GRADE_ALL')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none ${
                    selectedScope === 'GRADE_ALL'
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <span className="text-xs font-black leading-tight break-words flex-1">
                        {t(`All ${activeGrade}`, `${activeGrade} 全単元`)}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shrink-0">
                        {scopeCounts.GRADE_ALL} {t('words', '語')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {t(`All vocabulary words across all units of ${activeGrade}`, `${activeGrade}の全単元から幅広く出題`)}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {t('📖 Grade All Units', '📖 学年全単元')}
                    </span>
                  </div>
                </div>

                {/* Scope 3: Prior Review */}
                {hasPriorReview && (
                  <div
                    onClick={() => onSelectScope('PRIOR_REVIEW')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none ${
                      selectedScope === 'PRIOR_REVIEW'
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-sm ring-1 ring-amber-400/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <span className="text-xs font-black leading-tight break-words flex-1">{getPriorReviewTitle()}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 shrink-0">
                          {scopeCounts.PRIOR_REVIEW} {t('words', '語')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {t('Review core vocabulary from earlier elementary school years', '過去学年で習った単語の総復習')}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {t('⏪ Prior Years Review', '⏪ 過去学年の復習')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Scope 4: All Elementary Grand Slam */}
                {hasGrandSlam && (
                  <div
                    onClick={() => onSelectScope('ALL_ELEMENTARY')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none ${
                      selectedScope === 'ALL_ELEMENTARY'
                        ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-sm ring-1 ring-purple-400/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <span className="text-xs font-black leading-tight break-words flex-1">
                          {t('Elementary Grand Slam', '小学校 全単語')}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 shrink-0">
                          {scopeCounts.ALL_ELEMENTARY} {t('words', '語')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {t('Massive cumulative elementary challenge (G3–G6)', '小学校で習う全単語の総まとめバトル')}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        {t('🌟 Grand Slam Mega Quiz', '🌟 全単語マスター')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {wordsInPoolLength < 4 && (
            <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>
                {t(
                  'Minimum 4 words required for quiz questions. Please select a broader scope or bundle more units.',
                  '4択クイズ生成には最低4単語が必要です。単元を追加するか、別の範囲を選択してください。'
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};
