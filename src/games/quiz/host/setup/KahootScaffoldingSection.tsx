import React from 'react';
import { Clock, Eye, EyeOff, HelpCircle, Image as ImageIcon, Languages, Layers, Volume2, Zap } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  ACTION_SIX_PROMPT_TYPES,
  ALL_EIGHT_PROMPT_TYPES,
  isPromptTypeAllowedInGamePlay,
} from '../../core/quizEngine';
import {
  ChoiceImageMode,
  DistractorEliminationMode,
  EnglishReadingAid,
  GamePlayType,
  IpadDisplayMode,
  PromptType,
  QuizSubject,
  RecallDelaySeconds,
} from '../../types';

interface KahootScaffoldingSectionProps {
  gamePlayType: GamePlayType;
  subject: QuizSubject;
  activeGrade: string;
  wordsInPoolLength: number;
  ipadDisplayStep: number;
  questionCountStep: number;
  timeLimitStep: number;
  mechanicsStep: number;
  questionVarietiesStep: number;
  answerStylesStep: number;
  ipadDisplayMode: IpadDisplayMode;
  onSelectIpadDisplayMode: (mode: IpadDisplayMode) => void;
  questionCount: number;
  onSelectQuestionCount: (count: number) => void;
  timeLimitSeconds: number;
  onSelectTimeLimitSeconds: (sec: number) => void;
  recallDelaySeconds: RecallDelaySeconds;
  onChangeRecallDelay: (sec: RecallDelaySeconds) => void;
  distractorEliminationMode: DistractorEliminationMode;
  onChangeDistractorMode: (mode: DistractorEliminationMode) => void;
  promptTypes: PromptType[];
  onSetPromptTypes: (types: PromptType[]) => void;
  onTogglePromptType: (type: PromptType) => void;
  choiceImageMode: ChoiceImageMode;
  onSelectChoiceImageMode: (mode: ChoiceImageMode) => void;
  isChoiceImageLocked: boolean;
  englishReadingAid: EnglishReadingAid;
  onSelectEnglishReadingAid: (aid: EnglishReadingAid) => void;
}

export const KahootScaffoldingSection: React.FC<KahootScaffoldingSectionProps> = ({
  gamePlayType,
  subject,
  activeGrade,
  wordsInPoolLength,
  ipadDisplayStep,
  questionCountStep,
  timeLimitStep,
  mechanicsStep,
  questionVarietiesStep,
  answerStylesStep,
  ipadDisplayMode,
  onSelectIpadDisplayMode,
  questionCount,
  onSelectQuestionCount,
  timeLimitSeconds,
  onSelectTimeLimitSeconds,
  recallDelaySeconds,
  onChangeRecallDelay,
  distractorEliminationMode,
  onChangeDistractorMode,
  promptTypes,
  onSetPromptTypes,
  onTogglePromptType,
  choiceImageMode,
  onSelectChoiceImageMode,
  isChoiceImageLocked,
  englishReadingAid,
  onSelectEnglishReadingAid,
}) => {
  const { t, language } = useLanguage();
  const isKahootMode = gamePlayType === 'KAHOOT';
  const shortClozeAllowed = isPromptTypeAllowedInGamePlay('SHORT_CLOZE', gamePlayType);
  const threeHintsAllowed = isPromptTypeAllowedInGamePlay('THREE_HINTS', gamePlayType);

  return (
    <>
      {/* 5. Classic Kahoot Settings (Only when Kahoot style) */}
      {isKahootMode && (
        <>
          {/* iPad Display Mode */}
          <div>
            <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
              {t(`${ipadDisplayStep}. Student iPad Display`, `${ipadDisplayStep}. 児童の画面表示`)}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onSelectIpadDisplayMode('EYES_UP')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  ipadDisplayMode === 'EYES_UP'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Eye
                  className={ipadDisplayMode === 'EYES_UP' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}
                  size={20}
                />
                <div>
                  <span className="text-xs font-black block">{t('Eyes-Up (Shapes Only: ▲ ◆ ● ■)', '前を向く！マークのみ (▲ ◆ ● ■)')}</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    {t('Forces students to look up at the classroom TV for questions.', '問題文はテレビの大画面に注目させ、iPadは回答ボタンのみ表示。')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectIpadDisplayMode('MIRRORED')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  ipadDisplayMode === 'MIRRORED'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-400/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Layers
                  className={ipadDisplayMode === 'MIRRORED' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}
                  size={20}
                />
                <div>
                  <span className="text-xs font-black block">{t('Mirrored (Full Cards on iPads)', '手元表示 (イラスト・文字)')}</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    {t('Shows English words & illustrations directly on iPads.', '手元のiPadにも英語とイラストを直接表示。')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Question Count & Time Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {t(`${questionCountStep}. Question Count`, `${questionCountStep}. 問題数`)}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[5, 10, 15, 20, -1].map((num) => {
                  const isDisabled = subject === 'ENGLISH' && num !== -1 && num > wordsInPoolLength;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onSelectQuestionCount(num)}
                      title={
                        isDisabled
                          ? language === 'ja'
                            ? `単語数（${wordsInPoolLength}語）を超えているため選択できません`
                            : `Exceeds pool size (${wordsInPoolLength} words)`
                          : undefined
                      }
                      className={`py-2.5 rounded-xl font-black text-xs border-2 transition-all ${
                        isDisabled
                          ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          : questionCount === num
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {num === -1 ? t('All', '全問') : `${num}${t(' Qs', '問')}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
                {t(`${timeLimitStep}. Time Per Question`, `${timeLimitStep}. 制限時間`)}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onSelectTimeLimitSeconds(sec)}
                    className={`py-2.5 rounded-xl font-black text-xs border-2 transition-all flex items-center justify-center gap-1 ${
                      timeLimitSeconds === sec
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Clock size={12} />
                    <span>{sec}s</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Mechanics & Hints (Recall First & Distractor Elimination) */}
          <div>
            <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
              {t(`${mechanicsStep}. Question Mechanics & Hints`, `${mechanicsStep}. 出題ギミック・ヒント設定`)}
            </label>
            <div className={`grid grid-cols-1 ${subject === 'MATH' ? '' : 'sm:grid-cols-2'} gap-3`}>
              {/* Recall First / Think First Blind Delay (English only) */}
              {subject !== 'MATH' && (
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                            recallDelaySeconds > 0
                              ? 'bg-blue-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <EyeOff size={15} />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {t('Recall First (Thinking Time)', '思考タイム')}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          recallDelaySeconds > 0
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold'
                        }`}
                      >
                        {recallDelaySeconds === 0 ? 'OFF' : `${recallDelaySeconds}s ${t('Blur', 'ぼかし')}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5 leading-snug">
                      {t(
                        'Hides options for the first few seconds so students recall English in their mind first.',
                        '最初の数秒間、選択肢を隠して頭で英単語を思い浮かべる時間を設けます。'
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([0, 3, 5] as RecallDelaySeconds[]).map((sec) => {
                      const isSelected = recallDelaySeconds === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => onChangeRecallDelay(sec)}
                          className={`py-2 px-1 rounded-xl font-black text-xs border-2 transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {sec === 0 ? t('OFF (Instant)', 'OFF (即時)') : `${sec}s ${t('Delay', '遅延')}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Distractor Elimination Hint */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                          distractorEliminationMode !== 'OFF'
                            ? 'bg-blue-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Zap size={15} />
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {t('Distractor Elimination Hints', '選択肢絞り込みヒント')}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        distractorEliminationMode !== 'OFF'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold'
                      }`}
                    >
                      {distractorEliminationMode === 'GRADUAL'
                        ? 'GRADUAL'
                        : distractorEliminationMode === 'HALFWAY'
                          ? '50/50'
                          : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5 leading-snug">
                    {distractorEliminationMode === 'GRADUAL'
                      ? t(
                          'Dims 1 incorrect choice at 33% elapsed, and 2nd incorrect choice at 66% elapsed.',
                          '残り時間が約66%で1択、約33%で2択目を段階的に消去してアシストします。'
                        )
                      : distractorEliminationMode === 'HALFWAY'
                        ? t(
                            'When time reaches halfway, automatically dims 2 incorrect answers to assist.',
                            '残り時間が半分になると、誤答の2択を自動で消去・薄暗くしてアシストします。'
                          )
                        : t('Keep all 4 multiple choice options visible until time runs out.', '4つの選択肢を最後までそのまま表示します。')}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeDistractorMode('OFF')}
                    className={`py-2 px-1 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer text-center ${
                      distractorEliminationMode === 'OFF'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {t('OFF (4 Options)', 'OFF (4択)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeDistractorMode('HALFWAY')}
                    className={`py-2 px-1 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer text-center ${
                      distractorEliminationMode === 'HALFWAY'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {t('50/50 (Halfway)', '50/50 (半分で2択)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeDistractorMode('GRADUAL')}
                    className={`py-2 px-1 rounded-xl font-black text-[11px] border-2 transition-all cursor-pointer text-center ${
                      distractorEliminationMode === 'GRADUAL'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {t('Gradual (Step-by-step)', '段階的 (33/66%)')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Question Prompt Variety & Scaffolding */}
      {subject === 'MATH' ? (
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">📐</span>
            <div className="min-w-0">
              <span className="font-black text-emerald-900 dark:text-emerald-100 block mb-0.5">
                {t('Algorithmic Mathematical Problem Cards Active', '算数問題・自動レイアウト稼働中')}
              </span>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">
                {t(
                  'Equations, geometry shapes, and units automatically adapt with giant high-contrast typography and MEXT Japanese font stack across classroom TVs and student iPads.',
                  '数式・幾何図形・単位換算がテレビとiPadに最も見やすいUDデジタル教科書体で最適表示されます。'
                )}
              </span>
            </div>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-600 text-white shrink-0">MEXT 算数</span>
        </div>
      ) : (
        <>
          <div>
            <div className="flex flex-nowrap items-center justify-between gap-2 mb-2 overflow-x-auto no-scrollbar">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider shrink-0 whitespace-nowrap">
                {`${questionVarietiesStep}. `}
                {t('Question Varieties', '出題バリエーション')}
              </label>
              <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                <button
                  type="button"
                  onClick={() => onSetPromptTypes(['JA_MEANING', 'EN_TO_JA', 'IMAGE_ONLY', 'AUDIO_ONLY'])}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {t('📘 Basic 4', '📘 基本4種')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetPromptTypes(
                      isKahootMode
                        ? ['JA_MEANING', 'IMAGE_ONLY', 'PHONICS_MASK', 'SHORT_CLOZE', 'CATEGORY_HUNT', 'THREE_HINTS']
                        : ['JA_MEANING', 'EN_TO_JA', 'IMAGE_ONLY', 'PHONICS_MASK', 'CATEGORY_HUNT']
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {t('✨ Fun Mix', '✨ 応用ミックス')}
                </button>
                <button
                  type="button"
                  onClick={() => onSetPromptTypes(isKahootMode ? ALL_EIGHT_PROMPT_TYPES : ACTION_SIX_PROMPT_TYPES)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isKahootMode ? t('🎯 All 8', '🎯 全8種フル') : t('🎯 All 6', '🎯 全6種')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onTogglePromptType('JA_MEANING')}
                className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  promptTypes.includes('JA_MEANING')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <HelpCircle
                  size={16}
                  className={promptTypes.includes('JA_MEANING') ? 'text-blue-500 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'}
                />
                <span className="truncate">{t('Japanese ➔ English', '日本語 ➔ 英語')}</span>
              </button>

              <button
                type="button"
                onClick={() => onTogglePromptType('EN_TO_JA')}
                className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  promptTypes.includes('EN_TO_JA')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Languages
                  size={16}
                  className={promptTypes.includes('EN_TO_JA') ? 'text-blue-500 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'}
                />
                <span className="truncate">{t('English ➔ Japanese', '英語 ➔ 日本語')}</span>
              </button>

              <button
                type="button"
                onClick={() => onTogglePromptType('IMAGE_ONLY')}
                className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  promptTypes.includes('IMAGE_ONLY')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <ImageIcon
                  size={16}
                  className={promptTypes.includes('IMAGE_ONLY') ? 'text-blue-500 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'}
                />
                <span className="truncate">{t('Illustration ➔ English', 'イラスト ➔ 英語')}</span>
              </button>

              <button
                type="button"
                onClick={() => onTogglePromptType('AUDIO_ONLY')}
                className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  promptTypes.includes('AUDIO_ONLY')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Volume2
                  size={16}
                  className={promptTypes.includes('AUDIO_ONLY') ? 'text-blue-500 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'}
                />
                <span className="truncate">{t('Audio Listening ➔ English', '音声 ➔ 英語')}</span>
              </button>

              {/* VARIETY 5: PHONICS_MASK */}
              <button
                type="button"
                onClick={() => onTogglePromptType('PHONICS_MASK')}
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  promptTypes.includes('PHONICS_MASK')
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="truncate font-black">{t('🔤 Phonics Blank (K[?]rea)', '🔤 虫食いフォニックス')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                    {t('⚡ Fast OK', '⚡ レース◎')}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 truncate">
                  {t('Pick the missing letters (ea / ee / er / o)', '単語の [ ? ] に入る文字・つづりを選ぶ')}
                </span>
              </button>

              {/* VARIETY 6: CATEGORY_HUNT */}
              <button
                type="button"
                onClick={() => onTogglePromptType('CATEGORY_HUNT')}
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                  promptTypes.includes('CATEGORY_HUNT')
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="truncate font-black">{t('🐾 Category Hunter', '🐾 なかま探し (分類)')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                    {t('⚡ Fast OK', '⚡ レース◎')}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 truncate">
                  {t('Find the word in the target category', '「動物はどれ？」などカテゴリーで選ぶ')}
                </span>
              </button>

              {/* VARIETY 7: SHORT_CLOZE (Disabled outside KAHOOT) */}
              <button
                type="button"
                disabled={!shortClozeAllowed}
                onClick={() => onTogglePromptType('SHORT_CLOZE')}
                title={
                  !shortClozeAllowed
                    ? t('Available in Live Arena (Kahoot) mode only.', '長文読解のため「一斉対戦 (Kahoot)」モード専用です。')
                    : undefined
                }
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 ${
                  !shortClozeAllowed
                    ? 'opacity-45 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400'
                    : promptTypes.includes('SHORT_CLOZE')
                      ? 'cursor-pointer border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                      : 'cursor-pointer border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="truncate font-black">{t('💬 Sentence Blank [ ? ]', '💬 会話・文の空欄 [ ? ]')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                    {!shortClozeAllowed ? t('📺 Kahoot Only', '📺 Kahoot専用') : t('📺 Kahoot', '📺 Kahoot推奨')}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 truncate">
                  {!shortClozeAllowed
                    ? t('Multi-sentence prompt disabled in fast action modes.', 'スピード競技では自動除外されます')
                    : t('"I like [ ? ]." textbook sentence cloze', '教科書のやりとり・例文の [ ? ] を埋める')}
                </span>
              </button>

              {/* VARIETY 8: THREE_HINTS (Disabled outside KAHOOT) */}
              <button
                type="button"
                disabled={!threeHintsAllowed}
                onClick={() => onTogglePromptType('THREE_HINTS')}
                title={
                  !threeHintsAllowed
                    ? t('Available in Live Arena (Kahoot) mode only.', '段階ヒント読解のため「一斉対戦 (Kahoot)」モード専用です。')
                    : undefined
                }
                className={`p-2.5 rounded-xl border-2 text-left text-xs font-bold transition-all flex flex-col justify-between gap-1 ${
                  !threeHintsAllowed
                    ? 'opacity-45 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400'
                    : promptTypes.includes('THREE_HINTS')
                      ? 'cursor-pointer border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                      : 'cursor-pointer border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="truncate font-black">{t('🕵️‍♂️ 3-Hint Detective', '🕵️‍♂️ 3ヒント・クイズ')}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                    {!threeHintsAllowed ? t('📺 Kahoot Only', '📺 Kahoot専用') : t('📺 Kahoot', '📺 Kahoot推奨')}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 truncate">
                  {!threeHintsAllowed
                    ? t('Timed multi-clue prompt disabled in fast action modes.', 'スピード競技では自動除外されます')
                    : t('Unlocks Hint 1 ➔ Hint 2 ➔ Hint 3', '時間経過でヒント1 ➔ 2 ➔ 3がオープン！')}
                </span>
              </button>
            </div>
          </div>

          {/* 9. Answer Varieties & Pedagogical Scaffolding */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                {`${answerStylesStep}. `}
                {t('Answer Styles & Scaffolding', '回答形式 & 学習補助')}
              </label>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {t('Pedagogical Guardrails Active', '指導要領ガードレール適用中')}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* SUB-CONTROL A: Choice Card Illustrations */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>🖼️</span>
                      <span>{t('Choice Illustrations', '選択肢の画像表示')}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {isChoiceImageLocked ? t('Cheat-Lock Active', '絵合わせロック中') : t('Smart Auto-Active', 'スマート連動')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-snug">
                    {t(
                      'Controls whether 4 answer buttons display textbook illustrations (Visual cheat prevention prevents picture-matching).',
                      '選択肢に教科書イラストを添えるかを設定（問題に絵がある時は絵合わせ不正を防ぐため自動無効）。'
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option A1: Text-Focused */}
                  <button
                    type="button"
                    onClick={() => onSelectChoiceImageMode('TEXT_ONLY')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      choiceImageMode === 'TEXT_ONLY'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black">{t('Text Only', '文字のみ')}</span>
                      {['ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade) && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            choiceImageMode === 'TEXT_ONLY'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {t('G5-6 Rec', '高学年推奨')}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">
                      {t('Pure spelling & Japanese text. No visual crutches.', '英語スペルと日本語のみ。文字読解力を育成。')}
                    </span>
                  </button>

                  {/* Option A2: With Illustrations */}
                  {isChoiceImageLocked ? (
                    <div
                      className="p-3 rounded-xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 opacity-60 cursor-not-allowed select-none relative overflow-hidden flex flex-col justify-between"
                      title={t(
                        'Disabled because all chosen questions already display illustrations. Having pictures on answers would cause picture-matching cheating.',
                        '出題にイラストが含まれるため、絵合わせ不正を防ぐため選択肢画像は自動無効化されます。'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black flex items-center gap-1">
                          <span>{t('With Pictures', 'イラスト付き')}</span>
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                          {t('Locked (No Cheat)', '🚫 絵合わせ防止')}
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">
                        {t('Auto-locked: Prompt already shows artwork.', '出題に絵があるため不正防止ロック中')}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectChoiceImageMode('AUTO_CLEVER')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        choiceImageMode === 'AUTO_CLEVER'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-black">{t('With Pictures', 'イラスト付き')}</span>
                        {choiceImageMode === 'AUTO_CLEVER' ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            {promptTypes.includes('AUDIO_ONLY') ? t('⭐ Best for Audio', '⭐ リスニング推奨') : t('💡 Optional Aid', '💡 視覚アシスト')}
                          </span>
                        ) : promptTypes.includes('AUDIO_ONLY') ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                            {t('⭐ Best for Audio', '⭐ リスニング推奨')}
                          </span>
                        ) : promptTypes.includes('JA_MEANING') ? (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                            {t('💡 Optional Aid', '💡 視覚アシスト')}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] opacity-80 leading-tight">
                        {promptTypes.includes('AUDIO_ONLY')
                          ? t('Tap picture upon hearing audio. Ideal for lower grades.', '音声を聞いて直感的に絵をタップ！')
                          : t('Concept illustrations alongside English words.', '英単語の横にイラストを補助表示。')}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* SUB-CONTROL B: English Reading & Katakana Scaffolding */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>🔤</span>
                      <span>{t('English Reading & Pronunciation Aid', '英語の表記・読みサポート')}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {t('MEXT Standard', '指導要領準拠')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-snug">
                    {t(
                      'Select whether English buttons display pure textbook alphabet spelling, or include Katakana pronunciation aids.',
                      '英語ボタンを教科書通りの英単語のみにするか、カタカナ発音目安を添えるかを設定。'
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option B1: Spelling Only */}
                  <button
                    type="button"
                    onClick={() => onSelectEnglishReadingAid('SPELLING_ONLY')}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      englishReadingAid === 'SPELLING_ONLY'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black">{t('ABC Only', 'ABC のみ')}</span>
                      {englishReadingAid === 'SPELLING_ONLY' ? (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {t('Standard', '標準')}
                        </span>
                      ) : ['ES_G5', 'ES_G6', 'JHS_G1'].includes(activeGrade) ? (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                          {t('Standard', '標準')}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">{t('Textbook alphabet spelling (milk, tea).', '教科書の英単語スペル')}</span>
                  </button>

                  {/* Option B2: With Katakana Subtext */}
                  <button
                    type="button"
                    onClick={() => onSelectEnglishReadingAid('WITH_KATAKANA')}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      englishReadingAid === 'WITH_KATAKANA'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-400/30'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-black">{t('ABC + Kana', 'ABC + カナ')}</span>
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          englishReadingAid === 'WITH_KATAKANA'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {t('💡 Scaffold', '💡 補助')}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-80 leading-tight">{t('Spelling with [ミルク] subtext aid.', '単語下にカタカナ発音目安')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
