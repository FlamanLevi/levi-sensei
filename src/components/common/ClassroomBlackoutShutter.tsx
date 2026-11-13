import React from 'react';
import { PandaMascot } from '@/components/mascot/PandaMascot';
import { useLanguage } from '@/context/LanguageContext';

export interface ClassroomBlackoutShutterProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ClassroomBlackoutShutter: React.FC<ClassroomBlackoutShutterProps> = ({
  isOpen,
  onToggle
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      onClick={onToggle}
      className="fixed inset-0 z-50 bg-[#070c18] flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer animate-in fade-in duration-200"
      title="Click or press B to resume"
    >
      <div className="w-36 h-36 rounded-3xl bg-slate-900 border-2 border-slate-700/60 flex items-center justify-center shadow-2xl mb-4">
        <PandaMascot mood="idle" size={100} />
      </div>

      <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-3">
        {t("Eyes and Ears to the Front", <>お<ruby>話<rt>はなし</rt></ruby>を<ruby>聞<rt>き</rt></ruby>きましょう</>)}
      </h2>

      <p className="text-xl sm:text-2xl font-bold text-slate-300 max-w-md">
        {t("Pause for announcements or teacher explanation", "せんせいの おはなしを ききましょう")}
      </p>

      <div className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-slate-200 text-xs sm:text-sm font-black animate-pulse">
        <span>⌨️</span>
        <span>{t("Press 'B' or Tap Screen to Resume", <><ruby>画面<rt>がめん</rt></ruby>タップ または [B]キーで<ruby>再開<rt>さいかい</rt></ruby></>)}</span>
      </div>
    </div>
  );
};
