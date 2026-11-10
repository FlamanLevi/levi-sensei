const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Number mapping & styling
const NUMBER_WORD_MAP = {
  zero: '0', '0': '0',
  one: '1', '1': '1',
  two: '2', '2': '2',
  three: '3', '3': '3',
  four: '4', '4': '4',
  five: '5', '5': '5',
  six: '6', '6': '6',
  seven: '7', '7': '7',
  eight: '8', '8': '8',
  nine: '9', '9': '9',
  ten: '10', '10': '10',
  eleven: '11', '11': '11',
  twelve: '12', '12': '12',
  thirteen: '13', '13': '13',
  fourteen: '14', '14': '14',
  fifteen: '15', '15': '15',
  sixteen: '16', '16': '16',
  seventeen: '17', '17': '17',
  eighteen: '18', '18': '18',
  nineteen: '19', '19': '19',
  twenty: '20', '20': '20',
  'twenty-one': '21', 'twenty one': '21', '21': '21',
  'twenty-two': '22', 'twenty two': '22', '22': '22',
  'twenty-three': '23', 'twenty three': '23', '23': '23',
  'twenty-four': '24', 'twenty four': '24', '24': '24',
  'twenty-five': '25', 'twenty five': '25', '25': '25',
  'twenty-six': '26', 'twenty six': '26', '26': '26',
  'twenty-seven': '27', 'twenty seven': '27', '27': '27',
  'twenty-eight': '28', 'twenty eight': '28', '28': '28',
  'twenty-nine': '29', 'twenty nine': '29', '29': '29',
  thirty: '30', '30': '30',
  forty: '40', '40': '40',
  fifty: '50', '50': '50',
  sixty: '60', '60': '60',
  seventy: '70', '70': '70',
  eighty: '80', '80': '80',
  ninety: '90', '90': '90',
  hundred: '100', 'one hundred': '100', 'one-hundred': '100', '100': '100',
  'two hundred': '200', 'two-hundred': '200', '200': '200'
};

function getNumberTheme(val) {
  const n = parseInt(val.replace(/,/g, ''), 10);
  if (isNaN(n) || n < 10) {
    return { bgHex: '#eff6ff', borderHex: '#bfdbfe', textHex: '#2563eb' };
  }
  if (n < 20) {
    return { bgHex: '#fdf2f8', borderHex: '#fbcfe8', textHex: '#db2777' };
  }
  if (n < 30) {
    return { bgHex: '#ecfdf5', borderHex: '#a7f3d0', textHex: '#059669' };
  }
  if (n < 100) {
    return { bgHex: '#faf5ff', borderHex: '#e9d5ff', textHex: '#9333ea' };
  }
  return { bgHex: '#fffbeb', borderHex: '#fde68a', textHex: '#d97706' };
}

function generateSvg(numStr, width = 800, height = 600) {
  const theme = getNumberTheme(numStr);
  const fontSize = numStr.length >= 3 ? Math.round(height * 0.4) : numStr.length === 2 ? Math.round(height * 0.48) : Math.round(height * 0.56);
  const padX = Math.round(width * 0.06);
  const padY = Math.round(height * 0.07);
  const rectW = width - padX * 2;
  const rectH = height - padY * 2;
  const rx = Math.round(Math.min(rectW, rectH) * 0.14);
  const strokeW = Math.max(8, Math.round(Math.min(width, height) * 0.025));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <rect x="${padX}" y="${padY}" width="${rectW}" height="${rectH}" rx="${rx}" fill="${theme.bgHex}" stroke="${theme.borderHex}" stroke-width="${strokeW}" stroke-linejoin="round"/>
  <text x="${width / 2}" y="${height / 2 + fontSize * 0.05}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${fontSize}" fill="${theme.textHex}" text-anchor="middle" dominant-baseline="central">${numStr}</text>
</svg>`;
}

async function run() {
  const masterPath = path.resolve(__dirname, '../public/data/master_vocabulary.json');
  if (!fs.existsSync(masterPath)) {
    console.error('master_vocabulary.json not found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const targets = new Map(); // relPath -> numStr

  for (const item of data) {
    const clean = (item.english || '').toLowerCase().trim();
    const num = NUMBER_WORD_MAP[clean];
    if (num) {
      const paths = [item.card_image, item.hwg_card_illust, item.primary_image];
      if (item.media_by_grade) {
        for (const g of Object.keys(item.media_by_grade)) {
          const m = item.media_by_grade[g];
          if (m.card_image) paths.push(m.card_image);
          if (m.card_full) paths.push(m.card_full);
        }
      }
      for (const p of paths) {
        if (p && typeof p === 'string' && p.startsWith('cards/')) {
          targets.set(p.replace(/\\/g, '/'), num);
          // Also handle both webp and png variants
          const altP = p.endsWith('.png') ? p.replace(/\.png$/, '.webp') : p.replace(/\.webp$/, '.png');
          targets.set(altP.replace(/\\/g, '/'), num);
        }
      }
    }
  }

  console.log(`Generating images for ${targets.size} number card paths...`);

  // Cache rendered buffers by numStr + ext
  const cache = new Map();

  let count = 0;
  for (const [relPath, numStr] of targets.entries()) {
    const ext = path.extname(relPath).toLowerCase();
    const cacheKey = `${numStr}_${ext}`;

    let buffer = cache.get(cacheKey);
    if (!buffer) {
      const svg = Buffer.from(generateSvg(numStr, 800, 600));
      if (ext === '.webp') {
        buffer = await sharp(svg).webp({ quality: 92 }).toBuffer();
      } else {
        buffer = await sharp(svg).png().toBuffer();
      }
      cache.set(cacheKey, buffer);
    }

    // Write to trimmed_assets and dist
    const destRoots = [
      path.resolve(__dirname, '../trimmed_assets'),
      path.resolve(__dirname, '../dist')
    ];

    for (const root of destRoots) {
      const fullPath = path.join(root, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
    }
    count++;
  }

  console.log(`Successfully generated and deployed ${count} number card asset files to trimmed_assets/ and dist/!`);
}

run().catch(console.error);
