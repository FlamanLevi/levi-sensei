import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Outlet } from 'react-router-dom';
import Home from './pages/Home';
import ToolsHub from './pages/ToolsHub';
import VocabularyHub from './pages/VocabularyHub';
import UnitView from './pages/UnitView';
import TeacherPortal from './pages/TeacherPortal';
import GameCategoryHub from './pages/GameCategoryHub';
import TabletGamesHub from './pages/TabletGamesHub';
import ClassroomGamesHub from './pages/ClassroomGamesHub';
import OhajikiGame from './pages/OhajikiGame';
import OhajikiHostSetup from './pages/OhajikiHostSetup';
import OhajikiHostLive from './pages/OhajikiHostLive';
import OhajikiStudentLive from './pages/OhajikiStudentLive';
import QuizHostSetup from './pages/QuizHostSetup';
import QuizHostLive from './pages/QuizHostLive';
import StudentJoin from './pages/StudentJoin';
import QuizStudentLive from './pages/QuizStudentLive';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminToolsHub from './pages/AdminToolsHub';
import StudentProfile from './pages/StudentProfile';
import ClassWars from './pages/ClassWars';
import AdminWorksheetsHub from './pages/AdminWorksheetsHub';
import WorksheetLineMatching from './pages/WorksheetLineMatching';
import SuperSetup from './pages/SuperSetup';
import { TeacherSchoolDropdown } from './components/TeacherSchoolDropdown';
import { TeacherAuthGateway } from './components/auth/TeacherAuthGateway';
import { db } from './lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from './hooks/useAuth';

function AdminRouteWrapper({ t, lang }) {
  return (
    <TeacherAuthGateway t={t} lang={lang}>
      <Outlet />
    </TeacherAuthGateway>
  );
}

function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('esl-lang') || 'ja');
  const [theme, setTheme] = useState(() => localStorage.getItem('esl-theme') || 'light');
  const [color, setColor] = useState(() => localStorage.getItem('esl-color') || 'blue');
  const [pattern, setPattern] = useState(() => localStorage.getItem('esl-pattern') || 'none');
  const [studentName, setStudentName] = useState(() => localStorage.getItem('esl-student-name') || '');

  // Load Starred Words
  const [starredWords, setStarredWords] = useState(() => {
    const saved = localStorage.getItem('esl-stars');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('esl-stars', JSON.stringify(starredWords));
  }, [starredWords]);

  useEffect(() => {
    localStorage.setItem('esl-student-name', studentName);
  }, [studentName]);

  // Auto-reload stale tabs that are kept open for days (e.g. on student iPads)
  useEffect(() => {
    const checkStaleTab = () => {
      const today = new Date().toDateString();
      const lastLoad = sessionStorage.getItem('esl_last_load_date');
      
      if (lastLoad && lastLoad !== today) {
        sessionStorage.setItem('esl_last_load_date', today);
        window.location.reload(true);
      } else if (!lastLoad) {
        sessionStorage.setItem('esl_last_load_date', today);
      }
    };

    // Check immediately on mount
    checkStaleTab();

    // Check every time the browser tab becomes visible again (e.g. Safari wakes up)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStaleTab();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const { user } = useAuth();

  // Force-refresh all clients globally when a new version is pushed
  useEffect(() => {
    if (!user) return; // Wait for authentication before attaching listener to avoid permission denied
    
    const versionRef = ref(db, 'app/settings/version');
    const unsub = onValue(versionRef, (snap) => {
      const currentVersion = snap.val();
      const localVersion = localStorage.getItem('app_version');
      
      if (currentVersion && localVersion && currentVersion !== localVersion) {
        // Version changed! Update local storage and force a hard reload
        localStorage.setItem('app_version', currentVersion);
        window.location.reload(true);
      } else if (currentVersion && !localVersion) {
        // First time loading this logic, just set it
        localStorage.setItem('app_version', currentVersion);
      }
    });
    return () => unsub();
  }, [user]);

  const toggleStar = (word) => {
    setStarredWords(prev => {
      const exists = prev.find(w => w.id === word.id && w.en === word.en);
      if (exists) {
        return prev.filter(w => !(w.id === word.id && w.en === word.en));
      } else {
        return [...prev, word];
      }
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('esl-lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('esl-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-color', color);
    localStorage.setItem('esl-color', color);
  }, [color]);

  useEffect(() => {
    document.documentElement.setAttribute('data-pattern', pattern);
    localStorage.setItem('esl-pattern', pattern);
  }, [pattern]);

  const t = (en, ja) => (lang === 'en' ? en : ja);

  const location = useLocation();
  const isLiveGame = location.pathname === '/play/trivia' || 
                     location.pathname === '/play/ohajiki' || 
                     location.pathname === '/admin/games/quiz/live' || 
                     location.pathname === '/admin/games/tablet/ohajiki/live';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      
      {/* Header */}
      {!isLiveGame && (
      <header className={`flex flex-wrap justify-between items-center px-6 py-4 transition-all duration-300 gap-4 ${isAdmin ? 'sticky top-0 z-50 bg-[var(--surface-color)]/90 backdrop-blur-md shadow-md border-b-2 border-[var(--border-color)]' : 'bg-[var(--header-bg)] shadow-[var(--header-shadow)]'}`}>
        <div className="flex-1 min-w-max">
          <Link 
            to="/admin"
            className="text-2xl text-[var(--primary-color)] font-bold m-0 transition-colors duration-300 cursor-pointer select-none no-underline block"
          >
            {lang === 'en' ? "Levi Sensei's Page" : <>リヴァイ<ruby>先生<rt>せんせい</rt></ruby>のページ</>}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-6 justify-center">
          
          {isAdmin && <TeacherSchoolDropdown t={t} lang={lang} />}

          {/* Language Toggle */}
          <div className="flex items-center gap-2 flex-col sm:flex-row">
            <span className="text-sm font-bold text-[var(--text-muted)]">
              {t("Language", <ruby>言語<rt>げんご</rt></ruby>)}
            </span>
            <label className="relative inline-block w-[60px] h-[30px]">
              <input 
                type="checkbox" 
                className="peer opacity-0 w-0 h-0" 
                checked={lang === 'en'} 
                onChange={(e) => setLang(e.target.checked ? 'en' : 'ja')} 
              />
              <span className="absolute cursor-pointer inset-0 bg-[var(--surface-color)] border-2 border-[var(--border-color)] rounded-full transition-all duration-300 flex items-center justify-between p-[2px] text-xs font-bold select-none overflow-hidden peer-checked:before:translate-x-[26px] before:absolute before:content-[''] before:h-[22px] before:w-[26px] before:left-[2px] before:bottom-[2px] before:bg-[var(--primary-color)] before:rounded-full before:transition-all before:duration-300 before:z-0">
                <span className={`z-10 w-[26px] h-full flex items-center justify-center transition-colors duration-300 ${lang === 'ja' ? 'text-white' : 'text-[var(--text-color)]'}`}>あ</span>
                <span className={`z-10 w-[26px] h-full flex items-center justify-center transition-colors duration-300 ${lang === 'en' ? 'text-white' : 'text-[var(--text-color)]'}`}>A</span>
              </span>
            </label>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center gap-2 flex-col sm:flex-row">
            <span className="text-sm font-bold text-[var(--text-muted)]">{t("Theme", "テーマ")}</span>
            <label className="relative inline-block w-[60px] h-[30px]">
              <input 
                type="checkbox" 
                className="peer opacity-0 w-0 h-0" 
                checked={theme === 'dark'} 
                onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')} 
              />
              <span className="absolute cursor-pointer inset-0 bg-[var(--surface-color)] border-2 border-[var(--border-color)] rounded-full transition-all duration-300 flex items-center justify-between p-[2px] text-xs font-bold select-none overflow-hidden peer-checked:before:translate-x-[26px] before:absolute before:content-[''] before:h-[22px] before:w-[26px] before:left-[2px] before:bottom-[2px] before:bg-[var(--primary-color)] before:rounded-full before:transition-all before:duration-300 before:z-0">
                <span className={`z-10 w-[26px] h-full flex items-center justify-center transition-colors duration-300 ${theme === 'light' ? 'text-white' : 'text-[var(--text-color)]'}`}>☀️</span>
                <span className={`z-10 w-[26px] h-full flex items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'text-white' : 'text-[var(--text-color)]'}`}>🌙</span>
              </span>
            </label>
          </div>

          {/* Color Dropdown */}
          <div className="flex items-center gap-2 flex-col sm:flex-row">
            <span className="text-sm font-bold text-[var(--text-muted)]">{t("Color", <ruby>色<rt>いろ</rt></ruby>)}</span>
            <select 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="appearance-none bg-[var(--surface-color)] text-[var(--text-color)] border-2 border-[var(--border-color)] rounded-lg py-1 pl-3 pr-8 font-inherit text-sm font-bold cursor-pointer transition-colors duration-300 focus:outline-none focus:border-[var(--primary-color)] bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_12_12%22%3E%3Cpath_fill=%22%23666%22_d=%22M2_4l4_4_4-4z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_0.5rem_center]"
            >
              <option value="black">{t("Black", "黒（くろ）")}</option>
              <option value="blue">{t("Blue", "青（あお）")}</option>
              <option value="brown">{t("Brown", "茶色（ちゃいろ）")}</option>
              <option value="gray">{t("Gray", "灰色（はいいろ）")}</option>
              <option value="green">{t("Green", "緑（みどり）")}</option>
              <option value="orange">{t("Orange", "オレンジ")}</option>
              <option value="pink">{t("Pink", "ピンク")}</option>
              <option value="purple">{t("Purple", "紫（むらさき）")}</option>
              <option value="red">{t("Red", "赤（あか）")}</option>
              <option value="yellow">{t("Yellow", "黄色（きいろ）")}</option>
            </select>
          </div>

          {/* Pattern Dropdown */}
          <div className="flex items-center gap-2 flex-col sm:flex-row">
            <span className="text-sm font-bold text-[var(--text-muted)]">{t("Pattern", <ruby>模様<rt>もよう</rt></ruby>)}</span>
            <select 
              value={pattern} 
              onChange={(e) => setPattern(e.target.value)}
              className="appearance-none bg-[var(--surface-color)] text-[var(--text-color)] border-2 border-[var(--border-color)] rounded-lg py-1 pl-3 pr-8 font-inherit text-sm font-bold cursor-pointer transition-colors duration-300 focus:outline-none focus:border-[var(--primary-color)] bg-[url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2212%22_height=%2212%22_viewBox=%220_0_12_12%22%3E%3Cpath_fill=%22%23666%22_d=%22M2_4l4_4_4-4z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_0.5rem_center]"
            >
              <option value="none">{t("None", "なし")}</option>
              <option value="dots">{t("Dots", "水玉（みずたま）")}</option>
              <option value="grid">{t("Grid", "マス目（ますめ）")}</option>
              <option value="waves">{t("Waves", "波（なみ）")}</option>
              <option value="stripes">{t("Stripes", "縞模様（しまもよう）")}</option>
              <option value="cross">{t("Cross", "クロス")}</option>
            </select>
          </div>

        </div>
      </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isLiveGame ? 'p-0 max-w-full' : 'p-6 max-w-[1200px]'} w-full mx-auto`}>
        <Routes>
          <Route path="/" element={<Home t={t} studentName={studentName} setStudentName={setStudentName} />} />
          
          <Route path="/admin/super-setup" element={<SuperSetup t={t} />} />

          <Route path="/admin" element={<AdminRouteWrapper t={t} lang={lang} />}>
            <Route index element={<TeacherPortal t={t} lang={lang} />} />
            <Route path="games" element={<GameCategoryHub t={t} lang={lang} />} />
            <Route path="games/tablet" element={<TabletGamesHub t={t} lang={lang} />} />
            <Route path="games/tablet/ohajiki" element={<OhajikiHostSetup t={t} lang={lang} />} />
            <Route path="games/tablet/ohajiki/live" element={<OhajikiHostLive t={t} lang={lang} />} />
            
            <Route path="games/classroom" element={<ClassroomGamesHub t={t} lang={lang} />} />
            <Route path="games/classroom/ohajiki" element={<OhajikiGame t={t} lang={lang} />} />
            <Route path="games/quiz" element={<QuizHostSetup t={t} lang={lang} />} />
            <Route path="games/quiz/live" element={<QuizHostLive t={t} lang={lang} />} />
            
            <Route path="tools" element={<AdminToolsHub t={t} lang={lang} />} />
            <Route path="tools/quiz-analytics" element={<AdminAnalytics t={t} lang={lang} />} />
            <Route path="tools/class-wars" element={<ClassWars t={t} lang={lang} />} />
            <Route path="tools/worksheets" element={<AdminWorksheetsHub t={t} lang={lang} />} />
            <Route path="tools/worksheets/matching" element={<WorksheetLineMatching t={t} lang={lang} />} />
          </Route>
          
          <Route path="/profile" element={<StudentProfile t={t} lang={lang} />} />
          
          <Route path="/play" element={<StudentJoin t={t} lang={lang} />} />
          <Route path="/play/trivia" element={<QuizStudentLive t={t} lang={lang} />} />
          <Route path="/play/ohajiki" element={<OhajikiStudentLive t={t} lang={lang} />} />

          <Route path="/tools" element={<ToolsHub t={t} lang={lang} />} />
          <Route path="/vocabulary" element={<VocabularyHub t={t} lang={lang} starredWords={starredWords} toggleStar={toggleStar} />} />
          <Route path="/vocabulary/:gradeId/:unitId" element={<UnitView t={t} lang={lang} starredWords={starredWords} toggleStar={toggleStar} />} />
        </Routes>
      </main>

      {/* Footer */}
      {!isLiveGame && (
      <footer className="text-center p-6 mt-8 text-[var(--text-muted)] text-sm">
        <p>
          {t("© 2026 Levi Flaman", "© 2026 フラマン リヴァイ")} | v1.0
        </p>
      </footer>
      )}
    </div>
  );
}

export default App;