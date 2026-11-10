const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../public/data/master_vocabulary.json');

if (!fs.existsSync(dataPath)) {
  console.error('File not found at:', dataPath);
  process.exit(1);
}

const words = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const totalCount = words.length;

// Helper: Calculate quantiles
function getPercentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// 1. English Analysis
const enLengths = words.map(w => (w.english || '').trim().length);
const enWordCounts = words.map(w => (w.english || '').trim().split(/\s+/).length);
const enMaxTokenLengths = words.map(w => {
  const tokens = (w.english || '').trim().split(/\s+/);
  return Math.max(...tokens.map(t => t.length));
});

const longestFullEnglish = [...words].sort((a, b) => (b.english || '').length - (a.english || '').length);
const longestSingleTokens = [...words].sort((a, b) => {
  const maxB = Math.max(...(b.english || '').trim().split(/\s+/).map(t => t.length));
  const maxA = Math.max(...(a.english || '').trim().split(/\s+/).map(t => t.length));
  return maxB - maxA;
});

// 2. Japanese & Katakana Analysis
const jaLengths = words.map(w => (w.ja_kanji || w.ja_hiragana || '').trim().length);
const kanaLengths = words.map(w => (w.en_katakana || '').trim().length);

const longestJapanese = [...words].sort((a, b) => {
  const bLen = (b.ja_kanji || b.ja_hiragana || '').trim().length;
  const aLen = (a.ja_kanji || a.ja_hiragana || '').trim().length;
  return bLen - aLen;
});

const longestKatakana = [...words].sort((a, b) => (b.en_katakana || '').trim().length - (a.en_katakana || '').length);

// 3. Asset & Grade Counts
const gradesCount = {};
let withImageCount = 0;
let withAudioCount = 0;

words.forEach(w => {
  if (w.primary_image || w.card_image || w.hwg_card_illust) withImageCount++;
  if (w.sound_file || w.primary_audio) withAudioCount++;
  (w.grades || []).forEach(g => {
    gradesCount[g] = (gradesCount[g] || 0) + 1;
  });
});

console.log('\n================================================================');
console.log(`📊 MASTER VOCABULARY CURRICULUM AUDIT (${totalCount} Total Entries)`);
console.log('================================================================');

console.log('\n[1] ENGLISH PHRASE LENGTH (Characters with spaces):');
console.log(`  • Minimum:        ${Math.min(...enLengths)} chars`);
console.log(`  • 50th Percentile: ${getPercentile(enLengths, 50)} chars (Median)`);
console.log(`  • 80th Percentile: ${getPercentile(enLengths, 80)} chars`);
console.log(`  • 95th Percentile: ${getPercentile(enLengths, 95)} chars`);
console.log(`  • Maximum:        ${Math.max(...enLengths)} chars`);

console.log('\n[2] LONGEST UNBROKEN ENGLISH WORDS (No spaces - Horizontal Limit):');
longestSingleTokens.slice(0, 5).forEach((w, i) => {
  const longestTok = w.english.split(/\s+/).reduce((a, b) => a.length > b.length ? a : b);
  console.log(`  ${i + 1}. [${longestTok.length} chars] "${longestTok}" (Full: "${w.english}")`);
});

console.log('\n[3] TOP 5 LONGEST FULL ENGLISH PHRASES:');
longestFullEnglish.slice(0, 5).forEach((w, i) => {
  console.log(`  ${i + 1}. [${w.english.length} chars] "${w.english}"`);
});

console.log('\n[4] TOP 5 LONGEST KATAKANA STRINGS (No spaces):');
longestKatakana.slice(0, 5).forEach((w, i) => {
  console.log(`  ${i + 1}. [${(w.en_katakana || '').length} chars] "【${w.en_katakana}】" (For: "${w.english}")`);
});

console.log('\n[5] WORD COUNT DISTRIBUTION (Phrases vs Single Words):');
const singleWordCount = enWordCounts.filter(c => c === 1).length;
const twoWordCount = enWordCounts.filter(c => c === 2).length;
const threePlusCount = enWordCounts.filter(c => c >= 3).length;
console.log(`  • Single Words:   ${singleWordCount} (${Math.round(singleWordCount / totalCount * 100)}%)`);
console.log(`  • 2-Word Phrases: ${twoWordCount} (${Math.round(twoWordCount / totalCount * 100)}%)`);
console.log(`  • 3+ Word Phrases:${threePlusCount} (${Math.round(threePlusCount / totalCount * 100)}%)`);

console.log('\n[6] ASSET COVERAGE:');
console.log(`  • With Image:     ${withImageCount} / ${totalCount} (${Math.round(withImageCount / totalCount * 100)}%)`);
console.log(`  • With Audio:     ${withAudioCount} / ${totalCount} (${Math.round(withAudioCount / totalCount * 100)}%)`);

console.log('\n[7] ENTRIES BY GRADE:');
Object.entries(gradesCount).forEach(([grade, count]) => {
  console.log(`  • ${grade.padEnd(8)}: ${count} entries`);
});

console.log('================================================================\n');