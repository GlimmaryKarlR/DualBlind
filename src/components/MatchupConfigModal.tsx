import React, { useState, useEffect } from 'react';
import { AgentConfig, ProviderApiKeys } from '../types/benchmark';
import { MODEL_PRESETS } from '../utils/modelTracker';
import {
  PROVIDER_METAS,
  getStoredApiKeys,
  saveStoredApiKeys,
  clearAllApiKeys,
  countConfiguredKeys,
} from '../utils/tokenStorage';
import {
  Sliders,
  Bot,
  X,
  Check,
  RefreshCw,
  Infinity,
  ExternalLink,
  Key,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck,
  Search,
  Server,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

interface MatchupConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentA: AgentConfig;
  agentB: AgentConfig;
  maxTurns: number;
  isUncapped: boolean;
  initialTab?: 'matchup' | 'tokens';
  apiKeys?: ProviderApiKeys;
  onSaveConfig: (
    agentA: AgentConfig,
    agentB: AgentConfig,
    maxTurns: number,
    isUncapped: boolean,
    updatedApiKeys?: ProviderApiKeys
  ) => void;
}

export const MatchupConfigModal: React.FC<MatchupConfigModalProps> = ({
  isOpen,
  onClose,
  agentA: initialAgentA,
  agentB: initialAgentB,
  maxTurns: initialMaxTurns,
  isUncapped: initialIsUncapped,
  initialTab = 'matchup',
  apiKeys: initialApiKeys,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'matchup' | 'tokens'>(initialTab);
  const [agentA, setAgentA] = useState<AgentConfig>(initialAgentA);
  const [agentB, setAgentB] = useState<AgentConfig>(initialAgentB);
  const [maxTurns, setMaxTurns] = useState<number>(initialMaxTurns);
  const [isUncapped, setIsUncapped] = useState<boolean>(initialIsUncapped);

  // API Tokens state
  const [apiKeys, setApiKeys] = useState<ProviderApiKeys>(initialApiKeys || getStoredApiKeys());
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [tokenSearchQuery, setTokenSearchQuery] = useState<string>('');
  const [tokenCategoryFilter, setTokenCategoryFilter] = useState<'all' | 'tier1' | 'regional' | 'universal'>('all');
  const [savedBanner, setSavedBanner] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setAgentA(initialAgentA);
      setAgentB(initialAgentB);
      setMaxTurns(initialMaxTurns);
      setIsUncapped(initialIsUncapped);
      setApiKeys(initialApiKeys || getStoredApiKeys());
      setActiveTab(initialTab);
      setSavedBanner(false);
    }
  }, [isOpen, initialAgentA, initialAgentB, initialMaxTurns, initialIsUncapped, initialTab, initialApiKeys]);

  if (!isOpen) return null;

  const handleKeyChange = (providerKey: keyof ProviderApiKeys, value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [providerKey]: value,
    }));
  };

  const handleCustomEndpointChange = (field: 'baseUrl' | 'apiKey' | 'modelName', value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      customEndpoint: {
        baseUrl: prev.customEndpoint?.baseUrl || '',
        apiKey: prev.customEndpoint?.apiKey || '',
        modelName: prev.customEndpoint?.modelName || '',
        [field]: value,
      },
    }));
  };

  const toggleKeyVisibility = (providerKey: string) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [providerKey]: !prev[providerKey],
    }));
  };

  const handleClearAllTokens = () => {
    if (window.confirm('Are you sure you want to clear all stored API keys and tokens from local storage?')) {
      clearAllApiKeys();
      setApiKeys({});
    }
  };

  const handleSave = () => {
    saveStoredApiKeys(apiKeys);
    onSaveConfig(agentA, agentB, maxTurns, isUncapped, apiKeys);
    setSavedBanner(true);
    setTimeout(() => {
      onClose();
    }, 200);
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

  const configuredCount = countConfiguredKeys(apiKeys);

  const filteredProviders = PROVIDER_METAS.filter((p) => {
    const matchesCategory = tokenCategoryFilter === 'all' || p.category === tokenCategoryFilter;
    const matchesSearch =
      tokenSearchQuery === '' ||
      p.name.toLowerCase().includes(tokenSearchQuery.toLowerCase()) ||
      p.brandName.toLowerCase().includes(tokenSearchQuery.toLowerCase()) ||
      p.recommendedModels.some((m) => m.toLowerCase().includes(tokenSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Advanced Benchmark Settings
              </h2>
              <p className="text-xs text-slate-700 dark:text-slate-400">
                Configure Agent Matchups, Turn Protocols, or Connect Custom API Keys & Tokens.
              </p>
            </div>
          </div>
        </div>

        {/* Top Tab Switcher */}
        <div className="mt-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('matchup')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matchup'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>Matchup & Personas</span>
            </button>

            <button
              onClick={() => setActiveTab('tokens')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tokens'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Key className="h-4 w-4" />
              <span>APIs & Tokens</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                  configuredCount > 0
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {configuredCount} {configuredCount === 1 ? 'Key' : 'Keys'}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Local Encrypted Storage</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-5 text-xs">
          {/* TAB 1: MATCHUP & PERSONAS */}
          {activeTab === 'matchup' && (
            <div className="space-y-5">
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
                      <span className="text-[11px] text-slate-700 dark:text-slate-400">
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
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Model Preset / AI Engine
                    </label>
                    <select
                      value={agentA.model}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom-external') {
                          setAgentA({
                            ...agentA,
                            model: 'custom-external-model',
                            provider: 'custom',
                            isManualExternal: true,
                            customBrand: 'Custom',
                            customModel: 'Custom Model',
                          });
                        } else {
                          handleSelectPreset('agentA', val);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <optgroup label="Google (Gemini Native & Automated)">
                        <option value="gemini-3.7-flash">Google • Gemini 3.7 Flash ($0.15 / $0.60)</option>
                        <option value="gemini-3.1-pro-preview">Google • Gemini 3.1 Pro Preview ($1.25 / $5.00)</option>
                        <option value="gemini-3.1-flash-lite">Google • Gemini 3.1 Flash Lite ($0.075 / $0.30)</option>
                        <option value="gemini-flash-latest">Google • Gemini Flash Latest ($0.15 / $0.60)</option>
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
                      <optgroup label="DeepSeek Suite (External / R1 & V3)">
                        <option value="deepseek-r1">DeepSeek • R1 Reasoning ($0.55 / $2.19)</option>
                        <option value="deepseek-v3">DeepSeek • V3 General ($0.14 / $0.28)</option>
                        <option value="deepseek-coder-v2">DeepSeek • Coder V2 ($0.14 / $0.28)</option>
                      </optgroup>
                      <optgroup label="Alibaba (External / Qwen)">
                        <option value="qwen-2-5-max">Qwen • 2.5 Max ($1.60 / $6.40)</option>
                        <option value="qwen-2-5-72b">Qwen • 2.5 72B Instruct ($0.35 / $0.70)</option>
                        <option value="qwen-2-5-coder">Qwen • 2.5 Coder 32B ($0.20 / $0.40)</option>
                      </optgroup>
                      <optgroup label="Mistral AI (External / Sovereign)">
                        <option value="mistral-large-2">Mistral • Mistral Large 2 ($2.00 / $6.00)</option>
                        <option value="codestral">Mistral • Codestral 2501 ($0.30 / $0.90)</option>
                      </optgroup>
                      <optgroup label="xAI (External / Grok)">
                        <option value="grok-3">xAI • Grok 3 Flagship ($3.00 / $15.00)</option>
                        <option value="grok-3-mini">xAI • Grok 3 Mini ($0.30 / $1.50)</option>
                        <option value="grok-2">xAI • Grok 2 ($2.00 / $10.00)</option>
                      </optgroup>
                      <optgroup label="Anthropic (External / Claude)">
                        <option value="claude-3-7-sonnet">Anthropic • Claude 3.7 Sonnet ($3.00 / $15.00)</option>
                        <option value="claude-3-5-sonnet">Anthropic • Claude 3.5 Sonnet ($3.00 / $15.00)</option>
                        <option value="claude-3-5-haiku">Anthropic • Claude 3.5 Haiku ($0.80 / $4.00)</option>
                      </optgroup>
                      <optgroup label="OpenAI (External / ChatGPT)">
                        <option value="gpt-4o">OpenAI • GPT-4o ($2.50 / $10.00)</option>
                        <option value="gpt-4o-mini">OpenAI • GPT-4o Mini ($0.15 / $0.60)</option>
                        <option value="o3-mini">OpenAI • o3-mini Reasoning ($1.10 / $4.40)</option>
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

                {/* Workflow Mode Switch */}
                <div className="mt-3 flex items-center justify-between border-t border-indigo-100/80 pt-2.5 dark:border-indigo-900/40">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Workflow Mode
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-400">
                      {agentA.isManualExternal
                        ? 'Manual Copy/Paste proxy window'
                        : 'Automated direct API inference (uses connected key or Gemini)'}
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
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Model Preset / AI Engine
                    </label>
                    <select
                      value={agentB.model}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom-external') {
                          setAgentB({
                            ...agentB,
                            model: 'custom-external-model',
                            provider: 'custom',
                            isManualExternal: true,
                            customBrand: 'Custom',
                            customModel: 'Custom Model',
                          });
                        } else {
                          handleSelectPreset('agentB', val);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <optgroup label="Google (Gemini Native & Automated)">
                        <option value="gemini-3.7-flash">Google • Gemini 3.7 Flash ($0.15 / $0.60)</option>
                        <option value="gemini-3.1-pro-preview">Google • Gemini 3.1 Pro Preview ($1.25 / $5.00)</option>
                        <option value="gemini-3.1-flash-lite">Google • Gemini 3.1 Flash Lite ($0.075 / $0.30)</option>
                        <option value="gemini-flash-latest">Google • Gemini Flash Latest ($0.15 / $0.60)</option>
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
                      <optgroup label="DeepSeek Suite (External / R1 & V3)">
                        <option value="deepseek-r1">DeepSeek • R1 Reasoning ($0.55 / $2.19)</option>
                        <option value="deepseek-v3">DeepSeek • V3 General ($0.14 / $0.28)</option>
                        <option value="deepseek-coder-v2">DeepSeek • Coder V2 ($0.14 / $0.28)</option>
                      </optgroup>
                      <optgroup label="Alibaba (External / Qwen)">
                        <option value="qwen-2-5-max">Qwen • 2.5 Max ($1.60 / $6.40)</option>
                        <option value="qwen-2-5-72b">Qwen • 2.5 72B Instruct ($0.35 / $0.70)</option>
                        <option value="qwen-2-5-coder">Qwen • 2.5 Coder 32B ($0.20 / $0.40)</option>
                      </optgroup>
                      <optgroup label="Mistral AI (External / Sovereign)">
                        <option value="mistral-large-2">Mistral • Mistral Large 2 ($2.00 / $6.00)</option>
                        <option value="codestral">Mistral • Codestral 2501 ($0.30 / $0.90)</option>
                      </optgroup>
                      <optgroup label="xAI (External / Grok)">
                        <option value="grok-3">xAI • Grok 3 Flagship ($3.00 / $15.00)</option>
                        <option value="grok-3-mini">xAI • Grok 3 Mini ($0.30 / $1.50)</option>
                        <option value="grok-2">xAI • Grok 2 ($2.00 / $10.00)</option>
                      </optgroup>
                      <optgroup label="Anthropic (External / Claude)">
                        <option value="claude-3-7-sonnet">Anthropic • Claude 3.7 Sonnet ($3.00 / $15.00)</option>
                        <option value="claude-3-5-sonnet">Anthropic • Claude 3.5 Sonnet ($3.00 / $15.00)</option>
                        <option value="claude-3-5-haiku">Anthropic • Claude 3.5 Haiku ($0.80 / $4.00)</option>
                      </optgroup>
                      <optgroup label="OpenAI (External / ChatGPT)">
                        <option value="gpt-4o">OpenAI • GPT-4o ($2.50 / $10.00)</option>
                        <option value="gpt-4o-mini">OpenAI • GPT-4o Mini ($0.15 / $0.60)</option>
                        <option value="o3-mini">OpenAI • o3-mini Reasoning ($1.10 / $4.40)</option>
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

                {/* Workflow Mode Switch */}
                <div className="mt-3 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 dark:border-emerald-900/40">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Workflow Mode
                    </span>
                    <span className="text-[11px] text-slate-700 dark:text-slate-400">
                      {agentB.isManualExternal
                        ? 'Manual Copy/Paste proxy window'
                        : 'Automated direct API inference (uses connected key or Gemini)'}
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

              {/* Turn Limit Slider when capped */}
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
            </div>
          )}

          {/* TAB 2: APIS & TOKENS */}
          {activeTab === 'tokens' && (
            <div className="space-y-4">
              {/* Token Hub Intro Banner */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <Key className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                      Universal API Keys & Provider Tokens
                    </h3>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      Add your API keys to run live automated benchmark inference directly on any AI provider. Keys are saved strictly in your browser's private local storage.
                    </p>
                  </div>
                </div>
              </div>

              {/* Search & Category Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search provider or model..."
                    value={tokenSearchQuery}
                    onChange={(e) => setTokenSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                  <button
                    onClick={() => setTokenCategoryFilter('all')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      tokenCategoryFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    All ({PROVIDER_METAS.length})
                  </button>
                  <button
                    onClick={() => setTokenCategoryFilter('tier1')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      tokenCategoryFilter === 'tier1'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Frontier Tier-1
                  </button>
                  <button
                    onClick={() => setTokenCategoryFilter('regional')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      tokenCategoryFilter === 'regional'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Regional & Open
                  </button>
                  <button
                    onClick={() => setTokenCategoryFilter('universal')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-all ${
                      tokenCategoryFilter === 'universal'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Universal Hubs
                  </button>
                </div>
              </div>

              {/* Provider List Grid */}
              <div className="space-y-3">
                {filteredProviders.map((provider) => {
                  const pKey = provider.id as keyof ProviderApiKeys;
                  const currentVal = (apiKeys[pKey] as string) || '';
                  const isConfigured = Boolean(currentVal && currentVal.trim().length > 0);
                  const isVisible = Boolean(visibleKeys[provider.id]);

                  return (
                    <div
                      key={provider.id}
                      className={`rounded-2xl border p-3.5 transition-all ${
                        isConfigured
                          ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {provider.name}
                          </span>
                          {isConfigured ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Connected</span>
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              Not set
                            </span>
                          )}
                        </div>

                        <a
                          href={provider.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                        >
                          <span>Get key at {provider.portalName}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-slate-400">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <input
                          type={isVisible ? 'text' : 'password'}
                          placeholder={provider.placeholder}
                          value={currentVal}
                          onChange={(e) => handleKeyChange(pKey, e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-16 font-mono text-xs text-slate-900 focus:bg-white focus:outline-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility(provider.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            title={isVisible ? 'Hide token' : 'Show token'}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          {currentVal && (
                            <button
                              type="button"
                              onClick={() => handleKeyChange(pKey, '')}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 cursor-pointer"
                              title="Clear key"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-700 dark:text-slate-400">
                        <span>{provider.helpText}</span>
                        <span className="font-mono text-slate-700 dark:text-slate-400">
                          Models: {provider.recommendedModels.join(', ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Endpoint / Self-Hosted LLM (Ollama, vLLM, LMStudio, Together) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2">
                  <Server className="h-4 w-4 text-indigo-600" />
                  <span>Custom OpenAI-Compatible Endpoint (Ollama / vLLM / Local)</span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-400 mb-3">
                  Connect your local runner or custom gateway. Any standard OpenAI-compatible `/chat/completions` server is supported.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Base API URL
                    </label>
                    <input
                      type="text"
                      placeholder="http://localhost:11434/v1"
                      value={apiKeys.customEndpoint?.baseUrl || ''}
                      onChange={(e) => handleCustomEndpointChange('baseUrl', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., llama3.3:70b or qwen2.5"
                      value={apiKeys.customEndpoint?.modelName || ''}
                      onChange={(e) => handleCustomEndpointChange('modelName', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bearer Token / Key
                    </label>
                    <input
                      type="password"
                      placeholder="Optional or 'ollama'"
                      value={apiKeys.customEndpoint?.apiKey || ''}
                      onChange={(e) => handleCustomEndpointChange('apiKey', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 shrink-0">
          <div>
            {activeTab === 'tokens' ? (
              <button
                type="button"
                onClick={handleClearAllTokens}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Keys</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 text-slate-700 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </button>
            )}
          </div>

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
              <span>{savedBanner ? 'Saved!' : 'Save & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
