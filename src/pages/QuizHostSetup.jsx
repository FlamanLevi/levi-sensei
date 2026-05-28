import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import flatVocab from '../data/normalized_vocabulary.json';
import { isWordInUnit } from '../utils/vocabulary';
import { db, auth } from '../lib/firebase';
import { ref, set, get } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';

const SegmentedControl = ({ label, value, options, onChange, layoutIdKey }) => (
  <div className="flex flex-col gap-2">
    <label className="font-bold text-sm text-[var(--text-color)] pl-1">{label}</label>
    <div className="flex p-1.5 gap-1.5 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--surface-color)] shadow-inner overflow-x-auto">
      {options.map(opt => {
        const isSelected = value === opt.value;
        return (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col flex-1 min-w-max items-center justify-center py-2 px-3 rounded-xl transition-all relative z-0 ${isSelected ? 'text-white shadow-md' : 'text-[var(--text-muted)]'}`}
          >
            {isSelected && (
              <motion.div 
                layoutId={`segment-bg-${layoutIdKey}`} 
                className="absolute inset-0 bg-[var(--primary-color)] rounded-xl -z-10" 
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="font-black text-base md:text-lg">{opt.label}</span>
            {opt.subLabel && (
              <span className={`text-[0.65rem] md:text-xs font-bold mt-0.5 tracking-tight ${isSelected ? 'text-white/90' : 'text-[var(--text-muted)]/70'}`}>
                {opt.subLabel}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  </div>
);

function QuizHostSetup({ t, lang }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isReviewMode = location.state?.isReviewMode || false;
  const preselectedIds = location.state?.preselectedIds || [];

  // State: Unit Selection
  const [selectedUnits, setSelectedUnits] = useState(new Set());
  const [poolSize, setPoolSize] = useState(0);

  // State: Game Configuration
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(10000);
  const [optionCount, setOptionCount] = useState(4);
  const [hintMode, setHintMode] = useState('late');
  const [gameMode, setGameMode] = useState('individual');

  // State: Matrix Display Config
  const [prompts, setPrompts] = useState(new Set(['ja'])); // Main screen default
  const [options, setOptions] = useState(new Set(['en', 'en_katakana'])); // Tablet default
  
  const [bgm, setBgm] = useState('random');
  const [itemsMode, setItemsMode] = useState('none');
  const [isCreating, setIsCreating] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (isReviewMode) {
      setPoolSize(preselectedIds.length);
      return;
    }
    const count = flatVocab.words.filter(w => Array.from(selectedUnits).some(uid => isWordInUnit(w, uid))).length;
    setPoolSize(count);
  }, [selectedUnits, isReviewMode, preselectedIds]);

  const toggleUnit = (unitKey) => {
    const newSelection = new Set(selectedUnits);
    if (newSelection.has(unitKey)) newSelection.delete(unitKey);
    else newSelection.add(unitKey);
    setSelectedUnits(newSelection);
  };

  const toggleAll = (select) => {
    if (!select) {
      setSelectedUnits(new Set());
      return;
    }
    const newSelection = new Set();
    flatVocab.units.forEach(u => newSelection.add(u.id));
    setSelectedUnits(newSelection);
  };

  const getCategory = (val) => {
    if (val === 'img') return 'img';
    if (val === 'ja') return 'ja';
    return 'en';
  };

  const getActiveCategory = (selectedSet) => {
    if (selectedSet.has('img')) return 'img';
    if (selectedSet.has('ja')) return 'ja';
    if (selectedSet.has('en') || selectedSet.has('en_katakana')) return 'en';
    return null;
  };

  const isPromptDisabled = (val) => {
    if (val === 'img') return true;
    const cat = getCategory(val);
    const activePromptCat = getActiveCategory(prompts);
    const activeOptionsCat = getActiveCategory(options);
    
    if (activePromptCat && activePromptCat !== cat) return true;
    if (activeOptionsCat === cat) return true;
    return false;
  };

  const isOptionDisabled = (val) => {
    if (val === 'img') return true;
    const cat = getCategory(val);
    const activePromptCat = getActiveCategory(prompts);
    const activeOptionsCat = getActiveCategory(options);
    
    if (activeOptionsCat && activeOptionsCat !== cat) return true;
    if (activePromptCat === cat) return true;
    return false;
  };

  const toggleMatrix = (setObj, updateFn, value, disabled) => {
    if (disabled) return;
    const newSet = new Set(setObj);
    if (newSet.has(value)) newSet.delete(value);
    else newSet.add(value);
    updateFn(newSet);
  };

  const handleCreateRoom = async () => {
    if (poolSize < 5) {
      alert(t("Select at least 5 words total to generate a game.", "ゲームを作成するには、合計5つ以上の単語を選択してください。"));
      return;
    }
    if (prompts.size === 0) {
      alert(t("Select at least one display option for the Main Screen.", "メイン画面の表示オプションを少なくとも1つ選択してください。"));
      return;
    }
    if (options.size === 0) {
      alert(t("Select at least one option for the Tablets.", "タブレットの表示オプションを少なくとも1つ選択してください。"));
      return;
    }

    setIsCreating(true);
    try {
      let schoolId = 'unknown';
      if (auth.currentUser) {
        const snap = await get(ref(db, `users/${auth.currentUser.uid}/teacherProfile`));
        if (snap.exists() && snap.val().schoolId) {
          schoolId = snap.val().schoolId;
        }
      }

      const retainRoom = location.state?.retainRoom;
      const roomCode = retainRoom && location.state?.roomCode ? location.state.roomCode : Math.floor(1000 + Math.random() * 9000).toString();
      
      await set(ref(db, 'trivia/gameState'), null);
      if (!retainRoom) {
        await set(ref(db, 'trivia/players'), null);
        await set(ref(db, 'trivia/teamScores'), null);
      }

      const roomRef = ref(db, 'trivia/room');
      await set(roomRef, {
        roomCode,
        status: "LOBBY",
        gameMode,
        schoolId
      });

      let finalBgm = bgm;
      if (bgm === 'random') {
        const tracks = ['bgm-1.mp3', 'bgm-2.mp3', 'bgm-3.mp3'];
        finalBgm = tracks[Math.floor(Math.random() * tracks.length)];
      }

      navigate(`/admin/games/quiz/live`, { 
        state: { 
          roomCode, 
          selectedUnits: isReviewMode ? [] : Array.from(selectedUnits),
          preselectedIds,
          settings: { questionCount, timeLimit, optionCount, hintMode, gameMode, itemsMode, bgm: finalBgm, prompts: Array.from(prompts), options: Array.from(options), isReviewMode }
        }
      });

    } catch (error) {
      console.error("Error creating room:", error);
      alert(t("Failed to create room. Check your connection.", "ルームの作成に失敗しました。"));
      setIsCreating(false);
    }
  };

  const groupedUnits = useMemo(() => {
    return flatVocab.units.reduce((acc, unit) => {
      if (!acc[unit.grade_id]) acc[unit.grade_id] = [];
      acc[unit.grade_id].push(unit);
      return acc;
    }, {});
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const matrixConfig = [
    { val: 'ja', icon: '漢', labelEn: 'Japanese', labelJa: '日本語' },
    { val: 'en', icon: 'ABC', labelEn: 'Spelling', labelJa: 'スペル' },
    { val: 'en_katakana', icon: 'ア', labelEn: 'Katakana', labelJa: 'カタカナ' }
  ];

  return (
    <div className="min-h-[100dvh] pb-32">
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="flex flex-col gap-8 p-4 md:p-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2 border-b-2 border-[var(--border-color)] pb-4">
          <Link to="/admin/games/tablet" className="text-[var(--primary-color)] hover:underline font-bold text-md flex items-center gap-2">
            ← {t("Back to Tablet Games", "タブレット用ゲームに戻る")}
          </Link>
          <h2 className="text-4xl md:text-5xl font-black text-[var(--text-color)] tracking-tight">
            {t("Quiz Setup", "クイズ設定")}
          </h2>
          <p className="text-[var(--text-muted)] text-lg font-bold">
            {t("Configure the rules and select vocabulary for the match.", "ルールの設定と単語の選択を行ってください。")}
          </p>
        </motion.div>

        {/* 1. Unit Selection (Hidden in Review Mode) */}
        {!isReviewMode ? (
          <motion.div variants={itemVariants} className="bg-[var(--surface-color)] p-6 md:p-8 rounded-3xl shadow-sm border-2 border-[var(--border-color)]">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
              <h3 className="text-2xl font-black text-[var(--primary-color)] flex items-center gap-3">
                <span className="bg-[var(--primary-color)] text-white w-8 h-8 flex items-center justify-center rounded-full text-lg">1</span>
                {t("Select Units", "ユニットの選択")}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => toggleAll(true)} className="flex-1 md:flex-none text-sm font-bold px-4 py-2 bg-[var(--border-color)] text-[var(--text-color)] rounded-xl hover:scale-105 active:scale-95 transition-all">
                  {t("Check All", "すべて選択")}
                </button>
                <button onClick={() => toggleAll(false)} className="flex-1 md:flex-none text-sm font-bold px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:scale-105 active:scale-95 transition-all">
                  {t("Clear All", "すべて解除")}
                </button>
              </div>
            </div>
            
            <div className="space-y-8">
              {flatVocab.grades.map(grade => (
                <div key={grade.id} className="pl-4 border-l-4 border-[var(--primary-color)]">
                  <h4 className="font-black text-xl text-[var(--text-color)] mb-4">{t(grade.name_en, grade.name_ja)}</h4>
                  <div className="flex flex-wrap gap-3">
                    {(groupedUnits[grade.id] || []).map(unit => {
                      const isSelected = selectedUnits.has(unit.id);
                      const wordCount = flatVocab.words.filter(w => isWordInUnit(w, unit.id)).length;
                      return (
                        <motion.button 
                          key={unit.id} 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleUnit(unit.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 font-bold transition-all ${isSelected ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md' : 'bg-[var(--surface-color)] text-[var(--text-color)] border-[var(--border-color)] hover:border-[var(--primary-color)]/50'}`}
                        >
                          <span className="text-base">{t(unit.name_en, unit.name_ja)}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
                            {wordCount} {t("words", "単語")}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="bg-blue-50 dark:bg-blue-900/20 p-6 md:p-8 rounded-3xl shadow-sm border-2 border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <div>
               <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-3">
                 <span className="text-3xl">🎯</span>
                 {t("Review Mode Active!", "復習モードが有効です！")}
               </h3>
               <p className="text-blue-800/70 dark:text-blue-200/70 font-bold mt-2">
                 {t("Bypassing unit selection. This game will strictly use the", "ユニット選択をスキップします。このゲームは厳密に")} {poolSize} {t("trouble words.", "個の苦手な単語を使用します。")}
               </p>
            </div>
            <Link to="/admin/analytics" className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 rounded-lg shadow-sm font-bold border border-blue-200 hover:bg-blue-50 transition-colors">
               {t("Cancel", "キャンセル")}
            </Link>
          </motion.div>
        )}

        {/* 2. Game Settings */}
        <motion.div variants={itemVariants} className="bg-[var(--surface-color)] p-6 md:p-8 rounded-3xl shadow-sm border-2 border-[var(--border-color)]">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
            <h3 className="text-2xl font-black text-[var(--primary-color)] flex items-center gap-3">
              <span className="bg-[var(--primary-color)] text-white w-8 h-8 flex items-center justify-center rounded-full text-lg">2</span>
              {t("Game Settings", "ゲーム設定")}
            </h3>
            <button 
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl hover:scale-105 active:scale-95 transition-all border border-blue-200 dark:border-blue-800"
            >
              <span className="text-lg">❓</span>
              {t("Descriptions", "設定の説明")}
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <SegmentedControl 
              layoutIdKey="qCount"
              label={t("Number of Questions", "問題数")} 
              value={questionCount > poolSize && questionCount !== -1 ? poolSize : questionCount} 
              onChange={setQuestionCount}
              options={[
                { value: 5, label: t("5", "5問"), subLabel: t("Sprint", "スプリント") },
                { value: 10, label: t("10", "10問"), subLabel: t("Standard", "標準") },
                { value: 15, label: "15", subLabel: t("Long", "長め") },
                { value: 20, label: "20", subLabel: t("Marathon", "マラソン") },
                { value: 30, label: "30", subLabel: t("Epic", "エピック") },
                { value: -1, label: t("All", "全て"), subLabel: t("Endless", "エンドレス") }
              ].filter(opt => opt.value === -1 || opt.value <= poolSize || opt.value === 5)} // Always allow 5 so it's not empty, even if pool is tiny (it will error later if < 5)
            />
            <SegmentedControl 
              layoutIdKey="timeLimit"
              label={t("Time per question", "1問あたりの時間")} 
              value={timeLimit} 
              onChange={setTimeLimit}
              options={[
                { value: 5000, label: t("5s", "5秒"), subLabel: t("Fast", "速い") },
                { value: 10000, label: t("10s", "10秒"), subLabel: t("Standard", "標準") },
                { value: 15000, label: t("15s", "15秒"), subLabel: t("Slow", "遅い") },
                { value: 20000, label: t("20s", "20秒"), subLabel: t("Relaxed", "ゆっくり") }
              ]}
            />
            <SegmentedControl 
              layoutIdKey="optCount"
              label={t("Options per Question", "選択肢の数")} 
              value={optionCount} 
              onChange={setOptionCount}
              options={[
                { value: 4, label: t("4", "4択"), subLabel: t("Easy", "簡単") },
                { value: 6, label: t("6", "6択"), subLabel: t("Medium", "普通") },
                { value: 8, label: t("8", "8択"), subLabel: t("Hard", "難しい") }
              ]}
            />
            <SegmentedControl 
              layoutIdKey="hintMode"
              label={t("Hint System (Dimming answers)", "ヒント機能")} 
              value={hintMode} 
              onChange={setHintMode}
              options={[
                { value: 'late', label: t("Late", "後半"), subLabel: t("At 50%", "50%で") },
                { value: 'even', label: t("Evenly", "均等"), subLabel: t("Gradual", "徐々に") },
                { value: 'none', label: t("None", "なし"), subLabel: t("Hardcore", "ハードコア") }
              ]}
            />
            <SegmentedControl 
              layoutIdKey="gameMode"
              label={t("Game Mode", "ゲームモード")} 
              value={gameMode} 
              onChange={setGameMode}
              options={[
                { value: 'individual', label: t("Solo", "ソロ"), subLabel: t("Versus", "個人戦") },
                { value: 'team2', label: t("2 Teams", "2チーム"), subLabel: t("Red vs Blue", "赤 vs 青") },
                { value: 'team4', label: t("4 Teams", "4チーム"), subLabel: t("All colors", "4色対抗") }
              ]}
            />
            <SegmentedControl 
              layoutIdKey="itemsMode"
              label={t("Power-ups & Hazards", "パワーアップ＆妨害アイテム")} 
              value={itemsMode} 
              onChange={setItemsMode}
              options={[
                { value: 'none', label: t("None", "なし"), subLabel: t("Fair play", "フェアプレイ") },
                { value: 'buffs', label: t("Buffs", "強化"), subLabel: t("Help yourself", "自分を助ける") },
                { value: 'debuffs', label: t("Debuffs", "妨害"), subLabel: t("Attack others", "他人を邪魔する") },
                { value: 'both', label: t("Both", "両方"), subLabel: t("Pure Chaos", "カオス") }
              ]}
            />
            <SegmentedControl 
              layoutIdKey="bgm"
              label={t("Background Music", "BGM")} 
              value={bgm} 
              onChange={setBgm}
              options={[
                { value: 'random', label: t("Random", "ランダム"), subLabel: t("Surprise me!", "おまかせ") },
                { value: 'bgm-1.mp3', label: "MK64", subLabel: t("Mario Kart", "マリオカート") },
                { value: 'bgm-2.mp3', label: "P5R", subLabel: t("Persona 5", "ペルソナ5") },
                { value: 'bgm-3.mp3', label: "Wangan", subLabel: t("Midnight", "湾岸ミッドナイト") },
                { value: 'none', label: t("None", "なし"), subLabel: t("Silent", "無音") }
              ]}
            />
          </div>

          {/* Matrix Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t-2 border-[var(--border-color)]">
            
            {/* Main Screen */}
            <div className="flex flex-col gap-4">
              <h4 className="font-black text-xl text-[var(--text-color)]">📺 {t("Main Screen (Prompt)", "メイン画面 (問題)")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {matrixConfig.map(opt => {
                  const disabled = isPromptDisabled(opt.val);
                  const isSelected = prompts.has(opt.val);
                  return (
                    <motion.button 
                      key={`prompt-${opt.val}`}
                      whileHover={disabled ? {} : { scale: 1.05 }}
                      whileTap={disabled ? {} : { scale: 0.95 }}
                      onClick={() => toggleMatrix(prompts, setPrompts, opt.val, disabled)}
                      disabled={disabled}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 font-bold transition-all h-28 ${disabled ? 'opacity-30 cursor-not-allowed bg-[var(--surface-color)] border-[var(--border-color)]' : isSelected ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md' : 'bg-[var(--surface-color)] text-[var(--text-color)] border-[var(--border-color)] hover:border-[var(--primary-color)]/50'}`}
                    >
                      <span className="text-3xl mb-2">{opt.icon}</span>
                      <span className="text-sm">{t(opt.labelEn, opt.labelJa)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Tablets */}
            <div className="flex flex-col gap-4">
              <h4 className="font-black text-xl text-[var(--text-color)]">📱 {t("Tablets (Options)", "タブレット (選択肢)")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {matrixConfig.map(opt => {
                  const disabled = isOptionDisabled(opt.val);
                  const isSelected = options.has(opt.val);
                  return (
                    <motion.button 
                      key={`opt-${opt.val}`}
                      whileHover={disabled ? {} : { scale: 1.05 }}
                      whileTap={disabled ? {} : { scale: 0.95 }}
                      onClick={() => toggleMatrix(options, setOptions, opt.val, disabled)}
                      disabled={disabled}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 font-bold transition-all h-28 ${disabled ? 'opacity-30 cursor-not-allowed bg-[var(--surface-color)] border-[var(--border-color)]' : isSelected ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md' : 'bg-[var(--surface-color)] text-[var(--text-color)] border-[var(--border-color)] hover:border-[var(--primary-color)]/50'}`}
                    >
                      <span className="text-3xl mb-2">{opt.icon}</span>
                      <span className="text-sm">{t(opt.labelEn, opt.labelJa)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowHelpModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--surface-color)] border-4 border-[var(--border-color)] rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto z-10 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowHelpModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-[var(--border-color)] text-[var(--text-color)] rounded-full flex items-center justify-center font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
              
              <h2 className="text-3xl font-black mb-6 text-[var(--text-color)] flex items-center gap-3">
                <span>📖</span> {t("Settings Guide", "設定ガイド")}
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-xl text-[var(--primary-color)]">{t("Number of Questions", "問題数")}</h3>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("How many rounds the game will last. Choosing 'All' will play until every selected word has been tested.", "ゲームのラウンド数。「全て」を選ぶと、選択した単語がすべて出題されるまで続きます。")}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-[var(--primary-color)]">{t("Time per question", "1問あたりの時間")}</h3>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("How long students have to answer. Faster answers award more points!", "解答できる時間。早く答えるほど高得点になります！")}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-[var(--primary-color)]">{t("Options per Question", "選択肢の数")}</h3>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("The number of buttons on the students' tablets. Choose between 4, 6, or 8 options depending on the difficulty you want.", "生徒のタブレットに表示されるボタンの数。難易度に応じて4択、6択、8択から選択します。")}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-[var(--primary-color)]">{t("Hint System", "ヒント機能")}</h3>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("Automatically grays out incorrect answers to help struggling students. 'Late' dims half the wrong answers when 50% of the time is remaining. 'Evenly' dims wrong answers one by one as the timer ticks down. 'None' disables hints entirely for a hardcore experience.", "不正解の選択肢を暗くしてヒントを出します。「後半」は残り時間が半分になった時に不正解の半分を暗くします。「均等」は時間が経つにつれて1つずつ暗くします。「なし」はヒントを完全に無効にします。")}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-[var(--primary-color)]">{t("Game Mode", "ゲームモード")}</h3>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("Solo mode ranks every student individually. Team mode automatically assigns students to random teams and averages their scores.", "ソロモードは個人戦です。チームモードは生徒をランダムなチームに分け、チームの平均点で競います。")}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-[var(--primary-color)]">{t("Power-ups & Hazards", "パワーアップ＆妨害アイテム")}</h3>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("Enables special items (like shields or 2x points). Buffs help the student, Hazards disrupt the leading players.", "特殊アイテム（シールドやポイント2倍など）を有効にします。「強化」は自分を助け、「妨害」はトップのプレイヤーを邪魔します。")}
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-[var(--primary-color)]">{t("Main Screen & Tablets", "メイン画面＆タブレット")}</h3>
                  <p className="text-[var(--text-muted)] mt-1">
                    {t("Choose what is displayed on the big screen (Prompt) vs what is displayed on the students' tablets (Options). For example, show an Image on the big screen, and English Spelling on the tablets.", "大画面（問題）とタブレット（選択肢）に表示する内容を選びます。例：大画面に「画像」、タブレットに「英語のスペル」など。")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Bar */}
      <motion.div 
        initial={{ y: 100 }} 
        animate={{ y: 0 }} 
        transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-[var(--border-color)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex justify-center"
      >
        <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-black text-[var(--primary-color)] text-xl">{poolSize} {t("words selected", "単語選択済み")}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300 font-bold">
              {questionCount === -1 ? t("All", "すべて") : questionCount} Qs • {timeLimit/1000}s • {optionCount} {t("Options", "択")} • {gameMode === 'individual' ? t("Solo", "ソロ") : t("Teams", "チーム")}
            </span>
          </div>
          <button 
            onClick={handleCreateRoom}
            disabled={isCreating || poolSize < 5 || prompts.size === 0 || options.size === 0}
            className="w-full md:w-auto px-12 py-4 text-2xl font-black rounded-2xl text-white bg-[var(--primary-color)] shadow-[0_8px_30px_rgba(var(--primary-rgb),0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {isCreating ? t("Creating...", "作成中...") : t("Create Room", "ルームを作成")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default QuizHostSetup;
