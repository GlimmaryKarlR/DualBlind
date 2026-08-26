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
    'anthropic/claude-fable-5',
    'anthropic/claude-fable-5:batch',
    'anthropic/claude-sonnet-5',
    'anthropic/claude-sonnet-5:batch',
    'anthropic/claude-opus-5',
    'anthropic/claude-opus-5-fast',
    'anthropic/claude-opus-5:batch',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-opus-4.8-fast',
    'anthropic/claude-opus-4.8:batch',
    'anthropic/claude-opus-4.7',
    'anthropic/claude-opus-4.7-fast',
    'anthropic/claude-opus-4.7:batch',
    'anthropic/claude-sonnet-4.6',
    'anthropic/claude-sonnet-4.6:batch',
    'anthropic/claude-opus-4.6',
    'anthropic/claude-opus-4.6:batch',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-sonnet-4.5:batch',
    'anthropic/claude-opus-4.5',
    'anthropic/claude-opus-4.5:batch',
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-haiku-4.5:batch',
    'anthropic/claude-sonnet-4',
    'anthropic/claude-opus-4',
    'anthropic/claude-opus-4.1',
    'anthropic/claude-opus-4.1:batch',
    'anthropic/claude-3-haiku',
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
  tencent: [
    'tencent/hunyuan-a13b-instruct',
    'tencent/hy-mt2-1.8b',
    'tencent/hy-mt2-30b-a3b',
    'tencent/hy3',
    'tencent/hy3-preview',
  ],
  stepfun: [
    'stepfun/step-3.5-flash',
    'stepfun/step-3.7-flash',
  ],
  xiaomi: [
    'xiaomi/mimo-v2.5',
    'xiaomi/mimo-v2.5-pro',
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
  orcarouter: [
    'orcarouter/auto-balanced',
    'orcarouter/high-reasoning',
    'orcarouter/fast-coding',
    'orcarouter/lowest-cost',
    'orcarouter/claude-sonnet-3.7',
    'orcarouter/deepseek-r1',
    'orcarouter/gpt-4o',
    'orcarouter/llama-3.3-70b',
    'orcarouter/qwen-2.5-coder-32b',
    'orcarouter/kimi-k2.5',
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
  if (lower.includes('orcarouter') || lower.includes('orca router') || lower.includes('orca-router') || lower.startsWith('orca/')) return 'orcarouter';
  if (lower.includes('moonshot') || lower.includes('kimi')) return 'moonshotai';
  if (lower.includes('xai') || lower.includes('spacexai') || lower.includes('grok')) return 'x-ai';
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic';
  if (lower.includes('openai') || lower.includes('gpt') || lower.includes('o1') || lower.includes('o3') || lower.includes('o4') || lower.includes('o5')) return 'openai';
  if (lower.includes('deepseek')) return 'deepseek';
  if (lower.includes('meta') || lower.includes('llama')) return 'meta-llama';
  if (lower.includes('qwen') || lower.includes('alibaba')) return 'qwen';
  if (lower.includes('mistral') || lower.includes('codestral') || lower.includes('ministral') || lower.includes('mixtral')) return 'mistralai';
  if (lower.includes('google') || lower.includes('gemini') || lower.includes('gemma')) return 'google';
  if (lower.includes('amazon') || lower.includes('nova')) return 'amazon';
  if (lower.includes('microsoft') || lower.includes('phi') || lower.includes('wizardlm')) return 'microsoft';
  if (lower.includes('cohere') || lower.includes('command')) return 'cohere';
  if (lower.includes('minimax')) return 'minimax';
  if (lower.includes('tencent') || lower.includes('hunyuan') || lower.includes('hy-mt2') || lower.includes('hy3')) return 'tencent';
  if (lower.includes('stepfun') || lower.includes('step 3') || lower.includes('step-3')) return 'stepfun';
  if (lower.includes('xiaomi') || lower.includes('mimo')) return 'xiaomi';
  if (lower.includes('glm') || lower.includes('z.ai') || lower.includes('thudm')) return 'thudm';
  if (lower.includes('perplexity') || lower.includes('sonar')) return 'perplexity';
  if (lower.includes('hermes') || lower.includes('nous')) return 'nousresearch';
  if (lower.includes('thedrummer') || lower.includes('cydonia') || lower.includes('rocinante')) return 'thedrummer';
  if (lower.includes('upstage') || lower.includes('solar')) return 'upstage';
  if (lower.includes('reka')) return 'reka';
  if (lower.includes('sakana')) return 'sakana';
  if (lower.includes('sao10k')) return 'sao10k';
  if (lower.includes('writer') || lower.includes('palmyra')) return 'writer';
  if (lower.includes('bytedance') || lower.includes('seed')) return 'bytedance';
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
  const lower = input.toLowerCase().replace(/[^a-z0-9.:]+/g, '-');

  // Direct high-accuracy resolution for Anthropic Claude series
  if (creator === 'anthropic') {
    if (lower.includes('fable')) return lower.includes('batch') ? 'anthropic/claude-fable-5:batch' : 'anthropic/claude-fable-5';
    if (lower.includes('sonnet-5') || lower.includes('sonnet 5')) return lower.includes('batch') ? 'anthropic/claude-sonnet-5:batch' : 'anthropic/claude-sonnet-5';
    if (lower.includes('opus-5') || lower.includes('opus 5')) {
      if (lower.includes('fast')) return 'anthropic/claude-opus-5-fast';
      if (lower.includes('batch')) return 'anthropic/claude-opus-5:batch';
      return 'anthropic/claude-opus-5';
    }
    if (lower.includes('opus-4.8') || lower.includes('opus-4-8')) return lower.includes('fast') ? 'anthropic/claude-opus-4.8-fast' : lower.includes('batch') ? 'anthropic/claude-opus-4.8:batch' : 'anthropic/claude-opus-4.8';
    if (lower.includes('opus-4.7') || lower.includes('opus-4-7')) return lower.includes('fast') ? 'anthropic/claude-opus-4.7-fast' : lower.includes('batch') ? 'anthropic/claude-opus-4.7:batch' : 'anthropic/claude-opus-4.7';
    if (lower.includes('sonnet-4.6') || lower.includes('sonnet-4-6')) return lower.includes('batch') ? 'anthropic/claude-sonnet-4.6:batch' : 'anthropic/claude-sonnet-4.6';
    if (lower.includes('opus-4.6') || lower.includes('opus-4-6')) return lower.includes('batch') ? 'anthropic/claude-opus-4.6:batch' : 'anthropic/claude-opus-4.6';
    if (lower.includes('sonnet-4.5') || lower.includes('sonnet-4-5') || lower.includes('claude-3-5-sonnet') || lower.includes('claude-3.5-sonnet')) {
      return lower.includes('batch') ? 'anthropic/claude-sonnet-4.5:batch' : 'anthropic/claude-sonnet-4.5';
    }
    if (lower.includes('haiku-4.5') || lower.includes('haiku-4-5') || lower.includes('claude-3-5-haiku') || lower.includes('claude-3.5-haiku')) {
      return lower.includes('batch') ? 'anthropic/claude-haiku-4.5:batch' : 'anthropic/claude-haiku-4.5';
    }
    if (lower.includes('opus-4.5') || lower.includes('opus-4-5')) return lower.includes('batch') ? 'anthropic/claude-opus-4.5:batch' : 'anthropic/claude-opus-4.5';
    if (lower.includes('sonnet-4') || lower.includes('sonnet-4-0')) return 'anthropic/claude-sonnet-4';
    if (lower.includes('opus-4.1') || lower.includes('opus-4-1')) return lower.includes('batch') ? 'anthropic/claude-opus-4.1:batch' : 'anthropic/claude-opus-4.1';
    if (lower.includes('opus-4') || lower.includes('opus-4-0')) return 'anthropic/claude-opus-4';
    if (lower.includes('3-haiku') || lower.includes('3.0-haiku')) return 'anthropic/claude-3-haiku';
    if (lower.includes('haiku')) return 'anthropic/claude-haiku-4.5';
    if (lower.includes('opus')) return 'anthropic/claude-opus-5';
    if (lower.includes('sonnet') || lower.includes('claude-3-7') || lower.includes('claude-3.7') || lower.includes('claude')) {
      return 'anthropic/claude-sonnet-5';
    }
  }

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
  let bestSlug = '';
  let highestScore = 0;

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

  if (bestSlug && highestScore > 0) {
    return bestSlug;
  }

  // 4. Default flagship fallbacks for the detected creator
  if (creator && CURATED_OPENROUTER_MODELS[creator]) {
    return CURATED_OPENROUTER_MODELS[creator][0];
  }

  // 5. If creator is known but no curated models list, form a clean slug
  if (creator) {
    const modelPart = inputTokens.filter((t) => t !== creator).join('-');
    return `${creator}/${modelPart || 'model'}`;
  }

  // 6. If raw input has Brand: Model format, construct a clean brand/model slug
  if (input.includes(':')) {
    const parts = input.split(':');
    const b = parts[0].trim().toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const m = parts.slice(1).join('-').trim().toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    return `${b}/${m}`;
  }

  return input.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
}

/**
 * Extracts text robustly across all OpenAI and OpenRouter response variations
 * (including reasoning tokens, thoughts, content arrays, refusals, and tool arguments).
 */
export function extractTextFromOpenAIResponse(data: any): string {
  if (!data) return '';

  if (typeof data.choices === 'object' && Array.isArray(data.choices)) {
    for (const choice of data.choices) {
      if (!choice) continue;

      const msg = choice.message || choice.delta;
      if (msg) {
        // 1. Direct string content
        if (typeof msg.content === 'string' && msg.content.trim()) {
          return msg.content;
        }

        // 2. Content array (e.g. [{ type: 'text', text: '...' }])
        if (Array.isArray(msg.content)) {
          const joined = msg.content
            .map((part: any) =>
              typeof part === 'string'
                ? part
                : part?.text || part?.content || part?.value || ''
            )
            .filter(Boolean)
            .join('\n');
          if (joined.trim()) return joined;
        }

        // 3. Reasoning / Thought tags (DeepSeek R1, QwQ, Kimi Thinking, Grok reasoning)
        const reasoning =
          msg.reasoning ||
          msg.reasoning_content ||
          msg.thought ||
          msg.reasoning_text;
        if (typeof reasoning === 'string' && reasoning.trim()) {
          return `<think>\n${reasoning}\n</think>`;
        }

        // 4. Refusal message
        if (typeof msg.refusal === 'string' && msg.refusal.trim()) {
          return msg.refusal;
        }

        // 5. Tool calls / function argument output
        if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          const toolArgs = msg.tool_calls
            .map((tc: any) => tc?.function?.arguments || tc?.function?.name || '')
            .filter(Boolean)
            .join('\n');
          if (toolArgs.trim()) return toolArgs;
        }
      }

      // 6. Direct choice.text (legacy completion format)
      if (typeof choice.text === 'string' && choice.text.trim()) {
        return choice.text;
      }
    }
  }

  // Fallback top-level fields
  if (typeof data.output === 'string' && data.output.trim()) return data.output;
  if (typeof data.response === 'string' && data.response.trim()) return data.response;
  if (typeof data.text === 'string' && data.text.trim()) return data.text;

  return '';
}
