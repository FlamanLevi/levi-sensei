import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import flatVocab from '../data/normalized_vocabulary.json';
import { isWordInUnit } from '../utils/vocabulary';
import Flashcard from '../components/Flashcard';

function UnitView({ t, lang, starredWords, toggleStar }) {
  const { gradeId, unitId } = useParams();
  const [mode, setMode] = useState('all'); // 'all', 'hide_en', 'hide_ja'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'carousel'
  const [sortMode, setSortMode] = useState('default');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const grade = flatVocab.grades.find(g => g.id === gradeId);
  const unit = flatVocab.units.find(u => u.id === unitId);
  const words = useMemo(() => flatVocab.words.filter(w => isWordInUnit(w, unitId)), [unitId]);

  if (!grade || !unit) {
    return (
      <div className="text-center p-12">
        <h2 className="text-2xl font-bold text-[var(--text-color)]">{t("Unit not found.", "単元が見つかりません。")}</h2>
        <Link to="/vocabulary" className="text-[var(--primary-color)] hover:underline mt-4 inline-block font-bold">
          ← {t("Back to Hub", "ハブに戻る")}
        </Link>
      </div>
    );
  }

  const displayedWords = useMemo(() => {
    if (!words || words.length === 0) return [];
    let sorted = [...words];
    
    if (sortMode === 'en-asc') {
      sorted.sort((a, b) => a.en.localeCompare(b.en));
    } else if (sortMode === 'en-desc') {
      sorted.sort((a, b) => b.en.localeCompare(a.en));
    } else if (sortMode === 'ja-asc') {
      sorted.sort((a, b) => (a.ja_hiragana || a.ja_kanji || "").localeCompare(b.ja_hiragana || b.ja_kanji || ""));
    } else if (sortMode === 'ja-desc') {
      sorted.sort((a, b) => (b.ja_hiragana || b.ja_kanji || "").localeCompare(a.ja_hiragana || a.ja_kanji || ""));
    } else if (sortMode === 'shuffle') {
      // Fisher-Yates shuffle triggered by shuffleSeed change
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
    }
    return sorted;
  }, [words, sortMode, shuffleSeed]);

  const handleSortChange = (e) => {
    setSortMode(e.target.value);
    setCurrentIndex(0);
  };

  const handleShuffle = () => {
    setSortMode('shuffle');
    setShuffleSeed(prev => prev + 1);
    setCurrentIndex(0);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Header & Navigation */}
      <div className="flex flex-col gap-4 border-b-2 border-[var(--border-color)] pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <Link to="/vocabulary" state={{ gradeId }} className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
              ← {t("Back to", "戻る:")} {lang === 'en' ? grade.name_en : grade.name_ja}
            </Link>
            <h2 className="text-3xl font-bold text-[var(--text-color)]">
              {lang === 'en' ? unit.name_en : unit.name_ja}
            </h2>
          </div>

          {/* View Toggles & Shuffle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[var(--surface-color)] rounded-lg p-1 border-2 border-[var(--border-color)]">
              <button 
                onClick={() => { setViewMode('grid'); setCurrentIndex(0); }}
                className={`px-4 py-2 text-sm font-bold transition-colors duration-200 cursor-pointer ${viewMode === 'grid' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-black/5'}`}
              >
                📱 {t("Grid", "グリッド")}
              </button>
              <button 
                onClick={() => setViewMode('carousel')}
                className={`px-4 py-2 text-sm font-bold transition-colors duration-200 cursor-pointer ${viewMode === 'carousel' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-black/5'}`}
              >
                🃏 {t("Focus", "フォーカス")}
              </button>
            </div>
            
            <select 
              value={sortMode} 
              onChange={handleSortChange}
              className="bg-[var(--surface-color)] text-[var(--text-color)] border-2 border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-[var(--primary-color)] cursor-pointer"
            >
              <option value="default">{t("Default Order", "デフォルト順")}</option>
              <option value="en-asc">EN (A-Z)</option>
              <option value="en-desc">EN (Z-A)</option>
              <option value="ja-asc">JA (あ-ん)</option>
              <option value="ja-desc">JA (ん-あ)</option>
              <option value="shuffle" disabled>{t("Shuffled", "シャッフル")}</option>
            </select>

            <button 
              onClick={handleShuffle}
              className="bg-[var(--primary-light)] text-[var(--surface-color)] hover:bg-[var(--primary-color)] px-4 py-2 rounded-lg text-sm font-bold transition-colors duration-200 cursor-pointer flex items-center gap-2 shadow-sm"
            >
              🔀 {t("Shuffle", "シャッフル")}
            </button>
          </div>
        </div>

        {/* Practice Mode Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0">
            {t("Practice Mode:", "練習モード:")}
          </span>
          <div className="flex bg-[var(--surface-color)] rounded-lg p-1 border-2 border-[var(--border-color)] overflow-hidden w-full sm:w-auto">
            <button 
              onClick={() => setMode('all')}
              className={`flex-1 px-4 py-2 text-sm font-bold transition-colors duration-200 cursor-pointer ${mode === 'all' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-black/5'}`}
            >
              {t("Show All", "すべて表示")}
            </button>
            <button 
              onClick={() => setMode('hide_en')}
              className={`flex-1 px-4 py-2 text-sm font-bold transition-colors duration-200 cursor-pointer ${mode === 'hide_en' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-black/5'}`}
            >
              {t("Hide English", "英語を隠す")}
            </button>
            <button 
              onClick={() => setMode('hide_ja')}
              className={`flex-1 px-4 py-2 text-sm font-bold transition-colors duration-200 cursor-pointer ${mode === 'hide_ja' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-muted)] hover:bg-black/5'}`}
            >
              {t("Hide Japanese", "日本語を隠す")}
            </button>
          </div>
        </div>
      </div>

      {/* Flashcard Area */}
      {viewMode === 'carousel' ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto pt-4">
          <div className="text-[var(--text-muted)] font-bold text-lg bg-[var(--surface-color)] px-4 py-1 rounded-full border-2 border-[var(--border-color)]">
            {currentIndex + 1} / {displayedWords.length}
          </div>
          
          <div className="w-full aspect-[4/3] sm:aspect-video md:aspect-[4/3] relative">
            <Flashcard 
              key={displayedWords[currentIndex].id + currentIndex} 
              word={displayedWords[currentIndex]} 
              mode={mode} 
              isStarred={starredWords.some(w => w.id === displayedWords[currentIndex].id && w.en === displayedWords[currentIndex].en)}
              toggleStar={toggleStar}
            />
          </div>
          
          <div className="flex gap-4 w-full justify-between mt-4">
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} 
              disabled={currentIndex === 0}
              className="bg-[var(--surface-color)] border-2 border-[var(--primary-color)] text-[var(--primary-color)] px-8 py-4 rounded-xl font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary-color)] hover:text-white transition-colors duration-200 active:scale-95 cursor-pointer shadow-md"
            >
              ← {t("Prev", "前へ")}
            </button>
            <button 
              onClick={() => setCurrentIndex(prev => Math.min(displayedWords.length - 1, prev + 1))} 
              disabled={currentIndex === displayedWords.length - 1}
              className="bg-[var(--primary-color)] border-2 border-[var(--primary-color)] text-white px-8 py-4 rounded-xl font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--primary-light)] transition-colors duration-200 active:scale-95 cursor-pointer shadow-md"
            >
              {t("Next", "次へ")} →
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {displayedWords.map((word, index) => (
            <Flashcard 
              key={word.id || index} 
              word={word} 
              mode={mode} 
              isStarred={starredWords.some(w => w.id === word.id && w.en === word.en)}
              toggleStar={toggleStar}
            />
          ))}
        </div>
      )}

    </div>
  );
}

export default UnitView;