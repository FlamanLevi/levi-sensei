import React, { useState, useEffect, useRef } from 'react';
import { ensureAnonymousAuth } from '@/services/firebase';
import { safeSubscribe, safeUpdate, safeRemove } from '@/services/rtdbSafe';
import { Radio, Trash2, AlertOctagon, X, Users, RefreshCw, CheckCircle2, Sun, Moon, Gamepad2 } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { useLanguage } from '@/context/LanguageContext';
import { useClassroom } from '@/context/ClassroomContext';
import { sweepStaleRooms, clearClassRoomPointers } from '@/services/roomSweeper';
import { setLocalStudentProfile } from '@/services/studentProfile';
import { StudentProfile } from '@/types/roster';

interface ActiveRoomSummary {
  pin: string;
  grade?: string;
  unit?: string;
  status: string;
  gamePlayType?: string;
  mode?: string;
  playerCount: number;
  playerNames: string[];
  schoolId?: string;
  classId?: string;
  isStudentHost?: boolean;
}

interface ActiveRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActiveRoomsModal: React.FC<ActiveRoomsModalProps> = ({ isOpen, onClose }) => {
  const { playPop } = useAudio();
  const { t, language } = useLanguage();
  const {
    theme,
    toggleTheme,
    activeTeacherProfile,
    activeSchool,
    activeClassId,
    launchGame,
    setIsContestantMode
  } = useClassroom();

  const [rooms, setRooms] = useState<ActiveRoomSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
        messageTimerRef.current = null;
      }
    };
  }, []);

  const showTemporaryMessage = (msg: string, durationMs: number) => {
    if (!isMountedRef.current) return;
    setActionMessage(msg);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = setTimeout(() => {
      messageTimerRef.current = null;
      if (isMountedRef.current) {
        setActionMessage(null);
      }
    }, durationMs);
  };

  // Automatically sweep stale rooms whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      sweepStaleRooms().catch(err => {
        console.warn('Error during auto-sweep:', err);
      });
    }
  }, [isOpen]);

  // Subscribe to /rooms strictly while the modal is open
  useEffect(() => {
    if (!isOpen) {
      setRooms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = safeSubscribe<Record<string, any>>(
      'rooms',
      data => {
        setLoading(false);
        if (!data || typeof data !== 'object') {
          setRooms([]);
          return;
        }

        const parsed: ActiveRoomSummary[] = Object.keys(data).map(pin => {
          const r = data[pin] || {};
          const players = r.players || {};
          const playerKeys = Object.keys(players);
          const playerNames = playerKeys.map(k => players[k]?.nickname || 'Player');

          return {
            pin,
            grade: r.grade,
            unit: r.unit,
            status: r.status || 'UNKNOWN',
            gamePlayType: r.gamePlayType,
            mode: r.mode,
            playerCount: playerKeys.length,
            playerNames,
            schoolId: r.schoolId || r.metadata?.schoolId,
            classId: r.classId || r.metadata?.classId,
            isStudentHost: !!(r.isStudentHost || r.metadata?.isStudentHost)
          };
        });

        setRooms(parsed);
      },
      err => {
        console.error('Failed to listen to rooms:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const handleJoinAsSeat0 = (pinToUse: string) => {
    if (!pinToUse) return;

    playPop();

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

    onClose();

    // Launch student container (routes to the unified quiz student container)
    launchGame('eigo_arena');
  };

  const handleKillSingleRoom = async (pin: string) => {
    if (!window.confirm(`ルーム [${pin}] を強制終了して解散しますか？\n参加中の児童の端末は終了画面に移行します。`)) {
      return;
    }

    const roomMeta = rooms.find(r => r.pin === pin);

    try {
      playPop();
      setActionMessage(`ルーム [${pin}] を解散中...`);
      await ensureAnonymousAuth();
      // Step 1: Notify connected tablets if this session owns hostId (ignore cross-UID rejection so delete still runs)
      await safeUpdate(`rooms/${pin}`, { status: 'CLOSED' }).catch(() => {});
      if (roomMeta?.schoolId && roomMeta?.classId && !roomMeta?.isStudentHost) {
        await clearClassRoomPointers(roomMeta.schoolId, roomMeta.classId, pin).catch(() => {});
      }
      // Step 2: Remove room and auxiliary spoke nodes from RTDB after short delay
      setTimeout(async () => {
        try {
          await Promise.all([
            safeRemove(`rooms/${pin}`),
            safeRemove(`roomPlayers/${pin}`).catch(() => {}),
            safeRemove(`roomResponses/${pin}`).catch(() => {}),
            safeRemove(`hostSessions/${pin}`).catch(() => {})
          ]);
          showTemporaryMessage(`✓ ルーム [${pin}] を完全に削除しました。`, 2500);
        } catch (err) {
          console.error(`Failed delayed cleanup for room ${pin}:`, err);
          showTemporaryMessage(`✕ ルーム [${pin}] の削除に失敗しました。`, 3000);
        }
      }, 1500);
    } catch (err) {
      console.error(`Failed to kill room ${pin}:`, err);
      showTemporaryMessage(`✕ ルーム [${pin}] の削除に失敗しました。`, 3000);
    }
  };

  const handlePurgeAllRooms = async () => {
    if (rooms.length === 0) return;
    if (!window.confirm(`【警告】すべてのルーム（${rooms.length}件）を一括強制終了しますか？\nすべての生徒の接続が切断されます。`)) {
      return;
    }

    const targetRooms = [...rooms];

    try {
      playPop();
      setActionMessage('全ルームを強制終了中...');
      await ensureAnonymousAuth();
      // Mark rooms CLOSED individually so cross-UID hostId differences do not abort the purge
      await Promise.all(
        targetRooms.map(r =>
          Promise.all([
            safeUpdate(`rooms/${r.pin}`, { status: 'CLOSED' }).catch(() => {}),
            r.schoolId && r.classId && !r.isStudentHost
              ? clearClassRoomPointers(r.schoolId, r.classId, r.pin).catch(() => {})
              : Promise.resolve()
          ])
        )
      );

      // Remove rooms and spoke nodes after grace delay
      setTimeout(async () => {
        try {
          await Promise.all(
            targetRooms.map(r =>
              Promise.all([
                safeRemove(`rooms/${r.pin}`),
                safeRemove(`roomPlayers/${r.pin}`).catch(() => {}),
                safeRemove(`roomResponses/${r.pin}`).catch(() => {}),
                safeRemove(`hostSessions/${r.pin}`).catch(() => {})
              ])
            )
          );
          showTemporaryMessage(`✓ 全 ${targetRooms.length} 件のルームを削除しました。`, 2500);
        } catch (err) {
          console.error('Failed delayed purge for rooms:', err);
          showTemporaryMessage('✕ 全ルームの削除に失敗しました。', 3000);
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to purge all rooms:', err);
      showTemporaryMessage('✕ 全ルームの削除に失敗しました。', 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-md md:max-w-4xl w-full shadow-2xl border-4 border-slate-200 dark:border-slate-800 flex flex-col max-h-[90dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                {t("Active Rooms Manager", "アクティブ・ルーム管理")}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap min-w-0 overflow-hidden">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                  {t("Firebase RTDB Live Radar", "Firebase RTDB 稼働状況")}
                </p>
                <span className="text-slate-300 dark:text-slate-600 shrink-0">·</span>
                <div
                  className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shrink-0 whitespace-nowrap"
                  title={t("Currently signed-in teacher seat for testing", "テストプレイで使用する現在の先生アカウント")}
                >
                  <span>{activeTeacherProfile.avatar}</span>
                  <span className="truncate max-w-[120px]">
                    {language === 'ja' ? activeTeacherProfile.jaName : activeTeacherProfile.name}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">#0</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap ml-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action status notification */}
        {actionMessage && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center gap-2 animate-in fade-in shrink-0">
            <RefreshCw size={14} className="animate-spin shrink-0" />
            <span className="truncate">{actionMessage}</span>
          </div>
        )}

        {/* Room List (2-Column Landscape Grid) */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-bold text-sm">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
              {t("Fetching active room info...", "ルーム情報を取得中...")}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-10 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                {t("No active rooms", "稼働中のルームはありません")}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("Database is clean. Ready to host a new game session.", "データベースはクリーンです。新しいゲームを作成できます。")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rooms.map(room => (
                <div
                  key={room.pin}
                  className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-nowrap">
                      <span className="font-mono text-sm sm:text-base font-black px-2.5 py-0.5 rounded-lg bg-purple-600 text-white shadow-xs shrink-0 whitespace-nowrap">
                        PIN: {room.pin}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                        room.status === 'CLOSED'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : room.status === 'LOBBY'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {room.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                      {[room.grade, room.unit, room.gamePlayType].filter(Boolean).join(' • ')}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold mt-1 min-w-0">
                      <Users size={13} className="text-purple-500 shrink-0" />
                      <span className="shrink-0 whitespace-nowrap">{t(`Students: ${room.playerCount}`, `参加生徒: ${room.playerCount}名`)}</span>
                      {room.playerNames.length > 0 && (
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                          ({room.playerNames.slice(0, 3).join(', ')}{room.playerNames.length > 3 ? '...' : ''})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shrink-0">
                    {room.status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => handleJoinAsSeat0(room.pin)}
                        className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
                        title={t(
                          `Join as ${activeTeacherProfile.name} in Seat #0`,
                          `${activeTeacherProfile.jaName || activeTeacherProfile.name}（0番席）として参加`
                        )}
                      >
                        <Gamepad2 size={14} className="animate-pulse shrink-0" />
                        <span>{t('Join #0', '参加 #0')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleKillSingleRoom(room.pin)}
                      className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-black text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95 shrink-0 border border-rose-200 dark:border-rose-900 cursor-pointer whitespace-nowrap"
                      title={t("End game and disband this room", "このルームを終了して解散")}
                    >
                      <Trash2 size={14} className="shrink-0" />
                      <span>{t("Disband", "解散")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {rooms.length > 0 ? (
            <button
              onClick={handlePurgeAllRooms}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <AlertOctagon size={16} />
              <span>{t(`Purge All Rooms (${rooms.length})`, `全ルーム強制終了 (${rooms.length})`)}</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-400 font-bold">
              CLI: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">npm run purge-rooms</code>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs transition-colors ml-auto cursor-pointer"
          >
            {t("Close", "閉じる")}
          </button>
        </div>
      </div>
    </div>
  );
};
