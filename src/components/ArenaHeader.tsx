import React from 'react';
import {
  Brain,
  Crosshair,
  Shapes,
  Shuffle,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Infinity,
  Flame,
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Side: Topic Filter & Problem Selector */}
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Topic / Suite Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 shrink-0 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => onSelectTopic('all')}
              disabled={isRunning}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Tests ({BENCHMARK_PROBLEMS.length})
            </button>
            <button
              onClick={() => onSelectTopic('science')}
              disabled={isRunning}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'science'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>MMLU / GPQA</span>
            </button>
            <button
              onClick={() => onSelectTopic('coding')}
              disabled={isRunning}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'coding'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>SWE-bench</span>
            </button>
            <button
              onClick={() => onSelectTopic('math')}
              disabled={isRunning}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'math'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>MATH / AIME</span>
            </button>
            <button
              onClick={() => onSelectTopic('logic')}
              disabled={isRunning}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'logic'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Brain className="h-3 w-3" />
              <span>Logic</span>
            </button>
            <button
              onClick={() => onSelectTopic('strategy')}
              disabled={isRunning}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'strategy'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Crosshair className="h-3 w-3" />
              <span>Strategy</span>
            </button>
            <button
              onClick={() => onSelectTopic('instruction_following')}
              disabled={isRunning}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'instruction_following'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>IFEval</span>
            </button>
            <button
              onClick={() => onSelectTopic('abstract')}
              disabled={isRunning}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTopic === 'abstract'
                  ? 'bg-cyan-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Shapes className="h-3 w-3" />
              <span>ARC</span>
            </button>
          </div>

          {/* Problem Selector Dropdown */}
          <div className="flex-1 min-w-[240px]">
            <select
              id="problem-select-dropdown"
              disabled={isRunning}
              value={currentProblem.id}
              onChange={(e) => {
                const p = BENCHMARK_PROBLEMS.find((prob) => prob.id === e.target.value);
                if (p) onSelectProblem(p);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 truncate cursor-pointer"
            >
              {filteredProblems.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.suite || p.topic.toUpperCase()}] {p.title} ({p.difficulty})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: Uncapped Toggle, Primary Execution Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Pill */}
          <button
            onClick={onToggleUncapped}
            disabled={isRunning}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border ${
              isUncapped
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title="Toggle Uncapped Consensus vs Capped Turns"
          >
            <Infinity className="h-3.5 w-3.5" />
            <span>{isUncapped ? 'Uncapped Mode' : `Capped (${maxTurns}T)`}</span>
          </button>

          {/* Turn Step */}
          {!isRunning && (
            <button
              onClick={onStepTurn}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              <FastForward className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Step</span>
            </button>
          )}

          {/* Start / Pause */}
          {!isRunning ? (
            <button
              onClick={onStartAutoRun}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 cursor-pointer transition-colors"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{turnCount > 0 ? 'Resume' : 'Run Benchmark'}</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 cursor-pointer transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={isRunning}
            className="flex items-center gap-1 rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40"
            title="Reset Arena"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
