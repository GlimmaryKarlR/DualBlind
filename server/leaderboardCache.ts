import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, query, limit, Firestore } from 'firebase/firestore';

let moduleDir = process.cwd();
try {
  moduleDir = path.dirname(fileURLToPath(import.meta.url));
} catch {
  moduleDir = process.cwd();
}

const CACHE_FILE = path.join(process.cwd(), 'data', 'leaderboard_cache.json');
const JSONL_BACKUP_FILE = path.join(process.cwd(), 'arena_runs_local.jsonl');

const runsCache = new Map<string, any>();
let firebaseDb: Firestore | null = null;
let lastFirestoreSyncAttempt = 0;
let lastSyncError: string | null = null;
let lastSyncSuccessTime: string | null = null;
let knownFirestoreCount = 3359;
let firestoreQuotaCooldownUntil = 0;

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

/**
 * Check and ingest runs from all local files (JSON & JSONL).
 * Consumes 0 Firestore reads.
 */
export function checkAndIngestLocalFiles(): number {
  const fileCandidates = [
    JSONL_BACKUP_FILE,
    path.join(process.cwd(), 'data', 'arena_runs_local.jsonl'),
  ];

  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (fs.existsSync(dataDir)) {
      const entries = fs.readdirSync(dataDir);
      for (const entry of entries) {
        if (entry.endsWith('.jsonl') || (entry.endsWith('.json') && entry !== 'leaderboard_cache.json')) {
          fileCandidates.push(path.join(dataDir, entry));
        }
      }
    }
  } catch {}

  let newItems = 0;
  for (const filePath of fileCandidates) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (filePath.endsWith('.jsonl')) {
          const lines = content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const item = JSON.parse(trimmed);
              if (item && item.id) {
                const key = String(item.id);
                if (!runsCache.has(key)) {
                  runsCache.set(key, item);
                  newItems++;
                }
              }
            } catch {}
          }
        } else if (filePath.endsWith('.json')) {
          try {
            const parsed = JSON.parse(content);
            const list = Array.isArray(parsed) ? parsed : (parsed.runs || []);
            for (const item of list) {
              if (item && item.id) {
                const key = String(item.id);
                if (!runsCache.has(key)) {
                  runsCache.set(key, item);
                  newItems++;
                }
              }
            }
          } catch {}
        }
      } catch (e) {
        console.warn(`[Leaderboard Cache] Error reading local file ${filePath}:`, e);
      }
    }
  }

  if (newItems > 0) {
    console.log(`[Leaderboard Cache] Ingested ${newItems} new runs from local files. Total runs: ${runsCache.size}`);
    persistCacheToDisk();
  }
  return newItems;
}

/**
 * Import raw file content (JSON or JSONL string) into local cache.
 * Consumes 0 Firestore reads.
 */
export function importRawRunsContent(raw: string): { added: number; total: number } {
  if (!raw || typeof raw !== 'string') {
    return { added: 0, total: runsCache.size };
  }

  const newRuns: any[] = [];
  const trimmed = raw.trim();

  // Try parsing as JSON array first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : (parsed.runs || [parsed]);
      for (const item of list) {
        if (item && item.id) {
          const key = String(item.id);
          if (!runsCache.has(key)) {
            runsCache.set(key, item);
            newRuns.push(item);
          }
        }
      }
    } catch {
      // Fall through to JSONL parsing
    }
  }

  // Parse as JSONL line by line
  if (newRuns.length === 0) {
    const lines = raw.split('\n');
    for (const line of lines) {
      const lineTrimmed = line.trim();
      if (!lineTrimmed) continue;
      try {
        const item = JSON.parse(lineTrimmed);
        if (item && item.id) {
          const key = String(item.id);
          if (!runsCache.has(key)) {
            runsCache.set(key, item);
            newRuns.push(item);
          }
        }
      } catch {}
    }
  }

  if (newRuns.length > 0) {
    persistCacheToDisk();

    // Also append to local JSONL backup
    try {
      const linesToAppend = newRuns.map((r) => JSON.stringify(r)).join('\n') + '\n';
      fs.appendFileSync(JSONL_BACKUP_FILE, linesToAppend, 'utf-8');
    } catch (e) {
      console.warn('[Leaderboard Cache] Notice appending to JSONL backup:', e);
    }
  }

  return { added: newRuns.length, total: runsCache.size };
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
          break;
        }
      }
    }
  } catch (e) {
    console.warn('[Leaderboard Cache] Failed reading disk cache:', e);
  }

  // Also ingest any local JSONL runs
  checkAndIngestLocalFiles();
}

function persistCacheToDisk() {
  // In serverless environments (Vercel, Lambda), the local filesystem is read-only
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }
  try {
    const list = getAllRuns();
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
  // If Firestore is currently in a quota cooldown, skip write to avoid spamming errors
  if (Date.now() < firestoreQuotaCooldownUntil) {
    return;
  }

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
    const message = err?.message || String(err);
    if (message.includes('Quota limit exceeded') || message.includes('RESOURCE_EXHAUSTED')) {
      // Cooldown for 30 minutes to preserve free tier quota
      firestoreQuotaCooldownUntil = Date.now() + 30 * 60 * 1000;
      console.warn(`[Leaderboard Cache] Firestore quota paused. Next cloud write attempt in 30m. (Local runs are safely preserved)`);
    } else {
      console.warn(`[Leaderboard Cache] Firestore write notice for run ${record.id}:`, message);
    }
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

export async function saveRun(run: any): Promise<any> {
  if (!run || !run.id) return null;
  runsCache.set(String(run.id), run);
  persistCacheToDisk();

  // Also append to local JSONL file immediately
  try {
    fs.appendFileSync(JSONL_BACKUP_FILE, JSON.stringify(run) + '\n', 'utf-8');
  } catch (e) {
    // Non-blocking
  }

  // Background cloud mirror (safe, skips if quota exceeded)
  syncRunToFirestore(run).catch(() => {});
  return run;
}

export function batchSync(incomingRuns: any[]): any[] {
  if (!Array.isArray(incomingRuns) || incomingRuns.length === 0) {
    return getAllRuns();
  }
  let added = 0;
  const newRuns: any[] = [];
  for (const item of incomingRuns) {
    if (item && item.id) {
      const key = String(item.id);
      if (!runsCache.has(key)) {
        runsCache.set(key, item);
        newRuns.push(item);
        added++;
      }
    }
  }
  if (added > 0) {
    console.log(`[Leaderboard Cache] Merged ${added} new runs from client batch. Total runs: ${runsCache.size}`);
    persistCacheToDisk();
    try {
      const lines = newRuns.map((r) => JSON.stringify(r)).join('\n') + '\n';
      fs.appendFileSync(JSONL_BACKUP_FILE, lines, 'utf-8');
    } catch {}
  }
  return getAllRuns();
}

/**
 * Synchronize from Firestore without exhausting free read quota.
 * Uses a limited query (max 50 documents) instead of scanning thousands of records.
 */
export async function syncFromFirestore(force = false): Promise<number> {
  const now = Date.now();
  // Do not query Firestore more than once every 15 minutes unless forced
  if (!force && now - lastFirestoreSyncAttempt < 15 * 60 * 1000) {
    return runsCache.size;
  }
  lastFirestoreSyncAttempt = now;

  const db = getDb();
  if (!db) return runsCache.size;

  try {
    // Use limit(50) so checking Firestore only consumes <=50 reads instead of 3,359 reads!
    console.log('[Leaderboard Cache] Checking Firestore (limited to 50 reads max)...');
    const runsQuery = query(collection(db, 'benchmark_runs'), limit(50));
    const snapshot = await getDocs(runsQuery);
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
    knownFirestoreCount = Math.max(knownFirestoreCount, runsCache.size);
    console.log(`[Leaderboard Cache] Firestore check complete: +${newCount} new runs (${runsCache.size} total).`);
    if (newCount > 0) {
      persistCacheToDisk();
    }
    return runsCache.size;
  } catch (err: any) {
    lastSyncError = err?.message || 'Firestore quota exceeded';
    if (lastSyncError && (lastSyncError.includes('Quota limit exceeded') || lastSyncError.includes('RESOURCE_EXHAUSTED'))) {
      firestoreQuotaCooldownUntil = Date.now() + 30 * 60 * 1000;
    }
    console.warn(`[Leaderboard Cache] Firestore read paused (${lastSyncError}). Serving ${runsCache.size} cached runs.`);
    return runsCache.size;
  }
}

export function getSyncStatus() {
  const isQuotaExceeded = Boolean(
    Date.now() < firestoreQuotaCooldownUntil ||
    (lastSyncError &&
      (lastSyncError.includes('Quota limit exceeded') ||
       lastSyncError.includes('quota metric') ||
       lastSyncError.includes('RESOURCE_EXHAUSTED')))
  );

  return {
    totalRuns: runsCache.size,
    firestoreDocumentCount: Math.max(knownFirestoreCount, runsCache.size),
    isQuotaExceeded,
    lastSyncError,
    lastSyncSuccessTime,
    lastFirestoreSyncAttempt: lastFirestoreSyncAttempt ? new Date(lastFirestoreSyncAttempt).toISOString() : null,
    upgradeUrl: 'https://console.firebase.google.com/project/gen-lang-client-0400436491/firestore/databases/ai-studio-dualblindaibench-6b64ee16-ae5b-4d86-99d7-236b77bc5829/data?openUpgradeDialog=true',
  };
}

// Initialize on module load
loadCacheFromDisk();

// In standalone server mode, check local files periodically (0 Firestore reads)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  setTimeout(() => {
    checkAndIngestLocalFiles();
  }, 2000);

  // Periodic local file check every 5 minutes (0 Firestore reads)
  setInterval(() => {
    checkAndIngestLocalFiles();
  }, 5 * 60 * 1000);
}
