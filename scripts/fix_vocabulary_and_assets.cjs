const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const trimmedIllustDir = path.join(rootDir, 'trimmed_assets/cards/illustration');
const distIllustDir = path.join(rootDir, 'dist/cards/illustration');
const masterVocabPath = path.join(rootDir, 'public/data/master_vocabulary.json');

fs.mkdirSync(trimmedIllustDir, { recursive: true });
fs.mkdirSync(distIllustDir, { recursive: true });

async function run() {
  console.log('=== Step 1: Fixing Casing Copies for Linux / Firebase Hosting ===');
  const casingPairs = [
    ['hwg5_u06_10_japanese_pear_illust.webp', 'hwg5_u06_10_Japanese_pear_illust.webp'],
    ['hwg5_u08_05_french_fries_illust.webp', 'hwg5_u08_05_French_fries_illust.webp'],
    ['hwg5_u14_01_english_illust.webp', 'hwg5_u14_01_English_illust.webp'],
    ['hwg5_u14_00_japanese_illust.webp', 'hwg5_u14_00_Japanese_illust.webp'],
    ['hwg5_u11_03_april_illust.webp', 'hwg5_u11_03_April_illust.webp'],
    ['hwg5_u11_07_august_illust.webp', 'hwg5_u11_07_August_illust.webp'],
    ['hwg5_u11_11_december_illust.webp', 'hwg5_u11_11_December_illust.webp'],
    ['hwg5_u11_01_february_illust.webp', 'hwg5_u11_01_February_illust.webp'],
    ['hwg5_u11_17_friday_illust.webp', 'hwg5_u11_17_Friday_illust.webp'],
    ['hwg5_u11_00_january_illust.webp', 'hwg5_u11_00_January_illust.webp'],
    ['hwg5_u11_06_july_illust.webp', 'hwg5_u11_06_July_illust.webp'],
    ['hwg5_u11_05_june_illust.webp', 'hwg5_u11_05_June_illust.webp'],
    ['hwg5_u11_02_march_illust.webp', 'hwg5_u11_02_March_illust.webp'],
    ['hwg5_u11_04_may_illust.webp', 'hwg5_u11_04_May_illust.webp'],
    ['hwg5_u11_13_monday_illust.webp', 'hwg5_u11_13_Monday_illust.webp'],
    ['hwg5_u11_10_november_illust.webp', 'hwg5_u11_10_November_illust.webp'],
    ['hwg5_u11_09_october_illust.webp', 'hwg5_u11_09_October_illust.webp'],
    ['hwg5_u11_18_saturday_illust.webp', 'hwg5_u11_18_Saturday_illust.webp'],
    ['hwg5_u11_08_september_illust.webp', 'hwg5_u11_08_September_illust.webp'],
    ['hwg5_u11_12_sunday_illust.webp', 'hwg5_u11_12_Sunday_illust.webp'],
    ['hwg5_u11_16_thursday_illust.webp', 'hwg5_u11_16_Thursday_illust.webp'],
    ['hwg5_u11_14_tuesday_illust.webp', 'hwg5_u11_14_Tuesday_illust.webp'],
    ['hwg5_u11_15_wednesday_illust.webp', 'hwg5_u11_15_Wednesday_illust.webp']
  ];

  for (const [lowerFile, upperFile] of casingPairs) {
    const srcDist = path.join(distIllustDir, lowerFile);
    if (fs.existsSync(srcDist)) {
      const buf = fs.readFileSync(srcDist);
      fs.writeFileSync(path.join(trimmedIllustDir, upperFile), buf);
      fs.writeFileSync(path.join(distIllustDir, upperFile), buf);
      console.log(`  + Duplicated ${lowerFile} -> ${upperFile}`);
    } else {
      console.warn(`  ! Source not found: ${srcDist}`);
    }
  }

  console.log('\n=== Step 2: Generating Missing WebP Images ===');
  // 1. see animals
  const seeAnimalsPng = path.join(distIllustDir, 'hwg5_u22_03_see_animals_illust.png');
  if (fs.existsSync(seeAnimalsPng)) {
    const webpBuf = await sharp(seeAnimalsPng).webp({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(trimmedIllustDir, 'hwg5_u22_03_see_animals_illust.webp'), webpBuf);
    fs.writeFileSync(path.join(distIllustDir, 'hwg5_u22_03_see_animals_illust.webp'), webpBuf);
    console.log('  + Generated hwg5_u22_03_see_animals_illust.webp');
  }

  // 2. see beautiful flowers
  const seeFlowersPng = path.join(distIllustDir, 'hwg5_u22_02_see_beautiful_flowers_illust.png');
  if (fs.existsSync(seeFlowersPng)) {
    const webpBuf = await sharp(seeFlowersPng).webp({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(trimmedIllustDir, 'hwg5_u22_02_see_beautiful_flowers_illust.webp'), webpBuf);
    fs.writeFileSync(path.join(distIllustDir, 'hwg5_u22_02_see_beautiful_flowers_illust.webp'), webpBuf);
    console.log('  + Generated hwg5_u22_02_see_beautiful_flowers_illust.webp');
  }

  // 3. P.E.
  const peWebp = path.join(distIllustDir, 'hwg5_u14_06_pe_illust.webp');
  if (fs.existsSync(peWebp)) {
    const buf = fs.readFileSync(peWebp);
    fs.writeFileSync(path.join(trimmedIllustDir, 'hwg5_u14_06_P_E__illust.webp'), buf);
    fs.writeFileSync(path.join(distIllustDir, 'hwg5_u14_06_P_E__illust.webp'), buf);
    console.log('  + Generated hwg5_u14_06_P_E__illust.webp');
  }

  // 4. T-shirt
  const tshirtPng = path.join(rootDir, 'trimmed_assets/cards/illustration (old)/hwg5_u12_25_T-shirt_illust.png');
  if (fs.existsSync(tshirtPng)) {
    const webpBuf = await sharp(tshirtPng).webp({ quality: 92 }).toBuffer();
    fs.writeFileSync(path.join(trimmedIllustDir, 'hwg5_u12_25_T-shirt_illust.webp'), webpBuf);
    fs.writeFileSync(path.join(distIllustDir, 'hwg5_u12_25_T-shirt_illust.webp'), webpBuf);
    fs.writeFileSync(path.join(trimmedIllustDir, 'hwg5_u12_25_t-shirt_illust.webp'), webpBuf);
    fs.writeFileSync(path.join(distIllustDir, 'hwg5_u12_25_t-shirt_illust.webp'), webpBuf);
    console.log('  + Generated hwg5_u12_25_T-shirt_illust.webp');
  }

  console.log('\n=== Step 3: Updating Master Vocabulary Database ===');
  const vocab = JSON.parse(fs.readFileSync(masterVocabPath, 'utf8'));

  let updatedCount = 0;
  for (const item of vocab) {
    const en = (item.english || '').toLowerCase().trim();

    // Fix Seasons in Grade 5: ensure spring, summer, and winter have Unit 3: Seasons
    if (en === 'spring' || en === 'summer' || en === 'winter') {
      if (item.media_by_grade && item.media_by_grade.ES_G5) {
        item.media_by_grade.ES_G5.unit = 'Unit 3: Seasons';
        updatedCount++;
        console.log(`  + Set ES_G5.unit for [${en}] to 'Unit 3: Seasons'`);
      }
    }
  }

  fs.writeFileSync(masterVocabPath, JSON.stringify(vocab, null, 2), 'utf8');

  // Also update master_vocabulary_data/
  const dataDir = path.join(rootDir, 'master_vocabulary_data');
  const g5Path = path.join(dataDir, 'vocabulary_es_g5.json');
  if (fs.existsSync(g5Path)) {
    const g5 = JSON.parse(fs.readFileSync(g5Path, 'utf8'));
    for (const item of g5) {
      const en = (item.english || '').toLowerCase().trim();
      if (en === 'spring' || en === 'summer' || en === 'winter') {
        if (item.media_by_grade && item.media_by_grade.ES_G5) {
          item.media_by_grade.ES_G5.unit = 'Unit 3: Seasons';
        }
      }
    }
    fs.writeFileSync(g5Path, JSON.stringify(g5, null, 2), 'utf8');
  }

  const masterDataPath = path.join(dataDir, 'master_vocabulary.json');
  if (fs.existsSync(masterDataPath)) {
    fs.writeFileSync(masterDataPath, JSON.stringify(vocab, null, 2), 'utf8');
  }

  const distDataPath = path.join(rootDir, 'dist/data/master_vocabulary.json');
  if (fs.existsSync(distDataPath)) {
    fs.writeFileSync(distDataPath, JSON.stringify(vocab, null, 2), 'utf8');
  }

  console.log(`\nSuccessfully applied all asset and database fixes! (Updated words: ${updatedCount})`);
}

run().catch(console.error);
