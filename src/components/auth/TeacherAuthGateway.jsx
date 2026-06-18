import { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { useLocation, Navigate } from 'react-router-dom';

export function TeacherAuthGateway({ children, t, lang }) {
  const { user, loading } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState('PASSCODE'); // PASSCODE, SELECT_TEACHER, PIN
  const [schoolData, setSchoolData] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check if current user is a teacher. 
  // We determine this by checking if they are NOT anonymous.
  const isTeacher = user && !user.isAnonymous;

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center font-bold text-[var(--text-muted)]">{t("Loading...", "読み込み中...")}</div>;
  }

  if (isTeacher) {
    return children;
  }

  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);

    try {
      // MASTER KEY BYPASS
      if (passcode === '051683') {
        await signInWithEmailAndPassword(auth, 'admin@levisensei.local', '051683');
        return; // Firebase onAuthStateChanged takes over and unmounts this component
      }

      // Normal Teacher Flow
      const schoolRef = ref(db, `schools/${passcode}`);
      const snap = await get(schoolRef);

      if (snap.exists()) {
        setSchoolData(snap.val());
        setStep('SELECT_TEACHER');
      } else {
        setError(t("Invalid School Passcode", "無効な学校のパスコード"));
      }
    } catch (err) {
      console.error(err);
      if (passcode === '051683') {
          setError(t("Master Admin account not set up yet.", "マスター管理者の設定がまだです。"));
      } else {
          setError(t("Database error. Please try again.", "データベースエラー。もう一度やり直してください。"));
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);

    try {
      const email = `${schoolData.id}_${selectedTeacherId}@levisensei.local`;
      const password = `${passcode}${pin}`;

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Save their profile data so the portal can greet them properly
      await update(ref(db, `users/${userCredential.user.uid}/teacherProfile`), {
        name_en: schoolData.teachers[selectedTeacherId].name_en || schoolData.teachers[selectedTeacherId].name,
        name_ja: schoolData.teachers[selectedTeacherId].name_ja || schoolData.teachers[selectedTeacherId].name,
        avatar: schoolData.teachers[selectedTeacherId].avatar,
        schoolId: schoolData.id
      });

      // Firebase will automatically update `user` state via onAuthStateChanged,
      // which will trigger a re-render and display `children`.
    } catch (err) {
      console.error(err);
      setError(t("Invalid PIN", "無効なPIN"));
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="bg-[var(--surface-color)] p-8 rounded-2xl shadow-xl w-full max-w-md border-4 border-[var(--border-color)] animate-in zoom-in-95 duration-300">
        
        {step === 'PASSCODE' && (
          <>
            <h2 className="text-3xl font-black text-[var(--text-color)] text-center mb-2">🔒 {t("Admin Portal", "管理ポータル")}</h2>
            <p className="text-center text-[var(--text-muted)] font-bold mb-8">
              {t("Enter your School Passcode to continue.", "続行するには学校のパスコードを入力してください。")}
            </p>
            <form onSubmit={handlePasscodeSubmit} className="flex flex-col gap-4">
              <input 
                autoFocus
                type="password"
                placeholder={t("Passcode", "パスコード")}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full text-center text-3xl font-black py-4 px-4 rounded-xl border-4 border-[var(--border-color)] bg-transparent text-[var(--text-color)] focus:border-[var(--primary-color)] focus:outline-none transition-colors tracking-widest"
              />
              {error && <p className="text-red-500 font-bold text-center animate-bounce">{error}</p>}
              <button 
                type="submit"
                disabled={!passcode || isAuthenticating}
                className="w-full py-4 bg-[var(--primary-color)] text-white text-xl font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isAuthenticating ? t("Checking...", "確認中...") : t("Unlock", "ロック解除")}
              </button>
            </form>
          </>
        )}

        {step === 'SELECT_TEACHER' && schoolData && (
          <div className="animate-in slide-in-from-right">
            <button 
              onClick={() => { setStep('PASSCODE'); setPasscode(''); setError(''); }}
              className="text-[var(--text-muted)] hover:text-[var(--text-color)] font-bold mb-4 flex items-center gap-2 transition-colors"
            >
              ← {t("Back", "戻る")}
            </button>
            <h2 className="text-2xl font-black text-[var(--text-color)] text-center mb-2">{lang === 'en' ? schoolData.name_en || schoolData.name : schoolData.name_ja || schoolData.name}</h2>
            <p className="text-center text-[var(--text-muted)] font-bold mb-6">
              {t("Who's teaching?", "誰が教えますか？")}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {schoolData.teachers && Object.entries(schoolData.teachers).map(([id, teacher]) => (
                <button
                  key={id}
                  onClick={() => { setSelectedTeacherId(id); setStep('PIN'); setError(''); }}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-transparent hover:border-[var(--primary-color)] hover:bg-[var(--primary-color)]/10 transition-all active:scale-95"
                >
                  <span className="text-6xl">{teacher.avatar || '👨‍🏫'}</span>
                  <span className="font-bold text-[var(--text-color)] text-center">{lang === 'en' ? teacher.name_en || teacher.name : teacher.name_ja || teacher.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'PIN' && schoolData && selectedTeacherId && (
          <div className="animate-in slide-in-from-right">
            <button 
              onClick={() => { setStep('SELECT_TEACHER'); setPin(''); setError(''); }}
              className="text-[var(--text-muted)] hover:text-[var(--text-color)] font-bold mb-4 flex items-center gap-2 transition-colors"
            >
              ← {t("Back", "戻る")}
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <span className="text-6xl mb-2">{schoolData.teachers[selectedTeacherId].avatar || '👨‍🏫'}</span>
              <h2 className="text-2xl font-black text-[var(--text-color)] text-center">{lang === 'en' ? schoolData.teachers[selectedTeacherId].name_en || schoolData.teachers[selectedTeacherId].name : schoolData.teachers[selectedTeacherId].name_ja || schoolData.teachers[selectedTeacherId].name}</h2>
            </div>

            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <input 
                autoFocus
                type="password"
                placeholder="PIN"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center text-4xl font-black py-4 px-4 rounded-xl border-4 border-[var(--border-color)] bg-transparent text-[var(--text-color)] focus:border-[var(--primary-color)] focus:outline-none transition-colors tracking-widest"
              />
              {error && <p className="text-red-500 font-bold text-center animate-bounce">{error}</p>}
              <button 
                type="submit"
                disabled={pin.length < 4 || isAuthenticating}
                className="w-full py-4 bg-[var(--primary-color)] text-white text-xl font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isAuthenticating ? t("Logging in...", "ログイン中...") : t("Login", "ログイン")}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
