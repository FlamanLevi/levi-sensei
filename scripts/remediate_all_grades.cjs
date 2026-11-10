const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const vocabPath = path.join(rootDir, 'public/data/master_vocabulary.json');
const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

async function remediate() {
  console.log('🚀 Starting Comprehensive Remediation across all 4 grades...');

  // ----------------------------------------------------
  // STEP 1: Upscale & Recompose Low-Res and Extreme Aspect Images
  // ----------------------------------------------------
  console.log('\n--- Step 1: Upscaling & Recomposing Target Images ---');
  
  const upscaleList = [
    // G5
    { name: 'hwg5_u22_03_see_animals_illust', scale: 4, src: 'manabi_assets/cards/illustration/hwg5_u22_03_see_animals_illust.png' },
    { name: 'hwg5_u22_02_see_beautiful_flowers_illust', scale: 4, src: 'manabi_assets/cards/illustration/hwg5_u22_02_see_beautiful_flowers_illust.png' },
    { name: 'hwg5_u12_25_T-shirt_illust', scale: 4, src: 'manabi_assets/cards/illustration/hwg5_u12_25_T-shirt_illust.png' },
    { name: 'hwg5_u09_02_soda_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg5_u09_02_soda_illust.png' },
    { name: 'hwg5_u09_00_milk_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg5_u09_00_milk_illust.png' },
    { name: 'hwg5_u21_04_go_straight_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg5_u21_04_go_straight_illust.png' },
    { name: 'hwg5_u21_07_stop_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg5_u21_07_stop_illust.png' },
    { name: 'hwg5_u12_05_tablet_illust', scale: 2, src: 'manabi_assets/cards/illustration/hwg5_u12_05_tablet_illust.png' },
    { name: 'hwg5_u14_06_P_E__illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg5_u14_06_P_E__illust.png' },
    // G6
    { name: 'hwg6_u13_01_basketball_team_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg6_u13_01_basketball_team_illust.png' },
    { name: 'hwg6_u13_03_soccer_team_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg6_u13_03_soccer_team_illust.png' },
    { name: 'hwg6_u13_11_newspaper_club_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg6_u13_11_newspaper_club_illust.png' },
    { name: 'hwg6_u06_26_have_illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg6_u06_26_have_illust.png' },
    { name: 'hwg6_u07_05_Monday_illust', scale: 2, src: 'manabi_assets/cards/illustration/hwg6_u07_05_Monday_illust.png' },
    { name: 'hwg6_u07_10_Saturday_illust', scale: 2, src: 'manabi_assets/cards/illustration/hwg6_u07_10_Saturday_illust.png' },
    { name: 'hwg6_u07_08_Thursday_illust', scale: 2, src: 'manabi_assets/cards/illustration/hwg6_u07_08_Thursday_illust.png' },
    { name: 'hwg6_u07_07_Wednesday_illust', scale: 2, src: 'manabi_assets/cards/illustration/hwg6_u07_07_Wednesday_illust.png' },
    { name: 'hwg6_u12_02_shoulder_illust', scale: 2, src: 'manabi_assets/cards/illustration/hwg6_u12_02_shoulder_illust.png' },
    { name: 'hwg6_u14_06_P_E__illust', scale: 3, src: 'manabi_assets/cards/illustration/hwg6_u14_06_P_E__illust.png' }
  ];

  for (const item of upscaleList) {
    const srcPath = path.join(rootDir, item.src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Source missing for ${item.name}: ${srcPath}`);
      continue;
    }
    const meta = await sharp(srcPath).metadata();
    const newWidth = Math.round(meta.width * item.scale);
    const newHeight = Math.round(meta.height * item.scale);

    const outWebp = await sharp(srcPath)
      .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 90, effort: 6 })
      .toBuffer();

    const outPng = await sharp(srcPath)
      .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 8 })
      .toBuffer();

    // Save under original name and lowercase name in trimmed_assets and dist
    const targets = [
      item.name,
      item.name.toLowerCase(),
      item.name.replace('P_E_', 'p_e_').replace('T-shirt', 't-shirt')
    ];

    const uniqueTargets = [...new Set(targets)];
    for (const t of uniqueTargets) {
      const dirs = [
        path.join(rootDir, 'trimmed_assets/cards/illustration'),
        path.join(rootDir, 'dist/cards/illustration')
      ];
      for (const d of dirs) {
        fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, `${t}.webp`), outWebp);
        fs.writeFileSync(path.join(d, `${t}.png`), outPng);
      }
    }
    console.log(`  ✓ Upscaled ${item.name}: ${meta.width}x${meta.height} -> ${newWidth}x${newHeight}`);
  }

  // Feather (G6) - pad to 4:3 ratio (800x600)
  const featherSrc = path.join(rootDir, 'manabi_assets/cards/illustration/hwg6_u12_12_feather_illust.png');
  if (fs.existsSync(featherSrc)) {
    const fMeta = await sharp(featherSrc).metadata();
    const upscaled = await sharp(featherSrc)
      .resize(Math.round(fMeta.width * 1.5), Math.round(fMeta.height * 1.5))
      .toBuffer();
    const uMeta = await sharp(upscaled).metadata();
    const canvasH = Math.round(uMeta.width * (3 / 4));
    const padTop = Math.round((canvasH - uMeta.height) / 2);

    const featherPadded = await sharp(upscaled)
      .extend({
        top: padTop,
        bottom: canvasH - uMeta.height - padTop,
        left: 0,
        right: 0,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .webp({ quality: 90 })
      .toBuffer();

    const fDirs = [
      path.join(rootDir, 'trimmed_assets/cards/illustration'),
      path.join(rootDir, 'dist/cards/illustration')
    ];
    for (const d of fDirs) {
      fs.writeFileSync(path.join(d, 'hwg6_u12_12_feather_illust.webp'), featherPadded);
    }
    console.log(`  ✓ Recomposed feather (4:3 padded canvas: ${uMeta.width}x${canvasH})`);
  }

  // Dish (G4) - pad to 4:3 ratio
  const dishSrc = path.join(rootDir, 'letstry2/resources/app/app/__media/dictionary/dic_card_data_image/dic_wb_07dailylife_dish_1356_1_c.png');
  if (fs.existsSync(dishSrc)) {
    const dMeta = await sharp(dishSrc).metadata();
    const canvasH = Math.round(dMeta.width * (3 / 4));
    const padTop = Math.round((canvasH - dMeta.height) / 2);

    const dishPadded = await sharp(dishSrc)
      .extend({
        top: padTop,
        bottom: canvasH - dMeta.height - padTop,
        left: 0,
        right: 0,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .webp({ quality: 90 })
      .toBuffer();

    const dDirs = [
      path.join(rootDir, 'trimmed_assets/letstry_images'),
      path.join(rootDir, 'dist/media/images')
    ];
    for (const d of dDirs) {
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'dic_wb_07dailylife_dish_1356_1_c.webp'), dishPadded);
    }
    console.log(`  ✓ Recomposed dish (4:3 padded canvas: ${dMeta.width}x${canvasH})`);
  }

  // ----------------------------------------------------
  // STEP 2: Balloon & Sun for Grade 3
  // ----------------------------------------------------
  console.log('\n--- Step 2: Balloon & Sun for Grade 3 ---');

  // Balloon for G3
  const balloonSrc = path.join(rootDir, 'manabi_assets/cards/illustration/hwg5_u12_29_balloon_illust.png');
  if (fs.existsSync(balloonSrc)) {
    const bMeta = await sharp(balloonSrc).metadata();
    const balloonWebp = await sharp(balloonSrc)
      .resize(bMeta.width * 3, bMeta.height * 3, { kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 92 })
      .toBuffer();

    const bDirs = [
      path.join(rootDir, 'trimmed_assets/letstry_images'),
      path.join(rootDir, 'dist/media/images')
    ];
    for (const d of bDirs) {
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'dic_3_card_balloon_2199_1_c.webp'), balloonWebp);
    }
    console.log('  ✓ Created dic_3_card_balloon_2199_1_c.webp for Grade 3');
  }

  // ----------------------------------------------------
  // STEP 3: Vector SVG Artwork for Conversational & Speech Target Words
  // ----------------------------------------------------
  console.log('\n--- Step 3: Generating Vector Badges for Speech & Missing Words ---');

  // Helper to generate clean, high-contrast, charming SVG badges
  function createCardSvg(title, subtitle, iconSvg, theme) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bgStart}"/>
      <stop offset="100%" stop-color="${theme.bgEnd}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="${theme.shadowColor}" flood-opacity="0.18"/>
    </filter>
  </defs>
  
  <!-- Outer Card Frame -->
  <rect x="20" y="20" width="460" height="460" rx="40" fill="url(#cardGrad)" stroke="${theme.border}" stroke-width="8" filter="url(#shadow)"/>
  
  <!-- Inner Content Container -->
  <rect x="45" y="45" width="410" height="410" rx="30" fill="#ffffff" fill-opacity="0.85"/>
  
  <!-- Central Icon Graphic -->
  <g transform="translate(130, 90)">
    ${iconSvg}
  </g>
  
  <!-- Primary Title -->
  <text x="250" y="380" font-family="'UD Digi Kyokasho NP-R', 'Nunito', system-ui, sans-serif" font-size="${title.length > 10 ? '34' : '42'}" font-weight="900" fill="${theme.textColor}" text-anchor="middle" letter-spacing="1">
    ${title}
  </text>
  
  <!-- Secondary Subtitle (Japanese) -->
  <text x="250" y="425" font-family="'UD Digi Kyokasho NP-R', 'BIZ UDPGothic', sans-serif" font-size="24" font-weight="bold" fill="${theme.subTextColor}" text-anchor="middle">
    ${subtitle}
  </text>
</svg>`;
  }

  const svgDefinitions = {
    // Grade 3 Unit 1: Greetings & Manners
    'hello': {
      title: 'Hello!',
      subtitle: 'こんにちは',
      theme: { bgStart: '#dbeafe', bgEnd: '#93c5fd', border: '#3b82f6', textColor: '#1d4ed8', subTextColor: '#3b82f6', shadowColor: '#1e40af' },
      icon: `<g stroke="#2563eb" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Waving Hand -->
        <path d="M70 180 C70 120, 60 70, 75 40 C85 20, 110 20, 115 50 L115 110" fill="#fde68a" stroke="#d97706"/>
        <path d="M115 50 C120 20, 145 20, 150 50 L150 110" fill="#fde68a" stroke="#d97706"/>
        <path d="M150 60 C155 30, 180 30, 185 60 L185 130" fill="#fde68a" stroke="#d97706"/>
        <path d="M75 110 C50 90, 30 110, 45 140 L70 180 L180 180 C210 180, 210 150, 185 130" fill="#fde68a" stroke="#d97706"/>
        <path d="M20 50 C30 20, 60 10, 60 10" stroke="#3b82f6" stroke-width="10"/>
        <path d="M10 80 C25 60, 45 50, 45 50" stroke="#3b82f6" stroke-width="10"/>
      </g>`
    },
    'thank you': {
      title: 'Thank you!',
      subtitle: 'ありがとう',
      theme: { bgStart: '#fce7f3', bgEnd: '#f472b6', border: '#ec4899', textColor: '#be185d', subTextColor: '#db2777', shadowColor: '#9d174d' },
      icon: `<g stroke-linecap="round" stroke-linejoin="round">
        <!-- Big Heart with sparkles -->
        <path d="M120 40 C60 -20, -20 50, 120 200 C260 50, 180 -20, 120 40 Z" fill="#ec4899" stroke="#be185d" stroke-width="10"/>
        <circle cx="60" cy="60" r="14" fill="#ffffff" fill-opacity="0.6"/>
        <path d="M20 20 L40 20 M30 10 L30 30" stroke="#f472b6" stroke-width="8"/>
        <path d="M210 30 L230 30 M220 20 L220 40" stroke="#f472b6" stroke-width="8"/>
      </g>`
    },
    'you\'re welcome': {
      title: "You're welcome",
      subtitle: 'どういたしまして',
      theme: { bgStart: '#e0e7ff', bgEnd: '#a5b4fc', border: '#6366f1', textColor: '#4338ca', subTextColor: '#6366f1', shadowColor: '#3730a3' },
      icon: `<g stroke="#4f46e5" stroke-width="10" stroke-linecap="round" fill="none">
        <circle cx="120" cy="110" r="85" fill="#fef3c7" stroke="#f59e0b" stroke-width="10"/>
        <circle cx="90" cy="95" r="10" fill="#4338ca"/>
        <circle cx="150" cy="95" r="10" fill="#4338ca"/>
        <path d="M85 135 Q120 175 155 135" fill="none" stroke="#dc2626" stroke-width="12"/>
      </g>`
    },
    'please': {
      title: 'Please',
      subtitle: 'どうぞ / お願い',
      theme: { bgStart: '#ccfbf1', bgEnd: '#5eead4', border: '#14b8a6', textColor: '#0f766e', subTextColor: '#0d9488', shadowColor: '#115e59' },
      icon: `<g stroke="#0d9488" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="#a7f3d0">
        <!-- Two Praying/Pleading Hands -->
        <path d="M100 180 L100 50 C100 30, 120 30, 120 50 L120 180 Z" fill="#fde68a" stroke="#d97706"/>
        <path d="M140 180 L140 50 C140 30, 120 30, 120 50 L120 180 Z" fill="#fde68a" stroke="#d97706"/>
        <path d="M60 120 L100 90 L100 180 L60 180 Z" fill="#fde68a" stroke="#d97706"/>
        <path d="M180 120 L140 90 L140 180 L180 180 Z" fill="#fde68a" stroke="#d97706"/>
        <!-- Magic Sparkles -->
        <polygon points="120,5 125,20 140,25 125,30 120,45 115,30 100,25 115,20" fill="#fbbf24" stroke="none"/>
      </g>`
    },
    'yes': {
      title: 'Yes',
      subtitle: 'はい',
      theme: { bgStart: '#dcfce7', bgEnd: '#86efac', border: '#22c55e', textColor: '#15803d', subTextColor: '#16a34a', shadowColor: '#166534' },
      icon: `<g>
        <circle cx="120" cy="110" r="90" fill="#22c55e" stroke="#16a34a" stroke-width="10"/>
        <path d="M70 110 L105 145 L175 75" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`
    },
    'no': {
      title: 'No',
      subtitle: 'いいえ',
      theme: { bgStart: '#fee2e2', bgEnd: '#fca5a5', border: '#ef4444', textColor: '#b91c1c', subTextColor: '#dc2626', shadowColor: '#991b1b' },
      icon: `<g>
        <circle cx="120" cy="110" r="90" fill="#ef4444" stroke="#dc2626" stroke-width="10"/>
        <path d="M80 70 L160 150 M160 70 L80 150" fill="none" stroke="#ffffff" stroke-width="24" stroke-linecap="round"/>
      </g>`
    },
    'sure': {
      title: 'Sure!',
      subtitle: 'もちろん / いいよ',
      theme: { bgStart: '#fef3c7', bgEnd: '#fcd34d', border: '#f59e0b', textColor: '#b45309', subTextColor: '#d97706', shadowColor: '#92400e' },
      icon: `<g stroke="#d97706" stroke-width="10" stroke-linecap="round" fill="none">
        <circle cx="120" cy="110" r="85" fill="#fbbf24"/>
        <text x="120" y="135" font-family="system-ui, sans-serif" font-size="70" font-weight="900" fill="#ffffff" stroke="#b45309" stroke-width="4" text-anchor="middle">OK</text>
      </g>`
    },
    'candy': {
      title: 'candy',
      subtitle: 'あめ / キャンディー',
      theme: { bgStart: '#fae8ff', bgEnd: '#f0abfc', border: '#d946ef', textColor: '#a21caf', subTextColor: '#c026d3', shadowColor: '#86198f' },
      icon: `<g stroke-linecap="round" stroke-linejoin="round">
        <!-- Lollipop -->
        <line x1="80" y1="140" x2="40" y2="200" stroke="#f59e0b" stroke-width="14"/>
        <circle cx="110" cy="110" r="55" fill="#ec4899" stroke="#db2777" stroke-width="8"/>
        <path d="M110 70 A40 40 0 0 1 150 110 A25 25 0 0 1 125 135" fill="none" stroke="#ffffff" stroke-width="10"/>
        <!-- Wrapped Candy -->
        <circle cx="170" cy="130" r="35" fill="#3b82f6" stroke="#1d4ed8" stroke-width="6"/>
        <polygon points="135,130 115,110 115,150" fill="#60a5fa"/>
        <polygon points="205,130 225,110 225,150" fill="#60a5fa"/>
      </g>`
    },
    'car': {
      title: 'car',
      subtitle: 'くるま',
      theme: { bgStart: '#fee2e2', bgEnd: '#f87171', border: '#ef4444', textColor: '#b91c1c', subTextColor: '#dc2626', shadowColor: '#991b1b' },
      icon: `<g stroke="#b91c1c" stroke-width="8" stroke-linejoin="round">
        <path d="M40 140 L70 80 L170 80 L200 140 Z" fill="#ef4444"/>
        <rect x="25" y="130" width="190" height="40" rx="15" fill="#dc2626"/>
        <!-- Windows -->
        <polygon points="75,88 115,88 115,130 55,130" fill="#bfdbfe"/>
        <polygon points="125,88 165,88 185,130 125,130" fill="#bfdbfe"/>
        <!-- Wheels -->
        <circle cx="75" cy="170" r="24" fill="#334155" stroke="#0f172a" stroke-width="6"/>
        <circle cx="75" cy="170" r="8" fill="#cbd5e1" stroke="none"/>
        <circle cx="165" cy="170" r="24" fill="#334155" stroke="#0f172a" stroke-width="6"/>
        <circle cx="165" cy="170" r="8" fill="#cbd5e1" stroke="none"/>
      </g>`
    },
    'dinosaur': {
      title: 'dinosaur',
      subtitle: 'きょうりゅう',
      theme: { bgStart: '#dcfce7', bgEnd: '#4ade80', border: '#22c55e', textColor: '#15803d', subTextColor: '#16a34a', shadowColor: '#14532d' },
      icon: `<g stroke="#15803d" stroke-width="8" stroke-linejoin="round">
        <!-- Cute Cartoon Dino -->
        <path d="M40 180 C40 100 80 40 130 40 C170 40 190 70 190 100 C190 140 150 160 170 190 L130 190 C120 170 100 170 90 190 Z" fill="#22c55e"/>
        <!-- Eye & Smile -->
        <circle cx="145" cy="75" r="8" fill="#0f172a" stroke="none"/>
        <circle cx="147" cy="73" r="2" fill="#ffffff" stroke="none"/>
        <path d="M140 105 Q155 115 165 105" fill="none" stroke="#15803d" stroke-width="5" stroke-linecap="round"/>
        <!-- Back Spikes -->
        <polygon points="80,55 90,35 100,50" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
        <polygon points="60,85 70,65 80,80" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
        <polygon points="45,120 55,100 65,115" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
      </g>`
    },
    'present': {
      title: 'present',
      subtitle: 'プレゼント',
      theme: { bgStart: '#ede9fe', bgEnd: '#c4b5fd', border: '#8b5cf6', textColor: '#6d28d9', subTextColor: '#7c3aed', shadowColor: '#5b21b6' },
      icon: `<g stroke="#6d28d9" stroke-width="8" stroke-linejoin="round">
        <!-- Gift Box -->
        <rect x="50" y="90" width="140" height="100" rx="10" fill="#8b5cf6"/>
        <rect x="40" y="70" width="160" height="28" rx="8" fill="#a78bfa"/>
        <!-- Ribbon -->
        <rect x="105" y="70" width="30" height="120" fill="#facc15" stroke="#ca8a04" stroke-width="6"/>
        <!-- Bow -->
        <ellipse cx="90" cy="55" rx="25" ry="15" fill="#facc15" stroke="#ca8a04" stroke-width="6"/>
        <ellipse cx="150" cy="55" rx="25" ry="15" fill="#facc15" stroke="#ca8a04" stroke-width="6"/>
        <circle cx="120" cy="60" r="12" fill="#eab308" stroke="#ca8a04" stroke-width="6"/>
      </g>`
    },
    'shapes': {
      title: 'shapes',
      subtitle: 'かたち',
      theme: { bgStart: '#ffedd5', bgEnd: '#fed7aa', border: '#f97316', textColor: '#c2410c', subTextColor: '#ea580c', shadowColor: '#9a3412' },
      icon: `<g stroke-width="8" stroke-linejoin="round">
        <!-- Circle -->
        <circle cx="80" cy="80" r="35" fill="#ef4444" stroke="#b91c1c"/>
        <!-- Square -->
        <rect x="130" y="45" width="65" height="65" rx="8" fill="#3b82f6" stroke="#1d4ed8"/>
        <!-- Triangle -->
        <polygon points="80,125 45,185 115,185" fill="#22c55e" stroke="#15803d"/>
        <!-- Star -->
        <polygon points="160,120 167,140 188,140 171,152 177,172 160,160 143,172 149,152 132,140 153,140" fill="#eab308" stroke="#a16207"/>
      </g>`
    },
    'shop': {
      title: 'shop',
      subtitle: 'おみせ',
      theme: { bgStart: '#fef3c7', bgEnd: '#fde68a', border: '#f59e0b', textColor: '#b45309', subTextColor: '#d97706', shadowColor: '#92400e' },
      icon: `<g stroke="#b45309" stroke-width="8" stroke-linejoin="round">
        <!-- Store Base -->
        <rect x="50" y="90" width="140" height="100" fill="#ffffff"/>
        <!-- Awning stripes -->
        <polygon points="40,90 200,90 190,50 50,50" fill="#ef4444"/>
        <polygon points="70,90 95,90 90,50 65,50" fill="#ffffff" stroke="none"/>
        <polygon points="120,90 145,90 140,50 115,50" fill="#ffffff" stroke="none"/>
        <polygon points="170,90 195,90 190,50 165,50" fill="#ffffff" stroke="none"/>
        <!-- Door & Window -->
        <rect x="70" y="125" width="40" height="65" rx="5" fill="#60a5fa" stroke="#2563eb" stroke-width="6"/>
        <rect x="130" y="130" width="45" height="60" rx="5" fill="#94a3b8" stroke="#475569" stroke-width="6"/>
      </g>`
    },
    'glad': {
      title: 'glad',
      subtitle: 'うれしい',
      theme: { bgStart: '#fef9c3', bgEnd: '#fef08a', border: '#eab308', textColor: '#854d0e', subTextColor: '#a16207', shadowColor: '#713f12' },
      icon: `<g stroke="#a16207" stroke-width="8" stroke-linecap="round">
        <circle cx="120" cy="110" r="80" fill="#facc15"/>
        <!-- Smiling Eyes -->
        <path d="M80 95 Q95 80 110 95" fill="none" stroke="#713f12" stroke-width="10"/>
        <path d="M130 95 Q145 80 160 95" fill="none" stroke="#713f12" stroke-width="10"/>
        <!-- Big Smile -->
        <path d="M80 125 Q120 175 160 125 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="6"/>
        <!-- Cheeks -->
        <circle cx="70" cy="120" r="12" fill="#f87171" stroke="none"/>
        <circle cx="170" cy="120" r="12" fill="#f87171" stroke="none"/>
      </g>`
    },
    'surprised': {
      title: 'surprised',
      subtitle: 'おどろいた',
      theme: { bgStart: '#e0f2fe', bgEnd: '#bae6fd', border: '#0284c7', textColor: '#0369a1', subTextColor: '#0284c7', shadowColor: '#075985' },
      icon: `<g stroke="#0369a1" stroke-width="8" stroke-linecap="round">
        <circle cx="120" cy="110" r="80" fill="#7dd3fc"/>
        <!-- Wide Eyes -->
        <circle cx="90" cy="90" r="18" fill="#ffffff" stroke="#075985" stroke-width="6"/>
        <circle cx="90" cy="90" r="8" fill="#0c4a6e" stroke="none"/>
        <circle cx="150" cy="90" r="18" fill="#ffffff" stroke="#075985" stroke-width="6"/>
        <circle cx="150" cy="90" r="8" fill="#0c4a6e" stroke="none"/>
        <!-- Open O Mouth -->
        <ellipse cx="120" cy="145" rx="18" ry="25" fill="#0c4a6e" stroke="#075985" stroke-width="6"/>
      </g>`
    },
    'tall': {
      title: 'tall',
      subtitle: 'せがたかい',
      theme: { bgStart: '#fef3c7', bgEnd: '#fde68a', border: '#d97706', textColor: '#92400e', subTextColor: '#b45309', shadowColor: '#78350f' },
      icon: `<g stroke="#b45309" stroke-width="8" stroke-linejoin="round">
        <!-- Cute Tall Giraffe -->
        <path d="M100 190 L100 80 Q100 40 140 40 L160 40 Q170 40 170 50 Q170 60 150 70 L130 90 L130 190 Z" fill="#facc15"/>
        <circle cx="150" cy="50" r="4" fill="#000000" stroke="none"/>
        <!-- Spots -->
        <circle cx="115" cy="110" r="8" fill="#d97706" stroke="none"/>
        <circle cx="115" cy="140" r="10" fill="#d97706" stroke="none"/>
        <circle cx="115" cy="170" r="8" fill="#d97706" stroke="none"/>
        <!-- Height Arrow -->
        <line x1="60" y1="180" x2="60" y2="40" stroke="#2563eb" stroke-width="8"/>
        <polygon points="60,30 50,50 70,50" fill="#2563eb" stroke="none"/>
      </g>`
    },
    'mistake': {
      title: 'mistake',
      subtitle: 'まちがい',
      theme: { bgStart: '#fee2e2', bgEnd: '#fecaca', border: '#f87171', textColor: '#b91c1c', subTextColor: '#dc2626', shadowColor: '#991b1b' },
      icon: `<g stroke="#dc2626" stroke-width="10" stroke-linecap="round">
        <circle cx="120" cy="110" r="80" fill="#fef2f2"/>
        <!-- Oops Sweating Face -->
        <ellipse cx="90" cy="95" rx="6" ry="10" fill="#1e293b" stroke="none"/>
        <ellipse cx="150" cy="95" rx="6" ry="10" fill="#1e293b" stroke="none"/>
        <path d="M100 145 Q120 130 140 145" fill="none" stroke="#1e293b" stroke-width="8"/>
        <!-- Sweat Drop -->
        <path d="M175 70 C175 60, 185 50, 185 50 C185 50, 195 60, 195 70 A10 10 0 1 1 175 70 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="4"/>
      </g>`
    },
    'decision': {
      title: 'decision',
      subtitle: 'けってい',
      theme: { bgStart: '#f0fdf4', bgEnd: '#bbf7d0', border: '#22c55e', textColor: '#15803d', subTextColor: '#16a34a', shadowColor: '#166534' },
      icon: `<g stroke="#16a34a" stroke-width="8" stroke-linejoin="round">
        <!-- Lightbulb Idea -->
        <path d="M90 100 C90 60, 150 60, 150 100 C150 120, 135 130, 135 145 L105 145 C105 130, 90 120, 90 100 Z" fill="#fde047" stroke="#ca8a04"/>
        <rect x="105" y="150" width="30" height="15" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="4"/>
        <!-- Rays -->
        <line x1="120" y1="35" x2="120" y2="20" stroke="#eab308" stroke-width="8" stroke-linecap="round"/>
        <line x1="60" y1="60" x2="45" y2="50" stroke="#eab308" stroke-width="8" stroke-linecap="round"/>
        <line x1="180" y1="60" x2="195" y2="50" stroke="#eab308" stroke-width="8" stroke-linecap="round"/>
      </g>`
    },
    'hear': {
      title: 'hear',
      subtitle: 'きく',
      theme: { bgStart: '#e0e7ff', bgEnd: '#c7d2fe', border: '#6366f1', textColor: '#4338ca', subTextColor: '#4f46e5', shadowColor: '#3730a3' },
      icon: `<g stroke="#4f46e5" stroke-width="8" stroke-linecap="round">
        <!-- Ear -->
        <path d="M100 170 C60 160, 60 60, 110 50 C150 40, 160 80, 140 110 C125 130, 130 150, 115 165 Z" fill="#fde68a" stroke="#d97706"/>
        <!-- Sound Waves -->
        <path d="M165 80 A30 30 0 0 1 165 140" fill="none" stroke="#6366f1" stroke-width="10"/>
        <path d="M185 60 A55 55 0 0 1 185 160" fill="none" stroke="#818cf8" stroke-width="10"/>
      </g>`
    },
    'imagine': {
      title: 'imagine',
      subtitle: 'そうぞうする',
      theme: { bgStart: '#fae8ff', bgEnd: '#e879f9', border: '#c026d3', textColor: '#86198f', subTextColor: '#a21caf', shadowColor: '#701a75' },
      icon: `<g stroke="#c026d3" stroke-width="8" stroke-linejoin="round">
        <!-- Thought Cloud -->
        <ellipse cx="120" cy="100" rx="60" ry="40" fill="#ffffff"/>
        <ellipse cx="80" cy="90" rx="35" ry="30" fill="#ffffff"/>
        <ellipse cx="160" cy="90" rx="35" ry="30" fill="#ffffff"/>
        <circle cx="85" cy="160" r="14" fill="#ffffff"/>
        <circle cx="65" cy="185" r="8" fill="#ffffff"/>
        <!-- Star inside cloud -->
        <polygon points="120,75 125,90 140,90 128,100 132,115 120,105 108,115 112,100 100,90 115,90" fill="#facc15" stroke="#eab308" stroke-width="4"/>
      </g>`
    },
    'inventor': {
      title: 'inventor',
      subtitle: 'はつめいか',
      theme: { bgStart: '#fef3c7', bgEnd: '#fcd34d', border: '#f59e0b', textColor: '#b45309', subTextColor: '#d97706', shadowColor: '#92400e' },
      icon: `<g stroke="#b45309" stroke-width="8" stroke-linejoin="round">
        <!-- Gears -->
        <circle cx="95" cy="95" r="35" fill="#94a3b8" stroke="#475569" stroke-width="8"/>
        <circle cx="95" cy="95" r="12" fill="#ffffff" stroke="#475569" stroke-width="6"/>
        <circle cx="150" cy="135" r="28" fill="#f59e0b" stroke="#b45309" stroke-width="6"/>
        <circle cx="150" cy="135" r="10" fill="#ffffff" stroke="#b45309" stroke-width="4"/>
      </g>`
    }
  };

  const letstryImgDir = path.join(rootDir, 'trimmed_assets/letstry_images');
  const distImgDir = path.join(rootDir, 'dist/media/images');
  fs.mkdirSync(letstryImgDir, { recursive: true });
  fs.mkdirSync(distImgDir, { recursive: true });

  const svgFilenames = {};
  for (const [key, def] of Object.entries(svgDefinitions)) {
    const filename = `dic_custom_${key.replace(/[^a-z0-9]/g, '_')}_1_c.svg`;
    const svgContent = createCardSvg(def.title, def.subtitle, def.icon, def.theme);
    fs.writeFileSync(path.join(letstryImgDir, filename), svgContent, 'utf8');
    fs.writeFileSync(path.join(distImgDir, filename), svgContent, 'utf8');
    svgFilenames[key] = filename;
    console.log(`  ✓ Generated vector badge: ${filename}`);
  }

  // ----------------------------------------------------
  // STEP 4: Update master_vocabulary.json
  // ----------------------------------------------------
  console.log('\n--- Step 4: Updating master_vocabulary.json Metadata ---');

  // G5 Unit assignments for previously unassigned words
  const g5UnitMap = {
    'skate': 'Unit 4: Sports',
    'ski': 'Unit 4: Sports',
    'fantastic': 'Unit 24: Impressions',
    'gentle': 'Unit 18: Character and Personality',
    'beefsteak': 'Unit 8: Food',
    'mineral water': 'Unit 9: Drinks and Desserts',
    'parfait': 'Unit 9: Drinks and Desserts',
    'soda pop': 'Unit 9: Drinks and Desserts',
    'department store': 'Unit 19: Town',
    'gas station': 'Unit 19: Town',
    'hero': 'Unit 17: Jobs',
    'police officer': 'Unit 17: Jobs',
    'post': 'Unit 19: Town',
    'soccer player': 'Unit 17: Jobs',
    'street': 'Unit 19: Town',
    'bat': 'Unit 12: Things Around You',
    'book': 'Unit 12: Things Around You',
    'box': 'Unit 12: Things Around You',
    "Dolls' Festival": 'Unit 11: Months and Days',
    "New Year's Day": 'Unit 11: Months and Days',
    "New Year's Eve": 'Unit 11: Months and Days'
  };

  // G6 Unit assignments for previously unassigned words
  const g6UnitMap = {
    'sushi': 'Unit 8: Daily Life',
    'chocolate': 'Unit 8: Daily Life',
    'bitter': 'Unit 17: Attributes',
    'cold': 'Unit 17: Attributes',
    'happy': 'Unit 18: Impressions',
    'hard': 'Unit 17: Attributes',
    'hot': 'Unit 17: Attributes',
    'salty': 'Unit 17: Attributes',
    'soft': 'Unit 17: Attributes',
    'sour': 'Unit 17: Attributes',
    'sweet': 'Unit 17: Attributes',
    'baker': 'Unit 15: Jobs',
    'bus driver': 'Unit 15: Jobs',
    'comedian': 'Unit 15: Jobs',
    'flight attendant': 'Unit 15: Jobs',
    'pilot': 'Unit 15: Jobs',
    'singer': 'Unit 15: Jobs',
    'drum': 'Unit 13: Club Activity',
    'hat': 'Unit 8: Daily Life',
    'piano': 'Unit 13: Club Activity',
    'recorder': 'Unit 13: Club Activity',
    'violin': 'Unit 13: Club Activity',
    'camping': 'Unit 7: When and How Often',
    "Dolls' Festival": 'Unit 5: Seasonal Events',
    'hiking': 'Unit 7: When and How Often',
    'jogging': 'Unit 7: When and How Often',
    'playing': 'Unit 6: Actions',
    'reading': 'Unit 6: Actions',
    'shopping': 'Unit 7: When and How Often',
    'Snow Festival': 'Unit 5: Seasonal Events',
    'Star Festival': 'Unit 5: Seasonal Events'
  };

  let updatedCount = 0;

  for (const w of vocab) {
    const eng = w.english.toLowerCase();

    // Grade 3 fixes
    if (w.media_by_grade?.ES_G3) {
      const g3 = w.media_by_grade.ES_G3;
      if (eng === 'balloon') {
        g3.card_image = 'dic_3_card_balloon_2199_1_c.webp';
        updatedCount++;
      } else if (eng === 'sun') {
        g3.card_image = 'dic_wb_12nature_sunny_1523_1_c.png';
        updatedCount++;
      } else if (svgFilenames[eng]) {
        g3.card_image = svgFilenames[eng];
        updatedCount++;
      }
    }

    // Grade 4 fixes
    if (w.media_by_grade?.ES_G4) {
      const g4 = w.media_by_grade.ES_G4;
      if (svgFilenames[eng]) {
        g4.card_image = svgFilenames[eng];
        updatedCount++;
      }
    }

    // Grade 5 Unit assignment fixes
    if (w.media_by_grade?.ES_G5) {
      const g5 = w.media_by_grade.ES_G5;
      if (!g5.unit && g5UnitMap[w.english]) {
        g5.unit = g5UnitMap[w.english];
        updatedCount++;
      }
    }

    // Grade 6 Unit assignment fixes
    if (w.media_by_grade?.ES_G6) {
      const g6 = w.media_by_grade.ES_G6;
      if (!g6.unit && g6UnitMap[w.english]) {
        g6.unit = g6UnitMap[w.english];
        updatedCount++;
      }
    }
  }

  fs.writeFileSync(vocabPath, JSON.stringify(vocab, null, 2), 'utf8');
  console.log(`  ✓ Successfully updated ${updatedCount} vocabulary entries in master_vocabulary.json`);

  // Also sync to master_vocabulary_data if exists
  const masterDataDir = path.join(rootDir, 'master_vocabulary_data');
  if (fs.existsSync(masterDataDir)) {
    fs.writeFileSync(path.join(masterDataDir, 'master_vocabulary.json'), JSON.stringify(vocab, null, 2), 'utf8');
    console.log('  ✓ Synced to master_vocabulary_data/master_vocabulary.json');
  }

  console.log('\n Remediation complete!');
}

remediate().catch(console.error);
