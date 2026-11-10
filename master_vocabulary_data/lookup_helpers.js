// Levi-Sensei English Games & Activities Platform
// Vocabulary Lookup & Game Utility Module (Zero-Dependency)

/**
 * Filter words by grade level
 * @param {Array} words
 * @param {string} grade e.g. 'ES_G1', 'ES_G3'
 * @returns {Array}
 */
export function filterByGrade(words, grade) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => w.grades && w.grades.includes(grade));
}

/**
 * Filter words by category key
 * @param {Array} words
 * @param {string} category e.g. '03_fooddrink', '11_animals'
 * @returns {Array}
 */
export function filterByCategory(words, category) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => w.category === category);
}

/**
 * Filter words by classroom tag
 * @param {Array} words
 * @param {string} tag e.g. 'fruit', 'pet', 'basic'
 * @returns {Array}
 */
export function filterByTag(words, tag) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => w.tags && w.tags.includes(tag));
}

/**
 * Filter words by Borderlink curriculum theme
 * @param {Array} words
 * @param {string} theme e.g. 'Animals', 'What time is it?'
 * @returns {Array}
 */
export function filterByTheme(words, theme) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => w.themes && w.themes.includes(theme));
}

/**
 * Filter words by part of speech
 * @param {Array} words
 * @param {string} pos e.g. 'noun', 'verb', 'adjective'
 * @returns {Array}
 */
export function filterByPartOfSpeech(words, pos) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => w.part_of_speech === pos);
}

/**
 * Get word by ID from a word list or index
 * @param {Array|Object} wordsOrIndex
 * @param {string} id
 * @returns {Object|null}
 */
export function getWordById(wordsOrIndex, id) {
  if (!wordsOrIndex || !id) return null;
  if (wordsOrIndex.byId && wordsOrIndex.byId[id]) {
    return wordsOrIndex.byId[id];
  }
  if (Array.isArray(wordsOrIndex)) {
    return wordsOrIndex.find(w => w.id === id) || null;
  }
  return wordsOrIndex[id] || null;
}

/**
 * Get random selection of N words from a list, optionally excluding specific IDs
 * @param {Array} words
 * @param {number} count
 * @param {Array} excludeIds
 * @returns {Array}
 */
export function getRandomWords(words, count = 4, excludeIds = []) {
  if (!Array.isArray(words) || words.length === 0) return [];
  const eligible = words.filter(w => !excludeIds.includes(w.id));
  const shuffled = [...eligible].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Format Ruby HTML for bilingual elementary presentation
 * @param {Object} word
 * @returns {string}
 */
export function renderRubyHtml(word) {
  if (!word) return '';
  if (word.ruby_html) return word.ruby_html;
  if (!word.ruby || word.ruby.length === 0) return word.ja_kanji || word.ja_hiragana || '';
  return word.ruby
    .map(seg => seg.ruby ? `<ruby>${seg.base}<rt>${seg.ruby}</rt></ruby>` : seg.base)
    .join('');
}

/**
 * Format Ruby bracketed text for plain-text presentation
 * @param {Object} word
 * @returns {string}
 */
export function renderRubyText(word) {
  if (!word) return '';
  if (word.ruby_text) return word.ruby_text;
  if (!word.ruby || word.ruby.length === 0) return word.ja_kanji || word.ja_hiragana || '';
  return word.ruby
    .map(seg => seg.ruby ? `[${seg.base}|${seg.ruby}]` : seg.base)
    .join('');
}

/**
 * Get friendly display label for word, showing disambiguation where helpful
 * @param {Object} word
 * @returns {string}
 */
export function getDisplayLabel(word) {
  if (!word) return '';
  return word.display_label || word.english || '';
}

/**
 * Resolve relative asset URL with base path
 * @param {string} relativePath e.g. 'dic_wb_03fooddrink_apple_1144.mp3'
 * @param {string} baseUrl
 * @returns {string}
 */
export function resolveAssetUrl(relativePath, baseUrl = '') {
  if (!relativePath) return '';
  const cleanBase = baseUrl ? (baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`) : '';
  return `${cleanBase}${relativePath}`;
}

/**
 * Get full audio URL for a word
 * @param {Object} word
 * @param {string} baseUrl
 * @returns {string}
 */
export function getAudioUrl(word, baseUrl = '') {
  if (!word || !word.sound_file) return '';
  return resolveAssetUrl(word.sound_file, baseUrl);
}

/**
 * Get full image URL for a word by variant
 * @param {Object} word
 * @param {'base'|'kana'|'en'|'bilingual'} variant
 * @param {string} baseUrl
 * @returns {string}
 */
export function getImageUrl(word, variant = 'base', baseUrl = '') {
  if (!word) return '';
  let filename = '';
  switch (variant) {
    case 'kana':
      filename = word.card_image_kana || word.card_image;
      break;
    case 'en':
      filename = word.card_image_en || word.card_image;
      break;
    case 'bilingual':
      filename = word.card_image_bilingual || word.card_image;
      break;
    case 'base':
    default:
      filename = word.card_image;
      break;
  }
  return resolveAssetUrl(filename, baseUrl);
}

/**
 * Filter words by game difficulty tier
 * @param {Array} words
 * @param {1|2|3} tier
 * @returns {Array}
 */
export function filterByDifficulty(words, tier) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => w.difficulty_tier === tier);
}

/**
 * Filter words by letter length (excluding spaces and hyphens)
 * @param {Array} words
 * @param {number} min
 * @param {number} max
 * @returns {Array}
 */
export function filterByLetterCount(words, min, max = min) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => w.letter_count >= min && w.letter_count <= max);
}

/**
 * Filter out compound multi-word phrases for single-word games (Hangman, Word Search, etc.)
 * @param {Array} words
 * @returns {Array}
 */
export function filterSingleWords(words) {
  if (!Array.isArray(words)) return [];
  return words.filter(w => !w.is_compound);
}

/**
 * Get resolved primary image URL with fallback to lemma or textbook cards
 * @param {Object} word
 * @param {string} baseUrl
 * @returns {string}
 */
export function getPrimaryImageUrl(word, baseUrl = '') {
  if (!word || !word.primary_image) return '';
  return resolveAssetUrl(word.primary_image, baseUrl);
}

/**
 * Get resolved primary audio URL with fallback to lemma
 * @param {Object} word
 * @param {string} baseUrl
 * @returns {string}
 */
export function getPrimaryAudioUrl(word, baseUrl = '') {
  if (!word || !word.primary_audio) return '';
  return resolveAssetUrl(word.primary_audio, baseUrl);
}

/**
 * Get Three-Hint Quiz clues for a word
 * @param {Object} word
 * @returns {{category_hint: string, feature_hint: string, letter_hint: string}|null}
 */
export function getThreeHints(word) {
  if (!word || !word.three_hints) return null;
  return word.three_hints;
}

/**
 * Get target Q&A dialogue for a word
 * @param {Object} word
 * @returns {{question: string, answer: string, context?: string}|null}
 */
export function getTargetDialogue(word) {
  if (!word || !word.target_dialogues || word.target_dialogues.length === 0) return null;
  return word.target_dialogues[0];
}

/**
 * Get grade-specific card image, automatically falling back to primary_image
 * @param {Object} word
 * @param {string} grade e.g. 'ES_G3', 'ES_G5'
 * @param {'illust'|'full'|'text'} variant
 * @param {string} baseUrl
 * @returns {string}
 */
export function getWordImageForGrade(word, grade, variant = 'illust', baseUrl = '') {
  if (!word) return '';
  if (grade && word.media_by_grade && word.media_by_grade[grade]) {
    const gm = word.media_by_grade[grade];
    let filename = gm.card_image;
    if (variant === 'full' && gm.card_full) filename = gm.card_full;
    if (variant === 'text' && gm.card_text) filename = gm.card_text;
    if (filename) return resolveAssetUrl(filename, baseUrl);
  }
  return resolveAssetUrl(word.primary_image || '', baseUrl);
}

/**
 * Get grade-specific audio file, falling back to primary_audio
 * @param {Object} word
 * @param {string} grade e.g. 'ES_G3', 'ES_G5'
 * @param {string} baseUrl
 * @returns {string}
 */
export function getWordAudioForGrade(word, grade, baseUrl = '') {
  if (!word) return '';
  if (grade && word.media_by_grade && word.media_by_grade[grade]) {
    const gm = word.media_by_grade[grade];
    if (gm.sound_file) return resolveAssetUrl(gm.sound_file, baseUrl);
  }
  return resolveAssetUrl(word.primary_audio || '', baseUrl);
}


