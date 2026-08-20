export interface ModelBrandInfo {
  brand: string;
  brandColor: string;
  displayName: string;
  modelCode: string;
  isFallback: boolean;
  isManualExternal: boolean;
  fallbackLabel?: string;
  statusType: 'primary' | 'fallback' | 'synthetic' | 'manual_external';
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

export interface ModelPreset {
  id: string;
  provider:
    | 'google'
    | 'anthropic'
    | 'openai'
    | 'deepseek'
    | 'moonshot'
    | 'qwen'
    | 'xai'
    | 'mistral'
    | 'microsoft'
    | 'amazon'
    | 'cohere'
    | 'meta'
    | 'custom';
  brand: string;
  name: string;
  modelCode: string;
  isExternal: boolean;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

export const MODEL_PRESETS: ModelPreset[] = [
  // Google Native
  {
    id: 'gemini-3.7-flash',
    provider: 'google',
    brand: 'Google',
    name: 'Gemini 3.7 Flash',
    modelCode: 'gemini-3.7-flash',
    isExternal: false,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'google',
    brand: 'Google',
    name: 'Gemini 2.5 Flash',
    modelCode: 'gemini-2.5-flash',
    isExternal: false,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    brand: 'Google',
    name: 'Gemini 2.5 Pro',
    modelCode: 'gemini-2.5-pro',
    isExternal: false,
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.00,
  },
  {
    id: 'gemini-3.1-flash-lite',
    provider: 'google',
    brand: 'Google',
    name: 'Gemini 3.1 Flash Lite',
    modelCode: 'gemini-3.1-flash-lite',
    isExternal: false,
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.30,
  },

  // xAI (External Copy & Paste / Grok)
  {
    id: 'grok-3',
    provider: 'xai',
    brand: 'xAI',
    name: 'Grok 3',
    modelCode: 'grok-3',
    isExternal: true,
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
  },
  {
    id: 'grok-3-mini',
    provider: 'xai',
    brand: 'xAI',
    name: 'Grok 3 Mini',
    modelCode: 'grok-3-mini',
    isExternal: true,
    inputPricePerMillion: 0.30,
    outputPricePerMillion: 1.20,
  },
  {
    id: 'grok-2',
    provider: 'xai',
    brand: 'xAI',
    name: 'Grok 2',
    modelCode: 'grok-2',
    isExternal: true,
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 10.00,
  },

  // Moonshot AI / Kimi (External Copy & Paste)
  {
    id: 'kimi-k1-5',
    provider: 'moonshot',
    brand: 'Moonshot AI',
    name: 'Kimi k1.5',
    modelCode: 'kimi-k1-5',
    isExternal: true,
    inputPricePerMillion: 1.00,
    outputPricePerMillion: 4.00,
  },
  {
    id: 'kimi-chat-128k',
    provider: 'moonshot',
    brand: 'Moonshot AI',
    name: 'Kimi Chat (128k)',
    modelCode: 'kimi-chat-128k',
    isExternal: true,
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 3.20,
  },

  // DeepSeek (External Copy & Paste)
  {
    id: 'deepseek-r1',
    provider: 'deepseek',
    brand: 'DeepSeek',
    name: 'DeepSeek R1',
    modelCode: 'deepseek-r1',
    isExternal: true,
    inputPricePerMillion: 0.55,
    outputPricePerMillion: 2.19,
  },
  {
    id: 'deepseek-v3',
    provider: 'deepseek',
    brand: 'DeepSeek',
    name: 'DeepSeek V3',
    modelCode: 'deepseek-v3',
    isExternal: true,
    inputPricePerMillion: 0.14,
    outputPricePerMillion: 0.28,
  },
  {
    id: 'deepseek-coder-v2',
    provider: 'deepseek',
    brand: 'DeepSeek',
    name: 'DeepSeek Coder V2',
    modelCode: 'deepseek-coder-v2',
    isExternal: true,
    inputPricePerMillion: 0.14,
    outputPricePerMillion: 0.28,
  },

  // Qwen / Alibaba Cloud (External Copy & Paste)
  {
    id: 'qwen-2-5-max',
    provider: 'qwen',
    brand: 'Alibaba (Qwen)',
    name: 'Qwen 2.5 Max',
    modelCode: 'qwen-2-5-max',
    isExternal: true,
    inputPricePerMillion: 1.60,
    outputPricePerMillion: 6.40,
  },
  {
    id: 'qwen-2-5-72b',
    provider: 'qwen',
    brand: 'Alibaba (Qwen)',
    name: 'Qwen 2.5 72B Instruct',
    modelCode: 'qwen-2-5-72b',
    isExternal: true,
    inputPricePerMillion: 0.35,
    outputPricePerMillion: 0.70,
  },
  {
    id: 'qwen-2-5-coder',
    provider: 'qwen',
    brand: 'Alibaba (Qwen)',
    name: 'Qwen 2.5 Coder (32B)',
    modelCode: 'qwen-2-5-coder',
    isExternal: true,
    inputPricePerMillion: 0.20,
    outputPricePerMillion: 0.40,
  },

  // Mistral AI (External Copy & Paste)
  {
    id: 'mistral-large-2',
    provider: 'mistral',
    brand: 'Mistral AI',
    name: 'Mistral Large 2',
    modelCode: 'mistral-large-2',
    isExternal: true,
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 6.00,
  },
  {
    id: 'codestral',
    provider: 'mistral',
    brand: 'Mistral AI',
    name: 'Codestral 2501',
    modelCode: 'codestral-2501',
    isExternal: true,
    inputPricePerMillion: 0.30,
    outputPricePerMillion: 0.90,
  },

  // Microsoft (External / Azure / Copilot)
  {
    id: 'phi-4',
    provider: 'microsoft',
    brand: 'Microsoft',
    name: 'Microsoft Phi-4 (14B)',
    modelCode: 'phi-4',
    isExternal: true,
    inputPricePerMillion: 0.10,
    outputPricePerMillion: 0.40,
  },
  {
    id: 'phi-3-5-moe',
    provider: 'microsoft',
    brand: 'Microsoft',
    name: 'Microsoft Phi-3.5 MoE',
    modelCode: 'phi-3-5-moe',
    isExternal: true,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
  },
  {
    id: 'phi-3-5-mini',
    provider: 'microsoft',
    brand: 'Microsoft',
    name: 'Microsoft Phi-3.5 Mini',
    modelCode: 'phi-3-5-mini',
    isExternal: true,
    inputPricePerMillion: 0.05,
    outputPricePerMillion: 0.15,
  },

  // Amazon (External / AWS Bedrock / Nova)
  {
    id: 'amazon-nova-pro',
    provider: 'amazon',
    brand: 'Amazon (AWS)',
    name: 'Amazon Nova Pro',
    modelCode: 'amazon-nova-pro',
    isExternal: true,
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 3.20,
  },
  {
    id: 'amazon-nova-lite',
    provider: 'amazon',
    brand: 'Amazon (AWS)',
    name: 'Amazon Nova Lite',
    modelCode: 'amazon-nova-lite',
    isExternal: true,
    inputPricePerMillion: 0.06,
    outputPricePerMillion: 0.24,
  },
  {
    id: 'amazon-nova-micro',
    provider: 'amazon',
    brand: 'Amazon (AWS)',
    name: 'Amazon Nova Micro',
    modelCode: 'amazon-nova-micro',
    isExternal: true,
    inputPricePerMillion: 0.035,
    outputPricePerMillion: 0.14,
  },

  // 01.AI (Yi)
  {
    id: 'yi-lightning',
    provider: 'custom',
    brand: '01.AI (Yi)',
    name: 'Yi-Lightning',
    modelCode: 'yi-lightning',
    isExternal: true,
    inputPricePerMillion: 0.14,
    outputPricePerMillion: 0.14,
  },

  // Cohere
  {
    id: 'command-r-plus',
    provider: 'cohere',
    brand: 'Cohere',
    name: 'Command R+',
    modelCode: 'command-r-plus',
    isExternal: true,
    inputPricePerMillion: 2.50,
    outputPricePerMillion: 10.00,
  },

  // Anthropic (External Copy & Paste)
  {
    id: 'claude-3-7-sonnet',
    provider: 'anthropic',
    brand: 'Anthropic',
    name: 'Claude 3.7 Sonnet',
    modelCode: 'claude-3-7-sonnet',
    isExternal: true,
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
  },
  {
    id: 'claude-3-5-sonnet',
    provider: 'anthropic',
    brand: 'Anthropic',
    name: 'Claude 3.5 Sonnet',
    modelCode: 'claude-3-5-sonnet',
    isExternal: true,
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
  },
  {
    id: 'claude-3-5-haiku',
    provider: 'anthropic',
    brand: 'Anthropic',
    name: 'Claude 3.5 Haiku',
    modelCode: 'claude-3-5-haiku',
    isExternal: true,
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 4.00,
  },

  // OpenAI (External Copy & Paste)
  {
    id: 'gpt-4o',
    provider: 'openai',
    brand: 'OpenAI',
    name: 'GPT-4o',
    modelCode: 'gpt-4o',
    isExternal: true,
    inputPricePerMillion: 2.50,
    outputPricePerMillion: 10.00,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    brand: 'OpenAI',
    name: 'GPT-4o Mini',
    modelCode: 'gpt-4o-mini',
    isExternal: true,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.60,
  },
  {
    id: 'o3-mini',
    provider: 'openai',
    brand: 'OpenAI',
    name: 'o3-mini',
    modelCode: 'o3-mini',
    isExternal: true,
    inputPricePerMillion: 1.10,
    outputPricePerMillion: 4.40,
  },

  // DeepSeek (External Copy & Paste)
  {
    id: 'deepseek-r1',
    provider: 'deepseek',
    brand: 'DeepSeek',
    name: 'DeepSeek R1',
    modelCode: 'deepseek-r1',
    isExternal: true,
    inputPricePerMillion: 0.55,
    outputPricePerMillion: 2.19,
  },
  {
    id: 'deepseek-v3',
    provider: 'deepseek',
    brand: 'DeepSeek',
    name: 'DeepSeek V3',
    modelCode: 'deepseek-v3',
    isExternal: true,
    inputPricePerMillion: 0.14,
    outputPricePerMillion: 0.28,
  },

  // Meta (External Copy & Paste)
  {
    id: 'llama-3-3-70b',
    provider: 'meta',
    brand: 'Meta',
    name: 'Llama 3.3 (70B)',
    modelCode: 'llama-3.3-70b',
    isExternal: true,
    inputPricePerMillion: 0.50,
    outputPricePerMillion: 0.80,
  },

  // Custom User-Defined
  {
    id: 'custom-external',
    provider: 'custom',
    brand: 'Custom / Other',
    name: 'Custom Model',
    modelCode: 'custom-external-model',
    isExternal: true,
    inputPricePerMillion: 1.00,
    outputPricePerMillion: 3.00,
  },
];

export function parseModelBrandInfo(
  configuredModel: string,
  actualModelUsed?: string | null,
  isManualExternal?: boolean,
  customBrand?: string,
  customModel?: string
): ModelBrandInfo {
  const model = (actualModelUsed || configuredModel || 'gemini-3.7-flash').toLowerCase();
  const configured = (configuredModel || 'gemini-3.7-flash').toLowerCase();

  let brand = customBrand || 'Google';
  let brandColor = 'indigo';
  let displayName = customModel || 'Gemini 3.7 Flash';
  let statusType: 'primary' | 'fallback' | 'synthetic' | 'manual_external' = isManualExternal
    ? 'manual_external'
    : 'primary';
  let fallbackLabel: string | undefined = undefined;
  let inputPrice = 0.15;
  let outputPrice = 0.60;

  // Match against known preset by code or ID
  const matchedPreset = MODEL_PRESETS.find(
    (p) => p.modelCode.toLowerCase() === model || p.id.toLowerCase() === model || model.includes(p.id)
  );

  if (matchedPreset) {
    brand = matchedPreset.brand;
    displayName = matchedPreset.name;
    inputPrice = matchedPreset.inputPricePerMillion;
    outputPrice = matchedPreset.outputPricePerMillion;
    if (matchedPreset.provider === 'xai') brandColor = 'zinc';
    else if (matchedPreset.provider === 'moonshot') brandColor = 'rose';
    else if (matchedPreset.provider === 'qwen') brandColor = 'orange';
    else if (matchedPreset.provider === 'mistral') brandColor = 'amber';
    else if (matchedPreset.provider === 'microsoft') brandColor = 'cyan';
    else if (matchedPreset.provider === 'amazon') brandColor = 'amber';
    else if (matchedPreset.provider === 'cohere') brandColor = 'teal';
    else if (matchedPreset.provider === 'anthropic') brandColor = 'amber';
    else if (matchedPreset.provider === 'openai') brandColor = 'emerald';
    else if (matchedPreset.provider === 'deepseek') brandColor = 'sky';
    else if (matchedPreset.provider === 'meta') brandColor = 'blue';
    else if (matchedPreset.provider === 'custom') brandColor = 'purple';
    else brandColor = 'indigo';
  } else if (model.includes('phi-') || model.includes('microsoft')) {
    brand = 'Microsoft';
    brandColor = 'cyan';
    displayName = customModel || (model.includes('3-5-mini') ? 'Microsoft Phi-3.5 Mini' : model.includes('moe') ? 'Microsoft Phi-3.5 MoE' : 'Microsoft Phi-4');
    inputPrice = model.includes('mini') ? 0.05 : model.includes('moe') ? 0.15 : 0.10;
    outputPrice = model.includes('mini') ? 0.15 : model.includes('moe') ? 0.60 : 0.40;
  } else if (model.includes('nova-') || model.includes('amazon') || model.includes('bedrock')) {
    brand = 'Amazon (AWS)';
    brandColor = 'amber';
    displayName = customModel || (model.includes('lite') ? 'Amazon Nova Lite' : model.includes('micro') ? 'Amazon Nova Micro' : 'Amazon Nova Pro');
    inputPrice = model.includes('lite') ? 0.06 : model.includes('micro') ? 0.035 : 0.80;
    outputPrice = model.includes('lite') ? 0.24 : model.includes('micro') ? 0.14 : 3.20;
  } else if (model.includes('kimi') || model.includes('moonshot')) {
    brand = 'Moonshot AI';
    brandColor = 'rose';
    displayName = customModel || (model.includes('128k') ? 'Kimi Chat (128k)' : 'Kimi k1.5');
    inputPrice = model.includes('128k') ? 0.80 : 1.00;
    outputPrice = model.includes('128k') ? 3.20 : 4.00;
  } else if (model.includes('qwen')) {
    brand = 'Alibaba (Qwen)';
    brandColor = 'orange';
    displayName = customModel || (model.includes('max') ? 'Qwen 2.5 Max' : model.includes('coder') ? 'Qwen 2.5 Coder' : 'Qwen 2.5 72B');
    inputPrice = model.includes('max') ? 1.60 : 0.35;
    outputPrice = model.includes('max') ? 6.40 : 0.70;
  } else if (model.includes('mistral') || model.includes('codestral')) {
    brand = 'Mistral AI';
    brandColor = 'amber';
    displayName = customModel || (model.includes('codestral') ? 'Codestral 2501' : 'Mistral Large 2');
    inputPrice = model.includes('codestral') ? 0.30 : 2.00;
    outputPrice = model.includes('codestral') ? 0.90 : 6.00;
  } else if (model.includes('yi-') || model.includes('01.ai')) {
    brand = '01.AI (Yi)';
    brandColor = 'violet';
    displayName = customModel || 'Yi-Lightning';
    inputPrice = 0.14;
    outputPrice = 0.14;
  } else if (model.includes('cohere') || model.includes('command-r')) {
    brand = 'Cohere';
    brandColor = 'teal';
    displayName = customModel || 'Command R+';
    inputPrice = 2.50;
    outputPrice = 10.00;
  } else if (model.includes('grok') || model.includes('xai')) {
    brand = 'xAI';
    brandColor = 'zinc';
    displayName = customModel || (model.includes('mini') ? 'Grok 3 Mini' : model.includes('2') ? 'Grok 2' : 'Grok 3');
    inputPrice = model.includes('mini') ? 0.30 : 3.00;
    outputPrice = model.includes('mini') ? 1.20 : 15.00;
  } else if (model.includes('claude')) {
    brand = 'Anthropic';
    brandColor = 'amber';
    displayName = customModel || 'Claude 3.7 Sonnet';
    inputPrice = 3.00;
    outputPrice = 15.00;
  } else if (model.includes('gpt') || model.includes('openai') || model.includes('o3') || model.includes('o1')) {
    brand = 'OpenAI';
    brandColor = 'emerald';
    displayName = customModel || 'GPT-4o';
    inputPrice = 2.50;
    outputPrice = 10.00;
  } else if (model.includes('deepseek')) {
    brand = 'DeepSeek';
    brandColor = 'sky';
    displayName = customModel || 'DeepSeek R1';
    inputPrice = 0.55;
    outputPrice = 2.19;
  } else if (model.includes('gemini-2.5-pro')) {
    brand = 'Google';
    brandColor = 'purple';
    displayName = 'Gemini 2.5 Pro';
    inputPrice = 1.25;
    outputPrice = 5.00;
  } else if (model.includes('gemini-2.5-flash')) {
    brand = 'Google';
    brandColor = 'blue';
    displayName = 'Gemini 2.5 Flash';
    inputPrice = 0.15;
    outputPrice = 0.60;
  } else if (model.includes('gemini-3.1-flash-lite')) {
    brand = 'Google';
    brandColor = 'cyan';
    displayName = 'Gemini 3.1 Flash Lite';
    inputPrice = 0.075;
    outputPrice = 0.30;
  } else if (model.includes('custom') || isManualExternal) {
    brand = customBrand || 'External';
    brandColor = 'purple';
    displayName = customModel || 'External Model';
    inputPrice = 1.50;
    outputPrice = 5.00;
  }

  // Detect fallback or resilient engine engagement
  const isSynthetic = model.includes('resilient-engine') || model.includes('synthetic');
  const isDifferentModel =
    !isManualExternal &&
    actualModelUsed &&
    !actualModelUsed.includes(configured) &&
    !configured.includes(actualModelUsed);

  if (isManualExternal) {
    statusType = 'manual_external';
    fallbackLabel = 'External User Input (Copy/Paste)';
  } else if (isSynthetic) {
    statusType = 'synthetic';
    fallbackLabel = 'Resilient Analytical Mode';
  } else if (isDifferentModel) {
    statusType = 'fallback';
    fallbackLabel = `Auto-Failover from ${configured}`;
  } else {
    statusType = 'primary';
  }

  return {
    brand,
    brandColor,
    displayName,
    modelCode: actualModelUsed || configuredModel,
    isFallback: statusType === 'fallback' || statusType === 'synthetic',
    isManualExternal: isManualExternal || statusType === 'manual_external',
    fallbackLabel,
    statusType,
    inputPricePerMillion: inputPrice,
    outputPricePerMillion: outputPrice,
  };
}

/**
 * Guestimate tokens for prompt text and response text
 * Rule of thumb: ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.max(1, Math.round(text.length / 4));
}

/**
 * Guestimates inference cost in USD for given token counts and model pricing
 */
export function guestimateCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number = 0.15,
  outputPricePerMillion: number = 0.60
): number {
  const inCost = (inputTokens * inputPricePerMillion) / 1_000_000;
  const outCost = (outputTokens * outputPricePerMillion) / 1_000_000;
  return inCost + outCost;
}

/**
 * Generates the full formatted prompt text ready to be copied into Claude/ChatGPT/DeepSeek
 */
export function generateExternalPromptText(
  problem: {
    topic: string;
    title: string;
    difficulty: string;
    question: string;
    expectedFormat: string;
  },
  agentName: string,
  partnerName: string,
  history: Array<{ sender: string; text: string; isCurrentAgent: boolean }>,
  currentTurn: number,
  maxTurns: number,
  isUncapped: boolean
): string {
  const turnProtocol = isUncapped
    ? `Turn ${currentTurn + 1} (Uncapped consensus mode - collaborate until reaching verified agreement without unnecessary loops).`
    : `Turn ${currentTurn + 1} of ${maxTurns} maximum turns.`;

  let prompt = `You are ${agentName}, collaborating with ${partnerName} on a rigorous benchmark challenge in ${problem.topic.toUpperCase()}.

[PROBLEM STATEMENT]
Topic: ${problem.topic.toUpperCase()}
Title: ${problem.title}
Difficulty: ${problem.difficulty}

${problem.question}

[RULES OF ENGAGEMENT]
1. You and ${partnerName} must actively share ideas, verify calculations, challenge dubious assumptions, and converge on the single ground-truth solution.
2. Keep your conversational response concise, substantive, and productive (no excessive greetings or pleasantries). Get straight to the mathematical/logical/strategic reasoning.
3. ${turnProtocol}
4. When you and your partner have verified and mutually agreed on the solution, you MUST state your final concluded answer at the end of your response in the exact format:
   ${problem.expectedFormat}
5. Do NOT include FINAL ANSWER: [...] until you are genuinely confident and in agreement with your partner.`;

  if (history && history.length > 0) {
    prompt += `\n\n[CONVERSATION HISTORY SO FAR]\n`;
    for (const item of history) {
      prompt += `\n${item.sender}: ${item.text}\n`;
    }
    prompt += `\nNow, provide your next analytical turn as ${agentName}:`;
  } else {
    prompt += `\n\nThis is Turn 1. As ${agentName}, please provide your initial mathematical breakdown, steps, or hypothesis to begin collaborating with ${partnerName}:`;
  }

  return prompt;
}
