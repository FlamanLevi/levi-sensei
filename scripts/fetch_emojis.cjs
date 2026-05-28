const emoji = require('node-emoji');
const fs = require('fs');
const https = require('https');
const path = require('path');

const vocabPath = path.join(__dirname, '../src/data/normalized_vocabulary.json');
const imgDir = path.join(__dirname, '../public/images/vocab');
const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

// Convert string to code point
function toCodePoint(unicodeSurrogates) {
    var r = [], c = 0, p = 0, i = 0;
    while (i < unicodeSurrogates.length) {
        c = unicodeSurrogates.charCodeAt(i++);
        if (p) {
            r.push((65536 + (p - 55296 << 10) + (c - 56320)).toString(16));
            p = 0;
        } else if (55296 <= c && c <= 56319) {
            p = c;
        } else {
            r.push(c.toString(16));
        }
    }
    return r.join('-');
}

const customMap = {
  "red": "red_circle",
  "blue": "large_blue_circle",
  "green": "green_circle",
  "yellow": "yellow_circle",
  "purple": "purple_circle",
  "orange": "orange_circle",
  "black": "black_circle",
  "white": "white_circle",
  "brown": "brown_circle",
  "pink": "sparkling_heart",
  "one": "one",
  "two": "two",
  "three": "three",
  "four": "four",
  "five": "five",
  "six": "six",
  "seven": "seven",
  "eight": "eight",
  "nine": "nine",
  "ten": "keycap_ten",
  "math": "heavy_plus_sign",
  "science": "microscope",
  "social studies": "earth_asia",
  "japanese": "jp",
  "english": "uk",
  "music": "musical_note",
  "arts and crafts": "art",
  "pe": "basketball",
  "p.e.": "basketball",
  "home economics": "fried_egg",
  "moral education": "handshake",
  "calligraphy": "lower_left_paintbrush",
  "spring": "cherry_blossom",
  "summer": "sun_with_face",
  "fall": "fallen_leaf",
  "autumn": "fallen_leaf",
  "winter": "snowman",
  "january": "calendar",
  "monday": "calendar",
  "tuesday": "calendar",
  "wednesday": "calendar",
  "thursday": "calendar",
  "friday": "calendar",
  "saturday": "calendar",
  "sunday": "calendar",
  "always": "100",
  "usually": "clock8",
  "sometimes": "clock830",
  "never": "no_entry_sign"
};

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        response.resume(); // consume response data to free up memory
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
};

async function run() {
    let successCount = 0;
    let missing = [];

    // Process in batches so we don't spam 600 concurrent HTTP requests and get rate limited
    const batchSize = 10;
    for (let i = 0; i < vocab.words.length; i += batchSize) {
        const batch = vocab.words.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (word) => {
            let searchName = word.en.toLowerCase().trim();
            searchName = customMap[searchName] || searchName;
            
            // Special handling: remove "a ", "an ", "the " prefixes
            searchName = searchName.replace(/^(a|an|the)\s+/, '');
            
            let found = emoji.find(searchName);
            
            if (!found && searchName.includes(' ')) {
                // fallback to first word if multi-word failed
                found = emoji.find(searchName.split(' ')[0]);
            }
            if (!found && searchName.includes('-')) {
                // fallback for hyphenated
                found = emoji.find(searchName.split('-')[0]);
            }

            if (found) {
                const cp = toCodePoint(found.emoji);
                // Noto emoji filenames drop fe0f and use underscores
                const hexParts = cp.split('-').filter(x => x !== 'fe0f');
                const notoHex = hexParts.join('_');
                
                const url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u${notoHex}.svg`;
                const destPath = path.join(imgDir, `${word.id}.svg`);
                
                try {
                    await downloadFile(url, destPath);
                    word.img_path = `images/vocab/${word.id}.svg`;
                    successCount++;
                    console.log(`✅ [${word.id}] Mapped "${word.en}" -> ${found.emoji}`);
                } catch (e) {
                    missing.push(word.en);
                    console.log(`❌ [${word.id}] Failed to download SVG for "${word.en}" (${notoHex}) - ${e.message}`);
                }
            } else {
                missing.push(word.en);
                console.log(`⚠️ [${word.id}] No emoji found for "${word.en}"`);
            }
        }));
    }
    
    fs.writeFileSync(vocabPath, JSON.stringify(vocab, null, 2), 'utf8');
    console.log(`\n=================================`);
    console.log(`Done! Successfully mapped and downloaded ${successCount} SVGs.`);
    console.log(`Could not map ${missing.length} words.`);
}

run().catch(console.error);
