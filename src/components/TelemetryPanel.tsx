import React from 'react';
import {
  Zap,
  Clock,
  Cpu,
  Target,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Ban,
  Activity,
} from 'lucide-react';
import { BenchmarkMetrics, ConsensusStatus, VerificationResult } from '../types/benchmark';
import { formatTime, formatNumber, formatCurrency, getTierBadge, getTeamFunctionalityBadge } from '../utils/formatters';

interface TelemetryPanelProps {
  metrics: BenchmarkMetrics;
  consensusStatus: ConsensusStatus;
  verification: VerificationResult | null;
  turnCount: number;
  maxTurns: number;
  isUncapped: boolean;
  isRunning: boolean;
  onAbortInfiniteBurn?: () => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  metrics,
  consensusStatus,
  verification,
  turnCount,
  maxTurns,
  isUncapped,
  isRunning,
  onAbortInfiniteBurn,
}) => {
  const tier = getTierBadge(metrics.efficiencyIndex, metrics.isCorrect);
  const teamBadge = getTeamFunctionalityBadge(
    metrics.teamFunctionality,
    metrics.consensusReached,
    metrics.isCorrect
  );

  const wallClockSec = metrics.totalWallClockMs > 0 ? (metrics.totalWallClockMs / 1000).toFixed(2) : '0.00';
  const tokensPerSec = metrics.tokensPerSec.toFixed(1);

  // Compute burn velocity ($/min)
  const wallClockMinutes = metrics.totalWallClockMs > 0 ? metrics.totalWallClockMs / 60000 : 0.001;
  const burnRatePerMin = metrics.totalCostUsd > 0 ? (metrics.totalCostUsd / wallClockMinutes) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Main Cost & Time-to-Consensus Hero Card */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-blue-50/50 p-5 shadow-xs dark:border-indigo-950/60 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                Consensus Efficiency Index
              </h3>
              <p className="text-[11px] text-slate-700 dark:text-slate-400">
                Accuracy ÷ (Time to Consensus × Total Tokens)
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${tier.bg} ${tier.color} ${tier.border}`}
          >
            {tier.label}
          </span>
        </div>

        {/* Big Score Display */}
        <div className="mt-4 flex items-baseline justify-between border-b border-indigo-100/80 pb-3 dark:border-indigo-900/40">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                {metrics.efficiencyIndex > 0 ? metrics.efficiencyIndex.toFixed(1) : '--'}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">
                pts
              </span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-400">
              Measures inference speed, cost minimization & collaborative accuracy
            </p>
          </div>

          {/* Mini Real-Time Formula breakdown */}
          <div className="text-right font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300">
              Live Evaluation
            </div>
            <div>Acc: <span className="font-bold text-emerald-600 dark:text-emerald-400">{metrics.accuracyScore}%</span></div>
            <div>Time: <span className="font-bold">{wallClockSec}s</span></div>
            <div>Cost: <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(metrics.totalCostUsd)}</span></div>
          </div>
        </div>

        {/* Team Collaboration & Functionality Banner */}
        <div className="mt-3 rounded-xl border p-3 bg-white/70 dark:bg-slate-900/70 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
              Team Functionality:
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold border ${teamBadge.bg} ${teamBadge.color} ${teamBadge.border}`}>
              {teamBadge.shortLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            {teamBadge.description}
          </p>

          {/* Turn Mode status bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-400 font-medium">
            <span>
              {isUncapped ? (
                <span className="text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                  <Flame className="h-3 w-3 text-amber-500" />
                  Uncapped Mode • Turn {turnCount}
                </span>
              ) : (
                <span>
                  Turn Limit: {turnCount} / {maxTurns}
                </span>
              )}
            </span>

            {isRunning && turnCount >= 6 && onAbortInfiniteBurn && (
              <button
                onClick={onAbortInfiniteBurn}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 hover:bg-rose-100 cursor-pointer transition-all"
                title="Mark this team as non-functional due to infinite token burn"
              >
                <Ban className="h-3 w-3" />
                <span>Flag Non-Functional / Abort</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Grid of Core Cost & Compute Telemetries */}
      <div className="grid grid-cols-2 gap-3">
        {/* Inference Cost ($ USD) Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span>Inference Cost</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {formatCurrency(metrics.totalCostUsd)}
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Cost / Turn:</span>
              <span className="font-mono">{formatCurrency(metrics.costPerTurnUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span>Burn Velocity:</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">${burnRatePerMin.toFixed(4)}/min</span>
            </div>
          </div>
        </div>

        {/* Time to Consensus / Wall-Clock Time Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Time to Consensus</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {wallClockSec}s
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Throughput:</span>
              <span className="font-mono">{tokensPerSec} tok/s</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Latency/Turn:</span>
              <span className="font-mono">
                {turnCount > 0 ? formatTime(Math.round(metrics.totalWallClockMs / turnCount)) : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Token Breakdown Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span>Total Compute Consumed</span>
          </div>
          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
            {formatNumber(metrics.totalTokens)} <span className="text-xs font-normal text-slate-700 dark:text-slate-400">tokens</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-700 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 font-mono">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
            <span className="text-[10px] uppercase block text-slate-700 dark:text-slate-400">Prompt In:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{formatNumber(metrics.totalInputTokens)} tok</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
            <span className="text-[10px] uppercase block text-slate-700 dark:text-slate-400">Reasoning Out:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{formatNumber(metrics.totalOutputTokens)} tok</span>
          </div>
        </div>
      </div>

      {/* 4. Multi-Agent Compute Distribution (Alpha vs Beta) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-3 flex items-center justify-between">
          <span>Agent Cost & Token Balance</span>
          <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
        </h4>

        {/* Agent A vs Agent B bar */}
        <div className="space-y-3 text-xs">
          {/* Agent Alpha */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold mb-1">
              <span className="text-indigo-600 dark:text-indigo-400">Agent Alpha</span>
              <span className="font-mono">
                {metrics.agentATokens} tok • {formatCurrency(metrics.agentACostUsd)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    metrics.totalTokens > 0
                      ? (metrics.agentATokens / metrics.totalTokens) * 100
                      : 50
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Agent Beta */}
          <div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold mb-1">
              <span className="text-emerald-600 dark:text-emerald-400">Agent Beta</span>
              <span className="font-mono">
                {metrics.agentBTokens} tok • {formatCurrency(metrics.agentBCostUsd)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    metrics.totalTokens > 0
                      ? (metrics.agentBTokens / metrics.totalTokens) * 100
                      : 50
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Verification & Ground Truth Status Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Target className="h-4 w-4 text-purple-500" />
            <span>Ground Truth Verifier</span>
          </div>

          {verification ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                verification.isCorrect
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {verification.isCorrect ? '100% Correct' : 'Failed Verification'}
            </span>
          ) : (
            <span className="text-[11px] text-slate-700 dark:text-slate-400">
              Awaiting final consensus
            </span>
          )}
        </div>

        {verification ? (
          <div className="mt-2 space-y-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <div className="text-slate-700 dark:text-slate-400 text-[10px] uppercase font-bold">
                Agreed Answer:
              </div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                {verification.evaluatedAnswer}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {verification.verificationNotes}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed">
            The domain verifier validates the joint solution deterministically against canonical logic proofs once consensus tags are received.
          </p>
        )}
      </div>
    </div>
  );
};

