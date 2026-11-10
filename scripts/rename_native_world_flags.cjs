const fs = require('fs');
const path = require('path');

const WORLD_FLAGS_DIR = path.join(__dirname, '../trimmed_assets/cards/world_flags');
const ILLUST_DIR = path.join(__dirname, '../trimmed_assets/cards/illustration');

const CORE_26_MAP = {
  'au': { slot: '00', name: 'Australia' },
  'az': { slot: '01', name: 'Azerbaijan' },
  'br': { slot: '02', name: 'Brazil' },
  'ca': { slot: '03', name: 'Canada' },
  'cl': { slot: '04', name: 'Chile' },
  'cn': { slot: '05', name: 'China' },
  'eg': { slot: '06', name: 'Egypt' },
  'fi': { slot: '07', name: 'Finland' },
  'fr': { slot: '08', name: 'France' },
  'de': { slot: '09', name: 'Germany' },
  'in': { slot: '10', name: 'India' },
  'it': { slot: '11', name: 'Italy' },
  'jp': { slot: '12', name: 'Japan' },
  'ke': { slot: '13', name: 'Kenya' },
  'kr': { slot: '14', name: 'Korea' },
  'nz': { slot: '15', name: 'New_Zealand' },
  'no': { slot: '16', name: 'Norway' },
  'pe': { slot: '17', name: 'Peru' },
  'ru': { slot: '18', name: 'Russia' },
  'sa': { slot: '19', name: 'Saudi_Arabia' },
  'za': { slot: '20', name: 'South_Africa' },
  'th': { slot: '21', name: 'Thailand' },
  'mv': { slot: '22', name: 'the_Maldives' },
  'ph': { slot: '23', name: 'the_Philippines' },
  'gb': { slot: '24', name: 'the_U_K_' },
  'us': { slot: '25', name: 'the_U_S_' }
};

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function run() {
  console.log('⚡ Renaming native 2560px flag files directly without re-encoding...');

  const enCodes = await (await fetch('https://flagcdn.com/en/codes.json')).json();
  const files = fs.readdirSync(WORLD_FLAGS_DIR).filter(f => f.endsWith('.png'));

  let renamedCount = 0;
  let coreCopiedCount = 0;

  for (const file of files) {
    if (file.startsWith('flag_')) continue;
    const code = file.replace('.png', '');
    const enName = enCodes[code];
    if (!enName) {
      console.warn(`⚠️ Unknown country code: ${code}`);
      continue;
    }

    const codeSlug = code.replace('-', '_');
    const slug = slugify(enName);
    const newFilename = `flag_${codeSlug}_${slug}.png`;

    const oldPath = path.join(WORLD_FLAGS_DIR, file);
    const newPath = path.join(WORLD_FLAGS_DIR, newFilename);

    // Native rename without any quality/palette loss!
    fs.renameSync(oldPath, newPath);
    renamedCount++;

    // Copy to Core 26 illustration if applicable
    if (CORE_26_MAP[code]) {
      const coreInfo = CORE_26_MAP[code];
      const illustPath = path.join(ILLUST_DIR, `hwg6_u01_${coreInfo.slot}_${coreInfo.name}_illust.png`);
      fs.copyFileSync(newPath, illustPath);
      coreCopiedCount++;
    }
  }

  console.log(`✅ Successfully renamed ${renamedCount} native 2560px flags in world_flags/`);
  console.log(`⭐ Successfully deployed ${coreCopiedCount} native 2560px illustrations to cards/illustration/`);
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
