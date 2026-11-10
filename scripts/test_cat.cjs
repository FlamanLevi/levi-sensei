const sharp = require('sharp');
const path = require('path');
const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');

async function testCatFeatures() {
  const p12 = path.join(MASTER_DIR, 'u11_p12.png');
  const outDir = path.join(__dirname, '../scratch_test_u12');

  const catCrops = [
    { slot: '06', en: 'eye', box: { left: 540, top: 105, width: 220, height: 85 } },
    { slot: '07', en: 'nose', box: { left: 520, top: 180, width: 240, height: 75 } },
    { slot: '08', en: 'mouth', box: { left: 520, top: 255, width: 260, height: 80 } },
    { slot: '09', en: 'tail', box: { left: 780, top: 75, width: 260, height: 95 } },
    { slot: '10', en: 'fur', box: { left: 770, top: 170, width: 280, height: 95 } }
  ];

  for (const c of catCrops) {
    await sharp(p12).extract(c.box).toFile(path.join(outDir, `cat_${c.slot}_${c.en}.png`));
  }
  console.log('Cat crops done');
}

testCatFeatures();
