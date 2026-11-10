import React from 'react';
import { TyphoonTileData, TyphoonTeam } from './types';
import { getEventDisplayInfo } from './utils';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight } from 'lucide-react';

interface TyphoonEventModalProps {
  tile: TyphoonTileData;
  activeTeam: TyphoonTeam;
  allTeams: TyphoonTeam[];
  onConfirmPoints: () => void;
  onExecuteTargetAction: (targetTeamId: string) => void;
}

export const TyphoonEventModal: React.FC<TyphoonEventModalProps> = ({
  tile,
  activeTeam,
  allTeams,
  onConfirmPoints,
  onExecuteTargetAction
}) => {
  const { t } = useLanguage();
  const event = tile.event;
  const eventInfo = getEventDisplayInfo(event);

  const needsTargetTeam = event === 'TYPHOON' || event === 'SWAP' || event === 'STEAL_200';
  const rivalTeams = allTeams.filter((tm) => tm.id !== activeTeam.id);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Giant Event Emoji */}
        <div className="text-7xl sm:text-8xl mb-2 animate-bounce drop-shadow-xl">
          {eventInfo.emoji}
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
          {eventInfo.name}
        </h2>
        <span className={`text-xl sm:text-2xl font-black ${eventInfo.color} font-mono mb-4`}>
          {eventInfo.label}
        </span>

        {/* Case 1: Straight Points */}
        {!needsTargetTeam && (
          <div className="w-full space-y-4">
            <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
              {activeTeam.emoji} <strong>{activeTeam.jaName}</strong> に <strong>{eventInfo.label}</strong> {t("points awarded!", <><ruby>点獲得<rt className="text-[7px]">てんかくとく</rt></ruby>！</>)}
            </p>

            <button
              type="button"
              onClick={onConfirmPoints}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-base shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t("Next Team (Space)", <><ruby>得点<rt className="text-[7px]">とくてん</rt></ruby>を<ruby>加<rt className="text-[7px]">くわ</rt></ruby>えて<ruby>次<rt className="text-[7px]">つぎ</rt></ruby>のチームへ [Space]</>)}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Case 2: Interactive Rival Targeting (Typhoon, Swap, Steal) */}
        {needsTargetTeam && (
          <div className="w-full space-y-3">
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
              {event === 'TYPHOON' && t("🌀 Choose a rival team to blow away their points!", <>🌀 ポイントを<ruby>吹<rt className="text-[7px]">ふ</rt></ruby>き<ruby>飛<rt className="text-[7px]">と</rt></ruby>ばす<ruby>相手<rt className="text-[7px]">あいて</rt></ruby>チームを<ruby>選<rt className="text-[7px]">えら</rt></ruby>んでください！</>)}
              {event === 'SWAP' && t("🔄 Choose a rival team to swap scores with!", <>🔄 スコアを<ruby>丸<rt className="text-[7px]">まる</rt></ruby>ごと<ruby>入<rt className="text-[7px]">い</rt></ruby>れ<ruby>替<rt className="text-[7px]">か</rt></ruby>える<ruby>相手<rt className="text-[7px]">あいて</rt></ruby>チームを<ruby>選<rt className="text-[7px]">えら</rt></ruby>んでください！</>)}
              {event === 'STEAL_200' && t("🥷 Choose a rival team to steal 200 points from!", <>🥷 200ポイントを<ruby>横取<rt className="text-[7px]">よこど</rt></ruby>りする<ruby>相手<rt className="text-[7px]">あいて</rt></ruby>チームを<ruby>選<rt className="text-[7px]">えら</rt></ruby>んでください！</>)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {rivalTeams.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => onExecuteTargetAction(target.id)}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 shadow-md cursor-pointer ${target.bgLight} ${target.border}`}
                >
                  <span className="text-2xl">{target.emoji}</span>
                  <span className={`text-xs font-black ${target.text}`}>{target.jaName}</span>
                  <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">
                    {target.score} pts
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
