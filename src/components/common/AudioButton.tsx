import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';

interface AudioButtonProps {
  soundFile?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  soundFile,
  fallbackText,
  size = 'md',
  className = ''
}) => {
  const { playWordAudio, isPlayingWord } = useAudio();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 26
  };

  const hasAudio = !!(soundFile || fallbackText);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasAudio) {
      playWordAudio(soundFile, fallbackText);
    }
  };

  if (!hasAudio) {
    return (
      <button
        disabled
        className={`${sizeClasses[size]} rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 flex items-center justify-center cursor-not-allowed ${className}`}
        title="No audio available"
      >
        <VolumeX size={iconSizes[size]} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${sizeClasses[size]} rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-md hover:shadow-lg flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${isPlayingWord ? 'ring-4 ring-sky-300 animate-pulse' : ''} ${className}`}
      title="Listen to pronunciation"
    >
      <Volume2 size={iconSizes[size]} />
    </button>
  );
};
