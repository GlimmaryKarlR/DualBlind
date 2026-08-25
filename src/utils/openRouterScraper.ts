/**
 * Real-Time Live OpenRouter Model Scraper & Dynamic Registry Sync
 * 
 * Fetches the entire real-time model catalog directly from OpenRouter's official
 * public REST API (`https://openrouter.ai/api/v1/models`), parses pricing, context
 * limits, architectures, modalities, and tags, and dynamically writes them into
 * the application's active catalog and persistent storage in real time.
 */

import { CatalogModel, ALL_CATALOG_MODELS } from './modelCatalog';
import { syncLiveOpenRouterModels } from './openRouterResolver';

export interface OpenRouterScrapedModel {
  id: string;
  name: string;
  created?: number;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string; // Price per token in USD (e.g. "0.00000055")
    completion: string; // Price per token in USD (e.g. "0.00000219")
    request?: string;
    image?: string;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string | null;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: any;
}

export interface LiveScrapeState {
  isScraping: boolean;
  lastScrapedAt: number | null;
  totalModels: number;
  models: CatalogModel[];
  error: string | null;
}

const STORAGE_KEY = 'dualblind_openrouter_live_scraped_catalog';
const STORAGE_TIMESTAMP_KEY = 'dualblind_openrouter_last_scraped_at';

// Event name for real-time listeners across React components
export const OPENROUTER_SCRAPE_EVENT = 'openrouter-catalog-scraped-live';

/**
 * Detects clean brand names from OpenRouter model IDs (e.g., 'anthropic/claude-3.7-sonnet' -> 'Anthropic')
 */
export function detectBrandFromSlug(slug: string, rawName?: string): { brand: string; cleanName: string; provider: CatalogModel['provider'] } {
  const parts = (slug || '').split('/');
  const prefix = parts.length > 1 ? parts[0].toLowerCase() : '';
  const modelPart = parts.length > 1 ? parts.slice(1).join('/') : slug;

  let brand = 'OpenRouter';
  let provider: CatalogModel['provider'] = 'openrouter';

  if (prefix === 'anthropic' || slug.includes('claude')) {
    brand = 'Anthropic';
    provider = 'anthropic';
  } else if (prefix === 'openai' || slug.includes('gpt-') || slug.includes('o1') || slug.includes('o3') || slug.includes('o4')) {
    brand = 'OpenAI';
    provider = 'openai';
  } else if (prefix === 'google' || slug.includes('gemini') || slug.includes('gemma')) {
    brand = 'Google';
    provider = 'google';
  } else if (prefix === 'deepseek' || slug.includes('deepseek')) {
    brand = 'DeepSeek';
    provider = 'deepseek';
  } else if (prefix === 'meta-llama' || prefix === 'meta' || slug.includes('llama')) {
    brand = 'Meta';
    provider = 'meta';
  } else if (prefix === 'qwen' || prefix === 'alibaba' || slug.includes('qwen') || slug.includes('qwq')) {
    brand = 'Qwen';
    provider = 'qwen';
  } else if (prefix === 'mistralai' || prefix === 'mistral' || slug.includes('mistral') || slug.includes('codestral') || slug.includes('ministral')) {
    brand = 'Mistral';
    provider = 'mistral';
  } else if (prefix === 'x-ai' || slug.includes('grok')) {
    brand = 'xAI';
    provider = 'xai';
  } else if (prefix === 'moonshotai' || slug.includes('kimi')) {
    brand = 'Moonshot AI';
    provider = 'moonshot';
  } else if (prefix === 'amazon' || slug.includes('nova')) {
    brand = 'Amazon';
    provider = 'amazon';
  } else if (prefix === 'microsoft' || slug.includes('phi') || slug.includes('wizardlm')) {
    brand = 'Microsoft';
    provider = 'microsoft';
  } else if (prefix === 'cohere' || slug.includes('command-r')) {
    brand = 'Cohere';
    provider = 'cohere';
  } else if (prefix === 'minimax') {
    brand = 'MiniMax';
    provider = 'openrouter';
  } else if (prefix === 'nvidia' || slug.includes('nemotron')) {
    brand = 'NVIDIA';
    provider = 'openrouter';
  } else if (prefix === 'tencent' || slug.includes('hunyuan')) {
    brand = 'Tencent';
    provider = 'openrouter';
  } else if (prefix === 'bytedance' || slug.includes('seed')) {
    brand = 'ByteDance Seed';
    provider = 'openrouter';
  } else if (prefix === 'stepfun' || slug.includes('step-')) {
    brand = 'StepFun';
    provider = 'openrouter';
  } else if (prefix === 'xiaomi' || slug.includes('mimo')) {
    brand = 'Xiaomi';
    provider = 'openrouter';
  } else if (prefix === 'thudm' || slug.includes('glm')) {
    brand = 'Z.ai';
    provider = 'openrouter';
  } else if (prefix === 'perplexity' || slug.includes('sonar')) {
    brand = 'Perplexity';
    provider = 'openrouter';
  } else if (prefix === 'nousresearch' || slug.includes('hermes')) {
    brand = 'Nous';
    provider = 'openrouter';
  } else if (prefix === 'liquid' || slug.includes('lfm')) {
    brand = 'LiquidAI';
    provider = 'openrouter';
  } else if (prefix === 'arcee-ai') {
    brand = 'Arcee AI';
    provider = 'openrouter';
  } else if (prefix === 'ibm' || slug.includes('granite')) {
    brand = 'IBM';
    provider = 'openrouter';
  } else if (prefix === 'aionlabs') {
    brand = 'AionLabs';
    provider = 'openrouter';
  } else if (prefix) {
    brand = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  // Format clean name
  let cleanName = rawName || modelPart;
  if (cleanName.includes(':')) {
    const afterColon = cleanName.split(':')[1]?.trim();
    if (afterColon) cleanName = afterColon;
  }

  return { brand, cleanName, provider };
}

/**
 * Transforms an OpenRouter raw model into our standardized CatalogModel
 */
export function transformOpenRouterToCatalogModel(model: OpenRouterScrapedModel): CatalogModel {
  const { brand, cleanName, provider } = detectBrandFromSlug(model.id, model.name);

  // Parse pricing: OpenRouter prices are per individual token USD (e.g. 0.000003)
  // Convert to USD per 1 Million Tokens
  const promptPerToken = parseFloat(model.pricing?.prompt || '0');
  const completionPerToken = parseFloat(model.pricing?.completion || '0');

  const inputPricePerMillion = Math.round(promptPerToken * 1000000 * 1000) / 1000;
  const outputPricePerMillion = Math.round(completionPerToken * 1000000 * 1000) / 1000;
  const isFree = inputPricePerMillion === 0 && outputPricePerMillion === 0;

  const tags: string[] = [];
  if (isFree || model.id.includes(':free')) tags.push('Free');
  if (model.id.includes('r1') || model.id.includes('reason') || model.id.includes('think') || model.id.includes('qwq') || model.id.includes('o1') || model.id.includes('o3')) {
    tags.push('Reasoning');
  }
  if (model.id.includes('code') || model.id.includes('coder') || model.id.includes('codestral')) {
    tags.push('Coding');
  }
  if (model.context_length && model.context_length >= 128000) {
    tags.push(`${Math.round(model.context_length / 1000)}k Context`);
  }
  if (model.id.includes(':beta') || model.id.includes('preview')) {
    tags.push('Preview');
  }

  return {
    id: model.id,
    rawName: `${brand}: ${model.name || cleanName}`,
    brand,
    name: model.name || cleanName,
    modelCode: model.id,
    provider,
    isExternal: false,
    inputPricePerMillion: inputPricePerMillion > 0 ? inputPricePerMillion : isFree ? 0 : 0.5,
    outputPricePerMillion: outputPricePerMillion > 0 ? outputPricePerMillion : isFree ? 0 : 1.5,
    tags,
    isFree,
  };
}

// In-memory cache of scraped models
let activeLiveScrapedModels: CatalogModel[] = [];

/**
 * Loads previously scraped models from localStorage on startup
 */
export function loadSavedScrapedModels(): CatalogModel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeLiveScrapedModels = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read saved OpenRouter scraped catalog', e);
  }
  return [];
}

/**
 * Gets the last time models were scraped
 */
export function getLastScrapedTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const ts = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    return ts ? parseInt(ts, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Performs a REAL-TIME live scrape of all models from OpenRouter's official API
 * and immediately writes/updates the catalog and localStorage.
 */
export async function scrapeAndWriteOpenRouterModelsLive(apiKey?: string): Promise<{
  models: CatalogModel[];
  count: number;
  timestamp: number;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey?.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API responded with HTTP ${response.status} (${response.statusText})`);
  }

  const json = await response.json();
  const rawModels: OpenRouterScrapedModel[] = Array.isArray(json?.data) ? json.data : [];

  if (rawModels.length === 0) {
    throw new Error('No models returned in OpenRouter API response');
  }

  // Parse and transform all models
  const catalogModels = rawModels.map(transformOpenRouterToCatalogModel);

  // Filter out duplicates by ID
  const uniqueMap = new Map<string, CatalogModel>();
  for (const m of catalogModels) {
    if (!uniqueMap.has(m.id)) {
      uniqueMap.set(m.id, m);
    }
  }
  const uniqueModels = Array.from(uniqueMap.values());

  const timestamp = Date.now();

  // Write directly into in-memory state
  activeLiveScrapedModels = uniqueModels;

  // Persist into localStorage in real time
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueModels));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, timestamp.toString());

      // Broadcast event so UI re-renders and reflects new models in real time
      window.dispatchEvent(
        new CustomEvent(OPENROUTER_SCRAPE_EVENT, {
          detail: {
            models: uniqueModels,
            count: uniqueModels.length,
            timestamp,
          },
        })
      );
    } catch (e) {
      console.warn('Could not write scraped models to localStorage', e);
    }
  }

  // Trigger sync in resolver cache as well
  syncLiveOpenRouterModels().catch(() => {});

  return {
    models: uniqueModels,
    count: uniqueModels.length,
    timestamp,
  };
}

/**
 * Returns all active models: combines static curated models with live scraped models
 */
export function getActiveCompleteCatalog(baseCatalog: CatalogModel[] = ALL_CATALOG_MODELS): CatalogModel[] {
  const scraped = activeLiveScrapedModels.length > 0 ? activeLiveScrapedModels : loadSavedScrapedModels();
  if (scraped.length === 0) {
    return baseCatalog;
  }

  // Merge so that scraped models with live pricing & context take precedence or enrich the catalog
  const mergedMap = new Map<string, CatalogModel>();

  // Add all static base models first
  for (const model of baseCatalog) {
    mergedMap.set(model.id.toLowerCase(), model);
    mergedMap.set(model.modelCode.toLowerCase(), model);
  }

  // Add all live scraped models (overwriting or adding new models)
  for (const model of scraped) {
    mergedMap.set(model.id.toLowerCase(), model);
    mergedMap.set(model.modelCode.toLowerCase(), model);
  }

  return Array.from(new Set(mergedMap.values()));
}
