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
  drawNextTrackFromDeck,
  resolveBGMTrack,
  resolveQuizHostBgmPhase,
  computeGradualFadeInVolume,
  computeCrossfadeVolumes,
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
  drawNextTrackFromDeck,
  resolveBGMTrack,
  resolveQuizHostBgmPhase,
  computeGradualFadeInVolume,
  computeCrossfadeVolumes,
};

export interface UseBGMOptions {
  /** Activity phase role used to pick matching tracks ('lobby', 'quiz', 'rush', 'boss', 'podium'). */
  role?: BgmRole;
  /** Duration (ms) to gradually fade in when starting cold (no active outgoing track). */
  fadeInDurationMs?: number;
  /** Duration (ms) for overlapping crossfade when transitioning between playing tracks. */
  crossfadeDurationMs?: number;
}

type PrimaryFadeCurve = 'linear' | 'gradual-fade-in' | 'crossfade-in' | 'cos-fade-out';

interface OutgoingFadeEntry {
  audio: HTMLAudioElement;
  timerId: ReturnType<typeof setInterval>;
}

const NORMAL_VOLUME = 0.35;
const DUCKED_VOLUME = 0.05;
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
  const fadeInDurationMs = options?.fadeInDurationMs ?? DEFAULT_FADE_IN_DURATION_MS;
  const crossfadeDurationMs = options?.crossfadeDurationMs ?? GAME_CROSSFADE_DURATION_MS;

  const [isUserMuted, setIsUserMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('levi_sensei_bgm_muted') === 'true';
    } catch {
      return false;
    }
  });

  const [resolvedTrack, setResolvedTrack] = useState<ResolvedBGMTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outgoingFadesRef = useRef<OutgoingFadeEntry[]>([]);
  const trackFadeHintRef = useRef<'fade-in' | 'crossfade'>('fade-in');
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

  const fadeInDurationRef = useRef<number>(fadeInDurationMs);
  fadeInDurationRef.current = fadeInDurationMs;
  const crossfadeDurationRef = useRef<number>(crossfadeDurationMs);
  crossfadeDurationRef.current = crossfadeDurationMs;

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
  }, [clearAutoplayRetry, clearPrimaryVolumeRamp, clearAllOutgoingFades]);

  const stopAllInstanceAudioRef = useRef(stopAllInstanceAudio);
  stopAllInstanceAudioRef.current = stopAllInstanceAudio;

  // Timestamped smooth primary volume animator
  const rampPrimaryVolumeTo = useCallback(
    (
      targetVol: number,
      durationMs = 300,
      curve: PrimaryFadeCurve = 'linear',
      onComplete?: () => void
    ) => {
      const audio = audioRef.current;
      if (!audio) return;

      clearPrimaryVolumeRamp();

      const clampedTarget = clamp01(targetVol);
      const startVol = clamp01(audio.volume);
      const diff = clampedTarget - startVol;

      if (durationMs <= 0 || Math.abs(diff) < 0.004) {
        try {
          audio.volume = clampedTarget;
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

        const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
        let nextVol: number;

        if (curve === 'gradual-fade-in') {
          nextVol = startVol <= 0.004
            ? computeGradualFadeInVolume(progress, clampedTarget)
            : clamp01(startVol + diff * Math.pow(progress, 1.75));
        } else if (curve === 'crossfade-in') {
          nextVol = startVol <= 0.004
            ? computeCrossfadeVolumes(progress, 0, clampedTarget).incomingVolume
            : clamp01(startVol + diff * Math.sin(progress * (Math.PI / 2)));
        } else if (curve === 'cos-fade-out') {
          nextVol = clamp01(startVol * Math.cos(progress * (Math.PI / 2)) + clampedTarget * (1 - Math.cos(progress * (Math.PI / 2))));
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
    [clearPrimaryVolumeRamp]
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
            const targetVol = isDuckedRef.current ? DUCKED_VOLUME : NORMAL_VOLUME;
            rampPrimaryVolumeTo(targetVol, fadeMs, curve);
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

  // 1. Initialize New Track & Trigger Crossfade when Swapping Between Playing Tracks
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

    const canCrossfadeFromPrev =
      Boolean(prevAudio) &&
      isPlayingRef.current &&
      !isUserMutedRef.current &&
      !prevAudio!.paused &&
      prevAudio!.volume > 0.008;

    if (canCrossfadeFromPrev && prevAudio) {
      trackFadeHintRef.current = 'crossfade';
      fadeOutAndDispose(prevAudio, crossfadeDurationRef.current);
    } else {
      trackFadeHintRef.current = 'fade-in';
      stopAndReleaseAudio(prevAudio);
    }

    const trackUrl = `/media/bgm/${resolvedTrack.file}`;
    const audio = new Audio(trackUrl);
    audio.loop = true;
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

    audio.currentTime = 0;
    audioRef.current = audio;
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
        fadeMode === 'crossfade' ? crossfadeDurationRef.current : fadeInDurationRef.current;
      const curve: PrimaryFadeCurve =
        fadeMode === 'crossfade' ? 'crossfade-in' : 'gradual-fade-in';
      const targetVol = isDuckedRef.current ? DUCKED_VOLUME : NORMAL_VOLUME;

      // If audio is already actively playing (e.g., resuming from brief pause-fade), ramp directly
      if (!audio.paused) {
        rampPrimaryVolumeTo(targetVol, durationMs, curve);
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
        const liveTarget = isDuckedRef.current ? DUCKED_VOLUME : NORMAL_VOLUME;
        rampPrimaryVolumeTo(liveTarget, durationMs, curve);
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
        rampPrimaryVolumeTo(0, PAUSE_FADE_OUT_MS, 'cos-fade-out', () => {
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

      const targetVolume = duck ? DUCKED_VOLUME : NORMAL_VOLUME;
      const duration = duck ? 200 : 350;
      rampPrimaryVolumeTo(targetVolume, duration, 'linear');
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
