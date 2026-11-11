import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { GradeLevel, CategoryKey } from '@data/types';
import { SchoolId, SCHOOL_CONFIGS, getSuggestedClassForSchedule } from '@/types/roster';
import { TeacherProfile, DEFAULT_TEACHER_PROFILES } from '@/types/teacher';

export type StreamMode = 'STREAM_A' | 'STREAM_B' | 'STREAM_C' | 'STREAM_D';
export type ActiveView = 'HUB' | 'DICTIONARY' | 'ALPHABET' | 'GAME' | 'REPORTS';
export type UserRole = 'TEACHER' | 'STUDENT';

export type ThemeMode = 'light' | 'dark';

export const TEACHER_PIN = '051683';

export const verifyTeacherPin = (pin: string): boolean => {
  return pin.trim() === TEACHER_PIN;
};

interface ClassroomContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  verifyTeacherPin: (pin: string) => boolean;
  unlockTeacher: (pin: string) => boolean;
  lockTeacher: () => void;
  isTeacherUnlocked: boolean;
  activeGrade: GradeLevel;
  setActiveGrade: (g: GradeLevel) => void;
  activeCategory: CategoryKey | 'ALL';
  setActiveCategory: (cat: CategoryKey | 'ALL') => void;
  activeUnit: string | 'ALL';
  setActiveUnit: (unit: string | 'ALL') => void;
  selectedUnits: string[];
  setSelectedUnits: (units: string[]) => void;
  toggleUnitSelection: (unit: string) => void;
  clearSelectedUnits: () => void;
  activeSchool: SchoolId;
  setActiveSchool: (school: SchoolId) => void;
  activeClassId: string;
  setActiveClassId: (classId: string) => void;
  streamMode: StreamMode;
  setStreamMode: (m: StreamMode) => void;
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
  activeGameId: string | null;
  isContestantMode: boolean;
  setIsContestantMode: (val: boolean) => void;
  launchGame: (gameId: string) => void;
  exitToHub: () => void;
  openDictionary: () => void;
  openAlphabet: () => void;
  openReports: () => void;
  isUnitModalOpen: boolean;
  setIsUnitModalOpen: (open: boolean) => void;
  openUnitModal: () => void;
  isPickerModalOpen: boolean;
  setIsPickerModalOpen: (open: boolean) => void;
  openPickerModal: () => void;
  closePickerModal: () => void;
  isDiceModalOpen: boolean;
  setIsDiceModalOpen: (open: boolean) => void;
  openDiceModal: () => void;
  closeDiceModal: () => void;
  isRoutineModalOpen: boolean;
  setIsRoutineModalOpen: (open: boolean) => void;
  openRoutineModal: () => void;
  closeRoutineModal: () => void;
  pinnedGameIds: string[];
  togglePinGame: (gameId: string) => void;
  // Teacher Profiles & Hot-Swapping
  teacherProfiles: TeacherProfile[];
  activeTeacherProfile: TeacherProfile;
  activeTeacherId: string;
  setActiveTeacherId: (id: string) => void;
  updateTeacherProfile: (profile: TeacherProfile) => void;
  addTeacherProfile: (profile: TeacherProfile) => void;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

export const ClassroomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check URL path, query parameters, session, or verified teacher seat 0 profile for teacher unlock
  const getInitialTeacherUnlocked = (): boolean => {
    try {
      if (sessionStorage.getItem('levi_sensei_teacher_unlocked') === 'true') return true;
      const studentProfile = localStorage.getItem('levi_sensei_student_profile');
      if (studentProfile) {
        const parsed = JSON.parse(studentProfile);
        if (parsed && typeof parsed.attendanceNumber === 'number' && parsed.attendanceNumber === 0) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const getInitialRole = (): UserRole => {
    try {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);

      // Check if a registered student profile exists on this device (attendance 1-35)
      const studentProfile = localStorage.getItem('levi_sensei_student_profile');
      let isRosterStudent = false;
      if (studentProfile) {
        try {
          const parsed = JSON.parse(studentProfile);
          if (parsed && typeof parsed.attendanceNumber === 'number' && parsed.attendanceNumber > 0) {
            isRosterStudent = true;
          }
        } catch {}
      }

      const isUnlocked = getInitialTeacherUnlocked();

      // If this is a known student device (attendance 1-35) and not unlocked in this session:
      // ALWAYS FORCE STUDENT, clean URL and purge any old teacher role
      if (isRosterStudent && !isUnlocked) {
        localStorage.setItem('levi_sensei_role', 'STUDENT');
        if (path.includes('/teacher') || path.includes('/admin')) {
          window.history.replaceState(null, '', '/');
        }
        return 'STUDENT';
      }

      // Explicit student routes / room PINs
      if (
        path.includes('/student') ||
        path.includes('/join') ||
        path === '/s' ||
        params.get('pin') ||
        params.get('room') ||
        params.get('setup') ||
        params.get('role') === 'student'
      ) {
        localStorage.setItem('levi_sensei_role', 'STUDENT');
        return 'STUDENT';
      }

      // Explicit teacher routes: ONLY grant TEACHER if session is unlocked!
      if (path.includes('/teacher') || path.includes('/admin') || params.get('role') === 'teacher') {
        if (isUnlocked) {
          return 'TEACHER';
        }
        // If not unlocked yet, default role to STUDENT so teacher hub never leaks without PIN
        localStorage.setItem('levi_sensei_role', 'STUDENT');
        return 'STUDENT';
      }

      // Saved preference: if user was previously teacher AND has active session unlock
      const saved = localStorage.getItem('levi_sensei_role');
      if (saved === 'TEACHER' && isUnlocked) return 'TEACHER';

      // Default to STUDENT: base URL is the student portal
      localStorage.setItem('levi_sensei_role', 'STUDENT');
      return 'STUDENT';
    } catch {
      // Fallback
    }
    return 'STUDENT';
  };

  const getInitialTheme = (): ThemeMode => {
    try {
      const saved = localStorage.getItem('levi_sensei_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Fallback
    }
    return 'light';
  };

  const getInitialSchool = (): SchoolId => {
    // 1. If this device has a linked student profile, their school is 100% authoritative!
    try {
      const studentProfile = localStorage.getItem('levi_sensei_student_profile');
      if (studentProfile) {
        const parsed = JSON.parse(studentProfile);
        if (parsed?.schoolId === 'toyogaoka' || parsed?.schoolId === 'futakotamagawa') {
          return parsed.schoolId;
        }
      }
    } catch {}

    // 2. Saved explicit user preference
    try {
      const saved = localStorage.getItem('levi_sensei_school');
      if (saved === 'toyogaoka' || saved === 'futakotamagawa') return saved;
    } catch {
      // Ignore
    }

    // 3. Auto-detect based on today's schedule (Tuesday = Toyogaoka, Mon/Thu/Fri = Futakotamagawa)
    // ONLY as a cold-start fallback when no saved state exists
    const day = new Date().getDay();
    if (day === 2) return 'toyogaoka';
    return 'futakotamagawa';
  };

  const getInitialClassId = (school: SchoolId): string => {
    // 1. If this device has a linked student profile, their class is 100% authoritative!
    try {
      const studentProfile = localStorage.getItem('levi_sensei_student_profile');
      if (studentProfile) {
        const parsed = JSON.parse(studentProfile);
        if (parsed?.classId && SCHOOL_CONFIGS[school]?.classes.includes(parsed.classId)) {
          return parsed.classId;
        }
      }
    } catch {}

    // 2. Restore saved user selection in localStorage (User explicit intent > Timetable guess!)
    try {
      const saved = localStorage.getItem('levi_sensei_class_id');
      if (saved && SCHOOL_CONFIGS[school]?.classes.includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore
    }

    // 3. If currently within or leading into a scheduled school period today, use that period's class!
    const suggested = getSuggestedClassForSchedule(school);
    if (suggested && suggested.classId) {
      return suggested.classId;
    }

    // 4. Fallback to default class for this school
    return SCHOOL_CONFIGS[school]?.classes[0] || '3-1';
  };

  const initialSchool = getInitialSchool();
  const initialClassId = getInitialClassId(initialSchool);

  const getGradeFromClass = (cId: string): GradeLevel => {
    if (cId.startsWith('1-')) return 'ES_G1';
    if (cId.startsWith('2-')) return 'ES_G2';
    if (cId.startsWith('3-')) return 'ES_G3';
    if (cId.startsWith('4-')) return 'ES_G4';
    if (cId.startsWith('5-')) return 'ES_G5';
    if (cId.startsWith('6-')) return 'ES_G6';
    return 'ES_G3';
  };

  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [isTeacherUnlocked, setIsTeacherUnlocked] = useState<boolean>(getInitialTeacherUnlocked);
  const [userRole, setUserRoleState] = useState<UserRole>(getInitialRole);
  const [activeSchool, setActiveSchoolState] = useState<SchoolId>(initialSchool);
  const [activeClassId, setActiveClassIdState] = useState<string>(initialClassId);
  const [activeGrade, setActiveGrade] = useState<GradeLevel>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const g = params.get('grade') || params.get('g');
      if (g) {
        if (g === '1' || g.toLowerCase() === 'es_g1') return 'ES_G1';
        if (g === '2' || g.toLowerCase() === 'es_g2') return 'ES_G2';
        if (g === '3' || g.toLowerCase() === 'es_g3') return 'ES_G3';
        if (g === '4' || g.toLowerCase() === 'es_g4') return 'ES_G4';
        if (g === '5' || g.toLowerCase() === 'es_g5') return 'ES_G5';
        if (g === '6' || g.toLowerCase() === 'es_g6') return 'ES_G6';
      }
    } catch {}
    return getGradeFromClass(initialClassId);
  });
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'ALL'>('ALL');
  const [activeUnit, setActiveUnitState] = useState<string | 'ALL'>('ALL');
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const setActiveUnit = (unit: string | 'ALL') => {
    setActiveUnitState(unit);
    if (unit === 'ALL') {
      setSelectedUnits([]);
    } else {
      setSelectedUnits([unit]);
    }
  };

  const toggleUnitSelection = (unit: string) => {
    setSelectedUnits(prev => {
      const next = prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit];
      if (next.length === 1) {
        setActiveUnitState(next[0]);
      } else if (next.length === 0) {
        setActiveUnitState('ALL');
      } else {
        setActiveUnitState('ALL');
      }
      return next;
    });
  };

  const clearSelectedUnits = () => {
    setSelectedUnits([]);
    setActiveUnitState('ALL');
  };

  const [streamMode, setStreamMode] = useState<StreamMode>(userRole === 'STUDENT' ? 'STREAM_C' : 'STREAM_A');
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    try {
      const p = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (p.includes('/alphabet') || params.get('view') === 'alphabet' || params.get('v') === 'alpha') return 'ALPHABET';
      if (p.includes('/dictionary') || params.get('view') === 'dictionary' || params.get('v') === 'dict') return 'DICTIONARY';
      if (p.includes('/reports') || params.get('view') === 'reports') return 'REPORTS';
    } catch {}
    return 'HUB';
  });
  const [activeGameId, setActiveGameId] = useState<string | null>(() => {
    try {
      return new URLSearchParams(window.location.search).get('game') || null;
    } catch {
      return null;
    }
  });

  const [isContestantMode, setIsContestantModeState] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('isTeacherContestantMode') === 'true';
    } catch {
      return false;
    }
  });

  const setIsContestantMode = useCallback((val: boolean) => {
    setIsContestantModeState(val);
    try {
      if (val) {
        sessionStorage.setItem('isTeacherContestantMode', 'true');
      } else {
        sessionStorage.removeItem('isTeacherContestantMode');
      }
    } catch {
      // Ignore
    }
  }, []);

  const setActiveSchool = (school: SchoolId) => {
    setActiveSchoolState(school);
    try {
      localStorage.setItem('levi_sensei_school', school);
    } catch {
      // Ignore
    }

    // If current class doesn't exist in new school, pick a valid one
    const validClasses = SCHOOL_CONFIGS[school]?.classes || [];
    if (!validClasses.includes(activeClassId)) {
      // Preserve grade level if possible (e.g. 6-4 at Futako -> 6-1 or 6-2 at Toyogaoka)
      const currentGradeNum = activeClassId ? activeClassId.charAt(0) : '3';
      const matchingGradeClass = validClasses.find(c => c.startsWith(`${currentGradeNum}-`));
      const fallbackClass = matchingGradeClass || validClasses[0] || '3-1';
      setActiveClassId(fallbackClass);
    }
  };

  const getInitialPinnedGames = (): string[] => {
    try {
      const saved = localStorage.getItem('levi_sensei_pinned_games');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['eigo_arena', 'speed_flash', 'typhoon'];
  };

  const [pinnedGameIds, setPinnedGameIds] = useState<string[]>(getInitialPinnedGames);

  const togglePinGame = (gameId: string) => {
    setPinnedGameIds(prev => {
      const next = prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId];
      try {
        localStorage.setItem('levi_sensei_pinned_games', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const setActiveClassId = (classId: string) => {
    // 1. Save currently active deck for the outgoing class
    try {
      if (activeClassId) {
        localStorage.setItem(
          `levi_sensei_deck_${activeSchool}_${activeClassId}`,
          JSON.stringify({ activeUnit, selectedUnits, activeCategory })
        );
      }
    } catch {}

    setActiveClassIdState(classId);
    try {
      localStorage.setItem('levi_sensei_class_id', classId);
    } catch {
      // Ignore
    }

    // Auto-sync grade when selecting class (e.g. 2-1 -> Grade 2, 4-2 -> Grade 4)
    const newGrade = getGradeFromClass(classId);
    setActiveGrade(newGrade);

    // 2. Restore saved deck for incoming class if present
    try {
      const savedDeck = localStorage.getItem(`levi_sensei_deck_${activeSchool}_${classId}`);
      if (savedDeck) {
        const parsed = JSON.parse(savedDeck);
        if (parsed.activeUnit) setActiveUnitState(parsed.activeUnit);
        if (Array.isArray(parsed.selectedUnits)) setSelectedUnits(parsed.selectedUnits);
        if (parsed.activeCategory) setActiveCategory(parsed.activeCategory);
      }
    } catch {}
  };

  // Sync theme with document element synchronously without staggered transitions
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.add('no-theme-transition');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Force synchronous layout reflow so all elements apply the new theme at the exact same moment
    void root.offsetHeight;

    const raf = requestAnimationFrame(() => {
      root.classList.remove('no-theme-transition');
    });

    try {
      localStorage.setItem('levi_sensei_theme', theme);
    } catch {
      // Ignore
    }

    return () => cancelAnimationFrame(raf);
  }, [theme]);

  // Sync school display theme (Futakotamagawa TV vs Toyogaoka Whiteboard Sheet)
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.add('no-theme-transition');
    root.classList.remove('theme-futako-tv', 'theme-toyo-sheet', 'theme-toyo-kokuban');
    if (activeSchool === 'futakotamagawa') {
      root.classList.add('theme-futako-tv');
    } else {
      root.classList.add('theme-toyo-sheet');
    }
    void root.offsetHeight;

    const raf = requestAnimationFrame(() => {
      root.classList.remove('no-theme-transition');
    });

    return () => cancelAnimationFrame(raf);
  }, [activeSchool]);

  // Reset unit and category filter whenever active grade changes to prevent orphaned filters
  const prevGradeRef = React.useRef(activeGrade);
  React.useEffect(() => {
    if (prevGradeRef.current !== activeGrade) {
      prevGradeRef.current = activeGrade;
      setActiveUnit('ALL');
      setSelectedUnits([]);
      setActiveCategory('ALL');
    }
  }, [activeGrade]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Self-healing effect: ensure student devices never stay stuck in teacher mode
  useEffect(() => {
    try {
      const studentProfile = localStorage.getItem('levi_sensei_student_profile');
      if (studentProfile) {
        const parsed = JSON.parse(studentProfile);
        if (parsed && typeof parsed.attendanceNumber === 'number' && parsed.attendanceNumber > 0) {
          // Device belongs to an enrolled student (1-35)
          if (window.location.pathname.includes('/teacher') || window.location.pathname.includes('/admin')) {
            window.history.replaceState(null, '', '/');
          }
          if (userRole === 'TEACHER' && !isTeacherUnlocked) {
            setUserRoleState('STUDENT');
            localStorage.setItem('levi_sensei_role', 'STUDENT');
            setStreamMode('STREAM_C');
          }
        }
      }
    } catch {}
  }, [userRole, isTeacherUnlocked]);

  const setUserRole = (role: UserRole) => {
    if (role === 'TEACHER') {
      if (!isTeacherUnlocked) {
        // Teacher mode blocked: requires PIN unlock!
        return;
      }
      setUserRoleState('TEACHER');
      try {
        localStorage.setItem('levi_sensei_role', 'TEACHER');
        if (window.location.pathname === '/' || window.location.pathname.includes('/student') || window.location.pathname === '/s') {
          window.history.replaceState(null, '', '/teacher');
        }
      } catch {}
      setStreamMode('STREAM_A');
    } else {
      setUserRoleState('STUDENT');
      try {
        localStorage.setItem('levi_sensei_role', 'STUDENT');
        if (window.location.pathname.includes('/teacher') || window.location.pathname.includes('/admin')) {
          window.history.replaceState(null, '', '/');
        }
      } catch {}
      setStreamMode('STREAM_C');
    }
  };

  const unlockTeacher = (pin: string): boolean => {
    // 6-digit PIN 051683 (only valid unlock code)
    if (verifyTeacherPin(pin)) {
      try {
        sessionStorage.setItem('levi_sensei_teacher_unlocked', 'true');
        localStorage.setItem('levi_sensei_role', 'TEACHER');
        if (window.location.pathname === '/' || window.location.pathname.includes('/student') || window.location.pathname === '/s') {
          window.history.replaceState(null, '', '/teacher');
        }
      } catch {}
      setIsTeacherUnlocked(true);
      setUserRoleState('TEACHER');
      setStreamMode('STREAM_A');
      return true;
    }
    return false;
  };

  const lockTeacher = () => {
    try {
      sessionStorage.removeItem('levi_sensei_teacher_unlocked');
      localStorage.setItem('levi_sensei_role', 'STUDENT');
      if (window.location.pathname.includes('/teacher') || window.location.pathname.includes('/admin')) {
        window.history.replaceState(null, '', '/');
      }
    } catch {}
    setIsTeacherUnlocked(false);
    setUserRoleState('STUDENT');
    setStreamMode('STREAM_C');
  };

  const launchGame = (gameId: string) => {
    setActiveGameId(gameId);
    setActiveView('GAME');
  };

  const exitToHub = () => {
    setActiveGameId(null);
    setActiveView('HUB');
    setIsContestantMode(false);
  };

  const [isUnitModalOpen, setIsUnitModalOpen] = useState<boolean>(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState<boolean>(false);
  const [isDiceModalOpen, setIsDiceModalOpen] = useState<boolean>(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState<boolean>(false);

  const openUnitModal = () => {
    setIsUnitModalOpen(true);
  };

  const openPickerModal = () => {
    setIsPickerModalOpen(true);
  };

  const closePickerModal = () => {
    setIsPickerModalOpen(false);
  };

  const openDiceModal = () => {
    setIsDiceModalOpen(true);
  };

  const closeDiceModal = () => {
    setIsDiceModalOpen(false);
  };

  const openRoutineModal = () => {
    setIsRoutineModalOpen(true);
  };

  const closeRoutineModal = () => {
    setIsRoutineModalOpen(false);
  };

  const openDictionary = () => {
    setActiveView('DICTIONARY');
  };

  const openAlphabet = () => {
    setActiveView('ALPHABET');
  };

  const openReports = () => {
    setActiveView('REPORTS');
  };

  // Teacher Profiles Store (Hot-Swappable)
  const [teacherProfiles, setTeacherProfiles] = useState<TeacherProfile[]>(() => {
    try {
      const saved = localStorage.getItem('levi_sensei_teacher_profiles');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TEACHER_PROFILES;
  });

  const [activeTeacherId, setActiveTeacherIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('levi_sensei_active_teacher_id');
      if (saved) return saved;
    } catch {}
    return 'levi_sensei';
  });

  const activeTeacherProfile = useMemo<TeacherProfile>(() => {
    return teacherProfiles.find(p => p.id === activeTeacherId) || teacherProfiles[0] || DEFAULT_TEACHER_PROFILES[0];
  }, [teacherProfiles, activeTeacherId]);

  const setActiveTeacherId = (id: string) => {
    setActiveTeacherIdState(id);
    try {
      localStorage.setItem('levi_sensei_active_teacher_id', id);
    } catch {}
  };

  const updateTeacherProfile = (updated: TeacherProfile) => {
    setTeacherProfiles(prev => {
      const next = prev.map(p => p.id === updated.id ? updated : p);
      try {
        localStorage.setItem('levi_sensei_teacher_profiles', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const addTeacherProfile = (newProfile: TeacherProfile) => {
    setTeacherProfiles(prev => {
      const next = [...prev.filter(p => p.id !== newProfile.id), newProfile];
      try {
        localStorage.setItem('levi_sensei_teacher_profiles', JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveTeacherId(newProfile.id);
  };

  return (
    <ClassroomContext.Provider value={{
      theme,
      toggleTheme,
      userRole,
      setUserRole,
      verifyTeacherPin,
      unlockTeacher,
      lockTeacher,
      isTeacherUnlocked,
      activeGrade,
      setActiveGrade,
      activeCategory,
      setActiveCategory,
      activeUnit,
      setActiveUnit,
      selectedUnits,
      setSelectedUnits,
      toggleUnitSelection,
      clearSelectedUnits,
      activeSchool,
      setActiveSchool,
      activeClassId,
      setActiveClassId,
      streamMode,
      setStreamMode,
      activeView,
      setActiveView,
      activeGameId,
      isContestantMode,
      setIsContestantMode,
      launchGame,
      exitToHub,
      openDictionary,
      openAlphabet,
      openReports,
      isUnitModalOpen,
      setIsUnitModalOpen,
      openUnitModal,
      isPickerModalOpen,
      setIsPickerModalOpen,
      openPickerModal,
      closePickerModal,
      isDiceModalOpen,
      setIsDiceModalOpen,
      openDiceModal,
      closeDiceModal,
      isRoutineModalOpen,
      setIsRoutineModalOpen,
      openRoutineModal,
      closeRoutineModal,
      pinnedGameIds,
      togglePinGame,
      teacherProfiles,
      activeTeacherProfile,
      activeTeacherId,
      setActiveTeacherId,
      updateTeacherProfile,
      addTeacherProfile
    }}>
      {children}
    </ClassroomContext.Provider>
  );
};

export const useClassroom = () => {
  const context = useContext(ClassroomContext);
  if (!context) throw new Error('useClassroom must be used within ClassroomProvider');
  return context;
};
