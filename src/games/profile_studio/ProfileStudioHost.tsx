import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { SchoolId, SCHOOL_CONFIGS, getClassSize, generateDefaultCallsign } from '@/types/roster';
import { fetchClassBoundNumbers, releaseStudentNumber, updateStudentProfileByTeacher, resetStudentFieldToDefault, ResetProfileField } from '@/services/studentProfile';
import { soundEffects } from '@/services/soundEffects';
import { ensureAnonymousAuth } from '@/services/firebase';
import { safeSet, safeGet, safeSubscribe, safeRemove } from '@/services/rtdbSafe';
import { SetupRoomState, BoundSeatInfo } from './types';
import { 
  ArrowLeft, 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  Users, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  X, 
  LayoutGrid,
  Edit3,
  Check,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';

const POPULAR_AVATARS = [
  '🐼', '🦁', '🐯', '🐰', '🦊', '🐨', '🐵', '🐶', '🐱', '🐻',
  '🏎️', '🚀', '🛸', '⚽', '🏀', '⚡', '🔥', '🌟', '👑', '🌈'
];

interface ProfileStudioHostProps {
  onExit: () => void;
  onLaunchGame?: () => void;
}

export const ProfileStudioHost: React.FC<ProfileStudioHostProps> = ({ onExit, onLaunchGame }) => {
  const { t, language } = useLanguage();
  const { activeSchool, activeClassId, setActiveClassId, activeGrade, toggleTheme } = useClassroom();
  const { isMuted, toggleMute, playPop } = useAudio();

  const schoolId: SchoolId = activeSchool || 'futakotamagawa';
  const schoolConfig = SCHOOL_CONFIGS[schoolId];

  // Dynamic Class selection
  const [classId, setClassId] = useState<string>(activeClassId || '6-1');
  const [pendingClassSwitch, setPendingClassSwitch] = useState<string | null>(null);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState<boolean>(false);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  const grade = activeGrade || 'ES_G6';
  const classSize = getClassSize(schoolId, classId);

  // Generate deterministic 4-digit code based on active class (e.g. 6177 for class 6-1)
  const [roomCode, setRoomCode] = useState<string>(() => {
    const classDigits = (activeClassId || '6-1').replace(/\D/g, '');
    const prefix = classDigits.length >= 2 ? classDigits.slice(0, 2) : '61';
    const rand = Math.floor(10 + Math.random() * 90);
    return `${prefix}${rand}`;
  });

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [roomState, setRoomState] = useState<SetupRoomState | null>(null);
  const [isSeatingChartOpen, setIsSeatingChartOpen] = useState<boolean>(false);

  // Admin Profile Inspector Modal state
  const [adminEditingSeat, setAdminEditingSeat] = useState<{
    seatNum: number;
    nickname: string;
    callsign: string;
    avatar: string;
    secretCharm?: string;
  } | null>(null);
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState<boolean>(false);

  const [isSyncingRoster, setIsSyncingRoster] = useState<boolean>(false);
  const prevClaimedCountRef = useRef<number>(0);
  const hasTriggeredCelebrationRef = useRef<boolean>(false);

  const setupUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?setup=${roomCode}`
    : `https://levi-sensei.web.app/?setup=${roomCode}`;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setIsClassDropdownOpen(false);
      }
    };
    if (isClassDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isClassDropdownOpen]);

  // 1. Initialize setup room in Firebase Realtime Database with Cloud Pre-Population
  useEffect(() => {
    let isDisposed = false;

    const initRoom = async () => {
      try {
        await ensureAnonymousAuth();
      } catch (authErr) {
        console.warn('[ProfileStudioHost] ensureAnonymousAuth warning:', authErr);
      }

      // Fetch pre-existing students from Firebase RTDB for this school & class
      const existingClaims = await fetchClassBoundNumbers(schoolId, classId);
      console.log(`[ProfileStudioHost] Pre-loading ${Object.keys(existingClaims).length} roster records for ${schoolId} ${classId}`);

      const initialBoundSeats: Record<number, BoundSeatInfo> = {};

      Object.entries(existingClaims).forEach(([numStr, student]) => {
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && student) {
          initialBoundSeats[num] = {
            attendanceNumber: num,
            nickname: student.nickname,
            avatar: student.avatar,
            boundAt: Date.now(),
          };
        }
      });

      // Pre-load local teacher if registered on this device
      try {
        const localTeacherRaw = localStorage.getItem('levi_sensei_student_profile');
        if (localTeacherRaw) {
          const localTeacher = JSON.parse(localTeacherRaw);
          if (localTeacher && localTeacher.attendanceNumber === 0 && localTeacher.schoolId === schoolId && localTeacher.classId === classId) {
            initialBoundSeats[0] = {
              attendanceNumber: 0,
              nickname: localTeacher.nickname || '先生',
              avatar: localTeacher.avatar || '👨‍🏫',
              boundAt: localTeacher.boundAt || Date.now(),
            };
          }
        }
      } catch {}

      // Preserve any seats already claimed in this session
      const existingRoom = await safeGet<SetupRoomState>(`setupRooms/${roomCode}`);
      const mergedBoundSeats = {
        ...initialBoundSeats,
        ...(existingRoom?.boundSeats || {}),
      };

      const initialRoom: SetupRoomState = {
        code: roomCode,
        schoolId,
        classId,
        grade,
        classSize,
        hostId: 'teacher_host',
        createdAt: existingRoom?.createdAt || Date.now(),
        status: 'ACTIVE',
        boundSeats: mergedBoundSeats,
      };

      await safeSet(`setupRooms/${roomCode}`, initialRoom);

      if (isDisposed) return;
      setRoomState(initialRoom);

      // Subscribe to real-time seat claiming events
      const unsub = safeSubscribe<SetupRoomState>(`setupRooms/${roomCode}`, (data) => {
        if (!isDisposed && data) {
          setRoomState(data);

          const currentCount = Object.keys(data.boundSeats || {}).length;
          if (currentCount > prevClaimedCountRef.current) {
            soundEffects.playCorrect();
          }
          prevClaimedCountRef.current = currentCount;

          // Celebration when 100% of seats are claimed!
          if (currentCount >= classSize && !hasTriggeredCelebrationRef.current) {
            hasTriggeredCelebrationRef.current = true;
            soundEffects.playFanfare();
            confetti({
              particleCount: 150,
              spread: 90,
              origin: { y: 0.6 },
            });
          }
        }
      });

      return unsub;
    };

    let cleanupSub: (() => void) | undefined;
    initRoom().then((sub) => {
      cleanupSub = sub;
    });

    return () => {
      isDisposed = true;
      if (cleanupSub) cleanupSub();
    };
  }, [roomCode, schoolId, classId, grade, classSize]);

  // 2. Generate high-contrast QR Code with minimized margin (margin: 1)
  useEffect(() => {
    QRCode.toDataURL(setupUrl, {
      width: 512,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).then((url) => {
      setQrCodeDataUrl(url);
    }).catch((err) => {
      console.error('Error generating QR code:', err);
    });
  }, [setupUrl]);

  // Sync / refresh roster from cloud database
  const handleSyncFromCloud = async () => {
    if (isSyncingRoster) return;
    setIsSyncingRoster(true);
    playPop();

    try {
      await ensureAnonymousAuth();
      const existingClaims = await fetchClassBoundNumbers(schoolId, classId);
      const currentBoundSeats = roomState?.boundSeats || {};
      const newBoundSeats: Record<number, BoundSeatInfo> = { ...currentBoundSeats };

      Object.entries(existingClaims).forEach(([numStr, student]) => {
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && student) {
          if (!newBoundSeats[num]) {
            newBoundSeats[num] = {
              attendanceNumber: num,
              nickname: student.nickname,
              avatar: student.avatar,
              boundAt: Date.now(),
            };
          }
        }
      });

      await safeSet(`setupRooms/${roomCode}/boundSeats`, newBoundSeats);
      soundEffects.playCorrect();
    } catch (err) {
      console.error('Error syncing cloud roster:', err);
    } finally {
      setIsSyncingRoster(false);
    }
  };

  const configuredSize = getClassSize(schoolId, classId);
  const boundSeats = roomState?.boundSeats || {};
  const studentClaimedCount = Object.keys(boundSeats).filter(k => parseInt(k, 10) > 0).length;
  const claimedCount = Object.keys(boundSeats).length;
  // Report class size as the total number of saved/registered student roster profiles
  const targetRosterSize = Math.max(studentClaimedCount, configuredSize > 0 ? configuredSize : 30);
  const progressPct = targetRosterSize > 0 ? Math.min(100, Math.round((studentClaimedCount / targetRosterSize) * 100)) : 100;
  const isAllComplete = studentClaimedCount >= targetRosterSize && studentClaimedCount > 0;

  // Open Admin Profile Inspector when clicking a seat
  const handleOpenAdminEdit = async (seatNum: number, seatData: BoundSeatInfo) => {
    playPop();
    const studentPath = `schools/${schoolId}/classes/${classId}/students/${seatNum}`;
    const cloudStudent = seatNum > 0 ? await safeGet<any>(studentPath) : null;
    setAdminEditingSeat({
      seatNum,
      nickname: cloudStudent?.nickname || seatData.nickname || (seatNum === 0 ? '先生' : `${seatNum}番`),
      callsign: cloudStudent?.callsign || (seatNum === 0 ? 'TEACH' : generateDefaultCallsign('', seatNum, classId)),
      avatar: cloudStudent?.avatar || seatData.avatar || (seatNum === 0 ? '👨‍🏫' : '🐼'),
      secretCharm: cloudStudent?.secretCharm || undefined,
    });
  };

  // Reset a specific field or all fields to school default
  const handleResetField = async (field: ResetProfileField) => {
    if (!adminEditingSeat || isSavingAdminEdit) return;
    setIsSavingAdminEdit(true);
    try {
      await ensureAnonymousAuth();
      const { seatNum } = adminEditingSeat;
      if (seatNum === 0) {
        setAdminEditingSeat({
          seatNum: 0,
          nickname: '先生',
          callsign: 'TEACH',
          avatar: '👨‍🏫',
          secretCharm: '👑',
        });
        await safeSet(`setupRooms/${roomCode}/boundSeats/0`, {
          attendanceNumber: 0,
          nickname: '先生',
          avatar: '👨‍🏫',
          boundAt: Date.now(),
        });
        soundEffects.playCorrect();
        return;
      }
      const updated = await resetStudentFieldToDefault(schoolId, classId, seatNum, field);
      if (updated) {
        setAdminEditingSeat({
          seatNum,
          nickname: updated.nickname,
          callsign: updated.callsign || generateDefaultCallsign('', seatNum, classId),
          avatar: updated.avatar,
          secretCharm: updated.secretCharm || undefined,
        });

        // Mirror to live setup room
        await safeSet(`setupRooms/${roomCode}/boundSeats/${seatNum}`, {
          attendanceNumber: seatNum,
          nickname: updated.nickname,
          avatar: updated.avatar,
          boundAt: Date.now(),
        });
        soundEffects.playCorrect();
      }
    } catch (err) {
      console.error('Error resetting field:', err);
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  // Release a seat from Admin Editor (clears both Firebase classroom roster and room)
  const handleReleaseAdminSeat = async (seatNum: number) => {
    if (isSavingAdminEdit) return;
    setIsSavingAdminEdit(true);
    try {
      await ensureAnonymousAuth();
      if (seatNum > 0) {
        await releaseStudentNumber(schoolId, classId, seatNum);
      }
      await safeRemove(`setupRooms/${roomCode}/boundSeats/${seatNum}`);
      soundEffects.playTick();
      setAdminEditingSeat(null);
    } catch (err) {
      console.error('Error releasing seat:', err);
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  // Dynamic class switching
  const switchClass = async (newClass: string) => {
    playPop();
    const classDigits = newClass.replace(/\D/g, '');
    const prefix = classDigits.length >= 2 ? classDigits.slice(0, 2) : '61';
    const rand = Math.floor(10 + Math.random() * 90);
    const newCode = `${prefix}${rand}`;

    if (roomCode) {
      await ensureAnonymousAuth().catch(() => {});
      await safeSet(`setupRooms/${roomCode}/status`, 'FINISHED').catch(() => {});
    }

    setClassId(newClass);
    setActiveClassId(newClass);
    setRoomCode(newCode);
    setPendingClassSwitch(null);
    setIsClassDropdownOpen(false);
  };

  const handleSelectClass = (newClass: string) => {
    if (newClass === classId) {
      setIsClassDropdownOpen(false);
      return;
    }
    if (claimedCount > 0) {
      setPendingClassSwitch(newClass);
      setIsClassDropdownOpen(false);
    } else {
      switchClass(newClass);
    }
  };

  const handleExit = async () => {
    playPop();
    try {
      await ensureAnonymousAuth();
      await safeSet(`setupRooms/${roomCode}/status`, 'FINISHED');
    } catch {}
    onExit();
  };

  const handleLaunchGame = async () => {
    if (!onLaunchGame) return;
    playPop();
    try {
      await ensureAnonymousAuth();
      await safeSet(`setupRooms/${roomCode}/status`, 'FINISHED');
    } catch {}
    onLaunchGame();
  };

  // Full 6x6 grid = exactly 36 seats for Japanese elementary classrooms + Seat 00 (Teacher)
  const MAX_SEATS = 36;
  const seatsArray = [0, ...Array.from({ length: MAX_SEATS }, (_, i) => i + 1)];

  return (
    <div className="fixed inset-0 w-screen h-dvh bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col overflow-hidden select-none">
      {/* 1. Header Bar */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 shadow-xs z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleExit}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title={t('Back to Hub', 'メインメニューに戻る')}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Smartphone size={18} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-sm sm:text-base font-black tracking-tight truncate leading-tight">
                {t('iPad Profile Studio', <>iPadセットアップ<ruby>大会<rt>たいかい</rt></ruby></>)}
              </h1>
              
              {/* Quick Class Switcher Dropdown */}
              <div className="relative" ref={classDropdownRef}>
                <button
                  type="button"
                  onClick={() => { playPop(); setIsClassDropdownOpen(!isClassDropdownOpen); }}
                  className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer truncate"
                  title={t('Click to switch class', 'クラスを変更')}
                >
                  <span>{schoolConfig?.shortKanji || schoolConfig?.name || '小学校'}</span>
                  <span className="font-black text-purple-700 dark:text-purple-300 underline underline-offset-2">
                    {classId}
                  </span>
                  <span>({classSize}{t(' seats', '席')})</span>
                  <ChevronDown size={11} className={`transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isClassDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-44 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                      {t('Switch Class', 'クラス切り替え')}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(schoolConfig?.classes || ['6-1', '6-2', '6-3', '6-4', '5-1', '5-2', '5-3', '5-4']).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSelectClass(c)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-black transition-colors cursor-pointer text-center ${
                            c === classId
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Header Right Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap whitespace-nowrap">
          {/* Seating Chart Shortcut Button in Header */}
          <button
            type="button"
            onClick={() => { playPop(); setIsSeatingChartOpen(true); }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all font-black text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">{t('Seating Chart', '座席表')}</span>
            <span className="px-1.5 py-0.2 rounded-md bg-purple-600 text-white font-mono text-[10px]">
              {claimedCount}/{targetRosterSize} ({progressPct}%)
            </span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleSyncFromCloud}
            disabled={isSyncingRoster}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title={t('Sync Roster from Database', 'クラウド名簿を再同期')}
          >
            <RefreshCw size={16} className={isSyncingRoster ? 'animate-spin text-purple-500' : ''} />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title="Toggle theme"
          >
            <Sun size={16} className="hidden dark:block text-amber-400" />
            <Moon size={16} className="block dark:hidden text-slate-600" />
          </button>

          {/* Launch Game button available as soon as at least 1 student is connected! */}
          {claimedCount > 0 && onLaunchGame && (
            <button
              type="button"
              onClick={handleLaunchGame}
              className={`px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isAllComplete ? 'animate-bounce' : ''
              }`}
            >
              <Sparkles size={15} />
              <span>{t(`Launch Game (${claimedCount})`, `ゲーム起動！ (${claimedCount}名)`)}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Cinema Stage: Side-by-Side Massive QR & Room PIN (Zero Vertical Cutoffs) */}
      <main className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-12 my-auto">
          {/* Left: Massive QR Code with tight padding */}
          <div className="flex flex-col items-center shrink-0">
            <div className="p-2 sm:p-2.5 bg-white rounded-3xl sm:rounded-4xl shadow-2xl border-4 sm:border-6 border-indigo-500/80 group hover:scale-[1.01] transition-transform flex items-center justify-center">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Setup QR Code"
                  className="h-[52dvh] sm:h-[60dvh] max-h-[460px] aspect-square object-contain select-none pointer-events-none rounded-2xl"
                />
              ) : (
                <div className="h-[52dvh] sm:h-[60dvh] max-h-[460px] aspect-square flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold animate-pulse">
                  {t('Generating QR Code...', 'QRコード生成中...')}
                </div>
              )}
            </div>
          </div>

          {/* Right: Room PIN & Quick Action */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md md:max-w-lg w-full gap-3 sm:gap-4">
            {/* Step 1 Pill */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs shadow-2xs">
              <QrCode size={14} />
              <span>{t('Step 1: Scan with iPad Camera', <><ruby>手順<rt>てじゅん</rt></ruby>1: iPadカメラでスキャン</>)}</span>
            </div>

            {/* Room PIN Box */}
            <div className="w-full py-3.5 px-6 rounded-3xl bg-slate-900 dark:bg-slate-950 border-4 border-amber-400 text-center shadow-2xl">
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest block mb-1">
                {t('Or Enter 4-Digit PIN', 'または 4桁PINコードを入力')}
              </span>
              <span className="text-6xl sm:text-7xl lg:text-8xl font-mono font-black text-amber-400 tracking-widest">
                {roomCode}
              </span>
            </div>

            {/* View Seating Chart Button with Live Badge */}
            <button
              type="button"
              onClick={() => { playPop(); setIsSeatingChartOpen(true); }}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:brightness-105 active:scale-98 text-white font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            >
              <LayoutGrid size={18} />
              <span>{t('View Seating Chart', '座席表・名簿チャート')}</span>
              <span className="px-2 py-0.5 rounded-lg bg-black/25 text-white font-mono text-xs">
                {claimedCount} / {classSize}
              </span>
            </button>

            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(
                'Camera scan automatically inherits school and class. No secret word or typing required!',
                <>カメラを<ruby>向<rt>む</rt></ruby>けるだけで<ruby>学校<rt>がっこう</rt></ruby>・クラスが<ruby>自動<rt>じどう</rt></ruby>で<ruby>設定<rt>せってい</rt></ruby>されます！</>
              )}
            </p>
          </div>
        </div>
      </main>

      {/* 3. Full-Screen Seating Chart Modal (Fits All 31+ Desks Beautifully) */}
      {isSeatingChartOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in zoom-in-95 duration-150"
          onClick={() => setIsSeatingChartOpen(false)}
        >
          <div 
            className="w-full max-w-6xl max-h-[96dvh] bg-white dark:bg-slate-900 rounded-3xl border-4 border-indigo-400 dark:border-indigo-600 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-14 sm:h-16 px-4 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <LayoutGrid size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate">
                    {schoolConfig?.shortKanji || schoolConfig?.name || '学校'} {classId} {t('Seating Chart', <><ruby>座席<rt>ざせき</rt></ruby>チャート</>)}
                  </h3>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold truncate">
                    {t('Real-time connection & profile status', 'リアルタイム接続・名簿ひも付け状況')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-nowrap whitespace-nowrap">
                {/* Prominent PIN Display so students can join while modal is open */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-mono font-black text-xs sm:text-sm shadow-xs border-2 border-amber-300 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-amber-950">PIN:</span>
                  <span className="tracking-widest text-sm sm:text-base">{roomCode}</span>
                </div>

                <span className="font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 shrink-0">
                  {claimedCount} / {targetRosterSize} ({progressPct}%)
                </span>

                {claimedCount > 0 && onLaunchGame && (
                  <button
                    type="button"
                    onClick={handleLaunchGame}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles size={14} />
                    <span>{t('Launch Game!', 'ゲーム起動！')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSyncFromCloud}
                  disabled={isSyncingRoster}
                  className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0"
                  title={t('Sync Roster', '再同期')}
                >
                  <RefreshCw size={15} className={isSyncingRoster ? 'animate-spin' : ''} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSeatingChartOpen(false)}
                  className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                  title={t('Close', '閉じる')}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: 6x6 Grid (36 Seats, perfect 6-column landscape alignment) */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto content-start">
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                {seatsArray.map((seatNum) => {
                  const seatData: BoundSeatInfo | undefined = boundSeats[seatNum];
                  const isTeacherSeat = seatNum === 0;
                  const isClaimed = Boolean(seatData);

                  return (
                    <div
                      key={seatNum}
                      onClick={() => {
                        if (isClaimed && seatData) {
                          handleOpenAdminEdit(seatNum, seatData);
                        }
                      }}
                      className={`relative p-2 sm:p-2.5 rounded-2xl border-2 transition-all flex flex-col justify-between select-none ${
                        isClaimed
                          ? isTeacherSeat
                            ? 'bg-gradient-to-tr from-purple-500/15 via-indigo-500/10 to-purple-500/5 dark:from-purple-950/70 dark:via-indigo-950/50 dark:to-slate-900 border-purple-500/80 shadow-xs cursor-pointer hover:border-purple-400 group'
                            : 'bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/70 dark:via-teal-950/50 dark:to-slate-900 border-emerald-500/80 shadow-xs cursor-pointer hover:border-purple-400 group'
                          : isTeacherSeat
                          ? 'bg-purple-50/50 dark:bg-purple-950/20 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                      style={{ minHeight: '84px' }}
                    >
                      {/* Top Row: Seat Number & Status */}
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded-md ${
                          isTeacherSeat
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : isClaimed
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {isTeacherSeat ? '00 先生' : `#${seatNum}`}
                        </span>

                        {isClaimed ? (
                          <div className="flex items-center gap-1">
                            <span className={`flex items-center ${isTeacherSeat ? 'text-purple-500' : 'text-emerald-500'} group-hover:hidden`}>
                              <CheckCircle2 size={15} />
                            </span>
                            <span className="hidden group-hover:flex items-center text-purple-600 dark:text-purple-400" title={t('Edit Profile', '編集')}>
                              <Edit3 size={13} />
                            </span>
                          </div>
                        ) : isTeacherSeat ? (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                            {t('Teacher Seat', '先生席')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            {t('Waiting', '待機中')}
                          </span>
                        )}
                      </div>

                      {/* Center/Bottom: Student Avatar & Nickname */}
                      {isClaimed && seatData ? (
                        <div className="flex items-center gap-1.5 mt-auto">
                          <span className="text-xl sm:text-2xl shrink-0 drop-shadow-xs">
                            {seatData.avatar || (isTeacherSeat ? '👨‍🏫' : '🐼')}
                          </span>
                          <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                            {seatData.nickname}
                          </span>
                        </div>
                      ) : isTeacherSeat ? (
                        <div className="mt-auto flex items-center justify-center py-1">
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">👨‍🏫 ---</span>
                        </div>
                      ) : (
                        <div className="mt-auto flex items-center justify-center py-1">
                          <span className="text-xs text-slate-400">---</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-4 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
              <span>💡 {t('Tap any green seat to edit name, change emoji, or release seat', '緑の席をタップすると、名前修正・アイコン変更・席の解除ができます')}</span>
              <button
                type="button"
                onClick={() => setIsSeatingChartOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer shrink-0"
              >
                {t('Back to QR Stage', 'QRコード画面に戻る')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Admin Profile Editor Modal */}
      {adminEditingSeat !== null && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setAdminEditingSeat(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-md md:max-w-2xl w-full max-h-[92dvh] overflow-y-auto shadow-2xl border-4 border-purple-500/80 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-mono font-black text-lg flex items-center justify-center shadow-md shrink-0">
                  {adminEditingSeat.seatNum === 0 ? '00' : `#${adminEditingSeat.seatNum}`}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-black leading-tight truncate">
                    {adminEditingSeat.seatNum === 0
                      ? t('Teacher / Admin Profile', '先生・管理者プロフィール')
                      : t(`Seat #${adminEditingSeat.seatNum} Profile`, `出席番号 ${adminEditingSeat.seatNum}番`)}
                  </h3>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                    {schoolConfig?.shortKanji || '学校'} {classId}
                  </span>
                </div>
              </div>
              <span className="text-3xl select-none shrink-0">{adminEditingSeat.avatar}</span>
            </div>

            {/* Field Rows with Individual Reset Buttons (2-column landscape grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {/* 1. Nickname Row */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    {t('Nickname', '表示名（ニックネーム）')}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate block">
                    {adminEditingSeat.nickname}
                  </span>
                </div>
                {adminEditingSeat.nickname !== `${adminEditingSeat.seatNum}番` ? (
                  <button
                    type="button"
                    disabled={isSavingAdminEdit}
                    onClick={() => handleResetField('nickname')}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    title={t(`Reset to ${adminEditingSeat.seatNum}番`, `${adminEditingSeat.seatNum}番に初期化`)}
                  >
                    <RotateCcw size={12} />
                    <span>{t('Reset', '初期化')}</span>
                    <span className="text-[10px] opacity-75">({adminEditingSeat.seatNum}番)</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold text-[10px] shrink-0">
                    {t('Default', '標準')}
                  </span>
                )}
              </div>

              {/* 2. Short Name / Callsign Row */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                    {t('Short Name / Callsign', '短縮表記（コールサイン）')}
                  </span>
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-white truncate block">
                    {adminEditingSeat.callsign}
                  </span>
                </div>
                {adminEditingSeat.callsign !== `${classId}-${adminEditingSeat.seatNum}` ? (
                  <button
                    type="button"
                    disabled={isSavingAdminEdit}
                    onClick={() => handleResetField('callsign')}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    title={t(`Reset to ${classId}-${adminEditingSeat.seatNum}`, `${classId}-${adminEditingSeat.seatNum}に初期化`)}
                  >
                    <RotateCcw size={12} />
                    <span>{t('Reset', '初期化')}</span>
                    <span className="text-[10px] opacity-75">({classId}-{adminEditingSeat.seatNum})</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold text-[10px] shrink-0">
                    {t('Default', '標準')}
                  </span>
                )}
              </div>

              {/* 3. Avatar Emoji Row */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-2xl shrink-0">{adminEditingSeat.avatar}</span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                      {t('Avatar Emoji', 'アイコン絵文字')}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {adminEditingSeat.avatar === '🇯🇵' ? t('Japan Flag (Default)', '日本国旗（標準）') : t('Custom Emoji', '選択中')}
                    </span>
                  </div>
                </div>
                {adminEditingSeat.avatar !== '🇯🇵' ? (
                  <button
                    type="button"
                    disabled={isSavingAdminEdit}
                    onClick={() => handleResetField('avatar')}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    title={t('Reset to 🇯🇵', '🇯🇵に初期化')}
                  >
                    <RotateCcw size={12} />
                    <span>{t('Reset', '初期化')}</span>
                    <span className="text-sm">🇯🇵</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold text-[10px] shrink-0">
                    {t('Default', '標準')}
                  </span>
                )}
              </div>

              {/* 4. Secret Passcode Row */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-xl shrink-0">{adminEditingSeat.secretCharm || '🔓'}</span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                      {t('Passcode Charm', '合言葉パスコード')}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {adminEditingSeat.secretCharm ? t('Secret Charm Active', '設定あり') : t('None (Unlocked)', '設定なし（解除済）')}
                    </span>
                  </div>
                </div>
                {adminEditingSeat.secretCharm ? (
                  <button
                    type="button"
                    disabled={isSavingAdminEdit}
                    onClick={() => handleResetField('secretCharm')}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-black text-xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    title={t('Clear Passcode', '合言葉を解除')}
                  >
                    <RotateCcw size={12} />
                    <span>{t('Clear', '解除')}</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-bold text-[10px] shrink-0">
                    {t('None', 'なし')}
                  </span>
                )}
              </div>
            </div>

            {/* Actions: Reset All, Release, Cancel */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isSavingAdminEdit || (
                  adminEditingSeat.nickname === `${adminEditingSeat.seatNum}番` &&
                  adminEditingSeat.callsign === `${classId}-${adminEditingSeat.seatNum}` &&
                  adminEditingSeat.avatar === '🇯🇵' &&
                  !adminEditingSeat.secretCharm
                )}
                onClick={() => handleResetField('ALL')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>{t('Reset All to School Defaults', '全ての項目を標準（初期値）に戻す')}</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSavingAdminEdit}
                  onClick={() => setAdminEditingSeat(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {t('Close', '閉じる')}
                </button>

                <button
                  type="button"
                  disabled={isSavingAdminEdit}
                  onClick={() => handleReleaseAdminSeat(adminEditingSeat.seatNum)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 font-black text-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title={t('Clear this seat completely', 'この席を空席に戻す')}
                >
                  <Trash2 size={13} />
                  <span>{t('Release Seat', '席を空席に戻す')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Class Switch Confirmation Warning Modal */}
      {pendingClassSwitch !== null && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPendingClassSwitch(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-2 border-amber-400"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              {t(`Switch to Class ${pendingClassSwitch}?`, `クラスを【${pendingClassSwitch}】に変更しますか？`)}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">
              {t(
                `${claimedCount} student(s) have already linked to ${classId}. Switching will close this room and require them to re-scan for ${pendingClassSwitch}.`,
                `現在 ${claimedCount} 名の児童が【${classId}】に接続しています。クラスを変更すると現在の部屋は終了し、児童は再接続が必要になります。`
              )}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingClassSwitch(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-200 cursor-pointer"
              >
                {t('Keep Current', 'そのまま')}
              </button>
              <button
                type="button"
                onClick={() => switchClass(pendingClassSwitch)}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 shadow-md cursor-pointer"
              >
                {t('Switch Class', '変更する')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
