import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../lib/firebase';
import { ref, update, onValue } from 'firebase/database';

function TeacherPortal({ t, lang }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  
  const isTeacher = user && !user.isAnonymous && user.email;
  const isMasterAdmin = isTeacher && user.email === 'admin@levisensei.local';

  useEffect(() => {
    if (!user || isMasterAdmin) return;
    const profileRef = ref(db, `users/${user.uid}/teacherProfile`);
    const unsub = onValue(profileRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.val());
      }
    });
    return () => unsub();
  }, [user, isMasterAdmin]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 w-full max-w-5xl mx-auto mt-8">
      
      {/* Header */}
      <div className="flex flex-col gap-4 border-b-2 border-[var(--border-color)] pb-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-[var(--primary-color)] hover:underline font-bold text-lg flex items-center gap-2">
            ← {t("Back Home", "ホームにもどる")}
          </Link>
          
          <button
            onClick={() => auth.signOut()}
            className="text-red-500 hover:text-white hover:bg-red-500 px-4 py-1 rounded-full font-bold transition-colors border-2 border-red-500"
          >
            {t("Log Out", "ログアウト")}
          </button>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black text-[var(--text-color)] flex items-center gap-4">
              {isMasterAdmin 
                ? t("Welcome, Master Admin!", "ようこそ、マスター管理者！") 
                : profile 
                  ? <>{profile.avatar} {t(`Welcome, ${profile.name_en || profile.name}!`, `ようこそ、${profile.name_ja || profile.name}！`)}</>
                  : t("Loading Teacher Profile...", "先生のプロフィールを読み込み中...")}
            </h2>
            <p className="text-[var(--text-muted)] text-xl mt-2 font-bold flex flex-wrap gap-4 items-center">
              {t("Manage classroom resources and digital tools.", "教室用リソースとデジタルツールを管理します。")}
              <button
                onClick={async () => {
                  if (window.confirm(t("Force all connected iPads to refresh their browsers instantly?", "すべての接続中のiPadのブラウザを強制的に更新しますか？"))) {
                    await update(ref(db), { 'app/settings/version': Date.now() });
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-sm transition-all active:scale-95"
              >
                🔄 {t("Force Refresh All iPads", "全iPadを強制更新")}
              </button>
            </p>
          </div>
        </div>
      </div>

      <nav className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        
        {/* Games */}
        <Link to="/admin/games" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-[var(--primary-color)] hover:border-solid hover:shadow-lg active:scale-95">
          <span className="text-7xl mb-2">🎮</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Games", "ゲーム")}</h2>
            <p className="text-[var(--text-muted)] text-base">
              {t("Manage and launch fun digital games for your students.", "児童向けの楽しいデジタルゲームの管理と起動。")}
            </p>
          </div>
        </Link>

        {/* Activities */}
        <a href="#" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-[var(--primary-color)] hover:border-solid hover:shadow-lg active:scale-95">
          <span className="text-7xl mb-2">✏️</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Activities", "アクティビティ")}</h2>
            <p className="text-[var(--text-muted)] text-base">
              {t("Printable puzzles and classroom exercises to help students practice English.", "英語の練習に役立つプリント用パズルや教室向け演習課題。")}
            </p>
          </div>
        </a>

        {/* Tools */}
        <Link to="/admin/tools" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-[var(--primary-color)] hover:border-solid hover:shadow-lg active:scale-95">
          <span className="text-7xl mb-2">🧰</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Tools", "ツール")}</h2>
            <p className="text-[var(--text-muted)] text-base">
              {t("Helpful classroom tools and reference materials.", "授業で役立つツールと参考資料。")}
            </p>
          </div>
        </Link>

      </nav>
    </div>
  );
}

export default TeacherPortal;
