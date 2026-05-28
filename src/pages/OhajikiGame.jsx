import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

const colors = [
  'bg-red-500/40',
  'bg-blue-500/40',
  'bg-green-500/40',
  'bg-yellow-500/40',
  'bg-purple-500/40',
  'bg-pink-500/40',
  'bg-orange-500/40'
];

function OhajikiGame({ t, lang }) {
  const [range, setRange] = useState('1-10'); // '1-10', '11-20', '1-20'
  const [marbles, setMarbles] = useState([]); 
  const [draggedMarble, setDraggedMarble] = useState(null);

  // Compute active numbers based on range
  const activeNumbers = useMemo(() => {
    if (range === '1-10') return Array.from({ length: 10 }, (_, i) => i + 1);
    if (range === '11-20') return Array.from({ length: 10 }, (_, i) => i + 11);
    return Array.from({ length: 20 }, (_, i) => i + 1);
  }, [range]);

  // Reset marbles when range changes
  useEffect(() => {
    const initialMarbles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      location: 'tray'
    }));
    setMarbles(initialMarbles);
  }, [range]);

  const handleScatter = (count) => {
    setMarbles(prev => {
      const newMarbles = [...prev];
      newMarbles.forEach(m => m.location = 'tray');
      
      const nums = [...activeNumbers];
      // Shuffle nums
      for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
      
      const toPlace = Math.min(count, nums.length);
      for(let i = 0; i < toPlace; i++) {
        newMarbles[i].location = nums[i];
      }
      return newMarbles;
    });
  };

  const collectMarble = (marbleId) => {
    setMarbles(prev => prev.map(m => m.id === marbleId ? { ...m, location: 'tray' } : m));
  };

  const handleDragStart = (e, marble) => {
    setDraggedMarble(marble);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e, targetNumber) => {
    e.preventDefault();
    if (draggedMarble) {
      setMarbles(prev => prev.map(m => m.id === draggedMarble.id ? { ...m, location: targetNumber } : m));
      setDraggedMarble(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Math for circular layout
  const getCirclePosition = (index, total) => {
    // -90deg starts at the top (12 o'clock)
    const angle = (index / total) * 2 * Math.PI - (Math.PI / 2);
    
    // Give more horizontal space for double digits when all 20 are showing
    const radiusX = total === 20 ? 42 : 35; 
    const radiusY = total === 20 ? 38 : 35; 
    
    const left = `calc(50% + ${Math.cos(angle) * radiusX}%)`;
    const top = `calc(50% + ${Math.sin(angle) * radiusY}%)`;
    return { left, top };
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-[calc(100vh-100px)] max-h-[900px]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-[var(--border-color)] pb-4 gap-4 shrink-0">
        <div>
          <Link to="/admin/games/classroom" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2 mb-2">
            ← {t("Back to Classroom Games", "教室用ゲームに戻る")}
          </Link>
          <h2 className="text-3xl font-bold text-[var(--text-color)] flex items-center gap-3">
            <span className="text-4xl">🪀</span> {t("Ohajiki (Marbles) Game", "おはじきゲーム")}
          </h2>
          <p className="text-[var(--text-muted)] mt-1">
            {t("Listen to the number and tap the marble covering it!", "数字を聞いて、その数字の上にあるおはじきをタップしよう！")}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center bg-[var(--surface-color)] p-2 rounded-xl border-2 border-[var(--border-color)]">
          {/* Range Selector */}
          <select 
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="appearance-none bg-transparent text-[var(--text-color)] border-2 border-[var(--border-color)] rounded-lg py-2 pl-4 pr-10 font-bold cursor-pointer hover:border-[var(--primary-color)] focus:outline-none focus:border-[var(--primary-color)] shadow-sm bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_12_12%22%3E%3Cpath_fill=%22%23666%22_d=%22M2_4l4_4_4-4z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_0.5rem_center]"
          >
            <option value="1-10" className="bg-[var(--surface-color)]">1-10</option>
            <option value="11-20" className="bg-[var(--surface-color)]">11-20</option>
            <option value="1-20" className="bg-[var(--surface-color)]">1-20</option>
          </select>

          <button 
            onClick={() => handleScatter(1)}
            className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>🎯</span> {t("Random 1", "ランダム1個")}
          </button>
          <button 
            onClick={() => handleScatter(5)}
            className="px-4 py-2 bg-[var(--primary-color)] text-white font-bold rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>🎲</span> {t("Scatter 5", "5個配置")}
          </button>
          <button 
            onClick={() => handleScatter(activeNumbers.length)}
            className="px-4 py-2 bg-purple-500 text-white font-bold rounded-lg shadow-sm hover:bg-purple-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>🌕</span> {t("Cover All", "すべて配置")}
          </button>
          <button 
            onClick={() => handleScatter(0)}
            className="px-4 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-sm hover:bg-gray-600 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>🧹</span> {t("Uncover All", "すべて片付ける")}
          </button>
        </div>
      </div>

      {/* Game Board Container */}
      <div className="flex-1 bg-[var(--surface-color)] border-4 border-[var(--border-color)] rounded-2xl p-4 shadow-inner overflow-hidden flex flex-col gap-4 min-h-0">
        
        {/* Play Area */}
        <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-amber-100/50 rounded-xl border-2 border-amber-200 shadow-inner relative min-h-0 overflow-hidden">
          
          <div className="absolute inset-0 m-auto flex items-center justify-center">
            {activeNumbers.map((num, idx) => {
              const { left, top } = getCirclePosition(idx, activeNumbers.length);
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
                  
                  {marbles.find(m => m.location === num) && (
                    <div 
                      onClick={() => collectMarble(marbles.find(m => m.location === num).id)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, marbles.find(m => m.location === num))}
                      className={`absolute inset-0 m-auto w-14 h-14 md:w-16 md:h-16 rounded-full cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_-4px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.8)] transition-transform hover:scale-110 active:scale-95 flex items-center justify-center z-10 ${marbles.find(m => m.location === num).color}`}
                    >
                      <div className="w-4 h-4 md:w-5 md:h-5 bg-white/60 rounded-full blur-[1px] absolute top-1.5 left-2 md:top-2 md:left-2"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Tray */}
        <div 
          className="h-24 md:h-28 bg-gray-200/50 rounded-xl border-2 border-gray-300 p-2 md:p-4 flex gap-2 flex-wrap content-start shrink-0 overflow-y-auto shadow-inner"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'tray')}
        >
          <div className="w-full text-center text-gray-500 font-bold text-xs md:text-sm mb-1 uppercase tracking-widest">{t("Marble Tray", "おはじきトレイ")}</div>
          {marbles.filter(m => m.location === 'tray').map(marble => (
            <div
              key={marble.id}
              draggable
              onDragStart={(e) => handleDragStart(e, marble)}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full cursor-grab active:cursor-grabbing shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_-4px_10px_rgba(0,0,0,0.3),inset_0_4px_10px_rgba(255,255,255,0.8)] hover:scale-110 transition-transform ${marble.color} relative m-1`}
            >
              <div className="w-3 h-3 bg-white/60 rounded-full blur-[1px] absolute top-1 left-1.5 md:top-1.5 md:left-1.5"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OhajikiGame;
