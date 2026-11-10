import React, { useState, useEffect, useCallback } from 'react';
import { Settings, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type SidebarWidth = 'compact' | 'standard' | 'wide';

export interface CinemaStageLayoutProps {
  /** The Left Control Tower content (20–33% width) */
  sidebar: React.ReactNode;
  /** Width preset for the sidebar:
   * 'compact':  ~220-260px (default for streamlined single-gauge / setting-modal games like Hot Potato, Bingo)
   * 'standard': ~270-320px (for games with live scoring or pose pickers like Keyword Grab)
   * 'wide':     ~360-440px (for games with large in-rail vocabulary/phonetic cards like Speed Flash)
   */
  sidebarWidth?: SidebarWidth;
  /** The Cinema Main Stage content (fills 66–80% of width) */
  children: React.ReactNode;
  /** Optional full-width bottom action bar (e.g. giant PASS / DRAW / REVEAL button) */
  stageAction?: React.ReactNode;
  /** Optional right column (e.g. Bingo called words history rack, team tally rack) */
  rightRail?: React.ReactNode;
  /** Right rail width: default 'standard' (~270-320px) */
  rightRailWidth?: 'compact' | 'standard' | 'wide';
  /** Optional handler to render a sleek Settings ⚙️ button in the sidebar header */
  onOpenSettings?: () => void;
  /** Optional custom title or tooltip for the settings button */
  settingsTitle?: React.ReactNode;
  /** Optional back/exit button */
  onExit?: () => void;
  /** Optional title for the sidebar header */
  title?: React.ReactNode;
  /** Optional badge in the sidebar header */
  badge?: React.ReactNode;
  /** Extra class names for outer container */
  className?: string;
  /** Mobile stacking order: default true (stage on top on small screens) */
  mobileStageFirst?: boolean;
}

const SIDEBAR_WIDTH_CLASSES: Record<SidebarWidth, string> = {
  compact: 'w-full md:w-56 lg:w-60 xl:w-64',
  standard: 'w-full md:w-68 lg:w-76 xl:w-80',
  wide: 'w-full md:w-[360px] lg:w-[420px] xl:w-[460px]'
};

const RIGHT_RAIL_WIDTH_CLASSES: Record<SidebarWidth, string> = {
  compact: 'w-full lg:w-64 xl:w-72',
  standard: 'w-full lg:w-72 xl:w-84',
  wide: 'w-full lg:w-80 xl:w-96'
};

export const CinemaStageLayout: React.FC<CinemaStageLayoutProps> = ({
  sidebar,
  sidebarWidth = 'compact',
  children,
  stageAction,
  rightRail,
  rightRailWidth = 'standard',
  onOpenSettings,
  settingsTitle,
  onExit,
  title,
  badge,
  className = '',
  mobileStageFirst = true
}) => {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (!isFs) {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  }, []);

  const sidebarWClass = SIDEBAR_WIDTH_CLASSES[sidebarWidth];
  const rightRailWClass = RIGHT_RAIL_WIDTH_CLASSES[rightRailWidth];

  const sidebarOrderClass = mobileStageFirst ? 'order-2 md:order-1' : 'order-1';
  const stageOrderClass = mobileStageFirst ? 'order-1 md:order-2' : 'order-2';
  const rightRailOrderClass = 'order-3';

  return (
    <div
      className={`w-full flex-1 min-h-0 h-full flex flex-col md:flex-row items-stretch justify-between gap-2 md:gap-3 p-1.5 md:p-2.5 max-w-[1920px] mx-auto select-none font-['UD_Digi_Kyokasho_NP-R','Zen_Maru_Gothic',sans-serif] ${className}`}
    >
      {/* =========================================================================
          LEFT COLUMN: The Control & Teacher Tower (20% – 33%)
         ========================================================================= */}
      <div
        className={`${sidebarWClass} shrink-0 h-full flex flex-col justify-between gap-2.5 bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-3xl p-2.5 md:p-3.5 shadow-xl backdrop-blur-md overflow-y-auto max-h-full custom-scrollbar min-h-0 ${sidebarOrderClass}`}
      >
        {/* Built-in header with Exit, Title, Badge, Fullscreen, and Settings */}
        {(onOpenSettings || onExit || title) && (
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0 gap-1.5 min-h-[36px]">
            <div className="flex items-center gap-1.5 min-w-0">
              {onExit && (
                <button
                  onClick={onExit}
                  className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                  title={t('Return to Arcade', 'もどる')}
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              {title ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs sm:text-sm font-black text-slate-100 truncate">
                    {title}
                  </span>
                  {badge && (
                    <span className="shrink-0">{badge}</span>
                  )}
                </div>
              ) : (
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {t('Controls', '操作')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-black text-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                title={isFullscreen ? t('Exit Fullscreen (F11)', '全画面解除 (F11)') : t('Fullscreen (F11)', '全画面表示 (F11)')}
              >
                {isFullscreen ? <Minimize2 size={13} className="text-sky-400" /> : <Maximize2 size={13} className="text-sky-400" />}
              </button>

              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-black text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                  title={typeof settingsTitle === 'string' ? settingsTitle : t('Game Settings', '設定')}
                >
                  <Settings size={14} className="text-amber-400" />
                  <span className="text-[11px] font-bold">
                    {settingsTitle || t('Settings', <><ruby>設定<rt className="text-[7px]">せってい</rt></ruby></>)}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sidebar Body */}
        {sidebar}
      </div>

      {/* =========================================================================
          CENTER / MAIN STAGE: The Cinema Presentation Stage (66% – 80%)
         ========================================================================= */}
      <div
        className={`flex-1 min-w-0 w-full flex flex-col items-center justify-between min-h-0 h-full max-h-full bg-slate-950/60 border border-slate-800/80 rounded-3xl p-3 md:p-5 shadow-2xl relative overflow-hidden ${stageOrderClass}`}
      >
        {/* Stage Content */}
        <div className="w-full flex-1 flex flex-col items-center justify-between min-h-0">
          {children}
        </div>

        {/* Pinned Stage Action Bar */}
        {stageAction && (
          <div className="w-full mt-2.5 shrink-0 flex flex-col items-center gap-1 z-10">
            {stageAction}
          </div>
        )}
      </div>

      {/* =========================================================================
          OPTIONAL RIGHT COLUMN: History Rack or Team Scoreboard
         ========================================================================= */}
      {rightRail && (
        <div
          className={`${rightRailWClass} shrink-0 flex flex-col min-h-0 h-full max-h-[380px] md:max-h-full bg-slate-900/90 dark:bg-slate-900/95 border border-slate-800 rounded-3xl p-3 md:p-4 shadow-xl backdrop-blur-md overflow-hidden ${rightRailOrderClass}`}
        >
          {rightRail}
        </div>
      )}
    </div>
  );
};
