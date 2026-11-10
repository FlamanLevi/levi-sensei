const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../public/data/master_vocabulary.json');

if (!fs.existsSync(dataPath)) {
  console.error('File not found at:', dataPath);
  process.exit(1);
}

const rawData = fs.readFileSync(dataPath, 'utf8').replace(/^\uFEFF/, '');
const words = JSON.parse(rawData);

// Sort by length
const byEnglish = [...words].sort((a, b) => (b.english || '').length - (a.english || '').length);
const byJapanese = [...words].sort((a, b) => {
  const bJp = b.ja_kanji || b.ja_hiragana || '';
  const aJp = a.ja_kanji || a.ja_hiragana || '';
  return bJp.length - aJp.length;
});
const byKatakana = [...words].sort((a, b) => (b.en_katakana || '').length - (a.en_katakana || '').length);

console.log('\n=========================================');
console.log('🏆 TOP 10 LONGEST ENGLISH PHRASES');
console.log('=========================================');
byEnglish.slice(0, 10).forEach((w, i) => {
  console.log(`${i + 1}. [${w.english.length} chars] "${w.english}" (${w.id})`);
});

console.log('\n=========================================');
console.log('🇯🇵 TOP 10 LONGEST JAPANESE MEANINGS');
console.log('=========================================');
byJapanese.slice(0, 10).forEach((w, i) => {
  const jp = w.ja_kanji || w.ja_hiragana || '';
  console.log(`${i + 1}. [${jp.length} chars] "${jp}" (English: "${w.english}")`);
});

console.log('\n=========================================');
console.log('🔤 TOP 10 LONGEST KATAKANA PRONUNCIATIONS');
console.log('=========================================');
byKatakana.slice(0, 10).forEach((w, i) => {
  const kana = w.en_katakana || '';
  console.log(`${i + 1}. [${kana.length} chars] "【${kana}】" (English: "${w.english}")`);
});
console.log('\nDone!\n');