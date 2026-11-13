import { safeGet, safeSet, safeRemove, safeUpdate } from '@/services/rtdbSafe';
import { 
  SchoolId, 
  StudentProfile, 
  calculateLevel, 
  getRandomAvatarEmoji, 
  getDefaultSecretCharm,
  generateDefaultCallsign 
} from '@/types/roster';
import { ensureAnonymousAuth } from '@/services/firebase';
import { applyAwardsToBadges, BadgeLevelUpEvent } from '@/services/badgeEngine';
import { getShopItemById, SHOP_ITEMS, ShopItem } from '@/services/shopCatalog';

const LOCAL_STORAGE_KEY = 'levi_sensei_student_profile';

export interface AdditionalGameStats {
  awardIds?: string[];
  maxStreak?: number;
  fastestTimeMs?: number;
  totalAnswerTimeMs?: number;
  totalCorrectTimeMs?: number;
  rank?: number;
  troubleQuestions?: {
    wordId: string;
    english: string;
    japanese: string;
    isCorrect: boolean;
  }[];
}

export type RewardedStudentProfile = StudentProfile & {
  levelUps?: BadgeLevelUpEvent[];
};

/**
 * Update an existing student's nickname or avatar without resetting seat, level, gold, or XP
 */
export async function updateStudentProfileInfo(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number,
  updates: { nickname?: string; callsign?: string; avatar?: string; secretCharm?: string }
): Promise<StudentProfile | null> {
  const saved = getSavedStudentProfile();
  const current: StudentProfile = saved || {
    schoolId,
    classId,
    attendanceNumber,
    nickname: updates.nickname || 'Student',
    avatar: updates.avatar || '🇯🇵',
    xp: 0,
    level: 1,
    gold: 0,
    boundAt: Date.now()
  };

  const newNickname = updates.nickname !== undefined ? updates.nickname.trim() : current.nickname;
  const newCallsign = updates.callsign !== undefined 
    ? updates.callsign.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 6) 
    : (current.callsign || generateDefaultCallsign(newNickname, attendanceNumber, classId));
  const newAvatar = updates.avatar !== undefined ? updates.avatar : current.avatar;
  const newSecretCharm = updates.secretCharm !== undefined ? updates.secretCharm : current.secretCharm;

  const updatedProfile: StudentProfile = {
    ...current,
    nickname: newNickname || current.nickname,
    callsign: newCallsign,
    avatar: newAvatar || current.avatar,
    secretCharm: newSecretCharm || current.secretCharm,
    lastPlayedAt: Date.now()
  };

  // 1. Update localStorage
  setLocalStudentProfile(updatedProfile);

  // 2. If it's a real student seat (1-35), update Firebase RTDB student node
  if (attendanceNumber > 0) {
    try {
      await ensureAnonymousAuth();
      const studentPath = `schools/${schoolId}/classes/${classId}/students/${attendanceNumber}`;
      await safeUpdate(studentPath, {
        nickname: updatedProfile.nickname,
        callsign: updatedProfile.callsign,
        avatar: updatedProfile.avatar,
        secretCharm: updatedProfile.secretCharm,
        lastPlayedAt: updatedProfile.lastPlayedAt
      });
    } catch (err) {
      console.warn('Error syncing profile update to RTDB:', err);
    }
  }

  return updatedProfile;
}

/**
 * Read student profile bound to this specific iPad from localStorage
 */
export function getSavedStudentProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as StudentProfile;
    if (profile && profile.schoolId && profile.classId && typeof profile.attendanceNumber === 'number') {
      return profile;
    }
  } catch (err) {
    console.error('Error reading saved student profile:', err);
  }
  return null;
}

/**
 * Attempt to restore student profile from Firebase cloud SSO (/users/$uid) if localStorage was cleared
 */
export async function fetchCloudStudentProfile(): Promise<StudentProfile | null> {
  try {
    const uid = await ensureAnonymousAuth();
    if (!uid) return null;
    const userBinding = await safeGet<{
      schoolId: SchoolId;
      classId: string;
      attendanceNumber: number;
    }>(`users/${uid}`);
    if (userBinding && userBinding.schoolId && userBinding.classId && userBinding.attendanceNumber) {
      const studentPath = `schools/${userBinding.schoolId}/classes/${userBinding.classId}/students/${userBinding.attendanceNumber}`;
      const profile = await safeGet<StudentProfile>(studentPath);
      if (profile) {
        setLocalStudentProfile(profile);
        return profile;
      }
    }
  } catch (err) {
    console.warn('Error restoring cloud student profile:', err);
  }
  return null;
}

/**
 * Save student profile locally on this iPad
 */
export function setLocalStudentProfile(profile: StudentProfile): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Error writing local student profile:', err);
  }
}

/**
 * Clear local iPad profile binding (e.g. for swapping iPads or re-assignment)
 */
export function clearLocalStudentProfile(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing local student profile:', err);
  }
}

/**
 * Completely unlink this iPad from both localStorage AND cloud SSO (/users/$uid)
 * so the student doesn't get boomeranged back into their old seat when switching seats.
 */
export async function unlinkStudentDevice(): Promise<void> {
  clearLocalStudentProfile();
  try {
    const uid = await ensureAnonymousAuth();
    if (uid) {
      await safeRemove(`users/${uid}`);
    }
  } catch (err) {
    console.warn('Error clearing cloud SSO binding:', err);
  }
}

/**
 * Fetch all claimed attendance numbers for a specific school & class from Firebase
 */
export async function fetchClassBoundNumbers(
  schoolId: SchoolId, 
  classId: string
): Promise<Record<number, { nickname: string; callsign?: string; xp: number; avatar: string; secretCharm?: string }>> {
  try {
    try {
      await ensureAnonymousAuth();
    } catch {}

    const classPath = 'schools/' + schoolId + '/classes/' + classId + '/students';
    const rawData = await safeGet<Record<string, any> | Array<any>>(classPath);
    if (!rawData) return {};
    
    const result: Record<number, { nickname: string; callsign?: string; xp: number; avatar: string; secretCharm?: string }> = {};
    
    if (Array.isArray(rawData)) {
      rawData.forEach((val, idx) => {
        if (val && idx > 0 && typeof val === 'object') {
          result[idx] = {
            nickname: val.nickname || ('#' + idx),
            callsign: val.callsign || generateDefaultCallsign(val.nickname || '', idx, classId),
            xp: val.xp || 0,
            avatar: val.avatar || getRandomAvatarEmoji(idx),
            secretCharm: val.secretCharm || undefined
          };
        }
      });
    } else {
      Object.entries(rawData).forEach(([key, val]) => {
        const num = parseInt(key, 10);
        if (!isNaN(num) && val && typeof val === 'object') {
          result[num] = {
            nickname: val.nickname || ('#' + num),
            callsign: val.callsign || generateDefaultCallsign(val.nickname || '', num, classId),
            xp: val.xp || 0,
            avatar: val.avatar || getRandomAvatarEmoji(num),
            secretCharm: val.secretCharm || undefined
          };
        }
      });
    }
    return result;
  } catch (err) {
    console.error('Error fetching class bound numbers:', err);
    return {};
  }
}

/**
 * Claim an attendance number, initialize or update cloud profile, and bind to this iPad
 */
export async function claimAttendanceNumber(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number,
  nickname: string,
  earnedXp: number = 0,
  earnedGold: number = 0,
  avatar?: string,
  correctCount: number = 0,
  totalQuestions: number = 0,
  gameSessionId?: string,
  secretCharm?: string,
  callsign?: string,
  additionalStats?: AdditionalGameStats
): Promise<RewardedStudentProfile> {
  const fallbackAvatar = getRandomAvatarEmoji(attendanceNumber);
  const studentPath = 'schools/' + schoolId + '/classes/' + classId + '/students/' + attendanceNumber;
  const cloudExisting = await safeGet<StudentProfile>(studentPath);
  const localExisting = getSavedStudentProfile();

  // If cloud read failed due to brief Wi-Fi drop, fall back to local profile so we NEVER wipe XP to 0!
  const existing = cloudExisting || (
    localExisting &&
    localExisting.schoolId === schoolId &&
    localExisting.classId === classId &&
    localExisting.attendanceNumber === attendanceNumber
      ? localExisting
      : null
  );

  const resolvedCharm = secretCharm || existing?.secretCharm || undefined;
  const resolvedCallsign = callsign !== undefined
    ? callsign.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 6)
    : (existing?.callsign || generateDefaultCallsign(nickname, attendanceNumber, classId));

  let profile: StudentProfile;
  let levelUps: BadgeLevelUpEvent[] = [];
  let bonusGoldTotal = 0;

  // Collect award IDs to apply
  const awardIdsToApply = [...(additionalStats?.awardIds || [])];
  if (additionalStats?.rank === 1 && !awardIdsToApply.includes('champion')) {
    awardIdsToApply.push('champion');
  }
  if (additionalStats?.rank && additionalStats.rank <= 3 && additionalStats.rank > 0 && !awardIdsToApply.includes('podium')) {
    awardIdsToApply.push('podium');
  }
  if (totalQuestions >= 3 && correctCount === totalQuestions && !awardIdsToApply.includes('perfectionist')) {
    awardIdsToApply.push('perfectionist');
  }

  if (existing) {
    // If this session was already rewarded, don't re-add XP/gold
    const alreadyRewarded = !!(gameSessionId && existing.rewardedSessions?.[gameSessionId]);
    const xpToAdd = alreadyRewarded ? 0 : earnedXp;

    // Badges calculation
    let updatedBadges = existing.stats?.badges || {};
    if (!alreadyRewarded) {
      const badgeRes = applyAwardsToBadges(updatedBadges, awardIdsToApply);
      updatedBadges = badgeRes.updatedBadges;
      levelUps = badgeRes.levelUps;
      bonusGoldTotal = badgeRes.bonusGoldTotal;
    }

    const goldToAdd = alreadyRewarded ? 0 : (earnedGold + bonusGoldTotal);
    const newXp = (existing.xp || 0) + xpToAdd;
    const newGold = (existing.gold || 0) + goldToAdd;
    const { level } = calculateLevel(newXp);

    // Trouble words
    const updatedTroubleWords = { ...(existing.stats?.troubleWords || {}) };
    if (!alreadyRewarded && additionalStats?.troubleQuestions) {
      for (const item of additionalStats.troubleQuestions) {
        if (!item.wordId) continue;
        const curr = updatedTroubleWords[item.wordId] || {
          wordId: item.wordId,
          english: item.english,
          japanese: item.japanese,
          missCount: 0,
          correctCount: 0,
          lastAttemptedAt: Date.now()
        };
        if (item.isCorrect) curr.correctCount += 1;
        else curr.missCount += 1;
        curr.lastAttemptedAt = Date.now();
        updatedTroubleWords[item.wordId] = curr;
      }
    }

    const currentBestStreak = existing.stats?.bestStreak || 0;
    const gameStreak = additionalStats?.maxStreak || 0;
    const bestStreak = Math.max(currentBestStreak, gameStreak);

    const currentFastest = existing.stats?.allTimeFastestMs && existing.stats.allTimeFastestMs < 999999
      ? existing.stats.allTimeFastestMs
      : 999999;
    const gameFastest = additionalStats?.fastestTimeMs && additionalStats.fastestTimeMs < 999999
      ? additionalStats.fastestTimeMs
      : 999999;
    const allTimeFastestMs = Math.min(currentFastest, gameFastest);

    let podiumFinishes = existing.stats?.podiumFinishes || 0;
    let championshipWins = existing.stats?.championshipWins || 0;
    if (!alreadyRewarded) {
      if (additionalStats?.rank && additionalStats.rank <= 3 && additionalStats.rank > 0) podiumFinishes += 1;
      if (additionalStats?.rank === 1) championshipWins += 1;
    }
    
    profile = {
      ...existing,
      nickname: nickname || existing.nickname,
      callsign: resolvedCallsign,
      avatar: avatar || existing.avatar || fallbackAvatar,
      ...(resolvedCharm ? { secretCharm: resolvedCharm } : {}),
      xp: newXp,
      level,
      gold: newGold,
      lastPlayedAt: Date.now(),
      rewardedSessions: {
        ...(existing.rewardedSessions || {}),
        ...(gameSessionId ? { [gameSessionId]: Date.now() } : {})
      },
      stats: {
        gamesPlayed: (existing.stats?.gamesPlayed || 0) + (!alreadyRewarded && earnedXp > 0 ? 1 : 0),
        correctAnswers: (existing.stats?.correctAnswers || 0) + (!alreadyRewarded ? correctCount : 0),
        totalAnswers: (existing.stats?.totalAnswers || 0) + (!alreadyRewarded ? totalQuestions : 0),
        bestStreak: bestStreak > 0 ? bestStreak : undefined,
        allTimeFastestMs: allTimeFastestMs < 999999 ? allTimeFastestMs : undefined,
        totalAnswerTimeMs: (existing.stats?.totalAnswerTimeMs || 0) + (!alreadyRewarded ? (additionalStats?.totalAnswerTimeMs || 0) : 0),
        totalCorrectTimeMs: (existing.stats?.totalCorrectTimeMs || 0) + (!alreadyRewarded ? (additionalStats?.totalCorrectTimeMs || 0) : 0),
        podiumFinishes: podiumFinishes > 0 ? podiumFinishes : undefined,
        championshipWins: championshipWins > 0 ? championshipWins : undefined,
        badges: updatedBadges,
        troubleWords: Object.keys(updatedTroubleWords).length > 0 ? updatedTroubleWords : undefined
      }
    };
  } else {
    const badgeRes = applyAwardsToBadges({}, awardIdsToApply);
    levelUps = badgeRes.levelUps;
    bonusGoldTotal = badgeRes.bonusGoldTotal;

    const initialTroubleWords: Record<string, any> = {};
    if (additionalStats?.troubleQuestions) {
      for (const item of additionalStats.troubleQuestions) {
        if (!item.wordId) continue;
        initialTroubleWords[item.wordId] = {
          wordId: item.wordId,
          english: item.english,
          japanese: item.japanese,
          missCount: item.isCorrect ? 0 : 1,
          correctCount: item.isCorrect ? 1 : 0,
          lastAttemptedAt: Date.now()
        };
      }
    }

    const { level } = calculateLevel(earnedXp);
    profile = {
      schoolId,
      classId,
      attendanceNumber,
      nickname: nickname || ('Student ' + attendanceNumber),
      callsign: resolvedCallsign,
      avatar: avatar || fallbackAvatar,
      ...(resolvedCharm ? { secretCharm: resolvedCharm } : {}),
      xp: earnedXp,
      level,
      gold: earnedGold + bonusGoldTotal,
      boundAt: Date.now(),
      lastPlayedAt: Date.now(),
      rewardedSessions: gameSessionId ? { [gameSessionId]: Date.now() } : {},
      stats: {
        gamesPlayed: earnedXp > 0 ? 1 : 0,
        correctAnswers: correctCount,
        totalAnswers: totalQuestions,
        bestStreak: additionalStats?.maxStreak,
        allTimeFastestMs: additionalStats?.fastestTimeMs && additionalStats.fastestTimeMs < 999999 ? additionalStats.fastestTimeMs : undefined,
        totalAnswerTimeMs: additionalStats?.totalAnswerTimeMs || 0,
        totalCorrectTimeMs: additionalStats?.totalCorrectTimeMs || 0,
        podiumFinishes: additionalStats?.rank && additionalStats.rank <= 3 && additionalStats.rank > 0 ? 1 : undefined,
        championshipWins: additionalStats?.rank === 1 ? 1 : undefined,
        badges: badgeRes.updatedBadges,
        troubleWords: Object.keys(initialTroubleWords).length > 0 ? initialTroubleWords : undefined
      }
    };
  }

  // Update cloud roster for real student seats (1-35); seat 0 (teacher/tester) stays local
  if (attendanceNumber > 0) {
    const uid = await ensureAnonymousAuth();
    await safeSet(studentPath, profile);

    // Mirror to SSO device binding (/users/$uid)
    try {
      if (uid) {
        await safeSet(`users/${uid}`, {
          schoolId,
          classId,
          attendanceNumber,
          nickname: profile.nickname,
          callsign: profile.callsign,
          avatar: profile.avatar || fallbackAvatar,
          boundAt: profile.boundAt || Date.now()
        });
      }
    } catch (ssoErr) {
      console.warn('Could not mirror user SSO binding:', ssoErr);
    }
  }

  // Update local device binding
  setLocalStudentProfile(profile);

  return profile;
}

/**
 * Add XP, Gold, badges and cumulative stats to a student profile
 */
export async function addRewardsToProfile(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number,
  earnedXp: number,
  earnedGold: number,
  correctCount: number = 0,
  totalQuestions: number = 0,
  gameSessionId?: string,
  additionalStats?: AdditionalGameStats
): Promise<RewardedStudentProfile | null> {
  try {
    if (attendanceNumber > 0) {
      await ensureAnonymousAuth();
    }
    const studentPath = 'schools/' + schoolId + '/classes/' + classId + '/students/' + attendanceNumber;
    const cloudExisting = await safeGet<StudentProfile>(studentPath);
    const localExisting = getSavedStudentProfile();

    // If cloud read failed due to brief Wi-Fi drop, fall back to local profile so we NEVER wipe XP to 0!
    const existing = cloudExisting || (
      localExisting &&
      localExisting.schoolId === schoolId &&
      localExisting.classId === classId &&
      localExisting.attendanceNumber === attendanceNumber
        ? localExisting
        : null
    );

    let profile: StudentProfile;
    let levelUps: BadgeLevelUpEvent[] = [];
    let bonusGoldTotal = 0;

    // Collect award IDs to apply
    const awardIdsToApply = [...(additionalStats?.awardIds || [])];
    if (additionalStats?.rank === 1 && !awardIdsToApply.includes('champion')) {
      awardIdsToApply.push('champion');
    }
    if (additionalStats?.rank && additionalStats.rank <= 3 && additionalStats.rank > 0 && !awardIdsToApply.includes('podium')) {
      awardIdsToApply.push('podium');
    }
    if (totalQuestions >= 3 && correctCount === totalQuestions && !awardIdsToApply.includes('perfectionist')) {
      awardIdsToApply.push('perfectionist');
    }

    if (existing) {
      // Idempotency check: if this specific round/session was already rewarded, return existing without double-awarding
      if (gameSessionId && existing.rewardedSessions?.[gameSessionId]) {
        console.warn(`[Rewards] Session ${gameSessionId} already awarded to seat ${attendanceNumber}. Skipping duplicate.`);
        return existing;
      }

      // Compute badge level progress
      const badgeRes = applyAwardsToBadges(
        existing.stats?.badges || {},
        awardIdsToApply
      );
      levelUps = badgeRes.levelUps;
      bonusGoldTotal = badgeRes.bonusGoldTotal;

      // Trouble words merge
      const updatedTroubleWords = { ...(existing.stats?.troubleWords || {}) };
      if (additionalStats?.troubleQuestions) {
        for (const item of additionalStats.troubleQuestions) {
          if (!item.wordId) continue;
          const curr = updatedTroubleWords[item.wordId] || {
            wordId: item.wordId,
            english: item.english,
            japanese: item.japanese,
            missCount: 0,
            correctCount: 0,
            lastAttemptedAt: Date.now()
          };
          if (item.isCorrect) {
            curr.correctCount += 1;
          } else {
            curr.missCount += 1;
          }
          curr.lastAttemptedAt = Date.now();
          updatedTroubleWords[item.wordId] = curr;
        }
      }

      const newGold = (existing.gold || 0) + earnedGold + bonusGoldTotal;
      const newXp = (existing.xp || 0) + earnedXp;
      const { level } = calculateLevel(newXp);

      // Best streak
      const currentBestStreak = existing.stats?.bestStreak || 0;
      const gameStreak = additionalStats?.maxStreak || 0;
      const bestStreak = Math.max(currentBestStreak, gameStreak);

      // Fastest ms
      const currentFastest = existing.stats?.allTimeFastestMs && existing.stats.allTimeFastestMs < 999999
        ? existing.stats.allTimeFastestMs
        : 999999;
      const gameFastest = additionalStats?.fastestTimeMs && additionalStats.fastestTimeMs < 999999
        ? additionalStats.fastestTimeMs
        : 999999;
      const allTimeFastestMs = Math.min(currentFastest, gameFastest);

      // Podium and championship counts
      let podiumFinishes = existing.stats?.podiumFinishes || 0;
      let championshipWins = existing.stats?.championshipWins || 0;
      if (additionalStats?.rank && additionalStats.rank <= 3 && additionalStats.rank > 0) {
        podiumFinishes += 1;
      }
      if (additionalStats?.rank === 1) {
        championshipWins += 1;
      }

      const isRealGame = totalQuestions > 0;
      profile = {
        ...existing,
        xp: newXp,
        level,
        gold: newGold,
        lastPlayedAt: Date.now(),
        rewardedSessions: {
          ...(existing.rewardedSessions || {}),
          ...(gameSessionId ? { [gameSessionId]: Date.now() } : {})
        },
        stats: {
          gamesPlayed: (existing.stats?.gamesPlayed || 0) + (isRealGame ? 1 : 0),
          correctAnswers: (existing.stats?.correctAnswers || 0) + correctCount,
          totalAnswers: (existing.stats?.totalAnswers || 0) + totalQuestions,
          bestStreak: bestStreak > 0 ? bestStreak : undefined,
          allTimeFastestMs: allTimeFastestMs < 999999 ? allTimeFastestMs : undefined,
          totalAnswerTimeMs: (existing.stats?.totalAnswerTimeMs || 0) + (additionalStats?.totalAnswerTimeMs || 0),
          totalCorrectTimeMs: (existing.stats?.totalCorrectTimeMs || 0) + (additionalStats?.totalCorrectTimeMs || 0),
          podiumFinishes: podiumFinishes > 0 ? podiumFinishes : undefined,
          championshipWins: championshipWins > 0 ? championshipWins : undefined,
          badges: badgeRes.updatedBadges,
          troubleWords: Object.keys(updatedTroubleWords).length > 0 ? updatedTroubleWords : undefined
        }
      };
      if (attendanceNumber > 0) {
        await safeSet(studentPath, profile);
      }
    } else {
      // Create fresh profile if not existed yet
      const badgeRes = applyAwardsToBadges({}, awardIdsToApply);
      levelUps = badgeRes.levelUps;
      bonusGoldTotal = badgeRes.bonusGoldTotal;

      const initialTroubleWords: Record<string, any> = {};
      if (additionalStats?.troubleQuestions) {
        for (const item of additionalStats.troubleQuestions) {
          if (!item.wordId) continue;
          initialTroubleWords[item.wordId] = {
            wordId: item.wordId,
            english: item.english,
            japanese: item.japanese,
            missCount: item.isCorrect ? 0 : 1,
            correctCount: item.isCorrect ? 1 : 0,
            lastAttemptedAt: Date.now()
          };
        }
      }

      const newGold = earnedGold + bonusGoldTotal;
      const { level } = calculateLevel(earnedXp);
      const isRealGame = totalQuestions > 0;

      profile = {
        schoolId,
        classId,
        attendanceNumber,
        nickname: 'Student ' + attendanceNumber,
        avatar: getRandomAvatarEmoji(attendanceNumber),
        xp: earnedXp,
        level,
        gold: newGold,
        boundAt: Date.now(),
        lastPlayedAt: Date.now(),
        rewardedSessions: gameSessionId ? { [gameSessionId]: Date.now() } : {},
        stats: {
          gamesPlayed: isRealGame ? 1 : 0,
          correctAnswers: correctCount,
          totalAnswers: totalQuestions,
          bestStreak: additionalStats?.maxStreak,
          allTimeFastestMs: additionalStats?.fastestTimeMs && additionalStats.fastestTimeMs < 999999 ? additionalStats.fastestTimeMs : undefined,
          totalAnswerTimeMs: additionalStats?.totalAnswerTimeMs || 0,
          totalCorrectTimeMs: additionalStats?.totalCorrectTimeMs || 0,
          podiumFinishes: additionalStats?.rank && additionalStats.rank <= 3 && additionalStats.rank > 0 ? 1 : undefined,
          championshipWins: additionalStats?.rank === 1 ? 1 : undefined,
          badges: badgeRes.updatedBadges,
          troubleWords: Object.keys(initialTroubleWords).length > 0 ? initialTroubleWords : undefined
        }
      };
      if (attendanceNumber > 0) {
        await safeSet(studentPath, profile);
      }
    }

    setLocalStudentProfile(profile);
    return {
      ...profile,
      levelUps
    };
  } catch (err) {
    console.error('Error adding rewards to student profile:', err);
    return null;
  }
}

/**
 * Teacher release action: unbind a student attendance number in case of accidental tap
 */
export async function releaseStudentNumber(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number
): Promise<void> {
  try {
    await ensureAnonymousAuth();
    const studentPath = 'schools/' + schoolId + '/classes/' + classId + '/students/' + attendanceNumber;
    await safeRemove(studentPath);
  } catch (err) {
    console.error('Error releasing student number:', err);
  }
}

/**
 * Teacher edit action: update nickname, avatar, or callsign for a student
 */
export async function updateStudentProfileByTeacher(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number,
  updates: { nickname?: string; avatar?: string; callsign?: string; secretCharm?: string }
): Promise<StudentProfile | null> {
  try {
    await ensureAnonymousAuth();
    const studentPath = 'schools/' + schoolId + '/classes/' + classId + '/students/' + attendanceNumber;
    const existing = await safeGet<StudentProfile>(studentPath);
    const fallbackAvatar = getRandomAvatarEmoji(attendanceNumber);

    const updatedProfile: StudentProfile = {
      ...(existing || {
        schoolId,
        classId,
        attendanceNumber,
        nickname: updates.nickname || ('#' + attendanceNumber),
        avatar: updates.avatar || fallbackAvatar,
        xp: 0,
        level: 1,
        gold: 0,
        boundAt: Date.now()
      }),
      ...(updates.nickname !== undefined ? { nickname: updates.nickname.trim() } : {}),
      ...(updates.avatar !== undefined ? { avatar: updates.avatar } : {}),
      ...(updates.callsign !== undefined ? { callsign: updates.callsign.trim().toUpperCase() } : {}),
      ...(updates.secretCharm !== undefined ? { secretCharm: updates.secretCharm || undefined } : {})
    };

    if (updates.secretCharm === '') {
      delete updatedProfile.secretCharm;
    }

    await safeSet(studentPath, updatedProfile);
    return updatedProfile;
  } catch (err) {
    console.error('Error updating student profile by teacher:', err);
    return null;
  }
}

export type ResetProfileField = 'nickname' | 'callsign' | 'avatar' | 'secretCharm' | 'ALL';

/**
 * Reset a specific field or all fields of a student profile to school defaults:
 * - Nickname -> `${attendanceNumber}番`
 * - Callsign / Short Name -> `G-C-A` (e.g. `6-4-10`)
 * - Avatar -> `🇯🇵` (Japan Flag)
 * - Secret Passcode Charm -> removed / null
 */
export async function resetStudentFieldToDefault(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number,
  field: ResetProfileField
): Promise<StudentProfile | null> {
  try {
    await ensureAnonymousAuth();
    const studentPath = 'schools/' + schoolId + '/classes/' + classId + '/students/' + attendanceNumber;
    const existing = await safeGet<StudentProfile>(studentPath);
    if (!existing) return null;

    const defaultNickname = `${attendanceNumber}番`;
    const defaultCallsign = generateDefaultCallsign('', attendanceNumber, classId);
    const defaultAvatar = '🇯🇵';

    const updatedProfile: StudentProfile = {
      ...existing,
      ...(field === 'nickname' || field === 'ALL' ? { nickname: defaultNickname } : {}),
      ...(field === 'callsign' || field === 'ALL' ? { callsign: defaultCallsign } : {}),
      ...(field === 'avatar' || field === 'ALL' ? { avatar: defaultAvatar } : {}),
    };

    if (field === 'secretCharm' || field === 'ALL') {
      delete updatedProfile.secretCharm;
    }

    await safeSet(studentPath, updatedProfile);
    return updatedProfile;
  } catch (err) {
    console.error('Error resetting student profile field:', err);
    return null;
  }
}

/**
 * Fetch full profile objects for all registered students in a class
 */
export async function fetchAllClassStudents(
  schoolId: SchoolId,
  classId: string
): Promise<Record<number, StudentProfile>> {
  try {
    try {
      await ensureAnonymousAuth();
    } catch {}

    const classPath = 'schools/' + schoolId + '/classes/' + classId + '/students';
    const rawData = await safeGet<Record<string, any> | Array<any>>(classPath);
    if (!rawData) return {};

    const result: Record<number, StudentProfile> = {};

    if (Array.isArray(rawData)) {
      rawData.forEach((val, idx) => {
        if (val && idx > 0 && typeof val === 'object') {
          result[idx] = val as StudentProfile;
        }
      });
    } else {
      Object.entries(rawData).forEach(([key, val]) => {
        const num = parseInt(key, 10);
        if (!isNaN(num) && val && typeof val === 'object') {
          result[num] = val as StudentProfile;
        }
      });
    }
    return result;
  } catch (err) {
    console.error('Error fetching all class students:', err);
    return {};
  }
}

/**
 * Purchase a cosmetic or title item with Gold
 */
export async function purchaseShopItem(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number,
  itemId: string
): Promise<{ success: boolean; profile?: StudentProfile; error?: string }> {
  try {
    const item = getShopItemById(itemId);
    if (!item) return { success: false, error: 'Item not found' };

    await ensureAnonymousAuth();
    const studentPath = `schools/${schoolId}/classes/${classId}/students/${attendanceNumber}`;
    const cloudExisting = await safeGet<StudentProfile>(studentPath);
    const localExisting = getSavedStudentProfile();
    const existing = cloudExisting || (
      localExisting &&
      localExisting.schoolId === schoolId &&
      localExisting.classId === classId &&
      localExisting.attendanceNumber === attendanceNumber
        ? localExisting
        : null
    );

    if (!existing) return { success: false, error: 'Student profile not found' };

    if ((existing.gold || 0) < item.price) {
      return { success: false, error: 'Not enough Gold' };
    }

    if ((existing.level || 1) < item.requiredLevel) {
      return { success: false, error: `Requires Level ${item.requiredLevel}` };
    }

    const currentInventory = existing.inventory || {};
    const updatedInventory = { ...currentInventory };
    const updatedEquipped = { ...(existing.equipped || {}) };

    if (item.category === 'aura') {
      const frames = new Set(updatedInventory.frames || []);
      frames.add(item.id);
      updatedInventory.frames = Array.from(frames);
      updatedEquipped.frame = item.id; // Auto-equip
    } else if (item.category === 'avatar') {
      const avs = new Set(updatedInventory.unlockedAvatars || []);
      const avatarEmoji = item.extraPayload || item.icon;
      avs.add(avatarEmoji);
      updatedInventory.unlockedAvatars = Array.from(avs);
    } else if (item.category === 'kart') {
      const karts = new Set(updatedInventory.kartThemes || []);
      const kartThemeId = item.extraPayload || item.id;
      karts.add(kartThemeId);
      updatedInventory.kartThemes = Array.from(karts);
      updatedEquipped.kartTheme = kartThemeId; // Auto-equip
    } else if (item.category === 'title') {
      const titles = new Set(updatedInventory.titles || []);
      const titleName = item.extraPayload || item.jaName;
      titles.add(titleName);
      updatedInventory.titles = Array.from(titles);
      updatedEquipped.title = titleName; // Auto-equip
    }

    const updatedProfile: StudentProfile = {
      ...existing,
      gold: existing.gold - item.price,
      inventory: updatedInventory,
      equipped: updatedEquipped,
      lastPlayedAt: Date.now()
    };

    await safeSet(studentPath, updatedProfile);
    setLocalStudentProfile(updatedProfile);

    return { success: true, profile: updatedProfile };
  } catch (err: any) {
    console.error('Error purchasing shop item:', err);
    return { success: false, error: err.message || 'Purchase failed' };
  }
}

/**
 * Equip or unequip an inventory item
 */
export async function equipProfileItem(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number,
  slot: 'frame' | 'title' | 'kartTheme',
  itemId: string | null
): Promise<{ success: boolean; profile?: StudentProfile }> {
  try {
    await ensureAnonymousAuth();
    const studentPath = `schools/${schoolId}/classes/${classId}/students/${attendanceNumber}`;
    const cloudExisting = await safeGet<StudentProfile>(studentPath);
    const localExisting = getSavedStudentProfile();
    const existing = cloudExisting || (
      localExisting &&
      localExisting.schoolId === schoolId &&
      localExisting.classId === classId &&
      localExisting.attendanceNumber === attendanceNumber
        ? localExisting
        : null
    );

    if (!existing) return { success: false };

    const updatedEquipped = { ...(existing.equipped || {}) };
    if (!itemId) {
      delete updatedEquipped[slot];
    } else {
      updatedEquipped[slot] = itemId;
    }

    const updatedProfile: StudentProfile = {
      ...existing,
      equipped: updatedEquipped,
      lastPlayedAt: Date.now()
    };

    await safeSet(studentPath, updatedProfile);
    setLocalStudentProfile(updatedProfile);

    return { success: true, profile: updatedProfile };
  } catch (err) {
    console.error('Error equipping profile item:', err);
    return { success: false };
  }
}

/**
 * Spin the 100-Gold Lucky Gacha Capsule Machine
 */
export async function spinLuckyGacha(
  schoolId: SchoolId,
  classId: string,
  attendanceNumber: number
): Promise<{ success: boolean; wonItem?: ShopItem; bonusXp?: number; profile?: StudentProfile; error?: string }> {
  try {
    const GACHA_COST = 100;
    await ensureAnonymousAuth();
    const studentPath = `schools/${schoolId}/classes/${classId}/students/${attendanceNumber}`;
    const cloudExisting = await safeGet<StudentProfile>(studentPath);
    const localExisting = getSavedStudentProfile();
    const existing = cloudExisting || (
      localExisting &&
      localExisting.schoolId === schoolId &&
      localExisting.classId === classId &&
      localExisting.attendanceNumber === attendanceNumber
        ? localExisting
        : null
    );

    if (!existing) return { success: false, error: 'Student profile not found' };

    if ((existing.gold || 0) < GACHA_COST) {
      return { success: false, error: 'Not enough Gold' };
    }

    const inventory = existing.inventory || {};
    const ownedFrames = new Set(inventory.frames || []);
    const ownedAvatars = new Set(inventory.unlockedAvatars || []);
    const ownedKarts = new Set(inventory.kartThemes || []);
    const ownedTitles = new Set(inventory.titles || []);

    // Filter unowned items
    const availablePool = SHOP_ITEMS.filter((item) => {
      if (item.category === 'aura') return !ownedFrames.has(item.id);
      if (item.category === 'avatar') return !ownedAvatars.has(item.extraPayload || item.icon);
      if (item.category === 'kart') return !ownedKarts.has(item.extraPayload || item.id);
      if (item.category === 'title') return !ownedTitles.has(item.extraPayload || item.jaName);
      return false;
    });

    let updatedInventory = { ...inventory };
    let updatedEquipped = { ...(existing.equipped || {}) };
    let wonItem: ShopItem | undefined;
    let bonusXp: number | undefined;
    let newXp = existing.xp || 0;

    if (availablePool.length > 0) {
      // Pick random unowned item
      wonItem = availablePool[Math.floor(Math.random() * availablePool.length)];
      if (wonItem.category === 'aura') {
        updatedInventory.frames = [...(updatedInventory.frames || []), wonItem.id];
        updatedEquipped.frame = wonItem.id;
      } else if (wonItem.category === 'avatar') {
        const av = wonItem.extraPayload || wonItem.icon;
        updatedInventory.unlockedAvatars = [...(updatedInventory.unlockedAvatars || []), av];
      } else if (wonItem.category === 'kart') {
        const kt = wonItem.extraPayload || wonItem.id;
        updatedInventory.kartThemes = [...(updatedInventory.kartThemes || []), kt];
        updatedEquipped.kartTheme = kt;
      } else if (wonItem.category === 'title') {
        const tt = wonItem.extraPayload || wonItem.jaName;
        updatedInventory.titles = [...(updatedInventory.titles || []), tt];
        updatedEquipped.title = tt;
      }
    } else {
      // Everything is already owned! Award 300 Master XP
      bonusXp = 300;
      newXp += bonusXp;
    }

    const { level } = calculateLevel(newXp);
    const updatedProfile: StudentProfile = {
      ...existing,
      gold: existing.gold - GACHA_COST,
      xp: newXp,
      level,
      inventory: updatedInventory,
      equipped: updatedEquipped,
      lastPlayedAt: Date.now()
    };

    await safeSet(studentPath, updatedProfile);
    setLocalStudentProfile(updatedProfile);

    return { success: true, wonItem, bonusXp, profile: updatedProfile };
  } catch (err: any) {
    console.error('Error spinning lucky gacha:', err);
    return { success: false, error: err.message || 'Gacha failed' };
  }
}
