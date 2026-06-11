# Firebase Schema and Game Flow Investigation Report

## 1. Observation
- Using `view_file` on `src/pages/StudentJoin.jsx`:
  - Lobbies are checked via `get(ref(db, 'trivia/room'))`. A valid lobby requires `roomCode === pin` and `status === 'LOBBY'`.
  - Players join by writing to `trivia/players/{playerId}` with fields: `nickname`, `score: 0`, `currentStreak: 0`, `maxStreak: 0`, `fastestTime: 999999`, `correctCount: 0`, `lastActive: Date.now()`, and optional `teamId`, `avatar`, `color`.
  - Team assignment uses a transaction on `trivia/room/teamCounter`.
- Using `view_file` on `src/pages/QuizHostLive.jsx`:
  - `trivia/gameState` stores the current game state, updating properties like `status` (e.g., `'LIVE'`, `'REVEAL'`, `'LEADERBOARD'`, `'GAME_OVER'`), `questionNumber`, `timeLimit`, `options`, `targetId`, and `startTime`.
- Using `view_file` on `src/pages/QuizStudentLive.jsx`:
  - Students answer questions by running a transaction on `trivia/responses/{playerId}` to prevent multiple answers.
  - The payload written is `{ answer: optionId, timeTaken: timeTaken }`, where `timeTaken` is calculated using `estimatedServerTime - gameState.startTime`.
- Using `view_file` on `functions/index.js`:
  - The `onGameComplete` function triggers on `onValueWritten` at `trivia/gameState/status`.
  - It checks `if (status !== 'GAME_OVER') return null;`, then calculates and writes XP, coins, and match history to `users/{uid}/profile` and `users/{uid}/matchHistory`.

## 2. Logic Chain
1. **Joining Lobbies**: To join, a student inputs a PIN. The app reads `trivia/room` to match `roomCode`. If it matches and the room is open (`status: 'LOBBY'`), the client registers the user by writing initial game stats to `trivia/players/{playerId}`.
2. **Active Room Details**: The active room configuration is universally located at `trivia/room`, with its PIN stored in `trivia/room/roomCode`.
3. **Question Structure**: The host coordinates questions by updating `trivia/gameState`. This centralized path broadcasts the `status`, `options`, correct `targetId`, and `startTime` to all connected clients.
4. **Answer Submission**: When answering, students write to `trivia/responses/{playerId}`. They must pass the selected `answer` and their local calculation of `timeTaken`.
5. **Game Over Execution**: Once the host changes the phase to `GAME_OVER`, the Firebase Cloud Function detects the change in `trivia/gameState/status`, aggregates scores from `trivia/players`, and applies persistence updates to user profiles (coins, XP, history).

## 3. Caveats
- I did not explore the `ohajiki` game schema, only `trivia`, as the request specifically asked for `trivia` endpoints.
- I did not verify how specific items or buffs modify the `timeTaken` beyond standard calculations.
- I assumed the legacy code fallback values are not primary logic paths.

## 4. Conclusion
- **Lobby Join**: Read `trivia/room/roomCode`, write to `trivia/players/{playerId}` (with base schema: `nickname`, `score: 0`, `fastestTime: 999999`, etc.).
- **Active PIN/Session**: Found at `trivia/room/roomCode` and state at `trivia/gameState`.
- **Question Structure**: Managed via `trivia/gameState` containing `status`, `options`, `targetId`, `startTime`, and `timeLimit`.
- **Answer Submission**: Transactional write to `trivia/responses/{playerId}` containing `{ answer: optionId, timeTaken: timeTaken }`.
- **Game Over**: Triggered when `trivia/gameState/status` equals `'GAME_OVER'`. The Cloud Function in `functions/index.js` handles coin/XP rewards.

## 5. Verification Method
- **Verify Lobby Join**: Review `src/pages/StudentJoin.jsx`, around line 134 for room fetching and line 69 for player creation.
- **Verify Answer Logic**: Review `src/pages/QuizStudentLive.jsx`, around line 86 for the transaction on `trivia/responses/{playerId}`.
- **Verify Cloud Function**: Review `functions/index.js`, around line 8 to see the trigger `onValueWritten` to `trivia/gameState/status`.
