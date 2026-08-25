import { BenchmarkRunRecord } from '../types/benchmark';
import { getFirestoreDb } from '../lib/firebase';
import { HISTORICAL_BENCHMARK_RUNS } from '../data/historicalRuns';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  limit,
  Unsubscribe,
} from 'firebase/firestore';

const STORAGE_KEY = 'dualblind_benchmark_runs_v1';
const FIRESTORE_COLLECTION = 'benchmark_runs';

export const SEED_RUNS: BenchmarkRunRecord[] = HISTORICAL_BENCHMARK_RUNS;

/**
 * Merge and deduplicate runs by ID, sorting by newest date first.
 */
export function mergeAndDeduplicateRuns(
  primary: BenchmarkRunRecord[],
  fallback: BenchmarkRunRecord[]
): BenchmarkRunRecord[] {
  const map = new Map<string, BenchmarkRunRecord>();
  // Fallbacks first (e.g. historical baseline)
  for (const item of fallback) {
    if (item && item.id) map.set(item.id, item);
  }
  // Primary overwrite (cloud runs or newest local runs)
  for (const item of primary) {
    if (item && item.id) map.set(item.id, item);
  }

  const list = Array.from(map.values());
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 500);
}

/**
 * Get runs cached locally in browser
 */
export function getStoredRuns(): BenchmarkRunRecord[] {
  if (typeof window === 'undefined') return SEED_RUNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RUNS));
      return SEED_RUNS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mergeAndDeduplicateRuns(parsed, SEED_RUNS);
    }
    return SEED_RUNS;
  } catch (e) {
    console.warn('Failed to load runs from localStorage, returning baseline runs:', e);
    return SEED_RUNS;
  }
}

/**
 * Clean data for Firestore (remove undefined values, ensure json compatibility)
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Save run record universally (to Firestore Cloud Database + local storage)
 */
export async function saveRunUniversal(record: BenchmarkRunRecord): Promise<BenchmarkRunRecord[]> {
  // 1. Immediately cache locally
  let updatedLocal: BenchmarkRunRecord[] = [record];
  try {
    const current = getStoredRuns();
    updatedLocal = mergeAndDeduplicateRuns([record], current);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocal));
  } catch (e) {
    console.warn('Local storage cache update failed:', e);
  }

  // 2. Persist to Firestore Universal Database
  const db = getFirestoreDb();
  if (db) {
    try {
      const sanitizedRecord = sanitizeForFirestore({
        ...record,
        updatedAt: new Date().toISOString(),
      });
      const docRef = doc(db, FIRESTORE_COLLECTION, record.id);
      await setDoc(docRef, sanitizedRecord, { merge: true });
      console.info(`[Universal Leaderboard] Benchmark run ${record.id} synced to Firestore.`);
    } catch (firestoreErr) {
      console.error('[Universal Leaderboard] Cloud sync error:', firestoreErr);
    }
  }

  return updatedLocal;
}

/**
 * Upload an array of benchmark runs to Firestore
 */
export async function uploadRunsToCloud(runs: BenchmarkRunRecord[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    for (const run of runs) {
      if (!run || !run.id) continue;
      const sanitized = sanitizeForFirestore({
        ...run,
        updatedAt: new Date().toISOString(),
      });
      const docRef = doc(db, FIRESTORE_COLLECTION, run.id);
      await setDoc(docRef, sanitized, { merge: true });
    }
    console.info(`[Universal Leaderboard] Successfully synced ${runs.length} runs to Firestore.`);
  } catch (e) {
    console.warn('[Universal Leaderboard] Batch upload to cloud notice:', e);
  }
}

/**
 * Backward-compatible synchronous wrapper for local save, calls universal save asynchronously
 */
export function saveRunToStorage(record: BenchmarkRunRecord): BenchmarkRunRecord[] {
  saveRunUniversal(record).catch((err) => {
    console.error('Async Firestore sync error in saveRunToStorage:', err);
  });
  return getStoredRuns();
}

/**
 * Fetch all universal runs directly from Firestore
 */
export async function fetchUniversalLeaderboard(): Promise<BenchmarkRunRecord[]> {
  const db = getFirestoreDb();
  if (!db) return getStoredRuns();

  try {
    const runsRef = collection(db, FIRESTORE_COLLECTION);
    const q = query(runsRef, limit(300));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Seed Firestore with all historical runs
      uploadRunsToCloud(SEED_RUNS).catch(() => {});
      return getStoredRuns();
    }

    const cloudRuns: BenchmarkRunRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as BenchmarkRunRecord;
      if (data && data.id && data.problemTitle) {
        cloudRuns.push(data);
      }
    });

    const merged = mergeAndDeduplicateRuns(cloudRuns, SEED_RUNS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.warn('[Universal Leaderboard] Fetch from cloud failed, using local cache:', error);
    return getStoredRuns();
  }
}

/**
 * Subscribe to real-time Universal Leaderboard updates across all users
 */
export function subscribeUniversalLeaderboard(
  onUpdate: (runs: BenchmarkRunRecord[]) => void
): Unsubscribe | null {
  const db = getFirestoreDb();
  if (!db) {
    onUpdate(getStoredRuns());
    return null;
  }

  try {
    const runsRef = collection(db, FIRESTORE_COLLECTION);
    const q = query(runsRef, limit(300));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          uploadRunsToCloud(SEED_RUNS).catch(() => {});
          onUpdate(getStoredRuns());
          return;
        }

        const cloudRuns: BenchmarkRunRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as BenchmarkRunRecord;
          if (data && data.id && data.problemTitle) {
            cloudRuns.push(data);
          }
        });

        // If cloud is missing any historical benchmark runs, backfill them
        if (cloudRuns.length < SEED_RUNS.length) {
          const cloudIds = new Set(cloudRuns.map((r) => r.id));
          const missing = SEED_RUNS.filter((r) => !cloudIds.has(r.id));
          if (missing.length > 0) {
            uploadRunsToCloud(missing).catch(() => {});
          }
        }

        const merged = mergeAndDeduplicateRuns(cloudRuns, SEED_RUNS);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        onUpdate(merged);
      },
      (error) => {
        console.warn('[Universal Leaderboard] Realtime subscription notice:', error);
        onUpdate(getStoredRuns());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Universal Leaderboard] Subscription setup failed, falling back to local cache:', err);
    onUpdate(getStoredRuns());
    return null;
  }
}
