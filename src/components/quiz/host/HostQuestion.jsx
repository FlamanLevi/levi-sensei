import { RubyText } from '../../../components/RubyText';
import { motion } from 'framer-motion';

const COLORS = [
  'bg-red-500 border-red-700',
  'bg-blue-500 border-blue-700',
  'bg-yellow-400 border-yellow-600 text-black',
  'bg-green-500 border-green-700',
  'bg-purple-500 border-purple-700',
  'bg-orange-500 border-orange-700',
  'bg-teal-500 border-teal-700',
  'bg-pink-500 border-pink-700'
];

export const HostQuestion = ({ roomCode, questionQueue, currentQIndex, timeLeft, settings, t }) => {
  const pct = timeLeft / settings.timeLimit;
  const totalOptions = questionQueue[currentQIndex].options.length;
  const maxDims = totalOptions - 2; 
  const halfDims = Math.floor(maxDims / 2);

  let dims = 0;
  if (settings.hintMode === 'even') {
    if (pct <= 0.66) dims = halfDims;
    if (pct <= 0.33) dims = maxDims;
  } else if (settings.hintMode === 'late') {
    if (pct <= 0.50) dims = halfDims;
    if (pct <= 0.20) dims = maxDims;
  }
  
  let dimmedOptionIds = [];
  if (dims > 0) {
    const incorrect = questionQueue[currentQIndex].options.filter(opt => opt.id !== questionQueue[currentQIndex].target.id);
    dimmedOptionIds = incorrect.slice(0, dims).map(opt => opt.id);
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const textVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.5 } }
  };

  return (
  <div className="w-full h-full flex flex-col">
     <div className="h-4 w-full bg-[var(--border-color)] shrink-0">
       <div 
         className="h-full bg-green-500 transition-all duration-100 ease-linear" 
         style={{ width: `${(timeLeft / settings.timeLimit) * 100}%` }}
       />
     </div>
     
     <div className="flex-grow flex flex-col items-center justify-between p-8 text-center relative overflow-hidden">
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="absolute top-4 right-8 bg-[var(--surface-color)] px-4 py-2 rounded-lg border-2 border-[var(--border-color)] shadow-sm z-10"
        >
          <span className="text-sm font-bold text-[var(--text-muted)] block uppercase tracking-widest leading-none mb-1">{t("Join PIN", "参加PIN")}</span>
          <span className="text-3xl font-black text-[var(--text-color)] leading-none">{roomCode}</span>
        </motion.div>

        <span className="text-2xl font-black text-[var(--text-color)] opacity-40 mb-2 shrink-0 tracking-tighter">
          {currentQIndex + 1} / {questionQueue.length}
        </span>

        <motion.div 
          variants={textVariants}
          initial="hidden"
          animate="show"
          key={`q-${currentQIndex}`}
          className="flex flex-col items-center justify-center flex-grow min-h-0 w-full max-w-4xl py-2"
        >
          {(() => {
            const hasImg = settings.prompts.includes('img') && questionQueue[currentQIndex].target.img_path;
            const hasEn = settings.prompts.includes('en');
            const hasKata = settings.prompts.includes('en_katakana');
            const hasJa = settings.prompts.includes('ja');

            return (
              <>
                {hasImg && (
                  <img src={`/${questionQueue[currentQIndex].target.img_path}`} alt="Prompt" className="max-h-[30vh] object-contain rounded-xl shadow-lg mb-4" />
                )}
                {hasEn && (
                  <h1 className={`font-black text-[var(--primary-color)] drop-shadow-md mb-2 shrink-0 w-full text-center text-balance leading-tight px-4 ${hasKata ? 'text-[clamp(3rem,8vw,8rem)]' : 'text-[clamp(4rem,12vw,12rem)]'}`}>
                    {questionQueue[currentQIndex].target.en}
                  </h1>
                )}
                {hasKata && (
                  <h2 className={`font-bold text-[#ffb3ff] drop-shadow-md mb-2 shrink-0 w-full text-center text-balance leading-tight px-4 ${hasEn ? 'text-[clamp(2rem,4vw,5rem)]' : 'text-[clamp(4rem,12vw,12rem)]'}`}>
                    {questionQueue[currentQIndex].target.en_katakana}
                  </h2>
                )}
                {hasJa && (
                  <h3 className="text-[clamp(3rem,10vw,10rem)] font-bold text-[var(--text-color)] shrink-0 w-full text-center text-balance leading-tight px-4">
                    <RubyText kanji={questionQueue[currentQIndex].target.ja_kanji} hiragana={questionQueue[currentQIndex].target.ja_hiragana} />
                  </h3>
                )}
              </>
            );
          })()}
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={`opts-${currentQIndex}`}
          className={`grid ${questionQueue[currentQIndex].options.length === 8 ? 'grid-cols-4 grid-rows-2' : questionQueue[currentQIndex].options.length === 6 ? 'grid-cols-3 grid-rows-2' : 'grid-cols-2 grid-rows-2'} h-48 md:h-[35vh] gap-4 w-full max-w-5xl shrink-0 mt-4`}
        >
          {questionQueue[currentQIndex].options.map((opt, idx) => {
            const isDimmed = dimmedOptionIds.includes(opt.id);
            const hasImg = settings.options.includes('img') && opt.img_path;
            const hasEn = settings.options.includes('en');
            const hasKata = settings.options.includes('en_katakana');
            const hasJa = settings.options.includes('ja');

            return (
              <motion.div
                key={opt.id}
                variants={itemVariants}
                className={`flex flex-col items-center justify-center p-4 rounded-3xl shadow-lg border-4 border-b-[12px] transition-all duration-500 ${COLORS[idx % COLORS.length]} ${COLORS[idx % COLORS.length].includes('text-black') ? '' : 'text-white'} ${isDimmed ? 'opacity-20 grayscale scale-95' : 'opacity-100 scale-100'}`}
              >
                {hasImg && (
                  <img src={`/${opt.img_path}`} alt="option" className="max-h-16 md:max-h-24 object-contain drop-shadow-md mb-2" />
                )}
                {hasEn && (
                  <span className={`font-black drop-shadow-sm w-full text-center text-balance leading-tight px-2 ${hasKata ? 'text-[clamp(1rem,3vmin,2.5rem)]' : 'text-[clamp(1.2rem,4vmin,3rem)]'}`}>
                    {opt.en}
                  </span>
                )}
                {hasKata && (
                  <span className={`font-bold opacity-90 w-full text-center text-balance leading-tight px-2 ${hasEn ? 'text-[clamp(0.8rem,2vmin,1.5rem)]' : 'text-[clamp(1.2rem,4vmin,3rem)]'}`}>
                    {opt.en_katakana}
                  </span>
                )}
                {hasJa && (
                  <span className="text-[clamp(1.2rem,4vmin,3rem)] font-bold drop-shadow-sm w-full text-center text-balance leading-tight px-2">
                    <RubyText kanji={opt.ja_kanji} hiragana={opt.ja_hiragana} />
                  </span>
                )}
              </motion.div>
            );
          })}
        </motion.div>
     </div>
  </div>
  );
};
