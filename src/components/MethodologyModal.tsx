import React from 'react';
import {
  BookOpen,
  X,
  Zap,
  ShieldCheck,
  Brain,
  Crosshair,
  Shapes,
  Clock,
  Cpu,
  Target,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              DualBlind Benchmark Methodology
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-400">
              Measuring Collaborative Inference-Time Compute Efficiency, Consensus & Accuracy
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Section 0: About */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              About DualBlind Benchmark
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
              <strong>DualBlind</strong> is an adversarial and collaborative multi-agent evaluation benchmark that pairs two frontier AI models in dual-blind dialogue to solve complex logic, game-theoretic strategy, and abstract induction challenges. We built this platform because isolated, single-turn LLM benchmarks fail to measure how models negotiate with counterpart systems, self-correct erroneous premises, detect partner hallucinations, and converge on verifiable ground truth without squandering test-time compute through runaway token inflation and sluggish latency.
            </p>
          </div>

          {/* Section 1: The Core Thesis */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              The Next-Gen Evaluation Paradigm: Inference Compute Efficiency
            </h3>
            <p className="text-slate-700 dark:text-slate-300 mt-1">
              Traditional LLM benchmarks evaluate models in pure isolation with one-shot answers. However, modern reasoning architectures scale test-time compute through chain-of-thought, self-correction, and multi-turn collaboration.
              <strong> DualBlind</strong> measures how effectively two models reach an optimal consensus without excessive token inflation or sluggish latency.
            </p>
          </div>

          {/* Section 2: Mathematical Formula for Efficiency Index */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Target className="h-4 w-4 text-indigo-500" />
              The Accuracy-to-Compute Efficiency Index Formula
            </h4>
            <div className="my-2 rounded-xl bg-slate-900 p-3 font-mono text-center text-sm font-bold text-indigo-300">
              Efficiency Index = [ Accuracy Score (0-100) ÷ (Wall-Clock Time (s) × Total Tokens) ] × 10,000
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              <strong>Why this works:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li>
                <strong>Penalizes Token Inflation:</strong> Models that emit thousands of repetitive tokens to solve a simple constraint problem receive a diminished score.
              </li>
              <li>
                <strong>Penalizes Rushing:</strong> An agent that outputs 3 tokens quickly but fails correctness gets an accuracy score of 0, yielding an Efficiency Index of 0.
              </li>
              <li>
                <strong>Rewards Optimal Collaboration:</strong> Reaching the exact ground truth with minimal turns, crisp step-by-step verification, and high tokens/sec yields an S-Tier score.
              </li>
            </ul>
          </div>

          {/* Section 3: The 4 Core Architectural Protocols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                1. Dual-Blind Framing
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Neither bot is told the other is an AI. Framing the prompt as a human colleague prevents agents from defaulting to canned multi-agent scripts or sycophantic auto-deferral.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                2. Consensus Signaling
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Both agents are instructed to format their final agreement in strict structure (<code className="font-mono text-amber-600">FINAL ANSWER: [X]</code>). Once both emit matching tags, the test concludes immediately.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" />
                3. Turn Cap Termination
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                A strict turn cap (e.g. 5 turns per bot = 10 total) guarantees termination. Failing to agree within the limit is marked as a consensus failure.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <Target className="h-4 w-4 text-purple-500" />
                4. Deterministic Domain Verifiers
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Ground truth answers are verified deterministically via canonical exact matching, alias trees, and mathematical rule engines.
              </p>
            </div>
          </div>

          {/* Section 4: The 3 Core Evaluation Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              The 3 Benchmark Evaluation Topics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-purple-50/60 p-3 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/40">
                <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1 mb-1">
                  <Brain className="h-3.5 w-3.5" /> Logic
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Deductive reasoning, constraint satisfaction, Knights & Knaves identity matrices, and jug-pouring state search.
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1 mb-1">
                  <Crosshair className="h-3.5 w-3.5" /> Strategy
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Game theory, Cournot duopoly Nash equilibria, backward induction in resource allocation, and optimal bidding algorithms.
                </p>
              </div>

              <div className="rounded-xl bg-amber-50/60 p-3 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40">
                <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1 mb-1">
                  <Shapes className="h-3.5 w-3.5" /> Abstract Reasoning
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Cellular lattice induction, alien algebraic operators, polynomial sequence extrapolation, and Monty Hall probability variants.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
