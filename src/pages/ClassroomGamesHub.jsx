import { Link } from 'react-router-dom';

function ClassroomGamesHub({ t, lang }) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
        <Link to="/admin/games" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
          ← {t("Back to Game Categories", "ゲームカテゴリーに戻る")}
        </Link>
        <h2 className="text-3xl font-bold text-[var(--text-color)]">
          {t("Classroom Screen Games", "教室用スクリーンゲーム")}
        </h2>
        <p className="text-[var(--text-muted)] text-lg">
          {t("Games played entirely on the teacher's screen.", "先生の画面だけで行うゲーム。")}
        </p>
      </div>

      <nav className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
        
        <Link 
          to="/admin/games/classroom/ohajiki"
          className="flex flex-col gap-4 bg-[var(--surface-color)] p-6 rounded-2xl shadow-md border-4 border-[var(--border-color)] hover:border-[var(--primary-color)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer no-underline text-[var(--text-color)]"
        >
          <div className="text-6xl mb-2 group-hover:scale-110 transition-transform duration-300 text-center">🪀</div>
          <div>
            <h2 className="text-xl font-black mb-2 text-center text-[var(--primary-color)]">
              {t("Ohajiki (Marbles)", "おはじきゲーム")}
            </h2>
            <p className="text-[var(--text-muted)] text-sm text-center font-bold">
              {t("Listen to the number and tap the correct marble. A fun number recognition game.", "数字を聞いて、正しいおはじきをタップする楽しい数字ゲーム。")}
            </p>
          </div>
        </Link>

        {/* Future Games Placeholder */}
        <div className="flex flex-col justify-center items-center text-center gap-4 bg-black/5 py-12 px-6 rounded-lg shadow-sm border-2 border-dashed border-[var(--border-color)] opacity-70">
          <span className="text-6xl mb-2 grayscale">🚧</span>
          <div>
            <h2 className="text-[var(--text-muted)] mb-2 text-2xl font-bold">{t("Coming Soon", "準備中")}</h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("More games will be added later.", "新しいゲームを追加予定です。")}
            </p>
          </div>
        </div>

      </nav>
    </div>
  );
}

export default ClassroomGamesHub;
