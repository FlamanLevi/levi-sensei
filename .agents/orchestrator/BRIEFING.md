# BRIEFING — 2026-06-12T06:18:36+09:00

## Mission
Create a Node.js script `loadTest.js` to simulate 4 players joining a live trivia room, answering 5 questions, and verify that the `onGameComplete` Cloud Function successfully triggers at the end.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:/Users/levif/Documents/Borderlink/Github/levi-sensei/.agents/orchestrator
- Original parent: main agent
- Original parent conversation ID: 1cb59472-41c8-47ee-88ac-8619ee9f2eaf

## 🔒 My Workflow
- **Pattern**: Simple Single Task (no complex decomposition needed as it's just writing and running a single script).
- **Scope document**: c:/Users/levif/Documents/Borderlink/Github/levi-sensei/.agents/orchestrator/PROJECT.md
1. **Decompose**: We just need one worker to create the script and run it. Maybe an explorer to find how the db schema looks if not known, then a worker to implement it.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer → Worker → Reviewer
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: at 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Investigate codebase (Explorer) [pending]
  2. Implement loadTest.js (Worker) [pending]
  3. Execute loadTest.js and verify (Worker/Challenger) [pending]
- **Current phase**: 1
- **Current focus**: Investigate db schema and how a game works in Levi-Sensei

## 🔒 Key Constraints
- Never reuse a subagent after it has delivered its handoff — always spawn fresh
- Create loadTest.js script using Firebase Admin SDK or Firebase JS SDK to simulate 4 players.
- They must join a live Room PIN.
- Listen to trivia/gameState/status, write answers when LIVE for 5 questions.
- Game must progress to GAME_OVER and onGameComplete must trigger.

## Current Parent
- Conversation ID: 1cb59472-41c8-47ee-88ac-8619ee9f2eaf
- Updated: not yet

## Key Decisions Made
- Use teamwork_preview_explorer to investigate how Firebase Realtime DB and game flow works.
- Implement the test using teamwork_preview_worker.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|

## Succession Status
- Succession required: no
- Spawn count: 0 / 16
- Pending subagents: none
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: not started
- Safety timer: none

## Artifact Index
- c:/Users/levif/Documents/Borderlink/Github/levi-sensei/.agents/orchestrator/ORIGINAL_REQUEST.md — Original user request
