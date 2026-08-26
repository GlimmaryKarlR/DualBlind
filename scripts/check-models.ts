import dotenv from 'dotenv';
import { ALL_CATALOG_MODELS, CatalogModel } from '../src/utils/modelCatalog';
import { resolveOpenRouterModel } from '../src/utils/openRouterResolver';

dotenv.config();

interface ModelCheckResult {
  rawName: string;
  brand: string;
  provider: string;
  resolvedId: string;
  status: 'working' | 'failed' | 'rate_limited' | 'auth_error' | 'timeout' | 'skipped';
  httpStatus?: number;
  latencyMs?: number;
  tokensUsed?: number;
  actualModelUsed?: string;
  responseSnippet?: string;
  errorCategory?: string;
  errorMessage?: string;
  suggestedFix?: string;
}

// Parse command-line arguments
const args = process.argv.slice(2);

function getArgValue(flag: string): string | undefined {
  const match = args.find((a) => a.startsWith(`${flag}=`));
  if (match) return match.split('=')[1];
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-')) {
    return args[idx + 1];
  }
  return undefined;
}

const hasFlag = (flag: string) => args.includes(flag) || args.some((a) => a.startsWith(`${flag}=`));

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
========================================================================
🤖 DualBlind Benchmark - Standalone Model Health & Diagnostics Probe
========================================================================

Usage:
  npx tsx scripts/check-models.ts [options]
  npm run check-models -- [options]

Options:
  --provider=<name>     Filter by provider (openrouter, orcarouter, google, openai, anthropic, etc.)
  --filter=<query>      Filter models by keyword substring (e.g. claude, deepseek, gemini, qwen, llama)
  --key=<api_key>       Supply an API key directly (overrides .env)
  --endpoint=<url>      Custom completions endpoint URL (default: provider standard)
  --all                 Test all models in the catalog (default: popular/curated top set)
  --limit=<number>      Maximum number of models to test (e.g. --limit=20)
  --concurrency=<num>   Number of concurrent requests (default: 3 to avoid rate limits)
  --timeout=<ms>        Per-model request timeout in ms (default: 12000)
  --json                Output clean JSON format at the end
  --save=<file.json>    Save report results to a JSON file
  --help, -h            Show this guide

Environment variables read from .env:
  OPENROUTER_API_KEY    For OpenRouter catalog routing
  ORCAROUTER_API_KEY    For OrcaRouter ensemble routing
  GEMINI_API_KEY        For Google Gemini direct inference
  OPENAI_API_KEY        For OpenAI direct inference
  ANTHROPIC_API_KEY     For Anthropic direct inference

Examples:
  npx tsx scripts/check-models.ts --filter=deepseek
  npx tsx scripts/check-models.ts --filter=claude --provider=openrouter
  npx tsx scripts/check-models.ts --provider=orcarouter --all
  npx tsx scripts/check-models.ts --limit=15
========================================================================
`);
  process.exit(0);
}

const filterQuery = getArgValue('--filter')?.toLowerCase();
const providerFilter = getArgValue('--provider')?.toLowerCase();
const cliKey = getArgValue('--key');
const customEndpoint = getArgValue('--endpoint');
const testAll = hasFlag('--all');
const limit = getArgValue('--limit') ? parseInt(getArgValue('--limit')!, 10) : (testAll ? 9999 : 25);
const concurrency = Math.max(1, parseInt(getArgValue('--concurrency') || '3', 10));
const timeoutMs = parseInt(getArgValue('--timeout') || '12000', 10);
const jsonOutput = hasFlag('--json');
const savePath = getArgValue('--save');

// Representative models if not running --all
const CURATED_SAMPLE_MODELS = [
  // Google
  'Google: Gemini 2.5 Flash',
  'Google: Gemini 2.5 Pro',
  'Google: Gemini 2.0 Flash',
  // Anthropic
  'Anthropic: Claude 3.7 Sonnet',
  'Anthropic: Claude 3.5 Sonnet',
  'Anthropic: Claude 3.5 Haiku',
  'Anthropic: Claude 3 Haiku',
  // OpenAI
  'OpenAI: GPT-4o',
  'OpenAI: GPT-4o Mini',
  'OpenAI: o3-mini',
  'OpenAI: o1',
  // DeepSeek
  'DeepSeek: DeepSeek V3',
  'DeepSeek: DeepSeek R1',
  'DeepSeek: DeepSeek R1 Distill Llama 70B',
  // Meta
  'Meta: Llama 3.3 70B Instruct',
  'Meta: Llama 3.1 405B Instruct',
  'Meta: Llama 3.1 8B Instruct',
  // Qwen
  'Qwen: Qwen 2.5 72B Instruct',
  'Qwen: Qwen 2.5 Coder 32B Instruct',
  'Qwen: QwQ 32B Preview',
  // Mistral
  'Mistral: Mistral Large 2411',
  'Mistral: Codestral 2501',
  'Mistral: Mistral Small 24B',
  // xAI
  'xAI: Grok 2',
  'xAI: Grok 2 Vision',
  // Moonshot
  'Moonshot AI: Kimi K2.5',
  // Cohere
  'Cohere: Command R+',
  // OrcaRouter
  'OrcaRouter: Auto Balanced (Universal Router)',
  'OrcaRouter: High Reasoning (R1 & o3 Ensembles)',
  'OrcaRouter: Fast Coding & SWE Specialist',
];

async function checkOpenAICompatibleModel(
  model: CatalogModel,
  endpoint: string,
  apiKey: string,
  targetModelId: string,
  timeout: number
): Promise<ModelCheckResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://dualblind.ai',
    'X-Title': 'DualBlind Model Probe',
  };

  if (endpoint.includes('orcarouter')) {
    headers['X-Router-Provider'] = 'OrcaRouter';
  }

  // Minimal ping payload
  const body = {
    model: targetModelId,
    messages: [
      { role: 'system', content: 'You are a test ping agent. Answer in under 5 words.' },
      { role: 'user', content: 'Ping. Reply with: PONG' },
    ],
    max_tokens: 20,
    temperature: 0.1,
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    const rawText = await res.text();

    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      const httpStatus = res.status;
      let errorMsg = json?.error?.message || json?.message || rawText.slice(0, 200) || `HTTP ${httpStatus}`;
      let errorCategory = 'UNKNOWN_ERROR';
      let suggestedFix = '';

      if (httpStatus === 401 || httpStatus === 403) {
        errorCategory = 'AUTH_OR_PERMISSION_DENIED';
        suggestedFix = 'Verify your API key has valid credits, permissions, or accepted model terms.';
      } else if (httpStatus === 404) {
        errorCategory = 'MODEL_NOT_FOUND_OR_DEPRECATED';
        suggestedFix = `The upstream provider does not recognize model ID "${targetModelId}". Check for renamed or retired model ID.`;
      } else if (httpStatus === 400) {
        if (errorMsg.toLowerCase().includes('system')) {
          errorCategory = 'SYSTEM_PROMPT_UNSUPPORTED';
          suggestedFix = 'This reasoning model does not accept system messages. Pass context in user role.';
        } else if (errorMsg.toLowerCase().includes('temperature') || errorMsg.toLowerCase().includes('max_tokens')) {
          errorCategory = 'PARAMETER_REJECTED';
          suggestedFix = 'Reasoning model requires temperature=1.0 or max_completion_tokens.';
        } else if (errorMsg.toLowerCase().includes('no endpoints') || errorMsg.toLowerCase().includes('not available')) {
          errorCategory = 'NO_ACTIVE_PROVIDERS';
          suggestedFix = 'No upstream provider is currently serving this model. Switch to an alternative endpoint.';
        } else {
          errorCategory = 'BAD_REQUEST';
          suggestedFix = 'Review request parameters formatted for this model.';
        }
      } else if (httpStatus === 429) {
        errorCategory = 'RATE_LIMITED_OR_QUOTA_EXHAUSTED';
        suggestedFix = 'Hit rate limit or account quota. Back off or add credits.';
      } else if (httpStatus >= 500) {
        errorCategory = 'UPSTREAM_PROVIDER_OUTAGE';
        suggestedFix = 'Upstream provider server error. Usually transient; retry later.';
      }

      return {
        rawName: model.rawName,
        brand: model.brand,
        provider: model.provider,
        resolvedId: targetModelId,
        status: httpStatus === 429 ? 'rate_limited' : httpStatus === 401 || httpStatus === 403 ? 'auth_error' : 'failed',
        httpStatus,
        latencyMs,
        errorCategory,
        errorMessage: errorMsg,
        suggestedFix,
      };
    }

    const content = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || '';
    const actualModel = json?.model || targetModelId;
    const tokensUsed = (json?.usage?.total_tokens) || (json?.usage?.prompt_tokens + json?.usage?.completion_tokens) || 0;

    return {
      rawName: model.rawName,
      brand: model.brand,
      provider: model.provider,
      resolvedId: targetModelId,
      status: 'working',
      httpStatus: 200,
      latencyMs,
      tokensUsed,
      actualModelUsed: actualModel,
      responseSnippet: content.replace(/\n+/g, ' ').trim().slice(0, 60),
    };
  } catch (err: any) {
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      return {
        rawName: model.rawName,
        brand: model.brand,
        provider: model.provider,
        resolvedId: targetModelId,
        status: 'timeout',
        latencyMs,
        errorCategory: 'TIMEOUT',
        errorMessage: `Request timed out after ${timeout}ms`,
        suggestedFix: 'Model is slow or queued. Increase timeout or try during off-peak hours.',
      };
    }

    return {
      rawName: model.rawName,
      brand: model.brand,
      provider: model.provider,
      resolvedId: targetModelId,
      status: 'failed',
      latencyMs,
      errorCategory: 'NETWORK_OR_FETCH_ERROR',
      errorMessage: err.message || String(err),
      suggestedFix: 'Check network connectivity or CORS/proxy configuration.',
    };
  }
}

async function checkGoogleGeminiModel(
  model: CatalogModel,
  apiKey: string,
  timeout: number
): Promise<ModelCheckResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const modelCode = model.modelCode || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCode}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: 'Ping. Reply with PONG' }] }],
    generationConfig: { maxOutputTokens: 20, temperature: 0.1 },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    const rawText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {}

    if (!res.ok) {
      const httpStatus = res.status;
      const errorMsg = json?.error?.message || rawText.slice(0, 200) || `HTTP ${httpStatus}`;
      let errorCategory = 'GEMINI_ERROR';
      let suggestedFix = '';

      if (httpStatus === 400 && errorMsg.includes('not found')) {
        errorCategory = 'MODEL_NOT_FOUND';
        suggestedFix = `Model "${modelCode}" is not available under v1beta. Try gemini-2.5-flash or gemini-2.5-pro.`;
      } else if (httpStatus === 403 || httpStatus === 400) {
        errorCategory = 'API_KEY_INVALID';
        suggestedFix = 'Check that GEMINI_API_KEY has Generative Language API enabled in Google Cloud Console.';
      } else if (httpStatus === 429) {
        errorCategory = 'RATE_LIMITED';
        suggestedFix = 'Gemini free-tier quota exceeded. Upgrade to pay-as-you-go or retry after cooldown.';
      }

      return {
        rawName: model.rawName,
        brand: 'Google',
        provider: 'google',
        resolvedId: modelCode,
        status: httpStatus === 429 ? 'rate_limited' : 'failed',
        httpStatus,
        latencyMs,
        errorCategory,
        errorMessage: errorMsg,
        suggestedFix,
      };
    }

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      rawName: model.rawName,
      brand: 'Google',
      provider: 'google',
      resolvedId: modelCode,
      status: 'working',
      httpStatus: 200,
      latencyMs,
      actualModelUsed: modelCode,
      responseSnippet: text.replace(/\n+/g, ' ').trim().slice(0, 60),
    };
  } catch (err: any) {
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    return {
      rawName: model.rawName,
      brand: 'Google',
      provider: 'google',
      resolvedId: modelCode,
      status: err.name === 'AbortError' ? 'timeout' : 'failed',
      latencyMs,
      errorCategory: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      errorMessage: err.message,
      suggestedFix: 'Check internet connection and API key.',
    };
  }
}

async function main() {
  console.log('\n🔍 ========================================================');
  console.log('   DualBlind Benchmark - Model Health & Error Checker');
  console.log('========================================================\n');

  // Load API Keys
  const openRouterKey = cliKey || process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  const orcaRouterKey = cliKey || process.env.ORCAROUTER_API_KEY || process.env.VITE_ORCAROUTER_API_KEY;
  const geminiKey = cliKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const openaiKey = cliKey || process.env.OPENAI_API_KEY;
  const anthropicKey = cliKey || process.env.ANTHROPIC_API_KEY;

  console.log('🔑 Discovered Credentials:');
  console.log(`   - OpenRouter Key : ${openRouterKey ? '✅ Present (' + openRouterKey.slice(0, 8) + '...)' : '❌ Not Found'}`);
  console.log(`   - OrcaRouter Key : ${orcaRouterKey ? '✅ Present (' + orcaRouterKey.slice(0, 8) + '...)' : '❌ Not Found'}`);
  console.log(`   - Gemini Key     : ${geminiKey ? '✅ Present (' + geminiKey.slice(0, 8) + '...)' : '❌ Not Found'}`);
  console.log(`   - OpenAI Key     : ${openaiKey ? '✅ Present' : '⚪ (Will route via OpenRouter/OrcaRouter)'}`);
  console.log(`   - Anthropic Key  : ${anthropicKey ? '✅ Present' : '⚪ (Will route via OpenRouter/OrcaRouter)'}`);
  console.log('');

  if (!openRouterKey && !orcaRouterKey && !geminiKey && !cliKey) {
    console.error('⚠️  WARNING: No API keys found in environment or command line.');
    console.error('    Set OPENROUTER_API_KEY, ORCAROUTER_API_KEY, or GEMINI_API_KEY in .env');
    console.error('    or pass --key=sk-... in command arguments.\n');
  }

  // Get catalog models
  const allCatalog = ALL_CATALOG_MODELS;

  let targetModels: CatalogModel[] = [];

  if (testAll) {
    targetModels = [...allCatalog];
  } else {
    // Select curated sample
    const curatedSet = new Set(CURATED_SAMPLE_MODELS.map((m) => m.toLowerCase()));
    targetModels = allCatalog.filter((m) => curatedSet.has(m.rawName.toLowerCase()) || curatedSet.has(m.name.toLowerCase()));
    if (targetModels.length === 0) {
      targetModels = allCatalog.slice(0, 25);
    }
  }

  // Apply filters
  if (filterQuery) {
    targetModels = allCatalog.filter(
      (m) =>
        m.rawName.toLowerCase().includes(filterQuery) ||
        m.brand.toLowerCase().includes(filterQuery) ||
        m.modelCode.toLowerCase().includes(filterQuery)
    );
    console.log(`🔎 Applied filter: "${filterQuery}" -> ${targetModels.length} models matched`);
  }

  if (providerFilter) {
    targetModels = targetModels.filter((m) => m.provider.toLowerCase() === providerFilter);
    console.log(`🔎 Applied provider filter: "${providerFilter}" -> ${targetModels.length} models matched`);
  }

  // Apply limit
  if (targetModels.length > limit) {
    console.log(`✂️  Limiting test batch to ${limit} models (use --all or --limit=N to adjust)`);
    targetModels = targetModels.slice(0, limit);
  }

  console.log(`\n🚀 Starting health probe on ${targetModels.length} models (concurrency: ${concurrency}, timeout: ${timeoutMs}ms)...\n`);

  const results: ModelCheckResult[] = [];
  let completed = 0;

  // Worker queue for concurrency
  async function runBatch(models: CatalogModel[]) {
    const queue = [...models];
    const workers = Array.from({ length: concurrency }).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        let result: ModelCheckResult;

        // Route to test runner
        if (item.provider === 'google' && geminiKey && !customEndpoint) {
          result = await checkGoogleGeminiModel(item, geminiKey, timeoutMs);
        } else if (item.provider === 'orcarouter' || (orcaRouterKey && !openRouterKey)) {
          const endpoint = customEndpoint || process.env.ORCAROUTER_BASE_URL || 'https://api.orcarouter.com/v1/chat/completions';
          const key = orcaRouterKey || openRouterKey || '';
          const targetId = resolveOpenRouterModel(item.rawName);
          if (!key) {
            result = {
              rawName: item.rawName,
              brand: item.brand,
              provider: item.provider,
              resolvedId: targetId,
              status: 'skipped',
              errorMessage: 'Missing ORCAROUTER_API_KEY or OPENROUTER_API_KEY',
              suggestedFix: 'Add key to .env or pass --key=sk-...',
            };
          } else {
            result = await checkOpenAICompatibleModel(item, endpoint, key, targetId, timeoutMs);
          }
        } else {
          // OpenRouter Universal Gateway or Custom
          const endpoint = customEndpoint || 'https://openrouter.ai/api/v1/chat/completions';
          const key = openRouterKey || orcaRouterKey || '';
          const targetId = resolveOpenRouterModel(item.rawName);

          if (!key) {
            result = {
              rawName: item.rawName,
              brand: item.brand,
              provider: item.provider,
              resolvedId: targetId,
              status: 'skipped',
              errorMessage: 'Missing OPENROUTER_API_KEY or ORCAROUTER_API_KEY',
              suggestedFix: 'Add key to .env or pass --key=sk-...',
            };
          } else {
            result = await checkOpenAICompatibleModel(item, endpoint, key, targetId, timeoutMs);
          }
        }

        results.push(result);
        completed++;

        // Live terminal progress
        const symbol =
          result.status === 'working'
            ? '✅'
            : result.status === 'rate_limited'
            ? '⚠️ '
            : result.status === 'timeout'
            ? '⏱️ '
            : result.status === 'auth_error'
            ? '🔑'
            : result.status === 'skipped'
            ? '⚪'
            : '❌';

        const latencyStr = result.latencyMs ? `${result.latencyMs}ms` : '---';
        const errorDetail = result.errorMessage ? ` [${result.errorCategory || 'ERR'}: ${result.errorMessage.slice(0, 70)}]` : '';

        console.log(
          `[${String(completed).padStart(2, '0')}/${targetModels.length}] ${symbol} ${item.rawName.padEnd(36)} -> ${result.resolvedId.padEnd(30)} (${latencyStr})${errorDetail}`
        );
      }
    });

    await Promise.all(workers);
  }

  await runBatch(targetModels);

  // Summary statistics
  const working = results.filter((r) => r.status === 'working');
  const failed = results.filter((r) => r.status === 'failed');
  const rateLimited = results.filter((r) => r.status === 'rate_limited');
  const timeouts = results.filter((r) => r.status === 'timeout');
  const authErrors = results.filter((r) => r.status === 'auth_error');
  const skipped = results.filter((r) => r.status === 'skipped');

  const totalTested = results.length - skipped.length;
  const successRate = totalTested > 0 ? Math.round((working.length / totalTested) * 100) : 0;
  const avgLatency = working.length > 0 ? Math.round(working.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / working.length) : 0;

  console.log('\n========================================================');
  console.log('📊 MODEL HEALTH PROBE SUMMARY');
  console.log('========================================================');
  console.log(`Total Models Checked  : ${results.length}`);
  console.log(`✅ Working (Healthy)  : ${working.length} (${successRate}%)`);
  console.log(`❌ Failed (Errored)   : ${failed.length}`);
  console.log(`⚠️  Rate Limited       : ${rateLimited.length}`);
  console.log(`⏱️  Timeouts (> ${timeoutMs}ms) : ${timeouts.length}`);
  console.log(`🔑 Auth / Perm Errors : ${authErrors.length}`);
  if (skipped.length > 0) {
    console.log(`⚪ Skipped (No Keys)  : ${skipped.length}`);
  }
  console.log(`⚡ Average Latency    : ${avgLatency} ms`);
  console.log('========================================================\n');

  // Breakdown of Failures & Actionable Fixes
  const issues = results.filter((r) => r.status !== 'working' && r.status !== 'skipped');
  if (issues.length > 0) {
    console.log('🛠️  DETAILED ERROR BREAKDOWN & REMEDIATIONS:\n');
    issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. [${issue.rawName}]`);
      console.log(`   - Resolved Model ID : ${issue.resolvedId}`);
      console.log(`   - Error Category    : ${issue.errorCategory || 'UNKNOWN'}`);
      console.log(`   - HTTP Status       : ${issue.httpStatus || 'N/A'}`);
      console.log(`   - Error Message     : ${issue.errorMessage}`);
      if (issue.suggestedFix) {
        console.log(`   - Recommended Fix   : 💡 ${issue.suggestedFix}`);
      }
      console.log('');
    });
  } else {
    console.log('🎉 All tested models are healthy, online, and responding normally!\n');
  }

  // JSON output handling
  if (jsonOutput) {
    console.log('\n--- RAW JSON RESULTS ---');
    console.log(JSON.stringify(results, null, 2));
  }

  if (savePath) {
    const fs = await import('fs');
    fs.writeFileSync(savePath, JSON.stringify({ summary: { total: results.length, working: working.length, failed: failed.length, successRate, avgLatency }, results }, null, 2));
    console.log(`💾 Results saved to ${savePath}\n`);
  }
}

main().catch((err) => {
  console.error('Fatal error running model check script:', err);
  process.exit(1);
});
