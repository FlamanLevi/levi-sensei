import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BgmRole,
  BGMTrackMeta,
  ResolvedBGMTrack,
  QuizHostBgmPhase,
  MARIO_BGM_TRACKS,
  WANGAN_BGM_TRACKS,
  ALL_BGM_TRACKS,
  BGM_CATEGORIES,
  DEFAULT_FADE_IN_DURATION_MS,
  GAME_CROSSFADE_DURATION_MS,
  LOBBY_FADE_IN_DURATION_MS,
  LOBBY_CROSSFADE_DURATION_MS,
  RACE_CROSSFADE_DURATION_MS,
  AUTO_ADVANCE_CROSSFADE_MS,
  DEFAULT_BGM_MASTER_VOLUME,
  drawNextTrackFromDeck,
  resolveBGMTrack,
  peekNextBGMTrack,
  getRoleTrackCount,
  resolveQuizHostBgmPhase,
  computeGradualFadeInVolume,
  computeCrossfadeVolumes,
  computeEffectiveBgmVolume,
  computeGrandPrix3DBgmRate,
  shouldAutoAdvanceAtTime,
  sanitizeTrackGain,
  getStoredBgmVolume,
  setStoredBgmVolume,
  subscribeBgmVolume,
} from './bgmHelpers';

export type { BgmRole, BGMTrackMeta, ResolvedBGMTrack, QuizHostBgmPhase };
export {
  MARIO_BGM_TRACKS,
  WANGAN_BGM_TRACKS,
  ALL_BGM_TRACKS,
  BGM_CATEGORIES,
  DEFAULT_FADE_IN_DURATION_MS,
  GAME_CROSSFADE_DURATION_MS,
  LOBBY_FADE_IN_DURATION_MS,
  LOBBY_CROSSFADE_DURATION_MS,
  RACE_CROSSFADE_DURATION_MS,
  AUTO_ADVANCE_CROSSFADE_MS,
  DEFAULT_BGM_MASTER_VOLUME,
  drawNextTrackFromDeck,
  resolveBGMTrack,
  peekNextBGMTrack,
  getRoleTrackCount,
  resolveQuizHostBgmPhase,
  computeGradualFadeInVolume,
  computeCrossfadeVolumes,
  computeEffectiveBgmVolume,
  computeGrandPrix3DBgmRate,
  shouldAutoAdvanceAtTime,
  sanitizeTrackGain,
  getStoredBgmVolume,
  setStoredBgmVolume,
  subscribeBgmVolume,
};

export interface UseBGMOptions {
  /** Activity phase role used to pick matching tracks ('lobby', 'quiz', 'rush', 'boss', 'podium'). */
  role?: BgmRole;
  /** Duration (ms) to gradually fade in when starting cold (no active outgoing track). */
  fadeInDurationMs?: number;
  /** Duration (ms) for overlapping crossfade when transitioning between playing tracks. */
  crossfadeDurationMs?: number;
  /** Optional upcoming phase role (e.g., 'rush' / 'quiz') to silently pre-warm while idling in Lobby. */
  preloadNextRole?: BgmRole;
}

type PrimaryFadeCurve = 'linear' | 'gradual-fade-in' | 'crossfade-in' | 'cos-fade-out';
type TargetVolumeMode = 'active' | 'zero';

interface OutgoingFadeEntry {
  audio: HTMLAudioElement;
  timerId: ReturnType<typeof setInterval>;
}

const FADE_TICK_MS = 25;
const PAUSE_FADE_OUT_MS = 320;
const MAX_CONCURRENT_OUTGOING_FADES = 2;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function stopAndReleaseAudio(audio: HTMLAudioElement | null | undefined): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
  } catch {
    // Ignore hardware audio release quirks on mobile Safari
  }
}

// Ensures two separate mounted components never accidentally stack orphaned BGM loops,
// while letting one active hook instance smoothly crossfade its own outgoing/incoming elements.
let activeGlobalHookStopper: (() => void) | null = null;

export const useBGM = (
  trackSelection?: string,
  isPlaying = true,
  _estimatedDurationSeconds = 0,
  options?: UseBGMOptions
) => {
  const role = options?.role;
  const preloadNextRole = options?.preloadNextRole;
  const fadeInDurationMs = options?.fadeInDurationMs ?? DEFAULT_FADE_IN_DURATION_MS;
  const crossfadeDurationMs = options?.crossfadeDurationMs ?? GAME_CROSSFADE_DURATION_MS;

  const [isUserMuted, setIsUserMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('levi_sensei_bgm_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [bgmVolume, setBgmVolumeState] = useState<number>(() => getStoredBgmVolume());
  useEffect(() => {
    return subscribeBgmVolume(setBgmVolumeState);
  }, []);

  const setBgmVolume = useCallback((vol: number) => {
    setStoredBgmVolume(vol);
  }, []);

  const [resolvedTrack, setResolvedTrack] = useState<ResolvedBGMTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prewarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const prewarmUrlRef = useRef<string | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outgoingFadesRef = useRef<OutgoingFadeEntry[]>([]);
  const trackFadeHintRef = useRef<'fade-in' | 'crossfade'>('fade-in');
  const nextCrossfadeOverrideRef = useRef<number | null>(null);
  const activeCrossfadeMsRef = useRef<number>(crossfadeDurationMs);
  const trackGenerationRef = useRef<number>(0);
  const retryInteractionCleanupRef = useRef<(() => void) | null>(null);

  const [isDucked, setIsDucked] = useState<boolean>(false);
  const isDuckedRef = useRef<boolean>(false);
  isDuckedRef.current = isDucked;

  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const playbackRateRef = useRef<number>(1.0);
  playbackRateRef.current = playbackRate;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const isUserMutedRef = useRef<boolean>(isUserMuted);
  isUserMutedRef.current = isUserMuted;
  const bgmVolumeRef = useRef<number>(bgmVolume);
  bgmVolumeRef.current = bgmVolume;
  const resolvedTrackGainRef = useRef<number>(sanitizeTrackGain(resolvedTrack?.gain));
  resolvedTrackGainRef.current = sanitizeTrackGain(resolvedTrack?.gain);

  const fadeInDurationRef = useRef<number>(fadeInDurationMs);
  fadeInDurationRef.current = fadeInDurationMs;
  const crossfadeDurationRef = useRef<number>(crossfadeDurationMs);
  crossfadeDurationRef.current = crossfadeDurationMs;

  const isSingleTrackPool = getRoleTrackCount(trackSelection, role) <= 1;
  const isSingleTrackPoolRef = useRef<boolean>(isSingleTrackPool);
  isSingleTrackPoolRef.current = isSingleTrackPool;

  const getLiveTargetVolume = useCallback((mode: TargetVolumeMode): number => {
    if (mode === 'zero') return 0;
    return computeEffectiveBgmVolume({
      masterVolume: bgmVolumeRef.current,
      trackGain: resolvedTrackGainRef.current,
      isDucked: isDuckedRef.current,
      isMuted: isUserMutedRef.current,
    });
  }, []);

  // Reset speed-up pitch whenever returning to Lobby
  useEffect(() => {
    if (role === 'lobby') {
      setPlaybackRate(1.0);
    }
  }, [role]);

  // Draw or re-draw track respecting active role
  const advanceToNextTrack = useCallback(() => {
    if (!trackSelection || trackSelection === 'none') {
      setResolvedTrack(null);
      return;
    }
    const next = resolveBGMTrack(trackSelection, role);
    setResolvedTrack(next);
  }, [trackSelection, role]);

  const advanceToNextTrackRef = useRef(advanceToNextTrack);
  advanceToNextTrackRef.current = advanceToNextTrack;

  // Resolve track when selection or role changes
  useEffect(() => {
    advanceToNextTrack();
  }, [advanceToNextTrack]);

  const clearAutoplayRetry = useCallback(() => {
    if (retryInteractionCleanupRef.current) {
      retryInteractionCleanupRef.current();
      retryInteractionCleanupRef.current = null;
    }
  }, []);

  const clearPrimaryVolumeRamp = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
  }, []);

  const clearAllOutgoingFades = useCallback(() => {
    const entries = outgoingFadesRef.current;
    if (entries.length === 0) return;
    outgoingFadesRef.current = [];
    for (const entry of entries) {
      clearInterval(entry.timerId);
      stopAndReleaseAudio(entry.audio);
    }
  }, []);

  const stopAllInstanceAudio = useCallback(() => {
    trackGenerationRef.current += 1;
    clearAutoplayRetry();
    clearPrimaryVolumeRamp();
    clearAllOutgoingFades();
    if (audioRef.current) {
      stopAndReleaseAudio(audioRef.current);
      audioRef.current = null;
    }
    if (prewarmAudioRef.current) {
      stopAndReleaseAudio(prewarmAudioRef.current);
      prewarmAudioRef.current = null;
      prewarmUrlRef.current = null;
    }
  }, [clearAutoplayRetry, clearPrimaryVolumeRamp, clearAllOutgoingFades]);

  const stopAllInstanceAudioRef = useRef(stopAllInstanceAudio);
  stopAllInstanceAudioRef.current = stopAllInstanceAudio;

  // Timestamped smooth primary volume animator honoring live Master Volume & track LUFS gain
  const rampPrimaryVolumeTo = useCallback(
    (
      targetMode: TargetVolumeMode,
      durationMs = 300,
      curve: PrimaryFadeCurve = 'linear',
      onComplete?: () => void
    ) => {
      const audio = audioRef.current;
      if (!audio) return;

      clearPrimaryVolumeRamp();

      const initialTarget = clamp01(getLiveTargetVolume(targetMode));
      const startVol = clamp01(audio.volume);

      if (durationMs <= 0 || Math.abs(initialTarget - startVol) < 0.004) {
        try {
          audio.volume = initialTarget;
        } catch {}
        onComplete?.();
        return;
      }

      const startedAt = performance.now();
      volumeIntervalRef.current = setInterval(() => {
        const currentAudio = audioRef.current;
        if (!currentAudio || currentAudio !== audio) {
          clearPrimaryVolumeRamp();
          return;
        }

        const clampedTarget = clamp01(getLiveTargetVolume(targetMode));
        const diff = clampedTarget - startVol;
        const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
        let nextVol: number;

        if (curve === 'gradual-fade-in') {
          nextVol =
            startVol <= 0.004
              ? computeGradualFadeInVolume(progress, clampedTarget)
              : clamp01(startVol + diff * Math.pow(progress, 1.75));
        } else if (curve === 'crossfade-in') {
          nextVol =
            startVol <= 0.004
              ? computeCrossfadeVolumes(progress, 0, clampedTarget).incomingVolume
              : clamp01(startVol + diff * Math.sin(progress * (Math.PI / 2)));
        } else if (curve === 'cos-fade-out') {
          nextVol = clamp01(
            startVol * Math.cos(progress * (Math.PI / 2)) +
              clampedTarget * (1 - Math.cos(progress * (Math.PI / 2)))
          );
        } else {
          nextVol = clamp01(startVol + diff * progress);
        }

        try {
          currentAudio.volume = nextVol;
        } catch {}

        if (progress >= 1) {
          clearPrimaryVolumeRamp();
          try {
            currentAudio.volume = clampedTarget;
          } catch {}
          onComplete?.();
        }
      }, FADE_TICK_MS);
    },
    [clearPrimaryVolumeRamp, getLiveTargetVolume]
  );

  // Fade out and dispose an outgoing track concurrently for true crossfades
  const fadeOutAndDispose = useCallback((outgoingAudio: HTMLAudioElement, durationMs: number) => {
    while (outgoingFadesRef.current.length >= MAX_CONCURRENT_OUTGOING_FADES) {
      const oldest = outgoingFadesRef.current.shift();
      if (oldest) {
        clearInterval(oldest.timerId);
        stopAndReleaseAudio(oldest.audio);
      }
    }

    const startVol = clamp01(outgoingAudio.volume);
    if (durationMs <= 0 || startVol <= 0.004 || outgoingAudio.paused) {
      stopAndReleaseAudio(outgoingAudio);
      return;
    }

    const startedAt = performance.now();
    const entry: OutgoingFadeEntry = {
      audio: outgoingAudio,
      timerId: setInterval(() => {
        const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
        const { outgoingVolume } = computeCrossfadeVolumes(progress, startVol, 0);
        try {
          outgoingAudio.volume = outgoingVolume;
        } catch {}

        if (progress >= 1) {
          clearInterval(entry.timerId);
          outgoingFadesRef.current = outgoingFadesRef.current.filter((item) => item !== entry);
          stopAndReleaseAudio(outgoingAudio);
        }
      }, FADE_TICK_MS),
    };

    outgoingFadesRef.current.push(entry);
  }, []);

  // Retry autoplay on first user gesture if async room creation exceeded activation window
  const scheduleAutoplayRetry = useCallback(
    (
      audio: HTMLAudioElement,
      expectedGen: number,
      fadeMs: number,
      curve: PrimaryFadeCurve
    ) => {
      clearAutoplayRetry();
      if (typeof window === 'undefined') return;

      const handleUnlock = () => {
        clearAutoplayRetry();
        if (
          expectedGen !== trackGenerationRef.current ||
          audioRef.current !== audio ||
          !isPlayingRef.current ||
          isUserMutedRef.current
        ) {
          return;
        }
        try {
          const retryPromise = audio.play();
          const beginRamp = () => {
            if (
              expectedGen !== trackGenerationRef.current ||
              audioRef.current !== audio ||
              !isPlayingRef.current ||
              isUserMutedRef.current
            ) {
              return;
            }
            rampPrimaryVolumeTo('active', fadeMs, curve);
          };
          if (retryPromise !== undefined) {
            retryPromise.then(beginRamp).catch(() => {});
          } else {
            beginRamp();
          }
        } catch {
          // Ignore unlock failure
        }
      };

      const opts: AddEventListenerOptions = { capture: true, passive: true };
      window.addEventListener('pointerdown', handleUnlock, opts);
      window.addEventListener('touchstart', handleUnlock, opts);
      window.addEventListener('keydown', handleUnlock, { capture: true });

      retryInteractionCleanupRef.current = () => {
        window.removeEventListener('pointerdown', handleUnlock, opts);
        window.removeEventListener('touchstart', handleUnlock, opts);
        window.removeEventListener('keydown', handleUnlock, { capture: true });
      };
    },
    [clearAutoplayRetry, rampPrimaryVolumeTo]
  );

  // Unmount cleanup (separated so track swaps can crossfade cleanly without pausing outgoing track in effect cleanup)
  useEffect(() => {
    const stopper = () => stopAllInstanceAudioRef.current();
    return () => {
      stopper();
      if (activeGlobalHookStopper === stopper) {
        activeGlobalHookStopper = null;
      }
    };
  }, []);

  // 1. Initialize New Track, Wire Auto-Advance Listeners & Crossfade Between Playing Tracks
  useEffect(() => {
    trackGenerationRef.current += 1;
    clearAutoplayRetry();
    clearPrimaryVolumeRamp();

    const prevAudio = audioRef.current;

    if (!resolvedTrack) {
      audioRef.current = null;
      stopAndReleaseAudio(prevAudio);
      clearAllOutgoingFades();
      return;
    }

    const thisStopper = () => stopAllInstanceAudioRef.current();
    if (activeGlobalHookStopper && activeGlobalHookStopper !== thisStopper) {
      try {
        activeGlobalHookStopper();
      } catch {}
    }
    activeGlobalHookStopper = thisStopper;

    const overrideCrossfadeMs = nextCrossfadeOverrideRef.current;
    nextCrossfadeOverrideRef.current = null;
    const crossfadeMs = overrideCrossfadeMs ?? crossfadeDurationRef.current;
    activeCrossfadeMsRef.current = crossfadeMs;

    const canCrossfadeFromPrev =
      Boolean(prevAudio) &&
      isPlayingRef.current &&
      !isUserMutedRef.current &&
      !prevAudio!.paused &&
      prevAudio!.volume > 0.008;

    if (canCrossfadeFromPrev && prevAudio) {
      trackFadeHintRef.current = 'crossfade';
      fadeOutAndDispose(prevAudio, crossfadeMs);
    } else {
      trackFadeHintRef.current = 'fade-in';
      stopAndReleaseAudio(prevAudio);
    }

    const trackUrl = `/media/bgm/${resolvedTrack.file}`;
    const audio = new Audio(trackUrl);
    const singleTrackPool = isSingleTrackPoolRef.current;
    audio.loop = singleTrackPool;
    audio.preload = 'auto';

    try {
      audio.volume = 0; // Start at silence for smooth fade-in or crossfade-in
    } catch (e) {
      console.warn('Could not set volume on this device:', e);
    }

    try {
      audio.playbackRate = playbackRateRef.current;
      if ('preservesPitch' in audio) {
        (audio as unknown as { preservesPitch: boolean }).preservesPitch = false;
      }
    } catch {
      // Ignore playbackRate errors on unsupported devices
    }

    let autoAdvanced = false;
    const triggerAutoAdvance = () => {
      if (
        autoAdvanced ||
        isSingleTrackPoolRef.current ||
        audioRef.current !== audio ||
        !isPlayingRef.current ||
        isUserMutedRef.current
      ) {
        return;
      }
      autoAdvanced = true;
      nextCrossfadeOverrideRef.current = AUTO_ADVANCE_CROSSFADE_MS;
      advanceToNextTrackRef.current();
    };

    const handleTimeUpdate = () => {
      if (
        shouldAutoAdvanceAtTime(
          audio.currentTime,
          audio.duration,
          isSingleTrackPoolRef.current
        )
      ) {
        triggerAutoAdvance();
      }
    };

    const handleEnded = () => {
      if (isSingleTrackPoolRef.current) return;
      triggerAutoAdvance();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    audio.currentTime = 0;
    audioRef.current = audio;

    // Detach end/timeupdate listeners only (do NOT stop audio so outgoing crossfades keep running smoothly)
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [
    resolvedTrack?.file,
    clearAutoplayRetry,
    clearPrimaryVolumeRamp,
    clearAllOutgoingFades,
    fadeOutAndDispose,
  ]);

  // 2. Handle Play / Pause / Mute / Gradual Fade-In / Crossfade-In
  useEffect(() => {
    clearAutoplayRetry();
    const audio = audioRef.current;
    if (!audio) return;

    const myGen = trackGenerationRef.current;

    if (isPlaying && !isUserMuted) {
      const fadeMode = trackFadeHintRef.current;
      trackFadeHintRef.current = 'fade-in';

      const durationMs =
        fadeMode === 'crossfade' ? activeCrossfadeMsRef.current : fadeInDurationRef.current;
      const curve: PrimaryFadeCurve =
        fadeMode === 'crossfade' ? 'crossfade-in' : 'gradual-fade-in';

      // If audio is already actively playing (e.g., resuming from brief pause-fade), ramp directly
      if (!audio.paused) {
        rampPrimaryVolumeTo('active', durationMs, curve);
        return;
      }

      const startRampOnPlayback = () => {
        if (
          myGen !== trackGenerationRef.current ||
          audioRef.current !== audio ||
          !isPlayingRef.current ||
          isUserMutedRef.current
        ) {
          return;
        }
        rampPrimaryVolumeTo('active', durationMs, curve);
      };

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(startRampOnPlayback)
            .catch((e) => {
              console.warn('BGM Auto-play waiting for user interaction:', e);
              scheduleAutoplayRetry(audio, myGen, durationMs, curve);
            });
        } else {
          startRampOnPlayback();
        }
      } catch (e) {
        console.warn('BGM play threw error:', e);
        scheduleAutoplayRetry(audio, myGen, durationMs, curve);
      }
    } else {
      clearAllOutgoingFades();

      if (isUserMuted) {
        // Explicit mute should respond immediately
        clearPrimaryVolumeRamp();
        try {
          audio.volume = 0;
          audio.pause();
        } catch {}
      } else if (!audio.paused && audio.volume > 0.01) {
        // Phase transition stop (e.g., Game Over or Edit Settings): gentle fade-out before pause
        rampPrimaryVolumeTo('zero', PAUSE_FADE_OUT_MS, 'cos-fade-out', () => {
          if (audioRef.current === audio && !isPlayingRef.current) {
            try {
              audio.pause();
            } catch {}
          }
        });
      } else {
        clearPrimaryVolumeRamp();
        try {
          audio.pause();
        } catch {}
      }
    }
  }, [
    isPlaying,
    isUserMuted,
    resolvedTrack?.file,
    clearAutoplayRetry,
    clearAllOutgoingFades,
    clearPrimaryVolumeRamp,
    rampPrimaryVolumeTo,
    scheduleAutoplayRetry,
  ]);

  // Keep native loop property synced if track selection/role changes while same audio element plays
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.loop = isSingleTrackPool;
    }
  }, [isSingleTrackPool]);

  // Apply live Master BGM Volume slider adjustments immediately when steady (mid-fade ticks already read live target!)
  const prevBgmVolumeRef = useRef<number>(bgmVolume);
  useEffect(() => {
    if (prevBgmVolumeRef.current === bgmVolume) return;
    prevBgmVolumeRef.current = bgmVolume;

    const audio = audioRef.current;
    if (!audio || audio.paused || !isPlayingRef.current || isUserMutedRef.current) return;
    if (volumeIntervalRef.current) return;

    try {
      audio.volume = getLiveTargetVolume('active');
    } catch {}
  }, [bgmVolume, getLiveTargetVolume]);

  // 3. Pre-warm upcoming phase track (e.g., 'rush' or 'quiz') silently while sitting in Lobby
  useEffect(() => {
    if (
      !isPlaying ||
      isUserMuted ||
      !trackSelection ||
      trackSelection === 'none' ||
      !preloadNextRole ||
      preloadNextRole === role
    ) {
      if (prewarmAudioRef.current) {
        stopAndReleaseAudio(prewarmAudioRef.current);
        prewarmAudioRef.current = null;
        prewarmUrlRef.current = null;
      }
      return;
    }

    const timerId = setTimeout(() => {
      if (!isPlayingRef.current || isUserMutedRef.current) return;
      const upcoming = peekNextBGMTrack(trackSelection, preloadNextRole, undefined, {
        primeIfEmpty: true,
      });
      if (!upcoming || upcoming.file === resolvedTrack?.file) return;

      const nextUrl = `/media/bgm/${upcoming.file}`;
      if (prewarmUrlRef.current === nextUrl && prewarmAudioRef.current) return;

      if (prewarmAudioRef.current) {
        stopAndReleaseAudio(prewarmAudioRef.current);
        prewarmAudioRef.current = null;
      }

      try {
        const prewarm = new Audio();
        prewarm.preload = 'auto';
        prewarm.muted = true;
        prewarm.src = nextUrl;
        prewarm.load();
        prewarmAudioRef.current = prewarm;
        prewarmUrlRef.current = nextUrl;
      } catch {
        prewarmUrlRef.current = null;
      }
    }, 1200);

    return () => {
      clearTimeout(timerId);
    };
  }, [isPlaying, isUserMuted, trackSelection, role, preloadNextRole, resolvedTrack?.file]);

  // Apply dynamic playbackRate (e.g. 1.25x speed up during Final Sprint grace period!)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.playbackRate = playbackRate;
      if ('preservesPitch' in audio) {
        (audio as unknown as { preservesPitch: boolean }).preservesPitch = false;
      }
    } catch (e) {
      console.warn('Could not set audio playbackRate:', e);
    }
  }, [playbackRate, resolvedTrack?.file]);

  // Dynamic BGM Ducking (smoothly dims volume for native speech prompts)
  const duckBGM = useCallback(
    (duck: boolean) => {
      setIsDucked(duck);
      isDuckedRef.current = duck;
      const audio = audioRef.current;
      if (!audio || !isPlayingRef.current || isUserMutedRef.current) return;

      const duration = duck ? 200 : 350;
      rampPrimaryVolumeTo('active', duration, 'linear');
    },
    [rampPrimaryVolumeTo]
  );

  // High-Energy Speed Up during Final Sprint Grace Period (classic Mario Kart rush!)
  const speedUpBGM = useCallback((speedUp: boolean) => {
    setPlaybackRate(speedUp ? 1.25 : 1.0);
  }, []);

  // Granular playbackRate setter for incremental speed up as racers finish
  const setBgmPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.75, Math.min(1.5, rate));
    setPlaybackRate(clamped);
  }, []);

  const toggleMute = useCallback(() => {
    setIsUserMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('levi_sensei_bgm_muted', String(next));
      } catch {}
      return next;
    });
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsUserMuted(muted);
    try {
      localStorage.setItem('levi_sensei_bgm_muted', String(muted));
    } catch {}
  }, []);

  return {
    isMuted: isUserMuted,
    toggleMute,
    setMuted,
    bgmVolume,
    setBgmVolume,
    duckBGM,
    speedUpBGM,
    setBgmPlaybackRate,
    playbackRate,
    isDucked,
    currentTrackTitle: resolvedTrack?.title || null,
    currentTrackRole: resolvedTrack?.role || role || null,
    hasTrack: Boolean(resolvedTrack),
    nextTrack: advanceToNextTrack,
  };
};
