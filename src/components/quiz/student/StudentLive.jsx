import { motion, AnimatePresence } from 'framer-motion';
import { ActiveEffectsOverlay } from './ActiveEffectsOverlay';
import { useState, useEffect } from 'react';

const COLORS = [
  'bg-red-500 hover:bg-red-600 border-red-700',
  'bg-blue-500 hover:bg-blue-600 border-blue-700',
  'bg-yellow-400 hover:bg-yellow-500 border-yellow-600 text-black',
  'bg-green-500 hover:bg-green-600 border-green-700',
  'bg-purple-500 hover:bg-purple-600 border-purple-700',
  'bg-orange-500 hover:bg-orange-600 border-orange-700',
  'bg-teal-500 hover:bg-teal-600 border-teal-700',
  'bg-pink-500 hover:bg-pink-600 border-pink-700'
];

export const StudentLive = ({ gameState, hasAnswered, submitAnswer, me, handleUseItem, t }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.4 } }
  };

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(int);
  }, []);

  const activeEffects = gameState.activeEffects || {};
  const myDebuffs = Object.values(activeEffects).filter(e => 
    e.expiresAt > now && 
    e.sourcePlayerId !== me?.id && 
    !(me?.teamId && e.sourceTeamId === me.teamId) &&
    !me?.hasShield
  );

  const hasEarthquake = myDebuffs.some(e => e.type === 'earthquake');
  const hasShrink = myDebuffs.some(e => e.type === 'shrink_ray');
  const hasShuffle = myDebuffs.some(e => e.type === 'button_shuffle');
  
  // Buffs
  const has5050 = me?.activeBuffs?.['50_50'];
  const hasCrystalBall = me?.activeBuffs?.['crystal_ball'];

  let displayOptions = [...gameState.options];
  if (hasShuffle) displayOptions = displayOptions.reverse();

  // Pre-calculate 50/50 hidden indexes
  const hiddenIdxs = [];
  if (has5050) {
     const wrongOptions = displayOptions.filter(o => o.id !== gameState.targetId);
     const toHide = wrongOptions.slice(0, Math.floor(wrongOptions.length / 2));
     toHide.forEach(h => hiddenIdxs.push(h.id));
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[var(--surface-color)] relative overflow-hidden">
      
      {/* Visual Overlays */}
      {!hasAnswered && <ActiveEffectsOverlay activeEffects={gameState.activeEffects} me={me} />}

      {/* Item Button (Floating) */}
      <AnimatePresence>
        {!hasAnswered && me?.item && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.85 }}
            onClick={handleUseItem}
            className="fixed bottom-6 right-6 z-50 w-24 h-24 bg-gradient-to-tr from-[var(--primary-color)] to-[var(--primary-light)] rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-4 border-white flex flex-col items-center justify-center cursor-pointer text-white overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
            <span className="text-4xl relative z-10 drop-shadow-md">{me.item.icon}</span>
            <span className="text-xs font-black tracking-widest uppercase relative z-10 drop-shadow-md">{t("USE", "使う")}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {hasAnswered ? (
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="text-[8rem] mb-8 drop-shadow-md"
          >
            ⏳
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-[var(--text-color)] mb-4"
          >
            {t("Answer Sent!", "回答を送信しました！")}
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-[var(--text-muted)] font-bold flex items-center gap-3 justify-center"
          >
            <div className="flex gap-1.5">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, delay: 0, duration: 1 }} className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]" />
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, delay: 0.2, duration: 1 }} className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]" />
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, delay: 0.4, duration: 1 }} className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]" />
            </div>
            {t("Waiting for others...", "他の人を待っています...")}
          </motion.div>
        </div>
      ) : (
        <div className={`flex flex-col h-full p-2 relative z-10 ${hasEarthquake ? 'animate-bounce' : ''}`}>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className={`grid ${displayOptions.length === 8 ? 'grid-cols-2 grid-rows-4' : displayOptions.length === 6 ? 'grid-cols-2 grid-rows-3' : 'grid-cols-2 grid-rows-2'} h-full gap-2`}
          >
            {displayOptions.map((opt, idx) => {
              const hasImg = gameState.displayRules.includes('img') && opt.img_path;
              const hasEn = gameState.displayRules.includes('en');
              const hasKata = gameState.displayRules.includes('en_katakana');
              const hasJa = gameState.displayRules.includes('ja');
              
              const isHiddenBy5050 = hiddenIdxs.includes(opt.id);
              const isCrystalCorrect = hasCrystalBall && opt.id === gameState.targetId;

              if (isHiddenBy5050) {
                 return <div key={opt.id} className="opacity-0 pointer-events-none" />;
              }

              return (
              <motion.button
                variants={itemVariants}
                key={opt.id}
                onPointerDown={() => submitAnswer(opt.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-3xl border-4 border-b-[12px] active:border-b-[4px] active:translate-y-[8px] transition-all overflow-hidden relative shadow-lg touch-none select-none ${isCrystalCorrect ? 'bg-yellow-400 border-yellow-600 text-black shadow-[0_0_30px_rgba(250,204,21,1)] z-10 scale-105' : COLORS[idx % COLORS.length]} ${!isCrystalCorrect && !COLORS[idx % COLORS.length].includes('text-black') ? 'text-white' : ''}`}
              >
                {/* Shrink Ray Effect */}
                <div className={`flex flex-col w-full h-full items-center justify-center transition-transform duration-300 ${hasShrink ? 'scale-[0.4]' : 'scale-100'}`}>
                  {hasImg && (
                    <img src={`/${opt.img_path}`} alt="option" className="max-h-24 md:max-h-[20vh] object-contain drop-shadow-md mb-2" />
                  )}
                  {hasEn && (
                    <span className={`font-black drop-shadow-sm w-full text-center text-balance leading-tight px-1 ${hasKata ? 'text-[clamp(1rem,3.5vmin,2.5rem)]' : 'text-[clamp(1.2rem,5vmin,3rem)]'}`}>
                      {opt.en}
                    </span>
                  )}
                  {hasKata && (
                    <span className={`font-bold opacity-90 w-full text-center text-balance leading-tight px-1 ${hasEn ? 'text-[clamp(0.8rem,2vmin,1.5rem)]' : 'text-[clamp(1.2rem,5vmin,3rem)]'}`}>
                      {opt.en_katakana}
                    </span>
                  )}
                  {hasJa && (
                    <span className="text-[clamp(1.2rem,5vmin,3rem)] font-bold drop-shadow-sm w-full text-center text-balance leading-tight px-1">
                      {opt.ja_kanji || opt.ja_hiragana}
                    </span>
                  )}
                </div>
              </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
};
