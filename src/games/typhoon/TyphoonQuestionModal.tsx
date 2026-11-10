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
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border-4 border-amber-400 dark:border-amber-500 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center text-center relative select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Active Team Banner */}
        <div className="flex items-center justify-between w-full pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{team.emoji}</span>
            <span className={`text-base font-black ${team.text}`}>
              {team.jaName} ({team.name}) の<ruby>番<rt className="text-[7px]">ばん</rt></ruby>！
            </span>
          </div>

          <span className="font-mono text-xs font-black px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {coordinateMode === 'NUMBERS' ? `Tile #${tile.index + 1}` : `Tile ${tile.coordinate}`}
          </span>
        </div>

        {/* Prompt Instruction */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          {t("What is this? Say it in English!", <><ruby>英語<rt className="text-[7px]">えいご</rt></ruby>で<ruby>答<rt className="text-[7px]">こた</rt></ruby>えよう！ (What is it?)</>)}
        </h3>

        {/* Big Artwork Box */}
        <div className="w-56 h-48 sm:w-72 sm:h-56 rounded-2xl bg-white border-2 border-slate-200 dark:border-slate-700 p-3 shadow-inner flex items-center justify-center my-2">
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

        {/* Hidden Word revealed after speech confirmation */}
        <div className="flex items-center justify-center gap-3 my-2">
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">
              {card.english}
            </span>
            <div className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              <RubyText ruby={card.ruby} kanji={card.ja_kanji} hiragana={card.ja_hiragana} />
            </div>
          </div>

          <button
            type="button"
            onClick={onPlayAudio}
            className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
            title="Listen to pronunciation"
          >
            <Volume2 size={20} />
          </button>
        </div>

        {/* Teacher Verification Actions */}
        <div className="w-full grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onRetry}
            className="py-3.5 rounded-2xl font-black text-sm text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={16} />
            <span>{t("Retry / Pass", <>パス・もう<ruby>一度<rt className="text-[7px]">いちど</rt></ruby></>)}</span>
          </button>

          <button
            type="button"
            onClick={onApproveAnswer}
            className="py-3.5 rounded-2xl font-black text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={20} />
            <span>{t("Correct! Open Mystery (Space)", <><ruby>言<rt className="text-[7px]">い</rt></ruby>えた！<ruby>宝箱<rt className="text-[7px]">たからばこ</rt></ruby>オープン [Space]</>)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
