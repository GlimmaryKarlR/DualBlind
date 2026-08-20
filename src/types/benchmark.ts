export type TopicCategory = 'logic' | 'strategy' | 'abstract';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

export interface BenchmarkProblem {
  id: string;
  topic: TopicCategory;
  title: string;
  difficulty: DifficultyLevel;
  question: string;
  expectedFormat: string;
  groundTruth: string[]; // List of acceptable canonical or normalized answers
  canonicalAnswer: string; // The primary display answer
  explanation: string;
  verifierType: 'exact_or_alias' | 'numeric_tolerance' | 'contains_keywords' | 'custom_eval';
  tolerance?: number;
  requiredKeywords?: string[];
}

export type ConsensusStatus =
  | 'idle'
  | 'in_progress'
  | 'single_claim'
  | 'consensus_reached'
  | 'consensus_conflict'
  | 'turn_cap_exhausted'
  | 'infinite_burn_abort'
  | 'infinite_loop_abort'
  | 'stopped';

export type TeamFunctionalityRating =
  | 'pending'
  | 'optimal' // Fast consensus (<5 turns, low cost)
  | 'deliberating' // Moderate turns (5-8 turns)
  | 'high_burn' // High token burn (>8 turns)
  | 'non_functional_infinite_burn'; // Looping/runaway without consensus

export interface AgentConfig {
  id: 'agent_a' | 'agent_b';
  name: string;
  brand?: string;
  model: string;
  provider?: 'google' | 'anthropic' | 'openai' | 'deepseek' | 'moonshot' | 'qwen' | 'mistral' | 'meta' | 'xai' | 'cohere' | 'custom';
  isManualExternal?: boolean;
  customBrand?: string;
  customModel?: string;
  temperature: number;
  thinkingLevel?: 'HIGH' | 'LOW' | 'MINIMAL';
  systemPromptModifier?: string;
  avatarColor: string;
}

export interface ChatTurn {
  id: string;
  agentId: 'agent_a' | 'agent_b';
  agentName: string;
  turnNumber: number; // Overall turn number
  agentTurnNumber: number; // Turn number for this agent (e.g. 1, 2, 3...)
  timestamp: number;
  content: string;
  extractedFinalAnswer: string | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  tokensPerSec: number;
  isConsensusClaim: boolean;
  modelUsed?: string;
  isManualEntry?: boolean;
  thoughtProcess?: string;
}

export interface VerificationResult {
  isCorrect: boolean;
  accuracyScore: number; // 0 to 100
  evaluatedAnswer: string;
  canonicalAnswer: string;
  explanation: string;
  verificationNotes: string;
  teamVerdict?: string;
}

export interface BenchmarkMetrics {
  totalWallClockMs: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  costPerTurnUsd: number;
  burnRateUsdPerMin: number;
  tokensPerSec: number;
  agentATokens: number;
  agentBTokens: number;
  agentACostUsd: number;
  agentBCostUsd: number;
  agentALatencyMs: number;
  agentBLatencyMs: number;
  turnsCount: number;
  consensusTurn: number | null;
  efficiencyIndex: number;
  consensusReached: boolean;
  accuracyScore: number;
  isCorrect: boolean;
  teamFunctionality: TeamFunctionalityRating;
  isInfiniteLoopDetected: boolean;
  isUncapped?: boolean;
}

export interface BenchmarkRunRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  topic: TopicCategory;
  difficulty: DifficultyLevel;
  date: string;
  agentAConfig: AgentConfig;
  agentBConfig: AgentConfig;
  isUncapped: boolean;
  maxTurns: number;
  maxTurnsPerAgent?: number;
  turns: ChatTurn[];
  consensusStatus: ConsensusStatus;
  finalAgreedAnswer: string | null;
  verification: VerificationResult | null;
  metrics: BenchmarkMetrics;
}

export interface GenerateTurnRequest {
  problem: BenchmarkProblem;
  agent: AgentConfig;
  partnerName: string;
  history: Array<{
    sender: string;
    text: string;
    isCurrentAgent: boolean;
  }>;
  currentTurn: number;
  isUncapped: boolean;
  maxTurnsPerAgent?: number;
}

export interface GenerateTurnResponse {
  content: string;
  extractedFinalAnswer: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  thoughtProcess?: string;
}

