import React, { useRef, useCallback } from 'react';

interface AnalogClockProps {
  hour: number;        // 1 - 12
  minute: number;      // 0 - 59
  interactive?: boolean;
  onTimeChange?: (newHour: number, newMinute: number) => void;
  size?: number;       // default 360
  resolution?: number; // 5, 15, 30, 60
}

export const AnalogClock: React.FC<AnalogClockProps> = ({
  hour,
  minute,
  interactive = false,
  onTimeChange,
  size = 360,
  resolution = 5
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeHandRef = useRef<'hour' | 'minute' | null>(null);

  // Realistic mechanical angles:
  // Minute hand: 360° / 60 = 6° per minute
  // Hour hand: 360° / 12 = 30° per hour + 0.5° per minute
  const minuteAngle = minute * 6;
  const hourAngle = ((hour % 12) + minute / 60) * 30;

  // Center & Radii
  const center = size / 2;
  const radius = center - 16;
  const hourHandLength = radius * 0.52;
  const minuteHandLength = radius * 0.76;

  // Coordinate calculation for dragging
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!interactive || !activeHandRef.current || !svgRef.current || !onTimeChange) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    // Calculate angle in degrees (0° = 12 o'clock, clockwise)
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (activeHandRef.current === 'minute') {
      let rawMin = Math.round(deg / 6);
      if (resolution > 1) {
        rawMin = Math.round(rawMin / resolution) * resolution;
      }
      rawMin = (rawMin % 60 + 60) % 60;
      onTimeChange(hour, rawMin);
    } else if (activeHandRef.current === 'hour') {
      let rawHr = Math.round(deg / 30);
      rawHr = rawHr === 0 ? 12 : rawHr;
      onTimeChange(rawHr, minute);
    }
  }, [interactive, onTimeChange, hour, minute, resolution]);

  const handlePointerUp = useCallback(() => {
    activeHandRef.current = null;
  }, []);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="select-none touch-none filter drop-shadow-xl"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <defs>
        {/* Beveled Casing Gradient */}
        <radialGradient id="clockBezel" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <radialGradient id="clockFace" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </radialGradient>
        <linearGradient id="hourHandGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="minuteHandGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        {/* Subtle drop shadow for hands */}
        <filter id="handShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer Casing Ring */}
      <circle
        cx={center}
        cy={center}
        r={radius + 12}
        fill="url(#clockBezel)"
        stroke="#64748b"
        strokeWidth="3"
      />

      {/* Main Dial Face */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="url(#clockFace)"
        stroke="#cbd5e1"
        strokeWidth="2"
      />

      {/* 60 Minute Tick Marks */}
      {Array.from({ length: 60 }).map((_, i) => {
        const isHour = i % 5 === 0;
        const tickAngle = (i * 6 * Math.PI) / 180;
        const inner = radius - (isHour ? 14 : 7);
        const outer = radius - 3;
        const x1 = center + inner * Math.sin(tickAngle);
        const y1 = center - inner * Math.cos(tickAngle);
        const x2 = center + outer * Math.sin(tickAngle);
        const y2 = center - outer * Math.cos(tickAngle);

        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isHour ? '#0f172a' : '#94a3b8'}
            strokeWidth={isHour ? 3 : 1.2}
            strokeLinecap="round"
          />
        );
      })}

      {/* 12 Hour Numerals (MEXT Digi-Kyokasho / Rounded) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const num = i + 1;
        const angle = (num * 30 * Math.PI) / 180;
        const numRadius = radius - 28;
        const x = center + numRadius * Math.sin(angle);
        const y = center - numRadius * Math.cos(angle);

        return (
          <text
            key={num}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'UD Digi Kyokasho NP-R', 'BIZ UDPGothic', sans-serif"
            fontWeight="900"
            fontSize={size > 300 ? 24 : 18}
            fill="#0f172a"
            className="select-none pointer-events-none"
          >
            {num}
          </text>
        );
      })}

      {/* 5-Minute Outer Badges for Elementary Scaffolding (:05, :10, :15...) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const minVal = (i * 5).toString().padStart(2, '0');
        const angle = (i * 30 * Math.PI) / 180;
        const badgeRadius = radius - 46;
        const x = center + badgeRadius * Math.sin(angle);
        const y = center - badgeRadius * Math.cos(angle);

        return (
          <text
            key={`min-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'Nunito', monospace"
            fontWeight="700"
            fontSize={10}
            fill="#0284c7"
            opacity={0.7}
            className="select-none pointer-events-none"
          >
            {`:${minVal}`}
          </text>
        );
      })}

      {/* Hour Hand (Short & Solid Black) */}
      <g
        transform={`rotate(${hourAngle} ${center} ${center})`}
        filter="url(#handShadow)"
        className={interactive ? 'cursor-grab active:cursor-grabbing' : ''}
        onPointerDown={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          activeHandRef.current = 'hour';
        }}
      >
        <path
          d={`M ${center - 5} ${center + 12} L ${center - 3.5} ${center - hourHandLength} L ${center} ${center - hourHandLength - 8} L ${center + 3.5} ${center - hourHandLength} L ${center + 5} ${center + 12} Z`}
          fill="url(#hourHandGrad)"
        />
        {/* Hour Touch Target Buffer */}
        {interactive && (
          <circle cx={center} cy={center - hourHandLength / 2} r="18" fill="transparent" />
        )}
      </g>

      {/* Minute Hand (Long & Accent Blue) */}
      <g
        transform={`rotate(${minuteAngle} ${center} ${center})`}
        filter="url(#handShadow)"
        className={interactive ? 'cursor-grab active:cursor-grabbing' : ''}
        onPointerDown={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          activeHandRef.current = 'minute';
        }}
      >
        <path
          d={`M ${center - 4} ${center + 16} L ${center - 2.5} ${center - minuteHandLength} L ${center} ${center - minuteHandLength - 10} L ${center + 2.5} ${center - minuteHandLength} L ${center + 4} ${center + 16} Z`}
          fill="url(#minuteHandGrad)"
        />
        {/* Minute Pointer Tip */}
        <circle cx={center} cy={center - minuteHandLength} r="4" fill="#38bdf8" />
        {/* Minute Touch Target Buffer */}
        {interactive && (
          <circle cx={center} cy={center - minuteHandLength / 2} r="20" fill="transparent" />
        )}
      </g>

      {/* Center Brass Cap */}
      <circle cx={center} cy={center} r="9" fill="#0f172a" />
      <circle cx={center} cy={center} r="5" fill="#facc15" />
      <circle cx={center} cy={center} r="2" fill="#ffffff" />
    </svg>
  );
};