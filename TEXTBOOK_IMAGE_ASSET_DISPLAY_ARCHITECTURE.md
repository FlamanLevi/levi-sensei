# Levi-Sensei English Platform: Textbook Image Asset Display Architecture & Codebook

> **Authoritative Technical Reference & Implementation Catalog**  
> Covers Let's Try 1 & 2 (Grades 3 & 4) and Here We Go 5 & 6 (Grades 5 & 6) textbook media handling across all classroom games, TV front-screen stages, student iPad devices, and print tools.

---

## 1. Executive Summary & Asset Architecture Overview

The **Levi-Sensei English Platform** utilizes digital card and illustration assets from two primary Japanese Ministry of Education, Culture, Sports, Science and Technology (MEXT) elementary English textbook curricula:
1. **Let's Try 1 & 2** (Bun-Eido / Ministry approved for Grades 3 & 4)
2. **Here We Go 5 & 6** (Mitsumura Tosho approved for Grades 5 & 6)

### 1.1 Textbook Asset File Naming Conventions
* **Let's Try 1 & 2 (Grades 3 & 4)**:
  * `*_1_c.png` / `*.webp` / `*.svg`: Vibrant full-color illustration without English or Japanese text. This is the **primary asset** for game flashcards, guessing quizzes, memory games, and dictionary illustrations.
  * `*_1_ce.png` / `*.webp`: Full-color illustration card with official baked-in English typography. Used primarily for printable cards or combined flashcard review modes.
  * `*_1.png` / `*_1_e.png`: Monochrome line art (used exclusively for printable coloring sheets).
* **Here We Go 5 & 6 (Grades 5 & 6)**:
  * `/cards/illustration/*_illust.webp` / `*.png`: Official textbook artwork cropped without handwriting guide lines.
  * `/cards/full/*_full.webp` / `*.png`: Official 4-line notebook flashcard with handwriting baselines.
  * `/cards/text/*_text.webp` / `*.png`: Text-only flashcards.

### 1.2 Unified Master Vocabulary Single-Entry Schema
Every vocabulary word exists as a single unified entry in `master_vocabulary.json`. To prevent duplicate database rows across grades, grade-specific media is mapped using `media_by_grade`:

```typescript
export interface VocabularyItem {
  id: string;
  english: string;
  ja_kanji?: string;
  ja_hiragana?: string;
  en_katakana?: string;
  primary_image?: string;
  card_image?: string;
  card_image_bilingual?: string;
  hwg_card_illust?: string;
  hwg_card_full?: string;
  media_by_grade?: Partial<Record<GradeLevel, GradeMediaInfo>>;
  sound_file?: string;
  primary_audio?: string;
}

export interface GradeMediaInfo {
  grade: GradeLevel;
  source: string; // e.g. "Let's Try 1", "Here We Go 5"
  card_image?: string;
  card_full?: string;
  audio?: string;
}
```

### 1.3 Classroom Delivery Streams
The platform delivers these images through distinct multi-device display streams:
* **Stream 🅰️ (Front TV / Projector)**: Rendered from the teacher's laptop to an 80-inch classroom television or ceiling projector. Visuals are calibrated for back-row visibility (8 meters away), featuring giant single-surface viewports (`max-h-[min(56vh,540px)]`, `h-52 sm:h-72 md:h-80`), high-contrast slate borders, and MEXT Japanese font stack ruby text.
* **Stream 🅱️ (Multi-iPad Student Devices)**: 40 simultaneous student iPads connected over Firebase Realtime Database (RTDB). Cards are scaled for touch surfaces, responsive grids, and low-latency rendering. Strict anti-cheating logic suppresses pictures during translation exercises.
* **Stream 🅲 (Solo Study & Utility Modals)**: Picture dictionary exploration, print sheets (Bingo 3x3 / 4x4), routine morning warm-ups, and 3D architectural inspections.

---

## 2. Core Image Resolution & Pipeline Infrastructure

### 2.1 Zero-Copy Vite Streaming Middleware (`vite.config.ts`)
To prevent gigabytes of media assets from being copied into the `public/` folder on exFAT and removable external drives, `vite.config.ts` intercepts `/cards/` and `/media/images/` requests at runtime and pipes files directly from local storage.

```typescript
// vite.config.ts: Media Resolution Middleware
function resolveMediaFile(cleanUrl: string): string {
  let targetFile = '';

  // Here We Go 5 & 6 Cards
  if (cleanUrl.startsWith('/cards/')) {
    const rel = cleanUrl.replace('/cards/', '');
    targetFile = path.join(__dirname, 'trimmed_assets/cards', rel);
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'manabi_assets/cards', rel);
    }
  } 
  // Let's Try 1 & 2 Images
  else if (cleanUrl.startsWith('/media/images/')) {
    const rel = cleanUrl.replace('/media/images/', '');
    const baseName = rel.replace(/\.[^.]+$/, '');

    // 1. Check super-sampled Lanczos 1080p + SVGs
    targetFile = path.join(__dirname, 'new_assets/letstry_images', rel);
    if (!fs.existsSync(targetFile)) {
      for (const altExt of ['.webp', '.svg', '.png']) {
        const altPath = path.join(__dirname, 'new_assets/letstry_images', baseName + altExt);
        if (fs.existsSync(altPath)) {
          targetFile = altPath;
          break;
        }
      }
    }

    // 2. Fall back to trimmed_assets/letstry_images
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'trimmed_assets/letstry_images', rel);
      if (!fs.existsSync(targetFile)) {
        for (const altExt of ['.webp', '.svg', '.png']) {
          const altPath = path.join(__dirname, 'trimmed_assets/letstry_images', baseName + altExt);
          if (fs.existsSync(altPath)) {
            targetFile = altPath;
            break;
          }
        }
      }
    }

    // 3. Fall back to original textbook extractions
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(__dirname, 'letstry1/resources/app/app/__media/dictionary/dic_card_data_image', rel);
      if (!fs.existsSync(targetFile)) {
        targetFile = path.join(__dirname, 'letstry2/resources/app/app/__media/dictionary/dic_card_data_image', rel);
      }
    }
  }
  return targetFile;
}
```

---

### 2.2 Canonical Card Image Resolver (`src/utils/cardUtils.ts`)
`resolveCardImage()` is the authoritative resolver used by almost all games. It executes a 5-priority ladder ensuring:
1. **Active Grade Match**: If Grade 4 is active, resolve Let's Try 2 artwork; if Grade 5 is active, resolve Here We Go artwork.
2. **Same-Bracket Match**: Lower elementary (G1–G4) falls back within lower textbooks; upper elementary (G5–G6) falls back within upper textbooks.
3. **Intelligent Cross-Grade Fallback**: Never display a blank card. If an upper elementary student reviews a lower-grade item not redrawn in *Here We Go* (e.g., `arts and crafts room`), it resolves the *Let's Try* drawing. If a lower elementary student plays upper-grade vocabulary (e.g., `actor`), it shows the *Here We Go* drawing.
4. **Pure Illustration Slicing**: Converts `_1_ce.` to `_1_c.` and `/cards/full/` to `/cards/illustration/` when `picture_only` is requested so textbook flashcard artwork never has duplicate baked-in English words.
5. **Universal Dynamic Vector Number Fallback**: Replaces missing number images with crisp vector SVG badges.

```typescript
// src/utils/cardUtils.ts: resolveCardImage()
export function resolveCardImage(
  word: VocabularyItem,
  tierOrGrade?: CardDisplayTier | GradeLevel,
  gradeParam?: GradeLevel
): string | null {
  let tier: CardDisplayTier = 'picture_only';
  let grade: GradeLevel | undefined = undefined;

  if (
    tierOrGrade === 'picture_only' ||
    tierOrGrade === 'picture_word' ||
    tierOrGrade === 'word_only' ||
    tierOrGrade === 'audio_only'
  ) {
    tier = tierOrGrade;
    grade = gradeParam;
  } else if (typeof tierOrGrade === 'string') {
    grade = tierOrGrade as GradeLevel;
    tier = 'picture_only';
  }

  if (tier === 'word_only' || tier === 'audio_only') {
    return null;
  }

  // Universal dynamic vector number cards
  const numVal = getNumberValue(word.english);
  if (numVal) {
    return getNumberSvgDataUri(numVal);
  }

  const gradeKey = grade
    ? (String(grade).startsWith('ES_G') || String(grade).startsWith('KD_') || String(grade).startsWith('JHS_')
        ? String(grade)
        : `ES_G${grade}`)
    : undefined;

  const isLower = isLowerElementaryGrade(gradeKey || (grade as string | undefined));
  const isUpper = isUpperElementaryGrade(gradeKey || (grade as string | undefined));

  let rawPath = '';

  // 1. Direct Grade-Specific Match (Preferred textbook illustration)
  if (gradeKey && word.media_by_grade && word.media_by_grade[gradeKey as GradeLevel]) {
    const gm = word.media_by_grade[gradeKey as GradeLevel]!;
    const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
    if (candidate) {
      rawPath = candidate;
    }
  }

  // 2. Same-Bracket Grade Match
  if (!rawPath && word.media_by_grade) {
    if (isLower) {
      const lowerOrder: GradeLevel[] = ['ES_G4', 'ES_G3', 'ES_G2', 'ES_G1'];
      for (const g of lowerOrder) {
        const gm = word.media_by_grade[g];
        if (gm) {
          const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
          if (candidate) {
            rawPath = candidate;
            break;
          }
        }
      }
    } else if (isUpper) {
      const upperOrder: GradeLevel[] = ['ES_G6', 'ES_G5', 'JHS_G1'];
      for (const g of upperOrder) {
        const gm = word.media_by_grade[g];
        if (gm) {
          const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
          if (candidate) {
            rawPath = candidate;
            break;
          }
        }
      }
    }
  }

  // 3. Same-Bracket Direct Fields Match (card_image / hwg_card_illust)
  if (!rawPath) {
    if (isLower) {
      if (tier === 'picture_word') {
        if (word.card_image_bilingual && !isHereWeGoAsset(word.card_image_bilingual)) {
          rawPath = word.card_image_bilingual;
        } else if (word.card_image && isLetsTryAsset(word.card_image)) {
          rawPath = word.card_image.replace(/_1_c\.(png|webp|svg)/, '_1_ce.$1');
        } else if (word.primary_image && isLetsTryAsset(word.primary_image)) {
          rawPath = word.primary_image.replace(/_1_c\.(png|webp|svg)/, '_1_ce.$1');
        }
      } else {
        if (word.card_image && isLetsTryAsset(word.card_image)) {
          rawPath = word.card_image;
        } else if (word.primary_image && isLetsTryAsset(word.primary_image)) {
          rawPath = word.primary_image;
        }
      }
    } else if (isUpper) {
      if (tier === 'picture_word') {
        if (word.hwg_card_full && !isLetsTryAsset(word.hwg_card_full)) {
          rawPath = word.hwg_card_full;
        } else if (word.primary_image && isHereWeGoAsset(word.primary_image)) {
          rawPath = word.primary_image;
        }
      } else {
        if (word.hwg_card_illust && !isLetsTryAsset(word.hwg_card_illust)) {
          rawPath = word.hwg_card_illust;
        } else if (word.hwg_card_full && !isLetsTryAsset(word.hwg_card_full)) {
          rawPath = word.hwg_card_full;
        } else if (word.primary_image && isHereWeGoAsset(word.primary_image)) {
          rawPath = word.primary_image;
        } else if (word.card_image && isHereWeGoAsset(word.card_image)) {
          rawPath = word.card_image;
        }
      }
    }
  }

  // 4. Intelligent Cross-Grade Fallback
  if (!rawPath) {
    if (isLower) {
      if (word.media_by_grade) {
        const upperOrder: GradeLevel[] = ['ES_G5', 'ES_G6', 'JHS_G1'];
        for (const g of upperOrder) {
          const gm = word.media_by_grade[g];
          if (gm) {
            const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
            if (candidate) {
              rawPath = candidate;
              break;
            }
          }
        }
      }
      if (!rawPath) {
        rawPath = word.hwg_card_illust || word.hwg_card_full || word.card_image || word.primary_image || '';
      }
    } else if (isUpper) {
      if (word.media_by_grade) {
        const lowerOrder: GradeLevel[] = ['ES_G4', 'ES_G3', 'ES_G2', 'ES_G1'];
        for (const g of lowerOrder) {
          const gm = word.media_by_grade[g];
          if (gm) {
            const candidate = (tier === 'picture_word' && gm.card_full) ? gm.card_full : gm.card_image;
            if (candidate) {
              rawPath = candidate;
              break;
            }
          }
        }
      }
      if (!rawPath) {
        rawPath = word.card_image_bilingual || word.card_image || word.primary_image || '';
      }
    } else {
      rawPath = (tier === 'picture_word' ? (word.card_image_bilingual || word.hwg_card_full) : null)
        || word.card_image
        || word.hwg_card_illust
        || word.primary_image
        || '';
    }
  }

  // 5. Final fallback to any card image
  if (!rawPath) {
    rawPath = word.card_image || word.primary_image || word.hwg_card_illust || word.hwg_card_full || '';
  }

  if (!rawPath) return null;

  // Convert for pure illustration tier
  if (tier === 'picture_only') {
    if (rawPath.includes('_1_ce.')) {
      rawPath = rawPath.replace(/_1_ce\.(png|webp|svg)/, '_1_c.$1');
    }
    if (rawPath.includes('/cards/full/')) {
      rawPath = rawPath.replace('/cards/full/', '/cards/illustration/');
    } else if (rawPath.includes('cards/full/')) {
      rawPath = rawPath.replace('cards/full/', 'cards/illustration/');
    }
    if (rawPath.includes('_full.')) {
      rawPath = rawPath.replace(/_full\.(png|webp)/, '_illust.$1');
    }
  }

  // Format URL for Vite dev/preview server
  let resolved = rawPath;
  if (rawPath.startsWith('cards/')) {
    resolved = `/${rawPath}`;
  } else if (!rawPath.startsWith('http://') && !rawPath.startsWith('https://') && !rawPath.startsWith('/')) {
    resolved = `/media/images/${rawPath}`;
  }

  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return resolved;
  }
  return resolved.includes('?') ? resolved : `${resolved}?v=esrgan`;
}
```

---

### 2.3 Universal Dynamic Number Vector Badges (`src/utils/numberBadge.ts`)
Instead of relying on raster image files for English counting numbers (`one`, `twelve`, `thirty-five`, etc.), `numberBadge.ts` deterministically generates crisp SVG vector graphics styled according to Japanese elementary color themes (single digits = warm orange/amber, teens = sky blue/indigo, tens = emerald/green, large numbers = purple/rose).

```typescript
// src/utils/numberBadge.ts: SVG Generator
export function generateNumberSvg(numStr: string, width = 400, height = 300): string {
  const theme = getNumberTheme(numStr);
  const fontSize = numStr.length >= 3 ? Math.round(height * 0.4) : numStr.length === 2 ? Math.round(height * 0.48) : Math.round(height * 0.56);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" rx="24" fill="${theme.bgHex}" stroke="${theme.borderHex}" stroke-width="8"/>
    <text x="50%" y="54%" font-family="monospace, sans-serif" font-weight="900" font-size="${fontSize}" fill="${theme.textHex}" text-anchor="middle" dominant-baseline="central" letter-spacing="-0.04em">${numStr}</text>
  </svg>`;
}

export function getNumberSvgDataUri(numStr: string): string {
  const svg = generateNumberSvg(numStr, 400, 300);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
```

---

### 2.4 Universal Dual-Mode Card Display (`src/components/common/CardDisplay.tsx`)
Foundational UI component supporting:
* `variant="illust"`: Clean textbook drawing.
* `variant="full"`: Upper elementary 4-line notebook guide mode (Top 60% artwork, Bottom 40% handwriting guidelines).
* `variant="text"`: Standalone 4-line handwriting practice.

```tsx
// src/components/common/CardDisplay.tsx: Card Display Component
export const CardDisplay: React.FC<CardDisplayProps> = ({
  word,
  grade,
  variant = 'illust',
  handwritingMode = 'solid',
  className = 'w-48 h-48 rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-700 object-contain bg-white',
  showFallbackBadge = true
}) => {
  const [imgError, setImgError] = useState(false);
  const numberStr = getNumberValue(word.english);
  const illustUrl = resolveCardImage(word, variant === 'full' ? 'picture_word' : 'picture_only', grade) 
    || (word.card_image ? formatUrl(word.card_image) : '');

  // 1. Dynamic 4-Line Notebook Guide Mode (Upper Elementary)
  if (variant === 'full') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden bg-white dark:bg-slate-900 rounded-xl p-1 select-none">
        {/* Top 60%: High-Resolution Artwork or Number Badge */}
        <div className="w-full flex-[3] min-h-0 flex items-center justify-center p-1 overflow-hidden">
          {numberStr ? (
            renderNumberBadge()
          ) : illustUrl && !imgError ? (
            <img
              src={illustUrl}
              alt={word.english}
              onError={() => setImgError(true)}
              className="max-w-full max-h-full object-contain drop-shadow-xs"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
              <span className="text-3xl mb-1">📖</span>
              <span className="text-xs font-bold">{word.english}</span>
            </div>
          )}
        </div>

        {/* Bottom 40%: Mathematical 4-Line Notebook Guide */}
        <div className="w-full flex-[2] min-h-0 flex items-center justify-center px-1 pb-1">
          <FourLineNotebookGuide word={word.english} mode={handwritingMode} />
        </div>
      </div>
    );
  }

  // 2. Pure Illustration Variant
  return (
    <div className="relative w-full h-full flex items-center justify-center group">
      <img
        src={illustUrl}
        alt={word.english}
        onError={() => setImgError(true)}
        className={className}
        loading="lazy"
        decoding="async"
      />
      {showFallbackBadge && sourceBadge && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900/80 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {sourceBadge}
        </span>
      )}
    </div>
  );
};
```

---

### 2.5 Cinema Stage Front-Screen Card (`src/components/common/CinemaStageCard.tsx`)
Standardized classroom television card layout: **Top 70%** dedicated to unobstructed textbook artwork; **Bottom 30%** reserved for English typography and MEXT Japanese ruby text.

```tsx
// src/components/common/CinemaStageCard.tsx: Front-TV Stage Card
export const CinemaStageCard: React.FC<CinemaStageCardProps> = ({
  imageUrl,
  imageAlt = 'Card',
  english,
  ruby,
  kanji,
  hiragana,
  onAudioClick,
  badge,
  maxImageHeightClass = 'max-h-[min(56vh,540px)]',
  emptyPlaceholder,
  className = '',
  children
}) => {
  return (
    <div className={`w-full flex-1 flex flex-col items-center justify-between bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 md:p-6 min-h-0 relative ${className}`}>
      {badge && <div className="absolute top-3 left-4 z-20">{badge}</div>}

      {/* UPPER 70%: Artwork Stage */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            className={`w-full h-full ${maxImageHeightClass} object-contain filter drop-shadow-md transition-all select-none`}
            loading="eager"
          />
        ) : emptyPlaceholder ? (
          emptyPlaceholder
        ) : (
          <div className="text-slate-400 font-bold text-lg">No Image Available</div>
        )}
        {children}
      </div>

      {/* LOWER 30%: English Word & Japanese Ruby Translation */}
      {(english || kanji || hiragana || ruby) && (
        <div className="w-full flex flex-col items-center justify-center pt-2 md:pt-3 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            {english && (
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-wide truncate max-w-[85vw] md:max-w-3xl">
                {english}
              </h2>
            )}
            {onAudioClick && (
              <button type="button" onClick={onAudioClick} className="p-2 md:p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-amber-500 shadow-sm cursor-pointer">
                <Volume2 size={24} />
              </button>
            )}
          </div>
          {(ruby || kanji || hiragana) && (
            <div className="mt-0.5">
              <RubyText ruby={ruby} kanji={kanji} hiragana={hiragana} className="text-xl md:text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 3. Comprehensive Inventory of Games & Activities

Below is the complete audit of every game and activity in the Levi-Sensei codebase that consumes and displays Let's Try and Here We Go textbook images.

---

### Activity 1: Picture Dictionary (`PictureDictionaryBrowser.tsx`)
* **Stream**: Stream 🅲 (Student Desktop / Solo Explorer) & Stream 🅰️ (Classroom Projector)
* **Description**: Browsable lexicon of all vocabulary items filtered by unit, theme, or grade. Allows upper elementary students to toggle between pure artwork (`illust`) and 4-line notebook flashcards (`full`). Tapping any card opens a giant modal inspection canvas.

#### Code: Gallery Grid Cards & Modal Presentation
```tsx
// src/components/dictionary/PictureDictionaryBrowser.tsx: Lines 399-408
{/* Card Artwork: Mounted physical flashcard canvas */}
<div className="w-full aspect-[4/3] mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs dark:shadow-md dark:shadow-black/40 border border-slate-200/80 dark:border-slate-700 p-1.5 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-all">
  <CardDisplay
    word={word}
    grade={activeGrade}
    variant={isUpperGrade ? cardVariant : 'illust'}
    handwritingMode={handwritingMode}
    className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
  />
</div>

// Lines 754-763: Giant Modal Inspection Canvas
<div className="w-full h-full max-w-4xl max-h-[80vh] rounded-3xl bg-white dark:bg-slate-900 border-2 sm:border-4 border-slate-200 dark:border-slate-700/80 shadow-2xl p-4 sm:p-6 lg:p-8 flex items-center justify-center overflow-hidden transition-all">
  <CardDisplay
    word={selectedWord}
    grade={activeGrade}
    variant="illust"
    className="max-w-full max-h-full object-contain rounded-2xl"
  />
</div>
```

---

### Activity 2: Eigo Arena — Question Generator & Anti-Cheating Invariant
* **Files**: `src/games/quiz/questionGenerator.ts` & `src/games/quiz/core/quizEngine.ts`
* **Description**: Generates live 4-choice questions (`JA_TO_EN`, `EN_TO_JA`, `IMAGE_ONLY`, `AUDIO_ONLY`).
* **Critical Invariant**: In translation mode (`EN_TO_JA`), target illustrations **must be omitted** from choice cards so students demonstrate reading comprehension without picture crutches.

#### Code: Image Assignment & Anti-Cheating Invariant
```typescript
// src/games/quiz/questionGenerator.ts: Lines 14-27, 142-144
export function resolveWordImage(word: VocabularyItem, grade?: GradeLevel): string {
  let imagePath = word.primary_image || '';
  if (grade && word.media_by_grade && word.media_by_grade[grade]) {
    const gm = word.media_by_grade[grade]!;
    if (gm.card_image) {
      imagePath = gm.card_image;
    }
  }
  if (!imagePath) return '';
  if (imagePath.startsWith('http') || imagePath.startsWith('/')) return imagePath;
  if (imagePath.startsWith('cards/')) return `/${imagePath}`;
  return `/media/images/${imagePath}`;
}

// Option mapping inside generateQuizQuestions:
const options: QuizOption[] = choiceWords.map((w, optIdx) => ({
  id: w.id,
  english: w.english,
  ja_kanji: w.ja_kanji,
  ja_hiragana: w.ja_hiragana,
  ruby: (w as any).ruby,
  image: allowChoiceImages ? resolveWordImage(w, grade) : undefined,
  sound: w.sound_file || w.primary_audio,
  symbol: style.symbol
}));

// src/games/quiz/core/quizEngine.ts: Lines 959-974 (Anti-Cheating Guard)
const isEnPrompt = question.promptType === 'EN_TO_JA' || question.promptType === 'EN_WORD';
const hasPromptImage = Boolean(question.promptImage) || question.promptType === 'IMAGE_ONLY';

// Cheating prevention: Omit target artwork when prompt is in English
const showOptionImage = !isEnPrompt && !hasPromptImage && Boolean(option.image);
```

---

### Activity 3: Eigo Arena — Host Front TV Question & Reveal
* **Files**: `src/games/quiz/host/QuizHostQuestion.tsx` & `src/games/quiz/host/QuizHostReveal.tsx`
* **Description**: Displays the active question on the classroom television with giant prompt artwork container and 4 high-contrast choice cards.

#### Code: TV Stage Artwork Container & Reveal
```tsx
// src/games/quiz/host/QuizHostQuestion.tsx: Lines 552-559
{/* Center Prompt Artwork Box */}
<div className="h-52 sm:h-64 md:h-76 aspect-[4/3] max-w-md sm:max-w-lg mx-auto flex items-center justify-center p-2.5 sm:p-3 rounded-3xl bg-[#faf8f5] dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-700 shadow-2xl">
  <img
    src={question.promptImage}
    alt={question.promptText}
    className="w-full h-full object-contain drop-shadow-md rounded-xl"
  />
</div>

// Lines 664-667: 4-Choice Cards Artwork Box (Left 40% of Choice Card)
<div className="w-[38%] h-[85%] rounded-2xl bg-[#faf8f5] p-1.5 shadow-md shrink-0 flex items-center justify-center border-2 border-slate-900/40">
  <img src={opt.image} alt={displayText} className="w-full h-full object-contain rounded-xl" />
</div>

// src/games/quiz/host/QuizHostReveal.tsx: Lines 284-289 (Celebration Screen)
<div className="h-full aspect-[4/3] max-w-sm sm:max-w-md mx-auto flex items-center justify-center p-2 rounded-2xl bg-[#faf8f5] dark:bg-slate-800 border-2 border-slate-900/30 shadow-md">
  <img
    src={correctOption?.image || question.promptImage}
    alt={question.targetWordEnglish}
    className="w-full h-full object-contain rounded-xl drop-shadow-md"
  />
</div>
```

---

### Activity 4: Eigo Arena — Student iPad Buzz-In & Mirrored Modes
* **File**: `src/games/quiz/student/QuizStudentQuestion.tsx`
* **Description**: Student iPad controller. In buzzer mode, displays 4 large shape buttons (▲◆●■). In mirrored mode, renders cards with anti-cheating guards.

#### Code: Student iPad Question Presentation
```tsx
// src/games/quiz/student/QuizStudentQuestion.tsx: Lines 226-231 (Prompt Thumbnail)
{question.promptImage && (
  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center">
    <img
      src={question.promptImage}
      alt="Question Prompt"
      className="w-full h-full object-contain rounded-xl"
    />
  </div>
)}

// Lines 377-384: Student Choice Card with Anti-Cheating Guard
{!isEnPrompt && !question.promptImage && question.promptType !== 'IMAGE_ONLY' && option.image && (
  <div className="bg-white rounded-xl p-1 shadow-md shrink-0 flex items-center justify-center">
    <img
      src={option.image}
      alt={option.english}
      className="w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-lg"
    />
  </div>
)}
```

---

### Activity 5: Eigo Arena — Student iPad Sprint & Tug-of-War Modes
* **Files**: `src/games/quiz/student/QuizStudentSprint.tsx` & `src/games/quiz/student/QuizStudentTugOfWar.tsx`
* **Description**: Fast-paced competitive multiplayer modes where correct answers accelerate racing karts or pull the team battle rope.

#### Code: Sprint & Tug-of-War Question Display
```tsx
// src/games/quiz/student/QuizStudentSprint.tsx: Lines 629-635
{currentQuestion.promptImage && (
  <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-slate-50 dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center">
    <img
      src={currentQuestion.promptImage}
      alt="Prompt"
      className="w-full h-full object-contain rounded-xl"
    />
  </div>
)}

// src/games/quiz/student/QuizStudentTugOfWar.tsx: Lines 307-313
{/* Target Image if available */}
{currentQuestion.promptImage && (
  <div className="h-32 sm:h-44 md:h-52 max-h-[40vh] w-auto aspect-square rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 p-2 mb-2 flex items-center justify-center">
    <img
      src={currentQuestion.promptImage}
      alt={currentQuestion.targetWordEnglish}
      className="max-h-full max-w-full object-contain pointer-events-none"
    />
  </div>
)}
```

---

### Activity 6: Speed Flashcard Race (`FlashcardStage.tsx`)
* **Stream**: Stream 🅰️ (Front TV / Projector)
* **Description**: High-speed choral pronunciation sprint (1.5s ➔ 1.0s ➔ 0.6s). Resolves strictly to pure illustration artwork (`picture_only`) so baked-in English words are stripped, forcing oral recall.

#### Code: Pure Full-Height Artwork & Flash Animation
```tsx
// src/games/speed_flash/FlashcardStage.tsx: Lines 30-33, 107-117
// In Speed Flash, always resolve to pure illustration artwork ('picture_only')
// so textbook cards NEVER have duplicate baked-in English words
const imageUrl = tier === 'word_only' ? null : resolveCardImage(card, 'picture_only', grade);

// Render inside stage:
<div className="w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4">
  {imageUrl && !imgError ? (
    <img
      src={imageUrl}
      alt={card.english}
      onError={() => setImgError(true)}
      className="w-full h-full max-h-full max-w-full object-contain drop-shadow-2xl transition-all"
      loading="eager"
    />
  ) : (
    <div className="text-center p-4">
      <span className="text-8xl block mb-2">📖</span>
      <span className="text-4xl font-black text-slate-900 dark:text-white">{card.english}</span>
    </div>
  )}
</div>
```

---

### Activity 7: Keyword Snatch / Grab Game (`KeywordGame.tsx`)
* **Stream**: Stream 🅰️ (Front TV / Teacher Desk)
* **Description**: Whole-class reaction game. Students sit in pairs with an eraser between them, chanting cycling flashcards until the designated secret "Keyword" appears, triggering an instant snatch reflex.

#### Code: Thumbnail, Announcement, Cycling Stage & Freeze Frame
```tsx
// src/games/keyword/KeywordGame.tsx: 4-Tier Image Display

// 1. Left Tower Secret Target Thumbnail (Lines 398-404)
{resolveCardImage(keywordItem, 'picture_only', activeGrade) && (
  <img
    src={resolveCardImage(keywordItem, 'picture_only', activeGrade) || ''}
    alt={keywordItem.english}
    className="w-12 h-12 object-contain bg-white rounded-lg p-0.5 shrink-0"
  />
)}

// 2. Keyword Target Announcement Modal (Lines 628-633)
<img
  src={resolveCardImage(keywordItem, 'picture_only', activeGrade) || ''}
  alt={keywordItem.english}
  className="max-h-full max-w-full object-contain filter drop-shadow-xl transition-all"
/>

// 3. Active Cycling Cinema Stage Card (Lines 722-727)
<img
  src={resolveCardImage(currentDisplayItem, 'picture_only', activeGrade) || ''}
  alt={currentDisplayItem.english}
  className="max-h-full max-w-full object-contain filter drop-shadow-2xl transition-all"
/>

// 4. "SNATCH! / GRAB!" Slam Freeze Frame (Lines 783-788)
<img
  src={resolveCardImage(keywordItem, 'picture_only', activeGrade) || ''}
  alt={keywordItem.english}
  className="max-h-full max-w-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
/>
```

---

### Activity 8: Concentration / Memory Match (`MemoryCard3D.tsx` & `ChoralMatchModal.tsx`)
* **Stream**: Stream 🅰️ (Classroom TV)
* **Description**: Pairs of 3D memory cards flipped on the blackboard screen. Supports card pairing types (Picture ↔ Picture, Picture ↔ Word, Listening Audio ↔ Picture). Matched pairs trigger a dramatic choral speaking popup.

#### Code: 3D Flip Card & Choral Match Modal
```tsx
// src/games/concentration/MemoryCard3D.tsx: Lines 44, 226-234
const imageUrl = resolveCardImage(card.card, card.tier, grade);

// Front Face Artwork:
{imageUrl && !imgError ? (
  <img
    src={imageUrl}
    alt={card.card.english}
    onError={() => setImgError(true)}
    className="w-full h-full max-h-[70px] sm:max-h-[90px] md:max-h-[110px] object-contain drop-shadow-md"
  />
) : (
  <div className="text-center p-2">
    <span className="text-2xl sm:text-3xl block mb-1">📖</span>
    <span className="text-xs sm:text-sm font-black">{card.card.english}</span>
  </div>
)}

// src/games/concentration/ChoralMatchModal.tsx: Lines 26, 62-68
const imageUrl = resolveCardImage(card, 'picture_only', grade);

<div className="w-44 h-44 sm:w-56 sm:h-56 mx-auto rounded-3xl bg-white dark:bg-slate-700 p-4 border-4 border-amber-300 dark:border-amber-500 shadow-inner flex items-center justify-center">
  {imageUrl && (
    <img
      src={imageUrl}
      alt={card.english}
      className="w-full h-full object-contain drop-shadow-md"
    />
  )}
</div>
```

---

### Activity 9: Live Classroom Bingo & Printable Bingo (`LiveBingoGame.tsx` & `BingoPrintModal.tsx`)
* **Stream**: Stream 🅰️ (Front TV) & Stream 🅲 (A4 Paper Printouts)
* **Description**: Electronic Bingo Machine with 120ms hidden image preloading behind curtain drop animations, accompanied by a dynamic PDF worksheet engine for 3x3 and 4x4 student cards.

#### Code: TV Ball Reel, 120ms Preloader & Print Sheet Generator
```tsx
// src/games/bingo/LiveBingoGame.tsx: 120ms In-Memory Preloader (Lines 120-125)
const nextImgUrl = resolveCardImage(nextWord, 'picture_only', activeGrade);
if (nextImgUrl) {
  const preloadImg = new Image();
  preloadImg.src = nextImgUrl;
}

// History Scroll Thumbnail (Lines 370-377)
<div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-800 flex items-center justify-center p-1 overflow-hidden shrink-0">
  <img src={imgUrl} alt={item.english} className="max-h-full max-w-full object-contain" />
</div>

// Main Drawn Card Stage (Lines 443-450)
<img
  key={currentWord.id || currentWord.english}
  src={cardImage}
  alt={currentWord.english}
  className="w-full h-full max-h-[min(56vh,540px)] object-contain filter drop-shadow-md transition-all"
/>

// src/games/bingo/BingoPrintModal.tsx: Lines 246-250 (Exact Millimeter Print Layout)
// .cell img {
//   max-height: ${displayMode === 'picture_only' ? '30mm' : '23mm'};
//   max-width: 95%;
//   object-fit: contain;
// }
```

---

### Activity 10: What's Missing? (`MissingCardSlot.tsx` & `WhatsMissingGame.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Cards appear in an adaptive grid (4, 6, 8, or 12 cards). The stage curtain drops, one card vanishes, and students shout the missing vocabulary item in English.

#### Code: Grid Slot & Spotlight Reveal
```tsx
// src/games/missing/MissingCardSlot.tsx: Lines 32, 107, 137-143, 208-215
const imageUrl = resolveCardImage(slot.card, tier, grade);
const revealedImgUrl = resolveCardImage(slot.card, 'picture_only', grade) || imageUrl;

// 1. REVEALED MISSING CARD SPOTLIGHT
<div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1">
  {revealedImgUrl && !imgError && (
    <img
      src={revealedImgUrl}
      alt={slot.card.english}
      onError={() => setImgError(true)}
      className="max-h-full max-w-full w-auto h-auto object-contain drop-shadow-md transition-transform group-hover:scale-105"
    />
  )}
</div>

// 2. ACTIVE GRID TRAY CARD
<div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1 sm:p-2">
  {imageUrl && !imgError && (
    <img
      src={imageUrl}
      alt={slot.card.english}
      onError={() => setImgError(true)}
      className="max-h-full max-w-full w-auto h-auto object-contain transition-transform group-hover:scale-105 drop-shadow-sm"
      loading="lazy"
    />
  )}
</div>
```

---

### Activity 11: Pixel Reveal Studio (`PixelStage.tsx` & `PixelRevealGame.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Mystery picture guessing game featuring 4 visual effect modes:
  1. **Mosaic**: Multi-stage CSS Gaussian blur (`blur(16px)` ➔ `blur(10px)` ➔ `blur(4px)` ➔ `none`).
  2. **Zoom**: Optical zoom out (`scale(3.4)` ➔ `scale(2.2)` ➔ `scale(1.4)` ➔ `scale(1)`).
  3. **Silhouette**: Pure black mask (`brightness(0)` with ambient glow ➔ `brightness(0.35)` ➔ `none`).
  4. **Tiles**: 2x2, 3x3, or 4x4 peelable numbered panels overlaying the artwork.

#### Code: Dynamic CSS Filtering & Peelable Tile Overlay
```tsx
// src/games/pixel_reveal/PixelStage.tsx: Lines 40, 50-67, 98-112
const imageUrl = resolveCardImage(card, grade);

// Dynamic filter computation
let stageFilter = 'none';
let stageTransform = 'scale(1)';

if (!isRevealed) {
  if (visualMode === 'MOSAIC') {
    stageFilter = mosaicStage === 0 ? 'blur(16px)' : mosaicStage === 1 ? 'blur(10px)' : mosaicStage === 2 ? 'blur(4px)' : 'none';
    stageTransform = 'scale(1.15)'; // Prevents blurred edges from leaking
  } else if (visualMode === 'ZOOM') {
    stageTransform = zoomStage === 0 ? 'scale(3.4)' : zoomStage === 1 ? 'scale(2.2)' : zoomStage === 2 ? 'scale(1.4)' : 'scale(1)';
  } else if (visualMode === 'SILHOUETTE') {
    stageFilter = silhouetteStage === 0
      ? 'brightness(0) drop-shadow(0 0 16px rgba(245, 158, 11, 0.4))'
      : silhouetteStage === 1
      ? 'brightness(0.35) saturate(220%)'
      : 'none';
  }
}

// Artwork Viewport:
<div
  className="w-full h-full p-4 flex flex-col items-center justify-center transition-all duration-500 ease-out overflow-hidden"
  style={{ filter: stageFilter, transform: stageTransform, transformOrigin: 'center center' }}
>
  <img
    src={imageUrl}
    alt={card.english}
    className="max-h-[170px] sm:max-h-[210px] md:max-h-[250px] lg:max-h-[280px] w-auto object-contain drop-shadow-xl"
  />
</div>
```

---

### Activity 12: Three-Hint Master (`MysteryCardVisual.tsx` & `ChoiceTray.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Deductive listening game. Teacher reads 3 clues (Category, Feature, First Letter). The card sits in deep silhouette with an ambient indigo glow until solved, accompanied by a 4-choice response tray.

#### Code: High-Contrast Silhouette & Choice Tray
```tsx
// src/games/three_hints/MysteryCardVisual.tsx: Lines 114-124 (Silhouette Clue Viewport)
<div className="relative flex items-center justify-center">
  <img
    src={imageUrl}
    alt="Mystery Clue Silhouette"
    className="max-h-[140px] sm:max-h-[180px] md:max-h-[220px] w-auto object-contain filter brightness-0 contrast-200 opacity-90 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-all duration-500 group-hover:scale-105"
  />
  {/* Ambient backlight glow */}
  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl -z-10 rounded-full" />
</div>

// src/games/three_hints/ChoiceTray.tsx: Lines 68-74 (4-Choice Elimination Tray)
<div className="flex-1 flex items-center justify-center py-1">
  <img
    src={imageUrl}
    alt={choice.word.english}
    className="max-h-[65px] sm:max-h-[85px] w-auto object-contain drop-shadow-sm"
  />
</div>
```

---

### Activity 13: Timebomb / Hot Potato (`TimebombGame.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Tension-filled potato passing game. A bomb fuse sizzles down while cycling textbook cards. The student holding the soft ball when the bomb explodes sits down.

#### Code: Cinema Card Ticking Stage
```tsx
// src/games/timebomb/TimebombGame.tsx: Lines 766, 1234-1240
const cardImage = useMemo(() => {
  if (!currentWord) return null;
  return resolveCardImage(currentWord, 'picture_only', activeGrade);
}, [currentWord, activeGrade]);

// Render inside stage:
<div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden">
  <img
    src={cardImage}
    alt={currentWord?.english || 'Card'}
    className="w-full h-full max-h-[min(56vh,540px)] object-contain filter drop-shadow-md transition-all"
  />
</div>
```

---

### Activity 14: Challenge 60s Speaking Sprint (`SprintStage.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: 60-second whole-class choral speaking drill with microphone voice energy meter. When students shout loudly in English, the voice meter boosts and the card frame glows with amber flames.

#### Code: Voice Meter Glow & Zoom Animation
```tsx
// src/games/challenge_60s/SprintStage.tsx: Lines 22, 55-62
const imageUrl = resolveCardImage(card, 'picture_only', grade);

<div className="flex-1 w-full flex items-center justify-center min-h-0 py-2 overflow-hidden">
  <img
    key={card.id}
    src={imageUrl}
    alt={card.english}
    className="w-full h-full max-h-[min(50vh,460px)] object-contain drop-shadow-md rounded-2xl animate-in zoom-in-95 duration-100"
  />
</div>
```

---

### Activity 15: Katakana Breaker Rhythm Stage (`KatakanaBreakerStage.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: 16-beat musical chant training native pronunciation over loanwords ("トマトじゃなくて tomato!"). On measure 4 (choral shout), the artwork pulses and scales up dramatically.

#### Code: Rhythmic Artwork Scale & Drop Shadow
```tsx
// src/games/katakana_breaker/KatakanaBreakerStage.tsx: Lines 24, 94-102
const imageUrl = resolveCardImage(card, 'picture_only', grade);

<div className="relative z-10 flex flex-col items-center justify-center h-full max-h-[min(52vh,460px)]">
  <img
    src={imageUrl}
    alt={card.english}
    className={`w-full h-full object-contain drop-shadow-xl rounded-2xl transition-all duration-150 ${
      isChoralShout ? 'scale-110 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]' : ''
    }`}
  />
</div>
```

---

### Activity 16: Criss Cross Seating Warm-Up (`CrissCrossPromptModal.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Seating grid warm-up. Teacher calls a row or column of desks. Standing students race to answer the target card.

#### Code: Modal Card Presentation
```tsx
// src/games/criss_cross/CrissCrossPromptModal.tsx: Lines 28, 57-63
const imageUrl = resolveCardImage(card, 'picture_only', grade);

<div className="w-52 h-44 sm:w-64 sm:h-52 rounded-2xl bg-white border-2 border-slate-200 dark:border-slate-700 p-3 shadow-inner flex items-center justify-center my-1.5">
  <img
    src={imageUrl}
    alt={card.english}
    className="max-h-full max-w-full object-contain drop-shadow-md"
  />
</div>
```

---

### Activity 17: Mystery Pencil Case (`MysteryPencilCaseGame.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Target structure training ("Do you have a...?"). Unique for dynamically switching between **singular** (`dic_4_card_pen_2544_1_c.webp`) and **plural** (`dic_4_card_pen_2544_plural_c.webp`) textbook artwork based on quantity toggles.

#### Code: Singular vs Plural Asset Switching
```tsx
// src/games/mystery_pencil_case/constants.ts: Lines 14-15, 342-346
export function resolveItemImageSrc(imageName: string): string {
  if (!imageName) return '';
  if (imageName.startsWith('http://') || imageName.startsWith('https://') || imageName.startsWith('/')) {
    return imageName;
  }
  return `/media/images/${imageName}`;
}

// src/games/mystery_pencil_case/MysteryPencilCaseGame.tsx: Lines 908-912
<img
  src={resolveItemImageSrc(toggles.hasQuantity ? targetItem.pluralImg : targetItem.singularImg)}
  alt={targetItem.english}
  className="max-h-full max-w-full object-contain"
/>
```

---

### Activity 18: 3D Suzuka Grand Prix Student Deck (`SuzukaStudentDeck.tsx`)
* **Stream**: Stream 🅱️ (Student iPads)
* **Description**: Student cockpit interface for the 3D Formula 1 racing game. Features a dashboard HUD prompt thumbnail with click-to-enlarge modal and right-pinned choice illustrations.

#### Code: Dashboard HUD Thumbnail, Modal & Right-Pinned Choice
```tsx
// src/games/suzuka_grand_prix/SuzukaStudentDeck.tsx: Lines 271-277 (Cockpit HUD)
<div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-2xl bg-slate-950 p-1 shadow-md border border-slate-700 flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 transition-transform cursor-zoom-in group">
  <img
    src={question.promptImage}
    alt={question.targetWordJa || 'Vocabulary Prompt'}
    referrerPolicy="no-referrer"
    className="w-full h-full object-contain pointer-events-none"
  />
</div>

// Lines 407-413: Click-to-Enlarge Modal
<div className="w-52 h-52 sm:w-64 sm:h-64 bg-slate-950 rounded-2xl p-3 flex items-center justify-center border border-slate-700">
  <img src={question.promptImage} alt="Prompt" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
</div>

// Lines 588-594: Right-Pinned Answer Option Illustration
{option.image && (
  <img
    src={option.image}
    alt=""
    referrerPolicy="no-referrer"
    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-[80%] w-auto max-w-[26%] object-contain pointer-events-none select-none z-10"
  />
)}
```

---

### Activity 19: Typhoon Team Battle (`TyphoonQuestionModal.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Grid board strategy game. Teams pick coordinate tiles (A1, B3) containing hidden typhoons, points, or question cards.

#### Code: Question Modal Card
```tsx
// src/games/typhoon/TyphoonQuestionModal.tsx: Lines 29, 58-64
const imageUrl = resolveCardImage(card, 'picture_only', grade);

<div className="w-56 h-48 sm:w-72 sm:h-56 rounded-2xl bg-white border-2 border-slate-200 dark:border-slate-700 p-3 shadow-inner flex items-center justify-center my-2">
  <img
    src={imageUrl}
    alt={card.english}
    className="max-h-full max-w-full object-contain drop-shadow-md"
  />
</div>
```

---

### Activity 20: 3D Town Navigator Inspector (`TownModelInspector.tsx`)
* **Stream**: Stream 🅰️ (Front TV / Explorer)
* **Description**: 3D architectural viewer for Grade 5 Unit 19 ("Directions"). Pairs a rotating WebGL 3D building (hospital, library, station) side-by-side with its authentic *Here We Go* textbook card illustration.

#### Code: 3D Model Side-by-Side Card Overlay
```tsx
// src/games/town_navigator/TownModelInspector.tsx: Lines 2653-2666
<div className="w-full h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
  {currentDef && currentDef.illustWebp && !cardImgFailed ? (
    <img
      src={currentDef.illustWebp}
      alt={currentDef.nameEn}
      className="w-full h-full object-contain p-1"
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        if (currentDef.illustPng && !img.src.endsWith(currentDef.illustPng)) {
          img.src = currentDef.illustPng; // Automatic fallback from WebP to PNG
        } else {
          setCardImgFailed(true);
        }
      }}
    />
  ) : (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${currentDef.accentColor} text-white p-3 text-center`}>
      <span className="text-sm font-black">{currentDef.nameEn}</span>
    </div>
  )}
</div>
```

---

### Activity 21: Alphabet Comparison Studio (`AlphabetComparisonStudio.tsx`)
* **Stream**: Stream 🅰️ (Front TV)
* **Description**: Side-by-side comparison of uppercase vs lowercase letters using authentic *Let's Try 1 & 2* single-baseline guide alphabet cards (`dic_3_card_*` vs `dic_4_card_*`).

#### Code: Sliced Textbook Alphabet SVGs
```tsx
// src/components/alphabet/AlphabetComparisonStudio.tsx: Lines 89-95, 432-437, 470-475
const upperImageSrc = upperWord
  ? resolveCardImage(upperWord, 'picture_only', 'ES_G3')
  : `/media/images/dic_3_card_${lowerChar}_${2068 + i}_1_c.svg`;

const lowerImageSrc = lowerWord
  ? resolveCardImage(lowerWord, 'picture_only', 'ES_G4')
  : `/media/images/dic_4_card_${lowerChar}_${2551 + i}_1_c.svg`;

// Side-by-Side Stage Display:
<img
  src={currentPair.upperImageSrc}
  alt={currentPair.char}
  className="max-w-full max-h-[75vh] object-contain filter drop-shadow-lg group-hover:scale-[1.02] transition-transform select-none"
/>
<img
  src={currentPair.lowerImageSrc}
  alt={currentPair.charLower}
  className="max-w-full max-h-[75vh] object-contain filter drop-shadow-lg group-hover:scale-[1.02] transition-transform select-none"
/>
```

---

### Activity 22: Word Filter & Daily Routine Modals (`WordFilterModal.tsx` & `DailyRoutineModal.tsx`)
* **Stream**: Stream 🅲 (Curriculum Selection & Daily Warm-up)
* **Description**: Teacher filtering modal to select active lesson words, and morning greeting modal ("How are you?") resolving feelings illustrations between *Let's Try* and *Here We Go*.

#### Code: Word Filter Grid & Daily Routine Resolver
```tsx
// src/components/shell/WordFilterModal.tsx: Lines 706, 755-760
const imageSrc = resolveCardImage(word, 'picture_only', activeGrade);

<img
  src={imageSrc}
  alt={word.english}
  className="max-h-full max-w-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
  loading="lazy"
/>

// src/components/common/DailyRoutineModal.tsx: Lines 51-56, 1500-1505
export function getFeelingCardImage(item: FeelingItem, pref: TextbookPreference): string {
  if (pref === 'LETSTRY') {
    return item.cardImageLT || item.cardImageHWG || item.cardImage || '';
  }
  return item.cardImageHWG || item.cardImageLT || item.cardImage || '';
}

<img
  src={formatAssetUrl(getFeelingCardImage(word, textbookPref))}
  alt={word.en}
  className="w-full h-full object-contain"
/>
```

---

## 4. Cross-Cutting Architectural Patterns & Best Practices

| Activity / Component | Primary Asset Tier | URL Resolution Engine | Key CSS & Container Classes | Anti-Cheating or Fallback Guard |
| :--- | :--- | :--- | :--- | :--- |
| **Picture Dictionary** | `picture_only` / `picture_word` | `resolveCardImage` | `aspect-[4/3] max-w-full max-h-full object-contain` | Toggles dynamic 4-line notebook guide for G5 & G6 |
| **Eigo Arena (TV Host)** | `picture_only` | `resolveWordImage` | `h-52 sm:h-64 md:h-76 aspect-[4/3] bg-[#faf8f5] shadow-2xl` | 2.5x larger box for back-row TV visibility |
| **Eigo Arena (Student iPad)** | `picture_only` | `resolveWordImage` | `w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-lg` | `!isEnPrompt && !hasPromptImage && Boolean(option.image)` |
| **Speed Flash Race** | `picture_only` | `resolveCardImage` | `w-full h-full max-h-full max-w-full drop-shadow-2xl` | Strips `_1_ce` baked English words |
| **Keyword Grab** | `picture_only` | `resolveCardImage` | `max-h-full max-w-full drop-shadow-[0_15px_30px_...]` | 4 distinct display sizes (thumbnail to freeze frame) |
| **Concentration** | `picture_only` / `picture_word` | `resolveCardImage` | `max-h-[70px] sm:max-h-[90px] md:max-h-[110px]` | Paired with CSS 3D card flip transformations |
| **Classroom Bingo (TV)** | `picture_only` | `resolveCardImage` | `max-h-[min(56vh,540px)] object-contain drop-shadow-md` | 120ms hidden in-memory preloading (`new Image()`) |
| **Bingo Print Sheets** | `picture_only` / `picture_word` | `resolveCardImage` | `max-height: 30mm; max-width: 95%; object-fit: contain` | Exact millimeter sizing for A4 paper printouts |
| **What's Missing?** | `picture_only` | `resolveCardImage` | `max-h-full max-w-full object-contain drop-shadow-md` | Spotlight celebration ring and scale-102 pulse |
| **Pixel Reveal** | `picture_only` | `resolveCardImage` | `max-h-[170px] sm:max-h-[250px] object-contain` | CSS `blur()`, `scale()`, `brightness()`, and tile grid |
| **Three-Hint Master** | `picture_only` | `resolveCardImage` | `brightness-0 contrast-200 drop-shadow-[0_10px_20px_...]` | Silhouette mask with ambient backlight glow |
| **Timebomb** | `picture_only` | `resolveCardImage` | `max-h-[min(56vh,540px)] object-contain drop-shadow-md` | Sizzling countdown fuse and red border pulses |
| **Challenge 60s** | `picture_only` | `resolveCardImage` | `max-h-[min(50vh,460px)] animate-in zoom-in-95` | Border ring linked to microphone volume |
| **Katakana Breaker** | `picture_only` | `resolveCardImage` | `scale-110 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]` | Measure 4 rhythmic pulse on choral shout |
| **Mystery Pencil Case** | `picture_only` | `resolveItemImageSrc` | `max-h-full max-w-full object-contain` | Dynamically swaps `singularImg` and `pluralImg` |
| **Suzuka Grand Prix** | `picture_only` | `promptImage` / `option.image` | `w-20 h-20` (HUD), `h-[80%] max-w-[26%]` (Choice) | Click-to-enlarge modal on student iPads |
| **Town Inspector** | `picture_only` | Direct textbook WebP | `w-full h-36 object-contain` | WebP to PNG fallback for 3D building cards |
| **Alphabet Studio** | `picture_only` | `resolveCardImage` / SVG | `max-w-full max-h-[75vh] object-contain drop-shadow-lg` | Authentic textbook single-baseline guide cards |
