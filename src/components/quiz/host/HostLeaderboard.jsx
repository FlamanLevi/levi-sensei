import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../Avatar';

export const HostLeaderboard = ({ players, nextPhase, currentQIndex, questionQueue, t }) => {
  const [countdown, setCountdown] = useState(4); // 4 second auto-advance
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleNextPhase = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    nextPhase();
  };

  const getRankStyle = (idx, isOverall) => {
    const base = isOverall ? "border-4" : "border-2";
    const scale = isOverall && idx === 0 ? "scale-105 z-10" : "";
    if (idx === 0) return `${base} ${scale} bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-500 text-yellow-900 dark:text-yellow-100`;
    if (idx === 1) return `${base} ${scale} bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-slate-100`;
    if (idx === 2) return `${base} ${scale} bg-orange-50 dark:bg-orange-900/40 border-orange-400 dark:border-orange-500 text-orange-900 dark:text-orange-100`;
    return `${base} bg-[var(--surface-color)] border-[var(--border-color)]`;
  };

  useEffect(() => {
    if (countdown <= 0) {
      handleNextPhase();
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isAdvancing]);

  return (
    <div className="w-full h-full flex flex-col items-center p-8 relative overflow-hidden">
       
       <h2 className="text-4xl md:text-5xl font-black text-[var(--text-color)] mb-8 text-center shrink-0">
         {t("Round Results", "ラウンド結果")}
       </h2>

       <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 overflow-y-auto pb-24 px-4">
         <AnimatePresence mode="popLayout">
           {Object.entries(players)
             .map(([id, p]) => ({ id, ...p }))
             .sort((a, b) => (b.lastRoundScore || 0) - (a.lastRoundScore || 0))
             .slice(0, 8)
             .map((p, idx) => (
             <motion.div 
               key={`round-${p.id}`} 
               layout
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.8 }}
               transition={{ type: "spring", stiffness: 350, damping: 25, delay: idx * 0.05 }}
               className={`flex justify-between items-center px-6 py-4 rounded-3xl shadow-md font-bold text-3xl shrink-0 ${getRankStyle(idx, false)}`}
             >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-4xl w-12 text-center shrink-0">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                  <div className="flex-1 min-w-0 truncate">{p.nickname}</div>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-4">
                  <span className="text-[var(--primary-color)]">+{p.lastRoundScore || 0}</span>
                </div>
              </motion.div>
           ))}
         </AnimatePresence>
       </div>

       {/* Fixed Next Button that ignores scrolling */}
       <div className="absolute bottom-8 right-8 z-50">
         <button 
           onClick={handleNextPhase} 
           disabled={isAdvancing}
           className="flex items-center gap-4 px-8 py-4 bg-[var(--primary-color)] text-white text-3xl font-bold rounded-full shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
         >
           {currentQIndex + 1 >= questionQueue.length 
             ? t("Show Final Results", "最終結果を表示") 
             : t("Next Question", "次の問題")}
           <span className="bg-white/20 px-3 py-1 rounded-full text-xl">{countdown}</span>
         </button>
       </div>
    </div>
  );
};
