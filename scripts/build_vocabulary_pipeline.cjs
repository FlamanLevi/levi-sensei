const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const CANONICAL_PATH = path.join(ROOT_DIR, 'master_vocabulary_data', 'master_vocabulary.json');
const CANONICAL_PACKS_DIR = path.join(ROOT_DIR, 'master_vocabulary_data', 'packs');
const PUBLIC_CORE_PATH = path.join(ROOT_DIR, 'public', 'data', 'master_vocabulary.json');
const PUBLIC_PACKS_DIR = path.join(ROOT_DIR, 'public', 'data', 'packs');
const PUBLIC_CLUES_PATH = path.join(ROOT_DIR, 'public', 'data', 'vocabulary_clues.json');
const PUBLIC_HINTS_BANK_PATH = path.join(ROOT_DIR, 'public', 'data', 'banks', 'three_hints_bank.json');
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
  'primary_audio',
  'themes',
  'is_compound',
  'category_name'
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
  return canonicalRaw.map(canItem => {
    const enTrimmed = (canItem.english || '').trim();
    const alphaOnly = enTrimmed.replace(/[^a-zA-Z]/g, '');

    return {
      ...canItem,
      target_dialogues: canItem.target_dialogues || [],
      target_sentences: canItem.target_sentences || [],
      primary_image:
        canItem.primary_image ||
        canItem.card_image ||
        canItem.hwg_card_illust ||
        (canItem.media_by_grade && Object.values(canItem.media_by_grade).find(m => m && m.card_image)?.card_image) ||
        '',
      primary_audio:
        canItem.primary_audio ||
        canItem.sound_file ||
        (canItem.audio_suite && (canItem.audio_suite.en_jenny || canItem.audio_suite.jenny)) ||
        '',
      letter_count: canItem.letter_count ?? (alphaOnly.length || enTrimmed.length),
      first_letter:
        canItem.first_letter ||
        (alphaOnly.charAt(0) || enTrimmed.charAt(0)).toUpperCase(),
      normalized_english: canItem.normalized_english || enTrimmed.toLowerCase(),
      canonical_key: canItem.canonical_key || enTrimmed.toLowerCase()
    };
  });
}

function validateDataset(items) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Dataset is empty or not an array.');
    return { errors, warnings };
  }

  const kanjiRe = /[\u4e00-\u9faf\u3400-\u4dbf]/;

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
        } else if ((g === 'ES_G3' || g === 'ES_G4' || g === 'ES_G5' || g === 'ES_G6') && !(w.media_by_grade && w.media_by_grade[g])) {
          warnings.push(`[${label}] Grade "${g}" listed in grades[] but missing media_by_grade.${g}.`);
        }
      }
    }

    if (!Array.isArray(w.ruby) || w.ruby.length === 0) {
      warnings.push(`[${label}] Missing "ruby" furigana segments.`);
    } else {
      const missingKanjiReading = w.ruby.some(seg => kanjiRe.test(seg.base || '') && !(seg.ruby && seg.ruby.trim()));
      if (missingKanjiReading) {
        warnings.push(`[${label}] Kanji segment in "ruby" is missing furigana reading.`);
      }
    }

    if (w.media_by_grade) {
      for (const [g, gm] of Object.entries(w.media_by_grade)) {
        if (gm && gm.card_image && (gm.card_image.includes('_full.') || gm.card_image.includes('_1_ce.'))) {
          errors.push(`[${label}] media_by_grade.${g}.card_image leaks labeled flashcard "${gm.card_image}".`);
        }
      }
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
    if (item.target_dialogues && item.target_dialogues.length > 0) {
      clueEntry.target_dialogues = item.target_dialogues;
    }
    // Omit target_sentences when it is a verbatim copy of target_dialogues[0]
    const d0 = item.target_dialogues?.[0];
    const isVerbatimSentenceCopy =
      d0 &&
      item.target_sentences?.length === 1 &&
      item.target_sentences[0] === `Q: ${d0.question} / A: ${d0.answer}`;
    if (item.target_sentences && item.target_sentences.length > 0 && !isVerbatimSentenceCopy) {
      clueEntry.target_sentences = item.target_sentences;
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

    // Strip redundant pure-kana/ASCII ruby array (RubyText falls back to ja_kanji || ja_hiragana)
    if (Array.isArray(coreItem.ruby) && coreItem.ruby.every(seg => !seg.ruby)) {
      delete coreItem.ruby;
    }

    // Strip unused subkeys inside media_by_grade
    if (coreItem.media_by_grade) {
      const cleanMbg = {};
      for (const [g, gm] of Object.entries(coreItem.media_by_grade)) {
        if (!gm) continue;
        const cleanGm = { ...gm };
        delete cleanGm.card_text;
        delete cleanGm.card_bw;
        if (coreItem.sound_file) {
          delete cleanGm.sound_file;
        }
        cleanMbg[g] = cleanGm;
      }
      coreItem.media_by_grade = cleanMbg;
    }

    // Strip template-derivable audio_suite entries (reconstructed in VocabularyContext.normalizeVocabularyItem)
    const sf = coreItem.sound_file || '';
    if (coreItem.audio_suite && sf.endsWith('_jenny.mp3')) {
      const prunedSuite = {};
      for (const [voice, pathVal] of Object.entries(coreItem.audio_suite)) {
        const expected =
          voice === 'jenny' ? sf :
          voice === 'andrew' ? sf.replace(/_jenny\.mp3$/, '_andrew.mp3') :
          voice === 'ana' ? sf.replace(/_jenny\.mp3$/, '_ana.mp3') :
          voice === 'ja' ? sf.replace(/_jenny\.mp3$/, '_nanami.mp3') :
          null;
        if (pathVal !== expected) {
          prunedSuite[voice] = pathVal;
        }
      }
      if (Object.keys(prunedSuite).length > 0) {
        coreItem.audio_suite = prunedSuite;
      } else {
        delete coreItem.audio_suite;
      }
    }

    coreItems.push(coreItem);
  }

  // Load and validate optional curriculum packs from master_vocabulary_data/packs/*.json
  const packFiles = fs.existsSync(CANONICAL_PACKS_DIR)
    ? fs.readdirSync(CANONICAL_PACKS_DIR).filter(f => f.endsWith('.json')).sort()
    : [];
  const packsManifest = {};
  const builtPacks = {};
  const globalSeenIds = new Set(canonicalItems.map(w => w.id));

  for (const pf of packFiles) {
    const packId = path.basename(pf, '.json');
    const rawPack = loadJsonIfExists(path.join(CANONICAL_PACKS_DIR, pf)) || [];
    const normalizedPack = rawPack.map(canItem => {
      const enTrimmed = (canItem.english || '').trim();
      const alphaOnly = enTrimmed.replace(/[^a-zA-Z]/g, '');
      return {
        ...canItem,
        target_dialogues: canItem.target_dialogues || [],
        target_sentences: canItem.target_sentences || [],
        primary_image: canItem.primary_image || canItem.card_image || '',
        primary_audio: canItem.primary_audio || canItem.sound_file || '',
        letter_count: canItem.letter_count ?? (alphaOnly.length || enTrimmed.length),
        first_letter: canItem.first_letter || (alphaOnly.charAt(0) || enTrimmed.charAt(0)).toUpperCase(),
        normalized_english: canItem.normalized_english || enTrimmed.toLowerCase(),
        canonical_key: canItem.canonical_key || enTrimmed.toLowerCase()
      };
    });

    const packValidation = validateDataset(normalizedPack);
    for (const item of normalizedPack) {
      if (globalSeenIds.has(item.id)) {
        packValidation.errors.push(`[Pack ${packId}: ${item.id}] ID collides with core or another pack.`);
      } else {
        globalSeenIds.add(item.id);
      }
    }
    if (packValidation.errors.length > 0) {
      console.error(`❌ Pack "${packId}" validation failed with ${packValidation.errors.length} error(s):`);
      packValidation.errors.slice(0, 10).forEach(e => console.error(`   - ${e}`));
      process.exit(1);
    }

    const minifiedPackItems = [];
    for (const item of normalizedPack) {
      if (item.target_dialogues && item.target_dialogues.length > 0) {
        cluesMap[item.id] = { target_dialogues: item.target_dialogues };
      }
      const pItem = { ...item };
      for (const k of RUNTIME_OMITTED_KEYS) {
        delete pItem[k];
      }
      if (pItem.disambiguation === null || pItem.disambiguation === '') delete pItem.disambiguation;
      if (pItem.article === '') delete pItem.article;
      if (Array.isArray(pItem.ruby) && pItem.ruby.every(seg => !seg.ruby)) delete pItem.ruby;
      minifiedPackItems.push(pItem);
    }

    const packJson = JSON.stringify(minifiedPackItems);
    const packHash = sha256Short(packJson);
    const packGrades = Array.from(new Set(normalizedPack.flatMap(w => w.grades || [])));
    packsManifest[packId] = {
      url: `/data/packs/${pf}`,
      hash: packHash,
      wordCount: normalizedPack.length,
      grades: packGrades
    };
    builtPacks[pf] = packJson;
  }

  const canonicalFormatted = JSON.stringify(canonicalItems, null, 2) + '\n';
  const coreMinified = JSON.stringify(coreItems);
  const cluesMinified = JSON.stringify(cluesMap);
  const hintsBankRaw = fs.existsSync(PUBLIC_HINTS_BANK_PATH) ? fs.readFileSync(PUBLIC_HINTS_BANK_PATH, 'utf8') : '';

  const canonicalHash = sha256Short(canonicalFormatted);
  const coreHash = sha256Short(coreMinified);
  const cluesHash = sha256Short(cluesMinified);
  const hintsBankHash = hintsBankRaw ? sha256Short(hintsBankRaw) : undefined;

  const gradeCounts = {};
  for (const item of canonicalItems) {
    for (const g of item.grades || []) {
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;
    }
  }
  for (const pInfo of Object.values(packsManifest)) {
    for (const g of pInfo.grades || []) {
      gradeCounts[g] = (gradeCounts[g] || 0) + pInfo.wordCount;
    }
  }

  const existingManifest = loadJsonIfExists(PUBLIC_MANIFEST_PATH);
  const hashesUnchanged =
    existingManifest &&
    existingManifest.version === canonicalHash &&
    existingManifest.coreHash === coreHash &&
    existingManifest.cluesHash === cluesHash &&
    existingManifest.hintsBankHash === hintsBankHash &&
    JSON.stringify(existingManifest.packs || {}) === JSON.stringify(packsManifest);

  const manifest = {
    version: canonicalHash,
    coreHash,
    cluesHash,
    ...(hintsBankHash ? { hintsBankHash } : {}),
    ...(Object.keys(packsManifest).length > 0 ? { packs: packsManifest } : {}),
    wordCount: canonicalItems.length,
    packWordCount: Object.values(packsManifest).reduce((acc, p) => acc + p.wordCount, 0),
    multiGradeWordCount: canonicalItems.filter(w => (w.grades || []).length > 1).length,
    gradeCounts,
    generatedAt: hashesUnchanged && existingManifest.generatedAt
      ? existingManifest.generatedAt
      : new Date().toISOString()
  };

  if (isCheckOnly) {
    console.log(
      `✅ Vocabulary schema check passed (${canonicalItems.length} core words + ${manifest.packWordCount} pack words across ${Object.keys(packsManifest).length} packs, version ${canonicalHash}).`
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
  if (Object.keys(builtPacks).length > 0) {
    fs.mkdirSync(PUBLIC_PACKS_DIR, { recursive: true });
    for (const [pf, pJson] of Object.entries(builtPacks)) {
      fs.writeFileSync(path.join(PUBLIC_PACKS_DIR, pf), pJson, 'utf8');
    }
  }
  fs.writeFileSync(PUBLIC_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const coreKB = (Buffer.byteLength(coreMinified) / 1024).toFixed(1);
  const cluesKB = (Buffer.byteLength(cluesMinified) / 1024).toFixed(1);
  const elapsed = Date.now() - startTime;

  console.log(
    `📚 Vocabulary pipeline built in ${elapsed}ms: ${canonicalItems.length} core + ${manifest.packWordCount} pack words (${Object.keys(packsManifest).length} packs) | Core: ${coreKB} KB | Clues: ${cluesKB} KB | Version: ${canonicalHash}`
  );
}

run();
