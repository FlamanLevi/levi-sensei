import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, Sparkles, Sun, Moon, Lock, KeyRound, X, Radio } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { useClassroom } from '../../context/ClassroomContext';
import { useLanguage, LanguageToggle } from '../../context/LanguageContext';
import { SchoolClassSwitcher } from './SchoolClassSwitcher';
import { TeacherProfileSwitcher } from './TeacherProfileSwitcher';
import { TeacherOfficeMenu } from './TeacherOfficeMenu';
import { ActiveRoomsModal } from './ActiveRoomsModal';
import { ClassroomRosterManagerModal } from '../teacher/ClassroomRosterManagerModal';
import { safeSubscribe } from '@/services/rtdbSafe';

export const Header: React.FC = () => {
  const { isMuted, toggleMute, playPop } = useAudio();
  const { t, language } = useLanguage();
  const {
    theme,
    toggleTheme,
    userRole,
    setUserRole,
    unlockTeacher,
    lockTeacher,
    isTeacherUnlocked,
    activeView,
    exitToHub,
    openDictionary,
    openAlphabet,
    openReports,
    openPickerModal,
    openDiceModal,
    openRoutineModal,
    launchGame
  } = useClassroom();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [activeRoomCount, setActiveRoomCount] = useState<number>(0);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Monitor active rooms count in RTDB only when unlocked in Teacher mode
  useEffect(() => {
    if (userRole !== 'TEACHER' || !isTeacherUnlocked) {
      setActiveRoomCount(0);
      return;
    }
    const unsub = safeSubscribe<Record<string, unknown>>(
      'rooms',
      (val) => {
        setActiveRoomCount(val && typeof val === 'object' ? Object.keys(val).length : 0);
      },
      () => setActiveRoomCount(0)
    );
    return () => unsub();
  }, [userRole, isTeacherUnlocked]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    playPop();
    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const docEl = document.documentElement as unknown as {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
    };

    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (!isFs) {
      if (typeof docEl.requestFullscreen === 'function') {
        docEl.requestFullscreen().catch(() => {});
      } else if (typeof docEl.webkitRequestFullscreen === 'function') {
        docEl.webkitRequestFullscreen().catch(() => {});
      }
    } else {
      if (typeof doc.exitFullscreen === 'function') {
        doc.exitFullscreen().catch(() => {});
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        doc.webkitExitFullscreen().catch(() => {});
      }
    }
  };

  const handleTeacherClick = () => {
    playPop();
    if (!isTeacherUnlocked) {
      // Prompt for PIN to prevent children on iPads from switching to teacher mode
      setPinInput('');
      setPinError(false);
      setIsPinModalOpen(true);
    } else {
      setUserRole('TEACHER');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = unlockTeacher(pinInput);
    if (success) {
      playPop();
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 shadow-xs sticky top-0 z-40 transition-colors print:hidden">
      {/* ROW 1: Identity, Class Context, Teacher Profile & Global System Controls */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-nowrap">
        {/* Zone 1: Brand & Class Context */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap">
          <button
            onClick={() => { playPop(); exitToHub(); }}
            className="flex items-center gap-2 group text-left focus:outline-none shrink-0 cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
              <Sparkles size={18} className="animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight whitespace-nowrap">
                {language === 'ja' ? 'リヴァイ先生' : 'Levi-Sensei'}
              </h1>
            </div>
          </button>

          {/* Teacher-only School & Class Switcher docked right next to Brand on the left */}
          {userRole === 'TEACHER' && isTeacherUnlocked && (
            <>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
              <SchoolClassSwitcher />
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
              <TeacherProfileSwitcher />
            </>
          )}
        </div>

        {/* Zone 2: System Settings, Theme, Sound, Fullscreen & Lock */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          {/* Student-Only Quick Tools in Row 1 */}
          {userRole !== 'TEACHER' && (
            <div className="flex items-center gap-1 mr-1">
              <button
                onClick={() => { playPop(); openDictionary(); }}
                className={`px-2.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer ${
                  activeView === 'DICTIONARY'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title={t("Interactive Picture Dictionary", "ピクチャーディクショナリー（絵辞書）")}
              >
                <span>📚</span>
                <span className="hidden sm:inline">{t("Dict", "辞書")}</span>
              </button>

              <button
                onClick={() => { playPop(); openDiceModal(); }}
                className="px-2.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 shrink-0 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 border border-blue-300 dark:border-blue-700/60 shadow-xs cursor-pointer whitespace-nowrap"
                title={t("Classroom Dice Roller", "教室のサイコロ・ダイス")}
              >
                <span>🎲</span>
                <span className="hidden sm:inline">{t("Dice", "サイコロ")}</span>
              </button>
            </div>
          )}

          {/* Language Toggle Pill */}
          <LanguageToggle size="sm" />

          {/* Teacher Active Rooms Manager - Only visible in header when a room is actually broadcasting */}
          {userRole === 'TEACHER' && isTeacherUnlocked && activeRoomCount > 0 && (
            <button
              onClick={() => { playPop(); setIsRoomsModalOpen(true); }}
              className="px-2.5 py-1.5 bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-sm animate-pulse rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shrink-0 whitespace-nowrap cursor-pointer"
              title={t(
                `Active Rooms (${activeRoomCount}) - Click to manage`,
                `進行中の部屋: ${activeRoomCount}件（クリックで管理）`
              )}
            >
              <Radio size={14} className="text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline font-bold">{t("Rooms", "部屋")}</span>
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeRoomCount}
              </span>
            </button>
          )}

          {/* Compact Utility Cluster: Theme, Mute, Fullscreen */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 sm:p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => { playPop(); toggleTheme(); }}
              className="w-7 h-7 rounded-lg text-slate-700 dark:text-amber-400 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title={theme === 'dark' ? t('Switch to Light Mode (☀️)', 'ライトモードに切替 (☀️)') : t('Switch to Dark Mode (🌙)', 'ダークモードに切替 (🌙)')}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700'
              }`}
              title={isMuted ? t('Unmute sound', '消音解除') : t('Mute sound', '消音')}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="w-7 h-7 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title={t("Toggle Fullscreen", "全画面表示の切替")}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
          </div>

          {/* Role Switcher: Clean 1-Tap Lock for Teacher, Protected Unlock for Student */}
          {userRole === 'TEACHER' && isTeacherUnlocked ? (
            <button
              onClick={() => { playPop(); lockTeacher(); }}
              className="h-8 px-2 sm:px-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 shadow-xs"
              title={t("Lock Teacher Mode & Return to Student Portal", "先生モードを終了して児童ロック（児童画面へ）")}
            >
              <Lock size={12} className="text-amber-500" />
              <span className="hidden sm:inline">{t("Lock", "児童ロック")}</span>
            </button>
          ) : (
            <button
              onClick={handleTeacherClick}
              className="h-8 px-2 sm:px-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-xs"
              title={t("Unlock Teacher Portal (Requires PIN)", "先生専用ポータル（暗証番号）")}
            >
              <Lock size={12} className="text-slate-400" />
              <span className="hidden sm:inline">{t("Teacher", "先生")}</span>
            </button>
          )}
        </div>
      </div>

      {/* ROW 2: Teacher Classroom Command Toolbar (Live In-Class Tools & Office Utilities) */}
      {userRole === 'TEACHER' && isTeacherUnlocked && (
        <div className="px-3 sm:px-4 py-1.5 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
          {/* Left Cluster: Live In-Class Essentials */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 select-none flex items-center gap-1">
              <span>⚡</span>
              <span className="hidden md:inline">{t("Live Class", "授業ツール")}</span>
            </span>

            {/* 1. Daily Routine */}
            <button
              onClick={() => { playPop(); openRoutineModal(); }}
              className="px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-300 dark:border-amber-700/60 shadow-xs cursor-pointer whitespace-nowrap"
              title={t("Daily Greetings & Routine (Feelings, Calendar, Weather)", "朝の会・ウォームアップ（あいさつ・日付・天気）")}
            >
              <span>☀️</span>
              <span>{t("Routine", "朝の会")}</span>
            </button>

            {/* 2. Student Attendance Picker */}
            <button
              onClick={() => { playPop(); openPickerModal(); }}
              className="px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 border border-rose-300 dark:border-rose-700/60 shadow-xs cursor-pointer whitespace-nowrap"
              title={t("Student Attendance Number Picker", "出席番号ルーレット・指名くじ")}
            >
              <span>🎯</span>
              <span>{t("Draw", "指名くじ")}</span>
            </button>

            {/* 3. Picture Dictionary */}
            <button
              onClick={() => { playPop(); openDictionary(); }}
              className={`px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer border ${
                activeView === 'DICTIONARY'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                  : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 border-blue-300 dark:border-blue-700/60 shadow-xs'
              }`}
              title={t("Interactive Picture Dictionary", "ピクチャーディクショナリー（絵辞書）")}
            >
              <span>📚</span>
              <span>{t("Dict", "絵辞書")}</span>
            </button>

            {/* 4. Classroom Dice Roller */}
            <button
              onClick={() => { playPop(); openDiceModal(); }}
              className="px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 border border-teal-300 dark:border-teal-700/60 shadow-xs cursor-pointer whitespace-nowrap"
              title={t("Classroom Dice Roller", "教室のサイコロ・ダイス")}
            >
              <span>🎲</span>
              <span>{t("Dice", "サイコロ")}</span>
            </button>

            {/* 5. Classroom iPad Profile Studio Linker */}
            <button
              onClick={() => { playPop(); launchGame('profile_studio'); }}
              className="px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-300 dark:border-purple-700/60 shadow-xs cursor-pointer whitespace-nowrap"
              title={t("Classroom iPad Setup & Attendance Linker", "iPadセットアップ大会・出席番号リンク")}
            >
              <span>📱</span>
              <span>{t("Setup", "セットアップ")}</span>
            </button>
          </div>

          {/* Right Cluster: Prep, Office & Analytics */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 select-none flex items-center gap-1">
              <span>🏫</span>
              <span className="hidden md:inline">{t("Prep & Reports", "準備・分析")}</span>
            </span>

            {/* 5. Classroom Reports & Analytics Hub */}
            <button
              onClick={() => { playPop(); openReports(); }}
              className={`px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer border ${
                activeView === 'REPORTS'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                  : 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-700/60 shadow-xs'
              }`}
              title={t("Classroom Analytics & Debrief Studio", "学級授業分析・デブリーフスタジオ")}
            >
              <span>📈</span>
              <span>{t("Reports", "授業分析")}</span>
            </button>

            {/* Roster & Profiles Manager Button */}
            <button
              onClick={() => { playPop(); setIsRosterModalOpen(true); }}
              className="px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 border border-purple-300 dark:border-purple-700/60 shadow-xs"
              title={t("Class Roster & Student Profiles", "名簿・児童プロファイル管理")}
            >
              <span>👥</span>
              <span>{t("Roster", "名簿")}</span>
            </button>

            {/* 6. Alphabet Comparison Studio */}
            <button
              onClick={() => { playPop(); openAlphabet(); }}
              className={`px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer border ${
                activeView === 'ALPHABET'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 shadow-xs'
              }`}
              title={t("Alphabet Comparison Studio (Uppercase & Lowercase)", "アルファベット比較スタジオ（大文字・小文字 比較ラボ）")}
            >
              <span>🔤</span>
              <span>{t("Alphabet", "ABCラボ")}</span>
            </button>

            {/* 7. Monster Worksheet Generator */}
            <button
              onClick={() => { playPop(); launchGame('monster_maker'); }}
              className="px-2.5 py-1 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-700/60 shadow-xs"
              title={t("Monster Worksheet Generator", "モンスタープリント作成・A4印刷")}
            >
              <span>👾</span>
              <span>{t("Print WS", "プリント")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Teacher PIN Unlock Modal (Child Lock Protection) */}
      {isPinModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPinModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-4 border-white dark:border-slate-800 flex flex-col items-center text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <KeyRound size={28} />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              {t("Teacher Mode Unlock", "先生モードの解除")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
              {t("Locked to prevent accidental changes. Enter 6-digit teacher PIN:", "児童の誤操作を防ぐためロックされています。先生の暗証番号（6桁）を入力してください。")}
            </p>

            <form onSubmit={handlePinSubmit} className="w-full space-y-4">
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => {
                    setPinError(false);
                    setPinInput(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="• • • • • •"
                  autoFocus
                  className={`w-full py-3.5 text-center font-mono font-black text-3xl tracking-widest rounded-2xl border-2 focus:outline-none transition-all ${
                    pinError
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-700'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400'
                  }`}
                />
                {pinError && (
                  <p className="text-xs font-bold text-rose-500 mt-2">
                    {t("Incorrect PIN. Please try again.", "暗証番号が違います。もう一度お試しください。")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={pinInput.length !== 6}
                className={`w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all shadow-md ${
                  pinInput.length === 6
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-98 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400'
                }`}
              >
                {t("Unlock Teacher Mode", "先生モードに切り替える")}
              </button>

              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {t("Cancel", "キャンセル")}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Active Rooms Manager Modal */}
      <ActiveRoomsModal
        isOpen={isRoomsModalOpen}
        onClose={() => setIsRoomsModalOpen(false)}
      />

      {/* Classroom Roster & Profile Manager Modal */}
      <ClassroomRosterManagerModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
      />
    </header>
  );
};
