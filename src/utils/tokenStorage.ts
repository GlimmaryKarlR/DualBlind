import { ProviderApiKeys } from '../types/benchmark';

const STORAGE_KEY = 'dualblind_provider_api_tokens_v1';

export interface ProviderMeta {
  id: keyof ProviderApiKeys | 'ollama' | 'openrouter';
  name: string;
  brandName: string;
  category: 'tier1' | 'regional' | 'universal';
  tokenLabel: string;
  placeholder: string;
  portalUrl: string;
  portalName: string;
  helpText: string;
  recommendedModels: string[];
}

export const PROVIDER_METAS: ProviderMeta[] = [
  {
    id: 'google',
    name: 'Google Gemini API',
    brandName: 'Google AI',
    category: 'tier1',
    tokenLabel: 'Gemini API Key',
    placeholder: 'AIzaSy...',
    portalUrl: 'https://aistudio.google.com/app/apikey',
    portalName: 'Google AI Studio',
    helpText: 'Native free and paid tier keys from Google AI Studio.',
    recommendedModels: ['gemini-3.7-flash', 'gemini-2.5-pro', 'gemini-3.1-flash-lite'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API',
    brandName: 'DeepSeek',
    category: 'tier1',
    tokenLabel: 'DeepSeek API Key',
    placeholder: 'sk-...',
    portalUrl: 'https://platform.deepseek.com/api_keys',
    portalName: 'DeepSeek Platform',
    helpText: 'Ultra-low cost high reasoning tokens (R1 & V3).',
    recommendedModels: ['deepseek-r1', 'deepseek-v3', 'deepseek-coder-v2'],
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI (Kimi)',
    brandName: 'Moonshot AI',
    category: 'regional',
    tokenLabel: 'Kimi / Moonshot API Key',
    placeholder: 'sk-...',
    portalUrl: 'https://platform.moonshot.cn/console/api-keys',
    portalName: 'Moonshot Console',
    helpText: 'Leading Chinese long-context model suite (Kimi k1.5, Chat 128k).',
    recommendedModels: ['kimi-k1-5', 'kimi-chat-128k'],
  },
  {
    id: 'qwen',
    name: 'Alibaba Cloud (Qwen DashScope)',
    brandName: 'Alibaba (Qwen)',
    category: 'regional',
    tokenLabel: 'DashScope API Key',
    placeholder: 'sk-...',
    portalUrl: 'https://dashscope.console.aliyun.com/',
    portalName: 'Aliyun DashScope',
    helpText: 'OpenAI-compatible endpoints for Qwen 2.5 Max, 72B, and Coder.',
    recommendedModels: ['qwen-2-5-max', 'qwen-2-5-72b', 'qwen-2-5-coder'],
  },
  {
    id: 'xai',
    name: 'xAI (Grok API)',
    brandName: 'xAI',
    category: 'tier1',
    tokenLabel: 'xAI API Key',
    placeholder: 'xai-...',
    portalUrl: 'https://console.x.ai/',
    portalName: 'xAI Console',
    helpText: 'Official Grok 3, Grok 3 Mini, and Grok 2 API access.',
    recommendedModels: ['grok-3', 'grok-3-mini', 'grok-2'],
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    brandName: 'OpenAI',
    category: 'tier1',
    tokenLabel: 'OpenAI Secret Key',
    placeholder: 'sk-proj-...',
    portalUrl: 'https://platform.openai.com/api-keys',
    portalName: 'OpenAI Platform',
    helpText: 'Standard GPT-4o, GPT-4o-mini, and o3-mini reasoning tokens.',
    recommendedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude API',
    brandName: 'Anthropic',
    category: 'tier1',
    tokenLabel: 'Anthropic API Key',
    placeholder: 'sk-ant-api03-...',
    portalUrl: 'https://console.anthropic.com/settings/keys',
    portalName: 'Anthropic Console',
    helpText: 'Claude 3.7 Sonnet, Claude 3.5 Sonnet, and Haiku.',
    recommendedModels: ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI (La Plateforme)',
    brandName: 'Mistral AI',
    category: 'regional',
    tokenLabel: 'Mistral API Key',
    placeholder: '...',
    portalUrl: 'https://console.mistral.ai/api-keys/',
    portalName: 'Mistral Console',
    helpText: 'European sovereign model frontier (Mistral Large 2, Codestral).',
    recommendedModels: ['mistral-large-2', 'codestral'],
  },
  {
    id: 'cohere',
    name: 'Cohere API',
    brandName: 'Cohere',
    category: 'regional',
    tokenLabel: 'Cohere Production Key',
    placeholder: '...',
    portalUrl: 'https://dashboard.cohere.com/api-keys',
    portalName: 'Cohere Dashboard',
    helpText: 'Enterprise Command R+ and Command R reasoning.',
    recommendedModels: ['command-r-plus'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft Azure / GitHub Models',
    brandName: 'Microsoft',
    category: 'universal',
    tokenLabel: 'GitHub / Azure Token',
    placeholder: 'ghp_... or Azure Key',
    portalUrl: 'https://github.com/marketplace/models',
    portalName: 'GitHub Models Marketplace',
    helpText: 'Access Microsoft Phi-4 and open models via GitHub/Azure.',
    recommendedModels: ['phi-4', 'phi-3-5-moe', 'phi-3-5-mini'],
  },
  {
    id: 'amazon',
    name: 'Amazon Bedrock / AWS Access',
    brandName: 'Amazon (AWS)',
    category: 'universal',
    tokenLabel: 'AWS Bearer / API Key',
    placeholder: 'AKIA... or Bedrock Key',
    portalUrl: 'https://aws.amazon.com/bedrock/',
    portalName: 'AWS Bedrock Console',
    helpText: 'Amazon Nova Pro, Nova Lite, and Nova Micro.',
    recommendedModels: ['amazon-nova-pro', 'amazon-nova-lite', 'amazon-nova-micro'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Universal Hub)',
    brandName: 'OpenRouter',
    category: 'universal',
    tokenLabel: 'OpenRouter API Key',
    placeholder: 'sk-or-v1-...',
    portalUrl: 'https://openrouter.ai/keys',
    portalName: 'OpenRouter Keys',
    helpText: 'Single universal key routing to all 200+ global and open-weights models.',
    recommendedModels: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-r1', 'qwen/qwen-2.5-72b-instruct'],
  },
];

export function getStoredApiKeys(): ProviderApiKeys {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse stored API keys:', err);
    return {};
  }
}

export function saveStoredApiKeys(keys: ProviderApiKeys): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error('Failed to save API keys to local storage:', err);
  }
}

export function clearAllApiKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear API keys:', err);
  }
}

export function hasConfiguredKeyForProvider(
  provider: string | undefined,
  keys: ProviderApiKeys
): boolean {
  if (!provider) return false;
  const p = provider.toLowerCase();
  if (p === 'google') return Boolean(keys.google && keys.google.trim().length > 0);
  if (p === 'openai') return Boolean(keys.openai && keys.openai.trim().length > 0);
  if (p === 'anthropic') return Boolean(keys.anthropic && keys.anthropic.trim().length > 0);
  if (p === 'xai') return Boolean(keys.xai && keys.xai.trim().length > 0);
  if (p === 'deepseek') return Boolean(keys.deepseek && keys.deepseek.trim().length > 0);
  if (p === 'moonshot') return Boolean(keys.moonshot && keys.moonshot.trim().length > 0);
  if (p === 'qwen') return Boolean(keys.qwen && keys.qwen.trim().length > 0);
  if (p === 'mistral') return Boolean(keys.mistral && keys.mistral.trim().length > 0);
  if (p === 'cohere') return Boolean(keys.cohere && keys.cohere.trim().length > 0);
  if (p === 'microsoft') return Boolean(keys.microsoft && keys.microsoft.trim().length > 0);
  if (p === 'amazon') return Boolean(keys.amazon && keys.amazon.trim().length > 0);
  if (p === 'openrouter') return Boolean(keys.openrouter && keys.openrouter.trim().length > 0);
  if (p === 'custom') return Boolean(keys.customEndpoint?.apiKey && keys.customEndpoint.apiKey.trim().length > 0);
  return false;
}

export function getKeyForProvider(
  provider: string | undefined,
  keys: ProviderApiKeys
): string | undefined {
  if (!provider) return undefined;
  const p = provider.toLowerCase();
  if (p === 'google') return keys.google;
  if (p === 'openai') return keys.openai;
  if (p === 'anthropic') return keys.anthropic;
  if (p === 'xai') return keys.xai;
  if (p === 'deepseek') return keys.deepseek;
  if (p === 'moonshot') return keys.moonshot;
  if (p === 'qwen') return keys.qwen;
  if (p === 'mistral') return keys.mistral;
  if (p === 'cohere') return keys.cohere;
  if (p === 'microsoft') return keys.microsoft;
  if (p === 'amazon') return keys.amazon;
  if (p === 'openrouter') return keys.openrouter;
  if (p === 'custom') return keys.customEndpoint?.apiKey;
  return undefined;
}

export function maskApiKey(key?: string): string {
  if (!key || key.trim() === '') return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  const start = trimmed.substring(0, 4);
  const end = trimmed.substring(trimmed.length - 4);
  return `${start}••••••••${end}`;
}

export function countConfiguredKeys(keys: ProviderApiKeys): number {
  let count = 0;
  if (keys.google?.trim()) count++;
  if (keys.openai?.trim()) count++;
  if (keys.anthropic?.trim()) count++;
  if (keys.xai?.trim()) count++;
  if (keys.deepseek?.trim()) count++;
  if (keys.moonshot?.trim()) count++;
  if (keys.qwen?.trim()) count++;
  if (keys.mistral?.trim()) count++;
  if (keys.cohere?.trim()) count++;
  if (keys.microsoft?.trim()) count++;
  if (keys.amazon?.trim()) count++;
  if (keys.openrouter?.trim()) count++;
  if (keys.customEndpoint?.apiKey?.trim()) count++;
  return count;
}
