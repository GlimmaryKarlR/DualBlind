import { AgentConfig, BenchmarkProblem, ProviderApiKeys } from '../types/benchmark';
import { generateTurnDirectClient, TurnGenerationResult } from './clientInference';
import { hasConfiguredKeyForProvider } from './tokenStorage';

export async function generateBenchmarkTurnHybrid(options: {
  problem: BenchmarkProblem;
  agent: AgentConfig;
  partnerName: string;
  history: Array<{ sender: string; text: string; isCurrentAgent: boolean }>;
  currentTurn: number;
  maxTurnsPerAgent: number;
  isUncapped: boolean;
  apiKeys: ProviderApiKeys;
}): Promise<TurnGenerationResult> {
  const { agent, apiKeys, history, problem, partnerName, currentTurn, maxTurnsPerAgent, isUncapped } =
    options;

  const provider = (agent.provider || 'google').toLowerCase();
  
  // Check for direct provider key, universal OpenRouter key, or Google fallback key
  const hasDirectKey = hasConfiguredKeyForProvider(provider, apiKeys);
  const hasOpenRouterKey = Boolean(apiKeys.openrouter && apiKeys.openrouter.trim().length > 0);
  const hasGoogleKey = Boolean(apiKeys.google && apiKeys.google.trim().length > 0);

  // OpenRouter acts as a universal hub for DeepSeek, Qwen, Llama, etc.
  const hasUsableKey = hasDirectKey || hasOpenRouterKey || hasGoogleKey;

  let directAttemptError: Error | null = null;

  // Strategy 1: Direct Client Inference via Browser
  if (hasUsableKey) {
    try {
      return await generateTurnDirectClient(options);
    } catch (clientErr: any) {
      directAttemptError = clientErr;
      console.warn('Direct client inference failed; trying server API route:', clientErr);
    }
  }

  // Strategy 2: Attempt Server API Route
  try {
    const response = await fetch('/api/benchmark/generate-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem,
        agent,
        partnerName,
        history,
        currentTurn,
        maxTurnsPerAgent,
        isUncapped,
        apiKeys,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        content: data.content ?? '',
        extractedFinalAnswer: data.extractedFinalAnswer,
        latencyMs: data.latencyMs ?? 1000,
        inputTokens: data.inputTokens ?? 80,
        outputTokens: data.outputTokens ?? 40,
        totalTokens: data.totalTokens ?? 120,
        costUsd: data.costUsd ?? 0.00005,
        tokensPerSec: data.tokensPerSec ?? 30,
        modelUsed: data.modelUsed || agent.model,
      };
    }

    const isMissingBackend = [404, 405, 501].includes(response.status);

    // Strategy 3: Server returned static host error (404/405)
    if (isMissingBackend) {
      if (hasUsableKey) {
        if (!directAttemptError) {
          console.info(`Server returned HTTP ${response.status} (static host). Executing direct client inference.`);
          return await generateTurnDirectClient(options);
        }
        throw directAttemptError;
      }
      throw new Error(
        `Static deployment detected (HTTP ${response.status}). Please enter your API key in the settings to run benchmarks directly in the browser.`
      );
    }

    let serverMessage = '';
    try {
      const errJson = await response.json();
      serverMessage = errJson.message || errJson.error;
    } catch {
      serverMessage = await response.text().catch(() => '');
    }

    throw new Error(
      `Server returned HTTP ${response.status}: ${serverMessage.substring(0, 150) || response.statusText}`
    );
  } catch (netErr: any) {
    if (hasUsableKey && !directAttemptError) {
      console.info('Backend unreachable, falling back to direct client execution.');
      return await generateTurnDirectClient(options);
    }
    throw directAttemptError || netErr;
  }
}
