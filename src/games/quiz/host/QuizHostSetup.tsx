import React, { useState } from 'react';
import { useClassroom } from '@/context/ClassroomContext';
import { useVocabulary, VocabularyScope } from '@/context/VocabularyContext';
import { useLanguage } from '@/context/LanguageContext';
import { SCHOOL_CONFIGS, getSuggestedClassForSchedule } from '@/types/roster';
import {
  SuzukaTrackThemeSelection,
  SuzukaTimeOfDaySelection,
  SuzukaCloudCoverSelection,
  SuzukaPrecipitationSelection,
  getTrackTheme,
} from '@/games/suzuka_grand_prix/trackThemes';
import {
  isPromptTypeAllowedInGamePlay,
  normalizePromptTypesForGamePlay,
} from '../core/quizEngine';
import {
  AVAILABLE_TEAMS,
  AwardCategoryToggles,
  ChoiceImageMode,
  DistractorEliminationMode,
  EnglishReadingAid,
  GameMode,
  GamePlayType,
  IpadDisplayMode,
  PromptType,
  QuizHostSettings,
  QuizSubject,
  RecallDelaySeconds,
  SprintModeType,
  SprintSettings,
  TamaireSettings,
  TeamAssignmentMode,
  TeamId,
  TugOfWarMatchFormat,
  TugOfWarSettings,
} from '../types';
import { MathDomain, MathGrade } from '../mathTypes';
import { SetupRosterCard } from './setup/SetupRosterCard';
import { SubjectDeckSection } from './setup/SubjectDeckSection';
import { PlayModeAndTeamsSection } from './setup/PlayModeAndTeamsSection';
import { GrandPrixRulesCard } from './setup/GrandPrixRulesCard';
import { TugOfWarRulesCard } from './setup/TugOfWarRulesCard';
import { TamaireRulesCard } from './setup/TamaireRulesCard';
import { KahootScaffoldingSection } from './setup/KahootScaffoldingSection';
import { AwardsAndBgmFooter } from './setup/AwardsAndBgmFooter';

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
  initialSettings = null,
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
    openUnitModal,
  } = useClassroom();
  const { getWordsForScope, ensureCluesLoaded } = useVocabulary();

  React.useEffect(() => {
    ensureCluesLoaded();
  }, [ensureCluesLoaded]);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    () => initialSettings?.classId || activeClassId
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
  const availableClassesForGrade = (SCHOOL_CONFIGS[activeSchool]?.classes || []).filter((c) =>
    c.startsWith(`${classGradeTab}-`)
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
      setSelectedTeams((prev) => prev.filter((id) => id !== tId));
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
  const [selectedMathTopic, setSelectedMathTopic] = useState<string>(
    () => initialSettings?.mathTopicId || ''
  );

  const initialScope: VocabularyScope =
    initialSettings?.vocabularyScope === 'GRADE_ALL' ||
    initialSettings?.vocabularyScope === 'PRIOR_REVIEW' ||
    initialSettings?.vocabularyScope === 'ALL_ELEMENTARY'
      ? initialSettings.vocabularyScope
      : 'CURRENT';
  const [selectedScope, setSelectedScope] = useState<VocabularyScope>(initialScope);
  const [isExtendedScopesOpen, setIsExtendedScopesOpen] = useState<boolean>(
    initialScope !== 'CURRENT'
  );

  // Classic Kahoot pacing state (isolated from non-Kahoot round-trip values such as 60s/60Qs)
  const [questionCount, setQuestionCount] = useState<number>(() => {
    const raw = initialSettings?.questionCount;
    if (initialSettings?.gamePlayType && initialSettings.gamePlayType !== 'KAHOOT') {
      return 10;
    }
    if (raw !== undefined && [5, 10, 15, 20, -1].includes(raw)) return raw;
    return 10;
  });
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(() => {
    const raw = initialSettings?.timeLimitSeconds;
    if (initialSettings?.gamePlayType && initialSettings.gamePlayType !== 'KAHOOT') {
      return 10;
    }
    if (raw !== undefined && [5, 10, 15, 20].includes(raw)) return raw;
    return 10;
  });

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
  const [timeOfDaySelection, setTimeOfDaySelection] = useState<SuzukaTimeOfDaySelection>(
    () => initialSettings?.sprintSettings?.timeOfDaySelection ?? 'LE_MANS_CYCLE'
  );
  const [cloudCoverSelection, setCloudCoverSelection] = useState<SuzukaCloudCoverSelection>(
    () => initialSettings?.sprintSettings?.cloudCoverSelection ?? 'PARTLY_CLOUDY'
  );
  const [precipitationSelection, setPrecipitationSelection] = useState<SuzukaPrecipitationSelection>(
    () => initialSettings?.sprintSettings?.precipitationSelection ?? 'NONE'
  );

  const handleSelectBiomeSelection = (nextBiome: SuzukaTrackThemeSelection) => {
    setTrackThemeSelection(nextBiome);
    if (nextBiome !== 'RANDOM') {
      const biomeConfig = getTrackTheme(nextBiome);
      setCloudCoverSelection(biomeConfig.defaultCloudCover);
      setPrecipitationSelection(biomeConfig.defaultPrecipitation);
    }
  };

  const [wrongSpeedLossRatio, setWrongSpeedLossRatio] = useState<number>(
    () => initialSettings?.sprintSettings?.wrongSpeedLossRatio ?? 0.33
  );
  const [wrongLockoutSeconds, setWrongLockoutSeconds] = useState<number>(
    () => Math.max(2.5, initialSettings?.sprintSettings?.wrongLockoutSeconds ?? 2.5)
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
  const [mudLockoutSeconds, setMudLockoutSeconds] = useState<number>(
    () => Math.max(2.5, initialSettings?.tugOfWarSettings?.mudLockoutSeconds ?? 2.5)
  );

  // Undokai Bean Bag Toss (Tamaire) state
  const [tamaireTimeLimit, setTamaireTimeLimit] = useState<number>(
    () => (initialSettings?.tamaireSettings ?? initialSettings?.volleyballSettings)?.timeLimitSeconds ?? 60
  );
  const [tamaireMysteryCount, setTamaireMysteryCount] = useState<boolean>(
    () => (initialSettings?.tamaireSettings ?? initialSettings?.volleyballSettings)?.hideScoreUntilEnd ?? true
  );
  const [missLockoutSeconds, setMissLockoutSeconds] = useState<number>(
    () => Math.max(2.5, (initialSettings?.tamaireSettings ?? initialSettings?.volleyballSettings)?.missLockoutSeconds ?? 2.5)
  );

  // Question mechanics & hint toggles (Mutually exclusive: Gradual default ON, Recall delay default OFF)
  const [recallDelaySeconds, setRecallDelaySeconds] = useState<RecallDelaySeconds>(
    () => initialSettings?.recallDelaySeconds ?? 0
  );
  const [distractorEliminationMode, setDistractorEliminationMode] = useState<DistractorEliminationMode>(
    () =>
      initialSettings?.distractorEliminationMode ??
      (initialSettings?.eliminateDistractors === false ? 'OFF' : 'GRADUAL')
  );

  const [promptTypes, setPromptTypes] = useState<PromptType[]>(() =>
    normalizePromptTypesForGamePlay(
      initialSettings?.promptTypes?.length
        ? initialSettings.promptTypes
        : ['JA_MEANING', 'EN_TO_JA', 'IMAGE_ONLY'],
      initialSettings?.gamePlayType || 'KAHOOT'
    )
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

  // Visual cheat prevention: match questionGenerator.ts (only JA_MEANING, AUDIO_ONLY, and THREE_HINTS allow choice artwork)
  const isChoiceImageLocked =
    promptTypes.length > 0 &&
    !promptTypes.some((p) => p === 'JA_MEANING' || p === 'AUDIO_ONLY' || p === 'THREE_HINTS');

  React.useEffect(() => {
    if (isChoiceImageLocked && choiceImageMode !== 'TEXT_ONLY') {
      setChoiceImageMode('TEXT_ONLY');
    }
  }, [isChoiceImageLocked, choiceImageMode]);

  const [awardToggles, setAwardToggles] = useState<AwardCategoryToggles>(
    () =>
      initialSettings?.awardToggles || {
        effortGrowth: true,
        skillChallenge: true,
        funSurprise: true,
      }
  );

  const hasPriorReview = ['ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade);
  const hasGrandSlam = ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade);

  const cleanUnitLabel = (u: string) => u.replace(/^Unit\s+(\d+):\s+Unit\s+\1:\s*/i, 'Unit $1: ');

  const wordsInPool = React.useMemo(
    () => getWordsForScope(selectedScope),
    [selectedScope, getWordsForScope]
  );

  React.useEffect(() => {
    if (subject === 'ENGLISH' && wordsInPool.length > 0) {
      setQuestionCount((prev) =>
        prev !== -1 && prev > wordsInPool.length
          ? [20, 15, 10, 5].find((n) => n <= wordsInPool.length) || -1
          : prev
      );
    }
  }, [subject, wordsInPool.length]);

  const scopeCounts = {
    CURRENT: getWordsForScope('CURRENT').length,
    GRADE_ALL: getWordsForScope('GRADE_ALL').length,
    PRIOR_REVIEW: hasPriorReview ? getWordsForScope('PRIOR_REVIEW').length : 0,
    ALL_ELEMENTARY: hasGrandSlam ? getWordsForScope('ALL_ELEMENTARY').length : 0,
  };

  const getPriorReviewTitle = () => {
    if (activeGrade === 'ES_G6') return language === 'ja' ? '小3〜小5 復習' : 'G3–G5 Review';
    if (activeGrade === 'ES_G5') return language === 'ja' ? '小3〜小4 復習' : 'G3–G4 Review';
    if (activeGrade === 'ES_G4') return language === 'ja' ? '小3 復習' : 'G3 Review';
    return language === 'ja' ? '小学校 復習' : 'Elementary Review';
  };

  const handleSelectGamePlayType = (nextType: GamePlayType) => {
    setGamePlayType(nextType);
    if (nextType === 'TUG_OF_WAR' || nextType === 'TAMAIRE' || nextType === 'VOLLEYBALL') {
      setGameMode('TEAM');
      setSelectedTeams(['team_red', 'team_white']);
    }
    setPromptTypes((prev) => normalizePromptTypesForGamePlay(prev, nextType));
  };

  const togglePromptType = (type: PromptType) => {
    if (!isPromptTypeAllowedInGamePlay(type, gamePlayType)) return;
    if (promptTypes.includes(type)) {
      if (promptTypes.length > 1) {
        setPromptTypes(promptTypes.filter((p) => p !== type));
      }
    } else {
      setPromptTypes([...promptTypes, type]);
    }
  };

  const handleRecallDelayChange = (sec: RecallDelaySeconds) => {
    setRecallDelaySeconds(sec);
    if (sec > 0) {
      setDistractorEliminationMode('OFF');
    }
  };

  const handleDistractorModeChange = (mode: DistractorEliminationMode) => {
    setDistractorEliminationMode(mode);
    if (mode !== 'OFF') {
      setRecallDelaySeconds(0);
    }
  };

  const handleLaunch = () => {
    const is3DRace = gamePlayType === 'GRAND_PRIX_3D';
    const isTamaire = gamePlayType === 'TAMAIRE' || gamePlayType === 'VOLLEYBALL';
    const canonicalGamePlayType: GamePlayType = isTamaire ? 'TAMAIRE' : gamePlayType;

    const sprintSettings: SprintSettings | undefined = is3DRace
      ? {
          sprintMode,
          timeLimitSeconds: sprintTimeLimitSeconds,
          graceCountdownSeconds: sprintGraceSeconds,
          targetLaps3D: targetLaps3D || 1,
          trackThemeSelection,
          ...(trackThemeSelection === 'RANDOM' &&
          initialSettings?.sprintSettings?.trackThemeSelection === 'RANDOM' &&
          initialSettings?.sprintSettings?.trackTheme
            ? { trackTheme: initialSettings.sprintSettings.trackTheme }
            : {}),
          timeOfDaySelection,
          cloudCoverSelection,
          precipitationSelection,
          wrongSpeedLossRatio,
          wrongLockoutSeconds: Math.max(2.5, wrongLockoutSeconds),
        }
      : undefined;

    const tugOfWarSettings: TugOfWarSettings | undefined =
      gamePlayType === 'TUG_OF_WAR'
        ? {
            timeLimitSeconds: tugOfWarTimeLimit,
            pullSensitivity: tugOfWarSensitivity,
            mudLockoutSeconds: Math.max(2.5, mudLockoutSeconds),
            matchFormat: tugOfWarMatchFormat,
          }
        : undefined;

    const tamaireConfig: TamaireSettings | undefined = isTamaire
      ? {
          timeLimitSeconds: tamaireTimeLimit,
          missLockoutSeconds: Math.max(2.5, missLockoutSeconds),
          hideScoreUntilEnd: tamaireMysteryCount,
        }
      : undefined;

    const actualQCount =
      is3DRace || gamePlayType === 'TUG_OF_WAR' || isTamaire
        ? subject === 'MATH'
          ? 60
          : Math.min(60, Math.max(wordsInPool.length, 30))
        : subject === 'MATH'
          ? questionCount === -1
            ? 40
            : questionCount
          : questionCount === -1
            ? wordsInPool.length
            : Math.min(questionCount, wordsInPool.length);

    const normalizedPrompts: PromptType[] =
      subject === 'MATH'
        ? ['JA_MEANING']
        : normalizePromptTypesForGamePlay(promptTypes, canonicalGamePlayType);

    onStart({
      subject,
      mathGrade: subject === 'MATH' ? mathGrade : undefined,
      mathDomain: subject === 'MATH' ? mathDomain : undefined,
      mathTopicId: subject === 'MATH' && selectedMathTopic ? selectedMathTopic : undefined,
      questionCount: actualQCount,
      timeLimitSeconds: is3DRace
        ? sprintTimeLimitSeconds
        : gamePlayType === 'TUG_OF_WAR'
          ? tugOfWarTimeLimit
          : isTamaire
            ? tamaireTimeLimit
            : timeLimitSeconds,
      gameMode: gamePlayType === 'TUG_OF_WAR' || isTamaire ? 'TEAM' : gameMode,
      teamAssignment:
        gameMode === 'TEAM' || gamePlayType === 'TUG_OF_WAR' || isTamaire ? teamAssignment : undefined,
      teamCount:
        gamePlayType === 'TUG_OF_WAR' || isTamaire ? 2 : gameMode === 'TEAM' ? teamCount : undefined,
      activeTeams:
        gamePlayType === 'TUG_OF_WAR' || isTamaire
          ? ['team_red', 'team_white']
          : gameMode === 'TEAM'
            ? activeTeams
            : undefined,
      deliveryStream: 'STREAM_B_MULTIPLAYER',
      ipadDisplayMode,
      promptTypes: normalizedPrompts,
      awardToggles,
      schoolId: activeSchool,
      classId: selectedClassId === 'TEST' || !recordRoster ? 'TEST' : selectedClassId,
      recordRoster: isStudentHost || selectedClassId === 'TEST' || !recordRoster ? false : recordRoster,
      isStudentHost: !!isStudentHost,
      isTestGame: selectedClassId === 'TEST' || !recordRoster,
      gamePlayType: canonicalGamePlayType,
      recallDelaySeconds: subject === 'MATH' ? 0 : recallDelaySeconds,
      distractorEliminationMode,
      sprintSettings,
      tugOfWarSettings,
      tamaireSettings: tamaireConfig,
      volleyballSettings: tamaireConfig,
      bgm,
      vocabularyScope: subject === 'MATH' ? undefined : selectedScope,
      selectedUnits:
        subject !== 'MATH' && selectedScope === 'CURRENT'
          ? globalSelectedUnits.length > 0
            ? globalSelectedUnits
            : activeUnit !== 'ALL'
              ? [activeUnit]
              : undefined
          : undefined,
      customWordPool: subject === 'MATH' ? undefined : wordsInPool,
      choiceImageMode: subject === 'MATH' ? 'TEXT_ONLY' : choiceImageMode,
      englishReadingAid: subject === 'MATH' ? 'SPELLING_ONLY' : englishReadingAid,
    });
  };

  let nextSetupStep = 1;
  const gameStyleStep = nextSetupStep++;
  const battleFormatStep =
    gamePlayType !== 'TUG_OF_WAR' && gamePlayType !== 'TAMAIRE' && gamePlayType !== 'VOLLEYBALL'
      ? nextSetupStep++
      : 0;
  const ipadDisplayStep = gamePlayType === 'KAHOOT' ? nextSetupStep++ : 0;
  const questionCountStep = gamePlayType === 'KAHOOT' ? nextSetupStep++ : 0;
  const timeLimitStep = gamePlayType === 'KAHOOT' ? nextSetupStep++ : 0;
  const mechanicsStep = gamePlayType === 'KAHOOT' ? nextSetupStep++ : 0;
  const questionVarietiesStep = subject !== 'MATH' ? nextSetupStep++ : 0;
  const answerStylesStep = subject !== 'MATH' ? nextSetupStep++ : 0;
  const awardsStep = nextSetupStep++;

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl mx-auto my-2 sm:my-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-8 lg:p-10 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl ${
              subject === 'MATH'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                : 'bg-gradient-to-tr from-amber-400 to-orange-500'
            } flex items-center justify-center shadow-lg text-white font-black text-2xl shrink-0 transition-colors`}
          >
            {subject === 'MATH' ? '📐' : '🏆'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-nowrap min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate min-w-0">
                {subject === 'MATH' ? t('Keisan Arena', 'けいさんアリーナ') : t('Eigo Arena', '英語アリーナ')}
              </h2>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                  subject === 'MATH'
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                    : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                }`}
              >
                {subject === 'MATH'
                  ? t('Elementary Math Battle (MEXT)', '小学校 算数バトル (指導要領準拠)')
                  : t('Live 4-Choice Battle', 'ライブ4択バトル')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {subject === 'MATH'
                ? t(
                    'Infinite procedural math problems across all 6 grades and MEXT domains.',
                    '全6学年・4領域を網羅した自動生成算数バトル。'
                  )
                : isStudentHost
                  ? t('Set up a game for your tablemates and friends!', '班の友だちと遊ぶゲームを設定しよう！')
                  : t('Configure your classroom live quiz game.', 'クラスのライブクイズゲームを設定してください。')}
            </p>
          </div>
        </div>
        {isStudentHost ? (
          <div className="text-left sm:text-right shrink-0 bg-teal-50 dark:bg-teal-950/60 px-3.5 py-2 rounded-2xl border border-teal-200 dark:border-teal-800">
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 block uppercase tracking-wider">
              {t('Table Leader Game', '班のリーダー対戦')}
            </span>
            <span className="text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300">
              👑 Stream 🅲 • {activeGrade}{' '}
              {globalSelectedUnits.length > 1
                ? `(📦 ${globalSelectedUnits.length} Units)`
                : activeUnit !== 'ALL'
                  ? `(${cleanUnitLabel(activeUnit)})`
                  : ''}
            </span>
          </div>
        ) : (
          <div className="text-left sm:text-right shrink-0 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block uppercase tracking-wider">
              {t('Active Classroom', '選択中のクラス')}
            </span>
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
              {activeSchool === 'toyogaoka'
                ? language === 'ja'
                  ? '豊ヶ丘小'
                  : 'Toyogaoka'
                : language === 'ja'
                  ? '二子玉小'
                  : 'Futakotamagawa'}{' '}
              {selectedClassId} • {activeGrade}{' '}
              {globalSelectedUnits.length > 1
                ? `(📦 ${globalSelectedUnits.length} Units)`
                : activeUnit !== 'ALL'
                  ? `(${cleanUnitLabel(activeUnit)})`
                  : ''}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {!isStudentHost && (
          <SetupRosterCard
            activeSchool={activeSchool}
            activeGrade={activeGrade}
            activeClassId={activeClassId}
            selectedClassId={selectedClassId}
            recordRoster={recordRoster}
            classGradeTab={classGradeTab}
            availableClassesForGrade={availableClassesForGrade}
            suggestedClass={suggestedClass}
            scheduleSuggestion={scheduleSuggestion}
            isMismatchWithTimetable={isMismatchWithTimetable}
            onSelectClass={(cId) => {
              setSelectedClassId(cId);
              setRecordRoster(true);
              if (cId.startsWith(`${gradeDigit}-`)) {
                setActiveClassId(cId);
              }
            }}
            onSelectTestMode={() => {
              setSelectedClassId('TEST');
              setRecordRoster(false);
            }}
            onToggleRecordRoster={(shouldRecord) => {
              setRecordRoster(shouldRecord);
              if (shouldRecord && selectedClassId === 'TEST') {
                setSelectedClassId(
                  activeClassId && activeClassId !== 'TEST'
                    ? activeClassId
                    : availableClassesForGrade[0] || '2-3'
                );
              }
            }}
            onSetClassGradeTab={setClassGradeTab}
            onSwitchToSuggestedClass={(sug) => {
              setSelectedClassId(sug);
              setRecordRoster(true);
              const sugGrade = sug.split('-')[0];
              setClassGradeTab(sugGrade);
              if (sugGrade === gradeDigit) {
                setActiveClassId(sug);
              }
            }}
          />
        )}

        <SubjectDeckSection
          subject={subject}
          onSelectSubject={setSubject}
          mathGrade={mathGrade}
          onSelectMathGrade={(g) => {
            setMathGrade(g);
            setSelectedMathTopic('');
          }}
          mathDomain={mathDomain}
          onSelectMathDomain={(d) => {
            setMathDomain(d);
            setSelectedMathTopic('');
          }}
          selectedMathTopic={selectedMathTopic}
          onSelectMathTopic={setSelectedMathTopic}
          gamePlayType={gamePlayType}
          questionCount={questionCount}
          activeGrade={activeGrade}
          activeUnit={activeUnit}
          activeCategory={activeCategory}
          globalSelectedUnits={globalSelectedUnits}
          cleanUnitLabel={cleanUnitLabel}
          selectedScope={selectedScope}
          onSelectScope={setSelectedScope}
          isExtendedScopesOpen={isExtendedScopesOpen}
          onToggleExtendedScopes={() => setIsExtendedScopesOpen((prev) => !prev)}
          scopeCounts={scopeCounts}
          wordsInPoolLength={wordsInPool.length}
          hasPriorReview={hasPriorReview}
          hasGrandSlam={hasGrandSlam}
          getPriorReviewTitle={getPriorReviewTitle}
          openUnitModal={openUnitModal}
        />

        <PlayModeAndTeamsSection
          gameStyleStep={gameStyleStep}
          battleFormatStep={battleFormatStep}
          gamePlayType={gamePlayType}
          onSelectGamePlayType={handleSelectGamePlayType}
          gameMode={gameMode}
          onSelectGameMode={setGameMode}
          selectedTeams={selectedTeams}
          onToggleTeam={toggleTeam}
          teamAssignment={teamAssignment}
          onSelectTeamAssignment={setTeamAssignment}
        />

        {gamePlayType === 'GRAND_PRIX_3D' && (
          <GrandPrixRulesCard
            sprintMode={sprintMode}
            onSelectSprintMode={setSprintMode}
            targetLaps3D={targetLaps3D}
            onSelectTargetLaps3D={setTargetLaps3D}
            sprintGraceSeconds={sprintGraceSeconds}
            onSelectSprintGraceSeconds={setSprintGraceSeconds}
            sprintTimeLimitSeconds={sprintTimeLimitSeconds}
            onSelectSprintTimeLimitSeconds={setSprintTimeLimitSeconds}
            wrongSpeedLossRatio={wrongSpeedLossRatio}
            onSelectWrongSpeedLossRatio={setWrongSpeedLossRatio}
            wrongLockoutSeconds={wrongLockoutSeconds}
            onSelectWrongLockoutSeconds={(sec) => setWrongLockoutSeconds(Math.max(2.5, sec))}
            trackThemeSelection={trackThemeSelection}
            onSelectTrackThemeSelection={handleSelectBiomeSelection}
            timeOfDaySelection={timeOfDaySelection}
            onSelectTimeOfDaySelection={setTimeOfDaySelection}
            cloudCoverSelection={cloudCoverSelection}
            onSelectCloudCoverSelection={setCloudCoverSelection}
            precipitationSelection={precipitationSelection}
            onSelectPrecipitationSelection={setPrecipitationSelection}
          />
        )}

        {gamePlayType === 'TUG_OF_WAR' && (
          <TugOfWarRulesCard
            tugOfWarTimeLimit={tugOfWarTimeLimit}
            onSelectTimeLimit={setTugOfWarTimeLimit}
            tugOfWarMatchFormat={tugOfWarMatchFormat}
            onSelectMatchFormat={setTugOfWarMatchFormat}
            tugOfWarSensitivity={tugOfWarSensitivity}
            onSelectSensitivity={setTugOfWarSensitivity}
            mudLockoutSeconds={mudLockoutSeconds}
            onSelectMudLockoutSeconds={(sec) => setMudLockoutSeconds(Math.max(2.5, sec))}
          />
        )}

        {(gamePlayType === 'TAMAIRE' || gamePlayType === 'VOLLEYBALL') && (
          <TamaireRulesCard
            tamaireMysteryCount={tamaireMysteryCount}
            onSelectMysteryCount={setTamaireMysteryCount}
            tamaireTimeLimit={tamaireTimeLimit}
            onSelectTimeLimit={setTamaireTimeLimit}
            missLockoutSeconds={missLockoutSeconds}
            onSelectMissLockoutSeconds={(sec) => setMissLockoutSeconds(Math.max(2.5, sec))}
          />
        )}

        <KahootScaffoldingSection
          gamePlayType={gamePlayType}
          subject={subject}
          activeGrade={activeGrade}
          wordsInPoolLength={wordsInPool.length}
          ipadDisplayStep={ipadDisplayStep}
          questionCountStep={questionCountStep}
          timeLimitStep={timeLimitStep}
          mechanicsStep={mechanicsStep}
          questionVarietiesStep={questionVarietiesStep}
          answerStylesStep={answerStylesStep}
          ipadDisplayMode={ipadDisplayMode}
          onSelectIpadDisplayMode={setIpadDisplayMode}
          questionCount={questionCount}
          onSelectQuestionCount={setQuestionCount}
          timeLimitSeconds={timeLimitSeconds}
          onSelectTimeLimitSeconds={setTimeLimitSeconds}
          recallDelaySeconds={recallDelaySeconds}
          onChangeRecallDelay={handleRecallDelayChange}
          distractorEliminationMode={distractorEliminationMode}
          onChangeDistractorMode={handleDistractorModeChange}
          promptTypes={promptTypes}
          onSetPromptTypes={(types) => setPromptTypes(normalizePromptTypesForGamePlay(types, gamePlayType))}
          onTogglePromptType={togglePromptType}
          choiceImageMode={choiceImageMode}
          onSelectChoiceImageMode={setChoiceImageMode}
          isChoiceImageLocked={isChoiceImageLocked}
          englishReadingAid={englishReadingAid}
          onSelectEnglishReadingAid={setEnglishReadingAid}
        />

        <AwardsAndBgmFooter
          awardsStep={awardsStep}
          awardToggles={awardToggles}
          onToggleAwardCategory={(key) =>
            setAwardToggles((prev) => ({ ...prev, [key]: !prev[key] }))
          }
          bgm={bgm}
          onSelectBgm={setBgm}
          isBgmModalOpen={isBgmModalOpen}
          onSetBgmModalOpen={setIsBgmModalOpen}
          subject={subject}
          wordsInPoolLength={wordsInPool.length}
          gamePlayType={gamePlayType}
          onCancel={onCancel}
          onLaunch={handleLaunch}
        />
      </div>
    </div>
  );
};
