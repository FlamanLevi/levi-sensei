import React from 'react';
import { Heart, Music, Play, Shield, SlidersHorizontal, Smile } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getSoundPack } from '@/utils/soundPacks';
import { BgmSelectorModal } from '@/components/common/BgmSelectorModal';
import { AwardCategoryToggles, GamePlayType, QuizSubject } from '../../types';

interface AwardsAndBgmFooterProps {
  awardsStep: number;
  awardToggles: AwardCategoryToggles;
  onToggleAwardCategory: (key: keyof AwardCategoryToggles) => void;
  bgm: string;
  onSelectBgm: (packId: string) => void;
  isBgmModalOpen: boolean;
  onSetBgmModalOpen: (open: boolean) => void;
  subject: QuizSubject;
  wordsInPoolLength: number;
  gamePlayType: GamePlayType;
  onCancel: () => void;
  onLaunch: () => void;
}

export const AwardsAndBgmFooter: React.FC<AwardsAndBgmFooterProps> = ({
  awardsStep,
  awardToggles,
  onToggleAwardCategory,
  bgm,
  onSelectBgm,
  isBgmModalOpen,
  onSetBgmModalOpen,
  subject,
  wordsInPoolLength,
  gamePlayType,
  onCancel,
  onLaunch,
}) => {
  const { t, language } = useLanguage();
  const currentPack = getSoundPack(bgm);

  return (
    <>
      {/* Classroom Award Categories */}
      <div>
        <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
          {`${awardsStep}. `}
          {t('Post-Game Classroom Awards', '終了後の表彰カテゴリー')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Core (Always-On) */}
          <div className="p-3.5 rounded-2xl border-2 border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base shrink-0">🏆</span>
                <span className="text-xs font-black text-blue-950 dark:text-blue-100 truncate">
                  {t('Core Awards', '基本表彰')}
                </span>
              </div>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shrink-0">
                {t('ALWAYS ON', '常時ON')}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              {t('Speed Star ⚡, On Fire 🔥, Sniper 🎯', 'スピードスター⚡、連続正解🔥、スナイパー🎯')}
            </p>
          </div>

          {/* Effort & Growth */}
          <button
            type="button"
            onClick={() => onToggleAwardCategory('effortGrowth')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              awardToggles.effortGrowth
                ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Heart size={15} className={awardToggles.effortGrowth ? 'text-blue-500 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'} />
                <span className="text-xs font-black truncate">{t('Effort & Growth', '努力・成長賞')}</span>
              </div>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                  awardToggles.effortGrowth
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {awardToggles.effortGrowth ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {t(
                'Never Give Up 💫, Rising Star 🚀, Flawless Finish 💎, Last Spurt 🏃',
                '最後まで粘ったで賞💫、急成長賞🚀、パーフェクト賞💎、ラストスパート賞🏃'
              )}
            </p>
          </button>

          {/* Skill & Challenge */}
          <button
            type="button"
            onClick={() => onToggleAwardCategory('skillChallenge')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              awardToggles.skillChallenge
                ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield size={15} className={awardToggles.skillChallenge ? 'text-blue-500 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'} />
                <span className="text-xs font-black truncate">{t('Skill & Challenge', '実力・挑戦賞')}</span>
              </div>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                  awardToggles.skillChallenge
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {awardToggles.skillChallenge ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {t(
                'Iron Defense 🛡️, Wise Owl 🦉, All-Rounder 🌟, Quick Draw 🎯',
                '鉄壁ディフェンス🛡️、ものしりフクロウ🦉、オールラウンダー🌟、早押し名人🎯'
              )}
            </p>
          </button>

          {/* Fun & Surprise */}
          <button
            type="button"
            onClick={() => onToggleAwardCategory('funSurprise')}
            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              awardToggles.funSurprise
                ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Smile size={15} className={awardToggles.funSurprise ? 'text-blue-500 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'} />
                <span className="text-xs font-black truncate">{t('Fun & Classroom Spirit', 'お楽しみ・特別賞')}</span>
              </div>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                  awardToggles.funSurprise
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {awardToggles.funSurprise ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {t(
                'Rainbow Master 🌈, Just-in-Time ⏱️, Twin Sync 🤝, Median Hero 🍀',
                'レインボーマスター🌈、ギリギリセーフ⏱️、シンクロ回答🤝、中央値ヒーロー🍀'
              )}
            </p>
          </button>
        </div>
      </div>

      {/* Classroom BGM Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
            {t(
              'Classroom Sound Pack (High-Energy Audio)',
              <>
                <ruby>教室<rt>きょうしつ</rt></ruby>のBGMサウンドパック
              </>
            )}
          </label>
          <button
            type="button"
            onClick={() => onSetBgmModalOpen(true)}
            className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal size={12} />
            <span>{t('Change Sound Pack', 'パック変更・試聴')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Active Pack Display */}
          <div
            onClick={() => onSetBgmModalOpen(true)}
            className={`sm:col-span-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex items-center justify-between gap-3 ${currentPack.accentBorder} ${currentPack.bgLight} ${currentPack.bgDark} hover:shadow-md ring-1 ring-indigo-400/20`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                {currentPack.icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {language === 'ja' ? currentPack.nameJa : currentPack.name}
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${currentPack.badgeColor}`}>
                    {currentPack.franchise}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {currentPack.tracks.length} {t('Tracks', '曲')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                  {language === 'ja' ? currentPack.descriptionJa : currentPack.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs hover:bg-white dark:hover:bg-slate-800">
              <Music size={13} />
              <span>{t('Change Pack', '試聴・変更')}</span>
            </div>
          </div>

          {/* Quick Mute */}
          <button
            type="button"
            onClick={() => onSelectBgm(bgm === 'none' ? 'all_stars' : 'none')}
            className={`sm:col-span-1 p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
              bgm === 'none'
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-400/30'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">🔇</span>
              <span className="text-xs font-black">
                {bgm === 'none' ? t('Muted (SFX Only)', '無音中 (効果音のみ)') : t('Quick Mute', 'BGMをミュート')}
              </span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
              {bgm === 'none' ? t('Tap to restore music', 'タップで音楽を再開') : t('Play quiz without BGM', '効果音のみでプレイ')}
            </span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('Cancel', 'キャンセル')}
        </button>
        <button
          type="button"
          disabled={subject === 'ENGLISH' && wordsInPoolLength < 4}
          onClick={onLaunch}
          className="px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <Play size={16} fill="white" />
          <span>
            {gamePlayType === 'GRAND_PRIX_3D' ? t('START GRAND PRIX ROOM', 'グランプリ部屋を作成') : t('CREATE ROOM', '部屋を作成')}
          </span>
        </button>
      </div>

      {/* Sound Pack Selection & Audition Modal */}
      <BgmSelectorModal
        isOpen={isBgmModalOpen}
        onClose={() => onSetBgmModalOpen(false)}
        selectedPackId={bgm}
        onSelectPack={(packId) => onSelectBgm(packId)}
      />
    </>
  );
};
