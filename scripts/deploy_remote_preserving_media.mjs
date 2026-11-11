import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SITE_ID = process.env.FIREBASE_SITE_ID || 'levi-sensei';
const PERSISTENT_KEY_PATH = path.join(os.homedir(), '.gemini', 'firebase-service-account.json');

function loadServiceAccount() {
  // 1. Inline JSON from GitHub Actions / environment variable (FIREBASE_ADMIN_SDK or FIREBASE_SERVICE_ACCOUNT)
  const inlineEnv = process.env.FIREBASE_ADMIN_SDK || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inlineEnv && inlineEnv.trim().startsWith('{')) {
    return JSON.parse(inlineEnv);
  }

  // 2. Explicit file path from GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
  }

  // 3. Newly uploaded key in /home/antigravity/upload/ -> auto-persist to ~/.gemini/firebase-service-account.json
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

  // 4. Persistent ~/.gemini/firebase-service-account.json across Remote Antigravity VMs
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
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform'
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

async function apiFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    throw new Error(`API ${options.method || 'GET'} ${url} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

function walkDir(dir, baseDir = dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, baseDir, results);
    } else {
      const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`dist/ directory not found at ${DIST_DIR}. Run "npm run build" first.`);
  }

  const serviceAccount = loadServiceAccount();
  console.log('1. Minting OAuth2 token from Service Account...');
  const token = await getAccessToken(serviceAccount);

  console.log(`2. Fetching current live release for site "${SITE_ID}"...`);
  const releasesData = await apiFetch(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/releases?pageSize=1`,
    token
  );
  const latestRelease = releasesData.releases?.[0];
  if (!latestRelease || !latestRelease.version?.name) {
    throw new Error('Could not find current live release on site ' + SITE_ID);
  }

  const liveVersionName = latestRelease.version.name;
  const liveConfig = latestRelease.version.config;
  console.log(`   Current live version: ${liveVersionName} (Release time: ${latestRelease.releaseTime})`);

  console.log('3. Listing all files in current live version to preserve textbook media (/cards/** and /media/**)...');
  const liveFiles = {};
  let pageToken = '';
  let pageCount = 0;
  do {
    const url = new URL(`https://firebasehosting.googleapis.com/v1beta1/${liveVersionName}/files`);
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await apiFetch(url.toString(), token);
    for (const f of page.files || []) {
      if (f.path && f.hash && f.status === 'ACTIVE') {
        liveFiles[f.path] = f.hash;
      }
    }
    pageToken = page.nextPageToken || '';
    pageCount++;
  } while (pageToken);

  // Preserve all live files EXCEPT old Vite hashed bundles under /assets/
  const mergedFiles = {};
  let preservedMediaCount = 0;
  for (const [filePath, hash] of Object.entries(liveFiles)) {
    if (filePath.startsWith('/assets/')) continue;
    mergedFiles[filePath] = hash;
    preservedMediaCount++;
  }
  console.log(`   Preserved ${preservedMediaCount} existing static/media files from live release (${pageCount} pages).`);

  console.log('4. Hashing newly built files in dist/...');
  const localFiles = walkDir(DIST_DIR);
  const hashToGzipBuffer = new Map();
  for (const { fullPath, relPath } of localFiles) {
    const raw = fs.readFileSync(fullPath);
    const gzipped = zlib.gzipSync(raw, { level: 9 });
    const hash = crypto.createHash('sha256').update(gzipped).digest('hex');
    mergedFiles[relPath] = hash;
    hashToGzipBuffer.set(hash, { gzipped, relPath });
  }
  console.log(`   Hashed ${localFiles.length} local dist/ files. Total manifest size: ${Object.keys(mergedFiles).length} files.`);

  console.log('5. Creating new Firebase Hosting version...');
  const newVersion = await apiFetch(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ config: liveConfig })
    }
  );
  const newVersionName = newVersion.name;
  console.log(`   Created version: ${newVersionName}`);

  console.log('6. Populating file manifest on Firebase Hosting...');
  const populateRes = await apiFetch(
    `https://firebasehosting.googleapis.com/v1beta1/${newVersionName}:populateFiles`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ files: mergedFiles })
    }
  );

  const requiredHashes = populateRes.uploadRequiredHashes || [];
  const uploadUrl = populateRes.uploadUrl;
  console.log(`   Server requires uploading ${requiredHashes.length} new/changed file blobs.`);

  for (let i = 0; i < requiredHashes.length; i++) {
    const hash = requiredHashes[i];
    const item = hashToGzipBuffer.get(hash);
    if (!item) {
      throw new Error(`Server requested upload for unknown hash ${hash}`);
    }
    console.log(`   Uploading [${i + 1}/${requiredHashes.length}] ${item.relPath} (${(item.gzipped.length / 1024).toFixed(1)} KB gzipped)...`);
    const upRes = await fetch(`${uploadUrl}/${hash}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(item.gzipped.length)
      },
      body: item.gzipped
    });
    if (!upRes.ok) {
      throw new Error(`Upload failed for ${item.relPath} (${upRes.status}): ${await upRes.text()}`);
    }
  }

  console.log('7. Finalizing version...');
  await apiFetch(
    `https://firebasehosting.googleapis.com/v1beta1/${newVersionName}?updateMask=status`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'FINALIZED' })
    }
  );

  console.log('8. Publishing release to live channel...');
  const release = await apiFetch(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/releases?versionName=${encodeURIComponent(newVersionName)}`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        message: process.env.DEPLOY_MESSAGE || `Remote media-preserving deploy (${new Date().toISOString()})`
      })
    }
  );

  console.log(`✅ DEPLOYMENT COMPLETE!`);
  console.log(`   Release Name: ${release.name}`);
  console.log(`   Release Time: ${release.releaseTime}`);
  console.log(`   Live URL: https://${SITE_ID}.web.app`);
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err.message || err);
  process.exit(1);
});
