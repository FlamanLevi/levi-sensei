import React, { useEffect } from 'react';
import { QuizPlayer, QuizQuestion } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle2, Flame, Trophy, Clock, ArrowUp } from 'lucide-react';
import { HanamaruStamp } from '@/components/common/HanamaruStamp';
import { PandaMascot } from '@/components/mascot/PandaMascot';
import { FloatingScorePopup } from '@/components/common/FloatingScorePopup';
import { AvatarDisplay } from '@/components/common/AvatarDisplay';
import { getShopItemById } from '@/services/shopCatalog';

interface QuizStudentFeedbackProps {
  player: QuizPlayer;
  allPlayers: Record<string, QuizPlayer>;
  question?: QuizQuestion | null;
}

export const QuizStudentFeedback: React.FC<QuizStudentFeedbackProps> = ({
  player,
  allPlayers,
  question
}) => {
  const { t } = useLanguage();
  const lastAns = player.lastAnswer;
  const isCorrect = !!lastAns?.isCorrect;
  const points = lastAns?.pointsEarned || 0;
  const streak = player.currentStreak;

  // Calculate current rank and deltas
  const sortedPlayers = Object.values(allPlayers).sort((a, b) => b.score - a.score);
  const myIndex = sortedPlayers.findIndex(p => p.id === player.id);
  const rank = myIndex >= 0 ? myIndex + 1 : 1;
  const totalPlayers = sortedPlayers.length;

  // Points to catch next rank (rank above)
  const playerAbove = myIndex > 0 ? sortedPlayers[myIndex - 1] : null;
  const pointsToNext = playerAbove ? (playerAbove.score - player.score) : null;

  // Points ahead of previous rank (rank below)
  const playerBelow = (myIndex >= 0 && myIndex < sortedPlayers.length - 1) ? sortedPlayers[myIndex + 1] : null;
  const pointsAheadOfPrev = playerBelow ? (player.score - playerBelow.score) : null;

  // Correct answer details for missed question review
  const targetId = question?.correctOptionId || question?.targetWordId;
  const correctOption = question?.options?.find(o => 
    (targetId && o.id === targetId) ||
    (o.english && question?.targetWordEnglish && o.english.trim().toLowerCase() === question.targetWordEnglish.trim().toLowerCase())
  );
  const correctWordEn = question?.targetWordEnglish || correctOption?.english || '';
  const correctWordJa = question?.targetWordJa || correctOption?.ja_kanji || correctOption?.ja_hiragana || '';

  useEffect(() => {
    if (isCorrect) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playIncorrect();
    }
  }, [isCorrect]);

  // Low-anxiety palette: warm vibrant emerald for correct, gentle encouraging indigo/amber for retry
  const cardBg = isCorrect
    ? 'bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-300'
    : !lastAns
      ? 'bg-gradient-to-b from-amber-500 via-orange-600 to-amber-700 border-amber-300'
      : 'bg-gradient-to-b from-indigo-600 via-indigo-700 to-purple-800 border-indigo-400';

  const titleText = isCorrect
    ? t('CORRECT!', 'せいかい！')
    : !lastAns
      ? t("TIME'S UP!", 'じかんぎれ！')
      : t("NICE TRY! DON'T WORRY!", 'おしい！ドンマイ！');

  const subtitleText = isCorrect
    ? t('Well done! Awesome job 🎉', 'たいへんよくできました 🎉')
    : !lastAns
      ? t(
          'Time ran out! Tap quickly next round ⏱️',
          <>つぎは<ruby>素早<rt>すばや</rt></ruby>くボタンをおそう ⏱️</>
        )
      : t("Great effort! You'll get it next time 💭", 'ナイスチャレンジ！つぎはできるよ 💭');

  return (
    <div className="w-full max-w-3xl mx-auto p-3 sm:p-5 select-none flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200 student-ui relative">
      {/* Floating score popup on correct answer */}
      {isCorrect && points > 0 && (
        <FloatingScorePopup points={points} streak={streak} />
      )}

      {/* Result Card (2-Column Landscape Wing Card) */}
      <div
        className={`w-full rounded-3xl p-5 sm:p-6 shadow-2xl border-4 text-white grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-center relative overflow-hidden ${cardBg}`}
      >
        {/* Left Wing: Avatar Badge, Stamp/Mascot, Result Headline */}
        <div className="flex flex-col items-center text-center">
          {/* Student Avatar with Equipped Aura & Title */}
          <div className="flex items-center gap-2 mb-2 bg-black/25 px-3 py-1 rounded-full border border-white/20 shadow-xs">
            <AvatarDisplay avatar={player.avatar || '🇯🇵'} frameId={player.frame} sizeClassName="w-6 h-6 text-sm" />
            <span className="text-xs font-black tracking-tight">{player.nickname}</span>
            {player.title && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 leading-none">
                {getShopItemById(player.title)?.jaName || player.title}
              </span>
            )}
          </div>

          {/* Hanamaru Praise Stamp on Correct Answers */}
          {isCorrect ? (
            <div className="my-1 flex flex-col items-center">
              <HanamaruStamp scoreText="たいへんよくできました" size={160} />
            </div>
          ) : (
            /* Low-Anxiety Encouraging Mascot on Missed Answers */
            <div className="my-2 flex flex-col items-center">
              <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center shadow-lg p-2">
                <PandaMascot mood={!lastAns ? 'nervous' : 'happy'} size={80} />
              </div>
            </div>
          )}

          {/* Title Message */}
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md mb-1 mt-2">
            {titleText}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-white/90">
            {subtitleText}
          </p>
        </div>

        {/* Right Wing: Answer Review, Points/Total Score, Streak & Rank Deltas */}
        <div className="flex flex-col items-center justify-center gap-3 w-full">
          {/* Correct Word & Translation Review on Missed Questions */}
          {!isCorrect && correctWordEn && (
            <div className="w-full bg-black/30 border-2 border-white/30 rounded-2xl p-3 shadow-md text-center animate-in fade-in slide-in-from-top-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-200 block mb-0.5">
                {t('Correct Answer', <><ruby>正解<rt>せいかい</rt></ruby></>)}
              </span>
              <div className="text-xl sm:text-2xl font-black text-white leading-tight">
                {correctWordEn}
              </div>
              {correctWordJa && (
                <span className="text-xs sm:text-sm font-bold text-white/90 block mt-0.5">
                  ({correctWordJa})
                </span>
              )}
            </div>
          )}

          {/* Points & Total Score */}
          <div className="w-full bg-black/30 rounded-2xl p-3 sm:p-4 flex items-center justify-around border border-white/10 shadow-inner">
            <div>
              <span className="text-[11px] font-bold text-white/70 block">
                {t('Points Earned', <><ruby>獲得<rt>かくとく</rt></ruby>ポイント</>)}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                +{points.toLocaleString()} pts
              </span>
            </div>

            <div className="h-8 w-px bg-white/20" />

            <div>
              <span className="text-[11px] font-bold text-white/70 block">
                {t('Total Score', <><ruby>合計<rt>ごうけい</rt></ruby>スコア</>)}
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {player.score.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Streak & Rank Summary */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            {streak > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs shadow-md animate-pulse">
                <Flame size={14} className="text-orange-600 fill-orange-600" />
                <span>{streak}{t(' Streak!', 'れんしょう！')}</span>
              </div>
            )}

            {totalPlayers > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-white/20 text-white font-black text-xs shadow-xs border border-white/20">
                <Trophy size={14} className="text-amber-300" />
                <span>{t(`Rank ${rank} / ${totalPlayers}`, <>{totalPlayers}<ruby>人<rt>にん</rt></ruby><ruby>中<rt>ちゅう</rt></ruby> {rank}<ruby>位<rt>い</rt></ruby></>)}</span>
              </div>
            )}
          </div>

          {/* Rank Deltas */}
          {totalPlayers > 1 && pointsToNext !== null && pointsToNext > 0 && (
            <div className="w-full text-center text-[11px] font-black text-white/90 bg-white/10 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1 border border-white/10">
              <ArrowUp size={12} className="text-emerald-300 animate-bounce" />
              <span>
                {t(`+${pointsToNext.toLocaleString()} pts to pass #${rank - 1}!`, <>あと {pointsToNext.toLocaleString()} <ruby>点<rt>てん</rt></ruby>で {rank - 1}<ruby>位<rt>い</rt></ruby>！</>)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
