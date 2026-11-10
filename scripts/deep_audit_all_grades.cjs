const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size'); // if available, or we can use sharp / buffer parse

const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/master_vocabulary.json'), 'utf8'));

const grades = ['ES_G3', 'ES_G4', 'ES_G5', 'ES_G6'];

console.log('Total vocabulary items:', vocab.length);

for (const g of grades) {
  const words = vocab.filter(w => w.media_by_grade && w.media_by_grade[g]);
  console.log(`\n=================== GRADE ${g} (${words.length} items) ===================`);
  
  let withImage = 0;
  let withoutImage = 0;
  let numbers = 0;
  let missingFiles = [];
  let fileDetails = [];

  for (const w of words) {
    const mg = w.media_by_grade[g];
    const cardImg = mg.card_image;
    const isNum = !isNaN(Number(w.english.trim())) || /^\d+$/.test(w.english.trim());

    if (isNum) {
      numbers++;
    }

    if (!cardImg) {
      withoutImage++;
      fileDetails.push({ english: w.english, unit: mg.unit, issue: 'No card_image specified' });
      continue;
    }

    withImage++;

    // Check if file exists on disk
    const checkPaths = [
      path.join(__dirname, '../public', cardImg),
      path.join(__dirname, '../trimmed_assets', cardImg.replace(/^cards\//, 'cards/')),
      path.join(__dirname, '../dist', cardImg)
    ];

    let found = false;
    let actualFile = null;
    for (const p of checkPaths) {
      if (fs.existsSync(p)) {
        found = true;
        actualFile = p;
        break;
      }
    }

    if (!found) {
      missingFiles.push({ english: w.english, unit: mg.unit, path: cardImg });
    }
  }

  console.log(`With image: ${withImage}`);
  console.log(`Without image: ${withoutImage}`);
  console.log(`Dynamic numbers: ${numbers}`);
  console.log(`Missing files on disk: ${missingFiles.length}`);
  if (missingFiles.length > 0) {
    console.log('Missing file list:');
    console.log(JSON.stringify(missingFiles.slice(0, 30), null, 2));
  }
  if (withoutImage > 0) {
    console.log(`Sample without image (${withoutImage} total):`);
    console.log(fileDetails.slice(0, 30).map(x => `${x.english} (Unit: ${x.unit})`).join(', '));
  }
}
