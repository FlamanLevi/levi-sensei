import React from 'react';

export interface HanamaruStampProps {
  scoreText?: string;
  size?: number; // default 180
  className?: string;
}

export const HanamaruStamp: React.FC<HanamaruStampProps> = ({ 
  scoreText = "たいへんよくできました", 
  size = 180,
  className = ''
}) => {
  const uniqueId = React.useId().replace(/:/g, '');
  const pathId = `hanamaruTextPath-${uniqueId}`;

  return (
    <div className={`relative inline-flex items-center justify-center animate-pop-jelly select-none pointer-events-none ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        className="filter drop-shadow-[0_4px_8px_rgba(220,38,38,0.35)]"
      >
        {/* Slightly imperfect, hand-drawn vermilion stamp circle */}
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="rgba(239, 68, 68, 0.06)"
          stroke="#dc2626"
          strokeWidth="6"
          strokeDasharray="500"
          strokeDashoffset="0"
          strokeLinecap="round"
          className="opacity-95"
        />
        
        {/* Hand-drawn spiral flower petals (Traditional Hanamaru) */}
        <path
          d="M 100 24 C 115 15, 135 30, 126 46 C 145 42, 160 62, 144 76 C 162 86, 158 110, 138 114 C 148 132, 130 152, 114 140 C 104 158, 80 156, 76 138 C 58 150, 40 132, 50 114 C 32 108, 32 84, 52 76 C 38 60, 56 42, 74 48 C 80 30, 96 20, 100 24 Z"
          fill="none"
          stroke="#dc2626"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Center Double Concentric Spiral */}
        <path
          d="M 100 65 A 35 35 0 1 1 68 108 A 22 22 0 1 1 92 84"
          fill="none"
          stroke="#dc2626"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Circular curved ribbon text for scoreText (e.g. "たいへんよくできました") */}
        <defs>
          <path
            id={pathId}
            d="M 28 100 A 72 72 0 1 1 172 100 A 72 72 0 1 1 28 100"
          />
        </defs>
        <text 
          fill="#dc2626" 
          fontFamily="'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif" 
          fontWeight="900" 
          fontSize="12.5" 
          letterSpacing="2.5"
        >
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {scoreText}
          </textPath>
        </text>
      </svg>
      
      {/* Visual Inking Offset Stamp Angle */}
      <div className="absolute inset-0 border-2 border-dashed border-red-500/20 rounded-full rotate-12 pointer-events-none" />
    </div>
  );
};
