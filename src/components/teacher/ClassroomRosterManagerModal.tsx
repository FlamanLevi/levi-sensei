import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { SchoolId, SCHOOL_CONFIGS, StudentProfile, getClassSize, generateDefaultCallsign } from '@/types/roster';
import { 
  fetchAllClassStudents, 
  releaseStudentNumber,
  claimAttendanceNumber,
  resetStudentFieldToDefault,
  ResetProfileField
} from '@/services/studentProfile';
import { soundEffects } from '@/services/soundEffects';
import { StudentStatsModal } from '@/components/student/StudentStatsModal';
import { 
  X, 
  Users, 
  UserCheck, 
  Trash2, 
  Check, 
  RefreshCw, 
  Sparkles, 
  Plus, 
  RotateCcw,
  Coins,
  ShieldAlert
} from 'lucide-react';

interface ClassroomRosterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClassroomRosterManagerModal: React.FC<ClassroomRosterManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, language } = useLanguage();
  const { activeSchool, activeClassId } = useClassroom();
  const { playPop } = useAudio();

  const [selectedSchool, setSelectedSchool] = useState<SchoolId>(activeSchool || 'futakotamagawa');
  const [selectedClass, setSelectedClass] = useState<string>(activeClassId || '6-1');
  const [students, setStudents] = useState<Record<number, StudentProfile>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Inspector dialog state
  const [inspectingSeat, setInspectingSeat] = useState<{
    seatNum: number;
    nickname: string;
    callsign: string;
    avatar: string;
    secretCharm?: string;
    xp: number;
    gold: number;
    isNew: boolean;
  } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [inspectingStatsProfile, setInspectingStatsProfile] = useState<StudentProfile | null>(null);

  // Seat release confirmation
  const [seatToRelease, setSeatToRelease] = useState<number | null>(null);

  const schoolConfig = SCHOOL_CONFIGS[selectedSchool];
  const allClasses = schoolConfig?.classes || ['6-1', '6-2', '6-3', '6-4', '5-1', '5-2', '5-3', '5-4'];
  const classSize = getClassSize(selectedSchool, selectedClass);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const data = await fetchAllClassStudents(selectedSchool, selectedClass);
      // Also check local teacher profile
      try {
        const localTeacherRaw = localStorage.getItem('levi_sensei_student_profile');
        if (localTeacherRaw) {
          const localTeacher = JSON.parse(localTeacherRaw);
          if (localTeacher && localTeacher.attendanceNumber === 0 && localTeacher.schoolId === selectedSchool && localTeacher.classId === selectedClass) {
            data[0] = localTeacher;
          }
        }
      } catch {}
      setStudents(data);
    } catch (err) {
      console.error('Error loading roster in manager modal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRoster();
    }
  }, [isOpen, selectedSchool, selectedClass]);

  if (!isOpen) return null;

  const handleOpenInspect = (seatNum: number, existing?: StudentProfile) => {
    playPop();
    setInspectingSeat({
      seatNum,
      nickname: existing?.nickname || (seatNum === 0 ? '先生' : `${seatNum}番`),
      callsign: existing?.callsign || (seatNum === 0 ? 'TEACH' : generateDefaultCallsign('', seatNum, selectedClass)),
      avatar: existing?.avatar || (seatNum === 0 ? '👨‍🏫' : '🇯🇵'),
      secretCharm: existing?.secretCharm || (seatNum === 0 ? '👑' : undefined),
      xp: existing?.xp || (seatNum === 0 ? 9999 : 0),
      gold: existing?.gold || (seatNum === 0 ? 999 : 0),
      isNew: !existing,
    });
  };

  // Reset a field to official school default
  const handleResetField = async (field: ResetProfileField) => {
    if (!inspectingSeat || saving || inspectingSeat.isNew) return;
    setSaving(true);
    try {
      const { seatNum } = inspectingSeat;
      if (seatNum === 0) {
        const resetTeacher: StudentProfile = {
          schoolId: selectedSchool,
          classId: selectedClass,
          attendanceNumber: 0,
          nickname: '先生',
          callsign: 'TEACH',
          avatar: '👨‍🏫',
          secretCharm: '👑',
          xp: 9999,
          level: 10,
          gold: 999,
          boundAt: Date.now(),
          lastPlayedAt: Date.now()
        };
        localStorage.setItem('levi_sensei_student_profile', JSON.stringify(resetTeacher));
        soundEffects.playCorrect();
        setInspectingSeat({
          ...inspectingSeat,
          nickname: resetTeacher.nickname,
          callsign: resetTeacher.callsign!,
          avatar: resetTeacher.avatar,
          secretCharm: resetTeacher.secretCharm,
        });
        await loadRoster();
        return;
      }
      const updated = await resetStudentFieldToDefault(selectedSchool, selectedClass, seatNum, field);
      if (updated) {
        soundEffects.playCorrect();
        setInspectingSeat({
          ...inspectingSeat,
          nickname: updated.nickname,
          callsign: updated.callsign || generateDefaultCallsign('', seatNum, selectedClass),
          avatar: updated.avatar,
          secretCharm: updated.secretCharm,
        });
        await loadRoster();
      }
    } catch (err) {
      console.error('Error resetting field:', err);
    } finally {
      setSaving(false);
    }
  };

  // 1-Tap register empty seat with school defaults
  const handleRegisterDefaultSeat = async (seatNum: number) => {
    if (saving) return;
    setSaving(true);
    try {
      if (seatNum === 0) {
        const teacherProfile: StudentProfile = {
          schoolId: selectedSchool,
          classId: selectedClass,
          attendanceNumber: 0,
          nickname: '先生',
          callsign: 'TEACH',
          avatar: '👨‍🏫',
          secretCharm: '👑',
          xp: 9999,
          level: 10,
          gold: 999,
          boundAt: Date.now(),
          lastPlayedAt: Date.now()
        };
        localStorage.setItem('levi_sensei_student_profile', JSON.stringify(teacherProfile));
        localStorage.setItem('levi_sensei_role', 'TEACHER');
        sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');
        soundEffects.playCorrect();
        setInspectingSeat(null);
        await loadRoster();
        return;
      }

      await claimAttendanceNumber(
        selectedSchool,
        selectedClass,
        seatNum,
        `${seatNum}番`,
        0,
        0,
        '🇯🇵'
      );
      soundEffects.playCorrect();
      setInspectingSeat(null);
      await loadRoster();
    } catch (err) {
      console.error('Error registering default seat:', err);
    } finally {
      setSaving(false);
    }
  };

  // Release student number
  const handleConfirmRelease = async (seatNum: number) => {
    if (saving) return;
    setSaving(true);
    try {
      if (seatNum === 0) {
        localStorage.removeItem('levi_sensei_student_profile');
        soundEffects.playTick();
        setSeatToRelease(null);
        setInspectingSeat(null);
        await loadRoster();
        return;
      }

      await releaseStudentNumber(selectedSchool, selectedClass, seatNum);
      soundEffects.playTick();
      setSeatToRelease(null);
      setInspectingSeat(null);
      await loadRoster();
    } catch (err) {
      console.error('Error releasing student number:', err);
    } finally {
      setSaving(false);
    }
  };

  const MAX_SEATS = 36;
  const seatsArray = [0, ...Array.from({ length: MAX_SEATS }, (_, i) => i + 1)];
  const studentClaimedCount = Object.keys(students).filter(k => parseInt(k, 10) > 0).length;
  const claimedCount = Object.keys(students).length;
  const progressPct = classSize > 0 ? Math.min(100, Math.round((studentClaimedCount / classSize) * 100)) : 100;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in zoom-in-95 duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-6xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-3xl border-4 border-indigo-400 dark:border-indigo-600 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-16 px-4 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate">
                {t('Class Roster & Profile Studio', <><ruby>名簿<rt className="text-[7px]">めいぼ</rt></ruby>・児童プロファイル管理</>)}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold truncate">
                {t('Reset names, avatars, passcodes to school defaults & release seats', '表示名・アイコン・合言葉の初期化、席の解除')}
              </p>
            </div>
          </div>

          {/* School & Class Selectors */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Class Dropdown */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
              <span className="text-xs font-black px-1.5 text-slate-500 dark:text-slate-400">
                {schoolConfig?.shortKanji || '学校'}
              </span>
              <select
                value={selectedClass}
                onChange={(e) => {
                  playPop();
                  setSelectedClass(e.target.value);
                }}
                className="bg-transparent font-black text-xs text-purple-600 dark:text-purple-400 focus:outline-none cursor-pointer py-0.5"
              >
                {allClasses.map((c) => (
                  <option key={c} value={c} className="text-slate-900 dark:text-white dark:bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <span className="font-mono text-xs font-black px-2.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
              {claimedCount} / {classSize} 登録済 ({progressPct}%)
            </span>

            <button
              type="button"
              onClick={loadRoster}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              title={t('Refresh Roster', '再読み込み')}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-300 transition-colors cursor-pointer"
              title={t('Close', '閉じる')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: 6x6 Roster Grid */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto content-start">
          <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
            {seatsArray.map((seatNum) => {
              const isTeacherSeat = seatNum === 0;
              const student = students[seatNum];
              const isClaimed = Boolean(student);

              return (
                <div
                  key={seatNum}
                  onClick={() => handleOpenInspect(seatNum, student)}
                  className={`relative p-2 sm:p-2.5 rounded-2xl border-2 transition-all flex flex-col justify-between select-none cursor-pointer group ${
                    isClaimed
                      ? isTeacherSeat
                        ? 'bg-gradient-to-tr from-purple-500/15 via-indigo-500/10 to-purple-500/5 dark:from-purple-950/70 dark:via-indigo-950/50 dark:to-slate-900 border-purple-500/80 shadow-xs hover:border-purple-400 hover:scale-[1.01]'
                        : 'bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/70 dark:via-teal-950/50 dark:to-slate-900 border-emerald-500/80 shadow-xs hover:border-purple-400 hover:scale-[1.01]'
                      : isTeacherSeat
                      ? 'bg-purple-50/50 dark:bg-purple-950/20 border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:border-purple-400'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-purple-300'
                  }`}
                  style={{ minHeight: '90px' }}
                >
                  {/* Top Row: Seat Number & Action Indicator */}
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded-md ${
                      isTeacherSeat
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : isClaimed
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {isTeacherSeat ? '00 先生' : `#${seatNum}`}
                    </span>

                    {isClaimed ? (
                      <span className={`${isTeacherSeat ? 'text-purple-600 dark:text-purple-400' : 'text-purple-600 dark:text-purple-400'} opacity-80 group-hover:opacity-100`} title={t('Inspect Profile', '詳細・初期化')}>
                        <RotateCcw size={12} />
                      </span>
                    ) : isTeacherSeat ? (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                        {t('Teacher Seat', '先生席')}
                      </span>
                    ) : (
                      <span className="text-slate-400 opacity-60 group-hover:opacity-100" title={t('Register Seat', '初期登録')}>
                        <Plus size={13} />
                      </span>
                    )}
                  </div>

                  {/* Center/Bottom: Student / Teacher Avatar, Nickname & XP Badge */}
                  {isClaimed && student ? (
                    <div className="flex flex-col gap-0.5 mt-auto">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl sm:text-2xl shrink-0 drop-shadow-xs">
                          {student.avatar || (isTeacherSeat ? '👨‍🏫' : '🇯🇵')}
                        </span>
                        <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {student.nickname}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-0.5">
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Coins size={10} />
                          {student.gold || 0}
                        </span>
                        {isTeacherSeat ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">
                            TEACHER
                          </span>
                        ) : student.stats?.badges && Object.keys(student.stats.badges).length > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold" title={t('Badges Earned', '獲得バッジ数')}>
                            🎖️{Object.keys(student.stats.badges).length}
                          </span>
                        ) : (
                          <span>
                            {student.xp || 0} XP
                          </span>
                        )}
                      </div>
                    </div>
                  ) : isTeacherSeat ? (
                    <div className="mt-auto flex flex-col items-center justify-center py-1">
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">👨‍🏫 ---</span>
                      <span className="text-[9px] text-purple-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        + {t('Teacher Setup', '先生登録')}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-col items-center justify-center py-1">
                      <span className="text-xs text-slate-400">{language === 'ja' ? '空席' : 'Empty'}</span>
                      <span className="text-[9px] text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        + {t('Register', '初期登録')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-4 sm:px-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
          <span>💡 {t('Click any seat to inspect, reset fields to school defaults, or clear seat', '席をクリックして、標準値への初期化や席の解除ができます')}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
          >
            {t('Close', '閉じる')}
          </button>
        </div>
      </div>

      {/* Admin Student Reset & Inspect Modal */}
      {inspectingSeat !== null && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setInspectingSeat(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm sm:max-w-md w-full shadow-2xl border-4 border-indigo-500 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-2xl ${inspectingSeat.seatNum === 0 ? 'bg-purple-600' : 'bg-indigo-600'} text-white font-mono font-black text-lg flex items-center justify-center shadow-md`}>
                  {inspectingSeat.seatNum === 0 ? '00' : `#${inspectingSeat.seatNum}`}
                </span>
                <div>
                  <h3 className="text-base font-black leading-tight">
                    {inspectingSeat.seatNum === 0
                      ? inspectingSeat.isNew 
                        ? t('Empty Teacher Seat (00)', '先生・管理者席（00番・未設定）')
                        : t('Teacher Seat (00) Profile', '先生・管理者席（00番）')
                      : inspectingSeat.isNew 
                      ? t(`Empty Seat #${inspectingSeat.seatNum}`, `出席番号 ${inspectingSeat.seatNum}番（空席）`)
                      : t(`Seat #${inspectingSeat.seatNum} Profile`, `出席番号 ${inspectingSeat.seatNum}番`)}
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">
                    {schoolConfig?.shortKanji || '学校'} {selectedClass}
                  </span>
                </div>
              </div>
              <span className="text-3xl select-none">{inspectingSeat.avatar}</span>
            </div>

            {inspectingSeat.isNew ? (
              /* Empty Seat State: Offer 1-tap register with school defaults */
              <div className="space-y-4 mb-6">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {inspectingSeat.seatNum === 0
                    ? t(
                        'This is the teacher/admin seat. Registering will bind this device as Teacher (#00) without student roster restrictions.',
                        '先生・管理者用の専用席です。登録するとこの端末が先生席（00番）として設定されます。'
                      )
                    : t(
                        'This seat is currently unassigned. You can register it with official school defaults so the student can use it immediately.',
                        'この席は現在空席です。標準設定（デフォルト）で初期登録することができます。'
                      )}
                </p>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono space-y-1">
                  <div><strong>表示名:</strong> {inspectingSeat.seatNum === 0 ? '先生' : `${inspectingSeat.seatNum}番`}</div>
                  <div><strong>コールサイン:</strong> {inspectingSeat.seatNum === 0 ? `${selectedClass}-T` : `${selectedClass}-${inspectingSeat.seatNum}`}</div>
                  <div><strong>アイコン:</strong> {inspectingSeat.seatNum === 0 ? '👨‍🏫 (先生)' : '🇯🇵 (日本国旗)'}</div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleRegisterDefaultSeat(inspectingSeat.seatNum)}
                  className={`w-full py-3 rounded-xl bg-gradient-to-r ${
                    inspectingSeat.seatNum === 0 ? 'from-purple-600 to-indigo-600' : 'from-emerald-600 to-teal-600'
                  } text-white font-black text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer`}
                >
                  <Plus size={16} />
                  <span>
                    {saving
                      ? t('Registering...', '登録中...')
                      : inspectingSeat.seatNum === 0
                      ? t('Register Teacher Profile', '先生プロファイルとして登録する')
                      : t('Register with School Defaults', '標準設定で初期登録する')}
                  </span>
                </button>
              </div>
            ) : (
              /* Claimed Seat: Field-by-Field Reset to Default */
              <div className="space-y-3 mb-6">
                {/* View Student Passport Button - only for students */}
                {inspectingSeat.seatNum > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playPop();
                      const currentStudent = students[inspectingSeat.seatNum];
                      if (currentStudent) {
                        setInspectingStatsProfile(currentStudent);
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 font-black text-xs hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>📊</span>
                    <span>{t("View Student Passport & Trophy Case", "学習カルテ・トロフィーケースを見る")}</span>
                  </button>
                )}
                {/* 1. Nickname Row */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                      {t('Nickname', '表示名（ニックネーム）')}
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white truncate block">
                      {inspectingSeat.nickname}
                    </span>
                  </div>
                  {inspectingSeat.nickname !== `${inspectingSeat.seatNum}番` ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleResetField('nickname')}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      title={t(`Reset to ${inspectingSeat.seatNum}番`, `${inspectingSeat.seatNum}番に初期化`)}
                    >
                      <RotateCcw size={12} />
                      <span>{t('Reset', '初期化')}</span>
                      <span className="text-[10px] opacity-75">({inspectingSeat.seatNum}番)</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[10px] shrink-0">
                      {t('Default', '標準')}
                    </span>
                  )}
                </div>

                {/* 2. Short Name / Callsign Row */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                      {t('Short Name / Callsign', '短縮表記（コールサイン）')}
                    </span>
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-white truncate block">
                      {inspectingSeat.callsign}
                    </span>
                  </div>
                  {inspectingSeat.callsign !== `${selectedClass}-${inspectingSeat.seatNum}` ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleResetField('callsign')}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      title={t(`Reset to ${selectedClass}-${inspectingSeat.seatNum}`, `${selectedClass}-${inspectingSeat.seatNum}に初期化`)}
                    >
                      <RotateCcw size={12} />
                      <span>{t('Reset', '初期化')}</span>
                      <span className="text-[10px] opacity-75">({selectedClass}-{inspectingSeat.seatNum})</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[10px] shrink-0">
                      {t('Default', '標準')}
                    </span>
                  )}
                </div>

                {/* 3. Avatar Emoji Row */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-2xl shrink-0">{inspectingSeat.avatar}</span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                        {t('Avatar Emoji', 'アイコン絵文字')}
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {inspectingSeat.avatar === '🇯🇵' ? t('Japan Flag (Default)', '日本国旗（標準）') : t('Custom Emoji', '選択中')}
                      </span>
                    </div>
                  </div>
                  {inspectingSeat.avatar !== '🇯🇵' ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleResetField('avatar')}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-black text-xs hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      title={t('Reset to 🇯🇵', '🇯🇵に初期化')}
                    >
                      <RotateCcw size={12} />
                      <span>{t('Reset', '初期化')}</span>
                      <span className="text-sm">🇯🇵</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[10px] shrink-0">
                      {t('Default', '標準')}
                    </span>
                  )}
                </div>

                {/* 4. Secret Passcode Row */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-xl shrink-0">{inspectingSeat.secretCharm || '🔓'}</span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                        {t('Passcode Charm', '合言葉パスコード')}
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {inspectingSeat.secretCharm ? t('Secret Charm Active', '設定あり') : t('None (Unlocked)', '設定なし（解除済）')}
                      </span>
                    </div>
                  </div>
                  {inspectingSeat.secretCharm ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleResetField('secretCharm')}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-black text-xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                      title={t('Clear Passcode', '合言葉を解除')}
                    >
                      <RotateCcw size={12} />
                      <span>{t('Clear', '解除')}</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[10px] shrink-0">
                      {t('None', 'なし')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions: Reset All, Release, Close */}
            <div className="flex flex-col gap-2">
              {!inspectingSeat.isNew && (
                <button
                  type="button"
                  disabled={saving || (
                    inspectingSeat.nickname === `${inspectingSeat.seatNum}番` &&
                    inspectingSeat.callsign === `${selectedClass}-${inspectingSeat.seatNum}` &&
                    inspectingSeat.avatar === '🇯🇵' &&
                    !inspectingSeat.secretCharm
                  )}
                  onClick={() => handleResetField('ALL')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>{t('Reset All to School Defaults', '全ての項目を標準（初期値）に戻す')}</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setInspectingSeat(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {t('Close', '閉じる')}
                </button>

                {!inspectingSeat.isNew && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setSeatToRelease(inspectingSeat.seatNum)}
                    className="flex-1 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-300 font-black text-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>{t('Release Seat', '席を空席に戻す')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Release Confirmation Dialog */}
      {seatToRelease !== null && (
        <div 
          className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSeatToRelease(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-2 border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              {seatToRelease === 0
                ? t('Release Teacher Seat (00)?', '先生・管理者席（00番）のひも付けを解除しますか？')
                : t(`Release Seat #${seatToRelease}?`, `席 #${seatToRelease} のひも付けを解除しますか？`)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
              {seatToRelease === 0
                ? t(
                    'This will clear the teacher profile saved on this device.',
                    'この端末に保存されている先生プロファイルを解除・初期化します。'
                  )
                : t(
                    'This will free up the desk so the student can select it again.',
                    '席を空席に戻し、児童が再度タップしてひも付け直せるようにします。'
                  )}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSeatToRelease(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-200 cursor-pointer"
              >
                {t('Cancel', 'キャンセル')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRelease(seatToRelease)}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-500 shadow-md cursor-pointer"
              >
                {t('Release Desk', '解除する')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Stats Modal */}
      {inspectingStatsProfile && (
        <StudentStatsModal
          isOpen={Boolean(inspectingStatsProfile)}
          profile={inspectingStatsProfile}
          onClose={() => setInspectingStatsProfile(null)}
        />
      )}
    </div>
  );
};
