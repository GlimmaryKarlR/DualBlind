import { BenchmarkProblem, BenchmarkRunRecord, TopicCategory } from '../types/benchmark';

export type ChallengeTypeId =
  | 'all'
  | 'mmlu_pro'
  | 'gpqa_diamond'
  | 'swe_bench'
  | 'math_aime'
  | 'ifeval'
  | 'arc_challenge'
  | 'game_theory'
  | 'formal_logic'
  | 'logic'
  | 'strategy'
  | 'abstract';

export interface ChallengeTypeDefinition {
  id: ChallengeTypeId;
  label: string;
  shortLabel: string;
  badgeEmoji: string;
  colorScheme: {
    bg: string;
    text: string;
    border: string;
    pillBg: string;
    pillActive: string;
    ring: string;
  };
  description: string;
  standardOrg: string;
  topicCategory: TopicCategory | 'all';
}

export const CHALLENGE_TYPES: ChallengeTypeDefinition[] = [
  {
    id: 'all',
    label: 'All Challenge Types',
    shortLabel: 'All Suites',
    badgeEmoji: '🌐',
    colorScheme: {
      bg: 'bg-slate-50 dark:bg-slate-800/60',
      text: 'text-slate-900 dark:text-white',
      border: 'border-slate-200 dark:border-slate-700',
      pillBg: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
      pillActive: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs',
      ring: 'ring-slate-400',
    },
    description: 'Universal aggregation across all 11 frontier AI benchmark suites and topics.',
    standardOrg: 'Universal Suite',
    topicCategory: 'all',
  },
  {
    id: 'mmlu_pro',
    label: 'MMLU-Pro (STEM & Multidisciplinary Reasoning)',
    shortLabel: 'MMLU-Pro',
    badgeEmoji: '🎓',
    colorScheme: {
      bg: 'bg-blue-50/70 dark:bg-blue-950/30',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800/60',
      pillBg: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300',
      pillActive: 'bg-blue-600 text-white dark:bg-blue-500 shadow-xs',
      ring: 'ring-blue-400',
    },
    description: 'Massive Multitask Language Understanding Pro — rigorous STEM problem solving with distractors.',
    standardOrg: 'TIGER Lab / Scale AI',
    topicCategory: 'science',
  },
  {
    id: 'gpqa_diamond',
    label: 'GPQA Diamond (PhD-Level Science)',
    shortLabel: 'GPQA Diamond',
    badgeEmoji: '⚛️',
    colorScheme: {
      bg: 'bg-purple-50/70 dark:bg-purple-950/30',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800/60',
      pillBg: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300',
      pillActive: 'bg-purple-600 text-white dark:bg-purple-500 shadow-xs',
      ring: 'ring-purple-400',
    },
    description: 'Google-Proof PhD-level physics, chemistry, and biology problems resisting search hallucination.',
    standardOrg: 'NYU / Anthropic Research',
    topicCategory: 'science',
  },
  {
    id: 'swe_bench',
    label: 'SWE-bench & Systems Engineering',
    shortLabel: 'SWE-bench',
    badgeEmoji: '💻',
    colorScheme: {
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      pillBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300',
      pillActive: 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs',
      ring: 'ring-emerald-400',
    },
    description: 'Real-world software engineering, concurrency invariants, memory limits, and algorithm triage.',
    standardOrg: 'Princeton NLP',
    topicCategory: 'coding',
  },
  {
    id: 'math_aime',
    label: 'MATH / AIME (Competition Mathematics)',
    shortLabel: 'MATH / AIME',
    badgeEmoji: '📐',
    colorScheme: {
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/60',
      pillBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300',
      pillActive: 'bg-amber-600 text-white dark:bg-amber-500 shadow-xs',
      ring: 'ring-amber-400',
    },
    description: 'Olympiad-tier discrete mathematics, modular congruences, derangements, and proofs.',
    standardOrg: 'Hendrycks / MAA',
    topicCategory: 'math',
  },
  {
    id: 'ifeval',
    label: 'IFEval (Verifiable Instruction Following)',
    shortLabel: 'IFEval',
    badgeEmoji: '📋',
    colorScheme: {
      bg: 'bg-rose-50/70 dark:bg-rose-950/30',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800/60',
      pillBg: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300',
      pillActive: 'bg-rose-600 text-white dark:bg-rose-500 shadow-xs',
      ring: 'ring-rose-400',
    },
    description: 'Programmatic constraint verification: negative exclusions, word limits, and JSON schemas.',
    standardOrg: 'Google DeepMind',
    topicCategory: 'instruction_following',
  },
  {
    id: 'arc_challenge',
    label: 'ARC Challenge (Abstraction & Reasoning Corpus)',
    shortLabel: 'ARC Challenge',
    badgeEmoji: '🔷',
    colorScheme: {
      bg: 'bg-cyan-50/70 dark:bg-cyan-950/30',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800/60',
      pillBg: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300',
      pillActive: 'bg-cyan-600 text-white dark:bg-cyan-500 shadow-xs',
      ring: 'ring-cyan-400',
    },
    description: 'Visual matrix transformations, cellular automata invariants, and inductive synthesis.',
    standardOrg: 'François Chollet / ARC Prize',
    topicCategory: 'abstract',
  },
  {
    id: 'game_theory',
    label: 'Game Theory & Mechanism Design',
    shortLabel: 'Game Theory',
    badgeEmoji: '🎯',
    colorScheme: {
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800/60',
      pillBg: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300',
      pillActive: 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-xs',
      ring: 'ring-indigo-400',
    },
    description: 'Cournot duopolies, Nash equilibria, backward induction, auction theory, and subtraction games.',
    standardOrg: 'Stanford / Caltech',
    topicCategory: 'strategy',
  },
  {
    id: 'formal_logic',
    label: 'Formal Deductive Logic & Decanting',
    shortLabel: 'Formal Logic',
    badgeEmoji: '🧠',
    colorScheme: {
      bg: 'bg-violet-50/70 dark:bg-violet-950/30',
      text: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-200 dark:border-violet-800/60',
      pillBg: 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300',
      pillActive: 'bg-violet-600 text-white dark:bg-violet-500 shadow-xs',
      ring: 'ring-violet-400',
    },
    description: '3-jug state-space decanting trees, knights & knaves identity systems, and linear seating CSPs.',
    standardOrg: 'Smullyan / Z3 Solvers',
    topicCategory: 'logic',
  },
  {
    id: 'logic',
    label: 'Logic (General Deductive)',
    shortLabel: 'Logic',
    badgeEmoji: '🧩',
    colorScheme: {
      bg: 'bg-purple-50/70 dark:bg-purple-950/30',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800/60',
      pillBg: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300',
      pillActive: 'bg-purple-700 text-white dark:bg-purple-600 shadow-xs',
      ring: 'ring-purple-400',
    },
    description: 'Classical deductive constraints, truth verification, and eliminate-by-proof challenges.',
    standardOrg: 'Core Logic Track',
    topicCategory: 'logic',
  },
  {
    id: 'strategy',
    label: 'Strategy (General Strategic)',
    shortLabel: 'Strategy',
    badgeEmoji: '⚔️',
    colorScheme: {
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      pillBg: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300',
      pillActive: 'bg-emerald-700 text-white dark:bg-emerald-600 shadow-xs',
      ring: 'ring-emerald-400',
    },
    description: 'Equilibrium optimization, minimax heuristics, resource voting, and competitive payouts.',
    standardOrg: 'Core Strategy Track',
    topicCategory: 'strategy',
  },
  {
    id: 'abstract',
    label: 'Abstract (General Inductive)',
    shortLabel: 'Abstract',
    badgeEmoji: '🌀',
    colorScheme: {
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/60',
      pillBg: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300',
      pillActive: 'bg-amber-700 text-white dark:bg-amber-600 shadow-xs',
      ring: 'ring-amber-400',
    },
    description: 'Pattern extrapolations, non-verbal matrices, recursive sequences, and probability paradoxes.',
    standardOrg: 'Core Abstract Track',
    topicCategory: 'abstract',
  },
];

/**
 * Maps a BenchmarkRunRecord or BenchmarkProblem to its standardized ChallengeTypeDefinition
 */
export function getChallengeTypeForRun(run: Partial<BenchmarkRunRecord>): ChallengeTypeDefinition {
  const suite = (run.suite || '').toLowerCase();
  const suiteId = run.suiteId;
  const topic = run.topic || 'logic';
  const probId = (run.problemId || '').toLowerCase();
  const title = (run.problemTitle || '').toLowerCase();

  if (suiteId === 'mmlu_pro' || suite.includes('mmlu') || probId.startsWith('mmlu')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'mmlu_pro')!;
  }
  if (suiteId === 'gpqa_diamond' || suite.includes('gpqa') || probId.startsWith('gpqa')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'gpqa_diamond')!;
  }
  if (suiteId === 'swe_bench' || suite.includes('swe') || suite.includes('code') || probId.startsWith('swe')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'swe_bench')!;
  }
  if (suiteId === 'math_aime' || suite.includes('math') || suite.includes('aime') || probId.startsWith('math')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'math_aime')!;
  }
  if (suiteId === 'ifeval' || suite.includes('ifeval') || probId.startsWith('ifeval')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'ifeval')!;
  }
  if (suiteId === 'arc_challenge' || suite.includes('arc') || probId.startsWith('arc') || title.includes('cellular') || title.includes('matrix')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'arc_challenge')!;
  }
  if (suiteId === 'game_theory' || suite.includes('game') || title.includes('cournot') || title.includes('subtraction game') || title.includes('pirate') || title.includes('monty hall') || probId.startsWith('strategy')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'game_theory')!;
  }
  if (suiteId === 'formal_logic' || suite.includes('formal') || title.includes('decanting') || title.includes('knights') || title.includes('fruit crate') || title.includes('seating') || probId.startsWith('logic')) {
    return CHALLENGE_TYPES.find((c) => c.id === 'formal_logic')!;
  }

  // Fallback to topic category
  if (topic === 'logic') return CHALLENGE_TYPES.find((c) => c.id === 'formal_logic')!;
  if (topic === 'strategy') return CHALLENGE_TYPES.find((c) => c.id === 'game_theory')!;
  if (topic === 'abstract') return CHALLENGE_TYPES.find((c) => c.id === 'arc_challenge')!;
  if (topic === 'coding') return CHALLENGE_TYPES.find((c) => c.id === 'swe_bench')!;
  if (topic === 'math') return CHALLENGE_TYPES.find((c) => c.id === 'math_aime')!;
  if (topic === 'science') return CHALLENGE_TYPES.find((c) => c.id === 'gpqa_diamond')!;
  if (topic === 'instruction_following') return CHALLENGE_TYPES.find((c) => c.id === 'ifeval')!;

  return CHALLENGE_TYPES[0];
}

/**
 * Checks if a run satisfies a selected ChallengeTypeId filter
 */
export function matchesChallengeType(run: BenchmarkRunRecord, typeId: ChallengeTypeId): boolean {
  if (typeId === 'all') return true;

  const challenge = getChallengeTypeForRun(run);
  if (challenge.id === typeId) return true;

  // General category matching
  if (typeId === 'logic' && (challenge.id === 'formal_logic' || run.topic === 'logic')) return true;
  if (typeId === 'strategy' && (challenge.id === 'game_theory' || run.topic === 'strategy')) return true;
  if (typeId === 'abstract' && (challenge.id === 'arc_challenge' || run.topic === 'abstract')) return true;

  return false;
}
