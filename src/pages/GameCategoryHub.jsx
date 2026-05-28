import { Link } from 'react-router-dom';

function GameCategoryHub({ t, lang }) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
        <Link to="/admin" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
          ← {t("Back to Teacher Portal", "先生用ポータルに戻る")}
        </Link>
        <h2 className="text-3xl font-bold text-[var(--text-color)]">
          {t("Game Categories", "ゲームカテゴリー")}
        </h2>
        <p className="text-[var(--text-muted)] text-lg">
          {t("Select the type of games based on your classroom's devices.", "教室のデバイスに合わせてゲームのタイプを選択してください。")}
        </p>
      </div>

      <nav className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        
        {/* Tablet Games */}
        <Link 
          to="/admin/games/tablet" 
          className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-transparent transition-all duration-300 hover:border-[var(--primary-color)] hover:shadow-lg active:scale-95"
        >
          <span className="text-7xl mb-2">📱</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Tablet Games", "タブレット用ゲーム")}</h2>
            <p className="text-[var(--text-muted)] text-base">
              {t("Games like Kahoot or Bingo where every student uses their own tablet.", "児童が自分のタブレットを使うゲーム（Kahootやビンゴなど）。")}
            </p>
          </div>
        </Link>

        {/* Classroom Screen Games */}
        <Link 
          to="/admin/games/classroom" 
          className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-16 px-8 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-transparent transition-all duration-300 hover:border-[var(--primary-color)] hover:shadow-lg active:scale-95"
        >
          <span className="text-7xl mb-2">📺</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Classroom Screen Games", "教室用スクリーンゲーム")}</h2>
            <p className="text-[var(--text-muted)] text-base">
              {t("Games played entirely on the teacher's screen/TV at the front of the class.", "教室の前のテレビや先生の画面だけで行うゲーム。")}
            </p>
          </div>
        </Link>

      </nav>
    </div>
  );
}

export default GameCategoryHub;
