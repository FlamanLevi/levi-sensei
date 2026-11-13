import React, { useState, useEffect } from 'react';
import { 
  SchoolId, 
  StudentProfile, 
  SCHOOL_CONFIGS, 
  AVATAR_CATEGORIES, 
  getRandomAvatarEmoji, 
  pickCompletelyRandomAvatar,
  resolveSchoolFromKeyword,
  parseSchoolAndClassFromPath,
  getClassSize,
  SECRET_CHARMS,
  ALL_SECRET_CHARM_EMOJIS,
  getDefaultSecretCharm,
  generateDefaultCallsign
} from '@/types/roster';
import { claimAttendanceNumber, fetchClassBoundNumbers } from '@/services/studentProfile';
import { safeGet } from '@/services/rtdbSafe';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom, verifyTeacherPin } from '@/context/ClassroomContext';
import confetti from 'canvas-confetti';
import { Sparkles, ShieldCheck, Check, Lock, Smartphone, School, Users, CheckCircle2, ChevronRight, KeyRound, X, AlertTriangle, Clock } from 'lucide-react';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';

interface StudentDeviceLinkerProps {
  onLinked: (profile: StudentProfile) => void;
  onOpenSetupPin?: (code: string) => void;
}

export const StudentDeviceLinker: React.FC<StudentDeviceLinkerProps> = ({ onLinked, onOpenSetupPin }) => {
  const { t, language } = useLanguage();
  const { setActiveGrade } = useClassroom();

  // 1. Resolve school & class from URL path, query params, or pending localStorage (Method A)
  const [lockedSchoolId, setLockedSchoolId] = useState<SchoolId | null>(() => {
    try {
      // 0. Check for testing reset flag (?reset or ?clear) to test fresh student experience
      const params = new URLSearchParams(window.location.search);
      if (params.has('reset') || params.has('clear')) {
        localStorage.removeItem('levi_sensei_pending_school');
        localStorage.removeItem('levi_sensei_pending_class');
        return null;
      }

      // 1. Check clean path (e.g. "/ftk", "/toyo", "/niko", "/tyg", "/ftk-4-1", etc.)
      const parsedPath = parseSchoolAndClassFromPath(window.location.pathname);
      if (parsedPath.schoolId) return parsedPath.schoolId;

      // 2. Check query params (?school=... or ?s=...)
      const rawSchool = params.get('school') || params.get('s');
      if (rawSchool) {
        const matched = resolveSchoolFromKeyword(rawSchool);
        if (matched) return matched;
      }

      // Check class param (?class=... or ?c=... or ?setup=...)
      const rawClass = params.get('class') || params.get('c') || params.get('setup');
      if (rawClass) {
        const parsedClass = parseSchoolAndClassFromPath(rawClass);
        if (parsedClass.schoolId) return parsedClass.schoolId;
      }

      // 3. Check saved pending school in localStorage (only if student explicitly unlocked via secret word on this iPad)
      const saved = localStorage.getItem('levi_sensei_pending_school') as SchoolId;
      if (saved === 'futakotamagawa' || saved === 'toyogaoka') return saved;
    } catch {}
    return null;
  });

  const [lockedClassId, setLockedClassId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('reset') || params.has('clear')) {
        return null;
      }

      const parsedPath = parseSchoolAndClassFromPath(window.location.pathname);
      if (parsedPath.classId) return parsedPath.classId;

      const rawClass = params.get('class') || params.get('c') || params.get('setup');
      if (rawClass) {
        const parsedClass = parseSchoolAndClassFromPath(rawClass);
        if (parsedClass.classId) return parsedClass.classId;
      }
      return localStorage.getItem('levi_sensei_pending_class') || null;
    } catch {}
    return null;
  });

  // State for manual selection fallback if no class was provided in URL
  const [selectedSchool, setSelectedSchool] = useState<SchoolId | null>(lockedSchoolId);
  const [selectedClass, setSelectedClass] = useState<string>(lockedClassId || '');
  const [isManualPickingClass, setIsManualPickingClass] = useState<boolean>(!lockedClassId);

  // Secret word input state (used when no school is known)
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keywordError, setKeywordError] = useState<boolean>(false);

  // Setup Modal State (front-and-center when claiming/linking a seat)
  const [setupModalNum, setSetupModalNum] = useState<number | null>(null);
  const [setupNickname, setSetupNickname] = useState<string>('');
  const [setupCallsign, setSetupCallsign] = useState<string>('');
  const [hasCustomCallsign, setHasCustomCallsign] = useState<boolean>(false);
  const [setupAvatar, setSetupAvatar] = useState<string>(() => getRandomAvatarEmoji());
  const [setupSecretCharm, setSetupSecretCharm] = useState<string>(() => getDefaultSecretCharm(null));
  const [activeAvatarTab, setActiveAvatarTab] = useState<string>('animals');

  const [claimedNumbers, setClaimedNumbers] = useState<Record<number, { nickname: string; callsign?: string; avatar: string; secretCharm?: string }>>({});
  const [loadingClaims, setLoadingClaims] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reclaim Challenge Modal State & Anti-Brute-Force Lockout
  const [reclaimingNum, setReclaimingNum] = useState<number | null>(null);
  const [reclaimAttempts, setReclaimAttempts] = useState<number>(0);
  const [challengeError, setChallengeError] = useState<boolean>(false);

  // Seat Lockout State (3 minutes on 2 failed secret mark attempts)
  const [lockedSeats, setLockedSeats] = useState<Record<number, number>>(() => {
    try {
      const saved = sessionStorage.getItem('levi_sensei_locked_seats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [lockoutNotice, setLockoutNotice] = useState<{ num: number; remainingSec: number } | null>(null);

  // Teacher PIN Override State
  const [isTeacherUnlockModalOpen, setIsTeacherUnlockModalOpen] = useState<boolean>(false);
  const [targetUnlockNum, setTargetUnlockNum] = useState<number | null>(null);
  const [teacherPinInput, setTeacherPinInput] = useState<string>('');
  const [teacherPinError, setTeacherPinError] = useState<boolean>(false);

  const activeSchoolId = (lockedSchoolId || selectedSchool);
  const activeClassId = (lockedClassId || selectedClass);

  const classSize = getClassSize(activeSchoolId, activeClassId);

  // Dynamic button & typography scaling calibrated to class size:
  // <= 20 seats (4 rows): generous taller cards, larger fonts & icons
  // <= 26 seats (5 rows): balanced medium cards
  // > 26 seats (6 rows): compact 56px cards to fit 1080x810 iPads with zero scroll
  const buttonHeightClass = classSize <= 20
    ? 'h-16 sm:h-18 md:h-19'
    : classSize <= 26
      ? 'h-14 sm:h-15 md:h-16'
      : 'h-13 sm:h-14 md:h-14';

  const buttonPaddingClass = classSize <= 20
    ? 'py-1.5 px-1.5'
    : classSize <= 26
      ? 'py-1.25 px-1'
      : 'py-1 px-1';

  const numberTextClass = classSize <= 20
    ? 'text-base sm:text-xl md:text-2xl'
    : classSize <= 26
      ? 'text-sm sm:text-base md:text-xl'
      : 'text-sm sm:text-base md:text-lg';

  const nicknameTextClass = classSize <= 20
    ? 'text-xs sm:text-sm md:text-base font-black'
    : classSize <= 26
      ? 'text-[11px] sm:text-xs md:text-sm font-black'
      : 'text-[11px] sm:text-xs font-black';

  const lockIconSize = classSize <= 20 ? 16 : classSize <= 26 ? 15 : 14;

  const avatarDisplaySize = classSize <= 20
    ? 'w-4 h-4 sm:w-5 sm:h-5 text-sm sm:text-base shrink-0'
    : classSize <= 26
      ? 'w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-xs sm:text-sm shrink-0'
      : 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-xs sm:text-sm shrink-0';

  const avatarSlotWidth = classSize <= 20 ? 'w-6' : 'w-5';

  // Clean URL query parameters and paths once parsed so students don't stare at messy query strings
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has('class') || url.searchParams.has('c') || url.searchParams.has('setup') || url.searchParams.has('school') || url.searchParams.has('s') || url.searchParams.has('reset') || url.searchParams.has('clear')) {
        url.searchParams.delete('class');
        url.searchParams.delete('c');
        url.searchParams.delete('setup');
        url.searchParams.delete('school');
        url.searchParams.delete('s');
        url.searchParams.delete('reset');
        url.searchParams.delete('clear');
        changed = true;
      }
      const parsedPath = parseSchoolAndClassFromPath(url.pathname);
      if (parsedPath.schoolId || parsedPath.classId) {
        url.pathname = '/';
        changed = true;
      }
      if (changed) {
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    } catch {}
  }, []);

  // Save pending school & class to localStorage for persistence
  useEffect(() => {
    if (activeSchoolId) {
      try {
        localStorage.setItem('levi_sensei_pending_school', activeSchoolId);
      } catch {}
    }
    if (activeClassId) {
      try {
        localStorage.setItem('levi_sensei_pending_class', activeClassId);
      } catch {}
    }
  }, [activeSchoolId, activeClassId]);

  // Handle school secret word submission or 4-digit setup PIN
  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = keywordInput.trim();

    // Check if user entered a 4-digit Setup Room PIN (e.g. "2301")
    if (/^\d{4}$/.test(input)) {
      try {
        const setupRoom = await safeGet<{ status: string }>(`setupRooms/${input}`);
        if (setupRoom && setupRoom.status === 'ACTIVE') {
          soundEffects.playReveal();
          if (onOpenSetupPin) {
            onOpenSetupPin(input);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking setup room:', err);
      }
    }

    const matched = resolveSchoolFromKeyword(input);
    if (matched) {
      soundEffects.playReveal();
      setLockedSchoolId(matched);
      setSelectedSchool(matched);
      setKeywordError(false);
      try {
        localStorage.setItem('levi_sensei_pending_school', matched);
      } catch {}
    } else {
      soundEffects.playIncorrect();
      setKeywordError(true);
    }
  };

  // Fetch claimed attendance numbers in real-time from Firebase RTDB
  useEffect(() => {
    if (!activeSchoolId || !activeClassId) return;

    let isMounted = true;
    setLoadingClaims(true);

    fetchClassBoundNumbers(activeSchoolId, activeClassId)
      .then((claims) => {
        if (isMounted) {
          setClaimedNumbers(claims);
          setLoadingClaims(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching claimed numbers:', err);
        if (isMounted) setLoadingClaims(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSchoolId, activeClassId]);

  const schoolConfig = activeSchoolId ? SCHOOL_CONFIGS[activeSchoolId] : null;
  const schoolName = schoolConfig ? (language === 'ja' ? schoolConfig.kanjiName : schoolConfig.name) : '';

  // Helpers for lockout management
  const getRemainingLockoutSeconds = (num: number): number => {
    const expiresAt = lockedSeats[num];
    if (!expiresAt) return 0;
    const diff = expiresAt - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  };

  const recordSeatLockout = (num: number, durationMs: number = 180000) => {
    const expiresAt = Date.now() + durationMs;
    setLockedSeats(prev => {
      const next = { ...prev, [num]: expiresAt };
      try {
        sessionStorage.setItem('levi_sensei_locked_seats', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearSeatLockout = (num: number) => {
    setLockedSeats(prev => {
      const next = { ...prev };
      delete next[num];
      try {
        sessionStorage.setItem('levi_sensei_locked_seats', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Periodic interval to keep lockoutNotice remaining seconds fresh
  useEffect(() => {
    if (!lockoutNotice) return;
    const interval = setInterval(() => {
      const sec = getRemainingLockoutSeconds(lockoutNotice.num);
      if (sec <= 0) {
        setLockoutNotice(null);
      } else {
        setLockoutNotice(prev => prev ? { ...prev, remainingSec: sec } : null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutNotice, lockedSeats]);

  const handleSelectNumber = (num: number) => {
    if (num === 0) {
      soundEffects.playTick();
      const isAlreadyUnlocked = sessionStorage.getItem('levi_sensei_teacher_unlocked') === 'true';
      if (!isAlreadyUnlocked) {
        handleOpenTeacherUnlock(0);
        return;
      }
    }

    const remainingLock = getRemainingLockoutSeconds(num);
    if (remainingLock > 0) {
      soundEffects.playIncorrect();
      setLockoutNotice({ num, remainingSec: remainingLock });
      return;
    }

    const claim = claimedNumbers[num];

    // Check if someone has a registered keyword icon (secret charm):
    // If they do, use that keyword icon to access the account via the Reclaim Challenge Modal!
    if (claim && claim.secretCharm) {
      soundEffects.playReveal();
      setReclaimAttempts(0);
      setChallengeError(false);
      setReclaimingNum(num);
      return;
    }

    // If they don't, send them to the profile creation screen so they can enter one for the first time!
    soundEffects.playTick();
    const defaultNick = claim?.nickname || (language === 'ja' ? `${num}番` : `#${num}`);
    const defaultAvatar = claim?.avatar || getRandomAvatarEmoji(num);
    let defaultCharm = getDefaultSecretCharm(num);
    if (defaultCharm === defaultAvatar) {
      defaultCharm = ALL_SECRET_CHARM_EMOJIS.find(c => c !== defaultAvatar) || '🔑';
    }
    const defaultCall = claim?.callsign || generateDefaultCallsign(defaultNick, num, activeClassId);

    setSetupModalNum(num);
    setSetupNickname(defaultNick);
    setSetupCallsign(defaultCall);
    setHasCustomCallsign(!!claim?.callsign);
    setSetupAvatar(defaultAvatar);
    setSetupSecretCharm(defaultCharm);
    setErrorMessage(null);
  };

  // Direct linking for already registered students (skips setup screen)
  const linkExistingSeatDirectly = async (
    num: number,
    nickname: string,
    avatar: string,
    secretCharm: string,
    callsign: string
  ) => {
    if (!activeSchoolId || !activeClassId) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const newProfile = await claimAttendanceNumber(
        activeSchoolId,
        activeClassId,
        num,
        nickname,
        0,
        0,
        avatar,
        0,
        0,
        undefined,
        secretCharm,
        callsign
      );

      // Auto-set grade in ClassroomContext
      if (activeClassId.startsWith('6')) {
        setActiveGrade('ES_G6');
      } else if (activeClassId.startsWith('5')) {
        setActiveGrade('ES_G5');
      } else if (activeClassId.startsWith('4')) {
        setActiveGrade('ES_G4');
      } else if (activeClassId.startsWith('3')) {
        setActiveGrade('ES_G3');
      }

      if (num === 0) {
        sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');
        localStorage.setItem('levi_sensei_role', 'TEACHER');
      }

      onLinked(newProfile);
    } catch (err: any) {
      console.error('Error linking existing seat directly:', err);
      setErrorMessage(err?.message || (language === 'ja' ? 'ログインに失敗しました。もう一度お試しください。' : 'Failed to link seat. Please try again.'));
      setSubmitting(false);
    }
  };

  const handleChallengePick = async (pickedCharm: string) => {
    if (!reclaimingNum || submitting) return;
    const num = reclaimingNum;
    const expectedCharm = claimedNumbers[num]?.secretCharm;

    if (!expectedCharm) {
      // If no keyword icon registered yet, redirect directly to profile creation to set one
      setReclaimingNum(null);
      handleSelectNumber(num);
      return;
    }

    if (pickedCharm === expectedCharm) {
      soundEffects.playFanfare();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      const prevInfo = claimedNumbers[num];
      const prevNick = prevInfo?.nickname || (language === 'ja' ? `${num}番` : `#${num}`);
      const prevAvatar = prevInfo?.avatar || getRandomAvatarEmoji(num);
      const prevCall = prevInfo?.callsign || generateDefaultCallsign(prevNick, num, activeClassId);

      clearSeatLockout(num);
      setReclaimingNum(null);
      setReclaimAttempts(0);
      setChallengeError(false);

      // Directly link and log the student into the portal without showing profile creation!
      await linkExistingSeatDirectly(num, prevNick, prevAvatar, expectedCharm, prevCall);
    } else {
      soundEffects.playIncorrect();
      const nextAttempts = reclaimAttempts + 1;
      setReclaimAttempts(nextAttempts);

      if (nextAttempts >= 2) {
        // Strike 2: Lock out seat on this device for 3 minutes (180s)
        recordSeatLockout(num, 180000);
        setReclaimingNum(null);
        setChallengeError(false);
        setLockoutNotice({ num, remainingSec: 180 });
      } else {
        // Strike 1: Show warning that next incorrect pick locks the seat
        setChallengeError(true);
      }
    }
  };

  const handleOpenTeacherUnlock = (num: number) => {
    soundEffects.playTick();
    setTargetUnlockNum(num);
    setTeacherPinInput('');
    setTeacherPinError(false);
    setIsTeacherUnlockModalOpen(true);
  };

  const handleTeacherPinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (targetUnlockNum === null || submitting) return;

    const isValid = verifyTeacherPin(teacherPinInput);
    if (isValid) {
      soundEffects.playFanfare();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });

      const num = targetUnlockNum;
      clearSeatLockout(num);
      sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');

      const prevInfo = claimedNumbers[num];
      const prevNick = prevInfo?.nickname || (num === 0 ? (language === 'ja' ? '先生' : 'Teacher') : (language === 'ja' ? `${num}番` : `#${num}`));
      const prevAvatar = prevInfo?.avatar || (num === 0 ? '👨‍🏫' : getRandomAvatarEmoji(num));
      const prevCharm = prevInfo?.secretCharm;
      const prevCall = prevInfo?.callsign || (num === 0 ? 'TEACH' : generateDefaultCallsign(prevNick, num, activeClassId));

      // Close all challenge/lockout modals
      setIsTeacherUnlockModalOpen(false);
      setLockoutNotice(null);
      setReclaimingNum(null);
      setReclaimAttempts(0);
      setTeacherPinInput('');
      setTeacherPinError(false);

      if (num === 0) {
        localStorage.setItem('levi_sensei_role', 'TEACHER');
      }

      if (prevCharm) {
        // Directly link and log into the student portal
        await linkExistingSeatDirectly(num, prevNick, prevAvatar, prevCharm, prevCall);
      } else {
        // No keyword icon set yet: open profile setup so student can choose their keyword icon!
        let defaultCharm = num === 0 ? '👑' : getDefaultSecretCharm(num);
        if (defaultCharm === prevAvatar) {
          defaultCharm = ALL_SECRET_CHARM_EMOJIS.find(c => c !== prevAvatar) || '🔑';
        }
        setSetupModalNum(num);
        setSetupNickname(prevNick);
        setSetupCallsign(prevCall);
        setHasCustomCallsign(!!prevInfo?.callsign);
        setSetupAvatar(prevAvatar);
        setSetupSecretCharm(defaultCharm);
      }
    } else {
      soundEffects.playIncorrect();
      setTeacherPinError(true);
    }
  };

  const handleRollRandomAvatar = () => {
    soundEffects.playDiceRattle();
    const nextAvatar = pickCompletelyRandomAvatar(setupAvatar);
    setSetupAvatar(nextAvatar);
    if (nextAvatar === setupSecretCharm) {
      const nextCharm = ALL_SECRET_CHARM_EMOJIS.find(c => c !== nextAvatar) || '🔑';
      setSetupSecretCharm(nextCharm);
    }
  };

  const handlePickAvatar = (emoji: string) => {
    soundEffects.playTick();
    setSetupAvatar(emoji);
    if (emoji === setupSecretCharm) {
      const nextCharm = ALL_SECRET_CHARM_EMOJIS.find(c => c !== emoji) || '🔑';
      setSetupSecretCharm(nextCharm);
    }
  };

  const handleNicknameChange = (val: string) => {
    setSetupNickname(val);
    if (!hasCustomCallsign && setupModalNum) {
      setSetupCallsign(generateDefaultCallsign(val, setupModalNum, activeClassId));
    }
  };

  const handleCallsignChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 6);
    setSetupCallsign(clean);
    setHasCustomCallsign(true);
  };

  const handlePickSecretCharm = (charmEmoji: string) => {
    if (charmEmoji === setupAvatar) return;
    soundEffects.playTick();
    setSetupSecretCharm(charmEmoji);
  };

  const handleConfirmLink = async () => {
    if (setupModalNum === null || !activeClassId || submitting) return;

    if (!activeSchoolId || !activeClassId) {
      setErrorMessage(language === 'ja' ? '学校とクラスを確認してください' : 'Please check school and class');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const finalNickname = setupNickname.trim() || (setupModalNum === 0 ? (language === 'ja' ? '先生' : 'Teacher') : (language === 'ja' ? `${setupModalNum}番` : `#${setupModalNum}`));
      const finalCallsign = setupCallsign.trim() || (setupModalNum === 0 ? 'TEACH' : generateDefaultCallsign(finalNickname, setupModalNum, activeClassId));

      const newProfile = await claimAttendanceNumber(
        activeSchoolId,
        activeClassId,
        setupModalNum,
        finalNickname,
        0,
        0,
        setupAvatar,
        0,
        0,
        undefined,
        setupSecretCharm,
        finalCallsign
      );

      if (setupModalNum === 0) {
        sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');
        localStorage.setItem('levi_sensei_role', 'TEACHER');
      }

      // Auto-set grade in ClassroomContext
      if (activeClassId.startsWith('6')) {
        setActiveGrade('ES_G6');
      } else if (activeClassId.startsWith('5')) {
        setActiveGrade('ES_G5');
      } else if (activeClassId.startsWith('4')) {
        setActiveGrade('ES_G4');
      } else if (activeClassId.startsWith('3')) {
        setActiveGrade('ES_G3');
      }

      soundEffects.playFanfare();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSetupModalNum(null);
      onLinked(newProfile);
    } catch (err: any) {
      console.error('Error linking device:', err);
      setErrorMessage(err.message || '登録に失敗しました。もう一度お試しください。');
      setSubmitting(false);
    }
  };

  // Group school classes by grade for 6-column / 4-column landscape layout
  const renderClassGrid = () => {
    if (!activeSchoolId) return null;
    const schoolClasses = SCHOOL_CONFIGS[activeSchoolId].classes;
    // Extract unique grades present in this school: ['1', '2', '3', '4', '5', '6'] or ['3', '4', '5', '6']
    const grades = Array.from(new Set(schoolClasses.map(c => c.split('-')[0]))).sort();
    const maxClassesInAnyGrade = Math.max(
      ...grades.map(g => schoolClasses.filter(c => c.startsWith(`${g}-`)).length)
    );

    // Grade header styling theme (classic Japanese elementary textbook colors)
    const gradeColorMap: Record<string, { bg: string; text: string; border: string }> = {
      '1': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
      '2': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
      '3': { bg: 'bg-lime-50 dark:bg-lime-950/40', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800' },
      '4': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
      '5': { bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
      '6': { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
    };

    const gridColsClass = grades.length === 6 ? 'grid-cols-6' : 'grid-cols-4 max-w-4xl mx-auto';

    return (
      <div className={`grid ${gridColsClass} gap-2 sm:gap-2.5 md:gap-3 mb-3 sm:mb-4`}>
        {grades.map((grade) => {
          const gradeClasses = schoolClasses.filter(c => c.startsWith(`${grade}-`));
          const color = gradeColorMap[grade] || {
            bg: 'bg-slate-50 dark:bg-slate-800',
            text: 'text-slate-700 dark:text-slate-200',
            border: 'border-slate-200 dark:border-slate-700'
          };

          return (
            <div key={grade} className="flex flex-col gap-2 sm:gap-2.5">
              {/* Grade Header */}
              <div className={`h-9 sm:h-10 rounded-2xl border-2 flex items-center justify-center font-black text-xs sm:text-sm md:text-base shadow-xs ${color.bg} ${color.text} ${color.border}`}>
                <span>{language === 'ja' ? `${grade}年` : `Gr. ${grade}`}</span>
              </div>

              {/* Class Buttons Stacked Vertically */}
              {gradeClasses.map((cId) => {
                const isCur = selectedClass === cId;
                const classNum = cId.split('-')[1];

                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => {
                      soundEffects.playTick();
                      setSelectedClass(cId);
                      setIsManualPickingClass(false);
                    }}
                    className={`w-full h-15 sm:h-16 md:h-17 rounded-2xl border-2 sm:border-3 font-black transition-all cursor-pointer flex flex-col items-center justify-center relative active:scale-95 shadow-xs ${
                      isCur
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-300 dark:ring-emerald-800 scale-102 z-10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:scale-102 shadow-xs'
                    }`}
                  >
                    <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-none">
                      {cId}
                    </span>
                    <span className={`text-[11px] sm:text-xs font-bold mt-1 leading-none ${
                      isCur ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {language === 'ja' ? `${classNum}組` : `Class ${classNum}`}
                    </span>
                  </button>
                );
              })}

              {/* Invisible spacers so all columns match the height of the tallest grade (e.g. 5 & 6) */}
              {Array.from({ length: maxClassesInAnyGrade - gradeClasses.length }).map((_, idx) => (
                <div key={`spacer-${idx}`} className="h-15 sm:h-16 md:h-17 opacity-0 pointer-events-none" aria-hidden="true" />
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 md:px-6 pt-0.5 sm:pt-1 pb-3 select-none animate-in fade-in duration-200">
      {/* Main Gated Linking Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl py-3 px-3 sm:py-3.5 sm:px-5 md:py-4 md:px-6 shadow-2xl border-4 border-emerald-400 dark:border-emerald-600 w-full">
        {/* Locked School & Class Banner (Method A) */}
        {!isManualPickingClass && activeClassId ? (
          <div className="text-center mb-2 sm:mb-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-black text-xs sm:text-sm mb-1 shadow-2xs">
              <School size={14} />
              <span>{schoolName}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-xs">{activeClassId}</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 ml-0.5">
                <Lock size={10} />
                <span>{t('Locked', '設定済み')}</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {t('Link Your iPad!', 'iPadをじぶんの番号とつなごう！')}
            </h2>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {t('Tap your attendance number below to get started.', 'あなたの出席番号（しゅっせきばんごう）をタップしてね')}
            </p>
            <div className="mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsManualPickingClass(true);
                  setLockedClassId(null);
                  setSelectedClass('');
                  try {
                    localStorage.removeItem('levi_sensei_pending_class');
                  } catch {}
                }}
                className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-bold underline cursor-pointer transition-colors"
              >
                {t('Wrong class? Choose different class', '別のクラスをえらび直す')}
              </button>
            </div>
          </div>
        ) : !activeSchoolId ? (
          /* Step 0: School Secret Word (No school names revealed!) — 2-Column Landscape */
          <div className="max-w-4xl mx-auto my-2 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7 items-center text-left">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>🔑</span>
                <span>{t('School Secret Word', 'がっこうの あいことば')}</span>
              </h2>
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 border-2 border-purple-300 dark:border-purple-700/60 shadow-xs">
                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-black text-xs sm:text-sm mb-1">
                  <span>📺</span>
                  <span>{t('TV Setup Screen PIN / QR', 'テレビに4桁PIN・QRコードが出てる？')}</span>
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-snug">
                  {t('Scan QR with camera, or type the 4-digit PIN on the right!', 'カメラでQRコードを読むか、右の枠に4桁PINを入れて決定してね！')}
                </p>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('Or enter the secret word given by your teacher:', 'または 先生から教えてもらった「あいことば」を入力してください：')}
              </p>
            </div>

            <form onSubmit={handleKeywordSubmit} className="w-full p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border-2 border-slate-200 dark:border-slate-700 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => {
                    setKeywordInput(e.target.value);
                    setKeywordError(false);
                  }}
                  placeholder={t('PIN or Secret Word', '4桁PIN / あいことば')}
                  autoFocus
                  className={`w-full py-4 px-4 text-center font-black text-2xl uppercase tracking-widest rounded-2xl border-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-4 placeholder:tracking-widest placeholder:text-slate-300 dark:placeholder:text-slate-600 ${
                    keywordError
                      ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950/50'
                      : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-950/40'
                  }`}
                />
              </div>

              {keywordError && (
                <p className="text-xs font-black text-rose-500 animate-in fade-in text-center">
                  {t('Secret word not found. Please check with your teacher!', '合言葉がみつかりません。先生にかくにんしてね！')}
                </p>
              )}

              <button
                type="submit"
                disabled={!keywordInput.trim()}
                className={`w-full py-4 rounded-2xl font-black text-base text-white transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap ${
                  keywordInput.trim()
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105 active:scale-98 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-400'
                }`}
              >
                <span>{t('Continue', 'クラスをえらぶ')}</span>
                <ChevronRight size={18} />
              </button>
            </form>
          </div>
        ) : (
          /* Step 1: Class Picker for active school ONLY (Zero mentions of other schools!) */
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
              {t('Select Your Class', 'クラスをえらんでね')}
            </h2>
            <p className="text-xs font-bold text-slate-400 mb-4">
              {t('Tap your class below to get started.', 'あなたのクラスをタップしてね')}
            </p>

            {/* Class Selector for active school ONLY */}
            {renderClassGrid()}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {activeClassId && (
          <div className="space-y-2 sm:space-y-2.5">
            {/* Step 1: Attendance Number Grid 1-35 */}
            <div>
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 px-1">
                <span>{t('Attendance Number', 'しゅっせき番号をえらぶ')}</span>
                {loadingClaims ? (
                  <span className="text-[10px] text-slate-400 font-bold animate-pulse">
                    {t('Checking roster...', '確認中...')}
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {t('Tap your seat to start', 'じぶんの席をタップしてね')}
                  </span>
                )}
              </div>

              <div className="p-2 sm:p-2.5 md:p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl sm:rounded-3xl border-2 border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2 md:gap-2.5">
                  {[0, ...Array.from({ length: Math.max(classSize, ...Object.keys(claimedNumbers).map(k => parseInt(k, 10)).filter(n => !isNaN(n) && n > 0)) }, (_, i) => i + 1)].map((num) => {
                    const isTeacherSeat = num === 0;
                    const isClaimed = !!claimedNumbers[num];
                    const claimInfo = claimedNumbers[num];
                    const hasKeywordIcon = !!claimInfo?.secretCharm;
                    const isSeatLocked = getRemainingLockoutSeconds(num) > 0;
                    const isSelected = setupModalNum === num;

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSelectNumber(num)}
                        title={
                          isTeacherSeat
                            ? (language === 'ja' ? '00番（先生・テスター席）' : '#00 (Teacher / Tester Seat)')
                            : isSeatLocked
                              ? (language === 'ja' ? `${num}番：ロック中（一時停止）` : `#${num}: Locked (cooldown)`)
                              : hasKeywordIcon
                                ? (language === 'ja'
                                    ? `${num}番（${claimInfo?.nickname || '登録済'}）：タップして合言葉で引き継ぎ`
                                    : `#${num} (${claimInfo?.nickname || 'Taken'}): Tap to unlock with secret charm`)
                                : isClaimed
                                  ? (language === 'ja'
                                      ? `${num}番（${claimInfo?.nickname}）：タップして合言葉を設定`
                                      : `#${num} (${claimInfo?.nickname}): Tap to set secret charm`)
                                  : (language === 'ja' ? `${num}番（空き）` : `#${num} (Available)`)
                        }
                        className={`${buttonHeightClass} ${buttonPaddingClass} rounded-xl sm:rounded-2xl font-black flex flex-col items-center justify-between transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-300 dark:ring-emerald-800 scale-102 z-10 border-2 sm:border-3 border-emerald-600'
                            : isTeacherSeat
                              ? 'border-2 border-purple-300 dark:border-purple-700/80 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 hover:border-purple-400 hover:scale-102 active:scale-95 shadow-xs'
                              : isSeatLocked
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-2 border-rose-300 dark:border-rose-700/60 hover:border-rose-400 hover:scale-102 active:scale-95 shadow-xs'
                                : hasKeywordIcon
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-2 border-amber-300 dark:border-amber-700/60 hover:border-amber-400 hover:scale-102 active:scale-95 shadow-xs'
                                  : isClaimed
                                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-2 border-emerald-300 dark:border-emerald-700/60 hover:border-emerald-400 hover:scale-102 active:scale-95 shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 hover:scale-102 active:scale-95 shadow-xs'
                        }`}
                      >
                        {/* Top Row: Lock Symbol (Left), Number (Center), Avatar/Emoji (Right) */}
                        <div className="w-full flex items-center justify-center gap-1.5 leading-none pt-0.5">
                          {isSeatLocked ? (
                            <div className={`${avatarSlotWidth} flex items-center justify-center shrink-0`}>
                              <Lock
                                size={lockIconSize}
                                className="shrink-0 stroke-[2.5] text-rose-600 dark:text-rose-400 animate-pulse"
                              />
                            </div>
                          ) : hasKeywordIcon ? (
                            <div className={`${avatarSlotWidth} flex items-center justify-center shrink-0`}>
                              <Lock
                                size={lockIconSize}
                                className={`shrink-0 stroke-[2.5] ${
                                  isSelected ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                                }`}
                              />
                            </div>
                          ) : isTeacherSeat ? (
                            <div className={`${avatarSlotWidth} flex items-center justify-center shrink-0 text-xs text-purple-600 dark:text-purple-400 font-black`}>
                              👨‍🏫
                            </div>
                          ) : (
                            <span className={`${avatarSlotWidth} shrink-0`} aria-hidden="true" />
                          )}

                          <span className={`${numberTextClass} font-black leading-none tracking-tight`}>
                            {num === 0 ? '00' : num}
                          </span>

                          {isClaimed && claimInfo?.avatar ? (
                            <div className={`${avatarSlotWidth} flex items-center justify-center shrink-0`}>
                              <AvatarDisplay
                                avatar={claimInfo.avatar}
                                sizeClassName={avatarDisplaySize}
                              />
                            </div>
                          ) : isTeacherSeat ? (
                            <div className={`${avatarSlotWidth} flex items-center justify-center shrink-0 text-xs text-purple-600 dark:text-purple-400 font-black`}>
                              🔑
                            </div>
                          ) : (
                            <span className={`${avatarSlotWidth} shrink-0`} aria-hidden="true" />
                          )}
                        </div>

                        {/* Bottom Row: Dedicated Full-Width Nickname or Status */}
                        <div className="w-full text-center px-1 truncate leading-none pb-0.5 overflow-hidden">
                          {isSelected ? (
                            <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-black text-white">
                              <Check size={13} className="stroke-[3]" />
                              <span>{t('Selected', '選択中')}</span>
                            </div>
                          ) : isSeatLocked ? (
                            <span className={`${nicknameTextClass} text-rose-600 dark:text-rose-400 font-black truncate block`}>
                              {language === 'ja' ? 'ロック中' : 'Locked'}
                            </span>
                          ) : hasKeywordIcon ? (
                            <span className={`${nicknameTextClass} text-amber-950 dark:text-amber-100 truncate block`}>
                              {claimInfo?.nickname || (language === 'ja' ? '登録済' : 'Taken')}
                            </span>
                          ) : isClaimed ? (
                            <span className={`${nicknameTextClass} text-emerald-900 dark:text-emerald-200 truncate block font-bold`}>
                              {claimInfo?.nickname || (language === 'ja' ? '合言葉を設定' : 'Set charm')}
                            </span>
                          ) : isTeacherSeat ? (
                            <span className="text-[10px] sm:text-[11px] text-purple-700 dark:text-purple-300 font-black">
                              {language === 'ja' ? '先生席' : 'Teacher'}
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-bold">
                              {language === 'ja' ? '空き' : 'Open'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Legend */}
              <div className="flex items-center justify-center gap-3 sm:gap-5 mt-2 sm:mt-2.5 text-[10px] sm:text-[11px] font-bold flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 inline-block" />
                  <span>{t('Available (Tap to set up)', '空いている席（タップして登録）')}</span>
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span>{t('Taken (Tap to reclaim)', '登録済み（タップで引き継ぎ）')}</span>
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span>{t('Locked (3m wait / Teacher PIN)', 'ロック中（3分待つか先生PIN）')}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seat Setup & Customization Modal (Full-Screen / Expansive Elementary Friendly Stage) */}
      {setupModalNum !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-150"
          onClick={() => {
            if (!submitting) setSetupModalNum(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-4xl w-[96vw] max-w-5xl h-[94dvh] max-h-[820px] p-5 sm:p-7 md:p-8 shadow-2xl border-4 sm:border-6 border-emerald-400 dark:border-emerald-500 relative flex flex-col justify-between overflow-y-auto overscroll-contain animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <AvatarDisplay avatar={setupAvatar} sizeClassName="w-10 h-10 sm:w-13 sm:h-13" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-3 py-0.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-xs sm:text-sm border border-emerald-200 dark:border-emerald-800">
                      {activeClassId}
                    </span>
                    <span className="px-3 py-0.5 rounded-xl bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-xs">
                      {setupModalNum === 0 ? (language === 'ja' ? '00番 先生' : '#00 Teacher') : `#${setupModalNum}番`}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight truncate">
                    {setupModalNum === 0 ? t('Teacher Profile Setup', '先生プロフィールの設定') : t(`Link Seat #${setupModalNum}`, `${setupModalNum}番のプロフィールの設定`)}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-400 truncate">
                    {t('Set your icon, name & secret charm to start!', 'アイコン・名前・合言葉を設定してスタートしよう！')}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setSetupModalNum(null);
                  setErrorMessage(null);
                }}
                className="p-2.5 sm:p-3 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title={t('Close', 'とじる')}
              >
                <X size={26} className="stroke-[2.5]" />
              </button>
            </div>

            {errorMessage && (
              <div className="my-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-black text-center shrink-0">
                {errorMessage}
              </div>
            )}

            {/* 2-Column Responsive Stage Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-7 flex-1 min-h-0 pt-3 pb-2 overflow-y-auto overscroll-contain">
              {/* Left Column: Names & Start Action (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Step 1: Nickname */}
                  <div>
                    <label className="block text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                      {t('1. Nickname', '1. ニックネーム（なまえ）')}
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={setupNickname}
                      onChange={(e) => handleNicknameChange(e.target.value)}
                      placeholder={language === 'ja' ? '例: たろう / Sara / Ken' : 'e.g. Ken / Sara'}
                      className="w-full h-14 sm:h-16 px-4 font-black text-lg sm:text-xl rounded-2xl border-3 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Step 2: Short Display Tag (Max 6ch) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🏎️</span>
                        <span>{t('Display Tag (Max 6ch)', 'TV・レース用 短縮タグ')}</span>
                      </label>
                      <span className="text-xs font-bold text-slate-400">
                        {t('Max 6 chars', '最大6文字')}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={setupCallsign}
                      onChange={(e) => handleCallsignChange(e.target.value)}
                      placeholder="3-1-1"
                      className="w-full h-14 sm:h-16 px-4 text-center uppercase tracking-widest font-mono font-black text-2xl sm:text-3xl rounded-2xl border-3 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden transition-colors shadow-2xs"
                    />
                    <p className="text-xs font-bold text-slate-400 mt-1.5 leading-relaxed">
                      {t(
                        '※Shown on 3D game leaderboards and big TV screen (e.g. 3-1-1, 4-4-14, SARA, KEN)',
                        '※大画面TVや3Dレースの順位表に「3-1-1」「4-4-14」「SARA」などの短縮タグでカッコよく表示されます！'
                      )}
                    </p>
                  </div>
                </div>

                {/* Primary Start Action */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmLink}
                    className="w-full h-16 sm:h-20 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-2xl text-white shadow-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/30 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={24} />
                    <span>
                      {submitting
                        ? t('Linking...', '登録中...')
                        : language === 'ja'
                          ? `⚡ ${setupAvatar} ${setupModalNum === 0 ? '00番（先生）' : `${setupModalNum}番`}でスタート！`
                          : `⚡ Start as ${setupAvatar} #${setupModalNum === 0 ? '00 (Teacher)' : setupModalNum}!`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setSetupModalNum(null)}
                    className="w-full py-2 text-xs sm:text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer text-center"
                  >
                    {t('Cancel / Choose Different Seat', '番号をえらび直す（キャンセル）')}
                  </button>
                </div>
              </div>

              {/* Right Column: Avatar & Secret Charm (lg:col-span-7) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4 min-h-0">
                {/* Section 2: Avatar Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {t('2. Choose Avatar Icon', '2. アイコンをえらぶ')}
                    </label>
                    <button
                      type="button"
                      onClick={handleRollRandomAvatar}
                      className="text-xs sm:text-sm font-black px-4 py-1.5 rounded-2xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs border-2 border-emerald-300 dark:border-emerald-700"
                    >
                      <span className="text-base">🎲</span>
                      <span>{t('Random Roll', 'ランダム')}</span>
                    </button>
                  </div>

                  {/* 7 Category Tabs */}
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {AVATAR_CATEGORIES.map((cat) => {
                      const isActive = activeAvatarTab === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveAvatarTab(cat.id)}
                          className={`h-10 sm:h-11 px-1 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer whitespace-nowrap text-center ${
                            isActive
                              ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 dark:ring-emerald-700 scale-102'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span>{language === 'ja' ? cat.jaName : cat.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Emojis Grid: Exactly 3 rows of 8 emojis with zero scrollbar */}
                  <div className="grid grid-cols-8 gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl sm:rounded-3xl border-2 border-slate-200 dark:border-slate-700">
                    {(AVATAR_CATEGORIES.find(c => c.id === activeAvatarTab)?.emojis || AVATAR_CATEGORIES[0].emojis).map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => handlePickAvatar(av)}
                        className={`h-10 sm:h-11 md:h-11 rounded-xl sm:rounded-2xl text-xl sm:text-2xl flex items-center justify-center transition-all cursor-pointer ${
                          setupAvatar === av
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 ring-2.5 ring-emerald-500 scale-105 shadow-xs'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 active:scale-95'
                        }`}
                      >
                        <AvatarDisplay avatar={av} sizeClassName="w-6 h-6 sm:w-7 sm:h-7" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 3: Secret Pass-Charm Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound size={16} className="text-amber-500" />
                      <span>{t('3. Secret Pass-Charm', '3. ひみつのマーク（合言葉）')}</span>
                    </label>
                    <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center gap-1.5 border border-amber-300 dark:border-amber-800">
                      <span className="text-base">{setupSecretCharm}</span>
                      <span>{t('Secret', 'ひみつ')}</span>
                    </span>
                  </div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 leading-relaxed">
                    {t(
                      '*Never shown to others. Used to unlock your seat if you ever switch iPads!',
                      '※このマークは他の人には見えません。別のiPadから入るときの「合言葉」になります！'
                    )}
                  </p>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5">
                    {SECRET_CHARMS.map((charm) => {
                      const isSelected = setupSecretCharm === charm.emoji;
                      const isSameAsPublicAvatar = setupAvatar === charm.emoji;

                      return (
                        <button
                          key={charm.emoji}
                          type="button"
                          disabled={isSameAsPublicAvatar}
                          onClick={() => handlePickSecretCharm(charm.emoji)}
                          title={
                            isSameAsPublicAvatar
                              ? (language === 'ja' ? '表のアイコンと同じものは選べません' : 'Cannot match public avatar')
                              : (language === 'ja' ? charm.jaName : charm.name)
                          }
                          className={`h-16 sm:h-18 rounded-2xl flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all border-2 relative cursor-pointer ${
                            isSameAsPublicAvatar
                              ? 'opacity-25 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed'
                              : isSelected
                                ? 'bg-amber-100 dark:bg-amber-950 border-amber-500 shadow-md ring-3 ring-amber-300 scale-102'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:scale-102 active:scale-95'
                          }`}
                        >
                          <span className="text-2xl sm:text-3xl leading-none">{charm.emoji}</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 truncate w-full text-center">
                            {language === 'ja' ? charm.jaName : charm.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reclaim / Secret Pass-Charm Challenge Modal (Large Child-Friendly Stage) */}
      {reclaimingNum !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-4xl p-5 sm:p-6 md:p-7 max-w-3xl w-full shadow-2xl border-4 sm:border-6 border-amber-400 dark:border-amber-500 text-center animate-in zoom-in-95 duration-150 flex flex-col max-h-[92dvh]">
            <div className="shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/80 border-3 border-amber-400 dark:border-amber-600 flex items-center justify-center mx-auto mb-3 shadow-md">
                <AvatarDisplay avatar={claimedNumbers[reclaimingNum]?.avatar || '🪑'} sizeClassName="w-10 h-10 sm:w-14 sm:h-14" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-black text-xs sm:text-sm mb-2">
                <span>{activeClassId}</span>
                <span>#{reclaimingNum}番</span>
                <span>{claimedNumbers[reclaimingNum]?.nickname || ''}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1.5 leading-snug">
                {t(
                  `Unlock Seat #${reclaimingNum}`,
                  <>{reclaimingNum}番（{claimedNumbers[reclaimingNum]?.nickname || '席'}）を引き継ぐ</>
                )}
              </h3>

              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                {t(
                  `Choose your secret charm to unlock this seat:`,
                  <>{claimedNumbers[reclaimingNum]?.nickname || `${reclaimingNum}番`}の<ruby>合言葉<rt>あいことば</rt></ruby>（ひみつのマーク）をえらんでね！</>
                )}
              </p>

              {/* Attempt Counter / Strike Warning */}
              {challengeError ? (
                <div className="mb-3 p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-200 text-xs sm:text-sm font-black flex items-center justify-center gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>
                    {t(
                      '❌ Incorrect mark! 1 attempt remaining before 3-minute lockout.',
                      '❌ マークがちがいます！あと1回まちがえると3分間ロックされます！'
                    )}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold mb-3">
                  <span>{t('Attempts:', '残りチャンス:')}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    {reclaimAttempts === 0 ? t('2 attempts remaining', '2回') : t('1 attempt remaining', 'あと1回')}
                  </span>
                </div>
              )}
            </div>

            {/* 12-Secret Mark Full Grid (6x2 on md/tablet, 4x3 on sm, 3x4 on phone) */}
            <div className="overflow-y-auto flex-1 min-h-0 py-1 px-0.5 mb-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                {SECRET_CHARMS.map((charm) => (
                  <button
                    key={charm.emoji}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleChallengePick(charm.emoji)}
                    className="h-20 sm:h-22 rounded-2xl bg-amber-50 hover:bg-amber-100 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 sm:border-3 border-amber-300 dark:border-amber-700/80 hover:border-amber-400 active:scale-95 transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="text-3xl sm:text-4xl leading-none">{charm.emoji}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate w-full px-1 text-center">
                      {language === 'ja' ? charm.jaName : charm.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions: Teacher PIN Override + Wrong Seat Escape */}
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleOpenTeacherUnlock(reclaimingNum)}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-300 dark:border-amber-700 whitespace-nowrap"
              >
                <span>👨‍🏫</span>
                <span>
                  {t(
                    'Teacher PIN Override',
                    <><ruby>合言葉<rt>あいことば</rt></ruby>を忘れたら先生PINで解除</>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReclaimingNum(null);
                  setChallengeError(false);
                  setReclaimAttempts(0);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('No, I picked the wrong number', 'いいえ、番号をまちがえました')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Minute Lockout Warning Modal */}
      {lockoutNotice !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-4xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-4 sm:border-5 border-rose-500 dark:border-rose-600 text-center animate-in zoom-in-95 duration-150">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-rose-100 dark:bg-rose-950/80 border-3 border-rose-400 dark:border-rose-600 flex items-center justify-center mx-auto mb-4 text-3xl sm:text-4xl shadow-md">
              🔒
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-black text-xs sm:text-sm mb-3">
              <span>#{lockoutNotice.num}番</span>
              <span>{claimedNumbers[lockoutNotice.num]?.nickname || ''}</span>
              <span>{t('Temporary Lockout', '一時ロック中')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 leading-snug">
              {t(
                `Seat #${lockoutNotice.num} is temporarily locked`,
                <>{lockoutNotice.num}番は一時的にロックされています</>
              )}
            </h3>

            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              {t(
                `Too many incorrect secret charm attempts. For security, this seat is temporarily locked on this device.`,
                <>
                  <ruby>合言葉<rt>あいことば</rt></ruby>（ひみつのマーク）が2回ちがったため、セキュリティ保護のためこの端末での受付を3分間ロックしています。
                </>
              )}
            </p>

            {/* Countdown Badge */}
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2.5 mb-6">
              <Clock className="w-5 h-5 text-rose-500 animate-pulse" />
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('Lockout Time Remaining', 'ロック解除まで')}
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">
                  {Math.floor(lockoutNotice.remainingSec / 60)}分 {lockoutNotice.remainingSec % 60}秒
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  handleOpenTeacherUnlock(lockoutNotice.num);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>👨‍🏫</span>
                <span>
                  {t(
                    'Teacher Unlock with PIN',
                    <><ruby>先生<rt>せんせい</rt></ruby>（Levi-Sensei）にPINで解除してもらう</>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLockoutNotice(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs sm:text-sm transition-colors cursor-pointer"
              >
                {t('Close', 'とじる')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher PIN Override Modal */}
      {isTeacherUnlockModalOpen && targetUnlockNum !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-4xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 sm:border-5 border-amber-500 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-500 flex items-center justify-center mx-auto mb-3 text-3xl shadow-md">
              👨‍🏫
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-black text-xs mb-2">
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t('Teacher PIN Override', '先生用ロック解除')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1.5">
              {t(
                `Unlock Seat #${targetUnlockNum}`,
                <>{targetUnlockNum}番の席を解除</>
              )}
            </h3>

            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-5">
              {t(
                'Enter 6-digit teacher PIN to unlock this seat and open setup:',
                '6桁の先生用PINコードを入力してロックを解除してください：'
              )}
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
                  className="w-full text-center text-3xl font-black tracking-widest py-3 px-4 rounded-2xl border-3 border-slate-300 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-hidden bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                {teacherPinError && (
                  <p className="mt-2 text-xs font-black text-rose-500 animate-shake">
                    {t('❌ Incorrect PIN code', '❌ PINコードが正しくありません')}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsTeacherUnlockModalOpen(false);
                    setTeacherPinInput('');
                    setTeacherPinError(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm transition-colors cursor-pointer"
                >
                  {t('Cancel', 'キャンセル')}
                </button>

                <button
                  type="submit"
                  disabled={teacherPinInput.length < 4 || submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm shadow-md transition-all cursor-pointer"
                >
                  {submitting ? t('Unlocking...', '解除中...') : t('Unlock Seat', '解除する')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Connecting / Submitting Overlay */}
      {submitting && setupModalNum === null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-black text-white">
            {t('Connecting to your seat...', '席にログイン中...')}
          </p>
        </div>
      )}
    </div>
  );
};
