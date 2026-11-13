import React, { useState, useMemo } from 'react';
import { Header } from './components/shell/Header';
import { GradeSelector } from './components/shell/GradeSelector';
import { UnitCategoryBar } from './components/shell/UnitCategoryBar';
import { GameLauncherCard } from './components/shell/GameLauncherCard';
import { GameFilterBar, TeachingMomentFilter, SkillCategoryFilter, StatusFilter, PlayerFilter, StreamFilter, SortOption } from './components/shell/GameFilterBar';
import { PictureDictionaryBrowser } from './components/dictionary/PictureDictionaryBrowser';
import { AlphabetComparisonStudio } from './components/alphabet/AlphabetComparisonStudio';
import { StudentPortal } from './components/student/StudentPortal';
import { GameContainer } from './components/common/GameContainer';
import { StudentDrawModal } from './components/common/StudentDrawModal';
import { DiceModal } from './components/common/DiceModal';
import { DailyRoutineModal } from './components/common/DailyRoutineModal';
import { UnitPickerModal } from './components/shell/UnitPickerModal';
import { GAME_REGISTRY } from './games/registry';
import { useClassroom } from './context/ClassroomContext';
import { useVocabulary } from './context/VocabularyContext';
import { useLanguage } from './context/LanguageContext';
import { Play, Sparkles, RefreshCw, Star } from 'lucide-react';
import { QuizHostContainer } from './games/quiz/host/QuizHostContainer';
import { QuizStudentContainer } from './games/quiz/student/QuizStudentContainer';
import { AnticipationHostContainer, AnticipationSoloContainer } from './games/anticipation';
import { WhatsMissingGame } from './games/missing';
import { ConcentrationGame } from './games/concentration';
import { ThreeHintsGame } from './games/three_hints';
import { SpeedFlashGame } from './games/speed_flash';
import { PixelRevealGame } from './games/pixel_reveal';
import { KeywordGame } from './games/keyword';
import { LiveBingoGame } from './games/bingo';
import { TimebombGame } from './games/timebomb';
import { ClockMasterGame } from './games/clock/ClockMasterGame';
import { Challenge60sGame } from './games/challenge_60s';
import { CrissCrossGame } from './games/criss_cross';
import { TyphoonGame } from './games/typhoon';
import { KatakanaBreakerGame } from './games/katakana_breaker';
import { TownModelInspector } from './games/town_navigator/TownModelInspector';
import { TownNavigator } from './games/town_navigator/TownNavigator';
import { SuzukaGrandPrixContainer } from './games/suzuka_grand_prix/SuzukaGrandPrixContainer';
import { DreamTownContainer } from './games/dream_town/DreamTownContainer';
import { MysteryPencilCaseGame } from './games/mystery_pencil_case';
import { MonsterMakerGame } from './games/monster_maker';
import { JankenWorksheetStudio } from './games/janken_worksheet';
import { ProfileStudioHost } from './games/profile_studio/ProfileStudioHost';
import { TeacherPinGate } from './components/shell/TeacherPinGate';
import { ClassroomReportsHub } from './components/teacher/ClassroomReportsHub';
import { QRGuideStepPreview } from './components/student/QRGuideStepPreview';
import { ensureAnonymousAuth } from './services/firebase';
import { initMobileFullscreenOnFirstTouch } from './utils/mobileFullscreen';

export const App: React.FC = () => {
  const qrGuideStep = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('qrGuideStep') : null;
  if (qrGuideStep) {
    return <QRGuideStepPreview step={parseInt(qrGuideStep, 10)} />;
  }
  const { userRole, isTeacherUnlocked, activeView, activeGameId, activeGrade, exitToHub, launchGame, pinnedGameIds, isContestantMode, setIsContestantMode } = useClassroom();
  const { isLoading, gradeWords } = useVocabulary();
  const { t } = useLanguage();
  const [activeGameExitHandler, setActiveGameExitHandler] = useState<(() => void) | null>(null);
  const [hostQuizStep, setHostQuizStep] = useState<string>('SETUP');

  // Eagerly establish verified anonymous session & mobile/tablet fullscreen listener
  React.useEffect(() => {
    ensureAnonymousAuth().catch(() => {});
    return initMobileFullscreenOnFirstTouch();
  }, []);

  const isTeacherRoute = (() => {
    try {
      const p = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      return p.includes('/teacher') || p.includes('/admin') || p.includes('/reports') || params.get('role') === 'teacher' || params.get('view') === 'reports';
    } catch {
      return false;
    }
  })();

  // Game Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeachingMoment, setSelectedTeachingMoment] = useState<TeachingMomentFilter>('ALL');
  const [selectedSkill, setSelectedSkill] = useState<SkillCategoryFilter>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL');
  const [selectedStream, setSelectedStream] = useState<StreamFilter>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerFilter>('ALL');
  const [selectedSort, setSelectedSort] = useState<SortOption>('PLAYABLE_FIRST');

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTeachingMoment('ALL');
    setSelectedSkill('ALL');
    setSelectedStatus('ALL');
    setSelectedStream('ALL');
    setSelectedPlayer('ALL');
  };

  const handleRegisterExit = React.useCallback((fn: (() => void) | null) => {
    setActiveGameExitHandler(() => fn);
  }, []);

  const totalGamesCount = GAME_REGISTRY.length;
  const readyGamesCount = GAME_REGISTRY.filter(g => g.status === 'ready').length;

  const teachingMomentCounts = useMemo<Record<TeachingMomentFilter, number>>(() => {
    return {
      ALL: GAME_REGISTRY.length,
      WARM_UP: GAME_REGISTRY.filter(g =>
        ['speed_flash', 'whats_missing', 'pixel_reveal', 'katakana_breaker', 'clock_master', 'anticipation'].includes(g.id) ||
        g.skills.some(s => s.includes('Speed') || s.includes('Memory') || s.includes('Recall') || s.includes('Warm-Up') || s.includes('Choral') || s.includes('Phonics'))
      ).length,
      SPEAKING: GAME_REGISTRY.filter(g =>
        ['three_hints', 'criss_cross', 'keyword_game', 'challenge_60s', 'mystery_pencil_case'].includes(g.id) ||
        g.skills.some(s => s.includes('Speaking') || s.includes('Fluency') || s.includes('Q&A') || s.includes('TPR'))
      ).length,
      TEAM_BATTLE: GAME_REGISTRY.filter(g =>
        ['typhoon', 'concentration', 'timebomb', 'live_bingo', 'eigo_arena', 'anticipation'].includes(g.id) ||
        g.minPlayers.includes('Teams') || g.minPlayers.includes('Pairs') || g.skills.some(s => s.includes('Strategy') || s.includes('Cooperation'))
      ).length,
      IPAD: GAME_REGISTRY.filter(g =>
        ['eigo_arena', 'live_bingo', 'anticipation'].includes(g.id) ||
        g.stream === 'STREAM_B' || g.minPlayers.includes('iPads')
      ).length
    };
  }, []);

  const pinnedGames = useMemo(() => {
    return GAME_REGISTRY.filter(g => pinnedGameIds?.includes(g.id) && g.status === 'ready');
  }, [pinnedGameIds]);

  const filteredAndSortedGames = useMemo(() => {
    let list = GAME_REGISTRY;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.jaTitle.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.jaDescription.toLowerCase().includes(q) ||
        g.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    // Teaching Moment Filter
    if (selectedTeachingMoment !== 'ALL') {
      list = list.filter(g => {
        switch (selectedTeachingMoment) {
          case 'WARM_UP':
            return (
              ['speed_flash', 'whats_missing', 'pixel_reveal', 'katakana_breaker', 'clock_master', 'anticipation'].includes(g.id) ||
              g.skills.some(s => s.includes('Speed') || s.includes('Memory') || s.includes('Recall') || s.includes('Warm-Up') || s.includes('Choral') || s.includes('Phonics'))
            );
          case 'SPEAKING':
            return (
              ['three_hints', 'criss_cross', 'keyword_game', 'challenge_60s'].includes(g.id) ||
              g.skills.some(s => s.includes('Speaking') || s.includes('Fluency') || s.includes('Q&A') || s.includes('TPR'))
            );
          case 'TEAM_BATTLE':
            return (
              ['typhoon', 'concentration', 'timebomb', 'live_bingo', 'eigo_arena', 'anticipation'].includes(g.id) ||
              g.minPlayers.includes('Teams') || g.minPlayers.includes('Pairs') || g.skills.some(s => s.includes('Strategy') || s.includes('Cooperation'))
            );
          case 'IPAD':
            return (
              ['eigo_arena', 'live_bingo', 'anticipation'].includes(g.id) ||
              g.stream === 'STREAM_B' || g.minPlayers.includes('iPads')
            );
          default:
            return true;
        }
      });
    }

    // Status filter
    if (selectedStatus === 'READY') {
      list = list.filter(g => g.status === 'ready');
    } else if (selectedStatus === 'ROADMAP') {
      list = list.filter(g => g.status !== 'ready');
    }

    // Stream filter
    if (selectedStream !== 'ALL') {
      list = list.filter(g => g.stream === selectedStream);
    }

    // Player filter
    if (selectedPlayer === 'WHOLE_CLASS') {
      list = list.filter(g => g.minPlayers.includes('Whole Class'));
    } else if (selectedPlayer === 'TEAMS') {
      list = list.filter(g => g.minPlayers.includes('Teams') || g.minPlayers.includes('Pairs'));
    } else if (selectedPlayer === 'IPADS') {
      list = list.filter(g => g.minPlayers.includes('iPads') || g.stream === 'STREAM_B');
    } else if (selectedPlayer === 'SOLO') {
      list = list.filter(g => g.minPlayers.includes('Solo') || g.stream === 'STREAM_C');
    }

    // Skill category filter
    if (selectedSkill !== 'ALL') {
      list = list.filter(g => {
        switch (selectedSkill) {
          case 'LISTENING':
            return g.skills.some(s => s.includes('Listening'));
          case 'SPEAKING':
            return g.skills.some(s => s.includes('Speaking') || s.includes('Fluency') || s.includes('Choral'));
          case 'READING_PHONICS':
            return g.skills.some(s => s.includes('Reading') || s.includes('Phonics') || s.includes('Grammar') || s.includes('Word Recognition'));
          case 'MEMORY_SPEED':
            return g.skills.some(s => s.includes('Memory') || s.includes('Speed') || s.includes('Recall') || s.includes('Recognition') || s.includes('Reasoning'));
          case 'TEAM_BATTLE':
            return g.skills.some(s => s.includes('Strategy') || s.includes('Cooperation')) || g.minPlayers.includes('Teams');
          case 'TPR_MOVEMENT':
            return g.skills.some(s => s.includes('TPR') || s.includes('Kinesthetic'));
          default:
            return true;
        }
      });
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (selectedSort === 'PLAYABLE_FIRST') {
        const rank = (status: string) => (status === 'ready' ? 0 : status === 'in_development' ? 1 : 2);
        const diff = rank(a.status) - rank(b.status);
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
      }
      if (selectedSort === 'NAME_EN') {
        return a.title.localeCompare(b.title);
      }
      if (selectedSort === 'NAME_JA') {
        return a.jaTitle.localeCompare(b.jaTitle, 'ja');
      }
      return 0;
    });
  }, [searchQuery, selectedTeachingMoment, selectedStatus, selectedStream, selectedPlayer, selectedSkill, selectedSort]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl animate-bounce">
          <Sparkles size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">Levi-Sensei English Hub</h1>
        <p className="text-sm font-bold text-amber-400 mb-6">リヴァイ先生の英語教室を準備中...</p>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Loading 857 curriculum vocabulary cards & audio...</span>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // Active Game View
    if (activeView === 'GAME') {
      if (activeGameId === 'eigo_arena') {
        const isTeacherContestant = isContestantMode || (typeof window !== 'undefined' && sessionStorage.getItem('isTeacherContestantMode') === 'true');
        if (userRole === 'STUDENT' || !isTeacherUnlocked || isTeacherContestant) {
          return (
            <div className="fixed inset-0 z-50 w-screen h-dvh bg-slate-900 text-white flex flex-col overflow-hidden">
              <QuizStudentContainer onExit={() => {
                setIsContestantMode(false);
                try {
                  sessionStorage.removeItem('isTeacherContestantMode');
                  sessionStorage.removeItem('activeQuizRoomCode');
                  localStorage.removeItem('activeQuizRoomCode');
                } catch {}
                exitToHub();
              }} />
            </div>
          );
        }
        return (
          <GameContainer 
            title="Eigo Arena (Kahoot Style)" 
            jaTitle={<>ライブ4<ruby>択<rt>たく</rt></ruby>バトル</>}
            onExit={activeGameExitHandler || exitToHub}
            isScrollable={hostQuizStep === 'SETUP' || hostQuizStep === 'LOBBY' || hostQuizStep === 'GAME_OVER'}
          >
            <QuizHostContainer 
              onExit={exitToHub} 
              onRegisterExit={handleRegisterExit}
              onStepChange={setHostQuizStep}
            />
          </GameContainer>
        );
      }

      if (activeGameId === 'anticipation') {
        const isTeacherContestant = isContestantMode || (typeof window !== 'undefined' && sessionStorage.getItem('isTeacherContestantMode') === 'true');
        if (userRole === 'STUDENT' || !isTeacherUnlocked || isTeacherContestant) {
          return (
            <GameContainer
              title="Anticipation Sketch"
              jaTitle={<>お<ruby>絵<rt>え</rt></ruby>かき<ruby>推測<rt>すいそく</rt></ruby>ボード</>}
              onExit={exitToHub}
              isScrollable={false}
            >
              <AnticipationSoloContainer onExit={exitToHub} />
            </GameContainer>
          );
        }
        return (
          <GameContainer
            title="Anticipation Sketch"
            jaTitle={<>お<ruby>絵<rt>え</rt></ruby>かき<ruby>推測<rt>すいそく</rt></ruby>ボード</>}
            onExit={activeGameExitHandler || exitToHub}
            hideScopeDropdown={hostQuizStep !== 'SETUP'}
            isScrollable={hostQuizStep === 'SETUP' || hostQuizStep === 'LOBBY' || hostQuizStep === 'GAME_OVER'}
          >
            <AnticipationHostContainer
              onExit={exitToHub}
              onRegisterExit={handleRegisterExit}
              onStepChange={setHostQuizStep}
            />
          </GameContainer>
        );
      }

      if (activeGameId === 'profile_studio') {
        return <ProfileStudioHost onExit={exitToHub} onLaunchGame={() => launchGame('eigo_arena')} />;
      }

      if (activeGameId === 'alphabet_studio') {
        return <AlphabetComparisonStudio onExit={exitToHub} />;
      }

      if (activeGameId === 'town_inspector') {
        return <TownModelInspector onExit={exitToHub} />;
      }

      if (activeGameId === 'town_navigator') {
        return <TownNavigator onExit={exitToHub} onSwitchToInspector={() => launchGame('town_inspector')} />;
      }

      if (activeGameId === 'desk_grand_prix' || activeGameId === 'suzuka_grand_prix') {
        return <SuzukaGrandPrixContainer />;
      }

      if (activeGameId === 'dream_town') {
        return <DreamTownContainer onExit={exitToHub} />;
      }

      if (activeGameId === 'whats_missing') {
        return (
          <GameContainer title="What's Missing?" jaTitle={<><ruby>何<rt>なに</rt></ruby>が<ruby>消<rt>き</rt></ruby>えた？</>}>
            <WhatsMissingGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'concentration') {
        return (
          <GameContainer title="Concentration (Memory Match)" jaTitle={<><ruby>神経衰弱<rt>しんけいすいじゃく</rt></ruby>・えあわせ</>}>
            <ConcentrationGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'three_hints') {
        return (
          <GameContainer title="Three-Hint Master" jaTitle="3ヒントクイズ">
            <ThreeHintsGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'speed_flash') {
        return (
          <GameContainer title="Speed Flashcard Race" jaTitle="スピードフラッシュ">
            <SpeedFlashGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'pixel_reveal') {
        return (
          <GameContainer title="Pixel Reveal" jaTitle="ピクセル・リビール">
            <PixelRevealGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'keyword_game') {
        return (
          <GameContainer title="Keyword Grab Game" jaTitle="キーワードゲーム">
            <KeywordGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'live_bingo') {
        return (
          <GameContainer title="Live Classroom Bingo" jaTitle={<><ruby>電子<rt>でんし</rt></ruby>クラスビンゴ</>}>
            <LiveBingoGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'timebomb') {
        return (
          <GameContainer title="Hot Potato & Pop Relay" jaTitle="ホットポテト＆ポップ・リレー">
            <TimebombGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'clock_master') {
        return (
          <GameContainer title="What Time Is It?" jaTitle={<><ruby>今<rt>いま</rt></ruby><ruby>何時<rt>なんじ</rt></ruby>？<ruby>時計<rt>とけい</rt></ruby>マスター</>}>
            <ClockMasterGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'challenge_60s') {
        return (
          <GameContainer title="60-Second Class Sprint" jaTitle={<>60<ruby>秒<rt>びょう</rt></ruby>クラスチャレンジ</>}>
            <Challenge60sGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'criss_cross') {
        return (
          <GameContainer title="Criss-Cross Q&A" jaTitle={<><ruby>全員起立<rt>ぜんいんきりつ</rt></ruby>！クリスクロス</>}>
            <CrissCrossGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'typhoon') {
        return (
          <GameContainer title="Typhoon Team Battle" jaTitle={<>タイフーン・チームバトル</>}>
            <TyphoonGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'katakana_breaker') {
        return (
          <GameContainer title="Katakana Breaker Chant" jaTitle={<>バナナじゃなくて <span className="text-amber-500">banana</span></>}>
            <KatakanaBreakerGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'mystery_pencil_case') {
        return (
          <GameContainer 
            title="Mystery Pencil Case" 
            jaTitle={<><ruby>不思議<rt>ふしぎ</rt></ruby>な<ruby>筆箱<rt>ふでばこ</rt></ruby></>}
          >
            <MysteryPencilCaseGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'monster_maker') {
        return (
          <GameContainer 
            title="Monster Lab & Printable Worksheets" 
            jaTitle={<><ruby>モンスター<rt>もんすたー</rt></ruby>・ラボ & ワークシート<ruby>印刷<rt>いんさつ</rt></ruby></>}
          >
            <MonsterMakerGame onExit={exitToHub} />
          </GameContainer>
        );
      }

      if (activeGameId === 'janken_worksheet') {
        return (
          <GameContainer
            title="English Janken Worksheet Studio"
            jaTitle={<>えい<ruby>語<rt>ご</rt></ruby>でじゃんけん プリント<ruby>作成<rt>さくせい</rt></ruby></>}
            hideScopeDropdown
            isScrollable
          >
            <JankenWorksheetStudio onExit={exitToHub} />
          </GameContainer>
        );
      }

      const game = GAME_REGISTRY.find(g => g.id === activeGameId) || GAME_REGISTRY[0];
      return (
        <GameContainer title={game.title} jaTitle={game.jaTitle}>
          <div className="bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-md md:max-w-3xl w-full border-2 border-slate-700 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-6 text-center md:text-left">
              <div className={`w-16 h-16 mx-auto md:mx-0 rounded-2xl bg-gradient-to-tr ${game.color} flex items-center justify-center mb-3 shadow-lg`}>
                <Sparkles size={32} className="text-white animate-spin-slow" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-1">{game.title}</h2>
              <p className="text-sm font-black text-amber-400 mb-3">{game.jaTitle}</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Ready to play with <strong>{gradeWords.length} words</strong> from <strong>{activeGrade}</strong>!
              </p>
            </div>
            <div className="md:col-span-6 flex flex-col justify-between gap-4">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700 text-xs text-left space-y-1.5">
                <span className="font-bold text-slate-400 block mb-1">Game Engine Plug-and-Play Slot:</span>
                <p className="text-emerald-400 font-mono">✓ Shell loaded successfully</p>
                <p className="text-emerald-400 font-mono">✓ Vocabulary dataset ready ({gradeWords.length} words)</p>
                <p className="text-emerald-400 font-mono">✓ Grade artwork attached</p>
              </div>
              <button
                onClick={() => alert('Activity engine is ready to load next!')}
                className={`w-full py-3.5 rounded-2xl font-black text-base text-white bg-gradient-to-r ${game.color} shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer`}
              >
                START GAME
              </button>
            </div>
          </div>
        </GameContainer>
      );
    }

    // Active Alphabet Comparison Studio View
    if (activeView === 'ALPHABET') {
      return <AlphabetComparisonStudio onExit={exitToHub} />;
    }

    // Active Dictionary View
    if (activeView === 'DICTIONARY') {
      return (
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col">
          <Header />
          <GradeSelector />
          <UnitCategoryBar />
          <main className="flex-1">
            <PictureDictionaryBrowser />
          </main>
        </div>
      );
    }

    // Active Classroom Reports & Debrief Hub View
    if (activeView === 'REPORTS') {
      return (
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col">
          <Header />
          <main className="flex-1">
            <ClassroomReportsHub />
          </main>
        </div>
      );
    }

    // Teacher PIN Gate (if attempting to access /teacher or /admin while session is locked)
    if (isTeacherRoute && !isTeacherUnlocked) {
      return <TeacherPinGate />;
    }

    // Active Student Portal View (Default for students or when teacher mode is locked)
    if (userRole === 'STUDENT' || !isTeacherUnlocked) {
      const isStudentInActiveQuiz = typeof window !== 'undefined' && (
        !!sessionStorage.getItem('activeQuizRoomCode') ||
        new URLSearchParams(window.location.search).has('pin')
      );
      if (isStudentInActiveQuiz) {
        return (
          <main className="fixed inset-0 z-50 w-screen h-dvh overflow-hidden bg-slate-950">
            <StudentPortal />
          </main>
        );
      }
      return (
        <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col">
          <Header />
          <main className="flex-1">
            <StudentPortal />
          </main>
        </div>
      );
    }

    // Active Teacher Hub View (Streamlined & Filterable across all 88 activities)
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Header />
        <UnitCategoryBar />

        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span>{t("Classroom Activities & Roadmap", "クラス英語アクティビティ & 開発ロードマップ")}</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                  {activeGrade}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t(
                  "Select your unit above, then launch activities for TV projection (Stream 🅰️), student iPads (Stream 🅱️), or solo study (Stream 🅲).",
                  "上の単元を選択して、テレビ画面投影（Stream 🅰️）、生徒iPad対戦（Stream 🅱️）、個人学習（Stream 🅲）を開始してください。"
                )}
              </p>
            </div>
          </div>

          {/* Interactive Filter & Sort Bar */}
          <GameFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTeachingMoment={selectedTeachingMoment}
            onTeachingMomentChange={setSelectedTeachingMoment}
            teachingMomentCounts={teachingMomentCounts}
            selectedSkill={selectedSkill}
            onSkillChange={setSelectedSkill}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            selectedStream={selectedStream}
            onStreamChange={setSelectedStream}
            selectedPlayer={selectedPlayer}
            onPlayerChange={setSelectedPlayer}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            totalCount={totalGamesCount}
            filteredCount={filteredAndSortedGames.length}
            readyCount={readyGamesCount}
            onResetFilters={handleResetFilters}
          />

          {/* Pinned for Today Section (Visible on default view when games are pinned) */}
          {pinnedGames.length > 0 && selectedTeachingMoment === 'ALL' && !searchQuery.trim() && selectedStatus === 'ALL' && (
            <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-500/5 border-2 border-amber-300 dark:border-amber-700/60 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                    <Star size={14} fill="currentColor" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {t("Pinned for Today's Lesson", "本日の授業予定アクティビティ")}
                  </h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                    {pinnedGames.length}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  {t("Instant 1-tap launcher for today's activities", "本日の授業で使うゲームを1タップですぐ起動できます")}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedGames.map(game => (
                  <GameLauncherCard key={`pinned-${game.id}`} game={game} />
                ))}
              </div>
            </div>
          )}

          {/* Games Grid or Empty State */}
          {filteredAndSortedGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedGames.map(game => (
                <GameLauncherCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto my-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                <Sparkles size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                {t("No activities match your filters", "条件に一致するゲームが見つかりませんでした")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                {t(
                  "Try clearing search terms or selecting 'All Streams' / 'All Skills'.",
                  "検索ワードを変更するか、「全ストリーム」または「全スキル」を選択してください。"
                )}
              </p>
              <button
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition flex items-center gap-2 mx-auto shadow-md"
              >
                <RefreshCw size={14} />
                <span>{t("Reset all filters", <>すべてのフィルターを<ruby>解除<rt>かいじょ</rt></ruby></>)}</span>
              </button>
            </div>
          )}
        </main>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      <UnitPickerModal />
      <StudentDrawModal />
      <DiceModal />
      <DailyRoutineModal />
    </>
  );
};