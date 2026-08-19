import React from 'react';
import {
  Brain,
  Crosshair,
  Shapes,
  Shuffle,
  Sliders,
  Play,
  RotateCcw,
  Square,
  FastForward,
  Flame,
  Ban,
  Infinity,
} from 'lucide-react';
import { BenchmarkProblem, TopicCategory, AgentConfig } from '../types/benchmark';
import { BENCHMARK_PROBLEMS } from '../data/benchmarkProblems';

interface ArenaHeaderProps {
  selectedTopic: TopicCategory | 'all';
  onSelectTopic: (topic: TopicCategory | 'all') => void;
  currentProblem: BenchmarkProblem;
  onSelectProblem: (problem: BenchmarkProblem) => void;
  agentA: AgentConfig;
  agentB: AgentConfig;
  onOpenConfig: () => void;
  isRunning: boolean;
  isPaused: boolean;
  isUncapped: boolean;
  onToggleUncapped: () => void;
  onStartAutoRun: () => void;
  onPause: () => void;
  onStepTurn: () => void;
  onReset: () => void;
  onAbortInfiniteBurn?: () => void;
  turnCount: number;
  maxTurns: number;
}

export const ArenaHeader: React.FC<ArenaHeaderProps> = ({
  selectedTopic,
  onSelectTopic,
  currentProblem,
  onSelectProblem,
  agentA,
  agentB,
  onOpenConfig,
  isRunning,
  isPaused,
  isUncapped,
  onToggleUncapped,
  onStartAutoRun,
  onPause,
  onStepTurn,
  onReset,
  onAbortInfiniteBurn,
  turnCount,
  maxTurns,
}) => {
  const filteredProblems =
    selectedTopic === 'all'
      ? BENCHMARK_PROBLEMS
      : BENCHMARK_PROBLEMS.filter((p) => p.topic === selectedTopic);

  const getTopicBadge = (topic: TopicCategory) => {
    switch (topic) {
      case 'logic':
        return {
          icon: <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
          label: 'Logic',
          badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'strategy':
        return {
          icon: <Crosshair className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          label: 'Strategy',
          badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'abstract':
        return {
          icon: <Shapes className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          label: 'Abstract Problem Solving',
          badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
    }
  };

  const currentTopicInfo = getTopicBadge(currentProblem.topic);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Top Row: Topic Selector Pills & Settings Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-400 mr-1">
            Topic Filter:
          </span>

          <button
            id="topic-pill-all"
            disabled={isRunning}
            onClick={() => onSelectTopic('all')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              selectedTopic === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>All Topics</span>
          </button>

          <button
            id="topic-pill-logic"
            disabled={isRunning}
            onClick={() => onSelectTopic('logic')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              selectedTopic === 'logic'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>1. Logic</span>
          </button>

          <button
            id="topic-pill-strategy"
            disabled={isRunning}
            onClick={() => onSelectTopic('strategy')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              selectedTopic === 'strategy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>2. Strategy</span>
          </button>

          <button
            id="topic-pill-abstract"
            disabled={isRunning}
            onClick={() => onSelectTopic('abstract')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              selectedTopic === 'abstract'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60'
            }`}
          >
            <Shapes className="h-3.5 w-3.5" />
            <span>3. Abstract</span>
          </button>
        </div>

        {/* Right side options: Uncapped Mode toggle and Config */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-uncapped"
            disabled={isRunning}
            onClick={onToggleUncapped}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border ${
              isUncapped
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
            title={
              isUncapped
                ? 'Uncapped Mode: Agents converse until consensus or infinite burn failure is diagnosed.'
                : `Capped Mode: Hard limit of ${maxTurns} turns.`
            }
          >
            <Infinity className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{isUncapped ? 'Uncapped Burn Mode (Active)' : `Capped (${maxTurns} Turns)`}</span>
          </button>

          {/* Configuration Trigger */}
          <button
            id="arena-config-btn"
            disabled={isRunning}
            onClick={onOpenConfig}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Config</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] font-mono dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {agentA.name} vs {agentB.name}
            </span>
          </button>
        </div>
      </div>

      {/* Middle Row: Active Problem Selector Dropdown and Controls */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Problem Picker */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-400">
              Active Benchmark Challenge:
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${currentTopicInfo.badgeClass}`}
            >
              {currentTopicInfo.icon}
              {currentTopicInfo.label}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {currentProblem.difficulty}
            </span>
          </div>

          <select
            id="problem-select-dropdown"
            disabled={isRunning}
            value={currentProblem.id}
            onChange={(e) => {
              const p = BENCHMARK_PROBLEMS.find((prob) => prob.id === e.target.value);
              if (p) onSelectProblem(p);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-2xs focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {filteredProblems.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.topic.toUpperCase()}] {p.title} ({p.difficulty})
              </option>
            ))}
          </select>
        </div>

        {/* Execution Control Action Bar */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {!isRunning ? (
            <>
              <button
                id="btn-step-turn"
                onClick={onStepTurn}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
                title="Execute single dialogue turn"
              >
                <FastForward className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Step 1 Turn</span>
              </button>

              <button
                id="btn-start-autorun"
                onClick={onStartAutoRun}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition-all cursor-pointer active:scale-98"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{turnCount > 0 ? 'Continue Benchmark' : 'Run Benchmark'}</span>
              </button>
            </>
          ) : (
            <>
              {isPaused ? (
                <button
                  id="btn-resume-run"
                  onClick={onStartAutoRun}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-all cursor-pointer active:scale-98"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  id="btn-pause-run"
                  onClick={onPause}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-400 transition-all cursor-pointer active:scale-98"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              {turnCount >= 6 && onAbortInfiniteBurn && (
                <button
                  id="btn-header-abort-burn"
                  onClick={onAbortInfiniteBurn}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-500 transition-all cursor-pointer active:scale-98"
                  title="Flag as Non-Functional due to endless token burn and abort"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Flag Loop & Abort</span>
                </button>
              )}
            </>
          )}

          <button
            id="btn-reset-arena"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Reset conversation and telemetry"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

