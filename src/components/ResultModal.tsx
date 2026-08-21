import React from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  Cpu,
  BookmarkPlus,
  ArrowRight,
  RotateCcw,
  X,
  DollarSign,
  Flame,
  Activity,
} from 'lucide-react';
import { BenchmarkProblem, BenchmarkMetrics, VerificationResult, AgentConfig } from '../types/benchmark';
import { formatTime, formatNumber, formatCurrency, getTierBadge, getTeamFunctionalityBadge, getAgentMakeAndModel } from '../utils/formatters';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  problem: BenchmarkProblem;
  metrics: BenchmarkMetrics;
  verification: VerificationResult | null;
  agentA: AgentConfig;
  agentB: AgentConfig;
  onSaveToLeaderboard: () => void;
  onRunNextRandom: () => void;
  onRerunSame: () => void;
  isSaved: boolean;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  problem,
  metrics,
  verification,
  agentA,
  agentB,
  onSaveToLeaderboard,
  onRunNextRandom,
  onRerunSame,
  isSaved,
}) => {
  if (!isOpen) return null;

  const tier = getTierBadge(metrics.efficiencyIndex, metrics.isCorrect);
  const teamBadge = getTeamFunctionalityBadge(
    metrics.teamFunctionality,
    metrics.consensusReached,
    metrics.isCorrect
  );
  const wallClockSec = (metrics.totalWallClockMs / 1000).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with outcome status */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              metrics.isCorrect
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
            }`}
          >
            {metrics.isCorrect ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <XCircle className="h-7 w-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {metrics.isCorrect
                  ? 'Benchmark Challenge Solved!'
                  : 'Benchmark Evaluation Complete'}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${tier.bg} ${tier.color} ${tier.border}`}
              >
                {tier.label}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-400">
              [{problem.topic.toUpperCase()}] {problem.title} • {metrics.turnsCount} Dialogue Turns
            </p>
          </div>
        </div>

        {/* Team Functionality Verdict Banner */}
        <div className="mt-4 rounded-2xl border p-4 bg-slate-50 dark:bg-slate-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Team Collaboration Verdict
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${teamBadge.bg} ${teamBadge.color} ${teamBadge.border}`}>
              {teamBadge.label}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {teamBadge.description}
          </p>
        </div>

        {/* Efficiency Index & Cost Highlight */}
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-blue-50/80 p-4 border border-indigo-100 dark:from-indigo-950/30 dark:to-slate-900 dark:border-indigo-900/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                Consensus Efficiency Index
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-4xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {metrics.efficiencyIndex.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">
                  pts
                </span>
              </div>
            </div>

            <div className="text-right text-xs font-mono space-y-0.5 text-slate-700 dark:text-slate-300">
              <div>Accuracy: <strong className="text-emerald-600 dark:text-emerald-400">{metrics.accuracyScore}%</strong></div>
              <div>Consensus Cost: <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(metrics.totalCostUsd)}</strong></div>
              <div>Time: <strong>{wallClockSec}s</strong> ({formatNumber(metrics.totalTokens)} tok)</div>
            </div>
          </div>

          <div className="mt-3 text-[11px] font-mono text-slate-600 dark:text-slate-400 border-t border-indigo-200/50 pt-2 dark:border-indigo-900/40">
            Efficiency Index = [ Accuracy Score ÷ (Time to Consensus × Total Tokens) ] × 10,000
          </div>
        </div>

        {/* Verification Summary */}
        <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-400">Negotiated Consensus:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {verification?.evaluatedAnswer || 'No final answer reached'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-400">Canonical Ground Truth:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
              {problem.canonicalAnswer}
            </span>
          </div>

          {problem.explanation && (
            <div className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300">Proof / Logic: </strong>
              {problem.explanation}
            </div>
          )}
        </div>

        {/* Multi-Agent Breakdown Table */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-indigo-100 bg-white p-3 dark:border-indigo-900/50 dark:bg-slate-800/80">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              {getAgentMakeAndModel(agentA).fullDisplayName}
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
              <div>Tokens: {formatNumber(metrics.agentATokens)} tok</div>
              <div>Cost: {formatCurrency(metrics.agentACostUsd)}</div>
              <div>Latency: {formatTime(metrics.agentALatencyMs)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white p-3 dark:border-emerald-900/50 dark:bg-slate-800/80">
            <div className="font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {getAgentMakeAndModel(agentB).fullDisplayName}
            </div>
            <div className="space-y-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
              <div>Tokens: {formatNumber(metrics.agentBTokens)} tok</div>
              <div>Cost: {formatCurrency(metrics.agentBCostUsd)}</div>
              <div>Latency: {formatTime(metrics.agentBLatencyMs)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            onClick={onSaveToLeaderboard}
            disabled={isSaved}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <BookmarkPlus className="h-4 w-4" />
            <span>{isSaved ? 'Saved to Leaderboard ✓' : 'Save to Leaderboard'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onRerunSame}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Re-run Challenge</span>
            </button>

            <button
              onClick={onRunNextRandom}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <span>Next Random 1 of 3</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

