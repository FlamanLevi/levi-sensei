import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAudio } from '../../context/AudioContext';
import { speechService } from '../../services/speechService';
import { getCurriculumGuide, UnitCurriculumGuide } from '../../data/curriculumGuide';
import { 
  X, 
  Target, 
  MessageSquare, 
  BookOpen, 
  Volume2, 
  Sparkles, 
  Dice5, 
  Layers, 
  CheckCircle2, 
  GraduationCap 
} from 'lucide-react';

interface UnitAimsModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade: string;
  unitString: string;
  onLaunchMarbleGame?: () => void;
}

export const UnitAimsModal: React.FC<UnitAimsModalProps> = ({
  isOpen,
  onClose,
  grade,
  unitString,
  onLaunchMarbleGame
}) => {
  const { t, language } = useLanguage();
  const { playPop } = useAudio();

  const [activeTab, setActiveTab] = useState<'AIMS' | 'DIALOGUE' | 'ACTIVITIES' | 'TEACHER'>('AIMS');

  if (!isOpen) return null;

  const guide: UnitCurriculumGuide | null = getCurriculumGuide(grade, unitString);

  const speakPhrase = (text: string) => {
    playPop();
    speechService.stop();
    speechService.speak(text, { rate: 0.84, pitch: 1.02 });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-[96vw] max-w-[1100px] h-[92vh] max-h-[860px] rounded-3xl border-3 border-indigo-400 dark:border-indigo-600 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-7 py-3.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0 flex-1 truncate">
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">
              🎯
            </span>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/25">
                  {grade}
                </span>
                <span className="text-xs font-bold text-indigo-100 truncate">
                  {guide ? `${guide.totalClasses} ${language === 'ja' ? '時間扱い' : 'Classes'}` : ''}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                {guide ? (language === 'ja' ? `${guide.titleJa}（${guide.subtitleJa}）` : `${guide.titleEn} - ${guide.subtitleEn}`) : unitString}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={t("Close (Esc)", "閉じる (Esc)")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="px-5 sm:px-7 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
          <button
            type="button"
            onClick={() => { playPop(); setActiveTab('AIMS'); }}
            className={`h-9 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
              activeTab === 'AIMS'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
            }`}
          >
            <Target size={14} />
            <span>{t("Unit Aims (目標)", "単元目標")}</span>
          </button>

          <button
            type="button"
            onClick={() => { playPop(); setActiveTab('DIALOGUE'); }}
            className={`h-9 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
              activeTab === 'DIALOGUE'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
            }`}
          >
            <MessageSquare size={14} />
            <span>{t("Target Dialogue (主要表現)", "主要表現・言語材料")}</span>
          </button>

          <button
            type="button"
            onClick={() => { playPop(); setActiveTab('ACTIVITIES'); }}
            className={`h-9 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
              activeTab === 'ACTIVITIES'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
            }`}
          >
            <BookOpen size={14} />
            <span>{t("Activities & Scripts (活動と台本)", "活動と台本")}</span>
          </button>

          <button
            type="button"
            onClick={() => { playPop(); setActiveTab('TEACHER'); }}
            className={`h-9 px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
              activeTab === 'TEACHER'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
            }`}
          >
            <GraduationCap size={14} />
            <span>{t("Teacher Expressions (指導表現)", "指導者の英語表現例")}</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {!guide ? (
            <div className="py-12 text-center text-slate-400">
              <p>{t("Detailed curriculum guide is currently available for Unit 6 (Alphabet).", "この単元の目標ガイドは現在準備中です。Unit 6（アルファベット）のガイドをご参照ください。")}</p>
            </div>
          ) : (
            <>
              {/* TAB 1: UNIT AIMS */}
              {activeTab === 'AIMS' && (
                <div className="space-y-6">
                  {/* MEXT 3 Pillars Card */}
                  <div className="p-5 sm:p-6 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/80">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={18} className="text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-200">
                        {t("MEXT Learning Objectives (単元目標)", "文部科学省 学習指導要領 単元目標")}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {(language === 'ja' ? guide.aims.ja : guide.aims.en).map((aim, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                            {aim}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Letter Bifurcation Info (Pages 24 & 25) */}
                  {guide.letterBifurcation && (
                    <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800/60">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
                          <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                            {t("Textbook Bifurcation (教科書の見開き構成)", "教科書の見開き構成（前後半の分割）")}
                          </h4>
                        </div>
                        {onLaunchMarbleGame && (
                          <button
                            type="button"
                            onClick={() => { playPop(); onLaunchMarbleGame(); }}
                            className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                          >
                            <Dice5 size={14} />
                            <span>{t("Launch Marble Game", "おはじきゲームを起動")}</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/60">
                          <span className="font-black text-amber-700 dark:text-amber-300 block mb-1">
                            📖 {guide.letterBifurcation.firstHalf.labelJa}（p.{guide.letterBifurcation.firstHalf.page}）
                          </span>
                          <p className="font-mono font-bold text-slate-600 dark:text-slate-300 tracking-wider">
                            {guide.letterBifurcation.firstHalf.letters.join(' ')}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/60">
                          <span className="font-black text-indigo-700 dark:text-indigo-300 block mb-1">
                            📖 {guide.letterBifurcation.secondHalf.labelJa}（p.{guide.letterBifurcation.secondHalf.page}）
                          </span>
                          <p className="font-mono font-bold text-slate-600 dark:text-slate-300 tracking-wider">
                            {guide.letterBifurcation.secondHalf.letters.join(' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Vocabulary Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      {t("Target Vocabulary Categories", "扱う語彙とカテゴリ")}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {guide.targetVocabulary.map((group, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block mb-2">
                            {group.category} ({group.words.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {group.words.map(w => (
                              <span key={w} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TARGET DIALOGUE */}
              {activeTab === 'DIALOGUE' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t("Tap the speaker icon next to any phrase to play natural pronunciation with Levi-Sensei.", "スピーカーアイコンをタップすると、ネイティブ音声で自然な英語を読み上げます。")}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {guide.targetExpressions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 group hover:border-indigo-400 transition-all"
                      >
                        <div>
                          <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200 mb-1 leading-snug">
                            {item.phraseEn}
                          </h4>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {item.phraseJa}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => speakPhrase(item.speechText || item.phraseEn)}
                          className="w-9 h-9 rounded-xl bg-indigo-100 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5"
                          title={t("Listen to pronunciation", "発音を聞く")}
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ACTIVITIES & SCRIPTS */}
              {activeTab === 'ACTIVITIES' && (
                <div className="space-y-6">
                  {guide.activities.map(act => (
                    <div
                      key={act.id}
                      className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            {language === 'ja' ? act.nameJa : act.nameEn}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {language === 'ja' ? act.descriptionJa : act.descriptionEn}
                          </p>
                        </div>

                        {act.id === 'lets_play_2' && onLaunchMarbleGame && (
                          <button
                            type="button"
                            onClick={() => { playPop(); onLaunchMarbleGame(); }}
                            className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
                          >
                            <Dice5 size={16} />
                            <span>{t("Launch Marble Caller", "おはじきコールを起動")}</span>
                          </button>
                        )}
                      </div>

                      {/* Script if available */}
                      {act.script && (
                        <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block mb-1">
                            {t("Pair Demonstration Script (ペア活動の台本)", "ペア活動の会話例")}
                          </span>
                          {act.script.map((line, li) => (
                            <div key={li} className="flex items-start gap-2.5 text-xs">
                              <span className="font-black text-indigo-700 dark:text-indigo-300 w-14 shrink-0">
                                {line.speaker}:
                              </span>
                              <div className="flex-1">
                                <span className="font-bold text-slate-800 dark:text-slate-200 mr-2">
                                  {line.textEn}
                                </span>
                                <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                                  ({line.textJa})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: TEACHER EXPRESSIONS */}
              {activeTab === 'TEACHER' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t("Key classroom instructions used by the teacher and ALT during this unit.", "この単元の授業中にALTや指導者が使える声かけフレーズ集です。")}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {guide.teacherExpressions.map((te, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                      >
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 mb-1 leading-snug">
                            {te.phraseEn}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {te.phraseJa}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => speakPhrase(te.phraseEn)}
                          className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title={t("Listen", "聞く")}
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>{t("Aligned with MEXT Elementary Course of Study", "文部科学省 小学校外国語活動 教員用指導書 準拠")}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-black transition-colors cursor-pointer"
          >
            {t("Close", "閉じる")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
