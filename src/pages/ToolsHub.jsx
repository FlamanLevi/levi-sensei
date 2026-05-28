import { Link } from 'react-router-dom';

function ToolsHub({ t, lang }) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
        <Link to="/" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
          ← {t("Back to Home", "ホームに戻る")}
        </Link>
        <h2 className="text-3xl font-bold text-[var(--text-color)]">
          {t("Tools Hub", "ツールハブ")}
        </h2>
        <p className="text-[var(--text-muted)] text-lg">
          {t("Select a tool to practice your skills.", "練習するツールを選んでください。")}
        </p>
      </div>

      {/* Tools Grid */}
      <nav className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        
        {/* Flashcards Tool */}
        <Link 
          to="/vocabulary" 
          className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-12 px-6 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-transparent transition-all duration-300 hover:border-[var(--primary-color)] hover:shadow-lg active:scale-95"
        >
          <span className="text-6xl mb-2">🃏</span>
          <div>
            <h2 className="text-[var(--primary-color)] mb-2 text-2xl font-bold">{t("Flashcards", "単語カード")}</h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Study vocabulary words with interactive flashcards.", "単語をフラッシュカードで練習しよう。")}
            </p>
          </div>
        </Link>

        {/* Future Tools placeholder */}
        <div className="flex flex-col justify-center items-center text-center gap-4 bg-black/5 py-12 px-6 rounded-lg shadow-sm border-2 border-dashed border-[var(--border-color)] opacity-70">
          <span className="text-6xl mb-2 grayscale">🚧</span>
          <div>
            <h2 className="text-[var(--text-muted)] mb-2 text-2xl font-bold">{t("Coming Soon", "準備中")}</h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("More tools will be added later.", "新しいツールを追加予定です。")}
            </p>
          </div>
        </div>

      </nav>
    </div>
  );
}

export default ToolsHub;
