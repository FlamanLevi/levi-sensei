import React, { useState, useEffect } from 'react';
import { prewarmSuzukaAssets } from '@/games/suzuka_grand_prix/engine/Suzuka3DEngine';
import { prewarmMicroKartAssets } from '@/games/suzuka_grand_prix/engine/MicroKartBuilder.js';
import { QuizPlayer, TEAM_PRESETS, SprintSettings, GamePlayType, PRE_GAME_GREETINGS } from '../types';
import { LogOut, Volume2, CheckCircle2, Sparkles, Edit3, ShoppingBag, Award, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { soundEffects } from '@/services/soundEffects';
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

interface QuizStudentLobbyProps {
  roomCode: string;
  player: QuizPlayer;
  gamePlayType?: GamePlayType;
  sprintSettings?: SprintSettings;
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

  const isTug = gamePlayType === 'TUG_OF_WAR';
  const isVolleyball = gamePlayType === 'VOLLEYBALL';
  const isGrandPrix3D = gamePlayType === 'GRAND_PRIX_3D';
  const isSprint = gamePlayType === 'SPRINT_RACE' || isGrandPrix3D;
  const isTimeTrial = isSprint && sprintSettings?.sprintMode === 'TIME_TRIAL';
  const targetLaps3D = sprintSettings?.targetLaps3D || 1;
  const questionCount = sprintSettings?.lapCount && sprintSettings.lapCount > 0 
    ? sprintSettings.lapCount 
    : (totalQuestions || 20);
  const graceSeconds = sprintSettings?.graceCountdownSeconds || 15;
  const timeLimitSeconds = sprintSettings?.timeLimitSeconds || 60;
  const requiredFinishers = (totalStudents && totalStudents > 1)
    ? Math.min(12, Math.max(1, Math.ceil(totalStudents * 0.5)))
    : 12;

  useEffect(() => {
    if (gamePlayType === 'GRAND_PRIX_3D') {
      prewarmSuzukaAssets();
      prewarmMicroKartAssets();
    }
  }, [gamePlayType]);

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
    setTimeout(() => setAudioTested(false), 2500);
  };

  const currentProfile: StudentProfile = savedProfile || {
    schoolId: 'futakotamagawa',
    classId: '6-1',
    attendanceNumber: player.attendanceNumber || 0,
    nickname: player.nickname,
    avatar: player.avatar || '🇯🇵',
    callsign: `${player.attendanceNumber || 1}`,
    xp: 0,
    level: 1,
    gold: 0,
    boundAt: Date.now()
  };

  const handleProfileUpdated = (newProfile: StudentProfile) => {
    setSavedProfile(newProfile);
    onUpdatePlayerProfile?.({
      nickname: newProfile.nickname,
      avatar: newProfile.avatar,
      frame: newProfile.equipped?.frame,
      title: newProfile.equipped?.title,
      callsign: newProfile.callsign
    });
  };

  const handleSelectGreeting = (greetingText: string) => {
    soundEffects.playTick();
    const next = selectedGreeting === greetingText ? null : greetingText;
    setSelectedGreeting(next);
    onUpdatePlayerProfile?.({ greeting: next || '' });
  };

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto p-2 sm:p-4 select-none flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
      {/* Main Container Card */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-4 shadow-2xl border-4 border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
        {/* Top Header Row with Player Info, Waiting Indicator, PIN & High-Contrast Leave Button */}
        <div className="w-full flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          {/* Left: Avatar + Player Info + Quick Edit Profile Button */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTick();
                setIsEditProfileOpen(true);
              }}
              className="relative shrink-0 group cursor-pointer focus:outline-hidden"
              title={t('Click to edit profile', 'プロフィール・アイコンを変更')}
            >
              <AvatarDisplay
                avatar={player.avatar || (isSprint ? activeTheme.emoji : '🇯🇵')}
                frameId={player.frame}
                sizeClassName="w-10 sm:w-11 h-10 sm:h-11 text-xl sm:text-2xl group-hover:scale-105 transition-transform"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white text-[8px] font-black shadow-xs group-hover:bg-purple-500">
                ✏️
              </div>
            </button>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                  {t("YOU'RE IN!", "参加完了！")}
                </span>
                {player.title && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 leading-none truncate max-w-[120px]">
                    {getShopItemById(player.title)?.jaName || player.title}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight flex items-center gap-1.5">
                  <span>{player.nickname}</span>
                  {typeof player.attendanceNumber === 'number' && player.attendanceNumber > 0 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      #{player.attendanceNumber}
                    </span>
                  )}
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setIsEditProfileOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[11px] sm:text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                  title={t('Edit nickname, callsign & avatar', '名前やアイコンを変更する')}
                >
                  <Edit3 size={12} />
                  <span>{t('Edit Profile', <><ruby>名前<rt className="text-[7px] font-normal text-purple-400">なまえ</rt></ruby>・アイコン<ruby>変更<rt className="text-[7px] font-normal text-purple-400">へんこう</rt></ruby></>)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTick();
                    setIsPassportOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-[11px] sm:text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                  title={t('View Student Passport & Badges', '学習カルテ・バッジを見る')}
                >
                  <Award size={12} />
                  <span>{t('Passport', <><ruby>実績<rt className="text-[7px] font-normal text-teal-400">じっせき</rt></ruby></>)}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center: Waiting Pulse Badge */}
          <div className="hidden md:flex px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 animate-ping shrink-0" />
            <p className="text-xs font-black text-purple-900 dark:text-purple-200 whitespace-nowrap">
              {t(
                'Waiting for teacher to start!',
                <span><ruby>先生<rt className="text-[7px] font-normal text-purple-400">せんせい</rt></ruby>がスタートするのを<ruby>待<rt className="text-[7px] font-normal text-purple-400">ま</rt></ruby>ってね！</span>
              )}
            </p>
          </div>

          {/* Right Cluster: Room PIN Badge + Quiet Classroom Status + Shop + Audio Test + Leave */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTick();
                setIsShopOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
              title={t('Open Eigo Shop & Lucky Gacha', 'えいごショップ＆ラッキーガチャを開く')}
            >
              <ShoppingBag size={13} />
              <span className="hidden sm:inline">{t('Shop', 'ショップ')}</span>
              <span className="font-mono text-[11px] font-black bg-white/40 px-1.5 py-0.2 rounded-md">
                {currentProfile.gold || 0}G
              </span>
            </button>
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              title={t('Classroom Quiet Audio Mode is active: sound effects are capped to gentle whispers to keep the classroom focused.', '教室静音モード中：教室が騒がしくならないよう、手元の効果音はささやき音量（0.04）に自動制限されています。')}
            >
              🤫 <span>{t('Quiet Mode', '教室静音')}</span>
            </span>

            <span className="text-xs font-mono font-black px-2.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-xs">
              PIN: {roomCode}
            </span>

            <button
              type="button"
              onClick={handleTestAudio}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 border cursor-pointer shrink-0 ${
                audioTested
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={t('Test iPad speaker audio volume', 'スピーカーの音量を確認する')}
            >
              {audioTested ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>{t('Audio OK! ♫', '音OK! ♫')}</span>
                </>
              ) : (
                <>
                  <Volume2 size={12} className="text-indigo-500" />
                  <span>{t('🔊 Sound', '🔊 音テスト')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLeave}
              className="flex items-center gap-1 text-xs font-black text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              title={t('Leave game', 'ゲームを退出する')}
            >
              <LogOut size={12} />
              <span>{t('Leave', '退出')}</span>
            </button>
          </div>
        </div>

        {/* Pre-Game English Greeting Phrase Carousel */}
        <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2 sm:p-2.5 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-1.5 text-left shadow-2xs">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-amber-500" />
              <span>{t('Send English Greeting to Screen:', <><ruby>黒板<rt className="text-[7px]">こくばん</rt></ruby>に<ruby>英語<rt className="text-[7px]">えいご</rt></ruby>メッセージを<ruby>送<rt className="text-[7px]">おく</rt></ruby>ろう！</>)}</span>
            </span>
            {selectedGreeting && (
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 font-mono animate-in fade-in">
                ✓ {selectedGreeting}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {PRE_GAME_GREETINGS.map((g) => {
              const isSelected = selectedGreeting === g.text;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelectGreeting(g.text)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all active:scale-95 cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm scale-102 ring-2 ring-amber-300'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                  title={language === 'ja' ? g.jaText : g.text}
                >
                  <span>{g.text}</span>
                  {language === 'ja' && (
                    <span className="ml-1 text-[9px] font-normal opacity-70">
                      ({g.jaText})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Banner (if Team Mode) */}
        {player.teamId && TEAM_PRESETS[player.teamId] && (
          <div className="w-full p-2 rounded-xl border text-center flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {t('Your Team:', 'チーム:')}
            </span>
            <span className="text-lg">{TEAM_PRESETS[player.teamId].emoji}</span>
            <span className={`text-xs sm:text-sm font-black ${TEAM_PRESETS[player.teamId].text}`}>
              {language === 'ja' ? TEAM_PRESETS[player.teamId].jaName : TEAM_PRESETS[player.teamId].name}
            </span>
          </div>
        )}

        {/* Two-Column Body: Left = Pit Garage (5x3), Right = How to Play Guide */}
        <div className={`w-full grid ${isSprint ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3 items-stretch`}>
          {/* Left Column: Pit Garage (5x3 Grid = 15 Karts) */}
          {isSprint && (
            <div className="rounded-2xl bg-slate-950 border-2 border-slate-800 p-2.5 sm:p-3 flex flex-col justify-between shadow-xl text-left">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🏎️</span>
                  <span className="text-xs font-black text-white">
                    {t('Pit Garage: Choose Kart (15 Cars)', 'ピットガレージ: マイマシン (全15台)')}
                  </span>
                </div>
                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {language === 'ja' ? activeTheme.nameJa : activeTheme.nameEn}
                </span>
              </div>

              {/* 5x3 Curated Presets Grid */}
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5 my-1.5">
                {KART_THEME_LIST.map((theme) => {
                  const isSelected = selectedKartTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectKartTheme(theme.id)}
                      className={`relative p-1 sm:p-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none active:scale-95 ${
                        isSelected
                          ? `bg-gradient-to-tr ${theme.accentBg} text-white shadow-lg ring-2 ring-white scale-102`
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base sm:text-lg drop-shadow-sm leading-none">{theme.emoji}</span>
                      <span className="text-[9px] sm:text-[10px] font-black tracking-tight truncate w-full text-center leading-tight">
                        {language === 'ja' ? theme.nameJa : theme.nameEn}
                      </span>
                      {/* Color Swatch Dots (Body, Helmet, Rims) */}
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full border border-black/30 shrink-0"
                          style={{ backgroundColor: `#${theme.colorHex.toString(16).padStart(6, '0')}` }}
                          title="Body"
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full border border-black/30 shrink-0"
                          style={{ backgroundColor: `#${theme.helmetHex.toString(16).padStart(6, '0')}` }}
                          title="Helmet"
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full border border-black/30 shrink-0"
                          style={{ backgroundColor: `#${theme.rimHex.toString(16).padStart(6, '0')}` }}
                          title="Rims"
                        />
                      </div>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center shadow-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[9px] font-bold text-slate-400 text-center">
                {t(
                  'Your custom kart appears on the classroom screen!',
                  'えらんだマシンが教室のテレビや黒板に登場するよ！'
                )}
              </p>
            </div>
          )}

          {/* Right Column: Dynamic Mode-Aware 3-Step Visual Guide Card */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700/80 p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all">
            {/* Mode Header Badge */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {isVolleyball ? (
                  <>
                    <span>🧺</span>
                    <span>
                      {language === 'ja' ? (
                        /* [ANTIGRAVITY REFACTOR]: Replaced Volleyball lobby badge with Undokai Bean Bag Toss (玉入れ) */
                        <><ruby>運動会<rt className="text-[7px] font-normal text-indigo-400">うんどうかい</rt></ruby> <ruby>玉入<rt className="text-[7px] font-normal text-indigo-400">たまい</rt></ruby>れバトル</>
                      ) : (
                        'Undokai Bean Bag Toss (Tamaire)'
                      )}
                    </span>
                  </>
                ) : isTug ? (
                  <>
                    <span>🚩</span>
                    <span>
                      {language === 'ja' ? (
                        <><ruby>運動会<rt className="text-[7px] font-normal text-indigo-400">うんどうかい</rt></ruby> <ruby>綱引<rt className="text-[7px] font-normal text-indigo-400">つなひ</rt></ruby>きバトル</>
                      ) : (
                        'Undokai Tug of War'
                      )}
                    </span>
                  </>
                ) : !isSprint ? (
                  <>
                    <span>📺</span>
                    <span>
                      {language === 'ja' ? (
                        <>みんなで<ruby>一斉<rt className="text-[7px] font-normal text-indigo-400">いっせい</rt></ruby>クイズ！</>
                      ) : (
                        'Live Arena Mode'
                      )}
                    </span>
                  </>
                ) : isGrandPrix3D && isTimeTrial ? (
                  <>
                    <span>⏱️</span>
                    <span>
                      {language === 'ja' ? (
                        <><ruby>鈴鹿<rt className="text-[7px] font-normal text-indigo-400">すずか</rt></ruby>GP 3Dタイムアタック ({timeLimitSeconds}秒)</>
                      ) : (
                        `3D Suzuka Time Trial (${timeLimitSeconds}s)`
                      )}
                    </span>
                  </>
                ) : isGrandPrix3D ? (
                  <>
                    <span>🏎️</span>
                    <span>
                      {language === 'ja' ? (
                        <><ruby>鈴鹿<rt className="text-[7px] font-normal text-indigo-400">すずか</rt></ruby>GP 周回レース ({targetLaps3D}周)</>
                      ) : (
                        `3D Suzuka Grand Prix (${targetLaps3D} ${targetLaps3D === 1 ? 'Lap' : 'Laps'})`
                      )}
                    </span>
                  </>
                ) : isTimeTrial ? (
                  <>
                    <span>⏱️</span>
                    <span>
                      {language === 'ja' ? (
                        <><ruby>スプリント タイムアタック<rt className="text-[7px] font-normal text-indigo-400">たいむあたっく</rt></ruby> ({timeLimitSeconds}秒)</>
                      ) : (
                        `Sprint Time Trial (${timeLimitSeconds}s)`
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <span>🏎️</span>
                    <span>
                      {language === 'ja' ? (
                        <><ruby>スプリントレース<rt className="text-[7px] font-normal text-indigo-400">すぷりんとれーす</rt></ruby> (全{questionCount}問)</>
                      ) : (
                        `Sprint Race (${questionCount} Questions)`
                      )}
                    </span>
                  </>
                )}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t('How to Play', 'あそびかた')}
              </span>
            </div>

            {/* 3 Step Visual Sequence */}
            <div className="flex flex-col gap-2 text-xs sm:text-[13px] leading-snug flex-1 justify-around">
              {/* Step 1 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  {isVolleyball ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🔴 <ruby>赤組<rt className="text-[7px] font-normal text-slate-400">あかぐみ</rt></ruby> vs ⚪ <ruby>白組<rt className="text-[7px] font-normal text-slate-400">しろぐみ</rt></ruby> のチーム<ruby>対抗戦<rt className="text-[7px] font-normal text-slate-400">たいこうせん</rt></ruby>！<ruby>自分<rt className="text-[7px] font-normal text-slate-400">じぶん</rt></ruby>のチームのハチマキとカゴを<ruby>確認<rt className="text-[7px] font-normal text-slate-400">かくにん</rt></ruby>しよう！
                        </>
                      ) : (
                        '🔴 Red vs ⚪ White Team battle! Check your team headband and basket on screen!'
                      )}
                    </p>
                  ) : isTug ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🔴 <ruby>赤組<rt className="text-[7px] font-normal text-slate-400">あかぐみ</rt></ruby> vs ⚪ <ruby>白組<rt className="text-[7px] font-normal text-slate-400">しろぐみ</rt></ruby> のチーム<ruby>対抗戦<rt className="text-[7px] font-normal text-slate-400">たいこうせん</rt></ruby>！<ruby>自分<rt className="text-[7px] font-normal text-slate-400">じぶん</rt></ruby>のチームのハチマキを<ruby>確認<rt className="text-[7px] font-normal text-slate-400">かくにん</rt></ruby>しよう！
                        </>
                      ) : (
                        '🔴 Red vs ⚪ White Team battle! Check your headband color on screen!'
                      )}
                    </p>
                  ) : !isSprint ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          👀 <ruby>前<rt className="text-[7px] font-normal text-slate-400">まえ</rt></ruby>のテレビで<ruby>問題<rt className="text-[7px] font-normal text-slate-400">もんだい</rt></ruby>を<ruby>見<rt className="text-[7px] font-normal text-slate-400">み</rt></ruby>て、iPadで<ruby>答<rt className="text-[7px] font-normal text-slate-400">こた</rt></ruby>えをタップ！
                        </>
                      ) : (
                        '👀 Look at the front TV for the question, then tap the answer on your iPad!'
                      )}
                    </p>
                  ) : (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          ⚡ <ruby>待<rt className="text-[7px] font-normal text-slate-400">ま</rt></ruby>ち<ruby>時間<rt className="text-[7px] font-normal text-slate-400">じかん</rt></ruby>なし！iPadにどんどん<ruby>問題<rt className="text-[7px] font-normal text-slate-400">もんだい</rt></ruby>が<ruby>出<rt>で</rt></ruby>るから、マイペースで<ruby>早押<rt className="text-[7px] font-normal text-slate-400">はやお</rt></ruby>ししてスピードアップ！
                        </>
                      ) : (
                        '⚡ No waiting! Questions appear rapid-fire on your iPad—answer as fast as you can to accelerate!'
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  {isVolleyball ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🧺 iPadでどんどん<ruby>正解<rt className="text-[7px] font-normal text-slate-400">せいかい</rt></ruby>してお<ruby>手玉<rt className="text-[7px] font-normal text-slate-400">てだま</rt></ruby>を投げ入れよう！3<ruby>問連続正解<rt className="text-[7px] font-normal text-slate-400">もんれんぞくせいかい</rt></ruby>で「金の玉」2個投げ！
                        </>
                      ) : (
                        '🧺 Answer rapidly on iPad to throw bean bags! 3-streaks unleash double Golden Bags!'
                      )}
                    </p>
                  ) : isTug ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          💪 <ruby>正解<rt className="text-[7px] font-normal text-slate-400">せいかい</rt></ruby>するとテレビのロープをグイッと<ruby>引<rt className="text-[7px] font-normal text-slate-400">ひ</rt></ruby>き<ruby>寄<rt className="text-[7px] font-normal text-slate-400">よ</rt></ruby>せる！どんどん<ruby>答<rt className="text-[7px] font-normal text-slate-400">こた</rt></ruby>えてチームに<ruby>貢献<rt className="text-[7px] font-normal text-slate-400">こうけん</rt></ruby>しよう！
                        </>
                      ) : (
                        '💪 Every correct answer yanks the rope towards your team on the TV!'
                      )}
                    </p>
                  ) : !isSprint ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          ⏳ <ruby>全員<rt className="text-[7px] font-normal text-slate-400">ぜんいん</rt></ruby>が<ruby>答<rt className="text-[7px] font-normal text-slate-400">こた</rt></ruby>えるまで<ruby>待<rt className="text-[7px] font-normal text-slate-400">ま</rt></ruby>ってね。テレビに<ruby>正解<rt className="text-[7px] font-normal text-slate-400">せいかい</rt></ruby>とクラスの<ruby>選<rt className="text-[7px] font-normal text-slate-400">えら</rt></ruby>んだ<ruby>結果<rt className="text-[7px] font-normal text-slate-400">けっか</rt></ruby>が<ruby>出<rt>で</rt></ruby>るよ！
                        </>
                      ) : (
                        '⏳ Wait for everyone to answer. The TV will show the correct answer and class stats!'
                      )}
                    </p>
                  ) : isGrandPrix3D && isTimeTrial ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          ⏱️ タイムアタック！{timeLimitSeconds}秒の<ruby>制限時間<rt className="text-[7px] font-normal text-slate-400">せいげんじかん</rt></ruby>がゼロになるまでエンドレスで走り<ruby>続<rt className="text-[7px] font-normal text-slate-400">つづ</rt></ruby>けて、<ruby>走行距離<rt className="text-[7px] font-normal text-slate-400">そうこうきょり</rt></ruby>の<ruby>限界<rt className="text-[7px] font-normal text-slate-400">げんかい</rt></ruby>に<ruby>挑<rt className="text-[7px] font-normal text-slate-400">いど</rt></ruby>もう！
                        </>
                      ) : (
                        `⏱️ Race against the clock! Keep answering nonstop until the ${timeLimitSeconds}s timer expires to maximize your distance!`
                      )}
                    </p>
                  ) : isGrandPrix3D ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🗺️ <ruby>正解<rt className="text-[7px] font-normal text-slate-400">せいかい</rt></ruby>すると3D<ruby>鈴鹿<rt className="text-[7px] font-normal text-slate-400">すずか</rt></ruby>サーキットでマシンが<ruby>加速<rt className="text-[7px] font-normal text-slate-400">かそく</rt></ruby>・<ruby>前進<rt className="text-[7px] font-normal text-slate-400">ぜんしん</rt></ruby>！<ruby>鈴鹿<rt className="text-[7px] font-normal text-slate-400">すずか</rt></ruby>を{targetLaps3D}周走り<ruby>抜<rt className="text-[7px] font-normal text-slate-400">ぬ</rt></ruby>いてチェッカーフラッグを<ruby>目指<rt className="text-[7px] font-normal text-slate-400">めざ</rt></ruby>そう！
                        </>
                      ) : (
                        `🗺️ Correct answers drive your kart forward on the 3D circuit! Complete ${targetLaps3D} ${targetLaps3D === 1 ? 'full lap' : 'full laps'} around Suzuka to cross the checkered flag!`
                      )}
                    </p>
                  ) : isTimeTrial ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🔄 <ruby>制限時間<rt className="text-[7px] font-normal text-slate-400">せいげんじかん</rt></ruby>がゼロになるまで、<ruby>何問<rt className="text-[7px] font-normal text-slate-400">なんもん</rt></ruby>でもエンドレスでチャレンジできるよ！
                        </>
                      ) : (
                        '🔄 Keep answering nonstop until the timer runs out—endless questions!'
                      )}
                    </p>
                  ) : (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🗺️ <ruby>正解<rt className="text-[7px] font-normal text-slate-400">せいかい</rt></ruby>するとマシンが<ruby>前進<rt className="text-[7px] font-normal text-slate-400">ぜんしん</rt></ruby>！<ruby>全<rt className="text-[7px] font-normal text-slate-400">ぜん</rt></ruby>{questionCount}<ruby>問<rt className="text-[7px] font-normal text-slate-400">もん</rt></ruby>クリアでゴール！
                        </>
                      ) : (
                        `🗺️ Correct answers move your car forward! Clear all ${questionCount} questions to finish!`
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  {isVolleyball ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          ⚠️ まちがえると「お手玉を落とす」ペナルティで2.5秒ストップ！試合終了後はドキドキの玉かぞえ！
                        </>
                      ) : (
                        '⚠️ Incorrect choices trigger a 2.5s fumbled bag delay! Finish with the dramatic counting ceremony!'
                      )}
                    </p>
                  ) : isTug ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          ⚠️ まちがえると「泥ですべる」ペナルティで2.5秒ストップ！あわてず<ruby>確実<rt className="text-[7px] font-normal text-slate-400">かくじつ</rt></ruby>に<ruby>答<rt className="text-[7px] font-normal text-slate-400">こた</rt></ruby>えてロープを<ruby>引<rt className="text-[7px] font-normal text-slate-400">ひ</rt></ruby>き<ruby>切<rt className="text-[7px] font-normal text-slate-400">き</rt></ruby>ろう！
                        </>
                      ) : (
                        '⚠️ Incorrect answers trigger a 2.5s mud slip lockout! Stay calm and pull with your team!'
                      )}
                    </p>
                  ) : !isSprint ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          ⭐ 1<ruby>問<rt className="text-[7px] font-normal text-slate-400">もん</rt></ruby>ごとのスピード＆<ruby>正解<rt className="text-[7px] font-normal text-slate-400">せいかい</rt></ruby>ポイント<ruby>勝負<rt className="text-[7px] font-normal text-slate-400">しょうぶ</rt></ruby>！どの<ruby>問題<rt className="text-[7px] font-normal text-slate-400">もんだい</rt></ruby>でも1<ruby>位<rt className="text-[7px] font-normal text-slate-400">い</rt></ruby>を<ruby>狙<rt className="text-[7px] font-normal text-slate-400">ねら</rt></ruby>えるよ！
                        </>
                      ) : (
                        '⭐ Fresh points every single question—speed & accuracy gives you a shot at #1 every round!'
                      )}
                    </p>
                  ) : isGrandPrix3D && isTimeTrial ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🏆 <ruby>制限時間内<rt className="text-[7px] font-normal text-slate-400">せいげんじかんない</rt></ruby>に3D<ruby>鈴鹿<rt className="text-[7px] font-normal text-slate-400">すずか</rt></ruby>サーキットを<ruby>最<rt className="text-[7px] font-normal text-slate-400">もっと</rt></ruby>も<ruby>遠<rt className="text-[7px] font-normal text-slate-400">とお</rt></ruby>くまで<ruby>走<rt className="text-[7px] font-normal text-slate-400">はし</rt></ruby>り<ruby>抜<rt className="text-[7px] font-normal text-slate-400">ぬ</rt></ruby>けたレーサーが<ruby>優勝<rt className="text-[7px] font-normal text-slate-400">ゆうしょう</rt></ruby>！
                        </>
                      ) : (
                        '🏆 Drive as far as possible! The racer who covers the greatest distance on the 3D circuit when time expires wins!'
                      )}
                    </p>
                  ) : isGrandPrix3D ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🏁 <ruby>先頭<rt className="text-[7px] font-normal text-slate-400">せんとう</rt></ruby>がゴールすると{graceSeconds}秒のポディウムカウントダウンが<ruby>開始<rt className="text-[7px] font-normal text-slate-400">かいし</rt></ruby>！<ruby>時間内<rt className="text-[7px] font-normal text-slate-400">じかんない</rt></ruby>にチェッカーフラッグを<ruby>受<rt className="text-[7px] font-normal text-slate-400">う</rt></ruby>けよう！
                        </>
                      ) : (
                        `🏁 Once lead racers cross the finish line, a ${graceSeconds}s podium countdown starts! Finish in time!`
                      )}
                    </p>
                  ) : isTimeTrial ? (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          🏆 <ruby>時間内<rt className="text-[7px] font-normal text-slate-400">じかんない</rt></ruby>に<ruby>一番<rt className="text-[7px] font-normal text-slate-400">いちばん</rt></ruby>たくさん<ruby>正解<rt className="text-[7px] font-normal text-slate-400">せいかい</rt></ruby>して、サーキットを<ruby>最<rt className="text-[7px] font-normal text-slate-400">もっと</rt></ruby>も<ruby>遠<rt className="text-[7px] font-normal text-slate-400">とお</rt></ruby>くまで<ruby>進<rt className="text-[7px] font-normal text-slate-400">すす</rt></ruby>んだ<ruby>人<rt className="text-[7px] font-normal text-slate-400">ひと</rt></ruby>が<ruby>優勝<rt className="text-[7px] font-normal text-slate-400">ゆうしょう</rt></ruby>！
                        </>
                      ) : (
                        '🏆 Answer the most questions correctly and travel the farthest before time runs out to win!'
                      )}
                    </p>
                  ) : (
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      {language === 'ja' ? (
                        <>
                          ⏱️ {totalStudents && totalStudents > 1 ? (
                            <>
                              <ruby>先頭<rt className="text-[7px] font-normal text-slate-400">せんとう</rt></ruby>から{requiredFinishers}<ruby>人<rt className="text-[7px] font-normal text-slate-400">にん</rt></ruby>
                            </>
                          ) : (
                            <>
                              <ruby>参加者<rt className="text-[7px] font-normal text-slate-400">さんかしゃ</rt></ruby>の<ruby>半数<rt className="text-[7px] font-normal text-slate-400">はんすう</rt></ruby>（<ruby>最大<rt className="text-[7px] font-normal text-slate-400">さいだい</rt></ruby>12<ruby>人<rt className="text-[7px] font-normal text-slate-400">にん</rt></ruby>）
                            </>
                          )}がゴールすると、ラスト{graceSeconds}<ruby>秒<rt className="text-[7px] font-normal text-slate-400">びょう</rt></ruby>のカウントダウン<ruby>開始<rt className="text-[7px] font-normal text-slate-400">かいし</rt></ruby>！<ruby>時間内<rt className="text-[7px] font-normal text-slate-400">じかんない</rt></ruby>にゴールを<ruby>目指<rt className="text-[7px] font-normal text-slate-400">めざ</rt></ruby>そう！
                        </>
                      ) : (
                        totalStudents && totalStudents > 1
                          ? `⏱️ Once ${requiredFinishers} racer${requiredFinishers > 1 ? 's' : ''} cross the finish line, a ${graceSeconds}s countdown starts! Finish in time!`
                          : `⏱️ Once half the racers (up to 12) cross the finish line, a ${graceSeconds}s countdown starts! Finish in time!`
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick In-Lobby Profile & Avatar Editor Modal */}
      {isEditProfileOpen && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          profile={currentProfile}
          onClose={() => setIsEditProfileOpen(false)}
          onUpdated={handleProfileUpdated}
        />
      )}

      {/* Quick In-Lobby Eigo Shop & Lucky Gacha Modal */}
      {isShopOpen && (
        <EigoShopModal
          isOpen={isShopOpen}
          profile={currentProfile}
          onClose={() => setIsShopOpen(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Quick In-Lobby Student Passport & Badges Modal */}
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
