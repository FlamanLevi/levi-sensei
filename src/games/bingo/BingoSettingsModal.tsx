import React, { useEffect } from 'react';
import { X, Settings, Volume2, VolumeX, Clock, Printer, RotateCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAudio } from '@/context/AudioContext';

interface BingoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoSpeedSec: number;
  setAutoSpeedSec: (sec: number) => void;
  playAudio: boolean;
  setPlayAudio: (val: boolean) => void;
  onOpenPrintModal: () => void;
  onResetGame: () => void;
}

export const BingoSettingsModal: React.FC<BingoSettingsModalProps> = ({
  isOpen,
  onClose,
  autoSpeedSec,
  setAutoSpeedSec,
  playAudio,
  setPlayAudio,
  onOpenPrintModal,
  onResetGame,
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
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{t('Bingo Caller Settings', <><ruby>設定<rt className="text-[7px]">せってい</rt></ruby>・ツール</>)}</span>
              </h2>
              <p className="text-[11px] font-bold text-slate-400">
                {t('Configure pace, caller voice & worksheets', 'ドロー速度・音声・印刷の設定')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playPop();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={t('Close', '閉じる')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar text-sm">
          {/* Section 1: Auto-Draw Speed Interval */}
          <div className="bg-slate-850/90 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
              <Clock size={15} />
              <span>{t('Auto-Draw Interval', <><ruby>自動<rt className="text-[7px]">じどう</rt></ruby>ドローの<ruby>速<rt className="text-[7px]">はや</rt></ruby>さ</>)}</span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              {t(
                'Seconds to wait before automatically calling the next card:',
                '次のカードを自動でめくるまでの待機秒数：'
              )}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 7, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    playPop();
                    setAutoSpeedSec(sec);
                  }}
                  className={`py-2.5 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    autoSpeedSec === sec
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400/50'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <span className="text-base font-black">{sec}s</span>
                  <span className="text-[10px] opacity-75">
                    {sec === 5
                      ? t('Fast', '速い')
                      : sec === 7
                      ? t('Normal', '標準')
                      : sec === 10
                      ? t('Relaxed', 'ゆったり')
                      : t('Practice', 'じっくり')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Caller Pronunciation Voice */}
          <div className="bg-slate-850/90 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
              <Volume2 size={15} />
              <span>{t('Caller Pronunciation', <><ruby>発音<rt className="text-[7px]">はつおん</rt></ruby><ruby>音声<rt className="text-[7px]">おんせい</rt></ruby></>)}</span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              {t(
                'Automatically speak English vocabulary aloud upon draw:',
                'カードがめくられた時、自動で英語を発音します：'
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playPop();
                  setPlayAudio(true);
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  playAudio
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Volume2 size={16} />
                <span>{t('Sound ON (Speak)', '音声 ON（発音あり）')}</span>
              </button>
              <button
                onClick={() => {
                  playPop();
                  setPlayAudio(false);
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  !playAudio
                    ? 'bg-slate-700 border-slate-500 text-white shadow-md ring-2 ring-slate-400/50'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <VolumeX size={16} />
                <span>{t('Muted (Silent)', '消音（無音）')}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Classroom Printables */}
          <div className="bg-slate-850/90 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 text-amber-400 font-black text-xs uppercase tracking-wider">
              <Printer size={15} />
              <span>{t('Printable Worksheets', <><ruby>印刷<rt className="text-[7px]">いんさつ</rt></ruby>シート</>)}</span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              {t(
                'Generate randomized 3×3 or 4×4 cards for the entire 35–40 student roster:',
                'クラス35〜40人分のランダムなビンゴカードを一括印刷します：'
              )}
            </p>
            <button
              onClick={() => {
                playPop();
                onClose();
                onOpenPrintModal();
              }}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={18} />
              <span>{t('Open Print Layout Tool (35/40 Cards)', 'ビンゴカード印刷ツールを開く')}</span>
            </button>
          </div>

          {/* Section 4: Restart & Shuffle Pool */}
          <div className="bg-slate-850/90 border border-slate-700/80 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-black text-xs text-slate-300 block mb-0.5">
                  {t('Restart Current Game', 'ゲームを最初からやり直す')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('Reshuffle the card pool and clear drawn cards rack', 'カードをシャッフルして最初に戻します')}
                </span>
              </div>
              <button
                onClick={() => {
                  playPop();
                  onResetGame();
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 font-black text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RotateCcw size={14} />
                <span>{t('Reset', 'リセット')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-end shrink-0">
          <button
            onClick={() => {
              playPop();
              onClose();
            }}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            {t('Done', '完了')}
          </button>
        </div>
      </div>
    </div>
  );
};
