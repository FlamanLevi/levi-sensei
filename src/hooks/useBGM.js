import { useState, useEffect, useRef } from 'react';

export const useBGM = (trackUrl, isPlaying = true) => {
  const [isUserMuted, setIsUserMuted] = useState(false);
  const audioRef = useRef(null);

  // 1. Initialize and Preload Audio
  useEffect(() => {
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
      audioRef.current.volume = 0.4;
    } catch (e) {
      console.warn("Could not set volume on this device:", e);
    }
    
    // Explicitly preload so it's ready when the game starts
    audioRef.current.preload = 'auto';

    return () => {
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
      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn("BGM Auto-play blocked:", e));
        }
      } catch (e) {
        console.warn("BGM Play threw an error:", e);
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isUserMuted, trackUrl]);

  const toggleMute = () => {
    setIsUserMuted(prev => !prev);
  };

  return { isMuted: isUserMuted, toggleMute };
};
