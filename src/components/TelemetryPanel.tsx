import React from 'react';
import {
  Zap,
  Clock,
  Cpu,
  Target,
  DollarSign,
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

  const wallClockSec = (metrics?.totalWallClockMs ?? 0) > 0 ? ((metrics?.totalWallClockMs ?? 0) / 1000).toFixed(2) : '0.00';
  const tokensPerSec = (metrics?.tokensPerSec ?? 0).toFixed(1);

  // Compute burn velocity ($/min)
  const wallClockMinutes = (metrics?.totalWallClockMs ?? 0) > 0 ? (metrics.totalWallClockMs / 60000) : 0.001;
  const burnRatePerMin = (metrics?.totalCostUsd ?? 0) > 0 ? (metrics.totalCostUsd / wallClockMinutes) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Main Telemetry HUD Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Header with Efficiency Index & Tier */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Zap className="h-3.5 w-3.5 fill-current" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Efficiency Index
              </h3>
              <p className="text-[10px] text-slate-700 dark:text-slate-400">
                Accuracy ÷ (Time × Compute Tokens)
              </p>
            </div>
          </div>

          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${tier.bg} ${tier.color} ${tier.border}`}>
            {tier.label}
          </span>
        </div>

        {/* Big Score Row */}
        <div className="mt-3 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              {metrics.efficiencyIndex > 0 ? metrics.efficiencyIndex.toFixed(1) : '--'}
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-400">pts</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-700 dark:text-slate-400">Accuracy:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.accuracyScore}%
            </span>
          </div>
        </div>

        {/* Core Stats Grid */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-400 block">Total Cost</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {formatCurrency(metrics.totalCostUsd)}
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-400 block">Time</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {wallClockSec}s
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-400 block">Compute</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {formatNumber(metrics.totalTokens)} <span className="text-[10px] font-normal text-slate-700 dark:text-slate-400">tok</span>
            </span>
          </div>

          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
            <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-400 block">Speed</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
              {tokensPerSec} <span className="text-[10px] font-normal text-slate-700 dark:text-slate-400">t/s</span>
            </span>
          </div>
        </div>

        {/* Team Collaboration Status & Turn Pill */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50 text-xs">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">Team Dynamics:</span>
            <span className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold border ${teamBadge.bg} ${teamBadge.color} ${teamBadge.border}`}>
              {teamBadge.shortLabel}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-400 font-semibold">
            {isUncapped ? `Turn ${turnCount}` : `${turnCount}/${maxTurns} Turns`}
          </div>
        </div>

        {/* Abort infinite loop button if in runaway loop */}
        {isRunning && turnCount >= 6 && onAbortInfiniteBurn && (
          <button
            onClick={onAbortInfiniteBurn}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer transition-colors"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>Flag Infinite Loop & Abort</span>
          </button>
        )}
      </div>

      {/* 2. Token & Cost Distribution Between Agents */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-2.5">
          Agent Compute Share
        </h4>

        <div className="space-y-2.5 text-xs">
          {/* Agent Alpha */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-indigo-600 dark:text-indigo-400">Agent Alpha (01)</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
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
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-emerald-600 dark:text-emerald-400">Agent Beta (02)</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
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

      {/* 3. Verifier Result Pill (compact) */}
      {verification && (
        <div
          className={`rounded-2xl border p-3.5 text-xs ${
            verification.isCorrect
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              <span>{verification.isCorrect ? 'Ground Truth Verified' : 'Consensus Failed Verification'}</span>
            </span>
            <span className="font-mono">{verification.accuracyScore}%</span>
          </div>
          <div className="mt-1 text-[11px] font-mono opacity-90">
            Canonical: [{verification.canonicalAnswer}] • Result: [{verification.evaluatedAnswer}]
          </div>
        </div>
      )}
    </div>
  );
};
