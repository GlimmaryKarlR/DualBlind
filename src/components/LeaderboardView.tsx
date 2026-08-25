import React, { useState, useMemo } from 'react';
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
  Globe,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { BenchmarkRunRecord, DifficultyLevel, TopicCategory } from '../types/benchmark';
import { formatTime, formatNumber, formatCurrency, getTierBadge, getTeamFunctionalityBadge, getAgentMakeAndModel } from '../utils/formatters';
import {
  CHALLENGE_TYPES,
  ChallengeTypeId,
  getChallengeTypeForRun,
  matchesChallengeType,
} from '../utils/challengeTypes';

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
  // Primary Challenge Type Filter
  const [selectedChallengeType, setSelectedChallengeType] = useState<ChallengeTypeId>('all');

  // Column-Specific Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');
  const [accuracyFilter, setAccuracyFilter] = useState<string>('all');
  const [costFilter, setCostFilter] = useState<string>('all');
  const [turnsFilter, setTurnsFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [executionModeFilter, setExecutionModeFilter] = useState<string>('all');

  // Sorting
  const [sortBy, setSortBy] = useState<'efficiency' | 'cost' | 'tokens' | 'latency' | 'accuracy' | 'date' | 'turns'>('efficiency');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // UI States
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true);
  const [inspectModalRun, setInspectModalRun] = useState<BenchmarkRunRecord | null>(null);

  // Extract dynamic distinct providers
  const distinctProviders = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => {
      if (r.agentAConfig.provider) set.add(r.agentAConfig.provider);
      if (r.agentBConfig.provider) set.add(r.agentBConfig.provider);
      if (r.agentAConfig.brand) set.add(r.agentAConfig.brand.toLowerCase());
      if (r.agentBConfig.brand) set.add(r.agentBConfig.brand.toLowerCase());
    });
    return Array.from(set).sort();
  }, [runs]);

  // Check how many column filters are actively applied
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedChallengeType !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (difficultyFilter !== 'all') count++;
    if (providerFilter !== 'all') count++;
    if (verdictFilter !== 'all') count++;
    if (accuracyFilter !== 'all') count++;
    if (costFilter !== 'all') count++;
    if (turnsFilter !== 'all') count++;
    if (tierFilter !== 'all') count++;
    if (executionModeFilter !== 'all') count++;
    return count;
  }, [
    selectedChallengeType,
    searchQuery,
    difficultyFilter,
    providerFilter,
    verdictFilter,
    accuracyFilter,
    costFilter,
    turnsFilter,
    tierFilter,
    executionModeFilter,
  ]);

  const resetAllFilters = () => {
    setSelectedChallengeType('all');
    setSearchQuery('');
    setDifficultyFilter('all');
    setProviderFilter('all');
    setVerdictFilter('all');
    setAccuracyFilter('all');
    setCostFilter('all');
    setTurnsFilter('all');
    setTierFilter('all');
    setExecutionModeFilter('all');
  };

  // Filter Pipeline
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // 1. Challenge Type Filter
      if (!matchesChallengeType(run, selectedChallengeType)) {
        return false;
      }

      // 2. Search Query (Problem Title, ID, Question keywords, Answer)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = run.problemTitle.toLowerCase().includes(q);
        const matchesId = run.problemId.toLowerCase().includes(q);
        const matchesAns = (run.finalAgreedAnswer || '').toLowerCase().includes(q);
        const matchesAgentA = run.agentAConfig.name.toLowerCase().includes(q) || run.agentAConfig.model.toLowerCase().includes(q);
        const matchesAgentB = run.agentBConfig.name.toLowerCase().includes(q) || run.agentBConfig.model.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesAns && !matchesAgentA && !matchesAgentB) {
          return false;
        }
      }

      // 3. Difficulty Filter
      if (difficultyFilter !== 'all' && run.difficulty !== difficultyFilter) {
        return false;
      }

      // 4. Provider / Model Family Filter
      if (providerFilter !== 'all') {
        const p = providerFilter.toLowerCase();
        const hasA = (run.agentAConfig.provider || '').toLowerCase() === p || (run.agentAConfig.brand || '').toLowerCase().includes(p);
        const hasB = (run.agentBConfig.provider || '').toLowerCase() === p || (run.agentBConfig.brand || '').toLowerCase().includes(p);
        if (!hasA && !hasB) return false;
      }

      // 5. Team Verdict & Functionality Filter
      if (verdictFilter !== 'all') {
        if (verdictFilter === 'optimal' && !run.metrics.teamFunctionality.includes('Optimal') && run.metrics.teamFunctionality !== 'optimal') return false;
        if (verdictFilter === 'deliberating' && !run.metrics.teamFunctionality.includes('Deliberating') && run.metrics.teamFunctionality !== 'deliberating') return false;
        if (verdictFilter === 'high_burn' && !run.metrics.teamFunctionality.includes('Burn') && !run.metrics.teamFunctionality.includes('High')) return false;
        if (verdictFilter === 'non_functional' && !run.metrics.teamFunctionality.includes('Non-Functional') && !run.metrics.teamFunctionality.includes('Loop') && !run.metrics.teamFunctionality.includes('Wrong')) return false;
      }

      // 6. Accuracy & Correctness Filter
      if (accuracyFilter !== 'all') {
        if (accuracyFilter === 'correct' && !run.metrics.isCorrect) return false;
        if (accuracyFilter === 'incorrect' && run.metrics.isCorrect) return false;
        if (accuracyFilter === 'consensus' && run.consensusStatus !== 'consensus_reached') return false;
        if (accuracyFilter === 'no_consensus' && run.consensusStatus === 'consensus_reached') return false;
      }

      // 7. Cost Filter
      if (costFilter !== 'all') {
        const cost = run.metrics.totalCostUsd || 0;
        if (costFilter === 'ultra_low' && cost >= 0.002) return false;
        if (costFilter === 'medium' && (cost < 0.002 || cost > 0.01)) return false;
        if (costFilter === 'high' && cost <= 0.01) return false;
      }

      // 8. Turns Filter
      if (turnsFilter !== 'all') {
        const count = run.metrics.turnsCount;
        if (turnsFilter === 'fast' && count > 2) return false;
        if (turnsFilter === 'moderate' && (count < 3 || count > 5)) return false;
        if (turnsFilter === 'long' && count < 6) return false;
      }

      // 9. Efficiency Tier Filter
      if (tierFilter !== 'all') {
        const eff = run.metrics.efficiencyIndex || 0;
        if (tierFilter === 'tier_s' && eff < 15) return false;
        if (tierFilter === 'tier_a' && (eff < 5 || eff >= 15)) return false;
        if (tierFilter === 'tier_b' && (eff < 1 || eff >= 5)) return false;
        if (tierFilter === 'tier_f' && eff >= 1) return false;
      }

      // 10. Execution Mode Filter
      if (executionModeFilter !== 'all') {
        if (executionModeFilter === 'uncapped' && !run.isUncapped) return false;
        if (executionModeFilter === 'capped' && run.isUncapped) return false;
      }

      return true;
    });
  }, [
    runs,
    selectedChallengeType,
    searchQuery,
    difficultyFilter,
    providerFilter,
    verdictFilter,
    accuracyFilter,
    costFilter,
    turnsFilter,
    tierFilter,
    executionModeFilter,
  ]);

  // Sort Pipeline
  const sortedRuns = useMemo(() => {
    return [...filteredRuns].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'efficiency':
          comparison = (b.metrics.efficiencyIndex || 0) - (a.metrics.efficiencyIndex || 0);
          break;
        case 'cost':
          comparison = (a.metrics.totalCostUsd || 0) - (b.metrics.totalCostUsd || 0);
          break;
        case 'tokens':
          comparison = a.metrics.totalTokens - b.metrics.totalTokens;
          break;
        case 'latency':
          comparison = a.metrics.totalWallClockMs - b.metrics.totalWallClockMs;
          break;
        case 'accuracy':
          comparison = b.metrics.accuracyScore - a.metrics.accuracyScore;
          break;
        case 'turns':
          comparison = a.metrics.turnsCount - b.metrics.turnsCount;
          break;
        case 'date':
        default:
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
      }
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [filteredRuns, sortBy, sortOrder]);

  const handleSortToggle = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Live Aggregates on the Filtered Dataset
  const totalFilteredRuns = filteredRuns.length;
  const avgEfficiency = totalFilteredRuns > 0
    ? (filteredRuns.reduce((acc, r) => acc + (r.metrics.efficiencyIndex || 0), 0) / totalFilteredRuns).toFixed(1)
    : '0';
  const solvedCount = filteredRuns.filter((r) => r.metrics.isCorrect).length;
  const accuracyRate = totalFilteredRuns > 0 ? Math.round((solvedCount / totalFilteredRuns) * 100) : 0;
  const totalInferenceCost = filteredRuns.reduce((acc, r) => acc + (r.metrics.totalCostUsd || 0), 0);
  const avgLatencySec = totalFilteredRuns > 0
    ? (filteredRuns.reduce((acc, r) => acc + r.metrics.totalWallClockMs, 0) / totalFilteredRuns / 1000).toFixed(1)
    : '0';

  // Export handlers
  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sortedRuns, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dualblind-filtered-runs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    const headers = [
      'ID',
      'Problem Title',
      'Challenge Suite',
      'Topic',
      'Difficulty',
      'Agent A',
      'Agent B',
      'Consensus Status',
      'Ground Truth Passed',
      'Accuracy Score',
      'Total Tokens',
      'Total Cost USD',
      'Wall Clock Seconds',
      'Turns Count',
      'Efficiency Index',
      'Final Agreed Answer',
      'Date',
    ];

    const rows = sortedRuns.map((r) => {
      const suiteDef = getChallengeTypeForRun(r);
      const aInfo = getAgentMakeAndModel(r.agentAConfig);
      const bInfo = getAgentMakeAndModel(r.agentBConfig);
      return [
        r.id,
        `"${r.problemTitle.replace(/"/g, '""')}"`,
        `"${suiteDef.shortLabel}"`,
        r.topic,
        r.difficulty,
        `"${aInfo.fullDisplayName}"`,
        `"${bInfo.fullDisplayName}"`,
        r.consensusStatus,
        r.metrics.isCorrect ? 'TRUE' : 'FALSE',
        r.metrics.accuracyScore,
        r.metrics.totalTokens,
        r.metrics.totalCostUsd.toFixed(6),
        (r.metrics.totalWallClockMs / 1000).toFixed(2),
        r.metrics.turnsCount,
        r.metrics.efficiencyIndex.toFixed(2),
        `"${(r.finalAgreedAnswer || '').replace(/"/g, '""')}"`,
        r.date,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `dualblind-benchmarks-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Real-Time Firestore Sync Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-900 shadow-xs dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <span className="font-semibold flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Universal Cloud Leaderboard
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden md:inline">|</span>
          <span className="text-slate-600 dark:text-slate-400 hidden md:inline">
            Multi-column filtering across all 11 frontier AI challenge suites
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
          <span>{runs.length} total synced runs</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Firestore Real-Time</span>
        </div>
      </div>

      {/* Primary Challenge Type Categorization Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Benchmark Challenge Types
            </h3>
          </div>
          <span className="text-[11px] text-slate-700 dark:text-slate-400 font-medium">
            Select a suite to isolate its evaluation metrics
          </span>
        </div>

        {/* Scrollable / Responsive Challenge Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CHALLENGE_TYPES.map((suite) => {
            const isSelected = selectedChallengeType === suite.id;
            const countForSuite = suite.id === 'all'
              ? runs.length
              : runs.filter((r) => matchesChallengeType(r, suite.id)).length;

            return (
              <button
                key={suite.id}
                onClick={() => setSelectedChallengeType(suite.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? `${suite.colorScheme.pillActive} border-transparent shadow-xs`
                    : `${suite.colorScheme.pillBg} border-transparent hover:border-slate-300 dark:hover:border-slate-700`
                }`}
                title={suite.description}
              >
                <span>{suite.badgeEmoji}</span>
                <span>{suite.shortLabel}</span>
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isSelected
                      ? 'bg-black/20 text-white dark:bg-black/40'
                      : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {countForSuite}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Filtered Aggregate Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>Matching Runs</span>
            </span>
            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-400">
              {totalFilteredRuns} of {runs.length}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalFilteredRuns}
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 truncate">
            {selectedChallengeType === 'all'
              ? 'All 11 Challenge Suites'
              : CHALLENGE_TYPES.find((c) => c.id === selectedChallengeType)?.label}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-indigo-500" />
              <span>Avg Efficiency</span>
            </span>
            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
              {avgEfficiency} pts
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {avgEfficiency}
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400">
            Acc ÷ (Time × Cost)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Ground Truth Pass</span>
            </span>
            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              {accuracyRate}%
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {accuracyRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400">
            {solvedCount} of {totalFilteredRuns} verified correct
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span>Total Inference Cost</span>
            </span>
            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-400">
              Avg: {avgLatencySec}s
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {formatCurrency(totalInferenceCost)}
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 font-mono">
            Across {totalFilteredRuns} evaluated runs
          </div>
        </div>
      </div>

      {/* Multi-Column Filters Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Top Header Row: Search + Quick Toggles + Export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 dark:text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problem title, ID, model, or final answer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Filter Panel */}
            <button
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                isFilterPanelOpen || activeFiltersCount > 0
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Column Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterPanelOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-700 dark:text-slate-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none dark:text-slate-300 cursor-pointer"
              >
                <option value="efficiency">Efficiency Index</option>
                <option value="accuracy">Accuracy Score</option>
                <option value="cost">Inference Cost ($)</option>
                <option value="tokens">Tokens Consumed</option>
                <option value="latency">Wall-Clock Time</option>
                <option value="turns">Fewest Turns</option>
                <option value="date">Most Recent Date</option>
              </select>
              <button
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-1"
                title={`Currently sorted ${sortOrder === 'desc' ? 'Highest First' : 'Lowest First'}`}
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={exportCSV}
                disabled={sortedRuns.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                title="Export filtered runs as CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                onClick={exportJSON}
                disabled={sortedRuns.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                title="Export filtered runs as JSON"
              >
                <Download className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Column Filter Grid */}
        {isFilterPanelOpen && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/40 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-indigo-500" />
                Individual Column Filters
              </span>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear All Filters ({activeFiltersCount})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* Column Filter 1: Challenge Suite */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Challenge Suite
                </label>
                <select
                  value={selectedChallengeType}
                  onChange={(e: any) => setSelectedChallengeType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  {CHALLENGE_TYPES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.badgeEmoji} {c.shortLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Column Filter 2: Difficulty */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">🟢 Easy</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Hard">🟠 Hard</option>
                  <option value="Extreme">🔴 Extreme</option>
                </select>
              </div>

              {/* Column Filter 3: AI Provider / Make */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  AI Model / Provider
                </label>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All AI Providers</option>
                  {distinctProviders.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov.charAt(0).toUpperCase() + prov.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Column Filter 4: Ground Truth / Consensus */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Correctness & Consensus
                </label>
                <select
                  value={accuracyFilter}
                  onChange={(e) => setAccuracyFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Outcomes</option>
                  <option value="correct">✅ Passed Ground Truth (100%)</option>
                  <option value="incorrect">❌ Failed Ground Truth (0%)</option>
                  <option value="consensus">🤝 Consensus Reached</option>
                  <option value="no_consensus">⚔️ No Consensus / Conflict</option>
                </select>
              </div>

              {/* Column Filter 5: Team Verdict */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Team Functionality
                </label>
                <select
                  value={verdictFilter}
                  onChange={(e) => setVerdictFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Verdicts</option>
                  <option value="optimal">⚡ Optimal (&lt;5 Turns)</option>
                  <option value="deliberating">⚖️ Deliberating (5-8 Turns)</option>
                  <option value="high_burn">🔥 High Burn (&gt;8 Turns)</option>
                  <option value="non_functional">🚫 Non-Functional / Stall</option>
                </select>
              </div>

              {/* Column Filter 6: Inference Cost */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Inference Cost ($)
                </label>
                <select
                  value={costFilter}
                  onChange={(e) => setCostFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Cost Ranges</option>
                  <option value="ultra_low">🟢 &lt; $0.002 (Ultra-Low)</option>
                  <option value="medium">🟡 $0.002 - $0.010 (Standard)</option>
                  <option value="high">🔴 &gt; $0.010 (High Compute)</option>
                </select>
              </div>
            </div>

            {/* Secondary Filter Row: Efficiency Tier, Turns, Execution Mode */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              {/* Filter 7: Efficiency Tier */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Efficiency Tier
                </label>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Efficiency Tiers</option>
                  <option value="tier_s">💎 S-Tier (≥ 15 pts)</option>
                  <option value="tier_a">🥇 A-Tier (5 - 15 pts)</option>
                  <option value="tier_b">🥈 B-Tier (1 - 5 pts)</option>
                  <option value="tier_f">❌ F-Tier (&lt; 1 pt)</option>
                </select>
              </div>

              {/* Filter 8: Turn Count */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Dialogue Turns
                </label>
                <select
                  value={turnsFilter}
                  onChange={(e) => setTurnsFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Turn Counts</option>
                  <option value="fast">⚡ Fast (1-2 Turns)</option>
                  <option value="moderate">💬 Moderate (3-5 Turns)</option>
                  <option value="long">⏳ Deep Deliberation (6+ Turns)</option>
                </select>
              </div>

              {/* Filter 9: Execution Mode */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Execution Mode
                </label>
                <select
                  value={executionModeFilter}
                  onChange={(e) => setExecutionModeFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Execution Modes</option>
                  <option value="uncapped">🔓 Uncapped (Real Cost to Consensus)</option>
                  <option value="capped">🔒 Capped Mode (Turn Limit)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Pill Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-700 dark:text-slate-400 font-medium mr-1">
              Active Filters:
            </span>
            {selectedChallengeType !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900">
                Suite: {CHALLENGE_TYPES.find((c) => c.id === selectedChallengeType)?.shortLabel}
                <button onClick={() => setSelectedChallengeType('all')} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Query: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {difficultyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                Difficulty: {difficultyFilter}
                <button onClick={() => setDifficultyFilter('all')} className="hover:text-amber-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {providerFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900">
                Provider: {providerFilter}
                <button onClick={() => setProviderFilter('all')} className="hover:text-purple-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {accuracyFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                Outcome: {accuracyFilter}
                <button onClick={() => setAccuracyFilter('all')} className="hover:text-emerald-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {verdictFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                Verdict: {verdictFilter}
                <button onClick={() => setVerdictFilter('all')} className="hover:text-blue-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {costFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Cost: {costFilter}
                <button onClick={() => setCostFilter('all')} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {tierFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900">
                Tier: {tierFilter}
                <button onClick={() => setTierFilter('all')} className="hover:text-indigo-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {turnsFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Turns: {turnsFilter}
                <button onClick={() => setTurnsFilter('all')} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {executionModeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                Mode: {executionModeFilter}
                <button onClick={() => setExecutionModeFilter('all')} className="hover:text-slate-900 cursor-pointer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard Table with Interactive Column Headers */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {sortedRuns.length === 0 ? (
          <div className="p-12 text-center text-slate-700 dark:text-slate-400">
            <Trophy className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Benchmark Runs Match Current Filters
            </p>
            <p className="mt-1 text-xs">
              Try adjusting or clearing your column filters to display matching runs.
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-slate-700 uppercase font-semibold text-[11px] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 select-none">
                <tr>
                  {/* Rank / Problem Column */}
                  <th className="px-4 py-3.5">
                    <button
                      onClick={() => handleSortToggle('date')}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer font-bold"
                    >
                      <span>Rank & Problem</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </button>
                  </th>

                  {/* Challenge Suite & Category Column */}
                  <th className="px-4 py-3.5">
                    <div className="flex items-center gap-1 font-bold">
                      <span>Challenge Type</span>
                      {selectedChallengeType !== 'all' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      )}
                    </div>
                  </th>

                  {/* AI Team & Make/Model Column */}
                  <th className="px-4 py-3.5">
                    <div className="flex items-center gap-1 font-bold">
                      <span>AI Model Matchup</span>
                      {providerFilter !== 'all' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      )}
                    </div>
                  </th>

                  {/* Team Verdict Column */}
                  <th className="px-4 py-3.5">
                    <div className="flex items-center gap-1 font-bold">
                      <span>Team Verdict</span>
                      {verdictFilter !== 'all' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      )}
                    </div>
                  </th>

                  {/* Consensus & Accuracy Column */}
                  <th className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => handleSortToggle('accuracy')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer font-bold mx-auto"
                    >
                      <span>Accuracy</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      {accuracyFilter !== 'all' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      )}
                    </button>
                  </th>

                  {/* Cost Column */}
                  <th className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleSortToggle('cost')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer font-bold ml-auto"
                    >
                      <span>Cost ($)</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      {costFilter !== 'all' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      )}
                    </button>
                  </th>

                  {/* Time & Tokens Column */}
                  <th className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleSortToggle('tokens')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer font-bold ml-auto"
                    >
                      <span>Turns & Compute</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      {turnsFilter !== 'all' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      )}
                    </button>
                  </th>

                  {/* Efficiency Index Column */}
                  <th className="px-4 py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                    <button
                      onClick={() => handleSortToggle('efficiency')}
                      className="inline-flex items-center gap-1 hover:text-indigo-800 dark:hover:text-indigo-200 cursor-pointer font-bold ml-auto"
                    >
                      <span>Efficiency Index</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      {tierFilter !== 'all' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      )}
                    </button>
                  </th>

                  {/* Actions Column */}
                  <th className="px-4 py-3.5 text-center">Inspect</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedRuns.map((run, idx) => {
                  const challenge = getChallengeTypeForRun(run);
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
                      {/* Rank & Problem Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
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
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {run.problemTitle}
                            </div>
                            <div className="text-[10px] text-slate-700 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`rounded px-1 py-0.2 text-[9px] font-bold uppercase ${
                                  run.difficulty === 'Easy'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : run.difficulty === 'Medium'
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                    : run.difficulty === 'Hard'
                                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                }`}
                              >
                                {run.difficulty}
                              </span>
                              <span>•</span>
                              <span>{new Date(run.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              <span>•</span>
                              <span>{run.metrics.turnsCount} turns</span>
                              {run.isUncapped && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Uncapped</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Challenge Type Badge */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${challenge.colorScheme.bg} ${challenge.colorScheme.text} ${challenge.colorScheme.border}`}
                          >
                            <span>{challenge.badgeEmoji}</span>
                            <span>{challenge.shortLabel}</span>
                          </span>
                          {run.domain && (
                            <div className="text-[10px] text-slate-700 dark:text-slate-400 truncate max-w-[140px]" title={run.domain}>
                              {run.domain}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* AI Models Matchup */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 min-w-[150px]">
                          <div className="text-[11px] font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-[160px]" title={aInfo.fullDisplayName}>
                              {aInfo.fullDisplayName}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[160px]" title={bInfo.fullDisplayName}>
                              {bInfo.fullDisplayName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Team Functionality Verdict */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${teamBadge.bg} ${teamBadge.color} ${teamBadge.border}`}
                          >
                            {teamBadge.shortLabel}
                          </span>
                          <div className="text-[10px] text-slate-700 dark:text-slate-400">
                            {run.consensusStatus === 'consensus_reached'
                              ? `Consensus at Turn ${run.metrics.consensusTurn || run.metrics.turnsCount}`
                              : run.consensusStatus === 'infinite_loop_abort'
                              ? 'Loop / Burn Aborted'
                              : 'Cap Exhausted'}
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
                            {run.metrics.accuracyScore}%
                          </span>
                          <span className="text-[10px] text-slate-700 dark:text-slate-400">
                            {run.metrics.isCorrect ? 'Ground Truth' : 'Mismatched'}
                          </span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        <div>{formatCurrency(run.metrics.totalCostUsd)}</div>
                        <div className="text-[10px] font-normal text-slate-700 dark:text-slate-400">
                          {formatCurrency(run.metrics.costPerTurnUsd || (run.metrics.totalCostUsd / Math.max(1, run.metrics.turnsCount)))}/t
                        </div>
                      </td>

                      {/* Time & Tokens */}
                      <td className="px-4 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        <div>{wallClockSec}s</div>
                        <div className="text-[10px] text-slate-700 dark:text-slate-400">
                          {formatNumber(run.metrics.totalTokens)} tok
                        </div>
                      </td>

                      {/* Efficiency Index */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {run.metrics.efficiencyIndex.toFixed(1)}
                        </div>
                        <span className={`text-[10px] font-bold ${tier.color}`}>
                          {tier.label.split(' ')[0]} Tier
                        </span>
                      </td>

                      {/* Inspect Action */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setInspectModalRun(run)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                          title="Inspect full transcript and telemetry"
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
        const modalSuite = getChallengeTypeForRun(inspectModalRun);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${modalSuite.colorScheme.bg} ${modalSuite.colorScheme.text} ${modalSuite.colorScheme.border}`}>
                      <span>{modalSuite.badgeEmoji}</span>
                      <span>{modalSuite.shortLabel}</span>
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {inspectModalRun.problemTitle}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{modalAInfo.fullDisplayName}</span>
                    <span className="text-slate-400">vs</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{modalBInfo.fullDisplayName}</span>
                    <span>•</span>
                    <span>{inspectModalRun.metrics.turnsCount} Turns</span>
                    <span>•</span>
                    <span>Cost: {formatCurrency(inspectModalRun.metrics.totalCostUsd)}</span>
                    <span>•</span>
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
                {inspectModalRun.turns && inspectModalRun.turns.length > 0 ? (
                  inspectModalRun.turns.map((turn, i) => (
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
                          {turn.agentName} (Turn {turn.agentTurnNumber || i + 1})
                        </span>
                        <span className="font-mono text-[10px] text-slate-700 dark:text-slate-400">
                          {formatTime(turn.latencyMs)} • {turn.totalTokens} tokens • {formatCurrency(turn.costUsd || 0)}
                        </span>
                      </div>
                      <div className="whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {turn.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center dark:bg-slate-800/40 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Transcript metadata saved. Run verified with consensus:
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {inspectModalRun.finalAgreedAnswer || 'No agreed answer'}
                    </p>
                    {inspectModalRun.verification && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-left text-xs dark:bg-slate-900 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Ground Truth Explanation: </span>
                        <span className="text-slate-600 dark:text-slate-400">{inspectModalRun.verification.explanation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer with Replay & Ground Truth */}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-slate-700 dark:text-slate-400">Agreed Answer: </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {inspectModalRun.finalAgreedAnswer || 'None'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
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
          </div>
        );
      })()}
    </div>
  );
};
