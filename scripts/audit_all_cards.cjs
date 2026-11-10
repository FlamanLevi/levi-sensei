const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const masterPath = path.join(rootDir, 'public/data/master_vocabulary.json');

const vocab = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

// Build exact case set and lower-case map of all files in dist
console.log('Scanning dist directory...');
const exactFiles = new Set();
const lowerFiles = new Map(); // lowercase -> actual case

function scanDir(dir, prefix = '') {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      scanDir(path.join(dir, entry.name), rel);
    } else {
      exactFiles.add(rel.replace(/\\/g, '/'));
      lowerFiles.set(rel.toLowerCase().replace(/\\/g, '/'), rel.replace(/\\/g, '/'));
    }
  }
}

scanDir(distDir);
console.log(`Found ${exactFiles.size} files in dist.`);

// 1. Audit Media Files & Casing
const caseMismatches = [];
const missingFiles = [];

for (const item of vocab) {
  // Check primary and media_by_grade
  const candidates = [];
  if (item.card_image) candidates.push({ field: 'card_image', p: item.card_image });
  if (item.hwg_card_illust) candidates.push({ field: 'hwg_card_illust', p: item.hwg_card_illust });
  if (item.primary_image) candidates.push({ field: 'primary_image', p: item.primary_image });

  if (item.media_by_grade) {
    for (const [grade, m] of Object.entries(item.media_by_grade)) {
      if (m.card_image) candidates.push({ field: `media_by_grade.${grade}.card_image`, p: m.card_image });
      if (m.card_full) candidates.push({ field: `media_by_grade.${grade}.card_full`, p: m.card_full });
    }
  }

  for (const { field, p } of candidates) {
    if (!p || typeof p !== 'string' || p.startsWith('http') || p.startsWith('data:')) continue;
    let clean = p.replace(/^\/+/, '').replace(/\\/g, '/');
    if (!clean.startsWith('cards/') && !clean.startsWith('media/') && !clean.startsWith('manabi_assets/')) {
      clean = `cards/illustration/${clean}`;
    }

    if (exactFiles.has(clean)) {
      // Exact match - OK
    } else if (lowerFiles.has(clean.toLowerCase())) {
      caseMismatches.push({
        id: item.id,
        english: item.english,
        field,
        dbPath: clean,
        actualDiskPath: lowerFiles.get(clean.toLowerCase())
      });
    } else {
      missingFiles.push({
        id: item.id,
        english: item.english,
        field,
        dbPath: clean
      });
    }
  }
}

console.log(`\n=== CASE MISMATCHES (Linux 404s): ${caseMismatches.length} ===`);
const sampleMismatch = caseMismatches.slice(0, 20);
sampleMismatch.forEach(m => console.log(`  - [${m.english}] ${m.dbPath} -> disk has: ${m.actualDiskPath}`));

console.log(`\n=== MISSING FILES (Total 404s): ${missingFiles.length} ===`);
const sampleMissing = missingFiles.slice(0, 20);
sampleMissing.forEach(m => console.log(`  - [${m.english}] field: ${m.field} -> ${m.dbPath}`));

// 2. Audit Unit Categorization for Grades 3-6
console.log('\n=== UNIT CATEGORIZATION AUDIT ===');
const grades = ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6'];

for (const g of grades) {
  const wordsInGrade = vocab.filter(item => item.media_by_grade && item.media_by_grade[g]);
  const wordsWithUnit = wordsInGrade.filter(item => item.media_by_grade[g].unit);
  const wordsWithoutUnit = wordsInGrade.filter(item => !item.media_by_grade[g].unit);
  console.log(`\nGrade ${g}: ${wordsInGrade.length} total words. With unit: ${wordsWithUnit.length}, WITHOUT unit: ${wordsWithoutUnit.length}`);
  if (wordsWithoutUnit.length > 0) {
    console.log(`  Sample words without unit in ${g}:`, wordsWithoutUnit.slice(0, 15).map(w => w.english));
  }
}

// 3. Specifically Check Seasons across all grades
console.log('\n=== SEASONS AUDIT ===');
const seasonWords = ['spring', 'summer', 'fall', 'autumn', 'winter'];
for (const sw of seasonWords) {
  const item = vocab.find(v => (v.english || '').toLowerCase().trim() === sw);
  if (item) {
    const gradeUnits = {};
    if (item.media_by_grade) {
      for (const [g, m] of Object.entries(item.media_by_grade)) {
        gradeUnits[g] = m.unit || '(NONE)';
      }
    }
    console.log(`  Season word [${sw}]:`, gradeUnits);
  }
}
