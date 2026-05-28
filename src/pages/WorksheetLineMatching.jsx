import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import vocabData from '../data/normalized_vocabulary.json';

// Helper to shuffle an array
const shuffleArray = (arr) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

function WorksheetLineMatching({ t, lang }) {
  const [gradeId, setGradeId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [leftItems, setLeftItems] = useState([]);
  const [rightItems, setRightItems] = useState([]);
  const [useImages, setUseImages] = useState(true);
  
  const grades = vocabData.grades || [];
  
  // Get available units for the selected grade
  const availableUnits = vocabData.units.filter(u => u.grade_id === gradeId);

  // When grade changes, reset unit
  useEffect(() => {
    setUnitId('');
  }, [gradeId]);

  // Generate worksheet when grade, unit, or toggle changes
  useEffect(() => {
    if (!gradeId || !unitId) {
      setLeftItems([]);
      setRightItems([]);
      return;
    }

    // Find the unit number (e.g., from 'grade3_unit1' we need '1', but let's parse it safely)
    // The target_curriculum holds the unit number (integer)
    const unitMatch = unitId.match(/unit(\d+)/i);
    if (!unitMatch) return;
    const unitNum = parseInt(unitMatch[1], 10);

    // Filter words that belong to this grade and unit
    const filteredWords = vocabData.words.filter(w => {
      const gradeCurriculum = w.target_curriculum[gradeId];
      return gradeCurriculum && gradeCurriculum.includes(unitNum);
    });

    // Pick up to 10 random words
    const selected = shuffleArray(filteredWords).slice(0, 10);

    // Create left items (English) and right items (Japanese/Image)
    setLeftItems(selected);
    
    // Right items are shuffled independently
    setRightItems(shuffleArray([...selected]));

  }, [gradeId, unitId, useImages]);

  const handlePrint = () => {
    window.print();
  };

  const getUnitName = (u) => lang === 'en' ? u.name_en : u.name_ja;
  const getGradeName = (g) => lang === 'en' ? g.name_en : g.name_ja;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Controls (Hidden during print) */}
      <div className="no-print flex flex-col gap-6 bg-[var(--surface-color)] p-6 rounded-xl border-2 border-[var(--border-color)] shadow-[var(--header-shadow)]">
        <div className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
          <Link to="/admin/tools/worksheets" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
            ← {t("Back to Worksheets", "ワークシートに戻る")}
          </Link>
          <div className="flex justify-between items-end flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold text-[var(--text-color)]">
                {t("Line Matching Quiz", "線結びクイズ")}
              </h2>
              <p className="text-[var(--text-muted)] text-md mt-1">
                {t("Select a grade and unit to generate a printable worksheet.", "学年と単元を選択して、印刷可能なワークシートを生成します。")}
              </p>
            </div>
            <button 
              onClick={handlePrint}
              disabled={leftItems.length === 0}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md active:scale-95 text-lg"
            >
              🖨️ {t("Print Worksheet", "印刷する")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Grade Select */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-[var(--text-color)]">{t("Grade", "学年")}</label>
            <select 
              value={gradeId} 
              onChange={(e) => setGradeId(e.target.value)}
              className="p-3 rounded-lg border-2 border-[var(--border-color)] bg-transparent text-[var(--text-color)] focus:border-[var(--primary-color)] outline-none"
            >
              <option value="">{t("-- Select Grade --", "-- 学年を選択 --")}</option>
              {grades.map(g => (
                <option key={g.id} value={g.id}>{getGradeName(g)}</option>
              ))}
            </select>
          </div>

          {/* Unit Select */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-[var(--text-color)]">{t("Unit", "単元")}</label>
            <select 
              value={unitId} 
              onChange={(e) => setUnitId(e.target.value)}
              disabled={!gradeId}
              className="p-3 rounded-lg border-2 border-[var(--border-color)] bg-transparent text-[var(--text-color)] focus:border-[var(--primary-color)] outline-none disabled:opacity-50"
            >
              <option value="">{t("-- Select Unit --", "-- 単元を選択 --")}</option>
              {availableUnits.map(u => (
                <option key={u.id} value={u.id}>{getUnitName(u)}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-[var(--text-color)]">{t("Right Column Style", "右列のスタイル")}</label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-color)]">
                <input 
                  type="radio" 
                  name="colStyle" 
                  checked={useImages} 
                  onChange={() => setUseImages(true)}
                  className="w-5 h-5 accent-[var(--primary-color)]"
                />
                {t("Images (if available)", "画像 (あれば)")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-color)]">
                <input 
                  type="radio" 
                  name="colStyle" 
                  checked={!useImages} 
                  onChange={() => setUseImages(false)}
                  className="w-5 h-5 accent-[var(--primary-color)]"
                />
                {t("Japanese Text", "日本語")}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* The Printable Worksheet Area */}
      {leftItems.length > 0 ? (
        <div className="print-area bg-white text-black p-8 rounded-xl shadow-xl min-h-[800px] border border-gray-300 mx-auto w-full max-w-[800px]">
          
          {/* Worksheet Header */}
          <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
            <div>
              <h1 className="text-3xl font-black font-serif">English Matching Quiz</h1>
              <p className="text-lg font-bold mt-2 text-gray-600">
                {gradeId && grades.find(g => g.id === gradeId) ? grades.find(g => g.id === gradeId).name_en : ''} - 
                {unitId && availableUnits.find(u => u.id === unitId) ? ' ' + availableUnits.find(u => u.id === unitId).name_en : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-lg font-bold">
              <div className="flex items-end gap-2">
                <span>Class:</span>
                <div className="border-b-2 border-black w-24"></div>
              </div>
              <div className="flex items-end gap-2">
                <span>Name:</span>
                <div className="border-b-2 border-black w-48"></div>
              </div>
            </div>
          </div>

          <p className="text-xl font-bold mb-8 italic">Draw a line to match the English word to the correct meaning.</p>

          {/* Worksheet Columns */}
          <div className="flex justify-between items-stretch">
            
            {/* Left Column: English Words */}
            <div className="flex flex-col gap-8 w-1/3">
              {leftItems.map((item, idx) => (
                <div key={`left-${item.id}-${idx}`} className="flex items-center justify-between h-16">
                  <span className="text-3xl font-bold">{item.en}</span>
                  <div className="w-4 h-4 rounded-full bg-black ml-4"></div>
                </div>
              ))}
            </div>

            {/* Middle Spacer for Lines */}
            <div className="flex-1"></div>

            {/* Right Column: Images or Japanese */}
            <div className="flex flex-col gap-8 w-1/3">
              {rightItems.map((item, idx) => (
                <div key={`right-${item.id}-${idx}`} className="flex items-center justify-between h-16">
                  <div className="w-4 h-4 rounded-full bg-black mr-4"></div>
                  
                  {useImages && item.img_path ? (
                    <div className="h-16 w-16 border-2 border-gray-300 p-1 flex items-center justify-center rounded-md">
                      <img src={`/${item.img_path}`} alt={item.en} className="max-h-full max-w-full object-contain filter grayscale" />
                    </div>
                  ) : (
                    <span className="text-3xl font-bold">{item.ja_kanji || item.ja_hiragana || item.en}</span>
                  )}
                </div>
              ))}
            </div>

          </div>

        </div>
      ) : (
        <div className="no-print bg-[var(--surface-color)] p-12 rounded-xl border-2 border-[var(--border-color)] border-dashed text-center">
          <p className="text-xl text-[var(--text-muted)] font-bold">
            {t("Please select a grade and unit that contains vocabulary.", "単語が含まれる学年と単元を選択してください。")}
          </p>
        </div>
      )}

    </div>
  );
}

export default WorksheetLineMatching;
