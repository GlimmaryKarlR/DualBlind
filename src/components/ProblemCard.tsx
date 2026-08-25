import React, { useState } from 'react';
import { BenchmarkProblem } from '../types/benchmark';
import { HelpCircle, Eye, EyeOff, Tag, ChevronDown, Sparkles } from 'lucide-react';

interface ProblemCardProps {
  problem: BenchmarkProblem;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGroundTruth, setShowGroundTruth] = useState(false);

  const getDifficultyColor = (diff: string) => {
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
    <div
      id="problem-statement-card"
      className="rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-200 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Clickable Header with Dropdown Arrow */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className={`flex items-center justify-between p-4 cursor-pointer select-none transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-2xl ${
          isExpanded ? 'border-b border-slate-100 dark:border-slate-800 rounded-b-none' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Problem Statement & Consensus Protocol
            </h3>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {problem.suite && (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {problem.suite}
                </span>
              )}
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[240px]">
                • {problem.title}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getDifficultyColor(
                  problem.difficulty
                )}`}
              >
                {problem.difficulty}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="hidden sm:inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            {isExpanded ? 'Hide' : 'Show'}
          </span>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-transform duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 ${
              isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : ''
            }`}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 pt-3 animate-fade-in space-y-4">
          {/* Header Controls inside expanded view */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Full Benchmark Challenge Description</span>
            </div>

            <button
              id="inspect-ground-truth-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGroundTruth(!showGroundTruth);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer transition-colors"
            >
              {showGroundTruth ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Hide Ground Truth</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect Ground Truth</span>
                </>
              )}
            </button>
          </div>

          {/* Problem Question text */}
          <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
            {problem.question}
          </div>

          {/* Consensus Tag Requirement */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 dark:bg-slate-800/50 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              <Tag className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Required Consensus Signal:</span>
            </div>
            <code className="rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-bold text-indigo-600 border border-indigo-200 shadow-2xs dark:bg-slate-900 dark:text-indigo-300 dark:border-indigo-900/60">
              {problem.expectedFormat}
            </code>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Both agents must output identical tags to trigger auto-termination)
            </span>
          </div>

          {/* Ground Truth Reveal Panel */}
          {showGroundTruth && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <span className="uppercase tracking-wider text-[10px]">Canonical Ground Truth:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {problem.canonicalAnswer}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Verifier Logic: </span>
                {problem.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

