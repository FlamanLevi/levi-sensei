import React from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { GradeLevel } from '@data/types';

interface GradeOption {
  key: GradeLevel;
  label: string;
  subLabelEn: string;
  subLabelJa: string;
  textbook: string;
  color: string;
  badgeBg: string;
}

const GRADE_OPTIONS: GradeOption[] = [
  { key: 'KD_3yo', label: 'KD', subLabelEn: 'Kinder 3yo', subLabelJa: '年少 3yo', textbook: 'Borderlink', color: 'from-pink-400 to-rose-400', badgeBg: 'bg-pink-100 text-pink-700' },
  { key: 'KD_4yo', label: 'KD', subLabelEn: 'Kinder 4yo', subLabelJa: '年中 4yo', textbook: 'Borderlink', color: 'from-pink-400 to-rose-400', badgeBg: 'bg-pink-100 text-pink-700' },
  { key: 'KD_5yo', label: 'KD', subLabelEn: 'Kinder 5yo', subLabelJa: '年長 5yo', textbook: 'Borderlink', color: 'from-pink-400 to-rose-400', badgeBg: 'bg-pink-100 text-pink-700' },
  { key: 'ES_G1', label: 'G1', subLabelEn: 'Grade 1', subLabelJa: '小学1年', textbook: 'Borderlink', color: 'from-amber-400 to-orange-400', badgeBg: 'bg-amber-100 text-amber-800' },
  { key: 'ES_G2', label: 'G2', subLabelEn: 'Grade 2', subLabelJa: '小学2年', textbook: 'Borderlink', color: 'from-amber-400 to-orange-400', badgeBg: 'bg-amber-100 text-amber-800' },
  { key: 'ES_G3', label: 'G3', subLabelEn: 'Grade 3', subLabelJa: '小学3年', textbook: "Let's Try 1", color: 'from-emerald-400 to-teal-500', badgeBg: 'bg-emerald-100 text-emerald-800' },
  { key: 'ES_G4', label: 'G4', subLabelEn: 'Grade 4', subLabelJa: '小学4年', textbook: "Let's Try 2", color: 'from-teal-400 to-cyan-500', badgeBg: 'bg-teal-100 text-teal-800' },
  { key: 'ES_G5', label: 'G5', subLabelEn: 'Grade 5', subLabelJa: '小学5年', textbook: 'Here We Go 5', color: 'from-blue-500 to-indigo-600', badgeBg: 'bg-blue-100 text-blue-800' },
  { key: 'ES_G6', label: 'G6', subLabelEn: 'Grade 6', subLabelJa: '小学6年', textbook: 'Here We Go 6', color: 'from-indigo-500 to-violet-600', badgeBg: 'bg-indigo-100 text-indigo-800' },
  { key: 'JHS_G1', label: 'JHS', subLabelEn: 'JHS 1', subLabelJa: '中学1年', textbook: 'Borderlink', color: 'from-purple-400 to-fuchsia-500', badgeBg: 'bg-purple-100 text-purple-800' }
];

export const GradeSelector: React.FC = () => {
  const { activeGrade, setActiveGrade, setActiveUnit, setActiveCategory } = useClassroom();
  const { playPop } = useAudio();
  const { t, language } = useLanguage();

  const handleSelect = (g: GradeLevel) => {
    playPop();
    setActiveGrade(g);
    setActiveUnit('ALL');
    setActiveCategory('ALL');
  };

  return (
    <div className="w-full overflow-x-auto py-2 no-scrollbar bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
      <div className="flex items-center gap-2.5 min-w-max px-4">
        <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
          {t("Select Grade:", "学年を選択:")}
        </span>
        {GRADE_OPTIONS.map(opt => {
          const isSelected = activeGrade === opt.key;
          const subLabel = language === 'ja' ? opt.subLabelJa : opt.subLabelEn;
          const isWip = opt.key.startsWith('KD') || opt.key.startsWith('JHS');
          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              className={`relative px-4 py-2 rounded-2xl transition-all transform flex flex-col items-center justify-center border-2 ${
                isSelected
                  ? `bg-gradient-to-b ${opt.color} text-white border-transparent shadow-lg scale-105 -translate-y-0.5`
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs'
              }`}
            >
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black tracking-tight">{opt.label}</span>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white/90' : 'text-slate-400 dark:text-slate-500'}`}>
                  {subLabel}
                </span>
              </div>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full mt-0.5 ${
                isSelected ? 'bg-black/20 text-white' : opt.badgeBg
              }`}>
                {opt.textbook} {isWip ? (language === 'ja' ? '• 準備中' : '• Coming Soon') : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
