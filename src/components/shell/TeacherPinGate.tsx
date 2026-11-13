import React, { useState } from 'react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage, LanguageToggle } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { ShieldAlert, ArrowRight, Lock, Check, Sparkles } from 'lucide-react';

export const TeacherPinGate: React.FC = () => {
  const { unlockTeacher, setUserRole } = useClassroom();
  const { t } = useLanguage();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6) return;

    setIsSubmitting(true);
    const success = unlockTeacher(pinInput);
    if (success) {
      soundEffects.playFanfare();
      setPinError(false);
    } else {
      soundEffects.playIncorrect();
      setPinError(true);
      setPinInput('');
      setIsSubmitting(false);
    }
  };

  const handleExitToStudent = () => {
    soundEffects.playTick();
    try {
      window.history.replaceState(null, '', '/');
    } catch {}
    setUserRole('STUDENT');
  };

  return (
    <div className="min-h-dvh bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-between p-4 sm:p-6 text-slate-900 dark:text-white select-none">
      {/* Top Bar */}
      <header className="w-full max-w-3xl flex items-center justify-between gap-2 flex-nowrap py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shrink-0">
            <Sparkles size={18} />
          </div>
          <span className="font-black text-sm tracking-tight truncate">
            Levi-Sensei
          </span>
        </div>
        <div className="shrink-0">
          <LanguageToggle size="sm" />
        </div>
      </header>

      {/* Main Lock Card (2-Column Landscape Layout) */}
      <main className="w-full max-w-3xl my-auto py-4 flex flex-col items-center">
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl border-2 border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left Wing: Teacher PIN Entry */}
          <div className="flex flex-col justify-between text-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldAlert size={28} />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                {t('Teacher Mode Restricted', '先生専用画面（ロック中）')}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-4 leading-relaxed">
                {t(
                  'This screen contains teacher controls, roadmap activities, and class rosters. Please enter your 6-digit Teacher PIN to unlock:',
                  'この画面は先生専用の管理画面です。クラス管理やゲーム進行を行うには、先生の暗証番号（6桁）を入力してください。'
                )}
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3">
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
                  className={`w-full py-3.5 text-center font-mono font-black text-3xl tracking-widest rounded-2xl border-2 focus:outline-none transition-all shadow-inner ${
                    pinError
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-300 animate-shake'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400'
                  }`}
                />
                {pinError && (
                  <p className="text-xs font-bold text-rose-500 mt-2 flex items-center justify-center gap-1">
                    <span>❌</span>
                    <span>{t('Incorrect PIN. Please try again.', '暗証番号が正しくありません。もう一度お試しください。')}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || pinInput.length !== 6}
                className={`w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap ${
                  pinInput.length === 6 && !isSubmitting
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-98 cursor-pointer shadow-blue-500/20'
                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400'
                }`}
              >
                <Lock size={16} />
                <span>{t('Unlock Teacher Mode', 'ロック解除（先生モードへ）')}</span>
              </button>
            </form>
          </div>

          {/* Right Wing: Student Escape Hatch */}
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between text-left">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-2xl flex items-center justify-center mb-3 shadow-inner">
                🎒
              </div>
              <h3 className="text-emerald-800 dark:text-emerald-300 font-black text-base sm:text-lg mb-2">
                {t('Are you a student?', '児童（生徒）のみなさんはこちら')}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-4 leading-relaxed">
                {t(
                  'If you opened this link from LoiLoNote, tap below to return to your student room and avatar:',
                  'ロイロノートから開いたみなさんは、下の緑のボタンを押してじぶんの部屋（えいごルーム）へ進んでね！'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExitToStudent}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 cursor-pointer whitespace-nowrap"
            >
              <span>{t('Go to Student Portal', '児童ポータルへ進む')}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500 pb-2">
        Levi-Sensei Elementary English Platform • Protected Classroom Access
      </footer>
    </div>
  );
};
