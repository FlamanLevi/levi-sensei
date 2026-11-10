import { useState, useEffect, useRef, useCallback } from 'react';
import { SOUND_PACKS, getSoundPack, SoundTrack } from '@/utils/soundPacks';

export interface BGMTrackMeta {
  id: string;
  file: string;
  title: string;
  series: string;
}

export const MARIO_BGM_TRACKS: BGMTrackMeta[] = [
  { id: 'mariokart', file: 'mario/mariokart.mp3', title: 'Mario Kart 🏁', series: 'mario' },
  { id: 'newsupermariobros2', file: 'mario/newsupermariobros2.mp3', title: 'NSMB 2 🍄', series: 'mario' },
  { id: 'newsupermariobroswii', file: 'mario/newsupermariobroswii.mp3', title: 'NSMB Wii ⭐', series: 'mario' },
  { id: 'supermarioworld', file: 'mario/supermarioworld.mp3', title: 'Super Mario World 🦖', series: 'mario' },
  { id: 'warioland', file: 'mario/warioland.mp3', title: 'Wario Land 💰', series: 'mario' }
];

export const WANGAN_BGM_TRACKS: BGMTrackMeta[] = [
  { id: 'wanganmidnight1', file: 'wangan/wanganmidnight1.mp3', title: 'Wangan Tune 1 🏎️', series: 'wangan' },
  { id: 'wanganmidnight2', file: 'wangan/wanganmidnight2.mp3', title: 'Wangan Tune 2 ⚡', series: 'wangan' },
  { id: 'wanganmidnight3', file: 'wangan/wanganmidnight3.mp3', title: 'Wangan Tune 3 🌌', series: 'wangan' },
  { id: 'wanganmidnight4', file: 'wangan/wanganmidnight4.mp3', title: 'Wangan Tune 4 🏁', series: 'wangan' },
  { id: 'wanganmidnight5', file: 'wangan/wanganmidnight5.mp3', title: 'Wangan Tune 5 💥', series: 'wangan' }
];

export const ALL_BGM_TRACKS: BGMTrackMeta[] = [
  ...MARIO_BGM_TRACKS,
  ...WANGAN_BGM_TRACKS,
  ...SOUND_PACKS.all_stars.tracks.map(t => ({
    id: t.id,
    file: t.url.startsWith('/') ? t.url.replace(/^\/media\/bgm\//, '') : t.url,
    title: t.title,
    series: t.id.split('_')[0]
  }))
];

/**
 * Registry of BGM categories.
 */
export const BGM_CATEGORIES: Record<string, BGMTrackMeta[]> = {
  random_all: ALL_BGM_TRACKS,
  random_mario: MARIO_BGM_TRACKS,
  random_wangan: WANGAN_BGM_TRACKS,
  all_stars: ALL_BGM_TRACKS
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

/**
 * Draws the next track from a persistent, indeterminate-length shuffle bag.
 * - Stores state in localStorage so it survives tab closures & iPad reboots.
 * - Works with any number of tracks (3, 5, 8, 20+).
 * - Auto-reconciles if new tracks are added to or removed from the catalog.
 * - Guarantees the same track is never dealt consecutively when the deck resets.
 */
export function drawNextTrackFromDeck(categoryKey: string, trackPool: BGMTrackMeta[]): { file: string; title: string; id: string } | null {
  if (!trackPool || trackPool.length === 0) return null;
  if (trackPool.length === 1) {
    return { file: trackPool[0].file, title: trackPool[0].title, id: trackPool[0].id };
  }

  const validIds = trackPool.map(t => t.id);
  const storageKey = `${DECK_STORAGE_PREFIX}${categoryKey}`;
  let state: SavedDeckState = {
    remainingIds: [],
    lastPlayedId: null,
    lastPlayedAt: 0
  };

  try {
    const raw = localStorage.getItem(storageKey);
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
  let remaining = state.remainingIds.filter(id => validIds.includes(id));

  // If new tracks were added to the code that aren't in remaining and weren't last played, fold them in
  const missingNewIds = validIds.filter(id => !remaining.includes(id) && id !== state.lastPlayedId);
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
  const pickedTrack = trackPool.find(t => t.id === pickedId) || trackPool[0];

  // 4. Persist updated deck state
  try {
    const updatedState: SavedDeckState = {
      remainingIds: remaining,
      lastPlayedId: pickedTrack.id,
      lastPlayedAt: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(updatedState));
  } catch {}

  return { file: pickedTrack.file, title: pickedTrack.title, id: pickedTrack.id };
}

export function resolveBGMTrack(selection?: string, role?: string): { file: string; title: string; id?: string } | null {
  if (!selection || selection === 'none') {
    return null;
  }

  // 1. Resolve from Sound Packs Registry (all_stars, initial_d, persona_5, wangan, dragon, mario)
  const pack = getSoundPack(selection);
  if (pack && pack.id !== 'none' && pack.tracks.length > 0) {
    let pool = pack.tracks;
    if (role) {
      const roleMatches = pack.tracks.filter(t => t.role === role);
      if (roleMatches.length > 0) pool = roleMatches;
    }
    const trackPool: BGMTrackMeta[] = pool.map(t => ({
      id: t.id,
      file: t.url.startsWith('/') ? t.url.replace(/^\/media\/bgm\//, '') : t.url,
      title: t.title,
      series: pack.id
    }));
    return drawNextTrackFromDeck(`${selection}_${role || 'all'}`, trackPool);
  }

  // 2. Legacy category shuffle bags (random_all, random_mario, random_wangan)
  if (BGM_CATEGORIES[selection]) {
    return drawNextTrackFromDeck(selection, BGM_CATEGORIES[selection]);
  }

  // 3. Direct track selection by id or filename (supports both 'mario/mariokart.mp3' and 'mariokart.mp3')
  const direct = ALL_BGM_TRACKS.find(t => 
    t.id === selection || 
    t.file === selection || 
    t.file.endsWith('/' + selection)
  );
  if (direct) {
    return { file: direct.file, title: direct.title, id: direct.id };
  }

  if (selection.endsWith('.mp3')) {
    // If a raw mp3 is passed without folder, check if it lives in any known category
    const known = ALL_BGM_TRACKS.find(t => t.file.endsWith('/' + selection));
    const filePath = known ? known.file : selection;
    return { file: filePath, title: selection, id: selection };
  }

  return null;
}

export const useBGM = (
  trackSelection?: string,
  isPlaying = true,
  _estimatedDurationSeconds = 0
) => {
  const [isUserMuted, setIsUserMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('levi_sensei_bgm_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [resolvedTrack, setResolvedTrack] = useState<{ file: string; title: string; id?: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isDucked, setIsDucked] = useState<boolean>(false);
  const isDuckedRef = useRef<boolean>(false);
  isDuckedRef.current = isDucked;

  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const playbackRateRef = useRef<number>(1.0);
  playbackRateRef.current = playbackRate;

  const NORMAL_VOLUME = 0.35;
  const DUCKED_VOLUME = 0.05;

  // Draw or re-draw track
  const advanceToNextTrack = useCallback(() => {
    if (!trackSelection || trackSelection === 'none') {
      setResolvedTrack(null);
      return;
    }
    const next = resolveBGMTrack(trackSelection);
    setResolvedTrack(next);
  }, [trackSelection]);

  // Resolve track when trackSelection changes
  useEffect(() => {
    advanceToNextTrack();
  }, [advanceToNextTrack]);

  // Unified smooth volume ramp helper (clears any competing volume animations)
  const rampVolumeTo = useCallback((targetVol: number, durationMs = 300) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    const startVol = audio.volume;
    const diff = targetVol - startVol;
    if (Math.abs(diff) < 0.01) {
      audio.volume = targetVol;
      return;
    }

    const steps = 12;
    const intervalTime = Math.max(16, Math.floor(durationMs / steps));
    let stepCount = 0;

    volumeIntervalRef.current = setInterval(() => {
      if (!audioRef.current) {
        if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
        return;
      }
      stepCount++;
      const progress = Math.min(1, stepCount / steps);
      const nextVol = startVol + diff * progress;
      audioRef.current.volume = Math.max(0, Math.min(1, nextVol));

      if (progress >= 1) {
        if (volumeIntervalRef.current) {
          clearInterval(volumeIntervalRef.current);
          volumeIntervalRef.current = null;
        }
      }
    }, intervalTime);
  }, []);

  // 1. Initialize and Preload Audio (Starts cleanly from 0:00)
  useEffect(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    if (!resolvedTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      return;
    }

    const trackUrl = `/media/bgm/${resolvedTrack.file}`;
    const audio = new Audio(trackUrl);
    audio.loop = true;
    audio.preload = 'metadata';

    try {
      audio.volume = 0; // Start at 0 for smooth fade-in
    } catch (e) {
      console.warn('Could not set volume on this device:', e);
    }

    // Audio always starts at 0:00 for iconic game intros
    audio.currentTime = 0;
    audioRef.current = audio;

    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [resolvedTrack?.file]);

  // 2. Handle Play / Pause / Volume Transitions
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && !isUserMuted) {
      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.warn('BGM Auto-play waiting for user interaction:', e);
          });
        }

        // Smooth fade-in over 800ms to target volume
        const targetVol = isDuckedRef.current ? DUCKED_VOLUME : NORMAL_VOLUME;
        rampVolumeTo(targetVol, 800);
      } catch (e) {
        console.warn('BGM play threw error:', e);
      }
    } else {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      try {
        audio.pause();
      } catch {}
    }
  }, [isPlaying, isUserMuted, resolvedTrack, rampVolumeTo]);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isUserMutedRef = useRef(isUserMuted);
  isUserMutedRef.current = isUserMuted;

  // Apply dynamic playbackRate (e.g. 1.18x speed up during Final Sprint grace period!)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.playbackRate = playbackRate;
      if ('preservesPitch' in audio) {
        (audio as any).preservesPitch = false;
      }
    } catch (e) {
      console.warn('Could not set audio playbackRate:', e);
    }
  }, [playbackRate]);

  // Dynamic BGM Ducking (smoothly dims volume for native speech prompts)
  const duckBGM = useCallback((duck: boolean) => {
    setIsDucked(duck);
    isDuckedRef.current = duck;
    const audio = audioRef.current;
    if (!audio || !isPlayingRef.current || isUserMutedRef.current) return;

    const targetVolume = duck ? DUCKED_VOLUME : NORMAL_VOLUME;
    const duration = duck ? 200 : 350;
    rampVolumeTo(targetVolume, duration);
  }, [rampVolumeTo]);

  // High-Energy Speed Up during Final Sprint Grace Period (classic Mario Kart rush!)
  const speedUpBGM = useCallback((speedUp: boolean) => {
    setPlaybackRate(speedUp ? 1.25 : 1.0);
  }, []);

  // Granular playbackRate setter for incremental speed up as racers finish
  const setBgmPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.75, Math.min(1.5, rate));
    setPlaybackRate(clamped);
  }, []);

  const toggleMute = () => {
    setIsUserMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem('levi_sensei_bgm_muted', String(next));
      } catch {}
      return next;
    });
  };

  const setMuted = (muted: boolean) => {
    setIsUserMuted(muted);
    try {
      localStorage.setItem('levi_sensei_bgm_muted', String(muted));
    } catch {}
  };

  return {
    isMuted: isUserMuted,
    toggleMute,
    setMuted,
    duckBGM,
    speedUpBGM,
    setBgmPlaybackRate,
    playbackRate,
    isDucked,
    currentTrackTitle: resolvedTrack?.title || null,
    hasTrack: !!resolvedTrack,
    nextTrack: advanceToNextTrack
  };
};
