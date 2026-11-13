import React from 'react';
import { Eye, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface SneakPeekOverlayProps {
  countdown: number;
  onCancel: () => void;
}

export const SneakPeekOverlay: React.FC<SneakPeekOverlayProps> = ({ countdown, onCancel }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-3 rounded-2xl shadow-xl flex flex-nowrap items-center justify-between gap-2 border-2 border-amber-300 dark:border-amber-600 animate-pulse overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-3 font-black text-sm sm:text-base whitespace-nowrap shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner shrink-0">
          <Eye size={22} className="text-white" />
        </div>
        <div>
          <span>{t('SNEAK PEEK! Look closely & remember!', <>チラ<ruby>見<rt>み</rt></ruby>せ中！ よく おぼえてね！</>)}</span>
          <span className="ml-2 px-2 py-0.5 rounded-lg bg-black/30 font-mono text-amber-200">
            {t(`Time Left: ${countdown}s`, <>残り: {countdown}秒</>)}
          </span>
        </div>
      </div>
      <button
        onClick={onCancel}
        className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
      >
        <X size={14} />
        <span>{t('Skip', '今すぐ とじる')}</span>
      </button>
    </div>
  );
};
