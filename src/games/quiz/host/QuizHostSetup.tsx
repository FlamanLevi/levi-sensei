import React, { useState } from 'react';
import { useClassroom } from '@/context/ClassroomContext';
import { useVocabulary, VocabularyScope } from '@/context/VocabularyContext';
import { 
  QuizHostSettings, 
  QuizScope,
  QuizSubject,
  PromptType, 
  DeliveryStream, 
  IpadDisplayMode,
  AwardCategoryToggles,
  GameMode,
  TeamAssignmentMode,
  GamePlayType,
  RecallDelaySeconds,
  SprintModeType,
  SprintSettings,
  TugOfWarSettings,
  TugOfWarMatchFormat,
  VolleyballSettings,
  DistractorEliminationMode,
  TeamId,
  TEAM_PRESETS,
  RAINBOW_TEAM_ORDER,
  AVAILABLE_TEAMS,
  ChoiceImageMode,
  EnglishReadingAid
} from '../types';
import {
  MathGrade,
  MathDomain,
  MATH_GRADES,
  MATH_DOMAINS
} from '../mathTypes';
import { getTopicsForGrade } from '../mathGenerator';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Sparkles, 
  Clock, 
  Play, 
  HelpCircle, 
  Volume2, 
  Image as ImageIcon,
  Calculator, 
  BookOpen, 
  Tablet, 
  Tv, 
  Eye, 
  Layers, 
  Award, 
  Flame, 
  Heart, 
  Shield, 
  Smile,
  Users,
  User,
  Shuffle,
  Palette,
  Zap,
  Flag,
  Timer,
  EyeOff,
  Music,
  Check,
  Languages,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { getSoundPack } from '@/utils/soundPacks';
import { BgmSelectorModal } from '@/components/common/BgmSelectorModal';
import { SCHOOL_CONFIGS, getSuggestedClassForSchedule } from '@/types/roster';
import { SuzukaTrackThemeSelection, TRACK_THEME_LIST } from '@/games/suzuka_grand_prix/trackThemes';

interface QuizHostSetupProps {
  onStart: (settings: QuizHostSettings) => void;
  onCancel: () => void;
  isStudentHost?: boolean;
  initialSettings?: QuizHostSettings | null;
}

export const QuizHostSetup: React.FC<QuizHostSetupProps> = ({
  onStart,
  onCancel,
  isStudentHost = false,
  initialSettings = null
}) => {
  const { t, language } = useLanguage();
  const { 
    activeGrade, 
    activeUnit, 
    activeCategory, 
    activeSchool, 
    activeClassId, 
    setActiveClassId,
    selectedUnits: globalSelectedUnits,
    openUnitModal
  } = useClassroom();
  const { filteredWords, gradeWords, getWordsForScope, getWordsForUnits, availableUnits, ensureCluesLoaded } = useVocabulary();

  React.useEffect(() => {
    ensureCluesLoaded();
  }, [ensureCluesLoaded]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() =>
    initialSettings?.classId || activeClassId
  );
  const [classGradeTab, setClassGradeTab] = useState<string>(() => {
    const cid = initialSettings?.classId || activeClassId;
    if (cid && cid.includes('-')) {
      return cid.split('-')[0];
    }
    return activeGrade.replace('ES_G', '');
  });

  const prevActiveClassIdRef = React.useRef(activeClassId);
  React.useEffect(() => {
    if (prevActiveClassIdRef.current !== activeClassId) {
      prevActiveClassIdRef.current = activeClassId;
      setSelectedClassId(activeClassId);
      if (activeClassId && activeClassId.includes('-')) {
        setClassGradeTab(activeClassId.split('-')[0]);
      }
    }
  }, [activeClassId]);

  const scheduleSuggestion = getSuggestedClassForSchedule(activeSchool);
  const suggestedClass = scheduleSuggestion?.classId || null;
  const isMismatchWithTimetable = Boolean(suggestedClass && suggestedClass !== selectedClassId);

  const gradeDigit = activeGrade.replace('ES_G', '');
  const availableClassesForGrade = (SCHOOL_CONFIGS[activeSchool]?.classes || []).filter(c => c.startsWith(`${classGradeTab}-`));

  const [deliveryStream, setDeliveryStream] = useState<DeliveryStream>(
    () => initialSettings?.deliveryStream || 'STREAM_B_MULTIPLAYER'
  );
  const [gamePlayType, setGamePlayType] = useState<GamePlayType>(
    () => initialSettings?.gamePlayType || 'KAHOOT'
  );
  const [gameMode, setGameMode] = useState<GameMode>(
    () => initialSettings?.gameMode || 'INDIVIDUAL'
  );
  const [teamAssignment, setTeamAssignment] = useState<TeamAssignmentMode>(
    () => initialSettings?.teamAssignment || 'AUTO_BALANCE'
  );
  const [selectedTeams, setSelectedTeams] = useState<TeamId[]>(
    () => (initialSettings?.activeTeams?.length ? initialSettings.activeTeams : ['team_red', 'team_white'])
  );
  const activeTeams = selectedTeams;
  const teamCount = selectedTeams.length;

  const toggleTeam = (tId: TeamId) => {
    if (selectedTeams.includes(tId)) {
      if (selectedTeams.length <= 2) return;
      setSelectedTeams(prev => prev.filter(id => id !== tId));
    } else {
      if (selectedTeams.length >= 6) return;
      const newTeams = [...selectedTeams, tId];
      newTeams.sort((a, b) => AVAILABLE_TEAMS.indexOf(a) - AVAILABLE_TEAMS.indexOf(b));
      setSelectedTeams(newTeams);
    }
  };
  const [ipadDisplayMode, setIpadDisplayMode] = useState<IpadDisplayMode>(
    () => initialSettings?.ipadDisplayMode || 'EYES_UP'
  );
  const [bgm, setBgm] = useState<string>(() => initialSettings?.bgm || 'all_stars');
  const [isBgmModalOpen, setIsBgmModalOpen] = useState<boolean>(false);
  
  // Subject toggle: ENGLISH vs MATH (Keisan Arena)
  const [subject, setSubject] = useState<QuizSubject>(() => initialSettings?.subject || 'ENGLISH');
  const [mathGrade, setMathGrade] = useState<MathGrade>(() => {
    if (initialSettings?.mathGrade) return initialSettings.mathGrade;
    if (activeGrade === 'ES_G1') return 'G1';
    if (activeGrade === 'ES_G2') return 'G2';
    if (activeGrade === 'ES_G3') return 'G3';
    if (activeGrade === 'ES_G4') return 'G4';
    if (activeGrade === 'ES_G5') return 'G5';
    if (activeGrade === 'ES_G6') return 'G6';
    return 'G3';
  });
  const [mathDomain, setMathDomain] = useState<MathDomain>(() => initialSettings?.mathDomain || 'ALL');
  const [selectedMathTopic, setSelectedMathTopic] = useState<string>(() => initialSettings?.mathTopicId || '');

  const initialScope: VocabularyScope =
    initialSettings?.vocabularyScope === 'GRADE_ALL' ||
    initialSettings?.vocabularyScope === 'PRIOR_REVIEW' ||
    initialSettings?.vocabularyScope === 'ALL_ELEMENTARY'
      ? initialSettings.vocabularyScope
      : 'CURRENT';
  const [selectedScope, setSelectedScope] = useState<VocabularyScope>(initialScope);
  const [isExtendedScopesOpen, setIsExtendedScopesOpen] = useState<boolean>(initialScope !== 'CURRENT');
  
  // Classic Kahoot pacing state
  const [questionCount, setQuestionCount] = useState<number>(() => initialSettings?.questionCount ?? 10);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(() => initialSettings?.timeLimitSeconds ?? 10);

  // 3D Suzuka Grand Prix state
  const [sprintMode, setSprintMode] = useState<SprintModeType>(
    () => initialSettings?.sprintSettings?.sprintMode || 'LAP_RACE'
  );
  const [sprintTimeLimitSeconds, setSprintTimeLimitSeconds] = useState<number>(
    () => initialSettings?.sprintSettings?.timeLimitSeconds ?? 60
  );
  const [sprintGraceSeconds, setSprintGraceSeconds] = useState<number>(
    () => initialSettings?.sprintSettings?.graceCountdownSeconds ?? 15
  );
  const [targetLaps3D, setTargetLaps3D] = useState<number>(
    () => initialSettings?.sprintSettings?.targetLaps3D ?? 1
  );
  const [trackThemeSelection, setTrackThemeSelection] = useState<SuzukaTrackThemeSelection>(
    () => initialSettings?.sprintSettings?.trackThemeSelection ?? 'RANDOM'
  );
  const [wrongSpeedLossRatio, setWrongSpeedLossRatio] = useState<number>(
    () => initialSettings?.sprintSettings?.wrongSpeedLossRatio ?? 0.33
  );
  const [wrongLockoutSeconds, setWrongLockoutSeconds] = useState<number>(
    () => initialSettings?.sprintSettings?.wrongLockoutSeconds ?? 2.5
  );

  // Tug of War state
  const [tugOfWarTimeLimit, setTugOfWarTimeLimit] = useState<number>(
    () => initialSettings?.tugOfWarSettings?.timeLimitSeconds ?? 60
  );
  const [tugOfWarMatchFormat, setTugOfWarMatchFormat] = useState<TugOfWarMatchFormat>(
    () => initialSettings?.tugOfWarSettings?.matchFormat || 'SINGLE'
  );
  const [tugOfWarSensitivity, setTugOfWarSensitivity] = useState<number>(
    () => initialSettings?.tugOfWarSettings?.pullSensitivity ?? 20
  );

  // Undokai Bean Bag Toss (Tamaire) state
  const [volleyballTimeLimit, setVolleyballTimeLimit] = useState<number>(
    () => initialSettings?.volleyballSettings?.timeLimitSeconds ?? 60
  );
  const [tamaireMysteryCount, setTamaireMysteryCount] = useState<boolean>(
    () => initialSettings?.volleyballSettings?.hideScoreUntilEnd ?? true
  );

  // Question mechanics & hint toggles (Mutually exclusive: Gradual default ON, Recall delay default OFF)
  const [recallDelaySeconds, setRecallDelaySeconds] = useState<RecallDelaySeconds>(
    () => initialSettings?.recallDelaySeconds ?? 0
  );
  const [eliminateDistractors, setEliminateDistractors] = useState<boolean>(
    () => initialSettings?.eliminateDistractors ?? true
  );
  const [distractorEliminationMode, setDistractorEliminationMode] = useState<DistractorEliminationMode>(
    () => initialSettings?.distractorEliminationMode ?? (initialSettings?.eliminateDistractors === false ? 'OFF' : 'GRADUAL')
  );

  // Turn Audio Listening OFF by default per user request
  const [promptTypes, setPromptTypes] = useState<PromptType[]>(
    () => (initialSettings?.promptTypes?.length ? initialSettings.promptTypes : ['JA_MEANING', 'EN_TO_JA', 'IMAGE_ONLY'])
  );
  const [choiceImageMode, setChoiceImageMode] = useState<ChoiceImageMode>(
    () => initialSettings?.choiceImageMode || 'AUTO_CLEVER'
  );
  const [englishReadingAid, setEnglishReadingAid] = useState<EnglishReadingAid>(
    () => initialSettings?.englishReadingAid || 'SPELLING_ONLY'
  );
  const [recordRoster, setRecordRoster] = useState<boolean>(
    () => initialSettings?.recordRoster ?? true
  );

  // Visual cheat prevention: choice images locked if prompts are only EN_TO_JA or IMAGE_ONLY
  const isChoiceImageLocked = promptTypes.length > 0 && promptTypes.every(p => p === 'IMAGE_ONLY' || p === 'EN_TO_JA');

  // Auto-switch choice image mode to TEXT_ONLY if prompt varieties lock it out
  React.useEffect(() => {
    if (isChoiceImageLocked && choiceImageMode !== 'TEXT_ONLY') {
      setChoiceImageMode('TEXT_ONLY');
    }
  }, [isChoiceImageLocked, choiceImageMode]);

  const [awardToggles, setAwardToggles] = useState<AwardCategoryToggles>(
    () => initialSettings?.awardToggles || {
      effortGrowth: true,
      skillChallenge: true,
      funSurprise: true
    }
  );

  const hasPriorReview = ['ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade);
  const hasGrandSlam = ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade);

  const cleanUnitLabel = (u: string) => {
    return u.replace(/^Unit\s+(\d+):\s+Unit\s+\1:\s*/i, 'Unit $1: ');
  };

  const wordsInPool = React.useMemo(() => {
    return getWordsForScope(selectedScope);
  }, [selectedScope, getWordsForScope]);

  // Auto-adjust standard question count if available words in pool drop below current setting
  React.useEffect(() => {
    if (subject === 'ENGLISH' && wordsInPool.length > 0) {
      setQuestionCount(prev => (prev !== -1 && prev > wordsInPool.length ? ([20, 15, 10, 5].find(n => n <= wordsInPool.length) || -1) : prev));
    }
  }, [subject, wordsInPool.length]);

  const scopeCounts = {
    CURRENT: getWordsForScope('CURRENT').length,
    GRADE_ALL: getWordsForScope('GRADE_ALL').length,
    PRIOR_REVIEW: hasPriorReview ? getWordsForScope('PRIOR_REVIEW').length : 0,
    ALL_ELEMENTARY: hasGrandSlam ? getWordsForScope('ALL_ELEMENTARY').length : 0
  };

  const getPriorReviewTitle = () => {
    if (activeGrade === 'ES_G6') return language === 'ja' ? '小3〜小5 復習' : 'G3–G5 Review';
    if (activeGrade === 'ES_G5') return language === 'ja' ? '小3〜小4 復習' : 'G3–G4 Review';
    if (activeGrade === 'ES_G4') return language === 'ja' ? '小3 復習' : 'G3 Review';
    return language === 'ja' ? '小学校 復習' : 'Elementary Review';
  };

  const togglePromptType = (type: PromptType) => {
    if (promptTypes.includes(type)) {
      if (promptTypes.length > 1) {
        setPromptTypes(promptTypes.filter(p => p !== type));
      }
    } else {
      setPromptTypes([...promptTypes, type]);
    }
  };

  const handleRecallDelayChange = (sec: RecallDelaySeconds) => {
    setRecallDelaySeconds(sec);
    if (sec > 0) {
      setDistractorEliminationMode('OFF');
      setEliminateDistractors(false);
    }
  };

  const handleDistractorModeChange = (mode: DistractorEliminationMode) => {
    setDistractorEliminationMode(mode);
    setEliminateDistractors(mode !== 'OFF');
    if (mode !== 'OFF') {
      setRecallDelaySeconds(0);
    }
  };

  const handleLaunch = () => {
    const is3DRace = gamePlayType === 'GRAND_PRIX_3D';
    const sprintSettings: SprintSettings | undefined = is3DRace ? {
      sprintMode,
      lapCount: targetLaps3D || 1,
      timeLimitSeconds: sprintTimeLimitSeconds,
      graceCountdownSeconds: sprintGraceSeconds,
      targetLaps3D: targetLaps3D || 1,
      trackThemeSelection,
      ...(trackThemeSelection === 'RANDOM' &&
      initialSettings?.sprintSettings?.trackThemeSelection === 'RANDOM' &&
      initialSettings?.sprintSettings?.trackTheme
        ? { trackTheme: initialSettings.sprintSettings.trackTheme }
        : {}),
      wrongSpeedLossRatio,
      wrongLockoutSeconds,
    } : undefined;

    const tugOfWarSettings: TugOfWarSettings | undefined = gamePlayType === 'TUG_OF_WAR' ? {
      timeLimitSeconds: tugOfWarTimeLimit,
      pullSensitivity: tugOfWarSensitivity,
      mudLockoutSeconds: 2.5,
      matchFormat: tugOfWarMatchFormat
    } : undefined;

    const volleyballSettings: VolleyballSettings | undefined = gamePlayType === 'VOLLEYBALL' ? {
      timeLimitSeconds: volleyballTimeLimit,
      gameStyle: 'TEAM_VS',
      targetRallies: 100,
      missLockoutSeconds: 2.5,
      hideScoreUntilEnd: tamaireMysteryCount,
    } : undefined;

    const actualQCount = (gamePlayType === 'GRAND_PRIX_3D' || gamePlayType === 'TUG_OF_WAR' || gamePlayType === 'VOLLEYBALL')
      ? (subject === 'MATH' ? 60 : Math.min(60, Math.max(wordsInPool.length, 30)))
      : (subject === 'MATH'
          ? (questionCount === -1 ? 40 : questionCount)
          : (questionCount === -1 ? wordsInPool.length : Math.min(questionCount, wordsInPool.length)));

    onStart({
      subject,
      mathGrade: subject === 'MATH' ? mathGrade : undefined,
      mathDomain: subject === 'MATH' ? mathDomain : undefined,
      mathTopicId: (subject === 'MATH' && selectedMathTopic) ? selectedMathTopic : undefined,
      questionCount: actualQCount,
      timeLimitSeconds: is3DRace ? sprintTimeLimitSeconds : (gamePlayType === 'TUG_OF_WAR' ? tugOfWarTimeLimit : (gamePlayType === 'VOLLEYBALL' ? volleyballTimeLimit : timeLimitSeconds)),
      gameMode: (gamePlayType === 'TUG_OF_WAR' || gamePlayType === 'VOLLEYBALL') ? 'TEAM' : gameMode,
      teamAssignment: (gameMode === 'TEAM' || gamePlayType === 'TUG_OF_WAR' || gamePlayType === 'VOLLEYBALL') ? teamAssignment : undefined,
      teamCount: (gamePlayType === 'TUG_OF_WAR' || gamePlayType === 'VOLLEYBALL') ? 2 : (gameMode === 'TEAM' ? teamCount : undefined),
      activeTeams: (gamePlayType === 'TUG_OF_WAR' || gamePlayType === 'VOLLEYBALL') ? ['team_red', 'team_white'] : (gameMode === 'TEAM' ? activeTeams : undefined),
      deliveryStream: (is3DRace || gamePlayType === 'TUG_OF_WAR' || gamePlayType === 'VOLLEYBALL') ? 'STREAM_B_MULTIPLAYER' : deliveryStream,
      ipadDisplayMode,
      promptTypes: subject === 'MATH' ? ['JA_MEANING'] : promptTypes,
      awardToggles,
      schoolId: activeSchool,
      classId: (selectedClassId === 'TEST' || !recordRoster) ? 'TEST' : selectedClassId,
      recordRoster: isStudentHost || selectedClassId === 'TEST' || !recordRoster ? false : recordRoster,
      isStudentHost: !!isStudentHost,
      isTestGame: selectedClassId === 'TEST' || !recordRoster,
      gamePlayType,
      recallDelaySeconds: subject === 'MATH' ? 0 : recallDelaySeconds,
      eliminateDistractors: distractorEliminationMode !== 'OFF',
      distractorEliminationMode,
      sprintSettings,
      tugOfWarSettings,
      volleyballSettings,
      bgm,
      vocabularyScope: subject === 'MATH' ? undefined : selectedScope,
      selectedUnits: subject === 'MATH' ? undefined : (globalSelectedUnits.length > 0 ? globalSelectedUnits : (activeUnit !== 'ALL' ? [activeUnit] : undefined)),
      customWordPool: subject === 'MATH' ? undefined : wordsInPool,
      choiceImageMode: subject === 'MATH' ? 'TEXT_ONLY' : choiceImageMode,
      englishReadingAid: subject === 'MATH' ? 'SPELLING_ONLY' : englishReadingAid
    });
  };

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto my-2 sm:my-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-8 lg:p-10 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl ${
            subject === 'MATH'
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
              : 'bg-gradient-to-tr from-amber-400 to-orange-500'
          } flex items-center justify-center shadow-lg text-white font-black text-2xl shrink-0 transition-colors`}>
            {subject === 'MATH' ? '📐' : '🏆'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-nowrap min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate min-w-0">
                {subject === 'MATH' ? t('Keisan Arena', 'けいさんアリーナ') : t('Eigo Arena', 'ライブ4択バトル')}
              </h2>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                subject === 'MATH'
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                  : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
              }`}>
                {subject === 'MATH' ? t('Elementary Math Battle (MEXT)', '小学校 算数バトル (指導要領準拠)') : t('Live 4-Choice Battle', 'ライブ4択バトル')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {subject === 'MATH'
                ? t('Infinite procedural math problems across all 6 grades and MEXT domains.', '全6学年・4領域を網羅した自動生成算数バトル。')
                : (isStudentHost 
                    ? t('Set up a game for your tablemates and friends!', '班の友だちと遊ぶゲームを設定しよう！')
                    : t('Configure your classroom live quiz game.', 'クラスのライブクイズゲームを設定してください。'))}
            </p>
          </div>
        </div>
        {isStudentHost ? (
          <div className="text-left sm:text-right shrink-0 bg-teal-50 dark:bg-teal-950/60 px-3.5 py-2 rounded-2xl border border-teal-200 dark:border-teal-800">
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 block uppercase tracking-wider">
              {t('Table Leader Game', '班のリーダー対戦')}
            </span>
            <span className="text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300">
              👑 Stream 🅲 • {activeGrade} {globalSelectedUnits.length > 1 ? `(📦 ${globalSelectedUnits.length} Units)` : activeUnit !== 'ALL' ? `(${cleanUnitLabel(activeUnit)})` : ''}
            </span>
          </div>
        ) : (
          <div className="text-left sm:text-right shrink-0 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{t('Active Classroom', '選択中のクラス')}</span>
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
              {activeSchool === 'toyogaoka' ? (language === 'ja' ? '豊ヶ丘小' : 'Toyogaoka') : (language === 'ja' ? '二子玉小' : 'Futakotamagawa')} {selectedClassId} • {activeGrade} {globalSelectedUnits.length > 1 ? `(📦 ${globalSelectedUnits.length} Units)` : activeUnit !== 'ALL' ? `(${cleanUnitLabel(activeUnit)})` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Active Class & Roster Record Card */}
        {!isStudentHost && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{selectedClassId === 'TEST' || !recordRoster ? '🧪' : '🏫'}</span>
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                  <span>{activeSchool === 'toyogaoka' ? (language === 'ja' ? '豊ヶ丘小学校' : 'Toyogaoka Elementary') : (language === 'ja' ? '二子玉川小学校' : 'Futakotamagawa Elementary')}</span>
                  <span className="text-slate-400 font-normal">|</span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('Target Roster:', '記録先クラス:')}</span>
                  <span className={`px-2 py-0.5 rounded-md text-white font-black text-[11px] ${
                    selectedClassId === 'TEST' || !recordRoster ? 'bg-purple-600' : 'bg-indigo-600'
                  }`}>
                    {selectedClassId === 'TEST' || !recordRoster ? t('🧪 TEST (PIN: 9xxx)', '🧪 お試しテスト (9xxx)') : selectedClassId}
                  </span>
                  {selectedClassId !== 'TEST' && recordRoster && selectedClassId.split('-')[0] !== gradeDigit && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      {language === 'ja' ? `出題: ${activeGrade} 単元` : `Deck: ${activeGrade}`}
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {selectedClassId === 'TEST' || !recordRoster
                    ? t('Test Mode: Room PIN is 9xxx. Scores & roster are NOT saved.', 'お試しテストモード: PINは9xxxになります。クラス記録やXPは保存されません。')
                    : (recordRoster ? t('Student XP & attendance sync is ENABLED (Roster Sync ON)', '生徒のXP・出席番号のセーブが有効です') : t('Guest / Practice Mode (Scores not saved)', 'お試しモード・スコアは記録されません'))}
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 self-start sm:self-auto">
              <input
                type="checkbox"
                checked={recordRoster && selectedClassId !== 'TEST'}
                onChange={(e) => {
                  const shouldRecord = e.target.checked;
                  setRecordRoster(shouldRecord);
                  if (shouldRecord && selectedClassId === 'TEST') {
                    setSelectedClassId(availableClassesForGrade[0] || activeClassId || '2-3');
                  }
                }}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
              />
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                {t('Save Attendance & XP', '出席番号・XPを記録')}
              </span>
            </label>
          </div>

          {/* 1-Tap Class Selection with Grade Tabs */}
          <div className="flex flex-col gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
            {/* Grade Tabs (1-6) */}
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 mr-1 flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span className="text-sm">🏫</span>
                {language === 'ja' ? (
                  <ruby>学年<rt>がくねん</rt></ruby>
                ) : (
                  'Grade:'
                )}
              </span>
              {['1', '2', '3', '4', '5', '6'].map(gNum => {
                const isTabActive = classGradeTab === gNum;
                const hasSelectedClass = selectedClassId.startsWith(`${gNum}-`);
                return (
                  <button
                    key={gNum}
                    type="button"
                    onClick={() => setClassGradeTab(gNum)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                      isTabActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : hasSelectedClass
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{gNum}{language === 'ja' ? '年' : 'G'}</span>
                    {hasSelectedClass && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                  </button>
                );
              })}
            </div>

            {/* Class Buttons for Active Grade Tab */}
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 mr-1 shrink-0 whitespace-nowrap">
                {language === 'ja' ? (
                  <><ruby>{classGradeTab}年<rt>ねん</rt></ruby>クラス<ruby>選択<rt>せんたく</rt></ruby>:</>
                ) : (
                  `G${classGradeTab} Classes:`
                )}
              </span>
              {availableClassesForGrade.map(cId => {
                const isSelected = selectedClassId === cId && recordRoster;
                const isSuggested = suggestedClass === cId;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => {
                      setSelectedClassId(cId);
                      setRecordRoster(true);
                      if (cId.startsWith(`${gradeDigit}-`)) {
                        setActiveClassId(cId);
                      }
                    }}
                    className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400 dark:ring-indigo-500 scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{cId}</span>
                    {isSuggested && (
                      <span className={`text-[9px] px-1 py-0.5 rounded font-black ${
                        isSelected 
                          ? 'bg-amber-400 text-slate-950' 
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      }`}>
                        🔔 {scheduleSuggestion?.period.period}{language === 'ja' ? '校時' : 'P'}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Dedicated Test Game Pill (PIN 9xxx, unrecorded) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedClassId('TEST');
                  setRecordRoster(false);
                }}
                className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap ${
                  selectedClassId === 'TEST' || !recordRoster
                    ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400 dark:ring-purple-500 scale-105'
                    : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800'
                }`}
                title={t('Test game (Room PIN 9xxx, unrecorded)', 'お試しテスト (PIN: 9xxx、記録なし)')}
              >
                <span>🧪</span>
                <span>{t('Test Game (9xxx)', 'お試しテスト (9xxx)')}</span>
              </button>
            </div>
          </div>

          {/* Timetable Mismatch Notice & 1-Tap Fast Switch */}
          {isMismatchWithTimetable && suggestedClass && (
            <div className="flex items-center justify-between gap-3 p-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-bold">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">🔔</span>
                <span className="truncate">
                  {language === 'ja' ? (
                    <>
                      <ruby>時間割<rt>じかんわり</rt></ruby>（{scheduleSuggestion?.period.name} {scheduleSuggestion?.period.jaName}）の<ruby>予定<rt>よてい</rt></ruby>は <strong className="text-indigo-600 dark:text-indigo-400">{suggestedClass}</strong> です。
                    </>
                  ) : (
                    <>
                      Timetable for <strong>{scheduleSuggestion?.period.name}</strong> ({scheduleSuggestion?.period.jaName}) is <strong>{suggestedClass}</strong>.
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (suggestedClass) {
                    setSelectedClassId(suggestedClass);
                    setRecordRoster(true);
                    const sugGrade = suggestedClass.split('-')[0];
                    setClassGradeTab(sugGrade);
                    if (sugGrade === gradeDigit) {
                      setActiveClassId(suggestedClass);
                    }
                  }
                }}
                className="h-7 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
              >
                <span>⚡</span>
                <span>{language === 'ja' ? `${suggestedClass} に切替` : `Switch to ${suggestedClass}`}</span>
              </button>
            </div>
          )}
        </div>
        )}

        {/* Subject Mode Switcher: English vs Mathematics */}
        <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center gap-2 border border-slate-200 dark:border-slate-700 select-none shadow-inner">
          <button
            type="button"
            onClick={() => setSubject('ENGLISH')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
              subject === 'ENGLISH'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-400/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="text-xl">🔤</span>
            <div className="flex flex-col items-start sm:items-center text-left sm:text-center min-w-0">
              <span className="truncate">{t('English (Foreign Language)', '英語・外国語 (Eigo Arena)')}</span>
              <span className="text-[10px] font-bold text-slate-400">
                {t('Textbook Units & Word Pool', '教科書単元・単語マスター')}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubject('MATH')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
              subject === 'MATH'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="text-xl">📐</span>
            <div className="flex flex-col items-start sm:items-center text-left sm:text-center min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate">{t('Mathematics (Elementary Math)', '算数 (Keisan Arena)')}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                  subject === 'MATH' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                }`}>
                  NEW • G1–G6
                </span>
              </div>
              <span className={`text-[10px] font-bold ${subject === 'MATH' ? 'text-emerald-100' : 'text-slate-400'}`}>
                {t('Limitless Procedural Math (MEXT)', '学習指導要領準拠・無制限自動生成')}
              </span>
            </div>
          </button>
        </div>

        {/* MATHEMATICS MODE: MEXT Grade & Curriculum Configurator */}
        {subject === 'MATH' && (
          <div className="space-y-4 p-4 sm:p-6 rounded-3xl bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800/60 shadow-sm animate-in fade-in duration-200">
            {/* 1. Grade Selector (G1 - G6) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm">🏫</span>
                  <span>{t('1. Elementary Grade Level', '1. 対象学年（小学校 1年〜6年）')}</span>
                </label>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  {MATH_GRADES[mathGrade]?.labelJa} ({MATH_GRADES[mathGrade]?.labelEn})
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(['G1', 'G2', 'G3', 'G4', 'G5', 'G6'] as MathGrade[]).map((g) => {
                  const meta = MATH_GRADES[g];
                  const isSelected = mathGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setMathGrade(g);
                        setSelectedMathTopic('');
                      }}
                      className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 scale-[1.02]'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-sm font-black flex items-center gap-1">
                        <span>{meta.badge}</span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          ({meta.labelEn})
                        </span>
                      </span>
                      <span className={`text-[10px] font-bold line-clamp-1 ${isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {language === 'ja' ? meta.labelJa : meta.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Grade Summary Banner */}
              <div className="mt-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2.5 shadow-2xs">
                <span className="text-base shrink-0 mt-0.5">💡</span>
                <div>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 mr-2">
                    {MATH_GRADES[mathGrade]?.badge} {language === 'ja' ? '学習到達目標:' : 'Curriculum Focus:'}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {language === 'ja' ? MATH_GRADES[mathGrade]?.summaryJa : MATH_GRADES[mathGrade]?.summaryEn}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. MEXT Domain Selector */}
            <div>
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                {t('2. Course of Study Domain', '2. 指導要領 領域')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['ALL', 'NUMBERS_CALC', 'QUANTITIES_MEASUREMENT', 'GEOMETRIC_FIGURES', 'MATHEMATICAL_RELATIONS'] as MathDomain[]).map((d) => {
                  const meta = MATH_DOMAINS[d];
                  const isSelected = mathDomain === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setMathDomain(d);
                        setSelectedMathTopic('');
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black truncate">{language === 'ja' ? meta.nameJa : meta.nameEn}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-white text-emerald-800' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                        } shrink-0`}>
                          {meta.mextLetter}
                        </span>
                      </div>
                      <span className={`text-[10px] line-clamp-1 leading-tight ${isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {language === 'ja' ? meta.descriptionJa : meta.descriptionEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Specific Topic Drill-Down */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>{t('3. Topic Focus (Optional)', '3. 単元・トピック集中特訓（任意）')}</span>
                </label>
                {selectedMathTopic && (
                  <button
                    type="button"
                    onClick={() => setSelectedMathTopic('')}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    {t('Reset to All Topics', '全トピックからランダムに戻す')}
                  </button>
                )}
              </div>

              {(() => {
                const availableTopics = getTopicsForGrade(mathGrade, mathDomain);
                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedMathTopic('')}
                      className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        !selectedMathTopic
                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/50'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>🎲</span>
                      <span>{t('All Topics Mixed', '全トピックからバランス出題')}</span>
                      <span className="text-[10px] opacity-80">({availableTopics.length})</span>
                    </button>

                    {availableTopics.map(tItem => {
                      const isChosen = selectedMathTopic === tItem.id;
                      return (
                        <button
                          key={tItem.id}
                          type="button"
                          onClick={() => setSelectedMathTopic(tItem.id)}
                          className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isChosen
                              ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400/50'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{language === 'ja' ? tItem.titleJa : tItem.titleEn}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* MEXT Quality & Pedagogical Distractor Guarantee */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-100/80 to-teal-100/80 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300/80 dark:border-emerald-800 text-xs font-medium text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">✨</span>
                <div className="min-w-0">
                  <span className="font-black text-emerald-900 dark:text-emerald-100 block mb-0.5">
                    {t('Limitless Procedural Math & Pedagogical Distractor Engine', '文部科学省 学習指導要領 算数科 準拠・無限自動生成')}
                  </span>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">
                    {t('Pure algorithmic math questions with authentic error traps (careless carry/borrow, operator precedence, fraction denominators). Zero JSON file bloat.', '計算の順序、通分の誤り、四捨五入、単位換算などのリアルな誤答パターン（ひっかけ）を自動合成。静的ファイル不要で何問でも生成可能。')}
                  </span>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-600 text-white shrink-0 shadow-xs">
                {questionCount === -1 ? t('Endless Sprint Laps', 'エンドレス') : `${questionCount} ${t('Questions', '問')}`}
              </span>
            </div>
          </div>
        )}

        {/* ENGLISH MODE: Vocabulary Scope Section */}
        {subject === 'ENGLISH' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} className="text-indigo-500" />
              <span>{t('Vocabulary Scope', '出題範囲・単語プール')}</span>
            </label>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 shadow-xs">
              {wordsInPool.length} {t('Words Selected', '語 選択中')}
            </span>
          </div>

          {/* PRIMARY HERO: Today's Lesson Units */}
          <div
            onClick={() => setSelectedScope('CURRENT')}
            className={`p-4 sm:p-5 rounded-3xl border-3 transition-all cursor-pointer select-none relative mb-3 ${
              selectedScope === 'CURRENT'
                ? 'border-indigo-500 bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-indigo-50/90 dark:from-indigo-950/60 dark:via-blue-950/40 dark:to-indigo-950/60 shadow-md ring-2 ring-indigo-400/40'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[11px] tracking-wide">
                    {t("★ Primary / Today's Lesson", "★ 本日の学習単元")}
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                    {globalSelectedUnits.length > 1
                      ? `📦 ${globalSelectedUnits.length} ${t('Units Bundled', '単元バンドル')}`
                      : activeUnit !== 'ALL'
                      ? cleanUnitLabel(activeUnit)
                      : (activeCategory !== 'ALL' ? activeCategory : t('Today’s Lesson Units', '本日の単元'))}
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {scopeCounts.CURRENT} {t('words', '語')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {globalSelectedUnits.length > 1
                    ? t('Active multi-unit bundle from Hub for targeted classroom practice.', 'ホーム画面で選択中の複数単元バンドルから出題されます。')
                    : t('Active textbook unit for today’s class. Tap "Change Units" to switch or bundle.', '本日の授業で学習中の教科書単元です。別の単元とまとめたい場合は右のボタンから選択。')}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openUnitModal();
                }}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>✏️</span>
                <span>{t('Change / Bundle Units', '単元を変更・追加')}</span>
              </button>
            </div>
          </div>

          {/* SECONDARY REVIEW & EXTENDED SCOPES: Collapsible Disclosure */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsExtendedScopesOpen(!isExtendedScopesOpen)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>📚</span>
                <span>{t('Other Scopes & Full Grade Review (All Units, Prior Review, Grand Slam)', 'その他の出題範囲・全単元総復習（学年全単元・過去学年・全単語）')}</span>
                {selectedScope !== 'CURRENT' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-black">
                    {selectedScope === 'GRADE_ALL' ? t('Grade All', '全単元') : selectedScope === 'PRIOR_REVIEW' ? t('Prior Review', '過去学年') : t('Grand Slam', '全単語')}
                  </span>
                )}
              </div>
              {isExtendedScopesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isExtendedScopesOpen && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-150">
                {/* Scope 2: Entire Grade */}
                <div
                  onClick={() => setSelectedScope('GRADE_ALL')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none ${
                    selectedScope === 'GRADE_ALL'
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <span className="text-xs font-black leading-tight break-words flex-1">
                        {t(`All ${activeGrade}`, `${activeGrade} 全単元`)}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shrink-0">
                        {scopeCounts.GRADE_ALL} {t('words', '語')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {t(`All vocabulary words across all units of ${activeGrade}`, `${activeGrade}の全単元から幅広く出題`)}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {t('📖 Grade All Units', '📖 学年全単元')}
                    </span>
                  </div>
                </div>

                {/* Scope 3: Prior Review */}
                {hasPriorReview && (
                  <div
                    onClick={() => setSelectedScope('PRIOR_REVIEW')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none ${
                      selectedScope === 'PRIOR_REVIEW'
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-sm ring-1 ring-amber-400/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <span className="text-xs font-black leading-tight break-words flex-1">
                          {getPriorReviewTitle()}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 shrink-0">
                          {scopeCounts.PRIOR_REVIEW} {t('words', '語')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {t('Review core vocabulary from earlier elementary school years', '過去学年で習った単語の総復習')}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {t('⏪ Prior Years Review', '⏪ 過去学年の復習')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Scope 4: All Elementary Grand Slam */}
                {hasGrandSlam && (
                  <div
                    onClick={() => setSelectedScope('ALL_ELEMENTARY')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer select-none ${
                      selectedScope === 'ALL_ELEMENTARY'
                        ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-sm ring-1 ring-purple-400/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <span className="text-xs font-black leading-tight break-words flex-1">
                          {t('Elementary Grand Slam', '小学校 全単語')}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 shrink-0">
                          {scopeCounts.ALL_ELEMENTARY} {t('words', '語')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {t('Massive cumulative elementary challenge (G3–G6)', '小学校で習う全単語の総まとめバトル')}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        {t('🌟 Grand Slam Mega Quiz', '🌟 全単語マスター')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {wordsInPool.length < 4 && (
            <div className="mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{t('Minimum 4 words required for quiz questions. Please select a broader scope or bundle more units.', '4択クイズ生成には最低4単語が必要です。単元を追加するか、別の範囲を選択してください。')}</span>
            </div>
          )}
        </div>
        )}

        {/* 1. Delivery Mode (Stream A Front-Screen vs Stream B iPad Multiplayer) */}
        {!isStudentHost && (
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
              {t('1. Classroom Play Mode', '1. プレイ形式')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryStream('STREAM_B_MULTIPLAYER')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 ${
                  deliveryStream === 'STREAM_B_MULTIPLAYER'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-md ring-2 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${deliveryStream === 'STREAM_B_MULTIPLAYER' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Tablet size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black block">{t('Live iPad Multiplayer (Stream 🅱️)', 'iPad対戦モード (Stream 🅱️)')}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{t('Default', '定番')}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block mt-1">
                    {t('Students join with 4-digit PIN on 1:1 school iPads. Live podium & real-time sync.', '1人1台のiPadから4桁PINで参加。リアルタイム表彰台と連動。')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryStream('STREAM_A_FRONT_SCREEN')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 ${
                  deliveryStream === 'STREAM_A_FRONT_SCREEN'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-md ring-2 ring-amber-400/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${deliveryStream === 'STREAM_A_FRONT_SCREEN' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Tv size={22} />
                </div>
                <div>
                  <span className="text-sm font-black block">{t('Front-Screen Warmup (Stream 🅰️)', 'テレビ画面ウォームアップ (Stream 🅰️)')}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block mt-1">
                    {t('Zero student iPads needed! Fast 5-minute whole-class choral drill using TV & Spacebar.', '児童のiPad不要！テレビとスペースキーで全員で声を出す5分間ドリル。')}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. Game Style / Format (Only in Multiplayer) */}
        {deliveryStream === 'STREAM_B_MULTIPLAYER' && (
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2.5">
              {t('2. Game Style', '2. ゲーム形式')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-start">
              {/* Column 1: Turn-Based / Synchronized */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-xs">⏱️</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {t('Turn-Based / Synchronized', 'ターン制・一斉シンクロ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGamePlayType('KAHOOT')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                    gamePlayType === 'KAHOOT'
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${gamePlayType === 'KAHOOT' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Tv size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black block">{t('Live Arena (Kahoot Style)', '一斉対戦 (Kahootスタイル)')}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{t('Standard', '定番')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      {t('Everyone answers each question together. TV reveals questions; iPads submit.', '全員同時に1問ずつ回答。TVで問題発表、iPadで解答するシンクロ型。')}
                    </span>
                  </div>
                </button>
              </div>

              {/* Column 2: Grand Prix Racing (3D Suzuka Grand Prix) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-xs">🏎️</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('Grand Prix Racing', 'F1 グランプリレース')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGamePlayType('GRAND_PRIX_3D')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                    gamePlayType === 'GRAND_PRIX_3D'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-400/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${gamePlayType === 'GRAND_PRIX_3D' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Flag size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black block">{t('3D Suzuka Grand Prix', '3D 鈴鹿グランプリ')}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">{t('🏎️ 3D Circuit', '🏎️ 3Dコース')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      {t('Full 3D figure-8 circuit! Build throttle speed with streaks & race on TV + iPads.', '本格3D立体交差サーキット！連続正解で加速し、TVとiPadでリアルタイム3Dレース。')}
                    </span>
                  </div>
                </button>
              </div>

              {/* Column 3: Sports Day / Undokai (Tug of War on top, Volleyball Rally below) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-xs">🚩</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {t('Sports Day / Undokai', '運動会・スポーツバトル')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGamePlayType('TUG_OF_WAR');
                    setGameMode('TEAM');
                    setSelectedTeams(['team_red', 'team_white']);
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                    gamePlayType === 'TUG_OF_WAR'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-sm ring-1 ring-amber-400/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${gamePlayType === 'TUG_OF_WAR' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Award size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black block">{t('Tug of War (綱引き)', '運動会 綱引きバトル')}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">{t('Undokai 🚩', '運動会 🚩')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      {t('Red vs White Undokai clash! Correct pulls rope; wrong answers slip in mud!', '紅組 vs 白組！正解でロープを引き寄せ、誤答は泥ですべる！')}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGamePlayType('VOLLEYBALL');
                    setGameMode('TEAM');
                    setSelectedTeams(['team_red', 'team_white']);
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-start gap-3 w-full ${
                    gamePlayType === 'VOLLEYBALL'
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-400/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${gamePlayType === 'VOLLEYBALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black block">{/* [ANTIGRAVITY REFACTOR]: Replaced Volleyball with Undokai Bean Bag Toss (Tamaire / 玉入れ) */}
                      {t('Bean Bag Toss (玉入れ)', '運動会 玉入れバトル')}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">{t('Undokai 🔴⚪', '運動会 🔴⚪')}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                      {t('Red vs White Undokai Bean Bag Toss! Rapid-fire throws + dramatic counting ceremony!', '紅組 vs 白組の運動会玉入れ！連続正解でカゴへ投げ入れ、最後はドキドキ玉かぞえ！')}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Battle Format (Individual vs Team Battle) */}
        {deliveryStream === 'STREAM_B_MULTIPLAYER' && gamePlayType !== 'TUG_OF_WAR' && gamePlayType !== 'VOLLEYBALL' && (
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
              {t('3. Battle Format', '3. 対戦形式')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <button
                type="button"
                onClick={() => setGameMode('INDIVIDUAL')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  gameMode === 'INDIVIDUAL'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${gameMode === 'INDIVIDUAL' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <User size={20} />
                </div>
                <div>
                  <span className="text-xs font-black block">{t('Individual Battle', '個人戦')}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('Everyone competes for the highest score on the podium.', '全員でスコアを競う定番の個人バトル')}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGameMode('TEAM')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  gameMode === 'TEAM'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${gameMode === 'TEAM' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Users size={20} />
                </div>
                <div>
                  <span className="text-xs font-black block">{t('Team Battle (2–6 Rainbow Teams)', 'チーム対抗戦 (2〜6色)')}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('🔴 Red ⚪ White (Default) with up to 6 rainbow teams', '🔴赤組 ⚪白組 を基本に、最大6色のチーム対戦')}
                  </span>
                </div>
              </button>
            </div>

            {/* Sub-selector for Team Battle: Team Selection & Assignment */}
            {gameMode === 'TEAM' && (
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-900/60 animate-in fade-in duration-150 space-y-4">
                {/* 1. Team Colors Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                      {t('Participating Teams (Choose 2–6 Colors)', '参加チーム（2〜6色を選択）')}
                    </span>
                    <span className="text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
                      {selectedTeams.length} {t('Teams Active', 'チーム選択中')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-2.5">
                    {AVAILABLE_TEAMS.map((tId) => {
                      const preset = TEAM_PRESETS[tId];
                      const isSelected = selectedTeams.includes(tId);
                      return (
                        <button
                          key={tId}
                          type="button"
                          onClick={() => toggleTeam(tId)}
                          className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-white dark:bg-slate-800 shadow-md ring-2 ring-blue-400 scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/50 opacity-40 hover:opacity-80'
                          }`}
                        >
                          <span className="text-2xl">{preset.emoji}</span>
                          <span className={`text-xs font-black ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                            {language === 'ja' ? preset.jaName : preset.name.replace(' Team', '')}
                          </span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {isSelected ? t('ON', '参加') : t('OFF', '不参加')}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Rainbow Color Chips Preview */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-800">
                    <span className="text-[10px] font-black text-slate-400 mr-1 uppercase">
                      {t('Active:', '参加チーム:')}
                    </span>
                    {selectedTeams.map((tId) => {
                      const preset = TEAM_PRESETS[tId];
                      const isWhiteTeam = tId === 'team_white';
                      return (
                        <span
                          key={tId}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${
                            isWhiteTeam
                              ? 'bg-white text-slate-900 border border-slate-300'
                              : `text-white ${preset.bg}`
                          } shadow-xs animate-in zoom-in-95 duration-100`}
                        >
                          <span>{preset.emoji}</span>
                          <span>{language === 'ja' ? preset.jaName : preset.name.replace(' Team', '')}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Team Assignment Method */}
                <div>
                  <span className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider block mb-2">
                    {t('Team Assignment Method', 'チーム分けの方法')}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTeamAssignment('AUTO_BALANCE')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        teamAssignment === 'AUTO_BALANCE'
                          ? 'border-blue-500 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                          : 'border-blue-200/60 dark:border-blue-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Shuffle size={16} className={teamAssignment === 'AUTO_BALANCE' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                      <div>
                        <span className="text-xs font-black block">{t('⚡ Auto-Balance', '⚡ 自動ふりわけ')}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('Automatically balances teams evenly (smoothest & recommended)', '全員を均等に自動配置（一番スムーズ・おすすめ）')}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTeamAssignment('STUDENT_CHOICE')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        teamAssignment === 'STUDENT_CHOICE'
                          ? 'border-blue-500 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                          : 'border-blue-200/60 dark:border-blue-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Palette size={16} className={teamAssignment === 'STUDENT_CHOICE' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                      <div>
                        <span className="text-xs font-black block">{t('🎨 Student Choice', '🎨 じぶんえらび')}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{t('Students choose their team on iPad (capacity lock enabled)', '児童がiPadで選択（定員「満員」ロック付き）')}</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4a. 3D Suzuka Grand Prix Configuration */}
        {gamePlayType === 'GRAND_PRIX_3D' && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50/85 to-teal-50/85 dark:from-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-300 dark:border-emerald-900/60 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏎️</span>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                    {t('3D Suzuka Grand Prix Rules', '3D 鈴鹿グランプリ レース設定')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('Cars start at 0 km/h and build throttle with correct answers! Configure race format & wrong-answer penalties below.', '0km/hからスタートし正解で加速！周回数・制限時間と誤答時の減速ペナルティを自由に調整できます。')}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-mode: Lap Race vs Time Trial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSprintMode('LAP_RACE')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${
                  sprintMode === 'LAP_RACE'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-400/40'
                    : 'border-emerald-200/60 dark:border-emerald-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${sprintMode === 'LAP_RACE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Flag size={16} />
                </div>
                <div>
                  <span className="text-xs font-black block">{t('🏁 Circuit Lap Race (First to Finish)', '🏁 サーキット周回レース')}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {t('Race a fixed number of 3D laps around Suzuka (2,567m per lap).', '鈴鹿サーキット（1周2,567m）を指定周回走破するレース。')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSprintMode('TIME_TRIAL')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${
                  sprintMode === 'TIME_TRIAL'
                    ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 shadow-sm ring-1 ring-emerald-400/40'
                    : 'border-emerald-200/60 dark:border-emerald-900/40 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${sprintMode === 'TIME_TRIAL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Timer size={16} />
                </div>
                <div>
                  <span className="text-xs font-black block">{t('⏱️ Time Trial (Distance Battle)', '⏱️ タイムアタック (走行距離バトル)')}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {t('Drive as far as possible before the countdown timer hits zero!', '制限時間内にどれだけ遠くまで走れるかを競うスプリント。')}
                  </span>
                </div>
              </button>
            </div>

            {/* Laps / Time Limit */}
            {sprintMode === 'LAP_RACE' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 block mb-1.5">
                    {t('Circuit Laps (1 Lap ≈ 60–90s)', 'サーキット周回数 (1周 約60〜90秒)')}
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[1, 2, 3, 5, 10, 20].map((laps) => (
                      <button
                        key={laps}
                        type="button"
                        onClick={() => setTargetLaps3D(laps)}
                        className={`py-2 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                          targetLaps3D === laps
                            ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                        }`}
                      >
                        {laps} {laps === 1 ? t('Lap', '周') : t('Laps', '周')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 block mb-1.5">
                    {t('Podium Grace Countdown', '上位ゴール後の猶予タイマー')}
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[15, 20, 25, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSprintGraceSeconds(sec)}
                        className={`py-2 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-1 ${
                          sprintGraceSeconds === sec
                            ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                        }`}
                      >
                        <Clock size={11} />
                        <span>{sec}s</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 block mb-1.5">
                  {t('Race Time Limit', 'レース制限時間')}
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[60, 90, 120, 180, 300, 600].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSprintTimeLimitSeconds(sec)}
                      className={`py-2.5 rounded-xl font-black text-xs border transition-all flex items-center justify-center gap-1 ${
                        sprintTimeLimitSeconds === sec
                          ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50'
                      }`}
                    >
                      <Clock size={12} />
                      <span>{sec >= 60 ? `${sec / 60}分` : `${sec}秒`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Incorrect Answer Speed Reduction & Answer Lockout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    {t('Incorrect Answer Speed Reduction', '誤答時のスピード減速率')}
                  </span>
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                    {wrongSpeedLossRatio === 0
                      ? t('No Slowdown', '減速なし')
                      : wrongSpeedLossRatio === 0.33
                      ? t('-1/3 Speed (Default)', '-1/3 減速 (標準)')
                      : wrongSpeedLossRatio === 1
                      ? t('Full Stop (-100%)', '完全停止 (-100%)')
                      : `-${Math.round(wrongSpeedLossRatio * 100)}%`}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[
                    { val: 0, label: '0%', sub: t('None', 'なし') },
                    { val: 0.25, label: '-25%', sub: '1/4' },
                    { val: 0.33, label: '-33%', sub: '1/3 ⭐' },
                    { val: 0.5, label: '-50%', sub: '1/2' },
                    { val: 0.75, label: '-75%', sub: '3/4' },
                    { val: 1.0, label: '-100%', sub: t('Stop', '停止') },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setWrongSpeedLossRatio(opt.val)}
                      className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        Math.abs(wrongSpeedLossRatio - opt.val) < 0.02
                          ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-400/40 font-black'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50 font-bold'
                      }`}
                    >
                      <span className="text-xs leading-tight">{opt.label}</span>
                      <span className="text-[9px] opacity-75 leading-tight">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    {t('Incorrect Answer Lockout', '誤答時の回答ロック時間')}
                  </span>
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                    {wrongLockoutSeconds === 0
                      ? t('0s (No Lock)', '0秒 (ロックなし)')
                      : wrongLockoutSeconds === 2.5
                      ? t('2.5s (Standard Pit Stop)', '2.5秒 (標準ピットストップ)')
                      : `${wrongLockoutSeconds}s`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { val: 2.5, label: '2.5s', sub: `⭐ ${t('Std', '標準')}` },
                    { val: 3.0, label: '3.0s', sub: '' },
                    { val: 3.5, label: '3.5s', sub: t('Firm', 'しっかり') },
                    { val: 4.0, label: '4.0s', sub: '' },
                    { val: 5.0, label: '5.0s', sub: t('Strict', '厳しめ') },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setWrongLockoutSeconds(opt.val)}
                      className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        Math.abs(wrongLockoutSeconds - opt.val) < 0.05
                          ? 'border-emerald-500 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-400/40 font-black'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white/50 font-bold'
                      }`}
                    >
                      <span className="text-xs leading-tight">{opt.label}</span>
                      {opt.sub && <span className="text-[9px] opacity-75 leading-tight">{opt.sub}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Circuit Atmosphere / Biome Selector */}
            <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>🗺️</span>
                  <span>{t('Circuit Stage / Season Atmosphere', 'サーキットの舞台・季節ステージ')}</span>
                </span>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  {trackThemeSelection === 'RANDOM'
                    ? t('🎲 Auto-Rotate Every Race', '🎲 毎試合ランダム切替')
                    : t('Pinned Stage', 'ステージ固定')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTrackThemeSelection('RANDOM')}
                  className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                    trackThemeSelection === 'RANDOM'
                      ? 'border-emerald-500 ring-2 ring-emerald-400/40 bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-100 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-lg shrink-0 leading-none">🎲</span>
                  <div className="min-w-0">
                    <span className="text-[11px] font-black block truncate">
                      {t('Random', 'ランダム')}
                    </span>
                    <span className="text-[9px] opacity-75 block truncate">
                      {t('No repeats', '被りなし抽選')}
                    </span>
                  </div>
                </button>
                {TRACK_THEME_LIST.map((theme) => {
                  const isSelected = trackThemeSelection === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setTrackThemeSelection(theme.id)}
                      className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? `${theme.cardBorderSelected} ${theme.cardBgSelected} shadow-xs`
                          : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-lg shrink-0 leading-none">{theme.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-black block truncate">
                          {t(theme.shortEn, theme.shortJa)}
                        </span>
                        <span className="text-[9px] opacity-75 block truncate">
                          {t(theme.nameEn, theme.nameJa)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}



        {/* 4b. Tug of War Configuration */}
        {gamePlayType === 'TUG_OF_WAR' && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50/90 to-rose-50/90 dark:from-amber-950/30 dark:to-rose-950/30 border-2 border-amber-300 dark:border-amber-900/60 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚩</span>
                <div>
                  <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                    {t('Undokai Tug of War Rules', '運動会 綱引きバトル設定')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('Red Team vs White Team! Students answer on iPads to pull the rope on the TV.', '紅組 vs 白組！児童がiPadで連続解答してTVのロープを引き合います。')}
                  </p>
                </div>
              </div>
            </div>

            {/* Match Duration Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                {t('Round Duration (Countdown)', '1ラウンドの試合時間 (カウントダウン)')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTugOfWarTimeLimit(sec)}
                    className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition cursor-pointer ${
                      tugOfWarTimeLimit === sec
                        ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {sec} {t('sec', '秒')}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Format Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                {t('Match Format (Rounds)', '試合形式 (セット数)')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'SINGLE', labelEn: 'Single Round', labelJa: '1本勝負', subEn: '1 Win', subJa: '1本先取' },
                    { id: 'BEST_OF_3', labelEn: 'Best of 3', labelJa: '3本勝負', subEn: 'First to 2', subJa: '2本先取' },
                    { id: 'BEST_OF_5', labelEn: 'Best of 5', labelJa: '5本勝負', subEn: 'First to 3', subJa: '3本先取' },
                    { id: 'BEST_OF_7', labelEn: 'Best of 7', labelJa: '7本勝負', subEn: 'First to 4', subJa: '4本先取' },
                  ] as const
                ).map(fmt => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setTugOfWarMatchFormat(fmt.id)}
                    className={`py-2 px-2.5 rounded-xl border-2 font-black text-xs transition flex flex-col items-center justify-center text-center cursor-pointer ${
                      tugOfWarMatchFormat === fmt.id
                        ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span>{t(fmt.labelEn, fmt.labelJa)}</span>
                    <span className={`text-[10px] font-normal ${tugOfWarMatchFormat === fmt.id ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                      {t(fmt.subEn, fmt.subJa)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mud Lockout Info Callout */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="text-base">🥾</span>
              <span>
                {t('Mistake Penalty: 2.5s mud slip lockout (eliminates the wrong choice so student learns).', '誤答ペナルティ: 2.5秒泥すべりロック（間違いの選択肢が消えるため学習につながります）。')}
              </span>
            </div>
          </div>
        )}

        {/* 4c. Undokai Bean Bag Toss (Tamaire) Configuration */}
        {gamePlayType === 'VOLLEYBALL' && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-300 dark:border-indigo-900/60 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧺</span>
                <div>
                  <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                    {t('Bean Bag Toss (Tamaire) Rules', '運動会 玉入れ合戦 設定')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('Red Team vs White Team! Students rapidly answer on iPads to toss bean bags into their team basket!', '紅組 vs 白組！児童がiPadで次々と正解してチームのカゴにお手玉を投げ入れます！')}
                  </p>
                </div>
              </div>
            </div>

            {/* Basket Count Visibility (Mystery Count vs Live Count) */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                {t('Basket Scoreboard Mode', 'スコア発表・カウント演出')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTamaireMysteryCount(true)}
                  className={`p-3 rounded-xl border-2 text-left font-black text-xs transition cursor-pointer ${
                    tamaireMysteryCount
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="block">{t('🤫 Mystery Count (Recommended)', '🤫 ドキドキ玉かぞえ (推奨)')}</span>
                  <span className={`text-[10px] block mt-0.5 font-normal ${tamaireMysteryCount ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {t('Scores hidden (???) until whistle & dramatic counting ceremony!', '笛が鳴るまで個数シークレット！最後はドラマチック玉かぞえ！')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTamaireMysteryCount(false)}
                  className={`p-3 rounded-xl border-2 text-left font-black text-xs transition cursor-pointer ${
                    !tamaireMysteryCount
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="block">{t('👀 Live Real-Time Count', '👀 リアルタイム表示')}</span>
                  <span className={`text-[10px] block mt-0.5 font-normal ${!tamaireMysteryCount ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {t('Live bean bag tally shown on TV throughout the match.', '試合中もリアルタイムに玉の個数をテレビに表示します。')}
                  </span>
                </button>
              </div>
            </div>

            {/* Match Duration Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                {t('Match Duration (Countdown)', '試合時間 (カウントダウン)')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setVolleyballTimeLimit(sec)}
                    className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition cursor-pointer ${
                      volleyballTimeLimit === sec
                        ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {sec} {t('sec', '秒')}
                  </button>
                ))}
              </div>
            </div>

            {/* Fumbled Bag Info Callout */}
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
              <span className="text-base">🧺</span>
              <span>
                {t('Mistake Penalty: 2.5s fumbled bean bag delay (wrong option eliminated to guide learning).', '誤答ペナルティ: 2.5秒お手玉落としロック（誤答カードが消去され正しい単語を学べます）。')}
              </span>
            </div>
          </div>
        )}

        {/* 5. Classic Kahoot Settings (Only when Kahoot style) */}
        {gamePlayType === 'KAHOOT' && (
          <>
            {/* iPad Display Mode (Only shown if Multiplayer is selected) */}
            {deliveryStream === 'STREAM_B_MULTIPLAYER' && (
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                  {t('4. Student iPad Display', '4. 児童の画面表示')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIpadDisplayMode('EYES_UP')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                      ipadDisplayMode === 'EYES_UP'
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Eye className={ipadDisplayMode === 'EYES_UP' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} size={20} />
                    <div>
                      <span className="text-xs font-black block">{t('Eyes-Up (Shapes Only: ▲ ◆ ● ■)', '前を向く！マークのみ (▲ ◆ ● ■)')}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('Forces students to look up at the classroom TV for questions.', '問題文はテレビの大画面に注目させ、iPadは回答ボタンのみ表示。')}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIpadDisplayMode('MIRRORED')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                      ipadDisplayMode === 'MIRRORED'
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Layers className={ipadDisplayMode === 'MIRRORED' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} size={20} />
                    <div>
                      <span className="text-xs font-black block">{t('Mirrored (Full Cards on iPads)', '手元表示 (イラスト・文字)')}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('Shows English words & illustrations directly on iPads.', '手元のiPadにも英語とイラストを直接表示。')}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Question Count & Time Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                  {t('5. Question Count', '5. 問題数')}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 15, 20, -1].map((num) => {
                    const isDisabled = subject === 'ENGLISH' && num !== -1 && num > wordsInPool.length;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setQuestionCount(num)}
                        title={isDisabled ? (language === 'ja' ? `単語数（${wordsInPool.length}語）を超えているため選択できません` : `Exceeds pool size (${wordsInPool.length} words)`) : undefined}
                        className={`py-2.5 rounded-xl font-black text-xs border-2 transition-all ${
                          isDisabled
                            ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-400'
                            : questionCount === num
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {num === -1 ? t('All', '全問') : `${num}${t(' Qs', '問')}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                  {t('5. Time Per Question', '5. 制限時間')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTimeLimitSeconds(sec)}
                      className={`py-2.5 rounded-xl font-black text-xs border-2 transition-all flex items-center justify-center gap-1 ${
                        timeLimitSeconds === sec
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Clock size={12} />
                      <span>{sec}s</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. Question Mechanics & Hints (Recall First & 50/50 Elimination) */}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                {t('6. Question Mechanics & Hints', '6. 出題ギミック・ヒント設定')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Recall First / Think First Blind Delay */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          recallDelaySeconds > 0
                            ? 'bg-blue-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <EyeOff size={15} />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {t('Recall First (Thinking Time)', '思考タイム')}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        recallDelaySeconds > 0
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold'
                      }`}>
                        {recallDelaySeconds === 0 ? 'OFF' : `${recallDelaySeconds}s ${t('Blur', 'ぼかし')}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-snug">
                      {t('Hides options for the first few seconds so students recall English in their mind first.', '最初の数秒間、選択肢を隠して頭で英単語を思い浮かべる時間を設けます。')}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[0, 3, 5].map((sec) => {
                      const isSelected = recallDelaySeconds === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => handleRecallDelayChange(sec as RecallDelaySeconds)}
                          className={`py-2 px-1 rounded-xl font-black text-xs border-2 transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {sec === 0 ? t('OFF (Instant)', 'OFF (即時)') : `${sec}s ${t('Delay', '遅延')}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Distractor Elimination Hint */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          distractorEliminationMode !== 'OFF'
                            ? 'bg-blue-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          <Zap size={15} />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {t('Distractor Elimination Hints', '選択肢絞り込みヒント')}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        distractorEliminationMode !== 'OFF'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold'
                      }`}>
                        {distractorEliminationMode === 'GRADUAL' ? 'GRADUAL' : distractorEliminationMode === 'HALFWAY' ? '50/50' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-snug">
                      {distractorEliminationMode === 'GRADUAL'
                        ? t('Dims 1 incorrect choice at 33% elapsed, and 2nd incorrect choice at 66% elapsed.', '残り時間が約66%で1択、約33%で2択目を段階的に消去してアシストします。')
                        : distractorEliminationMode === 'HALFWAY'
                        ? t('When time reaches halfway, automatically dims 2 incorrect answers to assist.', '残り時間が半分になると、誤答の2択を自動で消去・薄暗くしてアシストします。')
                        : t('Keep all 4 multiple choice options visible until time runs out.', '4つの選択肢を最後までそのまま表示します。')}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDistractorModeChange('OFF')}
                      className={`py-2 px-1 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer text-center ${
                        distractorEliminationMode === 'OFF'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {t('OFF (4 Options)', 'OFF (4択)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDistractorModeChange('HALFWAY')}
                      className={`py-2 px-1 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer text-center ${
                        distractorEliminationMode === 'HALFWAY'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {t('50/50 (Halfway)', '50/50 (半分で2択)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDistractorModeChange('GRADUAL')}
                      className={`py-2 px-1 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer text-center ${
                        distractorEliminationMode === 'GRADUAL'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {t('Gradual (Step-by-step)', '段階的 (33/66%)')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Question Prompt Variety & Scaffolding */}
        {subject === 'MATH' ? (
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">📐</span>
              <div className="min-w-0">
                <span className="font-black text-emerald-900 dark:text-emerald-100 block mb-0.5">
                  {t('Algorithmic Mathematical Problem Cards Active', '算数問題・自動レイアウト稼働中')}
                </span>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">
                  {t('Equations, geometry shapes, and units automatically adapt with giant high-contrast typography and MEXT Japanese font stack across classroom TVs and student iPads.', '数式・幾何図形・単位換算がテレビとiPadに最も見やすいUDデジタル教科書体で最適表示されます。')}
                </span>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-600 text-white shrink-0">
              MEXT 算数
            </span>
          </div>
        ) : (
        <>
        <div>
          <div className="flex flex-nowrap items-center justify-between gap-2 mb-2 overflow-x-auto no-scrollbar">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider shrink-0 whitespace-nowrap">
              {gamePlayType === 'KAHOOT' ? t('7. Question Varieties', '7. 出題バリエーション') : t('4. Question Varieties', '4. 出題バリエーション')}
            </label>
            <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
              <button
                type="button"
                onClick={() => setPromptTypes(['JA_MEANING', 'EN_TO_JA', 'IMAGE_ONLY', 'AUDIO_ONLY'])}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('📘 Basic 4', '📘 基本4種')}
              </button>
              <button
                type="button"
                onClick={() => setPromptTypes(
                  gamePlayType === 'KAHOOT'
                    ? ['JA_MEANING', 'IMAGE_ONLY', 'PHONICS_MASK', 'SHORT_CLOZE', 'CATEGORY_HUNT', 'THREE_HINTS']
                    : ['JA_MEANING', 'EN_TO_JA', 'IMAGE_ONLY', 'PHONICS_MASK', 'CATEGORY_HUNT']
                )}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('✨ Fun Mix', '✨ 応用ミックス')}
              </button>
              <button
                type="button"
                onClick={() => setPromptTypes(['JA_MEANING', 'EN_TO_JA', 'IMAGE_ONLY', 'AUDIO_ONLY', 'PHONICS_MASK', 'SHORT_CLOZE', 'CATEGORY_HUNT', 'THREE_HINTS'])}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('🎯 All 8', '🎯 全8種フル')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => togglePromptType('JA_MEANING')}
              className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                promptTypes.includes('JA_MEANING')
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <HelpCircle size={16} className={promptTypes.includes('JA_MEANING') ? 'text-blue-500 shrink-0' : 'text-slate-400 shrink-0'} />
              <span className="truncate">{t('Japanese ➔ English', '日本語 ➔ 英語')}</span>
            </button>

            <button
              type="button"
              onClick={() => togglePromptType('EN_TO_JA')}
              className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                promptTypes.includes('EN_TO_JA')
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <Languages size={16} className={promptTypes.includes('EN_TO_JA') ? 'text-blue-500 shrink-0' : 'text-slate-400 shrink-0'} />
              <span className="truncate">{t('English ➔ Japanese', '英語 ➔ 日本語')}</span>
            </button>

            <button
              type="button"
              onClick={() => togglePromptType('IMAGE_ONLY')}
              className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                promptTypes.includes('IMAGE_ONLY')
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <ImageIcon size={16} className={promptTypes.includes('IMAGE_ONLY') ? 'text-blue-500 shrink-0' : 'text-slate-400 shrink-0'} />
              <span className="truncate">{t('Illustration ➔ English', 'イラスト ➔ 英語')}</span>
            </button>

            <button
              type="button"
              onClick={() => togglePromptType('AUDIO_ONLY')}
              className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                promptTypes.includes('AUDIO_ONLY')
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <Volume2 size={16} className={promptTypes.includes('AUDIO_ONLY') ? 'text-blue-500 shrink-0' : 'text-slate-400 shrink-0'} />
              <span className="truncate">{t('Audio Listening ➔ English', '音声 ➔ 英語')}</span>
            </button>

            {/* NEW VARIETY 5: PHONICS_MASK (Spelling / Phonics Detective) */}
            <button
              type="button"
              onClick={() => togglePromptType('PHONICS_MASK')}
              className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                promptTypes.includes('PHONICS_MASK')
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="truncate font-black">{t('🔤 Phonics Blank (K[?]rea)', '🔤 虫食いフォニックス')}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                  {t('⚡ Fast OK', '⚡ レース◎')}
                </span>
              </div>
              <span className="text-[10px] opacity-75 truncate">
                {t('Pick the missing letters (ea / ee / er / o)', '単語の [ ? ] に入る文字・つづりを選ぶ')}
              </span>
            </button>

            {/* NEW VARIETY 6: CATEGORY_HUNT (Category Hunter) */}
            <button
              type="button"
              onClick={() => togglePromptType('CATEGORY_HUNT')}
              className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                promptTypes.includes('CATEGORY_HUNT')
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="truncate font-black">{t('🐾 Category Hunter', '🐾 なかま探し (分類)')}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                  {t('⚡ Fast OK', '⚡ レース◎')}
                </span>
              </div>
              <span className="text-[10px] opacity-75 truncate">
                {t('Find the word in the target category', '「動物はどれ？」などカテゴリーで選ぶ')}
              </span>
            </button>

            {/* NEW VARIETY 7: SHORT_CLOZE (Mini Conversation / Sentence Blank) */}
            <button
              type="button"
              onClick={() => togglePromptType('SHORT_CLOZE')}
              className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                promptTypes.includes('SHORT_CLOZE')
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="truncate font-black">{t('💬 Sentence Blank [ ? ]', '💬 会話・文の空欄 [ ? ]')}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  {t('📺 Kahoot', '📺 Kahoot推奨')}
                </span>
              </div>
              <span className="text-[10px] opacity-75 truncate">
                {t('"I like [ ? ]." textbook sentence cloze', '教科書のやりとり・例文の [ ? ] を埋める')}
              </span>
            </button>

            {/* NEW VARIETY 8: THREE_HINTS (Progressive 3-Hint Detective) */}
            <button
              type="button"
              onClick={() => togglePromptType('THREE_HINTS')}
              className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                promptTypes.includes('THREE_HINTS')
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between w-full gap-1">
                <span className="truncate font-black">{t('🕵️‍♂️ 3-Hint Detective', '🕵️‍♂️ 3ヒント・クイズ')}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  {t('📺 Kahoot', '📺 Kahoot推奨')}
                </span>
              </div>
              <span className="text-[10px] opacity-75 truncate">
                {t('Unlocks Hint 1 ➔ Hint 2 ➔ Hint 3', '時間経過でヒント1 ➔ 2 ➔ 3がオープン！')}
              </span>
            </button>
          </div>
        </div>

        {/* 8. Answer Varieties & Pedagogical Scaffolding */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
              {gamePlayType === 'KAHOOT' ? t('8. Answer Styles & Scaffolding', '8. 回答形式 & 学習補助') : t('5. Answer Styles & Scaffolding', '5. 回答形式 & 学習補助')}
            </label>
            <span className="text-[11px] font-bold text-slate-400">
              {t('Pedagogical Guardrails Active', '指導要領ガードレール適用中')}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* SUB-CONTROL A: Choice Card Illustrations */}
            <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>{t('Choice Illustrations', '選択肢の画像表示')}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {isChoiceImageLocked ? t('Cheat-Lock Active', '絵合わせロック中') : t('Smart Auto-Active', 'スマート連動')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-snug">
                  {t('Controls whether 4 answer buttons display textbook illustrations (Visual cheat prevention prevents picture-matching).', '選択肢に教科書イラストを添えるかを設定（問題に絵がある時は絵合わせ不正を防ぐため自動無効）。')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option A1: Text-Focused (Always available) */}
                <button
                  type="button"
                  onClick={() => setChoiceImageMode('TEXT_ONLY')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    choiceImageMode === 'TEXT_ONLY'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black">{t('Text Only', '文字のみ')}</span>
                    {['ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade) && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        choiceImageMode === 'TEXT_ONLY'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {t('G5-6 Rec', '高学年推奨')}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] opacity-80 leading-tight">
                    {t('Pure spelling & Japanese text. No visual crutches.', '英語スペルと日本語のみ。文字読解力を育成。')}
                  </span>
                </button>

                {/* Option A2: With Illustrations */}
                {isChoiceImageLocked ? (
                  /* STRICTLY NO (RED 🔴) */
                  <div
                    className="p-3 rounded-xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 opacity-60 cursor-not-allowed select-none relative overflow-hidden flex flex-col justify-between"
                    title={t('Disabled because all chosen questions already display illustrations. Having pictures on answers would cause picture-matching cheating.', '出題にイラストが含まれるため、絵合わせ不正を防ぐため選択肢画像は自動無効化されます。')}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black flex items-center gap-1">
                        <span>{t('With Pictures', 'イラスト付き')}</span>
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                        {t('Locked (No Cheat)', '🚫 絵合わせ防止')}
                      </span>
                    </div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">
                      {t('Auto-locked: Prompt already shows artwork.', '出題に絵があるため不正防止ロック中')}
                    </span>
                  </div>
                ) : (
                  /* SELECTABLE */
                  <button
                    type="button"
                    onClick={() => setChoiceImageMode('AUTO_CLEVER')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      choiceImageMode === 'AUTO_CLEVER'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black">{t('With Pictures', 'イラスト付き')}</span>
                      {choiceImageMode === 'AUTO_CLEVER' ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {promptTypes.includes('AUDIO_ONLY') ? t('⭐ Best for Audio', '⭐ リスニング推奨') : t('💡 Optional Aid', '💡 視覚アシスト')}
                        </span>
                      ) : promptTypes.includes('AUDIO_ONLY') ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                          {t('⭐ Best for Audio', '⭐ リスニング推奨')}
                        </span>
                      ) : promptTypes.includes('JA_MEANING') ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                          {t('💡 Optional Aid', '💡 視覚アシスト')}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">
                      {promptTypes.includes('AUDIO_ONLY')
                        ? t('Tap picture upon hearing audio. Ideal for lower grades.', '音声を聞いて直感的に絵をタップ！')
                        : t('Concept illustrations alongside English words.', '英単語の横にイラストを補助表示。')}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* SUB-CONTROL B: English Reading & Katakana Scaffolding */}
            <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🔤</span>
                    <span>{t('English Reading & Pronunciation Aid', '英語の表記・読みサポート')}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {t('MEXT Standard', '指導要領準拠')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-snug">
                  {t('Select whether English buttons display pure textbook alphabet spelling, or include Katakana pronunciation aids.', '英語ボタンを教科書通りの英単語のみにするか、カタカナ発音目安を添えるかを設定。')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option B1: Spelling Only (ABC) */}
                <button
                  type="button"
                  onClick={() => setEnglishReadingAid('SPELLING_ONLY')}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    englishReadingAid === 'SPELLING_ONLY'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black">{t('ABC Only', 'ABC のみ')}</span>
                    {englishReadingAid === 'SPELLING_ONLY' ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {t('Standard', '標準')}
                      </span>
                    ) : ['ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade) ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        {t('Standard', '標準')}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] opacity-80 leading-tight">
                    {t('Textbook alphabet spelling (milk, tea).', '教科書の英単語スペル')}
                  </span>
                </button>

                {/* Option B2: With Katakana Subtext (ABC + [ア]) */}
                <button
                  type="button"
                  onClick={() => setEnglishReadingAid('WITH_KATAKANA')}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    englishReadingAid === 'WITH_KATAKANA'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-black">{t('ABC + Kana', 'ABC + カナ')}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      englishReadingAid === 'WITH_KATAKANA'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                    }`}>
                      {t('💡 Scaffold', '💡 補助')}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-80 leading-tight">
                    {t('Spelling with [ミルク] subtext aid.', '単語下にカタカナ発音目安')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Classroom Award Categories */}
        <div>
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
            {gamePlayType === 'KAHOOT' ? t('9. Post-Game Classroom Awards', '9. 終了後の表彰カテゴリー') : t('6. Post-Game Classroom Awards', '6. 終了後の表彰カテゴリー')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Core (Always-On) */}
            <div className="p-3.5 rounded-2xl border-2 border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏆</span>
                  <span className="text-xs font-black text-blue-950 dark:text-blue-100">{t('Core Awards (Always-On)', '基本表彰 (常時ON)')}</span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {t('ALWAYS ON', '常時ON')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {t('Speed Star ⚡, On Fire 🔥, Sniper 🎯', 'スピードスター⚡、連続正解🔥、スナイパー🎯')}
              </p>
            </div>

            {/* Effort & Growth */}
            <button
              type="button"
              onClick={() => setAwardToggles(prev => ({ ...prev, effortGrowth: !prev.effortGrowth }))}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                awardToggles.effortGrowth
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Heart size={15} className={awardToggles.effortGrowth ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-xs font-black">{t('Effort & Growth', '努力・成長賞 (Effort & Growth)')}</span>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  awardToggles.effortGrowth
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {awardToggles.effortGrowth ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('Never Give Up 💫, Rising Star 🚀, Flawless Finish 💎, Last Spurt 🏃', '最後まで粘ったで賞💫、急成長賞🚀、パーフェクト賞💎、ラストスパート賞🏃')}
              </p>
            </button>

            {/* Skill & Challenge */}
            <button
              type="button"
              onClick={() => setAwardToggles(prev => ({ ...prev, skillChallenge: !prev.skillChallenge }))}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                awardToggles.skillChallenge
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield size={15} className={awardToggles.skillChallenge ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-xs font-black">{t('Skill & Challenge', '実力・挑戦賞 (Skill & Challenge)')}</span>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  awardToggles.skillChallenge
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {awardToggles.skillChallenge ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('Iron Defense 🛡️, Wise Owl 🦉, All-Rounder 🌟, Quick Draw 🎯', '鉄壁ディフェンス🛡️、ものしりフクロウ🦉、オールラウンダー🌟、早押し名人🎯')}
              </p>
            </button>

            {/* Fun & Surprise */}
            <button
              type="button"
              onClick={() => setAwardToggles(prev => ({ ...prev, funSurprise: !prev.funSurprise }))}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer sm:col-span-3 ${
                awardToggles.funSurprise
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Smile size={15} className={awardToggles.funSurprise ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="text-xs font-black">{t('Fun & Classroom Spirit', 'お楽しみ・特別賞')}</span>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  awardToggles.funSurprise
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {awardToggles.funSurprise ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('Rainbow Master 🌈, Just-in-Time ⏱️, Twin Sync 🤝, Median Hero 🍀', 'レインボーマスター🌈、ギリギリセーフ⏱️、シンクロ回答🤝、中央値ヒーロー🍀')}
              </p>
            </button>
          </div>
        </div>

        {/* Classroom BGM Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
              {t(
                'Classroom Sound Pack (High-Energy Audio)',
                <>
                  <ruby>教室<rt>きょうしつ</rt></ruby>のBGMサウンドパック
                </>
              )}
            </label>
            <button
              type="button"
              onClick={() => setIsBgmModalOpen(true)}
              className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal size={12} />
              <span>{t('Change Sound Pack', 'パック変更・試聴')}</span>
            </button>
          </div>

          {(() => {
            const currentPack = getSoundPack(bgm);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                {/* Active Pack Display / Clickable to open modal */}
                <div
                  onClick={() => setIsBgmModalOpen(true)}
                  className={`sm:col-span-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex items-center justify-between gap-3 ${currentPack.accentBorder} ${currentPack.bgLight} ${currentPack.bgDark} hover:shadow-md ring-1 ring-indigo-400/20`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                      {currentPack.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {language === 'ja' ? currentPack.nameJa : currentPack.name}
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${currentPack.badgeColor}`}>
                          {currentPack.franchise}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {currentPack.tracks.length} {t('Tracks', '曲')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                        {language === 'ja' ? currentPack.descriptionJa : currentPack.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs hover:bg-white dark:hover:bg-slate-800">
                    <Music size={13} />
                    <span>{t('Change Pack', '試聴・変更')}</span>
                  </div>
                </div>

                {/* Quick Toggle: Mute / Silent Button */}
                <button
                  type="button"
                  onClick={() => setBgm(bgm === 'none' ? 'all_stars' : 'none')}
                  className={`sm:col-span-1 p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    bgm === 'none'
                      ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-400/30'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🔇</span>
                    <span className="text-xs font-black">
                      {bgm === 'none' ? t('Muted (SFX Only)', '無音中 (効果音のみ)') : t('Quick Mute', 'BGMをミュート')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {bgm === 'none' ? t('Tap to restore music', 'タップで音楽を再開') : t('Play quiz without BGM', '効果音のみでプレイ')}
                  </span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('Cancel', 'キャンセル')}
        </button>
        <button
          type="button"
          disabled={subject === 'ENGLISH' && wordsInPool.length < 4}
          onClick={handleLaunch}
          className="px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <Play size={16} fill="white" />
          <span>
            {gamePlayType === 'GRAND_PRIX_3D' 
              ? t('START GRAND PRIX ROOM', 'グランプリ部屋を作成') 
              : (deliveryStream === 'STREAM_B_MULTIPLAYER' ? t('CREATE ROOM', '部屋を作成') : t('START WARMUP', 'クイズ開始'))}
          </span>
        </button>
      </div>

      {/* Sound Pack Selection & Audition Modal */}
      <BgmSelectorModal
        isOpen={isBgmModalOpen}
        onClose={() => setIsBgmModalOpen(false)}
        selectedPackId={bgm}
        onSelectPack={(packId) => setBgm(packId)}
      />
    </div>
  );
};
