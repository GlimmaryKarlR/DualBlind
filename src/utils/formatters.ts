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
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  modelOrPrice?: string | { inPrice: number; outPrice: number }
): number {
  let inRate = 0.15;
  let outRate = 0.60;

  if (typeof modelOrPrice === 'object' && modelOrPrice !== null) {
    inRate = modelOrPrice.inPrice;
    outRate = modelOrPrice.outPrice;
  } else if (typeof modelOrPrice === 'string') {
    const m = modelOrPrice.toLowerCase();
    if (m.includes('claude-3-7') || m.includes('claude-3.7') || m.includes('claude-3-5-sonnet')) {
      inRate = 3.00;
      outRate = 15.00;
    } else if (m.includes('grok-3-mini')) {
      inRate = 0.30;
      outRate = 1.20;
    } else if (m.includes('grok-3') || m.includes('grok 3')) {
      inRate = 3.00;
      outRate = 15.00;
    } else if (m.includes('grok-2') || m.includes('grok') || m.includes('xai')) {
      inRate = 2.00;
      outRate = 10.00;
    } else if (m.includes('claude-3-5-haiku')) {
      inRate = 0.80;
      outRate = 4.00;
    } else if (m.includes('gpt-4o-mini')) {
      inRate = 0.15;
      outRate = 0.60;
    } else if (m.includes('gpt-4o') || m.includes('openai')) {
      inRate = 2.50;
      outRate = 10.00;
    } else if (m.includes('o3-mini')) {
      inRate = 1.10;
      outRate = 4.40;
    } else if (m.includes('deepseek-r1')) {
      inRate = 0.55;
      outRate = 2.19;
    } else if (m.includes('deepseek-v3') || m.includes('deepseek-coder')) {
      inRate = 0.14;
      outRate = 0.28;
    } else if (m.includes('kimi-k1') || m.includes('kimi-k1-5')) {
      inRate = 1.00;
      outRate = 4.00;
    } else if (m.includes('kimi') || m.includes('moonshot')) {
      inRate = 0.80;
      outRate = 3.20;
    } else if (m.includes('qwen-2-5-max') || m.includes('qwen-max')) {
      inRate = 1.60;
      outRate = 6.40;
    } else if (m.includes('qwen-2-5-coder') || m.includes('qwen-coder')) {
      inRate = 0.20;
      outRate = 0.40;
    } else if (m.includes('qwen')) {
      inRate = 0.35;
      outRate = 0.70;
    } else if (m.includes('mistral-large')) {
      inRate = 2.00;
      outRate = 6.00;
    } else if (m.includes('codestral')) {
      inRate = 0.30;
      outRate = 0.90;
    } else if (m.includes('mistral')) {
      inRate = 0.50;
      outRate = 1.50;
    } else if (m.includes('yi-') || m.includes('01.ai')) {
      inRate = 0.14;
      outRate = 0.14;
    } else if (m.includes('phi-3-5-mini') || m.includes('phi-3.5-mini')) {
      inRate = 0.05;
      outRate = 0.15;
    } else if (m.includes('phi-3-5-moe') || m.includes('phi-3.5-moe')) {
      inRate = 0.15;
      outRate = 0.60;
    } else if (m.includes('phi-4') || m.includes('phi') || m.includes('microsoft')) {
      inRate = 0.10;
      outRate = 0.40;
    } else if (m.includes('nova-pro') || m.includes('amazon-nova-pro')) {
      inRate = 0.80;
      outRate = 3.20;
    } else if (m.includes('nova-lite') || m.includes('amazon-nova-lite')) {
      inRate = 0.06;
      outRate = 0.24;
    } else if (m.includes('nova-micro') || m.includes('amazon-nova-micro')) {
      inRate = 0.035;
      outRate = 0.14;
    } else if (m.includes('command-r') || m.includes('cohere')) {
      inRate = 2.50;
      outRate = 10.00;
    } else if (m.includes('gemini-3.1-pro') || m.includes('3.1-pro')) {
      inRate = 1.25;
      outRate = 5.00;
    } else if (m.includes('gemini-3.1-flash-lite') || m.includes('flash-lite')) {
      inRate = 0.075;
      outRate = 0.30;
    } else if (m.includes('gemini-3.7-flash') || m.includes('3.7-flash') || m.includes('gemini-flash-latest') || m.includes('gemini')) {
      inRate = 0.15;
      outRate = 0.60;
    }
  }

  const inputCost = (inputTokens * inRate) / 1_000_000;
  const outputCost = (outputTokens * outRate) / 1_000_000;
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

