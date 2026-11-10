import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { SchoolId, SCHOOL_CONFIGS } from '@/types/roster';
import { SessionAnalytics, ClassAnalyticsSummary } from '@/types/analytics';
import { fetchClassSessions, fetchClassAnalyticsSummary } from '@/services/analyticsEngine';
import { ExecutiveDebriefView } from './ExecutiveDebriefView';
import { GradeDossierView } from './GradeDossierView';
import { 
  FileText, 
  Flame, 
  Users, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  Printer, 
  Sparkles,
  BookOpen,
  AlertCircle,
  Layers
} from 'lucide-react';

export const ClassroomReportsHub: React.FC = () => {
  const { t, language } = useLanguage();
  const { activeSchool, setActiveSchool, activeClassId, setActiveClassId, exitToHub } = useClassroom();

  const [selectedSchool, setSelectedSchool] = useState<SchoolId>(activeSchool || 'futakotamagawa');
  const [gradeFilter, setGradeFilter] = useState<'6' | '5' | 'ALL'>('6');
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (activeClassId) return activeClassId;
    const day = new Date().getDay();
    if (day === 5) return '6-4'; // Friday Period 1
    if (day === 4) return '5-4'; // Thursday Period 1
    return '6-4';
  });
  const [sessions, setSessions] = useState<SessionAnalytics[]>([]);
  const [classSummary, setClassSummary] = useState<ClassAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSession, setActiveSession] = useState<SessionAnalytics | null>(null);

  // Grade Dossier aggregation state
  const [isDossierViewOpen, setIsDossierViewOpen] = useState<boolean>(false);
  const [gradeSessionsData, setGradeSessionsData] = useState<{ classId: string; session?: SessionAnalytics }[]>([]);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);

  const schoolConfig = SCHOOL_CONFIGS[selectedSchool];
  const allClasses = schoolConfig?.classes || ['6-1', '6-2', '6-3', '6-4', '5-1', '5-2', '5-3', '5-4'];
  const availableClasses = gradeFilter === 'ALL'
    ? allClasses
    : allClasses.filter(c => c.startsWith(`${gradeFilter}-`));

  // Load sessions and class summary
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    Promise.all([
      fetchClassSessions(selectedSchool, selectedClass),
      fetchClassAnalyticsSummary(selectedSchool, selectedClass)
    ]).then(([sessList, summary]) => {
      if (!isSubscribed) return;
      setSessions(sessList);
      setClassSummary(summary);
      setLoading(false);
    }).catch(err => {
      console.warn('Error loading class analytics in hub:', err);
      if (isSubscribed) setLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [selectedSchool, selectedClass]);

  const handleSchoolChange = (sId: SchoolId) => {
    setSelectedSchool(sId);
    setActiveSchool(sId);
    const classes = SCHOOL_CONFIGS[sId]?.classes || [];
    if (classes.length > 0) {
      setSelectedClass(classes[0]);
      setActiveClassId(classes[0]);
    }
  };

  const handleClassChange = (cId: string) => {
    setSelectedClass(cId);
    setActiveClassId(cId);
  };

  const handleGradeFilterChange = (filter: '6' | '5' | 'ALL') => {
    setGradeFilter(filter);
    const filtered = filter === 'ALL' ? allClasses : allClasses.filter(c => c.startsWith(`${filter}-`));
    if (filtered.length > 0 && !filtered.includes(selectedClass)) {
      handleClassChange(filtered[0]);
    }
  };

  const handleOpenGradeDossier = async () => {
    setLoadingDossier(true);
    try {
      const targetGrade = gradeFilter === '5' ? '5' : '6';
      const gradeClasses = allClasses.filter(c => c.startsWith(`${targetGrade}-`));

      const results = await Promise.all(
        gradeClasses.map(async (cId) => {
          try {
            const classSess = await fetchClassSessions(selectedSchool, cId);
            return {
              classId: cId,
              session: classSess[0] || undefined
            };
          } catch (e) {
            console.warn(`Error fetching session for ${cId}:`, e);
            return { classId: cId, session: undefined };
          }
        })
      );

      setGradeSessionsData(results);
      setIsDossierViewOpen(true);
    } catch (err) {
      console.error('Failed to load grade dossier data:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  if (isDossierViewOpen) {
    const currentGrade = gradeFilter === '5' ? '5' : '6';
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 print:p-0 print:bg-white print:min-h-0">
        <div className="max-w-6xl mx-auto mb-4 print:hidden">
          <button
            onClick={() => setIsDossierViewOpen(false)}
            className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{t("Back to Session History", <><ruby>履歴一覧<rt className="text-[7px]">りれきいちらん</rt></ruby>にもどる</>)}</span>
          </button>
        </div>
        <GradeDossierView
          grade={currentGrade}
          schoolId={selectedSchool}
          classesData={gradeSessionsData}
          onClose={() => setIsDossierViewOpen(false)}
        />
      </div>
    );
  }

  if (activeSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 print:p-0 print:bg-white print:min-h-0">
        <div className="max-w-6xl mx-auto mb-4 print:hidden">
          <button
            onClick={() => setActiveSession(null)}
            className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{t("Back to Session History", <><ruby>履歴一覧<rt className="text-[7px]">りれきいちらん</rt></ruby>にもどる</>)}</span>
          </button>
        </div>
        <ExecutiveDebriefView
          analytics={activeSession}
          onClose={() => setActiveSession(null)}
          standalone
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-3 sm:px-6 text-slate-900 dark:text-white font-sans print:bg-white print:p-0 print:min-h-0">
      <div className="max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {t("Classroom Analytics & Debrief Studio", <><ruby>学級授業分析<rt className="text-[7px]">がっきゅうじゅぎょうぶんせき</rt></ruby> & デブリーフスタジオ</>)}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "MEXT Formative Learning Evaluation · Psychometrics, Item Difficulty & Cognitive Fluency Reports",
                "文部科学省 外国語科学習到達度 · 項目応答分析（p値・D値）と認知想起スピードレポート"
              )}
            </p>
          </div>

          {/* School & Class Selectors */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* School Selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black">
              {(Object.keys(SCHOOL_CONFIGS) as SchoolId[]).map(sId => (
                <button
                  key={sId}
                  onClick={() => handleSchoolChange(sId)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedSchool === sId
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {SCHOOL_CONFIGS[sId]?.shortKanji || sId}
                </button>
              ))}
            </div>

            {/* Grade Filter */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black">
              {(['6', '5', 'ALL'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => handleGradeFilterChange(g)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    gradeFilter === g
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {g === 'ALL' ? t("All Grades", "全学年") : t(`Grade ${g}`, `${g}年`)}
                </button>
              ))}
            </div>

            {/* Class Buttons Grid */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-none p-1 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              {availableClasses.map(cId => (
                <button
                  key={cId}
                  onClick={() => handleClassChange(cId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedClass === cId
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cId}
                </button>
              ))}
            </div>

            {/* Grade Dossier (All Classes in Grade) */}
            <button
              onClick={handleOpenGradeDossier}
              disabled={loadingDossier}
              className="px-3 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title={t("Open full grade multi-class debrief packet", "学年合同デブリーフ・全学級印刷パックを開く")}
            >
              <Layers size={14} className={loadingDossier ? "animate-spin" : ""} />
              <span>
                {loadingDossier
                  ? t("Loading...", "読込中...")
                  : (gradeFilter === '5' ? t("Grade 5 Dossier", "5年 合同デブリーフ") : t("Grade 6 Dossier", "6年 合同デブリーフ"))
                }
              </span>
            </button>

            {/* Print Hub Overview */}
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
              title={t("Print this history list", "この一覧を印刷")}
            >
              <Printer size={14} />
              <span className="hidden sm:inline">{t("Print", "印刷")}</span>
            </button>
          </div>
        </div>

        {/* Lifetime Class Impact Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                {t("LIFETIME CLASS TOUCHES", <><ruby>累計言語判断数<rt className="text-[7px]">るいけいげんごはんだんすう</rt></ruby></>)}
              </span>
              <Flame size={20} className="text-amber-300 animate-pulse" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono">
              {(classSummary?.cumulativeClassTouches || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-indigo-100 mt-1 font-medium">
              {t("Total active student language decisions logged", "児童が個人端末で自ら判断した累計解答数")}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                {t("CUMULATIVE ACCURACY", <><ruby>通算平均正解率<rt className="text-[7px]">つうさんへいきんせいかいりつ</rt></ruby></>)}
              </span>
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
              {classSummary?.averageClassAccuracy || 0}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Across {classSummary?.totalSessionsRecorded || 0} recorded sessions
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                {t("CLASS ROSTER SIZE", <><ruby>学級定員<rt className="text-[7px]">がっきゅうていいん</rt></ruby></>)}
              </span>
              <Users size={20} className="text-blue-500" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
              {schoolConfig?.classSizes?.[selectedClass] || 25} {t("students", "名")}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {selectedSchool === 'futakotamagawa' ? '二子玉川小' : '豊ヶ丘小'} {selectedClass}組
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>{t("Recorded Sessions History", <><ruby>授業記録一覧<rt className="text-[7px]">じゅぎょうきろくいちらん</rt></ruby></>)}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {sessions.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 font-bold">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
              <span>{t("Loading session analytics...", "授業記録を読み込み中...")}</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 text-center">
              <FileText size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-700 dark:text-slate-300 mb-1">
                {t("No Recorded Sessions Yet for this Class", "このクラスの記録はまだありません")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {t(
                  "Launch a quiz game (Eigo Arena or F1 Sprint) with this class selected to automatically record high-resolution learning analytics.",
                  "このクラスを選択した状態でクイズバトルまたはF1スプリントを実施すると、自動的に高精度な分析データが蓄積されます。"
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(sess => {
                const dateStr = new Date(sess.timestamp).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={sess.id}
                    onClick={() => setActiveSession(sess)}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                        sess.gamePlayType === 'SPRINT_RACE'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {sess.gamePlayType === 'SPRINT_RACE' ? '🏎️' : '🏆'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {sess.unit}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {sess.gamePlayType === 'SPRINT_RACE' ? 'F1 Race' : 'Eigo Arena'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={12} /> {dateStr}
                          </span>
                          <span>·</span>
                          <span>{sess.activeParticipants} {t("active students", "名参加")}</span>
                          <span>·</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {sess.totalClassTouches} {t("touches", "回解答")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center sm:justify-end gap-1.5">
                          <span className={`text-xl font-black font-mono ${
                            sess.overallAccuracy >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {sess.overallAccuracy}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{t("Accuracy", "正解率")}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Avg: {(sess.averageLatencyMs / 1000).toFixed(1)}s / decision
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
