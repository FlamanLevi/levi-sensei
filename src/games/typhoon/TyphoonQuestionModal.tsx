import { TyphoonTileData, TyphoonTeam, TyphoonCoordinateMode } from './types';
import { GradeLevel } from '@data/types';
import { resolveCardImage } from '@/utils/cardUtils';
import { RubyText } from '@/components/common/RubyText';
import { Volume2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface TyphoonQuestionModalProps {
  tile: TyphoonTileData;
  team: TyphoonTeam;
  grade: GradeLevel;
  coordinateMode?: TyphoonCoordinateMode;
  onApproveAnswer: () => void;
  onRetry: () => void;
  onPlayAudio: () => void;
}

export const TyphoonQuestionModal: React.FC<TyphoonQuestionModalProps> = ({
  tile,
  team,
  grade,
  coordinateMode = 'ALPHABET',
  onApproveAnswer,
  onRetry,
  onPlayAudio
}) => {
  const { t } = useLanguage();
  const card = tile.card;
  const imageUrl = resolveCardImage(card, 'picture_only', grade);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl md:max-w-3xl max-h-[92dvh] overflow-y-auto bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center relative select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Active Team Banner */}
        <div className="flex flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap items-center justify-between w-full pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{team.emoji}</span>
            <span className={`text-base font-black truncate ${team.text}`}>
              {team.jaName} ({team.name}) の<ruby>番<rt>ばん</rt></ruby>！
            </span>
          </div>

          <span className="font-mono text-xs font-black px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
            {coordinateMode === 'NUMBERS' ? `Tile #${tile.index + 1}` : `Tile ${tile.coordinate}`}
          </span>
        </div>

        {/* 2-Column Landscape Question Stage */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-center my-1">
          {/* Left: Big Artwork Box */}
          <div className="md:col-span-5 flex justify-center">
            <div className="w-52 h-44 sm:w-64 sm:h-52 rounded-2xl bg-white border-2 border-slate-200 dark:border-slate-700 p-3 shadow-inner flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={card.english}
                  className="max-h-full max-w-full object-contain drop-shadow-md"
                />
              ) : (
                <span className="text-6xl">📖</span>
              )}
            </div>
          </div>

          {/* Right: Prompt & Revealed Word */}
          <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left gap-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
              {t("What is this? Say it in English!", <><ruby>英語<rt>えいご</rt></ruby>で<ruby>答<rt>こた</rt></ruby>えよう！ (What is it?)</>)}
            </h3>

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center md:items-start">
                <span className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">
                  {card.english}
                </span>
                <div className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                  <RubyText ruby={card.ruby} kanji={card.ja_kanji} hiragana={card.ja_hiragana} />
                </div>
              </div>

              <button
                type="button"
                onClick={onPlayAudio}
                className="w-11 h-11 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                title="Listen to pronunciation"
              >
                <Volume2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Teacher Verification Actions */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onRetry}
            className="py-3.5 rounded-2xl font-black text-sm text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>{t("Retry / Pass", <>パス・もう<ruby>一度<rt>いちど</rt></ruby></>)}</span>
          </button>

          <button
            type="button"
            onClick={onApproveAnswer}
            className="py-3.5 rounded-2xl font-black text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={20} />
            <span>{t("Correct! Open Mystery (Space)", <><ruby>言<rt>い</rt></ruby>えた！<ruby>宝箱<rt>たからばこ</rt></ruby>オープン [Space]</>)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
