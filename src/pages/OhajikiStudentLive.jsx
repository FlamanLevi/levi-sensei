import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { ref, update, onDisconnect } from 'firebase/database';
import { useOhajikiState } from '../hooks/useOhajikiState';
import { motion, AnimatePresence } from 'framer-motion';

const colors = [
  'bg-red-500/80',
  'bg-blue-500/80',
  'bg-green-500/80',
  'bg-yellow-500/80',
  'bg-purple-500/80',
  'bg-pink-500/80',
  'bg-orange-500/80'
];

function OhajikiStudentLive({ t, lang }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { playerId } = location.state || {};

  const { room, players } = useOhajikiState(playerId);
  const player = players?.[playerId];
  
  const [marbles, setMarbles] = useState([]);
  const [draggedMarble, setDraggedMarble] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [shakingMarbleId, setShakingMarbleId] = useState(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (!playerId || (room && room.status === 'CLOSED')) {
      navigate('/play');
    }
    // Clean up on disconnect
    if (playerId) {
      const playerRef = ref(db, `ohajiki/players/${playerId}`);
      onDisconnect(playerRef).remove();
    }
  }, [playerId, room, navigate]);

  // Compute active numbers based on range
  const activeNumbers = useMemo(() => {
    if (!room) return [];
    if (room.range === '1-10') return Array.from({ length: 10 }, (_, i) => i + 1);
    if (room.range === '11-20') return Array.from({ length: 10 }, (_, i) => i + 11);
    return Array.from({ length: 20 }, (_, i) => i + 1);
  }, [room]);

  // Initialize marbles ONLY once when entering the room
  useEffect(() => {
    if (room && marbles.length === 0 && room.status === 'LOBBY') {
      const targetCount = room.marbleCount || 5;
      const initialMarbles = Array.from({ length: targetCount }, (_, i) => ({
        id: i,
        color: colors[i % colors.length],
        location: 'tray'
      }));
      setMarbles(initialMarbles);
    }
  }, [room, marbles.length]);

  // If the game started, the teacher might have auto-assigned remaining marbles
  // We need to sync our local `marbles` state with Firebase's `board` state when playing starts
  useEffect(() => {
    if (room && room.status === 'PLAYING' && player?.board && marbles.length > 0 && marbles[0].location === 'tray') {
      // Rebuild local marbles based on Firebase board
      const newMarbles = [];
      let i = 0;
      Object.keys(player.board).forEach(numStr => {
        newMarbles.push({
          id: i,
          color: colors[i % colors.length],
          location: parseInt(numStr, 10)
        });
        i++;
      });
      setMarbles(newMarbles);
    }
  }, [room, player?.board, marbles]);

  // Sync to Firebase whenever a marble is placed/moved during LOBBY
  useEffect(() => {
    if (room && room.status === 'LOBBY' && playerId && marbles.length > 0) {
      const newBoard = {};
      marbles.forEach(m => {
        if (m.location !== 'tray') {
          newBoard[m.location] = true;
        }
      });
      update(ref(db, `ohajiki/players/${playerId}`), { board: newBoard });
    }
  }, [marbles, room, playerId]);

  // Check win condition during PLAYING
  useEffect(() => {
    if (room && room.status === 'PLAYING' && player) {
      const remaining = Object.keys(player.board || {}).length;
      if (remaining > 0) {
        setHasPlayed(true);
      }
      if (remaining === 0 && hasPlayed && !isFinished) { 
        setIsFinished(true);
      }
    }
  }, [room, player, hasPlayed, isFinished]);


  const handleScatter = (count) => {
    setMarbles(prev => {
      const newMarbles = [...prev];
      
      const nums = [...activeNumbers];
      const emptySpots = nums.filter(n => !newMarbles.find(m => m.location === n));
      
      // Shuffle empty spots
      for (let i = emptySpots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
      }
      
      const trayMarbles = newMarbles.filter(m => m.location === 'tray');
      const toPlace = Math.min(count, emptySpots.length, trayMarbles.length);
      
      for(let i = 0; i < toPlace; i++) {
        trayMarbles[i].location = emptySpots[i];
      }
      return newMarbles;
    });
  };

  const handleClearAll = () => {
    setMarbles(prev => prev.map(m => ({ ...m, location: 'tray' })));
  };

  const collectMarble = (marbleId) => {
    if (room?.status !== 'PLAYING') {
      // In lobby, just return to tray
      setMarbles(prev => prev.map(m => m.id === marbleId ? { ...m, location: 'tray' } : m));
    } else {
      const targetMarble = marbles.find(m => m.id === marbleId);
      if (!targetMarble) return;

      // Validate against called numbers
      if (!room.calledNumbers || !room.calledNumbers[targetMarble.location]) {
         setShakingMarbleId(marbleId);
         setTimeout(() => setShakingMarbleId(null), 400);
         return;
      }

      // Remove locally for animation
      setMarbles(prev => prev.filter(m => m.id !== marbleId));
      // Remove from Firebase directly targeting the specific key to prevent stale closure overwrites
      update(ref(db, `ohajiki/players/${playerId}/board`), { [targetMarble.location]: null });
    }
  };

  const handleDragStart = (e, marble) => {
    if (room?.status !== 'LOBBY') return;
    setDraggedMarble(marble);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e, targetNumber) => {
    e.preventDefault();
    if (draggedMarble && room?.status === 'LOBBY') {
      // Ensure the target number doesn't already have a marble
      if (targetNumber !== 'tray' && marbles.some(m => m.location === targetNumber)) {
         return; // Spot taken
      }
      setMarbles(prev => prev.map(m => m.id === draggedMarble.id ? { ...m, location: targetNumber } : m));
      setDraggedMarble(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getCirclePosition = (index, total) => {
    const angle = (index / total) * 2 * Math.PI - (Math.PI / 2);
    const radiusX = total === 20 ? 40 : 32; 
    const radiusY = total === 20 ? 36 : 32; 
    
    const left = `calc(50% + ${Math.cos(angle) * radiusX}%)`;
    const top = `calc(50% + ${Math.sin(angle) * radiusY}%)`;
    return { left, top };
  };

  if (!room || !player) return null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[var(--bg-color)] p-4 md:p-8 animate-in fade-in duration-300 overflow-x-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0 bg-[var(--surface-color)] p-4 rounded-2xl shadow-sm border-2 border-[var(--border-color)]">
        <h2 className="text-xl md:text-2xl font-black text-[var(--primary-color)]">
          {room.status === 'LOBBY' ? t("Place your marbles!", "おはじきを置こう！") : t("Listen carefully!", "よく聞いてね！")}
        </h2>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="px-3 py-1.5 md:px-4 md:py-2 bg-[var(--bg-color)] rounded-xl border-2 border-[var(--border-color)] font-bold text-base md:text-lg">
            {player.nickname}
          </div>
        </div>
      </div>

      {isFinished ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--surface-color)] rounded-3xl border-4 border-yellow-400 shadow-xl overflow-hidden relative min-h-[350px]">
           <div className="absolute inset-0 bg-yellow-400/20 z-0"></div>
           <motion.div 
             initial={{ scale: 0.5, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ type: "spring", bounce: 0.5 }}
             className="z-10 flex flex-col items-center"
           >
             <span className="text-6xl md:text-8xl mb-4">🎉</span>
             <h1 className="text-4xl md:text-6xl font-black text-yellow-600 drop-shadow-md">BINGO!</h1>
             <p className="text-lg md:text-2xl font-bold text-yellow-700 mt-4 text-center">{t("You cleared the board!", "ぜんぶクリアしたよ！")}</p>
           </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          
          {/* Controls (Lobby Only) */}
          {room.status === 'LOBBY' && (
            <div className="flex flex-wrap gap-2 md:gap-4 items-center bg-[var(--surface-color)] p-3 rounded-2xl border-2 border-[var(--border-color)] justify-center shrink-0">
              <button 
                onClick={() => handleScatter(1)}
                className="px-4 py-2 md:px-6 md:py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base"
              >
                <span className="text-lg md:text-xl">🎯</span> {t("Random 1", "ランダム1個")}
              </button>
              <button 
                onClick={() => handleScatter(marbles.filter(m => m.location === 'tray').length)}
                className="px-4 py-2 md:px-6 md:py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base"
              >
                <span className="text-lg md:text-xl">🎲</span> {t("Random All", "ぜんぶランダム")}
              </button>
              <button 
                onClick={handleClearAll}
                className="px-4 py-2 md:px-6 md:py-3 bg-gray-500 text-white font-bold rounded-xl shadow-sm hover:bg-gray-600 active:scale-95 transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base"
              >
                <span className="text-lg md:text-xl">🧹</span> {t("Clear All", "すべて片付ける")}
              </button>
            </div>
          )}

          {/* Game Board */}
          <div className="flex-1 min-h-[350px] md:min-h-[400px] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-amber-100/50 rounded-3xl border-4 border-amber-300 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 m-auto flex items-center justify-center">
              {activeNumbers.map((num, idx) => {
                const { left, top } = getCirclePosition(idx, activeNumbers.length);
                const hasMarbleLocally = marbles.some(m => m.location === num);
                const localMarble = marbles.find(m => m.location === num);
                
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
                      {hasMarbleLocally && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ 
                            scale: 1,
                            x: shakingMarbleId === localMarble.id ? [-8, 8, -8, 8, 0] : 0 
                          }}
                          transition={{ 
                            duration: shakingMarbleId === localMarble.id ? 0.3 : 0.2
                          }}
                          exit={{ scale: 0, opacity: 0 }}
                          onClick={() => collectMarble(localMarble.id)}
                          draggable={room.status === 'LOBBY'}
                          onDragStart={(e) => handleDragStart(e, localMarble)}
                          className={`absolute inset-0 m-auto w-14 h-14 md:w-16 md:h-16 rounded-full ${room.status === 'LOBBY' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:brightness-110'} shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_-4px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.8)] transition-transform hover:scale-110 active:scale-95 flex items-center justify-center z-10 ${localMarble.color}`}
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

          {/* Tray (Lobby Only) */}
          <AnimatePresence>
            {room.status === 'LOBBY' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="min-h-[100px] bg-[var(--surface-color)] rounded-2xl border-4 border-[var(--border-color)] p-4 flex gap-3 flex-wrap content-start shrink-0 overflow-y-auto shadow-inner"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'tray')}
              >
                <div className="w-full text-center text-[var(--text-muted)] font-black text-sm mb-2 tracking-widest">
                  {marbles.filter(m => m.location === 'tray').length > 0 
                    ? t("Drag marbles to the board!", "おはじきを盤に置こう！") 
                    : t("Wait for the teacher to start!", "先生が始めるのを待ってね！")}
                </div>
                <div className="flex flex-wrap justify-center w-full gap-2">
                  {marbles.filter(m => m.location === 'tray').map(marble => (
                    <motion.div
                      layoutId={`marble-${marble.id}`}
                      key={marble.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, marble)}
                      className={`w-12 h-12 rounded-full cursor-grab active:cursor-grabbing shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_-4px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.8)] hover:scale-110 transition-transform ${marble.color} relative m-1`}
                    >
                      <div className="w-3 h-3 bg-white/60 rounded-full blur-[1px] absolute top-1 left-1.5"></div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default OhajikiStudentLive;
