import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Music,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  DEFAULT_BGM_MASTER_VOLUME,
  getStoredBgmVolume,
  setStoredBgmVolume,
  subscribeBgmVolume,
} from '@/hooks/bgmHelpers';

export interface BgmControlPillProps {
  trackTitle?: string | null;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onNextTrack?: () => void;
  volume?: number;
  onChangeVolume?: (volume: number) => void;
  playbackRate?: number;
  compact?: boolean;
  variant?: 'dark' | 'adaptive';
  isPlaying?: boolean;
  className?: string;
}

const POPOVER_WIDTH_PX = 276;
const VIEWPORT_MARGIN_PX = 12;
const VOLUME_PRESETS = [0.25, 0.5, 0.75, 1.0] as const;

interface PopoverCoords {
  left: number;
  top?: number;
  bottom?: number;
}

export const BgmControlPill: React.FC<BgmControlPillProps> = ({
  trackTitle,
  isMuted = false,
  onToggleMute,
  onNextTrack,
  volume,
  onChangeVolume,
  playbackRate = 1.0,
  compact = false,
  variant = 'dark',
  isPlaying = true,
  className = '',
}) => {
  const { t, language } = useLanguage();
  const [fallbackVolume, setFallbackVolume] = useState<number>(() =>
    getStoredBgmVolume()
  );

  useEffect(() => {
    if (volume !== undefined) return;
    return subscribeBgmVolume(setFallbackVolume);
  }, [volume]);

  const effectiveVolume =
    volume !== undefined
      ? volume
      : Number.isFinite(fallbackVolume)
      ? fallbackVolume
      : DEFAULT_BGM_MASTER_VOLUME;

  const handleVolumeChange = useCallback(
    (nextVol: number) => {
      const clamped = Math.max(0, Math.min(1, nextVol));
      if (onChangeVolume) {
        onChangeVolume(clamped);
      } else {
        setStoredBgmVolume(clamped);
      }
    },
    [onChangeVolume]
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [popoverCoords, setPopoverCoords] = useState<PopoverCoords | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const computePopoverPosition = useCallback(() => {
    const anchor = containerRef.current;
    if (!anchor || typeof window === 'undefined') return;
    const rect = anchor.getBoundingClientRect();
    const clampedLeft = Math.max(
      VIEWPORT_MARGIN_PX,
      Math.min(
        window.innerWidth - POPOVER_WIDTH_PX - VIEWPORT_MARGIN_PX,
        rect.right - POPOVER_WIDTH_PX
      )
    );
    const opensUpward = rect.top > window.innerHeight * 0.5;
    if (opensUpward) {
      setPopoverCoords({
        left: clampedLeft,
        bottom: Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - rect.top + 8),
      });
    } else {
      setPopoverCoords({
        left: clampedLeft,
        top: Math.min(window.innerHeight - 160, rect.bottom + 8),
      });
    }
  }, []);

  useEffect(() => {
    if (!isPopoverOpen) return;
    computePopoverPosition();

    const handleReposition = () => computePopoverPosition();
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        (containerRef.current && containerRef.current.contains(target)) ||
        (popoverRef.current && popoverRef.current.contains(target))
      ) {
        return;
      }
      setIsPopoverOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPopoverOpen(false);
      }
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopoverOpen, computePopoverPosition]);

  const isFastSprint = playbackRate >= 1.24;
  const isAccelerated = playbackRate > 1.02;
  const pct = Math.round(effectiveVolume * 100);
  const displayTitle = trackTitle || 'BGM';

  const containerThemeClasses =
    isFastSprint
      ? variant === 'adaptive'
        ? 'bg-amber-100 dark:bg-amber-950/90 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-100 shadow-lg shadow-amber-500/20'
        : 'bg-amber-950/90 border-amber-400 text-amber-100 shadow-lg shadow-amber-500/25'
      : isAccelerated
      ? variant === 'adaptive'
        ? 'bg-indigo-100 dark:bg-indigo-950/90 border-indigo-400 dark:border-indigo-500 text-indigo-950 dark:text-indigo-100'
        : 'bg-indigo-950/90 border-indigo-500/80 text-indigo-100'
      : variant === 'adaptive'
      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100'
      : 'bg-slate-900/95 border-slate-700/80 text-white';

  const secondaryBtnClasses =
    variant === 'adaptive'
      ? 'text-slate-500 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white';

  const muteBtnClasses = isMuted
    ? variant === 'adaptive'
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
      : 'bg-rose-500/25 text-rose-400 hover:bg-rose-500/40'
    : variant === 'adaptive'
    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25'
    : 'bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/40';

  const popoverThemeClasses =
    variant === 'adaptive'
      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700'
      : 'bg-slate-900 text-white border-2 border-slate-700';

  return (
    <>
      <div
        ref={containerRef}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl border text-xs font-bold shrink-0 flex-nowrap whitespace-nowrap transition-colors ${containerThemeClasses} ${className}`}
      >
        {/* Track Info / Tempo Badge / Volume Popover Trigger */}
        <button
          type="button"
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer min-w-0 ${
            isPopoverOpen
              ? variant === 'adaptive'
                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-800 text-white'
              : secondaryBtnClasses
          }`}
          title={`${displayTitle} (${pct}% ${
            isMuted ? (language === 'ja' ? '消音中' : 'Muted') : 'BGM'
          })`}
          aria-expanded={isPopoverOpen}
          aria-label={t('BGM Volume & Track Info', 'BGMの音量・曲情報') as string}
        >
          <Music
            size={13}
            className={`shrink-0 ${
              isMuted
                ? 'text-slate-400'
                : isFastSprint
                ? 'text-amber-400 animate-spin'
                : isPlaying
                ? 'text-indigo-500 dark:text-indigo-400 animate-bounce'
                : 'text-indigo-500 dark:text-indigo-400'
            }`}
          />
          {!compact && (
            <span className="text-[11px] font-bold max-w-[125px] truncate">
              {displayTitle}
            </span>
          )}
          {isAccelerated && (
            <span
              className={`text-[10px] font-mono font-black px-1 py-0.2 rounded tabular-nums shrink-0 ${
                isFastSprint
                  ? 'bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {playbackRate.toFixed(2)}x
            </span>
          )}
          <SlidersHorizontal size={12} className="opacity-80 shrink-0" />
          {!compact && (
            <span className="text-[10px] font-mono tabular-nums opacity-75 hidden sm:inline shrink-0">
              {pct}%
            </span>
          )}
        </button>

        {/* Next Track Button (when shuffle skip handler is supplied) */}
        {onNextTrack && (
          <button
            type="button"
            onClick={onNextTrack}
            className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${secondaryBtnClasses}`}
            title={t('Next BGM Track', '次のBGMへ') as string}
            aria-label={t('Next BGM Track', '次のBGMへ') as string}
          >
            <SkipForward size={13} />
          </button>
        )}

        {/* Mute / Unmute Button */}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${muteBtnClasses}`}
            title={
              isMuted
                ? (t('Unmute BGM', 'BGMを再生') as string)
                : (t('Mute BGM', 'BGMを消音') as string)
            }
            aria-label={
              isMuted
                ? (t('Unmute BGM', 'BGMを再生') as string)
                : (t('Mute BGM', 'BGMを消音') as string)
            }
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
      </div>

      {/* Viewport-Anchored Fixed Popover (immune to header overflow-x-auto clipping) */}
      {isPopoverOpen && popoverCoords && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${popoverCoords.left}px`,
            ...(popoverCoords.top !== undefined
              ? { top: `${popoverCoords.top}px` }
              : {}),
            ...(popoverCoords.bottom !== undefined
              ? { bottom: `${popoverCoords.bottom}px` }
              : {}),
            width: `${POPOVER_WIDTH_PX}px`,
          }}
          className={`z-[90] rounded-2xl p-3.5 shadow-2xl space-y-3 animate-in fade-in duration-150 ${popoverThemeClasses}`}
        >
          {/* Current Track Header */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Music size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60 block leading-none mb-0.5">
                  {t('Now Playing BGM', <><ruby>再生中<rt>さいせいちゅう</rt></ruby>のBGM</>)}
                </span>
                <p className="text-xs font-black truncate" title={displayTitle}>
                  {displayTitle}
                </p>
              </div>
            </div>
            {isAccelerated && (
              <span
                className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shrink-0 tabular-nums ${
                  isFastSprint
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-indigo-500/20 text-indigo-400'
                }`}
              >
                <Zap size={10} />
                <span>{playbackRate.toFixed(2)}x</span>
              </span>
            )}
          </div>

          {/* Master BGM Volume Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Volume2 size={13} className="text-indigo-500 dark:text-indigo-400" />
                <span>
                  {t('BGM Volume', <>BGM <ruby>音量<rt>おんりょう</rt></ruby></>)}
                </span>
                {isMuted && (
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 dark:text-rose-400">
                    {t('Muted', '消音中')}
                  </span>
                )}
              </span>
              <span className="font-mono font-black text-indigo-500 dark:text-indigo-400 tabular-nums">
                {pct}%
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={effectiveVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              aria-label={t('BGM Master Volume', 'BGMマスター音量') as string}
              className="w-full h-2 rounded-full accent-indigo-500 cursor-pointer bg-slate-200 dark:bg-slate-700"
            />

            {/* Quick Classroom Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {VOLUME_PRESETS.map((preset) => {
                const isCurrent = Math.abs(effectiveVolume - preset) <= 0.02;
                const presetPct = Math.round(preset * 100);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleVolumeChange(preset)}
                    className={`py-1 rounded-lg text-[11px] font-mono font-black transition-all cursor-pointer tabular-nums ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : variant === 'adaptive'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {presetPct}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Skip & Mute Actions Row */}
          {(onNextTrack || onToggleMute) && (
            <div className="flex items-center gap-2 pt-1">
              {onNextTrack && (
                <button
                  type="button"
                  onClick={onNextTrack}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    variant === 'adaptive'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <SkipForward size={13} />
                  <span>{t('Next Track', <><ruby>次<rt>つぎ</rt></ruby>の<ruby>曲<rt>きょく</rt></ruby></>)}</span>
                </button>
              )}
              {onToggleMute && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${muteBtnClasses}`}
                >
                  {isMuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  <span>
                    {isMuted
                      ? t('Unmute', <><ruby>音<rt>おと</rt></ruby>を<ruby>出<rt>だ</rt></ruby>す</>)
                      : t('Mute', <><ruby>消音<rt>しょうおん</rt></ruby></>)}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
