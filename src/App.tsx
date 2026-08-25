import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
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
    s.toLowerCase().replace(/[$\\,\\.\\[\\]\\(\\)\\*\\_\\"\\']/g, '').trim();

  // Extract final answer from content
  const extractAnswerFromText = (text: string): string | null => {
    const finalAnswerRegex = /(?:FINAL ANSWER|ANSWER|CONSENSUS):\s*\[?([^\]\n\r]+)\]?/i;
    const match = text.match(finalAnswerRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  };

  // Helper to evaluate consensus state
  const evaluateConsensus = (turnList: ChatTurn[]) => {
    const claims = turnList.filter((t) => t.extractedFinalAnswer !== null);
    const agentAClaims = claims.filter((t) => t.agentId === 'agent_a');
    const agentBClaims = claims.filter((t) => t.agentId === 'agent_b');

    let reachedConsensus = false;
    let agreedAns: string | null = null;
    let hitCap = false;

    if (agentAClaims.length > 0 && agentBClaims.length > 0) {
      const latestA = agentAClaims[agentAClaims.length - 1].extractedFinalAnswer!;
      const latestB = agentBClaims[agentBClaims.length - 1].extractedFinalAnswer!;

      if (normalize(latestA) === normalize(latestB) || latestA.includes(latestB) || latestB.includes(latestA)) {
        reachedConsensus = true;
        agreedAns = latestA;
        setConsensusStatus('consensus_reached');
        setFinalAgreedAnswer(latestA);
      } else {
        setConsensusStatus('consensus_conflict');
      }
    } else if (agentAClaims.length > 0 || agentBClaims.length > 0) {
      setConsensusStatus('single_claim');
    } else {
      setConsensusStatus('in_progress');
    }

    if (!isUncapped && turnList.length >= maxTurns && !reachedConsensus) {
      hitCap = true;
      setConsensusStatus('turn_cap_exhausted');
    }

    return { reachedConsensus, agreedAns, hitCap };
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

        const newTurn: ChatTurn = {
          id: `turn-${turnNumber}-${Date.now()}`,
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          turnNumber,
          agentTurnNumber: agentTurnCount,
          timestamp: Date.now(),
          content: data.content,
          extractedFinalAnswer: data.extractedFinalAnswer,
          latencyMs,
          inputTokens,
          outputTokens,
          totalTokens,
          costUsd,
          tokensPerSec,
          isConsensusClaim: !!data.extractedFinalAnswer,
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

        const { reachedConsensus, agreedAns, hitCap } = evaluateConsensus(updatedTurns);

        setTurns(updatedTurns);
        setMetrics(nextMetrics);
        setActiveAgentTurn(null);

        return {
          newTurns: updatedTurns,
          newMetrics: nextMetrics,
          reachedConsensus,
          agreedAns,
          hitCap,
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

      const { reachedConsensus, agreedAns, hitCap } = evaluateConsensus(updatedTurns);

      setTurns(updatedTurns);
      setMetrics(nextMetrics);
      setWaitingForManualProxy(null);
      setActiveAgentTurn(null);

      if (reachedConsensus || hitCap) {
        await finalizeBenchmarkRun(updatedTurns, nextMetrics, reachedConsensus, agreedAns);
      } else if (isRunningRef.current && !isPausedRef.current) {
        setTimeout(async () => {
          try {
            const nextRes = await executeSingleTurn(updatedTurns, nextMetrics);
            if (nextRes.reachedConsensus || nextRes.hitCap) {
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
              isRunning={isRunning}
              isPaused={isPaused}
              isUncapped={isUncapped}
              onToggleUncapped={() => {
                setIsUncapped(!isUncapped);
                handleReset();
              }}
              onStartAutoRun={handleStartAutoRun}
              onPause={handlePause}
              onStepTurn={handleStepTurn}
              onReset={handleReset}
              onAbortInfiniteBurn={handleFlagLoopAndAbort}
              turnCount={turns.length}
              maxTurns={maxTurns}
            />

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
