const fs = require('fs');
const content = fs.readFileSync('src/pages/QuizHostLive.jsx', 'utf8');

// Extract parts
const p1End = content.indexOf('  // 1. Build the Question Queue on mount using Smart Distractors');
const p1 = content.substring(0, p1End);

const ueEnd = content.indexOf('  // 2. Game Flow Functions');
const useEffects = content.substring(p1End, ueEnd);

const gffStart = ueEnd;
const snqStart = content.indexOf('  const startNextQuestion = useCallback(async (index) => {');
const raStart = content.indexOf('  const revealAnswer = useCallback(async (q) => {');
const csStart = content.indexOf('  const calculateScoresAndLeaderboard = useCallback(async (q) => {');
const npStart = content.indexOf('  const nextPhase = () => {');

const startGame = content.substring(gffStart, snqStart);
const startNextQuestion = content.substring(snqStart, raStart);
const revealAnswer = content.substring(raStart, csStart);
const calcScores = content.substring(csStart, npStart);
const theRest = content.substring(npStart);

// New order:
// calcScores
// revealAnswer
// startNextQuestion
// startGame
// useEffects
// theRest

const newContent = p1 + calcScores + revealAnswer + startNextQuestion + startGame + useEffects + theRest;
fs.writeFileSync('src/pages/QuizHostLive.jsx', newContent);
console.log('Done');
