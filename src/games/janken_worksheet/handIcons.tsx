import React from 'react';
import { PrintInkTheme } from './types';

interface HandSvgProps {
  className?: string;
  inkTheme?: PrintInkTheme;
}

/**
 * Clean, copier-safe vector Rock (Fist) hand illustration
 */
export const RockHandSvg: React.FC<HandSvgProps> = ({
  className = 'w-10 h-10',
  inkTheme = 'color'
}) => {
  const fill = inkTheme === 'bw' ? '#ffffff' : '#fde68a';
  const accent = inkTheme === 'bw' ? '#e2e8f0' : '#fcd34d';
  const stroke = '#0f172a';

  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Rock">
      {/* Wrist */}
      <path
        d="M27 56 L27 72 C27 74 53 74 53 72 L53 56"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Main fist silhouette */}
      <rect
        x="17"
        y="22"
        width="46"
        height="40"
        rx="16"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
      />
      {/* Four curled knuckles at top */}
      <path
        d="M28 22 V34 M40 21 V35 M52 22 V34"
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Curled finger bottom crease */}
      <path
        d="M21 34 C25 38, 32 38, 35 34 C38 38, 43 38, 46 34 C49 38, 55 38, 59 34"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Thumb wrapped across front */}
      <path
        d="M17 42 C17 34, 34 34, 38 41 C41 46, 37 53, 28 53 C21 53, 17 48, 17 42 Z"
        fill={accent}
        stroke={stroke}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Clean, copier-safe vector Scissors (Two-finger V) hand illustration
 */
export const ScissorsHandSvg: React.FC<HandSvgProps> = ({
  className = 'w-10 h-10',
  inkTheme = 'color'
}) => {
  const fill = inkTheme === 'bw' ? '#ffffff' : '#fde68a';
  const accent = inkTheme === 'bw' ? '#e2e8f0' : '#fcd34d';
  const stroke = '#0f172a';

  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Scissors">
      {/* Wrist */}
      <path
        d="M28 58 L28 73 C28 75 52 75 52 73 L52 58"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Index finger (left V arm) */}
      <path
        d="M32 39 L22 14 C20.5 9.5, 27 7, 29.5 11.5 L39 36"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Middle finger (right V arm) */}
      <path
        d="M40 36 L49 11.5 C51.5 7, 58 9.5, 56.5 14 L47 39"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Palm base */}
      <path
        d="M21 44 C21 35, 59 35, 59 44 L59 54 C59 62, 50 66, 40 66 C30 66, 21 62, 21 54 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Curled ring & pinky fingers */}
      <rect x="40" y="38" width="9.5" height="12" rx="4.5" fill={accent} stroke={stroke} strokeWidth="2.5" />
      <rect x="49.5" y="40" width="9" height="11" rx="4.5" fill={accent} stroke={stroke} strokeWidth="2.5" />
      {/* Thumb folded across */}
      <path
        d="M21 46 C21 39, 36 39, 41 44 C44 48, 41 55, 33 55 C25 55, 21 51, 21 46 Z"
        fill={accent}
        stroke={stroke}
        strokeWidth="2.7"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Clean, copier-safe vector Paper (Open 5-finger palm) hand illustration
 */
export const PaperHandSvg: React.FC<HandSvgProps> = ({
  className = 'w-10 h-10',
  inkTheme = 'color'
}) => {
  const fill = inkTheme === 'bw' ? '#ffffff' : '#fde68a';
  const stroke = '#0f172a';

  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Paper">
      {/* Wrist */}
      <path
        d="M29 60 L29 74 C29 76 51 76 51 74 L51 60"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Open palm + 5 spread fingers */}
      <path
        d="
          M25 54
          L14 43 C11 40, 15.5 35, 19 38.5 L26 44
          L22 20 C21.2 15.5, 27.8 14.5, 28.8 19 L33 36
          L35 12 C35 7.5, 42 7.5, 42 12 L42.5 35
          L47.5 14 C48.5 9.5, 55 11, 54 15.5 L50 37
          L57.5 22 C59.5 18, 65 20.5, 63 25 L55 47
          C54 57, 48 64, 40 64
          C32 64, 26.5 59, 25 54 Z
        "
        fill={fill}
        stroke={stroke}
        strokeWidth="2.9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Subtle palm crease */}
      <path
        d="M32 49 C37 46, 44 46, 49 50"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

interface StarburstBadgeProps {
  roundNumber: number;
  hiraganaOnly?: boolean;
  inkTheme?: PrintInkTheme;
  className?: string;
}

function buildStarburstPoints(cx: number, cy: number, outerR: number, innerR: number, spikes: number): string {
  const pts: string[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

const OUTER_STAR = buildStarburstPoints(50, 50, 47, 36, 14);
const INNER_STAR = buildStarburstPoints(50, 50, 42.5, 32, 14);

/**
 * Textbook-style 14-point jagged starburst round badge ("1回目", "2回目", etc.)
 */
export const StarburstRoundBadge: React.FC<StarburstBadgeProps> = ({
  roundNumber,
  hiraganaOnly = false,
  inkTheme = 'color',
  className = 'w-16 h-16'
}) => {
  const isBw = inkTheme === 'bw';
  const label = hiraganaOnly ? `${roundNumber}かいめ` : `${roundNumber}回目`;
  const textFill = isBw ? '#0f172a' : '#ffffff';

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-label={label}>
        <polygon
          points={OUTER_STAR}
          fill={isBw ? '#ffffff' : '#e45c5c'}
          stroke={isBw ? '#0f172a' : '#dc2626'}
          strokeWidth={isBw ? '3' : '1.5'}
          strokeLinejoin="round"
        />
        <polygon
          points={INNER_STAR}
          fill="none"
          stroke={isBw ? '#0f172a' : '#ffffff'}
          strokeWidth={isBw ? '1.6' : '2'}
          strokeLinejoin="round"
        />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontWeight="900"
          fontSize={hiraganaOnly ? '17.5' : '23'}
          style={{ letterSpacing: '-0.02em' }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
};
