import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Home({ t }) {
  const { profile } = useAuth();

  return (
    <div className="flex flex-col animate-in fade-in duration-300 w-full max-w-5xl mx-auto mt-8">
      {/* Profile Greeting */}
      <div className="flex justify-between items-center bg-[var(--surface-color)] px-6 py-4 rounded-2xl shadow-[var(--header-shadow)] mb-6 border-2 border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--primary-color)] text-white rounded-full flex items-center justify-center font-black text-xl shadow-inner">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'G'}
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-color)]">
              {profile?.name ? t(`Hi, ${profile.name}!`, `こんにちは、${profile.name}さん！`) : t("Hi, Guest!", "こんにちは、ゲストさん！")}
            </h2>
            {profile?.coins !== undefined && (
               <p className="text-yellow-600 font-bold text-sm">🪙 {profile.coins} {t("Coins", "コイン")}</p>
            )}
          </div>
        </div>
        {profile?.name && (
          <Link 
            to="/profile"
            className="px-6 py-3 bg-[var(--border-color)] hover:bg-[var(--primary-color)] hover:text-white text-[var(--text-color)] font-bold rounded-xl transition-all active:scale-95 shadow-sm"
          >
            {t("My Profile", "マイプロフィール")}
          </Link>
        )}
      </div>

      {/* Massive Join Game Banner */}
      <Link to="/play" className="w-full flex flex-col justify-center items-center text-center gap-4 bg-[var(--primary-color)] py-12 px-8 rounded-2xl shadow-[var(--header-shadow)] no-underline text-white border-4 border-transparent transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:scale-[1.02] active:scale-95 mb-10">
        <span className="text-8xl mb-2 drop-shadow-md">🚀</span>
        <div>
          <h2 className="text-5xl font-black mb-4 drop-shadow-sm">{t("Join Game", "ゲームに参加")}</h2>
          <p className="text-white/90 font-bold text-2xl">{t("Enter a Room PIN to play!", "PINを入力してゲームをプレイしよう！")}</p>
        </div>
      </Link>

      <nav className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] text-[var(--text-color)] border-2 border-[var(--border-color)] opacity-60">
          <div className="absolute top-4 right-4 bg-[var(--border-color)] text-[var(--text-muted)] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {t("Coming Soon", "準備中")}
          </div>
          <span className="text-7xl mb-2 grayscale">🎮</span>
          <div>
            <h2 className="text-[var(--text-muted)] mb-2 text-2xl font-bold">{t("Games", "ゲーム")}</h2>
            <p className="text-[var(--text-muted)] text-base">{t("Fun digital games to help learn English.", <><ruby>英語<rt>えいご</rt></ruby>を<ruby>楽<rt>たの</rt></ruby>しく<ruby>学<rt>まな</rt></ruby>べるデジタルゲーム。</>)}</p>
          </div>
        </div>

        <div className="relative flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] text-[var(--text-color)] border-2 border-[var(--border-color)] opacity-60">
          <div className="absolute top-4 right-4 bg-[var(--border-color)] text-[var(--text-muted)] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {t("Coming Soon", "準備中")}
          </div>
          <span className="text-7xl mb-2 grayscale">✏️</span>
          <div>
            <h2 className="text-[var(--text-muted)] mb-2 text-2xl font-bold">{t("Activities", "アクティビティ")}</h2>
            <p className="text-[var(--text-muted)] text-base">{t("Puzzles and exercises to practice your skills.", <>スキルを<ruby>練習<rt>れんしゅう</rt></ruby>するためのパズルや<ruby>問題<rt>もんだい</rt></ruby>。</>)}</p>
          </div>
        </div>

        <Link to="/tools" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-transparent transition-all duration-300 hover:border-[var(--primary-color)] hover:shadow-lg active:scale-95">
          <span className="text-7xl mb-2">🧰</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Tools", "ツール")}</h2>
            <p className="text-[var(--text-muted)] text-base">{t("Helpful reference tools for vocabulary and grammar.", <><ruby>単語<rt>たんご</rt></ruby>や<ruby>文法<rt>ぶんぽう</rt></ruby>の<ruby>便利<rt>べんり</rt></ruby>な<ruby>学習<rt>がくしゅう</rt></ruby>リソース。</>)}</p>
          </div>
        </Link>
      </nav>

      {/* Teacher Portal Link */}
      <div className="mt-12 mb-8 text-center">
        <Link to="/admin" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[var(--text-muted)] hover:text-[var(--primary-color)] font-bold text-sm transition-colors opacity-70 hover:opacity-100 bg-[var(--surface-color)] border-2 border-[var(--border-color)] rounded-full hover:border-[var(--primary-color)]">
          <span>👩‍🏫</span> {t("Teacher Portal / Host Game", "先生用ポータル / ゲームをホスト")}
        </Link>
      </div>
    </div>
  );
}

export default Home;
