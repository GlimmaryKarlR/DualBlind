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
} from './types/benchmark';
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
import { fireSuccessConfetti, calculateTokenCost } from './utils/formatters';

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
    temperature: 0.3,
    avatarColor: 'indigo',
    systemPromptModifier: 'Specializes in analytical rigor, step-by-step constraint checking, and proof validation.',
  });

  const [agentB, setAgentB] = useState<AgentConfig>({
    id: 'agent_b',
    name: 'Agent Beta',
    model: 'gemini-3.7-flash',
    temperature: 0.4,
    avatarColor: 'emerald',
    systemPromptModifier: 'Specializes in lateral exploration, mathematical counter-examples, and strategic game theory.',
  });

  const [maxTurns, setMaxTurns] = useState<number>(10); // 5 per agent (when capped mode is selected)
  const [isUncapped, setIsUncapped] = useState<boolean>(true); // Default to uncapped turns for real cost to consensus

  // Active Arena Execution State
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [activeAgentTurn, setActiveAgentTurn] = useState<'agent_a' | 'agent_b' | null>(null);
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
  const [runsHistory, setRunsHistory] = useState<BenchmarkRunRecord[]>([]);
  const [isRunSaved, setIsRunSaved] = useState<boolean>(false);
  const [turnError, setTurnError] = useState<string | null>(null);

  // Modals
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState<boolean>(false);

  // Ref to track if auto-run loop is active
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Load past runs from server on mount
  useEffect(() => {
    fetch('/api/benchmark/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.runs) && data.runs.length > 0) {
          setRunsHistory(data.runs);
        }
      })
      .catch((err) => console.log('Notice: in-memory run store initialized', err));
  }, []);

  // Reset Arena State
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setActiveAgentTurn(null);
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

  // Execute a single turn
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
    }> => {
      const turnNumber = currentTurnList.length + 1;
      const isAgentATurn = currentTurnList.length % 2 === 0;
      const currentAgent = isAgentATurn ? agentA : agentB;
      const partnerAgent = isAgentATurn ? agentB : agentA;

      setActiveAgentTurn(isAgentATurn ? 'agent_a' : 'agent_b');

      // Map history for the prompt
      const history = currentTurnList.map((t) => ({
        sender: t.agentName,
        text: t.content,
        isCurrentAgent: t.agentId === currentAgent.id,
      }));

      const agentTurnCount = Math.floor(currentTurnList.length / 2) + 1;

      try {
        setTurnError(null);
        const response = await fetch('/api/benchmark/generate-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problem: currentProblem,
            agent: currentAgent,
            partnerName: partnerAgent.name,
            history,
            currentTurn: currentTurnList.length,
            maxTurnsPerAgent: isUncapped ? 999 : Math.floor(maxTurns / 2),
            isUncapped,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const latencyMs = data.latencyMs || 1000;
        const totalTokens = data.totalTokens || 120;
        const inputTokens = data.inputTokens || 80;
        const outputTokens = data.outputTokens || 40;
        const costUsd = data.costUsd !== undefined ? data.costUsd : calculateTokenCost(inputTokens, outputTokens);
        const tokensPerSec = latencyMs > 0 ? Math.round((outputTokens / (latencyMs / 1000)) * 10) / 10 : 30;

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

        // Check for Consensus Signal:
        const claims = updatedTurns.filter((t) => t.extractedFinalAnswer !== null);
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

        // Cap check only in capped mode
        if (!isUncapped && updatedTurns.length >= maxTurns && !reachedConsensus) {
          hitCap = true;
          setConsensusStatus('turn_cap_exhausted');
        }

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
    [agentA, agentB, currentProblem, maxTurns, isUncapped]
  );

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
          }),
        });

        const verifyData = await verifyRes.json();

        const completedMetrics: BenchmarkMetrics = {
          ...finalMetrics,
          efficiencyIndex: verifyData.efficiencyIndex || 0,
          accuracyScore: verifyData.accuracyScore || 0,
          isCorrect: verifyData.isCorrect || false,
          consensusReached: abortedAsNonFunctional ? false : consensusReached,
          consensusTurn: consensusReached ? finalTurns.length : null,
          teamFunctionality: verifyData.teamFunctionality || (abortedAsNonFunctional ? 'non_functional_loop' : 'divergent_gridlock'),
          isUncapped,
        };

        const completedVerification: VerificationResult = {
          isCorrect: verifyData.isCorrect,
          accuracyScore: verifyData.accuracyScore,
          evaluatedAnswer: verifyData.evaluatedAnswer || finalAnswer || 'None',
          canonicalAnswer: verifyData.canonicalAnswer || currentProblem.canonicalAnswer,
          explanation: verifyData.explanation || currentProblem.explanation,
          verificationNotes: verifyData.verificationNotes || '',
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
      } catch (e) {
        console.error('Verification error:', e);
      }
    },
    [currentProblem, isUncapped]
  );

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
      // If uncapped, allow running until consensus is reached, paused, or safety backstop (40 turns)
      const safetyTurnLimit = isUncapped ? 40 : maxTurns;

      while (currentTurnList.length < safetyTurnLimit) {
        if (isPausedRef.current) {
          break;
        }

        const result = await executeSingleTurn(currentTurnList, currentMetricsObj);
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

        // Slight breathing pause between turns for UI realism
        await new Promise((r) => setTimeout(r, 600));
      }

      // If reached safetyTurnLimit in uncapped mode without consensus, prompt evaluation
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

    const record: BenchmarkRunRecord = {
      id: `run-${Date.now()}`,
      problemId: currentProblem.id,
      problemTitle: currentProblem.title,
      topic: currentProblem.topic,
      difficulty: currentProblem.difficulty,
      date: new Date().toISOString(),
      agentAConfig: agentA,
      agentBConfig: agentB,
      maxTurns,
      maxTurnsPerAgent: isUncapped ? 999 : Math.floor(maxTurns / 2),
      isUncapped,
      turns,
      consensusStatus,
      finalAgreedAnswer,
      verification,
      metrics,
    };

    setRunsHistory((prev) => [record, ...prev]);
    setIsRunSaved(true);

    try {
      await fetch('/api/benchmark/save-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (e) {
      console.log('Saved to client state');
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

            {/* Error Notification / Recovery Banner */}
            {turnError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      Transient API Interruption Handled
                    </p>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                      {turnError} — You can retry this turn or step forward.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
              lastTurnAgentA={turns.slice().reverse().find((t) => t.agentId === 'agent_a') || null}
              lastTurnAgentB={turns.slice().reverse().find((t) => t.agentId === 'agent_b') || null}
              onOpenConfig={() => setIsConfigModalOpen(true)}
              isRunning={isRunning}
            />

            {/* Split Screen: Problem + Chat on Left (60%), Live Telemetry on Right (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Problem Statement & Chat Transcript */}
              <div className="lg:col-span-7 space-y-4">
                <ProblemCard problem={currentProblem} />

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
              <div className="lg:col-span-5">
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
        agentA={agentA}
        agentB={agentB}
        maxTurns={maxTurns}
        isUncapped={isUncapped}
        onSaveConfig={(newA, newB, newMaxTurns, newIsUncapped) => {
          setAgentA(newA);
          setAgentB(newB);
          setMaxTurns(newMaxTurns);
          setIsUncapped(newIsUncapped);
        }}
      />
    </div>
  );
}
