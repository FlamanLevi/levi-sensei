export const StudentGameOver = ({ me, myRank, totalPlayers, players, t, navigate }) => {
  const accuracy = me.questionsAnswered > 0 ? Math.round((me.correctCount / me.questionsAnswered) * 100) : 0;
  
  const getTopTiers = (statKey, isAscending = false, requireAccuracy = false) => {
    if (!players) return [];
    const allValues = Object.values(players)
      .filter(p => requireAccuracy ? p.correctCount === p.questionsAnswered && p.questionsAnswered > 0 : true)
      .map(p => p[statKey] || 0)
      .filter(val => isAscending ? val < 999999 && val > 0 : val > 0);
    
    const uniqueValues = [...new Set(allValues)].sort((a, b) => isAscending ? a - b : b - a);
    return uniqueValues.slice(0, 3).map(val => ({
        value: val,
        players: Object.values(players)
            .filter(p => requireAccuracy ? p.correctCount === p.questionsAnswered && p.questionsAnswered > 0 : true)
            .filter(p => (p[statKey] || 0) === val)
            .map(p => p.nickname)
    }));
  };

  const myAwards = [];
  if (players) {
    const isTop = (stat, asc = false, reqAcc = false) => {
       const tiers = getTopTiers(stat, asc, reqAcc);
       return tiers.length > 0 && tiers[0].players.includes(me.nickname);
    };

    if (isTop('maxStreak')) myAwards.push({ emoji: '🔥', title: t("Highest Streak", "最大連続正解"), desc: t("Most consecutive correct answers", "最も多く連続で正解した人") });
    if (isTop('correctCount')) myAwards.push({ emoji: '🎯', title: t("Most Correct", "最多正解数"), desc: t("Answered the most questions correctly", "最も多く正解した人") });
    if (isTop('avgTime', true)) myAwards.push({ emoji: '🏃', title: t("The Sprinter", "スプリンター"), desc: t("Fastest average answer time", "平均解答時間が最も速い人") });
    if (isTop('avgTime', false)) myAwards.push({ emoji: '🐢', title: t("Slow & Steady", "マイペース"), desc: t("Slowest average answer time", "平均解答時間が最も遅い人") });
    if (isTop('comebackPoints')) myAwards.push({ emoji: '🛡️', title: t("Comeback Kid", "大逆転"), desc: t("Most catch-up bonus points earned", "最も多く逆転ボーナスを獲得した人") });
    if (isTop('avgTime', true, true)) myAwards.push({ emoji: '⭐', title: t("Perfectionist", "パーフェクト"), desc: t("100% accuracy, ranked by speed", "全問正解 (スピード順)") });
    
    let maxScore = 0;
    Object.values(players).forEach(p => { if ((p.score || 0) > maxScore) maxScore = p.score; });
    if (maxScore > 0 && me.score === maxScore) {
       myAwards.push({ emoji: '🏋️', title: t("The Carry", "大黒柱"), desc: t("Highest individual score contribution", "個人スコアが最も高い人") });
    }
  }
  return (
    <div className="flex flex-col items-center justify-start min-h-[100dvh] bg-[var(--bg-color)] animate-in fade-in p-6 text-center overflow-y-auto pb-12">
      
      <h1 className="text-5xl font-black text-[var(--primary-color)] mb-2 mt-4">{t("Match Results", "試合結果")}</h1>
      
      <div className="w-full max-w-md bg-[var(--surface-color)] rounded-3xl p-6 shadow-xl border-4 border-[var(--border-color)] my-6 relative overflow-hidden">
         
         <div className="flex flex-col gap-4">
            <div className="bg-[var(--primary-color)] text-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
               <span className="text-sm font-bold opacity-80 uppercase tracking-widest">{t("Final Rank", "最終順位")}</span>
               <div className="text-6xl font-black my-2 flex items-baseline gap-2">
                  #{myRank} <span className="text-2xl opacity-70">/ {totalPlayers}</span>
               </div>
               <span className="text-2xl font-bold bg-black/20 px-4 py-1 rounded-full">{me.score || 0} pts</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm">
                 <span className="text-2xl mb-1">🎯</span>
                 <span className="text-3xl font-black text-[var(--text-color)]">{accuracy}%</span>
                 <span className="text-xs font-bold text-[var(--text-muted)] text-center">{t("Accuracy", "正解率")}</span>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm">
                 <span className="text-2xl mb-1">🔥</span>
                 <span className="text-3xl font-black text-[var(--text-color)]">{me.maxStreak || 0}</span>
                 <span className="text-xs font-bold text-[var(--text-muted)] text-center">{t("Max Streak", "最高連続")}</span>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm">
                 <span className="text-2xl mb-1">⚡</span>
                 <span className="text-2xl font-black text-[var(--text-color)]">{me.fastestTime < 999999 ? (me.fastestTime / 1000).toFixed(1) + 's' : '-'}</span>
                 <span className="text-xs font-bold text-[var(--text-muted)] text-center">{t("Fastest", "最速")}</span>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center shadow-sm">
                 <span className="text-2xl mb-1">⏱️</span>
                 <span className="text-2xl font-black text-[var(--text-color)]">{me.avgTime ? (me.avgTime / 1000).toFixed(1) + 's' : '-'}</span>
                 <span className="text-xs font-bold text-[var(--text-muted)] text-center">{t("Average", "平均")}</span>
              </div>
            </div>

            {/* Awards Section */}
            {myAwards.length > 0 && (
              <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800 p-4 flex flex-col gap-3 shadow-sm text-left">
                 <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest text-center mb-1">{t("Special Awards Won!", "特別賞を獲得！")}</h3>
                 {myAwards.map((award, i) => (
                    <div key={i} className="flex gap-4 items-center bg-white dark:bg-black/20 p-3 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50">
                       <span className="text-3xl">{award.emoji}</span>
                       <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-color)]">{award.title}</span>
                          <span className="text-xs font-bold text-[var(--text-muted)]">{award.desc}</span>
                       </div>
                    </div>
                 ))}
              </div>
            )}

            {/* Rewards Section */}
            {me.score > 0 && (
              <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 p-4 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                 <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest mb-2">{t("Rewards Earned", "獲得報酬")}</span>
                 <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                       <span className="text-3xl">🪙</span>
                       <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">+{me.score}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-3xl">⭐</span>
                       <span className="text-2xl font-black text-yellow-600 dark:text-yellow-400">+{me.score} XP</span>
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>

      <button 
        onClick={() => navigate('/')}
        className="px-12 py-4 bg-[var(--border-color)] text-[var(--text-color)] font-bold text-xl rounded-full hover:bg-[var(--primary-color)] hover:text-white transition-colors shadow-md"
      >
        {t("Return Home", "ホームに戻る")}
      </button>

    </div>
  );
};
