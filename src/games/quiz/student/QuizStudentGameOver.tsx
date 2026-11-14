import React, { useEffect, useState, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { QuizPlayer, QuizQuestion, ClassroomAward, SprintSettings, PodiumFinisher, GamePlayType } from '../types';
import { SchoolId, StudentProfile, calculateLevel, getClassSize } from '@/types/roster';
import { 
  getSavedStudentProfile, 
  claimAttendanceNumber, 
  addRewardsToProfile, 
  fetchClassBoundNumbers 
} from '@/services/studentProfile';
import { BadgeLevelUpEvent } from '@/services/badgeEngine';
import { StudentStatsModal } from '@/components/student/StudentStatsModal';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { Trophy, Award, Sparkles, ArrowLeft, Check, ShieldCheck, AlertCircle, Flag, Clock, KeyRound, X } from 'lucide-react';
import { verifyTeacherPin } from '@/context/ClassroomContext';
import { EditProfileModal } from '@/components/student/EditProfileModal';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { getShopItemById } from '@/services/shopCatalog';
import { SUZUKA_CIRCUIT_LENGTH_METERS } from '@/games/suzuka_grand_prix/engine/Suzuka3DEngine';

interface QuizStudentGameOverProps {
  player: QuizPlayer;
  allPlayers: Record<string, QuizPlayer>;
  awards?: ClassroomAward[];
  questions?: QuizQuestion[];
  totalQuestions: number;
  roomCode?: string;
  schoolId?: SchoolId;
  classId?: string;
  recordRoster?: boolean;
  boundStudents?: Record<number, { playerId: string; nickname: string; score: number }>;
  onClaimRoomNumber?: (code: string, attendanceNumber: number, playerId: string, nickname: string, score: number) => Promise<boolean>;
  onExit: () => void;
  sprintSettings?: SprintSettings;
  podiumFinishers?: PodiumFinisher[];
  gamePlayType?: GamePlayType;
}

export const QuizStudentGameOver: React.FC<QuizStudentGameOverProps> = ({
  player,
  allPlayers,
  awards = [],
  questions = [],
  totalQuestions,
  roomCode,
  schoolId,
  classId,
  recordRoster = true,
  boundStudents = {},
  onClaimRoomNumber,
  onExit,
  sprintSettings,
  podiumFinishers,
  gamePlayType
}) => {
  const [savedProfile, setSavedProfile] = useState<StudentProfile | null>(() => getSavedStudentProfile());
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [claimSuccess, setClaimSuccess] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [badgeLevelUps, setBadgeLevelUps] = useState<BadgeLevelUpEvent[]>([]);

  // Teacher PIN Override State for Seat 00
  const [isTeacherPinModalOpen, setIsTeacherPinModalOpen] = useState<boolean>(false);
  const [teacherPinInput, setTeacherPinInput] = useState<string>('');
  const [teacherPinError, setTeacherPinError] = useState<boolean>(false);

  // Rewards calculation: 1 XP per point, 1 Gold per 20 points, plus bonuses
  const earnedXp = Math.max(100, Math.floor(player.score));
  const earnedGold = Math.max(10, Math.floor(player.score / 20) + (player.correctCount * 5));

  const isSprint = gamePlayType
    ? (gamePlayType === 'SPRINT_RACE' || gamePlayType === 'GRAND_PRIX_3D')
    : (!!sprintSettings || player.sprintProgress !== undefined || player.finishTimeMs !== undefined);
  const isTugOfWar = gamePlayType === 'TUG_OF_WAR';
  const isVolleyball = gamePlayType === 'TAMAIRE' || gamePlayType === 'VOLLEYBALL';
  const isTimeTrial = sprintSettings?.sprintMode === 'TIME_TRIAL';
  const isLapRace = isSprint && !isTimeTrial;
  const isDnf = !isTimeTrial ? !!player.isDnf : false;

  const is3DRace = gamePlayType === 'GRAND_PRIX_3D';

  const sortedPlayers = Object.values(allPlayers).sort((a, b) => {
    if (isSprint && isLapRace) {
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;
      if (a.isFinished && b.isFinished) {
        return (a.finishTimeMs || 999999) - (b.finishTimeMs || 999999);
      }
      if (is3DRace && (b.distanceMeters || 0) !== (a.distanceMeters || 0)) {
        return (b.distanceMeters || 0) - (a.distanceMeters || 0);
      }
      return ((b.sprintProgress || 0) - (a.sprintProgress || 0)) || (b.score - a.score);
    }
    if (isSprint && isTimeTrial) {
      if (is3DRace && (b.distanceMeters || 0) !== (a.distanceMeters || 0)) {
        return (b.distanceMeters || 0) - (a.distanceMeters || 0);
      }
      if ((b.correctCount || 0) !== (a.correctCount || 0)) {
        return (b.correctCount || 0) - (a.correctCount || 0);
      }
      return (b.score || 0) - (a.score || 0);
    }
    return b.score - a.score;
  });

  const computedRank = sortedPlayers.findIndex(p => p.id === player.id) + 1;
  const effectiveRank = player.finishRank || computedRank;
  const totalPlayers = sortedPlayers.length;
  const { t, language } = useLanguage();

  // Personal Stats Calculations (Feature 2)
  const isAsyncPooled = isSprint || isTugOfWar || isVolleyball;
  const recordedAnswerCount = Object.keys(player.answers || {}).length;
  const personalAnswered = (player.totalAnswered && player.totalAnswered > 0)
    ? player.totalAnswered
    : recordedAnswerCount > 0
    ? recordedAnswerCount
    : 0;

  const totalAttempts = isAsyncPooled
    ? Math.max(1, personalAnswered || player.correctCount || 1)
    : Math.max(1, personalAnswered || totalQuestions || (player.correctCount > 0 ? player.correctCount : 1));
  const accuracyPct = Math.min(100, Math.round(((player.correctCount || 0) / totalAttempts) * 100));
  const displayTotalQ = isAsyncPooled
    ? (personalAnswered || player.correctCount || 1)
    : (totalQuestions || personalAnswered || totalAttempts);
  const rewardTotalQuestions = isAsyncPooled
    ? (personalAnswered || player.correctCount || 1)
    : (personalAnswered || totalQuestions || player.correctCount || 1);
  const maxStreakVal = player.maxStreak || player.currentStreak || 0;
  const fastestSpeedVal = player.fastestTimeMs && player.fastestTimeMs < 999999 
    ? (player.fastestTimeMs / 1000).toFixed(1) + 's' 
    : '-';

  const answerList = Object.values(player.answers || {});
  const validCorrectAnswers = answerList.filter(
    a => a && a.isCorrect && typeof a.timeTakenMs === 'number' && a.timeTakenMs > 0
  );
  const avgTimeMs = validCorrectAnswers.length > 0
    ? validCorrectAnswers.reduce((acc, a) => acc + (a.timeTakenMs || 0), 0) / validCorrectAnswers.length
    : (player.fastestTimeMs && player.fastestTimeMs < 999999 ? player.fastestTimeMs : 0);
  const avgSpeedVal = avgTimeMs > 0 ? (avgTimeMs / 1000).toFixed(1) + 's' : '-';

  const myAwards = awards.filter(award => award.recipients.includes(player.nickname));

  // Dynamic Personal Awards Calculation (Feature 2)
  const personalAwards = useMemo(() => {
    const list: { emoji: string; title: string; desc: string }[] = [];

    // From teacher awards
    myAwards.forEach(a => {
      const title = language === 'ja' ? (a.jaTitle || a.title) : (a.title || a.jaTitle);
      const desc = language === 'ja' ? (a.jaDescription || a.description) : (a.enDescription || a.description);
      list.push({
        emoji: a.badge || '🎖️',
        title,
        desc
      });
    });

    // Dynamic superlative awards across players
    if (allPlayers && Object.keys(allPlayers).length > 1) {
      const playersArr = Object.values(allPlayers);
      const topStreak = Math.max(...playersArr.map(p => p.maxStreak || 0));
      if (topStreak > 1 && (player.maxStreak || 0) === topStreak && !list.some(a => a.emoji === '🔥')) {
        list.push({
          emoji: '🔥',
          title: t('Streak Master', '最大連続正解賞'),
          desc: t(`Highest streak with ${topStreak} in a row!`, `クラス最高 ${topStreak} 問連続正解！`)
        });
      }

      const topCorrect = Math.max(...playersArr.map(p => p.correctCount || 0));
      if (topCorrect > 0 && player.correctCount === topCorrect && !list.some(a => a.emoji === '🎯')) {
        list.push({
          emoji: '🎯',
          title: t('Sniper Award', '最多正解賞'),
          desc: t(`Most questions answered correctly (${topCorrect})!`, `クラス最多の ${topCorrect} 問正解！`)
        });
      }

      if (accuracyPct === 100 && totalAttempts >= 3 && !list.some(a => a.emoji === '⭐')) {
        list.push({
          emoji: '⭐',
          title: t('Perfectionist', 'パーフェクト賞'),
          desc: t('100% accuracy on all questions!', '全問正解達成！')
        });
      }
    }

    return list;
  }, [myAwards, allPlayers, player, accuracyPct, totalAttempts, language, t]);

  const additionalStatsPayload = useMemo(() => {
    // 1. Award IDs
    const ids: string[] = myAwards.map(a => a.id);
    if (allPlayers && Object.keys(allPlayers).length > 1) {
      const playersArr = Object.values(allPlayers);
      const topStreak = Math.max(...playersArr.map(p => p.maxStreak || 0));
      if (topStreak > 1 && (player.maxStreak || 0) === topStreak && !ids.includes('on_fire')) {
        ids.push('on_fire');
      }
      const topCorrect = Math.max(...playersArr.map(p => p.correctCount || 0));
      if (topCorrect > 0 && player.correctCount === topCorrect && !ids.includes('sniper')) {
        ids.push('sniper');
      }
      if (accuracyPct === 100 && totalAttempts >= 3 && !ids.includes('perfectionist')) {
        ids.push('perfectionist');
      }
    }
    if (effectiveRank === 1 && !ids.includes('champion')) {
      ids.push('champion');
    }
    if (effectiveRank <= 3 && !isDnf && !ids.includes('podium')) {
      ids.push('podium');
    }

    // 2. Trouble questions
    const troubleQuestions = (questions || []).length > 0 && player.answers
      ? Object.values(player.answers).map(ans => {
          if (!ans || typeof ans.questionIndex !== 'number') return null;
          const q = questions[ans.questionIndex % questions.length];
          if (!q) return null;
          return {
            wordId: q.targetWordId,
            english: q.targetWordEnglish,
            japanese: q.targetWordJa,
            isCorrect: !!ans.isCorrect
          };
        }).filter(Boolean) as { wordId: string; english: string; japanese: string; isCorrect: boolean }[]
      : undefined;

    // 3. Answer times
    const totalAnswerTimeMs = answerList.reduce((sum, a) => sum + (a?.timeTakenMs || 0), 0);
    const totalCorrectTimeMs = validCorrectAnswers.reduce((sum, a) => sum + (a.timeTakenMs || 0), 0);

    return {
      awardIds: ids,
      maxStreak: maxStreakVal,
      fastestTimeMs: player.fastestTimeMs,
      totalAnswerTimeMs,
      totalCorrectTimeMs,
      rank: effectiveRank,
      troubleQuestions
    };
  }, [myAwards, allPlayers, player, accuracyPct, totalAttempts, effectiveRank, isDnf, questions, maxStreakVal, answerList, validCorrectAnswers]);

  const hasAutoAwardedRef = useRef(false);

  // Auto-award if already bound to an iPad profile (Protected against iPad sleep/wake, tab switches, and remounts)
  useEffect(() => {
    if (!savedProfile || !recordRoster || roomCode?.startsWith('9') || classId === 'TEST') return;

    const sessionKey = `${roomCode || 'noroom'}_${savedProfile.attendanceNumber}_${player.score}_${player.correctCount}`;
    
    // 1. Session-level guard: never award the same game payload more than once on this device
    try {
      if (sessionStorage.getItem(`quiz_awarded_${sessionKey}`) === 'true') {
        hasAutoAwardedRef.current = true;
        return;
      }
    } catch {}

    if (hasAutoAwardedRef.current) return;
    hasAutoAwardedRef.current = true;

    try {
      sessionStorage.setItem(`quiz_awarded_${sessionKey}`, 'true');
    } catch {}

    // 2. Deposit rewards directly into the student's OWN profile!
    addRewardsToProfile(
      savedProfile.schoolId, 
      savedProfile.classId, 
      savedProfile.attendanceNumber, 
      earnedXp, 
      earnedGold,
      player.correctCount,
      rewardTotalQuestions,
      sessionKey,
      additionalStatsPayload
    ).then(updated => {
      if (updated) {
        setSavedProfile(updated);
        setClaimSuccess(true);
        if (updated.levelUps && updated.levelUps.length > 0) {
          setBadgeLevelUps(updated.levelUps);
          soundEffects.playFanfare();
          confetti({ particleCount: 75, spread: 80, origin: { y: 0.5 } });
        }
      }
    });

    // 3. If official teacher game AND student belongs to this exact room's class, bind roster attendance!
    if (
      recordRoster && 
      schoolId && 
      classId && 
      savedProfile.schoolId === schoolId && 
      savedProfile.classId === classId && 
      roomCode && 
      onClaimRoomNumber
    ) {
      onClaimRoomNumber(
        roomCode, 
        savedProfile.attendanceNumber, 
        player.id, 
        player.nickname, 
        player.score
      );
    }
  }, [savedProfile, schoolId, classId, recordRoster, earnedXp, earnedGold, player, totalQuestions, roomCode, onClaimRoomNumber, isSprint, additionalStatsPayload]);

  useEffect(() => {
    soundEffects.playFanfare();
    if (effectiveRank <= 3 && !isDnf) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  }, [effectiveRank, isDnf]);

  const handleSelectNumber = (num: number) => {
    soundEffects.playTick();
    if (num === 0) {
      const isAlreadyUnlocked = sessionStorage.getItem('levi_sensei_teacher_unlocked') === 'true' || savedProfile?.attendanceNumber === 0;
      if (!isAlreadyUnlocked) {
        setTeacherPinInput('');
        setTeacherPinError(false);
        setIsTeacherPinModalOpen(true);
        return;
      }
    }
    setSelectedNumber(num);
    setIsConfirming(true);
    setClaimError(null);
  };

  const handleTeacherPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifyTeacherPin(teacherPinInput)) {
      soundEffects.playFanfare();
      sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');
      localStorage.setItem('levi_sensei_role', 'TEACHER');
      setIsTeacherPinModalOpen(false);
      setTeacherPinInput('');
      setTeacherPinError(false);
      setSelectedNumber(0);
      setIsConfirming(true);
      setClaimError(null);
    } else {
      soundEffects.playIncorrect();
      setTeacherPinError(true);
    }
  };

  const handleConfirmClaim = async () => {
    if (selectedNumber === null || selectedNumber === undefined || !schoolId || !classId) return;
    setIsClaiming(true);
    setClaimError(null);

    try {
      // 1. Check room collision first (students only, seat 0 is teacher tester)
      if (selectedNumber > 0 && roomCode && onClaimRoomNumber) {
        const roomSuccess = await onClaimRoomNumber(
          roomCode, 
          selectedNumber, 
          player.id, 
          player.nickname, 
          player.score
        );
        if (!roomSuccess) {
          setClaimError(`${selectedNumber}番はすでに別の人が選択しました！別の番号をえらんでね。`);
          setIsClaiming(false);
          setIsConfirming(false);
          return;
        }
      }

      // If teacher seat 00, ensure teacher unlock flag is saved
      if (selectedNumber === 0) {
        try {
          sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');
          localStorage.setItem('levi_sensei_role', 'TEACHER');
        } catch {}
      }

      const sessionKey = `${roomCode || 'noroom'}_${selectedNumber}_${player.score}_${player.correctCount}`;
      try {
        sessionStorage.setItem(`quiz_awarded_${sessionKey}`, 'true');
      } catch {}

      // 2. Save to cloud and bind local device
      const newProfile = await claimAttendanceNumber(
        schoolId,
        classId,
        selectedNumber,
        selectedNumber === 0 ? (player.nickname || '先生') : player.nickname,
        earnedXp,
        earnedGold,
        selectedNumber === 0 ? '👨‍🏫' : undefined,
        player.correctCount,
        rewardTotalQuestions,
        sessionKey,
        selectedNumber === 0 ? '👑' : undefined,
        selectedNumber === 0 ? 'TEACH' : undefined,
        additionalStatsPayload
      );

      setSavedProfile(newProfile);
      setClaimSuccess(true);
      setIsConfirming(false);
      setIsClaiming(false);
      if (newProfile.levelUps && newProfile.levelUps.length > 0) {
        setBadgeLevelUps(newProfile.levelUps);
      }

      soundEffects.playCorrect();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 }
      });
    } catch (err: any) {
      console.error('Error claiming number:', err);
      setClaimError(err.message || '登録に失敗しました。もう一度お試しください。');
      setIsClaiming(false);
    }
  };

  const getRankBadge = () => {
    if (isDnf) {
      return { icon: '⏱️', title: language === 'ja' ? 'タイムアップ (完走ならず)' : 'DNF (Time Expired)', color: 'text-rose-500' };
    }
    if (effectiveRank === 1) return { icon: '🥇', title: isSprint ? (language === 'ja' ? '第1位 (グランプリ王者)' : '1st Place! (Grand Prix Champion)') : (language === 'ja' ? '第1位 (優勝)' : '1st Place!'), color: 'text-amber-500' };
    if (effectiveRank === 2) return { icon: '🥈', title: isSprint ? (language === 'ja' ? '第2位 (表彰台)' : '2nd Place! (Podium Finisher)') : (language === 'ja' ? '第2位 (準優勝)' : '2nd Place!'), color: 'text-slate-600 dark:text-slate-300' };
    if (effectiveRank === 3) return { icon: '🥉', title: isSprint ? (language === 'ja' ? '第3位 (表彰台)' : '3rd Place! (Podium Finisher)') : (language === 'ja' ? '第3位' : '3rd Place!'), color: 'text-amber-700' };
    return { 
      icon: isSprint ? '🏎️' : isTugOfWar ? '🪢' : isVolleyball ? '🧺' : '🌟', 
      title: language === 'ja' ? `${effectiveRank}位 / ${totalPlayers}人` : `#${effectiveRank} of ${totalPlayers}`, 
      color: 'text-purple-500' 
    };
  };

  const rankBadge = getRankBadge();

  return (
    <div className="w-full max-w-6xl h-full min-h-0 mx-auto select-none flex flex-col justify-center animate-in zoom-in-95 duration-200">
      <div className="w-full h-full min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* LEFT COLUMN (md:col-span-5): Pinned Player Summary, Stats, Rewards & Actions */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border-4 border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-0 md:overflow-y-auto text-center">
          <div className="flex flex-col items-center">
            {/* Compact Header Row: Avatar + Rank + Title */}
            <div className="flex items-center justify-center gap-3.5 mb-2.5">
              <div className="relative shrink-0">
                <AvatarDisplay
                  avatar={player.avatar || savedProfile?.avatar || '🇯🇵'}
                  frameId={player.frame || savedProfile?.equipped?.frame}
                  sizeClassName="w-16 h-16 sm:w-18 sm:h-18 text-3xl sm:text-4xl"
                />
                <div className="absolute -bottom-1.5 -right-1.5 text-2xl filter drop-shadow animate-bounce">
                  {rankBadge.icon}
                </div>
              </div>

              <div className="text-left min-w-0">
                {(player.title || savedProfile?.equipped?.title) && (() => {
                  const titleId = player.title || savedProfile?.equipped?.title || '';
                  const titleItem = getShopItemById(titleId);
                  return (
                    <div className="mb-1">
                      <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 shadow-2xs truncate max-w-full">
                        {titleItem ? (language === 'ja' ? titleItem.jaName : titleItem.name) : titleId}
                      </span>
                    </div>
                  );
                })()}
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 block leading-tight">
                  {isSprint 
                    ? t('GRAND PRIX FINISHED!', 'グランプリ完走！') 
                    : isTugOfWar 
                    ? t('TUG OF WAR SHOWDOWN FINISHED!', '綱引き決着！ 🪢') 
                    : isVolleyball 
                    ? t('BEAN BAG TOSS FINISHED!', '玉入れ合戦 終了！ 🔴⚪') 
                    : t('GAME COMPLETED!', 'ゲーム終了！')}
                </span>
                <h2 className={`text-xl sm:text-2xl font-black ${rankBadge.color} tracking-tight leading-tight`}>
                  {rankBadge.title}
                </h2>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                  {t(`Great job, ${player.nickname}!`, `おつかれさまでした、${player.nickname}！`)}
                </p>
              </div>
            </div>

            {/* Total Score & Rank Banner */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 sm:p-3 mb-2.5 flex items-center justify-around shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                  {t('Total Score', 'トータルスコア')}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {player.score.toLocaleString()} <span className="text-xs font-bold text-amber-500">pts</span>
                </span>
              </div>

              <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" />

              <div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                  {t('Final Rank', '最終順位')}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-500">
                  #{effectiveRank} <span className="text-xs font-bold text-slate-600 dark:text-slate-400">/ {totalPlayers}</span>
                </span>
              </div>
            </div>

            {/* Feature 2: 4-Quadrant Personal Stats Grid */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full mb-2.5">
              <div className="p-2 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-center shadow-2xs">
                <span className="text-base block leading-none mb-0.5">🎯</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block leading-tight">
                  {accuracyPct}%
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block leading-tight">
                  {t('Accuracy', '正解率')} ({player.correctCount}/{displayTotalQ})
                </span>
              </div>

              <div className="p-2 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-center shadow-2xs">
                <span className="text-base block leading-none mb-0.5">🔥</span>
                <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 block leading-tight">
                  {maxStreakVal}
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block leading-tight">
                  {t('Max Streak', '最高連続')}
                </span>
              </div>

              <div className="p-2 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 text-center shadow-2xs">
                <span className="text-base block leading-none mb-0.5">⚡</span>
                <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 block leading-tight">
                  {fastestSpeedVal}
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block leading-tight">
                  {t('Fastest', '最速タイム')}
                </span>
              </div>

              <div className="p-2 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 text-center shadow-2xs">
                <span className="text-base block leading-none mb-0.5">⏱️</span>
                <span className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 block leading-tight">
                  {avgSpeedVal}
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block leading-tight">
                  {t('Average', '平均タイム')}
                </span>
              </div>
            </div>

            {/* Sprint Mode Race Lap / Time Detail (if Sprint Mode) */}
            {isSprint && (
              <div className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">
                  {isLapRace ? t('Sprint Result', 'スプリント結果') : t('Time Trial Result', 'タイムアタック結果')}:
                </span>
                <span className="font-black text-slate-900 dark:text-white">
                  {isLapRace
                    ? isDnf
                      ? (() => {
                          const targetLaps = sprintSettings?.targetLaps3D || 1;
                          const lapNum = is3DRace
                            ? Math.min(targetLaps, Math.max(1, Math.floor((player.distanceMeters || 0) / SUZUKA_CIRCUIT_LENGTH_METERS) + 1))
                            : (player.sprintProgress || 0);
                          const maxLaps = is3DRace ? targetLaps : totalQuestions;
                          return t(`DNF (Lap ${lapNum}/${maxLaps})`, `完走ならず (${lapNum}/${maxLaps}周)`);
                        })()
                      : player.finishTimeMs ? `${(player.finishTimeMs / 1000).toFixed(1)}s (${t('Finished', 'チェッカー完走')})` : '—'
                    : `${player.correctCount} ${t('correct', '問正解')}`}
                </span>
              </div>
            )}

            {/* Earned Rewards + Bound Profile Status Row */}
            <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/80 mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  {t('EARNED REWARDS 🎁', '獲得報酬 🎁')}
                </span>
                {savedProfile && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={12} />
                    <span>{savedProfile.classId} #{savedProfile.attendanceNumber === 0 ? '00' : savedProfile.attendanceNumber}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-around">
                <div className="flex items-center gap-1 font-black text-amber-600 dark:text-amber-400 text-sm sm:text-base">
                  <span>⭐️</span>
                  <span>+{earnedXp.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center gap-1 font-black text-amber-500 text-sm sm:text-base">
                  <span>🪙</span>
                  <span>+{earnedGold} Gold</span>
                </div>
              </div>
              {savedProfile && (
                <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60 text-[10px] text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center gap-3">
                  <span>⭐️ Lv.{savedProfile.level} ({t('Total: ', '累計 ')}{savedProfile.xp.toLocaleString()} XP)</span>
                  <span>🪙 {t('Gold: ', '所持ゴールド: ')}{savedProfile.gold}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer (Customize, Passport, Waiting Notice & Return Button) */}
          <div className="w-full flex flex-col gap-2">
            {savedProfile && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="w-full py-2.5 px-3 rounded-2xl font-black text-xs text-amber-950 dark:text-amber-100 bg-amber-100/90 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900 border-2 border-amber-300 dark:border-amber-700 active:scale-98 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="text-base">🎨</span>
                  <span className="truncate">{t('Customize Profile', 'アイコン・名前変更')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setIsStatsModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl font-black text-xs text-teal-950 dark:text-teal-100 bg-teal-100/90 hover:bg-teal-200 dark:bg-teal-950/70 dark:hover:bg-teal-900 border-2 border-teal-300 dark:border-teal-700 active:scale-98 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="text-base">📊</span>
                  <span className="truncate">{t('English Passport', '学習カルテ・バッジ')}</span>
                </button>
              </div>
            )}

            {/* Waiting for Next Round Notice + Return Button */}
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5">
                <span className="animate-pulse">⏳</span>
                <span>{t('Keep this screen open for Round 2!', 'このまま画面をとじずに待ってね！')}</span>
              </span>
              <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-medium">
                {t('When the teacher starts the next game, it will begin automatically.', '先生が次のゲームを開始すると、自動的に始まります')}
              </p>
            </div>

            <button
              onClick={onExit}
              className="w-full py-2 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>{t('Finish & Return to Portal', 'ゲームを終えてポータルにもどる')}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (md:col-span-7): Scrollable Special Awards, Badge Level-Ups, Seat Claim & Class Standings */}
        <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border-4 border-slate-100 dark:border-slate-800 flex flex-col gap-3.5 min-h-0 md:h-full md:overflow-y-auto">
          {/* SECTION B: NOT Bound Yet - Claim Your Number & iPad Binding (6-column landscape grid per GEMINI.md Rule 13) */}
          {!savedProfile && recordRoster && classId && (
            <div className="w-full p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-900 text-left shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏷️</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200">
                    {t('Save score to this iPad!', 'スコアをこのiPadに保存しよう！')}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    {t('Check the sticker (attendance number) on your iPad case and tap', 'iPadケースのシール（出席番号）を確認してタップしてね')}
                  </p>
                </div>
              </div>

              {claimError && (
                <div className="p-2 mb-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold text-center">
                  {claimError}
                </div>
              )}

              <div className="grid grid-cols-6 gap-1.5 sm:gap-2 p-2 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-indigo-100 dark:border-indigo-950">
                {[0, ...Array.from({ length: Math.max(35, getClassSize(schoolId, classId)) }, (_, i) => i + 1)].map(num => {
                  const isTeacherSeat = num === 0;
                  const isTaken = !isTeacherSeat && boundStudents && boundStudents[num] && boundStudents[num].playerId !== player.id;
                  const isMySelection = selectedNumber === num;

                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={!!isTaken}
                      onClick={() => handleSelectNumber(num)}
                      className={`h-10 sm:h-11 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center ${
                        isTaken
                          ? 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-400 cursor-not-allowed opacity-50'
                          : isMySelection
                          ? isTeacherSeat
                            ? 'bg-purple-600 text-white shadow-md scale-105 ring-2 ring-purple-400'
                            : 'bg-indigo-600 text-white shadow-md scale-105 ring-2 ring-indigo-400'
                          : isTeacherSeat
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-slate-200 dark:border-slate-700 shadow-2xs'
                      }`}
                    >
                      <span className="flex items-center gap-0.5">
                        {isTeacherSeat ? '00' : num}
                        {isTeacherSeat && <span className="text-[10px]">👨‍🏫</span>}
                      </span>
                      {isTaken && <span className="text-[10px] leading-none">{t('Taken', '済')}</span>}
                      {isTeacherSeat && !isTaken && <span className="text-[10px] leading-none text-purple-600 dark:text-purple-400 font-bold">{t('Teacher', '先生')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 🎖️ Untappd-Style Badge Level-Up Celebration Banner (2-Column Grid) */}
          {badgeLevelUps.length > 0 && (
            <div className="w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-2xl p-3.5 sm:p-4 text-slate-950 shadow-lg border-2 border-yellow-200 animate-in fade-in slide-in-from-top-2 text-left shrink-0">
              <div className="flex items-center gap-2 justify-center mb-2.5">
                <span className="text-2xl animate-bounce">🎖️</span>
                <h3 className="text-sm sm:text-base font-black tracking-tight uppercase">
                  {t('BADGE LEVEL UP!', 'バッジがレベルアップ！')} ({badgeLevelUps.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {badgeLevelUps.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white/95 dark:bg-slate-900/95 rounded-xl flex items-center justify-between gap-2 text-slate-900 dark:text-white shadow-xs border border-amber-300 dark:border-amber-700"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl p-1 rounded-lg bg-amber-50 dark:bg-slate-800 shrink-0">
                        {lvl.badge.emoji}
                      </span>
                      <div className="min-w-0">
                        <strong className="text-xs font-black block leading-tight truncate">
                          {language === 'ja' ? lvl.badge.jaTitle : lvl.badge.title}
                        </strong>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          Lv.{lvl.oldLevel} ➔ <span className="font-black text-amber-600 dark:text-yellow-400">Lv.{lvl.newLevel}</span>
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-black text-[11px] shrink-0">
                      +{lvl.bonusGold} 🪙
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature 2: Personal Awards Highlight Showcase (2-Column Grid) */}
          <div className="w-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl p-3.5 sm:p-4 text-left shadow-xs shrink-0">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🎖️</span>
                <span>{t('Special Awards Won!', 'あなたが獲得した特別賞！')}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-black">
                {personalAwards.length}
              </span>
            </h3>
            {personalAwards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personalAwards.map((award: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 shadow-2xs flex items-center gap-2.5 text-left"
                  >
                    <span className="text-2xl sm:text-3xl shrink-0">{award.emoji}</span>
                    <div className="min-w-0">
                      <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block leading-tight truncate">
                        {award.title}
                      </strong>
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {award.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-800/60 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                {t('Great effort! Keep playing to unlock special classroom awards!', 'ナイスファイト！次のラウンドで特別賞をねらおう！')}
              </div>
            )}
          </div>

          {/* Top 5 Class Leaderboard / Podium Summary */}
          {sortedPlayers.length > 0 && (
            <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-left shrink-0">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-500" />
                  <span>{t('Top Class Standings', 'クラス上位ランキング')}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  {totalPlayers} {t('students', '人参加')}
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedPlayers.slice(0, 6).map((p, idx) => {
                  const rankNum = idx + 1;
                  const isMe = p.id === player.id;
                  const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`;
                  return (
                    <div
                      key={p.id}
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                        isMe
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/50'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-black w-6 text-center shrink-0">{medal}</span>
                        <AvatarDisplay
                          avatar={p.avatar || '🇯🇵'}
                          frameId={p.frame}
                          sizeClassName="w-7 h-7 text-sm shrink-0"
                        />
                        <span className={`text-xs font-black truncate ${isMe ? 'text-amber-900 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'}`}>
                          {p.nickname}
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0">
                        {p.score.toLocaleString()} <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">pts</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isEditProfileOpen && savedProfile && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          profile={savedProfile}
          onClose={() => setIsEditProfileOpen(false)}
          onUpdated={(updated) => setSavedProfile(updated)}
          onResetSeat={() => {}}
        />
      )}

      {/* Student Stats Modal */}
      {isStatsModalOpen && savedProfile && (
        <StudentStatsModal
          isOpen={isStatsModalOpen}
          profile={savedProfile}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      {/* 1-Second Confirmation Modal */}
      {isConfirming && selectedNumber !== null && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-indigo-300 dark:border-indigo-700 text-center animate-in zoom-in-95 duration-150">
            <div className={`w-16 h-16 rounded-3xl ${selectedNumber === 0 ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'} flex items-center justify-center mx-auto mb-3 text-2xl font-black`}>
              {selectedNumber === 0 ? '👨‍🏫' : '🏷️'}
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              {selectedNumber === 0 ? t('Confirm Teacher iPad', '先生用iPadとして登録') : t('Confirm Attendance Number', '出席番号の確認')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
              {selectedNumber === 0
                ? t('Save this device as Teacher / Admin iPad (Seat 00)?', 'この端末を先生・管理者用iPad（00番）として登録しますか？')
                : t('Does this match the number on your iPad sticker?', 'あなたのiPadの番号はこれで合っていますか？')}
            </p>

            <div className={`p-4 rounded-2xl ${selectedNumber === 0 ? 'bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800' : 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'} mb-6`}>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                {schoolId === 'toyogaoka' ? t('Toyogaoka Elementary', '豊ヶ丘小') : t('Futakotamagawa Elementary', '二子玉小')} {classId}
              </span>
              <strong className="text-3xl font-black text-indigo-900 dark:text-indigo-100">
                {selectedNumber === 0 ? (language === 'ja' ? '00番 (先生)' : '#00 (Teacher)') : `#${selectedNumber} ${t('Number', '番')}`}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isClaiming}
                onClick={() => setIsConfirming(false)}
                className="py-3 rounded-2xl font-black text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                {t('Cancel / Redo', 'やり直す')}
              </button>
              <button
                type="button"
                disabled={isClaiming}
                onClick={handleConfirmClaim}
                className="py-3 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isClaiming ? t('Saving...', '保存中...') : t('Confirm', '決定')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher PIN Modal for Seat 00 Access */}
      {isTeacherPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-sm w-full border-4 border-amber-400 dark:border-amber-500 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 text-2xl">
              <KeyRound size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              {t('Teacher Seat Access', '00番（先生・管理者席）')}
            </h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
              {t('Enter 6-digit teacher PIN to unlock:', '先生用PINコード（6桁）を入力してください:')}
            </p>
            <form onSubmit={handleTeacherPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={teacherPinInput}
                  onChange={(e) => {
                    setTeacherPinInput(e.target.value.replace(/\D/g, ''));
                    setTeacherPinError(false);
                  }}
                  placeholder="••••••"
                  autoFocus
                  className="w-full text-center text-2xl font-black tracking-widest py-3 px-4 rounded-2xl border-3 border-slate-300 dark:border-slate-700 focus:border-amber-500 focus:outline-hidden bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                {teacherPinError && (
                  <p className="mt-2 text-xs font-black text-rose-500 animate-shake">
                    {t('❌ Incorrect PIN code', '❌ PINコードが正しくありません')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTeacherPinModalOpen(false);
                    setTeacherPinInput('');
                    setTeacherPinError(false);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs transition-colors cursor-pointer"
                >
                  {t('Cancel', 'キャンセル')}
                </button>
                <button
                  type="submit"
                  disabled={teacherPinInput.length < 6}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {t('Unlock', '解除する')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
