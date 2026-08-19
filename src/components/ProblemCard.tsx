import React, { useState } from 'react';
import { BenchmarkProblem } from '../types/benchmark';
import { HelpCircle, Eye, EyeOff, Tag } from 'lucide-react';

interface ProblemCardProps {
  problem: BenchmarkProblem;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({ problem }) => {
  const [showGroundTruth, setShowGroundTruth] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Problem Statement & Consensus Protocol
          </h3>
        </div>

        <button
          onClick={() => setShowGroundTruth(!showGroundTruth)}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
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
      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
        {problem.question}
      </div>

      {/* Consensus Tag Requirement */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 dark:bg-slate-800/50 dark:border-slate-800">
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
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
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
  );
};
