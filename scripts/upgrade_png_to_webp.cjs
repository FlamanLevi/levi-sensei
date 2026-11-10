const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const masterVocabPath = path.join(rootDir, 'public/data/master_vocabulary.json');
const vocab = JSON.parse(fs.readFileSync(masterVocabPath, 'utf8'));

let upgraded = 0;

function upgradeIfWebpExists(p) {
  if (!p || typeof p !== 'string' || !p.endsWith('.png')) return p;
  const webpRel = p.replace(/\.png$/, '.webp');
  const webpDist = path.join(rootDir, 'dist', webpRel);
  const webpTrim = path.join(rootDir, 'trimmed_assets', webpRel);
  if (fs.existsSync(webpDist) || fs.existsSync(webpTrim)) {
    upgraded++;
    return webpRel;
  }
  return p;
}

for (const item of vocab) {
  item.card_image = upgradeIfWebpExists(item.card_image);
  item.hwg_card_illust = upgradeIfWebpExists(item.hwg_card_illust);
  item.primary_image = upgradeIfWebpExists(item.primary_image);

  if (item.media_by_grade) {
    for (const g of Object.keys(item.media_by_grade)) {
      const m = item.media_by_grade[g];
      if (m.card_image) m.card_image = upgradeIfWebpExists(m.card_image);
    }
  }
}

fs.writeFileSync(masterVocabPath, JSON.stringify(vocab, null, 2), 'utf8');
fs.writeFileSync(path.join(rootDir, 'master_vocabulary_data/master_vocabulary.json'), JSON.stringify(vocab, null, 2), 'utf8');
fs.writeFileSync(path.join(rootDir, 'dist/data/master_vocabulary.json'), JSON.stringify(vocab, null, 2), 'utf8');

console.log(`Successfully upgraded ${upgraded} image references from raw .png to high-resolution AI upscaled .webp!`);
