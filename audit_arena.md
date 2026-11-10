# Eigo Arena (ライブ4択バトル) — Deep-Dive Architectural & Gameplay Audit

As the flagship multiplayer activity of the platform, **Eigo Arena** bridges the teacher’s front-of-room smartboard/projector with up to 40 student iPads in real time. It supports both whole-class Kahoot-style synchronized play and self-paced F1 Sprint racing.

While the feature set and visual presentation are impressive, a forensic inspection of the codebase reveals **several critical vulnerabilities, network bottlenecks, and algorithmic defects** that directly threaten reliability in a live 40-student public school classroom.

---

## Eigo Arena Audit Matrix

| Category | Finding Summary | Severity |
| :--- | :--- | :---: |
| **Security / Integrity** | `correctOptionId` is broadcast in plaintext to all student iPads during the question phase | 🔴 Critical |
| **Network Architecture** | Monolithic room subscription causes $O(N^2)$ WebSocket broadcast storm on school Wi-Fi | 🔴 Critical |
| **Data Integrity** | Read-Modify-Write race condition causes dropped scores in F1 Sprint Mode | 🔴 Critical |
| **Pedagogical Audio** | Question prompts bypass MEXT studio-recorded MP3s in favor of robotic Web Speech | 🔴 Critical |
| **Question Generation** | `questionGenerator.ts` can generate identical duplicate answer choices | 🟡 Important |
| **Curriculum Invariant** | TV prompt artwork & font sizes violate back-row classroom visibility minimums | 🟡 Important |
| **Classroom Localization** | Headings in Japanese mode retain redundant English parentheticals | 🟡 Important |
| **State Consistency** | Kicking players permanently corrupts team average scores | 🟡 Important |
| **Maintainability** | `QuizHostSetup.tsx` (1,569 lines) & `useQuizRoom.ts` (1,031 lines) monoliths | 🟡 Important |
| **iPad Reliability** | No `visibilitychange` handler causes timer skew on iPad cover close/open | 🟡 Important |
| **Anti-Spam Gating** | 2.5s Pit Stop penalty can be bypassed by refreshing iPad browser | 🟢 Minor |
| **UX / Audio Polish** | Audio repeat interval at 75%/50%/25% can overlap on short timers | 🟢 Minor |

---

## 1. 🔴 Critical Vulnerabilities & Architectural Defects

### Issue 1.1: Plaintext Correct Answer Broadcast to Student iPads (Cheating Leak)
* **Files:** `src/games/quiz/questionGenerator.ts` (line 155), `src/games/quiz/useQuizRoom.ts` (lines 142–153), `src/games/quiz/types.ts` (line 89)
* **The Defect:**
  In `useQuizRoom.ts`, when the host advances to a new question:
  ```typescript
  // useQuizRoom.ts: line 145
  const q = { ...targetQ, startTime: getServerTime() };
  await safeUpdate(`rooms/${roomCode}`, {
    status: 'QUESTION',
    currentQuestionIndex: index,
    currentQuestion: q, // <-- Contains correctOptionId!
    responses: null
  });
  ```
  Every connected student iPad is subscribed to `rooms/${roomCode}`. Therefore, `room.currentQuestion.correctOptionId` is transmitted to **every student iPad before any student has answered**.
* **Impact in the Classroom:**
  Any 5th or 6th grader who opens Safari Web Inspector, inspects the WebSocket payload, or types `window.__reactFiber` in console can read the exact answer instantly. Furthermore, any client-side mod or proxy can auto-click the correct answer in 100ms with 100% accuracy.
* **Remediation:**
  Strip `correctOptionId` from the public question object when dispatching the question to the room.
  1. The host stores full questions (including `correctOptionId`) in memory or under an isolated host-only path: `hostSessions/${roomCode}/questions`.
  2. The public `currentQuestion` broadcasted to students must only contain `{ id, promptText, promptImage, options: [{ id, text, symbol, color }] }`.
  3. Answer verification and scoring must only reveal `correctOptionId` on the `REVEAL` phase.

---

### Issue 1.2: Monolithic Room Subscription ($O(N^2)$ Bandwidth Storm)
* **Files:** `src/games/quiz/useQuizRoom.ts` (lines 52–66), `src/games/quiz/student/QuizStudentContainer.tsx` (lines 38–48)
* **The Defect:**
  ```typescript
  // useQuizRoom.ts
  const roomPath = `rooms/${roomCode}`;
  const unsubscribe = safeSubscribe<QuizRoomState>(roomPath, (data) => setRoom(data));
  ```
  Both the host and **every student iPad** subscribe to the root `rooms/${roomCode}` node.
* **The Math on School Wi-Fi (35–40 iPads on a single classroom AP):**
  * When Student 1 submits an answer, they write to `rooms/${code}/responses/${student1}`.
  * Firebase RTDB pushes the updated `rooms/${code}` tree (which contains all players, their full answer histories, current question, and team scores) to **all 40 iPads + the host laptop** (41 subscribers).
  * Within a typical 5-second answering window, 40 students submit answers:
    $$\text{Payloads} = 40 \text{ writes} \times 41 \text{ subscribers} = 1,640 \text{ full-room JSON snapshots}$$
  * If the room snapshot is ~35 KB, that equals **57.4 MB of WebSocket traffic in 5 seconds** over a single school Wi-Fi access point.
* **Classroom Failure Mode:**
  School Wi-Fi routers frequently drop UDP/WebSocket frames under burst traffic. iPads freeze, buttons become unresponsive, and timers desynchronize.
* **Remediation: Restructure RTDB into 3 decoupled paths:**
  ```text
  rooms/${code}/
    ├── publicState/       <-- Both Host and Students listen (status, qIndex, startTime, timeLimitMs)
    ├── responses/${uid}   <-- ONLY the Host listens to /responses. Student only writes to their own UID.
    └── players/${uid}     <-- Host listens. Student only writes to their own node.
  ```
  This reduces student traffic from $O(N^2)$ to $O(N)$—a **97.5% reduction in network load**.

---

### Issue 1.3: Read-Modify-Write Race Condition in F1 Sprint Mode
* **File:** `src/games/quiz/useQuizRoom.ts` (lines 947–1012)
* **The Defect:**
  When a student submits an answer in Sprint Mode:
  ```typescript
  const submitSprintAnswer = useCallback(async (...) => {
    const playerPath = `rooms/${roomCode}/players/${playerId}`;
    const current = await safeGet<QuizPlayer>(playerPath); // <-- STEP 1: Async Read
    if (!current) return;

    // STEP 2: Compute in-memory
    const updatedScore = ...;
    const updateData = { ... };

    // STEP 3: Async Write
    await safeUpdate(playerPath, updateData);
  });
  ```
* **Impact:**
  Sprint Mode is high-speed: students tap an answer every 1.5–2.5 seconds. Because `safeGet` and `safeUpdate` are separate network roundtrips (not an atomic transaction), if network latency fluctuates, **Write 1 and Read 2 can interleave**.
  * Request A reads `score: 200`.
  * Request B reads `score: 200` before Request A finishes writing.
  * Request A writes `score: 300`.
  * Request B writes `score: 300` (instead of 400).
  * **Result:** Scores, streaks, and lap progress are silently dropped.
* **Remediation:**
  Use `safeTransaction` (which is already implemented in `rtdbSafe.ts`!):
  ```typescript
  await safeTransaction<QuizPlayer>(playerPath, (current) => {
    if (!current) return current || undefined;
    return {
      ...current,
      score: (current.score || 0) + pointsEarned,
      currentStreak: isCorrect ? (current.currentStreak || 0) + 1 : 0,
      sprintProgress: newSprintProgress,
      // ...
    };
  });
  ```

---

### Issue 1.4: Authentic Textbook Studio Audio Bypassed for Web Speech
* **Files:** `src/games/quiz/host/QuizHostQuestion.tsx` (lines 80–95), `src/games/quiz/host/QuizHostReveal.tsx` (lines 35–50), `src/games/quiz/questionGenerator.ts` (lines 142–148)
* **The Defect:**
  In `questionGenerator.ts`, the generator correctly attaches the official textbook sound file:
  ```typescript
  promptSound = target.sound_file || target.primary_audio || target.english;
  ```
  However, in `QuizHostQuestion.tsx` and `QuizHostReveal.tsx`:
  ```typescript
  // QuizHostQuestion.tsx: lines 80-87
  const playPromptAudio = useCallback(() => {
    const textToSpeak = question.targetWordEnglish; // <-- Ignores promptSound!
    speechService.speak(textToSpeak, { ... });
  }, [question.targetWordEnglish]);
  ```
* **Impact:**
  Instead of playing the authentic studio-recorded native speaker MP3s from *Let's Try* and *Here We Go* (`dic_3_card_*.mp3`), Eigo Arena **exclusively triggers synthetic browser speech** via Web Speech API (`SpeechSynthesis`). Synthesizers on school Windows PCs often sound mechanical and mispronounce elementary target intonation.
* **Remediation:**
  Update `playPromptAudio` to prioritize the studio audio file via `AudioContext.playWordAudio`:
  ```typescript
  const playPromptAudio = useCallback(() => {
    if (question.promptSound && /\.(mp3|wav|m4a|ogg)$/i.test(question.promptSound)) {
      onDuckBGM?.(true);
      playWordAudio(question.promptSound, question.targetWordEnglish)
        .finally(() => onDuckBGM?.(false));
    } else {
      speechService.speak(question.targetWordEnglish, {
        onStart: () => onDuckBGM?.(true),
        onEnd: () => onDuckBGM?.(false)
      });
    }
  }, [question, playWordAudio, onDuckBGM]);
  ```

---

## 2. 🟡 Important Architectural & Gameplay Balance Issues

### Issue 2.1: Duplicate Word & Options Bug in `questionGenerator.ts`
* **File:** `src/games/quiz/questionGenerator.ts` (lines 53–75)
* **The Defect:**
  When generating 3 distractors, the generator filters:
  ```typescript
  const otherWords = pool.filter(w => w.id !== target.id);
  ```
  It checks that `w.id !== target.id`, but **does NOT verify that `w.english.toLowerCase() !== target.english.toLowerCase()`**.
* **Impact:**
  In textbook databases (specifically across units or casing variants like uppercase "A" vs lowercase "a", or words like "Sunday" appearing in multiple review units), two distinct items share the same English spelling.
  * Question: "日曜日"
  * Choices: `[ "Sunday", "Monday", "Sunday", "Friday" ]`
  Students encounter duplicate choices where two buttons have the exact same label, but only one arbitrary button is registered as `correctOptionId`.
* **Remediation:**
  Filter distractors by English lemma, not just unique ID:
  ```typescript
  const targetLower = target.english.trim().toLowerCase();
  const otherWords = pool.filter(w => 
    w.id !== target.id && 
    w.english.trim().toLowerCase() !== targetLower
  );
  ```

---

### Issue 2.2: Back-Row Visibility Violations (`GEMINI.md` Rule 6)
* **Rule:** `GEMINI.md` §6:
  * Artwork container must be at least `h-52 sm:h-72 md:h-80 w-full max-w-2xl` with high-contrast borders.
  * Question prompt typography must scale up to `text-5xl sm:text-7xl md:text-8xl`.
* **Current Code in `QuizHostQuestion.tsx`:**
  * Artwork container (line 440): `h-36 sm:h-48 md:h-56 lg:h-64 w-[42%] sm:w-[46%]` (Max height is only 256px).
  * Typography (line 427): `text-3xl sm:text-5xl md:text-6xl lg:text-7xl`.
* **Classroom Reality:**
  In a 40-seat Japanese public school classroom, the back row is 8 to 10 meters away from the ceiling-mounted projector. Under standard classroom fluorescent lighting, `h-36` (144px) illustration containers and `text-3xl` headings are unreadable for back-row students.
* **Remediation:**
  Align Tailwind classes to the specification:
  ```tsx
  <div className="shrink-0 h-52 sm:h-72 md:h-80 w-full max-w-2xl flex items-center justify-center p-3 rounded-3xl bg-white dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700 shadow-2xl">
    <img src={question.promptImage} className="w-full h-full object-contain" />
  </div>
  ```

---

### Issue 2.3: Redundant English Parentheticals in Japanese Mode (`GEMINI.md` Rule 6)
* **Rule:** `GEMINI.md` §6: *"In Japanese mode (`ja`), all headings, awards, and podium banners (`CHAMPION` ➔ `優勝`) must be fully translated without redundant English parenthetical annotations."*
* **Violations in `QuizHostGameOver.tsx`:**
  * Line 701: `t('Classroom Awards', '特別表彰 (Classroom Awards)')`
  * Line 762: `t('Trouble Words Review', 'クラスの苦手単語復習 (Trouble Words Review)')`
  * Line 825: `t('Session Flashcard Recap', '練習単語のまとめ復習 (Session Flashcard Recap)')`
  * Line 475: `t('GRAND PRIX WINNER', 'グランプリ優勝')` is correct, but other podium headers still output mixed English.
* **Remediation:** Remove all English parentheticals from the Japanese localization strings:
  ```typescript
  t('Classroom Awards', '特別表彰')
  t('Trouble Words Review', '苦手単語の復習')
  t('Session Flashcard Recap', '練習単語のまとめ')
  ```

---

### Issue 2.4: Team Average Score Corruption on Player Kick
* **Files:** `src/games/quiz/useQuizRoom.ts` (lines 388–395, lines 260–280)
* **The Defect:**
  When the teacher kicks a disruptive or duplicate student from the lobby or mid-game:
  ```typescript
  // useQuizRoom.ts: line 388
  const kickPlayer = useCallback(async (playerId: string) => {
    if (!roomCode) return;
    await safeRemove(`rooms/${roomCode}/players/${playerId}`);
  }, [roomCode]);
  ```
  The kicked player is removed from `players/${playerId}`, but their previously scored points remain in `teamScores[teamId].score`.
  During the next question reveal:
  * `teamMembers` count drops by 1.
  * The numerator (`totalScore`) still includes the kicked player's points.
  * The denominator (`memberCount`) shrinks.
  * **Result:** The team's `averageScore` artificially spikes, giving that team an unfair advantage on the leaderboard!
* **Remediation:**
  Atomic recalculation of `teamScores` when removing a player:
  ```typescript
  const kickPlayer = useCallback(async (playerId: string) => {
    if (!roomCode) return;
    const playerToKick = room?.players?.[playerId];
    await safeRemove(`rooms/${roomCode}/players/${playerId}`);
    
    if (playerToKick?.teamId && room?.teamScores?.[playerToKick.teamId]) {
      const remainingTeamMembers = Object.values(room.players)
        .filter(p => p.id !== playerId && p.teamId === playerToKick.teamId);
      // Re-sum team scores and recalculate memberCount & averageScore
      // ...
    }
  }, [roomCode, room]);
  ```

---

### Issue 2.5: Component Monoliths Violating Single Responsibility
* **`QuizHostSetup.tsx` (1,569 lines):**
  Contains delivery stream selection, Kahoot vs Sprint mode selection, team mode toggles, color pickers, lap counts, timer options, recall delay toggles, distractor elimination selectors, question variety checkboxes, choice image guards, katakana subtext toggles, classroom award toggles, and BGM selector.
* **`useQuizRoom.ts` (1,031 lines):**
  Combines host lifecycle, student lifecycle, sprint race state machine, attendance claiming, team balancing, and RTDB transactions into one massive hook.
* **Impact:**
  Vite HMR slows down (>300ms) on these files. A minor visual tweak in the BGM selector forces a full re-evaluation of the 1,500-line setup component.
* **Target Decomposition:**
  ```text
  src/games/quiz/host/setup/
    ├── QuizHostSetup.tsx (Main orchestrator, ~180 lines)
    ├── QuizDeliveryStreamPicker.tsx
    ├── QuizGamePlayTypePicker.tsx
    ├── QuizTeamConfigPanel.tsx
    ├── QuizScaffoldingGuards.tsx
    └── QuizBgmPicker.tsx
  ```

---

### Issue 2.6: iPad Sleep / Cover Close Desynchronization
* **File:** `src/games/quiz/student/QuizStudentContainer.tsx` (lines 120–135)
* **The Defect:**
  When elementary students close their iPad magnetic smart covers, iOS Safari suspends JavaScript timers and pauses WebSocket heartbeats.
  Upon reopening the cover:
  1. `questionReceivedAtRef.current = Date.now()` re-executes.
  2. If the question has already been running for 10 seconds, the student's timer starts fresh at 0s, giving them a false 15-second window.
  3. When they answer, their local `clientTimeTakenMs` calculates `Date.now() - questionReceivedAtRef.current = 500ms`, incorrectly awarding them the maximum 500-point speed bonus!
* **Remediation:**
  Never measure elapsed time against local `questionReceivedAtRef`. Always calculate elapsed time strictly against the host's authoritative server timestamp:
  ```typescript
  const clientTimeTakenMs = Math.max(100, getServerTime() - room.currentQuestion.startTime);
  ```

---

## 3. 🟢 Minor Quality of Life & Polish

### Issue 3.1: 2.5s Pit Stop Penalty Browser Refresh Bypass
* **File:** `src/games/quiz/student/QuizStudentSprint.tsx` (lines 100–115, 230–245)
* **Finding:** In Sprint Mode, an incorrect answer inflicts a 2.5-second "Pit Stop" penalty. This penalty is held solely in local React state: `penaltySecondsLeft`.
* **Exploit:** If a student makes an error, they can immediately tap Safari's reload button (or pull down to refresh). The page reloads, reconnects to the room via session storage, and `penaltySecondsLeft` resets to `0`, bypassing the pit stop delay.
* **Remediation:** Store `penaltyEndTime` in sessionStorage or on the player's RTDB node (`players/${uid}/penaltyUntil: timestamp`). On mount, check if `Date.now() < penaltyUntil` and resume the lockout if active.

### Issue 3.2: Audio Prompt Repetition Collision on Short Timers
* **File:** `src/games/quiz/host/QuizHostQuestion.tsx` (lines 135–150)
* **Finding:** When `AUDIO_ONLY` mode is selected, the prompt plays at 100%, 75%, 50%, and 25% of the countdown time.
  If the question timer is set to `5 seconds`:
  * 75% = 3.75s (1.25s after start)
  * 50% = 2.5s (2.5s after start)
  * 25% = 1.25s (3.75s after start)
  Because spoken audio for words like "convenience store" takes ~1.5 seconds, the utterances overlap or cancel each other out in rapid succession.
* **Remediation:** Enforce a minimum cooldown between audio repetitions:
  ```typescript
  if (ratio <= 0.75 && !audioStagesTriggeredRef.current.has(75) && (now - lastAudioTime > 2500)) { ... }
  ```

---

## 4. 💡 Architectural Solutions & Target Refactorings

### 4.1. Recommended RTDB Schema Refactoring for Eigo Arena
```json
{
  "rooms": {
    "4821": {
      "state": {
        "status": "QUESTION",
        "currentQuestionIndex": 3,
        "startTime": 1727400000000,
        "timeLimitMs": 10000,
        "gamePlayType": "KAHOOT",
        "recallDelaySeconds": 0,
        "distractorEliminationMode": "GRADUAL",
        "question": {
          "id": "word_0142",
          "promptType": "JA_MEANING",
          "promptText": "りんご",
          "options": [
            { "id": "opt_1", "english": "apple", "symbol": "triangle", "color": "red" },
            { "id": "opt_2", "english": "banana", "symbol": "diamond", "color": "blue" },
            { "id": "opt_3", "english": "orange", "symbol": "circle", "color": "yellow" },
            { "id": "opt_4", "english": "peach", "symbol": "square", "color": "green" }
          ]
        }
      },
      "responses": {
        "student_uid_1": { "answerId": "opt_1", "timeTakenMs": 1420 },
        "student_uid_2": { "answerId": "opt_2", "timeTakenMs": 2100 }
      },
      "players": {
        "student_uid_1": { "nickname": "Taro 🐼", "score": 1250, "teamId": "team_red" },
        "student_uid_2": { "nickname": "Hanako 🐯", "score": 850, "teamId": "team_blue" }
      }
    }
  }
}
```
* **Student iPads listen ONLY to:** `rooms/4821/state` (Payload: < 1.2 KB).
* **Student iPads write ONLY to:** `rooms/4821/responses/${uid}`.
* **Teacher Smartboard listens to:** `rooms/4821/state`, `rooms/4821/responses`, and `rooms/4821/players`.
* **Zero Cheating:** `correctOptionId` does not exist in `rooms/4821/state`. It is kept privately by the teacher's browser until `status: 'REVEAL'`.

---

## Prioritized Implementation Action Plan

1. **Step 1 (Cheating & Security):** Remove `correctOptionId` from the student question transmission payload.
2. **Step 2 (Network Hardening):** Decouple student listeners from `rooms/${pin}/responses` to fix the $O(N^2)$ school Wi-Fi crash.
3. **Step 3 (Pedagogical Audio):** Connect `promptSound` in `QuizHostQuestion.tsx` and `QuizHostReveal.tsx` to `AudioContext.playWordAudio` so authentic MEXT native speaker recordings play instead of robotic Web Speech.
4. **Step 4 (F1 Sprint Race):** Replace the Read-Modify-Write in `submitSprintAnswer` with atomic `safeTransaction`.
5. **Step 5 (Display Standards):** Enforce Rule 6 back-row font sizing (`text-5xl sm:text-7xl md:text-8xl`) and card dimensions (`h-52 sm:h-72 md:h-80`) on `QuizHostQuestion.tsx`. Clean parenthetical English from Japanese mode titles.