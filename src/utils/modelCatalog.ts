import { resolveOpenRouterModel } from './openRouterResolver';

export interface CatalogModel {
  id: string;
  rawName: string;
  brand: string;
  name: string;
  modelCode: string;
  provider:
    | 'google'
    | 'anthropic'
    | 'openai'
    | 'deepseek'
    | 'moonshot'
    | 'qwen'
    | 'mistral'
    | 'meta'
    | 'xai'
    | 'microsoft'
    | 'amazon'
    | 'cohere'
    | 'openrouter'
    | 'custom';
  isExternal: boolean;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  tags?: string[];
  isFree?: boolean;
}


export interface BrandGroup {
  brand: string;
  brandColor: string;
  description?: string;
  models: CatalogModel[];
}

// Raw list supplied by user
const RAW_MODELS: string[] = [
  'AionLabs: Aion-2.0',
  'AionLabs: Aion-3.0',
  'AionLabs: Aion-3.0-Mini',
  'AionLabs: Aion-RP 1.0 (8B)',
  'AllenAI: Olmo 3 32B Think',
  'Amazon: Nova 2 Lite',
  'Amazon: Nova Lite 1.0',
  'Amazon: Nova Micro 1.0',
  'Amazon: Nova Premier 1.0',
  'Amazon: Nova Pro 1.0',
  'Anthropic Claude Haiku Latest',
  'Anthropic Claude Sonnet Latest',
  'Anthropic: Claude 3 Haiku',
  'Anthropic: Claude Fable 5',
  'Anthropic: Claude Fable 5 (batch)',
  'Anthropic: Claude Fable Latest',
  'Anthropic: Claude Haiku 4.5',
  'Anthropic: Claude Haiku 4.5 (batch)',
  'Anthropic: Claude Opus 4',
  'Anthropic: Claude Opus 4.1',
  'Anthropic: Claude Opus 4.1 (batch)',
  'Anthropic: Claude Opus 4.5',
  'Anthropic: Claude Opus 4.5 (batch)',
  'Anthropic: Claude Opus 4.6',
  'Anthropic: Claude Opus 4.6 (batch)',
  'Anthropic: Claude Opus 4.7',
  'Anthropic: Claude Opus 4.7 (Fast)',
  'Anthropic: Claude Opus 4.7 (batch)',
  'Anthropic: Claude Opus 4.8',
  'Anthropic: Claude Opus 4.8 (Fast)',
  'Anthropic: Claude Opus 4.8 (batch)',
  'Anthropic: Claude Opus Latest',
  'Anthropic: Claude Sonnet 4',
  'Anthropic: Claude Sonnet 4.5',
  'Anthropic: Claude Sonnet 4.5 (batch)',
  'Anthropic: Claude Sonnet 4.6',
  'Anthropic: Claude Sonnet 4.6 (batch)',
  'Anthropic: Claude Sonnet 5',
  'Anthropic: Claude Sonnet 5 (batch)',
  'Arcee AI: Trinity Large Thinking',
  'Arcee AI: Virtuoso Large',
  'Auto Router',
  'Auto Router (Beta)',
  'Baidu: ERNIE 4.5 VL 424B A47B',
  'Body Builder (beta)',
  'ByteDance Seed: Seed 1.6',
  'ByteDance Seed: Seed 1.6 Flash',
  'ByteDance Seed: Seed 2.1 Turbo',
  'ByteDance Seed: Seed-2.0-Code',
  'ByteDance Seed: Seed-2.0-Lite',
  'ByteDance Seed: Seed-2.0-Mini',
  'ByteDance: UI-TARS 7B',
  'Claude Opus 5',
  'Claude Opus 5 (Fast)',
  'Claude Opus 5 (batch)',
  'Cohere: Command A',
  'Cohere: Command R (08-2024)',
  'Cohere: Command R+ (08-2024)',
  'Cohere: Command R7B (12-2024)',
  'Cohere: North Mini Code (free)',
  'Deep Cogito: Cogito v2.1 671B',
  'DeepSeek V4 Flash Latest',
  'DeepSeek: DeepSeek V3',
  'DeepSeek: DeepSeek V3 0324',
  'DeepSeek: DeepSeek V3.1',
  'DeepSeek: DeepSeek V3.1 Terminus',
  'DeepSeek: DeepSeek V3.2',
  'DeepSeek: DeepSeek V3.2 Exp',
  'DeepSeek: DeepSeek V4 Flash 0423',
  'DeepSeek: DeepSeek V4 Flash 0731',
  'DeepSeek: DeepSeek V4 Flash Vision Exp',
  'DeepSeek: DeepSeek V4 Pro 0423',
  'DeepSeek: DeepSeek V4 Pro 0813',
  'DeepSeek: R1',
  'DeepSeek: R1 0528',
  'DeepSeek: R1 Distill Llama 70B',
  'Dots Studio: Dots3-Note Preview (free)',
  'Google Gemini Flash Latest',
  'Google Gemini Pro Latest',
  'Google: Gemini 2.5 Flash',
  'Google: Gemini 2.5 Flash (batch)',
  'Google: Gemini 2.5 Flash Lite',
  'Google: Gemini 2.5 Flash Lite (batch)',
  'Google: Gemini 2.5 Pro',
  'Google: Gemini 2.5 Pro (batch)',
  'Google: Gemini 2.5 Pro Preview 05-06',
  'Google: Gemini 2.5 Pro Preview 06-05',
  'Google: Gemini 3 Flash Preview',
  'Google: Gemini 3 Flash Preview (batch)',
  'Google: Gemini 3.1 Flash Lite',
  'Google: Gemini 3.1 Flash Lite (batch)',
  'Google: Gemini 3.1 Flash Lite Preview',
  'Google: Gemini 3.1 Pro Preview',
  'Google: Gemini 3.1 Pro Preview (batch)',
  'Google: Gemini 3.1 Pro Preview Custom Tools',
  'Google: Gemini 3.5 Flash',
  'Google: Gemini 3.5 Flash (batch)',
  'Google: Gemini 3.5 Flash Lite',
  'Google: Gemini 3.5 Flash Lite (batch)',
  'Google: Gemini 3.6 Flash',
  'Google: Gemini 3.6 Flash (batch)',
  'Google: Gemini 3.7 Flash',
  'Google: Gemini 3.7 Flash (batch)',
  'Google: Gemma 2 27B',
  'Google: Gemma 3 12B',
  'Google: Gemma 3 27B',
  'Google: Gemma 3 4B',
  'Google: Gemma 3n 4B',
  'Google: Gemma 4 26B A4B',
  'Google: Gemma 4 26B A4B (free)',
  'Google: Gemma 4 31B',
  'Google: Gemma 4 31B (free)',
  'Google: Lyria 3 Clip Preview',
  'Google: Lyria 3 Pro Preview',
  'Google: Nano Banana (Gemini 2.5 Flash Image)',
  'Google: Nano Banana 2 (Gemini 3.1 Flash Image Preview)',
  'Google: Nano Banana 2 (Gemini 3.1 Flash Image)',
  'Google: Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)',
  'Google: Nano Banana Pro (Gemini 3 Pro Image Preview)',
  'Google: Nano Banana Pro (Gemini 3 Pro Image)',
  'IBM: Granite 4.0 Micro',
  'IBM: Granite 4.1 8B',
  'Inception: Mercury 2',
  'Kwaipilot: KAT-Coder-Air V2.5',
  'Kwaipilot: KAT-Coder-Pro V2',
  'Kwaipilot: KAT-Coder-Pro V2.5',
  'Ling-3.0-flash',
  'LiquidAI: LFM2.5-2.6B (free)',
  'Magnum v4 72B',
  'Mancer: Weaver (alpha)',
  'Meituan: LongCat 2.0',
  'Meta: Llama 3.1 70B Instruct',
  'Meta: Llama 3.1 8B Instruct',
  'Meta: Llama 3.2 1B Instruct',
  'Meta: Llama 3.2 3B Instruct',
  'Meta: Llama 3.3 70B Instruct',
  'Meta: Llama 4 Maverick',
  'Meta: Llama 4 Scout',
  'Meta: Llama Guard 4 12B',
  'Meta: Muse Glimmer 30B',
  'Meta: Muse Spark 1.1',
  'Meta: Muse Spark 1.2',
  'Microsoft: Phi 4',
  'MiniMax: MiniMax M1',
  'MiniMax: MiniMax M2',
  'MiniMax: MiniMax M2-her',
  'MiniMax: MiniMax M2.1',
  'MiniMax: MiniMax M2.5',
  'MiniMax: MiniMax M2.7',
  'MiniMax: MiniMax M3',
  'MiniMax: MiniMax M3 (batch)',
  'MiniMax: MiniMax-01',
  'Mistral Large',
  'Mistral Large 2407',
  'Mistral: Codestral 2508',
  'Mistral: Ministral 3 14B 2512',
  'Mistral: Ministral 3 3B 2512',
  'Mistral: Ministral 3 8B 2512',
  'Mistral: Ministral 8B',
  'Mistral: Mistral Large 3 2512',
  'Mistral: Mistral Medium 3',
  'Mistral: Mistral Medium 3.1',
  'Mistral: Mistral Medium 3.5',
  'Mistral: Mistral Nemo',
  'Mistral: Mistral Small 3',
  'Mistral: Mistral Small 3.1 24B',
  'Mistral: Mistral Small 3.2 24B',
  'Mistral: Mistral Small 4',
  'Mistral: Mixtral 8x22B Instruct',
  'Mistral: Saba',
  'Mistral: Voxtral Small 24B 2507',
  'MoonshotAI Kimi Latest',
  'MoonshotAI: Kimi K2 0711',
  'MoonshotAI: Kimi K2 0905',
  'MoonshotAI: Kimi K2 Thinking',
  'MoonshotAI: Kimi K2.5',
  'MoonshotAI: Kimi K2.6',
  'MoonshotAI: Kimi K2.7 Code',
  'MoonshotAI: Kimi K2.7 Code (batch)',
  'MoonshotAI: Kimi K3',
  'Morph: Morph V3 Fast',
  'Morph: Morph V3 Large',
  'MythoMax 13B',
  'NVIDIA: Nemotron 3 Nano 30B A3B',
  'NVIDIA: Nemotron 3 Nano 30B A3B (free)',
  'NVIDIA: Nemotron 3 Nano Omni (free)',
  'NVIDIA: Nemotron 3 Super',
  'NVIDIA: Nemotron 3 Super (free)',
  'NVIDIA: Nemotron 3 Ultra',
  'NVIDIA: Nemotron 3 Ultra (batch)',
  'NVIDIA: Nemotron 3 Ultra (free)',
  'NVIDIA: Nemotron 3.5 Content Safety (free)',
  'NVIDIA: Nemotron 3.5 Lightning',
  'NVIDIA: Nemotron 3.5 Lightning (free)',
  'NVIDIA: Nemotron Nano 12B 2 VL (free)',
  'NVIDIA: Nemotron Nano 9B V2 (free)',
  'Nex AGI: Nex-N2-Mini',
  'Nex AGI: Nex-N2-Pro',
  'Nous: Hermes 3 405B Instruct',
  'Nous: Hermes 3 70B Instruct',
  'Nous: Hermes 4 405B',
  'Nous: Hermes 4 70B',
  'OpenAI GPT Latest',
  'OpenAI GPT Mini Latest',
  'OpenAI: GPT Audio',
  'OpenAI: GPT Audio Mini',
  'OpenAI: GPT Chat Latest',
  'OpenAI: GPT-3.5 Turbo',
  'OpenAI: GPT-3.5 Turbo (batch)',
  'OpenAI: GPT-3.5 Turbo (older v0613)',
  'OpenAI: GPT-3.5 Turbo 16k',
  'OpenAI: GPT-3.5 Turbo Instruct',
  'OpenAI: GPT-4 Turbo (batch)',
  'OpenAI: GPT-4 Turbo Preview',
  'OpenAI: GPT-4.1',
  'OpenAI: GPT-4.1 (batch)',
  'OpenAI: GPT-4.1 Mini',
  'OpenAI: GPT-4.1 Mini (batch)',
  'OpenAI: GPT-4.1 Nano',
  'OpenAI: GPT-4.1 Nano (batch)',
  'OpenAI: GPT-4 Turbo',
  'OpenAI: GPT-4o',
  'OpenAI: GPT-4o (2024-05-13)',
  'OpenAI: GPT-4o (2024-08-06)',
  'OpenAI: GPT-4o (2024-11-20)',
  'OpenAI: GPT-4o (batch)',
  'OpenAI: GPT-4o-mini',
  'OpenAI: GPT-4o-mini (2024-07-18)',
  'OpenAI: GPT-4o-mini (batch)',
  'OpenAI: GPT-5',
  'OpenAI: GPT-5 (batch)',
  'OpenAI: GPT-5 Codex (batch)',
  'OpenAI: GPT-5 Image',
  'OpenAI: GPT-5 Image Mini',
  'OpenAI: GPT-5 Mini',
  'OpenAI: GPT-5 Mini (batch)',
  'OpenAI: GPT-5 Nano',
  'OpenAI: GPT-5 Nano (batch)',
  'OpenAI: GPT-5 Pro',
  'OpenAI: GPT-5 Pro (batch)',
  'OpenAI: GPT-5.1',
  'OpenAI: GPT-5.1 (batch)',
  'OpenAI: GPT-5.1-Codex',
  'OpenAI: GPT-5.1-Codex-Max',
  'OpenAI: GPT-5.1-Codex-Mini',
  'OpenAI: GPT-5.2',
  'OpenAI: GPT-5.2 (batch)',
  'OpenAI: GPT-5.2 Chat',
  'OpenAI: GPT-5.2 Pro',
  'OpenAI: GPT-5.2 Pro (batch)',
  'OpenAI: GPT-5.2-Codex',
  'OpenAI: GPT-5.3-Codex',
  'OpenAI: GPT-5.4',
  'OpenAI: GPT-5.4 (batch)',
  'OpenAI: GPT-5.4 Image 2',
  'OpenAI: GPT-5.4 Mini',
  'OpenAI: GPT-5.4 Mini (batch)',
  'OpenAI: GPT-5.4 Nano',
  'OpenAI: GPT-5.4 Nano (batch)',
  'OpenAI: GPT-5.4 Pro',
  'OpenAI: GPT-5.4 Pro (batch)',
  'OpenAI: GPT-5.5',
  'OpenAI: GPT-5.5 (batch)',
  'OpenAI: GPT-5.5 Pro',
  'OpenAI: GPT-5.5 Pro (batch)',
  'OpenAI: GPT-5.6 Luna',
  'OpenAI: GPT-5.6 Luna (batch)',
  'OpenAI: GPT-5.6 Luna Pro',
  'OpenAI: GPT-5.6 Luna Pro (batch)',
  'OpenAI: GPT-5.6 Sol',
  'OpenAI: GPT-5.6 Sol (batch)',
  'OpenAI: GPT-5.6 Sol Pro',
  'OpenAI: GPT-5.6 Sol Pro (batch)',
  'OpenAI: GPT-5.6 Terra',
  'OpenAI: GPT-5.6 Terra (batch)',
  'OpenAI: GPT-5.6 Terra Pro',
  'OpenAI: GPT-5.6 Terra Pro (batch)',
  'OpenAI: gpt-oss-120b',
  'OpenAI: gpt-oss-20b',
  'OpenAI: gpt-oss-20b (free)',
  'OpenAI: gpt-oss-safeguard-20b',
  'OpenAI: o1',
  'OpenAI: o1 (batch)',
  'OpenAI: o1-pro',
  'OpenAI: o1-pro (batch)',
  'OpenAI: o3',
  'OpenAI: o3 (batch)',
  'OpenAI: o3 Mini',
  'OpenAI: o3 Mini (batch)',
  'OpenAI: o3 Mini High',
  'OpenAI: o3 Mini High (batch)',
  'OpenAI: o3 Pro',
  'OpenAI: o3 Pro (batch)',
  'OpenAI: o4 Mini',
  'OpenAI: o4 Mini (batch)',
  'OpenAI: o4 Mini High',
  'OpenAI: o4 Mini High (batch)',
  'OpenRouter: Fusion',
  'Ox Alpha',
  'Pareto Code Router',
  'Perceptron: Perceptron Mk1',
  'Perplexity: Sonar',
  'Perplexity: Sonar Deep Research',
  'Perplexity: Sonar Pro',
  'Perplexity: Sonar Pro Search',
  'Perplexity: Sonar Reasoning Pro',
  'Poolside: Laguna S 2.1',
  'Poolside: Laguna S 2.1 (free)',
  'Poolside: Laguna XS 2.1',
  'Poolside: Laguna XS 2.1 (free)',
  'Qwen2.5 72B Instruct',
  'Qwen2.5 Coder 32B Instruct',
  'Qwen: Qwen Plus 0728',
  'Qwen: Qwen Plus 0728 (thinking)',
  'Qwen: Qwen-Plus',
  'Qwen: Qwen2.5 7B Instruct',
  'Qwen: Qwen2.5 VL 72B Instruct',
  'Qwen: Qwen3 14B',
  'Qwen: Qwen3 235B A22B',
  'Qwen: Qwen3 235B A22B Instruct 2507',
  'Qwen: Qwen3 235B A22B Thinking 2507',
  'Qwen: Qwen3 30B A3B',
  'Qwen: Qwen3 30B A3B Instruct 2507',
  'Qwen: Qwen3 30B A3B Thinking 2507',
  'Qwen: Qwen3 32B',
  'Qwen: Qwen3 8B',
  'Qwen: Qwen3 Coder 30B A3B Instruct',
  'Qwen: Qwen3 Coder 480B A35B',
  'Qwen: Qwen3 Coder Flash',
  'Qwen: Qwen3 Coder Next',
  'Qwen: Qwen3 Coder Plus',
  'Qwen: Qwen3 Max',
  'Qwen: Qwen3 Max Thinking',
  'Qwen: Qwen3 Next 80B A3B Instruct',
  'Qwen: Qwen3 Next 80B A3B Thinking',
  'Qwen: Qwen3 VL 235B A22B Instruct',
  'Qwen: Qwen3 VL 235B A22B Thinking',
  'Qwen: Qwen3 VL 30B A3B Instruct',
  'Qwen: Qwen3 VL 30B A3B Thinking',
  'Qwen: Qwen3 VL 32B Instruct',
  'Qwen: Qwen3 VL 8B Instruct',
  'Qwen: Qwen3 VL 8B Thinking',
  'Qwen: Qwen3.5 397B A17B',
  'Qwen: Qwen3.5 Plus 2026-02-15',
  'Qwen: Qwen3.5 Plus 2026-04-20',
  'Qwen: Qwen3.5-122B-A10B',
  'Qwen: Qwen3.5-27B',
  'Qwen: Qwen3.5-35B-A3B',
  'Qwen: Qwen3.5-9B',
  'Qwen: Qwen3.5-Flash',
  'Qwen: Qwen3.6 27B',
  'Qwen: Qwen3.6 35B A3B',
  'Qwen: Qwen3.6 Flash',
  'Qwen: Qwen3.6 Max Preview',
  'Qwen: Qwen3.6 Plus',
  'Qwen: Qwen3.7 Flash',
  'Qwen: Qwen3.7 Max',
  'Qwen: Qwen3.7 Plus',
  'Qwen: Qwen3.8 2.4T A95B',
  'Qwen: Qwen3.8 27B',
  'Qwen: Qwen3.8 Max',
  'ReMM SLERP 13B',
  'Reka Edge',
  'Reka Flash 3',
  'Relace: Relace Apply 3',
  'Relace: Relace Search',
  'Sakana: Fugu Ultra',
  'Sakana: Sakana Namazu',
  'Sao10K: Llama 3 8B Lunaris',
  'Sao10K: Llama 3.1 Euryale 70B v2.2',
  'Sao10K: Llama 3.3 Euryale 70B',
  'SpaceXAI: Grok 4.20',
  'SpaceXAI: Grok 4.20 Multi-Agent',
  'SpaceXAI: Grok 4.3',
  'SpaceXAI: Grok 4.5',
  'SpaceXAI: Grok 4.6',
  'SpaceXAI: Grok Build 0.1',
  'StepFun: Step 3.5 Flash',
  'StepFun: Step 3.7 Flash',
  'Tencent: Hunyuan A13B Instruct',
  'Tencent: Hy-MT2-1.8B',
  'Tencent: Hy-MT2-30B-A3B',
  'Tencent: Hy3',
  'Tencent: Hy3 preview',
  'TheDrummer: Cydonia 24B V4.1',
  'TheDrummer: Rocinante 12B',
  'TheDrummer: Skyfall 36B V2',
  'TheDrummer: UnslopNemo 12B',
  'Thinking Machines: Inkling',
  'Thinking Machines: Inkling (batch)',
  'Thinking Machines: Inkling Small',
  'Upstage: Solar Pro 3',
  'Upstage: Solar Pro 4',
  'Venice: Uncensored',
  'WizardLM-2 8x22B',
  'Writer: Palmyra X5',
  'xAI: Grok Latest',
  'Xiaomi: MiMo-V2.5',
  'Xiaomi: MiMo-V2.5-Pro',
  'Z.ai: GLM 4.5',
  'Z.ai: GLM 4.5 Air',
  'Z.ai: GLM 4.5V',
  'Z.ai: GLM 4.6',
  'Z.ai: GLM 4.6V',
  'Z.ai: GLM 4.7',
  'Z.ai: GLM 4.7 Flash',
  'Z.ai: GLM 5',
  'Z.ai: GLM 5 Turbo',
  'Z.ai: GLM 5.1',
  'Z.ai: GLM 5.2',
  'Z.ai: GLM 5.2 (batch)',
  'Z.ai: GLM 5.2 (free)',
  'Z.ai: GLM 5.3',
  'Z.ai: GLM 5V Turbo',
  'Z.ai: GLM Latest',
  'inclusionAI: Ling-2.6-1T',
  'inclusionAI: Ling-2.6-flash',
  'inclusionAI: Ring-2.6-1T',
];

function extractBrandAndName(raw: string): { brand: string; name: string } {
  const trimmed = raw.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const brandPart = parts[0].trim();
    const namePart = parts.slice(1).join(':').trim();
    return { brand: brandPart, name: namePart };
  }
  // Standalone names
  if (trimmed.toLowerCase().startsWith('anthropic claude')) {
    return { brand: 'Anthropic', name: trimmed.replace(/^Anthropic\s+/i, '') };
  }
  if (trimmed.toLowerCase().startsWith('claude')) {
    return { brand: 'Anthropic', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('google gemini')) {
    return { brand: 'Google', name: trimmed.replace(/^Google\s+/i, '') };
  }
  if (trimmed.toLowerCase().startsWith('deepseek')) {
    return { brand: 'DeepSeek', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('moonshotai')) {
    return { brand: 'Moonshot AI', name: trimmed.replace(/^MoonshotAI\s*/i, '') };
  }
  if (trimmed.toLowerCase().startsWith('openai')) {
    return { brand: 'OpenAI', name: trimmed.replace(/^OpenAI\s*/i, '') };
  }
  if (trimmed.toLowerCase().startsWith('qwen')) {
    return { brand: 'Qwen', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('mistral')) {
    return { brand: 'Mistral', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('reka')) {
    return { brand: 'Reka', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('wizardlm')) {
    return { brand: 'Microsoft', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('remm') || trimmed.toLowerCase().startsWith('mythomax')) {
    return { brand: 'Open Community', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('auto router') || trimmed.toLowerCase().startsWith('body builder') || trimmed.toLowerCase().startsWith('pareto') || trimmed.toLowerCase().startsWith('ox alpha') || trimmed.toLowerCase().startsWith('venice')) {
    return { brand: 'Routers & Ensembles', name: trimmed };
  }
  if (trimmed.toLowerCase().startsWith('ling')) {
    return { brand: 'inclusionAI', name: trimmed };
  }
  return { brand: 'Other / Open Frontier', name: trimmed };
}

function resolveProvider(brand: string, modelName: string): CatalogModel['provider'] {
  const b = brand.toLowerCase();
  const m = modelName.toLowerCase();
  if (b.includes('google')) return 'google';
  if (b.includes('anthropic') || m.includes('claude')) return 'anthropic';
  if (b.includes('openai') || m.includes('gpt') || m.includes('o1') || m.includes('o3') || m.includes('o4')) return 'openai';
  if (b.includes('deepseek')) return 'deepseek';
  if (b.includes('moonshot') || b.includes('kimi')) return 'moonshot';
  if (b.includes('qwen') || b.includes('alibaba')) return 'qwen';
  if (b.includes('mistral')) return 'mistral';
  if (b.includes('xai') || b.includes('spacexai')) return 'xai';
  if (b.includes('meta') || m.includes('llama')) return 'meta';
  if (b.includes('amazon') || m.includes('nova')) return 'amazon';
  if (b.includes('microsoft') || m.includes('phi')) return 'microsoft';
  if (b.includes('cohere') || m.includes('command')) return 'cohere';
  return 'openrouter';
}

function calculatePricing(brand: string, name: string): { inPrice: number; outPrice: number } {
  const lower = (brand + ' ' + name).toLowerCase();
  if (lower.includes('(free)')) return { inPrice: 0.0, outPrice: 0.0 };
  if (lower.includes('batch')) return { inPrice: 0.075, outPrice: 0.30 };
  if (lower.includes('pro') && lower.includes('google')) return { inPrice: 1.25, outPrice: 5.00 };
  if (lower.includes('flash lite') || lower.includes('mini') || lower.includes('nano') || lower.includes('small') || lower.includes('micro') || lower.includes('8b') || lower.includes('7b')) {
    return { inPrice: 0.075, outPrice: 0.30 };
  }
  if (lower.includes('grok 4.20') || lower.includes('grok 4.3')) return { inPrice: 1.25, outPrice: 2.50 };
  if (lower.includes('grok 4.5') || lower.includes('grok 4.6')) return { inPrice: 1.50, outPrice: 3.00 };
  if (lower.includes('grok build')) return { inPrice: 0.80, outPrice: 1.60 };
  if (lower.includes('opus') || lower.includes('gpt-5') || lower.includes('gpt-5.4 pro') || lower.includes('o3 pro') || lower.includes('o1-pro')) {
    return { inPrice: 5.00, outPrice: 20.00 };
  }
  if (lower.includes('sonnet') || lower.includes('gpt-4o') || lower.includes('max') || lower.includes('r1') || lower.includes('thinking') || lower.includes('deep research')) {
    return { inPrice: 2.50, outPrice: 10.00 };
  }
  if (lower.includes('r+')) return { inPrice: 2.50, outPrice: 10.00 };
  if (lower.includes('flash') || lower.includes('turbo') || lower.includes('grok 3 mini')) {
    return { inPrice: 0.15, outPrice: 0.60 };
  }
  return { inPrice: 0.30, outPrice: 1.20 };
}

function extractTags(name: string, raw: string): string[] {
  const tags: string[] = [];
  const lower = (name + ' ' + raw).toLowerCase();
  if (lower.includes('(free)')) tags.push('Free');
  if (lower.includes('(batch)') || lower.includes('batch')) tags.push('Batch');
  if (lower.includes('think') || lower.includes('reasoning')) tags.push('Reasoning');
  if (lower.includes('code') || lower.includes('coder') || lower.includes('codex')) tags.push('Code');
  if (lower.includes('image') || lower.includes('banana') || lower.includes('vision') || lower.includes('vl')) tags.push('Vision');
  if (lower.includes('fast')) tags.push('Fast');
  if (lower.includes('preview')) tags.push('Preview');
  if (lower.includes('latest')) tags.push('Latest');
  return tags;
}

function parseModelEntry(raw: string, index: number): CatalogModel {
  const { brand, name } = extractBrandAndName(raw);
  const provider = resolveProvider(brand, name);
  const { inPrice, outPrice } = calculatePricing(brand, name);
  const tags = extractTags(name, raw);
  const isFree = tags.includes('Free');

  // Slugify ID
  const idSlug = raw
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const isGoogleAutomated = provider === 'google' && !name.toLowerCase().includes('batch') && !name.toLowerCase().includes('image');
  const modelCode = isGoogleAutomated ? idSlug : resolveOpenRouterModel(raw);

  return {
    id: idSlug || `model-${index}`,
    rawName: raw,
    brand,
    name,
    modelCode: modelCode || idSlug,
    provider,
    isExternal: !isGoogleAutomated,
    inputPricePerMillion: inPrice,
    outputPricePerMillion: outPrice,
    tags,
    isFree,
  };
}

export const ALL_CATALOG_MODELS: CatalogModel[] = RAW_MODELS.map((raw, idx) =>
  parseModelEntry(raw, idx)
);

// Map of brand styling accents
export const BRAND_COLORS: Record<string, string> = {
  Google: 'indigo',
  OpenAI: 'emerald',
  Anthropic: 'amber',
  Qwen: 'purple',
  'Moonshot AI': 'pink',
  DeepSeek: 'sky',
  Meta: 'blue',
  Mistral: 'orange',
  xAI: 'zinc',
  SpaceXAI: 'zinc',
  Amazon: 'amber',
  Microsoft: 'cyan',
  Cohere: 'teal',
  'ByteDance Seed': 'rose',
  ByteDance: 'rose',
  MiniMax: 'violet',
  'Z.ai': 'yellow',
  NVIDIA: 'emerald',
  Perplexity: 'cyan',
  Tencent: 'blue',
  Xiaomi: 'orange',
  StepFun: 'rose',
  Nous: 'indigo',
  Poolside: 'teal',
  inclusionAI: 'emerald',
  AionLabs: 'blue',
  'Arcee AI': 'violet',
  IBM: 'blue',
  Kwaipilot: 'red',
  Upstage: 'yellow',
};

export function getBrandGroups(models: CatalogModel[] = ALL_CATALOG_MODELS): BrandGroup[] {
  const map = new Map<string, CatalogModel[]>();

  for (const m of models) {
    if (!map.has(m.brand)) {
      map.set(m.brand, []);
    }
    map.get(m.brand)!.push(m);
  }

  // Desired ordering of major frontier brands, then alphabetically
  const priorityOrder = [
    'Google',
    'OpenAI',
    'Anthropic',
    'DeepSeek',
    'Qwen',
    'xAI',
    'SpaceXAI',
    'Meta',
    'Mistral',
    'Moonshot AI',
    'Amazon',
    'Microsoft',
    'Cohere',
    'NVIDIA',
    'ByteDance Seed',
    'ByteDance',
    'MiniMax',
    'Z.ai',
    'Perplexity',
    'Poolside',
    'Nous',
    'Tencent',
    'Xiaomi',
    'StepFun',
    'AionLabs',
    'Arcee AI',
    'IBM',
    'inclusionAI',
    'Routers & Ensembles',
  ];

  const brandNames = Array.from(map.keys()).sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return brandNames.map((brand) => ({
    brand,
    brandColor: BRAND_COLORS[brand] || 'slate',
    models: map.get(brand)!,
  }));
}

export function findCatalogModel(modelQuery: string): CatalogModel | undefined {
  if (!modelQuery) return undefined;
  const q = modelQuery.trim().toLowerCase();
  
  // Exact ID or modelCode match
  const byId = ALL_CATALOG_MODELS.find(
    (m) => m.id === q || m.modelCode === q || m.rawName.toLowerCase() === q
  );
  if (byId) return byId;

  // Fuzzy substring match
  return ALL_CATALOG_MODELS.find(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.rawName.toLowerCase().includes(q) ||
      q.includes(m.id)
  );
}
