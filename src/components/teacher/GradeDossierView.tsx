import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { SchoolId, SCHOOL_CONFIGS } from '@/types/roster';
import { SessionAnalytics } from '@/types/analytics';
import { 
  Printer, 
  FileText, 
  ArrowLeft, 
  Flame, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  TrendingUp, 
  Award,
  Layers
} from 'lucide-react';
import { ExecutiveDebriefView } from './ExecutiveDebriefView';

interface ClassSessionBundle {
  classId: string;
  session?: SessionAnalytics;
}

interface GradeDossierViewProps {
  schoolId: SchoolId;
  grade: string;
  classesData: ClassSessionBundle[];
  onClose: () => void;
}

export const GradeDossierView: React.FC<GradeDossierViewProps> = ({
  schoolId,
  grade,
  classesData,
  onClose
}) => {
  const { t, language } = useLanguage();
  const [printMode, setPrintMode] = useState<'ALL' | 'SUMMARY_ONLY'>('ALL');

  const schoolConfig = SCHOOL_CONFIGS[schoolId];
  const schoolName = schoolConfig ? (language === 'ja' ? schoolConfig.name : schoolConfig.name) : 'Futakotamagawa Elementary';

  // Extract classes that have active session data
  const activeBundles = classesData.filter(b => !!b.session);
  const activeSessions = activeBundles.map(b => b.session!);

  // Aggregated Grade Metrics
  const totalGradeTouches = activeSessions.reduce((sum, s) => sum + s.totalClassTouches, 0);
  const totalActiveStudents = activeSessions.reduce((sum, s) => sum + s.activeParticipants, 0);
  const totalRoster = activeSessions.reduce((sum, s) => sum + s.rosterSize, 0);
  const averageAccuracy = activeSessions.length > 0
    ? Math.round((activeSessions.reduce((sum, s) => sum + s.overallAccuracy, 0) / activeSessions.length) * 10) / 10
    : 0;
  const averageLatencySec = activeSessions.length > 0
    ? Math.round((activeSessions.reduce((sum, s) => sum + s.averageLatencyMs, 0) / activeSessions.length / 1000) * 10) / 10
    : 0;

  // Grade-wide trouble word aggregation: words missed across multiple classes
  const troubleWordMap = new Map<string, { english: string; ja: string; missCount: number; classes: string[] }>();
  activeBundles.forEach(({ classId, session }) => {
    if (!session) return;
    session.topMissedWords.forEach(m => {
      const existing = troubleWordMap.get(m.wordId) || {
        english: m.english,
        ja: m.ja,
        missCount: 0,
        classes: []
      };
      existing.missCount += m.incorrectAttempts;
      if (!existing.classes.includes(classId)) existing.classes.push(classId);
      troubleWordMap.set(m.wordId, existing);
    });
  });

  const gradeWideTroubleWords = Array.from(troubleWordMap.values())
    .sort((a, b) => b.classes.length - a.classes.length || b.missCount - a.missCount)
    .slice(0, 6);

  const formattedDate = new Date().toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });

  const handlePrint = (mode: 'ALL' | 'SUMMARY_ONLY') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-6 text-slate-900 dark:text-slate-100 font-sans print:p-0 print:max-w-none print:bg-white print:text-black">
      {/* Top Screen Controls */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={t("Back to Reports Hub", "一覧にもどる")}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📑</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {t(`Grade ${grade} Comprehensive Daily Dossier`, <><ruby>{grade}学年<rt className="text-[7px]">がくねん</rt></ruby> · <ruby>合同授業分析<rt className="text-[7px]">ごうどうじゅぎょうぶんせき</rt></ruby>デブリーフ</>)}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                {activeBundles.length} {t("Classes Recorded Today", "クラス記録")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formattedDate} · {schoolName}
            </p>
          </div>
        </div>

        {/* Print Options */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handlePrint('SUMMARY_ONLY')}
            className="px-4 py-2.5 rounded-2xl font-black text-xs text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            title={t("Print Executive 1-Page Grade Summary for Principal & Grade Head", "校長・学年主任提出用の学年合同サマリー（1枚）を印刷")}
          >
            <Printer size={15} />
            <span>{t("Print Grade Summary (1-Page)", <><ruby>学年総括印刷<rt className="text-[7px]">がくねんそうかついんさつ</rt></ruby> (1枚)</>)}</span>
          </button>

          <button
            onClick={() => handlePrint('ALL')}
            className="px-4 py-2.5 rounded-2xl font-black text-xs text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            title={t("Print Full Dossier: Grade Summary + 1 page per class for HRTs", "学年全体サマリー＋各担任用カルテをまとめて印刷")}
          >
            <Layers size={15} />
            <span>{t(`Print Full Dossier (${activeBundles.length + 1}-Pages)`, <><ruby>学年一括印刷<rt className="text-[7px]">がくねんいっかついんさつ</rt></ruby> ({activeBundles.length + 1}枚)</>)}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: GRADE-WIDE EXECUTIVE OVERVIEW (A4)                                */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-none print:p-0 mb-8 print:mb-0 print:break-after-page">
        {/* Print Official Header with MEXT Hanko Seal Verification Boxes */}
        <div className="mb-6 border-b-2 border-slate-900 pb-4 text-slate-900 dark:text-slate-100 print:text-black">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                MEXT Formative Learning Evaluation · Grade-Wide Curriculum Dossier / 小学校外国語科 学習到達度デイリー総括カルテ
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">
                {schoolName} 第{grade}学年 外国語科 · 授業分析デイリー総括レポート
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 mt-1">
                実施日: {formattedDate} | 対象: 第{grade}学年（全{activeBundles.length}学級合同） | 担当ALT: Levi Sensei
              </p>
            </div>

            {/* Official Hanko Stamp Verification Boxes */}
            <div className="shrink-0 text-right space-y-1">
              <div className="border border-slate-400 p-2 rounded-lg text-[10px] font-bold text-center bg-slate-50 print:bg-white space-y-1">
                <div className="text-[9px] uppercase tracking-wider text-slate-500">公印・確認印</div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-300">
                  <div className="w-14 h-12 border border-slate-300 rounded flex flex-col justify-between p-1">
                    <span className="text-[8px] text-slate-400">学年主任</span>
                  </div>
                  <div className="w-14 h-12 border border-slate-300 rounded flex flex-col justify-between p-1">
                    <span className="text-[8px] text-slate-400">JTE専科</span>
                  </div>
                  <div className="w-14 h-12 border border-slate-300 rounded flex flex-col justify-between p-1">
                    <span className="text-[8px] text-slate-400">ALT確認</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Macro Grade KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 border-2 border-blue-200 dark:border-indigo-800">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("GRADE TOUCHES", <><ruby>学年総解答数<rt className="text-[7px]">がくねんそうかいとうすう</rt></ruby></>)}
              </span>
              <Flame size={18} />
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white print:text-black">
              {totalGradeTouches.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Across all {activeBundles.length} classes evaluated
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-teal-950/40 border-2 border-emerald-200 dark:border-teal-800">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("GRADE ACCURACY", <><ruby>学年平均正解率<rt className="text-[7px]">がくねんへいきんせいかいりつ</rt></ruby></>)}
              </span>
              <CheckCircle2 size={18} />
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white print:text-black">
              {averageAccuracy}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Target benchmark: &gt; 80% mastery
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-tr from-purple-50 to-pink-50 dark:from-slate-800 dark:to-purple-950/40 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("STUDENTS EVALUATED", <><ruby>参加児童総数<rt className="text-[7px]">さんかじどうそうすう</rt></ruby></>)}
              </span>
              <Users size={18} />
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white print:text-black">
              {totalActiveStudents} <span className="text-sm font-normal text-slate-400">/ {totalRoster}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {totalRoster > 0 ? Math.round((totalActiveStudents / totalRoster) * 100) : 100}% participation rate
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50 dark:from-slate-800 dark:to-amber-950/40 border-2 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("RETRIEVAL SPEED", <><ruby>平均想起速度<rt className="text-[7px]">へいきんそうきそくど</rt></ruby></>)}
              </span>
              <Clock size={18} />
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white print:text-black">
              {averageLatencySec}s
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Average cognitive retrieval per decision
            </p>
          </div>
        </div>

        {/* Section 1: Cross-Class Performance Matrix */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>📊</span>
              <span>{t("Cross-Class Equity & Comparative Performance Matrix", <><ruby>学級間到達度比較<rt className="text-[7px]">がっきゅうかんとうたつどひかく</rt></ruby>マトリクス</>)}</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              {t("Formative evaluation across all Grade 6 classes", "第6学年全クラスの形成的評価比較")}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-black border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">{t("Class", "学級")}</th>
                  <th className="py-2.5 px-3">{t("Unit / Game Mode", "単元・実施形式")}</th>
                  <th className="py-2.5 px-3 text-center">{t("Participants", "参加人数")}</th>
                  <th className="py-2.5 px-3 text-center">{t("Class Touches", "言語判断数")}</th>
                  <th className="py-2.5 px-3 text-center">{t("Accuracy", "正解率")}</th>
                  <th className="py-2.5 px-3 text-center">{t("Speed", "平均速度")}</th>
                  <th className="py-2.5 px-3">{t("Top Struggle Vocabulary", "主な要復習単語")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeBundles.map(({ classId, session }) => {
                  if (!session) return null;
                  const topStruggle = session.topMissedWords.slice(0, 2).map(m => m.english).join(', ') || 'None (100% Mastery)';
                  return (
                    <tr key={classId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-black text-indigo-600 dark:text-indigo-400">
                        {classId}組
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                        {session.unit} ({session.gamePlayType === 'SPRINT_RACE' ? 'F1 Sprint' : 'Eigo Arena'})
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {session.activeParticipants} / {session.rosterSize}名
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {session.totalClassTouches.toLocaleString()}回
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                          session.overallAccuracy >= 80 
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          {session.overallAccuracy}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {(session.averageLatencyMs / 1000).toFixed(1)}s
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-bold truncate max-w-[200px]">
                        {topStruggle}
                      </td>
                    </tr>
                  );
                })}
                {/* Summary Row */}
                <tr className="bg-slate-50 dark:bg-slate-800/60 font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white print:text-black">
                  <td className="py-2.5 px-3">
                    学年全体 (Total)
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-medium">
                    全{activeBundles.length}学級総合
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {totalActiveStudents}名
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-indigo-600 dark:text-indigo-400">
                    {totalGradeTouches.toLocaleString()}回
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md font-mono font-black text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {averageAccuracy}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {averageLatencySec}s
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-medium text-[11px]">
                    {gradeWideTroubleWords.slice(0, 2).map(w => w.english).join(', ')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Grade-Wide Curriculum Blindspot Watchlist */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{t("Grade-Wide Curriculum Blindspots (Shared Struggle Items)", <><ruby>学年共通つまずき単語<rt className="text-[7px]">がくねんきょうつうつまずきたんご</rt></ruby>リスト</>)}</span>
            </h3>
            <span className="text-[10px] font-bold text-rose-500">
              {t("Items missed across multiple classes indicate curriculum pacing cues", "複数クラスで共通して誤答が目立った単語")}
            </span>
          </div>

          {gradeWideTroubleWords.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300">
              🎉 素晴らしい定着度です！学年全体で目立った共通つまずき単語はありませんでした。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gradeWideTroubleWords.map(w => (
                <div key={w.english} className="p-3.5 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 flex items-start justify-between">
                  <div>
                    <strong className="text-sm font-black text-slate-900 dark:text-white block">
                      {w.english}
                    </strong>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-bold block">
                      {w.ja}
                    </span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 inline-block">
                      {w.classes.join(', ')}組で誤答確認 ({w.missCount}回誤答)
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-black">
                    {w.classes.length}クラス共通
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: ALT / JTE Collaborative Action Plan */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">👨‍🏫</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t("ALT & JTE Next Lesson Collaborative Action Plan", "次期授業に向けたALT・JTE連携指導方針")}
            </h4>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            {gradeWideTroubleWords.length > 0 ? (
              <>
                次回授業の冒頭3分間において、学年共通で混同が確認された 
                <strong className="text-indigo-600 dark:text-indigo-400 mx-1">
                  [{gradeWideTroubleWords.slice(0, 3).map(w => `${w.english} (${w.ja})`).join(' · ')}]
                </strong> 
                を重点ターゲットとしたリズムチャンツ（コーラルリピート）およびTPR身体動作を用いた発音識別ウォームアップを実施します。
                特に音声とスペルの結びつきを視覚フラッシュカードで補強し、全員の即時想起（1.5秒以内）への引き上げを図ります。
              </>
            ) : (
              <>
                本日のクイズにおいて学年全体で極めて高い正解率（{averageAccuracy}%）を達成しました。
                次回は単語単体の想起から、文構造（I want to / Where is...）への拡張アクティビティへと段階的にステップアップします。
              </>
            )}
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PAGES 2–N: INDIVIDUAL HOMEROOM TEACHER CLASS DEBRIEFS (A4)               */}
      {/* Only rendered when printMode === 'ALL' or on screen browsing              */}
      {/* ========================================================================= */}
      {printMode === 'ALL' && (
        <div className="space-y-8 print:space-y-0">
          {activeBundles.map(({ classId, session }) => {
            if (!session) return null;
            return (
              <div 
                key={classId} 
                className="print:break-before-page pt-4 border-t-4 border-dashed border-slate-200 dark:border-slate-800 print:border-none print:pt-0"
              >
                <div className="print:hidden mb-3 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>📄</span>
                    <span>{classId}組 担任用 A4デブリーフシート</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    印刷時は自動的に次ページに改ページされます
                  </span>
                </div>

                <ExecutiveDebriefView
                  analytics={session}
                  standalone
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
