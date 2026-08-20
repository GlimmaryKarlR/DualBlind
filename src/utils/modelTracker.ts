export interface ModelBrandInfo {
  brand: string;
  brandColor: string;
  displayName: string;
  modelCode: string;
  isFallback: boolean;
  fallbackLabel?: string;
  statusType: 'primary' | 'fallback' | 'synthetic';
}

export function parseModelBrandInfo(
  configuredModel: string,
  actualModelUsed?: string | null
): ModelBrandInfo {
  const model = (actualModelUsed || configuredModel || 'gemini-3.7-flash').toLowerCase();
  const configured = (configuredModel || 'gemini-3.7-flash').toLowerCase();

  let brand = 'Google';
  let brandColor = 'indigo';
  let displayName = 'Gemini 3.7 Flash';
  let statusType: 'primary' | 'fallback' | 'synthetic' = 'primary';
  let fallbackLabel: string | undefined = undefined;

  // Determine Brand & Display Name
  if (model.includes('gemini-3.7-flash')) {
    brand = 'Google';
    brandColor = 'indigo';
    displayName = 'Gemini 3.7 Flash';
  } else if (model.includes('gemini-2.5-flash')) {
    brand = 'Google';
    brandColor = 'blue';
    displayName = 'Gemini 2.5 Flash';
  } else if (model.includes('gemini-flash-latest')) {
    brand = 'Google';
    brandColor = 'violet';
    displayName = 'Gemini Flash Latest';
  } else if (model.includes('gemini-3.1-flash-lite') || model.includes('flash-lite')) {
    brand = 'Google';
    brandColor = 'cyan';
    displayName = 'Gemini 3.1 Flash Lite';
  } else if (model.includes('gemini-2.5-pro') || model.includes('pro')) {
    brand = 'Google';
    brandColor = 'purple';
    displayName = 'Gemini 2.5 Pro';
  } else if (model.includes('claude')) {
    brand = 'Anthropic';
    brandColor = 'amber';
    displayName = 'Claude 3.7 Sonnet';
  } else if (model.includes('gpt') || model.includes('openai')) {
    brand = 'OpenAI';
    brandColor = 'emerald';
    displayName = 'GPT-4o';
  } else if (model.includes('deepseek')) {
    brand = 'DeepSeek';
    brandColor = 'sky';
    displayName = 'DeepSeek R1';
  } else {
    brand = 'Google';
    brandColor = 'slate';
    displayName = model;
  }

  // Detect fallback or resilient engine engagement
  const isSynthetic = model.includes('resilient-engine') || model.includes('synthetic');
  const isDifferentModel = actualModelUsed && !actualModelUsed.includes(configured) && !configured.includes(actualModelUsed);

  if (isSynthetic) {
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
    isFallback: statusType !== 'primary',
    fallbackLabel,
    statusType,
  };
}
