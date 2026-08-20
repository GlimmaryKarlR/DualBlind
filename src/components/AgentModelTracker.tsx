import React from 'react';
import { AgentConfig, ChatTurn } from '../types/benchmark';
import { parseModelBrandInfo } from '../utils/modelTracker';
import { Bot, Sparkles, AlertTriangle, ShieldCheck, Cpu, Clock, Sliders } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface AgentModelTrackerProps {
  agentA: AgentConfig;
  agentB: AgentConfig;
  lastTurnAgentA?: ChatTurn | null;
  lastTurnAgentB?: ChatTurn | null;
  onOpenConfig: () => void;
  isRunning: boolean;
}

export const AgentModelTracker: React.FC<AgentModelTrackerProps> = ({
  agentA,
  agentB,
  lastTurnAgentA,
  lastTurnAgentB,
  onOpenConfig,
  isRunning,
}) => {
  const modelInfoA = parseModelBrandInfo(agentA.model, lastTurnAgentA?.modelUsed);
  const modelInfoB = parseModelBrandInfo(agentB.model, lastTurnAgentB?.modelUsed);

  const getStatusBadge = (info: ReturnType<typeof parseModelBrandInfo>) => {
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
        <span>Live Primary</span>
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Live Model & Brand Telemetry
          </h3>
          <span className="text-[10px] text-slate-700 dark:text-slate-400">
            (Tracks active model routing & real-time failovers)
          </span>
        </div>

        <button
          onClick={onOpenConfig}
          disabled={isRunning}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer disabled:opacity-50"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Edit Matchup</span>
        </button>
      </div>

      {/* Side-by-side Agent Model Cards */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Agent Alpha Card */}
        <div
          className={`rounded-xl border p-3.5 transition-all ${
            modelInfoA.isFallback
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
                <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-400 font-mono mt-0.5">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {modelInfoA.displayName}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[10px] text-slate-700 dark:text-slate-400">
                    {agentA.temperature.toFixed(2)} temp
                  </span>
                </div>
              </div>
            </div>

            <div>{getStatusBadge(modelInfoA)}</div>
          </div>

          {/* Model routing status */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] text-slate-700 dark:border-slate-700/60 dark:text-slate-400 font-mono">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase text-slate-700 dark:text-slate-400">Runtime:</span>
              <code className="font-bold text-slate-800 dark:text-slate-200 text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {modelInfoA.modelCode}
              </code>
            </div>

            {lastTurnAgentA && (
              <div className="flex items-center gap-1.5">
                <span>{lastTurnAgentA.totalTokens} tok</span>
                <span>•</span>
                <span>{lastTurnAgentA.latencyMs}ms</span>
              </div>
            )}
          </div>

          {modelInfoA.fallbackLabel && (
            <div className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
              Notice: {modelInfoA.fallbackLabel}
            </div>
          )}
        </div>

        {/* Agent Beta Card */}
        <div
          className={`rounded-xl border p-3.5 transition-all ${
            modelInfoB.isFallback
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
                <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-400 font-mono mt-0.5">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {modelInfoB.displayName}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-[10px] text-slate-700 dark:text-slate-400">
                    {agentB.temperature.toFixed(2)} temp
                  </span>
                </div>
              </div>
            </div>

            <div>{getStatusBadge(modelInfoB)}</div>
          </div>

          {/* Model routing status */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] text-slate-700 dark:border-slate-700/60 dark:text-slate-400 font-mono">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase text-slate-700 dark:text-slate-400">Runtime:</span>
              <code className="font-bold text-slate-800 dark:text-slate-200 text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {modelInfoB.modelCode}
              </code>
            </div>

            {lastTurnAgentB && (
              <div className="flex items-center gap-1.5">
                <span>{lastTurnAgentB.totalTokens} tok</span>
                <span>•</span>
                <span>{lastTurnAgentB.latencyMs}ms</span>
              </div>
            )}
          </div>

          {modelInfoB.fallbackLabel && (
            <div className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
              Notice: {modelInfoB.fallbackLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
