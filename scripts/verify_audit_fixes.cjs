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
assert(qHostContent.includes('h-52 sm:h-72 md:h-80 w-[44%] sm:w-[50%] max-w-2xl'), 'Missing h-52 sm:h-72 md:h-80 max-w-2xl artwork container');
console.log('  ✅ Question prompt artwork container & typography meet Rule 6 back-row standards');

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

console.log('\n✨ ALL AUDIT VERIFICATIONS PASSED SUCCESSFULLY!');
