const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../src/pages/QuizHostLive.jsx');
let content = fs.readFileSync(p, 'utf8');

// 1. Replace vocabulary import
content = content.replace(
  "import vocabularyData from '../data/vocabulary.json';",
  "import flatVocab from '../data/flat_vocabulary.json';"
);

// 2. Add Host component imports
content = content.replace(
  "import { useGameState } from '../hooks/useGameState';",
  "import { useGameState } from '../hooks/useGameState';\nimport { HostLobby } from '../components/quiz/host/HostLobby';\nimport { HostQuestion } from '../components/quiz/host/HostQuestion';\nimport { HostReveal } from '../components/quiz/host/HostReveal';\nimport { HostLeaderboard } from '../components/quiz/host/HostLeaderboard';\nimport { HostGameOver } from '../components/quiz/host/HostGameOver';"
);

// 3. Remove unused imports and constants
content = content.replace(
  "import Confetti from 'react-confetti';\nimport { RubyText } from '../components/RubyText';\n\n// Helper to shuffle arrays\nconst shuffle = (array) => [...array].sort(() => Math.random() - 0.5);\n\nconst COLORS = [\n  'bg-red-500 border-red-700',\n  'bg-blue-500 border-blue-700',\n  'bg-yellow-400 border-yellow-600 text-black',\n  'bg-green-500 border-green-700'\n];",
  "// Helper to shuffle arrays\nconst shuffle = (array) => [...array].sort(() => Math.random() - 0.5);"
);

// 4. Update pool logic
const oldLoop = `    let pool = [];
    selectedUnits.forEach(unitKey => {
      const [gradeId, unitId] = unitKey.split('|');
      const grade = vocabularyData[gradeId];
      if (grade && grade.units && grade.units[unitId]) {
        pool = pool.concat(grade.units[unitId].words);
      }
    });`;

const newLoop = `    const pool = flatVocab.words.filter(w => selectedUnits.includes(w.unit_id));`;

content = content.replace(oldLoop, newLoop);

fs.writeFileSync(p, content, 'utf8');
console.log("Updated QuizHostLive.jsx");
