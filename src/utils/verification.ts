import { BenchmarkProblem, VerificationResult } from '../types/benchmark';

/**
 * Normalizes answer string for rigorous comparisons
 */
export function normalizeAnswerString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\\boxed\{([^}]+)\}/g, '$1')
    .replace(/[$\\,\\.\\[\\]\\(\\)\\*\\_\\"\\']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates correctness against benchmark problem ground truth
 */
export function evaluateCorrectnessClient(
  submittedAnswer: string | null,
  groundTruthList: string[],
  requiredKeywords?: string[]
): { isCorrect: boolean; accuracyScore: number; notes: string } {
  if (!submittedAnswer || submittedAnswer.trim() === '' || submittedAnswer.toLowerCase() === 'none') {
    return {
      isCorrect: false,
      accuracyScore: 0,
      notes: 'No consensus answer was reached or submitted.',
    };
  }

  const normalizedSubmitted = normalizeAnswerString(submittedAnswer);

  // 1. Exact match after normalization
  for (const gt of groundTruthList) {
    const normalizedGt = normalizeAnswerString(gt);
    if (normalizedSubmitted === normalizedGt) {
      return {
        isCorrect: true,
        accuracyScore: 100,
        notes: 'Exact match with ground truth canonical answer.',
      };
    }
  }

  // 2. Substring or numeric match
  for (const gt of groundTruthList) {
    const normalizedGt = normalizeAnswerString(gt);
    if (
      normalizedSubmitted.includes(normalizedGt) ||
      (normalizedGt.length > 3 && normalizedGt.includes(normalizedSubmitted))
    ) {
      return {
        isCorrect: true,
        accuracyScore: 100,
        notes: `Validated match against expected solution (${gt}).`,
      };
    }

    // Numeric check
    const numSub = parseFloat(normalizedSubmitted.replace(/[^0-9.-]/g, ''));
    const numGt = parseFloat(normalizedGt.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numSub) && !isNaN(numGt) && Math.abs(numSub - numGt) < 0.001) {
      return {
        isCorrect: true,
        accuracyScore: 100,
        notes: 'Numeric equivalence verified within tolerance.',
      };
    }
  }

  // 3. Keyword verification if specified
  if (requiredKeywords && requiredKeywords.length > 0) {
    const lowerSubmitted = submittedAnswer.toLowerCase();
    const matchedCount = requiredKeywords.filter((kw) =>
      lowerSubmitted.includes(kw.toLowerCase())
    ).length;

    if (matchedCount === requiredKeywords.length) {
      return {
        isCorrect: true,
        accuracyScore: 100,
        notes: 'All required solution keywords validated.',
      };
    } else if (matchedCount > 0) {
      const partialScore = Math.round((matchedCount / requiredKeywords.length) * 80);
      return {
        isCorrect: false,
        accuracyScore: partialScore,
        notes: `Partial match: contained ${matchedCount} of ${requiredKeywords.length} required key assertions.`,
      };
    }
  }

  return {
    isCorrect: false,
    accuracyScore: 0,
    notes: `Submitted answer "${submittedAnswer}" did not match expected ground truth.`,
  };
}

/**
 * Computes Cost-to-Consensus Efficiency Index and Verification Result
 */
export function computeVerificationClient(params: {
  problem: BenchmarkProblem;
  finalAnswerA?: string | null;
  finalAnswerB?: string | null;
  totalTokens: number;
  totalWallClockMs: number;
  totalCostUsd: number;
  consensusReached: boolean;
  isUncapped: boolean;
  abortedAsNonFunctional?: boolean;
  turnsCount: number;
}): {
  isCorrect: boolean;
  accuracyScore: number;
  efficiencyIndex: number;
  evaluatedAnswer: string;
  canonicalAnswer: string;
  explanation: string;
  verificationNotes: string;
  teamVerdict: string;
} {
  const {
    problem,
    finalAnswerA,
    finalAnswerB,
    totalTokens,
    totalWallClockMs,
    consensusReached,
    abortedAsNonFunctional,
    turnsCount,
  } = params;

  const evaluatedAnswer = finalAnswerA || finalAnswerB || 'None';

  const { isCorrect, accuracyScore, notes } = evaluateCorrectnessClient(
    evaluatedAnswer,
    problem.groundTruth || [problem.canonicalAnswer],
    problem.requiredKeywords
  );

  const wallClockSec = Math.max(0.2, (totalWallClockMs || 1000) / 1000);
  const tokensCount = Math.max(10, totalTokens || 100);

  const consensusFactor = abortedAsNonFunctional
    ? 0.0
    : consensusReached
    ? 1.0
    : finalAnswerA || finalAnswerB
    ? 0.5
    : 0.0;

  const effectiveAccuracy = accuracyScore * consensusFactor;

  // Cost-to-Consensus Efficiency Index Formula:
  // Efficiency = (Accuracy Score [0-100] * Consensus Factor) / (Wall Clock Time in Seconds * Total Tokens Generated) * 10,000
  const rawEfficiency = abortedAsNonFunctional
    ? 0
    : (effectiveAccuracy / (wallClockSec * tokensCount)) * 10000;
  const efficiencyIndex = Math.round(rawEfficiency * 100) / 100;

  // Determine Team Functionality Verdict
  let teamVerdict = 'Functional';
  if (abortedAsNonFunctional) {
    teamVerdict = 'Non-Functional (Infinite Token Burn Loop)';
  } else if (!consensusReached) {
    teamVerdict = 'Non-Functional (Failed to Reach Consensus)';
  } else if (!isCorrect) {
    teamVerdict = 'Non-Functional (Consensus on Wrong Answer)';
  } else if (turnsCount <= 4) {
    teamVerdict = 'Highly Functional & Cost-Optimal (<5 Turns)';
  } else if (turnsCount <= 8) {
    teamVerdict = 'Functional Team (Standard Convergence)';
  } else {
    teamVerdict = 'Functional (High Compute Overhead)';
  }

  return {
    isCorrect,
    accuracyScore,
    efficiencyIndex,
    evaluatedAnswer,
    canonicalAnswer: problem.canonicalAnswer,
    explanation: problem.explanation,
    verificationNotes: notes,
    teamVerdict,
  };
}
