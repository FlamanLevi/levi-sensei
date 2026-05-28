import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import flatVocab from '../data/normalized_vocabulary.json';
import Flashcard from '../components/Flashcard';

function VocabularyHub({ t, lang, starredWords, toggleStar }) {
  const location = useLocation();
  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (location.state?.gradeId) {
      const grade = flatVocab.grades.find(g => g.id === location.state.gradeId);
      if (grade) {
        const unitsArray = flatVocab.units.filter(u => u.grade_id === grade.id);
        const unitsObj = {};
        unitsArray.forEach(u => { unitsObj[u.id] = { name_en: u.name_en, name_ja: u.name_ja }; });
        return {
          id: grade.id,
          name_en: grade.name_en,
          name_ja: grade.name_ja,
          units: unitsObj
        };
      }
    }
    return null;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('grades'); // 'grades', 'stars'

  const grades = useMemo(() => {
    return flatVocab.grades.map(g => {
      const unitsArray = flatVocab.units.filter(u => u.grade_id === g.id);
      const unitsObj = {};
      unitsArray.forEach(u => { unitsObj[u.id] = { name_en: u.name_en, name_ja: u.name_ja }; });
      return {
        id: g.id,
        name_en: g.name_en,
        name_ja: g.name_ja,
        units: unitsObj
      };
    });
  }, []);

  const allWords = flatVocab.words;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allWords.filter(word => 
      word.en.toLowerCase().includes(query) || 
      (word.ja_kanji && word.ja_kanji.includes(query)) ||
      (word.ja_hiragana && word.ja_hiragana.includes(query)) ||
      (word.en_katakana && word.en_katakana.includes(query))
    );
  }, [searchQuery, allWords]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <Link to="/tools" className="text-[var(--primary-color)] hover:underline font-bold text-lg">
             ← {t("Back to Tools", "ツールに戻る")}
           </Link>
           <h2 className="text-3xl font-bold text-[var(--text-color)]">
             {t("Flashcards", "単語カード")}
           </h2>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <input 
            type="text" 
            placeholder={t("Search words...", "単語を検索...")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) {
                 setSelectedGrade(null);
                 setActiveTab('search');
              } else {
                 setActiveTab('grades');
              }
            }}
            className="w-full bg-[var(--surface-color)] text-[var(--text-color)] border-2 border-[var(--border-color)] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-[var(--primary-color)] transition-colors duration-300"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl opacity-50 select-none pointer-events-none">🔍</span>
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setActiveTab('grades'); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--primary-color)] font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!searchQuery && !selectedGrade && (
        <div className="flex border-b-2 border-[var(--border-color)]">
          <button 
            onClick={() => setActiveTab('grades')}
            className={`px-6 py-3 font-bold text-lg transition-colors duration-300 cursor-pointer ${activeTab === 'grades' ? 'text-[var(--primary-color)] border-b-4 border-[var(--primary-color)] -mb-[2px]' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'}`}
          >
            {t("Grades", "学年")}
          </button>
          <button 
            onClick={() => setActiveTab('stars')}
            className={`px-6 py-3 font-bold text-lg transition-colors duration-300 flex items-center gap-2 cursor-pointer ${activeTab === 'stars' ? 'text-[var(--primary-color)] border-b-4 border-[var(--primary-color)] -mb-[2px]' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'}`}
          >
            ⭐ {t("Starred Words", "お気に入り")} ({starredWords.length})
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {searchQuery ? (
        // SEARCH RESULTS
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
           <h3 className="text-xl font-bold text-[var(--text-color)]">
             {t("Search Results", "検索結果")}: {searchResults.length} {t("found", "件")}
           </h3>
           {searchResults.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {searchResults.map((word, index) => (
                  <Flashcard 
                    key={`${word.id}-${index}`} 
                    word={word} 
                    mode="all" 
                    isStarred={starredWords.some(w => w.id === word.id && w.en === word.en)}
                    toggleStar={toggleStar}
                  />
                ))}
             </div>
           ) : (
             <div className="text-center p-12 text-[var(--text-muted)]">
                {t("No words matched your search.", "一致する単語が見つかりませんでした。")}
             </div>
           )}
        </div>
      ) : activeTab === 'stars' ? (
        // STARRED WORDS
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
           {starredWords.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {starredWords.map((word, index) => (
                  <Flashcard 
                    key={`${word.id}-${index}`} 
                    word={word} 
                    mode="all" 
                    isStarred={true}
                    toggleStar={toggleStar}
                  />
                ))}
             </div>
           ) : (
             <div className="text-center p-12 bg-[var(--surface-color)] rounded-xl border-2 border-dashed border-[var(--border-color)]">
                <span className="text-5xl block mb-4 opacity-50">⭐</span>
                <h3 className="text-xl font-bold text-[var(--text-color)] mb-2">
                  {t("No starred words yet.", "お気に入りの単語はまだありません。")}
                </h3>
                <p className="text-[var(--text-muted)]">
                  {t("Tap the star icon on any flashcard to save it here for quick practice!", "フラッシュカードの星アイコンをタップして、後ですぐに練習できるように保存しましょう。")}
                </p>
             </div>
           )}
        </div>
      ) : !selectedGrade ? (
        // GRADE SELECTION
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-left-4 duration-300">
          {grades.map(grade => (
            <button
              key={grade.id}
              onClick={() => setSelectedGrade(grade)}
              className="bg-[var(--surface-color)] p-8 rounded-xl shadow-[var(--header-shadow)] border-2 border-transparent hover:border-[var(--primary-color)] active:scale-95 transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <span className="text-2xl font-bold text-[var(--primary-color)]">{grade.name_en}</span>
              <span className="text-xl text-[var(--text-muted)]">{grade.name_ja}</span>
            </button>
          ))}
        </div>
      ) : (
        // UNIT SELECTION
        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedGrade(null)}
              className="text-[var(--primary-color)] hover:underline font-bold text-lg cursor-pointer"
            >
              ← {t("Back to Grades", "学年選択に戻る")}
            </button>
            <h3 className="text-2xl font-bold text-[var(--text-color)]">
              {lang === 'en' ? selectedGrade.name_en : selectedGrade.name_ja} {t("Units", "単元")}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(selectedGrade.units).map(([unitId, unitData]) => (
              <Link
                key={unitId}
                to={`/vocabulary/${selectedGrade.id}/${unitId}`}
                className="bg-[var(--surface-color)] p-6 rounded-lg shadow-[var(--header-shadow)] border-2 border-transparent hover:border-[var(--primary-color)] active:scale-95 transition-all duration-300 flex flex-col gap-2 no-underline"
              >
                <span className="text-lg font-bold text-[var(--primary-color)]">{unitData.name_en}</span>
                <span className="text-md text-[var(--text-muted)]">{unitData.name_ja}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VocabularyHub;