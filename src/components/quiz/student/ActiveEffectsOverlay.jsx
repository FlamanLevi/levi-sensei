import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ActiveEffectsOverlay = ({ activeEffects, me }) => {
  const [now, setNow] = useState(Date.now());
  const [fogClearance, setFogClearance] = useState(0);

  // Update time for expiration
  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(int);
  }, []);

  if (!activeEffects) return null;

  // Filter valid effects targeting this player
  const effects = Object.values(activeEffects).filter(effect => {
    if (effect.expiresAt < now) return false;
    // Don't hit yourself
    if (effect.sourcePlayerId === me?.id) return false;
    // Don't hit your own team
    if (me?.teamId && effect.sourceTeamId === me.teamId) return false;
    // If player has a shield, they block debuffs! (We don't remove the shield here since we only read data, but the shield prevents rendering)
    if (me?.hasShield) return false;
    
    return true;
  });

  const hasInk = effects.some(e => e.type === 'ink_splat');
  const hasFog = effects.some(e => e.type === 'fog');

  return (
    <>
      <AnimatePresence>
        {hasInk && (
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          >
            {/* Simple CSS shapes for ink splats */}
            <div className="absolute w-64 h-64 bg-black rounded-full mix-blend-multiply opacity-90 top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 blur-md" />
            <div className="absolute w-48 h-56 bg-black rounded-[40%_60%_70%_30%] mix-blend-multiply opacity-90 top-1/2 right-1/4 blur-sm" />
            <div className="absolute w-72 h-40 bg-black rounded-[50%] mix-blend-multiply opacity-95 bottom-1/4 left-1/3 blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasFog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: Math.max(0, 0.95 - (fogClearance * 0.1)) }}
            exit={{ opacity: 0 }}
            onClick={() => setFogClearance(p => p + 1)}
            className="absolute inset-0 z-50 bg-white/60 backdrop-blur-xl flex items-center justify-center cursor-pointer"
          >
            <span className="text-4xl text-black/50 font-black tracking-widest drop-shadow-md select-none">
              {fogClearance < 5 ? "TAP TO CLEAR FOG!" : "KEEP TAPPING!"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
