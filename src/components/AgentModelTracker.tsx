import React from 'react';
import { AgentConfig, ChatTurn, ProviderApiKeys } from '../types/benchmark';
import { parseModelBrandInfo, MODEL_PRESETS, ModelPreset } from '../utils/modelTracker';
import { CatalogModel } from '../utils/modelCatalog';
import { hasConfiguredKeyForProvider } from '../utils/tokenStorage';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { Bot, Sparkles, AlertTriangle, ShieldCheck, Cpu, Clock, Sliders, ExternalLink, ChevronDown, Key, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface AgentModelTrackerProps {
  agentA: AgentConfig;
  agentB: AgentConfig;
  onChangeAgentA?: (config: AgentConfig) => void;
  onChangeAgentB?: (config: AgentConfig) => void;
  lastTurnAgentA?: ChatTurn | null;
  lastTurnAgentB?: ChatTurn | null;
  onOpenConfig: () => void;
  onOpenTokens?: () => void;
  apiKeys?: ProviderApiKeys;
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
  onOpenTokens,
  apiKeys = {},
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

  const hasKeyA = hasConfiguredKeyForProvider(agentA.provider, apiKeys);
  const hasKeyB = hasConfiguredKeyForProvider(agentB.provider, apiKeys);

  const handleSelectModel = (agentKey: 'agentA' | 'agentB', catalogModel: CatalogModel) => {
    if (agentKey === 'agentA' && onChangeAgentA) {
      onChangeAgentA({
        ...agentA,
        model: catalogModel.modelCode || catalogModel.id,
        provider: catalogModel.provider,
        brand: catalogModel.brand,
        isManualExternal: catalogModel.isExternal,
        customBrand: catalogModel.provider === 'custom' ? catalogModel.brand : undefined,
        customModel: catalogModel.provider === 'custom' ? catalogModel.name : undefined,
      });
    } else if (agentKey === 'agentB' && onChangeAgentB) {
      onChangeAgentB({
        ...agentB,
        model: catalogModel.modelCode || catalogModel.id,
        provider: catalogModel.provider,
        brand: catalogModel.brand,
        isManualExternal: catalogModel.isExternal,
        customBrand: catalogModel.provider === 'custom' ? catalogModel.brand : undefined,
        customModel: catalogModel.provider === 'custom' ? catalogModel.name : undefined,
      });
    }
  };

  const getStatusBadge = (info: ReturnType<typeof parseModelBrandInfo>, hasKey: boolean) => {
    if (hasKey) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>Direct Key Active</span>
        </span>
      );
    }
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
            (Google, Microsoft, Amazon, xAI, Claude, OpenAI, DeepSeek, Kimi, Qwen, Mistral)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTokens && (
            <button
              onClick={onOpenTokens}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
            >
              <Key className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
              <span>APIs & Tokens</span>
            </button>
          )}

          <button
            onClick={onOpenConfig}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer disabled:opacity-50"
          >
            <Sliders className="h-3 w-3" />
            <span>Advanced Setup</span>
          </button>
        </div>
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

            <div>{getStatusBadge(modelInfoA, hasKeyA)}</div>
          </div>

          {/* Direct Model Selector with Expandable Brand Accordions */}
          <div className="mt-2.5">
            <ModelSelectorDropdown
              id="agent-a-model-selector"
              selectedModel={agentA.model}
              selectedBrand={agentA.brand}
              onSelectModel={(m) => handleSelectModel('agentA', m)}
              disabled={isRunning}
              accentColor="indigo"
            />
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

            <div>{getStatusBadge(modelInfoB, hasKeyB)}</div>
          </div>

          {/* Direct Model Selector with Expandable Brand Accordions */}
          <div className="mt-2.5">
            <ModelSelectorDropdown
              id="agent-b-model-selector"
              selectedModel={agentB.model}
              selectedBrand={agentB.brand}
              onSelectModel={(m) => handleSelectModel('agentB', m)}
              disabled={isRunning}
              accentColor="emerald"
            />
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

