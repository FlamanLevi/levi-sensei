import { Link } from 'react-router-dom';

function AdminWorksheetsHub({ t, lang }) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
        <Link to="/admin/tools" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
          ← {t("Back to Tools", "ツールに戻る")}
        </Link>
        <h2 className="text-3xl font-bold text-[var(--text-color)]">
          {t("Printable Worksheets", "プリントプリント")}
        </h2>
        <p className="text-[var(--text-muted)] text-lg">
          {t("Generate randomized worksheets and print them directly from your browser.", "ランダム化されたワークシートを生成し、ブラウザから直接印刷します。")}
        </p>
      </div>

      {/* Grid Menu */}
      <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        
        {/* Line Matching Quiz */}
        <Link to="/admin/tools/worksheets/matching" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-12 px-6 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-purple-500 hover:border-solid hover:shadow-lg active:scale-95 group">
          <span className="text-6xl mb-2 transition-transform group-hover:scale-110">✏️</span>
          <div>
            <h2 className="text-purple-500 mb-2 text-xl font-bold">
              {t("Line Matching Quiz", "線結びクイズ")}
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Generate a quiz matching English words to pictures or translations.", "英語の単語を写真や翻訳と結びつけるクイズを生成します。")}
            </p>
          </div>
        </Link>

      </nav>
    </div>
  );
}

export default AdminWorksheetsHub;
