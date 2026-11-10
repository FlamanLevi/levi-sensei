import React, { useEffect } from 'react';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
  Trophy,
  Eye,
  Zap,
  RotateCcw,
  Timer,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import {
  KeywordDisplayTier,
  ScoreboardMode,
  KeywordLengthMode,
  FoulPenaltyMode,
  AutopilotConfig,
} from './KeywordGame';

interface KeywordSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayTier: KeywordDisplayTier;
  setDisplayTier: (tier: KeywordDisplayTier) => void;
  lengthMode: KeywordLengthMode;
  setLengthMode: (mode: KeywordLengthMode) => void;
  scoreboardMode: ScoreboardMode;
  setScoreboardMode: (mode: ScoreboardMode) => void;
  speed: 'slow' | 'normal' | 'fast';
  setSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  playAudioOnCycle: boolean;
  setPlayAudioOnCycle: (val: boolean) => void;
  foulPenaltyMode?: FoulPenaltyMode;
  setFoulPenaltyMode?: (mode: FoulPenaltyMode) => void;
  showReactionTiers?: boolean;
  setShowReactionTiers?: (val: boolean) => void;
  autopilotConfig?: AutopilotConfig;
  setAutopilotConfig?: React.Dispatch<React.SetStateAction<AutopilotConfig>>;
  onResetScores: () => void;
}

export const KeywordSettingsModal: React.FC<KeywordSettingsModalProps> = ({
  isOpen,
  onClose,
  displayTier,
  setDisplayTier,
  lengthMode,
  setLengthMode,
  scoreboardMode,
  setScoreboardMode,
  speed,
  setSpeed,
  playAudioOnCycle,
  setPlayAudioOnCycle,
  foulPenaltyMode = 'AWARD_OPPONENT',
  setFoulPenaltyMode,
  showReactionTiers = true,
  setShowReactionTiers,
  autopilotConfig,
  setAutopilotConfig,
  onResetScores,
}) => {
  const { t } = useLanguage();
  const { playPop } = useAudio();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 select-none font-['UD_Digi_Kyokasho_NP-R','Zen_Maru_Gothic',sans-serif]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between shrink-0 min-h-[44px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>
                  {t(
                    'Keyword Settings',
                    <>
                      キーワードゲーム
                      <ruby>
                        設定<rt className="text-[7px]">せってい</rt>
                      </ruby>
                    </>
                  )}
                </span>
                <span className="text-xs font-normal text-slate-400">
                  | Superstar Arena
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              playPop();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title={t('Close', '閉じる')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-sm">
          {/* Section 1: Display Tier */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} />
                <span>
                  {t(
                    'Card Display Mode',
                    <>
                      カード
                      <ruby>
                        表示<rt className="text-[7px]">ひょうじ</rt>
                      </ruby>
                      モード
                    </>
                  )}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  playPop();
                  setDisplayTier('PICTURE_ONLY');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  displayTier === 'PICTURE_ONLY'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow font-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-base">🖼️</span>
                <span>{t('Pic Only', '絵のみ')}</span>
                <span className="text-[9px] opacity-75 font-normal">
                  {t('Listening', 'リスニング')}
                </span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setDisplayTier('PICTURE_WORD');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  displayTier === 'PICTURE_WORD'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow font-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-base">🖼️🔤</span>
                <span>{t('Pic + Word', '絵と文字')}</span>
                <span className="text-[9px] opacity-75 font-normal">
                  {t('Standard', '標準')}
                </span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setDisplayTier('WORD_ONLY');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                  displayTier === 'WORD_ONLY'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow font-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-base">🔤</span>
                <span>{t('Word Only', '文字のみ')}</span>
                <span className="text-[9px] opacity-75 font-normal">
                  {t('Reading', 'リーディング')}
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Hands-Free Autopilot & Pacing */}
          {autopilotConfig && setAutopilotConfig && (
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Bot size={14} />
                  <span>
                    {t(
                      'Hands-Free Autopilot Mode',
                      <>
                        ハンズフリー
                        <ruby>
                          自動進行<rt className="text-[7px]">じどうしんこう</rt>
                        </ruby>
                      </>
                    )}
                  </span>
                </span>
                <button
                  onClick={() => {
                    playPop();
                    setAutopilotConfig((prev) => ({
                      ...prev,
                      enabled: !prev.enabled,
                    }));
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-black border transition cursor-pointer ${
                    autopilotConfig.enabled
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {autopilotConfig.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { ms: 2000, en: '2s Pose Delay', ja: 'ポーズ待機 2秒' },
                  { ms: 3000, en: '3s Pose Delay', ja: 'ポーズ待機 3秒' },
                  { ms: 5000, en: '5s Pose Delay', ja: 'ポーズ待機 5秒' },
                ].map((opt) => (
                  <button
                    key={opt.ms}
                    onClick={() => {
                      playPop();
                      setAutopilotConfig((prev) => ({
                        ...prev,
                        poseDelayMs: opt.ms,
                      }));
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                      autopilotConfig.poseDelayMs === opt.ms
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t(opt.en, opt.ja)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: False-Start Penalty & Reaction Tier Badges */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>
                {t(
                  'Referee False-Start Rule & Speed Badges',
                  <>
                    おてつき
                    <ruby>
                      判定<rt className="text-[7px]">はんてい</rt>
                    </ruby>
                    ・スピード称号
                  </>
                )}
              </span>
            </span>

            {setFoulPenaltyMode && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    playPop();
                    setFoulPenaltyMode('AWARD_OPPONENT');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                    foulPenaltyMode === 'AWARD_OPPONENT'
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t(
                    '🟨 Opponent +1 PT & Lockout',
                    '🟨 相手に+1点＆ロック'
                  )}
                </button>
                <button
                  onClick={() => {
                    playPop();
                    setFoulPenaltyMode('LOCKOUT_ONLY');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                    foulPenaltyMode === 'LOCKOUT_ONLY'
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('🔒 2s Lockout (-1 PT)', '🔒 2秒ロック（-1点）')}
                </button>
              </div>
            )}

            {setShowReactionTiers && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-300">
                  {t(
                    'Show Reaction Speed Tier Badges (⚡ GODLIKE / 🏎️ LIGHTNING)',
                    '反応スピード称号バッジを表示 (⚡神速・🏎️電光石火)'
                  )}
                </span>
                <button
                  onClick={() => {
                    playPop();
                    setShowReactionTiers(!showReactionTiers);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-black border cursor-pointer ${
                    showReactionTiers
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {showReactionTiers ? 'ON' : 'OFF'}
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Game Length & Cycling Speed */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Timer size={14} />
              <span>
                {t(
                  'Decoy Cards & Cycling Speed',
                  <>
                    フェイント枚数・<ruby>切替<rt className="text-[7px]">きりかえ</rt></ruby>スピード
                  </>
                )}
              </span>
            </span>

            <div className="grid grid-cols-3 gap-2">
              {(['short', 'medium', 'long'] as const).map((mode) => {
                const labels = {
                  short: { en: 'Short (2–4)', ja: '短め (2〜4枚)' },
                  medium: { en: 'Medium (4–7)', ja: '標準 (4〜7枚)' },
                  long: { en: 'Long (7–12)', ja: '長め (7〜12枚)' },
                };
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      playPop();
                      setLengthMode(mode);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      lengthMode === mode
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{t(labels[mode].en, labels[mode].ja)}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['slow', 'normal', 'fast'] as const).map((lvl) => {
                const labels = {
                  slow: { en: 'Slow (2.1s)', ja: 'ゆったり (2.1秒)' },
                  normal: { en: 'Normal (1.5s)', ja: 'ふつう (1.5秒)' },
                  fast: { en: 'Fast (1.0s)', ja: '高速 (1.0秒)' },
                };
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      playPop();
                      setSpeed(lvl);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      speed === lvl
                        ? 'bg-sky-500 text-slate-950 border-sky-300 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{t(labels[lvl].en, labels[lvl].ja)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Audio Pronunciation */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-indigo-400" />
              <div>
                <span className="text-xs font-black text-slate-200 block">
                  {t(
                    'Voice Callout on Cycle',
                    <>
                      カード
                      <ruby>
                        切替時<rt className="text-[7px]">きりかえじ</rt>
                      </ruby>
                      の
                      <ruby>
                        音声再生<rt className="text-[7px]">おんせいさいせい</rt>
                      </ruby>
                    </>
                  )}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t(
                    'Hear English pronunciation as cards flash',
                    'カードが変わるごとに英語を読み上げ'
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                playPop();
                setPlayAudioOnCycle(!playAudioOnCycle);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                playAudioOnCycle
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {playAudioOnCycle ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{playAudioOnCycle ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Section 6: Scoreboard Mode */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy size={14} />
                <span>
                  {t(
                    'Sidebar Arena Display',
                    <>
                      <ruby>
                        得点板<rt className="text-[7px]">とくてんばん</rt>
                      </ruby>
                      ・18机マップ
                    </>
                  )}
                </span>
              </span>

              <button
                onClick={() => {
                  playPop();
                  onResetScores();
                }}
                className="text-[11px] text-slate-400 hover:text-rose-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw size={11} />
                <span>{t('Reset Scores', '得点リセット')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  playPop();
                  setScoreboardMode('LIVE_DESKS');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                  scoreboardMode === 'LIVE_DESKS' || scoreboardMode === 'OFF'
                    ? 'bg-purple-600 text-white border-purple-400 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{t('18-Desk Map', '18机ライブ')}</span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setScoreboardMode('2_TEAMS');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                  scoreboardMode === '2_TEAMS'
                    ? 'bg-purple-600 text-white border-purple-400 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{t('2 Teams', '2チーム（赤白）')}</span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setScoreboardMode('4_TEAMS');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                  scoreboardMode === '4_TEAMS'
                    ? 'bg-purple-600 text-white border-purple-400 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{t('4 Teams', '4チーム')}</span>
              </button>

              <button
                onClick={() => {
                  playPop();
                  setScoreboardMode('6_TEAMS');
                }}
                className={`py-2 px-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                  scoreboardMode === '6_TEAMS'
                    ? 'bg-purple-600 text-white border-purple-400 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{t('6 Teams', '6班対抗')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};