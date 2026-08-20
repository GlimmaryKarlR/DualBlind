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
  const hasDirectKey = hasConfiguredKeyForProvider(provider, apiKeys);
  const hasGoogleKey = Boolean(apiKeys.google && apiKeys.google.trim().length > 0);
  const hasUsableKey = hasDirectKey || hasGoogleKey;

  let directAttemptError: Error | null = null;

  // Strategy 1: Direct Client Inference (if an explicit API key is provided)
  if (hasUsableKey) {
    try {
      return await generateTurnDirectClient(options);
    } catch (clientErr: any) {
      directAttemptError = clientErr;
      console.warn('Direct client inference failed; falling back to server API endpoint:', clientErr);
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

    const is404 = response.status === 404;

    // Strategy 3: Server returned error or static host (404)
    if (is404) {
      if (hasUsableKey) {
        if (!directAttemptError) {
          console.info('Server route unavailable (HTTP 404). Executing direct client inference.');
          return await generateTurnDirectClient(options);
        }
        throw directAttemptError;
      }
      throw new Error(
        'Static deployment detected (/api returned 404). Please provide a valid API key in the settings to execute benchmarks directly in the browser.'
      );
    }

    // Extract structured error message if available
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
    // Strategy 4: Fall back to direct client on backend network failure (only if client hasn't already failed)
    if (hasUsableKey && !directAttemptError) {
      console.info('Backend unreachable, falling back to direct client execution.');
      return await generateTurnDirectClient(options);
    }
    
    // Re-throw original direct error if available, otherwise network error
    throw directAttemptError || netErr;
  }
}
