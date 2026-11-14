import React, { useEffect, useState } from 'react';
import { QuizPlayer, GameMode, TeamAssignmentMode, TeamId, TEAM_PRESETS, RAINBOW_TEAM_ORDER, QuizScope, GamePlayType, QuizSubject, SprintSettings } from '../types';
import { MathGrade, MathDomain, MATH_GRADES, MATH_DOMAINS } from '../mathTypes';
import { SCHOOL_CONFIGS, SchoolId, getClassSize } from '@/types/roster';
import { fetchClassBoundNumbers } from '@/services/studentProfile';
import { Users, Play, X, QrCode, School, RefreshCw, Settings, Bot } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import QRCode from 'qrcode';
import { prewarmSuzukaAssets } from '@/games/suzuka_grand_prix/engine/Suzuka3DEngine';
import { prewarmMicroKartAssets } from '@/games/suzuka_grand_prix/engine/MicroKartBuilder.js';
import { resolveRacerNumber } from '@/games/suzuka_grand_prix/kartPresets';
import { getTrackTheme, TIME_OF_DAY_LIST, PRECIPITATION_LIST } from '@/games/suzuka_grand_prix/trackThemes';
import { BotDifficulty } from '../hooks/useQuizBotSimulator';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { ClassVaultState, subscribeClassVault, getNextTierTarget } from '@/services/classVault';

interface QuizHostLobbyProps {
  roomCode: string;
  grade: string;
  unit: string;
  subject?: QuizSubject;
  mathGrade?: MathGrade;
  mathDomain?: MathDomain;
  schoolId?: SchoolId;
  classId?: string;
  gameMode?: GameMode;
  gamePlayType?: GamePlayType;
  sprintSettings?: SprintSettings;
  teamAssignment?: TeamAssignmentMode;
  teamCount?: number;
  activeTeams?: TeamId[];
  vocabularyScope?: QuizScope;
  selectedUnits?: string[];
  totalQuestions?: number;
  players: Record<string, QuizPlayer>;
  botCount?: number;
  onAddBots?: (count: number, difficulty?: BotDifficulty | 'mixed') => void;
  onClearBots?: () => void;
  onStart: () => void;
  onEditSettings?: () => void;
  onKickPlayer: (playerId: string) => void;
  onChangePlayerTeam?: (playerId: string, newTeamId: TeamId) => void;
  eyesUp?: boolean;
  onToggleEyesUp?: () => void;
  isStudentHost?: boolean;
  onCancel: () => void;
}

export const QuizHostLobby: React.FC<QuizHostLobbyProps> = ({
  roomCode,
  grade,
  unit,
  subject,
  mathGrade,
  mathDomain,
  schoolId,
  classId,
  isStudentHost = false,
  gameMode = 'INDIVIDUAL',
  gamePlayType,
  sprintSettings,
  teamAssignment = 'AUTO_BALANCE',
  teamCount = 2,
  activeTeams: propsActiveTeams,
  vocabularyScope,
  selectedUnits,
  totalQuestions,
  players,
  botCount = 0,
  onAddBots,
  onClearBots,
  onStart,
  onEditSettings,
  onKickPlayer,
  onChangePlayerTeam,
  eyesUp,
  onToggleEyesUp,
  onCancel
}) => {
  const { t, language } = useLanguage();
  const playerList = Object.values(players);
  const schoolConfig = schoolId ? SCHOOL_CONFIGS[schoolId] : null;

  // Dynamically resolve actual registered roster size (e.g. 30 registered in 6-1 -> capacity is 30, not 31 or 35!)
  const [registeredRosterCount, setRegisteredRosterCount] = useState<number | null>(null);

  useEffect(() => {
    if (schoolId && classId && !isStudentHost) {
      fetchClassBoundNumbers(schoolId, classId).then((claims) => {
        const count = Object.keys(claims || {}).length;
        if (count > 0) {
          setRegisteredRosterCount(count);
        }
      }).catch(() => {});
    }
  }, [schoolId, classId, isStudentHost]);

  // Subscribe to shared Class Energy Vault
  const [classVault, setClassVault] = useState<ClassVaultState | null>(null);
  useEffect(() => {
    if (!schoolId || !classId) return;
    const unsub = subscribeClassVault(schoolId, classId, (vault) => {
      setClassVault(vault);
    });
    return () => unsub();
  }, [schoolId, classId]);

  const vaultTierInfo = classVault ? getNextTierTarget(classVault.totalEnergy) : null;

  const configuredSize = getClassSize(schoolId, classId);
  const expectedCapacity = registeredRosterCount !== null && registeredRosterCount > 0
    ? registeredRosterCount
    : configuredSize;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Generate high-resolution, high-contrast QR Code (480px) linking directly to student portal
  useEffect(() => {
    const origin = window.location.origin;
    const directJoinUrl = isStudentHost
      ? `${origin}/?pin=${roomCode}`
      : `${origin}/?pin=${roomCode}${classId ? `&class=${classId}` : ''}${schoolId ? `&school=${schoolId}` : ''}`;
    QRCode.toDataURL(directJoinUrl, {
      width: 480,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(() => {});
  }, [roomCode, classId, schoolId, isStudentHost]);

  // Preload & pre-warm 3D circuit assets during lobby waiting
  useEffect(() => {
    if (gamePlayType === 'GRAND_PRIX_3D') {
      prewarmSuzukaAssets(sprintSettings?.trackTheme);
      prewarmMicroKartAssets();
    }
  }, [gamePlayType, sprintSettings?.trackTheme]);

  // Keyboard shortcut: Press Space or Enter to start game (ignore inputs/buttons/repeats)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  const isTwoTeamUndokai = gamePlayType === 'TUG_OF_WAR' || gamePlayType === 'TAMAIRE' || gamePlayType === 'VOLLEYBALL';
  const activeTeams: TeamId[] = isTwoTeamUndokai
    ? ['team_red', 'team_white']
    : (propsActiveTeams || (teamCount === 2 ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, teamCount || 2)));
  const teams: TeamId[] = activeTeams;

  const cycleTeam = (currentTeamId?: TeamId): TeamId => {
    const list: TeamId[] = activeTeams.length > 0 ? activeTeams : (isTwoTeamUndokai ? ['team_red', 'team_white'] : RAINBOW_TEAM_ORDER.slice(0, 2));
    const idx = currentTeamId ? list.indexOf(currentTeamId) : -1;
    return list[(idx + 1) % list.length];
  };

  return (
    <div className="flex flex-col w-full h-full min-h-0 max-w-7xl mx-auto px-3 sm:px-5 py-2 sm:py-3 text-slate-900 dark:text-white select-none overflow-hidden">
      {/* Top Header Bar with prominent START GAME + Settings + Cancel */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex-nowrap">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar flex-nowrap">
          {isStudentHost ? (
            <span className="text-xs font-black px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 shrink-0 whitespace-nowrap">
              <span>👑</span>
              <span>{t('Table Leader Game', '班のリーダー対戦')}</span>
            </span>
          ) : schoolConfig && classId ? (
            <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 shrink-0 whitespace-nowrap">
              <School size={13} />
              <span>{language === 'ja' ? schoolConfig.shortKanji : schoolConfig.name.split(' ')[0]}</span>
              <span>{classId}</span>
            </span>
          ) : null}
          {subject === 'MATH' ? (() => {
            const gMeta = MATH_GRADES[mathGrade || 'G1'];
            const dMeta = MATH_DOMAINS[mathDomain || 'ALL'];
            return (
              <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap">
                <span>📐</span>
                <span>{language === 'ja' ? `${gMeta?.badge || '小1'} 算数` : `${gMeta?.labelEn || 'Grade 1'} Math`}</span>
                <span>•</span>
                <span>{language === 'ja' ? (dMeta?.nameJa || '全領域') : (dMeta?.nameEn || 'All Domains')}</span>
              </span>
            );
          })() : (
            <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0 whitespace-nowrap">
              {grade} {vocabularyScope !== 'CUSTOM_UNITS' && unit !== 'ALL' ? `• ${unit}` : ''}
            </span>
          )}
          {vocabularyScope && vocabularyScope !== 'CURRENT' && (
            <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shrink-0 whitespace-nowrap">
              {vocabularyScope === 'CUSTOM_UNITS' ? `📦 ${selectedUnits?.length || 0} ${language === 'ja' ? '単元バンドル' : 'Units'}` :
               vocabularyScope === 'PRIOR_REVIEW' ? '⏪ ' + (language === 'ja' ? '過去学年復習' : 'Prior Review') :
               vocabularyScope === 'ALL_ELEMENTARY' ? '🌟 ' + (language === 'ja' ? '小3〜小6 全単語' : 'All Elementary') :
               '📖 ' + (language === 'ja' ? '学年全単元' : 'All Units')}
            </span>
          )}
          <span className={`text-xs font-black px-3 py-1 rounded-full border shrink-0 whitespace-nowrap ${
            gameMode === 'TEAM' 
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
              : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
          }`}>
            {gameMode === 'TEAM' 
              ? (language === 'ja'
                  ? `👥 チーム対抗 (${teamAssignment === 'STUDENT_CHOICE' ? 'じぶんえらび' : '自動配分'})`
                  : `👥 Team Battle (${teamAssignment === 'STUDENT_CHOICE' ? 'Choice' : 'Auto'})`) 
              : t('👤 Individual Mode', '👤 個人戦')}
          </span>
          {gamePlayType === 'GRAND_PRIX_3D' && (() => {
            const trackTheme = getTrackTheme(sprintSettings?.trackTheme);
            const todItem = TIME_OF_DAY_LIST.find((x) => x.id === (sprintSettings?.timeOfDay || 'LE_MANS_CYCLE'));
            const precipItem = PRECIPITATION_LIST.find((x) => x.id === (sprintSettings?.precipitation || trackTheme.defaultPrecipitation));
            return (
              <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-amber-300 border border-amber-400/40 shrink-0 whitespace-nowrap flex items-center gap-1.5">
                <span>{trackTheme.emoji}</span>
                <span>{language === 'ja' ? trackTheme.shortJa : trackTheme.shortEn}</span>
                {todItem && (
                  <>
                    <span className="opacity-50">·</span>
                    <span>{todItem.emoji}</span>
                    <span>{language === 'ja' ? todItem.shortJa : todItem.shortEn}</span>
                  </>
                )}
                {precipItem && precipItem.id !== 'NONE' && (
                  <>
                    <span className="opacity-50">·</span>
                    <span>{precipItem.emoji}</span>
                  </>
                )}
                {sprintSettings?.trackThemeSelection === 'RANDOM' && (
                  <span className="text-[10px] opacity-80">🎲</span>
                )}
              </span>
            );
          })()}
          {gamePlayType === 'ANTICIPATION' && (
            <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0 whitespace-nowrap flex items-center gap-1">
              <span>✏️</span>
              <span>{t('Anticipation Sketch', 'お絵かき推測ボード')}</span>
            </span>
          )}
        </div>

        {/* Top-Right Action Cluster: START GAME + Settings + Cancel */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          {onToggleEyesUp && (
            <button
              onClick={onToggleEyesUp}
              className={`px-3 sm:px-3.5 py-2 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border active:scale-95 whitespace-nowrap ${
                eyesUp
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 animate-pulse font-black'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              }`}
              title={eyesUp ? t('Unlock Student Screens', '注目解除（画面をもどす）') : t('Lock Attention: Eyes Up Front', '全員注目（前を見てね）')}
            >
              <span className="text-sm">👀</span>
              <span>{eyesUp ? t('Eyes Up ON', '注目中') : t('Eyes Up', '全員注目')}</span>
            </button>
          )}

          {onEditSettings && (
            <button
              onClick={onEditSettings}
              className="px-3 sm:px-3.5 py-2 rounded-2xl font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title={t('Edit settings without disbanding room', '生徒を退室させずに設定を変更する')}
            >
              <Settings size={15} />
              <span>{t('Settings', '設定変更')}</span>
            </button>
          )}

          <button
            onClick={onStart}
            className="px-5 sm:px-7 py-2 sm:py-2.5 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Play size={18} fill="white" />
            <span>{t('START GAME', 'ゲーム開始')}</span>
            <span className="text-xs opacity-80 font-mono hidden sm:inline">[Enter]</span>
          </button>

          <button
            onClick={onCancel}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer whitespace-nowrap"
          >
            {t('✕ Cancel Room', '✕ 解散')}
          </button>
        </div>
      </div>

      {/* Main Classroom Layout: Left PIN+QR Card + Right Viewport-Locked Scrollable Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 my-2 flex-1 min-h-0 items-stretch overflow-hidden">
        {/* Left Column: Prominent Top PIN Banner + High-Contrast QR Code Centerpiece (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between p-4 sm:p-5 bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl min-h-0 overflow-hidden">
          {/* Top-Pinned Prominent Room PIN Banner (Always visible to back-row students!) */}
          <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border-2 border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between shrink-0 shadow-xs">
            <div className="text-left">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block leading-none mb-1">
                {t('ROOM PIN CODE', 'ルームPIN番号')}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t('Enter on Student Portal', '生徒ポータル画面で入力')}
              </span>
            </div>

            <div className="px-4 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-2xl sm:text-3xl font-black tracking-widest shadow-sm select-all">
              {roomCode}
            </div>
          </div>

          {/* High-Resolution QR Canvas (Auto-scales inside remaining card height) */}
          <div className="flex-1 min-h-0 flex items-center justify-center my-2">
            <div className="p-2.5 sm:p-3 bg-white rounded-3xl shadow-inner border-4 border-slate-900 flex items-center justify-center max-h-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Join room ${roomCode}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 xl:w-64 xl:h-64 max-h-[38dvh] object-contain rounded-2xl"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 xl:w-64 xl:h-64 flex items-center justify-center bg-slate-100 rounded-2xl text-xs text-slate-500">
                  {t('Generating QR...', 'QRコード生成中...')}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Scan Instruction Strip */}
          <div className="w-full flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 shrink-0">
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
              <QrCode size={15} />
              <span>{t('Scan with iPad Camera', 'iPadカメラでスキャン')}</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {t('Point camera to join', 'かざして即参加')}
            </span>
          </div>
        </div>

        {/* Right Column: Viewport-Locked Student Roster & Teams Grid with Internal Scrollbar (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-5 bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl min-h-0 overflow-hidden">
          {/* Roster Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-2 shrink-0 flex-nowrap gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-nowrap">
              <Users className="text-blue-500 shrink-0" size={20} />
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-baseline gap-1 whitespace-nowrap">
                <span>{isStudentHost ? t('Connected Players:', '参加中のプレイヤー:') : t('Connected Students:', '接続中の生徒:')}</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono text-xl">{playerList.length}</span>
                {!isStudentHost && expectedCapacity > 0 && (
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-sm font-bold">
                    / {expectedCapacity}
                    <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      ({Math.round((playerList.length / expectedCapacity) * 100)}%)
                    </span>
                  </span>
                )}
              </h3>
              {botCount > 0 && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <span>🤖</span>
                  <span>{botCount} {language === 'ja' ? '体' : 'Bots'}</span>
                </span>
              )}
            </div>

            {/* Class Energy Vault Co-Op Meter */}
            {classVault && vaultTierInfo && (
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 shadow-2xs shrink-0"
                title={t(
                  `Class Energy Vault: ${classVault.totalEnergy.toLocaleString()} pts. 10% of quiz scores are deposited here toward shared milestones!`,
                  `クラス団結エナジー: ${classVault.totalEnergy.toLocaleString()} pts。全員のクイズ得点の10%がここに貯まり、クラス合同のマスコットが解放されます！`
                )}
              >
                <span className="text-lg animate-pulse">{vaultTierInfo.currentTier.badge}{vaultTierInfo.currentTier.mascotEmoji}</span>
                <div className="flex flex-col min-w-[110px]">
                  <div className="flex items-center justify-between text-[10px] font-black text-amber-900 dark:text-amber-200 leading-none mb-1">
                    <span>⚡ {language === 'ja' ? 'クラス団結エナジー' : 'Class Energy'}</span>
                    <span className="font-mono">{classVault.totalEnergy.toLocaleString()} pts</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-amber-200 dark:bg-amber-900/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${vaultTierInfo.currentTier.accentGradient} transition-all duration-500`}
                      style={{ width: `${vaultTierInfo.progressPct}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-black font-mono text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/40">
                  T{vaultTierInfo.currentTier.tier}
                </span>
              </div>
            )}
            {playerList.length === 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse shrink-0 whitespace-nowrap">
                {t('Waiting for students to scan...', '生徒のスキャンを待っています...')}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{t('Ready to play!', '参加準備OK!')}</span>
              </span>
            )}
          </div>

          {/* Streamlined Single-Row CPU Practice Bots Control Bar */}
          {onAddBots && (
            <div className="px-2.5 py-1.5 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs shrink-0 flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <Bot size={15} className="text-indigo-500 shrink-0" />
                <span className="font-black text-slate-800 dark:text-slate-200 text-[11px]">
                  {t('Practice Bots', '練習ボット')}
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  botCount >= 30
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {botCount}/30
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0 flex-nowrap">
                {/* Chill */}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">🐢</span>
                  <button
                    type="button"
                    disabled={botCount >= 30}
                    onClick={() => onAddBots(1, 'chill')}
                    className="px-1.5 py-0.5 rounded font-black text-[10px] bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 cursor-pointer disabled:opacity-40"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    disabled={botCount >= 30}
                    onClick={() => onAddBots(6, 'chill')}
                    className="px-1.5 py-0.5 rounded font-black text-[10px] bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 cursor-pointer disabled:opacity-40"
                  >
                    +6
                  </button>
                </div>

                {/* Normal */}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-950">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mr-0.5">⚖️</span>
                  <button
                    type="button"
                    disabled={botCount >= 30}
                    onClick={() => onAddBots(1, 'normal')}
                    className="px-1.5 py-0.5 rounded font-black text-[10px] bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 cursor-pointer disabled:opacity-40"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    disabled={botCount >= 30}
                    onClick={() => onAddBots(6, 'normal')}
                    className="px-1.5 py-0.5 rounded font-black text-[10px] bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 cursor-pointer disabled:opacity-40"
                  >
                    +6
                  </button>
                </div>

                {/* Fast */}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mr-0.5">⚡</span>
                  <button
                    type="button"
                    disabled={botCount >= 30}
                    onClick={() => onAddBots(1, 'fast')}
                    className="px-1.5 py-0.5 rounded font-black text-[10px] bg-amber-50 dark:bg-amber-900/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 cursor-pointer disabled:opacity-40"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    disabled={botCount >= 30}
                    onClick={() => onAddBots(6, 'fast')}
                    className="px-1.5 py-0.5 rounded font-black text-[10px] bg-amber-50 dark:bg-amber-900/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 cursor-pointer disabled:opacity-40"
                  >
                    +6
                  </button>
                </div>

                <button
                  type="button"
                  disabled={botCount >= 30}
                  onClick={() => onAddBots(6, 'mixed')}
                  className="px-2 py-1 font-black text-[10px] rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-40 flex items-center gap-1 whitespace-nowrap"
                  title={t('Add 6 mixed bots (2 Chill, 2 Normal, 2 Fast)', 'バランス型6体追加 (おだやか2・ふつう2・てごわい2)')}
                >
                  <span>🎲</span>
                  <span>{t('+6 Mix', '+6体ミックス')}</span>
                </button>
                {botCount > 0 && onClearBots && (
                  <button
                    type="button"
                    onClick={onClearBots}
                    className="px-2 py-1 font-bold text-[10px] rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    {t('Clear', '全削除')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TEAM MODE: Viewport-Locked Grid of Teams with Independent Internal Scrollbars */}
          {gameMode === 'TEAM' ? (
            <div className={`grid gap-2.5 flex-1 min-h-0 overflow-y-auto pr-1 auto-rows-fr ${
              teams.length <= 2 ? 'grid-cols-2' : teams.length <= 4 ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
            }`}>
              {teams.map((tId) => {
                const preset = TEAM_PRESETS[tId];
                const teamMembers = playerList.filter(p => p.teamId === tId);

                return (
                  <div 
                    key={tId}
                    className="p-2.5 rounded-2xl border-2 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 flex flex-col min-h-[120px] max-h-full overflow-hidden shadow-2xs"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700 mb-1.5 shrink-0">
                      <span className="text-xs font-black flex items-center gap-1 text-slate-800 dark:text-slate-100 truncate">
                        <span>{preset.emoji}</span>
                        <span className="truncate">{language === 'ja' ? preset.jaName : preset.name}</span>
                      </span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs shrink-0">
                        {teamMembers.length}
                      </span>
                    </div>

                    <div className="flex-1 min-h-0 space-y-1 overflow-y-auto pr-0.5 pt-1">
                      {teamMembers.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[11px] text-slate-500 dark:text-slate-400 font-bold italic py-4">
                          {t('Waiting...', '待機中...')}
                        </div>
                      ) : (
                        teamMembers.map((p) => {
                          const isBot = p.id.startsWith('bot_');
                          return (
                            <div
                              key={p.id}
                              className={`group relative flex items-center justify-between px-2.5 py-1 rounded-xl border text-xs font-bold ${
                                isBot
                                  ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {/* Floating Speech Bubble Greeting */}
                              {p.greeting && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap animate-bounce">
                                  <div className="relative px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 font-black text-[10px] shadow-sm border border-amber-500 flex items-center gap-1">
                                    <span>{p.greeting}</span>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-300 border-r border-b border-amber-500 rotate-45" />
                                  </div>
                                </div>
                              )}
                              {(() => {
                                const num = typeof p.attendanceNumber === 'number' ? p.attendanceNumber : resolveRacerNumber(p);
                                const hasNumInNick = p.nickname?.includes('番') || p.nickname?.startsWith('#') || p.nickname?.startsWith('00');
                                return (
                                  <span className="flex items-center gap-1 truncate max-w-[145px] text-slate-800 dark:text-slate-200">
                                    {isBot && <span className="text-[10px] text-indigo-500 dark:text-indigo-400">🤖</span>}
                                    {p.avatar && !isBot && (
                                      <AvatarDisplay avatar={p.avatar} frameId={p.frame} sizeClassName="w-4 h-4 text-sm" />
                                    )}
                                    {num >= 0 && !hasNumInNick && !isBot && (
                                      <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white font-mono font-black text-[10px] shrink-0">
                                        #{num === 0 ? '00' : num}
                                      </span>
                                    )}
                                    <span className="truncate">{p.nickname}</span>
                                  </span>
                                );
                              })()}
                              <div className="flex items-center gap-1 shrink-0">
                                {onChangePlayerTeam && (
                                  <button
                                    onClick={() => onChangePlayerTeam(p.id, cycleTeam(p.teamId))}
                                    title={t('Change team', 'チームを変更する')}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  >
                                    <RefreshCw size={11} />
                                  </button>
                                )}
                                <button
                                  onClick={() => onKickPlayer(p.id)}
                                  title={t('Kick player', '退室させる')}
                                  className="p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* INDIVIDUAL MODE: Responsive 3-to-4 Column Grid with Dedicated Internal Scrollbar */
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pt-2">
              {playerList.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400 italic text-xs font-bold text-center">
                  <span className="text-3xl mb-2">📱</span>
                  <span>{t('Scan the QR code to see your name appear here!', 'QRコードをスキャンするとここに名前が表示されます！')}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 content-start">
                  {playerList.map((p) => {
                    const isBot = p.id.startsWith('bot_');
                    return (
                      <div
                        key={p.id}
                        className={`group relative flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border shadow-2xs animate-in zoom-in-95 duration-100 min-w-0 ${
                          isBot 
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/70' 
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {/* Floating Speech Bubble Greeting */}
                        {p.greeting && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap animate-bounce">
                            <div className="relative px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 font-black text-[10px] shadow-md border-2 border-amber-500 flex items-center gap-1">
                              <span>{p.greeting}</span>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-300 border-r-2 border-b-2 border-amber-500 rotate-45" />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isBot ? 'bg-indigo-500' : 'bg-emerald-500 animate-ping'}`} />
                          {isBot && <span className="text-xs shrink-0">🤖</span>}
                          {p.avatar && !isBot && (
                            <AvatarDisplay avatar={p.avatar} frameId={p.frame} sizeClassName="w-5 h-5 text-base shrink-0" />
                          )}
                          {(() => {
                            const num = typeof p.attendanceNumber === 'number' ? p.attendanceNumber : resolveRacerNumber(p);
                            const hasNumInNick = p.nickname?.includes('番') || p.nickname?.startsWith('#') || p.nickname?.startsWith('00');
                            return (
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                {num >= 0 && !hasNumInNick && !isBot && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white font-mono font-black text-[10px] shrink-0 shadow-2xs">
                                    #{num === 0 ? '00' : num}
                                  </span>
                                )}
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{p.nickname}</span>
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          onClick={() => onKickPlayer(p.id)}
                          title={t('Kick player', '退室させる')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Roster Bottom Status Bar */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
            <span>
              {t('Teacher: Click START GAME or press [Enter] to begin', '先生用: [Enter] または [ゲーム開始] でスタート')}
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">
              {playerList.length > 0 ? t(`${playerList.length} Connected`, `${playerList.length} 名接続中`) : t('Lobby Open', '入室受付中')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};