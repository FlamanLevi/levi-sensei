const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');

async function testU12() {
  console.log('Testing Unit 12 diagram extraction...');
  // u11_p12.png has dimensions 1120 x 563
  // Boy is on the left, cat on the right, bird/turtle/cow at the bottom.
  // Let's test bounding boxes around each of the 15 callout regions:
  const u12Crops = [
    // 00: head (1) - boy's head + marker 1 + "head"
    { slot: '00', en: 'head', box: { left: 130, top: 40, width: 330, height: 110 } },
    // 01: neck (2) - "neck" + marker 2 + boy's neck
    { slot: '01', en: 'neck', box: { left: 30, top: 110, width: 250, height: 90 } },
    // 02: shoulder (3) - boy's shoulder + marker 3 + "shoulder"
    { slot: '02', en: 'shoulder', box: { left: 210, top: 130, width: 280, height: 90 } },
    // 03: hand (4) - boy's hand + marker 4 + "hand"
    { slot: '03', en: 'hand', box: { left: 240, top: 230, width: 240, height: 110 } },
    // 04: leg (5) - "leg" + marker 5 + boy's legs
    { slot: '04', en: 'leg', box: { left: 30, top: 230, width: 230, height: 140 } },
    // 05: ear (6) - cat's ear + marker 6 + "ear"
    { slot: '05', en: 'ear', box: { left: 690, top: 30, width: 240, height: 120 } },
    // 06: eye (7) - "eye" + marker 7 + cat's eyes
    { slot: '06', en: 'eye', box: { left: 540, top: 110, width: 230, height: 80 } },
    // 07: nose (8) - "nose" + marker 8 + cat's nose
    { slot: '07', en: 'nose', box: { left: 520, top: 190, width: 240, height: 80 } },
    // 08: mouth (9) - "mouth" + marker 9 + cat's mouth
    { slot: '08', en: 'mouth', box: { left: 520, top: 270, width: 260, height: 80 } },
    // 09: tail (10) - cat's tail + marker 10 + "tail"
    { slot: '09', en: 'tail', box: { left: 780, top: 80, width: 300, height: 100 } },
    // 10: fur (11) - cat's fur + marker 11 + "fur"
    { slot: '10', en: 'fur', box: { left: 770, top: 180, width: 310, height: 100 } },
    // 11: wing (12) - bird's wing + marker 12 + "wing"
    { slot: '11', en: 'wing', box: { left: 50, top: 390, width: 310, height: 100 } },
    // 12: feather (13) - feather + marker 13 + "feather"
    { slot: '12', en: 'feather', box: { left: 50, top: 470, width: 340, height: 90 } },
    // 13: shell (14) - turtle + marker 14 + "shell"
    { slot: '13', en: 'shell', box: { left: 400, top: 410, width: 330, height: 120 } },
    // 14: horn (15) - cow + marker 15 + "horn"
    { slot: '14', en: 'horn', box: { left: 740, top: 390, width: 310, height: 150 } }
  ];

  const outTestDir = path.join(__dirname, '../scratch_test_u12');
  if (!fs.existsSync(outTestDir)) fs.mkdirSync(outTestDir);

  const sheetPath = path.join(MASTER_DIR, 'u11_p12.png');
  for (const c of u12Crops) {
    const out = path.join(outTestDir, `test_u12_${c.slot}_${c.en}.png`);
    await sharp(sheetPath).extract(c.box).toFile(out);
  }
  console.log('Finished u12 test extractions.');
}

testU12();
