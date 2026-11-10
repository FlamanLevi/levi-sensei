import React from 'react';

export type MascotMood = 'idle' | 'happy' | 'nervous' | 'panicking' | 'cheering';

export interface PandaMascotProps {
  mood: MascotMood;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const PandaMascot: React.FC<PandaMascotProps> = ({
  mood,
  size = 120,
  className = '',
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={`inline-block relative select-none cursor-pointer transition-transform active:scale-90 ${className} ${
        mood === 'panicking'
          ? 'animate-bounce'
          : mood === 'cheering'
            ? 'animate-pop-jelly'
            : mood === 'happy'
              ? 'animate-pulse'
              : 'hover:scale-105'
      }`}
      style={{ width: size, height: size }}
      title={mood === 'panicking' ? 'Hurry up! 5 seconds left!' : 'Levi Panda Mascot'}
    >
      <svg viewBox="0 0 120 120" width={size} height={size} className="overflow-visible">
        {/* Ears */}
        <circle cx="26" cy="28" r="18" fill="#0f172a" />
        <circle cx="94" cy="28" r="18" fill="#0f172a" />
        <circle cx="26" cy="28" r="9" fill="#f472b6" opacity="0.6" />
        <circle cx="94" cy="28" r="9" fill="#f472b6" opacity="0.6" />

        {/* Head */}
        <ellipse cx="60" cy="65" rx="46" ry="40" fill="#ffffff" stroke="#0f172a" strokeWidth="4.5" />

        {/* Cheeks (Blushing) */}
        <circle cx="30" cy="72" r="8" fill="#f43f5e" opacity="0.35" />
        <circle cx="90" cy="72" r="8" fill="#f43f5e" opacity="0.35" />

        {/* Eye Patches */}
        <ellipse cx="40" cy="58" rx="14" ry="17" fill="#0f172a" transform="rotate(-15 40 58)" />
        <ellipse cx="80" cy="58" rx="14" ry="17" fill="#0f172a" transform="rotate(15 80 58)" />

        {/* Dynamic Eyes based on Mood */}
        {mood === 'panicking' ? (
          // Spiral or Closed Stressed Eyes (> <)
          <>
            <path d="M 33 53 L 45 61 M 45 53 L 33 61" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 87 53 L 75 61 M 75 53 L 87 61" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          </>
        ) : mood === 'nervous' ? (
          // Wavering / Shaking pupils
          <>
            <circle cx="40" cy="58" r="4.5" fill="#ffffff" />
            <circle cx="80" cy="58" r="4.5" fill="#ffffff" />
            <circle cx="39" cy="59" r="2" fill="#38bdf8" />
            <circle cx="79" cy="59" r="2" fill="#38bdf8" />
          </>
        ) : mood === 'cheering' || mood === 'happy' ? (
          // Joyful Crescent Eyes (^_^)
          <>
            <path d="M 32 60 Q 40 50 48 60" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
            <path d="M 72 60 Q 80 50 88 60" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          // Standard Big Sparkly Anime Eyes
          <>
            <circle cx="40" cy="56" r="6" fill="#ffffff" />
            <circle cx="42" cy="54" r="2.5" fill="#38bdf8" />
            <circle cx="80" cy="56" r="6" fill="#ffffff" />
            <circle cx="82" cy="54" r="2.5" fill="#38bdf8" />
          </>
        )}

        {/* Snout & Nose */}
        <ellipse cx="60" cy="74" rx="12" ry="8" fill="#f8fafc" />
        <ellipse cx="60" cy="71" rx="5.5" ry="3.5" fill="#0f172a" />

        {/* Dynamic Mouth */}
        {mood === 'panicking' ? (
          <ellipse cx="60" cy="84" rx="7" ry="9" fill="#be123c" stroke="#0f172a" strokeWidth="2.5" />
        ) : mood === 'nervous' ? (
          <path d="M 54 80 Q 60 76 66 80" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        ) : mood === 'cheering' || mood === 'happy' ? (
          <path d="M 52 77 Q 60 88 68 77" fill="#f43f5e" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <path d="M 54 76 Q 60 80 66 76" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Comic Sweatdrop (When panicking or nervous) */}
        {(mood === 'panicking' || mood === 'nervous') && (
          <path
            d="M 98 42 C 98 42, 108 52, 108 58 C 108 64, 103 68, 98 68 C 93 68, 88 64, 88 58 C 88 52, 98 42, 98 42 Z"
            fill="#38bdf8"
            stroke="#0284c7"
            strokeWidth="2"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};
