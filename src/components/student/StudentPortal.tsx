import React, { useState, useEffect } from 'react';
import { useClassroom } from '../../context/ClassroomContext';
import { useVocabulary } from '../../context/VocabularyContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { GradeLevel } from '@data/types';
import { GAME_REGISTRY } from '../../games/registry';
import { Sparkles, BookOpen, Users, Play, ArrowRight, Check, Volume2, ShieldCheck, RefreshCw, Smartphone, X, Edit3, Crown, Gamepad2 } from 'lucide-react';
import { QuizStudentContainer } from '../../games/quiz/student/QuizStudentContainer';
import { QuizHostContainer } from '../../games/quiz/host/QuizHostContainer';
import { ProfileStudioStudent } from '../../games/profile_studio/ProfileStudioStudent';
import {
  getSavedStudentProfile,
  clearLocalStudentProfile,
  unlinkStudentDevice,
  fetchCloudStudentProfile,
  addRewardsToProfile,
  releaseStudentNumber
} from '@/services/studentProfile';
import { safeSubscribe, safeGet } from '@/services/rtdbSafe';
import { requestMobileFullscreen } from '@/utils/mobileFullscreen';
import { StudentProfile, parseSchoolAndClassFromPath, resolveSchoolFromKeyword } from '@/types/roster';
import { StudentDeviceLinker } from './StudentDeviceLinker';
import { EditProfileModal } from './EditProfileModal';
import { StudentStatsModal } from './StudentStatsModal';
import { EigoShopModal } from './EigoShopModal';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import confetti from 'canvas-confetti';

const STUDENT_GRADES: { grade: GradeLevel; label: string; sub: string; color: string }[] = [
  { grade: 'ES_G1', label: '1ねん', sub: 'Grade 1', color: 'from-amber-400 to-orange-400' },
  { grade: 'ES_G2', label: '2ねん', sub: 'Grade 2', color: 'from-orange-400 to-amber-500' },
  { grade: 'ES_G3', label: '3ねん', sub: 'Let\'s Try 1', color: 'from-emerald-400 to-teal-500' },
  { grade: 'ES_G4', label: '4ねん', sub: 'Let\'s Try 2', color: 'from-cyan-400 to-blue-500' },
  { grade: 'ES_G5', label: '5ねん', sub: 'Here We Go 5', color: 'from-blue-500 to-indigo-600' },
  { grade: 'ES_G6', label: '6ねん', sub: 'Here We Go 6', color: 'from-indigo-500 to-purple-600' },
];

export const StudentPortal: React.FC = () => {
  const { 
    activeGrade, 
    setActiveGrade, 
    setActiveUnit, 
    setActiveCategory, 
    activeSchool,
    setActiveSchool,
    activeClassId,
    setActiveClassId,
    openDictionary, 
    launchGame 
  } = useClassroom();
  const { gradeWords } = useVocabulary();
  const { playPop } = useAudio();
  const { t, language } = useLanguage();
  const [pinCode, setPinCode] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSoloModalOpen, setIsSoloModalOpen] = useState(false);
  const [groupPinCode, setGroupPinCode] = useState('');
  const [isHostingQuiz, setIsHostingQuiz] = useState<boolean>(false);
  const [hostedGroupCode, setHostedGroupCode] = useState<string | null>(null);
  const [groupTab, setGroupTab] = useState<'JOIN' | 'HOST'>('JOIN');
  const [isAddToHomeModalOpen, setIsAddToHomeModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isCanadaMode, setIsCanadaMode] = useState(false);

  const handleCanadaTrigger = () => {
    playPop();
    setIsCanadaMode(prev => !prev);
    confetti({
      particleCount: 45,
      spread: 70,
      colors: ['#ef4444', '#ffffff', '#dc2626', '#fca5a5'],
      origin: { y: 0.6 }
    });
  };

  const [activeSetupCode, setActiveSetupCode] = useState<string | null>(() => {
    try {
      const url = new URL(window.location.href);
      const setupParam = url.searchParams.get('setup');
      if (setupParam) {
        url.searchParams.delete('setup');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        return setupParam;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [activeQuizPin, setActiveQuizPin] = useState<string | null>(() => {
    try {
      const url = new URL(window.location.href);
      const urlPin = url.searchParams.get('pin') || url.searchParams.get('room');
      if (urlPin) {
        url.searchParams.delete('pin');
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        return urlPin;
      }
      return sessionStorage.getItem('activeQuizRoomCode') || null;
    } catch {
      return null;
    }
  });

  // Route 4-digit PINs to setup room if applicable
  useEffect(() => {
    if (activeQuizPin && activeQuizPin.length === 4) {
      safeGet<{ status: string }>(`setupRooms/${activeQuizPin}`).then((setup) => {
        if (setup && setup.status === 'ACTIVE') {
          setActiveSetupCode(activeQuizPin);
          setActiveQuizPin(null);
        }
      });
    }
  }, [activeQuizPin]);

  const [profile, setProfile] = useState<StudentProfile | null>(() => getSavedStudentProfile());
  const [isCheckingCloud, setIsCheckingCloud] = useState<boolean>(() => !getSavedStudentProfile());
  const [isTabSuperseded, setIsTabSuperseded] = useState<boolean>(false);
  const [detectedRoom, setDetectedRoom] = useState<{ code: string; gamePlayType?: string; unit?: string } | null>(null);

  const checkIsStandaloneApp = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        Boolean((window.navigator as any)?.standalone) ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('levi_pwa_standalone_active') === 'true'
      );
    } catch {
      return false;
    }
  };

  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(checkIsStandaloneApp);
  const [showHomeBonusBanner, setShowHomeBonusBanner] = useState<boolean>(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [classMismatchNotice, setClassMismatchNotice] = useState<{
    targetClass: string;
    targetSchool?: 'futakotamagawa' | 'toyogaoka';
  } | null>(() => {
    try {
      const saved = getSavedStudentProfile();
      if (!saved) return null;

      const parsedPath = parseSchoolAndClassFromPath(window.location.pathname);
      const params = new URLSearchParams(window.location.search);
      const rawClass = params.get('class') || params.get('c') || params.get('setup');
      const parsedClassParam = rawClass ? parseSchoolAndClassFromPath(rawClass) : {};
      
      const targetClass = parsedPath.classId || parsedClassParam.classId;
      const rawSchool = params.get('school') || params.get('s');
      const targetSchool = parsedPath.schoolId || parsedClassParam.schoolId || (rawSchool ? resolveSchoolFromKeyword(rawSchool) : undefined);

      if (targetClass && targetClass !== saved.classId.toLowerCase()) {
        return { targetClass, targetSchool: targetSchool || undefined };
      }
    } catch {}
    return null;
  });

  // Cloud restore effect in case local storage was cleared on iPad
  useEffect(() => {
    let isMounted = true;
    if (!profile) {
      fetchCloudStudentProfile()
        .then((cloudProf) => {
          if (isMounted && cloudProf) setProfile(cloudProf);
        })
        .finally(() => {
          if (isMounted) setIsCheckingCloud(false);
        });
    } else {
      setIsCheckingCloud(false);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Detect iPad Home Screen launch & award one-time +300 Gold bonus!
  useEffect(() => {
    const standalone = checkIsStandaloneApp();
    setIsStandaloneApp(standalone);

    if (standalone) {
      try {
        localStorage.setItem('levi_pwa_standalone_active', 'true');
      } catch {}
    }

    try {
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      const handleMediaChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          setIsStandaloneApp(true);
          try {
            localStorage.setItem('levi_pwa_standalone_active', 'true');
          } catch {}
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMediaChange);
      } else {
        (mediaQuery as any).addListener(handleMediaChange);
      }
    } catch {}

    if (standalone && profile && profile.attendanceNumber > 0 && !profile.rewardedSessions?.['ipad_homescreen_bonus']) {
      addRewardsToProfile(
        profile.schoolId,
        profile.classId,
        profile.attendanceNumber,
        50,  // +50 Bonus XP
        300, // +300 Bonus Gold
        0,
        0,
        'ipad_homescreen_bonus'
      ).then((updated) => {
        if (updated) {
          setProfile(updated);
          setShowHomeBonusBanner(true);
          playPop();
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
        }
      });
    }
  }, [profile?.schoolId, profile?.classId, profile?.attendanceNumber]);

  // Subscribe to live activeRoom for this student's exact school & class (Zero-PIN / Zero-QR auto-detection!)
  // Features Multi-Layer Resilience:
  // 1. RTDB live WebSocket subscription on activeRoom & teacherRoom
  // 2. Safari Wakeup Listener (document.visibilitychange & window.focus)
  // 3. 3.5s heartbeat polling fallback while on portal screen
  // 4. Defensive room validation to prevent transient status blips from locking out auto-join
  useEffect(() => {
    if (!profile?.schoolId || !profile?.classId || activeQuizPin !== null) {
      setDetectedRoom(null);
      return;
    }

    let isMounted = true;
    const activeRoomPath = `schools/${profile.schoolId}/classes/${profile.classId}/analyticsSummary/activeRoom`;
    const teacherRoomPath = `schools/${profile.schoolId}/classes/${profile.classId}/analyticsSummary/teacherRoom`;

    type RoomSummary = { code: string; gamePlayType?: string; unit?: string; updatedAt?: number; isTeacher?: boolean };

    const verifyAndApplyRoom = async (data: RoomSummary | null) => {
      if (!isMounted) return;
      if (!data || !data.code) {
        setDetectedRoom(null);
        return;
      }
      // Ignore stale rooms older than 90 minutes
      if (data.updatedAt && Date.now() - data.updatedAt > 90 * 60 * 1000) {
        setDetectedRoom(null);
        return;
      }

      try {
        const status = await safeGet<string>(`rooms/${data.code}/status`);
        if (!isMounted) return;
        // If room was created very recently (<45s), allow it even if status node is still initializing
        const isFresh = data.updatedAt ? (Date.now() - data.updatedAt < 45 * 1000) : false;
        if (status === 'CLOSED' || status === 'GAME_OVER') {
          setDetectedRoom(null);
        } else if (status || isFresh) {
          setDetectedRoom(data);
        } else {
          setDetectedRoom(null);
        }
      } catch (err) {
        // On transient network error on iPad, if data.code is fresh, do not discard
        if (isMounted && data.code) {
          setDetectedRoom(data);
        }
      }
    };

    const pollActiveRoom = async () => {
      try {
        let active = await safeGet<RoomSummary>(activeRoomPath);
        if (!active || !active.code) {
          active = await safeGet<RoomSummary>(teacherRoomPath);
        }
        await verifyAndApplyRoom(active);
      } catch {}
    };

    // 1. Live RTDB Subscription
    const unsub = safeSubscribe<RoomSummary>(activeRoomPath, (data) => {
      verifyAndApplyRoom(data);
    });

    // 2. Safari Wakeup Event Handlers (unlocking iPad or switching back to Safari)
    const handleWakeup = () => {
      if (document.visibilityState === 'visible') {
        pollActiveRoom();
      }
    };

    document.addEventListener('visibilitychange', handleWakeup);
    window.addEventListener('focus', handleWakeup);

    // 3. Fast 3.5s Heartbeat Polling Fallback to catch rooms even if WebSockets stagnated
    const intervalId = setInterval(pollActiveRoom, 3500);

    // Initial check
    pollActiveRoom();

    return () => {
      isMounted = false;
      unsub();
      document.removeEventListener('visibilitychange', handleWakeup);
      window.removeEventListener('focus', handleWakeup);
      clearInterval(intervalId);
    };
  }, [profile?.schoolId, profile?.classId, activeQuizPin]);

  const handleClearProfile = async () => {
    playPop();
    await unlinkStudentDevice();
    setProfile(null);
    setIsUnlinkModalOpen(false);
  };

  const handleResetSeat = async () => {
    playPop();
    if (profile && profile.attendanceNumber > 0) {
      await releaseStudentNumber(profile.schoolId, profile.classId, profile.attendanceNumber);
    }
    await unlinkStudentDevice();
    setProfile(null);
    setIsUnlinkModalOpen(false);
  };

  const handleGradeSelect = (g: GradeLevel) => {
    playPop();
    setActiveGrade(g);
    setActiveUnit('ALL');
    setActiveCategory('ALL');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    requestMobileFullscreen();
    if (pinCode.length === 4) {
      playPop();
      const code = pinCode.trim();
      setIsPinModalOpen(false);
      setPinCode('');
      try {
        const setupRoom = await safeGet<{ status: string }>(`setupRooms/${code}`);
        if (setupRoom && setupRoom.status === 'ACTIVE') {
          setActiveSetupCode(code);
          return;
        }
      } catch (err) {
        console.error('Error checking setup room:', err);
      }
      setActiveQuizPin(code);
    }
  };

  const handleGroupPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestMobileFullscreen();
    if (groupPinCode.length === 4) {
      playPop();
      const code = groupPinCode;
      setIsGroupModalOpen(false);
      setGroupPinCode('');
      setActiveQuizPin(code);
    }
  };

  const handleGenerateGroupCode = () => {
    playPop();
    // Student-created peer games strictly use 7xxx (7000 - 7999)
    const newCode = (7000 + Math.floor(Math.random() * 1000)).toString();
    setHostedGroupCode(newCode);
    confetti({
      particleCount: 45,
      spread: 65,
      origin: { y: 0.6 }
    });
  };

  const handleExitQuiz = () => {
    try {
      sessionStorage.removeItem('activeQuizRoomCode');
      sessionStorage.removeItem('activeQuizPlayerId');
      sessionStorage.removeItem('activeQuizNickname');
      const url = new URL(window.location.href);
      url.searchParams.delete('pin');
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch {
      // Ignore
    }
    setActiveQuizPin(null);
    // Refresh local profile in case rewards were claimed
    setProfile(getSavedStudentProfile());
  };

  // Zombie Tab Guard: prevent multiple duplicate tabs on iPad Safari from fighting over WebSockets
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const channel = new BroadcastChannel('levi_sensei_student_tab');
      channel.postMessage('NEW_TAB_OPENED');
      channel.onmessage = (event) => {
        if (event.data === 'NEW_TAB_OPENED') {
          setIsTabSuperseded(true);
        }
      };
      return () => {
        channel.close();
      };
    } catch {}
  }, []);

  // Sync active school, class, and grade with student's linked profile
  useEffect(() => {
    if (profile?.schoolId && profile.schoolId !== activeSchool) {
      setActiveSchool(profile.schoolId);
    }
    if (profile?.classId) {
      if (profile.classId !== activeClassId) {
        setActiveClassId(profile.classId);
      }
      if (profile.classId.startsWith('6')) {
        setActiveGrade('ES_G6');
      } else if (profile.classId.startsWith('5')) {
        setActiveGrade('ES_G5');
      } else if (profile.classId.startsWith('4')) {
        setActiveGrade('ES_G4');
      } else if (profile.classId.startsWith('3')) {
        setActiveGrade('ES_G3');
      }
    }
  }, [profile?.schoolId, profile?.classId, activeSchool, activeClassId, setActiveSchool, setActiveClassId, setActiveGrade]);

  // Sleeping state if another tab was opened on this device
  if (isTabSuperseded) {
    return (
      <div className="w-full min-h-[60dvh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-400 text-amber-700 dark:text-amber-300 flex items-center justify-center text-3xl mb-4 shadow-md">
          💤
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
          {t('This tab is now resting', 'このタブはスリープ中です')}
        </h3>
        <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          {t(
            'Another tab of Levi-Sensei was opened on this iPad. Tap below if you want to use this tab instead.',
            '別のタブでリヴァイ先生が開かれました。このタブをもう一度使いたいときは下のボタンを押してね。'
          )}
        </p>
        <button
          type="button"
          onClick={() => setIsTabSuperseded(false)}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          {t('Wake Up This Tab', 'このタブをもう一度つかう！')}
        </button>
      </div>
    );
  }

  // Loading state while restoring cloud profile on fresh reload
  if (isCheckingCloud) {
    return (
      <div className="w-full min-h-[50dvh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-base font-black text-slate-700 dark:text-slate-200">
          {t('Checking profile...', 'プロフィールを確認中...')}
        </p>
      </div>
    );
  }

  // 1. Live Quiz Fast-Path: Allow scanning QR code (?pin=...) to join quiz directly even if not yet bound
  if (activeQuizPin !== null) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-dvh overflow-hidden bg-slate-950 flex flex-col">
        <QuizStudentContainer
          initialPin={activeQuizPin}
          onExit={handleExitQuiz}
        />
      </div>
    );
  }

  // 2. Student Host Fast-Path
  if (isHostingQuiz) {
    return (
      <div className="min-h-dvh bg-slate-950 text-white flex flex-col">
        <QuizHostContainer
          isStudentHost={true}
          onExit={() => {
            setIsHostingQuiz(false);
          }}
        />
      </div>
    );
  }

  // 0. Setup Room Fast-Path (Teacher Front TV QR code / PIN setup session)
  if (activeSetupCode !== null) {
    return (
      <ProfileStudioStudent
        code={activeSetupCode}
        onFinished={(newProf) => {
          setProfile(newProf);
          setActiveSetupCode(null);
        }}
        onCancel={() => {
          setActiveSetupCode(null);
        }}
      />
    );
  }

  // 3. Default Gate: If device is not yet linked, display link screen exclusively
  if (!profile) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-1 sm:py-2">
        <StudentDeviceLinker onLinked={(newProf) => setProfile(newProf)} onOpenSetupPin={(code) => setActiveSetupCode(code)} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 w-full">
      {/* Class Mismatch Escape Hatch: When iPad cart rolls from 5-1 to 5-2 */}
      {classMismatchNotice && profile && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-amber-500/15 border-3 border-amber-400 dark:border-amber-500 text-slate-900 dark:text-white shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-200">
                {t("Switch to New Class?", "クラスを切り替えますか？")}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                {t(
                  `This iPad is currently registered as ${profile.classId} #${profile.attendanceNumber} (${profile.nickname}). Would you like to switch to ${classMismatchNotice.targetClass}?`,
                  <>このiPadはまえのクラス【<span className="font-black text-amber-700 dark:text-amber-300">{profile.classId} {profile.attendanceNumber}番</span>】のままです。いまのクラス【<span className="font-black text-emerald-600 dark:text-emerald-400">{classMismatchNotice.targetClass}</span>】の席をえらびますか？</>
                )}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-nowrap overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={async () => {
                    playPop();
                    await unlinkStudentDevice();
                    if (classMismatchNotice.targetSchool) {
                      localStorage.setItem('levi_sensei_pending_school', classMismatchNotice.targetSchool);
                    }
                    localStorage.setItem('levi_sensei_pending_class', classMismatchNotice.targetClass);
                    setClassMismatchNotice(null);
                    setProfile(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Check size={16} />
                  <span>{t(`Yes, switch to ${classMismatchNotice.targetClass}`, `はい、【${classMismatchNotice.targetClass}】の席をえらぶ`)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClassMismatchNotice(null)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-black text-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  {t(`Keep as ${profile.classId}`, `このまま【${profile.classId}】をつづける`)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎁 iPad Home Screen Bonus Celebration Banner */}
      {showHomeBonusBanner && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-xl border-3 border-amber-300 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">🎉</span>
            <div>
              <h4 className="font-black text-sm sm:text-base leading-tight">
                {t('Home Screen App Bonus Claimed!', 'ホーム画面アプリアイコン追加ボーナス！')}
              </h4>
              <p className="text-xs font-bold text-amber-950 mt-0.5">
                {t('+300 Gold & +50 XP added to your profile! Have fun in English class!', '+300 Gold & +50 XP をゲットしました！これからも楽しく英語を学ぼう！')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHomeBonusBanner(false)}
            className="p-1.5 rounded-xl bg-black/10 hover:bg-black/20 text-slate-900 font-black text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🚀 ZERO-PIN AUTO-DETECTED CLASS GAME BANNER */}
      {detectedRoom && profile && (
        <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl border-4 border-yellow-300 animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <span className="text-4xl sm:text-5xl animate-bounce">🚀</span>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-300 text-slate-900 font-black text-xs mb-1">
                {t("LIVE NOW!", "いま先生の画面でゲーム中！")}
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                {t(
                  `Class ${profile.classId} Game is Ready!`,
                  <>{profile.classId} のゲームがはじまったよ！</>
                )}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-emerald-100">
                {t("No PIN needed! Tap the button to jump right in!", "4けたの番号はパス！ボタンを1回タップするだけで参加できるよ！")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              requestMobileFullscreen();
              playPop();
              setActiveQuizPin(detectedRoom.code);
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-yellow-300 hover:bg-yellow-200 text-slate-950 font-black text-base sm:text-lg shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <span>{t("Join Game Now!", "今すぐゲームに参加！")}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10 w-full">
          {/* Top Row: School/Class Badge (left) and Add App to iPad (right) */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-nowrap">
            <div className="min-w-0">
              {profile && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-950/40 border border-emerald-300/40 text-emerald-200 whitespace-nowrap">
                  <ShieldCheck size={14} />
                  <span>
                    {profile.attendanceNumber === 0
                      ? t("👨‍🏫 Teacher / Tester Mode", "👨‍🏫 先生・テスターモード")
                      : `${profile.classId} #${profile.attendanceNumber} ${t("Linked", "登録済み")}`}
                  </span>
                </span>
              )}
            </div>

            {!isStandaloneApp && (
              <button
                onClick={() => setIsAddToHomeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors cursor-pointer text-white shadow-xs ml-auto shrink-0 whitespace-nowrap"
                title={t("How to add app to iPad Home Screen", "iPadのホーム画面にアプリアイコンを追加する方法")}
              >
                <Smartphone size={13} />
                <span>{t("📲 Add App to iPad", "📲 ホーム画面に追加")}</span>
              </button>
            )}
          </div>

          {/* Middle Row: Personalized Greeting with Aura & Title */}
          <div className="flex items-center gap-3 my-2 min-w-0">
            {profile && (
              <div className="p-1 rounded-2xl bg-white/20 backdrop-blur-md shrink-0 shadow-inner">
                <AvatarDisplay 
                  avatar={profile.avatar || '🐼'} 
                  frameId={profile.equipped?.frame}
                  sizeClassName="w-10 h-10 sm:w-12 sm:h-12 text-3xl sm:text-4xl"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar">
                <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight truncate">
                  {profile
                    ? (language === 'ja'
                        ? `こんにちは、${profile.nickname}さん！`
                        : `Hello, ${profile.nickname}!`)
                    : t("Hello! Welcome to Levi Sensei's English Room", "Hello! リヴァイ先生のえいごルーム")}
                </h2>
                {profile?.equipped?.title && (
                  <span className="px-2.5 py-0.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md border border-amber-300 shrink-0 whitespace-nowrap">
                    {profile.equipped.title}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Stats on Left, Actions on Right */}
          {profile ? (
            <div className="flex items-center justify-between gap-2.5 text-emerald-100 font-bold text-xs md:text-sm mt-3 flex-nowrap overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 flex-nowrap shrink-0">
                <span className="bg-white/20 px-3 py-1 rounded-xl shrink-0 whitespace-nowrap">⭐️ {t(`Level ${profile.level}`, `レベル ${profile.level}`)} ({profile.xp.toLocaleString()} XP)</span>
                <span className="bg-white/20 px-3 py-1 rounded-xl shrink-0 whitespace-nowrap">🪙 {profile.gold} Gold</span>
                {profile.callsign && (
                  <span className="bg-white/20 px-2.5 py-1 rounded-xl uppercase font-mono tracking-wider font-black text-xs shrink-0 whitespace-nowrap" title="Broadcast Callsign">
                    🏎️ {profile.callsign}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto flex-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    setIsShopOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer border border-amber-300 shrink-0 whitespace-nowrap"
                  title={t("Eigo Shop: Buy auras, rare avatars, and karts", "えいごショップ：オーラや限定アバターを購入")}
                >
                  <span>🛍️</span>
                  <span>{t("Shop", "ショップ")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    setIsStatsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer border border-white/20 shrink-0 whitespace-nowrap"
                  title={t("View learning stats and trophies", "学習カルテとトロフィーケース")}
                >
                  <span>📊</span>
                  <span>{t("My Passport", "じぶんの記録")}</span>
                </button>
                <button
                  onClick={() => setIsEditProfileOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer border border-white/20 shrink-0 whitespace-nowrap"
                  title={t("Edit nickname and avatar", "ニックネームとアバターを変更")}
                >
                  <Edit3 size={12} />
                  <span>{t("Edit Profile", "プロフィール")}</span>
                </button>
                {profile.attendanceNumber === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playPop();
                      sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');
                      localStorage.setItem('levi_sensei_role', 'TEACHER');
                      window.location.href = '/teacher';
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer border border-amber-300 shrink-0 whitespace-nowrap"
                    title={t("Return to Teacher Hub", "先生ポータルに戻る")}
                  >
                    <span>👨‍🏫</span>
                    <span>{t("Teacher Hub", "先生ハブ")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    setIsUnlinkModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white font-black text-xs transition-all shadow-xs cursor-pointer border border-white/20 shrink-0 whitespace-nowrap"
                  title={t("Switch student or class", "席の交代・別のクラスをえらぶ")}
                >
                  <RefreshCw size={12} />
                  <span>{profile.attendanceNumber === 0 ? t("Exit Test Mode", "テスト終了") : t("Switch Seat", "席をかえる")}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs md:text-sm text-emerald-100 font-bold leading-relaxed mt-2">
              {t("Choose your grade and let's have fun learning English together!", <>じぶんの<ruby>学年<rt>がくねん</rt></ruby>をえらんで、たのしく<ruby>英語<rt>えいご</rt></ruby>であそぼう！</>)}
            </p>
          )}
        </div>
        <div className="absolute -right-6 -bottom-6 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Grade Selector (only shown if not linked to a class/seat) */}
      {!profile && (
        <div className="mb-8">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <span>🎒</span>
            <span>{t("Choose your grade:", <>あなたの<ruby>学年<rt>がくねん</rt></ruby>をえらんでね:</>)}</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {STUDENT_GRADES.map(item => {
              const isSelected = activeGrade === item.grade;
              return (
                <button
                  key={item.grade}
                  onClick={() => handleGradeSelect(item.grade)}
                  className={`py-3 px-2 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center text-center shadow-xs active:scale-95 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-md ring-2 ring-emerald-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="text-lg font-black">{t(item.sub, item.label)}</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{t(item.label, item.sub)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Activities for Students (Stream B, Stream C, Stream D) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Stream B - Join Class Game */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform">
              <Users size={28} />
            </div>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 inline-block mb-2">
              {t("Multiplayer (Stream 🅱️)", "クラス全員 (Stream 🅱️)")}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              {t("Join Class Game", "クラスのゲームにさんか")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
              {t("Enter the 4-digit PIN shown on the classroom TV screen to join the game!", "前のテレビにでている 4けたの 番号（PINコード）をいれて、クラス対抗ゲームに参加しよう！")}
            </p>
          </div>
          <button
            onClick={() => { requestMobileFullscreen(); playPop(); setIsPinModalOpen(true); }}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-purple-500 to-indigo-600 shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t("Enter PIN to Join", "ばんごうをいれる")}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Card 2: Stream C - Group & Pair Games */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform">
              <Users size={28} />
            </div>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 inline-block mb-2">
              {t("Group & Pair (Stream 🅲)", "グループ・ペア (Stream 🅲)")}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              {t("Group & Pair Games", "友だち・グループ対戦")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
              {t("Host a table game for your group or enter your friend's 4-digit code to play together!", "同じ班の友だちと対戦しよう！じぶんで部屋を作るか、友だちの部屋番号をいれてね！")}
            </p>
          </div>
          <button
            onClick={() => { requestMobileFullscreen(); playPop(); setIsGroupModalOpen(true); }}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-teal-500 to-emerald-600 shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t("Play with Friends", "友だちとあそぶ")}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Card 3: Stream D - Solo Study & Practice */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between group">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition-transform">
              <Gamepad2 size={28} />
            </div>
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 inline-block mb-2">
              {t("Solo Study (Stream 🅳)", "ひとりで特訓 (Stream 🅳)")}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              {t("Solo Practice Arcade", "ひとりで特訓・ゲーム")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">
              {t("Play Pixel Reveal, Speed Flashcards, Memory Match, or Monster Lab to earn XP and Gold!", "ピクセルクイズやフラッシュカード、神経衰弱で楽しく英語の特訓をしよう！")}
            </p>
          </div>
          <button
            onClick={() => { requestMobileFullscreen(); playPop(); setIsSoloModalOpen(true); }}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-amber-400 to-orange-500 shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t("Choose a Game", "ゲームをえらぶ")}</span>
            <Play size={16} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Radio Taiso 10-Stamp Attendance Card (ラジオ体操風スタンプカード) */}
      {profile && (
        <div className="mb-10 p-4 sm:p-6 rounded-3xl bg-[#faf8f5] dark:bg-slate-900 border-3 border-amber-400/80 dark:border-amber-500/50 shadow-md relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-dashed border-amber-300 dark:border-amber-700/60 flex-nowrap overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={handleCanadaTrigger}
                className="text-xl sm:text-2xl hover:scale-125 transition-transform cursor-pointer shrink-0"
                title={isCanadaMode ? "🇨🇦 カナダちゃん！" : "🍁 タップしてみてね！"}
              >
                {isCanadaMode ? "🍁" : "🌸"}
              </button>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 min-w-0 truncate">
                {t(
                  isCanadaMode ? "Canada-chan's English Stamp Card 🇨🇦" : "Levi-Sensei's English Stamp Card",
                  isCanadaMode ? (
                    <>カナダちゃん<span className="text-xs font-bold text-red-500">🇨🇦🍁</span>の えいごスタンプカード</>
                  ) : (
                    <>リヴァイ<ruby>先生<rt>せんせい</rt></ruby>の えいごスタンプカード</>
                  )
                )}
              </h3>
              <button
                type="button"
                onClick={handleCanadaTrigger}
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition-all cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  isCanadaMode
                    ? 'bg-red-500 text-white border-red-600 shadow-sm animate-pulse'
                    : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300 border-red-200 dark:border-red-800/60'
                }`}
                title={t("Canada-chan Easter Egg! Click to celebrate", "通称：カナダちゃん！クリックしてみてね")}
              >
                <span>🇨🇦</span>
                <span>{isCanadaMode ? "カナダちゃん🍁" : "カナダちゃん？"}</span>
              </button>
            </div>
            <div className="text-xs font-black text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-800 shrink-0 whitespace-nowrap">
              {profile.attendanceNumber === 0 
                ? t("Teacher / Tester Card (Canada-chan 🇨🇦)", <><ruby>先生<rt>せんせい</rt></ruby>・カナダちゃんカード 🇨🇦</>)
                : `${profile.classId} #${profile.attendanceNumber} ${profile.nickname}`}
            </div>
          </div>

          {/* 10-Stamp Grid (2 rows of 5) */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 10 }, (_, i) => {
              const dayNum = i + 1;
              const currentDayIndex = Math.min(10, Math.max(1, ((profile.stats?.gamesPlayed || 0) % 10) + 1));
              const isStamped = dayNum < currentDayIndex;
              const isToday = dayNum === currentDayIndex;

              return (
                <div
                  key={dayNum}
                  onClick={() => playPop()}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-transform active:scale-95 cursor-pointer text-center relative ${
                    isStamped
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 shadow-xs'
                      : isToday
                        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-300 animate-pulse'
                        : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 opacity-60'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {t(`Day ${dayNum}`, <>{dayNum}<ruby>日目<rt>にちめ</rt></ruby></>)}
                  </span>
                  
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 border-dashed relative">
                    {isStamped ? (
                      <span className="text-2xl sm:text-3xl filter drop-shadow-[0_2px_4px_rgba(220,38,38,0.4)] animate-pop-jelly">
                        💮
                      </span>
                    ) : isToday ? (
                      <span className="text-xl sm:text-2xl animate-bounce">
                        ⭐️
                      </span>
                    ) : (
                      <span className="text-sm opacity-40">
                        🔒
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-black mt-1 text-slate-700 dark:text-slate-300">
                    {isStamped 
                      ? t("Done!", "たいへんよくできました") 
                      : isToday 
                        ? t("Today!", "きょう！") 
                        : t("Next", "つぎ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PIN Code Modal */}
      {isPinModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPinModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-white dark:border-slate-800 flex flex-col items-center text-center text-slate-900 dark:text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              {t("Join Class Game", "ゲームに参加")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
              {t("Enter the 4-digit PIN shown on the classroom screen!", "先生の画面にでている 4けたのばんごう をいれてね！")}
            </p>

            <form onSubmit={handlePinSubmit} className="w-full space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinCode}
                onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="1 2 3 4"
                autoFocus
                className="w-full py-4 text-center font-mono font-black text-3xl tracking-widest rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-950/40"
              />
              <button
                type="submit"
                disabled={pinCode.length !== 4}
                className={`w-full py-4 rounded-2xl font-black text-base text-white transition-all shadow-md ${
                  pinCode.length === 4
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:brightness-105 active:scale-98 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400'
                }`}
              >
                {t("Join Now!", "さんかする！")}
              </button>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {t("Cancel", "キャンセル")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stream C: Group & Pair Play Modal */}
      {isGroupModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 md:p-7 max-w-2xl w-full max-h-[90dvh] overflow-y-auto shadow-2xl border-4 border-white dark:border-slate-800 flex flex-col text-slate-900 dark:text-white relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex-nowrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Users size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-black tracking-tight truncate">
                    {t("Group & Pair Play", "友だち・グループ対戦")}
                  </h3>
                  <span className="text-[11px] font-black text-teal-600 dark:text-teal-400">
                    Stream 🅲 (2〜6 Players)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Segmented Mode Selector: Join vs Host */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-5 gap-1">
              <button
                type="button"
                onClick={() => { playPop(); setGroupTab('JOIN'); }}
                className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  groupTab === 'JOIN'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🤝</span>
                <span>{t("Join Friend's Room", "部屋に入る")}</span>
              </button>
              <button
                type="button"
                onClick={() => { playPop(); setGroupTab('HOST'); }}
                className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  groupTab === 'HOST'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>👑</span>
                <span>{t("Host a Room", "部屋をつくる")}</span>
              </button>
            </div>

            {groupTab === 'JOIN' ? (
              <form onSubmit={handleGroupPinSubmit} className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-4 items-center">
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 space-y-1.5">
                  <div className="text-xs font-black text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                    <span>🔢</span>
                    <span>{t("4-Digit Room PIN", "4けたの部屋番号")}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {t("Enter the 4-digit code given by your table leader or friend!", "友だちや班のリーダーが教えてくれた4けたの部屋番号を入れてね！")}
                  </p>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={groupPinCode}
                    onChange={e => setGroupPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="1 2 3 4"
                    autoFocus
                    className="w-full py-3.5 text-center font-mono font-black text-3xl tracking-widest rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-950/40"
                  />
                  <button
                    type="submit"
                    disabled={groupPinCode.length !== 4}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all shadow-md whitespace-nowrap ${
                      groupPinCode.length === 4
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:brightness-105 active:scale-98 cursor-pointer'
                        : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t("Join Group Now!", "グループに参加する！")}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-4 items-center">
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border-2 border-teal-200 dark:border-teal-800 flex items-start gap-3 text-left">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                    👑
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-teal-950 dark:text-teal-200 mb-1">
                      {t("Table Leader Arena", "班のリーダー対戦")}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t("Choose Sprint Race, Tug-of-War, Bean Bag Toss, or Quiz and host for your friends!", "スプリントレース、つなひき、玉入れ、早押しクイズを自由にえらんで対戦できます！")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {t("Launch the game room on this iPad so your tablemates can join with your room code.", "このiPadに対戦アリーナと部屋番号を表示して、班のみんなを招待しよう！")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      playPop();
                      setIsGroupModalOpen(false);
                      setIsHostingQuiz(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:brightness-105 active:scale-98 text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Crown size={18} />
                    <span>{t("Launch Room as Leader", "リーダーとして部屋をつくる！")}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stream D: Solo Practice & Mini-Games Modal */}
      {isSoloModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsSoloModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 md:p-7 max-w-4xl w-full shadow-2xl border-4 border-white dark:border-slate-800 flex flex-col text-slate-900 dark:text-white relative max-h-[90dvh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex-nowrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <Gamepad2 size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-black tracking-tight truncate">
                    {t("Solo Practice Arcade", "ひとりで特訓・ミニゲーム")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    {t("Stream 🅳: Practice at your own pace and earn XP & Gold!", "Stream 🅳: じぶんのペースで特訓して、レベルアップしよう！")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSoloModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Game Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Game 1: Pixel Reveal */}
              <button
                type="button"
                onClick={() => {
                  playPop();
                  setIsSoloModalOpen(false);
                  launchGame('pixel_reveal');
                }}
                className="p-4 rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition-all text-left flex items-start gap-3.5 cursor-pointer group active:scale-98"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  🖼️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {t("Pixel Reveal", "ピクセル・リビール")}
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      ★ おすすめ
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {t("Guess the textbook artwork before pixels clear up!", "モザイクが消える前にイラストを当てよう！")}
                  </p>
                </div>
              </button>

              {/* Game 2: Speed Flashcard Race */}
              <button
                type="button"
                onClick={() => {
                  playPop();
                  setIsSoloModalOpen(false);
                  launchGame('speed_flash');
                }}
                className="p-4 rounded-2xl border-2 border-blue-300/80 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left flex items-start gap-3.5 cursor-pointer group active:scale-98"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  ⚡
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {t("Speed Flashcards", "スピードフラッシュ")}
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200">
                      Drill
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {t("Rapid-fire vocabulary cards with authentic native audio!", "教科書の単語を超高速でめくって耳で覚える！")}
                  </p>
                </div>
              </button>

              {/* Game 3: Memory Match (Concentration) */}
              <button
                type="button"
                onClick={() => {
                  playPop();
                  setIsSoloModalOpen(false);
                  launchGame('concentration');
                }}
                className="p-4 rounded-2xl border-2 border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-start gap-3.5 cursor-pointer group active:scale-98"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  🃏
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {t("Memory Match", "神経衰弱（えあわせ）")}
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                      Card
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {t("Flip cards and match English vocabulary with illustrations!", "英語とイラストのペアを見つける神経衰弱ゲーム！")}
                  </p>
                </div>
              </button>

              {/* Game 4: Monster Lab */}
              <button
                type="button"
                onClick={() => {
                  playPop();
                  setIsSoloModalOpen(false);
                  launchGame('monster_maker');
                }}
                className="p-4 rounded-2xl border-2 border-purple-300/80 dark:border-purple-700/60 bg-purple-50/50 dark:bg-purple-950/20 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md transition-all text-left flex items-start gap-3.5 cursor-pointer group active:scale-98"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center text-2xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  👾
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {t("Monster Lab", "モンスターメーカー")}
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                      Create
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {t("Combine body parts, colors, and numbers to make wild creatures!", "からだのパーツや色をえらんでオリジナルモンスターを作ろう！")}
                  </p>
                </div>
              </button>

              {/* Tool 5: Picture Dictionary */}
              <button
                type="button"
                onClick={() => {
                  playPop();
                  setIsSoloModalOpen(false);
                  openDictionary();
                }}
                className="p-4 rounded-2xl border-2 border-slate-300/80 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left flex items-start gap-3.5 cursor-pointer group active:scale-98 sm:col-span-2"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 text-white flex items-center justify-center text-2xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  📚
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {t("Interactive Picture Dictionary", "えいご絵じてん（ピクチャーディクショナリー）")}
                    </h4>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {gradeWords.length} words
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {t(`Browse all ${gradeWords.length} textbook cards with authentic native pronunciation audio and pictures!`, `学年の全${gradeWords.length}単語をイラストとネイティブ発音でじっくり学ぼう！`)}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Home Screen Modal Guide for Elementary School iPads */}
      {isAddToHomeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddToHomeModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 md:p-7 max-w-md md:max-w-3xl w-full shadow-2xl border-4 border-white dark:border-slate-800 flex flex-col text-slate-900 dark:text-white relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddToHomeModalOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Smartphone size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-black truncate">
                  {t("Add Levi Sensei to iPad Home Screen", "iPadのホーム画面に「リヴァイ先生」を追加")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">
                  {t("One-time setup for 1-tap app launch every class!", "1回設定すれば、次の授業からはアイコンを1タップで起動できます！")}
                </p>
              </div>
            </div>

            {/* 3 Steps side-by-side on landscape tablets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-1">
              {/* Step 1 */}
              <div className="flex md:flex-col items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-black text-slate-900 dark:text-white mb-1">
                    {t('Tap the Safari Share button', 'Safariの画面の「共有ボタン」をタップ')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {t('Look for the square icon with an arrow pointing up [⎋] at the top-right (or bottom).', '画面の右上（または下）にある、四角から矢印が出ているアイコン [⎋] です。')}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex md:flex-col items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-black text-slate-900 dark:text-white mb-1">
                    {t('Select "Add to Home Screen"', '「ホーム画面に追加」をえらぶ')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {t('Scroll down the share sheet and tap "Add to Home Screen" [ ➕ ].', '出てきたメニューを少し下にスクロールして、「ホーム画面に追加」[ ➕ ] をタップします。')}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex md:flex-col items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-black text-slate-900 dark:text-white mb-1">
                    {t('Tap "Add" at the top-right', '右上の「追加」をタップ！')}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {t('A dedicated "Levi Sensei" icon appears on your iPad! It launches in full-screen standalone mode with no browser bars.', 'iPadのホーム画面にパンダの「リヴァイ先生」アプリアイコンができます！次回からアドレス入力やロイロは不要です！')}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer: LoiLoNote tip + CTA side-by-side in landscape */}
            <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span className="shrink-0">💡</span>
                <span>
                  {t(
                    'If you are currently inside LoiLoNote, tap the compass icon [🧭 Safari] at top-right first to open in Safari!',
                    'ロイロノートの中で開いている場合は、まず画面右上のコンパス印 [🧭 Safariで開く] を押してSafariで開いてから追加してください！'
                  )}
                </span>
              </div>

              <button
                onClick={() => setIsAddToHomeModalOpen(false)}
                className="w-full md:w-auto md:min-w-[180px] shrink-0 py-3 px-6 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                {t("Got it!", "わかりました！")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          profile={profile}
          onClose={() => setIsEditProfileOpen(false)}
          onUpdated={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
          onResetSeat={handleResetSeat}
        />
      )}

      {/* Student Stats / Passport Modal */}
      {isStatsModalOpen && profile && (
        <StudentStatsModal
          isOpen={isStatsModalOpen}
          profile={profile}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      {/* Eigo Shop Modal */}
      {isShopOpen && profile && (
        <EigoShopModal
          isOpen={isShopOpen}
          profile={profile}
          onClose={() => setIsShopOpen(false)}
          onProfileUpdated={(updatedProfile) => {
            setProfile(updatedProfile);
          }}
        />
      )}

      {/* Unlink / Switch Seat Confirmation Modal */}
      {isUnlinkModalOpen && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border-4 border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl font-black">
              🔄
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1.5">
              {t("Switch Seat / Student?", "席の交代・登録解除")}
            </h3>

            <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              {t(
                `Do you want to unlink this iPad from ${profile.classId} #${profile.attendanceNumber} (${profile.nickname})?`,
                <>このiPadの<ruby>登録<rt>とうろく</rt></ruby>【<span className="font-black text-emerald-600 dark:text-emerald-400">{profile.classId} {profile.attendanceNumber}番</span>】を<ruby>解除<rt>かいじょ</rt></ruby>して、べつの席やクラスをえらび直しますか？</>
              )}
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleClearProfile}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>{t("Yes, Switch Seat", "はい、席をえらび直す")}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsUnlinkModalOpen(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {t("Cancel", "キャンセル")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 PERSISTENT DOCKED FLOATING JOIN BAR (Always visible even when scrolled down!) */}
      {detectedRoom && profile && (
        <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-xl w-auto pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-2xl border-3 sm:border-4 border-yellow-300 flex items-center justify-between gap-3 sm:gap-4 ring-4 ring-emerald-500/30 backdrop-blur-md">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <span className="text-2xl sm:text-3xl animate-bounce shrink-0">🏎️</span>
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5 leading-none mb-1">
                  <span className="px-1.5 py-0.5 rounded-full bg-yellow-300 text-slate-950 font-black text-[10px]">
                    {t("LIVE NOW", "いまゲーム中！")}
                  </span>
                  <span className="text-xs sm:text-sm font-black truncate">
                    {profile.classId} {t("Game Ready!", "ゲームがはじまったよ！")}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-emerald-100 truncate">
                  {t("Tap to jump in without a PIN!", "ワンタップですぐ参加！")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                requestMobileFullscreen();
                playPop();
                setActiveQuizPin(detectedRoom.code);
              }}
              className="px-5 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl bg-yellow-300 hover:bg-yellow-200 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>{t("Join Now!", "参加する！")}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
