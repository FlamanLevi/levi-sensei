import { useState, useEffect, useRef } from 'react';

export const useBGM = (trackUrl, isPlaying = true, estimatedDurationSeconds = 0) => {
  const [isUserMuted, setIsUserMuted] = useState(false);
  const audioRef = useRef(null);
  const hasRandomizedStart = useRef(false);
  const fadeIntervalRef = useRef(null);
  const TARGET_VOLUME = 0.4;

  // 1. Initialize and Preload Audio
  useEffect(() => {
    hasRandomizedStart.current = false;
    
    if (!trackUrl || trackUrl === 'none') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    audioRef.current = new Audio(import.meta.env.BASE_URL + trackUrl);
    audioRef.current.loop = true;
    try {
      audioRef.current.volume = 0; // Start at 0 for fade in
    } catch (e) {
      console.warn("Could not set volume on this device:", e);
    }
    
    // Explicitly preload so it's ready when the game starts
    audioRef.current.preload = 'auto';

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [trackUrl]);

  // 2. Handle Play/Pause State
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && !isUserMuted) {
      
      // Attempt to randomize the starting position once per track play
      if (!hasRandomizedStart.current && estimatedDurationSeconds > 0 && audioRef.current.duration) {
         hasRandomizedStart.current = true;
         if (audioRef.current.duration > estimatedDurationSeconds) {
            const maxStart = audioRef.current.duration - estimatedDurationSeconds;
            audioRef.current.currentTime = Math.random() * maxStart;
         } else if (audioRef.current.duration > 10) {
            // Even if the game is longer than the song, still pick a random spot to reduce staleness
            // It will just loop around naturally.
            audioRef.current.currentTime = Math.random() * (audioRef.current.duration - 10);
         }
      }

      try {
        audioRef.current.volume = 0; // Reset to 0 before playing
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn("BGM Auto-play blocked:", e));
        }
        
        // Smooth Fade In (2 seconds to reach 0.4)
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = setInterval(() => {
            if (audioRef.current) {
                let nextVol = audioRef.current.volume + 0.05;
                if (nextVol >= TARGET_VOLUME) {
                    audioRef.current.volume = TARGET_VOLUME;
                    clearInterval(fadeIntervalRef.current);
                } else {
                    audioRef.current.volume = nextVol;
                }
            } else {
                clearInterval(fadeIntervalRef.current);
            }
        }, 250);

      } catch (e) {
        console.warn("BGM Play threw an error:", e);
      }
    } else {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audioRef.current.pause();
    }
  }, [isPlaying, isUserMuted, trackUrl, estimatedDurationSeconds]);

  const toggleMute = () => {
    setIsUserMuted(prev => !prev);
  };

  return { isMuted: isUserMuted, toggleMute };
};
