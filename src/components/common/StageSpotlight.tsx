import React from 'react';

export interface StageSpotlightProps {
  active?: boolean;
  color?: 'amber' | 'cyan' | 'white';
  className?: string;
  children?: React.ReactNode;
}

export const StageSpotlight: React.FC<StageSpotlightProps> = ({
  active = true,
  color = 'amber',
  className = '',
  children
}) => {
  if (!active) return <>{children}</>;

  const colorStyles = {
    amber: {
      gradient: 'from-amber-300/35 via-amber-400/10 to-transparent',
      glow: 'rgba(251, 191, 36, 0.4)',
      cone: 'polygon(35% 0%, 65% 0%, 95% 100%, 5% 100%)',
      source: 'bg-amber-300'
    },
    cyan: {
      gradient: 'from-sky-300/35 via-cyan-400/10 to-transparent',
      glow: 'rgba(56, 189, 248, 0.4)',
      cone: 'polygon(35% 0%, 65% 0%, 95% 100%, 5% 100%)',
      source: 'bg-sky-300'
    },
    white: {
      gradient: 'from-white/35 via-white/10 to-transparent',
      glow: 'rgba(255, 255, 255, 0.4)',
      cone: 'polygon(35% 0%, 65% 0%, 95% 100%, 5% 100%)',
      source: 'bg-white'
    }
  }[color];

  return (
    <div className={`pointer-events-none select-none ${children ? `relative overflow-hidden ${className}` : `absolute inset-0 z-0 overflow-hidden ${className}`}`}>
      {/* Overhead Spotlight Beam (EZCast-clean, zero blur filter choke) */}
      <div 
        className={`absolute -top-6 inset-x-0 h-full pointer-events-none z-10 opacity-80 animate-in fade-in duration-700 bg-gradient-to-b ${colorStyles.gradient}`}
        style={{
          clipPath: colorStyles.cone
        }}
      />

      {/* Top Light Bulb Glint */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
        <div 
          className={`w-16 h-3 rounded-full ${colorStyles.source} shadow-lg`}
          style={{ boxShadow: `0 0 20px 8px ${colorStyles.glow}` }}
        />
      </div>

      {/* Child Content under spotlight */}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};
