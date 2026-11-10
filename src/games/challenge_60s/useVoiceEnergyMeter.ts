import { useState, useEffect, useRef, useCallback } from 'react';
import { MicSensitivity } from './types';

interface UseVoiceEnergyMeterReturn {
  energy: number;          // 0.0 to 1.0 (normalized volume)
  isLoud: boolean;         // true if energy exceeds active threshold
  isMicActive: boolean;
  micError: string | null;
  startMic: () => Promise<boolean>;
  stopMic: () => void;
  threshold: number;
}

export function useVoiceEnergyMeter(
  sensitivity: MicSensitivity = 'NORMAL',
  enabled: boolean = true
): UseVoiceEnergyMeterReturn {
  const [energy, setEnergy] = useState<number>(0);
  const [isLoud, setIsLoud] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Calibrated sensitivity profiles (gain multiplier & activation threshold)
  const { multiplier, threshold } = (() => {
    switch (sensitivity) {
      case 'APARTMENT':
        // Apartment / Quiet Solo Testing: very responsive, easily triggers bonuses at normal speaking volume
        return { multiplier: 14.0, threshold: 0.18 };
      case 'HIGH':
        // High sensitivity for smaller or quieter classes
        return { multiplier: 8.5, threshold: 0.25 };
      case 'CLASSROOM_LOUD':
        // High-noise threshold for very loud 35-student classrooms
        return { multiplier: 3.5, threshold: 0.45 };
      case 'NORMAL':
      default:
        // Standard Japanese elementary classroom
        return { multiplier: 6.0, threshold: 0.32 };
    }
  })();

  const stopMic = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsMicActive(false);
    setEnergy(0);
    setIsLoud(false);
  }, []);

  const startMic = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone not supported on this browser');
      return false;
    }

    try {
      stopMic();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Keep raw acoustics so choral chanting isn't filtered
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsMicActive(true);
      setMicError(null);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Compute Root Mean Square (RMS) energy
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        // Perceptual dynamic curve: boost low RMS so normal speaking is responsive
        const perceptualRms = Math.pow(rms, 0.75);
        const normalizedEnergy = Math.min(1.0, perceptualRms * multiplier);
        setEnergy(normalizedEnergy);
        setIsLoud(normalizedEnergy >= threshold);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
      return true;
    } catch (err: any) {
      console.warn('Classroom mic access skipped or denied:', err);
      setMicError(err?.message || 'Mic access denied');
      setIsMicActive(false);
      return false;
    }
  }, [stopMic, threshold]);

  useEffect(() => {
    if (!enabled) {
      stopMic();
    }
    return () => {
      stopMic();
    };
  }, [enabled, stopMic]);

  return {
    energy,
    isLoud,
    isMicActive,
    micError,
    startMic,
    stopMic,
    threshold
  };
}
