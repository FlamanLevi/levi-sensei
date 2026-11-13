import { ensureAnonymousAuth } from './firebase';
import { safeGet, safeRemove, getServerTime } from './rtdbSafe';

export async function clearClassRoomPointers(
  schoolId?: string,
  classId?: string,
  targetRoomCode?: string | null
): Promise<void> {
  if (!schoolId || !classId || !targetRoomCode) return;
  const basePath = `schools/${schoolId}/classes/${classId}/analyticsSummary`;
  const [curActive, curTeacher] = await Promise.all([
    safeGet<{ code?: string }>(`${basePath}/activeRoom`).catch(() => null),
    safeGet<{ code?: string }>(`${basePath}/teacherRoom`).catch(() => null)
  ]);
  const removals: Promise<void>[] = [];
  if (curActive?.code === targetRoomCode) {
    removals.push(safeRemove(`${basePath}/activeRoom`).catch(() => {}));
  }
  if (curTeacher?.code === targetRoomCode) {
    removals.push(safeRemove(`${basePath}/teacherRoom`).catch(() => {}));
  }
  if (removals.length > 0) {
    await Promise.all(removals);
  }
}

/**
 * Automatically sweeps and purges stale, abandoned, or closed rooms from Firebase RTDB.
 * Criteria for purging:
 * 1. Status is 'CLOSED' (retention period exceeded).
 * 2. Status is 'GAME_OVER' and game finished > 30 minutes ago (or has no active activity).
 * 3. Status is 'LOBBY' and 0 players for > 30 minutes (or abandoned setup without timestamp).
 * 4. Any room with no activity for > 2 hours (120 minutes).
 */
export async function sweepStaleRooms(): Promise<number> {
  try {
    const uid = await ensureAnonymousAuth();
    if (!uid) return 0;

    const snap = await safeGet<Record<string, any>>('rooms');
    if (!snap || typeof snap !== 'object') return 0;

    const now = getServerTime();
    const THIRTY_MIN_MS = 30 * 60 * 1000;
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    let purgedCount = 0;

    const promises: Promise<void>[] = [];

    for (const [pin, r] of Object.entries(snap)) {
      if (!r || typeof r !== 'object') {
        promises.push(safeRemove(`rooms/${pin}`).catch(() => {}));
        purgedCount++;
        continue;
      }

      const status = r.status || r.metadata?.status || 'UNKNOWN';
      const createdAt = r.createdAt || r.metadata?.createdAt;
      const raceStartTime = r.raceStartTime || r.metadata?.updatedAt;
      const lastActivity = Math.max(createdAt || 0, raceStartTime || 0, r.updatedAt || 0);

      const isExplicitlyClosed = status === 'CLOSED';
      const isOldGameOver = status === 'GAME_OVER' && (lastActivity > 0 ? (now - lastActivity > THIRTY_MIN_MS) : true);
      const isDeadLobby = status === 'LOBBY' && (!r.players || Object.keys(r.players).length === 0) && (lastActivity > 0 ? (now - lastActivity > THIRTY_MIN_MS) : true);
      const isAncient = lastActivity > 0 ? (now - lastActivity > TWO_HOURS_MS) : (isDeadLobby || isExplicitlyClosed);

      if (isExplicitlyClosed || isOldGameOver || isDeadLobby || isAncient) {
        const sId = r.schoolId || r.metadata?.schoolId;
        const cId = r.classId || r.metadata?.classId;
        const isStudent = !!(r.isStudentHost || r.metadata?.isStudentHost);
        promises.push(
          Promise.all([
            safeRemove(`rooms/${pin}`),
            safeRemove(`roomPlayers/${pin}`),
            safeRemove(`roomResponses/${pin}`),
            safeRemove(`hostSessions/${pin}`),
            sId && cId && !isStudent ? clearClassRoomPointers(sId, cId, pin) : Promise.resolve()
          ]).then(() => {}).catch(() => {})
        );
        purgedCount++;
      }
    }

    await Promise.all(promises);
    return purgedCount;
  } catch (err) {
    console.warn('[roomSweeper] Error sweeping stale rooms:', err);
    return 0;
  }
}
