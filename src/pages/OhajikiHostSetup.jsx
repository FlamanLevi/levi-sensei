import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { ref, set, get } from 'firebase/database';
import { motion } from 'framer-motion';

const SegmentedControl = ({ label, value, options, onChange, layoutIdKey }) => (
  <div className="flex flex-col gap-2">
    <label className="font-bold text-sm text-[var(--text-color)] pl-1">{label}</label>
    <div className="flex p-1.5 gap-1.5 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--surface-color)] shadow-inner overflow-x-auto">
      {options.map(opt => {
        const isSelected = value === opt.value;
        return (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col flex-1 min-w-max items-center justify-center py-3 px-4 rounded-xl transition-all relative z-0 ${isSelected ? 'text-white shadow-md' : 'text-[var(--text-muted)]'}`}
          >
            {isSelected && (
              <motion.div 
                layoutId={`segment-bg-${layoutIdKey}`} 
                className="absolute inset-0 bg-[var(--primary-color)] rounded-xl -z-10" 
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="font-black text-lg md:text-xl">{opt.label}</span>
            {opt.subLabel && (
              <span className={`text-xs md:text-sm font-bold mt-1 tracking-tight ${isSelected ? 'text-white/90' : 'text-[var(--text-muted)]/70'}`}>
                {opt.subLabel}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  </div>
);

function OhajikiHostSetup({ t, lang }) {
  const navigate = useNavigate();

  const [range, setRange] = useState('1-10');
  const [marbleCount, setMarbleCount] = useState(5);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      let schoolId = 'unknown';
      if (auth.currentUser) {
        const snap = await get(ref(db, `users/${auth.currentUser.uid}/teacherProfile`));
        if (snap.exists() && snap.val().schoolId) {
          schoolId = snap.val().schoolId;
        }
      }

      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      await set(ref(db, 'ohajiki/gameState'), null);
      await set(ref(db, 'ohajiki/players'), null);

      const roomRef = ref(db, 'ohajiki/room');
      await set(roomRef, {
        roomCode,
        status: "LOBBY",
        range,
        marbleCount,
        schoolId,
        calledNumbers: null
      });

      navigate(`/admin/games/tablet/ohajiki/live`, { 
        state: { roomCode }
      });

    } catch (error) {
      console.error("Error creating room:", error);
      alert(t("Failed to create room. Check your connection.", "ルームの作成に失敗しました。"));
      setIsCreating(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-[100dvh] pb-32">
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="flex flex-col gap-8 p-4 md:p-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
          <Link to="/admin/games/tablet" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
            ← {t("Back to Tablet Games", "タブレット用ゲームに戻る")}
          </Link>
          <h2 className="text-4xl md:text-5xl font-black text-[var(--text-color)] tracking-tight">
            <span className="mr-3">🪀</span> {t("Ohajiki Setup", "おはじき設定")}
          </h2>
          <p className="text-[var(--text-muted)] text-lg font-bold">
            {t("Configure the rules for the multiplayer Ohajiki match.", "マルチプレイおはじきのルールを設定してください。")}
          </p>
        </motion.div>

        {/* Game Settings */}
        <motion.div variants={itemVariants} className="bg-[var(--surface-color)] p-6 md:p-8 rounded-3xl shadow-sm border-2 border-[var(--border-color)]">
          <h3 className="text-2xl font-black text-[var(--primary-color)] flex items-center gap-3 mb-8">
            <span className="bg-[var(--primary-color)] text-white w-8 h-8 flex items-center justify-center rounded-full text-lg">1</span>
            {t("Game Settings", "ゲーム設定")}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <SegmentedControl 
              layoutIdKey="range"
              label={t("Number Range", "数字の範囲")} 
              value={range} 
              onChange={setRange}
              options={[
                { value: '1-10', label: "1-10", subLabel: t("Short", "短い") },
                { value: '11-20', label: "11-20", subLabel: t("Teens", "11〜20") },
                { value: '1-20', label: "1-20", subLabel: t("Full", "すべて") }
              ]}
            />
            <SegmentedControl 
              layoutIdKey="marbleCount"
              label={t("Number of Marbles", "おはじきの数")} 
              value={marbleCount} 
              onChange={setMarbleCount}
              options={[
                { value: 5, label: "5", subLabel: t("Fast", "速い") },
                { value: 10, label: "10", subLabel: t("Standard", "標準") },
                { value: 15, label: "15", subLabel: t("Long", "長め") },
                { value: 20, label: "20", subLabel: t("All", "すべて") }
              ].filter(opt => range === '1-20' || opt.value <= 10)}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Floating Action Bar */}
      <motion.div 
        initial={{ y: 100 }} 
        animate={{ y: 0 }} 
        transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-[var(--border-color)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex justify-center"
      >
        <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-black text-[var(--primary-color)] text-xl">{range} {t("Range", "範囲")}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300 font-bold">
              {marbleCount} {t("Marbles to place", "個のおはじき")}
            </span>
          </div>
          <button 
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full md:w-auto px-12 py-4 text-2xl font-black rounded-2xl text-white bg-[var(--primary-color)] shadow-[0_8px_30px_rgba(var(--primary-rgb),0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isCreating ? t("Creating...", "作成中...") : t("Create Room", "ルームを作成")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default OhajikiHostSetup;
