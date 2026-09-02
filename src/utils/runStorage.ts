import { BenchmarkRunRecord } from '../types/benchmark';
import { getFirestoreDb } from '../lib/firebase';
import { HISTORICAL_BENCHMARK_RUNS } from '../data/historicalRuns';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

const STORAGE_KEY = 'dualblind_benchmark_runs_v1';
const FIRESTORE_COLLECTION = 'benchmark_runs';

export const SEED_RUNS: BenchmarkRunRecord[] = HISTORICAL_BENCHMARK_RUNS;

/**
 * Normalizes any run record (Firestore document, local cache, or server response)
 * into a fully populated, type-safe BenchmarkRunRecord.
 */
export function normalizeRunRecord(raw: any, fallbackId?: string): BenchmarkRunRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id || fallbackId;
  if (!id) return null;

  const rawMetrics = raw.metrics || {};
  const effIndex = typeof rawMetrics.efficiencyIndex === 'number' && !isNaN(rawMetrics.efficiencyIndex)
    ? rawMetrics.efficiencyIndex
    : typeof raw.efficiencyIndex === 'number' && !isNaN(raw.efficiencyIndex)
    ? raw.efficiencyIndex
    : 0;

  const turnsCount = Number(rawMetrics.turnsCount ?? raw.turnsCount ?? 0) || 0;
  const totalCostUsd = Number(rawMetrics.totalCostUsd ?? raw.totalCostUsd ?? 0) || 0;
  const costPerTurnUsd = Number(rawMetrics.costPerTurnUsd ?? (turnsCount > 0 ? totalCostUsd / turnsCount : 0)) || 0;

  return {
    id: String(id),
    problemId: raw.problemId || 'unknown_problem',
    problemTitle: raw.problemTitle || raw.title || 'Benchmark Problem',
    topic: raw.topic || 'General Reasoning',
    difficulty: raw.difficulty || 'medium',
    date: raw.date || new Date().toISOString(),
    agentAConfig: raw.agentAConfig || { id: 'agent_a', name: 'Agent Alpha', model: 'Unknown', provider: 'unknown' },
    agentBConfig: raw.agentBConfig || { id: 'agent_b', name: 'Agent Beta', model: 'Unknown', provider: 'unknown' },
    isUncapped: raw.isUncapped ?? true,
    maxTurns: Number(raw.maxTurns ?? raw.metrics?.turnsCount ?? 20) || 20,
    suite: raw.suite,
    suiteId: raw.suiteId,
    domain: raw.domain,
    sourceCitation: raw.sourceCitation,
    turns: Array.isArray(raw.turns) ? raw.turns : [],
    consensusStatus: raw.consensusStatus || (rawMetrics.consensusReached ? 'agreed' : 'idle'),
    finalAgreedAnswer: raw.finalAgreedAnswer ?? null,
    verification: raw.verification ?? null,
    metrics: {
      totalWallClockMs: Number(rawMetrics.totalWallClockMs ?? raw.totalWallClockMs ?? 0) || 0,
      totalTokens: Number(rawMetrics.totalTokens ?? raw.totalTokens ?? 0) || 0,
      totalInputTokens: Number(rawMetrics.totalInputTokens ?? raw.totalInputTokens ?? 0) || 0,
      totalOutputTokens: Number(rawMetrics.totalOutputTokens ?? raw.totalOutputTokens ?? 0) || 0,
      totalCostUsd,
      costPerTurnUsd,
      burnRateUsdPerMin: Number(rawMetrics.burnRateUsdPerMin ?? 0) || 0,
      agentACostUsd: Number(rawMetrics.agentACostUsd ?? 0) || 0,
      agentBCostUsd: Number(rawMetrics.agentBCostUsd ?? 0) || 0,
      tokensPerSec: Number(rawMetrics.tokensPerSec ?? raw.tokensPerSec ?? 0) || 0,
      agentATokens: Number(rawMetrics.agentATokens ?? 0) || 0,
      agentBTokens: Number(rawMetrics.agentBTokens ?? 0) || 0,
      agentALatencyMs: Number(rawMetrics.agentALatencyMs ?? 0) || 0,
      agentBLatencyMs: Number(rawMetrics.agentBLatencyMs ?? 0) || 0,
      turnsCount,
      consensusTurn: rawMetrics.consensusTurn ?? null,
      efficiencyIndex: effIndex,
      consensusReached: Boolean(rawMetrics.consensusReached ?? raw.consensusReached),
      accuracyScore: Number(rawMetrics.accuracyScore ?? raw.accuracyScore ?? 0) || 0,
      isCorrect: Boolean(rawMetrics.isCorrect ?? raw.isCorrect),
      teamFunctionality: rawMetrics.teamFunctionality || raw.teamFunctionality || 'pending',
      isInfiniteLoopDetected: Boolean(rawMetrics.isInfiniteLoopDetected ?? raw.isInfiniteLoop),
      isUncapped: rawMetrics.isUncapped ?? raw.isUncapped ?? true,
    },
  };
}

/**
 * Merge and deduplicate runs by ID, sorting by newest date first without artificial caps.
 */
export function mergeAndDeduplicateRuns(
  primary: BenchmarkRunRecord[],
  fallback: BenchmarkRunRecord[] = []
): BenchmarkRunRecord[] {
  const map = new Map<string, BenchmarkRunRecord>();
  // Fallbacks first (e.g. local cache)
  for (const raw of fallback) {
    const item = normalizeRunRecord(raw);
    if (item) {
      map.set(item.id, item);
    }
  }
  // Primary overwrite (cloud runs or newest runs)
  for (const raw of primary) {
    const item = normalizeRunRecord(raw);
    if (item) {
      map.set(item.id, item);
    }
  }

  const list = Array.from(map.values());
  return list.sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Get runs cached locally in browser
 */
export function getStoredRuns(): BenchmarkRunRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mergeAndDeduplicateRuns(parsed, []);
    }
    return [];
  } catch (e) {
    console.warn('Failed to load runs from localStorage:', e);
    return [];
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
  const normalized = normalizeRunRecord(record) || record;

  // 1. Immediately cache locally
  let updatedLocal: BenchmarkRunRecord[] = [normalized];
  try {
    const current = getStoredRuns();
    updatedLocal = mergeAndDeduplicateRuns([normalized], current);
    try {
      // Store lightweight cache without transcripts to prevent QuotaExceededError
      const lightCache = updatedLocal.slice(0, 300).map((r) => {
        const { turns, ...rest } = r;
        return { ...rest, turns: [] };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightCache));
    } catch {
      // Ignore quota exceeded error on client
    }
  } catch (e) {
    console.warn('Local storage cache update failed:', e);
  }

  // 2. Persist to Firestore Universal Database
  const db = getFirestoreDb();
  if (db) {
    try {
      const sanitizedRecord = sanitizeForFirestore({
        ...normalized,
        updatedAt: new Date().toISOString(),
      });
      const docRef = doc(db, FIRESTORE_COLLECTION, normalized.id);
      await setDoc(docRef, sanitizedRecord, { merge: true });
      console.info(`[Universal Leaderboard] Benchmark run ${normalized.id} synced to Firestore.`);
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
      const normalized = normalizeRunRecord(run);
      if (!normalized || !normalized.id) continue;
      const sanitized = sanitizeForFirestore({
        ...normalized,
        updatedAt: new Date().toISOString(),
      });
      const docRef = doc(db, FIRESTORE_COLLECTION, normalized.id);
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
 * Fetch all universal runs directly from Firestore without artificial limits
 */
export async function fetchUniversalLeaderboard(): Promise<BenchmarkRunRecord[]> {
  const db = getFirestoreDb();
  if (!db) return getStoredRuns();

  try {
    const runsRef = collection(db, FIRESTORE_COLLECTION);
    const snapshot = await getDocs(runsRef);

    if (snapshot.empty) {
      return getStoredRuns();
    }

    const cloudRuns: BenchmarkRunRecord[] = [];
    snapshot.forEach((docSnap) => {
      const normalized = normalizeRunRecord(docSnap.data(), docSnap.id);
      if (normalized) {
        cloudRuns.push(normalized);
      }
    });

    const localCached = getStoredRuns();
    const merged = mergeAndDeduplicateRuns(cloudRuns, localCached);
    try {
      const lightCache = merged.slice(0, 300).map((r) => {
        const { turns, ...rest } = r;
        return { ...rest, turns: [] };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightCache));
    } catch {
      // Quota safe - ignore
    }
    return merged;
  } catch (error) {
    console.warn('[Universal Leaderboard] Fetch from cloud failed, trying local cache:', error);
    return getStoredRuns();
  }
}

/**
 * Subscribe to real-time Universal Leaderboard updates across all users
 */
export function subscribeUniversalLeaderboard(
  onUpdate: (runs: BenchmarkRunRecord[]) => void
): Unsubscribe | null {
  // First, eagerly fetch all documents via atomic getDocs so the complete dataset is loaded immediately
  fetchUniversalLeaderboard()
    .then((allRuns) => {
      if (Array.isArray(allRuns) && allRuns.length > 0) {
        onUpdate(allRuns);
      }
    })
    .catch(() => {
      // Handled by fetchUniversalLeaderboard
    });

  const db = getFirestoreDb();
  if (!db) {
    return null;
  }

  try {
    const runsRef = collection(db, FIRESTORE_COLLECTION);

    const unsubscribe = onSnapshot(
      runsRef,
      (snapshot) => {
        const cloudRuns: BenchmarkRunRecord[] = [];
        snapshot.forEach((docSnap) => {
          const normalized = normalizeRunRecord(docSnap.data(), docSnap.id);
          if (normalized) {
            cloudRuns.push(normalized);
          }
        });

        if (cloudRuns.length > 0) {
          const localCached = getStoredRuns();
          const merged = mergeAndDeduplicateRuns(cloudRuns, localCached);
          onUpdate(merged);
        }
      },
      (error) => {
        // When WebChannel has a transient reconnect or disconnect notice, DO NOT wipe existing state!
        console.warn('[Universal Leaderboard] Realtime listener notice (retaining existing data):', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[Universal Leaderboard] Subscription setup notice:', err);
    return null;
  }
}
