import { AgentConfig, BenchmarkProblem, ProviderApiKeys } from '../types/benchmark';
import { generateTurnDirectClient, TurnGenerationResult } from './clientInference';
import { getStoredApiKeys, hasConfiguredKeyForProvider } from './tokenStorage';

export async function generateBenchmarkTurnHybrid(options: {
  problem: BenchmarkProblem;
  agent: AgentConfig;
  partnerName: string;
  history: Array<{ sender: string; text: string; isCurrentAgent: boolean }>;
  currentTurn: number;
  maxTurnsPerAgent: number;
  isUncapped: boolean;
  apiKeys?: ProviderApiKeys;
}): Promise<TurnGenerationResult> {
  const { agent, history, problem, partnerName, currentTurn, maxTurnsPerAgent, isUncapped } =
    options;

  // Always merge passed keys with active local storage keys
  const storedKeys = getStoredApiKeys();
  const apiKeys: ProviderApiKeys = {
    ...storedKeys,
    ...(options.apiKeys || {}),
  };

  const provider = (agent.provider || 'google').toLowerCase();
  
  // Check for direct provider key, universal OpenRouter key, custom endpoint, or Google key
  const hasDirectKey = hasConfiguredKeyForProvider(provider, apiKeys);
  const hasOpenRouterKey = Boolean(apiKeys.openrouter && apiKeys.openrouter.trim().length > 0);
  const hasCustomKey = Boolean(apiKeys.customEndpoint?.baseUrl && apiKeys.customEndpoint?.apiKey);
  const hasGoogleKey = Boolean(apiKeys.google && apiKeys.google.trim().length > 0);

  // OpenRouter acts as a universal hub for all models
  const hasUsableKey = hasDirectKey || hasOpenRouterKey || hasCustomKey || hasGoogleKey;

  const clientOptions = {
    ...options,
    apiKeys,
  };

  let directAttemptError: Error | null = null;

  // Strategy 1: Direct Client Inference via Browser (Preferred when key is present)
  if (hasUsableKey) {
    try {
      return await generateTurnDirectClient(clientOptions);
    } catch (clientErr: any) {
      directAttemptError = clientErr;
      console.warn('Direct client inference failed; checking backend fallback:', clientErr);
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

    // Strategy 3: Server returned static host error (404/405/501)
    if (isMissingBackend) {
      if (directAttemptError) {
        throw directAttemptError;
      }
      if (hasUsableKey) {
        return await generateTurnDirectClient(clientOptions);
      }
      throw new Error(
        `No live API key found. Please open "APIs & Tokens" in the navigation bar to enter your OpenRouter or provider key.`
      );
    }

    let serverMessage = '';
    try {
      const errJson = await response.json();
      serverMessage = errJson.message || errJson.error;
    } catch {
      serverMessage = await response.text().catch(() => '');
    }

    if (directAttemptError) {
      throw directAttemptError;
    }

    throw new Error(
      `Inference Service returned HTTP ${response.status}: ${serverMessage.substring(0, 200) || response.statusText}`
    );
  } catch (netErr: any) {
    if (directAttemptError) {
      throw directAttemptError;
    }
    if (hasUsableKey) {
      return await generateTurnDirectClient(clientOptions);
    }
    throw netErr;
  }
}

