import React, { useRef, useEffect } from 'react';
import { ChatTurn, AgentConfig, ConsensusStatus } from '../types/benchmark';
import { Clock, Cpu, CheckCircle2, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { parseModelBrandInfo } from '../utils/modelTracker';

interface ChatTranscriptProps {
  turns: ChatTurn[];
  agentA: AgentConfig;
  agentB: AgentConfig;
  activeAgentTurn: 'agent_a' | 'agent_b' | null;
  isRunning: boolean;
  consensusStatus: ConsensusStatus;
}

export const ChatTranscript: React.FC<ChatTranscriptProps> = ({
  turns,
  agentA,
  agentB,
  activeAgentTurn,
  isRunning,
  consensusStatus,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, activeAgentTurn]);

  // Helper to format text with highlighted FINAL ANSWER: [...] tags
  const renderTurnContent = (content: string, isAgentA: boolean) => {
    const finalAnswerRegex = /((?:\*{0,3})(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER|FINAL\s+CONSENSUS)(?:\*{0,3})\s*:\s*\[[\s\S]*?\]|(?:\*{0,3})(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER|FINAL\s+CONSENSUS)(?:\*{0,3})\s*:\s*[^\n\r]+)/gi;
    const parts = content.split(finalAnswerRegex);

    return parts.map((part, index) => {
      if (part && part.match(finalAnswerRegex)) {
        return (
          <span
            key={index}
            className={`my-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-bold shadow-2xs ${
              isAgentA
                ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200'
                : 'border border-amber-300/40 bg-amber-400/20 text-amber-100 dark:border-amber-400/30 dark:bg-amber-400/20'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-[560px] flex-col rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      {/* Transcript Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Dual-Blind Multi-Agent Dialogue
          </span>
        </div>

        {/* Dual Blind Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>DUAL-BLIND PROTOCOL</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            ({turns.length} msg)
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
        {turns.length === 0 && !activeAgentTurn && (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-3 border border-indigo-100 dark:border-indigo-900">
              <span className="font-mono text-base font-bold">01/02</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
              Dialogue Arena Initialized
            </p>
            <p className="mt-1 text-xs max-w-sm text-slate-500">
              Click <strong className="text-slate-700 dark:text-slate-300">"Run Benchmark"</strong> or <strong className="text-slate-700 dark:text-slate-300">"Step 1 Turn"</strong> to initiate the blind reasoning interaction between {agentA.name} and {agentB.name}.
            </p>
          </div>
        )}

        {turns.map((turn) => {
          const isAgentA = turn.agentId === 'agent_a';

          return (
            <div
              key={turn.id}
              className={`flex gap-3 ${isAgentA ? 'flex-row items-start' : 'flex-row-reverse items-start'}`}
            >
              {/* Sleek Agent Avatar Badge */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold shadow-2xs border ${
                  isAgentA
                    ? 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                }`}
                title={turn.agentName}
              >
                {isAgentA ? '01' : '02'}
              </div>

              {/* Message Block */}
              <div className={`flex flex-col max-w-[85%] ${isAgentA ? 'items-start' : 'items-end'}`}>
                {/* Agent Header & Telemetry */}
                <div
                  className={`flex flex-wrap items-center gap-1.5 mb-1 px-1 text-[10px] ${
                    isAgentA ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <span
                    className={`font-bold uppercase tracking-wider ${
                      isAgentA
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {isAgentA ? `AGENT 01 (${turn.agentName})` : `AGENT 02 (${turn.agentName})`}
                  </span>

                  {turn.modelUsed && (
                    <span className="rounded bg-slate-200/70 px-1 py-0.2 text-[9px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {parseModelBrandInfo(isAgentA ? agentA.model : agentB.model, turn.modelUsed).displayName}
                    </span>
                  )}

                  <span className="text-slate-300 dark:text-slate-600">•</span>

                  <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                    <span className="flex items-center gap-0.5" title="Turn Latency">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(turn.latencyMs)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5" title="Tokens">
                      <Cpu className="h-2.5 w-2.5" />
                      {turn.totalTokens} tok
                    </span>
                    <span>•</span>
                    <span>{turn.tokensPerSec} t/s</span>
                  </div>
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                    isAgentA
                      ? 'rounded-tl-xs bg-slate-50 text-slate-800 border border-slate-200/80 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700'
                      : 'rounded-tr-xs bg-indigo-600 text-white shadow-md shadow-indigo-100/50 dark:shadow-none'
                  }`}
                >
                  <div className="whitespace-pre-line break-words font-normal">
                    {renderTurnContent(turn.content, isAgentA)}
                  </div>

                  {/* Consensus marker badge */}
                  {turn.extractedFinalAnswer && (
                    <div
                      className={`mt-2.5 pt-2 flex items-center justify-between text-[11px] border-t ${
                        isAgentA
                          ? 'border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300'
                          : 'border-indigo-400/40 text-amber-200'
                      }`}
                    >
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Declared Final Answer:
                      </span>
                      <code
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          isAgentA
                            ? 'bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                            : 'bg-indigo-800/80 border border-indigo-400/40 text-amber-300'
                        }`}
                      >
                        {turn.extractedFinalAnswer}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Thinking / Generating Indicator */}
        {activeAgentTurn && (
          <div
            className={`flex gap-3 ${
              activeAgentTurn === 'agent_a' ? 'flex-row items-start' : 'flex-row-reverse items-start'
            } animate-fade-in`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold border ${
                activeAgentTurn === 'agent_a'
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600'
              }`}
            >
              {activeAgentTurn === 'agent_a' ? '01' : '02'}
            </div>

            <div className={`flex flex-col ${activeAgentTurn === 'agent_a' ? 'items-start' : 'items-end'}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                {activeAgentTurn === 'agent_a' ? agentA.name : agentB.name} is reasoning...
              </div>
              <div
                className={`rounded-2xl px-4 py-3 shadow-2xs border ${
                  activeAgentTurn === 'agent_a'
                    ? 'rounded-tl-xs bg-slate-50 border-slate-200 text-slate-800'
                    : 'rounded-tr-xs bg-indigo-600 text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 py-0.5">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeAgentTurn === 'agent_a' ? 'bg-indigo-600' : 'bg-white'
                    } animate-bounce`}
                  />
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeAgentTurn === 'agent_a' ? 'bg-indigo-600' : 'bg-white'
                    } animate-bounce [animation-delay:0.2s]`}
                  />
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeAgentTurn === 'agent_a' ? 'bg-indigo-600' : 'bg-white'
                    } animate-bounce [animation-delay:0.4s]`}
                  />
                  <span className="ml-2 text-[10px] font-mono opacity-80">
                    Computing inference steps...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Transcript Footer Status Bar */}
      <div className="border-t border-slate-100 bg-white px-5 py-3 text-xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Consensus State:
          </span>
          {consensusStatus === 'idle' && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              STANDBY
            </span>
          )}
          {consensusStatus === 'in_progress' && (
            <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              ACTIVE_DIALOGUE
            </span>
          )}
          {consensusStatus === 'single_claim' && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              1_CLAIM_AWAITING_PEER
            </span>
          )}
          {consensusStatus === 'consensus_reached' && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              CONSENSUS_REACHED
            </span>
          )}
          {consensusStatus === 'consensus_conflict' && (
            <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-3.5 w-3.5" />
              CONFLICTING_CLAIMS
            </span>
          )}
          {consensusStatus === 'turn_cap_exhausted' && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              TURN_CAP_EXHAUSTED
            </span>
          )}
          {(consensusStatus === 'infinite_loop_abort' || consensusStatus === 'infinite_burn_abort') && (
            <span className="flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <AlertCircle className="h-3.5 w-3.5" />
              INFINITE_LOOP_CAPPED
            </span>
          )}
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          Protocol: Strict `FINAL ANSWER: [...]` tag matching
        </div>
      </div>
    </div>
  );
};

