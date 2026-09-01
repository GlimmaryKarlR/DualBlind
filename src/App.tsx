import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, RefreshCw, X, Shuffle, Sparkles } from 'lucide-react';
import {
  BenchmarkProblem,
  TopicCategory,
  AgentConfig,
  ChatTurn,
  ConsensusStatus,
  VerificationResult,
  BenchmarkMetrics,
  BenchmarkRunRecord,
  TeamFunctionalityRating,
  ProviderApiKeys,
} from './types/benchmark';
import { getStoredApiKeys, countConfiguredKeys } from './utils/tokenStorage';
import { getStoredRuns, saveRunUniversal, subscribeUniversalLeaderboard } from './utils/runStorage';
import { generateBenchmarkTurnHybrid } from './utils/hybridTurnGenerator';
import { computeVerificationClient } from './utils/verification';
import { extractFinalAnswer } from './utils/clientInference';
import { getActiveCatalogModels } from './utils/modelCatalog';
import { VERIFIED_FREE_MODELS_POOL } from './utils/openRouterResolver';
import { BENCHMARK_PROBLEMS } from './data/benchmarkProblems';
import { Navbar } from './components/Navbar';
import { ArenaHeader } from './components/ArenaHeader';
import { AgentModelTracker } from './components/AgentModelTracker';
import { ProblemCard } from './components/ProblemCard';
import { ChatTranscript } from './components/ChatTranscript';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ResultModal } from './components/ResultModal';
import { LeaderboardView } from './components/LeaderboardView';
import { ProblemSuiteView } from './components/ProblemSuiteView';
import { MatchupConfigModal } from './components/MatchupConfigModal';
import { MethodologyModal } from './components/MethodologyModal';
import { ExternalAgentInputCard } from './components/ExternalAgentInputCard';
import { fireSuccessConfetti, calculateTokenCost, getAgentMakeAndModel } from './utils/formatters';

export default function App() {
  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<'arena' | 'leaderboard' | 'problems' | 'methodology'>('arena');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<TopicCategory | 'all'>('all');

  // Problem state
  const [allProblems, setAllProblems] = useState<BenchmarkProblem[]>(BENCHMARK_PROBLEMS);
  const [currentProblem, setCurrentProblem] = useState<BenchmarkProblem>(BENCHMARK_PROBLEMS[0]);

  // Agent Configurations
  const [agentA, setAgentA] = useState<AgentConfig>({
    id: 'agent_a',
    name: 'Agent Alpha',
    model: 'gemini-3.7-flash',
    provider: 'google',
    isManualExternal: false,
    temperature: 0.3,
    avatarColor: 'indigo',
    systemPromptModifier: 'Specializes in analytical rigor, step-by-step constraint checking, and proof validation.',
  });

  const [agentB, setAgentB] = useState<AgentConfig>({
    id: 'agent_b',
    name: 'Agent Beta',
    model: 'gemini-3.7-flash',
    provider: 'google',
    isManualExternal: false,
    temperature: 0.4,
    avatarColor: 'emerald',
    systemPromptModifier: 'Specializes in lateral exploration, mathematical counter-examples, and strategic game theory.',
  });

  const [maxTurns, setMaxTurns] = useState<number>(10); // 5 per agent (when capped mode is selected)
  const [isUncapped, setIsUncapped] = useState<boolean>(true); // Default to uncapped turns for real cost to consensus

  // Active Arena Execution State
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [activeAgentTurn, setActiveAgentTurn] = useState<'agent_a' | 'agent_b' | null>(null);
  const [waitingForManualProxy, setWaitingForManualProxy] = useState<{
    currentAgent: AgentConfig;
    partnerAgent: AgentConfig;
  } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [consensusStatus, setConsensusStatus] = useState<ConsensusStatus>('idle');
  const [finalAgreedAnswer, setFinalAgreedAnswer] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);

  // Telemetry Metrics State
  const [metrics, setMetrics] = useState<BenchmarkMetrics>({
    totalWallClockMs: 0,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    costPerTurnUsd: 0,
    burnRateUsdPerMin: 0,
    agentACostUsd: 0,
    agentBCostUsd: 0,
    tokensPerSec: 0,
    agentATokens: 0,
    agentBTokens: 0,
    agentALatencyMs: 0,
    agentBLatencyMs: 0,
    turnsCount: 0,
    consensusTurn: null,
    efficiencyIndex: 0,
    consensusReached: false,
    accuracyScore: 0,
    isCorrect: false,
    teamFunctionality: 'pending',
    isInfiniteLoopDetected: false,
    isUncapped: true,
  });

  // History & Storage
  const [runsHistory, setRunsHistory] = useState<BenchmarkRunRecord[]>(() => getStoredRuns());
  const [isRunSaved, setIsRunSaved] = useState<boolean>(false);
  const [turnError, setTurnError] = useState<string | null>(null);

  // Modals & Token Config
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configModalTab, setConfigModalTab] = useState<'matchup' | 'tokens'>('matchup');
  const [apiKeys, setApiKeys] = useState<ProviderApiKeys>(() => getStoredApiKeys());
  const apiKeysRef = useRef(apiKeys);
  apiKeysRef.current = apiKeys;

  const handleOpenConfig = useCallback(() => {
    setConfigModalTab('matchup');
    setIsConfigModalOpen(true);
  }, []);

  const handleOpenTokens = useCallback(() => {
    setConfigModalTab('tokens');
    setIsConfigModalOpen(true);
  }, []);

  // Refs
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  // Load & Subscribe to Universal Leaderboard in Real Time
  useEffect(() => {
    // 1. Set up real-time listener to Firestore
    const unsubscribe = subscribeUniversalLeaderboard((runs) => {
      if (Array.isArray(runs) && runs.length > 0) {
        setRunsHistory(runs);
      }
    });

    // 2. Fetch backup from backend endpoint if available
    fetch('/api/leaderboard/runs')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRunsHistory((prev) => {
            const map = new Map<string, BenchmarkRunRecord>();
            data.forEach((item) => map.set(item.id, item));
            prev.forEach((item) => {
              if (!map.has(item.id)) map.set(item.id, item);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {
        // Safe fallback
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Reset Arena State
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setActiveAgentTurn(null);
    setWaitingForManualProxy(null);
    setTurnError(null);
    setTurns([]);
    setConsensusStatus('idle');
    setFinalAgreedAnswer(null);
    setVerification(null);
    setIsRunSaved(false);
    setMetrics({
      totalWallClockMs: 0,
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      costPerTurnUsd: 0,
      burnRateUsdPerMin: 0,
      agentACostUsd: 0,
      agentBCostUsd: 0,
      tokensPerSec: 0,
      agentATokens: 0,
      agentBTokens: 0,
      agentALatencyMs: 0,
      agentBLatencyMs: 0,
      turnsCount: 0,
      consensusTurn: null,
      efficiencyIndex: 0,
      consensusReached: false,
      accuracyScore: 0,
      isCorrect: false,
      teamFunctionality: 'pending',
      isInfiniteLoopDetected: false,
      isUncapped,
    });
  }, [isUncapped]);

  // State for brief visual confirmation when randomized
  const [randomizeNotice, setRandomizeNotice] = useState<{
    agentAName: string;
    agentBName: string;
    problemTitle: string;
    suiteName: string;
  } | null>(null);

  // Randomize Matchup & Question (Picks 2 random distinct models + random benchmark question)
  const handleRandomizeMatchupAndProblem = useCallback(() => {
    const catalog = getActiveCatalogModels();
    if (catalog.length === 0) return;

    // Pick 2 random distinct models from active catalog
    const idxA = Math.floor(Math.random() * catalog.length);
    let idxB = Math.floor(Math.random() * catalog.length);
    if (catalog.length > 1 && idxB === idxA) {
      idxB = (idxA + 1 + Math.floor(Math.random() * (catalog.length - 1))) % catalog.length;
    }

    const modelA = catalog[idxA];
    const modelB = catalog[idxB];

    // Pick random problem from all benchmark problems
    const randomProblem =
      allProblems[Math.floor(Math.random() * allProblems.length)] || allProblems[0];

    const newAgentA: AgentConfig = {
      ...agentA,
      model: modelA.modelCode || modelA.id,
      provider: modelA.provider,
      brand: modelA.brand,
      isManualExternal: false,
      customBrand: modelA.provider === 'custom' ? modelA.brand : undefined,
      customModel: modelA.provider === 'custom' ? modelA.name : undefined,
    };

    const newAgentB: AgentConfig = {
      ...agentB,
      model: modelB.modelCode || modelB.id,
      provider: modelB.provider,
      brand: modelB.brand,
      isManualExternal: false,
      customBrand: modelB.provider === 'custom' ? modelB.brand : undefined,
      customModel: modelB.provider === 'custom' ? modelB.name : undefined,
    };

    setAgentA(newAgentA);
    setAgentB(newAgentB);
    setCurrentProblem(randomProblem);
    setSelectedTopicFilter('all');
    handleReset();

    setRandomizeNotice({
      agentAName: `${modelA.brand}: ${modelA.name}`,
      agentBName: `${modelB.brand}: ${modelB.name}`,
      problemTitle: randomProblem.title,
      suiteName: randomProblem.suite || randomProblem.topic.toUpperCase(),
    });

    setTimeout(() => {
      setRandomizeNotice(null);
    }, 4500);
  }, [agentA, agentB, allProblems, handleReset]);

  // Randomize Free Matchup & Question (Picks 2 random distinct 100% free models + random benchmark question)
  const handleRandomizeFreeMatchupAndProblem = useCallback(() => {
    // Primary guaranteed pool of verified free models
    const pool = VERIFIED_FREE_MODELS_POOL;

    const idxA = Math.floor(Math.random() * pool.length);
    let idxB = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idxB === idxA) {
      idxB = (idxA + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    }

    const modelA = pool[idxA];
    const modelB = pool[idxB];

    const randomProblem =
      allProblems[Math.floor(Math.random() * allProblems.length)] || allProblems[0];

    const newAgentA: AgentConfig = {
      ...agentA,
      model: modelA.slug,
      provider: 'openrouter',
      brand: modelA.brand,
      isManualExternal: false,
      customBrand: undefined,
      customModel: undefined,
    };

    const newAgentB: AgentConfig = {
      ...agentB,
      model: modelB.slug,
      provider: 'openrouter',
      brand: modelB.brand,
      isManualExternal: false,
      customBrand: undefined,
      customModel: undefined,
    };

    setAgentA(newAgentA);
    setAgentB(newAgentB);
    setCurrentProblem(randomProblem);
    setSelectedTopicFilter('all');
    handleReset();

    setRandomizeNotice({
      agentAName: `${modelA.brand}: ${modelA.name}`,
      agentBName: `${modelB.brand}: ${modelB.name}`,
      problemTitle: randomProblem.title,
      suiteName: randomProblem.suite || randomProblem.topic.toUpperCase(),
    });

    setTimeout(() => {
      setRandomizeNotice(null);
    }, 4500);
  }, [agentA, agentB, allProblems, handleReset]);

  // Topic Roulette / Random Challenge Launcher
  const handleRandomChallenge = useCallback(
    (topic?: TopicCategory) => {
      const topics: TopicCategory[] = ['logic', 'strategy', 'abstract'];
      const chosenTopic = topic || topics[Math.floor(Math.random() * topics.length)];
      setSelectedTopicFilter(chosenTopic);

      const candidateProblems = allProblems.filter((p) => p.topic === chosenTopic);
      const chosenProblem =
        candidateProblems[Math.floor(Math.random() * candidateProblems.length)] || allProblems[0];

      setCurrentProblem(chosenProblem);
      setCurrentTab('arena');
      handleReset();
    },
    [allProblems, handleReset]
  );

  // Normalize string for consensus checking
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\\boxed\{([^}]+)\}/g, '$1')
      .replace(/[$\\,\\.\\[\\]\\(\\)\\*\\_\\"\\']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Extract final answer from content using enhanced parser
  const extractAnswerFromText = (text: string): string | null => {
    return extractFinalAnswer(text);
  };

  // Response-based Infinite Loop Capper (permits up to 3 back-and-forth repetitions before capping)
  const detectResponseLoop = (turnList: ChatTurn[]): { isLoop: boolean; reason?: string } => {
    if (turnList.length < 4) return { isLoop: false };

    // 1. Allow up to 3 turns of back-and-forth repetition before capping
    // Group turns by agent and count identical/near-identical responses
    const agentATurns = turnList.filter((t) => t.agentId === 'agent_a');
    const agentBTurns = turnList.filter((t) => t.agentId === 'agent_b');

    const checkAgentRepetition = (agentTurns: ChatTurn[], agentLabel: string) => {
      if (agentTurns.length < 3) return null;

      // Check frequency of matching normalized contents
      const clusters: { text: string; count: number; turns: number[] }[] = [];

      for (const turn of agentTurns) {
        const norm = normalize(turn.content);
        if (norm.length < 25) continue;

        let matched = false;
        for (const cluster of clusters) {
          if (cluster.text === norm || cluster.text.includes(norm) || norm.includes(cluster.text)) {
            cluster.count++;
            cluster.turns.push(turn.turnNumber);
            matched = true;
            break;
          }
        }
        if (!matched) {
          clusters.push({ text: norm, count: 1, turns: [turn.turnNumber] });
        }
      }

      const severeCluster = clusters.find((c) => c.count >= 3);
      if (severeCluster) {
        return `Repetitive response loop detected: ${agentLabel} repeated near-identical response content 3 times (turns ${severeCluster.turns.join(', ')}). Capping infinite loop.`;
      }
      return null;
    };

    const repA = checkAgentRepetition(agentATurns, 'Agent Alpha');
    if (repA) return { isLoop: true, reason: repA };

    const repB = checkAgentRepetition(agentBTurns, 'Agent Beta');
    if (repB) return { isLoop: true, reason: repB };

    // 2. Check for oscillating claims across turns (e.g. A: X, B: Y, A: X, B: Y, A: X, B: Y - 3 full oscillations)
    const claims = turnList.filter((t) => t.extractedFinalAnswer !== null);
    if (claims.length >= 6) {
      const last6 = claims.slice(-6);
      const c0 = normalize(last6[0].extractedFinalAnswer!);
      const c1 = normalize(last6[1].extractedFinalAnswer!);
      const c2 = normalize(last6[2].extractedFinalAnswer!);
      const c3 = normalize(last6[3].extractedFinalAnswer!);
      const c4 = normalize(last6[4].extractedFinalAnswer!);
      const c5 = normalize(last6[5].extractedFinalAnswer!);

      if (c0 === c2 && c2 === c4 && c1 === c3 && c3 === c5 && c0 !== c1) {
        return {
          isLoop: true,
          reason: `Oscillating claims loop detected over 3 back-and-forth cycles (${last6[0].extractedFinalAnswer} vs ${last6[1].extractedFinalAnswer}). Capping infinite loop.`,
        };
      }
    }

    // 3. Check for 3 consecutive unyielding conflicting claims after deliberation (6+ turns)
    if (claims.length >= 6) {
      const last3A = turnList.filter((t) => t.agentId === 'agent_a' && t.extractedFinalAnswer !== null).slice(-3);
      const last3B = turnList.filter((t) => t.agentId === 'agent_b' && t.extractedFinalAnswer !== null).slice(-3);
      if (
        last3A.length === 3 &&
        last3B.length === 3 &&
        normalize(last3A[0].extractedFinalAnswer!) === normalize(last3A[1].extractedFinalAnswer!) &&
        normalize(last3A[1].extractedFinalAnswer!) === normalize(last3A[2].extractedFinalAnswer!) &&
        normalize(last3B[0].extractedFinalAnswer!) === normalize(last3B[1].extractedFinalAnswer!) &&
        normalize(last3B[1].extractedFinalAnswer!) === normalize(last3B[2].extractedFinalAnswer!) &&
        normalize(last3A[0].extractedFinalAnswer!) !== normalize(last3B[0].extractedFinalAnswer!)
      ) {
        return {
          isLoop: true,
          reason: `Persistent 3-turn conflicting claims deadlock without revision (${last3A[0].extractedFinalAnswer} vs ${last3B[0].extractedFinalAnswer}). Capping infinite loop.`,
        };
      }
    }

    return { isLoop: false };
  };

  // Helper to evaluate consensus state
  const evaluateConsensus = (turnList: ChatTurn[]) => {
    // Multi-agent consensus strictly requires at least 2 turns so both agents have deliberated
    if (turnList.length < 2) {
      const firstClaim = turnList[0]?.extractedFinalAnswer;
      if (firstClaim) {
        setConsensusStatus('single_claim');
      } else {
        setConsensusStatus('in_progress');
      }
      return { reachedConsensus: false, agreedAns: null, hitCap: false, isLoopDeadlock: false };
    }

    const claims = turnList.filter((t) => t.extractedFinalAnswer !== null);
    const agentAClaims = claims.filter((t) => t.agentId === 'agent_a');
    const agentBClaims = claims.filter((t) => t.agentId === 'agent_b');

    let reachedConsensus = false;
    let agreedAns: string | null = null;
    let hitCap = false;

    // Check if either agent explicitly locked consensus or confirmed partner's answer
    const lastTurn = turnList[turnList.length - 1];

    if (agentAClaims.length > 0 && agentBClaims.length > 0) {
      const latestA = agentAClaims[agentAClaims.length - 1].extractedFinalAnswer!;
      const latestB = agentBClaims[agentBClaims.length - 1].extractedFinalAnswer!;

      const normA = normalize(latestA);
      const normB = normalize(latestB);

      const isExactMatch = normA === normB;
      const isSubMatch = (normA.length > 3 && normB.includes(normA)) || (normB.length > 3 && normA.includes(normB));
      const isNumMatch = (() => {
        const numA = parseFloat(normA.replace(/[^0-9.-]/g, ''));
        const numB = parseFloat(normB.replace(/[^0-9.-]/g, ''));
        return !isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) < 0.001;
      })();

      if (isExactMatch || isSubMatch || isNumMatch) {
        reachedConsensus = true;
        agreedAns = latestA;
        setConsensusStatus('consensus_reached');
        setFinalAgreedAnswer(latestA);
      } else {
        setConsensusStatus('consensus_conflict');
      }
    } else if (lastTurn && turnList.length >= 2) {
      // Check if the current agent explicitly confirmed/locked agreement with the partner's prior claim
      const lowerContent = lastTurn.content.toLowerCase();
      const hasPartnerAgreementPhrase =
        lowerContent.includes('consensus confirmed and locked') ||
        lowerContent.includes('consensus locked') ||
        lowerContent.includes('solution verified and complete') ||
        lowerContent.includes('i agree with your') ||
        lowerContent.includes('i concur with') ||
        lowerContent.includes('confirm your answer') ||
        lowerContent.includes('agree with your final answer') ||
        lowerContent.includes('accept your answer');

      // Partner must have an existing claim that is being confirmed
      const partnerClaim =
        lastTurn.agentId === 'agent_b'
          ? (agentAClaims.length > 0 ? agentAClaims[agentAClaims.length - 1].extractedFinalAnswer : null)
          : (agentBClaims.length > 0 ? agentBClaims[agentBClaims.length - 1].extractedFinalAnswer : null);

      if (hasPartnerAgreementPhrase && partnerClaim) {
        reachedConsensus = true;
        agreedAns = partnerClaim;
        setConsensusStatus('consensus_reached');
        setFinalAgreedAnswer(partnerClaim);
      } else if (agentAClaims.length > 0 || agentBClaims.length > 0) {
        setConsensusStatus('single_claim');
      } else {
        setConsensusStatus('in_progress');
      }
    } else if (agentAClaims.length > 0 || agentBClaims.length > 0) {
      setConsensusStatus('single_claim');
    } else {
      setConsensusStatus('in_progress');
    }

    // Response-based Infinite Loop Capper
    const loopCheck = detectResponseLoop(turnList);
    let isLoopDeadlock = false;
    let loopReason: string | undefined = undefined;

    if (loopCheck.isLoop && !reachedConsensus) {
      isLoopDeadlock = true;
      loopReason = loopCheck.reason;
      setConsensusStatus('infinite_loop_abort');
    } else if (!isUncapped && turnList.length >= maxTurns && !reachedConsensus) {
      hitCap = true;
      setConsensusStatus('turn_cap_exhausted');
    }

    return { reachedConsensus, agreedAns, hitCap, isLoopDeadlock, loopReason };
  };

  // Finalize & Verify Benchmark Run
  const finalizeBenchmarkRun = useCallback(
    async (
      finalTurns: ChatTurn[],
      finalMetrics: BenchmarkMetrics,
      consensusReached: boolean,
      finalAnswer: string | null,
      abortedAsNonFunctional: boolean = false
    ) => {
      setIsRunning(false);
      setActiveAgentTurn(null);
      setWaitingForManualProxy(null);

      try {
        let verifyData: any = null;
        try {
          const verifyRes = await fetch('/api/benchmark/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problem: currentProblem,
              finalAnswerA: finalAnswer || finalTurns[finalTurns.length - 1]?.extractedFinalAnswer,
              finalAnswerB: finalAnswer,
              totalTokens: finalMetrics.totalTokens,
              totalWallClockMs: finalMetrics.totalWallClockMs,
              totalCostUsd: finalMetrics.totalCostUsd,
              consensusReached: abortedAsNonFunctional ? false : consensusReached,
              isUncapped,
              abortedAsNonFunctional,
              turnsCount: finalTurns.length,
            }),
          });
          if (verifyRes.ok) {
            verifyData = await verifyRes.json();
          }
        } catch {
          // Server offline or returned 404
        }

        // If server verification was unavailable or returned non-JSON / 404, compute on client
        if (!verifyData || verifyData.efficiencyIndex === undefined) {
          verifyData = computeVerificationClient({
            problem: currentProblem,
            finalAnswerA: finalAnswer || finalTurns[finalTurns.length - 1]?.extractedFinalAnswer,
            finalAnswerB: finalAnswer,
            totalTokens: finalMetrics.totalTokens,
            totalWallClockMs: finalMetrics.totalWallClockMs,
            totalCostUsd: finalMetrics.totalCostUsd,
            consensusReached: abortedAsNonFunctional ? false : consensusReached,
            isUncapped,
            abortedAsNonFunctional,
            turnsCount: finalTurns.length,
          });
        }

        const completedMetrics: BenchmarkMetrics = {
          ...finalMetrics,
          efficiencyIndex: verifyData.efficiencyIndex || 0,
          accuracyScore: verifyData.accuracyScore || 0,
          isCorrect: verifyData.isCorrect || false,
          consensusReached: abortedAsNonFunctional ? false : consensusReached,
          consensusTurn: consensusReached ? finalTurns.length : null,
          teamFunctionality:
            verifyData.teamVerdict ||
            (abortedAsNonFunctional
              ? 'non_functional_infinite_burn'
              : consensusReached
              ? 'optimal'
              : 'deliberating'),
          isUncapped,
        };

        const completedVerification: VerificationResult = {
          isCorrect: verifyData.isCorrect,
          accuracyScore: verifyData.accuracyScore,
          evaluatedAnswer: verifyData.evaluatedAnswer || finalAnswer || 'None',
          canonicalAnswer: verifyData.canonicalAnswer || currentProblem.canonicalAnswer,
          explanation: verifyData.explanation || currentProblem.explanation,
          verificationNotes: verifyData.verificationNotes || '',
          teamVerdict: verifyData.teamVerdict,
        };

        setMetrics(completedMetrics);
        setVerification(completedVerification);
        if (abortedAsNonFunctional) {
          setConsensusStatus('infinite_loop_abort');
        }
        setIsResultModalOpen(true);

        if (verifyData.isCorrect && consensusReached && !abortedAsNonFunctional) {
          fireSuccessConfetti();
        }

        // Automatically upload completed run to Universal Firestore Cloud Leaderboard
        try {
          const agentAInfo = getAgentMakeAndModel(agentA);
          const agentBInfo = getAgentMakeAndModel(agentB);
          const autoRecord: BenchmarkRunRecord = {
            id: `run-${Date.now()}`,
            problemId: currentProblem.id,
            problemTitle: currentProblem.title,
            topic: currentProblem.topic,
            suite: currentProblem.suite,
            suiteId: currentProblem.suiteId,
            domain: currentProblem.domain,
            sourceCitation: currentProblem.sourceCitation,
            difficulty: currentProblem.difficulty,
            date: new Date().toISOString(),
            agentAConfig: {
              ...agentA,
              name: agentAInfo.fullDisplayName,
              brand: agentAInfo.make,
            },
            agentBConfig: {
              ...agentB,
              name: agentBInfo.fullDisplayName,
              brand: agentBInfo.make,
            },
            maxTurns,
            isUncapped,
            consensusStatus: abortedAsNonFunctional
              ? 'infinite_loop_abort'
              : consensusReached
              ? 'consensus_reached'
              : 'turn_cap_exhausted',
            finalAgreedAnswer: completedVerification.evaluatedAnswer,
            metrics: completedMetrics,
            verification: completedVerification,
            turns: finalTurns,
          };

          setIsRunSaved(true);
          saveRunUniversal(autoRecord)
            .then((updated) => {
              setRunsHistory(updated);
            })
            .catch((err) => console.warn('Auto-save run sync notice:', err));

          fetch('/api/leaderboard/save-run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(autoRecord),
          }).catch(() => {});
        } catch (saveErr) {
          console.warn('Auto-upload benchmark run notice:', saveErr);
          setIsRunSaved(true);
        }
      } catch (e) {
        console.error('Verification error:', e);
      }
    },
    [currentProblem, isUncapped, agentA, agentB, maxTurns]
  );

  // Execute a single turn (handles automated API or triggers manual proxy)
  const executeSingleTurn = useCallback(
    async (
      currentTurnList: ChatTurn[],
      currentMetrics: BenchmarkMetrics
    ): Promise<{
      newTurns: ChatTurn[];
      newMetrics: BenchmarkMetrics;
      reachedConsensus: boolean;
      agreedAns: string | null;
      hitCap: boolean;
      isLoopDeadlock?: boolean;
      loopReason?: string;
      requiresManualInput?: boolean;
    }> => {
      const turnNumber = currentTurnList.length + 1;
      const isAgentATurn = currentTurnList.length % 2 === 0;
      const currentAgent = isAgentATurn ? agentA : agentB;
      const partnerAgent = isAgentATurn ? agentB : agentA;

      setActiveAgentTurn(isAgentATurn ? 'agent_a' : 'agent_b');

      // If this agent is in Manual / External mode, open proxy input
      if (currentAgent.isManualExternal) {
        setWaitingForManualProxy({
          currentAgent,
          partnerAgent,
        });
        return {
          newTurns: currentTurnList,
          newMetrics: currentMetrics,
          reachedConsensus: false,
          agreedAns: null,
          hitCap: false,
          requiresManualInput: true,
        };
      }

      // Map history for the prompt
      const history = currentTurnList.map((t) => ({
        sender: t.agentName,
        text: t.content,
        isCurrentAgent: t.agentId === currentAgent.id,
      }));

      const agentTurnCount = Math.floor(currentTurnList.length / 2) + 1;

      try {
        setTurnError(null);
        const currentActiveKeys = {
          ...getStoredApiKeys(),
          ...(apiKeysRef.current || {}),
          ...(apiKeys || {}),
        };

        const data = await generateBenchmarkTurnHybrid({
          problem: currentProblem,
          agent: currentAgent,
          partnerName: partnerAgent.name,
          history,
          currentTurn: currentTurnList.length,
          maxTurnsPerAgent: isUncapped ? 999 : Math.floor(maxTurns / 2),
          isUncapped,
          apiKeys: currentActiveKeys,
        });

        const latencyMs = data.latencyMs || 1000;
        const totalTokens = data.totalTokens || 120;
        const inputTokens = data.inputTokens || 80;
        const outputTokens = data.outputTokens || 40;
        const costUsd = data.costUsd !== undefined ? data.costUsd : calculateTokenCost(inputTokens, outputTokens, currentAgent.model);
        const tokensPerSec = data.tokensPerSec || (latencyMs > 0 ? Math.round((outputTokens / (latencyMs / 1000)) * 10) / 10 : 30);

        const extractedAnswer = data.extractedFinalAnswer || extractFinalAnswer(data.content);

        const newTurn: ChatTurn = {
          id: `turn-${turnNumber}-${Date.now()}`,
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          turnNumber,
          agentTurnNumber: agentTurnCount,
          timestamp: Date.now(),
          content: data.content,
          extractedFinalAnswer: extractedAnswer,
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens,
          costUsd,
          tokensPerSec,
          isConsensusClaim: !!extractedAnswer,
          modelUsed: data.modelUsed,
        };

        const updatedTurns = [...currentTurnList, newTurn];

        // Update telemetry metrics
        const updatedTotalWallClockMs = currentMetrics.totalWallClockMs + latencyMs;
        const updatedTotalTokens = currentMetrics.totalTokens + totalTokens;
        const updatedTotalInputTokens = currentMetrics.totalInputTokens + inputTokens;
        const updatedTotalOutputTokens = currentMetrics.totalOutputTokens + outputTokens;
        const updatedTotalCostUsd = (currentMetrics.totalCostUsd || 0) + costUsd;

        const overallTokensPerSec =
          updatedTotalWallClockMs > 0
            ? Math.round((updatedTotalOutputTokens / (updatedTotalWallClockMs / 1000)) * 10) / 10
            : 0;

        const updatedAgentATokens = isAgentATurn
          ? currentMetrics.agentATokens + totalTokens
          : currentMetrics.agentATokens;
        const updatedAgentBTokens = !isAgentATurn
          ? currentMetrics.agentBTokens + totalTokens
          : currentMetrics.agentBTokens;

        const updatedAgentACost = isAgentATurn
          ? (currentMetrics.agentACostUsd || 0) + costUsd
          : currentMetrics.agentACostUsd || 0;
        const updatedAgentBCost = !isAgentATurn
          ? (currentMetrics.agentBCostUsd || 0) + costUsd
          : currentMetrics.agentBCostUsd || 0;

        const updatedAgentALatency = isAgentATurn
          ? currentMetrics.agentALatencyMs + latencyMs
          : currentMetrics.agentALatencyMs;
        const updatedAgentBLatency = !isAgentATurn
          ? currentMetrics.agentBLatencyMs + latencyMs
          : currentMetrics.agentBLatencyMs;

        const nextMetrics: BenchmarkMetrics = {
          ...currentMetrics,
          totalWallClockMs: updatedTotalWallClockMs,
          totalTokens: updatedTotalTokens,
          totalInputTokens: updatedTotalInputTokens,
          totalOutputTokens: updatedTotalOutputTokens,
          totalCostUsd: updatedTotalCostUsd,
          agentACostUsd: updatedAgentACost,
          agentBCostUsd: updatedAgentBCost,
          tokensPerSec: overallTokensPerSec,
          agentATokens: updatedAgentATokens,
          agentBTokens: updatedAgentBTokens,
          agentALatencyMs: updatedAgentALatency,
          agentBLatencyMs: updatedAgentBLatency,
          turnsCount: updatedTurns.length,
          isUncapped,
        };

        const { reachedConsensus, agreedAns, hitCap, isLoopDeadlock, loopReason } = evaluateConsensus(updatedTurns);

        setTurns(updatedTurns);
        setMetrics(nextMetrics);
        setActiveAgentTurn(null);

        return {
          newTurns: updatedTurns,
          newMetrics: nextMetrics,
          reachedConsensus,
          agreedAns,
          hitCap,
          isLoopDeadlock,
          loopReason,
        };
      } catch (err: any) {
        console.error('Turn generation failed:', err);
        setTurnError(err?.message || 'Failed to generate agent response');
        setActiveAgentTurn(null);
        setIsRunning(false);
        throw err;
      }
    },
    [agentA, agentB, currentProblem, maxTurns, isUncapped, apiKeys]
  );

  // Submit response for manual external proxy turn
  const handleManualTurnSubmit = useCallback(
    async (
      content: string,
      latencyMs: number,
      inputTokens: number,
      outputTokens: number,
      costUsd: number
    ) => {
      const currentTurnList = turnsRef.current;
      const currentMetrics = metricsRef.current;

      const turnNumber = currentTurnList.length + 1;
      const isAgentATurn = currentTurnList.length % 2 === 0;
      const currentAgent = isAgentATurn ? agentA : agentB;
      const agentTurnCount = Math.floor(currentTurnList.length / 2) + 1;

      const extractedFinalAnswer = extractAnswerFromText(content);
      const totalTokens = inputTokens + outputTokens;
      const tokensPerSec =
        latencyMs > 0 ? Math.round((outputTokens / (latencyMs / 1000)) * 10) / 10 : 25;

      const newTurn: ChatTurn = {
        id: `turn-manual-${turnNumber}-${Date.now()}`,
        agentId: currentAgent.id,
        agentName: currentAgent.name,
        turnNumber,
        agentTurnNumber: agentTurnCount,
        timestamp: Date.now(),
        content,
        extractedFinalAnswer,
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd,
        tokensPerSec,
        isConsensusClaim: !!extractedFinalAnswer,
        isManualEntry: true,
        modelUsed: `${currentAgent.customBrand || currentAgent.brand || 'External'} ${
          currentAgent.customModel || currentAgent.model
        }`,
      };

      const updatedTurns = [...currentTurnList, newTurn];

      // Update telemetry metrics
      const updatedTotalWallClockMs = currentMetrics.totalWallClockMs + latencyMs;
      const updatedTotalTokens = currentMetrics.totalTokens + totalTokens;
      const updatedTotalInputTokens = currentMetrics.totalInputTokens + inputTokens;
      const updatedTotalOutputTokens = currentMetrics.totalOutputTokens + outputTokens;
      const updatedTotalCostUsd = (currentMetrics.totalCostUsd || 0) + costUsd;

      const overallTokensPerSec =
        updatedTotalWallClockMs > 0
          ? Math.round((updatedTotalOutputTokens / (updatedTotalWallClockMs / 1000)) * 10) / 10
          : 0;

      const updatedAgentATokens = isAgentATurn
        ? currentMetrics.agentATokens + totalTokens
        : currentMetrics.agentATokens;
      const updatedAgentBTokens = !isAgentATurn
        ? currentMetrics.agentBTokens + totalTokens
        : currentMetrics.agentBTokens;

      const updatedAgentACost = isAgentATurn
        ? (currentMetrics.agentACostUsd || 0) + costUsd
        : currentMetrics.agentACostUsd || 0;
      const updatedAgentBCost = !isAgentATurn
        ? (currentMetrics.agentBCostUsd || 0) + costUsd
        : currentMetrics.agentBCostUsd || 0;

      const updatedAgentALatency = isAgentATurn
        ? currentMetrics.agentALatencyMs + latencyMs
        : currentMetrics.agentALatencyMs;
      const updatedAgentBLatency = !isAgentATurn
        ? currentMetrics.agentBLatencyMs + latencyMs
        : currentMetrics.agentBLatencyMs;

      const nextMetrics: BenchmarkMetrics = {
        ...currentMetrics,
        totalWallClockMs: updatedTotalWallClockMs,
        totalTokens: updatedTotalTokens,
        totalInputTokens: updatedTotalInputTokens,
        totalOutputTokens: updatedTotalOutputTokens,
        totalCostUsd: updatedTotalCostUsd,
        agentACostUsd: updatedAgentACost,
        agentBCostUsd: updatedAgentBCost,
        tokensPerSec: overallTokensPerSec,
        agentATokens: updatedAgentATokens,
        agentBTokens: updatedAgentBTokens,
        agentALatencyMs: updatedAgentALatency,
        agentBLatencyMs: updatedAgentBLatency,
        turnsCount: updatedTurns.length,
        isUncapped,
      };

      const { reachedConsensus, agreedAns, hitCap, isLoopDeadlock, loopReason } = evaluateConsensus(updatedTurns);

      setTurns(updatedTurns);
      setMetrics(nextMetrics);
      setWaitingForManualProxy(null);
      setActiveAgentTurn(null);

      if (isLoopDeadlock) {
        await finalizeBenchmarkRun(updatedTurns, nextMetrics, false, null, true);
      } else if (reachedConsensus || hitCap) {
        await finalizeBenchmarkRun(updatedTurns, nextMetrics, reachedConsensus, agreedAns);
      } else if (isRunningRef.current && !isPausedRef.current) {
        setTimeout(async () => {
          try {
            const nextRes = await executeSingleTurn(updatedTurns, nextMetrics);
            if (nextRes.isLoopDeadlock) {
              await finalizeBenchmarkRun(
                nextRes.newTurns,
                nextRes.newMetrics,
                false,
                null,
                true
              );
            } else if (nextRes.reachedConsensus || nextRes.hitCap) {
              await finalizeBenchmarkRun(
                nextRes.newTurns,
                nextRes.newMetrics,
                nextRes.reachedConsensus,
                nextRes.agreedAns
              );
            }
          } catch (e) {
            console.error('Failed executing following turn:', e);
          }
        }, 600);
      }
    },
    [agentA, agentB, isUncapped, finalizeBenchmarkRun, executeSingleTurn]
  );

  // Fallback single turn to automated Gemini inference
  const handleFallbackManualToAutomated = useCallback(async () => {
    setWaitingForManualProxy(null);
    try {
      const isAgentATurn = turns.length % 2 === 0;
      const currentAgent = isAgentATurn ? agentA : agentB;
      const partnerAgent = isAgentATurn ? agentB : agentA;

      const history = turns.map((t) => ({
        sender: t.agentName,
        text: t.content,
        isCurrentAgent: t.agentId === currentAgent.id,
      }));

      const data = await generateBenchmarkTurnHybrid({
        problem: currentProblem,
        agent: { ...currentAgent, model: currentAgent.model || 'gemini-2.5-flash', isManualExternal: false },
        partnerName: partnerAgent.name,
        history,
        currentTurn: turns.length,
        maxTurnsPerAgent: isUncapped ? 999 : Math.floor(maxTurns / 2),
        isUncapped,
        apiKeys,
      });

      const latencyMs = data.latencyMs || 1000;
      const totalTokens = data.totalTokens || 120;
      const inputTokens = data.inputTokens || 80;
      const outputTokens = data.outputTokens || 40;
      const costUsd = data.costUsd !== undefined ? data.costUsd : calculateTokenCost(inputTokens, outputTokens, currentAgent.model);

      await handleManualTurnSubmit(data.content, latencyMs, inputTokens, outputTokens, costUsd);
    } catch (e) {
      console.error('Manual fallback execution failed:', e);
    }
  }, [turns, agentA, agentB, currentProblem, isUncapped, maxTurns, apiKeys, handleManualTurnSubmit]);

  // Manual Flag / Abort for Infinite Token Burn Loop
  const handleFlagLoopAndAbort = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(false);
    await finalizeBenchmarkRun(turns, metrics, false, null, true);
  }, [turns, metrics, finalizeBenchmarkRun]);

  // Auto-Run loop
  const handleStartAutoRun = useCallback(async () => {
    setIsRunning(true);
    setIsPaused(false);

    let currentTurnList = turns;
    let currentMetricsObj = metrics;

    if (consensusStatus === 'consensus_reached' || (!isUncapped && currentTurnList.length >= maxTurns)) {
      handleReset();
      currentTurnList = [];
      currentMetricsObj = {
        totalWallClockMs: 0,
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUsd: 0,
        costPerTurnUsd: 0,
        burnRateUsdPerMin: 0,
        agentACostUsd: 0,
        agentBCostUsd: 0,
        tokensPerSec: 0,
        agentATokens: 0,
        agentBTokens: 0,
        agentALatencyMs: 0,
        agentBLatencyMs: 0,
        turnsCount: 0,
        consensusTurn: null,
        efficiencyIndex: 0,
        consensusReached: false,
        accuracyScore: 0,
        isCorrect: false,
        teamFunctionality: 'pending',
        isInfiniteLoopDetected: false,
        isUncapped,
      };
    }

    try {
      const safetyTurnLimit = isUncapped ? 40 : maxTurns;

      while (currentTurnList.length < safetyTurnLimit) {
        if (isPausedRef.current) {
          break;
        }

        const result = await executeSingleTurn(currentTurnList, currentMetricsObj);
        if (result.requiresManualInput) {
          break;
        }

        currentTurnList = result.newTurns;
        currentMetricsObj = result.newMetrics;

        if (result.isLoopDeadlock) {
          await finalizeBenchmarkRun(
            currentTurnList,
            currentMetricsObj,
            false,
            null,
            true
          );
          break;
        }

        if (result.reachedConsensus || result.hitCap) {
          await finalizeBenchmarkRun(
            currentTurnList,
            currentMetricsObj,
            result.reachedConsensus,
            result.agreedAns
          );
          break;
        }

        await new Promise((r) => setTimeout(r, 600));
      }

      if (isUncapped && currentTurnList.length >= safetyTurnLimit && consensusStatus !== 'consensus_reached') {
        await finalizeBenchmarkRun(
          currentTurnList,
          currentMetricsObj,
          false,
          null,
          true
        );
      }
    } catch (e) {
      console.error('Error during auto-run benchmark:', e);
      setIsRunning(false);
    }
  }, [turns, metrics, consensusStatus, maxTurns, isUncapped, handleReset, executeSingleTurn, finalizeBenchmarkRun]);

  const handlePause = () => {
    setIsPaused(true);
    setIsRunning(false);
  };

  const handleStepTurn = async () => {
    if (consensusStatus === 'consensus_reached' || (!isUncapped && turns.length >= maxTurns)) {
      handleReset();
      return;
    }

    try {
      const result = await executeSingleTurn(turns, metrics);
      if (result.requiresManualInput) {
        return;
      }
      if (result.reachedConsensus || result.hitCap) {
        await finalizeBenchmarkRun(
          result.newTurns,
          result.newMetrics,
          result.reachedConsensus,
          result.agreedAns
        );
      }
    } catch (e) {
      console.error('Step turn failed:', e);
    }
  };

  // Save completed run to leaderboard
  const handleSaveToLeaderboard = async () => {
    if (isRunSaved) return;

    const agentAInfo = getAgentMakeAndModel(agentA);
    const agentBInfo = getAgentMakeAndModel(agentB);

    const record: BenchmarkRunRecord = {
      id: `run-${Date.now()}`,
      problemId: currentProblem.id,
      problemTitle: currentProblem.title,
      topic: currentProblem.topic,
      difficulty: currentProblem.difficulty,
      date: new Date().toISOString(),
      agentAConfig: {
        ...agentA,
        name: agentAInfo.fullDisplayName,
        brand: agentAInfo.make,
      },
      agentBConfig: {
        ...agentB,
        name: agentBInfo.fullDisplayName,
        brand: agentBInfo.make,
      },
      maxTurns,
      isUncapped,
      consensusStatus,
      finalAgreedAnswer,
      metrics,
      verification: verification || {
        isCorrect: metrics.isCorrect,
        accuracyScore: metrics.accuracyScore,
        evaluatedAnswer: finalAgreedAnswer || 'None',
        canonicalAnswer: currentProblem.canonicalAnswer,
        explanation: currentProblem.explanation,
        verificationNotes: '',
      },
      turns,
    };

    try {
      setIsRunSaved(true);
      // Save universally (Firestore cloud database + local storage cache)
      const updated = await saveRunUniversal(record);
      setRunsHistory(updated);

      // Also notify backend endpoint if online
      fetch('/api/leaderboard/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).catch(() => {});
    } catch (e) {
      console.warn('Leaderboard universal save notice:', e);
      setIsRunSaved(true);
    }
  };

  const handleAddCustomProblem = (newProblem: BenchmarkProblem) => {
    setAllProblems((prev) => [newProblem, ...prev]);
    setCurrentProblem(newProblem);
    setCurrentTab('arena');
    handleReset();
  };

  const handleSelectAndLaunchProblem = (problem: BenchmarkProblem) => {
    setCurrentProblem(problem);
    setCurrentTab('arena');
    handleReset();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Global Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onRandomChallenge={handleRandomChallenge}
        isRunning={isRunning}
        onOpenTokens={handleOpenTokens}
        configuredKeysCount={countConfiguredKeys(apiKeys)}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* VIEW 1: BENCHMARK ARENA */}
        {currentTab === 'arena' && (
          <div className="space-y-6 animate-fade-in">
            {/* Arena Header & Controls */}
            <ArenaHeader
              selectedTopic={selectedTopicFilter}
              onSelectTopic={(t) => {
                setSelectedTopicFilter(t);
                const list = t === 'all' ? allProblems : allProblems.filter((p) => p.topic === t);
                if (list.length > 0) {
                  setCurrentProblem(list[0]);
                  handleReset();
                }
              }}
              currentProblem={currentProblem}
              onSelectProblem={(p) => {
                setCurrentProblem(p);
                handleReset();
              }}
              agentA={agentA}
              agentB={agentB}
              onOpenConfig={() => setIsConfigModalOpen(true)}
              onRandomize={handleRandomizeMatchupAndProblem}
              onRandomizeFree={handleRandomizeFreeMatchupAndProblem}
              isRunning={isRunning}
              isPaused={isPaused}
              onStartAutoRun={handleStartAutoRun}
              onPause={handlePause}
              turnCount={turns.length}
              maxTurns={maxTurns}
            />

            {/* Randomization Alert / Toast Banner */}
            {randomizeNotice && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50/90 px-4 py-3 text-xs text-purple-900 shadow-sm dark:border-purple-800/80 dark:bg-purple-950/50 dark:text-purple-100 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-2xs">
                    <Shuffle className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-purple-950 dark:text-white mr-1.5">
                      Randomized Matchup:
                    </span>
                    <span className="font-semibold text-purple-800 dark:text-purple-300">
                      {randomizeNotice.agentAName}
                    </span>
                    <span className="text-purple-500 dark:text-purple-400 mx-1.5 font-bold">vs</span>
                    <span className="font-semibold text-purple-800 dark:text-purple-300">
                      {randomizeNotice.agentBName}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 mx-2">•</span>
                    <span className="text-slate-600 dark:text-slate-300 truncate">
                      [{randomizeNotice.suiteName}] {randomizeNotice.problemTitle}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setRandomizeNotice(null)}
                  className="rounded-lg p-1 text-purple-400 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900/60 dark:hover:text-purple-200 cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Problem Statement & Consensus Protocol (Grouped with Question Selector) */}
            <ProblemCard problem={currentProblem} />

            {/* Error Notification / Recovery Banner */}
            {turnError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      Inference Service Notice
                    </p>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 max-w-2xl">
                      {turnError}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenTokens}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-500 cursor-pointer shadow-xs transition-colors"
                  >
                    <span>APIs & Tokens</span>
                  </button>
                  <button
                    onClick={() => {
                      setTurnError(null);
                      handleStepTurn();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-500 cursor-pointer shadow-xs transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Turn</span>
                  </button>
                  <button
                    onClick={() => setTurnError(null)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-100 hover:text-slate-700 dark:hover:bg-rose-900/50 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Live Model & Brand Telemetry Tracker */}
            <AgentModelTracker
              agentA={agentA}
              agentB={agentB}
              onChangeAgentA={setAgentA}
              onChangeAgentB={setAgentB}
              lastTurnAgentA={turns.slice().reverse().find((t) => t.agentId === 'agent_a') || null}
              lastTurnAgentB={turns.slice().reverse().find((t) => t.agentId === 'agent_b') || null}
              onOpenConfig={handleOpenConfig}
              onOpenTokens={handleOpenTokens}
              apiKeys={apiKeys}
              isRunning={isRunning}
            />

            {/* Split Screen: Equal Width (50% / 50%) for Dialogue and Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Dual-Blind Multi-Agent Dialogue */}
              <div className="space-y-4">
                {/* External Agent Manual Proxy Card */}
                {waitingForManualProxy && (
                  <ExternalAgentInputCard
                    currentAgent={waitingForManualProxy.currentAgent}
                    partnerAgent={waitingForManualProxy.partnerAgent}
                    problem={currentProblem}
                    turns={turns}
                    isUncapped={isUncapped}
                    maxTurns={maxTurns}
                    onSubmitTurn={handleManualTurnSubmit}
                    onFallbackToAutomated={handleFallbackManualToAutomated}
                  />
                )}

                <ChatTranscript
                  turns={turns}
                  agentA={agentA}
                  agentB={agentB}
                  activeAgentTurn={activeAgentTurn}
                  isRunning={isRunning}
                  consensusStatus={consensusStatus}
                />
              </div>

              {/* Right Column: Live Telemetry, Compute Metrics & Verifier */}
              <div className="sticky top-20">
                <TelemetryPanel
                  metrics={metrics}
                  consensusStatus={consensusStatus}
                  verification={verification}
                  turnCount={turns.length}
                  maxTurns={maxTurns}
                  isUncapped={isUncapped}
                  isRunning={isRunning}
                  onAbortInfiniteBurn={handleFlagLoopAndAbort}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: LEADERBOARD & ANALYTICS */}
        {currentTab === 'leaderboard' && (
          <div className="animate-fade-in">
            <LeaderboardView
              runs={runsHistory}
              onSelectRunToInspect={(run) => {
                // Inspected inside component modal
              }}
              onLaunchChallenge={(problemId) => {
                const prob = allProblems.find((p) => p.id === problemId);
                if (prob) {
                  setCurrentProblem(prob);
                  setCurrentTab('arena');
                  handleReset();
                }
              }}
            />
          </div>
        )}

        {/* VIEW 3: PROBLEM SUITE & CUSTOM CREATOR */}
        {currentTab === 'problems' && (
          <div className="animate-fade-in">
            <ProblemSuiteView
              problems={allProblems}
              onSelectAndLaunchProblem={handleSelectAndLaunchProblem}
              onAddCustomProblem={handleAddCustomProblem}
            />
          </div>
        )}

        {/* VIEW 4: METHODOLOGY */}
        {currentTab === 'methodology' && (
          <div className="animate-fade-in">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <MethodologyModal isOpen={true} onClose={() => setCurrentTab('arena')} />
            </div>
          </div>
        )}
      </main>

      {/* Result Modal when run completes */}
      <ResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        problem={currentProblem}
        metrics={metrics}
        verification={verification}
        agentA={agentA}
        agentB={agentB}
        onSaveToLeaderboard={handleSaveToLeaderboard}
        onRunNextRandom={() => {
          setIsResultModalOpen(false);
          handleRandomChallenge();
        }}
        onRerunSame={() => {
          setIsResultModalOpen(false);
          handleReset();
          handleStartAutoRun();
        }}
        isSaved={isRunSaved}
      />

      {/* Matchup & Protocol Configuration Modal */}
      <MatchupConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        initialTab={configModalTab}
        agentA={agentA}
        agentB={agentB}
        maxTurns={maxTurns}
        isUncapped={isUncapped}
        apiKeys={apiKeys}
        onSaveConfig={(newA, newB, newMaxTurns, newIsUncapped, updatedApiKeys) => {
          setAgentA(newA);
          setAgentB(newB);
          setMaxTurns(newMaxTurns);
          setIsUncapped(newIsUncapped);
          if (updatedApiKeys) {
            setApiKeys(updatedApiKeys);
          }
          handleReset();
        }}
      />
    </div>
  );
}
