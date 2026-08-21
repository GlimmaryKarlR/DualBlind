import React, { useState } from 'react';
import {
  Trophy,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Zap,
  DollarSign,
  TrendingUp,
  Bot,
  Brain,
  Crosshair,
  Shapes,
  X,
  Flame,
  Activity,
} from 'lucide-react';
import { BenchmarkRunRecord, TopicCategory } from '../types/benchmark';
import { formatTime, formatNumber, formatCurrency, getTierBadge, getTeamFunctionalityBadge, getAgentMakeAndModel } from '../utils/formatters';

interface LeaderboardViewProps {
  runs: BenchmarkRunRecord[];
  onSelectRunToInspect: (run: BenchmarkRunRecord) => void;
  onLaunchChallenge: (problemId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  runs,
  onSelectRunToInspect,
  onLaunchChallenge,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'efficiency' | 'cost' | 'tokens' | 'latency' | 'accuracy' | 'date'>('efficiency');
  const [inspectModalRun, setInspectModalRun] = useState<BenchmarkRunRecord | null>(null);

  const filteredRuns = runs.filter(
    (r) => selectedTopic === 'all' || r.topic === selectedTopic
  );

  const sortedRuns = [...filteredRuns].sort((a, b) => {
    switch (sortBy) {
      case 'efficiency':
        return (b.metrics.efficiencyIndex || 0) - (a.metrics.efficiencyIndex || 0);
      case 'cost':
        return (a.metrics.totalCostUsd || 0) - (b.metrics.totalCostUsd || 0);
      case 'tokens':
        return a.metrics.totalTokens - b.metrics.totalTokens;
      case 'latency':
        return a.metrics.totalWallClockMs - b.metrics.totalWallClockMs;
      case 'accuracy':
        return b.metrics.accuracyScore - a.metrics.accuracyScore;
      case 'date':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  // Calculate high-level aggregates
  const totalRuns = runs.length;
  const avgEfficiency = totalRuns > 0
    ? (runs.reduce((acc, r) => acc + (r.metrics.efficiencyIndex || 0), 0) / totalRuns).toFixed(1)
    : '0';
  const solvedCount = runs.filter((r) => r.metrics.isCorrect).length;
  const accuracyRate = totalRuns > 0 ? Math.round((solvedCount / totalRuns) * 100) : 0;
  const totalInferenceCost = runs.reduce((acc, r) => acc + (r.metrics.totalCostUsd || 0), 0);
  const avgLatencySec = totalRuns > 0
    ? (runs.reduce((acc, r) => acc + r.metrics.totalWallClockMs, 0) / totalRuns / 1000).toFixed(1)
    : '0';

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dualblind-benchmark-export-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Aggregate Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Total Evaluated Runs</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalRuns}
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400">
            Across 3 Benchmark Topics
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
            <Zap className="h-4 w-4 text-indigo-500" />
            <span>Avg Efficiency Index</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {avgEfficiency} <span className="text-xs font-normal text-slate-700 dark:text-slate-400">pts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400">
            Accuracy ÷ (Time × Tokens)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Ground Truth Pass Rate</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {accuracyRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400">
            {solvedCount} of {totalRuns} passed ground truth
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span>Total Inference Cost</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {formatCurrency(totalInferenceCost)}
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 font-mono">
            Avg Wall-Clock: {avgLatencySec}s
          </div>
        </div>
      </div>

      {/* Control Bar: Topic Filters, Sorters, and Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Topic Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Topic:
          </span>
          <button
            onClick={() => setSelectedTopic('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedTopic === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All ({runs.length})
          </button>
          <button
            onClick={() => setSelectedTopic('logic')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedTopic === 'logic'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300'
            }`}
          >
            Logic ({runs.filter((r) => r.topic === 'logic').length})
          </button>
          <button
            onClick={() => setSelectedTopic('strategy')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedTopic === 'strategy'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            Strategy ({runs.filter((r) => r.topic === 'strategy').length})
          </button>
          <button
            onClick={() => setSelectedTopic('abstract')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedTopic === 'abstract'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            Abstract ({runs.filter((r) => r.topic === 'abstract').length})
          </button>
        </div>

        {/* Sorters and Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-700 dark:text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="efficiency">Highest Efficiency Index</option>
              <option value="cost">Lowest Inference Cost ($)</option>
              <option value="accuracy">Highest Accuracy</option>
              <option value="tokens">Fewest Tokens Consumed</option>
              <option value="latency">Fastest Wall-Clock Time</option>
              <option value="date">Most Recent First</option>
            </select>
          </div>

          <button
            onClick={exportJSON}
            disabled={runs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Runs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {sortedRuns.length === 0 ? (
          <div className="p-12 text-center text-slate-700 dark:text-slate-400">
            <Trophy className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Benchmark Runs Recorded Yet
            </p>
            <p className="mt-1 text-xs">
              Go to the Benchmark Arena, run a problem, and save the result to see rankings here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-700 uppercase font-semibold text-[11px] dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Rank / Problem</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Team Verdict</th>
                  <th className="px-4 py-3 text-center">Consensus & Accuracy</th>
                  <th className="px-4 py-3 text-right">Cost ($)</th>
                  <th className="px-4 py-3 text-right">Time & Tokens</th>
                  <th className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                    Efficiency Index
                  </th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedRuns.map((run, idx) => {
                  const tier = getTierBadge(run.metrics.efficiencyIndex, run.metrics.isCorrect);
                  const teamBadge = getTeamFunctionalityBadge(
                    run.metrics.teamFunctionality,
                    run.metrics.consensusReached,
                    run.metrics.isCorrect
                  );
                  const wallClockSec = (run.metrics.totalWallClockMs / 1000).toFixed(2);
                  const aInfo = getAgentMakeAndModel(run.agentAConfig);
                  const bInfo = getAgentMakeAndModel(run.agentBConfig);

                  return (
                    <tr
                      key={run.id}
                      className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                    >
                      {/* Rank & Title */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold font-mono ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                : idx === 2
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {run.problemTitle}
                            </div>
                            <div className="text-[10px] text-slate-700 dark:text-slate-400 font-mono">
                              {new Date(run.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {run.turns.length} turns
                              {run.isUncapped && <span className="ml-1 text-amber-600 dark:text-amber-400">• Uncapped</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Topic Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            run.topic === 'logic'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                              : run.topic === 'strategy'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {run.topic.toUpperCase()}
                        </span>
                      </td>

                      {/* Team Functionality Verdict & Make/Model */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${teamBadge.bg} ${teamBadge.color} ${teamBadge.border}`}>
                            {teamBadge.shortLabel}
                          </span>
                          <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 leading-tight">
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{aInfo.fullDisplayName}</span>
                            <span className="text-slate-400 dark:text-slate-500 mx-1">&</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{bInfo.fullDisplayName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Consensus & Accuracy */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              run.metrics.isCorrect
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {run.metrics.isCorrect ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {run.metrics.accuracyScore}% Acc
                          </span>
                          <span className="text-[10px] text-slate-700 dark:text-slate-400">
                            {run.consensusStatus === 'consensus_reached' ? 'Unanimous' : 'No Consensus'}
                          </span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(run.metrics.totalCostUsd)}
                      </td>

                      {/* Time & Tokens */}
                      <td className="px-4 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        <div>{wallClockSec}s</div>
                        <div className="text-[10px] text-slate-700 dark:text-slate-400">{formatNumber(run.metrics.totalTokens)} tok</div>
                      </td>

                      {/* Efficiency Index */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {run.metrics.efficiencyIndex.toFixed(1)}
                        </div>
                        <span className={`text-[10px] font-bold ${tier.color}`}>
                          {tier.label.split(' ')[0]}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setInspectModalRun(run)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                          title="Inspect conversation transcript and telemetry"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transcript Inspection Dialog */}
      {inspectModalRun && (() => {
        const modalAInfo = getAgentMakeAndModel(inspectModalRun.agentAConfig);
        const modalBInfo = getAgentMakeAndModel(inspectModalRun.agentBConfig);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Transcript Inspector: {inspectModalRun.problemTitle}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-400">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{modalAInfo.fullDisplayName}</span>
                    <span className="mx-1">vs</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{modalBInfo.fullDisplayName}</span>
                    <span className="mx-1.5">•</span>
                    <span>{inspectModalRun.metrics.turnsCount} Turns</span>
                    <span className="mx-1.5">•</span>
                    <span>Cost: {formatCurrency(inspectModalRun.metrics.totalCostUsd)}</span>
                    <span className="mx-1.5">•</span>
                    <span>Efficiency: {inspectModalRun.metrics.efficiencyIndex.toFixed(1)} pts</span>
                  </p>
                </div>

                <button
                  onClick={() => setInspectModalRun(null)}
                  className="rounded-full p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Dialogue Content */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                {inspectModalRun.turns.map((turn, i) => (
                  <div
                    key={turn.id || i}
                    className={`p-3.5 rounded-xl text-xs ${
                      turn.agentId === 'agent_a'
                        ? 'bg-slate-50 border border-indigo-100 dark:bg-slate-800/70 dark:border-indigo-900/40'
                        : 'bg-emerald-50/70 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1.5">
                      <span className={turn.agentId === 'agent_a' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {turn.agentName} (Turn {turn.agentTurnNumber})
                      </span>
                      <span className="font-mono text-[10px] text-slate-700 dark:text-slate-400">
                        {formatTime(turn.latencyMs)} • {turn.totalTokens} tokens • {formatCurrency(turn.costUsd || 0)}
                      </span>
                    </div>
                    <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {turn.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-700 dark:text-slate-400">Agreed Answer: </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {inspectModalRun.finalAgreedAnswer || 'None'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    onLaunchChallenge(inspectModalRun.problemId);
                    setInspectModalRun(null);
                  }}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 cursor-pointer"
                >
                  Replay in Arena
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
