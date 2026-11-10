import React from 'react';
import { ConcentrationTeam } from './types';
import { Volume2, Users, Check, Mic } from 'lucide-react';
import { VocabularyItem } from '@data/types';
import { RubyText } from '@/components/common/RubyText';
import { useLanguage } from '@/context/LanguageContext';

interface SpeakingCheckBannerProps {
  card: VocabularyItem;
  currentTeam?: ConcentrationTeam;
  isTeamMode: boolean;
  onApprove: () => void;
  onPlayAudio: () => void;
  isTeamHelpActive: boolean;
  onToggleTeamHelp: () => void;
}

export const SpeakingCheckBanner: React.FC<SpeakingCheckBannerProps> = ({
  card,
  currentTeam,
  isTeamMode,
  onApprove,
  onPlayAudio,
  isTeamHelpActive,
  onToggleTeamHelp
}) => {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-amber-700 dark:via-yellow-700 dark:to-amber-800 text-white p-3 sm:p-4 rounded-3xl shadow-xl border-2 border-amber-300 dark:border-amber-500 space-y-2.5 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side: microphone icon & prompts */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner animate-bounce">
            <Mic size={28} className="text-white" />
          </div>
          <div>
            <div className="font-black text-base sm:text-xl text-white drop-shadow flex items-center gap-2">
              <span>{t('"What is it?" Say it in English!', <>「What is it?」 えいごで 言ってみよう！</>)}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-100 dark:text-amber-200 flex items-center gap-2 mt-0.5">
              {isTeamMode && currentTeam && (
                <span className="bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-black">
                  <span>{currentTeam.badge}</span>
                  <strong className="underline">{t(currentTeam.name, currentTeam.ja)}</strong>
                  <span>{t("'s Turn!", "の番！")}</span>
                </span>
              )}
              <span>{t('When said, press [Space] or "Done!" button', <>言えたら [スペースキー] または「言えた！」ボタン！</>)}</span>
            </div>
          </div>
        </div>

        {/* Right side: actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Model Audio */}
          <button
            onClick={onPlayAudio}
            className="px-3.5 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl border border-white/40 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title={t('Listen to model pronunciation', 'おてほんの発音を聴く')}
          >
            <Volume2 size={16} />
            <span>{t('Hear Model', 'おてほん')}</span>
          </button>

          {/* Team / Class Help */}
          <button
            onClick={onToggleTeamHelp}
            className={`px-3.5 py-2 text-xs sm:text-sm font-black rounded-2xl shadow active:scale-95 transition flex items-center gap-1.5 cursor-pointer ${
              isTeamHelpActive
                ? 'bg-amber-300 text-amber-950 ring-2 ring-white'
                : 'bg-amber-100 dark:bg-amber-200 text-amber-950 hover:bg-white'
            }`}
            title={t('Chant together as a class/team', 'チームみんなで声をそろえて言う')}
          >
            <Users size={16} />
            <span>{t('Team Help!', 'チームでヘルプ！')}</span>
          </button>

          {/* Speech Approved / Good Job Button */}
          <button
            onClick={onApprove}
            className="px-5 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-sm sm:text-base font-black rounded-2xl shadow-lg ring-2 ring-white flex items-center gap-2 transition cursor-pointer"
            title={t('Good Job! (or press Spacebar)', '言えた！ (SpaceキーでもOK)')}
          >
            <Check size={18} />
            <span>{t('Done! (Space)', '言えた！ (Space)')}</span>
          </button>
        </div>
      </div>

      {/* Team Help Chant Display */}
      {isTeamHelpActive && (
        <div className="w-full bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white p-3 rounded-2xl border border-amber-300 dark:border-amber-600 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤝</span>
            <span className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
              {t('Everyone together:', 'みんなで せーの！')}
            </span>
            <span className="text-lg sm:text-2xl font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 px-4 py-1 rounded-xl border border-indigo-200 dark:border-slate-700 tracking-wide">
              「{card.english}」
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
              <RubyText ruby={card.ruby} kanji={card.ja_kanji} hiragana={card.ja_hiragana} />
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 italic">
            {t('Chant aloud together, then tap "Done!"', 'みんなで声をそろえて言えたら「言えた！」を押してね！')}
          </span>
        </div>
      )}
    </div>
  );
};
