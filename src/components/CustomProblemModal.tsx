import React, { useState } from 'react';
import { BenchmarkProblem, TopicCategory, DifficultyLevel } from '../types/benchmark';
import { PlusCircle, X, Sparkles, Tag, HelpCircle, Target } from 'lucide-react';

interface CustomProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProblem: (problem: BenchmarkProblem) => void;
}

export const CustomProblemModal: React.FC<CustomProblemModalProps> = ({
  isOpen,
  onClose,
  onAddProblem,
}) => {
  const [topic, setTopic] = useState<TopicCategory>('logic');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [question, setQuestion] = useState('');
  const [canonicalAnswer, setCanonicalAnswer] = useState('');
  const [aliases, setAliases] = useState('');
  const [expectedFormat, setExpectedFormat] = useState('FINAL ANSWER: [X]');
  const [explanation, setExplanation] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !question.trim() || !canonicalAnswer.trim()) {
      alert('Please fill out all required fields (Title, Problem Statement, and Canonical Answer).');
      return;
    }

    const groundTruthList = [
      canonicalAnswer.trim(),
      ...aliases
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0),
    ];

    const newProblem: BenchmarkProblem = {
      id: `custom-${Date.now()}`,
      topic,
      title: title.trim(),
      difficulty,
      question: question.trim(),
      expectedFormat: expectedFormat.trim() || `FINAL ANSWER: [${canonicalAnswer.trim()}]`,
      canonicalAnswer: canonicalAnswer.trim(),
      groundTruth: groundTruthList,
      explanation: explanation.trim() || 'Custom user-defined problem verifier.',
      verifierType: 'exact_or_alias',
    };

    onAddProblem(newProblem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Create Custom Benchmark Problem
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-400">
              Add a new ground-truth analytical puzzle to evaluate in the Dual-Blind arena.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Topic & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Benchmark Discipline & Topic *
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as TopicCategory)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="science">STEM & Science (MMLU-Pro / GPQA Diamond)</option>
                <option value="coding">Software Engineering & Algorithms (SWE-bench / LiveCode)</option>
                <option value="math">Competition Math (MATH-500 / AIME)</option>
                <option value="instruction_following">Verifiable Constraints (IFEval)</option>
                <option value="logic">Formal Deductive Logic & Constraints</option>
                <option value="strategy">Game Theory & Strategy (Nash / Mechanism)</option>
                <option value="abstract">Abstract Reasoning & Abstraction (ARC)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Extreme">Extreme (Frontier PhD)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Problem Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Monty Hall Variant with 5 Doors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Problem Statement */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Problem Statement / Prompt *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe the rules, initial state, constraints, and exact analytical question to be solved collaboratively..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 font-sans"
            />
          </div>

          {/* Canonical Ground Truth */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Canonical Ground Truth Answer *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 7 steps or 3/4"
                value={canonicalAnswer}
                onChange={(e) => {
                  setCanonicalAnswer(e.target.value);
                  if (expectedFormat === 'FINAL ANSWER: [X]') {
                    setExpectedFormat(`FINAL ANSWER: [${e.target.value}]`);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Acceptable Aliases (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. 7, 7 pours, seven"
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Expected Format */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Required Consensus Tag Format
            </label>
            <input
              type="text"
              value={expectedFormat}
              onChange={(e) => setExpectedFormat(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Proof / Explanation */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mathematical / Logical Explanation (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Step-by-step proof of the correct solution..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 cursor-pointer"
            >
              Add to Benchmark Suite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
