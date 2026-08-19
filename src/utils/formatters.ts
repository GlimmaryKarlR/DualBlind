import confetti from 'canvas-confetti';
import { TeamFunctionalityRating } from '../types/benchmark';

export function fireSuccessConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#10b981', '#6366f1', '#f59e0b'],
  });
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Formats a USD amount with precision appropriate for micro-dollar LLM pricing
 * e.g., $0.00012, $0.0035, $0.15
 */
export function formatCurrency(usd: number): string {
  if (usd === 0) return '$0.00000';
  if (usd < 0.001) {
    return `$${usd.toFixed(5)}`;
  }
  if (usd < 0.01) {
    return `$${usd.toFixed(4)}`;
  }
  if (usd < 1) {
    return `$${usd.toFixed(4)}`;
  }
  return `$${usd.toFixed(2)}`;
}

/**
 * Standard pricing calculation for Gemini 3.7 / 2.5 Flash
 * Input: $0.15 per 1,000,000 tokens ($0.00000015 / token)
 * Output: $0.60 per 1,000,000 tokens ($0.00000060 / token)
 */
export function calculateTokenCost(inputTokens: number, outputTokens: number, _model?: string): number {
  const inputCost = (inputTokens * 0.15) / 1_000_000;
  const outputCost = (outputTokens * 0.60) / 1_000_000;
  return inputCost + outputCost;
}

export function getTeamFunctionalityBadge(
  rating: TeamFunctionalityRating,
  consensusReached: boolean,
  isCorrect?: boolean
): {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  description: string;
} {
  if (rating === 'non_functional_infinite_burn' || (!consensusReached && rating === 'high_burn')) {
    return {
      label: 'Non-Functional Team (Infinite Token Burn)',
      shortLabel: 'Non-Functional (Loop)',
      color: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-rose-50 dark:bg-rose-950/60',
      border: 'border-rose-300 dark:border-rose-800',
      description: 'The agent pair is failing to converge, burning tokens endlessly without reaching verified consensus.',
    };
  }

  if (consensusReached && isCorrect === false) {
    return {
      label: 'Non-Functional (Hallucinated Consensus)',
      shortLabel: 'Wrong Consensus',
      color: 'text-orange-700 dark:text-orange-300',
      bg: 'bg-orange-50 dark:bg-orange-950/60',
      border: 'border-orange-300 dark:border-orange-800',
      description: 'Agents reached mutual agreement, but converged on an incorrect answer.',
    };
  }

  switch (rating) {
    case 'optimal':
      return {
        label: 'Optimal Convergence (Highly Cost-Efficient)',
        shortLabel: 'Optimal (<5 Turns)',
        color: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-50 dark:bg-emerald-950/50',
        border: 'border-emerald-300 dark:border-emerald-800',
        description: 'Rapid consensus reached with minimal token burn and low compute cost.',
      };
    case 'deliberating':
      return {
        label: 'Functional Team (Moderate Deliberation)',
        shortLabel: 'Functional (5-8 Turns)',
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-950/50',
        border: 'border-blue-300 dark:border-blue-800',
        description: 'Constructive multi-turn debate resolved within reasonable token budget.',
      };
    case 'high_burn':
      return {
        label: 'High Token Burn (Diminishing Efficiency)',
        shortLabel: 'High Burn (>8 Turns)',
        color: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/50',
        border: 'border-amber-300 dark:border-amber-800',
        description: 'High turn count and accelerating compute cost; risks entering non-functional loop.',
      };
    default:
      return {
        label: 'Evaluating Team Dynamics...',
        shortLabel: 'Evaluating',
        color: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-50 dark:bg-slate-800',
        border: 'border-slate-300 dark:border-slate-700',
        description: 'Multi-agent dialogue in progress.',
      };
  }
}

export function getTierBadge(efficiencyIndex: number, isCorrect: boolean): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (!isCorrect) {
    return {
      label: 'F (Failed / Non-Functional)',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-800',
    };
  }

  if (efficiencyIndex >= 800) {
    return {
      label: 'S-Tier (Hyper-Efficient)',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
    };
  } else if (efficiencyIndex >= 400) {
    return {
      label: 'A-Tier (High Efficiency)',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
    };
  } else if (efficiencyIndex >= 200) {
    return {
      label: 'B-Tier (Moderate Compute)',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
    };
  } else {
    return {
      label: 'C-Tier (High Token Overhead)',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800',
    };
  }
}

