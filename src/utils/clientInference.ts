import { AgentConfig, BenchmarkProblem, ChatTurn, ProviderApiKeys } from '../types/benchmark';
import { calculateTokenCost } from './formatters';
import {
  resolveOpenRouterModel,
  extractTextFromOpenAIResponse,
} from './openRouterResolver';

export { resolveOpenRouterModel, extractTextFromOpenAIResponse };

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
 * Matches patterns like FINAL ANSWER: [42], **Final Answer:** 42, or long proof sentences
 */
export function extractFinalAnswer(text: string): string | null {
  if (!text) return null;

  // 1. Match bracketed answers: FINAL ANSWER: [x], **FINAL ANSWER:** [x], etc.
  const bracketMatch = text.match(/(?:\*{0,3}|#{1,6}\s*)(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER|FINAL\s+CONSENSUS|ANSWER)(?:\*{0,3})[\s:]*(?:\*{0,3})\s*\[([\s\S]*?)\]/i);
  if (bracketMatch && bracketMatch[1]) {
    const cleaned = bracketMatch[1].replace(/^[\[\("']+|[\]\)"']+$/g, '').trim();
    if (cleaned.length > 0) return cleaned;
  }

  // 2. Match LaTeX boxed: \boxed{x}
  const boxedMatch = text.match(/(?:\*{0,3}|#{1,6}\s*)(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER|FINAL\s+CONSENSUS|ANSWER)(?:\*{0,3})[\s:]*(?:\*{0,3})\s*\\boxed\{([\s\S]*?)\}/i);
  if (boxedMatch && boxedMatch[1]) {
    const cleaned = boxedMatch[1].trim();
    if (cleaned.length > 0) return cleaned;
  }

  // 3. Match bold header syntax: **FINAL ANSWER:** <text> or **FINAL ANSWER**: <text> or **Final Answer** <text>
  const boldHeaderMatch = text.match(/\*\*(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER|FINAL\s+CONSENSUS|ANSWER)(?::\*\*|\*\*[:\s]*)\s*([^\n\r]+)/i);
  if (boldHeaderMatch && boldHeaderMatch[1]) {
    let cleaned = boldHeaderMatch[1].replace(/^[\[\("'\*]+|[\]\)"'\*]+$/g, '').trim();
    cleaned = cleaned.replace(/^\*\*|\*\*$/g, '').trim();
    if (cleaned.length > 0 && cleaned.length < 3000) {
      return cleaned;
    }
  }

  // 4. Match general line-based: FINAL ANSWER: <text> or # FINAL ANSWER: <text>
  const lineMatch = text.match(/(?:^|\n|\s)(?:\*{0,3}|#{1,6}\s*)(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER|FINAL\s+CONSENSUS)[\s:]*(?:\*{0,3})[:\s-]*([^\n\r]+)/i);
  if (lineMatch && lineMatch[1]) {
    let cleaned = lineMatch[1].replace(/^[\[\("'\*]+|[\]\)"'\*]+$/g, '').trim();
    cleaned = cleaned.replace(/^\*\*|\*\*$/g, '').trim();
    if (cleaned.length > 0 && cleaned.length < 3000) {
      return cleaned;
    }
  }

  // 5. Match multiline: FINAL ANSWER:\n<text>
  const multilineMatch = text.match(/(?:\*{0,3}|#{1,6}\s*)(?:FINAL\s+ANSWER|CONSENSUS\s+ANSWER|FINAL\s+CONSENSUS)[\s:]*(?:\*{0,3})\n+([^\n\r]+)/i);
  if (multilineMatch && multilineMatch[1]) {
    let cleaned = multilineMatch[1].replace(/^[\[\("'\*]+|[\]\)"'\*]+$/g, '').trim();
    cleaned = cleaned.replace(/^\*\*|\*\*$/g, '').trim();
    if (cleaned.length > 0 && cleaned.length < 3000) {
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
  temperature: number = 0.4,
  retryCount: number = 0,
  maxTokens: number = 2048
): Promise<{ text: string; inputTokens: number; outputTokens: number; modelUsed: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://dualblind.ai';
    headers['X-Title'] = 'DualBlind Multi-Agent Benchmark';
  } else if (endpoint.includes('orcarouter.com') || endpoint.includes('orcarouter')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://dualblind.ai';
    headers['X-Title'] = 'DualBlind Multi-Agent Benchmark';
    headers['X-Router-Provider'] = 'OrcaRouter';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: Math.min(Math.max(temperature, 0), 1.0),
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMsg =
      errorData?.error?.message ||
      errorData?.message ||
      (typeof errorData === 'string' ? errorData : '') ||
      `${modelName} endpoint returned HTTP ${response.status} (${response.statusText})`;

    // 1. Auto-recovery: If a free model was retired by OpenRouter, auto-fallback to openrouter/free
    if (
      endpoint.includes('openrouter.ai') &&
      retryCount < 2 &&
      (errorMsg.toLowerCase().includes('unavailable for free') ||
        errorMsg.toLowerCase().includes('model not found') ||
        (response.status === 404 && modelName.includes(':free')))
    ) {
      console.warn(`[OpenRouter] ${modelName} is unavailable for free. Automatically routing to openrouter/free fallback.`);
      return callOpenAICompatibleDirect(
        endpoint,
        apiKey,
        'openrouter/free',
        messages,
        temperature,
        retryCount + 1,
        maxTokens
      );
    }

    // 2. Auto-recovery: Token affordability limit on low-credit accounts
    const affordMatch = errorMsg.match(/can only afford\s+(\d+)/i);
    if (endpoint.includes('openrouter.ai') && affordMatch && affordMatch[1] && retryCount < 2) {
      const affordableTokens = parseInt(affordMatch[1], 10);
      if (affordableTokens > 80) {
        const reducedTokens = Math.max(80, affordableTokens - 30);
        console.warn(`[OpenRouter] Adjusting max_tokens to ${reducedTokens} due to account credit balance.`);
        return callOpenAICompatibleDirect(
          endpoint,
          apiKey,
          modelName,
          messages,
          temperature,
          retryCount + 1,
          reducedTokens
        );
      } else if (modelName.includes(':free') || modelName.includes('free')) {
        return callOpenAICompatibleDirect(
          endpoint,
          apiKey,
          'openrouter/free',
          messages,
          temperature,
          retryCount + 1,
          maxTokens
        );
      }
    }

    if (response.status === 429 && retryCount < 2) {
      // Free tier rate limits or brief bursts: pause and retry
      await new Promise((r) => setTimeout(r, 1500 + retryCount * 1000));
      return callOpenAICompatibleDirect(endpoint, apiKey, modelName, messages, temperature, retryCount + 1, maxTokens);
    }
    
    if (response.status === 429) {
      errorMsg = `OpenRouter Free Tier rate limit or provider busy for ${modelName}. Wait a moment or try another free model like openrouter/free, deepseek/deepseek-chat:free, or meta-llama/llama-3.3-70b-instruct:free. (${errorMsg})`;
    } else if (response.status === 402) {
      errorMsg = `OpenRouter account requires credits for ${modelName}. If you want 100% free models, select one with the (free) badge or choose OpenRouter Free Auto-Router. (${errorMsg})`;
    }

    throw new Error(errorMsg);
  }

  const data = await response.json();
  const text = extractTextFromOpenAIResponse(data);

  if (!text.trim()) {
    if (data?.error?.message) {
      throw new Error(data.error.message);
    }
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

  // Normalize model name for Anthropic Direct API endpoint
  let resolvedModel = 'claude-3-7-sonnet-20250219';
  const mLower = (modelName || '').toLowerCase();
  if (mLower.includes('haiku')) {
    resolvedModel = 'claude-3-5-haiku-20241022';
  } else if (mLower.includes('opus')) {
    resolvedModel = 'claude-3-opus-20240229';
  } else if (mLower.includes('claude-3-5-sonnet') || mLower.includes('claude-3.5-sonnet')) {
    resolvedModel = 'claude-3-5-sonnet-20241022';
  } else if (mLower.startsWith('claude-3-') || mLower.startsWith('claude-2')) {
    resolvedModel = modelName;
  } else {
    resolvedModel = 'claude-3-7-sonnet-20250219';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: resolvedModel,
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
  const isGoogleModel =
    provider === 'google' ||
    agent.brand?.toLowerCase() === 'google' ||
    Boolean(agent.model?.toLowerCase().includes('gemini'));

  if (isGoogleModel && apiKeys.google) {
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
  } else if (provider === 'orcarouter' && apiKeys.orcarouter) {
    const endpoint = apiKeys.orcarouterEndpoint || 'https://api.orcarouter.com/v1/chat/completions';
    const targetModel = resolveOpenRouterModel(agent.model);
    const res = await callOpenAICompatibleDirect(
      endpoint,
      apiKeys.orcarouter,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (apiKeys.orcarouter && provider === 'orcarouter') {
    const endpoint = apiKeys.orcarouterEndpoint || 'https://api.orcarouter.com/v1/chat/completions';
    const targetModel = resolveOpenRouterModel(agent.model);
    const res = await callOpenAICompatibleDirect(
      endpoint,
      apiKeys.orcarouter,
      targetModel,
      chatMessages,
      agent.temperature ?? 0.4
    );
    textResult = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    modelUsed = res.modelUsed;
  } else if (apiKeys.openrouter) {
    // OpenRouter inference - directly surface errors if model crashes or fails
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
  } else if (apiKeys.orcarouter) {
    // OrcaRouter fallback inference
    const endpoint = apiKeys.orcarouterEndpoint || 'https://api.orcarouter.com/v1/chat/completions';
    const targetModel = resolveOpenRouterModel(agent.model);
    const res = await callOpenAICompatibleDirect(
      endpoint,
      apiKeys.orcarouter,
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
