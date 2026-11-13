import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

// Ensure Node 24's built-in fetch honors HTTP_PROXY / HTTPS_PROXY on sandboxed remote VMs.
if ((process.env.HTTPS_PROXY || process.env.HTTP_PROXY) && process.env.NODE_USE_ENV_PROXY !== '1') {
  try {
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
      stdio: 'inherit'
    });
    process.exit(0);
  } catch (err) {
    process.exit(typeof err?.status === 'number' ? err.status : 1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const RULES_PATH = path.join(ROOT_DIR, 'database.rules.json');
const DATABASE_URL = (
  process.env.FIREBASE_DATABASE_URL ||
  'https://levi-sensei-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/+$/, '');
const PERSISTENT_KEY_PATH = path.join(os.homedir(), '.gemini', 'firebase-service-account.json');

const args = new Set(process.argv.slice(2));
const IS_DRY_RUN = args.has('--dry-run');
const IS_FORCE = args.has('--force');

function loadServiceAccount() {
  const inlineEnv = process.env.FIREBASE_ADMIN_SDK || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inlineEnv && inlineEnv.trim().startsWith('{')) {
    return JSON.parse(inlineEnv);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  }

  const uploadDir = '/home/antigravity/upload';
  if (fs.existsSync(uploadDir)) {
    const candidates = fs.readdirSync(uploadDir).filter((f) => f.includes('firebase-adminsdk') && f.endsWith('.json'));
    if (candidates.length > 0) {
      const uploadedPath = path.join(uploadDir, candidates[0]);
      const raw = fs.readFileSync(uploadedPath, 'utf8');
      const parsed = JSON.parse(raw);
      try {
        fs.mkdirSync(path.dirname(PERSISTENT_KEY_PATH), { recursive: true });
        fs.writeFileSync(PERSISTENT_KEY_PATH, raw, { mode: 0o600 });
        fs.unlinkSync(uploadedPath);
        const rootSymlink = path.join('/home/antigravity', candidates[0]);
        if (fs.existsSync(rootSymlink)) fs.unlinkSync(rootSymlink);
        console.log(`🔒 Saved Firebase Service Account key to persistent ${PERSISTENT_KEY_PATH} for future remote sessions.`);
      } catch {
        // Ignore persistence errors if read-only
      }
      return parsed;
    }
  }

  if (fs.existsSync(PERSISTENT_KEY_PATH)) {
    return JSON.parse(fs.readFileSync(PERSISTENT_KEY_PATH, 'utf8'));
  }

  throw new Error(
    `No Firebase Service Account key found.\n` +
      `Checked: FIREBASE_SERVICE_ACCOUNT env, GOOGLE_APPLICATION_CREDENTIALS, /home/antigravity/upload/*firebase-adminsdk*.json, and ${PERSISTENT_KEY_PATH}`
  );
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: [
      'https://www.googleapis.com/auth/firebase.database',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/firebase',
      'https://www.googleapis.com/auth/cloud-platform'
    ].join(' ')
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer
    .sign(serviceAccount.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`
    })
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function main() {
  if (!fs.existsSync(RULES_PATH)) {
    throw new Error(`database.rules.json not found at ${RULES_PATH}`);
  }

  const rawLocalRules = fs.readFileSync(RULES_PATH, 'utf8');
  const parsedLocalRules = JSON.parse(rawLocalRules);
  if (!parsedLocalRules || typeof parsedLocalRules !== 'object' || !parsedLocalRules.rules) {
    throw new Error('database.rules.json must contain a top-level "rules" object.');
  }

  const serviceAccount = loadServiceAccount();
  console.log('1. Minting OAuth2 token from Service Account...');
  const token = await getAccessToken(serviceAccount);

  const rulesEndpoint = `${DATABASE_URL}/.settings/rules.json`;

  console.log(`2. Fetching current live RTDB rules from ${DATABASE_URL}...`);
  const getRes = await fetch(rulesEndpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!getRes.ok) {
    throw new Error(`Failed to fetch live RTDB rules (${getRes.status}): ${await getRes.text()}`);
  }
  const rawLiveRules = await getRes.text();
  const parsedLiveRules = JSON.parse(rawLiveRules);
  const alreadyMatches = JSON.stringify(parsedLiveRules) === JSON.stringify(parsedLocalRules);
  console.log(`   Live rules match local database.rules.json: ${alreadyMatches ? 'YES' : 'NO (update needed)'}`);

  if (alreadyMatches && !IS_FORCE) {
    console.log('✅ Live RTDB rules already match database.rules.json — nothing to update.');
    return;
  }

  console.log('3. Validating local database.rules.json via server dryRun...');
  const dryRes = await fetch(`${rulesEndpoint}?dryRun=true`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: rawLocalRules
  });
  if (!dryRes.ok) {
    throw new Error(`RTDB rules dry-run validation failed (${dryRes.status}): ${await dryRes.text()}`);
  }
  console.log('   ✅ Server dryRun validation passed.');

  if (IS_DRY_RUN) {
    console.log('✅ --dry-run requested; exiting without modifying live RTDB rules.');
    return;
  }

  console.log('4. Publishing hardened database.rules.json to live RTDB...');
  const putRes = await fetch(rulesEndpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: rawLocalRules
  });
  if (!putRes.ok) {
    throw new Error(`Failed to publish RTDB rules (${putRes.status}): ${await putRes.text()}`);
  }

  console.log('5. Verifying deployed live RTDB rules...');
  const verifyRes = await fetch(rulesEndpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!verifyRes.ok) {
    throw new Error(`Post-deploy verification fetch failed (${verifyRes.status}): ${await verifyRes.text()}`);
  }
  const parsedVerified = JSON.parse(await verifyRes.text());
  if (JSON.stringify(parsedVerified) !== JSON.stringify(parsedLocalRules)) {
    throw new Error('Deployed live RTDB rules do not match database.rules.json after PUT.');
  }

  console.log(`✅ RTDB RULES DEPLOYED & VERIFIED LIVE on ${DATABASE_URL}`);
}

main().catch((err) => {
  console.error('❌ RTDB rules deployment failed:', err.message || err);
  process.exit(1);
});
