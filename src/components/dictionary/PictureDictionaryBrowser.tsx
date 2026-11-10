import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVocabulary } from '../../context/VocabularyContext';
import { useClassroom } from '../../context/ClassroomContext';
import { useAudio } from '../../context/AudioContext';
import { useLanguage } from '../../context/LanguageContext';
import { CardDisplay } from '../common/CardDisplay';
import { FourLineNotebookGuide } from '../common/FourLineNotebookGuide';
import { AudioButton } from '../common/AudioButton';
import { RubyText } from '../common/RubyText';
import {
  Search,
  X,
  ArrowLeft,
  Sparkles,
  PenTool,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Shuffle,
  HelpCircle
} from 'lucide-react';
import { VocabularyItem } from '@data/types';
import { speechService } from '../../services/speechService';

export const PictureDictionaryBrowser: React.FC = () => {
  const { filteredWords, searchQuery, setSearchQuery } = useVocabulary();
  const { activeGrade, exitToHub } = useClassroom();
  const { playPop, playWordAudio } = useAudio();
  const { t } = useLanguage();

  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);
  const [cardVariant, setCardVariant] = useState<'illust' | 'full'>('illust');
  const [modalVariant, setModalVariant] = useState<'illust' | 'full'>('illust');
  const [handwritingMode, setHandwritingMode] = useState<'solid' | 'trace'>('solid');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(false);
  const [quizMode, setQuizMode] = useState<boolean>(false);
  const [revealedHints, setRevealedHints] = useState<number>(3);
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Upper elementary (G5 & G6 Here We Go) learns 4-line notebook handwriting
  const isUpperGrade = activeGrade === 'ES_G5' || activeGrade === 'ES_G6';

  // Discover available first letters in filteredWords
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    filteredWords.forEach(w => {
      const firstChar = (w.english || '').charAt(0).toUpperCase();
      if (firstChar >= 'A' && firstChar <= 'Z') {
        letters.add(firstChar);
      }
    });
    return Array.from(letters).sort();
  }, [filteredWords]);

  // If selectedLetter is no longer available in filtered list, reset to ALL
  useEffect(() => {
    if (selectedLetter !== 'ALL' && !availableLetters.includes(selectedLetter)) {
      setSelectedLetter('ALL');
    }
  }, [availableLetters, selectedLetter]);

  // Words displayed in the grid (filtered by search and selected first letter)
  const displayedWords = useMemo(() => {
    if (selectedLetter === 'ALL') return filteredWords;
    return filteredWords.filter(w => (w.english || '').toUpperCase().startsWith(selectedLetter));
  }, [filteredWords, selectedLetter]);

  const handleOpenModal = (word: VocabularyItem) => {
    playPop();
    setSelectedWord(word);
    setModalVariant(cardVariant);
    if (quizMode) setRevealedHints(1);
    if (autoPlayAudio) {
      setTimeout(() => {
        playWordAudio(word.primary_audio, word.english);
      }, 100);
    }
  };

  const currentIndex = selectedWord ? filteredWords.findIndex(w => w.id === selectedWord.id) : -1;

  const handlePrevCard = () => {
    if (currentIndex > 0) {
      playPop();
      const nextWord = filteredWords[currentIndex - 1];
      setSelectedWord(nextWord);
      if (quizMode) setRevealedHints(1);
      if (autoPlayAudio) {
        setTimeout(() => {
          playWordAudio(nextWord.primary_audio, nextWord.english);
        }, 100);
      }
    }
  };

  const handleNextCard = () => {
    if (currentIndex >= 0 && currentIndex < filteredWords.length - 1) {
      playPop();
      const nextWord = filteredWords[currentIndex + 1];
      setSelectedWord(nextWord);
      if (quizMode) setRevealedHints(1);
      if (autoPlayAudio) {
        setTimeout(() => {
          playWordAudio(nextWord.primary_audio, nextWord.english);
        }, 100);
      }
    }
  };

  const handlePickRandomWord = () => {
    if (filteredWords.length === 0) return;
    playPop();
    const randomIndex = Math.floor(Math.random() * filteredWords.length);
    const word = filteredWords[randomIndex];
    setSelectedWord(word);
    setModalVariant(cardVariant);
    if (quizMode) setRevealedHints(1);
    if (autoPlayAudio) {
      setTimeout(() => {
        playWordAudio(word.primary_audio, word.english);
      }, 100);
    }
  };

  const handleNextRandomCard = () => {
    if (filteredWords.length <= 1) return;
    playPop();
    let randomIndex = Math.floor(Math.random() * filteredWords.length);
    if (filteredWords[randomIndex].id === selectedWord?.id) {
      randomIndex = (randomIndex + 1) % filteredWords.length;
    }
    const nextWord = filteredWords[randomIndex];
    setSelectedWord(nextWord);
    if (quizMode) setRevealedHints(1);
    if (autoPlayAudio) {
      setTimeout(() => {
        playWordAudio(nextWord.primary_audio, nextWord.english);
      }, 100);
    }
  };

  // TTS speech helper for conversational sentences
  const handleSpeakSentence = (text: string) => {
    if (!text) return;
    setSpeakingText(text);
    speechService.speak(text, {
      rate: 0.88,
      onEnd: () => setSpeakingText(null)
    });
  };

  const handleSpeakDialogue = () => {
    const d = selectedWord?.target_dialogues?.[0];
    if (!d) return;
    const fullText = `${d.question} ... ${d.answer}`;
    handleSpeakSentence(fullText);
  };

  // Audio Preloading for Next and Previous Card to ensure zero-latency playback
  useEffect(() => {
    if (!selectedWord) return;
    const nextWord = currentIndex < filteredWords.length - 1 ? filteredWords[currentIndex + 1] : null;
    const prevWord = currentIndex > 0 ? filteredWords[currentIndex - 1] : null;

    [nextWord, prevWord].forEach(w => {
      if (w && w.primary_audio) {
        const audioUrl = w.primary_audio.startsWith('http') || w.primary_audio.startsWith('/')
          ? w.primary_audio
          : `/media/sound_suite/${w.primary_audio}`;
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = audioUrl;
      }
    });
  }, [selectedWord, currentIndex, filteredWords]);

  // Global & Modal Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Global search shortcut '/'
      if (e.key === '/' && !selectedWord && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Modal Shortcuts
      if (selectedWord && !isInput) {
        if (e.key === 'Escape') {
          setSelectedWord(null);
        } else if (e.key === 'ArrowLeft') {
          handlePrevCard();
        } else if (e.key === 'ArrowRight') {
          handleNextCard();
        } else if (e.code === 'Space' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          playWordAudio(selectedWord.primary_audio, selectedWord.english);
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          handleSpeakDialogue();
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          playPop();
          setAutoPlayAudio(prev => !prev);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleNextRandomCard();
        } else if (e.key === '1' && isUpperGrade) {
          e.preventDefault();
          playPop();
          setModalVariant('illust');
        } else if (e.key === '2' && isUpperGrade) {
          e.preventDefault();
          playPop();
          setModalVariant('full');
          setHandwritingMode('solid');
        } else if ((e.key === '3' || e.key === 't' || e.key === 'T') && isUpperGrade) {
          e.preventDefault();
          playPop();
          setModalVariant('full');
          setHandwritingMode('trace');
        } else if (e.key === 'q' || e.key === 'Q') {
          e.preventDefault();
          playPop();
          if (!quizMode) {
            setQuizMode(true);
            setRevealedHints(1);
          } else if (revealedHints < 3) {
            setRevealedHints(h => h + 1);
          } else {
            setQuizMode(false);
            setRevealedHints(3);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWord, currentIndex, filteredWords, autoPlayAudio, isUpperGrade, quizMode, revealedHints]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playPop(); exitToHub(); }}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors border border-slate-200/50 dark:border-slate-700 shrink-0"
            title={t("Return to Hub", "ホームに戻る")}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{t("Interactive Picture Dictionary", "ピクチャーディクショナリー")}</span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                {activeGrade}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t("Tap any flashcard to enlarge, hear native pronunciation, and practice target sentences.", "カードをタップして拡大、ネイティブ音声と目標対話を練習しよう！")}
            </p>
          </div>
        </div>

        {/* Search Input, Random Button, & Conditional 4-Line Handwriting Toggle */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Upper Grade ONLY (G5 & G6): 4-Line Handwriting Guide Toggle */}
          {isUpperGrade && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black shrink-0">
              <button
                onClick={() => { playPop(); setCardVariant('illust'); }}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  cardVariant === 'illust'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t("Display standard illustration artwork", "イラスト表示")}
              >
                <ImageIcon size={13} />
                <span>{t("Illustration", "イラスト")}</span>
              </button>
              <button
                onClick={() => { playPop(); setCardVariant('full'); }}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  cardVariant === 'full'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t("Display 4-line handwriting notebook guide", "4線ノート学習用表示")}
              >
                <PenTool size={13} />
                <span>{t("✍️ 4-Line Guide", "✍️ 4線ガイド")}</span>
              </button>
            </div>
          )}

          {/* Random Word Pick Button */}
          <button
            onClick={handlePickRandomWord}
            disabled={filteredWords.length === 0}
            className="px-3 py-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 hover:bg-purple-200 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title={t("Pick a random word from this unit (R)", "ランダムに単語を選ぶ (R)")}
          >
            <Shuffle size={14} />
            <span className="hidden sm:inline">{t("Random", "ランダム")}</span>
          </button>

          {/* Search box with '/' shortcut indicator */}
          <div className="relative flex-1 md:w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("Search words... [/]", "単語を検索... [/]")}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* A-Z Quick Jump Alphabet Ribbon & Word Count Badge */}
      <div className="flex items-center justify-between gap-2 mb-5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full no-scrollbar">
          <button
            onClick={() => { playPop(); setSelectedLetter('ALL'); }}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              selectedLetter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {t("ALL", "すべて")} ({filteredWords.length})
          </button>
          {availableLetters.map(letter => {
            const count = filteredWords.filter(w => (w.english || '').toUpperCase().startsWith(letter)).length;
            const isSelected = selectedLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => { playPop(); setSelectedLetter(isSelected ? 'ALL' : letter); }}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
                title={`${letter} (${count})`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Counter Badge */}
        <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0 ml-auto px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          {displayedWords.length} / {filteredWords.length} {t("words", "語")}
        </span>
      </div>

      {/* Vocabulary Cards Grid - Optimized with content-visibility: auto */}
      {displayedWords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-5xl mb-3 inline-block">🔍</span>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-1">
            {t("No matching words found", "一致する単語が見つかりません")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("Try changing your search query or switching units above.", "検索キーワードを変更するか、上の単元を切り替えてみてください。")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {displayedWords.map(word => (
            <div
              key={word.id}
              onClick={() => handleOpenModal(word)}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '200px 180px' }}
              className="bg-white dark:bg-slate-800/90 rounded-2xl p-2 sm:p-2.5 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col items-center text-center group"
            >
              {/* Card Artwork: Mounted physical flashcard canvas */}
              <div className="w-full aspect-[4/3] mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs dark:shadow-md dark:shadow-black/40 border border-slate-200/80 dark:border-slate-700 p-1.5 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-all">
                <CardDisplay
                  word={word}
                  grade={activeGrade}
                  variant={isUpperGrade ? cardVariant : 'illust'}
                  handwritingMode={handwritingMode}
                  className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>

              {/* English & Pronunciation */}
              <div className="w-full flex items-center justify-between gap-1 px-1 mb-1">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {word.english}
                </span>
                <AudioButton soundFile={word.primary_audio} fallbackText={word.english} size="sm" />
              </div>

              {/* Japanese Translation & Furigana */}
              <div className="text-xs w-full text-left px-1">
                <RubyText
                  ruby={word.ruby}
                  kanji={word.ja_kanji}
                  hiragana={word.ja_hiragana}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                  rtClassName="text-[10px] font-bold text-sky-600 dark:text-sky-400 select-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Classroom Choral Flashcard Drill (Projector / iPad Full-Screen Cinema View) */}
      {selectedWord && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-150 select-none"
          onClick={() => setSelectedWord(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl w-[98vw] max-w-[1600px] h-[94vh] max-h-[960px] shadow-2xl border-2 sm:border-4 border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 relative animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="w-full h-14 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-slate-50/80 dark:bg-slate-900/90 gap-3">
              {/* Left: Previous / Next Card Navigation & Category */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handlePrevCard}
                  disabled={currentIndex <= 0}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer active:scale-95"
                  title="Previous Card (← Arrow)"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 min-w-[64px] text-center font-mono">
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${filteredWords.length}` : ''}
                </span>
                <button
                  onClick={handleNextCard}
                  disabled={currentIndex >= filteredWords.length - 1}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer active:scale-95"
                  title="Next Card (→ Arrow)"
                >
                  <ChevronRight size={20} />
                </button>

                {selectedWord.category && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ml-2 capitalize truncate max-w-[140px]">
                    {selectedWord.category.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Right: Quick Tools (Auto-Play, Random, 4-Line Toggle, Close) */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Auto-Play Toggle (Choral Drill Mode) */}
                <button
                  onClick={() => { playPop(); setAutoPlayAudio(!autoPlayAudio); }}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    autoPlayAudio
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={t("Toggle auto-pronounce on card flip (A)", "カード切替時に自動で発音 (A)")}
                >
                  <Volume2 size={14} className={autoPlayAudio ? 'animate-pulse' : ''} />
                  <span className="hidden md:inline">{t("Auto-Play", "自動再生")}</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-black/10 dark:bg-white/10">
                    {autoPlayAudio ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Random Next Card Button */}
                <button
                  onClick={handleNextRandomCard}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer active:scale-95"
                  title={t("Jump to random card (R)", "ランダムなカードに飛ぶ (R)")}
                >
                  <Shuffle size={16} />
                </button>

                {/* 4-Line Handwriting Toggle (Grade 5 & 6 only) */}
                {isUpperGrade && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700 text-xs font-black">
                      <button
                        onClick={() => { playPop(); setModalVariant('illust'); }}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          modalVariant === 'illust'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <ImageIcon size={14} />
                        <span className="hidden sm:inline">{t("Illust", "イラスト")}</span>
                      </button>
                      <button
                        onClick={() => { playPop(); setModalVariant('full'); }}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          modalVariant === 'full'
                            ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <PenTool size={14} />
                        <span>{t("✍️ 4-Line", "✍️ 4線")}</span>
                      </button>
                    </div>

                    {modalVariant === 'full' && (
                      <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700 text-xs font-black">
                        <button
                          onClick={() => { playPop(); setHandwritingMode('solid'); }}
                          className={`px-2 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            handwritingMode === 'solid'
                              ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Solid reading text"
                        >
                          Solid
                        </button>
                        <button
                          onClick={() => { playPop(); setHandwritingMode('trace'); }}
                          className={`px-2 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            handwritingMode === 'trace'
                              ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Dotted tracing line"
                        >
                          Trace
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => { playPop(); setSelectedWord(null); }}
                  className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                  title="Close (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Two-Column Cinema Stage (Left 1/3 Text & Stand, Right 2/3 Main Stage) */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Teacher Stand & Learning Content (~35% width on desktop) */}
              <div className="w-full lg:w-[380px] xl:w-[440px] shrink-0 flex flex-col justify-between overflow-y-auto p-5 sm:p-6 lg:p-7 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/70 gap-4">
                <div className="flex flex-col gap-4">
                  {/* Word Header Block */}
                  <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        {isUpperGrade && modalVariant === 'full' ? (
                          <div className="w-full pb-1">
                            <FourLineNotebookGuide
                              word={selectedWord.english}
                              mode={handwritingMode}
                              className="w-full h-auto"
                            />
                          </div>
                        ) : (
                          <h3 className="text-3xl sm:text-4xl xl:text-5xl font-black text-slate-900 dark:text-white tracking-tight break-words leading-tight">
                            {selectedWord.english}
                          </h3>
                        )}
                        <div className="text-sm sm:text-base font-bold text-slate-400 dark:text-slate-400 mt-1 font-mono">
                          [{selectedWord.en_katakana}]
                        </div>
                      </div>
                      <AudioButton soundFile={selectedWord.primary_audio} fallbackText={selectedWord.english} size="lg" className="shrink-0" />
                    </div>

                    {/* Japanese Ruby Translation */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80">
                      <RubyText
                        ruby={selectedWord.ruby}
                        kanji={selectedWord.ja_kanji}
                        hiragana={selectedWord.ja_hiragana}
                        className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100"
                        rtClassName="text-[11px] font-bold text-sky-600 dark:text-sky-400"
                      />
                    </div>
                  </div>

                  {/* Target Dialogue Box with Speech Audio Playback */}
                  {selectedWord.target_dialogues && selectedWord.target_dialogues.length > 0 && (
                    <div className="bg-blue-50/90 dark:bg-blue-950/40 rounded-2xl p-4 border border-blue-200 dark:border-blue-900/60 shadow-xs">
                      <div className="flex items-center justify-between gap-1.5 text-blue-800 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={14} />
                          <span>{t("Target Dialogue (Class Practice)", "クラス目標対話")}</span>
                        </div>
                        <button
                          onClick={() => handleSpeakDialogue()}
                          className="px-2 py-0.5 rounded-lg bg-blue-200/80 hover:bg-blue-300 dark:bg-blue-900/80 dark:hover:bg-blue-800 text-blue-900 dark:text-blue-100 flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-all active:scale-95"
                          title={t("Listen to full dialogue (D)", "対話全体を聴く (D)")}
                        >
                          <Volume2 size={12} className={speakingText ? 'animate-pulse text-amber-500' : ''} />
                          <span>{t("Play Both", "対話再生")}</span>
                        </button>
                      </div>

                      {/* Question Row */}
                      <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/70 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/40 mb-1.5">
                        <p className="text-sm sm:text-base font-bold text-blue-950 dark:text-blue-100 leading-snug flex-1">
                          {selectedWord.target_dialogues[0].question}
                        </p>
                        <button
                          onClick={() => handleSpeakSentence(selectedWord.target_dialogues![0].question)}
                          className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-800/80 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
                          title="Listen to question"
                        >
                          <Volume2 size={13} className={speakingText === selectedWord.target_dialogues[0].question ? 'animate-pulse text-amber-500' : ''} />
                        </button>
                      </div>

                      {/* Answer Row */}
                      <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/70 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/40">
                        <p className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-300 leading-snug flex-1">
                          {selectedWord.target_dialogues[0].answer}
                        </p>
                        <button
                          onClick={() => handleSpeakSentence(selectedWord.target_dialogues![0].answer)}
                          className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-800/80 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
                          title="Listen to answer"
                        >
                          <Volume2 size={13} className={speakingText === selectedWord.target_dialogues[0].answer ? 'animate-pulse text-amber-500' : ''} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3-Hint Clues Preview & Quiz Mode */}
                  {selectedWord.three_hints && (
                    <div className="bg-amber-50/90 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-900/60 shadow-xs text-xs sm:text-sm space-y-2">
                      <div className="flex items-center justify-between gap-1.5 text-amber-900 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-1">
                        <div className="flex items-center gap-1.5">
                          <span>💡 {t("3-Hint Clues Preview", "3ヒント手がかりプレビュー")}</span>
                        </div>
                        <button
                          onClick={() => {
                            playPop();
                            setQuizMode(!quizMode);
                            setRevealedHints(1);
                          }}
                          className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            quizMode
                              ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-xs'
                              : 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-200'
                          }`}
                          title={t("Toggle 1-by-1 quiz reveal mode (Q)", "1つずつめくるクイズモード (Q)")}
                        >
                          <span>{quizMode ? t("🎯 Quiz ON", "🎯 クイズ中") : t("Quiz Mode", "クイズモード")}</span>
                        </button>
                      </div>

                      {/* Hint 1 */}
                      <p className="text-slate-700 dark:text-amber-100/90 font-medium">
                        <strong className="text-amber-800 dark:text-amber-300 mr-1">1.</strong> {selectedWord.three_hints.category_hint}
                      </p>

                      {/* Hint 2 */}
                      {quizMode && revealedHints < 2 ? (
                        <button
                          onClick={() => { playPop(); setRevealedHints(2); }}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-dashed border-amber-300 dark:border-amber-700"
                        >
                          <HelpCircle size={13} />
                          <span>{t("Tap to reveal Hint 2...", "タップしてヒント2を見る...")}</span>
                        </button>
                      ) : (
                        <p className="text-slate-700 dark:text-amber-100/90 font-medium">
                          <strong className="text-amber-800 dark:text-amber-300 mr-1">2.</strong> {selectedWord.three_hints.feature_hint}
                        </p>
                      )}

                      {/* Hint 3 */}
                      {quizMode && revealedHints < 3 ? (
                        <button
                          onClick={() => { playPop(); setRevealedHints(3); }}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-dashed border-amber-300 dark:border-amber-700"
                        >
                          <HelpCircle size={13} />
                          <span>{t("Tap to reveal Hint 3 (First Letter)...", "タップしてヒント3（頭文字）を見る...")}</span>
                        </button>
                      ) : (
                        <p className="text-slate-700 dark:text-amber-100/90 font-medium">
                          <strong className="text-amber-800 dark:text-amber-300 mr-1">3.</strong> {selectedWord.three_hints.letter_hint}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Keyboard Shortcut Hints Footer */}
                <div className="hidden lg:grid grid-cols-3 gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span>← / → : {t("Next/Prev", "切替")}</span>
                  <span>Space : {t("Word Audio", "単語音声")}</span>
                  <span>D : {t("Dialogue", "対話")}</span>
                  <span>A : {t("Auto-Play", "自動再生")}</span>
                  <span>R : {t("Random", "ランダム")}</span>
                  <span>1 / 2 : {t("Mode", "モード")}</span>
                </div>
              </div>

              {/* Right Column: Main Cinema Stage (~65% width on desktop) */}
              <div className="flex-1 min-w-0 h-full flex items-center justify-center p-3 sm:p-5 lg:p-8 bg-slate-100/60 dark:bg-slate-950/80 overflow-hidden relative">
                {/* Stage Floating Left Chevron Button */}
                <button
                  onClick={handlePrevCard}
                  disabled={currentIndex <= 0}
                  className="hidden md:flex absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 w-11 h-11 lg:w-13 lg:h-13 rounded-2xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-0 disabled:pointer-events-none text-slate-700 dark:text-slate-200 items-center justify-center transition-all shadow-lg border border-slate-200/80 dark:border-slate-700 cursor-pointer z-10 hover:scale-105 active:scale-95"
                  title="Previous Card (← Arrow)"
                >
                  <ChevronLeft size={28} />
                </button>

                {/* Stage Floating Right Chevron Button */}
                <button
                  onClick={handleNextCard}
                  disabled={currentIndex >= filteredWords.length - 1}
                  className="hidden md:flex absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 w-11 h-11 lg:w-13 lg:h-13 rounded-2xl bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-0 disabled:pointer-events-none text-slate-700 dark:text-slate-200 items-center justify-center transition-all shadow-lg border border-slate-200/80 dark:border-slate-700 cursor-pointer z-10 hover:scale-105 active:scale-95"
                  title="Next Card (→ Arrow)"
                >
                  <ChevronRight size={28} />
                </button>

                {/* Giant Mounted Physical Flashcard Canvas */}
                <div className="w-full h-full max-w-4xl max-h-[80vh] rounded-3xl bg-white dark:bg-slate-900 border-2 sm:border-4 border-slate-200 dark:border-slate-700/80 shadow-2xl p-4 sm:p-6 lg:p-8 flex items-center justify-center overflow-hidden transition-all">
                  <CardDisplay
                    word={selectedWord}
                    grade={activeGrade}
                    variant="illust"
                    className="max-w-full max-h-full object-contain rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
