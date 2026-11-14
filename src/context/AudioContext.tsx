import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { soundEffects } from '@/services/soundEffects';
import { speechService } from '@/services/speechService';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
  isQuietClassroomMode: boolean;
  setQuietClassroomMode: (quiet: boolean) => void;
  playPop: () => void;
  playSuccess: () => void;
  playBuzzer: () => void;
  playFanfare: () => void;
  playTick: () => void;
  playWordAudio: (soundFile?: string, fallbackText?: string) => Promise<void>;
  speakText: (text: string) => void;
  isPlayingWord: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isQuietClassroomMode, setIsQuietClassroomModeState] = useState(soundEffects.isQuietClassroomMode());
  const [isPlayingWord, setIsPlayingWord] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const setQuietClassroomMode = useCallback((quiet: boolean) => {
    setIsQuietClassroomModeState(quiet);
    soundEffects.setQuietClassroomMode(quiet);
  }, []);

  // Initialize Web Audio API and Web Speech API on first user interaction to bypass iOS Safari autoplay restrictions
  useEffect(() => {
    const unlockAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      // Unlock soundEffects Web Audio context
      try {
        soundEffects.playTick();
      } catch {}

      // Unlock HTMLAudioElement for iOS AirPlay media streaming
      if (!wordAudioRef.current) {
        try {
          const blessedAudio = new Audio();
          blessedAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          blessedAudio.volume = 0.01;
          blessedAudio.play().catch(() => {});
          wordAudioRef.current = blessedAudio;
        } catch {}
      }

      // Unlock Web Speech API on iOS Safari by synthesizing a silent zero-volume utterance synchronously within the user gesture
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const silentUtterance = new SpeechSynthesisUtterance('');
          silentUtterance.volume = 0;
          window.speechSynthesis.speak(silentUtterance);
        } catch {}
      }
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Sync soundEffects synthesizer with global mute and volume state
  useEffect(() => {
    soundEffects.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    soundEffects.setVolume(volume);
  }, [volume]);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Sound Synthesizers (Zero latency, built-in)
  const playPop = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const vol = volumeRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
    gain.gain.setValueAtTime(vol * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }, [getAudioCtx]);

  const playSuccess = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const vol = volumeRef.current;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }, [getAudioCtx]);

  const playBuzzer = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const vol = volumeRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.25);
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }, [getAudioCtx]);

  const playTick = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const vol = volumeRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(vol * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }, [getAudioCtx]);

  const playFanfare = useCallback(() => {
    if (isMutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const vol = volumeRef.current;
    const melody = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.50, d: 0.35 }
    ];
    let offset = 0;
    melody.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + offset;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, now);
      gain.gain.setValueAtTime(vol * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + n.d);
      offset += n.d * 0.9;
    });
  }, [getAudioCtx]);

  const speakSynthesis = useCallback((text: string) => {
    if (isMutedRef.current) return;
    setIsPlayingWord(true);
    speechService.speak(text, {
      volume: volumeRef.current,
      onStart: () => setIsPlayingWord(true),
      onEnd: () => setIsPlayingWord(false)
    });
  }, []);

  const speakText = useCallback((text: string) => {
    speakSynthesis(text);
  }, [speakSynthesis]);

  const playWordAudio = useCallback(async (soundFile?: string, fallbackText?: string): Promise<void> => {
    if (isMutedRef.current) return;

    const isAudioFile = soundFile && /\.(mp3|wav|m4a|ogg)$/i.test(soundFile.trim());

    if (isAudioFile) {
      try {
        setIsPlayingWord(true);
        let audioUrl = soundFile.trim();
        if (!audioUrl.startsWith('http')) {
          if (audioUrl.startsWith('/')) {
            // Already absolute
          } else if (audioUrl.startsWith('media/')) {
            audioUrl = `/${audioUrl}`;
          } else {
            audioUrl = `/media/sound/${audioUrl}`;
          }
        }

        let audio = wordAudioRef.current;
        if (!audio) {
          audio = new Audio();
          wordAudioRef.current = audio;
        }
        audio.pause();
        audio.src = audioUrl;
        audio.volume = 1.0;
        audio.onended = () => setIsPlayingWord(false);
        audio.onerror = () => {
          if (fallbackText) speakSynthesis(fallbackText);
          else setIsPlayingWord(false);
        };
        await audio.play().catch(() => {
          if (fallbackText) speakSynthesis(fallbackText);
          else setIsPlayingWord(false);
        });
        return;
      } catch {
        if (fallbackText) speakSynthesis(fallbackText);
        else setIsPlayingWord(false);
        return;
      }
    }

    if (fallbackText || soundFile) {
      speakSynthesis(fallbackText || soundFile || '');
    } else {
      setIsPlayingWord(false);
    }
  }, [speakSynthesis]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      return next;
    });
  }, []);

  const contextValue = useMemo<AudioContextType>(() => ({
    isMuted,
    toggleMute,
    volume,
    setVolume,
    isQuietClassroomMode,
    setQuietClassroomMode,
    playPop,
    playSuccess,
    playBuzzer,
    playFanfare,
    playTick,
    playWordAudio,
    speakText,
    isPlayingWord
  }), [
    isMuted,
    toggleMute,
    volume,
    isQuietClassroomMode,
    setQuietClassroomMode,
    playPop,
    playSuccess,
    playBuzzer,
    playFanfare,
    playTick,
    playWordAudio,
    speakText,
    isPlayingWord
  ]);

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
