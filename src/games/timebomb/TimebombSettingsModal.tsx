import React, { useEffect } from 'react';
import { X, Settings, Timer, Volume2, VolumeX, Users, BookOpen, Layers, Hash, Sparkles, Printer } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';
import { TimerDurationMode, GameMode } from './TimebombGame';

interface TimebombSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerMode: TimerDurationMode;
  setTimerMode: (mode: TimerDurationMode) => void;
  hideTimerDisplay: boolean;
  setHideTimerDisplay: (val: boolean) => void;
  autoPronounce: boolean;
  setAutoPronounce: (val: boolean) => void;
  teamMode: boolean;
  setTeamMode: (val: boolean) => void;
  onOpenTeacherGuide: () => void;
  onOpenInstructions?: () => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  numberMax: number;
  setNumberMax: (max: number) => void;
}

export const TimebombSettingsModal: React.FC<TimebombSettingsModalProps> = ({
  isOpen,
  onClose,
  timerMode,
  setTimerMode,
  hideTimerDisplay,
  setHideTimerDisplay,
  autoPronounce,
  setAutoPronounce,
  teamMode,
  setTeamMode,
  onOpenTeacherGuide,
  onOpenInstructions,
  gameMode,
  setGameMode,
  numberMax,
  setNumberMax
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
        className="w-full max-w-md md:max-w-4xl bg-slate-900 border-2 border-slate-700 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-3 shrink-0 min-h-[44px]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <Settings size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 truncate">
                <span className="truncate">{t('Relay Settings', <>リレー<ruby>設定<rt>せってい</rt></ruby></>)}</span>
                <span className="text-xs font-normal text-slate-400 shrink-0 hidden sm:inline">| Hot Potato</span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => { playPop(); onClose(); }}
            className="w-8 h-8 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
            title={t('Close', '閉じる')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 items-start text-sm">
          {/* Left Column */}
          <div className="flex flex-col gap-3.5">
            {/* Section 1: Timer Duration & Suspense */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Timer size={14} className="shrink-0" />
                  <span>{t('Timer Duration', <>タイマー<ruby>時間<rt>じかん</rt></ruby></>)}</span>
                </span>
                <button
                  onClick={() => { playPop(); setHideTimerDisplay(!hideTimerDisplay); }}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    hideTimerDisplay
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {hideTimerDisplay ? t('🤫 Secret (Hidden)', '🤫 シークレット(非表示)') : t('👀 Visible Seconds', '👀 秒数を表示')}
                </button>
              </div>

              <select
                value={timerMode}
                onChange={(e) => { playPop(); setTimerMode(e.target.value as TimerDurationMode); }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 font-bold outline-none cursor-pointer"
              >
                <option value="MYSTERY_FAST">{t('Mystery Fast (18-28s) • High Energy', 'シークレット高速 (18-28秒) • スピード重視')}</option>
                <option value="MYSTERY_NORMAL">{t('Mystery Normal (30-50s) • Standard', 'シークレット標準 (30-50秒) • おすすめ')}</option>
                <option value="MYSTERY_LONG">{t('Mystery Long (48-75s) • Whole Class', 'シークレット長め (48-75秒) • クラス一周')}</option>
                <option value="MYSTERY_MARATHON">{t('Mystery Marathon (70-110s) • Long Rally', 'シークレット最長 (70-110秒) • じっくり')}</option>
                <option value="FIXED_30">{t('Fixed 30 seconds', '固定 30秒')}</option>
                <option value="FIXED_45">{t('Fixed 45 seconds', '固定 45秒')}</option>
                <option value="FIXED_60">{t('Fixed 60 seconds (1 minute)', '固定 60秒 (1分)')}</option>
                <option value="FIXED_90">{t('Fixed 90 seconds (1.5 minutes)', '固定 90秒 (1.5分)')}</option>
              </select>
            </div>

            {/* Section 4: Game Mode (Word Cards / Numbers / Category Rally) */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                {t('Curriculum Mode', <>リレーの<ruby>内容<rt>ないよう</rt></ruby>・モード</>)}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => { playPop(); setGameMode('WORD_FLASH'); }}
                  className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    gameMode === 'WORD_FLASH'
                      ? 'bg-slate-800 border-amber-400 text-amber-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers size={16} className="text-rose-400" />
                  <span className="truncate">{t('Word Cards', '単語カード')}</span>
                </button>

                <button
                  onClick={() => { playPop(); setGameMode('NUMBER_COUNT'); }}
                  className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    gameMode === 'NUMBER_COUNT'
                      ? 'bg-slate-800 border-cyan-400 text-cyan-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Hash size={16} className="text-cyan-400" />
                  <span className="truncate">{t(`Numbers (1-${numberMax})`, `数字 (1-${numberMax})`)}</span>
                </button>

                <button
                  onClick={() => { playPop(); setGameMode('CATEGORY_RALLY'); }}
                  className={`py-2 px-2 rounded-xl text-xs font-black flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                    gameMode === 'CATEGORY_RALLY'
                      ? 'bg-slate-800 border-emerald-400 text-emerald-300 shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={16} className="text-emerald-400" />
                  <span className="truncate">{t('Category', '連想ラリー')}</span>
                </button>
              </div>

              {gameMode === 'NUMBER_COUNT' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 font-bold">{t('Max Number:', '最大値:')}</span>
                  <div className="flex gap-1.5">
                    {[10, 20].map((val) => (
                      <button
                        key={val}
                        onClick={() => { playPop(); setNumberMax(val); }}
                        className={`px-3 py-1 rounded-lg text-xs font-black border cursor-pointer ${
                          numberMax === val
                            ? 'bg-cyan-600 border-cyan-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        1 – {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-3.5">
            {/* Section 2: Audio & Pronunciation */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Volume2 size={16} className="text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-200 block">
                    {t('Auto-Pronounce on Pass', <>パス<ruby>時<rt>とき</rt></ruby>の<ruby>自動音声<rt>じどうおんせい</rt></ruby></>)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t('Hear English pronunciation with each card', 'カードが切り替わるたびに英語を再生')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => { playPop(); setAutoPronounce(!autoPronounce); }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  autoPronounce
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {autoPronounce ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{autoPronounce ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Section 3: Team Mode */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Users size={16} className="text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-200 block">
                    {t('Classroom Mode', <>クラス<ruby>対戦方式<rt>たいせんほうしき</rt></ruby></>)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {teamMode ? t('4-Team Competition (Red/Blue/Yellow/Green)', '4チーム対抗バトル') : t('Whole Class (One friendly circle)', 'クラス全員で楽しむ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => { playPop(); setTeamMode(!teamMode); }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  teamMode
                    ? 'bg-purple-600 border-purple-400 text-white shadow'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <Users size={14} />
                <span>{teamMode ? t('4 Teams', '4チーム') : t('Whole Class', '全員')}</span>
              </button>
            </div>

            {/* Section 5: Student Tutorial & Teacher Guide */}
            <div className="flex flex-col gap-2">
              {onOpenInstructions && (
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    onClose();
                    onOpenInstructions();
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs sm:text-sm font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 border border-sky-300 cursor-pointer"
                >
                  <BookOpen size={16} className="shrink-0" />
                  <span>{t('Open Student How-to-Play Tutorial', '児童用あそび方・チュートリアルを開く')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playPop();
                  onClose();
                  onOpenTeacherGuide();
                }}
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs sm:text-sm font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 border border-amber-300 cursor-pointer"
              >
                <Printer size={16} className="shrink-0" />
                <span>{t('Open Teacher Instruction Guide & Printable Handout', '先生用指導案・印刷用ハンドアウトを開く')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end shrink-0 flex-nowrap">
          <button
            onClick={() => { playPop(); onClose(); }}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            {t('Done', '完了')}
          </button>
        </div>
      </div>
    </div>
  );
};
