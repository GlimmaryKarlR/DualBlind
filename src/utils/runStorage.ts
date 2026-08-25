import { BenchmarkRunRecord } from '../types/benchmark';
import { getFirestoreDb } from '../lib/firebase';
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

export const SEED_RUNS: BenchmarkRunRecord[] = [
  {
    id: 'seed-run-1',
    problemId: 'strat-01',
    problemTitle: 'Three-Duelist Truel Optimization',
    topic: 'strategy',
    difficulty: 'Hard',
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    agentAConfig: {
      id: 'agent_a',
      name: 'Agent Alpha (Gemini 2.5 Flash)',
      model: 'gemini-2.5-flash',
      provider: 'google',
      temperature: 0.3,
      avatarColor: 'indigo',
    },
    agentBConfig: {
      id: 'agent_b',
      name: 'Agent Beta (Gemini 2.5 Flash)',
      model: 'gemini-2.5-flash',
      provider: 'google',
      temperature: 0.4,
      avatarColor: 'emerald',
    },
    maxTurns: 10,
    isUncapped: true,
    consensusStatus: 'consensus_reached',
    finalAgreedAnswer: 'deliberately shoots into the ground / misses intentionally',
    metrics: {
      totalWallClockMs: 3820,
      totalTokens: 520,
      totalInputTokens: 340,
      totalOutputTokens: 180,
      totalCostUsd: 0.000159,
      costPerTurnUsd: 0.000053,
      burnRateUsdPerMin: 0.0025,
      agentACostUsd: 0.00008,
      agentBCostUsd: 0.000079,
      tokensPerSec: 47.1,
      agentATokens: 270,
      agentBTokens: 250,
      agentALatencyMs: 1950,
      agentBLatencyMs: 1870,
      turnsCount: 3,
      consensusTurn: 3,
      efficiencyIndex: 50.34,
      consensusReached: true,
      accuracyScore: 100,
      isCorrect: true,
      teamFunctionality: 'optimal',
      isInfiniteLoopDetected: false,
      isUncapped: true,
    },
    verification: {
      isCorrect: true,
      accuracyScore: 100,
      evaluatedAnswer: 'deliberately shoots into the ground / misses intentionally',
      canonicalAnswer: 'Deliberately shoots into the air / misses intentionally',
      explanation:
        'If Charlie kills Alice or Bob, the survivor gets the next shot at 100% or 80% accuracy. By missing, Alice shoots at Bob (the highest threat), maximizing Charlie survival.',
      verificationNotes: 'Exact match with ground truth canonical answer.',
      teamVerdict: 'Highly Functional & Cost-Optimal (<5 Turns)',
    },
    turns: [],
  },
  {
    id: 'seed-run-2',
    problemId: 'logic-01',
    problemTitle: 'Cheryl’s Birthday Deductive Gridlock',
    topic: 'logic',
    difficulty: 'Medium',
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
    agentAConfig: {
      id: 'agent_a',
      name: 'Agent Alpha (Gemini 2.5 Flash)',
      model: 'gemini-2.5-flash',
      provider: 'google',
      temperature: 0.3,
      avatarColor: 'indigo',
    },
    agentBConfig: {
      id: 'agent_b',
      name: 'Agent Beta (Gemini 2.5 Flash)',
      model: 'gemini-2.5-flash',
      provider: 'google',
      temperature: 0.4,
      avatarColor: 'emerald',
    },
    maxTurns: 10,
    isUncapped: true,
    consensusStatus: 'consensus_reached',
    finalAgreedAnswer: 'July 16',
    metrics: {
      totalWallClockMs: 2940,
      totalTokens: 410,
      totalInputTokens: 260,
      totalOutputTokens: 150,
      totalCostUsd: 0.000129,
      costPerTurnUsd: 0.000064,
      burnRateUsdPerMin: 0.0026,
      agentACostUsd: 0.000065,
      agentBCostUsd: 0.000064,
      tokensPerSec: 51.0,
      agentATokens: 210,
      agentBTokens: 200,
      agentALatencyMs: 1480,
      agentBLatencyMs: 1460,
      turnsCount: 2,
      consensusTurn: 2,
      efficiencyIndex: 82.96,
      consensusReached: true,
      accuracyScore: 100,
      isCorrect: true,
      teamFunctionality: 'optimal',
      isInfiniteLoopDetected: false,
      isUncapped: true,
    },
    verification: {
      isCorrect: true,
      accuracyScore: 100,
      evaluatedAnswer: 'July 16',
      canonicalAnswer: 'July 16',
      explanation: 'Deductive elimination of unique days (May 19, June 18) confirms July 16.',
      verificationNotes: 'Exact match with ground truth canonical answer.',
      teamVerdict: 'Highly Functional & Cost-Optimal (<5 Turns)',
    },
    turns: [],
  },
];

/**
 * Merge and deduplicate runs by ID, sorting by newest date first.
 */
export function mergeAndDeduplicateRuns(
  primary: BenchmarkRunRecord[],
  fallback: BenchmarkRunRecord[]
): BenchmarkRunRecord[] {
  const map = new Map<string, BenchmarkRunRecord>();
  // Fallbacks first (e.g. seeds)
  for (const item of fallback) {
    if (item && item.id) map.set(item.id, item);
  }
  // Primary overwrite (cloud runs or newest local runs)
  for (const item of primary) {
    if (item && item.id) map.set(item.id, item);
  }

  const list = Array.from(map.values());
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 300);
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
    console.warn('Failed to load runs from localStorage, returning seed runs:', e);
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
      await setDoc(docRef, sanitizedRecord);
      console.info(`[Universal Leaderboard] Benchmark run ${record.id} synced to Firestore cloud.`);
    } catch (firestoreErr) {
      console.error('[Universal Leaderboard] Cloud sync error:', firestoreErr);
    }
  }

  return updatedLocal;
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
    const q = query(runsRef, limit(200));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Seed Firestore with baseline comparison runs if newly provisioned
      seedInitialRunsToCloud(db).catch(() => {});
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
 * Seed initial baseline runs to Firestore if empty
 */
async function seedInitialRunsToCloud(db: any) {
  try {
    for (const seed of SEED_RUNS) {
      const docRef = doc(db, FIRESTORE_COLLECTION, seed.id);
      await setDoc(docRef, sanitizeForFirestore(seed));
    }
  } catch (e) {
    console.warn('Initial cloud seed skipped:', e);
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
    const q = query(runsRef, limit(200));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
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
