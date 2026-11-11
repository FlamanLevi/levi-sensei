const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const CANONICAL_PATH = path.join(ROOT_DIR, 'master_vocabulary_data', 'master_vocabulary.json');
const PUBLIC_CORE_PATH = path.join(ROOT_DIR, 'public', 'data', 'master_vocabulary.json');
const PUBLIC_CLUES_PATH = path.join(ROOT_DIR, 'public', 'data', 'vocabulary_clues.json');
const PUBLIC_MANIFEST_PATH = path.join(ROOT_DIR, 'public', 'data', 'vocabulary_manifest.json');

const isCheckOnly = process.argv.includes('--check');

const VALID_GRADES = new Set([
  'ES_G1', 'ES_G2', 'ES_G3', 'ES_G4', 'ES_G5', 'ES_G6',
  'KD_3yo', 'KD_4yo', 'KD_5yo',
  'JHS_G1', 'JHS_G2', 'JHS_G3'
]);

const VALID_CATEGORIES = new Set([
  '01_action', '02_state', '03_fooddrink', '04_number',
  '05_schoollife', '06_facility', '07_dailylife', '08_sports',
  '09_color_shape', '10_calendar_time', '11_animals', '12_nature',
  '13_position', '14_body_family', '15_festalday', '16_alphabet'
]);

const VALID_POS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'preposition',
  'interjection', 'phrase', 'pronoun', 'alphabet'
]);

// Extended pedagogical keys split into lazy-loaded /data/vocabulary_clues.json
const CLUE_KEYS = ['three_hints', 'target_dialogues', 'target_sentences'];

// Redundant or runtime-derivable keys omitted from minified /data/master_vocabulary.json
const RUNTIME_OMITTED_KEYS = [
  ...CLUE_KEYS,
  'ruby_html',
  'ruby_text',
  'token',
  'card_image_en',
  'card_image_kana',
  'card_variants',
  'hwg_card_text',
  'canonical_key',
  'normalized_english',
  'phonics_initial',
  'first_letter',
  'letter_count',
  'primary_image',
  'primary_audio'
];

function sha256Short(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Failed to parse JSON at ${filePath}:`, err.message);
    process.exit(1);
  }
}

function buildCanonicalDataset() {
  const canonicalRaw = loadJsonIfExists(CANONICAL_PATH) || [];
  const publicCoreRaw = loadJsonIfExists(PUBLIC_CORE_PATH) || [];
  const existingClues = loadJsonIfExists(PUBLIC_CLUES_PATH) || {};

  const canonicalById = new Map(canonicalRaw.map(item => [item.id, item]));
  const baseList = publicCoreRaw.length > 0 ? publicCoreRaw : canonicalRaw;

  const merged = baseList.map(pubItem => {
    const canItem = canonicalById.get(pubItem.id) || {};
    const clueItem = existingClues[pubItem.id] || {};

    const enTrimmed = (pubItem.english || canItem.english || '').trim();
    const alphaOnly = enTrimmed.replace(/[^a-zA-Z]/g, '');

    // Combine canonical base with latest public updates and preserved clue fields
    const combined = {
      ...canItem,
      ...pubItem,
      three_hints: pubItem.three_hints || clueItem.three_hints || canItem.three_hints,
      target_dialogues: pubItem.target_dialogues || clueItem.target_dialogues || canItem.target_dialogues || [],
      target_sentences: pubItem.target_sentences || clueItem.target_sentences || canItem.target_sentences || [],
      primary_image:
        pubItem.primary_image ||
        canItem.primary_image ||
        pubItem.card_image ||
        pubItem.hwg_card_illust ||
        '',
      primary_audio:
        pubItem.primary_audio ||
        canItem.primary_audio ||
        pubItem.sound_file ||
        (pubItem.audio_suite && (pubItem.audio_suite.en_jenny || pubItem.audio_suite.jenny)) ||
        '',
      letter_count: pubItem.letter_count ?? canItem.letter_count ?? (alphaOnly.length || enTrimmed.length),
      first_letter:
        pubItem.first_letter ||
        canItem.first_letter ||
        (alphaOnly.charAt(0) || enTrimmed.charAt(0)).toUpperCase(),
      normalized_english: pubItem.normalized_english || canItem.normalized_english || enTrimmed.toLowerCase(),
      canonical_key: pubItem.canonical_key || canItem.canonical_key || enTrimmed.toLowerCase()
    };

    return combined;
  });

  return merged;
}

function validateDataset(items) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Dataset is empty or not an array.');
    return { errors, warnings };
  }

  for (let i = 0; i < items.length; i++) {
    const w = items[i];
    const label = w && w.id ? `${w.id} ("${w.english || ''}")` : `index ${i}`;

    if (!w.id || typeof w.id !== 'string') {
      errors.push(`[${label}] Missing or invalid string "id".`);
    } else if (seenIds.has(w.id)) {
      errors.push(`[${label}] Duplicate id "${w.id}".`);
    } else {
      seenIds.add(w.id);
    }

    if (!w.english || typeof w.english !== 'string') {
      errors.push(`[${label}] Missing or invalid "english".`);
    }

    if (!w.ja_kanji && !w.ja_hiragana) {
      errors.push(`[${label}] Missing both "ja_kanji" and "ja_hiragana".`);
    }

    if (!VALID_CATEGORIES.has(w.category)) {
      errors.push(`[${label}] Invalid category "${w.category}".`);
    }

    if (w.part_of_speech && !VALID_POS.has(w.part_of_speech)) {
      warnings.push(`[${label}] Unexpected part_of_speech "${w.part_of_speech}".`);
    }

    if (!Array.isArray(w.grades) || w.grades.length === 0) {
      errors.push(`[${label}] Missing or empty "grades" array.`);
    } else {
      for (const g of w.grades) {
        if (!VALID_GRADES.has(g)) {
          errors.push(`[${label}] Invalid grade "${g}".`);
        }
      }
    }

    if (!Array.isArray(w.ruby) || w.ruby.length === 0) {
      warnings.push(`[${label}] Missing "ruby" furigana segments.`);
    }

    if (!w.three_hints || !w.three_hints.category_hint || !w.three_hints.feature_hint || !w.three_hints.letter_hint) {
      warnings.push(`[${label}] Incomplete "three_hints" object.`);
    }
  }

  return { errors, warnings };
}

function run() {
  const startTime = Date.now();
  const canonicalItems = buildCanonicalDataset();
  const { errors, warnings } = validateDataset(canonicalItems);

  if (warnings.length > 0) {
    console.warn(`⚠️  Vocabulary validation warnings (${warnings.length}):`);
    warnings.slice(0, 5).forEach(w => console.warn(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error(`❌ Vocabulary schema validation failed with ${errors.length} error(s):`);
    errors.slice(0, 15).forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  // Build runtime core and lazy clues payloads
  const coreItems = [];
  const cluesMap = {};

  for (const item of canonicalItems) {
    const clueEntry = {};
    for (const k of CLUE_KEYS) {
      if (item[k] !== undefined) {
        clueEntry[k] = item[k];
      }
    }
    if (Object.keys(clueEntry).length > 0) {
      cluesMap[item.id] = clueEntry;
    }

    const coreItem = { ...item };
    for (const k of RUNTIME_OMITTED_KEYS) {
      delete coreItem[k];
    }
    if (coreItem.disambiguation === null || coreItem.disambiguation === '') {
      delete coreItem.disambiguation;
    }
    if (coreItem.article === '') {
      delete coreItem.article;
    }
    coreItems.push(coreItem);
  }

  const canonicalFormatted = JSON.stringify(canonicalItems, null, 2) + '\n';
  const coreMinified = JSON.stringify(coreItems);
  const cluesMinified = JSON.stringify(cluesMap);

  const canonicalHash = sha256Short(canonicalFormatted);
  const coreHash = sha256Short(coreMinified);
  const cluesHash = sha256Short(cluesMinified);

  const gradeCounts = {};
  for (const item of canonicalItems) {
    for (const g of item.grades || []) {
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;
    }
  }

  const existingManifest = loadJsonIfExists(PUBLIC_MANIFEST_PATH);
  const hashesUnchanged =
    existingManifest &&
    existingManifest.version === canonicalHash &&
    existingManifest.coreHash === coreHash &&
    existingManifest.cluesHash === cluesHash;

  const manifest = {
    version: canonicalHash,
    coreHash,
    cluesHash,
    wordCount: canonicalItems.length,
    multiGradeWordCount: canonicalItems.filter(w => (w.grades || []).length > 1).length,
    gradeCounts,
    generatedAt: hashesUnchanged && existingManifest.generatedAt
      ? existingManifest.generatedAt
      : new Date().toISOString()
  };

  if (isCheckOnly) {
    console.log(
      `✅ Vocabulary schema check passed (${canonicalItems.length} words, version ${canonicalHash}).`
    );
    return;
  }

  // Write canonical pretty-printed source if changed
  const existingCanonicalText = fs.existsSync(CANONICAL_PATH)
    ? fs.readFileSync(CANONICAL_PATH, 'utf8')
    : '';
  if (existingCanonicalText !== canonicalFormatted) {
    fs.writeFileSync(CANONICAL_PATH, canonicalFormatted, 'utf8');
  }

  // Write minified runtime files to public/data/
  fs.mkdirSync(path.dirname(PUBLIC_CORE_PATH), { recursive: true });
  fs.writeFileSync(PUBLIC_CORE_PATH, coreMinified, 'utf8');
  fs.writeFileSync(PUBLIC_CLUES_PATH, cluesMinified, 'utf8');
  fs.writeFileSync(PUBLIC_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const coreKB = (Buffer.byteLength(coreMinified) / 1024).toFixed(1);
  const cluesKB = (Buffer.byteLength(cluesMinified) / 1024).toFixed(1);
  const elapsed = Date.now() - startTime;

  console.log(
    `📚 Vocabulary pipeline built in ${elapsed}ms: ${canonicalItems.length} words validated | Core: ${coreKB} KB | Clues: ${cluesKB} KB | Version: ${canonicalHash}`
  );
}

run();
