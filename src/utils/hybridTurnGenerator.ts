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

  // Strategy 1: If user provided a key directly in the UI for this provider, use Direct Client Inference
  if (hasDirectKey || (provider === 'google' && hasGoogleKey)) {
    try {
      return await generateTurnDirectClient(options);
    } catch (clientErr: any) {
      console.warn('Direct client inference failed, checking server endpoint:', clientErr);
      // Fall through to server attempt if client failed due to CORS/network
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
        content: data.content,
        extractedFinalAnswer: data.extractedFinalAnswer,
        latencyMs: data.latencyMs || 1000,
        inputTokens: data.inputTokens || 80,
        outputTokens: data.outputTokens || 40,
        totalTokens: data.totalTokens || 120,
        costUsd: data.costUsd || 0.00005,
        tokensPerSec: data.tokensPerSec || 30,
        modelUsed: data.modelUsed || agent.model,
      };
    }

    // If server returned 404 (e.g. static Vercel deployment) or 500
    const errText = await response.text().catch(() => '');
    const is404 = response.status === 404;

    // Strategy 3: Graceful fallback on static host
    if (is404 || hasGoogleKey) {
      if (hasGoogleKey || hasDirectKey) {
        console.info('Server route unavailable (HTTP 404/static host). Running direct client inference with configured API key.');
        return await generateTurnDirectClient(options);
      } else {
        throw new Error(
          'Static deployment detected (/api returned 404). Please enter your Google Gemini API key in the "APIs & Tokens" modal to run benchmarks directly from the browser.'
        );
      }
    }

    throw new Error(
      `Server returned HTTP ${response.status}: ${errText.substring(0, 100) || response.statusText}`
    );
  } catch (netErr: any) {
    // If network error occurred (e.g. backend offline) and we have any key, try direct client
    if (hasGoogleKey || hasDirectKey) {
      console.info('Backend unreachable, falling back to direct client execution.');
      return await generateTurnDirectClient(options);
    }
    throw netErr;
  }
}
