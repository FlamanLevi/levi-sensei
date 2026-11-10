import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface CinemaActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  shortcut?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'teal' | 'yellow' | 'slate';
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  emerald:
    'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-emerald-300 text-white shadow-emerald-500/40',
  amber:
    'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 border-amber-300 text-white shadow-amber-500/40',
  yellow:
    'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 border-yellow-200 text-slate-950 shadow-yellow-500/40 font-black',
  indigo:
    'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 border-indigo-400 text-white shadow-indigo-500/40',
  rose:
    'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-400 hover:to-pink-400 border-rose-300 text-white shadow-rose-500/40',
  teal:
    'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 border-teal-300 text-white shadow-teal-500/40',
  slate:
    'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 shadow-slate-900/40'
};

const SIZE_STYLES: Record<string, { btn: string; text: string; icon: number }> = {
  md: { btn: 'py-2.5 px-4', text: 'text-base sm:text-lg', icon: 20 },
  lg: { btn: 'py-3 sm:py-3.5 px-6', text: 'text-xl sm:text-2xl', icon: 24 },
  xl: { btn: 'py-3.5 sm:py-4.5 px-8', text: 'text-2xl sm:text-3xl', icon: 28 }
};

export const CinemaActionButton: React.FC<CinemaActionButtonProps> = ({
  onClick,
  disabled = false,
  label,
  sublabel,
  shortcut,
  icon,
  rightIcon,
  variant = 'emerald',
  size = 'lg',
  className = ''
}) => {
  const vStyle = disabled
    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed shadow-none'
    : VARIANT_STYLES[variant] || VARIANT_STYLES.emerald;

  const sStyle = SIZE_STYLES[size] || SIZE_STYLES.lg;

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full ${sStyle.btn} font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-3 border-2 cursor-pointer ${vStyle} ${className}`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className={`${sStyle.text} tracking-wide truncate`}>{label}</span>
        {rightIcon !== undefined ? (
          rightIcon
        ) : (
          <ChevronRight size={sStyle.icon} className="shrink-0" />
        )}
      </button>

      {(shortcut || sublabel) && (
        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
          {sublabel && <span>{sublabel}</span>}
          {shortcut && (
            <span>
              {sublabel ? '•' : ''} Keyboard: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">{shortcut}</kbd>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
