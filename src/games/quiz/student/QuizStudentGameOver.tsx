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
import { Trophy, Award, Sparkles, ArrowLeft, Check, ShieldCheck, AlertCircle, Flag, Clock } from 'lucide-react';
import { EditProfileModal } from '@/components/student/EditProfileModal';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { getShopItemById } from '@/services/shopCatalog';

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

  // Rewards calculation: 1 XP per point, 1 Gold per 20 points, plus bonuses
  const earnedXp = Math.max(100, Math.floor(player.score));
  const earnedGold = Math.max(10, Math.floor(player.score / 20) + (player.correctCount * 5));

  const isSprint = gamePlayType
    ? (gamePlayType === 'SPRINT_RACE' || gamePlayType === 'GRAND_PRIX_3D')
    : (!!sprintSettings || player.sprintProgress !== undefined || player.finishTimeMs !== undefined);
  const isTugOfWar = gamePlayType === 'TUG_OF_WAR';
  const isVolleyball = gamePlayType === 'VOLLEYBALL';
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
    setSelectedNumber(num);
    setIsConfirming(true);
    setClaimError(null);
  };

  const handleConfirmClaim = async () => {
    if (!selectedNumber || !schoolId || !classId) return;
    setIsClaiming(true);
    setClaimError(null);

    try {
      // 1. Check room collision first
      if (roomCode && onClaimRoomNumber) {
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

      const sessionKey = `${roomCode || 'noroom'}_${selectedNumber}_${player.score}_${player.correctCount}`;
      try {
        sessionStorage.setItem(`quiz_awarded_${sessionKey}`, 'true');
      } catch {}

      // 2. Save to cloud and bind local device
      const newProfile = await claimAttendanceNumber(
        schoolId,
        classId,
        selectedNumber,
        player.nickname,
        earnedXp,
        earnedGold,
        undefined,
        player.correctCount,
        rewardTotalQuestions,
        sessionKey,
        undefined,
        undefined,
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
    if (effectiveRank === 2) return { icon: '🥈', title: isSprint ? (language === 'ja' ? '第2位 (表彰台)' : '2nd Place! (Podium Finisher)') : (language === 'ja' ? '第2位 (準優勝)' : '2nd Place!'), color: 'text-slate-400' };
    if (effectiveRank === 3) return { icon: '🥉', title: isSprint ? (language === 'ja' ? '第3位 (表彰台)' : '3rd Place! (Podium Finisher)') : (language === 'ja' ? '第3位' : '3rd Place!'), color: 'text-amber-700' };
    return { 
      icon: isSprint ? '🏎️' : isTugOfWar ? '🪢' : isVolleyball ? '🧺' : '🌟', 
      title: language === 'ja' ? `${effectiveRank}位 / ${totalPlayers}人` : `#${effectiveRank} of ${totalPlayers}`, 
      color: 'text-purple-500' 
    };
  };

  const rankBadge = getRankBadge();

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 select-none flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
      {/* Celebration Header Card */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border-4 border-slate-100 dark:border-slate-800 flex flex-col items-center mb-6">
        {/* Student Avatar + Equipped Aura + Rank Badge Ornament */}
        <div className="relative mb-3 flex flex-col items-center">
          <AvatarDisplay
            avatar={player.avatar || savedProfile?.avatar || '🇯🇵'}
            frameId={player.frame || savedProfile?.equipped?.frame}
            sizeClassName="w-20 h-20 text-4xl"
          />
          <div className="absolute -bottom-2 -right-2 text-3xl filter drop-shadow animate-bounce">
            {rankBadge.icon}
          </div>
        </div>

        {/* Equipped Title Badge */}
        {(player.title || savedProfile?.equipped?.title) && (
          <div className="mb-2">
            <span className="inline-block text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 shadow-2xs">
              {getShopItemById(player.title || savedProfile?.equipped?.title || '')?.jaName || player.title || savedProfile?.equipped?.title}
            </span>
          </div>
        )}

        <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
          {isSprint 
            ? t('GRAND PRIX FINISHED!', 'グランプリ完走！') 
            : isTugOfWar 
            ? t('TUG OF WAR SHOWDOWN FINISHED!', '綱引き決着！ 🪢') 
            : isVolleyball 
            ? /* [ANTIGRAVITY REFACTOR]: Updated Student Game Over header for Undokai Bean Bag Toss (Tamaire) */ t('BEAN BAG TOSS FINISHED!', '玉入れ合戦 終了！ 🔴⚪') 
            : t('GAME COMPLETED!', 'ゲーム終了！')}
        </span>
        <h2 className={`text-3xl font-black ${rankBadge.color} tracking-tight mb-1`}>
          {rankBadge.title}
        </h2>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">
          {t(`Great job, ${player.nickname}!`, `おつかれさまでした、${player.nickname}！`)}
        </p>

        {/* Total Score & Rank Banner */}
        <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 mb-3 flex items-center justify-around shadow-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
              {t('Total Score', 'トータルスコア')}
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {player.score.toLocaleString()} <span className="text-xs font-bold text-amber-500">pts</span>
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
              {t('Final Rank', '最終順位')}
            </span>
            <span className="text-2xl font-black text-amber-500">
              #{effectiveRank} <span className="text-xs font-bold text-slate-400">/ {totalPlayers}</span>
            </span>
          </div>
        </div>

        {/* Feature 2: 4-Quadrant Personal Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mb-4">
          <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-center shadow-2xs">
            <span className="text-xl block mb-0.5">🎯</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
              {accuracyPct}%
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {t('Accuracy', '正解率')} ({player.correctCount}/{displayTotalQ})
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-center shadow-2xs">
            <span className="text-xl block mb-0.5">🔥</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 block">
              {maxStreakVal}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {t('Max Streak', '最高連続')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 text-center shadow-2xs">
            <span className="text-xl block mb-0.5">⚡</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 block">
              {fastestSpeedVal}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {t('Fastest', '最速タイム')}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 text-center shadow-2xs">
            <span className="text-xl block mb-0.5">⏱️</span>
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 block">
              {avgSpeedVal}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {t('Average', '平均タイム')}
            </span>
          </div>
        </div>

        {/* Sprint Mode Race Lap / Time Detail (if Sprint Mode) */}
        {isSprint && (
          <div className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-400">
              {isLapRace ? t('Sprint Result', 'スプリント結果') : t('Time Trial Result', 'タイムアタック結果')}:
            </span>
            <span className="font-black text-slate-900 dark:text-white">
              {isLapRace
                ? isDnf
                  ? (() => {
                      const targetLaps = sprintSettings?.targetLaps3D || 1;
                      const lapNum = is3DRace
                        ? Math.min(targetLaps, Math.max(1, Math.floor((player.distanceMeters || 0) / 2566.6) + 1))
                        : (player.sprintProgress || 0);
                      const maxLaps = is3DRace ? targetLaps : totalQuestions;
                      return t(`DNF (Lap ${lapNum}/${maxLaps})`, `完走ならず (${lapNum}/${maxLaps}周)`);
                    })()
                  : player.finishTimeMs ? `${(player.finishTimeMs / 1000).toFixed(1)}s (${t('Finished', 'チェッカー完走')})` : '—'
                : `${player.correctCount} ${t('correct', '問正解')}`}
            </span>
          </div>
        )}

        {/* Earned Rewards Loot Card */}
        <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/80 mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">
            {t('EARNED REWARDS 🎁', '獲得報酬 🎁')}
          </span>
          <div className="flex items-center justify-around">
            <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400 text-base">
              <span>⭐️</span>
              <span>+{earnedXp.toLocaleString()} XP</span>
            </div>
            <div className="flex items-center gap-1.5 font-black text-amber-500 text-base">
              <span>🪙</span>
              <span>+{earnedGold} Gold</span>
            </div>
          </div>
        </div>

        {/* SECTION A: Already Bound Profile Success State */}
        {savedProfile && (
          <div className="w-full p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 text-center mb-4 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-xs mb-1">
              <ShieldCheck size={16} />
              <span>{t('Score saved to this iPad!', 'このiPadにスコアをセーブしました！')}</span>
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {savedProfile.classId} #{savedProfile.attendanceNumber} • <strong>{savedProfile.nickname}</strong>
            </p>
            <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center gap-3">
              <span>⭐️ Lv.{savedProfile.level} ({t('Total: ', '累計 ')}{savedProfile.xp.toLocaleString()} XP)</span>
              <span>🪙 {t('Gold: ', '所持ゴールド: ')}{savedProfile.gold}</span>
            </div>
          </div>
        )}

        {/* SECTION B: NOT Bound Yet - Claim Your Number & iPad Binding */}
        {!savedProfile && recordRoster && classId && (
          <div className="w-full p-4 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-900 mb-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏷️</span>
              <div>
                <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-200">
                  {t('Save score to this iPad!', 'スコアをこのiPadに保存しよう！')}
                </h3>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {t('Check the sticker (attendance number) on your iPad case and tap', 'iPadケースのシール（出席番号）を確認してタップしてね')}
                </p>
              </div>
            </div>

            {claimError && (
              <div className="p-2 mb-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold text-center">
                {claimError}
              </div>
            )}

            {/* Attendance numbers grid */}
            <div className="grid grid-cols-5 gap-2 p-2 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-indigo-100 dark:border-indigo-950">
              {Array.from({ length: Math.max(35, getClassSize(schoolId, classId)) }, (_, i) => i + 1).map(num => {
                const isTaken = boundStudents && boundStudents[num] && boundStudents[num].playerId !== player.id;
                const isMySelection = selectedNumber === num;

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={!!isTaken}
                    onClick={() => handleSelectNumber(num)}
                    className={`h-11 sm:h-12 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center ${
                      isTaken
                        ? 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-400 cursor-not-allowed opacity-50'
                        : isMySelection
                        ? 'bg-indigo-600 text-white shadow-md scale-105 ring-2 ring-indigo-400'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-slate-200 dark:border-slate-700 shadow-2xs'
                    }`}
                  >
                    <span>{num}</span>
                    {isTaken && <span className="text-[8px] leading-none">{t('Taken', '済')}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 🎖️ Untappd-Style Badge Level-Up Celebration Banner */}
        {badgeLevelUps.length > 0 && (
          <div className="w-full mb-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-3xl p-4 sm:p-5 text-slate-950 shadow-2xl border-4 border-yellow-200 animate-in fade-in slide-in-from-top-2 text-left">
            <div className="flex items-center gap-2 justify-center mb-3">
              <span className="text-3xl animate-bounce">🎖️</span>
              <h3 className="text-base sm:text-lg font-black tracking-tight uppercase">
                {t('BADGE LEVEL UP!', 'バッジがレベルアップ！')}
              </h3>
            </div>
            <div className="space-y-2">
              {badgeLevelUps.map((lvl, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white/95 dark:bg-slate-900/95 rounded-2xl flex items-center justify-between gap-3 text-slate-900 dark:text-white shadow-sm border border-amber-300 dark:border-amber-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-1.5 rounded-xl bg-amber-50 dark:bg-slate-800">
                      {lvl.badge.emoji}
                    </span>
                    <div>
                      <strong className="text-sm font-black block leading-tight">
                        {language === 'ja' ? lvl.badge.jaTitle : lvl.badge.title}
                      </strong>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        Lv.{lvl.oldLevel} ➔ <span className="text-sm font-black text-amber-600 dark:text-yellow-400">Lv.{lvl.newLevel}</span>
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 font-black text-xs shrink-0">
                    +{lvl.bonusGold} Gold 🪙
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature 2: Personal Awards Highlight Showcase */}
        {personalAwards.length > 0 && (
          <div className="w-full mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 text-left shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 text-center mb-2.5 flex items-center justify-center gap-1.5">
              <span>🎖️</span>
              <span>{t('Special Awards Won!', 'あなたが獲得した特別賞！')}</span>
            </h3>
            <div className="space-y-2">
              {personalAwards.map((award: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 shadow-2xs flex items-center gap-3 text-left"
                >
                  <span className="text-3xl shrink-0">{award.emoji}</span>
                  <div>
                    <strong className="text-sm font-black text-slate-900 dark:text-white block">
                      {award.title}
                    </strong>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {award.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Customization Shortcut */}
        {savedProfile && (
          <button
            type="button"
            onClick={() => setIsEditProfileOpen(true)}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-amber-950 dark:text-amber-100 bg-amber-100/90 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900 border-2 border-amber-300 dark:border-amber-700 active:scale-98 shadow-sm flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
          >
            <span className="text-lg">🎨</span>
            <span>{t('Customize Avatar & Nickname', 'アイコンや名前をじぶん好みに変える')}</span>
          </button>
        )}

        {/* View My English Passport / Stats Modal Shortcut */}
        {savedProfile && (
          <button
            type="button"
            onClick={() => {
              soundEffects.playTick();
              setIsStatsModalOpen(true);
            }}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-sm text-teal-950 dark:text-teal-100 bg-teal-100/90 hover:bg-teal-200 dark:bg-teal-950/70 dark:hover:bg-teal-900 border-2 border-teal-300 dark:border-teal-700 active:scale-98 shadow-sm flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
          >
            <span className="text-lg">📊</span>
            <span>{t('View My English Passport / Trophy Case', '学習カルテ・トロフィーケースを見る')}</span>
          </button>
        )}

        {/* Waiting for Next Round Notice */}
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center mt-3">
          <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5">
            <span className="animate-pulse">⏳</span>
            <span>{t('Keep this screen open for Round 2!', 'このまま画面をとじずに待ってね！')}</span>
          </span>
          <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5 font-medium">
            {t('When the teacher starts the next game, it will begin automatically.', '先生が次のゲームを開始すると、自動的に始まります')}
          </p>
        </div>

        {/* Return Button */}
        <button
          onClick={onExit}
          className="w-full py-3 rounded-2xl font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>{t('Finish & Return to Portal', 'ゲームを終えてポータルにもどる')}</span>
        </button>
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
      {isConfirming && selectedNumber && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-indigo-300 dark:border-indigo-700 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              🏷️
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              {t('Confirm Attendance Number', '出席番号の確認')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
              {t('Does this match the number on your iPad sticker?', 'あなたのiPadの番号はこれで合っていますか？')}
            </p>

            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 mb-6">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                {schoolId === 'toyogaoka' ? t('Toyogaoka Elementary', '豊ヶ丘小') : t('Futakotamagawa Elementary', '二子玉小')} {classId}
              </span>
              <strong className="text-3xl font-black text-indigo-900 dark:text-indigo-100">
                #{selectedNumber} {t('Number', '番')}
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
    </div>
  );
};
