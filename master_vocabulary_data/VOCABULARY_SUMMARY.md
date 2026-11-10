# Master Vocabulary Database Summary (Boosted & Modular Turn-Key Edition)

- **Total Canonical Vocabulary Words:** 857
- **Audio Files Verified:** 629 native MP3s (73.4%)
- **Flashcard Images Verified:** 775 PNGs (90.4%) — 549 MEXT Picture Dictionary + 226 newly sliced Here We Go cards
- **Japanese Translations & Furigana:** 857 / 857 (100.0%)
- **Ruby Furigana Annotations:** 857 (100.0% structured & HTML ready)
- **Parts of Speech Tagged:** 857 (100.0%)

## Grade Breakdown

- **ES_G1**: 46 words
- **ES_G2**: 51 words
- **ES_G3**: 266 words
- **ES_G4**: 184 words
- **ES_G5**: 383 words
- **ES_G6**: 393 words

## Thematic Category Breakdown

- **01_action** (Actions & Verbs): 105 words
- **02_state** (States, Feelings & Adjectives): 66 words
- **03_fooddrink** (Food & Drinks): 96 words
- **04_number** (Numbers & Counting): 40 words
- **05_schoollife** (School Life & Stationery): 78 words
- **06_facility** (Town, Places & Occupations): 97 words
- **07_dailylife** (Daily Life, Routines & Objects): 45 words
- **08_sports** (Sports & Activities): 30 words
- **09_color_shape** (Colors & Shapes): 21 words
- **10_calendar_time** (Calendar, Days & Time): 45 words
- **11_animals** (Animals & Pets): 64 words
- **12_nature** (Nature & Weather): 29 words
- **13_position** (Positions, Directions & Prepositions): 19 words
- **14_body_family** (Body Parts & People): 39 words
- **15_festalday** (Holidays, Events & Games): 31 words
- **16_alphabet** (Alphabet & Phonics): 52 words

## Pedagogical & Game Engine Features (Option 2 Turn-Key Boost)

- **Target Q&A Sentences & Dialogues:** 857 / 857 (100.0% MEXT communicative dialogues)
- **Three-Hint Quiz Clues:** 857 / 857 (100.0% with category, feature, and phonics hints)
- **Game Engine Puzzle Attributes:** 100% indexed (`letter_count`, `syllable_count`, `first_letter`, `is_compound`, `phonics_initial`)
- **Difficulty Tiers:** Tier 1 (Starter): 203 words, Tier 2 (Core): 208 words, Tier 3 (Advanced): 446 words
- **Lemmatization & Media Inheritance:** Plural words inherit high-res cards and native audio from their singular base word
- **Unified Media Accessors:** `primary_image` and `primary_audio` providing direct zero-fallback URLs for UI components

## Modular Files Created

- `master_vocabulary.json`: Authoritative canonical master database with game engine & pedagogical metadata
- `vocabulary_index.json`: Fast multi-index dictionary (`byId`, `byGrade`, `byCategory`, `byTag`, `byTheme`, `byDifficultyTier`, `byFirstLetter`)
- `vocabulary_es_g1.json` through `vocabulary_es_g6.json`: Elementary grade subsets
- `categories/*.json`: 16 independent category JSON datasets for dynamic imports
- `types.ts`: Comprehensive TypeScript interfaces for React + Vite games
- `lookup_helpers.js`: Zero-dependency query, theme filtering, difficulty filtering, puzzle filters, ruby rendering, and asset resolvers

