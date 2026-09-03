import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  Crosshair,
  Clock,
  Target,
  CheckCircle2,
  BrainCircuit,
  Check,
  Copy,
  Layers,
  Sparkles,
  Gauge,
  Workflow,
  Scale,
  Terminal,
} from 'lucide-react';

interface MethodologyViewProps {
  onNavigateToTraining?: () => void;
  onNavigateToArena?: () => void;
}

export const MethodologyView: React.FC<MethodologyViewProps> = () => {
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const trainingSnippet = `# Train frontier reasoning model using DualBlind Dialectic Datasets
from datasets import load_dataset
from trl import SFTTrainer, DPOTrainer
from transformers import TrainingArguments, AutoModelForCausalLM, AutoTokenizer

# 1. Load 100% verified dialectic reasoning data from Hugging Face
sft_data = load_dataset("GlimmaryKarl/DualBlind", data_files="data/sft_reasoning_train.jsonl")
dpo_data = load_dataset("GlimmaryKarl/DualBlind", data_files="data/dpo_preferences_train.jsonl")

# 2. SFT: Distill multi-agent consensus debate into internal Chain-of-Thought
sft_trainer = SFTTrainer(
    model="Qwen/Qwen2.5-72B-Instruct",
    train_dataset=sft_data["train"],
    dataset_text_field="messages",
    max_seq_length=4096,
)
sft_trainer.train()

# 3. DPO: Penalize unverified guesses, hallucinated lemmas, and sycophantic drift
dpo_trainer = DPOTrainer(
    model=sft_trainer.model,
    train_dataset=dpo_data["train"],
    beta=0.1,
    max_length=4096,
)
dpo_trainer.train()`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            DualBlind Benchmark & Training Methodology
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            A comprehensive framework for evaluating collaborative inference-time compute efficiency,
            multi-agent dialectic consensus, and distilling peer-reviewed reasoning trajectories into frontier models.
          </p>
        </div>
      </div>

      {/* 2. Core Thesis & Problem Statement */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              The Core Thesis: Collaborative Inference-Time Compute
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Why isolated, single-turn LLM benchmarks fail to measure true general intelligence
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-900/40 dark:bg-rose-950/20 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
              <Crosshair className="h-4 w-4" />
              <span>Limitations of Traditional Benchmarks</span>
            </div>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed list-disc pl-4">
              <li>
                <strong>Static Memorization:</strong> Standard multiple-choice tests (e.g. static MMLU) frequently suffer from pretraining data contamination and reward hacking.
              </li>
              <li>
                <strong>Single-Turn Isolation:</strong> Models are queried without pushback, masking fatal reasoning flaws, unwarranted assumptions, and subtle logic leaks.
              </li>
              <li>
                <strong>Blind Sycophancy & Runaway Compute:</strong> Single-pass evaluations do not test whether a model can detect counterpart hallucinations, defend correct proofs, or terminate without wasteful token inflation.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>The DualBlind Paradigm</span>
            </div>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed list-disc pl-4">
              <li>
                <strong>Adversarial Dialectic:</strong> Two frontier models debate in double-blind conditions. Neither knows the other is an AI, preventing canned deference.
              </li>
              <li>
                <strong>Mutual Step-by-Step Verification:</strong> Models actively scrutinize intermediate calculations, state-space branches, and invariant boundary conditions.
              </li>
              <li>
                <strong>Compute Efficiency Scaling:</strong> Measures not just accuracy, but how economically models converge on canonical truth without squandering test-time tokens.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. The Accuracy-to-Compute Efficiency Index */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              The Accuracy-to-Compute Efficiency Index
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mathematical metric penalizing token inflation, wall-clock latency, and premature rushing
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-5 sm:p-6 border border-slate-800 shadow-inner">
          <div className="text-center font-mono text-base sm:text-xl font-bold text-indigo-300 tracking-wide">
            Efficiency Index = &nbsp;
            <span className="text-white">
              [&nbsp;Accuracy Score (0–100)&nbsp;÷&nbsp;(&nbsp;Wall-Clock Latency (s)&nbsp;×&nbsp;Total Tokens&nbsp;)&nbsp;]
            </span>
            &nbsp;×&nbsp;10,000
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-rose-500" />
              Token Inflation Penalty
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Models that generate thousands of meandering, repetitive chain-of-thought tokens when a concise proof exists are mathematically penalized in the denominator.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" />
              Latency & Rushing Guards
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Speed without correctness is futile. An agent that blurts out an answer in 0.5s but misses the canonical truth receives an Accuracy of 0, yielding an Efficiency Index of 0.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              S-Tier Consensus Reward
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Achieving 100% verified accuracy in minimum dialectic turns with dense, step-by-step mathematical reasoning and high generation throughput achieves maximum rank.
            </p>
          </div>
        </div>
      </div>

      {/* 4. THE NEW TRAINING METHOD: DIALECTIC CONSENSUS DISTILLATION */}
      <div className="rounded-3xl border-2 border-indigo-500/30 bg-gradient-to-b from-indigo-50/40 via-white to-white p-6 sm:p-10 shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-6 dark:border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Next-Gen Machine Learning Paradigm</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                The Dialectic Training Method: Consensus Distillation
              </h2>
            </div>
          </div>

          <div className="rounded-xl bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 self-start sm:self-auto">
            Hugging Face: GlimmaryKarl/DualBlind
          </div>
        </div>

        {/* Why this training method is revolutionary */}
        <div className="rounded-2xl border border-indigo-100 bg-white p-5 dark:border-indigo-900/30 dark:bg-slate-800/60 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Why Multi-Agent Dialectic Training Beats Traditional Synthetic Data
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Most synthetic reasoning datasets rely on <strong>single-teacher rejection sampling</strong> (e.g. generating 16 responses with one model and picking the right one). This approach bakes in the teacher model's blind spots, ignores logical counter-arguments, and trains student models to hallucinate plausible-sounding answers without genuine verification.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            DualBlind's <strong>Dialectic Consensus Distillation</strong> pits two frontier models in adversarial collaboration. One agent proposes a proof, the counterpart stress-tests edge cases, attacks erroneous lemmas, and provides counter-examples until both models converge on ground truth. This multi-turn debate is then distilled into single-turn student models, teaching them to internalize both the <em>proposer</em> and <em>skeptic</em> roles in their internal thought process.
          </p>
        </div>

        {/* The 4 Architectural Pillars of the Training Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Pillar 1 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold">
                1
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Zero-Tolerance 100% Quality Gate
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Only runs that terminate with <strong>100% verified mathematical, logical, and canonical ground truth</strong> are allowed into the training pipeline. Runs with unverified answers, consensus deadlocks, or turn-cap timeouts are strictly filtered out, guaranteeing zero contaminated or hallucinated training signals.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
                2
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Dialectic SFT Reasoning Traces
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The full multi-turn deliberation is synthesized into structured <code className="font-mono text-indigo-600 dark:text-indigo-400">&lt;thought&gt;</code> tokens. The student model learns the complete trajectory: initial hypothesis formulation, counter-agent rebuttal, self-correction, lemma re-verification, and final bold answer declaration.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white text-xs font-bold">
                3
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Direct Preference Optimization (DPO) Pairs
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Constructs gold-standard preference pairs where the <strong>chosen (y_w)</strong> is the peer-reviewed consensus proof and the <strong>rejected (y_l)</strong> is the flawed intermediate proposal or unverified single-pass guess. DPO directly optimizes the model against premature convergence and flawed proofs.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-600 text-white text-xs font-bold">
                4
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Efficiency-Weighted Compute Loss
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Training examples are weighted proportionally to their <strong>Efficiency Index</strong>. This penalizes verbosity and guides the gradient descent toward concise, dense, test-time compute solutions rather than endless token loops.
            </p>
          </div>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/30 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            End-to-End Training Data Flowchart
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-xs">Step 1</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Dual-Blind Arena</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Asymmetric model debate</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">Step 2</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">100% Quality Gate</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Deterministic ground truth</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="font-mono text-purple-600 dark:text-purple-400 font-bold text-xs">Step 3</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Trace Synthesis</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Unified &lt;thought&gt; CoT</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="font-mono text-amber-600 dark:text-amber-400 font-bold text-xs">Step 4</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">DPO Pairs</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Chosen vs. Refuted traces</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-xs">Step 5</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Hugging Face Push</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Automated TRL fine-tuning</div>
            </div>
          </div>
        </div>

        {/* Python TRL Integration Code snippet */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>Hugging Face TRL Training Implementation (`train_dualblind_reasoning.py`)</span>
            </div>
            <button
              onClick={() => copyToClipboard(trainingSnippet, setCopiedScript)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer transition-all"
            >
              {copiedScript ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed">
            <code>{trainingSnippet}</code>
          </pre>
        </div>
      </div>

      {/* 5. The 4 Architectural Protocols */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              The 4 Core Architectural Protocols
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Guarantees deterministic execution, termination bounds, and unbiased peer collaboration
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              1. Dual-Blind Framing
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Neither bot is told the counterpart is an artificial intelligence. Framing the prompt as an anonymous colleague prevents models from triggering pre-programmed multi-agent deferral scripts or sycophantic auto-agreement.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              2. Consensus Signaling Protocol
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Both agents are instructed to format final consensus in a strict machine-readable token structure (<code className="font-mono text-amber-600 dark:text-amber-400 font-bold">FINAL ANSWER: [X]</code>). When consecutive turns produce identical canonical answers, consensus is certified immediately.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              3. Strict Turn-Cap Termination
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              A hard turn cap (e.g. 5 rounds per agent = 10 total turns) bounds inference expenditure and eliminates infinite cycling. Failure to reach agreement within the limit is classified as a consensus failure.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-purple-500" />
              4. Deterministic Domain Verifiers
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Ground truth is judged deterministically via canonical exact matching, alias lookup trees, AST parsing, and symbolic algebra rule engines—never using subjective LLM-as-a-judge subjectivity.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Integrated Benchmark Evaluation Suites */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Integrated Benchmark Evaluation Suites
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standardized problem sets testing reasoning, induction, game theory, and constraint satisfaction
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl bg-blue-50/50 p-4 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 space-y-1.5">
            <div className="font-bold text-blue-900 dark:text-blue-300 text-xs">
              🎓 MMLU-Pro & STEM
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Advanced university-level physics, computer science, chemistry, and economics with expanded answer spaces and distractors.
            </p>
          </div>

          <div className="rounded-2xl bg-purple-50/50 p-4 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/40 space-y-1.5">
            <div className="font-bold text-purple-900 dark:text-purple-300 text-xs">
              ⚛️ GPQA Diamond
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Google-proof, PhD-level scientific reasoning challenges written and verified by domain experts to resist simple search queries.
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 space-y-1.5">
            <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">
              💻 SWE-bench / Systems
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Concurrency invariants, distributed consensus (Raft/Byzantine), lock-free data structures, and algorithmic complexity proofs.
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-1.5">
            <div className="font-bold text-amber-900 dark:text-amber-300 text-xs">
              📐 MATH / AIME Olympiad
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              High-difficulty competition mathematics, modular arithmetic, Chinese remainder theorem, and discrete combinatorial proofs.
            </p>
          </div>

          <div className="rounded-2xl bg-rose-50/50 p-4 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 space-y-1.5">
            <div className="font-bold text-rose-900 dark:text-rose-300 text-xs">
              📋 IFEval Hard Constraints
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Verifiable instruction following: strict negative constraints, exact word and sentence counts, and strict structural schemas.
            </p>
          </div>

          <div className="rounded-2xl bg-cyan-50/50 p-4 border border-cyan-100 dark:bg-cyan-950/20 dark:border-cyan-900/40 space-y-1.5">
            <div className="font-bold text-cyan-900 dark:text-cyan-300 text-xs">
              🔷 ARC Challenge
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Abstraction and Reasoning Corpus: visual-spatial matrix transformation, topological invariants, and cellular automata rules.
            </p>
          </div>

          <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 space-y-1.5">
            <div className="font-bold text-indigo-900 dark:text-indigo-300 text-xs">
              🎯 Game Theory & Nash
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Cournot duopolies, backward induction, Pirate gold division, Vickrey auction mechanisms, and Nim combinatorial strategies.
            </p>
          </div>

          <div className="rounded-2xl bg-violet-50/50 p-4 border border-violet-100 dark:bg-violet-950/20 dark:border-violet-900/40 space-y-1.5">
            <div className="font-bold text-violet-900 dark:text-violet-300 text-xs">
              🧠 Formal Logic & State Space
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Knights/knaves boolean deduction, 3-jug state-space decanting optimization, and linear seating constraint satisfaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
