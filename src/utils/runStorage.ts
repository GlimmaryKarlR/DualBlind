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
 * Save run record universally (to Server in-memory/disk cache, local storage, and Firestore)
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
      const lightCache = updatedLocal.slice(0, 2500).map((r) => {
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

  // 2. Persist to Backend Server In-Memory Cache & Disk (0 Firestore reads)
  try {
    fetch('/api/leaderboard/save-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    }).catch(() => {});
  } catch {
    // Non-blocking
  }

  // 3. Background persist to Firestore Universal Database (Uses Write quota, not Read quota)
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
    } catch (firestoreErr: any) {
      console.warn('[Universal Leaderboard] Cloud sync write notice:', firestoreErr?.message || firestoreErr);
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
    console.error('Async sync error in saveRunToStorage:', err);
  });
  return getStoredRuns();
}

/**
 * Sync local client runs to the server persistent cache
 */
export async function syncLocalRunsToServer(): Promise<BenchmarkRunRecord[]> {
  const localRuns = getStoredRuns();
  try {
    const res = await fetch('/api/leaderboard/sync-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runs: localRuns }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.runs) && data.runs.length > 0) {
        const normalizedList: BenchmarkRunRecord[] = [];
        for (const item of data.runs) {
          const norm = normalizeRunRecord(item);
          if (norm) normalizedList.push(norm);
        }
        // Update local cache
        try {
          const lightCache = normalizedList.slice(0, 2500).map((r) => {
            const { turns, ...rest } = r;
            return { ...rest, turns: [] };
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lightCache));
        } catch {
          // Ignore
        }
        return normalizedList;
      }
    }
  } catch (err) {
    console.warn('[Leaderboard] Local batch sync to server notice:', err);
  }

  return localRuns;
}

/**
 * Fetch all universal runs using server in-memory cache first (0 Firestore read quota consumed)
 */
export async function fetchUniversalLeaderboard(): Promise<BenchmarkRunRecord[]> {
  const localCached = getStoredRuns();

  // 1. Primary: Server-side in-memory cache
  try {
    const res = await fetch('/api/leaderboard/runs');
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const cloudRuns: BenchmarkRunRecord[] = [];
          for (const item of data) {
            const normalized = normalizeRunRecord(item);
            if (normalized) cloudRuns.push(normalized);
          }
          const merged = mergeAndDeduplicateRuns(cloudRuns, localCached);
          try {
            const lightCache = merged.slice(0, 2500).map((r) => {
              const { turns, ...rest } = r;
              return { ...rest, turns: [] };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(lightCache));
          } catch {
            // Quota safe
          }
          return merged;
        }
      }
    }
  } catch {
    // Server API unavailable or starting
  }

  // 2. Secondary: Static CDN cache fallback (/data/leaderboard_cache.json)
  try {
    const resStatic = await fetch('/data/leaderboard_cache.json');
    if (resStatic.ok) {
      const dataStatic = await resStatic.json();
      if (Array.isArray(dataStatic) && dataStatic.length > 0) {
        const staticRuns: BenchmarkRunRecord[] = [];
        for (const item of dataStatic) {
          const normalized = normalizeRunRecord(item);
          if (normalized) staticRuns.push(normalized);
        }
        const merged = mergeAndDeduplicateRuns(staticRuns, localCached);
        try {
          const lightCache = merged.slice(0, 2500).map((r) => {
            const { turns, ...rest } = r;
            return { ...rest, turns: [] };
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lightCache));
        } catch {
          // Quota safe
        }
        return merged;
      }
    }
  } catch {
    // Static fallback notice
  }

  // 3. Tertiary: Direct Firestore fetch
  const db = getFirestoreDb();
  if (db) {
    try {
      const runsRef = collection(db, FIRESTORE_COLLECTION);
      const snapshot = await getDocs(runsRef);

      if (!snapshot.empty) {
        const cloudRuns: BenchmarkRunRecord[] = [];
        snapshot.forEach((docSnap) => {
          const normalized = normalizeRunRecord(docSnap.data(), docSnap.id);
          if (normalized) cloudRuns.push(normalized);
        });

        const merged = mergeAndDeduplicateRuns(cloudRuns, localCached);
        try {
          const lightCache = merged.slice(0, 2500).map((r) => {
            const { turns, ...rest } = r;
            return { ...rest, turns: [] };
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lightCache));
        } catch {
          // Quota safe
        }
        return merged;
      }
    } catch (error: any) {
      console.warn('[Universal Leaderboard] Cloud direct fetch notice:', error?.message || error);
    }
  }

  // 4. Final Fallback: Local browser storage
  return localCached;
}

/**
 * Subscribe to real-time Universal Leaderboard updates via high-frequency server cache polling
 * (Consumes 0 Firestore read units, avoiding daily quota exhaustion)
 */
export function subscribeUniversalLeaderboard(
  onUpdate: (runs: BenchmarkRunRecord[]) => void
): Unsubscribe | null {
  // First, eagerly fetch from server cache
  fetchUniversalLeaderboard()
    .then((allRuns) => {
      if (Array.isArray(allRuns) && allRuns.length > 0) {
        onUpdate(allRuns);
      }
    })
    .catch(() => {});

  // Poll server cache every 25 seconds for new runs across all users (0 Firestore reads)
  const interval = setInterval(() => {
    fetchUniversalLeaderboard()
      .then((runs) => {
        if (Array.isArray(runs) && runs.length > 0) {
          onUpdate(runs);
        }
      })
      .catch(() => {});
  }, 25000);

  const handleFocus = () => {
    fetchUniversalLeaderboard()
      .then((runs) => {
        if (Array.isArray(runs) && runs.length > 0) {
          onUpdate(runs);
        }
      })
      .catch(() => {});
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
  }

  return () => {
    clearInterval(interval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
    }
  };
}
