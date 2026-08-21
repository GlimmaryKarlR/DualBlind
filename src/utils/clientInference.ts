import { AgentConfig, BenchmarkProblem, ChatTurn, ProviderApiKeys } from '../types/benchmark';
import { calculateTokenCost } from './formatters';

export interface TurnGenerationResult {
  content: string;
  extractedFinalAnswer: string | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  tokensPerSec: number;
  modelUsed: string;
}

/**
 * Extracts final consensus claim from text
 * Matches patterns like FINAL ANSWER: [42] or ANSWER: \boxed{42}
 */
export function extractFinalAnswer(text: string): string | null {
  if (!text) return null;
  // Match FINAL ANSWER:\s*\[(.*?)\] (case-insensitive)
  const bracketMatch = text.match(/FINAL\s+ANSWER\s*:\s*\[(.*?)\]/i);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1].trim();
  }

  // Match FINAL ANSWER:\s*\\boxed\{(.*?)\}
  const boxedMatch = text.match(/FINAL\s+ANSWER\s*:\s*\\boxed\{([^}]+)\}/i);
  if (boxedMatch && boxedMatch[1]) {
    return boxedMatch[1].trim();
  }

  // Match FINAL ANSWER:\s*(.*?)($|\n)
  const lineMatch = text.match(/FINAL\s+ANSWER\s*:\s*([^\n\r.]+)/i);
  if (lineMatch && lineMatch[1]) {
    const cleaned = lineMatch[1].replace(/^[\[\("']|[\]\)"']$/g, '').trim();
    if (cleaned.length > 0 && cleaned.length < 120) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Normalizes Gemini model names for Generative Language API
 */
function resolveGoogleModel(modelName: string): string {
  const m = (modelName || '').toLowerCase().trim();
  if (m.includes('3.7-flash') || m.includes('3-7-flash')) return 'gemini-3.7-flash';
  if (m.includes('3.1-pro') || m.includes('3-1-pro') || m.includes('pro')) return 'gemini-3.1-pro-preview';
  if (m.includes('3.1-flash-lite') || m.includes('flash-lite') || m.includes('lite')) return 'gemini-3.1-flash-lite';
  if (m.includes('flash-latest') || m.includes('latest')) return 'gemini-flash-latest';
  if (m.startsWith('gemini-') || m.startsWith('models/gemini-')) {
    return m.replace(/^models\//, '');
  }
  return 'gemini-3.7-flash';
}

/**
 * Maps short model keys, catalog IDs, and display names to valid OpenRouter identifier slugs.
 * OpenRouter strictly requires format: "author/model-name" (e.g. "x-ai/grok-2-1212", "deepseek/deepseek-r1").
 */
export function resolveOpenRouterModel(modelName: string): string {
  const m = (modelName || '').trim();
  if (!m) return 'google/gemini-2.0-flash-001';
  if (m.includes('/') && !m.includes(' ')) return m; // Already an exact provider slug

  const lower = m.toLowerCase().replace(/[^a-z0-9.]+/g, '-');

  // 1. xAI & SpaceXAI
  if (lower.includes('grok-3-mini')) return 'x-ai/grok-3-mini';
  if (lower.includes('grok-3')) return 'x-ai/grok-3';
  if (lower.includes('grok-vision') || lower.includes('grok-2-vision')) return 'x-ai/grok-2-vision-1212';
  if (lower.includes('grok') || lower.includes('xai') || lower.includes('spacexai')) return 'x-ai/grok-2-1212';

  // 2. Anthropic Claude
  if (lower.includes('claude-3-7') || lower.includes('claude-3.7')) return 'anthropic/claude-3.7-sonnet';
  if (lower.includes('claude-3-5-sonnet') || lower.includes('claude-3.5-sonnet') || lower.includes('sonnet-4') || lower.includes('sonnet-5') || lower.includes('sonnet-latest') || lower.includes('sonnet')) return 'anthropic/claude-3.5-sonnet';
  if (lower.includes('claude-3-5-haiku') || lower.includes('claude-3.5-haiku') || lower.includes('haiku-4') || lower.includes('haiku-latest') || lower.includes('haiku')) return 'anthropic/claude-3.5-haiku';
  if (lower.includes('opus') || lower.includes('fable')) return 'anthropic/claude-3-opus';
  if (lower.includes('claude')) return 'anthropic/claude-3.5-sonnet';

  // 3. DeepSeek
  if (lower.includes('r1') || lower.includes('reasoner')) return 'deepseek/deepseek-r1';
  if (lower.includes('v4') || lower.includes('v3') || lower.includes('deepseek-chat') || lower.includes('deepseek')) return 'deepseek/deepseek-chat';
  if (lower.includes('coder')) return 'deepseek/deepseek-coder';

  // 4. OpenAI
  if (lower.includes('o3-mini') || lower.includes('o3')) return 'openai/o3-mini';
  if (lower.includes('o1-pro') || lower.includes('o1-mini') || lower.includes('o1') || lower.includes('o4')) return 'openai/o1';
  if (lower.includes('gpt-4o-mini') || lower.includes('audio-mini')) return 'openai/gpt-4o-mini';
  if (lower.includes('gpt-4o') || lower.includes('gpt-5') || lower.includes('gpt-4') || lower.includes('chat-latest') || lower.includes('openai')) return 'openai/gpt-4o';
  if (lower.includes('gpt-3.5')) return 'openai/gpt-3.5-turbo';

  // 5. Meta Llama
  if (lower.includes('llama-3.3') || lower.includes('llama-3-3') || lower.includes('llama-4') || lower.includes('maverick') || lower.includes('scout')) return 'meta-llama/llama-3.3-70b-instruct';
  if (lower.includes('llama-3.1-405b') || lower.includes('llama-3-1-405b') || lower.includes('405b')) return 'meta-llama/llama-3.1-405b-instruct';
  if (lower.includes('llama-3.1-70b') || lower.includes('llama-3-1-70b') || lower.includes('70b')) return 'meta-llama/llama-3.1-70b-instruct';
  if (lower.includes('llama-3.1-8b') || lower.includes('llama-3-1-8b') || lower.includes('llama-3.2') || lower.includes('8b')) return 'meta-llama/llama-3.1-8b-instruct';
  if (lower.includes('llama')) return 'meta-llama/llama-3.3-70b-instruct';

  // 6. Qwen / Alibaba
  if (lower.includes('coder') && lower.includes('qwen')) return 'qwen/qwen-2.5-coder-32b-instruct';
  if (lower.includes('qwen2.5-72b') || lower.includes('qwen-2-5-72b') || lower.includes('qwen3') || lower.includes('qwen-plus') || lower.includes('qwen-max') || lower.includes('qwen')) return 'qwen/qwen-2.5-72b-instruct';

  // 7. Mistral AI
  if (lower.includes('codestral')) return 'mistralai/codestral-2501';
  if (lower.includes('ministral')) return 'mistralai/ministral-8b';
  if (lower.includes('nemo')) return 'mistralai/mistral-nemo';
  if (lower.includes('small')) return 'mistralai/mistral-small-24b-instruct-2501';
  if (lower.includes('mistral') || lower.includes('mixtral')) return 'mistralai/mistral-large-2411';

  // 8. Google via OpenRouter
  if (lower.includes('gemini-2.5-pro') || lower.includes('gemini-3.1-pro') || lower.includes('gemini-pro')) return 'google/gemini-pro-1.5';
  if (lower.includes('gemini-2.0-flash') || lower.includes('gemini-3.7-flash') || lower.includes('gemini-flash') || lower.includes('gemini')) return 'google/gemini-2.0-flash-001';
  if (lower.includes('gemma-2-27b') || lower.includes('gemma')) return 'google/gemma-2-27b-it';

  // 9. Microsoft
  if (lower.includes('phi-4') || lower.includes('phi4')) return 'microsoft/phi-4';
  if (lower.includes('phi-3') || lower.includes('phi3')) return 'microsoft/phi-3.5-mini-128k-instruct';
  if (lower.includes('wizardlm')) return 'microsoft/wizardlm-2-8x22b';

  // 10. Amazon Nova
  if (lower.includes('nova-pro') || lower.includes('nova-premier')) return 'amazon/nova-pro-v1';
  if (lower.includes('nova-micro')) return 'amazon/nova-micro-v1';
  if (lower.includes('nova')) return 'amazon/nova-lite-v1';

  // 11. Cohere
  if (lower.includes('command-r-plus') || lower.includes('command-r+')) return 'cohere/command-r-plus-08-2024';
  if (lower.includes('command')) return 'cohere/command-r-08-2024';

  // 12. Moonshot / Kimi
  if (lower.includes('kimi') || lower.includes('moonshot')) return 'moonshotai/moonshot-v1-128k';

  // 13. MiniMax
  if (lower.includes('minimax')) return 'minimax/minimax-01';

  // 14. Perplexity
  if (lower.includes('sonar') || lower.includes('perplexity')) return 'perplexity/sonar';

  // 15. Nous
  if (lower.includes('hermes') || lower.includes('nous')) return 'nousresearch/hermes-3-llama-3.1-405b';

  // 16. Z.ai / GLM
  if (lower.includes('glm')) return 'thudm/glm-4-9b-chat';

  // Fallback to general high-speed reasoning model
  return 'google/gemini-2.0-flash-001';
}

/**
 * Directly calls Google Gemini REST API from the browser
 */
async function callGoogleDirect(
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  temperature: number = 0.4
): Promise<{ text: string; inputTokens: number; outputTokens: number; modelUsed: string }> {
  const targetModel = resolveGoogleModel(modelName);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: Math.min(Math.max(temperature, 0), 1.0),
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData?.error?.message ||
      `Google Gemini API returned HTTP ${response.status} (${response.statusText})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate || !candidate.content?.parts?.length) {
    throw new Error('Google Gemini API returned an empty candidate response.');
  }

  const text = candidate.content.parts.map((p: any) => p.text || '').join('');
  const usage = data.usageMetadata || {};
  const inputTokens = usage.promptTokenCount || Math.max(20, Math.round(text.length * 0.4));
  const outputTokens = usage.candidatesTokenCount || Math.max(10, Math.round(text.length * 0.3));

  return {
    text,
    inputTokens,
    outputTokens,
    modelUsed: targetModel,
  };
}

/**
 * Directly calls OpenAI or OpenAI-compatible REST API from the browser
 */
async function callOpenAICompatibleDirect(
  endpoint: string,
  apiKey: string,
  modelName: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.4
): Promise<{ text: string; inputTokens: number; outputTokens: number; modelUsed: string }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: Math.min(Math.max(temperature, 0), 1.0),
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData?.error?.message ||
      `${modelName} endpoint returned HTTP ${response.status} (${response.statusText})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  // Extract regular content or fallback to reasoning output (DeepSeek-R1, Novita, etc.)
  let text = message?.content || choice?.text || '';

  if (!text.trim() && message) {
    const reasoning = message.reasoning || message.reasoning_content;
    if (reasoning) {
      text = `<think>\n${reasoning}\n</think>`;
    }
  }

  if (!text.trim()) {
    throw new Error(`Model ${modelName} returned an empty response body.`);
  }

  const usage = data.usage || {};
  const inputTokens = usage.prompt_tokens || Math.max(20, Math.round(text.length * 0.4));
  const outputTokens = usage.completion_tokens || Math.max(10, Math.round(text.length * 0.3));

  return {
    text,
    inputTokens,
    outputTokens,
    modelUsed: data.model || modelName,
  };
}

/**
 * Directly calls Anthropic Claude REST API from the browser
 */
async function callAnthropicDirect(
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number = 0.4
): Promise<{ text: string; inputTokens: number; outputTokens: number; modelUsed: string }> {
  const anthropicMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: modelName || 'claude-3-7-sonnet-20250219',
      max_tokens: 2048,
      temperature: Math.min(Math.max(temperature, 0), 1.0),
      system: systemInstruction,
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg =
      errorData?.error?.message ||
      `Anthropic API returned HTTP ${response.status} (${response.statusText})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('');

  const inputTokens = data.usage?.input_tokens || Math.max(20, Math.round(text.length * 0.4));
  const outputTokens = data.usage?.output_tokens || Math.max(10, Math.round(text.length * 0.3));

  return {
    text,
    inputTokens,
    outputTokens,
    modelUsed: data.model || modelName,
  };
}

/**
 * Generates an agent dialogue turn directly inside the client
 */
export async function generateTurnDirectClient(options: {
  problem: BenchmarkProblem;
  agent: AgentConfig;
  partnerName: string;
  history: Array<{ sender: string; text: string; isCurrentAgent: boolean }>;
  currentTurn: number;
  maxTurnsPerAgent: number;
  isUncapped: boolean;
  apiKeys: ProviderApiKeys;
}): Promise<TurnGenerationResult> {
  const startTime = Date.now();
  const {
    problem,
    agent,
    partnerName,
    history,
    currentTurn,
    maxTurnsPerAgent,
    isUncapped,
    apiKeys,
  } = options;

  const turnConstraint = isUncapped
    ? `3. TURN PROTOCOL: This is turn ${currentTurn + 1}. There is NO artificial turn cap. You and ${partnerName} must converse, verify calculations, and resolve any discrepancies until you reach genuine consensus. Work diligently and avoid wasteful loops, because inference token cost and time-to-consensus are being measured.`
    : `3. This is turn ${currentTurn + 1} (Max limit is ${maxTurnsPerAgent || 5} turns per participant).`;

  const systemInstruction = `You are ${agent.name}, an expert analytical problem solver collaborating with your partner, ${partnerName}.
You are working together on a high-stakes benchmark challenge in ${problem.topic.toUpperCase()}.

RULES OF ENGAGEMENT:
1. You and ${partnerName} must actively share ideas, verify calculations, challenge dubious assumptions, and converge on the single ground-truth solution.
2. Keep your conversational turns concise, substantive, and productive (no excessive greetings or pleasantries). Get straight to the mathematical/logical/strategic reasoning.
${turnConstraint}
4. When you and your partner have verified and mutually agreed on the solution, you MUST state your final concluded answer at the end of your response in the exact format:
   ${problem.expectedFormat}
5. Do NOT include FINAL ANSWER: [...] until you are genuinely confident and in agreement with your partner, or if you are resolving a conclusive proof.
${agent.systemPromptModifier ? `\nAgent Specialty: ${agent.systemPromptModifier}` : ''}`;

  const provider = (agent.provider || 'google').toLowerCase();

  // Prepare standard OpenAI messages format
  const chatMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemInstruction },
    {
      role: 'user',
      content: `[BENCHMARK CHALLENGE - TOPIC: ${problem.topic.toUpperCase()}]\nTitle: ${problem.title}\nDifficulty: ${problem.difficulty}\n\nProblem Statement:\n${problem.question}\n\n${partnerName} and you should now discuss this problem and reach a definitive final answer in the format: ${problem.expectedFormat}.`,
    },
  ];

  if (Array.isArray(history) && history.length > 0) {
    for (const item of history) {
      if (item.isCurrentAgent) {
        chatMessages.push({ role: 'assistant', content: item.text });
      } else {
        chatMessages.push({ role: 'user', content: `${item.sender}: ${item.text}` });
      }
    }
  } else {
    chatMessages.push({
      role: 'user',
      content: `Hello ${agent.name}, let's solve this challenge together. What are your initial thoughts or calculation steps on this problem?`,
    });
  }

  let textResult = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let modelUsed = agent.model || 'gemini-3.7-flash';

  // Execution routing
  if (provider === 'google' && apiKeys.google) {
    const googleKey = apiKeys.google || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
    if (!googleKey) {
      throw new Error(
        'Google Gemini API key is not configured. Please open the "APIs & Tokens" locker and enter your key.'
      );
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    contents.push({
      role: 'user',
      parts: [
        {
          text: `[BENCHMARK CHALLENGE - TOPIC: ${problem.topic.toUpperCase()}]\nTitle: ${problem.title}\nDifficulty: ${problem.difficulty}\n\nProblem Statement:\n${problem.question}\n\n${partnerName} and you should now discuss this problem and reach a definitive final answer in the format: ${problem.expectedFormat}.`,
        },
      ],
    });

    if (Array.isArray(history) && history.length > 0) {
      for (const item of history) {
        contents.push({
          role: item.isCurrentAgent ? 'model' : 'user',
          parts: [{ text: item.isCurrentAgent ? item.text : `${item.sender}: ${item.text}` }],
        });
      }
    } else {
      contents.push({
        role: 'user',
        parts: [
          {
            text: `Hello ${agent.name}, let's solve this challenge together. What are your initial thoughts or calculation steps on this problem?`,
          },
        ],
      });
    }

    const googleRes = await callGoogleDirect(
      googleKey,
      agent.model || 'gemini-3.7-flash',
      systemInstruction,
      contents,
      agent.temperature ?? 0.4
    );
    textResult = googleRes.text;
    inputTokens = googleRes.inputTokens;
    outputTokens = googleRes.outputTokens;
    modelUsed = googleRes.modelUsed;
  } else if (provider === 'openai' && apiKeys.openai) {
    const res = await callOpenAICompatibleDirect(
      'https://api.openai.com/v1/chat/completions',
      apiKeys.openai,
      agent.model || 'gpt-4o',
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (provider === 'anthropic' && apiKeys.anthropic) {
    const res = await callAnthropicDirect(
      apiKeys.anthropic,
      agent.model || 'claude-3-7-sonnet-20250219',
      systemInstruction,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (provider === 'deepseek' && apiKeys.deepseek) {
    const targetModel = agent.model === 'deepseek-r1' ? 'deepseek-reasoner' : 'deepseek-chat';
    const res = await callOpenAICompatibleDirect(
      'https://api.deepseek.com/chat/completions',
      apiKeys.deepseek,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (provider === 'moonshot' && apiKeys.moonshot) {
    const targetModel = agent.model === 'kimi-k1-5' ? 'moonshot-v1-128k' : 'moonshot-v1-32k';
    const res = await callOpenAICompatibleDirect(
      'https://api.moonshot.cn/v1/chat/completions',
      apiKeys.moonshot,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (provider === 'qwen' && apiKeys.qwen) {
    const targetModel = agent.model === 'qwen-2-5-max' ? 'qwen-max' : 'qwen-plus';
    const res = await callOpenAICompatibleDirect(
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
      apiKeys.qwen,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (provider === 'xai' && apiKeys.xai) {
    const targetModel = agent.model === 'grok-3-mini' ? 'grok-3-mini' : 'grok-2-1212';
    const res = await callOpenAICompatibleDirect(
      'https://api.x.ai/v1/chat/completions',
      apiKeys.xai,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (provider === 'mistral' && apiKeys.mistral) {
    const targetModel = agent.model === 'codestral' ? 'codestral-latest' : 'mistral-large-latest';
    const res = await callOpenAICompatibleDirect(
      'https://api.mistral.ai/v1/chat/completions',
      apiKeys.mistral,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (apiKeys.openrouter) {
    // OpenRouter fallback for all providers
    const targetModel = resolveOpenRouterModel(agent.model);
    const res = await callOpenAICompatibleDirect(
      'https://openrouter.ai/api/v1/chat/completions',
      apiKeys.openrouter,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (apiKeys.customEndpoint?.baseUrl && apiKeys.customEndpoint.apiKey) {
    const endpoint = `${apiKeys.customEndpoint.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const res = await callOpenAICompatibleDirect(
      endpoint,
      apiKeys.customEndpoint.apiKey,
      apiKeys.customEndpoint.modelName || agent.model || 'custom-llm',
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (apiKeys.google) {
    // Secondary fallback to Google Gemini if present
    const googleRes = await callGoogleDirect(
      apiKeys.google,
      agent.model || 'gemini-3.7-flash',
      systemInstruction,
      [
        {
          role: 'user',
          parts: [
            {
              text: `Problem: ${problem.question}\nDiscuss with ${partnerName} and conclude with ${problem.expectedFormat}`,
            },
          ],
        },
      ],
      agent.temperature ?? 0.4
    );
    textResult = googleRes.text;
    inputTokens = googleRes.inputTokens;
    outputTokens = googleRes.outputTokens;
    modelUsed = googleRes.modelUsed;
  } else {
    throw new Error(
      `No API key configured for provider "${provider}". Please open the "APIs & Tokens" locker in the navigation bar to enter your API key.`
    );
  }

  const latencyMs = Math.max(120, Date.now() - startTime);
  const totalTokens = inputTokens + outputTokens;
  const costUsd = calculateTokenCost(inputTokens, outputTokens, modelUsed);
  const tokensPerSec = latencyMs > 0 ? Math.round((outputTokens / (latencyMs / 1000)) * 10) / 10 : 35;
  const extractedFinalAnswer = extractFinalAnswer(textResult);

  return {
    content: textResult,
    extractedFinalAnswer,
    latencyMs,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd,
    tokensPerSec,
    modelUsed,
  };
}
