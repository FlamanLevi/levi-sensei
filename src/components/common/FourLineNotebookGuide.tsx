import React from 'react';

export interface FourLineNotebookGuideProps {
  word: string;
  mode?: 'solid' | 'trace' | 'blank';
  className?: string;
}

/**
 * FourLineNotebookGuide
 * Authentic Japanese Elementary MEXT 4-Line English Notebook Guide
 *
 * Mathematical Coordinates (viewBox 0 0 320 80):
 * - Line 1 (y = 14): Top Ascender Line (cap line)
 * - Line 2 (y = 33): Midline (Dashed x-height waistline)
 * - Line 3 (y = 52): Red Baseline (Classic MEXT notebook red line, stroke y=51..53)
 * - Line 4 (y = 71): Bottom Descender Line
 *
 * Typography:
 * Pinned to y = 50 using SVG dominant-baseline="alphabetic" so standard letters
 * rest squarely on top of the red baseline without drooping through, while
 * x-height aligns with the dashed midline (y=33), ascenders reach Line 1 (y=14),
 * and only descenders (g, j, p, q, y) cross below the red baseline down toward Line 4 (y=71).
 * Strict MEXT elementary font stack with single-story 'a' and 'g'.
 */
export const FourLineNotebookGuide: React.FC<FourLineNotebookGuideProps> = ({
  word,
  mode = 'solid',
  className = 'w-full h-auto'
}) => {
  // Clean word for display (replace underscores with spaces)
  const displayWord = (word || '').replace(/_/g, ' ').trim();

  // Dynamic font sizing to ensure long words/phrases fit neatly within the 320px width
  const baseSize = 40;
  const maxAvailableWidth = 290;
  const estimatedCharWidth = baseSize * 0.54;
  const totalEstimatedWidth = displayWord.length * estimatedCharWidth;
  const scale = totalEstimatedWidth > maxAvailableWidth ? maxAvailableWidth / totalEstimatedWidth : 1;
  const fontSize = Math.max(22, Math.round(baseSize * scale));

  return (
    <div className={`relative w-full flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 320 80"
        className="w-full h-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Line 1: Top Ascender Line */}
        <line
          x1="8"
          y1="14"
          x2="312"
          y2="14"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Line 2: Midline (Dashed x-height waistline) */}
        <line
          x1="8"
          y1="33"
          x2="312"
          y2="33"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1"
          strokeDasharray="4,4"
          strokeLinecap="round"
        />

        {/* Line 3: The Signature MEXT Red Baseline */}
        <line
          x1="8"
          y1="52"
          x2="312"
          y2="52"
          className="stroke-rose-500 dark:stroke-rose-400"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Line 4: Bottom Descender Line */}
        <line
          x1="8"
          y1="71"
          x2="312"
          y2="71"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Handwriting Typography (Letters rest on Red Baseline; only descenders cross below) */}
        {mode !== 'blank' && (
          <text
            x="160"
            y="50"
            textAnchor="middle"
            dominantBaseline="alphabetic"
            fontSize={fontSize}
            style={{
              fontFamily: "'UD Digi Kyokasho NP-R', 'UD Digi Kyokasho NK-R', 'BIZ UDPGothic', 'Zen Maru Gothic', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.04em'
            }}
            className={
              mode === 'trace'
                ? 'fill-transparent stroke-slate-400 dark:stroke-slate-400 [stroke-dasharray:3,3] [stroke-width:1.5]'
                : 'fill-slate-900 dark:fill-slate-100'
            }
          >
            {displayWord}
          </text>
        )}
      </svg>
    </div>
  );
};
