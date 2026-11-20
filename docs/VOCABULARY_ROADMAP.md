# Vocabulary Architecture Roadmap (Future Tier 3 Evolution)

> **Status**: Deferred intentionally while Elementary G1–G6 is the active classroom scope.  
> **Rule**: Do **not** execute this refactor until you are ready to import JHS, High School, or Adult ESL wordlists.

## Current Baseline (Post–Tier 1 & Tier 2 Audit Cleanup)
- **Canonical Source of Truth**: `master_vocabulary_data/master_vocabulary.json` (1,093 entries; `word_0001`–`word_1093`).
- **Immutable ID Contract**: Existing `word_XXXX` IDs are persisted in Firebase RTDB (`troubleWords`, session analytics) and must **never** be renumbered or deleted.
- **Runtime Payloads (`public/data/`)**:
  - `master_vocabulary.json`: minified core vocabulary (~972 KB raw)
  - `vocabulary_clues.json`: lazy-loaded dialogues (~150–250 KB raw)
  - `banks/three_hints_bank.json`: lazy-loaded bilingual 3-hint pools
  - `vocabulary_manifest.json`: `no-cache` version & hash index

---

## Tier 3 Milestones (Trigger: Adding JHS / High School / Adult ESL)

When total vocabulary grows past ~2,500–3,000 words across multiple school levels or textbooks, evolve the build pipeline (`scripts/build_vocabulary_pipeline.cjs`) and loader (`src/context/VocabularyContext.tsx`) as follows:

1. **Lazy Curriculum Packs (`public/data/packs/`)**:
   - Split the runtime output into grade/level packs indexed by `vocabulary_manifest.json`:
     - `packs/es_g1_g6.json` (~865 core Elementary words)
     - `packs/world_flags.json` (228 `"expanded"` World Flags — opt-in)
     - `packs/jhs_g1_g3.json` (JHS vocabulary)
     - `packs/hs_adult.json` (High School / EIKEN / CEFR / Adult ESL)
   - Keep `VocabularyContext` loading only the active level's pack(s) so G3 iPads never download or parse 5,000+ secondary/adult entries.

2. **Separate *Lexical Entry* from *Curriculum Appearances***:
   - Replace single-unit `media_by_grade[grade].unit` with an `appearances` array:
     ```ts
     appearances?: Array<{
       curriculum: 'lets_try_1' | 'lets_try_2' | 'hwg_5' | 'hwg_6' | 'new_horizon_1' | 'eiken' | 'cefr';
       grade: GradeLevel;
       unit: string;
       card_image?: string;
       card_full?: string;
     }>;
     ```
   - Allows one word (`word_XXXX`) to appear in **multiple units in the same grade** and across multiple textbooks (*Here We Go*, *New Horizon*, *Sunshine*, *New Crown*) without duplicating entries.

3. **Secondary & Adult ESL Lexical Extensions (All Optional)**:
   - `cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1'`
   - `eiken?: '5' | '4' | '3' | 'pre2' | '2' | 'pre1' | '1'`
   - `inflections?: { past?: string; pastParticiple?: string; plural?: string; comparative?: string; superlative?: string }`
   - `ipa?: string` / `phonics_chunks?: string[]`
   - `register?: 'casual' | 'neutral' | 'formal' | 'academic'`
   - `collocations?: string[]` and `confusables?: string[]` (for smart MCQ distractors)

4. **Decouple Elementary 16 Categories into General `domains`**:
   - Keep the 16 `VALID_CATEGORIES` for the Elementary UI, while allowing JHS/HS/Adult entries to use broader semantic `domains` (`business`, `science`, `idiom`, `phrasal_verb`, `grammar_function`, etc.).
