/**
 * Universal OpenRouter Model Resolver & Dynamic Catalog Sync
 * 
 * Provides an overarching solution to map any user-entered model name,
 * catalog entry, legacy slug, or community label to a verified, active OpenRouter model ID.
 * Features live background model sync, fuzzy token matching, and automatic error recovery.
 */

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  created?: number;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

// Pre-baked active OpenRouter models by creator for immediate zero-latency resolution
const CURATED_OPENROUTER_MODELS: Record<string, string[]> = {
  moonshotai: [
    'moonshotai/kimi-k3',
    'moonshotai/kimi-k2.5',
    'moonshotai/kimi-k2-thinking',
    'moonshotai/kimi-k2.7-code',
    'moonshotai/kimi-k2',
  ],
  'x-ai': [
    'x-ai/grok-4.20',
    'x-ai/grok-4.20:multi-agent',
    'x-ai/grok-4.6',
    'x-ai/grok-4.5',
    'x-ai/grok-4.3',
    'x-ai/grok-build-0.1',
    'x-ai/grok-3',
    'x-ai/grok-3-mini',
    'x-ai/grok-2-vision-1212',
    'x-ai/grok-beta',
  ],
  anthropic: [
    'anthropic/claude-3.7-sonnet',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-opus',
  ],
  openai: [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/o3-mini',
    'openai/o1',
    'openai/o1-mini',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
  ],
  deepseek: [
    'deepseek/deepseek-r1',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-coder',
  ],
  'meta-llama': [
    'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.1-405b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.2-3b-instruct',
    'meta-llama/llama-3.2-1b-instruct',
  ],
  qwen: [
    'qwen/qwen-2.5-72b-instruct',
    'qwen/qwen-2.5-coder-32b-instruct',
    'qwen/qwen-2.5-32b-instruct',
    'qwen/qwen-2.5-7b-instruct',
    'qwen/qwq-32b',
  ],
  mistralai: [
    'mistralai/mistral-large-2411',
    'mistralai/mistral-small-24b-instruct-2501',
    'mistralai/codestral-2501',
    'mistralai/ministral-8b',
    'mistralai/mistral-nemo',
  ],
  google: [
    'google/gemini-2.0-flash-001',
    'google/gemini-pro-1.5',
    'google/gemini-flash-1.5',
    'google/gemma-2-27b-it',
    'google/gemma-2-9b-it',
  ],
  amazon: [
    'amazon/nova-pro-v1',
    'amazon/nova-lite-v1',
    'amazon/nova-micro-v1',
  ],
  microsoft: [
    'microsoft/phi-4',
    'microsoft/phi-3.5-mini-128k-instruct',
    'microsoft/wizardlm-2-8x22b',
  ],
  cohere: [
    'cohere/command-r-plus-08-2024',
    'cohere/command-r-08-2024',
  ],
  minimax: [
    'minimax/minimax-01',
  ],
  thudm: [
    'thudm/glm-4-9b-chat',
  ],
  perplexity: [
    'perplexity/sonar',
    'perplexity/sonar-reasoning',
  ],
  nousresearch: [
    'nousresearch/hermes-3-llama-3.1-405b',
  ],
};

// Flattened list of all known fallback models
const ALL_FALLBACK_SLUGS = Object.values(CURATED_OPENROUTER_MODELS).flat();

// In-memory cache for live OpenRouter models list
let liveOpenRouterModelsCache: string[] = [...ALL_FALLBACK_SLUGS];
let isFetchingLiveModels = false;
let lastFetchTime = 0;

/**
 * Fetches live models directly from OpenRouter API and caches them in memory.
 */
export async function syncLiveOpenRouterModels(): Promise<string[]> {
  const now = Date.now();
  // Cache for 10 minutes
  if (liveOpenRouterModelsCache.length > ALL_FALLBACK_SLUGS.length && now - lastFetchTime < 600000) {
    return liveOpenRouterModelsCache;
  }

  if (isFetchingLiveModels) {
    return liveOpenRouterModelsCache;
  }

  isFetchingLiveModels = true;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        const liveSlugs = data.data.map((m: any) => m.id).filter(Boolean);
        if (liveSlugs.length > 0) {
          liveOpenRouterModelsCache = Array.from(new Set([...liveSlugs, ...ALL_FALLBACK_SLUGS]));
          lastFetchTime = now;
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch live OpenRouter models list; using curated fallback list.', err);
  } finally {
    isFetchingLiveModels = false;
  }

  return liveOpenRouterModelsCache;
}

// Trigger initial async fetch non-blockingly in browser/Node
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  syncLiveOpenRouterModels().catch(() => {});
}

/**
 * Normalizes a raw model string into searchable tokens
 */
function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Detects creator/brand from any string
 */
function detectCreator(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (lower.includes('moonshot') || lower.includes('kimi')) return 'moonshotai';
  if (lower.includes('xai') || lower.includes('spacexai') || lower.includes('grok')) return 'x-ai';
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic';
  if (lower.includes('openai') || lower.includes('gpt') || lower.includes('o1') || lower.includes('o3')) return 'openai';
  if (lower.includes('deepseek')) return 'deepseek';
  if (lower.includes('meta') || lower.includes('llama')) return 'meta-llama';
  if (lower.includes('qwen') || lower.includes('alibaba')) return 'qwen';
  if (lower.includes('mistral') || lower.includes('codestral') || lower.includes('ministral')) return 'mistralai';
  if (lower.includes('google') || lower.includes('gemini') || lower.includes('gemma')) return 'google';
  if (lower.includes('amazon') || lower.includes('nova')) return 'amazon';
  if (lower.includes('microsoft') || lower.includes('phi')) return 'microsoft';
  if (lower.includes('cohere') || lower.includes('command')) return 'cohere';
  if (lower.includes('minimax')) return 'minimax';
  if (lower.includes('glm') || lower.includes('z.ai') || lower.includes('thudm')) return 'thudm';
  if (lower.includes('perplexity') || lower.includes('sonar')) return 'perplexity';
  if (lower.includes('hermes') || lower.includes('nous')) return 'nousresearch';
  return null;
}

/**
 * Universal OpenRouter Model Resolver.
 * Resolves ANY model string into a valid, active OpenRouter endpoint slug.
 */
export function resolveOpenRouterModel(modelInput: string): string {
  const input = (modelInput || '').trim();
  if (!input) return 'google/gemini-2.0-flash-001';

  // 1. If it's already an exact match in our active pool
  if (liveOpenRouterModelsCache.includes(input)) {
    return input;
  }

  // 2. Identify the creator/provider
  const creator = detectCreator(input);
  const inputTokens = tokenize(input);

  // Filter pool of candidate models
  let candidates = liveOpenRouterModelsCache;
  if (creator) {
    const creatorCandidates = candidates.filter((slug) => slug.startsWith(`${creator}/`));
    if (creatorCandidates.length > 0) {
      candidates = creatorCandidates;
    }
  }

  // 3. Match by score: count how many tokens match the candidate slug
  let bestSlug = candidates[0] || 'google/gemini-2.0-flash-001';
  let highestScore = -1;

  for (const slug of candidates) {
    const slugTokens = tokenize(slug);
    let score = 0;

    for (const token of inputTokens) {
      // Ignore common noise words
      if (['model', 'v1', 'preview', 'latest', 'chat', 'instruct'].includes(token)) continue;

      if (slugTokens.includes(token)) {
        // High priority for version numbers (e.g. k3, 4.20, 70b, r1, 3.7)
        if (/\d/.test(token)) {
          score += 10;
        } else {
          score += 3;
        }
      } else if (slug.includes(token)) {
        score += 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestSlug = slug;
    }
  }

  // 4. Default flagship fallbacks if no specific tokens matched strongly
  if (highestScore <= 0 && creator && CURATED_OPENROUTER_MODELS[creator]) {
    return CURATED_OPENROUTER_MODELS[creator][0];
  }

  return bestSlug;
}

/**
 * Finds alternative fallback models if OpenRouter reports a specific model as invalid/no endpoints
 */
export function getAlternativeOpenRouterModel(failedModel: string): string {
  const creator = detectCreator(failedModel);
  if (creator && CURATED_OPENROUTER_MODELS[creator]) {
    // Find the first curated model that is not the failed one
    const alt = CURATED_OPENROUTER_MODELS[creator].find((s) => s !== failedModel);
    if (alt) return alt;
  }
  return 'google/gemini-2.0-flash-001';
}
