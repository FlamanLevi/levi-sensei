import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, BarChart3, FileSpreadsheet, Dices, Type, Radio, UserCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';

interface TeacherOfficeMenuProps {
  openReports: () => void;
  openDiceModal: () => void;
  openAlphabet: () => void;
  openRosterManager?: () => void;
  launchGame: (gameId: string) => void;
  activeView: string;
  activeRoomCount: number;
  openRoomsModal: () => void;
}

export const TeacherOfficeMenu: React.FC<TeacherOfficeMenuProps> = ({
  openReports,
  openDiceModal,
  openAlphabet,
  openRosterManager,
  launchGame,
  activeView,
  activeRoomCount,
  openRoomsModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();
  const { playPop } = useAudio();

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    playPop();
    setIsOpen(false);
    callback();
  };

  const isReportsActive = activeView === 'REPORTS';

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Menu Trigger Button */}
      <button
        type="button"
        onClick={() => {
          playPop();
          setIsOpen(!isOpen);
        }}
        className={`px-2 sm:px-2.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer border ${
          isOpen || isReportsActive
            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 shadow-xs'
        }`}
        title={t('Teacher Office & Prep Tools (Debrief, Worksheets, Alphabet)', '職員室・授業準備・分析メニュー')}
      >
        <span>🏫</span>
        <span className="font-bold">{t('Office', '職員室')}</span>
        <ChevronDown size={12} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900 dark:text-white select-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🏫</span>
              <span className="text-xs font-black">
                {t('Teacher Office & Analytics', '職員室・教材準備・分析')}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {t('Non-Classroom Tools', '授業外ツール')}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {/* 1. Classroom Reports & Debrief */}
            <button
              type="button"
              onClick={() => handleAction(openReports)}
              className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                isReportsActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <BarChart3 size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{t('Classroom Analytics & Debrief', '学級授業分析・デブリーフ')}</span>
                  {isReportsActive && (
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                      {t('OPEN', '表示中')}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t('Roster stats, quiz accuracy & debrief', '出席状況・クイズ正答率・指導記録')}
                </div>
              </div>
            </button>

            {/* 2. Classroom Roster & Profile Manager */}
            {openRosterManager && (
              <button
                type="button"
                onClick={() => handleAction(openRosterManager)}
                className="w-full p-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <UserCheck size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                    {t('Class Roster & Profiles', '名簿・児童プロファイル管理')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {t('Edit names, avatars, and clear seats', '表示名・アイコン編集・席の解除')}
                  </div>
                </div>
              </button>
            )}

            {/* 2. Monster Worksheet Maker */}
            <button
              type="button"
              onClick={() => handleAction(() => launchGame('monster_maker'))}
              className="w-full p-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {t('Monster Worksheet Generator', 'モンスタープリント作成（印刷）')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t('Generate printable A4 coloring worksheets', 'A4印刷用ぬりえ・英単語ワークシート')}
                </div>
              </div>
            </button>

            {/* 3. Alphabet Comparison Studio */}
            <button
              type="button"
              onClick={() => handleAction(openAlphabet)}
              className="w-full p-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Type size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {t('Alphabet Comparison Studio', 'アルファベット比較ラボ')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t('Uppercase & lowercase 4-line stroke comparison', '教科書4線ノート・大文字小文字比較')}
                </div>
              </div>
            </button>

            {/* 4. Classroom Dice Roller */}
            <button
              type="button"
              onClick={() => handleAction(openDiceModal)}
              className="w-full p-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Dices size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100">
                  {t('Classroom Dice Roller', '教室のサイコロ・ダイス')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t('3D polyhedral & standard d6 dice', '3D多面体ダイス・数字／英語')}
                </div>
              </div>
            </button>

            {/* 5. Active Game Rooms */}
            <button
              type="button"
              onClick={() => handleAction(openRoomsModal)}
              className="w-full p-2 rounded-xl flex items-center gap-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                <Radio size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{t('Active Multiplayer Rooms', '進行中のゲーム部屋')}</span>
                  {activeRoomCount > 0 ? (
                    <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                      {activeRoomCount}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">0</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {t('Inspect or terminate live game rooms', 'ライブ部屋の確認・終了管理')}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
