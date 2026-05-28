import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { ref, get, onValue } from 'firebase/database';
import { RubyText } from '../components/RubyText';
import flatVocab from '../data/normalized_vocabulary.json';
import { useAuth } from '../hooks/useAuth';
import { TeacherSchoolDropdown } from '../components/TeacherSchoolDropdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminAnalytics({ t, lang }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState('grade6');
  const [sessionsData, setSessionsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSchoolId, setActiveSchoolId] = useState('');

  // Fetch active school
  useEffect(() => {
    if (!user) return;
    const teacherRef = ref(db, `users/${user.uid}/teacherProfile`);
    const unsub = onValue(teacherRef, (snap) => {
      if (snap.exists() && snap.val().schoolId) {
        setActiveSchoolId(snap.val().schoolId);
      }
    });
    return () => unsub();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!activeSchoolId) return;
    setLoading(true);
    try {
      // Fetch both old data (troubleWords) and new data (gameSessions) for backward compatibility
      const sessionsSnap = await get(ref(db, `analytics/gameSessions/${activeSchoolId}/${selectedGrade}`));
      const legacySnap = await get(ref(db, `analytics/troubleWords/${activeSchoolId}/${selectedGrade}`));
      
      const sessions = sessionsSnap.val() ? Object.values(sessionsSnap.val()) : [];
      const legacy = legacySnap.val() ? Object.values(legacySnap.val()) : [];
      
      // Merge them, prioritizing new sessions if they have the same timestamp
      const allSessions = [...legacy, ...sessions].sort((a, b) => a.timestamp - b.timestamp);
      
      setSessionsData(allSessions);
    } catch (e) {
      console.error(e);
      setSessionsData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeSchoolId) {
      fetchAnalytics();
    }
  }, [selectedGrade, activeSchoolId]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    if (!sessionsData || sessionsData.length === 0) return null;

    let totalGames = sessionsData.length;
    let totalQuestionsAnswered = 0;
    let sumParticipation = 0;
    let participationGames = 0;
    let sumAccuracy = 0;
    let accuracyGames = 0;
    let sumSpeed = 0;
    let speedGames = 0;
    let absoluteFastest = 999999;
    let sumScore = 0;

    const wordStats = {};

    sessionsData.forEach(game => {
       if (game.playerCount) {
         sumParticipation += game.playerCount;
         participationGames++;
       }
       if (game.averageAccuracy) {
         sumAccuracy += game.averageAccuracy;
         accuracyGames++;
       }
       if (game.averageResponseTime) {
         sumSpeed += game.averageResponseTime;
         speedGames++;
       }
       if (game.fastestResponseTime && game.fastestResponseTime > 0) {
         absoluteFastest = Math.min(absoluteFastest, game.fastestResponseTime);
       }
       if (game.averageScore) {
         sumScore += game.averageScore;
       }

       const wordsArray = game.questions || game.words;
       if (wordsArray) {
         wordsArray.forEach(w => {
           if (!w.word || !w.word.id) return;
           if (!wordStats[w.word.id]) {
             wordStats[w.word.id] = { ...w.word, totalPercentWrong: 0, count: 0 };
           }
           wordStats[w.word.id].totalPercentWrong += w.percentWrong;
           wordStats[w.word.id].count += 1;
           totalQuestionsAnswered += (game.playerCount || 10); // estimate if legacy
         });
       }
    });

    const sortedWords = Object.values(wordStats)
      .map(w => ({ ...w, avgWrong: Math.round(w.totalPercentWrong / w.count) }))
      .sort((a, b) => b.avgWrong - a.avgWrong);

    const hardestWords = sortedWords.slice(0, 15);
    const easiestWords = [...sortedWords].sort((a, b) => a.avgWrong - b.avgWrong).slice(0, 15);
    const mostTested = [...sortedWords].sort((a, b) => b.count - a.count).slice(0, 15);
    
    // Find neglected words (in curriculum but not in wordStats)
    const allGradeWords = flatVocab.words.filter(w => w.target_curriculum && w.target_curriculum[selectedGrade]);
    
    const testedIds = new Set(Object.keys(wordStats));
    const neglectedWords = allGradeWords.filter(w => !testedIds.has(w.id));

    // Trend Graph Data (Last 52 games)
    const trendData = sessionsData.slice(-52).map((game, i) => {
       const d = new Date(game.timestamp);
       return {
          name: `${d.getMonth()+1}/${d.getDate()}`,
          accuracy: game.averageAccuracy || (game.words ? Math.round(100 - (game.words.reduce((sum, w) => sum + w.percentWrong, 0)/game.words.length)) : 0)
       };
    });

    return {
      totalGames,
      totalQuestionsAnswered,
      avgParticipation: participationGames ? Math.round(sumParticipation / participationGames) : '-',
      globalAccuracy: accuracyGames ? Math.round(sumAccuracy / accuracyGames) : '-',
      avgSpeed: speedGames ? (sumSpeed / 1000).toFixed(1) : '-',
      fastest: absoluteFastest < 999999 ? (absoluteFastest / 1000).toFixed(1) : '-',
      avgScore: Math.round(sumScore / totalGames),
      curriculumCoverage: allGradeWords.length > 0 ? Math.round(((allGradeWords.length - neglectedWords.length) / allGradeWords.length) * 100) : 0,
      activeLearningMinutes: speedGames ? Math.round((totalQuestionsAnswered * (sumSpeed / speedGames)) / 60000) : 0,
      hardestWords,
      easiestWords,
      mostTested,
      neglectedWords,
      trendData
    };

  }, [sessionsData, selectedGrade]);

  const handleLaunchReview = () => {
    if (!metrics?.hardestWords || metrics.hardestWords.length < 4) {
       alert(t("Need at least 4 trouble words to play a review game.", "復習ゲームをプレイするには、少なくとも4つの苦手な単語が必要です。"));
       return;
    }
    const preselectedIds = metrics.hardestWords.map(w => w.id);
    navigate('/admin/games/quiz', { state: { preselectedIds, reviewGrade: selectedGrade } });
  };

  const renderWordList = (words, statKey, statLabel) => (
    <div className="flex flex-col gap-2">
      {words.map((word, index) => (
        <div key={word.id} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-[var(--border-color)]">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 shrink-0">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate text-sm">{word.en}</h4>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {lang === 'ja' ? word.ja_kanji || word.ja_hiragana : word.en_katakana}
            </p>
          </div>
          {statKey && (
            <div className="flex flex-col items-end shrink-0">
              <span className={`text-lg font-black ${statKey === 'avgWrong' ? (word.avgWrong > 50 ? 'text-red-500' : 'text-orange-500') : 'text-blue-500'}`}>
                {word[statKey]}{statKey === 'avgWrong' ? '%' : ''}
              </span>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{statLabel}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-7xl mx-auto px-4 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface-color)] p-6 rounded-2xl border-2 border-[var(--border-color)] shadow-sm">
        <div>
          <Link to="/admin/tools" className="text-[var(--primary-color)] hover:underline mb-2 inline-block font-bold">
            ← {t("Back to Tools", "ツールに戻る")}
          </Link>
          <h1 className="text-3xl font-black text-[var(--text-color)]">
            {t("Quiz Game Analytics", "クイズゲームの分析")}
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-bold max-w-2xl">
            {t("A comprehensive breakdown of student performance, engagement, and vocabulary mastery.", "生徒の成績、参加度、語彙の習得状況の総合的な分析。")}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3 min-w-[200px]">
          <TeacherSchoolDropdown t={t} lang={lang} />
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="appearance-none bg-[var(--surface-color)] text-[var(--text-color)] border-2 border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 font-bold cursor-pointer transition-colors duration-300 focus:outline-none focus:border-[var(--primary-color)] bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2216%22_height=%2216%22_viewBox=%220_0_24_24%22%3E%3Cpath_fill=%22currentColor%22_d=%22M7_10l5_5_5-5H7z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_1rem_center] shadow-sm w-full"
          >
            {flatVocab.grades.map(g => (
              <option key={g.id} value={g.id}>{lang === 'en' ? g.name_en : g.name_ja}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)] font-bold animate-pulse">
          {t("Loading dashboard...", "ダッシュボードを読み込み中...")}
        </div>
      ) : !metrics ? (
        <div className="bg-[var(--surface-color)] rounded-2xl border-2 border-[var(--border-color)] shadow-sm p-12 text-center flex flex-col items-center">
          <span className="text-6xl mb-4">📈</span>
          <h2 className="text-2xl font-black text-[var(--text-color)]">{t("No Data Found", "データが見つかりません")}</h2>
          <p className="text-[var(--text-muted)] font-bold mt-2">{t("Play some quiz games with this grade to collect analytics!", "この学年でクイズゲームをプレイしてデータを集めましょう！")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Action Bar */}
          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-800">
            <span className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              {t("Ready to practice?", "練習の準備はいいですか？")}
            </span>
            <button 
              onClick={handleLaunchReview}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>🚀</span> {t("Play Review Game (Hardest Words)", "復習ゲームをプレイ (苦手な単語)")}
            </button>
          </div>

          {/* Top Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-[var(--surface-color)] p-6 rounded-2xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-3xl mb-2">🎮</span>
                <span className="text-4xl font-black text-[var(--text-color)]">{metrics.totalGames}</span>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">{t("Total Games", "合計ゲーム数")}</span>
             </div>
             <div className="bg-[var(--surface-color)] p-6 rounded-2xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-3xl mb-2">🙋</span>
                <span className="text-4xl font-black text-[var(--text-color)]">{metrics.avgParticipation}</span>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">{t("Avg Participation", "平均参加人数")}</span>
             </div>
             <div className="bg-[var(--surface-color)] p-6 rounded-2xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-3xl mb-2">🎯</span>
                <span className="text-4xl font-black text-green-500">{metrics.globalAccuracy}{metrics.globalAccuracy !== '-' ? '%' : ''}</span>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">{t("Global Accuracy", "全体の正解率")}</span>
             </div>
             <div className="bg-[var(--surface-color)] p-6 rounded-2xl border-2 border-[var(--border-color)] flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-3xl mb-2">⚡</span>
                <span className="text-4xl font-black text-yellow-500">{metrics.avgSpeed}{metrics.avgSpeed !== '-' ? 's' : ''}</span>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">{t("Avg Speed", "平均解答時間")}</span>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* Trend Graph */}
             <div className="lg:col-span-2 bg-[var(--surface-color)] p-6 rounded-2xl border-2 border-[var(--border-color)] shadow-sm">
                <h3 className="text-xl font-black mb-6">{t("Accuracy Trend (Last 52 Games)", "正解率の推移 (過去52ゲーム)")}</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fontWeight: 'bold'}} />
                      <YAxis stroke="var(--text-muted)" tick={{fontWeight: 'bold'}} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontWeight: 'bold', border: '2px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }} />
                      <Line type="monotone" dataKey="accuracy" stroke="var(--primary-color)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary-color)' }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Extra Stats */}
             <div className="bg-[var(--surface-color)] p-6 rounded-2xl border-2 border-[var(--border-color)] shadow-sm flex flex-col gap-3">
                <h3 className="text-xl font-black mb-2">{t("Administrative Insights", "管理者向けインサイト")}</h3>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-[var(--border-color)] flex justify-between items-center shadow-inner">
                  <span className="font-bold opacity-80 text-sm">📚 {t("Curriculum Coverage", "カリキュラム網羅率")}</span>
                  <span className="font-black text-xl text-purple-700 dark:text-purple-400">{metrics.curriculumCoverage}%</span>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-[var(--border-color)] flex justify-between items-center shadow-inner">
                  <span className="font-bold opacity-80 text-sm">⏱️ {t("Active Learning", "アクティブラーニング")}</span>
                  <span className="font-black text-xl text-blue-700 dark:text-blue-400">{metrics.activeLearningMinutes} {t("min", "分")}</span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-[var(--border-color)] flex justify-between items-center mt-2">
                  <span className="font-bold opacity-80 text-sm">🔥 {t("Fastest Answer", "最速解答")}</span>
                  <span className="font-black text-lg">{metrics.fastest}{metrics.fastest !== '-' ? 's' : ''}</span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                  <span className="font-bold opacity-80 text-sm">💯 {t("Avg Score", "平均スコア")}</span>
                  <span className="font-black text-lg">{metrics.avgScore}</span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-[var(--border-color)] flex justify-between items-center">
                  <span className="font-bold opacity-80 text-sm">📝 {t("Total Answers", "総解答数")}</span>
                  <span className="font-black text-lg">{metrics.totalQuestionsAnswered}</span>
                </div>
             </div>
          </div>

          {/* Vocabulary Breakdown Lists */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border-2 border-red-200 dark:border-red-900/50 shadow-sm flex flex-col max-h-[500px]">
                <h3 className="text-xl font-black mb-4 text-red-800 dark:text-red-400">🔥 {t("Hardest Words", "最も苦手な単語")}</h3>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                   {metrics.hardestWords.length > 0 ? renderWordList(metrics.hardestWords, 'avgWrong', t('Fail Rate', '失敗率')) : <div className="text-center opacity-50 py-4 font-bold">{t("No data", "データなし")}</div>}
                </div>
             </div>
             
             <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border-2 border-green-200 dark:border-green-900/50 shadow-sm flex flex-col max-h-[500px]">
                <h3 className="text-xl font-black mb-4 text-green-800 dark:text-green-400">✅ {t("Easiest Words", "最も得意な単語")}</h3>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                   {metrics.easiestWords.length > 0 ? renderWordList(metrics.easiestWords, 'avgWrong', t('Fail Rate', '失敗率')) : <div className="text-center opacity-50 py-4 font-bold">{t("No data", "データなし")}</div>}
                </div>
             </div>
             
             <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-900/50 shadow-sm flex flex-col max-h-[500px]">
                <h3 className="text-xl font-black mb-4 text-purple-800 dark:text-purple-400">👀 {t("Most Tested", "よく出題される単語")}</h3>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                   {metrics.mostTested.length > 0 ? renderWordList(metrics.mostTested, 'count', t('Times', '回')) : <div className="text-center opacity-50 py-4 font-bold">{t("No data", "データなし")}</div>}
                </div>
             </div>
          </div>

          {metrics.neglectedWords.length > 0 && (
             <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm mt-2">
                <h3 className="text-xl font-black mb-2 flex items-center gap-2">👻 {t("Neglected Vocabulary", "まだテストされていない単語")}</h3>
                <p className="text-[var(--text-muted)] font-bold mb-4">{t("These words from the curriculum have not appeared in any quizzes yet.", "カリキュラムにあるこれらの単語は、まだクイズに出題されていません。")}</p>
                <div className="flex flex-wrap gap-2">
                   {metrics.neglectedWords.map(w => (
                      <div key={w.id} className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-sm font-bold shadow-sm">
                         {w.en}
                      </div>
                   ))}
                </div>
             </div>
          )}

        </div>
      )}
    </div>
  );
}
