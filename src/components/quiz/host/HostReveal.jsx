import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { RubyText } from '../../../components/RubyText';

export const HostReveal = ({ questionQueue, currentQIndex, answerStats, settings, t, nextPhase }) => {
  const [countdown, setCountdown] = useState(6); // 6 second auto-advance
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleNextPhase = () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    nextPhase();
  };

  useEffect(() => {
    if (countdown <= 0) {
      handleNextPhase();
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isAdvancing]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
  };

  const barVariants = {
    hidden: { height: "0%" },
    show: (heightPct) => ({ height: `${heightPct}%`, transition: { duration: 1, type: "spring", bounce: 0.2 } })
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-green-500/10">
       <motion.h2 
         initial={{ scale: 0.5, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ type: "spring", bounce: 0.6 }}
         className="text-5xl font-black text-green-500 mb-8"
       >
         {t("Correct Answer!", "正解！")}
       </motion.h2>
       

       {(() => {
         const isJaPrompt = questionQueue[currentQIndex].promptFormats?.includes('ja');
         const PrimaryText = isJaPrompt ? 
           <RubyText kanji={questionQueue[currentQIndex].target.ja_kanji} hiragana={questionQueue[currentQIndex].target.ja_hiragana} /> : 
           questionQueue[currentQIndex].target.en;
         const SecondaryText = isJaPrompt ? 
           questionQueue[currentQIndex].target.en : 
           <RubyText kanji={questionQueue[currentQIndex].target.ja_kanji} hiragana={questionQueue[currentQIndex].target.ja_hiragana} />;

         return (
           <>
             <motion.h1 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               style={{ fontSize: '12vw', lineHeight: 1.1 }}
               className="font-black text-[var(--primary-color)] drop-shadow-md mb-2"
             >
               {PrimaryText}
             </motion.h1>
             <motion.h2 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.3 }}
               style={{ fontSize: '10vw', lineHeight: 1.1 }}
               className="font-bold text-[var(--text-color)] drop-shadow-md mb-8"
             >
               {SecondaryText}
             </motion.h2>
           </>
         );
       })()}
       
       {/* Distribution Chart */}
       <motion.div 
         variants={containerVariants}
         initial="hidden"
         animate="show"
         className="w-full max-w-4xl flex justify-center items-end gap-4 h-32 mt-4"
       >
          {questionQueue[currentQIndex].options.map((opt) => {
            const count = answerStats[opt.id] || 0;
            const maxCount = Math.max(1, ...Object.values(answerStats));
            const heightPct = (count / maxCount) * 100;
            const isCorrect = opt.id === questionQueue[currentQIndex].target.id;
            
            return (
              <div key={opt.id} className="flex flex-col items-center justify-end w-24 h-full gap-2">
                 <motion.span 
                   initial={{ opacity: 0 }} 
                   animate={{ opacity: 1 }} 
                   transition={{ delay: 1.3 }} 
                   className="font-bold text-lg text-[var(--text-color)]"
                 >
                   {count}
                 </motion.span>
                 <div className="w-full flex-1 flex items-end">
                   <motion.div 
                     custom={heightPct}
                     variants={barVariants}
                     className={`w-full rounded-t-md ${isCorrect ? 'bg-green-500 border-x-2 border-t-2 border-green-700' : 'bg-gray-400 opacity-50'}`} 
                   ></motion.div>
                 </div>
                 <span className={`text-xs font-bold truncate w-full ${isCorrect ? 'text-green-600' : 'text-[var(--text-muted)]'}`}>{opt.en}</span>
              </div>
            );
          })}
       </motion.div>

       {/* Fixed Next Button that ignores scrolling */}
       <div className="absolute bottom-8 right-8 z-50">
         <button 
           onClick={handleNextPhase} 
           disabled={isAdvancing}
           className="flex items-center gap-4 px-8 py-4 bg-[var(--primary-color)] text-white text-3xl font-bold rounded-full shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
         >
           {t("Next", "次へ")}
           <span className="bg-white/20 px-3 py-1 rounded-full text-xl">{countdown}</span>
         </button>
       </div>
    </div>
  );
};
