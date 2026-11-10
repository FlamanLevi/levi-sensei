import React from 'react';
import { DigitalStyle } from './types';

interface DigitalClockProps {
  hour: number;
  minute: number;
  period?: 'a.m.' | 'p.m.';
  styleType: DigitalStyle;
  is24Hour?: boolean;
  className?: string;
}

/**
 * Accurate 7-segment LCD digit.
 *
 * viewBox: 0 0 50 120  (2.4:1 tall aspect ratio — matches real CASIO/LCD clocks)
 *
 * Key geometry rules for authentic junctions:
 *   • ch = th/2  → exactly 45° chamfer on every segment tip
 *   • gp = 0     → zero positional gap; segments touch at their chamfer points
 *   • This produces the characteristic 90° right-angle notch at every junction
 *     (the "perpendicular" corner the user described)
 *
 * Segment map: [a, b, c, d, e, f, g]
 *   a = top horizontal      b = top-right vertical    c = bottom-right vertical
 *   d = bottom horizontal   e = bottom-left vertical  f = top-left vertical
 *   g = center horizontal
 */
const Svg7SegmentDigit: React.FC<{ char: string; color: string; offColor: string }> = ({
  char, color, offColor
}) => {
  const segments: Record<string, boolean[]> = {
    '0': [true,  true,  true,  true,  true,  true,  false],
    '1': [false, true,  true,  false, false, false, false],
    '2': [true,  true,  false, true,  true,  false, true ],
    '3': [true,  true,  true,  true,  false, false, true ],
    '4': [false, true,  true,  false, false, true,  true ],
    '5': [true,  false, true,  true,  false, true,  true ],
    '6': [true,  false, true,  true,  true,  true,  true ],
    '7': [true,  true,  true,  false, false, false, false],
    '8': [true,  true,  true,  true,  true,  true,  true ],
    '9': [true,  true,  true,  true,  false, true,  true ],
    ' ': [false, false, false, false, false, false, false],
  };

  const active = segments[char] ?? segments[' '];

  // ── Geometry ────────────────────────────────────────────────────────────────
  const W  = 50;
  const H  = 120;
  const th = 12;          // segment thickness
  const ch = th / 2;      // chamfer = th/2 → exactly 45°, junctions meet at 90°
  const mx = 2;           // outer margin

  // Horizontal segment Y bounds
  const aY1 = mx;                   const aY2 = aY1 + th;       //   2 → 14
  const gY1 = (H - th) / 2;        const gY2 = gY1 + th;       //  54 → 66
  const dY1 = H - mx - th;         const dY2 = H - mx;         // 106 → 118

  // Vertical segment Y bounds (gp=0: start/end exactly at horizontal edges)
  const topY1 = aY2;  const topY2 = gY1;   //  14 → 54  (40 px)
  const botY1 = gY2;  const botY2 = dY1;   //  66 → 106 (40 px)

  // Column X bounds
  const lX1 = mx;        const lX2 = lX1 + th;      //  2 → 14
  const rX1 = W - mx - th; const rX2 = W - mx;      // 36 → 48

  // Horizontal hexagon (left tip → top-left → top-right → right tip → bottom-right → bottom-left)
  const hPoly = (y1: number, y2: number): string => {
    const mid = (y1 + y2) / 2;
    const x1 = mx, x2 = W - mx;            // full span: 2 → 48
    return [
      `${x1},${mid}`,
      `${x1 + ch},${y1}`,
      `${x2 - ch},${y1}`,
      `${x2},${mid}`,
      `${x2 - ch},${y2}`,
      `${x1 + ch},${y2}`,
    ].join(' ');
  };

  // Vertical hexagon (top tip → top-right → bottom-right → bottom tip → bottom-left → top-left)
  const vPoly = (x1: number, x2: number, y1: number, y2: number): string => {
    const midX = (x1 + x2) / 2;
    return [
      `${midX},${y1}`,
      `${x2},${y1 + ch}`,
      `${x2},${y2 - ch}`,
      `${midX},${y2}`,
      `${x1},${y2 - ch}`,
      `${x1},${y1 + ch}`,
    ].join(' ');
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-12 sm:w-16 md:w-20 h-auto">
      <polygon points={hPoly(aY1, aY2)}              fill={active[0] ? color : offColor} /> {/* a top    */}
      <polygon points={vPoly(rX1, rX2, topY1, topY2)} fill={active[1] ? color : offColor} /> {/* b top-R  */}
      <polygon points={vPoly(rX1, rX2, botY1, botY2)} fill={active[2] ? color : offColor} /> {/* c bot-R  */}
      <polygon points={hPoly(dY1, dY2)}              fill={active[3] ? color : offColor} /> {/* d bottom */}
      <polygon points={vPoly(lX1, lX2, botY1, botY2)} fill={active[4] ? color : offColor} /> {/* e bot-L  */}
      <polygon points={vPoly(lX1, lX2, topY1, topY2)} fill={active[5] ? color : offColor} /> {/* f top-L  */}
      <polygon points={hPoly(gY1, gY2)}              fill={active[6] ? color : offColor} /> {/* g center */}
    </svg>
  );
};

export const DigitalClock: React.FC<DigitalClockProps> = ({
  hour, minute, period = 'a.m.', styleType, is24Hour = false, className = ''
}) => {
  const displayHour = is24Hour ? hour : (hour % 12 === 0 ? 12 : hour % 12);
  const hourStr = displayHour.toString().padStart(2, ' ');
  const minuteStr = minute.toString().padStart(2, '0');

  if (styleType === 'RETRO_LCD') {
    const litColor   = '#39ff7a';
    const ghostColor = '#1e4d26';

    return (
      <div
        className={`bg-[#071510] border-[3px] border-[#1a4a2a] rounded-2xl px-4 py-4 sm:px-6 sm:py-5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.9),0_8px_20px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative select-none ${className}`}
      >
        <svg width="0" height="0" className="absolute">
          <defs>
            <filter id="phosphor-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>

        <div className="w-full flex items-center justify-between text-[9px] font-mono tracking-widest text-[#39ff7a]/40 mb-2 px-1 border-b border-[#1a4a2a]/60 pb-1">
          <span>CASIO / QUARTZ</span>
          <div className="flex items-center gap-2.5">
            <span className={period === 'a.m.' ? 'text-[#39ff7a] font-black drop-shadow-[0_0_4px_#39ff7a]' : 'text-[#1a3d20]'}>AM</span>
            <span className={period === 'p.m.' ? 'text-[#39ff7a] font-black drop-shadow-[0_0_4px_#39ff7a]' : 'text-[#1a3d20]'}>PM</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-2" style={{ filter: 'url(#phosphor-glow)' }}>
          <Svg7SegmentDigit char={hourStr[0]} color={litColor} offColor={ghostColor} />
          <Svg7SegmentDigit char={hourStr[1]} color={litColor} offColor={ghostColor} />

          {/* Colon — two round LCD dots, vertically centred in digit height */}
          <div className="flex flex-col justify-center items-center gap-5 px-1 self-stretch pb-3">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#39ff7a] shadow-[0_0_6px_3px_rgba(57,255,122,0.55)] mt-auto" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#39ff7a] shadow-[0_0_6px_3px_rgba(57,255,122,0.55)] mb-auto" />
          </div>

          <Svg7SegmentDigit char={minuteStr[0]} color={litColor} offColor={ghostColor} />
          <Svg7SegmentDigit char={minuteStr[1]} color={litColor} offColor={ghostColor} />
        </div>

        <div className="mt-3 text-[10px] font-mono font-bold text-[#39ff7a]/50 tracking-widest uppercase">
          {`It's ${displayHour}:${minuteStr} ${period}`}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center justify-center relative select-none ${className}`}
    >
      <div className="flex items-baseline gap-2 sm:gap-3">
        <span className="font-mono font-black text-6xl sm:text-8xl md:text-9xl text-slate-900 dark:text-white tracking-tight leading-none drop-shadow-sm">
          {`${displayHour.toString().padStart(2, '0')}:${minuteStr}`}
        </span>
        <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-black text-sm sm:text-lg uppercase">
          {period}
        </span>
      </div>
      <div className="mt-3 text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wide">
        {`It's ${displayHour}:${minuteStr} ${period}`}
      </div>
    </div>
  );
};