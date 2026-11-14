import React, { useState, useEffect, useRef } from 'react';
import { prewarmSuzukaAssets } from '@/games/suzuka_grand_prix/engine/Suzuka3DEngine';
import { prewarmMicroKartAssets } from '@/games/suzuka_grand_prix/engine/MicroKartBuilder.js';
import { QuizPlayer, TEAM_PRESETS, SprintSettings, TugOfWarSettings, TamaireSettings, GamePlayType, PRE_GAME_GREETINGS } from '../types';
import { LogOut, Volume2, CheckCircle2, Edit3, ShoppingBag, Award, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { getShopItemById } from '@/services/shopCatalog';
import { EditProfileModal } from '@/components/student/EditProfileModal';
import { EigoShopModal } from '@/components/student/EigoShopModal';
import { StudentStatsModal } from '@/components/student/StudentStatsModal';
import { getSavedStudentProfile } from '@/services/studentProfile';
import { StudentProfile } from '@/types/roster';
import {
  KartThemeId,
  KART_THEME_LIST,
  getKartTheme,
  getSavedKartTheme,
  saveSavedKartTheme,
} from '@/games/suzuka_grand_prix/kartPresets';
import { SuzukaTrackThemeId, getTrackTheme } from '@/games/suzuka_grand_prix/trackThemes';

interface QuizStudentLobbyProps {
  roomCode: string;
  player: QuizPlayer;
  gamePlayType?: GamePlayType;
  sprintSettings?: SprintSettings;
  tugOfWarSettings?: TugOfWarSettings;
  tamaireSettings?: TamaireSettings;
  totalQuestions?: number;
  totalStudents?: number;
  onLeave: () => void;
  onUpdateKartTheme?: (themeId: string) => void;
  onUpdatePlayerProfile?: (updates: {
    nickname?: string;
    avatar?: string;
    frame?: string;
    title?: string;
    callsign?: string;
    greeting?: string;
  }) => void;
}

export const QuizStudentLobby: React.FC<QuizStudentLobbyProps> = ({
  roomCode,
  player,
  gamePlayType = 'KAHOOT',
  sprintSettings,
  tugOfWarSettings,
  tamaireSettings,
  totalQuestions = 20,
  totalStudents,
  onLeave,
  onUpdateKartTheme,
  onUpdatePlayerProfile,
}) => {
  const { t, language } = useLanguage();
  const [audioTested, setAudioTested] = useState<boolean>(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isPassportOpen, setIsPassportOpen] = useState<boolean>(false);
  const [selectedGreeting, setSelectedGreeting] = useState<string | null>(player.greeting || null);
  const [savedProfile, setSavedProfile] = useState<StudentProfile | null>(() => getSavedStudentProfile());
  const audioTestTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (audioTestTimerRef.current !== null) {
        clearTimeout(audioTestTimerRef.current);
        audioTestTimerRef.current = null;
      }
    };
  }, []);

  const isTug = gamePlayType === 'TUG_OF_WAR';
  const isVolleyball = gamePlayType === 'TAMAIRE' || gamePlayType === 'VOLLEYBALL';
  const isGrandPrix3D = gamePlayType === 'GRAND_PRIX_3D';
  const isAnticipation = gamePlayType === 'ANTICIPATION';
  const isSprint = gamePlayType === 'SPRINT_RACE' || isGrandPrix3D;
  const isTimeTrial = isSprint && sprintSettings?.sprintMode === 'TIME_TRIAL';
  const targetLaps3D = sprintSettings?.targetLaps3D || 1;
  const graceSeconds = sprintSettings?.graceCountdownSeconds || 15;
  const timeLimitSeconds = sprintSettings?.timeLimitSeconds || 60;

  useEffect(() => {
    if (gamePlayType === 'GRAND_PRIX_3D' || gamePlayType === 'SPRINT_RACE') {
      prewarmSuzukaAssets(sprintSettings?.trackTheme);
      prewarmMicroKartAssets();
    }
  }, [gamePlayType, sprintSettings?.trackTheme]);

  const [selectedKartTheme, setSelectedKartTheme] = useState<KartThemeId>(() => {
    return (player.kartTheme as KartThemeId) || getSavedKartTheme();
  });
  const activeTheme = getKartTheme(selectedKartTheme);

  const handleSelectKartTheme = (themeId: KartThemeId) => {
    setSelectedKartTheme(themeId);
    saveSavedKartTheme(themeId);
    soundEffects.playReveal();
    onUpdateKartTheme?.(themeId);
  };

  const handleTestAudio = () => {
    soundEffects.playReveal();
    setAudioTested(true);
    if (audioTestTimerRef.current !== null) {
      clearTimeout(audioTestTimerRef.current);
    }
    audioTestTimerRef.current = window.setTimeout(() => {
      setAudioTested(false);
      audioTestTimerRef.current = null;
    }, 2500);
  };

  const currentProfile: StudentProfile = savedProfile || {
    schoolId: 'futakotamagawa',
    classId: '6-1',
    attendanceNumber: typeof player.attendanceNumber === 'number' ? player.attendanceNumber : 0,
    nickname: player.nickname,
    avatar: player.avatar || '🇯🇵',
    callsign: `${player.attendanceNumber === 0 ? '00' : (player.attendanceNumber || 1)}`,
    xp: 0,
    level: 1,
    gold: 0,
    boundAt: getServerTime(),
  };

  const handleProfileUpdated = (newProfile: StudentProfile) => {
    setSavedProfile(newProfile);
    onUpdatePlayerProfile?.({
      nickname: newProfile.nickname,
      avatar: newProfile.avatar,
      frame: newProfile.equipped?.frame,
      title: newProfile.equipped?.title,
      callsign: newProfile.callsign,
    });
  };

  const handleSelectGreeting = (greetingText: string) => {
    soundEffects.playTick();
    const next = selectedGreeting === greetingText ? null : greetingText;
    setSelectedGreeting(next);
    onUpdatePlayerProfile?.({ greeting: next || '' });
  };

  return (
    <div className="w-full h-full max-w-[1440px] mx-auto flex flex-col justify-between select-none animate-in fade-in duration-200 pointer-events-none px-1 sm:px-2 py-1">
      {/* 1. De-Crowded Top HUD Bar */}
      <div className="w-full flex flex-nowrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border-2 border-slate-200/90 dark:border-slate-800 pointer-events-auto shrink-0 overflow-x-auto no-scrollbar">
        {/* Left: Consolidated Clickable Player Identity & Edit Profile Pill */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playTick();
            setIsEditProfileOpen(true);
          }}
          className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-purple-50 dark:bg-slate-800/90 dark:hover:bg-purple-950/50 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer group min-w-0 shrink"
          title={t('Tap to edit nickname & avatar', 'タップして名前・アイコンを変更')}
        >
          <AvatarDisplay
            avatar={player.avatar || (isSprint ? activeTheme.emoji : '🇯🇵')}
            frameId={player.frame}
            sizeClassName="w-9 h-9 text-xl group-hover:scale-105 transition-transform shrink-0"
          />
          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                {player.nickname}
              </span>
              {typeof player.attendanceNumber === 'number' && (
                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
                  #{player.attendanceNumber === 0 ? (language === 'ja' ? '00 先生' : '00 Teacher') : player.attendanceNumber}
                </span>
              )}
              {player.title && (() => {
                const titleItem = getShopItemById(player.title);
                const titleLabel = titleItem
                  ? (language === 'ja' ? titleItem.jaName : titleItem.name)
                  : player.title;
                return (
                  <span className="hidden sm:inline-block text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300/60 truncate max-w-[110px] shrink-0">
                    {titleLabel}
                  </span>
                );
              })()}
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 leading-none mt-0.5 whitespace-nowrap">
              <Edit3 size={10} />
              <span>{t('Edit Name / Icon', '名前・アイコン変更')}</span>
            </span>
          </div>
        </button>

        {/* Center: Unified Room PIN + Waiting for Teacher Status Pill */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 shrink-0 flex-nowrap">
          <span className="font-mono font-black text-xs sm:text-sm text-purple-700 dark:text-purple-300 pr-2.5 border-r border-purple-200 dark:border-purple-800 whitespace-nowrap">
            PIN: {roomCode}
          </span>
          <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 animate-ping shrink-0" />
          <span className="text-xs font-black text-purple-900 dark:text-purple-200 whitespace-nowrap">
            {t('Waiting for teacher to start!', '先生がスタートするのを待ってね！')}
          </span>
        </div>

        {/* Right: Clean 4-Action Utility Cluster */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <button
            type="button"
            onClick={() => {
              soundEffects.playTick();
              setIsShopOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
          >
            <ShoppingBag size={13} />
            <span>{t('Shop', 'ショップ')}</span>
            <span className="font-mono text-[11px] font-black bg-white/45 px-1.5 py-0.2 rounded-md">
              {currentProfile.gold || 0}G
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.playTick();
              setIsPassportOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Award size={13} />
            <span>{t('Passport', '実績')}</span>
          </button>

          <button
            type="button"
            onClick={handleTestAudio}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 border cursor-pointer whitespace-nowrap shrink-0 ${
              audioTested
                ? 'bg-emerald-500 text-white border-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title={t('Quiet Classroom Mode active — tap to test sound', '教室静音モード中 — タップで音テスト')}
          >
            {audioTested ? (
              <>
                <CheckCircle2 size={13} />
                <span>{t('OK! ♫', '音OK!')}</span>
              </>
            ) : (
              <>
                <span>🤫</span>
                <Volume2 size={13} className="text-indigo-500" />
                <span>{t('Sound', '音テスト')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <LogOut size={13} />
            <span>{t('Leave', '退出')}</span>
          </button>
        </div>
      </div>

      {/* 2. Balanced Twin-Wing Showroom Layout for 1180x820 iPad Viewport:
             - Left Wing (375px): 15-Kart Pit Garage (5x3 grid, generous buttons)
             - Center Window (~390px): Unobstructed 3D Orbiting Kart Showcase
             - Right Wing (375px): Top = 2x4 English Greetings (zero cutoff!) + Bottom = 3-Step How to Play (zero dead whitespace!) */}
      {isSprint ? (
        <div className="w-full flex-1 min-h-0 flex items-end justify-between gap-2 lg:gap-3 pb-2 pt-4">
          {/* LEFT WING: Dedicated 15-Kart Pit Garage */}
          <div className="w-[275px] lg:w-[350px] xl:w-[385px] shrink-0 bg-slate-950/92 backdrop-blur-md border-2 border-slate-800 rounded-3xl p-3 lg:p-3.5 shadow-2xl pointer-events-auto flex flex-col justify-between text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base shrink-0">🏎️</span>
                <span className="text-xs sm:text-sm font-black text-white truncate">
                  {t('Pit Garage: Choose Kart', 'ピットガレージ: マイマシン')}
                </span>
              </div>
              <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                {language === 'ja' ? activeTheme.nameJa : activeTheme.nameEn}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 my-2.5">
              {KART_THEME_LIST.map((theme) => {
                const isSelected = selectedKartTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectKartTheme(theme.id)}
                    className={`relative py-2 px-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? `bg-gradient-to-tr ${theme.accentBg} text-white shadow-lg ring-2 ring-white scale-[1.02]`
                        : 'bg-slate-900/95 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-lg drop-shadow-sm leading-none">{theme.emoji}</span>
                    <span className="text-[10px] font-black tracking-tight truncate w-full text-center leading-tight mt-0.5">
                      {language === 'ja' ? theme.nameJa : theme.nameEn}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className="w-2 h-2 rounded-full border border-black/40"
                        style={{ backgroundColor: `#${theme.colorHex.toString(16).padStart(6, '0')}` }}
                      />
                      <span
                        className="w-2 h-2 rounded-full border border-black/40"
                        style={{ backgroundColor: `#${theme.helmetHex.toString(16).padStart(6, '0')}` }}
                      />
                      <span
                        className="w-2 h-2 rounded-full border border-black/40"
                        style={{ backgroundColor: `#${theme.rimHex.toString(16).padStart(6, '0')}` }}
                      />
                    </div>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-bold text-amber-300/90 text-center">
              {t(
                '👉 Watch your 3D kart in the center change colors live!',
                '👉 まんなかの3Dマシンがリアルタイムで色チェンジするよ！'
              )}
            </p>
          </div>

          {/* CENTER SHOWROOM WINDOW: Unobstructed 3D Orbiting Kart + Bottom Nameplate Pill */}
          <div className="flex-1 min-w-[170px] flex flex-col items-center justify-end pb-1 pointer-events-none">
            <div className="px-4 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-amber-400/50 text-center shadow-2xl">
              <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black text-white">
                <span>{activeTheme.emoji}</span>
                <span>{language === 'ja' ? activeTheme.nameJa : activeTheme.nameEn}</span>
              </div>
              <p className="text-[10px] font-bold text-amber-300 mt-0.5">
                {language === 'ja' ? activeTheme.taglineJa : activeTheme.taglineEn}
              </p>
            </div>
          </div>

          {/* RIGHT WING: Stacked [2x4 English Greetings] + [Compact 3-Step How to Play] */}
          <div className="w-[275px] lg:w-[350px] xl:w-[385px] shrink-0 flex flex-col gap-2.5 pointer-events-auto">
            {player.teamId && TEAM_PRESETS[player.teamId] && (
              <div className="w-full p-2 rounded-2xl border flex items-center justify-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-lg shrink-0">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('Team:', 'チーム:')}
                </span>
                <span className="text-base">{TEAM_PRESETS[player.teamId].emoji}</span>
                <span className={`text-xs sm:text-sm font-black ${TEAM_PRESETS[player.teamId].text}`}>
                  {language === 'ja' ? TEAM_PRESETS[player.teamId].jaName : TEAM_PRESETS[player.teamId].name}
                </span>
              </div>
            )}

            {/* Top Card on Right Wing: Wrapped 2x4 English Greetings */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-xl text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-amber-500" />
                  <span>{t('Send Greeting to TV:', '黒板に英語メッセージを送ろう！')}</span>
                </span>
                {selectedGreeting && (
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 font-mono truncate max-w-[110px]">
                    ✓ {selectedGreeting}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {PRE_GAME_GREETINGS.map((g) => {
                  const isSelected = selectedGreeting === g.text;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectGreeting(g.text)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95 cursor-pointer border text-left truncate flex items-center justify-between gap-1 ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs ring-2 ring-amber-300'
                          : 'bg-slate-50 hover:bg-amber-50/60 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{g.text}</span>
                      {language === 'ja' && (
                        <span className="text-[10px] font-normal opacity-75 shrink-0">
                          {g.jaText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Card on Right Wing: Compact How to Play */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-3 lg:p-3.5 shadow-xl text-left flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <span>{isTimeTrial ? '⏱️' : '🏎️'}</span>
                  <span>
                    {isTimeTrial
                      ? t(`3D Time Trial (${timeLimitSeconds}s)`, `鈴鹿GP 3Dタイムアタック (${timeLimitSeconds}秒)`)
                      : t(`3D Suzuka GP (${targetLaps3D} Lap${targetLaps3D > 1 ? 's' : ''})`, `鈴鹿GP 周回レース (${targetLaps3D}周)`)}
                  </span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                  {t('How to Play', 'あそびかた')}
                </span>
              </div>

              {isGrandPrix3D && (() => {
                const trackStage = getTrackTheme(sprintSettings?.trackTheme);
                const renderJaStageName = (id: SuzukaTrackThemeId) => {
                  switch (id) {
                    case 'SUZUKA_SPRING_DAY':
                      return <><ruby>春<rt>はる</rt></ruby>のさくらGP</>;
                    case 'TOKYO_NIGHT_LIGHTS':
                      return <>ナイト<ruby>照明<rt>しょうめい</rt></ruby>GP</>;
                    case 'AUTUMN_MOMIJI_SUNSET':
                      return <><ruby>紅葉<rt>こうよう</rt></ruby>サンセットGP</>;
                    case 'HOKKAIDO_WINTER_SNOW':
                      return <><ruby>雪景色<rt>ゆきげしき</rt></ruby>ウィンターGP</>;
                  }
                };
                return (
                  <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-slate-900 text-amber-300 border border-slate-700 text-[11px] font-black">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <span>{trackStage.emoji}</span>
                      <span>
                        {language === 'ja' ? (
                          <><ruby>今回<rt>こんかい</rt></ruby>の<ruby>舞台<rt>ぶたい</rt></ruby>:</>
                        ) : (
                          'Circuit Stage:'
                        )}
                      </span>
                    </span>
                    <span className="text-white truncate">
                      {language === 'ja' ? renderJaStageName(trackStage.id) : trackStage.nameEn}
                    </span>
                  </div>
                );
              })()}

              <div className="space-y-2 text-xs leading-snug text-slate-800 dark:text-slate-100 font-bold">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    {language === 'ja'
                      ? '⚡ 待ち時間なし！iPadにどんどん問題が出るから、マイペースで早押ししてスピードアップ！'
                      : '⚡ No waiting! Answer rapid-fire questions on your iPad to build speed!'}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    {isTimeTrial
                      ? language === 'ja'
                        ? `⏱️ ${timeLimitSeconds}秒の制限時間がゼロになるまで走り続けて、走行距離を伸ばそう！`
                        : `⏱️ Race nonstop until the ${timeLimitSeconds}s timer expires to maximize distance!`
                      : language === 'ja'
                      ? `🗺️ 正解すると3D鈴鹿サーキットでマシンが加速・前進！鈴鹿を${targetLaps3D}周走り抜いてチェッカーフラッグを目指そう！`
                      : `🗺️ Correct answers boost your kart! Complete ${targetLaps3D} lap(s) around Suzuka!`}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    {isTimeTrial
                      ? language === 'ja'
                        ? '🏆 制限時間内に最も遠くまで走り抜けたレーサーが優勝！'
                        : '🏆 The racer who covers the greatest distance wins!'
                      : language === 'ja'
                      ? `🏁 先頭がゴールすると${graceSeconds}秒のカウントダウンが開始！時間内にゴールを受けよう！`
                      : `🏁 Once leaders finish, a ${graceSeconds}s countdown begins—finish in time!`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Non-Sprint Modes (Kahoot / Tug of War / Tamaire): Centered Lobby Card with Wrapped Greetings */
        <div className="w-full max-w-3xl mx-auto my-auto bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border-4 border-slate-100 dark:border-slate-800 flex flex-col gap-3 pointer-events-auto">
          <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-amber-500" />
                <span>{t('Send English Greeting to Screen:', '黒板に英語メッセージを送ろう！')}</span>
              </span>
              {selectedGreeting && (
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                  ✓ {selectedGreeting}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PRE_GAME_GREETINGS.map((g) => {
                const isSelected = selectedGreeting === g.text;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectGreeting(g.text)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer border truncate ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm ring-2 ring-amber-300'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <span>{g.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {player.teamId && TEAM_PRESETS[player.teamId] && (
            <div className="w-full p-2.5 rounded-xl border text-center flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">{t('Your Team:', 'チーム:')}</span>
              <span className="text-lg">{TEAM_PRESETS[player.teamId].emoji}</span>
              <span className={`text-sm font-black ${TEAM_PRESETS[player.teamId].text}`}>
                {language === 'ja' ? TEAM_PRESETS[player.teamId].jaName : TEAM_PRESETS[player.teamId].name}
              </span>
            </div>
          )}

          {/* How to Play for Kahoot / Tug of War / Tamaire / Anticipation */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700/80 p-4 text-left space-y-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
            <div className="font-black text-indigo-600 dark:text-indigo-400">
              {isAnticipation ? (
                language === 'ja' ? (
                  <>✏️ アンティシペーション（お<ruby>絵<rt>え</rt></ruby>かき<ruby>推測<rt>すいそく</rt></ruby>）</>
                ) : (
                  '✏️ Anticipation Sketch & Board'
                )
              ) : isVolleyball ? (
                t('🧺 Undokai Bean Bag Toss (Tamaire)', '🧺 運動会 玉入れバトル')
              ) : isTug ? (
                t('🚩 Undokai Tug of War', '🚩 運動会 綱引きバトル')
              ) : (
                t('📺 Live Arena Quiz', '📺 みんなで一斉クイズ！')
              )}
            </div>
            <p>
              {isAnticipation ? (
                language === 'ja' ? (
                  <>
                    1. 前のテレビやiPadで<ruby>線<rt>せん</rt></ruby>や点つなぎのスケッチが<ruby>完成<rt>かんせい</rt></ruby>するまえに、<ruby>正<rt>ただ</rt></ruby>しい英単語をスピード<ruby>回答<rt>かいとう</rt></ruby>！（おてつきは2.5<ruby>秒<rt>びょう</rt></ruby>ストップ）
                  </>
                ) : (
                  '1. Guess the English word while the progressive sketch or connect-the-dots draws! Wrong guesses lock your pad for 2.5s.'
                )
              ) : isVolleyball ? (() => {
                const fumbleSec = Math.max(2.5, tamaireSettings?.missLockoutSeconds ?? 2.5);
                const fumbleLabel = Number.isInteger(fumbleSec) ? `${fumbleSec}` : fumbleSec.toFixed(1);
                return t(
                  `1. Answer on your iPad in 3 steps (Scoop → Aim → Throw) to toss bean bags into your team basket! (Fumbles lock for ${fumbleLabel}s)`,
                  `1. 3ステップ（①玉を拾う → ②狙う → ③投げる）で正解してお手玉をカゴへ投げ入れよう！（お手つきは${fumbleLabel}秒ストップ）`
                );
              })() : isTug ? (() => {
                const mudSec = Math.max(2.5, tugOfWarSettings?.mudLockoutSeconds ?? 2.5);
                const mudLabel = Number.isInteger(mudSec) ? `${mudSec}` : mudSec.toFixed(1);
                return t(
                  `1. Every correct answer pulls the rope toward your team on the big screen! (Mistakes slip in mud for ${mudLabel}s)`,
                  `1. 正解するとテレビのロープをグイッと引き寄せる！誤答は泥で${mudLabel}秒ストップ！`
                );
              })() : (
                t('1. Look at the front TV for the question, then tap the matching shape/answer on your iPad!', '1. 前のテレビで問題を見て、手元のiPadで答えをタップしよう！')
              )}
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditProfileOpen && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          profile={currentProfile}
          onClose={() => setIsEditProfileOpen(false)}
          onUpdated={handleProfileUpdated}
        />
      )}
      {isShopOpen && (
        <EigoShopModal
          isOpen={isShopOpen}
          profile={currentProfile}
          onClose={() => setIsShopOpen(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
      {isPassportOpen && (
        <StudentStatsModal
          isOpen={isPassportOpen}
          profile={currentProfile}
          onClose={() => setIsPassportOpen(false)}
        />
      )}
    </div>
  );
};
