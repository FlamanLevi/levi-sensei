import { Link } from 'react-router-dom';

function TabletGamesHub({ t, lang }) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
        <Link to="/admin/games" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
          ← {t("Back to Game Categories", "ゲームカテゴリーに戻る")}
        </Link>
        <h2 className="text-3xl font-bold text-[var(--text-color)]">
          {t("Tablet Games", "タブレット用ゲーム")}
        </h2>
        <p className="text-[var(--text-muted)] text-lg">
          {t("Games where every student uses their own tablet.", "児童が自分のタブレットを使うゲーム。")}
        </p>
      </div>

      {/* Games Grid */}
      <nav className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
        
        {/* Quiz Game */}
        <Link 
          to="/admin/games/quiz" 
          className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-12 px-6 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-[var(--primary-color)] hover:border-solid hover:shadow-lg active:scale-95"
        >
          <span className="text-6xl mb-2">🧠</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Quiz Game", "クイズゲーム")}</h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Interactive Kahoot-style vocabulary quiz for the classroom.", "クラスで使えるKahoot風の単語クイズ。")}
            </p>
          </div>
        </Link>

        {/* Ohajiki Game */}
        <Link 
          to="/admin/games/tablet/ohajiki" 
          className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-12 px-6 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-[var(--primary-color)] hover:border-solid hover:shadow-lg active:scale-95"
        >
          <span className="text-6xl mb-2">🪀</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Ohajiki Game", "おはじきゲーム")}</h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Students place marbles and try to clear their board first.", "自分のおはじきを置いて、先にすべて消した人が勝ち！")}
            </p>
          </div>
        </Link>

      </nav>
    </div>
  );
}

export default TabletGamesHub;
