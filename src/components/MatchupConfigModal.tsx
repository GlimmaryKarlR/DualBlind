import React, { useState } from 'react';
import { AgentConfig } from '../types/benchmark';
import { MODEL_PRESETS, ModelPreset } from '../utils/modelTracker';
import { Sliders, Bot, X, Check, RefreshCw, Infinity, ExternalLink, HelpCircle } from 'lucide-react';

interface MatchupConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentA: AgentConfig;
  agentB: AgentConfig;
  maxTurns: number;
  isUncapped: boolean;
  onSaveConfig: (agentA: AgentConfig, agentB: AgentConfig, maxTurns: number, isUncapped: boolean) => void;
}

export const MatchupConfigModal: React.FC<MatchupConfigModalProps> = ({
  isOpen,
  onClose,
  agentA: initialAgentA,
  agentB: initialAgentB,
  maxTurns: initialMaxTurns,
  isUncapped: initialIsUncapped,
  onSaveConfig,
}) => {
  const [agentA, setAgentA] = useState<AgentConfig>(initialAgentA);
  const [agentB, setAgentB] = useState<AgentConfig>(initialAgentB);
  const [maxTurns, setMaxTurns] = useState<number>(initialMaxTurns);
  const [isUncapped, setIsUncapped] = useState<boolean>(initialIsUncapped);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(agentA, agentB, maxTurns, isUncapped);
    onClose();
  };

  const handleResetDefaults = () => {
    setAgentA({
      id: 'agent_a',
      name: 'Agent Alpha',
      model: 'gemini-3.7-flash',
      provider: 'google',
      isManualExternal: false,
      temperature: 0.3,
      avatarColor: 'indigo',
    });
    setAgentB({
      id: 'agent_b',
      name: 'Agent Beta',
      model: 'gemini-3.7-flash',
      provider: 'google',
      isManualExternal: false,
      temperature: 0.4,
      avatarColor: 'emerald',
    });
    setMaxTurns(10);
    setIsUncapped(true);
  };

  const handleSelectPreset = (agentKey: 'agentA' | 'agentB', presetId: string) => {
    const preset = MODEL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const updater = agentKey === 'agentA' ? setAgentA : setAgentB;
    const current = agentKey === 'agentA' ? agentA : agentB;

    updater({
      ...current,
      model: preset.modelCode,
      provider: preset.provider,
      brand: preset.brand,
      isManualExternal: preset.isExternal,
      customBrand: preset.provider === 'custom' ? current.customBrand || 'Custom' : undefined,
      customModel: preset.provider === 'custom' ? current.customModel || 'Custom LLM' : undefined,
    });
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
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Agent Matchup & Provider Settings
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-400">
              Configure AI companies, model presets, or set up external copy/paste proxy workflows.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-5 text-xs">
          {/* Uncapped Mode Protocol Toggle Card */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Infinity className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Uncapped Turn Protocol (Natural Consensus)
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Allows agents to naturally negotiate to consensus; measures real compute tokens and cost to converge.
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUncapped}
                  onChange={(e) => setIsUncapped(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Agent Alpha Config */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                <Bot className="h-4 w-4" />
                <span>Agent Alpha (01) Configuration</span>
              </div>

              {agentA.isManualExternal && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                  External Copy/Paste Mode
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agent Persona Name
                </label>
                <input
                  type="text"
                  value={agentA.name}
                  onChange={(e) => setAgentA({ ...agentA, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company / AI Model Preset
                </label>
                <select
                  value={
                    MODEL_PRESETS.find((p) => p.modelCode === agentA.model || p.id === agentA.model)?.id ||
                    (agentA.isManualExternal ? 'custom-external' : 'gemini-3.7-flash')
                  }
                  onChange={(e) => handleSelectPreset('agentA', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 font-semibold"
                >
                  <optgroup label="Google (Automated API)">
                    <option value="gemini-3.7-flash">Google • Gemini 3.7 Flash ($0.15 / $0.60)</option>
                    <option value="gemini-2.5-flash">Google • Gemini 2.5 Flash ($0.15 / $0.60)</option>
                    <option value="gemini-2.5-pro">Google • Gemini 2.5 Pro ($1.25 / $5.00)</option>
                    <option value="gemini-3.1-flash-lite">Google • Gemini 3.1 Flash Lite ($0.075 / $0.30)</option>
                  </optgroup>
                  <optgroup label="Microsoft (External / Copilot / Azure)">
                    <option value="phi-4">Microsoft • Phi-4 14B ($0.10 / $0.40)</option>
                    <option value="phi-3-5-moe">Microsoft • Phi-3.5 MoE ($0.15 / $0.60)</option>
                    <option value="phi-3-5-mini">Microsoft • Phi-3.5 Mini ($0.05 / $0.15)</option>
                  </optgroup>
                  <optgroup label="Amazon (External / AWS Bedrock / Nova)">
                    <option value="amazon-nova-pro">Amazon • Nova Pro ($0.80 / $3.20)</option>
                    <option value="amazon-nova-lite">Amazon • Nova Lite ($0.06 / $0.24)</option>
                    <option value="amazon-nova-micro">Amazon • Nova Micro ($0.035 / $0.14)</option>
                  </optgroup>
                  <optgroup label="Moonshot AI (External / Kimi)">
                    <option value="kimi-k1-5">Moonshot • Kimi k1.5 ($1.00 / $4.00)</option>
                    <option value="kimi-chat-128k">Moonshot • Kimi Chat 128k ($0.80 / $3.20)</option>
                  </optgroup>
                  <optgroup label="DeepSeek (External Copy & Paste)">
                    <option value="deepseek-r1">DeepSeek • DeepSeek R1 ($0.55 / $2.19)</option>
                    <option value="deepseek-v3">DeepSeek • DeepSeek V3 ($0.14 / $0.28)</option>
                    <option value="deepseek-coder-v2">DeepSeek • DeepSeek Coder V2 ($0.14 / $0.28)</option>
                  </optgroup>
                  <optgroup label="Alibaba (External / Qwen)">
                    <option value="qwen-2-5-max">Alibaba • Qwen 2.5 Max ($1.60 / $6.40)</option>
                    <option value="qwen-2-5-72b">Alibaba • Qwen 2.5 72B Instruct ($0.35 / $0.70)</option>
                    <option value="qwen-2-5-coder">Alibaba • Qwen 2.5 Coder 32B ($0.20 / $0.40)</option>
                  </optgroup>
                  <optgroup label="xAI (External Copy & Paste / Grok)">
                    <option value="grok-3">xAI • Grok 3 ($3.00 / $15.00)</option>
                    <option value="grok-3-mini">xAI • Grok 3 Mini ($0.30 / $1.20)</option>
                    <option value="grok-2">xAI • Grok 2 ($2.00 / $10.00)</option>
                  </optgroup>
                  <optgroup label="Mistral AI (External Copy & Paste)">
                    <option value="mistral-large-2">Mistral AI • Mistral Large 2 ($2.00 / $6.00)</option>
                    <option value="codestral">Mistral AI • Codestral 2501 ($0.30 / $0.90)</option>
                  </optgroup>
                  <optgroup label="Anthropic (External Copy & Paste)">
                    <option value="claude-3-7-sonnet">Anthropic • Claude 3.7 Sonnet ($3.00 / $15.00)</option>
                    <option value="claude-3-5-sonnet">Anthropic • Claude 3.5 Sonnet ($3.00 / $15.00)</option>
                    <option value="claude-3-5-haiku">Anthropic • Claude 3.5 Haiku ($0.80 / $4.00)</option>
                  </optgroup>
                  <optgroup label="OpenAI (External Copy & Paste)">
                    <option value="gpt-4o">OpenAI • GPT-4o ($2.50 / $10.00)</option>
                    <option value="gpt-4o-mini">OpenAI • GPT-4o Mini ($0.15 / $0.60)</option>
                    <option value="o3-mini">OpenAI • o3-mini ($1.10 / $4.40)</option>
                  </optgroup>
                  <optgroup label="Non-Traditional & Open Weights">
                    <option value="yi-lightning">01.AI • Yi-Lightning ($0.14 / $0.14)</option>
                    <option value="command-r-plus">Cohere • Command R+ ($2.50 / $10.00)</option>
                    <option value="llama-3-3-70b">Meta • Llama 3.3 70B ($0.50 / $0.80)</option>
                    <option value="custom-external">Custom / Other Model (User Defined)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Custom Brand / Model Fields if Custom is selected */}
            {(agentA.provider === 'custom' || agentA.model === 'custom-external-model') && (
              <div className="mt-3 grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Company/Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Moonshot, Mistral, 01.AI"
                    value={agentA.customBrand || ''}
                    onChange={(e) => setAgentA({ ...agentA, customBrand: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Model Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Kimi k1.5, Codestral"
                    value={agentA.customModel || ''}
                    onChange={(e) => setAgentA({ ...agentA, customModel: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Manual External Toggle */}
            <div className="mt-3 flex items-center justify-between border-t border-indigo-100/80 pt-2.5 dark:border-indigo-900/40">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Workflow Mode
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-400">
                  {agentA.isManualExternal
                    ? 'Copy prompt to Kimi/DeepSeek/Claude/etc. window & paste response'
                    : 'Automated direct server-side API inference'}
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={agentA.isManualExternal || false}
                  onChange={(e) =>
                    setAgentA({ ...agentA, isManualExternal: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Agent Beta Config */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <Bot className="h-4 w-4" />
                <span>Agent Beta (02) Configuration</span>
              </div>

              {agentB.isManualExternal && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                  External Copy/Paste Mode
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agent Persona Name
                </label>
                <input
                  type="text"
                  value={agentB.name}
                  onChange={(e) => setAgentB({ ...agentB, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company / AI Model Preset
                </label>
                <select
                  value={
                    MODEL_PRESETS.find((p) => p.modelCode === agentB.model || p.id === agentB.model)?.id ||
                    (agentB.isManualExternal ? 'custom-external' : 'gemini-3.7-flash')
                  }
                  onChange={(e) => handleSelectPreset('agentB', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 font-semibold"
                >
                  <optgroup label="Google (Automated API)">
                    <option value="gemini-3.7-flash">Google • Gemini 3.7 Flash ($0.15 / $0.60)</option>
                    <option value="gemini-2.5-flash">Google • Gemini 2.5 Flash ($0.15 / $0.60)</option>
                    <option value="gemini-2.5-pro">Google • Gemini 2.5 Pro ($1.25 / $5.00)</option>
                    <option value="gemini-3.1-flash-lite">Google • Gemini 3.1 Flash Lite ($0.075 / $0.30)</option>
                  </optgroup>
                  <optgroup label="Microsoft (External / Copilot / Azure)">
                    <option value="phi-4">Microsoft • Phi-4 14B ($0.10 / $0.40)</option>
                    <option value="phi-3-5-moe">Microsoft • Phi-3.5 MoE ($0.15 / $0.60)</option>
                    <option value="phi-3-5-mini">Microsoft • Phi-3.5 Mini ($0.05 / $0.15)</option>
                  </optgroup>
                  <optgroup label="Amazon (External / AWS Bedrock / Nova)">
                    <option value="amazon-nova-pro">Amazon • Nova Pro ($0.80 / $3.20)</option>
                    <option value="amazon-nova-lite">Amazon • Nova Lite ($0.06 / $0.24)</option>
                    <option value="amazon-nova-micro">Amazon • Nova Micro ($0.035 / $0.14)</option>
                  </optgroup>
                  <optgroup label="Moonshot AI (External / Kimi)">
                    <option value="kimi-k1-5">Moonshot • Kimi k1.5 ($1.00 / $4.00)</option>
                    <option value="kimi-chat-128k">Moonshot • Kimi Chat 128k ($0.80 / $3.20)</option>
                  </optgroup>
                  <optgroup label="DeepSeek (External Copy & Paste)">
                    <option value="deepseek-r1">DeepSeek • DeepSeek R1 ($0.55 / $2.19)</option>
                    <option value="deepseek-v3">DeepSeek • DeepSeek V3 ($0.14 / $0.28)</option>
                    <option value="deepseek-coder-v2">DeepSeek • DeepSeek Coder V2 ($0.14 / $0.28)</option>
                  </optgroup>
                  <optgroup label="Alibaba (External / Qwen)">
                    <option value="qwen-2-5-max">Alibaba • Qwen 2.5 Max ($1.60 / $6.40)</option>
                    <option value="qwen-2-5-72b">Alibaba • Qwen 2.5 72B Instruct ($0.35 / $0.70)</option>
                    <option value="qwen-2-5-coder">Alibaba • Qwen 2.5 Coder 32B ($0.20 / $0.40)</option>
                  </optgroup>
                  <optgroup label="xAI (External Copy & Paste / Grok)">
                    <option value="grok-3">xAI • Grok 3 ($3.00 / $15.00)</option>
                    <option value="grok-3-mini">xAI • Grok 3 Mini ($0.30 / $1.20)</option>
                    <option value="grok-2">xAI • Grok 2 ($2.00 / $10.00)</option>
                  </optgroup>
                  <optgroup label="Mistral AI (External Copy & Paste)">
                    <option value="mistral-large-2">Mistral AI • Mistral Large 2 ($2.00 / $6.00)</option>
                    <option value="codestral">Mistral AI • Codestral 2501 ($0.30 / $0.90)</option>
                  </optgroup>
                  <optgroup label="Anthropic (External Copy & Paste)">
                    <option value="claude-3-7-sonnet">Anthropic • Claude 3.7 Sonnet ($3.00 / $15.00)</option>
                    <option value="claude-3-5-sonnet">Anthropic • Claude 3.5 Sonnet ($3.00 / $15.00)</option>
                    <option value="claude-3-5-haiku">Anthropic • Claude 3.5 Haiku ($0.80 / $4.00)</option>
                  </optgroup>
                  <optgroup label="OpenAI (External Copy & Paste)">
                    <option value="gpt-4o">OpenAI • GPT-4o ($2.50 / $10.00)</option>
                    <option value="gpt-4o-mini">OpenAI • GPT-4o Mini ($0.15 / $0.60)</option>
                    <option value="o3-mini">OpenAI • o3-mini ($1.10 / $4.40)</option>
                  </optgroup>
                  <optgroup label="Non-Traditional & Open Weights">
                    <option value="yi-lightning">01.AI • Yi-Lightning ($0.14 / $0.14)</option>
                    <option value="command-r-plus">Cohere • Command R+ ($2.50 / $10.00)</option>
                    <option value="llama-3-3-70b">Meta • Llama 3.3 70B ($0.50 / $0.80)</option>
                    <option value="custom-external">Custom / Other Model (User Defined)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Custom Brand / Model Fields if Custom is selected */}
            {(agentB.provider === 'custom' || agentB.model === 'custom-external-model') && (
              <div className="mt-3 grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Company/Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., xAI, Mistral, Ollama"
                    value={agentB.customBrand || ''}
                    onChange={(e) => setAgentB({ ...agentB, customBrand: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Model Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grok 3, Mistral Large"
                    value={agentB.customModel || ''}
                    onChange={(e) => setAgentB({ ...agentB, customModel: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Manual External Toggle */}
            <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 dark:border-emerald-900/40">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Workflow Mode
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-400">
                  {agentB.isManualExternal
                    ? 'Copy prompt to Anthropic/OpenAI/etc. window & paste response'
                    : 'Automated direct server-side API inference'}
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={agentB.isManualExternal || false}
                  onChange={(e) =>
                    setAgentB({ ...agentB, isManualExternal: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Turn Cap Protocol (when not in uncapped mode) */}
          {!isUncapped && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Turn Limit Cap</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {maxTurns} Turns ({maxTurns / 2} per bot)
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="2"
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                className="w-full cursor-pointer accent-indigo-600"
              />
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-indigo-500 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


