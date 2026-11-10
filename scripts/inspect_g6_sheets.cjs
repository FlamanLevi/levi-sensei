const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(__dirname, '../manabi_assets/Grade 6 Manabi (new)');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'g6_cards_manifest.json'), 'utf8'));

async function inspect() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && !f.startsWith('_'));
  console.log(`Found ${files.length} sheets in ${dir}`);
  for (const f of files.sort()) {
    const p = path.join(dir, f);
    const m = await sharp(p).metadata();
    console.log(`${f.padEnd(16)} | ${m.width} x ${m.height} | channels: ${m.channels}`);
  }
}

inspect();
