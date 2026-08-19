import React, { useState } from 'react';
import {
  Layers,
  Brain,
  Crosshair,
  Shapes,
  Play,
  PlusCircle,
  CheckCircle2,
  HelpCircle,
  Tag,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { BenchmarkProblem, TopicCategory, DifficultyLevel } from '../types/benchmark';
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
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredProblems = problems.filter((p) => {
    const matchesTopic = selectedTopic === 'all' || p.topic === selectedTopic;
    const matchesDifficulty = selectedDifficulty === 'all' || p.difficulty === selectedDifficulty;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.question.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTopic && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ground-Truth Problem Suite
            </h2>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">
            Curated evaluation tasks across formal logic, strategic game theory, and abstract reasoning.
          </p>
        </div>

        <button
          id="btn-open-custom-problem"
          onClick={() => setIsCustomModalOpen(true)}
          className="flex items-center gap-1.5 self-start md:self-center rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-all cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Custom Challenge</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Topic Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedTopic('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTopic === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All Topics ({problems.length})
          </button>
          <button
            onClick={() => setSelectedTopic('logic')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTopic === 'logic'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300'
            }`}
          >
            Logic ({problems.filter((p) => p.topic === 'logic').length})
          </button>
          <button
            onClick={() => setSelectedTopic('strategy')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTopic === 'strategy'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            Strategy ({problems.filter((p) => p.topic === 'strategy').length})
          </button>
          <button
            onClick={() => setSelectedTopic('abstract')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTopic === 'abstract'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            Abstract ({problems.filter((p) => p.topic === 'abstract').length})
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-700 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-60 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                {/* Topic & Difficulty Badges */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {problem.topic === 'logic' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        <Brain className="h-3 w-3" /> Logic
                      </span>
                    )}
                    {problem.topic === 'strategy' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Crosshair className="h-3 w-3" /> Strategy
                      </span>
                    )}
                    {problem.topic === 'abstract' && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        <Shapes className="h-3 w-3" /> Abstract
                      </span>
                    )}

                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {problem.difficulty}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-700 dark:text-slate-400">
                    ID: {problem.id}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {problem.title}
                </h3>

                {/* Prompt Preview */}
                <p className={`mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
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
                  <Tag className="h-3 w-3 text-amber-500" />
                  <span className="text-slate-700 dark:text-slate-400">Consensus:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    {problem.expectedFormat}
                  </span>
                </div>

                {/* Canonical Answer Preview */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
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
