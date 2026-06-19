import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, PlayerCard } from '../../Avatar';
import QRCodeLib from 'react-qr-code';
const QRCode = QRCodeLib.default || QRCodeLib;

export const HostLobby = ({ roomCode, players, startGame, kickPlayer, t }) => (
  <div className="w-full h-full flex flex-row p-4 md:p-6 lg:p-8 gap-4 md:gap-6 lg:gap-8 overflow-hidden relative">
    
    {/* Decorative background circles */}
    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--primary-color)]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--secondary-color,var(--primary-color))]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

    {/* Left Column: PIN & Instructions */}
    <div className="flex flex-col items-center justify-center shrink w-1/2 lg:w-5/12 min-w-[350px] min-h-0">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl md:text-3xl lg:text-4xl font-bold text-[var(--text-muted)] mb-2 md:mb-4 shrink-0 text-center"
      >
        {t("Open the App & Enter PIN:", "アプリを開いてPINを入力:")}
      </motion.h2>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="bg-[var(--surface-color)] border-4 border-[var(--primary-color)]/30 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-3xl md:rounded-[3rem] p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center gap-4 shrink min-h-0 w-full max-w-md lg:max-w-2xl relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--primary-color)]/5 to-transparent opacity-50"></div>
        
        <motion.div 
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-[clamp(6rem,20vmin,14rem)] font-black tracking-widest leading-none drop-shadow-xl text-center py-8 relative z-10"
          style={{
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          {roomCode}
        </motion.div>

        <div className="absolute bottom-4 md:bottom-8 flex items-center gap-1 text-[var(--text-muted)] font-bold text-lg md:text-2xl opacity-70">
          <span>{t("Waiting for players", "プレイヤーを待っています")}</span>
          <span className="flex">
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}>.</motion.span>
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}>.</motion.span>
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}>.</motion.span>
          </span>
        </div>
      </motion.div>
    </div>

    {/* Right Column: Players List */}
    <div className="flex flex-col flex-1 min-w-0 bg-[var(--surface-color)]/80 backdrop-blur-md rounded-3xl border-4 border-[var(--border-color)] p-4 md:p-6 shadow-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--primary-color)]/5 pointer-events-none"></div>
      
      <div className="flex justify-between items-center w-full mb-4 md:mb-6 shrink-0 border-b-2 border-[var(--border-color)] pb-2 md:pb-4 relative z-10">
        <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-[var(--text-color)] flex items-center shrink-0">
          {t("Players Connected:", "参加プレイヤー:")} 
        </h3>
        <motion.div 
          key={Object.keys(players).length}
          initial={{ scale: 1.5, backgroundColor: 'var(--primary-color)', color: '#fff' }}
          animate={{ scale: 1, backgroundColor: 'var(--surface-color)', color: 'var(--primary-color)' }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="font-black text-2xl md:text-4xl border-2 border-[var(--border-color)] px-4 lg:px-6 py-1 lg:py-2 flex items-center justify-center rounded-xl lg:rounded-2xl shadow-md shrink-0 ml-2"
        >
          {Object.keys(players).length}
        </motion.div>
      </div>

      <div className="flex flex-wrap gap-2 md:gap-3 w-full overflow-y-auto content-start justify-start flex-grow pr-2 pb-4 custom-scrollbar relative z-10">
        <AnimatePresence>
          {Object.keys(players).length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center w-full h-full min-h-[200px] opacity-60"
            >
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                <span className="text-7xl block mb-4 grayscale">👀</span>
              </motion.div>
              <p className="text-xl md:text-2xl font-bold text-[var(--text-muted)] text-center">
                {t("Waiting for challengers...", "挑戦者を待っています...")}
              </p>
            </motion.div>
          ) : (
            Object.entries(players).map(([id, p]) => (
              <motion.div 
                key={id}
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => kickPlayer(id)}
                title={t("Click to kick", "クリックしてキック")}
                className="cursor-pointer transition-transform hover:-translate-y-1"
              >
                <PlayerCard profile={{ equippedColor: p.color }} className="px-2 md:px-4 py-1.5 md:py-2 min-w-[80px] md:min-w-[100px] bg-[var(--surface-color)] border-2 shadow-sm hover:shadow-lg hover:bg-red-500 hover:text-white hover:border-red-600 transition-all group flex items-center gap-2 md:gap-3">
                  <Avatar profile={{ name: p.nickname, equippedAvatar: p.avatar }} className="w-8 h-8 md:w-10 md:h-10 text-xl md:text-2xl bg-white/50 group-hover:bg-white/20 shrink-0 shadow-sm" />
                  <span className="font-bold whitespace-nowrap group-hover:line-through text-sm md:text-lg truncate max-w-[150px]">{p.nickname}</span>
                </PlayerCard>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>

  </div>
);
