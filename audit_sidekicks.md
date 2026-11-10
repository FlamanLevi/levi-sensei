# Sidekick Activities Audit: Deep-Dive on All Non-Arena Games & Tools

This audit examines the 8 live "sidekick" activities and classroom tools supporting Eigo Arena:
1. **What's Missing?** (`src/games/missing/`)
2. **Concentration / Memory Match** (`src/games/concentration/`)
3. **Speed Flashcard Race** (`src/games/speed_flash/`)
4. **Pixel Reveal** (`src/games/pixel_reveal/`)
5. **Three-Hint Master** (`src/games/three_hints/`)
6. **Keyword Snatch Game** (`src/games/keyword/`)
7. **Live Classroom Bingo** (`src/games/bingo/`)
8. **Hot Potato & Pop Relay** (`src/games/timebomb/`)
9. **Classroom Utilities:** `DiceModal` / `ThreeDiceStage`, `StudentDrawModal`, and `PictureDictionaryBrowser`

---

## Sidekick Audit Matrix

| Category | Finding Summary | Severity |
| :--- | :--- | :---: |
| **React Anti-Pattern** | Audio side-effects invoked inside pure `setState(prev => ...)` updaters (`speed_flash`, `timebomb`) | 🔴 Critical |
| **Engine Sound Defect** | English Web Speech synthesizer attempts to pronounce Japanese kanji in `three_hints` | 🔴 Critical |
| **Curriculum Invariant** | Cross-textbook asset leakage (`letstry` $\leftrightarrow$ `herewego`) duplicated across 5 game utility files | 🔴 Critical |
| **Timer Handling** | Mixing `setTimeout` with `clearInterval` causes timer leakage in `whats_missing` | 🟡 Important |
| **Curriculum Invariant** | Widespread absence of MEXT furigana `<ruby>` tags in game modes, cards, and difficulty pills | 🟡 Important |
| **Gameplay Defect** | Multi-letter words leak into `letter_case` matching mode in `concentration` | 🟡 Important |
| **Audio Clipping** | Rapid 750ms card cycling cuts off pronunciation audio mid-word in `keyword_game` | 🟡 Important |
| **Performance** | 50ms interval re-rendering React state for potato/balloon animations in `timebomb` | 🟡 Important |
| **GEMINI.md Invariant** | Missing local Sun/Moon theme toggles in standalone modals (`DiceModal`, `BingoPrintModal`) | 🟡 Important |
| **Performance / GPU** | Three.js `CanvasTexture` caching in `ThreeDiceStage.tsx` leaks GPU memory without disposal | 🟢 Minor |
| **Dead Code** | 477 lines of unused CSS 3D dice (`PolyhedralDie3D.tsx`) | 🟢 Minor |
| **Classroom Ergonomics** | High GPU blur filter (`blur(28px)`) in `pixel_reveal` causes frame drops on low-spec teacher laptops | 🟢 Minor |

---

## 1. 🔴 Critical Vulnerabilities & Runtime Defects

### Issue 1.1: Audio Side-Effects Executed Inside Pure `setState` Reducers
* **Files:** `src/games/speed_flash/SpeedFlashGame.tsx` (line 136), `src/games/timebomb/TimebombGame.tsx` (lines 300–325)
* **The Defect:**
  In `SpeedFlashGame.tsx`:
  ```typescript
  // SpeedFlashGame.tsx: line 136
  setCurrentIndex(prev => {
    const next = (prev + 1) % cardQueue.length;
    if (cardQueue[next]) {
      playCardAudio(cardQueue[next]); // <-- SIDE EFFECT INSIDE STATE UPDATER!
    }
    return next;
  });
  ```
  In `TimebombGame.tsx`:
  ```typescript
  // TimebombGame.tsx: lines 305-325
  setRemainingMs(prev => {
    // ...
    if (now - lastTickAudio >= tickGap) {
      if (pct < 0.25) {
        soundEffects.playUrgencyTick(); // <-- AUDIO SYNTHESIS INSIDE STATE UPDATER!
      } else {
        soundEffects.playTick();
      }
      if (theme === 'POTATO') soundEffects.playFuseCrackle();
    }
    return next;
  });
  ```
* **Why This Breaks:**
  In React (especially in React 18 StrictMode and concurrent renders), state updater functions `setState(prev => ...)` are treated as **pure functions** that can be invoked multiple times per render pass to calculate state deltas.
* **Impact in Classroom:**
  Audio clips double-trigger, stutter, or desynchronize. In `timebomb`, running Web Audio oscillator creation inside a 50ms state callback causes audio crackles and Web Audio context buffer overruns.
* **Remediation:**
  State updaters must strictly return values. Trigger side-effects outside of state setters:
  ```typescript
  // In SpeedFlashGame.tsx:
  const nextIdx = (currentIndex + 1) % cardQueue.length;
  setCurrentIndex(nextIdx);
  if (cardQueue[nextIdx]) {
    playCardAudio(cardQueue[nextIdx]);
  }
  ```

---

### Issue 1.2: English Voice Synthesizer Speaking Japanese Kanji in Three Hints
* **File:** `src/games/three_hints/utils.ts` (lines 80–90), `src/games/three_hints/ThreeHintsGame.tsx` (lines 65–70)
* **The Defect:**
  In `utils.ts`, Clue 2 is formatted as:
  ```typescript
  const clue2En = word.three_hints?.feature_hint || `A word meaning "${jaMeaning}" in Japanese.`;
  ```
  When the teacher taps "Read Clue Aloud" or `autoReadClue` is active:
  ```typescript
  readClueAloud(clue.enText); // Speaks clue2En using en-US voice!
  ```
* **Impact:**
  The `en-US` speech synthesis voice receives: `A word meaning "りんご" in Japanese.`
  English speech engines cannot pronounce Japanese UTF-8 characters; they either emit robotic garbled phonemes, spell out raw Unicode codes, or crash the speech queue entirely.
* **Remediation:**
  Separate the spoken audio string from the visual card text. The spoken prompt must either omit the raw Japanese kanji or switch the synthesizer language dynamically:
  ```typescript
  // utils.ts:
  const clue2Speak = word.three_hints?.feature_hint || `Can you guess the English word for this meaning?`;
  return {
    enText: `A word meaning "${jaMeaning}" in Japanese.`,
    speakText: clue2Speak, // <-- Clean English-only string for TTS
    // ...
  };
  ```

---

### Issue 1.3: Cross-Textbook Asset Leakage Duplicated Across 5 Game Packages
* **Files:**
  * `src/games/missing/utils.ts` (lines 45–53)
  * `src/games/concentration/utils.ts` (lines 43–52)
  * `src/games/speed_flash/utils.ts` (lines 35–44)
  * `src/games/pixel_reveal/utils.ts` (lines 20–30)
  * `src/games/three_hints/utils.ts` (lines 20–30)
* **The Defect:**
  All five utilities contain identical fallback logic that violates `GEMINI.md` §1 (Grade Isolation Invariant):
  ```typescript
  if (!rawPath && tier === 'picture_word') {
    if (word.card_image_bilingual) {
      rawPath = word.card_image_bilingual; // Let's Try 1/2 (Grades 3 & 4)
    } else if (word.hwg_card_full) {
      rawPath = word.hwg_card_full; // Here We Go 5/6 (Grades 5 & 6)!
    }
  }
  ```
* **Impact:**
  When 3rd graders play *What's Missing?* or *Concentration*, if a card lacks a Grade 3 asset, the fallback renders an upper-elementary notebook card (`_full.png`) with 4-line handwriting guidelines and kanji designed for 6th graders.
* **Remediation:**
  Extract a single authoritative `resolveCardImage` in `src/utils/cardUtils.ts` that enforces strict grade boundaries:
  ```typescript
  export function resolveCardImage(word: VocabularyItem, tier: DisplayTier, grade: GradeLevel): string | null {
    const isLower = grade === 'ES_G3' || grade === 'ES_G4' || grade.startsWith('KD_') || grade === 'ES_G1' || grade === 'ES_G2';
    // If lower elementary, NEVER resolve to Mitsumura Tosho (hwg_*)
    // If upper elementary, NEVER resolve to Let's Try (dic_3_*, dic_4_*)
  }
  ```

---

## 2. 🟡 Important Architectural & Gameplay Balance Issues

### Issue 2.1: Mismatched Timer Handles in What's Missing?
* **File:** `src/games/missing/WhatsMissingGame.tsx` (lines 75, 114)
* **The Defect:**
  ```typescript
  // Line 75:
  timerIntervalRef.current = setTimeout(() => { ... }, 1000);
  
  // Line 114:
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  ```
* **Impact:**
  `timerIntervalRef` stores a `setTimeout` ID, but is canceled using `clearInterval`. While some browser runtimes share an ID pool, this creates silent timer leakage on WebKit (iPadOS Safari), causing curtains to close unexpectedly while children are still studying cards.
* **Remediation:** Standardize on `clearTimeout` when handles are created with `setTimeout`.

---

### Issue 2.2: Missing Furigana `<ruby>` Across All Sidekick Activities
* **Rule:** `GEMINI.md` §3 mandates semantic HTML `<ruby>漢字<rt>よみがな</rt></ruby>` across all user-facing Japanese text.
* **Violations Found in Sidekicks:**
  * **What's Missing?:** Mode tags display `初級`, `標準`, `挑戦`, `枚消去`, `シャッフル` without furigana.
  * **Concentration:** Badges show `おなじペア`, `絵 ↔ 単語`, `大文字 ↔ 小文字`, `神経衰弱` without furigana.
  * **Speed Flash:** Headers show `瞬きフラッシュ`, `だんだん加速`, `リズム・チャンツ`, `先生操作` without furigana.
  * **Pixel Reveal:** Mode tags show `モザイク`, `パネルめくり`, `真ん中ロック` without furigana.
  * **Three Hints:** Points show `300点チャンス`, `ヒント 1: なにの なかま？` without furigana.
  * **Timebomb:** Categories show `きもち・きぶん`, `からだの部位`, `加熱中`, `できたてポップコーン` without furigana.
* **Remediation:** Wrap all kanji in `<ruby>` tags with compact furigana (`text-[8px] font-normal text-slate-400`).

---

### Issue 2.3: Alphabet Case Matching Mode Leaks Multi-Letter Words
* **File:** `src/games/concentration/utils.ts` (lines 148–172)
* **The Defect:**
  In `ConcentrationGame`, selecting `letter_case` ("🔠 大文字 ↔ 小文字") pairs uppercase and lowercase items:
  ```typescript
  if (matchMode === 'letter_case') {
    deck.push({ ... customDisplay: { primary: word.english.toUpperCase(), secondary: '大文字' } });
    deck.push({ ... customDisplay: { primary: word.english.toLowerCase(), secondary: '小文字' } });
  }
  ```
  However, `sampleCards` samples from the **current vocabulary pool**, which often contains multi-letter words (e.g., "apple", "baseball", "strawberry")!
* **Impact in Classroom:**
  Instead of matching letters ("A" $\leftrightarrow$ "a"), children are presented with "STRAWBERRY" $\leftrightarrow$ "strawberry", breaking the phonics drill.
* **Remediation:**
  When `matchMode === 'letter_case'`, restrict the sampling pool strictly to category `'16_alphabet'` or single-letter tokens:
  ```typescript
  const letterPool = pool.filter(w => w.category === '16_alphabet' || w.english.trim().length === 1);
  ```

---

### Issue 2.4: Audio Clipping in Keyword Snatch Fast Mode
* **File:** `src/games/keyword/KeywordGame.tsx` (lines 130–160)
* **The Defect:**
  In "Fast" mode (`speed: 'fast'`), the card cycle interval is **750ms**:
  ```typescript
  cycleTimerRef.current = setInterval(() => {
    // ...
    playWordAudio(item.sound_file || item.primary_audio, item.english);
  }, 750);
  ```
  However, standard textbook MP3 recordings for vocabulary like "convenience store", "supermarket", or "pencil case" take **1,100ms to 1,500ms** to play.
* **Impact in Classroom:**
  `playWordAudio` interrupts the previous audio instance after 750ms, causing choppy, half-spoken words: *"con-ven... su-per... pen..."*. Children cannot hear the target keyword clearly.
* **Remediation:**
  In `KeywordGame.tsx`, set the minimum cycle interval for `fast` to at least `1,100ms`, or only cycle after the current audio track triggers `onended`.

---

### Issue 2.5: 50ms Re-render Loop in Hot Potato / Pop Relay
* **File:** `src/games/timebomb/TimebombGame.tsx` (lines 280–310)
* **The Defect:**
  ```typescript
  const intervalTime = 50;
  intervalRef.current = window.setInterval(() => {
    setRemainingMs(prev => prev - intervalTime);
  }, intervalTime);
  ```
  Every 50ms, `setRemainingMs` triggers a full React re-render of `TimebombGame.tsx` (a 1,019-line component) to update the balloon scale and potato steam.
* **Impact:**
  20 renders per second on a heavy component hierarchy causes CPU throttling and sluggish touch responses when students tap "Pass!".
* **Remediation:**
  Throttle React state updates to 200ms or 500ms, and animate the continuous balloon inflation via CSS transitions (`transition: transform 0.2s linear`).

---

### Issue 2.6: Missing In-Component Theme Toggles (`GEMINI.md` Rule 7)
* **Rule:** `GEMINI.md` §7: *"Every standalone modal, overlay activity, or classroom tool ... must include its own Sun ☀️ / Moon 🌙 toggle in the header control cluster."*
* **Violations:**
  * `src/components/common/DiceModal.tsx`: Header contains language and mute buttons, but **no Sun/Moon toggle**.
  * `src/games/bingo/BingoPrintModal.tsx`: No theme toggle.
  * `src/games/timebomb/TimebombManualModal.tsx`: No theme toggle.
* **Remediation:** Insert the standardized `toggleTheme()` button cluster into each modal header:
  ```tsx
  <button onClick={toggleTheme} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 ...">
    {theme === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-400" />}
  </button>
  ```

---

## 3. 🟢 Minor Refinements & Dead Code

### Issue 3.1: Dead Code - `PolyhedralDie3D.tsx`
* **File:** `src/components/common/PolyhedralDie3D.tsx` (477 lines)
* **Finding:** Contains 477 lines of Euler angle calculations and SVG polygon rendering for CSS-based polyhedral dice. However, `DiceModal.tsx` exclusively renders `<ThreeDiceStage>` (Three.js WebGL).
* **Remediation:** Delete `PolyhedralDie3D.tsx` to reduce bundle weight and maintenance overhead.

### Issue 3.2: GPU Memory Leak in `ThreeDiceStage.tsx`
* **File:** `src/components/common/ThreeDiceStage.tsx` (lines 142–155)
* **Finding:**
  ```typescript
  const textureCache = new Map<string, THREE.CanvasTexture>();
  ```
  `CanvasTexture` instances generated for dice faces are added to `textureCache`, but never disposed via `.dispose()`. While texture caching is good, changing themes or types accumulates unreleased textures in WebGL memory.
* **Remediation:** Implement cache cleanup on stage unmount:
  ```typescript
  return () => {
    textureCache.forEach(tex => tex.dispose());
    textureCache.clear();
  };
  ```

### Issue 3.3: High GPU Blur Filter on Low-End Teacher PCs
* **File:** `src/games/pixel_reveal/PixelStage.tsx` (line 39)
* **Finding:** In Pixel Reveal Level 1, `stageFilter = 'blur(28px)'` is applied to scaled images. On older school laptops with integrated Intel HD graphics, rendering 28px gaussian blur over 60fps animations causes noticeable frame drops.
* **Remediation:** Cap blur at `blur(16px)` and use CSS `image-rendering: pixelated` for authentic mosaic appearance without GPU fill-rate penalties.

---

## 4. 💡 Sidekicks Refactoring Blueprint

### 4.1. Shared Card Utility Architecture
Replace the copy-pasted `utils.ts` files across all 5 games with a unified utility:

```text
src/utils/
  ├── cardUtils.ts       <-- Authoritative resolveCardImage with strict grade boundaries
  ├── arrayUtils.ts      <-- Authoritative shuffleArray & sampleCards
  └── speechUtils.ts     <-- Clean TTS pronunciation helpers with language guards
```

### 4.2. Action Plan for Antigravity

```bash
# Phase 1: Engine & Audio Fixes
1. Fix SpeedFlashGame.tsx: Move playCardAudio() out of setCurrentIndex(prev => ...)
2. Fix TimebombGame.tsx: Move sound effects out of setRemainingMs(prev => ...)
3. Fix ThreeHints utils: Strip Japanese kanji from clue speakText string
4. Fix WhatsMissingGame.tsx: Change clearInterval to clearTimeout on timerIntervalRef

# Phase 2: Curriculum Invariants & Grade Boundaries
5. Consolidate resolveCardImage into src/utils/cardUtils.ts with strict grade isolation
6. Fix ConcentrationGame.tsx: Restrict letter_case matching mode to single-letter alphabet cards
7. Add MEXT <ruby> tags to buttons, modes, and badges across all sidekick games
8. Add Sun/Moon theme toggle to DiceModal.tsx, BingoPrintModal.tsx, and TimebombManualModal.tsx

# Phase 3: Cleanup & Polish
9. Delete unused src/components/common/PolyhedralDie3D.tsx
10. Adjust KeywordGame.tsx fast mode to 1,100ms minimum to prevent audio truncation
11. Add WebGL texture disposal in ThreeDiceStage.tsx unmount effect
```