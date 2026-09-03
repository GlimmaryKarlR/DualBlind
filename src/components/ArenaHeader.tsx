import React from 'react';
import {
  Brain,
  Crosshair,
  Shapes,
  Shuffle,
  Sparkles,
  Play,
  Pause,
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
  onOpenConfig?: () => void;
  onRandomize?: () => void;
  onRandomizeFree?: () => void;
  isRunning: boolean;
  isPaused: boolean;
  onStartAutoRun: () => void;
  onPause: () => void;
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
  onRandomize,
  onRandomizeFree,
  isRunning,
  isPaused,
  onStartAutoRun,
  onPause,
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
              <span>GPQA / HLE / MMLU</span>
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
              <span>FrontierMath / AIME</span>
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

        {/* Right Side: Randomize, Free Randomize, Primary Execution Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Randomize Matchup & Question Button */}
          {onRandomize && (
            <button
              id="randomize-models-and-question-btn"
              onClick={onRandomize}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 hover:border-purple-300 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900/60 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed group shadow-2xs"
              title="Pick random models for Agent Alpha & Beta and a random challenge question"
            >
              <Shuffle className="h-3.5 w-3.5 text-purple-600 transition-transform duration-300 group-hover:rotate-45 dark:text-purple-400" />
              <span>Randomize</span>
            </button>
          )}

          {/* Free Randomize Matchup & Question Button */}
          {onRandomizeFree && (
            <button
              id="randomize-free-models-and-question-btn"
              onClick={onRandomizeFree}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed group shadow-2xs"
              title="Pick random 100% FREE models for Agent Alpha & Beta and a random challenge question"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:text-emerald-400" />
              <span>Free Randomize</span>
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
        </div>
      </div>
    </div>
  );
};
