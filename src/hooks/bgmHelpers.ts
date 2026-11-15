import { SOUND_PACKS, getSoundPack, SoundTrack } from '../utils/soundPacks';

export type BgmRole = SoundTrack['role'];

export interface BGMTrackMeta {
  id: string;
  file: string;
  title: string;
  series: string;
  role?: BgmRole;
}

export interface ResolvedBGMTrack {
  file: string;
  title: string;
  id?: string;
  role?: BgmRole;
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

function mapPackTrackToMeta(track: SoundTrack, seriesOverride?: string): BGMTrackMeta {
  return {
    id: track.id,
    file: toRelativeBgmFile(track.url),
    title: track.title,
    series: seriesOverride || track.id.split('_')[0],
    role: track.role,
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

/**
 * Draws the next track from a persistent, indeterminate-length shuffle bag.
 * - Stores state in localStorage so it survives tab closures & iPad reboots.
 * - Auto-reconciles if new tracks are added to or removed from the catalog.
 * - Guarantees the same track is never dealt consecutively when the deck resets.
 */
export function drawNextTrackFromDeck(
  categoryKey: string,
  trackPool: BGMTrackMeta[],
  storage: KeyValueStorageLike | null = getDefaultStorage()
): ResolvedBGMTrack | null {
  if (!trackPool || trackPool.length === 0) return null;
  if (trackPool.length === 1) {
    return {
      file: trackPool[0].file,
      title: trackPool[0].title,
      id: trackPool[0].id,
      role: trackPool[0].role,
    };
  }

  const validIds = trackPool.map((t) => t.id);
  const storageKey = `${DECK_STORAGE_PREFIX}${categoryKey}`;
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

  // 1. Reconcile remainingIds against currently valid trackPool
  let remaining = state.remainingIds.filter((id) => validIds.includes(id));

  // If new tracks were added that aren't in remaining and weren't last played, fold them in
  const missingNewIds = validIds.filter((id) => !remaining.includes(id) && id !== state.lastPlayedId);
  if (missingNewIds.length > 0) {
    remaining = shuffleArray([...remaining, ...missingNewIds]);
  }

  // 2. If the deck is exhausted, reshuffle all valid IDs
  if (remaining.length === 0) {
    const freshDeck = shuffleArray(validIds);
    // Guard against back-to-back duplicate across reshuffles
    if (freshDeck.length > 1 && freshDeck[0] === state.lastPlayedId) {
      [freshDeck[0], freshDeck[1]] = [freshDeck[1], freshDeck[0]];
    }
    remaining = freshDeck;
  }

  // 3. Draw the next card
  const pickedId = remaining.shift()!;
  const pickedTrack = trackPool.find((t) => t.id === pickedId) || trackPool[0];

  // 4. Persist updated deck state
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

  return {
    file: pickedTrack.file,
    title: pickedTrack.title,
    id: pickedTrack.id,
    role: pickedTrack.role,
  };
}

export function resolveBGMTrack(
  selection?: string,
  role?: BgmRole | string,
  storage: KeyValueStorageLike | null = getDefaultStorage()
): ResolvedBGMTrack | null {
  if (!selection || selection === 'none') {
    return null;
  }

  // 1. Check direct track matches first if a specific track id/filename was explicitly chosen
  const directMatch = ALL_BGM_TRACKS.find(
    (t) => t.id === selection || t.file === selection || t.file.endsWith('/' + selection)
  );
  if (directMatch) {
    return {
      file: directMatch.file,
      title: directMatch.title,
      id: directMatch.id,
      role: directMatch.role,
    };
  }

  if (selection.endsWith('.mp3')) {
    const known = ALL_BGM_TRACKS.find((t) => t.file.endsWith('/' + selection));
    const filePath = known ? known.file : selection;
    return { file: filePath, title: selection, id: selection, role: known?.role };
  }

  // 2. Resolve from Sound Packs Registry (all_stars, initial_d, persona_5, wangan, dragon, mario + legacy aliases)
  const pack = getSoundPack(selection);
  if (pack && pack.id !== 'none' && pack.tracks.length > 0) {
    let pool = pack.tracks;
    if (role) {
      const roleMatches = pack.tracks.filter((t) => t.role === role);
      if (roleMatches.length > 0) pool = roleMatches;
    }
    const trackPool: BGMTrackMeta[] = pool.map((t) => mapPackTrackToMeta(t, pack.id));
    return drawNextTrackFromDeck(`${pack.id}_${role || 'all'}`, trackPool, storage);
  }

  // 3. Legacy category fallback
  if (BGM_CATEGORIES[selection]) {
    let pool = BGM_CATEGORIES[selection];
    if (role) {
      const roleMatches = pool.filter((t) => t.role === role);
      if (roleMatches.length > 0) pool = roleMatches;
    }
    return drawNextTrackFromDeck(`${selection}_${role || 'all'}`, pool, storage);
  }

  return null;
}

export const LOBBY_FADE_IN_DURATION_MS = 3200;
export const DEFAULT_FADE_IN_DURATION_MS = 800;
export const LOBBY_CROSSFADE_DURATION_MS = 1200;
export const RACE_CROSSFADE_DURATION_MS = 2000;
export const GAME_CROSSFADE_DURATION_MS = 1800;

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
