import React, { useState } from 'react';
import {
  Layers,
  Brain,
  Crosshair,
  Shapes,
  Play,
  PlusCircle,
  ShieldCheck,
  Search,
  Atom,
  GraduationCap,
  Code,
  Calculator,
  CheckSquare,
  Sparkles,
  Tag,
  BookOpen,
} from 'lucide-react';
import { BenchmarkProblem, TopicCategory, DifficultyLevel, BenchmarkSuiteId } from '../types/benchmark';
import { BENCHMARK_SUITES_META } from '../data/benchmarkProblems';
import { CustomProblemModal } from './CustomProblemModal';

interface ProblemSuiteViewProps {
  problems: BenchmarkProblem[];
  onSelectAndLaunchProblem: (problem: BenchmarkProblem) => void;
  onAddCustomProblem: (problem: BenchmarkProblem) => void;
}

export const ProblemSuiteView: React.FC<ProblemSuiteViewProps> = ({
  problems,
  onSelectAndLaunchProblem,
  onAddCustomProblem,
}) => {
  const [selectedSuite, setSelectedSuite] = useState<string | 'all'>('all');
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredProblems = problems.filter((p) => {
    const matchesSuite =
      selectedSuite === 'all' ||
      p.suite === selectedSuite ||
      p.suiteId === selectedSuite;
    const matchesTopic = selectedTopic === 'all' || p.topic === selectedTopic;
    const matchesDifficulty = selectedDifficulty === 'all' || p.difficulty === selectedDifficulty;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.suite && p.suite.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.domain && p.domain.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSuite && matchesTopic && matchesDifficulty && matchesSearch;
  });

  const getSuiteIcon = (suiteId?: BenchmarkSuiteId | string) => {
    switch (suiteId) {
      case 'mmlu_pro':
      case 'MMLU-Pro':
        return <GraduationCap className="h-3.5 w-3.5 text-blue-500" />;
      case 'gpqa_diamond':
      case 'GPQA Diamond':
        return <Atom className="h-3.5 w-3.5 text-purple-500" />;
      case 'swe_bench':
      case 'SWE-bench':
        return <Code className="h-3.5 w-3.5 text-emerald-500" />;
      case 'math_aime':
      case 'MATH / AIME':
        return <Calculator className="h-3.5 w-3.5 text-amber-500" />;
      case 'ifeval':
      case 'IFEval':
        return <CheckSquare className="h-3.5 w-3.5 text-rose-500" />;
      case 'arc_challenge':
      case 'ARC Challenge':
        return <Shapes className="h-3.5 w-3.5 text-cyan-500" />;
      case 'game_theory':
      case 'Game Theory':
        return <Crosshair className="h-3.5 w-3.5 text-indigo-500" />;
      default:
        return <Brain className="h-3.5 w-3.5 text-violet-500" />;
    }
  };

  const getDifficultyColor = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'Easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'Hard':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
      case 'Extreme':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Industry Standard Benchmark Suites
            </h2>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
              Gold-Standard Ground Truth
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-400 mt-1 max-w-3xl">
            Curated evaluation tasks from frontier benchmark standards used by OpenAI, Google DeepMind, Anthropic, and Meta — including <strong>MMLU-Pro</strong>, <strong>GPQA Diamond</strong>, <strong>SWE-bench</strong>, <strong>MATH/AIME</strong>, <strong>IFEval</strong>, and <strong>ARC Challenge</strong>.
          </p>
        </div>

        <button
          id="btn-open-custom-problem"
          onClick={() => setIsCustomModalOpen(true)}
          className="flex items-center gap-1.5 self-start md:self-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Custom Challenge</span>
        </button>
      </div>

      {/* Industry Suite Directory Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <button
          onClick={() => setSelectedSuite('all')}
          className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
            selectedSuite === 'all'
              ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>All Suites</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            {problems.length} total tasks
          </span>
        </button>

        {BENCHMARK_SUITES_META.map((meta) => {
          const count = problems.filter((p) => p.suiteId === meta.id || p.suite === meta.shortName).length;
          const isSelected = selectedSuite === meta.id || selectedSuite === meta.shortName;

          return (
            <button
              key={meta.id}
              onClick={() => setSelectedSuite(meta.shortName)}
              className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-xs text-slate-900 dark:text-white truncate w-full">
                {getSuiteIcon(meta.id)}
                <span className="truncate">{meta.shortName}</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {count} {count === 1 ? 'task' : 'tasks'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Difficulty Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Difficulty:
          </span>
          {(['all', 'Easy', 'Medium', 'Hard', 'Extreme'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                selectedDifficulty === diff
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {diff === 'all' ? 'All' : diff}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-700 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search by suite, topic, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 sm:w-72 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Problem Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProblems.map((problem) => {
          const isExpanded = expandedId === problem.id;

          return (
            <div
              key={problem.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-indigo-200 dark:hover:border-indigo-800"
            >
              <div>
                {/* Suite & Difficulty Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Suite Badge */}
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                      {getSuiteIcon(problem.suiteId || problem.suite)}
                      <span>{problem.suite || 'Benchmark'}</span>
                    </span>

                    {/* Domain Tag */}
                    {problem.domain && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {problem.domain}
                      </span>
                    )}

                    {/* Difficulty Pill */}
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${getDifficultyColor(
                        problem.difficulty
                      )}`}
                    >
                      {problem.difficulty}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                    ID: {problem.id}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {problem.title}
                </h3>

                {/* Source Citation */}
                {problem.sourceCitation && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <BookOpen className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>Origin: {problem.sourceCitation}</span>
                  </div>
                )}

                {/* Prompt Preview */}
                <p
                  className={`mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${
                    isExpanded ? '' : 'line-clamp-3'
                  }`}
                >
                  {problem.question}
                </p>

                {problem.question.length > 180 && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : problem.id)}
                    className="mt-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                  >
                    {isExpanded ? 'Show less' : 'Read full problem statement...'}
                  </button>
                )}

                {/* Expected Consensus Format Tag */}
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] dark:bg-slate-800/60 font-mono">
                  <Tag className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Protocol:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300 truncate">
                    {problem.expectedFormat}
                  </span>
                </div>

                {/* Canonical Answer Preview */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Ground Truth: </span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {problem.canonicalAnswer}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => onSelectAndLaunchProblem(problem)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Launch in Arena</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CustomProblemModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onAddProblem={onAddCustomProblem}
      />
    </div>
  );
};
