import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QuizQuestion, IpadDisplayMode, OPTION_STYLES, TeamId, TEAM_PRESETS, RecallDelaySeconds, DistractorEliminationMode } from '../types';
import { soundEffects } from '@/services/soundEffects';
import { getServerTime } from '@/services/rtdbSafe';
import { useLanguage } from '@/context/LanguageContext';
import { RubyText } from '@/components/common/RubyText';
import { CheckCircle2, Clock, Eye } from 'lucide-react';
import { PandaMascot } from '@/components/mascot/PandaMascot';

interface QuizStudentQuestionProps {
  question: QuizQuestion;
  ipadDisplayMode: IpadDisplayMode;
  teamId?: TeamId;
  recallDelaySeconds?: RecallDelaySeconds;
  eliminateDistractors?: boolean;
  distractorEliminationMode?: DistractorEliminationMode;
  onAnswer: (optionId: string) => void;
  alreadyAnsweredId?: string;
  answeredCount?: number;
  totalStudents?: number;
  playerAvatar?: string;
}

// 100% Purge-Proof Self-Contained CUD High-Contrast Textures
const CUD_TEXTURE_STYLES: Record<string, React.CSSProperties> = {
  // RED ▲ (Triangle) -> 45° Diagonal Slashes
  triangle: {
    backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 3.5px, transparent 3.5px, transparent 14px)`
  },
  // BLUE ◆ (Diamond) -> 45° Intersecting Diamond Argyle Mesh
  diamond: {
    backgroundImage: `
      repeating-linear-gradient(45deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 2.5px, transparent 2.5px, transparent 16px),
      repeating-linear-gradient(-45deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 2.5px, transparent 2.5px, transparent 16px)
    `
  },
  // YELLOW ● (Circle) -> Stamped High-Contrast Dots
  circle: {
    backgroundImage: `radial-gradient(circle, rgba(15, 23, 42, 0.32) 4px, transparent 4px)`,
    backgroundSize: '18px 18px'
  },
  // GREEN ■ (Square) -> 90° Cartesian Graph Grid
  square: {
    backgroundImage: `
      linear-gradient(to right, rgba(255,255,255,0.30) 3px, transparent 3px),
      linear-gradient(to bottom, rgba(255,255,255,0.30) 3px, transparent 3px)
    `,
    backgroundSize: '16px 16px'
  }
};

export const QuizStudentQuestion: React.FC<QuizStudentQuestionProps> = ({
  question,
  ipadDisplayMode,
  teamId,
  recallDelaySeconds = 0,
  eliminateDistractors = false,
  distractorEliminationMode,
  onAnswer,
  alreadyAnsweredId,
  answeredCount = 1,
  totalStudents = 1,
  playerAvatar = '🐼'
}) => {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(alreadyAnsweredId || null);
  const [buddyBounce, setBuddyBounce] = useState<number>(0);
  const hasAnsweredRef = useRef<boolean>(!!alreadyAnsweredId);
  const unblurPlayedRef = useRef<boolean>(false);

  const [elapsedMs, setElapsedMs] = useState<number>(() => {
    const start = (question.startTime && question.startTime > 0) ? question.startTime : getServerTime();
    return Math.max(0, getServerTime() - start);
  });

  const startTimeRef = useRef<number>((question.startTime && question.startTime > 0) ? question.startTime : getServerTime());

  // Sync selectedId if alreadyAnsweredId changes
  useEffect(() => {
    setSelectedId(alreadyAnsweredId || null);
    hasAnsweredRef.current = !!alreadyAnsweredId;
  }, [alreadyAnsweredId]);

  useEffect(() => {
    unblurPlayedRef.current = false;
    hasAnsweredRef.current = !!alreadyAnsweredId;
    setBuddyBounce(0);
    const start = (question.startTime && question.startTime > 0) ? question.startTime : getServerTime();
    startTimeRef.current = start;
    setElapsedMs(Math.max(0, getServerTime() - start));
    const interval = setInterval(() => {
      setElapsedMs(Math.max(0, getServerTime() - startTimeRef.current));
    }, 100);
    return () => clearInterval(interval);
  }, [question.questionIndex, question.startTime]);

  const isRecallLocked = recallDelaySeconds > 0 && elapsedMs < (recallDelaySeconds * 1000);
  const recallSecondsLeft = Math.max(1, Math.ceil((recallDelaySeconds * 1000 - elapsedMs) / 1000));

  useEffect(() => {
    if (recallDelaySeconds > 0 && !isRecallLocked && !unblurPlayedRef.current && elapsedMs >= recallDelaySeconds * 1000) {
      unblurPlayedRef.current = true;
      soundEffects.playUnblurChime();
    }
  }, [recallDelaySeconds, isRecallLocked, elapsedMs]);

  const timeLeftMs = Math.max(0, (question.timeLimitMs || 15000) - elapsedMs);
  const secondsLeft = Math.ceil(timeLeftMs / 1000);

  const eliminationMode: DistractorEliminationMode = distractorEliminationMode || (eliminateDistractors ? 'HALFWAY' : 'OFF');

  const eliminatedCount = useMemo(() => {
    if (eliminationMode === 'OFF') return 0;
    const limit = question.timeLimitMs || 15000;
    if (eliminationMode === 'HALFWAY') {
      return timeLeftMs <= limit * 0.5 ? 2 : 0;
    }
    if (eliminationMode === 'GRADUAL') {
      if (timeLeftMs <= limit * 0.34) return 2;
      if (timeLeftMs <= limit * 0.67) return 1;
      return 0;
    }
    return 0;
  }, [eliminationMode, timeLeftMs, question.timeLimitMs]);

  const eliminatedOptionIds = useMemo(() => {
    if (eliminatedCount === 0) return new Set<string>();
    if (question.distractorOptionIds && question.distractorOptionIds.length > 0) {
      return new Set(question.distractorOptionIds.slice(0, eliminatedCount));
    }
    const wrongOptions = question.correctOptionId
      ? question.options.filter(o => o.id !== question.correctOptionId)
      : [];
    return new Set(wrongOptions.slice(0, eliminatedCount).map(o => o.id));
  }, [eliminatedCount, question]);

  const prevEliminatedCountRef = useRef<number>(0);
  useEffect(() => {
    if (eliminatedOptionIds.size > prevEliminatedCountRef.current && !selectedId) {
      soundEffects.play5050();
    }
    prevEliminatedCountRef.current = eliminatedOptionIds.size;
  }, [eliminatedOptionIds.size, selectedId]);

  useEffect(() => {
    prevEliminatedCountRef.current = 0;
  }, [question.questionIndex]);

  const handleSelect = (optionId: string) => {
    if (selectedId || hasAnsweredRef.current || isRecallLocked || timeLeftMs <= 0 || eliminatedOptionIds.has(optionId)) return;
    
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(25); } catch {}
    }

    hasAnsweredRef.current = true;
    setSelectedId(optionId);
    soundEffects.playTick();
    onAnswer(optionId);
  };

  const hasAnswered = !!selectedId;
  const selectedOption = question.options.find(o => o.id === selectedId);

  return (
    <div className={`w-full h-[100dvh] max-h-[100dvh] max-w-5xl mx-auto flex flex-col justify-between p-2 sm:p-3 select-none overflow-hidden student-ui animate-in fade-in duration-150 ${
      secondsLeft <= 5 && !hasAnswered ? 'ring-4 ring-rose-500/70 inset transition-all duration-300' : ''
    }`}>
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Q {question.questionIndex + 1} / {question.totalQuestions}
          </span>
          {teamId && TEAM_PRESETS[teamId] && (
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <span>{TEAM_PRESETS[teamId].emoji}</span>
              <span>{language === 'ja' ? TEAM_PRESETS[teamId].jaName : TEAM_PRESETS[teamId].name}</span>
            </span>
          )}
          {ipadDisplayMode === 'EYES_UP' && !hasAnswered && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
              <Eye size={12} />
              <span>{t('Look at TV! (Eyes Up)', <><ruby>前<rt className="text-[8px] font-normal">まえ</rt></ruby>を<ruby>見<rt className="text-[8px] font-normal">み</rt></ruby>てね！</>)}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <PandaMascot 
            mood={secondsLeft <= 5 && !hasAnswered ? 'panicking' : hasAnswered ? 'cheering' : 'idle'} 
            size={38}
          />

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Clock size={13} className={secondsLeft <= 5 ? 'text-rose-500 animate-spin' : ''} />
            <span className={`font-mono font-black text-xs ${secondsLeft <= 5 ? 'text-rose-500 font-bold animate-pulse' : 'text-slate-600 dark:text-slate-300'}`}>
              {secondsLeft}s
            </span>
          </div>

          {hasAnswered && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-black">
              <CheckCircle2 size={14} />
              <span>{t('Submitted!', <><ruby>送信完了<rt className="text-[8px] font-normal">そうしんかんりょう</rt></ruby>！</>)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2 shrink-0 shadow-inner">
        <div
          className={`h-full transition-all duration-100 ease-linear rounded-full ${
            secondsLeft <= 5 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-blue-500'
          }`}
          style={{ width: `${Math.max(0, (timeLeftMs / (question.timeLimitMs || 15000)) * 100)}%` }}
        />
      </div>

      {/* Mirrored Mode: Question Prompt Banner */}
      {ipadDisplayMode === 'MIRRORED' && !hasAnswered && (
        <div className="mb-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center gap-3 text-center shrink-0 min-h-[50px] sm:min-h-[58px]">
          {question.promptImage && (
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center">
              <img
                src={question.promptImage}
                alt={question.promptText}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          )}
          <div className="flex flex-col items-center">
            <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {question.promptText}
            </h3>
            {question.promptSubtext && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                {question.promptSubtext}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Interactive Stage: Tactile Waiting Pad or 2x2 Choice Buttons */}
      <div className="relative flex-1 min-h-0 w-full my-1 flex flex-col justify-center">
        {hasAnswered ? (
          /* Zero-Traffic Waiting Room (Eyes-Up Direction) */
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none animate-in zoom-in-95 duration-200">
            <div 
              onClick={() => {
                soundEffects.playTick();
                setBuddyBounce(prev => prev + 1);
              }}
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-5xl sm:text-6xl shadow-xl active:scale-90 transition-transform cursor-pointer border-4 border-white/40 mb-2 ${
                buddyBounce > 0 ? 'animate-bounce' : 'hover:scale-105'
              }`}
              title={t("Tap to bounce your buddy!", "タップしてあそぼう！")}
            >
              <PandaMascot mood="cheering" size={90} />
            </div>

            <span className="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-300 mb-2 block">
              {t("Tap your buddy while waiting!", <>タップしてあそびながら<ruby>待<rt className="text-[8px] font-normal text-slate-400">ま</rt></ruby>っててね！</>)}
            </span>

            {/* Locked-in Answer Confirmation Pill */}
            {selectedOption && (
              <div className="my-2 px-4 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200 shadow-xs">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>{t("Locked in: ", "えらんだ答え: ")}</span>
                <span>
                  {selectedOption.symbol === 'triangle' ? '▲' : selectedOption.symbol === 'diamond' ? '◆' : selectedOption.symbol === 'circle' ? '●' : '■'} {selectedOption.english}
                </span>
              </div>
            )}

            {/* Prominent Eyes-Up Direction */}
            <div className="mt-3 px-5 py-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/80 flex items-center gap-2 text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200 shadow-sm animate-pulse">
              <span className="text-lg">👀</span>
              <span>{t('Look at the front TV screen!', '前のテレビ画面を見てね！')}</span>
            </div>
          </div>
        ) : (
          <>
            {isRecallLocked && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-slate-950/90 border-2 border-indigo-400/50 text-white p-6 shadow-2xl select-none animate-in fade-in duration-150">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/90 text-white flex items-center justify-center text-3xl mb-3 shadow-xl animate-bounce">
                  🤔
                </div>
                <h4 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md text-center">
                  {t('Think First!', <>まずは<ruby>頭<rt className="text-[8px] font-normal text-indigo-300">あたま</rt></ruby>で<ruby>考<rt className="text-[8px] font-normal text-indigo-300">かんが</rt></ruby>えよう！</>)}
                </h4>
                <p className="text-xs sm:text-sm font-bold text-indigo-200 mt-1.5 text-center">
                  {t('Remember the word in English... buttons opening soon!', <><ruby>英語<rt className="text-[8px] font-normal text-indigo-300">えいご</rt></ruby>を<ruby>思<rt className="text-[8px] font-normal text-indigo-300">おも</rt></ruby>い<ruby>出<rt className="text-[8px] font-normal text-indigo-300">だ</rt></ruby>してね... まもなくボタンが<ruby>開<rt className="text-[8px] font-normal text-indigo-300">ひら</rt></ruby>きます！</>)}
                </p>
                <div className="mt-4 px-5 py-2 rounded-full bg-white/20 border border-white/30 text-base font-mono font-black animate-pulse">
                  {t(`Remaining: ${recallSecondsLeft}s`, <><ruby>残<rt className="text-[8px] font-normal">のこ</rt></ruby>り {recallSecondsLeft} <ruby>秒<rt className="text-[8px] font-normal">びょう</rt></ruby></>)}
                </div>
              </div>
            )}

            {/* 4 3D Buttons: Works in BOTH Portrait and Landscape */}
            <div className={`grid grid-cols-2 grid-rows-2 gap-3 sm:gap-6 h-full min-h-0 transition-all duration-300 ${isRecallLocked ? 'filter blur-md opacity-40 select-none pointer-events-none' : ''}`}>
              {question.options.map((option, idx) => {
                const style = OPTION_STYLES[idx] || OPTION_STYLES[0];
                const isSelected = selectedId === option.id;
                const isEliminated = eliminatedOptionIds.has(option.id);

                const isEnPrompt = question.promptType === 'EN_TO_JA' || question.promptType === 'EN_WORD';
                const displayText = isEnPrompt
                  ? (option.ja_kanji || option.ja_hiragana || option.english)
                  : option.english;
                const subText = isEnPrompt
                  ? (option.ja_hiragana && option.ja_kanji !== option.ja_hiragana ? option.ja_hiragana : undefined)
                  : (question.englishReadingAid === 'WITH_KATAKANA' && option.en_katakana ? `【${option.en_katakana}】` : undefined);

                const toyBtnClass = {
                  triangle: 'btn-toy-rose',
                  diamond:  'btn-toy-blue',
                  circle:   'btn-toy-amber',
                  square:   'btn-toy-emerald'
                }[option.symbol] || 'btn-toy-base';

                const textureStyle = CUD_TEXTURE_STYLES[option.symbol] || {};

                return (
                  <button
                    key={option.id}
                    disabled={hasAnswered || isRecallLocked || isEliminated || timeLeftMs <= 0}
                    onClick={() => handleSelect(option.id)}
                    className={`relative rounded-2xl sm:rounded-3xl ${toyBtnClass} p-1.5 sm:p-2.5 flex items-center justify-center text-center select-none overflow-hidden touch-manipulation h-full min-h-0 ${
                      isSelected
                        ? 'ring-8 ring-white dark:ring-slate-200 scale-[0.98] translate-y-1.5 brightness-110 shadow-inner z-10'
                        : isEliminated
                          ? 'opacity-15 grayscale line-through pointer-events-none scale-95'
                          : 'hover:brightness-105 active:scale-95 cursor-pointer'
                    }`}
                  >
                    {/* CUD High-Contrast Texture Layer */}
                    <div 
                      className="absolute inset-0 pointer-events-none rounded-3xl"
                      style={textureStyle}
                    />

                    {/* EYES_UP Mode: Dynamically Scaled Shape Symbol (Never Sliced) */}
                    {ipadDisplayMode === 'EYES_UP' && (
                      <span
                        className={`font-black leading-none text-white drop-shadow-md select-none text-6xl sm:text-8xl md:text-9xl`}
                        style={{
                          fontSize: 'min(14vh, 22vw, 110px)',
                          lineHeight: 1
                        }}
                      >
                        {style.shapeName}
                      </span>
                    )}

                    {/* MIRRORED Mode: Shape Symbol Pinned to Top-Left */}
                    {ipadDisplayMode === 'MIRRORED' && (
                      <span className="absolute top-2 left-2.5 sm:top-3 sm:left-3.5 text-lg sm:text-2xl font-black text-white/95 drop-shadow select-none">
                        {style.shapeName}
                      </span>
                    )}

                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2.5 sm:top-3 sm:right-3.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-md animate-in zoom-in-50 z-10">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      </div>
                    )}

                    {/* MIRRORED Mode Content */}
                    {ipadDisplayMode === 'MIRRORED' && (
                      <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 px-1 sm:px-2">
                        {!isEnPrompt && !question.promptImage && question.promptType !== 'IMAGE_ONLY' && option.image && (
                          <div className="bg-white rounded-xl p-1 shadow-md shrink-0 flex items-center justify-center">
                            <img
                              src={option.image}
                              alt={displayText}
                              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain rounded-lg"
                            />
                          </div>
                        )}

                        <div className={`flex flex-col min-w-0 ${!isEnPrompt && option.image ? 'items-center sm:items-start text-center sm:text-left' : 'items-center text-center'}`}>
                          {isEnPrompt ? (
                            <RubyText
                              ruby={option.ruby}
                              kanji={option.ja_kanji}
                              hiragana={option.ja_hiragana}
                              className="text-sm sm:text-lg md:text-xl font-black text-white drop-shadow-md leading-tight text-center"
                              rtClassName="text-[10px] sm:text-xs font-normal text-white/90 select-none"
                            />
                          ) : (
                            <>
                              <span className="text-sm sm:text-lg md:text-xl font-black text-white drop-shadow-md leading-tight break-words">
                                {displayText}
                              </span>
                              {subText && (
                                <span className="text-xs sm:text-sm font-bold text-white/90 mt-0.5 break-words">
                                  {subText}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom Status Banner */}
      <div className="pt-1 text-center shrink-0">
        {hasAnswered ? (
          <p className="text-xs font-black text-slate-600 dark:text-slate-400">
            {t('✓ Answer submitted! Watch the main screen for the reveal!', <>✓ <ruby>回答<rt className="text-[8px] font-normal">かいとう</rt></ruby>を<ruby>送信<rt className="text-[8px] font-normal">そうしん</rt></ruby>しました！<ruby>前<rt className="text-[8px] font-normal">まえ</rt></ruby>の<ruby>画面<rt className="text-[8px] font-normal">がめん</rt></ruby>の<ruby>正解発表<rt className="text-[8px] font-normal">せいかいはっぴょう</rt></ruby>を<ruby>待<rt className="text-[8px] font-normal">ま</rt></ruby>ってね！</>)}
          </p>
        ) : isRecallLocked ? (
          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 animate-pulse">
            {t('🤔 Thinking time... recall the English word in your mind!', <>🤔 <ruby>思考<rt className="text-[8px] font-normal">しこう</rt></ruby>タイム<ruby>中<rt className="text-[8px] font-normal">ちゅう</rt></ruby>... <ruby>頭<rt className="text-[8px] font-normal">あたま</rt></ruby>の<ruby>中<rt className="text-[8px] font-normal">なか</rt></ruby>で<ruby>英単語<rt className="text-[8px] font-normal">えいたんご</rt></ruby>を<ruby>思<rt className="text-[8px] font-normal">おも</rt></ruby>い<ruby>出<rt className="text-[8px] font-normal">だ</rt></ruby>そう！</>)}
          </p>
        ) : (
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse">
            {t('Tap the button for the correct color quickly!', <><ruby>正<rt className="text-[8px] font-normal">ただ</rt></ruby>しいと<ruby>思<rt className="text-[8px] font-normal">おも</rt></ruby>う<ruby>色<rt className="text-[8px] font-normal">いろ</rt></ruby>のボタンを<ruby>素早<rt className="text-[8px] font-normal">すばや</rt></ruby>くタップ！</>)}
          </p>
        )}
      </div>
    </div>
  );
};