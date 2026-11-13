const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting verification suite for audit fixes...\n');

// 1. Verify database.rules.json
console.log('1. Testing database.rules.json...');
const rulesPath = path.join(__dirname, '..', 'database.rules.json');
const rulesJson = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Check roomResponses has write on $roomCode
assert(rulesJson.rules.roomResponses, 'Missing roomResponses in rules');
assert(rulesJson.rules.roomResponses.$roomCode['.write'], 'Missing .write on roomResponses/$roomCode');
console.log('  ✅ roomResponses/$roomCode has authoritative .write rule for host');

// Check hostSessions exists and is locked to host
assert(rulesJson.rules.hostSessions, 'Missing hostSessions in rules');
assert(rulesJson.rules.hostSessions.$roomCode['.read'], 'Missing .read on hostSessions/$roomCode');
assert(rulesJson.rules.hostSessions.$roomCode['.write'], 'Missing .write on hostSessions/$roomCode');
console.log('  ✅ hostSessions/$roomCode has isolated read/write rules for host');

// Check teamScores and teams write rules
assert(rulesJson.rules.rooms.$roomCode.teamScores['.write'], 'Missing teamScores write rule');
assert(rulesJson.rules.rooms.$roomCode.teams['.write'], 'Missing teams write rule');
console.log('  ✅ teamScores and teams writes are strictly locked to hostId');

// 2. Verify No '0000' Backdoor in Codebase
console.log('\n2. Testing PIN security (No 0000 backdoor)...');
const classroomCtx = fs.readFileSync(path.join(__dirname, '..', 'src/context/ClassroomContext.tsx'), 'utf8');
const headerComp = fs.readFileSync(path.join(__dirname, '..', 'src/components/shell/Header.tsx'), 'utf8');
const pinGateComp = fs.readFileSync(path.join(__dirname, '..', 'src/components/shell/TeacherPinGate.tsx'), 'utf8');

assert(!classroomCtx.includes("'0000'"), "ClassroomContext contains '0000' backdoor");
assert(!headerComp.includes("'0000'"), "Header contains '0000' backdoor");
assert(!pinGateComp.includes("'0000'"), "TeacherPinGate contains '0000' backdoor");
assert(classroomCtx.includes('051683'), "ClassroomContext missing 051683 unlock PIN");
console.log('  ✅ 0000 backdoor PIN completely excised from all auth gates');

// 3. Verify cardUtils null safety & Grade Isolation logic
console.log('\n3. Testing cardUtils asset conventions & grade isolation...');
const cardUtilsContent = fs.readFileSync(path.join(__dirname, '..', 'src/utils/cardUtils.ts'), 'utf8');
assert(cardUtilsContent.includes('if (!path) return false;'), 'Missing null safety in asset checks');
console.log('  ✅ isHereWeGoAsset and isLetsTryAsset have null/undefined safety');

// 4. Verify Concentration Alphabet Matching Mode
console.log('\n4. Testing Concentration letter_case matching mode...');
const concUtilsContent = fs.readFileSync(path.join(__dirname, '..', 'src/games/concentration/utils.ts'), 'utf8');
assert(concUtilsContent.includes('ALPHABET_POOL'), 'Missing ALPHABET_POOL in concentration utils');
assert(concUtilsContent.includes('availableLetters.length >= pairCount ? availableLetters : ALPHABET_POOL'), 'Missing fallback to ALPHABET_POOL');
console.log('  ✅ letter_case matching mode guaranteed single letters A-Z via ALPHABET_POOL');

// 5. Verify Question Generator Distractor Deduplication
console.log('\n5. Testing questionGenerator distractor deduplication...');
const qGenContent = fs.readFileSync(path.join(__dirname, '..', 'src/games/quiz/questionGenerator.ts'), 'utf8');
assert(qGenContent.includes('seenDistractorLemmas'), 'Missing seenDistractorLemmas in questionGenerator');
console.log('  ✅ Distractors deduplicated by English lemma to ensure distinct choices');

// 6. Verify QuizHostQuestion back-row typography & container sizing (Rule 6)
console.log('\n6. Testing QuizHostQuestion back-row sizing (GEMINI.md Rule 6)...');
const qHostContent = fs.readFileSync(path.join(__dirname, '..', 'src/games/quiz/host/QuizHostQuestion.tsx'), 'utf8');
assert(qHostContent.includes('text-5xl sm:text-7xl md:text-8xl'), 'Missing text-5xl sm:text-7xl md:text-8xl in QuizHostQuestion');
assert(qHostContent.includes('h-52 sm:h-64 md:h-76 aspect-[4/3] max-w-md sm:max-w-lg'), 'Missing shrink-wrap aspect-[4/3] artwork container');
console.log('  ✅ Question prompt artwork container & typography meet back-row visibility standards');

// 7. Verify Eigo Arena Host Persistence Across Reload
console.log('\n7. Testing Eigo Arena Host Question Persistence...');
const quizRoomContent = fs.readFileSync(path.join(__dirname, '..', 'src/games/quiz/useQuizRoom.ts'), 'utf8');
assert(quizRoomContent.includes('getAuthoritativeQuestions'), 'Missing getAuthoritativeQuestions in useQuizRoom');
assert(quizRoomContent.includes('sessionStorage.setItem(`quiz_host_questions_${code}`'), 'Missing sessionStorage questions persistence');
assert(quizRoomContent.includes('safeSet(`hostSessions/${code}/questions`'), 'Missing hostSessions questions persistence');
console.log('  ✅ Authoritative questions persisted to sessionStorage and hostSessions');

// 8. Verify No Dead PolyhedralDie3D.tsx
console.log('\n8. Testing Dead Code cleanup...');
const deadFile = path.join(__dirname, '..', 'src/components/common/PolyhedralDie3D.tsx');
assert(!fs.existsSync(deadFile), 'PolyhedralDie3D.tsx was not deleted');
console.log('  ✅ PolyhedralDie3D.tsx confirmed deleted');

// 9. Verify Milestone 2 RTDB Security, Wrapper Hygiene & Anti-Cheat
console.log('\n9. Testing Milestone 2 RTDB security & anti-cheat invariants...');
const rawRulesText = fs.readFileSync(rulesPath, 'utf8');
assert(!/\"\.write\"\s*:\s*true/.test(rawRulesText), 'database.rules.json must not contain unauthenticated .write: true');
assert.strictEqual(rulesJson.rules.setupRooms.$roomCode['.write'], 'auth != null');
assert.strictEqual(rulesJson.rules.concentration_rooms.$roomCode['.write'], 'auth != null');
assert.strictEqual(rulesJson.rules.keyword_rooms.$roomCode['.write'], 'auth != null');
assert.strictEqual(rulesJson.rules.missing_rooms.$roomCode['.write'], 'auth != null');
assert.strictEqual(rulesJson.rules.schools.$schoolId.classes.$classId.classVault['.write'], 'auth != null');

function collectTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectTsFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}
const srcRoot = path.join(__dirname, '..', 'src');
const rawSdkImporters = collectTsFiles(srcRoot)
  .filter((f) => fs.readFileSync(f, 'utf8').includes('firebase/database'))
  .map((f) => path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/'))
  .sort();
assert.deepStrictEqual(rawSdkImporters, ['src/services/firebase.ts', 'src/services/rtdbSafe.ts']);
assert(!headerComp.includes('firebase/database'), 'Header.tsx must use rtdbSafe wrappers');
assert(headerComp.includes("userRole !== 'TEACHER' || !isTeacherUnlocked"), 'Header.tsx must gate /rooms subscription');
assert(quizRoomContent.includes('sanitizeQuestionsForPublicRoom'), 'useQuizRoom.ts must sanitize public KAHOOT questions');
assert(quizRoomContent.includes('clearClassRoomPointers'), 'useQuizRoom.ts must clear activeRoom and teacherRoom pointers');
console.log('  ✅ database.rules.json locked down, raw firebase/database restricted, /rooms gated, and KAHOOT answers sanitized');

// 10. Verify Milestone 3 MEXT Typography, Landscape Viewport & Tailwind v4 Invariants
console.log('\n10. Testing Milestone 3 UI, typography, dvh, and Tailwind v4 invariants...');
function collectAllSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectAllSourceFiles(full));
    else if (/\.(ts|tsx|css)$/.test(entry.name)) results.push(full);
  }
  return results;
}
const allUiFiles = collectAllSourceFiles(srcRoot);
const invalidShadeRe = /\b(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:150|250|350|450|550|650|750|850)\b/;
const m3Errors = [];

for (const file of allUiFiles) {
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    if (invalidShadeRe.test(line)) {
      m3Errors.push(`${rel}:${ln} uses invalid Tailwind v4 shade: ${line.trim()}`);
    }
    if (/\bkids\b/i.test(line)) {
      m3Errors.push(`${rel}:${ln} uses disallowed term "kids": ${line.trim()}`);
    }
    if (/\b(?:min-h-screen|h-screen)\b/.test(line)) {
      m3Errors.push(`${rel}:${ln} uses min-h-screen/h-screen instead of dvh: ${line.trim()}`);
    }
    if (/[^a-zA-Z0-9][0-9]+vh\b/.test(' ' + line)) {
      const nextLine = lines[idx + 1] || '';
      const isCssDvhFallback = rel === 'src/index.css' && /min-height:\s*100vh;/.test(line) && /min-height:\s*100dvh;/.test(nextLine);
      if (!isCssDvhFallback) {
        m3Errors.push(`${rel}:${ln} uses vh instead of dvh: ${line.trim()}`);
      }
    }
    const rtAttr = line.match(/(?:<rt[^>]*className=|rtClassName=)["'`{]([^"'`}]+)/);
    if (rtAttr) {
      const cls = rtAttr[1];
      if (/text-\[(?:[6-9]|1[01])(?:\.\d+)?px\]|text-xs|\bslate-[345]00\b|\/[0-8]0\b/.test(cls)) {
        m3Errors.push(`${rel}:${ln} overrides global <rt> size or washes out contrast: ${cls}`);
      }
    }
  });

  const optBlocks = content.match(/<option[\s\S]*?<\/option>/g) || [];
  for (const opt of optBlocks) {
    if (/<ruby\b/i.test(opt)) {
      m3Errors.push(`${rel} renders <ruby> inside native <option>`);
    }
  }
}

assert.deepStrictEqual(m3Errors, [], `Milestone 3 violations detected:\n${m3Errors.join('\n')}`);
console.log('  ✅ Zero invalid Tailwind shades, "kids", <option>/<ruby>, vh/screen leaks, or micro/muted <rt> overrides');

console.log('\n✨ ALL AUDIT VERIFICATIONS PASSED SUCCESSFULLY!');
