import { useEffect } from 'react';

export interface ClickerActions {
  onNext?: () => void;
  onPrevious?: () => void;
  onReplayAudio?: () => void;
  onTogglePause?: () => void;
  onBlankScreen?: () => void;
  disabled?: boolean;
}

/**
 * Universal Classroom Clicker & Presenter Remote Hook
 * Standard Japanese school presenter remotes (Logitech R400/R800, Kokuyo "Kokuyo-no-Tsue", Sanwa Supply):
 * - Next: PageDown, ArrowRight, ArrowDown, Space, Enter
 * - Previous / Replay: PageUp, ArrowLeft, ArrowUp, KeyR
 * - Pause / Freeze: KeyP
 * - Blackout / Shutter: KeyB, Period (.)
 */
export function useClassroomClicker({
  onNext,
  onPrevious,
  onReplayAudio,
  onTogglePause,
  onBlankScreen,
  disabled = false
}: ClickerActions) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Never capture keystrokes if user is typing in an active input field or modal textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      // 1. BLACKOUT / CURTAIN SHUTTER: B Key or Period (.)
      if (
        e.code === 'KeyB' ||
        e.key === 'b' ||
        e.key === 'B' ||
        e.key === '.'
      ) {
        e.preventDefault();
        onBlankScreen?.();
        return;
      }

      // 2. PAUSE / FREEZE TIMER: P Key
      if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onTogglePause?.();
        return;
      }

      // 3. NEXT / ADVANCE: Space, Enter, PageDown, ArrowRight, ArrowDown
      if (
        ['Space', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.code) ||
        [' ', 'Enter', 'PageDown', 'ArrowRight', 'ArrowDown'].includes(e.key)
      ) {
        e.preventDefault();
        onNext?.();
        return;
      }

      // 4. AUDIO REPLAY: KeyR
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onReplayAudio?.();
        return;
      }

      // 5. PREVIOUS / BACKWARD NAVIGATION: PageUp, ArrowLeft, ArrowUp
      if (
        ['PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.code) ||
        ['PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)
      ) {
        e.preventDefault();
        if (onPrevious) {
          onPrevious();
        } else {
          onReplayAudio?.();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onReplayAudio, onTogglePause, onBlankScreen, disabled]);
}
