import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { ref, update, remove, onDisconnect } from 'firebase/database';
import { useOhajikiState } from '../hooks/useOhajikiState';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, PlayerCard } from '../components/Avatar';
import QRCodeLib from 'react-qr-code';

const QRCode = QRCodeLib.default || QRCodeLib;

const colors = [
  'bg-red-500/80',
  'bg-blue-500/80',
  'bg-green-500/80',
  'bg-yellow-500/80',
  'bg-purple-500/80',
  'bg-pink-500/80',
  'bg-orange-500/80'
];

function OhajikiHostLive({ t, lang }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = location.state || {};
  
  const { room, players } = useOhajikiState();

  const [marbles, setMarbles] = useState([]);
  const [draggedMarble, setDraggedMarble] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      navigate('/admin/games/tablet');
      return;
    }

    // Disconnect handler
    const statusRef = ref(db, 'ohajiki/room/status');
    onDisconnect(statusRef).set("CLOSED");
  }, [roomCode, navigate]);

  const activeNumbers = useMemo(() => {
    if (!room) return [];
    if (room.range === '1-10') return Array.from({ length: 10 }, (_, i) => i + 1);
    if (room.range === '11-20') return Array.from({ length: 10 }, (_, i) => i + 11);
    return Array.from({ length: 20 }, (_, i) => i + 1);
  }, [room]);

  // Sync marbles state to match Firebase calledNumbers
  useEffect(() => {
    if (room && room.status === 'PLAYING') {
      const called = room.calledNumbers || {};
      const newMarbles = [];
      const totalMarbles = activeNumbers.length;
      
      let marbleIdCounter = 0;
      
      // Add called marbles
      Object.keys(called).forEach(numStr => {
        newMarbles.push({
          id: marbleIdCounter++,
          color: colors[marbleIdCounter % colors.length],
          location: parseInt(numStr, 10),
          timestamp: called[numStr]
        });
      });
      
      // Add tray marbles (total - called)
      const remainingCount = totalMarbles - Object.keys(called).length;
      for (let i = 0; i < remainingCount; i++) {
        newMarbles.push({
          id: marbleIdCounter++,
          color: colors[marbleIdCounter % colors.length],
          location: 'tray'
        });
      }
      
      setMarbles(newMarbles);
    }
  }, [room?.calledNumbers, room?.status, activeNumbers.length]);


  const startGame = async () => {
    const updates = {};
    updates['ohajiki/room/status'] = "PLAYING";
    updates['ohajiki/room/calledNumbers'] = null; // reset
    
    // Calculate the array of numbers based on room.range
    let possibleNumbers = [];
    if (room?.range === '1-10') {
      possibleNumbers = Array.from({ length: 10 }, (_, i) => i + 1);
    } else if (room?.range === '11-20') {
      possibleNumbers = Array.from({ length: 10 }, (_, i) => i + 11);
    } else {
      possibleNumbers = Array.from({ length: 20 }, (_, i) => i + 1);
    }

    // Fix remaining marbles for each player
    if (players) {
      Object.entries(players).forEach(([playerId, p]) => {
        const board = p.board || {};
        const placedCount = Object.keys(board).length;
        const targetCount = room?.marbleCount || 5;
        
        if (placedCount < targetCount) {
          const newBoard = { ...board };
          let marblesToPlace = targetCount - placedCount;
          
          let availableSpots = possibleNumbers.filter(n => !newBoard[n]);
          availableSpots.sort(() => Math.random() - 0.5);
          
          for (let i = 0; i < marblesToPlace && i < availableSpots.length; i++) {
            newBoard[availableSpots[i]] = true; // Placed marble
          }
          updates[`ohajiki/players/${playerId}/board`] = newBoard;
        }
      });
    }

    await update(ref(db), updates);
  };

  const handleEndGame = async () => {
    if (!window.confirm(t("End the game and return to the game selection screen?", "ゲームを終了して選択画面に戻りますか？"))) return;
    const updates = {};
    updates['ohajiki/room/status'] = 'CLOSED';
    await update(ref(db), updates);
    navigate('/admin/games/tablet');
  };

  const kickPlayer = async (id) => {
    if (window.confirm(t("Kick this player?", "このプレイヤーをキックしますか？"))) {
      await remove(ref(db, `ohajiki/players/${id}`));
    }
  };

  // Drag and drop for host
  const handleDragStart = (e, marble) => {
    setDraggedMarble(marble);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, targetNumber) => {
    e.preventDefault();
    if (draggedMarble && targetNumber !== 'tray') {
      const called = room?.calledNumbers || {};
      if (!called[targetNumber]) {
        await update(ref(db, `ohajiki/room/calledNumbers`), {
          [targetNumber]: Date.now()
        });
      }
    }
    setDraggedMarble(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleHostRandom1 = async () => {
    const called = room?.calledNumbers || {};
    const available = activeNumbers.filter(n => !called[n]);
    if (available.length === 0) return;
    
    const num = available[Math.floor(Math.random() * available.length)];
    await update(ref(db, `ohajiki/room/calledNumbers`), {
       [num]: Date.now()
    });
  };

  const getCirclePosition = (index, total) => {
    const angle = (index / total) * 2 * Math.PI - (Math.PI / 2);
    const radiusX = total === 20 ? 42 : 35; 
    const radiusY = total === 20 ? 38 : 35; 
    
    const left = `calc(50% + ${Math.cos(angle) * radiusX}%)`;
    const top = `calc(50% + ${Math.sin(angle) * radiusY}%)`;
    return { left, top };
  };

  if (!roomCode || !room) return null;

  const phase = room.status;

  // Identify most recent called number
  let mostRecentNumber = null;
  let highestTimestamp = 0;
  if (room.calledNumbers) {
    Object.entries(room.calledNumbers).forEach(([num, ts]) => {
      if (ts > highestTimestamp) {
        highestTimestamp = ts;
        mostRecentNumber = parseInt(num, 10);
      }
    });
  }

  return (
    <div className="flex flex-col h-[100dvh] animate-in fade-in duration-300 bg-[var(--bg-color)]">
      
      {/* Utility Header */}
      <div className="flex justify-between items-center bg-[var(--surface-color)] p-4 shadow-sm border-b-2 border-[var(--border-color)] mb-4 shrink-0 z-50">
        <button onClick={handleEndGame} className="text-red-500 hover:underline font-bold text-lg">
          ✕ {phase === 'LOBBY' ? t("Cancel", "キャンセル") : t("End Game", "ゲームを終了")}
        </button>
        
        <div className="flex items-center gap-4">
          {phase === 'LOBBY' && (
            <>
              <button
                onClick={async () => {
                  if (window.confirm(t("Force all connected iPads to refresh their browsers instantly?", "すべての接続中のiPadのブラウザを強制的に更新しますか？"))) {
                    await update(ref(db), { 'trivia/version': Date.now() });
                  }
                }}
                className="px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 font-bold rounded-xl shadow-sm transition-all border border-red-200 dark:border-red-800 flex items-center gap-2"
                title={t("Force Refresh All iPads", "全iPadを強制更新")}
              >
                🔄 <span className="hidden sm:inline">{t("Refresh iPads", "iPadを更新")}</span>
              </button>
              
              <button 
                onClick={startGame}
                disabled={!players || Object.keys(players).length === 0}
                className="px-6 py-2 bg-[var(--primary-color)] text-white font-black rounded-xl shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
              >
                ▶ {t("Start Game", "ゲームスタート")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-grow flex flex-col bg-[var(--surface-color)] rounded-2xl border-4 border-[var(--border-color)] overflow-hidden relative mx-4 mb-4 shadow-sm">
        
        {phase === 'LOBBY' && (
          <div className="w-full h-full flex flex-row p-4 md:p-6 lg:p-8 gap-4 md:gap-6 lg:gap-8 overflow-hidden relative">
            <div className="flex flex-col items-center justify-center shrink-0 w-1/2 min-w-[350px]">
              <h2 className="text-xl md:text-3xl font-bold text-[var(--text-muted)] mb-4 shrink-0 text-center">
                {t("Join on Tablets:", "タブレットで参加:")}
              </h2>

              <div className="bg-[var(--surface-color)] border-4 border-[var(--primary-color)]/20 shadow-md rounded-3xl p-6 flex flex-col items-center justify-center gap-6 shrink-0 w-full max-w-md">
                <div className="text-6xl md:text-[8rem] font-black text-[var(--primary-color)] tracking-widest leading-none drop-shadow-sm text-center">
                  {roomCode}
                </div>
                <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-inner border-4 border-gray-100 shrink-0 w-full max-w-[250px]">
                  <QRCode value={`${window.location.origin}${window.location.pathname}#/play?pin=${roomCode}`} size={200} level="L" style={{ width: '100%', height: 'auto' }} />
                  <span className="text-gray-400 font-bold mt-2 text-sm text-center">{t("Scan to Join", "スキャンして参加")}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-w-0 bg-[var(--surface-color)] rounded-3xl border-4 border-[var(--border-color)] p-6 shadow-inner overflow-hidden">
              <div className="flex justify-between items-center w-full mb-6 shrink-0 border-b-2 border-[var(--border-color)] pb-4">
                <h3 className="text-2xl font-bold text-[var(--text-color)] flex items-center shrink-0">
                  {t("Players Connected:", "参加プレイヤー:")} 
                </h3>
                <span className="text-[var(--primary-color)] font-black text-3xl bg-white dark:bg-gray-800 border-2 border-[var(--border-color)] px-6 py-2 flex items-center justify-center rounded-2xl shadow-sm shrink-0">
                  {players ? Object.keys(players).length : 0}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 w-full overflow-y-auto content-start justify-start flex-grow pr-2 pb-4">
                <AnimatePresence>
                  {players && Object.entries(players).map(([id, p]) => {
                    const isReady = p.board && Object.keys(p.board).length >= room.marbleCount;
                    return (
                      <motion.div 
                        key={id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => kickPlayer(id)}
                        title={t("Click to kick", "クリックしてキック")}
                        className="cursor-pointer hover:scale-95 transition-transform"
                      >
                        <PlayerCard profile={{ equippedColor: p.color }} className={`px-4 py-2 min-w-[120px] border-2 shadow-sm transition-colors group flex items-center gap-3 relative overflow-hidden ${isReady ? 'bg-green-100 border-green-400 dark:bg-green-900/30' : 'bg-[var(--surface-color)] border-[var(--border-color)]'} hover:bg-red-500 hover:text-white hover:border-red-600`}>
                          <Avatar profile={{ name: p.nickname, equippedAvatar: p.avatar }} className="w-10 h-10 text-2xl bg-white/50 group-hover:bg-white/20 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-bold whitespace-nowrap group-hover:line-through text-lg truncate max-w-[150px]">{p.nickname}</span>
                            <span className={`text-xs font-bold ${isReady ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-muted)]'}`}>
                              {isReady ? t("Ready!", "準備OK") : t("Placing...", "配置中...")}
                            </span>
                          </div>
                        </PlayerCard>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {phase === 'PLAYING' && (
          <div className="w-full h-full flex flex-col md:flex-row bg-[var(--surface-color)]">
            
            {/* Sidebar Leaderboard */}
            <div className="w-full md:w-64 lg:w-80 border-r-2 border-[var(--border-color)] flex flex-col p-4 overflow-y-auto gap-3 shrink-0 bg-[var(--bg-color)]/30">
              <h3 className="font-black text-[var(--text-color)] text-xl flex items-center justify-between">
                {t("Leaderboard", "順位表")}
                <span className="text-sm bg-[var(--primary-color)] text-white px-2 py-0.5 rounded-full">{players ? Object.keys(players).length : 0}</span>
              </h3>
              
              <AnimatePresence>
                {players && Object.entries(players).sort((a, b) => {
                  const aLeft = Object.keys(a[1].board || {}).length;
                  const bLeft = Object.keys(b[1].board || {}).length;
                  return aLeft - bLeft;
                }).map(([id, p]) => {
                  const marblesLeft = Object.keys(p.board || {}).length;
                  const isFinished = marblesLeft === 0;

                  return (
                    <motion.div 
                      key={id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`flex items-center gap-3 p-2 rounded-xl shadow-sm border-2 ${isFinished ? 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30' : 'bg-white dark:bg-gray-800 border-[var(--border-color)]'}`}
                    >
                      <Avatar profile={{ name: p.nickname, equippedAvatar: p.avatar }} className="w-10 h-10 text-xl" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-lg font-black truncate">{p.nickname}</span>
                        {isFinished ? (
                          <span className="text-yellow-600 dark:text-yellow-400 font-bold text-xs">BINGO! 🎉</span>
                        ) : (
                          <span className="text-[var(--text-muted)] font-bold text-xs">
                            {marblesLeft} {t("left", "個")}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Main Game Board Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              
              {/* Header / Most Recent Call */}
              <div className="flex justify-between items-center p-4 z-10 shrink-0">
                <div className="flex gap-4 items-center">
                  <button 
                    onClick={handleHostRandom1}
                    className="px-6 py-3 bg-emerald-500 text-white font-black rounded-2xl shadow-md hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <span className="text-2xl">🎯</span> {t("Call Random 1", "ランダム1個呼ぶ")}
                  </button>
                </div>
                
                {mostRecentNumber && (
                  <div className="bg-white dark:bg-gray-800 border-4 border-emerald-400 shadow-xl px-6 py-2 rounded-full flex items-center gap-4 animate-in slide-in-from-top-4">
                    <span className="font-bold text-[var(--text-muted)] uppercase tracking-widest text-sm">{t("Called", "呼ばれた数字")}:</span>
                    <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{mostRecentNumber}</span>
                  </div>
                )}
              </div>

              {/* Game Board (Circular) */}
              <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-amber-100/50 relative overflow-hidden flex items-center justify-center shadow-inner border-y-4 border-amber-300">
                <div className="absolute inset-0 m-auto flex items-center justify-center max-w-3xl max-h-3xl">
                  {activeNumbers.map((num, idx) => {
                    const { left, top } = getCirclePosition(idx, activeNumbers.length);
                    const localMarble = marbles.find(m => m.location === num);
                    const isMostRecent = mostRecentNumber === num;
                    const hasBeenCalled = !!room?.calledNumbers?.[num];
                    
                    return (
                      <div 
                        key={num} 
                        className="absolute w-20 h-20 -ml-10 -mt-10 flex items-center justify-center rounded-full transition-all duration-500"
                        style={{ left, top }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, num)}
                      >
                        <div className="text-4xl md:text-5xl font-black text-amber-900/60 select-none drop-shadow-sm">
                          {num}
                        </div>
                        
                        <AnimatePresence>
                          {hasBeenCalled && localMarble && (
                            <motion.div 
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: isMostRecent ? 1.2 : 1, rotate: 0 }}
                              className={`absolute inset-0 m-auto w-14 h-14 md:w-16 md:h-16 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_-4px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.8)] flex items-center justify-center z-10 ${localMarble.color} ${isMostRecent ? 'z-20 ring-4 ring-emerald-400 ring-offset-2' : 'opacity-60 saturate-50'}`}
                            >
                              <div className="w-4 h-4 md:w-5 md:h-5 bg-white/60 rounded-full blur-[1px] absolute top-1.5 left-2 md:top-2 md:left-2"></div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Marble Tray (Host) */}
              <div 
                className="h-28 bg-[var(--surface-color)] p-4 flex gap-2 flex-wrap content-start shrink-0 overflow-y-auto shadow-inner"
              >
                <div className="w-full text-center text-[var(--text-muted)] font-black text-xs uppercase tracking-widest mb-1">
                  {t("Drag marbles onto the board numbers to call them", "おはじきを盤面の数字にドラッグして呼ぶ")}
                </div>
                <div className="flex flex-wrap justify-center w-full gap-2">
                  {marbles.filter(m => m.location === 'tray').map(marble => (
                    <motion.div
                      layoutId={`marble-${marble.id}`}
                      key={marble.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, marble)}
                      className={`w-10 h-10 rounded-full cursor-grab active:cursor-grabbing shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_-4px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.8)] hover:scale-110 transition-transform ${marble.color} relative m-1`}
                    >
                      <div className="w-2.5 h-2.5 bg-white/60 rounded-full blur-[1px] absolute top-1 left-1.5"></div>
                    </motion.div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default OhajikiHostLive;
