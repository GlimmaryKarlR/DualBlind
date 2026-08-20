import React, { useState, useEffect, useRef } from 'react';
import { AgentConfig, BenchmarkProblem, ChatTurn } from '../types/benchmark';
import {
  parseModelBrandInfo,
  generateExternalPromptText,
  estimateTokens,
  guestimateCost,
} from '../utils/modelTracker';
import { formatCurrency, formatTime } from '../utils/formatters';
import {
  Copy,
  Check,
  Send,
  Clock,
  Cpu,
  DollarSign,
  Zap,
  ExternalLink,
  Sparkles,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ExternalAgentInputCardProps {
  currentAgent: AgentConfig;
  partnerAgent: AgentConfig;
  problem: BenchmarkProblem;
  turns: ChatTurn[];
  isUncapped: boolean;
  maxTurns: number;
  onSubmitTurn: (
    content: string,
    latencyMs: number,
    inputTokens: number,
    outputTokens: number,
    costUsd: number
  ) => void;
  onFallbackToAutomated: () => void;
}

export const ExternalAgentInputCard: React.FC<ExternalAgentInputCardProps> = ({
  currentAgent,
  partnerAgent,
  problem,
  turns,
  isUncapped,
  maxTurns,
  onSubmitTurn,
  onFallbackToAutomated,
}) => {
  const modelInfo = parseModelBrandInfo(
    currentAgent.model,
    null,
    currentAgent.isManualExternal,
    currentAgent.customBrand,
    currentAgent.customModel
  );

  const [copied, setCopied] = useState<boolean>(false);
  const [responseText, setResponseText] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [customLatencySec, setCustomLatencySec] = useState<string>('');
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate prompt text
  const historyForPrompt = turns.map((t) => ({
    sender: t.agentName,
    text: t.content,
    isCurrentAgent: t.agentId === currentAgent.id,
  }));

  const formattedPrompt = generateExternalPromptText(
    problem,
    currentAgent.name,
    partnerAgent.name,
    historyForPrompt,
    turns.length,
    maxTurns,
    isUncapped
  );

  // Estimated tokens & costs
  const inputTokensEst = estimateTokens(formattedPrompt);
  const outputTokensEst = estimateTokens(responseText);
  const totalTokensEst = inputTokensEst + outputTokensEst;

  const activeLatencySec = customLatencySec
    ? parseFloat(customLatencySec) || elapsedSeconds || 1
    : elapsedSeconds || 1;
  const activeLatencyMs = Math.round(activeLatencySec * 1000);

  const costEst = guestimateCost(
    inputTokensEst,
    outputTokensEst,
    modelInfo.inputPricePerMillion,
    modelInfo.outputPricePerMillion
  );

  const speedEst =
    activeLatencySec > 0 ? (outputTokensEst / activeLatencySec).toFixed(1) : '0.0';

  // Stopwatch timer when copied
  useEffect(() => {
    if (isTimerRunning) {
      const startTime = Date.now() - elapsedSeconds * 1000;
      timerRef.current = setInterval(() => {
        const diff = (Date.now() - startTime) / 1000;
        setElapsedSeconds(Math.round(diff * 10) / 10);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(formattedPrompt);
      setCopied(true);
      setIsTimerRunning(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!responseText.trim()) return;

    setIsTimerRunning(false);
    onSubmitTurn(
      responseText.trim(),
      activeLatencyMs,
      inputTokensEst,
      outputTokensEst,
      costEst
    );
  };

  const getProviderLink = (brand: string) => {
    const b = brand.toLowerCase();
    if (b.includes('microsoft') || b.includes('phi') || b.includes('azure')) return 'https://copilot.microsoft.com';
    if (b.includes('amazon') || b.includes('nova') || b.includes('aws') || b.includes('bedrock')) return 'https://aws.amazon.com/bedrock';
    if (b.includes('xai') || b.includes('grok')) return 'https://grok.com';
    if (b.includes('kimi') || b.includes('moonshot')) return 'https://kimi.moonshot.cn';
    if (b.includes('deepseek')) return 'https://chat.deepseek.com';
    if (b.includes('qwen') || b.includes('alibaba')) return 'https://chat.qwenlm.ai';
    if (b.includes('mistral') || b.includes('codestral')) return 'https://chat.mistral.ai';
    if (b.includes('anthropic') || b.includes('claude')) return 'https://claude.ai';
    if (b.includes('openai') || b.includes('gpt')) return 'https://chatgpt.com';
    if (b.includes('cohere')) return 'https://coral.cohere.com';
    if (b.includes('01.ai') || b.includes('yi')) return 'https://lingyiwanwu.com';
    return null;
  };

  const providerUrl = getProviderLink(modelInfo.brand);

  return (
    <div className="rounded-2xl border-2 border-indigo-500/80 bg-white p-4 shadow-lg dark:border-indigo-500/70 dark:bg-slate-900 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-mono font-bold text-xs shadow-xs">
            {currentAgent.id === 'agent_a' ? '01' : '02'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Turn {turns.length + 1}: Waiting for {currentAgent.name}
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                {modelInfo.brand} • {modelInfo.displayName}
              </span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-400 mt-0.5">
              Copy the prompt to your {modelInfo.brand} window, then paste the answer below.
            </p>
          </div>
        </div>

        {/* Quick External Link */}
        <div className="flex items-center gap-2">
          {providerUrl && (
            <a
              href={providerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <span>Open {modelInfo.brand}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <button
            onClick={onFallbackToAutomated}
            className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Switch this turn to automated Gemini inference"
          >
            Auto-Run Turn with Gemini
          </button>
        </div>
      </div>

      {/* Step 1: Copy Prompt Action Area */}
      <div className="mt-3.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Step 1: Copy Formatted Benchmark Prompt
            </span>
            <p className="text-[11px] text-slate-700 dark:text-slate-400 mt-0.5">
              Includes problem statement, constraints, turn rules, and debate history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 cursor-pointer"
            >
              {showPromptPreview ? 'Hide Prompt' : 'Preview Prompt'}
            </button>

            <button
              onClick={handleCopyPrompt}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied! (Timer Started)</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Prompt to Clipboard</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Prompt Preview Accordion */}
        {showPromptPreview && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-[11px] font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {formattedPrompt}
          </div>
        )}
      </div>

      {/* Step 2: Paste Response Form */}
      <form onSubmit={handleSubmit} className="mt-3.5 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Step 2: Paste {modelInfo.displayName} Response
            </label>

            {/* Final Answer format hint */}
            <span className="text-[10px] text-slate-700 dark:text-slate-400 font-mono">
              Expected format: <code className="font-bold text-indigo-600 dark:text-indigo-400">{problem.expectedFormat}</code>
            </span>
          </div>

          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder={`Paste the full generated response from ${modelInfo.displayName} here... (including reasoning steps and FINAL ANSWER: [...] if concluding)`}
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 font-mono"
            required
          />
        </div>

        {/* Real-time Guestimation Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
          {/* 1. Time / Latency */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-400 block">Response Time</span>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={customLatencySec || elapsedSeconds || ''}
                  onChange={(e) => setCustomLatencySec(e.target.value)}
                  placeholder={`${elapsedSeconds.toFixed(1)}`}
                  className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                />
                <span className="text-[11px] text-slate-700 dark:text-slate-400">sec</span>
              </div>
            </div>
          </div>

          {/* 2. Guestimated Tokens */}
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-400 block">Est. Compute</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                {totalTokensEst} tok <span className="text-[10px] text-slate-700 dark:text-slate-400">({inputTokensEst} in / {outputTokensEst} out)</span>
              </span>
            </div>
          </div>

          {/* 3. Estimated Cost */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-400 block">Est. Cost ({modelInfo.brand})</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                {formatCurrency(costEst)}
              </span>
            </div>
          </div>

          {/* 4. Speed */}
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-500 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-400 block">Est. Speed</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                {speedEst} t/s
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-700 dark:text-slate-400 flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>If the model concluded, ensure it ended with <code>FINAL ANSWER: [X]</code></span>
          </div>

          <button
            type="submit"
            disabled={!responseText.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 cursor-pointer disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Record Turn & Advance</span>
          </button>
        </div>
      </form>
    </div>
  );
};
