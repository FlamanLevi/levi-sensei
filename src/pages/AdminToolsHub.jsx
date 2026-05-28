import { Link } from 'react-router-dom';

function AdminToolsHub({ t, lang }) {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
        <Link to="/admin" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
          ← {t("Back to Portal", "ポータルに戻る")}
        </Link>
        <h2 className="text-3xl font-bold text-[var(--text-color)]">
          {t("Teacher Tools", "先生用ツール")}
        </h2>
        <p className="text-[var(--text-muted)] text-lg">
          {t("Helpful classroom utilities and data dashboards.", "授業で役立つツールやデータのダッシュボード。")}
        </p>
      </div>

      {/* Grid Menu */}
      <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        
        {/* Quiz Game Analytics */}
        <Link to="/admin/tools/quiz-analytics" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-12 px-6 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-blue-500 hover:border-solid hover:shadow-lg active:scale-95 group">
          <span className="text-6xl mb-2 transition-transform group-hover:scale-110">📈</span>
          <div>
            <h2 className="text-blue-500 mb-2 text-xl font-bold">
              {t("Quiz Game Analytics", "クイズゲームの分析")}
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Track trouble words and host targeted review sessions based on data.", "データを基に苦手な単語を追跡し、復習セッションをホストします。")}
            </p>
          </div>
        </Link>

        {/* Class Wars Leaderboard */}
        <Link to="/admin/tools/class-wars" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-12 px-6 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-yellow-500 hover:border-solid hover:shadow-lg active:scale-95 group">
          <span className="text-6xl mb-2 transition-transform group-hover:scale-110">🏆</span>
          <div>
            <h2 className="text-yellow-500 mb-2 text-xl font-bold">
              {t("Class Wars Leaderboard", "クラスウォーズ・リーダーボード")}
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Real-time global rankings of your homerooms based on points.", "ポイントに基づいた各クラスのリアルタイムグローバルランキング。")}
            </p>
          </div>
        </Link>

        {/* Printable Worksheets */}
        <Link to="/admin/tools/worksheets" className="flex flex-col justify-center items-center text-center gap-4 bg-[var(--surface-color)] py-12 px-6 rounded-lg shadow-[var(--header-shadow)] no-underline text-[var(--text-color)] border-2 border-[var(--border-color)] border-dashed transition-all duration-300 hover:border-green-500 hover:border-solid hover:shadow-lg active:scale-95 group">
          <span className="text-6xl mb-2 transition-transform group-hover:scale-110">🖨️</span>
          <div>
            <h2 className="text-green-500 mb-2 text-xl font-bold">
              {t("Printable Worksheets", "プリントプリント")}
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              {t("Instantly generate printable activities like matching quizzes and bingo.", "マッチングクイズやビンゴなどの印刷可能なアクティビティを瞬時に生成します。")}
            </p>
          </div>
        </Link>
      </nav>
    </div>
  );
}

export default AdminToolsHub;
