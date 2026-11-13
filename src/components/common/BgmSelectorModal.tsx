import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  Play, 
  Square, 
  Sun, 
  Moon, 
  Music, 
  Check, 
  Disc3, 
  Zap, 
  Radio, 
  Flame, 
  Trophy, 
  Coffee, 
  ChevronRight,
  Volume2
} from 'lucide-react';
import { useClassroom } from '@/context/ClassroomContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { SOUND_PACKS, SOUND_PACK_LIST, getSoundPack, SoundTrack } from '@/utils/soundPacks';

export interface BgmSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackId: string;
  onSelectPack: (packId: string) => void;
}

type RoleFilter = 'all' | 'lobby' | 'quiz' | 'rush' | 'boss' | 'podium';

export const BgmSelectorModal: React.FC<BgmSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedPackId,
  onSelectPack
}) => {
  const { theme, toggleTheme } = useClassroom();
  const { language } = useLanguage();
  const { playPop } = useAudio();

  // Dual-Language Text State
  const [textLang, setTextLang] = useState<'en' | 'ja'>(language);
  useEffect(() => {
    setTextLang(language);
  }, [language]);

  const t = useCallback((en: React.ReactNode, ja: React.ReactNode) => {
    return textLang === 'ja' ? ja : en;
  }, [textLang]);

  // Working selection inside modal
  const [stagedPackId, setStagedPackId] = useState<string>(selectedPackId);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // Preview Audio Engine
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Sync stagedPackId when opened
  useEffect(() => {
    if (isOpen) {
      setStagedPackId(selectedPackId);
      setRoleFilter('all');
    } else {
      stopPreview();
    }
  }, [isOpen, selectedPackId]);

  // Stop audio on cleanup / unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        stopPreview();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingTrackId(null);
    setIsPlaying(false);
  };

  const playPreviewTrack = (track: SoundTrack) => {
    playPop();
    // If clicking same track that's currently playing, stop it
    if (playingTrackId === track.id && isPlaying) {
      stopPreview();
      return;
    }

    // Stop current track
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const audio = new Audio(track.url);
      audio.volume = 0.75;
      audio.onended = () => {
        setPlayingTrackId(null);
        setIsPlaying(false);
      };
      audio.onerror = () => {
        setPlayingTrackId(null);
        setIsPlaying(false);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audioRef.current = audio;
            setPlayingTrackId(track.id);
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Audio preview playback blocked or failed:', err);
            setPlayingTrackId(null);
            setIsPlaying(false);
          });
      }
    } catch (e) {
      console.warn('Audio preview instantiation failed:', e);
      setPlayingTrackId(null);
      setIsPlaying(false);
    }
  };

  const stagedPack = useMemo(() => {
    return getSoundPack(stagedPackId);
  }, [stagedPackId]);

  const filteredTracks = useMemo(() => {
    if (!stagedPack || stagedPack.tracks.length === 0) return [];
    if (roleFilter === 'all') return stagedPack.tracks;
    return stagedPack.tracks.filter(t => t.role === roleFilter);
  }, [stagedPack, roleFilter]);

  const handleConfirm = () => {
    playPop();
    stopPreview();
    onSelectPack(stagedPackId);
    onClose();
  };

  const handleCancel = () => {
    playPop();
    stopPreview();
    onClose();
  };

  const getRoleBadge = (role: SoundTrack['role']) => {
    switch (role) {
      case 'lobby':
        return {
          icon: <Coffee size={10} />,
          labelEn: 'Lobby',
          labelJa: '待機・ロビー',
          classes: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800'
        };
      case 'quiz':
        return {
          icon: <Zap size={10} />,
          labelEn: 'Quiz & Blitz',
          labelJa: 'クイズ・緊迫',
          classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'rush':
        return {
          icon: <Radio size={10} />,
          labelEn: 'Sprint Rush',
          labelJa: '高速レース',
          classes: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'boss':
        return {
          icon: <Flame size={10} />,
          labelEn: 'Raid Boss',
          labelJa: 'ボスバトル',
          classes: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'podium':
        return {
          icon: <Trophy size={10} />,
          labelEn: 'Podium',
          labelJa: '表彰式',
          classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-1.5 sm:p-2.5 md:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={handleCancel}
    >
      <div 
        className="w-[98vw] max-w-[1800px] h-[96dvh] max-h-[1020px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 sm:border-4 border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================================
            HEADER CLUSTER (Rules 3, 7, 10: Zero layout shift, pinned min-h-[44px])
        ========================================================================= */}
        <div className="min-h-[44px] px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
          {/* Title Container */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
              <Disc3 size={18} className="animate-spin-slow" />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                {t(
                  'Classroom Sound Packs',
                  <>
                    <ruby>教室<rt>きょうしつ</rt></ruby>のBGMサウンドパック
                  </>
                )}
              </h2>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight truncate hidden xs:block">
                {t(
                  'Curated high-energy soundtracks for quizzes, sprint races & boss battles',
                  <>
                    クイズやレース、ボス<ruby>戦<rt>せん</rt></ruby>を<ruby>盛<rt>も</rt></ruby>り<ruby>上<rt>あ</rt></ruby>げるBGMパック
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Right Header Control Cluster */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            {/* 1. Independent Text Language Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[10px] h-7">
              <span className="text-[10px] text-slate-400 px-1 font-bold select-none" title="Text Language (表示言語)">文</span>
              <button
                type="button"
                onClick={() => { playPop(); setTextLang('en'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer h-5 flex items-center justify-center ${
                  textLang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Text: English (表示: 英語)"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => { playPop(); setTextLang('ja'); }}
                className={`px-1.5 py-0.5 rounded-md font-black transition-all cursor-pointer h-5 flex items-center justify-center ${
                  textLang === 'ja'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Text: 日本語 (表示: 日本語)"
              >
                日
              </button>
            </div>

            {/* 2. Theme Toggle: Sun / Moon */}
            <button
              type="button"
              onClick={() => { playPop(); toggleTheme(); }}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-700/80"
              title={theme === 'dark' ? 'Switch to Light Mode (ライトモード)' : 'Switch to Dark Mode (ダークモード)'}
            >
              {theme === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-400" />}
            </button>

            {/* 3. Close Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-700/80"
              title="Close (閉じる)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            TWO-COLUMN SPLIT BODY (Left = Packs [4/12], Right = Playlist [8/12])
        ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 p-3 sm:p-5 lg:p-6 overflow-hidden min-h-0">
          
          {/* =====================================================================
              LEFT COLUMN: SOUND PACK SELECTION (5 / 12 on tablet, 4 / 12 on desktop/1080p)
          ===================================================================== */}
          <div className="md:col-span-5 lg:col-span-4 xl:col-span-4 flex flex-col min-h-0 overflow-hidden space-y-3">
            
            {/* Active Pack Hero Pill */}
            <div className={`p-3 rounded-2xl border-2 transition-all relative overflow-hidden shrink-0 ${stagedPack.accentBorder} ${
              stagedPack.id === 'none' 
                ? 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700' 
                : 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80'
            }`}>
              <div className="flex items-center gap-3 relative z-10">
                <span className="text-3xl p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                  {stagedPack.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                      {t('Selected Pack', '選択中')}
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md whitespace-nowrap shrink-0 ${stagedPack.badgeColor}`}>
                      {stagedPack.franchise}
                    </span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                      {stagedPack.tracks.length} {t('Tracks', '曲')}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {textLang === 'ja' ? stagedPack.nameJa : stagedPack.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {textLang === 'ja' ? stagedPack.descriptionJa : stagedPack.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Pack Selector Header */}
            <div className="shrink-0 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t(
                  'Available Sound Packs',
                  <>
                    <ruby>選択可能<rt>せんたくかのう</rt></ruby>なパック
                  </>
                )}
              </h4>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                {SOUND_PACK_LIST.length} {t('Packs', '種類')}
              </span>
            </div>

            {/* Scrollable Sound Pack Cards List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
              {SOUND_PACK_LIST.map((pack) => {
                const isSelected = stagedPackId === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => {
                      playPop();
                      setStagedPackId(pack.id);
                      setRoleFilter('all');
                    }}
                    className={`w-full p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? `${pack.accentBorder} ${pack.bgLight} ${pack.bgDark} ring-2 ring-indigo-400/30 shadow-xs`
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-2xl shrink-0">{pack.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                          <h5 className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate min-w-0">
                            {textLang === 'ja' ? pack.nameJa : pack.name}
                          </h5>
                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                            {pack.tracks.length} {t('tracks', '曲')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {textLang === 'ja' ? pack.descriptionJa : pack.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <Check size={11} className="stroke-[3]" />
                        </span>
                      ) : (
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* =====================================================================
              RIGHT COLUMN: TRACK PLAYLIST & AUDITION (7 / 12 on tablet, 8 / 12 on desktop/1080p)
          ===================================================================== */}
          <div className="md:col-span-7 lg:col-span-8 xl:col-span-8 flex flex-col min-h-0 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 p-3 sm:p-5 overflow-hidden">
            
            {stagedPack.tracks.length > 0 ? (
              <>
                {/* Playlist Header & Role Filter Bar */}
                <div className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Music size={13} />
                      </div>
                      <div className="min-w-0 truncate">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                          {textLang === 'ja' ? stagedPack.nameJa : stagedPack.name} {t('Lineup', '収録曲')}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {stagedPack.tracks.length} {t('tracks curated for classroom play', '曲収録')}
                        </span>
                      </div>
                    </div>

                    {isPlaying && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        <Volume2 size={11} className="animate-pulse" />
                        <span>{t('Auditioning', '試聴中')}</span>
                      </div>
                    )}
                  </div>

                  {/* Role Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                    <button
                      type="button"
                      onClick={() => setRoleFilter('all')}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap ${
                        roleFilter === 'all'
                          ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t('All', '全曲')} ({stagedPack.tracks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('lobby')}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                        roleFilter === 'lobby'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Coffee size={10} />
                      <span>{t('Lobby', 'ロビー')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('quiz')}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                        roleFilter === 'quiz'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Zap size={10} />
                      <span>{t('Quiz', 'クイズ')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('rush')}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                        roleFilter === 'rush'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Radio size={10} />
                      <span>{t('Sprint', 'スプリント')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('boss')}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                        roleFilter === 'boss'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Flame size={10} />
                      <span>{t('Boss', 'ボス')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('podium')}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                        roleFilter === 'podium'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Trophy size={10} />
                      <span>{t('Podium', '表彰')}</span>
                    </button>
                  </div>
                </div>

                {/* Scrollable Track List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 pr-1 min-h-0">
                  {filteredTracks.map((track) => {
                    const roleMeta = getRoleBadge(track.role);
                    const isTrackPlaying = playingTrackId === track.id && isPlaying;
                    return (
                      <div 
                        key={track.id}
                        className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                          isTrackPlaying
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-400/30'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Play/Stop Button + Clean Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => playPreviewTrack(track)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 ${
                              isTrackPlaying
                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-500 hover:text-white'
                            }`}
                            title={isTrackPlaying ? 'Stop (停止)' : 'Play Preview (試聴)'}
                          >
                            {isTrackPlaying ? (
                              <Square size={12} className="fill-current" />
                            ) : (
                              <Play size={12} className="fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1 truncate">
                            <p className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                              isTrackPlaying ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-800 dark:text-slate-200'
                            }`}>
                              {track.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.2 rounded border ${roleMeta.classes}`}>
                                {roleMeta.icon}
                                <span>{textLang === 'ja' ? roleMeta.labelJa : roleMeta.labelEn}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {track.bpm ? `${Math.round(track.bpm)} BPM` : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Equalizer Wave / Duration */}
                        <div className="shrink-0 flex items-center gap-2">
                          {isTrackPlaying && (
                            <div className="flex items-end gap-0.5 h-3">
                              <span className="w-0.5 h-3 bg-indigo-500 animate-pulse rounded-full" />
                              <span className="w-0.5 h-2 bg-indigo-500 animate-pulse delay-75 rounded-full" />
                              <span className="w-0.5 h-3 bg-indigo-500 animate-pulse delay-150 rounded-full" />
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                            {track.duration}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredTracks.length === 0 && (
                    <div className="py-10 text-center text-xs text-slate-400">
                      {t('No tracks found for this category filter.', 'このカテゴリーに該当する曲はありません。')}
                    </div>
                  )}
                </div>

                {/* Bottom Audition Status Bar (If playing) */}
                {isPlaying && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    <span className="truncate">
                      ▶ {filteredTracks.find(t => t.id === playingTrackId)?.title || 'Playing Preview'}
                    </span>
                    <button
                      type="button"
                      onClick={stopPreview}
                      className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 text-[10px] font-black cursor-pointer"
                    >
                      {t('Stop Preview', '試聴停止')}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-4xl block mb-2">🔇</span>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">
                  {t('Silent Mode (Sound Effects Only)', 'サイレントモード (効果音のみ)')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  {t(
                    'Background music will remain muted during all game phases. Correct / wrong answers and timer SFX will play normally.',
                    'ゲーム中のBGMをオフにします。正解・不正解チャイムや早押し音などの効果音はそのまま鳴ります。'
                  )}
                </p>
              </div>
            )}

          </div>

        </div>

        {/* =========================================================================
            FOOTER ACTIONS (Pinned, zero layout shift)
        ========================================================================= */}
        <div className="p-3.5 px-5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{stagedPack.icon}</span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate hidden xs:inline">
              {textLang === 'ja' ? stagedPack.nameJa : stagedPack.name}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              ({stagedPack.tracks.length} {t('tracks', '曲')})
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {t('Cancel', 'キャンセル')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Check size={14} className="stroke-[3]" />
              <span>{t('Select Sound Pack', 'このパックを選択')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
