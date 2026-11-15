import { SOUND_PACKS, getSoundPack, SoundTrack } from '../utils/soundPacks';

export type BgmRole = SoundTrack['role'];

export interface BGMTrackMeta {
  id: string;
  file: string;
  title: string;
  series: string;
  role?: BgmRole;
  lufs?: number;
  gain?: number;
}

export interface ResolvedBGMTrack {
  file: string;
  title: string;
  id?: string;
  role?: BgmRole;
  lufs?: number;
  gain?: number;
}

export interface QuizHostBgmPhase {
  role: BgmRole;
  isBgmStep: boolean;
  fadeInDurationMs: number;
  crossfadeDurationMs: number;
}

export interface KeyValueStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function toRelativeBgmFile(urlOrFile: string): string {
  return urlOrFile.startsWith('/') ? urlOrFile.replace(/^\/media\/bgm\//, '') : urlOrFile;
}

export function sanitizeTrackGain(gain?: number): number {
  if (typeof gain !== 'number' || !Number.isFinite(gain) || gain <= 0) return 1.0;
  return Math.max(0.25, Math.min(2.0, gain));
}

function mapPackTrackToMeta(track: SoundTrack, seriesOverride?: string): BGMTrackMeta {
  return {
    id: track.id,
    file: toRelativeBgmFile(track.url),
    title: track.title,
    series: seriesOverride || track.id.split('_')[0],
    role: track.role,
    lufs: track.lufs,
    gain: sanitizeTrackGain(track.gain),
  };
}

export const MARIO_BGM_TRACKS: BGMTrackMeta[] = SOUND_PACKS.mario.tracks.map((t) =>
  mapPackTrackToMeta(t, 'mario')
);

export const WANGAN_BGM_TRACKS: BGMTrackMeta[] = SOUND_PACKS.wangan.tracks.map((t) =>
  mapPackTrackToMeta(t, 'wangan')
);

export const ALL_BGM_TRACKS: BGMTrackMeta[] = SOUND_PACKS.all_stars.tracks.map((t) =>
  mapPackTrackToMeta(t)
);

/**
 * Registry of legacy BGM category keys.
 */
export const BGM_CATEGORIES: Record<string, BGMTrackMeta[]> = {
  random_all: ALL_BGM_TRACKS,
  random_mario: MARIO_BGM_TRACKS,
  random_wangan: WANGAN_BGM_TRACKS,
  all_stars: ALL_BGM_TRACKS,
};

// Fisher-Yates true random array shuffle
function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

interface SavedDeckState {
  remainingIds: string[];
  lastPlayedId: string | null;
  lastPlayedAt: number;
}

const DECK_STORAGE_PREFIX = 'levi_bgm_deck_';

function getDefaultStorage(): KeyValueStorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Ignore storage unavailability
  }
  return null;
}

function readReconciledDeck(
  storageKey: string,
  trackPool: BGMTrackMeta[],
  storage: KeyValueStorageLike | null
): { state: SavedDeckState; remaining: string[] } {
  const validIds = trackPool.map((t) => t.id);
  let state: SavedDeckState = {
    remainingIds: [],
    lastPlayedId: null,
    lastPlayedAt: 0,
  };

  try {
    const raw = storage?.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.remainingIds)) {
        state = parsed;
      }
    }
  } catch {
    // Ignore parse errors, fallback to clean state
  }

  let remaining = state.remainingIds.filter((id) => validIds.includes(id));
  if (remaining.length > 0) {
    const missingNewIds = validIds.filter((id) => !remaining.includes(id) && id !== state.lastPlayedId);
    if (missingNewIds.length > 0) {
      remaining = [...remaining, ...shuffleArray(missingNewIds)];
    }
  }

  return { state, remaining };
}

function createFreshShuffledIds(validIds: string[], avoidFirstId: string | null): string[] {
  const freshDeck = shuffleArray(validIds);
  if (freshDeck.length > 1 && avoidFirstId && freshDeck[0] === avoidFirstId) {
    [freshDeck[0], freshDeck[1]] = [freshDeck[1], freshDeck[0]];
  }
  return freshDeck;
}

function toResolvedTrack(meta: BGMTrackMeta): ResolvedBGMTrack {
  return {
    file: meta.file,
    title: meta.title,
    id: meta.id,
    role: meta.role,
    lufs: meta.lufs,
    gain: sanitizeTrackGain(meta.gain),
  };
}

/**
 * Draws the next track from a persistent, indeterminate-length shuffle bag.
 * - Stores state in localStorage so it survives tab closures & iPad reboots.
 * - Auto-reconciles if new tracks are added to or removed from the catalog.
 * - Pre-shuffles the upcoming bag immediately upon exhaustion so Lobby pre-warming can read remaining[0] accurately.
 * - Guarantees the same track is never dealt consecutively when the deck resets.
 */
export function drawNextTrackFromDeck(
  categoryKey: string,
  trackPool: BGMTrackMeta[],
  storage: KeyValueStorageLike | null = getDefaultStorage()
): ResolvedBGMTrack | null {
  if (!trackPool || trackPool.length === 0) return null;
  if (trackPool.length === 1) {
    return toResolvedTrack(trackPool[0]);
  }

  const validIds = trackPool.map((t) => t.id);
  const storageKey = `${DECK_STORAGE_PREFIX}${categoryKey}`;
  const { state, remaining: reconciled } = readReconciledDeck(storageKey, trackPool, storage);
  let remaining = reconciled;

  if (remaining.length === 0) {
    remaining = createFreshShuffledIds(validIds, state.lastPlayedId);
  }

  const pickedId = remaining.shift()!;
  const pickedTrack = trackPool.find((t) => t.id === pickedId) || trackPool[0];

  // Refill immediately on exhaustion so read-only prewarm peeks match the next real draw 100%
  if (remaining.length === 0 && validIds.length > 1) {
    remaining = createFreshShuffledIds(validIds, pickedTrack.id);
  }

  try {
    const updatedState: SavedDeckState = {
      remainingIds: remaining,
      lastPlayedId: pickedTrack.id,
      lastPlayedAt: Date.now(),
    };
    storage?.setItem(storageKey, JSON.stringify(updatedState));
  } catch {
    // Ignore storage quota errors
  }

  return toResolvedTrack(pickedTrack);
}

function resolvePoolForSelection(
  selection: string,
  role?: BgmRole | string
): { categoryKey: string; pool: BGMTrackMeta[] } | null {
  const pack = getSoundPack(selection);
  if (pack && pack.id !== 'none' && pack.tracks.length > 0) {
    let pool = pack.tracks;
    if (role) {
      const roleMatches = pack.tracks.filter((t) => t.role === role);
      if (roleMatches.length > 0) pool = roleMatches;
    }
    return {
      categoryKey: `${pack.id}_${role || 'all'}`,
      pool: pool.map((t) => mapPackTrackToMeta(t, pack.id)),
    };
  }

  if (BGM_CATEGORIES[selection]) {
    let pool = BGM_CATEGORIES[selection];
    if (role) {
      const roleMatches = pool.filter((t) => t.role === role);
      if (roleMatches.length > 0) pool = roleMatches;
    }
    return {
      categoryKey: `${selection}_${role || 'all'}`,
      pool,
    };
  }

  return null;
}

export function getRoleTrackCount(selection?: string, role?: BgmRole | string): number {
  if (!selection || selection === 'none') return 0;

  const directMatch = ALL_BGM_TRACKS.find(
    (t) => t.id === selection || t.file === selection || t.file.endsWith('/' + selection)
  );
  if (directMatch || selection.endsWith('.mp3')) return 1;

  const resolvedPool = resolvePoolForSelection(selection, role);
  return resolvedPool ? resolvedPool.pool.length : 0;
}

export function peekNextBGMTrack(
  selection?: string,
  role?: BgmRole | string,
  storage: KeyValueStorageLike | null = getDefaultStorage(),
  options?: { primeIfEmpty?: boolean }
): ResolvedBGMTrack | null {
  if (!selection || selection === 'none') return null;

  const directMatch = ALL_BGM_TRACKS.find(
    (t) => t.id === selection || t.file === selection || t.file.endsWith('/' + selection)
  );
  if (directMatch) return toResolvedTrack(directMatch);

  if (selection.endsWith('.mp3')) {
    const known = ALL_BGM_TRACKS.find((t) => t.file.endsWith('/' + selection));
    return {
      file: known ? known.file : selection,
      title: selection,
      id: selection,
      role: known?.role,
      lufs: known?.lufs,
      gain: sanitizeTrackGain(known?.gain),
    };
  }

  const resolvedPool = resolvePoolForSelection(selection, role);
  if (!resolvedPool || resolvedPool.pool.length === 0) return null;
  if (resolvedPool.pool.length === 1) return toResolvedTrack(resolvedPool.pool[0]);

  const storageKey = `${DECK_STORAGE_PREFIX}${resolvedPool.categoryKey}`;
  const { state, remaining } = readReconciledDeck(storageKey, resolvedPool.pool, storage);

  if (remaining.length > 0) {
    const nextMeta = resolvedPool.pool.find((t) => t.id === remaining[0]) || resolvedPool.pool[0];
    return toResolvedTrack(nextMeta);
  }

  if (options?.primeIfEmpty) {
    const validIds = resolvedPool.pool.map((t) => t.id);
    const freshDeck = createFreshShuffledIds(validIds, state.lastPlayedId);
    try {
      storage?.setItem(
        storageKey,
        JSON.stringify({
          remainingIds: freshDeck,
          lastPlayedId: state.lastPlayedId,
          lastPlayedAt: state.lastPlayedAt,
        } satisfies SavedDeckState)
      );
    } catch {
      // Ignore storage errors
    }
    const primedMeta = resolvedPool.pool.find((t) => t.id === freshDeck[0]) || resolvedPool.pool[0];
    return toResolvedTrack(primedMeta);
  }

  const fallbackMeta =
    resolvedPool.pool.find((t) => t.id !== state.lastPlayedId) || resolvedPool.pool[0];
  return toResolvedTrack(fallbackMeta);
}

export function resolveBGMTrack(
  selection?: string,
  role?: BgmRole | string,
  storage: KeyValueStorageLike | null = getDefaultStorage()
): ResolvedBGMTrack | null {
  if (!selection || selection === 'none') {
    return null;
  }

  const directMatch = ALL_BGM_TRACKS.find(
    (t) => t.id === selection || t.file === selection || t.file.endsWith('/' + selection)
  );
  if (directMatch) {
    return toResolvedTrack(directMatch);
  }

  if (selection.endsWith('.mp3')) {
    const known = ALL_BGM_TRACKS.find((t) => t.file.endsWith('/' + selection));
    return {
      file: known ? known.file : selection,
      title: selection,
      id: selection,
      role: known?.role,
      lufs: known?.lufs,
      gain: sanitizeTrackGain(known?.gain),
    };
  }

  const resolvedPool = resolvePoolForSelection(selection, role);
  if (resolvedPool) {
    return drawNextTrackFromDeck(resolvedPool.categoryKey, resolvedPool.pool, storage);
  }

  return null;
}

export const LOBBY_FADE_IN_DURATION_MS = 3200;
export const DEFAULT_FADE_IN_DURATION_MS = 800;
export const LOBBY_CROSSFADE_DURATION_MS = 1200;
export const RACE_CROSSFADE_DURATION_MS = 2000;
export const GAME_CROSSFADE_DURATION_MS = 1800;
export const AUTO_ADVANCE_LEAD_SECONDS = 2.2;
export const AUTO_ADVANCE_CROSSFADE_MS = 1800;

/**
 * Maps QuizHostContainer steps into BGM track role and transition timings.
 * Keeping SETUP silent while preserving previous role only via caller override
 * guarantees Lobby stays lush (~3.2s gentle swell) and transitions smoothly into Race/Quiz (~1.8-2.0s crossfade).
 */
export function resolveQuizHostBgmPhase(step: string): QuizHostBgmPhase {
  switch (step) {
    case 'LOBBY':
      return {
        role: 'lobby',
        isBgmStep: true,
        fadeInDurationMs: LOBBY_FADE_IN_DURATION_MS,
        crossfadeDurationMs: LOBBY_CROSSFADE_DURATION_MS,
      };
    case 'GRAND_PRIX_3D':
    case 'SPRINT_RACE':
      return {
        role: 'rush',
        isBgmStep: true,
        fadeInDurationMs: DEFAULT_FADE_IN_DURATION_MS,
        crossfadeDurationMs: RACE_CROSSFADE_DURATION_MS,
      };
    case 'TUG_OF_WAR':
    case 'TAMAIRE':
    case 'VOLLEYBALL':
      return {
        role: 'rush',
        isBgmStep: true,
        fadeInDurationMs: DEFAULT_FADE_IN_DURATION_MS,
        crossfadeDurationMs: GAME_CROSSFADE_DURATION_MS,
      };
    case 'QUESTION':
    case 'REVEAL':
    case 'LEADERBOARD':
      return {
        role: 'quiz',
        isBgmStep: true,
        fadeInDurationMs: DEFAULT_FADE_IN_DURATION_MS,
        crossfadeDurationMs: GAME_CROSSFADE_DURATION_MS,
      };
    case 'GAME_OVER':
      return {
        role: 'podium',
        isBgmStep: false,
        fadeInDurationMs: DEFAULT_FADE_IN_DURATION_MS,
        crossfadeDurationMs: 1500,
      };
    default:
      return {
        role: 'lobby',
        isBgmStep: false,
        fadeInDurationMs: LOBBY_FADE_IN_DURATION_MS,
        crossfadeDurationMs: GAME_CROSSFADE_DURATION_MS,
      };
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Perceptually gradual cold fade-in curve for Lobby (and normal starts):
 * Exponent > 1 offsets human logarithmic loudness perception so volume opens
 * gently from whisper-quiet instead of snapping loud in the first 0.5s.
 */
export function computeGradualFadeInVolume(progress: number, targetVolume: number): number {
  const p = clamp01(progress);
  const target = clamp01(targetVolume);
  const curved = Math.pow(p, 1.75);
  return clamp01(target * curved);
}

/**
 * Equal-power cosine/sine crossfade curve so perceived total loudness remains
 * smooth and dip-free while blending Lobby music into Race/Quiz music.
 */
export function computeCrossfadeVolumes(
  progress: number,
  outgoingStartVolume: number,
  incomingTargetVolume: number
): { outgoingVolume: number; incomingVolume: number } {
  const p = clamp01(progress);
  const outStart = clamp01(outgoingStartVolume);
  const inTarget = clamp01(incomingTargetVolume);
  const theta = p * (Math.PI / 2);
  return {
    outgoingVolume: clamp01(outStart * Math.cos(theta)),
    incomingVolume: clamp01(inTarget * Math.sin(theta)),
  };
}

export const BGM_VOLUME_STORAGE_KEY = 'levi_sensei_bgm_volume';
export const DEFAULT_BGM_MASTER_VOLUME = 0.5;
export const BGM_MAX_BASE_VOLUME = 0.7;
export const BGM_DUCK_RATIO = 0.16;
export const BGM_MAX_DUCKED_VOLUME = 0.06;

export function parseBgmVolumeValue(raw: string | null | undefined): number {
  if (raw == null || raw === '') return DEFAULT_BGM_MASTER_VOLUME;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_BGM_MASTER_VOLUME;
  return clamp01(parsed);
}

export function getStoredBgmVolume(
  storage: KeyValueStorageLike | null = getDefaultStorage()
): number {
  try {
    return parseBgmVolumeValue(storage?.getItem(BGM_VOLUME_STORAGE_KEY));
  } catch {
    return DEFAULT_BGM_MASTER_VOLUME;
  }
}

const bgmVolumeListeners = new Set<(volume: number) => void>();
let isCrossTabVolumeListenerAttached = false;

function handleStorageVolumeSync(e: StorageEvent): void {
  if (e.key !== BGM_VOLUME_STORAGE_KEY) return;
  const nextVol = parseBgmVolumeValue(e.newValue);
  for (const listener of bgmVolumeListeners) {
    try {
      listener(nextVol);
    } catch {}
  }
}

export function setStoredBgmVolume(
  volume: number,
  storage: KeyValueStorageLike | null = getDefaultStorage()
): number {
  const clamped = clamp01(volume);
  try {
    storage?.setItem(BGM_VOLUME_STORAGE_KEY, clamped.toFixed(3));
  } catch {
    // Ignore storage quota issues
  }
  for (const listener of bgmVolumeListeners) {
    try {
      listener(clamped);
    } catch {}
  }
  return clamped;
}

export function subscribeBgmVolume(listener: (volume: number) => void): () => void {
  bgmVolumeListeners.add(listener);
  if (
    !isCrossTabVolumeListenerAttached &&
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
  ) {
    window.addEventListener('storage', handleStorageVolumeSync);
    isCrossTabVolumeListenerAttached = true;
  }
  return () => {
    bgmVolumeListeners.delete(listener);
    if (
      bgmVolumeListeners.size === 0 &&
      isCrossTabVolumeListenerAttached &&
      typeof window !== 'undefined' &&
      typeof window.removeEventListener === 'function'
    ) {
      window.removeEventListener('storage', handleStorageVolumeSync);
      isCrossTabVolumeListenerAttached = false;
    }
  };
}

export interface EffectiveBgmVolumeParams {
  masterVolume: number;
  trackGain?: number;
  isDucked?: boolean;
  isMuted?: boolean;
}

export function computeEffectiveBgmVolume({
  masterVolume,
  trackGain = 1.0,
  isDucked = false,
  isMuted = false,
}: EffectiveBgmVolumeParams): number {
  if (isMuted) return 0;
  const slider = clamp01(masterVolume);
  if (slider <= 0) return 0;
  const normal = clamp01(slider * BGM_MAX_BASE_VOLUME * sanitizeTrackGain(trackGain));
  if (!isDucked) return normal;
  return clamp01(Math.min(normal * BGM_DUCK_RATIO, BGM_MAX_DUCKED_VOLUME));
}

export function shouldAutoAdvanceAtTime(
  currentTime: number,
  duration: number,
  isSingleTrackPool: boolean,
  leadSeconds = AUTO_ADVANCE_LEAD_SECONDS
): boolean {
  if (isSingleTrackPool) return false;
  if (
    !Number.isFinite(currentTime) ||
    !Number.isFinite(duration) ||
    duration <= 10 ||
    currentTime <= 0
  ) {
    return false;
  }
  return duration - currentTime <= leadSeconds;
}

export interface GrandPrix3DBgmRateParams {
  isLobby: boolean;
  raceActive: boolean;
  isTimeTrial: boolean;
  timeTrialRemainingMs: number;
  hasGraceCountdown: boolean;
  finishedCount: number;
  leaderProgress?: number;
  targetLaps?: number;
}

/**
 * Restores and adapts the classic 2D Suzuka Circuit music speed-up cadence for 3D Suzuka:
 * - Idle/Lobby/Pre-Green-Flag -> 1.00x
 * - Time Trial -> 1.15x (final 15s) -> 1.25x (final 5s)
 * - Lap Race -> +0.02x per finisher (1.02x..1.24x), minimum 1.12x on Final Lap (multi-lap) or 1.10x past 80% (1-lap),
 *   and full 1.25x adrenaline rush during the Final Countdown grace period or at 12+ finishers.
 */
export function computeGrandPrix3DBgmRate({
  isLobby,
  raceActive,
  isTimeTrial,
  timeTrialRemainingMs,
  hasGraceCountdown,
  finishedCount,
  leaderProgress = 0,
  targetLaps = 1,
}: GrandPrix3DBgmRateParams): number {
  if (isLobby || !raceActive) return 1.0;

  if (isTimeTrial) {
    if (timeTrialRemainingMs <= 5000) return 1.25;
    if (timeTrialRemainingMs <= 15000) return 1.15;
    return 1.0;
  }

  const count = Math.max(0, Math.floor(finishedCount));
  if (hasGraceCountdown || count >= 12) {
    return 1.25;
  }

  let rate = count > 0 ? Math.min(1.24, Number((1.0 + count * 0.02).toFixed(2))) : 1.0;
  const laps = Math.max(1, targetLaps || 1);
  const progress = Number.isFinite(leaderProgress) ? leaderProgress : 0;

  if (laps >= 2 && progress >= laps - 1) {
    rate = Math.max(rate, 1.12);
  } else if (laps === 1 && progress >= 0.8) {
    rate = Math.max(rate, 1.1);
  }

  return Number(rate.toFixed(2));
}

