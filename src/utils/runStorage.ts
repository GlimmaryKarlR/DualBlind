import { BenchmarkRunRecord } from '../types/benchmark';

const STORAGE_KEY = 'dualblind_benchmark_runs_v1';

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
      return parsed;
    }
    return SEED_RUNS;
  } catch (e) {
    console.warn('Failed to load runs from localStorage, returning seed runs:', e);
    return SEED_RUNS;
  }
}

export function saveRunToStorage(record: BenchmarkRunRecord): BenchmarkRunRecord[] {
  if (typeof window === 'undefined') return [record];
  try {
    const current = getStoredRuns();
    const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 150);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save run to localStorage:', e);
    return [record];
  }
}
