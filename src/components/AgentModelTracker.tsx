import React from 'react';
import { AgentConfig, ChatTurn } from '../types/benchmark';
import { parseModelBrandInfo, MODEL_PRESETS, ModelPreset } from '../utils/modelTracker';
import { Bot, Sparkles, AlertTriangle, ShieldCheck, Cpu, Clock, Sliders, ExternalLink, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface AgentModelTrackerProps {
  agentA: AgentConfig;
  agentB: AgentConfig;
  onChangeAgentA?: (config: AgentConfig) => void;
  onChangeAgentB?: (config: AgentConfig) => void;
  lastTurnAgentA?: ChatTurn | null;
  lastTurnAgentB?: ChatTurn | null;
  onOpenConfig: () => void;
  isRunning: boolean;
}

export const AgentModelTracker: React.FC<AgentModelTrackerProps> = ({
  agentA,
  agentB,
  onChangeAgentA,
  onChangeAgentB,
  lastTurnAgentA,
  lastTurnAgentB,
  onOpenConfig,
  isRunning,
}) => {
  const modelInfoA = parseModelBrandInfo(
    agentA.model,
    lastTurnAgentA?.modelUsed,
    agentA.isManualExternal,
    agentA.customBrand,
    agentA.customModel
  );
  const modelInfoB = parseModelBrandInfo(
    agentB.model,
    lastTurnAgentB?.modelUsed,
    agentB.isManualExternal,
    agentB.customBrand,
    agentB.customModel
  );

  const handleSelectPreset = (agentKey: 'agentA' | 'agentB', presetId: string) => {
    const preset = MODEL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (agentKey === 'agentA' && onChangeAgentA) {
      onChangeAgentA({
        ...agentA,
        model: preset.modelCode,
        provider: preset.provider,
        brand: preset.brand,
        isManualExternal: preset.isExternal,
        customBrand: preset.provider === 'custom' ? agentA.customBrand || 'Custom' : undefined,
        customModel: preset.provider === 'custom' ? agentA.customModel || 'Custom LLM' : undefined,
      });
    } else if (agentKey === 'agentB' && onChangeAgentB) {
      onChangeAgentB({
        ...agentB,
        model: preset.modelCode,
        provider: preset.provider,
        brand: preset.brand,
        isManualExternal: preset.isExternal,
        customBrand: preset.provider === 'custom' ? agentB.customBrand || 'Custom' : undefined,
        customModel: preset.provider === 'custom' ? agentB.customModel || 'Custom LLM' : undefined,
      });
    }
  };

  const getStatusBadge = (info: ReturnType<typeof parseModelBrandInfo>) => {
    if (info.statusType === 'manual_external') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          <ExternalLink className="h-3 w-3 text-amber-600" />
          <span>Copy & Paste Mode</span>
        </span>
      );
    }
    if (info.statusType === 'synthetic') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          <ShieldCheck className="h-3 w-3 text-amber-500" />
          <span>Resilient Engine</span>
        </span>
      );
    }
    if (info.statusType === 'fallback') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          <span>Fallback Active</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Live Primary API</span>
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Agent Company & Model Configuration
          </h3>
          <span className="text-[10px] text-slate-700 dark:text-slate-400">
            (Switch between Google, xAI Grok, Anthropic Claude, OpenAI GPT, DeepSeek, or Custom)
          </span>
        </div>

        <button
          onClick={onOpenConfig}
          disabled={isRunning}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer disabled:opacity-50"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Advanced Setup</span>
        </button>
      </div>

      {/* Side-by-side Agent Model Cards */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Agent Alpha Card */}
        <div
          className={`rounded-xl border p-3.5 transition-all ${
            modelInfoA.isManualExternal
              ? 'border-indigo-200 bg-indigo-50/30 dark:border-indigo-800/60 dark:bg-indigo-950/20'
              : modelInfoA.isFallback
              ? 'border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20'
              : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-mono text-xs font-bold shadow-xs">
                01
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {agentA.name}
                  </span>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {modelInfoA.brand}
                  </span>
                </div>
              </div>
            </div>

            <div>{getStatusBadge(modelInfoA)}</div>
          </div>

          {/* Direct Dropdown Selector */}
          <div className="mt-2.5">
            <select
              disabled={isRunning}
              value={
                MODEL_PRESETS.find((p) => p.modelCode === agentA.model || p.id === agentA.model)?.id ||
                (agentA.isManualExternal ? 'custom-external' : 'gemini-3.7-flash')
              }
              onChange={(e) => handleSelectPreset('agentA', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 disabled:opacity-60"
            >
              <optgroup label="Google (Automated API)">
                <option value="gemini-3.7-flash">Google • Gemini 3.7 Flash</option>
                <option value="gemini-2.5-flash">Google • Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Google • Gemini 2.5 Pro</option>
                <option value="gemini-3.1-flash-lite">Google • Gemini 3.1 Flash Lite</option>
              </optgroup>
              <optgroup label="Moonshot AI (External / Kimi)">
                <option value="kimi-k1-5">Moonshot • Kimi k1.5</option>
                <option value="kimi-chat-128k">Moonshot • Kimi Chat (128k)</option>
              </optgroup>
              <optgroup label="DeepSeek (External Copy & Paste)">
                <option value="deepseek-r1">DeepSeek • DeepSeek R1</option>
                <option value="deepseek-v3">DeepSeek • DeepSeek V3</option>
                <option value="deepseek-coder-v2">DeepSeek • DeepSeek Coder V2</option>
              </optgroup>
              <optgroup label="Alibaba (External / Qwen)">
                <option value="qwen-2-5-max">Alibaba • Qwen 2.5 Max</option>
                <option value="qwen-2-5-72b">Alibaba • Qwen 2.5 72B Instruct</option>
                <option value="qwen-2-5-coder">Alibaba • Qwen 2.5 Coder (32B)</option>
              </optgroup>
              <optgroup label="xAI (External Copy & Paste / Grok)">
                <option value="grok-3">xAI • Grok 3</option>
                <option value="grok-3-mini">xAI • Grok 3 Mini</option>
                <option value="grok-2">xAI • Grok 2</option>
              </optgroup>
              <optgroup label="Mistral AI (External Copy & Paste)">
                <option value="mistral-large-2">Mistral AI • Mistral Large 2</option>
                <option value="codestral">Mistral AI • Codestral 2501</option>
              </optgroup>
              <optgroup label="Anthropic (External Copy & Paste)">
                <option value="claude-3-7-sonnet">Anthropic • Claude 3.7 Sonnet</option>
                <option value="claude-3-5-sonnet">Anthropic • Claude 3.5 Sonnet</option>
                <option value="claude-3-5-haiku">Anthropic • Claude 3.5 Haiku</option>
              </optgroup>
              <optgroup label="OpenAI (External Copy & Paste)">
                <option value="gpt-4o">OpenAI • GPT-4o</option>
                <option value="gpt-4o-mini">OpenAI • GPT-4o Mini</option>
                <option value="o3-mini">OpenAI • o3-mini</option>
              </optgroup>
              <optgroup label="Non-Traditional & Open Weights">
                <option value="yi-lightning">01.AI • Yi-Lightning</option>
                <option value="command-r-plus">Cohere • Command R+</option>
                <option value="llama-3-3-70b">Meta • Llama 3.3 70B</option>
                <option value="custom-external">Custom Model (User Proxy)</option>
              </optgroup>
            </select>
          </div>

          {/* Model routing status */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-400 font-mono">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase text-slate-700 dark:text-slate-400">Pricing:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                ${modelInfoA.inputPricePerMillion.toFixed(2)} in / ${modelInfoA.outputPricePerMillion.toFixed(2)} out
              </span>
            </div>

            {lastTurnAgentA && (
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-400">
                <span>{lastTurnAgentA.totalTokens} tok</span>
                <span>•</span>
                <span>{lastTurnAgentA.latencyMs}ms</span>
              </div>
            )}
          </div>

          {modelInfoA.fallbackLabel && (
            <div className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
              {modelInfoA.fallbackLabel}
            </div>
          )}
        </div>

        {/* Agent Beta Card */}
        <div
          className={`rounded-xl border p-3.5 transition-all ${
            modelInfoB.isManualExternal
              ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-800/60 dark:bg-emerald-950/20'
              : modelInfoB.isFallback
              ? 'border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20'
              : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-mono text-xs font-bold shadow-xs">
                02
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {agentB.name}
                  </span>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {modelInfoB.brand}
                  </span>
                </div>
              </div>
            </div>

            <div>{getStatusBadge(modelInfoB)}</div>
          </div>

          {/* Direct Dropdown Selector */}
          <div className="mt-2.5">
            <select
              disabled={isRunning}
              value={
                MODEL_PRESETS.find((p) => p.modelCode === agentB.model || p.id === agentB.model)?.id ||
                (agentB.isManualExternal ? 'custom-external' : 'gemini-3.7-flash')
              }
              onChange={(e) => handleSelectPreset('agentB', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 disabled:opacity-60"
            >
              <optgroup label="Google (Automated API)">
                <option value="gemini-3.7-flash">Google • Gemini 3.7 Flash</option>
                <option value="gemini-2.5-flash">Google • Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Google • Gemini 2.5 Pro</option>
                <option value="gemini-3.1-flash-lite">Google • Gemini 3.1 Flash Lite</option>
              </optgroup>
              <optgroup label="Moonshot AI (External / Kimi)">
                <option value="kimi-k1-5">Moonshot • Kimi k1.5</option>
                <option value="kimi-chat-128k">Moonshot • Kimi Chat (128k)</option>
              </optgroup>
              <optgroup label="DeepSeek (External Copy & Paste)">
                <option value="deepseek-r1">DeepSeek • DeepSeek R1</option>
                <option value="deepseek-v3">DeepSeek • DeepSeek V3</option>
                <option value="deepseek-coder-v2">DeepSeek • DeepSeek Coder V2</option>
              </optgroup>
              <optgroup label="Alibaba (External / Qwen)">
                <option value="qwen-2-5-max">Alibaba • Qwen 2.5 Max</option>
                <option value="qwen-2-5-72b">Alibaba • Qwen 2.5 72B Instruct</option>
                <option value="qwen-2-5-coder">Alibaba • Qwen 2.5 Coder (32B)</option>
              </optgroup>
              <optgroup label="xAI (External Copy & Paste / Grok)">
                <option value="grok-3">xAI • Grok 3</option>
                <option value="grok-3-mini">xAI • Grok 3 Mini</option>
                <option value="grok-2">xAI • Grok 2</option>
              </optgroup>
              <optgroup label="Mistral AI (External Copy & Paste)">
                <option value="mistral-large-2">Mistral AI • Mistral Large 2</option>
                <option value="codestral">Mistral AI • Codestral 2501</option>
              </optgroup>
              <optgroup label="Anthropic (External Copy & Paste)">
                <option value="claude-3-7-sonnet">Anthropic • Claude 3.7 Sonnet</option>
                <option value="claude-3-5-sonnet">Anthropic • Claude 3.5 Sonnet</option>
                <option value="claude-3-5-haiku">Anthropic • Claude 3.5 Haiku</option>
              </optgroup>
              <optgroup label="OpenAI (External Copy & Paste)">
                <option value="gpt-4o">OpenAI • GPT-4o</option>
                <option value="gpt-4o-mini">OpenAI • GPT-4o Mini</option>
                <option value="o3-mini">OpenAI • o3-mini</option>
              </optgroup>
              <optgroup label="Non-Traditional & Open Weights">
                <option value="yi-lightning">01.AI • Yi-Lightning</option>
                <option value="command-r-plus">Cohere • Command R+</option>
                <option value="llama-3-3-70b">Meta • Llama 3.3 70B</option>
                <option value="custom-external">Custom Model (User Proxy)</option>
              </optgroup>
            </select>
          </div>

          {/* Model routing status */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-400 font-mono">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase text-slate-700 dark:text-slate-400">Pricing:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                ${modelInfoB.inputPricePerMillion.toFixed(2)} in / ${modelInfoB.outputPricePerMillion.toFixed(2)} out
              </span>
            </div>

            {lastTurnAgentB && (
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-400">
                <span>{lastTurnAgentB.totalTokens} tok</span>
                <span>•</span>
                <span>{lastTurnAgentB.latencyMs}ms</span>
              </div>
            )}
          </div>

          {modelInfoB.fallbackLabel && (
            <div className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
              {modelInfoB.fallbackLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

