import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, PlayerCard } from '../../Avatar';
import QRCodeLib from 'react-qr-code';
const QRCode = QRCodeLib.default || QRCodeLib;

export const HostLobby = ({ roomCode, players, startGame, kickPlayer, t }) => (
  <div className="w-full h-full flex flex-row p-4 md:p-6 lg:p-8 gap-4 md:gap-6 lg:gap-8 overflow-hidden relative">
    
    {/* Decorative background circles */}
    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--primary-color)]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--secondary-color,var(--primary-color))]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

    {/* Left Column: QR Code & PIN */}
    <div className="flex flex-col items-center justify-center shrink w-1/2 lg:w-5/12 min-w-[350px] min-h-0">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl md:text-3xl lg:text-4xl font-bold text-[var(--text-muted)] mb-2 md:mb-4 shrink-0 text-center"
      >
        {t("Join on Tablets:", "タブレットで参加:")}
      </motion.h2>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="bg-[var(--surface-color)] border-4 border-[var(--primary-color)]/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl md:rounded-[3rem] p-4 md:p-8 lg:p-10 flex flex-col items-center justify-center gap-4 shrink min-h-0 w-full max-w-md lg:max-w-2xl"
      >
        <div className="text-[clamp(4rem,15vmin,10rem)] font-black text-[var(--primary-color)] tracking-widest leading-none drop-shadow-sm text-center">
          {roomCode}
        </div>
        <div className="flex flex-col items-center bg-white p-3 md:p-5 rounded-2xl shadow-inner border-4 border-gray-100 shrink w-full max-w-[280px] lg:max-w-[350px] min-h-0 overflow-hidden">
          <div className="w-full shrink min-h-0 flex items-center justify-center">
            <QRCode value={`${window.location.origin}${window.location.pathname}#/play?pin=${roomCode}`} size={256} level="L" style={{ height: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          </div>
          <span className="text-gray-400 font-bold mt-2 text-xs md:text-sm lg:text-lg text-center shrink-0">{t("Scan to Join", "スキャンして参加")}</span>
        </div>
      </motion.div>
    </div>

    {/* Right Column: Players List */}
    <div className="flex flex-col flex-1 min-w-0 bg-[var(--surface-color)]/60 backdrop-blur-sm rounded-3xl border-4 border-[var(--border-color)] p-4 md:p-6 shadow-sm overflow-hidden">
      <div className="flex justify-between items-center w-full mb-4 md:mb-6 shrink-0 border-b-2 border-[var(--border-color)] pb-2 md:pb-4">
        <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-[var(--text-color)] flex items-center shrink-0">
          {t("Players Connected:", "参加プレイヤー:")} 
        </h3>
        <span className="text-[var(--primary-color)] font-black text-2xl md:text-4xl bg-white dark:bg-gray-800 border-2 border-[var(--border-color)] px-4 lg:px-6 py-1 lg:py-2 flex items-center justify-center rounded-xl lg:rounded-2xl shadow-sm shrink-0 ml-2">
          {Object.keys(players).length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 md:gap-3 w-full overflow-y-auto content-start justify-start flex-grow pr-2 pb-4 custom-scrollbar">
        <AnimatePresence>
          {Object.entries(players).map(([id, p]) => (
            <motion.div 
              key={id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => kickPlayer(id)}
              title={t("Click to kick", "クリックしてキック")}
              className="cursor-pointer hover:scale-95 transition-transform"
            >
              <PlayerCard profile={{ equippedColor: p.color }} className="px-2 md:px-4 py-1.5 md:py-2 min-w-[80px] md:min-w-[100px] bg-[var(--surface-color)] border-2 shadow-sm hover:bg-red-500 hover:text-white hover:border-red-600 transition-colors group flex items-center gap-2 md:gap-3">
                <Avatar profile={{ name: p.nickname, equippedAvatar: p.avatar }} className="w-8 h-8 md:w-10 md:h-10 text-xl md:text-2xl bg-white/50 group-hover:bg-white/20 shrink-0" />
                <span className="font-bold whitespace-nowrap group-hover:line-through text-sm md:text-lg truncate max-w-[150px]">{p.nickname}</span>
              </PlayerCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>

  </div>
);
