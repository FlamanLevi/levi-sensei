import { motion } from 'framer-motion';
import { Avatar } from '../../Avatar';

export const StudentLobby = ({ me, t }) => {
  let teamColorClass = 'text-[var(--primary-color)]';
  let teamBgClass = 'bg-[var(--surface-color)]';
  let teamBorderClass = 'border-[var(--border-color)]';
  let teamName = '';

  if (me.teamId) {
    if (me.teamId === 'team_0') { teamColorClass = 'text-red-600'; teamBgClass = 'bg-red-50 dark:bg-red-900/20'; teamBorderClass = 'border-red-500'; teamName = t("Red Team", "赤チーム"); }
    if (me.teamId === 'team_1') { teamColorClass = 'text-blue-600'; teamBgClass = 'bg-blue-50 dark:bg-blue-900/20'; teamBorderClass = 'border-blue-500'; teamName = t("Blue Team", "青チーム"); }
    if (me.teamId === 'team_2') { teamColorClass = 'text-yellow-600'; teamBgClass = 'bg-yellow-50 dark:bg-yellow-900/20'; teamBorderClass = 'border-yellow-500'; teamName = t("Yellow Team", "黄チーム"); }
    if (me.teamId === 'team_3') { teamColorClass = 'text-green-600'; teamBgClass = 'bg-green-50 dark:bg-green-900/20'; teamBorderClass = 'border-green-500'; teamName = t("Green Team", "緑チーム"); }
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center transition-colors duration-500 ${teamBgClass} overflow-hidden relative`}>
      
      {/* Decorative pulse ring */}
      <motion.div 
        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0, 0.1] }} 
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className={`absolute w-[150vmin] h-[150vmin] rounded-full border-4 ${teamBorderClass} opacity-10 pointer-events-none`}
      />

      <motion.h1 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.6 }}
        className={`text-5xl font-black mb-6 ${teamColorClass} drop-shadow-sm`}
      >
        {t("You're in!", "参加しました！")}
      </motion.h1>
      
      {me.teamId && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className={`inline-block px-8 py-3 rounded-full border-4 mb-8 font-black text-2xl shadow-md ${teamColorClass} ${teamBorderClass} bg-[var(--surface-color)]`}
        >
          {teamName}
        </motion.div>
      )}

      <motion.h2 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-bold text-[var(--text-color)] mb-4"
      >
        {t("See your nickname on the screen?", "画面に自分の名前はありますか？")}
      </motion.h2>
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.4 }}
        className={`p-10 w-full max-w-sm rounded-3xl shadow-xl border-4 bg-[var(--surface-color)] ${teamBorderClass} flex flex-col items-center`}
      >
        <Avatar profile={{ equippedAvatar: me.avatar, equippedColor: me.color, name: me.nickname }} className="w-24 h-24 text-4xl mb-6 shadow-md border-4 border-[var(--surface-color)] ring-4 ring-black/5" />
        <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">{t("Nickname", "ニックネーム")}</p>
        <p className="text-5xl font-black text-[var(--text-color)] truncate w-full text-center">{me.nickname}</p>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 flex flex-col items-center gap-4 text-[var(--text-muted)] font-bold text-xl"
      >
        <div className="flex gap-2">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, delay: 0, duration: 1 }} className={`w-3 h-3 rounded-full bg-[var(--text-muted)]`} />
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, delay: 0.2, duration: 1 }} className={`w-3 h-3 rounded-full bg-[var(--text-muted)]`} />
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, delay: 0.4, duration: 1 }} className={`w-3 h-3 rounded-full bg-[var(--text-muted)]`} />
        </div>
        {t("Waiting for teacher to start...", "先生がスタートするのを待っています...")}
      </motion.div>
    </div>
  );
};
