import React, { useState, useEffect } from 'react';

export interface FloatingScorePopupProps {
  points: number;
  streak?: number;
  className?: string;
  onComplete?: () => void;
}

export const FloatingScorePopup: React.FC<FloatingScorePopupProps> = ({ 
  points, 
  streak = 0,
  className = '',
  onComplete
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 900);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible || points <= 0) return null;

  return (
    <div className={`absolute -top-12 left-1/2 pointer-events-none z-50 flex flex-col items-center animate-float-up-fade ${className}`}>
      <span className="font-mono font-black text-2xl sm:text-3xl text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] filter">
        +{points.toLocaleString()}
      </span>
      {streak >= 2 && (
        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[11px] shadow-md uppercase tracking-wider animate-bounce mt-0.5">
          🔥 {streak} COMBO!
        </span>
      )}
    </div>
  );
};
