import { useState, useEffect } from 'react';

function Flashcard({ word, mode, isStarred, toggleStar }) {
  const [imageError, setImageError] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Reset revealed state when the practice mode changes
  useEffect(() => {
    setRevealed(false);
  }, [mode]);

  // Construct image path safely for GitHub Pages
  const imgPath = import.meta.env.BASE_URL + word.img_path;

  const speak = (e) => {
    if (e) e.stopPropagation(); // Don't trigger the card flip if clicking the button directly
    const utterance = new SpeechSynthesisUtterance(word.en);
    utterance.lang = word.audio_lang || 'en-US';
    // Optional: Adjust rate for ESL learners
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  const handleCardClick = () => {
    if (mode !== 'all' && !revealed) {
      setRevealed(true);
      if (mode === 'hide_en') {
         speak(); // Auto-play when English is revealed
      }
    }
  };

  const getPosColor = (pos) => {
    switch (pos) {
      case 'noun': return 'bg-yellow-400';
      case 'verb': return 'bg-blue-400';
      case 'adjective': return 'bg-green-400';
      case 'adverb': return 'bg-purple-400';
      case 'preposition': return 'bg-pink-400';
      case 'verb_phrase': return 'bg-cyan-400';
      default: return 'bg-transparent';
    }
  };

  const renderImage = () => (
    <div className="w-full h-48 bg-black/5 flex items-center justify-center overflow-hidden border-b-2 border-[var(--border-color)] p-4 shrink-0 relative">
      {/* POS Indicator Strip */}
      {word.part_of_speech && (
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${getPosColor(word.part_of_speech)} z-20 opacity-80`} />
      )}
      {!imageError ? (
        <img 
          src={imgPath} 
          alt={word.en} 
          onError={() => setImageError(true)}
          className="max-w-full max-h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
          <span className="text-6xl mb-2">🖼️</span>
          <span className="text-sm font-bold uppercase tracking-widest">{word.en[0]}</span>
        </div>
      )}
      {/* Star Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          toggleStar(word);
        }}
        className="absolute top-2 left-2 w-12 h-12 flex items-center justify-center text-3xl z-10 hover:scale-110 active:scale-90 transition-transform drop-shadow-md cursor-pointer"
      >
        {isStarred ? '⭐' : '☆'}
      </button>

      {/* Audio Button */}
      <button 
        onClick={speak}
        className="absolute top-2 right-2 w-12 h-12 bg-[var(--surface-color)] rounded-full shadow-md flex items-center justify-center text-2xl hover:bg-[var(--primary-color)] hover:text-white transition-colors duration-200 z-10 active:scale-90 border border-[var(--border-color)] cursor-pointer"
        aria-label="Play pronunciation"
      >
        🔊
      </button>
    </div>
  );

  const renderEn = () => (
    <span className="text-[clamp(1.25rem,3cqi,2rem)] font-black text-[var(--primary-color)] w-full truncate">
      {word.en}
    </span>
  );

  const renderRuby = (kanji, hiragana) => {
    if (!kanji || !hiragana || kanji === hiragana) {
      return kanji || hiragana;
    }

    // Find common suffix (okurigana)
    let suffixLen = 0;
    while (
      suffixLen < kanji.length && 
      suffixLen < hiragana.length && 
      kanji[kanji.length - 1 - suffixLen] === hiragana[hiragana.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    const kanjiBase = kanji.slice(0, kanji.length - suffixLen);
    const hiraganaBase = hiragana.slice(0, hiragana.length - suffixLen);
    const suffix = suffixLen > 0 ? kanji.slice(-suffixLen) : "";

    // Find common prefix (e.g. honorific 'o' like in お月見)
    let prefixLen = 0;
    while (
      prefixLen < kanjiBase.length &&
      prefixLen < hiraganaBase.length &&
      kanjiBase[prefixLen] === hiraganaBase[prefixLen]
    ) {
      prefixLen++;
    }

    const prefix = prefixLen > 0 ? kanjiBase.slice(0, prefixLen) : "";
    const finalKanji = kanjiBase.slice(prefixLen);
    const finalHiragana = hiraganaBase.slice(prefixLen);

    return (
      <>
        {prefix}
        {finalKanji ? (
          <ruby>
            {finalKanji}<rt className="text-[var(--primary-color)]">{finalHiragana}</rt>
          </ruby>
        ) : null}
        {suffix}
      </>
    );
  };

  const renderJa = () => (
    <div className="flex flex-col items-center justify-center gap-1 w-full">
      {/* Japanese Meaning */}
      {(word.ja_kanji || word.ja_hiragana) && (
        <div className="flex flex-col items-center justify-center leading-normal mt-2 w-full">
          <span className="text-[clamp(1rem,2.5cqi,1.5rem)] font-bold text-[var(--text-color)] truncate w-full">
            {word.ja_kanji && word.ja_hiragana ? 
              renderRuby(word.ja_kanji, word.ja_hiragana) 
            : (
              word.ja_kanji || word.ja_hiragana
            )}
          </span>
        </div>
      )}
      
      {/* English Pronunciation (Katakana) */}
      {word.en_katakana && (
        <span className="text-[clamp(0.75rem,2cqi,1rem)] font-bold text-[var(--primary-color)] opacity-75 truncate w-full">
          {word.en_katakana}
        </span>
      )}
    </div>
  );

  const renderDivider = () => <div className="w-8 h-[2px] bg-[var(--border-color)] rounded-full my-2 shrink-0"></div>;

  // Normal non-3D render for "all" mode
  if (mode === 'all') {
    return (
      <div className="bg-[var(--surface-color)] rounded-xl shadow-[var(--header-shadow)] border-2 border-transparent flex flex-col overflow-hidden relative transition-all duration-300 hover:border-[var(--primary-color)] hover:shadow-lg">
        {renderImage()}
        <div className="p-4 flex flex-col flex-1 min-h-[100px] justify-center items-center text-center gap-2">
          {renderEn()}
          {renderDivider()}
          {renderJa()}
        </div>
      </div>
    );
  }

  // 3D Flip render for practice modes
  return (
    <div className="group [perspective:1000px] cursor-pointer h-full" onClick={handleCardClick}>
      <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] grid ${revealed ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* Front */}
        <div className="col-start-1 row-start-1 w-full h-full bg-[var(--surface-color)] rounded-xl shadow-[var(--header-shadow)] border-2 border-[var(--primary-color)] hover:scale-[1.02] active:scale-95 transition-transform duration-300 flex flex-col overflow-hidden [backface-visibility:hidden]">
          {renderImage()}
          <div className="p-4 flex flex-col flex-1 justify-center items-center text-center gap-2">
            {mode === 'hide_en' ? (
              <>
                <div className="text-[var(--text-muted)] font-bold italic animate-pulse">TAP TO REVEAL</div>
                {renderDivider()}
                {renderJa()}
              </>
            ) : (
              <>
                {renderEn()}
                {renderDivider()}
                <div className="text-[var(--text-muted)] font-bold italic animate-pulse">タップして表示</div>
              </>
            )}
          </div>
        </div>

        {/* Back */}
        <div className="col-start-1 row-start-1 w-full h-full bg-[var(--surface-color)] rounded-xl shadow-[var(--header-shadow)] border-2 border-[var(--border-color)] flex flex-col overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {renderImage()}
          <div className="p-4 flex flex-col flex-1 justify-center items-center text-center gap-2">
            {renderEn()}
            {renderDivider()}
            {renderJa()}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Flashcard;