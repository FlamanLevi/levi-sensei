export const StudentLeaderboard = ({ me, myRank, pointsToNext, pointsAheadOfPrev, t }) => {
  return (
    <div className="flex flex-col items-center justify-start min-h-[100dvh] bg-[var(--bg-color)] animate-in fade-in p-6 text-center overflow-y-auto pb-12">
      
      <div className="w-full max-w-md bg-[var(--surface-color)] rounded-3xl p-6 shadow-xl border-4 border-[var(--border-color)] mt-8 mb-6 relative overflow-hidden">
         <div className="absolute top-0 left-0 right-0 h-4 bg-[var(--primary-color)] opacity-20"></div>
         
         <div className="flex justify-between items-center mb-6 mt-2">
            <h1 className="text-2xl font-black text-[var(--text-color)]">{t("Scoreboard", "スコアボード")}</h1>
            <span className="text-4xl animate-pulse">👀</span>
         </div>
         
         <div className="flex flex-col gap-4">
            <div className="bg-[var(--primary-color)] text-white p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
               <span className="text-sm font-bold opacity-80 uppercase tracking-widest">{t("Your Rank", "あなたの順位")}</span>
               <div className="text-6xl font-black my-2">
                  #{myRank}
               </div>
               <span className="text-2xl font-bold bg-black/20 px-4 py-1 rounded-full">{me.score || 0} pts</span>
            </div>

            {me.currentStreak > 1 && (
               <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 p-4 rounded-2xl flex items-center justify-center gap-3 shadow-sm">
                  <span className="text-3xl animate-bounce">🔥</span>
                  <div className="flex flex-col items-start">
                     <span className="text-xl font-black text-orange-600 dark:text-orange-400">{me.currentStreak} {t("Streak!", "連続正解！")}</span>
                  </div>
               </div>
            )}

            <div className="flex flex-col gap-2 w-full mt-2">
                {pointsToNext !== null && (
                   <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex justify-between items-center text-sm font-bold shadow-sm">
                      <span className="text-blue-800 dark:text-blue-200">🏃 {t("Points to catch next rank", "次の順位まであと")}</span>
                      <span className="text-lg font-black text-blue-600 dark:text-blue-400">{pointsToNext} pts</span>
                   </div>
                )}
                {pointsAheadOfPrev !== null && (
                   <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex justify-between items-center text-sm font-bold shadow-sm">
                      <span className="text-green-800 dark:text-green-200">🛡️ {t("Lead on rank below", "下の順位との差")}</span>
                      <span className="text-lg font-black text-green-600 dark:text-green-400">+{pointsAheadOfPrev} pts</span>
                   </div>
                )}
            </div>
         </div>
      </div>
      
      <p className="text-xl text-[var(--text-muted)] font-bold animate-pulse mt-4">
        {t("Look at the screen...", "画面を見てね...")}
      </p>

    </div>
  );
};
