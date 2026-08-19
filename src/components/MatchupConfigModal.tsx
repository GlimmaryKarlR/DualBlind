import React, { useState } from 'react';
import { AgentConfig } from '../types/benchmark';
import { Sliders, Bot, X, Check, RefreshCw, Infinity, Flame } from 'lucide-react';

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
      temperature: 0.3,
      avatarColor: 'indigo',
    });
    setAgentB({
      id: 'agent_b',
      name: 'Agent Beta',
      model: 'gemini-3.7-flash',
      temperature: 0.4,
      avatarColor: 'emerald',
    });
    setMaxTurns(10);
    setIsUncapped(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
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
              Agent Matchup & Protocol Settings
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-400">
              Configure parameters, model aliases, and consensus convergence protocol.
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
                    Uncapped Turn Protocol (No Hard Cap)
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Allows agents to naturally negotiate to consensus; measures real token cost to converge.
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

            {isUncapped ? (
              <div className="mt-3 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                ⚡ <strong>Uncapped Active:</strong> No artificial limit stops the agents. If the team enters an endless token-burning loop without converging, it will be scored as a <strong>Non-Functional Infinite Loop</strong> failure.
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                Capped mode enforced at <strong>{maxTurns} turns</strong> max.
              </div>
            )}
          </div>

          {/* Agent Alpha Config */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 mb-3">
              <Bot className="h-4 w-4" />
              <span>Agent Alpha Configuration</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agent Name / Persona
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
                  Model Engine
                </label>
                <select
                  value={agentA.model}
                  onChange={(e) => setAgentA({ ...agentA, model: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Default)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Sampling Temperature</span>
                <span className="font-mono">{agentA.temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={agentA.temperature}
                onChange={(e) => setAgentA({ ...agentA, temperature: parseFloat(e.target.value) })}
                className="w-full cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Agent Beta Config */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 mb-3">
              <Bot className="h-4 w-4" />
              <span>Agent Beta Configuration</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agent Name / Persona
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
                  Model Engine
                </label>
                <select
                  value={agentB.model}
                  onChange={(e) => setAgentB({ ...agentB, model: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Default)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Sampling Temperature</span>
                <span className="font-mono">{agentB.temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={agentB.temperature}
                onChange={(e) => setAgentB({ ...agentB, temperature: parseFloat(e.target.value) })}
                className="w-full cursor-pointer accent-emerald-600"
              />
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

