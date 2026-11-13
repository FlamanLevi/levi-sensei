import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  QuizPlayer, 
  ClassroomAward, 
  QuizQuestion, 
  GameMode, 
  TeamId, 
  TeamScoreData, 
  TEAM_PRESETS,
  GamePlayType,
  SprintSettings,
  PodiumFinisher,
  QuizRoomState
} from '../types';
import { SessionAnalytics } from '@/types/analytics';
import { computeSessionAnalytics } from '@/services/analyticsEngine';
import { ExecutiveDebriefView } from '@/components/teacher/ExecutiveDebriefView';
import { soundEffects } from '@/services/soundEffects';
import { 
  Trophy, 
  Award, 
  Volume2, 
  RotateCcw, 
  Home, 
  Sparkles, 
  AlertCircle, 
  BookOpen, 
  Star, 
  Users,
  Flag,
  Clock,
  Flame,
  CheckCircle2
} from 'lucide-react';

import { useLanguage } from '@/context/LanguageContext';
import { SchoolId, getClassSize } from '@/types/roster';
import { speechService } from '@/services/speechService';
import { useClassroomClicker } from '@/hooks/useClassroomClicker';
import { ClassroomBlackoutShutter } from '@/components/common/ClassroomBlackoutShutter';
import { resolveRacerNumber } from '@/games/suzuka_grand_prix/kartPresets';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { getShopItemById } from '@/services/shopCatalog';
import { ClassVaultState, subscribeClassVault, getNextTierTarget } from '@/services/classVault';

function renderPlayerIdentity(
  player: { nickname?: string; attendanceNumber?: number; id?: string; playerId?: string; avatar?: string; frame?: string; title?: string },
  size: 'sm' | 'md' | 'lg' = 'md'
) {
  const num = player.attendanceNumber || resolveRacerNumber(player);
  const nick = player.nickname || 'Student';
  const hasNumInNick = nick.includes('番') || nick.startsWith('#');
  const avatar = player.avatar || '🇯🇵';
  const frame = player.frame;
  const titleItem = player.title ? getShopItemById(player.title) : null;
  const titleLabel = titleItem ? titleItem.jaName : player.title;

  const avatarSize = size === 'lg' ? 'w-8 h-8 text-xl' : size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-6 h-6 text-sm';

  return (
    <div className="inline-flex items-center justify-center gap-1.5 min-w-0 max-w-full">
      <AvatarDisplay avatar={avatar} frameId={frame} sizeClassName={avatarSize} />
      {num > 0 && !hasNumInNick && (
        <span
          className={`shrink-0 font-mono font-black rounded-lg bg-indigo-600 text-white shadow-xs ${
            size === 'lg'
              ? 'px-2 py-0.5 text-sm sm:text-base'
              : size === 'sm'
              ? 'px-1 py-0.2 text-[9px]'
              : 'px-1.5 py-0.5 text-xs'
          }`}
        >
          #{num}
        </span>
      )}
      <span className="truncate">{nick}</span>
      {titleLabel && size !== 'sm' && (
        <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 leading-none">
          {titleLabel}
        </span>
      )}
    </div>
  );
}

interface TroubleWordItem {
  english: string;
  ja: string;
  image?: string;
  sound?: string;
  incorrectCount: number;
  totalCount: number;
}

interface QuizHostGameOverProps {
  players: Record<string, QuizPlayer>;
  awards: ClassroomAward[];
  troubleWords: Record<string, TroubleWordItem>;
  questions?: QuizQuestion[];
  schoolId?: SchoolId;
  classId?: string;
  gameMode?: GameMode;
  teamScores?: Partial<Record<TeamId, TeamScoreData>>;
  boundStudents?: Record<number, { playerId: string; nickname: string; score: number }>;
  onReleaseBoundNumber?: (attendanceNumber: number) => Promise<void>;
  onPlayAgainSame?: () => void;
  onPlayAgainChange?: () => void;
  onTroubleWordsRematch?: () => void;
  onPlayAgain?: () => void;
  onExit: () => void;
  gamePlayType?: GamePlayType;
  sprintSettings?: SprintSettings;
  podiumFinishers?: PodiumFinisher[];
  isSolo?: boolean;
  soloPlayer?: QuizPlayer;
  onDuckBGM?: (duck: boolean) => void;
  analytics?: SessionAnalytics;
}

export const QuizHostGameOver: React.FC<QuizHostGameOverProps> = ({
  players,
  awards,
  troubleWords,
  questions = [],
  schoolId,
  classId,
  gameMode = 'INDIVIDUAL',
  teamScores,
  boundStudents,
  onReleaseBoundNumber,
  onPlayAgainSame,
  onPlayAgainChange,
  onTroubleWordsRematch,
  onPlayAgain,
  onExit,
  gamePlayType,
  sprintSettings,
  podiumFinishers,
  isSolo = false,
  soloPlayer,
  onDuckBGM,
  analytics
}) => {
  const { t, language } = useLanguage();
  const [activeAudioWord, setActiveAudioWord] = useState<string | null>(null);
  const [isBlackout, setIsBlackout] = useState(false);
  const [viewMode, setViewMode] = useState<'PODIUM' | 'DEBRIEF'>('PODIUM');

  // Subscribe to shared Class Energy Vault
  const [classVault, setClassVault] = useState<ClassVaultState | null>(null);
  useEffect(() => {
    if (!schoolId || !classId) return;
    const unsub = subscribeClassVault(schoolId, classId, (vault) => {
      setClassVault(vault);
    });
    return () => unsub();
  }, [schoolId, classId]);

  const vaultTierInfo = classVault ? getNextTierTarget(classVault.totalEnergy) : null;

  useEffect(() => {
    onDuckBGM?.(isBlackout);
  }, [isBlackout, onDuckBGM]);

  useClassroomClicker({
    onNext: onPlayAgainSame || onPlayAgain || onExit,
    onBlankScreen: () => setIsBlackout(b => !b)
  });

  // Play fanfare and shoot confetti on mount
  useEffect(() => {
    soundEffects.playFanfare();

    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const isMathRound = useMemo(() => questions.some(q => q.isMath), [questions]);

  const playTroubleAudio = (word: { english: string; sound?: string }) => {
    if (isMathRound) return;
    setActiveAudioWord(word.english);
    speechService.speak(word.english, {
      onStart: () => {
        setActiveAudioWord(word.english);
        onDuckBGM?.(true);
      },
      onEnd: () => {
        setActiveAudioWord(null);
        onDuckBGM?.(false);
      }
    });
  };

  const computedAnalytics: SessionAnalytics = useMemo(() => {
    if (analytics) return analytics;
    const roomState: QuizRoomState = {
      code: 'LIVE',
      hostId: 'host',
      status: 'GAME_OVER',
      players,
      questions,
      schoolId: schoolId || 'toyogaoka',
      classId: classId || 'Table',
      gamePlayType: gamePlayType || 'SPRINT_RACE',
      mode: gameMode,
      grade: classId && /^\d+-\d+$/.test(classId) ? `Grade ${classId.charAt(0)}` : 'Elementary',
      unit: 'Curriculum Unit',
      deliveryStream: isSolo ? 'STREAM_A_FRONT_SCREEN' : 'STREAM_B_MULTIPLAYER',
      ipadDisplayMode: 'MIRRORED',
      totalQuestions: questions.length,
      currentQuestionIndex: questions.length,
      currentQuestion: null,
      teamScores: teamScores || {},
      awardToggles: { effortGrowth: true, skillChallenge: true, funSurprise: true },
      boundStudents
    };
    return computeSessionAnalytics(roomState, questions, 180);
  }, [analytics, players, questions, schoolId, classId, gamePlayType, gameMode, isSolo, teamScores, boundStudents]);

  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  const isSoloWarmup = isSolo || sortedPlayers.length === 0 || (sortedPlayers.length === 1 && sortedPlayers[0]?.id === 'stream_a_player');
  const targetSolo = soloPlayer || (sortedPlayers.find(p => p.id === 'stream_a_player') || sortedPlayers[0]);
  const soloScore = targetSolo?.score || 0;
  const soloCorrect = targetSolo?.correctCount || 0;
  const soloTotal = questions.length || targetSolo?.totalAnswered || 1;
  const soloAccuracy = soloTotal > 0 ? Math.round((soloCorrect / soloTotal) * 100) : 0;
  const soloStreak = targetSolo?.maxStreak || 0;
  const soloFastestSec = (targetSolo?.fastestTimeMs && targetSolo.fastestTimeMs < 999999)
    ? `${(targetSolo.fastestTimeMs / 1000).toFixed(1)}s`
    : '—';

  // Performance cheer & grade
  let performanceTitle = t('GREAT EFFORT! 👏', 'ナイスチャレンジ！👏');
  let performanceDesc = isMathRound
    ? t('Great job practicing today! Keep it up!', 'クラス全員で集中して算数の練習ができました！')
    : t('Great job practicing today! Keep it up!', 'クラス全員で元気よく英語の練習ができました！');
  let performanceBadge = '👍 GOOD';
  let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';

  if (soloAccuracy === 100) {
    performanceTitle = t('PERFECT SCORE! 🏆', '満点達成！パーフェクト！🏆');
    performanceDesc = isMathRound
      ? t('Flawless mastery! Every single question answered correctly!', '全問正解！素晴らしい計算力です！完璧に解けていますね。')
      : t('Flawless mastery! Every single question answered correctly!', '全問正解！素晴らしい英語力です！完璧に覚えていますね。');
    performanceBadge = '🌟 PERFECT MASTER';
    badgeColor = 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30';
  } else if (soloAccuracy >= 80) {
    performanceTitle = t('EXCELLENT WORK! 🌟', 'たいへんよくできました！🌟');
    performanceDesc = isMathRound
      ? t('Outstanding performance! High accuracy across the board.', 'すばらしい正解率！ほとんどの問題をマスターしています。')
      : t('Outstanding performance! High accuracy across the board.', 'すばらしい正解率！ほとんどの単語をマスターしています。');
    performanceBadge = '🎉 EXCELLENT';
    badgeColor = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300';
  } else if (soloAccuracy >= 60) {
    performanceTitle = t('GREAT EFFORT! 👏', 'よくがんばりました！👏');
    performanceDesc = isMathRound
      ? t('Good practice today! Review the tricky questions to score even higher.', 'しっかり練習できました！苦手な問題を復習してさらにレベルアップしよう。')
      : t('Good practice today! Review the tricky words to score even higher.', 'しっかり練習できました！苦手な単語を復習してさらにレベルアップしよう。');
    performanceBadge = '👍 GOOD EFFORT';
    badgeColor = 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-300';
  }

  // Team rankings
  const isTug = gamePlayType === 'TUG_OF_WAR';
  const isVolleyball = gamePlayType === 'VOLLEYBALL';
  let displayTeamKeys: TeamId[];
  if (isTug || isVolleyball) {
    displayTeamKeys = ['team_red', 'team_white'];
  } else {
    const activeTeamKeys = (Object.keys(TEAM_PRESETS) as TeamId[]).filter((tId) => {
      const hasPlayers = Object.values(players).some(p => p.teamId === tId);
      const memberCount = teamScores?.[tId]?.memberCount || 0;
      return hasPlayers || memberCount > 0;
    });
    displayTeamKeys = activeTeamKeys.length > 0 ? activeTeamKeys : (['team_red', 'team_white'] as TeamId[]);
  }

  const sortedTeams = displayTeamKeys.map((tId) => {
    const data = teamScores?.[tId] || {
      name: TEAM_PRESETS[tId].name,
      jaName: TEAM_PRESETS[tId].jaName,
      score: 0,
      correctCount: 0,
      memberCount: 0,
      averageScore: 0,
      color: TEAM_PRESETS[tId].color,
      emoji: TEAM_PRESETS[tId].emoji
    };
    return {
      id: tId,
      preset: TEAM_PRESETS[tId],
      ...data
    };
  }).sort((a, b) => b.averageScore - a.averageScore || b.score - a.score);

  const teamWinner = sortedTeams[0];
  const teamSecond = sortedTeams.length > 1 ? sortedTeams[1] : undefined;
  const teamThird = sortedTeams.length > 2 ? sortedTeams[2] : undefined;
  const teamFourth = sortedTeams.length > 3 ? sortedTeams[3] : undefined;

  const isSprint = gamePlayType === 'SPRINT_RACE' || gamePlayType === 'GRAND_PRIX_3D' || !!sprintSettings || (podiumFinishers && podiumFinishers.length > 0);
  const isTimeTrial = sprintSettings?.sprintMode === 'TIME_TRIAL';
  const is3DRace = gamePlayType === 'GRAND_PRIX_3D';
  const totalLaps = is3DRace
    ? (sprintSettings?.targetLaps3D || 1)
    : (sprintSettings?.lapCount === -1 ? questions.length : (sprintSettings?.lapCount || questions.length));

  const getPlayerLap = (p?: QuizPlayer) => {
    if (!p) return 0;
    if (is3DRace) {
      return Math.min(totalLaps, Math.max(1, Math.floor((p.distanceMeters || 0) / 2566.6) + 1));
    }
    return p.sprintProgress || 0;
  };

  const formatFinishTime = (ms?: number) => {
    if (!ms || ms <= 0) return '—';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}.${tenths}s`;
    }
    return `${s}.${tenths}s`;
  };

  const classifiedRacers = useMemo(() => {
    const list = Object.values(players);
    const is3DRace = gamePlayType === 'GRAND_PRIX_3D';
    return list.sort((a, b) => {
      if (!isTimeTrial) {
        if (a.isFinished && !b.isFinished) return -1;
        if (!a.isFinished && b.isFinished) return 1;
        if (a.isFinished && b.isFinished) {
          return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
        }
        if (is3DRace && (b.distanceMeters || 0) !== (a.distanceMeters || 0)) {
          return (b.distanceMeters || 0) - (a.distanceMeters || 0);
        }
        if ((b.sprintProgress || 0) !== (a.sprintProgress || 0)) {
          return (b.sprintProgress || 0) - (a.sprintProgress || 0);
        }
        return b.score - a.score;
      } else {
        if (is3DRace && (b.distanceMeters || 0) !== (a.distanceMeters || 0)) {
          return (b.distanceMeters || 0) - (a.distanceMeters || 0);
        }
        if (b.correctCount !== a.correctCount) {
          return b.correctCount - a.correctCount;
        }
        return b.score - a.score;
      }
    });
  }, [players, isTimeTrial, gamePlayType]);

  const sprintPodium = useMemo(() => {
    if (podiumFinishers && podiumFinishers.length >= Math.min(3, classifiedRacers.length)) {
      return podiumFinishers.map(p => {
        const base = players[p.playerId];
        return {
          ...p,
          avatar: p.avatar || base?.avatar,
          frame: p.frame || base?.frame,
          title: p.title || base?.title,
          attendanceNumber: p.attendanceNumber || base?.attendanceNumber
        };
      });
    }
    return classifiedRacers.slice(0, 3).map((p, idx) => ({
      playerId: p.id,
      nickname: p.nickname,
      finishTimeMs: p.finishTimeMs || 0,
      rank: p.finishRank || (idx + 1),
      teamId: p.teamId,
      correctCount: p.correctCount,
      totalAnswered: p.totalAnswered,
      avatar: p.avatar,
      frame: p.frame,
      title: p.title,
      attendanceNumber: p.attendanceNumber
    }));
  }, [podiumFinishers, classifiedRacers, isTimeTrial, players]);

  const p1 = sprintPodium.find(p => p.rank === 1) || sprintPodium[0];
  const p2 = sprintPodium.find(p => p.rank === 2) || (sprintPodium.length >= 2 && sprintPodium[1] !== p1 ? sprintPodium[1] : undefined);
  const p3 = sprintPodium.find(p => p.rank === 3) || (sprintPodium.length >= 3 && sprintPodium[2] !== p1 && sprintPodium[2] !== p2 ? sprintPodium[2] : undefined);

  // Multi-Metric Honors: Recognize Top 3 performers in different categories
  const metricHonors = useMemo(() => {
    const list = Object.values(players);
    if (list.length === 0) return null;

    // 1. Accuracy Aces (Top 3 accuracy, min 2 attempts)
    const accuracyRacers = [...list]
      .filter(p => (p.totalAnswered || 0) >= 2 && (p.correctCount || 0) > 0)
      .sort((a, b) => {
        const accB = (b.correctCount || 0) / (b.totalAnswered || 1);
        const accA = (a.correctCount || 0) / (a.totalAnswered || 1);
        return accB - accA || (b.correctCount || 0) - (a.correctCount || 0);
      })
      .slice(0, 3);

    // 2. Speed Demons (Top 3 fastest reaction times)
    const speedRacers = [...list]
      .filter(p => p.fastestTimeMs && p.fastestTimeMs > 0 && p.fastestTimeMs < 999999)
      .sort((a, b) => (a.fastestTimeMs || 999999) - (b.fastestTimeMs || 999999))
      .slice(0, 3);

    // 3. Streak Masters (Top 3 longest unbroken streaks)
    const streakRacers = [...list]
      .filter(p => (p.maxStreak || 0) >= 2)
      .sort((a, b) => (b.maxStreak || 0) - (a.maxStreak || 0))
      .slice(0, 3);

    // 4. Tenacity & Grit (Top 3 most pulls/attempts completed)
    const gritRacers = [...list]
      .filter(p => (p.totalAnswered || 0) >= 2)
      .sort((a, b) => (b.totalAnswered || 0) - (a.totalAnswered || 0) || (b.correctCount || 0) - (a.correctCount || 0))
      .slice(0, 3);

    return {
      accuracyRacers,
      speedRacers,
      streakRacers,
      gritRacers
    };
  }, [players]);

  const troubleList = Object.values(troubleWords);

  return (
    <div className="flex flex-col h-full max-w-[92vw] max-h-[92dvh] mx-auto w-full p-2 sm:p-4 text-slate-900 dark:text-white select-none overflow-y-auto relative print:max-h-none print:max-w-none print:overflow-visible print:p-0 print:h-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0 print:hidden flex-nowrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg text-white font-black text-xl shrink-0">
            {isSprint ? '🏎️' : isVolleyball ? '🧺' : isTug ? '🚩' : '🏆'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 truncate">
              <span className="truncate">
                {isSprint
                  ? (isTimeTrial ? t('F1 Time Trial Results', 'タイムアタック 結果発表！') : t('F1 Grand Prix Podium', 'グランプリ 最終結果発表！'))
                  : isVolleyball
                    ? t('Bean Bag Toss (Tamaire) Results', '運動会 玉入れ合戦 結果発表！')
                    : isTug
                      ? t('Tug of War Results', '綱引きバトル 結果発表！')
                      : gameMode === 'TEAM'
                        ? t('Team Battle Over', 'チーム対抗戦 結果発表！')
                        : t('Game Over', '最終結果発表！')}
              </span>
              {isSprint && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black tracking-wider shrink-0 whitespace-nowrap">
                  🏁 {isTimeTrial ? 'TIME TRIAL' : 'GRAND PRIX'}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {isSprint
                ? (isTimeTrial
                    ? t(`Time Trial finished! Honoring drivers with the most correct answers in ${sprintSettings?.timeLimitSeconds || 60} seconds.`, `タイムアタック終了！${sprintSettings?.timeLimitSeconds || 60}秒間で最も多く正解したドライバーを表彰します。`)
                    : t(`Lap race of ${totalLaps} laps finished! Announcing the podium winners and official classification.`, `全${totalLaps}ラップの激闘終了！チェッカーフラッグを受けた勝者と公式リザルトを発表します。`))
                : isTug
                  ? t(`Tug of War battle finished! Congratulations to the victorious ${teamWinner?.preset.jaName || 'Red Team'}!`, `つなひき対決終了！見事勝利を収めたのは ${teamWinner?.preset.jaName || '赤組'}！ 両チーム素晴らしい力闘でした。`)
                : isVolleyball
                  ? /* [ANTIGRAVITY REFACTOR]: Updated Game Over summary for Undokai Bean Bag Toss (Tamaire) */ t('Bean Bag Toss (Tamaire) finished! Fantastic throwing by both Red and White teams!', '玉入れ合戦終了！赤組も白組も最後までたくさんのお手玉を投げ入れました！')
                : gameMode === 'TEAM'
                  ? t(`The winning team is ${teamWinner?.preset.jaName || 'Red Team'}! Fantastic teamwork by all teams.`, `優勝チームは ${teamWinner?.preset.jaName || '赤組'}！ 全チーム素晴らしい団結力でした。`)
                  : isSoloWarmup
                    ? `${t('Total Score: ', '合計スコア: ')}${soloScore.toLocaleString()} pts · ${t('Accuracy: ', '正解率: ')}${soloAccuracy}% 🎉`
                    : sortedPlayers.length > 0
                      ? t('Congratulations to all students! Great effort today.', '児童のみなさんお疲れ様でした！みんなよくがんばりました。')
                      : t('Front-Screen Warmup finished! Great choral repetition drill.', 'ウォームアップ終了！元気よく発音練習ができました。')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
          {/* Class Co-Op Vault Banner */}
          {classVault && vaultTierInfo && (
            <div
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 shadow-2xs shrink-0"
              title={t(
                `Class Energy Vault: ${classVault.totalEnergy.toLocaleString()} pts. 10% of class scores are deposited here toward shared milestones!`,
                `クラス団結エナジー: ${classVault.totalEnergy.toLocaleString()} pts。全員のクイズ得点の10%がここに貯まり、クラス合同のマスコットが解放されます！`
              )}
            >
              <span className="text-xl animate-bounce">{vaultTierInfo.currentTier.badge}{vaultTierInfo.currentTier.mascotEmoji}</span>
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-900 dark:text-amber-200 leading-none mb-0.5">
                  <span>⚡ {language === 'ja' ? 'クラス団結エナジー' : 'Class Co-Op Energy'}</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                    +{Math.floor(Object.values(players).reduce((s, p) => s + (p.score || 0), 0) * 0.1).toLocaleString()} pts
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-amber-200 dark:bg-amber-900/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${vaultTierInfo.currentTier.accentGradient}`}
                      style={{ width: `${vaultTierInfo.progressPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-amber-700 dark:text-amber-300">
                    Tier {vaultTierInfo.currentTier.tier}
                  </span>
                </div>
              </div>
            </div>
          )}

          {onTroubleWordsRematch && troubleList.length > 0 && (
            <button
              onClick={onTroubleWordsRematch}
              className="px-3.5 py-2.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-md active:scale-95 transition-all flex items-center gap-1.5 animate-pulse cursor-pointer shrink-0 whitespace-nowrap"
              title={isMathRound ? t("Start targeted review round with missed math questions", "間違えた苦手問題だけでリマッチを開始") : t("Start targeted review round with missed words", "間違えた苦手単語だけでリマッチを開始")}
            >
              <AlertCircle size={15} />
              <span>{isMathRound ? t("Trouble Questions Rematch", "⚠️ 苦手問題リマッチ") : t("Trouble Words Rematch", "⚠️ 苦手単語リマッチ")} ({troubleList.length})</span>
            </button>
          )}

          <button
            onClick={onPlayAgainSame || onPlayAgain}
            className="px-3.5 py-2.5 rounded-2xl font-black text-xs text-white bg-blue-600 hover:bg-blue-500 shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            title={isSoloWarmup ? t("Play again with current settings", "同じ設定でスコアをリセットしてもう一度プレイ") : t("Play again with current settings, keeping same room PIN", "同じ部屋PINのまま、スコアをリセットして再戦")}
          >
            <RotateCcw size={15} />
            <span>{isSoloWarmup ? t("Play Again", "もう一度プレイ") : t("Play Again (Keep PIN)", "もう一度 (設定維持)")}</span>
          </button>

          {onPlayAgainChange && (
            <button
              onClick={onPlayAgainChange}
              className="px-3 py-2.5 rounded-2xl font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>⚙️</span>
              <span>{t("Change Settings", "設定変更")}</span>
            </button>
          )}

          {/* View Mode Switcher: Podium vs Debrief */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-inner shrink-0 flex-nowrap">
            <button
              onClick={() => setViewMode('PODIUM')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'PODIUM'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>🏆</span>
              <span>{t("Podium", <><ruby>表彰式<rt>ひょうしょうしき</rt></ruby></>)}</span>
            </button>
            <button
              onClick={() => setViewMode('DEBRIEF')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === 'DEBRIEF'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>📈</span>
              <span>{t("Class Debrief", <><ruby>授業分析<rt>じゅぎょうぶんせき</rt></ruby></>)}</span>
            </button>
          </div>

          <button
            onClick={onExit}
            className="px-3 py-2.5 rounded-2xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Home size={15} />
            <span>{t("Hub / Exit", "Hub (もどる)")}</span>
          </button>
        </div>
      </div>

      {viewMode === 'DEBRIEF' ? (
        <div className="py-4">
          <ExecutiveDebriefView
            analytics={computedAnalytics}
            onClose={() => setViewMode('PODIUM')}
          />
        </div>
      ) : (
        <>
          {/* Warmup Solo / Class Celebration (Stream A) */}
      {isSoloWarmup && (
        <div className="my-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-amber-50/80 via-white to-orange-50/80 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800 border-4 border-amber-300 dark:border-amber-500/40 text-center max-w-4xl mx-auto shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="text-6xl mb-3 animate-bounce">🎉</div>
          <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
            {t('FRONT-SCREEN WARMUP COMPLETE', 'ウォームアップ完了')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2">
            {performanceTitle}
          </h2>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6 max-w-xl mx-auto">
            {performanceDesc}
          </p>

          {/* 4 Solo Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-4 text-left">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-amber-300 dark:border-amber-500/30 shadow-md">
              <div className="flex items-center justify-between text-amber-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('SCORE', 'スコア')}</span>
                <Trophy size={18} />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {soloScore.toLocaleString()}
              </div>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{t('points earned', '獲得スコア')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-emerald-300 dark:border-emerald-500/30 shadow-md">
              <div className="flex items-center justify-between text-emerald-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('ACCURACY', '正解率')}</span>
                <CheckCircle2 size={18} />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {soloAccuracy}%
              </div>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{soloCorrect} / {soloTotal} {t('correct', '問正解')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-orange-300 dark:border-orange-500/30 shadow-md">
              <div className="flex items-center justify-between text-orange-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('MAX STREAK', '最高連続')}</span>
                <Flame size={18} />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {soloStreak}
              </div>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{t('in a row', '連続正解')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-indigo-300 dark:border-indigo-500/30 shadow-md">
              <div className="flex items-center justify-between text-indigo-500 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('FASTEST', '最速タイム')}</span>
                <Clock size={18} />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {soloFastestSec}
              </div>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{t('best speed', '最速正解')}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className={`px-4 py-1.5 rounded-full border text-xs font-black shadow-sm ${badgeColor}`}>
              {performanceBadge}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black border border-slate-200 dark:border-slate-700">
              {questions.length} {t('questions practiced', '問 練習完了')}
            </span>
          </div>
        </div>
      )}

      {/* 1A. TEAM MODE PODIUM */}
      {gameMode === 'TEAM' && sortedPlayers.length > 0 && !isSprint && !isSoloWarmup && (
        <div className="py-6 flex flex-col items-center">
          <div className="flex justify-center items-end gap-2 sm:gap-4 shrink-0 mb-6">
            {teamSecond && (
              <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-150">
                <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mb-1 text-center">
                  {teamSecond.preset.emoji} {language === 'ja' ? teamSecond.preset.jaName : teamSecond.preset.name}
                </span>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">
                  {t('Average: ', '平均: ')}{teamSecond.averageScore.toLocaleString()} pts
                </span>
                <div className="w-24 sm:w-32 h-32 sm:h-36 bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-t-3xl shadow-xl flex flex-col items-center justify-start pt-4 border-2 border-slate-300">
                  <span className="text-3xl font-black">🥈</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white mt-1">{t('2nd', '準優勝')}</span>
                  <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold mt-1">({teamSecond.memberCount} {t('students', '人')})</span>
                </div>
              </div>
            )}

            {teamWinner && (
              <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700">
                <div className="animate-bounce mb-1">
                  <span className="text-3xl sm:text-4xl">👑</span>
                </div>
                <span className="text-base sm:text-2xl font-black text-amber-500 dark:text-amber-400 mb-1 text-center">
                  {teamWinner.preset.emoji} {language === 'ja' ? teamWinner.preset.jaName : teamWinner.preset.name} {t('WINNER!', '優勝！')}
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 mb-2 font-mono">
                  {t('Average: ', '平均: ')}{teamWinner.averageScore.toLocaleString()} pts
                </span>
                <div className="w-32 sm:w-44 h-44 sm:h-52 bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-3xl shadow-2xl shadow-amber-500/40 flex flex-col items-center justify-start pt-5 border-4 border-yellow-300">
                  <span className="text-4xl sm:text-5xl font-black text-white">🥇</span>
                  <span className="text-sm font-black text-white tracking-widest mt-1">{t('CHAMPION', '優勝')}</span>
                  <span className="text-xs text-yellow-950 font-black mt-1">{t('Total: ', '合計: ')}{teamWinner.score.toLocaleString()} pts</span>
                  <span className="text-[11px] text-yellow-900 font-bold">({teamWinner.memberCount} {t('students', '人')})</span>
                </div>
              </div>
            )}

            {teamThird && (
              <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-300">
                <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mb-1 text-center">
                  {teamThird.preset.emoji} {language === 'ja' ? teamThird.preset.jaName : teamThird.preset.name}
                </span>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">
                  {t('Average: ', '平均: ')}{teamThird.averageScore.toLocaleString()} pts
                </span>
                <div className="w-24 sm:w-32 h-24 sm:h-28 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-3xl shadow-lg flex flex-col items-center justify-start pt-3 border-2 border-amber-600">
                  <span className="text-2xl sm:text-3xl font-black text-white">🥉</span>
                  <span className="text-xs font-black text-amber-100 mt-0.5">{t('3rd', '第3位')}</span>
                  <span className="text-[10px] text-amber-200 font-bold mt-0.5">({teamThird.memberCount} {t('students', '人')})</span>
                </div>
              </div>
            )}

            {teamFourth && (
              <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-400">
                <span className="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-400 mb-1 text-center">
                  {teamFourth.preset.emoji} {language === 'ja' ? teamFourth.preset.jaName : teamFourth.preset.name}
                </span>
                <span className="text-[11px] font-bold text-slate-400 mb-2">
                  {t('Average: ', '平均: ')}{teamFourth.averageScore.toLocaleString()} pts
                </span>
                <div className="w-20 sm:w-28 h-18 sm:h-20 bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-t-3xl shadow-md flex flex-col items-center justify-start pt-2 border-2 border-slate-300 dark:border-slate-600">
                  <span className="text-lg font-black text-slate-700 dark:text-slate-300">{t('4th', '敢闘賞')}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{t('Fighting Spirit', '敢闘賞')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Team Top 3 Contributors */}
          <div className="w-full max-w-5xl mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="text-amber-500" size={20} fill="currentColor" />
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>{t('Team Top 3 Contributors', '各チームの TOP 3 表彰')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700">
                  {t('Undokai Honors', '運動会 チーム内表彰')}
                </span>
              </h3>
            </div>

            <div className={`grid gap-4 ${sortedTeams.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
              {sortedTeams.map((teamItem) => {
                const teamMembers = Object.values(players).filter(p => p.teamId === teamItem.id);
                const topMembers = [...teamMembers].sort((a, b) => {
                  if ((b.correctCount || 0) !== (a.correctCount || 0)) {
                    return (b.correctCount || 0) - (a.correctCount || 0);
                  }
                  return (b.score || 0) - (a.score || 0);
                });

                const isRed = teamItem.id === 'team_red';
                const isWhite = teamItem.id === 'team_white';

                return (
                  <div
                    key={teamItem.id}
                    className={`p-4 sm:p-5 rounded-3xl border-3 shadow-lg flex flex-col justify-between ${
                      isRed
                        ? 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-900 border-rose-800/80 shadow-rose-950/30'
                        : isWhite
                        ? 'bg-gradient-to-b from-slate-800/40 via-slate-900 to-slate-900 border-slate-600 shadow-slate-950/30'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {/* Team Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                      <span className="text-base font-black text-white flex items-center gap-1.5">
                        <span className="text-xl">{teamItem.preset.emoji}</span>
                        <span>{language === 'ja' ? teamItem.preset.jaName : teamItem.preset.name}</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {teamMembers.length} {t('members', '名')} • {teamItem.score.toLocaleString()} pts
                      </span>
                    </div>

                    {/* Top 3 List */}
                    <div className="space-y-2">
                      {topMembers.slice(0, 3).map((member, idx) => (
                        <div
                          key={member.id}
                          className={`p-2.5 rounded-2xl flex items-center justify-between border ${
                            idx === 0
                              ? 'bg-amber-500/15 border-amber-400/60 text-amber-200 shadow-sm'
                              : idx === 1
                              ? 'bg-slate-800/80 border-slate-600/80 text-slate-200'
                              : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">
                              {idx === 0 ? '👑' : idx === 1 ? '🥈' : '🥉'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-black text-sm text-white truncate block">
                                {member.nickname}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {idx === 0 ? t('Team MVP', 'チームMVP') : `${idx + 1}${t('nd Contributor', '位 貢献')}`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-amber-400 text-sm block">
                              {member.correctCount || 0} {t('pulls', '回')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {(member.score || 0).toLocaleString()} pts
                            </span>
                          </div>
                        </div>
                      ))}

                      {topMembers.length === 0 && (
                        <div className="text-xs text-slate-500 italic py-3 text-center">
                          {t('No member stats recorded', '記録されたメンバーがいません')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sports Day Multi-Metric Special Honors (運動会 特別賞 - Top 3 Per Metric) */}
          {metricHonors && (
            <div className="w-full max-w-5xl mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Award className="text-amber-400" size={20} />
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <span>{t('Sports Day Special Honors', '運動会 特別賞 (マルチ指標表彰)')}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-bold border border-indigo-700">
                    {t('Diverse Recognition', '多様な活躍を称える表彰')}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Accuracy Aces (百発百中賞) */}
                <div className="p-3.5 rounded-3xl bg-slate-900 border-2 border-blue-800/60 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-blue-900/60 pb-2 mb-2">
                      <span className="font-black text-xs sm:text-sm text-blue-300 flex items-center gap-1.5">
                        <span className="text-lg">🎯</span>
                        <span><ruby>百発百中<rt>ひゃっぱつひゃくちゅう</rt></ruby>賞</span>
                      </span>
                      <span className="text-[10px] text-blue-400 font-bold">Accuracy Aces</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {t('Highest accuracy with least mud slips!', 'ミスなく正確に答え続けた精密プレイヤー！')}
                    </p>
                    <div className="space-y-1.5">
                      {metricHonors.accuracyRacers.map((p, idx) => {
                        const acc = p.totalAnswered > 0 ? Math.round((p.correctCount / p.totalAnswered) * 100) : 0;
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-xl bg-slate-800/80">
                            <span className="font-bold text-white truncate max-w-[140px] flex items-center gap-1">
                              <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                              {renderPlayerIdentity(p, 'sm')}
                            </span>
                            <span className="font-mono font-black text-blue-300 text-[11px]">
                              {acc}% ({p.correctCount}/{p.totalAnswered})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Speed Demons (電光石火賞) */}
                <div className="p-3.5 rounded-3xl bg-slate-900 border-2 border-amber-800/60 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-amber-900/60 pb-2 mb-2">
                      <span className="font-black text-xs sm:text-sm text-amber-300 flex items-center gap-1.5">
                        <span className="text-lg">⚡</span>
                        <span><ruby>電光石火<rt>でんこうせっか</rt></ruby>賞</span>
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">Speed Stars</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {t('Lightning fast reflex answers!', '電光石火の早押しスピード！')}
                    </p>
                    <div className="space-y-1.5">
                      {metricHonors.speedRacers.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-xl bg-slate-800/80">
                          <span className="font-bold text-white truncate max-w-[140px] flex items-center gap-1">
                            <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                            {renderPlayerIdentity(p, 'sm')}
                          </span>
                          <span className="font-mono font-black text-amber-300 text-[11px]">
                            {((p.fastestTimeMs || 1000) / 1000).toFixed(1)}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Streak Masters (炎のストリーク賞) */}
                <div className="p-3.5 rounded-3xl bg-slate-900 border-2 border-rose-800/60 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-rose-900/60 pb-2 mb-2">
                      <span className="font-black text-xs sm:text-sm text-rose-300 flex items-center gap-1.5">
                        <span className="text-lg">🔥</span>
                        <span><ruby>炎<rt>ほのお</rt></ruby>のストリーク賞</span>
                      </span>
                      <span className="text-[10px] text-rose-400 font-bold">Streak Kings</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {t('Longest consecutive correct streak!', '勢いを引き寄せた怒涛の連続正解！')}
                    </p>
                    <div className="space-y-1.5">
                      {metricHonors.streakRacers.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-xl bg-slate-800/80">
                          <span className="font-bold text-white truncate max-w-[140px] flex items-center gap-1">
                            <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                            {renderPlayerIdentity(p, 'sm')}
                          </span>
                          <span className="font-mono font-black text-rose-400 text-[11px]">
                            🔥 x{p.maxStreak || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Iron Tenacity (粘り強さ賞) */}
                <div className="p-3.5 rounded-3xl bg-slate-900 border-2 border-emerald-800/60 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2 mb-2">
                      <span className="font-black text-xs sm:text-sm text-emerald-300 flex items-center gap-1.5">
                        <span className="text-lg">🛡️</span>
                        <span><ruby>粘<rt>ねば</rt></ruby>り<ruby>強<rt>づよ</rt></ruby>さ賞</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Iron Grit</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {t('Most total pulls attempted without quitting!', '最後まで挑み続けた不屈の闘志！')}
                    </p>
                    <div className="space-y-1.5">
                      {metricHonors.gritRacers.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-xl bg-slate-800/80">
                          <span className="font-bold text-white truncate max-w-[140px] flex items-center gap-1">
                            <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                            {renderPlayerIdentity(p, 'sm')}
                          </span>
                          <span className="font-mono font-black text-emerald-300 text-[11px]">
                            💪 {p.totalAnswered} {t('pulls', '回挑戦')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1B. INDIVIDUAL MODE PODIUM */}
      {gameMode === 'INDIVIDUAL' && sortedPlayers.length > 0 && !isSprint && !isSoloWarmup && (
        <div className="py-8 flex justify-center items-end gap-3 sm:gap-6 shrink-0">
          {second && (
            <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-150">
              <div className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200 mb-1 max-w-[160px] truncate text-center">
                {renderPlayerIdentity(second, 'md')}
              </div>
              <span className="text-xs font-bold text-slate-400 mb-2">{second.score.toLocaleString()} pts</span>
              <div className="relative w-28 sm:w-36 h-36 sm:h-44 select-none">
                <div className="absolute top-0 inset-x-0 h-8 rounded-t-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 border-t-3 border-x-3 border-slate-100 shadow-inner flex items-center justify-center">
                  <span className="text-[10px] font-black text-slate-700 tracking-wider">2ND PLACE</span>
                </div>
                <div className="absolute top-6 inset-x-0 bottom-0 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 rounded-b-2xl border-3 border-slate-500 shadow-[0_10px_20px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center p-3">
                  <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-md">🥈</span>
                  <span className="text-xs font-black text-slate-900 mt-1">2nd</span>
                </div>
              </div>
            </div>
          )}

          {winner && (
            <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700">
              <div className="animate-bounce mb-2">
                <span className="text-5xl filter drop-shadow-[0_4px_16px_rgba(251,191,36,0.8)]">👑</span>
              </div>
              <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 border-3 border-amber-600 shadow-[0_4px_15px_rgba(245,158,11,0.5)] text-slate-950 font-black text-lg sm:text-xl mb-2 max-w-[240px] truncate text-center flex items-center justify-center">
                {renderPlayerIdentity(winner, 'lg')}
              </div>
              <div className="relative w-36 sm:w-48 h-52 sm:h-60 select-none">
                <div className="absolute top-0 inset-x-0 h-9 rounded-t-3xl bg-gradient-to-r from-yellow-200 via-amber-200 to-yellow-300 border-t-4 border-x-4 border-yellow-100 shadow-inner flex items-center justify-center">
                  <span className="text-xs font-black text-amber-950 tracking-widest uppercase">1ST PLACE</span>
                </div>
                <div className="absolute top-7 inset-x-0 bottom-0 bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 rounded-b-3xl border-4 border-amber-600 shadow-[0_12px_30px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center p-3">
                  <span className="text-5xl sm:text-6xl font-black text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
                    🥇
                  </span>
                  <span className="text-sm sm:text-base font-black text-amber-950 tracking-wider mt-0.5">
                    {t('CHAMPION', '優勝')}
                  </span>
                  <span className="text-xs font-mono font-black text-yellow-950 bg-yellow-300/90 px-3 py-0.5 rounded-full mt-1.5 shadow-xs">
                    {winner.score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            </div>
          )}

          {third && (
            <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-300">
              <div className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200 mb-1 max-w-[160px] truncate text-center">
                {renderPlayerIdentity(third, 'md')}
              </div>
              <span className="text-xs font-bold text-slate-400 mb-2">{third.score.toLocaleString()} pts</span>
              <div className="relative w-28 sm:w-36 h-28 sm:h-34 select-none">
                <div className="absolute top-0 inset-x-0 h-8 rounded-t-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 border-t-3 border-x-3 border-amber-400 shadow-inner flex items-center justify-center">
                  <span className="text-[10px] font-black text-amber-100 tracking-wider">3RD PLACE</span>
                </div>
                <div className="absolute top-6 inset-x-0 bottom-0 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 rounded-b-2xl border-3 border-amber-900 shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center p-3">
                  <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">🥉</span>
                  <span className="text-xs font-black text-amber-200 mt-1">3rd</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1C. F1 GRAND PRIX SPRINT PODIUM */}
      {isSprint && sortedPlayers.length > 0 && !isSoloWarmup && (
        <div className="py-6 flex flex-col items-center">
          {p1 && (
            <div className="flex justify-center items-end gap-2 sm:gap-5 shrink-0 mb-8 pt-2">
              {p2 && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-150">
                  <div className="flex items-center justify-center gap-1 mb-1 max-w-[180px] text-center">
                    {p2.teamId && TEAM_PRESETS[p2.teamId] && (
                      <span className="text-xs shrink-0">{TEAM_PRESETS[p2.teamId].emoji}</span>
                    )}
                    <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate text-center">
                      {renderPlayerIdentity(p2, 'md')}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-black text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-center gap-1.5">
                    <span>{isTimeTrial ? `${p2.correctCount} ${t('correct', '問正解')}` : p2.finishTimeMs ? formatFinishTime(p2.finishTimeMs) : `Lap ${getPlayerLap(players[p2.playerId])}/${totalLaps}`}</span>
                    {!isTimeTrial && p1.finishTimeMs && p2.finishTimeMs && (
                      <span className="text-[10px] text-slate-400">(+{((p2.finishTimeMs - p1.finishTimeMs) / 1000).toFixed(1)}s)</span>
                    )}
                  </div>
                  <div className="w-36 sm:w-48 md:w-52 h-36 sm:h-46 bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-t-3xl shadow-xl flex flex-col items-center justify-start pt-4 px-2 border-2 border-slate-300 text-center">
                    <span className="text-3xl sm:text-4xl font-black">🥈</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1">2nd</span>
                    <span className="text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 font-bold mt-1">
                      {p2.correctCount}/{p2.totalAnswered} {t('correct', '正解')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700">
                <div className="animate-bounce mb-1">
                  <span className="text-3xl sm:text-4xl">👑</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 mb-1 max-w-[240px] text-center">
                  {p1.teamId && TEAM_PRESETS[p1.teamId] && (
                    <span className="text-sm shrink-0">{TEAM_PRESETS[p1.teamId].emoji}</span>
                  )}
                  <span className="text-base sm:text-2xl font-black text-amber-500 dark:text-amber-400 truncate text-center">
                    {renderPlayerIdentity(p1, 'lg')}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-mono font-black text-slate-700 dark:text-slate-200 mb-2 flex items-center justify-center gap-1">
                  <Flag size={13} className="text-amber-500" />
                  <span>{isTimeTrial ? `${p1.correctCount} ${t('correct', '問正解')}` : formatFinishTime(p1.finishTimeMs)}</span>
                </div>
                <div className="w-56 sm:w-64 md:w-72 h-48 sm:h-60 bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-3xl shadow-2xl shadow-amber-500/40 flex flex-col items-center justify-start pt-5 px-3 border-4 border-yellow-300 text-center">
                  <span className="text-4xl sm:text-5xl font-black text-white">🥇</span>
                  <span className="text-xs sm:text-sm md:text-base font-black text-white tracking-wider mt-1 text-center w-full block">
                    {isTimeTrial ? t('SPEED CHAMPION', '最速チャンピオン') : t('GRAND PRIX WINNER', 'グランプリ優勝')}
                  </span>
                  <span className="text-xs sm:text-sm text-yellow-950 font-black mt-1 text-center w-full block">
                    {t('Accuracy: ', '正解率: ')}{p1.totalAnswered > 0 ? Math.round((p1.correctCount / p1.totalAnswered) * 100) : 0}%
                  </span>
                  <span className="text-[11px] sm:text-xs text-yellow-900 font-bold text-center w-full block">
                    ({p1.correctCount}/{p1.totalAnswered} {t('correct', '正解')})
                  </span>
                </div>
              </div>

              {p3 && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-500 delay-300">
                  <div className="flex items-center justify-center gap-1 mb-1 max-w-[180px] text-center">
                    {p3.teamId && TEAM_PRESETS[p3.teamId] && (
                      <span className="text-xs shrink-0">{TEAM_PRESETS[p3.teamId].emoji}</span>
                    )}
                    <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate text-center">
                      {renderPlayerIdentity(p3, 'md')}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-black text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-center gap-1.5">
                    <span>{isTimeTrial ? `${p3.correctCount} ${t('correct', '問正解')}` : p3.finishTimeMs ? formatFinishTime(p3.finishTimeMs) : `Lap ${getPlayerLap(players[p3.playerId])}/${totalLaps}`}</span>
                    {!isTimeTrial && p1.finishTimeMs && p3.finishTimeMs && (
                      <span className="text-[10px] text-slate-400">(+{((p3.finishTimeMs - p1.finishTimeMs) / 1000).toFixed(1)}s)</span>
                    )}
                  </div>
                  <div className="w-36 sm:w-48 md:w-52 h-26 sm:h-34 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-3xl shadow-lg flex flex-col items-center justify-start pt-3 px-2 border-2 border-amber-600 text-center">
                    <span className="text-2xl sm:text-3xl font-black text-white">🥉</span>
                    <span className="text-xs sm:text-sm font-black text-amber-100 mt-0.5">3rd</span>
                    <span className="text-[10px] sm:text-xs text-amber-200 font-bold mt-0.5">
                      {p3.correctCount}/{p3.totalAnswered} {t('correct', '正解')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Official F1 Classification & Results Board */}
          <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden mb-6">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏁</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    {t('OFFICIAL RACE CLASSIFICATION', '全ドライバー公式順位')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isTimeTrial
                      ? `${t('Time Trial', 'タイムアタック')} (${sprintSettings?.timeLimitSeconds || 60}s) • ${classifiedRacers.length} ${t('Racers Competed', '名参戦')}`
                      : `${t('Lap Race', '周回レース')} (${totalLaps} Laps) • ${classifiedRacers.filter(r => r.isFinished).length} ${t('Finished', '名完走')} / ${classifiedRacers.filter(r => r.isDnf).length} DNF`}
                  </p>
                </div>
              </div>
              <div className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center gap-1.5">
                <Clock size={13} />
                <span>{t('OFFICIAL TIMING', '公式タイム')}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <span className="col-span-2 sm:col-span-1 text-center">{t('POS', '順位')}</span>
              <span className="col-span-4 sm:col-span-4">{t('DRIVER', 'ドライバー')}</span>
              <span className="col-span-3 sm:col-span-3 text-center">{t('RESULT / TIME', '記録 / タイム')}</span>
              <span className="hidden sm:block sm:col-span-2 text-center">{t('ACCURACY', '正解率')}</span>
              <span className="col-span-3 sm:col-span-2 text-right">{t('SCORE', 'スコア')}</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {classifiedRacers.map((racer, idx) => {
                const isRacerWinner = idx === 0;
                const isRacerDnf = !isTimeTrial && !racer.isFinished;
                const accuracy = racer.totalAnswered > 0 ? Math.round((racer.correctCount / racer.totalAnswered) * 100) : 0;
                const teamInfo = racer.teamId ? TEAM_PRESETS[racer.teamId] : null;

                return (
                  <div
                    key={racer.id}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 text-xs transition-colors ${
                      idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'
                    } hover:bg-amber-50/30 dark:hover:bg-slate-800/50`}
                  >
                    <div className="col-span-2 sm:col-span-1 flex justify-center">
                      <span className={`px-2 py-0.5 rounded-lg font-black font-mono text-xs ${
                        idx === 0
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-400'
                          : idx === 1
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                          : idx === 2
                          ? 'bg-amber-900/20 text-amber-800 dark:text-amber-400 border border-amber-700/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        P{idx + 1}
                      </span>
                    </div>

                    <div className="col-span-4 sm:col-span-4 flex items-center gap-1.5 min-w-0">
                      {teamInfo && (
                        <span className="text-xs shrink-0" title={language === 'ja' ? teamInfo.jaName : teamInfo.name}>
                          {teamInfo.emoji}
                        </span>
                      )}
                      <div className="font-black text-slate-900 dark:text-white truncate">
                        {renderPlayerIdentity(racer, 'sm')}
                      </div>
                      {racer.maxStreak >= 3 && (
                        <span className="hidden sm:inline-flex items-center text-[10px] font-bold text-amber-500 shrink-0">
                          🔥{racer.maxStreak}
                        </span>
                      )}
                    </div>

                    <div className="col-span-3 sm:col-span-3 flex justify-center items-center gap-1 text-center">
                      {isTimeTrial ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs">
                          {racer.correctCount} {t('correct', '問正解')}
                        </span>
                      ) : isRacerDnf ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-black text-[11px]">
                          DNF (Lap {getPlayerLap(racer)}/{totalLaps})
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 font-mono font-black">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatFinishTime(racer.finishTimeMs)}
                          </span>
                          {!isRacerWinner && p1?.finishTimeMs && racer.finishTimeMs && (
                            <span className="hidden sm:inline text-[10px] text-slate-400">
                              (+{(((racer.finishTimeMs - p1.finishTimeMs)) / 1000).toFixed(1)}s)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="hidden sm:flex sm:col-span-2 justify-center items-center gap-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {accuracy}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({racer.correctCount}/{racer.totalAnswered})
                      </span>
                    </div>

                    <div className="col-span-3 sm:col-span-2 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                      {racer.score.toLocaleString()} pts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Classroom Awards Showcase (Full Bilingual Localization) */}
      {awards.length > 0 && (
        <div className="my-6">
          <div className="flex items-center gap-2 mb-3">
            <Award className="text-amber-500" size={20} />
            <h3 className="text-lg font-black tracking-tight">{t('Classroom Awards', '特別表彰')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {awards.map((aw) => {
              const displayDescription = language === 'ja'
                ? (aw.jaDescription || aw.description)
                : (aw.enDescription || aw.description);

              return (
                <div
                  key={aw.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-md flex items-start gap-3.5 hover:border-amber-400 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-100 to-amber-200 dark:from-amber-950 dark:to-amber-900 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    {aw.badge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {language === 'ja' ? aw.jaTitle : aw.title}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        {language === 'ja' ? aw.title : aw.jaTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {displayDescription}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {aw.recipients.map((rec, rIdx) => (
                        <span
                          key={rIdx}
                          className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-black text-xs"
                        >
                          {rec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2.5 Classroom Roster & iPad Binding Status */}
      {classId && (
        <div className="my-6 p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-900/60 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎒</span>
              <div>
                <h3 className="text-base font-black text-indigo-950 dark:text-indigo-200">
                  {schoolId === 'toyogaoka' ? t('Toyogaoka Elementary', '豊ヶ丘小') : t('Futakotamagawa Elementary', '二子玉小')} {classId} {t('Attendance Binding Status', '出席番号バインド進捗')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t('Automatically saved in real time when students select their number on iPad', '生徒のiPadで出席番号が選択されるとリアルタイムに保存されます')}
                </p>
              </div>
            </div>
            {(() => {
              const classCapacity = getClassSize(schoolId, classId);
              const registeredCount = Object.keys(boundStudents || {}).length;
              const connectedCount = Object.keys(players).length;
              const attendancePercent = classCapacity > 0 ? Math.round((registeredCount / classCapacity) * 100) : 0;
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-600 text-white shadow-xs">
                    {registeredCount} / {classCapacity} {t(`registered (${attendancePercent}%)`, `名 登録済み (${attendancePercent}%)`)}
                  </span>
                  {connectedCount > 0 && connectedCount !== registeredCount && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {connectedCount} {t('connected', '台参加')}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(boundStudents || {}).map(([numStr, bData]) => {
              const num = parseInt(numStr, 10);
              return (
                <div
                  key={num}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-xs font-black shadow-2xs"
                >
                  <span className="text-indigo-600 dark:text-indigo-400">#{num}</span>
                  <span className="text-slate-800 dark:text-slate-200">{bData.nickname}</span>
                  {onReleaseBoundNumber && (
                    <button
                      onClick={() => onReleaseBoundNumber(num)}
                      className="ml-1 text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                      title={`#${num} ${t('Release registration', 'の登録を解除')}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
            {Object.keys(boundStudents || {}).length === 0 && (
              <p className="text-xs text-slate-400 font-medium italic py-1">
                {t('Waiting for students to tap their attendance number on iPad...', '生徒のiPadで出席番号がタップされるのを待っています...')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Interactive Trouble Words Choral Review */}
      {troubleList.length > 0 && (
        <div className="mt-4 p-5 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-rose-500" size={20} />
              <h3 className="text-base font-black text-rose-950 dark:text-rose-200">
                {isMathRound
                  ? t('Trouble Questions Review', 'クラスの苦手問題復習')
                  : t('Trouble Words Review', 'クラスの苦手単語復習')}
              </h3>
            </div>
            {!isMathRound && (
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {t('Tap any card to repeat pronunciation! 🗣️', 'カードをタップして発音を確認しよう！ 🗣️')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {troubleList.map((tw) => {
              const isPlaying = activeAudioWord === tw.english;
              return (
                <button
                  key={tw.english}
                  onClick={() => playTroubleAudio(tw)}
                  className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all flex items-center justify-between text-left shadow-sm group ${
                    isPlaying
                      ? 'border-rose-500 ring-2 ring-rose-400'
                      : 'border-slate-200 dark:border-slate-800 hover:border-rose-400'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-base font-black text-slate-900 dark:text-white block truncate group-hover:text-rose-600 dark:group-hover:text-rose-400">
                      {tw.english}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                      {tw.ja}
                    </span>
                  </div>
                  {!isMathRound && (
                    <div className={`p-2 rounded-xl text-white shrink-0 ${isPlaying ? 'bg-rose-500 animate-bounce' : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300'}`}>
                      <Volume2 size={16} />
                    </div>
                  )}
                </button>
              );
            })}

            {onTroubleWordsRematch && (
              <div className="col-span-2 sm:col-span-4 pt-2">
                <button
                  type="button"
                  onClick={onTroubleWordsRematch}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm shadow-lg shadow-rose-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <AlertCircle size={18} />
                  <span>
                    {isMathRound
                      ? (isSoloWarmup
                          ? t("Start Rematch with Trouble Questions", <>この<ruby>苦手<rt>にがて</rt></ruby><ruby>問題<rt>もんだい</rt></ruby>で<ruby>即座<rt>そくざ</rt></ruby>に<ruby>再戦<rt>さいせん</rt></ruby>スタート！</>)
                          : t("Start 1-Click Fast Rematch with Trouble Questions (Keep PIN)", <>この<ruby>苦手<rt>にがて</rt></ruby><ruby>問題<rt>もんだい</rt></ruby>で<ruby>即座<rt>そくざ</rt></ruby>に<ruby>再戦<rt>さいせん</rt></ruby>スタート！ (<ruby>部屋<rt>へや</rt></ruby>PIN<ruby>維持<rt>いじ</rt></ruby>)</>))
                      : (isSoloWarmup
                          ? t("Start Rematch with Trouble Words", <>この<ruby>苦手<rt>にがて</rt></ruby><ruby>単語<rt>たんご</rt></ruby>で<ruby>即座<rt>そくざ</rt></ruby>に<ruby>再戦<rt>さいせん</rt></ruby>スタート！</>)
                          : t("Start 1-Click Fast Rematch with Trouble Words (Keep PIN)", <>この<ruby>苦手<rt>にがて</rt></ruby><ruby>単語<rt>たんご</rt></ruby>で<ruby>即座<rt>そくざ</rt></ruby>に<ruby>再戦<rt>さいせん</rt></ruby>スタート！ (<ruby>部屋<rt>へや</rt></ruby>PIN<ruby>維持<rt>いじ</rt></ruby>)</>))}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Session Flashcard / Math Problems Recap */}
      {troubleList.length === 0 && questions.length > 0 && (
        <div className="mt-4 p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="text-indigo-600 dark:text-indigo-400" size={20} />
              <h3 className="text-base font-black text-indigo-950 dark:text-indigo-200">
                {isMathRound
                  ? t('Session Math Problems Recap', <><ruby>練習<rt>れんしゅう</rt></ruby><ruby>問題<rt>もんだい</rt></ruby>のまとめ<ruby>復習<rt>ふくしゅう</rt></ruby></>)
                  : t('Session Flashcard Recap', <><ruby>練習<rt>れんしゅう</rt></ruby><ruby>単語<rt>たんご</rt></ruby>のまとめ<ruby>復習<rt>ふくしゅう</rt></ruby></>)}
              </h3>
            </div>
            {!isMathRound && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {t('Tap any card to repeat pronunciation! 🗣️', <>カードをタップして<ruby>発音<rt>はつおん</rt></ruby>を<ruby>確認<rt>かくにん</rt></ruby>しよう！ 🗣️</>)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {questions.map((q) => {
              const isPlaying = activeAudioWord === q.targetWordEnglish;
              return (
                <button
                  key={q.targetWordId + q.questionIndex}
                  onClick={() => !isMathRound && playTroubleAudio({ english: q.targetWordEnglish, sound: q.promptSound })}
                  className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all flex items-center justify-between text-left shadow-sm group ${
                    isPlaying
                      ? 'border-indigo-500 ring-2 ring-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-base font-black text-slate-900 dark:text-white block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {isMathRound ? q.promptText : q.targetWordEnglish}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                      {isMathRound ? (q.targetWordJa || `正解: ${q.targetWordEnglish}`) : q.targetWordJa}
                    </span>
                  </div>
                  {!isMathRound && (
                    <div className={`p-2 rounded-xl text-white shrink-0 ${isPlaying ? 'bg-indigo-500 animate-bounce' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300'}`}>
                      <Volume2 size={16} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}

      {/* Emergency Blackout Shutter */}
      <ClassroomBlackoutShutter isOpen={isBlackout} onToggle={() => setIsBlackout(b => !b)} />
    </div>
  );
};