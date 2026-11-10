const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Paths
const WORLD_FLAGS_DIR = path.join(__dirname, '../trimmed_assets/cards/world_flags');
const ILLUST_DIR = path.join(__dirname, '../trimmed_assets/cards/illustration');
const MASTER_VOCAB_PUBLIC = path.join(__dirname, '../public/data/master_vocabulary.json');
const MASTER_VOCAB_DATA = path.join(__dirname, '../master_vocabulary_data/master_vocabulary.json');

// 2. Core 26 Textbook Mappings
const CORE_26_MAP = {
  'au': { slot: '00', name: 'Australia', vocabId: 'word_0014' },
  'az': { slot: '01', name: 'Azerbaijan', vocabId: 'word_0016' },
  'br': { slot: '02', name: 'Brazil', vocabId: 'word_0032' },
  'ca': { slot: '03', name: 'Canada', vocabId: 'word_0040' },
  'cl': { slot: '04', name: 'Chile', vocabId: 'word_0052' },
  'cn': { slot: '05', name: 'China', vocabId: 'word_0054' },
  'eg': { slot: '06', name: 'Egypt', vocabId: 'word_0093' },
  'fi': { slot: '07', name: 'Finland', vocabId: 'word_0109' },
  'fr': { slot: '08', name: 'France', vocabId: 'word_0114' },
  'de': { slot: '09', name: 'Germany', vocabId: 'word_0124' },
  'in': { slot: '10', name: 'India', vocabId: 'word_0159' },
  'it': { slot: '11', name: 'Italy', vocabId: 'word_0163' },
  'jp': { slot: '12', name: 'Japan', vocabId: 'word_0167' },
  'ke': { slot: '13', name: 'Kenya', vocabId: 'word_0178' },
  'kr': { slot: '14', name: 'Korea', vocabId: 'word_0180' },
  'nz': { slot: '15', name: 'New_Zealand', vocabId: 'word_0211' },
  'no': { slot: '16', name: 'Norway', vocabId: 'word_0216' },
  'pe': { slot: '17', name: 'Peru', vocabId: 'word_0236' },
  'ru': { slot: '18', name: 'Russia', vocabId: 'word_0271' },
  'sa': { slot: '19', name: 'Saudi_Arabia', vocabId: 'word_0277' },
  'za': { slot: '20', name: 'South_Africa', vocabId: 'word_0316' },
  'th': { slot: '21', name: 'Thailand', vocabId: 'word_0349' },
  'mv': { slot: '22', name: 'the_Maldives', vocabId: 'word_0351' },
  'ph': { slot: '23', name: 'the_Philippines', vocabId: 'word_0352' },
  'gb': { slot: '24', name: 'the_U_K_', vocabId: 'word_0353' },
  'us': { slot: '25', name: 'the_U_S_', vocabId: 'word_0354' }
};

// 3. School Japanese Overrides (natural names over long diplomatic titles)
const SCHOOL_JA_OVERRIDES = {
  'kp': { ja: '北朝鮮', hira: 'きたちょうせん', kat: 'キタチョウセン', ruby: [{ base: '北朝鮮', ruby: 'きたちょうせん' }] },
  'kr': { ja: '韓国', hira: 'かんこく', kat: 'カンコク', ruby: [{ base: '韓国', ruby: 'かんこく' }] },
  'cn': { ja: '中国', hira: 'ちゅうごく', kat: 'チュウゴク', ruby: [{ base: '中国', ruby: 'ちゅうごく' }] },
  'tw': { ja: '台湾', hira: 'たいわん', kat: 'タイワン', ruby: [{ base: '台湾', ruby: 'たいわん' }] },
  'nl': { ja: 'オランダ', hira: 'おらんだ', kat: 'オランダ', ruby: [{ base: 'オランダ', ruby: '' }] },
  'mn': { ja: 'モンゴル', hira: 'もんごる', kat: 'モンゴル', ruby: [{ base: 'モンゴル', ruby: '' }] },
  'th': { ja: 'タイ', hira: 'たい', kat: 'タイ', ruby: [{ base: 'タイ', ruby: '' }] },
  'ml': { ja: 'マリ', hira: 'まり', kat: 'マリ', ruby: [{ base: 'マリ', ruby: '' }] },
  'dm': { ja: 'ドミニカ', hira: 'どみにか', kat: 'ドミニカ', ruby: [{ base: 'ドミニカ', ruby: '' }] },
  'us': { ja: 'アメリカ', hira: 'あめりか', kat: 'アメリカ', ruby: [{ base: 'アメリカ', ruby: '' }] },
  'gb': { ja: 'イギリス', hira: 'いぎりす', kat: 'イギリス', ruby: [{ base: 'イギリス', ruby: '' }] },
  'gb-eng': { ja: 'イングランド', hira: 'いんぐらんど', kat: 'イングランド', ruby: [{ base: 'イングランド', ruby: '' }] },
  'gb-sct': { ja: 'スコットランド', hira: 'すこっとらんど', kat: 'スコットランド', ruby: [{ base: 'スコットランド', ruby: '' }] },
  'gb-wls': { ja: 'ウェールズ', hira: 'うぇーるず', kat: 'ウェールズ', ruby: [{ base: 'ウェールズ', ruby: '' }] },
  'gb-nir': { ja: '北アイルランド', hira: 'きたあいるらんど', kat: 'キタアイルランド', ruby: [{ base: '北', ruby: 'きた' }, { base: 'アイルランド', ruby: '' }] },
  'za': { ja: '南アフリカ', hira: 'みなみあふりか', kat: 'ミナミアフリカ', ruby: [{ base: '南', ruby: 'みなみ' }, { base: 'アフリカ', ruby: '' }] },
  'ps': { ja: 'パレスチナ', hira: 'ぱれすちな', kat: 'パレスチナ', ruby: [{ base: 'パレスチナ', ruby: '' }] },

  // Kanji breakdown overrides for compound names
  'ae': { ja: 'アラブ首長国連邦', hira: 'あらぶしゅちょうこくれんぽう', kat: 'アラブシュチョウコクレンポウ', ruby: [{ base: 'アラブ', ruby: '' }, { base: '首長国連邦', ruby: 'しゅちょうこくれんぽう' }] },
  'aq': { ja: '南極大陸', hira: 'なんきょくたいりく', kat: 'ナンキョクタイリク', ruby: [{ base: '南極大陸', ruby: 'なんきょくたいりく' }] },
  'as': { ja: 'アメリカ領サモア', hira: 'あめりかりょうさもあ', kat: 'アメリカリョウサモア', ruby: [{ base: 'アメリカ', ruby: '' }, { base: '領', ruby: 'りょう' }, { base: 'サモア', ruby: '' }] },
  'ax': { ja: 'オーランド諸島', hira: 'おーらんどしょとう', kat: 'オーランドショトウ', ruby: [{ base: 'オーランド', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'bl': { ja: 'サン・バルテルミー島', hira: 'さん・ばるてるみーとう', kat: 'サン・バルテルミートウ', ruby: [{ base: 'サン・バルテルミー', ruby: '' }, { base: '島', ruby: 'とう' }] },
  'bm': { ja: 'バミューダ諸島', hira: 'ばみゅーだしょとう', kat: 'バミューダショトウ', ruby: [{ base: 'バミューダ', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'bv': { ja: 'ブーベ島', hira: 'ぶーべとう', kat: 'ブーベトウ', ruby: [{ base: 'ブーベ', ruby: '' }, { base: '島', ruby: 'とう' }] },
  'cc': { ja: 'ココス諸島', hira: 'ここすしょとう', kat: 'ココスショトウ', ruby: [{ base: 'ココス', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'cd': { ja: 'コンゴ民主共和国', hira: 'こんごみんしゅきょうわこく', kat: 'コンゴミンスシュキョウワコク', ruby: [{ base: 'コンゴ', ruby: '' }, { base: '民主共和国', ruby: 'みんしゅきょうわこく' }] },
  'cf': { ja: '中央アフリカ共和国', hira: 'ちゅうおうあふりかきょうわこく', kat: 'チュウオウアフリカキョウワコク', ruby: [{ base: '中央', ruby: 'ちゅうおう' }, { base: 'アフリカ', ruby: '' }, { base: '共和国', ruby: 'きょうわこく' }] },
  'cg': { ja: 'コンゴ共和国', hira: 'こんごきょうわこく', kat: 'コンゴキョウワコク', ruby: [{ base: 'コンゴ', ruby: '' }, { base: '共和国', ruby: 'きょうわこく' }] },
  'ck': { ja: 'クック諸島', hira: 'くっくしょとう', kat: 'クックショトウ', ruby: [{ base: 'クック', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'cx': { ja: 'クリスマス島', hira: 'くりすますとう', kat: 'クリスマストウ', ruby: [{ base: 'クリスマス', ruby: '' }, { base: '島', ruby: 'とう' }] },
  'do': { ja: 'ドミニカ共和国', hira: 'どみにかきょうわこく', kat: 'ドミニカキョウワコク', ruby: [{ base: 'ドミニカ', ruby: '' }, { base: '共和国', ruby: 'きょうわこく' }] },
  'eh': { ja: '西サハラ', hira: 'にしさはら', kat: 'ニシサハラ', ruby: [{ base: '西', ruby: 'にし' }, { base: 'サハラ', ruby: '' }] },
  'fk': { ja: 'フォークランド諸島', hira: 'ふぉーくらんどしょとう', kat: 'フォークランドショトウ', ruby: [{ base: 'フォークランド', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'fm': { ja: 'ミクロネシア連邦', hira: 'みくろねしあれんぽう', kat: 'ミクロネシアレンポウ', ruby: [{ base: 'ミクロネシア', ruby: '' }, { base: '連邦', ruby: 'れんぽう' }] },
  'fo': { ja: 'フェロー諸島', hira: 'ふぇろーしょとう', kat: 'フェローショトウ', ruby: [{ base: 'フェロー', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'gf': { ja: 'フランス領ギアナ', hira: 'ふらんすりょうぎあな', kat: 'フランスリョウギアナ', ruby: [{ base: 'フランス', ruby: '' }, { base: '領', ruby: 'りょう' }, { base: 'ギアナ', ruby: '' }] },
  'gq': { ja: '赤道ギニア', hira: 'せきどうぎにあ', kat: 'セキドウギニア', ruby: [{ base: '赤道', ruby: 'せきどう' }, { base: 'ギニア', ruby: '' }] },
  'gs': { ja: 'サウスジョージア・サウスサンドウィッチ諸島', hira: 'さうすじょーじあ・さうすさんどうぃっちしょとう', kat: 'サウスジョージア・サウスサンドウィッチショトウ', ruby: [{ base: 'サウスジョージア・サウスサンドウィッチ', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'hk': { ja: '香港', hira: 'ほんこん', kat: 'ホンコン', ruby: [{ base: '香港', ruby: 'ほんこん' }] },
  'hm': { ja: 'ハード島とマクドナルド諸島', hira: 'はーどとうとまくどなるどしょとう', kat: 'ハードトウトマクドナルドショトウ', ruby: [{ base: 'ハード', ruby: '' }, { base: '島', ruby: 'とう' }, { base: 'とマクドナルド', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'im': { ja: 'マン島', hira: 'まんとう', kat: 'マントウ', ruby: [{ base: 'マン', ruby: '' }, { base: '島', ruby: 'とう' }] },
  'io': { ja: 'イギリス領インド洋地域', hira: 'いぎりすりょういんどようちいき', kat: 'イギリスリョウインドヨウチイキ', ruby: [{ base: 'イギリス', ruby: '' }, { base: '領', ruby: 'りょう' }, { base: 'インド', ruby: '' }, { base: '洋地域', ruby: 'ようちいき' }] },
  'jp': { ja: '日本', hira: 'にほん', kat: 'ニホン', ruby: [{ base: '日本', ruby: 'にほん' }] },
  'ky': { ja: 'ケイマン諸島', hira: 'けいまんしょとう', kat: 'ケイマンショトウ', ruby: [{ base: 'ケイマン', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'mh': { ja: 'マーシャル諸島', hira: 'まーしゃるしょとう', kat: 'マーシャルショトウ', ruby: [{ base: 'マーシャル', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'mk': { ja: '北マケドニア', hira: 'きたまけどにあ', kat: 'キタマケドニア', ruby: [{ base: '北', ruby: 'きた' }, { base: 'マケドニア', ruby: '' }] },
  'mp': { ja: '北マリアナ諸島', hira: 'きたまりあなしょとう', kat: 'キタマリアナショトウ', ruby: [{ base: '北', ruby: 'きた' }, { base: 'マリアナ', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'nf': { ja: 'ノーフォーク島', hira: 'のーふぉーくとう', kat: 'ノーフォークトウ', ruby: [{ base: 'ノーフォーク', ruby: '' }, { base: '島', ruby: 'とう' }] },
  'pf': { ja: 'フランス領ポリネシア', hira: 'ふらんすりょうぽりねしあ', kat: 'フランスリョウポリネシア', ruby: [{ base: 'フランス', ruby: '' }, { base: '領', ruby: 'りょう' }, { base: 'ポリネシア', ruby: '' }] },
  'pm': { ja: 'サンピエール島・ミクロン島', hira: 'さんぴえーるとう・みくろんとう', kat: 'サンピエールトウ・ミクロントウ', ruby: [{ base: 'サンピエール', ruby: '' }, { base: '島', ruby: 'とう' }, { base: '・ミクロン', ruby: '' }, { base: '島', ruby: 'とう' }] },
  'pn': { ja: 'ピトケアン諸島', hira: 'ぴとけあんしょとう', kat: 'ピトケアンショトウ', ruby: [{ base: 'ピトケアン', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'sb': { ja: 'ソロモン諸島', hira: 'そろもんしょとう', kat: 'ソロモンショトウ', ruby: [{ base: 'ソロモン', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'sj': { ja: 'スヴァールバル諸島およびヤンマイエン島', hira: 'すゔぁーるばるしょとうおよびやんまいえんとう', kat: 'スヴァールバルショトウオヨビヤンマイエントウ', ruby: [{ base: 'スヴァールバル', ruby: '' }, { base: '諸島', ruby: 'しょとう' }, { base: 'およびヤンマイエン', ruby: '' }, { base: '島', ruby: 'とう' }] },
  'ss': { ja: '南スーダン', hira: 'みなみすーだん', kat: 'ミナミスーダン', ruby: [{ base: '南', ruby: 'みなみ' }, { base: 'スーダン', ruby: '' }] },
  'tc': { ja: 'タークス・カイコス諸島', hira: 'たーくす・かいこすしょとう', kat: 'タークス・カイコスショトウ', ruby: [{ base: 'タークス・カイコス', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'tf': { ja: 'フランス領南方・南極地域', hira: 'ふらんすりょうなんぽう・なんきょくちいき', kat: 'フランスリョウナンポウ・ナンキョクチイキ', ruby: [{ base: 'フランス', ruby: '' }, { base: '領', ruby: 'りょう' }, { base: '南方', ruby: 'なんぽう' }, { base: '・', ruby: '' }, { base: '南極地域', ruby: 'なんきょくちいき' }] },
  'tl': { ja: '東ティモール', hira: 'ひがしていもーる', kat: 'ヒガシティモール', ruby: [{ base: '東', ruby: 'ひがし' }, { base: 'ティモール', ruby: '' }] },
  'um': { ja: '合衆国領有小離島', hira: 'がっしゅうこくりょうゆうしょうりとう', kat: 'ガッシュウコクリョウユウショウリトウ', ruby: [{ base: '合衆国', ruby: 'がっしゅうこく' }, { base: '領有', ruby: 'りょうゆう' }, { base: '小離島', ruby: 'しょうりとう' }] },
  'vg': { ja: 'イギリス領ヴァージン諸島', hira: 'いぎりすりょうゔぁーじんしょとう', kat: 'イギリスリョウヴァージンショトウ', ruby: [{ base: 'イギリス', ruby: '' }, { base: '領', ruby: 'りょう' }, { base: 'ヴァージン', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] },
  'vi': { ja: 'アメリカ領ヴァージン諸島', hira: 'あめりかりょうゔぁーじんしょとう', kat: 'アメリカリョウヴァージンショトウ', ruby: [{ base: 'アメリカ', ruby: '' }, { base: '領', ruby: 'りょう' }, { base: 'ヴァージン', ruby: '' }, { base: '諸島', ruby: 'しょとう' }] }
};

// Helpers
function katakanaToHiragana(katakana) {
  return katakana.replace(/[\u30A1-\u30F6]/g, function(match) {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function run() {
  console.log('🚀 Starting World Flags Deployment & Vocabulary Integration Pipeline...');

  // 1. Fetch remote official ISO mappings
  const enCodes = await (await fetch('https://flagcdn.com/en/codes.json')).json();
  const jaCodes = await (await fetch('https://flagcdn.com/ja/codes.json')).json();

  // 2. Read raw flag files in world_flags
  const existingFiles = fs.readdirSync(WORLD_FLAGS_DIR).filter(f => f.endsWith('.png'));
  console.log(`📂 Found ${existingFiles.length} flag files in: ${WORLD_FLAGS_DIR}`);

  // 3. Build Manifest of all 254 flags
  const flagsManifest = [];
  const rawCodeFiles = [];

  for (const file of existingFiles) {
    // If it's already a renamed flag_ file, skip or parse
    if (file.startsWith('flag_')) continue;
    const code = file.replace('.png', '');
    const enName = enCodes[code];
    if (!enName) {
      console.warn(`⚠️ Unknown country code: ${code}`);
      continue;
    }
    rawCodeFiles.push({ file, code, enName });
  }

  console.log(`📋 Processing ${rawCodeFiles.length} raw country flag files...`);

  // Target sizing: max width 1700px, max height 1050px (Preserves standard asset envelope)
  const MAX_WIDTH = 1700;
  const MAX_HEIGHT = 1050;

  let processedCount = 0;
  let coreCopiedCount = 0;

  for (const item of rawCodeFiles) {
    const { file, code, enName } = item;
    const codeSlug = code.replace('-', '_');
    const slug = slugify(enName);
    const newFilename = `flag_${codeSlug}_${slug}.png`;
    const srcPath = path.join(WORLD_FLAGS_DIR, file);
    const dstPath = path.join(WORLD_FLAGS_DIR, newFilename);

    // Process image with Sharp
    const imgBuffer = fs.readFileSync(srcPath);
    await sharp(imgBuffer)
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside' })
      .png({ compressionLevel: 9 })
      .toFile(dstPath);

    processedCount++;

    // Check if it's one of the 26 Core textbook cards
    if (CORE_26_MAP[code]) {
      const coreInfo = CORE_26_MAP[code];
      const illustFilename = `hwg6_u01_${coreInfo.slot}_${coreInfo.name}_illust.png`;
      const illustDstPath = path.join(ILLUST_DIR, illustFilename);
      fs.copyFileSync(dstPath, illustDstPath);
      coreCopiedCount++;
    }

    // Japanese metadata resolution
    let jaInfo = SCHOOL_JA_OVERRIDES[code];
    if (!jaInfo) {
      const rawJa = jaCodes[code] || enName;
      jaInfo = {
        ja: rawJa,
        hira: katakanaToHiragana(rawJa),
        kat: rawJa,
        ruby: [{ base: rawJa, ruby: '' }]
      };
    }

    flagsManifest.push({
      code,
      en: enName,
      slug,
      filename: newFilename,
      relPath: `cards/world_flags/${newFilename}`,
      isCore: !!CORE_26_MAP[code],
      coreInfo: CORE_26_MAP[code] || null,
      ja: jaInfo.ja,
      hira: jaInfo.hira,
      kat: jaInfo.kat,
      ruby: jaInfo.ruby
    });
  }

  console.log(`✅ Resized and deployed ${processedCount} flags to world_flags/`);
  console.log(`⭐ Upgraded ${coreCopiedCount} textbook illustration cards in cards/illustration/`);

  // Delete old raw 2-letter png files
  for (const item of rawCodeFiles) {
    const srcPath = path.join(WORLD_FLAGS_DIR, item.file);
    if (fs.existsSync(srcPath)) {
      fs.unlinkSync(srcPath);
    }
  }
  console.log(`🧹 Cleaned up ${rawCodeFiles.length} legacy raw 2-letter PNGs.`);

  // 4. Update master_vocabulary.json
  console.log(`📖 Loading master vocabulary from: ${MASTER_VOCAB_PUBLIC}`);
  const masterVocab = JSON.parse(fs.readFileSync(MASTER_VOCAB_PUBLIC, 'utf8'));

  // Update Core 26 entries
  for (const flag of flagsManifest.filter(f => f.isCore)) {
    const vocabEntry = masterVocab.find(v => v.id === flag.coreInfo.vocabId);
    if (vocabEntry) {
      // Fix capitalization for Finland if needed
      if (vocabEntry.english === 'finland') vocabEntry.english = 'Finland';

      // Ensure tags
      if (!vocabEntry.tags) vocabEntry.tags = [];
      ['country', 'core_curriculum', 'world_flag'].forEach(t => {
        if (!vocabEntry.tags.includes(t)) vocabEntry.tags.push(t);
      });

      // Ensure themes
      if (!vocabEntry.themes) vocabEntry.themes = [];
      if (!vocabEntry.themes.includes('world_flags')) vocabEntry.themes.push('world_flags');

      vocabEntry.tier = 'core';
      vocabEntry.country_code = flag.code;
      vocabEntry.world_flag_image = flag.relPath;

      // Ensure hwg6_u01 paths
      const illustPath = `cards/illustration/hwg6_u01_${flag.coreInfo.slot}_${flag.coreInfo.name}_illust.png`;
      const fullPath = `cards/full/hwg6_u01_${flag.coreInfo.slot}_${flag.coreInfo.name}_full.png`;
      vocabEntry.hwg_card_illust = illustPath;
      vocabEntry.card_image = fullPath;
      vocabEntry.primary_image = fullPath;

      // Media by grade
      if (!vocabEntry.media_by_grade) vocabEntry.media_by_grade = {};
      vocabEntry.media_by_grade.ES_G6 = {
        card_image: illustPath,
        card_full: fullPath,
        card_text: `cards/text/hwg6_u01_${flag.coreInfo.slot}_${flag.coreInfo.name}_text.png`,
        unit: 'Unit 1: Countries',
        source: 'here_we_go_6',
        sound_file: vocabEntry.media_by_grade.ES_G6?.sound_file || ''
      };
    }
  }

  // Add 228 Expanded entries
  let currentMaxId = Math.max(...masterVocab.map(v => parseInt(v.id.replace('word_', ''), 10)).filter(n => !isNaN(n)));
  const expandedFlags = flagsManifest.filter(f => !f.isCore);
  console.log(`🌍 Creating vocabulary entries for ${expandedFlags.length} expanded countries (starting at word_${String(currentMaxId + 1).padStart(4, '0')})...`);

  for (const flag of expandedFlags) {
    currentMaxId++;
    const newId = `word_${String(currentMaxId).padStart(4, '0')}`;
    const firstLetter = flag.en.charAt(0).toUpperCase();

    const newVocabItem = {
      id: newId,
      english: flag.en,
      canonical_key: `hwg_country_${flag.code}`,
      disambiguation: "",
      display_label: flag.en,
      normalized_english: flag.en.toLowerCase(),
      part_of_speech: "noun",
      category: "06_facility",
      category_name: "施設・場所・国",
      ja_kanji: flag.ja,
      ja_hiragana: flag.hira,
      en_katakana: flag.kat,
      ruby: flag.ruby,
      ruby_html: flag.ruby.map(r => r.ruby ? `<ruby>${r.base}<rt>${r.ruby}</rt></ruby>` : r.base).join(''),
      ruby_text: flag.ruby.map(r => r.ruby ? `${r.base}(${r.ruby})` : r.base).join(''),
      sound_file: "",
      card_image: flag.relPath,
      card_image_kana: flag.relPath,
      card_image_en: flag.relPath,
      card_image_bilingual: flag.relPath,
      card_variants: [],
      token: flag.en.toLowerCase(),
      grades: ["ES_G6"],
      themes: ["world_flags"],
      tags: ["country", "world_flag", "expanded_curriculum"],
      hwg_card_full: "",
      hwg_card_illust: flag.relPath,
      hwg_card_text: "",
      lemma: flag.en,
      is_plural: false,
      primary_image: flag.relPath,
      primary_audio: "",
      letter_count: flag.en.replace(/\s+/g, '').length,
      syllable_count: Math.max(1, Math.round(flag.en.length / 3)),
      first_letter: firstLetter,
      is_compound: flag.en.includes(' '),
      phonics_initial: firstLetter,
      difficulty_tier: 3,
      target_sentences: [
        `Q: Where do you want to visit? / A: I want to visit ${flag.en}.`
      ],
      target_dialogues: [
        {
          question: "Where do you want to visit?",
          answer: `I want to visit ${flag.en}.`,
          context: "Talking about world travel and countries"
        }
      ],
      three_hints: {
        category_hint: "It is a country or territory in the world.",
        feature_hint: `A nation or region known as '${flag.ja}' in Japanese.`,
        letter_hint: `It starts with the letter ${firstLetter}.`
      },
      media_by_grade: {
        ES_G6: {
          card_image: flag.relPath,
          card_full: "",
          card_text: "",
          unit: "World Flags: Countries of the World",
          source: "world_flags",
          sound_file: ""
        }
      },
      tier: "expanded",
      country_code: flag.code,
      audio_suite: {}
    };

    masterVocab.push(newVocabItem);
  }

  // Write updated master vocabulary
  console.log(`💾 Saving updated database (Total entries: ${masterVocab.length})...`);
  const jsonOutput = JSON.stringify(masterVocab, null, 2);
  fs.writeFileSync(MASTER_VOCAB_PUBLIC, jsonOutput, 'utf8');
  if (fs.existsSync(path.dirname(MASTER_VOCAB_DATA))) {
    fs.writeFileSync(MASTER_VOCAB_DATA, jsonOutput, 'utf8');
  }

  console.log(`🎉 Pipeline complete! Successfully integrated all 254 flags across Core (26) and Expanded (${expandedFlags.length}).`);
}

run().catch(err => {
  console.error('❌ Pipeline failed:', err);
  process.exit(1);
});
