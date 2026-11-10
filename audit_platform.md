# Levi-Sensei English Platform: Comprehensive Architectural & Code Quality Audit

---

## Executive Summary

The Levi-Sensei English Platform is an exceptionally creative, high-energy educational application tailored to the unique realities of Japanese elementary schools (MEXT curriculum, 40-student iPad rollouts, school ceiling projectors, and ALT/HRT team-teaching dynamics).

Key technical strengths include:
* **Zero-latency synthesized audio** via Web Audio API (`soundEffects.ts`), eliminating multi-megabyte sound asset downloads.
* **Resilient RTDB layer** (`rtdbSafe.ts`) featuring recursive circular reference protection, automatic sanitization of `undefined`, and authoritative server-time synchronization (`getServerTime()`).
* **Hardware-accelerated presentation tools** like the Three.js 3D felt-table dice simulator (`ThreeDiceStage.tsx`) and 3D card flips.

However, as the application expands toward the 88-activity roadmap outlined in `GEMINI.md`, several **architectural bottlenecks, rule violations, and scalability risks** require immediate remediation.

---

## Audit Findings Matrix

| Category | Issue Summary | Severity |
| :--- | :--- | :---: |
| **Security & Routing** | Undocumented `'0000'` backdoor PIN circumvents 6-digit teacher lock | 🔴 Critical |
| **Firebase / Network** | Full-room state broadcasting creates $O(N^2)$ network storm on school Wi-Fi | 🔴 Critical |
| **GEMINI.md Compliance** | Systemic omission of mandatory Furigana `<ruby>` tags across student UI | 🔴 Critical |
| **GEMINI.md Compliance** | Asset fallback chains violate Grade Isolation between Let's Try & Here We Go | 🔴 Critical |
| **Architecture / Debt** | Duplicate ~1,000-line multiplayer hooks (`useQuizRoom` vs `useClassroomRoom`) | 🟡 Important |
| **Architecture / Debt** | Monolithic components (1,000+ to 1,500+ lines) with mixed concerns | 🟡 Important |
| **Performance** | 2.2 MB static dictionary uncompressed fetch on 35 simultaneous iPads | 🟡 Important |
| **React / Performance** | 100ms render polling and `setTimeout` / `clearInterval` mismatch | 🟡 Important |
| **GEMINI.md Compliance** | Missing local Sun/Moon theme toggles in standalone modals | 🟡 Important |
| **Dead Code** | 477 lines of unused CSS 3D dice (`PolyhedralDie3D.tsx`) | 🟢 Minor |
| **Accessibility / UX** | Small touch targets (<44px) on attendance numbers & filter chips | 🟢 Minor |
| **Classroom Lighting** | Low-contrast projector text (`text-slate-400` / `text-slate-500`) | 🟢 Minor |

---

## 1. Security & Classroom Routing

### 🔴 CRITICAL: Hardcoded `'0000'` Teacher PIN Backdoor
* **Files:** `src/context/ClassroomContext.tsx` (line 343), `src/components/shell/Header.tsx` (lines 98, 237), `src/components/shell/TeacherPinGate.tsx` (lines 14, 63)
* **Finding:** While `GEMINI.md` §4 explicitly mandates a single 6-digit PIN (`051683`) to lock teacher privileges, the codebase contains fallback checks:
  ```typescript
  // ClassroomContext.tsx
  const unlockTeacher = (pin: string): boolean => {
    if (pin === '051683' || pin === '0000') { ... }
  };
  ```
* **Impact:** Elementary students routinely guess `0000` or `1234` when faced with PIN prompts on tablets. Entering `0000` grants full teacher mode, exposing administrative tools, answers, and roster controls.
* **Remediation:** Remove all references to `'0000'`. Lock teacher mode strictly to `051683`.

### 🔴 CRITICAL: Client-Side-Only Role Authorization in RTDB
* **Files:** `src/context/ClassroomContext.tsx`, `src/games/quiz/useQuizRoom.ts`
* **Finding:** Authentication relies on Firebase Anonymous Auth (`ensureAnonymousAuth()`). While this avoids requiring student Google accounts, the distinction between teacher and student exists solely in client-side state (`userRole`).
* **Impact:** Any technically curious student (or anyone inspecting localStorage) can set `levi_sensei_role: 'TEACHER'` and `levi_sensei_teacher_unlocked: 'true'`. Furthermore, student iPads write directly to `rooms/${code}/players/${playerId}` and `rooms/${code}/responses/${playerId}`, but also have the network capacity to execute `update(ref(rtdb, 'rooms/' + code), { status: 'GAME_OVER' })` if RTDB security rules do not strictly enforce `auth.uid === data.child('hostId').val()`.
* **Remediation:** Verify that `database.rules.json` enforces that only the room's `hostId` can alter `status`, `currentQuestionIndex`, `questions`, and `teamScores`.

---

## 2. Firebase & School Wi-Fi Performance

### 🔴 CRITICAL: Full-Room State Fan-Out ($O(N^2)$ Bandwidth Storm)
* **File:** `src/games/quiz/useQuizRoom.ts` (lines 48–66)
* **Finding:** The subscription model subscribes both the host and all student iPads to the root room node:
  ```typescript
  const roomPath = `rooms/${roomCode}`;
  const unsubscribe = safeSubscribe<QuizRoomState>(roomPath, (data) => setRoom(data));
  ```
  `QuizRoomState` includes `players` (with full answer histories), `responses`, `questions` (with options, text, and base64/relative image paths), and `teamScores`.
* **Impact on a 40-seat classroom:**
  1. Question 1 begins: Host updates `currentQuestion`. All 40 iPads receive the event.
  2. Students answer within 5 seconds: Each answer triggers a write to `rooms/${code}/responses/${studentId}` or `players/${studentId}`.
  3. Every single write broadcasts the **entire root room object** back to all 40 iPads plus the teacher's PC.
  4. 40 writes $\times$ 41 clients = **1,640 full-room payloads dispatched in 5 seconds**.
  5. On standard school Wi-Fi access points (frequently serving 40–80 devices on a single AP), this causes bufferbloat, packet loss, and high latency (1,000–3,000ms), resulting in desynchronized timers and missed answers.
* **Remediation:** Split the RTDB room tree into granular, isolated sub-nodes:
  * `/rooms/$pin/state`: Light metadata (`status`, `questionIndex`, `timeLimitMs`, `startTime`). Both host and students subscribe.
  * `/rooms/$pin/responses/$uid`: Only the host subscribes to `/responses`. Students only write to their own leaf (`/responses/$uid`). Students do not need to download their classmates' responses in real time.
  * `/rooms/$pin/leaderboard`: Broadcasted only during `LEADERBOARD` and `GAME_OVER` phases.

---

## 3. GEMINI.md Invariant Violations

### 🔴 CRITICAL: Missing MEXT Furigana Ruby Invariant
* **Rule:** `GEMINI.md` §3: *"All user-facing Japanese kanji across titles, instructions, buttons, badges, and modal content must include MEXT-approved furigana using semantic HTML `<ruby>漢字<rt>よみがな</rt></ruby>`."*
* **Violations Found:**
  1. `src/App.tsx`: Main activity launcher titles and filter buttons lack ruby:
     * `jaTitle="何が消えた？"` (missing `何<rt>なに</rt>`, `消<rt>き</rt>えた`)
     * `jaTitle="神経衰弱・えあわせ"` (missing `神経衰弱<rt>しんけいすいじゃく</rt>`)
     * `jaTitle="3ヒントクイズ"`
     * `すべてのフィルターを解除` (missing `解除<rt>かいじょ</rt>`)
  2. `src/components/shell/GameLauncherCard.tsx`: Status pills display unread kanji to younger grades: `今すぐプレイ可能`, `開発進行中`, `開発計画`.
  3. `src/components/student/StudentPortal.tsx`: Uses informal bracketed text `学年（がくねん）をえらんでね:` instead of semantic `<ruby>学年<rt>がくねん</rt></ruby>`.
  4. `src/games/missing/WhatsMissingGame.tsx`: Difficulty tags display unannotated kanji: `初級`, `標準`, `挑戦`, `枚消去`.
  5. `src/games/concentration/ConcentrationGame.tsx`: Mode pills display raw kanji: `おなじペア`, `絵 ↔ 単語`, `大文字 ↔ 小文字`, `枚数`.
* **Remediation:** Standardize on `<ruby>` tags across all student-facing UI. For repeated dictionary entries, use `RubyText.tsx` or expand `useLanguage()` to accept semantic JSX.

### 🔴 CRITICAL: Cross-Textbook Grade Asset Leakage
* **Rule:** `GEMINI.md` §1: *"When words appear across multiple grades (e.g. good, happy, baseball, Sunday), NEVER share or cross-link asset paths across textbook boundaries. Grade 3/4 must resolve to Let's Try assets; Grade 5/6 must resolve to Mitsumura Tosho assets."*
* **Violations Found in `resolveCardImage`:**
  In `src/games/concentration/utils.ts` (lines 43–52), `src/games/speed_flash/utils.ts` (lines 35–44), and `src/games/missing/utils.ts` (lines 44–53):
  ```typescript
  // If grade media is missing, fallback logic checks:
  if (!rawPath && tier === 'picture_word') {
    if (word.card_image_bilingual) {
      rawPath = word.card_image_bilingual; // Let's Try asset
    } else if (word.hwg_card_full) {
      rawPath = word.hwg_card_full; // Here We Go asset!
    }
  }
  ```
  If a word is being displayed for a Grade 3 activity, and `media_by_grade['ES_G3']` is absent, the fallback chain grabs `hwg_card_full` (Here We Go Grade 5/6), displaying 4-line notebook guidelines to 3rd graders.
* **Remediation:** Scope fallback chains strictly to the target grade's curriculum:
  * For `ES_G3` and `ES_G4`: Only allow `letstry` assets (`_1_c.png`, `_1_ce.png`).
  * For `ES_G5` and `ES_G6`: Only allow Mitsumura Tosho `cards/illustration/` and `cards/full/` assets.
  * If no matching textbook asset exists for that grade boundary, fall back to a clean typographic card, never the other publisher's cards.

### 🟡 IMPORTANT: Missing Theme Toggles in Standalone Overlays
* **Rule:** `GEMINI.md` §7: *"Every standalone modal, overlay activity, or classroom tool ... must include its own Sun ☀️ / Moon 🌙 toggle in the header control cluster."*
* **Violations Found:**
  * `src/components/common/DiceModal.tsx`: Header contains language and mute buttons, but **no theme toggle**.
  * `src/components/shell/ActiveRoomsModal.tsx`: No theme toggle.
  * `src/games/bingo/BingoPrintModal.tsx`: No theme toggle.
  * `src/games/timebomb/TimebombManualModal.tsx`: No theme toggle.
* **Remediation:** Add the standardized `toggleTheme()` cluster button with Sun/Moon icons into each of these modal headers.

---

## 4. Architecture & Code Structure

### 🟡 IMPORTANT: Dual Competing Multiplayer Implementations
* **Files:**
  1. `src/games/quiz/useQuizRoom.ts` (1,031 lines)
  2. `src/games/common/multiplayer/useClassroomRoom.ts` (987 lines)
* **Finding:** The project contains two parallel, ~1,000-line RTDB multiplayer state machines.
  * `useQuizRoom.ts` is tightly coupled to Eigo Arena (`QuizHostContainer`, `QuizStudentContainer`).
  * `useClassroomRoom.ts` is a generalized room state manager designed for multi-activity synchronization, but is **currently unused** by any game in `src/games/`.
* **Impact:** Maintaining two parallel Firebase sync engines creates duplicate maintenance overhead and diverging protocol semantics (e.g., how teams are balanced, how attendance numbers are bound, and how heartbeats are tracked).
* **Remediation:** Deprecate `useClassroomRoom.ts` or refactor `useQuizRoom.ts` to extend from a unified core room engine.

### 🟡 IMPORTANT: Utility Function Duplication
* **Finding:** The following core functions are copy-pasted verbatim across five separate game directories (`src/games/missing/utils.ts`, `src/games/concentration/utils.ts`, `src/games/speed_flash/utils.ts`, `src/games/pixel_reveal/utils.ts`, `src/games/three_hints/utils.ts`):
  * `resolveCardImage()`
  * `shuffleArray()`
  * `sampleCards()`
* **Impact:** Bug fixes applied to card resolution in `concentration` do not propagate to `missing` or `speed_flash`.
* **Remediation:** Extract these into `src/utils/cardUtils.ts` and `src/utils/arrayUtils.ts`.

### 🟡 IMPORTANT: Mega-Components Violating Single Responsibility
Several components have grown beyond 800–1,500 lines:
1. `src/games/quiz/host/QuizHostSetup.tsx` (1,569 lines): Mixes form state, UI layout, word pool calculations, preset toggles, and sound effects.
2. `src/components/common/StudentDrawModal.tsx` (1,164 lines): Houses canvas wheel physics, animated slot reels, and 3D popsicle stick jar mechanics in one file.
3. `src/games/quiz/host/QuizHostGameOver.tsx` (1,013 lines): Combines solo warmup stats, team podiums, individual podiums, F1 classification tables, award badge grids, and trouble-word choral review.
4. `src/games/timebomb/TimebombGame.tsx` (1,019 lines): Integrates countdown logic, potato/balloon/popcorn graphics, category rally state, and number counting state.

* **Remediation Plan:**
  * Split `StudentDrawModal.tsx` into `WheelStage.tsx`, `SlotStage.tsx`, and `SticksStage.tsx`.
  * Extract F1 race results from `QuizHostGameOver.tsx` into a dedicated `QuizHostF1Results.tsx`.
  * Extract setup form sections in `QuizHostSetup.tsx` into sub-components (`QuizScopePicker`, `QuizGameStylePicker`, `QuizMechanicsPicker`).

---

## 5. React & TypeScript Quality

### 🟡 IMPORTANT: Timer Mismatches & 100ms Re-render Intervals
* **Issue A: `setTimeout` cleared with `clearInterval`**
  In `src/games/missing/WhatsMissingGame.tsx` (lines 75, 114):
  ```typescript
  timerIntervalRef.current = setTimeout(() => { ... }, 1000);
  // and in cleanup:
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  ```
  While browsers share the timer ID pool between `setTimeout` and `setInterval`, mixing `clearTimeout` and `clearInterval` is non-standard, violates TypeScript lib types, and can fail in non-browser testing environments (Node.js/Jest/Vitest).
* **Issue B: 100ms Re-render Loop on 35 iPads**
  In `src/games/quiz/student/QuizStudentQuestion.tsx` (lines 53–56):
  ```typescript
  const interval = setInterval(() => {
    setElapsedMs(Math.max(0, getServerTime() - startTimeRef.current));
  }, 100);
  ```
  Every 100 milliseconds, this hook sets local state, causing the entire tree of 4 choice cards to re-evaluate and re-render. On older school iPads (iPad 7th/8th gen running iPadOS 16/17), running this interval across multiple components causes thermal throttling and battery drain.
* **Remediation:**
  * Standardize all timer handles to `clearTimeout` or `clearInterval` based on how they were scheduled.
  * For countdown progress bars, use CSS transitions (`transition: width 1s linear`) or requestAnimationFrame bound directly to DOM element styles rather than React state re-renders every 100ms.

### 🟡 IMPORTANT: Simultaneous 2.2 MB Vocabulary Fetch
* **File:** `src/context/VocabularyContext.tsx` (lines 47–61)
* **Finding:**
  ```typescript
  useEffect(() => {
    fetch('/data/master_vocabulary.json')
      .then(res => res.json())
      .then((data: VocabularyItem[]) => { ... });
  }, []);
  ```
  When an entire class of 35 students scans the QR code at once to open the site, 35 iPads simultaneously request `/data/master_vocabulary.json` (2.2 MB uncompressed).
* **Network Impact:** 35 devices $\times$ 2.2 MB = **77 MB burst download** through the school's firewall. On throttled educational connections, several iPads fail or hang on the loading spinner.
* **Remediation:**
  1. Ensure `firebase.json` headers gzip/brotli compress this file (reduces 2.2 MB to ~280 KB).
  2. For students joining via PIN, they only need the question pool for that session (which is already transmitted via the room object or can be split by grade). Students do not need the 857-word dictionary of other grades upon joining.

### 🟢 MINOR: Dead Code - `PolyhedralDie3D.tsx`
* **File:** `src/components/common/PolyhedralDie3D.tsx` (477 lines)
* **Finding:** This file contains 477 lines of Euler angle calculations and SVG polygon renderings for CSS-based d4, d6, d8, d10, d12, and d20 dice. However, `DiceModal.tsx` exclusively renders `<ThreeDiceStage>` (Three.js WebGL).
* **Remediation:** Delete `src/components/common/PolyhedralDie3D.tsx`.

---

## 6. Accessibility, Typography & Classroom Ergonomics

### 🟢 MINOR: Small Touch Targets on iPad
* **Files:** `src/components/student/EditProfileModal.tsx` (lines 142–155), `src/components/shell/GameFilterBar.tsx` (lines 173–193)
* **Finding:** Avatar category tabs and filter chips use `py-1.5 px-0.5 sm:px-1` with text sized at `text-[11px]`.
* **Impact:** On a 10.2-inch iPad, these tap targets measure approximately 26px to 30px in physical height, below Apple's 44x44pt Human Interface Guidelines for touch targets. Elementary students frequently experience mis-taps.
* **Remediation:** Increase minimum height to `h-11` (44px) or add `py-2.5 px-3` touch target buffers.

### 🟢 MINOR: Washout on Classroom Ceiling Projectors
* **Files:** `src/games/quiz/host/QuizHostQuestion.tsx`, `src/games/missing/WhatsMissingGame.tsx`
* **Finding:** Secondary text, subtitles, and hints frequently use Tailwind's `text-slate-400` or `text-slate-500` (e.g., `#94a3b8` / `#64748b`).
* **Impact:** Standard Japanese classroom projectors (Epson/Panasonic 3,000–3,500 lumens) project onto slightly reflective whiteboards or rolling screens under ambient fluorescent lighting. Low-contrast slate grays become unreadable from rows 4 through 6 of a 40-student classroom.
* **Remediation:** On host/projector views (Stream 🅰️), enforce high-contrast colors: `text-white` or `text-slate-100` for dark mode, and `text-slate-900` or `text-slate-950` for light mode.

---

## Actionable Refactoring Roadmap

### Phase 1: Security, Safety & Rule Compliance (Immediate)
1. **Remove Backdoor PIN:** Search and destroy all `'0000'` bypasses across `ClassroomContext.tsx`, `Header.tsx`, and `TeacherPinGate.tsx`.
2. **Grade Asset Isolation:** Refactor `resolveCardImage` in all games to strictly prevent cross-textbook fallbacks (Let's Try $\leftrightarrow$ Here We Go).
3. **MEXT Furigana Rectification:** Add semantic `<ruby>` tags to all top-level game launcher titles, status badges, and instructions in `App.tsx` and `StudentPortal.tsx`.

### Phase 2: Network & Performance Hardening (Pre-Scaling)
1. **RTDB Sub-tree Separation:** Restructure `useQuizRoom.ts` to separate `/responses` from the root room listener, preventing the 40-device $O(N^2)$ write broadcast storm.
2. **Compress / Partition Vocabulary:** Ensure Gzip/Brotli compression is active in Firebase Hosting for `master_vocabulary.json`.
3. **Consolidate Utility Functions:** Extract `resolveCardImage`, `shuffleArray`, and `sampleCards` into shared utilities (`src/utils/cardUtils.ts`). Delete dead `PolyhedralDie3D.tsx`.

### Phase 3: Architecture & Component Decomposition (Next Milestone)
1. **Unify Multiplayer Hooks:** Deprecate `useClassroomRoom.ts` or make `useQuizRoom.ts` a thin wrapper around a single tested multiplayer base engine.
2. **Decompose Mega-Components:** Split `QuizHostSetup.tsx`, `StudentDrawModal.tsx`, and `QuizHostGameOver.tsx` into modular sub-components.
3. **Modal Theme Parity:** Add Sun/Moon theme toggles to `DiceModal`, `ActiveRoomsModal`, and `BingoPrintModal`.
4. **Projector Contrast Audit:** Replace washed-out slate grays on host projection screens with high-contrast textbook tokens.