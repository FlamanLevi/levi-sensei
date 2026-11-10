import React, { useState, useRef, useEffect } from 'react';
import { useClassroom } from '@/context/ClassroomContext';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { safeGet, safeSubscribe } from '@/services/rtdbSafe';
import { setLocalStudentProfile } from '@/services/studentProfile';
import { TeacherProfile } from '@/types/teacher';
import { StudentProfile } from '@/types/roster';
import { Check, ChevronDown, Edit3, Gamepad2, Plus, Sparkles, UserCheck, X } from 'lucide-react';
import { soundEffects } from '@/services/soundEffects';

export const TeacherProfileSwitcher: React.FC = () => {
  const {
    activeTeacherProfile,
    teacherProfiles,
    setActiveTeacherId,
    updateTeacherProfile,
    addTeacherProfile,
    activeSchool,
    activeClassId,
    launchGame,
    setIsContestantMode
  } = useClassroom();
  const { playPop } = useAudio();
  const { t, language } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(activeTeacherProfile.jaName);
  const [editAvatar, setEditAvatar] = useState(activeTeacherProfile.avatar);
  const [detectedRoom, setDetectedRoom] = useState<{ code: string; gamePlayType?: string } | null>(null);
  const [customPin, setCustomPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
        setShowPinInput(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keep editing state in sync when active profile changes
  useEffect(() => {
    setEditName(activeTeacherProfile.jaName);
    setEditAvatar(activeTeacherProfile.avatar);
  }, [activeTeacherProfile]);

  // Listen for active game room in current school & class in RTDB
  useEffect(() => {
    if (!isOpen || !activeSchool || !activeClassId) return;

    const activeRoomPath = `schools/${activeSchool}/classes/${activeClassId}/analyticsSummary/activeRoom`;
    const unsub = safeSubscribe<{ code: string; gamePlayType?: string; updatedAt?: number }>(
      activeRoomPath,
      async (data) => {
        if (!data || !data.code || (data.updatedAt && Date.now() - data.updatedAt > 90 * 60 * 1000)) {
          setDetectedRoom(null);
          return;
        }
        const status = await safeGet<string>(`rooms/${data.code}/status`);
        if (status && status !== 'CLOSED' && status !== 'GAME_OVER') {
          setDetectedRoom(data);
        } else {
          setDetectedRoom(null);
        }
      }
    );

    return () => unsub();
  }, [isOpen, activeSchool, activeClassId]);

  const handleSelectProfile = (profile: TeacherProfile) => {
    playPop();
    setActiveTeacherId(profile.id);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateTeacherProfile({
      ...activeTeacherProfile,
      jaName: editName.trim(),
      name: editName.trim(),
      avatar: editAvatar.trim() || activeTeacherProfile.avatar
    });
    setIsEditing(false);
    playPop();
  };

  const handleJoinGameAsSeat0 = (pinToUse: string) => {
    if (!pinToUse) return;

    // Create a local student profile with attendanceNumber: 0 (Teacher Test Seat)
    const teacherStudentProfile: StudentProfile = {
      schoolId: activeSchool,
      classId: activeClassId,
      attendanceNumber: 0,
      nickname: activeTeacherProfile.jaName || activeTeacherProfile.name,
      avatar: activeTeacherProfile.avatar || '👨‍🏫',
      xp: 9999,
      level: 10,
      gold: 999,
      boundAt: Date.now(),
      lastPlayedAt: Date.now()
    };

    setLocalStudentProfile(teacherStudentProfile);
    sessionStorage.setItem('activeQuizRoomCode', pinToUse);
    setIsContestantMode(true);

    setIsOpen(false);
    playPop();

    // Launch student container
    launchGame('eigo_arena');
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Header Pill Button */}
      <button
        type="button"
        onClick={() => {
          playPop();
          setIsOpen(!isOpen);
        }}
        className={`h-8 px-2 sm:px-2.5 rounded-xl border flex items-center gap-1 font-black text-xs transition-all cursor-pointer shadow-xs select-none ${
          isOpen
            ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-100 ring-2 ring-amber-300 dark:ring-amber-700'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-amber-400'
        }`}
        title={language === 'ja' ? '先生プロファイルの切り替え' : 'Switch active teacher profile'}
      >
        <span className="text-sm select-none">{activeTeacherProfile.avatar}</span>
        <span className="max-w-[120px] truncate leading-none">
          {language === 'ja' ? activeTeacherProfile.jaName : activeTeacherProfile.name}
        </span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-88 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-900 dark:text-white select-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base">👨‍🏫</span>
              <span className="text-xs font-black">
                {t('Teacher Profile & Seat 0', '先生プロファイル・0番')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <Edit3 size={11} />
              <span>{isEditing ? t('Done', '完了') : t('Edit Name', '名前変更')}</span>
            </button>
          </div>

          {/* Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="p-2 mb-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="text-[11px] font-black text-amber-900 dark:text-amber-200">
                {t('Customize Active Teacher', '現在の先生の名前を設定')}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  maxLength={4}
                  className="w-12 py-1 px-2 text-center text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  title="Emoji"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={language === 'ja' ? '先生のお名前（例: 田中先生）' : 'Teacher name'}
                  className="flex-1 py-1 px-2 text-xs font-black rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors"
              >
                {t('Save Changes', '保存する')}
              </button>
            </form>
          ) : (
            /* Profile List */
            <div className="space-y-1 mb-3">
              {teacherProfiles.map((prof) => {
                const isActive = prof.id === activeTeacherProfile.id;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => handleSelectProfile(prof)}
                    className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition-all ${
                      isActive
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-100 font-black ring-1 ring-amber-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{prof.avatar}</span>
                      <div className="min-w-0 truncate">
                        <div className="text-xs truncate">
                          {language === 'ja' ? prof.jaName : prof.name}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {prof.title}
                        </span>
                      </div>
                    </div>
                    {isActive && <Check size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Play as Contestant (Seat 0) Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{t('Contestant Mode', 'プレイヤー参加（席0番）')}</span>
              <span className="text-emerald-500 font-bold">No seat taken</span>
            </div>

            {detectedRoom ? (
              <button
                type="button"
                onClick={() => handleJoinGameAsSeat0(detectedRoom.code)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105 active:scale-98 text-white font-black text-xs shadow-md flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Gamepad2 size={16} className="animate-pulse" />
                  <span>
                    {language === 'ja'
                      ? `ルーム ${detectedRoom.code} に参加！`
                      : `Join Room ${detectedRoom.code}!`}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-full font-mono">
                  #0
                </span>
              </button>
            ) : showPinInput ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={4}
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN"
                  autoFocus
                  className="w-20 py-2 text-center font-mono font-black text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
                <button
                  type="button"
                  disabled={customPin.length !== 4}
                  onClick={() => handleJoinGameAsSeat0(customPin)}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs"
                >
                  {t('Join #0', '参加')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPinInput(true)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-black text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Gamepad2 size={14} />
                <span>{t('Enter Room PIN to Play (#0)', 'PINを入力して席0番で参加')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
