import React, { useState } from 'react';
import { SessionAnalytics, ItemDiagnostic } from '@/types/analytics';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { 
  Printer, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Brain, 
  Flame, 
  Compass, 
  Award,
  ChevronDown,
  ChevronUp,
  FileText,
  Volume2
} from 'lucide-react';
import { speechService } from '@/services/speechService';

interface ExecutiveDebriefViewProps {
  analytics: SessionAnalytics;
  onClose?: () => void;
  standalone?: boolean;
}

export const ExecutiveDebriefView: React.FC<ExecutiveDebriefViewProps> = ({
  analytics,
  onClose,
  standalone = false
}) => {
  const { t, language } = useLanguage();
  const { theme } = useClassroom();
  const [selectedTab, setSelectedTab] = useState<'OVERVIEW' | 'PSYCHOMETRICS' | 'SCAFFOLDING'>('OVERVIEW');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeAudioWord, setActiveAudioWord] = useState<string | null>(null);

  const formattedDate = new Date(analytics.timestamp).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  });

  const [isPrintAll, setIsPrintAll] = useState<boolean>(false);

  const handlePrint = (all: boolean = false) => {
    if (all) {
      setIsPrintAll(true);
      setTimeout(() => {
        window.print();
        setIsPrintAll(false);
      }, 100);
    } else {
      setIsPrintAll(false);
      setTimeout(() => {
        window.print();
      }, 50);
    }
  };

  const playAudio = (word: string) => {
    setActiveAudioWord(word);
    speechService.speak(word, {
      onEnd: () => setActiveAudioWord(null)
    });
  };

  // Helper for D-index badge
  const renderDiscriminationBadge = (d: number) => {
    if (d >= 0.40) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700" title={t("High discrimination power: strongly differentiates mastery from struggle", "高い識別力：習得層と要復習層を的確に識別")}>
          D={d.toFixed(2)} ★ HIGH
        </span>
      );
    }
    if (d >= 0.20) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700" title={t("Moderate discrimination power", "標準的な識別力")}>
          D={d.toFixed(2)} · GOOD
        </span>
      );
    }
    if (d >= 0) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700" title={t("Low discrimination: either universally known or universally difficult", "低い識別力：全員正解または全員苦戦")}>
          D={d.toFixed(2)} · LOW
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 animate-pulse" title={t("Negative discrimination: high-achievers fell for this distractor trap", "逆識別：上位層が引っかかったトラップ設問")}>
        D={d.toFixed(2)} ⚠️ TRAP
      </span>
    );
  };

  return (
    <div className={`w-full max-w-6xl mx-auto ${standalone ? 'p-4 sm:p-6' : 'p-2 sm:p-4'} text-slate-900 dark:text-slate-100 font-sans`}>
      {/* Print-Only Header (Hidden on Screen, Visible on Print) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4 text-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
              MEXT Elementary English Formative Learning Report / 小学校外国語 形成的評価レポート
            </div>
            <h1 className="text-2xl font-black mt-1">
              二子玉川小学校 {analytics.classId}組 · 授業分析デブリーフ
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              実施日: {formattedDate} | 単元: {analytics.unit} | 対象: {analytics.grade}
            </p>
          </div>
          <div className="text-right text-xs space-y-1">
            <div className="border border-slate-300 p-1.5 rounded text-[10px]">
              担任確認印: ________ / ALT確認印: ________
            </div>
          </div>
        </div>
      </div>

      {/* Screen Top Bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg text-xl">
            📈
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {analytics.classId} {t("Formative Debrief & Psychometrics", <><ruby>授業分析<rt>じゅぎょうぶんせき</rt></ruby>デブリーフ</>)}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                {analytics.grade}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {formattedDate} · {analytics.unit} · {analytics.gamePlayType === 'SPRINT_RACE' ? 'F1 Sprint Race' : 'Eigo Arena'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-nowrap">
          {/* Sub-tab navigation */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black">
            <button
              onClick={() => setSelectedTab('OVERVIEW')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedTab === 'OVERVIEW'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t("Overview", <><ruby>概要<rt>がいよう</rt></ruby></>)}
            </button>
            <button
              onClick={() => setSelectedTab('PSYCHOMETRICS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedTab === 'PSYCHOMETRICS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t("Item Psychometrics", <><ruby>単語別分析<rt>たんごべつぶんせき</rt></ruby></>)}
            </button>
            <button
              onClick={() => setSelectedTab('SCAFFOLDING')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedTab === 'SCAFFOLDING'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t("Co-Teaching Scaffolding", <><ruby>個別支援<rt>こべつしえん</rt></ruby> (机間指導)</>)}
            </button>
          </div>

          {/* Print Options Cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handlePrint(false)}
              className="px-3 py-2 rounded-xl font-black text-xs text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all whitespace-nowrap"
              title={t("Print Executive 1-Pager for HRT or Administration", "教員・校長提出用A4エグゼクティブレポートを印刷")}
            >
              <Printer size={14} />
              <span>{t("Print 1-Pager (PDF)", <><ruby>要約印刷<rt>ようやくいんさつ</rt></ruby> (1枚)</>)}</span>
            </button>
            <button
              onClick={() => handlePrint(true)}
              className="px-3 py-2 rounded-xl font-black text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all hidden sm:flex whitespace-nowrap"
              title={t("Print Complete 3-Page Dossier (All sections)", "全3セクション（概要・単語分析・個別支援）をまとめて印刷")}
            >
              <FileText size={14} />
              <span>{t("Print All (3-Page)", <><ruby>全項目印刷<rt>ぜんこうもくいんさつ</rt></ruby> (3枚)</>)}</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4 Executive KPI Highlight Cards (The Administrator / BoE Showcase) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Metric 1: Total Class Language Decisions (Touches) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border-2 border-blue-200 dark:border-indigo-800 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("TOTAL TOUCHES", <><ruby>総解答回数<rt>そうかいとうかいすう</rt></ruby></>)}
            </span>
            <Flame size={18} />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
            {analytics.totalClassTouches.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {t(
              `~${analytics.averageTouchesPerStudent} active language decisions per student`,
              `児童1人あたり平均約 ${analytics.averageTouchesPerStudent} 回のアクティブ判断`
            )}
          </p>
        </div>

        {/* Metric 2: Active Participation Rate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-teal-950/40 border-2 border-emerald-200 dark:border-teal-800 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("ACTIVE PARTICIPATION", <><ruby>参加率<rt>さんかりつ</rt></ruby></>)}
            </span>
            <Users size={18} />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
            {analytics.participationRate}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {analytics.activeParticipants} / {analytics.rosterSize} {t("students actively engaged", "名がiPadで同時参加")}
          </p>
        </div>

        {/* Metric 3: Overall Class Accuracy */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50 dark:from-slate-900 dark:to-orange-950/40 border-2 border-amber-200 dark:border-amber-800 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("CLASS MASTERY", <><ruby>学級正解率<rt>がっきゅうせいかいりつ</rt></ruby></>)}
            </span>
            <CheckCircle2 size={18} />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
            {analytics.overallAccuracy}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {analytics.overallAccuracy >= 80 ? t("Target comprehension achieved", "目標到達度を達成") : t("Needs targeted review", "重点復習が必要")}
          </p>
        </div>

        {/* Metric 4: Average Response Speed / Automaticity */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-purple-50 to-pink-50 dark:from-slate-900 dark:to-purple-950/40 border-2 border-purple-200 dark:border-purple-800 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("RESPONSE SPEED", <><ruby>平均即答速度<rt>へいきんそくとうそくど</rt></ruby></>)}
            </span>
            <Clock size={18} />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white">
            {(analytics.averageLatencyMs / 1000).toFixed(1)}s
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {analytics.averageLatencyMs < 2500 ? t("High cognitive automaticity", "即座の英語想起 (自動化)") : t("Processing effort observed", "想起に時間を要する段階")}
          </p>
        </div>
      </div>

      {/* Main Tab Content */}
      {(selectedTab === 'OVERVIEW' || isPrintAll) && (
        <div className={`space-y-6 ${!isPrintAll && selectedTab !== 'OVERVIEW' ? 'hidden' : ''} ${isPrintAll ? 'print:block' : ''}`}>
          {/* Automated JTE Warm-Up Generator Box (Actionable for Next Lesson) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-rose-950/30 border-2 border-amber-300 dark:border-amber-700/60 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🪄</span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {t("AUTOMATED JTE LESSON PLANNER · NEXT CLASS ACTION", <><ruby>次回授業提案<rt>じかいじゅぎょうていあん</rt></ruby> · ウォームアップ案</>)}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2">
              {language === 'ja' ? analytics.warmUpRecommendation.jaActivityType : analytics.warmUpRecommendation.activityType}
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                3-min Warm-Up
              </span>
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-4">
              {language === 'ja' ? analytics.warmUpRecommendation.instructionJa : analytics.warmUpRecommendation.instructionEn}
            </p>
            {analytics.warmUpRecommendation.targetWords.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("Target Review Vocabulary:", "重点復習単語:")}
                </span>
                {analytics.warmUpRecommendation.targetWords.map(word => (
                  <button
                    key={word}
                    onClick={() => playAudio(word)}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 border border-amber-300 dark:border-amber-700 text-xs font-black text-amber-800 dark:text-amber-300 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 size={13} className={activeAudioWord === word ? 'text-amber-500 animate-bounce' : ''} />
                    <span>{word}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Side-by-Side: Cognitive Fluency Latency + Stamina Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cognitive Latency Quadrants */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-base font-black">
                    {t("Cognitive Fluency Quadrant", <><ruby>認知想起<rt>にんちそうき</rt></ruby>スピード<ruby>分布<rt>ぶんぷ</rt></ruby></>)}
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-slate-400">Total: {analytics.totalClassTouches} responses</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Fast & Correct */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                  <div className="flex justify-between items-center mb-1 text-emerald-700 dark:text-emerald-300 font-black">
                    <span>⚡ {t("Automaticity", <><ruby>即座想起<rt>そくざそうき</rt></ruby></>)}</span>
                    <span className="text-base font-mono">{analytics.latencyQuadrants.fastCorrect}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {t("Correct in < 2.5s (True Mastery)", "2.5秒未満で正解（確実な定着）")}
                  </p>
                </div>

                {/* Slow & Correct */}
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800">
                  <div className="flex justify-between items-center mb-1 text-blue-700 dark:text-blue-300 font-black">
                    <span>🤔 {t("Processing", <><ruby>思考想起<rt>しこうそうき</rt></ruby></>)}</span>
                    <span className="text-base font-mono">{analytics.latencyQuadrants.slowCorrect}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {t("Correct in ≥ 2.5s (Cognitive effort)", "2.5秒以上で正解（想起に努力）")}
                  </p>
                </div>

                {/* Fast & Incorrect */}
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <div className="flex justify-between items-center mb-1 text-rose-700 dark:text-rose-300 font-black">
                    <span>🎲 {t("Impulsive Guess", <><ruby>直感推測<rt>ちょっかんすいそく</rt></ruby></>)}</span>
                    <span className="text-base font-mono">{analytics.latencyQuadrants.fastIncorrect}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {t("Incorrect in < 1.5s (Button mashing)", "1.5秒未満で誤答（連打・当て推量）")}
                  </p>
                </div>

                {/* Slow & Incorrect */}
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                  <div className="flex justify-between items-center mb-1 text-amber-700 dark:text-amber-300 font-black">
                    <span>🛑 {t("Confusion", <><ruby>迷い誤答<rt>まよいごとう</rt></ruby></>)}</span>
                    <span className="text-base font-mono">{analytics.latencyQuadrants.slowIncorrect}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    {t("Incorrect in ≥ 1.5s (Genuine struggle)", "1.5秒以上で誤答（理解のつまずき）")}
                  </p>
                </div>
              </div>
            </div>

            {/* Stamina & Fatigue Curve (if Lap Buckets exist) */}
            {analytics.lapBuckets && analytics.lapBuckets.length > 0 ? (
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-base font-black">
                      {t("Endurance & Stamina Curve", <><ruby>周回持続力<rt>しゅうかいじぞくりょく</rt></ruby> (疲労カーブ)</>)}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {analytics.totalPitStops || 0} {t("pit stops incurred", "回のピットストップ発生")}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {analytics.lapBuckets.map(bucket => (
                    <div key={bucket.lapRange} className="flex items-center gap-3 text-xs">
                      <span className="w-24 font-bold text-slate-500 dark:text-slate-400 shrink-0">
                        {bucket.lapRange}
                      </span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-5 rounded-full overflow-hidden flex items-center p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            bucket.accuracy >= 85
                              ? 'bg-emerald-500'
                              : bucket.accuracy >= 70
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(5, bucket.accuracy)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-black font-mono">
                        {bucket.accuracy}%
                      </span>
                      <span className="w-14 text-right text-[10px] text-slate-400 font-mono">
                        {(bucket.averageLatencyMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center items-center text-center">
                <Compass size={32} className="text-slate-400 mb-2" />
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                  {t("Whole-Class Synchronized Mode", "クラス一斉同期モード")}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {t("All students moved at identical teacher-directed question pacing.", "全児童が先生の進行にあわせて同一ペースで解答しました。")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Item Psychometrics & Distractor Heatmap */}
      {(selectedTab === 'PSYCHOMETRICS' || isPrintAll) && (
        <div className={`space-y-4 ${!isPrintAll && selectedTab !== 'PSYCHOMETRICS' ? 'hidden' : ''} ${isPrintAll ? 'print:block print:break-before-page' : ''}`}>
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <span className="text-base">💡</span>
            <div>
              <span className="font-black block mb-0.5">
                {t("Psychometric Measurement Guide (Item Response Theory)", "統計指標（項目応答理論・難易度と識別力）の見方")}
              </span>
              <p className="leading-relaxed text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                {t(
                  "Difficulty Index (p-value): percentage correct. Discrimination Index (D-index): indicates whether higher-scoring students outperformed lower-scoring students on this item. D ≥ 0.40 indicates high quality; D < 0 highlights tricky distractors.",
                  "難易度（p値）: 正解した児童の割合。識別力（D値）: 上位27%と下位27%の児童の正解率の差。D値が0.40以上は高い学習到達度の差を測る良問。マイナスの場合は上位層が引っかかる紛らわしい選択肢の存在を示します。"
                )}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                    <th className="p-3">Target Word / 単語</th>
                    <th className="p-3">Attempts / 試行数</th>
                    <th className="p-3">Accuracy (p-value)</th>
                    <th className="p-3">Discrimination (D-index)</th>
                    <th className="p-3">Latency / 速度</th>
                    <th className="p-3">Error Typology / 誤答傾向</th>
                    <th className="p-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.values(analytics.items).map(item => {
                    const isExpanded = expandedItem === item.wordId;
                    return (
                      <React.Fragment key={item.wordId}>
                        <tr 
                          onClick={() => setExpandedItem(isExpanded ? null : item.wordId)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="p-3 font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); playAudio(item.english); }}
                              className="text-slate-400 hover:text-indigo-600"
                              title="Listen"
                            >
                              <Volume2 size={13} />
                            </button>
                            <span>{item.english}</span>
                            <span className="text-[11px] font-normal text-slate-400 font-japanese">({item.ja})</span>
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {item.totalAttempts}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-black ${
                                item.accuracy >= 85 ? 'text-emerald-600 dark:text-emerald-400' : item.accuracy >= 70 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {item.accuracy}%
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                (p={item.difficultyIndex.toFixed(2)})
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            {renderDiscriminationBadge(item.discriminationIndex)}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {(item.averageLatencyMs / 1000).toFixed(1)}s
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.errorTypology}
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-400">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                        </tr>

                        {/* Expanded Distractor Breakdown Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80 dark:bg-slate-950/60">
                            <td colSpan={7} className="p-4 border-t border-slate-200 dark:border-slate-800">
                              <div className="text-xs space-y-2">
                                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block">
                                  {t("Distractor Confusion Analysis (Which wrong choices students picked):", "誤答選択肢の内訳（児童がどこで迷ったか）:")}
                                </span>
                                {item.distractorBreakdown && item.distractorBreakdown.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {item.distractorBreakdown.map(dist => (
                                      <div key={dist.optionId} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                                        <span className="font-bold text-rose-600 dark:text-rose-400 truncate max-w-[150px]">
                                          ❌ {dist.text}
                                        </span>
                                        <span className="font-mono text-slate-500">
                                          {dist.count} 人 ({dist.percentage}%)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-emerald-600 font-bold">
                                    {t("No distractor confusion logged for this item.", "この単語における誤答選択肢の偏りはありません。")}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Co-Teaching Scaffolding & Quiet Achievers */}
      {(selectedTab === 'SCAFFOLDING' || isPrintAll) && (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${!isPrintAll && selectedTab !== 'SCAFFOLDING' ? 'hidden' : ''} ${isPrintAll ? 'print:grid print:break-before-page' : ''}`}>
          {/* Desk-Circling (机間巡視) Scaffolding Targets */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/60 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={18} />
              <h4 className="text-base font-black">
                {t("Desk-Circling Scaffolding Targets", <><ruby>机間巡視<rt>きかんじゅんし</rt></ruby> · <ruby>個別声<rt>こべつこえ</rt></ruby>かけ対象</>)}
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t(
                "Students who encountered repeated pit stops or high struggle. Walk over discreetly during textbook writing or pair work to offer 1-on-1 encouragement.",
                "誤答が連続した児童です。後半のペアワークや教科書への書き込み時間中に、さりげなく声かけを行ってフォローしましょう。"
              )}
            </p>

            <div className="space-y-3">
              {analytics.supportStudents.length > 0 ? (
                analytics.supportStudents.map(student => (
                  <div key={student.attendanceNumber || student.nickname} className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{student.avatar || '👤'}</span>
                      <div>
                        <div className="font-black text-xs text-slate-900 dark:text-white">
                          {student.attendanceNumber > 0 ? `#${student.attendanceNumber} ` : ''}{student.nickname}
                        </div>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                          {language === 'ja' ? student.jaFocusNeed : student.focusNeed}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                        {student.accuracy}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {student.pitStops} {t("pit stops", "回ミス")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-emerald-600 font-bold">
                  {t("No high-struggle students identified. Whole class performed above baseline!", "要フォローの児童はいません。クラス全員が基準以上の定着を達成しました！")}
                </div>
              )}
            </div>
          </div>

          {/* Quiet Achiever Recognition */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/60 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
              <Award size={18} />
              <h4 className="text-base font-black">
                {t("Quiet Achiever Recognition", <><ruby>静<rt>しず</rt></ruby>かな<ruby>実力者<rt>じつりょくしゃ</rt></ruby> (積極性の発見)</>)}
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t(
                "Students who rarely volunteer aloud, but demonstrated 85%+ accuracy on their iPads. Useful evidence for term evaluation (関心・意欲・態度).",
                "普段あまり挙手しない場合でも、個人端末で高い正解率と集中力を発揮した児童です。通知表（あゆみ）の評価材料としてご活用ください。"
              )}
            </p>

            <div className="space-y-3">
              {analytics.quietAchievers.length > 0 ? (
                analytics.quietAchievers.map(student => (
                  <div key={student.attendanceNumber || student.nickname} className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{student.avatar || '⭐'}</span>
                      <div>
                        <div className="font-black text-xs text-slate-900 dark:text-white">
                          {student.attendanceNumber > 0 ? `#${student.attendanceNumber} ` : ''}{student.nickname}
                        </div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">
                          Streak: {student.streak} 🔥 · {student.totalTouches} questions completed
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {student.accuracy}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {(student.averageLatencyMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  {t("No specific quiet achievers logged for this sample size.", "十分なサンプルデータがありません。")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
