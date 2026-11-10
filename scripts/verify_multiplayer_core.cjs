// Delegate to real TypeScript verification suite (imports directly from src/)
const { execSync } = require('child_process');
const path = require('path');

const tsScript = path.resolve(__dirname, 'verify_multiplayer_core.ts');
try {
  execSync(`npx tsx "${tsScript}"`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
} catch (err) {
  process.exit(1);
}
