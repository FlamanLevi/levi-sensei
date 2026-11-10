import React from 'react';
import { Mic } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { MicSensitivity } from './types';

interface VoiceEnergyMeterProps {
  energy: number;       // 0.0 to 1.0
  isLoud: boolean;
  isMicActive: boolean;
  sensitivity: MicSensitivity;
  onToggleMic: () => void;
  onCycleSensitivity?: () => void;
}

export const VoiceEnergyMeter: React.FC<VoiceEnergyMeterProps> = ({
  energy,
  isLoud,
  isMicActive,
  sensitivity,
  onToggleMic,
  onCycleSensitivity
}) => {
  const { t } = useLanguage();
  const fillPct = Math.round(Math.min(100, Math.max(4, energy * 100)));

  const sensitivityLabels: Record<MicSensitivity, { en: string; ja: string; color: string }> = {
    APARTMENT: { en: 'Apartment / Quiet', ja: '自宅・静音', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    HIGH: { en: 'High', ja: '高感度', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    NORMAL: { en: 'Normal Class', ja: '標準教室', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    CLASSROOM_LOUD: { en: 'Loud Class', ja: '大教室・大声', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
  };

  const currentLabel = sensitivityLabels[sensitivity] || sensitivityLabels.NORMAL;

  return (
    <div className="bg-slate-900/90 rounded-2xl p-2.5 sm:p-3 border-2 border-slate-800 shadow-xl flex items-center gap-3 select-none">
      {/* Mic Status Toggle Button */}
      <button
        type="button"
        onClick={onToggleMic}
        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all cursor-pointer shadow-md shrink-0 active:scale-95 ${
          isMicActive
            ? isLoud
              ? 'bg-rose-500 text-white animate-bounce ring-2 ring-rose-400'
              : 'bg-emerald-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-white'
        }`}
        title={isMicActive ? t('Microphone active (Tap to mute)', 'マイク稼働中（タップでオフ）') : t('Microphone off (Tap to start)', 'マイク停止中（タップで開始）')}
      >
        <Mic size={18} className={isLoud ? 'animate-pulse' : ''} />
      </button>

      {/* Voltage Meter Bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-black mb-1">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span>{isLoud ? '🔥' : '⚡'}</span>
            <span>{t('VOICE POWER', '声のパワー')}</span>

            {/* Clickable sensitivity badge */}
            {onCycleSensitivity && (
              <button
                type="button"
                onClick={onCycleSensitivity}
                className={`ml-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 ${currentLabel.color}`}
                title={t('Click to cycle microphone sensitivity', 'クリックで感度を切替')}
              >
                🎙️ {t(currentLabel.en, currentLabel.ja)}
              </button>
            )}
          </span>

          <span className={`font-mono ${isLoud ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
            {isLoud ? t('BOOST ACTIVE! 🔥', 'パワーMAX! 🔥') : isMicActive ? `${fillPct}%` : t('CLICKER ONLY', 'クリック操作')}
          </span>
        </div>

        {/* Meter Gauge */}
        <div className="w-full h-3 sm:h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5 relative">
          <div
            className={`h-full rounded-full transition-all duration-75 ease-out ${
              isLoud
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${isMicActive ? fillPct : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
