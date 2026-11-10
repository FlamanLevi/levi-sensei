const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const MASTER_DIR = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');

const p20_1_cards = [
  // 00: zero (top right)
  { slot: '00', en: 'zero', card: { left: 875, top: 22, width: 215, height: 60 }, badge: { left: 881, top: 25, width: 34, height: 36 } },
  // 01..05 (Row 1: 5 cols)
  { slot: '01', en: 'one', card: { left: 12, top: 104, width: 212, height: 57 }, badge: { left: 16, top: 108, width: 34, height: 36 } },
  { slot: '02', en: 'two', card: { left: 228, top: 104, width: 212, height: 57 }, badge: { left: 232, top: 108, width: 34, height: 36 } },
  { slot: '03', en: 'three', card: { left: 444, top: 104, width: 212, height: 57 }, badge: { left: 448, top: 108, width: 34, height: 36 } },
  { slot: '04', en: 'four', card: { left: 660, top: 104, width: 212, height: 57 }, badge: { left: 664, top: 108, width: 34, height: 36 } },
  { slot: '05', en: 'five', card: { left: 876, top: 104, width: 212, height: 57 }, badge: { left: 881, top: 108, width: 34, height: 36 } },
  // 06..10 (Row 2: 5 cols)
  { slot: '06', en: 'six', card: { left: 12, top: 185, width: 212, height: 57 }, badge: { left: 16, top: 189, width: 34, height: 35 } },
  { slot: '07', en: 'seven', card: { left: 228, top: 185, width: 212, height: 57 }, badge: { left: 232, top: 189, width: 34, height: 35 } },
  { slot: '08', en: 'eight', card: { left: 444, top: 185, width: 212, height: 57 }, badge: { left: 448, top: 189, width: 34, height: 35 } },
  { slot: '09', en: 'nine', card: { left: 660, top: 185, width: 212, height: 57 }, badge: { left: 664, top: 189, width: 34, height: 35 } },
  { slot: '10', en: 'ten', card: { left: 876, top: 185, width: 212, height: 57 }, badge: { left: 881, top: 189, width: 34, height: 35 } },
  // 11..14 (Row 3: 4 cols)
  { slot: '11', en: 'eleven', card: { left: 12, top: 305, width: 260, height: 57 }, badge: { left: 16, top: 309, width: 34, height: 35 } },
  { slot: '12', en: 'twelve', card: { left: 283, top: 305, width: 260, height: 57 }, badge: { left: 287, top: 309, width: 34, height: 35 } },
  { slot: '13', en: 'thirteen', card: { left: 553, top: 305, width: 260, height: 57 }, badge: { left: 557, top: 309, width: 34, height: 35 } },
  { slot: '14', en: 'fourteen', card: { left: 824, top: 305, width: 260, height: 57 }, badge: { left: 828, top: 309, width: 34, height: 35 } },
  // 15..18 (Row 4: 4 cols)
  { slot: '15', en: 'fifteen', card: { left: 12, top: 389, width: 260, height: 57 }, badge: { left: 16, top: 393, width: 34, height: 35 } },
  { slot: '16', en: 'sixteen', card: { left: 283, top: 389, width: 260, height: 57 }, badge: { left: 287, top: 393, width: 34, height: 35 } },
  { slot: '17', en: 'seventeen', card: { left: 553, top: 389, width: 260, height: 57 }, badge: { left: 557, top: 393, width: 34, height: 35 } },
  { slot: '18', en: 'eighteen', card: { left: 824, top: 389, width: 260, height: 57 }, badge: { left: 828, top: 393, width: 34, height: 35 } },
  // 19..20 (Row 5: 2 cols)
  { slot: '19', en: 'nineteen', card: { left: 12, top: 473, width: 260, height: 57 }, badge: { left: 16, top: 477, width: 34, height: 35 } },
  { slot: '20', en: 'twenty', card: { left: 283, top: 473, width: 260, height: 57 }, badge: { left: 287, top: 477, width: 34, height: 35 } }
];

const p20_2_cards = [
  // 21..24 (Row 1: 4 cols)
  { slot: '21', en: 'twenty-one', card: { left: 12, top: 16, width: 260, height: 57 }, badge: { left: 16, top: 20, width: 34, height: 36 } },
  { slot: '22', en: 'twenty-two', card: { left: 282, top: 16, width: 260, height: 57 }, badge: { left: 286, top: 20, width: 35, height: 36 } },
  { slot: '23', en: 'twenty-three', card: { left: 553, top: 16, width: 260, height: 57 }, badge: { left: 557, top: 20, width: 34, height: 36 } },
  { slot: '24', en: 'twenty-four', card: { left: 823, top: 16, width: 260, height: 57 }, badge: { left: 827, top: 20, width: 34, height: 36 } },
  // 25..28 (Row 2: 4 cols)
  { slot: '25', en: 'twenty-five', card: { left: 12, top: 100, width: 260, height: 57 }, badge: { left: 16, top: 104, width: 34, height: 35 } },
  { slot: '26', en: 'twenty-six', card: { left: 282, top: 100, width: 260, height: 57 }, badge: { left: 286, top: 104, width: 35, height: 35 } },
  { slot: '27', en: 'twenty-seven', card: { left: 553, top: 100, width: 260, height: 57 }, badge: { left: 557, top: 104, width: 34, height: 35 } },
  { slot: '28', en: 'twenty-eight', card: { left: 823, top: 100, width: 260, height: 57 }, badge: { left: 827, top: 104, width: 34, height: 35 } },
  // 29..30 (Row 3: 2 cols)
  { slot: '29', en: 'twenty-nine', card: { left: 12, top: 184, width: 260, height: 57 }, badge: { left: 16, top: 188, width: 34, height: 35 } },
  { slot: '30', en: 'thirty', card: { left: 282, top: 184, width: 260, height: 57 }, badge: { left: 286, top: 188, width: 35, height: 35 } },
  // 31..34: 40, 50, 60, 70 (Row 4: 4 cols)
  { slot: '31', en: 'forty', card: { left: 12, top: 298, width: 260, height: 57 }, badge: { left: 16, top: 302, width: 34, height: 35 } },
  { slot: '32', en: 'fifty', card: { left: 282, top: 298, width: 260, height: 57 }, badge: { left: 286, top: 302, width: 35, height: 35 } },
  { slot: '33', en: 'sixty', card: { left: 553, top: 298, width: 260, height: 57 }, badge: { left: 557, top: 302, width: 34, height: 35 } },
  { slot: '34', en: 'seventy', card: { left: 823, top: 298, width: 260, height: 57 }, badge: { left: 827, top: 302, width: 34, height: 35 } },
  // 35..37: 80, 90, 100 (Row 5: 3 cols)
  { slot: '35', en: 'eighty', card: { left: 12, top: 382, width: 260, height: 57 }, badge: { left: 16, top: 386, width: 34, height: 35 } },
  { slot: '36', en: 'ninety', card: { left: 282, top: 382, width: 260, height: 57 }, badge: { left: 286, top: 386, width: 35, height: 35 } },
  { slot: '37', en: 'one_hundred', card: { left: 553, top: 382, width: 260, height: 57 }, badge: { left: 557, top: 386, width: 34, height: 35 } },
  // 38..39: 101, 200 (Row 6: 2 wide cards)
  { slot: '38', en: 'one_hundred_and_one', card: { left: 12, top: 503, width: 430, height: 57 }, badge: { left: 16, top: 507, width: 34, height: 35 } },
  { slot: '39', en: 'two_hundred', card: { left: 12, top: 587, width: 280, height: 57 }, badge: { left: 16, top: 591, width: 34, height: 35 } }
];

async function testNumbers() {
  const outDir = path.join(__dirname, '../scratch_test_u19');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const s1 = path.join(MASTER_DIR, 'u11_p20_1.png');
  for (const c of [p20_1_cards[0], p20_1_cards[1], p20_1_cards[10], p20_1_cards[20]]) {
    await sharp(s1).extract(c.card).toFile(path.join(outDir, `card_${c.slot}_${c.en}.png`));
    await sharp(s1).extract(c.badge).toFile(path.join(outDir, `badge_${c.slot}_${c.en}.png`));
  }

  const s2 = path.join(MASTER_DIR, 'u11_p20_2.png');
  for (const c of [p20_2_cards[0], p20_2_cards[10], p20_2_cards[16], p20_2_cards[17], p20_2_cards[18]]) {
    await sharp(s2).extract(c.card).toFile(path.join(outDir, `card_${c.slot}_${c.en}.png`));
    await sharp(s2).extract(c.badge).toFile(path.join(outDir, `badge_${c.slot}_${c.en}.png`));
  }
  console.log('Number test cuts finished.');
}

testNumbers();
