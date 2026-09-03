import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, Firestore } from 'firebase/firestore';

let moduleDir = process.cwd();
try {
  moduleDir = path.dirname(fileURLToPath(import.meta.url));
} catch {
  moduleDir = process.cwd();
}

const CACHE_FILE = path.join(process.cwd(), 'data', 'leaderboard_cache.json');

const runsCache = new Map<string, any>();
let firebaseDb: Firestore | null = null;
let lastFirestoreSyncAttempt = 0;
let lastSyncError: string | null = null;
let lastSyncSuccessTime: string | null = null;

function getDb(): Firestore | null {
  if (firebaseDb) return firebaseDb;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const databaseId = config.firestoreDatabaseId || '(default)';
    firebaseDb = getFirestore(app, databaseId);
    return firebaseDb;
  } catch (e) {
    console.warn('[Leaderboard Cache] Firebase initialization notice:', e);
    return null;
  }
}

function loadCacheFromDisk() {
  try {
    const candidates = [
      CACHE_FILE,
      path.join(process.cwd(), 'public', 'data', 'leaderboard_cache.json'),
      path.join(process.cwd(), 'dist', 'data', 'leaderboard_cache.json'),
      path.join(moduleDir, '..', 'data', 'leaderboard_cache.json'),
      path.join(moduleDir, '..', 'public', 'data', 'leaderboard_cache.json'),
      path.join(moduleDir, '..', 'dist', 'data', 'leaderboard_cache.json'),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          list.forEach((item) => {
            if (item && item.id) {
              runsCache.set(String(item.id), item);
            }
          });
          console.log(`[Leaderboard Cache] Loaded ${runsCache.size} cached benchmark runs from ${filePath}.`);
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[Leaderboard Cache] Failed reading disk cache:', e);
  }

  // If disk cache not available (e.g. fresh serverless cold-start), hydrate from Firestore
  if (runsCache.size === 0) {
    syncFromFirestore(true).catch(() => {});
  }
}

function persistCacheToDisk() {
  // In serverless environments (Vercel, Lambda), the local filesystem is read-only
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }
  try {
    const list = getAllRuns();
    // Safeguard directory existence
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(list.slice(0, 5000), null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Leaderboard Cache] Failed writing disk cache:', e);
  }
}

async function syncRunToFirestore(record: any) {
  const db = getDb();
  if (!db || !record || !record.id) return;
  try {
    const docRef = doc(db, 'benchmark_runs', String(record.id));
    const sanitized = JSON.parse(
      JSON.stringify({
        ...record,
        updatedAt: new Date().toISOString(),
      })
    );
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`[Leaderboard Cache] Synced run ${record.id} to Firestore.`);
  } catch (err: any) {
    // Log as a minor notice - server cache is already preserved
    console.warn(`[Leaderboard Cache] Firestore write notice for run ${record.id}:`, err?.message || err);
  }
}

export function getAllRuns(): any[] {
  try {
    if (runsCache.size === 0) {
      loadCacheFromDisk();
    }
    const list = Array.from(runsCache.values());
    return list.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('[Leaderboard Cache] Error in getAllRuns:', err);
    return [];
  }
}

export function saveRun(run: any): any {
  if (!run || !run.id) return null;
  runsCache.set(String(run.id), run);
  persistCacheToDisk();
  // Asynchronously sync to Firestore without blocking response
  syncRunToFirestore(run).catch(() => {});
  return run;
}

export function batchSync(incomingRuns: any[]): any[] {
  if (!Array.isArray(incomingRuns) || incomingRuns.length === 0) {
    return getAllRuns();
  }
  let added = 0;
  for (const item of incomingRuns) {
    if (item && item.id) {
      const key = String(item.id);
      if (!runsCache.has(key)) {
        runsCache.set(key, item);
        added++;
      }
    }
  }
  if (added > 0) {
    console.log(`[Leaderboard Cache] Merged ${added} new runs from client batch. Total runs: ${runsCache.size}`);
    persistCacheToDisk();
  }
  return getAllRuns();
}

export async function syncFromFirestore(force = false): Promise<number> {
  const now = Date.now();
  // Do not query Firestore more than once every 10 minutes unless forced
  if (!force && now - lastFirestoreSyncAttempt < 10 * 60 * 1000) {
    return runsCache.size;
  }
  lastFirestoreSyncAttempt = now;

  const db = getDb();
  if (!db) return runsCache.size;

  try {
    console.log('[Leaderboard Cache] Checking Firestore in background (1 read per 10min)...');
    const snapshot = await getDocs(collection(db, 'benchmark_runs'));
    let newCount = 0;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id || data.id;
      if (id && !runsCache.has(String(id))) {
        runsCache.set(String(id), { ...data, id });
        newCount++;
      }
    });
    lastSyncError = null;
    lastSyncSuccessTime = new Date().toISOString();
    console.log(`[Leaderboard Cache] Firestore read complete: +${newCount} new runs (${runsCache.size} total).`);
    if (newCount > 0) {
      persistCacheToDisk();
    }
    return runsCache.size;
  } catch (err: any) {
    lastSyncError = err?.message || 'Firestore quota exceeded';
    console.warn(`[Leaderboard Cache] Firestore read paused (${lastSyncError}). Serving ${runsCache.size} cached runs.`);
    return runsCache.size;
  }
}

export function getSyncStatus() {
  return {
    totalRuns: runsCache.size,
    lastSyncError,
    lastSyncSuccessTime,
    lastFirestoreSyncAttempt: lastFirestoreSyncAttempt ? new Date(lastFirestoreSyncAttempt).toISOString() : null,
  };
}

// Initialize on module load
loadCacheFromDisk();

// Only schedule background periodic timers in standalone server mode, never in serverless lambdas
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  setTimeout(() => {
    syncFromFirestore(false).catch(() => {});
  }, 5000);

  setInterval(() => {
    syncFromFirestore(false).catch(() => {});
  }, 15 * 60 * 1000);
}
