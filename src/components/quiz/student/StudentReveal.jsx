import { motion } from 'framer-motion';

export const StudentReveal = ({ gameState, myAnswer, me, myRank, pointsToNext, pointsAheadOfPrev, feedbackMessage, t }) => {
  const isCorrect = myAnswer === gameState.correctAnswer;
  const multiplier = me.comebackMultiplier || 1;
  const correctWordObj = gameState.options?.find(o => o.id === gameState.correctAnswer);
  
  return (
    <motion.div 
      initial={{ backgroundColor: "var(--surface-color)" }}
      animate={{ backgroundColor: isCorrect ? "#22c55e" : "#ef4444" }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[100dvh] p-4 text-center text-white overflow-hidden relative"
    >
      <motion.div 
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
        className="text-[10rem] drop-shadow-2xl leading-none mb-8"
      >
        {isCorrect ? "✅" : "❌"}
      </motion.div>

      <div className="mb-6 h-8 w-full max-w-sm">
         <motion.p 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="text-2xl font-bold italic opacity-90 drop-shadow-sm"
         >
           {feedbackMessage}
         </motion.p>
      </div>

      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl font-black drop-shadow-md mb-4"
      >
        {isCorrect ? t("Correct!", "正解！") : t("Incorrect!", "不正解！")}
      </motion.h1>

      {!isCorrect && correctWordObj && (
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="bg-white/20 px-6 py-2 rounded-2xl mb-6 border-2 border-white/40 shadow-sm"
         >
            <span className="text-sm uppercase font-bold opacity-80 block tracking-widest">{t("Correct Answer", "正解")}</span>
            <span className="text-3xl font-black">{correctWordObj.english} <span className="text-xl opacity-80">({correctWordObj.japanese})</span></span>
         </motion.div>
      )}

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="grid grid-cols-2 gap-4 w-full max-w-sm bg-black/20 p-6 rounded-3xl border-2 border-white/20 backdrop-blur-sm shadow-xl"
      >
         <div className="flex flex-col border-r-2 border-white/10 pr-2">
           <span className="text-sm font-bold uppercase opacity-80 tracking-widest">{t("Rank", "順位")}</span>
           <span className="text-4xl font-black">{myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : `#${myRank}`}</span>
         </div>
         <div className="flex flex-col pl-2">
           <span className="text-sm font-bold uppercase opacity-80 tracking-widest">{t("Score", "点数")}</span>
           <span className="text-4xl font-black">{me.score || 0}</span>
         </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-sm mt-4 flex flex-col gap-2"
      >
          {pointsToNext !== null && (
             <div className="bg-black/20 border border-white/20 rounded-xl p-3 flex justify-between items-center text-sm font-bold shadow-sm">
                <span className="opacity-90">🏃 {t("Points to catch next rank", "次の順位まであと")}</span>
                <span className="text-xl font-black">{pointsToNext} pts</span>
             </div>
          )}
          {pointsAheadOfPrev !== null && (
             <div className="bg-black/20 border border-white/20 rounded-xl p-3 flex justify-between items-center text-sm font-bold shadow-sm">
                <span className="opacity-90">🛡️ {t("Lead on rank below", "下の順位との差")}</span>
                <span className="text-xl font-black">+{pointsAheadOfPrev} pts</span>
             </div>
          )}
      </motion.div>

      {multiplier > 1 && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 text-2xl font-black text-yellow-300 drop-shadow-md uppercase tracking-widest animate-pulse"
        >
          ⭐ {multiplier}X {t("Comeback Bonus!", "逆転ボーナス！")}
        </motion.div>
      )}
    </motion.div>
  );
};
